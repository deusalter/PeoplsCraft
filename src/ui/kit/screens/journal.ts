// The journal (section 6, Journal): one book shared by the crew, with ribbons for the Guide, bounties, standing and the
// crew. The Guide gives a chapter to the left page and the chosen step to the right.
import { HEADS } from '../art/heads';
import { count, measure as measureInk } from '../font/measure';
import { cut as inkCut } from '../font/wrap';
import type { KeyEv, Node, Screen } from '../node';
import { SEATS } from '../palette';
import { type Ribbon, BOOK_H, BOOK_TABS, BOOK_W, book, pageHeading } from '../parts/book';
import { button } from '../parts/button';
import { channel } from '../parts/gauges';
import { paintSlot } from '../parts/slot';
import { centred } from '../scale';
import { CREW, type CrewMember } from '../sample/crew';
import { BOUNTIES, type Bounty, CHAPTERS, type Chapter, PEOPLES, PRESENT, type People } from '../sample/journal';
import { firstFocus, flag, go, inkLine, para, pageRow } from './books-common';
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
const RIBBONS: Ribbon[] = [
  { id: 'jr.rb.guide', colour: 'blood', dark: 'blood.dk', name: 'Guide', icon: 'guide' },
  { id: 'jr.rb.bounties', colour: 'arm', dark: 'arm.dk', name: 'Bounties', icon: 'bounty' },
  { id: 'jr.rb.standing', colour: 'growth', dark: 'growth.dk', name: 'Standing', icon: 'standing' },
  { id: 'jr.rb.crew', colour: 'ember', dark: 'ember.dk', name: 'Crew', icon: 'crew' },
];
const PW = 126;

function guidePages(v: JournalView): { left: Node[]; right: Node[] } {
  const ch = v.chapters[v.chapter];
  const p = v.present;
  const state = (i: number) => (v.chapter < p.chapter || (v.chapter === p.chapter && i < p.step) ? 'done' : v.chapter === p.chapter && i === p.step ? 'now' : 'later');
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: ch.title })];
  ch.steps.forEach((st, i) => {
    const s = state(i);
    const title = inkCut(st.title, PW - 11);
    const chosen = i === v.step;
    left.push(pageRow({
      id: `jr.step.${i}`, x: 0, y: 14 + i * 10, w: PW, h: 10, chosen, under: { x: 10, y: 9, w: measureInk(title) }, onChoose: () => v.onChoose(i),
      paint: (g) => {
        if (s === 'done') g.text('{check}', 1, 0, 'ink.faded');
        if (s === 'now') g.text('{step}', 3, 0, 'ink');
        g.text(title, 10, 0, s === 'now' || chosen ? 'ink' : 'ink.faded');
      },
    }));
  });
  const st = ch.steps[v.step];
  const s = state(v.step);
  const right: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: inkCut(st.title, PW) })];
  right.push(para(0, 14, PW, st.hint, 'ink', st.need ? 5 : 6));
  if (st.need) {
    const have = s === 'done' ? st.need : s === 'now' ? p.have : 0;
    right.push(inkLine(0, 67, PW, `${count(have)} of ${count(st.need)}`, 'ink', true));
    right.push(channel({ x: 0, y: 78, len: PW, f: have / st.need, ramp: 'clay' }));
  }
  // Where to go is the line the crew acts on: it wraps onto a second line rather than being cut, and what the step
  // gives moves down under it, keeping clear of the page's foot.
  let below = 108;
  if (st.where && s !== 'done') {
    const where = para(0, 94, PW, st.where, 'arm.dk', 2);
    right.push(where);
    below = 94 + where.h + 4;
  }
  if (st.gives) right.push(para(0, below, PW, st.gives, 'ink.faded', below > 108 ? 2 : 3));
  return { left, right };
}

function heads(g: Parameters<NonNullable<Node['paint']>>[0], seats: number[], right: number, y: number): void {
  seats.forEach((seat, k) => g.map(HEADS[seat - 1], right - 9 - k * 11, y));
}

function bountyPages(v: JournalView): { left: Node[]; right: Node[] } {
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: 'Bounties' })];
  v.bounties.forEach((b, i) => {
    // The asker has the first line to itself; the takers' heads stand at the right end of the task's line.
    const task = inkCut(b.task, b.took.length ? PW - 12 - (b.took.length - 1) * 11 - 21 : PW - 22);
    const chosen = i === v.bounty;
    left.push(pageRow({
      id: `jr.bounty.${i}`, x: 0, y: 14 + i * 20, w: PW, h: 20, chosen, under: { x: 21, y: 19, w: measureInk(task) }, onChoose: () => v.onChoose(i),
      paint: (g, live) => {
        g.text(inkCut(b.asker, PW - 22), 21, 1, b.barred ? 'ink.faded' : 'ink');
        g.text(task, 21, 10, chosen ? 'ink' : 'ink.faded');
        heads(g, b.took, PW - 1, 10);
        g.translate(0, 1);
        paintSlot(g, { ramp: 'clay', stack: { icon: b.icon, n: b.n } }, live);
        g.translate(0, -1);
      },
    }));
  });
  const b = v.bounties[v.bounty];
  const mine = b.took.includes(v.seat);
  // The telling runs as far down the page as the lines under it allow; the button keeps its place at the page's foot.
  const TAKE_Y = 140;
  const shown = b.took.length > 2 ? b.took.slice(0, 1) : b.took;
  const under = b.barred ? 20 : b.took.length ? 10 + shown.length * 10 + (b.took.length > 2 ? 10 : 0) : 0;
  const telling = para(0, 28, PW, b.telling, 'ink', Math.floor((TAKE_Y - 4 - under - (under ? 2 : 0) - 12 - 28) / 10));
  let y = 28 + telling.h + 2;
  const right: Node[] = [
    pageHeading({ x: 0, y: 0, w: PW, text: inkCut(b.task, PW) }),
    inkLine(0, 14, PW, `Asked by ${b.asker}`, 'ink.faded'),
    telling,
    inkLine(0, y, PW, b.pay ? `Pays {lees} ${count(b.pay)}` : 'Pays nothing in lees', 'ink'),
  ];
  y += 12;
  if (b.barred) right.push(para(0, y, PW, b.barred, 'blood.dk', 2));
  else if (b.took.length) {
    right.push(inkLine(0, y, PW, 'Taken by', 'ink.faded'));
    // Two lines are left above the button: a third taker and more are counted.
    shown.forEach((seat, k) => {
      const m = v.crew.find((c) => c.seat === seat)!;
      right.push({ x: 0, y: y + 10 + k * 10, w: PW, h: 10, paint: (g) => { flag(g, m.seat, 0, 1); g.text(inkCut(m.name, PW - 5), 5, 0, 'ink'); } });
    });
    if (b.took.length > 2) right.push(inkLine(0, y + 20, PW, `and ${b.took.length - 1} more of the crew`, 'ink.faded'));
  }
  right.push(button({ id: 'jr.take', x: 0, y: TAKE_Y, w: 60, h: 14, label: mine ? 'Leave' : 'Take', disabled: !!b.barred, onPress: () => v.onTake(b) }));
  return { left, right };
}

