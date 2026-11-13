// The shop (section 6): what one householder sells under the Buy tab, what was sold to them this visit under Sell
// back, and the pack to sell from. A row buys
// one, Shift and a press buys ten; Shift and a press on a pack slot sells the stack, and a thing worth keeping asks
// for the same press again within two and a half seconds.
import { count, measure, rightX } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { Node, TipLine, Ui } from '../node';
import { GRADES } from '../palette';
import { ring, sunk } from '../parts/common';
import { type TabSpec, tabbedSlab } from '../parts/tabs';
import { ROW_H, TRACK_W, paintThumb } from '../parts/well';
import { type Stack, stackGrade, stackName, stackTip, thing } from '../sample/play-items';
import { Bench, overWorld, packBlock, place } from './play/common';
import { Hand, store } from './play/hand';
import type { NamedScreen } from './index';

interface Good { key: string; price: number; mod?: string }

interface Keeper {
  name: string;
  says: string;
  /** Mūda, when the Deserter deals; lees otherwise. */
  token: boolean;
  goods: Good[];
  lees: number;
  muda: number;
  sold: (Good & { n: number })[];
}

const KEEPERS: Record<string, Keeper> = {
  shop: {
    name: 'Kammār', says: 'Iron lifts with a stone pick, and Hīrak does not.',
    token: false, lees: 12, muda: 0,
    goods: [
      { key: 'iron_bar', price: 14 }, { key: 'coal', price: 4 }, { key: 'barbed_arrow', price: 3 }, { key: 'iron_bracer', price: 90 },
      { key: 'gold_bar', price: 40 }, { key: 'lantern', price: 12 }, { key: 'cinder_bar', price: 70 }, { key: 'umbrite_bar', price: 140 },
    ],
    sold: [{ key: 'stone_sword', price: 3, n: 1 }],
  },
  'shop-deserter': {
    name: 'Deserter', says: 'I marched with them. I will not again.',
    token: true, lees: 1240, muda: 38,
    goods: [
      { key: 'shadow_cloak', price: 30 }, { key: 'duelists_sigil', price: 45 }, { key: 'greater_salve', price: 3 },
      { key: 'heart_locket', price: 12 }, { key: 'gale_emblem', price: 50 },
    ],
    sold: [],
  },
};

interface State { k: Keeper; hand: Hand; bench: Bench | null; pending: { id: string; t: number } | null; tab: number }
const states = new Map<string, State>();

function open(id: string): State {
  let st = states.get(id);
  if (st) return st;
  const k = KEEPERS[id];
  const hand = new Hand({
    pack: store(27, {
      0: { key: 'iron_ore', n: 31 }, 1: { key: 'coal', n: 12 }, 2: { key: 'hide', n: 7 }, 3: { key: 'bone', n: 14 },
      4: { key: 'chitin', n: 5 }, 5: { key: 'cinder_sword', n: 1, mod: 'blessed' }, 9: { key: 'verdant_idol', n: 1 },
      10: { key: 'gel', n: 9 }, 11: { key: 'feather', n: 20 }, 18: { key: 'iron_melee_2', n: 1, mod: 'brittle' },
    }),
    bar: store(9, { 0: { key: 'iron_pickaxe', n: 1 }, 1: { key: 'iron_sword', n: 1 }, 2: { key: 'iron_bow', n: 1 }, 3: { key: 'arrow', n: 28 }, 6: { key: 'salve', n: 2 }, 7: { key: 'recall_stone', n: 1 } }),
  }, { route: (p) => [p.store === 'pack' ? 'bar' : 'pack'] });
  st = { k: { ...k, sold: k.sold.map((s) => ({ ...s })) }, hand, bench: null, pending: null, tab: 0 };
  states.set(id, st);
  return st;
}

/** What the householder gives for one: half the price they ask, or a little by grade for what they do not stock. */
function worth(k: Keeper, s: Stack): number {
  const g = k.goods.find((x) => x.key === s.key);
  if (g) return Math.max(1, Math.floor(g.price / 2));
  return [1, 3, 8, 20, 45, 90, 200][stackGrade(s)];
}

/** A thing of grade Island or higher, a bait or a Recall Stone asks for a second press before it is sold. */
function precious(s: Stack): boolean {
  const t = thing(s.key);
  return stackGrade(s) >= 4 || t.kind === 'bait' || s.key === 'recall_stone';
}

function purse(k: Keeper): number { return k.token ? k.muda : k.lees; }
function priceText(k: Keeper, n: number): string { return k.token ? `${count(n)} {muda}` : `${count(n)} {lees}`; }

