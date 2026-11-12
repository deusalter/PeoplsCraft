// The chunk subscription service of a host (4.7): which chunks each connection follows, their edit sets
// loaded and sent nearest first at a paced number of bytes, the live changes and generation hashes behind them.
// It writes to a connection only inside flushLive and flushCe, so the send order of 4.1 holds.
import { chunkKey } from '../core/constants';
import type { SimPlayer } from '../sim/player';
import type { Sim } from '../sim/sim';
import { type ChunkEdits, EditMaps, type EditStore } from '../sim/voxels';
import { encodeEdits, packFull, toBase64 } from './codec';
import { BUF_CE, CE_BYTES, CE_BYTES_LOCAL, type C2S, type CeEntry, FULL_PER_SEC, LOADS_MAX, LOADS_PER_TICK, SUB_KEEP, SUB_RANGE } from './protocol';
import type { Conn } from './transport';

/** Bytes a `ce` entry costs beyond its data: brackets, commas and five numbers. */
const ENTRY_BYTES = 40;
/** Ticks between two sweeps of out-of-range subscriptions (1 s). */
const SWEEP_TICKS = 60;

interface Want { key: number; cx: number; cz: number; n: number }
interface Follow {
  dim: number;
  /** chunk key -> the nonce of the current subscription */
  subs: Map<number, number>;
  /** subscriptions whose edit map is still to be loaded */
  queue: Want[];
  inflight: number;
  /** loaded, waiting for a flush */
  ready: Map<number, Want>;
  /** answers to `chunks.full` waiting for a flush, and how many were taken this second */
  full: Want[]; fullN: number;
  /** chunks whose `ce` this connection was sent for the current nonce: it gets their `b` and `gh` */
  sent: Set<number>;
  b: number[]; gh: number[];
  t: number;
  /** the player's chunk at the last call */
  pcx: number; pcz: number;
}

const cheb = (ax: number, az: number, bx: number, bz: number): number => Math.max(Math.abs(ax - bx), Math.abs(az - bz));

export class ChunkService {
  private conns = new Map<Conn, Follow>();
  /** Per realm: chunk key -> the connections that have been sent its `ce`. */
  private listeners: Map<number, Set<Follow>>[] = [new Map(), new Map(), new Map()];

  /** `viewMax` is the host's: what SUB_RANGE and SUB_KEEP are added to. */
  constructor(private sim: Sim, private edits: EditStore, private viewMax: number) {
    if (edits instanceof EditMaps) edits.hold((dim, cx, cz) => { const k = chunkKey(cx, cz); for (const f of this.conns.values()) if (f.dim === dim && f.subs.has(k)) return true; return false; });
    for (const r of sim.realms) if (r.chunks) {
      const dim = r.dim;
      r.chunks.onEdit = (x, y, z, id, rev) => this.onBlock(dim, x, y, z, id, rev);
      r.chunks.onGen = (cx, cz, h) => this.onGen(dim, cx, cz, h);
    }
  }

  private follow(c: Conn, p: SimPlayer): Follow {
    let f = this.conns.get(c);
    if (!f) {
      f = { dim: p.dim, subs: new Map(), queue: [], inflight: 0, ready: new Map(), full: [], fullN: 0, sent: new Set(), b: [], gh: [], t: 0, pcx: 0, pcz: 0 };
      this.conns.set(c, f);
    }
    // a realm change the host did not report still ends every subscription of the old realm
    if (f.dim !== p.dim) { this.dropAll(f); f.dim = p.dim; }
    f.pcx = Math.floor(p.body.x) >> 4; f.pcz = Math.floor(p.body.z) >> 4;
    return f;
  }

  onChunks(c: Conn, p: SimPlayer, m: C2S & { t: 'chunks' }): void {
    const f = this.follow(c, p);
    if (m.dim !== p.dim) return;
    const u = m.unsub;
    for (let i = 0; i + 1 < u.length; i += 2) this.unsub(f, chunkKey(u[i], u[i + 1]), u[i], u[i + 1]);
    const s = m.sub, range = this.viewMax + SUB_RANGE;
    for (let i = 0; i + 2 < s.length; i += 3) {
      const cx = s[i], cz = s[i + 1], n = s[i + 2], key = chunkKey(cx, cz);
      if (cheb(cx, cz, f.pcx, f.pcz) > range) continue;
      f.subs.set(key, n);
      // wanted again: the next `ce` carries every change made until it is sent
      this.unlisten(f, key);
      f.ready.delete(key);
      f.queue.push({ key, cx, cz, n });
    }
    const q = m.full ?? [];
    for (let i = 0; i + 1 < q.length; i += 2) {
      const key = chunkKey(q[i], q[i + 1]), n = f.subs.get(key);
      if (n === undefined || f.fullN >= FULL_PER_SEC) continue;
      f.fullN++;
      f.full.push({ key, cx: q[i], cz: q[i + 1], n });
    }
  }
  /** Drop every subscription of the connection: its player changed realm, or it was bound to its player again. */
  onRealmChange(c: Conn): void { const f = this.conns.get(c); if (f) this.dropAll(f); }
  /** The connection is gone. */
  detach(c: Conn): void { const f = this.conns.get(c); if (f) { this.dropAll(f); this.conns.delete(c); } }

  /** A cell of a sim chunk changed: queued as `b` for every connection that was sent the chunk's `ce`. */
  onBlock(dim: number, x: number, y: number, z: number, id: number, rev: number): void {
    const l = this.listeners[dim]?.get(chunkKey(x >> 4, z >> 4));
    if (l) for (const f of l) f.b.push(x, y, z, id, rev);
  }
  /** The host generated a chunk for the first time: its hash goes to those whose `ce` went out without it. */
  onGen(dim: number, cx: number, cz: number, hash: number): void {
    const l = this.listeners[dim]?.get(chunkKey(cx, cz));
    if (l) for (const f of l) f.gh.push(cx, cz, hash);
  }

