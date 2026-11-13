// A WebSocket as WsTransport sees one, with the bot's hands on the wire: it counts the bytes of every message by
// stream, can hold both directions as a dead link does, and can be cut. WsTransport opens one per connection through
// `WsEnv.open`, so a reconnect gets a fresh one.

/** Streams of 10.2's byte counters. */
export type Stream = 'snapshot' | 'fx' | 'st' | 'b' | 'ce' | 'other';
export const STREAMS: readonly Stream[] = ['snapshot', 'fx', 'st', 'b', 'ce', 'other'];

export interface Wire {
  bytesIn: Record<Stream, number>;
  bytesOut: number;
  /** Until this time (performance.now() ms), nothing is delivered or sent; what came and went meanwhile waits. */
  heldUntil: number;
}

const streamOf = (text: string): Stream => {
  const m = /^\{"t":"(\w+)"/.exec(text);
  const t = m ? m[1] : '';
  return t === 'fx' || t === 'st' || t === 'b' || t === 'ce' ? t : 'other';
};

type Listener = ((e: never) => void) | null;

export class Tap {
  onopen: Listener = null; onmessage: Listener = null; onclose: Listener = null; onerror: Listener = null;
  private ws: WebSocket;
  private inQ: MessageEvent[] = [];
  private outQ: (string | ArrayBuffer)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, private wire: Wire, private live: Set<Tap>) {
    this.ws = new WebSocket(url);
    live.add(this);
    this.ws.onopen = (e) => (this.onopen as ((e: Event) => void) | null)?.(e);
    this.ws.onclose = (e) => { live.delete(this); this.flushSoon(); (this.onclose as ((e: CloseEvent) => void) | null)?.(e); };
    this.ws.onerror = (e) => (this.onerror as ((e: Event) => void) | null)?.(e);
    this.ws.onmessage = (e: MessageEvent) => {
      const d: unknown = e.data, w = this.wire;
      if (d instanceof ArrayBuffer) { if (d.byteLength && new Uint8Array(d)[0] === 1) w.bytesIn.snapshot += d.byteLength; else w.bytesIn.other += d.byteLength; }
      else if (typeof d === 'string') w.bytesIn[streamOf(d)] += Buffer.byteLength(d);
      if (this.held() || this.inQ.length) { this.inQ.push(e); this.flushSoon(); return; }
      (this.onmessage as ((e: MessageEvent) => void) | null)?.(e);
    };
  }
  get readyState(): number { return this.ws.readyState; }
  get binaryType(): BinaryType { return this.ws.binaryType; }
  set binaryType(t: BinaryType) { this.ws.binaryType = t; }
  get bufferedAmount(): number { return this.ws.bufferedAmount; }

  send(d: string | ArrayBuffer): void {
    if (this.held() || this.outQ.length) { this.outQ.push(d); this.flushSoon(); return; }
    this.put(d);
  }
  close(): void { this.ws.close(); }
  /** Cut the link: the socket ends at once with no closing handshake. */
  kill(): void { this.ws.close(4999, 'drop'); }

  private put(d: string | ArrayBuffer): void {
    if (this.ws.readyState !== 1) return;
    this.wire.bytesOut += typeof d === 'string' ? Buffer.byteLength(d) : d.byteLength;
    this.ws.send(d);
  }
  private held(): boolean { return performance.now() < this.wire.heldUntil; }
  private flushSoon(): void {
    if (this.timer) return;
    const wait = Math.max(0, this.wire.heldUntil - performance.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.held()) { this.flushSoon(); return; }
      const out = this.outQ, inq = this.inQ;
      this.outQ = []; this.inQ = [];
      for (const d of out) this.put(d);
      for (const e of inq) (this.onmessage as ((e: MessageEvent) => void) | null)?.(e);
    }, wait);
  }
}
