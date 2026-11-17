// The codex and bestiary (section 6, Codex and bestiary): what the crew has met, shared by everyone on the server. The
// left page is a grid of entries sunk in the page; the right tells the chosen one, step by step of what is known.
import { SLOT } from '../art/slot';
import { SMALL } from '../font/face';
import { centreX, measure, rightX } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { KeyEv, Live, Node, Screen } from '../node';
import { type Section as BookSection, BOOK_H, BOOK_TABS, BOOK_W, PAGE_BOTTOM, PAGE_TEXT, book, pageHeading } from '../parts/book';
import { ring, sunk } from '../parts/common';
import { centred } from '../scale';
import { CODEX, type Entry, type Section } from '../sample/codex';
import { THINGS } from '../sample/play-items';
import { PATTERNS, fits } from '../sample/play-patterns';
import type { Surface } from '../surface';
import { firstFocus, go, inkLine } from './books-common';
import type { NamedScreen } from './index';

export interface CodexView {
  sections: Section[];
  section: number;
  spread: number;
  chosen: number;
  onSection(i: number): void;
  onSpread(i: number): void;
  /** A page arrow that crosses into another section: to its spread `spread`. */
  onTurn(section: number, spread: number): void;
  onChoose(i: number): void;
  onClose(): void;
}

const SECTION_TABS: BookSection[] = [
  { id: 'cx.rb.creatures', name: 'Creatures', icon: 'creatures' },
  { id: 'cx.rb.matter', name: 'Matter', icon: 'matter' },
  { id: 'cx.rb.places', name: 'Places', icon: 'map' },
  { id: 'cx.rb.peoples', name: 'Peoples', icon: 'peoples' },
  { id: 'cx.rb.old', name: 'Old things', icon: 'old' },
];
const PW = 126, COLS = 7, CELLS = 49;
/** The picture well: a parchment hollow sunk in the page, the 16 by 16 picture in its middle. */
const WELL = 24;

/**
 * How a spread's entries stand: a short chapter (the eight, the old things) as a list of two columns, each row a slot
 * and the name beside it ("?" where not met), 20 a row; a longer one as a grid of seven. Eight slots in rows of four
 * left half the page bare parchment under a cramped block.
 */
const SHORT = 8;
const layoutFor = (n: number) => (n <= SHORT ? { cols: 2, dx: 63, dy: 20 } : { cols: COLS, dx: 18, dy: 18 });

/**
 * An entry slot sunk in the page (X3): the clay slot with a floor of `clay.sh`, `clay.face` under the pointer. A kind
 * not yet seen shows its flat mask in `clay.dk`, a hollow below the floor, as any missing thing in a slot is drawn
 * (5.4); in `clay.face` the mask stood lighter than the floor, near the page's own tone, and a known picture and an
 * unknown one differed by little more than the outline.
 */
function paintEntry(s: Surface, e: Entry | undefined, live: Live, chosen: boolean): void {
  s.nine(SLOT, 0, 0, 18, 18, 'clay');
  const hot = !!e && live.hover;
  s.fill(1, 1, 16, 16, hot ? 'clay.face' : 'clay.sh');
  if (!e) return;
  if (live.focus && !chosen) ring(s, 1, 1, 16, 16, 'salt');
  if (e.seen) s.icon(e.icon, 1, 1);
  else s.silhouette(e.icon, 1, 1, 'clay.dk', 'clay.dk');
}

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four'];

/**
 * The four steps (X9): a paragraph for each one known, cut at the page's foot, then, when any is not known, one line in
 * faded ink that says how many are left to learn. A rule for each step not known stood for nothing written: empty
 * lines on a form, ornament under the paragraphs.
 */
function steps(e: Entry, creature: boolean, top: number): Node {
  const H = PAGE_BOTTOM - PAGE_TEXT.top - top;
  return {
    x: 0, y: top, w: PW, h: H,
    paint: (s) => {
      let y = 0;
      const n = creature ? 4 : e.steps.length;
      let left = 0;
      for (let i = 0; i < n; i++) {
        const t = e.steps[i];
        if (!t) { left++; continue; }
        if (y + 10 > H) continue;
        const b = box(t, PW, Math.floor((H - y) / 10));
        for (const l of b.lines) s.text(l.text, 0, y + l.y, 'ink');
        y += b.h;
      }
      if (left && y + 4 + 10 <= H) s.text(cut(`${COUNT_WORDS[left]} more to learn`, PW), 0, y + (y ? 4 : 0), 'ink.faded');
    },
  };
}

/** Cells of a page's grid of things: seven to a line, two lines at most. */
const GRID_COLS = 7, GRID_LINES = 2;

