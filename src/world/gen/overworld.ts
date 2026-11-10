// Overworld terrain: climate-driven heightfield, cheese + spaghetti caves, ravines, ore veins,
// three deep cave biomes, and biome-specific trees and ground cover.
import { CAREA, CS, CVOL, SEA } from '../../core/constants';
import { Simplex, fbm2, hash01, hashInt, mulberry32, smoothstep } from '../../core/noise';
import { B, T_EMITS } from '../../data/blocks';
import { BIOME } from '../../data/biomes';
import { Climate, newCol } from './climate';
import { ChunkWriter, GenOut, Generator } from './types';
import { stampStructures } from './structures';

const PAD = 6, W = CS + PAD * 2;
const LY = 65;

interface OreSpec { b: string; n: number; size: number; y0: number; y1: number }
export const OVERWORLD_ORES: OreSpec[] = [
  { b: 'dirt', n: 5, size: 22, y0: 40, y1: 150 },
  { b: 'gravel', n: 4, size: 18, y0: 10, y1: 130 },
  { b: 'coal_ore', n: 14, size: 10, y0: 30, y1: 190 },
  { b: 'iron_ore', n: 11, size: 6, y0: 12, y1: 120 },
  { b: 'gold_ore', n: 4, size: 5, y0: 6, y1: 60 },
  { b: 'mana_ore', n: 3, size: 4, y0: 8, y1: 72 },
  { b: 'lumenite_ore', n: 2, size: 4, y0: 4, y1: 34 },
  { b: 'cindrite_ore', n: 3, size: 5, y0: 3, y1: 26 },
  { b: 'eclipsium_ore', n: 1, size: 3, y0: 2, y1: 14 },
];

// tree density and kind per biome: [density, kindA, kindB, chanceOfB]
const TREES: Record<number, [number, number, number, number]> = {
  [BIOME.plains]: [0.0025, 0, 0, 0], [BIOME.forest]: [0.04, 0, 2, 0.18], [BIOME.palewood]: [0.035, 2, 0, 0.1],
  [BIOME.bloomvale]: [0.022, 5, 5, 0], [BIOME.taiga]: [0.035, 1, 1, 0], [BIOME.tundra]: [0.003, 1, 1, 0],
  [BIOME.savanna]: [0.005, 4, 4, 0], [BIOME.jungle]: [0.06, 3, 0, 0.35], [BIOME.swamp]: [0.014, 6, 6, 0],
  [BIOME.crags]: [0.006, 1, 1, 0],
};

export function placeOres(blocks: Uint8Array, cx: number, cz: number, seed: number, ores: OreSpec[], hosts: number[]): void {
  const rnd = mulberry32(hashInt(cx, 7, cz, seed));
  for (const o of ores) {
    const id = B[o.b];
    for (let n = 0; n < o.n; n++) {
      let x = (rnd() * 16) | 0, z = (rnd() * 16) | 0, y = (o.y0 + rnd() * (o.y1 - o.y0)) | 0;
      for (let s = 0; s < o.size; s++) {
        const i = (((z << 4) | x) << 8) | y;
        if (hosts.includes(blocks[i])) blocks[i] = id;
        const a = (rnd() * 6) | 0;
        if (a === 0 && x < 15) x++; else if (a === 1 && x > 0) x--; else if (a === 2 && z < 15) z++;
        else if (a === 3 && z > 0) z--; else if (a === 4 && y < 250) y++; else if (y > 1) y--;
      }
    }
  }
}

function blob(w: ChunkWriter, cx: number, cy: number, cz: number, rx: number, ry: number, id: number, rnd: () => number): void {
  const R = Math.ceil(rx), RY = Math.ceil(ry);
  for (let dy = -RY; dy <= RY; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = (dx * dx + dz * dz) / (rx * rx) + (dy * dy) / (ry * ry);
    if (d > 1) continue;
    if (d > 0.62 && rnd() < 0.3) continue;
    w.soft(cx + dx, cy + dy, cz + dz, id);
  }
}
function disk(w: ChunkWriter, cx: number, y: number, cz: number, r: number, id: number, rnd: () => number): void {
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (r > 0 && Math.abs(dx) === r && Math.abs(dz) === r && (r > 1 || rnd() < 0.6)) continue;
    w.soft(cx + dx, y, cz + dz, id);
  }
}

