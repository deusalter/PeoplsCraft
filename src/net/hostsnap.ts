// The host's half of everything that moves: the sink the simulation speaks into, turned into what each
// connection is sent. State messages and fx wait per connection until the host flushes them in the
// order of 4.1; the snapshot of a connection is built straight from the sims on its tick, record by
// record, and skipped while the connection's output is backed up.
import type { Fx, Scope, Sink } from '../sim/fx';
import { defIndex, type Mob } from '../sim/mobs';
import type { SimPlayer } from '../sim/player';
import { STEP } from '../sim/clock';
import type { Sim } from '../sim/sim';
import { snapOrigin } from './codec';
import { Interest } from './interest';
import { BUF_SNAP, bossKind, FRESH_SECONDS, HURT_SECONDS, MF_ATK, MF_FLEE, MF_FRESH, MF_GROUND, MF_HURT, MF_TALK, MF_TP, PF_AWAY, PF_DEAD, PF_DIG, PF_FLY,
  PF_GROUND, PF_HURT, PF_LOADING, PF_SLEEP, PF_SNEAK, PF_SPRINT, PF_SWING_SHIFT, PF_TP, PF_USING, PF_WATER, type S2C, SELF_DEAD, SELF_LOADING, SELF_SLEEPING,
  SNAP_EVERY, SWEEP_EVERY } from './protocol';
import { SnapWriter } from './snapshot';
import type { Conn } from './transport';

/** One attached connection: its player, what waits to be sent to it, and what it has been told. */
/** `fxDim`, one per entry of `fx`: the realm the event belongs to, or -1 for one that is the player's wherever they are. */
interface Link { c: Conn; p: SimPlayer; state: S2C[]; fx: Fx[]; fxDim: number[]; known: Interest }

/** Events that name something of a realm's interest sets, whatever scope they were sent under. */
const REALM_FX = new Set<Fx[0]>(['ps', 'pe', 'da', 'dn', 'dd', 'md', 'mk', 'dg', 'pg']);

const HURT_TICKS = HURT_SECONDS / STEP;

/** The PF_ bits of another player as a snapshot shows it. */
export function playerFlags(sim: Sim, q: SimPlayer): number {
  const b = q.body;
  return (b.onGround ? PF_GROUND : 0) | (b.sprinting ? PF_SPRINT : 0) | (b.sneaking ? PF_SNEAK : 0) | (b.flying ? PF_FLY : 0) | (b.inWater ? PF_WATER : 0)
    | (q.stats.dead ? PF_DEAD : 0) | (q.sleeping ? PF_SLEEP : 0) | (q.dig ? PF_DIG : 0) | ((q.swingSeq & 3) << PF_SWING_SHIFT)
    | (sim.tick - q.hurtTick < HURT_TICKS ? PF_HURT : 0) | (q.loading ? PF_LOADING : 0) | (q.tp & 1 ? PF_TP : 0) | (q.usingItem ? PF_USING : 0) | (q.stalled ? PF_AWAY : 0);
}
/** The MF_ bits of a creature, without MF_BOSS (the writer sets it with the extension). */
export function mobFlags(m: Mob): number {
  return (m.onGround ? MF_GROUND : 0) | (m.hurt > 0 ? MF_HURT : 0) | (m.atk > 0 ? MF_ATK : 0) | (m.flee > 0 ? MF_FLEE : 0) | (m.tpn & 1 ? MF_TP : 0)
    | (m.talk > 0 ? MF_TALK : 0) | (m.age < FRESH_SECONDS ? MF_FRESH : 0);
}

export class SnapService implements Sink {
  private links: Link[] = [];
  private writer = new SnapWriter();
  private mobBuf: Mob[] = []; private playerBuf: SimPlayer[] = [];

  constructor(readonly sim: Sim) {}

  /** A connection bound to its player: nothing it was told before counts any more (4.2, `bind`). */
  attach(c: Conn, p: SimPlayer): void {
    this.detach(c);
    const known = new Interest(this.sim.opt.solo);
    known.reset(p.dim);
    this.links.push({ c, p, state: [], fx: [], fxDim: [], known });
  }
  detach(c: Conn): void { const i = this.links.findIndex((l) => l.c === c); if (i >= 0) this.links.splice(i, 1); }

  // ---- Sink ----
  emit(to: Scope, ev: Fx): void {
    const realm = 'dim' in to || REALM_FX.has(ev[0]);
    const push = (l: Link): void => { l.fx.push(ev); l.fxDim.push(realm ? l.p.dim : -1); };
    switch (ev[0]) {
      case 'ps': { const id = ev[1], x = ev[3], z = ev[5], own = 'p' in to; this.each(to, (l) => { if (l.known.takePs(id, x, z, l.p, own)) push(l); }); break; }
      case 'pe': { const id = ev[1]; this.each(to, (l) => { if (l.known.takePe(id)) push(l); }); break; }
      case 'da': { const id = ev[1], x = ev[5], z = ev[7]; this.each(to, (l) => { if (l.known.takeDa(id, x, z, l.p)) push(l); }); break; }
      case 'dn': { const id = ev[1]; this.each(to, (l) => { if (l.known.knowsDrop(id)) push(l); }); break; }
      case 'dd': { const id = ev[1]; this.each(to, (l) => { if (l.known.takeDd(id)) push(l); }); break; }
      case 'md': { const id = ev[1]; this.each(to, (l) => { if (l.known.takeMd(id)) push(l); }); break; }
      default: this.each(to, push);
    }
  }
  send(slot: number, m: S2C): void { for (const l of this.links) if (l.p.slot === slot) l.state.push(m); }
  broadcast(m: S2C): void { for (const l of this.links) l.state.push(m); }

