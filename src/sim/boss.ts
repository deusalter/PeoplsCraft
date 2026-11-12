// Boss brain. Interprets the phase scripts in data/mobs.ts: picks attacks from the current
// phase, telegraphs them, and runs each attack primitive as a small timed state machine.
import { T_SOLID } from '../data/blocks';
import type { Attack } from '../data/mobs';
import { BURST } from './fx';
import { followSegs } from './mobhit';
import { type Mob, defIndex } from './mobs';
import { moveBody } from './physics';
import { hurtPlayer } from './player';
import type { Realm } from './realm';
import type { VoxelRead } from './voxels';

export interface BossState {
  phase: number; cd: number; atk: Attack | null; t: number; step: number; last: number;
  ax: number; ay: number; az: number;      // attack direction / anchor
  altar: [number, number, number]; pose: number; segs: Float32Array | null; orbit: number;
  marks: number[];                          // pending rain strikes: x, z, time, projectile, damage
  /** Body language read by the view. kind: type of the current or last attack. wind: 0..1 through its wind-up, held while a
   *  sustained attack is delivered. strike: 1 at each release, decaying. aim: 1 while an aimed attack (beam, volley) runs.
   *  rage: eased phase fraction. pitch, roll: body attitude. spin: integrated angle of orbiting pieces. openT: the jaw
   *  target `m.open` eases toward. foot, sndT: last footfall side, and when a footfall or cast sound last played. */
  kind: string; wind: number; strike: number; aim: number; rage: number; pitch: number; roll: number; lyaw: number; spin: number; openT: number; foot: number; sndT: number;
  /** The continuous particle emitters that ran this tick (FXM bits). The view draws them; the sim only says which. */
  fxm: number;
}
export const FXM = { telegraph: 1, sight: 2, chargeDust: 4, weaveDust: 8, burrowDust: 16 } as const;

export function newBossState(m: Mob, rnd: () => number): BossState {
  const seg = m.def.boss!.segments ?? 0, spin = rnd() * 6.283;
  return { phase: -1, cd: 2.2, atk: null, t: 0, step: 0, last: -1, ax: 0, ay: 0, az: 1, altar: [m.x, m.y, m.z], pose: 0, segs: seg ? new Float32Array(seg * 3).fill(0) : null, orbit: rnd() * 6.283, marks: [],
    kind: '', wind: 0, strike: 0, aim: 0, rage: 0, pitch: 0, roll: 0, lyaw: m.yaw, spin, openT: 0, foot: 1, sndT: 0, fxm: 0 };
}

export function groundY(w: VoxelRead, x: number, z: number, from: number): number {
  let y = Math.floor(from);
  for (let i = 0; i < 40 && y > 1; i++, y--) if (T_SOLID[w.getBlock(Math.floor(x), y, Math.floor(z))]) return y + 1;
  return from;
}
/** Top of the floor at (x, z) nearest the height `py`: climbs out of a hillside, and under a roof finds the floor, not the rock above. */
export function floorNear(w: VoxelRead, x: number, z: number, py: number): number {
  const bx = Math.floor(x), bz = Math.floor(z);
  let y = Math.floor(py + 1);
  if (T_SOLID[w.getBlock(bx, y, bz)]) { for (let i = 0; i < 10 && T_SOLID[w.getBlock(bx, y, bz)]; i++) y++; return y; }
  for (let i = 0; i < 8; i++) if (T_SOLID[w.getBlock(bx, y + 1 + i, bz)]) return groundY(w, x, z, y + i);
  return groundY(w, x, z, py + 8);
}
/** Height of the first solid cell above the floor `gy` at (x, z), or gy + 99 under open sky (searches 18 cells). */
export function roofY(w: VoxelRead, x: number, z: number, gy: number): number {
  const bx = Math.floor(x), bz = Math.floor(z), y0 = Math.floor(gy);
  for (let i = 1; i <= 18; i++) if (T_SOLID[w.getBlock(bx, y0 + i, bz)]) return y0 + i;
  return gy + 99;
}
/** Wind-up length of the attacks that do not carry their own. */
const WIND: Record<string, number> = { volley: 0.5, spiral: 0.6, ring: 0.55, summon: 0.7, rain: 0.85, teleport: 0.45, burrow: 0.7 };

