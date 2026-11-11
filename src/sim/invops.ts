// Inventory and container ops. Whatever a player does to a pack, the cursor, the crafting grid,
// equipment, a shop or an open container is one op, and applyOp is the only code that carries one
// out: the simulation applies it to the state it owns, a client applies it to its own copy to show
// the result at once. An op never throws on bad input; a refused op changes nothing.
import { BLOCKS } from '../data/blocks';
import { ITEMS, type Item, item, itemName, itemRarity } from '../data/items';
import { NPCS } from '../data/npcs';
import { RECIPES, type Recipe } from '../data/recipes';
import { INV_SIZE, type Inventory, type Slot, canAfford, fillGrid, matchRecipe, recipeFits, takeCraft } from './inventory';
import { type SlotKind, accepts, goods, refusal, sellPrice, smeltable, sortCompare } from './rules';
import { type Attr, type PlayerStats, STAT_NAMES } from './stats';

/** c = 0 inv.slots (0..35)   1 inv.armor (0..2)   2 inv.acc (0..4)   3 inv.craft (0..8)
 *  c = 4 the open container: chest 0..26; forge 0 ore, 1 fuel, 2 output */
export type SlotRef = [c: 0 | 1 | 2 | 3 | 4, i: number];
export interface OpState {
  inv: Inventory; stats: PlayerStats;
  /** The open chest or forge, or null when there is none (or it is gone). */
  box: { kind: 'chest' | 'forge'; s: Slot[]; level?: number } | null;
  /** null = plain inventory, 2 x 2 grid, station 'hand'. A covered window (the Guide lies over it) is kept but acts as none. */
  window: { mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; npc?: string; covered?: boolean;
            sold: { id: number; it: Item; price: number }[] } | null;
}
export interface OpCtx {
  /** The op's sequence number; it names the `sold` entry a sale creates. */
  seq: number;
  /** A stream of this op alone, the same on both sides. */
  rnd(): number;
  flags: ReadonlySet<string>;
  creative: boolean;
  drop(it: Item): void;
  flag(f: string): void;
}
/** `snd` and `msg` name the feedback the outcome calls for; the window that sent the op picks the
 *  volume and colour and adds the plain click of a pointer action. `n`: items a craft made.
 *  `ok: true` with `snd: 'error'` is an op that was carried out and came to nothing useful. */
export type OpResult = { ok: true; snd?: string; msg?: string; n?: number } | { ok: false; snd?: string; msg?: string };

export type InvOp =
  | { o: 'sel'; i: number }
  | { o: 'click'; v: SlotRef; r: boolean; e: string }
  | { o: 'place'; v: SlotRef; one: boolean }
  | { o: 'gather' }
  | { o: 'quick'; v: SlotRef; e: string }
  | { o: 'out'; all: boolean }
  | { o: 'lay'; r: number }
  | { o: 'book'; r: number; max: number }
  | { o: 'hotkey'; v: SlotRef; i: number; e: string }
  | { o: 'dropSlot'; v: SlotRef; all: boolean; e: string }
  | { o: 'dropCur' }
  | { o: 'dropHeld'; all: boolean }
  | { o: 'sort'; w: 0 | 1 }
  | { o: 'takeAll' }
  | { o: 'stash' }
  | { o: 'buy'; k: string; bulk: boolean }
  | { o: 'buyBack'; id: number }
  | { o: 'spend'; a: Attr }
  | { o: 'pick'; id: number }
  | { o: 'tidy'; cover: boolean }
  | { o: 'close' }
  /** Prediction only, never sent as an op: the held stack an action used up. */
  | { o: '_held'; n: number }
  /** Prediction only: `n` of slot `i` used up (a consumable, an arrow). */
  | { o: '_slot'; i: number; n: number };

