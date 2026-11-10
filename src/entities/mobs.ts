// Creatures: pooled entities, archetype AI, spawning and box-model rendering.
import * as THREE from 'three';
import { SEA } from '../core/constants';
import { T_LIQUID, T_OPAQUE, T_SOLID } from '../data/blocks';
import { BIOMES } from '../data/biomes';
import { DIMS } from '../data/dims';
import { MAX_PARTS, MOB_LIST, MobDef, type Part, SpawnRule, mob as mobDef, rigOf } from '../data/mobs';
import type { Game } from '../game';
import { Body, boxFree, moveBody, newRayHit, rayBox, raycast } from '../player/physics';
import { type BoxBatch, ShadowBatch } from '../render/batches';
import { BossState, bossTick, newBossState, segK } from './boss';

export class Mob implements Body {
  active = false; def!: MobDef; id = 0;
  x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; px = 0; py = 0; pz = 0;
  hw = 0.3; h = 1; onGround = false; hitH = false; hitUp = false;
  yaw = 0; hp = 1; maxHp = 1; hurt = 0; anim = 0; atk = 0; atkCd = 0; moving = 0;
  state = 0; timer = 0; tx = 0; tz = 0; age = 0; kbx = 0; kbz = 0; flee = 0; stuck = 0;
  target: Mob | null = null; noclip = false; scale = 1; dmgMul = 1; event = false; talk = 0;
  boss: BossState | null = null; home: [number, number, number] | null = null; minionDmg = 0; hop = 0; open = 0;
  /** Eased world light (sky, block; ls < 0 = not sampled yet) and the drawn yaw, which turns toward `yaw` at a finite rate. */
  ls = -1; lb = 0; ry = 0; pry = 0;
  /** Landing squash of a hopper, 1 at touchdown, decaying. */
  sq = 0;
}

const POOL = 140;
const ray = newRayHit();
const mBase = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mRot = new THREE.Matrix4(), mTmp = new THREE.Matrix4(), mBox = new THREE.Matrix4(), eul = new THREE.Euler(), eulB = new THREE.Euler(0, 0, 0, 'YXZ'), vS = new THREE.Vector3();
/** Boss body language per attack kind: [0] armA rx, [1] armB rx, [2] arm spread, [3] elbow bend, [4] arm rx added at the strike,
 *  waist lean [5] in the wind-up, [6] at the strike and [7] while a charge is under way, [8] head and [9] neck rx while the pose is held. */
const POSE: Record<string, readonly number[]> = {
  slam: [-2.9, -2.9, 0.25, 0.3, 2.2, -0.3, 0.5, 0, -0.3, -0.2],
  volley: [-1.5, -0.35, 0.1, 0.6, -0.2, -0.12, 0.16, 0, 0, 0],
  ring: [-0.3, -0.3, 1.4, 0.2, 0, -0.1, 0.12, 0, -0.15, 0],
  spiral: [-1.0, -1.0, 1.15, 0.35, 0, -0.08, 0, 0, -0.1, 0],
  rain: [-3.0, -3.0, 0.4, 0.15, 1.3, -0.18, 0.2, 0, -0.35, -0.25],
  beam: [-1.55, -1.55, -0.22, 0.1, 0, -0.1, 0.1, 0, 0.1, 0.1],
  summon: [-0.9, -0.9, 0.8, 1.0, -0.5, -0.1, 0.1, 0, -0.2, -0.1],
  charge: [0.75, 0.75, 0.3, 0.5, 0, -0.2, 0, 0.35, 0.35, 0.85],
  teleport: [-0.5, -0.5, -0.3, 1.7, 0, 0, 0, 0, 0.3, 0.2],
};
const POSE0: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// pose of the creature being drawn, set once by draw() and read by boxes() for every box list of that creature
let cAmp = 0, cMv = 0, cAtk = 0, cPose = 0, cLook = 0, cWind = 0, cStrike = 0, cRage = 0, cAim = 0, cJaw = 0, cSpin = 0, cGal = 0, cFq = 16, cBob = 0, cSky = 1, cBlk = 0, cFlash = 0, cEmul = 1, cGlow = 0, cPhz = 0;
let cP: readonly number[] = POSE0;
/** World matrix of every box's joint in the model being drawn, so `par` children can ride on it. */
const joints: THREE.Matrix4[] = [];
for (let i = 0; i < MAX_PARTS + 1; i++) joints.push(new THREE.Matrix4());
/** Dying creatures stay visible for a moment in a small pool of frozen copies. */
const CORPSES = 12;

