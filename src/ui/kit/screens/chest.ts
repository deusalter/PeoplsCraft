// The chest (section 6): twenty-seven slots of timber over the pack, and the buttons that move whole kinds at once.
import type { Node, Ui } from '../node';
import { slab } from '../parts/slab';
import { Bench, overWorld, packBlock, place, small, stackGrid } from './play/common';
import { Hand, store } from './play/hand';
import type { NamedScreen } from './index';

function sample(): Hand {
  return new Hand({
    chest: store(27, {
      0: { key: 'cobble', n: 99 }, 1: { key: 'cobble', n: 99 }, 2: { key: 'cobble', n: 41 }, 3: { key: 'oak_log', n: 32 },
      4: { key: 'oak_planks', n: 87 }, 6: { key: 'iron_ore', n: 23 }, 7: { key: 'coal', n: 58 }, 8: { key: 'bog_pearl', n: 999 },
      9: { key: 'sand', n: 64 }, 10: { key: 'glass', n: 12 }, 12: { key: 'hide', n: 9 }, 13: { key: 'feather', n: 17 },
      14: { key: 'bone', n: 6 }, 15: { key: 'gel', n: 14 }, 18: { key: 'verdant_idol', n: 1 }, 19: { key: 'heartroot', n: 1 },
      20: { key: 'hide_0', n: 1 }, 21: { key: 'hide_2', n: 1 }, 24: { key: 'mushroom_red', n: 5 }, 25: { key: 'mushroom_brown', n: 7 },
      26: { key: 'gloomcap_violet', n: 3 },
    }),
    pack: store(27, {
      0: { key: 'cobble', n: 34 }, 1: { key: 'dirt', n: 61 }, 2: { key: 'iron_ore', n: 7 }, 3: { key: 'coal', n: 12 },
      5: { key: 'stick', n: 19 }, 6: { key: 'fiber', n: 22 }, 9: { key: 'raw_meat', n: 4 }, 10: { key: 'apple', n: 6 },
      13: { key: 'flint', n: 3 }, 14: { key: 'feather', n: 2 }, 18: { key: 'stone_sword', n: 1 }, 20: { key: 'oak_log', n: 9 },
      26: { key: 'iron_bar', n: 3 },
    }),
    bar: store(9, {
      0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1, mod: 'keen' }, 2: { key: 'wood_bow', n: 1 }, 3: { key: 'arrow', n: 37 },
      4: { key: 'torch', n: 23 }, 5: { key: 'cooked_meat', n: 11 }, 6: { key: 'salve', n: 4 }, 8: { key: 'oak_planks', n: 40 },
    }),
  }, {
    route: (p) => (p.store === 'chest' ? ['pack', 'bar'] : ['chest']),
  });
}

let hand: Hand | null = null;
let bench: Bench | null = null;

/** Moves every stack of the chest into the pack, then the hotbar. */
function takeAll(h: Hand): void {
  h.stores.chest.forEach((s, i) => { if (s) { s.n = h.into(s, ['pack', 'bar']); if (!s.n) h.stores.chest[i] = null; } });
}

/** Moves out of the pack every kind the chest already holds. */
function stash(h: Hand): void {
  const kinds = new Set(h.stores.chest.filter((s) => s).map((s) => s!.key));
  h.stores.pack.forEach((s, i) => { if (s && kinds.has(s.key)) { s.n = h.into(s, ['chest']); if (!s.n) h.stores.pack[i] = null; } });
}

function build(ui: Ui, title: string): Node {
  hand ??= sample();
  if (!bench || bench.ui !== ui) bench = new Bench(hand, ui);
  const b = bench, h = hand;
  const win = place(ui, 176, 172);
  const kids: Node[] = [
    small('chest.take', 56, 3, 44, 'Take all', () => { takeAll(h); b.after(); }),
    small('chest.stash', 102, 3, 34, 'Stash', () => { stash(h); b.after(); }),
    small('chest.sort', 138, 3, 30, 'Sort', () => { h.sort('chest'); b.after(); }),
    stackGrid(b, { store: 'chest', x: 8, y: 18, cols: 9, rows: 3, ramp: 'timber' }),
    ...packBlock(b, 'timber', 76, 88),
  ];
  return overWorld(ui, win, [slab({ x: 0, y: 0, w: 176, h: 172, ramp: 'timber', title, titleRoom: 120, kids })], {
    outside: () => { h.dropHeld(); b.after(); },
  });
}

export const SCREENS: NamedScreen[] = [
  { name: 'chest', title: 'Chest', world: true, build: (ui) => build(ui, 'Chest') },
];
