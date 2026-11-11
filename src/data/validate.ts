// Cross-checks the data tables at startup (development builds only): every reference must
// resolve, every texture needs a painter, and no two recipes may claim the same grid.
import { PAINTERS } from '../render/textures';
import { BLOCKS, TEXTURE_NAMES } from './blocks';
import { ITEMS, TAGGED } from './items';
import { LOOT } from './loot';
import { MAX_PARTS, MOB_LIST, MOBS, PROJECTILES } from './mobs';
import { BOSS_BARS } from './hudstyle';
import { NPCS } from './npcs';
import { QUESTS } from './quests';
import { RECIPES, SMELTS, STATION_NAMES } from './recipes';
import { sourceOf } from './sources';
import { matchRecipe, Slot } from '../systems/inventory';

const STATIONS = Object.keys(STATION_NAMES);

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
    if (m.parts.length > MAX_PARTS) bad.push(`mob ${m.key}: ${m.parts.length} boxes, the limit is ${MAX_PARTS}`);
    if ((m.boss?.seg?.length ?? 0) > MAX_PARTS) bad.push(`mob ${m.key}: its body segment has more than ${MAX_PARTS} boxes`);
    m.boss?.seg?.forEach((q, i, all) => { if (q.par && !all.slice(0, i).some((o) => o.n === q.par)) bad.push(`mob ${m.key}: segment box ${i} rides on "${q.par}", which no earlier box names`); });
    if (m.boss?.segments && !m.boss.seg) bad.push(`boss ${m.key}: has body segments but no seg box list`);
    m.parts.forEach((q, i) => {
      if (q.par && !m.parts.slice(0, i).some((o) => o.n === q.par)) bad.push(`mob ${m.key}: box ${i} rides on "${q.par}", which no earlier box names`);
      if (q.ph && (q.ph[0] > q.ph[1] || !m.boss)) bad.push(`mob ${m.key}: box ${i} has a bad or unused phase range`);
    });
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
  for (const r of RECIPES) for (const k of r.in ? r.in.map((i) => i[0]) : Object.values(r.key ?? {})) if (k[0] !== '#' && ITEMS.has(k) && !sourceOf(k)) bad.push(`recipe ${r.out}: no way to get "${k}"`);
  // lay every recipe out on a 3x3 grid and make sure crafting resolves to that recipe, not to an earlier one that claims the same cells
  for (const r of RECIPES) {
    const grid: Slot[] = new Array(9).fill(null);
    const one = (k: string): string | undefined => (k[0] === '#' ? TAGGED.get(k.slice(1))?.[0] : k);
    let ok = true, n = 0;
    if (r.shape) r.shape.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === ' ') return; const k = one(r.key?.[ch] ?? ''); if (k && x < 3 && y < 3) grid[y * 3 + x] = { k, n: 1 }; else ok = false; }));
    else for (const [want, c] of r.in!) for (let i = 0; i < c; i++) { const k = one(want); if (k && n < 9) grid[n++] = { k, n: 1 }; else ok = false; }
    if (!ok) continue;   // an unknown key or tag is already reported above
    // hand recipes can be made at every station, so they must win there too
    for (const st of r.station === 'hand' ? STATIONS : [r.station]) {
      const m = matchRecipe(grid, 3, st);
      if (m !== r) { bad.push(`recipe ${r.out} is shadowed by ${m ? m.out : 'nothing: its own grid does not match it'}`); break; }
    }
  }
  for (const k in BOSS_BARS) if (!MOBS.get(k)?.boss) bad.push(`boss bar colours for unknown boss ${k}`);
  return bad;
}
