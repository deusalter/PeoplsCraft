// The wire between a host and a client: every message, the numbers both sides must agree on, and
// the bit layouts of the two binary messages (their byte layouts are in snapshot.ts).
// Two messages are binary: `snapshot` (host to client) and `move` (client to host). Everything else
// is a JSON-shaped object with a string field `t`.
import { BLOCKS } from '../data/blocks';
import { ITEM_LIST, type Item } from '../data/items';
import { MOB_LIST, PROJECTILES } from '../data/mobs';
import { RECIPES } from '../data/recipes';
import type { Fx } from '../sim/fx';
import type { Slot } from '../sim/inventory';
import type { InvOp } from '../sim/invops';

// ---- numbers ---------------------------------------------------------------------------------

export const PROTO = 1;
/** A snapshot per connection and a movement message per client every this many ticks (20 Hz). */
export const SNAP_EVERY = 3, MOVE_EVERY = 3;
/** Interpolation delay in ticks: the bounds on a socket, and the fixed delay on a local transport. */
export const INTERP_MIN = 6, INTERP_MAX = 15, INTERP_LOCAL = 4;
/** Snapshots kept per entity, and how many ticks past the newest one a view may run on its last velocity. */
export const SNAP_KEEP = 32, EXTRAPOLATE = 6;

/** Interest radii in blocks. A creature enters within MOB_R and leaves beyond MOB_R_OUT; bosses reach BOSS_R. */
export const MOB_R = 80, MOB_R_OUT = 88, BOSS_R = 160, PLAYER_R = 160, DROP_R = 48, DROP_R_OUT = 64, PROJ_R = 96;
/** Ticks between two interest sweeps over drops and projectiles (10 Hz), and between two `where` messages (1 Hz). */
export const SWEEP_EVERY = 6, WHERE_EVERY = 60;
/** Ticks between two `time` messages, and between two `st` that only carry forge progress (5 Hz). */
export const TIME_EVERY = 300, FORGE_EVERY = 12;
/** Most `stats` messages one player is sent per second. */
export const STATS_PER_SEC = 4;
/** Other players hear a dig (`dg`) within this many blocks. */
export const DIG_R = 48;
/** A ping is drawn this long (seconds), and lands this far along the view when no block is targeted. */
export const PING_SECONDS = 8, PING_REACH = 32;
/** A shooter's ghost projectile is dropped after this long without the `ps` that answers it. */
export const GHOST_SECONDS = 0.5;

/** Bytes of `ce` one connection is sent per tick: on a socket, and on a local transport. */
export const CE_BYTES = 32 * 1024, CE_BYTES_LOCAL = 256 * 1024;
/** Output queue sizes (bytes): above the first no `ce` is sent, above the second the snapshot is skipped,
 *  above the third the connection is closed with `slow`. */
export const BUF_CE = 128 * 1024, BUF_SNAP = 256 * 1024, BUF_SLOW = 4 * 1024 * 1024;
/** A subscription is accepted within `viewMax + SUB_RANGE` chunks of the player and dropped beyond `viewMax + SUB_KEEP`. */
export const SUB_RANGE = 4, SUB_KEEP = 6;
/** Edit-map loads the host starts per tick and connection, and holds in flight at most. */
export const LOADS_PER_TICK = 64, LOADS_MAX = 256;
/** `chunks.full` answers per second and connection. */
export const FULL_PER_SEC = 8;
/** Client: least time between two `chunks` messages, the wait before a silent subscription is made again,
 *  and before an unanswered `full` is asked again (milliseconds). */
export const CHUNKS_FLUSH_MS = 100, RESUB_MS = 15000, FULL_RETRY_MS = 5000;
/** View distance a solo host allows, and the bounds of `hello.view`. */
export const VIEW_MIN = 4, VIEW_MAX = 16;

