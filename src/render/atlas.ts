// Builds every block texture at startup and uploads them as layers of one array texture.
// An array texture is an atlas without the bleeding: greedy quads can tile with plain REPEAT.
import * as THREE from 'three';
import { TEXTURE_NAMES } from '../data/blocks';
import { TS, paintTile } from './textures';

export class Atlas {
  readonly tiles: Uint8ClampedArray[] = [];
  readonly texture: THREE.DataArrayTexture;
  /** The same tiles, linearly filtered, for the terrain shader: it snaps to texels itself, and three only applies
   *  anisotropic filtering to a texture that is not nearest-filtered. */
  readonly filtered: THREE.DataArrayTexture;
  /** Average opaque colour per layer (0xRRGGBB), used for particles and map colours. */
  readonly avg: number[] = [];

  constructor() {
    const n = TEXTURE_NAMES.length, data = new Uint8Array(n * TS * TS * 4);
    for (let i = 0; i < n; i++) {
      const t = paintTile(TEXTURE_NAMES[i]);
      // give fully transparent texels the tile's mean colour so mipmaps do not fringe dark
      let r = 0, g = 0, b = 0, c = 0;
      for (let p = 0; p < t.length; p += 4) if (t[p + 3] > 0 || t[p] + t[p + 1] + t[p + 2] > 0) { r += t[p]; g += t[p + 1]; b += t[p + 2]; c++; }
      if (c) { r = (r / c) | 0; g = (g / c) | 0; b = (b / c) | 0; }
      for (let p = 0; p < t.length; p += 4) if (t[p + 3] === 0 && t[p] + t[p + 1] + t[p + 2] === 0) { t[p] = r; t[p + 1] = g; t[p + 2] = b; }
      this.tiles.push(t); this.avg.push((r << 16) | (g << 8) | b);
      data.set(t, i * TS * TS * 4);
    }
    const make = (mag: THREE.MagnificationTextureFilter, min: THREE.MinificationTextureFilter): THREE.DataArrayTexture => {
      const tex = new THREE.DataArrayTexture(data, TS, TS, n);
      tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
      tex.magFilter = mag; tex.minFilter = min;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true; tex.colorSpace = THREE.NoColorSpace;
      tex.needsUpdate = true;
      return tex;
    };
    this.texture = make(THREE.NearestFilter, THREE.NearestMipmapLinearFilter);
    this.filtered = make(THREE.LinearFilter, THREE.LinearMipmapLinearFilter);
  }
}
