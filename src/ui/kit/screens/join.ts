// Join a server (section 6, Join a server): address, name and password on the ground tile, the server's answer.
import type { Screen } from '../node';
import { button } from '../parts/button';
import { field } from '../parts/controls';
import { FORM, formButtonsY, formTitle, groundMenu, line } from '../parts/menu';
import { ANSWERS, type ServerAnswer } from '../sample/menus';
import { firstFieldFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface JoinView {
  address: string;
  name: string;
  password: string;
  /** What the server last said, or nothing yet. */
  answer?: ServerAnswer;
  onAddress(v: string): void;
  onName(v: string): void;
  onPassword(v: string): void;
  onJoin(): void;
  onBack(): void;
}

const NAME_CHAR = /[A-Za-z0-9 _-]/;
const validAddress = (a: string) => /^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(a.trim());
const validName = (n: string) => n.length >= 1 && n.length <= 16 && [...n].every((c) => NAME_CHAR.test(c));

export const joinScreen: Screen<JoinView> = (v, ui) => {
  const first = !v.address ? 'join.address' : !v.name ? 'join.name' : !v.password ? 'join.password' : 'join.name';
  firstFieldFocus(ui, `join:${v.answer?.text ?? ''}`, first, false);
  const ok = validAddress(v.address) && validName(v.name);
  const enter = { key: (e: { key: string }) => { if (e.key === 'Enter') { if (ok) v.onJoin(); return true; } } };
  const about = v.answer && !v.answer.ok ? v.answer.field : undefined;
  const f = (id: string, y: number, value: string, on: (t: string) => void, extra: Partial<Parameters<typeof field>[0]> = {}) => {
    const n = field({ id, x: 113, y, w: 200, h: FORM.fieldH, value, host: 'ground', onText: on, ui, ...extra });
    n.on = { ...n.on, ...enter };
    return n;
  };
  // The title is centred at the head; each label stands 10 over its field, and the 12 under each field hold what the
  // server said about it, in blood when it refuses, so an answer is always read next to what it is about. An answer
  // about no one field (the server is full, or here) is about the address.
  const kids = [formTitle('Join a server')];
  const said = (key: 'address' | 'name' | 'password') => (v.answer ? (v.answer.ok || !about ? key === 'address' : about === key) : false);
  const row = (i: number, key: 'address' | 'name' | 'password', label: string, value: string, on: (t: string) => void, extra: Partial<Parameters<typeof field>[0]>) => {
    const y = FORM.top + i * FORM.pitch;
    kids.push(line({ x: 113, y, w: 200, text: label, c: 'salt', shadow: true }));
    const refused = about === key;
    kids.push(f(`join.${key}`, y + 10, value, on, refused ? { ...extra, show: { refused: true } } : extra));
    if (said(key)) kids.push(line({ x: 113, y: y + 10 + FORM.fieldH + 1, w: 200, text: v.answer!.text, c: v.answer!.ok ? 'root.4' : 'blood.lt', shadow: true }));
  };
  row(0, 'address', 'Address', v.address, v.onAddress, { limit: 64 });
  row(1, 'name', 'Name', v.name, v.onName, { limit: 16, allow: NAME_CHAR });
  row(2, 'password', 'Password, if it has one', v.password, v.onPassword, { limit: 64, password: true });
  const by = formButtonsY(3);
  kids.push(
    button({ id: 'join.join', x: 113, y: by, w: 200, label: 'Join', disabled: !ok, onPress: v.onJoin }),
    button({ id: 'join.back', x: 113, y: by + 24, w: 200, label: 'Back', onPress: v.onBack }),
  );
  return groundMenu(ui, 'join', kids, { on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } } });
};

// The sample server is called Spark and has three of its eight seats taken; these names are already there.
const TAKEN = ['Kammar', 'Desik', 'Vejja'];
const PASSWORD = 'yavas';

function sample(name: string, init: Pick<JoinView, 'address' | 'name' | 'password' | 'answer'>): NamedScreen {
  const st = { ...init };
  return {
    name, title: `Join a server${init.answer && !init.answer.ok ? `, ${init.answer.text.toLowerCase()}` : ''}`, world: false,
    build: (ui) => joinScreen({
      ...st,
      onAddress: (t) => { st.address = t; st.answer = validAddress(t) ? ANSWERS.here : undefined; ui.invalidate(); },
      onName: (t) => {
        const was = validName(st.name); st.name = t;
        if (st.answer?.field === 'name') { st.answer = undefined; ui.invalidate(); } else if (was !== validName(t)) ui.invalidate();
      },
      onPassword: (t) => { st.password = t; if (st.answer?.field === 'password') { st.answer = undefined; ui.invalidate(); } },
      onJoin: () => {
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
  sample('join-taken', { address: 'spark.local:8420', name: 'Desik', password: '', answer: ANSWERS.taken }),
  sample('join-full', { address: 'spark.local:8420', name: 'Posak-of-Vana', password: 'yavas', answer: ANSWERS.full }),
];
