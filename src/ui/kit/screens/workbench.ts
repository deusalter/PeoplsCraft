// The Workbench, the Anvil and the Line Frame (section 6): one layout of three by three grid, arrow and large result
// over the pack, with the recipe panel fastened to the right. Timber for the Workbench and the Line Frame, stone for
// the Anvil; the Line Frame's arrow fills in arm blue, because the work there is line and crystal.
import type { Node, Ui } from '../node';
import type { Colour, Ramp } from '../palette';
import { progressArrow } from '../parts/gauges';
import { slab } from '../parts/slab';
import { PATTERNS } from '../sample/play-patterns';
import { type Stack, thing } from '../sample/play-items';
import { Bench, ink, overWorld, packBlock, place, stackGrid } from './play/common';
import { Hand, store } from './play/hand';
import { type Grid, type PanelState, type Station, STATION_ICON, STATION_NAME, gridMatch, layOut, recipeControls, recipePanel, resultSlot } from './play/making';
import { tabbedSlab } from '../parts/tabs';
import type { NamedScreen } from './index';

interface Kind {
  name: string;
  station: Station;
  ramp: Ramp;
  arrow: Colour;
  /** The stations whose patterns its panel may read, itself first. */
  stations: Station[];
  pack: Record<number, Stack>;
  bar: Record<number, Stack>;
  /** The pattern laid on the grid when the screen opens. */
  laid: string;
}

