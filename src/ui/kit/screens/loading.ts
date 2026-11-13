// Loading (section 6, Loading): the mark, a segmented strip 20 under it that fills in ember, and one line 6 under that.
import type { Screen } from '../node';
import { TITLE_MARK } from '../art/title';
import { sunk } from '../parts/common';
import { paintStrip } from '../parts/hud';
import { titleMark } from '../parts/keycap';
import { groundMenu, line } from '../parts/menu';
import { LOADING_STEPS } from '../sample/menus';
import { HERE } from '../sample/crew';
import { go } from './books-common';
import type { NamedScreen } from './index';

export interface LoadingView {
  /** 0 to 1; the strip never runs back, so a smaller value than the last is held at the last. */
  done(t: number): number;
  /** What is being done. */
  doing(t: number): string;
  /** On a server, how many are there. */
  here?: string;
  onGiveUp(): void;
}

/** The strip: the HUD's thin strip, 182 by 5, in eighteen segments, as wide as the hotbar. */
const STRIP_W = 182, STRIP_H = 5, SEGMENTS = 18;
const MARK_Y = 60;
const STRIP_Y = MARK_Y + TITLE_MARK.h + 20;
// The line stands 6 under the strip, 3 under its well.
const LINE_Y = STRIP_Y + STRIP_H + 6;

export const loadingScreen: Screen<LoadingView> = (v, ui) => {
  let high = 0;
  return groundMenu(ui, 'loading', [
    titleMark({ cx: 213, y: MARK_Y }),
    {
      // The strip lies in a dark well sunk in the tile, 2 units of floor round it, so that its empty segments stand off
      // the dark courses.
      x: 213 - Math.floor(STRIP_W / 2) - 3, y: STRIP_Y - 3, w: STRIP_W + 6, h: STRIP_H + 6, anim: true,
      paint: (s, live) => {
        sunk(s, 0, 0, STRIP_W + 6, STRIP_H + 6, 'ground');
        high = Math.max(high, v.done(live.t));
        paintStrip(s, { x: 0, y: 0, w: STRIP_W, f: high, tones: ['ember.lt', 'ember', 'ember.dk'], segments: SEGMENTS, thin: true }, 3, 3);
      },
    },
    {
      x: 113, y: LINE_Y, w: 201, h: 11, anim: true,
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
  here,
  onGiveUp: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'loading', title: 'Loading', world: false, build: (ui) => loadingScreen(view(), ui) },
  { name: 'loading-server', title: 'Loading, joining a server', world: false, build: (ui) => loadingScreen(view(`${HERE} of 8 here`), ui) },
];
