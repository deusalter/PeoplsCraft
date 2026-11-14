// The journal (section 6, Journal): one book shared by the crew, with tabs for the Guide, bounties, standing and the
// crew. The Guide gives a chapter to the left page and the chosen step to the right.
import { AWAY_HEADS, HEADS, HEAD_SIZE } from '../art/heads';
import type { SilhouetteName } from '../art/silhouettes';
import { count, measure as measureInk } from '../font/measure';
import { box, cut as inkCut, wrap } from '../font/wrap';
import type { KeyEv, Node, Screen } from '../node';
import type { Colour } from '../palette';
import type { Surface } from '../surface';
import { type Section, BOOK_H, BOOK_TABS, BOOK_W, PAGE_TEXT, book, pageHeading } from '../parts/book';
import { button } from '../parts/button';
import { channel, segmentEdges } from '../parts/gauges';
import { paintSlot } from '../parts/slot';
import { centred } from '../scale';
import { CREW, type CrewMember } from '../sample/crew';
import { BOUNTIES, type Bounty, CHAPTERS, type Chapter, PEOPLES, PRESENT, type People } from '../sample/journal';
import { firstFocus, go, inkLine, para, pageRow, whereLine } from './books-common';
import type { NamedScreen } from './index';

export type JournalSection = 'guide' | 'bounties' | 'standing' | 'crew';

export interface JournalView {
  section: JournalSection;
  chapters: Chapter[];
  /** The page of the Guide that is open, and the step chosen on it. */
  chapter: number;
  step: number;
  present: { chapter: number; step: number; have: number };
  bounties: Bounty[];
  bounty: number;
  peoples: People[];
  crew: CrewMember[];
  member: number;
  /** One's own seat, to say "Leave" on a bounty one took. */
  seat: number;
  onSection(s: JournalSection): void;
  onPage(chapter: number): void;
  onChoose(i: number): void;
  onTake(b: Bounty): void;
  onClose(): void;
}

const SECTIONS: JournalSection[] = ['guide', 'bounties', 'standing', 'crew'];
const SECTION_TABS: Section[] = [
  { id: 'jr.rb.guide', name: 'Guide', icon: 'guide' },
  { id: 'jr.rb.bounties', name: 'Bounties', icon: 'bounty' },
  { id: 'jr.rb.standing', name: 'Standing', icon: 'standing' },
  { id: 'jr.rb.crew', name: 'Crew', icon: 'crew' },
];
const PW = 126;
/** The cell of the last line of what a step gives, on the right page: 12 above the page number's cell at the book's 163. */
const GIVES_LAST = 163 - 12 - PAGE_TEXT.top;
/** The mark column of the Guide's list: 8 wide, the step's words 2 past it. */
const MARK_W = 8;
const STEP_X = MARK_W + 2;
/** A step still to come once the one before it is done: a hollow box, 5 by 5, standing on the baseline. */
const OPEN_MARK = ['#####', '#...#', '#...#', '#...#', '#####'];
/** A step that cannot be begun yet: a lock, 5 by 5, a shackle over a body with its keyhole. */
const LOCK_MARK = ['.###.', '.#.#.', '#####', '##.##', '#####'];

function paintMark(g: Surface, rows: string[], x: number, c: Colour): void {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') g.fill(x + i, 3 + j, 1, 1, c); });
}
/** From one taker's row to the next on a bounty's page: a head 10 tall and a unit clear. */
const TAKER = 11;
/** The channel of what one carries toward a bounty, and the height of its row with the words over it. */
const CARRY_LEN = 80;
const CARRY_ROW = 22;

