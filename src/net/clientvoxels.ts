// The client's block data: one record per chunk it keeps, the subscription of each, and the rules of 4.7 by which
// generated terrain, the host's edit sets and live changes become the blocks a body stands on.
// Pure: the browser's World and a headless bot use the same class; neither the clock nor generation lives here.
//
// A record is ready (state 2) once its own generation and the `ce` answering its current subscription have both
// arrived, in either order. Every cell written after generation goes through write(), which keeps `hasEmit` and
// tells the owner which cell changed.
import { BUILD_MAX, CH, chunkKey } from '../core/constants';
import { T_EMITS } from '../data/blocks';
import type { VoxelRead } from '../sim/voxels';
import { decodeFull, decodeSparse } from './codec';
import { CHUNKS_FLUSH_MS, FULL_MAX, FULL_RETRY_MS, RESUB_MS, SUB_MAX, UNSUB_MAX, type C2S, type CeEntry, type S2C, type S2COf } from './protocol';

/** What ClientVoxels needs of a client session (client/session.ts satisfies it). */
export interface VoxSession {
  on<T extends S2C['t']>(type: T, fn: (m: S2COf<T>) => void): void;
  send(m: C2S): void;
}

export class VoxChunk {
  blocks: Uint8Array | null = null;
  biomes: Uint8Array | null = null;
  /** 0 generation not started, 1 generating or waiting for its edit set, 2 ready. */
  state = 0;
  /** The lighting pass seeds emitters only in chunks where this is set. */
  hasEmit = false;
  /** Nonce of the current subscription. */
  subN = 0;
  /** Revision of the host's edit map that the blocks reflect. */
  editRev = 0;
  /** Hash of this client's own generation (0 until generated), and the host's (0 unknown). */
  genHash = 0; hostGh = 0;
  /** The `ce` entry of the current subscription while generation is still out. */
  ce: CeEntry | null = null;
  /** Live changes that arrived before readiness, as (cell index, id, rev) triples in arrival order. */
  live: number[] = [];
  /** Predicted cells: cell index -> seq of the action that predicted them. */
  pred: Map<number, number> | null = null;
  /** Wall time (ms) the current subscription was sent; -1 while it waits to be sent or once it is answered. */
  subAt = -1;
  /** Wall time (ms) a `full` for this chunk was last sent. */
  fullAt = -1e9;
  constructor(readonly cx: number, readonly cz: number, readonly key: number) {}
}

const cellIndex = (x: number, y: number, z: number): number => ((((z & 15) << 4) | (x & 15)) << 8) | y;

export class ClientVoxels<C extends VoxChunk = VoxChunk> implements VoxelRead {
  dim = 0;
  /** From `welcome.cfg`: the host's sim radius (where it can answer `full`) and its view limit. */
  cfg = { simRadius: 5, viewMax: 16 };
  /** A cell changed after generation: an edit set, a full array, a live change, a prediction or a `rej`. */
  onCellChange: ((x: number, y: number, z: number, old: number, id: number) => void) | null = null;
  /** The whole block array of a ready record was replaced (the answer to `full`). */
  onReplace: ((c: C) => void) | null = null;
  /** The record became ready: it may be meshed and stood on. */
  onReady: ((c: C) => void) | null = null;
  /** The record lost its blocks and needs generating again (state is back to 0). */
  onRegen: ((c: C) => void) | null = null;
  /** The record left the map (dropped, or every record on clear). */
  onDrop: ((c: C) => void) | null = null;
  /** Chunks resynced since the start (rule 7), for the debug overlay and tests. */
  resyncs = 0;

  private nonce = 0;
  private subQ = new Map<number, C>();
  private unsubQ = new Map<number, [number, number]>();
  private fullQ = new Map<number, C>();
  private lastFlush = -1e9;
  private last: C | null = null;
  /** seq -> records holding a prediction of it. */
  private predSeq = new Map<number, Set<C>>();
  private send: ((m: C2S) => void) | null = null;

  constructor(private make: (cx: number, cz: number, key: number) => C, readonly chunks: Map<number, C> = new Map()) {}

