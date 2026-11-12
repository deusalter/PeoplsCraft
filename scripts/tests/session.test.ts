// The client's session over a transport that only records: what arrives is delivered by pump() and
// nowhere else, in order; an action goes out behind a fresh move and the waiting hotbar selection.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { InvChannel } from '../../src/client/api';
import { type MoveState, Session, moveFlags } from '../../src/client/session';
import { MV_GROUND, MV_JUMPED, MV_SNEAK, MV_UI, type C2S, type S2C } from '../../src/net/protocol';
import { decodeMove, encodeSnapshot } from '../../src/net/snapshot';
import type { Transport } from '../../src/net/transport';

class Wire implements Transport {
  readonly kind = 'loopback' as const;
  state: Transport['state'] = 'open';
  onOpen: Transport['onOpen'] = null; onMessage: Transport['onMessage'] = null; onBinary: Transport['onBinary'] = null; onClose: Transport['onClose'] = null;
  /** What left, in order: a JSON message, or the decoded move of a binary one. */
  out: (C2S | { move: number; x: number })[] = [];
  send(m: C2S): void { this.out.push(m); }
  sendBin(b: ArrayBuffer): void { const m = decodeMove(b)!; this.out.push({ move: m.seq, x: m.x }); }
  close(): void { this.state = 'closed'; }
}
const body = (x: number): MoveState => ({ tp: 0, x, y: 64, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: MV_GROUND });
const chat = (text: string): S2C => ({ t: 'chat', slot: 0, name: '', text });
const welcome = (): S2C => ({ t: 'welcome', proto: 1, boot: 1, you: { slot: 1, id: 'a' }, world: { name: 'w', seed: 1, seedText: '1' }, dim: 0, pos: [0, 64, 0, 0, 0], tp: 0, tick: 0, clock: 0,
  flags: [], quest: 0, event: { a: null, k: 0, g: 0 }, spawn: [0, 0], cfg: { cheats: true, simRadius: 5, viewMax: 16, maxPlayers: 8 }, players: [] });

test('nothing is delivered until pump, then everything in arrival order, to every handler of its type', () => {
  const w = new Wire(), s = new Session(w), got: string[] = [];
  s.on('chat', (m) => got.push('a:' + m.text)); s.on('chat', (m) => got.push('b:' + m.text)); s.on('quest', (m) => got.push('q:' + m.index));
  s.onSnapshot((b) => got.push('snap:' + b.byteLength));
  w.onMessage!(chat('1')); w.onBinary!(encodeSnapshot({ flags: 0, tick: 1, ackMove: 0, tp: 0, hunger: 20, ox: 0, oz: 0, hp: 10, mana: 0, players: [], mobs: [] }));
  w.onMessage!({ t: 'quest', index: 4 }); w.onMessage!({ t: 'time', clock: 0.5, tick: 9 }); w.onBinary!(new ArrayBuffer(0)); w.onBinary!(Uint8Array.from([9, 9]).buffer);
  assert.deepEqual(got, []); assert.equal(s.queued, 6);
  s.pump();
  assert.deepEqual(got, ['a:1', 'b:1', 'snap:26', 'q:4']);
  assert.equal(s.queued, 0); assert.equal(s.counts.in, 6);
  s.pump();
  assert.equal(got.length, 4);
  assert.equal(s.local, true);
});

test('what arrives during a pump is delivered by it; a pump from inside a handler does nothing; a throw keeps the rest', () => {
  const w = new Wire(), s = new Session(w), got: string[] = [];
  s.on('chat', (m) => {
    got.push(m.text);
    if (m.text === '1') { w.onMessage!(chat('late')); s.pump(); got.push('after inner pump'); }
    if (m.text === 'bad') throw new Error('handler failed');
  });
  w.onMessage!(chat('1')); w.onMessage!(chat('2'));
  s.pump();
  assert.deepEqual(got, ['1', 'after inner pump', '2', 'late']);
  got.length = 0;
  w.onMessage!(chat('bad')); w.onMessage!(chat('3'));
  assert.throws(() => s.pump(), /handler failed/);
  assert.deepEqual(got, ['bad']); assert.equal(s.queued, 1);
  s.pump();
  assert.deepEqual(got, ['bad', '3']);
});

