// Moving a player between places the client has to load: dimension crossings, the way home, landing.
import { DIM_NAMES, SEA } from '../core/constants';
import { B, BLOCKS, T_LIQUID, T_OPAQUE, T_SOLID } from '../data/blocks';
import { DIMS } from '../data/dims';
import { endWindow } from './actions';
import { buildGate } from './gates';
import { checkPosition } from './movement';
import type { SimPlayer } from './player';
import { standSpot } from './rules';
import type { Sim } from './sim';
import { SIM_RADIUS } from './voxels';

/** Tell the client where its body now is. `load`: it must load that place and say so before the player is in play again.
 *  What the movement check remembers of the body starts again from this place: the tick its position dates from, the
 *  base of a rise, the peak of a fall, the jumps made in the air, and a note that it stood inside a block. */
export function sendTp(sim: Sim, p: SimPlayer, load: boolean, msg?: string): void {
  const b = p.body;
  p.tp = (p.tp + 1) & 255;
  p.moveOkTick = p.riseTick = sim.tick; p.riseY = p.fallPeak = b.y; p.airJumps = 0; p.embedded = null;
  if (load) { p.loading = true; p.clientReady = false; }
  // the chunks round the new place are wanted now, not at the next whole second
  sim.chunkDue = true;
  sim.sink.send(p.slot, { t: 'tp', id: p.tp, dim: p.dim, x: b.x, y: b.y, z: b.z, load, msg });
}

/** Send the player to their bed, or to the world spawn when there is none (death, Recall Stone). */
export function goHome(sim: Sim, p: SimPlayer): void {
  const s = p.bed, b = p.body, realm = sim.realms[p.dim], ws = sim.shared.worldSpawn;
  if (p.dim !== 0) { travel(sim, p, 0, true); return; }
  if (s && realm.ready(s[0], s[2]) && BLOCKS[realm.getBlock(s[0], s[1], s[2])].use !== 'bed') { p.bed = null; p.arriveMsg = 'Your bedroll is gone. Returned to the world spawn.'; }
  else if (s) {
    if (realm.store.areaReady(s[0], s[2], 1)) { const q = standSpot(realm, s[0], s[1], s[2]); b.teleport(q[0], q[1], q[2]); sendTp(sim, p, false); return; }
    // the bed is out of the loaded area and cannot be checked (or stood beside) yet: go there, load, and let the arrival decide
    b.teleport(s[0] + 0.5, s[1] + 0.6, s[2] + 0.5); p.pendingBed = true; sendTp(sim, p, true, 'Returning');
    return;
  }
  b.teleport(ws[0] + 0.5, SEA + 60, ws[1] + 0.5); p.arriving = 0; sendTp(sim, p, true, 'Returning');
}

export function travel(sim: Sim, p: SimPlayer, to: 0 | 1 | 2, home = false): void {
  const b = p.body, from = sim.realms[p.dim], ws = sim.shared.worldSpawn;
  if (to === p.dim) { goHome(sim, p); return; }
  if (!home) p.portalReturn[p.dim] = [Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)];
  const px = Math.floor(b.x), pz = Math.floor(b.z);
  endWindow(sim, p);
  // a world event does not outlive the last player in the Overworld, and that player sees it end
  if (from.dim === 0 && from.players.length === 1 && sim.events.active) sim.events.end(false);
  const i = from.players.indexOf(p);
  if (i >= 0) from.players.splice(i, 1);
  if (!from.players.length) from.suspend();
  p.dim = to; sim.realms[to].players.push(p);
  p.portalT = 0; p.portalArmed = false;
  const ret = home ? null : p.portalReturn[to];
  if (home) { const s = p.bed; if (s) { b.teleport(s[0] + 0.5, s[1] + 0.6, s[2] + 0.5); p.pendingBed = true; } else { b.teleport(ws[0] + 0.5, SEA + 60, ws[1] + 0.5); p.arriving = 0; } }
  else if (ret) b.teleport(ret[0] + 0.5, ret[1] + 0.1, ret[2] + 0.5);
  else { b.teleport(px + 0.5, 120, pz + 0.5); p.arriving = to; }
  if (to !== 0) sim.addFlag('dim:' + to);
  sendTp(sim, p, true, to === 0 ? 'Returning to the living ground' : `Crossing to ${DIM_NAMES[to]}`);
}

