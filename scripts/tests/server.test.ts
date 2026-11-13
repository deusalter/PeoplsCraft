// The built server as a friend would run it: the client and the server built into a folder of their own,
// `node server/main.js` started there on a free port with a password, and spoken to over plain http and
// real WebSockets. The keepalive case waits out the 10 s of silence the protocol allows.
import assert from 'node:assert/strict';
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { WebSocket } from 'ws';
import { Session } from '../../src/client/session';
import { MAX_JSON, PASSWORD_TRIES, PROTO, type S2C, WS_SILENCE, dataHash } from '../../src/net/protocol';
import { WsTransport, serverUrl } from '../../src/net/ws-client';

const root = resolve('.'), out = resolve('out/servertest'), PASSWORD = 'lantern';
let server: ChildProcess, base = '', data = '';
const logs: string[] = [];
const START = (port: string): string[] => [join(out, 'server', 'main.js'), '--data', join(data, 'world'), '--port', port, '--host', '127.0.0.1', '--password', PASSWORD, '--max-players', '8'];

function build(): void {
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  for (const args of [['build', '--outDir', join(out, 'client'), '--logLevel', 'warn'], ['build', '-c', 'vite.server.config.ts', '--outDir', join(out, 'server'), '--logLevel', 'warn']]) {
    const r = spawnSync(process.execPath, [vite, ...args], { cwd: root, stdio: 'inherit' });
    assert.equal(r.status, 0, 'vite ' + args.join(' '));
  }
}

