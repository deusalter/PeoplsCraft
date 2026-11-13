// Loading (section 6, Loading): the mark, a picture of what is being raised, a segmented strip that fills in ember,
// and one line under it.
import type { Screen } from '../node';
import { LOADING_PICTURES } from '../art/loading';
import { sunk } from '../parts/common';
import type { Surface } from '../surface';
import { lit } from '../parts/gauges';
import { titleMark } from '../parts/keycap';
import { groundMenu, line } from '../parts/menu';
import { LOADING_STEPS } from '../sample/menus';
import { go } from './books-common';
import { HERE } from '../sample/crew';
import type { NamedScreen } from './index';

export interface LoadingView {
  /** 0 to 1; the channel never runs back, so a smaller value than the last is held at the last. */
  done(t: number): number;
  /** What is being done, and which of the pictures shows it: 0 the ground, 1 the villages, 2 and 3 the hearths. */
  doing(t: number): string;
  step(t: number): number;
  /** On a server, how many are there. */
  here?: string;
  onGiveUp(): void;
}

// The strip: a frame of root.0 round sixteen segments of 10 with cuts of one between, 177 by 5 in all.
const SEGS = 16, SEG = 10, STRIP_W = SEGS * (SEG + 1) + 1, STRIP_H = 5;
const PICTURES = [LOADING_PICTURES.ground, LOADING_PICTURES.house, LOADING_PICTURES.hearth, LOADING_PICTURES.hearth];

/** The segmented strip, filled unit by unit along its segments: empty root.2, full ember with a lit top row. */
function paintStrip(s: Surface, f: number): void {
  s.fill(0, 0, STRIP_W, STRIP_H, 'root.0');
  const n = lit(f, SEGS * SEG);
  for (let k = 0; k < SEGS; k++) {
    const x = 1 + k * (SEG + 1);
    const full = Math.max(0, Math.min(SEG, n - k * SEG));
    s.fill(x, 1, SEG, 3, 'root.2');
    if (full) { s.fill(x, 1, full, 1, 'ember.lt'); s.fill(x, 2, full, 2, 'ember'); }
  }
}

export const loadingScreen: Screen<LoadingView> = (v, ui) => {
  let high = 0;
  return groundMenu(ui, 'loading', [
    titleMark({ cx: 213, y: 60 }),
    {
      x: 197, y: 106, w: 32, h: 32, anim: true,
      paint: (s, live) => { s.map(PICTURES[v.step(live.t)], 0, 0); },
    },
    {
      // The strip lies in a dark well sunk in the tile, 2 units of floor round it, so that it stands off the courses.
      x: 213 - Math.floor(STRIP_W / 2) - 3, y: 141, w: STRIP_W + 6, h: STRIP_H + 6, anim: true,
      paint: (s, live) => {
        sunk(s, 0, 0, STRIP_W + 6, STRIP_H + 6, 'ground');
        high = Math.max(high, v.done(live.t));
        s.translate(3, 3);
        paintStrip(s, high);
        s.translate(-3, -3);
      },
    },
    {
      x: 113, y: 154, w: 201, h: 11, anim: true,
      paint: (s, live) => {
        const said = v.here ? `${v.doing(live.t)}, ${v.here}` : v.doing(live.t);
        line({ x: 0, y: 0, w: 200, text: said, c: 'salt', shadow: true, centre: true }).paint!(s, live);
      },
    },
  ], { on: { key: (e) => { if (e.key === 'Escape') { v.onGiveUp(); return true; } } } });
};

// The sample stands a third of the way for its first three seconds, so that a shot taken as the page opens is the
// frame the grid check models, then fills to full in ten.
const sampleDone = (t: number) => Math.min(1, 0.34 + Math.max(0, t - 3) * 0.066);
const stepAt = (t: number) => Math.min(LOADING_STEPS.length - 1, Math.floor(sampleDone(t) * LOADING_STEPS.length));
const view = (here?: string): LoadingView => ({
  done: sampleDone,
  doing: (t) => LOADING_STEPS[stepAt(t)],
  step: stepAt,
  here,
  onGiveUp: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'loading', title: 'Loading', world: false, build: (ui) => loadingScreen(view(), ui) },
  { name: 'loading-server', title: 'Loading, joining a server', world: false, build: (ui) => loadingScreen(view(`${HERE} of 8 here`), ui) },
];
