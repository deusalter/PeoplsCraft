// Block targeting, mining progress with crack overlay, and placement cadence.
import * as THREE from 'three';
import { T_BOX, texLayer } from '../data/blocks';
import { U } from '../render/gfx';
import type { World } from '../world/world';
import type { Input } from './input';
import type { ActHost, DigHost } from '../client/api';
import { RayHit, newRayHit, raycast } from '../sim/physics';
import type { Player } from './player';

const CRACK_VERT = /* glsl */ `out vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CRACK_FRAG = /* glsl */ `precision highp float; precision highp sampler2DArray; uniform sampler2DArray uAtlas; uniform float uLayer; in vec2 vUv;
void main() { vec4 t = texture(uAtlas, vec3(vUv, uLayer)); if (t.a < 0.05) discard; gl_FragColor = vec4(t.rgb * 0.05, t.a * 0.85); }`;

export class Interact {
  readonly hit: RayHit = newRayHit();
  progress = 0;
  private tx = 0; private ty = -1; private tz = 0;
  private breakCd = 0; private useCd = 0; private digT = 0;
  /** The current press hit a mob, and seconds since the last attack: no auto tool switch mid-fight. */
  private fought = false; private fightT = 0;
  /** The block progress was last reported building on, and whether it still is. */
  private digOn = false; private dx = 0; private dy = 0; private dz = 0;
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

  /** Per-frame targeting from the rendered eye, so the outline always sits under the crosshair. */
  aim(reach: number, active: boolean): void {
    const p = this.player, h = this.hit;
    if (!active) { h.hit = false; this.outline.visible = false; this.crack.visible = false; return; }
    const d = p.dir(this.dir);
    raycast(this.world, p.ex, p.ey, p.ez, d.x, d.y, d.z, reach, h);
    if (h.hit) {
      const o = h.id * 6, x0 = T_BOX[o] / 16, y0 = T_BOX[o + 1] / 16, z0 = T_BOX[o + 2] / 16, x1 = T_BOX[o + 3] / 16, y1 = T_BOX[o + 4] / 16, z1 = T_BOX[o + 5] / 16;
      const sx = x1 - x0 + 0.004, sy = y1 - y0 + 0.004, sz = z1 - z0 + 0.004;
      this.outline.position.set(h.x + (x0 + x1) / 2, h.y + (y0 + y1) / 2, h.z + (z0 + z1) / 2);
      this.outline.scale.set(sx, sy, sz); this.outline.visible = true;
      if (this.progress > 0 && h.x === this.tx && h.y === this.ty && h.z === this.tz) {
        this.crack.position.copy(this.outline.position); this.crack.scale.set(sx, sy, sz);
        this.crackMat.uniforms.uLayer.value = this.crack0 + Math.min(7, Math.floor(this.progress * 8));
        this.crack.visible = true;
      } else this.crack.visible = false;
    } else { this.outline.visible = false; this.crack.visible = false; }
  }

  /** Tell the host when progress starts to build on a block, moves to another, or stops. */
  private digging(dig: DigHost, on: boolean, x: number, y: number, z: number): void {
    if (on ? this.digOn && x === this.dx && y === this.dy && z === this.dz : !this.digOn) return;
    if (on) { this.dx = x; this.dy = y; this.dz = z; }
    this.digOn = on;
    dig.onDig(on, this.dx, this.dy, this.dz);
  }

  /** Fixed-step update. Targets from the same eye position the last frame was drawn from.
   *  `dig` is asked about mining, `act` about what a click does before it is a dig or a placement. */
  tick(dt: number, input: Input, dig: DigHost, act: ActHost, active: boolean): void {
    const p = this.player, h = this.hit, d = p.dir(this.dir);
    if (!active) { h.hit = false; this.progress = 0; this.fought = false; this.digging(dig, false, 0, 0, 0); return; }
    raycast(this.world, p.ex, p.ey, p.ez, d.x, d.y, d.z, dig.reach(), h);
    if (this.breakCd > 0) this.breakCd -= dt;
    if (this.useCd > 0) this.useCd -= dt;

    // a click released before this tick still counts as held for one tick, so quick taps are never lost
    const held = input.buttons[0] || input.clicks[0];
    const consumed = act.primary(input.clicks[0], held);
    if (this.fightT > 0) this.fightT -= dt;
    if (consumed) { this.fought = true; this.fightT = 1; } else if (!held) this.fought = false;
    // never swap out the tool the player is fighting with when the mob leaves the crosshair
    const auto = !this.fought && this.fightT <= 0;
    let mining = false;
    if (h.hit && held && !consumed) {
      if (h.x !== this.tx || h.y !== this.ty || h.z !== this.tz) { this.tx = h.x; this.ty = h.y; this.tz = h.z; this.progress = 0; if (auto) dig.onDigStart(h.id); }
      else if (this.progress === 0 && auto) dig.onDigStart(h.id);   // a fresh press on the block mined last
      const bt = dig.breakTime(h.id);
      mining = this.breakCd <= 0 && bt !== Infinity;
      if (mining) {
        this.digging(dig, true, h.x, h.y, h.z);
        this.progress += bt <= 0 ? 1 : dt / bt;
        this.digT -= dt;
        if (this.digT <= 0) { this.digT = 0.22; dig.onDigTick(h.x, h.y, h.z, h.id, h.nx, h.ny, h.nz); }
        if (this.progress >= 1) {
          dig.onBroken(h.x, h.y, h.z, h.id);
          this.progress = 0; this.breakCd = bt <= 0.06 ? 0.12 : 0.1; this.ty = -1;
        }
      }
    } else { this.progress = 0; this.digT = 0; }
    if (!mining) this.digging(dig, false, 0, 0, 0);

    if (input.clicks[2] || (input.buttons[2] && this.useCd <= 0)) {
      if (act.secondary(h.hit ? h : null, input.clicks[2])) this.useCd = 0.22;
      else if (input.clicks[2]) this.useCd = 0.22;
    }
  }
}
