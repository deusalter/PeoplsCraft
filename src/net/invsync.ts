// The inventory channel on both ends. The host turns what it holds into `InvWire` and `BoxWire`; the
// client keeps the last of those it was sent (the base), the ops it sent that the host has not yet
// acknowledged (pending), and a view: the live Inventory, stats and container the HUD and the
// windows read. Every `st` resets the view to the base and plays the pending ops over it again, so a
// refused op is undone within one round trip and an accepted one never flickers. No DOM: a bot uses
// this file as the browser does.
import { hashInt, mulberry32 } from '../core/noise';
import type { Item } from '../data/items';
import { type Inventory, type Slot, assignWire } from '../sim/inventory';
import { type InvOp, type OpResult, type OpState, applyOp } from '../sim/invops';
import type { PlayerStats } from '../sim/stats';
import { type BoxWire, type InvWire, type S2COf, type SlotWire, type WireOp, slotWire, wireSlot } from './protocol';

// ---- the wire forms, built from what the host holds ---------------------------------------------

export function invWire(inv: Inventory, stats: PlayerStats, seed: number): InvWire {
  const a = stats.attr;
  return {
    s: inv.slots.map(slotWire), a: inv.armor.map(slotWire), c: inv.acc.map(slotWire), g: inv.craft.map(slotWire), cur: slotWire(inv.cursor),
    sel: inv.sel, coins: inv.coins, seed, attr: [a.str, a.agi, a.vit, a.arc], pts: stats.points,
  };
}
/** What a forge holds besides its slots. The view's `data` has this shape, which is the shape the forge window reads. */
export interface ForgeData { s: Slot[]; burn: number; burnMax: number; prog: number; need: number; level: number; rev: number }
export interface Sold { id: number; it: Item; price: number }
export const chestWire = (x: number, y: number, z: number, s: readonly Slot[]): BoxWire => ({ kind: 'chest', x, y, z, s: s.map(slotWire) });
export const forgeWire = (x: number, y: number, z: number, d: Omit<ForgeData, 'rev'>): BoxWire =>
  ({ kind: 'forge', x, y, z, s: d.s.map(slotWire), burn: d.burn, burnMax: d.burnMax, prog: d.prog, need: d.need, level: d.level });
export const shopWire = (npc: string, sold: readonly Sold[]): BoxWire => ({ kind: 'shop', npc, sold: sold.map((x) => [x.id, slotWire(x.it), x.price]) });

// ---- the client's container -----------------------------------------------------------------------

/** The open container as the client holds it. One object per open container: windows keep its arrays. */
export type ViewBox =
  | { kind: 'chest'; x: number; y: number; z: number; s: Slot[] }
  | { kind: 'forge'; x: number; y: number; z: number; data: ForgeData }
  | { kind: 'shop'; npc: string; sold: Sold[] };

const sameCell = (v: ViewBox, w: BoxWire): boolean => v.kind === w.kind && (v.kind === 'shop' ? v.npc === (w as { npc: string }).npc
  : v.x === (w as { x: number }).x && v.y === (w as { y: number }).y && v.z === (w as { z: number }).z);
const putSlots = (dst: Slot[], src: readonly SlotWire[]): void => { for (let i = 0; i < dst.length; i++) dst[i] = wireSlot(src[i] ?? 0); };
const soldOf = (w: [number, SlotWire, number][]): Sold[] => { const out: Sold[] = []; for (const [id, it, price] of w) { const s = wireSlot(it); if (s) out.push({ id, it: s, price }); } return out; };

