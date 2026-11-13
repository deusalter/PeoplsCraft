// The client's end of a WebSocket to a server (3.7, 4.2). Works in the browser and in Node 22, which
// both have a global WebSocket. A socket that drops, or goes 6 s without delivering anything, is replaced
// after a backoff of 0.5, 1, 2, 4, 8 s and then every 8 s, until the host says something final.
//
// Every socket gets a generation number, and only the newest one's events count: a socket given up on
// may still deliver its last messages or an `error replaced` meant for the tab that took over from it,
// and none of that may reach the session or stop the retries.
import { CLIENT_SILENCE, type C2S, type ErrorCode, RETRY_CODES, type S2C } from './protocol';
import type { Transport } from './transport';

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

/** What the transport needs of the platform; the defaults are the global ones. */
export interface WsEnv {
  open(url: string): WebSocket;
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(h: unknown): void;
  /** Hidden page: an `idle` close waits for it to be shown again before it retries (4.2). Absent: never hidden. */
  hidden?(): boolean;
  onShown?(fn: () => void): void;
}

const globalEnv = (): WsEnv => {
  const doc = (globalThis as { document?: Document }).document;
  return {
    open: (url) => new WebSocket(url),
    now: () => performance.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    hidden: doc ? () => doc.hidden : undefined,
    onShown: doc ? (fn) => { const f = (): void => { if (!doc.hidden) { doc.removeEventListener('visibilitychange', f); fn(); } }; doc.addEventListener('visibilitychange', f); } : undefined,
  };
};

/** `http://h:p/x`, `ws://h:p/ws`, `h:p` or `h` as the socket URL of a server; null when it is none of these. */
export function serverUrl(text: string, page?: { protocol: string; host: string }): string | null {
  let s = text.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = (page?.protocol === 'https:' ? 'https://' : 'http://') + s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol === 'http:' || u.protocol === 'https:') { u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; if (u.pathname === '/' || u.pathname === '') u.pathname = '/ws'; }
  if (u.protocol !== 'ws:' && u.protocol !== 'wss:') return null;
  u.hash = '';
  return u.toString();
}

export class WsTransport implements Transport {
  readonly kind = 'ws' as const;
  state: Transport['state'] = 'connecting';
  onOpen: (() => void) | null = null;
  onMessage: ((m: S2C) => void) | null = null;
  onBinary: ((b: ArrayBuffer) => void) | null = null;
  onClose: ((code: string) => void) | null = null;
  /** The newest socket's number; 0 before the first. */
  gen = 0;
  /** Sockets opened so far, the first included. */
  opens = 0;
  /** The code that ended the transport for good, or null. */
  final: string | null = null;
  private ws: WebSocket | null = null;
  private tries = 0;
  private heard = 0;
  private retryTimer: unknown = null; private watchTimer: unknown = null;
  private env: WsEnv;
  /** The last `error` code of the current socket: a retry code still retries, any other ends the transport. */
  private said: ErrorCode | null = null;

  constructor(readonly url: string, env?: Partial<WsEnv>) {
    this.env = { ...globalEnv(), ...env };
    this.dial();
  }

  send(m: C2S): void { if (this.state === 'open' && this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  sendBin(b: ArrayBuffer): void { if (this.state === 'open' && this.ws && this.ws.readyState === 1) this.ws.send(b); }
  close(): void {
    if (this.state === 'closed') return;
    this.state = 'closed'; this.final = 'closed';
    this.stopTimers();
    this.drop();
  }

  private dial(): void {
    const gen = ++this.gen, env = this.env;
    this.said = null; this.heard = env.now();
    let ws: WebSocket;
    try { ws = env.open(this.url); } catch { this.lost(gen); return; }
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      if (gen !== this.gen || this.state === 'closed') return;
      this.state = 'open'; this.opens++; this.heard = env.now();
      if (this.onOpen) this.onOpen();
    };
    ws.onmessage = (e: MessageEvent) => {
      if (gen !== this.gen || this.state === 'closed') return;
      this.heard = env.now();
      const d: unknown = e.data;
      if (d instanceof ArrayBuffer) { if (this.onBinary) this.onBinary(d); return; }
      if (typeof d !== 'string') return;
      let m: S2C;
      try { m = JSON.parse(d) as S2C; } catch { return; }
      // a socket the host has taken in starts the backoff again
      if (m.t === 'welcome') this.tries = 0;
      else if (m.t === 'error') this.said = m.code;
      if (this.onMessage) this.onMessage(m);
    };
    ws.onclose = () => { if (gen === this.gen) this.lost(gen); };
    ws.onerror = () => { /* a close follows */ };
    this.watch();
  }
  /** The current socket is gone: retry, or stop for good when the host said something final on it. */
  private lost(gen: number): void {
    if (gen !== this.gen || this.state === 'closed') return;
    this.drop();
    const said = this.said;
    if (said && !RETRY_CODES.includes(said)) {
      this.state = 'closed'; this.final = said;
      this.stopTimers();
      if (this.onClose) this.onClose(said);
      return;
    }
    this.state = 'retrying';
    if (this.onClose) this.onClose('retrying');
    const env = this.env, wait = BACKOFF_MS[Math.min(this.tries++, BACKOFF_MS.length - 1)];
    const again = (): void => { this.retryTimer = env.setTimer(() => { this.retryTimer = null; if (this.state === 'retrying') { this.state = 'connecting'; this.dial(); } }, wait); };
    // a hidden page that was closed for idling comes back when it is shown, not while nobody looks at it
    if (said === 'idle' && env.hidden?.() && env.onShown) env.onShown(again); else again();
  }
  /** Forget the current socket: none of its events count from here on. */
  private drop(): void {
    const ws = this.ws;
    this.ws = null; this.gen++;
    if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch { /* already closing */ } }
  }
  /** Give up on a socket that has delivered nothing for CLIENT_SILENCE seconds, open or still connecting. */
  private watch(): void {
    const env = this.env;
    if (this.watchTimer !== null) return;
    const look = (): void => {
      this.watchTimer = null;
      if (this.state === 'closed') return;
      if (this.ws && env.now() - this.heard > CLIENT_SILENCE * 1000) this.lost(this.gen);
      this.watchTimer = env.setTimer(look, 1000);
    };
    this.watchTimer = env.setTimer(look, 1000);
  }
  private stopTimers(): void {
    const env = this.env;
    if (this.retryTimer !== null) { env.clearTimer(this.retryTimer); this.retryTimer = null; }
    if (this.watchTimer !== null) { env.clearTimer(this.watchTimer); this.watchTimer = null; }
  }
}
