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
import { KEYCAP_H, keycap } from './keycap';
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
/** The clear units kept between a mark on the compass and a wind's letter. */
const WIND_CLEAR = 3;
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
    x: o.x, y: o.y, w: COMPASS_W, h: o.place ? 21 : 24,
    paint: (s) => {
      s.nine(PLATE, 0, 0, COMPASS_W, 12);
      const mid = 90;
      // A friend's head with its frame is 10 tall and lies over the plate's inner edges.
      s.clip(2, 1, COMPASS_W - 3, 10);
      const winds: [number, number][] = [];
      for (let k = 0; k < 16; k++) {
        const deg = k * 22.5, d = along(deg, o.heading);
        if (Math.abs(d) > HALF) continue;
        const x = mid + d;
        if (k % 4 === 0) {
          const ch = 'NESW'[k / 4], lx = x - Math.floor(measure(ch) / 2) + 1;
          s.text(ch, lx, 1, 'salt');
          winds.push([lx, lx + measure(ch) - 1]);
        } else if (k % 2 === 0) s.fill(x, 3, 1, 6, 'root.4');
        else s.fill(x, 5, 1, 2, 'root.4');
      }
      for (const m of o.marks ?? []) {
        const d = Math.max(-HALF + 3, Math.min(HALF - 3, along(m.deg, o.heading)));
        // A mark that would touch a wind's letter stands aside from it, 3 clear: a head against the N merged with it.
        const mw = m.kind === 'friend' ? 10 : 7;
        let left = mid + d - 3 - (m.kind === 'friend' ? 1 : 0);
        for (const [a, b] of winds) {
          if (left + mw - 1 < a - WIND_CLEAR || left > b + WIND_CLEAR) continue;
          left = left + mw / 2 < (a + b + 1) / 2 ? a - WIND_CLEAR - mw : b + WIND_CLEAR + 1;
        }
        if (m.kind === 'friend') s.map(HEADS[m.seat - 1], left, 1);
        else s.map(COMPASS_MARKS[m.kind], left, 3);
      }
      s.unclip();
      s.fill(mid, 1, 2, 2, 'salt');
      s.fill(mid, 9, 2, 2, 'salt');
      // Alone, the night is centred 2 under the strip, so that it reads as the compass's and not as the right end of
      // the readout under it; beside a place it stands at the right.
      const nw = o.night ? measure(o.night) + 8 : 0;
      if (o.place) s.text(cut(o.place, COMPASS_W - 2 - nw), 1, 13, 'salt', true);
      if (o.night && o.place) s.text(o.night, rightX(o.night, COMPASS_W - 2), 13, 'salt', true);
      else if (o.night) s.text(o.night, centreX(o.night, 0, COMPASS_W), 14, 'salt', true);
    },
  };
}

// ---- the readout of what is looked at (5.27)

export interface ReadoutOpts {
  /** The centre of the stage, and the top: the readout centres itself. */
  cx: number; y: number;
  icon: string;
  name: string;
  /** The second line: `root.4`, or as `refusal` and `able` say. */
  line?: string;
  /** The line says why the thing cannot be taken: `blood.lt` after a `{cross}`. */
  refusal?: boolean;
  /** The line says the tool in hand will do: `salt` after a `{check}` in `growth.lt`. */
  able?: boolean;
  /** For a creature, its life as a thin strip 41 wide in ten segments under the name. */
  life?: number;
  /** A creature that attacks: its name in `blood.lt` after a skull; a calm one's is in salt. */
  hostile?: boolean;
  /** What E does to the thing, as a third row of the plate: the key cap, then the word in salt. */
  use?: string;
}

/** The creature's life strip on the readout: ten segments of 3 and their lines inside an outline. */
export const READOUT_LIFE_W = 41;
const USE_Y = 23;

/**
 * The readout of what is looked at (5.27). Whether the tool in hand will break a block is told by a glyph as well as
 * by a colour, a check or a cross before the line, so that a yes in grey was not read as a line that does not matter.
 * What E does is a row of the same plate, so that the readout and its prompt are one notice and never two boxes.
 */
