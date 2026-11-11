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
