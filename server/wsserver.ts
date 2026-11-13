// WebSocket connections as the host's `Conn`s (3.7, 4.1): JSON in text frames, movement and snapshots in
// binary frames, no compression. What a socket may send is capped here by size; what it may send by kind
// and rate is the host's to judge. A socket that sends no frame, pong included, for WS_SILENCE seconds is
// cut off: TCP alone would keep a dead link open for minutes.
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { type RawData, WebSocket, WebSocketServer } from 'ws';
import { type C2S, MAX_BIN, MAX_JSON, type S2C, WS_PING_EVERY, WS_SILENCE } from '../src/net/protocol';
import type { Conn, HostEnv } from '../src/net/transport';

/** Frames above this never reach the code below: `ws` closes the socket itself (1009). Between it and the
 *  protocol's own limits the socket is told `error proto` first. */
const FRAME_MAX = 4 * MAX_JSON;
/** A socket that sends more frames than this in one second is flooding, whatever they hold. The host's own caps
 *  (4.1) sit far below it; this only bounds what a hostile client can make the host queue between two steps. */
const FRAMES_PER_SEC = 2000;

class WsConn implements Conn {
  readonly local = false;
  onMessage: ((m: C2S) => void) | null = null;
  onBinary: ((b: ArrayBuffer) => void) | null = null;
  onClose: (() => void) | null = null;
  heard: number;
  frames = 0; framesAt: number;
  private done = false;
  constructor(readonly id: number, readonly addr: string, private ws: WebSocket, now: number) { this.heard = this.framesAt = now; }
  get buffered(): number { return this.ws.bufferedAmount; }
  get open(): boolean { return !this.done && this.ws.readyState === WebSocket.OPEN; }
  send(m: S2C): void { if (this.open) this.ws.send(JSON.stringify(m)); }
  sendBin(b: ArrayBuffer): void { if (this.open) this.ws.send(b, { binary: true }); }
  close(code: string): void {
    if (this.done) return;
    this.done = true;
    // the reason carries the code for a client that missed the `error` before it; 4000 and up are the application's
    this.ws.close(4000, code.slice(0, 64));
    // a peer that never answers the close frame does not hold the socket open
    setTimeout(() => this.ws.terminate(), 2000).unref();
  }
  /** The socket ended, from either side: the host hears of it once. */
  ended(): void {
    this.done = true;
    const f = this.onClose;
    this.onClose = null;
    if (f) f();
  }
  /** Tell the client why, then close. */
  refuse(code: 'proto' | 'rate', msg: string): void {
    this.send({ t: 'error', code, msg });
    this.close(code);
  }
}

export interface WsServer {
  /** Sockets open now. */
  readonly count: number;
  /** Close every socket at once and stop listening for upgrades. */
  close(): void;
}

/** Take the upgrades on `path` of `server` and hand every new socket to `connect` as a `Conn`. */
export function attachWs(server: Server, path: string, env: HostEnv, connect: (c: Conn) => void): WsServer {
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: FRAME_MAX, clientTracking: false });
  const conns = new Map<WebSocket, WsConn>();
  let nextId = 1;

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const p = (req.url ?? '').split('?')[0];
    if (p !== path) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => take(ws, req));
  };
  server.on('upgrade', onUpgrade);

  function take(ws: WebSocket, req: IncomingMessage): void {
    ws.binaryType = 'arraybuffer';
    const addr = (req.socket.remoteAddress ?? '?').replace(/^::ffff:/, '');
    const c = new WsConn(nextId++, addr, ws, env.now());
    conns.set(ws, c);
    ws.on('message', (data: RawData, isBinary: boolean) => {
      const now = env.now();
      c.heard = now;
      if (now - c.framesAt >= 1000) { c.framesAt = now; c.frames = 0; }
      if (++c.frames > FRAMES_PER_SEC) { c.refuse('rate', 'Too many messages.'); return; }
      if (!c.open) return;
      if (isBinary) {
        const b = data as ArrayBuffer;
        if (b.byteLength > MAX_BIN) { c.refuse('proto', 'A binary message is too large.'); return; }
        c.onBinary?.(b);
        return;
      }
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (buf.length > MAX_JSON) { c.refuse('proto', 'A message is too large.'); return; }
      let m: unknown;
      try { m = JSON.parse(buf.toString('utf8')); } catch { m = null; }
      // what is not JSON goes to the host like any malformed message: it closes the connection with `proto` and logs why
      c.onMessage?.(m as C2S);
    });
    ws.on('pong', () => { c.heard = env.now(); });
    ws.on('ping', () => { c.heard = env.now(); });
    ws.on('error', (e: Error) => { env.log('warn', `socket ${c.id} (${addr}): ${e.message}`); });
    ws.on('close', () => { conns.delete(ws); c.ended(); });
    connect(c);
  }

  let tick = 0;
  const timer = setInterval(() => {
    const now = env.now(), ping = ++tick % WS_PING_EVERY === 0;
    for (const [ws, c] of conns) {
      if (now - c.heard > WS_SILENCE * 1000) { env.log('info', `socket ${c.id} (${c.addr}) silent for ${WS_SILENCE} s: closed`); ws.terminate(); continue; }
      if (ping && ws.readyState === WebSocket.OPEN) ws.ping();
    }
  }, 1000);
  timer.unref();

  return {
    get count() { return conns.size; },
    close(): void {
      clearInterval(timer);
      server.off('upgrade', onUpgrade);
      for (const ws of conns.keys()) ws.terminate();
      wss.close();
    },
  };
}
