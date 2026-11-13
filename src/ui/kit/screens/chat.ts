// Chat, open (section 6): twelve lines over the HUD, ending where closed chat ends, and the entry along the bottom of
// the stage, 2 units above its edge, over the hotbar, as the tradition puts it. Enter
// sends and closes; Esc closes and keeps the text; Up and Down walk through what was sent; a line that starts with /
// is a command and its answer comes back as a line from the server. The crew list is not drawn while chat is open.
import { measure } from '../font/measure';
import type { Node, Ui } from '../node';
import { type ChatLine, chat } from '../parts/plates';
import { STILL } from './play/common';
import { CHAT, PLAYERS, chatBottom, chatWrap, hud } from './play/hud';
import { SERVER, seat } from '../sample/crew';
import type { NamedScreen } from './index';

const ENTRY = 'chat.entry';

interface State { lines: ChatLine[]; entry: string; sent: string[]; walk: number; back: number; focused: boolean; open: boolean }
const st: State = {
  lines: [
    { text: `${seat(5).name} joined ${SERVER}` },
    { seat: 4, from: seat(4).name, text: 'found a Sealed Store under the Pabbat, two rooms are nests' },
    ...CHAT,
  ],
  entry: 'heading down now, bring torches',
  sent: ['/where'],
  walk: -1,
  back: 0,
  focused: false,
  open: true,
};

function answer(cmd: string): string {
  const c = cmd.trim().split(/\s+/)[0];
  if (c === '/where') return 'Vana, X -104  Y 64  Z 2210';
  if (c === '/night') return 'Night 3 of 8. Amāvassa is the eighth.';
  if (c === '/who') return `${PLAYERS.length} of 8: ${PLAYERS.map((p) => p.name).join(', ')}`;
  return `No command ${c}. Try /where, /night or /who`;
}

/** Puts a value in the entry: the hidden input takes it when the field is focused again after a rebuild. */
function setEntry(ui: Ui, v: string): void {
  st.entry = v;
  ui.focusOn(null);
  ui.invalidate();
  setTimeout(() => ui.focusOn(ENTRY), 40);
}

function entry(ui: Ui, y: number, W: number): Node {
  return {
    id: ENTRY, x: 0, y, w: W, h: 14, focus: true,
    field: { value: st.entry, limit: 200, textX: 4 },
    anim: !STILL && ui.focused() === ENTRY,
    paint: (s) => {
      const f = ui.field(ENTRY);
      const v = f?.value ?? st.entry;
      const end = f ? f.end : v.length;
      s.fill(0, 0, W, 14, 'root.3');
      s.fill(1, 1, W - 2, 12, 'root.0');
      const caretAt = end ? measure(v.slice(0, end)) + 1 : 0;
      const scroll = Math.max(0, caretAt - (W - 9));
      s.clip(2, 1, W - 4, 12);
      if (f && f.start !== f.end) {
        const a = Math.min(f.start, f.end), b = Math.max(f.start, f.end);
        const xa = a ? measure(v.slice(0, a)) + 1 : 0, xb = measure(v.slice(0, b));
        s.fill(4 + xa - scroll, 2, Math.max(1, xb - xa), 10, 'arm.dk');
      }
      s.text(v, 4 - scroll, 2, 'salt', true);
      const on = STILL || Math.floor(ui.t * 2) % 2 === 0;
      if (on && (STILL || ui.focused() === ENTRY)) s.fill(4 + caretAt - scroll, 2, 1, 10, 'salt');
      s.unclip();
    },
    on: {
      text: (f) => { st.entry = f.value; ui.wake(); },
      key: (e) => {
        if (e.key === 'Enter') {
          const v = (ui.field(ENTRY)?.value ?? st.entry).trim();
          if (v) {
            st.sent.push(v);
            st.lines.push({ seat: 1, from: PLAYERS[0].name, text: v });
            if (v.startsWith('/')) st.lines.push({ text: answer(v) });
          }
          st.walk = -1;
          st.back = 0;
          setEntry(ui, '');
          return true;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (!st.sent.length) return true;
          st.walk = e.key === 'ArrowUp' ? (st.walk < 0 ? st.sent.length - 1 : Math.max(0, st.walk - 1)) : st.walk < 0 ? -1 : st.walk + 1;
          if (st.walk >= st.sent.length) st.walk = -1;
          setEntry(ui, st.walk < 0 ? '' : st.sent[st.walk]);
          return true;
        }
        return false;
      },
    },
  };
}

function build(ui: Ui): Node {
  const stage = ui.layout.stage;
  if (!st.focused && !STILL) { st.focused = true; setTimeout(() => ui.focusOn(ENTRY), 0); }
  const shown = st.back ? st.lines.slice(0, -st.back) : st.lines;
  const bottom = chatBottom(stage.w, stage.h), wrapAt = chatWrap(stage.w);
  const lines = chat({ x: 0, bottom, lines: shown, open: true, wrap: wrapAt });
  const W = stage.w - 8;
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    kids: [
      ...hud(ui, { crew: false, chat: false, prompt: false, entry: true, look: { icon: 'cobble', name: 'Rubble' } }),
      {
        x: stage.x + 4, y: 0, w: wrapAt + 3, h: bottom,
        takes: true,
        on: { wheel: (e) => { st.back = Math.max(0, Math.min(st.lines.length - 1, st.back - e.notches)); ui.invalidate(); return true; } },
        kids: [lines],
      },
      { x: stage.x + 4, y: stage.h - 16, w: W, h: 14, kids: [entry(ui, 0, W)] },
    ],
  };
}

export const SCREENS: NamedScreen[] = [{ name: 'chat', title: 'Chat, open', world: true, build }];
