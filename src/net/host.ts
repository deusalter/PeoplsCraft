// A host owns one simulation: its clock, its connections, its storage and its chunk source. The Node
// server, the solo worker and the page that runs the simulation in its own thread each make exactly one.
//
// Nothing reaches the simulation unchecked or outside a step. What a connection sends waits in its
// inbox; a step drains every inbox (rate caps, checkC2S, then the handler, each message inside its own
// try / catch), runs one simulation step (or only chunk loading and arrivals while a solo world
// stands still), and flushes what each connection is due in the order of the protocol.
import { BLOCKS } from '../data/blocks';
import { stOf } from '../sim/actions';
import type { ChunkSource } from '../sim/chunksource';
import { STEP } from '../sim/clock';
import { cleanName, playerIdOf } from '../sim/identity';
import { LOCAL_ID } from '../sim/migrate';
import type { SimPlayer } from '../sim/player';
import { findSpawn } from '../sim/rules';
import { Sim, playerInfo } from '../sim/sim';
import type { Storage, WorldRecord } from '../sim/storage';
import { EditMaps, SIM_RADIUS } from '../sim/voxels';
import { Climate } from '../world/gen/climate';
import { ChunkService } from './hostchunks';
import { SnapService } from './hostsnap';
import { BUF_SLOW, type C2S, type C2SOf, CHAT_PER_5S, CHUNKS_BURST, CHUNKS_PER_SEC, type ErrorCode, HELLO_WITHIN, IDLE_CLOSE, MOVE_BYTES, MSG_MOVE, PASSWORD_TRIES, PASSWORD_WINDOW,
  type PlayerInfo, PROTO, RATE, RATE_CLOSE, dataHash } from './protocol';
import type { Conn, HostEnv } from './transport';
import { checkC2S } from './validate';

export interface HostOptions {
  /** The id a world made here is saved under (the storage already knows which world it holds). */
  id?: string;
  name: string; seed: number; seedText: string;
  cheats: boolean; password: string | null; maxPlayers: number; viewMax: number;
  /** 'manual': the host steps only when it is told to. */
  clock: 'real' | 'manual';
  /** Seconds between two saves when nothing asks for one sooner; 0 for none. */
  saveEvery: number;
  /** One player on a local connection: the world stands still while that player is not in play, and a new world belongs to it. */
  solo?: boolean;
}

interface Bucket { n: number; over: number }
/** One connection as the host holds it. */
interface Link {
  c: Conn;
  p: SimPlayer | null;
  inbox: unknown[];
  closed: boolean;
  /** A hello has been taken from it. */
  hello: boolean;
  rate: Record<string, Bucket>;
  /** Steps at which `chunks` and `chat` messages arrived, inside their windows. */
  /** The `chunks` bucket: tokens, and the wall time (ms) they were counted at. */
  chunksN: number; chunksMs: number; chatAt: number[];
}

const STEP_MS = STEP * 1000;
/** Most steps one wake of the real clock runs before it gives the backlog up. */
const CATCH_UP = 5;
const SAVE_GAP_MS = 1000, SAVE_RETRY_MS = 10000;
/** A solo world saves this long after an item, a container, a block, a block entity, a flag or the quest index changed (8.2). */
const CHANGE_SAVE_MS = 3000;
const SEQ_KIND: Record<string, 1> = { op: 1, edit: 1, use: 1, item: 1, fire: 1 };