export class MobSystem {
  readonly list: Mob[] = [];
  private nextId = 1; private spawnT = 0;
  hostileCap = 14; passiveCap = 9;
  /** Extra hostile spawn pressure from events (0 = none). */
  pressure = 0;
  safeZones: [number, number, number][] = [];

  private corpses: Mob[] = []; private corpseT = new Float32Array(CORPSES); private corpseDur = new Float32Array(CORPSES); private corpseTime = new Float32Array(CORPSES);
  /** Pixelated contact shadows under creatures, drawn after the terrain. */
  readonly shadows = new ShadowBatch();

  constructor(private g: Game) {
    for (let i = 0; i < POOL; i++) this.list.push(new Mob());
    for (let i = 0; i < CORPSES; i++) this.corpses.push(new Mob());
    g.gfx.scene.add(this.shadows.mesh);
  }

  spawn(key: string, x: number, y: number, z: number): Mob | null {
    const m = this.list.find((q) => !q.active);
    if (!m) return null;
    const d = mobDef(key);
    Object.assign(m, new Mob());
    m.active = true; m.def = d; m.id = this.nextId++;
    m.x = m.px = x; m.y = m.py = y; m.z = m.pz = z; m.hw = d.hw; m.h = d.h; m.hp = m.maxHp = d.hp;
    m.yaw = Math.random() * 6.283; m.tx = x; m.tz = z; m.timer = Math.random() * 2;
    m.noclip = d.ai === 'minion' || (!!d.boss && d.boss.move !== 'walk');
    if (d.boss) { m.boss = newBossState(m); m.dmgMul = 1.4; }
    m.ry = m.pry = m.yaw; this.sampleLight(m, 1);
    return m;
  }
  clear(keepMinions = false): void { for (const m of this.list) if (m.active && !(keepMinions && m.def.ai === 'minion')) m.active = false; this.corpseT.fill(0); this.corpseDur.fill(0); }
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
      const t = rayBox(ox, oy, oz, dx, dy, dz, m.x - m.hw - pad, m.y - pad, m.z - m.hw - pad, m.x + m.hw + pad, m.y + m.h + pad, m.z + m.hw + pad, bt);
      if (t >= 0 && t < bt) { bt = t; best = m; }
      // a serpent's body can be hit as well as its head
      const sg = m.boss ? m.boss.segs : null;
      if (sg) for (let i = 0, n = sg.length / 3; i < n; i++) {
        const o = i * 3;
        if (sg[o] === 0 && sg[o + 1] === 0 && sg[o + 2] === 0) continue;
        const r = m.hw * 0.75 * segK(i, n) + pad, cy = sg[o + 1] + m.h * 0.5;
        const ts = rayBox(ox, oy, oz, dx, dy, dz, sg[o] - r, cy - r, sg[o + 2] - r, sg[o] + r, cy + r, sg[o + 2] + r, bt);
        if (ts >= 0 && ts < bt) { bt = ts; best = m; }
      }
    }
    if (!best) return null;
    this.hitOut.m = best; this.hitOut.t = bt;
    return this.hitOut;
  }
  private hitOut: { m: Mob; t: number } = { m: null as unknown as Mob, t: 0 };

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
    this.corpse(m);
    // rewards are paid now, so leaving mid-animation cannot lose the kill
    g.onMobKilled(m);
  }
  /** Leave a frozen copy of `m` (already inactive) to play its death: topple or fall for creatures, shudder and shatter for bosses. */
  private corpse(m: Mob): void {
    let ci = 0;
    for (let i = 0; i < CORPSES; i++) { if (this.corpseT[i] >= this.corpseDur[i]) { ci = i; break; } if (this.corpseT[i] > this.corpseT[ci]) ci = i; }
    const c = this.corpses[ci];
    Object.assign(c, m); c.active = false;
    this.corpseT[ci] = 0; this.corpseDur[ci] = m.boss ? 2.4 : 0.65; this.corpseTime[ci] = this.g.time;
  }
  /** Pieces that fly off a corpse: a few random part colours around its body. */
  private debris(c: Mob, n: number, spd: number, life: number, size: number, glow: number, grav: number): void {
    const g = this.g, ps = c.def.parts, s = c.scale;
    for (let i = 0; i < n; i++) g.particles.spawn(c.x + (Math.random() - 0.5) * c.hw * 2 * s, c.y + Math.random() * c.h * s, c.z + (Math.random() - 0.5) * c.hw * 2 * s,
      (Math.random() - 0.5) * spd, Math.random() * spd, (Math.random() - 0.5) * spd, life, size, ps[(Math.random() * ps.length) | 0].c, glow, grav, -1, true);
  }
  private tickCorpses(dt: number): void {
    for (let i = 0; i < CORPSES; i++) {
      const t0 = this.corpseT[i], dur = this.corpseDur[i];
      if (t0 >= dur) continue;
      const c = this.corpses[i], t = t0 + dt;
      this.corpseT[i] = t;
      if (c.boss) {
        const k0 = t0 / dur, k = t / dur;
        if (k < 0.6) { this.debris(c, 3, 3, 0.8, 0.18, 1, -2); if (Math.floor(t / 0.3) !== Math.floor(t0 / 0.3)) this.g.player.shake(0.15); }
        else if (k0 < 0.6) { this.g.audio.play('slam', 1, 0.8, [c.x, c.y, c.z]); this.g.player.shake(0.6); this.debris(c, 60, 14, 1.4, 0.26, 0.8, 8); }
      } else if (t >= dur) this.debris(c, 16 * Math.min(4, c.def.hw * 3), 5, 0.7, 0.14, c.def.glow ? 0.6 : 0, 12);
    }
  }
  /** Ease the drawn light toward the light around `m` (k = 1 snaps). Noclip bosses sit inside terrain, whose cells hold no
   *  light, so the first non-opaque cell of body centre, just above the head and higher still is used. */
  private sampleLight(m: Mob, k: number): void {
    const w = this.g.world, bx = Math.floor(m.x), bz = Math.floor(m.z);
    let by = Math.floor(m.y + m.h * 0.5);
    if (T_OPAQUE[w.getBlock(bx, by, bz)]) { by = Math.floor(m.y + m.h + 0.5); if (T_OPAQUE[w.getBlock(bx, by, bz)]) { by = Math.floor(m.y + m.h + 2.5); if (T_OPAQUE[w.getBlock(bx, by, bz)]) return; } }
    const l = w.getLight(bx, by, bz), sky = (l >> 4) / 15, blk = (l & 15) / 15;
    if (m.ls < 0 || k >= 1) { m.ls = sky; m.lb = blk; } else { m.ls += (sky - m.ls) * k; m.lb += (blk - m.lb) * k; }
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
      m.pry = m.ry;
      { let a = m.yaw - m.ry; a -= Math.round(a / 6.2832) * 6.2832; m.ry += a * Math.min(1, dt * (m.boss ? 6 : 12)); }
      this.sampleLight(m, Math.min(1, dt * 10));
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
          m.moving = Math.hypot(m.vx, m.vz); m.anim += dt * 8;
          continue;
        }
        case 'boss': {
          // entrance: dust kicks up round a walking or burrowing boss while it grows in (see draw)
          if (m.age < 1.4 && d.boss!.move !== 'hover' && d.boss!.move !== 'fly') for (let i = 0; i < 4; i++) { const an = Math.random() * 6.283, r = m.hw * (0.6 + Math.random() * 0.8); g.particles.spawn(m.x + Math.cos(an) * r, m.y + 0.1, m.z + Math.sin(an) * r, Math.cos(an) * 2, 1 + Math.random() * 2, Math.sin(an) * 2, 0.8, 0.22, 0xc8b89a, 0, 3); }
          bossTick(g, m, dt);
          break;
        }
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
        const vy0 = m.vy;
        moveBody(w, m, (m.vx + m.kbx) * dt, m.vy * dt, (m.vz + m.kbz) * dt);
        if (m.sq > 0) m.sq = Math.max(0, m.sq - dt * 6);
        if (vy0 < -4 && m.onGround) m.sq = 1;
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
          if (m.hp <= 0) { m.active = false; this.corpse(m); continue; }
        }
        if (m.y < -10) m.active = false;
        if (d.hostile && d3 < 20 && Math.random() < dt * 0.06) g.audio.play('growl', 0.5, d.voice ?? 1, [m.x, m.y, m.z]);
      }
    }
    this.tickCorpses(dt);
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
    this.shadows.begin();
    for (const m of this.list) if (m.active) this.draw(batch, m, alpha, time, -1);
    for (let i = 0; i < CORPSES; i++) if (this.corpseT[i] < this.corpseDur[i]) this.draw(batch, this.corpses[i], alpha, this.corpseTime[i], i);
    this.shadows.end();
  }
  // explosion of a shattering boss, read by put(): progress (0 = intact) and the centre the pieces fly from
  private shatter = 0; private scx = 0; private scy = 0; private scz = 0;
  /** One creature (ci < 0) or corpse ci. Box matrix = Base * [parent joint] * T(p) * Ranim * T(o) * Rstatic * S (see Part). */
  private draw(batch: BoxBatch, m: Mob, alpha: number, time: number, ci: number): void {
    const g = this.g, d = m.def, b = m.boss, parts = d.parts, spec = d.boss;
    const x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha, z = m.pz + (m.z - m.pz) * alpha;
    // a spawner may set yaw directly before the first tick (dev showcase, scripted spawns)
    if (m.age === 0) m.ry = m.pry = m.yaw;
    const yaw = m.pry + (m.ry - m.pry) * alpha;
    const sky = m.ls < 0 ? 1 : m.ls, blk = m.ls < 0 ? 0 : m.lb;
    let flash = Math.min(1, Math.max(0, m.hurt / 0.22)), s = m.scale, emul = 1, glowAdd = 0, fall = 0, topple = 0, shake = 0, u = 0;
    // spawn: creatures scale up from their feet in 0.2 s, bosses grow in over 1.4 s (while paused, e.g. the dev showcase, at full size)
    if (ci < 0 && !g.paused) {
      const age = m.age + alpha / 60;
      if (b) { const k = Math.min(1, age / 1.4); s *= Math.max(0.02, k * k * (3 - 2 * k)); } else s *= Math.min(1, 0.15 + age * 4.25);
    }
    if (ci >= 0) {
      const dur = this.corpseDur[ci], t = Math.min(dur, this.corpseT[ci] + (g.paused ? 0 : alpha / 60)), k = t / dur;
      if (b) {
        if (k < 0.6) { shake = Math.sin(t * 70) * 0.08; flash = (Math.sin(t * 30) * 0.5 + 0.5) * k; emul = 1 + 4 * k; glowAdd = k * 0.3; }
        else { u = (k - 0.6) / 0.4; flash = 0; emul = 2; glowAdd = 0.12 * (1 - u); }
      } else {
        flash = 1 - k; s *= 1 - Math.max(0, k - 0.7) / 0.3;
        if (m.noclip || d.ai === 'flyer' || d.ai === 'fish') fall = 4 * t * t; else topple = Math.min(1, k * 1.6) ** 2 * 1.5708;
      }
    }
    if (s <= 0.001) return;
    const amp = Math.min(1, m.moving / 2.5) * 0.7;
    // stretch and squash: bosses rise into a wind-up and flatten at the strike, and a gallop bounds
    let q = 1, lift = 0;
    cGal = 0;
    if (b && spec) {
      q = 1 + b.wind * 0.07 - b.strike * 0.13 + (spec.move === 'hover' ? Math.min(0.12, Math.abs(m.vy) * 0.005) : 0);
      if (spec.gallop) { cGal = Math.max(0, Math.min(1, (m.moving - 11) / 5)); lift = cGal * Math.abs(Math.sin(m.anim * 0.6 + 1.1)) * 0.3; }
    }
    if (b && (b.pitch || b.roll)) {
      // nose up or down and bank, turning about the middle of the body
      const c = m.noclip ? m.h * 0.5 * s : 0;
      eulB.set(-b.pitch, yaw, b.roll); mBase.makeRotationFromEuler(eulB);
      const e = mBase.elements;
      mBase.setPosition(x + shake - c * e[4], y - fall + c - c * e[5], z - c * e[6]);
    } else {
      mBase.makeRotationY(yaw);
      if (topple) {
        // fall onto the left flank, pivoting on its lower edge rather than the centre of the feet
        const a = m.hw; mRot.makeRotationZ(topple); mRot.setPosition(a * (Math.cos(topple) - 1), a * Math.sin(topple), 0); mBase.multiply(mRot);
      }
      mBase.setPosition(x + shake, y - fall + lift * s, z);
    }
    if (s !== 1 || q !== 1) { const w = s / Math.sqrt(q); mBase.scale(vS.set(w, s * q, w)); }
    this.shatter = u; this.scx = x; this.scy = y + m.h * 0.5 * s; this.scz = z;
    cAmp = amp; cMv = Math.min(0.35, m.moving * 0.05); cAtk = m.atk > 0 ? Math.sin((m.atk / 0.3) * Math.PI) : 0;
    cSky = sky; cBlk = blk; cFlash = flash; cGlow = glowAdd; cFq = 16 / (1 + m.hw);
    if (b) {
      cPose = b.pose; cWind = b.wind; cStrike = b.strike; cRage = b.rage; cAim = b.aim; cSpin = b.spin; cPhz = Math.max(0, b.phase); cP = POSE[b.kind] ?? POSE0;
      cJaw = Math.max(m.open, b.wind * 0.7, b.strike); cBob = 0;
      // the whole body flares as an attack gathers, and burns hotter in later phases
      emul *= 1 + b.wind * 1.2 + b.strike * 0.5 + b.rage * 0.4;
    } else {
      cPose = 0; cWind = 0; cStrike = 0; cRage = 0; cAim = 0; cSpin = time * 2.2; cPhz = 0; cP = POSE0; cJaw = m.open;
      // walkers dip a little with every step
      cBob = d.ai === 'minion' || d.ai === 'flyer' || d.ai === 'fish' || d.ai === 'hopper' ? 0 : -Math.abs(Math.sin(m.anim)) * amp * 0.07 * Math.min(1, m.h);
    }
    cEmul = emul;
    // grazing animals and townsfolk glance at a nearby player while their bodies keep wandering
    cLook = 0;
    if (ci < 0 && m.flee <= 0 && (d.ai === 'npc' || d.ai === 'passive')) {
      const dx = g.player.x - x, dz = g.player.z - z, dist = Math.hypot(dx, dz);
      if (dist < 7) { let a = Math.atan2(dx, dz) - yaw; a -= Math.round(a / 6.2832) * 6.2832; cLook = Math.max(-0.8, Math.min(0.8, a)) * Math.min(1, (7 - dist) / 3); }
    }
    this.boxes(batch, m, parts, time, 0, 0);
    const sg = b ? b.segs : null, sp = spec ? spec.seg : undefined;
    if (sg && sp) {
      // body segments: each is the `seg` box list, tapering, turned toward the link ahead of it
      const n = sg.length / 3, cyo = m.h * 0.5, ss = s < 1 ? s : 1;
      let lx = m.x, ly = m.y, lz = m.z;
      for (let i = 0; i < n; i++) {
        const o = i * 3, k = segK(i, n) * ss;
        if (sg[o] === 0 && sg[o + 1] === 0 && sg[o + 2] === 0) continue;
        const ex = lx - sg[o], ey = ly - sg[o + 1], ez = lz - sg[o + 2];
        eulB.set(-Math.atan2(ey, Math.hypot(ex, ez)), Math.atan2(ex, ez), 0); mBase.makeRotationFromEuler(eulB);
        mBase.setPosition(sg[o] + shake, sg[o + 1] + cyo * ss - fall, sg[o + 2]); mBase.scale(vS.set(k, k, k));
        this.boxes(batch, m, sp, time, i * 0.7, parts.length + i * sp.length);
        if (u === 0) this.contact(sg[o], sg[o + 1] + 0.1, sg[o + 2], m.hw * 0.7 * k, sky, true);
        lx = sg[o]; ly = sg[o + 1]; lz = sg[o + 2];
      }
    }
    // contact shadow: not for minions, small wisps or far-away creatures
    if (u === 0 && d.ai !== 'minion' && !(d.glow && d.hw < 0.35)) {
      const dx = g.player.x - x, dz = g.player.z - z;
      if (dx * dx + dz * dz < 28 * 28) this.contact(x, y - fall, z, Math.min(2.6, m.hw * 1.4 * s) * (1 - topple * 0.2), sky, m.noclip || !m.onGround || ci >= 0);
    }
  }
  /** Draw one box list on the base matrix in mBase, in the pose draw() has set up. `apAdd` shifts every oscillator (body segments
   *  ripple), `i0` numbers the boxes for the shatter. */
  private boxes(batch: BoxBatch, m: Mob, parts: Part[], time: number, apAdd: number, i0: number): void {
    const rig = rigOf(parts), b = m.boss, id = m.id, amp = cAmp, P = cP, open = m.open;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i], ap = (part.ap ?? 0) + apAdd, ph = time + id + ap, pp = part.p, par = rig ? rig[i] : -1;
      let rx = 0, ry = 0, rz = 0, ox = 0, oy = par < 0 ? cBob : 0, oz = 0, sy = 1, ps = 1, pe = 1, os = 1;
      switch (part.a) {
        // legs trot in diagonal pairs; with `gallop` the fore pair and the hind pair each strike together
        case 'legA': rx = Math.sin(m.anim + ap) * amp; if (cGal) rx += (Math.sin(m.anim * 0.6 + (pp[2] > 0 ? 0.3 : 2.5) + ap) * 0.95 - rx) * cGal; oy = 0; break;
        case 'legB': rx = -Math.sin(m.anim + ap) * amp; if (cGal) rx += (Math.sin(m.anim * 0.6 + (pp[2] > 0 ? 0 : 2.2) + ap) * 0.95 - rx) * cGal; oy = 0; break;
        // the knee folds while its leg swings forward
        case 'shinA': rx = Math.max(0, -Math.cos(m.anim + ap)) * amp * 1.3; if (cGal) rx += (Math.max(0, -Math.cos(m.anim * 0.6 + (par >= 0 && parts[par].p[2] > 0 ? 0.3 : 2.5) + ap)) * 1.2 - rx) * cGal; break;
        case 'shinB': rx = Math.max(0, Math.cos(m.anim + ap)) * amp * 1.3; if (cGal) rx += (Math.max(0, -Math.cos(m.anim * 0.6 + (par >= 0 && parts[par].p[2] > 0 ? 0 : 2.2) + ap)) * 1.2 - rx) * cGal; break;
        // floating bosses do not jog: their arms drift slowly and trail behind while they glide
        case 'armA': rx = (m.noclip ? Math.sin(ph * 1.3) * 0.08 + cMv : -Math.sin(m.anim + ap) * amp * 0.8) - cAtk * 1.7 + (P[0] + P[4] * cStrike) * cPose; rz = -P[2] * cPose; break;
        case 'armB': rx = (m.noclip ? -Math.sin(ph * 1.3) * 0.08 + cMv : Math.sin(m.anim + ap) * amp * 0.8) + (P[1] + P[4] * cStrike) * cPose; rz = P[2] * cPose; break;
        case 'foreA': case 'foreB': rx = -(0.15 + P[3] * cPose * (1 - 0.7 * cStrike) + cAtk * 0.5); break;
        case 'body': rx = P[5] * cWind + P[6] * cStrike + P[7] * open + Math.sin(time * 1.2 + id) * 0.015; rz = Math.sin(m.anim) * amp * 0.06; break;
        case 'head': rx = Math.sin(time * 1.3 + id + ap) * 0.06 - cAtk * 0.3 + P[8] * cPose - cStrike * 0.18; ry = cLook; break;
        case 'neck': rx = Math.sin(time * 1.1 + id + ap) * 0.04 + P[9] * cPose; ry = cLook * 0.5; break;
        case 'tail': ry = Math.sin(time * 4 + id + ap) * 0.45; break;
        case 'cape': rx = 0.12 + Math.min(1, m.moving / 3) * 0.55 + Math.sin(time * 2.5 + id + ap) * 0.05; break;
        // wings beat slower the bigger the creature, and fold up and back in a dive
        case 'wingA': rz = Math.sin(time * cFq + id + ap) * 0.75 * (1 - 0.8 * open) - 0.5 * open; ry = -0.55 * open; break;
        case 'wingB': rz = -Math.sin(time * cFq + id + ap) * 0.75 * (1 - 0.8 * open) + 0.5 * open; ry = 0.55 * open; break;
        case 'wingA2': rz = Math.sin(time * cFq + id + ap - 1) * 0.6 * (1 - 0.8 * open) + 0.2 + 1.1 * open; break;
        case 'wingB2': rz = -Math.sin(time * cFq + id + ap - 1) * 0.6 * (1 - 0.8 * open) - 0.2 - 1.1 * open; break;
        case 'claw': rx = 1.25 - open * 1.9; break;
        case 'bob': oy += Math.sin(time * 2.2 + id + ap) * 0.12; break;
        case 'drift': oy += Math.sin(ph * 1.1) * 0.18; ox = Math.sin(ph * 0.7 + 1.3) * 0.12; oz = Math.cos(ph * 0.6) * 0.12; break;
        case 'spin': ry = time * 2.2 + id + ap; oy += Math.sin(time * 3 + id) * 0.06; break;
        case 'spin2': ry = -time * 1.3 + ap; break;
        case 'spinx': rx = time * 1.6 + ap; break;
        case 'spinz': rz = time * 1.6 + ap; break;
        case 'halo': ry = cSpin + ap; rx = cAim * 1.5708; os = 1 - 0.55 * cAim; oy += Math.sin(time * 3 + id + ap) * 0.06; break;
        case 'float': oy += Math.sin(time * 1.1 + pp[1] * 1.7 + id) * 0.07 + cRage * pp[1] * 0.12; ry = Math.sin(time * 0.5 + pp[1] * 2.3) * 0.12 * (1 + 2 * cRage); break;
        case 'arch': oy += Math.sin(time * 1.1 + id) * 0.07; ry = Math.sin(time * 0.5 + id) * 0.2; os = 1 + 0.3 * cRage * cRage; break;
        case 'robe': rx = -Math.min(0.3, m.moving * 0.05) + Math.sin(time * 1.4 + id) * 0.04; rz = Math.sin(time * 1.1 + id) * 0.05 + Math.sin(time * 9) * 0.14 * cStrike; break;
        case 'clap': rx = Math.sin(time * 2.4 + id) * 0.18 + cStrike * 0.5; rz = Math.sin(time * 1.9 + id) * 0.12; break;
        case 'seal': rz = cSpin + ap; break;
        case 'sway': rx = Math.sin(ph * 1.7) * 0.18; rz = Math.sin(ph * 1.3 + 0.9) * 0.14; break;
        case 'squash': sy = Math.max(0.6, 1 + Math.max(-0.25, Math.min(0.35, m.vy * 0.03)) + Math.sin(time * 3 + id + ap) * 0.03 - 0.3 * m.sq); break;
        case 'pulse': { const q = Math.sin(ph * 4) * 0.5 + 0.5; ps = 0.94 + q * 0.12; pe = 0.75 + q * 0.5; break; }
        case 'jawA': rx = -(0.15 + cJaw * 0.6 + cAtk * 0.5); break;
        case 'jawB': rx = 0.15 + cJaw * 0.6 + cAtk * 0.5; break;
        case 'mandA': ry = -(0.12 + cJaw * 0.7); break;
        case 'mandB': ry = 0.12 + cJaw * 0.7; break;
      }
      const k = part.k;
      if (k !== undefined) { rx *= k; ry *= k; rz *= k; ox *= k; oy *= k; oz *= k; }
      const J = joints[i];
      mPart.makeTranslation(pp[0] + ox, pp[1] * sy + oy, pp[2] + oz);
      if (rx || ry || rz) { eul.set(rx, ry, rz); mRot.makeRotationFromEuler(eul); mPart.multiply(mRot); }
      J.multiplyMatrices(par >= 0 ? joints[par] : mBase, mPart);
      // a phase-gated box is skipped, but its joint above still carries any children
      if (part.ph && b && (cPhz < part.ph[0] || cPhz > part.ph[1])) continue;
      const r = part.r, sz = part.s, o = part.o;
      if (r) { eul.set(r[0], r[1], r[2]); mTmp.makeRotationFromEuler(eul); } else mTmp.identity();
      mTmp.scale(vS.set(sz[0] * ps, sz[1] * sy * ps, sz[2] * ps));
      if (o) mTmp.setPosition(o[0] * os, o[1] * os, o[2] * os);
      mBox.multiplyMatrices(J, mTmp);
      this.put(batch, i0 + i, part.c, cSky, cBlk, cFlash, (part.e ?? 0) * pe * cEmul + cGlow, part.t ?? 0, sz[0], sz[1], sz[2]);
    }
  }
  /** Add the box in mBox, first throwing it outward when a boss is shattering. */
  private put(batch: BoxBatch, i: number, c: number, sky: number, blk: number, flash: number, e: number, pat: number, sx: number, sy: number, sz: number): void {
    const u = this.shatter;
    if (u > 0) {
      const el = mBox.elements, bx = el[12], by = el[13], bz = el[14], ex = bx - this.scx, ey = by - this.scy, ez = bz - this.scz, l = Math.hypot(ex, ey, ez) || 1, f = u * u * 5;
      el[12] = 0; el[13] = 0; el[14] = 0;
      // tumble about the box's own centre, shrinking as it flies
      eul.set(u * 3 * ((i % 3) - 1), u * 2 * (((i + 1) % 3) - 1), u * 1.5 * (((i + 2) % 3) - 1)); mRot.makeRotationFromEuler(eul);
      mBox.premultiply(mRot); mTmp.makeScale(1 - u, 1 - u, 1 - u); mBox.premultiply(mTmp);
      el[12] = bx + (ex / l) * f; el[13] = by + (ey / l) * f + u * 2 - u * u * 8; el[14] = bz + (ez / l) * f;
      if (u >= 1) return;
    }
    batch.add(mBox, c, sky, blk, flash, e, pat, sx, sy, sz);
  }
  /** Contact shadow of radius `rad` centred on (cx, cz) for a body whose feet are at `y`: one quad per block column, on the
   *  first solid top below the feet (a short search for walkers, a long one for anything airborne), none over liquid. */
  private contact(cx: number, y: number, cz: number, rad: number, sky: number, air: boolean): void {
    const w = this.g.world, sh = this.shadows, yy = Math.floor(y + 0.3), reach = air ? 12 : 3;
    if (rad < 0.05 || T_LIQUID[w.getBlock(Math.floor(cx), Math.floor(y + 0.1), Math.floor(cz))]) return;
    const day = 0.4 + 0.6 * this.g.gfx.dayAmt;
    for (let bx = Math.floor(cx - rad); bx <= Math.floor(cx + rad); bx++) for (let bz = Math.floor(cz - rad); bz <= Math.floor(cz + rad); bz++) {
      if (T_SOLID[w.getBlock(bx, yy, bz)]) continue;
      for (let by = yy - 1; by >= yy - reach; by--) {
        const id = w.getBlock(bx, by, bz);
        if (T_LIQUID[id]) break;
        if (!T_SOLID[id]) continue;
        const hgt = Math.max(0, y - (by + 1));
        sh.add(bx, by + 1, bz, cx, cz, rad * (1 + hgt * 0.05), 0.6 * Math.max(0, 1 - hgt / 12) * (0.35 + 0.65 * sky * day));
        break;
      }
    }
  }
}