function guidePages(v: JournalView): { left: Node[]; right: Node[] } {
  const ch = v.chapters[v.chapter];
  const p = v.present;
  // The step after the present one, on this page or as the first of the next chapter.
  const lastOfPresent = p.step === v.chapters[p.chapter].steps.length - 1;
  const isNext = (i: number) => (v.chapter === p.chapter && i === p.step + 1) || (lastOfPresent && v.chapter === p.chapter + 1 && i === 0);
  const state = (i: number) => (v.chapter < p.chapter || (v.chapter === p.chapter && i < p.step) ? 'done' : v.chapter === p.chapter && i === p.step ? 'now' : isNext(i) ? 'next' : 'later');
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: ch.title })];
  let rowY = 14;
  ch.steps.forEach((st, i) => {
    const s = state(i);
    // A long step wraps onto a second line under its first words rather than being cut: the page has the room.
    const lines = wrap(st.title, PW - STEP_X - 1).slice(0, 2).map((l) => l.text);
    const chosen = i === v.step;
    const h = lines.length * 10;
    left.push(pageRow({
      id: `jr.step.${i}`, x: 0, y: rowY, w: PW, h, chosen, onChoose: () => v.onChoose(i),
      paint: (g) => {
        // Done, now, next and later differ by a mark in the 8 of the mark column and a tone together, never by the
        // tone alone: a check, the step's arrow, a hollow box for one that can be begun next, a lock for the rest.
        if (s === 'done') g.text('{check}', 0, 0, 'growth.dk');
        else if (s === 'now') g.text('{step}', 2, 0, 'ink');
        else if (s === 'next') paintMark(g, OPEN_MARK, 1, 'ink');
        else paintMark(g, LOCK_MARK, 1, 'ink.faded');
        const c = s === 'now' || s === 'next' ? 'ink' : 'ink.faded';
        lines.forEach((t, k) => g.text(t, STEP_X, k * 10, c));
      },
    }));
    rowY += h;
  });
  const st = ch.steps[v.step];
  const s = state(v.step);
  const right: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: inkCut(st.title, PW) })];
  right.push(para(0, 14, PW, st.hint, 'ink', st.need ? 5 : 6));
  if (st.need) {
    const have = s === 'done' ? st.need : s === 'now' ? p.have : 0;
    right.push(inkLine(0, 67, PW, `${count(have)} of ${count(st.need)}`, 'ink', true));
    right.push(channel({ x: 0, y: 78, len: PW, f: have / st.need, ramp: 'clay', segments: st.need <= 12 ? st.need : undefined }));
  }
  // Where to go is the line the crew acts on: it wraps onto a second line rather than being cut.
  let below = 94;
  if (st.where && s !== 'done') {
    const where = whereLine(0, 94, PW, st.where);
    right.push(where);
    below = 94 + where.h + 4;
  }
  // What the step gives stands at the page's foot, its last line 12 above the page number, so that it never hangs at a
  // height that depends on the lines above it; three lines at most, fewer when a long where-to comes down to it.
  if (st.gives) {
    const n = Math.min(3, box(st.gives, PW, 3).lines.length, Math.floor((GIVES_LAST + 10 - below) / 10));
    if (n > 0) right.push(para(0, GIVES_LAST - (n - 1) * 10, PW, st.gives, 'ink.faded', n));
  }
  return { left, right };
}

/**
 * What a bounty's row says under its task, in faded ink, so that a row is never told apart by colour alone: whether it
 * is open, or why it cannot be. A taken bounty is written by `takenBy`.
 */
function bountyState(b: Bounty, w: number): string {
  if (b.barred) return inkCut(b.why ?? 'not open yet', w);
  return 'open';
}

/**
 * "taken by", then who took it in words: "you" when one took it oneself, else the first taker's handle, then how many
 * more, "taken by Mira_K +2". With eight in a crew a row of faces did not say who held the bounty; the faces stand
 * with their names on the bounty's own page.
 */
function takenBy(g: Surface, b: Bounty, crew: CrewMember[], self: number, x: number, y: number, w: number): void {
  const mine = b.took.includes(self);
  const first = mine ? 'you' : crew.find((c) => c.seat === b.took[0])?.name ?? '';
  const more = b.took.length > 1 ? ` +${b.took.length - 1}` : '';
  const head = 'taken by ';
  const name = inkCut(first, w - measureInk(head) - measureInk(more) - (more ? 1 : 0));
  g.text(`${head}${name}${more}`, x, y, 'ink.faded');
}

