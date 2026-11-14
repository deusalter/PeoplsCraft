// The built server as a friend would run it: the client and the server built into a folder of their own,
// `node server/main.js` started there on a free port with a password, and spoken to over plain http and
// real WebSockets, and by headless Chrome through the join screen. The keepalive case waits out the 10 s of
// silence the protocol allows. The `npm start` case runs the start script of package.json in a folder of its own.
// Every test has a time limit: a socket the server should have closed and did not fails the test, never hangs it.
import assert from 'node:assert/strict';
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { type AddressInfo, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { type BrowserContext, type Page, chromium } from 'playwright-core';
import { WebSocket } from 'ws';
import { Session } from '../../src/client/session';
import { MAX_JSON, PASSWORD_TRIES, PROTO, type S2C, WS_SILENCE, dataHash } from '../../src/net/protocol';
import { WsTransport, serverUrl } from '../../src/net/ws-client';
import { stepFaults } from '../../server/main';

const root = resolve('.'), out = resolve('out/servertest'), PASSWORD = 'lantern';
/** Beside the client folder, so that a path that climbs out of it by one step would find it. */
const OUTSIDE = 'outside.txt';
let server: ChildProcess, base = '', data = '';
const logs: string[] = [];
const START = (port: string, password = PASSWORD): string[] => [join(out, 'server', 'main.js'), '--data', join(data, 'world'), '--port', port, '--host', '127.0.0.1', '--password', password, '--max-players', '8'];

function build(): void {
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  for (const args of [['build', '--outDir', join(out, 'client'), '--logLevel', 'warn'], ['build', '-c', 'vite.server.config.ts', '--outDir', join(out, 'server'), '--logLevel', 'warn']]) {
    const r = spawnSync(process.execPath, [vite, ...args], { cwd: root, stdio: 'inherit' });
    assert.equal(r.status, 0, 'vite ' + args.join(' '));
  }
}

before(async () => {
  build();
  writeFileSync(join(out, OUTSIDE), 'not to be served');
  data = mkdtempSync(join(tmpdir(), 'pc-server-'));
  // every player of this file holds a slot until its linger ends: 8 is room for all of them
  base = await serve('0');
});
/** Start the built server; resolves with its origin once it listens. */
function serve(port: string, password?: string): Promise<string> {
  logs.length = 0;
  server = spawn(process.execPath, START(port, password), { cwd: out, stdio: ['ignore', 'pipe', 'pipe'] });
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
function sock(opt: { autoPong?: boolean; origin?: string } = {}): Sock {
  const ws = new WebSocket((opt.origin ?? base).replace('http:', 'ws:') + '/ws', { autoPong: opt.autoPong ?? true });
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
/** `p`, or a failure that says `what` once `ms` have passed. */
function within<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([p, new Promise<never>((_, no) => { t = setTimeout(() => no(new Error(what)), ms); })]).finally(() => clearTimeout(t));
}
/** The status of a GET for `path` sent exactly as written: `fetch` would resolve every `..` before it sends. */
function rawGet(path: string): Promise<number> {
  const u = new URL(base);
  return new Promise((ok, no) => {
    const r = request({ host: u.hostname, port: u.port, path, method: 'GET' }, (res) => { res.resume(); ok(res.statusCode ?? 0); });
    r.on('error', no); r.end();
  });
}
const S = 1000;

test('the client files are served from the same port, with the caching the protocol asks for', { timeout: 30 * S }, async () => {
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
  // nothing outside the client folder, however the climb is spelled
  for (const p of ['/../' + OUTSIDE, '/%2e%2e/' + OUTSIDE, '/..%2f' + OUTSIDE, '/%2e%2e%2f' + OUTSIDE, '/assets/../../' + OUTSIDE, '/assets/%2e%2e/%2e%2e/' + OUTSIDE])
    assert.equal(await rawGet(p), 404, p);
  assert.equal(await rawGet('/index.html'), 200, 'the raw request itself reaches the server');
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('a server started without --harness answers none of the harness questions', { timeout: 30 * S }, async () => {
  for (const path of ['/hash?dim=0&cx0=0&cz0=0&cx1=0&cz1=0', '/stats', '/stats?last=10', '/ent?dim=0&x=0&y=0&z=0', '/mobs?dim=0', '/homes', '/players', '/shared']) {
    const r = await fetch(base + path);
    assert.equal(r.status, 404, path);
    assert.equal(await r.text(), 'Not found');
  }
});

test('a hello with a good token and the password is welcomed, and the player is put in the world', { timeout: 30 * S }, async () => {
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

test('an oversized frame closes the socket with `proto`, text or binary', { timeout: 30 * S }, async () => {
  const a = sock();
  await a.opened;
  a.ws.send('{"t":"chat","text":"' + 'x'.repeat(MAX_JSON) + '"}');
  const c = await a.closed;
  assert.equal(errorOf(a), 'proto'); assert.equal(c.reason, 'proto');
  // the 16 KB cap on its own, after hello, with a chat the host would take at any size: JSON whitespace pads it
  const padded = (n: number): string => { const s = '{"t":"chat","text":"hi"}'; return s.slice(0, -1) + ' '.repeat(n - s.length) + '}'; };
  const j = sock();
  await j.opened;
  j.ws.send(hello('Bea', token('b')));
  await j.next('welcome');
  j.ws.send(padded(MAX_JSON));
  assert.equal(((await j.next('chat')) as S2C & { t: 'chat' }).text, 'hi', 'a message of exactly 16 KB is taken');
  j.ws.send(padded(MAX_JSON + 1));
  const jc = await j.closed;
  assert.equal(errorOf(j), 'proto'); assert.equal(jc.reason, 'proto');
  assert.match((j.got.find((m) => m.t === 'error') as { msg?: string }).msg ?? '', /too large/, 'refused for its size, not its content');
  // and the 64-byte binary cap: the host refuses a wrong-sized move as well, so the reason tells the two apart
  const b = sock();
  await b.opened;
  b.ws.send(hello('Bea', token('b')));
  await b.next('welcome');
  b.ws.send(new Uint8Array(65));
  await b.closed;
  assert.equal(errorOf(b), 'proto');
  assert.match((b.got.find((m) => m.t === 'error') as { msg?: string }).msg ?? '', /too large/, 'refused for its size, not its content');
  // and a frame far beyond every limit is cut off by the socket layer itself
  const d = sock();
  await d.opened;
  d.ws.send('x'.repeat(200 * 1024));
  assert.equal((await d.closed).code, 1009);
});

test('a second socket with the same token replaces the first', { timeout: 30 * S }, async () => {
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

test('a silent socket is closed by the keepalive', { timeout: 60 * S }, async () => {
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

// A name that is not this machine's loopback, as a LAN address is to a friend's browser: a page from it is not a secure context.
const LAN = 'peopls-host.test';
/** Headless Chrome with the flags the smoke harness uses, so that the page's WebGL starts as it does there. */
async function chrome(): Promise<{ ctx: BrowserContext; page: Page; errors: string[]; close(): Promise<void> }> {
  const profile = mkdtempSync(join(tmpdir(), 'pc-servertest-chrome-'));
  writeFileSync(join(profile, 'Local State'), JSON.stringify({ performance_tuning: { battery_saver_mode: { state: 0 } } }));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: true, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--mute-audio', `--host-resolver-rules=MAP ${LAN} 127.0.0.1`],
  });
  const page = ctx.pages()[0] ?? await ctx.newPage(), errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // a socket refused while a test holds the server down is Chrome's report of what the test did, not the page's error
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 404|^WebSocket connection to .* failed/.test(m.text() + (m.location().url ?? ''))) errors.push(m.text()); });
  return { ctx, page, errors, close: async () => { await ctx.close(); rmSync(profile, { recursive: true, force: true }); } };
}
// the title menu is `#menu.solid`; the game's own pause menu is a hidden `#menu`
const inPlay = (page: Page, ms = 60000): Promise<unknown> =>
  page.waitForFunction(() => !!document.getElementById('hud') && !document.querySelector('#menu.solid'), null, { timeout: ms });
const said = (page: Page, text: string, ms = 20000): Promise<unknown> =>
  page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout: ms });

test('a page the server served offers to join it, refuses a wrong password on the join screen, and plays with the right one through a restart', { timeout: 240 * S }, async () => {
  const b = await chrome();
  try {
    const { page } = b, lan = `http://${LAN}:${new URL(base).port}`;
    await page.goto(lan + '/', { waitUntil: 'load' });
    assert.equal(await page.evaluate(() => isSecureContext), false, 'plain http from a LAN host');
    await page.getByRole('button', { name: 'Join Peopls Craft' }).click();
    await said(page, 'Peopls Craft · 0 of 8 playing');
    assert.equal(await page.locator('#menu input[placeholder="Address (host:port)"]').count(), 0, 'the address is the page\'s own');
    await page.locator('#menu input[placeholder="Your name"]').fill('Hal');
    await page.locator('#menu input[type=password]').fill('not-it');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await said(page, 'Wrong password.');
    assert.equal(await page.locator('#menu input[placeholder="Your name"]').inputValue(), 'Hal', 'the join screen again, with the name kept');
    await page.locator('#menu input[type=password]').fill(PASSWORD);
    await page.locator('#menu input[type=password]').press('Enter');
    await inPlay(page);
    const kept = await page.evaluate(() => ({ token: localStorage.getItem('peopls.token'), name: localStorage.getItem('peopls.name') }));
    assert.match(kept.token ?? '', /^[0-9a-f]{32}$/);
    assert.equal(kept.name, 'Hal');
    assert.match(logs.join(''), /Hal joined \(127\.0\.0\.1\)/);

    const port = new URL(base).port;
    await halt();
    await said(page, 'Connection lost. Reconnecting...');
    await serve(port);
    await page.waitForFunction(() => !document.body.innerText.includes('Connection lost.'), null, { timeout: 30000 });
    assert.match(logs.join(''), /Hal joined/, 'joined the new boot by itself');
    assert.equal(await page.locator('#menu.solid').count(), 0, 'still in play, not sent back to the title');

    // the same browser loads the page again: the same token, the name offered
    await page.goto(lan + '/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Join Peopls Craft' }).click();
    assert.equal(await page.locator('#menu input[placeholder="Your name"]').inputValue(), 'Hal');
    assert.equal(await page.evaluate(() => localStorage.getItem('peopls.token')), kept.token);
    assert.deepEqual(b.errors, []);
  } finally { await b.close(); }
});

test('`?server=` opens the join screen with an address field, and `&name=` joins at once', { timeout: 180 * S }, async () => {
  const b = await chrome();
  try {
    const { page } = b;
    await page.goto(base + '/?server=', { waitUntil: 'load' });
    const addr = page.locator('#menu input[placeholder="Address (host:port)"]');
    await addr.waitFor();
    await page.locator('#menu input[placeholder="Your name"]').fill('Ivy');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await said(page, 'Which server?');
    await addr.fill('ftp://x');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await said(page, 'That is not an address.');
    // nobody listens there: the screen says it keeps trying, and Cancel gives up
    const shut = createServer();
    await new Promise<void>((ok) => shut.listen(0, '127.0.0.1', ok));
    const nobody = `127.0.0.1:${(shut.address() as AddressInfo).port}`;
    await new Promise((ok) => shut.close(ok));
    await addr.fill(nobody);
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await said(page, 'Cannot reach the server. Trying again...');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await addr.waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('peopls.server')), nobody);

    const host = new URL(base).host;
    await page.goto(`${base}/?server=${host}&name=Ivy&password=${PASSWORD}`, { waitUntil: 'load' });
    await inPlay(page);
    assert.match(logs.join(''), /Ivy joined/);
    assert.deepEqual(b.errors, []);
  } finally { await b.close(); }
});

