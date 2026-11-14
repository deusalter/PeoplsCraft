// The HUD of section 6, laid out on the stage: each part keeps its distance from the stage's edge, its top or bottom,
// or its centre line, as the wireframe's third it stands in says. The HUD takes no pointer.
import { TEXT } from '../../font/face';
import { count, measure, rightX } from '../../font/measure';
import type { Node, Ui } from '../../node';
import { type Colour, GRADES } from '../../palette';
import { CARRIED_MARKS } from '../../art/hud';
import { crosshair, hotbar, pips, strip } from '../../parts/hud';
import { TOAST_GAP, TOAST_MOST, TOAST_W, bossBar, statusFrame, toast, toastHeight } from '../../parts/notices';
import { CHAT_WRAP, CREW_HEADS_ROW, type ChatLine, type CompassMark, type Member, chat, compass, crewHeads, nameTag, ping, readout } from '../../parts/plates';
import { plate } from '../../parts/slab';
import { BODY_STATES } from '../../sample/states';
import { CREW, SERVER, seat, strides } from '../../sample/crew';
import { type Stack, stackGrade, stackName, thing } from '../../sample/play-items';

/** The pick each ore of the sample needs, and the picks in the order of what they break. */
const ORE_NEEDS: Record<string, string> = { iron_ore: 'stone_pickaxe', gold_ore: 'iron_pickaxe', lumenite_ore: 'iron_pickaxe', cindrite_ore: 'lumenite_pickaxe' };
const PICKS = ['wood_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'lumenite_pickaxe'];

/**
 * The readout's second line for a block: the held pick's word when it will do, after a check, else the pick it needs
 * in blood after a cross.
 */
function oreLine(ore: string, held: string | null): { line: string; refusal: boolean; able: boolean } {
  const need = ORE_NEEDS[ore];
  if (!need) return { line: 'Breaks by hand', refusal: false, able: true };
  const have = held ? PICKS.indexOf(held) : -1;
  const name = (k: string) => thing(k).name.replace(/ Pick$/, ' pick');
  if (have >= PICKS.indexOf(need)) return { line: `${name(held!)} will do`, refusal: false, able: true };
  return { line: `Needs ${/^[AEIOUĀĪŪ]/.test(name(need)) ? 'an' : 'a'} ${name(need)}`, refusal: true, able: false };
}
import { STILL } from './common';

/** Everyone on the sample server who is here, from the one sample crew: seat 1 is the one who plays. */
export const PLAYERS: Member[] = CREW.filter((m) => m.online).map((m) => ({
  seat: m.seat, name: m.name, life: m.life, place: m.place, level: m.level, metres: strides(m), bars: m.bars, self: m.seat === 1,
}));

export { SERVER };

export const CHAT: ChatLine[] = [
  { text: 'The bell is rung, and something pale comes up.' },
  { seat: 2, from: seat(2).name, text: 'on the north wall' },
  { seat: 3, from: seat(3).name, text: 'anyone got a salve' },
  { boss: 'Kankāl', text: 'turns, throwing pale matter in spirals.' },
  { seat: 8, from: seat(8).name, text: 'keep it off the brazier side, the floor there is cracked and I am not going down that hole again tonight' },
  { seat: 6, from: seat(6).name, text: 'coming from the Yavas with arrows' },
];

export interface HudOpts {
  /** A great feeder up: the boss bar and a world event's strip under it. */
  boss?: boolean;
  /**
   * What the crosshair is on, when no boss bar is up: one thing, named once, by the readout and by the prompt under
   * it. `use` is what E does to it, and no prompt is drawn when nothing can be done; `ore` is a block's key, and the
   * readout's second line is worked out from the tool in hand.
   */
  look?: { icon: string; name: string; line?: string; life?: number; use?: string; ore?: string; hostile?: boolean };
  /** A new arrival: the hotbar empty, every measure full, the Guide's first step, nobody near. */
  first?: boolean;
  /** The crew list is not drawn while chat is open or the roster is held. */
  crew?: boolean;
  /** Chat closed, with lines that came in the last 8 s; a still HUD has none, so it is drawn only when asked for. */
  chat?: boolean;
  /** Friends' tags and a ping in the world. */
  world?: boolean;
  /** The prompt under the crosshair; not drawn while chat is open. */
  prompt?: boolean;
  /** The Guide's step and the toasts; not drawn while the roster is held, which would cover half of them. */
  notices?: boolean;
  /**
   * The chat entry is open along the bottom. It stops 100 short of the stage's right edge, clear of the pickups and
   * "Saved", which therefore stay where they stand: lifted over a full-width entry, the corner jumped as chat opened.
   */
  entry?: boolean;
}

/** The top of what stands under the compass: 4 under the night centred beneath it. */
const CENTRE_Y = 28;
/** The second boss bar or event strip: 12 under the first one's strip. */
const BOSS2_Y = CENTRE_Y + 20 + 12;
/** From one status frame to the next: the frame of 18 and 4 clear. */
const STATUS_PITCH = 22;

const BAR: (Stack | null)[] = [
  { key: 'iron_pickaxe', n: 1 }, { key: 'iron_sword', n: 1, mod: 'keen' }, { key: 'iron_bow', n: 1 }, { key: 'arrow', n: 64 },
  { key: 'torch', n: 41 }, { key: 'cooked_meat', n: 12 }, { key: 'salve', n: 5 }, { key: 'recall_stone', n: 1 }, { key: 'oak_planks', n: 48 },
];

function rightLine(right: number, y: number, text: string, c: Colour, face = TEXT): Node {
  return { x: rightX(text, right, face), y, w: measure(text, face) + 1, h: face.height + 1, paint: (s) => { s.text(text, 0, 0, c, true, face); } };
}

/**
 * A line on a strip of the chat wash 10 tall reaching 2 past its words on each side (the shadow counted), at `x`: the
 * held thing's name and each pickup. In its grade's colour bare on the world, a green name vanished into noon grass
 * and only its shadow read, as a smudge.
 */
function washedLine(x: number, y: number, text: string, c: Colour): Node {
  const w = measure(text) + 1 + 4;
  return { x, y, w, h: 10, paint: (s) => { s.wash(0, 0, w, 10, 'root.0', 3); s.text(text, 2, 0, c, true); } };
}

/** The height of the Guide's present step on the HUD: one line on a strip of the chat wash. */
export const TRACKER_H = 12;

/**
 * The Guide's present step (H8), folded to one line right-aligned at `right`: the step mark, the step in salt and the
 * count in `root.4`, on one strip of the chat wash a unit wider than the text all round, with no frame, as chat has.
 */
export function tracker(right: number, y: number, step: string, have: string): Node {
  const t = `{step} ${step}`, c = `  ${have}`;
  const w = measure(t) + measure(c) + 1;
  return {
    x: right - w - 1, y, w: w + 2, h: TRACKER_H,
    paint: (s) => {
      s.wash(0, 0, w + 2, TRACKER_H, 'root.0', 3);
      const x = 1 + s.text(t, 1, 1, 'salt', true);
      s.text(c, x, 1, 'root.4', true);
    },
  };
}

/**
 * Where chat wraps on a stage: the setting's width less 3 (237 at Middle), and always clear of the prompt centred
 * under the crosshair.
 */
export function chatWrap(stageW: number, width = CHAT_WRAP + 3): number { return Math.min(width - 3, Math.floor(stageW / 2) - 64); }

/**
 * The bottom of the newest chat line. When chat with its wash ends 4 left of the hotbar's column, it comes down to 48
 * above the stage's bottom, level with the top of the hotbar's measures; when it reaches over that column it stands
 * 68 above, clear of the name of the thing in hand.
 */
export function chatBottom(stageW: number, stageH: number, width?: number): number {
  // 4 clear of the hotbar's column: at 1 the chat's wash seemed to run into the pips and the hotbar.
  const clear = 4 + chatWrap(stageW, width) + 3 <= Math.floor(stageW / 2) - 91 - 4;
  return stageH - (clear ? 48 : 68);
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
  out.push(compass({ x: L(cx - 91), y: 2, heading: 20, marks, night: first ? 'Night 1 of 8' : 'Night 3 of 8' }));

  // What stands in the centre column under the compass's line, which the toast must keep 4 clear of.
  let centre: Node | null = null;
  if (o.boss) {
    centre = { x: L(cx - 91), y: CENTRE_Y, w: 182, h: BOSS2_Y + 22 - CENTRE_Y };
    out.push(bossBar({ x: L(cx - 91), y: CENTRE_Y, name: 'Kankāl', f: 0.62, was: 0.7, marks: [0.66, 0.25] }));
    out.push(bossBar({ x: L(cx - 91), y: BOSS2_Y, name: 'Night raid', f: 0.4, event: 'blood' }));
  } else if (o.look) {
    const lk = o.look;
    const said = lk.ore ? oreLine(lk.ore, first ? null : BAR[0]?.key ?? null) : { line: lk.line, refusal: false };
    // What E does is the plate's third row, so that E can only mean the one thing the readout names.
    centre = readout({ cx: L(cx), y: CENTRE_Y, icon: lk.icon, name: lk.name, life: lk.life, hostile: lk.hostile, use: o.prompt !== false ? lk.use : undefined, ...said });
    out.push(centre);
  }

  const lowY = narrow ? 26 : 4;
  const showCrew = o.crew !== false && !first;
  const friends = PLAYERS.slice(1);
  if (showCrew) out.push(crewHeads({ x: L(4), y: lowY, members: friends }));

  if (!first) {
    const toasts = [
      { frame: 'blood' as Colour, icon: 'raid_skull', title: 'A Night raid comes', line: 'Hold the doors till dawn' },
      { frame: 'growth' as Colour, icon: 'ingot', title: 'Smelt iron', line: 'A step of the Guide' },
      { frame: GRADES[2].frame, icon: 'warden_bell', title: 'Kankāl Bell', line: 'Found in a Sealed Store' },
    ].slice(0, o.notices === false ? 0 : TOAST_MOST);
    // The status frames keep the top right corner and the Guide's step stands 4 under their times, whether or not a
    // toast shows; toasts come in under the step at the stage's right edge. Handed in at the top, the toast pushed the
    // frames down 32 or more and back, and the corner rearranged itself between one moment and the next. Where what
    // stands under the compass (a great feeder's strips, a wide readout) reaches the toast's column, the toast stands
    // 4 under it.
    const tx = R(TOAST_W);
    const statusY = lowY;
    let ty = statusY + 28 + TRACKER_H + 4;
    if (centre && centre.x + centre.w + 4 > tx) ty = Math.max(ty, centre.y + centre.h + 4);
    // Left to right in the order the pack's States tab lists them, so the two never disagree; 4 clear between frames,
    // so that their times never run together.
    const n = BODY_STATES.length;
    BODY_STATES.forEach((s, i) => out.push(statusFrame({ x: R(4 + 18 + (n - 1 - i) * STATUS_PITCH), y: statusY, icon: s.icon, good: s.good, seconds: s.seconds })));
    if (o.notices !== false) out.push(tracker(R(4), statusY + 28, 'Smelt iron', '2 of 3'));
    const floor = (narrow ? 150 : H - 54) - 2;
    for (const t of toasts) {
      const h = toastHeight(t);
      if (ty + h > floor) break;
      out.push(toast({ x: tx, y: ty, ...t }));
      ty += h + TOAST_GAP;
    }
  } else if (o.notices !== false) out.push(tracker(R(4), lowY, 'Gather wood', '0 of 4'));

  if (!first) {
    const feed: [string, number][] = [['+3 Rubble (12)', 0], ['+1 Bone (7)', 0], ['+2 Shade Flesh (6)', 1], ['+1 Kankāl Bell', 2]];
    const lines = feed.slice(narrow ? 1 : 0);
    const y0 = narrow ? 150 : H - 54;
    lines.forEach(([t, g], i) => out.push(washedLine(R(4) - measure(t) - 5, y0 + i * 10, t, GRADES[g].dark)));
    out.push(rightLine(R(4), H - 12, 'Saved', 'salt', TEXT));
  }

  if (o.chat === true && !first) {
    const top = showCrew ? lowY + friends.length * CREW_HEADS_ROW + 1 : 4;
    out.push(chat({ x: L(4), bottom: chatBottom(W, H), lines: CHAT, wrap: chatWrap(W), most: Math.floor((chatBottom(W, H) - top) / 10) }));
  }

  out.push(crosshair({ x: L(cx - 4), y: Math.floor(H / 2) - 4 }));
  const inHand = first ? null : BAR[0]!;
  if (inHand) {
    const name = stackName(inHand), c = GRADES[stackGrade(inHand)].dark;
    // The grade's colour with its shadow on a strip of the chat wash, over the row of defence and lees.
    out.push(washedLine(L(cx - Math.floor(measure(name) / 2)) - 2, H - 66, name, c));
  }
  // Each figure stands 2 right of its mark, its digits centred on the mark's 9 rows.
  const defence = first ? '0' : '9', lees = first ? '0' : count(1240);
  const leesX = 9 + 2 + measure(defence) + 8;
  out.push({
    x: L(cx - 91), y: H - 53, w: leesX + 11 + measure(lees) + 1, h: 10,
    paint: (s) => {
      s.map(CARRIED_MARKS.defence, 0, 0);
      s.text(defence, 11, 0, 'salt', true);
      s.map(CARRIED_MARKS.lees, leesX, 0);
      s.text(lees, leesX + 11, 0, 'salt', true);
    },
  });
  const life = first ? [100, 100] : [84, 100], hunger = first ? [20, 20] : [9, 20], arm = first ? [60, 60] : [38, 60];
  out.push(pips({ x: L(cx + 10), y: H - 53, kind: 'arm', now: arm[0], max: arm[1], fromRight: true }));
  out.push(pips({ x: L(cx - 91), y: H - 42, kind: 'life', now: life[0], max: life[1], mending: !first && !STILL }));
  const practice = first ? 0 : 320 / 900;
  const level = first ? '1' : '14';
  // The level sits on the practice strip as the tradition sets it: its figures end 1 above the strip, under the feet of
  // the pips, and each is ringed in root.0, whose lowest ring row lies on the strip's top, so that it reads as the
  // strip's number. Ending level with the pips' feet it read as a count of life or hunger wedged between the rows.
  // While the strip is empty no level is written: a lone 1 beside an empty strip read as a stray figure.
  const lw = measure(level);
  if (practice > 0) out.push({
    x: L(cx - Math.floor(lw / 2)) - 1, y: H - 40, w: lw + 2, h: 10,
    paint: (s) => {
      for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) s.text(level, dx, dy, 'root.0');
      s.text(level, 1, 1, 'growth.lt');
    },
  });
  out.push(pips({ x: L(cx + 10), y: H - 42, kind: 'hunger', now: hunger[0], max: hunger[1], fromRight: true }));
  out.push(strip({ x: L(cx - 91), y: H - 31, w: 182, f: practice, tones: ['growth.lt', 'growth', 'growth.dk'], segments: 18, thin: true }));
  out.push(hotbar({
    x: L(cx - 91), y: H - 24, chosen: 0,
    cells: first ? Array(9).fill(null) : BAR.map((s) => (s ? { icon: thing(s.key).icon, n: s.n } : null)),
    cooling: first ? [] : [undefined, undefined, undefined, undefined, undefined, undefined, 0.6, 0.3],
  }));

  if (o.world && !first) {
    out.push(nameTag({ cx: L(cx + 34), y: 150, name: seat(2).name, seat: 2, life: seat(2).life }));
    out.push(nameTag({ cx: L(cx + 84), y: 162, name: seat(3).name, seat: 3, life: seat(3).life }));
    out.push(nameTag({ cx: L(cx + 62), y: 128, name: 'Kammār' }));
    out.push(ping({ cx: L(cx + 24), y: 104, seat: 2, metres: 18 }));
  }
  return out;
}

/** The HUD as a screen: the world clear, nothing dimmed, nothing taking the pointer. */
export function hudScreen(ui: Ui, o: HudOpts, over: Node[] = []): Node {
  return { x: 0, y: 0, w: ui.w, h: ui.h, kids: [...hud(ui, o), ...over] };
}
