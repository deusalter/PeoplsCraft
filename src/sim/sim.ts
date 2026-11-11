// The simulation: three realms, the players in memory and the state every realm shares.
import { DAY_LENGTH, SEA } from '../core/constants';
import type { Item } from '../data/items';
import { PlayerBody } from './body';
import { STEP, isNight } from './clock';
import { EventSim } from './events';
import type { Sink } from './fx';
import { NpcSim } from './npcs';
import { active, newPlayer, type SimPlayer, tickPlayer } from './player';
import { QuestSim } from './quests';
import { Realm, type RealmStore } from './realm';
import type { PlayerRecord, WorldRecord } from './storage';
import { arrive, tickPortal } from './travel';

export interface SimDeps {
  sink: Sink;
  /** The block store of one dimension. */
  store(dim: 0 | 1 | 2): RealmStore;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
  /** The sim asks for a full save soon. It never saves by itself. */
  requestSave(): void;
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
  gates: { kind: 1 | 2; dim: number; x: number; y: number; z: number; alongX: boolean }[];
  summons: { n: number; item: string; by: string; dim: number; altar: [number, number, number] }[];
  owed: Record<string, { xp: number; coins: number; items: Item[] }>;
}

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
  private live: Realm[] = [];

  constructor(readonly world: WorldRecord, readonly opt: SimOptions, readonly deps: SimDeps) {
    this.seed = world.seed; this.shared = world.state; this.flags = new Set(world.state.flags); this.sink = deps.sink;
    this.realms = [new Realm(this, 0, deps.store(0)), new Realm(this, 1, deps.store(1)), new Realm(this, 2, deps.store(2))];
    this.events = new EventSim(this); this.npcs = new NpcSim(this); this.quests = new QuestSim(this);
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
  addFlag(f: string): void { this.flags.add(f); }
  delFlag(f: string): void { this.flags.delete(f); }

  /** For an id that is not in `players`. `rec` null = first visit. `body` is the object the player moves
   *  with; when the client runs in the same thread it hands in its own. */
  join(id: string, name: string, rec: PlayerRecord | null, local: boolean, body: PlayerBody = new PlayerBody()): SimPlayer {
    let slot = 1;
    for (const q of this.players.values()) if (!q.parked && q.slot >= slot) slot = q.slot + 1;
    const p = newPlayer(id, slot, name, local, body), ws = this.shared.worldSpawn;
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
    p.stats.recompute(p.inv);
    this.players.set(id, p); this.realms[p.dim].players.push(p);
    return p;
  }
  /** True when the world should advance: always on a server; in solo only while a local player is in play. */
  running(): boolean {
    if (!this.opt.solo) return true;
    for (const p of this.players.values()) if (p.local && active(p)) return true;
    return false;
  }
  /** Arrivals only: loading players whose client is ready are landed and put in play. Nothing else moves. */
  prepare(): void { for (const p of this.players.values()) arrive(this, p); }
  /** Exactly one STEP. */
  step(): void {
    const dt = STEP, s = this.shared, live = this.live;
    s.tick++;
    this.prepare();
    for (const p of this.players.values()) if (active(p)) tickPlayer(this, p, dt);
    live.length = 0;
    for (const r of this.realms) if (r.players.length) live.push(r);
    for (const r of live) r.tick(dt);
    // a crossing moves its player to another realm: every realm above has had its tick by now
    for (const p of this.players.values()) if (active(p)) tickPortal(this, p, dt);
    for (const r of live) r.fluids.tick(dt);
    this.events.tick(dt); this.npcs.tick(dt); this.quests.tick(dt);
    s.clock += dt / DAY_LENGTH;
  }
  online(): number { let n = 0; for (const p of this.players.values()) if (p.online) n++; return n; }

  /** The shared state as a save holds it, detached from the live objects. */
  exportShared(): SharedState {
    const s = this.shared;
    return { ...s, flags: [...this.flags], events: { ...s.events }, homes: s.homes.map((h) => ({ ...h })), worldSpawn: [s.worldSpawn[0], s.worldSpawn[1]],
      gates: s.gates.map((g) => ({ ...g })), summons: s.summons.map((q) => ({ ...q })), owed: { ...s.owed } };
  }
}