function bountyPages(v: JournalView): { left: Node[]; right: Node[] } {
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: 'Bounties' })];
  v.bounties.forEach((b, i) => {
    // The task on the first line in ink; under it, in faded ink, how the bounty stands.
    const task = inkCut(b.task, PW - 22);
    const chosen = i === v.bounty;
    left.push(pageRow({
      id: `jr.bounty.${i}`, x: 0, y: 14 + i * 20, w: PW, h: 20, chosen, onChoose: () => v.onChoose(i),
      paint: (g, live) => {
        g.text(task, 21, 0, 'ink');
        if (b.took.length && !b.barred) takenBy(g, b, v.crew, v.seat, 21, 10, PW - 22); else g.text(bountyState(b, PW - 22), 21, 10, 'ink.faded');
        g.translate(0, 1);
        paintSlot(g, { ramp: 'clay', stack: { icon: b.icon, n: b.n } }, live);
        g.translate(0, -1);
      },
    }));
  });
  const b = v.bounties[v.bounty];
  const mine = b.took.includes(v.seat);
  // The telling runs as far down the page as the lines under it allow; the button keeps its place at the page's foot,
  // its bottom on the last row a page's text may reach, clear of the page number under it.
  const TAKE_Y = 134;
  const shown = b.took.length > 2 ? b.took.slice(0, 1) : b.took;
  // "Taken by" stands on the first taker's row, so a row of its own is not spent on it.
  const under = b.barred ? 20 : b.took.length ? shown.length * TAKER + (b.took.length > 2 ? 10 : 0) : 0;
  const carried = b.carry !== undefined && !b.barred;
  const carryH = carried ? CARRY_ROW : 0;
  const telling = para(0, 28, PW, b.telling, 'ink', Math.floor((TAKE_Y - 4 - under - (under ? 2 : 0) - 12 - carryH - 28) / 10));
  let y = 28 + telling.h + 2;
  const right: Node[] = [
    pageHeading({ x: 0, y: 0, w: PW, text: inkCut(b.task, PW) }),
    inkLine(0, 14, PW, `Asked by ${b.asker}`, 'ink.faded'),
    telling,
    inkLine(0, y, PW, b.pay ? `Pays {lees} ${count(b.pay)}` : 'Pays nothing in lees', 'ink'),
  ];
  y += 12;
  if (carried) {
    // How near the pack is to the ask: the count in words, then under it a channel 80 long on a row of its own, its
    // rim 2 under the words' descenders. Squeezed beside the words, 28 long, it touched them and said little.
    const have = Math.min(b.carry!, b.n);
    const words = `You carry ${count(b.carry!)} of ${count(b.n)}`;
    right.push(inkLine(0, y - 2, PW, words, have >= b.n ? 'growth.dk' : 'ink'));
    right.push(channel({ x: 0, y: y + 10, len: CARRY_LEN, f: have / b.n, ramp: 'clay', segments: b.n <= 12 && (CARRY_LEN - 2) >= b.n * 3 ? b.n : undefined }));
    y += CARRY_ROW;
  }
  if (b.barred) right.push(para(0, y, PW, b.barred, 'blood.dk', 2));
  else if (b.took.length) {
    // Each taker is their head in its seat's frame with the name beside it, the first on the row of "Taken by"; two
    // rows are left above the button, and a third taker and more are counted.
    const tx = measureInk('Taken by ') + 1;
    right.push(inkLine(0, y, tx, 'Taken by', 'ink.faded'));
    shown.forEach((seat, k) => {
      const m = v.crew.find((c) => c.seat === seat)!;
      const self = m.seat === v.seat;
      right.push({
        x: tx, y: y + k * TAKER, w: PW - tx, h: HEAD_SIZE,
        paint: (g) => {
          g.map(HEADS[m.seat - 1], 0, 0);
          g.text(inkCut(self ? `${m.name}, you` : m.name, PW - tx - 13), 13, 0, 'ink');
        },
      });
    });
    if (b.took.length > 2) right.push(inkLine(tx, y + TAKER, PW - tx, `and ${b.took.length - 1} more`, 'ink.faded'));
  }
  right.push(button({ id: 'jr.take', x: 0, y: TAKE_Y, w: 60, h: 14, label: mine ? 'Leave' : 'Take', ramp: 'clay', disabled: !!b.barred, onPress: () => v.onTake(b) }));
  return { left, right };
}

function peoplePage(p: People): Node[] {
  return [
    pageHeading({ x: 0, y: 0, w: PW, text: p.name }),
    para(0, 14, PW, p.holds, 'ink.faded', 2),
    inkLine(0, 38, PW, 'Standing'),
    inkLine(0, 38, PW, `${p.notch} of 5`, 'ink', true),
    channel({ x: 0, y: 49, len: PW, f: p.notch / 5, ramp: 'clay', segments: 5 }),
    {
      // The way toward the next notch, as a line of ember under the segment it will fill.
      x: 0, y: 57, w: PW, h: 1,
      paint: (g) => {
        if (p.notch >= 5 || p.toward <= 0) return;
        const e = segmentEdges(PW - 2, 5);
        const a = e[p.notch], seg = e[p.notch + 1] - 1 - a;
        g.fill(1 + a, 0, Math.max(1, Math.floor(p.toward * seg)), 1, 'ember');
      },
    },
    inkLine(0, 62, PW, 'Raised by'),
    para(0, 72, PW, p.rises, 'ink.faded', 2),
    inkLine(0, 96, PW, 'Lowered by'),
    para(0, 106, PW, p.falls, 'ink.faded', 2),
    inkLine(0, 130, PW, 'The next notch opens'),
    inkLine(0, 140, PW, p.opens, 'ink.faded'),
  ];
}

