// Scenario abuse (11, stage 4): while a bystander bot plays, the server is sent malformed JSON of every message type,
// out-of-range and aliasing chunk coordinates, `chunks.full` for 16 far chunks 12 times a second, 1,024 far `sub`
// entries 12 times a second, and two sockets say `hello` with one token in the same tick. The server stays up, its
// step p99 stays under 10 ms over the whole of it, and one SimPlayer exists for the token said twice.
import { MAX_BIN, MOVE_BYTES, MSG_MOVE, PROTO, type S2C, dataHash } from '../../src/net/protocol';
import { checkC2S } from '../../src/net/validate';
import { Bot } from '../bot/bot';
import type { Ctx } from '../bot/runner';

type Msg = Record<string, unknown>;
/** One well-formed message of every type a client may send; the variants below are made from these. */
const SAMPLES: Msg[] = [
  { t: 'hello', proto: PROTO, build: '0.1.0', data: 0, name: 'x', token: 'x', view: 4 },
  { t: 'ready', tp: 0 },
  { t: 'chunks', dim: 0, sub: [0, 0, 1], unsub: [1, 1], full: [0, 0] },
  { t: 'dig', on: true, x: 0, y: 60, z: 0 },
  { t: 'edit', seq: 1, k: 0, x: 0, y: 60, z: 0, id: 1 },
  { t: 'use', seq: 1, x: 0, y: 60, z: 0, id: 1 },
  { t: 'talk', id: 1 },
  { t: 'item', seq: 1, slot: 0, at: [0, 60, 0], ax: true },
  { t: 'atk', id: 1, d: [1, 0, 0] },
  { t: 'fire', seq: 1, o: [0, 60, 0], d: [1, 0, 0] },
  { t: 'op', seq: 1, o: 'quick', v: [0, 0], e: '' },
  { t: 'op', seq: 1, o: 'click', v: [4, 3], r: false, e: '' },
  { t: 'respawn' },
  { t: 'chat', text: 'hi' },
  { t: 'cmd', id: 1, text: 'help' },
  { t: 'ping', x: 0, y: 60, z: 0 },
  { t: 'rtt', c: 1, last: 0 },
  { t: 'bye' },
  { t: 'step', n: 1 },
  { t: 'pause', on: true },
  { t: 'save' },
];
/** What a field is replaced with: the wrong type, nothing, nesting, numbers JSON can only spell as text, out of range. */
const BAD: string[] = ['"x"', 'null', '[[[]]]', '{}', '1e309', '-1e309', '9007199254740993', '-1', '0.5', 'true', '"' + 'A'.repeat(300) + '"'];

/** Text frames for one sample: cut short, an extra field, no `t`, `t` of the wrong type, and each field replaced. */
function variants(m: Msg): string[] {
  const j = JSON.stringify(m), out = [j.slice(0, Math.max(2, j.length - 3)), JSON.stringify({ ...m, extra: 1 }), JSON.stringify({ ...m, t: undefined }), j.replace(`"t":"${m.t}"`, '"t":7'), '[' + j + ']'];
  for (const k of Object.keys(m)) {
    if (k === 't') continue;
    for (const b of BAD) out.push(j.replace(new RegExp(`"${k}":(\\[[^\\]]*\\]|"[^"]*"|[^,}]*)`), `"${k}":${b}`));
  }
  return out;
}
/** Out of range and aliasing coordinates: past CHUNK_MAX, and pairs whose packed key (cx + 32768) * 65536 + (cz + 32768)
 *  lands on a chunk in range. */
