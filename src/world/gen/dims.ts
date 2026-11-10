// Generators for the two extra dimensions.
//  - Gloomroot Hollows: a sealed world of vast caverns lit only by its own fungi.
//  - The Skyrift: floating islands over an endless drop.
import { CAREA, CS, CVOL } from '../../core/constants';
import { Simplex, fbm2, hash01, hashInt, mulberry32, smoothstep } from '../../core/noise';
import { B, T_EMITS } from '../../data/blocks';
import { BIOME } from '../../data/biomes';
import { OverworldGen, placeOres } from './overworld';
import { stampStructures } from './structures';
import { ChunkWriter, GenOut, Generator } from './types';

const LY = 65;

class HollowsGen implements Generator {
  private a: Simplex; private b: Simplex; private c: Simplex; private nB: Simplex;
  private f = new Float32Array(25 * LY);
  constructor(readonly seed: number) { this.a = new Simplex(seed + 501); this.b = new Simplex(seed + 503); this.c = new Simplex(seed + 507); this.nB = new Simplex(seed + 509); }

  generate(cx: number, cz: number): GenOut {
    const blocks = new Uint8Array(CVOL), biomes = new Uint8Array(CAREA), ox = cx * CS, oz = cz * CS, seed = this.seed, f = this.f;
    const w = new ChunkWriter(blocks, ox, oz);
    const STONE = B.gloomstone, TOP = 180, POOL = 30;
    for (let lz = 0; lz < 5; lz++) for (let lx = 0; lx < 5; lx++) {
      const wx = ox + lx * 4, wz = oz + lz * 4, o = (lz * 5 + lx) * LY;
      const open = fbm2(this.c, wx / 240, wz / 240, 2) * 0.22;
      for (let ly = 0; ly <= 46; ly++) {
        const y = ly * 4;
        // hollow out the middle heights, keep a solid floor and roof
        const band = smoothstep(8, 40, y) * smoothstep(TOP - 4, TOP - 44, y);
        f[o + ly] = this.a.n3(wx / 84, y / 52, wz / 84) * 0.62 + this.b.n3(wx / 30, y / 24, wz / 30) * 0.38 + band * 0.42 + open - 0.36;
      }
    }
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const base = ((lz << 4) | lx) << 8, wx = ox + lx, wz = oz + lz;
      biomes[(lz << 4) | lx] = fbm2(this.nB, wx / 180, wz / 180, 2) > 0.22 ? BIOME.hollows_crystal : BIOME.hollows;
      for (let y = 0; y <= TOP; y++) blocks[base + y] = y < 3 || y > TOP - 3 ? B.bedrock : STONE;
    }
    placeOres(blocks, cx, cz, seed + 1, [
      { b: 'umbrite_ore', n: 9, size: 6, y0: 8, y1: 170 }, { b: 'noctrium_ore', n: 5, size: 5, y0: 6, y1: 90 },
      { b: 'coal_ore', n: 6, size: 8, y0: 10, y1: 170 }, { b: 'mana_ore', n: 4, size: 4, y0: 10, y1: 170 }, { b: 'deepstone', n: 6, size: 24, y0: 6, y1: 170 },
    ], [STONE]);
    for (let cz4 = 0; cz4 < 4; cz4++) for (let cx4 = 0; cx4 < 4; cx4++) {
      const o00 = (cz4 * 5 + cx4) * LY, o10 = o00 + LY, o01 = o00 + 5 * LY, o11 = o01 + LY;
      for (let ly = 0; ly < 45; ly++) for (let dy = 0; dy < 4; dy++) {
        const y = ly * 4 + dy;
        if (y < 4 || y > TOP - 4) continue;
        const ty = dy / 4;
        const a00 = f[o00 + ly] + (f[o00 + ly + 1] - f[o00 + ly]) * ty, a10 = f[o10 + ly] + (f[o10 + ly + 1] - f[o10 + ly]) * ty;
        const a01 = f[o01 + ly] + (f[o01 + ly + 1] - f[o01 + ly]) * ty, a11 = f[o11 + ly] + (f[o11 + ly + 1] - f[o11 + ly]) * ty;
        for (let dz = 0; dz < 4; dz++) {
          const tz = dz / 4, a0 = a00 + (a01 - a00) * tz, a1 = a10 + (a11 - a10) * tz;
          for (let dx = 0; dx < 4; dx++) {
            if (a0 + (a1 - a0) * (dx / 4) <= 0) continue;
            blocks[(((((cz4 * 4 + dz) << 4) | (cx4 * 4 + dx)) << 8) | y)] = y <= POOL ? B.water : 0;
          }
        }
      }
    }
    // dressing: turf on every floor, fungi, hanging lamps; giant gloomcaps where there is headroom
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const base = ((lz << 4) | lx) << 8, wx = ox + lx, wz = oz + lz, crystal = biomes[(lz << 4) | lx] === BIOME.hollows_crystal;
      for (let y = POOL + 1; y < TOP - 4; y++) {
        if (blocks[base + y] !== 0) continue;
        const below = blocks[base + y - 1], above = blocks[base + y + 1], r = hash01(wx, y, wz, seed + 3);
        if (below === STONE) {
          if (crystal) { if (r < 0.018) { const c = r < 0.009 ? B.crystal_violet : B.crystal_cyan, n = 1 + ((r * 280) | 0); for (let k = 0; k < n && blocks[base + y + k] === 0; k++) blocks[base + y + k] = c; } }
          else if (r > 0.6 && r < 0.63) blocks[base + y] = B.lumen_frond;
          if (!crystal) {
            blocks[base + y - 1] = B.mycel;
            if (r < 0.1) blocks[base + y] = B.lumen_frond; else if (r < 0.14) blocks[base + y] = B.glowshroom; else if (r < 0.16) blocks[base + y] = B.mushroom_brown;
            else if (r < 0.172 && lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) {
              let room = 0; while (room < 12 && blocks[base + y + room] === 0) room++;
              if (room >= 8) {
                const rnd = mulberry32(hashInt(wx, y, wz, seed)), th = 4 + ((rnd() * Math.min(5, room - 6)) | 0), cap = rnd() < 0.5 ? B.gloomcap_teal : B.gloomcap_violet;
                for (let k = 0; k < th; k++) blocks[base + y + k] = B.gloom_stem;
                for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
                  const d = dx * dx + dz * dz;
                  if (d <= 10) w.soft(wx + dx, y + th, wz + dz, cap);
                  if (d <= 4) w.soft(wx + dx, y + th + 1, wz + dz, cap);
                  if (d > 5 && d <= 10) w.soft(wx + dx, y + th - 1, wz + dz, cap);
                }
              }
            }
          }
        } else if (above === STONE && r < 0.012) blocks[base + y] = B.sporelamp;
      }
    }
    stampStructures(w, 1, cx, cz, seed, null);
    let hasEmit = false;
    for (let i = 0; i < CVOL; i++) if (T_EMITS[blocks[i]]) { hasEmit = true; break; }
    return { blocks, biomes, hasEmit, ents: w.ents };
  }
}

