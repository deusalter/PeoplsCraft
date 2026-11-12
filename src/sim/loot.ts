// What a kill pays: experience, coins and the drop table, to the player the kill counts for.
import { rollModifier } from '../data/items';
import { onBossGone } from './boss';
import { BURST } from './fx';
import { type Mob, defIndex } from './mobs';
import { gainXp, type SimPlayer } from './player';
import type { Realm } from './realm';

export function onMobKilled(realm: Realm, m: Mob, by: SimPlayer | null): void {
  const sim = realm.sim, rnd = sim.rnd, d = m.def, pl = by ?? realm.closest(m.x, m.y, m.z);
  if (pl) {
    const luck = 1 + pl.stats.d.luck;
    gainXp(sim, pl, d.xp);
    const coins = Math.round((d.coins[0] + rnd() * (d.coins[1] - d.coins[0])) * luck);
    if (coins > 0) {
      pl.inv.coins += coins; pl.inv.touch();
      sim.sink.emit({ p: pl.slot }, ['f', m.x, m.y + m.h + 0.6, m.z, `+${coins}c`, '#f2c14e', false]);
      if (coins > 20) sim.sink.emit({ p: pl.slot }, ['s', 'coin', 1, 1]);
    }
    // Boss loot pops up at the player: the body may be over the void, inside rock or under the sand.
    // In mid-air (or dead) it goes to the last place the player stood, so it cannot fall out of the world.
    const p = pl.body, sf = pl.safe, air = pl.stats.dead || (!p.onGround && !p.inWater && !p.flying && Math.hypot(sf[0] - p.x, sf[1] - p.y, sf[2] - p.z) < 32);
    const lx = air ? sf[0] : p.x, ly = (air ? sf[1] : p.y) + 1.2, lz = air ? sf[2] : p.z;
    for (const [k, chance, a, b] of d.drops) {
      if (rnd() > chance * (d.boss ? 1 : luck)) continue;
      const it = { k, n: a + Math.floor(rnd() * (b - a + 1)), m: rollModifier(k, rnd, d.boss ? 0.7 : 0.4) };
      if (d.boss) realm.drops.spawn(lx, ly, lz, it, (rnd() - 0.5) * 1.5, 3.5, (rnd() - 0.5) * 1.5, 0.3);
      else realm.drops.spawn(m.x, m.y + m.h * 0.5, m.z, it);
    }
  }
  sim.events.onKill(m);
  if (d.boss) {
    sim.addFlag('boss:' + d.boss.n);
    sim.sink.emit({ dim: realm.dim }, ['n', `${d.name} has fallen`, d.boss.n === 8 ? '' : 'Check the guide for what this unlocks', '#ffe27a']);
    sim.sink.emit({ dim: realm.dim }, ['s', 'levelup', 1, 1]); sim.sink.emit({ dim: realm.dim }, ['k', 0.6]);
    realm.burst(BURST.bossDeath, m.x, m.y + m.h * 0.5, m.z, defIndex(m.def));
    onBossGone(realm, m, true);
  }
}
