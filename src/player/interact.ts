// Block targeting, mining progress with crack overlay, and placement cadence.
import * as THREE from 'three';
import { T_BOX, texLayer } from '../data/blocks';
import { U } from '../render/gfx';
import type { World } from '../world/world';
import type { Input } from './input';
import { RayHit, newRayHit, raycast } from './physics';
import type { Player } from './player';

export interface InteractHost {
  reach(): number;
  /** Seconds to break the block with the held item; Infinity if it cannot be broken. */
  breakTime(id: number): number;
  onBroken(x: number, y: number, z: number, id: number): void;
  onDigTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void;
  /** Left click. Return true if something other than mining consumed it (an attack). */
  primary(pressed: boolean, held: boolean): boolean;
  /** Right click. `hit` is the targeted block if any. Return true if consumed. */
  secondary(hit: RayHit | null, pressed: boolean): boolean;
}

const CRACK_VERT = /* glsl */ `out vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CRACK_FRAG = /* glsl */ `precision highp float; precision highp sampler2DArray; uniform sampler2DArray uAtlas; uniform float uLayer; in vec2 vUv;
void main() { vec4 t = texture(uAtlas, vec3(vUv, uLayer)); if (t.a < 0.05) discard; gl_FragColor = vec4(t.rgb * 0.05, t.a * 0.85); }`;

export class Interact {
  readonly hit: RayHit = newRayHit();
  progress = 0;
  private tx = 0; private ty = -1; private tz = 0;
  private breakCd = 0; private useCd = 0; private digT = 0;
  private outline: THREE.LineSegments;
  private crack: THREE.Mesh; private crackMat: THREE.ShaderMaterial;
  private dir = new THREE.Vector3();
  private crack0 = texLayer('crack0');

  constructor(scene: THREE.Scene, private world: World, private player: Player) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    this.outline.visible = false; this.outline.renderOrder = 4; this.outline.frustumCulled = false;
    scene.add(this.outline);
    this.crackMat = new THREE.ShaderMaterial({
      vertexShader: CRACK_VERT, fragmentShader: CRACK_FRAG, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uAtlas: U.uAtlas, uLayer: { value: 0 } },
    });
    this.crack = new THREE.Mesh(box, this.crackMat);
    this.crack.visible = false; this.crack.renderOrder = 3; this.crack.frustumCulled = false;
    scene.add(this.crack);
  }

  /** Fixed-step update. */
  tick(dt: number, input: Input, host: InteractHost, active: boolean): void {
    const p = this.player, h = this.hit, d = p.dir(this.dir);
    if (!active) { h.hit = false; this.progress = 0; this.outline.visible = false; this.crack.visible = false; return; }
    raycast(this.world, p.x, p.y + p.eye, p.z, d.x, d.y, d.z, host.reach(), h);
    if (this.breakCd > 0) this.breakCd -= dt;
    if (this.useCd > 0) this.useCd -= dt;

    const consumed = host.primary(input.clicks[0], input.buttons[0]);
    if (h.hit && input.buttons[0] && !consumed) {
      if (h.x !== this.tx || h.y !== this.ty || h.z !== this.tz) { this.tx = h.x; this.ty = h.y; this.tz = h.z; this.progress = 0; }
      const bt = host.breakTime(h.id);
      if (this.breakCd <= 0 && bt !== Infinity) {
        this.progress += bt <= 0 ? 1 : dt / bt;
        this.digT -= dt;
        if (this.digT <= 0) { this.digT = 0.22; host.onDigTick(h.x, h.y, h.z, h.id, h.nx, h.ny, h.nz); }
        if (this.progress >= 1) {
          host.onBroken(h.x, h.y, h.z, h.id);
          this.progress = 0; this.breakCd = bt <= 0.06 ? 0.12 : 0.1; this.ty = -1;
        }
      }
    } else { this.progress = 0; this.digT = 0; }

    if (input.clicks[2] || (input.buttons[2] && this.useCd <= 0)) {
      if (host.secondary(h.hit ? h : null, input.clicks[2])) this.useCd = 0.22;
      else if (input.clicks[2]) this.useCd = 0.22;
    }

    // visuals
    if (h.hit) {
      const o = h.id * 6, x0 = T_BOX[o] / 16, y0 = T_BOX[o + 1] / 16, z0 = T_BOX[o + 2] / 16, x1 = T_BOX[o + 3] / 16, y1 = T_BOX[o + 4] / 16, z1 = T_BOX[o + 5] / 16;
      const sx = x1 - x0 + 0.004, sy = y1 - y0 + 0.004, sz = z1 - z0 + 0.004;
      this.outline.position.set(h.x + (x0 + x1) / 2, h.y + (y0 + y1) / 2, h.z + (z0 + z1) / 2);
      this.outline.scale.set(sx, sy, sz); this.outline.visible = true;
      if (this.progress > 0) {
        this.crack.position.copy(this.outline.position); this.crack.scale.set(sx, sy, sz);
        this.crackMat.uniforms.uLayer.value = this.crack0 + Math.min(7, Math.floor(this.progress * 8));
        this.crack.visible = true;
      } else this.crack.visible = false;
    } else { this.outline.visible = false; this.crack.visible = false; }
  }
}