/** The view of `w`: `v` itself, written in place, when it is the same container; a new object for another one; null for none. */
export function assignBox(v: ViewBox | null, w: BoxWire | null): ViewBox | null {
  if (!w) return null;
  if (v && sameCell(v, w)) {
    if (v.kind === 'chest' && w.kind === 'chest') putSlots(v.s, w.s);
    else if (v.kind === 'forge' && w.kind === 'forge') { const d = v.data; putSlots(d.s, w.s); d.burn = w.burn; d.burnMax = w.burnMax; d.prog = w.prog; d.need = w.need; d.level = w.level; }
    else if (v.kind === 'shop' && w.kind === 'shop') { v.sold.length = 0; v.sold.push(...soldOf(w.sold)); }
    return v;
  }
  if (w.kind === 'chest') { const s: Slot[] = new Array(27).fill(null); putSlots(s, w.s); return { kind: 'chest', x: w.x, y: w.y, z: w.z, s }; }
  if (w.kind === 'forge') {
    const s: Slot[] = [null, null, null]; putSlots(s, w.s);
    return { kind: 'forge', x: w.x, y: w.y, z: w.z, data: { s, burn: w.burn, burnMax: w.burnMax, prog: w.prog, need: w.need, level: w.level, rev: 0 } };
  }
  return { kind: 'shop', npc: w.npc, sold: soldOf(w.sold) };
}
/** The container as `applyOp` addresses it. A shop is not one. */
export const opBox = (v: ViewBox | null): OpState['box'] =>
  !v || v.kind === 'shop' ? null : v.kind === 'chest' ? { kind: 'chest', s: v.s } : { kind: 'forge', s: v.data.s, level: v.data.level };

// ---- reconcile ------------------------------------------------------------------------------------

export type Win = NonNullable<OpState['window']>;
/** A window as the host holds it, without the shop's list (that is the box's). */
type BaseWin = Omit<Win, 'sold'>;
/** Prediction-only: a station the client opened under the `seq` of its `use`. */
type WinOp = { o: '_win'; w: BaseWin };
interface Entry { seq: number; op: InvOp | WinOp }

/** What the channel needs from its owner. */
export interface SyncHost {
  /** Put the op on the wire under `seq`. */
  send(seq: number, op: WireOp): void;
  /** The shared flags and the player's creative mode as the client mirrors them: two ops read them. */
  flags(): ReadonlySet<string>;
  creative(): boolean;
}

const NO: OpResult = { ok: false };
const isWire = (op: InvOp): op is WireOp => typeof op === 'object' && op !== null && typeof op.o === 'string' && op.o[0] !== '_';

export class InvSync {
  /** The live objects: `inv` and `stats` are the ones the game reads. `box` is the open container, `window` the open window. */
  readonly view: { inv: Inventory; stats: PlayerStats; box: ViewBox | null; window: Win | null };
  /** The hotbar selection made here and not sent yet. */
  pendingSel: number | null = null;
  /** The host closed the window the view still had: a container that went away, a refused station. Nothing is sent. */
  onEnded: (() => void) | null = null;
  private pending: Entry[] = [];
  private seqN = 0; private acked = 0;
  private bInv: InvWire | null = null; private bBox: BoxWire | null = null; private bWin: BaseWin | null = null;

  constructor(inv: Inventory, stats: PlayerStats, private host: SyncHost) { this.view = { inv, stats, box: null, window: null }; }

  /** The last `seq` the host acknowledged, and the ops sent since that it has not. */
  get ack(): number { return this.acked; }
  get unacked(): number { return this.pending.length; }

  /** The `seq` for the next sequenced message. The waiting selection goes out first, under the number before it. */
  nextSeq(): number { this.flushSel(); return ++this.seqN; }

