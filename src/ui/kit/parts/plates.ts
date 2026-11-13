import { HEADS } from '../art/heads';
import { COMPASS_MARKS, PING } from '../art/marks';
import { PLATE } from '../art/slab';
import { SMALL, TEXT } from '../font/face';
import { centreX, count, measure, rightX } from '../font/measure';
import { cut, wrap } from '../font/wrap';
import type { Node, Ui } from '../node';
import { type Colour, SEATS } from '../palette';
import type { Surface } from '../surface';
import { paintStrip } from './hud';
import { paintSlot } from './slot';

const REST = { hover: false, down: false, focus: false, t: 0 };

// ---- compass (5.26)

export type CompassMark = { deg: number } & ({ kind: 'bed' | 'fell' | 'guide' } | { kind: 'friend'; seat: number });

export interface CompassOpts {
  x: number; y: number;
  /** Degrees, 0 at north, growing to the east. */
  heading: number;
  marks?: CompassMark[];
  place?: string;
  night?: string;
}

export const COMPASS_W = 182;
const HALF = 84;
const SPAN = 69;

/** Where a bearing falls on the strip, in units from its middle, or null when it is outside the 138 degrees shown. */
function along(deg: number, heading: number): number {
  const d = ((((deg - heading) % 360) + 540) % 360) - 180;
  return Math.round((d * HALF) / SPAN);
}

/**
 * The compass strip (5.26): a plain dark plate 182 by 12 showing 138 degrees of the horizon. The four winds are
 * letters of salt with no shadow, the points between ticks of `root.4`, the heading two marks of salt at x 90.
 */
export function compass(o: CompassOpts): Node {
  return {
    x: o.x, y: o.y, w: COMPASS_W, h: 21,
    paint: (s) => {
      s.nine(PLATE, 0, 0, COMPASS_W, 12);
      const mid = 90;
      // A friend's head with its frame is 10 tall and lies over the plate's inner edges.
      s.clip(2, 1, COMPASS_W - 3, 10);
      for (let k = 0; k < 16; k++) {
        const deg = k * 22.5, d = along(deg, o.heading);
        if (Math.abs(d) > HALF) continue;
        const x = mid + d;
        if (k % 4 === 0) {
          const ch = 'NESW'[k / 4];
          s.text(ch, x - Math.floor(measure(ch) / 2) + 1, 1, 'salt');
        } else if (k % 2 === 0) s.fill(x, 3, 1, 6, 'root.4');
        else s.fill(x, 5, 1, 2, 'root.4');
      }
      for (const m of o.marks ?? []) {
        const d = Math.max(-HALF + 3, Math.min(HALF - 3, along(m.deg, o.heading)));
        const x = mid + d - 3;
        if (m.kind === 'friend') s.map(HEADS[m.seat - 1], x - 1, 1);
        else s.map(COMPASS_MARKS[m.kind], x, 3);
      }
      s.unclip();
      s.fill(mid, 1, 2, 2, 'salt');
      s.fill(mid, 9, 2, 2, 'salt');
      const nw = o.night ? measure(o.night) + 8 : 0;
      if (o.place) s.text(cut(o.place, COMPASS_W - 2 - nw), 1, 13, 'salt', true);
      if (o.night) s.text(o.night, rightX(o.night, COMPASS_W - 2), 13, 'salt', true);
    },
  };
}

// ---- the readout of what is looked at (5.27)

export interface ReadoutOpts {
  /** The centre of the stage, and the top: the readout centres itself. */
  cx: number; y: number;
  icon: string;
  name: string;
  /** The second line: `root.4`, or `blood.lt` when it says why the thing cannot be taken. */
  line?: string;
  refusal?: boolean;
  /** With a refusal, the icon of the tool that would do, at the right end of the second line. */
  needs?: string;
  /** For a creature, its life as a thin strip as wide as the name. */
  life?: number;
}

