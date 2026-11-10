// Player inventory, equipment slots and the crafting-grid matcher.
import { ITEMS, Item, item, matches, rollModifier } from '../data/items';
import { RECIPES, Recipe } from '../data/recipes';

export type Slot = Item | null;
export const HOTBAR = 9, INV_SIZE = 36;

export class Inventory {
  slots: Slot[] = new Array(INV_SIZE).fill(null);
  armor: Slot[] = [null, null, null];
  acc: Slot[] = [null, null, null, null, null];
  craft: Slot[] = new Array(9).fill(null);
  cursor: Slot = null;
  sel = 0;
  coins = 0;
  /** Bumped on every change so the UI knows when to redraw. */
  rev = 0;

  held(): Slot { return this.slots[this.sel]; }
  touch(): void { this.rev++; }

  /** Add an item, stacking where possible. Returns how many did not fit. */
  add(it: Item): number {
    const d = item(it.k);
    let n = it.n;
    if (d.stack > 1 && !it.m) {
      for (let i = 0; i < INV_SIZE && n > 0; i++) {
        const s = this.slots[i];
        if (s && s.k === it.k && !s.m && s.n < d.stack) { const take = Math.min(n, d.stack - s.n); s.n += take; n -= take; }
      }
    }
    for (let i = 0; i < INV_SIZE && n > 0; i++) {
      if (!this.slots[i]) { const take = Math.min(n, d.stack); this.slots[i] = { k: it.k, n: take, m: it.m }; n -= take; }
    }
    if (n !== it.n) this.rev++;
    return n;
  }
  /** How many of an item (or of an unmodified item given by key) the pack could still take. Plain loop, no allocation. */
  room(it: Item | string): number {
    const k = typeof it === 'string' ? it : it.k, mod = typeof it !== 'string' && !!it.m, d = item(k);
    let n = 0;
    for (let i = 0; i < INV_SIZE; i++) {
      const s = this.slots[i];
      if (!s) n += d.stack; else if (d.stack > 1 && !mod && s.k === k && !s.m) n += Math.max(0, d.stack - s.n);
    }
    return n;
  }
  /** Count items matching a key or '#tag' across the main inventory. */
  count(want: string): number {
    let n = 0;
    for (const s of this.slots) if (s && matches(want, s.k)) n += s.n;
    return n;
  }
  /** Remove `n` matching items. Returns false (and removes nothing) if there are not enough. */
  remove(want: string, n: number): boolean {
    if (this.count(want) < n) return false;
    for (let i = 0; i < INV_SIZE && n > 0; i++) {
      const s = this.slots[i];
      if (s && matches(want, s.k)) { const take = Math.min(n, s.n); s.n -= take; n -= take; if (s.n === 0) this.slots[i] = null; }
    }
    this.rev++;
    return true;
  }
  /** Use up one of the held item. */
  consumeHeld(n = 1): void {
    const s = this.slots[this.sel];
    if (!s) return;
    s.n -= n;
    if (s.n <= 0) this.slots[this.sel] = null;
    this.rev++;
  }
  /** Find the first inventory slot holding an item with this tag (used for arrows). */
  findTagged(tag: string): number {
    for (let i = 0; i < INV_SIZE; i++) { const s = this.slots[i]; if (s && item(s.k).tags?.includes(tag)) return i; }
    return -1;
  }
  serialize(): unknown { return { s: this.slots, a: this.armor, c: this.acc, g: this.craft, cur: this.cursor, sel: this.sel, coins: this.coins }; }
  load(d: any): void {
    if (!d) return;
    const fix = (a: any[], n: number): Slot[] => { const out: Slot[] = new Array(n).fill(null); (a || []).forEach((s, i) => { if (i < n && s && typeof s.k === 'string') { try { item(s.k); out[i] = { k: s.k, n: s.n | 0, m: s.m }; } catch { /* item no longer exists */ } } }); return out; };
    this.slots = fix(d.s, INV_SIZE); this.armor = fix(d.a, 3); this.acc = fix(d.c, 5); this.craft = fix(d.g, 9);
    // a save taken with a window open still holds the grid and cursor: put them back in the pack, keeping
    // whatever does not fit where it was so the next window close drops it instead of deleting it
    for (let i = 0; i < 9; i++) { const s = this.craft[i]; if (s) { const left = this.add(s); this.craft[i] = left ? { ...s, n: left } : null; } }
    this.cursor = null;
    if (d.cur && typeof d.cur.k === 'string' && ITEMS.has(d.cur.k)) { const c: Item = { k: d.cur.k, n: d.cur.n | 0, m: d.cur.m }, left = c.n > 0 ? this.add(c) : 0; if (left) this.cursor = { ...c, n: left }; }
    this.sel = d.sel | 0; this.coins = d.coins | 0; this.rev++;
  }
}

