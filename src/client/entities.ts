// The client's picture of everything that moves: one view per creature, other player, projectile and
// drop, holding what drawing needs (the previous tick for blending, eased light, meshes).
//
// Creatures and other players come from the host's snapshots and are drawn a little in the past, between the two
// snapshots around that moment; projectiles and drops come from their start and end events and are flown here in the
// present, with the same rules the host flies them by.
import { DIMS } from '../data/dims';
import { MOB_LIST, type MobDef, PROJECTILES } from '../data/mobs';
import { BOSS_KINDS, EXTRAPOLATE, GHOST_SECONDS, INTERP_LOCAL, INTERP_MAX, INTERP_MIN, MF_ATK, MF_FLEE, MF_FRESH, MF_GROUND, MF_HURT, MF_TP, PF_TP,
  SNAP_EVERY, SNAP_KEEP } from '../net/protocol';
import { decodeSnapshot, type SnapBoss, type Snapshot } from '../net/snapshot';
import type { BoxBatch } from '../render/batches';
import { DropRender, DropView } from '../render/dropView';
import type { ItemModels } from '../render/itemModel';
import { type BossView, type MobHost, MobRender, MobView } from '../render/mobView';
import { ProjView, renderProjs } from '../render/projView';
import { FXM, floorNear, groundY } from '../sim/boss';
import { STEP } from '../sim/clock';
import type { Fx } from '../sim/fx';
import { followSegs } from '../sim/mobhit';
import { moveBody, newRayHit, raycast } from '../sim/physics';
import { PROJ_KEYS } from '../sim/projectiles';
import type { Bodies, Ghosts } from './api';
import type { Session } from './session';

/** Colour of the motes that gather round a boss while it winds up, by attack kind. */
const TELEGRAPH: Record<string, number> = { charge: 0xff5a3a, slam: 0xffb03a, volley: 0x9ad0ff, spiral: 0xd0a0ff, rain: 0xff5a3a, ring: 0xffe06a, summon: 0x9aff6a, teleport: 0xffffff };

export interface EntityHost extends MobHost { dim: number }

/** Another player as the snapshots show it, at the moment the creatures are drawn at. `flags` are the PF_ bits. */
export class PlayerView {
  active = false; slot = 0;
  x = 0; y = 0; z = 0; px = 0; py = 0; pz = 0; yaw = 0; pitch = 0;
  flags = 0; hp = 1; dig = 0;
  /** Horizontal speed, from the snapshots around the moment drawn (blocks per second). */
  moving = 0;
  hw = 0.3; h = 1.8;
}

const TAU = Math.PI * 2;
/** Snapshot ticks per millisecond of the client's clock. */
const TPMS = 1 / (STEP * 1000);
/** The window over which arrivals are judged (ms). */
const WINDOW_MS = 2000;
/** How long a picked-up drop flies to its picker (seconds). */
const FLY_SECONDS = 0.15;
const ray = newRayHit();
const wrap = (a: number): number => a - Math.round(a / TAU) * TAU;

/** The last SNAP_KEEP snapshots of one creature or player, keyed by tick, newest at `i`. */
class Track {
  n = 0; i = -1;
  readonly t = new Float64Array(SNAP_KEEP); readonly x = new Float64Array(SNAP_KEEP); readonly y = new Float64Array(SNAP_KEEP); readonly z = new Float64Array(SNAP_KEEP);
  readonly yaw = new Float64Array(SNAP_KEEP); readonly pitch = new Float64Array(SNAP_KEEP);
  readonly f = new Uint16Array(SNAP_KEEP); readonly hp = new Float32Array(SNAP_KEEP); readonly dig = new Float32Array(SNAP_KEEP);
  readonly boss: (SnapBoss | null)[] = new Array<SnapBoss | null>(SNAP_KEEP).fill(null);
  /** Tick of the last snapshot that held it, and how many snapshots since have not. */
  seen = 0; miss = 0;
  /** An `md` came for it: removed once the moment drawn reaches `at`. */
  dying: { how: number; at: number } | null = null;
  /** Flags of the sample last applied to the view, and whether a sample has been applied yet. */
  lf = 0; placed = false;
  constructor(readonly tpBit: number) {}
  /** The index `k` samples before the newest. */
  back(k: number): number { return (this.i - k + SNAP_KEEP) % SNAP_KEEP; }
  push(tick: number, x: number, y: number, z: number, yaw: number, pitch: number, f: number, hp: number, dig: number, boss: SnapBoss | null): void {
    this.seen = tick; this.miss = 0;
    if (this.n && tick <= this.t[this.i]) return;
    const i = this.i = (this.i + 1) % SNAP_KEEP;
    if (this.n < SNAP_KEEP) this.n++;
    this.t[i] = tick; this.x[i] = x; this.y[i] = y; this.z[i] = z; this.yaw[i] = yaw; this.pitch[i] = pitch; this.f[i] = f; this.hp[i] = hp; this.dig[i] = dig; this.boss[i] = boss;
  }
}
class MobTrack extends Track { constructor(readonly v: MobView) { super(MF_TP); } }
class PlayerTrack extends Track { constructor(readonly v: PlayerView) { super(PF_TP); } }

