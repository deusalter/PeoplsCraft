// Loading (section 6, Loading): the mark, a sunk track 20 under it that fills in ember, and a readout 6 under that.
import type { Screen } from '../node';
import type { Surface } from '../surface';
import { TITLE_MARK } from '../art/title';
import { sunk } from '../parts/common';
import { titleMark } from '../parts/keycap';
import { groundMenu } from '../parts/menu';
import { LOADING_STEPS } from '../sample/menus';
import { HERE } from '../sample/crew';
import { measure, rightX } from '../font/measure';
import { cut } from '../font/wrap';
import { go } from './books-common';
import type { NamedScreen } from './index';

export interface LoadingView {
  /** 0 to 1; the strip never runs back, so a smaller value than the last is held at the last. */
  done(t: number): number;
  /** What is being done. */
  doing(t: number): string;
  /** Which stage that is, from 1, and how many there are, so that a long stall reads as a stage that is slow. */
  stage(t: number): [n: number, of: number];
  /** On a server, how many are there. */
  here?: string;
  onGiveUp(): void;
}

/**
 * The track: a hollow 182 by 7 sunk in the tile, as wide as the hotbar, `root.0` along its top and left and the tile's
 * light edge along its bottom and right, filling in ember over eighteen segments. A thin strip set 3 inside a wider
 * well lost its top edge to the dark courses and read as a hairline.
 */
const TRACK_W = 182, TRACK_H = 7, SEGMENTS = 18, INNER = TRACK_W - 2;
const MARK_Y = 60;
const TRACK_X = 213 - Math.floor(TRACK_W / 2);
const TRACK_Y = MARK_Y + TITLE_MARK.h + 20;
/** The stage's line stands 6 under the track; with "how many are here" under it, both lie on one strip of the chat wash. */
const LINE_Y = TRACK_Y + TRACK_H + 6;

function paintTrack(s: Surface, f: number): void {
  // The empty floor is root.1, a step darker than the bricks' faces, so the hollow reads as cut into them.
  sunk(s, 0, 0, TRACK_W, TRACK_H, 'ground', 'root.1');
  const n = Math.round(Math.min(1, Math.max(0, f)) * INNER);
  if (n) {
    s.fill(1, 1, n, 1, 'ember.lt');
    s.fill(1, 2, n, TRACK_H - 4, 'ember');
    s.fill(1, TRACK_H - 2, n, 1, 'ember.dk');
  }
  // A cut between two segments is root.0 in the ember and root.2 in the empty floor, where root.0 would not show.
  for (let k = 1; k < SEGMENTS; k++) {
    const at = Math.round((k * INNER) / SEGMENTS);
    s.fill(at, 1, 1, TRACK_H - 2, at <= n ? 'root.0' : 'root.2');
  }
}

export const loadingScreen: Screen<LoadingView> = (v, ui) => {
  let high = 0;
  const rows = v.here ? 2 : 1;
  return groundMenu(ui, 'loading', [
    titleMark({ cx: 213, y: MARK_Y }),
    {
      x: TRACK_X, y: TRACK_Y, w: TRACK_W, h: TRACK_H, anim: true,
      paint: (s, live) => { high = Math.max(high, v.done(live.t)); paintTrack(s, high); },
    },
    {
      // Under the track, a readout as wide as it on a strip of the chat wash: what is being done in salt at its left and
      // which stage of how many in grey at its right, then on a server how many are here, in grey at the left. Centred
      // one under the other, each on the bare tile, the grey line was lost on the bricks.
      x: TRACK_X, y: LINE_Y - 1, w: TRACK_W, h: rows * 10 + 2, anim: true,
      paint: (s, live) => {
        s.wash(0, 0, TRACK_W, rows * 10 + 2, 'root.0', 3);
        const [n, of] = v.stage(live.t);
        const count = `${n} of ${of}`;
        s.text(cut(v.doing(live.t), TRACK_W - 4 - measure(count) - 8), 2, 1, 'salt', true);
        s.text(count, rightX(count, TRACK_W - 3), 1, 'root.4', true);
        if (v.here) s.text(cut(v.here, TRACK_W - 4), 2, 11, 'root.4', true);
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
  stage: (t) => [stepAt(t) + 1, LOADING_STEPS.length],
  here,
  onGiveUp: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'loading', title: 'Loading', world: false, build: (ui) => loadingScreen(view(), ui) },
  { name: 'loading-server', title: 'Loading, joining a server', world: false, build: (ui) => loadingScreen(view(`${HERE} of 8 here`), ui) },
];
