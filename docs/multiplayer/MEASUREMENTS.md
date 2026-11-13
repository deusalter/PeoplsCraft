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

## 5. Stage 1c: the end of stage 1 (6.6 item 2, and the checks of section 11)

Build: the commit that adds this section. Machine, browser and commands as in section 1. 2026-11-11,
with other work on the machine throughout (1-minute load average 3 to 9).

Performance. Step 1c changes nothing a flight runs: the tick compares the hotbar selection where it
used to assign it, and the ops run on a click or a key. The gate command, started when the load had
dropped to 3.0:

| Run | load | prof sum | frame CPU mean | sim mean |
| --- | --- | --- | --- | --- |
| 1 | 3.0, 5.0 | 6.7 | 1.85 | 0.09 |
| 2 | 5.0, 7.6 | 6.7 | 1.73 | 0.09 |
| 3 | 7.6, 6.6 | 12.0 | 1.89 | 0.10 |

Median 6.7 against the stage 0 median of 6.6. The same command a few minutes earlier, with the load
going from 2.9 to 7.9 as it ran, gave 9.4, 15.7 and 7.8. To tell the build from the machine, single
flights of this tree and of the stage 1b tree (`git archive 23a143a`) were run turn about, seven
pairs, each started under a load of 3 to 6:

| | prof sums | median | frame CPU mean | sim mean |
| --- | --- | --- | --- | --- |
| this tree | 11.6, 6.5, 4.7, 16.6, 6.9, 5.9, 19.7 | 6.9 | 1.22 to 2.10 | 0.07 to 0.11 |
| stage 1b | 8.3, 4.4, 5.0, 16.4, 6.4, 14.4, 6.3 | 6.4 | 1.31 to 2.08 | 0.07 to 0.10 |

Both trees have the same spread, the same outliers (two of seven runs above 14 in each) and the same
means. And the stage 0 tree, three flights between two sets of this one at loads of 4 to 8: 6.1, 7.4
and 5.6, against 8.1, 6.0, 7.2 and 9.3, 11.4, 5.5. Section 4 says how to read a sum taken on a busy
machine; nothing here shows a cost of this step.

The other checks of "Done when" for stage 1. `npm run smoke -- golden`: all 174 probes match the
stage 0 baseline (every run made in the course of the step). `npm run smoke -- legacy`: all 61 probes, so
a save written before the stage loads after it. `git grep -nE "from '\.\./(game|render|ui|audio|player)" src/sim`
prints nothing. `npm run check` (three compiles and `lint-sim`) and `npm run build` pass.

Inventory ops. `npm test` runs `scripts/tests/invops.test.ts`: 18 cases, one or more per op, each with
an accepted and a refused form, and a seeded run of 20,000 ops (about 7,100 accepted and 12,900
refused, 235 of those not ops at all) that checks after every one that a refused op changed nothing and that
items and coins appeared or vanished only as a craft, a purchase, a sale, a buy-back, a creative
pick or a used-up stack says. Twelve faults put into a copy of `applyOp` one at a time (a source
stack not reduced, a doubled sale price, a missing slot rule, and so on) each made the tests fail.

The window code against the tree before the step: a page script plays seeded DOM events (clicks with
either button and shift, drags, right-drags, number keys and Q over a slot, the recipe book, the
chest and shop buttons, attribute points, G, Back, Esc, E) on windows of every kind, and records
every sound with its volume, every toast with its colour, every thrown stack, and the inventory,
both containers, the shop's buy-back list, attributes and `craft:` flags after each event. 77,757
events over 24 seeds with the Sort buttons left out, and 12,919 more over 4 seeds with them: the
records of the two trees are identical.

## 6. Stage 2: a host and a client, joined in one thread (6.6 item 2, and the checks of section 11)

Build: commit `be17010` (the performance runs were made on it and on `68be03a`, which differ by two lines
no flight runs). Machine and browser as in section 1. 2026-11-11, with other work on the machine
throughout: the 1-minute load average was between 3 and 12, so the comparison is against a control run
in the same minutes, not against the numbers of section 1.

Performance. The control is the stage 0 tree (`git archive 4ff2b0d` into a scratch folder, `node_modules`
linked, a Vite cache folder of its own). `npm run smoke -- perf` was run on the control and on this tree
turn about, fourteen pairs; the load is the 1-minute average when each run ended. One run of this tree
has no result: a source file was edited while it ran and the page reloaded.

