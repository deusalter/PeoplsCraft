// The world list (section 6, World list): the worlds saved in this browser in a well on the ground tile, four doors.
import { worldPreview } from '../art/preview';
import { measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node, Screen, Ui } from '../node';
import { button } from '../parts/button';
import { slab } from '../parts/slab';
import { groundMenu, line, menuOrigin } from '../parts/menu';
import { type RowSpec, well } from '../parts/well';
import { WORLDS, type WorldRow } from '../sample/menus';
import { firstFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface WorldsView {
  /** Newest first. */
  worlds: WorldRow[];
  chosen: number;
  /** "Delete" was pressed on the chosen world: the question stands over the list until it is answered. */
  asking: boolean;
  onChoose(i: number): void;
  onPlay(i: number): void;
  onNew(): void;
  /** Asks first; pressed in the question, deletes. */
  onDelete(i: number): void;
  /** "Cancel" in the question, or Esc. */
  onKeep(): void;
  onBack(): void;
}

const ROW_H = 36;
/** The well, as wide as the four buttons under it and standing in their column. */
const WELL_W = 280;

/**
 * The well stands in the column of the buttons, 280 wide and centred, from 32 under the top to 52 over the bottom, with
 * the ground tile showing above it (the title), below it (the buttons) and to either side. Across the screen's width
 * its rows held their picture and words in a column 93 units in from the well's left, a dead band down every row. With
 * no world it keeps its size, as an empty list keeps its well.
 */
function frame(ui: Ui) {
  const x = Math.floor((ui.w - WELL_W) / 2), y = 32;
  return { x, y, w: WELL_W, h: ui.h - 52 - y };
}

/** The picture's place in a row and the column of its words, from the row's left. */
const PIC_X = 2, TEXT_X = 38;

function row(w: WorldRow, i: number): RowSpec {
  return {
    id: `worlds.row.${i}`, name: w.name,
    body: (s, rw) => {
      const tw = rw - TEXT_X - 4;
      s.map(worldPreview(w.seed), PIC_X, 2);
      s.text(cut(w.name, tw), TEXT_X, 7, 'salt', true);
      // The level first, since it is what tells one world from another and must not be the part a cut takes.
      s.text(cut(`level ${w.level}, ${w.played}, seed ${w.seed}`, tw), TEXT_X, 19, 'root.4', true);
    },
  };
}

/**
 * The list with no world: its first row is a row still to be filled, the picture's place an empty frame with the
 * faint silhouette of a hill in it, as an empty slot shows what belongs there, the name's place "No world yet" and the
 * detail's place what to do. Two grey lines in the top corner of a bare strip read as broken; centred in the dark they
 * were a web page's empty state.
 */
function emptyRow(fw: number): Node {
  return {
    x: 1, y: 1, w: fw, h: ROW_H,
    paint: (s) => {
      s.fill(PIC_X, 2, 32, 32, 'root.0');
      s.fill(PIC_X + 1, 3, 30, 30, 'root.1');
      s.fill(PIC_X + 1, 3, 30, 1, 'root.2');
      s.fill(PIC_X + 1, 4, 1, 29, 'root.2');
      // The hill: a stepped skyline of blocks 4 wide, as the pictures are built, in root.2 on the frame's floor.
      const tops = [21, 21, 17, 17, 13, 17, 21, 25];
      tops.forEach((t, c) => { const x = PIC_X + 2 + c * 4, w = Math.min(4, PIC_X + 31 - x); if (w > 0) s.fill(x, t, w, 33 - t, 'root.2'); });
      s.text('No world yet', TEXT_X, 7, 'salt', true);
      s.text(cut('Press New world to start one.', fw - TEXT_X - 4), TEXT_X, 19, 'root.4', true);
    },
  };
}

const ASK_W = 200, ASK_H = 58;

/**
 * The question Delete asks, a stone slab over the dimmed list, centred: the world's name in the question, that it
 * cannot be undone, then "Delete" with its label in blood.dk and "Cancel", which has the keys. A Delete that turned
 * into "Delete for good" in place, under Play and in the same stone, was one slip from losing a world. The whole screen
 * under the wash takes the pointer, so nothing behind the slab can be pressed while it asks.
 */
function ask(ui: Ui, w: WorldRow, onDelete: () => void, onKeep: () => void, dx: number, dy: number): Node {
  const x = Math.floor((ui.w - ASK_W) / 2), y = Math.floor((ui.h - ASK_H) / 2);
  const room = ASK_W - 16 - measure('Delete ?') - 1;
  const bw = (ASK_W - 16 - 4) / 2;
  return {
    id: 'worlds.ask', x: -dx, y: -dy, w: ui.w, h: ui.h, takes: true,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [slab({
      x, y, w: ASK_W, h: ASK_H, ramp: 'stone', title: `Delete ${cut(w.name, room)}?`,
      kids: [
        { x: 8, y: 18, w: measure('It cannot be undone.'), h: 10, paint: (s) => { s.text('It cannot be undone.', 0, 0, 'ink'); } },
        button({ id: 'worlds.ask.delete', x: 8, y: 34, w: bw, h: 16, ramp: 'stone', label: 'Delete', warn: true, onPress: onDelete }),
        button({ id: 'worlds.ask.keep', x: 8 + bw + 4, y: 34, w: bw, h: 16, ramp: 'stone', label: 'Cancel', onPress: onKeep }),
      ],
    })],
  };
}

export const worldsScreen: Screen<WorldsView> = (v, ui) => {
  const any = v.worlds.length > 0;
  firstFocus(ui, 'worlds', any ? 'worlds.play' : 'worlds.new');
  const w = v.worlds[v.chosen];
  const del = w?.openElsewhere ? 'Open in another tab' : 'Delete';
  if (v.asking && w && !ui.focused()?.startsWith('worlds.ask.')) ui.focusOn('worlds.ask.keep', false);
  const f = frame(ui);
  const { dx, dy } = menuOrigin(ui);
  // The table's parts stand in the menu's block; the well and the buttons stand by the screen's edges, so they are
  // placed in screen units and handed to the block less its origin.
  const by = ui.h - 48 - dy, bx = f.x - dx;
  const list = well({
    id: 'worlds.list', x: f.x - dx, y: f.y - dy, w: f.w, h: f.h, host: 'ground', ui, rowH: ROW_H,
    rows: v.worlds.map((r, i) => row(r, i)), chosen: any ? v.chosen : undefined,
    onChoose: v.onChoose, onUse: v.onPlay,
  });
  if (!any) list.kids?.[0].kids?.push({ ...emptyRow(f.w - 2), x: 0, y: 0 });
  return groundMenu(ui, 'worlds', [
    // At the well's left edge, its cell ending 6 over the well's top.
    line({ x: f.x - dx, y: f.y - 6 - 9 - dy, w: 100, text: 'Worlds', c: 'salt', shadow: true }),
    list,
    button({ id: 'worlds.play', x: bx, y: by, w: 136, label: 'Play', disabled: !w, onPress: () => v.onPlay(v.chosen) }),
    button({ id: 'worlds.new', x: bx + 144, y: by, w: 136, label: 'New world', onPress: v.onNew }),
    button({ id: 'worlds.delete', x: bx, y: by + 24, w: 136, label: del, disabled: !w || !!w.openElsewhere, onPress: () => v.onDelete(v.chosen) }),
    button({ id: 'worlds.back', x: bx + 144, y: by + 24, w: 136, label: 'Back', onPress: v.onBack }),
    ...(v.asking && w ? [ask(ui, w, () => v.onDelete(v.chosen), v.onKeep, dx, dy)] : []),
  ], {
    on: {
      key: (e) => {
        if (v.asking && w) { if (e.key === 'Escape') { v.onKeep(); return true; } return; }
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

const view = (ui: Ui, worlds: WorldRow[]): WorldsView => ({
  worlds, chosen: Math.min(state.chosen, Math.max(0, worlds.length - 1)), asking: state.asking,
  onChoose: (i) => { state.chosen = i; state.asking = false; ui.invalidate(); },
  onPlay: () => go('loading'),
  onNew: () => go('new-world'),
  onKeep: () => { state.asking = false; ui.focusOn('worlds.delete', false); ui.invalidate(); },
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
