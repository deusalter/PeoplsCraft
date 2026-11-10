// Renderer, shared uniforms, chunk materials, sky, sun shadows and the post-processing chain.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/noise';
import { DIMS } from '../data/dims';
import { Atlas } from './atlas';
import * as S from './shaders';

const v3 = (x = 0, y = 0, z = 0) => ({ value: new THREE.Vector3(x, y, z) });

/** Uniforms shared by every world material. */
export const U = {
  uAtlas: { value: null as THREE.Texture | null },
  uTime: { value: 0 }, uSway: { value: 1 },
  uLightDir: v3(0, 1, 0), uLightColor: v3(), uSkyLight: v3(), uAmbient: v3(),
  uZenith: v3(), uHorizon: v3(), uSunDir: v3(0, 1, 0), uGlowColor: v3(),
  uFogDensity: { value: 0.004 }, uFogStart: { value: 150 }, uFogEnd: { value: 190 },
  uCave: { value: 0 }, uUnderwater: { value: 0 }, uWaterFog: v3(0.02, 0.08, 0.16),
  uShadowMap: { value: null as THREE.Texture | null }, uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 }, uShadowTexel: { value: 1 / 2048 },
};

export interface GfxSettings {
  renderDist: number; fov: number; bloom: boolean; tonemap: boolean; vignette: boolean; shadows: boolean;
  clouds: boolean; sway: boolean; msaa: boolean; scale: number; shadowSize: number;
}
export const PRESETS: Record<string, GfxSettings> = {
  low: { renderDist: 8, fov: 75, bloom: false, tonemap: true, vignette: false, shadows: false, clouds: true, sway: false, msaa: false, scale: 0.75, shadowSize: 1024 },
  medium: { renderDist: 12, fov: 75, bloom: true, tonemap: true, vignette: true, shadows: false, clouds: true, sway: true, msaa: false, scale: 1, shadowSize: 2048 },
  high: { renderDist: 12, fov: 75, bloom: true, tonemap: true, vignette: true, shadows: true, clouds: true, sway: true, msaa: true, scale: 1, shadowSize: 2048 },
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

  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private clouds: THREE.Mesh; private cloudMat: THREE.ShaderMaterial;
  private rt!: THREE.WebGLRenderTarget; private mips: THREE.WebGLRenderTarget[] = []; private ups: THREE.WebGLRenderTarget[] = [];
  private shadowRt!: THREE.WebGLRenderTarget;
  private shadowCam = new THREE.OrthographicCamera(-72, 72, 72, -72, 1, 420);
  private depthMat: THREE.ShaderMaterial; private depthCut: THREE.ShaderMaterial;
  private quad: THREE.Mesh; private quadScene = new THREE.Scene(); private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mBright: THREE.ShaderMaterial; private mDown: THREE.ShaderMaterial; private mUp: THREE.ShaderMaterial; private mFinal: THREE.ShaderMaterial;
  private w = 1; private h = 1;
  private tmp = new THREE.Vector3(); private tmpQ = new THREE.Quaternion();
  private black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = false;
    this.renderer.autoClear = false;
    this.black.needsUpdate = true;
    U.uAtlas.value = this.atlas.texture;

    this.materials = [
      chunkMaterial(null, { side: THREE.FrontSide }),
      chunkMaterial('CUTOUT', { side: THREE.DoubleSide }),
      chunkMaterial('TRANSLUCENT', { side: THREE.DoubleSide, transparent: true, depthWrite: true }),
    ];
    this.depthMat = new THREE.ShaderMaterial({ vertexShader: S.DEPTH_VERT, fragmentShader: S.DEPTH_FRAG, side: THREE.DoubleSide, colorWrite: false });
    this.depthCut = new THREE.ShaderMaterial({ vertexShader: S.DEPTH_CUT_VERT, fragmentShader: S.DEPTH_CUT_FRAG, side: THREE.DoubleSide, colorWrite: false, uniforms: { uAtlas: U.uAtlas } });

    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: S.SKY_VERT, fragmentShader: S.SKY_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false,
      uniforms: { uZenith: U.uZenith, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uGlowColor: U.uGlowColor, uTime: U.uTime,
        uSunDisc: v3(), uMoonColor: v3(), uStars: { value: 0 }, uMoonPhase: { value: 0 }, uStarSpin: { value: 0 }, uAurora: v3() },
    });
    this.sky = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.skyMat);
    this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: S.CLOUD_VERT, fragmentShader: S.CLOUD_FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false,
      uniforms: { uZenith: U.uZenith, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uGlowColor: U.uGlowColor, uTime: U.uTime, uFogEnd: U.uFogEnd,
        uCloudLit: v3(1, 1, 1), uCloudDark: v3(0.6, 0.65, 0.75), uCover: { value: 0.52 } },
    });
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.cloudMat);
    this.clouds.scale.set(5000, 1, 5000); this.clouds.frustumCulled = false; this.clouds.renderOrder = 10;
    this.scene.add(this.clouds);

    const fs = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: S.FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mBright = fs(S.BRIGHT_FRAG, { tSrc: { value: null }, uThreshold: { value: 1.0 } });
    this.mDown = fs(S.DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = fs(S.UP_FRAG, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mFinal = fs(S.FINAL_FRAG, { tScene: { value: null }, tBloom: { value: this.black }, uBloom: { value: 0.55 }, uExposure: { value: 1 }, uVignette: { value: 0.35 }, uTonemap: { value: 1 }, uTint: v3(1, 1, 1), uFlash: { value: 0 } });
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
    U.uShadowMap.value = dt; U.uShadowTexel.value = 1 / size;
    // touch the target once so the depth texture exists (with its compare mode) before any material samples it
    this.renderer.setRenderTarget(this.shadowRt); this.renderer.clear(); this.renderer.setRenderTarget(null);
  }

  applySettings(s: GfxSettings): void {
    const remake = s.shadows !== this.settings.shadows || s.shadowSize !== this.settings.shadowSize || s.msaa !== this.settings.msaa || s.scale !== this.settings.scale;
    this.settings = { ...s };
    U.uSway.value = s.sway ? 1 : 0;
    this.clouds.visible = s.clouds;
    this.mFinal.uniforms.uTonemap.value = s.tonemap ? 1 : 0;
    this.mFinal.uniforms.uVignette.value = s.vignette ? 0.35 : 0;
    if (remake) { this.makeShadowTarget(); this.resize(); }
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.settings.scale;
    const cw = this.canvas.clientWidth || window.innerWidth, ch = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(Math.max(2, Math.round(cw * dpr)), Math.max(2, Math.round(ch * dpr)), false);
    this.w = Math.max(2, Math.round(cw * dpr)); this.h = Math.max(2, Math.round(ch * dpr));
    this.camera.aspect = cw / ch; this.camera.updateProjectionMatrix();
    this.handCamera.aspect = cw / ch; this.handCamera.updateProjectionMatrix();
    this.rt?.dispose();
    this.rt = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, depthBuffer: true, samples: this.settings.msaa ? 4 : 0, generateMipmaps: false });
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
    SL.lerp(this.tmpV(0.3, 0.2, 0.22), dusk * 0.4);

    const sunAmt = smoothstep(-0.02, 0.14, elev), moonAmt = smoothstep(-0.02, 0.14, -elev);
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
    su.uStarSpin.value = t * Math.PI * 2 * 0.25;
    su.uAurora.value.set(dim.aurora[0], dim.aurora[1], dim.aurora[2]);
    if (mt) { H.lerp(this.tmpV(mt[0] * 0.05, mt[1] * 0.05, mt[2] * 0.05), 0.6 * (1 - day)); SL.lerp(this.tmpV(mt[0] * 0.07, mt[1] * 0.07, mt[2] * 0.07), 0.7 * (1 - day)); }

    if (dim.zenith) Z.set(dim.zenith[0], dim.zenith[1], dim.zenith[2]);
    if (dim.horizon) H.set(dim.horizon[0], dim.horizon[1], dim.horizon[2]);
    if (dim.skyLight) SL.set(dim.skyLight[0], dim.skyLight[1], dim.skyLight[2]);
    if (!dim.hasSky) { LC.set(0, 0, 0); G.set(0, 0, 0); su.uSunDisc.value.set(0, 0, 0); su.uMoonColor.value.set(0, 0, 0); }
    H.x *= env.fogTint[0]; H.y *= env.fogTint[1]; H.z *= env.fogTint[2];
    if (env.darkness > 0) { const k = 1 - env.darkness * 0.6; Z.multiplyScalar(k); H.multiplyScalar(k); SL.multiplyScalar(k); LC.multiplyScalar(k); }
    U.uLightDir.value.copy(this.lightDir);
    U.uAmbient.value.set(dim.ambient[0], dim.ambient[1], dim.ambient[2]);

    const far = this.settings.renderDist * 16 * dim.fogScale;
    U.uFogStart.value = far * 0.74; U.uFogEnd.value = far * 0.97;
    U.uFogDensity.value = (0.3 + env.haze * 0.8 + env.cave * 1.2) / far;
    U.uCave.value = env.cave;
    U.uUnderwater.value = env.underwater ? 1 : 0;
    U.uWaterFog.value.set(0.012, 0.06, 0.13).multiplyScalar(0.25 + day * 0.75);
    this.mFinal.uniforms.uTint.value.set(env.underwater ? 0.7 : 1, env.underwater ? 0.88 : 1, 1);

    const cu = this.cloudMat.uniforms;
    cu.uCloudLit.value.set(lerp(0.035, 1.0, day), lerp(0.045, 0.98, day), lerp(0.08, 0.96, day)).lerp(this.tmpV(1.0, 0.55, 0.3), dusk * 0.7);
    cu.uCloudDark.value.set(lerp(0.01, 0.5, day), lerp(0.014, 0.56, day), lerp(0.03, 0.7, day));
    this.clouds.visible = this.settings.clouds && dim.clouds;
    this.clouds.position.set(camPos.x, env.dim === 2 ? 60 : 196, camPos.z);
    U.uShadowOn.value = this.settings.shadows && dim.hasSky ? clamp(smoothstep(0.06, 0.2, Math.abs(elev)), 0, 1) : 0;
  }
  private tv = new THREE.Vector3();
  private tmpV(x: number, y: number, z: number): THREE.Vector3 { return this.tv.set(x, y, z); }

  private renderShadows(): void {
    const casters = this.shadowCasters;
    if (!casters || U.uShadowOn.value <= 0) return;
    const cam = this.shadowCam, c = this.camera.position, size = this.shadowRt.width, span = 144;
    // snap the light frustum to shadow texels so edges do not crawl as the player moves
    cam.position.copy(this.lightDir); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
    const q = cam.quaternion, qi = this.tmpQ.copy(q).invert(), p = this.tmp.copy(c).applyQuaternion(qi), tex = span / size;
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
      f.tBloom.value = this.ups[0].texture; f.uBloom.value = 0.16;
    } else { f.tBloom.value = this.black; f.uBloom.value = 0; }
    f.tScene.value = this.rt.texture; f.uFlash.value = this.flash; f.uExposure.value = this.exposure;
    this.pass(this.mFinal, null);
  }
}