/** Largest inbound JSON message and binary message, in bytes. */
export const MAX_JSON = 16 * 1024, MAX_BIN = 64;
/** Bounds of what a message may name. */
export const XZ_MAX = 500000, Y_MAX = 255, CHUNK_MAX = 31250;
/** Where a body may be: the range of `move.y`. */
export const BODY_Y_MIN = -64, BODY_Y_MAX = 400;
export const SUB_MAX = 1024, UNSUB_MAX = 1024, FULL_MAX = 16;
export const CHAT_MAX = 200, CMD_MAX = 200, NAME_MAX = 16, STEP_MAX = 600;
/** Loose bounds of the strings of `hello`; what a name or a token must look like is the host's to judge. */
export const HELLO_STR_MAX = 64, PASSWORD_MAX = 128;
/** Longest item key an op may carry (`e`, `buy.k`). */
export const KEY_MAX = 48;
export const NAME_RE = /^[A-Za-z0-9 _-]{1,16}$/;
/** Where a browser keeps its token (32 hex characters), and how many hex characters of its SHA-256 name the player record. */
export const TOKEN_KEY = 'peopls.token', TOKEN_HEX = 32, RECORD_ID_HEX = 24;
/** Wrong passwords one address may send within PASSWORD_WINDOW seconds before it is shut out for as long. */
export const PASSWORD_TRIES = 5, PASSWORD_WINDOW = 60;
/** Highest wire id of a creature, a projectile or a drop; ids start at 1 and wrap. */
export const ID_MAX = 65535;
/** Highest player slot. */
export const SLOT_MAX = 250;
/** Highest `seq` of a sequenced message. */
export const SEQ_MAX = 0x7fffffff;

/** Seconds: a connection must say `hello` within the first; the client probes with `rtt` every second one and
 *  gives a silent socket up after the third; the server pings every fourth and closes after the fifth of silence. */
export const HELLO_WITHIN = 5, RTT_EVERY = 2, CLIENT_SILENCE = 6, WS_PING_EVERY = 5, WS_SILENCE = 10;
/** A reported round trip is trusted up to this many milliseconds. */
export const RTT_MAX_MS = 400;
/** Seconds without a movement message after which a connection is closed with `idle`. */
export const IDLE_CLOSE = 30;

/** Token buckets of the inbound rate caps, as [refill per second, burst]. Sockets only. `seq` covers `op`, `edit`,
 *  `use`, `item` and `fire` together; `chunks` has a bucket of its own in wall time (CHUNKS_PER_SEC, CHUNKS_BURST), and `chat`
 *  is counted over a window (CHAT_PER_5S). */
export const RATE = { move: [60, 30], seq: [60, 120], atk: [12, 12], dig: [20, 20], talk: [4, 4], cmd: [5, 5], ping: [2, 2], rtt: [2, 2] } as const;
export const CHUNKS_PER_SEC = 12, CHAT_PER_5S = 5;
/** `chunks` messages a socket may have over its rate at once: what a client sends in the CLIENT_SILENCE it waits out
 *  before it gives the socket up, so that a stall of the link short of that never reads as a flood (D36 (j)). */
export const CHUNKS_BURST = CHUNKS_PER_SEC * CLIENT_SILENCE;
/** Seconds of sustained excess on any bucket that close the connection with `rate`. */
export const RATE_CLOSE = 3;

// ---- binary messages: type bytes, sizes, bit fields -------------------------------------------

export const MSG_SNAPSHOT = 1, MSG_MOVE = 2;
export const MOVE_BYTES = 36, SNAP_HEADER = 26, SNAP_PLAYER = 14, SNAP_MOB = 11, SNAP_BOSS = 24;

/** Snapshot header, self flags. */
export const SELF_DEAD = 1, SELF_LOADING = 2, SELF_SLEEPING = 4;
/** Snapshot player record, flags (u16). Bits 8 and 9 hold `swingSeq`. */
export const PF_GROUND = 1, PF_SPRINT = 2, PF_SNEAK = 4, PF_FLY = 8, PF_WATER = 16, PF_DEAD = 32, PF_SLEEP = 64, PF_DIG = 128,
  PF_SWING_SHIFT = 8, PF_SWING_MASK = 0x300, PF_HURT = 0x400, PF_LOADING = 0x800, PF_TP = 0x1000, PF_USING = 0x2000, PF_AWAY = 0x4000;
