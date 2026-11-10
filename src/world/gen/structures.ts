// Structure placement. Each structure type owns a coarse grid of regions; a region hashes to at
// most one origin, kept away from the region's edges, so any chunk can decide which structures
// overlap it (and the guide can locate the nearest one) from the seed alone.
import { SEA } from '../../core/constants';
import { hash01, hashInt, mulberry32 } from '../../core/noise';
import { B } from '../../data/blocks';
import { BIOME } from '../../data/biomes';
import type { Climate } from './climate';
import type { ChunkWriter } from './types';

type Rnd = () => number;
interface StructType {
  key: string; dim: number; cell: number; chance: number; radius: number; salt: number;
  y: 'surface' | 'under' | number; biomes?: number[]; dry?: boolean;
  build(w: ChunkWriter, x: number, y: number, z: number, r: Rnd, cl: Climate | null, seed: number): void;
}

// ---- helpers ------------------------------------------------------------------------
function disc(w: ChunkWriter, x: number, y: number, z: number, R: number, id: number, alt = 0, r?: Rnd, altP = 0): void {
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dz * dz > R * R + R) continue;
    const useAlt = alt && r ? r() < altP : false;
    w.set(x + dx, y, z + dz, useAlt ? alt : id);
  }
}
/** Level a circular site: foundation below, floor at y, open air above. */
function pad(w: ChunkWriter, x: number, y: number, z: number, R: number, floor: number, alt: number, r: Rnd, altP: number, under = B.stone, clear = 16): void {
  for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
    const d = dx * dx + dz * dz, edge = d > R * R + R;
    if (d > (R + 1) * (R + 1) + R) continue;
    const pick = r() < altP ? alt : floor;
    if (!w.inside(x + dx, y, z + dz)) continue;
    for (let k = 1; k <= 7; k++) w.set(x + dx, y - k, z + dz, under);
    w.set(x + dx, y, z + dz, edge ? under : pick);
    for (let k = 1; k <= clear; k++) w.set(x + dx, y + k, z + dz, 0);
  }
}
function pillar(w: ChunkWriter, x: number, y: number, z: number, h: number, id: number, cap = 0): void {
  for (let k = 1; k <= h; k++) w.set(x, y + k, z, id);
  if (cap) w.set(x, y + h + 1, z, cap);
}
function ringOf(n: number, R: number, fn: (dx: number, dz: number, i: number) => void, phase = 0): void {
  for (let i = 0; i < n; i++) { const a = phase + (i / n) * Math.PI * 2; fn(Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R), i); }
}
function dais(w: ChunkWriter, x: number, y: number, z: number, block: number, altar: number): void {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.set(x + dx, y + 1, z + dz, block);
  w.set(x, y + 2, z, altar);
}

