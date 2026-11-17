// The seventh sheet: the sample items in slots of each material and on dark, the tab marks, the marks of a state.
import { STATE_MARKS, TAB_MARKS } from '../art/icons';
import { ITEMS } from '../mock/icons';
import type { Node } from '../node';
import type { Ramp } from '../palette';
import { plate, slab } from '../parts/slab';
import { slot } from '../parts/slot';
import { PAGE_W, type Sheet, ink, page, salt } from './common';

const NAMES: Record<string, string> = {
  pick: 'Pick', axe: 'Axe', spade: 'Spade', blade: 'Blade', bow: 'Bow', arrow: 'Arrow',
  helm: 'Helm', plate: 'Plate', greaves: 'Greaves', boots: 'Boots', ore: 'Ore', ingot: 'Bar',
  crystal: 'Crystal', coal: 'Coal', loaf: 'Loaf', haunch: 'Haunch', apple: 'Apple', tonic: 'Tonic',
  pendant: 'Pendant', bait: 'Bait', key: 'Key', turf: 'Turf', brick: 'Brick', log: 'Log',
};

const TAB_NAMES: Record<string, string> = {
  coin: 'Buy', pack: 'Pack', body: 'Body', patterns: 'Patterns', guide: 'The Guide', bounty: 'Bounties',
  standing: 'Standing', codex: 'Codex', map: 'Map', skills: 'Skills', picture: 'Picture', play: 'Play', sound: 'Sound',
  interface: 'Interface', creatures: 'Creatures', matter: 'Matter', peoples: 'Peoples', old: 'Old things', crew: 'Crew',
};

const STRIP_W = 8 + 9 * 18 + 8, STRIP_X = PAGE_W - STRIP_W, LEFT_W = STRIP_X - 3, PITCH = 70;

export const iconsSheet: Sheet = {
  title: 'Parts: icons',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    const names = Object.keys(ITEMS);
    // Every item with its name, four columns on clay.
    const ik: Node[] = names.map((n, i): Node => {
      const cx = 8 + (i % 4) * PITCH, cy = 18 + Math.floor(i / 4) * 20;
      return { x: cx, y: cy, w: PITCH - 2, h: 18, kids: [slot({ id: `it.${n}`, x: 0, y: 0, ramp: 'clay', stack: { icon: n, n: 1 } }), ink(21, 5, NAMES[n] ?? n)] };
    });
    kids.push(slab({ x: 0, y: 0, w: LEFT_W, h: 18 + 6 * 20 + 6, ramp: 'clay', title: 'Sample items', kids: ik }));
    // The same in a row of slots of each material and on dark, each strip 8 + 9 * 18 + 8 wide so that the row stands 8
    // in from both ends and its last slot never meets the strip's bevel.
    const row = (ramp: Ramp | 'dark', y: number) => names.slice(0, 9).map((n, i) => slot({ id: `r.${ramp}.${i}`, x: 8 + i * 18, y, ramp, stack: { icon: names[(i + (y % 7)) % names.length], n: 1 } }));
    kids.push(slab({ x: STRIP_X, y: 0, w: STRIP_W, h: 44, ramp: 'timber', title: 'On timber', kids: row('timber', 18) }));
    kids.push(slab({ x: STRIP_X, y: 46, w: STRIP_W, h: 44, ramp: 'stone', title: 'On stone', kids: row('stone', 18) }));
    kids.push(plate({ x: STRIP_X, y: 92, w: STRIP_W, h: 39, kids: [salt(8, 3, 'On dark'), ...row('dark', 15)] }));
    // Tab marks, for tabs that open a page.
    const tabs = Object.keys(TAB_MARKS);
    kids.push(slab({
      x: 0, y: 147, w: LEFT_W, h: 18 + Math.ceil(tabs.length / 4) * 20 + 4, ramp: 'stone', title: 'Marks of tabs that open a page',
      kids: tabs.map((t, i): Node => ({
        x: 8 + (i % 4) * PITCH, y: 18 + Math.floor(i / 4) * 20, w: PITCH - 2, h: 18,
        kids: [slot({ id: `tm.${t}`, x: 0, y: 0, ramp: 'stone', stack: { icon: t, n: 1 } }), ink(21, 5, TAB_NAMES[t] ?? t)],
      })),
    }));
    // Marks of a state, where the slot's own marks stand (5.4): the lock over the bottom right corner, since a locked
    // place has no count; the rest over the top right, which leaves the bottom right to the count.
    const marks = Object.keys(STATE_MARKS);
    kids.push(plate({
      x: STRIP_X, y: 134, w: STRIP_W, h: 52,
      kids: [salt(8, 3, 'Marks of a state'), ...marks.map((m, i): Node => ({
        x: 8 + i * 20, y: 16, w: 18, h: 18,
        kids: [slot({ id: `mk.${m}`, x: 0, y: 0, ramp: 'dark', stack: { icon: ['helm', 'tonic', 'crystal', 'ingot', 'coal'][i], n: 1 } }), { x: 10, y: m === 'lock' ? 10 : 1, w: 7, h: 7, paint: (s) => s.map(STATE_MARKS[m], 0, 0) }],
      })),
        salt(8, 37, 'Lock, alert, new, more, less', 'root.4')],
    }));
    kids.push(salt(STRIP_X, 190, 'Every icon is 16 units'));
    kids.push(salt(STRIP_X, 202, 'square, outlined in'));
    kids.push(salt(STRIP_X, 214, 'root-black and lit'));
    kids.push(salt(STRIP_X, 226, 'from the top left.'));
    return page(ui, kids);
  },
};
