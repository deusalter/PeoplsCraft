// Making by pattern, as the pack, the Workbench, the Anvil, the Line Frame and the Joining Bench share it: the grid
// and its result, and the recipe panel fastened to the right with its tabs, search, "Can make", kind and cells.
import type { Node, PointerEv, TipLine, Ui } from '../../node';
import type { Ramp } from '../../palette';
import { coded } from '../../pixmap';
import { measure } from '../../font/measure';
import { checkbox, field } from '../../parts/controls';
import { LOCK, paintMakes } from '../../parts/slot';
import { slab } from '../../parts/slab';
import { tabbedSlab } from '../../parts/tabs';
import { TRACK_W, paintThumb } from '../../parts/well';
import { ring, sunk } from '../../parts/common';
import type { Surface } from '../../surface';
import { PATTERNS, type Pattern, fits, layout, matchGrid, needs } from '../../sample/play-patterns';
import { type Stack, stackTip, thing } from '../../sample/play-items';
import { type Bench, ink, stackSlot } from './common';
import type { Hand } from './hand';

export type Station = Pattern['station'];

export const STATION_NAME: Record<Station, string> = {
  hand: 'By hand', workbench: 'Workbench', anvil: 'Anvil', runeloom: 'Line Frame', tinker: 'Joining Bench',
};
export const STATION_ICON: Record<Station, string> = {
  hand: 'hand', workbench: 'workbench', anvil: 'anvil', runeloom: 'runeloom', tinker: 'tinker_bench',
};
/** The one order of the tabs on every making screen, so that each station's tab keeps its place from screen to screen. */
const ORDER: Station[] = ['hand', 'workbench', 'anvil', 'runeloom', 'tinker'];
/** "Made at the Anvil": where a pattern read through another station's tab is made. */
const MADE_AT: Record<Station, string> = {
  hand: 'Made by hand', workbench: 'Made at the Workbench', anvil: 'Made at the Anvil', runeloom: 'Made at the Line Frame', tinker: 'Made at the Joining Bench',
};

/** What the recipe panel remembers between builds. */
export interface PanelState { search: string; canMake: boolean; tab: number }

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

/**
 * A cell of the pattern list, sunk in the dark well like a slot on a dark plate: `root.0` along its top and left,
 * `root.3` along its bottom and right, a floor of `root.2`, or `root.3` under the pointer. On the well's own `root.1`
 * a dark thing outlined in `root.0` (a ring, boots, a lantern) lost its silhouette. A place still to fill keeps the
 * well's floor and a dimmer lower edge, so the filled cells stand forward of it.
 */
