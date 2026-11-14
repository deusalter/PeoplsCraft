// Natural spawning: where creatures appear around a player, and which.
import { SEA } from '../core/constants';
import { T_LIQUID, T_SOLID } from '../data/blocks';
import { BIOMES } from '../data/biomes';
import { DIMS } from '../data/dims';
import { MOB_LIST, MobDef, SpawnRule } from '../data/mobs';
import { active, type SimPlayer } from './player';
import type { Realm } from './realm';

/** Others within this many blocks raise a player's caps; creatures within this many count against them; a boss this close
 *  holds hostiles to 2; no creature appears this close to any player (7.2). */
export const NEAR_R = 48, CAP_R = 110, BOSS_R = 96, CLEAR_R = 20;
/** Caps over the whole realm, whoever's attempts filled it. */
export const REALM_HOSTILE = 160, REALM_PASSIVE = 120, FISH_CAP = 6;

/** One attempt to put a creature (or a small group) somewhere around a player. */
export function trySpawn(realm: Realm, pl: SimPlayer): void {
  const sim = realm.sim, mobs = realm.mobs, w = realm, L = realm.light, p = pl.body, dim = realm.dim, rnd = sim.rnd, night = sim.isNight() && DIMS[dim].hasSky;
  if (!active(pl) || pl.stats.dead) return;
  // more room for creatures where players gather: half as much again for each other player near this one
  let others = 0;
  for (const q of realm.players) if (q !== pl && active(q) && Math.hypot(q.body.x - p.x, q.body.z - p.z) < NEAR_R) others++;
  const near = 1 + 0.5 * others;
  let hostile = 0, passive = 0, fish = 0, allH = 0, allP = 0, boss = false;
  for (let i = 0, l = mobs.list; i < mobs.hi; i++) {
    const m = l[i];
    if (!m.active) continue;
    const d = m.def, within = Math.hypot(m.x - p.x, m.y - p.y, m.z - p.z);
    if (m.boss) { if (within < BOSS_R) boss = true; continue; }
    if (d.hostile) { allH++; if (within < CAP_R) hostile++; }
    else if (d.ai !== 'minion' && d.ai !== 'npc') { allP++; if (within < CAP_R) { passive++; if (d.ai === 'fish') fish++; } }
  }
  const hCap = (boss ? 2 : mobs.hostileCap + mobs.pressure * 8) * near, pCap = mobs.passiveCap * near;
  const roll = rnd();
  const where: SpawnRule['where'] = dim === 1 ? 'cave' : dim === 2 ? (roll < 0.5 ? 'air' : 'surface') : roll < 0.5 ? 'surface' : roll < 0.8 ? 'cave' : roll < 0.9 ? 'water' : 'air';
  const a = rnd() * 6.283, r = 22 + rnd() * 30;
  const x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r);
  if (!w.ready(x, z)) return;
  let y = -1;
  const air = (yy: number): boolean => !T_SOLID[w.getBlock(x, yy, z)] && !T_LIQUID[w.getBlock(x, yy, z)];
  if (where === 'surface' || where === 'air') {
    y = w.topY(x, z);
    while (y > 1 && !T_SOLID[w.getBlock(x, y, z)]) y--;
    if (y < 2 || T_LIQUID[w.getBlock(x, y + 1, z)] || !air(y + 1) || !air(y + 2)) return;
    y += where === 'air' ? 6 + Math.floor(rnd() * 8) : 1;
  } else if (where === 'cave') {
    const y0 = Math.floor(p.y) + Math.floor((rnd() - 0.5) * 40);
    for (let yy = Math.max(3, y0 - 8); yy < y0 + 8; yy++) if (T_SOLID[w.getBlock(x, yy - 1, z)] && air(yy) && air(yy + 1)) { y = yy; break; }
    if (y < 0) return;
    if (DIMS[dim].hasSky && L.sky(x, y, z) > 3) return;
  } else {
    for (let yy = SEA - 1; yy > SEA - 14; yy--) if (T_LIQUID[w.getBlock(x, yy, z)] === 1 && T_LIQUID[w.getBlock(x, yy + 1, z)] === 1) { y = yy; break; }
    if (y < 0) return;
  }
  for (const q of realm.players) if (Math.hypot(q.body.x - x - 0.5, q.body.y - y, q.body.z - z - 0.5) < CLEAR_R) return;
  const sky = L.sky(x, y, z), blk = L.block(x, y, z), bio = BIOMES[w.biomeAt(x, z)]?.key;
  const rules: [MobDef, SpawnRule][] = [];
  let total = 0;
  for (const d of MOB_LIST) {
    if (!d.spawn) continue;
    for (const s of d.spawn) {
      if (s.dim !== dim || s.where !== where) continue;
      if (s.time === 'night' && !night) continue;
      if (s.time === 'day' && (night || sky < 11)) continue;
      if (s.biomes && (!bio || !s.biomes.includes(bio))) continue;
      if (s.y && (y < s.y[0] || y > s.y[1])) continue;
      if (s.event && sim.shared.events.a !== s.event) continue;
      if (s.flag && !sim.flags.has(s.flag)) continue;
      if (d.hostile && blk > 6) continue;
      if (d.hostile ? hostile >= hCap || allH >= REALM_HOSTILE : (d.ai === 'fish' ? fish >= FISH_CAP : passive >= pCap) || allP >= REALM_PASSIVE) continue;
      rules.push([d, s]); total += s.weight * (s.event ? 3 : 1);
    }
  }
  if (!rules.length) return;
  // towns are quiet: nothing hostile appears near an occupied home unless an event is on
  if (!sim.shared.events.a && dim === 0) for (const h of mobs.safeZones) if (Math.hypot(h[0] - x, h[2] - z) < 28 && rules.every((q) => q[0].hostile)) return;
  let pick = rnd() * total;
  for (const [d, s] of rules) {
    pick -= s.weight * (s.event ? 3 : 1);
    if (pick > 0) continue;
    if (d.hostile && !sim.shared.events.a && dim === 0 && mobs.safeZones.some((h) => Math.hypot(h[0] - x, h[2] - z) < 28)) return;
    const n = s.group[0] + Math.floor(rnd() * (s.group[1] - s.group[0] + 1));
    for (let i = 0; i < n; i++) {
      const m = mobs.spawn(d.key, x + 0.5 + (rnd() - 0.5) * 3, y + 0.05, z + 0.5 + (rnd() - 0.5) * 3);
      if (m) m.by = pl.id;
      if (m && d.hostile) { m.dmgMul = 1 + sim.difficulty() * 0.12; m.hp = m.maxHp = Math.round(d.hp * (1 + sim.difficulty() * 0.15)); }
    }
    return;
  }
}
