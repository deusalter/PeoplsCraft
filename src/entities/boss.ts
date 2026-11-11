// Boss brain. Interprets the phase scripts in data/mobs.ts: picks attacks from the current
// phase, telegraphs them, and runs each attack primitive as a small timed state machine.
import { T_SOLID } from '../data/blocks';
import type { Attack } from '../data/mobs';
import type { Game } from '../game';
import { moveBody } from '../sim/physics';
import type { Mob } from './mobs';

export interface BossState {
  phase: number; cd: number; atk: Attack | null; t: number; step: number; last: number;
  ax: number; ay: number; az: number;      // attack direction / anchor
  altar: [number, number, number]; pose: number; segs: Float32Array | null; orbit: number;
  marks: number[];                          // pending rain strikes: x, z, time, projectile, damage
  /** Body language read by the renderer. kind: type of the current or last attack. wind: 0..1 through its wind-up, held while a
   *  sustained attack is delivered. strike: 1 at each release, decaying. aim: 1 while an aimed attack (beam, volley) runs.
   *  rage: eased phase fraction. pitch, roll: body attitude. spin: integrated angle of orbiting pieces. openT: the jaw
   *  target `m.open` eases toward. foot, sndT: last footfall side, and when a footfall or cast sound last played. */
  kind: string; wind: number; strike: number; aim: number; rage: number; pitch: number; roll: number; lyaw: number; spin: number; openT: number; foot: number; sndT: number;
  /** The same values one tick ago (and `segs` in psegs): the renderer blends from these, as it does for position. */
  ppose: number; pwind: number; pstrike: number; paim: number; ppitch: number; proll: number; pspin: number; psegs: Float32Array | null;
}
export function newBossState(m: Mob): BossState {
  const seg = m.def.boss!.segments ?? 0, spin = Math.random() * 6.283;
  return { phase: -1, cd: 2.2, atk: null, t: 0, step: 0, last: -1, ax: 0, ay: 0, az: 1, altar: [m.x, m.y, m.z], pose: 0, segs: seg ? new Float32Array(seg * 3).fill(0) : null, orbit: Math.random() * 6.283, marks: [],
    kind: '', wind: 0, strike: 0, aim: 0, rage: 0, pitch: 0, roll: 0, lyaw: m.yaw, spin, openT: 0, foot: 1, sndT: 0,
    ppose: 0, pwind: 0, pstrike: 0, paim: 0, ppitch: 0, proll: 0, pspin: spin, psegs: seg ? new Float32Array(seg * 3) : null };
}
/** Remember the pose the renderer blends from. Called once a tick, before anything moves. */
export function bossKeep(m: Mob): void {
  const b = m.boss!;
  b.ppose = b.pose; b.pwind = b.wind; b.pstrike = b.strike; b.paim = b.aim; b.ppitch = b.pitch; b.proll = b.roll; b.pspin = b.spin; m.popen = m.open;
  if (b.segs && b.psegs) b.psegs.set(b.segs);
}

function groundY(g: Game, x: number, z: number, from: number): number {
  let y = Math.floor(from);
  const w = g.world;
  for (let i = 0; i < 40 && y > 1; i++, y--) if (T_SOLID[w.getBlock(Math.floor(x), y, Math.floor(z))]) return y + 1;
  return from;
}
/** Top of the floor at (x, z) nearest the height `py`: climbs out of a hillside, and under a roof finds the floor, not the rock above. */
function floorNear(g: Game, x: number, z: number, py: number): number {
  const w = g.world, bx = Math.floor(x), bz = Math.floor(z);
  let y = Math.floor(py + 1);
  if (T_SOLID[w.getBlock(bx, y, bz)]) { for (let i = 0; i < 10 && T_SOLID[w.getBlock(bx, y, bz)]; i++) y++; return y; }
  for (let i = 0; i < 8; i++) if (T_SOLID[w.getBlock(bx, y + 1 + i, bz)]) return groundY(g, x, z, y + i);
  return groundY(g, x, z, py + 8);
}
/** Height of the first solid cell above the floor `gy` at (x, z), or gy + 99 under open sky (searches 18 cells). */
function roofY(g: Game, x: number, z: number, gy: number): number {
  const w = g.world, bx = Math.floor(x), bz = Math.floor(z), y0 = Math.floor(gy);
  for (let i = 1; i <= 18; i++) if (T_SOLID[w.getBlock(bx, y0 + i, bz)]) return y0 + i;
  return gy + 99;
}
/** Size of body segment i of n relative to the first (the renderer and the hit test taper the same way). */
export function segK(i: number, n: number): number { const f = n > 1 ? i / (n - 1) : 0; return 1 - 0.62 * f * f; }
/** Wind-up length of the attacks that do not carry their own. */
const WIND: Record<string, number> = { volley: 0.5, spiral: 0.6, ring: 0.55, summon: 0.7, rain: 0.85, teleport: 0.45, burrow: 0.7 };

