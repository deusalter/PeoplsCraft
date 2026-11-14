// The world list (section 6, World list): the worlds saved in this browser in a well on the ground tile, four doors.
import { worldPreview } from '../art/preview';
import { cut } from '../font/wrap';
import type { Screen, Ui } from '../node';
import { button } from '../parts/button';
import { groundMenu, line, menuOrigin } from '../parts/menu';
import { type RowSpec, well } from '../parts/well';
import { WORLDS, type WorldRow } from '../sample/menus';
import { firstFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface WorldsView {
  /** Newest first. */
  worlds: WorldRow[];
  chosen: number;
  /** "Delete" was pressed once on the chosen world and waits for the second press. */
  asking: boolean;
  onChoose(i: number): void;
  onPlay(i: number): void;
  onNew(): void;
  onDelete(i: number): void;
  onBack(): void;
}

const ROW_H = 36;
/** The column the rows' pictures and words stand in, as wide as the four buttons under the well. */
const COL_W = 280;

/**
 * The well runs the screen's width less 8 on each side, from 32 under the top to 52 over the bottom, with the ground
 * tile showing above it (the title) and below it (the buttons), as the tradition's lists stand. Each row's picture and
 * words stand in the column of the buttons, so the eye does not travel to the screen's edge to read a name.
 */
function frame(ui: Ui, any: boolean) {
  const x = 8, y = 32, w = ui.w - 16;
  // With no world the well is one row deep, the row that says so: three rows deep it was a dark box with two grey lines
  // in its top corner.
  const h = any ? ui.h - 52 - y : ROW_H + 2;
  const inset = Math.max(0, Math.floor((w - 2 - COL_W) / 2));
  return { x, y, w, h, inset, colX: x + 1 + inset };
}

function row(w: WorldRow, i: number, inset: number): RowSpec {
  return {
    id: `worlds.row.${i}`, name: w.name,
    body: (s, rw) => {
      const tw = Math.min(rw, inset + COL_W) - inset - 44;
      s.map(worldPreview(w.seed), inset + 2, 2);
      s.text(cut(w.name, tw), inset + 38, 7, 'salt', true);
      // The level first, since it is what tells one world from another and must not be the part a cut takes.
      s.text(cut(`level ${w.level}, ${w.played}, seed ${w.seed}`, tw), inset + 38, 19, 'root.4', true);
    },
  };
}

export const worldsScreen: Screen<WorldsView> = (v, ui) => {
  const any = v.worlds.length > 0;
  firstFocus(ui, 'worlds', any ? 'worlds.play' : 'worlds.new');
  const w = v.worlds[v.chosen];
  const del = !w ? 'Delete' : w.openElsewhere ? 'Open in another tab' : v.asking ? 'Delete for good' : 'Delete';
  const f = frame(ui, any);
  const { dx, dy } = menuOrigin(ui);
  // The table's parts stand in the menu's block; the well and the buttons stand by the screen's edges, so they are
  // placed in screen units and handed to the block less its origin.
  const by = ui.h - 48 - dy, bx = f.colX - dx;
  return groundMenu(ui, 'worlds', [
    line({ x: f.colX - dx, y: 12 - dy, w: 100, text: 'Worlds', c: 'salt', shadow: true }),
    well({
      // With no world the ground shows under the one row down to the buttons, which stay put.
      id: 'worlds.list', x: f.x - dx, y: f.y - dy, w: f.w, h: f.h, host: 'ground', ui, rowH: ROW_H,
      rows: v.worlds.map((r, i) => row(r, i, f.inset)), chosen: any ? v.chosen : undefined,
      empty: 'No world yet', emptyHint: 'Press New world to start one.', emptyX: f.inset + 38,
      onChoose: v.onChoose, onUse: v.onPlay,
    }),
    button({ id: 'worlds.play', x: bx, y: by, w: 136, label: 'Play', disabled: !w, onPress: () => v.onPlay(v.chosen) }),
    button({ id: 'worlds.new', x: bx + 144, y: by, w: 136, label: 'New world', onPress: v.onNew }),
    button({ id: 'worlds.delete', x: bx, y: by + 24, w: 136, label: del, disabled: !w || !!w.openElsewhere, onPress: () => v.onDelete(v.chosen) }),
    button({ id: 'worlds.back', x: bx + 144, y: by + 24, w: 136, label: 'Back', onPress: v.onBack }),
  ], {
    on: {
      key: (e) => {
        if (e.key === 'Escape') { v.onBack(); return true; }
        if (e.key === 'n' || e.key === 'N') { v.onNew(); return true; }
        if (e.key === 'Delete' && w && !w.openElsewhere) { v.onDelete(v.chosen); return true; }
        if (e.key === 'Enter' && w) { v.onPlay(v.chosen); return true; }
      },
    },
  });
};

// The sample keeps its list and choice for as long as the page is open: deleting takes a world out of it.
const state = { worlds: [...WORLDS], chosen: 0, asking: false };

const view = (ui: { invalidate(): void }, worlds: WorldRow[]): WorldsView => ({
  worlds, chosen: Math.min(state.chosen, Math.max(0, worlds.length - 1)), asking: state.asking,
  onChoose: (i) => { state.chosen = i; state.asking = false; ui.invalidate(); },
  onPlay: () => go('loading'),
  onNew: () => go('new-world'),
  onDelete: (i) => {
    if (!state.asking) { state.asking = true; ui.invalidate(); return; }
    worlds.splice(i, 1);
    state.asking = false;
    state.chosen = Math.min(i, Math.max(0, worlds.length - 1));
    ui.invalidate();
  },
  onBack: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'worlds', title: 'World list', world: false, build: (ui) => worldsScreen(view(ui, state.worlds), ui) },
  { name: 'worlds-empty', title: 'World list, no world yet', world: false, build: (ui) => worldsScreen(view(ui, []), ui) },
];
