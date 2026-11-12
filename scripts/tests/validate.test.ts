// checkC2S, message by message: a valid sample passes; every field of it, broken in each way that
// field can be broken, fails; a missing optional field passes and a field that is not declared fails.
// Then the edges of the ranges, and things that are not messages at all. Nothing may throw.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCKS } from '../../src/data/blocks';
import { RECIPES } from '../../src/data/recipes';
import type { C2S } from '../../src/net/protocol';
import { checkC2S } from '../../src/net/validate';

type Rec = Record<string, unknown>;
/** What a field holds, which decides how it can be broken.
 *  int / num: a number that must (or need not) be whole. str: a string, `+` when '' is refused too. bool. enum: one of a few values.
 *  cell / dir / point / ref: the fixed tuples. chunks2 / chunks3: flat chunk lists. `?` after any of them: optional. */
type Kind = 'int' | 'num' | 'str' | 'str+' | 'bool' | 'enum' | 'cell' | 'dir' | 'point' | 'ref' | 'chunks2' | 'chunks3';
interface Sample { m: Rec; f: Record<string, Kind | `${Kind}?`> }

const SAMPLES: Sample[] = [
  { m: { t: 'hello', proto: 1, build: 'a1b2c3', data: 123456789, name: 'Wren', token: '0123456789abcdef0123456789abcdef', password: 'hunter2', view: 12 },
    f: { proto: 'int', build: 'str', data: 'int', name: 'str', token: 'str', password: 'str?', view: 'int' } },
  { m: { t: 'ready', tp: 7 }, f: { tp: 'int' } },
  { m: { t: 'chunks', dim: 1, sub: [0, 0, 1, -5, 7, 65535], unsub: [3, 4, -31250, 31250], full: [1, 2] }, f: { dim: 'int', sub: 'chunks3', unsub: 'chunks2', full: 'chunks2?' } },
  { m: { t: 'dig', on: true, x: 10, y: 64, z: -3 }, f: { on: 'bool', x: 'int', y: 'int', z: 'int' } },
  { m: { t: 'edit', seq: 5, k: 1, x: 500000, y: 255, z: -500000, id: 3 }, f: { seq: 'int', k: 'int', x: 'int', y: 'int', z: 'int', id: 'int' } },
  { m: { t: 'use', seq: 1, x: 0, y: 0, z: 0, id: 4 }, f: { seq: 'int', x: 'int', y: 'int', z: 'int', id: 'int' } },
  { m: { t: 'talk', id: 65535 }, f: { id: 'int' } },
  { m: { t: 'item', seq: 9, slot: 35, at: [1, 70, 2], ax: false }, f: { seq: 'int', slot: 'int', at: 'cell?', ax: 'bool?' } },
  { m: { t: 'atk', id: 12, d: [0.6, 0, -0.8] }, f: { id: 'int', d: 'dir' } },
  { m: { t: 'fire', seq: 2, o: [10.5, 71.62, -3.25], d: [0, 1, 0] }, f: { seq: 'int', o: 'point', d: 'dir' } },
  { m: { t: 'respawn' }, f: {} },
  { m: { t: 'chat', text: 'hello there' }, f: { text: 'str+' } },
  { m: { t: 'cmd', id: 0, text: 'give torch 4' }, f: { id: 'int', text: 'str+' } },
  { m: { t: 'ping', x: 12.5, y: 80.25, z: -7.75 }, f: { x: 'num', y: 'num', z: 'num' } },
  { m: { t: 'rtt', c: 123456.789, last: 42.5 }, f: { c: 'num', last: 'num' } },
  { m: { t: 'bye' }, f: {} },
  { m: { t: 'step', n: 1 }, f: { n: 'int' } },
  { m: { t: 'pause', on: false }, f: { on: 'bool' } },
  { m: { t: 'save' }, f: {} },
  // every op
  { m: { t: 'op', seq: 1, o: 'sel', i: 8 }, f: { seq: 'int', o: 'enum', i: 'int' } },
  { m: { t: 'op', seq: 2, o: 'click', v: [0, 35], r: true, e: 'iron_sword' }, f: { seq: 'int', o: 'enum', v: 'ref', r: 'bool', e: 'str' } },
  { m: { t: 'op', seq: 3, o: 'place', v: [3, 8], one: false }, f: { seq: 'int', o: 'enum', v: 'ref', one: 'bool' } },
  { m: { t: 'op', seq: 4, o: 'gather' }, f: { seq: 'int', o: 'enum' } },
  { m: { t: 'op', seq: 5, o: 'quick', v: [4, 26], e: '' }, f: { seq: 'int', o: 'enum', v: 'ref', e: 'str' } },
  { m: { t: 'op', seq: 6, o: 'out', all: true }, f: { seq: 'int', o: 'enum', all: 'bool' } },
  { m: { t: 'op', seq: 7, o: 'lay', r: 0 }, f: { seq: 'int', o: 'enum', r: 'int' } },
  { m: { t: 'op', seq: 8, o: 'book', r: RECIPES.length - 1, max: 64 }, f: { seq: 'int', o: 'enum', r: 'int', max: 'enum' } },
  { m: { t: 'op', seq: 9, o: 'hotkey', v: [1, 2], i: 0, e: 'stick' }, f: { seq: 'int', o: 'enum', v: 'ref', i: 'int', e: 'str' } },
  { m: { t: 'op', seq: 10, o: 'dropSlot', v: [2, 4], all: false, e: 'stick' }, f: { seq: 'int', o: 'enum', v: 'ref', all: 'bool', e: 'str' } },
  { m: { t: 'op', seq: 11, o: 'dropCur' }, f: { seq: 'int', o: 'enum' } },
  { m: { t: 'op', seq: 12, o: 'dropHeld', all: true }, f: { seq: 'int', o: 'enum', all: 'bool' } },
  { m: { t: 'op', seq: 13, o: 'sort', w: 1 }, f: { seq: 'int', o: 'enum', w: 'enum' } },
  { m: { t: 'op', seq: 14, o: 'takeAll' }, f: { seq: 'int', o: 'enum' } },
  { m: { t: 'op', seq: 15, o: 'stash' }, f: { seq: 'int', o: 'enum' } },
  { m: { t: 'op', seq: 16, o: 'buy', k: 'torch', bulk: false }, f: { seq: 'int', o: 'enum', k: 'str+', bulk: 'bool' } },
  { m: { t: 'op', seq: 17, o: 'buyBack', id: 5 }, f: { seq: 'int', o: 'enum', id: 'int' } },
  { m: { t: 'op', seq: 18, o: 'spend', a: 'vit' }, f: { seq: 'int', o: 'enum', a: 'enum' } },
  { m: { t: 'op', seq: 19, o: 'pick', id: BLOCKS.length - 1 }, f: { seq: 'int', o: 'enum', id: 'int' } },
  { m: { t: 'op', seq: 20, o: 'tidy', cover: true }, f: { seq: 'int', o: 'enum', cover: 'bool' } },
  { m: { t: 'op', seq: 0x7fffffff, o: 'close' }, f: { seq: 'int', o: 'enum' } },
];

