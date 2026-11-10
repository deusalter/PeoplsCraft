// Builds 3D models for held and dropped items: block items become textured cubes, everything
// else becomes its 16x16 icon extruded one pixel thick. Geometry is cached per item.
import * as THREE from 'three';
import { BLOCKS, TEXTURE_NAMES } from '../data/blocks';
import { item } from '../data/items';
import type { Atlas } from './atlas';
import { slabHeight, type Icons } from './icons';

const TINT = [0xffffff, 0x86c653, 0x6fb445, 0x3a84dc];

class Builder {
  pos: number[] = []; nor: number[] = []; col: number[] = []; idx: number[] = [];
  quad(a: number[], b: number[], c: number[], d: number[], n: number[], r: number, g: number, bl: number): void {
    const i = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) { this.nor.push(n[0], n[1], n[2]); this.col.push(r, g, bl); }
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.col), 3, true));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
type Face = [o: number[], u: number[], v: number[], n: number[]];
const add3 = (a: number[], b: number[], s: number, c: number[], t: number): number[] => [a[0] + b[0] * s + c[0] * t, a[1] + b[1] * s + c[1] * t, a[2] + b[2] * s + c[2] * t];

/** Paint a tile onto a face, merging horizontal runs of equal colour. `px(x,y)` returns RGBA or -1. */
function paintFace(b: Builder, f: Face, px: (x: number, y: number) => number, shade: number): void {
  for (let y = 0; y < 16; y++) {
    let x = 0;
    while (x < 16) {
      const c = px(x, y);
      if (c < 0) { x++; continue; }
      let x1 = x + 1;
      while (x1 < 16 && px(x1, y) === c) x1++;
      const p0 = add3(f[0], f[1], x / 16, f[2], y / 16), p1 = add3(f[0], f[1], x1 / 16, f[2], y / 16), p2 = add3(f[0], f[1], x1 / 16, f[2], (y + 1) / 16), p3 = add3(f[0], f[1], x / 16, f[2], (y + 1) / 16);
      b.quad(p0, p3, p2, p1, f[3], (c >> 16) * shade, ((c >> 8) & 255) * shade, (c & 255) * shade);
      x = x1;
    }
  }
}

const CUBE: Face[] = [
  [[0.5, 0.5, 0.5], [0, 0, -1], [0, -1, 0], [1, 0, 0]], [[-0.5, 0.5, -0.5], [0, 0, 1], [0, -1, 0], [-1, 0, 0]],
  [[-0.5, 0.5, -0.5], [1, 0, 0], [0, 0, 1], [0, 1, 0]], [[-0.5, -0.5, 0.5], [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  [[-0.5, 0.5, 0.5], [1, 0, 0], [0, -1, 0], [0, 0, 1]], [[0.5, 0.5, -0.5], [-1, 0, 0], [0, -1, 0], [0, 0, -1]],
];

export class ItemModels {
  private cache = new Map<string, THREE.BufferGeometry>();
  constructor(private atlas: Atlas, private icons: Icons) {}

  /** True if the item renders as a full cube (affects how it is held and scaled). */
  isCube(key: string): boolean { const d = item(key); return d.block !== undefined && slabHeight(d.block) > 0; }

  get(key: string): THREE.BufferGeometry {
    let g = this.cache.get(key);
    if (g) return g;
    const d = item(key), b = new Builder();
    if (d.block !== undefined) {
      const blk = BLOCKS[d.block], tint = TINT[blk.tint], opaque = blk.mat === 'opaque';
      const sample = (face: number) => {
        const t = this.atlas.tiles[Math.max(0, TEXTURE_NAMES.indexOf(blk.faces[face]))];
        return (x: number, y: number): number => {
          const s = ((y << 4) | x) << 2, a = t[s + 3];
          if (!opaque && a < 110) return -1;
          let r = t[s], gg = t[s + 1], bl = t[s + 2];
          if (blk.tint && (!opaque || a < 128)) { r = (r * (tint >> 16)) / 255; gg = (gg * ((tint >> 8) & 255)) / 255; bl = (bl * (tint & 255)) / 255; }
          return ((r & 255) << 16) | ((gg & 255) << 8) | (bl & 255);
        };
      };
      const h = slabHeight(d.block);
      if (h === 1) { for (let f = 0; f < 6; f++) paintFace(b, CUBE[f], sample(f), 1); }
      else if (h > 0) {
        // a slab (bedroll, bed): top face lowered to the slab height, sides keep only their bottom rows; centred on y
        const cut = 16 - 16 * h, lift = (1 - h) / 2;
        for (let f = 0; f < 6; f++) {
          const [o, u, v, n] = CUBE[f], px = sample(f);
          if (f === 2) paintFace(b, [[o[0], o[1] - (1 - h) + lift, o[2]], u, v, n], px, 1);
          else if (f === 3) paintFace(b, [[o[0], o[1] + lift, o[2]], u, v, n], px, 1);
          else paintFace(b, [[o[0], o[1] + lift, o[2]], u, v, n], (x, y) => (y < cut ? -1 : px(x, y)), 1);
        }
      } else this.sprite(b, sample(0));
    } else {
      const p = this.icons.pixels.get(key)!;
      this.sprite(b, (x, y) => { const s = ((y << 4) | x) << 2; return p[s + 3] < 110 ? -1 : (p[s] << 16) | (p[s + 1] << 8) | p[s + 2]; });
    }
    g = b.build();
    this.cache.set(key, g);
    return g;
  }

  private sprite(b: Builder, px: (x: number, y: number) => number): void {
    const t = 1 / 32;
    paintFace(b, [[-0.5, 0.5, t], [1, 0, 0], [0, -1, 0], [0, 0, 1]], px, 1);
    paintFace(b, [[-0.5, 0.5, -t], [1, 0, 0], [0, -1, 0], [0, 0, -1]], px, 0.8);
    const at = (x: number, y: number): number => (x < 0 || x > 15 || y < 0 || y > 15 ? -1 : px(x, y));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const c = px(x, y);
      if (c < 0) continue;
      const x0 = -0.5 + x / 16, x1 = x0 + 1 / 16, y0 = 0.5 - y / 16, y1 = y0 - 1 / 16;
      const r = (c >> 16) * 0.7, g = ((c >> 8) & 255) * 0.7, bl = (c & 255) * 0.7;
      if (at(x - 1, y) < 0) b.quad([x0, y0, -t], [x0, y1, -t], [x0, y1, t], [x0, y0, t], [-1, 0, 0], r, g, bl);
      if (at(x + 1, y) < 0) b.quad([x1, y0, t], [x1, y1, t], [x1, y1, -t], [x1, y0, -t], [1, 0, 0], r, g, bl);
      if (at(x, y - 1) < 0) b.quad([x0, y0, -t], [x0, y0, t], [x1, y0, t], [x1, y0, -t], [0, 1, 0], r, g, bl);
      if (at(x, y + 1) < 0) b.quad([x0, y1, t], [x0, y1, -t], [x1, y1, -t], [x1, y1, t], [0, -1, 0], r, g, bl);
    }
  }
}
