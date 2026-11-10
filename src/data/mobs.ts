// Creature table: stats, AI archetype, box model, drops and spawn rules. Bosses carry a phase
// script built from reusable attack primitives, so a new boss is data only.
import type { Drop } from './blocks';

/**
 * One box of a creature model. Units are blocks, angles are radians; the model stands on y = 0 and faces +z.
 * Every box is placed as  Base * [parent joint] * T(p) * Ranim(a) * T(o) * R(r) * S(s):
 *
 *   s    box size.
 *   p    the joint: the point the animation turns about (a hip, a neck, a jaw hinge). With `par` it is
 *        measured from the parent's joint, in the parent's turned frame; otherwise from the feet.
 *   o    offset of the box centre from the joint (default: centred on it). Boxes that must move as one
 *        rigid piece (a head with its eyes, horns and hat) share the same `p` and `a` and differ only in `o`.
 *   r    static tilt [x, y, z] (Euler XYZ) about the box's own centre: slanted plates, splayed claws, diamonds.
 *   c    colour 0xRRGGBB.   e  emissive, 0..1 (glows and blooms; emissive boxes get no bevel).
 *   t    surface pattern: 0 speckle (default), 1 bands, 2 blotches, 3 masonry, 4 glowing veins,
 *        5 scales, 6 plate (dark inset frame), 7 streaks (fur / bark).
 *   ph   [first, last] boss phase (0-based, inclusive) in which the box is drawn; ignored on non-bosses.
 *        Use it to grow, shed or crack pieces between phases.
 *   n    names this box's joint so later boxes can attach to it.
 *   par  name of an EARLIER box whose joint this one rides on (forearm on upper arm, jaw on head).
 *        Chains may be any depth; a hidden (`ph`) parent still carries its children.
 *   ap   animation phase offset added to this box's oscillator, to stagger legs, ripple a tail or
 *        desynchronise floating pieces.
 *   a    animation tag (none = rigid):
 *        legA legB    walk swing about x, opposite phases        armA armB  arm swing, melee swipe, boss cast pose
 *        head         idle nod, attack lunge, glance at player   tail       side-to-side wag about y
 *        wingA wingB  flap about z                               jawA jawB  upper / lower jaw, opened by attacks
 *        bob          gentle vertical float                      drift      slow float that also wanders sideways
 *        spin         orbit about y with a slight bob            spin2      slow counter-rotation about y
 *        spinx spinz  continuous rotation about x / z            sway       loose two-axis sway (tendrils, banners)
 *        squash       stretches with vertical speed (hoppers)    pulse      throbbing size and glow (cores, hearts)
 *        shinA shinB  knee of a two-part leg (child of legA/B)   foreA foreB  elbow of a two-part arm (child of armA/B)
 *        wingA2 wingB2  outer wing, lags the inner one it rides  claw       talons: tucked, thrown forward in a dive
 *        body         waist: leans into wind-ups and strikes     neck       lowers the head for a charge
 *        mandA mandB  side jaws, opening about y                 cape       hangs, streams back when moving
 *        halo         orbit that speeds up with boss phase and tilts into a barrel while the boss aims
 *        float        loose stacked stone: bobs, twists and lifts apart with boss phase
 *        arch         frame piece that spreads from its joint with boss phase
 *        robe clap    bell-shaped skirt swinging from one hinge, and its clapper (child of the robe)
 *        seal         slow wheel about z, faster with boss phase
 *   k    animation gain: multiplies the tag's motion (0.3 = subtle, -1 = mirrored). Default 1.
 */
export interface Part {
  s: [number, number, number]; p: [number, number, number]; o?: [number, number, number]; c: number; a?: string; e?: number;
  r?: [number, number, number]; t?: number; ph?: [number, number]; n?: string; par?: string; ap?: number; k?: number;
}
export interface SpawnRule { dim: number; biomes?: string[]; where: 'surface' | 'cave' | 'water' | 'air'; time: 'day' | 'night' | 'any'; y?: [number, number]; weight: number; group: [number, number]; flag?: string; event?: string }

export type Attack =
  | { t: 'charge'; speed: number; dmg: number; windup: number; dur: number }
  | { t: 'slam'; radius: number; dmg: number; windup: number; ring?: [proj: string, n: number] }
  | { t: 'volley'; proj: string; n: number; spread: number; dmg: number; bursts?: number; gap?: number }
  | { t: 'spiral'; proj: string; arms: number; dur: number; dmg: number; spin: number }
  | { t: 'rain'; proj: string; n: number; radius: number; dmg: number }
  | { t: 'ring'; proj: string; n: number; dmg: number }
  | { t: 'summon'; mob: string; n: number }
  | { t: 'teleport' }
  | { t: 'beam'; proj: string; dmg: number; windup: number; dur: number }
  | { t: 'burrow'; dmg: number; ring?: [proj: string, n: number] };
export interface Phase { below: number; speed: number; cd: [number, number]; attacks: Attack[]; enter?: Attack; say?: string }
/** A boss script. Optional model hooks: `seg` is the box list of one body segment (drawn `segments` times along the trail behind a
 *  burrower, tapering, each turned toward the link ahead; built round its own centre, facing +z); `cast` the height above the feet
 *  that shots leave from (default 0.6 of the height); `spin` the speed of 'halo' / 'seal' pieces as [base, extra at the last phase];
 *  `stomp` the camera shake of each footfall; `gallop` switches the legs to a bounding gait at speed; `castSound` plays at each cast. */
export interface BossSpec {
  n: number; move: 'walk' | 'hover' | 'burrow' | 'fly'; phases: Phase[]; title: string; intro: string; segments?: number;
  seg?: Part[]; cast?: number; spin?: [number, number]; stomp?: number; gallop?: boolean; castSound?: string;
}

export interface MobDef {
  key: string; name: string; hp: number; dmg: number; def: number; speed: number; xp: number; coins: [number, number];
  hw: number; h: number; ai: 'passive' | 'melee' | 'ranged' | 'hopper' | 'flyer' | 'fish' | 'minion' | 'npc' | 'boss';
  hostile: boolean; parts: Part[]; drops: Drop[];
  aggro?: number; range?: number; proj?: string; rate?: number; knockRes?: number; voice?: number;
  spawn?: SpawnRule[]; boss?: BossSpec; glow?: boolean;
}

/** Most boxes one model may have (the renderer keeps one joint matrix per box). */
export const MAX_PARTS = 160;
const RIGS = new WeakMap<Part[], Int16Array | null>();
/** Parent box index for every box of a model (-1 = none), or null when it has no `par` links at all. */
export function rigOf(parts: Part[]): Int16Array | null {
  let r = RIGS.get(parts);
  if (r !== undefined) return r;
  r = null;
  if (parts.some((q) => q.par)) {
    r = new Int16Array(parts.length).fill(-1);
    for (let i = 0; i < parts.length; i++) { const par = parts[i].par; if (par) for (let j = i - 1; j >= 0; j--) if (parts[j].n === par) { r[i] = j; break; } }
  }
  RIGS.set(parts, r);
  return r;
}

