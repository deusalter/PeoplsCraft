// The client's picture of everything that moves: one view per creature, projectile and drop, holding
// what drawing needs (the previous tick for blending, eased light, meshes). While the simulation
// runs in the same thread the views are filled straight from its lists, tick by tick.
import { DIMS } from '../data/dims';
import type { BoxBatch } from '../render/batches';
import { DropRender, DropView } from '../render/dropView';
import type { ItemModels } from '../render/itemModel';
import { type BossView, type MobHost, MobRender, MobView } from '../render/mobView';
import { ProjView, renderProjs } from '../render/projView';
import { FXM, floorNear, groundY } from '../sim/boss';
import type { Fx } from '../sim/fx';
import type { Mob } from '../sim/mobs';
import type { Realm } from '../sim/realm';

/** Colour of the motes that gather round a boss while it winds up, by attack kind. */
const TELEGRAPH: Record<string, number> = { charge: 0xff5a3a, slam: 0xffb03a, volley: 0x9ad0ff, spiral: 0xd0a0ff, rain: 0xff5a3a, ring: 0xffe06a, summon: 0x9aff6a, teleport: 0xffffff };

export interface EntityHost extends MobHost { dim: number }

export class EntityStore {
  readonly mobs: MobView[] = [];
  readonly projs: ProjView[] = [];
  readonly drops: DropView[] = [];
  readonly mobRender: MobRender;
  readonly dropRender: DropRender;
  /** Places a boss has marked for a strike: owner id, x, z, seconds left, and whether it arrived during this tick. */
  private marks: { id: number; x: number; z: number; t: number; fresh: boolean }[] = [];
  private realm: Realm | null = null;

  constructor(private g: EntityHost, models: ItemModels) { this.mobRender = new MobRender(g); this.dropRender = new DropRender(models); }

  /** The first boss in view, for the boss bar and the music. */
  boss(): MobView | null { for (const m of this.mobs) if (m.active && m.boss) return m; return null; }
  get mobCount(): number { let n = 0; for (const m of this.mobs) if (m.active) n++; return n; }
  get projCount(): number { let n = 0; for (const p of this.projs) if (p.active) n++; return n; }
  get dropCount(): number { let n = 0; for (const d of this.drops) if (d.active) n++; return n; }

  /** Before a simulation step: what is true now is the state the next frames blend from. */
  begin(realm: Realm, dt: number): void {
    const w = this.g.world, ml = realm.mobs.list, pl = realm.proj.list, dl = realm.drops.list;
    for (let i = 0; i < ml.length && i < this.mobs.length; i++) {
      const m = ml[i], v = this.mobs[i], b = m.boss, vb = v.boss;
      if (!v.active || !m.active || v.id !== m.id) continue;
      v.px = m.x; v.py = m.y; v.pz = m.z;
      if (b && vb) {
        vb.ppose = b.pose; vb.pwind = b.wind; vb.pstrike = b.strike; vb.paim = b.aim; vb.ppitch = b.pitch; vb.proll = b.roll; vb.pspin = b.spin; v.popen = m.open;
        if (b.segs && vb.psegs) vb.psegs.set(b.segs);
      }
      if (!w.ready(Math.floor(m.x), Math.floor(m.z))) continue;
      v.pry = m.ry;
      this.mobRender.sampleLight(v, Math.min(1, dt * 10));
    }
    for (let i = 0; i < pl.length && i < this.projs.length; i++) { const p = pl[i], v = this.projs[i]; if (v.active && p.active && v.id === p.id) { v.px = p.x; v.py = p.y; v.pz = p.z; } }
    for (let i = 0; i < dl.length && i < this.drops.length; i++) { const d = dl[i], v = this.drops[i]; if (v.active && d.active && v.id === d.id) { v.px = d.x; v.py = d.y; v.pz = d.z; } }
  }

  private copyMob(m: Mob, v: MobView): void {
    const fresh = !v.active || v.id !== m.id, b = m.boss;
    v.active = true; v.id = m.id; v.def = m.def;
    v.x = m.x; v.y = m.y; v.z = m.z; v.vy = m.vy; v.hw = m.hw; v.h = m.h; v.onGround = m.onGround; v.yaw = m.yaw; v.hp = m.hp; v.maxHp = m.maxHp;
    v.hurt = m.hurt; v.anim = m.anim; v.atk = m.atk; v.moving = m.moving; v.age = m.age; v.flee = m.flee; v.noclip = m.noclip; v.scale = m.scale; v.open = m.open; v.sq = m.sq; v.ry = m.ry;
    if (b) {
      let vb: BossView | null = fresh ? null : v.boss;
      if (!vb) vb = v.boss = { phase: 0, kind: '', wind: 0, strike: 0, pose: 0, aim: 0, rage: 0, pitch: 0, roll: 0, spin: 0, ax: 0, ay: 0, az: 1, fxm: 0, segs: b.segs, ppose: b.pose, pwind: b.wind, pstrike: b.strike, paim: b.aim, ppitch: b.pitch, proll: b.roll, pspin: b.spin, psegs: b.segs ? new Float32Array(b.segs) : null };
      vb.phase = b.phase; vb.kind = b.kind; vb.wind = b.wind; vb.strike = b.strike; vb.pose = b.pose; vb.aim = b.aim; vb.rage = b.rage; vb.pitch = b.pitch; vb.roll = b.roll; vb.spin = b.spin;
      vb.ax = b.ax; vb.ay = b.ay; vb.az = b.az; vb.fxm = b.fxm; vb.segs = b.segs;
      // a segment that has just been placed has nowhere to blend from
      if (b.segs && vb.psegs) for (let o = 0; o < b.segs.length; o += 3) if (vb.psegs[o] === 0 && vb.psegs[o + 1] === 0 && vb.psegs[o + 2] === 0) { vb.psegs[o] = b.segs[o]; vb.psegs[o + 1] = b.segs[o + 1]; vb.psegs[o + 2] = b.segs[o + 2]; }
    } else v.boss = null;
    if (fresh) { v.px = m.x; v.py = m.y; v.pz = m.z; v.pry = m.ry; v.popen = m.open; v.drop = 0; v.tpn = m.tpn; v.ls = -1; v.lb = 0; this.mobRender.sampleLight(v, 1); }
    else if (v.tpn !== m.tpn) { v.tpn = m.tpn; v.px = m.x; v.py = m.y; v.pz = m.z; v.pry = m.ry; }
  }