test('act: a move goes first when the body changed, then the waiting selection, then the action', () => {
  const w = new Wire(), s = new Session(w);
  let x = 1, flushes = 0, pending = false;
  const inv: InvChannel = {
    nextSeq: () => 1, send: () => ({ ok: true }), internal: () => {}, setSel: () => { pending = true; },
    flushSel: () => { flushes++; if (pending) { pending = false; w.send({ t: 'op', seq: 1, o: 'sel', i: 3 }); } },
  };
  s.mover = () => body(x); s.inv = inv;
  s.act({ t: 'atk', id: 5, d: [1, 0, 0] });
  assert.deepEqual(w.out, [{ move: 1, x: 1 }, { t: 'atk', id: 5, d: [1, 0, 0] }]);
  // nothing moved: no second move
  w.out.length = 0;
  s.act({ t: 'dig', on: true, x: 1, y: 2, z: 3 });
  assert.deepEqual(w.out, [{ t: 'dig', on: true, x: 1, y: 2, z: 3 }]);
  // moved, with a selection waiting: move, sel, action
  w.out.length = 0; x = 2; inv.setSel(3);
  s.act({ t: 'talk', id: 9 });
  assert.deepEqual(w.out, [{ move: 2, x: 2 }, { t: 'op', seq: 1, o: 'sel', i: 3 }, { t: 'talk', id: 9 }]);
  assert.equal(flushes, 3); assert.equal(s.lastMove, 2); assert.equal(s.counts.moves, 2);
  // the scheduled send goes whether or not anything changed, behind the selection
  w.out.length = 0; inv.setSel(3);
  s.move(); s.move();
  assert.deepEqual(w.out, [{ t: 'op', seq: 1, o: 'sel', i: 3 }, { move: 3, x: 2 }, { move: 4, x: 2 }]);
  // a plain send is only itself
  w.out.length = 0; x = 3;
  s.send({ t: 'chat', text: 'hi' });
  assert.deepEqual(w.out, [{ t: 'chat', text: 'hi' }]);
});

test('a welcome starts the movement numbering again, and the next action sends a move even from the same place', () => {
  const w = new Wire(), s = new Session(w);
  s.mover = () => body(7);
  s.move(); s.move();
  assert.equal(s.lastMove, 2);
  let seen = -1;
  s.on('welcome', () => { seen = s.lastMove; });
  w.onMessage!(welcome());
  s.pump();
  assert.equal(seen, 0);
  w.out.length = 0;
  s.act({ t: 'ping', x: 1, y: 2, z: 3 });
  assert.deepEqual(w.out, [{ move: 1, x: 7 }, { t: 'ping', x: 1, y: 2, z: 3 }]);
  // without a body to report, an action is still sent
  const bare = new Session(new Wire());
  bare.act({ t: 'talk', id: 1 }); bare.move();
  assert.deepEqual((bare.transport as Wire).out, [{ t: 'talk', id: 1 }]);
});

test('moveFlags', () => {
  const b = { onGround: true, sprinting: false, sneaking: true, flying: false, inWater: false, headInWater: false, inLava: false };
  assert.equal(moveFlags(b, false, false, false), MV_GROUND | MV_SNEAK);
  assert.equal(moveFlags(b, true, false, true), MV_GROUND | MV_SNEAK | MV_JUMPED | MV_UI);
  assert.equal(moveFlags({ onGround: true, sprinting: true, sneaking: true, flying: true, inWater: true, headInWater: true, inLava: true }, true, true, true), 0x3ff);
});
