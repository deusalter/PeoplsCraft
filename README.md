# Peopls Craft

A first-person voxel sandbox RPG for the browser. Mine, build and survive in a procedurally
generated world, then keep going: ten material tiers, eight summoned bosses, two extra
dimensions, townsfolk, world events and a guide that always names the next step.

Everything is generated at runtime. There are no image, model or audio files in this repo.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
npm run check      # the three type-checks (client, simulation, scripts) and the simulation lint
npm test           # unit tests of the simulation, the host and the pure client code under plain Node, no browser
npm run smoke -- golden   # a scripted play-through in headless Chrome, compared with a recorded baseline
                          # (add '?clone' to take every message between client and host through JSON)
```

Needs a WebGL2 browser. Worlds are saved to IndexedDB in that browser: 3 seconds after you change a
block, a chest or your inventory, when you pause, when you switch away from the tab, when you quit to the
title, and every 30 seconds while you walk. Closing the tab can therefore lose at most the last 3 seconds of
building and the last 30 seconds of walking, and the world always opens as one consistent moment.

## Controls

| Key | Action |
| --- | --- |
| W A S D, Space, Shift | Move, jump / swim up, sneak |
| R, Ctrl or double-tap W | Sprint |
| Left mouse | Mine, attack, fire |
| Right mouse | Use, place, eat, talk |
| Middle mouse | Pick the targeted block into your hand |
| E / G | Inventory and crafting / Guide |
| H | Use the best salve in your pack |
| 1-9, wheel, Q | Hotbar, drop item |
| F3 / F1 | Debug overlay / hide HUD |
| T | Command line (`give`, `time`, `tp`, `gear`, `boss`, `locate`, `dim`, `creative`, `god` ...) |
| Double-tap Space | Take off / land while in `creative` |
| Esc | Pause, settings |

In windows: shift-click moves a stack, right-click takes half or places one, double-click gathers
a stack, and 1-9 sends the hovered stack to that hotbar slot. In the recipe book, click lays a
recipe out, right-click crafts one and shift-click crafts as many as you can afford.

Settings worth knowing about: interface scale, screen shake, auto-jump, automatic tool switching,
edge smoothing (FXAA) and eye adaptation on the medium and high presets, and sun shadows plus
MSAA on the high preset.

## How it is put together

```
src/
  core/        constants, seeded noise
  data/        every table: blocks, items, recipes, mobs + bosses, loot, npcs, quests, biomes, dims
  world/       the client's chunks: scheduling, worker pool and worker entry, lighting, greedy mesher (world.ts
               keeps the block data in a ClientVoxels and meshes it)
    gen/       climate, overworld, the two dimensions, structures
  sim/         the whole simulation, with no Three.js and no DOM: Sim (three realms, the players, shared state,
               one seeded random stream, one step at a time), the sim's own chunks and edit maps (voxels.ts),
               approximate light, creatures + AI, boss brain, spawning, projectiles, drops, loot, world events,
               townsfolk, the guide, what a player's messages ask for (actions.ts), the check of the movement
               a client reports (movement.ts), gates, travel, block ticking, cheats;
               swept-AABB physics, the player body, inventory + crafting, stats, fluids, shared rules,
               the chunk generation job, the storage interface and the conversion of old saves;
               invops.ts: every change to a pack, the cursor, the crafting grid, equipment, a shop or an
               open chest or forge is one op, carried out by its applyOp and by nothing else
  net/         the wire between a host and a client, and both ends of it that need no screen:
               protocol.ts (every message), snapshot.ts (the two binary ones), codec.ts, validate.ts,
               transport.ts (the two ends of a connection), loopback.ts (both ends in one thread) and
               worker-client.ts (the page's end of the connection to the simulation's worker);
               host.ts (SimHost: connections, hello, checked dispatch, the step, saving) with hostchunks.ts
               (chunk subscriptions and edit sets) and hostsnap.ts + interest.ts (snapshots, events and who
               is told what); clientvoxels.ts (the client's block data) and invsync.ts (inventory reconcile)
  client/      the client's side of the connection: session.ts (messages in, actions out, in the order a host
               must see them), blocks.ts (predicted break, place and door), combat.ts (what a click does),
               invclient.ts (inventory ops and the mirrors the HUD reads), entities.ts (creatures, shots and
               drops from snapshots and events), fxplay.ts, api.ts (what these modules ask of each other),
               poolsource.ts (terrain for a simulation in the page, from the page's chunk workers)
  storage/     idb.ts: worlds in IndexedDB (database "cairnlight" version 2), the world list for the title
               menu, and the migration of saves made before the simulation was split from the client
  render/      atlas + texture painters, shaders, renderer/sky/post (gfx.ts), instanced batches, icons, item models,
               creatures, projectiles and drops as drawn (mobView, projView, dropView)
  player/      input, first-person camera, block targeting and mining progress
  ui/          HUD, windows (inventory / crafting / chest / forge / shop / guide: they draw the state and
               send ops), guide tracker, menus, debug overlay
  audio/       synthesized effects and generative music
  dev/         the data cross-check that runs at startup in development
  game.ts      the client: view, input, HUD and audio, the local player's body; it knows the simulation only
               through its session
  main.ts      the title menu, then a host for the chosen world and a game connected to it
  sim-worker.ts  the simulation's own thread in solo play: the same host, on IndexedDB, generating its terrain
  dev.ts       window.T
scripts/
  headless.mjs   the game in headless Chrome with the real GPU, for automated checks
  smoke.mjs      smoke scenarios on top of it: golden/ (the scripted play-through and its baseline),
                 fixtures/ (a save made by the build before the simulation was split out), perf.mjs,
                 closetab.mjs, det.mjs, twotab.mjs, solofar.mjs, tpfar.mjs
  run.mjs        bundle a TypeScript entry and run it under Node
  test.mjs       npm test: every tests/*.test.ts through run.mjs
  lint-sim.mjs   keeps src/sim free of wall-clock time, unseeded randomness, logging and client imports
docs/multiplayer/  the plan for co-op (ARCHITECTURE.md) and what was measured on the way (MEASUREMENTS.md)
```

Design notes worth knowing before changing things:

- **Simulation and client.** `src/sim` decides everything that happens in the world and never draws,
  plays or reads input; it compiles on its own without the DOM (`tsconfig.sim.json`) and
  `scripts/lint-sim.mjs` fails the check if it reaches for the clock, `Math.random`, the console or
  a client file. A `SimHost` owns one simulation and its storage, and speaks to clients in messages.
  `Game` is a client: it owns the local player's body and camera, tells the host where the body is
  and what the hands do, shows a break, a placement or an inventory change at once and takes the
  host's word when it differs, and draws creatures from the host's snapshots. In solo play the host
  runs in a Web Worker of its own (`src/sim-worker.ts`): it keeps its own clock, 60 steps a second,
  generates the terrain it simulates inside its steps, and saves to IndexedDB; the page sends it
  messages and draws what comes back. Pausing, or switching away from the tab, stops the world, as
  does a loading screen. `?quick` runs the host in the page's own thread instead, joined by
  `net/loopback.ts` and stepped by the game's frames (`&worker` puts it in the worker, still stepped
  by the frames). The client shares rules and tables with the simulation (`sim/rules.ts`,
  `sim/invops.ts`, the physics) but reaches the running one only through its session: no client file
  but `main.ts` and `dev.ts` imports `sim/sim.ts`. The co-op plan adds a Node server for friends, on
  the same messages.
- **Inventory ops.** A click in a window does not move an item. The window sends an op
  (`click`, `quick`, `book`, `buy` ...) and `applyOp` in `sim/invops.ts` carries it out or refuses it,
  returning the sound and the line to show. A refused op changes nothing.
- **Chunks** are 16x256x16 `Uint8Array`s, column-major. Generation and lighting+meshing run in a
  worker pool; the main thread only schedules (nearest first) and uploads inside a time budget.
- **Lighting** is recomputed per mesh job over the 3x3 chunk neighbourhood. Light travels at most
  15 blocks and a chunk is 16 wide, so the centre chunk is exact with no cross-chunk light state.
  Block light is RGB (three flood fills), sky light is a fourth channel.
- **Meshing** is greedy per slice. Faces merge only when their four corners share lighting and tint,
  so smooth lighting and AO stay correct. Water tops are deliberately left unmerged so the vertex
  wave has no T-junction cracks. One mesh per chunk per material (opaque, cutout, translucent).
- **Rendering** is linear HDR into a float target, then bloom, eye adaptation, ACES tone mapping,
  FXAA and vignette. Fog and height mist sample the same sky function the sky dome uses, so distant
  terrain fades into the real sky colour. Clouds are a ray-marched blocky slab that also shades the
  ground. The sun shadow map is redrawn on alternate frames unless something that casts is moving.
- **Creatures** are box sculptures drawn through a single instanced mesh; particles are a second one.
  A model is a list of `Part` boxes that can be rotated, parented to an earlier box's joint, shown
  only in some boss phases, given a surface pattern and driven by an animation tag. The full list of
  fields and tags is in the comment above `Part` in `data/mobs.ts`.
- **Saves** hold one world record, one record per player and, per chunk, only the cells that differ
  from generated terrain (plus its chests and forges). A save writes everything that changed in one
  transaction. Each chunk record remembers which block-id table it was written with, so the block
  list can change between builds. A world saved by an older build is converted the first time it is
  opened; its old record is kept as a backup.

## Adding content

All content is data. Nothing below needs engine changes.

- **Block**: add a line to `INIT` in `data/blocks.ts`, and a painter for each new texture name in
  `render/textures.ts`. It gets an inventory item and an isometric icon automatically.
- **Item**: add to `data/items.ts`. A new **material tier** is one entry in `TIERS`: tools, four
  weapons and four three-piece armour sets (with set bonuses) and their recipes are generated from it.
- **Recipe**: `data/recipes.ts`, shaped (`shape` + `key`) or shapeless (`in`).
- **Creature**: `data/mobs.ts`: stats, an AI archetype, a parts list (or a builder such as
  `quad`/`biped`/`flyer`), drops and spawn rules.
- **Boss**: same file. Phases are lists of attack primitives (`charge`, `slam`, `volley`,
  `spiral`, `rain`, `ring`, `summon`, `teleport`, `beam`, `burrow`) with their own numbers.
- **Structure**: `world/gen/structures.ts`: a grid cell size, a chance and a `build` function.

`dev/validate.ts` cross-checks every reference at startup in development and logs problems.

## Testing hooks

- `?quick=<seed>` skips the menu into a throwaway world; add `&fresh` to wipe it first, `&worker` to
  run its host in the worker, `&det` to make two runs of one script step for step alike.
- `window.T` drives the game without real input or `requestAnimationFrame`
  (`T.run(ms)`, `T.loaded()`, `T.step(n)`, `T.key`, `T.click`, `T.grab`, `T.cmd('give iron_sword')`;
  `T.ask((sim, arg) => ...)` reads the simulation wherever it runs).
  Background tabs throttle `requestAnimationFrame`, so automated checks must use these.
- `T.showcase(['b_colossus', 'woolback'])` lines creatures up, frozen, on a platform, and
  `T.orbit(angle)` walks the camera round them.
- `npm run smoke -- golden` plays a fixed script (mine, build, craft, chest, forge, boss, gate, death,
  save and reload) and compares what no random draw can change with `scripts/golden/baseline.json`;
  `npm run smoke -- legacy` opens a save written by an older build; `npm run smoke -- perf` is a timed flight
  (`--solo` flies a world made in the title menu). `closetab` closes the tab 4 s and 1 s after a change and
  opens the world again, `det` runs one script twice and compares, `twotab` upgrades the database under an
  old tab, `solofar` checks that nothing far away is culled, `tpfar` times the worker's steps on far jumps.
  Run them one at a time.
- `?gallery` shows every block tile (as a 2x2 repeat, so seams show) and every item icon enlarged;
  `?gallery=tiles&scale=6` and `?gallery=icons` narrow it down.

## Not in the game

Stated plainly so nobody goes looking: no flowing-water levels (water only seeps into gaps,
lava is static), no buckets, no farming or saplings, no drowning, torches stand on floors only,
furnace and chest fronts do not rotate to face you, dungeons have no surface entrance.
