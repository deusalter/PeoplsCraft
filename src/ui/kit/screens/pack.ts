// The pack (section 6): the body panel fastened to the left, the main slab with what is worn, the two by two grid and
// the pack, and the recipe panel of what two hands can make fastened to the right. Under 400 units of width the
// panels leave the sides and the main slab carries three side tabs: Pack, Body, Making.
import { FRAMED_PLATE } from '../art/slab';
import { SMALL } from '../font/face';
import { clock, count, measure, rightX } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node, Ui } from '../node';
import { frameWell } from '../parts/well';
import { progressArrow } from '../parts/gauges';
import { plusButton } from '../parts/button';
import { strip } from '../parts/hud';
import { slab } from '../parts/slab';
import { tabbedSlab } from '../parts/tabs';
import { PATTERNS } from '../sample/play-patterns';
import { type Stack, thing } from '../sample/play-items';
import { Bench, cutLine, ink, inkRight, overWorld, place, small, stackGrid } from './play/common';
import { BARE, FIGURE_SIZE, type Part, type Tones, figure, floor } from './play/figure';
import { Hand, type Place, store } from './play/hand';
import { type Grid, type PanelState, RECIPE_W, gridMatch, recipeControls, recipePanel, resultSlot } from './play/making';
import { type NamedScreen, SCREEN_FILES } from './index';

const WEAR_SLOTS: Part[] = ['head', 'body', 'legs'];

interface PackState {
  hand: Hand;
  grid: Grid;
  panel: PanelState;
  bench: Bench | null;
  name: string;
  level: number;
  practice: [number, number];
  attrs: number[];
  points: number;
  lees: number;
  bodyTab: number;
  narrowTab: number;
}

const ATTRS = ['Strength', 'Agility', 'Vitality', 'Arm'];

function takesFor(p: Place, s: Stack): boolean {
  const t = thing(s.key);
  if (p.store === 'wear') return t.wear === WEAR_SLOTS[p.i];
  if (p.store === 'trinket') return t.wear === 'trinket';
  return true;
}

function routeFor(h: Hand, p: Place): string[] {
  if (p.store === 'wear' || p.store === 'trinket' || p.store === 'grid') return ['pack', 'bar'];
  const s = h.get(p);
  const w = s ? thing(s.key).wear : undefined;
  const first = w === 'trinket' ? ['trinket'] : w ? ['wear'] : [];
  return [...first, p.store === 'pack' ? 'bar' : 'pack'];
}

