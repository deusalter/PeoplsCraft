// Loading (section 6, Loading): the mark, a channel sunk in the ground tile that fills in ember, and one line.
import type { Screen } from '../node';
import { sunk } from '../parts/common';
import { lit } from '../parts/gauges';
import { titleMark } from '../parts/keycap';
import { groundMenu, line } from '../parts/menu';
import { LOADING_STEPS } from '../sample/menus';
import { go } from './books-common';
import type { NamedScreen } from './index';

export interface LoadingView {
  /** 0 to 1; the channel never runs back, so a smaller value than the last is held at the last. */
  done(t: number): number;
  /** What is being done. */
  doing(t: number): string;
  /** On a server, how many are there. */
  here?: string;
  onGiveUp(): void;
}

const GAUGE_W = 182, GAUGE_H = 7;

export const loadingScreen: Screen<LoadingView> = (v, ui) => {
  let high = 0;
  return groundMenu(ui, 'loading', [
    titleMark({ cx: 213, y: 60 }),
    {
      x: 122, y: 130, w: GAUGE_W, h: GAUGE_H, anim: true,
      paint: (s, live) => {
        sunk(s, 0, 0, GAUGE_W, GAUGE_H, 'ground');
        high = Math.max(high, v.done(live.t));
        const n = lit(high, GAUGE_W - 2);
        if (n) s.fill(1, 1, n, GAUGE_H - 2, 'ember');
      },
    },
    {
      x: 113, y: 142, w: 201, h: 11, anim: true,
      paint: (s, live) => {
        const said = v.here ? `${v.doing(live.t)}, ${v.here}` : v.doing(live.t);
        line({ x: 0, y: 0, w: 200, text: said, c: 'root.4', shadow: true, centre: true }).paint!(s, live);
      },
    },
  ], { on: { key: (e) => { if (e.key === 'Escape') { v.onGiveUp(); return true; } } } });
};

// The sample stands a third of the way for its first three seconds, so that a shot taken as the page opens is the
// frame the grid check models, then fills to full in ten.
const sampleDone = (t: number) => Math.min(1, 0.34 + Math.max(0, t - 3) * 0.066);
const view = (here?: string): LoadingView => ({
  done: sampleDone,
  doing: (t) => LOADING_STEPS[Math.min(LOADING_STEPS.length - 1, Math.floor(sampleDone(t) * LOADING_STEPS.length))],
  here,
  onGiveUp: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'loading', title: 'Loading', world: false, build: (ui) => loadingScreen(view(), ui) },
  { name: 'loading-server', title: 'Loading, joining a server', world: false, build: (ui) => loadingScreen(view('3 of 8 here'), ui) },
];
