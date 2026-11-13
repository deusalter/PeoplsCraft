// Join a server (section 6, Join a server): address, name and password on the ground tile, the server's answer.
import type { Screen } from '../node';
import { button } from '../parts/button';
import { field } from '../parts/controls';
import { groundMenu, line, lineW } from '../parts/menu';
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
  const f = (id: string, y: number, value: string, on: (t: string) => void, extra: Partial<Parameters<typeof field>[0]> = {}) => {
    const n = field({ id, x: 113, y, w: 200, h: 16, value, host: 'ground', onText: on, ui, ...extra });
    n.on = { ...n.on, ...enter };
    return n;
  };
  const kids = [
    line({ x: 113, y: 24, w: 200, text: 'Join a server', c: 'salt', shadow: true }),
    line({ x: 113, y: 44, w: 60, text: 'Address', c: 'root.4', shadow: true }),
    f('join.address', 54, v.address, v.onAddress, { limit: 64 }),
    line({ x: 113, y: 78, w: 60, text: 'Name', c: 'root.4', shadow: true }),
    f('join.name', 88, v.name, v.onName, { limit: 16, allow: NAME_CHAR }),
    line({ x: 113, y: 112, w: 100, text: 'Password', c: 'root.4', shadow: true }),
    line({ x: 113 + lineW('Password') + 4, y: 112, w: 100, text: 'if it has one', c: 'root.4', shadow: true }),
    f('join.password', 122, v.password, v.onPassword, { limit: 64, password: true }),
    button({ id: 'join.join', x: 113, y: 160, w: 200, label: 'Join', disabled: !ok, onPress: v.onJoin }),
    button({ id: 'join.back', x: 113, y: 184, w: 200, label: 'Back', onPress: v.onBack }),
  ];
  if (v.answer) kids.push(line({ x: 113, y: 144, w: 200, text: v.answer.text, c: v.answer.ok ? 'salt' : 'blood.lt', shadow: true }));
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
      onName: (t) => { const was = validName(st.name); st.name = t; if (was !== validName(t)) ui.invalidate(); },
      onPassword: (t) => { st.password = t; },
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
