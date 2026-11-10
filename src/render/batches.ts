// Instanced renderers: one draw call for every creature box, one for every particle and one for
// the contact shadows under creatures. All write straight into preallocated typed arrays, so
// nothing is allocated per frame.
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
vec3 lit(vec3 albedo, vec3 N, float sky, float blk, float sun) {
  float shade = 0.78 + 0.22 * N.y - 0.06 * abs(N.x) + 0.06 * abs(N.z);
  vec3 l = uSkyLight * curve(sky) * shade + uLightColor * max(dot(N, uLightDir), 0.0) * smoothstep(0.5, 0.98, sky) * sun + curve(blk) * vec3(1.75, 1.5, 1.2) + uAmbient * shade;
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
// Each box carries its rest size, so the 16-texel-per-block pixel grid, the one-texel bevel and the
// surface patterns stay put while a part squashes or scales.
const BOX_VERT = /* glsl */ `
in vec4 aCol; in vec4 aFx; in vec3 aSize;
uniform mat4 uShadowMatrix;
out vec3 vCol; out vec3 vN; out vec3 vWorld; out vec3 vLocal; out vec3 vSh; out float vEm;
flat out vec4 vFx; flat out vec3 vSize; flat out vec3 vNl;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vLocal = position + 0.5; vSize = aSize; vNl = normal;
  vN = normalize(mat3(instanceMatrix) * normal);
  vCol = aCol.rgb; vEm = aCol.a; vFx = aFx; vWorld = wp.xyz;
  vSh = (uShadowMatrix * vec4(wp.xyz + vN * 0.14, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const BOX_FRAG = /* glsl */ `
precision highp float; precision highp sampler2DShadow;
uniform sampler2DShadow uShadowMap; uniform float uShadowOn; uniform float uShadowTexel;
in vec3 vCol; in vec3 vN; in vec3 vWorld; in vec3 vLocal; in vec3 vSh; in float vEm;
flat in vec4 vFx; flat in vec3 vSize; flat in vec3 vNl;
${LIGHT_GLSL}
float hash3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float sunShadow() {
  if (uShadowOn <= 0.0) return 1.0;
  vec3 p = vSh;
  if (p.x < 0.01 || p.x > 0.99 || p.y < 0.01 || p.y > 0.99 || p.z > 0.999) return 1.0;
  float o = uShadowTexel, s = texture(uShadowMap, p) * 0.4;
  s += (texture(uShadowMap, vec3(p.xy + vec2(-o, -o), p.z)) + texture(uShadowMap, vec3(p.xy + vec2(o, -o), p.z)) + texture(uShadowMap, vec3(p.xy + vec2(-o, o), p.z)) + texture(uShadowMap, vec3(p.xy + vec2(o, o), p.z))) * 0.15;
  vec2 e = abs(p.xy - 0.5) * 2.0;
  return mix(1.0, mix(s, 1.0, smoothstep(0.82, 0.98, max(e.x, e.y))), uShadowOn);
}
void main() {
  vec3 an = abs(vNl), size = vSize * 16.0;
  // texel coordinates; the axis along the face normal is pinned so every face hashes steadily
  vec3 q = floor(mix(vLocal * size, vNl * 31.0 + 64.0, an) + 0.001);
  vec2 uv = an.x > 0.5 ? q.zy : an.y > 0.5 ? q.xz : q.xy;
  vec2 fs = an.x > 0.5 ? size.zy : an.y > 0.5 ? size.xz : size.xy;
  vec3 d = min(vLocal, 1.0 - vLocal) * size;
  float e = an.x > 0.5 ? min(d.y, d.z) : an.y > 0.5 ? min(d.x, d.z) : min(d.x, d.y);
  float n = hash3(q), glow = vEm;
  // one darker texel round every face keeps same-coloured boxes apart (not on slivers or glowing parts)
  float k = (0.86 + 0.22 * n) * mix(0.9, 1.06, vLocal.y) * ((e < 1.0 && min(fs.x, fs.y) >= 3.0 && vEm < 0.5) ? 0.84 : 1.0);
  int pt = int(vFx.w + 0.5);
  if (pt == 1) k *= mod(uv.y, 4.0) < 1.0 ? 0.8 : 1.0;
  else if (pt == 2) k *= hash3(floor(q / 3.0) + 7.0) > 0.7 ? 0.74 : 1.0;
  else if (pt == 3) k *= (mod(uv.y, 4.0) < 1.0 || mod(uv.x + 3.0 * floor(uv.y / 4.0), 6.0) < 1.0) ? 0.76 : 1.0;
  else if (pt == 4) { float v = step(0.86, hash3(floor(q / 2.0) + 3.0)); glow += v * 0.8; k *= 1.0 - 0.12 * (1.0 - v); }
  else if (pt == 5) { float row = floor(uv.y / 3.0), cu = mod(uv.x + 2.0 * mod(row, 2.0), 4.0), cv = mod(uv.y, 3.0); k *= cv < 1.0 ? 0.76 : (cu < 1.0 ? 0.9 : (cv >= 2.0 ? 1.07 : 1.0)); }
  else if (pt == 6) k *= (e >= 1.0 && e < 2.0 && min(fs.x, fs.y) >= 5.0) ? 0.72 : 1.03;
  else if (pt == 7) k *= 0.8 + 0.28 * hash3(vec3(uv.x, floor(uv.y / 4.0 + hash3(vec3(uv.x, 5.0, q.z + q.x)) * 2.0), 11.0 + dot(an, vec3(1.0, 2.0, 3.0))));
  vec3 base = vCol * k;
  vec3 albedo = base * base;
  vec3 N = normalize(vN);
  float sun = smoothstep(0.5, 0.98, vFx.x) > 0.0 ? sunShadow() : 1.0;
  vec3 col = lit(albedo, N, vFx.x, vFx.y, sun) + albedo * glow * 3.2;
  // rim light from whatever is lighting the creature, so silhouettes read against dark terrain
  float rim = pow(1.0 - max(dot(N, normalize(cameraPosition - vWorld)), 0.0), 3.0);
  col += albedo * (uSkyLight * curve(vFx.x) + curve(vFx.y) * vec3(1.75, 1.5, 1.2) + uAmbient) * rim * 0.6;
  float f = vFx.z * vFx.z;
  col = mix(col, vec3(2.2, 0.5, 0.35) * (0.5 + 0.5 * k), f * 0.7) + vec3(1.6, 1.3, 1.0) * f * rim;
  gl_FragColor = vec4(fogged(col, vWorld), 1.0);
}`;
const BOX_DEPTH_VERT = /* glsl */ `void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const BOX_DEPTH_FRAG = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

export class BoxBatch {
  readonly mesh: THREE.InstancedMesh;
  private col: Float32Array; private fx: Float32Array; private size: Float32Array; private mat: Float32Array;
  private aCol: THREE.InstancedBufferAttribute; private aFx: THREE.InstancedBufferAttribute; private aSize: THREE.InstancedBufferAttribute;
  private depthMat = new THREE.ShaderMaterial({ vertexShader: BOX_DEPTH_VERT, fragmentShader: BOX_DEPTH_FRAG, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 4 });
  count = 0;
  constructor(readonly cap = 4096) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.col = new Float32Array(cap * 4); this.fx = new Float32Array(cap * 4); this.size = new Float32Array(cap * 3);
    this.aCol = new THREE.InstancedBufferAttribute(this.col, 4); this.aFx = new THREE.InstancedBufferAttribute(this.fx, 4); this.aSize = new THREE.InstancedBufferAttribute(this.size, 3);
    this.aCol.setUsage(THREE.DynamicDrawUsage); this.aFx.setUsage(THREE.DynamicDrawUsage); this.aSize.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCol', this.aCol); geo.setAttribute('aFx', this.aFx); geo.setAttribute('aSize', this.aSize);
    const mat = new THREE.ShaderMaterial({ vertexShader: BOX_VERT, fragmentShader: BOX_FRAG, uniforms: { ...worldUniforms(), uShadowMap: U.uShadowMap, uShadowMatrix: U.uShadowMatrix, uShadowOn: U.uShadowOn, uShadowTexel: U.uShadowTexel } });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mat = this.mesh.instanceMatrix.array as Float32Array;
  }
  begin(): void { this.count = 0; }
  /** Add a box. `m` is its full world matrix; light values are 0..1, `flash` is the hurt flash (1 = just hit),
   *  `pat` a surface pattern id (see Part.t) and `sx, sy, sz` the box's rest size in blocks, which sets its pixel grid. */
  add(m: THREE.Matrix4, color: number, sky: number, blk: number, flash: number, emissive: number, pat = 0, sx = 1, sy = 1, sz = 1): void {
    const i = this.count;
    if (i >= this.cap) return;
    this.mat.set(m.elements, i * 16);
    const o = i * 4, o3 = i * 3;
    this.col[o] = (color >> 16) / 255; this.col[o + 1] = ((color >> 8) & 255) / 255; this.col[o + 2] = (color & 255) / 255; this.col[o + 3] = emissive;
    this.fx[o] = sky; this.fx[o + 1] = blk; this.fx[o + 2] = flash; this.fx[o + 3] = pat;
    this.size[o3] = sx; this.size[o3 + 1] = sy; this.size[o3 + 2] = sz;
    this.count = i + 1;
  }
  end(): void {
    this.mesh.count = this.count;
    // an update range of length 0 means "the whole buffer" to WebGL2, so skip the upload when nothing is drawn
    if (this.count === 0) return;
    this.mesh.instanceMatrix.needsUpdate = true; this.aCol.needsUpdate = true; this.aFx.needsUpdate = true; this.aSize.needsUpdate = true;
    this.mesh.instanceMatrix.clearUpdateRanges(); this.mesh.instanceMatrix.addUpdateRange(0, this.count * 16);
    this.aCol.clearUpdateRanges(); this.aCol.addUpdateRange(0, this.count * 4);
    this.aFx.clearUpdateRanges(); this.aFx.addUpdateRange(0, this.count * 4);
    this.aSize.clearUpdateRanges(); this.aSize.addUpdateRange(0, this.count * 3);
  }
  /** Draw every box into the sun shadow map (called by Gfx with the light camera). */
  renderDepth(r: THREE.WebGLRenderer, cam: THREE.Camera): void {
    if (this.count === 0) return;
    const mesh = this.mesh, mat = mesh.material;
    mesh.material = this.depthMat; r.render(mesh, cam); mesh.material = mat;
  }
}

