// Join a server (section 6, Join a server): address, name and password on the ground tile, the server's answer.
import { TEXT } from '../font/face';
import { measure } from '../font/measure';
import { cut } from '../font/wrap';
import type { Node, Screen } from '../node';
import type { Colour } from '../palette';
import { button, paintButton } from '../parts/button';
import { lv } from '../parts/common';
import { field } from '../parts/controls';
import { FORM, formButtonsY, formFieldY, formLabel, formTitle, groundMenu } from '../parts/menu';
import { ANSWERS, type ServerAnswer } from '../sample/menus';
import { firstFieldFocus, go } from './books-common';
import { CREW, seat } from '../sample/crew';
import type { NamedScreen } from './index';

export interface JoinView {
  address: string;
  name: string;
  password: string;
  /** What the server last said, or nothing yet. */
  answer?: ServerAnswer;
  /** When a full server may be asked again, on the interface's clock: until then Join is "Try again" and counts down. */
  retryAt?: number;
  onAddress(v: string): void;
  onName(v: string): void;
  onPassword(v: string): void;
  onJoin(): void;
  onBack(): void;
}

const NAME_CHAR = /[A-Za-z0-9 _-]/;
const validAddress = (a: string) => /^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(a.trim());
const validName = (n: string) => n.length >= 1 && n.length <= 16 && [...n].every((c) => NAME_CHAR.test(c));

/** The wait before a full server is asked again. */
export const RETRY_WAIT = 5;

/**
 * A line in the 11 kept under a field, its letters 2 under the field and its first column one in from the field's left
 * edge, bare on the ground tile with its shadow, as the tradition writes a hint under a field. On a strip of the chat
 * wash cut to its words it read as a highlighter chip, a web page's alert.
 */
function fieldNote(x: number, y: number, text: string, c: Colour): Node {
  const t = cut(text, 198, TEXT);
  return { x, y, w: measure(t) + 1, h: 11, paint: (s) => { s.text(t, 0, 0, c, true); } };
}

export const joinScreen: Screen<JoinView> = (v, ui) => {
  const first = !v.address ? 'join.address' : !v.name ? 'join.name' : !v.password ? 'join.password' : 'join.name';
  firstFieldFocus(ui, `join:${v.answer?.text ?? ''}`, first, false);
  const ok = validAddress(v.address) && validName(v.name);
  // Seconds still to wait, counted on the paint's clock and never more than the whole wait.
  const left = (t: number) => (v.retryAt === undefined ? 0 : Math.min(RETRY_WAIT, Math.ceil(v.retryAt - t)));
  const ready = () => ok && left(ui.t) <= 0;
  const enter = { key: (e: { key: string }) => { if (e.key === 'Enter') { if (ready()) v.onJoin(); return true; } } };
  const about = v.answer && !v.answer.ok ? v.answer.field : undefined;
  const f = (id: string, y: number, value: string, on: (t: string) => void, extra: Partial<Parameters<typeof field>[0]> = {}) => {
    const n = field({ id, x: 113, y, w: 200, h: FORM.fieldH, value, host: 'ground', onText: on, ui, ...extra });
    n.on = { ...n.on, ...enter };
    return n;
  };
  // The title is centred at the head; each label stands 11 over its field, and the 12 under each field hold what the
  // server said about it, in blood when it refuses, so an answer is always read next to what it is about. An answer
  // about no one field (the server is full, or here) is about the address.
  const kids = [formTitle('Join a server')];
  const said = (key: 'address' | 'name' | 'password') => (v.answer ? (v.answer.ok || !about ? key === 'address' : about === key) : false);
  const row = (i: number, key: 'address' | 'name' | 'password', label: string, value: string, on: (t: string) => void, extra: Partial<Parameters<typeof field>[0]>) => {
    const y = formFieldY(i);
    kids.push(formLabel(i, label));
    const refused = about === key;
    kids.push(f(`join.${key}`, y, value, on, refused ? { ...extra, show: { refused: true } } : extra));
    const at = y + FORM.fieldH + 1;
    if (said(key)) kids.push(fieldNote(114, at, v.answer!.text, v.answer!.ok ? 'root.4' : 'blood.lt'));
    // Why Join stands disabled, said where the missing thing goes.
    else if (key === 'name' && !v.name) kids.push(fieldNote(114, at, 'Type a name to join', 'root.4'));
  };
  row(0, 'address', 'Address', v.address, v.onAddress, { limit: 64 });
  row(1, 'name', 'Name', v.name, v.onName, { limit: 16, allow: NAME_CHAR });
  row(2, 'password', 'Password, if it has one', v.password, v.onPassword, { limit: 64, password: true });
  const by = formButtonsY(3);
  // After a full server, Join becomes "Try again" and stands disabled while it counts the wait down.
  const retry = v.retryAt !== undefined;
  kids.push(
    {
      id: 'join.join', x: 113, y: by, w: 200, h: 20, takes: true, focus: ok, anim: retry || undefined,
      paint: (s, live) => {
        const n = left(live.t);
        const label = !retry ? 'Join' : n > 0 ? `Try again in ${n} s` : 'Try again';
        paintButton(s, 200, 20, label, lv(live), !ok || n > 0);
        // The wait as a strip 2 tall along the foot of the face, emptying from the right by whole units as the
        // seconds run, so a disabled countdown is told from a plain disabled button before its words are read.
        if (retry && n > 0 && v.retryAt !== undefined) {
          const f = Math.max(0, Math.min(1, (v.retryAt - live.t) / RETRY_WAIT));
          s.fill(2, 15, Math.round(f * 195), 2, 'ember');
        }
      },
      on: ok ? { click: () => { if (ready()) v.onJoin(); } } : undefined,
    },
    button({ id: 'join.back', x: 113, y: by + 24, w: 200, label: 'Back', onPress: v.onBack }),
  );
  return groundMenu(ui, 'join', kids, { on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } } });
};

