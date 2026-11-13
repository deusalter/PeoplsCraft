// Making by pattern, as the pack, the Workbench, the Anvil, the Line Frame and the Joining Bench share it: the grid
// and its result, and the recipe panel fastened to the right with its tabs, search, "Can make", kind and cells.
import { DARK_SLOT } from '../../art/slot';
import type { Node, PointerEv, TipLine, Ui } from '../../node';
import type { Ramp } from '../../palette';
import { paintButton } from '../../parts/button';
import { checkbox, field } from '../../parts/controls';
import { paintCount } from '../../parts/slot';
import { slab } from '../../parts/slab';
import { tabbedSlab } from '../../parts/tabs';
import { TRACK_W, paintThumb } from '../../parts/well';
import { sunk } from '../../parts/common';
import { PATTERNS, type Pattern, fits, kindOf, layout, matchGrid, needs } from '../../sample/play-patterns';
import { type Stack, stackTip, thing } from '../../sample/play-items';
import { type Bench, ink, stackSlot } from './common';
import type { Hand } from './hand';

export type Station = Pattern['station'];

export const STATION_NAME: Record<Station, string> = {
  hand: 'By hand', workbench: 'Workbench', anvil: 'Anvil', runeloom: 'Line Frame', tinker: 'Joining Bench',
};
export const STATION_ICON: Record<Station, string> = {
  hand: 'patterns', workbench: 'workbench', anvil: 'anvil', runeloom: 'runeloom', tinker: 'tinker_bench',
};
/** "Made at the Anvil": where a pattern read through another station's tab is made. */
const MADE_AT: Record<Station, string> = {
  hand: 'Made by hand', workbench: 'Made at the Workbench', anvil: 'Made at the Anvil', runeloom: 'Made at the Line Frame', tinker: 'Made at the Joining Bench',
};

export const KINDS = ['All', 'Tools', 'Weapons', 'Armour', 'Trinkets', 'Blocks', 'Other'] as const;

/** What the recipe panel remembers between builds. */
export interface PanelState { search: string; canMake: boolean; kind: number; tab: number }

export const CARRIED = ['pack', 'bar'];

/** The key a wanted kind stands for when a thing of it must be named: any planks are oak planks. */
function concrete(want: string): string { return want === '#planks' ? 'oak_planks' : want === '#log' ? 'oak_log' : want; }

export function haveFor(h: Hand, want: string, stores = CARRIED): number { return h.have((k) => fits(want, k), stores); }

export function canMake(h: Hand, p: Pattern, stores = CARRIED): boolean {
  return needs(p).every(([w, n]) => haveFor(h, w, stores) >= n);
}

/** Makes one straight into the pack (a right press on a cell); false when the pack cannot afford it. */
export function makeOne(h: Hand, p: Pattern): boolean {
  if (!canMake(h, p)) return false;
  for (const [w, n] of needs(p)) h.spend((k) => fits(w, k), n, CARRIED);
  const left = h.into({ key: p.out, n: p.n }, CARRIED);
  if (left) h.dropped.push({ key: p.out, n: left });
  return true;
}

// ---- the grid and its result

export interface Grid {
  /** The store of the grid's slots, `w` by `w`. */
  store: string;
  w: number;
  /** Kinds laid out that the pack could not fill, drawn as silhouettes. */
  ghost: (string | null)[];
  among: Pattern[];
}

export function gridMatch(h: Hand, g: Grid): Pattern | null {
  return matchGrid(h.stores[g.store].map((s) => s?.key ?? null), g.w, g.among);
}

/** Lays a pattern on the grid: what is there goes back to the pack, then each cell takes one of its kind from the pack. */
export function layOut(h: Hand, g: Grid, p: Pattern): void {
  const st = h.stores[g.store];
  st.forEach((s, i) => { if (s) { const left = h.into(s, CARRIED); if (left) h.dropped.push({ ...s, n: left }); st[i] = null; } });
  const want = layout(p, g.w);
  g.ghost = want.map(() => null);
  want.forEach((w, i) => {
    if (!w) return;
    let got: string | null = null;
    h.spend((k) => { if (!got && fits(w, k)) { got = k; return true; } return false; }, 1, CARRIED);
    if (got) st[i] = { key: got, n: 1 }; else g.ghost[i] = concrete(w);
  });
}

/** Takes what the grid makes: into the hand, or with shift as many as it can make into the pack. */
export function takeResult(h: Hand, g: Grid, shift: boolean): boolean {
  let made = false;
  for (let guard = 0; guard < 99; guard++) {
    const p = gridMatch(h, g);
    if (!p) break;
    const out: Stack = { key: p.out, n: p.n };
    if (shift) {
      if (h.into({ ...out }, CARRIED, undefined) !== 0) break;
      h.into(out, CARRIED);
    } else {
      if (h.held && (h.held.key !== out.key || h.held.n + out.n > thing(out.key).stack)) break;
      if (h.held) h.held.n += out.n; else h.held = out;
    }
    const st = h.stores[g.store];
    st.forEach((s, i) => { if (s) { s.n -= 1; if (!s.n) st[i] = null; } });
    made = true;
    if (!shift) break;
  }
  return made;
}