/** Where a track puts its entity at one moment: position, velocity (blocks per second), look, and the samples it came from
 *  (`a` the one at or before the moment, `b` the one after it or -1, `k` the fraction between them). */
interface Pose { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; pitch: number; a: number; b: number; k: number }
const pose: Pose = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, a: 0, b: -1, k: 0 };

/** 4.4: linear between the two samples around `rt`; past the newest, on the last velocity for at most EXTRAPOLATE ticks, then
 *  held; before the oldest, held. Yaw takes the shorter way round. Across a change of the teleport bit nothing is blended:
 *  the entity stays where it was until the moment of the sample that moved it. */
function sample(tr: Track, rt: number, o: Pose): Pose {
  const n = tr.i, tn = tr.t[n];
  o.vx = o.vy = o.vz = 0; o.b = -1; o.k = 0;
  if (rt >= tn) {
    let e = 0;
    if (tr.n > 1) {
      const q = tr.back(1), dt = tn - tr.t[q];
      if (dt > 0 && ((tr.f[q] ^ tr.f[n]) & tr.tpBit) === 0) {
        e = Math.min(rt - tn, EXTRAPOLATE);
        o.vx = (tr.x[n] - tr.x[q]) / dt; o.vy = (tr.y[n] - tr.y[q]) / dt; o.vz = (tr.z[n] - tr.z[q]) / dt;
      }
    }
    o.x = tr.x[n] + o.vx * e; o.y = tr.y[n] + o.vy * e; o.z = tr.z[n] + o.vz * e; o.yaw = tr.yaw[n]; o.pitch = tr.pitch[n]; o.a = n;
    if (rt - tn >= EXTRAPOLATE) o.vx = o.vy = o.vz = 0;
    o.vx /= STEP; o.vy /= STEP; o.vz /= STEP;
    return o;
  }
  let j = 0, a = n;
  while (j < tr.n - 1 && tr.t[a] > rt) a = tr.back(++j);
  o.a = a;
  if (tr.t[a] > rt || ((tr.f[a] ^ tr.f[tr.back(j - 1)]) & tr.tpBit) !== 0) {
    o.x = tr.x[a]; o.y = tr.y[a]; o.z = tr.z[a]; o.yaw = tr.yaw[a]; o.pitch = tr.pitch[a];
    return o;
  }
  const b = tr.back(j - 1), span = tr.t[b] - tr.t[a], k = (rt - tr.t[a]) / span;
  o.b = b; o.k = k;
  o.x = tr.x[a] + (tr.x[b] - tr.x[a]) * k; o.y = tr.y[a] + (tr.y[b] - tr.y[a]) * k; o.z = tr.z[a] + (tr.z[b] - tr.z[a]) * k;
  o.yaw = tr.yaw[a] + wrap(tr.yaw[b] - tr.yaw[a]) * k; o.pitch = tr.pitch[a] + (tr.pitch[b] - tr.pitch[a]) * k;
  o.vx = (tr.x[b] - tr.x[a]) / span / STEP; o.vy = (tr.y[b] - tr.y[a]) / span / STEP; o.vz = (tr.z[b] - tr.z[a]) / span / STEP;
  return o;
}

/** What the store keeps of a connection: who it is, the host's clock as estimated here, and the entities by wire id. */
class Net {
  slot = 0; dim = 0;
  /** Newest snapshot tick, and the header of that snapshot. */
  last = -1; head: Snapshot | null = null;
  /** Estimate of the host's tick, never lowered; and the moment drawn, set by each netTick. */
  est = 0; rt = 0;
  /** Arrivals of the last 2 s: when, at which tick, and how far each was off the spacing of the ticks. */
  readonly offs: { ms: number; off: number }[] = []; readonly devs: { ms: number; dev: number }[] = [];
  prevMs = -1; prevTick = -1;
  /** Half the measured round trip, in ticks. */
  half = 0;
  readonly mobs = new Map<number, MobTrack>(); readonly players = new Map<number, PlayerTrack>();
  readonly projs = new Map<number, ProjView>(); readonly drops = new Map<number, DropView>();
  constructor(readonly local: boolean) {}
}