export function readout(o: ReadoutOpts): Node {
  const name = o.hostile ? `{skull} ${o.name}` : o.name;
  const nw = measure(name);
  const mark = o.refusal ? '{cross} ' : o.able ? '{check} ' : '';
  const lw = o.life !== undefined ? READOUT_LIFE_W : o.line ? measure(mark + o.line) : 0;
  const cap = o.use ? keycap({ x: 0, y: 0, label: 'E' }) : null;
  const uw = cap ? cap.w + 4 + measure(o.use!) : 0;
  const w = Math.max(nw, lw, uw) + 28;
  const h = cap ? USE_Y + KEYCAP_H + 3 : 24;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, h);
      s.translate(3, 3);
      paintSlot(s, { ramp: 'dark', stack: { icon: o.icon, n: 1 } }, REST);
      s.translate(-3, -3);
      s.text(name, 24, 2, o.hostile ? 'blood.lt' : 'salt', true);
      if (o.life !== undefined) paintStrip(s, { x: 0, y: 0, w: READOUT_LIFE_W, f: o.life, tones: ['blood.lt', 'blood', 'blood.dk'], segments: 10, thin: true }, 24, 14);
      else if (o.line && o.refusal) s.text(mark + o.line, 24, 12, 'blood.lt', true);
      else if (o.line && o.able) {
        s.text('{check}', 24, 12, 'growth.lt', true);
        s.text(o.line, 24 + measure(mark), 12, 'salt', true);
      } else if (o.line) s.text(o.line, 24, 12, 'root.4', true);
      if (cap) {
        s.translate(24, USE_Y);
        cap.paint!(s, REST);
        s.translate(-24, -USE_Y);
        s.text(o.use!, 24 + cap.w + 4, USE_Y + 2, 'salt', true);
      }
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
  /** A line of the world about a great feeder: its name leads, in blood.lt, and the rest is violet.lt after it. */
  boss?: string;
  text: string;
}

export interface ChatOpts {
  x: number;
  /** The bottom of the newest line. */
  bottom: number;
  lines: ChatLine[];
  /** Open, twelve lines show; closed, eight. */
  open?: boolean;
  /** Where lines wrap: the setting's width less 3, held clear of the prompt under the crosshair (5.23). */
  wrap?: number;
  /** The most lines that may show, fewer than the eight or twelve when the crew list stands above. */
  most?: number;
}

/** Where chat lines wrap at the setting Middle: with the wash, chat is 240 wide where the stage has room for it. */
export const CHAT_WRAP = 237;

/** A wrapped line starts this far in, so that it is not read as a new speaker. */
export const CHAT_INDENT = 8;

/** `pad`: units added before the run, beyond the face's gap. */
interface Run { text: string; c: Colour; pad?: number }
interface Row { indent: number; runs: Run[] }

/** After a speaker's colon one space of the face (4) and its gap: at 3 the name, colon and first word ran together. */
const AFTER_COLON = 5;