  private each(to: Scope, fn: (l: Link) => void): void {
    for (const l of this.links) {
      const p = l.p;
      if ('all' in to) { /* everyone */ }
      else if ('p' in to) { if (p.slot !== to.p) continue; }
      else {
        if (p.dim !== to.dim || p.slot === to.not) continue;
        // a solo world plays its positional fx from anywhere in the realm, as the game did before the wire (D21 (e))
        if ('r' in to && !this.sim.opt.solo) { const b = p.body; if ((b.x - to.x) ** 2 + (b.y - to.y) ** 2 + (b.z - to.z) ** 2 > to.r * to.r) continue; }
      }
      this.sync(l);
      fn(l);
    }
  }
  /** A player in another realm than the sets were kept for has a client that has emptied its store (4.3, `tp`). */
  private sync(l: Link): void {
    if (l.known.dim === l.p.dim) return;
    const old = l.known.dim;
    l.known.reset(l.p.dim);
    // what was queued for the realm just left would reach a client that has emptied its store for the new one, and stay there
    if (!l.fxDim.includes(old)) return;
    const fx: Fx[] = [], at: number[] = [];
    for (let i = 0; i < l.fx.length; i++) if (l.fxDim[i] !== old) { fx.push(l.fx[i]); at.push(l.fxDim[i]); }
    l.fx = fx; l.fxDim = at;
  }
  private link(c: Conn): Link | null { for (const l of this.links) if (l.c === c) return l; return null; }

  // ---- the three calls of the send order (3.7): state, then (the chunk service's `b`), fx, (`ce`), snapshot ----
  flushState(c: Conn): void {
    const l = this.link(c);
    if (!l || !l.state.length) return;
    // a message is handed on by reference on the in-thread transport: the queue is replaced, never refilled
    const q = l.state;
    l.state = [];
    for (const m of q) c.send(m);
  }
  flushFx(c: Conn): void {
    const l = this.link(c);
    if (!l) return;
    this.sync(l);
    if ((this.sim.tick + c.id) % SWEEP_EVERY === 0) l.known.sweep(this.sim.realms[l.p.dim], l.p, l.fx);
    if (!l.fx.length) return;
    const q = l.fx;
    l.fx = []; l.fxDim = [];
    c.send({ t: 'fx', l: q });
  }
  flushSnap(c: Conn, tick: number): void {
    if ((tick + c.id) % SNAP_EVERY !== 0 || c.buffered > BUF_SNAP) return;
    const l = this.link(c);
    if (!l) return;
    this.sync(l);
    c.sendBin(this.build(l));
  }

  private build(l: Link): ArrayBuffer {
    const sim = this.sim, p = l.p, b = p.body, st = p.stats, realm = sim.realms[p.dim], w = this.writer, tick = sim.tick;
    const ox = snapOrigin(b.x), oz = snapOrigin(b.z);
    w.begin({ flags: (st.dead ? SELF_DEAD : 0) | (p.loading ? SELF_LOADING : 0) | (p.sleeping ? SELF_SLEEPING : 0), tick, ackMove: p.moveSeq, tp: p.tp,
      hunger: st.hunger, ox, oz, hp: st.hp, mana: st.mana });
    for (const q of l.known.takePlayers(realm, p, this.playerBuf)) {
      const qb = q.body, d = q.dig;
      w.player(q.slot, qb.x, qb.y, qb.z, qb.yaw, qb.pitch, playerFlags(sim, q), q.stats.maxHp > 0 ? q.stats.hp / q.stats.maxHp : 0,
        d ? (d.bt > 0 ? Math.min(1, ((tick - d.t0) * STEP) / d.bt) : 1) : 0);
    }
    for (const m of l.known.takeMobs(realm, p, ox, oz, this.mobBuf)) {
      w.mob(m.id, defIndex(m.def), mobFlags(m), m.x, m.y, m.z, m.yaw);
      const s = m.boss;
      if (s) w.boss({ hp: m.hp, maxHp: m.maxHp, phase: Math.max(0, s.phase), kind: bossKind(s.kind), running: s.atk !== null, wind: s.wind, strike: s.strike,
        pose: s.pose, aim: s.aim, rage: s.rage, open: m.open, scale: m.scale, pitch: s.pitch, roll: s.roll, ax: s.ax, ay: s.ay, az: s.az, age: m.age, fxm: s.fxm });
    }
    return w.end();
  }
}
