// Projectiles as drawn: one stretched box each, pointing along its flight.
import * as THREE from 'three';
import type { ProjDef } from '../data/mobs';
import type { World } from '../world/world';
import type { BoxBatch } from './batches';

export class ProjView {
  active = false; id = 0; def!: ProjDef; x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0;
  px = 0; py = 0; pz = 0;   // previous tick position, for interpolation
}
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);

export function renderProjs(batch: BoxBatch, list: readonly ProjView[], w: World, alpha: number): void {
  for (const p of list) {
    if (!p.active) continue;
    const d = p.def, s = d.size;
    // lit from where it was a tick ago: that cell is always open air, the one ahead may be solid
    const l = w.getLight(Math.floor(p.px), Math.floor(p.py), Math.floor(p.pz));
    v1.set(p.px + (p.x - p.px) * alpha, p.py + (p.y - p.py) * alpha, p.pz + (p.z - p.pz) * alpha);
    v2.set(p.vx, p.vy, p.vz).normalize();
    q.setFromUnitVectors(up, v2);
    const long = d.gravity > 5 ? 5 : 1.6, thin = s * (long > 2 ? 0.4 : 1);
    m4.compose(v1, q, v2.set(thin, thin, s * long));
    batch.add(m4, d.color, (l >> 4) / 15, (l & 15) / 15, 0, d.glow, 0, thin, thin, s * long);
  }
}
