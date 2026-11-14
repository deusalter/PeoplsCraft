// Gates between dimensions: a 4x5 frame around a 2x3 sheet of portal.
import { BUILD_MAX } from '../core/constants';
import { B, T_LIQUID, T_REPLACE } from '../data/blocks';
import { item } from '../data/items';
import type { SimPlayer } from './player';
import type { Realm } from './realm';
import type { Sim } from './sim';

/** True when all 20 cells of a gate are free: buildGate() would otherwise erase chests, forges or an altar. No body of the realm may stand in them. */
export function gateFits(realm: Realm, x: number, y: number, z: number, alongX: boolean): boolean {
  if (y < 1 || y + 4 > BUILD_MAX) return false;
  for (let a = -1; a <= 2; a++) for (let h = 0; h <= 4; h++) {
    const bx = x + (alongX ? a : 0), by = y + h, bz = z + (alongX ? 0 : a);
    if (!T_REPLACE[realm.getBlock(bx, by, bz)] || !realm.ready(bx, bz)) return false;
    for (const q of realm.players) { const p = q.body; if (bx + 1 > p.x - p.hw && bx < p.x + p.hw && by + 1 > p.y && by < p.y + p.h && bz + 1 > p.z - p.hw && bz < p.z + p.hw) return false; }
  }
  return true;
}
/** True when the cell is one of the 20 of a gate that buildGate raised from (g.x, g.y, g.z): its frame or its sheet.
 *  `g` is an entry of `shared.gates`, which holds those arguments. */
export function gateHas(g: { x: number; y: number; z: number; alongX: boolean }, x: number, y: number, z: number): boolean {
  const a = g.alongX ? x - g.x : z - g.z;
  return a >= -1 && a <= 2 && y >= g.y && y <= g.y + 4 && (g.alongX ? z === g.z : x === g.x);
}
type GateAt = { x: number; y: number; z: number; alongX: boolean };
export type GateEntry = GateAt & { kind: 1 | 2; dim: number };

/** True when the cell (x, y, z) holds no part of a body of the realm's players other than `but`. */
export function cellClear(realm: Realm, x: number, y: number, z: number, but: SimPlayer | null = null): boolean {
  for (const q of realm.players) {
    if (q === but) continue;
    const p = q.body;
    if (x + 1 > p.x - p.hw && x < p.x + p.hw && y + 1 > p.y && y < p.y + p.h && z + 1 > p.z - p.hw && z < p.z + p.hw) return false;
  }
  return true;
}
/** Every cell of the gate raised from (x, y, z), as buildGate lays it, with whether it is frame. */
function forCells(g: GateAt, f: (x: number, y: number, z: number, frame: boolean) => boolean | void): boolean {
  for (let a = -1; a <= 2; a++) for (let h = 0; h <= 4; h++) {
    if (f(g.x + (g.alongX ? a : 0), g.y + h, g.z + (g.alongX ? 0 : a), a === -1 || a === 2 || h === 0 || h === 4) === false) return false;
  }
  return true;
}
/** No body of the realm but `but` stands in a cell of this gate. */
export function gateClear(realm: Realm, g: GateAt, but: SimPlayer | null): boolean { return forCells(g, (x, y, z) => cellClear(realm, x, y, z, but)); }
/** The cell in front of a gate that an arrival stands in: on the sill laid with it. */
export function gateStand(g: GateAt): [number, number, number] { return g.alongX ? [g.x, g.y + 1, g.z + 1] : [g.x + 1, g.y + 1, g.z]; }
/** All 14 frame cells of a registered gate still hold its frame block (9: records are hints, blocks decide). */
export function gateIntact(realm: Realm, g: GateEntry): boolean {
  const frame = g.kind === 1 ? B.hollow_frame : B.rift_frame;
  return forCells(g, (x, y, z, edge) => !edge || realm.getBlock(x, y, z) === frame);
}
/** Registered gates of `kind` in this realm within `r` blocks of a column, nearest first. */
export function gatesNear(sim: Sim, realm: Realm, kind: number, x: number, z: number, r: number): GateEntry[] {
  return sim.shared.gates.filter((g) => g.kind === kind && g.dim === realm.dim && Math.hypot(g.x - x, g.z - z) <= r)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}