  /** Start queued loads, nearest first; once a second drop subscriptions out of range. */
  tick(c: Conn, p: SimPlayer): void {
    const f = this.follow(c, p);
    if (++f.t >= SWEEP_TICKS) {
      f.t = 0; f.fullN = 0;
      const keep = this.viewMax + SUB_KEEP;
      for (const key of [...f.subs.keys()]) {
        const cx = Math.floor(key / 65536) - 32768, cz = (key % 65536) - 32768;
        if (cheb(cx, cz, f.pcx, f.pcz) > keep) this.unsub(f, key, cx, cz);
      }
    }
    if (!f.queue.length) return;
    f.queue = f.queue.filter((w) => f.subs.get(w.key) === w.n);
    f.queue.sort((a, b) => cheb(a.cx, a.cz, f.pcx, f.pcz) - cheb(b.cx, b.cz, f.pcx, f.pcz));
    let started = 0, i = 0;
    for (; i < f.queue.length && started < LOADS_PER_TICK && f.inflight < LOADS_MAX; i++) {
      const w = f.queue[i];
      started++;
      if (this.edits.peek(f.dim, w.cx, w.cz)) { f.ready.set(w.key, w); continue; }
      f.inflight++;
      const dim = f.dim;
      this.edits.load(dim, w.cx, w.cz).then(() => {
        f.inflight--;
        if (f.dim === dim && f.subs.get(w.key) === w.n) f.ready.set(w.key, w);
      }, () => { f.inflight--; });
    }
    f.queue.splice(0, i);
  }

  /** The tick's live changes, then the generation hashes. */
  flushLive(c: Conn): void {
    const f = this.conns.get(c);
    if (!f) return;
    if (f.b.length) { c.send({ t: 'b', dim: f.dim, l: f.b }); f.b = []; }
    if (f.gh.length) { c.send({ t: 'gh', dim: f.dim, l: f.gh }); f.gh = []; }
  }
  /** One `ce` of at most CE_BYTES (always at least one entry), nearest first, while the send buffer allows. */
  flushCe(c: Conn): void {
    const f = this.conns.get(c);
    if (!f || c.buffered >= BUF_CE || (!f.ready.size && !f.full.length)) return;
    const budget = c.local ? CE_BYTES_LOCAL : CE_BYTES, l: CeEntry[] = [];
    let used = 0;
    const fits = (n: number): boolean => !l.length || used + n <= budget;
    while (f.full.length) {
      const w = f.full[0], ch = this.sim.realms[f.dim]?.chunks?.chunk(w.cx, w.cz), e = this.edits.peek(f.dim, w.cx, w.cz);
      // only a chunk the host holds as a ready sim chunk is answered; the client asks again
      if (!ch || ch.state !== 2 || !ch.blocks || !e || f.subs.get(w.key) !== w.n) { f.full.shift(); continue; }
      const data = toBase64(packFull(ch.blocks));
      if (!fits(data.length + ENTRY_BYTES)) break;
      f.full.shift();
      l.push([w.cx, w.cz, w.n, e.rev, 0, 1, data]); used += data.length + ENTRY_BYTES;
      this.listen(f, w.key);
    }
    if (f.ready.size) {
      const order = [...f.ready.values()].sort((a, b) => cheb(a.cx, a.cz, f.pcx, f.pcz) - cheb(b.cx, b.cz, f.pcx, f.pcz));
      for (const w of order) {
        const e = this.edits.peek(f.dim, w.cx, w.cz);
        if (!e || f.subs.get(w.key) !== w.n) { f.ready.delete(w.key); continue; }
        const ent = this.entry(e, w.n), n = (ent.length > 6 ? (ent[6] as string).length : 0) + ENTRY_BYTES;
        if (!fits(n)) break;
        f.ready.delete(w.key);
        l.push(ent); used += n;
        this.listen(f, w.key);
      }
    }
    if (l.length) c.send({ t: 'ce', dim: f.dim, l });
  }

  /** The entry of an edit map for one subscription; the encoding is made once per revision and shared. */
  private entry(e: ChunkEdits, n: number): CeEntry {
    if (e.rev === 0) return [e.cx, e.cz, n, 0, e.genHash];
    if (!e.wire || e.wire.rev !== e.rev) e.wire = { rev: e.rev, ...encodeEdits(e) };
    return [e.cx, e.cz, n, e.rev, e.genHash, e.wire.enc, e.wire.data];
  }
  private listen(f: Follow, key: number): void {
    f.sent.add(key);
    const m = this.listeners[f.dim];
    let s = m.get(key);
    if (!s) { s = new Set(); m.set(key, s); }
    s.add(f);
  }
  private unlisten(f: Follow, key: number): void {
    if (!f.sent.delete(key)) return;
    const m = this.listeners[f.dim], s = m.get(key);
    if (s && s.delete(f) && !s.size) m.delete(key);
  }
  private unsub(f: Follow, key: number, cx: number, cz: number): void {
    if (!f.subs.delete(key)) return;
    this.unlisten(f, key);
    f.ready.delete(key);
    this.edits.release(f.dim, cx, cz);
  }
  private dropAll(f: Follow): void {
    const keys = [...f.subs.keys()];
    for (const key of f.sent) { const s = this.listeners[f.dim].get(key); if (s && s.delete(f) && !s.size) this.listeners[f.dim].delete(key); }
    f.sent.clear(); f.subs.clear(); f.queue = []; f.ready.clear(); f.full = []; f.b = []; f.gh = [];
    for (const key of keys) this.edits.release(f.dim, Math.floor(key / 65536) - 32768, (key % 65536) - 32768);
  }
}
