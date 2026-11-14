// The pot (section 6, to come): remains, salt and fuel in, a night passing, lees out. Nothing in the game's tables
// boils remains down yet, so its sample is what the telling says a hearth does with them; there is no salt to lay in.
import { measure } from '../font/measure';
import type { Node, Ui } from '../node';
import type { Surface } from '../surface';
import { coded } from '../pixmap';
import { burnGauge, channel, progressArrow } from '../parts/gauges';
import { slab } from '../parts/slab';
import { type Stack, thing } from '../sample/play-items';
import { Bench, STILL, cutLine, cycle, overWorld, packBlock, place, stackGrid, stackSlot } from './play/common';
import { SALT } from './play/art';
import { Hand, type Place, store } from './play/hand';
import type { NamedScreen } from './index';

/** The mark under the water channel: a drop, 9 by 9, lit from the top left, so the gauge is not read as heat. */
const DROP = coded([
  '....K....',
  '...KbK...',
  '..KbBBK..',
  '..KbBBK..',
  '.KbBBBdK.',
  '.KbBBBdK.',
  '.KBBBBdK.',
  '..KBddK..',
  '...KKK...',
], 'pot.drop');

const WATER = { lines: [{ text: 'Water', c: 'salt' as const }, { text: 'It boils down through the night', c: 'root.4' as const }], delay: 0.4 };

const REMAINS = new Set(['shade_essence', 'chitin', 'gel', 'bone', 'spore_sac', 'raw_meat']);

interface State { hand: Hand; bench: Bench | null; opened: number }
let state: State | null = null;

function open(ui: Ui): State {
  if (state) return state;
  const hand = new Hand({
    remains: [{ key: 'shade_essence', n: 6 }, { key: 'chitin', n: 3 }],
    salt: [null], fuel: [{ key: 'coal', n: 4 }], out: [null],
    pack: store(27, {
      0: { key: 'shade_essence', n: 2 }, 1: { key: 'bone', n: 11 }, 2: { key: 'gel', n: 8 }, 3: { key: 'coal', n: 15 },
      4: { key: 'oak_log', n: 6 }, 9: { key: 'bog_pearl', n: 37 }, 10: { key: 'raw_meat', n: 3 }, 18: { key: 'spore_sac', n: 2 },
    }),
    bar: store(9, { 0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1 }, 4: { key: 'torch', n: 8 }, 5: { key: 'stew', n: 3 } }),
  }, { closed: ['out'] });
  hand.rules.takes = (p: Place, s: Stack) => {
    if (p.store === 'remains') return REMAINS.has(s.key);
    if (p.store === 'fuel') return !!thing(s.key).fuel;
    if (p.store === 'salt' || p.store === 'out') return false;
    return true;
  };
  hand.rules.route = (p) => {
    if (['remains', 'salt', 'fuel', 'out'].includes(p.store)) return ['pack', 'bar'];
    const s = hand.get(p);
    if (s && REMAINS.has(s.key)) return ['remains'];
    if (s && thing(s.key).fuel) return ['fuel'];
    return [p.store === 'pack' ? 'bar' : 'pack'];
  };
  state = { hand, bench: null, opened: ui.t };
  return state;
}

function build(ui: Ui): Node {
  const st = open(ui);
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  const b = st.bench, h = st.hand;
  const boiling = !!h.stores.fuel[0] && h.stores.remains.some((s) => s);
  // A night of the mock passes in four minutes; the gauge fills by whole units from the bottom.
  const night = (t: number) => (boiling ? cycle(t - st.opened + 96, 240, 0.4) : 0);
  const main: Node[] = [
    stackGrid(b, { store: 'remains', x: 26, y: 17, cols: 2, rows: 1, ramp: 'clay', each: () => ({ silhouette: 'work', showAccepts: true }) }),
    cutLine(62, 25, 8, 'clay'),
    stackSlot(b, { store: 'salt', i: 0 }, {
      x: 70, y: 17, ramp: 'clay', silMap: SALT,
      tip: () => ({ lines: [{ text: 'Salt', c: 'salt' }, { text: 'No salt is dug on this ground yet', c: 'root.4' }] }),
    }),
    burnGauge({ x: 38, y: 36, f: boiling ? 0.7 : 0, ramp: 'clay' }),
    stackSlot(b, { store: 'fuel', i: 0 }, { x: 35, y: 53, ramp: 'clay', silhouette: 'fuel', showAccepts: true }),
    {
      x: 76, y: 36, w: 6, h: 31,
      paint: (s, live) => channel({ x: 0, y: 0, len: 31, f: boiling ? 1 - 0.75 * night(live.t) : 0, ramp: 'clay', colour: 'arm', upright: true }).paint!(s, live),
      anim: boiling && !STILL,
      tip: () => WATER,
    },
    { x: 74, y: 69, w: 9, h: 9, paint: (s) => s.map(DROP, 0, 0), tip: () => WATER },
    {
      ...progressArrow({ x: 97, y: 36, f: 0, ramp: 'clay' }),
      paint: (s, live) => progressArrow({ x: 0, y: 0, f: night(live.t), ramp: 'clay' }).paint!(s, live),
      anim: boiling && !STILL,
      tip: () => ({ lines: [{ text: 'The night', c: 'salt' }, { text: 'Nothing comes out before first light', c: 'root.4' }], delay: 0.4 }),
    },
    stackSlot(b, { store: 'out', i: 0 }, { x: 128, y: 31, ramp: 'clay', large: true }),
    // An empty arrow alone does not say why nothing boils; the line under the lees says what is missing.
    ...(boiling ? [] : [(() => {
      const why = !h.stores.remains.some((s) => s) ? 'No remains' : 'No fire';
      return { x: 154 - measure(why) + 1, y: 61, w: measure(why), h: 10, paint: (s: Surface) => { s.text(why, 0, 0, 'ink.faded'); } };
    })()]),
    ...packBlock(b, 'clay', 73, 84, { sort: false }),
  ];
  const win = place(ui, 176, 166);
  return overWorld(ui, win, [slab({ x: 0, y: 0, w: 176, h: 166, ramp: 'clay', title: 'Pot', kids: main })], {
    outside: () => { h.dropHeld(); b.after(); },
  });
}

export const SCREENS: NamedScreen[] = [{ name: 'pot', title: 'Pot', world: true, build }];