function sample(kind: 'mid' | 'empty' | 'full'): PackState {
  const full: Record<number, Stack> = {};
  const fill = ['cobble', 'dirt', 'oak_log', 'oak_planks', 'stick', 'coal', 'iron_ore', 'iron_bar', 'gold_ore', 'sand', 'glass', 'clay',
    'bricks', 'fiber', 'feather', 'hide', 'bone', 'flint', 'gel', 'shade_essence', 'chitin', 'mushroom_red', 'mushroom_brown', 'glowshroom',
    'apple', 'raw_meat', 'raw_fish'];
  fill.forEach((k, i) => { full[i] = { key: k, n: Math.min(thing(k).stack, [99, 64, 32, 87, 45, 99, 23, 17, 9, 64, 12, 40][i % 12]) }; });
  const mid: Record<number, Stack> = {
    0: { key: 'cobble', n: 99 }, 1: { key: 'cobble', n: 37 }, 2: { key: 'dirt', n: 18 }, 3: { key: 'iron_ore', n: 6 }, 4: { key: 'coal', n: 23 },
    6: { key: 'oak_log', n: 3 }, 7: { key: 'mushroom_red', n: 1 }, 9: { key: 'gel', n: 4 }, 10: { key: 'feather', n: 7 },
    11: { key: 'strider_boots', n: 1 }, 12: { key: 'iron_melee_2', n: 1, mod: 'warding' }, 14: { key: 'shade_essence', n: 2 },
    18: { key: 'lumenite_sword', n: 1, mod: 'savage' }, 19: { key: 'stone_pickaxe', n: 1 }, 22: { key: 'berries', n: 5 }, 23: { key: 'fiber', n: 11 },
    26: { key: 'warden_bell', n: 1 },
  };
  const hand = new Hand({
    pack: store(27, kind === 'mid' ? mid : kind === 'full' ? full : {}),
    bar: store(9, kind === 'empty' ? {} : {
      0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1, mod: 'keen' }, 2: { key: 'iron_bow', n: 1 }, 3: { key: 'arrow', n: 64 },
      4: { key: 'torch', n: 41 }, 5: { key: 'cooked_meat', n: 12 }, 6: { key: 'salve', n: 5 }, 7: { key: 'recall_stone', n: 1 }, 8: { key: 'oak_planks', n: 48 },
    }),
    wear: kind === 'empty' ? store(3) : store(3, { 0: { key: 'iron_melee_0', n: 1 }, 1: { key: 'iron_melee_1', n: 1 } }),
    trinket: kind === 'empty' ? store(5) : store(5, { 0: { key: 'heart_locket', n: 1 }, 1: { key: 'warriors_band', n: 1 } }),
    grid: store(4),
  }, { closed: ['grid'] });
  hand.rules.takes = takesFor;
  hand.rules.route = (p) => routeFor(hand, p);
  const grid: Grid = { store: 'grid', w: 2, ghost: Array(4).fill(null), among: PATTERNS.filter((p) => p.station === 'hand') };
  if (kind === 'mid') { hand.stores.grid[0] = { key: 'oak_log', n: 1 }; }
  return {
    hand, grid, bench: null,
    panel: { search: '', canMake: false, kind: 0, tab: 0 },
    name: kind === 'empty' ? 'tovah' : 'Ānanya_Kīrtimālā_Sūryavansh',
    level: kind === 'empty' ? 1 : 14,
    practice: kind === 'empty' ? [0, 40] : [320, 900],
    attrs: kind === 'empty' ? [0, 0, 0, 0] : [6, 3, 5, 2],
    points: kind === 'empty' ? 0 : 3,
    lees: kind === 'empty' ? 0 : 1240,
    bodyTab: 0, narrowTab: 0,
  };
}

const states = new Map<string, PackState>();

function materialTones(s: Stack | null): Tones {
  if (!s) return BARE;
  if (s.key.startsWith('hide')) return ['timber.lt', 'timber.face', 'timber.sh'];
  if (s.key.startsWith('lumenite')) return ['cyan.lt', 'cyan.lt', 'cyan.dk'];
  return ['stone.lt', 'stone.face', 'stone.sh'];
}

/** The seven totals of the body panel, from what is worn and carried in the trinket slots. */
function totals(st: PackState): [string, string][] {
  const worn = [...st.hand.stores.wear, ...st.hand.stores.trinket].filter((s): s is Stack => !!s);
  const def = worn.reduce((a, s) => a + (thing(s.key).def ?? 0) + (s.mod === 'warding' ? 2 : 0), 0) + (worn.some((s) => s.key === 'iron_bracer') ? 3 : 0);
  const melee = worn.some((s) => s.key === 'warriors_band') ? 8 : 0;
  const ironSet = st.hand.stores.wear.every((s) => s?.key.startsWith('iron_melee'));
  return [
    ['Defence', String(def + (ironSet ? 4 : 0))],
    ['Melee', `+${melee + st.attrs[0] * 2 + (ironSet ? 8 : 0)}%`],
    ['Ranged', `+${st.attrs[1] * 2}%`],
    ['Crystal-work', `+${st.attrs[3] * 2}%`],
    ['Totem', '+0%'],
    ['Critical', `${4 + st.attrs[1]}%`],
    ['Speed', `+${st.attrs[1]}%`],
  ];
}

/** The width and height of the body panel when wide: narrower and shorter than the main slab, fastened at its top left. */
const BODY_W = 112, BODY_H = 166;

/**
 * The body panel's own parts, from its top left, as the wide pack and the narrow Body tab both lay them. The level and
 * its practice strip share a row; the practice in numbers is the strip's tooltip.
 */
