// The simulation: three realms, the players in memory and the state every realm shares.
import { DAY_LENGTH, SEA } from '../core/constants';
import type { Item } from '../data/items';
import { type C2S, FORGE_EVERY, type PlayerInfo, RTT_MAX_MS, type S2COf, SLOT_MAX, STATS_PER_SEC, TIME_EVERY, WHERE_EVERY } from '../net/protocol';
import { endWindow, onAtk, onDig, onEdit, onFire, onItem, onOp, onTalk, onUse, revalidate, stOf, tickCredits } from './actions';
import { PlayerBody } from './body';
import { cheat } from './cheats';
import type { ChunkSource } from './chunksource';
import { STEP, isNight } from './clock';
import { EventSim } from './events';
import type { Sink } from './fx';
import { checkStall, handleMove, tickEmbedded } from './movement';
import { NpcSim } from './npcs';
import { LINGER, active, mailDrops, newPlayer, respawn, type SimPlayer, tickPlayer, tickSleep, toRecord } from './player';
import { QuestSim } from './quests';
import { Realm, type RealmStore } from './realm';
import type { Batch, PlayerRecord, WorldRecord } from './storage';
import { arrive, suspendRealm, tickPortal } from './travel';
import { type EditMaps, SimChunks, pumpChunks } from './voxels';

export interface SimDeps {
  sink: Sink;
  chunks: ChunkSource;
  edits: EditMaps;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
  /** The sim asks for a full save soon. It never saves by itself. */
  requestSave(): void;
  /** A block store of the caller's own for a realm, read and written in place of that realm's sim chunks. */
  store?(dim: 0 | 1 | 2): RealmStore;
}
export interface SimOptions { cheats: boolean; maxPlayers: number; solo: boolean; manual: boolean }
export interface SharedState {
  /** Days, starting at 0.06. */
  clock: number;
  /** Total sim ticks of this world. */
  tick: number;
  /** mulberry32 state. */
  rnd: number;
  flags: string[];
  /** Index into QUESTS. */
  quest: number;
  events: { a: 'raid' | 'moon' | 'ashen' | null; k: number; g: number; l: number };
  homes: { x: number; y: number; z: number; npc: string | null }[];
  worldSpawn: [number, number];
  /** Gates raised by an arrival: the kind, the realm, and the cell and direction buildGate was given (gates.ts gateHas). */
  gates: { kind: 1 | 2; dim: number; x: number; y: number; z: number; alongX: boolean }[];
  summons: { n: number; item: string; by: string; dim: number; altar: [number, number, number] }[];
  owed: Record<string, { xp: number; coins: number; items: Item[] }>;
}

/** Milliseconds of generation one step may spend under a real clock when the chunk source generates in this thread. */
const GEN_BUDGET_MS = 2;
const STATS_EVERY = 60 / STATS_PER_SEC;
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** One player as the roster shows it. */
export function playerInfo(p: SimPlayer): PlayerInfo {
  const a = p.inv.armor;
  return { slot: p.slot, name: p.name, dim: p.dim, held: p.inv.held()?.k ?? '', armor: [a[0]?.k ?? '', a[1]?.k ?? '', a[2]?.k ?? ''], level: p.stats.level };
}
/** What `stats` tells a player of itself. */
function statsOf(p: SimPlayer): S2COf<'stats'> {
  const st = p.stats;
  return { t: 'stats', level: st.level, xp: st.xp, buffs: [...st.buffs], salveCd: Math.max(0, st.salveCd), recallT: Math.max(0, p.recallT), modes: { ...p.modes }, bed: p.bed, deathAt: p.deathAt, sleeping: p.sleeping };
}
/** The same with every countdown in whole seconds: a `stats` is due when this changes, not on every tick a timer runs. */
function statsKey(m: S2COf<'stats'>): string {
  let s = `${m.level}|${m.xp}|${Math.ceil(m.salveCd)}|${Math.ceil(m.recallT)}|${m.modes.creative ? 1 : 0}${m.modes.hidden ? 1 : 0}${m.modes.god ? 1 : 0}${m.modes.fly ? 1 : 0}|${m.bed}|${m.deathAt}|${m.sleeping}`;
  for (const [k, t] of m.buffs) s += `|${k}${Math.ceil(t)}`;
  return s;
}

