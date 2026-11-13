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
      s.clip(2, 2, COMPASS_W - 3, 9);
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
        if (m.kind === 'friend') s.draw(COMPASS_MARKS.friend, x, 3, { tint: SEATS[m.seat - 1] });
        else s.map(COMPASS_MARKS[m.kind], x, 3);
      }
      s.unclip();
      s.fill(mid, 1, 2, 2, 'salt');
      s.fill(mid, 9, 2, 2, 'salt');
      if (o.place) s.text(cut(o.place, 88, SMALL), 1, 15, 'salt', true, SMALL);
      if (o.night) s.text(o.night, rightX(o.night, COMPASS_W - 2, SMALL), 15, 'salt', true, SMALL);
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
  /** For a creature, its life as a thin strip as wide as the name. */
  life?: number;
}

export function readout(o: ReadoutOpts): Node {
  const nw = measure(o.name);
  const w = Math.max(nw, o.line ? measure(o.line) : 0) + 28;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h: 24,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, 24);
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

/** A name tag (5.25): the name on a strip of the chat wash, a flag in the player's colour, a line of their life. */
export function nameTag(o: TagOpts): Node {
  const w = measure(o.name) + 10;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h: o.seat ? 14 : 11,
    paint: (s) => {
      s.wash(0, 0, w, 11, 'root.0', 2);
      if (o.seat) s.fill(1, 2, 2, 7, SEATS[o.seat - 1]);
      s.text(o.name, 5, 0, 'salt', true);
      if (o.seat) {
        s.fill(0, 11, w, 3, 'root.0');
        const n = Math.round(Math.min(1, Math.max(0, o.life ?? 1)) * (w - 2));
        if (n) s.fill(1, 12, n, 1, 'blood');
      }
    },
  };
}

/** A ping (5.25), 9 by 6 in the colour of the player who set it, pointing down at the place, its distance under it. */
export function ping(o: { cx: number; y: number; seat: number; metres?: number }): Node {
  return {
    x: o.cx - 4, y: o.y, w: 9, h: 14,
    paint: (s) => {
      s.draw(PING, 0, 0, { tint: SEATS[o.seat - 1] });
      if (o.metres !== undefined) {
        const t = `${count(o.metres)}M`;
        s.text(t, centreX(t, 0, 9, SMALL), 8, 'salt', true, SMALL);
      }
    },
  };
}

// ---- chat (5.23)

export interface ChatLine {
  /** A player's line: their seat and name; a line from the server has none and is all `root.4`. */
  seat?: number;
  from?: string;
  text: string;
}

export interface ChatOpts {
  x: number;
  /** The bottom of the newest line. */
  bottom: number;
  lines: ChatLine[];
  open?: boolean;
  /** What is typed, when open. */
  entry?: string;
  caret?: boolean;
  ui?: Ui;
}

const CHAT_WRAP = 236;
const ENTRY_W = 240;

interface Run { text: string; c: Colour }

/** A chat line's runs, wrapped at 236: the name in its colour, a colon in `root.4`, 3 units, the text in salt. */
function chatRows(l: ChatLine): Run[][] {
  if (!l.from) return wrap(l.text, CHAT_WRAP).map((w) => [{ text: w.text, c: 'root.4' }]);
  const head = measure(l.from) + 1 + measure(':') + 3;
  const first = wrap(l.text, CHAT_WRAP - head);
  const rows: Run[][] = [[{ text: l.from, c: SEATS[(l.seat ?? 8) - 1] }, { text: ':', c: 'root.4' }, { text: first[0]?.text ?? '', c: 'salt' }]];
  const rest = first.slice(1).map((w) => w.text).join(' ');
  if (rest) for (const w of wrap(rest, CHAT_WRAP)) rows.push([{ text: w.text, c: 'salt' }]);
  return rows;
}

