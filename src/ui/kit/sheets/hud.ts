// The fourth sheet: the HUD's sprites and the notices held up against the world.
import type { Node } from '../node';
import { GRADES } from '../palette';
import { crosshair, hotbar, pips, strip } from '../parts/hud';
import { banner, bossBar, statusFrame, toast } from '../parts/notices';
import { type Sheet, page, salt } from './common';

export const hudSheet: Sheet = {
  title: 'Parts: the HUD',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    // Pips: life from the left, hunger and the arm from the right, each full, half, empty; life low shakes, life mending.
    kids.push(salt(0, 0, 'Pips: life, hunger, the arm'));
    kids.push(pips({ x: 0, y: 14, kind: 'life', now: 13, max: 20 }));
    kids.push(pips({ x: 100, y: 14, kind: 'hunger', now: 15, max: 20, fromRight: true }));
    kids.push(pips({ x: 0, y: 28, kind: 'life', now: 4, max: 20, shake: true, phase: 8 }));
    kids.push(salt(86, 27, 'Low: they shake'));
    kids.push(pips({ x: 0, y: 42, kind: 'life', now: 17, max: 20, mending: true, phase: 18 }));
    kids.push(salt(86, 41, 'Mending'));
    kids.push(pips({ x: 100, y: 56, kind: 'arm', now: 9, max: 20, fromRight: true }));
    kids.push(pips({ x: 0, y: 56, kind: 'hunger', now: 3, max: 20, fromRight: true, shake: true, phase: 4 }));
    // Strips: the practice strip over the hotbar, a strip losing life with its trail.
    kids.push(salt(0, 70, 'Strips fill by whole units'));
    kids.push(strip({ x: 0, y: 84, w: 182, f: 0.62, tones: ['growth.lt', 'growth', 'growth.dk'], segments: 18, thin: true }));
    kids.push(strip({ x: 0, y: 92, w: 182, f: 0.48, was: 0.6, tones: ['blood.lt', 'blood', 'blood.dk'], segments: 10 }));
    kids.push(strip({ x: 0, y: 102, w: 88, f: 0.75, tones: ['arm.lt', 'arm', 'arm.dk'], segments: 4 }));
    kids.push(strip({ x: 94, y: 102, w: 88, f: 0.3, tones: ['violet.lt', 'violet.lt', 'violet.dk'], segments: 4, thin: true }));
    // The hotbar with its selector, a stack of 64 and one cooling.
    kids.push(salt(0, 114, 'Hotbar and selector'));
    kids.push(hotbar({
      x: 0, y: 129, chosen: 2,
      cells: [{ icon: 'pick', n: 1 }, { icon: 'turf', n: 64 }, { icon: 'blade', n: 1 }, { icon: 'tonic', n: 3 }, null, { icon: 'crystal', n: 1 }, { icon: 'loaf', n: 12 }, { icon: 'log', n: 40 }, { icon: 'bow', n: 1 }],
      cooling: [undefined, undefined, undefined, 0.6, undefined, 0.25],
    }));
    kids.push(salt(0, 156, 'Crosshair: still, a hit, a critical hit'));
    kids.push(crosshair({ x: 4, y: 170 }));
    kids.push(crosshair({ x: 20, y: 170, hit: 'hit' }));
    kids.push(crosshair({ x: 36, y: 170, hit: 'crit' }));
    // Status frames at the top right with their timers.
    kids.push(salt(60, 168, 'States'));
    kids.push(statusFrame({ x: 100, y: 166, icon: 'apple', good: true, seconds: 65 }));
    kids.push(statusFrame({ x: 122, y: 166, icon: 'haunch', good: true, seconds: 8 }));
    kids.push(statusFrame({ x: 144, y: 166, icon: 'bait', good: false, seconds: 125 }));
    // Banner and the boss bar at the top centre.
    kids.push(banner({ x: 0, y: 198, frame: 'root.4', colour: 'blood.lt', title: 'Night raid', line: 'Hold the hearth till first light' }));
    kids.push(banner({ x: 0, y: 226, frame: 'violet.lt', title: 'Amāvassa', line: 'The dark night of the round' }));
    kids.push(bossBar({ x: 200, y: 0, name: 'Maruhar', f: 0.58, was: 0.66, marks: [0.5, 0.25] }));
    kids.push(bossBar({ x: 200, y: 26, name: 'Sand March', f: 0.7, event: 'blood' }));
    kids.push(bossBar({ x: 200, y: 50, name: 'Amāvassa', f: 0.35, event: 'violet' }));
    // Toasts: a step of the Guide, a thing found, a warning, plain; the last still sliding in.
    kids.push(toast({ x: 200, y: 76, frame: 'growth', icon: 'patterns', title: 'A step of the Guide', line: 'Build a kiln' }));
    kids.push(toast({ x: 200, y: 110, frame: GRADES[3].frame, icon: 'crystal', title: 'Violet Crystal', line: 'Found in the deep' }));
    kids.push(toast({ x: 200, y: 144, frame: 'blood', icon: 'haunch', title: 'You are starving', line: 'Eat something' }));
    kids.push({ x: 200, y: 178, w: 160, h: 32, clip: true, kids: [toast({ x: 0, y: 0, frame: 'root.4', icon: 'key', title: 'Saved', line: 'Hearth on the Yavas', slide: 48 })] });
    kids.push(salt(364, 76, 'Toasts slide'));
    kids.push(salt(364, 88, 'in from the'));
    kids.push(salt(364, 100, 'right, 16'));
    kids.push(salt(364, 112, 'units a frame.'));
    return page(ui, kids);
  },
};
