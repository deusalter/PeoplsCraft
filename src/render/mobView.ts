// Creatures as drawn: the view of one creature (what the simulation says about it plus what only
// drawing needs: the previous tick to blend from, eased light), box-model rendering, contact shadows,
// and the corpses that play a death after the creature itself is gone.
import * as THREE from 'three';
import type { GameAudio } from '../audio/audio';
import { T_LIQUID, T_OPAQUE, T_SOLID } from '../data/blocks';
import { MAX_PARTS, MobDef, type Part, rigOf } from '../data/mobs';
import { segK } from '../sim/mobhit';
import type { World } from '../world/world';
import { type BoxBatch, type Particles, ShadowBatch } from './batches';

/** A boss's body language, now and one tick ago (and `segs` in psegs): drawing blends between the two, as it does for position. */
export interface BossView {
  phase: number; kind: string; wind: number; strike: number; pose: number; aim: number; rage: number; pitch: number; roll: number; spin: number;
  ax: number; ay: number; az: number; fxm: number; segs: Float32Array | null;
  ppose: number; pwind: number; pstrike: number; paim: number; ppitch: number; proll: number; pspin: number; psegs: Float32Array | null;
}
export class MobView {
  active = false; def!: MobDef; id = 0;
  x = 0; y = 0; z = 0; vy = 0; px = 0; py = 0; pz = 0;
  hw = 0.3; h = 1; onGround = false; yaw = 0; hp = 1; maxHp = 1; hurt = 0; anim = 0; atk = 0; moving = 0;
  age = 0; flee = 0; noclip = false; scale = 1; open = 0; sq = 0; tpn = 0;
  boss: BossView | null = null;
  /** `open` one tick ago, and on a corpse how far a dying flyer may fall before it reaches the floor. */
  popen = 0; drop = 0;
  /** Eased world light (sky, block; ls < 0 = not sampled yet) and the drawn yaw now and one tick ago. */
  ls = -1; lb = 0; ry = 0; pry = 0;
}

export interface MobHost { world: World; particles: Particles; audio: GameAudio; player: { x: number; y: number; z: number; shake(a: number): void }; gfx: { dayAmt: number }; paused: boolean; time: number }

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
let cAmp = 0, cMv = 0, cAtk = 0, cPose = 0, cLook = 0, cWind = 0, cStrike = 0, cRage = 0, cAim = 0, cJaw = 0, cOpen = 0, cSpin = 0, cGal = 0, cFq = 16, cFa = 0.75, cBob = 0, cSky = 1, cBlk = 0, cFlash = 0, cEmul = 1, cGlow = 0, cPhz = 0;
let cP: readonly number[] = POSE0;
/** World matrix of every box's joint in the model being drawn, so `par` children can ride on it. */
const joints: THREE.Matrix4[] = [];
for (let i = 0; i < MAX_PARTS + 1; i++) joints.push(new THREE.Matrix4());
/** Dying creatures stay visible for a moment in a small pool of frozen copies. */
const CORPSES = 12;

export class MobRender {
  private corpses: MobView[] = []; private corpseT = new Float32Array(CORPSES); private corpseDur = new Float32Array(CORPSES); private corpseTime = new Float32Array(CORPSES);
  /** Pixelated contact shadows under creatures, drawn after the terrain. */
  readonly shadows = new ShadowBatch();

  constructor(private g: MobHost) { for (let i = 0; i < CORPSES; i++) this.corpses.push(new MobView()); }

  clearCorpses(): void { this.corpseT.fill(0); this.corpseDur.fill(0); }