const FULL = 'No room in your pack', FORGE_KIND: SlotKind[] = ['fin', 'ffuel', 'fout'];
const no = (snd?: string, msg?: string): OpResult => ({ ok: false, snd, msg });
const yes = (snd?: string, msg?: string, n?: number): OpResult => ({ ok: true, snd, msg, n });
const int = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';
const single = (kind: SlotKind): boolean => kind === 'armor' || kind === 'acc';
function sortRank(k: string): number { const d = item(k); return d.weapon && !d.tool ? 0 : d.tool ? 1 : d.armor ? 2 : d.acc ? 3 : d.food || d.heal || d.restoreMana || d.buff || d.use ? 4 : d.block !== undefined ? 5 : 6; }

/** One op's view of the state: the window as it acts (none while covered) and what follows from it. */
interface Env {
  s: OpState; inv: Inventory; ctx: OpCtx;
  win: OpState['window'];
  chest: Slot[] | null; forge: Slot[] | null;
  /** Level of the open forge; 99 without one, so anything that smelts at all is accepted. */
  level: number;
  station: string; gridW: number;
  /** Crafting cells this window shows: 4 by hand, 9 at a station, none beside a chest, forge or shop. */
  cells: number;
}
interface Cell { arr: Slot[]; i: number; kind: SlotKind }

function envOf(s: OpState, ctx: OpCtx): Env {
  const win = s.window && !s.window.covered ? s.window : null, box = win && s.box && s.box.kind === win.mode ? s.box : null, at = win?.mode === 'station';
  return {
    s, inv: s.inv, ctx, win, chest: box && box.kind === 'chest' ? box.s : null, forge: box && box.kind === 'forge' ? box.s : null,
    level: box && box.kind === 'forge' ? box.level ?? 0 : 99, station: at ? win!.station ?? 'hand' : 'hand', gridW: at ? 3 : 2, cells: !win ? 4 : at ? 9 : 0,
  };
}
function cellOf(e: Env, v: unknown): Cell | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const c: unknown = v[0], i: unknown = v[1], inv = e.inv;
  if (c === 0) return int(i, 0, INV_SIZE - 1) ? { arr: inv.slots, i, kind: 'inv' } : null;
  if (c === 1) return int(i, 0, 2) ? { arr: inv.armor, i, kind: 'armor' } : null;
  if (c === 2) return int(i, 0, 4) ? { arr: inv.acc, i, kind: 'acc' } : null;
  if (c === 3) return int(i, 0, e.cells - 1) ? { arr: inv.craft, i, kind: 'craft' } : null;
  if (c === 4 && e.chest) return int(i, 0, e.chest.length - 1) ? { arr: e.chest, i, kind: 'chest' } : null;
  if (c === 4 && e.forge) return int(i, 0, 2) ? { arr: e.forge, i, kind: FORGE_KIND[i] } : null;
  return null;
}
/** Does the cell hold what the sender saw there ('' = empty)? */
const sees = (v: Cell, k: unknown): boolean => typeof k === 'string' && (v.arr[v.i]?.k ?? '') === k;
const grid = (e: Env): Slot[] => (e.gridW === 2 ? e.inv.craft.slice(0, 4) : e.inv.craft);