/** How tall the grid of `n` things stands. */
const gridH = (n: number) => Math.min(GRID_LINES, Math.ceil(n / GRID_COLS)) * 18;

/**
 * Things on a page as a grid of slots with no gap, seven to a line and wrapping, each with its thing's name for a
 * tooltip. Past two lines the last cell says how many more in the small face ("+5") and names them in its tooltip. A
 * single row of seven filled the page's width and had nowhere to put an eighth.
 */
function slotGrid(y: number, keys: string[]): Node[] {
  const room = GRID_COLS * GRID_LINES;
  const over = keys.length > room;
  const shown = over ? keys.slice(0, room - 1) : keys;
  const cell = (i: number) => ({ x: (i % GRID_COLS) * 18, y: y + Math.floor(i / GRID_COLS) * 18, w: 18, h: 18, takes: true });
  const floor = (s: Surface, live: Live) => { s.nine(SLOT, 0, 0, 18, 18, 'clay'); s.fill(1, 1, 16, 16, live.hover ? 'clay.face' : 'clay.sh'); };
  const out: Node[] = shown.map((k, i) => {
    const t = THINGS.get(k);
    return {
      ...cell(i),
      tip: () => ({ lines: [{ text: t?.name ?? k, c: 'salt' as const }] }),
      paint: (s: Surface, live: Live) => { floor(s, live); if (t) s.icon(t.icon, 1, 1); },
    };
  });
  if (over) {
    const rest = keys.slice(room - 1);
    const label = `+${rest.length}`;
    out.push({
      ...cell(room - 1),
      tip: () => ({ lines: rest.slice(0, 8).map((k) => ({ text: THINGS.get(k)?.name ?? k, c: 'root.4' as const })).concat(rest.length > 8 ? [{ text: `and ${rest.length - 8} more`, c: 'root.4' }] : []) }),
      paint: (s: Surface, live: Live) => { floor(s, live); s.text(label, centreX(label, 1, 16, SMALL), 7, 'ink', false, SMALL); },
    });
  }
  return out;
}

/** The first thing that answers a pattern's want: `#planks` is shown as the oak's planks. */
const shown = (want: string) => (want[0] === '#' ? [...THINGS.keys()].find((k) => fits(want, k)) ?? want : want);

/** What a piece of matter goes into, and what it is made from (the first pattern that makes it), as keys. */
function uses(key: string): { into: string[]; from: string[] } {
  const into = PATTERNS.filter((p) => (p.in ?? []).some(([w]) => fits(w, key)) || Object.values(p.key ?? {}).some((w) => fits(w, key))).map((p) => p.out);
  const maker = PATTERNS.find((p) => p.out === key);
  const from = maker ? [...new Set([...(maker.in ?? []).map(([w]) => w), ...Object.values(maker.key ?? {})])].map(shown) : [];
  return { into: [...new Set(into)], from };
}

/** Whether the known steps, and the line of how many are left, fit whole from `top` to the page's foot. */
function roomFor(e: Entry, creature: boolean, top: number): boolean {
  const H = PAGE_BOTTOM - PAGE_TEXT.top - top;
  let y = 0, left = 0;
  const n = creature ? 4 : e.steps.length;
  for (let i = 0; i < n; i++) {
    const t = e.steps[i];
    if (!t) { left++; continue; }
    y += box(t, PW, 99).h;
  }
  if (left) y += (y ? 4 : 0) + 10;
  return y <= H;
}

/** The thing a creature leaves, found by the name its Drops fact gives, alone or after the creature's own name. */
function dropOf(e: Entry): string | null {
  const said = e.facts?.find((f) => f.label === 'Drops')?.text;
  if (!said) return null;
  for (const t of THINGS.values()) if (t.name === said || t.name === `${e.name} ${said}`) return t.key;
  return null;
}

/**
 * The right page (X5 to X9): the name, whose word it is under it on up to two lines, the picture well 24 square at the
 * left, sunk in the parchment, the facts in the column beside it (each a grey label and its value in ink), then for
 * matter what it goes into and what it is made from as rows of slots, and the steps at the page's full width to its foot.
 */