export function bossTick(g: Game, m: Mob, dt: number): void {
  const b = m.boss!, spec = m.def.boss!, p = g.player, w = g.world;
  const dx = p.x - m.x, dy = p.y + 0.9 - (m.y + m.h * 0.5), dz = p.z - m.z, dist = Math.hypot(dx, dz), d3 = Math.hypot(dist, dy) || 1;
  const dmgMul = m.dmgMul;
  // leash: the fight ends if the player leaves or falls
  if (g.stats.dead || Math.hypot(p.x - b.altar[0], p.z - b.altar[2]) > 80) {
    g.toast(`${m.def.name} withdraws.`); g.audio.play('teleport', 0.8);
    for (const q of g.mobs.list) if (q.active && (q.def.key === 'sproutling' || q.def.key === 'dune_mite')) q.active = false;
    m.active = false; g.onBossGone(m, false); return;
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
      if (P.say) g.toast(P.say, '#ffb86a');
      g.audio.play('roar', 1, m.def.voice ?? 0.3, [m.x, m.y, m.z]); g.player.shake(0.5);
      for (let i = 0; i < 40; i++) g.particles.spawn(m.x, m.y + m.h * 0.5, m.z, (Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12, 1, 0.2, m.def.parts[(Math.random() * m.def.parts.length) | 0].c, 0.8, 4);
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
    const mx = b.marks[i], mz = b.marks[i + 1], gy = floorNear(g, mx, mz, p.y);
    if (Math.random() < dt * 30) g.particles.spawn(mx + (Math.random() - 0.5) * 1.2, gy + 0.1, mz + (Math.random() - 0.5) * 1.2, 0, 2.5, 0, 0.4, 0.14, 0xff5a3a, 1, 0);
    if (b.marks[i + 2] <= 0) {
      // strikes start under any roof, and are dropped where there is no room for one
      const top = roofY(g, mx, mz, gy);
      if (top - gy >= 2) g.proj.fire(RAIN_PROJ[b.marks[i + 3]] ?? 'wardenorb', mx, Math.min(gy + 16, top - 0.6), mz, 0, -1, 0, b.marks[i + 4] * dmgMul, false, 26);
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
      const want = 7 + m.hw, gy = floorNear(g, m.x, m.z, p.y), top = roofY(g, m.x, m.z, gy);
      let tx = p.x - (dx / (dist || 1)) * want + Math.cos(b.orbit) * 3, tz = p.z - (dz / (dist || 1)) * want + Math.sin(b.orbit) * 3, ty = Math.max(gy + 2.2 + Math.sin(g.time * 1.4) * 0.6, p.y + 1);
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
      const tx = p.x + Math.cos(b.orbit * 2) * 9, tz = p.z + Math.sin(b.orbit * 2) * 9, gy = groundY(g, m.x, m.z, p.y + 10);
      const ex = tx - m.x, ez = tz - m.z, el = Math.hypot(ex, ez) || 1;
      vx = (ex / el) * speed * 0.7; vz = (ez / el) * speed * 0.7; vy = (gy - 0.9 + Math.sin(g.time * 3) * 0.8 - m.y) * 4;
      m.yaw = Math.atan2(vx, vz); b.openT = 0.25 + Math.sin(g.time * 2.4) * 0.2;
      if (Math.random() < dt * 14) g.particles.spawn(m.x, gy + 0.1, m.z, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.6, 0.16, 0xe4d39a, 0, 10);
    }
  }

  // ---- attack selection ----
  if (!b.atk) {
    b.cd -= dt;
    if (b.cd <= 0) {
      let i = Math.floor(Math.random() * P.attacks.length);
      if (i === b.last && P.attacks.length > 1) i = (i + 1) % P.attacks.length;
      b.last = i; b.atk = P.attacks[i]; b.t = 0; b.step = 0;
    }
  }
  const a = b.atk;
  if (a) b.kind = a.t;
  let wn = 0;
  const end = (): void => { b.atk = null; b.cd = P.cd[0] + Math.random() * (P.cd[1] - P.cd[0]); };
  const aim = (): void => { b.ax = dx / d3; b.ay = dy / d3; b.az = dz / d3; };
  const cx = m.x, cy = m.y + (spec.cast ?? m.h * 0.6), cz = m.z;
  // aimed shots are sighted from the point they leave (which may be a head or an eye well above the body's middle); flat
  // patterns keep one height above the feet whatever the model's size
  const cdy = p.y + 0.9 - cy, cd3 = Math.hypot(dist, cdy) || 1, flatY = Math.max(m.y + 1, p.y + 0.9);
  // a boss off the ground tips its flat patterns into a shallow cone that meets the player's body at the player's distance
  const flatDy = spec.move === 'walk' ? 0 : Math.max(-1, Math.min(0, (p.y + 0.9 - flatY) / Math.max(dist, 4)));
  const telegraph = (c: number): void => { if (Math.random() < dt * 40) { const an = Math.random() * 6.283, r = m.hw + 1.5; g.particles.spawn(cx + Math.cos(an) * r, m.y + Math.random() * m.h, cz + Math.sin(an) * r, -Math.cos(an) * 3, 0.5, -Math.sin(an) * 3, 0.4, 0.14, c, 1, 0); } };

  if (a) {
    b.t += dt;
    switch (a.t) {
      case 'charge': {
        if (b.t < a.windup) { wn = b.t / a.windup; telegraph(0xff5a3a); aim(); vx = -b.ax * 2; vz = -b.az * 2; if (b.step === 0) { b.step = 1; g.audio.play('growl', 1, 0.5, [m.x, m.y, m.z]); } }
        else if (b.t < a.windup + a.dur) {
          if (b.step < 2) { b.step = 2; b.strike = 1; }
          vx = b.ax * a.speed; vz = b.az * a.speed; vy = spec.move === 'walk' ? 0 : b.ay * a.speed;
          m.yaw = Math.atan2(vx, vz); b.openT = 1;
          if (Math.abs(dx) < m.hw + 0.7 && Math.abs(dz) < m.hw + 0.7 && Math.abs(dy) < m.h * 0.5 + 1.2) g.hurtPlayer(a.dmg * dmgMul, m.x, m.z, m.def.name, m, 9);
          if (Math.random() < dt * 40) g.particles.spawn(cx, m.y + 0.2, cz, (Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4, 0.5, 0.18, 0xc8c0b0, 0, 8);
        } else { b.openT = 0; end(); }
        break;
      }
      case 'slam': {
        if (b.t < a.windup) { wn = b.t / a.windup; telegraph(0xffb03a); vy = spec.move === 'walk' ? 0 : 7; if (b.step === 0 && spec.move === 'walk') { b.step = 1; m.vy = 13; } if (spec.move !== 'walk') b.step = 1; }
        else if (b.step === 1) {
          vy = -22;
          const gy = groundY(g, m.x, m.z, m.y + 2);
          if ((spec.move === 'walk' && m.onGround) || (spec.move !== 'walk' && m.y <= gy + 0.3) || b.t > a.windup + 1.6) {
            b.step = 2; b.strike = 1; g.audio.play('slam', 1, 1, [m.x, m.y, m.z]);
            p.shake(Math.max(0.2, 0.9 - dist * 0.05));
            for (let i = 0; i < 48; i++) { const an = (i / 48) * 6.283; g.particles.spawn(m.x + Math.cos(an) * 1.5, gy + 0.2, m.z + Math.sin(an) * 1.5, Math.cos(an) * a.radius * 1.6, 1.5, Math.sin(an) * a.radius * 1.6, 0.6, 0.22, 0xd8c8a8, 0.3, 4); }
            if (dist < a.radius && Math.abs(p.y - gy) < 2.6 && p.onGround) g.hurtPlayer(a.dmg * dmgMul, m.x, m.z, m.def.name, m, 10);
            if (a.ring) for (let i = 0; i < a.ring[1]; i++) { const an = (i / a.ring[1]) * 6.283; g.proj.fire(a.ring[0], m.x, gy + 0.9, m.z, Math.cos(an), 0, Math.sin(an), a.dmg * 0.7 * dmgMul, false); }
          }
        } else if (b.t > a.windup + 0.5 && b.step === 2) end();
        break;
      }
      case 'volley': {
        const bursts = a.bursts ?? 1, gap = a.gap ?? 0.3;
        if (b.t < 0.5) { wn = b.t / 0.5; telegraph(0x9ad0ff); }
        else if (b.step < bursts && b.t >= 0.5 + b.step * gap) {
          b.step++; b.strike = 1; b.ax = dx / cd3; b.ay = cdy / cd3; b.az = dz / cd3; g.audio.play('shoot', 0.9, 0.7, [m.x, m.y, m.z]);
          const base = Math.atan2(b.ax, b.az);
          for (let i = 0; i < a.n; i++) { const an = base + (a.n === 1 ? 0 : (i / (a.n - 1) - 0.5) * a.spread * 2), ch = Math.cos(Math.asin(Math.max(-0.9, Math.min(0.9, b.ay)))); g.proj.fire(a.proj, cx, cy, cz, Math.sin(an) * ch, b.ay, Math.cos(an) * ch, a.dmg * dmgMul, false); }
        } else if (b.step >= bursts && b.t > 0.5 + bursts * gap + 0.3) end();
        break;
      }
      case 'spiral': {
        if (b.t < 0.6) { wn = b.t / 0.6; telegraph(0xd0a0ff); }
        else if (b.t < 0.6 + a.dur) {
          wn = 0.6; if (b.step === 0) b.strike = 1;
          const n = Math.floor((b.t - 0.6) / 0.13);
          while (b.step <= n) {
            const base = b.step * 0.13 * a.spin;
            for (let i = 0; i < a.arms; i++) { const an = base + (i / a.arms) * 6.283; g.proj.fire(a.proj, cx, flatY, cz, Math.sin(an), flatDy, Math.cos(an), a.dmg * dmgMul, false, 9); }
            if (b.step % 3 === 0) g.audio.play('shoot', 0.4, 1.4, [m.x, m.y, m.z]);
            b.step++;
          }
        } else end();
        break;
      }
      case 'rain': {
        if (b.step === 0) {
          b.step = 1; g.audio.play('summon', 0.8, 0.6, [m.x, m.y, m.z]);
          const pi = RAIN_PROJ.indexOf(a.proj);
          for (let i = 0; i < a.n; i++) { const an = Math.random() * 6.283, r = i === 0 ? 0 : Math.sqrt(Math.random()) * a.radius; b.marks.push(p.x + Math.cos(an) * r, p.z + Math.sin(an) * r, 0.85 + i * 0.07, pi, a.dmg); }
        }
        telegraph(0xff5a3a);
        // arms go up while the marks gather and come down as the first strike lands
        if (b.t < WIND.rain) wn = b.t / WIND.rain; else if (b.step === 1) { b.step = 2; b.strike = 1; }
        if (b.t > 0.9 + a.n * 0.07) end();
        break;
      }
      case 'ring': {
        if (b.t < 0.55) { wn = b.t / 0.55; telegraph(0xffe06a); }
        else { b.strike = 1; g.audio.play('shoot', 1, 0.5, [m.x, m.y, m.z]); for (let i = 0; i < a.n; i++) { const an = (i / a.n) * 6.283 + b.orbit; g.proj.fire(a.proj, cx, flatY, cz, Math.sin(an), flatDy, Math.cos(an), a.dmg * dmgMul, false, 11); } end(); }
        break;
      }
      case 'summon': {
        if (b.t < 0.7) { wn = b.t / 0.7; telegraph(0x9aff6a); }
        else {
          b.strike = 1; g.audio.play('summon', 1, 0.8, [m.x, m.y, m.z]);
          if (g.mobs.count((q) => q.def.key === a.mob) < 7) for (let i = 0; i < a.n; i++) { const an = Math.random() * 6.283, sx = m.x + Math.cos(an) * (m.hw + 2.5), sz = m.z + Math.sin(an) * (m.hw + 2.5); const s = g.mobs.spawn(a.mob, sx, groundY(g, sx, sz, m.y + 4) + 0.1, sz); if (s) { s.event = true; s.dmgMul = dmgMul; for (let j = 0; j < 8; j++) g.particles.spawn(sx + (Math.random() - 0.5) * 0.8, s.y + 0.1, sz + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 0.6, 0.14, 0x9aff6a, 1, 2); } }
          end();
        }
        break;
      }
      case 'teleport': {
        if (b.t < 0.45) { wn = b.t / 0.45; telegraph(0xffffff); m.scale = Math.max(0.2, 1 - b.t * 1.8); }
        else if (b.step === 0) {
          b.step = 1; g.audio.play('teleport', 0.9, 1, [m.x, m.y, m.z]);
          const an = Math.random() * 6.283, r = 7 + Math.random() * 4;
          m.x = p.x + Math.cos(an) * r; m.z = p.z + Math.sin(an) * r;
          // like the hover target, a jump stays over the arena floor and under its roof
          const ax = b.altar[0] + 0.5, az = b.altar[2] + 0.5, ar = Math.hypot(m.x - ax, m.z - az);
          if (ar > 11 && Math.hypot(p.x - ax, p.z - az) < 22) { m.x = ax + ((m.x - ax) / ar) * 11; m.z = az + ((m.z - az) / ar) * 11; }
          const gy = floorNear(g, m.x, m.z, p.y);
          m.y = gy + (spec.move === 'walk' ? 0.1 : Math.max(0.4, Math.min(2.5, roofY(g, m.x, m.z, gy) - 0.3 - m.h - gy)));
          m.px = m.x; m.py = m.y; m.pz = m.z; m.yaw = Math.atan2(p.x - m.x, p.z - m.z); m.ry = m.pry = m.yaw;
          for (let i = 0; i < 24; i++) g.particles.spawn(m.x, m.y + Math.random() * m.h, m.z, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0.5, 0.16, 0xffffff, 1, 0);
        } else { m.scale = Math.min(1, m.scale + dt * 4); if (m.scale >= 1) end(); }
        break;
      }
      case 'beam': {
        if (b.t < a.windup) {
          wn = b.t / a.windup; b.ax = dx / cd3; b.ay = cdy / cd3; b.az = dz / cd3;
          for (let i = 1; i < 12; i++) if (Math.random() < dt * 20) g.particles.spawn(cx + b.ax * i * 1.6, cy + b.ay * i * 1.6, cz + b.az * i * 1.6, 0, 0, 0, 0.25, 0.1, 0xff5a3a, 1, 0);
        } else if (b.t < a.windup + a.dur) {
          wn = 1; if (b.step === 0) b.strike = 1;
          // the beam swings toward the player at a limited rate, so strafing beats it
          const k = Math.min(1, dt * 1.1), tx = dx / cd3, ty = cdy / cd3, tz = dz / cd3;
          b.ax += (tx - b.ax) * k; b.ay += (ty - b.ay) * k; b.az += (tz - b.az) * k;
          const l = Math.hypot(b.ax, b.ay, b.az) || 1; b.ax /= l; b.ay /= l; b.az /= l;
          const n = Math.floor((b.t - a.windup) / 0.045);
          while (b.step <= n) { g.proj.fire(a.proj, cx, cy, cz, b.ax, b.ay, b.az, a.dmg * dmgMul, false, 42); b.step++; }
          if (Math.random() < dt * 8) g.audio.play('magic', 0.5, 0.5, [m.x, m.y, m.z]);
        } else end();
        break;
      }
      case 'burrow': {
        const gy = groundY(g, m.x, m.z, p.y + 10);
        if (b.t < 0.7) { wn = b.t / 0.7; vy = -14; b.openT = 0; }
        else if (b.t < 1.9) {
          // travel under the player; the dust trail on the surface is the warning
          const ex = p.x - m.x, ez = p.z - m.z, el = Math.hypot(ex, ez) || 1;
          vx = (ex / el) * Math.min(18, el * 6); vz = (ez / el) * Math.min(18, el * 6); vy = (gy - 7 - m.y) * 5;
          if (Math.random() < dt * 60) g.particles.spawn(m.x + (Math.random() - 0.5) * 2, gy + 0.1, m.z + (Math.random() - 0.5) * 2, 0, 3, 0, 0.5, 0.2, 0xe4d39a, 0, 9);
          if (b.step === 0 && b.t > 1.5) { b.step = 1; g.audio.play('growl', 1, 0.4, [m.x, gy, m.z]); p.shake(0.25); }
        } else if (b.t < 2.7) {
          vy = b.t < 2.3 ? 26 : -6; b.openT = 1; m.yaw += dt * 3;
          if (b.step === 1 && m.y > gy - 1) {
            b.step = 2; b.strike = 1; g.audio.play('slam', 1, 1.2, [m.x, gy, m.z]); p.shake(0.5);
            for (let i = 0; i < 40; i++) g.particles.spawn(m.x, gy + 0.3, m.z, (Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 12, 0.9, 0.22, 0xe4d39a, 0, 14, -1, true);
            if (a.ring) for (let i = 0; i < a.ring[1]; i++) { const an = (i / a.ring[1]) * 6.283; g.proj.fire(a.ring[0], m.x, gy + 1, m.z, Math.cos(an), 0.15, Math.sin(an), a.dmg * 0.6 * dmgMul, false); }
          }
          if (Math.abs(dx) < 1.9 && Math.abs(dz) < 1.9 && Math.abs(p.y - m.y) < 3.2) g.hurtPlayer(a.dmg * dmgMul, m.x, m.z, m.def.name, m, 10);
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
    if (m.stuck > 2.5) { m.stuck = 0; m.x = p.x + (Math.random() - 0.5) * 12; m.z = p.z + (Math.random() - 0.5) * 12; m.y = groundY(g, m.x, m.z, p.y + 10) + 0.2; m.px = m.x; m.py = m.y; m.pz = m.z; m.ry = m.pry = m.yaw; g.audio.play('teleport', 0.6, 0.6, [m.x, m.y, m.z]); }
  } else {
    const k = Math.min(1, dt * 6);
    m.vx += (vx - m.vx) * k; m.vy += (vy - m.vy) * k; m.vz += (vz - m.vz) * k;
    m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
  }
  m.moving = Math.hypot(m.x - m.px, m.z - m.pz) / dt; m.anim += m.moving * dt * 0.9;
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
  if (b.strike === 1 && spec.castSound && a && a.t !== 'volley' && a.t !== 'charge' && g.time - b.sndT > 1.2) { b.sndT = g.time; g.audio.play(spec.castSound, 0.4, 1, [m.x, m.y, m.z]); }
  // heavy walkers shake the ground: one footfall each time the stride changes side
  if (spec.stomp && m.onGround && m.moving > 0.8) {
    const side = Math.sin(m.anim) >= 0 ? 1 : -1;
    if (side !== b.foot) {
      b.foot = side;
      if (g.time - b.sndT > 0.4) {
        b.sndT = g.time;
        const fx = m.x + Math.cos(m.yaw) * side * m.hw * 0.5, fz = m.z - Math.sin(m.yaw) * side * m.hw * 0.5;
        for (let i = 0; i < 8; i++) g.particles.spawn(fx + (Math.random() - 0.5) * 1.2, m.y + 0.1, fz + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 3, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 3, 0.6, 0.18, 0xb8ac94, 0, 5);
        if (dist < 16) p.shake(spec.stomp);
        g.audio.play('slam', 0.2, 1.3, [m.x, m.y, m.z]);
      }
    }
  }
  // contact damage while not attacking
  if (m.atkCd <= 0 && Math.abs(dx) < m.hw + 0.5 && Math.abs(dz) < m.hw + 0.5 && p.y < m.y + m.h && p.y + p.h > m.y) { m.atkCd = 0.9; g.hurtPlayer(m.def.dmg * dmgMul, m.x, m.z, m.def.name, m, 7); }
  // serpent body follows the head
  if (b.segs) {
    const s = b.segs, ps = b.psegs, n = s.length / 3;
    let lx = m.x, ly = m.y, lz = m.z;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      if (s[o] === 0 && s[o + 1] === 0 && s[o + 2] === 0) { s[o] = lx; s[o + 1] = ly; s[o + 2] = lz; if (ps) { ps[o] = lx; ps[o + 1] = ly; ps[o + 2] = lz; } }
      const ex = s[o] - lx, ey = s[o + 1] - ly, ez = s[o + 2] - lz, el = Math.hypot(ex, ey, ez) || 1, gap = (i === 0 ? 1.45 : 1.1) * segK(i, n);
      if (el > gap) { s[o] = lx + (ex / el) * gap; s[o + 1] = ly + (ey / el) * gap; s[o + 2] = lz + (ez / el) * gap; }
      lx = s[o]; ly = s[o + 1]; lz = s[o + 2];
    }
  }
  if (m.y < -30) { m.y = p.y + 8; m.vy = 0; }
}
const RAIN_PROJ = ['rootspike', 'wardenorb', 'sporebomb', 'lightning', 'prismray', 'moonblade', 'cairnstar', 'sandball'];
