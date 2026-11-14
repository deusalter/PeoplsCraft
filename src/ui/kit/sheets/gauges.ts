// The third sheet: tooltips with the frame of every grade, the named old thing, and the hollows that fill.
import type { Node, Tip } from '../node';
import { type Colour, GRADES } from '../palette';
import { burnGauge, channel, progressArrow } from '../parts/gauges';
import { plate, slab } from '../parts/slab';
import { slot } from '../parts/slot';
import { paintTip, tipBox } from '../tooltip';
import { type Sheet, ink, page, salt } from './common';

function tipNode(x: number, y: number, tip: Tip): Node {
  const b = tipBox(tip);
  return { x, y, w: b.w, h: b.h, paint: (s) => paintTip(s, tip, b, 0, 0) };
}

const PICK: Tip = {
  frame: GRADES[2].frame,
  lines: [
    { text: 'Dense Hīrak Cuirass', c: GRADES[2].dark },
    { text: 'Deep grade, body', c: 'root.4' },
    { text: 'Worn on the body.', c: 'salt' },
    { text: '+8 defence', c: 'growth.lt' },
    { text: '-5% speed', c: 'blood.lt' },
    { text: 'Of the Plate set: 2 of 3', c: 'arm.lt' },
    { text: 'Forged at the Anvil.', c: 'root.4' },
    { text: '{lmb} take  {rmb} half', c: 'root.4' },
  ],
};

const NAMED: Tip = {
  frame: GRADES[6].frame, named: true,
  lines: [{ text: 'Cairn Lamp', c: GRADES[6].dark }, { text: 'Old, a lamp', c: 'root.4' }],
};

export const gaugesSheet: Sheet = {
  title: 'Parts: tooltips and gauges',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    kids.push(salt(0, 0, 'Tooltips: a frame for each grade'));
    let y = 14;
    GRADES.forEach((g, i) => {
      const t: Tip = { frame: g.frame, lines: [{ text: `${g.name}`, c: g.dark }] };
      const b = tipBox(t);
      kids.push(tipNode(0, y, t));
      y += b.h + 2;
      void i;
    });
    kids.push(tipNode(76, 14, PICK));
    const pb = tipBox(PICK);
    kids.push(tipNode(76, 14 + pb.h + 4, NAMED));
    kids.push(plate({ x: 76, y: 14 + pb.h + 4 + tipBox(NAMED).h + 4, w: 128, h: 28, frame: 'blood', kids: [salt(5, 3, 'A refusal'), salt(5, 14, '{cross} Not enough lees', 'blood.lt')] }));
    // The hollows that fill, sunk in each slab.
    const g = (ramp: 'clay' | 'timber' | 'stone', x: number, y: number, title: string, colour: Colour) => slab({
      x, y, w: 238, h: 84, ramp, title,
      kids: [
        progressArrow({ x: 8, y: 20, f: 0, ramp, colour }), progressArrow({ x: 34, y: 20, f: 0.6, ramp, colour }), progressArrow({ x: 60, y: 20, f: 1, ramp, colour }),
        ink(8, 38, 'Arrow'),
        burnGauge({ x: 96, y: 20, f: 0, ramp }), burnGauge({ x: 112, y: 20, f: 0.55, ramp }), burnGauge({ x: 128, y: 20, f: 1, ramp }),
        ink(96, 38, 'Flame'),
        // Each upright says what it measures, so its colour reads as that measure and not as decoration.
        channel({ x: 150, y: 18, len: 22, f: 0.4, ramp, upright: true, colour: 'ember' }),
        ink(159, 24, 'Heat', 'ink.faded'),
        channel({ x: 188, y: 18, len: 22, f: 0.85, ramp, upright: true, colour: 'arm' }),
        ink(197, 24, 'Water', 'ink.faded'),
        channel({ x: 8, y: 52, len: 120, f: 0.55, ramp, colour }),
        ink(134, 51, 'Channel'),
        channel({ x: 8, y: 64, len: 120, f: 0.12, ramp, colour: 'growth' }),
        ink(134, 63, 'A count'),
      ],
    });
    kids.push(g('stone', 236, 0, 'A furnace at work', 'ember'));
    kids.push(g('timber', 236, 87, 'The Line Frame', 'arm'));
    // A station's row, as the furnaces have it: what is worked, the flame, the arrow, the result.
    kids.push(slab({
      x: 236, y: 174, w: 238, h: 88, ramp: 'stone', title: 'Stone Furnace',
      kids: [
        slot({ id: 'k.in', x: 40, y: 20, ramp: 'stone', stack: { icon: 'ore', n: 6 } }),
        burnGauge({ x: 43, y: 41, f: 0.7, ramp: 'stone' }),
        slot({ id: 'k.fuel', x: 40, y: 58, ramp: 'stone', silhouette: 'fuel', mark: 'accepts' }),
        progressArrow({ x: 72, y: 40, f: 0.45, ramp: 'stone' }),
        slot({ id: 'k.out', x: 104, y: 34, ramp: 'stone', large: true, stack: { icon: 'ingot', n: 3 } }),
        ink(140, 42, 'Iron Bar'),
        ink(140, 52, 'Smelting', 'ink.faded'),
      ],
    }));
    return page(ui, kids);
  },
};
