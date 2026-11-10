// Instanced renderers: one draw call for every creature box, one for every particle.
// Both write straight into preallocated typed arrays, so nothing is allocated per frame.
import * as THREE from 'three';
import { T_SOLID } from '../data/blocks';
import type { World } from '../world/world';
import { U } from './gfx';
import { FOG_COMMON, SKY_COMMON } from './shaders';

const LIGHT_GLSL = /* glsl */ `
uniform vec3 uLightDir; uniform vec3 uLightColor; uniform vec3 uSkyLight; uniform vec3 uAmbient;
${SKY_COMMON}
${FOG_COMMON}
float curve(float x) { return x * x * (0.35 + 0.65 * x); }
vec3 lit(vec3 albedo, vec3 N, float sky, float blk) {
  float shade = 0.78 + 0.22 * N.y - 0.06 * abs(N.x) + 0.06 * abs(N.z);
  vec3 l = uSkyLight * curve(sky) * shade + uLightColor * max(dot(N, uLightDir), 0.0) * smoothstep(0.5, 0.98, sky) + curve(blk) * vec3(1.75, 1.5, 1.2) + uAmbient * shade;
  l += uLightColor * vec3(1.0, 0.92, 0.8) * (curve(sky) * 0.07 * (1.0 - max(N.y, 0.0)));   // ground bounce, as on terrain
  return albedo * l;
}
vec3 fogged(vec3 col, vec3 world) { return applyFog(col, world); }
`;
const worldUniforms = (): Record<string, THREE.IUniform> => ({
  uLightDir: U.uLightDir, uLightColor: U.uLightColor, uSkyLight: U.uSkyLight, uAmbient: U.uAmbient, uZenith: U.uZenith, uHorizon: U.uHorizon,
  uSunDir: U.uSunDir, uGlowColor: U.uGlowColor, uFogDensity: U.uFogDensity, uFogStart: U.uFogStart, uFogEnd: U.uFogEnd, uCave: U.uCave,
  uUnderwater: U.uUnderwater, uWaterFog: U.uWaterFog, uMist: U.uMist,
});

// ---- boxes ------------------------------------------------------------------------------
const BOX_VERT = /* glsl */ `
in vec4 aCol; in vec4 aFx;
out vec3 vCol; out vec3 vN; out vec3 vWorld; out vec3 vTex; out vec4 vFx; out float vEm;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vTex = (position + 0.5) * sc * 10.0 + normal * 0.5;
  vN = normalize(mat3(instanceMatrix) * normal);
  vCol = aCol.rgb; vEm = aCol.a; vFx = aFx; vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const BOX_FRAG = /* glsl */ `