export class EntityStore implements Bodies, Ghosts {
  readonly mobs: MobView[] = [];
  /** Other players, filled from snapshots once connected. */
  readonly players: PlayerView[] = [];
  readonly projs: ProjView[] = [];
  readonly drops: DropView[] = [];
  readonly mobRender: MobRender;
  readonly dropRender: DropRender;
  /** The client's clock in milliseconds: what snapshot arrivals and round trips are timed with. */
  clock: () => number = () => performance.now();
  private net: Net | null = null;
  /** Places a boss has marked for a strike: owner id, x, z, seconds left, and whether it arrived during this tick. */
  private marks: { id: number; x: number; z: number; t: number; fresh: boolean }[] = [];

  constructor(private g: EntityHost, models: ItemModels) { this.mobRender = new MobRender(g); this.dropRender = new DropRender(models); }

  /** The first boss in view, for the boss bar and the music. */
  boss(): MobView | null { for (const m of this.mobs) if (m.active && m.boss) return m; return null; }
  get mobCount(): number { let n = 0; for (const m of this.mobs) if (m.active) n++; return n; }
  get projCount(): number { let n = 0; for (const p of this.projs) if (p.active) n++; return n; }
  get dropCount(): number { let n = 0; for (const d of this.drops) if (d.active) n++; return n; }

  /** The view work of one tick: corpses, continuous emitters, mark flicker, trails, drop light. */
  private effects(dt: number): void {
    const g = this.g, w = g.world, ps = g.particles, R = Math.random;
    this.mobRender.tickCorpses(dt);
    for (const v of this.mobs) {
      if (!v.active) continue;
      const d = v.def, b = v.boss;
      if (b && d.boss && w.ready(Math.floor(v.px), Math.floor(v.pz))) {
        // entrance: dust kicks up round a walking or burrowing boss while it grows in
        if (v.age < 1.4 && d.boss.move !== 'hover' && d.boss.move !== 'fly') for (let i = 0; i < 4; i++) { const an = R() * 6.283, r = v.hw * (0.6 + R() * 0.8); ps.spawn(v.px + Math.cos(an) * r, v.py + 0.1, v.pz + Math.sin(an) * r, Math.cos(an) * 2, 1 + R() * 2, Math.sin(an) * 2, 0.8, 0.22, 0xc8b89a, 0, 3); }
        const f = b.fxm, cx = v.px, cz = v.pz;
        if (f & FXM.weaveDust) { const gy = groundY(w, cx, cz, g.player.y + 10); if (R() < dt * 14) ps.spawn(cx, gy + 0.1, cz, (R() - 0.5) * 3, 2 + R() * 2, (R() - 0.5) * 3, 0.6, 0.16, 0xe4d39a, 0, 10); }
        if (f & FXM.telegraph && R() < dt * 40) { const an = R() * 6.283, r = v.hw + 1.5; ps.spawn(cx + Math.cos(an) * r, v.py + R() * v.h, cz + Math.sin(an) * r, -Math.cos(an) * 3, 0.5, -Math.sin(an) * 3, 0.4, 0.14, TELEGRAPH[b.kind] ?? 0xffffff, 1, 0); }
        if (f & FXM.chargeDust && R() < dt * 40) ps.spawn(cx, v.py + 0.2, cz, (R() - 0.5) * 4, 2, (R() - 0.5) * 4, 0.5, 0.18, 0xc8c0b0, 0, 8);
        if (f & FXM.sight) { const cy = v.py + (d.boss.cast ?? v.h * 0.6); for (let i = 1; i < 12; i++) if (R() < dt * 20) ps.spawn(cx + b.ax * i * 1.6, cy + b.ay * i * 1.6, cz + b.az * i * 1.6, 0, 0, 0, 0.25, 0.1, 0xff5a3a, 1, 0); }
        if (f & FXM.burrowDust) { const gy = groundY(w, cx, cz, g.player.y + 10); if (R() < dt * 60) ps.spawn(cx + (R() - 0.5) * 2, gy + 0.1, cz + (R() - 0.5) * 2, 0, 3, 0, 0.5, 0.2, 0xe4d39a, 0, 9); }
      }
      // shades come apart in direct sun
      if ((d.key === 'gloomshade' || d.key === 'moonspawn') && v.hurt > 0 && g.gfx.dayAmt > 0.75 && DIMS[g.dim].hasSky && (w.getLight(Math.floor(v.x), Math.floor(v.y + 1), Math.floor(v.z)) >> 4) >= 14 && R() < dt * 20) ps.spawn(v.x, v.y + R() * v.h, v.z, 0, 1.5, 0, 0.6, 0.12, 0x5a4a8a, 0.3, -1);
    }
    // marked ground flickers until its strike falls
    for (let i = 0; i < this.marks.length; i++) {
      const k = this.marks[i];
      if (k.fresh) { k.fresh = false; continue; }
      k.t -= dt;
      const gy = floorNear(w, k.x, k.z, g.player.y);
      if (R() < dt * 30) ps.spawn(k.x + (R() - 0.5) * 1.2, gy + 0.1, k.z + (R() - 0.5) * 1.2, 0, 2.5, 0, 0.4, 0.14, 0xff5a3a, 1, 0);
      if (k.t <= 0) { this.marks.splice(i, 1); i--; }
    }
    for (const p of this.projs) if (p.active && p.def.trail !== undefined && R() < dt * 30) ps.spawn(p.x, p.y, p.z, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, 0.35, p.def.size * 0.5, p.def.trail, p.def.glow, 0);
    for (const v of this.drops) {
      if (!v.active) continue;
      const l = w.getLight(Math.floor(v.x), Math.floor(v.y + 0.3), Math.floor(v.z));
      v.light.set((l >> 4) / 15, (l & 15) / 15, 0, 0);
    }
  }

