// What the mock does with stacks when a slot is pressed: the table of section 7 played out on sample stores. The game
// will turn the same presses into its own ops; here they change the arrays the screens are built from.
import { type Stack, thing } from '../../sample/play-items';

export type Store = (Stack | null)[];
export interface Place { store: string; i: number }

export interface HandRules {
  /** Whether a slot takes a stack; every slot takes everything when not given. */
  takes?(p: Place, s: Stack): boolean;
  /** Where a shift-press sends a stack from a store, in order of preference. */
  route?(p: Place): string[];
  /** A slot the game refused, for the frame of blood. */
  refused?(p: Place): void;
  /** Stores that a double press does not gather from: results, locked places. */
  closed?: string[];
}

function same(a: Stack, b: Stack): boolean { return a.key === b.key && a.mod === b.mod; }
function max(s: Stack): number { return thing(s.key).stack; }

export class Hand {
  held: Stack | null = null;
  /** The press that began a drag took its stack, so letting go over another slot puts it there. */
  private took: Place | null = null;
  /** What left the pack into the world, newest last, for the screens that show it. */
  dropped: Stack[] = [];

  constructor(public stores: Record<string, Store>, public rules: HandRules = {}) {}

  get(p: Place): Stack | null { return this.stores[p.store]?.[p.i] ?? null; }
  set(p: Place, s: Stack | null): void { this.stores[p.store][p.i] = s && s.n > 0 ? s : null; }

  takes(p: Place, s: Stack): boolean { return this.rules.takes ? this.rules.takes(p, s) : true; }

  private refuse(p: Place): void { this.rules.refused?.(p); }

  /** A left press: take, put, join or swap; with shift, send the stack across; with a second quick press, gather. */
  left(p: Place, shift = false, double = false): void {
    const here = this.get(p);
    this.took = null;
    if (shift && !this.held) { if (here) this.send(p); return; }
    if (double && this.held) { this.gather(); return; }
    if (!this.held) {
      if (here) { this.held = here; this.set(p, null); this.took = p; }
      return;
    }
    if (!this.takes(p, this.held)) { this.refuse(p); return; }
    if (!here) { this.put(p, this.held.n); return; }
    if (same(here, this.held)) {
      const room = max(here) - here.n;
      if (room <= 0) { this.refuse(p); return; }
      const k = Math.min(room, this.held.n);
      here.n += k;
      this.held.n -= k;
      if (!this.held.n) this.held = null;
      return;
    }
    const h = this.held;
    this.held = here;
    this.set(p, h);
  }

  /** A right press: take the larger half, or put one down. */
  right(p: Place): void {
    const here = this.get(p);
    this.took = null;
    if (!this.held) {
      if (!here) return;
      const k = Math.ceil(here.n / 2);
      this.held = { ...here, n: k };
      here.n -= k;
      if (!here.n) this.set(p, null);
      return;
    }
    this.one(p);
  }

  /** The right button held and moved onto another slot: one in each as it passes. */
  pass(p: Place): void { if (this.held) this.one(p); }

  /** A left press dragged from another slot and let go here. */
  drop(p: Place): void {
    if (!this.held || !this.took) return;
    if (this.took.store === p.store && this.took.i === p.i) return;
    this.left(p);
    this.took = null;
  }

  private one(p: Place): void {
    const here = this.get(p), h = this.held!;
    if (!this.takes(p, h)) { this.refuse(p); return; }
    if (here && (!same(here, h) || here.n >= max(here))) return;
    if (here) here.n += 1; else this.set(p, { ...h, n: 1 });
    h.n -= 1;
    if (!h.n) this.held = null;
  }

  private put(p: Place, n: number): void {
    const h = this.held!;
    const k = Math.min(n, max(h));
    this.set(p, { ...h, n: k });
    h.n -= k;
    if (!h.n) this.held = null;
  }

  /** Sends a stack where the open window says (Shift and a press). */
  send(p: Place): void {
    const s = this.get(p);
    if (!s) return;
    const left = this.into(s, this.rules.route?.(p) ?? [], p);
    if (left === s.n) this.refuse(p);
    s.n = left;
    if (!s.n) this.set(p, null);
  }

