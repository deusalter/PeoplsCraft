// Creatures: pooled entities, archetype AI, spawning and box-model rendering.
import * as THREE from 'three';
import { SEA } from '../core/constants';
import { T_LIQUID, T_SOLID } from '../data/blocks';
import { BIOMES } from '../data/biomes';
import { DIMS } from '../data/dims';
import { MOB_LIST, MobDef, SpawnRule, mob as mobDef } from '../data/mobs';
import type { Game } from '../game';
import { Body, boxFree, moveBody, newRayHit, raycast } from '../player/physics';
import type { BoxBatch } from '../render/batches';
import { BossState, bossTick, newBossState } from './boss';

export class Mob implements Body {
  active = false; def!: MobDef; id = 0;
  x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; px = 0; py = 0; pz = 0;
  hw = 0.3; h = 1; onGround = false; hitH = false; hitUp = false;
  yaw = 0; hp = 1; maxHp = 1; hurt = 0; anim = 0; atk = 0; atkCd = 0; moving = 0;
  state = 0; timer = 0; tx = 0; tz = 0; age = 0; kbx = 0; kbz = 0; flee = 0; stuck = 0;
  target: Mob | null = null; noclip = false; scale = 1; dmgMul = 1; event = false; talk = 0;
  boss: BossState | null = null; home: [number, number, number] | null = null; minionDmg = 0; hop = 0; open = 0;
}

const POOL = 140;
const ray = newRayHit();
const mBase = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mRot = new THREE.Matrix4(), mTmp = new THREE.Matrix4(), eul = new THREE.Euler(), vS = new THREE.Vector3();

export class MobSystem {
  readonly list: Mob[] = [];
  private nextId = 1; private spawnT = 0;
  hostileCap = 14; passiveCap = 9;
  /** Extra hostile spawn pressure from events (0 = none). */
  pressure = 0;
  safeZones: [number, number, number][] = [];

  constructor(private g: Game) { for (let i = 0; i < POOL; i++) this.list.push(new Mob()); }

  spawn(key: string, x: number, y: number, z: number): Mob | null {
    const m = this.list.find((q) => !q.active);
    if (!m) return null;
    const d = mobDef(key);
    Object.assign(m, new Mob());
    m.active = true; m.def = d; m.id = this.nextId++;
    m.x = m.px = x; m.y = m.py = y; m.z = m.pz = z; m.hw = d.hw; m.h = d.h; m.hp = m.maxHp = d.hp;
    m.yaw = Math.random() * 6.283; m.tx = x; m.tz = z; m.timer = Math.random() * 2;
    m.noclip = d.ai === 'minion' || (!!d.boss && d.boss.move !== 'walk');
    if (d.boss) m.boss = newBossState(m);
    return m;
  }
  clear(keepMinions = false): void { for (const m of this.list) if (m.active && !(keepMinions && m.def.ai === 'minion')) m.active = false; }
  count(pred: (m: Mob) => boolean): number { let n = 0; for (const m of this.list) if (m.active && pred(m)) n++; return n; }
  activeBoss(): Mob | null { for (const m of this.list) if (m.active && m.boss) return m; return null; }

  // ---- queries ----
  /** Nearest hostile within `r` of a point. */
  nearestHostile(x: number, y: number, z: number, r: number): Mob | null {
    let best: Mob | null = null, bd = r * r;
    for (const m of this.list) {
      if (!m.active || !m.def.hostile) continue;
      const d = (m.x - x) ** 2 + (m.y + m.h / 2 - y) ** 2 + (m.z - z) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  /** First mob whose box a ray hits within `max`. `hostileOnly` skips friendly creatures. */
  rayHit(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, pad = 0.1, filter?: (m: Mob) => boolean): { m: Mob; t: number } | null {
    let best: Mob | null = null, bt = max;
    for (const m of this.list) {
      if (!m.active || (filter && !filter(m))) continue;
      const lo = [m.x - m.hw - pad, m.y - pad, m.z - m.hw - pad], hi = [m.x + m.hw + pad, m.y + m.h + pad, m.z + m.hw + pad], o = [ox, oy, oz], d = [dx, dy, dz];
      let tn = 0, tf = bt, miss = false;
      for (let a = 0; a < 3 && !miss; a++) {
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo[a] || o[a] > hi[a]) miss = true; continue; }
        let t0 = (lo[a] - o[a]) / d[a], t1 = (hi[a] - o[a]) / d[a];
        if (t0 > t1) { const q = t0; t0 = t1; t1 = q; }
        if (t0 > tn) tn = t0; if (t1 < tf) tf = t1;
        if (tn > tf) miss = true;
      }
      if (!miss && tn < bt) { bt = tn; best = m; }
    }
    return best ? { m: best, t: bt } : null;
  }