/** The crew list's columns: the mark of one's own row at 1, the head at 6, the name 3 past the head. */
const CREW_HEAD_X = 6;
const CREW_NAME_X = CREW_HEAD_X + HEAD_SIZE + 3;

const WORN_SLOTS: SilhouetteName[] = ['head', 'body', 'legs', 'trinket', 'trinket'];

function crewPages(v: JournalView): { left: Node[]; right: Node[] } {
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: 'Crew' }), inkLine(0, 0, PW - 2, 'Level', 'ink.faded', true)];
  v.crew.forEach((m, i) => {
    // Each player's head before the name, as on the roster. One who is away is a head in shade with "away" in place
    // of the level. One's own row keeps its level, which "you" in its place hid, and is marked by the step's arrow in
    // the column before the heads.
    const self = m.seat === v.seat;
    const right = m.online ? String(m.level) : 'away';
    const name = inkCut(m.name, PW - CREW_NAME_X - measureInk(right) - 4);
    left.push(pageRow({
      id: `jr.member.${i}`, x: 0, y: 14 + i * 12, w: PW, h: 12, chosen: i === v.member, onChoose: () => v.onChoose(i),
      paint: (g) => {
        if (self) g.text('{step}', 1, 1, 'ink');
        g.map((m.online ? HEADS : AWAY_HEADS)[m.seat - 1], CREW_HEAD_X, 1);
        g.text(right, PW - 2 - measureInk(right), 1, m.online ? 'ink' : 'ink.faded');
        g.text(name, CREW_NAME_X, 1, m.online ? 'ink' : 'ink.faded');
      },
    }));
  });
  const m = v.crew[v.member];
  const dist = m.at ? Math.round(Math.hypot(m.at[0], m.at[1])) : 0;
  // Their face beside who and where they are, what they wear as five slots, and the bounties they took as rows of a
  // slot and two lines, as the bounty page lists them.
  const right: Node[] = [
    pageHeading({ x: 0, y: 0, w: PW, text: inkCut(m.name, PW) }),
    { x: 0, y: 14, w: HEAD_SIZE, h: HEAD_SIZE, paint: (g) => g.map((m.online ? HEADS : AWAY_HEADS)[m.seat - 1], 0, 0) },
    inkLine(14, 14, PW - 14, `Level ${m.level}, ${m.job}`),
    inkLine(14, 24, PW - 14, m.online ? `In ${m.place}` : 'Not here now', m.online ? 'ink' : 'ink.faded'),
  ];
  if (m.seat !== v.seat && m.online && m.at) right.push(whereLine(14, 34, PW - 14, `${count(dist)} m from you`, 1));
  right.push(inkLine(0, 48, PW, 'Worn'));
  WORN_SLOTS.forEach((sil, k) => {
    const icon = m.worn[k];
    right.push({ x: k * 18, y: 58, w: 18, h: 18, paint: (g, live) => paintSlot(g, { ramp: 'clay', stack: icon ? { icon, n: 1 } : null, silhouette: sil }, live) });
  });
  right.push(inkLine(0, 82, PW, 'Bounties taken'));
  const taken = v.bounties.filter((b) => b.took.includes(m.seat));
  if (!taken.length) right.push(inkLine(0, 92, PW, 'None', 'ink.faded'));
  taken.slice(0, 3).forEach((b, k) => right.push({
    x: 0, y: 92 + k * 20, w: PW, h: 18,
    paint: (g, live) => {
      paintSlot(g, { ramp: 'clay', stack: { icon: b.icon, n: b.n } }, live);
      g.text(inkCut(b.task, PW - 22), 21, 0, 'ink');
      g.text(inkCut(`for ${b.asker}`, PW - 22), 21, 9, 'ink.faded');
    },
  }));
  return { left, right };
}