const LONG = 'x'.repeat(20000), OTHER: unknown[] = [null, {}, [], () => 0];
/** Each component of a direction, just past what rounding can give a unit vector, on either side. */
const BEYOND_UNIT = [0, 1, 2].flatMap((i) => [1.011, -1.011].map((v) => [0, 0, 0].map((_, j) => (j === i ? v : 0))));
/** Values no field of this kind may hold. */
function breakers(kind: Kind, v: unknown): unknown[] {
  switch (kind) {
    case 'int': return ['1', true, NaN, Infinity, -Infinity, 1e18, -1e18, (v as number) + 0.5, [v], ...OTHER];
    case 'num': return ['1', true, NaN, Infinity, -Infinity, 1e18, -1e18, [v], ...OTHER];
    case 'str': return [1, true, LONG, ['a'], ...OTHER];
    case 'str+': return [1, true, LONG, '', ['a'], ...OTHER];
    case 'bool': return [0, 1, 'true', ...OTHER];
    case 'enum': return ['nope', 99, true, ...OTHER];
    case 'cell': return [[1, 2], [1, 2, 3, 4], [1.5, 2, 3], [1, 256, 3], [1, -1, 3], [500001, 2, 3], [-500001, 2, 3], [1, 2, 500001], [1, 2, -500001], [1, 2, '3'], [1, NaN, 3], 'abc', 5, { 0: 1, 1: 2, 2: 3, length: 3 }, ...OTHER];
    case 'dir': return [[0, 1], [0, 1, 0, 0], [0, 2, 0], [0, -1.5, 0], ...BEYOND_UNIT, ['0', 1, 0], [NaN, 0, 1], [0, Infinity, 0], 'abc', 5, { 0: 0, 1: 1, 2: 0, length: 3 }, ...OTHER];
    case 'point': return [[0, 1], [0, 1, 0, 0], [0, 500, 0], [0, -100, 0], [600000, 70, 0], [-600000, 70, 0], [0, 70, 600000], [0, 70, -600000], ['0', 70, 0], [NaN, 70, 1], [0, Infinity, 0], 'abc', 5, ...OTHER];
    case 'ref': return [[0], [0, 1, 2], [5, 0], [-1, 0], [0, 36], [0, -1], [1, 3], [2, 5], [3, 9], [4, 27], [0.5, 0], [0, 1.5], ['0', 0], [0, NaN], 'ab', 5, ...OTHER];
    case 'chunks2': return [[1], [1, 2, 3], [1.5, 2], [31251, 0], [-31251, 0], [0, 31251], [0, -31251], [3, 4, 0, 31251], ['1', 2], [NaN, 0], 'ab', 5, null, {}, () => 0];
    case 'chunks3': return [[1], [1, 2], [1, 2, 3, 4], [1.5, 2, 3], [31251, 0, 1], [-31251, 0, 1], [0, 31251, 1], [0, -31251, 1], [0, 0, 1, -31251, 0, 1], [0, 0, 65536], [0, 0, -1], [0, 0, 1.5], ['1', 2, 3], [NaN, 0, 0], 'abc', 5, null, {}, () => 0];
  }
}
const show = (v: unknown): string => (typeof v === 'function' ? 'function' : typeof v === 'string' && v.length > 40 ? `string of ${v.length}` : typeof v === 'number' ? String(v) : JSON.stringify(v));