const CHUNK_BAD: Msg[] = [
  { t: 'chunks', dim: 0, sub: [31251, 0, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [0, -31251, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [0, 32768, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [-1, 98304, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [65536, 0, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [2147483648, 0, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [4294967296, 0, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [0, 0, 65536], unsub: [] },
  { t: 'chunks', dim: 0, sub: [], unsub: [32768, 0] },
  { t: 'chunks', dim: 0, sub: [], unsub: [], full: [0, -32769] },
  { t: 'chunks', dim: 0, sub: [], unsub: [], full: [1e6, 1e6] },
  { t: 'chunks', dim: 3, sub: [0, 0, 1], unsub: [] },
  { t: 'chunks', dim: -1, sub: [0, 0, 1], unsub: [] },
  { t: 'chunks', dim: 0, sub: [0, 0], unsub: [] },
  { t: 'chunks', dim: 0, sub: new Array(3 * 1025).fill(0), unsub: [] },
  { t: 'chunks', dim: 0, sub: [], unsub: [], full: new Array(2 * 17).fill(0) },
];
/** Binary frames that are not a movement message, and one that is shaped like one but says nothing a body can be. */
function binaries(): ArrayBuffer[] {
  const out = [0, 1, MOVE_BYTES - 1, MOVE_BYTES + 1, MAX_BIN, MAX_BIN + 1, 4096].map((n) => { const b = new ArrayBuffer(n); if (n) new Uint8Array(b)[0] = MSG_MOVE; return b; });
  const wrong = new ArrayBuffer(MOVE_BYTES); new Uint8Array(wrong)[0] = 9; out.push(wrong);
  const nan = new ArrayBuffer(MOVE_BYTES), v = new DataView(nan);
  v.setUint8(0, MSG_MOVE); v.setFloat64(4, NaN, true); v.setFloat32(12, Infinity, true); v.setFloat64(16, -1e300, true);
  out.push(nan);
  return out;
}

interface Raw { ws: WebSocket; got: S2C[]; closed: Promise<string>; welcome: Promise<boolean> }
/** A bare socket that says hello with this token; `welcome` says whether it was let in. */
function rawJoin(base: string, name: string, token: string, hello = true): Raw {
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  ws.binaryType = 'arraybuffer';
  const got: S2C[] = [];
  let said = '';
  const closed = new Promise<string>((ok) => { ws.onclose = (e) => ok(said || `close ${e.code}`); });
  const welcome = new Promise<boolean>((ok) => {
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      const m = JSON.parse(e.data) as S2C;
      got.push(m);
      if (m.t === 'welcome') ok(true);
      if (m.t === 'error') { said = m.code; ok(false); }
    };
    void closed.then(() => ok(false));
  });
  if (hello) ws.onopen = () => ws.send(JSON.stringify(helloOf(name, token)));
  return { ws, got, closed, welcome };
}
const helloOf = (name: string, token: string): Msg => ({ t: 'hello', proto: PROTO, build: '0.1.0', data: dataHash(), name, token, view: 4 });
const within = <T>(p: Promise<T>, ms: number, dflt: T): Promise<T> => Promise.race([p, new Promise<T>((ok) => setTimeout(() => ok(dflt), ms))]);
const token = (seed: string): string => (seed + '0'.repeat(32)).replace(/[^0-9a-f]/g, 'a').slice(0, 32);

export default async function abuse(ctx: Ctx): Promise<void> {
  const watcher = ctx.bot(new Bot('Watcher'));
  await watcher.connect(ctx.url);
  await watcher.loaded();
  const wx = watcher.body.x, wz = watcher.body.z;
  // the bystander walks to and fro the whole time
  let walking = true;
  const walk = (async () => { for (let i = 0; walking; i++) await watcher.goto(wx + (i % 2 ? 0 : 4), wz, 15000).catch(() => {}); })();
  const fFull = ctx.bot(new Bot('FloodFull')), fSub = ctx.bot(new Bot('FloodSub'));
  await Promise.all([fFull.connect(ctx.direct), fSub.connect(ctx.direct)]);
  await Promise.all([fFull.loaded(), fSub.loaded()]);
  const s0 = await ctx.stats(), snaps0 = watcher.counts.snapshots, t0 = performance.now();
  ctx.log(`bystander in play; host at ${s0.steps} steps, ${s0.simPlayers} players`);

  // the floods, for as long as the malformed messages take and 10 s at least
  let flooding = true;
  const full: number[] = [], sub: number[] = [];
  for (let i = 0; i < 16; i++) full.push(5000 + i, 5000);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) sub.push(5000 + i, 6000 + j, 1);
  let fullN = 0, subN = 0;
  const flood = setInterval(() => {
    if (!flooding) return;
    fFull.raw({ t: 'chunks', dim: 0, sub: [], unsub: [], full }); fullN++;
    fSub.raw({ t: 'chunks', dim: 0, sub, unsub: [] }); subN++;
  }, 1000 / 12);

  // malformed messages of every type, each on a socket of its own that has been let in first
  // a hello is judged as the first frame of a socket; everything else after a welcome
  const frames: { what: string; data: string | ArrayBuffer; bad: boolean; first?: boolean }[] = [];
  for (const m of SAMPLES) for (const v of variants(m)) {
    let parsed: unknown;
    try { parsed = JSON.parse(v); } catch { parsed = undefined; }
    frames.push({ what: `${m.t} ${v.slice(0, 60)}`, data: v, bad: parsed === undefined || !checkC2S(parsed), first: m.t === 'hello' });
  }
  for (const m of CHUNK_BAD) frames.push({ what: 'chunks ' + JSON.stringify(m).slice(0, 60), data: JSON.stringify(m), bad: true });
  for (const b of binaries()) frames.push({ what: `binary ${b.byteLength} bytes`, data: b, bad: b.byteLength !== MOVE_BYTES || new Uint8Array(b)[0] !== MSG_MOVE });
  ctx.log(`${frames.length} malformed frames, ${frames.filter((f) => f.bad).length} of them refused by checkC2S or the frame rules`);
  const missed: string[] = [], lanes = 4;
  let refused = 0;
  const queue = [...frames];
  await Promise.all(Array.from({ length: lanes }, async (_, lane) => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const r = rawJoin(ctx.direct, `Abuser${lane}`, token('ab' + lane), !f.first);
      if (f.first) await new Promise<void>((ok) => { r.ws.onopen = () => ok(); });
      else if (!(await within(r.welcome, 5000, false))) { missed.push(`${f.what}: not let in (${r.got.map((m) => m.t).join(' ')})`); r.ws.close(); continue; }
      r.ws.send(f.data);
      const end = await within(r.closed, f.bad ? 3000 : 300, 'open');
      if (f.bad) { if (end === 'proto') refused++; else missed.push(`${f.what}: ended with ${end}`); }
      r.ws.close();
      await within(r.closed, 1000, '');
    }
  }));
  ctx.check(missed.length === 0, `every malformed frame closed its socket with proto (${refused} of ${frames.filter((f) => f.bad).length})${missed.length ? ':\n    ' + missed.slice(0, 12).join('\n    ') : ''}`);
  while (performance.now() - t0 < 10000) await watcher.wait(250);
  flooding = false; clearInterval(flood);
  ctx.check(ctx.alive(), 'the server is up after the malformed frames and the floods');
  ctx.log(`floods sent: ${fullN} chunks.full of 16 and ${subN} subs of 1,024; FloodFull closed with [${fFull.counts.errors.join(' ')}], FloodSub with [${fSub.counts.errors.join(' ')}]`);

  // two sockets, one token, hello in the same tick
  const twin = token('7717'), a = rawJoin(ctx.direct, 'Twin', twin, false), b = rawJoin(ctx.direct, 'Twin', twin, false);
  await Promise.all([new Promise<void>((ok) => { a.ws.onopen = () => ok(); }), new Promise<void>((ok) => { b.ws.onopen = () => ok(); })]);
  a.ws.send(JSON.stringify(helloOf('Twin', twin))); b.ws.send(JSON.stringify(helloOf('Twin', twin)));
  const [wa, wb] = await Promise.all([within(a.welcome, 5000, false), within(b.welcome, 5000, false)]);
  await watcher.wait(1000);
  const live = [a, b].filter((r) => r.ws.readyState === 1);
  ctx.log(`twin sockets: welcomed ${wa} ${wb}; first got [${a.got.map((m) => m.t === 'error' ? 'error ' + m.code : m.t).filter((t) => t !== 'pl').slice(0, 6).join(' ')}], ` +
    `second got [${b.got.map((m) => m.t === 'error' ? 'error ' + m.code : m.t).filter((t) => t !== 'pl').slice(0, 6).join(' ')}]`);
  ctx.check(live.length === 1, `one of the two sockets with one token is left open (${live.length})`);

  walking = false;
  await walk;
  const s1 = await ctx.stats(), win = await ctx.stats(Math.max(1, s1.steps - s0.steps));
  const secs = (performance.now() - t0) / 1000, snapRate = (watcher.counts.snapshots - snaps0) / secs;
  ctx.check(s1.names.filter((n) => n === 'Twin').length === 1, `one SimPlayer for the token said twice (${s1.names.filter((n) => n === 'Twin').length})`);
  ctx.check(s1.simPlayers === 3 + lanes + 1, `the host holds ${s1.simPlayers} players, one per token used (${[...new Set(s1.names)].join(', ')})`);
  ctx.check(win.p99 < 10, `step p99 over the ${win.n} steps of the abuse is ${win.p99.toFixed(2)} ms (max ${win.max.toFixed(2)} ms)`);
  ctx.check(s1.stepErrors === 0, `no step failed (${s1.stepErrors})`);
  ctx.check(snapRate > 15, `the bystander had ${snapRate.toFixed(1)} snapshots a second`);
  ctx.check(watcher.counts.corrections === 0 && watcher.counts.rej === 0 && watcher.counts.errors.length === 0,
    `the bystander was not corrected, refused or closed (${watcher.counts.corrections} corrections, ${watcher.counts.rej} rej, closed [${watcher.counts.errors.join(' ')}])`);
  a.ws.close(); b.ws.close();
}