  /** Bring every view up to the simulation's current state. Something new starts where it is. */
  sync(realm: Realm): void {
    if (realm !== this.realm) { this.realm = realm; this.marks.length = 0; this.mobRender.clearCorpses(); for (const v of this.mobs) v.active = false; for (const v of this.projs) v.active = false; for (const v of this.drops) this.dropRender.hide(v); }
    const ml = realm.mobs.list, pl = realm.proj.list, dl = realm.drops.list;
    while (this.mobs.length < ml.length) this.mobs.push(new MobView());
    for (let i = 0; i < ml.length; i++) { const m = ml[i]; if (m.active) this.copyMob(m, this.mobs[i]); else this.mobs[i].active = false; }
    while (this.projs.length < pl.length) this.projs.push(new ProjView());
    for (let i = 0; i < pl.length; i++) {
      const p = pl[i], v = this.projs[i];
      if (!p.active) { v.active = false; continue; }
      if (!v.active || v.id !== p.id) { v.active = true; v.id = p.id; v.def = p.def; v.px = p.x; v.py = p.y; v.pz = p.z; }
      v.x = p.x; v.y = p.y; v.z = p.z; v.vx = p.vx; v.vy = p.vy; v.vz = p.vz;
    }
    while (this.drops.length < dl.length) this.drops.push(new DropView());
    for (let i = 0; i < dl.length; i++) {
      const d = dl[i], v = this.drops[i];
      if (!d.active) { if (v.active) this.dropRender.hide(v); continue; }
      if (!v.active || v.id !== d.id) {
        this.dropRender.hide(v); this.dropRender.show(v, d.it.k);
        v.active = true; v.id = d.id; v.px = d.x; v.py = d.y; v.pz = d.z;
      }
      v.x = d.x; v.y = d.y; v.z = d.z; v.age = d.age;
    }
  }

  /** After a simulation step: the view work that happens once a tick (corpses, continuous emitters, drop light). */
  end(realm: Realm, dt: number): void {
    this.sync(realm);
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

  /** The events that concern the things in this store: a death to play, a shot ending, ground marked by a boss. */
  onFx(ev: Fx): void {
    const realm = this.realm, ps = this.g.particles, R = Math.random;
    if (!realm) return;
    if (ev[0] === 'md') {
      const i = realm.mobs.list.findIndex((m) => m.id === ev[1]);
      this.marks = this.marks.filter((k) => k.id !== ev[1]);
      if (i < 0 || ev[2] !== 1) return;
      // the creature as it was when it died, not as the last frame showed it
      while (this.mobs.length <= i) this.mobs.push(new MobView());
      const v = this.mobs[i];
      this.copyMob(realm.mobs.list[i], v);
      this.mobRender.corpse(v);
      v.active = false;
    } else if (ev[0] === 'pe') {
      const p = realm.proj.list.find((q) => q.id === ev[1]);
      if (!p || !ev[5]) return;
      const d = p.def;
      if (d.trail !== undefined && R() < (1 / 60) * 30) ps.spawn(ev[2], ev[3], ev[4], (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6, 0.35, d.size * 0.5, d.trail, d.glow, 0);
      for (let i = 0; i < 5; i++) ps.spawn(ev[2], ev[3], ev[4], (R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4, 0.35, d.size * 0.45, d.color, d.glow, 9);
    } else if (ev[0] === 'mk') {
      for (let i = 2; i + 2 < ev.length; i += 3) this.marks.push({ id: ev[1], x: ev[i] as number, z: ev[i + 1] as number, t: ev[i + 2] as number, fresh: true });
    }
  }

  render(batch: BoxBatch, alpha: number, time: number): void {
    this.mobRender.render(batch, this.mobs, alpha, time);
    renderProjs(batch, this.projs, this.g.world, alpha);
  }
  renderDrops(alpha: number): void { this.dropRender.render(this.drops, alpha); }
}