function house(w: ChunkWriter, x: number, y: number, z: number, hw: number, hd: number, face: number, r: Rnd, wall: number, post: number, roof: number, loot: string): void {
  // foundation + floor
  for (let dz = -hd; dz <= hd; dz++) for (let dx = -hw; dx <= hw; dx++) {
    for (let k = 1; k <= 5; k++) w.set(x + dx, y - k, z + dz, B.cobble);
    w.set(x + dx, y, z + dz, B.oak_planks);
    for (let k = 1; k <= 6; k++) w.set(x + dx, y + k, z + dz, 0);
  }
  for (let k = 1; k <= 3; k++) for (let dz = -hd; dz <= hd; dz++) for (let dx = -hw; dx <= hw; dx++) {
    const ex = Math.abs(dx) === hw, ez = Math.abs(dz) === hd;
    if (!ex && !ez) continue;
    const corner = ex && ez, window = k === 2 && !corner && ((ex && dz % 2 === 0) || (ez && dx % 2 === 0));
    w.set(x + dx, y + k, z + dz, corner ? post : window ? B.glass : wall);
  }
  for (let dz = -hd - 1; dz <= hd + 1; dz++) for (let dx = -hw - 1; dx <= hw + 1; dx++) w.set(x + dx, y + 4, z + dz, roof);
  for (let dz = -hd + 1; dz <= hd - 1; dz++) for (let dx = -hw + 1; dx <= hw - 1; dx++) w.set(x + dx, y + 5, z + dz, roof);
  // door on the side facing the village centre (face: 0 +x, 1 -x, 2 +z, 3 -z)
  const dxo = face === 0 ? hw : face === 1 ? -hw : 0, dzo = face === 2 ? hd : face === 3 ? -hd : 0, door = face < 2 ? B.door_z : B.door_x;
  w.set(x + dxo, y + 1, z + dzo, door); w.set(x + dxo, y + 2, z + dzo, door); w.set(x + dxo, y + 3, z + dzo, wall);
  const sx = face === 0 ? 1 : face === 1 ? -1 : 0, sz = face === 2 ? 1 : face === 3 ? -1 : 0;
  for (let k = 1; k <= 2; k++) { w.set(x + dxo + sx * k, y + 1, z + dzo + sz * k, 0); w.set(x + dxo + sx * k, y + 2, z + dzo + sz * k, 0); }
  // furnishings
  const cx = x - sx * (hw - 1) - (sx === 0 ? hw - 1 : 0), cz = z - sz * (hd - 1) - (sz === 0 ? hd - 1 : 0);
  w.set(cx, y + 1, cz, B.crate); w.ent(cx, y + 1, cz, 'crate', loot);
  w.set(x + (sx === 0 ? hw - 1 : -sx * (hw - 1)), y + 1, z + (sz === 0 ? 0 : -sz * (hd - 1)) + (sx === 0 ? 0 : hd - 1), B.lantern);
  if (r() < 0.5) w.set(x - sx, y + 1, z - sz, B.workbench); else w.set(x - sx, y + 1, z - sz, B.bedroll);
}

