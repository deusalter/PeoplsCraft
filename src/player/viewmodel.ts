// First-person bare arm: a sleeve, a cuff and a two-tone fist, built from boxes with vertex colours
// so it goes through the same material and lighting as held items.
import * as THREE from 'three';

type Part = [x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, rgb: number];
// -z is the far end of the arm (the fist), +z runs back towards the shoulder; -x is the thumb side of a right hand.
const PARTS: Part[] = [
  [-0.12, -0.12, -0.02, 0.12, 0.12, 0.4, 0x4a6a82],          // sleeve
  [-0.126, -0.126, -0.05, 0.126, 0.126, 0.02, 0x385468],     // sleeve hem, tucked into the bracer
  [-0.03, 0.118, 0.02, 0.03, 0.127, 0.4, 0x5f849c],          // seam along the top of the sleeve
  [-0.136, -0.136, -0.15, 0.136, 0.136, -0.05, 0x9a6b3c],    // leather bracer
  [-0.142, -0.142, -0.125, 0.142, 0.142, -0.095, 0x5c3e22],  // bracer strap
  [-0.11, -0.11, -0.28, 0.11, 0.11, -0.15, 0xdba27a],        // back of the hand and palm
  [-0.11, -0.11, -0.38, 0.11, 0.09, -0.28, 0xc48e68],        // curled fingers
  [-0.112, 0.07, -0.3, 0.112, 0.118, -0.265, 0xe6b48c],      // knuckle ridge
  [-0.158, -0.08, -0.34, -0.11, 0.035, -0.18, 0xcf9a72],     // thumb
];
const SHADE = [0.9, 0.9, 1, 0.74, 0.84, 0.84];               // per box face: +x -x +y -y +z -z

export function buildArm(): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  for (const [x0, y0, z0, x1, y1, z1, c] of PARTS) {
    const b = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), p = b.getAttribute('position'), n = b.getAttribute('normal'), ix = b.getIndex()!, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      const sh = SHADE[i >> 2];   // BoxGeometry emits four vertices per face, in the order above
      pos.push(p.getX(i) + (x0 + x1) / 2, p.getY(i) + (y0 + y1) / 2, p.getZ(i) + (z0 + z1) / 2);
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push((c >> 16) * sh, ((c >> 8) & 255) * sh, (c & 255) * sh);
    }
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    b.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(col), 3, true));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