const KINDS: Record<string, Kind> = {
  workbench: {
    name: 'Workbench', station: 'workbench', ramp: 'timber', arrow: 'ember', stations: ['workbench', 'hand', 'anvil'],
    pack: {
      0: { key: 'oak_planks', n: 52 }, 1: { key: 'cobble', n: 99 }, 2: { key: 'cobble', n: 12 }, 3: { key: 'stick', n: 14 },
      4: { key: 'fiber', n: 9 }, 5: { key: 'hide', n: 6 }, 6: { key: 'flint', n: 4 }, 7: { key: 'feather', n: 11 },
      9: { key: 'iron_bar', n: 5 }, 10: { key: 'coal', n: 31 }, 11: { key: 'mushroom_red', n: 3 }, 12: { key: 'mushroom_brown', n: 2 },
      13: { key: 'mana_crystal', n: 1 }, 18: { key: 'oak_log', n: 17 }, 19: { key: 'stone', n: 24 }, 20: { key: 'berries', n: 8 },
    },
    bar: { 0: { key: 'stone_pickaxe', n: 1 }, 1: { key: 'stone_sword', n: 1 }, 2: { key: 'iron_axe', n: 1 }, 4: { key: 'torch', n: 30 }, 5: { key: 'apple', n: 4 }, 8: { key: 'oak_planks', n: 64 } },
    laid: 'chest',
  },
  anvil: {
    name: 'Anvil', station: 'anvil', ramp: 'stone', arrow: 'ember', stations: ['anvil', 'workbench', 'runeloom'],
    pack: {
      0: { key: 'iron_bar', n: 26 }, 1: { key: 'gold_bar', n: 4 }, 2: { key: 'lumenite', n: 3 }, 3: { key: 'stick', n: 22 },
      4: { key: 'feather', n: 8 }, 5: { key: 'hide', n: 2 }, 6: { key: 'gel', n: 5 }, 9: { key: 'coal', n: 44 },
      10: { key: 'glass', n: 2 }, 11: { key: 'salve', n: 3 }, 12: { key: 'bone', n: 4 }, 13: { key: 'shade_essence', n: 1 },
      18: { key: 'iron_ore', n: 9 }, 19: { key: 'cobble', n: 63 },
    },
    bar: { 0: { key: 'stone_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1 }, 2: { key: 'wood_bow', n: 1 }, 3: { key: 'arrow', n: 40 }, 4: { key: 'torch', n: 12 }, 5: { key: 'cooked_meat', n: 7 } },
    laid: 'iron_pickaxe',
  },
  lineframe: {
    name: 'Line Frame', station: 'runeloom', ramp: 'timber', arrow: 'arm', stations: ['runeloom', 'workbench', 'anvil'],
    pack: {
      0: { key: 'iron_bar', n: 6 }, 1: { key: 'gold_bar', n: 2 }, 2: { key: 'stick', n: 9 }, 3: { key: 'glass', n: 3 },
      4: { key: 'feather', n: 5 }, 5: { key: 'weave', n: 2 }, 6: { key: 'shade_essence', n: 6 }, 9: { key: 'stone', n: 20 },
      10: { key: 'lumenite', n: 1 },
    },
    bar: { 0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1 }, 4: { key: 'torch', n: 16 }, 5: { key: 'stew', n: 2 } },
    laid: 'iron_staff',
  },
};

interface State { hand: Hand; grid: Grid; panel: PanelState; bench: Bench | null; side: number }
const states = new Map<string, State>();

function open(id: string, k: Kind): State {
  let st = states.get(id);
  if (st) return st;
  const hand = new Hand({ pack: store(27, k.pack), bar: store(9, k.bar), grid: store(9) }, {
    route: (p) => (p.store === 'pack' ? ['bar'] : p.store === 'bar' ? ['pack'] : ['pack', 'bar']),
    closed: ['grid'],
  });
  const grid: Grid = { store: 'grid', w: 3, ghost: Array(9).fill(null), among: PATTERNS.filter((p) => p.station === k.station || p.station === 'hand') };
  const first = PATTERNS.find((p) => p.out === k.laid);
  if (first) layOut(hand, grid, first);
  st = { hand, grid, panel: { search: '', canMake: false, tab: 0 }, bench: null, side: 0 };
  states.set(id, st);
  return st;
}

function build(ui: Ui, id: string): Node {
  const k = KINDS[id];
  const st = open(id, k);
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  const b = st.bench, g = st.grid;
  const matched = gridMatch(st.hand, g);
  // A laid pattern's empty cells: the missing thing's silhouette in a frame of blood, while pieces lie on the grid.
  const laid = st.hand.stores.grid.some((s) => s);
  const wanting = (i: number) => !matched && laid && !!g.ghost[i] && !st.hand.stores.grid[i];
  const making: Node[] = [
    stackGrid(b, { store: 'grid', x: 30, y: 17, cols: 3, rows: 3, ramp: k.ramp, each: (i) => ({ missing: g.ghost[i] ?? undefined, mark: wanting(i) ? 'wanting' : undefined }) }),
    progressArrow({ x: 91, y: 36, f: matched ? 1 : 0, ramp: k.ramp, colour: k.arrow }),
    resultSlot(b, g, 122, 31, k.ramp, true),
  ];
  // Pieces on the grid that make nothing say why under the arrow, as a refusal: what the laid pattern is short of, or
  // that nothing joins. In faded ink it read as a caption.
  const gaps = g.ghost.filter((x, i): x is string => !!x && !st.hand.stores.grid[i]);
  const kinds = new Set(gaps);
  const why = !gaps.length ? '{cross} Nothing joins'
    : kinds.size > 1 ? `{cross} ${gaps.length} pieces short`
    : `{cross} ${gaps.length > 1 ? `${gaps.length} ` : ''}${thing(gaps[0]).name} short`;
  if (!matched && laid) making.push(ink(91, 59, why, 'blood.dk', 168 - 91));
  const pack = packBlock(b, k.ramp, 73, 84);
  const outside = () => { st.hand.dropHeld(); b.after(); };
  if (!ui.layout.wide) {
    // Under 400 units the recipe panel is a side tab on the slab's left edge and stands in the grid's place when chosen.
    const win = place(ui, 176 + 21, 166);
    const upper = st.side === 0 ? making : recipeControls({
      b, st: st.panel, id: `${id}.recipes`, x: 0, y: 0, h: 70, ramp: k.ramp, stations: k.stations, wellH: 38, hintY: 70, grid: g, compact: true, wellW: 152,
    });
    return overWorld(ui, win, [tabbedSlab({
      id: `${id}.narrow`, x: 21, y: 0, w: 176, h: 166, ramp: k.ramp, edge: 'left',
      title: st.side === 0 ? STATION_NAME[k.station] : `${STATION_NAME[k.station]}: patterns`,
      tabs: [{ id: `${id}.side.0`, icon: STATION_ICON[k.station], name: STATION_NAME[k.station] }, { id: `${id}.side.1`, icon: 'patterns', name: 'Patterns' }],
      chosen: st.side,
      onTab: (i) => { st.side = i; ui.cue('tab'); ui.invalidate(); },
      kids: [...upper, ...pack],
    })], { outside });
  }
  const win = place(ui, 291, 166, 21);
  return overWorld(ui, win, [
    slab({ x: 0, y: 0, w: 176, h: 166, ramp: k.ramp, title: STATION_NAME[k.station], kids: [...making, ...pack] }),
    recipePanel({ b, st: st.panel, id: `${id}.recipes`, x: 175, y: 0, h: 166, ramp: k.ramp, stations: k.stations, wellH: 92, hintY: 148, grid: g }),
  ], { outside });
}

export const SCREENS: NamedScreen[] = [
  { name: 'workbench', title: 'Workbench', world: true, build: (ui) => build(ui, 'workbench') },
  { name: 'anvil', title: 'Anvil', world: true, build: (ui) => build(ui, 'anvil') },
  { name: 'lineframe', title: 'Line Frame', world: true, build: (ui) => build(ui, 'lineframe') },
];