| Pair | load | stage 0: sum (world + tick + render) | frame CPU mean / p95 / max | sim mean | load | this tree: sum (world + tick + render) | frame CPU mean / p95 / max | sim mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 9.2 | 7.6 (1.8 + 0.6 + 5.2) | 1.99 / 3.3 / 5.3 | 0.08 | 7.1 | 10.7 (1.9 + 1.9 + 6.9) | 2.01 / 3.3 / 7.0 | 0.20 |
| 2 | 10.2 | 11.9 (1.5 + 3.1 + 7.3) | 2.03 / 3.0 / 8.5 | 0.09 | 11.1 | 5.4 (1.1 + 0.7 + 3.6) | 2.00 / 3.0 / 4.2 | 0.19 |
| 3 | 11.6 | 5.6 (1.4 + 0.4 + 3.8) | 2.00 / 3.2 / 4.0 | 0.08 | 10.5 | 8.9 (1.3 + 2.9 + 4.7) | 1.99 / 3.3 / 7.6 | 0.20 |
| 4 | 9.4 | 8.6 (1.7 + 2.3 + 4.6) | 2.01 / 3.5 / 4.9 | 0.08 | 7.7 | 25.2 (2.3 + 1.6 + 21.3) | 1.93 / 3.3 / 25.2 | 0.19 |
| 5 | 5.4 | 9.4 (1.7 + 1.0 + 6.7) | 2.11 / 3.6 / 6.7 | 0.10 | 9.4 | no result | | |
| 6 | 10.5 | 9.9 (1.3 + 2.0 + 6.6) | 2.04 / 3.3 / 6.6 | 0.09 | 10.9 | 8.0 (1.9 + 1.6 + 4.5) | 1.89 / 3.3 / 4.9 | 0.18 |
| 7 | 10.8 | 12.3 (1.5 + 1.0 + 9.8) | 1.90 / 3.4 / 10.9 | 0.08 | 8.1 | 6.4 (1.8 + 0.8 + 3.8) | 1.88 / 3.4 / 4.5 | 0.19 |
| 8 | 6.3 | 8.6 (2.0 + 0.8 + 5.8) | 1.96 / 3.4 / 5.9 | 0.09 | 5.0 | 8.3 (1.9 + 2.2 + 4.2) | 2.03 / 3.3 / 5.7 | 0.19 |
| 9 | 4.2 | 10.4 (1.3 + 0.5 + 8.6) | 2.03 / 3.2 / 9.1 | 0.09 | 5.4 | 52.0 (1.4 + 3.0 + 47.6) | 2.12 / 3.2 / 47.8 | 0.21 |
| 10 | 5.2 | 6.5 (1.9 + 0.4 + 4.2) | 1.97 / 3.2 / 4.4 | 0.08 | 4.4 | 7.3 (1.9 + 0.9 + 4.5) | 1.90 / 3.3 / 4.9 | 0.18 |
| 11 | 4.0 | 34.8 (1.4 + 3.8 + 29.6) | 1.99 / 3.1 / 33.0 | 0.09 | 4.4 | 11.5 (1.3 + 2.6 + 7.6) | 1.95 / 3.1 / 10.2 | 0.19 |
| 12 | 3.9 | 6.7 (1.4 + 0.4 + 4.9) | 1.92 / 3.1 / 5.0 | 0.08 | 3.4 | 7.5 (2.0 + 0.9 + 4.6) | 1.96 / 3.5 / 4.9 | 0.19 |
| 13 | 3.8 | 6.1 (1.5 + 0.6 + 4.0) | 1.97 / 3.4 / 4.1 | 0.09 | 4.8 | 6.4 (1.8 + 0.8 + 3.8) | 1.89 / 3.4 / 4.2 | 0.18 |
| 14 | 4.3 | 6.6 (1.5 + 0.7 + 4.4) | 1.97 / 3.4 / 4.6 | 0.08 | 4.8 | 41.4 (5.7 + 12.1 + 23.6) | 1.93 / 3.3 / 38.9 | 0.21 |

