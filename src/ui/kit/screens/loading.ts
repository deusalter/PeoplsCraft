// Loading (section 6, Loading): the mark, the HUD's thin strip about 20 under it filling in ember, and its lines 4
// under that, bare on the tile.
import type { Screen } from '../node';
import { TITLE_MARK } from '../art/title';
import { GROUND_COURSE } from '../art/ground';
import { paintStrip } from '../parts/hud';
import { titleMark } from '../parts/keycap';
import { groundMenu, menuOrigin } from '../parts/menu';
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
 * The track is the HUD's thin strip (5.15), 182 by 5 as the practice strip over the hotbar, its eighteen segments
 * filling unit by unit in ember. A hollow sunk in the tile with a light foot lost its dark top to the joints and read as
 * a line in an open bracket with a lone light corner, a sprite like no other in the game.
 */
const TRACK_W = 182, TRACK_H = 5, SEGMENTS = 18;
const MARK_Y = 60;
const TRACK_X = 213 - Math.floor(TRACK_W / 2);
const TRACK_Y = MARK_Y + TITLE_MARK.h + 20;

export const loadingScreen: Screen<LoadingView> = (v, ui) => {
  let high = 0;
  const rows = v.here ? 2 : 1;
  // The strip stands inside one course, its top on the course's first face row, so that its outline lies on faces all
  // round and never on a joint, whatever the screen's height.
  const { dy } = menuOrigin(ui);
  let shift = (((1 - (TRACK_Y + dy)) % GROUND_COURSE) + GROUND_COURSE) % GROUND_COURSE;
  if (shift > GROUND_COURSE / 2) shift -= GROUND_COURSE;
  const trackY = TRACK_Y + shift;
  return groundMenu(ui, 'loading', [
    titleMark({ cx: 213, y: MARK_Y }),
    {
      x: TRACK_X, y: trackY, w: TRACK_W, h: TRACK_H, anim: true,
      paint: (s, live) => {
        high = Math.max(high, v.done(live.t));
        paintStrip(s, { x: 0, y: 0, w: TRACK_W, f: high, segments: SEGMENTS, thin: true, onGround: true, tones: ['ember.lt', 'ember', 'ember.dk'] }, 0, 0);
      },
    },
    {
      // 4 under the track, bare on the tile with their shadow as every line on the ground: what is being done in salt at
      // the track's left end and which stage of how many in grey at its right, then on a server how many are here in
      // grey. On a strip of wash they read as a pane of dark glass.
      x: TRACK_X, y: trackY + TRACK_H + 4, w: TRACK_W, h: rows * 10, anim: true,
      paint: (s, live) => {
        const [n, of] = v.stage(live.t);
        const count = `${n} of ${of}`;
        s.text(cut(v.doing(live.t), TRACK_W - measure(count) - 8), 0, 0, 'salt', true);
        s.text(count, rightX(count, TRACK_W - 2), 0, 'root.4', true);
        if (v.here) s.text(cut(v.here, TRACK_W - 2), 0, 10, 'root.4', true);
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
