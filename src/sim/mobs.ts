// Creatures: pooled entities and their archetype AI.
import { T_LIQUID } from '../data/blocks';
import { DIMS } from '../data/dims';
import { MOB_LIST, MobDef, mob as mobDef } from '../data/mobs';
import { type BossState, bossTick, newBossState } from './boss';
import { dayAmount } from './clock';
import { BURST } from './fx';
import { onMobKilled } from './loot';
import { Body, boxFree, moveBody, newRayHit, raycast } from './physics';
import { hurtPlayer, type SimPlayer } from './player';
import type { Realm } from './realm';
import { standSpot } from './rules';
import { trySpawn } from './spawn';

export class Mob implements Body {
  active = false; def!: MobDef; id = 0;
  x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0;
  hw = 0.3; h = 1; onGround = false; hitH = false; hitUp = false;
  yaw = 0; hp = 1; maxHp = 1; hurt = 0; anim = 0; atk = 0; atkCd = 0; moving = 0;
  state = 0; timer = 0; tx = 0; tz = 0; age = 0; kbx = 0; kbz = 0; flee = 0; stuck = 0;
  target: Mob | null = null; noclip = false; scale = 1; dmgMul = 1; event = false; talk = 0;
  boss: BossState | null = null; home: [number, number, number] | null = null; minionDmg = 0; hop = 0; open = 0;
  /** The yaw the body is drawn at, turning toward `yaw` at a finite rate. The hit test places a boss's head with it. */
  ry = 0;
  /** Landing squash of a hopper, 1 at touchdown, decaying. */
  sq = 0;
  /** Counts the jumps (a boss teleport) that a view must not blend across. */
  tpn = 0;
  /** Record id of a minion's owner. */
  owner: string | null = null;
  /** The player this creature is dealing with this tick. */
  tp: SimPlayer | null = null;
  tpT = 0;
  /** Damage taken, by the record id of the player who dealt it. */
  hitBy = new Map<string, number>();
  /** Record id of the player whose spawn attempt made it. */
  by: string | null = null;
}

export const POOL = 320;
const ray = newRayHit();
const DEF_INDEX = new Map<MobDef, number>(MOB_LIST.map((d, i) => [d, i]));
/** Index of a creature kind in MOB_LIST, the form it takes in events. */
export const defIndex = (d: MobDef): number => DEF_INDEX.get(d) ?? 0;

export class MobSim {
  readonly list: Mob[] = [];
  private spawnT = 0;
  hostileCap = 14; passiveCap = 9;
  /** Extra hostile spawn pressure from events (0 = none). */
  pressure = 0;
  safeZones: [number, number, number][] = [];
  private found: Mob[] = [];

  constructor(private realm: Realm) { for (let i = 0; i < POOL; i++) this.list.push(new Mob()); }

  spawn(key: string, x: number, y: number, z: number): Mob | null {
    const m = this.list.find((q) => !q.active), rnd = this.realm.sim.rnd;
    if (!m) return null;
    const d = mobDef(key);
    Object.assign(m, new Mob());
    m.active = true; m.def = d; m.id = this.realm.sim.mobId++;
    m.x = x; m.y = y; m.z = z; m.hw = d.hw; m.h = d.h; m.hp = m.maxHp = d.hp;
    m.yaw = rnd() * 6.283; m.tx = x; m.tz = z; m.timer = rnd() * 2;
    m.noclip = d.ai === 'minion' || (!!d.boss && d.boss.move !== 'walk');
    if (d.boss) { m.boss = newBossState(m, rnd); m.dmgMul = 1.4; }
    m.ry = m.yaw;
    return m;
  }
  /** Take a creature out of the world without a death: how 0 despawned, 2 a boss withdrew. */
  remove(m: Mob, how = 0): void { if (!m.active) return; m.active = false; this.realm.sim.sink.emit({ dim: this.realm.dim }, ['md', m.id, how]); }
  clear(keepMinions = false): void { for (const m of this.list) if (m.active && !(keepMinions && m.def.ai === 'minion')) m.active = false; }
  count(pred: (m: Mob) => boolean): number { let n = 0; for (const m of this.list) if (m.active && pred(m)) n++; return n; }
  bosses(): Mob[] { const l = this.found; l.length = 0; for (const m of this.list) if (m.active && m.boss) l.push(m); return l; }
  /** The first live boss, or null. */
  boss(): Mob | null { for (const m of this.list) if (m.active && m.boss) return m; return null; }
  byId(id: number): Mob | null { for (const m of this.list) if (m.active && m.id === id) return m; return null; }

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