| | runs | prof sum, median | frame CPU mean, median (range) | p95, median (range) | sim mean | worst tick, median |
| --- | --- | --- | --- | --- | --- | --- |
| stage 0 | 14 | 8.6 | 1.99 (1.90 to 2.11) | 3.3 (3.0 to 3.6) | 0.08 | 0.75 |
| this tree | 13 | 8.3 | 1.95 (1.88 to 2.12) | 3.3 (3.0 to 3.5) | 0.19 | 1.6 |

The median sum is 0.3 ms under the control's, the mean frame and its p95 are the control's. What the
numbers also say:

- The tick costs 0.11 ms more on the mean frame (0.19 against 0.08): it is now the client's tick, a
  step of the host, two pumps of the session and the entity store's tick. One flight with each phase
  timed (load 10): client tick 0.04 ms, host step 0.13 (of which the simulation's step 0.09: creatures,
  shots and drops 0.04, taking in a chunk 0.02), the pumps 0.015, the entity store 0.024. The frame
  as a whole did not grow, because the old tick also filled every view from the simulation's lists
  twice a tick.
- The worst tick is about 0.8 ms higher on the median (1.6 against 0.75). Its largest single item is
  a chunk taken into the simulation (0.3 to 0.6 ms: a 65 KB copy and the two heightmaps), which is why
  a step that runs the world takes in one chunk, not two.
- Frames over 16.7 ms: three of this tree's 13 runs had one (25, 48 and 39 ms), one of the control's 14
  (33 ms). In the earlier batches of the same evening, on trees that are not the final one, it was
  two of nine against none of nine. In every such frame the long phase was `render`. One was caught
  with each call timed: 16.6 ms inside `gfx.render` (the WebGL calls), nothing else above 0.7 ms. The
  control showed the same kind of frame when three of its flights were watched frame by frame (19.8
  and 17.0 ms in one, 10.1 ms in another, and gaps of 280 ms between two frames in two of them).
  Whether this tree has more of them than the control, and if so whether a quiet machine has any, is
  not settled by these runs.

The last commit of the stage (`dfc0549`, 2026-11-12). The same control and this tree turn about, seven
pairs, on a steadier machine: the load was between 3.4 and 5.5 throughout. Each row is one flight of
about 1,200 frames.

| Pair | stage 0: sum (world + tick + render) | frame CPU mean / p95 / max | sim mean | this tree: sum (world + tick + render) | frame CPU mean / p95 / max | sim mean |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 6.7 (1.5 + 1.0 + 4.2) | 2.02 / 3.7 / 4.4 | 0.08 | 6.8 (1.5 + 0.8 + 4.5) | 1.97 / 3.7 / 5.1 | 0.19 |
| 2 | 6.5 (1.8 + 0.5 + 4.2) | 2.08 / 3.8 / 5.3 | 0.08 | 7.1 (2.1 + 0.9 + 4.1) | 2.05 / 3.8 / 4.6 | 0.20 |
| 3 | 6.7 (1.8 + 0.4 + 4.5) | 2.03 / 3.7 / 4.7 | 0.08 | 6.9 (1.7 + 0.9 + 4.3) | 2.04 / 3.8 / 4.9 | 0.20 |
| 4 | 7.1 (1.2 + 0.5 + 5.4) | 2.37 / 3.1 / 5.6 | 0.09 | 5.6 (1.3 + 0.7 + 3.6) | 1.85 / 2.6 / 4.7 | 0.18 |
| 5 | 5.8 (1.2 + 0.8 + 3.8) | 1.93 / 3.1 / 3.9 | 0.08 | 6.5 (1.5 + 0.9 + 4.1) | 1.90 / 3.2 / 4.6 | 0.18 |
| 6 | 6.0 (1.6 + 0.6 + 3.8) | 1.98 / 3.3 / 5.2 | 0.08 | 6.7 (1.5 + 1.0 + 4.2) | 1.93 / 3.5 / 4.7 | 0.18 |
| 7 | 6.8 (1.9 + 0.5 + 4.4) | 2.02 / 3.6 / 4.5 | 0.08 | 6.0 (1.4 + 0.8 + 3.8) | 1.95 / 3.4 / 5.1 | 0.19 |

| | runs | prof sum, median | frame CPU mean, median (range) | p95, median (range) | sim mean | worst tick, median |
| --- | --- | --- | --- | --- | --- | --- |
| stage 0 | 7 | 6.7 | 2.02 (1.93 to 2.37) | 3.6 (3.1 to 3.8) | 0.08 | 0.5 |
| this tree | 7 | 6.7 | 1.95 (1.85 to 2.05) | 3.5 (2.6 to 3.8) | 0.19 | 0.9 |

