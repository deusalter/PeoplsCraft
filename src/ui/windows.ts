// Inventory, crafting, chest, forge, shop and guide windows, plus the cursor stack and tooltips.
import { BLOCKS } from '../data/blocks';
import { Item, MOD_BY_KEY, RARITY, STYLE_INFO, Stats, item, itemName, itemRarity, matches, setBonus } from '../data/items';
import { RECIPES, Recipe, SMELTS, STATION_NAMES } from '../data/recipes';
import type { NpcDef } from '../data/npcs';
import { sourceOf } from '../data/sources';
import type { Game } from '../game';
import { Slot, canAfford, fillGrid, matchRecipe, needs, recipesFor, takeCraft } from '../systems/inventory';
import { ATTR_DESC, Attr, STAT_NAMES } from '../systems/stats';
import type { BlockEnt } from '../world/world';
import { el } from './hud';
import { uiScale } from './menus';

type Kind = 'inv' | 'armor' | 'acc' | 'craft' | 'out' | 'chest' | 'fin' | 'ffuel' | 'fout';
interface View { arr: Slot[]; i: number; kind: Kind; root: HTMLElement; ic: HTMLElement; n: HTMLElement; sig: string }
export type WinMode = 'inv' | 'station' | 'chest' | 'forge' | 'shop' | 'guide';
type WinOpts = { station?: string; chest?: Slot[]; forge?: BlockEnt; shop?: NpcDef };