class RiftGen implements Generator {
  private mask: Simplex; private lift: Simplex; private d3: Simplex; private nB: Simplex;
  constructor(readonly seed: number) { this.mask = new Simplex(seed + 701); this.lift = new Simplex(seed + 703); this.d3 = new Simplex(seed + 707); this.nB = new Simplex(seed + 709); }

  generate(cx: number, cz: number): GenOut {
    const blocks = new Uint8Array(CVOL), biomes = new Uint8Array(CAREA), ox = cx * CS, oz = cz * CS, seed = this.seed;
    const w = new ChunkWriter(blocks, ox, oz);
    const tops = new Int16Array(CAREA).fill(-1);
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const wx = ox + lx, wz = oz + lz, base = ((lz << 4) | lx) << 8, ci = (lz << 4) | lx;
      const shards = fbm2(this.nB, wx / 260, wz / 260, 2) > 0.2;
      biomes[ci] = shards ? BIOME.rift_shards : BIOME.rift;
      // two island layers at different heights
      for (let layer = 0; layer < 2; layer++) {
        const m = fbm2(this.mask, wx / (layer ? 70 : 110) + layer * 40, wz / (layer ? 70 : 110), 3) * 1.5 - (layer ? 0.42 : 0.18);
        if (m <= 0) continue;
        const centre = (layer ? 168 : 120) + fbm2(this.lift, wx / 200 + layer * 9, wz / 200, 2) * 16;
        const up = Math.min(5, m * 9) + this.d3.n2(wx / 18, wz / 18) * 1.2, down = Math.min(26, m * 44) * (0.7 + this.d3.n2(wx / 9 + 5, wz / 9) * 0.3);
        const y1 = Math.floor(centre + up), y0 = Math.floor(centre - down);
        for (let y = Math.max(2, y0); y <= y1; y++) blocks[base + y] = y === y1 ? B.skyturf : y >= y1 - 2 ? B.skysoil : B.riftstone;
        if (y1 > tops[ci]) tops[ci] = y1;
      }
      // drifting cloudstuff
      const cl = fbm2(this.d3, wx / 60 + 90, wz / 60, 2);
      if (cl > 0.42) { const cy = 96 + ((hash01(wx >> 3, 0, wz >> 3, seed) * 12) | 0); for (let k = 0; k < (cl > 0.52 ? 2 : 1); k++) if (blocks[base + cy + k] === 0) blocks[base + cy + k] = B.cloud; }
    }
    placeOres(blocks, cx, cz, seed + 2, [{ b: 'aetherium_ore', n: 16, size: 6, y0: 90, y1: 180 }, { b: 'prismite_ore', n: 9, size: 5, y0: 90, y1: 180 }, { b: 'mana_ore', n: 6, size: 4, y0: 90, y1: 180 }], [B.riftstone]);
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const ci = (lz << 4) | lx, top = tops[ci];
      if (top < 0) continue;
      const wx = ox + lx, wz = oz + lz, base = ci << 8, r = hash01(wx, 5, wz, seed), shards = biomes[ci] === BIOME.rift_shards;
      if (blocks[base + top] !== B.skyturf || blocks[base + top + 1] !== 0) continue;
      if (shards) {
        if (r < 0.03) { const n = 2 + ((r * 200) | 0); for (let k = 1; k <= n; k++) blocks[base + top + k] = B.prism_crystal; }
        else if (r < 0.1) blocks[base + top + 1] = B.flower_white;
      } else if (r < 0.022 && lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) {
        const rnd = mulberry32(hashInt(wx, top, wz, seed)), th = 4 + ((rnd() * 4) | 0);
        for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
          const d = (dx * dx + dz * dz) / 8.5 + (dy * dy) / 4.6;
          if (d <= 1 && !(d > 0.6 && rnd() < 0.3)) w.soft(wx + dx, top + th + 1 + dy, wz + dz, B.star_leaves);
        }
        for (let k = 1; k <= th; k++) blocks[base + top + k] = B.star_log;
      } else if (r < 0.24) blocks[base + top + 1] = r < 0.2 ? B.tall_grass : r < 0.22 ? B.flower_blue : B.flower_white;
    }
    stampStructures(w, 2, cx, cz, seed, null);
    let hasEmit = false;
    for (let i = 0; i < CVOL; i++) if (T_EMITS[blocks[i]]) { hasEmit = true; break; }
    return { blocks, biomes, hasEmit, ents: w.ents };
  }
}

export function makeDimGen(seed: number, dim: number): Generator {
  return dim === 1 ? new HollowsGen(seed) : dim === 2 ? new RiftGen(seed) : new OverworldGen(seed);
}
