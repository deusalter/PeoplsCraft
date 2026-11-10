// Pure functions of (x, z): continent shape, height, temperature, humidity, biome.
// Shared by the generator workers and the main thread (spawn search, structure locating).
import { SEA } from '../../core/constants';
import { Simplex, fbm2, hash01, lerp, smoothstep, spline } from '../../core/noise';
import { BIOME } from '../../data/biomes';

export interface Col { h: number; biome: number; temp: number; hum: number; mount: number; cont: number; wet: number }
export const newCol = (): Col => ({ h: 0, biome: 0, temp: 0, hum: 0, mount: 0, cont: 0, wet: 0 });

const BASE = [-1, SEA - 48, -0.55, SEA - 36, -0.22, SEA - 14, -0.1, SEA - 4, -0.03, SEA + 1.5, 0.15, SEA + 6, 0.5, SEA + 16, 1, SEA + 30];

export class Climate {
  private nCont: Simplex; private nEro: Simplex; private nPv: Simplex; private nDet: Simplex;
  private nTemp: Simplex; private nHum: Simplex; private nRiv: Simplex; private nWeird: Simplex;
  constructor(readonly seed: number) {
    this.nCont = new Simplex(seed + 11); this.nEro = new Simplex(seed + 23); this.nPv = new Simplex(seed + 37);
    this.nDet = new Simplex(seed + 41); this.nTemp = new Simplex(seed + 53); this.nHum = new Simplex(seed + 67);
    this.nRiv = new Simplex(seed + 71); this.nWeird = new Simplex(seed + 83);
  }

  sample(x: number, z: number, o: Col): void {
    const cont = fbm2(this.nCont, x / 1150, z / 1150, 4) * 1.6 + 0.18;
    const ero = fbm2(this.nEro, x / 640, z / 640, 3) * 1.6;
    const pvRaw = fbm2(this.nPv, x / 270, z / 270, 4) * 1.5;
    const det = fbm2(this.nDet, x / 72, z / 72, 3);
    let temp = fbm2(this.nTemp, x / 1500, z / 1500, 3) * 1.5;
    const hum = fbm2(this.nHum, x / 1050, z / 1050, 3) * 1.5;
    const riv = Math.abs(fbm2(this.nRiv, x / 500, z / 500, 2));
    const weird = fbm2(this.nWeird, x / 520, z / 520, 2) * 1.5;

    const land = smoothstep(-0.1, 0.02, cont);
    const mount = smoothstep(0.12, 0.55, cont) * smoothstep(0.12, -0.42, ero);
    const hill = land * (0.25 + 0.75 * smoothstep(0.5, -0.3, ero));
    const ridge = Math.max(0, 1 - Math.abs(pvRaw) * 2.2);
    let h = spline(cont, BASE) + det * (1.5 + 8 * hill) + mount * (Math.pow(ridge, 1.5) * 86 + pvRaw * 12 + 10);

    // rivers: a broad valley, then a channel cut just below sea level
    const rv = land * (1 - smoothstep(0.3, 0.8, mount));
    const valley = smoothstep(0.22, 0.05, riv) * rv;
    h = lerp(h, Math.min(h, SEA + 2 + (h - SEA) * 0.35), valley * 0.8);
    h = lerp(h, SEA - 4.5, smoothstep(0.055, 0.012, riv) * rv);

    const wet = smoothstep(0.28, 0.5, hum) * smoothstep(-0.25, 0.05, temp) * land * (1 - mount) * smoothstep(SEA + 14, SEA + 6, h);
    h = lerp(h, SEA + 0.4 + det * 1.6, wet);

    temp -= Math.max(0, h - (SEA + 40)) * 0.011;
    const t = temp + (hash01(x, 1, z, this.seed) - 0.5) * 0.045;
    const m = hum + (hash01(x, 2, z, this.seed) - 0.5) * 0.045;

    let biome: number;
    if (cont < -0.08 && h < SEA - 1) biome = BIOME.ocean;
    else if (mount > 0.4 && h > SEA + 58) biome = h > SEA + 88 - t * 16 ? BIOME.peaks : BIOME.crags;
    else if (h < SEA + 2.4 && cont < 0.0 && wet < 0.3 && t > -0.4) biome = BIOME.beach;
    else if (t < -0.5) biome = BIOME.tundra;
    else if (t < -0.18) biome = BIOME.taiga;
    else if (t > 0.42) biome = m < -0.12 ? BIOME.desert : m < 0.28 ? BIOME.savanna : BIOME.jungle;
    else if (wet > 0.5) biome = BIOME.swamp;
    else if (weird > 0.55) biome = BIOME.bloomvale;
    else if (m < -0.25) biome = BIOME.plains;
    else if (m < 0.12) biome = weird < -0.5 ? BIOME.plains : BIOME.forest;
    else if (m < 0.32) biome = BIOME.palewood;
    else biome = BIOME.forest;

    o.h = h; o.biome = biome; o.temp = temp; o.hum = hum; o.mount = mount; o.cont = cont; o.wet = wet;
  }

  private tmp = newCol();
  heightAt(x: number, z: number): number { this.sample(x, z, this.tmp); return Math.floor(this.tmp.h); }
  biomeAt(x: number, z: number): number { this.sample(x, z, this.tmp); return this.tmp.biome; }
}