/** What a player was last told, and what its inventory looked like then. */
interface Told { rev: number; pts: number; attr: number; stats: string; statsAt: number; info: string }

export class Sim {
  readonly seed: number;
  readonly realms: [Realm, Realm, Realm];
  /** Every player in memory by record id. Never two SimPlayers for one id. */
  readonly players = new Map<string, SimPlayer>();
  readonly shared: SharedState;
  readonly flags: Set<string>;
  readonly refused = { atk: 0, fire: 0, edit: 0 };
  readonly sink: Sink;
  readonly events: EventSim; readonly npcs: NpcSim; readonly quests: QuestSim;
  /** The next creature id; one counter for all realms. */
  mobId = 1;
  /** Ask the realms for their chunks at the next step instead of at the next whole second: a body was put somewhere. */
  chunkDue = true;
  private live: Realm[] = [];
  private stores: SimChunks[];
  private chunkT = 0;
  private flagAdd: string[] = []; private flagDel: string[] = [];
  private questSent: number; private eventSent = ''; private clockSeen: number;
  private told = new WeakMap<SimPlayer, Told>();
  /** The records of parked players as each batch took them: a parked player leaves memory when its commit resolves unchanged. */
  private taken = new WeakMap<Batch, Map<string, string>>();

  constructor(readonly world: WorldRecord, readonly opt: SimOptions, readonly deps: SimDeps) {
    this.seed = world.seed; this.shared = world.state; this.flags = new Set(world.state.flags); this.sink = deps.sink;
    const realm = (d: 0 | 1 | 2): Realm => new Realm(this, d, new SimChunks(d, deps.chunks, deps.edits), deps.store?.(d));
    this.realms = [realm(0), realm(1), realm(2)];
    this.stores = this.realms.map((r) => r.chunks);
    this.events = new EventSim(this); this.npcs = new NpcSim(this); this.quests = new QuestSim(this);
    this.questSent = this.shared.quest; this.eventSent = this.eventKey(); this.clockSeen = this.shared.clock;
  }

  get tick(): number { return this.shared.tick; }
  set tick(n: number) { this.shared.tick = n; }
  get time(): number { return this.shared.tick * STEP; }