// ---- structure table -----------------------------------------------------------------
const LANDS = [BIOME.plains, BIOME.forest, BIOME.palewood, BIOME.bloomvale, BIOME.taiga, BIOME.savanna, BIOME.desert];
export const STRUCTS: StructType[] = [
  { key: 'village', dim: 0, cell: 20, chance: 0.75, radius: 30, salt: 11, y: 'surface', biomes: LANDS, dry: true,
    build(w, x, y, z, r, cl) {
      const bio = cl!.biomeAt(x, z), desert = bio === BIOME.desert, taiga = bio === BIOME.taiga;
      const wall = desert ? B.sandstone_bricks : taiga ? B.pine_planks : B.oak_planks, post = desert ? B.sandstone : taiga ? B.pine_log : B.oak_log, roof = desert ? B.sandstone : B.thatch;
      // well
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const rim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let k = 1; k <= 4; k++) w.set(x + dx, y - k, z + dz, B.cobble);
        w.set(x + dx, y, z + dz, rim ? B.cobble : B.water); w.set(x + dx, y + 1, z + dz, rim ? B.cobble : 0);
        for (let k = 2; k <= 5; k++) w.set(x + dx, y + k, z + dz, 0);
      }
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { pillar(w, x + dx, y + 1, z + dz, 2, post); }
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) w.set(x + dx, y + 4, z + dz, roof);
      w.set(x, y + 3, z, B.lantern);
      const n = 4 + ((r() * 3) | 0), phase = r() * 6.283;
      for (let i = 0; i < n; i++) {
        const a = phase + (i / n) * 6.283, R = 13 + r() * 9, hx = Math.round(x + Math.cos(a) * R), hz = Math.round(z + Math.sin(a) * R);
        const hw = 2 + ((r() * 2) | 0), hd = 2 + ((r() * 2) | 0), hy = Math.max(SEA + 1, cl!.heightAt(hx, hz));
        const face = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 1 : 0) : Math.sin(a) > 0 ? 3 : 2;
        house(w, hx, hy, hz, hw, hd, face, r, wall, post, roof, 'village');
        // path back to the well, laid on the natural surface
        const steps = Math.ceil(R);
        for (let s = 3; s < steps - hw; s++) {
          const px = Math.round(x + Math.cos(a) * s), pz = Math.round(z + Math.sin(a) * s);
          for (let o = 0; o <= 1; o++) { const qx = px + (Math.abs(Math.sin(a)) > 0.7 ? o : 0), qz = pz + (Math.abs(Math.sin(a)) > 0.7 ? 0 : o); if (w.inside(qx, 100, qz)) { const h = cl!.heightAt(qx, qz); if (h >= SEA) { w.set(qx, h, qz, B.path); w.set(qx, h + 1, qz, 0); } } }
        }
      }
    } },
  { key: 'ruin', dim: 0, cell: 8, chance: 0.5, radius: 6, salt: 23, y: 'surface', dry: true,
    build(w, x, y, z, r) {
      for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
        const edge = Math.abs(dx) === 4 || Math.abs(dz) === 4, f = r(), hgt = edge ? ((r() * 5) | 0) : 0;
        for (let k = 1; k <= 3; k++) w.set(x + dx, y - k, z + dz, B.cobble);
        w.set(x + dx, y, z + dz, f < 0.35 ? B.moss_stone : f < 0.6 ? B.cobble : B.stone_bricks);
        for (let k = 1; k <= 5; k++) w.set(x + dx, y + k, z + dz, k <= hgt ? (r() < 0.4 ? B.mossy_bricks : B.stone_bricks) : 0);
      }
      w.set(x + 4, y + 1, z, 0); w.set(x + 4, y + 2, z, 0);
      w.set(x - 2, y + 1, z - 2, B.chest); w.ent(x - 2, y + 1, z - 2, 'chest', 'ruin');
      if (r() < 0.45) { w.set(x + 2, y + 1, z + 2, B.brood_nest); w.ent(x + 2, y + 1, z + 2, 'nest', 'gloomshade'); }
      pillar(w, x, y, z, 2, B.stone_bricks, B.lantern);
    } },
  { key: 'dungeon', dim: 0, cell: 10, chance: 0.8, radius: 34, salt: 37, y: 'under',
    build(w, x, y, z, r) {
      const rooms: [number, number][] = [[x, z]];
      const n = 3 + ((r() * 3) | 0);
      for (let i = 1; i < n; i++) { const p = rooms[i - 1], horiz = r() < 0.5, d = (12 + ((r() * 5) | 0)) * (r() < 0.5 ? -1 : 1); rooms.push([Math.max(x - 24, Math.min(x + 24, p[0] + (horiz ? d : 0))), Math.max(z - 24, Math.min(z + 24, p[1] + (horiz ? 0 : d)))]); }
      const box = (x0: number, z0: number, x1: number, z1: number, h: number): void => {
        for (let zz = z0 - 1; zz <= z1 + 1; zz++) for (let xx = x0 - 1; xx <= x1 + 1; xx++) for (let k = -1; k <= h; k++) {
          const shell = xx < x0 || xx > x1 || zz < z0 || zz > z1 || k < 0 || k === h;
          if (shell) { if (w.get(xx, y + k, zz) !== 0) w.set(xx, y + k, zz, B.wardstone); } else w.set(xx, y + k, zz, 0);
        }
      };
      // corridors first so rooms overwrite their ends
      for (let i = 1; i < rooms.length; i++) { const a = rooms[i - 1], b = rooms[i]; box(Math.min(a[0], b[0]) - 1, Math.min(a[1], b[1]) - 1, Math.max(a[0], b[0]) + 1, Math.max(a[1], b[1]) + 1, 3); }
      rooms.forEach((p, i) => {
        // walls are solid here even where a cave used to be
        for (let zz = p[1] - 5; zz <= p[1] + 5; zz++) for (let xx = p[0] - 5; xx <= p[0] + 5; xx++) for (let k = -1; k <= 5; k++) {
          const shell = Math.abs(xx - p[0]) === 5 || Math.abs(zz - p[1]) === 5 || k < 0 || k === 5;
          const door = shell && k >= 0 && k < 3 && (Math.abs(xx - p[0]) <= 1 || Math.abs(zz - p[1]) <= 1) && k !== 5;
          w.set(xx, y + k, zz, shell && !door ? B.wardstone : 0);
        }
        for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) pillar(w, p[0] + dx, y - 1, p[1] + dz, 3, B.stone_bricks, i % 2 ? B.crystal_cyan : B.lantern);
        if (i === rooms.length - 1) { w.set(p[0], y, p[1], B.chest); w.ent(p[0], y, p[1], 'chest', 'dungeon'); w.set(p[0] + 1, y, p[1], B.crate); w.ent(p[0] + 1, y, p[1], 'crate', 'crate'); }
        else if (i > 0 || rooms.length < 4) { w.set(p[0], y, p[1], B.brood_nest); w.ent(p[0], y, p[1], 'nest', i % 2 ? 'rustbound' : 'stonegnawer'); }
        if (r() < 0.5) { w.set(p[0] - 3, y, p[1] + 2, B.crate); w.ent(p[0] - 3, y, p[1] + 2, 'crate', 'crate'); }
      });
    } },
  { key: 'arena1', dim: 0, cell: 14, chance: 1, radius: 16, salt: 101, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y, z, 13, B.moss_stone, B.grass, r, 0.35, B.dirt);
      ringOf(6, 11, (dx, dz) => { pillar(w, x + dx, y, z + dz, 5, B.oak_log, B.oak_leaves); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.set(x + dx + a, y + 5, z + dz + b, B.oak_leaves); });
      ringOf(6, 8, (dx, dz) => w.set(x + dx, y + 1, z + dz, B.glowshroom), 0.5);
      dais(w, x, y, z, B.mossy_bricks, B.altar1);
    } },
  { key: 'arena2', dim: 0, cell: 18, chance: 1, radius: 18, salt: 103, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y - 3, z, 14, B.sandstone, B.sand, r, 0.4, B.sandstone, 19);
      for (let dz = -16; dz <= 16; dz++) for (let dx = -16; dx <= 16; dx++) { const d = Math.sqrt(dx * dx + dz * dz); if (d > 14.4 && d < 16.4) { for (let k = -2; k <= 0; k++) w.set(x + dx, y + k, z + dz, B.gilded_bricks); for (let k = 1; k <= 8; k++) w.set(x + dx, y + k, z + dz, 0); } }
      ringOf(4, 11, (dx, dz) => pillar(w, x + dx, y - 3, z + dz, 4, B.sandstone_bricks, B.lantern), 0.78);
      dais(w, x, y - 3, z, B.gilded_bricks, B.altar2);
    } },
  { key: 'arena3', dim: 0, cell: 22, chance: 1, radius: 17, salt: 107, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y, z, 14, B.wardstone, B.stone_bricks, r, 0.3);
      ringOf(8, 12, (dx, dz, i) => pillar(w, x + dx, y, z + dz, 4 + (i % 2) * 2, B.bone_block, B.crystal_cyan));
      dais(w, x, y, z, B.wardstone, B.altar3);
    } },
  { key: 'arena5', dim: 0, cell: 24, chance: 1, radius: 17, salt: 109, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y, z, 14, B.stone_bricks, B.storm_block, r, 0.12, B.stone, 30);
      ringOf(6, 12, (dx, dz, i) => pillar(w, x + dx, y, z + dz, 8 + (i % 3) * 3, B.storm_block));
      dais(w, x, y, z, B.stone_bricks, B.altar5);
    } },
  { key: 'arena7', dim: 0, cell: 26, chance: 1, radius: 17, salt: 113, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y, z, 14, B.nightglass, B.deepstone, r, 0.5, B.deepstone);
      ringOf(10, 12, (dx, dz, i) => pillar(w, x + dx, y, z + dz, 2 + (i % 2) * 3, B.nightglass, B.crystal_violet));
      dais(w, x, y, z, B.nightglass, B.altar7);
    } },
  { key: 'arena8', dim: 0, cell: 30, chance: 1, radius: 20, salt: 127, y: 'surface',
    build(w, x, y, z, r) {
      pad(w, x, y, z, 17, B.stone_bricks, B.cobble, r, 0.4);
      ringOf(8, 14, (dx, dz) => { for (let k = 0; k < 4; k++) disc(w, x + dx, y + 1 + k, z + dz, Math.max(0, 2 - k), B.cobble); w.set(x + dx, y + 5, z + dz, B.lantern); });
      for (let k = 0; k < 2; k++) disc(w, x, y + 1 + k, z, 3 - k, B.wardstone);
      w.set(x, y + 3, z, B.altar8);
    } },
  // Gloomroot Hollows
  { key: 'arena4', dim: 1, cell: 12, chance: 1, radius: 18, salt: 131, y: 70,
    build(w, x, y, z, r) {
      for (let dz = -17; dz <= 17; dz++) for (let dx = -17; dx <= 17; dx++) {
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 17) continue;
        const bare = r() < 0.2;
        if (!w.inside(x + dx, y, z + dz)) continue;
        const dome = Math.round(Math.sqrt(Math.max(0, 16 * 16 - d * d)) * 0.8);
        for (let k = 1; k <= 5; k++) w.set(x + dx, y - k, z + dz, B.gloomstone);
        w.set(x + dx, y, z + dz, d > 15.5 || bare ? B.gloomstone : B.mycel);
        for (let k = 1; k <= dome; k++) w.set(x + dx, y + k, z + dz, 0);
      }
      ringOf(6, 12, (dx, dz, i) => pillar(w, x + dx, y, z + dz, 4, B.gloom_stem, i % 2 ? B.gloomcap_teal : B.gloomcap_violet));
      ringOf(4, 6, (dx, dz) => w.set(x + dx, y + 1, z + dz, B.sporelamp), 0.4);
      dais(w, x, y, z, B.gloomstone, B.altar4);
    } },
  { key: 'cache1', dim: 1, cell: 6, chance: 0.6, radius: 5, salt: 137, y: 'under',
    build(w, x, y, z) {
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) for (let k = -1; k <= 4; k++) {
        const shell = Math.abs(dx) === 3 || Math.abs(dz) === 3 || k < 0 || k === 4, gap = shell && dz === 3 && Math.abs(dx) <= 0 && k >= 0 && k < 2;
        w.set(x + dx, y + k, z + dz, shell && !gap ? B.wardstone : 0);
      }
      w.set(x, y, z, B.chest); w.ent(x, y, z, 'chest', 'hollow'); w.set(x - 2, y, z - 2, B.sporelamp); w.set(x + 2, y, z - 2, B.sporelamp);
      w.set(x + 2, y, z + 1, B.brood_nest); w.ent(x + 2, y, z + 1, 'nest', 'mycelid_knight');
    } },
  // The Skyrift
  { key: 'arena6', dim: 2, cell: 12, chance: 1, radius: 18, salt: 139, y: 150,
    build(w, x, y, z, r) {
      for (let k = 0; k < 5; k++) disc(w, x, y - k, z, 15 - k * 2, B.riftstone, B.prism_crystal, r, k === 0 ? 0.06 : 0);
      for (let dz = -15; dz <= 15; dz++) for (let dx = -15; dx <= 15; dx++) if (dx * dx + dz * dz <= 240) for (let k = 1; k <= 18; k++) w.set(x + dx, y + k, z + dz, 0);
      ringOf(8, 13, (dx, dz, i) => pillar(w, x + dx, y, z + dz, 3 + (i % 2) * 4, B.prism_crystal));
      dais(w, x, y, z, B.riftstone, B.altar6);
    } },
  { key: 'cache2', dim: 2, cell: 6, chance: 0.6, radius: 5, salt: 149, y: 132,
    build(w, x, y, z, r) {
      for (let k = 0; k < 3; k++) disc(w, x, y - k, z, 4 - k, k === 0 ? B.skyturf : B.riftstone);
      w.set(x, y + 1, z, B.chest); w.ent(x, y + 1, z, 'chest', 'rift');
      pillar(w, x + 3, y, z, 3, B.star_log, B.prism_crystal); pillar(w, x - 3, y, z, 2, B.star_log, B.prism_crystal);
      void r;
    } },
];
const BY_KEY = new Map(STRUCTS.map((s) => [s.key, s]));

