// The codex and bestiary (section 6, Codex and bestiary): what the crew has met, shared by everyone on the server. The
// left page is a grid of entries sunk in the page; the right tells the chosen one, step by step of what is known.
import { SLOT } from '../art/slot';
import { measure, rightX } from '../font/measure';
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

/** Columns of a spread's grid: a short chapter (the eight) stands in rows of four, so that no empty cell promises more. */
const colsFor = (n: number) => (n <= 8 ? 4 : COLS);

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

/** The four steps (X9): a paragraph for each one known, one rule of `clay.sh` for each one not, cut at the page's foot. */
function steps(e: Entry, creature: boolean, top: number): Node {
  const H = PAGE_BOTTOM - PAGE_TEXT.top - top;
  return {
    x: 0, y: top, w: PW, h: H,
    paint: (s) => {
      let y = 0;
      const n = creature ? 4 : Math.max(1, e.steps.length);
      for (let i = 0; i < n && y + 10 <= H; i++) {
        const t = e.steps[i];
        if (!t) { s.fill(0, y + 5, PW, 1, 'clay.sh'); y += 10; continue; }
        const b = box(t, PW, Math.floor((H - y) / 10));
        for (const l of b.lines) s.text(l.text, 0, y + l.y, 'ink');
        y += b.h;
      }
    },
  };
}

/** A row of slots on a page, each with its thing's name for a tooltip; at most seven fit the page. */
function slotRow(y: number, keys: string[]): Node[] {
  return keys.slice(0, 7).map((k, i) => {
    const t = THINGS.get(k);
    return {
      x: i * 18, y, w: 18, h: 18, takes: true,
      tip: () => ({ lines: [{ text: t?.name ?? k, c: 'salt' as const }] }),
      paint: (s: Surface, live: Live) => {
        s.nine(SLOT, 0, 0, 18, 18, 'clay');
        s.fill(1, 1, 16, 16, live.hover ? 'clay.face' : 'clay.sh');
        if (t) s.icon(t.icon, 1, 1);
      },
    };
  });
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
  let fy = 0;
  if (known && e.facts) {
    const FX = WELL + 4, FW = PW - FX;
    for (const f of e.facts.slice(0, 3)) {
      if (fy + 10 > 30) break;
      const label = `${f.label}: `, lw = measure(label);
      const value = cut(f.text, FW - lw);
      const at = fy;
      kids.push({ x: FX, y: y + at, w: FW, h: 10, paint: (s) => { s.text(label, 0, 0, 'ink.faded'); s.text(value, lw, 0, f.c ?? 'ink'); } });
      fy += 10;
    }
  }
  y += Math.max(WELL, fy) + 4;
  if (known && e.uses) {
    const u = uses(e.key);
    const row = (title: string, keys: string[]) => {
      kids.push(inkLine(0, y, PW, keys.length ? title : `${title}: nothing yet`, 'ink.faded'));
      y += 11;
      if (keys.length) { kids.push(...slotRow(y, keys)); y += 22; } else y += 3;
    };
    row('Used in', u.into);
    row('Made from', u.from);
  }
  if (known) kids.push(steps(e, creature, y));
  else if (creature) kids.push(steps({ ...e, steps: [] }, true, y));
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
  // Only the cells the spread has are drawn, so a short chapter is a short grid with its two lines under it.
  const cols = colsFor(entries.length);
  const rows = Math.max(1, Math.ceil(entries.length / cols));
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    left.push({
      id: `cx.entry.${i}`, x: (i % cols) * 18, y: 14 + Math.floor(i / cols) * 18, w: 18, h: 18,
      takes: true, focus: true,
      on: { down: () => v.onChoose(i) },
      tip: () => ({ lines: [{ text: e.seen ? e.name : creature ? 'Not yet met' : 'Not yet found', c: e.seen ? 'salt' : 'root.4' }] }),
      paint: (s, live) => paintEntry(s, e, live, i === v.chosen),
    });
  }
  // The chosen cell: a frame of ember 2 deep standing a unit out of the cell, drawn over its neighbours' edges.
  if (v.chosen >= 0 && v.chosen < entries.length) {
    const cx = (v.chosen % cols) * 18, cy = 14 + Math.floor(v.chosen / cols) * 18;
    left.push({ x: cx - 1, y: cy - 1, w: 20, h: 20, paint: (s) => { ring(s, 0, 0, 20, 20, 'ember'); ring(s, 1, 1, 18, 18, 'ember'); } });
  }
  const blurb = box(sp.blurb, PW, 2);
  left.push({ x: 0, y: 14 + rows * 18 + 4, w: PW, h: blurb.h, paint: (s) => { for (const l of blurb.lines) s.text(l.text, 0, l.y, 'ink'); } });
  // Page numbers run on through the sections' spreads.
  let before = 0;
  for (let k = 0; k < v.section; k++) before += v.sections[k].spreads.length;
  const page = (before + v.spread) * 2 + 1;
  const at = centred(ui.w, ui.h, BOOK_W, BOOK_H);
  const bk = book({
    id: 'cx.book', x: at.x, y: Math.max(at.y, BOOK_TABS + 3), sections: SECTION_TABS, chosen: v.section,
    onSection: (i) => { ui.cue('page'); v.onSection(i); },
    pages: [page, page + 1],
    prev: v.spread > 0 ? () => { ui.cue('page'); v.onSpread(v.spread - 1); } : undefined,
    next: v.spread < sec.spreads.length - 1 ? () => { ui.cue('page'); v.onSpread(v.spread + 1); } : undefined,
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
        if (e.key === 'PageUp' && v.spread > 0) { v.onSpread(v.spread - 1); return true; }
        if (e.key === 'PageDown' && v.spread < sec.spreads.length - 1) { v.onSpread(v.spread + 1); return true; }
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