precision highp float;
in vec3 vCol; in vec3 vN; in vec3 vWorld; in vec3 vTex; in vec4 vFx; in float vEm;
${LIGHT_GLSL}
float hash3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
void main() {
  float n = hash3(floor(vTex + 0.001));
  vec3 base = vCol * (0.84 + 0.26 * n);
  vec3 albedo = base * base;
  vec3 col = lit(albedo, normalize(vN), vFx.x, vFx.y) + albedo * vEm * 3.2;
  col = mix(col, vec3(2.2, 0.5, 0.35), vFx.z * 0.75);
  gl_FragColor = vec4(fogged(col, vWorld), 1.0);
}`;

export class BoxBatch {
  readonly mesh: THREE.InstancedMesh;
  private col: Float32Array; private fx: Float32Array; private mat: Float32Array;
  private aCol: THREE.InstancedBufferAttribute; private aFx: THREE.InstancedBufferAttribute;
  count = 0;
  constructor(readonly cap = 4096) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.col = new Float32Array(cap * 4); this.fx = new Float32Array(cap * 4);
    this.aCol = new THREE.InstancedBufferAttribute(this.col, 4); this.aFx = new THREE.InstancedBufferAttribute(this.fx, 4);
    this.aCol.setUsage(THREE.DynamicDrawUsage); this.aFx.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCol', this.aCol); geo.setAttribute('aFx', this.aFx);
    const mat = new THREE.ShaderMaterial({ vertexShader: BOX_VERT, fragmentShader: BOX_FRAG, uniforms: worldUniforms() });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mat = this.mesh.instanceMatrix.array as Float32Array;
  }
  begin(): void { this.count = 0; }
  /** Add a box. `m` is its full world matrix; light values are 0..1. */
  add(m: THREE.Matrix4, color: number, sky: number, blk: number, flash: number, emissive: number): void {
    const i = this.count;
    if (i >= this.cap) return;
    this.mat.set(m.elements, i * 16);
    const o = i * 4;
    this.col[o] = (color >> 16) / 255; this.col[o + 1] = ((color >> 8) & 255) / 255; this.col[o + 2] = (color & 255) / 255; this.col[o + 3] = emissive;
    this.fx[o] = sky; this.fx[o + 1] = blk; this.fx[o + 2] = flash;
    this.count = i + 1;
  }
  end(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true; this.aCol.needsUpdate = true; this.aFx.needsUpdate = true;
    this.mesh.instanceMatrix.clearUpdateRanges(); this.mesh.instanceMatrix.addUpdateRange(0, this.count * 16);
    this.aCol.clearUpdateRanges(); this.aCol.addUpdateRange(0, this.count * 4);
    this.aFx.clearUpdateRanges(); this.aFx.addUpdateRange(0, this.count * 4);
  }
}

// ---- particles ---------------------------------------------------------------------------
const P_VERT = /* glsl */ `
in vec4 iPos; in vec4 iCol; in vec4 iTex; in vec2 iLight;
out vec3 vCol; out float vGlow; out vec3 vUvl; out vec2 vLight; out vec3 vWorld; out float vAlpha;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = iPos.xyz + (right * position.x + up * position.y) * iPos.w;
  vCol = iCol.rgb; vGlow = iCol.a; vLight = iLight; vWorld = wp;
  vUvl = vec3(iTex.y + (uv.x) * iTex.w, iTex.z + (1.0 - uv.y) * iTex.w, iTex.x);
  vAlpha = 1.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const P_FRAG = /* glsl */ `
precision highp float; precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
in vec3 vCol; in float vGlow; in vec3 vUvl; in vec2 vLight; in vec3 vWorld;
${LIGHT_GLSL}
void main() {
  vec3 base = vCol;
  if (vUvl.z >= 0.0) { vec4 t = texture(uAtlas, vUvl); base *= t.rgb; }
  vec3 albedo = base * base;
  vec3 col = lit(albedo, vec3(0.0, 1.0, 0.0), vLight.x, vLight.y) * (1.0 - vGlow) + albedo * vGlow * 3.4;
  gl_FragColor = vec4(fogged(col, vWorld), 1.0);
}`;

export class Particles {
  readonly mesh: THREE.Mesh;
  private n = 0;
  private px: Float32Array; private py: Float32Array; private pz: Float32Array; private vx: Float32Array; private vy: Float32Array; private vz: Float32Array;
  private life: Float32Array; private max: Float32Array; private size: Float32Array; private grav: Float32Array; private drag: Float32Array;
  private col: Float32Array; private tex: Float32Array; private lit: Float32Array; private hit: Uint8Array;
  private iPos: Float32Array; private iCol: Float32Array; private iTex: Float32Array; private iLight: Float32Array;
  private aPos: THREE.InstancedBufferAttribute; private aCol: THREE.InstancedBufferAttribute; private aTex: THREE.InstancedBufferAttribute; private aLight: THREE.InstancedBufferAttribute;
  private geo: THREE.InstancedBufferGeometry;

