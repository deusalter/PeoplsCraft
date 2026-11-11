// Blocks that do something by themselves: forges smelt, nests breed, bushes regrow, and what stands on a
// block falls when the block goes.
import { DAY_LENGTH, chunkKey } from '../core/constants';
import { B, T_LIQUID, T_OPAQUE, T_REPLACE, T_SOLID, T_SUPPORT } from '../data/blocks';
import { item, matches } from '../data/items';
import { SMELTS } from '../data/recipes';
import { breakNatural } from './actions';
import { BURST } from './fx';
import type { Slot } from './inventory';
import type { Realm } from './realm';
import type { BlockEnt } from './voxels';

/** After any block change that was not silent: pop what the block was holding up, and wake the fluids beside it. */
export function onBlockChange(realm: Realm, x: number, y: number, z: number, _old: number, now: number): void {
  if (!T_SOLID[now] || !T_OPAQUE[now]) { const up = realm.getBlock(x, y + 1, z); if (T_SUPPORT[up]) breakNatural(realm, x, y + 1, z); }
  if (T_REPLACE[now] && !T_LIQUID[now]) realm.fluids.poke(x, y, z);
}

const seen = new Set<number>();
export function tickBlocks(realm: Realm, dt: number): void {
  const sim = realm.sim, rnd = sim.rnd, w = realm, many = realm.players.length > 1;
  seen.clear();
  for (const pl of realm.players) {
    const p = pl.body, cx = Math.floor(p.x) >> 4, cz = Math.floor(p.z) >> 4;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      // a chunk two players stand near is ticked once
      if (many) { const k = chunkKey(cx + dx, cz + dz); if (seen.has(k)) continue; seen.add(k); }
      const ents = realm.store.chunkEnts(cx + dx, cz + dz);
      if (!ents) continue;
      for (const e of ents) {
        if (e.kind === 'forge') {
          // replay the time since this forge was last ticked, so it keeps working while its chunk is far away or unloaded
          const d = e.data, now = sim.shared.clock * DAY_LENGTH;
          let left = d.at === undefined ? dt : Math.min(900, Math.max(dt, now - d.at));
          const quiet = left > 1;
          d.at = now;
          while (left > 0) { const st = Math.min(left, 0.5); tickForge(realm, e, st, quiet); left -= st; if (d.burn <= 0 && d.prog <= 0) break; }
        } else if (e.kind === 'nest') {
          if (w.getBlock(e.x, e.y, e.z) !== B.brood_nest) { w.removeEnt(e.x, e.y, e.z); continue; }   // orphan from an older save
          const d = e.data; d.t = (d.t ?? 0) - dt;
          const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
          if (d.t <= 0 && dist < 18 && dist > 3) {
            d.t = 7;
            if (realm.mobs.count((m) => m.def.key === d.mob && Math.hypot(m.x - e.x, m.z - e.z) < 14) < 3) {
              const m = realm.mobs.spawn(d.mob, e.x + 0.5 + (rnd() - 0.5) * 3, e.y + 1.1, e.z + 0.5 + (rnd() - 0.5) * 3);
              if (m) realm.burst(BURST.puff, e.x + 0.5, e.y + 1, e.z + 0.5, 14, 0xff6a5a);
            }
          }
        }
      }
    }
    // random ticks: berry bushes regrow
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(p.x + (rnd() - 0.5) * 64), z = Math.floor(p.z + (rnd() - 0.5) * 64), y = Math.floor(p.y + (rnd() - 0.5) * 24);
      if (w.getBlock(x, y, z) === B.berry_bush_empty && rnd() < 0.02) w.setBlock(x, y, z, B.berry_bush);
    }
  }
}

function tickForge(realm: Realm, e: BlockEnt, dt: number, quiet = false): void {
  const sim = realm.sim, d = e.data, s = d.s as Slot[], w = realm;
  const inp = s[0], r = inp ? SMELTS.find((q) => matches(q.in, inp.k) && q.forge <= d.level) : undefined;
  const out = s[2], room = !!r && (!out || (out.k === r.out && out.n + r.n <= item(r.out).stack));
  const was = d.burn > 0;
  if (d.burn > 0) d.burn -= dt;
  if (r && room) {
    if (d.burn <= 0 && s[1] && item(s[1].k).fuel) { d.burn = d.burnMax = item(s[1].k).fuel!; if (--s[1].n <= 0) s[1] = null; d.rev++; realm.touchEnt(e); }
    if (d.burn > 0) {
      d.need = r.time / (1 + (d.level - r.forge) * 0.6); d.prog += dt;
      if (d.prog >= d.need) {
        d.prog = 0;
        if (--inp!.n <= 0) s[0] = null;
        if (out) out.n += r.n; else s[2] = { k: r.out, n: r.n };
        d.rev++; realm.touchEnt(e); sim.addFlag('smelt:' + r.out);
        if (!quiet) for (const q of realm.players) if (Math.hypot(e.x - q.body.x, e.z - q.body.z) < 12) sim.sink.emit({ p: q.slot }, ['s', 'fizz', 0.4, 1, e.x, e.y, e.z]);
      }
    } else d.prog = Math.max(0, d.prog - dt * 2);
  } else { d.prog = 0; d.need = 0; }
  const now = d.burn > 0, id = w.getBlock(e.x, e.y, e.z);
  if (was !== now && (id === B.furnace || id === B.furnace_lit)) w.setBlock(e.x, e.y, e.z, now ? B.furnace_lit : B.furnace, true);
  if (now && !quiet && sim.rnd() < 0.3) sim.sink.emit({ dim: realm.dim, x: e.x, y: e.y, z: e.z, r: 16 }, ['p', BURST.forgeSmoke, e.x, e.y, e.z, 0, 0]);
}