test('a game whose reconnect is refused for good takes down the reconnecting banner and offers the way back', { timeout: 180 * S }, async () => {
  const b = await chrome(), port = new URL(base).port;
  try {
    const { page } = b;
    await page.goto(`${base}/?server=${new URL(base).host}&name=Rue&password=${PASSWORD}`, { waitUntil: 'load' });
    await inPlay(page);
    await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 60000 });
    await halt();
    await said(page, 'Connection lost. Reconnecting...');
    // the server comes back asking another password: the retry is answered `password`, which is final
    await serve(port, 'another-one');
    await page.waitForFunction(() => document.querySelector('#loading .msg')?.textContent === 'Wrong password.', null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Reconnecting')), false, 'no banner says it is still reconnecting');
    await page.getByRole('button', { name: 'Back to the title' }).click();
    await said(page, 'Wrong password.');
    await page.locator('#menu input[placeholder="Your name"]').waitFor({ timeout: 20000 });
    assert.deepEqual(b.errors, []);
  } finally { await b.close(); await halt(); await serve(port); }
});

test('on a server the pause menu keeps the player in the world, asks no save of it, and quitting to the title says `bye`', { timeout: 180 * S }, async () => {
  // another player, still on its loading screen, hears every roster change: `pl del` comes only when a player is parked
  const o = sock();
  await o.opened;
  o.ws.send(hello('Oto', token('7')));
  await o.next('welcome');
  const b = await chrome(), problems: string[] = [], dialogs: string[] = [];
  try {
    const { page } = b;
    page.on('dialog', (d) => { dialogs.push(d.type()); void d.accept(); });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Join Peopls Craft' }).click();
    await page.locator('#menu input[placeholder="Your name"]').fill('Pia');
    await page.locator('#menu input[type=password]').fill(PASSWORD);
    await page.locator('#menu input[type=password]').press('Enter');
    await inPlay(page);
    await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 60000 });
    const slot = (o.got.filter((m) => m.t === 'pl').flatMap((m) => (m as S2C & { t: 'pl' }).add ?? []).find((q) => q.name === 'Pia'))?.slot;
    assert.ok(slot, 'the other player was told of Pia');
    const parks = (): number => o.got.filter((m) => m.t === 'pl' && !!(m as S2C & { t: 'pl' }).del?.includes(slot)).length;
    // a hotbar choice: one sequenced message, which a server never reports saved
    await page.keyboard.press('Digit2');
    await new Promise((ok) => setTimeout(ok, 1000));
    await page.keyboard.press('Escape');
    const paused = Date.now();
    await said(page, 'PAUSED');
    await new Promise((ok) => setTimeout(ok, 6500));
    const line = await page.locator('#menu .saved').innerText();
    if (/Saving|Could not save/.test(line)) problems.push(`the pause screen waits on a save the server never answers: "${line}"`);
    await new Promise((ok) => setTimeout(ok, Math.max(0, paused + 34 * S - Date.now())));
    if (parks()) problems.push('the paused player was parked for idling');
    const joins = (logs.join('').match(/Pia joined/g) ?? []).length;
    if (joins !== 1) problems.push(`Pia joined ${joins} times`);
    // the game's own handler runs first: what it asked of the browser is in the event when this one sees it
    await page.evaluate(() => addEventListener('beforeunload', (e) => sessionStorage.setItem('asked', String(e.defaultPrevented))));
    const quit = Date.now(), before = parks();
    await page.getByRole('button', { name: 'Save and quit to title' }).click();
    await page.getByRole('button', { name: 'Join Peopls Craft' }).waitFor({ timeout: 20000 });
    const took = Date.now() - quit;
    if (took > 3000) problems.push(`quitting to the title took ${took} ms`);
    if (dialogs.length || await page.evaluate(() => sessionStorage.getItem('asked')) !== 'false') problems.push('leaving asked to stay for changes that may not be saved');
    const end = Date.now() + 3000;
    while (parks() === before && Date.now() < end) await new Promise((ok) => setTimeout(ok, 50));
    if (parks() === before) problems.push('quitting to the title left the player lingering instead of parking it');
    assert.deepEqual(problems, []);
    assert.deepEqual(b.errors, []);
  } finally { await b.close(); o.ws.close(); }
});