  /** Take creatures and players from the session's snapshots, and projectiles and drops from its `fx`. The store is
   *  then filled by netTick, once a tick. */
  connect(s: Session): void {
    const net = this.net = new Net(s.local);
    s.onSnapshot((b) => { const snap = decodeSnapshot(b); if (snap) this.onSnapshot(snap); });
    // the welcome's tick starts the estimate; only snapshot arrivals move it, since the welcome may have waited for storage
    s.on('welcome', (m) => { this.clearNet(); net.slot = m.you.slot; net.dim = m.dim; net.last = -1; net.head = null; net.offs.length = net.devs.length = 0; net.prevMs = -1; net.est = m.tick; });
    s.on('tp', (m) => { if (m.dim !== net.dim) { this.clearNet(); net.dim = m.dim; } });
    s.on('pl', (m) => { if (m.del) for (const slot of m.del) { const tr = net.players.get(slot); if (tr) { tr.v.active = false; net.players.delete(slot); } } });
    s.on('rtt', (m) => { const rt = this.clock() - m.c; if (rt >= 0 && rt < 10000) net.half = net.half ? net.half + (rt * TPMS / 2 - net.half) * 0.25 : rt * TPMS / 2; });
    s.on('fx', (m) => { for (const ev of m.l) this.onWireFx(ev); });
  }

  /** Ticks the drawn moment lies behind the host's (4.4): fixed on a local transport, else twice the snapshot spacing plus the
   *  95th percentile of how far arrivals have strayed from it over the last 2 s, within INTERP_MIN..INTERP_MAX. */
  get delay(): number {
    const net = this.net;
    if (!net || net.local) return INTERP_LOCAL;
    const d = net.devs.map((q) => q.dev).sort((a, b) => a - b), j = d.length ? d[Math.max(0, Math.ceil(d.length * 0.95) - 1)] : 0;
    return Math.min(INTERP_MAX, Math.max(INTERP_MIN, 2 * SNAP_EVERY + j));
  }
  /** The host's tick as estimated now: from the least delayed arrival of the last 2 s and half the round trip; never lower than before. */
  serverTick(now = this.clock()): number {
    const net = this.net;
    if (!net) return 0;
    let off = -Infinity;
    for (const q of net.offs) if (q.off > off) off = q.off;
    if (off > -Infinity) net.est = Math.max(net.est, now * TPMS + off + net.half);
    return net.est;
  }
  /** The moment creatures and players were last placed at, in host ticks. */
  get renderTick(): number { return this.net ? this.net.rt : 0; }
  /** The receiver's own state from the newest snapshot. */
  get head(): Snapshot | null { return this.net ? this.net.head : null; }