/** The result slot: shows what the grid makes; a press takes it. */
export function resultSlot(b: Bench, g: Grid, x: number, y: number, ramp: Ramp, large: boolean): Node {
  const p = gridMatch(b.hand, g);
  const out: Stack | null = p ? { key: p.out, n: p.n } : null;
  return stackSlot(b, { store: `${g.store}.out`, i: 0 }, {
    x, y, ramp, large, show: out,
    tip: () => (out ? stackTip(out, '{lmb} take   Shift {lmb} take all') : null),
    press: (e: PointerEv) => { if (e.button === 0 && !takeResult(b.hand, g, e.shift)) b.refuse(`${g.store}.out.0`); return true; },
  });
}

// ---- the recipe panel

export interface PanelOpts {
  b: Bench;
  st: PanelState;
  x: number; y: number; h: number;
  ramp: Ramp;
  /** The stations whose patterns may be read here; the first is the one in use. */
  stations: Station[];
  /** The well's height: five by 6 cells in the pack, five by 5 at a station. */
  wellH: number;
  hintY: number;
  /** The grid patterns are laid on; a pattern that does not fit it cannot be laid. */
  grid: Grid | null;
  id: string;
  /** Under 400 units: "Can make" beside the kind button and the well under them, as wide as the slab allows. */
  compact?: boolean;
  wellW?: number;
}

const PANEL_W = 116;
/** The recipe panel's width, for screens that fasten it. */
export const RECIPE_W = PANEL_W;

function patternTip(h: Hand, p: Pattern, here: boolean, station: Station): ReturnType<typeof stackTip> {
  const extra: TipLine[] = needs(p).map(([w, n]) => ({
    text: `${n} ${thing(concrete(w)).name}`,
    c: haveFor(h, w) >= n ? 'growth.lt' : 'blood.lt',
  }));
  if (!here) extra.push({ text: MADE_AT[station], c: 'blood.lt' });
  return stackTip({ key: p.out, n: p.n }, here ? '{lmb} lay out   {rmb} make' : 'none', extra);
}

/** The cells of the patterns in a dark well, five to a row, moving by whole rows, with a track when they do not fit. */
function cellWell(o: PanelOpts, list: Pattern[], station: Station, here: boolean, ui: Ui): Node {
  const { b } = o;
  const w = o.wellW ?? 98, h = o.wellH, fh = h - 2;
  const cols = Math.floor((w - 2 - TRACK_W) / 18);
  const rows = Math.ceil(list.length / cols), visible = Math.floor(fh / 18);
  const sid = `${o.id}.cells`;
  const maxTop = Math.max(0, rows - visible);
  const top = Math.min(maxTop, Math.max(0, ui.scroll(sid)));
  const setTop = (v: number) => ui.setScroll(sid, Math.min(maxTop, Math.max(0, v)));
  const kids: Node[] = list.map((p, i): Node => {
    const r = Math.floor(i / cols) - top, c = i % cols;
    const id = `${o.id}.cell.${p.out}`;
    const makeable = canMake(b.hand, p);
    const fitsGrid = !o.grid || layout(p, o.grid.w).filter((x) => x).length === needs(p).reduce((a, [, n]) => a + n, 0);
    return {
      id, x: c * 18, y: r * 18, w: 18, h: 18, takes: true, focus: true,
      anim: b.refused(id),
      paint: (s, live) => {
        s.nine(DARK_SLOT, 0, 0, 18, 18);
        if (b.refused(id)) {
          s.fill(1, 1, 16, 1, 'blood'); s.fill(1, 16, 16, 1, 'blood'); s.fill(1, 2, 1, 14, 'blood'); s.fill(16, 2, 1, 14, 'blood');
        } else if (live.hover) s.fill(1, 1, 16, 16, 'root.2');
        if (live.focus) { s.fill(1, 1, 16, 1, 'salt'); s.fill(1, 16, 16, 1, 'salt'); s.fill(1, 2, 1, 14, 'salt'); s.fill(16, 2, 1, 14, 'salt'); }
        s.icon(thing(p.out).icon, 1, 1, makeable ? 'full' : 'flat', 'root.4');
        paintCount(s, p.n, 15, 15, makeable ? 'salt' : 'root.4');
      },
      tip: () => patternTip(b.hand, p, here && fitsGrid, station),
      on: {
        down: (e) => {
          if (!here || !fitsGrid) { b.refuse(id); return; }
          if (e.button === 2 || (e.button === 0 && e.shift)) {
            let k = 0;
            do { if (!makeOne(b.hand, p)) break; k++; } while (e.shift && k < 64);
            if (!k) b.refuse(id);
          } else if (e.button === 0 && o.grid) layOut(b.hand, o.grid, p);
          b.after();
        },
        wheel: (e) => { setTop(top + e.notches); return true; },
      },
    };
  });
  const fit = rows <= visible;
  if (!fit) {
    const trackH = fh;
    const thumbH = Math.max(12, Math.floor((trackH * visible) / rows));
    const thumbY = maxTop ? Math.round(((trackH - thumbH) * top) / maxTop) : 0;
    let from = top;
    kids.push({
      id: `${o.id}.track`, x: cols * 18, y: 0, w: TRACK_W, h: trackH, takes: true,
      paint: (s, live) => { s.fill(0, 0, TRACK_W, trackH, 'root.0'); paintThumb(s, 0, thumbY, thumbH, live.hover || live.down); },
      on: {
        down: (e) => { from = top; if (e.y < thumbY) setTop(top - visible); else if (e.y >= thumbY + thumbH) setTop(top + visible); },
        drag: (e) => { if (e.phase !== 'end' && trackH > thumbH) setTop(from + Math.round((e.dy * maxTop) / (trackH - thumbH))); },
        wheel: (e) => { setTop(top + e.notches); return true; },
      },
    });
  }
  return {
    id: `${o.id}.well`, x: 8, y: o.compact ? 32 : 52, w, h,
    paint: (s) => sunk(s, 0, 0, w, h, o.ramp),
    on: { wheel: (e) => { setTop(top + e.notches); return true; } },
    kids: [{ x: 1, y: 1, w: w - 2, h: fh, clip: true, kids }],
  };
}

