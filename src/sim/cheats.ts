// Developer commands: the cheat console, and what the test harness needs to set a scene.
import { B } from '../data/blocks';
import { ITEMS, TIERS } from '../data/items';
import { BOSSES, MOBS } from '../data/mobs';
import { Climate } from '../world/gen/climate';
import { locate } from '../world/gen/structures';
import type { SimPlayer } from './player';
import type { Sim } from './sim';
import { sendTp, travel } from './travel';

let climate: Climate | null = null, climateSeed = NaN;

export function cheat(sim: Sim, p: SimPlayer, cmd: string): string {
  const a = cmd.trim().split(/\s+/), b = p.body, realm = sim.realms[p.dim], mobs = realm.mobs, st = p.stats;
  const onOff = (cur: boolean): boolean => (a[1] === 'on' ? true : a[1] === 'off' ? false : !cur);
  switch (a[0]) {
    case 'give': { if (!ITEMS.has(a[1])) return 'unknown item ' + a[1]; const left = p.inv.add({ k: a[1], n: +(a[2] ?? 1) }); return left ? 'inventory full' : `gave ${a[2] ?? 1} ${a[1]}`; }
    case 'time': sim.shared.clock = Math.floor(sim.shared.clock) + (a[1] === 'day' ? 0.15 : a[1] === 'night' ? 0.6 : a[1] === 'dusk' ? 0.49 : +a[1] || 0); return 'time set';
    case 'tp': b.teleport(+a[1], +a[2], +a[3]); sendTp(sim, p, false); return 'teleported';
    case 'fly': p.modes.fly = b.flying = !b.flying; return 'fly ' + b.flying;
    case 'creative': p.modes.creative = !p.modes.creative; p.modes.fly = false; b.flying = p.modes.creative; return 'creative ' + p.modes.creative;
    case 'god': p.modes.god = onOff(p.modes.god); return 'god ' + p.modes.god;
    case 'heal': st.hp = st.maxHp; st.hunger = 20; st.mana = st.maxMana; return 'healed';
    case 'level': st.level = +a[1] || 1; st.points += 2 * (+a[1] || 1); st.recompute(p.inv); return 'level set';
    case 'kill': for (const m of mobs.list) if (m.active && m.def.hostile) mobs.hurt(m, 1e6, 0, 0, 0, false, p); return 'cleared';
    case 'spawn': return mobs.spawn(a[1], b.x + 3, b.y + 1, b.z) ? 'spawned' : 'failed';
    case 'boss': { const d = BOSSES[(+a[1] || 1) - 1]; const m = mobs.spawn(d.key, b.x, b.y + 3, b.z + 8); if (m) m.boss!.altar = [b.x, b.y, b.z]; return d.name; }
    case 'flag': sim.addFlag(a[1]); return 'flag set';
    case 'event': sim.events.start(a[1] as 'raid'); return 'event started';
    case 'dim': travel(sim, p, (+a[1] || 0) as 0 | 1 | 2); return 'travelling';
    case 'gear': { const t = TIERS[+a[1] || 2]; for (const k of ['sword', 'pickaxe', 'axe', 'bow', 'staff', 'totem', 'melee_0', 'melee_1', 'melee_2']) if (ITEMS.has(`${t.key}_${k}`)) p.inv.add({ k: `${t.key}_${k}`, n: 1 }); p.inv.add({ k: 'arrow', n: 99 }); p.inv.add({ k: 'salve', n: 10 }); return t.name + ' kit'; }
    case 'locate': {
      if (climateSeed !== sim.seed) { climate = new Climate(sim.seed); climateSeed = sim.seed; }
      const o = locate(a[1], b.x, b.z, sim.seed, p.dim === 0 ? climate : null);
      return o ? `${a[1]} at ${o[0]} ${o[1]} ${o[2]}` : 'none found';
    }
    case 'seed': return String(sim.seed);
    // ---- scene setting for tests ----
    case 'caps': for (const r of sim.realms) { r.mobs.hostileCap = +a[1] || 0; r.mobs.passiveCap = +a[2] || 0; } return 'caps set';
    case 'clearmobs': mobs.clear(); return 'cleared';
    case 'freeze': { const on = onOff(mobs.frozen); for (const r of sim.realms) r.mobs.frozen = on; return 'freeze ' + on; }
    case 'fill': {
      const id = (B as Record<string, number>)[a[7]], n = a.slice(1, 7).map(Number);
      if (id === undefined || n.some(Number.isNaN)) return 'fill x0 y0 z0 x1 y1 z1 <block>';
      for (let x = n[0]; x <= n[3]; x++) for (let y = n[1]; y <= n[4]; y++) for (let z = n[2]; z <= n[5]; z++) realm.setBlock(x, y, z, id);
      return 'filled';
    }
    case 'spawnat': { if (!MOBS.has(a[1])) return 'unknown creature ' + a[1]; const m = mobs.spawn(a[1], +a[2], +a[3], +a[4]); if (m && a[5] !== undefined) m.yaw = +a[5]; return m ? 'spawned' : 'failed'; }
    default: return 'commands: give time tp fly creative god heal level kill spawn boss flag event dim gear locate';
  }
}
