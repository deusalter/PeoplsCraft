// The sixth sheet: the book opened to two pages, the tree field with its nodes and links, the ground tile, the title mark.
import { GROUND } from '../art/ground';
import { box } from '../font/wrap';
import type { Node } from '../node';
import { book, pageHeading } from '../parts/book';
import { titleMark } from '../parts/keycap';
import { slot } from '../parts/slot';
import { tree } from '../parts/tree';
import { whereLine } from '../screens/books-common';
import { type Sheet, ink, page, salt } from './common';

const TEXT_L = 'The kilns on the Yavas stand in a row along the low field. Each is fed from the left and drawn from the right, and the jars come out the colour of the ground they were dug from.';

function para(x: number, y: number, text: string, lines: number): Node {
  const b = box(text, 126, lines);
  return { x, y, w: 126, h: b.h, paint: (s) => { for (const l of b.lines) s.text(l.text, 0, l.y, 'ink'); } };
}

export const bookSheet: Sheet = {
  title: 'Parts: book and tree',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    kids.push(book({
      id: 'book', x: 0, y: 21, chosen: 1, pages: [12, 13],
      sections: [
        { id: 'rb.guide', name: 'The Guide', icon: 'guide' },
        { id: 'rb.bounty', name: 'Bounties', icon: 'bounty' },
        { id: 'rb.stand', name: 'Standing', icon: 'standing' },
        { id: 'rb.codex', name: 'Codex', icon: 'codex' },
      ],
      prev: () => {}, next: () => {},
      force: { next: { hover: true } },
      left: [pageHeading({ x: 0, y: 0, w: 126, text: 'The kiln row' }), para(0, 16, TEXT_L, 8), whereLine(0, 108, 126, 'The kiln row: 40 m west')],
      right: [
        pageHeading({ x: 0, y: 0, w: 126, text: 'Bounties' }),
        slot({ id: 'b.0', x: 0, y: 16, ramp: 'clay', stack: { icon: 'ore', n: 20 } }),
        ink(22, 21, 'Twenty of ore'),
        slot({ id: 'b.1', x: 0, y: 36, ramp: 'clay', stack: { icon: 'haunch', n: 4 } }),
        ink(22, 41, 'Four haunches', 'ink'),
        slot({ id: 'b.2', x: 0, y: 56, ramp: 'clay', missing: 'crystal' }),
        ink(22, 61, 'Not yet seen', 'ink.faded'),
        ink(0, 82, 'Can be paid', 'growth.dk'),
        ink(0, 92, 'Too far to reach', 'blood.dk'),
      ],
    }));
    kids.push(tree({
      id: 'tree', x: 296, y: 0, w: 178, h: 192, host: 'dark', ui, chosen: 'n.b',
      nodes: [
        { id: 'n.a', col: 0, row: 0, shape: 'square', state: 'earned', icon: 'pick' },
        { id: 'n.b', col: 1, row: 0, shape: 'cut', state: 'earned', icon: 'axe', ranks: [3, 3] },
        { id: 'n.c', col: 3, row: 0, shape: 'square', state: 'open', icon: 'spade' },
        { id: 'n.d', col: 1, row: 1, shape: 'spiked', state: 'open', icon: 'blade', ranks: [1, 3] },
        { id: 'n.e', col: 0, row: 2, shape: 'cut', state: 'locked', icon: 'bow' },
        { id: 'n.f', col: 2, row: 2, shape: 'square', state: 'locked', icon: 'helm' },
        { id: 'n.g', col: 3, row: 3, shape: 'spiked', state: 'locked', icon: 'crystal' },
        { id: 'n.h', col: 1, row: 3, shape: 'square', state: 'earned', icon: 'loaf' },
      ],
      links: [['n.a', 'n.b'], ['n.b', 'n.c'], ['n.b', 'n.d'], ['n.d', 'n.e'], ['n.d', 'n.f'], ['n.f', 'n.g'], ['n.a', 'n.h']],
    }));
    kids.push(salt(296, 196, 'Square, cut and spiked:'));
    kids.push(salt(296, 208, 'locked, open, earned'));
    kids.push(titleMark({ cx: 113, y: 206 }));
    kids.push(salt(4, 252, 'The title mark'));
    kids.push({ x: 232, y: 228, w: 64, h: 32, paint: (s) => s.tile(GROUND, 0, 0, 64, 32) });
    kids.push(salt(300, 236, 'Ground tile'));
    return page(ui, kids);
  },
};
