// The first sheet: slabs by material, a side panel, the title row, slots in every state, silhouettes, dark slots.
import type { SilhouetteName } from '../art/silhouettes';
import { measure } from '../font/measure';
import type { Node } from '../node';
import type { Ramp } from '../palette';
import { button } from '../parts/button';
import { panelBeside, plate, slab } from '../parts/slab';
import { type SlotOpts, slot } from '../parts/slot';
import { type Sheet, ink, page, salt } from './common';

const STATES: { name: string; o: Omit<SlotOpts, 'x' | 'y' | 'ramp'> }[] = [
  { name: 'A stack', o: { stack: { icon: 'pick', n: 1 } } },
  { name: 'Hovered', o: { stack: { icon: 'ingot', n: 12 }, force: { hover: true } } },
  { name: 'Accepts', o: { silhouette: 'head', mark: 'accepts' } },
  { name: 'Refused', o: { stack: { icon: 'coal', n: 64 }, mark: 'refused' } },
  { name: 'Chosen', o: { stack: { icon: 'blade', n: 1 }, mark: 'chosen' } },
  { name: 'Locked', o: { stack: { icon: 'crystal', n: 1 }, mark: 'locked' } },
];

const ICON_ROW: Record<Ramp, string[]> = {
  clay: ['loaf', 'ingot', 'head', 'coal', 'blade', 'crystal'],
  timber: ['log', 'arrow', 'body', 'turf', 'axe', 'key'],
  stone: ['ore', 'coal', 'fuel', 'ingot', 'spade', 'pendant'],
};

function stateSlab(ramp: Ramp, x: number): Node {
  const kids: Node[] = [];
  STATES.forEach((st, i) => {
    const cx = 8 + Math.floor(i / 3) * 74, cy = 18 + (i % 3) * 20;
    const icon = ICON_ROW[ramp][i];
    const o = { ...st.o };
    if (o.stack) o.stack = { ...o.stack, icon };
    if (o.silhouette) o.silhouette = icon as SilhouetteName;
    kids.push(slot({ ...o, id: `${ramp}.st.${i}`, x: cx, y: cy, ramp }));
    kids.push(ink(cx + 22, cy + 5, st.name));
  });
  const title = ramp === 'clay' ? 'Clay slab' : ramp === 'timber' ? 'Timber slab' : 'Stone slab';
  return slab({ x, y: 0, w: 156, h: 84, ramp, title, kids });
}

const SILS: [SilhouetteName, string][] = [
  ['head', 'Head'], ['body', 'Body'], ['legs', 'Legs'],
  ['trinket', 'Trinket'], ['work', 'To work'], ['fuel', 'Fuel'],
  ['bar', 'Bar'], ['key', 'Key'], ['rework', 'To rework'],
];

export const slotsSheet: Sheet = {
  title: 'Parts: slabs and slots',
  world: true,
  build(ui) {
    const kids: Node[] = [stateSlab('clay', 0), stateSlab('timber', 159), stateSlab('stone', 318)];
    // Silhouettes of empty slots, three to a row with their names.
    const sk: Node[] = [];
    SILS.forEach(([sil, name], i) => {
      const cx = 8 + (i % 3) * 66, cy = 18 + Math.floor(i / 3) * 20;
      sk.push(slot({ id: `sil.${i}`, x: cx, y: cy, ramp: 'clay', silhouette: sil }));
      sk.push(ink(cx + 22, cy + 5, name));
    });
    kids.push(slab({ x: 0, y: 87, w: 208, h: 84, ramp: 'clay', title: 'Empty slots by kind', kids: sk }));
    // The large slot of a result, a thing not yet seen, a slot with keyboard focus.
    kids.push(slab({
      x: 211, y: 87, w: 128, h: 84, ramp: 'timber', title: 'Result and others',
      kids: [
        slot({ id: 'large', x: 8, y: 18, ramp: 'timber', large: true, stack: { icon: 'axe', n: 2 } }),
        ink(38, 26, 'Result'),
        slot({ id: 'missing', x: 8, y: 46, ramp: 'timber', missing: 'bow' }),
        ink(30, 51, 'Not yet seen'),
        slot({ id: 'focus', x: 8, y: 64, ramp: 'timber', stack: { icon: 'apple', n: 5 }, force: { focus: true } }),
        ink(30, 69, 'Focus by key'),
      ],
    }));
    // Slots on a dark plate: plain, hovered, holding a stack.
    kids.push(plate({
      x: 342, y: 87, w: 132, h: 84,
      kids: [
        salt(5, 4, 'On a dark plate'),
        slot({ id: 'dk.0', x: 5, y: 18, ramp: 'dark', stack: { icon: 'tonic', n: 3 } }),
        salt(27, 23, 'A stack'),
        slot({ id: 'dk.1', x: 5, y: 38, ramp: 'dark', stack: { icon: 'haunch', n: 1 }, force: { hover: true } }),
        salt(27, 43, 'Hovered'),
        slot({ id: 'dk.2', x: 5, y: 58, ramp: 'dark', silhouette: 'key' }),
        salt(27, 63, 'Empty, by kind'),
      ],
    }));
    // A main slab with a side panel fastened to it, sharing one outline column.
    const main = { x: 0, y: 174, w: 150, h: 88 };
    kids.push(slab({ ...main, ramp: 'clay', title: 'Main slab', kids: [ink(8, 20, 'The panel overlaps', 'ink.faded'), ink(8, 30, 'it by one unit.', 'ink.faded')] }));
    kids.push(panelBeside(main, 96, 'right', { ramp: 'clay', title: 'Side panel' }));
    // The title row: the title at 8, 6; small buttons 12 tall at y 3, the last ending at x 168 of 176.
    const sortW = measure('Sort') + 10;
    kids.push(slab({
      x: 248, y: 174, w: 176, h: 50, ramp: 'stone', title: 'Title in sentence case', titleRoom: sortW + 16,
      kids: [
        button({ id: 'title.sort', x: 168 - 12 - 2 - sortW, y: 3, w: sortW, h: 12, label: 'Sort' }),
        button({ id: 'title.plus', x: 156, y: 3, w: 12, h: 12, label: '+' }),
        ink(8, 20, 'A long title is cut before', 'ink.faded'),
        ink(8, 30, 'the buttons of its row.', 'ink.faded'),
      ],
    }));
    kids.push(slab({ x: 248, y: 227, w: 176, h: 35, ramp: 'timber', title: 'A title far too long for its slab and its row' }));
    kids.push(salt(428, 178, 'Slabs'));
    kids.push(salt(428, 190, 'stand'));
    kids.push(salt(428, 202, 'on a'));
    kids.push(salt(428, 214, 'dimmed'));
    kids.push(salt(428, 226, 'world.'));
    return page(ui, kids);
  },
};