function paintRuns(s: Surface, runs: Run[], x: number, y: number): number {
  let cx = x;
  runs.forEach((r, i) => {
    if (i === 2) cx += 3 - TEXT.gap;
    cx += s.text(r.text, cx, y, r.c, true) + (i < runs.length - 1 ? TEXT.gap : 0);
  });
  return cx - x;
}

function runsWidth(runs: Run[]): number {
  return runs.reduce((w, r, i) => w + measure(r.text) + (i === 2 ? 3 : i > 0 ? TEXT.gap : 0), 0);
}

/**
 * Chat (5.23): lines 10 tall, newest lowest, each on a strip of the chat wash as wide as its text plus 4, the text 2 in.
 * Open, the entry stands 2 under them: 14 tall, floor `root.0`, a frame of `root.3`, its text at 4, 2.
 */
export function chat(o: ChatOpts): Node {
  const rows = o.lines.flatMap(chatRows).slice(-(o.open ? 12 : 8));
  const h = rows.length * 10 + (o.open ? 16 : 0);
  return {
    x: o.x, y: o.bottom - h, w: ENTRY_W, h,
    paint: (s) => {
      rows.forEach((r, i) => {
        const y = i * 10;
        s.wash(0, y, runsWidth(r) + 4, 10, 'root.0', 2);
        paintRuns(s, r, 2, y);
      });
      if (o.open) {
        const y = rows.length * 10 + 2;
        s.fill(0, y, ENTRY_W, 14, 'root.3');
        s.fill(1, y + 1, ENTRY_W - 2, 12, 'root.0');
        const tw = s.text(cut(o.entry ?? '', ENTRY_W - 10), 4, y + 2, 'salt', true);
        if (o.caret !== false) s.fill(4 + tw + (tw ? 1 : 0), y + 2, 1, 10, 'salt');
      }
    },
  };
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

/** The head of a player: the friend mark of the compass in their colour. */
function head(s: Surface, seat: number, x: number, y: number): void { s.draw(COMPASS_MARKS.friend, x, y, { tint: SEATS[seat - 1] }); }

/** The roster (5.24), held open with Tab: a plain dark plate 312 wide, a header, rows 13 tall from y 18. */
export function roster(o: { cx: number; y: number; server: string; members: Member[]; seats?: number }): Node {
  const w = 312, h = 18 + o.members.length * 13 + 3;
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
        const y = 18 + i * 13;
        head(s, m.seat, 6, y + 2);
        s.text(cut(m.name, 126), 16, y, 'salt', true);
        s.fill(16, y + 10, 100, 1, 'root.0');
        const n = Math.round(Math.min(1, Math.max(0, m.life)) * 100);
        if (n) s.fill(16, y + 10, n, 1, 'blood');
        s.text(cut(m.place, 90), 148, y, 'root.4', true);
        const lv = String(m.level);
        s.text(lv, rightX(lv, 262, SMALL), y + 3, 'growth.lt', true, SMALL);
        if (m.metres !== undefined) {
          const d = `${count(m.metres)}M`;
          s.text(d, rightX(d, 292, SMALL), y + 3, 'salt', true, SMALL);
        }
        for (let b = 0; b < 3; b++) s.fill(298 + b * 3, y + 7 - b * 2, 2, 2 + b * 2, b < m.bars ? 'salt' : 'root.3');
      });
    },
  };
}

/** The crew at the top left of the HUD (5.24): the roster's head, name and life line in rows 12 tall and 92 wide, no plate. */
export function crew(o: { x: number; y: number; members: Member[] }): Node {
  return {
    x: o.x, y: o.y, w: 92, h: o.members.length * 12,
    paint: (s) => o.members.forEach((m, i) => {
      const y = i * 12;
      head(s, m.seat, 0, y + 1);
      s.text(cut(m.name, 76), 10, y, 'salt', true);
      s.fill(10, y + 10, 76, 1, 'root.0');
      const n = Math.round(Math.min(1, Math.max(0, m.life)) * 76);
      if (n) s.fill(10, y + 10, n, 1, 'blood');
    }),
  };
}