function buy(st: State, g: Good, n: number, fromSold: boolean): boolean {
  const k = st.k;
  let bought = 0;
  for (let i = 0; i < n; i++) {
    if (purse(k) < g.price) break;
    if (st.hand.into({ key: g.key, n: 1, mod: g.mod }, ['pack', 'bar'])) break;
    if (k.token) k.muda -= g.price; else k.lees -= g.price;
    bought++;
    if (fromSold) {
      const s = k.sold.find((x) => x.key === g.key && x.mod === g.mod);
      if (s && --s.n <= 0) k.sold.splice(k.sold.indexOf(s), 1);
      if (!s || s.n <= 0) break;
    }
  }
  return bought > 0;
}

interface Row { id: string; good: Good; sold?: boolean; n?: number }

/** Rows the well shows at once. */
const WELL_ROWS = 6;

/**
 * The shop's well: rows 18 tall, the price at the right with its mark. Under Sell back each row is a thing sold this
 * visit, at what was paid for it and with the turned arrow before the price.
 */
function goodsWell(st: State, ui: Ui): Node {
  const k = st.k, b = st.bench!;
  const rows: Row[] = st.tab === 1
    ? k.sold.map((s) => ({ id: `shop.sold.${s.key}.${s.mod ?? ''}`, good: s, sold: true, n: s.n }))
    : k.goods.map((g) => ({ id: `shop.good.${g.key}`, good: g }));
  const w = 160, h = WELL_ROWS * ROW_H + 2, fw = w - 2, fh = h - 2;
  const fits = rows.length * ROW_H <= fh;
  const rw = fits ? fw : fw - TRACK_W;
  const visible = Math.floor(fh / ROW_H);
  const maxTop = Math.max(0, rows.length - visible);
  const top = Math.min(maxTop, Math.max(0, ui.scroll('shop.well')));
  const setTop = (v: number) => ui.setScroll('shop.well', Math.min(maxTop, Math.max(0, v)));
  const kids: Node[] = rows.map((r, i): Node => {
    const y = (i - top) * ROW_H;
    const g = r.good;
    const can = purse(k) >= g.price;
    const st0: Stack = { key: g.key, n: 1, mod: g.mod };
    return {
      id: r.id, x: 0, y, w: rw, h: ROW_H, takes: true, focus: true,
      anim: b.refused(r.id),
      paint: (s, live) => {
        if (b.refused(r.id)) ring(s, 0, 0, rw, ROW_H, 'blood');
        else if (live.hover && can) s.fill(0, 0, rw, ROW_H, 'root.2');
        if (live.focus) ring(s, 0, 0, rw, ROW_H, 'salt');
        s.icon(thing(g.key).icon, 1, 1, can ? 'full' : 'flat', 'root.4');
        const price = (r.sold ? '{back} ' : '') + priceText(k, g.price);
        const px = rightX(price, rw - 3);
        s.text(price, px, 4, can ? 'salt' : 'blood.lt', true);
        let name = stackName(st0);
        if (r.n && r.n > 1) name += ` (${r.n})`;
        s.text(cut(name, px - 5 - 20), 20, 4, can ? GRADES[stackGrade(st0)].dark : 'root.4', true);
      },
      tip: () => {
        const extra: TipLine[] = [{ text: can ? `${priceText(k, g.price)} each` : `${priceText(k, g.price)}: you carry ${count(purse(k))}`, c: can ? 'growth.lt' : 'blood.lt' }];
        return stackTip(st0, r.sold ? '{lmb} buy one back   Shift {lmb} buy ten back' : '{lmb} buy one   Shift {lmb} buy ten', extra);
      },
      on: {
        down: (e) => {
          if (e.button !== 0) return;
          if (!buy(st, g, e.shift ? 10 : 1, !!r.sold)) b.refuse(r.id); else ui.cue('take');
          b.after();
        },
        key: (e) => {
          if (e.key === 'Enter') { if (!buy(st, g, 1, !!r.sold)) b.refuse(r.id); b.after(); return true; }
          return false;
        },
        wheel: (e) => { setTop(top + e.notches); return true; },
      },
    };
  });
  if (!fits) {
    const thumbH = Math.max(12, Math.floor((fh * visible) / rows.length));
    const thumbY = maxTop ? Math.round(((fh - thumbH) * top) / maxTop) : 0;
    let from = top;
    kids.push({
      id: 'shop.track', x: rw, y: 0, w: TRACK_W, h: fh, takes: true,
      paint: (s, live) => { s.fill(0, 0, TRACK_W, fh, 'root.0'); paintThumb(s, 0, thumbY, thumbH, live.hover || live.down); },
      on: {
        down: (e) => { from = top; if (e.y < thumbY) setTop(top - visible); else if (e.y >= thumbY + thumbH) setTop(top + visible); },
        drag: (e) => { if (e.phase !== 'end' && fh > thumbH) setTop(from + Math.round((e.dy * maxTop) / (fh - thumbH))); },
        wheel: (e) => { setTop(top + e.notches); return true; },
      },
    });
  }
  if (!rows.length) {
    kids.push({ x: 0, y: 0, w: fw, h: fh, paint: (s) => {
      const t = box('Nothing sold yet. Shift {lmb} a thing in the pack to sell it.', fw - 12, 3);
      for (const l of t.lines) s.text(l.text, 6, 5 + l.y, 'root.4', true);
    } });
  }
  return {
    id: 'shop.wellbox', x: 8, y: 18, w, h,
    paint: (s) => sunk(s, 0, 0, w, h, 'clay'),
    on: { wheel: (e) => { setTop(top + e.notches); return true; } },
    kids: [{ x: 1, y: 1, w: fw, h: fh, clip: true, kids }],
  };
}