/** Snapshot creature record, flags (u8). */
export const MF_GROUND = 1, MF_HURT = 2, MF_ATK = 4, MF_FLEE = 8, MF_BOSS = 16, MF_TP = 32, MF_TALK = 64, MF_FRESH = 128;
/** Movement message, flags (u16). */
export const MV_GROUND = 1, MV_SPRINT = 2, MV_SNEAK = 4, MV_FLY = 8, MV_WATER = 16, MV_HEAD_WATER = 32, MV_LAVA = 64, MV_JUMPED = 128,
  MV_USING = 0x100, MV_UI = 0x200;
/** `ps` flags. */
export const PS_PLAYER = 1;
/** A creature counts as fresh (it scales in) and a player as hurt (it flashes) for this long, in seconds. */
export const FRESH_SECONDS = 0.25, HURT_SECONDS = 0.22;

/** Attack kinds of the boss extension, by number. '' is no attack yet. */
export const BOSS_KINDS = ['', 'charge', 'slam', 'volley', 'spiral', 'rain', 'ring', 'summon', 'teleport', 'beam', 'burrow'] as const;
/** Set in the kind byte while an attack is running. */
export const BOSS_RUNNING = 0x80;
export const bossKind = (kind: string): number => Math.max(0, (BOSS_KINDS as readonly string[]).indexOf(kind));

// ---- wire forms -------------------------------------------------------------------------------

/** A slot: 0 when empty, else the item key, the count and, when there is one, the modifier key. */
export type SlotWire = 0 | [k: string, n: number] | [k: string, n: number, m: string];
export const slotWire = (s: Slot): SlotWire => (!s ? 0 : s.m ? [s.k, s.n, s.m] : [s.k, s.n]);
export const wireSlot = (w: SlotWire): Slot => (!w ? null : w.length > 2 ? { k: w[0], n: w[1], m: w[2] } : { k: w[0], n: w[1] });
export const itemWire = (it: Item): [string, number] | [string, number, string] => (it.m ? [it.k, it.n, it.m] : [it.k, it.n]);

/** Everything an inventory op can change that is the player's own: pack (36), armour (3), trinkets (5), crafting
 *  grid (9), cursor, selection, coins, the op random seed, attributes as [str, agi, vit, arc] and unspent points. */
export interface InvWire {
  s: SlotWire[]; a: SlotWire[]; c: SlotWire[]; g: SlotWire[]; cur: SlotWire;
  sel: number; coins: number; seed: number; attr: [number, number, number, number]; pts: number;
}
/** The container or shop a player has open. A chest has 27 slots; a forge has 3 (ore, fuel, output). */
export type BoxWire =
  | { kind: 'chest'; x: number; y: number; z: number; s: SlotWire[] }
  | { kind: 'forge'; x: number; y: number; z: number; s: SlotWire[]; burn: number; burnMax: number; prog: number; need: number; level: number }
  | { kind: 'shop'; npc: string; sold: [id: number, it: SlotWire, price: number][] };
/** One player as the roster shows it. `held` and the three `armor` entries are item keys, '' for none. */
export interface PlayerInfo { slot: number; name: string; dim: number; held: string; armor: [string, string, string]; level: number }
/** The world event as a client mirrors it. */
export interface EventWire { a: 'raid' | 'moon' | 'ashen' | null; k: number; g: number }
/** One chunk's edit set: chunk, the nonce of the subscription it answers, edit revision, generation hash (0 unknown),
 *  and for `rev > 0` the encoding (0 sparse, 1 full) and its base64 data (codec.ts). */
export type CeEntry = [cx: number, cz: number, n: number, rev: number, gh: number] | [cx: number, cz: number, n: number, rev: number, gh: number, enc: 0 | 1, data: string];
export type Vec3 = [number, number, number];