test('a session on the WebSocket transport says hello again by itself when the server comes back from a restart', { timeout: 90 * S }, async () => {
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

test('a socket that sends more than 2,000 frames in a second is closed with `rate` at once, and 1,500 in a second are let be', { timeout: 30 * S }, async () => {
  const rtt = JSON.stringify({ t: 'rtt', c: 1, last: 0 });
  const a = sock();
  await a.opened;
  a.ws.send(hello('Kit', token('1')));
  await a.next('welcome');
  for (let i = 0; i < 1500; i++) a.ws.send(rtt);
  await new Promise((ok) => setTimeout(ok, 1500));
  assert.equal(a.ws.readyState, WebSocket.OPEN, 'under the backstop, and the host\'s own caps only drop rtt');
  a.ws.close(); await a.closed;

  const b = sock();
  await b.opened;
  b.ws.send(hello('Lou', token('2')));
  await b.next('welcome');
  const t0 = Date.now();
  for (let i = 0; i < 2500; i++) b.ws.send(rtt);
  const c = await within(b.closed, 5 * S, 'a flood of 2,500 frames was not closed');
  assert.equal(errorOf(b), 'rate'); assert.equal(c.reason, 'rate');
  // the host's own buckets would close only after 3 s of excess
  assert.ok(c.at - t0 < 2 * S, `closed after ${c.at - t0} ms`);
});

/** A preload for the built server: SIGUSR2 makes it throw, or reject a promise, outside every handler of its own. */
const FAULT = 'data:text/javascript,' + encodeURIComponent(
  "process.on('SIGUSR2', () => { if (process.env.PC_FAULT === 'reject') Promise.reject(new Error('planted rejection')); else setTimeout(() => { throw new Error('planted exception'); }); });");
for (const [mode, why] of [['throw', 'an uncaught exception'], ['reject', 'an unhandled rejection']] as const) {
  test(`${why} takes the shutdown path: the players are told \`shutdown\`, and the process exits with code 2`, { timeout: 60 * S }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pc-fault-'));
    const p = spawn(process.execPath, ['--import', FAULT, join(out, 'server', 'main.js'), '--data', join(dir, 'world'), '--port', '0', '--host', '127.0.0.1'],
      { cwd: out, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PC_FAULT: mode } });
    let said = '';
    const exited = new Promise<number | null>((ok) => p.on('exit', (c) => ok(c)));
    try {
      const origin = await within(new Promise<string>((ok) => {
        const read = (d: Buffer): void => { said += d.toString(); const m = /listening on (http:\/\/[^/\s]+)\//.exec(said); if (m) ok(m[1]); };
        p.stdout!.on('data', read); p.stderr!.on('data', read);
      }), 20 * S, 'the server did not listen:\n' + said);
      const a = sock({ origin });
      await a.opened;
      a.ws.send(hello('Mo', token('3')));
      await a.next('welcome');
      p.kill('SIGUSR2');
      const rc = await within(exited, 15 * S, 'the server did not exit:\n' + said);
      assert.equal(rc, 2, said);
      assert.equal(errorOf(a), 'shutdown', 'told before the socket closed; got ' + a.got.map((m) => m.t).join(' '));
      assert.match(said, new RegExp('stopping: ' + why));
      assert.match(said, mode === 'reject' ? /planted rejection/ : /planted exception/);
    } finally {
      if (p.exitCode === null) p.kill('SIGKILL');
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('20 failed steps inside a minute call for the shutdown, 19 do not, and old failures age out', () => {
  let f = stepFaults();
  assert.equal(f(0, 0), false);
  assert.equal(f(19, 1000), false);
  assert.equal(f(19, 50000), false);
  assert.equal(f(20, 59000), true, 'the 20th inside the minute of the first');
  f = stepFaults();
  f(10, 0);
  assert.equal(f(19, 30000), false);
  assert.equal(f(20, 61000), false, 'the first ten are more than a minute old');
  assert.equal(f(29, 62000), false);
  assert.equal(f(30, 62000), true, 'nine at 30 s, one at 61 s and ten at 62 s');
});

// last: it shuts this address out for a minute
test('a wrong password is refused with `password`, and after five wrong ones in a minute so is the right one', { timeout: 30 * S }, async () => {
  for (let i = 0; i < PASSWORD_TRIES; i++) {
    const a = sock();
    await a.opened;
    a.ws.send(hello('Fay', token('f'), i === 0 ? '' : 'wrong' + i));
    const c = await within(a.closed, 5 * S, `wrong password ${i + 1} was not closed; got ${a.got.map((m) => m.t).join(' ')}`);
    assert.equal(errorOf(a), 'password'); assert.equal(c.reason, 'password');
    assert.equal(a.got.some((m) => m.t === 'welcome'), false);
  }
  const b = sock();
  await b.opened;
  b.ws.send(hello('Fay', token('f')));
  await within(b.closed, 5 * S, `the right password after ${PASSWORD_TRIES} wrong ones was not closed; got ${b.got.map((m) => m.t).join(' ')}`);
  assert.equal(b.got.some((m) => m.t === 'welcome'), false);
  assert.equal(errorOf(b), 'password');
  assert.match((b.got.find((m) => m.t === 'error') as { msg: string }).msg, /Too many/);
});

test('`npm start` builds when the build is missing or older than a source, and otherwise runs the server it has', { timeout: 240 * S }, async () => {
  // The start script as package.json has it, in a folder of its own whose `build` copies this file's build and counts.
  const dir = mkdtempSync(join(tmpdir(), 'pc-start-')), pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  pkg.scripts = { start: pkg.scripts.start, build: `echo x >> builds && mkdir -p dist && cp -R ${JSON.stringify(join(out, 'client'))} ${JSON.stringify(join(out, 'server'))} dist/` };
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
  const builds = (): number => { try { return readFileSync(join(dir, 'builds'), 'utf8').split('\n').filter(Boolean).length; } catch { return 0; } };
  const start = async (): Promise<void> => {
    const p = spawn('npm', ['start', '--', '--data', join(dir, 'world'), '--port', '0', '--host', '127.0.0.1', '--name', 'Start test'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let said = '';
    try {
      const origin = await new Promise<string>((ok, no) => {
        const t = setTimeout(() => no(new Error('npm start did not listen:\n' + said)), 30000);
        const read = (d: Buffer): void => { said += d.toString(); const m = /listening on (http:\/\/[^/\s]+)\//.exec(said); if (m) { clearTimeout(t); ok(m[1]); } };
        p.stdout!.on('data', read); p.stderr!.on('data', read);
        p.on('exit', (c) => { clearTimeout(t); no(new Error(`npm start exited (${c}):\n` + said)); });
      });
      const page = await fetch(origin + '/');
      assert.equal(page.status, 200);
      assert.match(await page.text(), /<canvas/);
      assert.equal(((await (await fetch(origin + '/info')).json()) as { name: string }).name, 'Start test', 'the flags after -- reach the server');
    } finally {
      const gone = new Promise((ok) => p.once('exit', ok));
      try { process.kill(-p.pid!, 'SIGTERM'); } catch { /* already gone */ }
      await Promise.race([gone, new Promise((ok) => setTimeout(ok, 5000))]);
      try { process.kill(-p.pid!, 'SIGKILL'); } catch { /* already gone */ }
    }
  };
  try {
    await start();
    assert.equal(builds(), 1, 'no build yet: built');
    await start();
    assert.equal(builds(), 1, 'a build newer than every source: run as it is');
    mkdirSync(join(dir, 'src'));
    const later = new Date(Date.now() + 60000);
    writeFileSync(join(dir, 'src', 'edited.ts'), '');
    utimesSync(join(dir, 'src', 'edited.ts'), later, later);
    await start();
    assert.equal(builds(), 2, 'a source newer than the build: built again');
  } finally { rmSync(dir, { recursive: true, force: true }); }
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

test('a hidden page dials again only once it is shown, whatever closed it', () => {
  const { env, socks, pass } = fakeWire();
  let hidden = true;
  const shown: (() => void)[] = [];
  const t = new WsTransport('ws://h:1/ws', { ...env, hidden: () => hidden, onShown: (fn) => { shown.push(fn); } }), closes: string[] = [];
  t.onClose = (c) => { closes.push(c); };
  const idle = (w: FakeSocket): void => { w.open(); w.say({ t: 'welcome' }); w.say({ t: 'error', code: 'idle', msg: '' }); w.end(); };
  idle(socks[0]);
  assert.deepEqual(closes, ['retrying']); assert.equal(t.state, 'retrying');
  assert.equal(shown.length, 1, 'waits for the page to be shown');
  pass(120000);
  assert.equal(socks.length, 1, 'no socket while nobody looks');
  hidden = false;
  shown[0]();
  pass(499);
  assert.equal(socks.length, 1);
  pass(1);
  assert.equal(socks.length, 2, 'shown: dialled after the first backoff');
  // shown, an idle close retries at once
  idle(socks[1]);
  assert.equal(shown.length, 1);
  pass(500);
  assert.equal(socks.length, 3);
  // hidden again: a socket taken in while nobody looks would hold a seat, loading, that no frame ever readies
  hidden = true;
  const w = socks[2];
  w.open(); w.say({ t: 'welcome' }); w.say({ t: 'error', code: 'shutdown', msg: '' }); w.end();
  assert.equal(shown.length, 2, 'a shutdown waits for the page too');
  pass(120000);
  assert.equal(socks.length, 3, 'no socket while nobody looks');
  hidden = false;
  shown[1]();
  pass(500);
  assert.equal(socks.length, 4);
  // a drop seen while shown, with the page hidden before its backoff is out: the dial waits for the page
  socks[3].open(); socks[3].say({ t: 'welcome' }); socks[3].end();
  hidden = true;
  pass(60000);
  assert.equal(socks.length, 4, 'hidden when the backoff ran out: no dial');
  assert.equal(shown.length, 3);
  hidden = false;
  shown[2]();
  assert.equal(socks.length, 5, 'shown: dialled at once, its backoff already waited');
  t.close();
});

test('a server address is taken as the player types it', () => {
  assert.equal(serverUrl('192.168.1.20:8080'), 'ws://192.168.1.20:8080/ws');
  assert.equal(serverUrl('http://box.lan:9000/'), 'ws://box.lan:9000/ws');
  assert.equal(serverUrl('ws://box.lan:9000/ws'), 'ws://box.lan:9000/ws');
  assert.equal(serverUrl('https://box.example'), 'wss://box.example/ws');
  assert.equal(serverUrl('  '), null);
  assert.equal(serverUrl('ftp://x'), null);
});
