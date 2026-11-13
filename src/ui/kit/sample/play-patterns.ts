// Patterns of the play screens' sample data, copied from the game's tables (src/data/recipes.ts): a shaped pattern is
// rows over a key, a loose one a list of what goes in. `#planks` and `#log` match any kind of planks or log.
import { THINGS } from './play-items';

export interface Pattern {
  out: string;
  n: number;
  station: 'hand' | 'workbench' | 'anvil' | 'runeloom' | 'tinker';
  shape?: string[];
  key?: Record<string, string>;
  in?: [string, number][];
}

const P: Pattern[] = [];
const shaped = (out: string, n: number, station: Pattern['station'], shape: string[], key: Record<string, string>): void => { P.push({ out, n, station, shape, key }); };
const loose = (out: string, n: number, station: Pattern['station'], ...ing: [string, number][]): void => { P.push({ out, n, station, in: ing }); };

loose('oak_planks', 4, 'hand', ['oak_log', 1]);
shaped('stick', 4, 'hand', ['P', 'P'], { P: '#planks' });
shaped('workbench', 1, 'hand', ['PP', 'PP'], { P: '#planks' });
shaped('torch', 4, 'hand', ['C', 'S'], { C: 'coal', S: 'stick' });
loose('stew', 1, 'hand', ['mushroom_brown', 1], ['mushroom_red', 1]);
loose('salve', 2, 'hand', ['berries', 1], ['mushroom_red', 1], ['fiber', 1]);

shaped('furnace', 1, 'workbench', ['CCC', 'C C', 'CCC'], { C: 'cobble' });
shaped('chest', 1, 'workbench', ['PPP', 'P P', 'PPP'], { P: '#planks' });
shaped('door', 1, 'workbench', ['PP', 'PP', 'PP'], { P: '#planks' });
shaped('bedroll', 1, 'workbench', ['FFF', 'PPP'], { F: 'fiber', P: '#planks' });
shaped('anvil', 1, 'workbench', ['III', ' I ', 'III'], { I: 'iron_bar' });
shaped('arrow', 8, 'workbench', ['F', 'S', 'E'], { F: 'flint', S: 'stick', E: 'feather' });
shaped('stone_bricks', 4, 'workbench', ['SS', 'SS'], { S: 'stone' });
shaped('lantern', 2, 'workbench', ['I', 'T'], { I: 'iron_bar', T: 'torch' });
shaped('hide_0', 1, 'workbench', ['HHH', 'H H'], { H: 'hide' });
shaped('hide_1', 1, 'workbench', ['H H', 'HHH', 'HHH'], { H: 'hide' });
shaped('hide_2', 1, 'workbench', ['HHH', 'H H', 'H H'], { H: 'hide' });
shaped('runeloom', 1, 'workbench', ['FMF', 'PMP', 'PPP'], { F: 'fiber', M: 'mana_crystal', P: '#planks' });
shaped('tinker_bench', 1, 'workbench', ['IHI', 'PPP', 'P P'], { I: 'iron_bar', H: 'heartroot', P: '#planks' });
shaped('wood_pickaxe', 1, 'workbench', ['MMM', ' S ', ' S '], { M: '#planks', S: 'stick' });
shaped('stone_pickaxe', 1, 'workbench', ['MMM', ' S ', ' S '], { M: 'cobble', S: 'stick' });
shaped('wood_sword', 1, 'workbench', ['M', 'M', 'S'], { M: '#planks', S: 'stick' });
shaped('stone_sword', 1, 'workbench', ['M', 'M', 'S'], { M: 'cobble', S: 'stick' });
shaped('wood_bow', 1, 'workbench', [' MF', 'S F', ' MF'], { M: '#planks', S: 'stick', F: 'fiber' });
loose('weave', 2, 'workbench', ['fiber', 2], ['mana_crystal', 1]);
loose('tonic', 2, 'workbench', ['mana_crystal', 1], ['berries', 1]);
loose('ironbark', 2, 'workbench', ['#log', 1], ['mushroom_brown', 1], ['flint', 1]);
loose('strider_boots', 1, 'workbench', ['hide', 3], ['feather', 2]);
loose('verdant_idol', 1, 'workbench', ['#log', 1], ['fiber', 2], ['gel', 2], ['mushroom_red', 1]);

shaped('iron_pickaxe', 1, 'anvil', ['MMM', ' S ', ' S '], { M: 'iron_bar', S: 'stick' });
shaped('iron_axe', 1, 'anvil', ['MM', 'MS', ' S'], { M: 'iron_bar', S: 'stick' });
shaped('iron_shovel', 1, 'anvil', ['M', 'S', 'S'], { M: 'iron_bar', S: 'stick' });
shaped('iron_sword', 1, 'anvil', ['M', 'M', 'S'], { M: 'iron_bar', S: 'stick' });
shaped('iron_bow', 1, 'anvil', [' MF', 'S F', ' MF'], { M: 'iron_bar', S: 'stick', F: 'fiber' });
shaped('iron_melee_0', 1, 'anvil', ['MMM', 'M M'], { M: 'iron_bar' });
shaped('iron_melee_1', 1, 'anvil', ['M M', 'MMM', 'MMM'], { M: 'iron_bar' });
shaped('iron_melee_2', 1, 'anvil', ['MMM', 'M M', 'M M'], { M: 'iron_bar' });
shaped('barbed_arrow', 12, 'anvil', ['I', 'S', 'E'], { I: 'iron_bar', S: 'stick', E: 'feather' });
shaped('lumenite_pickaxe', 1, 'anvil', ['MMM', ' S ', ' S '], { M: 'lumenite', S: 'stick' });
shaped('lumenite_sword', 1, 'anvil', ['M', 'M', 'S'], { M: 'lumenite', S: 'stick' });
loose('spring_anklet', 1, 'anvil', ['gold_bar', 2], ['gel', 3]);
loose('iron_bracer', 1, 'anvil', ['iron_bar', 3], ['hide', 1]);
loose('warriors_band', 1, 'anvil', ['gold_bar', 1], ['iron_bar', 2], ['flint', 2]);
loose('marksman_lens', 1, 'anvil', ['gold_bar', 1], ['glass', 1], ['feather', 2]);
loose('heart_locket', 1, 'anvil', ['gold_bar', 2], ['salve', 2]);
loose('delvers_charm', 1, 'anvil', ['gold_bar', 1], ['coal', 3], ['chitin', 2]);
loose('warden_bell', 1, 'anvil', ['iron_bar', 2], ['lumenite', 1], ['shade_essence', 2], ['bone', 2]);

