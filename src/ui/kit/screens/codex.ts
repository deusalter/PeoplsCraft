// The codex and bestiary (section 6, Codex and bestiary): what the crew has met, shared by everyone on the server. The
// left page is a grid of entries sunk in the page; the right tells the chosen one, step by step of what is known.
import { GROUND } from '../art/ground';
import { SLOT } from '../art/slot';
import { box } from '../font/wrap';
import type { KeyEv, Live, Node, Screen } from '../node';
import { type Ribbon, BOOK_W, book, pageHeading } from '../parts/book';
import { ring, sunk } from '../parts/common';
import { centred } from '../scale';
import { CODEX, type Entry, type Section } from '../sample/codex';
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

const RIBBONS: Ribbon[] = [
  { id: 'cx.rb.creatures', colour: 'blood', dark: 'blood.dk', name: 'Creatures' },
  { id: 'cx.rb.matter', colour: 'ember', dark: 'ember.dk', name: 'Matter' },
  { id: 'cx.rb.places', colour: 'growth', dark: 'growth.dk', name: 'Places' },
  { id: 'cx.rb.peoples', colour: 'arm', dark: 'arm.dk', name: 'Peoples' },
  { id: 'cx.rb.old', colour: 'violet.lt', dark: 'violet.dk', name: 'Old things' },
];
const PW = 126, COLS = 7, CELLS = 49;

/** An entry slot sunk in the page (X3): the clay slot with a floor of `clay.sh`; a kind not yet seen shows its silhouette. */
function paintEntry(s: Surface, e: Entry | undefined, live: Live, chosen: boolean): void {
  s.nine(SLOT, 0, 0, 18, 18, 'clay');
  const hot = !!e && live.hover;
  s.fill(1, 1, 16, 16, hot ? 'clay.face' : 'clay.sh');
  if (!e) return;
  if (chosen) ring(s, 1, 1, 16, 16, 'salt');
  else if (live.focus) ring(s, 1, 1, 16, 16, 'salt');
  if (e.seen) s.icon(e.icon, 1, 1);
  else s.icon(e.icon, 1, 1, 'flat', hot ? 'clay.sh' : 'clay.face');
}

/** The four steps (X9): a paragraph for each one known, one rule of `clay.sh` for each one not, cut at the box's foot. */
function steps(e: Entry, creature: boolean): Node {
  const H = 62;
  return {
    x: 0, y: 86, w: PW, h: H,
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

function rightPage(e: Entry | undefined, creature: boolean): Node[] {
  if (!e) return [];
  const kids: Node[] = [];
  const known = e.seen;
  kids.push(inkLine(0, 0, PW, known ? e.name : creature ? 'Not yet met' : 'Not yet found', known ? 'ink' : 'ink.faded'));
  if (known && e.word) kids.push(inkLine(0, 10, PW, e.word, 'ink.faded'));
  kids.push({
    x: 0, y: 24, w: 56, h: 56,
    paint: (s) => {
      sunk(s, 0, 0, 56, 56, 'clay');
      // The thing stands on a strip of the ground tile at the foot of the picture.
      s.tile(GROUND, 1, 43, 54, 12);
      if (known) s.icon(e.icon, 20, 27); else s.icon(e.icon, 20, 27, 'flat', 'root.3');
    },
  });
  if (known && e.facts) {
    e.facts.slice(0, 5).forEach((f, i) => kids.push(typeof f === 'string' ? inkLine(60, 24 + i * 10, 66, f, i === 0 ? 'arm.dk' : 'ink') : inkLine(60, 24 + i * 10, 66, f.text, f.c)));
  }
  if (known) kids.push(steps(e, creature));
  else if (creature) kids.push(steps({ ...e, steps: [] }, true));
  return kids;
}

export const codexScreen: Screen<CodexView> = (v, ui) => {
  const sec = v.sections[v.section];
  const sp = sec.spreads[v.spread];
  const creature = sec.key === 'creatures';
  const entries = sp.entries.slice(0, CELLS);
  firstFocus(ui, 'codex', null);
  const left: Node[] = [pageHeading({ x: 0, y: 0, w: PW, text: sp.heading })];
  for (let i = 0; i < CELLS; i++) {
    const e = entries[i];
    left.push({
      id: e ? `cx.entry.${i}` : undefined, x: (i % COLS) * 18, y: 14 + Math.floor(i / COLS) * 18, w: 18, h: 18,
      takes: !!e, focus: !!e,
      on: e ? { down: () => v.onChoose(i) } : undefined,
      tip: e ? () => ({ lines: [{ text: e.seen ? e.name : creature ? 'Not yet met' : 'Not yet found', c: e.seen ? 'salt' : 'root.4' }] }) : undefined,
      paint: (s, live) => paintEntry(s, e, live, i === v.chosen),
    });
  }
  // Page numbers run on through the sections' spreads.
  let before = 0;
  for (let k = 0; k < v.section; k++) before += v.sections[k].spreads.length;
  const page = (before + v.spread) * 2 + 1;
  const at = centred(ui.w, ui.h, BOOK_W, 192);
  const bk = book({
    id: 'cx.book', x: at.x, y: at.y + 12, ribbons: RIBBONS, chosen: v.section,
    onRibbon: (i) => { ui.cue('page'); v.onSection(i); },
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
        const d: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS };
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