  private onSnapshot(s: Snapshot): void {
    const net = this.net!, now = this.clock();
    if (s.tick < net.last) return;
    if (s.tick === net.last) {
      // the host's clock stands still (a solo world behind a loading screen): its tick is this one now, whatever the
      // estimate had run on to, and the arrivals before this one say nothing of when it will move again
      net.offs.length = 0; net.offs.push({ ms: now, off: s.tick - now * TPMS });
      net.devs.length = 0; net.prevMs = now; net.prevTick = s.tick;
      net.est = s.tick; net.head = s;
      return;
    }
    // timing: the arrival's offset from the host's clock, and its spacing against the spacing of the ticks
    net.offs.push({ ms: now, off: s.tick - now * TPMS });
    if (net.prevMs >= 0) net.devs.push({ ms: now, dev: Math.abs((now - net.prevMs) * TPMS - (s.tick - net.prevTick)) });
    net.prevMs = now; net.prevTick = s.tick;
    while (net.offs.length > 1 && net.offs[0].ms < now - WINDOW_MS) net.offs.shift();
    while (net.devs.length && net.devs[0].ms < now - WINDOW_MS) net.devs.shift();
    net.last = s.tick; net.head = s;
    for (const q of s.players) {
      if (q.slot === net.slot) continue;
      let tr = net.players.get(q.slot);
      if (!tr) { tr = new PlayerTrack(this.freePlayer()); tr.v.active = true; tr.v.slot = q.slot; net.players.set(q.slot, tr); }
      tr.push(s.tick, q.x, q.y, q.z, q.yaw, q.pitch, q.flags, q.hp, q.dig, null);
    }
    for (const q of s.mobs) {
      const def = MOB_LIST[q.def];
      if (!def) continue;
      let tr = net.mobs.get(q.id);
      // an id can come back as something else once its creature is gone
      if (tr && tr.v.def !== def) { tr.v.active = false; net.mobs.delete(q.id); tr = undefined; }
      if (!tr) { tr = new MobTrack(this.freeMob()); this.initMob(tr.v, q.id, def, q.flags, q.boss); net.mobs.set(q.id, tr); }
      tr.push(s.tick, q.x, q.y, q.z, q.yaw, 0, q.flags, q.boss ? q.boss.hp : 0, 0, q.boss);
    }
    // gone from two snapshots in a row: out of view, with no corpse (a death comes as `md`)
    for (const [slot, tr] of net.players) if (tr.seen !== s.tick && ++tr.miss >= 2) { tr.v.active = false; net.players.delete(slot); }
    for (const [id, tr] of net.mobs) if (tr.seen !== s.tick && !tr.dying && ++tr.miss >= 2) { tr.v.active = false; net.mobs.delete(id); }
  }

  private freeMob(): MobView { for (const v of this.mobs) if (!v.active) return v; const v = new MobView(); this.mobs.push(v); return v; }
  private freePlayer(): PlayerView { for (const v of this.players) if (!v.active) return v; const v = new PlayerView(); this.players.push(v); return v; }
  private freeProj(): ProjView { for (const v of this.projs) if (!v.active) return v; const v = new ProjView(); this.projs.push(v); return v; }
  private freeDrop(): DropView { for (const v of this.drops) if (!v.active) return v; const v = new DropView(); this.drops.push(v); return v; }

  private initMob(v: MobView, id: number, def: MobDef, flags: number, b: SnapBoss | null): void {
    Object.assign(v, new MobView());
    v.active = true; v.id = id; v.def = def; v.hw = def.hw; v.h = def.h; v.hp = v.maxHp = def.hp;
    v.noclip = def.ai === 'minion' || (!!def.boss && def.boss.move !== 'walk');
    // a creature first seen when it is no longer new does not grow in again
    v.age = b ? b.age : flags & MF_FRESH ? 0 : 10;
  }

  /** Once a client tick: creatures and players placed at the moment drawn, projectiles and drops flown, effects. */
  netTick(dt: number): void {
    const net = this.net;
    if (!net) return;
    const rt = net.rt = this.serverTick() - this.delay;
    for (const [id, tr] of net.mobs) {
      if (tr.n) this.placeMob(tr, rt, dt);
      const d = tr.dying;
      if (d && rt >= d.at) {
        // the creature as it is drawn at the moment it died
        if (d.how === 1) this.mobRender.corpse(tr.v);
        tr.v.active = false; net.mobs.delete(id);
      }
    }
    for (const tr of net.players.values()) if (tr.n) this.placePlayer(tr, rt);
    this.flyProjs(dt);
    this.flyDrops(dt);
    this.effects(dt);
  }

