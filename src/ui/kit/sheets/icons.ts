// The seventh sheet: the sample items in slots of each material and on dark, the tab marks, the marks of a state.
import { STATE_MARKS, TAB_MARKS } from '../art/icons';
import { ITEMS } from '../mock/icons';
import type { Node } from '../node';
import type { Ramp } from '../palette';
import { plate, slab } from '../parts/slab';
import { slot } from '../parts/slot';
import { type Sheet, ink, page, salt } from './common';

const NAMES: Record<string, string> = {
  pick: 'Pick', axe: 'Axe', spade: 'Spade', blade: 'Blade', bow: 'Bow', arrow: 'Arrow',
  helm: 'Helm', plate: 'Plate', greaves: 'Greaves', boots: 'Boots', ore: 'Ore', ingot: 'Bar',
  crystal: 'Crystal', coal: 'Coal', loaf: 'Loaf', haunch: 'Haunch', apple: 'Apple', tonic: 'Tonic',
  pendant: 'Pendant', bait: 'Bait', key: 'Key', turf: 'Turf', brick: 'Brick', log: 'Log',
};

export const iconsSheet: Sheet = {
  title: 'Parts: icons',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    const names = Object.keys(ITEMS);
    // Every item with its name, four columns on clay.
    const ik: Node[] = names.map((n, i): Node => {
      const cx = 8 + (i % 4) * 72, cy = 18 + Math.floor(i / 4) * 20;
      return { x: cx, y: cy, w: 70, h: 18, kids: [slot({ id: `it.${n}`, x: 0, y: 0, ramp: 'clay', stack: { icon: n, n: 1 } }), ink(22, 5, NAMES[n] ?? n)] };
    });
    kids.push(slab({ x: 0, y: 0, w: 302, h: 18 + 6 * 20 + 6, ramp: 'clay', title: 'Sample items', kids: ik }));
    // The same in a row of slots of each material and on dark.
    const row = (ramp: Ramp | 'dark', y: number) => names.slice(0, 9).map((n, i) => slot({ id: `r.${ramp}.${i}`, x: 8 + i * 18, y, ramp, stack: { icon: names[(i + (y % 7)) % names.length], n: 1 } }));
    kids.push(slab({ x: 305, y: 0, w: 169, h: 42, ramp: 'timber', title: 'On timber', kids: [{ x: -1, y: 0, w: 1, h: 1, kids: row('timber', 18) }] }));
    kids.push(slab({ x: 305, y: 45, w: 169, h: 42, ramp: 'stone', title: 'On stone', kids: [{ x: -1, y: 0, w: 1, h: 1, kids: row('stone', 18) }] }));
    kids.push(plate({ x: 305, y: 90, w: 169, h: 37, kids: [salt(5, 3, 'On dark'), { x: -4, y: 0, w: 1, h: 1, kids: row('dark', 15) }] }));
    // Tab marks, for tabs and ribbons that open a page.
    const tabs = Object.keys(TAB_MARKS);
    kids.push(slab({
      x: 0, y: 147, w: 302, h: 64, ramp: 'stone', title: 'Marks of tabs that open a page',
      kids: tabs.map((t, i): Node => ({ x: 8 + i * 32, y: 20, w: 16, h: 36, kids: [{ x: 0, y: 0, w: 16, h: 16, paint: (s) => s.icon(t, 0, 0) }, ink(0, 20, t[0].toUpperCase() + t.slice(1, 4), 'ink.faded')] })),
    }));
    // Marks of a state.
    const marks = Object.keys(STATE_MARKS);
    kids.push(plate({
      x: 305, y: 130, w: 169, h: 50,
      kids: [salt(5, 3, 'Marks of a state'), ...marks.map((m, i): Node => ({ x: 6 + i * 16, y: 20, w: 7, h: 7, paint: (s) => s.map(STATE_MARKS[m], 0, 0) })),
        salt(5, 32, 'Lock, alert, new, up, down', 'root.4')],
    }));
    kids.push(salt(0, 216, 'Every icon is 16 units square, outlined in root.0'));
    kids.push(salt(0, 228, 'and lit from the top left.'));
    return page(ui, kids);
  },
};