  /** Leave a frozen copy of `m` (already inactive) to play its death: topple or fall for creatures, shudder and shatter for bosses. */
  corpse(m: MobView): void {
    let ci = 0;
    for (let i = 0; i < CORPSES; i++) { if (this.corpseT[i] >= this.corpseDur[i]) { ci = i; break; } if (this.corpseT[i] > this.corpseT[ci]) ci = i; }
    const c = this.corpses[ci];
    Object.assign(c, m); c.active = false;
    // frozen where it died: nothing left for the renderer to blend from
    c.px = c.x; c.py = c.y; c.pz = c.z; c.pry = c.ry;
    // a dying flyer falls no further than the floor under it
    if (!m.boss && (m.noclip || m.def.ai === 'flyer' || m.def.ai === 'fish')) {
      const w = this.g.world, bx = Math.floor(m.x), bz = Math.floor(m.z);
      c.drop = 4;
      for (let i = 0, by = Math.floor(m.y); i < 3; i++, by--) if (T_SOLID[w.getBlock(bx, by, bz)]) { c.drop = Math.max(0, m.y - (by + 1)); break; }
    }
    this.corpseT[ci] = 0; this.corpseDur[ci] = m.boss ? 2.4 : 0.65; this.corpseTime[ci] = this.g.time;
  }
  /** Pieces that fly off a corpse: a few random part colours around its body. */
  private debris(c: MobView, n: number, spd: number, life: number, size: number, glow: number, grav: number): void {
    const g = this.g, ps = c.def.parts, s = c.scale;
    for (let i = 0; i < n; i++) g.particles.spawn(c.x + (Math.random() - 0.5) * c.hw * 2 * s, c.y + Math.random() * c.h * s, c.z + (Math.random() - 0.5) * c.hw * 2 * s,
      (Math.random() - 0.5) * spd, Math.random() * spd, (Math.random() - 0.5) * spd, life, size, ps[(Math.random() * ps.length) | 0].c, glow, grav, -1, true);
  }
  tickCorpses(dt: number): void {
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
  sampleLight(m: MobView, k: number): void {
    const w = this.g.world, bx = Math.floor(m.x), bz = Math.floor(m.z);
    let by = Math.floor(m.y + m.h * 0.5);
    if (T_OPAQUE[w.getBlock(bx, by, bz)]) { by = Math.floor(m.y + m.h + 0.5); if (T_OPAQUE[w.getBlock(bx, by, bz)]) { by = Math.floor(m.y + m.h + 2.5); if (T_OPAQUE[w.getBlock(bx, by, bz)]) return; } }
    const l = w.getLight(bx, by, bz), sky = (l >> 4) / 15, blk = (l & 15) / 15;
    if (m.ls < 0 || k >= 1) { m.ls = sky; m.lb = blk; } else { m.ls += (sky - m.ls) * k; m.lb += (blk - m.lb) * k; }
  }

  // ---- rendering ----
  render(batch: BoxBatch, list: readonly MobView[], alpha: number, time: number): void {
    this.shadows.begin();
    for (const m of list) if (m.active) this.draw(batch, m, alpha, time, -1);
    for (let i = 0; i < CORPSES; i++) if (this.corpseT[i] < this.corpseDur[i]) this.draw(batch, this.corpses[i], alpha, this.corpseTime[i], i);
    this.shadows.end();
  }
  // explosion of a shattering boss, read by put(): progress (0 = intact) and the centre the pieces fly from
  private shatter = 0; private scx = 0; private scy = 0; private scz = 0;
  /** One creature (ci < 0) or corpse ci. Box matrix = Base * [parent joint] * T(p) * Ranim * T(o) * Rstatic * S (see Part). */
  private draw(batch: BoxBatch, m: MobView, alpha: number, time: number, ci: number): void {
    const g = this.g, d = m.def, b = m.boss, parts = d.parts, spec = d.boss;
    const x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha, z = m.pz + (m.z - m.pz) * alpha;
    // a spawner may set yaw directly before the first tick (dev showcase, scripted spawns)
    if (m.age === 0) m.ry = m.pry = m.yaw;
    const yaw = m.pry + (m.ry - m.pry) * alpha;
    // boss body language is blended between ticks like position; a corpse shares its boss state, which is never ticked again
    const al = ci >= 0 ? 1 : alpha;
    let bWind = 0, bStrike = 0, bPitch = 0, bRoll = 0;
    if (b) { bWind = b.pwind + (b.wind - b.pwind) * al; bStrike = b.pstrike + (b.strike - b.pstrike) * al; bPitch = b.ppitch + (b.pitch - b.ppitch) * al; bRoll = b.proll + (b.roll - b.proll) * al; }
    cOpen = m.popen + (m.open - m.popen) * al;
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
        if (m.noclip || d.ai === 'flyer' || d.ai === 'fish') fall = Math.min(4 * t * t, m.drop); else topple = Math.min(1, k * 1.6) ** 2 * 1.5708;
      }
    }
    if (s <= 0.001) return;
    const amp = Math.min(1, m.moving / 2.5) * 0.7;
    // stretch and squash: bosses rise into a wind-up and flatten at the strike, and a gallop bounds
    let q = 1, lift = 0;
    cGal = 0;
    if (b && spec) {
      q = 1 + bWind * 0.07 - bStrike * 0.13 + (spec.move === 'hover' ? Math.min(0.12, Math.abs(m.vy) * 0.005) : 0);
      if (spec.gallop) { cGal = Math.max(0, Math.min(1, (m.moving - 11) / 5)); lift = cGal * Math.abs(Math.sin(m.anim * 0.6 + 1.1)) * 0.3; }
    }
    if (b && (bPitch || bRoll)) {
      // nose up or down and bank, turning about the middle of the body
      const c = m.noclip ? m.h * 0.5 * s : 0;
      eulB.set(-bPitch, yaw, bRoll); mBase.makeRotationFromEuler(eulB);
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
    cSky = sky; cBlk = blk; cFlash = flash; cGlow = glowAdd; cFq = 16 / (1 + m.hw); cFa = 0.75 / (1 + m.hw * 0.4);
    if (b) {
      cPose = b.ppose + (b.pose - b.ppose) * al; cWind = bWind; cStrike = bStrike; cRage = b.rage; cAim = b.paim + (b.aim - b.paim) * al; cSpin = b.pspin + (b.spin - b.pspin) * al; cPhz = Math.max(0, b.phase); cP = POSE[b.kind] ?? POSE0;
      cJaw = Math.max(cOpen, bWind * 0.7, bStrike); cBob = 0;
      // the whole body flares as an attack gathers, and burns hotter in later phases
      emul *= 1 + bWind * 1.2 + bStrike * 0.5 + b.rage * 0.4;
    } else {
      cPose = 0; cWind = 0; cStrike = 0; cRage = 0; cAim = 0; cSpin = time * 2.2; cPhz = 0; cP = POSE0; cJaw = cOpen;
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
    const sg = b ? b.segs : null, pg = b ? b.psegs : null, sp = spec ? spec.seg : undefined;
    if (sg && pg && sp) {
      // body segments: each is the `seg` box list, tapering, turned toward the link ahead of it, blended between ticks like the head
      const n = sg.length / 3, cyo = m.h * 0.5, ss = s < 1 ? s : 1;
      let lx = x, ly = y, lz = z;
      for (let i = 0; i < n; i++) {
        const o = i * 3, k = segK(i, n) * ss;
        if (sg[o] === 0 && sg[o + 1] === 0 && sg[o + 2] === 0) continue;
        const gx = pg[o] + (sg[o] - pg[o]) * al, gy = pg[o + 1] + (sg[o + 1] - pg[o + 1]) * al, gz = pg[o + 2] + (sg[o + 2] - pg[o + 2]) * al;
        const ex = lx - gx, ey = ly - gy, ez = lz - gz;
        eulB.set(-Math.atan2(ey, Math.hypot(ex, ez)), Math.atan2(ex, ez), 0); mBase.makeRotationFromEuler(eulB);
        mBase.setPosition(gx + shake, gy + cyo * ss - fall, gz); mBase.scale(vS.set(k, k, k));
        this.boxes(batch, m, sp, time, i * 0.7, parts.length + i * sp.length);
        if (u === 0) this.contact(gx, gy + 0.1, gz, m.hw * 0.7 * k, sky, true);
        lx = gx; ly = gy; lz = gz;
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
  private boxes(batch: BoxBatch, m: MobView, parts: Part[], time: number, apAdd: number, i0: number): void {
    const rig = rigOf(parts), b = m.boss, id = m.id, amp = cAmp, P = cP, open = cOpen;
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
        // wings beat slower and shallower the bigger the creature, and fold up and back in a dive
        case 'wingA': rz = Math.sin(time * cFq + id + ap) * cFa * (1 - 0.8 * open) - 0.5 * open; ry = -0.55 * open; break;
        case 'wingB': rz = -Math.sin(time * cFq + id + ap) * cFa * (1 - 0.8 * open) + 0.5 * open; ry = 0.55 * open; break;
        case 'wingA2': rz = Math.sin(time * cFq + id + ap - 1) * cFa * 0.8 * (1 - 0.8 * open) + 0.12 + 1.1 * open; break;
        case 'wingB2': rz = -Math.sin(time * cFq + id + ap - 1) * cFa * 0.8 * (1 - 0.8 * open) - 0.12 - 1.1 * open; break;
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