/** Move the stack at src[i] into dst[from..to): top up matching stacks first, then fill empty slots. */
function moveInto(src: Slot[], i: number, dst: Slot[], from: number, to: number): void {
  const s = src[i]!, d = item(s.k);
  let n = s.n;
  if (d.stack > 1 && !s.m) for (let j = from; j < to && n > 0; j++) { const t = dst[j]; if (t && t !== s && t.k === s.k && !t.m && t.n < d.stack) { const mv = Math.min(n, d.stack - t.n); t.n += mv; n -= mv; } }
  for (let j = from; j < to && n > 0; j++) if (!dst[j]) { const mv = Math.min(n, d.stack); dst[j] = { k: s.k, n: mv, m: s.m }; n -= mv; }
  if (n === 0) src[i] = null; else s.n = n;
}
/** Merge partial stacks and order arr[from..to) by kind, rarity and name. */
function sortRange(arr: Slot[], from: number, to: number): void {
  const merged = new Map<string, number>(), loose: Item[] = [];
  for (let i = from; i < to; i++) {
    const s = arr[i]; if (!s) continue;
    if (s.m || item(s.k).stack === 1) loose.push(s); else merged.set(s.k, (merged.get(s.k) ?? 0) + s.n);
    arr[i] = null;
  }
  const list = loose;
  for (const [k, total] of merged) { const st = item(k).stack; for (let n = total; n > 0; n -= st) list.push({ k, n: Math.min(st, n) }); }
  list.sort((a, b) => sortRank(a.k) - sortRank(b.k) || itemRarity(b) - itemRarity(a) || sortCompare(itemName(a), itemName(b)) || b.n - a.n);
  for (let i = 0; i < list.length; i++) arr[from + i] = list[i];
}
function returnGrid(e: Env): void {
  const inv = e.inv;
  for (let i = 0; i < inv.craft.length; i++) { const s = inv.craft[i]; if (s) { const left = inv.add(s); if (left) e.ctx.drop({ ...s, n: left }); inv.craft[i] = null; } }
}
/** Grid and cursor back to the pack; what does not fit is thrown out. */
function tidy(e: Env): void {
  const inv = e.inv, c = inv.cursor;
  returnGrid(e);
  if (c) { const left = inv.add(c); if (left) e.ctx.drop({ ...c, n: left }); inv.cursor = null; }
  inv.touch();
}
/** Put the cursor stack (or one item of it) into a cell. False when nothing changed. */
function place(e: Env, v: Cell, one: boolean): boolean {
  const inv = e.inv, c = inv.cursor;
  if (!c || !accepts(v.kind, v.i, c, inv.acc, e.level)) return false;
  const s = v.arr[v.i], d = item(c.k), lone = single(v.kind);
  if (!s) {
    if (one || (lone && c.n > 1)) { v.arr[v.i] = { k: c.k, n: 1, m: c.m }; c.n--; } else { v.arr[v.i] = c; inv.cursor = null; }
  } else if (s.k === c.k && !s.m && !c.m && d.stack > 1 && !lone) {
    const mv = Math.min(one ? 1 : c.n, d.stack - s.n);
    if (mv <= 0) return false;
    s.n += mv; c.n -= mv;
  } else if (!one && !(lone && c.n > 1)) { v.arr[v.i] = c; inv.cursor = s; }
  else return false;
  if (inv.cursor && inv.cursor.n <= 0) inv.cursor = null;
  inv.touch();
  return true;
}
/** Take one batch of `r` off the grid. Having made a thing is world knowledge: the guide and the townsfolk read `craft:<key>`. */
function craft(e: Env, r: Recipe): Item {
  const out = takeCraft(r, e.inv.craft, e.ctx.rnd, e.cells);
  e.ctx.flag('craft:' + r.out);
  return out;
}
/** The recipe `i` names, if this window's grid can make it. */
function recipeAt(e: Env, i: unknown): Recipe | null {
  if (!e.cells || !int(i, 0, RECIPES.length - 1)) return null;
  const r = RECIPES[i];
  return recipeFits(r, e.station, e.gridW) ? r : null;
}