test('every message type has a sample, and every sample passes untouched', () => {
  const types = ['hello', 'ready', 'chunks', 'dig', 'edit', 'use', 'talk', 'item', 'atk', 'fire', 'op', 'respawn', 'chat', 'cmd', 'ping', 'rtt', 'bye', 'step', 'pause', 'save'];
  assert.deepEqual([...new Set(SAMPLES.map((s) => s.m.t))].sort(), [...types].sort());
  const ops = ['sel', 'click', 'place', 'gather', 'quick', 'out', 'lay', 'book', 'hotkey', 'dropSlot', 'dropCur', 'dropHeld', 'sort', 'takeAll', 'stash', 'buy', 'buyBack', 'spend', 'pick', 'tidy', 'close'];
  assert.deepEqual(SAMPLES.filter((s) => s.m.t === 'op').map((s) => s.m.o).sort(), [...ops].sort());
  for (const s of SAMPLES) {
    assert.deepEqual(Object.keys(s.m).filter((k) => k !== 't').sort(), Object.keys(s.f).sort(), `the field list of ${s.m.t} ${s.m.o ?? ''}`);
    assert.equal(checkC2S(s.m), s.m, `${JSON.stringify(s.m)} should pass, and come back as itself`);
    // what a real transport delivers
    const wire = JSON.parse(JSON.stringify(s.m));
    assert.equal(checkC2S(wire), wire);
  }
});