  /** Take `ce`, `b`, `gh` and `welcome` from the session and send `chunks` through it. `rej` is client/blocks.ts's. */
  attach(s: VoxSession): void {
    this.send = (m) => s.send(m);
    s.on('ce', (m) => this.onCe(m));
    s.on('b', (m) => this.onB(m));
    s.on('gh', (m) => this.onGh(m));
    s.on('welcome', (m) => { this.cfg = { simRadius: m.cfg.simRadius, viewMax: m.cfg.viewMax }; this.clear(m.dim); });
  }
  /** Where `chunks` messages go when there is no session (tests, bots that send by hand). */
  sendTo(fn: (m: C2S) => void): void { this.send = fn; }

  // ---- records ------------------------------------------------------------------------------------

  chunkAt(cx: number, cz: number): C | null {
    const l = this.last;
    if (l && l.cx === cx && l.cz === cz) return l;
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return null;
    this.last = c;
    return c;
  }
  /** The record of this chunk, created and queued for subscription if there is none. */
  create(cx: number, cz: number): C {
    const key = chunkKey(cx, cz);
    let c = this.chunks.get(key);
    if (c) return c;
    c = this.make(cx, cz, key);
    this.chunks.set(key, c);
    this.subscribe(c);
    return c;
  }
  /** Forget a record: its subscription is ended with the next `chunks` message. */
  drop(c: C): void {
    if (this.chunks.get(c.key) !== c) return;
    this.forget(c);
    this.subQ.delete(c.key); this.fullQ.delete(c.key);
    this.unsubQ.set(c.key, [c.cx, c.cz]);
  }
  /** Forget every record and everything queued, sending nothing: the host drops the subscriptions of a connection
   *  itself when its player changes realm or is bound again. */
  clear(dim = this.dim): void {
    for (const c of [...this.chunks.values()]) this.forget(c);
    this.subQ.clear(); this.unsubQ.clear(); this.fullQ.clear(); this.predSeq.clear();
    this.dim = dim;
  }
  private forget(c: C): void {
    this.chunks.delete(c.key);
    if (this.last === c) this.last = null;
    this.clearPred(c);
    if (this.onDrop) this.onDrop(c);
  }
  private subscribe(c: C): void {
    this.nonce = (this.nonce + 1) & 0xffff;
    c.subN = this.nonce; c.subAt = -1; c.ce = null;
    this.subQ.set(c.key, c);
  }

  /** The generator's output for a record. Ignored when the record is gone or already has its generation. */
  generated(c: C, blocks: Uint8Array, biomes: Uint8Array, hasEmit: boolean, hash: number): boolean {
    if (this.chunks.get(c.key) !== c || c.blocks) return false;
    c.blocks = blocks; c.biomes = biomes; c.hasEmit = hasEmit; c.genHash = hash >>> 0;
    if (c.state === 0) c.state = 1;
    this.checkHash(c);
    if (c.ce) this.becomeReady(c);
    return true;
  }

  // ---- the wire -----------------------------------------------------------------------------------

  /** Send what is queued, at most once per CHUNKS_FLUSH_MS of `now` (wall milliseconds). True when a message went out. */
  flush(now: number): boolean {
    if (now - this.lastFlush < CHUNKS_FLUSH_MS || !this.send) return false;
    if (!this.subQ.size && !this.unsubQ.size && !this.fullQ.size) return false;
    const sub: number[] = [], unsub: number[] = [], full: number[] = [];
    for (const [k, c] of this.subQ) {
      if (sub.length >= SUB_MAX * 3) break;
      sub.push(c.cx, c.cz, c.subN); c.subAt = now; this.subQ.delete(k);
    }
    for (const [k, p] of this.unsubQ) {
      if (unsub.length >= UNSUB_MAX * 2) break;
      unsub.push(p[0], p[1]); this.unsubQ.delete(k);
    }
    for (const [k, c] of this.fullQ) {
      if (full.length >= FULL_MAX * 2) break;
      full.push(c.cx, c.cz); c.fullAt = now; this.fullQ.delete(k);
    }
    this.lastFlush = now;
    this.send(full.length ? { t: 'chunks', dim: this.dim, sub, unsub, full } : { t: 'chunks', dim: this.dim, sub, unsub });
    return true;
  }
  /** The timers of rules 6 and 7, from the frame: a subscription unanswered for RESUB_MS is made again, and a chunk
   *  whose generation differs from the host's asks for its full array every FULL_RETRY_MS while it is within the
   *  host's sim radius + 1 of the player at block (px, pz). */
  tick(now: number, px: number, pz: number): void {
    const pcx = Math.floor(px / 16), pcz = Math.floor(pz / 16), r = this.cfg.simRadius + 1;
    for (const c of this.chunks.values()) {
      if (c.subAt >= 0 && now - c.subAt >= RESUB_MS) this.resync(c);
      else if (this.mismatch(c) && now - c.fullAt >= FULL_RETRY_MS && Math.abs(c.cx - pcx) <= r && Math.abs(c.cz - pcz) <= r) this.fullQ.set(c.key, c);
    }
  }