export type ErrorCode = 'proto' | 'version' | 'data' | 'password' | 'name_taken' | 'name_invalid' | 'full' | 'replaced' | 'kicked' | 'rate'
  | 'shutdown' | 'slow' | 'idle';
/** The errors after which a client keeps retrying. */
export const RETRY_CODES: readonly ErrorCode[] = ['shutdown', 'slow', 'idle'];

/** An op as it travels: every op but the two that exist for prediction only. */
export type WireOp = Exclude<InvOp, { o: '_held' } | { o: '_slot' }>;

// ---- client to host ---------------------------------------------------------------------------

export type C2S =
  /** Once per connection. `view` is informational. */
  | { t: 'hello'; proto: number; build: string; data: number; name: string; token: string; password?: string; view: number }
  /** The area round the position of teleport `tp` is loaded. */
  | { t: 'ready'; tp: number }
  /** Chunk subscriptions: `sub` as flat (cx, cz, nonce) triples, `unsub` and `full` as flat (cx, cz) pairs. */
  | { t: 'chunks'; dim: number; sub: number[]; unsub: number[]; full?: number[] }
  /** Mining starts on a block, changes block, or stops. */
  | { t: 'dig'; on: boolean; x: number; y: number; z: number }
  /** A predicted block edit: `k` 0 break, 1 place, 2 door. `id` is the block broken or placed. */
  | { t: 'edit'; seq: number; k: 0 | 1 | 2; x: number; y: number; z: number; id: number }
  /** Right-click on the block `id`, which has a use. */
  | { t: 'use'; seq: number; x: number; y: number; z: number; id: number }
  /** Right-click on the townsperson with this creature id. */
  | { t: 'talk'; id: number }
  /** Use the item in pack slot `slot`: a consumable, the recall stone, or a gate kit set on the cell `at` (`ax`: along x). */
  | { t: 'item'; seq: number; slot: number; at?: Vec3; ax?: boolean }
  /** A melee swing that the client's ray landed on creature `id`, along the unit vector `d`. */
  | { t: 'atk'; id: number; d: Vec3 }
  /** A shot, cast or summon from the eye `o` along the unit vector `d`. */
  | { t: 'fire'; seq: number; o: Vec3; d: Vec3 }
  /** One inventory or container op; its fields lie beside `t` and `seq`. */
  | ({ t: 'op'; seq: number } & WireOp)
  | { t: 'respawn' }
  | { t: 'chat'; text: string }
  /** A command line; the reply (`cmdr`) carries the same `id`. */
  | { t: 'cmd'; id: number; text: string }
  | { t: 'ping'; x: number; y: number; z: number }
  /** `c`: the client's clock in ms, echoed. `last`: the round trip it measured before, in ms. */
  | { t: 'rtt'; c: number; last: number }
  | { t: 'bye' }
  /** Manual clock, local transports: run `n` steps. */
  | { t: 'step'; n: number }
  /** Local transports: stop or resume the clock. */
  | { t: 'pause'; on: boolean }
  /** Local transports: save now. */
  | { t: 'save' };

/** The messages that carry `seq`: one counter per connection, starting at 1 after each hello. */
export type Sequenced = Extract<C2S, { seq: number }>;
/** The messages that leave through `session.act`, behind a fresh `move`. */
export type ActMsg = Extract<C2S, { t: 'edit' | 'use' | 'talk' | 'item' | 'atk' | 'fire' | 'dig' | 'ping' }>;

// ---- host to client ---------------------------------------------------------------------------

