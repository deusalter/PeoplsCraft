# Peopls Craft multiplayer: architecture

Status: contract for the co-op milestone. Written against commit `8187558` (main), which already
contains `scripts/headless.mjs` (headless Chrome harness) and declares `playwright-core`.
This version has been through one adversarial review; section 14 lists what was raised and what changed.
Audience: implementation agents working in parallel. Where this document gives a name, a field, a byte
offset or a number, build exactly that. Where it is silent, keep what the code does today.

Target: 8 players, 12-chunk view each, 60 Hz simulation step, playable at 150 ms latency, one Node
process on an ARM64 Linux box, and solo play running the same simulation in a Web Worker.

Contents

1. Overview
2. Module map
3. Public surface of the simulation
4. Protocol
5. Inventory and container ops
6. Timing, interest, bandwidth, CPU
7. Co-op rules (exact numbers)
8. Save formats and migration
9. Hard cases
10. Test harness and bots
11. Build order
12. Risks not retired by reading
13. Deviations and why
14. Review log

Vocabulary used throughout

| Term | Meaning |
| --- | --- |
| sim | The headless simulation in `src/sim/`. No Three.js, no DOM, no timers, no `Math.random`. |
| host | `SimHost` in `src/net/host.ts`: owns one `Sim`, its clock, its connections, its storage and chunk source. The Node server, the solo worker and the in-thread harness each create exactly one. |
| client | The browser page (or a bot): view, input, the local player's movement, prediction. |
| realm | One dimension's live state inside the sim (0 Overworld, 1 Hollows, 2 Skyrift). |
| sim chunk | A chunk whose full 65,536-cell block array is held by the sim (near a player). |
| edit map | Per chunk: the cells that differ from generated terrain, plus a revision counter. |
| op | A sequenced, deterministic inventory or container manipulation. |
| fx | A side effect leaving the sim: sound, particle burst, banner, toast, floater, shake, hit mark. |
| record id | A player's storage key (4.2). The only handle the sim uses to refer to a player from other state. |
| slot | A number 1..250 naming a player on the wire for one session. Reused after its owner is parked. |
| active | A player that is online, loaded, landed and not stalled (3.3, 7.9). Only active players act, are targeted or are hurt. |
| stalled, lingering, parked | The three ways of being in memory without being active (7.9). |
| full commit | The only kind of save: every dirty record, taken at one instant, written atomically (8.1). |

Constants (single definitions; import, never copy)

| Name | Value | File |
| --- | --- | --- |
| `STEP` | `1 / 60` s | `src/sim/clock.ts` |
| `SNAP_EVERY` | 3 ticks (20 Hz) | `src/net/protocol.ts` |
| `MOVE_EVERY` | 3 ticks (20 Hz) | `src/net/protocol.ts` |
| `INTERP_MIN` / `INTERP_MAX` | 6 / 15 ticks (100 / 250 ms); 4 ticks on local transports | `src/net/protocol.ts` |
| `SIM_RADIUS` / `SIM_KEEP` | 5 / 7 chunks (Chebyshev) | `src/sim/voxels.ts` |
| `PROTO` | 1 | `src/net/protocol.ts` |
| `MOB_R` / `MOB_R_OUT` | 80 / 88 blocks | `src/net/protocol.ts` |
| `PLAYER_R` | 160 blocks | `src/net/protocol.ts` |
| `DROP_R` / `DROP_R_OUT` | 48 / 64 blocks | `src/net/protocol.ts` |
| `PROJ_R` | 96 blocks | `src/net/protocol.ts` |
| `CE_BYTES` | 32 KB of `ce` per connection per tick (256 KB on local transports) | `src/net/protocol.ts` |
| `STALL_AFTER` / `LINGER` | 90 ticks (1.5 s) / 30 s | `src/sim/player.ts` |
| `DIG_SURPLUS` / `ACT_SURPLUS` | 1.0 s / 0.5 s | `src/sim/actions.ts` |

Every other number of section 4 that two sides or two lanes must agree on (message and list limits, coordinate
bounds, record sizes, flag bits, buffer thresholds, subscription ranges, rate buckets, keepalive times) has a
name in `src/net/protocol.ts` as well; that file is the list.

---

## 1. Overview

The game becomes three layers.

- `src/sim/`: the whole simulation, shaped as `Sim { realms[3], players, shared }`. Deterministic given
  its inputs and its seeded PRNG. It talks to the outside through four injected interfaces only:
  `Sink` (messages and fx out), `ChunkSource` (generated terrain in), `Storage` (through the host) and
  a logger.
- `src/net/`: message types, the binary codec, three transports, and `SimHost`, which turns sim state
  into per-connection messages (interest sets, snapshots) and inbound messages into sim calls.
- The client (`src/game.ts`, `src/client/`, `render/`, `ui/`, `audio/`, `player/`, `world/`): draws,
  reads input, owns the local player's movement, predicts its own block edits and inventory ops, and
  interpolates everything else about 100 ms in the past.

Terrain is never sent. Both sides run `src/world/gen/*` from the seed. The server sends, per chunk, the
edit map; the client applies it on top of its own generation.

```
SERVER MODE
  browser, one per player                               Node process (ARM64 Linux)
 +-----------------------------------+                +----------------------------------------------+
 | main thread                       |   WebSocket    | main thread                                  |
 |  Game: view, input, HUD, audio    |   ws://h:p/ws  |  http: static dist/client, GET /info         |
 |  Player controller (owns movement)| <============> |  ws:   one Conn per socket                   |
 |  ClientVoxels + World (meshing)   |   JSON text +  |  SimHost                                     |
 |  EntityStore (interpolation)      |   binary       |    Sim.step() at 60 Hz (never pauses,        |
 |  InvClient (op prediction)        |   frames,      |      idles when nobody is online)            |
 |  WsTransport (retry + backoff)    |   one port     |    interest sets, snapshots at 20 Hz         |
 +-----------------------------------+                |    DiskStorage (async fs, temp + rename)     |
 | chunk workers x N: gen + light    |                +----------------------------------------------+
 |   + mesh (src/world/worker.ts)    |                | worker_threads x M: server/genworker.ts      |
 +-----------------------------------+                |   (terrain generation only, no lighting)     |
                                                      +----------------------------------------------+

SOLO MODE (one browser tab, world from the title menu)
 +-----------------------------------+  postMessage   +----------------------------------------------+
 | main thread: the same client code |  structured    | sim Web Worker: src/sim-worker.ts            |
 |  WorkerTransport                  | <============> |  SimHost + Sim (real clock, pausable)        |
 +-----------------------------------+  clone, same   |  IdbStorage (database "cairnlight", v2)      |
 | chunk workers x N (gen+light+mesh)|  messages      |  InlineSource (generates inside the tick     |
 +-----------------------------------+                |    budget; see Deviations D9)                |
                                                      +----------------------------------------------+

HARNESS MODE (?quick=<seed>, also the in-process mode used by Node tests)
 +---------------------------------------------------------------------------------------------------+
 | one thread: client code + LoopbackTransport + SimHost + Sim (manual clock) + IdbStorage/MemStorage |
 +---------------------------------------------------------------------------------------------------+
   ?quick=<seed>&worker runs the harness against the sim worker instead (manual clock over messages).
```

One code path: the server, the worker and the harness all run `new SimHost(...)` over the same `Sim`.
They differ only in which `Storage`, `ChunkSource`, clock driver and connection type they pass in.

Ownership summary

| Thing | Owner | Client role |
| --- | --- | --- |
| Local player position, velocity, look | client | sends 20 Hz and in front of every action; obeys authoritative teleports |
| Block edits, block entities (chests, forges, nests) | sim | predicts own break / place / door; receives the rest |
| Inventory, equipment, crafting grid, cursor, shop, containers | sim | applies ops locally, reconciles on snapshot |
| Creatures, bosses, minions, townsfolk bodies | sim | interpolates; picks melee targets by its own ray |
| Projectiles, drops | sim | receives spawn and end events, simulates the flight locally |
| hp, mana, hunger, xp, buffs, death, respawn | sim | displays |
| Clock, flags, quest index, events, homes, gates | sim (shared by all) | mirrors |
| Particles, sounds, camera shake, held-item model, corpses | client | plays fx events; derives the rest from replicated state |

---

## 2. Module map

### 2.1 Import rules (enforced by the compiler and by `npm run check`)

- `src/sim/**`, `src/core/**`, `src/data/**` (except the moved validator), `src/world/gen/**` and the
  pure files of `src/net/` are compiled by `tsconfig.sim.json`: `"lib": ["ES2022"]`, `"types": []`,
  no DOM. A sim file that imports client code pulls that file into the pure program and fails there.
- The client may import from `src/sim/**` and `src/net/**`. The reverse is forbidden.
- `tsconfig.server.json` compiles `server/**` and `scripts/**` with `"lib": ["ES2022"]`,
  `"types": ["node"]`. Node types must not be visible to the sim program.
- `npm run check` = `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.sim.json --noEmit && tsc -p tsconfig.server.json --noEmit && node scripts/lint-sim.mjs`.
  `lint-sim.mjs` fails on `Math.random`, `Date.now`, `performance.`, `setTimeout`, `setInterval`,
  `console.` and `from 'three'` anywhere under `src/sim/`.
- Randomness in the sim comes from `sim.rnd()` (one `mulberry32` stream, state saved in the world
  record) or from a hash of stable inputs. Time comes from `sim.tick`. Logging goes through `deps.log`.

`tsconfig.sim.json`

```json
{
  "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "lib": ["ES2022"], "types": [], "strict": true, "noImplicitAny": true, "skipLibCheck": true,
    "isolatedModules": true, "noEmit": true },
  "include": ["src/sim", "src/core", "src/data", "src/world/gen",
    "src/net/protocol.ts", "src/net/codec.ts", "src/net/snapshot.ts", "src/net/transport.ts", "src/net/validate.ts", "src/net/clientvoxels.ts",
    "src/net/interest.ts", "src/net/invsync.ts", "src/net/host.ts", "src/net/hostchunks.ts", "src/net/hostsnap.ts",
    "src/net/loopback.ts"]
}
```

### 2.2 New files

`src/sim/` (headless simulation)

| File | Responsibility |
| --- | --- |
| `clock.ts` | `STEP`, tick counters, `dayAmount(clock, dim)` (the formula now inside `Gfx.update`: `smoothstep(-0.1, 0.22, sunElev)`), `isNight(clock)`. |
| `sim.ts` | `Sim`: realms, players, shared state, `step()`, `handle()`, `join()`, `leave()`, `takeDirty()`. Tick order (6.1). |
| `realm.ts` | `Realm`: one dimension. Owns `SimChunks`, `MobSim`, `ProjSim`, `DropSim`, `Fluids`, block ticking. Implements `VoxelWrite` and `BlockEnts`. |
| `voxels.ts` | `VoxelRead`, `VoxelWrite`, `BlockEnts`, `SimChunk`, `SimChunks` (load / unload by player distance, heightmaps, generator-entity rule), `ChunkEdits`, `EditStore`. |
| `chunksource.ts` | `ChunkSource` interface, `InlineSource`. |
| `genjob.ts` | `genChunk(seed, dim, cx, cz): GenOut & { hash }` and `hashBlocks(u8): number` (FNV-1a 32). The only place generators are constructed and cached. Used by `src/world/worker.ts`, `server/genworker.ts`, `InlineSource`, bots and migration. |
| `light.ts` | `LightSource { sky(x, y, z): number; block(x, y, z): number }` (0..15 each): the only way sim rules read light. From stage 2 its implementation is `ApproxLight` (`skyApprox`, `blockLightApprox`, 7.8). |
| `physics.ts` | Moved from `src/player/physics.ts` unchanged except `World` -> `VoxelRead`. |
| `body.ts` | `PlayerBody`: the fields, `teleport`, `look` and `tick(dt, input, w, time)` of today's `Player`, with `input: InputState { down(code): boolean; hit(code): boolean }`. No camera. Used by the client and by bots. |
| `inventory.ts` | Moved from `src/systems/inventory.ts`; gains `assignWire(inv, wire)` (5.3). |
| `stats.ts` | Moved from `src/systems/stats.ts`; `damage()` takes `rnd`. |
| `invops.ts` | `InvOp` union, `applyOp(state, op, ctx)` (section 5). Shared by sim and client. |
| `rules.ts` | Pure rules used by both sides: `reach`, `canHarvest`, `breakTime`, `breakTimeMin` (4.7), `accepts`, `refusal`, `smeltable`, `itemValue`, `sellPrice`, `rollLoot`, `standSpot`, `bodyFree`, `freeSpot` (4.5), `findSpawn`, `goods(npc, flags)`, `attackRate`, `maxSpeed`, `sortCompare` (5.2). |
| `player.ts` | `SimPlayer`, per-player tick (credits, hazards, fall damage, hunger, stall detection, linger), `hurtPlayer`, `onDeath`, `respawn`, `goHome`, `gainXp`, sleeping, parking. |
| `movement.ts` | Validation of the movement stream, the embedded rule, position checks before activation (4.5). |
| `actions.ts` | World actions of a player: `breakBlock`, `breakNatural`, `place`, `placeDoor`, `useBlock`, `trySummon`, `consume`, `attack`, `fire`, `dropItem`; the dig and action credits (4.7, 7.3). |
| `gates.ts` | `gateFits` (tests every body of the realm), `buildGate`, `collapseGate` (clears the matching `portalReturn` of every player in memory), the gate registry and its upkeep (9). |
| `travel.ts` | `travel`, `land`, the return check, portal timers (`tickPortal`), realm entry and exit, realm suspension. |
| `mobs.ts` | `Mob` (sim fields only), `MobSim`: pool, `spawn`, `hurt`, `kill`, `tick`, `canSee`, targeting. |
| `mobhit.ts` | `rayHitMobs(list, ...)`: the box / head / segment ray test of today's `MobSystem.rayHit`, generic over `{ x, y, z, hw, h, yaw, def, segs }`. Used by `ProjSim` on sim mobs and by the client on views. `segK`, `followSegs` (the serpent-body loop at the end of `bossTick`). |
| `spawn.ts` | `trySpawn` per player (7.2). |
| `boss.ts` | `BossState` (sim fields), `newBossState`, `bossTick(realm, m, dt)`, `groundY`, `floorNear`, `roofY`, participants, scaling, leash. |
| `projectiles.ts` | `ProjSim`: `fire`, `tick`. |
| `drops.ts` | `DropSim`: `spawn` (with optional owner), `tick`, pickup. |
| `loot.ts` | `onMobKilled`: per-player rolls (7.4). |
| `blocks.ts` | `tickBlocks`, `tickForge`, nests, random ticks, `onBlockChange` (support popping, fluid poke). |
| `fluids.ts` | Moved from `src/systems/fluids.ts`; takes `VoxelWrite`. |
| `events.ts`, `npcs.ts`, `quests.ts` | Moved from `src/systems/`; made multi-player (7.5 to 7.7). |
| `cheats.ts` | `cheat(sim, p, cmd)`: today's `Game.cheat` plus harness commands (10.1). |
| `identity.ts` | Name rules, `sha256Hex` (pure JS), `playerIdOf(token)`. |
| `storage.ts` | `Storage` interface and record types (3.6). `MemStorage` for tests. |
| `migrate.ts` | Pure legacy conversion: `splitLegacyWorld`, `diffLegacyChunk` (8.3). |
| `rle.ts` | `rle`, `unrle` moved from `src/systems/save.ts`. |
| `fx.ts` | `Fx` union, `Scope`, `Sink` (3.4), burst kind table. |

`src/net/`