/** Stamp a tree. kinds: 0 oak, 1 pine, 2 palebark, 3 kapok, 4 flat-top kapok, 5 rosewood, 6 swamp oak */
export function stampTree(w: ChunkWriter, kind: number, x: number, y: number, z: number, seed: number): void {
  const rnd = mulberry32(hashInt(x, y, z, seed));
  let log: number, leaves: number, th: number;
  switch (kind) {
    case 1: {
      log = B.pine_log; leaves = B.pine_leaves; th = 6 + ((rnd() * 4) | 0);
      w.soft(x, y + th + 1, z, leaves);
      for (let k = 0, yy = y + th; yy >= y + 3; yy--, k++) disk(w, x, yy, z, Math.min(3, 1 + (k % 2) + ((k / 4) | 0)), leaves, rnd);
      break;
    }
    case 2: log = B.pale_log; leaves = B.pale_leaves; th = 5 + ((rnd() * 3) | 0); blob(w, x, y + th, z, 2.1, 2.5, leaves, rnd); break;
    case 3: {
      log = B.kapok_log; leaves = B.kapok_leaves; th = 9 + ((rnd() * 7) | 0);
      blob(w, x, y + th, z, 3.7, 2.3, leaves, rnd);
      const n = 1 + ((rnd() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.283, hy = y + 4 + ((rnd() * (th - 6)) | 0);
        blob(w, x + Math.round(Math.cos(a) * 2), hy, z + Math.round(Math.sin(a) * 2), 2.1, 1.4, leaves, rnd);
      }
      break;
    }
    case 4: log = B.kapok_log; leaves = B.kapok_leaves; th = 4 + ((rnd() * 3) | 0); disk(w, x, y + th, z, 3, leaves, rnd); disk(w, x, y + th + 1, z, 2, leaves, rnd); break;
    case 5: log = B.rose_log; leaves = B.rose_leaves; th = 4 + ((rnd() * 3) | 0); blob(w, x, y + th + 1, z, 3.3, 2.3, leaves, rnd); break;
    case 6: log = B.oak_log; leaves = B.oak_leaves; th = 4 + ((rnd() * 3) | 0); blob(w, x, y + th, z, 3.4, 1.9, leaves, rnd); break;
    default: log = B.oak_log; leaves = B.oak_leaves; th = 4 + ((rnd() * 3) | 0); blob(w, x, y + th + 1, z, 2.7, 2.2, leaves, rnd);
  }
  for (let i = 1; i <= th; i++) w.set(x, y + i, z, log);
  if (w.get(x, y, z) === B.grass || w.get(x, y, z) === B.snowy_grass) w.set(x, y, z, B.dirt);
}

export class OverworldGen implements Generator {
  readonly cl: Climate;
  private c1: Simplex; private c2: Simplex; private t1: Simplex; private t2: Simplex;
  private nEnt: Simplex; private nRav: Simplex; private nRavG: Simplex; private nDeep: Simplex; private nMag: Simplex; private nPatch: Simplex;
  private ph = new Int16Array(W * W); private pb = new Uint8Array(W * W); private pOpen = new Uint8Array(W * W);
  private pTemp = new Float32Array(W * W); private pRav = new Float32Array(W * W);
  private f1 = new Float32Array(25 * LY); private f2 = new Float32Array(25 * LY); private f3 = new Float32Array(25 * LY);
  private col = newCol();

  constructor(readonly seed: number) {
    this.cl = new Climate(seed);
    this.c1 = new Simplex(seed + 101); this.c2 = new Simplex(seed + 103); this.t1 = new Simplex(seed + 107); this.t2 = new Simplex(seed + 109);
    this.nEnt = new Simplex(seed + 113); this.nRav = new Simplex(seed + 127); this.nRavG = new Simplex(seed + 131);
    this.nDeep = new Simplex(seed + 137); this.nMag = new Simplex(seed + 139); this.nPatch = new Simplex(seed + 149);
  }

  generate(cx: number, cz: number): GenOut {
    const blocks = new Uint8Array(CVOL), biomes = new Uint8Array(CAREA);
    const ox = cx * CS, oz = cz * CS, seed = this.seed;
    const w = new ChunkWriter(blocks, ox, oz);
    const { ph, pb, pOpen, pTemp, pRav, col, f1, f2, f3 } = this;
    const AIR = 0, STONE = B.stone, DEEP = B.deepstone, DIRT = B.dirt, GRASS = B.grass, SAND = B.sand, WATER = B.water, LAVA = B.lava, BED = B.bedrock;

    // ---- 1. padded column data -------------------------------------------
    let maxH = SEA;
    for (let lz = -PAD; lz < CS + PAD; lz++) for (let lx = -PAD; lx < CS + PAD; lx++) {
      const p = (lz + PAD) * W + lx + PAD, wx = ox + lx, wz = oz + lz;
      this.cl.sample(wx, wz, col);
      const h = Math.floor(col.h);
      ph[p] = h; pb[p] = col.biome; pTemp[p] = col.temp;
      if (h > maxH) maxH = h;
      const gate = this.nRavG.n2(wx / 800, wz / 800) > 0.35;
      const rr = gate && h > SEA + 2 ? Math.abs(this.nRav.n2(wx / 210, wz / 210)) : 1;
      pRav[p] = rr;
      pOpen[p] = rr < 0.036 || (h > SEA + 2 && this.nEnt.n2(wx / 140, wz / 140) > 0.42) ? 1 : 0;
    }
    const deepR = fbm2(this.nDeep, (ox + 8) / 300, (oz + 8) / 300, 2) * 1.5;
    const magR = fbm2(this.nMag, (ox + 8) / 260, (oz + 8) / 260, 2) * 1.5;
    const region = deepR > 0.4 ? 1 : deepR < -0.4 ? 2 : magR > 0.45 ? 3 : 0; // 1 crystal, 2 fungal, 3 magma
    const lavaY = region === 3 ? 17 : 10;

    // ---- 2. solid columns ----------------------------------------------------
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const p = (lz + PAD) * W + lx + PAD, wx = ox + lx, wz = oz + lz;
      const h = ph[p], bio = pb[p], base = ((lz << 4) | lx) << 8;
      biomes[(lz << 4) | lx] = bio;
      const slope = Math.max(Math.abs(h - ph[p - 1]), Math.abs(h - ph[p + 1]), Math.abs(h - ph[p - W]), Math.abs(h - ph[p + W]));
      const r = hash01(wx, 3, wz, seed), patch = this.nPatch.n2(wx / 34, wz / 34);
      let top = GRASS, fill = DIRT, sub = STONE, fd = 3 + ((r * 2) | 0), sd = 0;
      if (h < SEA) {
        if (bio === BIOME.ocean) top = fill = h < SEA - 14 ? B.gravel : patch > 0.55 && h > SEA - 9 ? B.clay : SAND;
        else if (bio === BIOME.swamp) top = fill = B.mud;
        else top = fill = patch > 0.35 ? B.gravel : patch < -0.5 ? B.clay : SAND;
      } else if (bio === BIOME.desert || bio === BIOME.beach) { top = fill = SAND; sub = B.sandstone; sd = bio === BIOME.desert ? 6 : 3; }
      else if (bio === BIOME.tundra) top = B.snowy_grass;
      else if (bio === BIOME.peaks) { top = fill = B.snow; fd = 2; }
      else if (bio === BIOME.crags) { if (slope > 1 || patch > 0.1) { top = fill = STONE; } }
      else if (bio === BIOME.swamp && h <= SEA) top = B.mud;
      else if (bio === BIOME.taiga && h > SEA + 46) top = B.snowy_grass;
      if (slope >= 3 && h > SEA + 12 && bio !== BIOME.desert) { top = fill = bio === BIOME.peaks && slope < 5 ? B.snow : STONE; }
      const deepY = 33 + ((hash01(wx, 4, wz, seed) * 5) | 0);
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0 || (y <= 3 && hash01(wx, y + 10, wz, seed) < (4 - y) / 4)) id = BED;
        else if (y < deepY) id = region === 3 && y < 26 && hash01(wx, y, wz, seed + 5) < 0.6 ? B.scoria : DEEP;
        else if (y === h) id = top;
        else if (y >= h - fd) id = fill;
        else if (y >= h - fd - sd) id = sub;
        else id = STONE;
        blocks[base + y] = id;
      }
      if (h < SEA) {
        for (let y = h + 1; y <= SEA; y++) blocks[base + y] = WATER;
        if (pTemp[p] < -0.52 + (r - 0.5) * 0.06) blocks[base + SEA] = B.ice;
      }
    }

    // ---- 3. ores, then caves carve through them -------------------------------
    placeOres(blocks, cx, cz, seed, OVERWORLD_ORES, [STONE, DEEP]);

    const maxLy = Math.min(62, (maxH >> 2) + 1);
    for (let lz = 0; lz < 5; lz++) for (let lx = 0; lx < 5; lx++) {
      const wx = ox + lx * 4, wz = oz + lz * 4, o = (lz * 5 + lx) * LY;
      for (let ly = 0; ly <= maxLy + 1; ly++) {
        const y = ly * 4;
        f1[o + ly] = this.c1.n3(wx / 95, y / 60, wz / 95) * 0.65 + this.c2.n3(wx / 40, y / 28, wz / 40) * 0.35;
        f2[o + ly] = this.t1.n3(wx / 72, y / 48, wz / 72);
        f3[o + ly] = this.t2.n3(wx / 72, y / 48, wz / 72);
      }
    }
    const cavern = region === 1 || region === 2;
    for (let cz4 = 0; cz4 < 4; cz4++) for (let cx4 = 0; cx4 < 4; cx4++) {
      const o00 = (cz4 * 5 + cx4) * LY, o10 = o00 + LY, o01 = o00 + 5 * LY, o11 = o01 + LY;
      for (let ly = 0; ly <= maxLy; ly++) {
        for (let dy = 0; dy < 4; dy++) {
          const y = ly * 4 + dy;
          if (y < 4) continue;
          const ty = dy / 4, i0 = ly, i1 = ly + 1;
          const a00 = f1[o00 + i0] + (f1[o00 + i1] - f1[o00 + i0]) * ty, a10 = f1[o10 + i0] + (f1[o10 + i1] - f1[o10 + i0]) * ty;
          const a01 = f1[o01 + i0] + (f1[o01 + i1] - f1[o01 + i0]) * ty, a11 = f1[o11 + i0] + (f1[o11 + i1] - f1[o11 + i0]) * ty;
          const b00 = f2[o00 + i0] + (f2[o00 + i1] - f2[o00 + i0]) * ty, b10 = f2[o10 + i0] + (f2[o10 + i1] - f2[o10 + i0]) * ty;
          const b01 = f2[o01 + i0] + (f2[o01 + i1] - f2[o01 + i0]) * ty, b11 = f2[o11 + i0] + (f2[o11 + i1] - f2[o11 + i0]) * ty;
          const c00 = f3[o00 + i0] + (f3[o00 + i1] - f3[o00 + i0]) * ty, c10 = f3[o10 + i0] + (f3[o10 + i1] - f3[o10 + i0]) * ty;
          const c01 = f3[o01 + i0] + (f3[o01 + i1] - f3[o01 + i0]) * ty, c11 = f3[o11 + i0] + (f3[o11 + i1] - f3[o11 + i0]) * ty;
          let thr = 0.5 + (y > 70 ? (y - 70) * 0.004 : 0);
          if (cavern && y < 52) thr -= 0.13 * smoothstep(52, 40, y);
          const tw = 0.0065 + 0.004 * smoothstep(60, 20, y);
          for (let dz = 0; dz < 4; dz++) {
            const tz = dz / 4, z = cz4 * 4 + dz;
            const a0 = a00 + (a01 - a00) * tz, a1 = a10 + (a11 - a10) * tz;
            const b0 = b00 + (b01 - b00) * tz, b1 = b10 + (b11 - b10) * tz;
            const c0 = c00 + (c01 - c00) * tz, c1 = c10 + (c11 - c10) * tz;
            for (let dx = 0; dx < 4; dx++) {
              const tx = dx / 4, x = cx4 * 4 + dx;
              const p = (z + PAD) * W + x + PAD, h = ph[p];
              if (y > h) continue;
              const depth = h - y;
              const wetCol = h < SEA + 1 || ph[p - 1] < SEA || ph[p + 1] < SEA || ph[p - W] < SEA || ph[p + W] < SEA;
              if (wetCol && depth < 9) continue;
              const cheese = a0 + (a1 - a0) * tx, ta = b0 + (b1 - b0) * tx, tb = c0 + (c1 - c0) * tx;
              const hit = (depth > 9 && cheese > thr) || (ta * ta + tb * tb < tw && (depth > 5 || pOpen[p] === 1));
              if (!hit) continue;
              const i = (((z << 4) | x) << 8) | y;
              if (blocks[i] === BED) continue;
              blocks[i] = y <= lavaY ? LAVA : AIR;
            }
          }
        }
      }
    }
    // ravines
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const p = (lz + PAD) * W + lx + PAD, rr = pRav[p], h = ph[p];
      if (rr >= 0.034 || h <= SEA + 2) continue;
      if (ph[p - 1] < SEA || ph[p + 1] < SEA || ph[p - W] < SEA || ph[p + W] < SEA) continue;
      const bottom = 26 + ((hash01(ox + lx, 6, oz + lz, seed) * 3) | 0), base = ((lz << 4) | lx) << 8;
      for (let y = bottom; y <= h; y++) {
        if (rr < 0.006 + 0.028 * ((y - bottom) / (h - bottom))) blocks[base + y] = AIR;
      }
    }

    // ---- 4. deep cave dressing -------------------------------------------------
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const p = (lz + PAD) * W + lx + PAD, base = ((lz << 4) | lx) << 8, wx = ox + lx, wz = oz + lz;
      const top = Math.min(ph[p] - 8, 110);
      for (let y = 5; y < top; y++) {
        if (blocks[base + y] !== AIR) continue;
        const below = blocks[base + y - 1], above = blocks[base + y + 1];
        const r = hash01(wx, y, wz, seed + 9);
        const floor = below === STONE || below === DEEP || below === B.scoria;
        if (floor) {
          if (region === 1 && y < 54) {
            if (r < 0.1) {
              const c = this.nPatch.n2(wx / 20, wz / 20) > 0 ? B.crystal_cyan : B.crystal_violet, n = 1 + ((r * 40) | 0);
              for (let k = 0; k < n && blocks[base + y + k] === AIR; k++) blocks[base + y + k] = c;
            }
          } else if (region === 2 && y < 54) {
            blocks[base + y - 1] = B.mycel;
            if (r < 0.1) blocks[base + y] = B.glowshroom; else if (r < 0.16) blocks[base + y] = B.mushroom_brown;
          } else if (r < 0.004 && y < 70) blocks[base + y] = B.glowshroom;
          else if (r < 0.012) blocks[base + y] = r < 0.008 ? B.mushroom_brown : B.mushroom_red;
        } else if (region === 1 && y < 54 && (above === STONE || above === DEEP) && r < 0.05) {
          blocks[base + y] = r < 0.025 ? B.crystal_cyan : B.crystal_amber;
        }
      }
    }

    // ---- 5. trees (decided purely from column data so every chunk agrees) ---------
    for (let lz = -5; lz < CS + 5; lz++) for (let lx = -5; lx < CS + 5; lx++) {
      const p = (lz + PAD) * W + lx + PAD, bio = pb[p], spec = TREES[bio];
      const wx = ox + lx, wz = oz + lz, h = ph[p];
      if (!spec || h <= SEA || pOpen[p]) continue;
      const r = hash01(wx, 20, wz, seed);
      if (r >= spec[0]) continue;
      if (bio === BIOME.crags && h > SEA + 90) continue;
      let lone = true;
      for (let dz = -1; dz <= 1 && lone; dz++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dz) && hash01(wx + dx, 20, wz + dz, seed) < r) { lone = false; break; }
      }
      if (!lone) continue;
      const slope = Math.max(Math.abs(h - ph[p - 1]), Math.abs(h - ph[p + 1]), Math.abs(h - ph[p - W]), Math.abs(h - ph[p + W]));
      if (slope >= 3) continue;
      stampTree(w, hash01(wx, 21, wz, seed) < spec[3] ? spec[2] : spec[1], wx, h, wz, seed);
    }

    // ---- 6. ground cover ------------------------------------------------------------
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const p = (lz + PAD) * W + lx + PAD, base = ((lz << 4) | lx) << 8, wx = ox + lx, wz = oz + lz;
      const h = ph[p], bio = pb[p];
      if (h < SEA || blocks[base + h + 1] !== AIR) continue;
      const g = blocks[base + h], r = hash01(wx, 30, wz, seed), fp = this.nPatch.n2(wx / 26 + 40, wz / 26);
      let put = 0;
      if (g === GRASS) {
        const flower = fp > 0.45 ? (hash01(wx, 31, wz, seed) < 0.5 ? B.flower_red : B.flower_yellow) : fp < -0.45 ? (hash01(wx, 31, wz, seed) < 0.5 ? B.flower_blue : B.flower_white) : 0;
        switch (bio) {
          case BIOME.plains: put = r < 0.26 ? B.tall_grass : r < 0.3 && flower ? flower : 0; break;
          case BIOME.forest: put = r < 0.1 ? B.tall_grass : r < 0.15 ? B.fern : r < 0.156 ? B.berry_bush : r < 0.164 ? B.mushroom_brown : r < 0.19 && flower ? flower : 0; break;
          case BIOME.palewood: put = r < 0.16 ? B.tall_grass : r < 0.2 && flower ? flower : r < 0.206 ? B.berry_bush : 0; break;
          case BIOME.bloomvale: put = r < 0.2 ? B.tall_grass : r < 0.34 ? (hash01(wx, 31, wz, seed) < 0.4 ? B.flower_white : hash01(wx, 32, wz, seed) < 0.5 ? B.flower_blue : B.flower_red) : 0; break;
          case BIOME.taiga: put = r < 0.1 ? B.fern : r < 0.112 ? B.berry_bush : r < 0.13 ? B.tall_grass : 0; break;
          case BIOME.savanna: put = r < 0.3 ? B.tall_grass : r < 0.305 ? B.dead_bush : 0; break;
          case BIOME.jungle: put = r < 0.22 ? B.fern : r < 0.4 ? B.tall_grass : r < 0.43 && flower ? flower : 0; break;
          case BIOME.swamp: put = r < 0.14 ? B.tall_grass : r < 0.17 ? B.mushroom_brown : r < 0.18 ? B.mushroom_red : 0; break;
          case BIOME.crags: put = r < 0.08 ? B.tall_grass : 0; break;
        }
        if (!put && h <= SEA + 1 && r > 0.6 && (ph[p - 1] < SEA || ph[p + 1] < SEA || ph[p - W] < SEA || ph[p + W] < SEA)) put = B.reeds;
      } else if (g === SAND && bio === BIOME.desert) {
        if (r < 0.007) { const n = 1 + ((hash01(wx, 33, wz, seed) * 3) | 0); for (let k = 1; k <= n; k++) blocks[base + h + k] = B.cactus; }
        else if (r < 0.018) put = B.dead_bush;
      } else if (g === B.snowy_grass && r < 0.01) put = B.dead_bush;
      if (put) blocks[base + h + 1] = put;
    }

    stampStructures(w, 0, cx, cz, seed, this.cl);

    let hasEmit = false;
    for (let i = 0; i < CVOL; i++) if (T_EMITS[blocks[i]]) { hasEmit = true; break; }
    return { blocks, biomes, hasEmit, ents: w.ents };
  }
}
