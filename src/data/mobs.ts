// Creature table: stats, AI archetype, box model, drops and spawn rules. Bosses carry a phase
// script built from reusable attack primitives, so a new boss is data only.
import type { Drop } from './blocks';

/** One box of a creature model. Sizes and positions are in blocks; the model faces +z. */
export interface Part { s: [number, number, number]; p: [number, number, number]; o?: [number, number, number]; c: number; a?: string; e?: number }
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
export interface BossSpec { n: number; move: 'walk' | 'hover' | 'burrow' | 'fly'; phases: Phase[]; title: string; intro: string; segments?: number }

export interface MobDef {
  key: string; name: string; hp: number; dmg: number; def: number; speed: number; xp: number; coins: [number, number];
  hw: number; h: number; ai: 'passive' | 'melee' | 'ranged' | 'hopper' | 'flyer' | 'fish' | 'minion' | 'npc' | 'boss';
  hostile: boolean; parts: Part[]; drops: Drop[];
  aggro?: number; range?: number; proj?: string; rate?: number; knockRes?: number; voice?: number;
  spawn?: SpawnRule[]; boss?: BossSpec; glow?: boolean;
}

// ---- model builders ----------------------------------------------------------------
const dark = (c: number, k = 0.7): number => (((c >> 16) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k) | 0;
const eyes = (y: number, z: number, gap: number, c: number, e = 0, s = 0.09): Part[] => [
  { s: [s, s, 0.04], p: [-gap, y, z], c, e, a: 'head' }, { s: [s, s, 0.04], p: [gap, y, z], c, e, a: 'head' },
];
interface QuadOpt { w: number; h: number; l: number; leg: number; head: number; hc?: number; legC?: number; eye?: number; glow?: number; horn?: number; tail?: number; back?: number }
function quad(c: number, o: QuadOpt): Part[] {
  const by = o.leg + o.h / 2, lw = Math.min(0.2, o.w * 0.3), hx = o.w / 2 - lw / 2, hz = o.l / 2 - lw / 2, lc = o.legC ?? dark(c);
  const hy = o.leg + o.h * 0.75, hzp = o.l / 2 + o.head * 0.35;
  const ps: Part[] = [
    { s: [o.w, o.h, o.l], p: [0, by, 0], c },
    { s: [o.head, o.head, o.head], p: [0, hy, hzp], c: o.hc ?? c, a: 'head' },
    { s: [lw, o.leg, lw], p: [-hx, o.leg, hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legA' }, { s: [lw, o.leg, lw], p: [hx, o.leg, hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legB' },
    { s: [lw, o.leg, lw], p: [-hx, o.leg, -hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legB' }, { s: [lw, o.leg, lw], p: [hx, o.leg, -hz], o: [0, -o.leg / 2, 0], c: lc, a: 'legA' },
    ...eyes(hy + o.head * 0.12, hzp + o.head / 2, o.head * 0.26, o.eye ?? 0x15131c, o.glow ?? 0),
  ];
  if (o.horn) ps.push({ s: [0.08, 0.2, 0.08], p: [-o.head * 0.35, hy + o.head / 2 + 0.08, hzp], c: o.horn, a: 'head' }, { s: [0.08, 0.2, 0.08], p: [o.head * 0.35, hy + o.head / 2 + 0.08, hzp], c: o.horn, a: 'head' });
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
    ...eyes(hy + head * 0.08, head / 2, head * 0.24, o.eye ?? 0x15131c, o.glow ?? 0, head * 0.2),
  ];
  if (o.hat) ps.push({ s: [head * 1.2, head * 0.3, head * 1.2], p: [0, hy + head * 0.55, 0], c: o.hat, a: 'head' });
  if (o.cape) ps.push({ s: [o.w * 0.95, torso * 1.5, 0.06], p: [0, leg + torso, -o.w * 0.3], o: [0, -torso * 0.7, 0], c: o.cape, a: 'tail' });
  return ps;
}
function blob(c: number, s: number, core: number, eye = 0x15131c, glow = 0): Part[] {
  return [{ s: [s, s * 0.8, s], p: [0, s * 0.4, 0], c, a: 'squash' }, { s: [s * 0.5, s * 0.4, s * 0.5], p: [0, s * 0.42, 0], c: core, a: 'squash', e: glow * 0.6 },
    ...eyes(s * 0.5, s / 2, s * 0.22, eye, glow, s * 0.14)];
}
function flyer(c: number, body: number, span: number, wing: number, eye = 0xffe06a, glow = 0.9): Part[] {
  return [{ s: [body, body * 0.7, body * 1.3], p: [0, body * 0.5, 0], c },
    { s: [span, 0.05, body * 0.9], p: [-body / 2, body * 0.6, 0], o: [-span / 2, 0, 0], c: wing, a: 'wingA' }, { s: [span, 0.05, body * 0.9], p: [body / 2, body * 0.6, 0], o: [span / 2, 0, 0], c: wing, a: 'wingB' },
    ...eyes(body * 0.6, body * 0.65, body * 0.22, eye, glow, body * 0.16)];
}
function wisp(c: number, s: number, bits: number): Part[] {
  const ps: Part[] = [{ s: [s, s, s], p: [0, s, 0], c, e: 1, a: 'bob' }, { s: [s * 0.5, s * 0.5, s * 0.5], p: [0, s, 0], c: 0xffffff, e: 1, a: 'bob' }];
  for (let i = 0; i < 4; i++) ps.push({ s: [s * 0.3, s * 0.3, s * 0.3], p: [0, s, 0], o: [Math.cos(i * 1.57) * s * 1.1, Math.sin(i * 2.1) * s * 0.3, Math.sin(i * 1.57) * s * 1.1], c: bits, e: 0.8, a: 'spin' });
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
    parts: [{ s: [0.36, 0.34, 0.46], p: [0, 0.42, 0], c: 0xb86a3a }, { s: [0.22, 0.26, 0.22], p: [0, 0.72, 0.2], c: 0xd8c0a0, a: 'head' }, { s: [0.08, 0.06, 0.12], p: [0, 0.7, 0.36], c: 0xf2a02a, a: 'head' },
      { s: [0.06, 0.26, 0.06], p: [-0.1, 0.26, 0], o: [0, -0.13, 0], c: 0xf2a02a, a: 'legA' }, { s: [0.06, 0.26, 0.06], p: [0.1, 0.26, 0], o: [0, -0.13, 0], c: 0xf2a02a, a: 'legB' },
      { s: [0.3, 0.26, 0.08], p: [0, 0.56, -0.24], c: 0x6a3a22, a: 'tail' }, ...eyes(0.78, 0.31, 0.07, 0x101018, 0, 0.05)],
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
    parts: [...biped(0x5a8a3a, { h: 1.0, w: 0.5, skin: 0x6a9a44, legs: 0x6a4a2a, glow: 0.8, eye: 0xffe06a }), { s: [0.1, 0.3, 0.1], p: [0, 1.1, 0], c: 0xe2452f, a: 'head' }],
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
  minion('m_thornling', 'Thornling', [...blob(0x5a8a3a, 0.4, 0x6ae05a, 0xffe06a, 1), { s: [0.08, 0.2, 0.08], p: [0, 0.44, 0], c: 0xe2452f }], 7),
  minion('m_wisp', 'Lumen Wisp', wisp(0x4fe6e0, 0.2, 0xc0fff8), 8),
  minion('m_brazier', 'Brazier Spirit', wisp(0xff7a2a, 0.24, 0xffe06a), 8.5),
  minion('m_shade', 'Bound Shade', flyer(0x3a2a5a, 0.3, 0.4, 0x9a5af0, 0xc8a0ff, 1), 9),
  minion('m_mycelid', 'Mycelid Sprite', [...blob(0x3f8f86, 0.42, 0x8af0d8, 0x101018, 1), { s: [0.5, 0.12, 0.5], p: [0, 0.4, 0], c: 0x6a3f9a, e: 0.4 }], 9.5),
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
const colossus: Part[] = [
  { s: [1.1, 1.3, 1.1], p: [-0.8, 1.3, 0], o: [0, -0.65, 0], c: 0x4a5a3a, a: 'legA' }, { s: [1.1, 1.3, 1.1], p: [0.8, 1.3, 0], o: [0, -0.65, 0], c: 0x4a5a3a, a: 'legB' },
  { s: [2.8, 2.2, 1.8], p: [0, 2.4, 0], c: 0x5a6a48 }, { s: [3.0, 0.5, 2.0], p: [0, 3.6, 0], c: 0x5a8a42 },
  { s: [0.9, 2.4, 0.9], p: [-1.85, 3.3, 0], o: [0, -1.2, 0], c: 0x6a7a55, a: 'armA' }, { s: [0.9, 2.4, 0.9], p: [1.85, 3.3, 0], o: [0, -1.2, 0], c: 0x6a7a55, a: 'armB' },
  { s: [1.2, 1.0, 1.1], p: [0, 4.3, 0.2], c: 0x6a7a55, a: 'head' }, { s: [0.24, 0.2, 0.06], p: [-0.3, 4.4, 0.78], c: 0x9aff6a, e: 1, a: 'head' }, { s: [0.24, 0.2, 0.06], p: [0.3, 4.4, 0.78], c: 0x9aff6a, e: 1, a: 'head' },
  { s: [0.5, 0.5, 0.5], p: [0, 2.6, 0.95], c: 0x6ae05a, e: 0.9 }, { s: [0.3, 0.8, 0.3], p: [-0.9, 4.2, -0.4], c: 0x4f9e33 }, { s: [0.3, 1.1, 0.3], p: [0.7, 4.3, -0.5], c: 0x4f9e33 },
];
const maw: Part[] = [
  { s: [1.6, 1.6, 1.8], p: [0, 0.9, 0], c: 0xcfae62 }, { s: [1.7, 0.3, 1.2], p: [0, 1.75, 0], c: 0x8a6a34 },
  { s: [1.3, 0.5, 0.9], p: [0, 1.25, 0.9], o: [0, 0, 0.45], c: 0xdcc88c, a: 'jawA' }, { s: [1.3, 0.5, 0.9], p: [0, 0.6, 0.9], o: [0, 0, 0.45], c: 0xb89650, a: 'jawB' },
  { s: [0.2, 0.2, 0.06], p: [-0.5, 1.5, 0.92], c: 0xff8a2a, e: 1 }, { s: [0.2, 0.2, 0.06], p: [0.5, 1.5, 0.92], c: 0xff8a2a, e: 1 },
  { s: [0.16, 0.3, 0.16], p: [-0.4, 0.95, 1.6], c: 0xf2f0d0, a: 'jawA' }, { s: [0.16, 0.3, 0.16], p: [0.4, 0.95, 1.6], c: 0xf2f0d0, a: 'jawA' },
];
const warden: Part[] = [
  { s: [1.3, 2.2, 0.8], p: [0, 1.9, 0], c: 0x8a94a8 }, { s: [1.5, 1.3, 1.0], p: [0, 0.7, 0], c: 0x5a6274, a: 'tail' },
  { s: [0.9, 0.9, 0.9], p: [0, 3.5, 0], c: 0xe6dfcc, a: 'head' }, { s: [0.2, 0.26, 0.06], p: [-0.22, 3.55, 0.47], c: 0x6ab8f6, e: 1, a: 'head' }, { s: [0.2, 0.26, 0.06], p: [0.22, 3.55, 0.47], c: 0x6ab8f6, e: 1, a: 'head' },
  { s: [0.4, 1.9, 0.4], p: [-0.9, 2.9, 0], o: [0, -0.95, 0], c: 0xe6dfcc, a: 'armA' }, { s: [0.4, 1.9, 0.4], p: [0.9, 2.9, 0], o: [0, -0.95, 0], c: 0xe6dfcc, a: 'armB' },
  { s: [1.1, 0.3, 1.1], p: [0, 4.1, 0], c: 0x5a6274, a: 'head' }, { s: [0.3, 0.3, 0.3], p: [0, 4.9, 0], c: 0x6ab8f6, e: 1, a: 'spin', o: [1.2, 0, 0] }, { s: [0.3, 0.3, 0.3], p: [0, 4.9, 0], c: 0x6ab8f6, e: 1, a: 'spin', o: [-1.2, 0, 0] },
];
const sporemother: Part[] = [
  { s: [3.2, 2.0, 3.2], p: [0, 1.8, 0], c: 0x3f8f86, a: 'squash' }, { s: [4.4, 0.9, 4.4], p: [0, 3.2, 0], c: 0x6a3f9a, a: 'squash' }, { s: [3.0, 0.7, 3.0], p: [0, 3.95, 0], c: 0x8a5ab8, a: 'squash' },
  { s: [1.4, 1.2, 1.4], p: [0, 0.6, 0], c: 0xa8b4c8 }, { s: [0.5, 0.4, 0.08], p: [-0.8, 2.0, 1.62], c: 0x8af0d8, e: 1 }, { s: [0.5, 0.4, 0.08], p: [0.8, 2.0, 1.62], c: 0x8af0d8, e: 1 },
  { s: [0.6, 0.6, 0.6], p: [0, 3.4, 0], o: [2.6, 0, 0], c: 0x8af0d8, e: 0.9, a: 'spin' }, { s: [0.6, 0.6, 0.6], p: [0, 3.4, 0], o: [-2.6, 0, 0], c: 0x8af0d8, e: 0.9, a: 'spin' },
  { s: [0.6, 0.6, 0.6], p: [0, 3.4, 0], o: [0, 0, 2.6], c: 0xd8a0ff, e: 0.9, a: 'spin' }, { s: [0.6, 0.6, 0.6], p: [0, 3.4, 0], o: [0, 0, -2.6], c: 0xd8a0ff, e: 0.9, a: 'spin' },
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
  boss('b_colossus', 'Mossback Colossus', 420, 12, 4, 1.4, 4.8, 150, colossus, [['heartroot', 1, 6, 9], ['mossheart_sprig', 0.33, 1, 1], ['salve', 1, 3, 5], ['iron_bar', 1, 4, 8]], {
    n: 1, move: 'walk', title: 'Warden of the Greenwood', intro: 'The ground remembers how to stand up.', phases: [
      { below: 1, speed: 2.6, cd: [1.8, 2.8], attacks: [{ t: 'slam', radius: 6, dmg: 14, windup: 0.9 }, { t: 'charge', speed: 11, dmg: 12, windup: 0.8, dur: 1.2 }] },
      { below: 0.5, speed: 3.3, cd: [1.3, 2.1], say: 'Roots tear free of the altar.', enter: { t: 'summon', mob: 'sproutling', n: 4 },
        attacks: [{ t: 'slam', radius: 7, dmg: 16, windup: 0.75, ring: ['rootspike', 10] }, { t: 'charge', speed: 13, dmg: 14, windup: 0.6, dur: 1.2 }, { t: 'rain', proj: 'rootspike', n: 7, radius: 7, dmg: 12 }, { t: 'summon', mob: 'sproutling', n: 2 }] },
    ] }),
  boss('b_maw', 'Dune Maw', 900, 20, 8, 0.9, 1.8, 320, maw, [['scorched_core', 1, 6, 9], ['maw_fang', 0.33, 1, 1], ['gold_bar', 1, 5, 10], ['salve', 1, 3, 6]], {
    n: 2, move: 'burrow', segments: 9, title: 'Hunger Beneath the Sand', intro: 'The dunes begin to breathe.', phases: [
      { below: 1, speed: 9, cd: [2.2, 3.2], attacks: [{ t: 'burrow', dmg: 22 }, { t: 'volley', proj: 'sandball', n: 5, spread: 0.6, dmg: 14 }] },
      { below: 0.45, speed: 12, cd: [1.4, 2.2], say: 'The Maw thrashes, shedding grit and fury.', enter: { t: 'summon', mob: 'dune_mite', n: 4 },
        attacks: [{ t: 'burrow', dmg: 26, ring: ['sandball', 12] }, { t: 'volley', proj: 'sandball', n: 7, spread: 0.8, dmg: 16, bursts: 2, gap: 0.35 }, { t: 'summon', mob: 'dune_mite', n: 2 }] },
    ] }),
  boss('b_warden', 'The Pale Warden', 1500, 26, 12, 0.8, 4.2, 600, warden, [['warden_sigil', 1, 6, 9], ['wardens_aegis', 0.33, 1, 1], ['lumenite', 1, 4, 8], ['greater_salve', 1, 2, 4]], {
    n: 3, move: 'hover', title: 'Keeper of the Sealed Way', intro: 'A bell tolls with no bell to toll it.', phases: [
      { below: 1, speed: 3.4, cd: [1.6, 2.4], attacks: [{ t: 'volley', proj: 'wardenorb', n: 3, spread: 0.3, dmg: 20, bursts: 2, gap: 0.4 }, { t: 'teleport' }, { t: 'ring', proj: 'wardenorb', n: 12, dmg: 18 }] },
      { below: 0.6, speed: 4, cd: [1.3, 2], say: 'The Warden raises both hands.', attacks: [{ t: 'spiral', proj: 'wardenorb', arms: 3, dur: 3, dmg: 18, spin: 1.6 }, { t: 'volley', proj: 'wardenorb', n: 5, spread: 0.5, dmg: 22, bursts: 2, gap: 0.3 }, { t: 'teleport' }] },
      { below: 0.25, speed: 4.8, cd: [0.9, 1.5], say: 'The seal cracks. So does the Warden.', enter: { t: 'summon', mob: 'gloomshade', n: 4 },
        attacks: [{ t: 'rain', proj: 'wardenorb', n: 10, radius: 8, dmg: 22 }, { t: 'spiral', proj: 'wardenorb', arms: 4, dur: 3, dmg: 20, spin: -2 }, { t: 'teleport' }, { t: 'ring', proj: 'wardenorb', n: 18, dmg: 20 }] },
    ] }),
  boss('b_sporemother', 'Sporemother', 2600, 34, 16, 1.9, 4.4, 1100, sporemother, [['queen_spore', 1, 6, 9], ['mycelial_crown', 0.33, 1, 1], ['umbrite_bar', 1, 6, 12], ['greater_salve', 1, 3, 5]], {
    n: 4, move: 'hover', title: 'Mother of the Under-Bloom', intro: 'The cavern exhales.', phases: [
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
