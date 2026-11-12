// Type, shape and range check of every inbound JSON message. A host runs each message through
// checkC2S on every transport before anything else sees it; what comes out can be handled without a
// second look at its shape. Pure, and it never throws.
//
// A message passes when `t` is a known type, every declared field has its declared type and lies in
// its range, no number is NaN or infinite, and it has no field that is not declared (a field whose
// value is `undefined` counts as absent, as it would be after JSON). What a check needs the player
// for is not here: `seq` following `ackSeq`, reach, the name and token rules of `hello`.
import { BLOCKS } from '../data/blocks';
import { RECIPES } from '../data/recipes';
import { BODY_Y_MAX, BODY_Y_MIN, type C2S, CHAT_MAX, CHUNK_MAX, CMD_MAX, FULL_MAX, HELLO_STR_MAX, ID_MAX, KEY_MAX, PASSWORD_MAX, PING_REACH, SEQ_MAX,
  STEP_MAX, SUB_MAX, UNSUB_MAX, VIEW_MAX, VIEW_MIN, XZ_MAX, Y_MAX } from './protocol';

type Rec = Record<string, unknown>;

const int = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi;
const num = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && x >= lo && x <= hi;
const str = (x: unknown, lo: number, hi: number): x is string => typeof x === 'string' && x.length >= lo && x.length <= hi;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';
/** Exactly `n` fields, plus those of `optional` that are present. */
function fields(m: Rec, n: number, ...optional: string[]): boolean {
  let have = 0;
  for (const k of Object.keys(m)) if (m[k] !== undefined) have++;
  for (const k of optional) if (m[k] !== undefined) n++;
  return have === n;
}
const seq = (m: Rec): boolean => int(m.seq, 1, SEQ_MAX);
const cell = (x: unknown, y: unknown, z: unknown): boolean => int(x, -XZ_MAX, XZ_MAX) && int(y, 0, Y_MAX) && int(z, -XZ_MAX, XZ_MAX);
const block = (id: unknown): boolean => int(id, 0, BLOCKS.length - 1);
const mobId = (id: unknown): boolean => int(id, 1, ID_MAX);
const tuple = (v: unknown, n: number): v is unknown[] => Array.isArray(v) && v.length === n;
/** A unit vector, give or take rounding. */
const dir = (v: unknown): boolean => tuple(v, 3) && num(v[0], -1.01, 1.01) && num(v[1], -1.01, 1.01) && num(v[2], -1.01, 1.01);
/** A point within `slack` blocks of where a body can be. */
const point = (x: unknown, y: unknown, z: unknown, slack: number): boolean =>
  num(x, -XZ_MAX - slack, XZ_MAX + slack) && num(y, BODY_Y_MIN - slack, BODY_Y_MAX + slack) && num(z, -XZ_MAX - slack, XZ_MAX + slack);
/** A flat list of chunk coordinates, `step` numbers per entry, the third (when there is one) a u16 nonce. */
function chunkList(v: unknown, step: 2 | 3, max: number): boolean {
  if (!Array.isArray(v) || v.length % step || v.length > max * step) return false;
  for (let i = 0; i < v.length; i += step) {
    if (!int(v[i], -CHUNK_MAX, CHUNK_MAX) || !int(v[i + 1], -CHUNK_MAX, CHUNK_MAX)) return false;
    if (step === 3 && !int(v[i + 2], 0, 0xffff)) return false;
  }
  return true;
}

/** Slots each container of a SlotRef has: pack, armour, trinkets, crafting grid, the open chest (a forge uses the first 3). */
const REF_SIZE = [36, 3, 5, 9, 27];
const ref = (v: unknown): boolean => tuple(v, 2) && int(v[0], 0, 4) && int(v[1], 0, REF_SIZE[v[0] as number] - 1);
const key = (e: unknown): boolean => str(e, 0, KEY_MAX);

