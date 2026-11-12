// The bytes of the protocol: base64, the two encodings of an edit set, and the snapshot and movement
// messages there and back, with their sizes and a few fixed offsets checked against the layout.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CVOL } from '../../src/core/constants';
import { mulberry32 } from '../../src/core/noise';
import { decodeFull, decodeSparse, dPitch16, dYaw16, dYaw8, encodeEdits, fromBase64, packFull, packSparse, qPitch16, qRel, qY, qYaw16, qYaw8, snapOrigin, toBase64, unpackFull, unpackSparse } from '../../src/net/codec';
import { BOSS_KINDS, MF_BOSS, MF_GROUND, MF_HURT, MOVE_BYTES, MSG_MOVE, MSG_SNAPSHOT, MV_GROUND, MV_UI, PF_SWING_MASK, PF_TP, SELF_DEAD, SNAP_BOSS, SNAP_HEADER, SNAP_MOB, SNAP_PLAYER, bossKind } from '../../src/net/protocol';
import { type Move, type SnapBoss, type Snapshot, SnapWriter, decodeHead, decodeMove, decodeSnapshot, encodeMove, encodeSnapshot } from '../../src/net/snapshot';

const rnd = mulberry32(20261111);
const bytes = (n: number): Uint8Array => Uint8Array.from({ length: n }, () => Math.floor(rnd() * 256));
const near = (a: number, b: number, eps: number, what: string): void => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} is not within ${eps} of ${b}`);
/** Smallest distance between two angles. */
const turn = (a: number, b: number): number => { let d = a - b; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2; return Math.abs(d); };

test('base64 there and back, for every length up to 300 and a large one', () => {
  for (const n of [...Array(301).keys(), 0x6000 - 1, 0x6000, 0x6000 + 1, 200000]) {
    const a = bytes(n), s = toBase64(a);
    assert.equal(s, Buffer.from(a).toString('base64'), `encoding of ${n} bytes`);
    const b = fromBase64(s);
    assert.ok(b, `decoding of ${n} bytes`);
    assert.deepEqual(b, a);
  }
});
test('base64 refuses what is not padded base64', () => {
  for (const bad of ['A', 'AB', 'ABC', 'AB=C', 'A===', '====', 'AB*D', 'ABCD\n', 'ÄBCD', 'AB==AB==', '=ABC']) assert.equal(fromBase64(bad), null, JSON.stringify(bad));
  assert.deepEqual(fromBase64(''), new Uint8Array(0));
  assert.deepEqual(fromBase64('AA=='), new Uint8Array([0]));
});

test('sparse edit set there and back, in the order of the map', () => {
  const cells = new Map<number, number>();
  for (let i = 0; i < 5000; i++) cells.set(Math.floor(rnd() * CVOL), Math.floor(rnd() * 256));
  cells.set(0, 7); cells.set(CVOL - 1, 255);
  const packed = packSparse(cells);
  assert.equal(packed.length, cells.size * 3);
  // u16 little-endian index, then the id
  const first = [...cells][0];
  assert.deepEqual([...packed.subarray(0, 3)], [first[0] & 255, first[0] >> 8, first[1]]);
  const e = encodeEdits({ cells, full: null });
  assert.equal(e.enc, 0);
  const got: [number, number][] = [];
  assert.equal(decodeSparse(e.data, (i, id) => got.push([i, id])), true);
  assert.deepEqual(got, [...cells]);
  // an empty map is an empty string
  assert.deepEqual(encodeEdits({ cells: new Map(), full: null }), { enc: 0, data: '' });
  assert.equal(decodeSparse('', () => assert.fail('nothing to put')), true);
});
test('sparse edit set: malformed data is refused and puts nothing', () => {
  let n = 0;
  assert.equal(unpackSparse(new Uint8Array(4), () => n++), false);
  assert.equal(decodeSparse(toBase64(new Uint8Array(5)), () => n++), false);
  assert.equal(decodeSparse('not base64', () => n++), false);
  assert.equal(n, 0);
});

test('full edit set there and back', () => {
  const blocks = new Uint8Array(CVOL);
  // long runs (over 255 cells), short runs and noise
  let o = 0;
  while (o < CVOL) { const len = rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 900), id = Math.floor(rnd() * 256); blocks.fill(id, o, Math.min(CVOL, o + len)); o += len; }
  const e = encodeEdits({ cells: null, full: blocks });
  assert.equal(e.enc, 1);
  const back = decodeFull(e.data);
  assert.ok(back);
  assert.deepEqual(back, blocks);
  // pairs of (id, count 1..255)
  const p = packFull(blocks);
  assert.equal(p.length % 2, 0);
  let cells = 0;
  for (let i = 1; i < p.length; i += 2) { assert.ok(p[i] >= 1 && p[i] <= 255); cells += p[i]; }
  assert.equal(cells, CVOL);
  // an untouched array of one block is 258 pairs
  assert.equal(packFull(new Uint8Array(CVOL)).length, Math.ceil(CVOL / 255) * 2);
});
test('full edit set: runs that do not cover the chunk exactly are refused', () => {
  const p = packFull(new Uint8Array(CVOL).fill(3));
  assert.ok(unpackFull(p));
  assert.equal(unpackFull(p.subarray(0, p.length - 2)), null, 'short');
  assert.equal(unpackFull(Uint8Array.from([...p, 3, 1])), null, 'long');
  assert.equal(unpackFull(p.subarray(0, p.length - 1)), null, 'odd length');
  const zero = p.slice(); zero[1] = 0;
  assert.equal(unpackFull(zero), null, 'a run of nothing');
  assert.equal(decodeFull('***'), null);
  assert.deepEqual(unpackFull(Uint8Array.from([9, 4]), 4), new Uint8Array([9, 9, 9, 9]));
});

test('quantisers', () => {
  assert.equal(BOSS_KINDS[bossKind('beam')], 'beam'); assert.equal(bossKind(''), 0); assert.equal(bossKind('burrow'), 10); assert.equal(bossKind('no such attack'), 0);
  assert.equal(snapOrigin(37.2), 32); assert.equal(snapOrigin(-0.5), -16); assert.equal(snapOrigin(-16), -16);
  assert.equal(qRel(33.5, 32), 48); assert.equal(qRel(5000, 0), 32767); assert.equal(qRel(-5000, 0), -32768);
  assert.equal(qY(-64), 0); assert.equal(qY(-100), 0); assert.equal(qY(5000), 65535); assert.equal(qY(0), 2048);
  for (const a of [0, 1, -1, 3.14159, -3.14159, 7, -40, 100.5]) {
    near(turn(dYaw16(qYaw16(a)), a), 0, 0.0001, 'yaw16 ' + a);
    near(turn(dYaw8(qYaw8(a)), a), 0, 0.0124, 'yaw8 ' + a);
    assert.ok(qYaw16(a) >= 0 && qYaw16(a) <= 0xffff && qYaw8(a) >= 0 && qYaw8(a) <= 255);
  }
  for (const p of [-1.5533, -0.7, 0, 0.3, 1.5533]) near(dPitch16(qPitch16(p)), p, 0.0001, 'pitch16 ' + p);
});

const boss = (): SnapBoss => ({ hp: 1234.2, maxHp: 4000, phase: 2, kind: bossKind('beam'), running: true, wind: 0.5, strike: 1, pose: 0.25, aim: 0.75, rage: 0.1,
  open: 0.9, scale: 0.6, pitch: -0.4, roll: 0.3, ax: 0.6, ay: -0.2, az: -0.77, age: 12.34, fxm: 0b10011 });
function sample(nPlayers: number, nMobs: number, bossEvery = 0): Snapshot {
  const x0 = -4321.7, z0 = 99887.3;
  const s: Snapshot = { flags: SELF_DEAD, tick: 0xfedcba98, ackMove: 54321, tp: 200, hunger: 17, ox: snapOrigin(x0), oz: snapOrigin(z0), hp: 87.3, mana: 44.9, players: [], mobs: [] };
  for (let i = 0; i < nPlayers; i++) s.players.push({ slot: 1 + i, x: x0 + (rnd() - 0.5) * 300, y: rnd() * 250, z: z0 + (rnd() - 0.5) * 300, yaw: (rnd() - 0.5) * 20, pitch: (rnd() - 0.5) * 3,
    flags: Math.floor(rnd() * 0x8000), hp: rnd(), dig: rnd() });
  for (let i = 0; i < nMobs; i++) s.mobs.push({ id: 1 + Math.floor(rnd() * 65535), def: Math.floor(rnd() * 255), flags: Math.floor(rnd() * 256) & ~MF_BOSS, x: x0 + (rnd() - 0.5) * 170, y: rnd() * 200 - 20,
    z: z0 + (rnd() - 0.5) * 170, yaw: (rnd() - 0.5) * 20, boss: bossEvery && i % bossEvery === 0 ? boss() : null });
  return s;
}
function same(got: Snapshot, s: Snapshot): void {
  assert.equal(got.flags, s.flags); assert.equal(got.tick, s.tick); assert.equal(got.ackMove, s.ackMove); assert.equal(got.tp, s.tp);
  assert.equal(got.hunger, Math.ceil(s.hunger)); assert.equal(got.ox, s.ox); assert.equal(got.oz, s.oz);
  assert.equal(got.hp, Math.ceil(s.hp * 10) / 10); assert.equal(got.mana, Math.floor(s.mana * 10) / 10);
  assert.equal(got.players.length, s.players.length); assert.equal(got.mobs.length, s.mobs.length);
  s.players.forEach((p, i) => {
    const g = got.players[i];
    assert.equal(g.slot, p.slot); assert.equal(g.flags, p.flags);
    near(g.x, p.x, 1 / 64, 'player x'); near(g.y, p.y, 1 / 64, 'player y'); near(g.z, p.z, 1 / 64, 'player z');
    near(turn(g.yaw, p.yaw), 0, 0.0001, 'player yaw'); near(g.pitch, Math.max(-1.5708, Math.min(1.5708, p.pitch)), 0.0063, 'player pitch');
    assert.equal(Math.round(g.hp * 255), Math.ceil(p.hp * 255)); assert.equal(Math.round(g.dig * 255), Math.floor(p.dig * 255));
  });
  s.mobs.forEach((m, i) => {
    const g = got.mobs[i];
    assert.equal(g.id, m.id); assert.equal(g.def, m.def); assert.equal(g.flags, m.flags | (m.boss ? MF_BOSS : 0));
    near(g.x, m.x, 1 / 64, 'creature x'); near(g.y, m.y, 1 / 64, 'creature y'); near(g.z, m.z, 1 / 64, 'creature z');
    near(turn(g.yaw, m.yaw), 0, 0.0124, 'creature yaw');
    assert.equal(g.boss === null, m.boss === null);
    if (g.boss && m.boss) {
      const a = g.boss, b = m.boss;
      assert.equal(a.hp, Math.ceil(b.hp)); assert.equal(a.maxHp, b.maxHp); assert.equal(a.phase, b.phase); assert.equal(a.kind, b.kind); assert.equal(a.running, b.running);
      assert.equal(a.fxm, b.fxm);
      for (const k of ['wind', 'strike', 'pose', 'aim', 'rage', 'open', 'scale'] as const) near(a[k], b[k], 0.5 / 255 + 1e-9, k);
      near(a.pitch, b.pitch, 0.0063, 'pitch'); near(a.roll, b.roll, 0.0063, 'roll');
      for (const k of ['ax', 'ay', 'az'] as const) near(a[k], b[k], 0.5 / 127 + 1e-9, k);
      assert.equal(a.age, Math.min(255, Math.floor(b.age * 10)) / 10);
    }
  });
}

test('snapshot there and back: header, players, creatures, bosses', () => {
  for (const [np, nm, be] of [[0, 0, 0], [1, 0, 0], [0, 1, 1], [7, 40, 0], [7, 75, 25], [3, 320, 7]]) {
    const s = sample(np, nm, be), buf = encodeSnapshot(s), nb = s.mobs.filter((m) => m.boss).length;
    assert.equal(buf.byteLength, SNAP_HEADER + np * SNAP_PLAYER + nm * SNAP_MOB + nb * SNAP_BOSS, `size of ${np} players, ${nm} creatures, ${nb} bosses`);
    const got = decodeSnapshot(buf);
    assert.ok(got);
    same(got, s);
    const { players: _p, mobs: _m, ...head } = got;
    assert.deepEqual(decodeHead(buf), head);
  }
});
test('snapshot at its bounds: the largest ids and counts, negative coordinates, the edge of the range', () => {
  const ox = snapOrigin(-499999.5), oz = snapOrigin(-0.5);
  assert.equal(ox, -500000); assert.equal(oz, -16);
  const s: Snapshot = { flags: 7, tick: 0xffffffff, ackMove: 0xffff, tp: 255, hunger: 20, ox, oz, hp: 6553.5, mana: 0, players: [], mobs: [] };
  for (let i = 0; i < 255; i++) s.players.push({ slot: i === 0 ? 250 : 1 + (i % 250), x: ox - 1023 + i * 8, y: i === 1 ? -64 : i === 2 ? 1983.96875 : 64, z: oz + 1023 - i * 8, yaw: -Math.PI + i * 0.02, pitch: i % 2 ? 1.5708 : -1.5708,
    flags: i === 0 ? 0x7fff : 0, hp: i % 2, dig: i % 2 });
  s.mobs.push({ id: 65535, def: 254, flags: 0xef, x: ox - 1024, y: -64, z: oz - 1024, yaw: -0.01, boss: { ...boss(), hp: 0xffffffff, maxHp: 0xffffffff, phase: 255, kind: BOSS_KINDS.length - 1, age: 99, fxm: 31 } });
  s.mobs.push({ id: 1, def: 0, flags: 0, x: ox + 1023.96875, y: 1983.96875, z: oz + 1023.96875, yaw: 0, boss: null });
  for (let i = 0; i < 318; i++) s.mobs.push({ id: 2 + i, def: i % 255, flags: i & 0xef, x: ox - i, y: i - 60, z: oz - i, yaw: i, boss: null });
  const buf = encodeSnapshot(s);
  assert.equal(buf.byteLength, 26 + 255 * 14 + 320 * 11 + 24);
  const g = decodeSnapshot(buf)!;
  same(g, s);
  assert.equal(g.players.length, 255); assert.equal(g.players[0].slot, 250); assert.equal(g.players[0].flags, 0x7fff); assert.equal(g.players[1].y, -64);
  assert.equal(g.mobs[0].id, 65535); assert.equal(g.mobs[0].x, ox - 1024); assert.equal(g.mobs[0].z, oz - 1024); assert.equal(g.mobs[0].y, -64);
  assert.equal(g.mobs[0].boss!.hp, 0xffffffff); assert.equal(g.mobs[0].boss!.age, 25.5); assert.equal(g.mobs[0].boss!.kind, 10);
  assert.equal(g.mobs[1].id, 1); assert.equal(g.mobs[1].x, ox + 1023.96875); assert.equal(g.mobs[1].y, 1983.96875);
  assert.equal(g.tick, 0xffffffff); assert.equal(g.ackMove, 0xffff); assert.equal(g.tp, 255); assert.equal(g.hp, 6553.5);
  // nothing in it at all
  const empty = encodeSnapshot({ flags: 0, tick: 0, ackMove: 0, tp: 0, hunger: 0, ox: 0, oz: 0, hp: 0, mana: 0, players: [], mobs: [] });
  assert.equal(empty.byteLength, 26);
  assert.deepEqual(decodeSnapshot(empty), { flags: 0, tick: 0, ackMove: 0, tp: 0, hunger: 0, ox: 0, oz: 0, hp: 0, mana: 0, players: [], mobs: [] });
  // a player past the 255th is not written
  const over = sample(0, 0);
  for (let i = 0; i < 300; i++) over.players.push({ slot: 1, x: over.ox, y: 0, z: over.oz, yaw: 0, pitch: 0, flags: 0, hp: 1, dig: 0 });
  assert.equal(decodeSnapshot(encodeSnapshot(over))!.players.length, 255);
});
test('snapshot layout: the fixed offsets', () => {
  assert.deepEqual([SNAP_HEADER, SNAP_PLAYER, SNAP_MOB, SNAP_BOSS, MSG_SNAPSHOT], [26, 14, 11, 24, 1]);
  const s: Snapshot = { flags: 5, tick: 0x01020304, ackMove: 0x0506, tp: 7, hunger: 19.2, ox: -32, oz: 48, hp: 12.34, mana: 5.67,
    players: [{ slot: 9, x: -31, y: 0, z: 49.5, yaw: Math.PI, pitch: 1.5708, flags: PF_TP | PF_SWING_MASK, hp: 0.5, dig: 0.5 }],
    mobs: [{ id: 0x1234, def: 77, flags: MF_GROUND | MF_HURT, x: -30, y: 10, z: 50, yaw: Math.PI / 2, boss: null }] };
  const b = new Uint8Array(encodeSnapshot(s)), v = new DataView(b.buffer);
  assert.equal(b[0], 1); assert.equal(b[1], 5); assert.deepEqual([...b.subarray(2, 6)], [4, 3, 2, 1]); assert.equal(v.getUint16(6, true), 0x0506); assert.equal(b[8], 7); assert.equal(b[9], 20);
  assert.equal(v.getInt32(10, true), -32); assert.equal(v.getInt32(14, true), 48); assert.equal(v.getUint16(18, true), 124); assert.equal(v.getUint16(20, true), 56);
  assert.equal(b[22], 1); assert.equal(b[23], 0); assert.equal(v.getUint16(24, true), 1);
  let o = 26;
  assert.equal(b[o], 9); assert.equal(v.getInt16(o + 1, true), 32); assert.equal(v.getUint16(o + 3, true), 2048); assert.equal(v.getInt16(o + 5, true), 48);
  assert.equal(v.getUint16(o + 7, true), 0x8000); assert.equal(v.getInt8(o + 9), 127); assert.equal(v.getUint16(o + 10, true), 0x1300); assert.equal(b[o + 12], 128); assert.equal(b[o + 13], 127);
  o += 14;
  assert.equal(v.getUint16(o, true), 0x1234); assert.equal(b[o + 2], 77); assert.equal(b[o + 3], 3); assert.equal(v.getInt16(o + 4, true), 64); assert.equal(v.getUint16(o + 6, true), 74 * 32);
  assert.equal(v.getInt16(o + 8, true), 64); assert.equal(b[o + 10], 64);
  assert.equal(b.length, o + 11);
});
test('snapshot: values out of range are clamped, not wrapped', () => {
  const s = sample(0, 0);
  s.hp = 1e9; s.mana = 1e9; s.hunger = 20;
  s.players.push({ slot: 1, x: s.ox + 5000, y: 9999, z: s.oz - 5000, yaw: 0, pitch: 9, flags: 0, hp: 2, dig: 2 });
  const g = decodeSnapshot(encodeSnapshot(s))!;
  assert.equal(g.hp, 6553.5); assert.equal(g.mana, 6553.5);
  const p = g.players[0];
  near(p.x - s.ox, 1023.97, 0.01, 'x'); near(p.z - s.oz, -1024, 0.01, 'z'); near(p.y, 65535 / 32 - 64, 1e-9, 'y'); assert.equal(p.hp, 1); assert.equal(p.dig, 1);
});
test('snapshot: bytes that are not one whole snapshot are refused', () => {
  const buf = encodeSnapshot(sample(2, 5, 2)), b = new Uint8Array(buf);
  assert.ok(decodeSnapshot(buf));
  for (const n of [0, 1, 25, 26, b.length - 1]) assert.equal(decodeSnapshot(b.slice(0, n).buffer), null, `cut to ${n}`);
  assert.equal(decodeSnapshot(Uint8Array.from([...b, 0]).buffer), null, 'one byte too many');
  const wrong = b.slice(); wrong[0] = 2;
  assert.equal(decodeSnapshot(wrong.buffer), null, 'wrong type byte');
  assert.equal(decodeHead(wrong.buffer), null); assert.equal(decodeHead(b.slice(0, 25).buffer), null); assert.ok(decodeHead(b.slice(0, 26).buffer));
});
test('SnapWriter: one writer, many messages, each a buffer of its own', () => {
  const w = new SnapWriter(), a = sample(1, 600, 50), c = sample(0, 2);
  const run = (s: Snapshot): ArrayBuffer => { w.begin(s); for (const p of s.players) w.player(p.slot, p.x, p.y, p.z, p.yaw, p.pitch, p.flags, p.hp, p.dig); for (const m of s.mobs) { w.mob(m.id, m.def, m.flags, m.x, m.y, m.z, m.yaw); if (m.boss) w.boss(m.boss); } return w.end(); };
  const ba = run(a), bc = run(c);
  same(decodeSnapshot(ba)!, a); same(decodeSnapshot(bc)!, c);
  assert.deepEqual(new Uint8Array(ba), new Uint8Array(encodeSnapshot(a)));
});

test('move there and back, 36 bytes', () => {
  assert.equal(MOVE_BYTES, 36); assert.equal(MSG_MOVE, 2);
  for (let i = 0; i < 200; i++) {
    const m: Move = { seq: Math.floor(rnd() * 65536), tp: Math.floor(rnd() * 256), x: (rnd() - 0.5) * 1e6, y: rnd() * 464 - 64, z: (rnd() - 0.5) * 1e6,
      vx: (rnd() - 0.5) * 60, vy: (rnd() - 0.5) * 100, vz: (rnd() - 0.5) * 60, yaw: (rnd() - 0.5) * 50, pitch: (rnd() - 0.5) * 3.1066, flags: Math.floor(rnd() * 1024) };
    const buf = encodeMove(m);
    assert.equal(buf.byteLength, 36);
    const g = decodeMove(buf)!;
    assert.equal(g.seq, m.seq); assert.equal(g.tp, m.tp); assert.equal(g.flags, m.flags);
    assert.equal(g.x, m.x); assert.equal(g.z, m.z); assert.equal(g.y, Math.fround(m.y));
    near(g.vx, m.vx, 1 / 512, 'vx'); near(g.vy, m.vy, 1 / 512, 'vy'); near(g.vz, m.vz, 1 / 512, 'vz');
    near(turn(g.yaw, m.yaw), 0, 0.0001, 'yaw'); near(g.pitch, m.pitch, 0.0001, 'pitch');
    assert.deepEqual(decodeMove(new DataView(buf)), g);
  }
});
test('move at its bounds', () => {
  for (const m of [
    { seq: 0xffff, tp: 255, x: -500000, y: -64, z: 500000, vx: -128, vy: 127.99609375, vz: 0, yaw: -Math.PI, pitch: -1.5708, flags: 0xffff },
    { seq: 0, tp: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: 0 },
    { seq: 1, tp: 1, x: -0.000001, y: 400, z: -499999.999999, vx: -1000, vy: 1000, vz: -0.001, yaw: 1e6, pitch: 1.5708, flags: 0x3ff },
  ] as Move[]) {
    const g = decodeMove(encodeMove(m))!;
    assert.equal(g.seq, m.seq); assert.equal(g.tp, m.tp); assert.equal(g.x, m.x); assert.equal(g.y, m.y); assert.equal(g.z, m.z); assert.equal(g.flags, m.flags);
    assert.equal(g.vx, Math.max(-128, Math.min(32767 / 256, Math.round(m.vx * 256) / 256))); assert.equal(g.vy, Math.max(-128, Math.min(32767 / 256, Math.round(m.vy * 256) / 256)));
    near(turn(g.yaw, m.yaw), 0, 0.0001, 'yaw'); near(g.pitch, m.pitch, 0.0001, 'pitch');
  }
});
test('move layout: the fixed offsets', () => {
  const v = new DataView(encodeMove({ seq: 0x0102, tp: 3, x: 1.5, y: 64.25, z: -2.5, vx: 1, vy: -2, vz: 500, yaw: Math.PI / 2, pitch: -1.5708, flags: MV_GROUND | MV_UI }));
  assert.equal(v.getUint8(0), 2); assert.equal(v.getUint16(1, true), 0x0102); assert.equal(v.getUint8(3), 3);
  assert.equal(v.getFloat64(4, true), 1.5); assert.equal(v.getFloat32(12, true), 64.25); assert.equal(v.getFloat64(16, true), -2.5);
  assert.equal(v.getInt16(24, true), 256); assert.equal(v.getInt16(26, true), -512); assert.equal(v.getInt16(28, true), 32767);
  assert.equal(v.getUint16(30, true), 0x4000); assert.equal(v.getInt16(32, true), -32767); assert.equal(v.getUint16(34, true), 0x201);
});
test('move: a height at or above an integer never arrives below it', () => {
  for (let i = 0; i < 2000; i++) {
    const n = Math.floor(rnd() * 400) - 64, y = n + rnd() * 1e-5;
    const g = decodeMove(encodeMove({ seq: 0, tp: 0, x: 0, y, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: 0 }))!;
    assert.ok(g.y >= n, `${y} arrived as ${g.y}`);
  }
});
test('move: anything but 36 bytes of type 2 is refused; the numbers are not judged', () => {
  const ok = new Uint8Array(encodeMove({ seq: 1, tp: 0, x: NaN, y: Infinity, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: 0 }));
  const g = decodeMove(ok.buffer)!;
  assert.ok(Number.isNaN(g.x)); assert.equal(g.y, Infinity);
  assert.equal(decodeMove(ok.slice(0, 35).buffer), null); assert.equal(decodeMove(Uint8Array.from([...ok, 0]).buffer), null); assert.equal(decodeMove(new ArrayBuffer(0)), null);
  const wrong = ok.slice(); wrong[0] = 1;
  assert.equal(decodeMove(wrong.buffer), null);
});