function sell(st: State, store: string, i: number): void {
  const b = st.bench!, h = st.hand, k = st.k;
  const s = h.stores[store][i];
  if (!s) return;
  const id = `${store}.${i}`;
  if (precious(s) && !(st.pending && st.pending.id === id && b.ui.t - st.pending.t < 2.5)) {
    st.pending = { id, t: b.ui.t };
    b.refuse(id);
    return;
  }
  st.pending = null;
  const gain = worth(k, s) * s.n;
  k.lees += gain;
  const same = k.sold.find((x) => x.key === s.key && x.mod === s.mod);
  if (same) same.n += s.n; else k.sold.unshift({ key: s.key, mod: s.mod, n: s.n, price: worth(k, s) });
  h.stores[store][i] = null;
  b.ui.cue('put');
}

const SLAB_W = 176, SLAB_H = 227;

function build(ui: Ui, id: string): Node {
  const st = open(id);
  if (!st.bench || st.bench.ui !== ui) st.bench = new Bench(st.hand, ui);
  const b = st.bench, k = st.k;
  // Only what this keeper takes is shown, so the purse and every price carry the same mark.
  const purseText = k.token ? `${count(k.muda)} {muda}` : `${count(k.lees)} {lees}`;
  const main: Node[] = [
    { x: rightX(purseText, 168), y: 6, w: measure(purseText), h: 10, paint: (s) => { s.text(purseText, 0, 0, 'ink'); } },
    { x: 8, y: 6, w: measure(k.name) + 1, h: 10, takes: true, tip: () => ({ lines: [{ text: k.name, c: 'salt' }, { text: k.says, c: 'root.4' }], delay: 0.4 }) },
    goodsWell(st, ui),
    ...packBlock(b, 'clay', 132, 143, {
      each: (store, i) => {
        const s = st.hand.stores[store][i];
        const asking = !!st.pending && st.pending.id === `${store}.${i}` && ui.t - st.pending.t < 2.5;
        return {
          press: (e) => { if (e.shift && e.button === 0) { sell(st, store, i); return true; } return false; },
          extra: s ? [{ text: asking ? 'Again to sell' : `Sells for ${priceText({ ...k, token: false }, worth(k, s) * s.n)}`, c: asking ? 'blood.lt' : 'root.4' }] : [],
          hint: s ? '{lmb} take   Shift {lmb} sell' : undefined,
        };
      },
    }),
  ];
  const tabs: TabSpec[] = [
    { id: 'shop.tab.buy', icon: thing(k.goods[0].key).icon, name: 'Buy' },
    { id: 'shop.tab.back', icon: k.sold[0] ? thing(k.sold[0].key).icon : 'pack', name: 'Sell back' },
  ];
  const win = place(ui, SLAB_W, SLAB_H);
  return overWorld(ui, win, [tabbedSlab({
    id: 'shop.slab', x: 0, y: 0, w: SLAB_W, h: SLAB_H, ramp: 'clay', title: k.name, titleRoom: measure(purseText) + 8, kids: main,
    edge: 'left', tabs, chosen: st.tab, onTab: (i) => { st.tab = i; ui.cue('tab'); ui.invalidate(); },
  })], {
    outside: () => { st.hand.dropHeld(); b.after(); },
  });
}

export const SCREENS: NamedScreen[] = [
  { name: 'shop', title: 'Shop: Kammār', world: true, build: (ui) => build(ui, 'shop') },
  { name: 'shop-deserter', title: 'Shop: the Deserter', world: true, build: (ui) => build(ui, 'shop-deserter') },
];