/** A portal block of `kind` (either kind when 0) within 2 blocks of a cell. */
export function portalNear(realm: Realm, kind: number, x: number, y: number, z: number): boolean {
  for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const id = realm.getBlock(x + dx, y + dy, z + dz);
    if ((kind !== 2 && id === B.hollow_portal) || (kind !== 1 && id === B.rift_portal)) return true;
  }
  return false;
}
/** Raise a 4x5 gate: frame around a 2x3 sheet of portal. */
export function buildGate(realm: Realm, kind: number, x: number, y: number, z: number, alongX: boolean): void {
  const frame = kind === 1 ? B.hollow_frame : B.rift_frame, portal = kind === 1 ? B.hollow_portal : B.rift_portal;
  for (let a = -1; a <= 2; a++) for (let h = 0; h <= 4; h++) {
    const edge = a === -1 || a === 2 || h === 0 || h === 4;
    realm.setBlock(x + (alongX ? a : 0), y + h, z + (alongX ? 0 : a), edge ? frame : portal);
  }
}
/** A gate placed outside its own dimension goes dark when its frame is broken, and gives the kit back.
 *  Arrival gates (a Hollow Gate in the Hollows, a Rift Gate in the Skyrift) keep their sheet: they are the way home.
 *  `by` broke the frame. */
export function collapseGate(realm: Realm, by: SimPlayer, x: number, y: number, z: number, kind: number): void {
  const sim = realm.sim, portal = kind === 1 ? B.hollow_portal : B.rift_portal, st = [x, y, z];
  let n = 0, first = true;
  while (st.length && n < 16) {
    const cz = st.pop()!, cy = st.pop()!, cx = st.pop()!;
    // the broken block may be a corner of the frame, which touches the sheet only diagonally: seed from all 26 neighbours
    for (let i = 0, cnt = first ? 27 : 6; i < cnt; i++) {
      const ax = cx + (first ? (i % 3) - 1 : i === 0 ? 1 : i === 1 ? -1 : 0), ay = cy + (first ? ((i / 3) | 0) % 3 - 1 : i === 2 ? 1 : i === 3 ? -1 : 0), az = cz + (first ? ((i / 9) | 0) - 1 : i === 4 ? 1 : i === 5 ? -1 : 0);
      if (realm.getBlock(ax, ay, az) !== portal) continue;
      realm.setBlock(ax, ay, az, 0); st.push(ax, ay, az); n++;
      // crossing back into this dimension must not aim at a gate that is no longer there
      for (const q of sim.players.values()) { const ret = q.portalReturn[realm.dim]; if (ret && ax === ret[0] && az === ret[2] && Math.abs(ay - ret[1]) <= 2) delete q.portalReturn[realm.dim]; }
    }
    first = false;
  }
  if (!n) return;
  realm.drops.spawn(x + 0.5, y + 0.5, z + 0.5, { k: kind === 1 ? 'hollow_gate_kit' : 'rift_gate_kit', n: 1 });
  sim.sink.emit({ p: by.slot }, ['s', 'portal', 0.6, 0.7]); sim.sink.emit({ p: by.slot }, ['t', 'The gate goes dark.', '#c8d0ff']);
}
/** Use the held gate kit with its foot in the cell (x, y, z). The player is told why when nothing is built. */
export function placeGate(sim: Sim, p: SimPlayer, x: number, y: number, z: number, alongX: boolean): boolean {
  const realm = sim.realms[p.dim], held = p.inv.held(), use = held ? item(held.k).use : undefined, own = { p: p.slot };
  if (use !== 'gate1' && use !== 'gate2') return false;
  // "on the ground" is asked of the cell, not of the face a client says it clicked: something a hand can touch lies under the foot
  const under = realm.getBlock(x, y - 1, z);
  if (!under || T_LIQUID[under]) { sim.sink.emit(own, ['t', 'Place the gate on the ground.', '#ff9a8a']); return false; }
  if (!gateFits(realm, x, y, z, alongX)) { sim.sink.emit(own, ['t', 'The gate needs a clear space 4 wide and 5 tall.', '#ff9a8a']); sim.sink.emit(own, ['s', 'error', 0.5, 1]); return false; }
  buildGate(realm, use === 'gate1' ? 1 : 2, x, y, z, alongX);
  p.inv.consumeHeld();
  sim.sink.emit(own, ['s', 'portal', 1, 1]);
  sim.sink.emit({ dim: p.dim, x, y, z, r: 40, not: p.slot }, ['s', 'portal', 1, 1, x + 0.5, y + 0.5, z + 0.5]);
  return true;
}