function rightPage(e: Entry | undefined, creature: boolean): Node[] {
  if (!e) return [];
  const kids: Node[] = [];
  const known = e.seen;
  kids.push(inkLine(0, 0, PW, known ? e.name : creature ? 'Not yet met' : 'Not yet found', known ? 'ink' : 'ink.faded'));
  let y = 12;
  if (known && e.word) {
    const b = box(e.word, PW, 2);
    kids.push({ x: 0, y: 10, w: PW, h: b.h, paint: (s) => { for (const l of b.lines) s.text(l.text, 0, l.y, 'ink.faded'); } });
    y = 10 + b.h + 2;
  }
  kids.push({
    x: 0, y, w: WELL, h: WELL,
    paint: (s) => {
      sunk(s, 0, 0, WELL, WELL, 'clay', 'clay.face');
      s.fill(0, 0, WELL - 1, 1, 'clay.dk'); s.fill(0, 1, 1, WELL - 2, 'clay.dk');
      if (known) s.icon(e.icon, 4, 4); else s.silhouette(e.icon, 4, 4, 'clay.sh', 'clay.sh');
    },
  });
  // What it leaves, when it is a thing of the world, is shown as that thing in a slot under the facts and not said
  // again among them: in words only, the lower half of the page stood bare.
  let drop = known ? dropOf(e) : null;
  // Only where the steps still fit whole under it: a slot that cut the last thing learned off cost more than it gave.
  if (drop && !roomFor(e, creature, (known && e.word ? 10 + box(e.word, PW, 2).h + 2 : 12) + WELL + 4 + 11 + 18 + 4)) drop = null;
  let fy = 0;
  if (known && e.facts) {
    const FX = WELL + 4, FW = PW - FX;
    for (const f of e.facts.filter((f) => !(drop && f.label === 'Drops')).slice(0, 3)) {
      if (fy + 10 > 30) break;
      const label = `${f.label}: `, lw = measure(label);
      const value = cut(f.text, FW - lw);
      const at = fy;
      kids.push({ x: FX, y: y + at, w: FW, h: 10, paint: (s) => { s.text(label, 0, 0, 'ink.faded'); s.text(value, lw, 0, f.c ?? 'ink'); } });
      fy += 10;
    }
  }
  y += Math.max(WELL, fy) + 4;
  // A kind not yet met keeps its picture as the silhouette and its page bare, but for one line from the world once
  // someone in the crew has seen it, so that the page says where to look.
  if (!known && e.hint) kids.push(inkLine(0, y, PW, e.hint, 'ink.faded'));
  if (drop) {
    kids.push(inkLine(0, y, PW, 'Drops', 'ink.faded'));
    y += 11;
    kids.push(...slotGrid(y, [drop]));
    y += 18 + 4;
  }
  if (known && e.uses) {
    const u = uses(e.key);
    const row = (title: string, keys: string[]) => {
      kids.push(inkLine(0, y, PW, keys.length ? title : `${title}: nothing yet`, 'ink.faded'));
      y += 11;
      if (keys.length) { kids.push(...slotGrid(y, keys)); y += gridH(keys.length) + 4; } else y += 3;
    };
    row('Used in', u.into);
    row('Made from', u.from);
  }
  if (known) kids.push(steps(e, creature, y));
  return kids;
}