/** The fight is over, won or not: what the boss called up goes with it. */
export function onBossGone(realm: Realm, _m: Mob, _won: boolean): void {
  for (const q of realm.mobs.list) if (q.active && q.event && !q.boss && realm.sim.shared.events.a === null) realm.mobs.remove(q);
  realm.proj.clear();
}

export function bossTick(realm: Realm, m: Mob, dt: number): void {
  const b = m.boss!, spec = m.def.boss!, pl = m.tp!, p = pl.body, w = realm, sim = realm.sim, rnd = sim.rnd, time = sim.time;
  // where the tick began: `moving` is measured from here, and a jump moves it along
  let px = m.x, pz = m.z;
  b.fxm = 0;
  const dx = p.x - m.x, dy = p.y + 0.9 - (m.y + m.h * 0.5), dz = p.z - m.z, dist = Math.hypot(dx, dz), d3 = Math.hypot(dist, dy) || 1;
  const dmgMul = m.dmgMul;
  // leash: the fight ends if the player leaves or falls
  if (pl.stats.dead || Math.hypot(p.x - b.altar[0], p.z - b.altar[2]) > 80) {
    sim.sink.emit({ dim: realm.dim }, ['t', `${m.def.name} withdraws.`, '']); sim.sink.emit({ dim: realm.dim }, ['s', 'teleport', 0.8, 1]);
    for (const q of realm.mobs.list) if (q.active && (q.def.key === 'sproutling' || q.def.key === 'dune_mite')) realm.mobs.remove(q);
    realm.mobs.remove(m, 2); onBossGone(realm, m, false); return;
  }
  // phase changes
  const frac = m.hp / m.maxHp;
  let ph = 0;
  for (let i = 0; i < spec.phases.length; i++) if (frac <= spec.phases[i].below) ph = i;
  if (ph !== b.phase) {
    const first = b.phase < 0;
    b.phase = ph;
    const P = spec.phases[ph];
    if (!first) {
      if (P.say) sim.sink.emit({ dim: realm.dim }, ['t', P.say, '#ffb86a']);
      realm.sound('roar', 1, m.def.voice ?? 0.3, m.x, m.y, m.z); sim.sink.emit({ dim: realm.dim }, ['k', 0.5]);
      realm.burst(BURST.bossPhase, m.x, m.y + m.h * 0.5, m.z, defIndex(m.def));
      // an interrupted teleport or charge must not leave the boss shrunk or gaping
      m.scale = 1; m.open = 0; b.openT = 0;
      b.atk = P.enter ?? null; b.t = 0; b.step = 0; b.cd = 1.2;
    }
  }
  const P = spec.phases[b.phase], speed = P.speed;
  m.yaw = Math.atan2(dx, dz);
  // every attack holds a pose; a slam lets go of it at the impact so the arms stay down
  b.pose += ((b.atk && !(b.atk.t === 'slam' && b.step === 2) ? 1 : 0) - b.pose) * Math.min(1, dt * 6);
  b.strike = Math.max(0, b.strike - dt * 2.5);
  b.aim += ((b.atk && (b.atk.t === 'beam' || b.atk.t === 'volley') ? 1 : 0) - b.aim) * Math.min(1, dt * 6);
  b.rage += (b.phase / Math.max(1, spec.phases.length - 1) - b.rage) * Math.min(1, dt * 1.5);
  b.spin += dt * (spec.spin ? spec.spin[0] + spec.spin[1] * b.rage : 1);

  // pending rain strikes
  for (let i = 0; i < b.marks.length; i += 5) {
    b.marks[i + 2] -= dt;
    if (b.marks[i + 2] <= 0) {
      const mx = b.marks[i], mz = b.marks[i + 1], gy = floorNear(w, mx, mz, p.y);
      // strikes start under any roof, and are dropped where there is no room for one
      const top = roofY(w, mx, mz, gy);
      if (top - gy >= 2) realm.proj.fire(RAIN_PROJ[b.marks[i + 3]] ?? 'wardenorb', mx, Math.min(gy + 16, top - 0.6), mz, 0, -1, 0, b.marks[i + 4] * dmgMul, null, 0, 26);
      b.marks.splice(i, 5); i -= 5;
    }
  }

  // ---- movement between attacks ----
  let vx = 0, vy = 0, vz = 0;
  const moving = !b.atk || b.atk.t === 'volley' || b.atk.t === 'spiral' || b.atk.t === 'rain' || b.atk.t === 'ring' || b.atk.t === 'summon';
  if (moving) {
    b.orbit += dt * 0.5;
    if (spec.move === 'walk') {
      if (dist > m.hw + 1.2) { vx = (dx / dist) * speed; vz = (dz / dist) * speed; }
    } else if (spec.move === 'hover') {
      const want = 7 + m.hw, gy = floorNear(w, m.x, m.z, p.y), top = roofY(w, m.x, m.z, gy);
      let tx = p.x - (dx / (dist || 1)) * want + Math.cos(b.orbit) * 3, tz = p.z - (dz / (dist || 1)) * want + Math.sin(b.orbit) * 3, ty = Math.max(gy + 2.2 + Math.sin(time * 1.4) * 0.6, p.y + 1);
      // stay over the arena floor while the player is in it, and under a low roof keep the head out of the rock
      const ax = b.altar[0] + 0.5, az = b.altar[2] + 0.5, ar = Math.hypot(tx - ax, tz - az);
      if (ar > 11 && Math.hypot(p.x - ax, p.z - az) < 22) { tx = ax + ((tx - ax) / ar) * 11; tz = az + ((tz - az) / ar) * 11; }
      if (ty + m.h > top - 0.3) ty = Math.max(gy + 0.4, top - 0.3 - m.h);
      const ex = tx - m.x, ey = ty - m.y, ez = tz - m.z, el = Math.hypot(ex, ey, ez) || 1, sp = Math.min(speed, el * 2);
      vx = (ex / el) * sp; vy = (ey / el) * sp; vz = (ez / el) * sp;
    } else if (spec.move === 'fly') {
      const tx = p.x + Math.cos(b.orbit * 1.6) * 13, tz = p.z + Math.sin(b.orbit * 1.6) * 13, ty = p.y + 8 + Math.sin(b.orbit * 2.3) * 2;
      const ex = tx - m.x, ey = ty - m.y, ez = tz - m.z, el = Math.hypot(ex, ey, ez) || 1, sp = Math.min(speed, el * 2);
      vx = (ex / el) * sp; vy = (ey / el) * sp; vz = (ez / el) * sp;
      m.yaw = Math.atan2(vx, vz);
    } else {
      // burrower: weave around the player half-submerged
      const tx = p.x + Math.cos(b.orbit * 2) * 9, tz = p.z + Math.sin(b.orbit * 2) * 9, gy = groundY(w, m.x, m.z, p.y + 10);
      const ex = tx - m.x, ez = tz - m.z, el = Math.hypot(ex, ez) || 1;
      vx = (ex / el) * speed * 0.7; vz = (ez / el) * speed * 0.7; vy = (gy - 0.9 + Math.sin(time * 3) * 0.8 - m.y) * 4;
      m.yaw = Math.atan2(vx, vz); b.openT = 0.25 + Math.sin(time * 2.4) * 0.2;
      b.fxm |= FXM.weaveDust;
    }
  }

  // ---- attack selection ----
  if (!b.atk) {
    b.cd -= dt;
    if (b.cd <= 0) {
      let i = Math.floor(rnd() * P.attacks.length);
      if (i === b.last && P.attacks.length > 1) i = (i + 1) % P.attacks.length;
      b.last = i; b.atk = P.attacks[i]; b.t = 0; b.step = 0;
    }
  }
  const a = b.atk;
  if (a) b.kind = a.t;
  let wn = 0;
  const end = (): void => { b.atk = null; b.cd = P.cd[0] + rnd() * (P.cd[1] - P.cd[0]); };
  const aim = (): void => { b.ax = dx / d3; b.ay = dy / d3; b.az = dz / d3; };
  const cx = m.x, cy = m.y + (spec.cast ?? m.h * 0.6), cz = m.z;
  // aimed shots are sighted from the point they leave (which may be a head or an eye well above the body's middle); flat
  // patterns keep one height above the feet whatever the model's size
  const cdy = p.y + 0.9 - cy, cd3 = Math.hypot(dist, cdy) || 1, flatY = Math.max(m.y + 1, p.y + 0.9);
  // a boss off the ground tips its flat patterns into a shallow cone that meets the player's body at the player's distance
  const flatDy = spec.move === 'walk' ? 0 : Math.max(-1, Math.min(0, (p.y + 0.9 - flatY) / Math.max(dist, 4)));
  const telegraph = (): void => { b.fxm |= FXM.telegraph; };

  if (a) {
    b.t += dt;
    switch (a.t) {
      case 'charge': {
        if (b.t < a.windup) { wn = b.t / a.windup; telegraph(); aim(); vx = -b.ax * 2; vz = -b.az * 2; if (b.step === 0) { b.step = 1; realm.sound('growl', 1, 0.5, m.x, m.y, m.z); } }
        else if (b.t < a.windup + a.dur) {
          if (b.step < 2) { b.step = 2; b.strike = 1; }
          vx = b.ax * a.speed; vz = b.az * a.speed; vy = spec.move === 'walk' ? 0 : b.ay * a.speed;
          m.yaw = Math.atan2(vx, vz); b.openT = 1;
          if (Math.abs(dx) < m.hw + 0.7 && Math.abs(dz) < m.hw + 0.7 && Math.abs(dy) < m.h * 0.5 + 1.2) hurtPlayer(sim, pl, a.dmg * dmgMul, m.x, m.z, m.def.name, m, 9);
          b.fxm |= FXM.chargeDust;
        } else { b.openT = 0; end(); }
        break;
      }
      case 'slam': {
        if (b.t < a.windup) { wn = b.t / a.windup; telegraph(); vy = spec.move === 'walk' ? 0 : 7; if (b.step === 0 && spec.move === 'walk') { b.step = 1; m.vy = 13; } if (spec.move !== 'walk') b.step = 1; }
        else if (b.step === 1) {
          vy = -22;
          const gy = groundY(w, m.x, m.z, m.y + 2);
          if ((spec.move === 'walk' && m.onGround) || (spec.move !== 'walk' && m.y <= gy + 0.3) || b.t > a.windup + 1.6) {
            b.step = 2; b.strike = 1; realm.sound('slam', 1, 1, m.x, m.y, m.z);
            sim.sink.emit({ p: pl.slot }, ['k', Math.max(0.2, 0.9 - dist * 0.05)]);
            realm.burst(BURST.slamRing, m.x, gy + 0.2, m.z, a.radius);
            if (dist < a.radius && Math.abs(p.y - gy) < 2.6 && p.onGround) hurtPlayer(sim, pl, a.dmg * dmgMul, m.x, m.z, m.def.name, m, 10);
            if (a.ring) for (let i = 0; i < a.ring[1]; i++) { const an = (i / a.ring[1]) * 6.283; realm.proj.fire(a.ring[0], m.x, gy + 0.9, m.z, Math.cos(an), 0, Math.sin(an), a.dmg * 0.7 * dmgMul, null); }
          }
        } else if (b.t > a.windup + 0.5 && b.step === 2) end();
        break;
      }
      case 'volley': {
        const bursts = a.bursts ?? 1, gap = a.gap ?? 0.3;
        if (b.t < 0.5) { wn = b.t / 0.5; telegraph(); }
        else if (b.step < bursts && b.t >= 0.5 + b.step * gap) {
          b.step++; b.strike = 1; b.ax = dx / cd3; b.ay = cdy / cd3; b.az = dz / cd3; realm.sound('shoot', 0.9, 0.7, m.x, m.y, m.z);
          const base = Math.atan2(b.ax, b.az);
          for (let i = 0; i < a.n; i++) { const an = base + (a.n === 1 ? 0 : (i / (a.n - 1) - 0.5) * a.spread * 2), ch = Math.cos(Math.asin(Math.max(-0.9, Math.min(0.9, b.ay)))); realm.proj.fire(a.proj, cx, cy, cz, Math.sin(an) * ch, b.ay, Math.cos(an) * ch, a.dmg * dmgMul, null); }
        } else if (b.step >= bursts && b.t > 0.5 + bursts * gap + 0.3) end();
        break;
      }
      case 'spiral': {
        if (b.t < 0.6) { wn = b.t / 0.6; telegraph(); }
        else if (b.t < 0.6 + a.dur) {
          wn = 0.6; if (b.step === 0) b.strike = 1;
          const n = Math.floor((b.t - 0.6) / 0.13);
          while (b.step <= n) {
            const base = b.step * 0.13 * a.spin;
            for (let i = 0; i < a.arms; i++) { const an = base + (i / a.arms) * 6.283; realm.proj.fire(a.proj, cx, flatY, cz, Math.sin(an), flatDy, Math.cos(an), a.dmg * dmgMul, null, 0, 9); }
            if (b.step % 3 === 0) realm.sound('shoot', 0.4, 1.4, m.x, m.y, m.z);
            b.step++;
          }
        } else end();
        break;
      }
      case 'rain': {
        if (b.step === 0) {
          b.step = 1; realm.sound('summon', 0.8, 0.6, m.x, m.y, m.z);
          const pi = RAIN_PROJ.indexOf(a.proj);
          const mk: ['mk', number, ...number[]] = ['mk', m.id];
          for (let i = 0; i < a.n; i++) { const an = rnd() * 6.283, r = i === 0 ? 0 : Math.sqrt(rnd()) * a.radius, mx = p.x + Math.cos(an) * r, mz = p.z + Math.sin(an) * r; b.marks.push(mx, mz, 0.85 + i * 0.07, pi, a.dmg); mk.push(mx, mz, 0.85 + i * 0.07); }
          sim.sink.emit({ dim: realm.dim }, mk);
        }
        telegraph();
        // arms go up while the marks gather and come down as the first strike lands
        if (b.t < WIND.rain) wn = b.t / WIND.rain; else if (b.step === 1) { b.step = 2; b.strike = 1; }
        if (b.t > 0.9 + a.n * 0.07) end();
        break;
      }
      case 'ring': {
        if (b.t < 0.55) { wn = b.t / 0.55; telegraph(); }
        else { b.strike = 1; realm.sound('shoot', 1, 0.5, m.x, m.y, m.z); for (let i = 0; i < a.n; i++) { const an = (i / a.n) * 6.283 + b.orbit; realm.proj.fire(a.proj, cx, flatY, cz, Math.sin(an), flatDy, Math.cos(an), a.dmg * dmgMul, null, 0, 11); } end(); }
        break;
      }
      case 'summon': {
        if (b.t < 0.7) { wn = b.t / 0.7; telegraph(); }
        else {
          b.strike = 1; realm.sound('summon', 1, 0.8, m.x, m.y, m.z);
          if (realm.mobs.count((q) => q.def.key === a.mob) < 7) for (let i = 0; i < a.n; i++) { const an = rnd() * 6.283, sx = m.x + Math.cos(an) * (m.hw + 2.5), sz = m.z + Math.sin(an) * (m.hw + 2.5); const s = realm.mobs.spawn(a.mob, sx, groundY(w, sx, sz, m.y + 4) + 0.1, sz); if (s) { s.event = true; s.dmgMul = dmgMul; realm.burst(BURST.summoned, sx, s.y + 0.1, sz, 0x9aff6a); } }
          end();
        }
        break;
      }
      case 'teleport': {
        if (b.t < 0.45) { wn = b.t / 0.45; telegraph(); m.scale = Math.max(0.2, 1 - b.t * 1.8); }
        else if (b.step === 0) {
          b.step = 1; realm.sound('teleport', 0.9, 1, m.x, m.y, m.z);
          const an = rnd() * 6.283, r = 7 + rnd() * 4;
          m.x = p.x + Math.cos(an) * r; m.z = p.z + Math.sin(an) * r;
          // like the hover target, a jump stays over the arena floor and under its roof
          const ax = b.altar[0] + 0.5, az = b.altar[2] + 0.5, ar = Math.hypot(m.x - ax, m.z - az);
          if (ar > 11 && Math.hypot(p.x - ax, p.z - az) < 22) { m.x = ax + ((m.x - ax) / ar) * 11; m.z = az + ((m.z - az) / ar) * 11; }
          const gy = floorNear(w, m.x, m.z, p.y);
          m.y = gy + (spec.move === 'walk' ? 0.1 : Math.max(0.4, Math.min(2.5, roofY(w, m.x, m.z, gy) - 0.3 - m.h - gy)));
          px = m.x; pz = m.z; m.yaw = Math.atan2(p.x - m.x, p.z - m.z); m.ry = m.yaw; m.tpn++;
          realm.burst(BURST.teleport, m.x, m.y, m.z, m.h);
        } else { m.scale = Math.min(1, m.scale + dt * 4); if (m.scale >= 1) end(); }
        break;
      }
      case 'beam': {
        if (b.t < a.windup) {
          wn = b.t / a.windup; b.ax = dx / cd3; b.ay = cdy / cd3; b.az = dz / cd3;
          b.fxm |= FXM.sight;
        } else if (b.t < a.windup + a.dur) {
          wn = 1; if (b.step === 0) b.strike = 1;
          // the beam swings toward the player at a limited rate, so strafing beats it
          const k = Math.min(1, dt * 1.1), tx = dx / cd3, ty = cdy / cd3, tz = dz / cd3;
          b.ax += (tx - b.ax) * k; b.ay += (ty - b.ay) * k; b.az += (tz - b.az) * k;
          const l = Math.hypot(b.ax, b.ay, b.az) || 1; b.ax /= l; b.ay /= l; b.az /= l;
          const n = Math.floor((b.t - a.windup) / 0.045);
          while (b.step <= n) { realm.proj.fire(a.proj, cx, cy, cz, b.ax, b.ay, b.az, a.dmg * dmgMul, null, 0, 42); b.step++; }
          if (rnd() < dt * 8) realm.sound('magic', 0.5, 0.5, m.x, m.y, m.z);
        } else end();
        break;
      }
      case 'burrow': {
        const gy = groundY(w, m.x, m.z, p.y + 10);
        if (b.t < 0.7) { wn = b.t / 0.7; vy = -14; b.openT = 0; }
        else if (b.t < 1.9) {
          // travel under the player; the dust trail on the surface is the warning
          const ex = p.x - m.x, ez = p.z - m.z, el = Math.hypot(ex, ez) || 1;
          vx = (ex / el) * Math.min(18, el * 6); vz = (ez / el) * Math.min(18, el * 6); vy = (gy - 7 - m.y) * 5;
          b.fxm |= FXM.burrowDust;
          if (b.step === 0 && b.t > 1.5) { b.step = 1; realm.sound('growl', 1, 0.4, m.x, gy, m.z); sim.sink.emit({ p: pl.slot }, ['k', 0.25]); }
        } else if (b.t < 2.7) {
          vy = b.t < 2.3 ? 26 : -6; b.openT = 1; m.yaw += dt * 3;
          if (b.step === 1 && m.y > gy - 1) {
            b.step = 2; b.strike = 1; realm.sound('slam', 1, 1.2, m.x, gy, m.z); sim.sink.emit({ p: pl.slot }, ['k', 0.5]);
            realm.burst(BURST.eruption, m.x, gy + 0.3, m.z);
            if (a.ring) for (let i = 0; i < a.ring[1]; i++) { const an = (i / a.ring[1]) * 6.283; realm.proj.fire(a.ring[0], m.x, gy + 1, m.z, Math.cos(an), 0.15, Math.sin(an), a.dmg * 0.6 * dmgMul, null); }
          }
          if (Math.abs(dx) < 1.9 && Math.abs(dz) < 1.9 && Math.abs(p.y - m.y) < 3.2) hurtPlayer(sim, pl, a.dmg * dmgMul, m.x, m.z, m.def.name, m, 10);
        } else { b.openT = 0.3; end(); }
        break;
      }
    }
  }

  // ---- integrate ----
  if (spec.move === 'walk') {
    const k = Math.min(1, dt * 8);
    m.vx += (vx - m.vx) * k; m.vz += (vz - m.vz) * k; m.vy = Math.max(m.vy - 34 * dt, -40);
    if (m.hitH && m.onGround) m.vy = 11;
    moveBody(w, m, (m.vx + m.kbx) * dt, m.vy * dt, (m.vz + m.kbz) * dt);
    m.stuck = m.hitH ? m.stuck + dt : 0;
    if (m.stuck > 2.5) { m.stuck = 0; m.x = p.x + (rnd() - 0.5) * 12; m.z = p.z + (rnd() - 0.5) * 12; m.y = groundY(w, m.x, m.z, p.y + 10) + 0.2; px = m.x; pz = m.z; m.ry = m.yaw; m.tpn++; realm.sound('teleport', 0.6, 0.6, m.x, m.y, m.z); }
  } else {
    const k = Math.min(1, dt * 6);
    m.vx += (vx - m.vx) * k; m.vy += (vy - m.vy) * k; m.vz += (vz - m.vz) * k;
    m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
  }
  m.moving = Math.hypot(m.x - px, m.z - pz) / dt; m.anim += m.moving * dt * 0.9;
  // ---- body language for the renderer ----
  b.wind += (Math.min(1, wn) - b.wind) * Math.min(1, dt * 14);
  m.open += (b.openT - m.open) * Math.min(1, dt * 10);
  let pt = 0, rl = 0;
  const hv = Math.hypot(m.vx, m.vz);
  if (spec.move === 'burrow') pt = Math.max(-1.3, Math.min(1.3, Math.atan2(m.vy, hv + 0.01)));
  else if (spec.move === 'fly') {
    pt = Math.atan2(m.vy, hv + 2) * 0.85;
    let yr = m.yaw - b.lyaw; yr -= Math.round(yr / 6.2832) * 6.2832;
    rl = Math.max(-0.7, Math.min(0.7, (-yr / dt) * 0.35));
  } else if (spec.move === 'hover' && a && a.t === 'charge') pt = b.t < a.windup ? 0.15 : -0.3;
  b.lyaw = m.yaw;
  b.pitch += (pt - b.pitch) * Math.min(1, dt * 8); b.roll += (rl - b.roll) * Math.min(1, dt * 4);
  if (b.strike === 1 && spec.castSound && a && a.t !== 'volley' && a.t !== 'charge' && time - b.sndT > 1.2) { b.sndT = time; realm.sound(spec.castSound, 0.4, 1, m.x, m.y, m.z); }
  // heavy walkers shake the ground: one footfall each time the stride changes side
  if (spec.stomp && m.onGround && m.moving > 0.8) {
    const side = Math.sin(m.anim) >= 0 ? 1 : -1;
    if (side !== b.foot) {
      b.foot = side;
      if (time - b.sndT > 0.4) {
        b.sndT = time;
        const fx = m.x + Math.cos(m.yaw) * side * m.hw * 0.5, fz = m.z - Math.sin(m.yaw) * side * m.hw * 0.5;
        realm.burst(BURST.footfall, fx, m.y + 0.1, fz, m.hw);
        if (dist < 16) sim.sink.emit({ p: pl.slot }, ['k', spec.stomp]);
        realm.sound('slam', 0.2, 1.3, m.x, m.y, m.z);
      }
    }
  }
  // contact damage while not attacking
  if (m.atkCd <= 0 && Math.abs(dx) < m.hw + 0.5 && Math.abs(dz) < m.hw + 0.5 && p.y < m.y + m.h && p.y + p.h > m.y) { m.atkCd = 0.9; hurtPlayer(sim, pl, m.def.dmg * dmgMul, m.x, m.z, m.def.name, m, 7); }
  // serpent body follows the head
  if (b.segs) followSegs(b.segs, m.x, m.y, m.z);
  if (m.y < -30) { m.y = p.y + 8; m.vy = 0; }
}
const RAIN_PROJ = ['rootspike', 'wardenorb', 'sporebomb', 'lightning', 'prismray', 'moonblade', 'cairnstar', 'sandball'];
