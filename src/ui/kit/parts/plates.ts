import { HEADS } from '../art/heads';
import { COMPASS_MARKS, NIGHT_MARK, PING } from '../art/marks';
import { PLATE } from '../art/slab';
import { SMALL, TEXT } from '../font/face';
import { centreX, count, measure, rightX } from '../font/measure';
import { cut, wrap } from '../font/wrap';
import type { Node, Ui } from '../node';
import { type Colour, SEATS } from '../palette';
import type { Surface } from '../surface';
import { paintStrip } from './hud';
import { keycap } from './keycap';
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
  /** The night of the round and the nights in it, shown in the strip's right compartment. */
  night?: { n: number; of: number };
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

/** The night as every other count on this ground is written: "3 of 8", never with a slash. */
const nightText = (night: { n: number; of: number }) => `${night.n} of ${night.of}`;

/**
 * How far the night's compartment reaches past the strip: its outline, its light edge and a unit clear, the moon,
 * 3 clear, "3 of 8", 2 clear before the column it shares with the strip.
 */
export function nightW(night: { n: number; of: number }): number {
  return 3 + NIGHT_MARK.w + 3 + measure(nightText(night)) + 2;
}

/**
 * The compass strip (5.26): a plain dark plate 182 by 12 showing 138 degrees of the horizon. The four winds are
 * letters of salt with no shadow, the points between ticks of `root.4`, the heading two marks of salt at x 90. The
 * night stands in a compartment fastened to the strip's left end, sharing its outline column, so that the strip
 * stays centred on the crosshair and nothing stands between it and what hangs under it. `x` is the strip's left edge;
 * the compartment reaches left of it. On the right, "3 of 8" reached into the status frames on a stage 427 wide, and
 * "3/8" beside a moon read as a count of players.
 */
