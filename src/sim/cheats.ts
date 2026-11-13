// Developer commands: the cheat console, and what the test harness needs to set a scene.
import { B } from '../data/blocks';
import { ITEMS, TIERS } from '../data/items';
import { BOSSES, MOBS } from '../data/mobs';
import { Climate } from '../world/gen/climate';
import { locate } from '../world/gen/structures';
import { BODY_Y_MAX, BODY_Y_MIN, XZ_MAX } from '../net/protocol';
import { hashBlocks } from './genjob';
import { type SimPlayer, toRecord } from './player';
import type { Sim } from './sim';
import { sendTp, travel } from './travel';

let climate: Climate | null = null, climateSeed = NaN;

/** A number typed into a command, when it is one and lies in [lo, hi]; else null. A command never puts NaN or an
 *  infinity into the world: a body there could never move again, and the save would write it as null. */
function num(s: string | undefined, lo: number, hi: number, int = false): number | null {
  if (s === undefined || s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= lo && n <= hi && (!int || Number.isInteger(n)) ? n : null;
}
/** FNV-1a 32 over the UTF-16 code units of a string. */
function fnv(t: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** What `simhash` covers (10.1): every player in memory as its record holds it, every creature, shot and drop of every realm,
 *  and the shared state with the random stream. Nothing a client's wall clock sets (round trips, `seen`) is in it. */
function simState(sim: Sim): string {
  const players = [...sim.players.values()].map((p) => toRecord(p, 0));
  const realms = sim.realms.map((r) => ({
    mobs: r.mobs.list.filter((m) => m.active).map((m) => [m.id, m.def.key, m.x, m.y, m.z, m.vx, m.vy, m.vz, m.yaw, m.hp, m.state, m.timer]),
    proj: r.proj.list.filter((q) => q.active).map((q) => [q.id, q.x, q.y, q.z, q.vx, q.vy, q.vz, q.life]),
    drops: r.drops.list.filter((d) => d.active).map((d) => [d.id, d.it.k, d.it.n, d.x, d.y, d.z, d.age]),
  }));
  return JSON.stringify({ players, realms, shared: sim.exportShared() });
}
const xz = (s: string | undefined): number | null => num(s, -XZ_MAX, XZ_MAX), y = (s: string | undefined): number | null => num(s, BODY_Y_MIN, BODY_Y_MAX);

export function cheat(sim: Sim, p: SimPlayer, cmd: string): string {
  const a = cmd.trim().split(/\s+/), b = p.body, realm = sim.realms[p.dim], mobs = realm.mobs, st = p.stats;
  const onOff = (cur: boolean): boolean => (a[1] === 'on' ? true : a[1] === 'off' ? false : !cur);
  switch (a[0]) {
    case 'give': {
      if (!ITEMS.has(a[1])) return 'unknown item ' + a[1];
      const n = a[2] === undefined ? 1 : num(a[2], 1, 1e6, true);
      if (n === null) return 'give <item> [count]';
      return p.inv.add({ k: a[1], n }) ? 'inventory full' : `gave ${n} ${a[1]}`;
    }
    case 'time': sim.shared.clock = Math.floor(sim.shared.clock) + (a[1] === 'day' ? 0.15 : a[1] === 'night' ? 0.6 : a[1] === 'dusk' ? 0.49 : num(a[1], -1e6, 1e6) ?? 0); return 'time set';
    case 'tp': {
      const x = xz(a[1]), ty = y(a[2]), z = xz(a[3]);
      if (x === null || ty === null || z === null) return 'tp <x> <y> <z>';
      b.teleport(x, ty, z); sendTp(sim, p, false); return 'teleported';
    }
    case 'fly': p.modes.fly = b.flying = !b.flying; return 'fly ' + b.flying;
    case 'creative': p.modes.creative = !p.modes.creative; p.modes.fly = false; b.flying = p.modes.creative; return 'creative ' + p.modes.creative;
    case 'god': p.modes.god = onOff(p.modes.god); return 'god ' + p.modes.god;
    case 'heal': st.hp = st.maxHp; st.hunger = 20; st.mana = st.maxMana; return 'healed';
    case 'level': { const n = num(a[1], 1, 1000, true) ?? 1; st.level = n; st.points += 2 * n; st.recompute(p.inv); return 'level set'; }
    case 'kill': for (const m of mobs.list) if (m.active && m.def.hostile) mobs.hurt(m, 1e6, 0, 0, 0, false, p); return 'cleared';
    case 'spawn': if (!MOBS.has(a[1])) return 'unknown creature ' + a[1]; return mobs.spawn(a[1], b.x + 3, b.y + 1, b.z) ? 'spawned' : 'failed';
    case 'boss': { const d = BOSSES[(num(a[1], 1, BOSSES.length, true) ?? 1) - 1]; const m = mobs.spawn(d.key, b.x, b.y + 3, b.z + 8); if (m) m.boss!.altar = [b.x, b.y, b.z]; return d.name; }
    case 'flag': sim.addFlag(a[1]); return 'flag set';
    case 'event': sim.events.start(a[1] as 'raid'); return 'event started';
    case 'dim': travel(sim, p, (num(a[1], 0, sim.realms.length - 1, true) ?? 0) as 0 | 1 | 2); return 'travelling';
    case 'gear': { const t = TIERS[num(a[1], 0, TIERS.length - 1, true) ?? 2]; for (const k of ['sword', 'pickaxe', 'axe', 'bow', 'staff', 'totem', 'melee_0', 'melee_1', 'melee_2']) if (ITEMS.has(`${t.key}_${k}`)) p.inv.add({ k: `${t.key}_${k}`, n: 1 }); p.inv.add({ k: 'arrow', n: 99 }); p.inv.add({ k: 'salve', n: 10 }); return t.name + ' kit'; }
    case 'locate': {
      if (climateSeed !== sim.seed) { climate = new Climate(sim.seed); climateSeed = sim.seed; }
      const o = locate(a[1], b.x, b.z, sim.seed, p.dim === 0 ? climate : null);
      return o ? `${a[1]} at ${o[0]} ${o[1]} ${o[2]}` : 'none found';
    }
    case 'seed': return String(sim.seed);
    // ---- scene setting for tests ----
    case 'caps': for (const r of sim.realms) { r.mobs.hostileCap = num(a[1], 0, 1000, true) ?? 0; r.mobs.passiveCap = num(a[2], 0, 1000, true) ?? 0; } return 'caps set';
    case 'clearmobs': mobs.clear(); return 'cleared';
    case 'freeze': { const on = onOff(mobs.frozen); for (const r of sim.realms) r.mobs.frozen = on; return 'freeze ' + on; }
    case 'fill': {
      const id = (B as Record<string, number>)[a[7]], c = a.slice(1, 7).map((v) => num(v, -XZ_MAX, XZ_MAX));
      if (id === undefined || c.length < 6 || c.some((v) => v === null)) return 'fill x0 y0 z0 x1 y1 z1 <block>';
      const n = c as number[];
      for (let x = n[0]; x <= n[3]; x++) for (let y = n[1]; y <= n[4]; y++) for (let z = n[2]; z <= n[5]; z++) realm.setBlock(x, y, z, id);
      return 'filled';
    }
    case 'simhash': return `simhash ${fnv(simState(sim)).toString(16)} tick ${sim.tick}`;
    case 'hash': {
      const c = a.slice(1, 5).map((v) => num(v, -XZ_MAX >> 4, XZ_MAX >> 4, true));
      if (c.length < 4 || c.some((v) => v === null)) return 'hash cx0 cz0 cx1 cz1';
      const n = c as number[], out: string[] = [];
      for (let cx = n[0]; cx <= n[2]; cx++) for (let cz = n[1]; cz <= n[3]; cz++) {
        const ch = realm.chunks.chunk(cx, cz);
        out.push(`${cx},${cz}:${ch && ch.state === 2 && ch.blocks ? hashBlocks(ch.blocks).toString(16) : '-'}`);
      }
      return out.join(' ');
    }
    case 'spawnat': {
      if (!MOBS.has(a[1])) return 'unknown creature ' + a[1];
      const x = xz(a[2]), sy = y(a[3]), z = xz(a[4]), yaw = a[5] === undefined ? null : num(a[5], -1e3, 1e3);
      if (x === null || sy === null || z === null || (a[5] !== undefined && yaw === null)) return 'spawnat <creature> <x> <y> <z> [yaw]';
      const m = mobs.spawn(a[1], x, sy, z);
      if (m && yaw !== null) m.yaw = yaw;
      return m ? 'spawned' : 'failed';
    }
    default: return 'commands: give time tp fly creative god heal level kill spawn boss flag event dim gear locate';
  }
}