/** Origin of the structure in a region, or null if the region has none. */
export function structAt(t: StructType, rx: number, rz: number, seed: number, cl: Climate | null): [number, number, number] | null {
  if (hash01(rx, t.salt, rz, seed) >= t.chance) return null;
  const size = t.cell * 16, margin = t.radius + 2;
  let x = rx * size + margin + Math.floor(hash01(rx, t.salt + 1, rz, seed) * (size - margin * 2));
  let z = rz * size + margin + Math.floor(hash01(rx, t.salt + 2, rz, seed) * (size - margin * 2));
  // the very first arena sits near the world origin so the opening hours are not a trek
  if (t.key === 'arena1' && rx === 0 && rz === 0) { x = 70 + Math.floor(hash01(1, 2, 3, seed) * 50); z = 60 + Math.floor(hash01(3, 2, 1, seed) * 50); }
  let y: number;
  if (t.y === 'surface') {
    const h = cl ? cl.heightAt(x, z) : 100;
    if (t.dry && h < SEA + 1) return null;
    if (t.biomes && cl && !t.biomes.includes(cl.biomeAt(x, z))) return null;
    if (t.key === 'village' && cl) { const a = cl.heightAt(x + 14, z), b = cl.heightAt(x - 14, z), c = cl.heightAt(x, z + 14), d = cl.heightAt(x, z - 14); if (Math.max(a, b, c, d) - Math.min(a, b, c, d) > 9 || Math.min(a, b, c, d) < SEA) return null; }
    y = Math.max(SEA + 1, h);
  } else if (t.y === 'under') y = t.dim === 0 ? 26 + Math.floor(hash01(rx, t.salt + 3, rz, seed) * 22) : 40 + Math.floor(hash01(rx, t.salt + 3, rz, seed) * 80);
  else y = t.y;
  return [x, y, z];
}

