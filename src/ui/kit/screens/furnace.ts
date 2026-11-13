// The five furnaces (section 6): one stone layout. A bed of eight raised stones holds the remains built in, beside
// the ore, the flame of the fuel left and the fuel, the arrow and what comes out; a side panel lists what the bed works.
// A furnace goes on working with the window shut, so the mock's furnaces keep their own clock.
import { SMALL } from '../font/face';
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

/** Eight raised stones round the hollow of the bed, each lit on its top and left and dark on its bottom and right. */
export function bed(x: number, y: number, stones: Stones): Node {
  const at = [[0, 0], [15, 0], [30, 0], [0, 15], [30, 15], [0, 30], [15, 30], [30, 30]];
  return {
    x, y, w: 42, h: 42,
    paint: (s) => {
      for (const [sx, sy] of at) {
        s.fill(sx + 1, sy, 10, 1, 'root.0'); s.fill(sx + 1, sy + 11, 10, 1, 'root.0');
        s.fill(sx, sy + 1, 1, 10, 'root.0'); s.fill(sx + 11, sy + 1, 1, 10, 'root.0');
        s.fill(sx + 1, sy + 1, 10, 10, stones[1]);
        s.fill(sx + 1, sy + 1, 9, 1, stones[0]); s.fill(sx + 1, sy + 2, 1, 8, stones[0]);
        s.fill(sx + 2, sy + 10, 9, 1, stones[2]); s.fill(sx + 10, sy + 1, 1, 9, stones[2]);
      }
    },
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
  const main: Node[] = [
    bed(10, 20, f.stones),
    stackSlot(b, { store: 'bed', i: 0 }, { x: 22, y: 32, ramp: 'stone', locked: f.remains ? { key: f.remains, n: 1 } : null, tip: () => (f.remains ? stackTip({ key: f.remains, n: 1 }, 'Built into the bed') : { lines: [{ text: 'An empty hollow', c: 'salt' }, { text: 'Remains bedded here loosen what plain fire cannot', c: 'root.4' }] }) }),
    stackSlot(b, { store: 'ore', i: 0 }, { x: 70, y: 17, ramp: 'stone', silhouette: 'work', showAccepts: true }),
    burnGauge({ x: 71, y: 36, f: f.burn[1] ? f.burn[0] / f.burn[1] : 0, ramp: 'stone' }),
    stackSlot(b, { store: 'fuel', i: 0 }, { x: 70, y: 53, ramp: 'stone', silhouette: 'fuel', showAccepts: true }),
    { ...progressArrow({ x: 96, y: 36, f: burning || STILL ? progress : 0, ramp: 'stone' }), anim: burning && !STILL },
    stackSlot(b, { store: 'out', i: 0 }, { x: 128, y: 31, ramp: 'stone', large: true }),
    ...packBlock(b, 'stone', 73, 84),
  ];
  const works = worksOf(f);
  const rows: RowSpec[] = works.map((w) => ({
    id: `${id}.work.${w.out}`, icon: thing(w.out).icon, name: thing(w.out).name, colour: gradeColour(thing(w.out).grade),
    tip: () => ({ ...stackTip({ key: w.out, n: 1 }, 'none'), lines: [...stackTip({ key: w.out, n: 1 }, 'none').lines.slice(0, 2), { text: `From ${thing(w.from).name}`, c: 'salt' }, { text: `${w.time} s to a piece`, c: 'root.4' }] }),
  }));
  const side: Node[] = [well({ id: `${id}.works`, x: 8, y: 18, w: 100, h: 128, host: 'stone', rows, ui })];
  if (burning) side.push({ x: 8, y: 150, w: 30, h: 6, paint: (s) => { s.text(clock(f.burn[0]), 0, 0, 'ink', false, SMALL); } });
  const win = place(ui, 291, 166);
  return overWorld(ui, win, [
    slab({ x: 0, y: 0, w: 176, h: 166, ramp: 'stone', title: f.name, kids: main }),
    slab({ x: 175, y: 0, w: 116, h: 166, ramp: 'stone', title: 'Works', kids: side }),
  ], { outside: () => { h.dropHeld(); b.after(); } });
}

export const SCREENS: NamedScreen[] = Object.entries(FURNACES).map(([name, f]) => ({ name, title: f.name, world: true, build: (ui: Ui) => build(ui, name) }));