  private placeMob(tr: MobTrack, rt: number, dt: number): void {
    const v = tr.v, o = sample(tr, rt, pose), f = tr.f[o.a], vb0 = v.boss;
    const jump = !tr.placed || ((f ^ tr.lf) & MF_TP) !== 0;
    v.px = v.x; v.py = v.y; v.pz = v.z; v.pry = v.ry; v.popen = v.open;
    v.x = o.x; v.y = o.y; v.z = o.z; v.yaw = o.yaw;
    const fell = v.vy;
    v.vy = o.vy; v.moving = Math.hypot(o.vx, o.vz); v.anim += v.moving * dt * (vb0 || v.def.boss ? 0.9 : 2.4);
    v.ry += wrap(v.yaw - v.ry) * Math.min(1, dt * (v.def.boss ? 6 : 12));
    v.onGround = (f & MF_GROUND) !== 0;
    v.hurt = f & MF_HURT && !(tr.lf & MF_HURT) ? 0.22 : Math.max(0, v.hurt - dt);
    v.atk = f & MF_ATK && !(tr.lf & MF_ATK) ? 0.3 : Math.max(0, v.atk - dt);
    v.flee = f & MF_FLEE ? 1 : 0;
    v.age += dt;
    if (v.sq > 0) v.sq = Math.max(0, v.sq - dt * 6);
    if (fell < -4 && v.onGround) v.sq = 1;
    const b = tr.boss[o.a], bb = o.b >= 0 ? tr.boss[o.b] : null, k = o.k;
    if (b) {
      const mix = (key: 'wind' | 'strike' | 'pose' | 'aim' | 'rage' | 'open' | 'scale' | 'pitch' | 'roll'): number => (bb ? b[key] + (bb[key] - b[key]) * k : b[key]);
      const spec = v.def.boss;
      let vb = vb0;
      if (!vb) {
        const seg = spec?.segments ?? 0, segs = seg ? new Float32Array(seg * 3) : null;
        vb = v.boss = { phase: 0, kind: '', wind: 0, strike: 0, pose: 0, aim: 0, rage: 0, pitch: 0, roll: 0, spin: 0, ax: 0, ay: 0, az: 1, fxm: 0, segs, ppose: 0, pwind: 0, pstrike: 0, paim: 0, ppitch: 0, proll: 0, pspin: 0, psegs: segs ? new Float32Array(segs.length) : null };
      }
      vb.ppose = vb.pose; vb.pwind = vb.wind; vb.pstrike = vb.strike; vb.paim = vb.aim; vb.ppitch = vb.pitch; vb.proll = vb.roll; vb.pspin = vb.spin;
      if (vb.segs && vb.psegs) vb.psegs.set(vb.segs);
      vb.phase = b.phase; vb.kind = BOSS_KINDS[b.kind] ?? ''; vb.fxm = b.fxm; vb.ax = b.ax; vb.ay = b.ay; vb.az = b.az;
      vb.wind = mix('wind'); vb.strike = mix('strike'); vb.pose = mix('pose'); vb.aim = mix('aim'); vb.rage = mix('rage'); vb.pitch = mix('pitch'); vb.roll = mix('roll');
      vb.spin += dt * (spec?.spin ? spec.spin[0] + spec.spin[1] * vb.rage : 1);
      v.open = mix('open'); v.scale = mix('scale'); v.hp = b.hp; v.maxHp = b.maxHp;
      if (vb.segs) {
        followSegs(vb.segs, v.x, v.y, v.z);
        // a segment that has just been placed has nowhere to blend from
        if (vb.psegs) for (let i = 0; i < vb.segs.length; i += 3) if (vb.psegs[i] === 0 && vb.psegs[i + 1] === 0 && vb.psegs[i + 2] === 0) { vb.psegs[i] = vb.segs[i]; vb.psegs[i + 1] = vb.segs[i + 1]; vb.psegs[i + 2] = vb.segs[i + 2]; }
      }
    }
    if (jump) { v.px = v.x; v.py = v.y; v.pz = v.z; v.ry = v.pry = v.yaw; v.popen = v.open; if (v.boss && v.boss.segs && v.boss.psegs) v.boss.psegs.set(v.boss.segs); }
    tr.lf = f; tr.placed = true;
    if (this.g.world.ready(Math.floor(v.x), Math.floor(v.z))) this.mobRender.sampleLight(v, jump && v.ls < 0 ? 1 : Math.min(1, dt * 10));
  }