export function applyOp(s: OpState, op: InvOp, ctx: OpCtx): OpResult {
  if (typeof op !== 'object' || op === null) return no();
  const e = envOf(s, ctx), inv = s.inv;
  switch (op.o) {
    case 'sel': {
      if (!int(op.i, 0, 8)) return no();
      inv.sel = op.i;
      return yes();
    }
    case 'click': {
      const v = cellOf(e, op.v), cur = inv.cursor;
      if (!v || !bool(op.r) || !sees(v, op.e)) return no();
      if (!cur) {
        const t = v.arr[v.i];
        if (!t) return no();
        if (op.r && t.n > 1 && v.kind !== 'fout') { const half = Math.ceil(t.n / 2); inv.cursor = { k: t.k, n: half, m: t.m }; t.n -= half; }
        else { inv.cursor = t; v.arr[v.i] = null; }
        inv.touch();
        return yes();
      }
      if (place(e, v, op.r)) return yes(single(v.kind) ? 'dig_cloth' : undefined);
      return no('error', refusal(v.kind, cur) || undefined);
    }
    case 'place': {
      const v = cellOf(e, op.v);
      if (!v || !bool(op.one) || !place(e, v, op.one)) return no();
      return yes(single(v.kind) ? 'dig_cloth' : undefined);
    }
    case 'gather': {
      // matching unmodified items from the pack, then the open chest, into the cursor: partial stacks first
      const c = inv.cursor;
      if (!c) return no();
      const d = item(c.k), before = c.n;
      if (c.m || d.stack <= 1 || c.n >= d.stack) return no();
      for (let pass = 0; pass < 2; pass++) for (let a = 0; a < 2; a++) {
        const arr = a === 0 ? inv.slots : e.chest;
        if (!arr) continue;
        for (let i = 0; i < arr.length && c.n < d.stack; i++) {
          const t = arr[i];
          if (!t || t.k !== c.k || t.m || (pass === 0 && t.n >= d.stack)) continue;
          const mv = Math.min(t.n, d.stack - c.n); c.n += mv; t.n -= mv; if (t.n <= 0) arr[i] = null;
        }
      }
      if (c.n === before) return no();
      inv.touch();
      return yes();
    }
    case 'quick': {
      const v = cellOf(e, op.v);
      if (!v || !sees(v, op.e)) return no();
      const t = v.arr[v.i];
      if (!t) return no();
      const d = item(t.k);
      let snd: string | undefined, msg: string | undefined;
      if (v.kind === 'inv') {
        if (e.win?.mode === 'shop') {
          const val = sellPrice(t.k) * t.n, sold = e.win.sold;
          inv.coins += val; v.arr[v.i] = null;
          sold.push({ id: ctx.seq, it: { ...t }, price: val }); if (sold.length > 8) sold.shift();
          snd = 'coin'; msg = `Sold ${itemName(t)}${t.n > 1 ? ' x' + t.n : ''} for ${val} coins`;
        }
        else if (e.chest) moveInto(v.arr, v.i, e.chest, 0, 27);
        else if (e.forge) {
          if (smeltable(t.k, e.level)) moveInto(v.arr, v.i, e.forge, 0, 1);
          else if (d.fuel) moveInto(v.arr, v.i, e.forge, 1, 2);
          else return no('error', refusal('fin', t));
        }
        else if (d.armor) { const cur = inv.armor[d.armor.slot]; inv.armor[d.armor.slot] = t; v.arr[v.i] = cur; snd = 'dig_cloth'; }
        else if (d.acc && inv.acc.some((a) => a && a.k === t.k)) return no('error', 'Already wearing one: a second adds nothing');
        else if (d.acc && inv.acc.includes(null)) { inv.acc[inv.acc.indexOf(null)] = t; v.arr[v.i] = null; snd = 'dig_cloth'; }
        else if (v.i < 9) moveInto(v.arr, v.i, inv.slots, 9, 36); else moveInto(v.arr, v.i, inv.slots, 0, 9);
      } else {
        const left = inv.add(t);
        if (left) t.n = left; else v.arr[v.i] = null;
      }
      inv.touch();
      return yes(snd, msg);
    }
    case 'out': {
      if (!e.cells || !bool(op.all)) return no();
      let made = 0, msg: string | undefined;
      for (let guard = 0; guard < 99; guard++) {
        const r = matchRecipe(grid(e), e.gridW, e.station);
        if (!r) break;
        const d = item(r.out);
        if (!op.all) {
          const c = inv.cursor;
          if (c && (c.k !== r.out || c.m || d.stack === 1 || c.n + r.n > d.stack)) break;
          const out = craft(e, r);
          if (c) c.n += out.n; else inv.cursor = out;
          made += out.n;
          break;
        }
        if (inv.room(r.out) < r.n) { if (!made) msg = FULL; break; }
        const out = craft(e, r), left = inv.add(out);
        if (left) ctx.drop({ ...out, n: left });
        made += out.n;
      }
      if (!made) return no('error', msg);
      inv.touch();
      return yes('craft', undefined, made);
    }
    case 'lay': {
      const r = recipeAt(e, op.r);
      if (!r) return no();
      if (!canAfford(inv, r, grid(e))) return no('error');
      return yes(fillGrid(inv, r, inv.craft, e.gridW) ? 'click' : 'error');
    }
    case 'book': {
      // lay the recipe out and craft it straight into the pack, up to `max` times
      const r = recipeAt(e, op.r), max = op.max;
      if (!r || (max !== 1 && max !== 64)) return no();
      if (!canAfford(inv, r, grid(e))) return no('error');
      let made = 0, msg: string | undefined;
      for (let t = 0; t < max; t++) {
        if (!canAfford(inv, r, inv.craft)) break;
        if (!fillGrid(inv, r, inv.craft, e.gridW)) break;
        // the laid-out grid must spell exactly this recipe (tag overlaps can leave a cell short)
        if (matchRecipe(grid(e), e.gridW, e.station) !== r) { if (!made) { msg = 'That recipe cannot be laid out here'; returnGrid(e); } break; }
        if (inv.room(r.out) < r.n) { msg = FULL; returnGrid(e); break; }
        const out = craft(e, r), left = inv.add(out);
        if (left) ctx.drop({ ...out, n: left });
        made += out.n;
      }
      inv.touch();
      return yes(made ? 'craft' : 'error', msg, made);
    }
    case 'hotkey': {
      const v = cellOf(e, op.v);
      if (!v || !int(op.i, 0, 8) || !sees(v, op.e) || (v.arr === inv.slots && v.i === op.i)) return no();
      const a = v.arr[v.i], b = inv.slots[op.i], lone = single(v.kind);
      if (!a && !b) return no();
      if (b && (!accepts(v.kind, v.i, b, inv.acc, e.level) || v.kind === 'fout' || (lone && b.n > 1))) return no('error', refusal(v.kind, b) || undefined);
      v.arr[v.i] = b; inv.slots[op.i] = a;
      inv.touch();
      return yes(lone ? 'dig_cloth' : 'click');
    }
    case 'dropSlot': {
      const v = cellOf(e, op.v);
      if (!v || !bool(op.all) || !sees(v, op.e)) return no();
      const t = v.arr[v.i];
      if (!t) return no();
      const n = op.all ? t.n : 1;
      ctx.drop({ k: t.k, n, m: t.m });
      t.n -= n; if (t.n <= 0) v.arr[v.i] = null;
      inv.touch();
      return yes();
    }
    case 'dropCur': {
      const c = inv.cursor;
      if (!c) return no();
      if (c.n) ctx.drop({ ...c, n: c.n });
      inv.cursor = null; inv.touch();
      return yes();
    }
    case 'dropHeld': {
      const h = inv.held();
      if (!h || !bool(op.all)) return no();
      const n = op.all ? h.n : 1;
      ctx.drop({ k: h.k, n, m: h.m }); inv.consumeHeld(n);
      return yes();
    }
    case 'sort': {
      if (op.w === 0) sortRange(inv.slots, 9, 36);
      else if (op.w === 1 && e.chest) sortRange(e.chest, 0, 27);
      else return no();
      inv.touch();
      return yes();
    }
    case 'takeAll': {
      const c = e.chest;
      if (!c) return no();
      let moved = false;
      for (let i = 0; i < c.length; i++) { const t = c[i]; if (!t) continue; const left = inv.add(t); if (left !== t.n) moved = true; if (left) t.n = left; else c[i] = null; }
      if (!moved) return no(undefined, c.some((t) => t) ? FULL : undefined);
      inv.touch();
      return yes();
    }
    case 'stash': {
      // stacks the chest already holds, out of the backpack (not the hotbar)
      const c = e.chest;
      if (!c) return no();
      let moved = false;
      for (let i = 9; i < 36; i++) {
        const t = inv.slots[i];
        if (!t || t.m) continue;
        let found = false;
        for (let j = 0; j < c.length; j++) { const q = c[j]; if (q && q.k === t.k && !q.m) { found = true; break; } }
        if (found) { const n = t.n; moveInto(inv.slots, i, c, 0, c.length); if ((inv.slots[i]?.n ?? 0) !== n) moved = true; }
      }
      if (!moved) return no();
      inv.touch();
      return yes();
    }
    case 'buy': {
      const npc = e.win?.mode === 'shop' ? NPCS.find((q) => q.key === e.win!.npc) : undefined;
      const g = npc && bool(op.bulk) ? goods(npc, ctx.flags).find((x) => x[0] === op.k) : undefined;
      if (!g) return no();
      const [k, price, cur] = g, d = item(k);
      const funds = cur === 'coins' ? inv.coins : inv.count(cur);
      const n = Math.min(op.bulk ? Math.min(10, d.stack) : 1, Math.floor(funds / price), inv.room(k));
      if (n <= 0) return no('error', funds < price ? 'Not enough ' + (cur === 'coins' ? 'coins' : item(cur).name) : FULL);
      if (cur === 'coins') inv.coins -= price * n; else if (!inv.remove(cur, price * n)) return no();
      const left = inv.add({ k, n }); if (left) ctx.drop({ k, n: left });
      inv.touch();
      return yes('coin');
    }
    case 'buyBack': {
      const sold = e.win?.mode === 'shop' ? e.win.sold : null, i = sold ? sold.findIndex((x) => x.id === op.id) : -1;
      if (!sold || i < 0) return no('error');
      const x = sold[i];
      if (inv.coins < x.price) return no('error');
      if (x.it.m ? !inv.slots.includes(null) : inv.room(x.it.k) < x.it.n) return no('error', FULL);
      inv.coins -= x.price; sold.splice(i, 1);
      const left = inv.add(x.it); if (left) ctx.drop({ ...x.it, n: left });
      inv.touch();
      return yes('coin');
    }
    case 'spend': {
      if (typeof op.a !== 'string' || !Object.hasOwn(STAT_NAMES, op.a) || !s.stats.spend(op.a, inv)) return no();
      inv.touch();
      return yes('click');
    }
    case 'pick': {
      // bring the block's item to hand
      if (!int(op.id, 0, BLOCKS.length - 1)) return no();
      const b = BLOCKS[op.id], key = ITEMS.has(b.key) ? b.key : b.drops[0]?.[0];
      if (!key || !ITEMS.has(key)) return no();
      let at = -1, free = -1;
      for (let i = 0; i < INV_SIZE && at < 0; i++) if (inv.slots[i]?.k === key) at = i;
      for (let i = 8; i >= 0; i--) if (!inv.slots[i]) free = i;
      if (at >= 0 && at < 9) inv.sel = at;
      else if (at < 0 && !ctx.creative) return no();
      else {
        // from the pack (or from nowhere, in creative) into an empty hotbar slot if there is one, else trade places with the held stack
        const to = free >= 0 ? free : inv.sel, was = inv.slots[to];
        inv.slots[to] = at >= 0 ? inv.slots[at] : { k: key, n: item(key).stack };
        if (at >= 0) inv.slots[at] = was;
        else if (was) { const left = inv.add(was); if (left) ctx.drop({ k: was.k, n: left, m: was.m }); }
        inv.sel = to;
      }
      inv.touch();
      return yes('click');
    }
    case 'tidy': {
      if (!bool(op.cover)) return no();
      tidy(e);
      if (s.window) s.window.covered = op.cover;
      return yes();
    }
    case 'close': {
      tidy(e);
      s.window = null;
      return yes();
    }
    case '_held': {
      if (!int(op.n, 1, 999) || !inv.held()) return no();
      inv.consumeHeld(op.n);
      return yes();
    }
    case '_slot': {
      const t = int(op.i, 0, INV_SIZE - 1) ? inv.slots[op.i] : null;
      if (!t || !int(op.n, 1, 999)) return no();
      t.n -= op.n; if (t.n <= 0) inv.slots[op.i] = null;
      inv.touch();
      return yes();
    }
    default: return no();
  }
}
