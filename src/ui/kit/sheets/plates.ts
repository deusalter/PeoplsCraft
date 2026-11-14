// The fifth sheet: the plates of play together: compass, readout, tags, pings, chat, roster, crew, pointer.
import { HEADS } from '../art/heads';
import { COMPASS_MARKS } from '../art/marks';
import { POINTER } from '../art/pointer';
import type { Node } from '../node';
import { chat, compass, crew, type Member, nameTag, paintEntry, ping, readout, roster } from '../parts/plates';
import { heldStack } from '../root';
import { SERVER, seat, strides } from '../sample/crew';
import { type Sheet, page, salt } from './common';

// Three of the one sample crew: oneself, a friend near, and the longest handle there can be.
const MEMBERS: Member[] = [1, 3, 8].map((n) => {
  const m = seat(n);
  return { seat: m.seat, name: m.name, life: m.life, place: m.place, level: m.level, metres: strides(m), bars: m.bars, self: n === 1 };
});

export const platesSheet: Sheet = {
  title: 'Parts: plates of play',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    kids.push(compass({
      x: 0, y: 0, heading: 20, place: 'Yavas', night: { n: 3, of: 8 },
      marks: [{ kind: 'bed', deg: -30 }, { kind: 'guide', deg: 52 }, { kind: 'friend', seat: 3, deg: -62 }, { kind: 'fell', deg: 170 }],
    }));
    kids.push(readout({ cx: 91, y: 26, icon: 'ore', name: 'Iron Ore', line: 'Needs a stone pick', refusal: true }));
    kids.push(readout({ cx: 91, y: 52, icon: 'log', name: 'Oak Log', line: 'Any axe will do', able: true }));
    kids.push(readout({ cx: 91, y: 78, icon: 'haunch', name: 'Tama', life: 0.6 }));
    // Name tags, pings and the marks of the compass.
    kids.push(salt(196, 0, 'Tags, pings, marks'));
    kids.push(nameTag({ cx: 226, y: 14, name: seat(3).name, seat: 3, life: seat(3).life }));
    kids.push(nameTag({ cx: 300, y: 14, name: 'Kammār' }));
    kids.push(ping({ cx: 360, y: 14, seat: 5, metres: 40 }));
    kids.push(ping({ cx: 380, y: 14, seat: 2 }));
    kids.push({
      x: 196, y: 34, w: 120, h: 8,
      paint: (s) => {
        s.map(COMPASS_MARKS.bed, 0, 1); s.map(COMPASS_MARKS.fell, 10, 1); s.map(COMPASS_MARKS.guide, 20, 1);
        HEADS.forEach((h, i) => s.map(h, 32 + i * 12, -1));
      },
    });
    // The crew at the top left.
    kids.push(salt(196, 48, 'The crew'));
    kids.push(crew({ x: 196, y: 62, members: MEMBERS }));
    // The pointer and a held stack.
    kids.push(salt(310, 48, 'Pointer, held'));
    kids.push({ x: 310, y: 62, w: 80, h: 40, paint: (s) => { s.map(POINTER, 2, 2); heldStack('ingot', 12).paint(s, 34, 12); heldStack('blade', 1).paint(s, 62, 12); } });
    // Chat, closed and open.
    kids.push(chat({
      x: 0, bottom: 246,
      lines: [
        { text: `${seat(3).name} joined ${SERVER}` },
        { seat: 3, from: seat(3).name, text: 'the furnace is lit' },
        { seat: 1, from: seat(1).name, text: 'bring coal, we are short of it for the long run of iron bars before the night raid' },
      ],
      open: true,
    }));
    kids.push({ x: 0, y: 252, w: 240, h: 14, paint: (s) => paintEntry(s, 240, 'on my way') });
    kids.push(roster({ cx: 156, y: 110, server: SERVER, members: MEMBERS }));
    kids.push(salt(318, 112, 'The roster,'));
    kids.push(salt(318, 124, 'held open with Tab'));
    kids.push(salt(250, 230, 'Chat, open, with its entry'));
    return page(ui, kids);
  },
};