// ---- model builders ----------------------------------------------------------------
const dark = (c: number, k = 0.7): number => (((c >> 16) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k) | 0;
/** A pair of eyes at height `y`, depth `z`. Pass the head's joint as `piv` so they turn with the head. */
const eyes = (y: number, z: number, gap: number, c: number, e = 0, s = 0.09, piv?: [number, number, number]): Part[] => piv
  ? [{ s: [s, s, 0.04], p: piv, o: [-gap, y - piv[1], z - piv[2]], c, e, a: 'head' }, { s: [s, s, 0.04], p: piv, o: [gap, y - piv[1], z - piv[2]], c, e, a: 'head' }]
  : [{ s: [s, s, 0.04], p: [-gap, y, z], c, e, a: 'head' }, { s: [s, s, 0.04], p: [gap, y, z], c, e, a: 'head' }];
interface QuadOpt { w: number; h: number; l: number; leg: number; head: number; hc?: number; legC?: number; eye?: number; glow?: number; horn?: number; tail?: number; back?: number }
function quad(c: number, o: QuadOpt): Part[] {
  const by = o.leg + o.h / 2, lw = Math.min(0.2, o.w * 0.3), hx = o.w / 2 - lw / 2, hz = o.l / 2 - lw / 2, lc = o.legC ?? dark(c);
  const hy = o.leg + o.h * 0.75, hzp = o.l / 2 + o.head * 0.35;
  const ps: Part[] = [
    { s: [o.w, o.h, o.l], p: [0, by, 0], c },
    { s: [o.head, o.head, o.head], p: [0, hy, hzp], c: o.hc ?? c, a: 'head' },
    { s: [lw, o.leg, lw], p: [-hx, o.leg, hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legA' }, { s: [lw, o.leg, lw], p: [hx, o.leg, hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legB' },
    { s: [lw, o.leg, lw], p: [-hx, o.leg, -hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legB' }, { s: [lw, o.leg, lw], p: [hx, o.leg, -hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legA' },
    ...eyes(hy + o.head * 0.12, hzp + o.head / 2, o.head * 0.26, o.eye ?? 0x15131c, o.glow ?? 0, Math.max(0.07, o.head * 0.2), [0, hy, hzp]),
  ];
  if (o.horn) ps.push({ s: [0.08, 0.2, 0.08], p: [0, hy, hzp], o: [-o.head * 0.35, o.head / 2 + 0.08, 0], c: o.horn, a: 'head' }, { s: [0.08, 0.2, 0.08], p: [0, hy, hzp], o: [o.head * 0.35, o.head / 2 + 0.08, 0], c: o.horn, a: 'head' });
  if (o.tail) ps.push({ s: [0.1, 0.1, 0.4], p: [0, by + o.h * 0.2, -o.l / 2], o: [0, 0, -0.2], c: o.tail, a: 'tail' });
  if (o.back) ps.push({ s: [o.w * 0.7, 0.14, o.l * 0.8], p: [0, o.leg + o.h + 0.06, 0], c: o.back });
  return ps;
}
interface BipedOpt { h: number; w: number; skin?: number; legs?: number; arms?: number; glow?: number; eye?: number; hat?: number; long?: boolean; cape?: number }
function biped(c: number, o: BipedOpt): Part[] {
  const leg = o.h * 0.42, torso = o.h * 0.33, head = o.h * 0.25, lw = o.w * 0.42, aw = o.w * 0.32, al = torso * (o.long ? 1.45 : 1.05);
  const ty = leg + torso / 2, hy = leg + torso + head / 2, skin = o.skin ?? c;
  const ps: Part[] = [
    { s: [lw, leg, lw], p: [-o.w * 0.25, leg, 0], o: [0, -leg / 2, 0], c: o.legs ?? dark(c), a: 'legA' }, { s: [lw, leg, lw], p: [o.w * 0.25, leg, 0], o: [0, -leg / 2, 0], c: o.legs ?? dark(c), a: 'legB' },
    { s: [o.w, torso, o.w * 0.55], p: [0, ty, 0], c },
    { s: [aw, al, aw], p: [-(o.w / 2 + aw / 2), leg + torso - 0.04, 0], o: [0, -al / 2, 0], c: o.arms ?? skin, a: 'armA' }, { s: [aw, al, aw], p: [o.w / 2 + aw / 2, leg + torso - 0.04, 0], o: [0, -al / 2, 0], c: o.arms ?? skin, a: 'armB' },
    { s: [head, head, head], p: [0, hy, 0], c: skin, a: 'head' },
    ...eyes(hy + head * 0.08, head / 2, head * 0.24, o.eye ?? 0x15131c, o.glow ?? 0, head * 0.2, [0, hy, 0]),
  ];
  if (o.hat) ps.push({ s: [head * 1.2, head * 0.3, head * 1.2], p: [0, hy, 0], o: [0, head * 0.55, 0], c: o.hat, a: 'head' });
  if (o.cape) ps.push({ s: [o.w * 0.95, torso * 1.5, 0.06], p: [0, leg + torso, -o.w * 0.3], o: [0, -torso * 0.7, 0], c: o.cape, a: 'tail' });
  return ps;
}
function blob(c: number, s: number, core: number, eye = 0x15131c, glow = 0): Part[] {
  // boxes are opaque, so the core shows as a band through both flanks plus a window low on the face
  return [{ s: [s, s * 0.8, s], p: [0, s * 0.4, 0], c, a: 'squash' }, { s: [s * 1.04, s * 0.3, s * 0.5], p: [0, s * 0.42, 0], c: core, a: 'squash', e: glow * 0.6 },
    { s: [s * 0.5, s * 0.3, 0.04], p: [0, s * 0.26, s / 2], c: core, a: 'squash', e: glow * 0.6 },
    ...eyes(s * 0.5, s / 2, s * 0.22, eye, glow, s * 0.14)];
}
function flyer(c: number, body: number, span: number, wing: number, eye = 0xffe06a, glow = 0.9): Part[] {
  return [{ s: [body, body * 0.7, body * 1.3], p: [0, body * 0.5, 0], c },
    { s: [span, 0.05, body * 0.9], p: [-body / 2, body * 0.6, 0], o: [-span / 2, 0, 0], c: wing, a: 'wingA' }, { s: [span, 0.05, body * 0.9], p: [body / 2, body * 0.6, 0], o: [span / 2, 0, 0], c: wing, a: 'wingB' },
    ...eyes(body * 0.6, body * 0.65, body * 0.22, eye, glow, body * 0.16)];
}
function wisp(c: number, s: number, bits: number): Part[] {
  // a tilted diamond shell with a white three-bar star poking through it
  const ps: Part[] = [{ s: [s * 0.85, s * 0.85, s * 0.85], p: [0, s, 0], r: [0.62, 0.79, 0], c, e: 1, a: 'bob' },
    { s: [s * 1.5, s * 0.34, s * 0.34], p: [0, s, 0], c: 0xffffff, e: 1, a: 'bob' }, { s: [s * 0.34, s * 1.5, s * 0.34], p: [0, s, 0], c: 0xffffff, e: 1, a: 'bob' }, { s: [s * 0.34, s * 0.34, s * 1.5], p: [0, s, 0], c: 0xffffff, e: 1, a: 'bob' }];
  for (let i = 0; i < 4; i++) ps.push({ s: [s * 0.3, s * 0.3, s * 0.3], p: [0, s, 0], o: [Math.cos(i * 1.57) * s * 1.1, Math.sin(i * 2.1) * s * 0.3, Math.sin(i * 1.57) * s * 1.1], r: [0.6, 0.6, 0], c: bits, e: 0.8, a: 'spin' });
  return ps;
}
const fish = (c: number, belly: number): Part[] => [{ s: [0.16, 0.24, 0.5], p: [0, 0.16, 0], c }, { s: [0.14, 0.1, 0.4], p: [0, 0.08, 0], c: belly },
  { s: [0.04, 0.26, 0.2], p: [0, 0.16, -0.25], o: [0, 0, -0.1], c: dark(c), a: 'tail' }, ...eyes(0.2, 0.2, 0.085, 0x101018, 0, 0.05)];

// ---- definitions ---------------------------------------------------------------------
const LAND = ['plains', 'forest', 'palewood', 'bloomvale', 'taiga', 'savanna', 'jungle', 'swamp', 'crags'];
const M: MobDef[] = [
  // passive
  { key: 'woolback', name: 'Woolback', hp: 12, dmg: 0, def: 0, speed: 1.6, xp: 2, coins: [0, 0], hw: 0.42, h: 1.1, ai: 'passive', hostile: false, voice: 0.8,
    parts: quad(0xe8e2d2, { w: 0.8, h: 0.7, l: 1.15, leg: 0.42, head: 0.42, hc: 0x4a3a30, legC: 0x4a3a30, horn: 0xd8c8a0, back: 0xf6f2e6 }),
    drops: [['raw_meat', 1, 1, 2], ['hide', 0.8, 1, 2]], spawn: [{ dim: 0, biomes: ['plains', 'forest', 'palewood', 'bloomvale', 'savanna'], where: 'surface', time: 'day', weight: 10, group: [2, 4] }] },
  { key: 'gobblet', name: 'Gobblet', hp: 6, dmg: 0, def: 0, speed: 1.9, xp: 1, coins: [0, 0], hw: 0.25, h: 0.6, ai: 'passive', hostile: false, voice: 1.7,
    parts: [{ s: [0.36, 0.34, 0.46], p: [0, 0.42, 0], c: 0xb86a3a }, { s: [0.22, 0.26, 0.22], p: [0, 0.72, 0.2], c: 0xd8c0a0, a: 'head' }, { s: [0.08, 0.06, 0.12], p: [0, 0.72, 0.2], o: [0, -0.02, 0.16], c: 0xf2a02a, a: 'head' },
      { s: [0.06, 0.26, 0.06], p: [-0.1, 0.26, 0], o: [0, -0.13, 0], c: 0xf2a02a, a: 'legA' }, { s: [0.06, 0.26, 0.06], p: [0.1, 0.26, 0], o: [0, -0.13, 0], c: 0xf2a02a, a: 'legB' },
      { s: [0.3, 0.26, 0.08], p: [0, 0.56, -0.24], c: 0x6a3a22, a: 'tail' }, ...eyes(0.78, 0.31, 0.07, 0x101018, 0, 0.05, [0, 0.72, 0.2])],
    drops: [['raw_meat', 1, 1, 1], ['feather', 1, 1, 3]], spawn: [{ dim: 0, biomes: ['plains', 'forest', 'palewood', 'jungle', 'swamp'], where: 'surface', time: 'day', weight: 8, group: [2, 4] }] },
  { key: 'burrowhog', name: 'Burrowhog', hp: 16, dmg: 0, def: 1, speed: 1.8, xp: 3, coins: [0, 0], hw: 0.4, h: 0.85, ai: 'passive', hostile: false, voice: 0.6,
    parts: quad(0x6a4a34, { w: 0.7, h: 0.55, l: 1.0, leg: 0.3, head: 0.44, hc: 0x7a5a40, horn: 0xe6dfcc, tail: 0x4a3222 }),
    drops: [['raw_meat', 1, 1, 3], ['hide', 1, 1, 2]], spawn: [{ dim: 0, biomes: ['taiga', 'forest', 'tundra', 'crags'], where: 'surface', time: 'day', weight: 7, group: [1, 3] }] },
  { key: 'dune_skipper', name: 'Dune Skipper', hp: 8, dmg: 0, def: 0, speed: 2.6, xp: 2, coins: [0, 0], hw: 0.3, h: 0.4, ai: 'passive', hostile: false, voice: 1.4,
    parts: quad(0xcfae62, { w: 0.4, h: 0.2, l: 0.8, leg: 0.14, head: 0.24, tail: 0xb89650 }),
    drops: [['hide', 0.7, 1, 1], ['raw_meat', 0.6, 1, 1]], spawn: [{ dim: 0, biomes: ['desert', 'savanna'], where: 'surface', time: 'day', weight: 8, group: [1, 3] }] },
  { key: 'glimmerfin', name: 'Glimmerfin', hp: 4, dmg: 0, def: 0, speed: 1.6, xp: 1, coins: [0, 0], hw: 0.2, h: 0.3, ai: 'fish', hostile: false,
    parts: fish(0x6ab8d8, 0xd0e8f0), drops: [['raw_fish', 1, 1, 1]], spawn: [{ dim: 0, where: 'water', time: 'any', weight: 10, group: [2, 5] }] },

  // overworld hostiles
  { key: 'gloomshade', name: 'Gloomshade', hp: 22, dmg: 9, def: 1, speed: 2.5, xp: 8, coins: [1, 4], hw: 0.3, h: 1.8, ai: 'melee', hostile: true, aggro: 22, voice: 0.5,
    parts: biped(0x2a2440, { h: 1.8, w: 0.5, skin: 0x3a3258, glow: 1, eye: 0xc8a0ff, long: true }),
    drops: [['shade_essence', 0.45, 1, 1], ['bone', 0.4, 1, 2]], spawn: [{ dim: 0, where: 'surface', time: 'night', weight: 12, group: [1, 3] }, { dim: 0, where: 'cave', time: 'any', y: [8, 70], weight: 5, group: [1, 2] }] },
  { key: 'thornling', name: 'Thornling', hp: 16, dmg: 7, def: 0, speed: 2.1, xp: 6, coins: [0, 3], hw: 0.3, h: 1.0, ai: 'melee', hostile: true, aggro: 14, voice: 1.2,
    parts: [...biped(0x5a8a3a, { h: 1.0, w: 0.5, skin: 0x6a9a44, legs: 0x6a4a2a, glow: 0.8, eye: 0xffe06a }), { s: [0.1, 0.3, 0.1], p: [0, 0.875, 0], o: [0, 0.225, 0], c: 0xe2452f, a: 'head' }],
    drops: [['thorn', 0.7, 1, 2], ['fiber', 0.8, 1, 3]], spawn: [{ dim: 0, biomes: ['forest', 'jungle', 'palewood', 'bloomvale', 'swamp'], where: 'surface', time: 'any', weight: 5, group: [1, 2] }] },
  { key: 'gelcap', name: 'Gelcap', hp: 14, dmg: 6, def: 0, speed: 2.4, xp: 5, coins: [0, 3], hw: 0.4, h: 0.7, ai: 'hopper', hostile: true, aggro: 14, voice: 1.5,
    parts: [...blob(0x7ad6a0, 0.8, 0x3f8a5a), { s: [0.9, 0.16, 0.9], p: [0, 0.72, 0], c: 0xd86a5a, a: 'squash' }],
    drops: [['gel', 0.9, 1, 2]], spawn: [{ dim: 0, biomes: ['plains', 'swamp', 'forest', 'bloomvale', 'savanna'], where: 'surface', time: 'any', weight: 6, group: [1, 3] }] },
  { key: 'bog_lurker', name: 'Bog Lurker', hp: 30, dmg: 12, def: 2, speed: 1.9, xp: 12, coins: [2, 6], hw: 0.4, h: 1.5, ai: 'melee', hostile: true, aggro: 16, voice: 0.4,
    parts: biped(0x4a5a34, { h: 1.5, w: 0.7, skin: 0x5a6a3a, glow: 0.9, eye: 0xb8ff6a, long: true }),
    drops: [['bog_pearl', 0.3, 1, 1], ['fiber', 0.8, 1, 3], ['bone', 0.3, 1, 1]], spawn: [{ dim: 0, biomes: ['swamp'], where: 'surface', time: 'any', weight: 8, group: [1, 2] }] },
  { key: 'frost_stalker', name: 'Frost Stalker', hp: 26, dmg: 12, def: 1, speed: 3.2, xp: 12, coins: [2, 6], hw: 0.4, h: 0.9, ai: 'melee', hostile: true, aggro: 24, voice: 0.7,
    parts: quad(0xd8e6f2, { w: 0.55, h: 0.5, l: 1.1, leg: 0.4, head: 0.4, glow: 1, eye: 0x6ad0ff, tail: 0xb8cce0, legC: 0xa8bcd0 }),
    drops: [['frost_fang', 0.4, 1, 1], ['hide', 0.7, 1, 2]], spawn: [{ dim: 0, biomes: ['tundra', 'taiga', 'peaks'], where: 'surface', time: 'night', weight: 10, group: [1, 3] }] },
  { key: 'cinder_wisp', name: 'Cinder Wisp', hp: 14, dmg: 10, def: 0, speed: 2.6, xp: 10, coins: [1, 5], hw: 0.25, h: 0.5, ai: 'flyer', hostile: true, aggro: 20, range: 10, proj: 'ember', rate: 2.4, glow: true, voice: 2,
    parts: wisp(0xff8a2a, 0.3, 0xffe06a), drops: [['ember_dust', 0.7, 1, 2]],
    spawn: [{ dim: 0, biomes: ['desert', 'savanna'], where: 'surface', time: 'night', weight: 8, group: [1, 2] }, { dim: 0, where: 'cave', time: 'any', y: [3, 30], weight: 6, group: [1, 2] }] },
  { key: 'stonegnawer', name: 'Stonegnawer', hp: 28, dmg: 10, def: 4, speed: 1.9, xp: 10, coins: [1, 5], hw: 0.42, h: 0.6, ai: 'melee', hostile: true, aggro: 14, voice: 0.6,
    parts: quad(0x5a5048, { w: 0.75, h: 0.4, l: 0.95, leg: 0.18, head: 0.36, glow: 0.8, eye: 0xff6a3a, back: 0x7a6e62, legC: 0x3a322c }),
    drops: [['chitin', 0.7, 1, 2], ['coal', 0.3, 1, 2]], spawn: [{ dim: 0, where: 'cave', time: 'any', y: [5, 90], weight: 10, group: [1, 2] }] },
  { key: 'cave_skitter', name: 'Cave Skitter', hp: 10, dmg: 6, def: 0, speed: 3.6, xp: 6, coins: [0, 3], hw: 0.3, h: 0.4, ai: 'melee', hostile: true, aggro: 16, voice: 2.2,
    parts: quad(0x2e2a34, { w: 0.5, h: 0.22, l: 0.6, leg: 0.16, head: 0.22, glow: 1, eye: 0xff3a5a }),
    drops: [['fiber', 0.7, 1, 2]], spawn: [{ dim: 0, where: 'cave', time: 'any', y: [5, 100], weight: 8, group: [2, 4] }] },
  { key: 'crag_bat', name: 'Crag Bat', hp: 9, dmg: 6, def: 0, speed: 3.4, xp: 5, coins: [0, 2], hw: 0.25, h: 0.4, ai: 'flyer', hostile: true, aggro: 16, voice: 2.6,
    parts: flyer(0x3a3440, 0.3, 0.45, 0x5a4a5a), drops: [['feather', 0.3, 1, 1], ['hide', 0.3, 1, 1]],
    spawn: [{ dim: 0, where: 'cave', time: 'any', y: [10, 110], weight: 7, group: [1, 3] }, { dim: 0, biomes: ['crags', 'peaks'], where: 'air', time: 'night', weight: 6, group: [1, 3] }] },
  { key: 'rustbound', name: 'Rustbound Sentinel', hp: 40, dmg: 14, def: 5, speed: 1.5, xp: 20, coins: [4, 10], hw: 0.4, h: 1.9, ai: 'ranged', hostile: true, aggro: 20, range: 12, proj: 'rustbolt', rate: 2.2, voice: 0.3,
    parts: biped(0x8a5a3a, { h: 1.9, w: 0.7, skin: 0x6a6e78, legs: 0x4a4e58, glow: 1, eye: 0xff8a3a, hat: 0x4a4e58 }),
    drops: [['rust_core', 0.6, 1, 1], ['iron_bar', 0.5, 1, 2], ['barbed_arrow', 0.4, 2, 6]] },

  // Gloomroot Hollows
  { key: 'sporeling', name: 'Sporeling', hp: 60, dmg: 22, def: 6, speed: 2.8, xp: 30, coins: [4, 10], hw: 0.4, h: 0.8, ai: 'hopper', hostile: true, aggro: 18, voice: 1.3,
    parts: [...blob(0x3f8f86, 0.85, 0x8af0d8, 0x101018, 0.8), { s: [1.0, 0.2, 1.0], p: [0, 0.78, 0], c: 0x6a3f9a, a: 'squash', e: 0.3 }],
    drops: [['spore_sac', 0.6, 1, 2], ['glowshroom', 0.3, 1, 1]], spawn: [{ dim: 1, where: 'cave', time: 'any', weight: 10, group: [1, 3] }] },
  { key: 'mycelid_knight', name: 'Mycelid Knight', hp: 110, dmg: 30, def: 12, speed: 2.2, xp: 50, coins: [8, 18], hw: 0.4, h: 2.0, ai: 'melee', hostile: true, aggro: 20, knockRes: 0.5, voice: 0.4,
    parts: biped(0x4a5a6a, { h: 2.0, w: 0.75, skin: 0xa8b4c8, legs: 0x3f4f5c, glow: 1, eye: 0x4ae6b8, hat: 0x6a3f9a }),
    drops: [['spore_sac', 0.7, 1, 2], ['umbrite_ore', 0.3, 1, 2], ['bone', 0.5, 1, 3]], spawn: [{ dim: 1, where: 'cave', time: 'any', weight: 7, group: [1, 2] }] },
  { key: 'umbral_moth', name: 'Umbral Moth', hp: 45, dmg: 20, def: 3, speed: 3.6, xp: 30, coins: [4, 10], hw: 0.3, h: 0.5, ai: 'flyer', hostile: true, aggro: 20, range: 9, proj: 'mothdust', rate: 2.6, voice: 2.2,
    parts: flyer(0x3a2a5a, 0.34, 0.6, 0x9a5af0, 0xf0e0ff, 1), drops: [['moth_dust', 0.7, 1, 2]], spawn: [{ dim: 1, where: 'cave', time: 'any', weight: 8, group: [1, 3] }] },
  { key: 'glowmaw', name: 'Glowmaw', hp: 80, dmg: 28, def: 8, speed: 3.8, xp: 40, coins: [6, 14], hw: 0.45, h: 1.0, ai: 'melee', hostile: true, aggro: 22, voice: 0.5,
    parts: quad(0x24343c, { w: 0.7, h: 0.6, l: 1.3, leg: 0.4, head: 0.55, glow: 1, eye: 0x3fe6c8, tail: 0x3fe6c8, back: 0x2f8a86 }),
    drops: [['spore_sac', 0.4, 1, 1], ['hide', 0.6, 1, 2], ['noctrium_ore', 0.15, 1, 1]], spawn: [{ dim: 1, where: 'cave', time: 'any', weight: 6, group: [1, 2] }] },

  // The Skyrift
  { key: 'rift_ray', name: 'Rift Ray', hp: 130, dmg: 40, def: 12, speed: 4.2, xp: 80, coins: [10, 24], hw: 0.5, h: 0.5, ai: 'flyer', hostile: true, aggro: 28, voice: 0.9,
    parts: [...flyer(0x4a5ab0, 0.5, 1.1, 0x9ab6ff, 0xffffff, 1), { s: [0.08, 0.08, 0.9], p: [0, 0.3, -0.5], o: [0, 0, -0.45], c: 0x9ab6ff, a: 'tail' }],
    drops: [['rift_scale', 0.8, 1, 2]], spawn: [{ dim: 2, where: 'air', time: 'any', weight: 9, group: [1, 2] }] },
  { key: 'shardling', name: 'Shardling', hp: 200, dmg: 46, def: 22, speed: 2.4, xp: 110, coins: [14, 30], hw: 0.45, h: 1.7, ai: 'melee', hostile: true, aggro: 20, knockRes: 0.6, voice: 1.9,
    parts: biped(0xd8d0f6, { h: 1.7, w: 0.8, skin: 0xf4f0ff, legs: 0xa8a0d6, glow: 1, eye: 0xf6a0f0 }).map((p) => ({ ...p, e: p.e || 0.25 })),
    drops: [['shard', 0.8, 1, 2], ['prismite_ore', 0.12, 1, 1]], spawn: [{ dim: 2, where: 'surface', time: 'any', weight: 8, group: [1, 2] }] },
  { key: 'aether_wisp', name: 'Aether Wisp', hp: 90, dmg: 38, def: 6, speed: 3.4, xp: 70, coins: [10, 22], hw: 0.3, h: 0.6, ai: 'flyer', hostile: true, aggro: 24, range: 12, proj: 'aetherbolt', rate: 2, glow: true, voice: 2.4,
    parts: wisp(0x6fc0f0, 0.36, 0xf4f8ff), drops: [['rift_scale', 0.3, 1, 1], ['mana_crystal', 0.6, 1, 3]], spawn: [{ dim: 2, where: 'air', time: 'any', weight: 8, group: [1, 3] }] },

  // event creatures
  { key: 'ashen_raider', name: 'Ashen Raider', hp: 34, dmg: 13, def: 3, speed: 2.9, xp: 14, coins: [3, 8], hw: 0.3, h: 1.8, ai: 'melee', hostile: true, aggro: 40, voice: 0.7,
    parts: biped(0x5a5a62, { h: 1.8, w: 0.55, skin: 0x8a8a92, legs: 0x3a3a42, glow: 0.8, eye: 0xff6a3a, hat: 0x8a2a22 }), drops: [['ash_token', 0.5, 1, 1], ['iron_bar', 0.2, 1, 1]] },
  { key: 'ashen_hexer', name: 'Ashen Hexer', hp: 26, dmg: 14, def: 1, speed: 2.2, xp: 16, coins: [3, 9], hw: 0.3, h: 1.8, ai: 'ranged', hostile: true, aggro: 40, range: 13, proj: 'hex', rate: 2.4, voice: 1.1,
    parts: biped(0x3a2a4a, { h: 1.8, w: 0.5, skin: 0x8a8a92, glow: 1, eye: 0xd86af6, hat: 0x2a1a3a, cape: 0x2a1a3a }), drops: [['ash_token', 0.6, 1, 2], ['mana_crystal', 0.3, 1, 1]] },
  { key: 'siege_brute', name: 'Siege Brute', hp: 120, dmg: 24, def: 8, speed: 1.9, xp: 45, coins: [10, 22], hw: 0.55, h: 2.5, ai: 'melee', hostile: true, aggro: 40, knockRes: 0.8, voice: 0.3,
    parts: biped(0x4a4a52, { h: 2.5, w: 1.0, skin: 0x7a7a82, legs: 0x2a2a32, glow: 1, eye: 0xff6a3a, long: true }), drops: [['ash_token', 1, 2, 4], ['iron_bar', 0.6, 1, 3]] },
  { key: 'moonspawn', name: 'Moonspawn', hp: 150, dmg: 44, def: 14, speed: 3.6, xp: 90, coins: [12, 26], hw: 0.3, h: 1.9, ai: 'melee', hostile: true, aggro: 40, voice: 0.6,
    parts: biped(0x1e1830, { h: 1.9, w: 0.55, skin: 0x3a2a5a, glow: 1, eye: 0xfff0d0, long: true, cape: 0x120e1e }), drops: [['moon_sliver', 0.5, 1, 1], ['shade_essence', 0.6, 1, 2]],
    spawn: [{ dim: 0, where: 'surface', time: 'night', weight: 14, group: [1, 3], event: 'moon' }] },
  { key: 'lunar_howler', name: 'Lunar Howler', hp: 110, dmg: 40, def: 8, speed: 4.4, xp: 80, coins: [10, 24], hw: 0.35, h: 0.6, ai: 'flyer', hostile: true, aggro: 40, voice: 1.4,
    parts: flyer(0x2a2040, 0.4, 0.8, 0xfff0d0, 0xfff0d0, 1), drops: [['moon_sliver', 0.45, 1, 1]], spawn: [{ dim: 0, where: 'air', time: 'night', weight: 9, group: [1, 2], event: 'moon' }] },

  // boss adds
  { key: 'sproutling', name: 'Sproutling', hp: 18, dmg: 9, def: 0, speed: 2.8, xp: 2, coins: [0, 0], hw: 0.25, h: 0.6, ai: 'melee', hostile: true, aggro: 40, voice: 1.8,
    parts: biped(0x6ae05a, { h: 0.6, w: 0.36, legs: 0x6a4a2a, glow: 1, eye: 0xffe06a }), drops: [] },
  { key: 'dune_mite', name: 'Dune Mite', hp: 30, dmg: 14, def: 2, speed: 3.6, xp: 3, coins: [0, 0], hw: 0.3, h: 0.4, ai: 'melee', hostile: true, aggro: 40, voice: 2,
    parts: quad(0xcfae62, { w: 0.5, h: 0.25, l: 0.7, leg: 0.15, head: 0.25, glow: 1, eye: 0xff6a3a }), drops: [] },
];

// ---- minions --------------------------------------------------------------------------
const minion = (key: string, name: string, parts: Part[], speed: number): MobDef =>
  ({ key, name, hp: 1, dmg: 0, def: 0, speed, xp: 0, coins: [0, 0], hw: 0.25, h: 0.5, ai: 'minion', hostile: false, parts, drops: [], glow: true });
M.push(
  minion('m_thornling', 'Thornling', [...blob(0x5a8a3a, 0.4, 0x6ae05a, 0xffe06a, 1), { s: [0.08, 0.2, 0.08], p: [0, 0.44, 0], c: 0xe2452f, a: 'squash' }], 7),
  minion('m_wisp', 'Lumen Wisp', wisp(0x4fe6e0, 0.2, 0xc0fff8), 8),
  minion('m_brazier', 'Brazier Spirit', wisp(0xff7a2a, 0.24, 0xffe06a), 8.5),
  minion('m_shade', 'Bound Shade', flyer(0x3a2a5a, 0.3, 0.4, 0x9a5af0, 0xc8a0ff, 1), 9),
  minion('m_mycelid', 'Mycelid Sprite', [...blob(0x3f8f86, 0.42, 0x8af0d8, 0x101018, 1), { s: [0.5, 0.12, 0.5], p: [0, 0.4, 0], c: 0x6a3f9a, e: 0.4, a: 'squash' }], 9.5),
  minion('m_zephyr', 'Zephyr', flyer(0xdfeeff, 0.3, 0.5, 0x9ab6ff, 0xffffff, 1), 11),
  minion('m_shardling', 'Shard Mote', wisp(0xf6a0f0, 0.24, 0xf4f0ff), 11),
  minion('m_moon', 'Moonbound Fawn', quad(0x2a2040, { w: 0.3, h: 0.26, l: 0.5, leg: 0.24, head: 0.24, glow: 1, eye: 0xfff0d0, horn: 0xfff0d0 }), 12),
  minion('m_cairn', 'Cairnlight', wisp(0xffd27a, 0.28, 0xffffff), 13),
);

// ---- townsfolk ---------------------------------------------------------------------------
const npc = (key: string, name: string, shirt: number, hat: number, skin = 0xe0b088): MobDef =>
  ({ key, name, hp: 250, dmg: 0, def: 10, speed: 1.3, xp: 0, coins: [0, 0], hw: 0.3, h: 1.8, ai: 'npc', hostile: false, parts: biped(shirt, { h: 1.8, w: 0.5, skin, legs: 0x4a4038, hat }), drops: [], voice: 1 });
M.push(npc('n_wayfinder', 'Wayfinder', 0x3a7a5a, 0x8a5f34), npc('n_provisioner', 'Provisioner', 0xb86a3a, 0xe6d6a8), npc('n_smith', 'Smith', 0x5a5a62, 0x2a2a32, 0xc89870),
  npc('n_apothecary', 'Apothecary', 0x7a4a8a, 0x4a9a3c), npc('n_tinker', 'Tinker', 0xb8943a, 0x4a4e5a, 0xd0a078), npc('n_runescribe', 'Runescribe', 0x3a4a9a, 0x6a4ab8),
  npc('n_beastcaller', 'Beastcaller', 0x2f8a7a, 0xece6d2, 0xb88860), npc('n_deserter', 'Ashen Deserter', 0x5a5a62, 0x8a2a22, 0xa8a8b0));

// ---- bosses --------------------------------------------------------------------------------
type PartX = Omit<Partial<Part>, 's' | 'p' | 'c'>;
/** Shorthand for one box: size, joint, colour, then any other Part fields. */
const B = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, c: number, x?: PartX): Part => ({ s: [sx, sy, sz], p: [px, py, pz], c, ...x });
/** The boxes followed by their mirror image across x = 0 (a left limb and its right twin). Mirrored joints get a "'" on their
 *  name, tags ending in A / B swap, and `ap` is added to the twin's animation phase. */
function sym(ps: Part[], ap = 0): Part[] {
  const names = new Set(ps.map((q) => q.n));
  const flip = (q: Part): Part => ({ ...q, p: [-q.p[0], q.p[1], q.p[2]], o: q.o && [-q.o[0], q.o[1], q.o[2]], r: q.r && [q.r[0], -q.r[1], -q.r[2]],
    a: q.a && (/A\d?$/.test(q.a) ? q.a.replace(/A(\d?)$/, 'B$1') : q.a.replace(/B(\d?)$/, 'A$1')), n: q.n && q.n + "'", par: q.par && (names.has(q.par) ? q.par + "'" : q.par), ap: (q.ap ?? 0) + ap || undefined });
  return [...ps, ...ps.map(flip)];
}

// Mossback Colossus: a hunched hill of masonry on short legs, long arms ending in boulder fists, a moss mantle with a tree
// growing from one shoulder, and a green heart caged by roots in its chest. Roots burst from its back in the second phase.
const ST1 = 0x85837a, ST2 = 0x6c6b62, ST3 = 0x53524a, MOSS = 0x47852f, MOSS2 = 0x346326, MOSS3 = 0x64a83e, WOOD = 0x6a4a2a, WOOD2 = 0x4e3620;
const colossus: Part[] = [
  B(3.4, 1.9, 2.2, 0, 2.4, 0, ST1, { o: [0, 1.7, 0.1], r: [0.15, 0, 0], t: 3, a: 'body', n: 'torso' }),
  B(2.3, 1.0, 1.6, 0, 0, 0, ST2, { o: [0, 0.45, 0], par: 'torso' }),
  B(2.7, 0.9, 1.8, 0, 2.0, 0, ST3), B(2.9, 0.3, 2.0, 0, 2.42, 0, WOOD, { t: 7 }),
  // legs: thigh, then shin and foot riding the knee
  ...sym([
    B(1.15, 1.2, 1.25, -0.95, 1.9, 0, ST2, { o: [0, -0.5, 0], a: 'legA', n: 'hip' }),
    B(1.3, 0.9, 1.4, 0, -0.95, 0, ST1, { o: [0, -0.35, 0.05], t: 3, a: 'shinA', par: 'hip', n: 'knee' }),
    B(1.55, 0.42, 2.0, 0, 0, 0, ST3, { o: [0, -0.74, 0.3], par: 'knee' }),
    B(1.2, 0.2, 0.7, 0, 0, 0, MOSS, { o: [0, -0.45, 0.85], t: 2, par: 'knee' }),
  ]),
  // caged heart
  B(1.3, 1.2, 0.16, 0, 0, 0, 0x1a2014, { o: [0, 1.65, 1.2], par: 'torso' }),
  B(0.62, 0.52, 0.34, 0, 1.65, 1.3, 0x7dff5a, { e: 1, a: 'pulse', par: 'torso' }),
  B(1.5, 0.16, 0.2, 0, 0, 0, WOOD, { o: [0, 2.02, 1.38], t: 7, par: 'torso' }), B(1.5, 0.16, 0.2, 0, 0, 0, WOOD, { o: [0, 1.28, 1.34], t: 7, par: 'torso' }),
  B(0.13, 0.9, 0.13, 0, 0, 0, WOOD2, { o: [-0.24, 1.65, 1.5], r: [0, 0, 0.12], par: 'torso' }), B(0.13, 0.9, 0.13, 0, 0, 0, WOOD2, { o: [0.2, 1.65, 1.5], r: [0, 0, -0.1], par: 'torso' }),
  // moss mantle, drape and hanging strands
  B(4.0, 0.5, 2.6, 0, 0, 0, MOSS, { o: [0, 2.85, -0.05], t: 2, par: 'torso' }), B(3.0, 0.4, 2.0, 0, 0, 0, MOSS3, { o: [0, 3.25, -0.25], t: 2, par: 'torso' }),
  B(3.0, 1.7, 0.22, 0, 0, 0, MOSS2, { o: [0, 1.85, -1.08], t: 7, par: 'torso' }),
  B(0.34, 0.8, 0.14, 0, 2.6, 1.28, MOSS2, { o: [-1.35, -0.4, 0], t: 7, a: 'sway', k: 0.4, par: 'torso' }), B(0.3, 0.55, 0.14, 0, 2.6, 1.28, MOSS, { o: [1.2, -0.28, 0], t: 7, a: 'sway', k: 0.4, ap: 2, par: 'torso' }),
  // shoulders: the right one is the bigger, and carries the tree
  B(1.7, 1.5, 1.8, 0, 0, 0, ST2, { o: [-2.4, 2.5, 0], t: 3, par: 'torso' }), B(1.95, 1.75, 2.05, 0, 0, 0, ST2, { o: [2.5, 2.6, 0], t: 3, par: 'torso' }),
  B(1.5, 0.3, 1.6, 0, 0, 0, MOSS, { o: [-2.4, 3.35, 0], t: 2, par: 'torso' }), B(1.7, 0.3, 1.8, 0, 0, 0, MOSS3, { o: [2.5, 3.6, 0], t: 2, par: 'torso' }),
  // arms: upper arm, then forearm and fist riding the elbow
  ...sym([
    B(1.0, 1.5, 1.0, -2.45, 2.3, 0, ST2, { o: [0, -0.8, 0], a: 'armA', par: 'torso', n: 'arm' }),
    B(1.35, 1.5, 1.35, 0, -1.55, 0, ST1, { o: [0, -0.7, 0], t: 3, a: 'foreA', par: 'arm', n: 'fore' }),
    B(1.45, 0.24, 1.45, 0, 0, 0, WOOD, { o: [0, -0.15, 0], t: 7, par: 'fore' }),
    B(1.65, 1.3, 1.65, 0, 0, 0, ST3, { o: [0, -1.95, 0], t: 6, par: 'fore' }),
    B(1.2, 0.2, 1.3, 0, 0, 0, MOSS, { o: [0, -1.22, 0.1], t: 2, par: 'fore' }),
  ]),
  // head, sunk between the shoulders, with a hanging jaw
  B(1.3, 1.1, 1.3, 0, 2.85, 0.8, ST1, { a: 'head', par: 'torso', n: 'head' }),
  B(1.5, 0.3, 0.6, 0, 0, 0, ST3, { o: [0, 0.3, 0.45], par: 'head' }), B(1.4, 0.26, 1.3, 0, 0, 0, MOSS3, { o: [0, 0.66, -0.05], t: 2, par: 'head' }),
  B(0.32, 0.18, 0.08, 0, 0, 0, 0xc4ff8a, { o: [-0.33, 0.07, 0.66], e: 1, par: 'head' }), B(0.32, 0.18, 0.08, 0, 0, 0, 0xc4ff8a, { o: [0.33, 0.07, 0.66], e: 1, par: 'head' }),
  B(1.1, 0.36, 1.1, 0, -0.45, 0.05, ST3, { o: [0, -0.12, 0.2], a: 'jawB', k: 0.6, par: 'head', n: 'jaw' }),
  B(0.2, 0.3, 0.2, 0, 0, 0, 0xd8d2bc, { o: [-0.36, 0.16, 0.62], par: 'jaw' }), B(0.2, 0.3, 0.2, 0, 0, 0, 0xd8d2bc, { o: [0.36, 0.16, 0.62], par: 'jaw' }),
  // back: a tree on the right shoulder, a broken stump and a leaning menhir
  B(0.42, 1.7, 0.42, 1.4, 3.3, -0.7, WOOD, { o: [0, 0.8, 0], r: [0, 0, -0.12], t: 7, a: 'sway', k: 0.25, par: 'torso', n: 'tree' }),
  B(1.9, 0.8, 1.9, 0, 0, 0, MOSS2, { o: [0.2, 1.85, 0], t: 2, par: 'tree' }), B(1.4, 0.7, 1.5, 0, 0, 0, MOSS, { o: [0.05, 2.5, 0.1], r: [0, 0.5, 0], t: 2, par: 'tree' }),
  B(0.8, 0.5, 0.8, 0, 0, 0, MOSS3, { o: [0.3, 3.0, -0.05], t: 2, par: 'tree' }), B(0.9, 0.5, 0.9, 0, 0, 0, MOSS, { o: [1.0, 1.6, 0.5], r: [0, 0.3, 0.2], t: 2, par: 'tree' }),
  B(0.3, 0.14, 0.9, 0, 0, 0, WOOD2, { o: [0.15, 1.2, 0.5], r: [0.5, 0, 0], par: 'tree' }),
  B(0.46, 0.8, 0.46, 0, 0, 0, WOOD2, { o: [-1.25, 3.7, -0.6], t: 7, par: 'torso' }),
  B(0.55, 1.3, 0.5, 0, 0, 0, ST3, { o: [-0.3, 3.7, -0.95], r: [-0.35, 0, 0.2], t: 3, par: 'torso' }),
  // second phase: roots tear out of the back and coil round the arms
  B(0.26, 1.9, 0.26, -1.3, 3.0, -0.9, WOOD, { o: [0, 0.95, 0], r: [-0.5, 0, 0.45], t: 7, a: 'sway', ph: [1, 1], par: 'torso' }),
  B(0.26, 2.2, 0.26, 0.3, 3.0, -1.1, WOOD, { o: [0, 1.1, 0], r: [-0.8, 0, -0.1], t: 7, a: 'sway', ap: 1.7, ph: [1, 1], par: 'torso' }),
  B(0.22, 1.5, 0.22, -2.6, 3.2, -0.3, WOOD2, { o: [0, 0.75, 0], r: [-0.2, 0, 0.7], t: 7, a: 'sway', ap: 3.1, ph: [1, 1], par: 'torso' }),
  B(0.2, 0.2, 0.2, 0, 0, 0, 0x7dff5a, { o: [-0.55, 2.2, 1.3], e: 1, ph: [1, 1], par: 'torso' }), B(0.2, 0.2, 0.2, 0, 0, 0, 0x7dff5a, { o: [0.6, 1.2, 1.26], e: 1, ph: [1, 1], par: 'torso' }),
];
// Dune Maw: an armoured worm. Four jaws (upper, lower and two side mandibles) open like a flower round a glowing gullet;
// ember eyes run down both flanks, and every body segment carries a plate, a spine, two fins and a glowing belly.
const SAND1 = 0xd8ba70, SAND2 = 0xb89650, SHELL = 0x8a6a34, SHELL2 = 0x5e4420, BONE = 0xf2ecd0, EMBER = 0xff8a2a, GULLET = 0xff5a2a;
const maw: Part[] = [
  B(2.2, 2.0, 1.9, 0, 1.1, -0.35, SAND1, { t: 5 }), B(2.6, 2.4, 0.5, 0, 1.1, -1.15, SHELL, { t: 6 }), B(1.9, 1.7, 0.5, 0, 1.1, -1.6, SAND2),
  B(2.4, 0.36, 1.7, 0, 2.2, -0.35, SHELL, { t: 1 }), B(1.6, 0.3, 1.2, 0, 2.48, -0.55, SHELL2, { t: 1, ph: [0, 0] }),
  B(0.3, 1.0, 0.5, 0, 2.75, -0.8, SHELL2, { r: [-0.5, 0, 0] }), B(0.24, 0.7, 0.4, 0, 2.6, -0.1, SHELL2, { r: [-0.35, 0, 0] }),
  // the second phase sheds the crest and shows the hot spine under it
  B(0.5, 0.2, 1.3, 0, 2.42, -0.5, GULLET, { e: 0.9, ph: [1, 1] }), B(2.3, 0.12, 0.2, 0, 2.4, 0.1, GULLET, { e: 0.8, ph: [1, 1] }),
  B(1.6, 1.4, 0.14, 0, 1.1, 0.62, GULLET, { e: 0.9 }), B(0.8, 0.7, 0.16, 0, 1.1, 0.66, 0xffd27a, { e: 1, a: 'pulse' }),
  // upper and lower jaw with their teeth
  B(2.0, 0.6, 1.8, 0, 1.8, 0.4, SAND1, { o: [0, 0, 0.85], t: 5, a: 'jawA', n: 'up' }), B(1.3, 0.42, 0.6, 0, 0, 0, SHELL, { o: [0, 0.02, 1.85], par: 'up' }),
  B(2.1, 0.22, 1.2, 0, 0, 0, SHELL, { o: [0, 0.36, 0.7], t: 1, par: 'up' }),
  ...[-0.78, -0.27, 0.27, 0.78].map((x) => B(0.2, 0.5, 0.2, 0, 0, 0, BONE, { o: [x, -0.5, 1.6 - Math.abs(x) * 0.25], par: 'up' })),
  B(0.18, 0.36, 0.18, 0, 0, 0, BONE, { o: [-0.88, -0.44, 0.85], par: 'up' }), B(0.18, 0.36, 0.18, 0, 0, 0, BONE, { o: [0.88, -0.44, 0.85], par: 'up' }),
  B(1.9, 0.55, 1.7, 0, 0.42, 0.4, SAND2, { o: [0, 0, 0.8], a: 'jawB', n: 'low' }), B(1.0, 0.3, 0.5, 0, 0, 0, SHELL2, { o: [0, -0.2, 1.6], par: 'low' }),
  ...[-0.55, 0, 0.55].map((x) => B(0.2, 0.44, 0.2, 0, 0, 0, BONE, { o: [x, 0.46, 1.45 - Math.abs(x) * 0.3], par: 'low' })),
  B(0.18, 0.32, 0.18, 0, 0, 0, BONE, { o: [-0.82, 0.4, 0.7], par: 'low' }), B(0.18, 0.32, 0.18, 0, 0, 0, BONE, { o: [0.82, 0.4, 0.7], par: 'low' }),
  ...sym([
    // side mandible with a hooked tip
    B(0.36, 0.8, 1.5, -1.12, 1.1, 0.3, SHELL, { o: [0, 0, 0.7], t: 1, a: 'mandA', n: 'mand' }), B(0.3, 0.4, 0.6, 0, 0, 0, BONE, { o: [0.22, 0, 1.55], r: [0, 0.6, 0], par: 'mand' }),
    // ember eyes and a swept horn
    B(0.08, 0.34, 0.34, -1.12, 1.62, -0.05, EMBER, { e: 1 }), B(0.08, 0.2, 0.2, -1.12, 1.3, -0.5, EMBER, { e: 1 }), B(0.08, 0.16, 0.16, -1.12, 1.75, -0.6, EMBER, { e: 1 }),
    B(0.3, 0.3, 1.3, -1.2, 2.0, -0.9, BONE, { r: [0.25, 0.3, 0] }),
  ]),
];
const mawSeg: Part[] = [
  B(1.9, 1.8, 1.3, 0, 0, 0, SAND1, { t: 5 }), B(1.55, 1.45, 0.6, 0, 0, -0.75, SAND2),
  B(2.05, 0.36, 1.05, 0, 0.86, 0, SHELL, { t: 1 }), B(0.22, 0.7, 0.4, 0, 1.2, -0.15, SHELL2, { r: [-0.5, 0, 0] }),
  B(1.15, 0.14, 0.95, 0, -0.9, 0, EMBER, { e: 0.6 }),
  ...sym([B(0.6, 0.14, 0.7, -0.95, -0.25, 0, SHELL, { o: [-0.3, 0, 0], r: [0, 0, 0.35], a: 'sway', k: 1.4 })]),
];
// The Pale Warden: a hooded keeper whose robe is a bell. The tiers swing from one hinge with a glowing clapper under them, the
// hands float free of the sleeves, a square seal wheels behind the head (and breaks in the last phase) and lanterns circle it.
const ROBE1 = 0xaab4c8, ROBE2 = 0x7e8aa6, ROBE3 = 0x5a6584, ROBE4 = 0x333a50, PALE = 0xe9e2cf, WGLOW = 0x6ab8f6, GOLD = 0xd8b44a;
const warden: Part[] = [
  B(1.45, 1.0, 1.0, 0, 3.8, 0, ROBE1, { t: 7 }),
  // bell robe and clapper
  B(1.55, 0.8, 1.25, 0, 3.3, 0, ROBE2, { o: [0, -0.4, 0], t: 7, a: 'robe', n: 'bell' }),
  B(2.0, 0.7, 1.7, 0, 0, 0, ROBE1, { o: [0, -1.1, 0], t: 7, par: 'bell' }), B(2.5, 0.6, 2.2, 0, 0, 0, ROBE3, { o: [0, -1.7, 0], t: 7, par: 'bell' }),
  B(3.0, 0.36, 2.7, 0, 0, 0, ROBE4, { o: [0, -2.15, 0], t: 6, par: 'bell' }), B(3.06, 0.1, 2.76, 0, 0, 0, WGLOW, { o: [0, -2.36, 0], e: 0.7, par: 'bell' }),
  B(2.56, 0.12, 2.26, 0, 0, 0, GOLD, { o: [0, -1.4, 0], par: 'bell' }),
  B(0.16, 1.9, 0.16, 0, -0.8, 0, ROBE4, { o: [0, -0.95, 0], a: 'clap', par: 'bell', n: 'clap' }), B(0.52, 0.52, 0.52, 0, 0, 0, WGLOW, { o: [0, -2.08, 0], e: 1, par: 'clap' }),
  // mantle, chest sigil and a ring of keys at the hip
  B(2.5, 0.45, 1.4, 0, 4.35, 0, PALE, { t: 6 }), B(1.7, 0.3, 1.1, 0, 4.7, -0.05, ROBE3),
  B(0.36, 0.5, 0.08, 0, 3.85, 0.52, WGLOW, { e: 1, a: 'pulse' }), B(0.7, 0.1, 0.08, 0, 3.85, 0.52, GOLD),
  B(0.5, 0.5, 0.08, 0.6, 3.3, 0.68, GOLD, { o: [0, -0.3, 0], a: 'sway', k: 0.6, n: 'keys' }), B(0.1, 0.6, 0.08, 0, 0, 0, GOLD, { o: [-0.12, -0.8, 0], par: 'keys' }), B(0.1, 0.45, 0.08, 0, 0, 0, GOLD, { o: [0.14, -0.72, 0], par: 'keys' }),
  // hooded mask
  B(0.9, 1.15, 0.8, 0, 5.0, 0.15, PALE, { a: 'head', n: 'head' }),
  B(1.2, 1.35, 0.95, 0, 0, 0, ROBE4, { o: [0, 0.14, -0.32], t: 7, par: 'head' }), B(0.66, 0.66, 0.66, 0, 0, 0, ROBE4, { o: [0, 0.95, -0.55], r: [-0.4, 0, 0], par: 'head' }),
  B(1.0, 0.16, 0.5, 0, 0, 0, ROBE3, { o: [0, 0.66, 0.02], par: 'head' }),
  B(0.15, 0.4, 0.06, 0, 0, 0, WGLOW, { o: [-0.22, 0.12, 0.41], e: 1, par: 'head' }), B(0.15, 0.4, 0.06, 0, 0, 0, WGLOW, { o: [0.22, 0.12, 0.41], e: 1, par: 'head' }),
  B(0.44, 0.06, 0.06, 0, 0, 0, ROBE4, { o: [0, -0.32, 0.41], par: 'head' }), B(0.5, 0.3, 0.5, 0, 0, 0, PALE, { o: [0, -0.68, 0.08], par: 'head' }),
  // arms: sleeve, then a flared cuff and a free-floating hand riding the elbow
  ...sym([
    B(0.56, 1.3, 0.62, -1.42, 4.3, 0, ROBE1, { o: [0, -0.65, 0], t: 7, a: 'armA', n: 'arm' }),
    B(0.78, 0.9, 0.84, 0, -1.3, 0, ROBE2, { o: [0, -0.4, 0], t: 7, a: 'foreA', par: 'arm', n: 'fore' }),
    B(0.84, 0.12, 0.9, 0, 0, 0, WGLOW, { o: [0, -0.8, 0], e: 0.6, par: 'fore' }),
    B(0.36, 0.48, 0.36, 0, -1.1, 0, PALE, { e: 0.25, a: 'drift', k: 0.35, par: 'fore', n: 'hand' }), B(0.12, 0.26, 0.12, 0, 0, 0, PALE, { o: [0.22, -0.02, 0.06], e: 0.25, par: 'hand' }),
  ], 1.3),
  // the seal: an outer square that turns and an inner one that turns against it; two bars are gone in the last phase
  B(3.9, 0.18, 0.16, 0, 4.5, -0.95, WGLOW, { o: [0, 1.86, 0], e: 0.9, a: 'seal', n: 'seal' }),
  B(3.9, 0.18, 0.16, 0, 0, 0, WGLOW, { o: [0, -1.86, 0], e: 0.9, ph: [0, 1], par: 'seal' }),
  B(0.18, 3.9, 0.16, 0, 0, 0, WGLOW, { o: [-1.86, 0, 0], e: 0.9, par: 'seal' }), B(0.18, 3.9, 0.16, 0, 0, 0, WGLOW, { o: [1.86, 0, 0], e: 0.9, ph: [0, 1], par: 'seal' }),
  B(0.4, 0.4, 0.2, 0, 0, 0, GOLD, { o: [-1.86, 1.86, 0], par: 'seal' }), B(0.4, 0.4, 0.2, 0, 0, 0, GOLD, { o: [1.86, -1.86, 0], ph: [0, 1], par: 'seal' }),
  B(0.4, 0.4, 0.2, 0, 0, 0, GOLD, { o: [1.86, 1.86, 0], par: 'seal' }), B(0.4, 0.4, 0.2, 0, 0, 0, GOLD, { o: [-1.86, -1.86, 0], par: 'seal' }),
  B(2.5, 0.12, 0.12, 0, 4.5, -0.85, 0xd0e6ff, { o: [0, 1.2, 0], e: 0.8, a: 'seal', k: -1.6, n: 'seal2' }), B(2.5, 0.12, 0.12, 0, 0, 0, 0xd0e6ff, { o: [0, -1.2, 0], e: 0.8, par: 'seal2' }),
  B(0.12, 2.5, 0.12, 0, 0, 0, 0xd0e6ff, { o: [-1.2, 0, 0], e: 0.8, par: 'seal2' }), B(0.12, 2.5, 0.12, 0, 0, 0, 0xd0e6ff, { o: [1.2, 0, 0], e: 0.8, par: 'seal2' }),
  // last phase: cracks of light across the mask, the mantle and the bell
  B(0.08, 0.75, 0.07, 0, 0, 0, WGLOW, { o: [0.1, 0.12, 0.41], r: [0, 0, 0.3], e: 1, ph: [2, 2], par: 'head' }),
  B(0.1, 0.9, 0.07, 0.35, 3.85, 0.5, WGLOW, { r: [0, 0, -0.4], e: 1, ph: [2, 2] }),
  B(0.1, 1.2, 0.08, 0, 0, 0, WGLOW, { o: [-0.5, -1.5, 1.08], r: [0, 0, 0.5], e: 1, ph: [2, 2], par: 'bell' }), B(0.1, 0.8, 0.08, 0, 0, 0, WGLOW, { o: [0.7, -1.9, 1.24], r: [0, 0, -0.6], e: 1, ph: [2, 2], par: 'bell' }),
  // three lanterns circling
  ...[0, 1, 2].flatMap((i): Part[] => [
    B(0.34, 0.46, 0.34, 0, 3.4, 0, WGLOW, { o: [2.5, i * 0.5 - 0.5, 0], e: 1, a: 'halo', ap: i * 2.094 }),
    B(0.44, 0.12, 0.44, 0, 3.4, 0, ROBE4, { o: [2.5, i * 0.5 - 0.21, 0], a: 'halo', ap: i * 2.094 }), B(0.44, 0.1, 0.44, 0, 3.4, 0, ROBE4, { o: [2.5, i * 0.5 - 0.78, 0], a: 'halo', ap: i * 2.094 }),
  ]),
];
// Sporemother: a mushroom the size of a house. A stepped, spotted cap over glowing gills, a veil of tendrils round the rim, a
// stalk with a cluster of eyes and a slit mouth, two tentacle arms that cast, brood sacs on her back and roots trailing under
// her until the last phase tears them off. The cap splits and glows from the second phase.
const SP_TEAL = 0x3f8f86, SP_TEAL2 = 0x2c6a66, SP_PALE = 0xb9c4d4, SP_CAP1 = 0x6a3f9a, SP_CAP2 = 0x7d4eae, SP_CAP3 = 0x9060c2, SP_RIM = 0x4c2c74, SP_GLOW = 0x8af0d8, SP_SPOT = 0xe0b4ff;
const ring = <T>(n: number, f: (cos: number, sin: number, i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(Math.cos((i / n) * 6.2832), Math.sin((i / n) * 6.2832), i));
const sporemother: Part[] = [
  B(2.7, 1.9, 2.7, 0, 2.2, 0, SP_TEAL, { t: 2 }), B(2.0, 1.1, 2.0, 0, 0.95, 0, SP_PALE, { t: 2 }), B(1.4, 0.4, 1.4, 0, 0.3, 0, 0x8d98aa),
  B(2.0, 1.4, 0.14, 0, 2.05, 1.36, 0x74c9b4), B(3.2, 0.26, 3.2, 0, 3.05, 0, 0xdcd3ea),
  // cap: gills, a dark rim and three tiers, all riding one slow bob
  B(4.7, 0.3, 4.7, 0, 3.4, 0, SP_GLOW, { e: 0.7, t: 1, a: 'bob', k: 0.5, n: 'cap' }),
  B(5.9, 0.3, 5.9, 0, 0, 0, SP_RIM, { o: [0, 0.3, 0], par: 'cap' }), B(5.6, 0.6, 5.6, 0, 0, 0, SP_CAP1, { o: [0, 0.7, 0], t: 2, par: 'cap' }),
  B(4.5, 0.65, 4.5, 0, 0, 0, SP_CAP2, { o: [0, 1.3, 0], t: 2, par: 'cap' }), B(3.1, 0.6, 3.1, 0, 0, 0, SP_CAP3, { o: [0, 1.9, 0], t: 2, par: 'cap' }),
  B(1.5, 0.36, 1.5, 0, 0, 0, SP_CAP3, { o: [0, 2.36, 0], par: 'cap' }),
  // glowing spots on every ledge and on the rim
  ...([[2.45, 1.0], [-2.5, -0.6], [0.8, 2.5], [-1.2, -2.45], [2.35, -1.8], [-2.3, 1.9]] as const).map(([x, z], i) => B(0.7 - (i % 2) * 0.2, 0.1, 0.7 - (i % 2) * 0.2, 0, 0, 0, SP_SPOT, { o: [x, 1.02, z], e: 0.8, par: 'cap' })),
  ...([[1.85, -0.4], [-0.3, 1.85], [-1.85, 0.6], [0.5, -1.9]] as const).map(([x, z]) => B(0.5, 0.1, 0.5, 0, 0, 0, SP_SPOT, { o: [x, 1.64, z], e: 0.8, par: 'cap' })),
  B(0.45, 0.1, 0.45, 0, 0, 0, SP_SPOT, { o: [1.1, 2.22, 0.6], e: 0.8, par: 'cap' }), B(0.45, 0.1, 0.45, 0, 0, 0, SP_SPOT, { o: [-1.1, 2.22, -0.5], e: 0.8, par: 'cap' }),
  B(0.7, 0.36, 0.1, 0, 0, 0, SP_SPOT, { o: [1.3, 0.7, 2.81], e: 0.8, par: 'cap' }), B(0.5, 0.3, 0.1, 0, 0, 0, SP_SPOT, { o: [-1.7, 0.72, 2.81], e: 0.8, par: 'cap' }),
  B(0.1, 0.36, 0.7, 0, 0, 0, SP_SPOT, { o: [2.81, 0.7, -0.6], e: 0.8, par: 'cap' }), B(0.1, 0.3, 0.6, 0, 0, 0, SP_SPOT, { o: [-2.81, 0.72, 0.9], e: 0.8, par: 'cap' }),
  B(0.6, 0.34, 0.1, 0, 0, 0, SP_SPOT, { o: [0.4, 0.7, -2.81], e: 0.8, par: 'cap' }),
  // the veil: eight tendrils with glowing tips
  ...ring(8, (c, sn, i) => [B(0.2, 1.2, 0.2, c * 2.6, 0.2, sn * 2.6, 0x9a6ad0, { o: [0, -0.6, 0], a: 'sway', ap: i * 1.1, par: 'cap', n: 'veil' + i }), B(0.28, 0.28, 0.28, 0, 0, 0, SP_GLOW, { o: [0, -1.3, 0], e: 0.9, par: 'veil' + i })]).flat(),
  // face: one great eye, four lesser ones and a slit mouth
  B(0.8, 0.66, 0.1, 0, 2.55, 1.44, SP_GLOW, { e: 1 }), B(0.2, 0.5, 0.1, 0, 2.55, 1.5, 0x10202a),
  ...sym([B(0.34, 0.3, 0.1, -0.8, 2.85, 1.44, SP_GLOW, { e: 1 }), B(0.26, 0.24, 0.1, -0.62, 2.05, 1.44, SP_GLOW, { e: 1 })]),
  B(0.4, 0.8, 0.1, 0, 1.75, 1.44, 0x1a1024), B(0.16, 0.5, 0.1, 0, 1.75, 1.48, 0xd86af6, { e: 0.8, a: 'pulse' }),
  // tentacle arms ending in spore bulbs
  ...sym([
    B(0.5, 1.3, 0.5, -1.55, 2.95, 0.2, SP_TEAL2, { o: [0, -0.65, 0], a: 'armA', n: 'arm' }),
    B(0.4, 1.2, 0.4, 0, -1.3, 0, SP_TEAL, { o: [0, -0.6, 0], a: 'foreA', par: 'arm', n: 'fore' }), B(0.62, 0.62, 0.62, 0, 0, 0, SP_GLOW, { o: [0, -1.4, 0], e: 0.8, par: 'fore' }),
  ], 2),
  // brood sacs
  B(1.0, 1.0, 1.0, -1.3, 1.9, -1.1, SP_GLOW, { e: 0.5, a: 'pulse' }), B(0.8, 0.8, 0.8, 1.35, 1.6, -0.9, SP_GLOW, { e: 0.5, a: 'pulse', ap: 1.3 }), B(0.7, 0.7, 0.7, 0.1, 1.5, -1.5, SP_GLOW, { e: 0.5, a: 'pulse', ap: 2.5 }),
  // roots, whole until the last phase and torn stubs with raw glowing ends after it
  ...ring(4, (c, sn, i) => [
    B(0.42, 1.2, 0.42, c * 0.75 - sn * 0.3, 0.6, sn * 0.75 + c * 0.3, 0x6b7a8a, { o: [0, -0.6, 0], t: 7, a: 'sway', ap: i * 1.9, ph: [0, 1], n: 'root' + i }),
    B(0.26, 1.2, 0.26, 0, -1.15, 0, 0x566373, { o: [0, -0.6, 0], t: 7, a: 'sway', ap: i * 1.9 + 1, ph: [0, 1], par: 'root' + i }),
    B(0.42, 0.6, 0.42, c * 0.75 - sn * 0.3, 0.6, sn * 0.75 + c * 0.3, 0x6b7a8a, { o: [0, -0.3, 0], t: 7, ph: [2, 2] }), B(0.3, 0.16, 0.3, c * 0.75 - sn * 0.3, 0.6, sn * 0.75 + c * 0.3, SP_GLOW, { o: [0, -0.66, 0], e: 1, ph: [2, 2] }),
  ]).flat(),
  // from the second phase the cap splits
  B(2.4, 0.1, 0.4, 0, 0, 0, 0xf0c0ff, { o: [0, 2.56, 0], e: 1, ph: [1, 2], par: 'cap' }), B(0.4, 0.1, 2.4, 0, 0, 0, 0xf0c0ff, { o: [0, 2.56, 0], e: 1, ph: [1, 2], par: 'cap' }),
  B(5.94, 0.12, 5.94, 0, 0, 0, 0xf0c0ff, { o: [0, 0.42, 0], e: 0.9, ph: [1, 2], par: 'cap' }),
  // drifting spores
  ...ring(5, (c, sn, i) => B(0.4, 0.4, 0.4, 0, 2.3, 0, i % 2 ? 0xd8a0ff : SP_GLOW, { o: [3.7, Math.sin(i * 2.1) * 0.7, 0], r: [0.6, 0.6, 0], e: 0.9, a: 'halo', ap: i * 1.2566 })),
];
const regent: Part[] = [
  { s: [1.4, 1.2, 2.4], p: [0, 1.2, 0], c: 0x4a5a8a }, { s: [0.9, 0.9, 1.0], p: [0, 1.9, 1.4], c: 0xdfe6f2, a: 'head' }, { s: [0.3, 0.3, 0.7], p: [0, 1.75, 2.1], c: 0xf2c14e, a: 'head' },
  { s: [0.2, 0.2, 0.06], p: [-0.3, 2.05, 1.92], c: 0xfff0a0, e: 1, a: 'head' }, { s: [0.2, 0.2, 0.06], p: [0.3, 2.05, 1.92], c: 0xfff0a0, e: 1, a: 'head' },
  { s: [3.6, 0.14, 1.8], p: [-0.7, 1.6, 0], o: [-1.8, 0, 0], c: 0x9ab6ff, a: 'wingA' }, { s: [3.6, 0.14, 1.8], p: [0.7, 1.6, 0], o: [1.8, 0, 0], c: 0x9ab6ff, a: 'wingB' },
  { s: [1.0, 0.1, 1.6], p: [0, 1.3, -1.2], o: [0, 0, -0.8], c: 0x6a7ab8, a: 'tail' }, { s: [0.4, 0.5, 0.4], p: [0, 2.5, 1.3], c: 0xf2c14e, e: 0.8, a: 'head' },
];
const luminarch: Part[] = [
  { s: [1.2, 1.2, 1.2], p: [0, 2.2, 0], c: 0xf4f0ff, e: 0.9, a: 'bob' }, { s: [0.6, 0.6, 0.6], p: [0, 2.2, 0], c: 0xffffff, e: 1, a: 'bob' },
  ...[0, 1, 2, 3, 4, 5].map((i): Part => ({ s: [0.3, 1.6, 0.3], p: [0, 2.2, 0], o: [Math.cos(i * 1.047) * 2.0, Math.sin(i * 2.1) * 0.4, Math.sin(i * 1.047) * 2.0], c: [0xf6a0f0, 0x9ad0ff, 0xfff0a0][i % 3], e: 0.8, a: 'spin' })),
  { s: [2.6, 0.12, 0.5], p: [0, 2.2, 0], c: 0xd8d0f6, e: 0.4, a: 'spin2' }, { s: [0.5, 0.12, 2.6], p: [0, 2.2, 0], c: 0xd8d0f6, e: 0.4, a: 'spin2' },
];
const hart: Part[] = [
  ...quad(0x1e1830, { w: 1.0, h: 1.1, l: 2.2, leg: 1.3, head: 0.8, hc: 0x2a2040, glow: 1, eye: 0xfff0d0, tail: 0xfff0d0, legC: 0x120e1e }),
  { s: [0.14, 1.1, 0.14], p: [-0.35, 3.3, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' }, { s: [0.14, 1.1, 0.14], p: [0.35, 3.3, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' },
  { s: [0.6, 0.12, 0.12], p: [-0.6, 3.5, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' }, { s: [0.6, 0.12, 0.12], p: [0.6, 3.5, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' },
  { s: [0.5, 0.12, 0.12], p: [-0.55, 3.1, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' }, { s: [0.5, 0.12, 0.12], p: [0.55, 3.1, 1.35], c: 0xfff0d0, e: 0.9, a: 'head' },
  { s: [0.7, 0.16, 1.6], p: [0, 2.5, 0], c: 0xd86af6, e: 0.6 },
];
const sovereign: Part[] = [
  { s: [2.4, 0.8, 2.4], p: [0, 0.9, 0], c: 0x5a6274 }, { s: [2.0, 0.8, 2.0], p: [0, 1.7, 0], c: 0x6a7284 }, { s: [1.6, 0.8, 1.6], p: [0, 2.5, 0], c: 0x7a8294 }, { s: [1.2, 0.8, 1.2], p: [0, 3.3, 0], c: 0x8a92a4 },
  { s: [0.9, 0.9, 0.9], p: [0, 4.4, 0], c: 0xffd27a, e: 1, a: 'bob' }, { s: [0.45, 0.45, 0.45], p: [0, 4.4, 0], c: 0xffffff, e: 1, a: 'bob' },
  { s: [0.6, 2.2, 0.6], p: [-1.9, 3.2, 0], o: [0, -1.1, 0], c: 0x5a6274, a: 'armA' }, { s: [0.6, 2.2, 0.6], p: [1.9, 3.2, 0], o: [0, -1.1, 0], c: 0x5a6274, a: 'armB' },
  ...[0, 1, 2, 3].map((i): Part => ({ s: [0.4, 0.4, 0.4], p: [0, 4.4, 0], o: [Math.cos(i * 1.57) * 1.8, 0, Math.sin(i * 1.57) * 1.8], c: 0xffd27a, e: 1, a: 'spin' })),
  { s: [0.3, 0.24, 0.06], p: [-0.4, 2.6, 0.82], c: 0xffd27a, e: 1 }, { s: [0.3, 0.24, 0.06], p: [0.4, 2.6, 0.82], c: 0xffd27a, e: 1 },
];
const boss = (key: string, name: string, hp: number, dmg: number, def: number, hw: number, h: number, xp: number, parts: Part[], drops: Drop[], spec: BossSpec): MobDef =>
  ({ key, name, hp, dmg, def, speed: spec.phases[0].speed, xp, coins: [hp / 12, hp / 8], hw, h, ai: 'boss', hostile: true, parts, drops, aggro: 90, knockRes: 1, boss: spec, voice: 0.25, glow: true });

M.push(
  boss('b_colossus', 'Mossback Colossus', 420, 12, 4, 1.7, 5.8, 150, colossus, [['heartroot', 1, 6, 9], ['mossheart_sprig', 0.33, 1, 1], ['salve', 1, 3, 5], ['iron_bar', 1, 4, 8]], {
    n: 1, move: 'walk', stomp: 0.12, cast: 4.05, title: 'Warden of the Greenwood', intro: 'The ground remembers how to stand up.', phases: [
      { below: 1, speed: 2.6, cd: [1.8, 2.8], attacks: [{ t: 'slam', radius: 6, dmg: 14, windup: 0.9 }, { t: 'charge', speed: 11, dmg: 12, windup: 0.8, dur: 1.2 }] },
      { below: 0.5, speed: 3.3, cd: [1.3, 2.1], say: 'Roots tear free of the altar.', enter: { t: 'summon', mob: 'sproutling', n: 4 },
        attacks: [{ t: 'slam', radius: 7, dmg: 16, windup: 0.75, ring: ['rootspike', 10] }, { t: 'charge', speed: 13, dmg: 14, windup: 0.6, dur: 1.2 }, { t: 'rain', proj: 'rootspike', n: 7, radius: 7, dmg: 12 }, { t: 'summon', mob: 'sproutling', n: 2 }] },
    ] }),
  boss('b_maw', 'Dune Maw', 900, 20, 8, 1.2, 2.2, 320, maw, [['scorched_core', 1, 6, 9], ['maw_fang', 0.33, 1, 1], ['gold_bar', 1, 5, 10], ['salve', 1, 3, 6]], {
    n: 2, move: 'burrow', segments: 12, seg: mawSeg, title: 'Hunger Beneath the Sand', intro: 'The dunes begin to breathe.', phases: [
      { below: 1, speed: 9, cd: [2.2, 3.2], attacks: [{ t: 'burrow', dmg: 22 }, { t: 'volley', proj: 'sandball', n: 5, spread: 0.6, dmg: 14 }] },
      { below: 0.45, speed: 12, cd: [1.4, 2.2], say: 'The Maw thrashes, shedding grit and fury.', enter: { t: 'summon', mob: 'dune_mite', n: 4 },
        attacks: [{ t: 'burrow', dmg: 26, ring: ['sandball', 12] }, { t: 'volley', proj: 'sandball', n: 7, spread: 0.8, dmg: 16, bursts: 2, gap: 0.35 }, { t: 'summon', mob: 'dune_mite', n: 2 }] },
    ] }),
  boss('b_warden', 'The Pale Warden', 1500, 26, 12, 1.05, 5.6, 600, warden, [['warden_sigil', 1, 6, 9], ['wardens_aegis', 0.33, 1, 1], ['lumenite', 1, 4, 8], ['greater_salve', 1, 2, 4]], {
    n: 3, move: 'hover', cast: 3.85, spin: [0.7, 1.1], castSound: 'bell', title: 'Keeper of the Sealed Way', intro: 'A bell tolls with no bell to toll it.', phases: [
      { below: 1, speed: 3.4, cd: [1.6, 2.4], attacks: [{ t: 'volley', proj: 'wardenorb', n: 3, spread: 0.3, dmg: 20, bursts: 2, gap: 0.4 }, { t: 'teleport' }, { t: 'ring', proj: 'wardenorb', n: 12, dmg: 18 }] },
      { below: 0.6, speed: 4, cd: [1.3, 2], say: 'The Warden raises both hands.', attacks: [{ t: 'spiral', proj: 'wardenorb', arms: 3, dur: 3, dmg: 18, spin: 1.6 }, { t: 'volley', proj: 'wardenorb', n: 5, spread: 0.5, dmg: 22, bursts: 2, gap: 0.3 }, { t: 'teleport' }] },
      { below: 0.25, speed: 4.8, cd: [0.9, 1.5], say: 'The seal cracks. So does the Warden.', enter: { t: 'summon', mob: 'gloomshade', n: 4 },
        attacks: [{ t: 'rain', proj: 'wardenorb', n: 10, radius: 8, dmg: 22 }, { t: 'spiral', proj: 'wardenorb', arms: 4, dur: 3, dmg: 20, spin: -2 }, { t: 'teleport' }, { t: 'ring', proj: 'wardenorb', n: 18, dmg: 20 }] },
    ] }),
  boss('b_sporemother', 'Sporemother', 2600, 34, 16, 2.3, 5.6, 1100, sporemother, [['queen_spore', 1, 6, 9], ['mycelial_crown', 0.33, 1, 1], ['umbrite_bar', 1, 6, 12], ['greater_salve', 1, 3, 5]], {
    n: 4, move: 'hover', cast: 2.55, spin: [0.8, 0.8], title: 'Mother of the Under-Bloom', intro: 'The cavern exhales.', phases: [
      { below: 1, speed: 1.6, cd: [1.8, 2.6], attacks: [{ t: 'rain', proj: 'sporebomb', n: 8, radius: 9, dmg: 28 }, { t: 'summon', mob: 'sporeling', n: 2 }, { t: 'ring', proj: 'sporebomb', n: 14, dmg: 24 }] },
      { below: 0.55, speed: 2.2, cd: [1.4, 2.1], say: 'Her cap splits and glows.', attacks: [{ t: 'spiral', proj: 'sporebomb', arms: 4, dur: 3.5, dmg: 26, spin: 1.2 }, { t: 'ring', proj: 'sporebomb', n: 20, dmg: 26 }, { t: 'rain', proj: 'sporebomb', n: 12, radius: 10, dmg: 30 }, { t: 'summon', mob: 'sporeling', n: 3 }] },
      { below: 0.2, speed: 5.5, cd: [1, 1.6], say: 'Sporemother tears loose from her roots!', attacks: [{ t: 'charge', speed: 14, dmg: 40, windup: 0.7, dur: 1.4 }, { t: 'slam', radius: 8, dmg: 36, windup: 0.6, ring: ['sporebomb', 16] }, { t: 'spiral', proj: 'sporebomb', arms: 5, dur: 3, dmg: 28, spin: -1.8 }] },
    ] }),
  boss('b_regent', 'Tempest Regent', 3800, 42, 18, 1.2, 2.6, 1800, regent, [['storm_plume', 1, 6, 9], ['tempest_feather', 0.33, 1, 1], ['noctrium_bar', 1, 6, 12], ['greater_salve', 1, 3, 6]], {
    n: 5, move: 'fly', title: 'Sovereign of the High Wind', intro: 'The sky leans down to look at you.', phases: [
      { below: 1, speed: 8, cd: [1.6, 2.4], attacks: [{ t: 'charge', speed: 22, dmg: 40, windup: 0.7, dur: 1.3 }, { t: 'volley', proj: 'lightning', n: 5, spread: 0.5, dmg: 30 }] },
      { below: 0.6, speed: 9.5, cd: [1.3, 2], say: 'Thunder gathers under its wings.', attacks: [{ t: 'rain', proj: 'lightning', n: 12, radius: 10, dmg: 36 }, { t: 'ring', proj: 'lightning', n: 16, dmg: 30 }, { t: 'charge', speed: 26, dmg: 44, windup: 0.55, dur: 1.2 }] },
      { below: 0.25, speed: 11, cd: [0.9, 1.5], say: 'The Regent screams, and the storm answers.', attacks: [{ t: 'spiral', proj: 'lightning', arms: 4, dur: 3, dmg: 32, spin: 2.2 }, { t: 'charge', speed: 30, dmg: 48, windup: 0.45, dur: 1.1 }, { t: 'rain', proj: 'lightning', n: 16, radius: 11, dmg: 38 }] },
    ] }),
  boss('b_luminarch', 'The Luminarch', 5400, 50, 22, 1.2, 3.4, 2800, luminarch, [['prism_heart', 1, 6, 9], ['prism_core', 0.33, 1, 1], ['aether_bar', 1, 6, 12], ['greater_salve', 1, 4, 6]], {
    n: 6, move: 'hover', title: 'First Light, Refracted', intro: 'Every colour arrives at once.', phases: [
      { below: 1, speed: 4.5, cd: [1.5, 2.2], attacks: [{ t: 'beam', proj: 'prismray', dmg: 40, windup: 0.9, dur: 1.6 }, { t: 'volley', proj: 'prismray', n: 4, spread: 0.4, dmg: 36, bursts: 3, gap: 0.25 }, { t: 'teleport' }] },
      { below: 0.6, speed: 5.5, cd: [1.2, 1.8], say: 'The prisms begin to turn.', attacks: [{ t: 'spiral', proj: 'prismray', arms: 4, dur: 3.5, dmg: 36, spin: 1.8 }, { t: 'beam', proj: 'prismray', dmg: 44, windup: 0.7, dur: 2 }, { t: 'ring', proj: 'prismray', n: 20, dmg: 34 }, { t: 'teleport' }] },
      { below: 0.25, speed: 6.5, cd: [0.8, 1.3], say: 'It burns too bright to hold its shape.', enter: { t: 'summon', mob: 'shardling', n: 2 },
        attacks: [{ t: 'rain', proj: 'prismray', n: 16, radius: 11, dmg: 42 }, { t: 'beam', proj: 'prismray', dmg: 48, windup: 0.5, dur: 2.2 }, { t: 'spiral', proj: 'prismray', arms: 6, dur: 3, dmg: 36, spin: -2.4 }, { t: 'teleport' }] },
    ] }),
  boss('b_hart', 'Moonbound Hart', 7200, 60, 26, 1.0, 3.2, 4000, hart, [['eclipse_ember', 1, 6, 9], ['eclipse_shard', 0.33, 1, 1], ['prism_bar', 1, 6, 12], ['moon_sliver', 1, 4, 8]], {
    n: 7, move: 'walk', title: 'Herald of the Long Night', intro: 'Hoofbeats, and then no moon.', phases: [
      { below: 1, speed: 7, cd: [1.3, 2], attacks: [{ t: 'charge', speed: 24, dmg: 58, windup: 0.6, dur: 1.1 }, { t: 'slam', radius: 7, dmg: 50, windup: 0.6, ring: ['moonblade', 12] }, { t: 'volley', proj: 'moonblade', n: 5, spread: 0.5, dmg: 44 }] },
      { below: 0.6, speed: 8.5, cd: [1, 1.6], say: 'Its antlers catch a light that is not there.', enter: { t: 'summon', mob: 'moonspawn', n: 3 },
        attacks: [{ t: 'teleport' }, { t: 'charge', speed: 28, dmg: 62, windup: 0.45, dur: 1 }, { t: 'ring', proj: 'moonblade', n: 20, dmg: 44 }, { t: 'rain', proj: 'moonblade', n: 12, radius: 9, dmg: 48 }] },
      { below: 0.25, speed: 10, cd: [0.7, 1.2], say: 'The Hart will not be led back.', attacks: [{ t: 'charge', speed: 32, dmg: 66, windup: 0.35, dur: 0.9 }, { t: 'teleport' }, { t: 'spiral', proj: 'moonblade', arms: 5, dur: 3, dmg: 44, spin: 2.6 }, { t: 'slam', radius: 9, dmg: 56, windup: 0.5, ring: ['moonblade', 18] }] },
    ] }),
  boss('b_sovereign', 'Cairn Sovereign', 11000, 72, 30, 1.6, 5.0, 8000, sovereign, [['cairn_heart', 1, 1, 1], ['sovereign_light', 1, 1, 1], ['cairn_edge', 0.5, 1, 1], ['cairn_bow', 0.5, 1, 1], ['cairn_staff', 0.5, 1, 1], ['cairn_totem', 0.5, 1, 1], ['eclipse_bar', 1, 8, 14]], {
    n: 8, move: 'hover', title: 'The First Stone Laid', intro: 'It was here before the light. It kept it.', phases: [
      { below: 1, speed: 4, cd: [1.4, 2], attacks: [{ t: 'volley', proj: 'cairnstar', n: 5, spread: 0.5, dmg: 54, bursts: 2, gap: 0.3 }, { t: 'slam', radius: 8, dmg: 64, windup: 0.8, ring: ['cairnstar', 14] }, { t: 'ring', proj: 'cairnstar', n: 18, dmg: 50 }] },
      { below: 0.66, speed: 5, cd: [1.1, 1.7], say: 'Stone grinds on stone. The cairn opens its eye.', attacks: [{ t: 'spiral', proj: 'cairnstar', arms: 5, dur: 3.5, dmg: 50, spin: 1.6 }, { t: 'beam', proj: 'cairnstar', dmg: 60, windup: 0.7, dur: 2 }, { t: 'rain', proj: 'cairnstar', n: 16, radius: 11, dmg: 58 }, { t: 'teleport' }] },
      { below: 0.33, speed: 6.5, cd: [0.7, 1.2], say: 'All the light it ever kept, all at once.', enter: { t: 'summon', mob: 'moonspawn', n: 3 },
        attacks: [{ t: 'charge', speed: 22, dmg: 76, windup: 0.5, dur: 1.2 }, { t: 'spiral', proj: 'cairnstar', arms: 7, dur: 3, dmg: 52, spin: -2.4 }, { t: 'beam', proj: 'cairnstar', dmg: 66, windup: 0.5, dur: 2.4 }, { t: 'rain', proj: 'cairnstar', n: 22, radius: 12, dmg: 60 }, { t: 'teleport' }, { t: 'ring', proj: 'cairnstar', n: 26, dmg: 54 }] },
    ] }),
);

export const MOBS = new Map<string, MobDef>(M.map((m) => [m.key, m]));
export const MOB_LIST = M;
export const BOSSES = M.filter((m) => m.boss).sort((a, b) => a.boss!.n - b.boss!.n);
export const mob = (key: string): MobDef => { const d = MOBS.get(key); if (!d) throw new Error('unknown mob: ' + key); return d; };
void LAND;

// ---- projectiles ------------------------------------------------------------------------------
export interface ProjDef { color: number; size: number; speed: number; gravity: number; life: number; glow: number; trail?: number; pierce?: boolean }
export const PROJECTILES: Record<string, ProjDef> = {
  arrow: { color: 0xd8d0c0, size: 0.14, speed: 34, gravity: 14, life: 4, glow: 0 },
  ember: { color: 0xff8a2a, size: 0.22, speed: 13, gravity: 0, life: 4, glow: 1, trail: 0xffe06a },
  rustbolt: { color: 0xb8623a, size: 0.18, speed: 18, gravity: 2, life: 4, glow: 0.4 },
  mothdust: { color: 0xc8a0ff, size: 0.2, speed: 14, gravity: 0, life: 4, glow: 1, trail: 0xf0e0ff },
  aetherbolt: { color: 0x6fc0f0, size: 0.22, speed: 18, gravity: 0, life: 4, glow: 1, trail: 0xf4f8ff },
  hex: { color: 0xd86af6, size: 0.22, speed: 14, gravity: 0, life: 4, glow: 1, trail: 0x6a2a8a },
  rootspike: { color: 0x6ae05a, size: 0.3, speed: 12, gravity: 0, life: 4, glow: 0.7, trail: 0x4f9e33 },
  sandball: { color: 0xe4d39a, size: 0.34, speed: 14, gravity: 3, life: 5, glow: 0.3, trail: 0xcfae62 },
  wardenorb: { color: 0x6ab8f6, size: 0.3, speed: 11, gravity: 0, life: 6, glow: 1, trail: 0xd0e6ff },
  sporebomb: { color: 0x4ae6b8, size: 0.34, speed: 10, gravity: 0, life: 6, glow: 1, trail: 0x6a3f9a },
  lightning: { color: 0xfff0a0, size: 0.28, speed: 20, gravity: 0, life: 4, glow: 1, trail: 0x9ab6ff },
  prismray: { color: 0xf4f0ff, size: 0.28, speed: 19, gravity: 0, life: 5, glow: 1, trail: 0xf6a0f0 },
  moonblade: { color: 0xfff0d0, size: 0.32, speed: 17, gravity: 0, life: 5, glow: 1, trail: 0xd86af6 },
  cairnstar: { color: 0xffd27a, size: 0.34, speed: 16, gravity: 0, life: 6, glow: 1, trail: 0xffffff },
};
const BOLT = [0, 0, 0xfff0a0, 0x4fe6e0, 0xff7a2a, 0x9a5af0, 0x2ad6b0, 0x4fb6f6, 0xf6a0f0, 0xc06af6, 0xffd27a];
for (let i = 2; i <= 10; i++) PROJECTILES['bolt' + i] = { color: BOLT[i], size: 0.2 + i * 0.012, speed: 26, gravity: 0, life: 2.5, glow: 1, trail: 0xffffff, pierce: i >= 7 };
