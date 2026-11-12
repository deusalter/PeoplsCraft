// What one connection is told about the things around its player (6.4). Creatures travel in the
// snapshot and come and go with it, inside a wider ring than the one they enter by so that one on the
// edge does not flicker. Projectiles and drops travel as events, so the host remembers which of them
// the connection has been told of: a projectile's end and a drop's changes go only where its start
// went, and the sweep tells a player who walks up to a fight of every shot already in the air.
// Chunk subscriptions are not here: the chunk service keeps its own.
import { daOf } from '../sim/drops';
import type { Fx } from '../sim/fx';
import type { Mob } from '../sim/mobs';
import type { SimPlayer } from '../sim/player';
import { psOf } from '../sim/projectiles';
import type { Realm } from '../sim/realm';
import { BOSS_R, DROP_R, DROP_R_OUT, MOB_R, MOB_R_OUT, PLAYER_R, PROJ_R } from './protocol';

/** A snapshot position more than this far from its origin cannot be written. */
const ENCODE_R = 1023;

/** Horizontal distance within `r`: every interest radius is a cylinder. */
export const within = (ax: number, az: number, bx: number, bz: number, r: number): boolean => (ax - bx) ** 2 + (az - bz) ** 2 <= r * r;

export class Interest {
  /** The realm the sets below belong to; -1 before the first use. Another realm starts them again. */
  dim = -1;
  /** Creature ids in the last snapshot. */
  mobs = new Set<number>();
  /** Projectile ids this connection was sent a `ps` for and no `pe` yet. */
  readonly projs = new Set<number>();
  /** Drop ids this connection was sent a `da` for and no `dd` yet. */
  readonly drops = new Set<number>();
  private next = new Set<number>();

  reset(dim: number): void { this.dim = dim; this.mobs.clear(); this.projs.clear(); this.drops.clear(); }

  /** The creatures of the next snapshot for player `p`, into `out`, and the set taken from them.
   *  `ox`, `oz`: the snapshot's origin. */
  takeMobs(realm: Realm, p: SimPlayer, ox: number, oz: number, out: Mob[]): Mob[] {
    const b = p.body, l = realm.mobs.list, known = this.mobs, next = this.next;
    out.length = 0; next.clear();
    for (let i = 0; i < realm.mobs.hi; i++) {
      const m = l[i];
      if (!m.active || Math.abs(m.x - ox) > ENCODE_R || Math.abs(m.z - oz) > ENCODE_R) continue;
      const r = m.boss ? BOSS_R : known.has(m.id) ? MOB_R_OUT : MOB_R;
      if ((m.def.ai === 'minion' && m.owner === p.id) || within(m.x, m.z, b.x, b.z, r)) { out.push(m); next.add(m.id); }
    }
    this.next = known; this.mobs = next;
    return out;
  }

  /** The other players of the next snapshot: same realm, online, not loading, within PLAYER_R. */
  takePlayers(realm: Realm, p: SimPlayer, out: SimPlayer[]): SimPlayer[] {
    const b = p.body;
    out.length = 0;
    for (const q of realm.players) if (q !== p && q.online && !q.loading && within(q.body.x, q.body.z, b.x, b.z, PLAYER_R)) out.push(q);
    return out;
  }

  /** A `ps` that the scope lets this connection hear. `shooter`: it is the shooter's own, which it hears from anywhere. */
  takePs(id: number, x: number, z: number, p: SimPlayer, shooter: boolean): boolean {
    if (this.projs.has(id) || (!shooter && !within(x, z, p.body.x, p.body.z, PROJ_R))) return false;
    this.projs.add(id);
    return true;
  }
  /** A `pe`: told where the `ps` went, and forgotten. */
  takePe(id: number): boolean { return this.projs.delete(id); }
  /** A `da` that the scope lets this connection hear. */
  takeDa(id: number, x: number, z: number, p: SimPlayer): boolean {
    if (this.drops.has(id) || !within(x, z, p.body.x, p.body.z, DROP_R)) return false;
    this.drops.add(id);
    return true;
  }
  /** A `dn`: told where the `da` went. */
  knowsDrop(id: number): boolean { return this.drops.has(id); }
  /** A `dd`: told where the `da` went, and forgotten. */
  takeDd(id: number): boolean { return this.drops.delete(id); }
  /** An `md`: told where the creature was in view, and forgotten. */
  takeMd(id: number): boolean { return this.mobs.delete(id); }

  /** The 10 Hz sweep (6.4): a `ps` for every live projectile now within PROJ_R that this connection has not heard of, a `da` for
   *  every drop it may take now within DROP_R, and a `dd` with slot 0 for every drop it knows that is now beyond DROP_R_OUT.
   *  Ids of things no longer alive are forgotten without a word: their end was told when it happened. */
  sweep(realm: Realm, p: SimPlayer, out: Fx[]): void {
    const b = p.body, pl = realm.proj.list, dl = realm.drops.list, projs = this.projs, drops = this.drops, live = this.next;
    live.clear();
    for (let i = 0; i < realm.proj.hi; i++) {
      const q = pl[i];
      if (!q.active) continue;
      if (projs.has(q.id)) live.add(q.id);
      else if (within(q.x, q.z, b.x, b.z, PROJ_R)) { live.add(q.id); out.push(psOf(q, q.by === p.id)); }
    }
    projs.clear(); for (const id of live) projs.add(id);
    live.clear();
    for (let i = 0; i < realm.drops.hi; i++) {
      const d = dl[i];
      if (!d.active) continue;
      const mine = !d.owner || d.owner === p.id;
      if (drops.has(d.id)) {
        if (mine && within(d.x, d.z, b.x, b.z, DROP_R_OUT)) live.add(d.id); else out.push(['dd', d.id, 0]);
      } else if (mine && within(d.x, d.z, b.x, b.z, DROP_R)) { live.add(d.id); out.push(daOf(d)); }
    }
    drops.clear(); for (const id of live) drops.add(id);
    live.clear();
  }
}
