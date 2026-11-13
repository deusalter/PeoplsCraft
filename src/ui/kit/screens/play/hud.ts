// The HUD of section 6, laid out on the stage: each part keeps its distance from the stage's edge, its top or bottom,
// or its centre line, as the wireframe's third it stands in says. The HUD takes no pointer.
import { SMALL, TEXT } from '../../font/face';
import { count, measure, rightX } from '../../font/measure';
import type { Node, Ui } from '../../node';
import { type Colour, GRADES } from '../../palette';
import { keycap } from '../../parts/keycap';
import { crosshair, hotbar, pips, strip } from '../../parts/hud';
import { bossBar, statusFrame, toast } from '../../parts/notices';
import { type ChatLine, type CompassMark, type Member, chat, compass, crew, nameTag, ping, readout } from '../../parts/plates';
import { plate } from '../../parts/slab';
import { type Stack, stackGrade, stackName, thing } from '../../sample/play-items';
import { STILL } from './common';

/** Everyone on the sample server: seat 1 is the one who plays. */
export const PLAYERS: Member[] = [
  { seat: 1, name: 'Ānanya_Kīrtimālā_Sūryavansh', life: 0.84, place: 'Vana', level: 14, bars: 3 },
  { seat: 2, name: 'kiln_rat', life: 1, place: 'Vana', level: 12, metres: 18, bars: 3 },
  { seat: 3, name: 'Ishaan', life: 0.35, place: 'Vana', level: 15, metres: 42, bars: 2 },
  { seat: 4, name: 'Pallavi', life: 0.92, place: 'Fungus Caverns', level: 9, bars: 3 },
  { seat: 5, name: 'nightjar', life: 0.6, place: 'Pabbat', level: 21, metres: 1240, bars: 1 },
  { seat: 6, name: 'brakeless', life: 0.12, place: 'Village', level: 7, metres: 386, bars: 3 },
  { seat: 7, name: 'Ūrmilā', life: 1, place: 'Crystal Islands', level: 30, bars: 2 },
  { seat: 8, name: 'mossback_the_unhurried_one', life: 0.71, place: 'Marudesha', level: 3, metres: 2210, bars: 0 },
];

export const SERVER = 'The hearth on the Pabbat road';

export const CHAT: ChatLine[] = [
  { text: 'The bell is rung, and something pale comes up.' },
  { seat: 2, from: 'kiln_rat', text: 'on the north wall' },
  { seat: 3, from: 'Ishaan', text: 'anyone got a salve' },
  { text: 'It turns, throwing pale matter in spirals.' },
  { seat: 7, from: 'Ūrmilā', text: 'keep it off the brazier side, the floor there is cracked and I am not going down that hole again tonight' },
  { seat: 6, from: 'brakeless', text: 'coming from the Village with arrows' },
];

export interface HudOpts {
  /** A great feeder up: the boss bar and a world event's strip under it. */
  boss?: boolean;
  /** What is looked at, when no boss bar is up. */
  look?: { icon: string; name: string; line?: string; refusal?: boolean; life?: number };
  /** A new arrival: the hotbar empty, every measure full, the Guide's first step, nobody near. */
  first?: boolean;
  /** The crew list is not drawn while chat is open or the roster is held. */
  crew?: boolean;
  /** Chat closed, with its last lines. */
  chat?: boolean;
  /** Friends' tags and a ping in the world. */
  world?: boolean;
  /** The prompt under the crosshair; not drawn while chat is open. */
  prompt?: boolean;
}

const BAR: (Stack | null)[] = [
  { key: 'iron_pickaxe', n: 1 }, { key: 'iron_sword', n: 1, mod: 'keen' }, { key: 'iron_bow', n: 1 }, { key: 'arrow', n: 64 },
  { key: 'torch', n: 41 }, { key: 'cooked_meat', n: 12 }, { key: 'salve', n: 5 }, { key: 'recall_stone', n: 1 }, { key: 'oak_planks', n: 48 },
];

function rightLine(right: number, y: number, text: string, c: Colour, face = SMALL): Node {
  return { x: rightX(text, right, face), y, w: measure(text, face) + 1, h: face.height + 1, paint: (s) => { s.text(text, 0, 0, c, true, face); } };
}