export type S2C =
  /** The hello was accepted (first join, resume or takeover): every mirror starts again from this. */
  | { t: 'welcome'; proto: number; boot: number; you: { slot: number; id: string }; world: { name: string; seed: number; seedText: string };
      dim: number; pos: [x: number, y: number, z: number, yaw: number, pitch: number]; tp: number; tick: number; clock: number;
      flags: string[]; quest: number; event: EventWire; spawn: [number, number];
      cfg: { cheats: boolean; simRadius: number; viewMax: number; maxPlayers: number }; players: PlayerInfo[] }
  /** Sent before the host closes the connection. */
  | { t: 'error'; code: ErrorCode; msg: string }
  /** Inventory and container state: `ack` is the last `seq` processed. Whatever it carries replaces the client's copy.
   *  `box: null`: the sim closed the window. */
  | { t: 'st'; ack: number; inv?: InvWire; box?: BoxWire | null }
  /** `modes.fly`: flight granted by a command. Flying is allowed while `creative || fly`; when that changes, the body's `flying` takes the new value. */
  | { t: 'stats'; level: number; xp: number; buffs: [key: string, seconds: number][]; salveCd: number; recallT: number;
      modes: { creative: boolean; hidden: boolean; god: boolean; fly: boolean }; bed: Vec3 | null; deathAt: [number, number, number, number] | null; sleeping: boolean }
  /** The sim damaged this player from (fx, fz). `dodged`: the blow was avoided and `dmg` is 0. */
  | { t: 'hurt'; dmg: number; fx: number; fz: number; knock: number; cause: string; dodged?: boolean }
  /** Death. `cause` is '' for a record that was loaded with no health left. `at` is [dim, x, y, z]. */
  | { t: 'dead'; cause: string; lost: number; at: [number, number, number, number] }
  /** Authoritative position. `load`: the client freezes behind its loading screen until the area is ready, then says `ready`. */
  | { t: 'tp'; id: number; dim: number; x: number; y: number; z: number; yaw?: number; pitch?: number; load: boolean; msg?: string }
  /** The sim opened a shop, chest or forge for this player. What is in it came in the `st` just before. */
  | { t: 'open'; mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; npc?: string }
  /** An `edit` or `use` was refused. `cells`: flat (x, y, z, id) of the truth; empty when the host could not read it. */
  | { t: 'rej'; seq: number; cells: number[] }
  /** Edit sets of subscribed chunks. */
  | { t: 'ce'; dim: number; l: CeEntry[] }
  /** Block changes in subscribed chunks: flat (x, y, z, id, rev). */
  | { t: 'b'; dim: number; l: number[] }
  /** Generation hashes of chunks the host has just generated: flat (cx, cz, gh). */
  | { t: 'gh'; dim: number; l: number[] }
  | { t: 'fx'; l: Fx[] }
  | { t: 'flags'; add: string[]; del: string[] }
  | { t: 'quest'; index: number }
  | { t: 'time'; clock: number; tick: number }
  | ({ t: 'event' } & EventWire)
  /** Roster changes. `del` lists slots. */
  | { t: 'pl'; add?: PlayerInfo[]; upd?: PlayerInfo[]; del?: number[] }
  /** Coarse positions of everyone: flat (slot, dim, x, z). */
  | { t: 'where'; l: number[] }
  /** `slot` 0 is the server speaking. */
  | { t: 'chat'; slot: number; name: string; text: string }
  | { t: 'rtt'; c: number; tick: number }
  | { t: 'cmdr'; id: number; text: string }
  | { t: 'stepped'; tick: number }
  /** A commit ended. `seq`: this player's `ackSeq` at the instant the saved state was taken. */
  | { t: 'saved'; ok: boolean; seq: number; err?: string };

export type C2SOf<T extends C2S['t']> = Extract<C2S, { t: T }>;
export type S2COf<T extends S2C['t']> = Extract<S2C, { t: T }>;

// ---- data version -----------------------------------------------------------------------------

let hash = -1;
/** FNV-1a 32 over the tables whose indices and keys travel on the wire. Both sides must have the same. */
export function dataHash(): number {
  if (hash >= 0) return hash;
  const s = [BLOCKS.map((b) => b.key).join(), ITEM_LIST.map((i) => i.key).join(), MOB_LIST.map((m) => m.key).join(), Object.keys(PROJECTILES).join(), RECIPES.length].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (hash = h >>> 0);
}
