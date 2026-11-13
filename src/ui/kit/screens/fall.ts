// The screen at a fall (section 6): the world under a flat wash of blood.dk that comes up in three steps, a dark plate
// framed in blood saying what did it and what was shed, and two buttons that wake after 0.8 s so that a blow in
// flight cannot press one. With friends near, their name tags and chat stay drawn over the wash.
import { centreX, count } from '../font/measure';
import type { Node, Ui } from '../node';
import { button } from '../parts/button';
import { chat, nameTag } from '../parts/plates';
import { plate } from '../parts/slab';
import { since } from './play/common';
import type { NamedScreen } from './index';

interface Fall { by: string; shed: number; where: string; server: boolean }

const FALLS: Record<string, Fall> = {
  fall: { by: 'to a Tama', shed: 14, where: 'Vana', server: true },
  'fall-alone': { by: 'from a height', shed: 0, where: 'Pabbat', server: false },
};

let fellAt = 0;
let focused = false;

function build(ui: Ui, id: string): Node {
  const f = FALLS[id];
  const t = since(ui.t, fellAt, 5);
  const awake = t >= 0.8;
  const quarters = t < 0.1 ? 1 : 2;
  const col = Math.floor((ui.w - 200) / 2), top = Math.floor((ui.h - 240) / 2);
  const px = col - 4, py = top + 66;
  const line = (y: number, text: string, c: 'salt' | 'root.4'): Node => ({
    x: 4, y, w: 200, h: 11, paint: (s) => { s.text(text, centreX(text, 0, 200), 0, c, true); },
  });
  const kids: Node[] = [line(6, 'You fell', 'salt'), line(18, f.by, 'root.4')];
  if (f.shed) kids.push(line(30, `{lees} ${count(f.shed)} shed in ${f.where}`, 'salt'));
  kids.push(
    button({ id: 'fall.rise', x: 4, y: 50, w: 200, label: 'Rise again', disabled: !awake, onPress: () => { fellAt = ui.t; ui.invalidate(); } }),
    button({ id: 'fall.leave', x: 4, y: 74, w: 200, label: f.server ? 'Leave' : 'Save and leave', disabled: !awake, onPress: () => ui.cue('press') }),
  );
  const over: Node[] = [];
  if (f.server) {
    const sw = ui.layout.stage;
    over.push(
      nameTag({ cx: sw.x + Math.floor(sw.w * 0.14), y: 112, name: 'kiln_rat', seat: 2, life: 0.8 }),
      nameTag({ cx: sw.x + Math.floor(sw.w * 0.84), y: 96, name: 'Ishaan', seat: 3, life: 0.35 }),
      chat({
        x: sw.x + 4, bottom: sw.y + 226, lines: [
          { text: 'tovah fell to a Tama' },
          { seat: 2, from: 'kiln_rat', text: 'coming down' },
          { seat: 3, from: 'Ishaan', text: 'lees by the torch' },
        ],
      }),
    );
  }
  if (!focused) { focused = true; setTimeout(() => ui.focusOn('fall.rise'), 0); }
  if (!awake) setTimeout(() => ui.invalidate(), Math.max(10, (0.8 - t) * 1000 + 10));
  if (t < 0.3) setTimeout(() => ui.invalidate(), 110);
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'blood.dk', quarters),
    on: { key: (e) => { if (e.key === 'Enter' && awake) { fellAt = ui.t; ui.invalidate(); return true; } return e.key === 'Escape'; } },
    takes: true,
    kids: [...over, plate({ x: px, y: py, w: 208, h: 104, frame: 'blood', kids })],
  };
}

export const SCREENS: NamedScreen[] = Object.keys(FALLS).map((name) => ({
  name, title: name === 'fall' ? 'The fall, on a server' : 'The fall, alone', world: true, build: (ui: Ui) => build(ui, name),
}));