/** The Guide's present step: a dark plate with the chapter in grey, the step in salt, the count and where to go under it. */
function tracker(x: number, y: number, chapter: string, step: string, have: string, where: string): Node {
  return plate({
    x, y, w: 128, h: 44,
    kids: [{
      x: 0, y: 0, w: 128, h: 44, paint: (s) => {
        s.text(chapter, 5, 3, 'root.4', true);
        s.text(`{step} ${step}`, 5, 15, 'salt', true);
        s.text(have, 5, 28, 'salt', true);
        s.text(where, rightX(where, 121), 28, 'arm.lt', true);
      },
    }],
  });
}

export function hud(ui: Ui, o: HudOpts): Node[] {
  const st = ui.layout.stage;
  const W = st.w, H = st.h, cx = Math.floor(W / 2);
  const narrow = W < 400;
  const L = (x: number) => st.x + x;
  const R = (fromRight: number) => st.x + W - fromRight;
  const out: Node[] = [];
  const first = !!o.first;

  const marks: CompassMark[] = first ? [{ kind: 'guide', deg: 64 }] : [
    { kind: 'bed', deg: 200 }, { kind: 'guide', deg: 34 }, { kind: 'fell', deg: 302 },
    { kind: 'friend', seat: 2, deg: 8 }, { kind: 'friend', seat: 3, deg: 61 }, { kind: 'friend', seat: 6, deg: 338 }, { kind: 'friend', seat: 5, deg: 130 },
  ];
  out.push(compass({ x: L(cx - 91), y: 2, heading: 20, marks, place: 'X -104  Y 64  Z 2210', night: first ? 'NIGHT 1 OF 8' : 'NIGHT 3 OF 8' }));

  if (o.boss) {
    out.push(bossBar({ x: L(cx - 91), y: 26, name: 'Kankāl', f: 0.62, was: 0.7, marks: [0.66, 0.25] }));
    out.push(bossBar({ x: L(cx - 91), y: 50, name: 'Night raid', f: 0.4, event: 'blood' }));
  } else if (o.look) {
    out.push(readout({ cx: L(cx), y: 26, ...o.look }));
  }

  const lowY = narrow ? 26 : 4;
  if (o.crew !== false && !first) out.push(crew({ x: L(4), y: lowY, members: PLAYERS.slice(1) }));

  if (!first) {
    const states = [
      { icon: 'loaf', good: true, seconds: 252 }, { icon: 'ironbark', good: true, seconds: 151 },
      { icon: 'swiftroot', good: true, seconds: 8 }, { icon: 'spore_sac', good: false, seconds: 38 },
    ];
    states.forEach((s, i) => out.push(statusFrame({ x: R(4 + 18 + i * 20), y: lowY, ...s })));
    const toasts = [
      { frame: 'growth' as Colour, icon: 'ingot', title: 'Smelt iron', line: 'A step of the Guide' },
      { frame: GRADES[2].frame, icon: 'warden_bell', title: 'Kankāl Bell', line: 'Found in a Sealed Store' },
      { frame: 'blood' as Colour, icon: 'gloomshade', title: 'A Night raid comes', line: 'Hold the doors till first light' },
    ].slice(0, narrow ? 2 : 3);
    toasts.forEach((t, i) => out.push(toast({ x: R(4 + 160), y: (narrow ? 54 : 32) + i * 34, ...t })));
  }

  if (narrow) out.push(rightLine(R(4), 126, first ? 'Gather wood' : 'Smelt iron', 'salt', TEXT));
  else out.push(first
    ? tracker(R(4 + 128), 138, 'Empty Hands', 'Gather wood', '0 of 4', 'Any log')
    : tracker(R(4 + 128), 138, 'Iron and Root', 'Smelt iron', '2 of 3', 'Stone Furnace'));

  if (!first) {
    const feed: [string, number][] = [['+3 Rubble (12)', 0], ['+1 Bone (7)', 0], ['+2 Shade Flesh (6)', 1], ['+1 Kankāl Bell', 2]];
    const lines = feed.slice(narrow ? 1 : 0);
    const y0 = narrow ? 150 : H - 54;
    lines.forEach(([t, g], i) => out.push(rightLine(R(4), y0 + i * 10, t, GRADES[g].dark, TEXT)));
    out.push(rightLine(R(4), H - 10, 'SAVED', 'salt'));
  }

  if (o.chat !== false && !first) out.push(chat({ x: L(4), bottom: 170, lines: CHAT }));

  out.push(crosshair({ x: L(cx - 4), y: Math.floor(H / 2) - 4 }));
  if (!o.boss && !first && o.prompt !== false) {
    const cap = keycap({ x: 0, y: 0, label: 'E' });
    const text = 'Talk to Kammār';
    const w = cap.w + 4 + measure(text);
    const x0 = L(cx - Math.floor(w / 2));
    out.push({ ...cap, x: x0, y: Math.floor(H / 2) + 14 });
    out.push({ x: x0 + cap.w + 4, y: Math.floor(H / 2) + 15, w: measure(text) + 1, h: 11, paint: (s) => { s.text(text, 0, 0, 'salt', true); } });
  }

  const inHand = first ? null : BAR[0]!;
  if (inHand) {
    const name = stackName(inHand), c = GRADES[stackGrade(inHand)].dark;
    out.push({ x: L(cx - Math.floor(measure(name) / 2)), y: H - 66, w: measure(name) + 1, h: 11, paint: (s) => { s.text(name, 0, 0, c, true); } });
  }
  const carried = first ? '{shield} 0   {lees} 0' : `{shield} 9   {lees} ${count(1240)}`;
  out.push({ x: L(cx - 91), y: H - 54, w: measure(carried) + 1, h: 11, paint: (s) => { s.text(carried, 0, 0, 'salt', true); } });
  const life = first ? [100, 100] : [84, 100], hunger = first ? [20, 20] : [9, 20], arm = first ? [60, 60] : [38, 60];
  out.push(pips({ x: L(cx + 10), y: H - 53, kind: 'arm', now: arm[0], max: arm[1], fromRight: true }));
  out.push(pips({ x: L(cx - 91), y: H - 42, kind: 'life', now: life[0], max: life[1], mending: !first && !STILL }));
  out.push(rightLine(L(cx - 94), H - 40, String(life[0]), 'salt'));
  const level = first ? '1' : '14';
  out.push({ x: L(cx - Math.floor(measure(level) / 2)), y: H - 43, w: measure(level) + 1, h: 11, paint: (s) => { s.text(level, 0, 0, 'growth.lt', true); } });
  out.push(pips({ x: L(cx + 10), y: H - 42, kind: 'hunger', now: hunger[0], max: hunger[1], fromRight: true }));
  out.push(strip({ x: L(cx - 91), y: H - 31, w: 182, f: first ? 0 : 320 / 900, tones: ['growth.lt', 'growth', 'growth.dk'], segments: 18, thin: true }));
  out.push(hotbar({
    x: L(cx - 91), y: H - 24, chosen: 0,
    cells: first ? Array(9).fill(null) : BAR.map((s) => (s ? { icon: thing(s.key).icon, n: s.n } : null)),
    cooling: first ? [] : [undefined, undefined, undefined, undefined, undefined, undefined, 0.6, 0.3],
  }));

  if (o.world && !first) {
    out.push(nameTag({ cx: L(cx + 34), y: 150, name: 'kiln_rat', seat: 2, life: 1 }));
    out.push(nameTag({ cx: L(cx + 84), y: 162, name: 'Ishaan', seat: 3, life: 0.35 }));
    out.push(nameTag({ cx: L(cx + 62), y: 128, name: 'Kammār' }));
    out.push(ping({ cx: L(cx + 24), y: 104, seat: 2, metres: 18 }));
  }
  return out;
}

/** The HUD as a screen: the world clear, nothing dimmed, nothing taking the pointer. */
export function hudScreen(ui: Ui, o: HudOpts, over: Node[] = []): Node {
  return { x: 0, y: 0, w: ui.w, h: ui.h, kids: [...hud(ui, o), ...over] };
}