/** A chat line's rows, wrapped: the name in its colour, a colon in `root.4`, a space, the text in salt. */
function chatRows(l: ChatLine, at: number): Row[] {
  const more = (text: string, c: Colour): Row[] => wrap(text, at - CHAT_INDENT).map((w) => ({ indent: CHAT_INDENT, runs: [{ text: w.text, c }] }));
  if (l.boss) {
    // A great feeder's line is the world's, so it keeps the cairn, but its name leads in the boss strip's colour and
    // the line runs in violet, so that it is told from a crew line by its name and from the server's grey by both.
    const head = measure('{cairn}') + 2 + measure(l.boss) + 4 + TEXT.gap;
    const first = wrap(l.text, at - head);
    const rest = first.slice(1).map((w) => w.text).join(' ');
    return [{ indent: 0, runs: [
      { text: '{cairn}', c: 'root.4' },
      { text: l.boss, c: 'blood.lt', pad: 2 - TEXT.gap },
      { text: first[0]?.text ?? '', c: 'violet.lt', pad: 4 },
    ] }, ...(rest ? more(rest, 'violet.lt') : [])];
  }
  if (!l.from) {
    // The world's own lines carry the cairn and no colon, in grey, so that none is read as a player's line gone wrong.
    const head = measure('{cairn}') + 2;
    const first = wrap(l.text, at - head);
    const rest = first.slice(1).map((w) => w.text).join(' ');
    return [{ indent: 0, runs: [{ text: '{cairn}', c: 'root.4' }, { text: first[0]?.text ?? '', c: 'root.4', pad: 2 - TEXT.gap }] }, ...(rest ? more(rest, 'root.4') : [])];
  }
  const head = measure(l.from) + 1 + measure(':') + AFTER_COLON;
  const first = wrap(l.text, at - head);
  const rows: Row[] = [{ indent: 0, runs: [{ text: l.from, c: SEATS[(l.seat ?? 8) - 1] }, { text: ':', c: 'root.4' }, { text: first[0]?.text ?? '', c: 'salt', pad: AFTER_COLON - TEXT.gap }] }];
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
 * (the wrap plus 3) whatever each line's length; the text starts 1 in, and a wrapped line's text 8 further. The wash is
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
  /** The one who plays: "here" in the distance column. */
  self?: boolean;
  /** Holds a seat and is not on: listed last, the name grey, "away" in the distance column. */
  away?: boolean;
}

/** A skull of bone 7 by 7, lit from the top left: the face of a friend who has fallen, until they rise. */
const SKULL = ['.WLLLL.', 'WLLLLLS', 'LKKLKKS', 'LKKLKKS', 'SLLKLLS', '.SLSLS.', '.S.S.S.'];
const SKULL_TONES: Record<string, Colour> = { W: 'salt', L: 'clay.lt', S: 'clay.sh', K: 'root.0' };

/**
 * The head of a player (art/heads.ts), 10 by 10 with its frame. One who has fallen keeps the frame of their seat, and
 * their face gives way to the skull, so that a fall is told by a shape and not by an empty strip alone.
 */
function head(s: Surface, seat: number, x: number, y: number, fallen = false): void {
  s.map(HEADS[seat - 1], x, y);
  if (!fallen) return;
  s.fill(x + 1, y + 1, 8, 8, 'root.1');
  SKULL.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] !== '.') s.fill(x + 1 + i, y + 1 + j, 1, 1, SKULL_TONES[row[i]]); });
}

/** The pitch of the roster's rows, and where the first stands: under the header, its rule and the columns' names. */
const ROSTER_ROW = 16, ROSTER_TOP = 27;

/**
 * The roster (5.24), held open with Tab: a plain dark plate 304 wide, a header, the columns' names in the small face,
 * then a row 16 tall for every seat, the away last.
 */
export function roster(o: { cx: number; y: number; server: string; members: Member[]; seats?: number }): Node {
  // Columns 6 apart: name 110, place 70, level to 221, distance to 283 (wide enough for "other place"), then the
  // connection's cell of 9 by 7.
  const NAME = 18, PLACE = NAME + 110 + 6, LEVEL_R = PLACE + 70 + 6 + 11, DIST_R = LEVEL_R + 6 + 56, PING_X = DIST_R + 6;
  const members = [...o.members.filter((m) => !m.away), ...o.members.filter((m) => m.away)];
  const here = members.filter((m) => !m.away).length;
  const w = PING_X + 9 + 6, h = ROSTER_TOP + members.length * ROSTER_ROW + 2;
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, h);
      const of = `${here} of ${o.seats ?? 8}`;
      const ofX = rightX(of, w - 7);
      s.text(cut(o.server, ofX - 12), 6, 3, 'salt', true);
      s.text(of, ofX, 3, 'root.4', true);
      s.fill(1, 15, w - 3, 1, 'root.3');
      // The columns' names, so that a green 14 is read as a level and a word in the last column as how far.
      s.text('Where', PLACE, 18, 'root.4', true, SMALL);
      s.text('Lvl', rightX('Lvl', LEVEL_R, SMALL), 18, 'root.4', true, SMALL);
      s.text('Far', rightX('Far', DIST_R, SMALL), 18, 'root.4', true, SMALL);
      members.forEach((m, i) => {
        const y = ROSTER_TOP + i * ROSTER_ROW;
        const grey = m.away;
        head(s, m.seat, 5, y, m.life <= 0);
        s.text(cut(m.name, 110), NAME, y, grey ? 'root.4' : 'salt', true);
        if (!grey) paintLife(s, NAME, y + 11, LIFE_W, m.life);
        // The column is bare names, as "Yavas" is: "a Sealed Store" is written without its article.
        s.text(cut(m.place.replace(/^(a|an|the) /, ''), 70), PLACE, y, 'root.4', true);
        const lv = String(m.level);
        s.text(lv, rightX(lv, LEVEL_R), y, grey ? 'root.4' : 'growth.lt', true);
        // Every distance cell says something in words: a dash and a "?" were left unexplained.
        let far: string, c: Colour = 'root.4';
        if (m.away) far = 'away';
        else if (m.self) far = 'here';
        // With the link gone the last distance is stale, so it is not written beside the cross.
        else if (m.bars <= 0) far = 'lost';
        else if (m.metres !== undefined) { far = `${count(m.metres)} m`; c = 'salt'; }
        else far = 'other place';
        s.text(far, rightX(far, DIST_R), y, c, true);
        if (!grey) paintBars(s, PING_X, y + 1, m.bars);
      });
    },
  };
}