  onCe(m: S2COf<'ce'>): void {
    if (m.dim !== this.dim) return;
    for (const e of m.l) {
      const c = this.chunkAt(e[0], e[1]);
      if (!c || e[2] !== c.subN) continue;   // an answer to an earlier subscription of this chunk
      if (c.state === 2) { this.answerFull(c, e); continue; }
      c.subAt = -1;
      if (e[4]) { c.hostGh = e[4] >>> 0; this.checkHash(c); }
      c.ce = e;
      if (c.blocks) this.becomeReady(c);
    }
  }
  onB(m: S2COf<'b'>): void {
    if (m.dim !== this.dim) return;
    const l = m.l;
    for (let o = 0; o + 4 < l.length; o += 5) {
      const x = l[o], y = l[o + 1], z = l[o + 2], c = this.chunkAt(x >> 4, z >> 4);
      if (!c) continue;
      const i = cellIndex(x, y, z);
      if (c.state !== 2) { c.live.push(i, l[o + 3], l[o + 4]); continue; }
      this.live(c, i, l[o + 3], l[o + 4]);
    }
  }
  onGh(m: S2COf<'gh'>): void {
    if (m.dim !== this.dim) return;
    for (let o = 0; o + 2 < m.l.length; o += 3) {
      const c = this.chunkAt(m.l[o], m.l[o + 1]);
      if (!c || !m.l[o + 2]) continue;
      c.hostGh = m.l[o + 2] >>> 0;
      this.checkHash(c);
    }
  }

  private becomeReady(c: C): void {
    const e = c.ce!;
    c.ce = null;
    if (e[3] > 0 && e.length > 5) {
      const data = e[6] as string;
      if (e[5] === 1) {
        const a = decodeFull(data);
        if (!a) { this.resync(c); return; }
        this.setArray(c, a);
      } else if (!decodeSparse(data, (i, id) => { this.write(c, i, id); })) { this.resync(c); return; }
    }
    c.editRev = e[3];
    const q = c.live;
    c.live = [];
    c.state = 2;
    for (let o = 0; o < q.length; o += 3) if (!this.live(c, q[o], q[o + 1], q[o + 2])) return;
    if (this.onReady) this.onReady(c);
  }
  /** One live change on a ready record. False when it found a gap and resynced the chunk. */
  private live(c: C, i: number, id: number, rev: number): boolean {
    if (rev <= c.editRev) return true;
    if (rev > c.editRev + 1) { this.resync(c); return false; }
    this.write(c, i, id);
    c.editRev = rev;
    if (c.pred && c.pred.has(i)) this.unpredict(c, i);
    return true;
  }
  private answerFull(c: C, e: CeEntry): void {
    if (e.length < 7 || e[5] !== 1) return;
    const a = decodeFull(e[6] as string);
    if (!a) return;
    c.hostGh = 0;
    this.setArray(c, a);
    c.editRev = e[3];
    if (this.onReplace) this.onReplace(c);
  }

  // ---- writes -------------------------------------------------------------------------------------

  /** The one path by which a cell changes after generation. True when the id changed. */
  write(c: C, i: number, id: number): boolean {
    const b = c.blocks;
    if (!b) return false;
    if (T_EMITS[id]) c.hasEmit = true;
    const old = b[i];
    if (old === id) return false;
    b[i] = id;
    if (this.onCellChange) this.onCellChange(c.cx * 16 + ((i >> 8) & 15), i & 255, c.cz * 16 + (i >> 12), old, id);
    return true;
  }
  /** Replace a record's whole block array; `hasEmit` is found again by scanning it. */
  private setArray(c: C, a: Uint8Array): void {
    let emit = false;
    for (let i = 0; i < a.length; i++) if (T_EMITS[a[i]]) { emit = true; break; }
    c.blocks = a; c.hasEmit = emit;
  }

