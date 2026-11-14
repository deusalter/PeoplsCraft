// Other players as drawn: the view of one (what the snapshots say, plus the walk, the swing, the flash and the fall that
// only drawing needs), its boxes through the creatures' batch, worn armour over them, and the held item in its fist.
import * as THREE from 'three';
import { T_BOX, T_LIQUID, T_OPAQUE, T_SOLID, texLayer } from '../data/blocks';
import { TIERS, item } from '../data/items';
import { type Part, rigOf } from '../data/mobs';
import { ARMOR_PARTS, HAND, PLAYER_PARTS } from '../data/playerModel';
import { PF_AWAY, PF_DIG, PF_FLY, PF_SLEEP, PF_SNEAK, PF_USING, type PlayerInfo } from '../net/protocol';
import type { World } from '../world/world';
import { type BoxBatch, type ShadowBatch, makeItemMaterial } from './batches';
import { U } from './gfx';
import type { ItemModels } from './itemModel';

/** Seconds of one swing of the arm (2.5), of the hurt flash, of the topple of a death before the body is hidden. */
export const SWING_T = 0.24, HURT_T = 0.22, TOPPLE_T = 0.6, DEAD_HIDE = 1.4;

/** Another player as the snapshots show it at the moment creatures are drawn at. `flags` are the PF_ bits. Fields under the
 *  first two lines are the view's own, advanced once a tick by the entity store. */
export class PlayerView {
  active = false; slot = 0;
  x = 0; y = 0; z = 0; px = 0; py = 0; pz = 0; yaw = 0; pitch = 0;
  flags = 0; hp = 1; dig = 0;
  /** Horizontal speed, from the snapshots around the moment drawn (blocks per second). */
  moving = 0;
  hw = 0.3; h = 1.8;
  /** Walk phase; swing seconds left and the 2-bit counter it last saw; hurt flash seconds left; seconds since it fell (-1: alive). */
  anim = 0; swing = 0; swingSeq = -1; hurt = 0; deadT = -1;
  /** Drawn body yaw and look, now and one tick ago, and how far the waist has gone into a sneak (0..1) and onto its back (0..1). */
  by = 0; pby = 0; pyaw = 0; ppitch = 0; crouch = 0; pcrouch = 0; lie = 0; plie = 0;
  /** Eased world light (ls < 0: not sampled yet), and the stride count footsteps last sounded at. */
  ls = -1; lb = 0; stepN = 0;
  /** The block the host says it is digging (`dg`; dgy < 0: none), seconds to the next chips off it, to the next splash, and
   *  the speed it fell at as last placed (blocks per second). */
  dgx = 0; dgy = -1; dgz = 0; chipT = 0; splashT = 0; fallV = 0;
}