  /** Apply an op here and send it. Prediction-only ops never travel and are refused here. */
  send(op: InvOp): OpResult {
    if (!isWire(op)) return NO;
    if (op.o !== 'sel') this.flushSel();
    const seq = ++this.seqN;
    this.pending.push({ seq, op });
    const r = this.apply(seq, op);
    this.host.send(seq, op);
    return r;
  }
  /** What an action of `seq` uses up, applied here until the host has acknowledged that action. */
  internal(seq: number, op: Extract<InvOp, { o: '_held' | '_slot' }>): void {
    this.queue(seq, op);
    this.apply(seq, op);
  }
  /** A station window shown here for the `use` of `seq`, before the host has set it. A `rej` of that use takes it away. */
  openStation(seq: number, station: string): void {
    const op: WinOp = { o: '_win', w: { mode: 'station', station } };
    this.queue(seq, op);
    this.apply(seq, op);
  }
  setSel(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i > 8) return;
    this.view.inv.sel = i; this.pendingSel = i;
  }
  flushSel(): void {
    const i = this.pendingSel;
    if (i === null) return;
    this.pendingSel = null;
    this.send({ o: 'sel', i });
  }

  /** The host's state after every message up to `ack`. */
  onSt(m: S2COf<'st'>): void {
    // the stream is ordered: an older acknowledgement than one already applied cannot be news
    if (m.ack < this.acked) return;
    this.acked = m.ack;
    if (m.inv) this.bInv = m.inv;
    let n = 0;
    for (const e of this.pending) {
      if (e.seq > m.ack) break;
      n++;
      // what an acknowledged op did to the window the host now holds as well
      const op = e.op;
      if (op.o === 'tidy' && this.bWin && typeof op.cover === 'boolean') this.bWin.covered = op.cover;
      else if (op.o === 'close') { this.bWin = null; this.bBox = null; }
      else if (op.o === '_win') this.bWin = { ...op.w };
    }
    if (n) this.pending.splice(0, n);
    // a field that is undefined is absent, as it would be after JSON
    if (m.box !== undefined) {
      const box = m.box, prev = this.bBox;
      if (!box) this.bWin = null;
      else if (!this.bWin || !prev || prev.kind !== box.kind || !sameWire(prev, box)) this.bWin = box.kind === 'shop' ? { mode: 'shop', npc: box.npc } : { mode: box.kind };
      this.bBox = box;
    }
    this.rebuild();
  }
  /** An `edit` or `use` was refused. A station opened for that `use` was never opened on the host. */
  onRej(seq: number): void {
    const i = this.pending.findIndex((e) => e.seq === seq && e.op.o === '_win');
    if (i < 0) return;
    this.pending.splice(i, 1);
    this.rebuild();
  }
  /** A new connection: numbering from 1, nothing pending, nothing known of the host's state. */
  reset(): void {
    this.pending = []; this.seqN = 0; this.acked = 0; this.pendingSel = null;
    this.bInv = null; this.bBox = null; this.bWin = null;
    this.view.box = null; this.view.window = null;
  }

  private queue(seq: number, op: InvOp | WinOp): void {
    let i = this.pending.length;
    while (i > 0 && this.pending[i - 1].seq > seq) i--;
    this.pending.splice(i, 0, { seq, op });
  }
  private apply(seq: number, op: InvOp | WinOp): OpResult {
    const v = this.view;
    if (op.o === '_win') { v.box = null; v.window = { ...op.w, sold: [] }; return { ok: true }; }
    const s: OpState = { inv: v.inv, stats: v.stats, box: v.window ? opBox(v.box) : null, window: v.window };
    let rnd: (() => number) | null = null;
    const seed = this.bInv?.seed ?? 0;
    const r = applyOp(s, op, {
      seq, flags: this.host.flags(), creative: this.host.creative(),
      rnd: () => (rnd ??= mulberry32(hashInt(seed, seq, 40503, 0)))(),
      drop: () => {}, flag: () => {},
    });
    v.window = s.window;
    if (!v.window) v.box = null;
    return r;
  }
  /** The view from the base, with every pending op played over it again. Refusals are silent here. */
  private rebuild(): void {
    const v = this.view, st = v.stats, had = v.window !== null, hp = st.hp, b = this.bInv;
    if (b) {
      assignWire(v.inv, b);
      st.attr.str = b.attr[0]; st.attr.agi = b.attr[1]; st.attr.vit = b.attr[2]; st.attr.arc = b.attr[3]; st.points = b.pts;
    }
    v.box = this.bWin ? assignBox(v.box, this.bBox) : null;
    v.window = this.bWin ? { ...this.bWin, sold: v.box?.kind === 'shop' ? v.box.sold : [] } : null;
    for (const e of this.pending) this.apply(e.seq, e.op);
    if (this.pendingSel !== null) v.inv.sel = this.pendingSel;
    v.inv.touch();
    if (v.box?.kind === 'forge') v.box.data.rev++;
    st.recompute(v.inv);
    // a replayed Vitality point would add its health again: health is the snapshot's to say
    st.hp = Math.min(hp, st.maxHp);
    if (had && !v.window) this.onEnded?.();
  }
}
const sameWire = (a: BoxWire, b: BoxWire): boolean => a.kind === 'shop' || b.kind === 'shop' ? a.kind === b.kind && (a as { npc: string }).npc === (b as { npc: string }).npc
  : a.x === b.x && a.y === b.y && a.z === b.z;
