// The Joining Bench (section 6): two worked pieces laid against the remains built into the bench, joined along cut
// lines into one piece. The recipe panel of the bench screens fastens to the right with the patterns of joining.
import type { Node, Ui } from '../node';
import { progressArrow } from '../parts/gauges';
import { slab } from '../parts/slab';
import { PATTERNS } from '../sample/play-patterns';
import { type Stack, thing } from '../sample/play-items';
import { Bench, overWorld, packBlock, place, stackSlot } from './play/common';
import { Hand, type Place, store } from './play/hand';
import { type Grid, type PanelState, gridMatch, recipeControls, recipePanel, resultSlot } from './play/making';
import { tabbedSlab } from '../parts/tabs';
import type { NamedScreen } from './index';

interface State { hand: Hand; grid: Grid; panel: PanelState; bench: Bench | null; side: number }
let state: State | null = null;

function open(): State {
  if (state) return state;
  const hand = new Hand({
    piece: [{ key: 'strider_boots', n: 1 }, { key: 'spring_anklet', n: 1 }, null, null],
    pack: store(27, {
      0: { key: 'cloud_bottle', n: 1 }, 1: { key: 'feather_charm', n: 1 }, 2: { key: 'warriors_band', n: 1 }, 3: { key: 'marksman_lens', n: 1 },
      4: { key: 'heart_locket', n: 1 }, 5: { key: 'mana_charm', n: 1 }, 6: { key: 'iron_bracer', n: 1 }, 9: { key: 'flint', n: 7 },
      10: { key: 'iron_bar', n: 12 }, 11: { key: 'oak_planks', n: 30 }, 18: { key: 'strider_boots', n: 1 }, 19: { key: 'gold_bar', n: 3 },
    }),
    bar: store(9, { 0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'lumenite_sword', n: 1 }, 2: { key: 'iron_bow', n: 1 }, 3: { key: 'arrow', n: 52 }, 5: { key: 'cooked_meat', n: 9 } }),
  }, { closed: ['piece'] });
  hand.rules.takes = (p: Place, s: Stack) => p.store !== 'piece' || thing(s.key).wear === 'trinket' || thing(s.key).kind === 'material';
  hand.rules.route = (p) => {
    if (p.store === 'piece') return ['pack', 'bar'];
    const s = hand.get(p);
    if (s && thing(s.key).wear === 'trinket') return ['piece'];
    return [p.store === 'pack' ? 'bar' : 'pack'];
  };
  const grid: Grid = { store: 'piece', w: 2, ghost: Array(4).fill(null), among: PATTERNS.filter((p) => p.station === 'tinker') };
  state = { hand, grid, panel: { search: '', canMake: false, kind: 0, tab: 0 }, bench: null, side: 0 };
  return state;
}

/** A cut line from a piece to the remains; lit in ember while the two pieces make something. */
export function line(x: number, y: number, w: number, lit: boolean): Node {
  return {
    x, y, w, h: 2,
    paint: (s) => { s.fill(0, 0, w, 1, lit ? 'ember' : 'timber.pit'); s.fill(0, 1, w, 1, lit ? 'ember.dk' : 'timber.hi'); },
  };
}

function build(ui: Ui): Node {
  const st = open();
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  const b = st.bench, g = st.grid;
  const joined = !!gridMatch(st.hand, g);
  const joining: Node[] = [
    stackSlot(b, { store: 'piece', i: 0 }, { x: 26, y: 35, ramp: 'timber', silhouette: 'trinket', showAccepts: true, missing: g.ghost[0] ?? undefined }),
    line(44, 43, 12, joined),
    stackSlot(b, { store: 'remains', i: 0 }, { x: 56, y: 35, ramp: 'timber', locked: { key: 'heartroot', n: 1 } }),
    line(74, 43, 12, joined),
    stackSlot(b, { store: 'piece', i: 1 }, { x: 86, y: 35, ramp: 'timber', silhouette: 'trinket', showAccepts: true, missing: g.ghost[1] ?? undefined }),
    progressArrow({ x: 108, y: 37, f: joined ? 1 : 0, ramp: 'timber' }),
    resultSlot(b, g, 136, 31, 'timber', true),
  ];
  const pack = packBlock(b, 'timber', 73, 84);
  const outside = () => { st.hand.dropHeld(); b.after(); };
  const stations: ('tinker' | 'workbench' | 'anvil')[] = ['tinker', 'workbench', 'anvil'];
  if (!ui.layout.wide) {
    const win = place(ui, 176 + 21, 166);
    const upper = st.side === 0 ? joining : recipeControls({
      b, st: st.panel, id: 'joining.recipes', x: 0, y: 0, h: 70, ramp: 'timber', stations, wellH: 38, hintY: 70, grid: g, compact: true, wellW: 152,
    });
    return overWorld(ui, win, [tabbedSlab({
      id: 'joining.narrow', x: 21, y: 0, w: 176, h: 166, ramp: 'timber', edge: 'left',
      title: st.side === 0 ? 'Joining Bench' : 'Joining Bench: patterns',
      tabs: [{ id: 'joining.side.0', icon: 'tinker_bench', name: 'Joining Bench' }, { id: 'joining.side.1', icon: 'patterns', name: 'Patterns' }],
      chosen: st.side,
      onTab: (i) => { st.side = i; ui.cue('tab'); ui.invalidate(); },
      kids: [...upper, ...pack],
    })], { outside });
  }
  const win = place(ui, 291, 166, 21);
  return overWorld(ui, win, [
    slab({ x: 0, y: 0, w: 176, h: 166, ramp: 'timber', title: 'Joining Bench', kids: [...joining, ...pack] }),
    recipePanel({ b, st: st.panel, id: 'joining.recipes', x: 175, y: 0, h: 166, ramp: 'timber', stations, wellH: 92, hintY: 148, grid: g }),
  ], { outside });
}

export const SCREENS: NamedScreen[] = [{ name: 'joining', title: 'Joining Bench', world: true, build }];