/**
 * The connection in a cell of 9 by 7: three bars 2 wide, 1 apart, 3, 5 and 7 tall. One bar is lit in blood; none is a
 * cross in blood, so that a lost connection is told by its mark and not only by grey bars.
 */
function paintBars(s: Surface, x: number, y: number, bars: number): void {
  if (bars <= 0) { s.text('{cross}', x + 2, y + 1, 'blood.lt', true); return; }
  for (let b = 0; b < 3; b++) {
    const bh = 3 + b * 2;
    s.fill(x + 1 + b * 3, y + 7 - bh, 2, bh, b < bars ? (bars === 1 ? 'blood.lt' : 'salt') : 'root.3');
  }
}

/** The pitch of the crew's rows: the name's cell 10, one clear unit under its descenders, the life strip 4. */
export const CREW_ROW = 15;

/** The width of the crew on the HUD folded to heads: a head 10 wide in its outline of root.0, and its life strip. */
export const CREW_HEADS_W = 12;

/** The pitch of the folded crew's rows: the outlined head 12, a clear unit, the life strip 4, a clear unit. */
export const CREW_HEADS_ROW = 18;

/**
 * The crew at the top left of the HUD (5.24), folded: each friend's head 10 by 10 inside an outline of root.0 that
 * follows its cut corners, in a column 12 wide; their life a strip 12 by 4 one clear unit under it; rows 18 tall, no
 * plate and no names; the names are on the roster, held open with Tab. With the seat's ring straight against the
 * sky, a pale ring vanished on a pale sky and the faces looked pasted on.
 */
export function crewHeads(o: { x: number; y: number; members: Member[] }): Node {
  return {
    x: o.x, y: o.y, w: CREW_HEADS_W, h: o.members.length * CREW_HEADS_ROW - 1,
    paint: (s) => o.members.forEach((m, i) => {
      const y = i * CREW_HEADS_ROW;
      s.fill(1, y, 10, 12, 'root.0');
      s.fill(0, y + 1, 12, 10, 'root.0');
      head(s, m.seat, 1, y + 1, m.life <= 0);
      paintLife(s, 0, y + 13, CREW_HEADS_W, m.life);
    }),
  };
}

/** The crew at the top left of the HUD (5.24): the roster's head, name and life strip in rows 15 tall, no plate. */
export function crew(o: { x: number; y: number; members: Member[] }): Node {
  return {
    x: o.x, y: o.y, w: 92, h: o.members.length * CREW_ROW,
    paint: (s) => o.members.forEach((m, i) => {
      const y = i * CREW_ROW;
      head(s, m.seat, 0, y, m.life <= 0);
      s.text(cut(m.name, 80), 12, y, 'salt', true);
      paintLife(s, 12, y + 11, LIFE_W, m.life);
    }),
  };
}
