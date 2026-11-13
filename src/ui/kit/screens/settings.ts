// Settings (section 6, Settings): a clay slab with four tabs, rows of controls that scroll on the slab, and Done.
import { GROUND } from '../art/ground';
import { count, rightX } from '../font/measure';
import type { KeyEv, Node, Screen, Ui } from '../node';
import { button } from '../parts/button';
import { checkbox, slider } from '../parts/controls';
import { tabbedSlab } from '../parts/tabs';
import { slabTrack } from '../parts/well';
import { SETTINGS, type Setting, type SettingsTab } from '../sample/settings';
import { firstFocus, go, placeWindow } from './books-common';
import type { NamedScreen } from './index';

export interface SettingsView {
  tabs: SettingsTab[];
  tab: number;
  /** Over the ground tile when opened from the title, over the dimmed world when opened from the pause. */
  over: 'ground' | 'world';
  onTab(i: number): void;
  /** A change takes effect at once and is saved at once. */
  onChange(tab: number, row: number, s: Setting): void;
  onDone(): void;
}

const W = 248, H = 206, ROW = 16, ROWS_Y = 20, VISIBLE = 10;

function valueText(s: Setting): string {
  if (s.kind === 'measure') return count(s.value) + (s.unit ?? '');
  return '';
}

function rowNodes(v: SettingsView, i: number, s: Setting, y: number, ui: Ui): Node[] {
  const id = `set.${v.tabs[v.tab].key}.${i}`;
  const change = (n: Setting) => v.onChange(v.tab, i, n);
  const label: Node = { x: 0, y: y + 3, w: 130, h: 10, paint: (g) => { g.text(s.label, 0, 0, 'ink'); } };
  if (s.kind === 'switch') {
    return [label, checkbox({ id, x: 213, y: y + 2, on: s.on, host: 'clay', onToggle: (on) => { change({ ...s, on }); ui.invalidate(); } })];
  }
  if (s.kind === 'measure') {
    const t = valueText(s);
    const steps = Math.round((s.max - s.min) / s.step);
    return [
      label,
      { x: 100, y: y + 3, w: 40, h: 10, paint: (g) => { g.text(t, rightX(t, 39), 0, 'ink'); } },
      slider({
        id, x: 144, y: y + 1, w: 80, value: (s.value - s.min) / (s.max - s.min), steps, host: 'clay', ui,
        onChange: (f) => change({ ...s, value: s.min + Math.round(f * steps) * s.step }),
      }),
    ];
  }
  const step = (d: number) => { change({ ...s, at: (s.at + d + s.values.length) % s.values.length }); ui.invalidate(); };
  const b = button({ id, x: 144, y: y + 1, w: 80, h: 14, ramp: 'clay', label: s.values[s.at], onPress: () => step(1) });
  b.on = { ...b.on, key: (e: KeyEv) => { if (e.key === 'ArrowLeft') { step(-1); return true; } if (e.key === 'ArrowRight') { step(1); return true; } } };
  return [label, b];
}

export const settingsScreen: Screen<SettingsView> = (v, ui) => {
  const tab = v.tabs[v.tab];
  const rows = tab.rows;
  const scrollId = `set.${tab.key}.top`;
  const maxTop = Math.max(0, rows.length - VISIBLE);
  const top = Math.min(maxTop, Math.max(0, ui.scroll(scrollId)));
  const setTop = (t: number) => ui.setScroll(scrollId, Math.min(maxTop, Math.max(0, t)));
  firstFocus(ui, `settings.${tab.key}`, rows.length ? `set.${tab.key}.0` : 'set.done');
  const kids: Node[] = [];
  rows.forEach((s, i) => kids.push(...rowNodes(v, i, s, (i - top) * ROW, ui)));
  const area: Node = {
    x: 8, y: ROWS_Y, w: 224, h: VISIBLE * ROW, clip: true, kids,
    on: {
      wheel: (e) => { setTop(top + e.notches); return true; },
      // Up and Down walk the rows and scroll the focused one into view.
      key: (e) => {
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        const at = ui.focused()?.match(/^set\.\w+\.(\d+)$/);
        if (!d || !at) return;
        const j = Number(at[1]) + d;
        if (j < 0) return true;
        if (j >= rows.length) { ui.focusOn('set.done', true); return true; }
        if (j < top) setTop(j); else if (j >= top + VISIBLE) setTop(j - VISIBLE + 1);
        ui.focusOn(`set.${tab.key}.${j}`, true);
        return true;
      },
    },
  };
  const slabKids: Node[] = [area];
  if (maxTop > 0) slabKids.push(slabTrack({ id: `${scrollId}.track`, x: 234, y: ROWS_Y, h: VISIBLE * ROW, ramp: 'clay', top, visible: VISIBLE, total: rows.length, onScroll: setTop }));
  slabKids.push(button({ id: 'set.done', x: 74, y: 184, w: 100, h: 16, ramp: 'clay', label: 'Done', onPress: v.onDone }));
  const at = placeWindow(ui, W, H, 21);
  const slab = tabbedSlab({
    id: 'set.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'clay', title: tab.name, edge: 'top',
    tabs: v.tabs.map((t) => ({ id: `set.tab.${t.key}`, icon: t.icon, name: t.name })), chosen: v.tab, onTab: v.onTab,
    kids: slabKids,
  });
  return {
    id: 'settings', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => { if (v.over === 'ground') s.tile(GROUND, 0, 0, ui.w, ui.h); else s.wash(0, 0, ui.w, ui.h, 'root.0', 2); },
    kids: [slab],
    on: {
      key: (e) => {
        if (e.key === 'Escape') { v.onDone(); return true; }
        if (e.key === 'q' || e.key === 'Q') { v.onTab((v.tab + v.tabs.length - 1) % v.tabs.length); return true; }
        if (e.key === 'e' || e.key === 'E') { v.onTab((v.tab + 1) % v.tabs.length); return true; }
      },
    },
  };
};

// The sample keeps what was changed for as long as the page is open, across its tabs.
const tabs = SETTINGS.map((t) => ({ ...t, rows: t.rows.map((r) => ({ ...r })) }));

function sample(name: string, title: string, start: number, over: 'ground' | 'world'): NamedScreen {
  let tab = start;
  return {
    name, title, world: over === 'world',
    build: (ui) => settingsScreen({
      tabs, tab, over,
      onTab: (i) => { tab = i; ui.cue('tab'); ui.invalidate(); },
      onChange: (t, r, s) => { tabs[t].rows[r] = s; },
      onDone: () => go(over === 'ground' ? 'title' : 'pause'),
    }, ui),
  };
}

export const SCREENS: NamedScreen[] = [
  sample('settings', 'Settings, from the title', 0, 'ground'),
  sample('settings-play', 'Settings: play, from the pause', 1, 'world'),
  sample('settings-sound', 'Settings: sound', 2, 'world'),
  sample('settings-interface', 'Settings: interface', 3, 'ground'),
];
