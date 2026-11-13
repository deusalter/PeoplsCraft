// The five furnaces (section 6): one stone layout. A bed of eight raised stones holds the remains built in, beside
// the ore, the flame of the fuel left and the fuel, the arrow and what comes out; a side panel lists what the bed works.
// A furnace goes on working with the window shut, so the mock's furnaces keep their own clock.
import { clock } from '../font/measure';
import type { Node, Ui } from '../node';
import type { Colour } from '../palette';
import { burnGauge, progressArrow } from '../parts/gauges';
import { slab } from '../parts/slab';
import { type RowSpec, well } from '../parts/well';
import { type Stack, gradeColour, stackTip, thing } from '../sample/play-items';
import { Bench, STILL, overWorld, packBlock, place, stackSlot } from './play/common';
import { Hand, type Place, store } from './play/hand';
import type { NamedScreen } from './index';

interface Work { from: string; out: string; time: number; forge: number }

/** What each fire sets, from the game's smelting table; a furnace works its own and every lower one's. */
const WORKS: Work[] = [
  { from: 'iron_ore', out: 'iron_bar', time: 8, forge: 1 }, { from: 'gold_ore', out: 'gold_bar', time: 8, forge: 1 },
  { from: 'sand', out: 'glass', time: 5, forge: 1 }, { from: 'cobble', out: 'stone', time: 5, forge: 1 },
  { from: 'clay', out: 'bricks', time: 6, forge: 1 }, { from: 'raw_meat', out: 'cooked_meat', time: 5, forge: 1 },
  { from: 'raw_fish', out: 'cooked_fish', time: 4, forge: 1 }, { from: 'oak_log', out: 'coal', time: 6, forge: 1 },
  { from: 'cindrite_ore', out: 'cinder_bar', time: 10, forge: 2 }, { from: 'umbrite_ore', out: 'umbrite_bar', time: 10, forge: 2 },
  { from: 'noctrium_ore', out: 'noctrium_bar', time: 12, forge: 3 }, { from: 'aetherium_ore', out: 'aether_bar', time: 12, forge: 3 },
  { from: 'prismite_ore', out: 'prism_bar', time: 14, forge: 4 }, { from: 'eclipsium_ore', out: 'eclipse_bar', time: 16, forge: 5 },
];

/** The raised stones of a bed: their light edge, face and dark edge. */
export type Stones = [Colour, Colour, Colour];

interface Furnace {
  name: string;
  forge: number;
  /** The remains built into the bed; the Stone Furnace's is an empty hollow. */
  remains: string | null;
  stones: Stones;
  ore: Stack | null; fuel: Stack | null; out: Stack | null;
  /** Seconds of fuel left in what is burning, of how many. */
  burn: [number, number];
  /** How far the present piece has gone, 0 to 1, while a script photographs. */
  still: number;
}

const FURNACES: Record<string, Furnace> = {
  'furnace-stone': { name: 'Stone Furnace', forge: 1, remains: null, stones: ['stone.hi', 'stone.lt', 'stone.sh'], ore: { key: 'iron_ore', n: 14 }, fuel: { key: 'coal', n: 6 }, out: { key: 'iron_bar', n: 3 }, burn: [52, 80], still: 0.6 },
  'furnace-maruhar': { name: 'Maruhar Furnace', forge: 2, remains: 'scorched_core', stones: ['stone.sh', 'stone.dk', 'stone.pit'], ore: { key: 'cindrite_ore', n: 9 }, fuel: { key: 'coal', n: 20 }, out: { key: 'cinder_bar', n: 2 }, burn: [31, 80], still: 0.35 },
  'furnace-guhamat': { name: 'Guhamāt Furnace', forge: 3, remains: 'queen_spore', stones: ['root.4', 'root.3', 'root.2'], ore: { key: 'noctrium_ore', n: 5 }, fuel: null, out: null, burn: [0, 80], still: 0 },
  'furnace-ratan': { name: 'Ratan Furnace', forge: 4, remains: 'prism_heart', stones: ['salt', 'clay.lt', 'clay.sh'], ore: { key: 'prismite_ore', n: 12 }, fuel: { key: 'ember_dust', n: 7 }, out: { key: 'prism_bar', n: 5 }, burn: [140, 160], still: 0.85 },
  'furnace-kuranga': { name: 'Kuranga Furnace', forge: 5, remains: 'eclipse_ember', stones: ['violet.dk', 'root.1', 'root.0'], ore: { key: 'eclipsium_ore', n: 3 }, fuel: { key: 'coal', n: 2 }, out: null, burn: [9, 80], still: 0.1 },
};

