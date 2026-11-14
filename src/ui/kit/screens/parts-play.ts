// The sheet of the parts the play screens added to the kit: the salt silhouette, cells of patterns in their states,
// the beds of the furnaces, cut lines dark and lit, the body as worn, rows of a shop, the Guide's step, the open chat
// entry, a state's row, and every sample picture the play screens draw.
import { DARK_SLOT } from '../art/slot';
import { SMALL } from '../font/face';
import { clock, rightX } from '../font/measure';
import type { Node, Ui } from '../node';
import { ring, sunk } from '../parts/common';
import { paintSlot } from '../parts/slot';
import { plate, slab } from '../parts/slab';
import { FRAMED_PLATE } from '../art/slab';
import { ICONS } from '../sample/play-icons';
import { THINGS } from '../sample/play-items';
import { page } from '../sheets/common';
import { ink, lit } from './play/common';
import { SALT } from './play/art';
import { BARE, figure, floor } from './play/figure';
import { tracker } from './play/hud';
import { BED_SLOT, bed } from './furnace';
import { cutLine } from './joining';
import type { NamedScreen } from './index';

const REST = { hover: false, down: false, focus: false, t: 0 };

/** A cell of a pattern on dark, in one of its states. */
function cell(x: number, y: number, icon: string, state: 'can' | 'cannot' | 'hover' | 'refused', n = 1): Node {
  return {
    x, y, w: 18, h: 18,
    paint: (s) => {
      s.nine(DARK_SLOT, 0, 0, 18, 18);
      if (state === 'hover') s.fill(1, 1, 16, 16, 'root.2');
      if (state === 'refused') ring(s, 1, 1, 16, 16, 'blood');
      s.icon(icon, 1, 1, state === 'cannot' ? 'flat' : 'full', 'root.4');
      if (n > 1) { const t = String(n); s.text(t, rightX(t, 16), 9, state === 'cannot' ? 'root.4' : 'salt', true); }
    },
  };
}

/** A shop row as the shop draws it: the price in salt, or in blood.lt with the row grey when it cannot be met. */
function shopRow(y: number, w: number, icon: string, name: string, colour: 'salt' | 'growth.lt' | 'violet.lt', price: string, can: boolean): Node {
  return {
    x: 1, y, w, h: 18,
    paint: (s) => {
      s.icon(icon, 1, 1, can ? 'full' : 'flat', 'root.4');
      const px = rightX(price, w - 3);
      s.text(price, px, 4, can ? 'salt' : 'blood.lt', true);
      s.text(name, 20, 4, can ? colour : 'root.4', true);
    },
  };
}