export function stampStructures(w: ChunkWriter, dim: number, cx: number, cz: number, seed: number, cl: Climate | null): void {
  const x0 = cx * 16, z0 = cz * 16;
  for (const t of STRUCTS) {
    if (t.dim !== dim) continue;
    const rx = Math.floor(cx / t.cell), rz = Math.floor(cz / t.cell);
    const o = structAt(t, rx, rz, seed, cl);
    if (!o) continue;
    if (o[0] + t.radius < x0 || o[0] - t.radius > x0 + 15 || o[2] + t.radius < z0 || o[2] - t.radius > z0 + 15) continue;
    t.build(w, o[0], o[1], o[2], mulberry32(hashInt(rx, t.salt, rz, seed)), cl, seed);
  }
}

/** Nearest structure of a type to (x, z), searching outward ring by ring. */
export function locate(key: string, x: number, z: number, seed: number, cl: Climate | null): [number, number, number] | null {
  const t = BY_KEY.get(key);
  if (!t) return null;
  const size = t.cell * 16, rx0 = Math.floor(x / size), rz0 = Math.floor(z / size);
  let best: [number, number, number] | null = null, bd = Infinity;
  for (let ring = 0; ring <= 5; ring++) {
    for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      const o = structAt(t, rx0 + dx, rz0 + dz, seed, cl);
      if (!o) continue;
      const d = (o[0] - x) ** 2 + (o[2] - z) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    if (best && bd < (ring * size) ** 2) break;
  }
  return best;
}
export const structDim = (key: string): number => BY_KEY.get(key)?.dim ?? 0;