// ---- contact shadows ------------------------------------------------------------------------
// One quad per ground block under a creature, darkening whatever was drawn there. Emitting per
// block column lets a shadow step up and down terrain instead of floating over ledges, and the
// falloff is snapped to the 16-texel grid so it is pixelated like the ground it lies on.
const SH_VERT = /* glsl */ `
in vec4 aCell; in vec3 aBlob;
out vec3 vWorld; flat out vec3 vBlob; flat out float vK;
void main() {
  vec3 wp = vec3(aCell.x + position.x, aCell.y + 0.012, aCell.z + position.z);
  vWorld = wp; vBlob = aBlob; vK = aCell.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const SH_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; flat in vec3 vBlob; flat in float vK;
void main() {
  vec2 t = (floor(vWorld.xz * 16.0) + 0.5) / 16.0;
  float r = length(t - vBlob.xy) / vBlob.z;
  float a = vK * smoothstep(1.0, 0.3, r) * (1.0 - smoothstep(22.0, 30.0, distance(vWorld, cameraPosition)));
  gl_FragColor = vec4(vec3(1.0 - a), 1.0);
}`;
export class ShadowBatch {
  readonly mesh: THREE.Mesh;
  private cell: Float32Array; private blob: Float32Array; private n = 0;
  private aCell: THREE.InstancedBufferAttribute; private aBlob: THREE.InstancedBufferAttribute; private geo: THREE.InstancedBufferGeometry;
  constructor(readonly cap = 640) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.cell = new Float32Array(cap * 4); this.blob = new Float32Array(cap * 3);
    this.aCell = new THREE.InstancedBufferAttribute(this.cell, 4); this.aBlob = new THREE.InstancedBufferAttribute(this.blob, 3);
    this.aCell.setUsage(THREE.DynamicDrawUsage); this.aBlob.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aCell', this.aCell); g.setAttribute('aBlob', this.aBlob); g.instanceCount = 0;
    this.geo = g;
    // multiply blend: the quad only ever darkens what is already in the colour buffer
    const mat = new THREE.ShaderMaterial({ vertexShader: SH_VERT, fragmentShader: SH_FRAG, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;   // after opaque terrain, before the translucent chunk meshes (order 2)
  }
  begin(): void { this.n = 0; }
  /** Darken the top of block column (bx, bz), whose surface is at `y`, for a blob centred on (cx, cz). */
  add(bx: number, y: number, bz: number, cx: number, cz: number, radius: number, strength: number): void {
    const i = this.n;
    if (i >= this.cap || strength <= 0.01) return;
    const o = i * 4, o3 = i * 3;
    this.cell[o] = bx; this.cell[o + 1] = y; this.cell[o + 2] = bz; this.cell[o + 3] = strength;
    this.blob[o3] = cx; this.blob[o3 + 1] = cz; this.blob[o3 + 2] = radius;
    this.n = i + 1;
  }
  end(): void {
    this.geo.instanceCount = this.n;
    if (this.n === 0) return;
    this.aCell.clearUpdateRanges(); this.aCell.addUpdateRange(0, this.n * 4); this.aCell.needsUpdate = true;
    this.aBlob.clearUpdateRanges(); this.aBlob.addUpdateRange(0, this.n * 3); this.aBlob.needsUpdate = true;
  }
}

// ---- particles ---------------------------------------------------------------------------
const P_VERT = /* glsl */ `
in vec4 iPos; in vec4 iCol; in vec4 iTex; in vec2 iLight;
out vec3 vCol; out float vGlow; out vec3 vUvl; out vec2 vLight; out vec3 vWorld;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = iPos.xyz + (right * position.x + up * position.y) * iPos.w;
  vCol = iCol.rgb; vGlow = iCol.a; vLight = iLight; vWorld = wp;
  vUvl = vec3(iTex.y + (uv.x) * iTex.w, iTex.z + (1.0 - uv.y) * iTex.w, iTex.x);
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
  vec3 col = lit(albedo, vec3(0.0, 1.0, 0.0), vLight.x, vLight.y, 1.0) * (1.0 - vGlow) + albedo * vGlow * 3.4;
  gl_FragColor = vec4(fogged(col, vWorld), 1.0);
}`;

export class Particles {
  readonly mesh: THREE.Mesh;
  private n = 0; private frame = 0;
  private px: Float32Array; private py: Float32Array; private pz: Float32Array; private vx: Float32Array; private vy: Float32Array; private vz: Float32Array;
  private life: Float32Array; private max: Float32Array; private size: Float32Array; private grav: Float32Array; private drag: Float32Array;
  private col: Float32Array; private tex: Float32Array; private lit: Float32Array; private hit: Uint8Array;
  private iPos: Float32Array;
  private aPos: THREE.InstancedBufferAttribute; private aCol: THREE.InstancedBufferAttribute; private aTex: THREE.InstancedBufferAttribute; private aLight: THREE.InstancedBufferAttribute;
  private geo: THREE.InstancedBufferGeometry;

