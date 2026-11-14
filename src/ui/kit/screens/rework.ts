// The reworking bench (section 6, to come): the Sealed Bench found in a dungeon, built round the remains of the
// hollow's strongest. A made piece is put at hazard for a better setting: with the piece, a bar of its metal and fuel
// in, "Work it" draws its modifier again; the metal stays. A named old thing answers with the refusal frame.
import { measure } from '../font/measure';
import type { Node, Ui } from '../node';
import type { Surface } from '../surface';
import { button } from '../parts/button';
import { burnGauge, progressArrow } from '../parts/gauges';
import { slab } from '../parts/slab';
import { MODS, type Stack, stackGrade, stackName, stackTip, thing, gradeColour } from '../sample/play-items';
import { Bench, STILL, cutLine, overWorld, packBlock, place, stackSlot } from './play/common';
import { Hand, type Place, store } from './play/hand';
import type { NamedScreen } from './index';

const METAL: Record<string, string> = { iron: 'iron_bar', lumenite: 'lumenite', cinder: 'cinder_bar' };
const WEAPON_MODS = ['keen', 'savage', 'swift', 'heavy', 'dull', 'blessed'];
const ARMOUR_MODS = ['warding', 'brittle', 'radiant'];
const WORK_S = 1.6;

function metalOf(key: string): string | null { return METAL[key.split('_')[0]] ?? null; }
function reworkable(s: Stack): boolean { const t = thing(s.key); return !!metalOf(s.key) && (t.kind === 'weapon' || t.kind === 'tool' || t.kind === 'armour') && !s.key.startsWith('find:'); }

interface State { hand: Hand; bench: Bench | null; working: number; roll: number }
let state: State | null = null;

function open(): State {
  if (state) return state;
  const hand = new Hand({
    piece: [{ key: 'iron_sword', n: 1, mod: 'dull' }], metal: [{ key: 'iron_bar', n: 3 }], fuel: [{ key: 'coal', n: 5 }], out: [null],
    pack: store(27, {
      0: { key: 'find:stone_staff', n: 1 }, 1: { key: 'lumenite_sword', n: 1, mod: 'heavy' }, 2: { key: 'iron_melee_1', n: 1, mod: 'brittle' },
      3: { key: 'lumenite', n: 2 }, 4: { key: 'iron_bar', n: 8 }, 5: { key: 'coal', n: 22 }, 9: { key: 'cinder_bar', n: 1 },
      10: { key: 'iron_pickaxe', n: 1 }, 18: { key: 'oak_log', n: 11 },
    }),
    bar: store(9, { 0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'cinder_sword', n: 1, mod: 'keen' }, 3: { key: 'arrow', n: 18 }, 5: { key: 'stew', n: 2 } }),
  }, { closed: ['out'] });
  hand.rules.takes = (p: Place, s: Stack) => {
    if (p.store === 'piece') return reworkable(s);
    if (p.store === 'metal') return Object.values(METAL).includes(s.key);
    if (p.store === 'fuel') return !!thing(s.key).fuel;
    if (p.store === 'out') return false;
    return true;
  };
  hand.rules.route = (p) => {
    if (['piece', 'metal', 'fuel', 'out'].includes(p.store)) return ['pack', 'bar'];
    const s = hand.get(p);
    if (s && reworkable(s)) return ['piece'];
    if (s && Object.values(METAL).includes(s.key)) return ['metal'];
    if (s && thing(s.key).fuel) return ['fuel'];
    return [p.store === 'pack' ? 'bar' : 'pack'];
  };
  state = { hand, bench: null, working: -1, roll: 0 };
  return state;
}

function ready(h: Hand): boolean {
  const p = h.stores.piece[0], b = h.stores.metal[0];
  return !!p && !!b && !!h.stores.fuel[0] && metalOf(p.key) === b.key && !h.stores.out[0];
}

function work(st: State, ui: Ui): void {
  const h = st.hand;
  if (!ready(h) || st.working >= 0) return;
  st.working = ui.t;
  ui.cue('press');
  setTimeout(() => {
    const piece = h.stores.piece[0]!;
    const pool = thing(piece.key).kind === 'armour' ? ARMOUR_MODS : WEAPON_MODS;
    const mod = pool[(++st.roll * 7 + Math.floor(ui.t * 13)) % pool.length];
    h.stores.out[0] = { key: piece.key, n: 1, mod };
    h.stores.piece[0] = null;
    for (const k of ['metal', 'fuel']) { const s = h.stores[k][0]!; s.n -= 1; if (!s.n) h.stores[k][0] = null; }
    st.working = -1;
    st.bench?.after();
  }, WORK_S * 1000);
  ui.invalidate();
}

