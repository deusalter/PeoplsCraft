// Cross-checks the data tables at startup (development builds only): every reference must
// resolve, every texture needs a painter, and no two recipes may claim the same grid.
import { PAINTERS } from '../render/textures';
import { BLOCKS, TEXTURE_NAMES } from './blocks';
import { ITEMS, TAGGED } from './items';
import { LOOT } from './loot';
import { MOB_LIST, MOBS, PROJECTILES } from './mobs';
import { NPCS } from './npcs';
import { QUESTS } from './quests';
import { RECIPES, SMELTS } from './recipes';

export function validateData(): string[] {
  const bad: string[] = [];
  const has = (k: string, where: string): void => { if (k[0] === '#' ? !TAGGED.has(k.slice(1)) : !ITEMS.has(k)) bad.push(`${where}: unknown item "${k}"`); };
  for (const n of TEXTURE_NAMES) if (!PAINTERS[n]) bad.push(`texture "${n}" has no painter`);
  for (const b of BLOCKS) for (const d of b.drops) has(d[0], 'block ' + b.key);
  const seen = new Map<string, string>();
  for (const r of RECIPES) {
    has(r.out, 'recipe');
    if (r.shape) {
      for (const row of r.shape) for (const ch of row) if (ch !== ' ') { if (!r.key || !r.key[ch]) bad.push(`recipe ${r.out}: no key for "${ch}"`); else has(r.key[ch], 'recipe ' + r.out); }
      const sig = r.station + '|' + r.shape.map((row) => [...row].map((c) => (c === ' ' ? '_' : r.key![c])).join(',')).join('/');
      if (seen.has(sig)) bad.push(`recipes ${seen.get(sig)} and ${r.out} share a pattern`); else seen.set(sig, r.out);
    } else {
      for (const [k] of r.in!) has(k, 'recipe ' + r.out);
      const sig = r.station + '|' + r.in!.map((i) => i[0] + 'x' + i[1]).sort().join(',');
      if (seen.has(sig)) bad.push(`recipes ${seen.get(sig)} and ${r.out} share ingredients`); else seen.set(sig, r.out);
      if (r.in!.reduce((s, i) => s + i[1], 0) > 9) bad.push(`recipe ${r.out} needs more than 9 cells`);
    }
  }
  for (const s of SMELTS) { has(s.in, 'smelt'); has(s.out, 'smelt'); }
  for (const [k, t] of Object.entries(LOOT)) for (const e of t.entries) has(e[0], 'loot ' + k);
  for (const m of MOB_LIST) {
    for (const d of m.drops) has(d[0], 'mob ' + m.key);
    if (m.proj && !PROJECTILES[m.proj]) bad.push(`mob ${m.key}: unknown projectile ${m.proj}`);
    for (const ph of m.boss?.phases ?? []) for (const a of [...ph.attacks, ...(ph.enter ? [ph.enter] : [])]) {
      if ('proj' in a && !PROJECTILES[a.proj]) bad.push(`boss ${m.key}: unknown projectile ${a.proj}`);
      if (a.t === 'summon' && !MOBS.has(a.mob)) bad.push(`boss ${m.key}: unknown add ${a.mob}`);
      if ('ring' in a && a.ring && !PROJECTILES[a.ring[0]]) bad.push(`boss ${m.key}: unknown ring projectile ${a.ring[0]}`);
    }
  }
  for (const it of ITEMS.values()) {
    if (it.weapon?.proj && !PROJECTILES[it.weapon.proj]) bad.push(`item ${it.key}: unknown projectile ${it.weapon.proj}`);
    if (it.weapon?.minion && !MOBS.has(it.weapon.minion)) bad.push(`item ${it.key}: unknown minion ${it.weapon.minion}`);
  }
  for (const n of NPCS) { if (!MOBS.has(n.mob)) bad.push(`npc ${n.key}: unknown mob`); for (const g of n.goods) { has(g[0], 'npc ' + n.key); if (g[2] && g[2] !== 'coins') has(g[2], 'npc ' + n.key); } }
  for (const q of QUESTS) if (q.have) has(q.have[0], 'quest ' + q.key);
  return bad;
}
