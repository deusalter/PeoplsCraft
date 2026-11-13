// A headless player (10.2): the client without the view. The connection, the session, the block store, the
// inventory channel and the block hands are the browser's own modules; the body is the simulation's PlayerBody,
// driven at 60 Hz by keys a script holds. Terrain comes from genChunk run here for the chunks within RADIUS of the
// bot, which it subscribes to and keeps as the browser does.
import { BlockClient } from '../../src/client/blocks';
import { InvClient } from '../../src/client/invclient';
import { type MoveState, Session, moveFlags } from '../../src/client/session';
import { BLOCKS, T_LIQUID, T_REPLACE, T_SOLID } from '../../src/data/blocks';
import { item } from '../../src/data/items';
import { MOB_LIST } from '../../src/data/mobs';
import { ClientVoxels, VoxChunk } from '../../src/net/clientvoxels';
import { type C2S, MOVE_EVERY, type S2C, type S2COf, type Vec3 } from '../../src/net/protocol';
import { type SnapMob, type SnapPlayer, type Snapshot, decodeSnapshot } from '../../src/net/snapshot';
import { WsTransport, serverUrl } from '../../src/net/ws-client';
import { type InputState, PlayerBody } from '../../src/sim/body';
import { STEP } from '../../src/sim/clock';
import { genChunk, hashBlocks } from '../../src/sim/genjob';
import type { InvOp } from '../../src/sim/invops';
import type { RayHit } from '../../src/sim/physics';
import { STREAMS, type Stream, Tap, type Wire } from './tap';

/** Chunks kept around the bot: 5 x 5, as 10.2 has it. */
export const RADIUS = 2;
const BUILD = '0.1.0';
const EYE = 1.62;

/** A cell the body can stand in, and the one it is reached from. */
export interface Reach { x: number; y: number; z: number; from: Reach | null }

class Keys implements InputState {
  private held = new Set<string>(); private edges = new Set<string>();
  down(c: string): boolean { return this.held.has(c); }
  hit(c: string): boolean { return this.edges.has(c); }
  press(c: string): void { if (!this.held.has(c)) this.edges.add(c); this.held.add(c); }
  release(c: string): void { this.held.delete(c); }
  releaseAll(): void { this.held.clear(); }
  endTick(): void { this.edges.clear(); }
}

/** What 10.2 counts, per bot. */
export interface BotCounts {
  /** `tp` messages that moved the bot while it was in play: the host's corrections. */
  corrections: number;
  rej: number; rejCells: number; rejEmpty: number;
  snapshots: number;
  welcomes: number;
  /** Blows and deaths the host reported. */
  hurt: number; deaths: number;
  /** Why the host closed connections, in order. */
  errors: string[];
}

export class Bot {
  readonly wire: Wire = { bytesIn: Object.fromEntries(STREAMS.map((s) => [s, 0])) as Record<Stream, number>, bytesOut: 0, heldUntil: 0 };
  readonly counts: BotCounts = { corrections: 0, rej: 0, rejCells: 0, rejEmpty: 0, snapshots: 0, welcomes: 0, hurt: 0, deaths: 0, errors: [] };
  readonly body = new PlayerBody();
  readonly vox = new ClientVoxels<VoxChunk>((cx, cz, key) => new VoxChunk(cx, cz, key));
  readonly keys = new Keys();
  session!: Session; transport!: WsTransport; invc!: InvClient; blocks!: BlockClient;
  /** Others as the latest snapshot has them, by slot; and the creatures. */
  players = new Map<number, SnapPlayer>(); mobs: SnapMob[] = []; snap: Snapshot | null = null;
  seed = 0; dim = 0; slot = 0; tpId = 0; ready = false; joined = false;
  flags = new Set<string>();
  /** Whether the body steps up one block by itself, as the setting does in the browser. */
  autoJump = true;
  /** Ticks run in play. */
  ticks = 0;
  private readySent = -1; private time = 0; private moveT = 0; private wasWet = false; private wasLava = false;
  private jumpsSent = 0; private jumpsSeen = 0; private moveMark = 0;
  private mv: MoveState = { tp: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: 0 };
  private taps = new Set<Tap>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private acc = 0; private lastT = 0; private frameN = 0;
  private task: (() => boolean) | null = null;
  private waiters: { test: () => boolean; ok: () => void }[] = [];
  private cmdN = 0; private cmds = new Map<number, (t: string) => void>();
  private welcomed: (() => void) | null = null; private failed: ((e: Error) => void) | null = null;

