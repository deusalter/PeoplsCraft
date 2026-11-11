// Side effects leave the simulation as events: one tuple per sound, burst, banner or mark. The sim
// never touches audio, particles or the HUD, and never loops over particles; whoever implements
// Sink decides who hears what.
import type { S2C } from '../net/protocol';

export type Fx =
  /** audio.play(name, vol, pitch, at) */
  | ['s', string, number, number, number?, number?, number?]
  /** Particle burst: kind (BURST), position, and two numbers the kind gives meaning to. */
  | ['p', number, number, number, number, number, number]
  /** Floating text: position, text, colour, big. */
  | ['f', number, number, number, string, string, boolean]
  /** Toast: text, colour ('' for the default). */
  | ['t', string, string]
  /** Banner: title, sub, colour. */
  | ['n', string, string, string]
  /** Camera shake, already scaled for the recipient. */
  | ['k', number]
  /** Crosshair hit mark, to the attacker. */
  | ['h', boolean]
  /** Pickup line, to the picker: item key, count, total now held. */
  | ['u', string, number, number]
  /** Projectile ended: id, where, how (0 expired, 1 terrain, 2 hit). */
  | ['pe', number, number, number, number, number]
  /** Creature removed: id, how (0 despawned, 1 killed, 2 boss withdrew). */
  | ['md', number, number]
  /** Rain marks of boss `id`: x, z and seconds until the strike, repeated. */
  | ['mk', number, ...number[]];

export type Scope =
  | { p: number }
  | { dim: number; x: number; y: number; z: number; r: number; not?: number }
  | { dim: number; not?: number }
  | { all: true };

export interface Sink {
  /** Side effects, to whoever the scope covers. */
  emit(to: Scope, ev: Fx): void;
  /** Reliable state for one player slot. */
  send(slot: number, m: S2C): void;
  /** Reliable state for everyone. */
  broadcast(m: S2C): void;
}

/** Burst kinds of the `p` event. The client owns the loops; `a` and `c` are the two free numbers. */
export const BURST = {
  /** a: block id */
  block: 1,
  /** a: index into MOB_LIST */
  mobHit: 2,
  /** a: count, c: colour */
  puff: 3,
  /** a: index into MOB_LIST */
  bossSummon: 4,
  /** a: index into MOB_LIST */
  bossDeath: 5,
  /** a: index into MOB_LIST */
  bossPhase: 6,
  /** a: radius */
  slamRing: 7,
  eruption: 8,
  /** a: body height */
  teleport: 9,
  /** a: half-width */
  footfall: 10,
  forgeSmoke: 11,
  /** A creature called up by a boss: a: colour */
  summoned: 12,
} as const;

/** Ranges the positional scopes use (blocks). */
export const SOUND_R = 40, BURST_R = 64, FLOAT_R = 32;