function bodyParts(st: PackState, ui: Ui, narrow: boolean): Node[] {
  const out: Node[] = [];
  const R = narrow ? 96 : BODY_W - 8, plusX = R - 12;
  out.push(ink(8, 6, st.name, 'ink', R - 8));
  const lvl = `Level ${st.level}`;
  out.push(ink(8, 17, lvl));
  const sx = 8 + measure(lvl) + 6;
  const pr = `${count(st.practice[0])} of ${count(st.practice[1])} to level ${st.level + 1}`;
  out.push({ ...strip({ x: sx, y: 19, w: R - sx, f: st.practice[0] / st.practice[1], tones: ['growth.lt', 'growth', 'growth.dk'], segments: Math.max(1, Math.round((R - sx) / 8)), thin: true }), takes: true, tip: () => ({ lines: [{ text: 'Practice', c: 'growth.lt' }, { text: pr, c: 'root.4' }], delay: 0.2 }) });
  ATTRS.forEach((a, i) => {
    const y = 28 + i * 12;
    out.push(ink(8, y + 1, a));
    out.push(inkRight(plusX - 4, y + 1, String(st.attrs[i])));
    if (st.points > 0) out.push(plusButton({ id: `body.plus.${i}`, x: plusX, y, onPress: () => { st.attrs[i]++; st.points--; ui.cue('press'); ui.invalidate(); } }));
  });
  if (st.points > 0) out.push(ink(8, 77, `${st.points} to spend`));
  const rows = totals(st);
  if (narrow) {
    rows.forEach(([k, v], i) => { out.push(ink(100, 16 + i * 10, k, 'ink.faded', 68 - measure(v) - 4)); out.push(inkRight(168, 16 + i * 10, v)); });
  } else {
    out.push(cutLine(8, 89, R - 8, 'clay'));
    rows.forEach(([k, v], i) => { out.push(ink(8, 92 + i * 10, k, 'ink.faded', R - 8 - measure(v) - 4)); out.push(inkRight(R, 92 + i * 10, v)); });
  }
  return out;
}

const STATES_LIST: { icon: string; name: string; good: boolean; seconds: number; part: Part; ends: string }[] = [
  { icon: 'loaf', name: 'Well Fed', good: true, seconds: 252, part: 'body', ends: 'Ends when the time runs out' },
  { icon: 'ironbark', name: 'Toughened', good: true, seconds: 151, part: 'body', ends: 'Ends when the time runs out' },
  { icon: 'spore_sac', name: 'Spore in a wound', good: false, seconds: 38, part: 'body', ends: 'A salve ends it' },
];

/** The States tab: the figure in a well with each state marked where it sits, and a row for each under it. */
function statesParts(st: PackState): Node[] {
  const wear = st.hand.stores.wear;
  const tones = { head: materialTones(wear[0]), body: materialTones(wear[1]), legs: materialTones(wear[2]) };
  const ww = BODY_W - 16, wh = 84, ground = 8;
  const fig = FIGURE_SIZE.large, fx = 10, fy = wh - 2 - ground - fig.h + 1;
  const marks: Record<Part, number> = { head: fy + 1, body: fy + 12, legs: fy + 32 };
  const out: Node[] = [frameWell({
    x: 8, y: 16, w: ww, h: wh, host: 'clay',
    kids: [
      floor(0, wh - 2 - ground, ww - 2, ground, fx + Math.floor(fig.w / 2)),
      figure(fx, fy, 'large', tones),
      ...STATES_LIST.map((s, i): Node => ({
        x: 50 + (i % 2) * 20, y: marks[s.part] + (i > 1 ? 20 : 0), w: 18, h: 18,
        paint: (sf) => { sf.nine(FRAMED_PLATE, 0, 0, 18, 18, { tint: s.good ? 'growth' : 'blood' }); sf.icon(s.icon, 1, 1); },
      })),
    ],
  })];
  STATES_LIST.forEach((s, i) => {
    const y = 104 + i * 19, rw = BODY_W - 16;
    out.push({
      id: `states.row.${i}`, x: 8, y, w: rw, h: 18, takes: true,
      paint: (sf) => {
        sf.nine(FRAMED_PLATE, 0, 0, 18, 18, { tint: s.good ? 'growth' : 'blood' });
        sf.icon(s.icon, 1, 1);
        const t = clock(s.seconds);
        sf.text(t, rightX(t, rw - 1, SMALL), 6, s.seconds <= 10 ? 'blood.dk' : 'ink.faded', false, SMALL);
        sf.text(cut(s.name, rightX(t, rw - 1, SMALL) - 25), 22, 4, 'ink');
      },
      tip: () => ({ lines: [{ text: s.name, c: s.good ? 'growth.lt' : 'blood.lt' }, { text: s.ends, c: 'root.4' }], delay: 0 }),
    });
  });
  return out;
}

