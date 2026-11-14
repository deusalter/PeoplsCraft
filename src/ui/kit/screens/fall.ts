// The screen at a fall (section 6): the world under a flat wash of blood.pit that comes up in three steps; on it, with
// no window, "You fell" in raised letters at the top third, what did it and what was shed under it, and two buttons
// that wake after 0.8 s so that a blow in flight cannot press one. With friends near, their name tags and chat stay
// drawn over the wash.
import { raised } from '../art/raised';
import { centreX, count } from '../font/measure';
import type { Node, Ui } from '../node';
import type { Colour } from '../palette';
import { button } from '../parts/button';
import { chat, nameTag } from '../parts/plates';
import { since } from './play/common';
import { seat } from '../sample/crew';
import type { NamedScreen } from './index';

/** `lie` is where the shed lees lie and `at` where the body fell, as the compass's place line writes them. */
interface Fall { by: string; shed: number; lie?: string; at: string; server: boolean }

const FALLS: Record<string, Fall> = {
  fall: { by: 'to a Tama', shed: 14, lie: 'x -104  z 2210', at: 'x -104  z 2210', server: true },
  'fall-alone': { by: 'from a height', shed: 0, at: 'x 312  z -88', server: false },
};

let fellAt = 0;
let focused = false;

function build(ui: Ui, id: string): Node {
  const f = FALLS[id];
  const t = since(ui.t, fellAt, 5);
  const awake = t >= 0.8;
  const quarters = t < 0.1 ? 1 : t < 0.2 ? 2 : 3;
  const col = Math.floor((ui.w - 200) / 2), top = Math.floor((ui.h - 240) / 2);
  const title = raised('You fell');
  const line = (y: number, text: string, c: Colour = 'salt'): Node => ({
    x: col, y: top + y, w: 201, h: 11, paint: (s) => { s.text(text, centreX(text, 0, 200), 0, c, true); },
  });
  const kids: Node[] = [
    { x: col + Math.floor((200 - title.w) / 2), y: top + 56, w: title.w + 2, h: title.h + 2, paint: (s) => { s.draw(title, 1, 1, { flat: 'root.0' }); s.map(title, 0, 0); } },
    line(86, f.by),
  ];
  let y = 86;
  // The line names what was dropped in words; the mark alone, and a country's name for where, said neither what was
  // shed nor where to find it.
  if (f.shed) kids.push(line((y += 12), `{lees} ${count(f.shed)} lees dropped`));
  if (f.shed && f.lie) kids.push(line((y += 12), `Your lees lie at ${f.lie}`, 'arm.lt'));
  // With nothing shed there is no place to go back to, but where it happened is still worth knowing. It is salt with
  // its shadow as all text on the world: root.4 on the washed world was the faintest line on the screen.
  else kids.push(line((y += 12), `At ${f.at}`));
  // The buttons stand 6 under the last line, so the column holds together however many lines there are.
  const by = y + 10 + 6;
  kids.push(
    button({ id: 'fall.rise', x: col, y: top + by, w: 200, label: 'Rise again', disabled: !awake, onPress: () => { fellAt = ui.t; ui.invalidate(); } }),
    button({ id: 'fall.leave', x: col, y: top + by + 24, w: 200, label: f.server ? 'Leave' : 'Save and leave', disabled: !awake, onPress: () => ui.cue('press') }),
  );
  const over: Node[] = [];
  if (f.server) {
    const sw = ui.layout.stage;
    over.push(
      nameTag({ cx: sw.x + Math.floor(sw.w * 0.14), y: 112, name: seat(2).name, seat: 2, life: seat(2).life }),
      nameTag({ cx: sw.x + Math.floor(sw.w * 0.84), y: 96, name: seat(3).name, seat: 3, life: seat(3).life }),
      chat({
        x: sw.x + 4, bottom: sw.y + 226, lines: [
          { text: `${seat(1).name} fell to a Tama` },
          { seat: 2, from: seat(2).name, text: 'coming down' },
          { seat: 3, from: seat(3).name, text: 'lees by the torch' },
        ],
      }),
    );
  }
  if (!focused) { focused = true; setTimeout(() => ui.focusOn('fall.rise'), 0); }
  if (!awake) setTimeout(() => ui.invalidate(), Math.max(10, (0.8 - t) * 1000 + 10));
  if (t < 0.3) setTimeout(() => ui.invalidate(), 110);
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'blood.pit', quarters),
    on: { key: (e) => { if (e.key === 'Enter' && awake) { fellAt = ui.t; ui.invalidate(); return true; } return e.key === 'Escape'; } },
    takes: true,
    kids: [...over, ...kids],
  };
}

export const SCREENS: NamedScreen[] = Object.keys(FALLS).map((name) => ({
  name, title: name === 'fall' ? 'The fall, on a server' : 'The fall, alone', world: true, build: (ui: Ui) => build(ui, name),
}));
