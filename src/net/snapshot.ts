// The two binary messages. All multi-byte fields are little-endian.
//
// snapshot (host to client, type 1): a 26-byte header, then nPlayers player records of 14 bytes, then
// nMobs creature records of 11 bytes, each followed by a 24-byte boss extension when its MF_BOSS bit is set.
//
//   header   0 u8 type   1 u8 self flags   2 u32 tick   6 u16 ackMove   8 u8 tp   9 u8 hunger
//           10 i32 ox   14 i32 oz   18 u16 hp10   20 u16 mana10   22 u8 nPlayers   23 u8 0   24 u16 nMobs
//   player   0 u8 slot   1 i16 x   3 u16 y   5 i16 z   7 u16 yaw   9 i8 pitch   10 u16 flags   12 u8 hp   13 u8 dig
//   creature 0 u16 id   2 u8 def   3 u8 flags   4 i16 x   6 u16 y   8 i16 z   10 u8 yaw
//   boss     0 u32 hp   4 u32 maxHp   8 u8 phase   9 u8 kind   10 u8 wind   11 u8 strike   12 u8 pose   13 u8 aim
//           14 u8 rage   15 u8 open   16 u8 scale   17 i8 pitch   18 i8 roll   19 i8 ax, ay, az   22 u8 age   23 u8 fxm
//
// move (client to host, type 2), 36 bytes:
//            0 u8 type   1 u16 seq   3 u8 tp   4 f64 x   12 f32 y   16 f64 z   24 i16 vx, vy, vz   30 u16 yaw
//           32 i16 pitch   34 u16 flags
import { dPitch16, dPitch8, dRel, dSigned, dUnit, dVel, dY, dYaw16, dYaw8, qPitch16, qPitch8, qRel, qSigned, qUnit, qVel, qY, qYaw16, qYaw8 } from './codec';
import { BOSS_RUNNING, MF_BOSS, MOVE_BYTES, MSG_MOVE, MSG_SNAPSHOT, SNAP_BOSS, SNAP_HEADER, SNAP_MOB, SNAP_PLAYER } from './protocol';

/** Another player as a snapshot carries it. `hp` and `dig` are fractions; `flags` are the PF_ bits. */
export interface SnapPlayer { slot: number; x: number; y: number; z: number; yaw: number; pitch: number; flags: number; hp: number; dig: number }
/** A boss's body language. `kind` indexes BOSS_KINDS; `running`: an attack is under way; `fxm`: the FXM bits of the tick. */
export interface SnapBoss {
  hp: number; maxHp: number; phase: number; kind: number; running: boolean;
  wind: number; strike: number; pose: number; aim: number; rage: number; open: number; scale: number;
  pitch: number; roll: number; ax: number; ay: number; az: number; age: number; fxm: number;
}
/** A creature. `def` indexes MOB_LIST; `flags` are the MF_ bits (MF_BOSS follows `boss`, whatever is passed in). */
export interface SnapMob { id: number; def: number; flags: number; x: number; y: number; z: number; yaw: number; boss: SnapBoss | null }
/** The receiver's own state, and the origin every position in the snapshot is relative to. */
export interface SnapHead { flags: number; tick: number; ackMove: number; tp: number; hunger: number; ox: number; oz: number; hp: number; mana: number }
export interface Snapshot extends SnapHead { players: SnapPlayer[]; mobs: SnapMob[] }

/** Builds one snapshot record by record, with no objects in between. One writer serves every connection. */
export class SnapWriter {
  private buf = new ArrayBuffer(4096); private v = new DataView(this.buf);
  private o = 0; private ox = 0; private oz = 0; private nPlayers = 0; private nMobs = 0;

