// Renderer, shared uniforms, chunk materials, sky, sun shadows and the post-processing chain.
import * as THREE from 'three';
import { clamp, hash01, lerp, smoothstep } from '../core/noise';
import { DIMS } from '../data/dims';
import { Atlas } from './atlas';
import * as S from './shaders';

const v3 = (x = 0, y = 0, z = 0) => ({ value: new THREE.Vector3(x, y, z) });
const CLOUD_H = 8;   // thickness of the cloud layer in blocks

/** Tileable cloud-cover noise, one texel per cloud cell: read by the cloud slab, the cloud shadows and water reflections. */
function cloudMap(): THREE.DataTexture {
  const N = 256, d = new Uint8Array(N * N);
  const vn = (x: number, y: number, per: number, seed: number): number => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const x0 = xi % per, x1 = (xi + 1) % per, y0 = yi % per, y1 = (yi + 1) % per;
    return lerp(lerp(hash01(x0, 0, y0, seed), hash01(x1, 0, y0, seed), u), lerp(hash01(x0, 0, y1, seed), hash01(x1, 0, y1, seed), u), v);
  };
  // broad banks, cumulus-sized clumps and a little edge detail; every period divides the texture so it wraps cleanly
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
    d[y * N + x] = Math.round(255 * (vn(x * 12 / N, y * 12 / N, 12, 5) * 0.22 + vn(x * 48 / N, y * 48 / N, 48, 11) * 0.42 + vn(x * 112 / N, y * 112 / N, 112, 23) * 0.26 + vn(x * 160 / N, y * 160 / N, 160, 37) * 0.1));
  const t = new THREE.DataTexture(d, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** Uniforms shared by every world material. */
export const U = {
  uAtlas: { value: null as THREE.Texture | null }, uAtlasF: { value: null as THREE.Texture | null },
  uTime: { value: 0 }, uSway: { value: 1 },
  uLightDir: v3(0, 1, 0), uLightColor: v3(), uSkyLight: v3(), uAmbient: v3(),
  uZenith: v3(), uHorizon: v3(), uSunDir: v3(0, 1, 0), uGlowColor: v3(),
  uFogDensity: { value: 0.004 }, uFogStart: { value: 150 }, uFogEnd: { value: 190 },
  uCave: { value: 0 }, uUnderwater: { value: 0 }, uWaterFog: v3(0.02, 0.08, 0.16),
  uShadowMap: { value: null as THREE.Texture | null }, uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 }, uShadowTexel: { value: 1 / 2048 }, uShadowBias: { value: 144 / 2048 },
  uMist: { value: new THREE.Vector2(0, 96) },
  uCloudMap: { value: null as THREE.Texture | null }, uCloud: { value: new THREE.Vector4(196, CLOUD_H, 0, 0) }, uCover: { value: 0.56 }, uCloudLit: v3(1, 1, 1), uCloudDark: v3(0.4, 0.47, 0.62),
};

export interface GfxSettings {
  renderDist: number; fov: number; bloom: boolean; tonemap: boolean; vignette: boolean; shadows: boolean;
  clouds: boolean; sway: boolean; msaa: boolean; scale: number; shadowSize: number;
  fxaa: boolean; adapt: boolean; autoScale: boolean; aniso: number;
}
export const PRESETS: Record<string, GfxSettings> = {
  low: { renderDist: 8, fov: 75, bloom: false, tonemap: true, vignette: false, shadows: false, clouds: true, sway: false, msaa: false, scale: 0.75, shadowSize: 1024, fxaa: false, adapt: false, autoScale: true, aniso: 1 },
  medium: { renderDist: 12, fov: 75, bloom: true, tonemap: true, vignette: true, shadows: false, clouds: true, sway: true, msaa: false, scale: 1, shadowSize: 2048, fxaa: true, adapt: true, autoScale: true, aniso: 4 },
  high: { renderDist: 12, fov: 75, bloom: true, tonemap: true, vignette: true, shadows: true, clouds: true, sway: true, msaa: true, scale: 1, shadowSize: 2048, fxaa: true, adapt: true, autoScale: true, aniso: 8 },
};

