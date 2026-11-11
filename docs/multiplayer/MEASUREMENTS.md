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
`npm run smoke -- legacy-make` on commit `4ff2b0d`, whose `src/` is identical to `8187558`. World
`quick-legacyfix`: edits in all three dimensions, a chest with three stacks, an unopened ruin chest
in a chunk edited one cell above it, a furnace saved with 8 ore, 2 bars and burning coal, a bedroll
holding the spawn, the Wayfinder housed in a lit, closed room with a door, a Hollow Gate pair with
saved return points for both sides. World `quick-legacydead`: saved on the death screen, hp 0. Only
modified chunks are in it, as the game saves them; nothing was trimmed by hand.

Command: `npm run smoke -- legacy`. It opens a fresh profile, writes the dump into IndexedDB
"cairnlight" at version 1 from a page of the same origin that runs no game code, opens both worlds in
the current build and checks 61 probes. Passed 3 times in a row on `main`.

## 4. Stage 1b performance (6.6 item 2)

Build: stage 1b with the pool bounds of ARCHITECTURE.md D24 (the commit that adds this section).
Machine, browser and command as in section 1.

What the first measurement of stage 1b found (commit `6dd3790`): sums of 6.9 to 7.0 on a quiet
machine, and anything from 7.1 to 18 with other work running. Per frame, `world` and `render` were
where stage 0 has them (the code under both is unchanged) and the whole rise was in the tick: mean
0.14 to 0.15 ms against 0.10 with the page served cross-origin isolated, which gives it a 5
microsecond clock (0.12 against 0.08 on the 0.1 ms clock of section 1), worst 1.1 to 1.5 ms against
0.4 to 0.7. `EntityStore.begin`, `sync` and `end` each walked every slot of the three pools on every
tick (320 creatures, 600 shots, 160 drops) for about ten live creatures, and `MobSim.boss` and `count`
walked the creature pool on every spawn attempt. Compiled, those loops cost 0.03 ms a tick. In single ticks, a few per flight, one of them
took far longer: `sync` 0.6 to 0.7 ms (once 1.1 ms for the whole of `end`), `boss()` 0.9 ms. Most
likely the engine was running the loop unoptimised just then; that was not confirmed. Those ticks are
what the sum picked up. The loops now stop at the highest slot in use: `begin` and `end` each stay near
0.1 ms on their worst tick, and the mean tick is 0.09 to 0.12 ms on the 5 microsecond clock.

Runs of the build with the bounds, 2026-11-11. The machine was never idle that day, so each row has
the 1-minute load average before and after the run, which `scripts/perf.mjs` now prints:

| Run | load | prof world | prof tick | prof render | prof sum | frame CPU mean / p95 / max | sim mean / p95 / max | over 16.7 ms | missed refreshes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.4, 2.7 | 1.8 | 0.4 | 5.1 | 7.3 | 1.98 / 3.3 / 5.1 | 0.09 / 0.2 / 0.4 | 0 | 0 |
| 2 | 2.7, 3.4 | 1.6 | 1.2 | 4.7 | 7.5 | 2.17 / 3.6 / 4.8 | 0.10 / 0.2 / 1.2 | 0 | 2 |
| 3 | 3.6, 3.8 | 1.6 | 0.6 | 5.4 | 7.6 | 1.95 / 3.1 / 5.6 | 0.10 / 0.2 / 0.6 | 0 | 0 |
| 4 | 2.8, 3.2 | 2.1 | 1.0 | 4.1 | 7.2 | 2.00 / 3.6 / 4.5 | 0.09 / 0.2 / 1.0 | 0 | 0 |
| 5 | 3.2, 3.0 | 1.7 | 0.9 | 5.0 | 7.6 | 2.01 / 3.5 / 5.2 | 0.09 / 0.2 / 0.9 | 0 | 0 |
| 6 | 3.0, 4.3 | 2.0 | 0.5 | 4.4 | 6.9 | 1.94 / 3.3 / 4.6 | 0.10 / 0.2 / 0.5 | 0 | 0 |

Runs 1 to 3 are one `--repeat 3` (median 7.5), runs 4 to 6 another (median 7.2). Against the stage 0
median of 6.6 that is +0.9 and +0.6. Mean frame CPU is 1.94 to 2.17 ms (stage 0: 1.90 to 1.98) and
p95 3.1 to 3.6 ms (3.5 to 3.8).

The stage 0 tree itself, run the same way between those two sets with the load at about 5
(`git archive 4ff2b0d | tar -x -C <dir>`, link this checkout's `node_modules` into it, then
`node scripts/smoke.mjs perf --repeat 3` there): 7.2, 8.2 and 7.1, median 7.2, with frame CPU of
1.96 to 2.17 ms mean and 3.4 to 3.6 ms p95. So on that afternoon's machine the two builds read the
same, and stage 0 read 0.6 above its own record.

Reading the sum on a busy machine. Each of the three values is one frame, and a frame that loses the
CPU for a few milliseconds counts in full. With the load average at 6 to 9 the stage 0 tree gave
14.4, 10.3 and 5.5 (median 10.3) and later 10.7, 44.3 and 13.0 (median 13.0); this build, at loads
of 4 to 8, gave medians of 7.2, 7.7, 7.8 and 11.4, with single runs from 5.8 to 57.7. A sum taken with the
load above about 3 says more about the machine than about the build. What still holds then: the mean
frame CPU and its p95, which did not leave the ranges above in any run, and the stage 0 tree run in
the same minutes.