export const codexScreen: Screen<CodexView> = (v, ui) => {
  const sec = v.sections[v.section];
  const sp = sec.spreads[v.spread];
  const creature = sec.key === 'creatures';
  const entries = sp.entries.slice(0, CELLS);
  firstFocus(ui, 'codex', null);
  const seen = entries.filter((e) => e.seen).length;
  const tally = `${seen} of ${entries.length}`;
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: sp.heading })];
  // How many are known stands at the heading's right, where it fits beside the heading with 6 to spare.
  if (measure(sp.heading) + 6 + measure(tally) <= PW) {
    left.push({ x: 0, y: 0, w: PW, h: 10, paint: (s) => { s.text(tally, rightX(tally, PW - 1), 0, 'ink.faded'); } });
  }
  // Only the cells the spread has are drawn, so a short chapter is a short list with its two lines under it.
  const L = layoutFor(entries.length), cols = L.cols;
  const rows = Math.max(1, Math.ceil(entries.length / cols));
  const listed = entries.length <= SHORT;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const name = e.seen ? cut(e.name, L.dx - 21 - 2) : '?';
    left.push({
      id: `cx.entry.${i}`, x: (i % cols) * L.dx, y: 14 + Math.floor(i / cols) * L.dy, w: listed ? L.dx - 2 : 18, h: 18,
      takes: true, focus: true,
      on: { down: () => v.onChoose(i) },
      tip: () => ({ lines: [{ text: e.seen ? e.name : creature ? 'Not yet met' : 'Not yet found', c: e.seen ? 'salt' : 'root.4' }] }),
      paint: (s, live) => {
        paintEntry(s, e, live, i === v.chosen);
        if (listed) s.text(name, 21, 4, e.seen ? 'ink' : 'ink.faded');
      },
    });
  }
  // The chosen cell: a frame of ember 2 deep standing a unit out of the cell, drawn over its neighbours' edges.
  if (v.chosen >= 0 && v.chosen < entries.length) {
    const cx = (v.chosen % cols) * L.dx, cy = 14 + Math.floor(v.chosen / cols) * L.dy;
    left.push({ x: cx - 1, y: cy - 1, w: 20, h: 20, paint: (s) => { ring(s, 0, 0, 20, 20, 'ember'); ring(s, 1, 1, 18, 18, 'ember'); } });
  }
  const blurb = box(sp.blurb, PW, 2);
  left.push({ x: 0, y: 14 + (rows - 1) * L.dy + 18 + 6, w: PW, h: blurb.h, paint: (s) => { for (const l of blurb.lines) s.text(l.text, 0, l.y, 'ink'); } });
  // Page numbers run on through the sections' spreads.
  let before = 0;
  for (let k = 0; k < v.section; k++) before += v.sections[k].spreads.length;
  const page = (before + v.spread) * 2 + 1;
  const at = centred(ui.w, ui.h, BOOK_W, BOOK_H);
  // The arrows lead on through the sections as the page numbers do: back from a section's first spread is the last
  // spread of the one before. Page 11 with no back arrow said there was nothing before it.
  const back = v.spread > 0 ? () => { ui.cue('page'); v.onSpread(v.spread - 1); }
    : v.section > 0 ? () => { ui.cue('page'); v.onTurn(v.section - 1, v.sections[v.section - 1].spreads.length - 1); } : undefined;
  const on = v.spread < sec.spreads.length - 1 ? () => { ui.cue('page'); v.onSpread(v.spread + 1); }
    : v.section < v.sections.length - 1 ? () => { ui.cue('page'); v.onTurn(v.section + 1, 0); } : undefined;
  const bk = book({
    id: 'cx.book', x: at.x, y: Math.max(at.y, BOOK_TABS + 3), sections: SECTION_TABS, chosen: v.section,
    onSection: (i) => { ui.cue('page'); v.onSection(i); },
    pages: [page, page + 1],
    prev: back, next: on,
    left, right: rightPage(entries[v.chosen], creature),
  });
  const move = (d: number) => {
    const j = Math.min(entries.length - 1, Math.max(0, v.chosen + d));
    v.onChoose(j);
    ui.focusOn(`cx.entry.${j}`, true);
  };
  return {
    id: 'codex', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [bk],
    on: {
      key: (e: KeyEv) => {
        if (e.key === 'Escape') { v.onClose(); return true; }
        if (e.key >= '1' && e.key <= '5') { v.onSection(Number(e.key) - 1); return true; }
        if (e.key === 'PageUp' && back) { back(); return true; }
        if (e.key === 'PageDown' && on) { on(); return true; }
        const d: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
        if (d[e.key] !== undefined) { move(d[e.key]); return true; }
      },
    },
  };
};

const firstSeen = (sec: Section, spread: number) => Math.max(0, sec.spreads[spread].entries.findIndex((e) => e.seen));

// The sample remembers where the book was shut, as the codex does.
const st = { section: 0, spread: 0, chosen: firstSeen(CODEX[0], 0) };

function sample(name: string, title: string, section: number, spread = 0, chosen?: number): NamedScreen {
  let first = true;
  return {
    name, title, world: true,
    build: (ui) => {
      if (first) { first = false; st.section = section; st.spread = spread; st.chosen = chosen ?? firstSeen(CODEX[section], spread); }
      return codexScreen({
        sections: CODEX, section: st.section, spread: st.spread, chosen: st.chosen,
        onSection: (i) => { st.section = i; st.spread = 0; st.chosen = firstSeen(CODEX[i], 0); ui.invalidate(); },
        onSpread: (i) => { st.spread = i; st.chosen = firstSeen(CODEX[st.section], i); ui.invalidate(); },
        onTurn: (sec, sp) => { st.section = sec; st.spread = sp; st.chosen = firstSeen(CODEX[sec], sp); ui.invalidate(); },
        onChoose: (i) => { st.chosen = i; ui.invalidate(); },
        onClose: () => go('hud'),
      }, ui);
    },
  };
}

export const SCREENS: NamedScreen[] = [
  sample('codex', 'Codex: creatures, Tama chosen', 0, 0, 11),
  sample('codex-unseen', 'Codex: a kind not yet met', 0, 0, 16),
  sample('codex-eight', 'Codex: the eight', 0, 1, 0),
  sample('codex-matter', 'Codex: matter', 1),
  sample('codex-old', 'Codex: old things', 4),
];
