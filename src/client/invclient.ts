// The client's end of the inventory channel over a Session: ops leave as `op` messages under one
// sequence counter, `st` reconciles (net/invsync.ts), and the mirrors the HUD and the windows read
// are kept here: the Inventory and PlayerStats instances (`game.inv`, `game.stats`), the open
// container, and what `stats` and the snapshot header say of the player.
import { InvSync, type ViewBox, type Win } from '../net/invsync';
import { SELF_DEAD, SELF_LOADING, SELF_SLEEPING, type S2COf } from '../net/protocol';
import { decodeHead } from '../net/snapshot';
import { Inventory } from '../sim/inventory';
import type { InvOp, OpResult } from '../sim/invops';
import { PlayerStats } from '../sim/stats';
import type { InvChannel } from './api';
import type { Session } from './session';

export type Modes = { creative: boolean; hidden: boolean; god: boolean; fly: boolean };
const NO_MODES: Modes = { creative: false, hidden: false, god: false, fly: false };

export class InvClient implements InvChannel {
  readonly inv: Inventory; readonly stats: PlayerStats;
  readonly sync: InvSync;
  // what `stats` says of the player besides the PlayerStats fields
  modes: Modes = { ...NO_MODES };
  bed: [number, number, number] | null = null;
  deathAt: [number, number, number, number] | null = null;
  recallT = 0; sleeping = false;
  // what the snapshot header says
  dead = false; loading = true;
  /** The host opened a chest, forge or shop: show `box`. The `st` that filled it came first. */
  onOpen: ((m: S2COf<'open'>, box: ViewBox | null) => void) | null = null;
  /** The host ended the window the view had (a container gone, walked away from, a station refused): take it down and send nothing. */
  onEnded: (() => void) | null = null;
  /** Flying became allowed or stopped being allowed (`creative || fly` changed): the body's `flying` follows. */
  onFlight: ((on: boolean) => void) | null = null;

  constructor(readonly session: Session, flags: () => ReadonlySet<string>, inv = new Inventory(), stats = new PlayerStats()) {
    this.inv = inv; this.stats = stats;
    this.sync = new InvSync(inv, stats, {
      send: (seq, op) => session.send({ t: 'op', seq, ...op }),
      flags, creative: () => this.modes.creative,
    });
    this.sync.onEnded = () => this.onEnded?.();
    session.inv = this;
    session.on('welcome', () => {
      // every mirror starts again; the first `st` and `stats` follow at once
      this.sync.reset(); this.modes = { ...NO_MODES }; this.bed = null; this.deathAt = null; this.recallT = 0; this.sleeping = false;
      this.dead = false; this.loading = true;
    });
    session.on('st', (m) => this.sync.onSt(m));
    session.on('rej', (m) => this.sync.onRej(m.seq));
    session.on('open', (m) => this.onOpen?.(m, this.sync.view.box));
    session.on('stats', (m) => this.onStats(m));
    session.onSnapshot((b) => {
      const h = decodeHead(b);
      if (!h) return;
      const st = this.stats;
      st.hp = h.hp; st.mana = h.mana; st.hunger = h.hunger;
      this.dead = st.dead = (h.flags & SELF_DEAD) !== 0;
      this.loading = (h.flags & SELF_LOADING) !== 0; this.sleeping = (h.flags & SELF_SLEEPING) !== 0;
    });
  }

  /** The open container as this client holds it, and the window the host holds open (null for none). */
  get box(): ViewBox | null { return this.sync.view.box; }
  get window(): Win | null { return this.sync.view.window; }
  /** What the open shop bought from the player and still offers back, oldest first: one array for as long as the shop is open. */
  get sold(): readonly Win['sold'][number][] { return this.sync.view.window?.sold ?? NOTHING; }

  /** The cooldowns the HUD shades run down here between two `stats`. */
  tick(dt: number): void {
    if (this.recallT > 0) this.recallT = Math.max(0, this.recallT - dt);
    if (this.stats.salveCd > 0) this.stats.salveCd = Math.max(0, this.stats.salveCd - dt);
  }

  nextSeq(): number { return this.sync.nextSeq(); }
  send(op: InvOp): OpResult { return this.sync.send(op); }
  internal(seq: number, op: Extract<InvOp, { o: '_held' | '_slot' }>): void { this.sync.internal(seq, op); }
  /** A station window shown here for the `use` of `seq`, until the host acknowledges it or refuses that use. */
  openStation(seq: number, station: string): void { this.sync.openStation(seq, station); }
  setSel(i: number): void { this.sync.setSel(i); }
  flushSel(): void { this.sync.flushSel(); }

  private onStats(m: S2COf<'stats'>): void {
    const st = this.stats, was = this.modes.creative || this.modes.fly;
    st.level = m.level; st.xp = m.xp; st.buffs = new Map(m.buffs); st.salveCd = m.salveCd;
    this.recallT = m.recallT; this.modes = { ...m.modes }; this.bed = m.bed; this.deathAt = m.deathAt; this.sleeping = m.sleeping;
    st.recompute(this.inv);
    const now = m.modes.creative || m.modes.fly;
    if (now !== was) this.onFlight?.(now);
  }
}
const NOTHING: Win['sold'] = [];
