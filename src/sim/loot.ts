// What a kill pays (7.4): experience, coins and the drop table, to every player the kill counts for, by record id.
import { type Item, item, rollModifier } from '../data/items';
import { endFight, onBossGone, SCALE_R } from './boss';
import { BURST } from './fx';
import { type Mob, defIndex } from './mobs';
import { active, gainXp, type SimPlayer } from './player';
import type { Realm } from './realm';
import type { SharedState, Sim } from './sim';

/** Stacks `mail` holds at most; what comes beyond them is lost. */
export const MAIL_MAX = 36;

/** Into a player's mail, folded into a stack of the same item where there is room. */
export function toMail(p: SimPlayer, it: Item): void {
  let n = it.n;
  const st = item(it.k).stack;
  if (!it.m) for (const s of p.mail) if (s.k === it.k && !s.m && s.n < st && n > 0) { const t = Math.min(n, st - s.n); s.n += t; n -= t; }
  while (n > 0 && p.mail.length < MAIL_MAX) { const t = Math.min(n, st); p.mail.push(it.m ? { k: it.k, n: t, m: it.m } : { k: it.k, n: t }); n -= t; }
  p.unsaved = true;
}
/** A credit for an id that is not in memory: paid by `join` (3.3), saved with the world record that caused it. */
export function owe(s: SharedState, id: string, xp: number, coins: number, items: Item[]): void {
  const o = s.owed[id] ?? (s.owed[id] = { xp: 0, coins: 0, items: [] });
  o.xp += xp; o.coins += coins;
  for (const it of items) o.items.push(it.m ? { k: it.k, n: it.n, m: it.m } : { k: it.k, n: it.n });
}
/** Experience for a player in memory: with the level-up message when it is online, silently when it is not. */
function payXp(sim: Sim, p: SimPlayer, n: number): void {
  if (p.online) { gainXp(sim, p, n); return; }
  if (p.stats.addXp(Math.round(n))) { p.stats.recompute(p.inv); p.stats.hp = p.stats.maxHp; }
}

/** Who a death pays, in a fixed order: everyone who hurt it; for a boss also its participants and the active players within
 *  64 blocks of it or of its altar. A creature nobody hurt pays nobody. */
export function eligible(realm: Realm, m: Mob): string[] {
  const out = new Set<string>(m.hitBy.keys());
  if (m.boss) {
    for (const id of m.boss.parts) out.add(id);
    const a = m.boss.altar;
    for (const q of realm.players) if (active(q) && (Math.hypot(q.body.x - m.x, q.body.z - m.z) <= SCALE_R || Math.hypot(q.body.x - a[0], q.body.z - a[2]) <= SCALE_R)) out.add(q.id);
  }
  return [...out];
}

/** One eligible id's share, rolled for it alone. In play here: owned drops. In memory elsewhere: mail. Absent: `shared.owed`, luck 0. */
function share(realm: Realm, m: Mob, id: string): void {
  const sim = realm.sim, rnd = sim.rnd, d = m.def, q = sim.players.get(id) ?? null;
  const here = !!q && active(q) && q.dim === realm.dim, luck = q ? 1 + q.stats.d.luck : 1;
  const coins = (): number => Math.round((d.coins[0] + rnd() * (d.coins[1] - d.coins[0])) * luck);
  if (!q) {
    const c = coins(), items: Item[] = [];
    for (const [k, chance, a, b] of d.drops) {
      if (rnd() > chance) continue;
      items.push({ k, n: a + Math.floor(rnd() * (b - a + 1)), m: rollModifier(k, rnd, d.boss ? 0.7 : 0.4) });
    }
    owe(sim.shared, id, Math.round(d.xp), Math.max(0, c), items);
    return;
  }
  payXp(sim, q, d.xp);
  const c = coins();
  if (c > 0) {
    q.inv.coins += c; q.inv.touch();
    if (here) {
      sim.sink.emit({ p: q.slot }, ['f', m.x, m.y + m.h + 0.6, m.z, `+${c}c`, '#f2c14e', false]);
      if (c > 20) sim.sink.emit({ p: q.slot }, ['s', 'coin', 1, 1]);
    }
  }
  // Boss loot pops up at its owner: the body may be over the void, inside rock or under the sand.
  // In mid-air (or dead) it goes to the last place the owner stood, so it cannot fall out of the world.
  const p = q.body, sf = q.safe, air = q.stats.dead || (!p.onGround && !p.inWater && !p.flying && Math.hypot(sf[0] - p.x, sf[1] - p.y, sf[2] - p.z) < 32);
  const lx = air ? sf[0] : p.x, ly = (air ? sf[1] : p.y) + 1.2, lz = air ? sf[2] : p.z;
  for (const [k, chance, a, b] of d.drops) {
    if (rnd() > chance * (d.boss ? 1 : luck)) continue;
    const it = { k, n: a + Math.floor(rnd() * (b - a + 1)), m: rollModifier(k, rnd, d.boss ? 0.7 : 0.4) };
    if (!here) toMail(q, it);
    else if (d.boss) realm.drops.spawn(lx, ly, lz, it, (rnd() - 0.5) * 1.5, 3.5, (rnd() - 0.5) * 1.5, 0.3, id);
    else realm.drops.spawn(m.x, m.y + m.h * 0.5, m.z, it, undefined, undefined, undefined, 0.35, id);
  }
}

export function onMobKilled(realm: Realm, m: Mob): void {
  const sim = realm.sim, d = m.def;
  for (const id of eligible(realm, m)) share(realm, m, id);
  sim.events.onKill(m);
  if (d.boss) {
    endFight(realm, m, 'won');
    sim.addFlag('boss:' + d.boss.n);
    sim.sink.emit({ dim: realm.dim }, ['n', `${d.name} has fallen`, d.boss.n === 8 ? '' : 'Check the guide for what this unlocks', '#ffe27a']);
    sim.sink.emit({ dim: realm.dim }, ['s', 'levelup', 1, 1]); sim.sink.emit({ dim: realm.dim }, ['k', 0.6]);
    realm.burst(BURST.bossDeath, m.x, m.y + m.h * 0.5, m.z, defIndex(m.def));
    onBossGone(realm, m, true);
  }
}
