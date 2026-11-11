// Pooled projectiles: arrows, spell bolts and everything bosses throw.
import type { Style } from '../data/items';
import { PROJECTILES, ProjDef } from '../data/mobs';
import { rayHitMobs } from './mobhit';
import type { Mob } from './mobs';
import { newRayHit, rayBox, raycast } from './physics';
import { hurtPlayer, type SimPlayer } from './player';
import type { Realm } from './realm';

export class Proj {
  active = false; id = 0; def!: ProjDef; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; life = 0; dmg = 0; player = false; style: Style = 'ranged';
  /** Record id of the shooter, null for a creature's shot. */
  by: string | null = null;
  cseq = 0;
  knock = 3; crit = false; hit = new Set<number>();
}
const hit = newRayHit();

export class ProjSim {
  readonly list: Proj[] = [];
  private nextId = 1;
  private cur: Proj | null = null;
  private canHit = (m: Mob): boolean => m.def.ai !== 'npc' && m.def.ai !== 'minion' && !this.cur!.hit.has(m.id);
  constructor(private realm: Realm, cap = 600) { for (let i = 0; i < cap; i++) this.list.push(new Proj()); }
  clear(): void { for (const p of this.list) p.active = false; }
  get alive(): number { let n = 0; for (const p of this.list) if (p.active) n++; return n; }

  /** `by`: the player who shot it, or null for a creature's shot (which only players can be hit by). */
  fire(kind: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, dmg: number, by: SimPlayer | null, speed?: number, style: Style = 'ranged', knock = 3, crit = false): void {
    const p = this.list.find((o) => !o.active);
    if (!p) return;
    const d = PROJECTILES[kind] ?? PROJECTILES.arrow, sp = speed ?? d.speed, l = Math.hypot(dx, dy, dz) || 1;
    p.active = true; p.id = this.nextId++; p.def = d; p.x = x; p.y = y; p.z = z; p.vx = (dx / l) * sp; p.vy = (dy / l) * sp; p.vz = (dz / l) * sp;
    p.life = d.life; p.dmg = dmg; p.player = !!by; p.by = by ? by.id : null; p.style = style; p.knock = knock; p.crit = crit; p.hit.clear();
  }

  tick(dt: number): void {
    const realm = this.realm, sim = realm.sim;
    for (const p of this.list) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy -= p.def.gravity * dt;
      const sx = p.vx * dt, sy = p.vy * dt, sz = p.vz * dt, len = Math.hypot(sx, sy, sz) || 1e-6, dx = sx / len, dy = sy / len, dz = sz / len;
      // terrain
      raycast(realm, p.x, p.y, p.z, dx, dy, dz, len, hit, false, true);
      let stop = hit.hit ? hit.dist : len, dead = hit.hit, how = 1;
      if (p.player) {
        this.cur = p;
        const r = rayHitMobs(realm.mobs.list, p.x, p.y, p.z, dx, dy, dz, stop, p.def.size * 0.5 + 0.1, this.canHit);
        if (r) {
          const by = p.by ? sim.players.get(p.by) ?? null : null;
          realm.mobs.hurt(r.m, p.dmg, p.vx, p.vz, p.knock, p.crit, by);
          if (by) sim.sink.emit({ p: by.slot }, ['h', p.crit]);
          if (p.def.pierce && p.hit.size < 3) p.hit.add(r.m.id); else { stop = r.t; dead = true; how = 2; }
        }
      } else {
        let who: SimPlayer | null = null;
        for (const q of realm.players) {
          const pl = q.body, t = rayBox(p.x, p.y, p.z, dx, dy, dz, pl.x - pl.hw - 0.12, pl.y - 0.05, pl.z - pl.hw - 0.12, pl.x + pl.hw + 0.12, pl.y + pl.h + 0.05, pl.z + pl.hw + 0.12, stop);
          if (t >= 0) { who = q; stop = t; }
        }
        if (who) { hurtPlayer(sim, who, p.dmg, p.x - dx, p.z - dz, 'a projectile', null, 4); dead = true; how = 2; }
      }
      p.x += dx * stop; p.y += dy * stop; p.z += dz * stop;
      if (dead) { p.active = false; sim.sink.emit({ dim: realm.dim }, ['pe', p.id, p.x, p.y, p.z, how]); }
    }
  }
}