  /** The one random stream of the simulation (mulberry32); its state is saved with the world. */
  readonly rnd = (): number => {
    let t = (this.shared.rnd = (this.shared.rnd + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  isNight(): boolean { return isNight(this.shared.clock); }
  /** Bosses fallen, 0..8. */
  difficulty(): number { let n = 0; for (let i = 1; i <= 8; i++) if (this.flags.has('boss:' + i)) n++; return n; }
  addFlag(f: string): void { if (this.flags.has(f)) return; this.flags.add(f); this.flagAdd.push(f); }
  delFlag(f: string): void { if (this.flags.delete(f)) this.flagDel.push(f); }

  /** The lowest slot no player in memory holds; 0 when all are taken. */
  private freeSlot(): number {
    for (let s = 1; s <= SLOT_MAX; s++) { let used = false; for (const q of this.players.values()) if (!q.parked && q.slot === s) { used = true; break; } if (!used) return s; }
    return 0;
  }
  /** Players that hold a slot: online and lingering. */
  seated(): number { let n = 0; for (const p of this.players.values()) if (!p.parked) n++; return n; }

  /** For an id that is not in `players`. `rec` null = first visit. The player starts in the loading state. */
  join(id: string, name: string, rec: PlayerRecord | null, local: boolean): SimPlayer {
    const body = new PlayerBody(), p = newPlayer(id, this.freeSlot(), name, local, body), ws = this.shared.worldSpawn;
    p.rngSeed = Math.floor(this.rnd() * 4294967296);
    if (rec) {
      p.fresh = false; p.dim = (rec.dim as 0 | 1 | 2) ?? 0;
      p.inv.load(rec.inv); p.stats.load(rec.stats);
      // PlayerStats.load always clears `dead`: a record saved on the death screen comes back dead
      p.stats.dead = p.deadOnJoin = p.stats.hp <= 0;
      body.teleport(rec.pos.x, rec.pos.y, rec.pos.z); body.yaw = rec.pos.yaw; body.pitch = rec.pos.pitch;
      p.bed = rec.bed; p.deathAt = rec.deathAt; p.portalReturn = rec.portalReturn; p.safe = [rec.safe[0], rec.safe[1], rec.safe[2]];
      // a record taken mid-arrival (death screen quit, a crossing cut short) finishes landing after the reload
      p.arriving = rec.arriving as -1 | 0 | 1 | 2; p.pendingBed = rec.pendingBed; p.recallT = rec.recallT;
      p.modes = { ...rec.modes }; p.mail = rec.mail;
    } else {
      body.teleport(ws[0] + 0.5, SEA + 60, ws[1] + 0.5);
      p.arriving = 0;
    }
    const owed = this.shared.owed[id];
    if (owed) {
      if (p.stats.addXp(owed.xp)) p.stats.hp = p.stats.maxHp;
      p.inv.coins += owed.coins; p.inv.touch();
      for (const it of owed.items) p.mail.push(it);
      delete this.shared.owed[id];
    }
    p.stats.recompute(p.inv);
    p.lastMoveTick = this.tick;
    this.world.names[id] = { name, seen: this.world.names[id]?.seen ?? 0 };
    this.players.set(id, p); this.realms[p.dim].players.push(p);
    this.chunkDue = true;
    return p;
  }
  /** For a player that is in `players`, lingering, parked or about to be taken over by a new connection: the same
   *  SimPlayer goes through loading again, and its client starts from an empty world. */
  resume(p: SimPlayer): void {
    if (p.parked) { p.parked = false; p.slot = this.freeSlot(); this.realms[p.dim].players.push(p); }
    p.online = true; p.lingerT = 0; p.stalled = false; p.lastMoveTick = this.tick;
    p.loading = true; p.clientReady = false; p.tp = (p.tp + 1) & 255;
    p.deadOnJoin = p.stats.dead;
    this.chunkDue = true;
  }
  /** The connection is gone. 'drop' starts the grace in which the player may come back to where it stood; 'bye' parks it at once. */
  leave(p: SimPlayer, how: 'bye' | 'drop'): void {
    if (p.parked) return;
    if (p.online) {
      p.online = false; p.stalled = false; p.dig = null; p.sleeping = false;
      if (p.window) endWindow(this, p);
      p.lingerT = Math.max(0, LINGER - (this.tick - p.lastMoveTick) * STEP);
    }
    if (how === 'bye') this.park(p);
  }
  /** Out of its realm and off its slot. The player stays in memory until a commit has made its record durable. */
  private park(p: SimPlayer): void {
    const realm = this.realms[p.dim], i = realm.players.indexOf(p);
    for (const m of realm.mobs.list) if (m.active && m.def.ai === 'minion' && m.owner === p.id) realm.mobs.remove(m);
    if (i >= 0) {
      // a world event does not outlive the last player in the Overworld
      if (realm.dim === 0 && realm.players.length === 1 && this.events.active) this.events.end(false);
      mailDrops(this, realm, p.id);
      realm.players.splice(i, 1);
      if (!realm.players.length) suspendRealm(this, realm);
    }
    this.sink.broadcast({ t: 'pl', del: [p.slot] });
    p.parked = true; p.online = false; p.lingerT = 0; p.slot = 0; p.unsaved = true;
    this.deps.requestSave();
  }

  /** One message of the client bound to `p`, already checked for shape and order. */
  handle(p: SimPlayer, m: C2S): void {
    switch (m.t) {
      case 'ready': if (m.tp === p.tp) p.clientReady = true; break;
      case 'dig': onDig(this, p, m); break;
      case 'edit': onEdit(this, p, m); break;
      case 'use': onUse(this, p, m); break;
      case 'talk': onTalk(this, p, m); break;
      case 'item': onItem(this, p, m); break;
      case 'atk': onAtk(this, p, m); break;
      case 'fire': onFire(this, p, m); break;
      case 'op': onOp(this, p, m); break;
      case 'respawn': respawn(this, p); break;
      case 'chat': this.sink.broadcast({ t: 'chat', slot: p.slot, name: p.name, text: m.text }); break;
      case 'cmd': {
        const text = p.local || this.opt.cheats ? cheat(this, p, m.text.replace(/^\//, '')) : 'Commands are off on this server.';
        p.statsDirty = true;
        this.sink.send(p.slot, { t: 'cmdr', id: m.id, text });
        break;
      }
      case 'ping': this.sink.emit({ dim: p.dim }, ['pg', p.slot, m.x, m.y, m.z]); break;
      case 'rtt':
        // a stepped host answers within the step that heard it: the wall-clock round trip says nothing of how far the client
        // is behind, and would put the page's timing into the lead of a shot and the reach of a blow (10.1)
        if (!this.opt.manual) p.rtt = Math.min(m.last, RTT_MAX_MS) / 1000;
        this.sink.send(p.slot, { t: 'rtt', c: m.c, tick: this.tick }); break;
    }
  }
  handleMove(p: SimPlayer, v: DataView): void { handleMove(this, p, v); }

  /** True when the world should advance: always on a server; in solo only while a local player is in play. */
  running(): boolean {
    if (!this.opt.solo) return true;
    for (const p of this.players.values()) if (p.local && active(p)) return true;
    return false;
  }
  /** Chunks: finished generation to the realms, and `max` of them integrated (two while the world stands still behind a
   *  loading screen, one in a step that also runs the world); once a second, or when a body was put somewhere, every realm
   *  with players says which chunks it wants. */
  private chunkStep(max: number): void {
    const manual = this.opt.manual;
    pumpChunks(this.deps.chunks, this.stores, manual ? 2 : Infinity, manual ? Infinity : GEN_BUDGET_MS, max);
    this.chunkT++;
    if (this.chunkT < 60 && !this.chunkDue) return;
    const dt = this.chunkT / 60;
    this.chunkT = 0; this.chunkDue = false;
    for (const r of this.realms) if (r.players.length) r.chunks.update(r.players, dt);
  }
  /** Chunk loading and arrivals only: loading players whose client is ready are landed and put in play. Nothing else moves. */
  prepare(): void { this.load(2); }
  private load(chunks: number): void {
    this.chunkStep(chunks);
    for (const p of this.players.values()) arrive(this, p);
  }
  /** Exactly one STEP. */
  step(): void {
    const dt = STEP, s = this.shared, live = this.live;
    s.tick++;
    this.load(1);
    const second = s.tick % 60 === 0;
    for (const p of this.players.values()) {
      if (p.parked) continue;
      if (!p.online) { if ((p.lingerT -= dt) <= 0) this.park(p); continue; }
      checkStall(this, p);
      if (!active(p)) continue;
      tickCredits(p, dt);
      tickPlayer(this, p, dt);
      tickEmbedded(this, p);
      if (second && p.window) revalidate(this, p);
    }
    live.length = 0;
    for (const r of this.realms) if (r.players.length) live.push(r);
    for (const r of live) r.tick(dt);
    // a crossing moves its player to another realm: every realm above has had its tick by now
    for (const p of this.players.values()) if (active(p)) tickPortal(this, p, dt);
    for (const r of live) r.fluids.tick(dt);
    this.events.tick(dt); this.npcs.tick(dt); this.quests.tick(dt);
    s.clock += dt / DAY_LENGTH;
    if (this.tick % 60 === 0) tickSleep(this);
    this.replicate(dt);
  }
  online(): number { let n = 0; for (const p of this.players.values()) if (p.online) n++; return n; }

  private eventKey(): string { const e = this.shared.events; return `${e.a}|${e.k}|${e.g}`; }
  /** What changed this step and a client mirrors: each player's inventory, open container and stats, then the shared state. */
  private replicate(dt: number): void {
    const s = this.shared, sink = this.sink, tick = s.tick;
    let online = 0;
    for (const p of this.players.values()) {
      if (!p.online) continue;
      online++;
      let t = this.told.get(p);
      if (!t) this.told.set(p, (t = { rev: -1, pts: -1, attr: -1, stats: '', statsAt: -1e9, info: '' }));
      const st = p.stats, a = st.attr, attr = a.str + a.agi * 101 + a.vit * 10201 + a.arc * 1030301;
      // a pickup, a kill's coins, a level gained: the inventory changed without a message of the player's
      if (p.inv.rev !== t.rev || st.points !== t.pts || attr !== t.attr) { t.rev = p.inv.rev; t.pts = st.points; t.attr = attr; p.invDirty = true; }
      if (tick % FORGE_EVERY === 0 && p.window && p.window.mode === 'forge' && !p.window.covered) p.invDirty = true;
      if (p.invDirty) { const m = stOf(this, p); if (m) sink.send(p.slot, m); }
      if (p.statsDirty || (tick + p.slot) % STATS_EVERY === 0) {
        const m = statsOf(p), k = statsKey(m);
        if (k !== t.stats && (p.statsDirty || tick - t.statsAt >= STATS_EVERY)) { t.stats = k; t.statsAt = tick; sink.send(p.slot, m); }
        p.statsDirty = false;
      }
    }
    if (online > 1) {
      for (const p of this.players.values()) {
        if (!p.online || (tick + p.slot) % STATS_EVERY !== 0) continue;
        const t = this.told.get(p)!, info = playerInfo(p), k = JSON.stringify(info);
        if (k !== t.info) { t.info = k; sink.broadcast({ t: 'pl', upd: [info] }); }
      }
      if (tick % WHERE_EVERY === 0) {
        const l: number[] = [];
        for (const p of this.players.values()) if (p.online) l.push(p.slot, p.dim, Math.round(p.body.x), Math.round(p.body.z));
        sink.broadcast({ t: 'where', l });
      }
    }
    if (this.flagAdd.length || this.flagDel.length) { sink.broadcast({ t: 'flags', add: this.flagAdd, del: this.flagDel }); this.flagAdd = []; this.flagDel = []; }
    if (s.quest !== this.questSent) { this.questSent = s.quest; sink.broadcast({ t: 'quest', index: s.quest }); }
    const ek = this.eventKey();
    if (ek !== this.eventSent) { this.eventSent = ek; sink.broadcast({ t: 'event', a: s.events.a, k: s.events.k, g: s.events.g }); }
    // the clock moved by more than its own step: sleep, or a command
    if (tick % TIME_EVERY === 0 || Math.abs(s.clock - this.clockSeen - dt / DAY_LENGTH) > 1e-9) sink.broadcast({ t: 'time', clock: s.clock, tick });
    this.clockSeen = s.clock;
  }
  /** The first `stats` of a connection: whatever was told before does not count. */
  statsNow(p: SimPlayer): S2COf<'stats'> {
    const m = statsOf(p), t = this.told.get(p);
    if (t) { t.stats = statsKey(m); t.statsAt = this.tick; t.info = ''; }
    else this.told.set(p, { rev: -1, pts: -1, attr: -1, stats: statsKey(m), statsAt: this.tick, info: '' });
    return m;
  }

  /** The shared state as a save holds it, detached from the live objects. */
  exportShared(): SharedState {
    const s = this.shared;
    return { ...s, flags: [...this.flags], events: { ...s.events }, homes: s.homes.map((h) => ({ ...h })), worldSpawn: [s.worldSpawn[0], s.worldSpawn[1]],
      gates: s.gates.map((g) => ({ ...g })), summons: s.summons.map((q) => ({ ...q })), owed: plain(s.owed) };
  }
  /** Every record that may have changed, as copies taken at this instant: the world, every player in memory, and the edit
   *  maps touched since the last call (`all`: every edit map in memory). `now` is the wall time the records are stamped with. */
  takeDirty(all = false, now = 0): Batch {
    const w = this.world, parked = new Map<string, string>();
    if (now) w.played = now;
    const players: PlayerRecord[] = [];
    for (const p of this.players.values()) {
      if (!p.parked && now) w.names[p.id] = { name: p.name, seen: now };
      const rec = plain(toRecord(p, w.names[p.id]?.seen ?? now));
      if (p.parked) parked.set(p.id, JSON.stringify(rec));
      players.push(rec);
    }
    const batch: Batch = { world: plain({ ...w, state: this.exportShared() }), players, chunks: this.deps.edits.take(all) };
    this.taken.set(batch, parked);
    return batch;
  }
  /** The commit of `batch` ended. ok: what it held is durable unless it changed again since, and a parked player whose
   *  record is as the batch took it leaves memory. Not ok: every record of the batch is taken again by the next save. */
  committed(batch: Batch, ok: boolean): void {
    this.deps.edits.committed(batch.chunks, ok);
    if (!ok) return;
    const parked = this.taken.get(batch);
    if (parked) for (const [id, json] of parked) {
      const p = this.players.get(id);
      if (p && p.parked && JSON.stringify(plain(toRecord(p, this.world.names[id]?.seen ?? 0))) === json) { p.unsaved = false; this.players.delete(id); }
    }
  }
}