export function readout(o: ReadoutOpts): Node {
  const nw = measure(o.name);
  const lw = o.line ? measure(o.line) : 0;
  const needs = o.refusal && o.needs ? o.needs : null;
  const w = Math.max(nw, lw + (needs ? 2 + 16 : 0)) + 28;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h: 24,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, 24);
      if (needs) s.icon(needs, 24 + lw + 2, 4);
      s.translate(3, 3);
      paintSlot(s, { ramp: 'dark', stack: { icon: o.icon, n: 1 } }, REST);
      s.translate(-3, -3);
      s.text(o.name, 24, 2, 'salt', true);
      if (o.life !== undefined) paintStrip(s, { x: 0, y: 0, w: nw, f: o.life, tones: ['blood.lt', 'blood', 'blood.dk'], segments: Math.max(1, Math.round(nw / 20)), thin: true }, 24, 14);
      else if (o.line) s.text(o.line, 24, 12, o.refusal ? 'blood.lt' : 'root.4', true);
    },
  };
}

// ---- name tag, ping (5.25)

export interface TagOpts {
  cx: number; y: number;
  name: string;
  /** A friend's seat, 1 to 8; a townsperson has none and so no flag and no life line. */
  seat?: number;
  life?: number;
  strict?: boolean;
}

/**
 * A player's life as it stands beside their name (5.24, 5.25): a strip 4 tall, a frame of root.0 round two rows of
 * fill, blood under a lit row of blood.lt, root.2 where it is spent, a segment line of root.0 every 8 units. It fills
 * from the left by whole units.
 */
export function paintLife(s: Surface, x: number, y: number, w: number, f: number): void {
  const inner = w - 2;
  s.fill(x, y, w, 4, 'root.0');
  s.fill(x + 1, y + 1, inner, 2, 'root.2');
  const n = Math.round(Math.min(1, Math.max(0, f)) * inner);
  if (n) { s.fill(x + 1, y + 1, n, 1, 'blood.lt'); s.fill(x + 1, y + 2, n, 1, 'blood'); }
  for (let k = 8; k < w - 1; k += 8) s.fill(x + k, y + 1, 1, 2, 'root.0');
}

/** The width of the life strip beside a name: five segments. */
export const LIFE_W = 41;

/** A name tag (5.25): the name on a strip of the chat wash, a flag in the player's colour, their life strip as wide under it. */
export function nameTag(o: TagOpts): Node {
  const w = measure(o.name) + 10;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h: o.seat ? 15 : 11,
    paint: (s) => {
      s.wash(0, 0, w, 11, 'root.0', 3);
      if (o.seat) s.fill(1, 2, 2, 7, SEATS[o.seat - 1]);
      s.text(o.name, 5, 0, 'salt', true);
      if (o.seat) paintLife(s, 0, 11, w, o.life ?? 1);
    },
  };
}

/** A ping (5.25), 9 by 6 in the colour of the player who set it, pointing down at the place, its distance under it. */
export function ping(o: { cx: number; y: number; seat: number; metres?: number }): Node {
  const t = o.metres !== undefined ? `${count(o.metres)} m` : '';
  const w = Math.max(9, measure(t) + 1), x = o.cx - Math.floor(w / 2), at = o.cx - 4 - x;
  return {
    x, y: o.y, w, h: t ? 17 : 6,
    paint: (s) => {
      s.draw(PING, at, 0, { tint: SEATS[o.seat - 1] });
      if (t) s.text(t, centreX(t, at, 9), 7, 'salt', true);
    },
  };
}

// ---- chat (5.23)

export interface ChatLine {
  /** A player's line: their seat and name; a line from the server or the world has none and is drawn in grey after the cairn. */
  seat?: number;
  from?: string;
  text: string;
}