  /** Puts what it can of a stack into stores, joining like stacks first; returns how many are left. */
  into(s: Stack, stores: string[], skip?: Place): number {
    let n = s.n;
    for (const pass of [0, 1]) for (const name of stores) {
      const st = this.stores[name];
      if (!st) continue;
      for (let i = 0; i < st.length && n > 0; i++) {
        if (skip && skip.store === name && skip.i === i) continue;
        const here = st[i], at = { store: name, i };
        if (!this.takes(at, s)) continue;
        if (pass === 0 && here && same(here, s) && here.n < max(here)) {
          const k = Math.min(max(here) - here.n, n);
          here.n += k; n -= k;
        } else if (pass === 1 && !here) {
          const k = Math.min(max(s), n);
          st[i] = { ...s, n: k }; n -= k;
        }
      }
    }
    return n;
  }

  /** A second quick press with a stack held: every stack of its kind into the hand, up to a full stack. */
  gather(): void {
    const h = this.held;
    if (!h) return;
    for (const [name, st] of Object.entries(this.stores)) {
      if (this.rules.closed?.includes(name)) continue;
      for (let i = 0; i < st.length && h.n < max(h); i++) {
        const s = st[i];
        if (!s || !same(s, h)) continue;
        const k = Math.min(max(h) - h.n, s.n);
        h.n += k; s.n -= k;
        if (!s.n) st[i] = null;
      }
    }
  }

  /** 1 to 9 over a slot: swap it with that cell of the hotbar. */
  swapWithBar(p: Place, cell: number, bar = 'bar'): void {
    const at = { store: bar, i: cell };
    if (p.store === bar && p.i === cell) return;
    const a = this.get(p), b = this.get(at);
    if ((b && !this.takes(p, b)) || (a && !this.takes(at, a))) { this.refuse(p); return; }
    this.set(p, b);
    this.set(at, a);
  }

  /** Q over a slot drops one; Ctrl and Q the stack. */
  dropFrom(p: Place, all: boolean): void {
    const s = this.get(p);
    if (!s) return;
    const k = all ? s.n : 1;
    this.dropped.push({ ...s, n: k });
    s.n -= k;
    if (!s.n) this.set(p, null);
  }

  /** A press outside every slab with a stack held drops it into the world. */
  dropHeld(): void {
    if (!this.held) return;
    this.dropped.push(this.held);
    this.held = null;
    this.took = null;
  }

  /** How many of a kind the stores hold. */
  have(key: string | ((k: string) => boolean), stores: string[]): number {
    let n = 0;
    const want = typeof key === 'string' ? (k: string) => k === key : key;
    for (const name of stores) for (const s of this.stores[name] ?? []) if (s && want(s.key)) n += s.n;
    return n;
  }

  /** Takes up to n of a kind out of the stores; returns how many were taken. */
  spend(key: string | ((k: string) => boolean), n: number, stores: string[]): number {
    const want = typeof key === 'string' ? (k: string) => k === key : key;
    let left = n;
    for (const name of stores) {
      const st = this.stores[name] ?? [];
      for (let i = st.length - 1; i >= 0 && left > 0; i--) {
        const s = st[i];
        if (!s || !want(s.key)) continue;
        const k = Math.min(left, s.n);
        s.n -= k; left -= k;
        if (!s.n) st[i] = null;
      }
    }
    return n - left;
  }

  /** Merges the stacks of a store and orders them by grade and name, as "Sort" does. */
  sort(name: string): void {
    const st = this.stores[name];
    const all: Stack[] = [];
    for (const s of st) if (s) {
      const like = all.find((a) => same(a, s) && a.n < max(a));
      if (like) {
        const k = Math.min(max(like) - like.n, s.n);
        like.n += k;
        if (s.n - k) all.push({ ...s, n: s.n - k });
      } else all.push({ ...s });
    }
    all.sort((a, b) => thing(b.key).grade - thing(a.key).grade || thing(a.key).kind.localeCompare(thing(b.key).kind) || thing(a.key).name.localeCompare(thing(b.key).name));
    for (let i = 0; i < st.length; i++) st[i] = all[i] ?? null;
  }
}

/** A store of n slots from a sparse list of stacks at their places. */
export function store(n: number, at: Record<number, Stack> = {}): Store {
  return Array.from({ length: n }, (_, i) => (at[i] ? { ...at[i] } : null));
}