| File | Responsibility |
| --- | --- |
| `protocol.ts` | `PROTO`, every message type (`C2S`, `S2C`), flag bit constants, `dataHash()`. |
| `codec.ts` | Quantisers, base64 (hand written: no `atob` in the pure program), edit-map encodings (`packSparse`, `packFull`, `encodeEdits`, `decodeSparse`, `decodeFull`). |
| `snapshot.ts` | `encodeSnapshot`, `decodeSnapshot`, `decodeHead` (the 26-byte header alone: the receiver's own state), `SnapWriter` (the same bytes written record by record, with no objects in between), `encodeMove`, `decodeMove` (4.4, 4.5). |
| `validate.ts` | `checkC2S(m: unknown): C2S \| null`: type, shape and range check of every inbound JSON message (4.1). Pure. |
| `interest.ts` | Per-connection interest state: known drops, known projectiles, mob hysteresis, chunk subscriptions. |
| `host.ts` | `SimHost`: connections, hello and the per-id join lock, validated dispatch with `try / catch`, rate caps, clock driving, `requestSave` and the save loop. |
| `hostchunks.ts` | Chunk subscription service: range check, nonces, paced edit-map loading and sending, encoded-entry cache, `ce` / `b` / `gh` messages. |
| `hostsnap.ts` | Snapshot and fx assembly per connection, stagger, backpressure. |
| `transport.ts` | `Transport` (client side) and `Conn` (host side) interfaces (3.7). |
| `loopback.ts` | In-thread transport pair. |
| `worker-client.ts` | Client side of the worker transport. |
| `ws-client.ts` | WebSocket transport with reconnect; works in the browser and in Node 22 (global `WebSocket`). Every socket it opens gets a generation number; events from any socket but the newest are ignored (4.2). |
| `invsync.ts` | The reconcile core of 5.3 (base, pending ops, replay, `pendingSel`). Pure; used by `client/invclient.ts` and by bots. |
| `clientvoxels.ts` | `ClientVoxels`: the client's block data. Chunk records with `editRev`, `subN` and `hasEmit`, "generated and edits arrived" readiness, pending live edits by revision, the single `write` path, prediction table, re-subscribe timer. Pure; reused by bots. |

Other new client and server files

| File | Responsibility |
| --- | --- |
| `src/sim-worker.ts` | Web Worker entry for solo: `SimHost` + `IdbStorage` + `InlineSource`. |
| `src/storage/idb.ts` | `IdbStorage implements Storage` on database `cairnlight` version 2, plus `listWorlds` / `deleteWorld` for the title menu. Replaces `src/systems/save.ts`. |
| `src/client/session.ts` | Creates the transport, hello, message dispatch registry (`session.on(type, fn)`), `session.act(m)` (4.5), `session.pump()` (deliver queued inbound messages now), reconnect state, rtt probe, the `unsaved` flag (8.2). |
| `src/client/api.ts` | Interfaces that cross client modules: `DigHost`, `ActHost` (the two halves of today's `InteractHost`), `EditHost`, `InvChannel`, `Bodies`, `Ghosts` (3.8; 11, stage 2.0). |
| `src/client/worldstore.ts` | Stage 1 only: adapter that lets the sim run on the client `World` (`VoxelWrite`, `BlockEnts`, `LightSource` from `World.getLight`). Deleted in stage 2. |
| `src/client/entities.ts` | `EntityStore`: views of mobs, players, projectiles, drops; snapshot buffer and interpolation; local kinematics for projectiles and drops. |
| `src/client/invclient.ts` | Wraps `net/invsync.ts`: sends ops, plays their sounds and toasts, exposes the `Inventory` and `PlayerStats` instances the HUD and windows read. |
| `src/client/blocks.ts` | Predicted break / place / door, prediction table, `rej` handling and chunk resync. Implements `DigHost`. |
| `src/client/combat.ts` | Today's `Game.primary` and `secondary` decision trees on the client side. Implements `ActHost`. |
| `src/client/fxplay.ts` | Turns `fx` events into audio, particles, HUD calls; holds the per-particle loops and their `Math.random`. |
| `src/client/social.ts` | Roster, chat, pings, coarse positions of friends. |
| `src/render/mobView.ts` | Today's `MobSystem.render / draw / boxes / put / contact`, `POSE`, corpses, debris, `sampleLight`, `bossKeep`. |
| `src/render/projView.ts`, `src/render/dropView.ts` | Today's `ProjectileSystem.render`, and the mesh / light / `render` half of `DropSystem`. |
| `src/render/playerView.ts` | Bodies of other players (2.5). |
| `src/data/playerModel.ts` | `PLAYER_PARTS: Part[]` and armour overlay boxes. |
| `src/ui/chat.ts`, `src/ui/roster.ts`, `src/ui/questView.ts` | Chat and command line, player list (Tab), and the tracker / compass / list half of `QuestSystem`. |
| `src/dev/validate.ts` | `src/data/validate.ts` moved here (it imports `render/textures`). |
| `server/main.ts` | CLI, boot order, signals, shutdown. |
| `server/http.ts` | Static files from `dist/client`, `GET /info`, upgrade on `/ws`. |
| `server/wsserver.ts` | `ws` server to `Conn` adapter, keepalive, size and rate caps. |
| `server/diskstorage.ts`, `server/region.ts`, `server/backup.ts` | Folder storage (8.1). |
| `server/nodepool.ts`, `server/genworker.ts` | `ChunkSource` on `worker_threads`. |
| `scripts/run.mjs` | Bundles one TypeScript entry with Vite's SSR build into a temp folder and runs it with Node. Every Node-side script and test goes through it (`npm run node -- <entry.ts> [args]`). |
| `scripts/bot/*.ts`, `scripts/scenarios/*.ts`, `scripts/tests/*.ts` | Headless client, scenarios, unit tests (`node:test`). |
| `scripts/smoke.mjs` | Smoke scenarios driving `window.T`. Built on `launch()` of the existing `scripts/headless.mjs` (Vite dev server, installed Chrome through `playwright-core`); `--base <url>` points it at a running server instead. |
| `vite.server.config.ts`, `tsconfig.sim.json`, `tsconfig.server.json` | Build and type-check configuration. |

Build and run: `npm run build` = `npm run check && vite build && vite build -c vite.server.config.ts`.
The client output moves to `dist/client/` (`build.outDir` in `vite.config.ts`). The server output is
`dist/server/main.js` and `dist/server/genworker.js` (`build.ssr`, two inputs, `ssr.noExternal: true`
so `ws` is inlined). `npm start` = `npm run build && node dist/server/main.js`. Running needs Node 22
and the `dist/` folder, nothing else.

### 2.3 Existing files: what moves where

`src/game.ts` (1,064 lines) keeps: construction of `Gfx`, `Icons`, `ItemModels`, `WorkerPool`, `World`,
`Input`, `Interact`, `Hud`, `Windows`, `GameMenu`, `DebugOverlay`, `GameAudio`, `Particles`, `BoxBatch`;
`applySettings`, `start`, `stop`, `frame`, `pump`, `runFrame`, `checkReady`, `updateEnv`, `updateHand`,
`showLoading`, `onKey`, `debugLines`; the held-item view model. Everything else leaves:

| `Game` member | Destination |
| --- | --- |
| `inv`, `stats` | `SimPlayer.inv`, `SimPlayer.stats`; client mirrors in `client/invclient.ts` keep the names `game.inv`, `game.stats`. |
| `flags`, `clock`, `worldSpawn` | `Sim.shared`; client mirrors `game.flags`, `game.clock`, `game.worldSpawn`. |
| `dim`, `spawn`, `deathAt`, `recallT`, `creative`, `creativeHidden`, `god`, `portalReturn`, `arriving`, `pendingBed`, `safe`, `hazardT`, `portalT`, `portalArmed`, `chestOpen` | `SimPlayer` (`dim`, `bed`, `deathAt`, `recallT`, `modes`, `portalReturn`, `arriving`, `pendingBed`, `safe`, `hazardT`, `portalT`, `portalArmed`, `window`). Client mirrors `game.dim`, `game.spawn`, `game.deathAt`, `game.recallT`, `game.creative` from `stats` / `tp` messages. |
| `atkCd`, `useCd` | Stay on the client, where they pace swings and uses as today. The sim validates cadence with `SimPlayer.actCredit` / `useCredit` (7.3), not with a copy of these timers. |
| `swing`, `equip`, `handKey`, `hand`, sway fields, `stepN`, `wasWet`, `wasUnder`, `splashCd`, `popT`, `warnT`, `npcPrompt*` | Stay on the client. |
| `fullT` | `SimPlayer.fullT` (the sim throttles the `full` toast as today). |
| `blockT` | `Realm.blockT`. `saveT`, `lastSave`, `saveFailT` -> `SimHost`. `palettes` -> world record. |
| constructor: `world.onBlockChange` | `sim/blocks.ts onBlockChange` (called by `Realm.setBlock`). |
| constructor: `world.onChunkReady` (entity init) | `SimChunks.integrate` (generator-entity rule, 3.2). |
| constructor: `world.onUnload`, `world.loader`, palette remap, restore block | `EditStore`, `Storage`, `Sim` constructor. |
| `findSpawn` | `sim/rules.ts findSpawn(climate)`; run once per world, stored in `shared.worldSpawn`. |
| `isNight`, `difficulty` | `Sim.isNight()`, `Sim.difficulty()`; the client computes the same from its mirrors for prompts. |
| `toast`, `floater` | `Sink.emit` in the sim; direct HUD calls for client-originated feedback. |
| `dropItem` | `actions.dropItem(p, it)`. |
| `gainXp` | `player.ts gainXp(p, n)`. Banner and sound become fx scoped to that player. |
| `onPickup` | fx `u` to the picker; `client/fxplay.ts` keeps the pop throttle. |
| `warnFull` | `player.ts`, fx toast + sound to that player. |
| `onCrafted` | Effect list returned by `applyOp` (`craft:<key>` flags), applied by the sim only. |
| `markEntDirty`, `markChestDirty` | `EditStore.touch(dim, cx, cz)`. |
| `rollLoot` | `rules.ts rollLoot(table, rnd): { items, coins }`; the caller credits coins to the acting player. |
| `hurtPlayer`, `onDeath`, `respawn`, `goHome` | `sim/player.ts` (per player). The view part of `hurtPlayer` (flash angle, shake, knockback applied to the body) runs on the client on `hurt` (4.3). |
| `standSpot` | `rules.ts standSpot(w, x, y, z)`. |
| `onMobKilled`, `onBossGone` | `sim/loot.ts`, `sim/boss.ts`. |
| `reach`, `canHarvest`, `breakTime` | `rules.ts`, pure functions of `(inv, stats, modes, bodyFlags)`; both sides call them. |
| `onDigTick` | Client only (`client/blocks.ts`): swing, sound, three particles. Other players see it from the `dg` fx and the `dig` byte of the snapshot. |
| `onDigStart` (auto tool) | Client decides the slot, sends op `sel`. |
| `pickBlock` | Op `pick`. |
| `tintOf`, `burst` | `client/fxplay.ts` (burst kind 1). |
| `breakNatural`, `onBroken` | `actions.ts`. The client predicts the cell change, the burst and the sound of its own break. |
| `primary` | Client: `client/combat.ts` (cadence, ray against views, swing, prediction). Sim: `actions.attack`, `actions.fire`. |
| `secondary` | Client: `client/combat.ts` decides which message to send. Sim: `actions.useBlock`, `actions.place`, `actions.placeDoor`, `gates`, `actions.consume`, recall in `player.ts`. |
| `consume`, `quickHeal` | Client picks the slot (same search as today), sends `item`. Sim: `actions.consume`. |
| `useBlock`, `trySummon` | `actions.ts`. |
| `place`, `placeDoor` | `actions.ts`; predicted in `client/blocks.ts`. |
| `gateFits`, `collapseGate`, `buildGate` | `sim/gates.ts`. |
| `travel`, `land` | `sim/travel.ts`. The client's part of a crossing is the `tp` handler (4.3). |
| `cheat` | `sim/cheats.ts`. |
| `tick` | Split. Client `Game.tick`, in this order: hotbar keys and wheel -> `pendingSel` (5.3), `player.tick`, own splash / step sounds, the scheduled movement send (every `MOVE_EVERY` ticks and on edges), `interact.tick` (whose actions leave through `session.act`, which first sends a fresh `move` if the body changed since the last one: 4.5), prompts. Everything else: `Sim.step` (6.1). |
| `tickBlocks`, `tickForge` | `sim/blocks.ts`. `EditStore.touch` is called exactly where `Game` sets `c.modified` today (fuel taken, item smelted), not on every timer write (3.2). |
| `tickPortal` | `sim/travel.ts` (authoritative). Today the timer pauses while any window is open (`this.win.open`, Inventory and Guide included); the sim keeps that rule with `p.window !== null \|\| p.uiOpen`, where `uiOpen` is bit 9 of the move flags. The client runs the same block test on its own position only to drive `hud.setPortal`. |
| `saveChunk`, `save` | `SimHost.save()`, always a full commit (8.1). `game.save()` becomes a `save` request (local transports only). The page can no longer write at unload by itself: 8.2. |

`src/entities/mobs.ts`

| Today | Destination |
| --- | --- |
| `class Mob` fields `ls`, `lb`, `pry`, `popen`, `drop`, `sq`, `px`, `py`, `pz` | `MobView` in `client/entities.ts` (render-only). `MobView` also has its own `ry`, eased from the replicated yaw. |
| `Mob.ry` (the eased yaw) | Stays on the sim `Mob` as well: `rayHit` places a boss's head with it (`mobs.ts:111`), so the sim eases it in `MobSim.tick` exactly as today and snaps it where `boss.ts` does (7.3). |
| All other `Mob` fields | `sim/mobs.ts Mob`, plus `owner: string \| null` (record id of a minion's owner), `tp: SimPlayer \| null` (target player; cleared as soon as that player is not in `targets()`), `tpT`, `hitBy: Map<record id, damage>`, `by: string \| null` (record id of the player whose spawn attempt made it; informational, caps are counted by distance, 7.2). |
| `POOL = 140` | `sim/mobs.ts`, raised to 320. |
| `spawn`, `clear`, `count`, `activeBoss`, `nearestHostile`, `hurt`, `kill`, `tick`, `canSee` | `MobSim`. `hurt` takes `by: SimPlayer \| null`. `activeBoss()` becomes `bosses(): Mob[]`. |
| `rayHit` | `sim/mobhit.ts rayHitMobs` (shared; reads `ry` of whatever it is given: a sim `Mob` or a `MobView`). |
| `trySpawn` | `sim/spawn.ts`. |
| `corpse`, `debris`, `tickCorpses`, `sampleLight`, `render`, `draw`, `boxes`, `put`, `contact`, `POSE`, joint matrices, `ShadowBatch` | `render/mobView.ts`. Corpses are created by the client on fx `md` with `how = 1`. |

`src/entities/boss.ts`: `BossState` loses `ppose`, `pwind`, `pstrike`, `paim`, `ppitch`, `proll`, `pspin`,
`psegs` (to `MobView`); `bossKeep` moves to `render/mobView.ts`; `segK` moves to `sim/mobhit.ts`; the
rest moves to `sim/boss.ts` with `g: Game` replaced by `realm: Realm` and `p` by `m.tp`.

`src/entities/projectiles.ts`: `Proj`, `fire`, `tick`, `clear` -> `sim/projectiles.ts` (`Proj` gains `id`,
`by: string | null` (record id of the shooter), `cseq`). `render` -> `render/projView.ts`.

`src/entities/drops.ts`: `Drop` without `mesh` and `light`, `spawn`, `tick`, `clear` -> `sim/drops.ts`
(`Drop` gains `id` and `owner: string | null`, a record id). `mesh`, `light`, `render` -> `render/dropView.ts`.

`src/systems/*`: `inventory.ts`, `stats.ts`, `fluids.ts` move unchanged. `events.ts` -> `sim/events.ts`
(`label`, `progress`, `moonTint`, `moonIn` become functions of the replicated event state in
`ui/hud.ts`). `npcs.ts` -> `sim/npcs.ts` (`line` becomes client code in `ui/windows.ts`; `goods` becomes
`rules.ts goods`). `quests.ts` -> `sim/quests.ts` (`index`, `done`, `tick`) and `ui/questView.ts`
(`target`, `rebuild`, `compass`, `tracker`, `list`). `save.ts` -> `src/storage/idb.ts` and `sim/rle.ts`.

`src/player/*`: `physics.ts` -> `sim/physics.ts`. `player.ts` keeps `class Player extends PlayerBody`
with `applyCamera`, `dir`, `shake`, `bobPhase`, `stride`, `dip`, `trauma`; the rest is `sim/body.ts`.
`interact.ts` stays; its `InteractHost` is split into `DigHost` (`client/blocks.ts`) and `ActHost`
(`client/combat.ts`), both declared in `client/api.ts`, and `tick` takes the two. `input.ts`,
`viewmodel.ts` stay.

`src/world/world.ts`: block data (`chunks` map, `chunkAt`, `getBlock`, `ready`, `biomeAt`, `topY`, the
data half of `setBlock`) moves to `net/clientvoxels.ts`. `World` keeps a `ClientVoxels` and adds
`getLight`, meshing (`update`, `pump`, `dispatchOne`, `sendMesh`, `applyMesh`, `markDirty`, culling,
`counts`, `areaMeshed`). Removed from the client: `savedKeys`, `loader`, `onUnload`, `onBlockChange`
game hooks, `Chunk.ents`, `Chunk.modified`, `getEnt`, `setEnt`, `removeEnt`, and `Chunk.rev` (a remesh
counter with no reader; the edit revision is a different field, `editRev`, 4.7). `requestChunk` always
generates; when it creates a chunk it queues a subscribe, when `dropChunk` runs it queues an
unsubscribe. A chunk reaches `state = 2` only when its generation and its edit set have both arrived.
`hasEmit` stays on the record and is kept true by `ClientVoxels.write` (4.7 rule 5); `World` marks
chunks dirty from `ClientVoxels.onCellChange`. `setView` is clamped to `cfg.viewMax` from `welcome`.

`src/world/worker.ts`: the `gen` job calls `genChunk` and also returns `hash`. `pool.ts` unchanged; pool
size becomes `max(2, min(6, hardwareConcurrency - 3))` in solo (one core for the sim worker).

`src/ui/windows.ts`: stays as view. Every statement that mutates `inv`, a chest array, a forge slot
array, `sold`, coins or attributes is replaced by `invclient.send(op)` (section 5). `itemValue` and
`sellPrice`, `accepts`, `refusal`, `smeltable` move to `sim/rules.ts`. `moveInto`, `sortRange`,
`takeAll`, `stashMatching`, `gather`, `place`, `quickMove`, `takeOutput`, `craftFromBook`, `buy`,
`buyBack`, `sell`, `hotkey`, `dropHover`, `dropCursor`, `returnGrid` become cases of `applyOp`.
Sounds and refusal toasts stay in the window code, driven by `applyOp`'s return value.
Two things in `Windows` change shape, not just transport: `show('guide')` over another window sends
`tidy`, not `close` (5.2), and the arrays a window was built on are never replaced under it (5.3).

`src/ui/hud.ts`: reads the mirrors. Boss bar reads the nearest boss `MobView`. Name tags extend to
players. Compass gains friend pips and ping pips. `src/ui/menus.ts`: the title menu gains "Join" (name,
password) when `GET ./info` answers `{server: true, name, players, max, password}`; `?server=<ws url>`
forces a target during development. Pause in solo sends `pause`; on a server Esc opens the menu
without pausing.
`src/main.ts`: chooses the transport. `src/dev.ts`: section 10.

### 2.4 What the view needs replicated

| Entity | Replicated (source) | Derived on the client |
| --- | --- | --- |
| Creature | snapshot: `id`, `def` index, `x y z`, `yaw`, flags `onGround hurt atk flee talk fresh tpToggle`. fx `md` on removal. | drawn yaw `ry` (eased), `moving`, `anim`, `vy`, `sq`, hurt flash timer (0.22 s from the rising edge), attack timer (0.3 s), spawn scale-in from `fresh`, light `ls lb`, contact shadow, corpse. |
| Boss (extension) | snapshot: `hp`, `maxHp`, `phase`, `kind`, `wind`, `strike`, `pose`, `aim`, `rage`, `open`, `scale`, `pitch`, `roll`, aim vector `ax ay az`, `age`. fx `mk` (rain marks). | `spin` (integrated from `rage` and `spec.spin`), previous-tick blends, body segments via `followSegs`, telegraph / entrance / trail particles, footfall shake, boss bar. |
| Projectile | fx `ps`: `id`, kind index, position, velocity, remaining life, player-fired bit, `cseq`. fx `pe`: `id`, end position, how. | flight (`vy -= gravity * dt`), terrain stop, expiry when its life runs out, trail and impact particles. |
| Drop | fx `da`: `id`, item `k n m`, position, velocity, delay. fx `dn` (count), fx `dd` (removed, picker slot). | fall and rest (`moveBody`), bob, spin, light, fly-to-picker. |
| Other player | roster `pl`: `slot`, `name`, `dim`, held item key, three armour keys, level. Snapshot: `x y z`, `yaw`, `pitch`, flags, hp fraction, dig progress. fx `dg` (dig target). `where` (coarse position, 1 Hz). | walk cycle, swing, footsteps, splash, dig particles and cracks, name tag. |
| Self | snapshot header: `hp`, `mana`, `hunger`, state flags, `tp`. `stats`, `st`, `hurt`, `dead`, `tp`. | everything else about the local body. |

Fields that are not replicated and must not be read by view code: `Mob.timer`, `tx`, `tz`, `state`,
`stuck`, `target`, `home`, `minionDmg`, `hop`, `event`, `dmgMul`, `hitBy`, any `BossState` timer.

### 2.5 The player body

`data/playerModel.ts` exports a biped `Part[]` in the same format as creatures (tags `legA legB armA armB
foreA foreB head body`), so `render/playerView.ts` draws through `BoxBatch` with the box code of
`mobView.ts` (export `drawBoxes(batch, parts, pose)` from it). Armour: each worn piece adds its overlay
boxes (head, body, legs) coloured by `TIERS[item.tier].color`. Held item: a `THREE.Mesh` from
`ItemModels.get(key)` parented to the right-hand joint matrix (pool of 8). Pose inputs: speed from
position deltas (walk cycle), `sneaking` (lean and lower), `swingSeq` (arm swipe, 0.24 s), `digging`
(repeating swipe), `sleeping` (lying), `dead` (topple, then hidden), `usingItem` (hand to head).
Name tag and a thin health bar reuse the HUD tag pool, shown within 48 blocks and not through terrain
(one `raycast` per tag per 0.25 s). `BoxBatch` capacity rises from 4,096 to 8,192.

---

## 3. Public surface of the simulation

Sketches. Names and signatures are binding; private members are not.

### 3.1 Voxel store (shared by sim, client and bots)

```ts
// src/sim/voxels.ts
export interface VoxelRead {
  /** 0 outside 0..CH-1 and where no data is loaded. */
  getBlock(x: number, y: number, z: number): number;
  /** True when the column's chunk has its generation and its edit set. Bodies freeze where this is false. */
  ready(x: number, z: number): boolean;
  /** Highest non-air y in the column, -1 when not ready. */
  topY(x: number, z: number): number;
  biomeAt(x: number, z: number): number;
}
export interface VoxelWrite extends VoxelRead {
  /** False when y is outside 1..BUILD_MAX, the chunk is not ready, or the id is unchanged.
   *  `silent` keeps the block entity in the cell and skips onBlockChange (doors, furnace lit state, water seep). */
  setBlock(x: number, y: number, z: number, id: number, silent?: boolean): boolean;
}
export interface BlockEnt { x: number; y: number; z: number; kind: string; data: any }
export interface BlockEnts {
  getEnt(x: number, y: number, z: number): BlockEnt | null;
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null;
  removeEnt(x: number, y: number, z: number): void;
}
```

`sim/physics.ts` (`moveBody`, `boxFree`, `liquidAt`, `raycast`, `rayBox`) takes `VoxelRead`.
Implementations: `Realm` (sim), `ClientVoxels` (client, bots).

```ts
// src/sim/light.ts
/** Light as the spawn and sun-burn rules need it, 0..15 each. Sim code reads light only through this. */
export interface LightSource {
  sky(x: number, y: number, z: number): number;
  block(x: number, y: number, z: number): number;
}
```

Stage 1 implements it over `World.getLight` (`client/worldstore.ts`), so behaviour is unchanged there.
From stage 2 on every realm has an `ApproxLight` (7.8). The call sites never change.

### 3.2 Edit maps and sim chunks

```ts
/** Cell index inside a chunk: ((z & 15) << 4 | (x & 15)) << 8 | y  (same as core/constants.ts `ci`). */
export interface ChunkEdits {
  dim: number; cx: number; cz: number;
  /** +1 for every cell change. 0 = never edited. */
  rev: number;
  /** Sparse form: cell index -> block id. Null when `full` is set. */
  cells: Map<number, number> | null;
  /** Dense form (migration of rewritten chunks, or more than 16,384 edited cells): the whole block array. */
  full: Uint8Array | null;
  /** Stored block entities (opened chests, forges, player containers). */
  ents: Map<number, BlockEnt>;
  /** FNV-1a hash of the generated (pre-edit) blocks, 0 until this process has generated the chunk. */
  genHash: number;
  /** Changed since the last takeDirty. */
  dirty: boolean;
  /** Changed since the last resolved commit that held it (dirty, or taken by a commit still in flight). */
  unsaved: boolean;
  /** The `ce` payload for the current `rev`, encoded once and shared by every subscriber (4.7). */
  wire: { rev: number; enc: 0 | 1; data: string } | null;
}
export interface EditStore {
  /** Returns the in-memory ChunkEdits if there is one, else loads from Storage; one promise per chunk. */
  load(dim: number, cx: number, cz: number): Promise<ChunkEdits>;
  peek(dim: number, cx: number, cz: number): ChunkEdits | null;
  /** Mark dirty and unsaved. The ONLY thing that does; mutating `ent.data` without it saves nothing. */
  touch(e: ChunkEdits): void;
  /** Drop from memory. Refused (kept, retried later) while the chunk is subscribed, a sim chunk, or `unsaved`:
   *  nothing is ever reloaded from Storage while a newer version of it is still on its way there. */
  release(dim: number, cx: number, cz: number): void;
}
export interface SimChunk {
  cx: number; cz: number; key: number;
  state: 0 | 1 | 2;                 // 0 wanted, 1 generating or loading edits, 2 ready
  blocks: Uint8Array | null; biomes: Uint8Array | null;
  top: Uint8Array;                  // highest non-air y per column
  sky: Uint8Array;                  // highest T_OPAQUE y per column (for skyApprox)
  edits: ChunkEdits | null;
  idleT: number;                    // seconds outside SIM_KEEP of every player
}
```

`SimChunks.update(players)` runs once per second per realm: every chunk within `SIM_RADIUS` of a
player (Chebyshev, around the player's chunk) is wanted, nearest first; a chunk outside `SIM_KEEP` of
every player for 10 s is dropped. A wanted chunk needs both `ChunkSource` output and
`EditStore.load`. `SimChunks.integrate(gen, edits)` then: copies the generated blocks, records
`edits.genHash = gen.hash`, applies `edits.full` or each `edits.cells` entry, builds `top` and `sky`,
and creates block entities by the generator-entity rule:

> For each `EntInit e` from the generator: if `edits.ents` has the cell, the stored entity wins.
> Else if `edits.cells` has an entry for the cell (or `edits.full` is set), the generator entity is
> dropped. Else create it exactly as `Game`'s `onChunkReady` does today (`nest` -> `{ mob, t: 0 }`,
> others -> `{ loot, s: null }`), in memory only.

When an in-memory generator entity becomes a stored one, and when a chunk is dirty:

- `realm.touchEnt(ent)` adds the entity to `edits.ents` if it is not there yet and calls
  `EditStore.touch`. It is called where the contents of a container change, and nowhere else: a chest
  opened and rolled, any op that changes a chest or forge slot, `setEnt`, a forge taking fuel, a forge
  finishing an item (the two places `Game.tickForge` sets `c.modified`). `removeEnt` deletes from
  `edits.ents` and touches the chunk.
- Timers do not touch. A nest's `t` and a forge's `at`, `burn` and `prog` change every block tick; they
  are written into `ent.data` as today and are saved only when something else touches the chunk. A
  generator nest is therefore never stored (its timer restarts at 0 after a reload, as it does today
  when the chunk regenerates), and a chunk with a nest or an idle forge is not dirty at every save.
- Conversion to the dense form (`cells.size` passes 16,384) first promotes every in-memory generator
  entity of the chunk into `edits.ents`. The dense form cannot say which cells were edited, so the rule
  above drops every generator entity that is not stored; without the promotion an unopened chest in a
  heavily excavated chunk would lose its loot table at the next reload and open empty. (Legacy chunks
  that migrate straight to dense carry their whole entity list already, 8.4.)

`Realm.setBlock` on a sim chunk: writes the array, `edits.cells.set(i, id)` or `edits.full[i] = id`
(entries are never pruned, even when the id equals generated terrain), `edits.rev++`, and unless
`silent`: `closeViewers(x, y, z)` (5.2), then deletes the cell's entity. It updates `top` / `sky`,
touches the chunk, queues the change for the chunk's subscribers, drops any `shared.gates` entry that
has this cell in its frame or sheet (9), then calls `onBlockChange` unless `silent`.

### 3.3 Sim, Realm, SimPlayer

```ts
// src/sim/sim.ts
export interface SimDeps {
  sink: Sink; chunks: ChunkSource; edits: EditStore;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
  /** `SimHost.requestSave`: the sim asks for a full commit soon (a summon, a player parked). It never saves by itself. */
  requestSave(): void;
}
export interface SimOptions { cheats: boolean; maxPlayers: number; solo: boolean; manual: boolean }
export interface SharedState {
  clock: number;                         // days, as today (starts 0.06)
  tick: number;                          // total sim ticks of this world
  rnd: number;                           // mulberry32 state
  flags: string[];                       // boss:n, craft:x, mine:x, place:x, smelt:x, had:x, dim:n, npc:x, event:x, started
  quest: number;                         // index into QUESTS
  events: { a: 'raid' | 'moon' | 'ashen' | null; k: number; g: number; l: number };
  homes: { x: number; y: number; z: number; npc: string | null }[];
  worldSpawn: [number, number];
  gates: { kind: 1 | 2; dim: number; x: number; y: number; z: number; alongX: boolean }[];
  /** Offerings spent on bosses that are still alive (`by` is a record id). Cleared on death or withdrawal; refunded at boot. */
  summons: { n: number; item: string; by: string; dim: number; altar: [number, number, number] }[];
  /** Credits earned by players who were not in memory at the time (boss loot, refunds), by record id.
   *  Applied and deleted by `join` for that id, so it is always saved in the same commit as what caused it. */
  owed: Record<string, { xp: number; coins: number; items: Item[] }>;
}
export class Sim {
  readonly seed: number;
  readonly realms: [Realm, Realm, Realm];
  /** Every player in memory by record id: online, lingering and parked (7.9). Never two SimPlayers for one id. */
  readonly players: Map<string, SimPlayer>;
  readonly shared: SharedState;
  readonly flags: Set<string>;
  tick: number;
  get time(): number;                    // tick * STEP; replaces Game.time inside the sim
  /** `world` comes from Storage.open(); for a new world SimHost.start builds one (findSpawn, clock 0.06). */
  constructor(world: WorldRecord, opt: SimOptions, deps: SimDeps);
  rnd(): number;
  isNight(): boolean; difficulty(): number;
  addFlag(f: string): void; delFlag(f: string): void;       // replicated
  /** For an id that is NOT in `players`. `rec` null = first visit. Loads the record, sets
   *  `stats.dead = stats.hp <= 0` (PlayerStats.load always clears it), applies and deletes `shared.owed[id]`,
   *  assigns a slot and puts the player in its realm in the loading state. */
  join(id: string, name: string, rec: PlayerRecord | null, local: boolean): SimPlayer;
  /** For an id that IS in `players` (lingering or parked): same SimPlayer, loading state again (7.9). */
  resume(p: SimPlayer): void;
  leave(p: SimPlayer, how: 'bye' | 'drop'): void;           // 'drop' starts the linger, 'bye' parks at once (7.9)
  handle(p: SimPlayer, m: C2S): void;                       // every JSON message after hello, already validated (4.1)
  handleMove(p: SimPlayer, v: DataView): void;
  /** True when the world should advance: always on a server; in solo only while a local player is active. */
  running(): boolean;
  step(): void;                                             // exactly one STEP (6.1)
  /** Chunk loading and arrivals only. `tick`, the clock and everything else stand still (6.1). */
  prepare(): void;
  /** Records changed since the last call, as detached copies taken between steps (one consistent
   *  instant across world, players and chunks). Marks each taken record `saving`. */
  takeDirty(all?: boolean): Batch;
  /** The host reports the outcome of the commit of `batch`. ok: its records become durable (`unsaved = false`
   *  unless changed again since). Not ok: every record of the batch is dirty again. */
  committed(batch: Batch, ok: boolean): void;
  online(): number;
  /** Actions the sim refused, counted for the lag run (R14). */
  readonly refused: { atk: number; fire: number; edit: number };
}

// src/sim/realm.ts
export class Realm implements VoxelWrite, BlockEnts {
  readonly dim: 0 | 1 | 2;
  readonly chunks: SimChunks;
  readonly mobs: MobSim; readonly proj: ProjSim; readonly drops: DropSim; readonly fluids: Fluids;
  readonly light: LightSource;           // 7.8
  /** Every in-memory player of this realm that is not parked: online (loading and stalled ones included)
   *  and lingering. Join order. Body checks (place, gate, landing) test all of them. */
  readonly players: SimPlayer[];
  blockT: number;
  /** Players with a station, chest or forge window open, by cell key `x,y,z`. Not saved. */
  readonly viewers: Map<string, Set<SimPlayer>>;
  /** Active (online, loaded, landed, not stalled), alive, not hidden. */
  targets(): readonly SimPlayer[];
  nearest(x: number, y: number, z: number, maxR: number): SimPlayer | null;
  countNear(x: number, z: number, r: number): number;
  /** Closes the window of every viewer of this cell (5.2) before the block or its entity goes away. */
  closeViewers(x: number, y: number, z: number): void;
  tick(dt: number): void;
  suspend(): void;                       // nobody left in `players` (7.9)
}

// src/sim/player.ts
export interface SimPlayer {
  /** Record id: the storage key, and the only key the sim uses to refer to a player from other state
   *  (`Mob.hitBy`, boss participants, `Drop.owner`, `Proj.by`, minion `owner`, `shared.summons`, `shared.owed`). */
  readonly id: string;
  /** 1..250. A wire handle for this session only (snapshots, `pl`, `dd`, fx scopes). Freed when the player is
   *  parked. Never stored in sim state that can outlive the player's presence. */
  slot: number;
  name: string; local: boolean;
  // connection state (7.9)
  online: boolean;                       // a connection is bound
  epoch: number;                         // +1 on every bind; input from an older connection is discarded
  stalled: boolean;                      // online, not loading, no `move` for STALL_AFTER ticks; never set when `local`
  lingerT: number;                       // seconds left of the reconnect grace, 0 when online
  parked: boolean;                       // grace over: out of its realm, kept until its record is durable, then evicted
  unsaved: boolean;                      // changed since the last resolved commit that held this record
  dim: 0 | 1 | 2;
  body: PlayerBodyState;                 // x y z vx vy vz yaw pitch hw h eye + flags from the last accepted move
  inv: Inventory; stats: PlayerStats;
  modes: { creative: boolean; hidden: boolean; god: boolean; fly: boolean };   // fly: flight granted by a command (7.10)
  bed: [number, number, number] | null;
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  safe: [number, number, number];
  mail: Item[];                          // refunds and loot owed, handed over when there is room
  // state machine
  loading: boolean;                      // true from join / resume / tp{load} until `ready` with the current tp id
  arriving: -1 | 0 | 1 | 2;              // footing still to be found by land()
  pendingBed: boolean;
  retCheck: boolean;                     // sent to a portalReturn spot that must be verified before activation (9)
  tp: number;                            // u8, bumped on every authoritative teleport
  sleeping: boolean;
  /** Set while the stored body overlaps a solid block: where and at which tick that was noticed (4.5 step 4). */
  embedded: { x: number; y: number; z: number; t: number } | null;
  // timers and validation
  recallT: number; hazardT: number; fullT: number; portalT: number; portalArmed: boolean;
  actCredit: number; useCredit: number;  // seconds of attack / use cooldown the player may spend (7.3)
  digCredit: number;                     // seconds of digging the player may spend (4.7)
  /** Block being mined: `id` at dig start, `bt` the smallest breakTimeMin seen during this dig, `t0` the start tick. */
  dig: { x: number; y: number; z: number; id: number; bt: number; t0: number } | null;
  fallPeak: number; grounded: boolean; speedBudget: number; moveSeq: number;
  lastMoveTick: number;                  // tick of the last `move` received, accepted or not: the liveness signal
  uiOpen: boolean;                       // the client has any window open (bit 9 of the move flags)
  usingItem: boolean;                    // bit 8 of the move flags; other players see the pose
  swingSeq: number;                      // +1 per accepted attack or shot; its low two bits travel in the snapshot
  hurtTick: number;                      // tick of the last damage taken (-1e9 = never): the `hurt` flag others see, and the knock allowance of 4.5
  rtt: number;                           // seconds, reported by the client, clamped to 0.4
  // inventory channel
  ackSeq: number; rngSeed: number; invDirty: boolean; statsDirty: boolean;
  /** Open window. Containers are named by cell only; every op resolves the entity again (5.2). */
  window: null | { mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string;
                   x?: number; y?: number; z?: number; npc?: string; mob?: number;
                   sold: { id: number; it: Item; price: number }[] };
}
```

`PlayerRecord` (3.6) is the persistent subset. `rngSeed` is drawn at join and sent in every inventory
snapshot; it seeds the per-op random stream (5.2). "Active" means `online && !loading && arriving < 0 && !stalled`.
A player that is not active cannot be hurt, is not a target, and its hazards, hunger and cooldown credits
do not run. "Flying is allowed" means `flightAllowed(p)`: `p.modes.creative || p.modes.fly` (`sim/player.ts`,
beside `active`). It is the `canFly` that `rules.maxSpeed` is called with, and a `flying` flag from a
client counts only while it holds (4.5).

### 3.4 Event sink

```ts
// src/sim/fx.ts
export type Scope =
  | { p: number }                                                    // one player slot
  | { dim: number; x: number; y: number; z: number; r: number; not?: number }   // players of a realm within r, optionally except one slot
  | { dim: number; not?: number }                                    // everyone in a realm, optionally except one slot
  | { all: true };
export interface Sink {
  /** Side effects: batched per connection, flushed every tick as one `fx` message. */
  emit(to: Scope, ev: Fx): void;
  /** Reliable state for one player (`st`, `stats`, `tp`, `hurt`, `dead`, `open`, `rej`, `cmdr`). */
  send(slot: number, m: S2C): void;
  /** Reliable state for everyone (`flags`, `quest`, `time`, `event`, `pl`, `chat`). */
  broadcast(m: S2C): void;
}
```

`Fx` is the tuple union of 4.6. The sim never loops over particles: one burst event replaces each loop.
Two families are not culled by distance by the sim: the host decides per connection who is told about a
drop (`da`, `dn`, `dd`) and about a projectile (`ps`, `pe`) from its interest sets (6.4). The scope the sim
gives them only names who may be told at all:

- `ps` of a creature's shot: `{dim}`. `ps` of a player's shot: once to `{p: shooter}` with `cseq`, once to
  `{dim, not: shooter}` with `cseq` 0. The host tells the shooter always, and of the others those within
  `PROJ_R`; either way the id enters that connection's known set. `ProjSim.fire` flies a shot through its
  `lead` (7.3) before it emits, so the `ps` is the state after the lag compensation; a shot that ends inside
  its lead still emits `ps` and then `pe`.
- `pe`: `{dim}`, for every end: a hit, terrain, the life running out (how 0) and `ProjSim.clear()` (how 0,
  when a boss falls or withdraws). The host passes it to the connections whose known set holds the id and
  forgets the id. A client that has already ended the projectile by itself ignores it.
- `da` of an unowned drop: `{dim}`. `da` of an owned drop: `{p: owner}` when the owner is in that realm,
  else nothing (the sweep of 6.4 tells the owner on coming near). The host applies `DROP_R` to both.
- `dn`, `dd`: `{dim}`; the host passes them to the connections that know the drop. `DropSim.clear()` and a
  full pool giving up its oldest drop say `dd` with slot 0.

For the sweeps the host reads the pools themselves (`realm.proj.list`, `realm.drops.list`, bounded by `hi`)
and builds the event of a live entity with `psOf(p, own)` (`sim/projectiles.ts`) and `daOf(d)`
(`sim/drops.ts`), the functions the sim's own emits use.
Wire ids. A creature, a projectile and a drop each carry `id`, 1..65535 (`ID_MAX`), from a wrapping counter
that passes over ids still in use: creatures from one counter for all realms (`sim.mobId`), projectiles and
drops from one counter per realm. An id is unique among the live entities of its kind in its realm, which
is all a client ever sees at once.
Rule for the acting player: effects the client already produced by prediction (its own swing, dig tick,
block-break burst and sound, placement sound, eating sound) are emitted with `not: p.slot`.

### 3.5 Chunk source

```ts
// src/sim/chunksource.ts
export interface GenResult { dim: number; cx: number; cz: number; blocks: Uint8Array; biomes: Uint8Array;
                             ents: EntInit[]; hash: number }
export interface ChunkSource {
  /** Queue a job; lower `prio` first. Idempotent while the job is pending. */
  request(dim: number, cx: number, cz: number, prio: number): void;
  cancel(dim: number, cx: number, cz: number): void;
  /** Called once per tick. Returns at most `maxJobs` finished jobs. InlineSource generates here: until
   *  `maxJobs` are done or `budgetMs` is spent, whichever comes first (always at least one job when any is
   *  queued). Real clock: `poll(Infinity, budget)`. Manual clock: `poll(2, Infinity)`, so the number of
   *  chunks finished in a step never depends on how fast the machine is (10.1). */
  poll(maxJobs: number, budgetMs: number): GenResult[];
  readonly pending: number;
  dispose(): void;
}
```

Implementations: `InlineSource` (`sim/chunksource.ts`; `new InlineSource(seed, now)` with `now()` in
milliseconds from the host; jobs leave lowest `prio` first and in asking order among equals, and a second
`request` for a pending job changes nothing, its `prio` included),
`NodePoolSource` (`server/nodepool.ts`, `worker_threads`, `min(4, cores - 2)` workers, at least 1).
The seed is fixed at construction. A worker error returns no result; the host re-requests twice, then
logs and leaves the chunk unready (bodies freeze there, as on the client today).

### 3.6 Storage

```ts
// src/sim/storage.ts
export interface WorldRecord {
  format: 2;
  id: string; name: string; seed: number; seedText: string; created: number; played: number;
  /** Record id that a local transport always maps to (solo), null on a server. */
  owner: string | null;
  /** Block-key tables; a chunk record's `pal` indexes this. Same scheme as Game.palettes today. */
  palettes: string[][];
  /** Known players: unique names. */
  names: Record<string, { name: string; seen: number }>;
  state: SharedState;
}
export interface PlayerRecord {
  v: 1; id: string; name: string; seen: number;
  dim: number; pos: { x: number; y: number; z: number; yaw: number; pitch: number };
  inv: unknown;      // Inventory.serialize()
  stats: unknown;    // PlayerStats.serialize()
  bed: [number, number, number] | null;
  deathAt: [number, number, number, number] | null;
  portalReturn: Record<number, [number, number, number]>;
  safe: [number, number, number];
  arriving: number; pendingBed: boolean; recallT: number;
  modes: { creative: boolean; hidden: boolean; god: boolean; fly: boolean };
  mail: Item[];
}
export interface ChunkRecord {
  dim: number; cx: number; cz: number; rev: number; pal: number;
  enc: 0 | 1;              // 0 sparse triples (u16 LE index, u8 id), 1 RLE pairs of the full array
  data: Uint8Array;
  ents: BlockEnt[];
}
/** What one save writes: every record that changed, copied at one instant between two steps. */
export interface Batch { world?: WorldRecord; players: PlayerRecord[]; chunks: ChunkRecord[] }
export class StorageError extends Error { code: 'corrupt' | 'full' | 'locked' | 'io' | 'version'; constructor(code, msg) }
export interface Storage {
  /** Opens (and migrates) the world. Null = nothing saved yet. */
  open(): Promise<WorldRecord | null>;
  loadPlayer(id: string): Promise<PlayerRecord | null>;
  loadChunk(dim: number, cx: number, cz: number): Promise<ChunkRecord | null>;
  /** One save: all of the batch or none of it. Resolves when durable. */
  commit(batch: Batch): Promise<void>;
  close(): Promise<void>;
}
```

Implementations: `DiskStorage` (server), `IdbStorage` (solo), `MemStorage` (tests, `?quick&fresh`
may still use `IdbStorage` so save/load can be tested). `MemStorage` (`sim/storage.ts`) keeps and hands out
copies only, counts `commits` and `loads`, and rejects the next commit with `failNext` when a test sets it.
`ChunkRecord.data` is exactly the bytes of 4.7 rule 2 before base64: `packSparse(cells)` for `enc 0`,
`packFull(blocks)` for `enc 1` (`net/codec.ts`). A record with `rev` 0 holds entities only.

Three rules bind every caller of `Storage`; together they are what makes "items neither vanish nor
duplicate" true, and each closes a hole that a per-record save would open.

1. One kind of save. `commit` is only ever called by `SimHost.save()` with the whole of
   `sim.takeDirty()`. Nothing writes one record by itself: not a summon, not `bye`, not the end of a
   grace period. An item that moved between two records is in both of them or in neither.
2. Memory wins until durable. A `SimPlayer` or a `ChunkEdits` leaves memory only when it is not
   `unsaved`. `loadPlayer` and `loadChunk` are called only for keys that are not in memory. So no read
   can return a version older than one that is still being written or waiting for a retry.
3. A failed commit is not merged later. `sim.committed(batch, false)` makes every record of the batch
   dirty again; the next save takes all of them afresh, at one new instant.

`PlayerRecord` has no `dead` field: `Sim.join` derives it from `stats.hp <= 0`, as `Game` does today
with `deadOnLoad`, and then sends `dead` so the client opens the death screen.

### 3.7 Transport

```ts
// src/net/transport.ts
export interface Transport {                    // client side
  readonly kind: 'ws' | 'worker' | 'loopback';
  state: 'connecting' | 'open' | 'retrying' | 'closed';
  send(m: C2S): void;                           // JSON-shaped object
  sendBin(b: ArrayBuffer): void;                // movement
  onOpen: (() => void) | null;                  // fires again after every reconnect
  onMessage: ((m: S2C) => void) | null;
  onBinary: ((b: ArrayBuffer) => void) | null;
  onClose: ((code: string) => void) | null;     // 'retrying' or a final error code
  close(): void;
}
export interface Conn {                         // host side, one per client
  readonly id: number;
  readonly local: boolean;                      // worker or loopback: solo privileges
  readonly addr: string;
  send(m: S2C): void;
  sendBin(b: ArrayBuffer): void;
  /** Bytes queued and not yet written (0 on local transports). */
  readonly buffered: number;
  close(code: string): void;
  onMessage: ((m: C2S) => void) | null;
  onBinary: ((b: ArrayBuffer) => void) | null;
  onClose: (() => void) | null;
}
export interface HostEnv {                      // what a host needs from its platform
  now(): number;                                // ms, monotonic
  setTimer(fn: () => void, ms: number): unknown; clearTimer(h: unknown): void;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
}
```

- `ws`: JSON messages are text frames (`JSON.stringify`), binary messages are binary frames.
- `worker`: `postMessage(obj)` for JSON-shaped messages (structured clone, no stringify),
  `postMessage(buf, [buf])` for binary.
- `loopback`: messages are queued by reference and must be treated as immutable. The host drains its
  inbox at the start of each step; the client drains its inbox whenever `session.pump()` is called: at
  the start of each `runFrame` and again right after the sim step inside it (10.1), so a reply never
  waits for a frame that a throttled tab may not run.
  `?clone` runs every loopback message through `JSON.parse(JSON.stringify())` to catch values that
  would not survive a real transport.

```ts
// src/net/host.ts
export class SimHost {
  constructor(env: HostEnv, storage: Storage, chunks: ChunkSource,
              opt: { name: string; seed: number; seedText: string; cheats: boolean; password: string | null;
                     maxPlayers: number; viewMax: number; clock: 'real' | 'manual'; saveEvery: number });
  start(): Promise<void>;                       // storage.open(), build Sim, start the clock
  connect(c: Conn): void;                       // called by the listener for every new connection
  /** Manual clock only. Before each step it awaits every storage load issued so far (10.1). */
  stepManual(n: number): Promise<void>;
  /** Ask for a save soon. Coalesced: the host runs `save()` between steps, at most one start per second. */
  requestSave(): void;
  /** The only save there is: commit all of `sim.takeDirty()`, then `sim.committed(batch, ok)`. One at a time. */
  save(): Promise<void>;
  stop(): Promise<void>;                        // final save, close storage
  readonly sim: Sim;
  readonly stats: { tickMs: Float32Array /* ring of 3600 */; saveMs: number; players: number; stepErrors: number };
}

// Services the host composes; their files are owned by different lanes in stage 2.
// src/net/hostchunks.ts
export class ChunkService {
  constructor(sim: Sim, edits: EditStore);
  onChunks(c: Conn, p: SimPlayer, m: C2S & { t: 'chunks' }): void;
  onRealmChange(c: Conn): void;                 // drop every subscription of the connection (also on every bind)
  onBlock(dim: number, x: number, y: number, z: number, id: number, rev: number): void;   // called by Realm.setBlock
  tick(c: Conn, p: SimPlayer): void;            // start queued loads; once per second drop out-of-range subscriptions
  flush(c: Conn): void;                         // sends pending `b`, `gh`, and `ce` within CE_BYTES (4.7)
}
// src/net/hostsnap.ts
export class SnapService implements Sink {
  constructor(sim: Sim);
  attach(c: Conn, p: SimPlayer): void; detach(c: Conn): void;
  flush(c: Conn, tick: number): void;           // state messages, `fx`, then the snapshot on this connection's tick
}
```

### 3.8 Client session and the interfaces between client modules

```ts
// src/client/session.ts (no DOM: a bot uses it as the browser does)
export type MoveState = Omit<Move, 'seq'>;      // Move is the decoded movement message of net/snapshot.ts
export function moveFlags(body, jumped: boolean, usingItem: boolean, uiOpen: boolean): number;   // the MV_ bits
export class Session {
  constructor(transport: Transport);            // takes over transport.onMessage and onBinary; onOpen and onClose stay the caller's
  readonly transport: Transport;
  readonly local: boolean;                      // transport.kind !== 'ws'
  mover: (() => MoveState) | null;              // where the body is now; set by whoever owns the body
  inv: InvChannel | null;                       // set by the inventory client
  on<T extends S2C['t']>(type: T, fn: (m: S2COf<T>) => void): void;   // several handlers per type run in registration order
  onSnapshot(fn: (b: ArrayBuffer) => void): void;                     // undecoded; decodeSnapshot is the handler's
  pump(): void;                                 // deliver everything received so far, in arrival order
  send(m: C2S): void;                           // anything that is not an action
  act(m: ActMsg): void;                         // 4.5: a `move` if the body changed, inv.flushSel(), then m
  move(): void;                                 // the scheduled movement send: inv.flushSel(), then a `move` whatever changed
  reset(): void;                                // movement numbering from 0, next act sends a move; done by itself on `welcome`
  readonly lastMove: number;                    // seq of the last move sent: what a snapshot's `ackMove` answers
  readonly queued: number; readonly counts: { in: number; out: number; moves: number };
}
```

Nothing is delivered from inside a transport callback: a message waits in the session until `pump()`.
A message that arrives while a pump runs is delivered by that pump; `pump()` called from a handler does
nothing; when a handler throws, the error reaches the caller of `pump()` and the messages behind it stay
queued. Hello, reconnect state, the rtt probe and the `unsaved` flag are added to this class by integration.

```ts
// src/client/api.ts
export interface DigHost {                      // lane B, client/blocks.ts
  reach(): number; breakTime(id: number): number;
  onBroken(x, y, z, id): void; onDigStart(id): void; onDigTick(x, y, z, id, nx, ny, nz): void;
  onDig(on: boolean, x, y, z): void;            // progress began to build on this block, or stopped: what `dig` reports
}
export interface EditHost {                     // lane B, client/blocks.ts; called by lane D's ActHost.secondary
  place(hit: RayHit, id: number): boolean;      // each: check, write the cells, send `edit` or `use`; false = refused here, nothing sent
  placeDoor(hit: RayHit): boolean;
  toggleDoor(hit: RayHit): boolean;
}
export interface ActHost {                      // lane D, client/combat.ts
  primary(pressed: boolean, held: boolean): boolean;
  secondary(hit: RayHit | null, pressed: boolean): boolean;
}
export interface InvChannel {                   // lane D, client/invclient.ts
  nextSeq(): number;                            // the seq for the next op / edit / use / item / fire; sends a waiting selection first
  send(op: InvOp): OpResult;                    // apply locally, send under the next seq
  internal(seq: number, op: { o: '_held'; n } | { o: '_slot'; i; n }): void;   // apply locally, queue under that seq, send nothing
  setSel(i: number): void;                      // select locally now; the `sel` op waits (5.3)
  flushSel(): void;                             // send the waiting selection, if any
}
export interface Bodies {                       // lane C, client/entities.ts; called by lane B's predicted placement
  blocked(x: number, y: number, z: number): boolean;   // a creature (not a minion) or another player, as seen now, overlaps the cell
}
export interface Ghosts {                       // lane C, client/entities.ts; called by lane D's client/combat.ts
  ghost(seq: number, kind: string, x, y, z, dx, dy, dz, speed?: number): void;   // stand-in for the shot of `fire` seq (7.3)
}
```

`Interact.tick(dt, input, dig, act, active)` takes the two hosts. It calls `onDig(true, x, y, z)` on the first
tick progress builds on a block (before that tick's `onDigTick` and `onBroken`), again with the new cell when
the aim moves to another block, and `onDig(false, ...)` on the first tick it no longer builds (button up,
aim off, the pause after a break, the hands taken away). `client/blocks.ts` turns each call into a `dig`
message. After a successful `EditHost` call the caller plays the placement sound and the swing, as
`Game.secondary` does today; the break burst and sound are `onBroken`'s. One `seq` counter serves every sequenced
message, and it lives in the `InvChannel` because that is where unacknowledged ops are kept by `seq`.
`nextSeq()` sends a waiting hotbar selection before it returns: the `sel` op must carry the number in
front of the action's, and the host accepts numbers only in order (4.3). So a module that predicts an
action does `seq = inv.nextSeq()`, `inv.internal(seq, ...)` where the action uses something up, then
`session.act({ ..., seq })`.

---

## 4. Protocol

### 4.1 Framing and reliability

- One ordered, reliable stream per client (WebSocket over TCP; the worker and loopback transports are
  ordered and lossless by construction). No message may assume it can be lost in transit.
- Two binary messages exist: `snapshot` (S2C, type byte 1) and `move` (C2S, type byte 2). Everything
  else is a JSON object with a string field `t`. All multi-byte binary fields are little-endian.
- The sender may drop a snapshot instead of queueing it (backpressure, 6.3). Snapshots therefore carry
  complete state for everything in them and no events. Events travel in `fx` and are never dropped.
- Per tick and per connection the host sends, in this order: reliable state messages produced by the
  tick, the `b` batch, the `fx` batch, the paced `ce` batch (4.7), then the snapshot if this is the
  connection's snapshot tick.
- No compression (`perMessageDeflate: false`). Largest inbound JSON accepted: 16 KB. Largest inbound
  binary: 64 bytes. Violations close the connection with `error proto`.

Validation. Nothing reaches `sim.handle` unchecked. `src/net/validate.ts` exports
`checkC2S(m: unknown): C2S | null`, one branch per message type, and the host calls it on every inbound
JSON message on every transport:

- `t` is a known type; every field has the declared type; no number is `NaN` or infinite; fields declared
  as integers are integers.
- Ranges: block coordinates `|x|, |z| <= 500000`, `0 <= y <= 255`; chunk coordinates `|cx|, |cz| <= 31250`
  (`chunkKey` aliases from 32,768); slot refs inside their container; `RECIPES` and block ids inside
  their tables; strings and arrays inside the limits given in 4.3.
- `seq` must equal `p.ackSeq + 1`.
- A message that fails closes the connection with `error proto`. So does a binary message whose length
  is not 36 or whose type byte is not 2.

`checkC2S` is a pure function of the message, so what needs the player is the host's to check after it:
`seq === p.ackSeq + 1`, reach, and what `hello` claims (`proto` against `PROTO`, `data`, the name rule
`NAME_RE` and the token, each of which has its own error code and so must not fail as `proto`). It returns
the message itself, never a copy, and never throws. Exactly what it checks:

- Fields. Every declared field is present with its type; an optional field may be absent; a field that is
  not declared fails the message. A field whose value is `undefined` counts as absent (it would be after
  JSON), so the in-thread transport and a socket agree.
- `op` carries its op fields beside `t` and `seq` (`{t: 'op', seq, o: 'click', v, r, e}`); `_held` and
  `_slot` fail.

| Field | Passes when |
| --- | --- |
| `seq` | integer 1..2,147,483,647 (`SEQ_MAX`) |
| block cell `x, y, z` (`dig`, `edit`, `use`, `item.at`) | integers, `\|x\|, \|z\| <= 500000`, `0 <= y <= 255` |
| block `id` (`edit`, `use`, `pick`) | integer inside `BLOCKS` |
| creature `id` (`talk`, `atk`) | integer 1..65535 |
| `d` (`atk`, `fire`) | three numbers, each within 1.01 of zero |
| `fire.o` | three numbers within 2 blocks of where a body may be: `\|x\|, \|z\| <= 500002`, `-66 <= y <= 402` |
| `ping` `x, y, z` | numbers (not cells) within 32 blocks of where a body may be |
| `hello` | `proto` integer 0..65535; `data` integer 0..2^32 - 1; `build`, `name`, `token` strings of at most 64 characters; `password` at most 128; `view` integer 4..16 |
| `ready.tp` | integer 0..255 |
| `chunks` | `dim` 0..2; `sub` whole triples, at most 1,024, `\|cx\|, \|cz\| <= 31250`, nonce 0..65535; `unsub` whole pairs, at most 1,024; `full` whole pairs, at most 16 |
| `edit.k` | 0, 1 or 2 |
| `item.slot` | integer 0..35 |
| `chat.text`, `cmd.text` | strings of 1..200 characters; `cmd.id` integer 0..`SEQ_MAX` |
| `rtt` | `c` a number 0..1e15, `last` a number 0..600000 |
| `step.n` | integer 1..600 |
| slot ref `[c, i]` | `c` 0..4 and `i` inside that container: 36, 3, 5, 9, 27 slots (whether the open window shows the slot is `applyOp`'s to say) |
| `e`, `buy.k` | strings of at most 48 characters (`buy.k` at least 1) |
| `sel.i`, `hotkey.i` | integer 0..8 |
| `lay.r`, `book.r` | integer inside `RECIPES`; `book.max` 1 or 64 |
| `sort.w` | 0 or 1; `spend.a` one of `str agi vit arc`; `buyBack.id` integer 1..`SEQ_MAX` |
| every other field | the boolean it is declared as |

The host wraps the handling of each inbound message in `try / catch`: an exception is logged with its
stack and closes that connection with `error proto`; the step goes on for everyone else. `sim.step()` is
wrapped too: an exception is logged and counted, and the timer keeps running; 20 failed steps inside
one minute, an `uncaughtException` or an `unhandledRejection` take the normal shutdown path (announce,
save, exit code 2). `applyOp` never throws (5.1).

Inbound rate caps (`ws` connections only; local transports have none). Token buckets, refilled in sim
time. What happens to a message over its cap depends on its kind; 3 s of sustained excess on any bucket
closes with `error rate`.

| Messages | Rate (burst) | Over the cap |
| --- | --- | --- |
| `move` | 60/s (30) | dropped; the next one supersedes it |
| `op`, `edit`, `use`, `item`, `fire` (the sequenced ones) | 60/s (120) in total | never dropped: handled as refused. `ackSeq` advances, `edit` and `use` are answered with `rej {seq, cells: []}`, the others by the `st` that follows |
| `atk` | 12/s (12) | dropped |
| `dig`, `talk` | 20/s (20), 4/s (4) | dropped |
| `chunks` | 12 messages/s, each at most 1,024 `sub` entries, 1,024 `unsub` entries and 16 `full` entries | never dropped: every accepted message is queued and served at the host's pace (4.7). A thirteenth message inside one second is a protocol violation and closes with `error rate` |
| `chat`, `cmd`, `ping`, `rtt` | 5 per 5 s, 5/s, 2/s, 2/s | dropped |

Keepalive: the server sends a WebSocket ping every 5 s and closes a socket from which no frame (pong
included) has arrived for 10 s. The client drops a socket that has delivered no message for 6 s (it
sends `rtt` every 2 s and each is echoed) and starts reconnecting. A link that is silent but not closed
is caught earlier, by the movement stream (stall rule, 7.9).

### 4.2 Handshake, version check, errors

```
client                                   host
  open transport
  hello {proto, build, data, name, token, password?, view}  ->
                                         checks, in order: proto, data, password, name, capacity
                                         join lock for this id; load the record if it is not in memory
                                     <-  error {code, msg}      (then closes), or
                                     <-  welcome {...}
                                     <-  st {ack: 0, inv}, stats {...}, pl {...}, time, event, flags, dead?
  clear world, generate around pos, subscribe chunks
  ready {tp}                         ->  player becomes active when its sim chunks are ready too
                                         and its position has been checked (4.5)
```

- A connection that sends anything before `hello`, or no `hello` within 5 s, is closed (`proto`).
- `proto` must equal `PROTO`. `data` must equal the host's `dataHash()`: FNV-1a 32 over
  `BLOCKS.map(b => b.key).join()`, `ITEM_LIST.map(i => i.key).join()`, `MOB_LIST.map(m => m.key).join()`,
  `Object.keys(PROJECTILES).join()` and `RECIPES.length`. Indices into those tables are used on the wire.
  The server serves the client build, so a mismatch means a stale tab: the client shows "Reload to update".
  `index.html` is served `Cache-Control: no-cache`; hashed assets are immutable.
- `token`: 32 hex characters from `crypto.getRandomValues(new Uint8Array(16))`, kept in `localStorage`
  under `peopls.token`. Player record id on a server = first 24 hex characters of `sha256Hex(token)`.
  On a local transport the token is ignored and the id is `world.owner` (created as `'local'`).
- `name`: trimmed, 1 to 16 characters of `[A-Za-z0-9 _-]`. Unique among known players, compared
  case-insensitively against `world.names`. A known id may change to a free name.
- `password`: compared in constant time when the host has one. Sent in clear: the page is plain http
  and `crypto.subtle` does not exist there. Five wrong passwords from one address in a minute blocks
  that address for a minute.
- `view` is informational (logs, bots). What a connection may subscribe to is bounded by the host's
  `viewMax` (4.7); the client clamps its render distance to `cfg.viewMax` from `welcome` (16 in solo).

One player per id, whatever the sockets do. `hello` may have to wait for storage, so "is this id
online" cannot be answered by looking at `sim.players` alone: two sockets with the same token (two
tabs retrying after a restart, or a hostile client) would both find nobody and both join. `SimHost`
therefore handles `hello` like this, synchronously up to the one `await`:

```
id = record id of the token (or world.owner on a local transport)
if joining.has(id):                    // a load for this id is already under way
    joining.get(id).conn.close('replaced'); joining.get(id).conn = conn; return     // the newest socket inherits it
p = sim.players.get(id)
if p:                                  // in memory: online, lingering or parked. No storage read (3.6 rule 2).
    if p.online: unbind(p)             // old socket: close('replaced'), its undrained inbox is discarded
    if p.parked: capacity check (else error full)
    sim.resume(p); bind(p, conn); return   // always through loading: the new client starts from an empty world
capacity check (else error full)       // capacity counts players that hold a slot: online and lingering
joining.set(id, {conn, name})          // the name counts as taken for other hellos from here on
rec = await storage.loadPlayer(id)
conn = joining.get(id).conn; joining.delete(id)
if conn is closed: return
p = sim.join(id, name, rec, conn.local); bind(p, conn)
```

`bind(p, conn)`: `p.online = true`, `p.epoch++`, `p.ackSeq = 0`, drop the connection's chunk
subscriptions and interest sets, send `welcome`. The host dispatches a message only if it comes from
the connection currently bound to its player, so nothing a replaced socket still had queued can move
`ackSeq` or act for the player; `seq` restarts at 1 on the new connection.
On the client, `ws-client` numbers its sockets; handlers ignore events from any socket but the newest.
An `error replaced` that arrives on an old socket is therefore ignored and cannot stop the retry loop;
only one received on the current socket (another tab took over) is final.

Error codes (`error {t: 'error', code, msg}`; the client stops retrying on all but the last three):
`proto`, `version`, `data`, `password`, `name_taken`, `name_invalid`, `full`, `replaced`, `kicked`,
`rate`, `shutdown` (server is stopping: keep retrying), `slow` (output queue over 4 MB: retry),
`idle` (no movement message for 30 s, 7.9: retry; a hidden tab retries when it is shown again).

### 4.3 JSON messages

Every action that can change the sender's inventory carries `seq`: one counter per connection,
starting at 1 after each `hello`, shared by `op`, `edit`, `use`, `item` and `fire`. The host accepts
only `seq === p.ackSeq + 1` (anything else is a protocol error), processes them strictly in order and
sets `p.ackSeq = seq` after each, accepted, refused or over the rate cap. A sequenced message is never
dropped without an answer: an `st` with the new `ack` follows in the same tick, and `edit` and `use`
get a `rej` when they did not take effect. All action messages leave the client through `session.act`
(4.5), behind a fresh `move`.

Client to host

| `t` | Fields | Sent when | Host on receipt |
| --- | --- | --- | --- |
| `hello` | `proto`, `build`, `data`, `name`, `token`, `password?`, `view` (chunks, 4..16; informational) | once per connection | 4.2 |
| `ready` | `tp` | the client's chunks within 3 of its position have generation, edits and a mesh, after `welcome` or any `tp` with `load` (with `&det`: the whole view, 10.1) | if `tp === p.tp`: `p.loading = false`. The player turns active once `arriving < 0`, its sim chunks are ready and its position has been checked (4.5); the host then sends a `tp {load: false}` with the final position |
| `chunks` | `dim`, `sub: number[]` (flat `cx, cz, n` triples, `n` a u16 nonce; at most 1,024), `unsub: number[]` (flat `cx, cz` pairs; at most 1,024), `full?: number[]` (flat pairs; at most 16) | the client created or dropped chunk records, or wants a resync; flushed at most once per 100 ms | 4.7. Never dropped; `unsub` is applied before `sub` |
| `dig` | `on`, `x`, `y`, `z` | mining starts on a block, changes block, or stops | `p.dig = on ? {x, y, z, id: the block there, bt: breakTimeMin(id, p), t0: tick} : null` (4.7, dig budget); fx `dg` to others within 48 |
| `edit` | `seq`, `k` (0 break, 1 place, 2 door), `x`, `y`, `z`, `id` | the client predicted a block edit | 4.7 validation; on refusal `rej`. Always answered: by the `b` of the change or by `rej` |
| `use` | `seq`, `x`, `y`, `z`, `id` | right-click on a block whose `use` is set (not sneaking) | active, ready sim chunk, reach and id check, then `actions.useBlock`; on refusal `rej` |
| `talk` | `id` (mob id) | right-click on a townsperson | within 5 blocks: `window = {mode: 'shop', npc, mob: id, sold: []}`, `m.talk = 6`, send `st {box}` and `open` |
| `item` | `seq`, `slot`, `at?: [x, y, z]`, `ax?: boolean` | consumable used (right-click or H), recall stone, gate kit placed at `at` | `actions.consume`, recall (`goHome`), or `gates.buildGate` after `gateFits` |
| `atk` | `id`, `d: [dx, dy, dz]` | the client's melee ray hit creature `id` and its own cooldown allowed a swing | `actions.attack` (7.3): action credit, reach from the position just sent |
| `fire` | `seq`, `o: [x, y, z]`, `d: [dx, dy, dz]` | ranged, magic or summon weapon used | `actions.fire` (7.3) |
| `op` | `seq`, `o`, op fields (section 5) | any inventory or container manipulation | `applyOp` on the authoritative state |
| `respawn` | none | "Rise again" on the death screen | `player.respawn` if dead |
| `chat` | `text` (1..200 chars) | chat line not starting with `/` | broadcast `chat` |
| `cmd` | `id`, `text` | chat line starting with `/`, or `T.cmd` | if allowed (7.10) `cheats.cheat`; reply `cmdr` |
| `ping` | `x`, `y`, `z` | ping key (default `V`) on the targeted block or 32 blocks along the view | fx `pg` to the realm |
| `rtt` | `c` (client ms), `last` (previous measured round trip, ms) | every 2 s | `p.rtt = min(last, 400) / 1000`; echo `rtt` |
| `bye` | none | quit to title | `sim.leave(p, 'bye')` (parked at once, 7.9), `host.requestSave()`, close. The record leaves memory when that full commit has resolved |
| `step` | `n` | manual clock only, local transports only | run `n` steps, then send `stepped` |
| `pause` | `on` | solo: pause menu, tab hidden, window blur with a window open | real clock stops or resumes; `on: true` also calls `host.requestSave()`; ignored on `ws` |
| `save` | none | solo: pause menu, tab hidden, before unload | `host.save()` now (no debounce), then `saved` |

Host to client

| `t` | Fields | Sent when | Client on receipt |
| --- | --- | --- | --- |
| `welcome` | `proto`, `boot` (random per host start), `you: {slot, id}`, `world: {name, seed, seedText}`, `dim`, `pos: [x, y, z, yaw, pitch]`, `tp`, `tick`, `clock`, `flags: string[]`, `quest`, `event`, `spawn: [x, z]`, `cfg: {cheats, simRadius, viewMax, maxPlayers}`, `players: PlayerInfo[]` | hello accepted (first join, resume or takeover) | reset every mirror, clear the world, set seed and dim, clamp the view to `cfg.viewMax`, teleport, freeze, start loading. If `boot` differs from the previous one: toast "Server restarted". |
| `error` | `code`, `msg` | before closing | 4.2 |
| `st` | `ack`, `inv?: InvWire`, `box?: BoxWire \| null` | once per tick per player when `ackSeq` advanced, the inventory, attributes or points changed, or the viewed container changed (forge progress: 5 Hz) | reconcile (5.3). `box: null`: the sim closed the window (5.2); the client closes it too. |
| `stats` | `level`, `xp`, `buffs: [key, seconds][]`, `salveCd`, `recallT`, `modes: {creative, hidden, god, fly}`, `bed`, `deathAt`, `sleeping` (attributes and points travel in `st.inv`, where the `spend` op can be reconciled) | on change, at most 4 per second | replace the mirror, `stats.recompute(inv)`. If `modes.creative \|\| modes.fly` differs from what the mirror held, `player.flying` takes the new value: this is how the `creative` and `fly` commands reach the body that flies. A `welcome` resets the mirror to no modes, so the first `stats` of a creative or granted player puts it in flight. |
| `hurt` | `dmg`, `fx`, `fz`, `knock`, `cause`, `dodged?` | the sim damaged this player | flash with the direction formula of today's `hurtPlayer`, shake, add knockback to `player.kbx / kbz`, `vy = 5` when on the ground and `kr > 0.3`, sound |
| `dead` | `cause`, `lost`, `at: [dim, x, y, z]` | death; also right after `welcome` for a record loaded with `hp <= 0` (`cause: ''`, `lost: 0`) | close windows, death screen (same texts as `Game.onDeath`; for `cause: ''` today's "You did not get back up") |
| `tp` | `id`, `dim`, `x`, `y`, `z`, `yaw?`, `pitch?`, `load`, `msg?` | movement correction, respawn, recall, portal crossing, cheat `tp` / `dim`, arrival after `land()` | set `player.tp = id`; if `dim` changed: clear world, entity store and predictions, `world.setDim`; `player.teleport`; if `load`: freeze, loading screen with `msg`, send `ready {tp: id}` when loaded |
| `open` | `mode`, `station?`, `npc?` | the sim opened a shop, chest or forge for this player (stations open on the client without waiting) | `win.show(mode, ...)` on the `view.box` built from the `st.box` that precedes it (5.3) |
| `rej` | `seq`, `cells: number[]` (flat `x, y, z, id`; empty when the host could not read the cells or the message was over its rate cap) | an `edit` or `use` was refused | with cells: write the true ids, drop the predictions of that `seq`. Empty: resync every chunk holding a prediction of that `seq` (4.7 rule 7) |
| `ce` | `dim`, `l: [cx, cz, n, rev, gh, enc?, data?][]` | answer to `chunks.sub` and `chunks.full`, paced (4.7) | 4.7: entries whose `n` is not the record's current nonce are dropped |
| `b` | `dim`, `l: number[]` (flat `x, y, z, id, rev`) | block changes in subscribed chunks, batched per tick | 4.7 |
| `gh` | `dim`, `l: number[]` (flat `cx, cz, gh`) | the host generated a subscribed chunk for the first time | compare with the local generation hash (4.7) |
| `fx` | `l: Fx[]` | every tick with events for this client | 4.6 |
| `flags` | `add: string[]`, `del: string[]` | shared flags changed | update the mirror |
| `quest` | `index` | guide step advanced | update the mirror |
| `time` | `clock`, `tick` | every 5 s and on any jump (sleep, cheat) | set the mirror; the client advances it by `dt / DAY_LENGTH` between messages |
| `event` | `a`, `k`, `g` | world event started, progressed, ended | HUD event box |
| `pl` | `add?: PlayerInfo[]`, `upd?: PlayerInfo[]`, `del?: number[]` with `PlayerInfo = {slot, name, dim, held, armor: [k, k, k], level}` | join, leave, realm change, held item or armour or level changed | roster, player views |
| `where` | `l: number[]` (flat `slot, dim, x, z`) | 1 Hz | compass pips for friends, roster distances |
| `chat` | `slot` (0 = server), `name`, `text` | chat | chat log |
| `rtt` | `c`, `tick` | answer to `rtt` | measure round trip, estimate server tick |
| `cmdr` | `id`, `text` | answer to `cmd` | resolve `T.cmd`, show in chat |
| `stepped` | `tick` | manual clock: after the requested steps and after every message they produced | resolve `T.step` |
| `saved` | `ok`, `seq`, `err?` (`seq`: this player's `ackSeq` at the instant the saved state was taken) | after every commit on local transports; on a server only failures are announced, as a toast to everyone | HUD "Saved" mark, or the "Save failed" toast; `session.unsaved` is true while the last `seq` sent is greater than the last `saved.seq` (8.2) |

Wire forms: a slot is `0` (empty), `[k, n]` or `[k, n, m]`, with `k` the item key and `m` the modifier key,
both strings (`slotWire`, `wireSlot` in `net/protocol.ts`). An item key that stands alone (`PlayerInfo.held`,
`armor`) is `''` for none. `event` in `welcome` is `{a, k, g}`, the fields of the `event` message.
`open` also carries the container's cell (`x`, `y`, `z`) for as long as the one-thread build of stage 1 reads
it (D21 (f)); a client built on `st.box` ignores it.
`InvWire = {s: Slot[36], a: Slot[3], c: Slot[5], g: Slot[9], cur: Slot, sel, coins, seed, attr: [str, agi, vit, arc], pts}`.
`BoxWire = {kind: 'chest', x, y, z, s: Slot[27]} | {kind: 'forge', x, y, z, s: Slot[3], burn, burnMax, prog, need, level} | {kind: 'shop', npc, sold: [id, Slot, price][]}`.

### 4.4 Snapshot (host to client, binary, type 1)

Sent every `SNAP_EVERY` ticks per connection, staggered (`(tick + conn.id) % SNAP_EVERY === 0`).
Positions are relative to an origin near the receiving player so they fit 16 bits.

Header, 26 bytes

| Offset | Size | Type | Field |
| --- | --- | --- | --- |
| 0 | 1 | u8 | type = 1 |
| 1 | 1 | u8 | self flags: bit 0 dead, bit 1 loading, bit 2 sleeping |
| 2 | 4 | u32 | `tick` at which the state was sampled |
| 6 | 2 | u16 | `ackMove`: `seq` of the last movement message applied |
| 8 | 1 | u8 | `tp`: the player's current teleport id |
| 9 | 1 | u8 | `hunger` (0..20, `ceil`) |
| 10 | 4 | i32 | `ox` = `floor(self.x / 16) * 16` |
| 14 | 4 | i32 | `oz` = `floor(self.z / 16) * 16` |
| 18 | 2 | u16 | `hp10` = `min(65535, ceil(hp * 10))` |
| 20 | 2 | u16 | `mana10` = `min(65535, floor(mana * 10))` |
| 22 | 1 | u8 | `nPlayers` |
| 23 | 1 | u8 | reserved, 0 |
| 24 | 2 | u16 | `nMobs` |

Then `nPlayers` player records, then `nMobs` creature records.

Player record, 14 bytes (other players only)

| Offset | Size | Type | Field |
| --- | --- | --- | --- |
| 0 | 1 | u8 | `slot` |
| 1 | 2 | i16 | `round((x - ox) * 32)` |
| 3 | 2 | u16 | `clamp(round((y + 64) * 32), 0, 65535)` |
| 5 | 2 | i16 | `round((z - oz) * 32)` |
| 7 | 2 | u16 | yaw: `round(yaw / (2 * PI) * 65536) & 0xffff` |
| 9 | 1 | i8 | pitch: `round(pitch / 1.5708 * 127)` |
| 10 | 2 | u16 | flags: bit 0 onGround, 1 sprinting, 2 sneaking, 3 flying, 4 inWater, 5 dead, 6 sleeping, 7 digging, 8-9 `swingSeq` (2-bit counter, +1 per swing or attack), 10 hurt, 11 loading, 12 `tpToggle` (flips on every teleport: snap, do not interpolate), 13 usingItem, 14 away (stalled, 7.9: the name tag shows it) |
| 12 | 1 | u8 | `ceil(hp / maxHp * 255)` |
| 13 | 1 | u8 | dig progress: `floor(progress * 255)`, 0 when not digging (progress = `min(1, (tick - p.dig.t0) * STEP / p.dig.bt)`; for the cracks other players see, nothing is validated with it) |

Creature record, 11 bytes, plus 24 when flag bit 4 is set

| Offset | Size | Type | Field |
| --- | --- | --- | --- |
| 0 | 2 | u16 | `id` (1..65535; `MobSim` skips ids still in use when its counter wraps) |
| 2 | 1 | u8 | `def`: index in `MOB_LIST` (assert `MOB_LIST.length <= 255` at start) |
| 3 | 1 | u8 | flags: bit 0 onGround, 1 hurt (`m.hurt > 0`), 2 atk (`m.atk > 0`), 3 flee (`m.flee > 0`), 4 boss extension follows, 5 `tpToggle`, 6 talk (`m.talk > 0`), 7 fresh (`m.age < 0.25`) |
| 4 | 2 | i16 | `round((x - ox) * 32)` |
| 6 | 2 | u16 | `clamp(round((y + 64) * 32), 0, 65535)` |
| 8 | 2 | i16 | `round((z - oz) * 32)` |
| 10 | 1 | u8 | yaw: `round(yaw / (2 * PI) * 256) & 255` |

Boss extension, 24 bytes

| Offset | Size | Type | Field |
| --- | --- | --- | --- |
| 0 | 4 | u32 | `ceil(hp)` |
| 4 | 4 | u32 | `maxHp` |
| 8 | 1 | u8 | `phase` |
| 9 | 1 | u8 | `kind`: 0 none, 1 charge, 2 slam, 3 volley, 4 spiral, 5 rain, 6 ring, 7 summon, 8 teleport, 9 beam, 10 burrow; bit 7 set while an attack is running (`b.atk !== null`) |
| 10 | 1 | u8 | `wind * 255` |
| 11 | 1 | u8 | `strike * 255` |
| 12 | 1 | u8 | `pose * 255` |
| 13 | 1 | u8 | `aim * 255` |
| 14 | 1 | u8 | `rage * 255` |
| 15 | 1 | u8 | `m.open * 255` |
| 16 | 1 | u8 | `m.scale * 255` |
| 17 | 1 | i8 | `b.pitch / 1.5708 * 127` |
| 18 | 1 | i8 | `b.roll / 1.5708 * 127` |
| 19 | 3 | i8 x 3 | `b.ax`, `b.ay`, `b.az`, each `* 127` |
| 22 | 1 | u8 | `min(255, floor(m.age * 10))` |
| 23 | 1 | u8 | `b.fxm`: the continuous emitters that ran this tick (`FXM` bits of `sim/boss.ts`: 1 telegraph, 2 sight, 4 chargeDust, 8 weaveDust, 16 burrowDust) |

The fractions (`wind` to `scale`) are rounded to the nearest of 255 steps and the signed ones to the nearest
of 127. `net/protocol.ts` names the kinds (`BOSS_KINDS`) and every flag bit (`SELF_`, `PF_`, `MF_`, `MV_`).
A player counts as `hurt` for 0.22 s after `hurtTick` and its `tpToggle` is bit 0 of `p.tp`; a creature's
`tpToggle` is bit 0 of `m.tpn`.

Quantisation error: position 1/64 block, creature yaw 0.7 degrees, player yaw 0.003 degrees.
A position more than 1,023 blocks from the origin cannot be encoded: such entities are outside every
interest radius and are never written.

Client: keep the last 32 snapshots per entity keyed by `tick`. Render time in ticks is
`serverTickEstimate - delay`, where the estimate comes from `rtt` replies and snapshot arrivals
(smoothed, never running backwards) and `delay = clamp(2 * SNAP_EVERY + jitter, INTERP_MIN, INTERP_MAX)`
with `jitter` the 95th percentile of snapshot inter-arrival deviation over the last 2 s, in ticks. On
local transports `delay = 4`. Position: linear between the two bracketing samples; past the newest
sample extrapolate with the last velocity for at most 6 ticks, then hold. Yaw: shortest arc. A changed
`tpToggle` snaps. An entity absent from two consecutive snapshots is removed from the view (no corpse);
a death is announced by fx `md`.

### 4.5 Movement (client to host, binary, type 2) and its validation

Sent every `MOVE_EVERY` ticks whenever the client is not on a loading screen (also while dead, frozen,
sleeping or with a window open: the stream is the host's liveness signal, 7.9), plus immediately on
landing and on entering or leaving a liquid, plus the forced send below. 36 bytes.

| Offset | Size | Type | Field |
| --- | --- | --- | --- |
| 0 | 1 | u8 | type = 2 |
| 1 | 2 | u16 | `seq` (wraps) |
| 3 | 1 | u8 | `tp`: last teleport id the client has applied |
| 4 | 8 | f64 | `x` |
| 12 | 4 | f32 | `y` |
| 16 | 8 | f64 | `z` |
| 24 | 6 | i16 x 3 | velocity `* 256`, clamped |
| 30 | 2 | u16 | yaw, as in the snapshot player record |
| 32 | 2 | i16 | pitch: `round(pitch / 1.5708 * 32767)` |
| 34 | 2 | u16 | flags: bit 0 onGround, 1 sprinting, 2 sneaking, 3 flying, 4 inWater, 5 headInWater, 6 inLava, 7 jumped since the last message, 8 usingItem, 9 uiOpen (any window open on the client, Inventory and Guide included) |

Forced send: an action is judged from where the client acted. Every action message (`edit`, `use`,
`talk`, `item`, `atk`, `fire`, `dig`, `ping`) leaves through `session.act(m)`, which sends, in this
order: a `move` if position, look or flags differ from the last `move` sent; the pending hotbar
selection as a `sel` op if there is one (5.3); then `m`. (For a sequenced `m` the selection has left
already, in front of the `move`: it was sent when `m` took its `seq`, 3.8. The host only needs both
in front of `m`.) The host applies them in that order, so reach,
the body-overlap test of a placement, the origin of a shot and the held item are all tested against
the state the client used, on every transport and at any latency. (Without this a block placed under
your own feet during a jump is tested against a body 1 to 3 ticks old that still overlaps the cell, and
is refused every time.) `y` travels as f32: a value at or above an integer never rounds below it, so a
body that has cleared a cell on the client has cleared it on the host.

`movement.ts`, in order:

1. `p.lastMoveTick = tick`. Then drop the message if `tp !== p.tp`, or the player is loading, dead, or arriving.
2. Finite numbers, `-64 <= y <= 400`, `|x|, |z| <= 500000`, else correct.
3. Speed. `p.speedBudget` (blocks) refills at `maxSpeed(p) * 1.25` per second of sim time since the last
   accepted move, capped at 1.5 s worth, plus 2 blocks of slack after a `hurt` with knockback.
   `maxSpeed(p)` = 24 when flying is allowed (`flightAllowed(p)`, 3.3); otherwise `SPRINT * (1 + d.speed) * max(1, 1 + d.swim) + 1.2`.
   The message's `flying` flag counts, here and in steps 6 and 7, only while flying is allowed: from a
   player who may not fly it reads as not set.
   Horizontal distance moved is taken from the budget; a move the budget cannot pay is a failure.
   Vertical: a rise of more than `JUMP_V * sqrt(1 + d.jump) + 2` blocks within any 1 s window is a
   failure unless flying, in liquid, or within 1 s of a `hurt`. Falling is not limited.
4. Space. If the destination chunk is a ready sim chunk: `boxFree(realm, x - hw + 0.05, y + 0.05, z - hw + 0.05, x + hw - 0.05, y + h - 0.05, z + hw - 0.05)`
   must hold, and a `raycast` (solid only) from the previous body centre to the new one must not hit.
   If the chunk is not ready the move is accepted unchecked.
   Embedded bodies. Blocks can come to overlap a body that did nothing wrong: a wall built through the
   spot where someone logged off, a door shut on a doorway, a gate or landing platform raised over a
   player. The client can walk out (`clip` in `physics.ts` ignores boxes it already overlaps), so the host
   must let it. When the space test fails, the host tests the same shrunk box at the stored position.
   If that is free the move failed normally (step 5). If it is not, `p.embedded = {x, y, z, t: tick}` at
   the stored position, and while `embedded` is set the space test is replaced by: the destination is
   within 3 blocks of the embedded point. The first accepted move whose destination box is free clears
   `embedded`. A body still embedded 3 s after `t` is moved by the sim to `freeSpot` (below) with a `tp`.
5. On failure: keep the old position, `p.tp = (p.tp + 1) & 255`, send `tp {load: false}` to the last
   valid position. Log the reason at `info` (the soak counts these).
6. On success: store position, velocity, look and the client's flags `sprinting sneaking flying usingItem uiOpen`.
   The sim computes for itself: `grounded` (`!boxFree` of the body moved down 0.08), `inWater`,
   `headInWater`, `inLava` (the block tests of `Player.tick`).
7. Fall distance: `fallPeak = max(fallPeak, y)` while airborne; reset to `y` when grounded, in liquid,
   flying, embedded or teleported. On the transition to grounded: `landed = fallPeak - y`; the rule of today's
   `Game.tick` applies (`landed > 3.6`, not `noFall`, not creative: `damage((landed - 3) * 5.5, true)`).
8. `p.safe` is updated when grounded and not embedded.

Putting a body somewhere. Whenever the sim itself chooses where a player stands (first join, resume
after a disconnect, respawn beside a bed, recall, a portal return, `land()`, cheat `tp`), the position is
checked when the player is about to turn active, with its sim chunks ready: if the shrunk box of step 4
is not free, the player is moved to `rules.ts freeSpot(w, x, y, z)`, the nearest position where it is
(cell centres within 4 blocks, nearest first, standing on something solid preferred; else straight up
to the first free space), and the `tp` that announces activation carries that position.

Hazards (lava every 0.5 s, damaging blocks, the void rule per realm, starvation) are today's code in
`Game.tick`, run per active player in `sim/player.ts` on the stored position. Exhaustion uses the
client's `sprinting` flag.

### 4.6 fx events

`fx.l` is an array of tuples; element 0 is the code. Scopes are resolved by the host; `k` (shake)
arrives already scaled for the recipient.

| Code | Tuple | Meaning and scope |
| --- | --- | --- |
| `s` | `['s', name, vol, pitch, x?, y?, z?]` | `audio.play(name, vol, pitch, at)`. Positional sounds go to players within 40 blocks. |
| `p` | `['p', kind, x, y, z, a, c]` | Particle burst (table below), players within 64 blocks. |
| `f` | `['f', x, y, z, text, color, big]` | Floating text, players within 32 blocks. |
| `t` | `['t', text, color]` | Toast. |
| `n` | `['n', title, sub, color]` | Banner. |
| `k` | `['k', amount]` | Camera shake. |
| `h` | `['h', crit]` | Crosshair hit mark, to the attacker. |
| `u` | `['u', key, n, total]` | Pickup line, to the picker. |
| `ps` | `['ps', id, kind, x, y, z, vx, vy, vz, life, flags, cseq]` | A projectile this client did not know: its position, velocity and remaining life in seconds now. `kind` indexes `Object.keys(PROJECTILES)`. `flags` bit 0: fired by a player. `cseq`: the `fire.seq` that caused it, for the shooter only, else 0. Sent at the spawn to every connection whose player is within `PROJ_R` of it, and afterwards, by the 10 Hz interest sweep (6.4), to any connection whose player has come within `PROJ_R` of a live projectile it has not been told about: a player walking into a fight has every projectile that can hit them. |
| `pe` | `['pe', id, x, y, z, how]` | Projectile ended: 0 expired or withdrawn, 1 terrain, 2 hit. To every connection that was sent its `ps`. The client also ends a projectile by itself when its life runs out. |
| `da` | `['da', id, k, n, m, x, y, z, vx, vy, vz, delay]` | Drop entered this client's interest (`DROP_R`), or spawned inside it: item key, count, modifier key (`''` for none), position and velocity now, seconds until it can be picked up. Owned drops go to their owner only. |
| `dn` | `['dn', id, n]` | Drop count changed (merge, partial pickup). |
| `dd` | `['dd', id, slot]` | Drop gone: picked by `slot` (fly to that player), 0 = expired, given up by a full pool, or out of interest (`DROP_R_OUT`). A stack that folds into a drop lying nearby never becomes a drop of its own: the one it joined says `dn`. |
| `md` | `['md', id, how]` | Creature removed: 0 despawned, 1 killed (play the corpse), 2 boss withdrew. |
| `mk` | `['mk', id, x, z, t, x, z, t, ...]` | Rain marks of boss `id`: positions and seconds until each strike. |
| `dg` | `['dg', slot, on, x, y, z]` | Another player started or stopped digging a block. |
| `pg` | `['pg', slot, x, y, z]` | Ping, whole realm, shown 8 s in the world and on the compass. |

Burst kinds (`client/fxplay.ts` owns the loops; counts and velocities are today's)

| Kind | `a`, `c` | Today's code |
| --- | --- | --- |
| 1 block break | block id | `Game.burst` (18 particles) |
| 2 creature hit | def index | `MobSystem.hurt` (6) |
| 3 puff | count, colour | minion summon (14), nest spawn (14), boss `summon` adds (8) |
| 4 boss summoned | def index | `trySummon` (60) |
| 5 boss death | def index | `onMobKilled` (120) |
| 6 boss phase | def index | `bossTick` phase change (40) |
| 7 slam ring | radius | `slam` (48 on a ring) |
| 8 eruption | 0 | `burrow` (40) |
| 9 teleport flash | height | boss `teleport` (24) |
| 10 footfall | half-width | boss stomp (8) |
| 11 forge smoke | 0 | `tickForge` (at most 2 per second per lit forge, players within 16 blocks) |

Continuous emitters are not events. The client derives them from replicated state every frame, with
the probabilities of today's code: boss entrance dust (`age < 1.4`, walking or burrowing), telegraph
motes (`wind > 0` during wind-up, colour by `kind`), the beam sight line (`kind` 9 and `wind < 1`, along
`ax ay az`), charge and burrow dust, rain mark flicker (from `mk`), projectile trails and impact puffs
(from `ps` / `pe`), shade smoke (a `gloomshade` or `moonspawn` with the hurt flag in daylight), splash
and footsteps of other players, dig particles of other players.

### 4.7 Chunks and block edits

Names. The client's per-chunk edit revision is `editRev`, a field of the `ClientVoxels` chunk record.
It is not `Chunk.rev` of today's `world.ts`, which `markDirty` bumps for every remesh, neighbours
included; that counter has no reader and is deleted in stage 2 (lane B).

Subscription, client side (`ClientVoxels` + `World`)

1. When `World` creates a chunk record it starts generation and queues `(cx, cz, n)` for the next
   `chunks.sub`, where `n` is a fresh nonce from one client-wide u16 counter, stored on the record as
   `subN`. When it drops a record it queues `(cx, cz)` for `chunks.unsub` (and removes a still-queued
   sub). The queue is flushed at most once per 100 ms of wall time, from `runFrame`, as one `chunks`
   message of at most 1,024 `sub` and 1,024 `unsub` entries; what does not fit waits for the next
   flush. A dimension change or reconnect sends nothing: the host drops all
   subscriptions of a connection when its player changes realm or is bound again.
2. `ce` entry `[cx, cz, n, rev, gh, enc?, data?]`. An entry is dropped unless a record for `(cx, cz)`
   exists and `n === record.subN`: answers to an earlier subscription of the same chunk are stale.
   `enc 0`: base64 of `k * 3` bytes, each `index u16 LE, id u8`. `enc 1`: base64 of RLE pairs
   `(id, count 1..255)` covering all 65,536 cells in index order. `rev === 0` entries carry no `enc`
   and no `data`. `gh` is `ChunkEdits.genHash` (0 = unknown).
3. Readiness. A chunk is ready when its generation result and the `ce` entry of its current
   subscription have both arrived, in either order. On readiness: apply the edit set to the generated
   array, `editRev = rev`, then apply queued live changes with `rev > editRev` in arrival order (each
   sets `editRev`). Only then may it be meshed or stood on.
   A `ce` entry with the current nonce for a chunk that is already ready is the answer to `chunks.full`
   (rule 6): replace the whole block array with the decoded one and set `editRev = rev`.
4. Live change `b`: for each `x, y, z, id, rev`: no record for the chunk: ignore. Record not ready:
   queue. `rev <= editRev`: ignore. `rev > editRev + 1`: a change was missed, resync the chunk (rule 7).
   Else write the cell and set `editRev = rev`.
5. Every write of cells that does not come from the generator (an edit set, a full array, a live
   change, a prediction, a `rej`) goes through one function, `ClientVoxels.write(chunk, i, id)`, which
   sets `chunk.hasEmit = true` when `T_EMITS[id]` (the lighting pass only seeds emitters in chunks whose
   `hasEmit` is set; without this a torch placed in a chunk with no generated emitter is dark after a
   rejoin and for every other player) and calls `onCellChange(x, y, z, old, id)`, on which `World` marks
   the chunk and the neighbours within light reach dirty exactly as today's `setBlock` does. Replacing
   a whole array recomputes `hasEmit` by scanning it.
6. Generation check. If `gh !== 0` and it differs from the hash of the client's own generation, the
   client queues the chunk in `chunks.full`. The host answers only for chunks it holds as ready sim
   chunks (never generating on request), at most 8 per second per connection, with a `ce` entry of
   `enc 1` holding its full array, the current nonce and `gh = 0`. A request it does not serve is
   ignored; the client repeats it every 5 s while the mismatch stands and the chunk is within
   `cfg.simRadius + 1` chunks of the player (where the host must have it), and whenever a `gh` for it
   arrives. When the host first generates a chunk that already has subscribers it sends `gh`.
7. Resync of one chunk: clear its predictions, give the record a new nonce, mark it not ready, start
   generation again and queue it in `chunks.sub` (no `unsub`). Also done by a timer: a record whose `ce`
   has not arrived 15 s after its sub was sent is subscribed again with a new nonce. This is the safety
   net for any subscription the host ignored (out of range, below).

Subscription, host side (`ChunkService`)

- Within one `chunks` message `unsub` is applied before `sub`, then `full`.
- A `sub` is accepted when `dim` is the player's realm and the chunk is within `viewMax + 4` chunks
  (Chebyshev) of the chunk of the stored position; otherwise it is ignored. Accepting records
  `subs[key] = n` (replacing an older nonce, and making the chunk "wanted" again even if its `ce` was
  already sent) and queues the chunk, nearest to the player first.
- Per tick and connection the host starts at most 64 `EditStore.load` calls (never more than 256 in
  flight). A loaded chunk whose subscription still has the same nonce becomes sendable.
- Sending is paced by bytes: in each flush, sendable chunks go out nearest first as one `ce` message
  until `CE_BYTES` (32 KB; 256 KB on local transports) are used, and only while `conn.buffered` is under
  128 KB. The rest wait in the host's queue, as references, not as bytes in the socket: the backlog of a
  large base therefore cannot trip the 4 MB rule (6.3) and cannot sit in front of `hurt`, `tp` or `st`.
  The chunks around the player go first, so the loading screen clears long before the horizon arrives.
- The entry is encoded when it is sent, and the connection joins the chunk's subscriber set in that same
  flush. Changes before it are inside `rev`; changes after it arrive as `b`. The encoded string is cached
  on the `ChunkEdits` per `rev` and reused for every subscriber.
- Once per second the host drops subscriptions more than `viewMax + 6` chunks from the stored position.
  A client keeps records within its view + 3 (`World.unloadFar`), and clamps its view to `cfg.viewMax`,
  so this only removes what the client has dropped or is about to; it is what bounds a connection to
  `(2 * (viewMax + 6) + 1)^2` subscriptions (1,369 at 12) without trusting its `unsub` messages.

Predicted edits

- Break: when `Interact` reports the block broken, `client/blocks.ts` writes air (and the other half of
  a door), plays burst 1 and the break sound, records `predicted[cell] = seq`, sends
  `edit {k: 0, id: <the id it broke>}`. Drops, flags, block entities, cascades and gate collapse come
  from the host.
- Place: the target cell is computed as in `Game.place` (replaceable target, else the face neighbour).
  The client checks what it can (`T_REPLACE`, its own body, bodies it sees, support, height), writes
  the block, queues the internal op `_held {n: 1}` under the same `seq`, sends `edit {k: 1, id}`.
- Door item: `edit {k: 2}` with the lower cell and the door id chosen from the view direction; both
  cells predicted. Door toggle: `use`, both cells predicted.
- Everything else (gate kits, altars, beds, berries, crates, chests, stations, forges) is not predicted.
- Every predicted `seq` gets exactly one answer: the `b` of the accepted change (which clears the
  prediction of that cell) or a `rej`. A `rej` with cells writes the true ids and drops the predictions
  of that `seq`; a `rej` with no cells resyncs every chunk that holds a prediction of that `seq` (rule 7).

Host validation of `edit`. If the player is not active and alive, or `y` is outside `1..BUILD_MAX`, or
the cell is not in a ready sim chunk (the host has no array to read the truth from), or the message was
over its rate cap: `rej {seq, cells: []}`. Otherwise all of the following must hold, else `rej` with the
true ids of the touched cells:

- Reach: distance from the stored eye position to the nearest point of the cell is at most `reach(p) + 1.5`.
- Break: the cell holds `id`; `hard >= 0` or creative; and the dig budget covers it.
  Dig budget. Time is not measured between the arrival of `dig` and of `edit`: one stalled segment
  delivers both together and would refuse an honest break. Instead `p.digCredit` (seconds) grows by `dt`
  on every step while the player is active, up to `DIG_SURPLUS + need(p.dig)`, where
  `need(d) = max(0, 0.8 * d.bt - 0.1)` and `need(null) = 0`. `d.bt` is the smallest
  `breakTimeMin(id, p)` seen while that dig was set: evaluated at `dig on`, after every op that changes
  the held stack, and at the `edit`. `breakTimeMin` is `rules.breakTime` with the body taken as grounded
  and out of water: the client integrates progress tick by tick while its flags change (a hop at the
  end of a dig, a head dipping under water), and the host's copy of those flags is up to 50 ms old, so
  the host holds the player only to the fastest time those flags allow. An `edit` is accepted when
  `digCredit >= need`, with `bt` from `p.dig` if it names this cell and from `breakTimeMin` now if it
  does not; then `digCredit -= need` and `p.dig = null`. Over any stretch of play the break time a
  client can spend is the time that passed plus `DIG_SURPLUS`. A `dig` held back by up to
  `DIG_SURPLUS + 0.2 * bt + 0.1` seconds costs nothing. What this gives up: a modified client can skip
  the airborne (2.5 x) and underwater (4 x) penalties.
  Then `actions.breakBlock`.
- Place: the held item's `block === id`; the cell is replaceable; adjacency: the cell holds a replaceable
  block that is neither air nor liquid, or one of its six neighbours holds a block that is not
  replaceable (today the ray hit implies this; without it a refused placement followed by an accepted
  one on top of it leaves a block hanging in the air); today's `Game.place` rules for support and for
  creatures; and, for a solid block, no body of `realm.players` overlaps the cell, in whatever state
  that player is: the placer's own box shrunk by 0.05 on every side (the shrink of 4.5 step 4, so an
  accepted block can never fail the placer's next move), every other box by 0.1. Then `setBlock`,
  consume one unless creative, guest-bed registration, `place:<key>` flag.
- Door: today's `placeDoor` rules.

`use` is validated the same way (active, ready sim chunk, reach, the cell holds `id`) and answered with
`rej` on refusal. A door toggle is not tested against bodies, as today; a player it closes on is
embedded and walks out (4.5).

Two players, one block: messages are processed in arrival order. The second `edit` finds a different id
in the cell and is refused with the truth.

Other players learn of a change only through `b`. The acting client also receives the `b` for its own
edit; it is idempotent.

### 4.8 Resync

- Position: any `tp`. With `load` the client reloads its surroundings before moving again.
- One chunk: rule 7 of 4.7 (new nonce, regenerate, subscribe again), or `chunks.full`.
- Inventory and container: every `st` is a full replacement of what it carries.
- Everything: reconnect. The client sends `hello` again; `welcome` resets every mirror; the client
  clears `World`, `EntityStore`, pending ops, predictions and subscriptions and loads as on first join.

---

## 5. Inventory and container ops

### 5.1 State and addressing

```ts
// src/sim/invops.ts
export type SlotRef = [c: 0 | 1 | 2 | 3 | 4, i: number];
//  c = 0 inv.slots (0..35)   1 inv.armor (0..2)   2 inv.acc (0..4)   3 inv.craft (0..8)
//  c = 4 the open container: chest 0..26; forge 0 ore, 1 fuel, 2 output
export interface OpState {
  inv: Inventory; stats: PlayerStats;
  /** The open chest or forge. Sim: resolved from `window`'s cell for this op (5.2), null if it is gone. Client: `view.box`. */
  box: { kind: 'chest' | 'forge'; s: Slot[]; level?: number } | null;
  window: { mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; npc?: string;
            sold: { id: number; it: Item; price: number }[] } | null;   // null = plain inventory, 2 x 2 grid, station 'hand'
}
export interface OpCtx {
  seq: number;                   // the op's sequence number (names the `sold` entry a sale creates)
  rnd(): number;                 // mulberry32(hashInt(rngSeed, seq, 40503, 0)): identical on both sides
  flags: ReadonlySet<string>;
  drop(it: Item): void;          // sim: actions.dropItem at the player. client: nothing (the drop arrives as fx)
  flag(f: string): void;         // sim: Sim.addFlag. client: nothing
}
export type OpResult = { ok: true; snd?: string; msg?: string } | { ok: false; snd?: string; msg?: string };
export function applyOp(s: OpState, op: InvOp, ctx: OpCtx): OpResult;
```

`applyOp` never throws on bad input; a refused op changes nothing and returns `ok: false`. `e` (expect)
is the item key the client saw in the addressed slot (`''` = empty); the sim refuses an op whose `e`
does not match, so an op never acts on a stack the player did not see. Everything `applyOp` can change
is replicated in `st` (5.3): the inventory, attributes and points, the open container, the `sold` list.

### 5.2 The ops

Each row replaces the named code and must behave exactly like it.

| `o` | Fields | Replaces (today) | Notes |
| --- | --- | --- | --- |
| `sel` | `i` | hotbar digits and wheel in `Game.tick`; the result of `onDigStart` | `inv.sel = i`, 0..8. Coalesced on the client (`pendingSel`, 5.3): at most one per movement send, and always in front of an action |
| `click` | `v`, `r`, `e` | `Windows.down` without shift on any slot but the craft output | empty cursor: take the stack, or `ceil(n / 2)` when `r`, `n > 1` and the slot is not the forge output. Loaded cursor: `place(v, r)` |
| `place` | `v`, `one` | `Windows.place` reached by dragging: left-drag released on another slot (`one: false`), each slot crossed in a right-drag (`one: true`) | includes `accepts`, single-item rule for armour and trinkets, swap |
| `gather` | none | `Windows.gather` (second click of a double-click; detected by the client) | pack, then the open chest; partial stacks first |
| `quick` | `v`, `e` | `Windows.quickMove` | with a shop open and `v` in the pack: `sell` (the 2.5 s confirmation for precious items stays in the window; only the confirming click sends the op). Chest, forge (`smeltable` / fuel), armour swap, trinket equip, hotbar and pack, container to pack |
| `out` | `all` | `Windows.takeOutput` | modifier rolled with `ctx.rnd`; `craft:<key>` through `ctx.flag` |
| `lay` | `r` | left click in the recipe book (`fillGrid`) | `r` indexes `RECIPES`; the recipe's station must be `hand` or the open station |
| `book` | `r`, `max` | `Windows.craftFromBook` | `max` is 1 or 64 |
| `hotkey` | `v`, `i`, `e` | `Windows.hotkey` | |
| `dropSlot` | `v`, `all`, `e` | `Windows.dropHover` on a slot | |
| `dropCur` | none | `Windows.dropCursor(false)` (click outside the panel; Q with a loaded cursor) | |
| `dropHeld` | `all` | Q in the world (`Game.tick`) | |
| `sort` | `w` | `Windows.sortRange` | `w = 0`: `inv.slots` 9..36. `w = 1`: chest 0..27. The name key of the ordering is `rules.sortCompare`, a code-unit comparison of the item names (`a < b ? -1 : a > b ? 1 : 0`), not today's `localeCompare`, whose order depends on the locale of the machine it runs on and so could differ between a browser and the server |
| `takeAll` | none | `Windows.takeAll` | |
| `stash` | none | `Windows.stashMatching` | |
| `buy` | `k`, `bulk` | `Windows.buy` | price and currency come from `goods(npc, flags)`, never from the message |
| `buyBack` | `id` | `Windows.buyBack` | `id` names an entry of `window.sold` (the `seq` of the sale), not a position: positions shift when the list drops its oldest entry |
| `spend` | `a` | `PlayerStats.spend` | attributes and points are in `InvWire`, so a replayed `spend` starts from the acknowledged values |
| `pick` | `id` | `Game.pickBlock` | the creative branch needs `modes.creative` |
| `tidy` | none | the `returnGrid` and `dropCursor(true)` that `Windows.show('guide')` runs when it covers another window | grid and cursor back to the pack; `window` and `sold` stay |
| `close` | none | `Windows.close`: `returnGrid`, `dropCursor(true)` | then sets `window = null`, clears `sold`, leaves `realm.viewers` |

Internal ops, used only for prediction and never sent as `op`: `_held {n}` (`inv.consumeHeld(n)`, queued
under the `seq` of an `edit` place or door, a gate-kit `item`, a summoning `use`) and `_slot {i, n}`
(one consumable used by `item`, one arrow spent by `fire`).

Opening and closing

- Opening is not an op. Inventory (E) and Guide (G) are client-only. A station opens on the client at
  once and sends `use`; the sim sets `window = {mode: 'station', station, x, y, z}` when it processes it,
  which is before any later op because the stream is ordered. A `rej` for that `use` closes the
  station window again. Chest, forge and shop open when `open` arrives. `st {box: null}` closes
  whichever of the four is open.
- The Guide over another window. Today `Windows.show('guide')` closes the window under it
  (`close(true)`: grid and cursor go back to the pack) and remembers it for Back. If that close were
  sent as op `close`, the sim would forget the station, chest, forge or shop, and Back would reopen a
  window the sim no longer has: every op in it would be refused. So: opening the Guide from a station,
  chest, forge or shop window sends `tidy` (grid and cursor back to the pack, nothing else); the sim's
  `window` and the shop's `sold` list stay. Back (`leaveGuide`) shows the remembered window again from
  the client's still-current view of it and sends nothing. If `st {box: null}` arrives while the Guide
  is up, the client forgets the remembered window and Back leads to the plain inventory. Leaving the
  Guide any other way (Esc, G with nothing to go back to) sends `close`.
- Windows end on the sim, not only on the client. `window` names a container by cell. Before every op
  that touches `[4, i]`, the 3 x 3 grid or a station recipe, and once per second for every open window,
  the sim resolves it again: the cell is in a ready sim chunk; the block there still has the matching
  `use`; for a chest or forge `realm.getEnt(x, y, z)` exists and has that kind; the player's eye is
  within `reach + 2` of the cell (a shop: the townsperson `mob` is alive and within 7 blocks). If any
  of that fails the sim closes the window as op `close` does, sends `st {box: null}`, and refuses the op.
- A container never goes away under a viewer. Any non-silent `setBlock` on a cell, `removeEnt`, and
  `actions.breakBlock` before it spills the contents, first call `realm.closeViewers(x, y, z)`, which
  closes the window of every player in `realm.viewers` for that cell and sends each `st {box: null}`.
  The spilled stacks are therefore the only copies. Removing a townsperson closes the shops open on it.

### 5.3 Reconcile rule

Client state

- `base`: plain data from the last `st`: `base.inv` (an `InvWire`) and `base.box` (a `BoxWire` or null).
  Everything `applyOp` can change is in it: slots, cursor, grid, selection, coins, attributes and points
  (in `InvWire`), container slots, and a shop's `sold` list.
- `pending`: ops sent and not acknowledged, in `seq` order.
- `view`: the live objects the game reads. `view.inv` is `game.inv`; `view.stats` is `game.stats`;
  `view.box` is the client's object for the open container, created when an `st.box` arrives for a cell
  that is not the open one and kept until the window closes: for a chest `{kind: 'chest', x, y, z, s: Slot[27]}`
  (the window is shown with `{chest: view.box.s}`), for a forge
  `{kind: 'forge', x, y, z, data: {s: Slot[3], burn, burnMax, prog, need, level, rev}}` (the shape
  `Windows` reads today, shown with `{forge: view.box}`), for a shop `{kind: 'shop', npc, sold}`.
- `pendingSel`: a hotbar selection made locally and not yet sent (below), or null.

```
local action:  seq = ++nextSeq; pending.push(op); r = applyOp(view, op, ctx(seq)); send; play r.snd / toast r.msg
st arrives:    if st.inv present:  base.inv = st.inv
               if 'box' in st:     base.box = st.box
               drop every pending op with seq <= st.ack
               assignWire(view.inv, base.inv); view.stats.attr / points = base.inv.attr / pts
               assignBox(view.box, base.box)
               for op of pending: applyOp(view, op, ctx(op.seq))            // refusals are silent here
               if (pendingSel !== null) view.inv.sel = pendingSel
               view.inv.touch(); if forge: view.box.data.rev++; stats.recompute(view.inv)
```

- `assignWire(inv, wire)` lives in `sim/inventory.ts`. It copies `s`, `a`, `c`, `g` element by element
  into the existing `inv.slots`, `inv.armor`, `inv.acc` and `inv.craft` arrays and sets `cursor`, `sel`
  and `coins`, with no consolidation. It is not `Inventory.load`: `load` replaces the arrays and moves
  the craft grid and the cursor into the pack (it exists for save files written with a window open),
  which here would empty the grid and the cursor on every snapshot taken mid-craft. `load` is used only
  for `PlayerRecord`.
- Identity. `Windows` captures the arrays themselves when it builds a window (`inv.slots`, `inv.armor`,
  `inv.acc`, `inv.craft`, the chest's `Slot[]`, the forge's `data.s`), and the HUD holds `game.inv`.
  Reconcile therefore never assigns a new array or a new `view.box` for the same cell: `assignBox`
  writes element by element into `view.box.s` (or `view.box.data.s`), copies the forge numbers, and
  rebuilds `sold` in place. Bumping `data.rev` is what makes `Windows.refresh` redraw a forge.
- What `applyOp` changes outside `base` (hp through `spend` on Vitality) is display only on the client
  and is overwritten by the next snapshot header.
- The host sends `st` in the same tick it advanced `ackSeq`, even when nothing changed (`{t: 'st', ack}`),
  so a refused op is corrected within one round trip.
- A container snapshot goes to every viewer in the tick it changed, each with that viewer's own `ack`.
- Hotbar selection. Digits and the wheel change `view.inv.sel` at once and set `pendingSel`; no op is
  sent yet (a spinning wheel would otherwise send 60 ops a second). `pendingSel` is flushed as one `sel`
  op by `session.act` in front of any action (4.5), in front of any other op, and otherwise with the
  next scheduled movement send. So the sim always knows the held item before it judges an action.
- Sold entries are named by `id`, the `seq` of the `quick` op that sold them, which is the same on both
  sides and stable under replay; the list keeps the newest 8.
- On reconnect: `pending = []`, `nextSeq = 0`, `pendingSel = null`.

---

## 6. Timing, interest, bandwidth, CPU

### 6.1 Order inside one step

`SimHost` runs, per step: `drainInboxes()`, then `sim.step()` if `sim.running()` else `sim.prepare()`,
then `flush()`.

`drainInboxes`: connections in join order; each connection's queued messages in arrival order; each is
rate-checked, validated (4.1) and applied at once inside its own `try / catch` (`sim.handle`,
`sim.handleMove`, or the chunk service for `chunks`). Messages of a connection that is no longer bound
to its player are discarded (4.2).

`Sim.step()`:

1. `tick++`.
2. Chunks: `chunks.poll(...)` (3.5); integrate at most 2 finished chunks (the rest wait); once per
   second per realm `SimChunks.update`.
3. Arrivals: every loading player whose client has said `ready` and whose sim chunks within 3 chunks
   are ready (under a manual clock: all its wanted sim chunks, 10.1): `land()` if `arriving >= 0`, the bed check if
   `pendingBed`, the return check if `retCheck` (9), then the position check of 4.5, then a `tp` and the
   player is active.
4. Players, join order, all realms. For every player: stall detection (`tick - lastMoveTick`), the
   linger countdown, parking. For active players only: credits (`actCredit`, `useCredit`, `digCredit`),
   `recallT`, `fullT`, `stats.sync(inv)`, `stats.tick(dt, inv, sprinting)`, hazards (every 0.5 s), void
   rule, portal timer, `deathAt` clearing, the embedded timeout; once per second, re-validation of an
   open window (5.2).
5. Realms 0, 1, 2 whose `players` list is not empty, each: `mobs.tick` (AI, movement, touch damage,
   despawn, then one spawn attempt per active player every 0.35 s), `proj.tick`, `drops.tick`, block
   ticks every 0.25 s (forges and nests in sim chunks within 3 chunks of a player; 24 random ticks per
   player), `fluids.tick`.
6. Shared: `events.tick`, `npcs.tick`, `quests.tick`, `clock += dt / DAY_LENGTH`; once per second: sleep
   check, boss scaling and hold, realm suspension check.
7. Mark replication: `invDirty` -> `st`, `statsDirty` -> `stats` (through `Sink.send`).

This is the order of today's `Game.tick` with "the player" widened to all players.

`Sim.prepare()` is steps 2 and 3 alone. `tick`, the clock, creatures, credits and timers do not move.
`sim.running()` is always true on a server. In solo it is true only while a local player is active, so
the world stands still behind every loading screen (join, dimension crossing, respawn far away), which
is what today's `Game.tick` does by returning while `!ready`, and it is one of the three things the
determinism promise of 10.1 rests on.

`flush`: per connection: queued state messages, `b`, `fx`, the paced `ce`, then the snapshot on its
tick. Between steps, never inside one: `host.save()` when a save is due (8.1).

Clock drivers. Real: a timer loop that accumulates `env.now()` deltas and runs at most 5 steps per
wake (today's cap in `runFrame`); if it falls further behind it drops the backlog and logs. Manual:
steps only on `step {n}` / `stepManual(n)`. The server uses real and never pauses; it stops the timer
when no player is online or lingering and nothing is `unsaved`, and starts it on the next `hello`.
Solo uses real and honours `pause`.

### 6.2 Per realm and shared

| Per realm | Shared by the world |
| --- | --- |
| sim chunks and edit maps, block entities, creatures, bosses, projectiles, drops, fluids queue, block ticks, gates of that realm | clock, PRNG, flags, quest index, world event (Overworld), homes and townsfolk (Overworld), world spawn, gate registry, summons list, credits owed to absent players |

A realm whose `players` list is empty (nobody online or lingering there) holds no creatures,
projectiles, drops or sim chunks and is not ticked. Forges catch up when their chunk is next ticked (`d.at` replay, up to 900 s, as today).

### 6.3 Cadence and backpressure

| What | Rate |
| --- | --- |
| Sim step | 60 Hz |
| Snapshot per connection | 20 Hz, staggered over 3 ticks |
| `fx`, `b`, `st`, other state | the tick they happen |
| `ce` (edit sets) | paced: at most `CE_BYTES` per connection per tick, nearest chunks first (4.7) |
| Movement from each client | 20 Hz, plus edges, plus one in front of every action (4.5) |
| Chunk subscription messages from each client | at most 10 Hz |
| Drop and projectile interest update | 10 Hz |
| `where` | 1 Hz |
| `time` | every 5 s and on jumps |
| `rtt` probe | every 2 s |
| Forge progress to viewers | 5 Hz |

Backpressure (server only), in the order it bites: above 128 KB of `conn.buffered` no `ce` is sent
(they wait in the host's queue, 4.7); above 256 KB that connection's snapshot is skipped this round;
above 4 MB the connection is closed with `slow`. Edit sets are the only bulk data and they are never
in the buffer in bulk, so `slow` means a link that cannot carry the live streams, not a big base: a
reconnect is then a fair answer.

### 6.4 Interest sets

| Data | A connection receives it when |
| --- | --- |
| Other players (snapshot) | same realm, online, within `PLAYER_R` horizontally, not loading (stalled ones stay, flagged `away`) |
| Creatures (snapshot) | same realm, enter within `MOB_R`, leave beyond `MOB_R_OUT`; bosses within 160; own minions always |
| Drops (`da` / `dd`) | same realm, enter within `DROP_R`, leave beyond `DROP_R_OUT`; owned drops only for the owner |
| Projectiles (`ps` / `pe`) | same realm; a per-connection known set. `ps` at the spawn if within `PROJ_R` of it, else when the 10 Hz sweep first finds the player within `PROJ_R` of the live projectile; `pe` to every connection that knows it. The sweep is 600 projectiles x 8 connections of distance tests, 10 times a second |
| Block changes (`b`) | subscribed to the chunk |
| Container (`st.box`) | viewing it |
| fx | by scope |
| Roster, chat, flags, quest, time, event, `where` | always |

### 6.5 Bandwidth per client, 8 players

A snapshot is `26 + 14 x (other players in range) + 11 x (creatures in range) + 24 per boss` bytes, 20
times a second. The creature count is what moves it, and its ceilings come from 7.2 and 7.5:

| Case | Creatures in range | Snapshot | Per second |
| --- | --- | --- | --- |
| Typical: own surroundings | 40 | 564 B | 11.3 kB/s |
| Boss fight, all 8 together (hostile cap 2 x 4.5, passive 41, fish 6, adds 7, minions 8, the boss) | about 75 | 973 B | 19.5 kB/s |
| Raid, all 8 together, no boss (hostile cap (14 + 8) x 4.5 = 99, event creatures up to 29 + difficulty above it, passive 41, fish 6, townsfolk, minions) | about 160 to 200 | 1,884 to 2,324 B | 37.7 to 46.5 kB/s |
| Hard bound: the whole pool of 320 inside `MOB_R` of one player | 320 | 3,644 B | 72.9 kB/s |

| Stream | Typical | Worst (raid row) |
| --- | --- | --- |
| Snapshot | 11.3 kB/s | 38 to 47 kB/s |
| `fx` (hits, sounds, projectiles, drops) | 0.5 to 2 kB/s | 4 to 6 kB/s (spiral 46 projectiles/s, beam 22/s, about 65 B each) |
| `st`: a full `InvWire` (54 slots, attributes; 0.6 to 1.1 kB) after every acknowledged action that changes the pack | 0 while walking or fighting with a sword; 1 to 2 kB/s while mining with pickups | 2.7 to 5 kB/s while placing blocks at the held-button cadence (4.5 per second) or firing a bow |
| `b` and other state | under 0.5 kB/s | 1 kB/s |
| Frame and TCP/IP overhead (about 46 B per packet, 25 to 60 packets/s) | 1.2 to 2.8 kB/s | 2.8 kB/s |
| Down, total | about 15 to 18 kB/s | about 50 to 62 kB/s |
| Up: movement 36 B x 20 Hz (up to 60 Hz on action ticks) + ops | about 2 kB/s with overhead | about 4 kB/s |

Server upstream for 8 clients: about 130 kB/s typical, 400 to 500 kB/s in the raid row (3.2 to 4 Mbit/s),
and 0.7 MB/s at the hard bound. `st` is sent whole on purpose: it costs a building player a few kB/s,
well inside this budget, and it keeps the reconcile rule and resync (4.8) to one case.

Join cost: 600 to 960 chunk subscriptions at view 12; an untouched world answers with about 16 bytes
per chunk (under 16 kB in total); a heavily built base adds 4 base64 characters per edited cell, paced
at `CE_BYTES` per tick behind the 128 KB send-buffer limit (4.7), nearest chunks first. A base with one
million edited cells is 4 MB: about 16 s on a 2 Mbit/s link, during which the player is already playing.

These figures are estimates for sizing. The soak (stage 6) records bytes per stream (snapshot, `fx`,
`st`, `b`, `ce`, other) per connection, and its thresholds are set from those measurements.

### 6.6 CPU and memory budget

Measured for this document (Node 22.18, Apple Silicon, `vite build --ssr` bundle of `src/world/gen`):
Overworld 1.85 ms per chunk, Hollows 0.48 ms, Skyrift 0.25 ms. Assume up to twice that on the Spark
until measured there.

Budget per step on the server with 8 players (16.67 ms available; target mean 5 ms, p99 10 ms):

| Phase | Budget (ms) | Notes |
| --- | --- | --- |
| Inbox decode and apply | 0.4 | 8 x 20 moves/s plus actions |
| Chunk integration | 1.0 | at most 2 chunks per step, edit map applied, heightmaps built |
| Players | 0.2 | |
| Creatures (up to 320) | 2.0 | target selection staggered over 15 ticks |
| Projectiles (up to 600) | 0.8 | one terrain ray and one mob test per projectile |
| Drops (up to 480) | 0.3 | |
| Blocks, fluids, events, townsfolk, quests | 0.3 | |
| Snapshots (2.7 connections per step on average) | 0.4 | about 0.15 ms each |
| fx and state JSON | 0.4 | |
| Total | 5.8 | |

Not on the tick thread: terrain generation (worker pool on the server), file writes. Region
serialisation runs on the tick thread between steps, at most one region per step.

Memory: a sim chunk is 66 KB (blocks, biomes, two heightmaps). 8 players apart: 968 chunks at
`SIM_RADIUS` (64 MB), at most 1,800 with the `SIM_KEEP` ring (119 MB). An edit-map entry costs about
40 bytes in a `Map`. Soak target: RSS under 600 MB, and growth over the last 10 minutes under 5%.

Measurements an implementer must take and record in `docs/multiplayer/MEASUREMENTS.md`:

1. Stage 0: `game.prof` worst values (`world`, `tick`, `render`) over the scripted 20 s flight at view 12,
   on the current build.
2. Every later stage: the same numbers; the sum may not rise by more than 1.0 ms.
3. `SimHost.stats`: per-phase timers (the rows above) as p50 / p95 / p99 / max over the last 3,600 steps,
   printed by `/tickstats` and written by the soak.
4. Stage 4: generation ms per chunk per dimension on the Spark; steps skipped by the real clock.
5. Stage 6: the soak table (section 11).

---

## 7. Co-op rules (exact numbers)

### 7.1 Targeting

- Each creature has `tp: SimPlayer | null`. It is re-chosen every 15 ticks (`(tick + m.id) % 15 === 0`),
  and at once when the creature is hurt by a player.
- Candidates: `realm.targets()` (active, alive, not `modes.hidden`; so never a loading, stalled or
  lingering player) within the archetype's aggro distance (today's `d.aggro ?? 16` or `18`).
- Choice: the nearest in 3D. The current target is kept unless a candidate is closer than 0.75 of its
  distance, or it stopped being a candidate (it stays one out to 1.5 x aggro).
- A creature hurt by player X targets X for 4 s. Passive creatures flee from X.
- Every `dx, dy, dz, dist, d3` in `MobSim.tick` and `bossTick` is taken to `m.tp`. With `tp === null`
  a creature runs its wander branch.
- Despawn uses the distance to the nearest player in `realm.players` (same thresholds: 110, or 56
  after 40 s with the random roll), so creatures around a stalled or lingering player stay.
- Touch damage and boss area checks (slam radius, charge and burrow overlap, contact) test every target
  within 4 blocks of the creature, not only `m.tp`. A slam hits each player once.
- Hostile projectiles test every target of the realm near their segment. Projectiles fired by
  players never hit players. There is no player-versus-player damage.
- Minions belong to `m.owner` (a record id): they follow and defend the owner, count against the
  owner's `d.minions`, idle in place while the owner is stalled or lingering, and vanish when the owner
  dies, leaves the realm or is parked.
- Townsfolk face the player who is trading with them (`m.talk`).

### 7.2 Spawning

Every 0.35 s each active, alive player `p` of a realm gets one attempt of today's `trySpawn`, centred
on `p`, with these changes:

- `near = 1 + 0.5 x (other active players within 48 blocks of p)`.
- Hostile cap = `(a boss within 96 blocks ? 2 : 14 + pressure x 8) x near`, counted over hostile
  non-boss creatures within 110 blocks of `p`. Passive cap = `9 x near`, fish cap = 6, same radius.
  (Alone, this is today's rule: every creature is within 110 blocks of the only player.)
- Realm caps: 160 hostile, 120 passive; pool 320.
- The spawn cell must be at least 20 blocks from every player.
- Light tests use 7.8. Safe zones, biome, time, flag and event rules are unchanged.

### 7.3 Combat

Cadence is a budget, not an interval. The client paces itself with its own `atkCd` and `useCd`, exactly
as today, and sends each swing or shot when it makes it. Arrival times are not swing times: jitter
moves each message by tens of milliseconds and a stalled segment delivers several at once, so an
interval measured on arrival refuses honest swings. The sim keeps two credits per player, in seconds:

- `actCredit` grows by `dt` per step while the player is active, capped at `ACT_SURPLUS + cost`, where
  `cost` is the cooldown the next action would set: `1 / attackRate(p)` for melee, ranged and magic with
  the held weapon, 0.6 for a summon (today's `atkCd = 0.6`). An `atk` or `fire` is accepted when
  `actCredit >= cost`; then `actCredit -= cost`.
- `useCredit` works the same way for consumables with `cost = 0.35` (today's `useCd`).

A steady stream at the weapon's rate keeps the credit level; messages may bunch by up to `ACT_SURPLUS`
(0.5 s) without loss; over any stretch the number of accepted swings is what the weapon's rate allows
plus that surplus. Because a swing costs its own cooldown, switching weapons gains nothing.

Melee (`atk`): the client plays the swing at once. The sim accepts when the credit covers it; the
creature is active and not a townsperson or minion; and the distance from the stored eye position
(fresh: 4.5, forced send) to the creature's nearest hit volume (box, boss head, serpent segments) is at
most `weaponReach + d.reach x 0.5 + 1.0 + v x (p.rtt / 2 + 0.15)`, with `v = min(20, max(speed of the creature, def.speed))`.
Then crit and damage are rolled with `sim.rnd` by today's formula,
`mobs.hurt(m, dmg, d.x, d.z, knock, crit, p)`, fx `h` to the attacker, `exhaustion += 0.03`.
A refused attack sends nothing: the client showed a swing that missed.

Head volume. `rayHitMobs` places a boss's head with the eased yaw `ry`, as `MobSystem.rayHit` does today.
The sim keeps `ry` on `Mob` and eases it in `MobSim.tick` with today's rates (and snaps it where
`boss.ts` does); the client's `MobView` eases its own `ry` from the replicated yaw. Each side tests the
head where that side has it: the client where the player sees it, the sim where its projectiles are.
The lag term of the reach test covers the difference.

Ranged, magic, summon (`fire`): the same credit; ranged needs an arrow (`findTagged('arrow')`, one
consumed), magic and summon need mana. A refused `fire` still advances `ackSeq`, so the `st` that
follows restores the predicted arrow. Origin: the client's `o` if within 2 blocks of the stored eye
position, else the stored one. The projectile is spawned and then advanced by `min(p.rtt / 2, 0.15)`
seconds in `STEP` increments with full hit testing. The shooter draws a local ghost projectile on the
click and replaces it with the real one when the `ps` carrying its `cseq` arrives (the ghost is removed
after 0.5 s if none does).

Damage to players: `hurtPlayer(p, ...)` is today's code per player (dodge, armour, thorns, knockback
resistance, death), and does nothing to a player that is not active. The client applies knockback on
`hurt`. The sim adds 2 blocks to `speedBudget`.

### 7.4 Loot, coins, experience

Everything here is keyed by record id. A slot is a session handle that is handed to the next player who
joins once its owner is parked; a share recorded under a slot would be paid to a stranger.

- `m.hitBy: Map<record id, damage>` (minion damage and thorns count for the owner).
- Eligible on death: every id in `hitBy`; for a boss also every participant (7.9) and every active
  player within 64 blocks of the boss or its altar.
- Each eligible player gets, rolled separately with that player's luck: full experience
  (`gainXp`), a coin roll (into their purse, with the floater), and a roll of the drop table. Items
  spawn as drops owned by that player (`Drop.owner = id`), visible to and collectable by that player
  only, living 300 s. Boss loot appears at the owner (or at `owner.safe`, by today's mid-air rule).
- An eligible id that is in `sim.players` but not active (lingering, stalled, parked, loading) gets
  experience and coins on its `SimPlayer` and the items in its `mail`.
- An eligible id that is not in `sim.players` (parked and evicted) gets
  `shared.owed[id] = {xp, coins, items}`, added to what is already there. It sits in the world record,
  so it is saved in the same commit as the `boss:n` flag, and `join` pays it out (experience through
  `gainXp`, coins to the purse, items to `mail`). The sim never loads a player record by itself.
  The luck used for such a share is 0.
- Owned drops of a player who is parked go to `mail` (36 stacks at most). `mail` is delivered into the
  inventory whenever there is room, with the normal pickup line.
- Block drops, thrown items and container spills are shared: first player in reach with room.
- A creature that dies without player damage drops nothing (as the sun-burn path today).
- Chest and crate loot tables are rolled once, by whoever opens or breaks them first, and are shared;
  the coins go to that player.
- Drop pool: 480.

### 7.5 World events

Overworld only. `events.tick` runs while the Overworld has an online player; when it empties, a
running event ends as lost. Dusk and dawn rolls are unchanged. With `n` = players in the Overworld
when the event starts: goal = today's goal `x (1 + 0.5 x (n - 1))`, rounded; live event creatures cap =
`8 + difficulty + 3 x (n - 1)`. Each wave is centred on a random active Overworld player. On a win
every online player in the Overworld receives the full reward (coins, experience, tokens).

### 7.6 Journal and codex

- One shared `quest` index. A step is done when: its flag is set (flags are shared); or, for `craft:`
  steps, today's relaxations hold for any online player; or, for `have` steps, any one online player
  holds the amount (not summed) or `had:<key>` is set; or, for `level` steps, any online player has the level.
- Completion: `had:<key>`, toast and sound to everyone, `gainXp(15 + index x 6)` for every online player.
- The tracker's count and compass line are computed per client from its own inventory and position.
- There is no codex in the code today. What a codex would read (`craft:`, `mine:`, `place:`, `smelt:`,
  `had:`, `boss:`, `dim:`, `npc:`, `event:` flags) is the shared flag set; the recipe-book tabs already
  unlock from it (`Windows.bookTabs`).

### 7.7 Townsfolk

Homes are shared and Overworld only. `met(n)`: flag needs read shared flags; a coin need is met when
any online player carries that many. Move-in checks run only for homes in ready sim chunks.
A resident's body exists exactly while its home's chunk is a ready sim chunk: it is spawned beside the
bed (`standSpot`, which then reads real blocks) when the chunk becomes ready, as today's
`world.ready(h.x, h.z)` test does, and it is removed (fx `md` 0) when that chunk is released. Today's
second condition, a player within 90 blocks, is dropped: the simulation radius (5 chunks, at most 95
blocks) already says the same, and a body kept in a chunk that is no longer simulated would stand
frozen there. Shops are per player: the `sold` list lives in that player's `window`. Stock is
unlimited, as today.

### 7.8 Light without lighting

The sim has no light arrays. Four rules read light today (`mobs.ts:356`, `:398`, `:411`, `:416`). They
read it through `realm.light` (`LightSource`, 3.1), whose stage 2 implementation is these two functions.
In stage 1 `realm.light` still returns the client's real light, so the extraction changes nothing; the
differences in the table below appear at stage 2 and are listed in `MEASUREMENTS.md` when they do.

- `skyApprox(x, y, z)`: over columns within Manhattan distance 8 of `(x, z)`, the best of
  `15 - distance` among columns whose `sky` height (highest opaque block) is below `y`; 0 if none.
- `blockLightApprox(x, y, z)`: over cells within a cube of radius 8, the best of
  `max(light r, g, b) - Manhattan distance` among emitting blocks; 0 if none. Occlusion is ignored.

| Rule (today, in `mobs.ts`) | With the approximation | What changes |
| --- | --- | --- |
| Cave spawns need sky light <= 3 | `skyApprox <= 3` | Walls no longer shade: a sealed room within 8 blocks of open sky counts as lit, so fewer cave spawns inside and beside surface buildings. Cells 9 to 11 blocks from daylight count as dark (real light 4 to 6), so cave spawns begin slightly nearer to cave mouths. |
| Day spawns need sky light >= 11 | `skyApprox >= 11` | Passive creatures can appear under overhangs up to 4 blocks deep even behind a wall. |
| Hostile spawns need block light <= 6 | `blockLightApprox <= 6` | A torch suppresses spawns through walls and floors (8 blocks for a full-strength emitter). Leaves and water no longer dim light. |
| Shades burn at sky light >= 14 by day | `skyApprox >= 14` and `dayAmount(clock, dim) > 0.75` | One block in from an opening still burns, as now. Leaves are not opaque, so shades now burn under a canopy of any depth (today two or more leaf layers protect them). |

The sun-burn test is evaluated every 15 ticks per shade (staggered by id) and its result kept in
between; the damage itself still runs every tick. Housing checks read block definitions (`b.light`),
not light values, and are unchanged.

### 7.9 Bosses, realm lifetime, disconnects

Connection states of a player

```
           hello                ready + sim chunks            no move for 1.5 s
 absent ---------> loading ------------------------> active <==================> stalled
                     ^                                 |          a move             |
                     |                                 | socket closed               | 30 s after the last move the
                     | hello: resume, same SimPlayer   v                             v host closes the socket (`idle`)
                     +--------------------------- lingering (LINGER = 30 s, counted from the last move)
                     |                                 | grace over, or `bye`
                     +--------------------------- parked ---- record durable ----> evicted (absent)
```

- Stalled. Movement is client-owned, so a link that goes silent without closing leaves a body standing
  where it was, and the socket is not known to be dead for seconds. The movement stream is the liveness
  signal instead: a client that is not loading sends `move` 20 times a second whatever it is doing. An
  online, loaded player from whom no `move` has arrived for `STALL_AFTER` (90 ticks, 1.5 s) is `stalled`:
  out of `targets()`, cannot be hurt, no hazards, no hunger. It stays in other players' snapshots with
  flag bit 14 `away`. The next `move` ends it. Thirty seconds after the last move the host closes the
  connection with `idle` and the player is parked at once. Players on local transports never stall.
  A browser tab that is hidden stops its frame loop and therefore stalls; the client reconnects by
  itself when the tab is shown again. (Cost: 1.5 s of silence makes a player safe. Between friends that
  is the better error than a boss killing a frozen body.)
- Lingering (`leave(p, 'drop')`, the socket closed): `online = false`,
  `lingerT = max(0, LINGER - seconds since the last move)`. The player stays in `realm.players` and in
  boss participant sets, leaves snapshots and `targets()`, cannot be hurt; its windows close as by op
  `close`. The slot is kept.
- Parked (grace over, `idle`, or `bye`): removed from `realm.players`; own minions removed; owned drops
  to `mail`; slot freed; `deps.requestSave()`. The `SimPlayer` stays in `sim.players` while `unsaved`,
  and is evicted by the `committed(batch, true)` that makes it durable. Nothing is ever loaded from
  storage for an id that is still in memory, so a quick rejoin cannot read a stale file.
- `hello` for an id in `sim.players` calls `resume`: the same `SimPlayer`, `loading = true`, a new `tp`.
  From lingering it keeps its slot and everything it was part of. From parked it gets a new slot and
  re-enters its realm. Either way the position is checked before activation (4.5).

Bosses

- One live boss per realm (today's `activeBoss()` rule, per realm).
- Summoning consumes the offering, appends `{n, item, by: p.id, dim, altar}` to `shared.summons`, and
  calls `deps.requestSave()`: a full commit (8.1), so the player record without the offering and the
  world record with the entry are written together or not at all.
- Participants (`b.parts: Set<record id>`): the summoner, every active player within 32 blocks at the
  summon, everyone who damages the boss or is damaged by it. A participant stops being one by leaving
  while connected: `bye`, or leaving the realm (a portal, or a death followed by a respawn elsewhere).
  A participant that is parked stays in the set (for its share of the loot, 7.4).
- Valid target: a participant that is active, alive, not hidden and within 80 blocks of the altar.
- Scaling, checked once per second: `n` = the number of active alive players of the realm who are within
  64 blocks of the boss or have damaged it in the last 20 s (`b.hitAt: Map<record id, tick>`), at least 1.
  Distance alone is not enough: valid targets reach out to 80 blocks from the altar and the weakest bow
  carries about 80 blocks (34 blocks/s against gravity 14; better bows further), so archers standing at
  65 blocks would fight a solo boss.
  `maxHp = round(def.hp x (1 + 0.6 x (n - 1)))`, keeping `hp / maxHp`. A rise applies at once; a fall
  applies after `n` has been lower for 10 s. `dmgMul = 1.4 x (1 + 0.1 x (n - 1))`. Attack cooldowns
  (`P.cd`) are divided by `1 + 0.08 x (n - 1)`.
- Target: chosen when an attack is selected: the nearest valid target with probability 0.6, else a
  random other valid target.
- With no valid target the boss holds still (no movement, no attack selection).
  While it holds and at least one participant in its realm is stalled, lingering or loading, it waits
  for them: up to the 30 s of the grace plus their loading, 90 s at most. A fighter whose link drops
  therefore finds the boss where it was. If a participant it is waiting for is parked, the boss notes
  `b.lost = true`; `b.lost` is cleared whenever there is a valid target again.
  When it has had no valid target for 10 s and nobody to wait for, it withdraws (today's "withdraws"
  toast, event adds removed, projectiles cleared).
- Refund rule ("interrupted summoning"): a withdrawal, or the removal of a boss by realm suspension, is
  interrupted if at that moment a participant is stalled or lingering, or `b.lost` is set: that is,
  if the fight is ending because a connection was lost, not because one was ever lost. Then the
  offering goes back to the summoner: into the inventory if that player is active, else into `mail` if
  it is in memory, else into `shared.owed`. Not interrupted, so no refund: a party that wipes or walks
  away while connected; a participant whose link dropped and came back and who later dies; a fight that
  the others carried on, and then lost, after one of them was parked. At host start every entry of
  `shared.summons` is refunded into `shared.owed[by]` and the list is cleared, in one commit.
- Loot of a kill made while a participant is not active: 7.4 (`mail`, or `shared.owed`).

Realm suspension: when `realm.players` is empty (nobody online or lingering there): bosses are removed
(refund rule), creatures, projectiles and drops are cleared (owned drops to `mail`), the fluids queue
is cleared, sim chunks are released. This is what `Game.travel` does to the realm it leaves today.

### 7.10 Sleep, death, beds, cheats

- Bed (`use` on a bed, Overworld): sets `p.bed`. By day: "Spawn point set." At night: refused with
  today's toast if a hostile is within 14 blocks or an event is active; otherwise `p.sleeping = true`.
  Sleeping ends when the player moves 0.3 blocks, is hurt, leaves, or morning comes.
- Night skip, checked on bed use and once per second: let S be the active, alive players in the
  Overworld (a stalled or lingering player neither blocks the night nor is needed for it). If S is not empty and all of S are sleeping: `clock = floor(clock) + 1.02`, each of S gets
  `dawn` for 180 s, banner "Morning" to the Overworld. While only some sleep, a toast names who rests
  and the count. Players in other realms neither block nor skip.
- Death: today's `onDeath` per player (15% of coins, `deathAt`, own minions removed, windows closed).
  The world does not pause. `respawn` runs `stats.respawn()` and `goHome`.
- `goHome(p)`: from another realm, travel to the Overworld first. With a bed: load sim chunks around
  it (`pendingBed`); when ready, the block must still have `use === 'bed'`, else `bed = null`, toast
  "Your bedroll is gone. Returned to the world spawn.", and the world-spawn arrival (`arriving = 0`).
- Breaking a bed block clears `bed` for every player in memory whose bed it was and toasts those online.
- Portal timer: `tickPortal` per active player on the stored position. It does not advance while the
  player has any window open: `p.window !== null || p.uiOpen` (today `this.win.open`, which includes
  the Inventory and the Guide; the sim learns of those two from bit 9 of the move flags).
- Cheats run in the sim (`cmd`). Allowed when the connection is local, or the host was started with
  `--cheats`. They act on the calling player; `time`, `flag`, `event`, `kill` act on the world.
- Flight. `fly` grants flight or takes it back: `modes.fly = body.flying = !body.flying`. `creative`
  toggles `modes.creative`, sets `modes.fly = false` and `body.flying = modes.creative`. The host's
  `body.flying` is overwritten by the next accepted move, so what lasts is `modes`; the client's body
  follows from `stats` (4.3). `modes.fly` is saved with the record like the other modes.
- Chat: `Enter` or `T` opens the line. Text starting with `/` is sent as `cmd`.
- Pings and friends: there is no map in the game today. Pings and friends are shown as world markers
  (HUD tags projected like floaters) and as compass pips; `where` and `pg` carry what a map would need.

---

## 8. Save formats and migration

### 8.1 On disk (server)

```
<data>/
  world.json                      WorldRecord, JSON
  players/<id>.json               PlayerRecord, JSON
  chunks/<dim>/r.<rx>.<rz>.bin    region: 32 x 32 chunks, rx = cx >> 5, rz = cz >> 5
  backups/<YYYYMMDD-HHMMSS>/      world.json, players/, chunks/ as they were
  commit.json                     present only while a commit is being applied
  server.lock                     pid of the running server
```

Region file

```
0      4   "PCR1"
4      4   u32 entry count
8      4   u32 L = byte length of the entries
12     L   entries
12+L   4   u32 CRC-32 of bytes [0, 12+L)
entry: lx u8 (0..31), lz u8, enc u8, pal u16, rev u32, dataLen u32, data[dataLen], entsLen u32, ents[entsLen] (UTF-8 JSON array of BlockEnt)
```

Only chunks with `rev > 0` or stored entities are written. Regions are held in memory while any of
their chunks is subscribed, a sim chunk or `unsaved`, and for 5 minutes after.
`DiskStorage.open()` lists `chunks/<dim>/` once and keeps the set of region names that exist (a commit
that creates a region adds its name). `loadChunk` for a chunk whose region is not in that set returns
null at once, with no file access and no cache entry: most of the world was never edited, and
subscriptions to it must cost nothing.

Commit (one at a time; `Storage.commit`):

1. Write every changed file as `<name>.tmp` and fsync it (whole region files, player files, `world.json`).
2. Write `commit.json.tmp` listing the names, fsync, rename to `commit.json`.
3. Rename each `.tmp` over its target.
4. Delete `commit.json`.

Start-up: take `server.lock` (refuse if a live pid holds it). If `commit.json` exists, finish step 3
for every listed `.tmp` that still exists, then delete it. Otherwise delete stray `.tmp` files.
A crash before step 2 leaves the previous save intact; after step 2 the new save is completed at the
next start. Together with the three rules of 3.6 (only full commits, memory wins until durable, a
failed commit is retaken whole) items can neither vanish nor duplicate across a crash, a failed write
or a quick rejoin. The journal makes one commit atomic; the rules make sure a commit always holds both
ends of every transfer.

When saves happen. There is one entry point, `SimHost.save()`, and it always commits everything that
is dirty. `requestSave()` asks for one soon; requests are coalesced and a save starts at most once per
second, between steps. Saves are requested:

- every `--save-interval` seconds (default 60) if anything is dirty;
- by a summon (the offering leaving a pack and the `summons` entry are then written together);
- when a player is parked (`bye`, end of the grace period, `idle`);
- when the last player has left and every grace period is over;
- on `SIGINT` / `SIGTERM`, after clients got `error shutdown`: `save()` directly, without the debounce.

`sim.takeDirty()` copies every dirty record at one instant and marks it `saving`. When the commit
resolves the host calls `sim.committed(batch, true)`: records not changed again since are durable, and
a parked player or a released `ChunkEdits` that was only waiting for this may now leave memory. When it
rejects: `sim.committed(batch, false)` marks them all dirty again and the next attempt takes them
afresh. A record that is `unsaved` is never evicted, so a `hello` or a chunk request during a slow or
failing commit is served from memory and can never read the older file.

Backups: before the first commit after start, then every `--backup-interval` seconds (default 1,800)
if anything was committed since the last one. Copy to `backups/.tmp-<stamp>/`, rename to
`backups/<stamp>/`, then delete all but the newest `--backup-keep` (default 12). Never during a commit.

Failure cases

| Case | Behaviour |
| --- | --- |
| Crash or power loss mid-write | The commit journal above. |
| `world.json` unreadable or `format` unknown | Refuse to start. Print the newest backup that parses and the command `--restore <stamp>` (which first moves the current files to `backups/pre-restore-<stamp>/`). Nothing is chosen automatically. |
| A player file unreadable | Rename it to `<id>.json.bad-<stamp>`. Use the newest backup copy that parses; if none, that player starts fresh. Log, and toast the player on join. |
| A region file with a bad magic or CRC | Rename it to `.bad-<stamp>`. Use the newest backup copy that validates; if none, the region counts as unedited. Log and announce in chat. |
| Disk full or I/O error during a commit | Steps 1 or 2 failed, so nothing was renamed: delete the `.tmp` files; `committed(batch, false)`. Toast "The server cannot save" to everyone every 60 s. Retry every 10 s. Nothing that is `unsaved` leaves memory meanwhile, so players who quit and return find their live record, not the old file; memory grows until the disk recovers, and the toast is the operator's warning. Backups are skipped while saves fail. On shutdown retry three times, then exit with a non-zero code. |
| Two servers on one folder | The second refuses (`server.lock`). |

CLI: `node dist/server/main.js --data <dir> [--port 8080] [--host 0.0.0.0] [--name <text>] [--seed <text>]`
`[--password <text>] [--cheats] [--max-players 8] [--view-max 12] [--save-interval 60]`
`[--backup-interval 1800] [--backup-keep 12] [--restore <stamp>]`. `npm start -- <flags>` builds, then runs it.
`--seed` and `--name` are used only when the folder holds no world.

### 8.2 In IndexedDB (solo)

Database `cairnlight`, version 2. `onupgradeneeded` creates the new stores and touches no data.

| Store | Key | Value |
| --- | --- | --- |
| `worlds` | `id` (keyPath) | `WorldRecord` plus `summary: { level }` for the title menu. A record without `format` is a legacy record. |
| `players` | `<worldId>\|<playerId>` | `PlayerRecord` |
| `edits` | `<worldId>\|<dim>\|<cx>\|<cz>` | `{ rev, pal, enc, data: Uint8Array, ents }` |
| `backup` | `<worldId>\|v1` | the legacy world record, verbatim |
| `chunks` | `<worldId>\|<dim>\|<cx>\|<cz>` | legacy full chunks; read, never written or deleted by this build |

`commit` is one transaction over `worlds`, `players` and `edits`, so it is atomic. A failed
transaction (quota, blocked) rejects with `StorageError('full' | 'io')`; the client shows today's
"Save failed. Your progress may not be kept." toast, at most once a minute. `deleteWorld` clears all
five stores for that id. The sim worker and the page both open the database; each closes its handle
on `versionchange`.

When solo saves. Today `Game.save()` issues every IndexedDB write synchronously inside the
`beforeunload` handler, and the browser finishes requests already issued, so closing the tab loses
nothing. In the new design the state lives in the sim worker, and a worker is torn down with its page:
a `save` message posted at unload may never be acted on. The solo host therefore keeps the unsaved
window short instead of relying on the unload:

- 3 s after any change to an inventory, a container, a block, a block entity, a flag or the quest
  index, `requestSave()` (position, clock and vitals alone do not start this timer);
- on `pause {on: true}` and on `save` (pause menu, tab hidden, window blur with a window open): at once;
- every 30 s regardless (today's interval), which also carries position and clock.

At `beforeunload` the page still sends `save`, and it asks the browser to confirm leaving
(`preventDefault`) in today's case (pointer locked mid-play) and also whenever `session.unsaved` is
true; the worker commits while the prompt is up. Not in `?quick` runs. What remains: closing a tab
without a prompt can lose up to 3 s of item and block changes and up to 30 s of walking, always as one
consistent older state, never a torn one. Stage 3 tests it (`closetab`); it is risk R12.

### 8.3 Versioning

`WorldRecord.format = 2`, `PlayerRecord.v = 1`, region magic `PCR1`, database version 2, `PROTO = 1`.
A loader that meets a higher number throws `StorageError('version')`; nothing is rewritten.
Block-id palettes work as today: `world.palettes` gains a table when the block list changes; a chunk
record whose `pal` is not the last one is remapped on load (unknown keys become air) and marked dirty.

### 8.4 Legacy migration (saves of the current build)

In `IdbStorage.open()` for a world record without `format`:

1. Copy the record to `backup` under `<id>|v1` if that key is empty.
2. `splitLegacyWorld(record)` (pure, `sim/migrate.ts`) builds:
   - `SharedState`: `clock`, `flags`, `quest = data.quests`, `events`, `homes = data.npcs`,
     `worldSpawn` (or `findSpawn` when missing), `gates = []`, `summons = []`, `owed = {}`, `tick = 0`,
     a fresh `rnd`.
   - `PlayerRecord` with id `'local'`: `pos = data.player`, `dim`, `inv`, `stats`, `bed = data.spawn`,
     `deathAt`, `portalReturn`, `safe`, `arriving`, `pendingBed`, `mail = []`, default modes. `stats` is
     copied as it is: a save taken on the death screen has `hp <= 0`, and `Sim.join` turns that into
     `dead` (3.6), where today `Game` uses `deadOnLoad`.
   - `WorldRecord`: `format: 2`, `owner: 'local'`, `palettes = data.palettes`, `names = { local: ... }`.
     A record with `data === null` (never saved) yields a new world with no player record.
3. Write the world record and the player record in one transaction. If it fails, nothing changed and
   the legacy record still loads next time.

In `IdbStorage.loadChunk(dim, cx, cz)`:

4. If `edits` has the key, return it.
5. Else if `chunks` has the legacy key: `unrle` to 65,536 cells; remap ids through
   `palettes[record.p ?? 0]` to current ids; `genChunk(seed, dim, cx, cz)`; `diffLegacyChunk`:
   - every cell where saved differs from generated becomes an edit;
   - every generator entity cell that has no entity in the legacy list also becomes an edit (holding
     the saved id), so the generator-entity rule (3.2) cannot bring back a container the player removed;
   - the legacy entity list becomes the stored entities as it is;
   - more than 16,384 edits: store `enc 1` (the whole saved array) instead;
   - `rev = 1`.
   Write the `edits` record. The legacy `chunks` record stays. The conversion can be repeated safely.
6. Else return null.

Gates built before the migration are not in the registry; `portalReturn` still returns the owner to
them (after the return check of section 9), and `collapseGate` works from blocks, so nothing depends on
the registry for old gates.

---

## 9. Hard cases

**Joining late.** `hello` creates a `SimPlayer` at the shared world spawn with `arriving = 0` (the
world-spawn landing every new world uses today), an empty inventory, level 1. `welcome` carries the
current clock, flags, quest index, event and roster, so tiers already unlocked by the group are
unlocked for the newcomer. The client generates around its position and subscribes; edits of everything
built so far arrive as `ce`, nearest chunks first and paced (4.7), so a large base delays the horizon,
not the join. Until `ready`, `land()` and the position check have all happened the player is invisible
to creatures and cannot be hurt.

**Dropping and rejoining mid boss fight.** Whether the socket closes or the link just goes silent, the
player stops being a target within 1.5 s (stall rule) and then has a 30 s grace, counted from the last
movement message, untargetable and unhurt. The boss rescales (after 10 s) and continues against the
others; with nobody else to fight it holds still and waits for the absent participant, through the
grace and through the reloading that follows a `hello`. Rejoining inside the grace resumes the same
`SimPlayer` at the same place (checked for blocks built there meanwhile), still a participant, the boss
where it was. If the grace runs out with no valid target, the boss withdraws and the offering is
refunded (7.9). A player who comes back later is resumed from memory if still parked, else loaded from
storage, and stands where they left; loot they were owed is in `mail`, or was held for them in
`shared.owed` and is paid at that join. Shares are recorded by record id, so nobody who joined in the
meantime and inherited the slot can receive them. The client rebuilds its world view from scratch
either way.

**A link that goes silent without closing.** Nothing tells the server for seconds (TCP keeps trying).
The movement stream does: 1.5 s without a `move` and the body is `away`: no target, no damage. Without
this rule a boss kills the frozen body and nobody can refund a fight lost to a cable. After 6 s the
client gives up on the socket and reconnects; after 10 s the server's keepalive closes it; after 30 s
without a move the host closes it itself (`idle`). Each path ends in the same grace and the same resume.

**Two players breaking the same block.** Both predict air. The host processes the first `edit`: block
broken, drops spawned (shared), `b` to subscribers. The second `edit` names an id that is no longer
there and is refused with `rej` carrying air, which is what that client already shows. One set of drops.

**A chest broken, replaced or walked away from while open.** Before a container's block or entity goes
away, `closeViewers` closes every window on it and sends `st {box: null}`; only then are the contents
spilled, so the drops are the only copies. Every container op resolves the entity again from the cell
and checks kind, chunk and distance, so an op can never land on a forge that replaced a chest, on a
chest in a chunk the sim no longer holds, or from across the map.

**Two players in one chest.** Both hold the same `BoxWire` and both apply ops locally. The host applies
ops in arrival order to the single chest; each op is a slot command with an expect guard, so the loser
of a race (taking a stack that just left) is refused and changes nothing. After each change every
viewer gets `st.box` with its own `ack` and replays only its unacknowledged ops. Items are conserved
because only the host's sequence of `applyOp` calls is real.

**The server restarting mid session.** On `SIGTERM` clients get `error shutdown`, the host saves and
exits. Clients retry with backoff (0.5, 1, 2, 4, 8 s, then every 8 s). After restart: `commit.json` is
replayed if present, every `shared.summons` entry is moved into `shared.owed` for its summoner,
`hello` is accepted, `welcome.boot` differs so the client says so. Players are where the last save put
them (at most `--save-interval` old after a crash; exact after a clean stop). Creatures, drops in
flight and projectiles are gone, as after quitting solo today. After a `kill -9` the world is the last
full commit, whole: a summon is either in it (offering gone from the pack, entry in `summons`, refunded
at boot) or not in it (offering still in the pack, no entry, nothing to refund). There is no state in
which both the pack and the refund hold the offering, because no save ever writes one record alone.

**Two sockets, one player.** Two tabs with the same token, or a client that says `hello` twice: the
join lock (4.2) hands the pending load to the newest socket and closes the other, so one `SimPlayer`
exists per id. Messages still queued from a replaced socket are discarded.

**A client at 150 ms with jitter.** Its own movement, block edits and inventory are immediate
(client-owned or predicted). Other entities are drawn `delay` behind, and `delay` grows with measured
jitter up to 250 ms, so a late snapshot is absorbed instead of freezing motion. Melee is judged with a
reach widened by the creature's speed times half the round trip plus the interpolation delay.
Projectiles are started on the client at once and advanced on the host by half the round trip.
Nothing is judged by the spacing of two arrivals: digging and attacking draw on budgets that fill in
sim time (4.7, 7.3), so jitter and a stalled segment that delivers `dig`, `edit` and three swings at
once cost nothing, and every action is judged from the position sent just in front of it (4.5).
Corrections (`tp`) happen only when the speed or space check fails, and carry an id so stale movement
is discarded rather than fought.

**Building under your own feet.** Pillar-jumping (Space and the right button held, looking down) and
filling the cell you just stepped out of: the client's own check passes on the first tick the body has
cleared the cell. The `move` that `session.act` sends in front of the `edit` carries that very
position, so the host's overlap test sees the same thing and accepts. Both are in the `basic` bot
scenario and in the golden smoke.

**A body inside a block.** A wall built through the spot where a friend logged off, a door shut on
someone in the doorway, a gate raised over a player who is loading. Placement and gate checks test
every body of the realm, loading and lingering ones included, which prevents most of it. For the rest
(doors, landing platforms, anything that slips through) the movement check does not teleport an
embedded player back into the block for ever: it lets them walk out, and frees them itself after 3 s
(4.5 step 4). Every position the sim chooses is checked before the player turns active.

**A chunk edit arriving before the chunk is generated.** `ClientVoxels` keeps, per chunk, the `ce` entry
and any later `b` changes in a pending list until the generation result arrives; then it applies the
edit set, then the queued changes newer than its revision, and only then marks the chunk ready. The
reverse order (generation first) waits for `ce` the same way. Changes for chunks that are not
subscribed are ignored.

**A player whose bed was destroyed by someone else.** If the owner is online, breaking the bed clears
`bed` and toasts them. In every case `goHome` re-checks the block when the bed's sim chunk is loaded;
if it is not a bed the player goes to the world spawn with the message used today. `bed` in a saved
record is therefore only ever a hint.

**Two players travelling between realms at once.** Each crossing is per player: the player leaves realm
A's list, gets `tp {dim, load: true}`, and is placed by `land()` in a later step once the destination
sim chunks are ready. `land()` runs for one player at a time inside the step. Before searching for
footing it looks in `shared.gates` for a gate of that kind in the destination realm within 24 blocks of
the arrival column; so the second traveller through the same gate reuses the gate the first one's
`land()` built in the same or an earlier step. `portalReturn` is per player. Realm A is suspended only
if nobody is left in it.

**A gate that is no longer what the records say.** An arrival gate does not collapse when its frame is
mined in its own dimension (today's rule, `game.ts:416`), a friend can dismantle it, and a saved
`portalReturn` can point at a gate someone collapsed while its owner was offline. Records are hints;
blocks decide.

- Registry hit in `land()`: the entry is used only if all 14 frame cells still hold the frame block and
  the standing cell passes the same `free()` test the search uses. Otherwise the entry is deleted and
  `land()` goes on to its normal search and builds a gate.
- `Realm.setBlock` deletes a registry entry when it changes one of that gate's frame or sheet cells.
- `collapseGate` clears the matching `portalReturn[dim]` of every player in memory, not only of the one
  who broke the frame.
- A player sent to a `portalReturn` spot arrives with `retCheck`. Before activation: a portal block of
  that gate's kind must be within 2 blocks of the spot. If it is, the player stands there (subject to
  the position check). If not, `portalReturn[dim]` is deleted and the player arrives like a traveller
  without one: `arriving = dim`, the full `land()` (in the Overworld: a plain footing search at that
  column, no gate is built; the kit was returned when the gate went dark).
- Every gate and platform that `land()` writes is tested against the bodies of `realm.players` first;
  an occupied spot is skipped by the search.

---

## 10. Test harness and bots

### 10.1 `window.T`

`?quick=<seed>` builds: `LoopbackTransport`, a `SimHost` with `clock: 'manual'`, `IdbStorage` on world
id `quick-<seed>` (`&fresh` deletes it first), in the page's own thread. `&worker` uses the sim worker
with a manual clock instead. `?clone` deep-copies every loopback message. `&det` is the determinism
mode described below.
`?server=<ws url>&name=<name>[&password=<p>]` joins a server without the menu; `T` works there except
`T.step` and `T.sim` (the clock is the server's).

One frame under a manual clock. `Game.runFrame(dt)` accumulates `dt` as today and, for each whole
`STEP`: `session.pump()` (deliver every queued inbound message), the client tick, one host step
(`await host.stepManual(1)` on loopback; `step {n: 1}` and the awaited `stepped` on the worker),
`session.pump()` again. Nothing depends on a later frame to deliver a reply, so the harness works in a
hidden tab where `requestAnimationFrame` is throttled. `Game.paused` stops the tick and the step.
Under a manual clock `runFrame` is therefore asynchronous; a frame that starts while the previous one
is still awaiting its step does nothing. `T.frame()` is one such frame with `dt = STEP`, awaited, then
a yield to the event loop.

| Member | After the change |
| --- | --- |
| `T.game`, `T.B` | unchanged (`T.game.world.getBlock`, `T.game.player`, `T.game.inv`, `T.game.stats`, `T.game.flags` are the client mirrors) |
| `T.sim` | new; the in-thread `Sim` (undefined with `&worker`). White-box checks: `T.sim.realms[0].mobs.list`. |
| `T.run(ms)`, `T.until`, `T.key`, `T.click`, `T.grab`, `T.floor` | unchanged (`T.run` is paced by the wall clock, as today) |
| `T.loaded()` | same meaning; under a manual clock it calls `T.frame()` and tests after every frame, so it returns on the first frame in which the player is active and the view is meshed |
| `T.frame()` | new; exactly one frame as above |
| `T.step(n)` | new; `n` times `T.frame()`, with no wall-clock pacing. Returns a promise. Scripts that need determinism use this instead of `T.run`. |
| `T.cmd(c)` | now returns `Promise<string>`: sends `cmd`, then calls `T.frame()` until the `cmdr` with its id has been dispatched (one frame on loopback), and resolves with the reply |
| `T.showcase`, `T.orbit` | same behaviour, built on commands instead of reaching into the game: `god on`, `caps 0 0`, `time`, `fill x0 y0 z0 x1 y1 z1 <block>`, `clearmobs`, `spawnat <key> x y z yaw`, `freeze on` |

New commands for tests (cheat-gated like the others): `caps <hostile> <passive>`, `clearmobs`,
`freeze on|off` (creatures stop ticking), `fill`, `spawnat`, `god on|off`, `hash cx0 cz0 cx1 cz1`
(FNV-1a of each sim chunk's blocks), `simhash` (hash of players, creatures, shared state), `tickstats`.

Determinism. Three things would let the wall clock into a manually stepped sim; each is closed.

1. Generation budget. Under a manual clock `InlineSource.poll` is called with `maxJobs = 2` and no time
   budget (3.5), so the chunks finished in a step do not depend on machine speed.
2. Storage. `stepManual` awaits every `EditStore.load` and player load issued so far before each step
   (3.7), so a chunk's edits arrive in the same step in every run.
3. Activation. In solo the world does not advance while no local player is active: the host calls
   `sim.prepare()` (chunks and arrivals only) instead of `sim.step()`, so `sim.tick` and the clock stand
   still during any loading screen, as the world does today (`Game.tick` returns while not ready).
   Under a manual clock the host activates a player only when every wanted sim chunk of its realm is
   ready, not just those within 3; and with `&det` the client sends `ready` only when its whole view is
   meshed (`world.counts().waiting === 0`). The first counted tick therefore starts from the
   same loaded world in every run, however long the page's mesh workers took.

The promise: with `?quick=<seed>&fresh&det` on loopback, two runs that `await T.loaded()` and then make
the same sequence of `T.key`, `T.click`, `T.step` and `T.cmd` calls report the same `sim.tick` and the
same `simhash` after every call, as long as the script keeps the player inside the area that was loaded
at the start (the client's own chunk workers still finish when they finish; far chunks do not enter
`simhash`, but a body walking into terrain its client has not generated yet would wait for it). The
sim's PRNG state is part of the world record.

### 10.2 Headless bots

A bot is the client without the view. `scripts/bot/bot.ts` reuses:

| Need | Shared module |
| --- | --- |
| Connection | `net/ws-client.ts` (Node 22 global `WebSocket`), `net/protocol.ts` |
| Snapshots, movement | `net/snapshot.ts` |
| Terrain for physics | `net/clientvoxels.ts` fed by `sim/genjob.ts` run inline, for the chunks within 2 of the bot (25 chunks, 1.6 MB); it subscribes to the same chunks and applies `ce` / `b` exactly as the browser does |
| Movement | `sim/body.ts PlayerBody` + `sim/physics.ts`, driven by a scripted `InputState` at 60 Hz |
| Inventory | `net/invsync.ts` (the reconcile core of 5.3) + `sim/invops.ts` |
| Rules | `sim/rules.ts` (`breakTime`, `reach`), `sim/mobhit.ts` (melee target from the latest snapshot) |

API: `connect(url, name, password?)`, `loaded()`, `goto(x, z)`, `look(yaw, pitch)`, `mine(x, y, z)`
(dig, wait `breakTime`, edit), `place(x, y, z, itemKey)`, `use(x, y, z)`, `attack(id)`, `fire(dir)`,
`pillar(n)` (jump and place under the feet `n` times, as a player holding Space and the right button),
`op(o)`, `cmd(text)`, `chunkHash(cx, cz)`, `drop()` (kill the socket), `silence(ms)` (stop reading and
writing without closing, as a dead link does), `raw(obj)` (send anything, for the `abuse` scenario),
plus counters: corrections received, `rej` received (with and without cells), snapshots, and bytes in
per stream (snapshot, `fx`, `st`, `b`, `ce`, other) and out. A bot sends its actions through the same
`session.act` rule as the browser (a `move` in front of each).

"Every bot sees the same world": the bots gather, then each computes `chunkHash` for the same 9 chunks
from its own `ClientVoxels`; the values must equal each other and the host's `/hash` for those chunks.

Node-side scripts run through `scripts/run.mjs` (Vite SSR bundle, then `node`). In-process tests may
skip sockets: `new SimHost(nodeEnv, new MemStorage(), new InlineSource(...))` with loopback connections.

---

## 11. Build order

Every stage ends with `npm run check` and `npm run build` passing and the game playable. "Smoke" means
`npm run smoke -- <name>`: a scenario in `scripts/smoke.mjs`, which imports `launch()` from the existing
`scripts/headless.mjs` (Vite dev server on a free port, installed Chrome through `playwright-core`) and
drives `window.T`.

### Stage 0. Baseline (one agent, no source changes under `src/`)

Owns: `scripts/smoke.mjs`, `scripts/run.mjs`, `scripts/golden/`, `scripts/fixtures/`, `package.json`
(scripts; devDependency `@types/node`), `docs/multiplayer/MEASUREMENTS.md`. `scripts/headless.mjs` is
used as it is.

- Smoke `golden` on the current build: fresh `?quick` world; give and gear; break and place blocks by
  simulated clicks; a pillar jump (hold Space and the right button looking down: the player must end at
  least 4 blocks higher) and a back-fill (walk out of a cell and place into it); craft through the
  window code; open a chest and move stacks; smelt; spawn and kill creatures; summon and kill boss 1;
  cross a gate and return; die and respawn; save, reload, compare.
  The game draws from `Math.random` in coin rolls, drops, modifiers, chest loot, crits and dodges, and
  the harness is paced by the wall clock, so two runs never agree on those. `scripts/golden/baseline.json`
  therefore holds only probes that no random draw can change: the block id at each probe cell, the
  flags the script must have set (`mine:`, `place:`, `craft:`, `smelt:`, `boss:1`, `dim:1`), the quest
  index reached by scripted steps, the keys and counts of items that were given or crafted without a
  modifier and never spent, the contents the script itself put into the chest, the forge output count,
  alive after respawn, and position and all of the above equal before and after the reload. Not in it:
  coins, experience, level, dropped loot, modifiers. The same file is the reference for every later
  stage, including the switch to the seeded PRNG in 1b; it is not recorded again.
- Legacy fixture: `scripts/fixtures/legacy-v1.json`, a dump of the `worlds` record and all `chunks`
  records of a world made by commit `8187558` with edits in all three dimensions, a filled chest, an
  unopened generator chest in an edited chunk, a forge mid-smelt, a bed, a housed townsperson and a
  gate pair; a second world record saved on the death screen (hp 0); plus a loader that writes them
  into a page's IndexedDB at version 1.
- Performance baseline (6.6, item 1).

Done when: `npm run smoke -- golden` passes twice in a row on `main`; the fixture loads in the current build.

### Stage 1. Extraction, one thread (one lane; steps in order, each committed green)

Owns: all of `src/`, `tsconfig.sim.json`, `scripts/lint-sim.mjs`.

- 1a. Pure moves: `sim/physics.ts`, `sim/body.ts` (split of `Player`), `sim/inventory.ts`, `sim/stats.ts`,
  `sim/fluids.ts`, `sim/rle.ts`, `sim/rules.ts`, `sim/clock.ts`, `sim/voxels.ts` (interfaces only),
  `sim/light.ts` (the `LightSource` interface only), `sim/genjob.ts`; `dev/validate.ts`; the sim
  tsconfig and lint.
- 1b. `Sim`, `Realm`, `SimPlayer`, `Sink`; every system of 2.3 moved; seeded PRNG; views split out
  (`render/mobView.ts`, `projView.ts`, `dropView.ts`, `client/fxplay.ts`, `client/entities.ts` filled
  each tick straight from the sim lists); `Game` constructs the `Sim` directly. In this stage the realm's
  voxel store is `client/worldstore.ts`, an adapter over the client `World` implementing `VoxelWrite`,
  `BlockEnts` and `LightSource` (the last by reading `World.getLight`, so spawning and sun-burn behave
  exactly as today and the golden holds; the approximations of 7.8 arrive in stage 2). Saves still use
  `SaveDB` in the legacy format, and there is one player; but no sim code may assume one player: it
  iterates `realm.players`, uses `m.tp`, and keys every per-player reference by record id (7.4).
- 1c. `sim/invops.ts`; `ui/windows.ts` and `Game` emit ops, applied synchronously.

Done when: smoke `golden` matches the baseline; `git grep -nE "from '\.\./(game|render|ui|audio|player)" src/sim` is empty;
`lint-sim` passes; the performance sum is within 1.0 ms of the baseline; saves made before the stage load after it.

### Stage 2. Separate stores, real protocol, still one thread

2.0 Contracts (one agent, first). Everything two lanes would otherwise both have to touch is settled here
and then frozen; for the rest of stage 2 these files change only through the integration agent.

- `net/protocol.ts`, `net/codec.ts`, `net/snapshot.ts`, `net/transport.ts`, `net/validate.ts`,
  `sim/storage.ts`, `sim/fx.ts`, `sim/chunksource.ts`, `client/session.ts` (dispatch registry, `act`,
  `pump`), and `scripts/tests/codec.test.ts` (round trips of snapshot, move, both edit encodings,
  base64) and `scripts/tests/validate.test.ts` (every message type: a valid sample passes, each field
  broken in turn fails, nothing throws).
- Replication hooks inside the entity sims, which lanes C and D only consume: in `sim/mobs.ts`,
  `sim/projectiles.ts`, `sim/drops.ts`: wire ids, `Proj.by` and `cseq`, `Drop.owner`,
  `MobSim.hurt(..., by)`, `ProjSim.fire(..., by, cseq)`, and the emit points of `ps`, `pe`, `da`, `dn`,
  `dd`, `md`, `mk`. As built (3.4): `ProjSim.fire(kind, x, y, z, dx, dy, dz, dmg, by, cseq = 0, speed?, style,
  knock, crit, lead = 0): Proj | null`, `psOf`, `PROJ_KEYS`, `ProjSim.byId`; `daOf`, `DropSim.byId`; and on
  `SimPlayer` the three fields the snapshot's player record needs and no lane owns (`swingSeq`, `usingItem`,
  `hurtTick`), and `modes.fly` with `flightAllowed(p)`, which the movement check asks (D28).
- `sim/rules.ts`: `breakTimeMin`, `freeSpot`; with them `bodyFree` (the shrunk box of 4.5 step 4, which
  `freeSpot`, the movement check and the placement check all ask) and `maxSpeed(stats, canFly)` (D20 (d)
  left it to its first caller, `movement.ts`, which cannot add to a frozen file).
- `client/api.ts`: the interfaces that cross lanes on the client. `DigHost` (`reach`, `breakTime`,
  `onBroken`, `onDigStart`, `onDigTick`: implemented by lane B's `client/blocks.ts`), `ActHost`
  (`primary`, `secondary`: lane D's `client/combat.ts`), `InvChannel` (`nextSeq()`, `send(op)`,
  `internal(seq, op)` for `_held` and `_slot`, `setSel(i)`: lane D's `client/invclient.ts`, called by
  lane B's predicted placement). `player/interact.ts` is changed here to take the two hosts
  (`tick(dt, input, dig, act, active)`) and is frozen with the rest. As built (3.8), five more crossings
  are settled there: `DigHost.onDig` (what `dig` reports; `Interact` alone knows it), `InvChannel.flushSel`,
  `EditHost` (lane B's predicted place, door and door toggle, called from lane D's `secondary`), `Bodies`
  and `Ghosts` (lane C's entity store, asked by lane B's placement and lane D's shot).
- Beside the two test files named above, `scripts/tests/hooks.test.ts` (the entity sims' events and wire ids,
  `InlineSource`, `MemStorage`, the three rules) and `scripts/tests/session.test.ts` (`pump`, `act`, `move`).
- A lane builds beside what runs: until integration, `Game` still constructs the `Sim` on `WorldStore`, and the
  tree must pass `npm run check` and both smokes after every lane. So a lane does not change a signature that
  a file outside its own list calls (`Realm`'s constructor and `RealmStore`, `SimDeps`, the functions of
  `sim/actions.ts` that `game.ts` calls, `EntityStore`'s `begin` / `end` / `sync` / `onFx` / `mobs` / `boss()`,
  `FxPlay.play` and `burst`, `Windows`' and `Hud`'s constructors); it adds the new path next to the old one,
  proves it with its tests, and integration switches the callers.

Lanes (parallel, disjoint files):

| Lane | Owns | Delivers |
| --- | --- | --- |
| A sim store and storage | `sim/voxels.ts`, `sim/light.ts`, `sim/migrate.ts`, `sim/realm.ts`, `sim/blocks.ts`, `storage/idb.ts`, `net/hostchunks.ts`, `scripts/tests/store.test.ts`, `scripts/tests/migrate.test.ts` | `SimChunks`, `EditStore` (`touch`, `unsaved`, release rule), generator-entity rule with promotion, viewers and `closeViewers`, light approximations, `IdbStorage` v2, legacy migration, chunk subscription service (nonces, range, pacing, cache) |
| B client world | `net/clientvoxels.ts`, `world/world.ts`, `world/worker.ts`, `world/pool.ts`, `client/blocks.ts`, `scripts/tests/clientvoxels.test.ts` | readiness rule, `editRev`, nonces, `write` (`hasEmit`, `onCellChange`), pending edits, predicted edits, `rej` and resync, generation hash check, re-subscribe timer |
| C entities | `net/hostsnap.ts`, `net/interest.ts`, `client/entities.ts`, `render/mobView.ts`, `render/projView.ts`, `render/dropView.ts`, `client/fxplay.ts`, `sim/movement.ts` | snapshot building, interest (projectile known-set included), interpolation, projectile and drop kinematics, fx playback, movement validation (embedded rule, liveness) |
| D inventory and UI | `net/invsync.ts`, `client/invclient.ts`, `client/combat.ts`, `ui/windows.ts`, `ui/hud.ts`, `ui/questView.ts`, `sim/actions.ts`, `sim/invops.ts`, `sim/inventory.ts` | reconcile (`assignWire`, identity, `pendingSel`), ops over messages, `tidy` and the Guide overlay, container re-resolution, dig and action credits, placement rules, HUD on mirrors |
| Integration (after A to D) | `game.ts`, `main.ts`, `dev.ts`, `net/host.ts`, `net/loopback.ts`, `sim/sim.ts`, `sim/player.ts`, `sim/travel.ts`, `sim/gates.ts`, `ui/menus.ts`, removal of `client/worldstore.ts` and `systems/` | `SimHost` (join lock, validation and `try / catch`, rate buckets (off on local transports, first exercised in stage 4), `requestSave`, `prepare`), loopback wiring, join / `tp` / `ready` flow with position checks, title menu on `IdbStorage` |

`clientvoxels.test.ts` must cover: either arrival order of generation and `ce`; a stale-nonce `ce`
dropped; unsub then sub of one chunk in one message; a `b` with a gap triggering resync; a torch in an
edit set, in a full array and in a live change each setting `hasEmit`; `rej` with and without cells.

Done when: smoke `golden` passes with `?clone`; smoke `legacy` loads the fixture and finds its probes
(blocks in three dimensions, chest contents, the unopened chest still rolling loot, forge state, bed,
townsperson, gate, the dead world opening on the death screen) and the `backup` record; the client
imports `sim/sim.ts` nowhere but `main.ts` and `dev.ts`; all `scripts/tests` pass; performance within budget.

### Stage 3. Solo in a worker, manual clock

Owns: `src/sim-worker.ts`, `net/worker-client.ts`, `sim/clock.ts`, `dev.ts`, `main.ts`, pause and save
paths in `game.ts` and `ui/menus.ts`.

Done when: worlds from the title menu run on the worker transport; smoke `golden` passes with
`&worker`; pausing stops `sim.tick`; the world stands still on a loading screen; hiding the tab saves;
smoke `closetab` passes (place a block and move a stack into a chest, close the page 4 s later without
answering any prompt, reopen: both are there; and again closing after 1 s: the world loads and is
consistent, whichever side of the commit it landed on); the determinism test passes (`&det`, two runs,
same `simhash` after each of 20 scripted calls); client `prof.tick` is below the baseline's and the
performance sum is within budget.

### Stage 4. The Node server

| Lane | Owns | Delivers |
| --- | --- | --- |
| A shell | `server/main.ts`, `server/http.ts`, `server/wsserver.ts`, `net/ws-client.ts`, `sim/identity.ts`, `vite.server.config.ts`, `tsconfig.server.json`, `package.json`, join screen in `ui/menus.ts`, reconnect in `client/session.ts` | `npm start`, hello / identity / password, static serving, keepalive, frame size caps, socket generations, reconnect |
| B disk | `server/diskstorage.ts`, `server/region.ts`, `server/backup.ts`, `scripts/tests/disk.test.ts` | folder storage, journal, backups, restore, corruption handling, region directory listing |
| C generation pool | `server/nodepool.ts`, `server/genworker.ts` | `worker_threads` source |
| D bots | `scripts/bot/`, `scripts/scenarios/basic.ts`, `scripts/scenarios/abuse.ts`, `scripts/lagproxy.ts` | bot library; scenarios `basic` and `abuse` |

Done when: `npm start -- --data <tmp>` serves the client on one port; scenario `basic` (two bots join,
see each other in snapshots, mine, place, pillar-jump 6 blocks, back-fill, use one chest, equal
`chunkHash` on bots and host, zero `rej` and zero corrections) passes; scenario `abuse` passes (malformed
JSON of every message type, out-of-range and aliasing chunk coordinates, `chunks.full` for 16 far
chunks 12 times a second, 1,024 far `sub` entries 12 times a second, two sockets saying `hello` with one token in the same tick: the server stays
up, step p99 stays under 10 ms for a bystander bot, and one `SimPlayer` exists); `disk.test` passes,
including: kill the process at random points of 50 commits and reload each time with item counts
conserved, corrupt each file kind, fill a small tmpfs, rotate backups; smoke `golden` passes against
the server from a non-localhost address over plain http.

### Stage 5. Co-op rules

| Lane | Owns | Delivers |
| --- | --- | --- |
| A fighting | `sim/mobs.ts`, `sim/spawn.ts`, `sim/boss.ts`, `sim/projectiles.ts`, `sim/drops.ts`, `sim/loot.ts`, `sim/mobhit.ts` | 7.1 to 7.4, 7.9 boss rules (participants, scaling, hold, refund, `shared.owed`) |
| B world | `sim/events.ts`, `sim/npcs.ts`, `sim/quests.ts`, `sim/travel.ts`, `sim/gates.ts`, `sim/player.ts`, `sim/cheats.ts`, `net/host.ts` | 7.5 to 7.7, 7.10, gate registry with verification, stall, grace period, parking, eviction on `committed`, `idle` close, realm suspension |
| C social view | `render/playerView.ts`, `data/playerModel.ts`, `ui/chat.ts`, `ui/roster.ts`, `client/social.ts`, `ui/hud.ts` | bodies, name tags, chat, roster, pings, compass pips |
| D scenarios | `scripts/scenarios/*.ts` | one scenario per hard case of section 9, plus `boss`, `sleep`, `latejoin` |

Done when every scenario passes: `boss` (three bots, boss 1: `maxHp` is 924 with three near, and still
924 when two of them shoot from 70 blocks; each bot ends with its own heartroot), `rejoin`, `stall`
(a bot's link goes silent mid-fight: it takes no damage, the boss waits, and the offering comes back
when the grace ends), `lateloot` (a bot is parked and evicted before the boss dies; its share is in
`shared.owed` and is paid at its next join; a newcomer who took its slot gets nothing), `sameblock`,
`chest2` (two bots, 200 racing ops each, item totals conserved), `chestbreak` (one bot breaks a chest
another has open: the window closes, totals conserved), `embed` (a wall is built through a logged-off
bot and a door is shut on a standing one: each walks out with at most one `tp`), `travel2` (one gate at
the destination), `gatecut` (the arrival gate is mined out: the next traveller stands on solid ground),
`projjoin` (a bot walks into a spiral from 120 blocks out and has every projectile that hits it),
`bed`, `sleep`, `latejoin`, `restart`.

### Stage 6. Proof

Owns: `scripts/scenarios/soak.ts`, `docs/multiplayer/MEASUREMENTS.md`.

| Run | Pass |
| --- | --- |
| Soak: 8 bots, 30 min, each at a 12-chunk subscription view, wandering, mining, building (pillar jumps included), fighting; tick time, RSS and bytes per stream per connection sampled every 10 s to `out/soak.csv` | step p99 <= 10 ms, max <= 25 ms, no dropped backlog, RSS < 600 MB and flat (6.6), zero `tp` corrections, zero `rej` outside deliberate same-block races, equal world hashes at the end |
| The same through `lagproxy` at 150 ms +- 40 ms with random 250 to 400 ms stalls on 2% of segments | scenario `boss` completes; at most 1 correction and at most 1 `rej` per bot per minute; `sim.refused` shows no `atk`, `fire` or timing-refused `edit` for a bot that paces itself; equal world hashes |
| Restart: `SIGTERM` and `kill -9` in the middle of `boss`, the `kill -9` both 0.2 s and 5 s after the summon | bots reconnect by themselves; exactly one offering exists per summon afterwards (in a pack, in `mail` or in `shared.owed`); item totals conserved |
| Plain http from a non-localhost address, Chrome and Firefox | smoke `golden` passes; `git grep -nE "crypto\.subtle\|randomUUID\|navigator\.clipboard\|serviceWorker" src` is empty |
| Legacy fixture in the final build | smoke `legacy` passes |
| 60 fps | performance sum within 1.0 ms of the stage 0 baseline at view 12, solo and connected to the server with 7 bots nearby |

---

## 12. Risks not retired by reading

| # | Risk | Experiment that retires it |
| --- | --- | --- |
| R1 | Terrain may differ between JavaScript engines. Generation calls `Math.pow(ridge, 1.5)` (`climate.ts`), `Math.cos` / `Math.sin` (`structures.ts`, `stampTree`), and results are floored. A one-ulp difference moves a block. | `scripts/genhash.ts`: hash 4,096 chunks per dimension in Node on ARM64 Linux and, through a `?genhash` page, in Chrome, Firefox and Safari on x64 and ARM64. If any differ: replace `Math.pow(x, 1.5)` with `x * Math.sqrt(x)` and the trig calls with a table in `core/noise.ts`, and re-run. The `gh` check and `chunks.full` keep play correct meanwhile. |
| R2 | Step time on the Spark with 320 creatures and a boss's projectiles is estimated, not measured. | Stage 6 soak with per-phase timers. If creatures exceed 2 ms: stagger AI further; if projectiles exceed 0.8 ms: a uniform grid for projectile-versus-creature tests. |
| R3 | A legacy chunk saved under an older generator differs from today's terrain almost everywhere and converts to the dense form. Size and time are unknown for real saves. | Run `migrate.test` on the fixture and on any real save the owner can export: count dense conversions, bytes, ms per chunk. |
| R4 | `ws` inlined by Vite's SSR build (rolldown) must not try to load its optional native add-ons, and the `worker_threads` entry must resolve from `dist/server`. | First day of stage 4: build, copy `dist/` to the Spark, run with no `node_modules`. Set `WS_NO_BUFFER_UTIL=1` and `WS_NO_UTF_8_VALIDATE=1` before importing `ws`. Fallback if it will not bundle: a hand-written RFC 6455 endpoint on `node:http` (text and binary frames, ping/pong, no extensions), about 250 lines. |
| R5 | Whether boss fights are fair at 150 ms: the player sees wind-ups about 175 ms late and their dodge reaches the host 75 ms later. | A scripted dodging bot fights boss 1 at 0 ms and through `lagproxy`; damage taken at 150 ms should be under 1.5 times the 0 ms figure. If not: lengthen `windup` by `min(rtt / 2, 0.1)` for the targeted player's hit test only. |
| R6 | Main-thread cost of snapshot decode, interpolation, player bodies and (in solo) structured cloning of fx at 60 Hz. | Performance numbers at stages 2 and 3 against the baseline. |
| R7 | Pointer lock, module workers and Web Audio from a plain-http, non-localhost origin in each browser. | Stage 4 smoke over a LAN address in Chrome and Firefox; Safari by hand once. |
| R8 | IndexedDB upgrade to version 2 while another tab holds version 1 open, and two handles (page and worker) on one database. | Smoke with two tabs: the upgrade must complete or report "close the other tab". |
| R9 | `Map`-based edit maps and JSON saves under very large builds; garbage-collection pauses inside steps. | Soak variant with one bot placing 200,000 blocks; watch step p99, RSS and commit time. |
| R10 | Inline generation in the solo worker (121 chunks at a join or far teleport, about 225 ms of work) may lengthen steps. | Measure step p99 in the worker during `tp` far. If over 10 ms: lower the per-step generation budget, or move to nested workers where they exist. |
| R11 | Solo creatures are now drawn 4 ticks (67 ms) in the past; melee may feel later than today. Cannot be judged without a person. | Report the measured click-to-hit-mark time before and after; the owner decides whether `delay` on local transports should drop to 2. |
| R12 | Solo: the page can no longer write at unload (the state is in a worker that dies with it). The design bounds the loss to 3 s of item and block changes (8.2) but whether a `save` posted at `beforeunload` or on `visibilitychange` usually completes differs by browser. | Stage 3 smoke `closetab` in Chrome and Firefox: close 1 s, 4 s and 10 s after a change, with and without the tab having been hidden first; record what survived. If 3 s proves too long in practice, lower the debounce to 1 s (a solo commit is one small transaction). |
| R13 | The stall rule makes any player safe after 1.5 s without a movement message, which a hidden tab (or a deliberate one) produces. Accepted for a game among friends; whether it is abused, or trips on ordinary Wi-Fi hiccups mid-fight, is not knowable from the code. | Lag run with `silence(2000)` injected at random into a boss fight: the fight must still complete, and the log shows how often players went `away`. If hiccups under 3 s are common on the owner's network, raise `STALL_AFTER`. |
| R14 | The dig and action budgets replace exact timing. A modified client gains the airborne and underwater mining penalties and a burst of `ACT_SURPLUS`. The numbers (`DIG_SURPLUS` 1.0 s, `ACT_SURPLUS` 0.5 s) are chosen for 400 ms stalls, not measured. | Lag run counters: `rej` per bot and `sim.refused` on the host must be zero for bots that pace themselves; if not, raise the surplus that tripped. |

---

## 13. Deviations and why

D1. Decision 2 (pure tsconfig over `src/data`). `src/data/validate.ts` imports `../render/textures` and
`../systems/inventory`, so it cannot be in the pure program. Fix: move it to `src/dev/validate.ts`
(`main.ts` is its only importer). Also: `lib: ["ES2022"]` has no `console`, `performance` or timers, so
the sim gets time, logging and timers from the host (`SimDeps.log`, `HostEnv`). And the server and bots
need `@types/node`, which must not reach the sim: a third config, `tsconfig.server.json`. `npm run check`
runs three compilers and a lint.

D2. Decision 13 (harness steps "a local sim"). `dev.ts` reads state synchronously (`T.floor` loops over
`game.world.getBlock`; `showcase` writes `g.mobs.hostileCap`, `g.clock`, `w.setBlock`, `m.active`) and
`T.cmd` returns a string. None of that survives a worker boundary. Fix: a third transport, in-thread
loopback, is the default for `?quick`; `&worker` exercises the worker. `T.cmd` returns a promise;
`showcase` is rebuilt on commands; `T.sim` exposes the in-thread sim. The same loopback host serves
stage 1 to 2 and Node-side tests.

D3. Decision 11 ("entity snapshots binary, everything else JSON"). (a) The movement message is binary
too: it is the 20 Hz mirror of the snapshot. (b) Projectiles and drops are not in the snapshot. The
projectile pool is 600 and a `beam` fires every 0.045 s; as per-snapshot state that is up to 200 kB/s
per client. They are deterministic after launch, so they go as spawn and end events in `fx` and fly on
the client. (c) Edit-map payloads are base64 inside JSON.

D4. Decision 12 (record keyed by a hash of the browser token). In solo that would orphan the character
when `localStorage` is cleared, which today's saves survive. Fix: a local transport ignores the token
and uses `world.owner`. The hash is a pure-JS SHA-256 in the sim (`crypto.subtle` is absent on plain http).

D5. Decision 14 (temp-and-rename per file). Per-file atomicity can lose an item moved between a player
file and a region file when the process dies between the two renames. Fix: a small commit journal
(`commit.json`) makes one save atomic across files. In IndexedDB: the database version must rise to 2
(new stores), which an older build cannot open; legacy `chunks` records are kept, not deleted, after
conversion; one transaction per save.

D6. Requirement "terrain never goes over the wire" and decision 5. Two rare cases send a whole chunk
(`enc 1`): a legacy chunk that differs from today's generation in more than 16,384 cells, and a chunk
whose client generation hash disagrees with the host's (R1). Everything else is seed plus edits.

D7. Decision 6. Light is read in four sim rules, all in `mobs.ts`; the approximations and their
visible effects are in 7.8. They err toward fewer hostile spawns near lit and built areas. The sim reads
light through `LightSource`; in stage 1 that is still the client's real light, so the extraction stage
changes no behaviour and the approximation arrives, with its recorded differences, in stage 2.

D8. Decision 16, made precise where the code forced a choice: one boss per realm (as `activeBoss()`
today); refunds only when the fight is ending because a connection was lost (a participant is stalled
or lingering at that moment, or the boss was waiting for one whose grace ran out), or at host start; a
realm
with nobody in it is emptied, as `Game.travel` empties the one it leaves; chest and crate tables are
rolled once and shared (they are world objects, and `rollLoot` runs at open or break); a `have` step of
the guide is met by one player's inventory, not the sum; spawn caps are counted around each player
within the despawn distance so solo is unchanged.

D9. Decision 5 (generation "through a pool ... Web Workers in the browser"). The solo sim already lives
in a worker; nested workers are not available everywhere. Measured generation is 1.85 ms per Overworld
chunk, so the solo host generates inline inside a per-step budget. The server uses `worker_threads`.
In solo the page's own chunk workers still generate for meshing, so near terrain is generated twice
(about 20% more generation in total at view 12).

D10. Decision 15. New dev-time packages: `ws`, `@types/ws`, `@types/node`. (`playwright-core` is already
declared, and `scripts/headless.mjs` already launches Chrome with it; the smoke runner builds on that.)
Node 22 or newer is required (global `WebSocket` for bots, stable `worker_threads` ESM). R4 covers the
bundling unknown and its fallback.

D11. Owner's list mentions a codex and a map. Neither exists in the code. The shared flag set is what a
codex would show (7.6). Pings and friends appear in the world and on the compass (7.10); a map view is
not part of this milestone.

D12. Decision 1 (layout). Added beside the named folders: `src/client/` (session, mirrors, prediction),
`src/storage/` (IndexedDB), `src/dev/`, `scripts/` (bots, tests, smoke). `src/systems/` and
`src/entities/` are emptied by stage 2 and removed.

D13. Decision 16 ("a boss's health scales by 1 + 0.6 per extra player within 64 blocks"). The count by
distance alone is wrong for this game and is amended, not just refined. Evidence: valid boss targets
reach to 80 blocks from the altar (`boss.ts:65`, kept in 7.9), the weakest bow shoots 34 blocks/s
against gravity 14 (`items.ts:188`, `mobs.ts:699`: about 80 blocks of range, more for every tier), and
staff bolts carry 65. Seven of eight players can therefore fight from 65 to 80 blocks and the boss
keeps solo health, damage and cooldowns. Amended rule (7.9): `n` counts active players who are within
64 blocks of the boss or who damaged it in the last 20 s. Everyone the lead's rule counted is still
counted; solo and melee groups see no difference.

D14. Decisions 8 and 10 (the server validates dig time and the attack cooldown). Who decides is
unchanged. How is not what a literal reading gives: the gap between two arrivals on one TCP stream is
not the gap between the two actions (one stalled segment delivers `dig` and `edit`, or three swings,
together), and `breakTime` depends on body flags that change during a dig (`game.ts:349-350`,
integrated per tick at `interact.ts:92-94`). The checks are budgets that fill in sim time (4.7 dig
budget, 7.3 credits), and the dig is held to the fastest time the flags allow. Cost: a modified client
can skip the airborne and underwater mining penalties and bank `ACT_SURPLUS` of swings (R14).

D15. Decision 7 (movement about 20 times a second; an authoritative teleport when a check fails). Two
adjustments. The client also sends a `move` in front of every action, so that the action is judged from
the position it was made at; without it, placing a block under your own feet in a jump is always
refused (`interact.ts:104-107` retries the placement every tick, `game.ts:607` passes on the first tick
the body is clear, and the host's stored body is 1 to 3 ticks older). And a failed space check does not
teleport a body that is already inside a block: `clip` (`physics.ts:13-35`) lets the client walk out,
so the host must too, or the player is pulled back into the block on every move (4.5 step 4).

D16. Decision 14 (save on a timer, on shutdown and when the last player leaves). More triggers were
needed (a summon, a player parked, in solo a 3 s debounce after any world or inventory change), and
one restriction: every save is a full commit of everything dirty. A save of one record, which the
earlier draft used after a summon and at `bye`, writes one end of a transfer without the other and
duplicates or loses items at the next crash. Records stay in memory until the commit that holds them
has resolved. Solo no longer writes at unload from the page (the state is in a worker), which is the
reason for the debounce and for R12.

D17. Decision 17 (the server keeps the player record and what it was fighting across a reconnect).
Kept, and extended on both sides of the socket closing: a link can die without closing, so the movement
stream is the liveness signal and a silent player is `away` after 1.5 s (7.9); the grace period counts
from the last move; a boss waits for an absent participant instead of leashing after 10 s; and every
per-player reference inside the sim (damage shares, drop owners, participants) is a record id, never
the session slot, because the slot is given to the next player who joins.

D18. Things a solo player can notice that differ from today, beyond D7 and R11: the backpack sort
orders equal-rank names by code unit instead of by the browser's locale (5.2); a townsperson's body is
present while its home is within the simulation radius (about 80 to 95 blocks) rather than within 90
blocks of a loaded home (7.7); a boss that has nobody to fight holds for 10 s before it withdraws
instead of leaving at once (7.9); closing the tab without the prompt can lose the last 3 s of changes
(8.2). The portal timer still pauses with the Inventory or Guide open (4.5, bit 9).

D19. Stage 0 (smoke "a scenario in `scripts/smoke.mjs`"). `scripts/smoke.mjs` is the runner and
registry; the scenarios live beside the data they own: `scripts/golden/golden.mjs` (with the shared
page helpers `R` and `D` and the node-side driver), `scripts/fixtures/legacy.mjs` (fixture loader,
scenario `legacy` and a scenario `legacy-make` that rebuilds the fixture from a build) and
`scripts/perf.mjs`. The golden levels an 11x11 pad at the spawn before it starts, through `D.fill`,
which sets blocks directly until the `fill` command of 10.1 exists; every later step is input or a
cheat. `legacy-v1.json` carries, beside the two stores, an `expect` object written by the maker at the
moment it saved, which the `legacy` scenario checks.

D20. Stage 1a (2.1 and the file table of 2.2). Four small things.
(a) `npm run check` runs the client compile, the pure compile and the lint. `tsconfig.server.json`
compiles `server/**`, which does not exist before stage 4; its compile joins `check` with that folder.
(b) `lint-sim.mjs` fails on more than 2.1 lists: also `new Date`, `clearTimeout`, `clearInterval`,
`requestAnimationFrame`, any package import (not only `three`), and any relative import that resolves
outside the `include` list of `tsconfig.sim.json`, which it reads so the two cannot drift apart. It
matches text, comments included.
(c) Signatures. The shared rules take what they read, not a player, because the client has an
inventory and stats mirror but no `SimPlayer`: `reach(stats, modes)`, `canHarvest(id, inv)`,
`breakTime(id, inv, stats, modes, body)`, `attackRate(inv, stats)` (written `attackRate(p)` in 7.3),
`accepts(kind, i, item, acc, forgeLevel)`, `smeltable(key, forgeLevel)` (99 with no forge open),
`refusal(kind, item)`. `PlayerStats.damage(raw, rnd, ignoreArmor = false)`: `rnd` comes second because
`ignoreArmor` is optional. `PlayerBody` keeps the landing-dip spring state (`landDip`, `dipV`) and the
rendered eye position (`ex`, `ey`, `ez`) as fields, since `teleport` and `tick` write them; the camera
code that reads them stays in `Player`.
(d) 1a moved code that exists. The members of 2.2 that are new arrive with their first caller:
`rules.sortCompare` with the `sort` op (1c), `rules.maxSpeed` with `movement.ts`, `breakTimeMin` and
`freeSpot` in 2.0 as listed, `assignWire` with 5.3, and the tick counters of `clock.ts` with `Sim.tick`
(1b). `Gfx.update` keeps its own sun vector for the sky; `clock.ts dayAmount` repeats its arithmetic
in the same order and was checked equal to `gfx.dayAmt` bit for bit over a full Overworld day and at
the fixed times of the other two dimensions.

D21. Stage 1b (2.3, 3.3, 3.4, 4.6, 6.1, 10.1). What the one-thread stage builds differently, and what it
leaves to the stages that bring the wire, the stores and the co-op rules.
(a) Stores. `SimDeps` is `{ sink, store(dim), log, requestSave }`: there is no `ChunkSource` or
`EditStore` yet. `store(dim)` returns a `RealmStore` (`sim/realm.ts`): `VoxelWrite`, `BlockEnts`,
`LightSource`, plus `chunkEnts(cx, cz)`, `areaReady(x, z, r)`, `touch(ent)` and an `onChange` hook that
`Realm` points at `blocks.onBlockChange`. `client/worldstore.ts` implements it over the one loaded
`World` (a store of another dimension reads as unloaded; `areaReady` is `World.areaMeshed`, the test
`goHome` and `checkReady` make today) and creates generator block entities as chunks arrive. `Realm`
has `store`, not `chunks`. Chunk saving (palettes, loader, `saveChunk`, `save`) stays in `Game`.
(b) `Sim` has what a one-thread game calls: the constructor, `rnd`, `isNight`, `difficulty`, `addFlag`,
`delFlag`, `join`, `running`, `step`, `prepare`, `online`, and `exportShared()` (the detached shared
state a save holds). `handle`, `handleMove`, `resume`, `leave`, `takeDirty` and `committed` arrive with
the protocol and the storage. `tick` is an accessor on `shared.tick`. `join` takes a fifth, optional
argument: the `PlayerBody` to use. `Game` passes its own `Player`, so `SimPlayer.body` is that object:
the client moves it, the sim reads it and teleports by writing it, then says so with `tp`.
(c) `SimPlayer` has four more fields: `clientReady` (the client said its area is meshed), `fresh`
(joined without a record), `deadOnJoin` and `arriveMsg`. `loading` stays true until the arrival is
complete (bed check, `land`, the final `tp {load: false}`), not only until `ready`. A record loaded with
no health is `dead` from `join` on, but the `dead` message is sent when the player turns active, where
today's death screen appears. Credits (`actCredit`, `useCredit`, `digCredit`), `dig`, the movement and
linger fields are carried and unused.
(d) Order inside a step. `Sim.step`: arrivals; per active player `stats.sync`, `fullT`, `recallT`, fall
damage, `safe`, hazards (every 0.5 s, with `deathAt` clearing and starvation), the void rule,
`stats.tick`; per realm with players `mobs.tick` (spawn attempts last), `proj.tick`, `drops.tick`, block
ticks; then the portal timer of every active player; then `fluids.tick` of those realms; `events`,
`npcs`, `quests`; the clock. That is the order `Game.tick` ran the same operations in (6.1 lists
`stats.tick` before the hazards and the portal timer among the player's). One thing does move: the
client's half of the tick (the body, `interact.tick` and the actions it calls) now runs wholly before
the step, so fall damage and hazards follow that tick's actions where they used to precede them.
(e) Sink. `Game` implements `Sink` and plays every event at once, in the call. It honours `p`, `dim` and
`not`, and ignores the radius of a positional scope: nothing is culled by distance today, and a
positional sound is silent past 34 blocks in `audio.play` anyway. The forge hiss goes to each player
within 12 blocks (x, z), as the check in `tickForge` did.
(f) Events and messages. `src/net/protocol.ts` holds the four `S2C` messages the sim sends so far (`hurt`,
`dead`, `tp`, `open`); `open` carries the container cell until `st.box` exists (1c), and the client
builds the window from the entity it reads there. The sim emits `md` for every removal that is not a
realm being emptied, and `pe` (how 1 or 2) and `mk`, all with scope `{dim}`; the host will route them
by interest. `ps`, `da`, `dn`, `dd`, `dg`, `pg` are not emitted yet: the views are filled from the
lists. Burst kind 12 (`summoned`) is new: the motes round a creature a boss calls up rise in a different
shape from the puff of kind 3. A toast with colour `''` uses the HUD default.
(g) State the sim keeps for the view: `Mob.sq` (landing squash, set from the velocity before the move),
`Mob.tpn` (counts jumps; the `tpToggle` of 2.4), and `BossState.fxm`, the continuous emitters that ran
this tick (telegraph, sight line, charge dust, weave dust, burrow dust). The client draws them with
today's probabilities, coloured by `kind`, from the position the tick began at. Shade smoke is derived
as 4.6 says (hurt flag in daylight), so an event shade that is struck in sunlight smokes for 0.22 s.
(h) Views. `EntityStore.begin(realm, dt)` runs just before the step (previous position and pose, eased
light), `end(realm, dt)` just after (corpses, emitters, drop light), `sync(realm)` on frames without a
tick. Something that appears during a step is first drawn where the step left it, one tick ahead of
where it used to start. A corpse is made on `md` how 1 from the creature as it is at that instant.
(i) Rules still shaped for one player, widened only as far as "which player" (section 7 is stage 5): a
creature deals with the closest player of its realm whatever that player's state, and `hidden` stops
only the melee chase, as today; a kill pays the player of the last blow; a drop goes to the closest
player; an event's reward goes to every player in the Overworld and its host gathers round the first
active one; a guide step and a townsperson's price are met by any one player. No spawn caps by
distance, no boss scaling, hold or refunds, no gate registry upkeep; `shared.gates`, `summons` and
`owed` stay empty. Creature pool 320 (2.3); drop pool still 160 (480 comes with 7.4).
(j) Random draws. One `mulberry32` stream, `shared.rnd`, seeded from the world seed and saved in the
legacy record as `data.rnd` (with `data.tick`). Every draw sits where its `Math.random` sat, except the
critical-hit roll, which is drawn when a blow lands or a shot leaves instead of on every tick the
button is held. Particle draws stay `Math.random` on the client. The crafting modifier roll draws
from `sim.rnd` (D23) until the ops of 1c give it its own stream.
(k) Per realm now, where `Game` had one: the block-tick timer, the spawn timer, the caps. The harness
commands `caps` and `freeze` set all three realms.
(l) Harness. `T.sim` is there; `T.cmd` still returns a string; `showcase` runs on commands. Of the
commands of 10.1, `caps`, `clearmobs`, `freeze`, `fill`, `spawnat` and `god on|off` exist; `hash`,
`simhash` and `tickstats` need sim chunks.
(m) Windows. The sim sets `p.window` when it opens a chest, forge or shop and when the client reports a
station; the client clears it each tick its own window is closed, and reports any open window as
`uiOpen`. `closeViewers` only forgets viewers. The window code still mutates containers and calls
`Game.markEntDirty` / `markChestDirty`, which now end in `Realm.touchEnt`.

D22. Stage 1b (2.3, 4.3, 7.4, 7.5). Rules that sat in `Game`, or only worked for one player, and how the
sim holds them now.
(a) Gate kits. `gates.placeGate(sim, p, x, y, z, alongX)` takes what the `item` message will carry (`at`,
`ax`). It reads the kind from the held kit, refuses a foot cell with air or liquid under it, then runs
`gateFits` and `buildGate`, and it sends the refusal toasts and the sounds itself. 4.3 names only
`gateFits`: "place the gate on the ground" was a test of the clicked face (`ny === 1`) in `Game`, and
the message has no face, so the rule is asked of the cell. A solo player can notice one thing: a kit
used on the side of a block raises the gate when the cell beside that block has ground under it, where
it used to be refused.
(b) Derived stats follow the held slot. `PlayerStats.sync` recomputes when `inv.sel` changed as well as
when `inv.rev` did (the held weapon's modifier counts), so the player's step does it. `Game.updateHand`
did it from the draw, and only when the item key changed: of two weapons of one kind with different
modifiers, the first one's bonus stayed. That is gone.
(c) With no active player in the Overworld a wave waits (its timer stays due) instead of gathering round
`players[0]`. An owned drop is offered to its owner wherever the others stand, and to nobody while the
owner is not in that realm; an unowned drop still goes to the closest player (D21 (i)).

D23. Stage 1b (2.3, 5.2). `onCrafted` becomes an effect of `applyOp`, and `applyOp` is stage 1c. Until
then `actions.craft(sim, p, r, cells)` is the one place a craft happens: it takes a batch off the first
`cells` cells of `p.inv.craft` (`takeCraft`, modifier from `sim.rnd`), sets `craft:<key>` and returns the
item. `Game.craft(r, cells)` passes through to it for the window, as `Game.dropItem` does, and
`Game.onCrafted` is gone. The window still decides where the item goes (cursor, pack, or thrown out),
which is the container code of D21 (m). The `out` and `book` ops replace the call.

D24. Stage 1b (2.3, 6.6). The pools keep a bound. `MobSim`, `ProjSim` and `DropSim` each have `hi`: every
slot of `list` from `hi` up is free. `spawn` and `fire` still take the first free slot, so slots fill in
the order they always did, and raise `hi` when that slot is the one at the bound; the pool's `tick` lowers
it past the free slots at the top after its loop. The three tick loops, the merge scan of `DropSim.spawn`
and `MobSim.count`, `boss`, `bosses`, `byId` and `nearestHostile` stop at `hi`, and read it again on every
pass so that something spawned inside the loop still gets that tick. `EntityStore` makes a view when the
bound first reaches a slot, not one for every slot a pool owns, and looks for the creature of an `md`
under the bound (it is still there: the bound only drops at the end of a tick). Why: with the creature
pool at 320 (D21 (i)) beside 600 shots and 160 drops, `begin`, `sync` and `end` each walked 1,080 slots
every tick for the ten or so creatures of a quiet world, and `boss()` walked 320 on every spawn attempt.
That was 0.03 ms on the mean tick and, on the ticks where one of those loops ran before the engine had
optimised it again, about 1 ms on the worst one, which is the number 6.6 item 2 sums
(`MEASUREMENTS.md` section 4). What walks `list` from outside the pools still walks all of it: the ray
test of a player's shot, and the event, town and harness scans.

D25. Stage 1c (5.1, 5.2, 5.3). `sim/invops.ts` is built as section 5 tabulates it, with these differences.
(a) The Guide over another window. 5.2 keeps the sim's `window` under the Guide and has Back send
nothing. Two things in the window code do not allow that. A shift-click or a double-click made in the
Guide acts on the plain inventory today (equip, hotbar to backpack, gather from the pack); with the
window still in force on the sim the same click would load the hidden chest or forge, or sell to the
hidden shop. And leaving the Guide by Back puts a stack that was picked up in the Guide back in the
pack, as every change of window does. So `tidy` carries one field, `cover`, and `window` (in `OpState`
and `SimPlayer`) has `covered?: boolean`: a covered window is kept, with its `sold` list, and every op
acts as if there were none (2 x 2 grid by hand, no container, no shop). Opening the Guide over a window
sends `tidy {cover: true}`; Back sends `tidy {cover: false}`; any other window shown over an open one
sends `tidy {cover: false}`; `close` ends a covered window like any other.
(b) `OpCtx` has `creative`: `pick` needs it and `OpState` holds nothing of the player's modes.
(c) `OpResult` has `n` on success: the number of items an `out` or a `book` made, which the window puts
in its "Made 12 torch" line. `ok: false` always means nothing changed. A `lay` or a `book` that was
carried out and made nothing (the grid went back to the pack, then the recipe could not be laid out, or
the pack had no room for the result) has moved items, so it returns `ok: true` with `snd: 'error'`.
(d) Feedback. `snd` and `msg` name what the outcome calls for (`dig_cloth` when an equipment slot took
the item, `coin`, `craft`, `click`, `error`; a refusal line or the sale line). The window keeps today's
volumes and colours, which differ from one click path to the next, and adds the plain click of a
pointer action itself. The 2.5 s confirmation of a precious sale stays in the window, as 5.2 says.
(e) Addressing is as strict as the windows are. A `[3, i]` ref is valid for the cells the open window
shows: 4 by hand, 9 at a station, none beside a chest, forge or shop; `out`, `lay` and `book` are
refused there too. `lay` and `book` take only a recipe that fits the grid (`inventory.recipeFits`, the
test `recipesFor` makes), since a shaped recipe wider than the grid would be written over other cells.
(f) The sim's side for this stage is `actions.invOp(sim, p, seq, op)`, which `Sim.handle` will call for
`op`. It looks the container up at the window's cell and takes it when an entity of the window's kind
is there; the rest of the re-resolution of 5.2 (the block's `use`, reach, the townsperson's distance,
the once-a-second check, `st {box: null}`) comes with the messages. It builds the context (`rnd` is
`mulberry32(hashInt(rngSeed, seq, 40503, 0))`, made on the first draw; `drop` is `actions.dropItem`;
`flag` is `Sim.addFlag`), sets `ackSeq` and `invDirty`, refuses `_held` and `_slot`, takes the player
out of `realm.viewers` on `close`, and after every accepted op with a container open marks that
container's chunk for saving and bumps a forge's `rev`. The window code did the last for most edits and
not for a cursor drop or an attribute point; the sim does it for all, which only saves a chunk once more.
`rngSeed` is drawn from `sim.rnd` in `join`. This ends the stopgap of D23 and D21 (j): a crafting
modifier is rolled from the op's own stream, and `actions.craft`, `dropHeld` and `pickBlock` are gone.
(g) The client. `Game.op(op)` counts `seq` (ops only: `edit`, `use`, `item` and `fire` are still calls
without one) and applies the op at once through `actions.invOp`; there is no `base`, `pending` or
`pendingSel` yet, so a tick in which the hotbar selection changed sends one `sel`. `Game.sold` mirrors
the open shop's list for the window. The client no longer clears `p.window` each tick (D21 (m)): every
way a window closes sends `close`, and an `open` the client finds nothing to show for is answered with
`close`. The sim's own actions (a placed block, a consumable, an arrow, a pickup, a forge tick, the
coins lost in death) still change a pack or a container directly: they are the authority, and `_held`
and `_slot` exist for the client that will predict them.
(h) `sort` orders equal ranks with `rules.sortCompare`, as 5.2 and D18 say. Nothing else a click,
shift-click, drag, split, craft, equip, drop or trade does has changed: the same 77,000 seeded window
events (clicks, drags, keys, book and shop buttons, the Guide over every kind of window) were played on
the tree before this step and on this one, with the Sort buttons left out, and every sound, toast,
thrown stack and the whole inventory, container, shop and attribute state agreed after each. So did
12,900 more with the Sort buttons in: for the item names that came up the two orders are the same.
(i) Tests. `npm test` is `node scripts/test.mjs`, which runs every `scripts/tests/*.test.ts` through
`scripts/run.mjs` (also `npm run node -- <entry.ts>`), one Node process per file. `tsconfig.server.json`
exists from this step and is the third compile of `npm run check` (D20 (a) expected it with stage 4):
it includes `server` and `scripts`, of which only the tests exist yet.

D26. Stage 1, read again against `8187558` (2.3, 3.3, 4.3, 6.1). Where the one-thread build still differed
from the old tree in a way D20 to D25 do not name, and what was done about each.
(a) `actions.talk` makes no distance test. The "within 5 blocks" of 4.3 is a check of the `talk` message
and arrives with `Sim.handle` (D21 (b)), as the reach check of `use` does. Made in `actions.talk` from
the feet of the player to the feet of the townsperson (`5 + hw`), it refused a click the client's ray
allows: 4 blocks from the eye with 0.15 of padding reaches a townsperson standing up to about 5.8 blocks
above the player, the prompt said "Right-click: trade", and the click went on to place the held block.
When the check arrives it has to pass everything that ray can reach.
(b) `Game.tick` calls `stats.sync` itself, where it always did: after the hotbar and drop keys, before it
reads the movement multipliers and before `interact.tick` reads reach, attack rate and break time. The
sync of the player's step (D21 (d)) stays. With only that one, the body and the hand used the derived
stats of a tick earlier after a pickup, a thrown stack or a change of the held slot.
(c) The creature clock. `Sim.time` is `tick * STEP` (3.3), and the boss and minion code reads it where it
read `Game.time`: the hover bob, the burrower's weave and jaw, a minion's idle orbit, and the 1.2 s and
0.4 s throttles of the cast sound and the footfall. `Game.time` was the frame clock: it started at 0 with
the page, ran on through a pause and a loading screen, and had one value for all the ticks of a catch-up
frame. The sim's clock moves one `STEP` per step and comes back with the saved tick. The motions keep
their shape at another phase, and the throttles count simulated time. No rule, draw or save reads it.
(d) A player who stops being active between two steps is neither ticked nor hurt in the next (6.1,
step 4). In `Game.tick` whatever followed the Recall Stone in that tick still ran. With the client's half
ahead of the step (D21 (d)), a recall that has to load (the bed outside the meshed area, no bed, or
another realm) skips that one step for the player: 1/60 s of hunger, regeneration, buff and portal
timers, and anything a creature or a shot at the destination would have dealt in it.
(e) `event <kind>` typed in the Hollow or the Rift. The command acts on the world (7.10) and events
belong to the Overworld (7.5): the banner and the horn or bell go to the Overworld, the pressure is set
on realm 0, and with nobody there the event ends unseen on the next step. In `Game` the one HUD and the
one `MobSystem` were the caller's, so the same command showed the start banner, gave the dimension the
caller stood in one tick of event pressure and then showed the end banner. Console and harness only.
(f) The 30% roll that decides whether a lit forge puffs is a draw of `shared.rnd` in `tickForge`, where
its `Math.random` sat (D21 (j)): the sim decides and emits burst 11. The particle draws of D21 (j) are
the ones `fxplay.ts` makes to shape a burst. The roll is made on every block tick, as before: up to 4
puffs a second for one forge and 1.2 on average, where 4.6 says at most 2.

D27. Stage 2.0 (3.3 to 3.8, 4, 11). What the contracts step settled where the document was open, and the
places where it built something other than what was written. The sections named carry the result; this
entry is the list.
(a) Boss extension: 24 bytes, not 23 (4.4). Byte 23 is `b.fxm`, the continuous emitters of the tick. D21 (g)
made them sim state because three of the five cannot be told from `kind` and `wind` (the dust of a charge
only during the dash, the dust of a burrow only while it travels, the weave only between attacks), and a
client that guessed them would not draw what stage 1 draws. One byte per boss per snapshot (6.5).
(b) `ProjSim.fire` has `cseq` right after `by`, as 11 writes it, in front of the optional `speed`, `style`,
`knock`, `crit`; the six callers that pass a speed pass `0` before it. It returns the projectile (null when
the pool is full) and takes `lead` last: the lag compensation of 7.3 is flown inside `fire`, because the
`ps` must describe the shot after it and a shot can end during it.
(c) Events of projectiles and drops (3.4, 4.6). The sim names who may be told and the host culls by interest;
the shooter's `ps` and an owned drop's `da` go to that one slot, so the host needs no look-up to route
them. `pe` is emitted for every end, expiry included: the host's known sets then need no sweep of their
own to forget an id, at the price of about 20 bytes per expired projectile to clients that had it.
`Scope {dim}` takes `not`, as stage 1 already used it.
(d) Wire ids are 16 bits for projectiles and drops as well as creatures (4.4 gives the width only for
creatures), from wrapping counters that pass over ids in use.
(e) `SimPlayer` gains `swingSeq`, `usingItem` and `hurtTick` (3.3). The snapshot's player record carries all
three, lane C reads them, lane D's attack and shot count the first, the movement stream sets the second,
and `sim/player.ts` belongs to neither. `actions.attack` and `actions.fire` count a swing, `hurtPlayer`
stamps the tick and adds the 2 blocks of 7.3 to `speedBudget` now; nothing reads them until stage 2 is
integrated.
(f) `rules.ts` also has `bodyFree` and `maxSpeed(stats, canFly)` (11). "Flying is allowed" is the caller's
to say (creative, or flight granted by a command: D28), since the rule has no player. `freeSpot` takes cell
centres at whole heights inside a sphere of 4 cells round the body's cell, nearest first with lower cells
first among equals; it skips columns that are not ready; its second pass (room without footing) is
what "preferred" means in 4.5.
(g) `checkC2S` (4.1) refuses undeclared fields and returns the message itself. It does not judge `hello`
beyond types and loose lengths, and it lets a `hello.proto` of any 16-bit value through, so that a stale
tab gets `version` and a bad name `name_invalid`, not `proto`. The table in 4.1 is every bound it applies;
the ones the document did not give (`d` within 1.01, `fire.o` and `ping` near the range of a body, `cmd.text`
1..200, `step.n` up to 600, `rtt` bounds, `e` and `buy.k` up to 48 characters, `SEQ_MAX`) were chosen here.
(h) Wire forms (4.3): item and modifier keys travel as strings, `''` for none where a key stands alone;
`op` is flat; `open` keeps the cell until integration removes the one-thread reader. `dataHash()` is FNV-1a
over the UTF-16 code units of the five parts joined with `|`.
(i) `client/api.ts` has five crossings 11 did not list: `DigHost.onDig`, `InvChannel.flushSel`, `EditHost`,
`Bodies`, `Ghosts` (3.8). Each is a call from one lane's file into another's that would otherwise have
been agreed between two agents. `nextSeq()` sends a waiting selection itself (3.8, 4.5), which puts that
`sel` in front of the action's `move` instead of behind it.
(j) `Session` (3.8) holds inbound messages for every transport, not only the in-thread one, and delivers
them only in `pump()`. A socket message therefore waits for the next frame's pump instead of running in
the socket's callback; at 60 frames a second that is under 17 ms, inside the interpolation delay, and it
makes a handler run at the same points of a frame on every transport.
(k) `tsconfig.sim.json` includes `net/transport.ts` (2.1), so the pure program checks it before `host.ts`
exists to pull it in. `StorageError` takes `(code, msg)`. `InlineSource` is built here, with the rest of
`chunksource.ts`, as `MemStorage` is with `storage.ts`.
(l) Two test files beyond the two that 11 names: `hooks.test.ts` and `session.test.ts`.
(m) What a solo player can notice: nothing. The new events reach `Game`'s sink and fall through to the
entity store, which acts on none of them (`pe` with how 0 included); ids, random draws and tick order are
as they were.

D28. Stage 2.0 (3.3, 3.6, 4.3, 4.5, 7.10). A flight grant has a place to live. D27 (f) let the movement
check allow flight "granted by a command", and nothing recorded such a grant: `fly` only flipped
`flying` on the one body, which on separate bodies is the host's copy, overwritten by the next move, and
the client was never told. `modes` gains `fly` on `SimPlayer`, in `PlayerRecord` and in the `stats`
message; `flightAllowed(p)` is `creative || fly`; the two commands set it (7.10); the client's body takes
`flying` from a change of that value in `stats` (4.3); and a `flying` flag from a player who may not fly
is not believed (4.5 step 3), which the document had left open. No record of this format has been
written yet, so none lacks the field.
(a) On the one body nothing changes: `flying` after `fly` and after `creative` is what it was, and the
replies are the same.
(b) The body's own `canFly` on the client (double-tap Space takes off and lands) stays
`modes.creative && settings.flyToggle`. A player flying on a grant alone cannot land by double-tap or
by sinking to the ground, as today; `fly` again ends it.
(c) On separate bodies, `fly` typed in creative changes nothing the client hears of: flying is allowed
before and after, so no change reaches the body. On the one body it flips `flying`, which a creative
player otherwise does with a double-tap. With `flyToggle` off that player has no way out of flight but
leaving creative. Console only.
(d) When flight is taken back, the moves the client sent before it heard carry a `flying` flag that no
longer counts; at 24 blocks a second they can overdraw the budget of a body on foot and cost one
correction.

---

## 14. Review log

Two critics read the previous version of this document against the code. Every objection was checked
against the source before it changed anything. 41 raised: 41 accepted (4 of them with a different fix
from the one proposed, 1 only in part), 0 rejected. The design above already contains each change; this
list is the record.

| # | Objection | Verdict | Reason and where it was fixed |
| --- | --- | --- | --- |
| 1 | A block placed where your own body just was is always refused (pillar jump, back-fill) | accepted | True on every transport: `interact.ts:104-107` retries each tick, `game.ts:607` passes on the first clear tick, the host's body was 1 to 3 ticks old. A `move` now precedes every action; own box shrunk 0.05 (4.5, 4.7, D15). |
| 2 | A player whose stored position is inside a block can never move | accepted | `clip` ignores overlapped boxes but the host's space test did not. Embedded rule, position check before every activation, body tests over all of `realm.players`, return check, `collapseGate` for all players (4.5, 9). Doors are not body-tested (as today); the embedded rule covers them. |
| 3 | Dig time and attack cooldown are judged by the spacing of two arrivals | accepted, different fix | Budgets in sim time (4.7, 7.3). The host does not integrate progress with its own flags, which are as stale as the arrivals; it holds the dig to `breakTimeMin` instead. `rej` and refused-action counts added to the lag run. |
| 4 | Single-record saves break atomicity (summon then `kill -9` duplicates the offering) | accepted | Only full commits exist; summon, `bye` and parking request one (3.6, 8.1, D16). |
| 5 | A record is dropped from memory before its commit is durable | accepted, different fix | No read overlay: records and edit maps are simply not evicted while `unsaved`, and a failed batch is re-taken, so storage is never read for a key with a newer version pending (3.6 rule 2, 7.9, 8.1). |
| 6 | `hello` is asynchronous; two sockets can join one record twice | accepted | Per-id join lock, bind with `epoch` and `ackSeq = 0`, inbox of a replaced socket discarded, socket generations in `ws-client` (4.2). |
| 7 | A silent link counts as online: the boss kills the frozen body, no refund | accepted | Stall rule from the movement stream, grace from the last move, boss waits for absent participants, keepalive 5 s / 10 s (4.1, 7.9). Cost stated in R13. |
| 8 | A container can be broken or replaced while open; ops are not re-validated | accepted | `window` holds the cell only; every op re-resolves entity, kind, chunk and distance; `closeViewers` before any removal or spill (5.2). `onBroken` copies stacks into drops (`drops.ts:34`), so the dupe was real. |
| 9 | Loot shares keyed by session slot go to a stranger or to nobody | accepted | Every per-player reference is a record id; shares of ids not in memory go to `shared.owed`, saved with the boss flag, paid at join (7.4, 7.9). |
| 10 | Inbound messages have no schema, coordinate or cost limits | accepted | `net/validate.ts`, `try / catch` per message and around the step, subscription range, `full` only from held sim chunks at 8/s, region directory listing (4.1, 4.7, 8.1). |
| 11 | The manual clock cannot be deterministic; `T.cmd` can hang | accepted | Job-count generation budget, awaited loads, `prepare()` while nobody is active, `&det`, `session.pump()` inside the frame (3.5, 6.1, 10.1). |
| 12 | Ops change state outside the reconcile base; `sort` uses `localeCompare` | accepted | Attributes, points and `sold` are in `st`; `buyBack` by id; code-unit compare (4.3, 5.2, 5.3). |
| 13 | Two subscription orderings end in a chunk that never becomes ready or misses edits | accepted | Nonce per subscription echoed in `ce`; `unsub` before `sub`; re-sub re-sends; a `ce` for a ready chunk is defined (4.7). |
| 14 | A predicted edit can be left unanswered; a reject chain leaves floating blocks | accepted | Sequenced messages are never dropped, `rej` with no cells means resync, `sel` coalesced, adjacency rule for placement (4.1, 4.7, 5.3). |
| 15 | Projectiles are announced only around their spawn point | accepted | Per-connection known set swept at 10 Hz; `ps` carries remaining life (4.6, 6.4). Cairnstar and prismray do reach 95 to 96 blocks (`mobs.ts:698-715`). |
| 16 | The gate registry is trusted without looking at the blocks | accepted | Registry hits are verified against frame cells and footing; entries are dropped when their cells change (3.2, 9). |
| 17 | Edit sets on join are unbudgeted | accepted | `ce` paced at `CE_BYTES` per tick under a 128 KB buffer, nearest first, encoded once per revision, never in the buffer in bulk (4.7, 6.3). |
| 18 | Solo: closing the tab loses up to 30 s | accepted | 3 s debounce, save on pause and hide, prompt while unsaved; residual loss stated; `closetab` smoke; R12 (8.2). |
| 19 | Boss scaling counts bodies within 64 blocks; the lost-connection refund flag is sticky | accepted | `n` also counts anyone who damaged the boss in the last 20 s (amends decision 16, D13); the refund depends on why the fight is ending, not on whether a link was ever lost (7.9). The arrow range in the objection ignores gravity (it is about 80 blocks for the weakest bow, not 136), which is still more than 64. |
| 20 | A chunk in dense form drops unopened generator chests | accepted, different fix | Promotion of in-memory generator entities at the conversion, rather than a per-cell comparison, which would re-roll loot for a chest the player emptied and replaced in the same cell (3.2). |
| 21 | Bandwidth table understates the worst case and `st` | accepted, different fix | Table recomputed from the caps of 7.2 and 7.5, hard bound stated, `st` costed, soak records bytes per stream (6.5). `st` stays a full replacement: a few kB/s for a building player is inside budget and keeps resync to one case. |
| 22 | A rate-limited `chunks` message is dropped and never retried | accepted | `chunks` is never dropped; client flushes at 10 Hz; host queues and paces; 15 s re-subscribe as a net (4.1, 4.7). `world.ts:197-235` does create records every frame. |
| 23 | `Chunk.rev` is already a mesh counter | accepted | The edit revision is `editRev` in `ClientVoxels`; `Chunk.rev` (no reader) is removed (2.3, 4.7). |
| 24 | Applying an edit set bypasses `hasEmit` | accepted | Single `ClientVoxels.write` path sets it; full arrays are scanned; test case added (4.7 rule 5). `light.ts:97` does skip chunks without it. |
| 25 | Decoding `st.inv` with `Inventory.load` would empty the grid and cursor | accepted | `assignWire` specified; `load` only for `PlayerRecord` (5.3). |
| 26 | Opening the Guide from a station, chest, forge or shop closes it on the sim | accepted | `tidy` op; the sim window stays; Back sends nothing (5.2). |
| 27 | Identity must hold for every slot array and container array | accepted | Reconcile writes element by element into the arrays `Windows` captured; one `view.box` per open container; forge `rev` bump (5.3). |
| 28 | Dig-time validation from current body flags rejects breaks finished in the air or under water | accepted | Same fix as 3: `breakTimeMin` and the dig budget (4.7). |
| 29 | A two-tick attack tolerance cannot absorb jitter and stalls | accepted | Same fix as 3: `actCredit` / `useCredit` (7.3). |
| 30 | The subscription cap is smaller than the records `World` keeps | accepted | No count cap: range check at `viewMax + 4`, host-side drop beyond `viewMax + 6` (4.7). `world.ts:345` keeps a square of view + 3. |
| 31 | A player saved while dead comes back alive with 0 hp | accepted | `Sim.join` sets `dead` from `hp <= 0` and sends `dead`; fixture and migration cover it (3.3, 3.6, 8.4). |
| 32 | The golden smoke cannot pass twice; stage 1 changes the random stream | accepted | The golden holds only probes no random draw can change, so it is recorded once (11, stage 0). |
| 33 | Stage 1b moves light-reading rules before the sim has light | accepted | `LightSource` interface in 1a, backed by real light in stage 1 and by the approximation from stage 2; "three rules" corrected to four (3.1, 7.8, 11). |
| 34 | Stage 2 lanes are not file-disjoint | accepted | Replication hooks in the entity sims, `rules.ts` additions, `client/api.ts` and the `interact.ts` split are done in 2.0 and frozen (11). |
| 35 | `T.step` / `simhash` determinism broken by wall-clock budgets and mesh timing | accepted | Same fix as 11 (10.1). |
| 36 | Saving through the sim worker on unload is unreliable | accepted | Same fix as 18 (8.2, R12). |
| 37 | "Stored on first data change" makes nests and forges dirty every block tick | accepted | `touchEnt` is the only promotion and dirtying path, called where `Game` sets `c.modified` today; timers never touch (3.2). |
| 38 | The portal timer pauses with Inventory or Guide open, which the sim cannot see | accepted | Bit 9 `uiOpen` of the move flags (4.5, 7.10). |
| 39 | The shared ray test reads the drawn yaw, which the document made view-only | accepted | The sim keeps and eases `ry`; each side tests the head where it has it (2.3, 7.3). |
| 40 | Townsfolk bodies are kept to 90 blocks, beyond the simulation radius | accepted in part | The failure described (standSpot reading an unloaded chunk) cannot happen: `npcs.ts:98` already requires the home's chunk to be ready, and that test is kept. But the 90-block rule was redundant and a spawned body could be left frozen in a released chunk; the body now exists exactly while its home's chunk is a ready sim chunk (7.7). |
| 41 | The document is stale against HEAD | accepted | Rebased on `8187558`; the smoke runner builds on `scripts/headless.mjs`; `playwright-core` removed from the packages to add (header, 11, D10). |