/** The body as worn, 50 by 54 beside the worn slots: the figure standing on a course of the ground tile. */
function figureWell(st: PackState, x: number, y: number): Node {
  const wear = st.hand.stores.wear;
  const iw = 48, ih = 52, ground = 8, fig = FIGURE_SIZE.small;
  const fx = Math.floor((iw - fig.w) / 2), fy = ih - ground - fig.h + 1;
  return frameWell({
    x, y, w: 50, h: 54, host: 'clay',
    kids: [
      floor(0, ih - ground, iw, ground, fx + Math.floor(fig.w / 2)),
      figure(fx, fy, 'small', { head: materialTones(wear[0]), body: materialTones(wear[1]), legs: materialTones(wear[2]) }),
    ],
  });
}

/** The main slab's parts from its top left: worn, figure, grid, trinkets, lees, pack. */
function mainParts(st: PackState, b: Bench, upper: boolean): Node[] {
  const g = st.grid;
  const matched = gridMatch(st.hand, g);
  const out: Node[] = [small('pack.sort', 138, 3, 30, 'Sort', () => { st.hand.sort('pack'); b.after(); })];
  if (upper) {
    out.push(
      stackGrid(b, { store: 'wear', x: 8, y: 16, cols: 1, rows: 3, ramp: 'clay', each: (i) => ({ silhouette: WEAR_SLOTS[i], showAccepts: true }) }),
      figureWell(st, 28, 16),
      stackGrid(b, { store: 'grid', x: 84, y: 25, cols: 2, rows: 2, ramp: 'clay', each: (i) => ({ missing: g.ghost[i] ?? undefined }) }),
      progressArrow({ x: 124, y: 37, f: matched ? 1 : 0, ramp: 'clay' }),
      resultSlot(b, g, 150, 34, 'clay', false),
      stackGrid(b, { store: 'trinket', x: 8, y: 74, cols: 5, rows: 1, ramp: 'clay', each: () => ({ silhouette: 'trinket', showAccepts: true }) }),
    );
    const lees = `{lees} ${count(st.lees)}`;
    out.push({ x: rightX(lees, 168), y: 78, w: measure(lees), h: 10, paint: (s) => { s.text(lees, 0, 0, 'ink'); }, tip: () => ({ lines: [{ text: 'Lees carried', c: 'salt' }], delay: 0.4 }) });
  }
  out.push(
    stackGrid(b, { store: 'pack', x: 8, y: 98, cols: 9, rows: 3, ramp: 'clay' }),
    stackGrid(b, { store: 'bar', x: 8, y: 156, cols: 9, rows: 1, ramp: 'clay', each: (i) => (i === 0 ? { mark: 'chosen' } : {}) }),
  );
  return out;
}

function goSkills(): void {
  const name = Object.keys(SCREEN_FILES).find((n) => n === 'tree' || n.startsWith('tree') || n.includes('skill'));
  if (name) location.search = `?screen=${name}`;
}

/**
 * Wide: the pack is the main slab, centred, with one row of tabs. The tab chosen fastens one panel to it: the body
 * panel or the states, narrower and shorter, at its top left; or the patterns that two hands can make at its right,
 * which are closed until asked for. Skills leaves for the tree.
 */