/** "Costs 1 Iron Bar, 1 Coal": the bar the piece's metal asks for, or the one laid in, and the fuel laid in. */
function cost(h: Hand): string {
  const p = h.stores.piece[0], m = h.stores.metal[0], f = h.stores.fuel[0];
  const bar = p && metalOf(p.key) ? thing(metalOf(p.key)!).name : m ? thing(m.key).name : 'bar';
  return `Costs 1 ${bar}, 1 ${f ? thing(f.key).name : 'fuel'}`;
}

function build(ui: Ui): Node {
  const st = open();
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  const b = st.bench, h = st.hand;
  const piece = h.stores.piece[0];
  const can = ready(h);
  const out = h.stores.out[0];
  const main: Node[] = [
    // One row read left to right: the piece, the remains built into the bench, the bar, joined by cut lines, then the
    // arrow and what comes out. The fire that works it stands under the piece, as under a furnace's ore, which leaves
    // the width under the remains for what a working costs.
    stackSlot(b, { store: 'piece', i: 0 }, { x: 21, y: 17, ramp: 'stone', silhouette: 'rework', showAccepts: true }),
    cutLine(39, 25, 8, 'stone'),
    stackSlot(b, { store: 'remains', i: 0 }, { x: 47, y: 17, ramp: 'stone', locked: { key: 'queen_spore', n: 1 }, hint: 'Built into the bench' }),
    cutLine(65, 25, 8, 'stone'),
    stackSlot(b, { store: 'metal', i: 0 }, { x: 73, y: 17, ramp: 'stone', silhouette: 'bar', showAccepts: true }),
    burnGauge({ x: 24, y: 36, f: h.stores.fuel[0] ? 0.8 : 0, ramp: 'stone' }),
    stackSlot(b, { store: 'fuel', i: 0 }, { x: 21, y: 53, ramp: 'stone', silhouette: 'fuel', showAccepts: true }),
    {
      x: 97, y: 19, w: 22, h: 15, anim: st.working >= 0 && !STILL,
      paint: (s, live) => progressArrow({ x: 0, y: 0, f: st.working >= 0 ? (live.t - st.working) / WORK_S : out ? 1 : 0, ramp: 'stone' }).paint!(s, live),
    },
    stackSlot(b, { store: 'out', i: 0 }, {
      x: 128, y: 13, ramp: 'stone', large: true,
      missing: !out && can && piece ? thing(piece.key).icon : undefined,
      tip: () => {
        if (out) return stackTip(out);
        if (!can || !piece) return null;
        return {
          lines: [
            { text: stackName(piece), c: gradeColour(stackGrade(piece)) },
            { text: piece.mod ? `Now ${MODS[piece.mod].name}: a new modifier is drawn` : 'A modifier is drawn', c: 'salt' },
            { text: 'It may come out worse', c: 'blood.lt' },
          ],
        };
      },
    }),
    button({ id: 'rework.work', x: 128, y: 43, w: 40, h: 14, ramp: 'stone', label: 'Work it', disabled: !can || st.working >= 0, onPress: () => work(st, ui) }),
    // What a working takes and what it gives, written under the button so that it is weighed before it is pressed.
    ...[
      { text: cost(h), c: 'ink' as const, y: 59 },
      { text: 'Rolls a new modifier', c: 'ink.faded' as const, y: 69 },
    ].map((l) => ({ x: 47, y: l.y, w: measure(l.text), h: 10, paint: (s: Surface) => { s.text(l.text, 0, 0, l.c); } })),
    ...packBlock(b, 'stone', 73, 84, { sort: false }),
  ];
  const win = place(ui, 176, 166);
  return overWorld(ui, win, [slab({ x: 0, y: 0, w: 176, h: 166, ramp: 'stone', title: 'Sealed Bench', kids: main })], {
    outside: () => { h.dropHeld(); b.after(); },
  });
}

export const SCREENS: NamedScreen[] = [{ name: 'rework', title: 'Sealed Bench', world: true, build }];