// The sample server is the crew's: the names of those who are here are taken.
const TAKEN = CREW.filter((m) => m.online).map((m) => m.name);
const PASSWORD = 'yavas';

function sample(name: string, init: Pick<JoinView, 'address' | 'name' | 'password' | 'answer' | 'retryAt'>): NamedScreen {
  const st = { ...init };
  return {
    name, title: `Join a server${init.answer && !init.answer.ok ? `, ${init.answer.text.toLowerCase()}` : ''}`, world: false,
    build: (ui) => joinScreen({
      ...st,
      onAddress: (t) => { st.address = t; st.retryAt = undefined; st.answer = validAddress(t) ? ANSWERS.here : undefined; ui.invalidate(); },
      onName: (t) => {
        const was = validName(st.name); st.name = t;
        if (st.answer?.field === 'name') { st.answer = undefined; ui.invalidate(); } else if (was !== validName(t)) ui.invalidate();
      },
      onPassword: (t) => { st.password = t; if (st.answer?.field === 'password') { st.answer = undefined; ui.invalidate(); } },
      onJoin: () => {
        // A full server stays full in the sample: each try waits the whole wait again.
        if (st.answer === ANSWERS.full) { st.retryAt = ui.t + RETRY_WAIT; ui.invalidate(); return; }
        st.answer = TAKEN.includes(st.name) ? ANSWERS.taken : st.password && st.password !== PASSWORD ? ANSWERS.password : undefined;
        if (st.answer) { ui.invalidate(); return; }
        go('loading-server');
      },
      onBack: () => go('title'),
    }, ui),
  };
}

export const SCREENS: NamedScreen[] = [
  sample('join', { address: 'spark.local:8420', name: '', password: '', answer: ANSWERS.here }),
  sample('join-taken', { address: 'spark.local:8420', name: seat(2).name, password: '', answer: ANSWERS.taken }),
  // The answer came as the page opened; the wait is held whole for the first three seconds, as moving samples are.
  sample('join-full', { address: 'spark.local:8420', name: 'Posak-of-Vana', password: 'yavas', answer: ANSWERS.full, retryAt: 3 + RETRY_WAIT }),
];