test('each field broken in turn fails; a missing optional field passes; an undeclared field fails', () => {
  let n = 0;
  for (const s of SAMPLES) {
    const name = `${s.m.t}${s.m.o ? ' ' + s.m.o : ''}`;
    for (const [field, spec] of Object.entries(s.f)) {
      const optional = spec.endsWith('?'), kind = (optional ? spec.slice(0, -1) : spec) as Kind;
      for (const bad of breakers(kind, s.m[field])) {
        assert.equal(checkC2S({ ...s.m, [field]: bad }), null, `${name}: ${field} = ${show(bad)} should fail`);
        n++;
      }
      const without: Rec = { ...s.m }; delete without[field];
      if (optional) {
        assert.ok(checkC2S(without), `${name}: without ${field} should pass`);
        assert.ok(checkC2S({ ...s.m, [field]: undefined }), `${name}: ${field} undefined should pass`);
      } else {
        assert.equal(checkC2S(without), null, `${name}: without ${field} should fail`);
        assert.equal(checkC2S({ ...s.m, [field]: undefined }), null, `${name}: ${field} undefined should fail`);
      }
      n += 2;
    }
    assert.equal(checkC2S({ ...s.m, zz: 1 }), null, `${name}: an undeclared field should fail`);
    assert.equal(checkC2S({ ...s.m, t: undefined }), null, `${name}: without t`);
    assert.equal(checkC2S({ ...s.m, t: s.m.t + 'x' }), null, `${name}: unknown t`);
  }
  assert.ok(n > 1000, `${n} broken messages tried`);
});