function peoplePage(p: People): Node[] {
  return [
    pageHeading({ x: 0, y: 0, w: PW, text: p.name }),
    para(0, 14, PW, p.holds, 'ink.faded', 2),
    inkLine(0, 38, PW, 'Standing'),
    inkLine(0, 38, PW, `${p.notch} of 5`, 'ink', true),
    {
      x: 0, y: 49, w: PW, h: 7,
      paint: (g, live) => {
        channel({ x: 0, y: 0, len: PW, f: (p.notch + p.toward) / 5, ramp: 'clay' }).paint!(g, live);
        // The five notches: a cut of the rim's dark tone across the channel at each fifth.
        for (let k = 1; k < 5; k++) g.fill(Math.round((k * (PW - 2)) / 5), 1, 1, 5, 'clay.pit');
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

function crewPages(v: JournalView): { left: Node[]; right: Node[] } {
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: 'Crew' })];
  v.crew.forEach((m, i) => {
    const name = inkCut(m.name, PW - 32);
    left.push(pageRow({
      id: `jr.member.${i}`, x: 0, y: 14 + i * 12, w: PW, h: 12, chosen: i === v.member, under: { x: 6, y: 10, w: measureInk(name) }, onChoose: () => v.onChoose(i),
      paint: (g) => {
        flag(g, m.seat, 1, 2);
        const lv = String(m.level);
        g.text(lv, PW - 2 - measureInk(lv), 1, m.online ? 'ink' : 'ink.faded');
        g.text(name, 6, 1, m.online ? 'ink' : 'ink.faded');
      },
    }));
  });
  const m = v.crew[v.member];
  const dist = m.at ? Math.round(Math.hypot(m.at[0], m.at[1])) : 0;
  const right: Node[] = [
    pageHeading({ x: 0, y: 0, w: PW, text: inkCut(m.name, PW) }),
    inkLine(0, 14, PW, `Level ${m.level}, ${m.job}`),
    inkLine(0, 26, PW, m.online ? `In ${m.place}` : 'Not here now', m.online ? 'ink' : 'ink.faded'),
  ];
  if (m.online && m.at) right.push(inkLine(0, 38, PW, `${count(dist)} strides from you`, 'arm.dk'));
  if (m.seat === v.seat) right.push(inkLine(0, 38, PW, 'You', 'ink.faded'));
  right.push(inkLine(0, 56, PW, 'Bounties taken'));
  const taken = v.bounties.filter((b) => b.took.includes(m.seat));
  if (!taken.length) right.push(inkLine(0, 66, PW, 'None', 'ink.faded'));
  taken.slice(0, 4).forEach((b, k) => right.push(inkLine(0, 66 + k * 10, PW, `${b.task} for ${b.asker}`, 'ink.faded')));
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
    id: 'jr.book', x: at.x, y: Math.max(at.y, BOOK_TABS + 3), ribbons: RIBBONS, chosen: si,
    onRibbon: (i) => { ui.cue('page'); v.onSection(SECTIONS[i]); },
    pages: guide ? [v.chapter * 2 + 1, v.chapter * 2 + 2] : undefined,
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

// The sample keeps the open page, the choices and who took what for as long as the page is open.
const st = {
  chapter: PRESENT.chapter, step: PRESENT.step, bounty: 0, member: 0,
  bounties: BOUNTIES.map((b) => ({ ...b, took: [...b.took] })),
};

function sample(name: string, title: string, section: JournalSection): NamedScreen {
  let sec = section;
  return {
    name, title, world: true,
    build: (ui) => journalScreen({
      section: sec, chapters: CHAPTERS, chapter: st.chapter, step: st.step, present: PRESENT,
      bounties: st.bounties, bounty: st.bounty, peoples: PEOPLES, crew: CREW, member: st.member, seat: 1,
      onSection: (s) => { sec = s; ui.invalidate(); },
      onPage: (c) => { st.chapter = c; st.step = c === PRESENT.chapter ? PRESENT.step : 0; ui.invalidate(); },
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
  sample('journal-bounties', 'Journal: bounties', 'bounties'),
  sample('journal-standing', 'Journal: standing', 'standing'),
  sample('journal-crew', 'Journal: the crew', 'crew'),
];