  // ---- predictions --------------------------------------------------------------------------------

  /** Write a predicted cell under the `seq` of the action that predicts it. False where the chunk is not ready or y is
   *  outside 1..BUILD_MAX. The answer is the `b` of the change (which clears the prediction) or a `rej`. */
  predict(seq: number, x: number, y: number, z: number, id: number): boolean {
    if (y < 1 || y > BUILD_MAX) return false;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state !== 2) return false;
    const i = cellIndex(x, y, z);
    this.write(c, i, id);
    (c.pred ??= new Map()).set(i, seq);
    let s = this.predSeq.get(seq);
    if (!s) this.predSeq.set(seq, (s = new Set()));
    s.add(c);
    return true;
  }
  /** Cells still predicted, for tests and the debug overlay. */
  predicted(): number { let n = 0; for (const c of this.chunks.values()) n += c.pred ? c.pred.size : 0; return n; }
  /** A `rej`: with cells, write the truth and drop the predictions of `seq`; without, resync every chunk holding one. */
  reject(seq: number, cells: readonly number[]): void {
    const holders = this.predSeq.get(seq);
    this.predSeq.delete(seq);
    if (cells.length) {
      for (let o = 0; o + 3 < cells.length; o += 4) {
        const x = cells[o], y = cells[o + 1], z = cells[o + 2], c = this.chunkAt(x >> 4, z >> 4);
        if (c && c.state === 2 && y >= 0 && y < CH) this.write(c, cellIndex(x, y, z), cells[o + 3]);
      }
      if (holders) for (const c of holders) if (c.pred) for (const [i, s] of c.pred) if (s === seq) c.pred.delete(i);
      return;
    }
    if (holders) for (const c of holders) {
      if (this.chunks.get(c.key) !== c || !c.pred) continue;
      for (const s of c.pred.values()) if (s === seq) { this.resync(c); break; }
    }
  }
  private unpredict(c: C, i: number): void {
    const seq = c.pred!.get(i)!;
    c.pred!.delete(i);
    for (const s of c.pred!.values()) if (s === seq) return;
    const h = this.predSeq.get(seq);
    if (h) { h.delete(c); if (!h.size) this.predSeq.delete(seq); }
  }
  private clearPred(c: C): void {
    if (!c.pred) return;
    for (const seq of c.pred.values()) {
      const h = this.predSeq.get(seq);
      if (h) { h.delete(c); if (!h.size) this.predSeq.delete(seq); }
    }
    c.pred = null;
  }

  // ---- resync and the generation check --------------------------------------------------------

  /** Rule 7: clear the chunk's predictions, give it a new nonce, make it not ready and subscribe again (no unsub).
   *  Generation is started again only where cells were written over it; a record that never became ready still
   *  holds the generator's array as it came. */
  resync(c: C): void {
    if (this.chunks.get(c.key) !== c) return;
    this.resyncs++;
    this.clearPred(c);
    c.ce = null; c.live = []; c.editRev = 0;
    this.fullQ.delete(c.key);
    if (c.state === 2) {
      c.blocks = null; c.hasEmit = false; c.genHash = 0; c.state = 0;
      if (this.onRegen) this.onRegen(c);
    }
    this.subscribe(c);
  }
  private mismatch(c: C): boolean { return c.genHash !== 0 && c.hostGh !== 0 && c.genHash !== c.hostGh; }
  private checkHash(c: C): void { if (this.mismatch(c)) this.fullQ.set(c.key, c); }

  // ---- VoxelRead ----------------------------------------------------------------------------------

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    return c && c.blocks ? c.blocks[cellIndex(x, y, z)] : 0;
  }
  ready(x: number, z: number): boolean {
    const c = this.chunkAt(x >> 4, z >> 4);
    return !!c && c.state === 2;
  }
  topY(x: number, z: number): number {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state !== 2 || !c.blocks) return -1;
    const base = (((z & 15) << 4) | (x & 15)) << 8;
    for (let y = CH - 2; y > 0; y--) if (c.blocks[base + y] !== 0) return y;
    return 0;
  }
  biomeAt(x: number, z: number): number {
    const c = this.chunkAt(x >> 4, z >> 4);
    return c && c.biomes ? c.biomes[((z & 15) << 4) | (x & 15)] : 0;
  }
}
