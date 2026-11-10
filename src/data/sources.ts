// Where an item comes from, derived from the other tables (smelting, recipes, block and creature drops,
// traders, loot), so tooltips can say how to get a missing ingredient. Built on first use.
import { BLOCKS } from './blocks';
import { ITEMS, item } from './items';
import { LOOT } from './loot';
import { MOB_LIST } from './mobs';
import { NPCS } from './npcs';
import { RECIPES, SMELTS, STATION_NAMES } from './recipes';

let map: Map<string, string[]> | null = null;

function build(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const put = (k: string, src: string): void => { let l = m.get(k); if (!l) m.set(k, (l = [])); if (l.length < 2 && !l.includes(src)) l.push(src); };
  const nameOf = (want: string): string => (want[0] === '#' ? 'any ' + want.slice(1) : item(want).name);
  for (const s of SMELTS) put(s.out, 'Smelt ' + nameOf(s.in));
  for (const r of RECIPES) put(r.out, r.station === 'hand' ? 'Craft by hand' : 'Craft at the ' + STATION_NAMES[r.station]);
  const natural: string[] = [];
  for (const b of BLOCKS) for (const d of b.drops) if (ITEMS.has(d[0])) { if (d[0] === b.key) natural.push(d[0]); else put(d[0], 'Mine ' + b.name); }
  for (const mb of MOB_LIST) for (const d of mb.drops) put(d[0], 'Dropped by ' + (mb.boss ? 'the ' : '') + mb.name);
  for (const n of NPCS) for (const g of n.goods) put(g[0], 'Sold by the ' + n.name);
  for (const t of Object.values(LOOT)) for (const e of t.entries) put(e[0], 'Found in chests');
  // a block that only drops itself: say so only when nothing better is known (crafted blocks drop themselves too)
  for (const k of natural) if (!m.has(k)) put(k, 'Found in the world');
  return m;
}

/** One line naming up to two ways to get an item ('' when none is known). */
export function sourceOf(key: string): string {
  if (key[0] === '#') return 'Any ' + key.slice(1);
  if (!map) map = build();
  return (map.get(key) ?? []).join(' · ');
}
