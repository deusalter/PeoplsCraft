// The eighth sheet: what the books, the tree, the map and the menus added to the kit. The pictures of the codex in
// slots, the chart's marks, the heads of the eight seats, rows written on a page, entry slots sunk in a page, and a
// list of two-line rows in a well on the ground tile.
import { ALTAR_MARK, GATE_MARK, MOUTH_MARK, OWN_ARROW } from '../art/chart';
import { GROUND } from '../art/ground';
import { SLOT } from '../art/slot';
import type { Node } from '../node';
import { measure } from '../font/measure';
import { SEATS } from '../palette';
import { plate, slab } from '../parts/slab';
import { slot } from '../parts/slot';
import { well } from '../parts/well';
import { ICONS as PICTURES } from '../sample/codex-icons';
import { flag, pageRow } from '../parts/book';
import { type Sheet, ink, page, salt } from './common';

export const booksSheet: Sheet = {
  title: 'Parts: books, chart and menus',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    // The codex's pictures, sixteen to a row, in clay slots.
    const keys = Object.keys(PICTURES);
    const perRow = 16;
    kids.push(slab({
      x: 0, y: 0, w: 304, h: 18 + Math.ceil(keys.length / perRow) * 18 + 6, ramp: 'clay', title: 'Pictures of the codex and the map',
      kids: keys.map((k, i) => slot({ id: `pic.${k}`, x: 8 + (i % perRow) * 18, y: 18 + Math.floor(i / perRow) * 18, ramp: 'clay', stack: { icon: k, n: 1 } })),
    }));
    // The chart's marks: one's own arrow turned four ways in the seats' colours, an altar, a gate, the mouth.
    kids.push(slab({
      x: 307, y: 0, w: 167, h: 56, ramp: 'stone', title: 'Marks on the chart',
      kids: [
        ...OWN_ARROW.map((m, i): Node => ({ x: 8 + i * 12, y: 20, w: 7, h: 7, paint: (s) => s.draw(m, 0, 0, { tint: SEATS[i] }) })),
        { x: 60, y: 20, w: 7, h: 7, paint: (s) => s.map(ALTAR_MARK, 0, 0) },
        { x: 72, y: 20, w: 7, h: 7, paint: (s) => s.map(GATE_MARK, 0, 0) },
        { x: 84, y: 20, w: 7, h: 7, paint: (s) => s.map(MOUTH_MARK, 0, 0) },
        ink(8, 34, 'Arrow, altar, gate, mouth', 'ink.faded'),
      ],
    }));
    // The heads of the eight seats, for the tree's side tabs, in dark slots.
    kids.push(plate({
      x: 307, y: 59, w: 167, h: 40,
      kids: [salt(5, 3, 'Heads of the eight seats'), ...SEATS.map((_, i) => slot({ id: `head.${i}`, x: 5 + i * 18, y: 17, ramp: 'dark', stack: { icon: `head:${i + 1}`, n: 1 } }))],
    }));
    // Rows written on a page: chosen, hovered, focused and plain, with a player's flag; entry slots sunk in a page.
    const rows: Node[] = [
      pageRow({ id: 'pr.0', x: 8, y: 18, w: 126, h: 10, chosen: true, under: { x: 10, y: 9, w: measure('Smelt iron') }, onChoose: () => {}, paint: (s) => { s.text('{step}', 3, 0, 'ink'); s.text('Smelt iron', 10, 0, 'ink'); } }),
      { ...pageRow({ id: 'pr.1', x: 8, y: 28, w: 126, h: 10, chosen: false, onChoose: () => {}, paint: (s) => { s.text('{check}', 1, 0, 'ink.faded'); s.text('Build a furnace', 10, 0, 'ink.faded'); } }) },
      pageRow({ id: 'pr.2', x: 8, y: 38, w: 126, h: 10, chosen: false, onChoose: () => {}, paint: (s) => s.text('Bait Vanahar', 10, 0, 'ink.faded') }),
      { x: 8, y: 52, w: 126, h: 10, paint: (s) => { flag(s, 3, 0, 1); s.text('tamsin', 5, 0, 'ink'); flag(s, 1, 44, 1); s.text('Rook', 49, 0, 'ink'); } },
    ];
    const hovered = rows[1];
    hovered.paint = ((p) => (s, live) => p!(s, { ...live, hover: true }))(hovered.paint);
    const entries: Node[] = ['codex:gloomshade', 'codex:rift_ray', 'codex:frost_stalker'].map((k, i): Node => ({
      x: 8 + i * 18, y: 66, w: 18, h: 18,
      paint: (s) => {
        s.nine(SLOT, 0, 0, 18, 18, 'clay');
        s.fill(1, 1, 16, 16, 'clay.sh');
        if (i === 1) s.silhouette(k, 1, 1, 'clay.face', 'clay.face'); else s.icon(k, 1, 1);
        if (i === 2) { s.fill(1, 1, 16, 1, 'salt'); s.fill(1, 16, 16, 1, 'salt'); s.fill(1, 2, 1, 14, 'salt'); s.fill(16, 2, 1, 14, 'salt'); }
      },
    }));
    kids.push(slab({
      x: 0, y: 101, w: 142, h: 104, ramp: 'clay', title: 'Written on a page',
      kids: [{ x: 0, y: 0, w: 142, h: 104, paint: (s) => s.fill(4, 16, 134, 84, 'clay.lt'), kids: [...rows, ...entries, ink(66, 70, 'Seen, not met,', 'ink.faded'), ink(66, 80, 'chosen', 'ink.faded')] }],
    }));
    // A list of two-line rows in a well on the ground tile, as the worlds have it.
    kids.push({ x: 145, y: 101, w: 329, h: 104, paint: (s) => s.tile(GROUND, 0, 0, 329, 104) });
    kids.push(salt(153, 105, 'Two-line rows in a well on the ground tile'));
    kids.push(well({
      id: 'sheet.worlds', x: 153, y: 118, w: 200, h: 76, host: 'ground', ui, rowH: 36, chosen: 0,
      rows: [
        { id: 'sw.0', name: 'Hearth on the Yavas', body: (s) => { s.text('Hearth on the Yavas', 6, 7, 'salt', true); s.text('seed 4471, level 14', 6, 19, 'root.4', true); } },
        { id: 'sw.1', name: 'Kusum', body: (s) => { s.text('Kusum', 6, 7, 'salt', true); s.text('seed 118, level 3', 6, 19, 'root.4', true); } },
        { id: 'sw.2', name: 'Davalavan', body: (s) => { s.text('Davalavan', 6, 7, 'salt', true); s.text('seed 66190, level 1', 6, 19, 'root.4', true); } },
      ],
    }));
    kids.push(salt(361, 120, 'Chosen; more'));
    kids.push(salt(361, 132, 'than fit, so'));
    kids.push(salt(361, 144, 'it scrolls'));
    return page(ui, kids);
  },
};