function build(ui: Ui): Node {
  const kids: Node[] = [];

  const salt: Node = { x: 8, y: 18, w: 18, h: 18, paint: (s) => { paintSlot(s, { ramp: 'clay' }, REST); s.draw(SALT, 1, 1, { flat: 'clay.sh' }); } };
  kids.push(slab({
    x: 0, y: 0, w: 156, h: 84, ramp: 'clay', title: 'Salt, and cells',
    kids: [
      salt, ink(30, 22, 'Salt, for the pot'),
      { x: 8, y: 40, w: 74, h: 20, paint: (s) => sunk(s, 0, 0, 74, 20, 'clay') },
      cell(9, 41, 'chest', 'can'), cell(27, 41, 'anvil', 'cannot'), cell(45, 41, 'torch', 'hover', 4), cell(63, 41, 'iron_staff', 'refused'),
      ink(88, 41, 'Can, cannot,', 'ink.faded'), ink(88, 51, 'hovered,', 'ink.faded'), ink(8, 63, 'refused', 'ink.faded'),
    ],
  }));

  kids.push(slab({
    x: 158, y: 0, w: 140, h: 84, ramp: 'stone', title: 'Beds of furnaces',
    kids: [
      bed(8, 18, ['stone.hi', 'stone.lt', 'stone.sh'], 0),
      { x: 8 + BED_SLOT, y: 18 + BED_SLOT, w: 18, h: 18, paint: (s) => paintSlot(s, { ramp: 'stone', mark: 'locked', missing: 'scorched_core' }, REST) },
      bed(64, 18, ['stone.sh', 'stone.dk', 'stone.pit'], 5),
      { x: 64 + BED_SLOT, y: 18 + BED_SLOT, w: 18, h: 18, paint: (s) => paintSlot(s, { ramp: 'stone', mark: 'locked', stack: { icon: 'scorched_core', n: 1 } }, REST) },
      ink(8, 56, 'Cold; then lit 5 of 8', 'ink.faded'),
    ],
  }));

  const join = (y: number, lit: boolean): Node[] => [
    { x: 8, y, w: 18, h: 18, paint: (s) => paintSlot(s, { ramp: 'timber', stack: { icon: 'boots', n: 1 } }, REST) },
    cutLine(26, y + 8, 12, lit),
    { x: 38, y, w: 18, h: 18, paint: (s) => paintSlot(s, { ramp: 'timber', mark: 'locked', noLock: true, stack: { icon: 'heartroot', n: 1 } }, REST) },
    cutLine(56, y + 8, 12, lit),
    { x: 68, y, w: 18, h: 18, paint: (s) => paintSlot(s, { ramp: 'timber', stack: lit ? { icon: 'spring_anklet', n: 1 } : null, silhouette: 'trinket' }, REST) },
  ];
  kids.push(slab({
    x: 300, y: 0, w: 174, h: 84, ramp: 'timber', title: 'Cut lines',
    kids: [...join(20, false), ink(92, 24, 'Dark: nothing'), ink(92, 34, 'to join'), ...join(50, true), ink(92, 54, 'Lit: the two'), ink(92, 64, 'pieces join')],
  }));

  const worn = { head: ['stone.lt', 'stone.face', 'stone.sh'], body: ['stone.lt', 'stone.face', 'stone.sh'], legs: ['timber.lt', 'timber.face', 'timber.sh'] } as const;
  kids.push(slab({
    x: 0, y: 86, w: 156, h: 84, ramp: 'clay', title: 'The body as worn',
    kids: [
      { x: 8, y: 18, w: 50, h: 54, paint: (s) => sunk(s, 0, 0, 50, 54, 'clay'), kids: [floor(1, 45, 48, 8, 25), figure(16, 12, 'small', { head: BARE, body: BARE, legs: BARE })] },
      { x: 62, y: 18, w: 50, h: 54, paint: (s) => sunk(s, 0, 0, 50, 54, 'clay'), kids: [floor(1, 45, 48, 8, 25), figure(16, 12, 'small', { head: [...worn.head], body: [...worn.body], legs: [...worn.legs] })] },
      ink(116, 22, 'Bare,', 'ink.faded'), ink(116, 32, 'then', 'ink.faded'), ink(116, 42, 'iron,', 'ink.faded'), ink(116, 52, 'hide', 'ink.faded'),
    ],
  }));

  kids.push(slab({
    x: 158, y: 86, w: 176, h: 84, ramp: 'clay', title: 'Rows of a shop',
    kids: [{
      x: 8, y: 18, w: 160, h: 58, paint: (s) => sunk(s, 0, 0, 160, 58, 'clay'),
      kids: [
        { x: 1, y: 1, w: 158, h: 18, paint: (s) => { s.text('Sold just now', 20, 4, 'root.4', true); } },
        shopRow(19, 158, 'blade', 'Stone Sword', 'salt', '3 {lees}', true),
        shopRow(37, 158, 'shadow_cloak', 'Dark Cloak', 'violet.lt', '30 {muda}', false),
      ],
    }],
  }));

  kids.push(tracker(474, 86, 'Smelt iron', '2 of 3'));
  kids.push({
    x: 336, y: 134, w: 138, h: 36,
    paint: (s) => {
      s.nine(FRAMED_PLATE, 0, 0, 18, 18, { tint: 'blood' });
      s.icon('spore_sac', 1, 1);
      s.text('Spore in a wound', 22, 4, 'salt', true);
      const t = clock(38);
      // Four units stand clear right of the time and its shadow, as round any line in a box.
      s.text(t, rightX(t, 132, SMALL), 6, 'salt', true, SMALL);
      s.text('A state, in the States tab', 0, 22, 'salt', true);
    },
  });

  const entry = 'heading down now, bring torches';
  kids.push({
    x: 0, y: 172, w: 240, h: 14,
    paint: (s) => {
      s.fill(0, 0, 240, 14, 'root.3');
      s.fill(1, 1, 238, 12, 'root.0');
      const w = s.text(entry, 4, 2, 'salt', true);
      s.fill(4 + w + 1, 2, 1, 10, 'salt');
    },
  });
  kids.push(lit(246, 174, 'The chat entry, open'));

  const keys = Object.keys(ICONS);
  const perRow = 26, rows = Math.ceil(keys.length / perRow);
  kids.push(plate({
    x: 0, y: 190, w: 474, h: rows * 18 + 16,
    kids: [
      { x: 5, y: 3, w: 200, h: 11, paint: (s) => { s.text('Sample pictures of the play screens', 0, 0, 'salt', true); } },
      ...keys.map((k, i): Node => ({
        x: 3 + (i % perRow) * 18, y: 14 + Math.floor(i / perRow) * 18, w: 18, h: 18,
        paint: (s) => paintSlot(s, { ramp: 'dark', stack: { icon: k, n: 1 } }, REST),
        tip: () => ({ lines: [{ text: [...THINGS.values()].find((t) => t.icon === k)?.name ?? k, c: 'salt' }], delay: 0 }),
      })),
    ],
  }));
  return page(ui, kids);
}

export const SCREENS: NamedScreen[] = [{ name: 'parts-play', title: 'Parts: the play screens', world: true, build }];