before(async () => {
  build();
  data = mkdtempSync(join(tmpdir(), 'pc-server-'));
  // every player of this file holds a slot until its linger ends: 8 is room for all of them
  base = await serve('0');
});
/** Start the built server; resolves with its origin once it listens. */
function serve(port: string): Promise<string> {
  logs.length = 0;
  server = spawn(process.execPath, START(port), { cwd: out, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise<string>((ok, no) => {
    const t = setTimeout(() => no(new Error('the server did not say where it listens:\n' + logs.join(''))), 20000);
    const read = (b: Buffer): void => {
      logs.push(b.toString());
      const m = /listening on (http:\/\/[^/\s]+)\//.exec(logs.join(''));
      if (m) { clearTimeout(t); ok(m[1]); }
    };
    server.stdout!.on('data', read); server.stderr!.on('data', read);
    server.on('exit', (c) => no(new Error(`the server exited (${c}):\n` + logs.join(''))));
  });
}
async function halt(): Promise<void> {
  if (!server || server.exitCode !== null) return;
  const gone = new Promise((ok) => server.once('exit', ok));
  server.kill('SIGTERM');
  await Promise.race([gone, new Promise((ok) => setTimeout(ok, 5000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
after(async () => {
  await halt();
  rmSync(data, { recursive: true, force: true });
});

/** One socket, everything it is sent, and how it ended. */
interface Sock { ws: WebSocket; got: S2C[]; closed: Promise<{ code: number; reason: string; at: number }>; opened: Promise<void>; next(t: S2C['t'], ms?: number): Promise<S2C> }
function sock(opt: { autoPong?: boolean } = {}): Sock {
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws', { autoPong: opt.autoPong ?? true });
  const got: S2C[] = [], waits: { t: string; ok: (m: S2C) => void }[] = [];
  ws.on('message', (d, bin) => {
    if (bin) return;
    const m = JSON.parse(d.toString()) as S2C;
    got.push(m);
    for (const w of [...waits]) if (w.t === m.t) { waits.splice(waits.indexOf(w), 1); w.ok(m); }
  });
  ws.on('error', () => { /* the close says it */ });
  const closed = new Promise<{ code: number; reason: string; at: number }>((ok) => ws.on('close', (code, reason) => ok({ code, reason: reason.toString(), at: Date.now() })));
  const opened = new Promise<void>((ok, no) => { ws.once('open', () => ok()); ws.once('close', () => no(new Error('closed before it opened'))); });
  return {
    ws, got, closed, opened,
    next: (t, ms = 5000) => {
      const had = got.find((m) => m.t === t);
      if (had) return Promise.resolve(had);
      return new Promise((ok, no) => { const w = { t, ok }; waits.push(w); setTimeout(() => no(new Error(`no ${t} within ${ms} ms; got ${got.map((m) => m.t).join(' ')}`)), ms); });
    },
  };
}
const hello = (name: string, token: string, password = PASSWORD): string =>
  JSON.stringify({ t: 'hello', proto: PROTO, build: 'test', data: dataHash(), name, token, password: password || undefined, view: 8 });
const token = (c: string): string => c.repeat(32);
const errorOf = (s: Sock): string | undefined => (s.got.find((m) => m.t === 'error') as { code?: string } | undefined)?.code;

test('the client files are served from the same port, with the caching the protocol asks for', async () => {
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type')!, /text\/html/);
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  const html = await page.text();
  const src = /src="\.?\/?(assets\/[^"]+\.js)"/.exec(html)?.[1];
  assert.ok(src, 'the page names its script');
  const js = await fetch(`${base}/${src}`);
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type')!, /javascript/);
  assert.match(js.headers.get('cache-control')!, /immutable/);
  assert.ok((await js.text()).length > 1000);
  const info = await (await fetch(base + '/info')).json();
  assert.deepEqual(info, { server: true, name: 'Peopls Craft', players: 0, max: 8, password: true });
  assert.equal((await fetch(base + '/no-such-file.js')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/%2e%2e/package.json')).status, 404, 'nothing outside the client folder');
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('a hello with a good token and the password is welcomed, and the player is put in the world', async () => {
  const a = sock();
  await a.opened;
  a.ws.send(hello('Ada', token('a')));
  const w = await a.next('welcome') as S2C & { t: 'welcome' };
  assert.equal(w.proto, PROTO); assert.equal(w.you.id.length, 24); assert.equal(w.cfg.maxPlayers, 8); assert.equal(w.cfg.cheats, false);
  await a.next('st'); await a.next('stats');
  const info = await (await fetch(base + '/info')).json();
  assert.equal(info.players, 1);
  a.ws.close(); await a.closed;
});

test('an oversized frame closes the socket with `proto`, text or binary', async () => {
  const a = sock();
  await a.opened;
  a.ws.send('{"t":"chat","text":"' + 'x'.repeat(MAX_JSON) + '"}');
  const c = await a.closed;
  assert.equal(errorOf(a), 'proto'); assert.equal(c.reason, 'proto');
  const b = sock();
  await b.opened;
  b.ws.send(hello('Bea', token('b')));
  await b.next('welcome');
  b.ws.send(new Uint8Array(65));
  await b.closed;
  assert.equal(errorOf(b), 'proto');
  // and a frame far beyond every limit is cut off by the socket layer itself
  const d = sock();
  await d.opened;
  d.ws.send('x'.repeat(200 * 1024));
  assert.equal((await d.closed).code, 1009);
});

test('a second socket with the same token replaces the first', async () => {
  const a = sock();
  await a.opened;
  a.ws.send(hello('Cy', token('c')));
  const w1 = await a.next('welcome') as S2C & { t: 'welcome' };
  const b = sock();
  await b.opened;
  b.ws.send(hello('Cy', token('c')));
  const w2 = await b.next('welcome') as S2C & { t: 'welcome' };
  const c = await a.closed;
  assert.equal(errorOf(a), 'replaced'); assert.equal(c.reason, 'replaced');
  assert.equal(w2.you.id, w1.you.id); assert.equal(w2.you.slot, w1.you.slot, 'the same player');
  assert.equal(b.ws.readyState, WebSocket.OPEN);
  b.ws.close(); await b.closed;
});

test('a silent socket is closed by the keepalive', async () => {
  const a = sock({ autoPong: false });
  await a.opened;
  const t0 = Date.now();
  a.ws.send(hello('Dee', token('d')));
  await a.next('welcome');
  const c = await a.closed;
  const s = (c.at - t0) / 1000;
  assert.ok(s >= WS_SILENCE - 0.5 && s <= WS_SILENCE + 3, `closed after ${s.toFixed(1)} s`);
  // a socket that answers the pings is not: it is still open after the same time
  const b = sock();
  await b.opened;
  b.ws.send(hello('Eve', token('e')));
  await b.next('welcome');
  await new Promise((ok) => setTimeout(ok, (WS_SILENCE + 2) * 1000));
  assert.equal(b.ws.readyState, WebSocket.OPEN);
  b.ws.close(); await b.closed;
});

test('a session on the WebSocket transport says hello again by itself when the server comes back from a restart', async () => {
  const t = new WsTransport(serverUrl(base)!), s = new Session(t), got: S2C[] = [], closes: string[] = [];
  t.onClose = (c) => { closes.push(c); };
  s.join({ name: 'Gus', token: token('9'), password: PASSWORD, view: 8, build: 'test' });
  for (const k of ['welcome', 'error'] as const) s.on(k, (m) => { got.push(m); });
  const until = async (f: () => boolean, ms: number): Promise<void> => {
    const end = Date.now() + ms;
    while (!f()) { if (Date.now() > end) throw new Error('timed out; got ' + got.map((m) => m.t + ('code' in m ? ' ' + m.code : '')).join(', ')); s.pump(); await new Promise((ok) => setTimeout(ok, 20)); }
  };
  try {
    await until(() => got.some((m) => m.t === 'welcome'), 5000);
    const boot = (got[0] as S2C & { t: 'welcome' }).boot, port = new URL(base).port;
    await halt();
    await until(() => got.some((m) => m.t === 'error'), 5000);
    assert.equal((got.at(-1) as { code: string }).code, 'shutdown');
    assert.ok(closes.includes('retrying') && t.state !== 'closed', 'a shutdown is not final');
    await serve(port);
    await until(() => got.filter((m) => m.t === 'welcome').length === 2, 20000);
    const w = got.at(-1) as S2C & { t: 'welcome' };
    assert.notEqual(w.boot, boot, 'another start of the server');
    assert.equal(s.joins, 2); assert.equal(t.state, 'open'); assert.equal(s.welcomed, true);
  } finally { t.close(); }
});

// last: it shuts this address out for a minute
test('a wrong password is refused with `password`, and after five wrong ones in a minute so is the right one', async () => {
  for (let i = 0; i < PASSWORD_TRIES; i++) {
    const a = sock();
    await a.opened;
    a.ws.send(hello('Fay', token('f'), i === 0 ? '' : 'wrong' + i));
    const c = await a.closed;
    assert.equal(errorOf(a), 'password'); assert.equal(c.reason, 'password');
    assert.equal(a.got.some((m) => m.t === 'welcome'), false);
  }
  const b = sock();
  await b.opened;
  b.ws.send(hello('Fay', token('f')));
  await b.closed;
  assert.equal(errorOf(b), 'password');
  assert.match((b.got.find((m) => m.t === 'error') as { msg: string }).msg, /Too many/);
});

/** A socket of the browser's shape that the test drives by hand. */
class FakeSocket {
  readyState = 0; binaryType = ''; sent: unknown[] = []; closed = false;
  onopen: (() => void) | null = null; onmessage: ((e: { data: unknown }) => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(readonly url: string) {}
  send(d: unknown): void { this.sent.push(d); }
  close(): void { this.closed = true; this.readyState = 3; }
  open(): void { this.readyState = 1; this.onopen?.(); }
  say(m: object): void { this.onmessage?.({ data: JSON.stringify(m) }); }
  end(): void { this.readyState = 3; this.onclose?.(); }
}
function fakeWire() {
  let now = 0;
  const socks: FakeSocket[] = [], timers: { at: number; fn: () => void }[] = [];
  const env = {
    open: (url: string) => { const w = new FakeSocket(url); socks.push(w); return w as unknown as globalThis.WebSocket; },
    now: () => now,
    setTimer: (fn: () => void, ms: number) => { const t = { at: now + ms, fn }; timers.push(t); return t; },
    clearTimer: (h: unknown) => { const i = timers.indexOf(h as never); if (i >= 0) timers.splice(i, 1); },
  };
  /** Let `ms` of time pass, running each timer when its time comes. */
  const pass = (ms: number): void => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift(); now = t.at; t.fn();
    }
    now = end;
  };
  return { env, socks, pass };
}

test('the WebSocket transport retries with a growing backoff, counts only its newest socket, and stops on a final error', () => {
  const { env, socks, pass } = fakeWire();
  const t = new WsTransport('ws://h:1/ws', env), got: string[] = [], closes: string[] = [];
  t.onMessage = (m) => { got.push(m.t === 'error' ? 'error ' + m.code : m.t); };
  t.onClose = (c) => { closes.push(c); };
  let opens = 0;
  t.onOpen = () => { opens++; };
  assert.equal(socks.length, 1); assert.equal(t.state, 'connecting');
  socks[0].open();
  assert.equal(t.state, 'open'); assert.equal(opens, 1);
  socks[0].say({ t: 'welcome' });
  // nothing for 6 s: the socket is given up (at the next look, once a second) and the next one dialled 0.5 s later
  pass(7000);
  assert.deepEqual(closes, ['retrying']); assert.equal(socks.length, 1);
  pass(500);
  assert.deepEqual(closes, ['retrying']); assert.ok(socks[0].closed);
  assert.equal(socks.length, 2);
  // the old socket's last words arrive late, among them the `replaced` meant for whoever took over: none of it counts
  socks[0].say({ t: 'chat' }); socks[0].say({ t: 'error', code: 'replaced', msg: '' }); socks[0].end();
  assert.deepEqual(got, ['welcome']); assert.equal(t.state, 'connecting');
  // a server that is down: 1, 2, 4, 8, then every 8 s
  const gaps: number[] = [];
  for (let i = 0; i < 6; i++) {
    const n = socks.length;
    socks[n - 1].end();
    let ms = 0;
    while (socks.length === n) { pass(100); ms += 100; }
    gaps.push(ms);
  }
  assert.deepEqual(gaps, [1000, 2000, 4000, 8000, 8000, 8000]);
  // taken in again: the backoff starts over
  const s = socks.at(-1)!;
  s.open(); s.say({ t: 'welcome' });
  assert.equal(opens, 2);
  s.say({ t: 'error', code: 'shutdown', msg: '' }); s.end();
  const n = socks.length;
  pass(500);
  assert.equal(socks.length, n + 1, 'after a welcome the first retry is 0.5 s again');
  // a final error on the newest socket ends it for good
  const f = socks.at(-1)!;
  f.open(); f.say({ t: 'error', code: 'password', msg: '' }); f.end();
  assert.equal(t.state, 'closed'); assert.equal(t.final, 'password'); assert.equal(closes.at(-1), 'password');
  pass(60000);
  assert.equal(socks.length, n + 1, 'no retry after a final error');
  t.send({ t: 'chat', text: 'x' });
  assert.equal(f.sent.length, 0);
});

test('a server address is taken as the player types it', () => {
  assert.equal(serverUrl('192.168.1.20:8080'), 'ws://192.168.1.20:8080/ws');
  assert.equal(serverUrl('http://box.lan:9000/'), 'ws://box.lan:9000/ws');
  assert.equal(serverUrl('ws://box.lan:9000/ws'), 'ws://box.lan:9000/ws');
  assert.equal(serverUrl('https://box.example'), 'wss://box.example/ws');
  assert.equal(serverUrl('  '), null);
  assert.equal(serverUrl('ftp://x'), null);
});