  constructor(readonly cap = 3000) {
    const f = (k = 1): Float32Array => new Float32Array(cap * k);
    this.px = f(); this.py = f(); this.pz = f(); this.vx = f(); this.vy = f(); this.vz = f(); this.life = f(); this.max = f(); this.size = f(); this.grav = f(); this.drag = f();
    this.col = f(4); this.tex = f(4); this.lit = f(2); this.hit = new Uint8Array(cap);
    this.iPos = f(4); this.iCol = f(4); this.iTex = f(4); this.iLight = f(2);
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.getAttribute('position')); g.setAttribute('uv', quad.getAttribute('uv'));
    const mk = (a: Float32Array, k: number): THREE.InstancedBufferAttribute => { const at = new THREE.InstancedBufferAttribute(a, k); at.setUsage(THREE.DynamicDrawUsage); return at; };
    this.aPos = mk(this.iPos, 4); this.aCol = mk(this.iCol, 4); this.aTex = mk(this.iTex, 4); this.aLight = mk(this.iLight, 2);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iCol', this.aCol); g.setAttribute('iTex', this.aTex); g.setAttribute('iLight', this.aLight);
    g.instanceCount = 0;
    this.geo = g;
    const mat = new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: { ...worldUniforms(), uAtlas: U.uAtlas } });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
  }

  /** Spawn one particle. `layer` < 0 draws a flat colour; otherwise a 4x4 texel patch of that atlas tile. */
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, glow: number, grav: number, layer = -1, collide = false, sky = 1, blk = 0): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.max[i] = life; this.size[i] = size; this.grav[i] = grav; this.drag[i] = glow > 0.5 ? 1.5 : 0.4; this.hit[i] = collide ? 1 : 0;
    const o = i * 4;
    this.col[o] = (color >> 16) / 255; this.col[o + 1] = ((color >> 8) & 255) / 255; this.col[o + 2] = (color & 255) / 255; this.col[o + 3] = glow;
    this.tex[o] = layer; this.tex[o + 1] = Math.floor(Math.random() * 4) / 4; this.tex[o + 2] = Math.floor(Math.random() * 4) / 4; this.tex[o + 3] = 0.25;
    this.lit[i * 2] = sky; this.lit[i * 2 + 1] = blk;
  }

  update(dt: number, w: World): void {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove keeps the live range dense
        n--;
        if (i !== n) {
          this.px[i] = this.px[n]; this.py[i] = this.py[n]; this.pz[i] = this.pz[n]; this.vx[i] = this.vx[n]; this.vy[i] = this.vy[n]; this.vz[i] = this.vz[n];
          this.life[i] = this.life[n]; this.max[i] = this.max[n]; this.size[i] = this.size[n]; this.grav[i] = this.grav[n]; this.drag[i] = this.drag[n]; this.hit[i] = this.hit[n];
          for (let k = 0; k < 4; k++) { this.col[i * 4 + k] = this.col[n * 4 + k]; this.tex[i * 4 + k] = this.tex[n * 4 + k]; }
          this.lit[i * 2] = this.lit[n * 2]; this.lit[i * 2 + 1] = this.lit[n * 2 + 1];
        }
        i--; continue;
      }
      this.vy[i] -= this.grav[i] * dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d; this.vz[i] *= d; if (this.grav[i] === 0) this.vy[i] *= d;
      const nx = this.px[i] + this.vx[i] * dt, ny = this.py[i] + this.vy[i] * dt, nz = this.pz[i] + this.vz[i] * dt;
      if (this.hit[i] && T_SOLID[w.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) { this.vx[i] *= 0.3; this.vz[i] *= 0.3; this.vy[i] = 0; }
      else { this.px[i] = nx; this.py[i] = ny; this.pz[i] = nz; }
      const o = i * 4, k = this.life[i] / this.max[i];
      this.iPos[o] = this.px[i]; this.iPos[o + 1] = this.py[i]; this.iPos[o + 2] = this.pz[i]; this.iPos[o + 3] = this.size[i] * (k < 0.3 ? k / 0.3 : 1);
    }
    this.n = n;
    this.iCol.set(this.col.subarray(0, n * 4)); this.iTex.set(this.tex.subarray(0, n * 4)); this.iLight.set(this.lit.subarray(0, n * 2));
    this.geo.instanceCount = n;
    for (const a of [this.aPos, this.aCol, this.aTex]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * 4); a.needsUpdate = true; }
    this.aLight.clearUpdateRanges(); this.aLight.addUpdateRange(0, n * 2); this.aLight.needsUpdate = true;
  }
  get alive(): number { return this.n; }
}

// ---- item / held models -----------------------------------------------------------------------
const ITEM_VERT = /* glsl */ `
in vec3 color;
out vec3 vCol; out vec3 vN; out vec3 vWorld;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vCol = color; vN = normalize(mat3(modelMatrix) * normal); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const ITEM_FRAG = /* glsl */ `
precision highp float;
uniform vec4 uObj;   // sky, block, flash, glow
uniform float uNoFog;
in vec3 vCol; in vec3 vN; in vec3 vWorld;
${LIGHT_GLSL}
void main() {
  vec3 albedo = vCol * vCol;
  vec3 col = lit(albedo, normalize(vN), uObj.x, uObj.y) + albedo * uObj.w * 2.5;
  col = mix(col, vec3(2.0, 2.0, 2.0), uObj.z);
  gl_FragColor = vec4(uNoFog > 0.5 ? col : fogged(col, vWorld), 1.0);
}`;
/** Shared material for dropped and held items. Per-object light is pushed in onBeforeRender. */
export function makeItemMaterial(noFog: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: ITEM_VERT, fragmentShader: ITEM_FRAG, uniforms: { ...worldUniforms(), uObj: { value: new THREE.Vector4(1, 0, 0, 0) }, uNoFog: { value: noFog ? 1 : 0 } } });
}