function paintCell(s: Surface, hover: boolean, empty = false, chosen = false): void {
  s.fill(0, 0, 17, 1, 'root.0');
  s.fill(0, 1, 1, 16, 'root.0');
  s.fill(1, 17, 17, 1, empty ? 'root.2' : 'root.3');
  s.fill(17, 1, 1, 16, empty ? 'root.2' : 'root.3');
  s.fill(17, 0, 1, 1, 'root.1');
  s.fill(0, 17, 1, 1, 'root.1');
  s.fill(1, 1, 16, 16, empty ? 'root.1' : chosen || hover ? 'root.3' : 'root.2');
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
  // The pattern the grid now holds is chosen: a lighter floor in a root.4 frame, since a salt frame means the keys.
  const laid = here && o.grid ? gridMatch(b.hand, o.grid) : null;
  const kids: Node[] = list.map((p, i): Node => {
    const r = Math.floor(i / cols) - top, c = i % cols;
    const id = `${o.id}.cell.${p.out}`;
    const makeable = canMake(b.hand, p);
    const fitsGrid = !o.grid || layout(p, o.grid.w).filter((x) => x).length === needs(p).reduce((a, [, n]) => a + n, 0);
    return {
      id, x: c * 18, y: r * 18, w: 18, h: 18, takes: true, focus: true,
      anim: b.refused(id),
      paint: (s, live) => {
        paintCell(s, live.hover, false, p === laid);
        if (p === laid && !live.focus) ring(s, 1, 1, 16, 16, 'root.4');
        if (b.refused(id)) ring(s, 1, 1, 16, 16, 'blood');
        else if (live.focus) ring(s, 1, 1, 16, 16, 'salt');
        // A pattern the pack cannot afford is flat in root.4 with the lock where its count would stand: under a half
        // wash its icon differed from a makeable one only a little in brightness on the dark floor.
        if (makeable) { s.icon(thing(p.out).icon, 1, 1); paintMakes(s, p.n); }
        else { s.icon(thing(p.out).icon, 1, 1, 'flat', 'root.4'); s.map(LOCK, 10, 10); }
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
  // A list shorter than the well leaves the rest of its page as empty cells, so the well reads as a page of a book
  // with places still to fill and not as a few icons on a black field.
  if (fit) {
    for (let i = list.length; i < visible * cols; i++) {
      kids.push({ x: (i % cols) * 18, y: Math.floor(i / cols) * 18, w: 18, h: 18, paint: (s) => paintCell(s, false, true) });
    }
  }
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

/**
 * The mouse of the panel's foot, 9 by 11 in the host slab's ramp, the button it speaks of filled in ember. The text
 * face's 7 wide {lmb} and {rmb} in faded ink did not show which button was which.
 */
const MOUSE = (left: boolean) => coded([
  '.KKKKKKK.',
  left ? 'KoOOK122K' : 'K122KoOOK',
  left ? 'KOOOK224K' : 'K224KOOOK',
  left ? 'KOOuK244K' : 'K244KOOuK',
  'KKKKKKKKK',
  'K1222224K',
  'K2222224K',
  'K2222224K',
  'K2222244K',
  '.K44444K.',
  '..KKKKK..',
], `mouse.${left ? 'left' : 'right'}`);
const MOUSE_L = MOUSE(true), MOUSE_R = MOUSE(false);

/** "lay out" beside the left button and "make" beside the right, in faded ink. */
function mouseHint(x: number, y: number, ramp: Ramp): Node {
  const a = 'lay out', b = 'make';
  const bx = 9 + 3 + measure(a) + 6;
  return {
    x, y: y - 1, w: bx + 9 + 3 + measure(b), h: 11,
    paint: (s) => {
      s.map(MOUSE_L, 0, 0, ramp); s.text(a, 12, 1, 'ink.faded');
      s.map(MOUSE_R, bx, 0, ramp); s.text(b, bx + 12, 1, 'ink.faded');
    },
  };
}

/** The panel's controls from its top left: search, "Can make", the cells, and the line of what the mouse does. */
export function recipeControls(o: PanelOpts): Node[] {
  const { b, st } = o;
  const ui = b.ui;
  const station = o.stations[Math.min(st.tab, o.stations.length - 1)];
  const here = st.tab === 0;
  const q = st.search.trim().toLowerCase();
  const list = PATTERNS.filter((p) => p.station === station
    && (!q || thing(p.out).name.toLowerCase().includes(q))
    && (!st.canMake || canMake(b.hand, p)));
  const out: Node[] = [
    field({
      id: `${o.id}.search`, x: 8, y: 16, w: o.compact ? 100 : o.wellW ?? 98, value: st.search, placeholder: 'Search', limit: 24, host: o.ramp, ui,
      onText: (v) => { st.search = v; ui.setScroll(`${o.id}.cells`, 0); ui.invalidate(); },
    }),
    checkbox({ id: `${o.id}.can`, x: o.compact ? 112 : 8, y: o.compact ? 17 : 35, on: st.canMake, label: 'Can make', host: o.ramp, onToggle: (v) => { st.canMake = v; ui.setScroll(`${o.id}.cells`, 0); ui.invalidate(); } }),
    cellWell(o, list, station, here, ui),
  ];
  if (o.hintY + 10 <= o.h) out.push(mouseHint(8, o.hintY, o.ramp));
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
  // All five stations stand in one order on every screen; one whose patterns cannot be read here is drawn flat.
  return tabbedSlab({
    id: o.id, x: o.x, y: o.y, w: PANEL_W, h: o.h, ramp: o.ramp, title, edge: 'top',
    tabs: ORDER.map((s) => ({
      id: `${o.id}.tab.${s}`, icon: STATION_ICON[s], name: STATION_NAME[s],
      off: !o.stations.includes(s), why: 'Its patterns are not read here',
    })),
    chosen: ORDER.indexOf(station),
    onTab: (i) => {
      const j = o.stations.indexOf(ORDER[i]);
      if (j < 0) return;
      st.tab = j; ui.setScroll(`${o.id}.cells`, 0); ui.cue('tab'); ui.invalidate();
    },
    kids: recipeControls(o),
  });
}
