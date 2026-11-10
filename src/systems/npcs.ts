// Townsfolk housing. A Guest Bed in a closed, lit room with a door is a vacant home; each
// morning anyone whose condition is met and who has no home moves into one.
import { BLOCKS, B, T_OPAQUE, T_SHAPE } from '../data/blocks';
import { NPCS, NpcDef } from '../data/npcs';
import { QUESTS } from '../data/quests';
import type { Game } from '../game';

interface Home { x: number; y: number; z: number; npc: string | null }

export class NpcSystem {
  homes: Home[] = [];
  private t = 2;
  constructor(private g: Game) {}

  count(): number { return this.homes.filter((h) => h.npc).length; }
  def(mobKey: string): NpcDef | undefined { return NPCS.find((n) => n.mob === mobKey); }
  addBed(x: number, y: number, z: number): void { if (!this.homes.some((h) => h.x === x && h.y === y && h.z === z)) this.homes.push({ x, y, z, npc: null }); this.t = 1; this.sync(); }
  removeBed(x: number, y: number, z: number): void {
    const i = this.homes.findIndex((h) => h.x === x && h.y === y && h.z === z);
    if (i < 0) return;
    const h = this.homes[i];
    if (h.npc) { const d = NPCS.find((n) => n.key === h.npc)!; this.g.toast(`${d.name} has nowhere to stay and leaves.`, '#ff9a8a'); for (const m of this.g.mobs.list) if (m.active && m.def.key === d.mob) m.active = false; this.g.flags.delete('npc:' + h.npc); }
    this.homes.splice(i, 1); this.sync();
  }
  private sync(): void { this.g.mobs.safeZones = this.homes.filter((h) => h.npc).map((h) => [h.x, h.y, h.z]); }

  /** Why a bed's room is not valid housing, or null if it is. Flood-fills the air around the bed. */
  check(x: number, y: number, z: number): string | null {
    const w = this.g.world, seen = new Set<number>(), stack: number[] = [x, y, z];
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

  private met(n: NpcDef): boolean {
    const g = this.g;
    if (n.need.flag && !g.flags.has(n.need.flag)) return false;
    if (n.need.coins && g.inv.coins < n.need.coins && !g.flags.has('npc:' + n.key)) return false;
    return true;
  }
  tick(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 5;
    const g = this.g;
    if (g.dim !== 0) return;
    // move-ins
    for (const n of NPCS) {
      if (this.homes.some((h) => h.npc === n.key) || !this.met(n)) continue;
      const home = this.homes.find((h) => !h.npc && g.world.ready(h.x, h.z) && this.check(h.x, h.y, h.z) === null);
      if (!home) continue;
      home.npc = n.key; g.flags.add('npc:' + n.key);
      g.hud.showBanner(`${n.name} has moved in`, '', '#b8f070'); g.audio.play('quest');
      this.sync();
      break;
    }
    // keep each resident's body present while their home is loaded
    for (const h of this.homes) {
      if (!h.npc) continue;
      const d = NPCS.find((n) => n.key === h.npc)!;
      if (!g.world.ready(h.x, h.z) || Math.hypot(h.x - g.player.x, h.z - g.player.z) > 90) continue;
      if (g.mobs.list.some((m) => m.active && m.def.key === d.mob)) continue;
      const m = g.mobs.spawn(d.mob, h.x + 0.5, h.y + 0.7, h.z + 0.5);
      if (m) m.home = [h.x, h.y, h.z];
    }
  }
  line(n: NpcDef): string {
    if (n.key === 'wayfinder' && Math.random() < 0.6) return 'Next: ' + QUESTS[this.g.quests.index].hint;
    return n.lines[(Math.random() * n.lines.length) | 0];
  }
  goods(n: NpcDef): [string, number, string][] {
    return n.goods.filter((x) => !x[3] || this.g.flags.has(x[3])).map((x) => [x[0], x[1], x[2] ?? 'coins']);
  }
  /** One-line status for a bed, shown when the player right-clicks it. */
  status(x: number, y: number, z: number): string {
    const h = this.homes.find((q) => q.x === x && q.y === y && q.z === z);
    if (h?.npc) return `${NPCS.find((n) => n.key === h.npc)!.name} lives here.`;
    const bad = this.check(x, y, z);
    if (bad) return bad;
    const next = NPCS.find((n) => !this.homes.some((q) => q.npc === n.key) && !this.met(n));
    return 'This room is ready. ' + (NPCS.some((n) => !this.homes.some((q) => q.npc === n.key) && this.met(n)) ? 'Someone will arrive shortly.' : next ? `${next.name}: ${next.why}` : 'Everyone has a home.');
  }
  serialize(): unknown { return this.homes; }
  load(d: any): void { this.homes = Array.isArray(d) ? d : []; this.sync(); }
}