  constructor(readonly cap = 3000) {
    const f = (k = 1): Float32Array => new Float32Array(cap * k);
    this.px = f(); this.py = f(); this.pz = f(); this.vx = f(); this.vy = f(); this.vz = f(); this.life = f(); this.max = f(); this.size = f(); this.grav = f(); this.drag = f();
    this.col = f(4); this.tex = f(4); this.lit = f(2); this.hit = new Uint8Array(cap);
    this.iPos = f(4);
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.getAttribute('position')); g.setAttribute('uv', quad.getAttribute('uv'));
    const mk = (a: Float32Array, k: number): THREE.InstancedBufferAttribute => { const at = new THREE.InstancedBufferAttribute(a, k); at.setUsage(THREE.DynamicDrawUsage); return at; };
    // colour, texture and light are uploaded straight from the simulation arrays: swap-remove keeps [0, n) dense
    this.aPos = mk(this.iPos, 4); this.aCol = mk(this.col, 4); this.aTex = mk(this.tex, 4); this.aLight = mk(this.lit, 2);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iCol', this.aCol); g.setAttribute('iTex', this.aTex); g.setAttribute('iLight', this.aLight);
    g.instanceCount = 0;
    this.geo = g;
    const mat = new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: { ...worldUniforms(), uAtlas: U.uAtlas } });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
  }

  /** Spawn one particle. `layer` < 0 draws a flat colour; otherwise a 4x4 texel patch of that atlas tile.
   *  Leave `sky` / `blk` out and the particle takes the world light where it is, and keeps following it. */
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, glow: number, grav: number, layer = -1, collide = false, sky = -1, blk = -1): void {
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
    const frame = ++this.frame;
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
      // world light: always on the first update (spawn leaves -1), then one particle in sixteen per frame
      const fresh = this.lit[i * 2] < 0;
      if (fresh || ((i + frame) & 15) === 0) {
        const bx = Math.floor(this.px[i]), by = Math.floor(this.py[i]), bz = Math.floor(this.pz[i]);
        // a particle born inside a block (dust kicked up at a buried body) takes the light of the cell above it
        const solid = T_SOLID[w.getBlock(bx, by, bz)];
        if (fresh || !solid) { const l = w.getLight(bx, solid ? by + 1 : by, bz); this.lit[i * 2] = (l >> 4) / 15; this.lit[i * 2 + 1] = (l & 15) / 15; }
      }
      const o = i * 4, k = this.life[i] / this.max[i];
      this.iPos[o] = this.px[i]; this.iPos[o + 1] = this.py[i]; this.iPos[o + 2] = this.pz[i]; this.iPos[o + 3] = this.size[i] * (k < 0.3 ? k / 0.3 : 1);
    }
    this.n = n;
    this.geo.instanceCount = n;
    if (n === 0) return;   // a zero-length update range would re-upload the whole buffer
    this.aPos.clearUpdateRanges(); this.aPos.addUpdateRange(0, n * 4); this.aPos.needsUpdate = true;
    this.aCol.clearUpdateRanges(); this.aCol.addUpdateRange(0, n * 4); this.aCol.needsUpdate = true;
    this.aTex.clearUpdateRanges(); this.aTex.addUpdateRange(0, n * 4); this.aTex.needsUpdate = true;
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
  vec3 col = lit(albedo, normalize(vN), uObj.x, uObj.y, 1.0) + albedo * uObj.w * 2.5;
  col = mix(col, vec3(2.0, 2.0, 2.0), uObj.z);
  gl_FragColor = vec4(uNoFog > 0.5 ? col : fogged(col, vWorld), 1.0);
}`;
/** Shared material for dropped and held items. Per-object light is pushed in onBeforeRender. */
export function makeItemMaterial(noFog: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: ITEM_VERT, fragmentShader: ITEM_FRAG, uniforms: { ...worldUniforms(), uObj: { value: new THREE.Vector4(1, 0, 0, 0) }, uNoFog: { value: noFog ? 1 : 0 } } });
}
