// The HUD of section 6, laid out on the stage: each part keeps its distance from the stage's edge, its top or bottom,
// or its centre line, as the wireframe's third it stands in says. The HUD takes no pointer.
import { TEXT } from '../../font/face';
import { count, measure, rightX } from '../../font/measure';
import type { Node, Ui } from '../../node';
import { type Colour, GRADES } from '../../palette';
import { keycap } from '../../parts/keycap';
import { crosshair, hotbar, pips, strip } from '../../parts/hud';
import { TOAST_GAP, TOAST_MOST, TOAST_W, bossBar, statusFrame, toast, toastHeight } from '../../parts/notices';
import { CHAT_WRAP, CREW_ROW, type ChatLine, type CompassMark, type Member, chat, compass, crewHeads, nameTag, ping, readout } from '../../parts/plates';
import { plate } from '../../parts/slab';
import { type Stack, stackGrade, stackName, thing } from '../../sample/play-items';

/** The pick each ore of the sample needs, and the picks in the order of what they break. */
const ORE_NEEDS: Record<string, string> = { iron_ore: 'stone_pickaxe', gold_ore: 'iron_pickaxe', lumenite_ore: 'iron_pickaxe', cindrite_ore: 'lumenite_pickaxe' };
const PICKS = ['wood_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'lumenite_pickaxe'];

/** The readout's second line for a block: the held pick's word when it will do, else the pick it needs in blood. */
function oreLine(ore: string, held: string | null): { line: string; refusal: boolean; needs?: string } {
  const need = ORE_NEEDS[ore];
  if (!need) return { line: 'Breaks by hand', refusal: false };
  const have = held ? PICKS.indexOf(held) : -1;
  const name = (k: string) => thing(k).name.replace(/ Pick$/, ' pick');
  if (have >= PICKS.indexOf(need)) return { line: `${name(held!)} will do`, refusal: false };
  return { line: `Needs ${/^[AEIOUĀĪŪ]/.test(name(need)) ? 'an' : 'a'} ${name(need)}`, refusal: true, needs: thing(need).icon };
}
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
  /**
   * What the crosshair is on, when no boss bar is up: one thing, named once, by the readout and by the prompt under
   * it. `use` is what E does to it, and no prompt is drawn when nothing can be done; `ore` is a block's key, and the
   * readout's second line is worked out from the tool in hand.
   */
  look?: { icon: string; name: string; line?: string; life?: number; use?: string; ore?: string };
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
}

/** The second boss bar or event strip: 12 under the first one's strip. */
const BOSS2_Y = 26 + 20 + 12;

const BAR: (Stack | null)[] = [
  { key: 'iron_pickaxe', n: 1 }, { key: 'iron_sword', n: 1, mod: 'keen' }, { key: 'iron_bow', n: 1 }, { key: 'arrow', n: 64 },
  { key: 'torch', n: 41 }, { key: 'cooked_meat', n: 12 }, { key: 'salve', n: 5 }, { key: 'recall_stone', n: 1 }, { key: 'oak_planks', n: 48 },
];