  constructor(readonly name: string, readonly token = randomToken()) {}

  // ---- connection -------------------------------------------------------------------------------------

  /** Join the server at `url` (`host:port`, `http://...` or `ws://...`); resolves on the welcome, rejects on a final error. */
  connect(url: string, password?: string, view = 4): Promise<void> {
    const ws = serverUrl(url);
    if (!ws) throw new Error('not an address: ' + url);
    this.transport = new WsTransport(ws, { open: (u) => new Tap(u, this.wire, this.taps) as unknown as WebSocket });
    const s = this.session = new Session(this.transport);
    this.vox.attach(s);
    this.invc = new InvClient(s, () => this.flags);
    this.blocks = new BlockClient({
      vox: this.vox, session: s, inv: this.invc, me: this.invc, body: this.body, autoTool: () => true,
      bodies: { blocked: (x, y, z) => this.blocked(x, y, z) },
      view: { burst: () => {}, play: () => {}, digTick: () => {} },
    });
    this.blocks.attach(s);
    s.mover = () => this.moveState();
    s.on('welcome', (m) => this.onWelcome(m));
    s.on('tp', (m) => this.onTp(m));
    s.on('rej', (m) => {
      this.counts.rej++; if (m.cells.length) this.counts.rejCells++; else this.counts.rejEmpty++;
      if (process.env.BOT_DEBUG) console.log(`${this.name}: rej ${m.seq} [${m.cells.join(' ')}] at ${this.body.x.toFixed(2)} ${this.body.y.toFixed(2)} ${this.body.z.toFixed(2)} ready ${this.ready} ack ${this.invc.sync.ack}`);
    });
    s.on('flags', (m) => { for (const f of m.add) this.flags.add(f); for (const f of m.del) this.flags.delete(f); });
    s.on('hurt', () => { this.counts.hurt++; });
    s.on('dead', (m) => { this.counts.deaths++; if (process.env.BOT_DEBUG) console.log(`${this.name}: dead (${m.cause})`); });
    s.on('cmdr', (m) => { const f = this.cmds.get(m.id); if (f) { this.cmds.delete(m.id); f(m.text); } });
    s.on('error', (m) => { this.counts.errors.push(m.code); this.ready = false; });
    s.onSnapshot((b) => {
      const snap = decodeSnapshot(b);
      if (!snap) return;
      this.counts.snapshots++; this.snap = snap;
      this.players = new Map(snap.players.map((p) => [p.slot, p])); this.mobs = snap.mobs;
    });
    this.transport.onClose = (code) => { if (code !== 'retrying' && this.failed) this.failed(new Error(`${this.name}: closed with ${code}`)); };
    s.join({ name: this.name, token: this.token, password, view, build: BUILD });
    this.lastT = performance.now();
    this.timer = setInterval(() => this.frame(), 4);
    return new Promise<void>((ok, no) => { this.welcomed = ok; this.failed = no; });
  }
  /** Resolves once the bot is in play: the host has put it down and its chunks are ready. */
  loaded(ms = 60000): Promise<void> { return this.until(() => this.ready && this.areaReady(), ms, 'loaded'); }
  /** Stop for good. */
  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.transport?.close();
  }
  /** Kill the socket, as a link that breaks does; the transport reconnects by itself. */
  drop(): void { for (const t of this.taps) t.kill(); }
  /** Stop reading and writing for `ms` without closing, as a dead link does; what was held then goes through. */
  silence(ms: number): void { this.wire.heldUntil = performance.now() + ms; }
  /** Send anything on the current socket: an object as JSON, a string or bytes as they are. */
  raw(m: unknown): void {
    const d = typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m);
    for (const t of this.taps) t.send(d);
  }
  /** Send a message through the session, as the game sends one that is not an action. */
  send(m: C2S): void { this.session.send(m); }
  on<T extends S2C['t']>(type: T, fn: (m: S2COf<T>) => void): void { this.session.on(type, fn); }

  // ---- what a player does -------------------------------------------------------------------------------

  look(yaw: number, pitch: number): void { this.body.yaw = yaw; this.body.pitch = Math.max(-1.5533, Math.min(1.5533, pitch)); }
  lookAt(x: number, y: number, z: number): void {
    const b = this.body, dx = x - b.x, dy = y - (b.y + EYE), dz = z - b.z;
    this.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
  }
  /** Walk to (x, z) along a path over the blocks this bot holds (steps up of one block, drops of up to three), or as
   *  near it as the ground allows; the last stretch is straight. */
  async goto(x: number, z: number, ms = 30000): Promise<void> {
    const end = performance.now() + ms, way = this.path(Math.floor(x), Math.floor(z));
    for (const [wx, wz] of way) await this.walk(wx + 0.5, wz + 0.5, Math.max(1000, end - performance.now()), 0.35);
    await this.walk(x, z, Math.max(1000, end - performance.now()), 0.2);
    await this.until(() => Math.hypot(this.body.vx, this.body.vz) < 0.05, 3000, 'stop');
  }
  /** Straight at (x, z) with W held until within `near`. */
  private walk(x: number, z: number, ms: number, near: number): Promise<void> {
    return this.run(() => {
      const b = this.body, dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz);
      if (d < near) { this.keys.release('KeyW'); return true; }
      b.yaw = Math.atan2(-dx, -dz);
      if (d < 0.6 && Math.hypot(b.vx, b.vz) > 2) this.keys.release('KeyW'); else this.keys.press('KeyW');
      return false;
    }, ms, `walk to ${x.toFixed(1)} ${z.toFixed(1)}`).catch((e: Error) => {
      const b = this.body;
      throw new Error(`${e.message}, stuck at ${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.z.toFixed(2)}`);
    });
  }
  /** Cells (x, z) to walk through from where the body stands towards (tx, tz), or towards the reachable cell nearest it. */
  path(tx: number, tz: number): [number, number][] {
    const f = this.flood(tx, tz);
    let best = f[0], bestD = Infinity;
    for (const c of f) { const d = Math.hypot(tx - c.x, tz - c.z); if (d < bestD) { bestD = d; best = c; } if (d === 0) break; }
    const out: [number, number][] = [];
    for (let c: Reach | null = best; c && c.from; c = c.from) out.push([c.x, c.z]);
    return out.reverse();
  }
  /** The cells the body can walk to from where it stands, nearest by walking first: steps up of one block with headroom,
   *  drops of up to three, over ground this bot holds, at most `max` cells; stops early at (tx, tz). `y` is the feet. */
  flood(tx = NaN, tz = NaN, max = 6000): Reach[] {
    const v = this.vox, b = this.body;
    const passable = (x: number, y: number, z: number): boolean => { const id = v.getBlock(x, y, z); return !T_SOLID[id] && !T_LIQUID[id]; };
    const standY = (x: number, z: number, y: number): number => {
      if (!v.ready(x, z)) return -1;
      for (const dy of [0, 1, -1, -2, -3]) {
        const fy = y + dy;
        if (T_SOLID[v.getBlock(x, fy - 1, z)] && passable(x, fy, z) && passable(x, fy + 1, z)) return fy;
      }
      return -1;
    };
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const start: Reach = { x: Math.floor(b.x), y: Math.round(b.y), z: Math.floor(b.z), from: null };
    const seen = new Set<number>([key(start.x, start.z)]), q: Reach[] = [start];
    for (let i = 0; i < q.length && q.length < max; i++) {
      const c = q[i];
      if (c.x === tx && c.z === tz) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, nz = c.z + dz, k = key(nx, nz);
        if (seen.has(k)) continue;
        const ny = standY(nx, nz, c.y);
        if (ny < 0 || (ny > c.y && !passable(c.x, c.y + 2, c.z))) continue;
        // a drop walks in at the old height and falls: the column must be open from there down to the new feet
        let open = true;
        for (let y = ny + 2; y <= c.y + 1 && open; y++) open = passable(nx, y, nz);
        if (!open) continue;
        seen.add(k); q.push({ x: nx, y: ny, z: nz, from: c });
      }
    }
    return q;
  }
  /** Dig the block at the cell for its break time, then break it, as a player holding the left button on it. */
  mine(x: number, y: number, z: number): Promise<void> {
    const id = this.vox.getBlock(x, y, z);
    if (!id) return Promise.reject(new Error(`${this.name}: nothing to mine at ${x} ${y} ${z}`));
    this.lookAt(x + 0.5, y + 0.5, z + 0.5);
    this.blocks.onDigStart(id);
    let progress = 0, on = false;
    return this.run(() => {
      if (this.vox.getBlock(x, y, z) !== id) { if (on) this.blocks.onDig(false, x, y, z); return true; }
      this.lookAt(x + 0.5, y + 0.5, z + 0.5);
      const bt = this.blocks.breakTime(id);
      if (bt === Infinity) throw new Error(`${this.name}: ${BLOCKS[id].key} cannot be broken`);
      if (!on) { this.blocks.onDig(true, x, y, z); on = true; }
      progress += bt <= 0 ? 1 : STEP / bt;
      if (progress < 1) return false;
      this.blocks.onBroken(x, y, z, id);
      this.blocks.onDig(false, x, y, z);
      return true;
    }, 20000, `mine ${x} ${y} ${z}`).then(() => this.settle());
  }
  /** Put the item `itemKey` (a block, in the hotbar) into the cell, against a face of a block beside it. */
  place(x: number, y: number, z: number, itemKey: string): Promise<void> {
    if (!this.placeNow(x, y, z, itemKey)) return Promise.reject(new Error(`${this.name}: could not place ${itemKey} at ${x} ${y} ${z}`));
    return this.settle();
  }
  /** Right-click the block at the cell (a chest, a door, a station). Resolves once the host has answered. */
  use(x: number, y: number, z: number): Promise<void> {
    const id = this.vox.getBlock(x, y, z), use = BLOCKS[id]?.use;
    if (!use) return Promise.reject(new Error(`${this.name}: ${BLOCKS[id]?.key ?? id} at ${x} ${y} ${z} has no use`));
    this.lookAt(x + 0.5, y + 0.5, z + 0.5);
    if (use === 'door') {
      const hit: RayHit = { hit: true, x, y, z, nx: 0, ny: 0, nz: 0, id, dist: 1 };
      if (!this.blocks.toggleDoor(hit)) return Promise.reject(new Error('door'));
    } else {
      const seq = this.invc.nextSeq();
      this.session.act({ t: 'use', seq, x, y, z, id });
    }
    return this.settle();
  }
  /** A melee swing at creature `id`, along the line from the eye to where the latest snapshot has it. */
  attack(id: number): void {
    const m = this.mobs.find((q) => q.id === id);
    if (!m) throw new Error(`${this.name}: no creature ${id} in the snapshot`);
    const h = MOB_LIST[m.def]?.h ?? 1, b = this.body, d = unit(m.x - b.x, m.y + h / 2 - (b.y + EYE), m.z - b.z);
    this.lookAt(m.x, m.y + h / 2, m.z);
    this.session.act({ t: 'atk', id, d });
  }
  /** A shot along `dir` from the eye. */
  fire(dir: Vec3): void {
    const b = this.body, d = unit(dir[0], dir[1], dir[2]);
    this.session.act({ t: 'fire', seq: this.invc.nextSeq(), o: [b.x, b.y + EYE, b.z], d });
  }
  /** Jump and put a block under the feet `n` times, as a player holding Space and the right button looking down. */
  async pillar(n: number, itemKey: string): Promise<void> {
    for (let i = 0; i < n; i++) {
      await this.until(() => this.body.onGround, 3000, 'ground');
      const b = this.body, x = Math.floor(b.x), z = Math.floor(b.z), base = Math.round(b.y);
      let placed = false;
      await this.run(() => {
        this.look(this.body.yaw, -1.5533);
        this.keys.press('Space');
        if (!placed && this.body.y >= base + 1 + 0.06) {
          if (!this.placeNow(x, base, z, itemKey)) throw new Error(`${this.name}: pillar block ${i + 1} refused here`);
          placed = true;
        }
        return placed && this.body.onGround && this.body.y >= base + 0.99;
      }, 5000, `pillar ${i + 1}`);
    }
    this.keys.release('Space');
    await this.settle();
    await this.until(() => this.body.onGround, 3000, 'ground');
  }
  /** One inventory or container op; resolves once the host has acknowledged it. */
  op(o: InvOp): Promise<boolean> {
    const r = this.invc.send(o);
    return this.settle().then(() => r.ok);
  }
  /** A command line; resolves with the reply. */
  cmd(text: string, ms = 10000): Promise<string> {
    const id = ++this.cmdN;
    return new Promise<string>((ok, no) => {
      const t = setTimeout(() => { this.cmds.delete(id); no(new Error(`${this.name}: no reply to "${text}"`)); }, ms);
      this.cmds.set(id, (r) => { clearTimeout(t); ok(r); });
      this.session.send({ t: 'cmd', id, text });
    });
  }
  /** FNV-1a of the blocks of this bot's copy of the chunk; null while it has none ready. */
  chunkHash(cx: number, cz: number): string | null {
    const c = this.vox.chunkAt(cx, cz);
    return c && c.state === 2 && c.blocks ? hashBlocks(c.blocks).toString(16) : null;
  }
  /** Every action this bot made has been answered: no op, edit or use waits, no cell is predicted. */
  settle(ms = 5000): Promise<void> {
    return this.until(() => this.invc.sync.unacked === 0 && this.invc.sync.pendingSel === null && this.vox.predicted() === 0, ms, 'settle');
  }
  /** Resolves when `test` holds after a tick, or fails after `ms`. */
  until(test: () => boolean, ms = 10000, what = 'condition'): Promise<void> {
    if (test()) return Promise.resolve();
    return new Promise<void>((ok, no) => {
      const t = setTimeout(() => { this.waiters = this.waiters.filter((w) => w !== entry); no(new Error(`${this.name}: timed out waiting for ${what}`)); }, ms);
      const entry = { test, ok: () => { clearTimeout(t); ok(); } };
      this.waiters.push(entry);
    });
  }
  /** Wait `ms` of the bot's own time, ticking. */
  wait(ms: number): Promise<void> { const end = performance.now() + ms; return this.until(() => performance.now() >= end, ms + 5000, 'wait'); }

  /** Slot of the first hotbar stack of `itemKey`, -1 when there is none. */
  hotbar(itemKey: string): number { for (let i = 0; i < 9; i++) if (this.invc.inv.slots[i]?.k === itemKey) return i; return -1; }
  /** Items of `itemKey` in the pack. */
  count(itemKey: string): number { let n = 0; for (const s of this.invc.inv.slots) if (s && s.k === itemKey) n += s.n; return n; }

  // ---- inside -----------------------------------------------------------------------------------------

  private placeNow(x: number, y: number, z: number, itemKey: string): boolean {
    const id = item(itemKey).block, slot = this.hotbar(itemKey);
    if (id === undefined || slot < 0) return false;
    if (this.invc.inv.sel !== slot) this.invc.setSel(slot);
    const faces: Vec3[] = [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
    for (const [dx, dy, dz] of faces) {
      const hx = x + dx, hy = y + dy, hz = z + dz, hid = this.vox.getBlock(hx, hy, hz);
      if (T_REPLACE[hid]) continue;
      if (dy !== -1 || this.body.pitch > -1.4) this.lookAt(x + 0.5, y + 0.5, z + 0.5);
      const hit: RayHit = { hit: true, x: hx, y: hy, z: hz, nx: -dx, ny: -dy, nz: -dz, id: hid, dist: 1 };
      return this.blocks.place(hit, id);
    }
    return false;
  }
  private run(step: () => boolean, ms: number, what: string): Promise<void> {
    if (this.task) return Promise.reject(new Error(`${this.name}: ${what} while another action runs`));
    let err: unknown = null, done = false;
    this.task = () => { try { done = step(); } catch (e) { err = e; done = true; } return done; };
    return this.until(() => done, ms, what).then(
      () => { this.task = null; if (err) throw err; },
      (e) => { this.task = null; this.keys.releaseAll(); throw e; },
    );
  }
  private blocked(x: number, y: number, z: number): boolean {
    const E = 1e-4, over = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean =>
      x1 > x + E && x0 < x + 1 - E && y1 > y + E && y0 < y + 1 - E && z1 > z + E && z0 < z + 1 - E;
    for (const m of this.mobs) { const d = MOB_LIST[m.def]; if (d && d.ai !== 'minion' && over(m.x - d.hw, m.y, m.z - d.hw, m.x + d.hw, m.y + d.h, m.z + d.hw)) return true; }
    for (const p of this.players.values()) if (p.slot !== this.slot && over(p.x - 0.3, p.y, p.z - 0.3, p.x + 0.3, p.y + 1.8, p.z + 0.3)) return true;
    return false;
  }
  private onWelcome(m: S2COf<'welcome'>): void {
    const b = this.body;
    this.counts.welcomes++;
    this.seed = m.world.seed; this.dim = m.dim; this.slot = m.you.slot; this.flags = new Set(m.flags);
    b.frozen = true; b.flying = false;
    b.teleport(m.pos[0], m.pos[1], m.pos[2]); b.yaw = m.pos[3]; b.pitch = m.pos[4];
    this.tpId = m.tp; this.readySent = -1; this.ready = false; this.joined = true;
    if (this.welcomed) { this.welcomed(); this.welcomed = null; this.failed = null; }
  }
  private onTp(m: S2COf<'tp'>): void {
    const b = this.body;
    this.tpId = m.id;
    if (m.dim !== this.dim) { this.dim = m.dim; this.vox.clear(m.dim); }
    b.teleport(m.x, m.y, m.z);
    if (m.yaw !== undefined) b.yaw = m.yaw;
    if (m.pitch !== undefined) b.pitch = m.pitch;
    if (m.load) { this.ready = false; b.frozen = true; this.readySent = -1; return; }
    if (this.ready) { this.counts.corrections++; return; }
    b.frozen = false; this.ready = true; this.moveT = MOVE_EVERY;
  }
  private moveState(): MoveState {
    const b = this.body, s = this.session, m = this.mv;
    if (s.lastMove !== this.moveMark) { this.moveMark = s.lastMove; this.jumpsSent = this.jumpsSeen; }
    this.jumpsSeen = b.jumps;
    m.tp = this.tpId; m.x = b.x; m.y = b.y; m.z = b.z; m.vx = b.vx; m.vy = b.vy; m.vz = b.vz; m.yaw = b.yaw; m.pitch = b.pitch;
    m.flags = moveFlags(b, b.jumps !== this.jumpsSent, false, false);
    return m;
  }
  private areaReady(): boolean {
    const cx = Math.floor(this.body.x / 16), cz = Math.floor(this.body.z / 16);
    for (let dx = -RADIUS; dx <= RADIUS; dx++) for (let dz = -RADIUS; dz <= RADIUS; dz++) {
      const c = this.vox.chunkAt(cx + dx, cz + dz);
      if (!c || c.state !== 2) return false;
    }
    return true;
  }
  /** The chunks within RADIUS are kept and those beyond RADIUS + 1 let go; one missing generation is made per frame. */
  private keepChunks(): void {
    const v = this.vox, cx = Math.floor(this.body.x / 16), cz = Math.floor(this.body.z / 16);
    for (const c of [...v.chunks.values()]) if (Math.abs(c.cx - cx) > RADIUS + 1 || Math.abs(c.cz - cz) > RADIUS + 1) v.drop(c);
    let best: VoxChunk | null = null, bestD = Infinity;
    for (let dx = -RADIUS; dx <= RADIUS; dx++) for (let dz = -RADIUS; dz <= RADIUS; dz++) {
      const c = v.create(cx + dx, cz + dz), d = dx * dx + dz * dz;
      if (!c.blocks && d < bestD) { best = c; bestD = d; }
    }
    if (best) { const g = genChunk(this.seed, this.dim, best.cx, best.cz); v.generated(best, g.blocks, g.biomes, g.hasEmit, g.hash); }
  }
  /** One frame, as Game.runFrame orders it: pump, chunks, the ready check, then the whole steps owed (at most five), each
   *  pumped before and after. */
  private frame(): void {
    const s = this.session, now = performance.now();
    this.acc += (now - this.lastT) / 1000; this.lastT = now;
    try {
      s.pump();
      if (this.joined) {
        this.keepChunks();
        if ((this.frameN++ & 15) === 0) this.vox.tick(now, this.body.x, this.body.z);
        this.vox.flush(now);
      }
      if (this.joined && !this.ready && this.readySent !== this.tpId && this.areaReady()) { this.readySent = this.tpId; s.send({ t: 'ready', tp: this.tpId }); }
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        if (n) s.pump();
        this.tick();
        this.acc -= STEP; n++;
        s.pump();
      }
      if (n === 5) this.acc = 0;
    } catch (e) {
      console.error(`${this.name}: frame failed`, e);
    }
    for (const w of [...this.waiters]) if (w.test()) { this.waiters.splice(this.waiters.indexOf(w), 1); w.ok(); }
  }
  private tick(): void {
    if (!this.ready) { this.keys.endTick(); return; }
    const b = this.body, inv = this.invc.inv, st = this.invc.stats, s = this.session;
    this.time += STEP; this.ticks++;
    st.sync(inv);
    b.moveMult = (1 + st.d.speed) * (b.inWater ? 1 + st.d.swim : 1); b.jumpMult = Math.sqrt(1 + st.d.jump); b.extraJumps = st.d.extraJump;
    b.autoJump = this.autoJump; b.canFly = false;
    b.frozen = st.dead;
    b.tick(STEP, this.keys, this.vox, this.time);
    const edge = b.landed > 0 || b.inWater !== this.wasWet || b.inLava !== this.wasLava;
    this.wasWet = b.inWater; this.wasLava = b.inLava;
    this.invc.tick(STEP);
    if (++this.moveT >= MOVE_EVERY || edge) { this.moveT = 0; s.move(); }
    s.probe();
    if (this.task) this.task();
    this.keys.endTick();
  }
}

function unit(x: number, y: number, z: number): Vec3 { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
function randomToken(): string { let t = ''; for (let i = 0; i < 32; i++) t += Math.floor(Math.random() * 16).toString(16); return t; }