/** Seconds between the chips and dig sounds of another player's digging, as the local body's dig ticks (`Interact`). */
export const CHIP_T = 0.22;
/** Cracks drawn at once: one per player in view. */
const MAX_CRACKS = 8;
const CRACK_VERT = /* glsl */ `out vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CRACK_FRAG = /* glsl */ `precision highp float; precision highp sampler2DArray; uniform sampler2DArray uAtlas; uniform float uLayer; in vec2 vUv;
void main() { vec4 t = texture(uAtlas, vec3(vUv, uLayer)); if (t.a < 0.05) discard; gl_FragColor = vec4(t.rgb * 0.05, t.a * 0.85); }`;
/** The crack stage (0..7) a block shows at dig progress `dig` (0..1), as the local player's own overlay picks it. */
export const crackStage = (dig: number): number => Math.min(7, Math.floor(dig * 8));

const TAU = Math.PI * 2;
const wrap = (a: number): number => a - Math.round(a / TAU) * TAU;
const mBase = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mRot = new THREE.Matrix4(), mTmp = new THREE.Matrix4(), mBox = new THREE.Matrix4();
const eul = new THREE.Euler(), vS = new THREE.Vector3();
/** Held-item meshes: one per player in view, eight at most (2.5). */
const MAX_HELD = 8;
const dark = (c: number, k: number): number => (((c >> 16) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k) | 0;

/** The colour an armour piece is drawn in: its tier's, else its icon's. */
function armorColor(key: string): number {
  const d = item(key);
  if (d.tier !== undefined && TIERS[d.tier]) return TIERS[d.tier].color;
  return d.icon?.a ?? 0x8a8a8a;
}

/** The pose inputs of the body being drawn, set by draw() and read by the box pass. */
const P = { walk: 0, amp: 0, swingA: 0, swingB: 0, use: 0, crouch: 0, headX: 0, headY: 0, idle: 0, fly: 0, away: 0 };

export class PlayerRender {
  readonly group = new THREE.Group();
  private mat = makeItemMaterial(false);
  private held: { mesh: THREE.Mesh; key: string; light: THREE.Vector4; used: boolean }[] = [];
  private cracks: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private crack0 = texLayer('crack0');
  private models = new Map<string, Part[]>();
  /** Joint matrices of the model being drawn, one per box. */
  private joints: THREE.Matrix4[] = [];

  constructor(private items: ItemModels) { this.mat.side = THREE.DoubleSide; }

  /** The box list of a body wearing `armor` (three item keys, '' for none), built once per combination. */
  model(armor: readonly string[]): Part[] {
    const key = armor.join('|');
    let m = this.models.get(key);
    if (m) return m;
    m = [...PLAYER_PARTS];
    for (let i = 0; i < 3; i++) {
      if (!armor[i]) continue;
      const c = armorColor(armor[i]), trim = dark(c, 0.62);
      for (const q of ARMOR_PARTS[i]) m.push({ ...q, c: q.c === 0 ? c : trim });
    }
    this.models.set(key, m);
    while (this.joints.length < m.length) this.joints.push(new THREE.Matrix4());
    return m;
  }

  /** Ease the drawn light toward the light around `v` (k = 1 snaps). */
  sampleLight(w: World, v: PlayerView, k: number): void {
    const bx = Math.floor(v.x), bz = Math.floor(v.z);
    let by = Math.floor(v.y + 1.2);
    if (T_OPAQUE[w.getBlock(bx, by, bz)]) by++;
    const l = w.getLight(bx, by, bz), sky = (l >> 4) / 15, blk = (l & 15) / 15;
    if (v.ls < 0 || k >= 1) { v.ls = sky; v.lb = blk; } else { v.ls += (sky - v.ls) * k; v.lb += (blk - v.lb) * k; }
  }

  /** Every active view, blended `alpha` of the way from the last tick to this one. `info` is the roster's word on a slot. */
  render(batch: BoxBatch, list: readonly PlayerView[], alpha: number, time: number, info: (slot: number) => PlayerInfo | undefined, w: World, shadows: ShadowBatch | null, dayAmt: number): void {
    for (const h of this.held) h.used = false;
    for (const v of list) {
      if (!v.active || (v.deadT >= DEAD_HIDE)) continue;
      const pi = info(v.slot);
      this.draw(batch, v, alpha, time, pi ? pi.armor : EMPTY, pi ? pi.held : '');
      if (shadows && v.deadT < 0 && !(v.flags & PF_FLY)) this.contact(w, shadows, v, alpha, dayAmt);
    }
    for (const h of this.held) if (!h.used && h.mesh.visible) h.mesh.visible = false;
    let ci = 0;
    for (const v of list) if (v.active && v.deadT < 0 && v.dgy >= 0 && v.dig > 0 && ci < MAX_CRACKS) {
      const id = w.getBlock(v.dgx, v.dgy, v.dgz);
      if (id) this.crack(ci++, v, id);
    }
    for (; ci < this.cracks.length; ci++) this.cracks[ci].mesh.visible = false;
  }

  /** Crack `i` over the block `v` digs, at the stage its dig progress has reached, sized to the block's box. */
  private crack(i: number, v: PlayerView, id: number): void {
    let c = this.cracks[i];
    if (!c) {
      const mat = new THREE.ShaderMaterial({ vertexShader: CRACK_VERT, fragmentShader: CRACK_FRAG, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uAtlas: U.uAtlas, uLayer: { value: 0 } } });
      const mesh = new THREE.Mesh(CRACK_BOX, mat);
      mesh.renderOrder = 3; mesh.frustumCulled = false;
      c = this.cracks[i] = { mesh, mat };
      this.group.add(mesh);
    }
    const o = id * 6, x0 = T_BOX[o] / 16, y0 = T_BOX[o + 1] / 16, z0 = T_BOX[o + 2] / 16, x1 = T_BOX[o + 3] / 16, y1 = T_BOX[o + 4] / 16, z1 = T_BOX[o + 5] / 16;
    c.mesh.position.set(v.dgx + (x0 + x1) / 2, v.dgy + (y0 + y1) / 2, v.dgz + (z0 + z1) / 2);
    c.mesh.scale.set(x1 - x0 + 0.004, y1 - y0 + 0.004, z1 - z0 + 0.004);
    c.mat.uniforms.uLayer.value = this.crack0 + crackStage(v.dig);
    c.mesh.visible = true;
  }
  /** The cracks drawn last frame: where, and at which atlas layer (read by the tests). */
  shownCracks(): { x: number; y: number; z: number; layer: number }[] {
    return this.cracks.filter((c) => c.mesh.visible).map((c) => ({ x: c.mesh.position.x, y: c.mesh.position.y, z: c.mesh.position.z, layer: c.mat.uniforms.uLayer.value as number - this.crack0 }));
  }
  /** Held-item meshes made so far, and how many of them show. */
  get heldCount(): { made: number; shown: number } { let shown = 0; for (const h of this.held) if (h.mesh.visible) shown++; return { made: this.held.length, shown }; }

  private draw(batch: BoxBatch, v: PlayerView, alpha: number, time: number, armor: readonly string[], held: string): void {
    const x = v.px + (v.x - v.px) * alpha, y = v.py + (v.y - v.py) * alpha, z = v.pz + (v.z - v.pz) * alpha;
    const by = v.pby + wrap(v.by - v.pby) * alpha, look = v.pyaw + wrap(v.yaw - v.pyaw) * alpha, pitch = v.ppitch + (v.pitch - v.ppitch) * alpha;
    const crouch = v.pcrouch + (v.crouch - v.pcrouch) * alpha, lie = v.plie + (v.lie - v.plie) * alpha;
    const f = v.flags, sky = v.ls < 0 ? 1 : v.ls, blk = v.ls < 0 ? 0 : v.lb;
    const flash = Math.min(1, Math.max(0, v.hurt / HURT_T));
    // the model faces +z; a body at yaw 0 looks toward -z
    mBase.makeRotationY(by + Math.PI);
    mBase.setPosition(x, y - crouch * 0.06, z);
    if (lie > 0) {
      // onto its back, pivoting at the heels, the head away from where it looked
      mRot.makeRotationX(-lie * Math.PI / 2); mRot.setPosition(0, lie * 0.16, 0); mBase.multiply(mRot);
    }
    if (v.deadT >= 0) {
      const k = Math.min(1, v.deadT / TOPPLE_T);
      mRot.makeRotationZ(k * k * Math.PI / 2); mRot.setPosition(0.3 * (Math.cos(k * k * Math.PI / 2) - 1), 0.3 * Math.sin(k * k * Math.PI / 2), 0); mBase.multiply(mRot);
    }
    // the arm: a swing raises it forward and brings it down across the body; digging repeats it, using an item holds the
    // hand up at the face
    let sw = v.swing > 0 ? 1 - v.swing / SWING_T : -1;
    if (f & PF_DIG && sw < 0) sw = (time * 4.2) % 1;
    P.swingA = sw >= 0 ? Math.sin(sw * Math.PI) : 0;
    P.swingB = sw >= 0 ? Math.sin(sw * Math.PI * 2) * 0.5 : 0;
    P.use = f & PF_USING ? 1 : 0;
    P.amp = lie > 0 || v.deadT >= 0 ? 0 : Math.min(0.8, v.moving * 0.14) * (f & PF_SNEAK ? 0.6 : 1);
    P.walk = v.anim; P.crouch = crouch; P.fly = f & PF_FLY ? 1 : 0; P.away = f & PF_AWAY && !(f & PF_SLEEP) ? 1 : 0;
    P.headX = lie > 0 ? 0 : Math.max(-1.2, Math.min(1.2, -pitch)) - crouch * 0.45 + P.away * 0.55;
    P.headY = lie > 0 ? 0 : Math.max(-1.1, Math.min(1.1, wrap(look - by)));
    P.idle = time + v.slot * 1.7;
    const parts = this.model(armor), rig = rigOf(parts), J = this.joints;
    let hand = -1;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i], pp = part.p, par = rig ? rig[i] : -1;
      let rx = 0, ry = 0, rz = 0;
      switch (part.a) {
        case 'legA': rx = Math.sin(P.walk) * P.amp + P.fly * 0.12; break;
        case 'legB': rx = -Math.sin(P.walk) * P.amp + P.fly * 0.12; break;
        case 'body': rx = crouch * 0.45; break;
        case 'armA': rx = -Math.sin(P.walk) * P.amp * 0.9 - P.swingA * 1.9 - P.use * 1.25 + Math.sin(P.idle * 1.1) * 0.04 * (1 - P.away);
          rz = -0.06 - P.swingB * 0.35 + Math.sin(P.idle * 0.9) * 0.03; ry = P.swingA * 0.25 + P.use * 0.3; break;
        case 'armB': rx = Math.sin(P.walk) * P.amp * 0.9 + Math.sin(P.idle * 1.1 + 1) * 0.04 * (1 - P.away); rz = 0.06 - Math.sin(P.idle * 0.9) * 0.03; break;
        case 'foreA': rx = -0.12 - P.swingA * 0.25 - P.use * 1.35; if (hand < 0) hand = i; break;
        case 'foreB': rx = -0.12 - Math.max(0, Math.sin(P.walk)) * P.amp * 0.3; break;
        case 'head': rx = P.headX; ry = P.headY; break;
      }
      mPart.makeTranslation(pp[0], pp[1], pp[2]);
      if (rx || ry || rz) { eul.set(rx, ry, rz, 'YXZ'); mRot.makeRotationFromEuler(eul); mPart.multiply(mRot); }
      J[i].multiplyMatrices(par >= 0 ? J[par] : mBase, mPart);
      const r = part.r, s = part.s, o = part.o;
      if (r) { eul.set(r[0], r[1], r[2], 'XYZ'); mTmp.makeRotationFromEuler(eul); } else mTmp.identity();
      mTmp.scale(vS.set(s[0], s[1], s[2]));
      if (o) mTmp.setPosition(o[0], o[1], o[2]);
      mBox.multiplyMatrices(J[i], mTmp);
      batch.add(mBox, part.c, sky, blk, flash, part.e ?? 0, part.t ?? 0, s[0], s[1], s[2]);
    }
    if (held && hand >= 0) this.hold(J[hand], held, sky, blk);
  }

  /** The held item in the right fist: a block as a small cube, anything else as its sprite standing out ahead of the fist. */
  private hold(J: THREE.Matrix4, key: string, sky: number, blk: number): void {
    let h = this.held.find((q) => !q.used && q.key === key) ?? this.held.find((q) => !q.used);
    if (!h) {
      if (this.held.length >= MAX_HELD) return;
      const light = new THREE.Vector4(1, 0, 0, 0), mesh = new THREE.Mesh(this.items.get(key), this.mat);
      mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
      mesh.onBeforeRender = (_r, _s, _c, _g, material) => { (material as THREE.ShaderMaterial).uniforms.uObj.value.copy(light); (material as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
      h = { mesh, key, light, used: false };
      this.held.push(h); this.group.add(mesh);
    }
    if (h.key !== key) { h.key = key; h.mesh.geometry = this.items.get(key); }
    h.used = true; h.mesh.visible = true;
    const d = item(key), cube = this.items.isCube(key), tool = !!d.tool || !!d.weapon;
    mTmp.makeTranslation(HAND[0], HAND[1], HAND[2]);
    if (cube) { mRot.makeScale(0.24, 0.24, 0.24); mRot.setPosition(0, -0.04, 0.1); }
    else {
      // the sprite's plane along the arm's forward line, its upper right corner (a blade's tip) pointing ahead and up
      eul.set(tool ? -Math.PI / 4 - 0.35 : -0.3, -Math.PI / 2, 0, 'YXZ'); mRot.makeRotationFromEuler(eul);
      const s = tool ? 0.62 : 0.42;
      mRot.scale(vS.set(s, s, s));
      mRot.setPosition(0, tool ? 0.02 : -0.04, tool ? 0.18 : 0.12);
    }
    mTmp.multiply(mRot);
    h.mesh.matrix.multiplyMatrices(J, mTmp);
    h.mesh.matrixWorldNeedsUpdate = true;
    h.light.set(sky, blk, 0, 0);
  }

  /** A soft dark patch on the ground under the feet, as the creatures have. */
  private contact(w: World, sh: ShadowBatch, v: PlayerView, alpha: number, dayAmt: number): void {
    const cx = v.px + (v.x - v.px) * alpha, cz = v.pz + (v.z - v.pz) * alpha, y = v.py + (v.y - v.py) * alpha, rad = 0.42, yy = Math.floor(y + 0.3);
    if (T_LIQUID[w.getBlock(Math.floor(cx), Math.floor(y + 0.1), Math.floor(cz))]) return;
    const day = 0.4 + 0.6 * dayAmt, sky = v.ls < 0 ? 1 : v.ls;
    for (let bx = Math.floor(cx - rad); bx <= Math.floor(cx + rad); bx++) for (let bz = Math.floor(cz - rad); bz <= Math.floor(cz + rad); bz++) {
      if (T_SOLID[w.getBlock(bx, yy, bz)]) continue;
      for (let by = yy - 1; by >= yy - 4; by--) {
        const id = w.getBlock(bx, by, bz);
        if (T_LIQUID[id]) break;
        if (!T_SOLID[id]) continue;
        const hgt = Math.max(0, y - (by + 1));
        sh.add(bx, by + 1, bz, cx, cz, rad * (1 + hgt * 0.05), 0.6 * Math.max(0, 1 - hgt / 12) * (0.35 + 0.65 * sky * day));
        break;
      }
    }
  }
}
const EMPTY: readonly string[] = ['', '', ''];
const CRACK_BOX = new THREE.BoxGeometry(1, 1, 1);