/** The kind button: a click steps on, a right click steps back; its label is the present kind. */
function kindButton(o: PanelOpts, ui: Ui): Node {
  const label = KINDS[o.st.kind];
  return {
    id: `${o.id}.kind`, x: 60, y: 16, w: 48, h: 14, takes: true, focus: true,
    paint: (s, live) => paintButton(s, 48, 14, label, live),
    tip: () => ({ lines: [{ text: 'Kind of thing', c: 'salt' }, { text: '{lmb} next   {rmb} back', c: 'root.4' }], delay: 0.4 }),
    on: {
      click: (e) => {
        o.st.kind = (o.st.kind + (e.button === 2 ? KINDS.length - 1 : 1)) % KINDS.length;
        ui.setScroll(`${o.id}.cells`, 0);
        ui.cue('press');
        ui.invalidate();
      },
    },
  };
}

/** The panel's controls from its top left: search, kind, "Can make", the cells, and the line of what the mouse does. */
export function recipeControls(o: PanelOpts): Node[] {
  const { b, st } = o;
  const ui = b.ui;
  const station = o.stations[Math.min(st.tab, o.stations.length - 1)];
  const here = st.tab === 0;
  const q = st.search.trim().toLowerCase();
  const list = PATTERNS.filter((p) => p.station === station
    && (st.kind === 0 || kindOf(p) === KINDS[st.kind])
    && (!q || thing(p.out).name.toLowerCase().includes(q))
    && (!st.canMake || canMake(b.hand, p)));
  const out: Node[] = [
    field({
      id: `${o.id}.search`, x: 8, y: 16, w: 50, value: st.search, placeholder: 'Search', limit: 24, host: o.ramp, ui,
      onText: (v) => { st.search = v; ui.setScroll(`${o.id}.cells`, 0); ui.invalidate(); },
    }),
    kindButton(o, ui),
    checkbox({ id: `${o.id}.can`, x: o.compact ? 112 : 8, y: o.compact ? 17 : 35, on: st.canMake, label: 'Can make', host: o.ramp, onToggle: (v) => { st.canMake = v; ui.setScroll(`${o.id}.cells`, 0); ui.invalidate(); } }),
    cellWell(o, list, station, here, ui),
  ];
  if (o.hintY + 10 <= o.h) out.push(ink(8, o.hintY, '{lmb} lay out {rmb} make', 'ink.faded'));
  return out;
}

/** The recipe panel (section 6): fastened to the right of its main slab, with a tab for each station whose patterns may be read. */
export function recipePanel(o: PanelOpts): Node {
  const { b, st } = o;
  const ui = b.ui;
  const tab = Math.min(st.tab, o.stations.length - 1);
  const station = o.stations[tab];
  // The main slab already names the station, so the panel says what it lists: this station's patterns, or, through
  // another tab, whose patterns they are.
  const title = tab === 0 ? 'Patterns' : station === 'hand' ? 'Patterns by hand' : `${STATION_NAME[station]} patterns`;
  // With one station there is nothing to choose between, and the panel carries no tab row of its own.
  if (o.stations.length === 1) return slab({ x: o.x, y: o.y, w: PANEL_W, h: o.h, ramp: o.ramp, title, kids: recipeControls(o) });
  return tabbedSlab({
    id: o.id, x: o.x, y: o.y, w: PANEL_W, h: o.h, ramp: o.ramp, title, edge: 'top',
    tabs: o.stations.map((s) => ({ id: `${o.id}.tab.${s}`, icon: STATION_ICON[s], name: STATION_NAME[s] })),
    chosen: st.tab,
    onTab: (i) => { st.tab = i; ui.setScroll(`${o.id}.cells`, 0); ui.cue('tab'); ui.invalidate(); },
    kids: recipeControls(o),
  });
}