test('the edges of the ranges', () => {
  const pass = (m: Rec): void => { assert.ok(checkC2S(m), `${JSON.stringify(m)} should pass`); };
  const fail = (m: Rec): void => { assert.equal(checkC2S(m), null, `${JSON.stringify(m)} should fail`); };
  const base = (t: string): Rec => ({ ...SAMPLES.find((s) => s.m.t === t)!.m });
  const op = (o: string): Rec => ({ ...SAMPLES.find((s) => s.m.o === o)!.m });

  pass({ ...base('hello'), view: 4 }); pass({ ...base('hello'), view: 16 }); fail({ ...base('hello'), view: 3 }); fail({ ...base('hello'), view: 17 });
  pass({ ...base('hello'), name: '', token: '', build: '' }); fail({ ...base('hello'), name: 'n'.repeat(65) }); fail({ ...base('hello'), password: 'p'.repeat(129) });
  pass({ ...base('hello'), name: 'n'.repeat(64), token: 't'.repeat(64), build: 'b'.repeat(64), password: 'p'.repeat(128) });
  fail({ ...base('hello'), token: 't'.repeat(65) }); fail({ ...base('hello'), build: 'b'.repeat(65) });
  pass({ ...base('hello'), data: 0xffffffff }); fail({ ...base('hello'), data: 0x100000000 }); fail({ ...base('hello'), data: -1 });
  pass({ ...base('hello'), proto: 0 }); pass({ ...base('hello'), proto: 65535 }); fail({ ...base('hello'), proto: 65536 }); fail({ ...base('hello'), proto: -1 });
  pass({ ...base('ready'), tp: 0 }); pass({ ...base('ready'), tp: 255 }); fail({ ...base('ready'), tp: 256 }); fail({ ...base('ready'), tp: -1 });

  fail({ ...base('chunks'), dim: 3 }); fail({ ...base('chunks'), dim: -1 });
  pass({ ...base('chunks'), sub: [], unsub: [] });
  const triples = (n: number): number[] => Array.from({ length: n * 3 }, (_, i) => (i % 3 === 2 ? i % 65536 : i % 100));
  const pairs = (n: number): number[] => Array.from({ length: n * 2 }, (_, i) => i % 100);
  pass({ ...base('chunks'), sub: triples(1024) }); fail({ ...base('chunks'), sub: triples(1025) });
  pass({ ...base('chunks'), unsub: pairs(1024) }); fail({ ...base('chunks'), unsub: pairs(1025) });
  pass({ ...base('chunks'), full: pairs(16) }); fail({ ...base('chunks'), full: pairs(17) });
  // each chunk coordinate at each end of its range, and one past it, in all three lists
  for (const [cx, cz] of [[31250, 31250], [-31250, -31250], [31250, -31250], [-31250, 31250]]) {
    pass({ ...base('chunks'), sub: [cx, cz, 0] }); pass({ ...base('chunks'), unsub: [cx, cz] }); pass({ ...base('chunks'), full: [cx, cz] });
  }
  for (const [cx, cz] of [[31251, 0], [-31251, 0], [0, 31251], [0, -31251]]) {
    fail({ ...base('chunks'), sub: [cx, cz, 0] }); fail({ ...base('chunks'), unsub: [cx, cz] }); fail({ ...base('chunks'), full: [cx, cz] });
    fail({ ...base('chunks'), sub: [0, 0, 0, cx, cz, 0] }); fail({ ...base('chunks'), unsub: [0, 0, cx, cz] }); fail({ ...base('chunks'), full: [0, 0, cx, cz] });
  }
  pass({ ...base('chunks'), sub: [0, 0, 0] }); pass({ ...base('chunks'), sub: [0, 0, 65535] });

  for (const t of ['dig', 'edit', 'use']) {
    pass({ ...base(t), x: -500000, y: 0, z: 500000 }); pass({ ...base(t), x: 500000, y: 255, z: -500000 });
    fail({ ...base(t), x: 500001 }); fail({ ...base(t), x: -500001 }); fail({ ...base(t), z: 500001 }); fail({ ...base(t), z: -500001 }); fail({ ...base(t), y: 256 }); fail({ ...base(t), y: -1 });
  }
  for (const t of ['edit', 'use']) {
    pass({ ...base(t), id: 0 }); pass({ ...base(t), id: BLOCKS.length - 1 }); fail({ ...base(t), id: BLOCKS.length }); fail({ ...base(t), id: -1 });
    fail({ ...base(t), seq: 0 }); pass({ ...base(t), seq: 0x7fffffff }); fail({ ...base(t), seq: 0x80000000 });
  }
  pass({ ...base('edit'), k: 0 }); pass({ ...base('edit'), k: 2 }); fail({ ...base('edit'), k: 3 }); fail({ ...base('edit'), k: -1 });
  fail({ ...base('talk'), id: 0 }); pass({ ...base('talk'), id: 1 }); fail({ ...base('talk'), id: 65536 });
  fail({ ...base('atk'), id: 0 }); pass({ ...base('atk'), d: [1, 0, 0] }); pass({ ...base('atk'), d: [-1, 0, 0] });
  for (const t of ['atk', 'fire']) {
    pass({ ...base(t), d: [1.01, -1.01, 1.01] }); pass({ ...base(t), d: [-1.01, 1.01, -1.01] });
    for (const d of BEYOND_UNIT) fail({ ...base(t), d });
  }
  pass({ ...base('item'), slot: 0 }); fail({ ...base('item'), slot: 36 }); fail({ ...base('item'), slot: -1 });
  pass({ ...base('fire'), o: [500002, 402, -500002] }); pass({ ...base('fire'), o: [-500002, -66, 500002] });
  for (const o of [[500003, 70, 0], [-500003, 70, 0], [0, 70, 500003], [0, 70, -500003], [0, 403, 0], [0, -67, 0]]) fail({ ...base('fire'), o });
  pass({ ...base('ping'), x: 500032, y: 432, z: -500032 }); pass({ ...base('ping'), x: -500032, y: -96, z: 500032 });
  fail({ ...base('ping'), y: 433 }); fail({ ...base('ping'), y: -97 });
  fail({ ...base('ping'), x: 500033 }); fail({ ...base('ping'), x: -500033 }); fail({ ...base('ping'), z: 500033 }); fail({ ...base('ping'), z: -500033 });
  pass({ ...base('chat'), text: 'c'.repeat(200) }); fail({ ...base('chat'), text: 'c'.repeat(201) });
  pass({ ...base('cmd'), text: 'c'.repeat(200) }); fail({ ...base('cmd'), text: 'c'.repeat(201) });
  pass({ ...base('cmd'), id: 0x7fffffff }); fail({ ...base('cmd'), id: 0x80000000 }); fail({ ...base('cmd'), id: -1 });
  pass({ ...base('rtt'), c: 0, last: 0 }); pass({ ...base('rtt'), c: 1e15, last: 600000 }); fail({ ...base('rtt'), c: 1e15 + 1 }); fail({ ...base('rtt'), c: -1 }); fail({ ...base('rtt'), last: -1 }); fail({ ...base('rtt'), last: 600001 });
  fail({ ...base('step'), n: 0 }); pass({ ...base('step'), n: 600 }); fail({ ...base('step'), n: 601 });

  pass({ ...op('sel'), i: 0 }); fail({ ...op('sel'), i: 9 }); fail({ ...op('sel'), i: -1 });
  for (const [c, last] of [[0, 35], [1, 2], [2, 4], [3, 8], [4, 26]]) { pass({ ...op('click'), v: [c, 0] }); pass({ ...op('click'), v: [c, last] }); fail({ ...op('click'), v: [c, last + 1] }); }
  pass({ ...op('click'), e: 'k'.repeat(48) }); fail({ ...op('click'), e: 'k'.repeat(49) });
  fail({ ...op('lay'), r: RECIPES.length }); fail({ ...op('lay'), r: -1 }); fail({ ...op('book'), r: RECIPES.length }); fail({ ...op('book'), r: -1 }); pass({ ...op('book'), r: 0 });
  pass({ ...op('book'), max: 1 }); fail({ ...op('book'), max: 2 }); fail({ ...op('book'), max: 0 });
  pass({ ...op('hotkey'), i: 8 }); fail({ ...op('hotkey'), i: 9 }); fail({ ...op('hotkey'), i: -1 });
  pass({ ...op('sort'), w: 0 }); fail({ ...op('sort'), w: 2 });
  for (const a of ['str', 'agi', 'vit', 'arc']) pass({ ...op('spend'), a });
  fail({ ...op('spend'), a: 'luck' }); fail({ ...op('spend'), a: 'constructor' });
  fail({ ...op('pick'), id: BLOCKS.length }); fail({ ...op('buyBack'), id: 0 }); pass({ ...op('buyBack'), id: 0x7fffffff }); fail({ ...op('buyBack'), id: 0x80000000 }); fail({ ...op('buy'), k: 'k'.repeat(49) });
  // the two ops that exist for prediction never travel
  fail({ t: 'op', seq: 1, o: '_held', n: 1 }); fail({ t: 'op', seq: 1, o: '_slot', i: 0, n: 1 });
  fail({ t: 'op', seq: 1 }); fail({ t: 'op', seq: 1, o: 'toString' }); fail({ t: 'op', o: 'gather' }); fail({ t: 'op', seq: 0, o: 'gather' });
  // a host-to-client type is not a client-to-host one
  fail({ t: 'welcome' }); fail({ t: 'st', ack: 1 }); fail({ t: 'constructor' }); fail({ t: '__proto__' }); fail({ t: 'hasOwnProperty' });
});

test('things that are not messages are refused without a throw', () => {
  const trap = new Proxy({}, { get() { throw new Error('touched'); }, ownKeys() { throw new Error('listed'); } });
  const getter = { t: 'chat', get text(): string { throw new Error('read'); } };
  const circular: Rec = { t: 'chat' }; circular.text = circular;
  const things: unknown[] = [undefined, null, 0, 1, NaN, '', 'bye', '{"t":"bye"}', true, Symbol('bye'), 10n, [], [{ t: 'bye' }], ['t', 'bye'], () => ({ t: 'bye' }), new Map([['t', 'bye']]), new Date(0),
    new ArrayBuffer(36), new Uint8Array(4), Object.create({ t: 'bye' }), { t: 1 }, { t: null }, { t: ['bye'] }, { t: { toString: () => 'bye' } }, { T: 'bye' }, trap, getter, circular];
  for (const x of things) {
    let r: C2S | null = null;
    assert.doesNotThrow(() => { r = checkC2S(x); }, `checkC2S threw on ${typeof x}`);
    assert.equal(r, null);
  }
  // a message built on a prototype that carries the fields is still a message of its own fields only
  const inherited = Object.create({ on: true });
  inherited.t = 'pause';
  assert.equal(checkC2S(inherited), null);
});