  // ---- damage ----
  hurt(m: Mob, raw: number, kx: number, kz: number, knock: number, crit: boolean): void {
    const g = this.g;
    if (!m.active || m.def.ai === 'minion') return;
    if (m.def.ai === 'npc') { m.hurt = 0.2; return; }
    const dmg = Math.max(1, Math.round(raw - m.def.def * 0.5));
    m.hp -= dmg; m.hurt = 0.22; m.flee = 5;
    const kr = 1 - (m.def.knockRes ?? 0), kl = Math.hypot(kx, kz) || 1;
    m.kbx += (kx / kl) * knock * kr; m.kbz += (kz / kl) * knock * kr;
    if (kr > 0.3 && m.onGround) m.vy = 4.5;
    g.floater(m.x, m.y + m.h + 0.2, m.z, String(dmg), crit ? '#ffd34a' : '#ffffff', crit);
    g.audio.play(crit ? 'crit' : 'hit', 0.8, 1, [m.x, m.y, m.z]);
    g.audio.play('mobhurt', 0.5, m.def.voice ?? 1, [m.x, m.y, m.z]);
    for (let i = 0; i < 6; i++) g.particles.spawn(m.x, m.y + m.h * 0.6, m.z, (Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4, 0.4, 0.1, m.def.parts[0].c, 0, 12);
    if (m.hp <= 0) this.kill(m);
  }
  private kill(m: Mob): void {
    const g = this.g;
    m.active = false;
    g.audio.play('mobdie', 0.7, m.def.voice ?? 1, [m.x, m.y, m.z]);
    for (let i = 0; i < 16 * Math.min(4, m.def.hw * 3); i++) g.particles.spawn(m.x + (Math.random() - 0.5) * m.hw * 2, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * m.hw * 2,
      (Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5, 0.7, 0.14, m.def.parts[(Math.random() * m.def.parts.length) | 0].c, m.def.glow ? 0.6 : 0, 12, -1, true);
    g.onMobKilled(m);
  }

  // ---- simulation ----
  tick(dt: number): void {
    const g = this.g, p = g.player, w = g.world;
    for (const m of this.list) {
      if (!m.active) continue;
      m.px = m.x; m.py = m.y; m.pz = m.z; m.age += dt;
      if (m.hurt > 0) m.hurt -= dt;
      if (m.atk > 0) m.atk -= dt;
      if (m.atkCd > 0) m.atkCd -= dt;
      if (m.flee > 0) m.flee -= dt;
      if (m.talk > 0) m.talk -= dt;
      const dx = p.x - m.x, dz = p.z - m.z, dy = p.y - m.y, dist = Math.hypot(dx, dz), d3 = Math.hypot(dist, dy);
      const d = m.def;
      // despawn rules
      if (!m.boss && d.ai !== 'npc' && d.ai !== 'minion') {
        if (d3 > 110 || (d3 > 56 && m.age > 40 && Math.random() < dt * 0.1)) { m.active = false; continue; }
      }
      if (!w.ready(Math.floor(m.x), Math.floor(m.z))) continue;
      let wx = 0, wz = 0, speed = d.speed, wantJump = false, fly = false, vyWant = 0;
      const dead = g.stats.dead;

      switch (d.ai) {
        case 'passive': {
          m.timer -= dt;
          if (m.flee > 0) { wx = -dx; wz = -dz; speed *= 1.7; }
          else {
            if (m.timer <= 0) { m.timer = 3 + Math.random() * 6; const a = Math.random() * 6.283, r = Math.random() < 0.35 ? 0 : 2 + Math.random() * 6; m.tx = m.x + Math.cos(a) * r; m.tz = m.z + Math.sin(a) * r; }
            wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.5;
            if (Math.hypot(wx, wz) < 0.5) { wx = 0; wz = 0; }
          }
          break;
        }
        case 'npc': {
          m.timer -= dt;
          const night = g.isNight() || g.mobs.pressure > 0;
          const hx = m.home ? m.home[0] + 0.5 : m.x, hz = m.home ? m.home[2] + 0.5 : m.z;
          if (m.talk > 0) { m.yaw = Math.atan2(dx, dz); break; }
          if (m.timer <= 0) { m.timer = 4 + Math.random() * 7; const a = Math.random() * 6.283, r = night ? Math.random() * 1.5 : 1 + Math.random() * 7; m.tx = hx + Math.cos(a) * r; m.tz = hz + Math.sin(a) * r; }
          wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.7;
          if (Math.hypot(wx, wz) < 0.6) { wx = 0; wz = 0; }
          if (m.home && Math.hypot(m.x - hx, m.z - hz) > 40) { m.x = hx; m.y = m.home[1] + 0.6; m.z = hz; }
          break;
        }
        case 'melee': case 'hopper': {
          const chase = !dead && d3 < (d.aggro ?? 16) && !g.creativeHidden;
          if (chase) { wx = dx; wz = dz; } else { m.timer -= dt; if (m.timer <= 0) { m.timer = 3 + Math.random() * 5; const a = Math.random() * 6.283; m.tx = m.x + Math.cos(a) * 5; m.tz = m.z + Math.sin(a) * 5; } wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.45; if (Math.hypot(wx, wz) < 0.5) wx = wz = 0; }
          if (d.ai === 'hopper') {
            m.hop -= dt;
            if (m.onGround) { if (m.hop <= 0 && (wx || wz)) { m.hop = 0.7 + Math.random() * 0.6; m.vy = chase ? 8 : 6; m.onGround = false; } else speed = 0; }
          }
          break;
        }
        case 'ranged': {
          const see = !dead && d3 < (d.aggro ?? 18);
          if (see) {
            const want = d.range ?? 10;
            if (dist > want * 0.85) { wx = dx; wz = dz; } else if (dist < want * 0.4) { wx = -dx; wz = -dz; }
            m.yaw = Math.atan2(dx, dz);
            if (m.atkCd <= 0 && dist < want * 1.3 && this.canSee(m)) {
              m.atkCd = d.rate ?? 2; m.atk = 0.3;
              const ox = m.x, oy = m.y + m.h * 0.8, oz = m.z, tl = Math.hypot(dx, dy + p.h * 0.6 - m.h * 0.8, dz) || 1;
              g.proj.fire(d.proj!, ox, oy, oz, dx / tl, (dy + p.h * 0.6 - m.h * 0.8) / tl + 0.03, dz / tl, d.dmg * m.dmgMul, false);
              g.audio.play('shoot', 0.6, d.voice ?? 1, [m.x, m.y, m.z]);
            }
          }
          break;
        }
        case 'flyer': {
          fly = true;
          const see = !dead && d3 < (d.aggro ?? 18);
          if (see) {
            const ranged = !!d.proj, hover = ranged ? 4 : 0.6 + Math.sin(m.age * 1.3 + m.id) * 1.2;
            const want = ranged ? (d.range ?? 9) * 0.75 : 0;
            if (dist > want + 1) { wx = dx; wz = dz; } else if (dist < want - 2) { wx = -dx; wz = -dz; } else { wx = -dz; wz = dx; speed *= 0.5; }
            vyWant = Math.max(-1, Math.min(1, (p.y + hover + (ranged ? 0 : 0.6) - m.y) * 0.9)) * speed;
            if (ranged && m.atkCd <= 0 && dist < (d.range ?? 9) * 1.4 && this.canSee(m)) {
              m.atkCd = d.rate ?? 2;
              const tl = Math.hypot(dx, dy + p.h * 0.5 - m.h * 0.5, dz) || 1;
              g.proj.fire(d.proj!, m.x, m.y + m.h * 0.5, m.z, dx / tl, (dy + p.h * 0.5 - m.h * 0.5) / tl, dz / tl, d.dmg * m.dmgMul, false);
              g.audio.play('shoot', 0.5, (d.voice ?? 1) * 1.2, [m.x, m.y, m.z]);
            }
          } else { m.timer -= dt; if (m.timer <= 0) { m.timer = 2 + Math.random() * 4; const a = Math.random() * 6.283; m.tx = Math.cos(a); m.tz = Math.sin(a); m.state = Math.random() < 0.5 ? 1 : -1; } wx = m.tx; wz = m.tz; speed *= 0.4; vyWant = m.state * 0.5; }
          if (m.hitH) vyWant = speed;
          break;
        }
        case 'fish': {
          fly = true; m.timer -= dt;
          if (m.timer <= 0) { m.timer = 1 + Math.random() * 3; const a = Math.random() * 6.283; m.tx = Math.cos(a); m.tz = Math.sin(a); m.state = Math.random() * 2 - 1; }
          wx = m.tx; wz = m.tz; vyWant = m.state * 0.6;
          const inW = T_LIQUID[w.getBlock(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z))] === 1;
          if (!inW) { fly = false; speed = 0.3; } else if (T_LIQUID[w.getBlock(Math.floor(m.x), Math.floor(m.y + 1.1), Math.floor(m.z))] !== 1) vyWant = -0.8;
          if (m.hitH) m.timer = 0;
          break;
        }
        case 'minion': {
          fly = true;
          if (!m.target || !m.target.active || Math.hypot(m.target.x - p.x, m.target.z - p.z) > 24) m.target = this.nearestHostile(p.x, p.y + 1, p.z, 18);
          const t = m.target;
          let gx: number, gy: number, gz: number;
          if (t) { gx = t.x; gy = t.y + t.h * 0.5; gz = t.z; }
          else { const a = m.id * 2.4 + g.time * 0.7; gx = p.x + Math.cos(a) * 1.6; gy = p.y + 2.1 + Math.sin(g.time * 2 + m.id) * 0.2; gz = p.z + Math.sin(a) * 1.6; }
          const ex = gx - m.x, ey = gy - m.y, ez = gz - m.z, el = Math.hypot(ex, ey, ez);
          if (el > 40) { m.x = p.x; m.y = p.y + 2; m.z = p.z; }
          const sp = Math.min(d.speed, el * 5), k = Math.min(1, dt * 8);
          m.vx += ((ex / (el || 1)) * sp - m.vx) * k; m.vy += ((ey / (el || 1)) * sp - m.vy) * k; m.vz += ((ez / (el || 1)) * sp - m.vz) * k;
          m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
          if (el > 0.2) m.yaw = Math.atan2(ex, ez);
          if (t && el < t.hw + 0.9 && m.atkCd <= 0) {
            m.atkCd = 0.55; m.atk = 0.2;
            const crit = Math.random() < g.stats.d.crit;
            this.hurt(t, m.minionDmg * g.stats.dmgMult('summon') * (crit ? 2 : 1), ex, ez, 3, crit);
          }
          m.anim += dt * 8;
          continue;
        }
        case 'boss': bossTick(g, m, dt); break;
      }

      if (d.ai !== 'boss') {
        const wl = Math.hypot(wx, wz);
        if (wl > 0.01) { wx /= wl; wz /= wl; m.yaw = Math.atan2(wx, wz); }
        const tvx = wx * speed, tvz = wz * speed;
        const inW = !fly && T_LIQUID[w.getBlock(Math.floor(m.x), Math.floor(m.y + m.h * 0.4), Math.floor(m.z))] === 1;
        const k = Math.min(1, (m.onGround || fly || inW ? 9 : 2) * dt);
        m.vx += (tvx - m.vx) * k; m.vz += (tvz - m.vz) * k;
        if (fly) m.vy += (vyWant - m.vy) * Math.min(1, dt * 5);
        else if (inW) { m.vy = Math.min(m.vy + 20 * dt, 2.2); }
        else {
          m.vy = Math.max(m.vy - 30 * dt, -50);
          if (m.hitH && m.onGround && wl > 0.01) wantJump = true;
          if (wantJump && m.onGround) m.vy = 8.4;
          // ground creatures avoid stepping off ledges when they are just wandering
          if (m.onGround && wl > 0.01 && (d.ai === 'passive' || d.ai === 'npc') && boxFree(w, m.x + wx * 0.7 - 0.1, m.y - 2.2, m.z + wz * 0.7 - 0.1, m.x + wx * 0.7 + 0.1, m.y - 0.05, m.z + wz * 0.7 + 0.1)) { m.vx = 0; m.vz = 0; m.timer = 0; }
        }
        moveBody(w, m, (m.vx + m.kbx) * dt, m.vy * dt, (m.vz + m.kbz) * dt);
        const kd = Math.max(0, 1 - 6 * dt); m.kbx *= kd; m.kbz *= kd;
        m.moving = Math.hypot(m.x - m.px, m.z - m.pz) / dt;
        m.anim += m.moving * dt * 2.4 + (fly ? dt * 4 : 0);
        // touch damage
        if (d.hostile && d.dmg > 0 && !d.proj && !dead && m.atkCd <= 0 && Math.abs(dx) < m.hw + p.hw + 0.25 && Math.abs(dz) < m.hw + p.hw + 0.25 && p.y < m.y + m.h + 0.2 && p.y + p.h > m.y - 0.2) {
          m.atkCd = d.rate ?? 1; m.atk = 0.3;
          g.hurtPlayer(d.dmg * m.dmgMul, m.x, m.z, d.name, m);
        }
        // shades come apart in direct sun
        if ((d.key === 'gloomshade' || d.key === 'moonspawn') && g.gfx.dayAmt > 0.75 && DIMS[g.dim].hasSky && (w.getLight(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)) >> 4) >= 14 && !m.event) {
          m.hp -= dt * m.maxHp * 0.25; m.hurt = 0.1;
          if (Math.random() < dt * 20) g.particles.spawn(m.x, m.y + Math.random() * m.h, m.z, 0, 1.5, 0, 0.6, 0.12, 0x5a4a8a, 0.3, -1);
          if (m.hp <= 0) { m.active = false; continue; }
        }
        if (m.y < -10) m.active = false;
        if (d.hostile && d3 < 20 && Math.random() < dt * 0.06) g.audio.play('growl', 0.5, d.voice ?? 1, [m.x, m.y, m.z]);
      }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 0.35; this.trySpawn(); }
  }
  canSee(m: Mob): boolean {
    const p = this.g.player, ox = m.x, oy = m.y + m.h * 0.8, oz = m.z, dx = p.x - ox, dy = p.y + p.eye - oy, dz = p.z - oz, l = Math.hypot(dx, dy, dz) || 1;
    raycast(this.g.world, ox, oy, oz, dx / l, dy / l, dz / l, l, ray);
    return !ray.hit || !T_SOLID[ray.id];
  }