function chunkMaterial(define: string | null, o: THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: U, vertexShader: S.CHUNK_VERT, fragmentShader: S.CHUNK_FRAG,
    defines: define ? { [define]: 1 } : {}, ...o,
  });
}

export interface Env { time: number; dim: number; fogTint: [number, number, number]; haze: number; cave: number; underwater: boolean; moonTint: [number, number, number] | null; moonPhase: number; darkness: number }

export class Gfx {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1400);
  readonly atlas = new Atlas();
  readonly materials: THREE.ShaderMaterial[];
  readonly handScene = new THREE.Scene();
  readonly handCamera = new THREE.PerspectiveCamera(62, 1, 0.02, 10);
  settings: GfxSettings = { ...PRESETS.medium };
  /** Geometry drawn into the shadow map (the world's chunk group). */
  shadowCasters: THREE.Object3D | null = null;
  /** Creature boxes: drawn into the shadow map after the chunks, with their own depth material. */
  boxCaster: { renderDepth(r: THREE.WebGLRenderer, cam: THREE.Camera): void } | null = null;
  dayAmt = 1;
  sunElev = 1;
  readonly lightDir = new THREE.Vector3(0, 1, 0);
  flash = 0;
  exposure = 1;
  /** Set when a chunk mesh changes so the next frame redraws the shadow map instead of reusing it. */
  shadowDirty = true;
  /** Light direction in view space, for the held item (it is drawn with an identity camera). */
  readonly handLightDir = new THREE.Vector3(0, 1, 0);

  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private clouds: THREE.Mesh; private cloudMat: THREE.ShaderMaterial;
  private rt!: THREE.WebGLRenderTarget; private mips: THREE.WebGLRenderTarget[] = []; private ups: THREE.WebGLRenderTarget[] = [];
  private shadowRt!: THREE.WebGLRenderTarget;
  private shadowCam = new THREE.OrthographicCamera(-72, 72, 72, -72, 1, 420);
  private depthMat: THREE.ShaderMaterial; private depthCut: THREE.ShaderMaterial;
  private quad: THREE.Mesh; private quadScene = new THREE.Scene(); private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mBright: THREE.ShaderMaterial; private mDown: THREE.ShaderMaterial; private mUp: THREE.ShaderMaterial; private mFinal: THREE.ShaderMaterial;
  private mFinalLuma: THREE.ShaderMaterial; private mFxaa: THREE.ShaderMaterial; private ldr: THREE.WebGLRenderTarget | null = null;
  private w = 1; private h = 1;
  private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3(); private tmpQ = new THREE.Quaternion();
  private dim = -1; private bloomAmt = 0.16; private shadowFrame = 0;
  private eyeSky = 1; private waterTint = new THREE.Vector3(1, 1, 1);
  // adaptive resolution (see tune)
  private dyn = 1; private dynPrev = 1; private ema = 16.7; private slow = 0; private probe = 0; private before = 0; private tuneOff = false;
  private black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = false;
    this.renderer.autoClear = false;
    this.black.needsUpdate = true;
    U.uAtlas.value = this.atlas.texture; U.uAtlasF.value = this.atlas.filtered;
    U.uCloudMap.value = cloudMap();

    this.materials = [
      chunkMaterial(null, { side: THREE.FrontSide }),
      chunkMaterial('CUTOUT', { side: THREE.DoubleSide }),
      // one pass: the shader handles both orientations, and three's default two-pass path recompiles the program key per mesh
      chunkMaterial('TRANSLUCENT', { side: THREE.DoubleSide, transparent: true, depthWrite: true, forceSinglePass: true }),
    ];
    const po = { polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 4 };
    this.depthMat = new THREE.ShaderMaterial({ vertexShader: S.DEPTH_VERT, fragmentShader: S.DEPTH_FRAG, side: THREE.DoubleSide, colorWrite: false, ...po });
    this.depthCut = new THREE.ShaderMaterial({ vertexShader: S.DEPTH_CUT_VERT, fragmentShader: S.DEPTH_CUT_FRAG, side: THREE.DoubleSide, colorWrite: false, uniforms: { uAtlas: U.uAtlas }, ...po });

    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: S.SKY_VERT, fragmentShader: S.SKY_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false,
      uniforms: { uZenith: U.uZenith, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uGlowColor: U.uGlowColor, uTime: U.uTime,
        uSunDisc: v3(), uMoonColor: v3(), uStars: { value: 0 }, uMoonPhase: { value: 0 }, uStarSpin: { value: 0 }, uAurora: v3(),
        uUnderwater: U.uUnderwater, uWaterFog: U.uWaterFog },
    });
    this.sky = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.skyMat);
    this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: S.CLOUD_VERT, fragmentShader: S.CLOUD_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false,
      uniforms: { uZenith: U.uZenith, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uGlowColor: U.uGlowColor, uTime: U.uTime, uFogEnd: U.uFogEnd, uLightDir: U.uLightDir,
        uCloudLit: U.uCloudLit, uCloudDark: U.uCloudDark, uCloudMap: U.uCloudMap, uCloud: U.uCloud, uCover: U.uCover },
    });
    // the inside of a box around the layer: one fragment per view ray, which the shader marches through the cloud cells.
    // 1900 wide keeps the far corners inside the camera's far plane; clouds have faded out long before that
    this.clouds = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.cloudMat);
    this.clouds.scale.set(1900, CLOUD_H, 1900); this.clouds.frustumCulled = false; this.clouds.renderOrder = 10;
    this.scene.add(this.clouds);

    const fs = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: S.FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mBright = fs(S.BRIGHT_FRAG, { tSrc: { value: null }, uThreshold: { value: 1.0 } });
    this.mDown = fs(S.DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = fs(S.UP_FRAG, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mFinal = fs(S.FINAL_FRAG, { tScene: { value: null }, tBloom: { value: this.black }, uBloom: { value: 0 }, uExposure: { value: 1 }, uVignette: { value: 0.35 }, uTonemap: { value: 1 }, uSat: { value: 1.1 }, uTint: v3(1, 1, 1), uFlash: { value: 0 }, uUnder: { value: 0 }, uTime: U.uTime });
    // with FXAA on, the same pass writes luma into alpha of an 8-bit target and the FXAA pass draws to the screen
    this.mFinalLuma = fs(S.FINAL_FRAG, this.mFinal.uniforms); this.mFinalLuma.defines = { LUMA_OUT: 1 };
    this.mFxaa = fs(S.FXAA_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mFinal);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.makeShadowTarget();
    this.resize();
  }

  private makeShadowTarget(): void {
    if (this.shadowRt) { this.shadowRt.depthTexture?.dispose(); this.shadowRt.dispose(); }
    const size = this.settings.shadows ? this.settings.shadowSize : 16;
    const dt = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
    dt.compareFunction = THREE.LessEqualCompare; dt.minFilter = THREE.LinearFilter; dt.magFilter = THREE.LinearFilter;
    this.shadowRt = new THREE.WebGLRenderTarget(size, size, { depthTexture: dt, depthBuffer: true, generateMipmaps: false });
    U.uShadowMap.value = dt; U.uShadowTexel.value = 1 / size; U.uShadowBias.value = 144 / size;   // world size of one shadow texel
    this.shadowDirty = true;
    // touch the target once so the depth texture exists (with its compare mode) before any material samples it
    this.renderer.setRenderTarget(this.shadowRt); this.renderer.clear(); this.renderer.setRenderTarget(null);
  }

  applySettings(s: GfxSettings): void {
    const remake = s.shadows !== this.settings.shadows || s.shadowSize !== this.settings.shadowSize || s.msaa !== this.settings.msaa || s.scale !== this.settings.scale || s.fxaa !== this.settings.fxaa || s.autoScale !== this.settings.autoScale;
    this.settings = { ...s };
    U.uSway.value = s.sway ? 1 : 0;
    this.clouds.visible = s.clouds;
    this.mFinal.uniforms.uTonemap.value = s.tonemap ? 1 : 0;
    this.mFinal.uniforms.uVignette.value = s.vignette ? 0.35 : 0;
    if (!s.adapt) this.exposure = 1;
    const an = Math.min(Math.max(1, s.aniso), this.renderer.capabilities.getMaxAnisotropy()), ft = this.atlas.filtered;
    if (ft.anisotropy !== an) { ft.anisotropy = an; ft.needsUpdate = true; }
    if (remake) { this.makeShadowTarget(); this.resize(); }
  }

  /** Effective resolution scale (the setting times the adaptive factor). */
  get renderScale(): number { return this.settings.scale * this.dyn; }

  /** Lower the internal resolution when frames are slow and doing so measurably helps. It never steps back up by
   *  itself: under vsync there is no way to see headroom. Call once per frame that had no chunk uploads. */
  tune(dtMs: number, cpuMs: number): void {
    if (!this.settings.autoScale || this.tuneOff || dtMs > 100 || cpuMs > 10) return;   // CPU-bound frames are not fixed by fewer pixels
    this.ema += (dtMs - this.ema) * 0.05;
    if (this.probe > 0) {
      if (--this.probe > 0) return;
      // no real gain: the frame rate is capped (vsync, battery saver) or the scene is not fill-bound, so undo and stop trying
      if (this.ema > this.before - 2) { this.dyn = this.dynPrev; this.tuneOff = true; this.resize(true); }
      return;
    }
    this.slow = this.ema > 19.5 ? this.slow + 1 : 0;
    if (this.slow >= 90 && this.dyn > 0.6) { this.before = this.ema; this.dynPrev = this.dyn; this.dyn -= 0.15; this.slow = 0; this.probe = 120; this.resize(true); }
  }

  /** Light and biome water colour at the eye: drives eye adaptation and the colour of the murk under water. */
  setEye(dt: number, light: number, water: number): void {
    const s = (light >> 4) / 15, b = (light & 15) / 15;
    const lum = Math.max(s * s * (0.25 + 0.75 * this.dayAmt), b * b * 0.6, this.dim >= 0 && !DIMS[this.dim].hasSky ? 0.2 : 0);
    const target = this.settings.adapt ? 1 + 0.8 * (1 - smoothstep(0.03, 0.45, lum)) : 1;
    // quick to close down in bright light, slow to open up in the dark
    this.exposure += (target - this.exposure) * (1 - Math.exp(-dt * (target < this.exposure ? 2.5 : 0.7)));
    this.eyeSky += (s - this.eyeSky) * Math.min(1, dt * 3);
    // biome water colour relative to plain blue water (0x3a84dc), so ordinary water keeps the stock murk colour
    const k = Math.min(1, dt * 0.8), wt = this.waterTint;
    wt.x += (clamp((water >> 16) / 0x3a, 0.4, 1.6) - wt.x) * k; wt.y += (clamp(((water >> 8) & 255) / 0x84, 0.4, 1.6) - wt.y) * k; wt.z += (clamp((water & 255) / 0xdc, 0.4, 1.6) - wt.z) * k;
  }

  resize(keepTune = false): void {
    if (!keepTune) { this.dyn = 1; this.tuneOff = false; this.probe = 0; this.slow = 0; this.ema = 16.7; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.settings.scale * this.dyn;
    const cw = this.canvas.clientWidth || window.innerWidth, ch = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(Math.max(2, Math.round(cw * dpr)), Math.max(2, Math.round(ch * dpr)), false);
    this.w = Math.max(2, Math.round(cw * dpr)); this.h = Math.max(2, Math.round(ch * dpr));
    this.camera.aspect = cw / ch; this.camera.updateProjectionMatrix();
    this.handCamera.aspect = cw / ch; this.handCamera.updateProjectionMatrix();
    this.rt?.dispose();
    this.rt = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, depthBuffer: true, samples: this.settings.msaa ? 4 : 0, generateMipmaps: false });
    this.ldr?.dispose();
    this.ldr = this.settings.fxaa ? new THREE.WebGLRenderTarget(this.w, this.h, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }) : null;
    this.mFxaa.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    for (const t of this.mips) t.dispose();
    for (const t of this.ups) t.dispose();
    this.mips = []; this.ups = [];
    let w = this.w >> 1, h = this.h >> 1;
    for (let i = 0; i < 5; i++) {
      const o = { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      this.mips.push(new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), o));
      if (i < 4) this.ups.push(new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), o));
      w >>= 1; h >>= 1;
    }
  }

  /** Update sky, light and fog uniforms for the frame. */
  update(time: number, env: Env, camPos: THREE.Vector3): void {
    U.uTime.value = time;
    const dim = DIMS[env.dim];
    if (env.dim !== this.dim) { this.dim = env.dim; this.exposure = 1; this.shadowDirty = true; }
    const t = dim.fixedTime ?? env.time;
    const a = t * Math.PI * 2;
    const sun = this.tmp.set(Math.cos(a), Math.sin(a), 0.32).normalize();
    U.uSunDir.value.copy(sun);
    const elev = sun.y;
    this.sunElev = elev;
    const day = smoothstep(-0.1, 0.22, elev);
    const dusk = Math.exp(-Math.pow(elev / 0.22, 2)) * smoothstep(-0.3, -0.05, elev);
    this.dayAmt = day;

    const Z = U.uZenith.value, H = U.uHorizon.value, G = U.uGlowColor.value, SL = U.uSkyLight.value, LC = U.uLightColor.value;
    Z.set(lerp(0.0025, 0.055, day), lerp(0.004, 0.19, day), lerp(0.014, 0.66, day));
    H.set(lerp(0.01, 0.34, day), lerp(0.016, 0.54, day), lerp(0.036, 0.84, day));
    Z.lerp(this.tmpV(0.09, 0.08, 0.26), dusk * 0.6);
    H.lerp(this.tmpV(1.0, 0.36, 0.1), dusk * 0.85);
    G.set(1.0, lerp(0.86, 0.42, dusk), lerp(0.62, 0.12, dusk)).multiplyScalar(smoothstep(-0.16, 0.06, elev) * (0.7 + dusk * 0.9));
    SL.set(lerp(0.016, 0.3, day), lerp(0.024, 0.38, day), lerp(0.05, 0.52, day));
    SL.lerp(this.tmpV(0.3, 0.2, 0.22), dusk * 0.5);

    // both lights are exactly zero at the moment the light direction flips between sun and moon
    const sunAmt = smoothstep(0, 0.16, elev), moonAmt = smoothstep(0, 0.16, -elev);
    if (elev >= 0) {
      this.lightDir.copy(sun);
      LC.set(1.0, lerp(0.5, 0.94, smoothstep(0, 0.45, elev)), lerp(0.2, 0.82, smoothstep(0, 0.45, elev))).multiplyScalar(1.02 * sunAmt);
    } else {
      this.lightDir.copy(sun).negate();
      LC.set(0.07, 0.1, 0.19).multiplyScalar(moonAmt);
    }
    const su = this.skyMat.uniforms;
    su.uSunDisc.value.set(1.0, lerp(0.55, 0.92, smoothstep(0, 0.4, elev)), lerp(0.25, 0.7, smoothstep(0, 0.4, elev))).multiplyScalar(9 * smoothstep(-0.12, 0.0, elev));
    const mt = env.moonTint;
    su.uMoonColor.value.set(mt ? mt[0] : 0.75, mt ? mt[1] : 0.82, mt ? mt[2] : 1.0).multiplyScalar(1.4 * smoothstep(0.05, -0.1, elev));
    su.uMoonPhase.value = env.moonPhase;
    su.uStars.value = Math.max(dim.stars, 1 - smoothstep(-0.25, 0.05, elev));
    su.uStarSpin.value = -a;   // the shader rotates the view direction, so the field itself turns by +a with the sun and moon
    su.uAurora.value.set(dim.aurora[0], dim.aurora[1], dim.aurora[2]);
    if (mt) { H.lerp(this.tmpV(mt[0] * 0.05, mt[1] * 0.05, mt[2] * 0.05), 0.6 * (1 - day)); SL.lerp(this.tmpV(mt[0] * 0.07, mt[1] * 0.07, mt[2] * 0.07), 0.7 * (1 - day)); }

    if (dim.zenith) Z.set(dim.zenith[0], dim.zenith[1], dim.zenith[2]);
    if (dim.horizon) H.set(dim.horizon[0], dim.horizon[1], dim.horizon[2]);
    if (dim.skyLight) SL.set(dim.skyLight[0], dim.skyLight[1], dim.skyLight[2]);
    if (!dim.hasSky) { LC.set(0, 0, 0); G.set(0, 0, 0); su.uSunDisc.value.set(0, 0, 0); su.uMoonColor.value.set(0, 0, 0); su.uStars.value = 0; }
    H.x *= env.fogTint[0]; H.y *= env.fogTint[1]; H.z *= env.fogTint[2];
    if (env.darkness > 0) { const k = 1 - env.darkness * 0.6; Z.multiplyScalar(k); H.multiplyScalar(k); SL.multiplyScalar(k); LC.multiplyScalar(k); }
    U.uLightDir.value.copy(this.lightDir);
    this.handLightDir.copy(this.lightDir).applyQuaternion(this.tmpQ.copy(this.camera.quaternion).invert());
    U.uAmbient.value.set(dim.ambient[0], dim.ambient[1], dim.ambient[2]);

    const far = this.settings.renderDist * 16 * dim.fogScale;
    U.uFogStart.value = far * 0.74; U.uFogEnd.value = far * 0.97;
    U.uFogDensity.value = (0.36 + env.haze * 0.8 + env.cave * 1.2) / far;
    // mist pools below its base height, thickens around dawn (less so at dusk) and in hazy biomes, and stays out of caves
    const dawn = Math.exp(-Math.pow((elev - 0.05) / 0.16, 2)) * (Math.cos(a) < 0 ? 0.35 : 1);
    U.uMist.value.set((dim.mist[0] + (dim.fixedTime === null ? 0.0055 * dawn : 0) + 0.004 * env.haze) * (1 - env.cave), dim.mist[1]);
    U.uCave.value = env.cave;
    U.uUnderwater.value = env.underwater ? 1 : 0;
    U.uWaterFog.value.set(0.012, 0.06, 0.13).multiply(this.waterTint).multiplyScalar(dim.hasSky ? (0.25 + day * 0.75) * (0.3 + 0.7 * this.eyeSky) : 0.3);
    const g = dim.grade, fu = this.mFinal.uniforms;
    fu.uTint.value.set(g.tint[0] * (env.underwater ? 0.7 : 1), g.tint[1] * (env.underwater ? 0.88 : 1), g.tint[2]);
    fu.uSat.value = g.sat * (dim.fixedTime === null ? lerp(0.84, 1, day) : 1);   // nights are a little less saturated
    fu.uUnder.value = env.underwater ? 1 : 0;
    this.bloomAmt = g.bloom;

    U.uCloudLit.value.set(lerp(0.035, 1.0, day), lerp(0.045, 0.98, day), lerp(0.08, 0.96, day)).lerp(this.tmpV(1.0, 0.55, 0.3), dusk * 0.7);
    U.uCloudDark.value.set(lerp(0.01, 0.4, day), lerp(0.014, 0.47, day), lerp(0.03, 0.62, day)).lerp(this.tmpV(0.42, 0.2, 0.24), dusk * 0.45);
    const cl = this.settings.clouds && dim.clouds;
    this.clouds.visible = cl && !env.underwater;   // the layer has no water fog of its own
    this.clouds.position.set(camPos.x, dim.cloudY + CLOUD_H / 2, camPos.z);
    U.uCloud.value.set(dim.cloudY, CLOUD_H, cl && dim.hasSky ? 0.5 * smoothstep(0, 0.08, Math.abs(elev)) : 0, cl ? 1 : 0);
    U.uCover.value = 0.57 - 0.07 * Math.min(1, env.haze);   // hazy biomes sit under heavier skies
    // shadows reach full strength before direct light is worth a tenth, so a low sun never shines through hills
    U.uShadowOn.value = this.settings.shadows && dim.hasSky ? smoothstep(0, 0.04, Math.abs(elev)) : 0;
  }
  private tv = new THREE.Vector3();
  private tmpV(x: number, y: number, z: number): THREE.Vector3 { return this.tv.set(x, y, z); }

  private renderShadows(): void {
    const casters = this.shadowCasters;
    if (!casters || U.uShadowOn.value <= 0) return;
    // the sun crawls and the map is texel-snapped, so every other frame is enough unless a chunk mesh changed.
    // The matrix is only written below, so matrix and depth map always stay a matched pair
    if ((this.shadowFrame++ & 1) && !this.shadowDirty) return;
    this.shadowDirty = false;
    const cam = this.shadowCam, c = this.camera.position, size = this.shadowRt.width, span = 144;
    // snap the light frustum to shadow texels so edges do not crawl as the player moves
    cam.position.copy(this.lightDir); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
    // centre the map ahead of the camera; the un-normalised flat view direction shrinks the shift when looking up or down
    const f = this.camera.getWorldDirection(this.tmp2);
    const q = cam.quaternion, qi = this.tmpQ.copy(q).invert(), p = this.tmp.set(c.x + f.x * span * 0.3, c.y, c.z + f.z * span * 0.3).applyQuaternion(qi), tex = span / size;
    p.x = Math.round(p.x / tex) * tex; p.y = Math.round(p.y / tex) * tex;
    p.applyQuaternion(q);
    cam.position.copy(p).addScaledVector(this.lightDir, 210);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    U.uShadowMatrix.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

    const kids = casters.children as THREE.Mesh[];
    for (let i = 0; i < kids.length; i++) {
      const m = kids[i], o = m.renderOrder;
      if (o === 2) m.visible = false; else m.material = o === 1 ? this.depthCut : this.depthMat;
    }
    const r = this.renderer;
    r.setRenderTarget(this.shadowRt); r.clear();
    r.render(casters, cam);
    if (this.boxCaster) this.boxCaster.renderDepth(r, cam);
    for (let i = 0; i < kids.length; i++) { const m = kids[i]; m.visible = true; m.material = this.materials[m.renderOrder]; }
  }

  private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  render(drawHand: boolean): void {
    const r = this.renderer;
    r.info.reset();
    this.sky.position.copy(this.camera.position);
    this.renderShadows();
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, this.camera);
    if (drawHand) { r.clearDepth(); r.render(this.handScene, this.handCamera); }

    const f = this.mFinal.uniforms;
    if (this.settings.bloom) {
      this.mBright.uniforms.tSrc.value = this.rt.texture;
      this.pass(this.mBright, this.mips[0]);
      for (let i = 1; i < 5; i++) {
        this.mDown.uniforms.tSrc.value = this.mips[i - 1].texture;
        this.mDown.uniforms.uTexel.value.set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
        this.pass(this.mDown, this.mips[i]);
      }
      let src = this.mips[4];
      for (let i = 3; i >= 0; i--) {
        this.mUp.uniforms.tSrc.value = src.texture; this.mUp.uniforms.tAdd.value = this.mips[i].texture;
        this.mUp.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
        this.pass(this.mUp, this.ups[i]);
        src = this.ups[i];
      }
      f.tBloom.value = this.ups[0].texture; f.uBloom.value = this.bloomAmt;
    } else { f.tBloom.value = this.black; f.uBloom.value = 0; }
    f.tScene.value = this.rt.texture; f.uFlash.value = this.flash; f.uExposure.value = this.exposure;
    if (this.ldr) {
      this.pass(this.mFinalLuma, this.ldr);
      this.mFxaa.uniforms.tSrc.value = this.ldr.texture;
      this.pass(this.mFxaa, null);
    } else this.pass(this.mFinal, null);
  }
}
