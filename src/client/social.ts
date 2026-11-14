// Who else is in the world and what they said: the roster, the chat log, pings, and where friends are.
// State only, no DOM: the HUD, the chat line and the player list read it, and a test drives it in Node.
import { DIMS } from '../data/dims';
import { CHAT_MAX, CMD_MAX, PF_AWAY, PF_DEAD, PF_LOADING, PF_SLEEP, PING_SECONDS, type ActMsg, type C2S, type PlayerInfo, type S2COf } from '../net/protocol';

/** Chat lines kept. */
export const CHAT_KEEP = 100;

/** A roster entry: what `pl` says of the player, plus what `where` and the snapshots add. */
export interface Member extends PlayerInfo {
  self: boolean;
  /** Coarse position from the last `where` that named this slot, and whether there has been one. */
  x: number; z: number; placed: boolean;
  /** PF_ flags from the newest snapshot that held this player, -1 when none has (out of view, another realm). */
  flags: number;
}
/** `chat`: a player's line; `server`: slot 0; `cmd`: a command this client sent; `reply`: the host's answer; `note`: joins,
 *  leaves and realm changes. Lines are kept whole: wrapping is the view's. */
export interface ChatLine { n: number; kind: 'chat' | 'server' | 'cmd' | 'reply' | 'note'; slot: number; name: string; text: string }
/** A place someone pointed at, shown PING_SECONDS in the world and on the compass. */
export interface Ping { slot: number; name: string; x: number; y: number; z: number; t: number }

/** What the social state needs of a session. */
export interface SocialLink {
  on<T extends 'welcome' | 'pl' | 'where' | 'chat' | 'fx' | 'tp'>(type: T, fn: (m: S2COf<T>) => void): void;
  send(m: C2S): void;
  act(m: ActMsg): void;
}

const TAU = Math.PI * 2;
/** `a` folded into (-PI, PI]. */
export function wrapPi(a: number): number { a = a % TAU; if (a > Math.PI) a -= TAU; else if (a <= -Math.PI) a += TAU; return a; }
/** Where (tx, tz) lies from (x, z) for a body looking along `yaw`: radians clockwise from straight ahead, in (-PI, PI]. Yaw 0
 *  looks north (-z) and grows to the left, as the body's does, so a compass reads `bearing` as its offset from the middle. */
export function bearing(x: number, z: number, yaw: number, tx: number, tz: number): number { return wrapPi(Math.atan2(tx - x, -(tz - z)) + yaw); }
/** One word for what a player is doing that the list and the name tag should say, from its PF_ flags ('' for nothing). */
export function stateOf(flags: number): '' | 'away' | 'asleep' | 'fallen' | 'loading' {
  if (flags < 0) return '';
  if (flags & PF_DEAD) return 'fallen';
  if (flags & PF_LOADING) return 'loading';
  if (flags & PF_SLEEP) return 'asleep';
  if (flags & PF_AWAY) return 'away';
  return '';
}
/** At most `n` UTF-16 units (what the host counts), never half a surrogate pair. */
function cut(t: string, n: number): string {
  if (t.length <= n) return t;
  const c = t.charCodeAt(n - 1);
  return t.slice(0, c >= 0xd800 && c < 0xdc00 ? n - 1 : n);
}
export const realmName = (dim: number): string => DIMS[dim]?.name ?? 'Elsewhere';

export class Social {
  /** Everyone online, this client included, by slot. */
  readonly members = new Map<number, Member>();
  /** Oldest first, at most CHAT_KEEP. */
  readonly lines: ChatLine[] = [];
  readonly pings: Ping[] = [];
  /** This client's slot and realm. */
  slot = 0; dim = 0;
  /** Raised on every change to the roster and on every chat line, so a view redraws only when there is something new. */
  rosterRev = 0; chatRev = 0;
  /** Runs a command line on the host and settles with its answer: the game's `cmd`, which a test may stand in for. */
  cmd: ((text: string) => Promise<string>) | null = null;
  private link: SocialLink | null = null;
  private n = 0;

  connect(s: SocialLink): void {
    this.link = s;
    s.on('welcome', (m) => this.onWelcome(m));
    s.on('pl', (m) => this.onPl(m));
    s.on('where', (m) => this.onWhere(m.l));
    s.on('chat', (m) => this.add(m.slot ? 'chat' : 'server', m.slot, m.name, m.text));
    s.on('fx', (m) => { for (const ev of m.l) if (ev[0] === 'pg') this.onPing(ev[1], ev[2], ev[3], ev[4]); });
    s.on('tp', (m) => { if (m.dim !== this.dim) this.setDim(m.dim); });
  }

  member(slot: number): Member | undefined { return this.members.get(slot); }
  get self(): Member | undefined { return this.members.get(this.slot); }
  /** Everyone, this client first and then by name. */
  list(): Member[] { return [...this.members.values()].sort((a, b) => (a.self !== b.self ? (a.self ? -1 : 1) : a.name.localeCompare(b.name) || a.slot - b.slot)); }
  /** Others in this realm whose position is known: the compass pips. */
  friends(): Member[] { const out: Member[] = []; for (const m of this.members.values()) if (!m.self && m.dim === this.dim && m.placed) out.push(m); return out; }
  /** The flags of a player as the newest snapshot showed them (-1: not in view). */
  setFlags(slot: number, flags: number): void {
    const m = this.members.get(slot);
    if (m && m.flags !== flags) { m.flags = flags; this.rosterRev++; }
  }