  // ---- spawning ----
  private trySpawn(): void {
    const g = this.g, w = g.world, p = g.player, dim = g.dim, night = g.isNight() && DIMS[dim].hasSky;
    if (!g.ready || g.stats.dead) return;
    const hostile = this.count((m) => m.def.hostile && !m.boss), passive = this.count((m) => !m.def.hostile && m.def.ai !== 'minion' && m.def.ai !== 'npc');
    const boss = this.activeBoss();
    const hCap = boss ? 2 : this.hostileCap + this.pressure * 8;
    const roll = Math.random();
    const where: SpawnRule['where'] = dim === 1 ? 'cave' : dim === 2 ? (roll < 0.5 ? 'air' : 'surface') : roll < 0.5 ? 'surface' : roll < 0.8 ? 'cave' : roll < 0.9 ? 'water' : 'air';
    const a = Math.random() * 6.283, r = 22 + Math.random() * 30;
    const x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r);
    if (!w.ready(x, z)) return;
    let y = -1;
    const air = (yy: number): boolean => !T_SOLID[w.getBlock(x, yy, z)] && !T_LIQUID[w.getBlock(x, yy, z)];
    if (where === 'surface' || where === 'air') {
      y = w.topY(x, z);
      while (y > 1 && !T_SOLID[w.getBlock(x, y, z)]) y--;
      if (y < 2 || T_LIQUID[w.getBlock(x, y + 1, z)] || !air(y + 1) || !air(y + 2)) return;
      y += where === 'air' ? 6 + Math.floor(Math.random() * 8) : 1;
    } else if (where === 'cave') {
      const y0 = Math.floor(p.y) + Math.floor((Math.random() - 0.5) * 40);
      for (let yy = Math.max(3, y0 - 8); yy < y0 + 8; yy++) if (T_SOLID[w.getBlock(x, yy - 1, z)] && air(yy) && air(yy + 1)) { y = yy; break; }
      if (y < 0) return;
      if (DIMS[dim].hasSky && (w.getLight(x, y, z) >> 4) > 3) return;
    } else {
      for (let yy = SEA - 1; yy > SEA - 14; yy--) if (T_LIQUID[w.getBlock(x, yy, z)] === 1 && T_LIQUID[w.getBlock(x, yy + 1, z)] === 1) { y = yy; break; }
      if (y < 0) return;
    }
    const light = w.getLight(x, y, z), bio = BIOMES[w.biomeAt(x, z)]?.key;
    const rules: [MobDef, SpawnRule][] = [];
    let total = 0;
    for (const d of MOB_LIST) {
      if (!d.spawn) continue;
      for (const s of d.spawn) {
        if (s.dim !== dim || s.where !== where) continue;
        if (s.time === 'night' && !night) continue;
        if (s.time === 'day' && (night || (light >> 4) < 11)) continue;
        if (s.biomes && (!bio || !s.biomes.includes(bio))) continue;
        if (s.y && (y < s.y[0] || y > s.y[1])) continue;
        if (s.event && g.events.active !== s.event) continue;
        if (s.flag && !g.flags.has(s.flag)) continue;
        if (d.hostile && (light & 15) > 6) continue;
        if (d.hostile ? hostile >= hCap : d.ai === 'fish' ? this.count((m) => m.def.ai === 'fish') >= 6 : passive >= this.passiveCap) continue;
        rules.push([d, s]); total += s.weight * (s.event ? 3 : 1);
      }
    }
    if (!rules.length) return;
    // towns are quiet: nothing hostile appears near an occupied home unless an event is on
    if (!g.events.active) for (const h of this.safeZones) if (Math.hypot(h[0] - x, h[2] - z) < 28 && rules.every((q) => q[0].hostile)) return;
    let pick = Math.random() * total;
    for (const [d, s] of rules) {
      pick -= s.weight * (s.event ? 3 : 1);
      if (pick > 0) continue;
      if (d.hostile && !g.events.active && this.safeZones.some((h) => Math.hypot(h[0] - x, h[2] - z) < 28)) return;
      const n = s.group[0] + Math.floor(Math.random() * (s.group[1] - s.group[0] + 1));
      for (let i = 0; i < n; i++) {
        const m = this.spawn(d.key, x + 0.5 + (Math.random() - 0.5) * 3, y + 0.05, z + 0.5 + (Math.random() - 0.5) * 3);
        if (m && d.hostile) { m.dmgMul = 1 + g.difficulty() * 0.12; m.hp = m.maxHp = Math.round(d.hp * (1 + g.difficulty() * 0.15)); }
      }
      return;
    }
  }

  // ---- rendering ----
  render(batch: BoxBatch, alpha: number, time: number): void {
    const w = this.g.world;
    for (const m of this.list) {
      if (!m.active) continue;
      const x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha, z = m.pz + (m.z - m.pz) * alpha;
      const l = w.getLight(Math.floor(m.x), Math.floor(m.y + m.h * 0.5), Math.floor(m.z)), sky = (l >> 4) / 15, blk = (l & 15) / 15;
      const flash = m.hurt > 0 ? 1 : 0, s = m.scale;
      const amp = Math.min(1, m.moving / 2.5) * 0.7, sw = Math.sin(m.anim) * amp;
      const atk = m.atk > 0 ? Math.sin((m.atk / 0.3) * Math.PI) : 0;
      mBase.makeRotationY(m.yaw); mBase.setPosition(x, y, z);
      if (s !== 1) mBase.scale(vS.set(s, s, s));
      for (const part of m.def.parts) {
        let rx = 0, ry = 0, rz = 0, oy = 0, sy = 1;
        switch (part.a) {
          case 'legA': rx = sw; break;
          case 'legB': rx = -sw; break;
          case 'armA': rx = -sw * 0.8 - atk * 1.7 - (m.boss ? m.boss.pose * 2.4 : 0); break;
          case 'armB': rx = sw * 0.8 - (m.boss ? m.boss.pose * 2.4 : 0); break;
          case 'head': rx = Math.sin(time * 1.3 + m.id) * 0.06 - atk * 0.3; break;
          case 'tail': ry = Math.sin(time * 4 + m.id) * 0.45; break;
          case 'wingA': rz = Math.sin(time * 16 + m.id) * 0.75; break;
          case 'wingB': rz = -Math.sin(time * 16 + m.id) * 0.75; break;
          case 'bob': oy = Math.sin(time * 2.2 + m.id) * 0.12; break;
          case 'spin': ry = time * 2.2 + m.id; oy = Math.sin(time * 3 + m.id) * 0.06; break;
          case 'spin2': ry = -time * 1.3; break;
          case 'squash': sy = 1 + Math.max(-0.25, Math.min(0.35, m.vy * 0.03)) + Math.sin(time * 3 + m.id) * 0.03; break;
          case 'jawA': rx = -(0.15 + m.open * 0.6 + atk * 0.5); break;
          case 'jawB': rx = 0.15 + m.open * 0.6 + atk * 0.5; break;
        }
        mPart.makeTranslation(part.p[0], part.p[1] * sy + oy, part.p[2]);
        if (rx || ry || rz) { eul.set(rx, ry, rz); mRot.makeRotationFromEuler(eul); mPart.multiply(mRot); }
        mTmp.makeScale(part.s[0], part.s[1] * sy, part.s[2]);
        if (part.o) mTmp.setPosition(part.o[0], part.o[1], part.o[2]);
        mPart.multiply(mTmp); mPart.premultiply(mBase);
        batch.add(mPart, part.c, sky, blk, flash, part.e ?? 0);
      }
      if (m.boss && m.boss.segs) {
        const sg = m.boss.segs, n = sg.length / 3;
        for (let i = 0; i < n; i++) {
          const k = 1 - i / (n + 2);
          mPart.makeScale(1.4 * k, 1.4 * k, 1.4 * k); mPart.setPosition(sg[i * 3], sg[i * 3 + 1] + 0.8, sg[i * 3 + 2]);
          batch.add(mPart, i % 2 ? 0xcfae62 : 0xb89650, sky, blk, flash, 0);
        }
      }
    }
  }
}