shaped('iron_staff', 1, 'runeloom', [' MC', ' SM', 'S  '], { M: 'iron_bar', S: 'stick', C: 'mana_crystal' });
loose('cloud_bottle', 1, 'runeloom', ['glass', 1], ['feather', 3], ['mana_crystal', 2]);
loose('sages_ring', 1, 'runeloom', ['gold_bar', 1], ['mana_crystal', 3]);
loose('mana_charm', 1, 'runeloom', ['iron_bar', 1], ['mana_crystal', 4]);
loose('shadow_cloak', 1, 'runeloom', ['weave', 3], ['shade_essence', 4]);
loose('recall_stone', 1, 'runeloom', ['mana_crystal', 2], ['lumenite', 1], ['stone', 1]);

loose('bounding_boots', 1, 'tinker', ['strider_boots', 1], ['spring_anklet', 1]);
loose('gale_emblem', 1, 'tinker', ['cloud_bottle', 1], ['feather_charm', 1]);
loose('briar_bracer', 1, 'tinker', ['iron_bracer', 1], ['flint', 3]);
loose('duelists_sigil', 1, 'tinker', ['warriors_band', 1], ['marksman_lens', 1]);
loose('soul_reliquary', 1, 'tinker', ['heart_locket', 1], ['mana_charm', 1]);

export const PATTERNS: Pattern[] = P.filter((p) => THINGS.has(p.out));

export function fits(want: string, key: string): boolean {
  return want[0] === '#' ? !!THINGS.get(key)?.tags?.includes(want.slice(1)) : want === key;
}

/** The kind of thing a pattern makes, for the button that steps through kinds. */
export function kindOf(p: Pattern): 'Tools' | 'Weapons' | 'Armour' | 'Trinkets' | 'Blocks' | 'Other' {
  const t = THINGS.get(p.out)!;
  if (t.kind === 'tool') return 'Tools';
  if (t.kind === 'weapon' || t.kind === 'arrow') return 'Weapons';
  if (t.kind === 'armour') return 'Armour';
  if (t.kind === 'trinket') return 'Trinkets';
  if (t.kind === 'block' || t.kind === 'station') return 'Blocks';
  return 'Other';
}

/** What goes in, as wanted kinds and counts. */
export function needs(p: Pattern): [string, number][] {
  if (p.in) return p.in;
  const m = new Map<string, number>();
  for (const row of p.shape!) for (const ch of row) if (ch !== ' ') { const w = p.key![ch]; m.set(w, (m.get(w) ?? 0) + 1); }
  return [...m];
}

/** The pattern laid on a grid `w` wide from its top left: the wanted kind of each cell, or null. */
export function layout(p: Pattern, w: number): (string | null)[] {
  const out: (string | null)[] = Array(w * w).fill(null);
  if (p.shape) p.shape.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ' ' && x < w && y < w) out[y * w + x] = p.key![ch]; }));
  else {
    let i = 0;
    for (const [want, n] of p.in!) for (let k = 0; k < n && i < out.length; k++) out[i++] = want;
  }
  return out;
}

/** The pattern a grid `w` wide holds, if it holds one exactly: shaped anywhere on it, or loose in any order. */
export function matchGrid(cells: (string | null)[], w: number, among: Pattern[]): Pattern | null {
  const filled = cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return null;
  const x0 = Math.min(...filled.map((i) => i % w)), y0 = Math.min(...filled.map((i) => Math.floor(i / w)));
  const x1 = Math.max(...filled.map((i) => i % w)), y1 = Math.max(...filled.map((i) => Math.floor(i / w)));
  for (const p of among) {
    if (p.shape) {
      const ph = p.shape.length, pw = Math.max(...p.shape.map((r) => r.length));
      if (pw > w || ph > w) continue;
      for (const flip of [false, true]) {
        let ok = true;
        for (let y = 0; y < w && ok; y++) for (let x = 0; x < w && ok; x++) {
          const px = x - x0, py = y - y0;
          let ch = ' ';
          if (px >= 0 && py >= 0 && py < ph && px < pw) ch = (flip ? [...p.shape[py].padEnd(pw)].reverse().join('') : p.shape[py].padEnd(pw))[px];
          const c = cells[y * w + x];
          if (ch === ' ') ok = !c; else ok = !!c && fits(p.key![ch], c);
        }
        if (ok && x1 - x0 < pw && y1 - y0 < ph) return p;
      }
    } else {
      const left = filled.map((i) => cells[i]!);
      let ok = true;
      for (const [want, n] of p.in!) for (let k = 0; k < n && ok; k++) {
        const j = left.findIndex((c) => fits(want, c));
        if (j < 0) ok = false; else left.splice(j, 1);
      }
      if (ok && !left.length) return p;
    }
  }
  return null;
}