  onWelcome(m: S2COf<'welcome'>): void {
    this.slot = m.you.slot; this.dim = m.dim;
    this.members.clear(); this.pings.length = 0;
    for (const q of m.players) this.put(q);
    const me = this.members.get(this.slot);
    if (me) { me.x = Math.round(m.pos[0]); me.z = Math.round(m.pos[2]); me.placed = true; }
    this.rosterRev++;
  }
  onPl(m: S2COf<'pl'>): void {
    if (m.add) for (const q of m.add) {
      const old = this.members.get(q.slot), was = old?.name;
      this.put(q);
      if (q.slot === this.slot) continue;
      if (!old) this.add('note', q.slot, q.name, `${q.name} joined`);
      else if (was !== q.name) this.add('note', q.slot, q.name, `${was} is now ${q.name}`);
    }
    if (m.upd) for (const q of m.upd) {
      const old = this.members.get(q.slot);
      if (!old) { this.put(q); continue; }
      if (old.dim !== q.dim && q.slot !== this.slot) this.add('note', q.slot, q.name, `${q.name} went to ${realmName(q.dim)}`);
      if (old.name !== q.name && q.slot !== this.slot) this.add('note', q.slot, q.name, `${old.name} is now ${q.name}`);
      // a realm change makes the last coarse position meaningless until the next `where`
      if (old.dim !== q.dim) { old.placed = false; old.flags = -1; }
      this.put(q);
    }
    if (m.del) for (const slot of m.del) {
      const old = this.members.get(slot);
      if (!old) continue;
      this.members.delete(slot);
      for (let i = this.pings.length - 1; i >= 0; i--) if (this.pings[i].slot === slot) this.pings.splice(i, 1);
      if (slot !== this.slot) this.add('note', slot, old.name, `${old.name} left`);
    }
    this.rosterRev++;
  }
  /** `where`: flat slot, dim, x, z. */
  onWhere(l: readonly number[]): void {
    for (let i = 0; i + 3 < l.length; i += 4) {
      const m = this.members.get(l[i]);
      if (!m) continue;
      m.dim = l[i + 1]; m.x = l[i + 2]; m.z = l[i + 3]; m.placed = true;
    }
    this.rosterRev++;
  }
  onPing(slot: number, x: number, y: number, z: number): void {
    const name = this.members.get(slot)?.name ?? '';
    // one mark per player: a new ping moves it
    for (let i = this.pings.length - 1; i >= 0; i--) if (this.pings[i].slot === slot) this.pings.splice(i, 1);
    this.pings.push({ slot, name, x, y, z, t: PING_SECONDS });
  }
  private setDim(dim: number): void {
    this.dim = dim; this.pings.length = 0;
    const me = this.members.get(this.slot);
    if (me) me.dim = dim;
    this.rosterRev++;
  }
  private put(q: PlayerInfo): void {
    const old = this.members.get(q.slot);
    const m: Member = { ...q, armor: [q.armor[0], q.armor[1], q.armor[2]], self: q.slot === this.slot, x: old?.x ?? 0, z: old?.z ?? 0, placed: old?.placed ?? false, flags: old?.flags ?? -1 };
    this.members.set(q.slot, m);
  }

  /** Append a line, dropping the oldest past CHAT_KEEP. */
  add(kind: ChatLine['kind'], slot: number, name: string, text: string): ChatLine {
    const line: ChatLine = { n: ++this.n, kind, slot, name, text };
    this.lines.push(line);
    if (this.lines.length > CHAT_KEEP) this.lines.splice(0, this.lines.length - CHAT_KEEP);
    this.chatRev++;
    return line;
  }
  /** What the chat line sends: a command when it starts with '/', else a chat message (cut to CHAT_MAX). Blank sends nothing. */
  submit(text: string): void {
    const t = text.trim(), s = this.link;
    if (!t || !s) return;
    if (t[0] === '/') {
      const c = cut(t.slice(1).trim(), CMD_MAX);
      if (!c) return;
      this.add('cmd', this.slot, '', t);
      if (this.cmd) void this.cmd(c).then((r) => { if (r) this.add('reply', 0, '', r); });
      return;
    }
    s.send({ t: 'chat', text: cut(t, CHAT_MAX) });
  }
  /** Point at a place for everyone in this realm; the mark appears when the host's `pg` comes back. */
  ping(x: number, y: number, z: number): void { if (this.link) this.link.act({ t: 'ping', x, y, z }); }
  /** Age the pings by `dt` seconds. */
  tick(dt: number): void {
    for (let i = this.pings.length - 1; i >= 0; i--) if ((this.pings[i].t -= dt) <= 0) this.pings.splice(i, 1);
  }
}