export interface ChatOpts {
  x: number;
  /** The bottom of the newest line. */
  bottom: number;
  lines: ChatLine[];
  /** Open, twelve lines show; closed, eight. */
  open?: boolean;
  /** Where lines wrap: 141 on a wide stage, so that chat with its wash is 144 wide; less on a narrow one (5.23). */
  wrap?: number;
  /** The most lines that may show, fewer than the eight or twelve when the crew list stands above. */
  most?: number;
}

/** Where chat lines wrap on a wide stage: with the wash, chat is 144 wide and ends left of the hotbar's column. */
export const CHAT_WRAP = 141;

/** A wrapped line starts this far in, so that it is not read as a new speaker. */
export const CHAT_INDENT = 4;

/** `pad`: units added before the run, beyond the face's gap. */
interface Run { text: string; c: Colour; pad?: number }
interface Row { indent: number; runs: Run[] }

/** A chat line's rows, wrapped: the name in its colour, a colon in `root.4`, 3 units, the text in salt. */
function chatRows(l: ChatLine, at: number): Row[] {
  const more = (text: string, c: Colour): Row[] => wrap(text, at - CHAT_INDENT).map((w) => ({ indent: CHAT_INDENT, runs: [{ text: w.text, c }] }));
  if (!l.from) {
    // The world's own lines carry the cairn and no colon, in grey, so that none is read as a player's line gone wrong.
    const head = measure('{cairn}') + 2;
    const first = wrap(l.text, at - head);
    const rest = first.slice(1).map((w) => w.text).join(' ');
    return [{ indent: 0, runs: [{ text: '{cairn}', c: 'root.4' }, { text: first[0]?.text ?? '', c: 'root.4', pad: 2 - TEXT.gap }] }, ...(rest ? more(rest, 'root.4') : [])];
  }
  const head = measure(l.from) + 1 + measure(':') + 3;
  const first = wrap(l.text, at - head);
  const rows: Row[] = [{ indent: 0, runs: [{ text: l.from, c: SEATS[(l.seat ?? 8) - 1] }, { text: ':', c: 'root.4' }, { text: first[0]?.text ?? '', c: 'salt', pad: 3 - TEXT.gap }] }];
  const rest = first.slice(1).map((w) => w.text).join(' ');
  if (rest) rows.push(...more(rest, 'salt'));
  return rows;
}

function paintRuns(s: Surface, runs: Run[], x: number, y: number): number {
  let cx = x;
  runs.forEach((r, i) => {
    cx += r.pad ?? 0;
    cx += s.text(r.text, cx, y, r.c, true) + (i < runs.length - 1 ? TEXT.gap : 0);
  });
  return cx - x;
}

/**
 * Chat (5.23): lines 10 tall, newest lowest, all on one strip of the chat wash at three quarters, as wide as the column
 * (the wrap plus 3) whatever each line's length; the text starts 1 in, and a wrapped line's text 4 further. The wash is
 * strong enough that the server's lines read on a noon sky. The entry is not part of this: it stands at the bottom of the screen (6, Chat, open).
 */
export function chat(o: ChatOpts): Node {
  const at = o.wrap ?? CHAT_WRAP;
  // Whole lines only: a wrapped line's indented rows never show without the row that names its speaker.
  const most = Math.min(o.most ?? 99, o.open ? 12 : 8);
  const rows: Row[] = [];
  for (let i = o.lines.length - 1; i >= 0; i--) {
    const r = chatRows(o.lines[i], at);
    if (rows.length + r.length > most) break;
    rows.unshift(...r);
  }
  const h = rows.length * 10;
  return {
    x: o.x, y: o.bottom - h, w: at + 3, h,
    paint: (s) => {
      // One strip the column's width under every line, so that chat reads as one plate and not as highlighted text.
      if (h) s.wash(0, 0, at + 3, h, 'root.0', 3);
      rows.forEach((r, i) => { paintRuns(s, r.runs, r.indent + 1, i * 10); });
    },
  };
}