/** Find footing after arriving somewhere new, and raise a return gate if the player came by portal. */
export function land(sim: Sim, p: SimPlayer): void {
  const b = p.body, w = sim.realms[p.dim], kind = p.arriving, x0 = Math.floor(b.x), z0 = Math.floor(b.z);
  p.arriving = -1;
  const free = (x: number, y: number, z: number): boolean => T_SOLID[w.getBlock(x, y - 1, z)] === 1 && T_OPAQUE[w.getBlock(x, y - 1, z)] === 1 && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z) && !w.getBlock(x, y + 3, z);
  let best: [number, number, number] | null = null;
  // the arrival waits for 48 loaded blocks each way; the gate and its apron need 2 of them
  search: for (let r = 0; r <= 44; r += 2) for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = x0 + dx, z = z0 + dz;
    if (kind === 1) { for (let y = 60; y < 150; y++) if (free(x, y, z)) { best = [x, y, z]; break search; } }
    else { let y = w.topY(x, z); while (y > 2 && !T_SOLID[w.getBlock(x, y, z)]) y--; if (y > 4 && free(x, y + 1, z) && !T_LIQUID[w.getBlock(x, y, z)] && w.getBlock(x, y, z) !== B.cloud) { best = [x, y + 1, z]; break search; } }
  }
  if (!best) { if (kind === 2) p.arriveMsg = 'No land within reach. Build outward from the gate.'; best = [x0, kind === 2 ? 130 : 100, z0]; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 3; dx++) { w.setBlock(x0 + dx, best[1] - 1, z0 + dz, kind === 2 ? B.riftstone : B.gloomstone); for (let k = 0; k < 5; k++) w.setBlock(x0 + dx, best[1] + k, z0 + dz, 0); } }
  if (kind > 0) {
    for (let a = -1; a <= 2; a++) for (let k = 0; k < 5; k++) for (let dz = -1; dz <= 1; dz++) if (dz !== 0 || k > 0) { const id = w.getBlock(best[0] + a, best[1] + k, best[2] + dz); if (id && dz !== 0) w.setBlock(best[0] + a, best[1] + k, best[2] + dz, 0); }
    buildGate(w, kind, best[0], best[1] - 1, best[2], true);
    for (let a = -1; a <= 2; a++) w.setBlock(best[0] + a, best[1] - 1, best[2] + 1, kind === 1 ? B.gloomstone : B.riftstone);
    b.teleport(best[0] + 0.5, best[1] + 0.05, best[2] + 1.5);
    p.portalReturn[kind] = [best[0], best[1], best[2]];
    sim.sink.emit({ p: p.slot }, ['n', DIMS[kind].name, kind === 1 ? 'No sky here. Bring light.' : 'Mind the edges', kind === 1 ? '#8af0d8' : '#c8d0ff']);
  } else b.teleport(best[0] + 0.5, best[1] + 0.05, best[2] + 0.5);
  p.safe[0] = b.x; p.safe[1] = b.y; p.safe[2] = b.z;
}

/** A loading player whose client has its area ready, once the sim holds the chunks round it too (under a manual clock
 *  every chunk it wants there, so the first counted step starts from the same world in every run): finish the journey,
 *  make sure the body has room where it stands, and put the player in play. */
export function arrive(sim: Sim, p: SimPlayer): void {
  const b = p.body, w = sim.realms[p.dim], ws = sim.shared.worldSpawn;
  if (!p.online || !p.loading || !p.clientReady || !w.store.areaReady(b.x, b.z, sim.opt.manual ? SIM_RADIUS : 3)) return;
  if (p.pendingBed) {
    // sent to a bed whose chunk was not loaded: now that it is, make sure the bed is still there
    const s = p.bed;
    p.pendingBed = false;
    if (s && p.dim === 0 && BLOCKS[w.getBlock(s[0], s[1], s[2])].use === 'bed') { const q = standSpot(w, s[0], s[1], s[2]); b.teleport(q[0], q[1], q[2]); }
    else { p.bed = null; p.arriveMsg = 'Your bedroll is gone. Returned to the world spawn.'; b.teleport(ws[0] + 0.5, SEA + 60, ws[1] + 0.5); p.arriving = 0; sendTp(sim, p, true); return; }
  }
  if (p.arriving >= 0) land(sim, p);
  checkPosition(sim, p);
  // the stall rule counts from here
  p.loading = false; p.portalArmed = false; p.lastMoveTick = sim.tick;
  sendTp(sim, p, false);
  if (p.arriveMsg) { sim.sink.emit({ p: p.slot }, ['t', p.arriveMsg, '#ff9a8a']); p.arriveMsg = ''; }
  if (p.deadOnJoin) { p.deadOnJoin = false; sim.sink.send(p.slot, { t: 'dead', cause: '', lost: 0, at: p.deathAt ?? [p.dim, Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)] }); }
  if (p.fresh && p.dim === 0 && !sim.flags.has('started')) {
    sim.addFlag('started');
    sim.sink.emit({ p: p.slot }, ['n', sim.world.name, 'Click to look around · E for inventory · G for the guide', '#ffe9a8']);
  }
}

/** Standing in a portal sheet charges the crossing; stepping out lets it fade. */
export function tickPortal(sim: Sim, p: SimPlayer, dt: number): void {
  const b = p.body, id = sim.realms[p.dim].getBlock(Math.floor(b.x), Math.floor(b.y + 0.5), Math.floor(b.z));
  const kind = id === B.hollow_portal ? 1 : id === B.rift_portal ? 2 : 0;
  if (!kind) { p.portalArmed = true; if (p.portalT > 0) p.portalT = Math.max(0, p.portalT - dt * 2); return; }
  if (!p.portalArmed || p.window !== null || p.uiOpen) return;
  if (p.portalT === 0) sim.sink.emit({ p: p.slot }, ['s', 'portal', 1, 1]);
  p.portalT += dt;
  if (p.portalT >= 1.6) travel(sim, p, p.dim === kind ? 0 : kind);
}