  private room(n: number): void {
    if (this.o + n <= this.buf.byteLength) return;
    const next = new ArrayBuffer(Math.max(this.buf.byteLength * 2, this.o + n));
    new Uint8Array(next).set(new Uint8Array(this.buf, 0, this.o));
    this.buf = next; this.v = new DataView(next);
  }
  /** `hp`, `mana` and `hunger` as the stats hold them; `ox`, `oz` from `snapOrigin` of the receiver's position. */
  begin(h: SnapHead): void {
    const v = this.v;
    this.o = SNAP_HEADER; this.ox = h.ox; this.oz = h.oz; this.nPlayers = 0; this.nMobs = 0;
    v.setUint8(0, MSG_SNAPSHOT); v.setUint8(1, h.flags & 255); v.setUint32(2, h.tick >>> 0, true); v.setUint16(6, h.ackMove & 0xffff, true);
    v.setUint8(8, h.tp & 255); v.setUint8(9, Math.max(0, Math.min(255, Math.ceil(h.hunger))));
    v.setInt32(10, h.ox, true); v.setInt32(14, h.oz, true);
    v.setUint16(18, Math.max(0, Math.min(65535, Math.ceil(h.hp * 10))), true); v.setUint16(20, Math.max(0, Math.min(65535, Math.floor(h.mana * 10))), true);
    v.setUint8(23, 0);
  }
  /** Players come first: none may be written after the first creature. At most 255. */
  player(slot: number, x: number, y: number, z: number, yaw: number, pitch: number, flags: number, hp: number, dig: number): void {
    if (this.nMobs || this.nPlayers >= 255) return;
    this.room(SNAP_PLAYER);
    const v = this.v, o = this.o;
    v.setUint8(o, slot); v.setInt16(o + 1, qRel(x, this.ox), true); v.setUint16(o + 3, qY(y), true); v.setInt16(o + 5, qRel(z, this.oz), true);
    v.setUint16(o + 7, qYaw16(yaw), true); v.setInt8(o + 9, qPitch8(pitch)); v.setUint16(o + 10, flags & 0xffff, true);
    v.setUint8(o + 12, Math.max(0, Math.min(255, Math.ceil(hp * 255)))); v.setUint8(o + 13, Math.max(0, Math.min(255, Math.floor(dig * 255))));
    this.o = o + SNAP_PLAYER; this.nPlayers++;
  }
  /** A creature without a boss extension. `flags` without MF_BOSS. */
  mob(id: number, def: number, flags: number, x: number, y: number, z: number, yaw: number): void {
    if (this.nMobs >= 65535) return;
    this.room(SNAP_MOB + SNAP_BOSS);
    const v = this.v, o = this.o;
    v.setUint16(o, id, true); v.setUint8(o + 2, def); v.setUint8(o + 3, flags & ~MF_BOSS & 255);
    v.setInt16(o + 4, qRel(x, this.ox), true); v.setUint16(o + 6, qY(y), true); v.setInt16(o + 8, qRel(z, this.oz), true); v.setUint8(o + 10, qYaw8(yaw));
    this.o = o + SNAP_MOB; this.nMobs++;
  }
  /** The boss extension of the creature just written. */
  boss(b: SnapBoss): void {
    const v = this.v, o = this.o;
    v.setUint8(o - SNAP_MOB + 3, v.getUint8(o - SNAP_MOB + 3) | MF_BOSS);
    v.setUint32(o, Math.max(0, Math.min(0xffffffff, Math.ceil(b.hp))), true); v.setUint32(o + 4, Math.max(0, Math.min(0xffffffff, Math.round(b.maxHp))), true);
    v.setUint8(o + 8, b.phase & 255); v.setUint8(o + 9, (b.kind & 0x7f) | (b.running ? BOSS_RUNNING : 0));
    v.setUint8(o + 10, qUnit(b.wind)); v.setUint8(o + 11, qUnit(b.strike)); v.setUint8(o + 12, qUnit(b.pose)); v.setUint8(o + 13, qUnit(b.aim));
    v.setUint8(o + 14, qUnit(b.rage)); v.setUint8(o + 15, qUnit(b.open)); v.setUint8(o + 16, qUnit(b.scale));
    v.setInt8(o + 17, qPitch8(b.pitch)); v.setInt8(o + 18, qPitch8(b.roll));
    v.setInt8(o + 19, qSigned(b.ax)); v.setInt8(o + 20, qSigned(b.ay)); v.setInt8(o + 21, qSigned(b.az));
    v.setUint8(o + 22, Math.max(0, Math.min(255, Math.floor(b.age * 10)))); v.setUint8(o + 23, b.fxm & 255);
    this.o = o + SNAP_BOSS;
  }
  /** The finished message, as a buffer of its own. */
  end(): ArrayBuffer {
    this.v.setUint8(22, this.nPlayers); this.v.setUint16(24, this.nMobs, true);
    return this.buf.slice(0, this.o);
  }
}

const writer = new SnapWriter();
export function encodeSnapshot(s: Snapshot): ArrayBuffer {
  writer.begin(s);
  for (const p of s.players) writer.player(p.slot, p.x, p.y, p.z, p.yaw, p.pitch, p.flags, p.hp, p.dig);
  for (const m of s.mobs) { writer.mob(m.id, m.def, m.flags, m.x, m.y, m.z, m.yaw); if (m.boss) writer.boss(m.boss); }
  return writer.end();
}