/** The chat entry (5.23), w by 14: a frame of root.3, a floor of root.0, the text's cell at 4, 2, the caret after it. */
export function paintEntry(s: Surface, w: number, text: string, caret = true): void {
  s.fill(0, 0, w, 14, 'root.3');
  s.fill(1, 1, w - 2, 12, 'root.0');
  const tw = s.text(cut(text, w - 10), 4, 2, 'salt', true);
  if (caret) s.fill(4 + tw + (tw ? 1 : 0), 2, 1, 10, 'salt');
}

// ---- roster and crew (5.24)

export interface Member {
  seat: number;
  name: string;
  life: number;
  place: string;
  level: number;
  /** Strides away; left out for oneself and for a friend in another place. */
  metres?: number;
  /** Bars of connection, 0 to 3. */
  bars: number;
}

/** The head of a player (art/heads.ts), 10 by 10 with its frame. */
function head(s: Surface, seat: number, x: number, y: number): void { s.map(HEADS[seat - 1], x, y); }

/** The roster (5.24), held open with Tab: a plain dark plate 312 wide, a header, rows 16 tall from y 18. */
export function roster(o: { cx: number; y: number; server: string; members: Member[]; seats?: number }): Node {
  const w = 312, h = 18 + o.members.length * 16 + 2;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, h);
      const of = `${o.members.length} of ${o.seats ?? 8}`;
      const ofX = rightX(of, w - 7);
      s.text(cut(o.server, ofX - 12), 6, 3, 'salt', true);
      s.text(of, ofX, 3, 'root.4', true);
      s.fill(1, 15, w - 3, 1, 'root.3');
      o.members.forEach((m, i) => {
        const y = 18 + i * 16;
        head(s, m.seat, 5, y);
        s.text(cut(m.name, 126), 18, y, 'salt', true);
        paintLife(s, 18, y + 11, LIFE_W, m.life);
        s.text(cut(m.place, 76), 148, y, 'root.4', true);
        const lv = String(m.level);
        s.text(lv, rightX(lv, 244), y, 'growth.lt', true);
        if (m.metres !== undefined) {
          const d = `${count(m.metres)} m`;
          s.text(d, rightX(d, 292), y, 'salt', true);
        }
        for (let b = 0; b < 3; b++) s.fill(298 + b * 3, y + 7 - b * 2, 2, 2 + b * 2, b < m.bars ? 'salt' : 'root.3');
      });
    },
  };
}

/** The pitch of the crew's rows: the name's cell 10, one clear unit under its descenders, the life strip 4. */
export const CREW_ROW = 15;

/** The width of the crew on the HUD folded to heads: a head 10 wide with a unit either side for its life strip. */
export const CREW_HEADS_W = 12;

/**
 * The crew at the top left of the HUD (5.24), folded: each friend's head 10 by 10 in a column 12 wide, their life a
 * strip 12 by 4 under it, rows 15 tall, no plate and no names; the names are on the roster, held open with Tab.
 */
export function crewHeads(o: { x: number; y: number; members: Member[] }): Node {
  return {
    x: o.x, y: o.y, w: CREW_HEADS_W, h: o.members.length * CREW_ROW,
    paint: (s) => o.members.forEach((m, i) => {
      const y = i * CREW_ROW;
      head(s, m.seat, 1, y);
      paintLife(s, 0, y + 10, CREW_HEADS_W, m.life);
    }),
  };
}

/** The crew at the top left of the HUD (5.24): the roster's head, name and life strip in rows 15 tall, no plate. */
export function crew(o: { x: number; y: number; members: Member[] }): Node {
  return {
    x: o.x, y: o.y, w: 92, h: o.members.length * CREW_ROW,
    paint: (s) => o.members.forEach((m, i) => {
      const y = i * CREW_ROW;
      head(s, m.seat, 0, y);
      s.text(cut(m.name, 80), 12, y, 'salt', true);
      paintLife(s, 12, y + 11, LIFE_W, m.life);
    }),
  };
}