function rightLine(right: number, y: number, text: string, c: Colour, face = TEXT): Node {
  return { x: rightX(text, right, face), y, w: measure(text, face) + 1, h: face.height + 1, paint: (s) => { s.text(text, 0, 0, c, true, face); } };
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

/** Where chat wraps on a stage: 141 when wide, and always clear of the prompt centred under the crosshair. */
export function chatWrap(stageW: number): number { return Math.min(CHAT_WRAP, Math.floor(stageW / 2) - 64); }

/**
 * The bottom of the newest chat line. When chat with its wash ends left of the hotbar's column, it comes down to 48
 * above the stage's bottom, level with the top of the hotbar's measures; on a stage too
 * narrow for that it stands above the row of defence and lees.
 */
export function chatBottom(stageW: number, stageH: number): number {
  const clear = 4 + chatWrap(stageW) + 3 <= Math.floor(stageW / 2) - 91 - 1;
  return stageH - (clear ? 48 : 58);
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

  if (o.boss) {
    out.push(bossBar({ x: L(cx - 91), y: 26, name: 'Kankāl', f: 0.62, was: 0.7, marks: [0.66, 0.25] }));
    out.push(bossBar({ x: L(cx - 91), y: BOSS2_Y, name: 'Night raid', f: 0.4, event: 'blood' }));
  } else if (o.look) {
    const lk = o.look;
    const said = lk.ore ? oreLine(lk.ore, first ? null : BAR[0]?.key ?? null) : { line: lk.line, refusal: false };
    out.push(readout({ cx: L(cx), y: 26, icon: lk.icon, name: lk.name, life: lk.life, ...said }));
    // The prompt stands 6 under the readout and names what the readout names, so E can only mean one thing.
    if (lk.use && o.prompt !== false) {
      const cap = keycap({ x: 0, y: 0, label: 'E' });
      const text = lk.use;
      const w = cap.w + 4 + measure(text) + 1;
      const x0 = L(cx - Math.floor(w / 2)), y0 = 26 + 24 + 6;
      out.push({ x: x0 - 2, y: y0 - 1, w: w + 4, h: 16, paint: (s) => { s.wash(0, 0, w + 4, 16, 'root.0', 3); } });
      out.push({ ...cap, x: x0, y: y0 });
      out.push({ x: x0 + cap.w + 4, y: y0 + 2, w: measure(text) + 1, h: 11, paint: (s) => { s.text(text, 0, 0, 'salt', true); } });
    }
  }

  const lowY = narrow ? 26 : 4;
  const showCrew = o.crew !== false && !first;
  const friends = PLAYERS.slice(1);
  if (showCrew) out.push(crewHeads({ x: L(4), y: lowY, members: friends }));

  if (!first) {
    const states = [
      { icon: 'loaf', good: true, seconds: 252 }, { icon: 'ironbark', good: true, seconds: 151 },
      { icon: 'swiftroot', good: true, seconds: 8 }, { icon: 'spore_sac', good: false, seconds: 38 },
    ];
    states.forEach((s, i) => out.push(statusFrame({ x: R(4 + 18 + i * 20), y: lowY, ...s })));
    // The Guide's step stands under the status frames, and the one toast shown 4 under it.
    const stepY = lowY + 28;
    out.push(tracker(R(4), stepY, 'Smelt iron', '2 of 3'));
    const toasts = [
      { frame: 'blood' as Colour, icon: 'raid_skull', title: 'A Night raid comes', line: 'Hold the doors till dawn' },
      { frame: 'growth' as Colour, icon: 'ingot', title: 'Smelt iron', line: 'A step of the Guide' },
      { frame: GRADES[2].frame, icon: 'warden_bell', title: 'Kankāl Bell', line: 'Found in a Sealed Store' },
    ];
    // Where the column's left edge would come within 4 of the boss strips' end it starts under the strips instead.
    const tx = R(4 + TOAST_W);
    const clash = o.boss && tx < L(cx + 91 + 4);
    let ty = clash ? Math.max(BOSS2_Y + 22 + 4, stepY + TRACKER_H + 4) : stepY + TRACKER_H + 4;
    const floor = (narrow ? 150 : H - 54) - 2;
    for (const t of toasts.slice(0, TOAST_MOST)) {
      const h = toastHeight(t);
      if (ty + h > floor) break;
      out.push(toast({ x: tx, y: ty, ...t }));
      ty += h + TOAST_GAP;
    }
  } else out.push(tracker(R(4), lowY, 'Gather wood', '0 of 4'));

  if (!first) {
    const feed: [string, number][] = [['+3 Rubble (12)', 0], ['+1 Bone (7)', 0], ['+2 Shade Flesh (6)', 1], ['+1 Kankāl Bell', 2]];
    const lines = feed.slice(narrow ? 1 : 0);
    const y0 = narrow ? 150 : H - 54;
    lines.forEach(([t, g], i) => out.push(rightLine(R(4), y0 + i * 10, t, GRADES[g].dark, TEXT)));
    out.push(rightLine(R(4), H - 12, 'Saved', 'salt', TEXT));
  }

  if (o.chat === true && !first) {
    const top = showCrew ? lowY + friends.length * CREW_ROW + 2 : 4;
    out.push(chat({ x: L(4), bottom: chatBottom(W, H), lines: CHAT, wrap: chatWrap(W), most: Math.floor((chatBottom(W, H) - top) / 10) }));
  }

  out.push(crosshair({ x: L(cx - 4), y: Math.floor(H / 2) - 4 }));
  const inHand = first ? null : BAR[0]!;
  if (inHand) {
    const name = stackName(inHand), c = GRADES[stackGrade(inHand)].dark;
    // No plate: the grade's colour with its shadow, as the tradition writes it, over the row of defence and lees.
    const nw = measure(name) + 1;
    out.push({ x: L(cx - Math.floor(measure(name) / 2)), y: H - 66, w: nw, h: 11, paint: (s) => { s.text(name, 0, 0, c, true); } });
  }
  const carried = first ? '{shield} 0   {lees} 0' : `{shield} 9   {lees} ${count(1240)}`;
  out.push({ x: L(cx - 91), y: H - 54, w: measure(carried) + 1, h: 11, paint: (s) => { s.text(carried, 0, 0, 'salt', true); } });
  const life = first ? [100, 100] : [84, 100], hunger = first ? [20, 20] : [9, 20], arm = first ? [60, 60] : [38, 60];
  out.push(pips({ x: L(cx + 10), y: H - 53, kind: 'arm', now: arm[0], max: arm[1], fromRight: true }));
  out.push(pips({ x: L(cx - 91), y: H - 42, kind: 'life', now: life[0], max: life[1], mending: !first && !STILL }));
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
