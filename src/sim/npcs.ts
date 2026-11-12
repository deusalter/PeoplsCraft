// Townsfolk housing. A Guest Bed in a closed, lit room with a door is a vacant home; each
// morning anyone whose condition is met and who has no home moves into one. Homes are Overworld
// places and live in shared.homes.
import { BLOCKS, B, T_OPAQUE, T_SHAPE } from '../data/blocks';
import { NPCS, NpcDef } from '../data/npcs';
import { standSpot } from './rules';
import type { Sim } from './sim';

export const npcOf = (mobKey: string): NpcDef | undefined => NPCS.find((n) => n.mob === mobKey);

export class NpcSim {
  private t = 2;
  constructor(private sim: Sim) { this.sync(); }
  get homes(): Sim['shared']['homes'] { return this.sim.shared.homes; }

  count(): number { return this.homes.filter((h) => h.npc).length; }
  addBed(x: number, y: number, z: number): void { if (!this.homes.some((h) => h.x === x && h.y === y && h.z === z)) this.homes.push({ x, y, z, npc: null }); this.t = 1; this.sync(); }
  removeBed(x: number, y: number, z: number): void {
    const sim = this.sim, mobs = sim.realms[0].mobs, i = this.homes.findIndex((h) => h.x === x && h.y === y && h.z === z);
    if (i < 0) return;
    const h = this.homes[i];
    if (h.npc) { const d = NPCS.find((n) => n.key === h.npc)!; sim.sink.emit({ all: true }, ['t', `${d.name} has nowhere to stay and leaves.`, '#ff9a8a']); for (const m of mobs.list) if (m.active && m.def.key === d.mob) mobs.remove(m); sim.delFlag('npc:' + h.npc); }
    this.homes.splice(i, 1); this.sync();
  }
  private sync(): void { this.sim.realms[0].mobs.safeZones = this.homes.filter((h) => h.npc).map((h) => [h.x, h.y, h.z]); }

  /** Why a bed's room is not valid housing, or null if it is. Flood-fills the air around the bed. */
  check(x: number, y: number, z: number): string | null {
    const w = this.sim.realms[0], seen = new Set<number>(), stack: number[] = [x, y, z];
    let door = false, light = false, n = 0;
    const key = (a: number, b: number, c: number): number => ((a - x + 64) * 128 + (c - z + 64)) * 64 + (b - y + 32);
    while (stack.length) {
      const cz = stack.pop()!, cy = stack.pop()!, cx = stack.pop()!;
      if (Math.abs(cx - x) > 16 || Math.abs(cz - z) > 16 || Math.abs(cy - y) > 10) return 'The room is not enclosed (or is larger than 32 blocks across).';
      const k = key(cx, cy, cz);
      if (seen.has(k)) continue;
      seen.add(k);
      if (++n > 900) return 'The room is not enclosed.';
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz, id = w.getBlock(nx, ny, nz), b = BLOCKS[id];
        if (b.light) light = true;
        if (b.door) { door = true; continue; }
        if (T_OPAQUE[id] || id === B.glass || b.key.endsWith('_leaves')) continue;
        if (T_SHAPE[id] === 1 && b.solid) continue;
        stack.push(nx, ny, nz);
      }
    }
    if (n < 10) return 'The room is too small.';
    if (!door) return 'The room needs a door.';
    if (!light) return 'The room needs a light source.';
    return null;
  }

  /** A newcomer's condition is met when the flag is set and, for a price, some player can show the coins. */
  private met(n: NpcDef): boolean {
    const sim = this.sim;
    if (n.need.flag && !sim.flags.has(n.need.flag)) return false;
    if (n.need.coins && !sim.flags.has('npc:' + n.key)) { let rich = false; for (const p of sim.players.values()) if (p.inv.coins >= n.need.coins) rich = true; if (!rich) return false; }
    return true;
  }
  tick(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 5;
    const sim = this.sim, realm = sim.realms[0], mobs = realm.mobs;
    if (!realm.players.length) return;
    // move-ins
    for (const n of NPCS) {
      if (this.homes.some((h) => h.npc === n.key) || !this.met(n)) continue;
      const home = this.homes.find((h) => !h.npc && realm.ready(h.x, h.z) && this.check(h.x, h.y, h.z) === null);
      if (!home) continue;
      home.npc = n.key; sim.addFlag('npc:' + n.key);
      sim.sink.emit({ all: true }, ['n', `${n.name} has moved in`, '', '#b8f070']); sim.sink.emit({ all: true }, ['s', 'quest', 1, 1]);
      this.sync();
      break;
    }
    // keep each resident's body present while their home is loaded
    for (const h of this.homes) {
      if (!h.npc) continue;
      const d = NPCS.find((n) => n.key === h.npc)!;
      if (!realm.ready(h.x, h.z) || !realm.players.some((p) => Math.hypot(h.x - p.body.x, h.z - p.body.z) <= 90)) continue;
      if (mobs.list.some((m) => m.active && m.def.key === d.mob)) continue;
      const q = standSpot(realm, h.x, h.y, h.z), m = mobs.spawn(d.mob, q[0], q[1], q[2]);
      if (m) m.home = [h.x, h.y, h.z];
    }
  }
  /** One-line status for a bed, shown when a player right-clicks it. */
  status(x: number, y: number, z: number, dim: number): string {
    const h = this.homes.find((q) => q.x === x && q.y === y && q.z === z);
    if (dim !== 0) return 'Townsfolk settle only on the living ground.';
    if (h?.npc) return `${NPCS.find((n) => n.key === h.npc)!.name} lives here.`;
    const bad = this.check(x, y, z);
    if (bad) return bad;
    const next = NPCS.find((n) => !this.homes.some((q) => q.npc === n.key) && !this.met(n));
    return 'This room is ready. ' + (NPCS.some((n) => !this.homes.some((q) => q.npc === n.key) && this.met(n)) ? 'Someone will arrive shortly.' : next ? `${next.name}: ${next.why}` : 'Everyone has a home.');
  }
}
