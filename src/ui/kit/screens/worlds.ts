// The world list (section 6, World list): the worlds saved in this browser in a well on the ground tile, four doors.
import { cut } from '../font/wrap';
import type { Screen } from '../node';
import { button } from '../parts/button';
import { groundMenu, line } from '../parts/menu';
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

function row(w: WorldRow, i: number): RowSpec {
  return {
    id: `worlds.row.${i}`, name: w.name,
    body: (s, rw) => {
      s.text(cut(w.name, rw - 12), 6, 7, 'salt', true);
      s.text(cut(`seed ${w.seed}, last played ${w.played}, level ${w.level}`, rw - 12), 6, 19, 'root.4', true);
    },
  };
}

export const worldsScreen: Screen<WorldsView> = (v, ui) => {
  const any = v.worlds.length > 0;
  firstFocus(ui, 'worlds', any ? 'worlds.play' : 'worlds.new');
  const w = v.worlds[v.chosen];
  const del = !w ? 'Delete' : w.openElsewhere ? 'Open in another tab' : v.asking ? 'Delete for good' : 'Delete';
  return groundMenu(ui, 'worlds', [
    line({ x: 73, y: 8, w: 100, text: 'Worlds', c: 'salt', shadow: true }),
    well({
      id: 'worlds.list', x: 73, y: 22, w: 280, h: 146, host: 'ground', ui, rowH: ROW_H,
      rows: v.worlds.map(row), chosen: any ? v.chosen : undefined, empty: 'No world yet',
      onChoose: v.onChoose, onUse: v.onPlay,
    }),
    button({ id: 'worlds.play', x: 73, y: 176, w: 136, label: 'Play', disabled: !w, onPress: () => v.onPlay(v.chosen) }),
    button({ id: 'worlds.new', x: 217, y: 176, w: 136, label: 'New world', onPress: v.onNew }),
    button({ id: 'worlds.delete', x: 73, y: 200, w: 136, label: del, disabled: !w || !!w.openElsewhere, onPress: () => v.onDelete(v.chosen) }),
    button({ id: 'worlds.back', x: 217, y: 200, w: 136, label: 'Back', onPress: v.onBack }),
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