/** The fields of an op, beside `t`, `seq` and `o`. */
function op(m: Rec): boolean {
  switch (m.o) {
    case 'sel': return fields(m, 4) && int(m.i, 0, 8);
    case 'click': return fields(m, 6) && ref(m.v) && bool(m.r) && key(m.e);
    case 'place': return fields(m, 5) && ref(m.v) && bool(m.one);
    case 'quick': return fields(m, 5) && ref(m.v) && key(m.e);
    case 'out': return fields(m, 4) && bool(m.all);
    case 'lay': return fields(m, 4) && int(m.r, 0, RECIPES.length - 1);
    case 'book': return fields(m, 5) && int(m.r, 0, RECIPES.length - 1) && (m.max === 1 || m.max === 64);
    case 'hotkey': return fields(m, 6) && ref(m.v) && int(m.i, 0, 8) && key(m.e);
    case 'dropSlot': return fields(m, 6) && ref(m.v) && bool(m.all) && key(m.e);
    case 'dropHeld': return fields(m, 4) && bool(m.all);
    case 'sort': return fields(m, 4) && (m.w === 0 || m.w === 1);
    case 'buy': return fields(m, 5) && str(m.k, 1, KEY_MAX) && bool(m.bulk);
    case 'buyBack': return fields(m, 4) && int(m.id, 1, SEQ_MAX);
    case 'spend': return fields(m, 4) && (m.a === 'str' || m.a === 'agi' || m.a === 'vit' || m.a === 'arc');
    case 'pick': return fields(m, 4) && block(m.id);
    case 'tidy': return fields(m, 4) && bool(m.cover);
    case 'gather': case 'dropCur': case 'takeAll': case 'stash': case 'close': return fields(m, 3);
    default: return false;
  }
}

const CHECKS = new Map<string, (m: Rec) => boolean>([
  ['hello', (m) => fields(m, 7, 'password') && int(m.proto, 0, 0xffff) && str(m.build, 0, HELLO_STR_MAX) && int(m.data, 0, 0xffffffff)
    && str(m.name, 0, HELLO_STR_MAX) && str(m.token, 0, HELLO_STR_MAX) && (m.password === undefined || str(m.password, 0, PASSWORD_MAX)) && int(m.view, VIEW_MIN, VIEW_MAX)],
  ['ready', (m) => fields(m, 2) && int(m.tp, 0, 255)],
  ['chunks', (m) => fields(m, 4, 'full') && int(m.dim, 0, 2) && chunkList(m.sub, 3, SUB_MAX) && chunkList(m.unsub, 2, UNSUB_MAX) && (m.full === undefined || chunkList(m.full, 2, FULL_MAX))],
  ['dig', (m) => fields(m, 5) && bool(m.on) && cell(m.x, m.y, m.z)],
  ['edit', (m) => fields(m, 7) && seq(m) && int(m.k, 0, 2) && cell(m.x, m.y, m.z) && block(m.id)],
  ['use', (m) => fields(m, 6) && seq(m) && cell(m.x, m.y, m.z) && block(m.id)],
  ['talk', (m) => fields(m, 2) && mobId(m.id)],
  ['item', (m) => fields(m, 3, 'at', 'ax') && seq(m) && int(m.slot, 0, 35) && (m.at === undefined || (tuple(m.at, 3) && cell(m.at[0], m.at[1], m.at[2]))) && (m.ax === undefined || bool(m.ax))],
  ['atk', (m) => fields(m, 3) && mobId(m.id) && dir(m.d)],
  ['fire', (m) => fields(m, 4) && seq(m) && tuple(m.o, 3) && point(m.o[0], m.o[1], m.o[2], 2) && dir(m.d)],
  ['op', (m) => seq(m) && op(m)],
  ['respawn', (m) => fields(m, 1)],
  ['chat', (m) => fields(m, 2) && str(m.text, 1, CHAT_MAX)],
  ['cmd', (m) => fields(m, 3) && int(m.id, 0, SEQ_MAX) && str(m.text, 1, CMD_MAX)],
  ['ping', (m) => fields(m, 4) && point(m.x, m.y, m.z, PING_REACH)],
  ['rtt', (m) => fields(m, 3) && num(m.c, 0, 1e15) && num(m.last, 0, 600000)],
  ['bye', (m) => fields(m, 1)],
  ['step', (m) => fields(m, 2) && int(m.n, 1, STEP_MAX)],
  ['pause', (m) => fields(m, 2) && bool(m.on)],
  ['save', (m) => fields(m, 1)],
]);

/** The message itself when it is a well-formed C2S, else null. */
export function checkC2S(m: unknown): C2S | null {
  if (typeof m !== 'object' || m === null || Array.isArray(m)) return null;
  try {
    const check = typeof (m as Rec).t === 'string' ? CHECKS.get((m as Rec).t as string) : undefined;
    return check && check(m as Rec) ? (m as C2S) : null;
  } catch { return null; }
}
