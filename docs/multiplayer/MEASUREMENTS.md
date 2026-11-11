# Peopls Craft multiplayer: measurements

Numbers that later stages are held to (ARCHITECTURE.md 6.6). Every row says how to reproduce it.

## 1. Stage 0 performance baseline (6.6 item 1)

Build: commit `1181ef6` plus the scenario itself (no source changes under `src/` since `8187558`).
Machine: Apple M2, macOS 26.0.1, Google Chrome 157.0.8103.39 headless through `playwright-core`
(ANGLE on Metal, real GPU, `requestAnimationFrame` at 60 Hz), 1280x720, device scale 1.

Command:

```
npm run smoke -- perf --repeat 3
```

What it does (`scripts/perf.mjs`): fresh `?quick=perf` world, settings `{ gfx: { renderDist: 12 } }`
over the medium preset, wait until the whole view is meshed, `god`, `creative`, lift 20 blocks, then
hold W heading east (11 blocks/s, no sprint) for 20 s while `requestAnimationFrame` drives the game
by itself (no `T.run` during the flight). Each run writes its numbers to `out/perf/<time>.json`.

- `game.prof` worst: the largest single-frame value over the flight of `world` (chunk scheduling,
  uploads), `tick` (the fixed-step simulation) and `render` (camera, scene update, draw submission,
  HUD, audio). This is the sum that 6.6 item 2 compares.
- frame CPU: wall time of one `Game.runFrame` call (CPU only; GPU work that the driver queues is not
  in it). sim: the `tick` portion of the same frame.
- over 16.7 ms: the share of frames whose CPU time exceeded one 60 Hz refresh. Missed refreshes:
  frame-to-frame intervals over 25 ms.

Three runs, 2026-11-11 (about 1,200 frames and 219 blocks flown each):

| Run | prof world | prof tick | prof render | prof sum | frame CPU mean / p95 / max | sim mean / p95 / max | over 16.7 ms | missed refreshes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.8 | 0.6 | 4.2 | 6.6 | 1.98 / 3.8 / 4.8 | 0.08 / 0.2 / 0.6 | 0 | 0 |
| 2 | 1.7 | 0.7 | 4.5 | 6.9 | 1.92 / 3.7 / 4.7 | 0.08 / 0.2 / 0.7 | 0 | 0 |
| 3 | 1.4 | 0.5 | 3.9 | 5.8 | 1.90 / 3.5 / 4.1 | 0.08 / 0.2 / 0.5 | 0 | 0 |
| Spread | 0.4 | 0.2 | 0.6 | 1.1 | 0.08 / 0.3 / 0.7 | 0 / 0 / 0.2 | | |

All values in ms. `performance.now()` is coarsened to 0.1 ms in this page (it is not cross-origin
isolated), so every per-frame figure is a multiple of 0.1.

What "within 1.0 ms" can mean. The prof sum is a sum of three single-frame maxima and moved by 1.1 ms
between identical runs, so one run of it cannot tell a 1.0 ms regression from noise. Later stages
should compare the median of three runs of the prof sum (baseline median 6.6 ms) and, as the steadier
check, the mean frame CPU (baseline 1.90 to 1.98 ms) and its p95 (3.5 to 3.8 ms). The sim portion is
small enough here (mean 0.08 ms, worst 0.7 ms) that the 6.6 tick budget is the number to watch once
the sim leaves the main thread, not this one.

## 2. Stage 0 golden run

Command: `npm run smoke -- golden` (compare) or `npm run smoke -- golden --record` (rewrite
`scripts/golden/baseline.json`). One run takes about 40 s. Passed 5 times in a row on `main`
(commit `fa71b5e`), and 3 more times run three at once on the same machine, so it does not depend on
having the CPU to itself.

The run, on a fresh `?quick=golden` world (seed 386248004): level an 11x11 pad at the spawn; give
and `gear 2`; break three blocks and place two by held and clicked buttons; a pillar jump (Space and
the right button held, looking down; the player must rise at least 4 blocks); a back-fill (walk out of
a cell, place into it); craft by hand in the inventory grid and from the recipe book (planks, sticks,
a workbench, torches); a chest filled by a shift-click and a carried stack; smelt three iron ore;
place a bedroll and set the spawn; spawn and kill a Thornling and a Burrowhog with melee; place the
Rootbound Altar, summon the Mossback Colossus with the Verdant Idol and kill it; place a Hollow Gate,
walk into it, walk back out of the return gate; fall to death, press "Rise again", respawn at the
bed; save, reload without `&fresh`, read everything again. 174 probes.

Left out of the baseline on purpose, because a random draw or the length of the run changes them:
coins, experience and level; anything that can be picked up from a drop (cobble from mined stone,
the Colossus's iron bars and salves); whether the furnace is still lit at the end (its coal outlasts
the smelt by a time that depends on the run, so the probe reads `furnace` for both); how far above 4
blocks the pillar went; absolute player positions (only "same before and after the reload"); where
the return gate stands in the Hollows (it depends on where in the sheet the player stood).

For later stages: in headless Chrome both `requestAnimationFrame` and `T.run` call `Game.runFrame`, so
the game advances about twice as fast as the wall clock while a scenario runs. The golden waits on
conditions, never on a fixed time, so a stage that changes the pacing (the manual clock of 10.1) should
still match. No step was impossible on the current build.

## 3. Stage 0 legacy fixture

`scripts/fixtures/legacy-v1.json` (57 KB, 2 world records, 7 chunk records) was made by
`npm run smoke -- legacy-make` on commit `fa71b5e`, whose `src/` is identical to `8187558`. World
`quick-legacyfix`: edits in all three dimensions, a chest with three stacks, an unopened ruin chest
in a chunk edited one cell above it, a furnace saved with 8 ore, 2 bars and burning coal, a bedroll
holding the spawn, the Wayfinder housed in a lit, closed room with a door, a Hollow Gate pair with
saved return points for both sides. World `quick-legacydead`: saved on the death screen, hp 0. Only
modified chunks are in it, as the game saves them; nothing was trimmed by hand.

Command: `npm run smoke -- legacy`. It opens a fresh profile, writes the dump into IndexedDB
"cairnlight" at version 1 from a page of the same origin that runs no game code, opens both worlds in
the current build and checks 61 probes. Passed 3 times in a row on `main`.