  private placePlayer(tr: PlayerTrack, rt: number): void {
    const v = tr.v, o = sample(tr, rt, pose), f = tr.f[o.a];
    const jump = !tr.placed || ((f ^ tr.lf) & PF_TP) !== 0;
    v.px = v.x; v.py = v.y; v.pz = v.z;
    v.x = o.x; v.y = o.y; v.z = o.z; v.yaw = o.yaw; v.pitch = o.pitch; v.moving = Math.hypot(o.vx, o.vz);
    v.flags = f; v.hp = tr.hp[o.a]; v.dig = tr.dig[o.a];
    if (jump) { v.px = v.x; v.py = v.y; v.pz = v.z; }
    tr.lf = f; tr.placed = true;
  }

  /** The entity events of a connection's `fx` (the rest are FxPlay's): projectiles and drops start, change and end here,
   *  a creature's removal waits for the moment drawn to reach it, and a boss's marks are kept to flicker. */
  onWireFx(ev: Fx): void {
    const net = this.net, g = this.g;
    if (!net) return;
    switch (ev[0]) {
      case 'ps': {
        const [, id, kind, x, y, z, vx, vy, vz, life, , cseq] = ev;
        let v: ProjView | null = null;
        // the shooter's own shot takes the place of the stand-in it flew for that `fire`
        if (cseq) for (const q of this.projs) if (q.active && q.ghost === cseq) { v = q; break; }
        v = v ?? net.projs.get(id) ?? this.freeProj();
        v.active = true; v.id = id; v.ghost = 0; v.def = PROJECTILES[PROJ_KEYS[kind]] ?? PROJECTILES.arrow;
        v.x = v.px = x; v.y = v.py = y; v.z = v.pz = z; v.vx = vx; v.vy = vy; v.vz = vz; v.life = life;
        net.projs.set(id, v);
        break;
      }
      case 'pe': {
        const v = net.projs.get(ev[1]);
        // one that has already ended here by itself has nothing left to show
        if (!v) return;
        net.projs.delete(ev[1]);
        if (ev[5]) this.impact(v, ev[2], ev[3], ev[4]);
        v.active = false;
        break;
      }
      case 'da': {
        const [, id, k, n, m, x, y, z, vx, vy, vz, delay] = ev;
        let v = net.drops.get(id);
        if (!v || v.k !== k) {
          if (v) this.dropRender.hide(v);
          v = this.freeDrop();
          this.dropRender.show(v, k);
          v.age = 0; v.fly = 0; v.onGround = false;
        }
        v.active = true; v.id = id; v.k = k; v.n = n; v.m = m; v.x = v.px = x; v.y = v.py = y; v.z = v.pz = z; v.vx = vx; v.vy = vy; v.vz = vz; v.delay = delay;
        const l = g.world.getLight(Math.floor(x), Math.floor(y + 0.3), Math.floor(z));
        v.light.set((l >> 4) / 15, (l & 15) / 15, 0, 0);
        net.drops.set(id, v);
        break;
      }
      case 'dn': { const v = net.drops.get(ev[1]); if (v) v.n = ev[2]; break; }
      case 'dd': {
        const v = net.drops.get(ev[1]);
        if (!v) return;
        net.drops.delete(ev[1]);
        if (ev[2]) { v.fly = ev[2]; v.flyT = FLY_SECONDS; } else this.dropRender.hide(v);
        break;
      }
      case 'md': {
        const tr = net.mobs.get(ev[1]);
        this.marks = this.marks.filter((q) => q.id !== ev[1]);
        // the host's now is ahead of the moment drawn: the creature goes when that moment gets there
        if (tr) tr.dying = { how: ev[2], at: net.last };
        break;
      }
      case 'mk': for (let i = 2; i + 2 < ev.length; i += 3) this.marks.push({ id: ev[1], x: ev[i] as number, z: ev[i + 1] as number, t: ev[i + 2] as number, fresh: true }); break;
    }
  }

  /** Ghosts: a shooter's shot, flown at once, until the host's `ps` for it arrives or GHOST_SECONDS pass without one. */
  ghost(seq: number, kind: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, speed?: number): void {
    const d = PROJECTILES[kind] ?? PROJECTILES.arrow, sp = speed || d.speed, l = Math.hypot(dx, dy, dz) || 1, v = this.freeProj();
    v.active = true; v.id = 0; v.ghost = seq; v.def = d; v.life = GHOST_SECONDS;
    v.x = v.px = x; v.y = v.py = y; v.z = v.pz = z; v.vx = (dx / l) * sp; v.vy = (dy / l) * sp; v.vz = (dz / l) * sp;
  }