export const journalScreen: Screen<JournalView> = (v, ui) => {
  const si = SECTIONS.indexOf(v.section);
  const rowsOf = v.section === 'guide' ? v.chapters[v.chapter].steps.length : v.section === 'bounties' ? v.bounties.length : v.section === 'crew' ? v.crew.length : 0;
  const chosen = v.section === 'guide' ? v.step : v.section === 'bounties' ? v.bounty : v.member;
  const rowId = (i: number) => `jr.${v.section === 'guide' ? 'step' : v.section === 'bounties' ? 'bounty' : 'member'}.${i}`;
  firstFocus(ui, 'journal', null);
  const pages = v.section === 'guide' ? guidePages(v) : v.section === 'bounties' ? bountyPages(v) : v.section === 'crew' ? crewPages(v) : { left: peoplePage(v.peoples[0]), right: peoplePage(v.peoples[1]) };
  const guide = v.section === 'guide';
  const at = centred(ui.w, ui.h, BOOK_W, BOOK_H);
  const bk = book({
    id: 'jr.book', x: at.x, y: Math.max(at.y, BOOK_TABS + 3), sections: SECTION_TABS, chosen: si,
    onSection: (i) => { ui.cue('page'); v.onSection(SECTIONS[i]); },
    // One book: the Guide's chapters are its first leaves, then a spread each for bounties, standing and the crew.
    pages: guide ? [v.chapter * 2 + 1, v.chapter * 2 + 2] : [v.chapters.length * 2 + si * 2 - 1, v.chapters.length * 2 + si * 2],
    prev: guide && v.chapter > 0 ? () => { ui.cue('page'); v.onPage(v.chapter - 1); } : undefined,
    next: guide && v.chapter < v.chapters.length - 1 ? () => { ui.cue('page'); v.onPage(v.chapter + 1); } : undefined,
    left: pages.left, right: pages.right,
  });
  return {
    id: 'journal', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [bk],
    on: {
      key: (e: KeyEv) => {
        if (e.key === 'Escape' || e.key === 'g' || e.key === 'G') { v.onClose(); return true; }
        if (e.key >= '1' && e.key <= '4') { v.onSection(SECTIONS[Number(e.key) - 1]); return true; }
        if (guide && e.key === 'ArrowLeft' && v.chapter > 0) { v.onPage(v.chapter - 1); return true; }
        if (guide && e.key === 'ArrowRight' && v.chapter < v.chapters.length - 1) { v.onPage(v.chapter + 1); return true; }
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (d && rowsOf) {
          const j = Math.min(rowsOf - 1, Math.max(0, chosen + d));
          v.onChoose(j);
          ui.focusOn(rowId(j), true);
          return true;
        }
        if (e.key === 'Enter' && v.section === 'bounties') { const b = v.bounties[v.bounty]; if (!b.barred) v.onTake(b); return true; }
      },
    },
  };
};

// Each sample keeps its open page, the choices and who took what for as long as the page is open.
function sample(name: string, title: string, section: JournalSection, present = PRESENT): NamedScreen {
  let sec = section;
  const st = {
    chapter: present.chapter, step: present.step, bounty: 0, member: 0,
    bounties: BOUNTIES.map((b) => ({ ...b, took: [...b.took] })),
  };
  return {
    name, title, world: true,
    build: (ui) => journalScreen({
      section: sec, chapters: CHAPTERS, chapter: st.chapter, step: st.step, present,
      bounties: st.bounties, bounty: st.bounty, peoples: PEOPLES, crew: CREW, member: st.member, seat: 1,
      onSection: (s) => { sec = s; ui.invalidate(); },
      onPage: (c) => { st.chapter = c; st.step = c === present.chapter ? present.step : 0; ui.invalidate(); },
      onChoose: (i) => {
        if (sec === 'guide') st.step = i; else if (sec === 'bounties') st.bounty = i; else if (sec === 'crew') st.member = i;
        ui.invalidate();
      },
      onTake: (b) => { const k = b.took.indexOf(1); if (k >= 0) b.took.splice(k, 1); else b.took.unshift(1); ui.cue('press'); ui.invalidate(); },
      onClose: () => go('hud'),
    }, ui),
  };
}

export const SCREENS: NamedScreen[] = [
  sample('journal', 'Journal: the Guide', 'guide'),
  sample('journal-later', 'Journal: the Guide further on, steps done, present, next and later', 'guide', { chapter: 1, step: 3, have: 0 }),
  sample('journal-bounties', 'Journal: bounties', 'bounties'),
  sample('journal-standing', 'Journal: standing', 'standing'),
  sample('journal-crew', 'Journal: the crew', 'crew'),
];