/** The header alone: the receiver's own state, for whoever needs nothing else of a snapshot. Null when it is not one. */
export function decodeHead(buf: ArrayBuffer): SnapHead | null {
  if (buf.byteLength < SNAP_HEADER) return null;
  const v = new DataView(buf);
  if (v.getUint8(0) !== MSG_SNAPSHOT) return null;
  return { flags: v.getUint8(1), tick: v.getUint32(2, true), ackMove: v.getUint16(6, true), tp: v.getUint8(8), hunger: v.getUint8(9),
    ox: v.getInt32(10, true), oz: v.getInt32(14, true), hp: v.getUint16(18, true) / 10, mana: v.getUint16(20, true) / 10 };
}
/** Null when the bytes are not one whole snapshot. Values come back in the units they went in with, to the wire's precision. */
export function decodeSnapshot(buf: ArrayBuffer): Snapshot | null {
  const len = buf.byteLength;
  if (len < SNAP_HEADER) return null;
  const v = new DataView(buf);
  if (v.getUint8(0) !== MSG_SNAPSHOT) return null;
  const head = decodeHead(buf)!, ox = head.ox, oz = head.oz, nPlayers = v.getUint8(22), nMobs = v.getUint16(24, true);
  const s: Snapshot = { ...head, players: [], mobs: [] };
  let o = SNAP_HEADER;
  if (o + nPlayers * SNAP_PLAYER + nMobs * SNAP_MOB > len) return null;
  for (let i = 0; i < nPlayers; i++, o += SNAP_PLAYER) {
    s.players.push({ slot: v.getUint8(o), x: dRel(v.getInt16(o + 1, true), ox), y: dY(v.getUint16(o + 3, true)), z: dRel(v.getInt16(o + 5, true), oz),
      yaw: dYaw16(v.getUint16(o + 7, true)), pitch: dPitch8(v.getInt8(o + 9)), flags: v.getUint16(o + 10, true), hp: dUnit(v.getUint8(o + 12)), dig: dUnit(v.getUint8(o + 13)) });
  }
  for (let i = 0; i < nMobs; i++) {
    if (o + SNAP_MOB > len) return null;
    const flags = v.getUint8(o + 3);
    const m: SnapMob = { id: v.getUint16(o, true), def: v.getUint8(o + 2), flags, x: dRel(v.getInt16(o + 4, true), ox), y: dY(v.getUint16(o + 6, true)),
      z: dRel(v.getInt16(o + 8, true), oz), yaw: dYaw8(v.getUint8(o + 10)), boss: null };
    o += SNAP_MOB;
    if (flags & MF_BOSS) {
      if (o + SNAP_BOSS > len) return null;
      const k = v.getUint8(o + 9);
      m.boss = { hp: v.getUint32(o, true), maxHp: v.getUint32(o + 4, true), phase: v.getUint8(o + 8), kind: k & 0x7f, running: (k & BOSS_RUNNING) !== 0,
        wind: dUnit(v.getUint8(o + 10)), strike: dUnit(v.getUint8(o + 11)), pose: dUnit(v.getUint8(o + 12)), aim: dUnit(v.getUint8(o + 13)),
        rage: dUnit(v.getUint8(o + 14)), open: dUnit(v.getUint8(o + 15)), scale: dUnit(v.getUint8(o + 16)),
        pitch: dPitch8(v.getInt8(o + 17)), roll: dPitch8(v.getInt8(o + 18)), ax: dSigned(v.getInt8(o + 19)), ay: dSigned(v.getInt8(o + 20)), az: dSigned(v.getInt8(o + 21)),
        age: v.getUint8(o + 22) / 10, fxm: v.getUint8(o + 23) };
      o += SNAP_BOSS;
    }
    s.mobs.push(m);
  }
  return o === len ? s : null;
}

/** A movement message. `flags` are the MV_ bits; `tp` the last teleport id the client has applied. */
export interface Move { seq: number; tp: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; pitch: number; flags: number }

export function encodeMove(m: Move): ArrayBuffer {
  const buf = new ArrayBuffer(MOVE_BYTES), v = new DataView(buf);
  v.setUint8(0, MSG_MOVE); v.setUint16(1, m.seq & 0xffff, true); v.setUint8(3, m.tp & 255);
  v.setFloat64(4, m.x, true); v.setFloat32(12, m.y, true); v.setFloat64(16, m.z, true);
  v.setInt16(24, qVel(m.vx), true); v.setInt16(26, qVel(m.vy), true); v.setInt16(28, qVel(m.vz), true);
  v.setUint16(30, qYaw16(m.yaw), true); v.setInt16(32, qPitch16(m.pitch), true); v.setUint16(34, m.flags & 0xffff, true);
  return buf;
}
/** Null when the length is not 36 or the type byte is not 2. The numbers are not judged here: a NaN comes back as one. */
export function decodeMove(b: ArrayBuffer | DataView): Move | null {
  const v = b instanceof DataView ? b : new DataView(b);
  if (v.byteLength !== MOVE_BYTES || v.getUint8(0) !== MSG_MOVE) return null;
  return { seq: v.getUint16(1, true), tp: v.getUint8(3), x: v.getFloat64(4, true), y: v.getFloat32(12, true), z: v.getFloat64(16, true),
    vx: dVel(v.getInt16(24, true)), vy: dVel(v.getInt16(26, true)), vz: dVel(v.getInt16(28, true)),
    yaw: dYaw16(v.getUint16(30, true)), pitch: dPitch16(v.getInt16(32, true)), flags: v.getUint16(34, true) };
}