export function compass(o: CompassOpts): Node {
  const nw = o.night ? nightW(o.night) : 0;
  return {
    x: o.x - nw, y: o.y, w: COMPASS_W + nw, h: o.place ? 21 : 12,
    paint: (s) => {
      if (o.night) {
        s.nine(PLATE, 0, 0, nw + 1, 12);
        s.map(NIGHT_MARK, 3, 2);
        s.text(nightText(o.night), 3 + NIGHT_MARK.w + 3, 1, 'salt');
      }
      s.translate(nw, 0);
      s.nine(PLATE, 0, 0, COMPASS_W, 12);
      // The shared column is outline from top to foot; the two plates' left-out corners would notch it.
      if (o.night) s.fill(0, 0, 1, 12, 'root.0');
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
      if (o.place) s.text(cut(o.place, COMPASS_W - 2), 1, 13, 'salt', true);
      s.translate(-nw, 0);
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
/**
 * Every readout is one size, so that the eye finds it in the same place whatever it names: 132, the longest second
 * line of a block ("Needs a stone pick" after its cross, 102) with the slot and 4 clear. At 120 that line was cut.
 */
export const READOUT_W = 132;
export const READOUT_H = 26;
/** Where the text of both lines starts: 3 clear of the slot at 4, 4. */
const TEXT_X = 25;
/** The second line's cell; the key cap stands at y 10 so that its label's capitals sit on the line's. */
const LINE2_Y = 12;

/**
 * The readout of what is looked at (5.27): 132 by 26 always, the icon's slot at 4, 4, the name on the first line and
 * the second line under it, what E does at the second line's right as a key cap and its word. Whether the tool in hand
 * will break a block is told by a glyph as well as by a colour, a check or a cross before the line, so that a yes in
 * grey was not read as a line that does not matter.
 */
export function readout(o: ReadoutOpts): Node {
  const w = READOUT_W, h = READOUT_H;
  const cap = o.use ? keycap({ x: 0, y: 0, label: 'E' }) : null;
  const useW = o.use ? measure(o.use) : 0;
  // The cap and its word end 4 in from the right, as the slot stands 4 in from the left.
  const useX = w - 4 - useW;
  const capX = cap ? useX - 3 - cap.w : w - 4;
  const room = (cap ? capX - 4 : w - 4) - TEXT_X;
  const name = cut(o.hostile ? `{skull} ${o.name}` : o.name, (cap ? capX - 2 : w - 4) - TEXT_X);
  const mark = o.refusal ? '{cross} ' : o.able ? '{check} ' : '';
  const line = o.line ? cut(mark + o.line, room) : '';
  return {
    x: o.cx - Math.floor(w / 2), y: o.y, w, h,
    paint: (s) => {
      s.nine(PLATE, 0, 0, w, h);
      s.translate(4, 4);
      paintSlot(s, { ramp: 'dark', stack: { icon: o.icon, n: 1 } }, REST);
      s.translate(-4, -4);
      s.text(name, TEXT_X, 2, o.hostile ? 'blood.lt' : 'salt', true);
      if (o.life !== undefined) paintStrip(s, { x: 0, y: 0, w: READOUT_LIFE_W, f: o.life, tones: ['blood.lt', 'blood', 'blood.dk'], segments: 10, thin: true }, TEXT_X, 15);
      else if (line && o.refusal) s.text(line, TEXT_X, LINE2_Y, 'blood.lt', true);
      else if (line && o.able) {
        s.text('{check}', TEXT_X, LINE2_Y, 'growth.lt', true);
        s.text(line.slice(mark.length), TEXT_X + measure(mark), LINE2_Y, 'salt', true);
      } else if (line) s.text(line, TEXT_X, LINE2_Y, 'root.4', true);
      if (cap) {
        s.translate(capX, 10);
        cap.paint!(s, REST);
        s.translate(-capX, -10);
        s.text(o.use!, useX, LINE2_Y, 'salt', true);
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
const ROSTER_ROW = 16, ROSTER_TOP = 28;

/**
 * The roster (5.24), held open with Tab: a plain dark plate 304 wide, a header, the columns' names in grey,
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
      // The columns' names, so that a green 14 is read as a level and a word in the last column as how far: words in
      // the text face in sentence case. The small face has capitals only, and "WHERE  LVL  FAR" was the spaced
      // capitals of a web table's header.
      s.text('Where', PLACE, 17, 'root.4', true);
      s.text('Level', rightX('Level', LEVEL_R), 17, 'root.4', true);
      s.text('How far', rightX('How far', DIST_R), 17, 'root.4', true);
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

/** The pitch of the crew's rows: the name's cell 10, one clear unit under its descenders' shadow, the life strip 4. */
export const CREW_ROW = 15;

/** The name on the HUD's crew is cut here, with "…". */
const CREW_NAME_W = 48;

/** The life strip under a name on the HUD's crew: three segments. */
const CREW_LIFE_W = 25;

/** The width of the crew on the HUD: the outlined head 12, 2 clear, the name. */
export const CREW_W = 14 + CREW_NAME_W + 6;

/**
 * The crew at the top left of the HUD (5.24): one row 15 tall to each friend who holds a seat, with no plate: the head
 * 10 by 10 inside an outline of root.0 that follows its cut corners, the name 2 right of it in salt with its shadow,
 * cut at 48, and their life a strip 25 by 4 under the name. One who is away is listed last, the name in root.4 and no
 * strip. Folded to heads with no names, eight friends could be told apart only by a ring of colour 2 wide.
 */
export function crew(o: { x: number; y: number; members: Member[] }): Node {
  const rows = [...o.members.filter((m) => !m.away), ...o.members.filter((m) => m.away)];
  return {
    x: o.x, y: o.y, w: CREW_W, h: rows.length * CREW_ROW - 1,
    paint: (s) => rows.forEach((m, i) => {
      const y = i * CREW_ROW;
      s.fill(1, y, 10, 12, 'root.0');
      s.fill(0, y + 1, 12, 10, 'root.0');
      head(s, m.seat, 1, y + 1, m.life <= 0);
      s.text(cut(m.name, CREW_NAME_W), 14, y, m.away ? 'root.4' : 'salt', true);
      if (!m.away) paintLife(s, 14, y + 11, CREW_LIFE_W, m.life);
    }),
  };
}