  // ---- damage ----
  /** `by`: the player the damage counts for (own blows, projectiles, minions, thorns), or null. */
  hurt(m: Mob, raw: number, kx: number, kz: number, knock: number, crit: boolean, by: SimPlayer | null): void {
    const realm = this.realm;
    if (!m.active || m.def.ai === 'minion') return;
    if (m.def.ai === 'npc') { m.hurt = 0.2; return; }
    const dmg = Math.max(1, Math.round(raw - m.def.def * 0.5));
    m.hp -= dmg; m.hurt = 0.22; m.flee = 5;
    if (by) m.hitBy.set(by.id, (m.hitBy.get(by.id) ?? 0) + dmg);
    const kr = 1 - (m.def.knockRes ?? 0), kl = Math.hypot(kx, kz) || 1;
    m.kbx += (kx / kl) * knock * kr; m.kbz += (kz / kl) * knock * kr;
    if (kr > 0.3 && m.onGround) m.vy = 4.5;
    realm.floater(m.x, m.y + m.h + 0.2, m.z, String(dmg), crit ? '#ffd34a' : '#ffffff', crit);
    realm.sound(crit ? 'crit' : 'hit', 0.8, 1, m.x, m.y, m.z);
    realm.sound('mobhurt', 0.5, m.def.voice ?? 1, m.x, m.y, m.z);
    realm.burst(BURST.mobHit, m.x, m.y + m.h * 0.6, m.z, defIndex(m.def));
    if (m.hp <= 0) this.kill(m, by);
  }
  private kill(m: Mob, by: SimPlayer | null): void {
    const realm = this.realm;
    m.active = false;
    realm.sound('mobdie', 0.7, m.def.voice ?? 1, m.x, m.y, m.z);
    realm.sim.sink.emit({ dim: realm.dim }, ['md', m.id, 1]);
    // rewards are paid now, so leaving mid-animation cannot lose the kill
    onMobKilled(realm, m, by);
  }