The median sums are equal, against a budget of 1.0 ms, and the mean frame is not above the control's.
The tick is where it was on `be17010`: 0.11 ms more on the mean frame and 0.4 ms more on its worst.
No frame of the fourteen flights took over 16.7 ms and none missed a refresh, so the long `render`
frames of the busier evening above did not show on either tree here.

What was changed on the way. As first built, two flights gave worst ticks of 4.3 and 2.0 ms and a
mean of 0.25. Then: no transaction for a chunk that has no record; a chunk's light-giving cells found
by the worker that generates it; one chunk taken in per step that runs the world; the workers fed
from their own answers, not from inside a step; mesh jobs for chunks whose edit set arrived in a
frame sent right after the frame. Single flights with each phase timed then gave worst ticks of 0.6
to 1.2 ms and a mean of 0.14 to 0.19. Generating in the page's thread would add about 1.2 ms a chunk
(Overworld, 40 chunks timed in the page), which is why it is not done (D35 (c)).

Loading. From the page's start to the player in play, three runs each: 1.26, 1.27 and 1.44 s against
0.93, 0.93 and 1.08 s for the stage 0 tree. A crossing to the Hollows: 0.6 s against 0.3 to 0.4 s (read
at 0.1 s steps). The simulation now takes in its own 121 chunks before a player is put in play.

Risk R11 (creatures drawn 4 ticks in the past). Ten blows on a creature held still, frames counted
from the click: the hit mark comes in the frame of the click, as before (1 frame in the stage 1 tree
and in this one); the creature's flash and recoil come 7 to 9 frames after it (about 120 to 150 ms),
where the stage 1 tree shows them in the frame of the click. The frames are those of the test's own
pacing, which run a little under 60 a second.

Light. From this stage the spawn rules and the sun-burn rule read the two approximations of 7.8
(D7, D31 (a)); nothing was counted. A sim chunk of the Overworld holds 99 light-giving cells on the
median and 1,852 at most (121 chunks round a spawn), of the Hollows 227 and 654, of the Skyrift 20 and
320; one block-light question costs about 9 microseconds in the Hollows and 1.5 in the Skyrift.

The checks of "Done when" for stage 2.

- `npm run smoke -- golden` and `npm run smoke -- golden '?clone'`: all 174 probes match the stage 0
  baseline. During the run the host corrected no movement, refused no edit, blow or shot, and the
  client resynced no chunk.
- `npm run smoke -- legacy` (and with `'?clone'`): all 66 probes. The 61 of before, and five new ones:
  the database is at version 2, the `backup` store holds the old record of each of the two worlds
  equal to the fixture's, it holds nothing else, and every old `chunks` record is still what the
  fixture loaded.
- A world made by the stage 1 build (`56e7a42` in a scratch worktree: a levelled site, two blocks
  broken and two placed by hand, a chest with two stacks, a furnace mid-smelt, a bed, a place and a
  look to stand with), its database dumped as `scripts/fixtures/legacy.mjs` dumps one and written into
  a fresh profile at version 1, opens in this build with the body where it stood (within 0.01 blocks,
  yaw and pitch kept), all six probed cells, the chest, the six items of the furnace, the bed, the
  flags, the counts of seven items and the tick going on from the saved one; saved by this build and
  opened once more, it is the same.
- `git grep -n "integration:" src` prints nothing. Of the client, only `src/dev.ts` imports
  `sim/sim.ts` (a type, for `T.sim`); `src/main.ts` reaches it through `net/host.ts`.
- `npm test`: 13 files. `npm run check` and `npm run build` pass.
- Beyond the list: the title menu makes a world, the pause menu saves it, it is listed with its
  level and opens where it was left; a tab closed 0.3 s after a change, with nothing but the page's
  own save at `beforeunload`, has the change when it is opened again; a bow shot, a kill by arrows, a
  cast, a salve, a thrown stack picked up again, a shop, a night slept through and a placement out of
  reach (shown, refused, undone) each behave on both sides; the client's estimate of the host's tick
  stays within 1.5 ticks of it across a pause, a loading screen and a crossing.