interface State { f: Furnace; hand: Hand; bench: Bench | null; started: number; timer: ReturnType<typeof setInterval> | 0 }
const states = new Map<string, State>();

function worksOf(f: Furnace): Work[] {
  return [...WORKS.filter((w) => w.forge === f.forge), ...WORKS.filter((w) => w.forge < f.forge)];
}

function open(id: string): State {
  let st = states.get(id);
  if (st) return st;
  const f = FURNACES[id];
  const works = worksOf(f);
  const hand = new Hand({
    ore: [f.ore ? { ...f.ore } : null], fuel: [f.fuel ? { ...f.fuel } : null], out: [f.out ? { ...f.out } : null],
    pack: store(27, {
      0: { key: works[0].from, n: 21 }, 1: { key: 'cobble', n: 64 }, 2: { key: 'coal', n: 17 }, 3: { key: 'raw_meat', n: 5 },
      5: { key: 'oak_log', n: 12 }, 9: { key: 'sand', n: 30 }, 10: { key: 'clay', n: 8 }, 18: { key: 'iron_ore', n: 4 },
    }),
    bar: store(9, { 0: { key: 'lumenite_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1 }, 4: { key: 'torch', n: 19 }, 5: { key: 'cooked_meat', n: 6 } }),
  });
  hand.rules.takes = (p: Place, s: Stack) => {
    if (p.store === 'ore') return works.some((w) => w.from === s.key);
    if (p.store === 'fuel') return !!thing(s.key).fuel;
    if (p.store === 'out') return false;
    return true;
  };
  hand.rules.route = (p) => {
    if (p.store === 'ore' || p.store === 'fuel' || p.store === 'out') return ['pack', 'bar'];
    const s = hand.get(p);
    if (s && works.some((w) => w.from === s.key)) return ['ore'];
    if (s && thing(s.key).fuel) return ['fuel'];
    return [p.store === 'pack' ? 'bar' : 'pack'];
  };
  hand.rules.closed = ['out'];
  st = { f: { ...f, burn: [...f.burn] }, hand, bench: null, started: -1, timer: 0 };
  states.set(id, st);
  return st;
}

/** One step of the furnace's own clock: fuel burns while there is something to work; a finished piece moves out. */
function tick(st: State, ui: Ui): void {
  const h = st.hand, f = st.f;
  const ore = h.stores.ore[0];
  const work = ore ? worksOf(f).find((w) => w.from === ore.key) : undefined;
  const out = h.stores.out[0];
  const room = !out || (work && out.key === work.out && out.n < thing(out.key).stack);
  if (!work || !room) { st.started = -1; return; }
  if (f.burn[0] <= 0) {
    const fuel = h.stores.fuel[0];
    if (!fuel) { st.started = -1; return; }
    f.burn = [thing(fuel.key).fuel!, thing(fuel.key).fuel!];
    fuel.n -= 1;
    if (!fuel.n) h.stores.fuel[0] = null;
  }
  if (st.started < 0) st.started = ui.t;
  f.burn[0] = Math.max(0, f.burn[0] - 0.25);
  if (ui.t - st.started >= work.time) {
    st.started = ui.t;
    ore!.n -= 1;
    if (!ore!.n) h.stores.ore[0] = null;
    if (out) out.n += 1; else h.stores.out[0] = { key: work.out, n: 1 };
  }
  ui.invalidate();
}

// A lamp of the bed, 9 by 9: s the bright spot, l the lit ring by it, b the body, d the shade, K root.0.
const LAMP = [
  '..KKKKK..',
  '.KslbbbK.',
  'KslbbbbdK',
  'KlbbbbbdK',
  'KbbbbbbdK',
  'KbbbbbbdK',
  'KbbbbbddK',
  '.KdddddK.',
  '..KKKKK..',
];
const LIT: Record<string, Colour> = { s: 'ember.hi', l: 'ember.lt', b: 'ember', d: 'ember.dk', K: 'root.0' };

/** Where the eight lamps stand round the bed's slot, clockwise from the top left, in a box 42 square. */
const LAMPS = [[0, 0], [17, 0], [33, 0], [33, 17], [33, 33], [17, 33], [0, 33], [0, 17]];

/**
 * The bed (F2): its slot of remains in the middle, ringed by eight lamps that show its heat. A lamp is dull, in the
 * stones of this furnace, until the bed reaches its eighth of the heat, then lit in ember; they light clockwise from
 * the top left. The ring's tooltip says how far it is lit. "Bed" is written over it in ink.
 */
export function bed(x: number, y: number, stones: Stones, heat: number): Node {
  const dull: Record<string, Colour> = { s: stones[0], l: stones[0], b: stones[1], d: stones[2], K: 'root.0' };
  const n = Math.max(0, Math.min(8, Math.round(heat)));
  return {
    x, y, w: 42, h: 42,
    paint: (s) => {
      LAMPS.forEach(([lx, ly], i) => {
        const key = i < n ? LIT : dull;
        LAMP.forEach((row, r) => { for (let c = 0; c < 9; c++) if (row[c] !== '.') s.fill(lx + c, ly + r, 1, 1, key[row[c]]); });
      });
    },
    tip: () => ({ lines: [{ text: n ? `Bed lit, ${n} of 8` : 'Bed cold', c: 'salt' }, { text: 'It heats while the fire burns', c: 'root.4' }] }),
  };
}

function build(ui: Ui, id: string): Node {
  const st = open(id);
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  if (!STILL && !st.timer) st.timer = setInterval(() => tick(st, ui), 250);
  const b = st.bench, f = st.f, h = st.hand;
  const ore = h.stores.ore[0];
  const work = ore ? worksOf(f).find((w) => w.from === ore.key) : undefined;
  const burning = f.burn[0] > 0 && !!work;
  const progress = STILL ? f.still : st.started >= 0 && work ? (ui.t - st.started) / work.time : 0;
  const heat = burning || STILL ? (f.burn[1] ? (8 * f.burn[0]) / f.burn[1] : 0) : 0;
  const main: Node[] = [
    { x: 10, y: 17, w: 30, h: 10, paint: (s) => { s.text('Bed', 0, 0, 'ink'); } },
    bed(10, 28, f.stones, heat),
    stackSlot(b, { store: 'bed', i: 0 }, { x: 22, y: 40, ramp: 'stone', locked: f.remains ? { key: f.remains, n: 1 } : null, missing: 'scorched_core', tip: () => (f.remains ? stackTip({ key: f.remains, n: 1 }, 'Built into the bed') : { lines: [{ text: 'An empty hollow', c: 'salt' }, { text: 'Remains bedded here loosen what plain fire cannot', c: 'root.4' }] }) }),
    stackSlot(b, { store: 'ore', i: 0 }, { x: 70, y: 17, ramp: 'stone', silhouette: 'work', showAccepts: true }),
    { ...burnGauge({ x: 71, y: 36, f: f.burn[1] ? f.burn[0] / f.burn[1] : 0, ramp: 'stone' }), tip: () => ({ lines: f.burn[0] > 0 ? [{ text: `Fuel for ${clock(f.burn[0])}`, c: 'salt' }] : [{ text: 'No fire', c: 'salt' }, { text: 'Fuel goes in the slot below', c: 'root.4' }] }) },
    stackSlot(b, { store: 'fuel', i: 0 }, { x: 70, y: 53, ramp: 'stone', silhouette: 'fuel', showAccepts: true }),
    { ...progressArrow({ x: 96, y: 36, f: burning || STILL ? progress : 0, ramp: 'stone' }), anim: burning && !STILL },
    stackSlot(b, { store: 'out', i: 0 }, { x: 128, y: 31, ramp: 'stone', large: true }),
    ...packBlock(b, 'stone', 73, 84),
  ];
  const works = worksOf(f);
  // A work can be done now when what it is made from is in the ore slot, the pack or the hotbar.
  const held = new Set([...h.stores.ore, ...h.stores.pack, ...h.stores.bar].filter((x): x is Stack => !!x).map((x) => x.key));
  const rows: RowSpec[] = works.map((w) => ({
    id: `${id}.work.${w.out}`, icon: thing(w.out).icon, name: thing(w.out).name, colour: gradeColour(thing(w.out).grade), disabled: !held.has(w.from),
    tip: () => ({ ...stackTip({ key: w.out, n: 1 }, 'none'), lines: [...stackTip({ key: w.out, n: 1 }, 'none').lines.slice(0, 2), { text: `From ${thing(w.from).name}`, c: 'salt' }, { text: `${w.time} s to a piece`, c: 'root.4' }] }),
  }));
  const side: Node[] = [well({ id: `${id}.works`, x: 8, y: 18, w: 100, h: 128, host: 'stone', rows, ui })];
  const win = place(ui, 291, 166);
  return overWorld(ui, win, [
    slab({ x: 0, y: 0, w: 176, h: 166, ramp: 'stone', title: f.name, kids: main }),
    slab({ x: 175, y: 0, w: 116, h: 166, ramp: 'stone', title: 'Works', kids: side }),
  ], { outside: () => { h.dropHeld(); b.after(); } });
}

export const SCREENS: NamedScreen[] = Object.entries(FURNACES).map(([name, f]) => ({ name, title: f.name, world: true, build: (ui: Ui) => build(ui, name) }));