const STAT_TEXT: Record<string, [string, boolean]> = {
  melee: ['melee damage', true], ranged: ['ranged damage', true], magic: ['magic damage', true], summon: ['summon damage', true], dmg: ['damage', true], crit: ['critical chance', true],
  def: ['defense', false], hp: ['maximum health', false], mana: ['maximum mana', false], manaRegen: ['mana regeneration', false], regen: ['health regeneration', false], speed: ['movement speed', true],
  jump: ['jump height', true], minions: ['minion slot', false], mining: ['mining speed', true], atkSpeed: ['attack speed', true], knockRes: ['knockback resistance', true], pickup: ['pickup range', false],
  thorns: ['damage reflected', true], dodge: ['dodge chance', true], luck: ['luck', true], swim: ['swim speed', true], reach: ['reach', false],
};
function statLines(s: Stats | undefined, cls = 'gd'): string {
  if (!s) return '';
  let h = '';
  for (const k in s) {
    const v = (s as Record<string, number>)[k], t = STAT_TEXT[k];
    if (!t) continue;
    const txt = t[1] ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`;
    h += `<div class="${v < 0 ? 'bd' : cls}">${txt} ${t[0]}</div>`;
  }
  return h;
}
/** Coins an item is worth to a trader. */
export function itemValue(k: string): number {
  const d = item(k);
  if (d.block !== undefined) { const b = BLOCKS[d.block]; return b.power >= 3 ? 6 + b.power * 4 : b.light ? 3 : 1; }
  const base = [2, 8, 25, 70, 160, 380, 900][d.rarity];
  return Math.round(base * (d.weapon || d.armor || d.acc ? 3 : 1));
}
const BOOK_CATS = ['All', 'Tools', 'Weapons', 'Armour', 'Trinkets', 'Blocks', 'Other'];
function bookCat(k: string): number { const d = item(k); return d.tool ? 1 : d.weapon ? 2 : d.armor ? 3 : d.acc ? 4 : d.block !== undefined ? 5 : 6; }
const EMPTY_GRID: Slot[] = [];
function sortRank(k: string): number { const d = item(k); return d.weapon && !d.tool ? 0 : d.tool ? 1 : d.armor ? 2 : d.acc ? 3 : d.food || d.heal || d.restoreMana || d.buff || d.use ? 4 : d.block !== undefined ? 5 : 6; }
const SA: Record<string, number> = {}, SB: Record<string, number> = {};
/** Sum an item's own stats and its modifier's into `out` (cleared first). */
function gearStats(it: Item, out: Record<string, number>): void {
  for (const k in out) out[k] = 0;
  const add = (st?: Stats): void => { if (st) for (const k in st) out[k] = (out[k] ?? 0) + (st as Record<string, number>)[k]; };
  add(item(it.k).stats); if (it.m) add(MOD_BY_KEY.get(it.m)?.stats);
}
const sellPrice = (k: string): number => Math.max(1, Math.floor(itemValue(k) * 0.3));
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export class Windows {
  open = false; mode: WinMode = 'inv';
  private root: HTMLElement; private cursor: HTMLElement; private cursorN: HTMLElement; private tip: HTMLElement;
  private views: View[] = []; private outView: View | null = null; private recipe: Recipe | null = null;
  private station = 'hand'; private gridW = 2; private chest: Slot[] | null = null; private forge: BlockEnt | null = null; private shop: NpcDef | null = null;
  private book: HTMLElement | null = null; private bookRecipes: Recipe[] = []; private statsEl: HTMLElement | null = null; private forgeEls: HTMLElement[] = [];
  private rev = -1; private dragFrom: View | null = null; private mx = 0; private my = 0; private hover: View | null = null; private outArr: Slot[] = [null];
  private shopEl: HTMLElement | null = null;
  // recipe book: built once per tab in a fixed order; refresh() only toggles classes
  private bookEls: HTMLElement[] = []; private bookCats: number[] = []; private bookNames: string[] = []; private bookEmpty: HTMLElement | null = null;
  private bookTab = 'hand'; private bookChips: HTMLElement[] = []; private makeChip: HTMLElement | null = null; private search: HTMLInputElement | null = null;
  private coinEl: HTMLElement | null = null; private coinShown = -1;
  private sold: { it: Item; price: number }[] = []; private sellConfirm: { v: View; t: number } | null = null; private shopHead: HTMLElement | null = null;
  private back: { mode: WinMode; o: WinOpts } | null = null;
  private lastV: View | null = null; private lastT = 0; private dragSet: Set<View> | null = null;
  private bookQuery = ''; private bookCat: Record<string, number> = {}; private bookCan: Record<string, boolean> = {}; private hoverR: Recipe | null = null;

  constructor(ui: HTMLElement, private g: Game) {
    this.root = el('div', '#win', ui); this.root.classList.add('hidden');
    this.cursor = el('div', '#cursor', ui); this.cursorN = el('div', 'n', this.cursor); this.cursor.style.display = 'none';
    this.tip = el('div', '#tip', ui); this.tip.style.display = 'none';
    const r = this.root;
    r.addEventListener('mousedown', (e) => { if (this.search && e.target !== this.search) this.search.blur(); const v = this.viewOf(e.target); if (v) { this.down(v, e); e.preventDefault(); } else if (e.target === r) this.dropCursor(); });
    r.addEventListener('mouseup', (e) => { const v = this.viewOf(e.target); if (v && e.button === 0 && this.dragFrom && v !== this.dragFrom && g.inv.cursor) this.place(v, false); this.dragFrom = null; this.dragSet = null; });
    window.addEventListener('mouseup', () => { this.dragSet = null; });
    r.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      this.mx = e.clientX; this.my = e.clientY;
      if (!this.open) return;
      this.cursor.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
      this.moveTip();
    });
    r.addEventListener('mouseover', (e) => {
      const t = e.target as HTMLElement, v = this.viewOf(t);
      this.hover = v;
      // right-button drag deals one item into each slot passed over
      if (v && this.dragSet && (e.buttons & 2) && g.inv.cursor && !this.dragSet.has(v)) { this.dragSet.add(v); if (this.place(v, true)) g.audio.play('click', 0.3); }
      // while carrying a stack the tip would cover the slots being aimed at
      if (v) { const s = v.arr[v.i]; if (s && !g.inv.cursor) this.showTip(this.itemTip(s, 'slot', v)); else this.hideTip(); return; }
      const ri = t.closest?.('[data-r]') as HTMLElement | null;
      this.hoverR = ri ? this.bookRecipes[+ri.dataset.r!] : null;
      if (this.hoverR) this.showTip(this.recipeTip(this.hoverR)); else if (!t.closest?.('[data-tip]')) this.hideTip();
      const dt = t.closest?.('[data-tip]') as HTMLElement | null;
      if (dt) this.showTip(dt.dataset.tip!);
      const sk = t.closest?.('[data-k]') as HTMLElement | null;
      if (sk) this.showTip(this.itemTip({ k: sk.dataset.k!, n: 1, m: sk.dataset.m }, 'buy') + (sk.dataset.need ? `<div class="bd" style="margin-top:4px">${esc(sk.dataset.need)}</div>` : ''));
    });
  }
  private viewOf(t: EventTarget | null): View | null {
    const s = (t as HTMLElement)?.closest?.('[data-v]') as HTMLElement | null;
    return s ? this.views[+s.dataset.v!] : null;
  }

  // ---- open / close ----
  show(mode: WinMode, o: WinOpts = {}): void {
    const g = this.g;
    // remember the window the Guide was opened from so Back (or G) returns to it
    const from = this.open && mode === 'guide' && this.mode !== 'guide' ? { mode: this.mode, o: { station: this.station, chest: this.chest ?? undefined, forge: this.forge ?? undefined, shop: this.shop ?? undefined } } : null;
    if (this.open) this.close(true);
    this.back = mode === 'guide' ? from : null;
    this.open = true; this.mode = mode;
    this.station = mode === 'station' ? o.station! : 'hand'; this.gridW = mode === 'station' ? 3 : 2;
    if (o.shop && o.shop !== this.shop) this.sold = [];
    this.chest = o.chest ?? null; this.forge = o.forge ?? null; this.shop = o.shop ?? null;
    this.build();
    this.root.classList.remove('hidden');
    g.input.uiMode = true; g.input.unlock();
    this.cursor.style.transform = `translate(${this.mx - 16}px, ${this.my - 16}px)`;
    this.rev = -1; this.refresh();
  }
  /** G: open the Guide, or leave it for the window it was opened from (closing if there was none). */
  toggleGuide(): void {
    if (!this.open || this.mode !== 'guide') this.show('guide');
    else if (this.back) this.leaveGuide();
    else this.close();
  }
  leaveGuide(): void { const b = this.back; this.back = null; if (b) this.show(b.mode, b.o); else this.show('inv'); }
  close(silent = false): void {
    if (!this.open) return;
    const g = this.g, inv = g.inv;
    this.open = false; this.root.classList.add('hidden'); this.hideTip();
    this.hover = null; this.dragFrom = null; this.dragSet = null; this.lastV = null; this.hoverR = null;
    this.markContainer();
    this.returnGrid();
    this.dropCursor(true);
    this.cursor.style.display = 'none';
    this.chest = null; this.forge = null; this.shop = null; this.sold = []; this.sellConfirm = null;
    inv.touch();
    if (!silent) { g.input.uiMode = false; g.input.lock(); }
  }
  private dropCursor(toInv = false): void {
    const g = this.g, c = g.inv.cursor;
    if (!c) return;
    const left = toInv ? g.inv.add(c) : c.n;
    if (left) g.dropItem({ ...c, n: left });
    g.inv.cursor = null; g.inv.touch();
  }

  // ---- layout ----
  private slot(parent: HTMLElement, arr: Slot[], i: number, kind: Kind, label = ''): View {
    const root = el('div', 'slot', parent);
    root.dataset.v = String(this.views.length);
    if (label) el('div', 'lbl', root, label);
    const v: View = { arr, i, kind, root, ic: el('div', 'ic', root), n: el('div', 'n', root), sig: '?' };
    this.views.push(v);
    return v;
  }
  private build(): void {
    const g = this.g, inv = g.inv;
    this.hover = null; this.dragFrom = null; this.dragSet = null; this.lastV = null; this.hoverR = null;
    this.root.innerHTML = ''; this.views = []; this.outView = null; this.book = null; this.statsEl = null; this.forgeEls = []; this.shopEl = null; this.search = null; this.shopHead = null; this.coinEl = null; this.coinShown = -1;
    const panel = el('div', 'panel wcol', this.root), top = el('div', 'wrow', panel);

    // equipment + stats
    const ch = el('div', 'wcol', top);
    el('div', 'ttl', ch, 'Equipment');
    const eq = el('div', 'wrow', ch), ar = el('div', 'grid', eq), ac = el('div', 'grid', eq);
    ['Head', 'Body', 'Legs'].forEach((l, i) => this.slot(ar, inv.armor, i, 'armor', l));
    ac.style.gridTemplateColumns = 'repeat(2, 44px)';
    for (let i = 0; i < 5; i++) this.slot(ac, inv.acc, i, 'acc', 'Trinket');
    this.statsEl = el('div', '', ch); this.statsEl.style.minWidth = '190px';

    // middle
    const mid = el('div', 'wcol', top);
    if (this.mode === 'inv' || this.mode === 'station') {
      el('div', 'ttl', mid, this.mode === 'station' ? STATION_NAMES[this.station] : 'Crafting');
      const row = el('div', 'wrow', mid), grid = el('div', 'grid', row);
      grid.style.gridTemplateColumns = `repeat(${this.gridW}, 44px)`;
      for (let i = 0; i < this.gridW * this.gridW; i++) this.slot(grid, inv.craft, i, 'craft');
      el('div', 'arrow', row, '→');
      this.outView = this.slot(row, this.outArr, 0, 'out'); this.outView.root.style.alignSelf = 'center';
      const hd = el('div', 'wrow', mid); hd.style.cssText = 'justify-content:space-between;align-items:center;gap:6px';
      el('div', 'ttl', hd, 'Recipe book');
      const sr = el('input', 'search', hd); sr.type = 'text'; sr.placeholder = 'Search'; sr.spellcheck = false; sr.value = this.bookQuery;
      // the game's key handler listens on window: keep typed letters (E, G, digits) from reaching it
      sr.onkeydown = (e) => { if (e.key !== 'Escape') e.stopPropagation(); if (e.key === 'Enter') sr.blur(); };
      sr.oninput = () => { this.bookQuery = sr.value.trim().toLowerCase(); this.updateBook(); };
      this.search = sr;
      const gb = el('button', 'btn sm', hd, 'Guide'); gb.onclick = () => this.show('guide');
      const tabs = this.bookTabs();
      if (!tabs.includes(this.bookTab)) this.bookTab = this.station;
      if (tabs.length > 1) {
        const tr = el('div', 'chips', mid);
        for (const t of tabs) { const b = el('button', 'btn chip' + (t === this.bookTab ? ' on' : ''), tr, t === 'hand' ? 'Hand' : STATION_NAMES[t]); b.dataset.tab = t; b.dataset.tip = t === this.station ? 'What you can make here' : 'Browse what the ' + STATION_NAMES[t] + ' makes'; }
        tr.onmousedown = (e) => {
          e.stopPropagation();
          const b = (e.target as HTMLElement).closest('[data-tab]') as HTMLElement | null;
          if (!b || b.dataset.tab === this.bookTab) return;
          this.bookTab = b.dataset.tab!; for (const c of tr.children) c.classList.toggle('on', c === b);
          this.g.audio.play('click', 0.4); this.makeBook(); this.updateBook();
        };
      }
      const cr = el('div', 'chips', mid);
      this.makeChip = el('button', 'btn chip', cr, 'Can make'); this.makeChip.dataset.c = '-1';
      this.bookChips = BOOK_CATS.map((c, i) => { const b = el('button', 'btn chip', cr, c); b.dataset.c = String(i); return b; });
      cr.onmousedown = (e) => {
        e.stopPropagation();
        const b = (e.target as HTMLElement).closest('[data-c]') as HTMLElement | null;
        if (!b) return;
        const c = +b.dataset.c!;
        if (c < 0) this.bookCan[this.bookTab] = !this.bookCan[this.bookTab]; else this.bookCat[this.bookTab] = c;
        this.g.audio.play('click', 0.4); this.updateBook();
      };
      this.book = el('div', '#book', mid);
      this.book.onmousedown = (e) => {
        e.stopPropagation(); e.preventDefault(); this.search?.blur();
        const b = (e.target as HTMLElement).closest('[data-r]') as HTMLElement | null;
        if (b) this.bookClick(this.bookRecipes[+b.dataset.r!], e);
      };
      this.bookEmpty = el('div', 'cap', mid, 'Nothing here matches');
      el('div', 'cap', mid, 'Click: lay out · Right-click: craft one · Shift-click: craft all').style.textAlign = 'left';
      this.makeBook();
    } else if (this.mode === 'chest') {
      const hd = el('div', 'wrow', mid); hd.style.cssText = 'justify-content:space-between;align-items:center;gap:6px';
      el('div', 'ttl', hd, 'Chest');
      const bs = el('div', 'wrow', hd); bs.style.gap = '4px';
      this.button(bs, 'Take all', 'Move everything into your pack', () => this.takeAll());
      this.button(bs, 'Stash', 'Move stacks the chest already holds out of your backpack (not the hotbar)', () => this.stashMatching());
      this.button(bs, 'Sort', 'Merge stacks and sort the chest', () => { this.sortRange(this.chest!, 0, 27); return true; });
      const grid = el('div', 'grid', mid); grid.style.gridTemplateColumns = 'repeat(9, 44px)';
      for (let i = 0; i < 27; i++) this.slot(grid, this.chest!, i, 'chest');
    } else if (this.mode === 'forge') {
      const f = this.forge!;
      el('div', 'ttl', mid, BLOCKS[g.world.getBlock(f.x, f.y, f.z)]?.name ?? 'Forge');
      const row = el('div', 'wrow', mid);
      const c1 = el('div', 'wcol', row);
      this.slot(c1, f.data.s, 0, 'fin', 'Ore');
      const flame = el('div', 'prog', c1); this.forgeEls.push(el('i', '', flame)); flame.style.height = '6px'; flame.dataset.tip = 'Heat: fuel left in the fire';
      this.slot(c1, f.data.s, 1, 'ffuel', 'Fuel');
      const pc = el('div', 'wcol', row); pc.style.cssText = 'align-self:center;gap:2px'; const pr = el('div', 'prog', pc); this.forgeEls.push(el('i', '', pr)); el('div', 'cap', pc, 'Smelting');
      const o = this.slot(row, f.data.s, 2, 'fout'); o.root.style.alignSelf = 'center';
      const lv = f.data.level as number;
      const list = el('div', '', mid); list.style.cssText = 'font-size:11px;color:#9aa0b2;max-width:260px;line-height:1.5';
      list.textContent = 'Smelts: ' + SMELTS.filter((s) => s.forge <= lv).map((s) => item(s.out).name).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    } else if (this.mode === 'shop') {
      const n = this.shop!;
      el('div', 'ttl', mid, n.name);
      const say = el('div', '', mid, '"' + g.npcs.line(n) + '"'); say.style.cssText = 'font-size:12px;color:#c4c9d8;max-width:300px;font-style:italic';
      this.shopHead = el('div', 'shophead', mid);
      this.shopEl = el('div', 'scroll', mid); this.shopEl.style.width = '300px';
      const hint = el('div', '', mid, 'Shift-click an item in your pack to sell the stack. Sold items can be bought back until you leave. Shift-click Buy for up to 10.'); hint.style.cssText = 'font-size:11px;color:#9aa0b2;max-width:300px;line-height:1.4';
    } else {
      el('div', 'ttl', mid, 'Guide');
      const sc = el('div', 'scroll', mid); sc.style.width = '360px';
      for (const q of g.quests.list()) {
        const r = el('div', 'qrow' + (q.done ? ' done' : q.current ? ' cur' : ''), sc);
        r.innerHTML = `${q.done ? '✔' : q.current ? '<b>➤</b>' : '·'} ${esc(q.title)}` + (q.current ? `<small>${esc(q.hint)}</small>` : '');
      }
      const b = this.back, label = !b ? 'Back to crafting' : b.mode === 'station' ? 'Back to ' + STATION_NAMES[b.o.station!] : b.mode === 'inv' ? 'Back to crafting' : 'Back';
      const back = el('button', 'btn sm', mid, label); back.onclick = () => this.leaveGuide();
      requestAnimationFrame(() => sc.querySelector('.cur')?.scrollIntoView({ block: 'center' }));
    }

    const ih = el('div', 'wrow', panel); ih.style.cssText = 'align-items:center;gap:8px';
    el('div', 'ttl', ih, 'Inventory');
    this.button(ih, 'Sort', 'Merge stacks and sort the backpack (the hotbar stays as it is)', () => { this.sortRange(inv.slots, 9, 36); return true; });
    this.coinEl = el('div', 'coins', ih);
    const main = el('div', 'grid', panel); main.style.gridTemplateColumns = 'repeat(9, 44px)';
    for (let i = 9; i < 36; i++) this.slot(main, inv.slots, i, 'inv');
    const hot = el('div', 'grid', panel); hot.style.gridTemplateColumns = 'repeat(9, 44px)'; hot.style.marginTop = '4px';
    for (let i = 0; i < 9; i++) this.slot(hot, inv.slots, i, 'inv');
    const kh = el('div', 'cap', panel, 'Shift-click: move · Right-click: half · Double-click: gather · 1-9: to hotbar · Q: drop'); kh.style.cssText = 'text-align:left;max-width:none';
  }

  // ---- refresh ----
  /** Called every frame while open; cheap unless something changed. */
  refresh(): void {
    const g = this.g, inv = g.inv;
    if (this.forge) {
      const d = this.forge.data;
      this.forgeEls[0].style.width = (d.burnMax > 0 ? (d.burn / d.burnMax) * 100 : 0) + '%';
      this.forgeEls[1].style.width = (d.need > 0 ? (d.prog / d.need) * 100 : 0) + '%';
    }
    if (this.coinEl && inv.coins !== this.coinShown) { this.coinShown = inv.coins; this.coinEl.textContent = inv.coins + ' coins'; }
    const fr = this.forge ? this.forge.data.rev : 0;
    if (inv.rev + fr * 1e6 === this.rev) return;
    this.rev = inv.rev + fr * 1e6;
    g.stats.sync(inv);
    if (this.outView) {
      const grid = this.gridW === 2 ? inv.craft.slice(0, 4) : inv.craft;
      this.recipe = matchRecipe(grid, this.gridW, this.station);
      this.outArr[0] = this.recipe ? { k: this.recipe.out, n: this.recipe.n } : null;
    }
    for (const v of this.views) {
      const s = v.arr[v.i], sig = s ? s.k + ':' + s.n + ':' + (s.m ?? '') : '';
      if (sig === v.sig) continue;
      v.sig = sig;
      g.icons.apply(v.ic, s ? s.k : null);
      v.n.textContent = s && s.n > 1 ? String(s.n) : '';
      const r = s ? itemRarity(s) : 0;
      v.root.className = 'slot' + (v.arr === inv.slots && v.i === inv.sel ? ' sel' : '') + (r > 0 ? ' r' + r : '');
      const lbl = v.root.querySelector('.lbl') as HTMLElement | null;
      if (lbl) lbl.style.display = s ? 'none' : '';
    }
    const c = inv.cursor;
    // equipment and forge slots that would take the carried item light up
    for (const v of this.views) if (v.kind === 'armor' || v.kind === 'acc' || v.kind === 'fin' || v.kind === 'ffuel') v.root.classList.toggle('ok', !!c && this.accepts(v, c));
    if (c) { this.cursor.style.display = 'block'; g.icons.apply(this.cursor, c.k, Math.round(32 * uiScale())); this.cursorN.textContent = c.n > 1 ? String(c.n) : ''; }
    else this.cursor.style.display = 'none';
    if (this.book) this.updateBook();
    if (this.statsEl) this.buildStats();
    if (this.shopEl) this.buildShop();
    if (this.hover) { const s = this.hover.arr[this.hover.i]; if (s && !c) this.showTip(this.itemTip(s, 'slot', this.hover)); else this.hideTip(); }
    else if (this.hoverR) this.showTip(this.recipeTip(this.hoverR));
  }
  /** Stations whose book can be browsed from here: the one in use, plus any the player has built. */
  private bookTabs(): string[] {
    const out = [this.station];
    for (const st in STATION_NAMES) if (st !== 'hand' && st !== this.station && this.g.flags.has('craft:' + (BLOCKS.find((b) => b.use === st)?.key ?? st))) out.push(st);
    return out;
  }
  /** Build the book's slots for the current tab: station recipes in table order, hand recipes last. */
  private makeBook(): void {
    const g = this.g, book = this.book!, here = this.bookTab === this.station;
    const list = here ? recipesFor(this.station, this.gridW) : RECIPES.filter((r) => r.station === this.bookTab);
    if (here && this.station !== 'hand') list.sort((a, b) => (a.station === 'hand' ? 1 : 0) - (b.station === 'hand' ? 1 : 0));
    this.bookRecipes = list; this.bookEls = []; this.bookCats = []; this.bookNames = [];
    book.innerHTML = ''; book.scrollTop = 0; book.classList.toggle('ro', !here);
    const used = new Array(BOOK_CATS.length).fill(false); used[0] = true;
    list.forEach((r, i) => {
      const s = el('div', 'slot', book); s.dataset.r = String(i);
      g.icons.apply(el('div', 'ic', s), r.out);
      if (r.n > 1) el('div', 'n', s, String(r.n));
      const c = bookCat(r.out); used[c] = true;
      this.bookEls.push(s); this.bookCats.push(c); this.bookNames.push(item(r.out).name.toLowerCase());
    });
    this.bookChips.forEach((b, i) => b.classList.toggle('hidden', !used[i]));
    if (!used[this.bookCat[this.bookTab] ?? 0]) this.bookCat[this.bookTab] = 0;
  }
  /** Affordability rings and filters, without touching the order. */
  private updateBook(): void {
    if (!this.book) return;
    const inv = this.g.inv, grid = this.gridW === 2 ? inv.craft.slice(0, 4) : inv.craft, here = this.bookTab === this.station;
    const cat = this.bookCat[this.bookTab] ?? 0, can = !!this.bookCan[this.bookTab], q = this.bookQuery;
    let shown = 0;
    for (let i = 0; i < this.bookEls.length; i++) {
      const e = this.bookEls[i], ok = canAfford(inv, this.bookRecipes[i], here ? grid : EMPTY_GRID);
      e.classList.toggle('no', !ok); e.classList.toggle('can', ok);
      const vis = (cat === 0 || this.bookCats[i] === cat) && (!can || ok) && (!q || this.bookNames[i].includes(q));
      e.classList.toggle('hidden', !vis); if (vis) shown++;
    }
    this.bookChips.forEach((b, i) => b.classList.toggle('on', i === cat));
    this.makeChip!.classList.toggle('on', can);
    this.bookEmpty!.classList.toggle('hidden', shown > 0);
  }
  private bookClick(r: Recipe, e: MouseEvent): void {
    const g = this.g, inv = g.inv;
    if (this.bookTab !== this.station) { g.toast('Made at the ' + STATION_NAMES[r.station], '#ff9a8a'); g.audio.play('error', 0.5); return; }
    const grid = this.gridW === 2 ? inv.craft.slice(0, 4) : inv.craft;
    if (!canAfford(inv, r, grid)) { g.audio.play('error', 0.5); return; }
    if (e.button === 2 || e.shiftKey) { this.craftFromBook(r, e.shiftKey ? 64 : 1); return; }
    if (fillGrid(inv, r, inv.craft, this.gridW)) g.audio.play('click'); else g.audio.play('error', 0.6);
  }
  /** Lay the recipe out and craft it straight into the pack, up to `max` times. */
  private craftFromBook(r: Recipe, max: number): void {
    const g = this.g, inv = g.inv, cells = this.gridW * this.gridW;
    let made = 0, full = false;
    for (let t = 0; t < max; t++) {
      if (!canAfford(inv, r, inv.craft)) break;
      if (!fillGrid(inv, r, inv.craft, this.gridW)) break;
      // the laid-out grid must spell exactly this recipe (tag overlaps can leave a cell short)
      if (matchRecipe(this.gridW === 2 ? inv.craft.slice(0, 4) : inv.craft, this.gridW, this.station) !== r) break;
      if (inv.room(r.out) < r.n) { full = true; this.returnGrid(); break; }
      const out = takeCraft(r, inv.craft, Math.random, cells), left = inv.add(out);
      if (left) g.dropItem({ ...out, n: left });
      made += out.n; g.onCrafted(r.out, out.n);
    }
    if (made) { g.audio.play('craft'); if (max > 1) g.toast(`Made ${made} ${item(r.out).name}`, RARITY[item(r.out).rarity].color); }
    else g.audio.play('error', 0.5);
    if (full) g.toast('No room in your pack', '#ff9a8a');
    inv.touch();
  }
  /** A small button that acts on mousedown without letting the root handler drop the cursor stack. */
  private button(parent: HTMLElement, label: string, tip: string, act: () => boolean): HTMLElement {
    const b = el('button', 'btn sm', parent, label); b.dataset.tip = tip;
    b.onmousedown = (e) => { e.stopPropagation(); if (e.button !== 0) return; if (act()) { this.g.audio.play('click', 0.5); this.afterEdit(); } else this.g.audio.play('error', 0.4); };
    return b;
  }
  private takeAll(): boolean {
    const inv = this.g.inv, c = this.chest!;
    let moved = false;
    for (let i = 0; i < c.length; i++) { const s = c[i]; if (!s) continue; const left = inv.add(s); if (left !== s.n) moved = true; if (left) s.n = left; else c[i] = null; }
    if (!moved && c.some((s) => s)) this.g.toast('No room in your pack', '#ff9a8a');
    return moved;
  }
  private stashMatching(): boolean {
    const inv = this.g.inv, c = this.chest!;
    let moved = false;
    for (let i = 9; i < 36; i++) {
      const s = inv.slots[i];
      if (!s || s.m) continue;
      let found = false;
      for (let j = 0; j < c.length; j++) { const t = c[j]; if (t && t.k === s.k && !t.m) { found = true; break; } }
      if (found) { const n = s.n; this.moveInto(inv.slots, i, c, 0, c.length); if ((inv.slots[i]?.n ?? 0) !== n) moved = true; }
    }
    return moved;
  }
  /** Move the stack at src[i] into dst[from..to): top up matching stacks first, then fill empty slots. */
  private moveInto(src: Slot[], i: number, dst: Slot[], from: number, to: number): void {
    const s = src[i]!, d = item(s.k);
    let n = s.n;
    if (d.stack > 1 && !s.m) for (let j = from; j < to && n > 0; j++) { const t = dst[j]; if (t && t !== s && t.k === s.k && !t.m && t.n < d.stack) { const mv = Math.min(n, d.stack - t.n); t.n += mv; n -= mv; } }
    for (let j = from; j < to && n > 0; j++) if (!dst[j]) { const mv = Math.min(n, d.stack); dst[j] = { k: s.k, n: mv, m: s.m }; n -= mv; }
    if (n === 0) src[i] = null; else s.n = n;
  }
  /** Merge partial stacks and order arr[from..to) by kind, rarity and name. */
  private sortRange(arr: Slot[], from: number, to: number): void {
    const merged = new Map<string, number>(), loose: Item[] = [];
    for (let i = from; i < to; i++) {
      const s = arr[i]; if (!s) continue;
      if (s.m || item(s.k).stack === 1) loose.push(s); else merged.set(s.k, (merged.get(s.k) ?? 0) + s.n);
      arr[i] = null;
    }
    const list = loose;
    for (const [k, total] of merged) { const st = item(k).stack; for (let n = total; n > 0; n -= st) list.push({ k, n: Math.min(st, n) }); }
    list.sort((a, b) => sortRank(a.k) - sortRank(b.k) || itemRarity(b) - itemRarity(a) || itemName(a).localeCompare(itemName(b)) || b.n - a.n);
    for (let i = 0; i < list.length; i++) arr[from + i] = list[i];
  }
  private returnGrid(): void {
    const g = this.g, inv = g.inv;
    for (let i = 0; i < inv.craft.length; i++) { const s = inv.craft[i]; if (s) { const left = inv.add(s); if (left) g.dropItem({ ...s, n: left }); inv.craft[i] = null; } }
  }
  private buildStats(): void {
    const g = this.g, st = g.stats, d = st.d, e = this.statsEl!;
    const pct = (v: number): string => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    let h = `<div class="ttl" style="margin-top:6px">Level ${st.level} · ${st.xp}/${st.xpNeeded()} xp</div>`;
    h += `<div class="stat"><span>Defense</span><b>${Math.round(d.def * 10) / 10}</b></div>`;
    for (const s of ['melee', 'ranged', 'magic', 'summon'] as const) h += `<div class="stat"><span>${STYLE_INFO[s].label}</span><b>${pct(d[s] + d.dmg)}</b></div>`;
    h += `<div class="stat"><span>Critical</span><b>${Math.round(d.crit * 100)}%</b></div><div class="stat"><span>Speed</span><b>${pct(d.speed)}</b></div><div class="stat"><span>Minions</span><b>${d.minions}</b></div>`;
    h += `<div class="ttl" style="margin-top:6px">Attributes${st.points > 0 ? ` · ${st.points} to spend` : ''}</div>`;
    for (const a of Object.keys(STAT_NAMES) as Attr[]) h += `<div class="stat" data-tip="${esc(ATTR_DESC[a])}"><span>${STAT_NAMES[a]}</span><b>${st.attr[a]} ${st.points > 0 ? `<button class="btn sm gold" data-a="${a}">+</button>` : ''}</b></div>`;
    if (st.sets.length) h += `<div class="stat" style="margin-top:4px"><span style="color:#8fd0ff">${st.sets.map((s) => setBonus(s)!.text).join('; ')}</span></div>`;
    e.innerHTML = h;
    e.querySelectorAll('button[data-a]').forEach((b) => ((b as HTMLElement).onmousedown = (ev) => { ev.stopPropagation(); if (st.spend((b as HTMLElement).dataset.a as Attr, g.inv)) { g.audio.play('click'); g.inv.touch(); } }));
  }
  private buildShop(): void {
    const g = this.g, inv = g.inv, e = this.shopEl!, n = this.shop!, top = e.scrollTop, goods = g.npcs.goods(n);
    let hd = `Your coins: <b>${inv.coins}</b>`;
    const tok = goods.find((x) => x[2] !== 'coins')?.[2];
    if (tok) hd += ` · ${esc(item(tok).name)}: <b>${inv.count(tok)}</b>`;
    this.shopHead!.innerHTML = hd;
    e.innerHTML = '';
    const row = (k: string, label: string, price: string, have: number, cost: number, tip: string, buy: (ev: MouseEvent) => void, m?: string): void => {
      const r = el('div', 'shoprow', e), ic = el('div', 'slot', r), d = item(k);
      ic.style.cssText = 'width:36px;height:36px'; const i2 = el('div', 'ic', ic); i2.style.cssText = 'left:2px;top:2px'; g.icons.apply(i2, k);
      const nm = el('div', 'nm', r, label); nm.style.color = RARITY[m ? itemRarity({ k, n: 1, m }) : d.rarity].color;
      r.dataset.k = k; if (m) r.dataset.m = m; if (have < cost) r.dataset.need = tip + `Need ${cost - have} more`;
      el('div', 'pr' + (have < cost ? ' short' : ''), r, price);
      const b = el('button', 'btn sm' + (have >= cost ? ' gold' : ''), r, 'Buy');
      if (have < cost) b.setAttribute('disabled', '');
      b.onmousedown = (ev) => { ev.stopPropagation(); if (ev.button === 0) buy(ev); };
    };
    if (this.sold.length) {
      el('div', 'ttl', e, 'Buy back').style.marginTop = '2px';
      for (let i = this.sold.length - 1; i >= 0; i--) {
        const x = this.sold[i];
        row(x.it.k, itemName(x.it) + (x.it.n > 1 ? ' x' + x.it.n : ''), x.price + ' c', inv.coins, x.price, '', () => this.buyBack(x));
      }
      el('div', 'ttl', e, 'For sale').style.marginTop = '6px';
    }
    for (const [k, price, cur] of goods) {
      const have = cur === 'coins' ? inv.coins : inv.count(cur);
      row(k, item(k).name, `${price} ${cur === 'coins' ? 'c' : 'tokens'}`, have, price, '', (ev) => this.buy(k, price, cur, ev.shiftKey));
    }
    e.scrollTop = top;
  }
  private buy(k: string, price: number, cur: string, bulk: boolean): void {
    const g = this.g, inv = g.inv, d = item(k);
    const funds = cur === 'coins' ? inv.coins : inv.count(cur);
    const n = Math.min(bulk ? Math.min(10, d.stack) : 1, Math.floor(funds / price), inv.room(k));
    if (n <= 0) { g.toast(funds < price ? 'Not enough ' + (cur === 'coins' ? 'coins' : item(cur).name) : 'No room in your pack', '#ff9a8a'); g.audio.play('error', 0.5); return; }
    if (cur === 'coins') inv.coins -= price * n; else if (!inv.remove(cur, price * n)) return;
    const left = inv.add({ k, n }); if (left) g.dropItem({ k, n: left });
    g.audio.play('coin'); inv.touch();
  }
  private buyBack(x: { it: Item; price: number }): void {
    const g = this.g, inv = g.inv, i = this.sold.indexOf(x);
    if (i < 0 || inv.coins < x.price) { g.audio.play('error', 0.5); return; }
    if (x.it.m ? !inv.slots.includes(null) : inv.room(x.it.k) < x.it.n) { g.toast('No room in your pack', '#ff9a8a'); g.audio.play('error', 0.5); return; }
    inv.coins -= x.price; this.sold.splice(i, 1);
    const left = inv.add(x.it); if (left) g.dropItem({ ...x.it, n: left });
    g.audio.play('coin'); inv.touch();
  }
  /** Sell a stack from the pack. Rare and boss-summoning items ask for a second shift-click first. */
  private sell(v: View): boolean {
    const g = this.g, inv = g.inv, s = v.arr[v.i]!, d = item(s.k);
    const precious = itemRarity(s) >= 4 || !!d.use?.startsWith('summon') || d.use === 'recall';
    if (precious && !(this.sellConfirm && this.sellConfirm.v === v && performance.now() - this.sellConfirm.t < 2500)) {
      this.sellConfirm = { v, t: performance.now() }; g.toast('Shift-click again to sell ' + itemName(s), '#ffd9a0'); g.audio.play('click', 0.4); return false;
    }
    this.sellConfirm = null;
    const val = sellPrice(s.k) * s.n;
    inv.coins += val; v.arr[v.i] = null; g.audio.play('coin');
    this.sold.push({ it: { ...s }, price: val }); if (this.sold.length > 8) this.sold.shift();
    g.toast(`Sold ${itemName(s)}${s.n > 1 ? ' x' + s.n : ''} for ${val} coins`, '#f2c14e');
    return true;
  }

  // ---- interaction ----
  private accepts(v: View, it: Item): boolean {
    const d = item(it.k);
    switch (v.kind) {
      case 'armor': return !!d.armor && d.armor.slot === v.i;
      case 'acc': if (!d.acc) return false; for (let i = 0; i < 5; i++) { const a = this.g.inv.acc[i]; if (a && i !== v.i && a.k === it.k) return false; } return true;
      case 'fin': return this.smeltable(it.k);
      case 'ffuel': return !!d.fuel;
      case 'out': case 'fout': return false;
      default: return true;
    }
  }
  /** Can this forge smelt the item (at its own level)? */
  private smeltable(k: string): boolean {
    const lv = this.forge ? (this.forge.data.level as number) : 99;
    for (const q of SMELTS) if (q.forge <= lv && matches(q.in, k)) return true;
    return false;
  }
  /** Why `accepts(v, it)` said no, for a toast; '' when there is nothing useful to say. */
  private refusal(kind: Kind, it: Item): string {
    if (kind === 'acc' && item(it.k).acc) return 'Already wearing one: a second adds nothing';
    if (kind === 'ffuel') return 'That does not burn';
    if (kind === 'fin') {
      const q = SMELTS.find((q) => matches(q.in, it.k));
      if (!q) return 'That cannot be smelted';
      return 'Needs a ' + (BLOCKS.find((b) => b.use === 'forge' + q.forge)?.name ?? 'hotter forge');
    }
    return '';
  }
  /** Put the cursor stack (or one item of it) into a view. Returns false when nothing changed. */
  private place(v: View, right: boolean): boolean {
    const inv = this.g.inv, c = inv.cursor;
    if (!c || !this.accepts(v, c)) return false;
    const s = v.arr[v.i], d = item(c.k), single = v.kind === 'armor' || v.kind === 'acc';
    if (!s) {
      if (right || (single && c.n > 1)) { v.arr[v.i] = { k: c.k, n: 1, m: c.m }; c.n--; } else { v.arr[v.i] = c; inv.cursor = null; }
    } else if (s.k === c.k && !s.m && !c.m && d.stack > 1 && !single) {
      const mv = Math.min(right ? 1 : c.n, d.stack - s.n);
      if (mv <= 0) return false;
      s.n += mv; c.n -= mv;
    } else if (!right && !(single && c.n > 1) && this.acceptsBack(v, s)) { v.arr[v.i] = c; inv.cursor = s; }
    else return false;
    if (inv.cursor && inv.cursor.n <= 0) inv.cursor = null;
    if (single) this.g.audio.play('dig_cloth', 0.6);
    this.afterEdit(v);
    return true;
  }
  private acceptsBack(_v: View, _s: Item): boolean { return true; }
  /** Any edit made while a container is open may have moved items into it (shift-click from the
   *  inventory passes the inventory view), so always flag the container's chunk for saving. */
  private afterEdit(_v?: View): void {
    this.markContainer();
    this.g.inv.touch();
  }
  private markContainer(): void {
    const g = this.g;
    if (this.forge) { this.forge.data.rev++; g.markEntDirty(this.forge); }
    if (this.chest) g.markChestDirty();
  }
  private down(v: View, e: MouseEvent): void {
    const g = this.g, inv = g.inv, right = e.button === 2;
    if (v.kind === 'out') { this.takeOutput(e.shiftKey); return; }
    const s = v.arr[v.i];
    if (e.shiftKey && s) { this.quickMove(v); return; }
    // second click of a double-click on the slot just emptied: gather matching items into the cursor
    const dbl = !right && this.lastV === v && performance.now() - this.lastT < 320;
    this.lastV = v; this.lastT = performance.now();
    if (dbl && inv.cursor && !s && this.gather()) { this.lastV = null; g.audio.play('click', 0.5); inv.touch(); return; }
    if (!inv.cursor) {
      if (!s) return;
      if (right && s.n > 1 && v.kind !== 'fout') { const half = Math.ceil(s.n / 2); inv.cursor = { k: s.k, n: half, m: s.m }; s.n -= half; }
      else { inv.cursor = s; v.arr[v.i] = null; }
      this.dragFrom = v; g.audio.play('click', 0.5);
      this.afterEdit(v);
    } else if (this.place(v, right)) { g.audio.play('click', 0.5); if (right) this.dragSet = new Set([v]); }
    else { const why = this.refusal(v.kind, inv.cursor); if (why) g.toast(why, '#ff9a8a'); g.audio.play('error', 0.4); }
  }
  /** Pull matching unmodified items from the pack (and open chest) into the cursor, partial stacks first. */
  private gather(): boolean {
    const c = this.g.inv.cursor!, d = item(c.k);
    if (c.m || d.stack <= 1 || c.n >= d.stack) return false;
    const before = c.n;
    for (let pass = 0; pass < 2; pass++) for (let a = 0; a < 2; a++) {
      const arr = a === 0 ? this.g.inv.slots : this.chest;
      if (!arr) continue;
      for (let i = 0; i < arr.length && c.n < d.stack; i++) {
        const t = arr[i];
        if (!t || t.k !== c.k || t.m || (pass === 0 && t.n >= d.stack)) continue;
        const mv = Math.min(t.n, d.stack - c.n); c.n += mv; t.n -= mv; if (t.n <= 0) arr[i] = null;
      }
    }
    if (c.n !== before) this.markContainer();
    return c.n !== before;
  }
  /** Keys while a window is open: 1-9 swap the hovered slot with that hotbar slot, Q drops from it. */
  key(code: string, e: KeyboardEvent): boolean {
    if (code.length === 6 && code.startsWith('Digit') && code !== 'Digit0') { this.hotkey(code.charCodeAt(5) - 49); return true; }
    if (code === 'KeyQ') { this.dropHover(e.ctrlKey || e.metaKey); return true; }
    return false;
  }
  private hotkey(i: number): void {
    const g = this.g, inv = g.inv, v = this.hover;
    if (!v || v.kind === 'out' || (v.arr === inv.slots && v.i === i)) return;
    const a = v.arr[v.i], b = inv.slots[i];
    if (!a && !b) return;
    const single = v.kind === 'armor' || v.kind === 'acc';
    if (b && (!this.accepts(v, b) || v.kind === 'fout' || (single && b.n > 1))) { const why = this.refusal(v.kind, b); if (why) g.toast(why, '#ff9a8a'); g.audio.play('error', 0.4); return; }
    v.arr[v.i] = b; inv.slots[i] = a;
    g.audio.play(single ? 'dig_cloth' : 'click', 0.5);
    this.afterEdit(v);
  }
  private dropHover(all: boolean): void {
    const g = this.g, v = this.hover;
    if (g.inv.cursor) { this.dropCursor(); g.audio.play('click', 0.4); return; }
    if (!v || v.kind === 'out') return;
    const s = v.arr[v.i];
    if (!s) return;
    const n = all ? s.n : 1;
    g.dropItem({ k: s.k, n, m: s.m });
    s.n -= n; if (s.n <= 0) v.arr[v.i] = null;
    g.audio.play('click', 0.4);
    this.afterEdit(v);
  }
  private takeOutput(all: boolean): void {
    const g = this.g, inv = g.inv;
    let made = 0;
    for (let guard = 0; guard < 99; guard++) {
      const grid = this.gridW === 2 ? inv.craft.slice(0, 4) : inv.craft;
      const r = matchRecipe(grid, this.gridW, this.station);
      if (!r) break;
      const d = item(r.out);
      if (!all) {
        const c = inv.cursor;
        if (c && (c.k !== r.out || c.m || d.stack === 1 || c.n + r.n > d.stack)) break;
        const out = takeCraft(r, inv.craft, Math.random, this.gridW * this.gridW);
        if (c) c.n += out.n; else inv.cursor = out;
        made += out.n; g.onCrafted(r.out, out.n);
        break;
      }
      if (inv.room(r.out) < r.n) { if (!made) g.toast('No room in your pack', '#ff9a8a'); break; }
      const out = takeCraft(r, inv.craft, Math.random, this.gridW * this.gridW), left = inv.add(out);
      if (left) g.dropItem({ ...out, n: left });
      made += out.n; g.onCrafted(r.out, out.n);
    }
    if (made) g.audio.play('craft'); else g.audio.play('error', 0.5);
    inv.touch();
  }
  private quickMove(v: View): void {
    const g = this.g, inv = g.inv, s = v.arr[v.i]!, d = item(s.k);
    const into = (arr: Slot[], from: number, to: number): void => this.moveInto(v.arr, v.i, arr, from, to);
    if (v.kind === 'inv') {
      if (this.shop) { if (!this.sell(v)) return; }
      else if (this.chest) into(this.chest, 0, 27);
      else if (this.forge) {
        const fs = this.forge.data.s as Slot[];
        if (this.smeltable(s.k)) into(fs, 0, 1);
        else if (d.fuel) into(fs, 1, 2);
        else { g.toast(this.refusal('fin', s), '#ff9a8a'); g.audio.play('error', 0.4); return; }
      }
      else if (d.armor) { const cur = inv.armor[d.armor.slot]; inv.armor[d.armor.slot] = s; v.arr[v.i] = cur; g.audio.play('dig_cloth', 0.6); }
      else if (d.acc && inv.acc.some((a) => a && a.k === s.k)) { g.toast('Already wearing one: a second adds nothing', '#ff9a8a'); g.audio.play('error', 0.4); return; }
      else if (d.acc && inv.acc.includes(null)) { inv.acc[inv.acc.indexOf(null)] = s; v.arr[v.i] = null; g.audio.play('dig_cloth', 0.6); }
      else if (v.i < 9) into(inv.slots, 9, 36); else into(inv.slots, 0, 9);
    } else {
      const left = inv.add(s);
      if (left) s.n = left; else v.arr[v.i] = null;
    }
    g.audio.play('click', 0.5);
    this.afterEdit(v);
  }

  // ---- tooltips ----
  private showTip(html: string): void { this.tip.innerHTML = html; this.tip.style.display = 'block'; this.moveTip(); }
  private hideTip(): void { this.tip.style.display = 'none'; }
  private moveTip(): void {
    if (this.tip.style.display === 'none') return;
    const w = this.tip.offsetWidth, h = this.tip.offsetHeight;
    let x = this.mx + 18, y = this.my + 14;
    if (x + w > window.innerWidth - 6) x = this.mx - w - 12;
    if (y + h > window.innerHeight - 6) y = window.innerHeight - h - 6;
    this.tip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  }
  /** The held weapon's modifier is already folded into the player's totals; take it out to judge another weapon. */
  private heldMod(key: string): number {
    const h = this.g.inv.held();
    if (!h || !h.m || !item(h.k).weapon) return 0;
    return (MOD_BY_KEY.get(h.m)?.stats as Record<string, number> | undefined)?.[key] ?? 0;
  }
  /** [damage per hit, damage per second] for a weapon stack as if it were held. */
  private weaponNums(s: Item): [number, number] {
    const wpn = item(s.k).weapon!, d = this.g.stats.d as Record<string, number>, ms = (s.m ? MOD_BY_KEY.get(s.m)?.stats : undefined) as Record<string, number> | undefined;
    const mult = 1 + d[wpn.style] + d.dmg - this.heldMod(wpn.style) - this.heldMod('dmg') + (ms?.[wpn.style] ?? 0) + (ms?.dmg ?? 0);
    const rate = wpn.rate * (1 + d.atkSpeed - this.heldMod('atkSpeed') + (ms?.atkSpeed ?? 0));
    return [Math.round(wpn.dmg * mult), Math.round(wpn.dmg * mult * rate)];
  }
  /** Stat differences between a candidate and what is worn or held, as tooltip lines. */
  private compare(s: Item, v: View | undefined): string {
    const inv = this.g.inv, d = item(s.k);
    let other: Slot = null, h = '';
    if (d.armor && v?.kind !== 'armor') {
      other = inv.armor[d.armor.slot];
      if (!other) return `<div class="ty" style="margin-top:4px">${['Head', 'Body', 'Legs'][d.armor.slot]} slot is empty</div>`;
      const set = d.armor.set, os = item(other.k).armor?.set;
      let worn = 0; for (const a of inv.armor) if (a && item(a.k).armor?.set === set) worn++;
      const after = worn - (os === set ? 1 : 0) + 1;
      if (worn < 3 && after >= 3) h += `<div class="st">Completes set: ${esc(setBonus(set)?.text ?? '')}</div>`;
      if (os && os !== set && this.g.stats.sets.includes(os)) h += `<div class="bd">Breaks set: ${esc(setBonus(os)?.text ?? '')}</div>`;
    } else if (d.weapon && !d.weapon.minion && !d.tool) {
      const held = inv.held();
      if (held && held !== s && v?.arr[v.i] !== held && item(held.k).weapon?.style === d.weapon.style) {
        other = held;
        const a = this.weaponNums(s), b = this.weaponNums(held), dd = a[0] - b[0], dp = a[1] - b[1];
        if (dd) h += `<div class="${dd > 0 ? 'gd' : 'bd'}">${dd > 0 ? '+' : ''}${dd} damage</div>`;
        if (dp) h += `<div class="${dp > 0 ? 'gd' : 'bd'}">${dp > 0 ? '+' : ''}${dp} damage per second</div>`;
      }
    } else if (d.acc && v?.kind !== 'acc') {
      for (const a of inv.acc) if (a && a.k === s.k) return `<div class="bd" style="margin-top:4px">Already worn: a second one adds nothing</div>`;
      return '';
    }
    if (!other) return h;
    gearStats(s, SA); gearStats(other, SB);
    for (const k in STAT_TEXT) {
      const x = (SA[k] ?? 0) - (SB[k] ?? 0);
      if (Math.abs(x) < 1e-6) continue;
      const t = STAT_TEXT[k], txt = t[1] ? `${x > 0 ? '+' : ''}${Math.round(x * 100)}%` : `${x > 0 ? '+' : ''}${Math.round(x * 10) / 10}`;
      h += `<div class="${x > 0 ? 'gd' : 'bd'}">${txt} ${t[0]}</div>`;
    }
    return `<div class="ty" style="margin:4px 0 0">Compared with ${esc(itemName(other))}</div>` + (h || '<div class="ln">No difference</div>');
  }
  /** What shift-click and right-click do on this slot right now. */
  private clickHint(s: Item, v: View): string {
    const d = item(s.k);
    let sh = '';
    if (v.kind === 'inv') {
      if (this.shop) sh = `sell stack for ${sellPrice(s.k) * s.n} coins`;
      else if (this.chest) sh = 'move to chest';
      else if (this.forge) sh = this.smeltable(s.k) || d.fuel ? 'load into forge' : '';
      else if (d.armor || d.acc) sh = 'equip';
      else sh = v.i < 9 ? 'move to backpack' : 'move to hotbar';
    } else if (v.kind !== 'out') sh = 'take';
    const parts: string[] = [];
    if (sh) parts.push('Shift-click: ' + sh);
    if (s.n > 1 && v.kind !== 'fout' && v.kind !== 'out') parts.push('Right-click: take half');
    return parts.length ? `<div class="hint">${parts.join(' · ')}</div>` : '';
  }
  itemTip(s: Item, ctx: 'slot' | 'buy' | 'recipe' = 'slot', v?: View): string {
    const g = this.g, d = item(s.k), r = itemRarity(s);
    const kind = d.weapon && !d.tool ? STYLE_INFO[d.weapon.style].label + ' weapon' : d.tool ? 'Tool' : d.armor ? 'Armour' : d.acc ? 'Trinket' : d.food ? 'Food' : d.block !== undefined ? 'Block' : d.use ? 'Usable' : 'Material';
    let h = `<div class="nm" style="color:${RARITY[r].color}">${esc(itemName(s))}</div><div class="ty">${RARITY[r].name} · ${kind}</div>`;
    if (d.weapon) {
      const wpn = d.weapon, [dmg, dps] = this.weaponNums(s);
      h += `<div class="ln">${dmg} ${wpn.style} damage${wpn.minion ? ' per hit' : ''}</div>`;
      if (!wpn.minion) h += `<div class="ln">${wpn.rate.toFixed(1)} attacks per second · ${dps} damage per second</div>`;
      if (wpn.mana) h += `<div class="ln">Uses ${wpn.mana} mana</div>`;
      if (wpn.ammo) h += `<div class="ln">Uses arrows</div>`;
    }
    if (d.tool) h += `<div class="ln">Mining power ${d.tool.power} · speed ${d.tool.speed}</div>`;
    if (d.ammoDmg) h += `<div class="ln">+${d.ammoDmg} arrow damage</div>`;
    h += statLines(d.stats);
    if (s.m) h += statLines(MOD_BY_KEY.get(s.m)!.stats);
    if (d.armor) {
      const b = setBonus(d.armor.set), n = g.inv.armor.filter((a) => a && item(a.k).armor?.set === d.armor!.set).length;
      if (b) h += `<div class="${n >= 3 ? 'st' : 'st off'}">Set (${n}/3): ${b.text}</div>`;
    }
    if (d.food) h += `<div class="ln">Restores ${d.food} hunger</div>`;
    if (d.heal) h += `<div class="ln">Restores ${d.heal} health</div>`;
    if (d.restoreMana) h += `<div class="ln">Restores ${d.restoreMana} mana</div>`;
    if (d.fuel) h += `<div class="ln">Fuel: burns ${d.fuel}s</div>`;
    if (d.block !== undefined && BLOCKS[d.block].light) h += `<div class="ln">Gives off light</div>`;
    if (d.desc) h += `<div class="ds">${esc(d.desc)}</div>`;
    else if (kind === 'Material' && ctx !== 'recipe') { const src = sourceOf(s.k); if (src) h += `<div class="src" style="margin:4px 0 0">${esc(src)}</div>`; }
    h += this.compare(s, v);
    if (this.shop && ctx === 'slot' && v?.kind === 'inv') h += `<div class="ty" style="margin-top:4px">Sells for ${sellPrice(s.k)} coins${s.n > 1 ? ` each (${sellPrice(s.k) * s.n} for the stack)` : ''}</div>`;
    if (ctx === 'slot' && v) h += this.clickHint(s, v);
    return h;
  }
  private recipeTip(r: Recipe): string {
    const g = this.g, d = item(r.out);
    let h = `<div class="nm" style="color:${RARITY[d.rarity].color}">${esc(d.name)}${r.n > 1 ? ' x' + r.n : ''}</div><div class="ty">${r.station === 'hand' ? 'Craft anywhere' : 'Made at: ' + STATION_NAMES[r.station]}</div>`;
    for (const [want, n] of needs(r)) {
      let have = g.inv.count(want);
      for (const s of g.inv.craft) if (s && matches(want, s.k)) have += s.n;
      const name = want[0] === '#' ? 'Any ' + want.slice(1) : item(want).name;
      h += `<div class="${have >= n ? 'gd' : 'bd'}">${n} × ${esc(name)} <span style="color:#6a7088">(${have})</span></div>`;
      if (have < n) { const src = sourceOf(want); if (src) h += `<div class="src">${esc(src)}</div>`; }
    }
    let most = Infinity;
    for (const [want, n] of needs(r)) { let have = g.inv.count(want); for (const c of g.inv.craft) if (c && matches(want, c.k)) have += c.n; most = Math.min(most, Math.floor(have / n)); }
    if (most > 0 && most < Infinity) h += `<div class="ln" style="margin-top:2px">Makes up to ${most * r.n}</div>`;
    return h + this.itemTip({ k: r.out, n: 1 }, 'recipe').replace(/^<div class="nm".*?<\/div><div class="ty">.*?<\/div>/, '<div style="height:4px"></div>');
  }
}