/** Equal, in time that depends only on the longer length. */
function same(a: string, b: string): boolean {
  let d = a.length ^ b.length;
  for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

export class SimHost {
  sim!: Sim;
  readonly stats = { tickMs: new Float32Array(3600), saveMs: 0, players: 0, stepErrors: 0 };
  private edits!: EditMaps; private chunks!: ChunkService; private snap!: SnapService;
  /** Connections in the order they were made. */
  private links: Link[] = [];
  private bound = new Map<SimPlayer, Link>();
  /** Record ids whose player record is on its way from storage, and the connection that will get the player. */
  private joining = new Map<string, { link: Link; name: string }>();
  private loads = new Set<Promise<void>>();
  private fails = new Map<string, { n: number; t: number }>();
  private readonly boot = Math.floor(Math.random() * 0x7fffffff);
  private steps = 0;
  private paused = false; private timer: unknown = null; private due = 0; private stopped = false;
  private saving: Promise<void> | null = null; private saveWanted = false; private saveTimer: unknown = null;
  private saveStart = -1e9; private saveEnd = 0; private savedTick = -1;
  /** The solo save after a change: its timer, and what the inventories, flags and guide were when it was last looked at. */
  private changeTimer: unknown = null; private seenRev = new WeakMap<SimPlayer, number>(); private seenFlags = -1; private seenQuest = -1;
  private saveFailed = false;

  constructor(private env: HostEnv, private storage: Storage, private source: ChunkSource, readonly opt: HostOptions) {}

  /** Open the world (or make a new one), build the simulation, start the clock. */
  async start(): Promise<void> {
    const o = this.opt, env = this.env;
    let world = await this.storage.open();
    if (!world) world = this.newWorld();
    this.edits = new EditMaps(this.storage, world.palettes);
    this.sim = new Sim(world, { cheats: o.cheats, maxPlayers: o.maxPlayers, solo: !!o.solo, manual: o.clock === 'manual' }, {
      sink: { emit: (to, e) => this.snap.emit(to, e), send: (slot, m) => this.snap.send(slot, m), broadcast: (m) => this.snap.broadcast(m) },
      chunks: this.source, edits: this.edits, log: (level, msg) => env.log(level, msg), requestSave: () => this.requestSave(),
    });
    this.snap = new SnapService(this.sim);
    this.chunks = new ChunkService(this.sim, this.edits, o.viewMax);
    this.saveEnd = env.now(); this.savedTick = this.sim.tick;
    this.changed();
    if (o.clock === 'real') { this.due = env.now() + STEP_MS; this.wake(); }
  }
  private newWorld(): WorldRecord {
    const o = this.opt, owner = o.solo ? LOCAL_ID : null, now = Date.now();
    return {
      format: 2, id: o.id ?? 'world', name: o.name, seed: o.seed, seedText: o.seedText, created: now, played: now, owner,
      palettes: [BLOCKS.map((b) => b.key)], names: {},
      state: { clock: 0.06, tick: 0, rnd: (o.seed ^ 0x5bd1e995) | 0, flags: [], quest: 0, events: { a: null, k: 0, g: 0, l: -10 }, homes: [],
        worldSpawn: findSpawn(new Climate(o.seed)), gates: [], summons: [], owed: {} },
    };
  }

  // ---- connections ----

  /** Called by the listener for every new connection. */
  connect(c: Conn): void {
    const rate: Record<string, Bucket> = {};
    for (const k of Object.keys(RATE)) rate[k] = { n: RATE[k as keyof typeof RATE][1], over: -1 };
    const l: Link = { c, p: null, inbox: [], closed: false, hello: false, rate, chunksN: CHUNKS_BURST, chunksMs: this.env.now(), chatAt: [] };
    this.links.push(l);
    c.onMessage = (m) => {
      if (l.closed) return;
      // a local client's words to the host itself are not the simulation's and do not wait for a step
      const t = c.local && m !== null && typeof m === 'object' ? (m as { t?: unknown }).t : undefined;
      if (t === 'step' || t === 'pause' || t === 'save') this.control(l, m); else l.inbox.push(m);
    };
    c.onBinary = (b) => { if (!l.closed) l.inbox.push(b); };
    c.onClose = () => this.gone(l);
    if (!c.local) this.env.setTimer(() => { if (!l.hello && !l.closed) this.kick(l, 'proto', 'no hello'); }, HELLO_WITHIN * 1000);
  }
  private control(l: Link, raw: unknown): void {
    const m = checkC2S(raw);
    if (!m) { this.kick(l, 'proto', 'malformed message'); return; }
    if (m.t === 'step') { if (this.opt.clock === 'manual') void this.stepManual(m.n).then(() => { if (!l.closed) l.c.send({ t: 'stepped', tick: this.sim.tick }); }); }
    else if (m.t === 'pause') { this.paused = m.on; if (m.on) this.requestSave(); else this.due = this.env.now() + STEP_MS; }
    else if (m.t === 'save') {
      // "save now" means with everything this client has said so far, whether or not a step has come to take it
      this.take(l);
      void this.save();
    }
  }
  /** The other end went away. */
  private gone(l: Link): void {
    if (l.closed) return;
    const p = l.p;
    this.forget(l);
    if (p && this.bound.get(p) === l) { this.bound.delete(p); this.sim.leave(p, 'drop'); }
  }
  /** Take a connection out of the host's books. What it still had queued is discarded. */
  private forget(l: Link): void {
    l.closed = true; l.inbox.length = 0;
    const i = this.links.indexOf(l);
    if (i >= 0) this.links.splice(i, 1);
    if (this.chunks) { this.chunks.detach(l.c); this.snap.detach(l.c); }
  }
  /** Close a connection from this side. Its player, if it is still bound to it, starts its grace. */
  private drop(l: Link, code: string): void {
    if (l.closed) return;
    const p = l.p;
    this.forget(l);
    if (p && this.bound.get(p) === l) { this.bound.delete(p); this.sim.leave(p, 'drop'); }
    l.c.close(code);
  }
  private kick(l: Link, code: ErrorCode, msg: string): void {
    if (l.closed) return;
    l.c.send({ t: 'error', code, msg });
    this.drop(l, code);
  }

  private nameTaken(id: string, name: string): boolean {
    const n = name.toLowerCase();
    for (const [k, v] of Object.entries(this.sim.world.names)) if (k !== id && v.name.toLowerCase() === n) return true;
    for (const [k, v] of this.joining) if (k !== id && v.name.toLowerCase() === n) return true;
    return false;
  }
  /** 4.2: one player per record id, whatever the sockets do. Synchronous up to the one read of storage. */
  private hello(l: Link, m: C2SOf<'hello'>): void {
    const c = l.c, sim = this.sim, o = this.opt, env = this.env;
    l.hello = true;
    if (m.proto !== PROTO) return this.kick(l, 'version', 'This page is older than the game it reached. Reload to update.');
    if (m.data !== dataHash()) return this.kick(l, 'data', 'This page is older than the game it reached. Reload to update.');
    if (o.password !== null && !c.local) {
      const f = this.fails.get(c.addr), now = env.now();
      if (f && f.n >= PASSWORD_TRIES && now - f.t < PASSWORD_WINDOW * 1000) return this.kick(l, 'password', 'Too many wrong passwords. Wait a minute.');
      if (!same(m.password ?? '', o.password)) {
        if (f && now - f.t < PASSWORD_WINDOW * 1000) f.n++; else this.fails.set(c.addr, { n: 1, t: now });
        return this.kick(l, 'password', 'Wrong password.');
      }
    }
    let id: string, name: string;
    if (c.local) { id = sim.world.owner ?? LOCAL_ID; name = cleanName(m.name) ?? 'Player'; }
    else {
      const pid = playerIdOf(m.token), n = cleanName(m.name);
      if (!pid) return this.kick(l, 'proto', 'bad token');
      if (!n) return this.kick(l, 'name_invalid', 'A name is 1 to 16 letters, digits, spaces, _ or -.');
      if (this.nameTaken(pid, n)) return this.kick(l, 'name_taken', 'That name belongs to someone else here.');
      id = pid; name = n;
    }
    const j = this.joining.get(id);
    if (j) {
      // a load for this id is under way: the newest connection inherits it
      const old = j.link;
      j.link = l; j.name = name;
      this.kick(old, 'replaced', 'Joined from somewhere else.');
      return;
    }
    const p = sim.players.get(id);
    if (p) {
      if (p.parked && sim.seated() + this.joining.size >= o.maxPlayers) return this.kick(l, 'full', 'The world is full.');
      const old = this.bound.get(p);
      // what the older connection had under way (a window, a dig, a sleep) ends as if it had dropped
      if (old) { this.bound.delete(p); this.kick(old, 'replaced', 'Joined from somewhere else.'); sim.leave(p, 'drop'); }
      // `nameTaken` reads the world's list: the new name is held, and the old one free, from here on
      p.name = name; sim.world.names[id] = { name, seen: sim.world.names[id]?.seen ?? 0 };
      sim.resume(p); this.bind(p, l);
      return;
    }
    if (sim.seated() + this.joining.size >= o.maxPlayers) return this.kick(l, 'full', 'The world is full.');
    const entry = { link: l, name };
    this.joining.set(id, entry);
    const load: Promise<void> = this.storage.loadPlayer(id).then((rec) => {
      this.joining.delete(id);
      if (!entry.link.closed) this.bind(sim.join(id, entry.name, rec, entry.link.c.local), entry.link);
    }, (e) => {
      this.joining.delete(id);
      env.log('error', `player ${id} could not be loaded: ${e instanceof Error ? e.message : String(e)}`);
      this.kick(entry.link, 'proto', 'Your character could not be read.');
    }).finally(() => { this.loads.delete(load); });
    this.loads.add(load);
  }
  /** Tie a connection to its player: whatever an older connection was told or had queued no longer counts. */
  private bind(p: SimPlayer, l: Link): void {
    const sim = this.sim, o = this.opt, c = l.c, b = p.body, s = sim.shared;
    p.online = true; p.epoch++; p.ackSeq = 0; p.moveSeq = 0;
    l.p = p; this.bound.set(p, l);
    this.chunks.onRealmChange(c); this.snap.attach(c, p);
    const players: PlayerInfo[] = [];
    for (const q of sim.players.values()) if (q.online) players.push(playerInfo(q));
    c.send({
      t: 'welcome', proto: PROTO, boot: this.boot, you: { slot: p.slot, id: p.id }, world: { name: sim.world.name, seed: sim.seed, seedText: sim.world.seedText },
      dim: p.dim, pos: [b.x, b.y, b.z, b.yaw, b.pitch], tp: p.tp, tick: sim.tick, clock: s.clock, flags: [...sim.flags], quest: s.quest,
      event: { a: s.events.a, k: s.events.k, g: s.events.g }, spawn: [s.worldSpawn[0], s.worldSpawn[1]],
      cfg: { cheats: c.local || o.cheats, simRadius: SIM_RADIUS, viewMax: o.viewMax, maxPlayers: o.maxPlayers }, players,
    });
    sim.sink.send(p.slot, stOf(sim, p, true)!);
    sim.sink.send(p.slot, sim.statsNow(p));
    sim.sink.broadcast({ t: 'pl', add: [playerInfo(p)] });
    this.env.log('info', `${p.name} joined (${c.local ? 'local' : c.addr})`);
  }

  // ---- one step ----

  /** True when `kind` has a token left for this connection; a bucket empty for RATE_CLOSE seconds closes it. */
  private allow(l: Link, kind: keyof typeof RATE): boolean {
    const b = l.rate[kind];
    if (b.n >= 1) { b.n--; b.over = -1; return true; }
    if (b.over < 0) b.over = this.steps;
    else if (this.steps - b.over >= RATE_CLOSE * 60) this.kick(l, 'rate', 'Too many messages.');
    return false;
  }
  /** At most `max` arrivals inside the last `ticks` steps. */
  private window(at: number[], ticks: number, max: number): boolean {
    while (at.length && this.steps - at[0] >= ticks) at.shift();
    if (at.length >= max) return false;
    at.push(this.steps);
    return true;
  }
  /** The `chunks` bucket fills by the wall clock: messages bunched by a stall of the link, or drained by a host that runs
   *  behind, are counted by the time that passed and not by the steps that took them. */
  private chunksAllowed(l: Link): boolean {
    const now = this.env.now();
    l.chunksN = Math.min(CHUNKS_BURST, l.chunksN + (Math.max(0, now - l.chunksMs) / 1000) * CHUNKS_PER_SEC);
    l.chunksMs = now;
    if (l.chunksN < 1) return false;
    l.chunksN--;
    return true;
  }
  private refill(l: Link): void {
    for (const k of Object.keys(RATE) as (keyof typeof RATE)[]) { const b = l.rate[k]; b.n = Math.min(RATE[k][1], b.n + RATE[k][0] * STEP); }
  }

  private one(l: Link, raw: unknown): void {
    const sim = this.sim, c = l.c;
    if (raw instanceof ArrayBuffer) {
      const p = l.p;
      if (!p) { if (!l.hello) this.kick(l, 'proto', 'hello first'); return; }
      if (raw.byteLength !== MOVE_BYTES || new Uint8Array(raw, 0, 1)[0] !== MSG_MOVE) { this.kick(l, 'proto', 'not a movement message'); return; }
      if (this.bound.get(p) !== l || (!c.local && !this.allow(l, 'move'))) return;
      sim.handleMove(p, new DataView(raw));
      return;
    }
    const m: C2S | null = checkC2S(raw);
    if (!m) { this.kick(l, 'proto', 'malformed message'); return; }
    if (m.t === 'hello') { if (l.hello) this.kick(l, 'proto', 'a second hello'); else this.hello(l, m); return; }
    const p = l.p;
    // between a hello and its welcome there is no player to act for
    if (!p) { if (!l.hello) this.kick(l, 'proto', 'hello first'); return; }
    if (this.bound.get(p) !== l) return;
    if ('seq' in m && m.seq !== p.ackSeq + 1) { this.kick(l, 'proto', 'sequence out of order'); return; }
    if (!c.local) {
      if (SEQ_KIND[m.t]) {
        if (!this.allow(l, 'seq')) {
          // never dropped: it counts as refused, and the `st` of this step acknowledges it
          const seq = (m as { seq: number }).seq;
          p.ackSeq = seq; p.invDirty = true;
          if (m.t === 'edit' || m.t === 'use') sim.sink.send(p.slot, { t: 'rej', seq, cells: [] });
          return;
        }
      } else if (m.t === 'chunks') { if (!this.chunksAllowed(l)) { this.kick(l, 'rate', 'Too many chunk requests.'); return; } }
      else if (m.t === 'chat') { if (!this.window(l.chatAt, 300, CHAT_PER_5S)) return; }
      else if (m.t in RATE && !this.allow(l, m.t as keyof typeof RATE)) return;
    }
    switch (m.t) {
      case 'chunks': this.chunks.onChunks(c, p, m); break;
      case 'cmd': if (m.text.trim() === 'tickstats' && (c.local || this.opt.cheats)) sim.sink.send(p.slot, { t: 'cmdr', id: m.id, text: this.tickStats() }); else sim.handle(p, m); break;
      case 'bye': this.bound.delete(p); sim.leave(p, 'bye'); this.requestSave(); this.drop(l, 'bye'); break;
      // a remote client has no say over the host's clock or its saves
      case 'step': case 'pause': case 'save': break;
      default: sim.handle(p, m);
    }
  }
  /** Apply what one connection has queued, in arrival order, each message inside its own try / catch. */
  private take(l: Link): void {
    const q = l.inbox;
    if (!q.length) return;
    l.inbox = [];
    for (const raw of q) {
      if (l.closed) break;
      try { this.one(l, raw); } catch (e) {
        this.env.log('error', `message from ${l.p?.name ?? l.c.addr} failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
        this.kick(l, 'proto', 'The host could not handle a message.');
      }
    }
  }
  private drain(): void {
    for (const l of [...this.links]) {
      if (!l.c.local) this.refill(l);
      this.take(l);
    }
  }
  /** What each connection is due, in the order of the protocol: state, live block changes, fx, edit sets, snapshot. */
  private flush(): void {
    const snap = this.snap, chunks = this.chunks, n = this.steps;
    for (const l of [...this.links]) {
      const c = l.c;
      if (!l.p || l.closed) continue;
      if (c.buffered > BUF_SLOW) { this.kick(l, 'slow', 'The connection cannot keep up.'); continue; }
      snap.flushState(c); chunks.flushLive(c); snap.flushFx(c); chunks.flushCe(c); snap.flushSnap(c, n);
    }
  }
  /** One step now: inboxes, the simulation (or only its chunk loading and arrivals while it stands still), then the flush.
   *  It does not wait for storage; `stepManual` does. */
  step(): void {
    const env = this.env, sim = this.sim, t0 = env.now();
    this.steps++;
    this.drain();
    // from the newest back: a connection closed here leaves the list
    for (let i = this.links.length - 1; i >= 0; i--) {
      const l = this.links[i], p = l.p;
      if (!p || l.closed) continue;
      this.chunks.tick(l.c, p);
      if (!p.local && !p.loading && sim.tick - p.lastMoveTick >= IDLE_CLOSE * 60) { this.bound.delete(p); sim.leave(p, 'bye'); this.kick(l, 'idle', 'No movement for 30 seconds.'); }
    }
    try { if (sim.running()) sim.step(); else sim.prepare(); } catch (e) {
      this.stats.stepErrors++;
      env.log('error', `step ${sim.tick} failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    }
    try { this.flush(); } catch (e) {
      this.stats.stepErrors++;
      env.log('error', `flush after step ${sim.tick} failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    }
    this.stats.tickMs[this.steps % 3600] = env.now() - t0;
    this.stats.players = sim.online();
    const o = this.opt;
    if (o.solo && this.changeTimer === null && !this.saveFailed && this.changed()) {
      this.changeTimer = env.setTimer(() => { this.changeTimer = null; this.requestSave(); }, CHANGE_SAVE_MS);
    }
    if (o.saveEvery > 0 && sim.tick !== this.savedTick && env.now() - this.saveEnd >= o.saveEvery * 1000) this.saveWanted = true;
    if (this.saveWanted) this.saveSoon();
  }
  /** Something a save must not lose has changed since the last look: an inventory (a container is a block entity), an edit
   *  map, a flag, the guide. Position, clock and vitals alone are not; the 30 s save carries them. */
  private changed(): boolean {
    const sim = this.sim;
    let moved = sim.flags.size !== this.seenFlags || sim.shared.quest !== this.seenQuest;
    this.seenFlags = sim.flags.size; this.seenQuest = sim.shared.quest;
    // a player who has just come in brings an inventory read from its record: nothing to save yet
    for (const p of sim.players.values()) {
      const r = this.seenRev.get(p);
      if (r !== undefined && r !== p.inv.rev) moved = true;
      this.seenRev.set(p, p.inv.rev);
    }
    if (moved) return true;
    for (const e of this.edits.values()) if (e.dirty) return true;
    return false;
  }
  /** Step times over the last 3,600 steps (6.6 item 3), in ms. */
  tickStats(): string {
    const t = this.stats.tickMs, n = Math.min(this.steps, 3600), a = Array.from(this.steps >= 3600 ? t : t.subarray(1, n + 1)).sort((x, y) => x - y);
    if (!n) return 'no steps yet';
    const q = (f: number): string => a[Math.min(n - 1, Math.floor(f * n))].toFixed(2);
    return `steps ${n}  p50 ${q(0.5)}  p95 ${q(0.95)}  p99 ${q(0.99)}  max ${a[n - 1].toFixed(2)} ms  save ${this.stats.saveMs.toFixed(1)} ms`;
  }
  /** Manual clock: `n` steps, each after every storage read issued so far has come back, so that what a step finds
   *  loaded does not depend on how fast the storage answered. */
  async stepManual(n: number): Promise<void> {
    for (let i = 0; i < n && !this.stopped; i++) {
      while (this.edits.loads || this.loads.size) { await this.edits.idle(); await Promise.allSettled([...this.loads]); }
      this.step();
    }
  }
  private wake = (): void => {
    if (this.stopped) return;
    const env = this.env, now = env.now();
    if (!this.paused) {
      let n = 0;
      while (now >= this.due && n < CATCH_UP) { this.step(); this.due += STEP_MS; n++; }
      if (now >= this.due) { env.log('warn', `the clock fell ${Math.round(now - this.due)} ms behind: skipped`); this.due = now + STEP_MS; }
    }
    // a paused clock looks again a step from now rather than spinning on a `due` that no longer moves
    this.timer = env.setTimer(this.wake, this.paused ? STEP_MS : Math.max(1, this.due - env.now()));
  };

  // ---- saving ----

  /** Ask for a save soon. Requests are coalesced: one save starts at most once a second, between two steps. */
  requestSave(): void { this.saveWanted = true; this.saveSoon(); }
  private saveSoon(): void {
    if (this.saving || this.saveTimer !== null || this.stopped) return;
    const wait = this.saveStart + SAVE_GAP_MS - this.env.now();
    // from a timer, never from inside the step that asked
    this.saveTimer = this.env.setTimer(() => { this.saveTimer = null; if (this.saveWanted && !this.saving) void this.save(); }, Math.max(0, wait));
  }
  /** The only save there is: every changed record as it stands at this instant, committed together. One at a time. */
  save(): Promise<void> {
    if (this.saving) return this.saving.then(() => this.save());
    const env = this.env, sim = this.sim, t0 = env.now();
    this.saveWanted = false; this.saveStart = t0;
    const acks = new Map<Link, number>();
    for (const l of this.links) if (l.p && l.c.local) acks.set(l, l.p.ackSeq);
    const batch = sim.takeDirty(false, Date.now()), tick = sim.tick;
    const run = this.storage.commit(batch).then(() => '', (e) => (e instanceof Error ? e.message : String(e)) || 'failed').then((err) => {
      const ok = err === '';
      sim.committed(batch, ok);
      this.stats.saveMs = env.now() - t0; this.saveEnd = env.now(); this.saving = null;
      this.saveFailed = !ok;
      if (ok) this.savedTick = tick;
      else { env.log('error', 'save failed: ' + err); env.setTimer(() => this.requestSave(), SAVE_RETRY_MS); }
      for (const [l, seq] of acks) if (!l.closed) l.c.send(ok ? { t: 'saved', ok, seq } : { t: 'saved', ok, seq, err });
      if (this.saveWanted) this.saveSoon();
    });
    this.saving = run;
    return run;
  }
  /** A last save, then the storage is closed. */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) this.env.clearTimer(this.timer);
    if (this.saveTimer !== null) { this.env.clearTimer(this.saveTimer); this.saveTimer = null; }
    if (this.changeTimer !== null) { this.env.clearTimer(this.changeTimer); this.changeTimer = null; }
    for (const l of [...this.links]) this.kick(l, 'shutdown', 'The host is stopping.');
    await this.save();
    await this.storage.close();
    this.source.dispose();
  }
}