  // ---- simulation ----
  tick(dt: number): void {
    const realm = this.realm, sim = realm.sim, w = realm, rnd = sim.rnd, time = sim.time;
    for (const m of this.list) {
      if (!m.active) continue;
      // a minion deals with its owner, everything else with whoever is closest
      const pl = m.def.ai === 'minion' ? (m.owner ? sim.players.get(m.owner) ?? null : null) : realm.closest(m.x, m.y, m.z);
      if (!pl || pl.dim !== realm.dim) { if (m.def.ai === 'minion') this.remove(m); continue; }
      m.tp = pl;
      const p = pl.body, px = m.x, pz = m.z;
      // a spawner may turn a creature before its first tick
      if (m.age === 0) m.ry = m.yaw;
      m.age += dt;
      if (m.hurt > 0) m.hurt -= dt;
      if (m.atk > 0) m.atk -= dt;
      if (m.atkCd > 0) m.atkCd -= dt;
      if (m.flee > 0) m.flee -= dt;
      if (m.talk > 0) m.talk -= dt;
      const dx = p.x - m.x, dz = p.z - m.z, dy = p.y - m.y, dist = Math.hypot(dx, dz), d3 = Math.hypot(dist, dy);
      const d = m.def;
      // despawn rules
      if (!m.boss && d.ai !== 'npc' && d.ai !== 'minion') {
        if (d3 > 110 || (d3 > 56 && m.age > 40 && rnd() < dt * 0.1)) { this.remove(m); continue; }
      }
      if (!w.ready(Math.floor(m.x), Math.floor(m.z))) continue;
      { let a = m.yaw - m.ry; a -= Math.round(a / 6.2832) * 6.2832; m.ry += a * Math.min(1, dt * (m.boss ? 6 : 12)); }
      let wx = 0, wz = 0, speed = d.speed, wantJump = false, fly = false, vyWant = 0;
      const dead = pl.stats.dead;

      switch (d.ai) {
        case 'passive': {
          m.timer -= dt;
          if (m.flee > 0) { wx = -dx; wz = -dz; speed *= 1.7; }
          else {
            if (m.timer <= 0) { m.timer = 3 + rnd() * 6; const a = rnd() * 6.283, r = rnd() < 0.35 ? 0 : 2 + rnd() * 6; m.tx = m.x + Math.cos(a) * r; m.tz = m.z + Math.sin(a) * r; }
            wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.5;
            if (Math.hypot(wx, wz) < 0.5) { wx = 0; wz = 0; }
          }
          break;
        }
        case 'npc': {
          m.timer -= dt;
          const night = sim.isNight() || this.pressure > 0;
          const hx = m.home ? m.home[0] + 0.5 : m.x, hz = m.home ? m.home[2] + 0.5 : m.z;
          if (m.talk > 0) { m.yaw = Math.atan2(dx, dz); break; }
          if (m.timer <= 0) { m.timer = 4 + rnd() * 7; const a = rnd() * 6.283, r = night ? rnd() * 1.5 : 1 + rnd() * 7; m.tx = hx + Math.cos(a) * r; m.tz = hz + Math.sin(a) * r; }
          wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.7;
          if (Math.hypot(wx, wz) < 0.6) { wx = 0; wz = 0; }
          if (m.home && Math.hypot(m.x - hx, m.z - hz) > 40) { const q = standSpot(w, m.home[0], m.home[1], m.home[2]); m.x = q[0]; m.y = q[1]; m.z = q[2]; }
          break;
        }
        case 'melee': case 'hopper': {
          const chase = !dead && d3 < (d.aggro ?? 16) && !pl.modes.hidden;
          if (chase) { wx = dx; wz = dz; } else { m.timer -= dt; if (m.timer <= 0) { m.timer = 3 + rnd() * 5; const a = rnd() * 6.283; m.tx = m.x + Math.cos(a) * 5; m.tz = m.z + Math.sin(a) * 5; } wx = m.tx - m.x; wz = m.tz - m.z; speed *= 0.45; if (Math.hypot(wx, wz) < 0.5) wx = wz = 0; }
          if (d.ai === 'hopper') {
            m.hop -= dt;
            if (m.onGround) { if (m.hop <= 0 && (wx || wz)) { m.hop = 0.7 + rnd() * 0.6; m.vy = chase ? 8 : 6; m.onGround = false; } else speed = 0; }
          }
          break;
        }
        case 'ranged': {
          const see = !dead && d3 < (d.aggro ?? 18);
          if (see) {
            const want = d.range ?? 10;
            if (dist > want * 0.85) { wx = dx; wz = dz; } else if (dist < want * 0.4) { wx = -dx; wz = -dz; }
            m.yaw = Math.atan2(dx, dz);
            if (m.atkCd <= 0 && dist < want * 1.3 && this.canSee(m, pl)) {
              m.atkCd = d.rate ?? 2; m.atk = 0.3;
              const ox = m.x, oy = m.y + m.h * 0.8, oz = m.z, tl = Math.hypot(dx, dy + p.h * 0.6 - m.h * 0.8, dz) || 1;
              realm.proj.fire(d.proj!, ox, oy, oz, dx / tl, (dy + p.h * 0.6 - m.h * 0.8) / tl + 0.03, dz / tl, d.dmg * m.dmgMul, null);
              realm.sound('shoot', 0.6, d.voice ?? 1, m.x, m.y, m.z);
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
            if (ranged && m.atkCd <= 0 && dist < (d.range ?? 9) * 1.4 && this.canSee(m, pl)) {
              m.atkCd = d.rate ?? 2;
              const tl = Math.hypot(dx, dy + p.h * 0.5 - m.h * 0.5, dz) || 1;
              realm.proj.fire(d.proj!, m.x, m.y + m.h * 0.5, m.z, dx / tl, (dy + p.h * 0.5 - m.h * 0.5) / tl, dz / tl, d.dmg * m.dmgMul, null);
              realm.sound('shoot', 0.5, (d.voice ?? 1) * 1.2, m.x, m.y, m.z);
            }
          } else { m.timer -= dt; if (m.timer <= 0) { m.timer = 2 + rnd() * 4; const a = rnd() * 6.283; m.tx = Math.cos(a); m.tz = Math.sin(a); m.state = rnd() < 0.5 ? 1 : -1; } wx = m.tx; wz = m.tz; speed *= 0.4; vyWant = m.state * 0.5; }
          if (m.hitH) vyWant = speed;
          break;
        }
        case 'fish': {
          fly = true; m.timer -= dt;
          if (m.timer <= 0) { m.timer = 1 + rnd() * 3; const a = rnd() * 6.283; m.tx = Math.cos(a); m.tz = Math.sin(a); m.state = rnd() * 2 - 1; }
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
          else { const a = m.id * 2.4 + time * 0.7; gx = p.x + Math.cos(a) * 1.6; gy = p.y + 2.1 + Math.sin(time * 2 + m.id) * 0.2; gz = p.z + Math.sin(a) * 1.6; }
          const ex = gx - m.x, ey = gy - m.y, ez = gz - m.z, el = Math.hypot(ex, ey, ez);
          if (el > 40) { m.x = p.x; m.y = p.y + 2; m.z = p.z; }
          const sp = Math.min(d.speed, el * 5), k = Math.min(1, dt * 8);
          m.vx += ((ex / (el || 1)) * sp - m.vx) * k; m.vy += ((ey / (el || 1)) * sp - m.vy) * k; m.vz += ((ez / (el || 1)) * sp - m.vz) * k;
          m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
          if (el > 0.2) m.yaw = Math.atan2(ex, ez);
          if (t && el < t.hw + 0.9 && m.atkCd <= 0) {
            m.atkCd = 0.55; m.atk = 0.2;
            const crit = rnd() < pl.stats.d.crit;
            this.hurt(t, m.minionDmg * pl.stats.dmgMult('summon') * (crit ? 2 : 1), ex, ez, 3, crit, pl);
          }
          m.moving = Math.hypot(m.vx, m.vz); m.anim += dt * 8;
          continue;
        }
        case 'boss': {
          bossTick(realm, m, dt);
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
        m.moving = Math.hypot(m.x - px, m.z - pz) / dt;
        m.anim += m.moving * dt * 2.4 + (fly ? dt * 4 : 0);
        // touch damage
        if (d.hostile && d.dmg > 0 && !d.proj && !dead && m.atkCd <= 0 && Math.abs(dx) < m.hw + p.hw + 0.25 && Math.abs(dz) < m.hw + p.hw + 0.25 && p.y < m.y + m.h + 0.2 && p.y + p.h > m.y - 0.2) {
          m.atkCd = d.rate ?? 1; m.atk = 0.3;
          hurtPlayer(sim, pl, d.dmg * m.dmgMul, m.x, m.z, d.name, m);
        }
        // shades come apart in direct sun
        if ((d.key === 'gloomshade' || d.key === 'moonspawn') && dayAmount(sim.shared.clock, realm.dim) > 0.75 && DIMS[realm.dim].hasSky && realm.light.sky(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)) >= 14 && !m.event) {
          m.hp -= dt * m.maxHp * 0.25; m.hurt = 0.1;
          if (m.hp <= 0) { m.active = false; sim.sink.emit({ dim: realm.dim }, ['md', m.id, 1]); continue; }
        }
        if (m.y < -10) this.remove(m);
        if (d.hostile && d3 < 20 && rnd() < dt * 0.06) realm.sound('growl', 0.5, d.voice ?? 1, m.x, m.y, m.z);
      }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 0.35; for (const pl of realm.players) trySpawn(realm, pl); }
  }
  canSee(m: Mob, pl: SimPlayer): boolean {
    const p = pl.body, ox = m.x, oy = m.y + m.h * 0.8, oz = m.z, dx = p.x - ox, dy = p.y + p.eye - oy, dz = p.z - oz, l = Math.hypot(dx, dy, dz) || 1;
    raycast(this.realm, ox, oy, oz, dx / l, dy / l, dz / l, l, ray, false, true);
    return !ray.hit;
  }
}