function wide(st: PackState, b: Bench, ui: Ui): Node {
  const making = st.bodyTab === 2;
  const left = making ? 0 : BODY_W - 1, right = making ? RECIPE_W - 1 : 0;
  const mx = Math.min(Math.max(3 + left, Math.floor((ui.w - 176) / 2)), ui.w - 3 - 176 - right);
  const at = place(ui, 176, 182, 21);
  const win = { x: mx - left, y: at.y, w: left + 176 + right, h: 182 };
  const main = tabbedSlab({
    id: 'pack.main', x: left, y: 0, w: 176, h: 182, ramp: 'clay', edge: 'top', title: 'Pack', titleRoom: 40,
    tabs: [
      { id: 'body.tab.0', icon: 'body', name: 'Body' }, { id: 'body.tab.1', icon: 'states', name: 'States' },
      { id: 'body.tab.2', icon: 'patterns', name: 'Making' }, { id: 'body.tab.3', icon: 'skills', name: 'Skills' },
    ],
    chosen: st.bodyTab,
    onTab: (i) => { if (i === 3) { goSkills(); return; } st.bodyTab = i; ui.cue('tab'); ui.invalidate(); },
    kids: mainParts(st, b, true),
  });
  const kids: Node[] = [];
  if (making) kids.push(recipePanel({ b, st: st.panel, id: 'pack.recipes', x: left + 175, y: 0, h: BODY_H, ramp: 'clay', stations: ['hand'], wellH: 96, hintY: 152, grid: st.grid }));
  else kids.push(slab({ x: 0, y: 0, w: BODY_W, h: BODY_H, ramp: 'clay', kids: st.bodyTab === 1 ? statesParts(st) : bodyParts(st, ui, false) }));
  kids.push(main);
  return overWorld(ui, win, kids, { outside: () => { st.hand.dropHeld(); b.after(); } });
}

/** Under 400 units of width: the main slab alone with side tabs; Body and Making replace its upper 92 units. */
function narrow(st: PackState, b: Bench, ui: Ui): Node {
  const win = place(ui, 176 + 21, 182);
  const tab = st.narrowTab;
  const upper: Node[] = [];
  if (tab === 1) upper.push(...bodyParts(st, ui, true).filter((n) => n.y < 92));
  if (tab === 2) {
    const g = st.grid;
    upper.push(
      ...recipeControls({ b, st: st.panel, id: 'pack.recipes', x: 0, y: 0, h: 92, ramp: 'clay', stations: ['hand'], wellH: 38, hintY: 92, grid: g }),
      stackGrid(b, { store: 'grid', x: 112, y: 16, cols: 2, rows: 2, ramp: 'clay', each: (i) => ({ missing: g.ghost[i] ?? undefined }) }),
      resultSlot(b, g, 150, 25, 'clay', false),
    );
  }
  const main = tabbedSlab({
    id: 'pack.narrow', x: 21, y: 0, w: 176, h: 182, ramp: 'clay', edge: 'left',
    title: tab === 0 ? 'Pack' : tab === 1 ? st.name : 'Making', titleRoom: 40,
    tabs: [{ id: 'narrow.tab.0', icon: 'pack', name: 'Pack' }, { id: 'narrow.tab.1', icon: 'body', name: 'Body' }, { id: 'narrow.tab.2', icon: 'patterns', name: 'Making' }],
    chosen: tab,
    onTab: (i) => { st.narrowTab = i; ui.cue('tab'); ui.invalidate(); },
    kids: [...mainParts(st, b, tab === 0), ...upper],
  });
  return overWorld(ui, win, [main], { outside: () => { st.hand.dropHeld(); b.after(); } });
}

function build(ui: Ui, id: string, kind: 'mid' | 'empty' | 'full', bodyTab = 0): Node {
  let st = states.get(id);
  if (!st) { st = sample(kind); st.bodyTab = bodyTab; states.set(id, st); }
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  return ui.layout.wide ? wide(st, st.bench, ui) : narrow(st, st.bench, ui);
}

export const SCREENS: NamedScreen[] = [
  { name: 'pack', title: 'Pack', world: true, build: (ui) => build(ui, 'pack', 'mid') },
  { name: 'pack-empty', title: 'Pack, empty', world: true, build: (ui) => build(ui, 'pack-empty', 'empty') },
  { name: 'pack-full', title: 'Pack, full', world: true, build: (ui) => build(ui, 'pack-full', 'full') },
  { name: 'pack-states', title: 'Pack: states of the body', world: true, build: (ui) => build(ui, 'pack-states', 'mid', 1) },
  { name: 'pack-making', title: 'Pack: the patterns two hands can make, opened', world: true, build: (ui) => build(ui, 'pack-making', 'mid', 2) },
];
