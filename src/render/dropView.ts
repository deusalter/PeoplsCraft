// Dropped items as drawn: one small mesh each, bobbing and spinning, lit from the cell it lies in.
import * as THREE from 'three';
import { makeItemMaterial } from './batches';
import type { ItemModels } from './itemModel';

export class DropView {
  active = false; id = 0; x = 0; y = 0; z = 0; age = 0;
  px = 0; py = 0; pz = 0;   // previous tick position, for interpolation
  mesh: THREE.Mesh | null = null; light = new THREE.Vector4(1, 0, 0, 0);
}

export class DropRender {
  readonly group = new THREE.Group();
  private mat = makeItemMaterial(false);
  constructor(private models: ItemModels) { this.mat.side = THREE.DoubleSide; }

  show(v: DropView, key: string): void {
    const cube = this.models.isCube(key), mesh = new THREE.Mesh(this.models.get(key), this.mat), light = v.light;
    mesh.scale.setScalar(cube ? 0.26 : 0.42);
    mesh.onBeforeRender = (_r, _s, _c, _g, material) => { (material as THREE.ShaderMaterial).uniforms.uObj.value.copy(light); (material as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
    v.mesh = mesh; this.group.add(mesh);
  }
  hide(v: DropView): void { v.active = false; if (v.mesh) { this.group.remove(v.mesh); v.mesh = null; } }

  /** Place the meshes for this frame: position interpolated between ticks, bob and spin advanced with it. */
  render(list: readonly DropView[], alpha: number): void {
    for (const d of list) {
      if (!d.active) continue;
      const m = d.mesh!, age = d.age + (alpha - 1) / 60;
      m.position.set(d.px + (d.x - d.px) * alpha, d.py + (d.y - d.py) * alpha + 0.22 + Math.sin(age * 2.6) * 0.07, d.pz + (d.z - d.pz) * alpha);
      m.rotation.y = age * 1.6;
    }
  }
}