// ---- crafting ---------------------------------------------------------------------------
const shapeDims = (r: Recipe): [number, number] => (r.shape ? [Math.max(...r.shape.map((s) => s.length)), r.shape.length] : [0, 0]);
const units = (r: Recipe): number => (r.in ? r.in.reduce((s, i) => s + i[1], 0) : 0);

/** Recipes usable at a station through a w x w grid. */
export function recipesFor(station: string, w: number): Recipe[] {
  return RECIPES.filter((r) => {
    if (r.station !== 'hand' && r.station !== station) return false;
    if (r.shape) { const [sw, shh] = shapeDims(r); return sw <= w && shh <= w; }
    return units(r) <= w * w;
  });
}

function matchShape(r: Recipe, grid: Slot[], w: number, x0: number, y0: number, bw: number, bh: number, mirror: boolean): boolean {
  const [sw, shh] = shapeDims(r);
  if (sw !== bw || shh !== bh) return false;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const ch = (r.shape![y][mirror ? bw - 1 - x : x] ?? ' '), s = grid[(y0 + y) * w + x0 + x];
    if (ch === ' ') { if (s) return false; }
    else if (!s || !matches(r.key![ch], s.k)) return false;
  }
  return true;
}

/** Find the recipe a grid currently spells out, if any. Each occupied cell contributes one unit. */
export function matchRecipe(grid: Slot[], w: number, station: string): Recipe | null {
  let x0 = w, y0 = w, x1 = -1, y1 = -1, filled = 0;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (grid[y * w + x]) { filled++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!filled) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (const r of RECIPES) {
    if (r.station !== 'hand' && r.station !== station) continue;
    if (r.shape) { if (matchShape(r, grid, w, x0, y0, bw, bh, false) || matchShape(r, grid, w, x0, y0, bw, bh, true)) return r; continue; }
    if (units(r) !== filled) continue;
    // shapeless: every cell must be claimed by exactly one ingredient unit (exact keys first, tags last)
    const used = new Array(w * w).fill(false);
    const wants: string[] = [];
    for (const [k, n] of r.in!) for (let i = 0; i < n; i++) wants.push(k);
    wants.sort((a, b) => (a[0] === '#' ? 1 : 0) - (b[0] === '#' ? 1 : 0));
    let ok = true;
    for (const want of wants) {
      let found = false;
      for (let i = 0; i < w * w; i++) { const s = grid[i]; if (s && !used[i] && matches(want, s.k)) { used[i] = true; found = true; break; } }
      if (!found) { ok = false; break; }
    }
    if (ok) return r;
  }
  return null;
}

/** Ingredient totals for a recipe as [want, count] pairs. */
const NEEDS = new Map<Recipe, [string, number][]>();
export function needs(r: Recipe): [string, number][] {
  if (r.in) return r.in;
  let out = NEEDS.get(r);
  if (out) return out;
  const m = new Map<string, number>();
  for (const row of r.shape!) for (const ch of row) if (ch !== ' ') m.set(r.key![ch], (m.get(r.key![ch]) ?? 0) + 1);
  NEEDS.set(r, (out = [...m.entries()]));
  return out;
}
export function canAfford(inv: Inventory, r: Recipe, grid: Slot[]): boolean {
  for (const [want, n] of needs(r)) {
    let have = inv.count(want);
    for (const s of grid) if (s && matches(want, s.k)) have += s.n;
    if (have < n) return false;
  }
  return true;
}
/** Lay a recipe out in the grid using items from the inventory. Returns false if short. */
export function fillGrid(inv: Inventory, r: Recipe, grid: Slot[], w: number): boolean {
  for (let i = 0; i < grid.length; i++) { const s = grid[i]; if (s) { const left = inv.add(s); grid[i] = left ? { ...s, n: left } : null; } }
  // a full pack can leave cells occupied; laying the recipe over them would delete those items
  for (let i = 0; i < grid.length; i++) if (grid[i]) { inv.touch(); return false; }
  if (!canAfford(inv, r, [])) { inv.touch(); return false; }
  const take = (want: string): Item | null => {
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i];
      if (s && matches(want, s.k)) { s.n--; const out = { k: s.k, n: 1, m: s.m }; if (s.n === 0) inv.slots[i] = null; return out; }
    }
    return null;
  };
  if (r.shape) {
    r.shape.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== ' ') grid[y * w + x] = take(r.key![row[x]]); });
  } else {
    let c = 0;
    for (const [want, n] of r.in!) for (let i = 0; i < n; i++) { while (grid[c]) c++; grid[c++] = take(want); }
  }
  inv.touch();
  return true;
}
/** Consume one unit from each of the first `cells` grid cells (the visible ones) and return the crafted item. */
export function takeCraft(r: Recipe, grid: Slot[], rnd: () => number, cells = grid.length): Item {
  for (let i = 0; i < cells; i++) { const s = grid[i]; if (s) { s.n--; if (s.n <= 0) grid[i] = null; } }
  return { k: r.out, n: r.n, m: rollModifier(r.out, rnd, 0.3) };
}