  /** Bodies: a creature that is not a minion, or another player, overlaps the block cell as this client sees them now. */
  blocked(x: number, y: number, z: number): boolean {
    const E = 1e-4, over = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean =>
      x1 > x + E && x0 < x + 1 - E && y1 > y + E && y0 < y + 1 - E && z1 > z + E && z0 < z + 1 - E;
    for (const m of this.mobs) if (m.active && m.def.ai !== 'minion' && over(m.x - m.hw, m.y, m.z - m.hw, m.x + m.hw, m.y + m.h, m.z + m.hw)) return true;
    for (const p of this.players) if (p.active && over(p.x - p.hw, p.y, p.z - p.hw, p.x + p.hw, p.y + p.h, p.z + p.hw)) return true;
    return false;
  }

  /** One tick of every projectile flown here: gravity, the ground, the end of its life (4.6: the host's flight, without the hits). */
  private flyProjs(dt: number): void {
    const w = this.g.world;
    for (const v of this.projs) {
      if (!v.active) continue;
      v.px = v.x; v.py = v.y; v.pz = v.z;
      v.life -= dt;
      if (v.life <= 0) { this.endProj(v); continue; }
      v.vy -= v.def.gravity * dt;
      const sx = v.vx * dt, sy = v.vy * dt, sz = v.vz * dt, len = Math.hypot(sx, sy, sz) || 1e-6;
      raycast(w, v.x, v.y, v.z, sx / len, sy / len, sz / len, len, ray, false, true);
      const t = ray.hit ? ray.dist : len;
      v.x += (sx / len) * t; v.y += (sy / len) * t; v.z += (sz / len) * t;
      if (ray.hit) { this.impact(v, v.x, v.y, v.z); this.endProj(v); }
    }
  }
  private endProj(v: ProjView): void { v.active = false; if (!v.ghost && this.net) this.net.projs.delete(v.id); }
  /** The puff where a shot stops. */
  private impact(v: ProjView, x: number, y: number, z: number): void {
    const ps = this.g.particles, R = Math.random, d = v.def;
    if (d.trail !== undefined && R() < (1 / 60) * 30) ps.spawn(x, y, z, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, 0.35, d.size * 0.5, d.trail, d.glow, 0);
    for (let i = 0; i < 5; i++) ps.spawn(x, y, z, (R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4, 0.35, d.size * 0.45, d.color, d.glow, 9);
  }

  /** One tick of every drop: it falls and comes to rest as the host's does, or flies to the player who took it. */
  private flyDrops(dt: number): void {
    const net = this.net!, g = this.g, w = g.world;
    for (const v of this.drops) {
      if (!v.active) continue;
      v.px = v.x; v.py = v.y; v.pz = v.z;
      v.age += dt;
      if (v.fly) {
        const to = v.fly === net.slot ? g.player : net.players.get(v.fly)?.v, k = Math.min(1, dt / Math.max(dt, v.flyT));
        v.flyT -= dt;
        if (!to || v.flyT <= 0) { this.dropRender.hide(v); continue; }
        v.x += (to.x - v.x) * k; v.y += (to.y + 0.8 - v.y) * k; v.z += (to.z - v.z) * k;
        continue;
      }
      if (v.delay > 0) v.delay -= dt;
      if (!w.ready(Math.floor(v.x), Math.floor(v.z))) continue;
      v.vy = Math.max(v.vy - 26 * dt, -40);
      moveBody(w, v, v.vx * dt, v.vy * dt, v.vz * dt);
      if (v.onGround) { v.vx *= Math.max(0, 1 - 10 * dt); v.vz *= Math.max(0, 1 - 10 * dt); }
    }
  }

  /** Everything forgotten: a new connection, or another realm. */
  private clearNet(): void {
    const net = this.net;
    this.marks.length = 0; this.mobRender.clearCorpses();
    for (const v of this.mobs) v.active = false;
    for (const v of this.players) v.active = false;
    for (const v of this.projs) v.active = false;
    for (const v of this.drops) this.dropRender.hide(v);
    if (net) { net.mobs.clear(); net.players.clear(); net.projs.clear(); net.drops.clear(); }
  }

  render(batch: BoxBatch, alpha: number, time: number): void {
    this.mobRender.render(batch, this.mobs, alpha, time);
    renderProjs(batch, this.projs, this.g.world, alpha);
  }
  renderDrops(alpha: number): void { this.dropRender.render(this.drops, alpha); }
}
