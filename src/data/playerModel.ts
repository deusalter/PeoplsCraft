// The body other players are drawn with, in the box format of the creatures (see Part in data/mobs.ts):
// 1.8 blocks tall on a 32-unit grid, standing on y = 0 and facing +z. Its sleeve, bracer and hand are the
// colours of the arm the first-person view draws, so the arm a player sees is the arm others see.
// The head carries no face: the texture pass gives it one.
import type { Part } from './mobs';

/** One grid unit: the body is 32 of them tall. */
const U = 1.8 / 32;
const SHIRT = 0x4a6a82, HEM = 0x385468, SEAM = 0x5f849c, BRACER = 0x9a6b3c, STRAP = 0x5c3e22, SKIN = 0xdba27a, KNUCKLE = 0xc48e68;
const TROUSERS = 0x3e3a36, BOOT = 0x4e3420, HAIR = 0x3a2a1e;

/** Heights of the joints above the feet, and the arm's two halves. */
export const HIP = 12 * U, NECK = 12 * U, SHOULDER = 10.6 * U, UPPER = 6 * U, FORE = 6 * U;
/** From the right forearm's joint (the elbow) to the middle of the fist: where a held item sits. */
export const HAND: [number, number, number] = [0, -FORE + 1.2 * U, 0];

const leg = (side: number, tag: 'legA' | 'legB'): Part[] => [
  { s: [4 * U, 12 * U, 4 * U], p: [side * 2 * U, HIP, 0], o: [0, -6 * U, 0], c: TROUSERS, a: tag, t: 7 },
  { s: [4.3 * U, 2.6 * U, 4.6 * U], p: [side * 2 * U, HIP, 0], o: [0, -10.7 * U, 0.15 * U], c: BOOT, a: tag },
];
/** `side` -1 is the right arm (+z forward, so -x is the body's right), the one that holds things. */
const arm = (side: number, up: 'armA' | 'armB', fore: 'foreA' | 'foreB'): Part[] => {
  const n = up, x = side * 5.6 * U;
  return [
    { s: [3.6 * U, UPPER, 3.6 * U], p: [x, SHOULDER, 0], o: [0, -UPPER / 2 + 0.9 * U, 0], c: SHIRT, a: up, n, par: 'body' },
    { s: [0.9 * U, UPPER, 0.4 * U], p: [x, SHOULDER, 0], o: [0, -UPPER / 2 + 0.9 * U, 1.9 * U], c: SEAM, a: up, par: 'body' },
    { s: [3.4 * U, 2 * U, 3.4 * U], p: [0, -UPPER + 0.9 * U, 0], o: [0, -1 * U, 0], c: SHIRT, a: fore, n: fore, par: n },
    { s: [3.8 * U, 1.7 * U, 3.8 * U], p: [0, -UPPER + 0.9 * U, 0], o: [0, -2.6 * U, 0], c: BRACER, a: fore, par: n },
    { s: [3.9 * U, 0.5 * U, 3.9 * U], p: [0, -UPPER + 0.9 * U, 0], o: [0, -2.9 * U, 0], c: STRAP, a: fore, par: n },
    { s: [3.2 * U, 2.6 * U, 3.2 * U], p: [0, -UPPER + 0.9 * U, 0], o: [0, -4.75 * U, 0], c: SKIN, a: fore, par: n },
    { s: [3.25 * U, 0.6 * U, 1.2 * U], p: [0, -UPPER + 0.9 * U, 0], o: [0, -5.35 * U, 1.1 * U], c: KNUCKLE, a: fore, par: n },
  ];
};

/** Legs first, then the waist every upper part rides on (`body`: the lean of a sneak), the arms on it, the head on it. */
export const PLAYER_PARTS: Part[] = [
  ...leg(-1, 'legA'), ...leg(1, 'legB'),
  { s: [8 * U, 12 * U, 4 * U], p: [0, HIP, 0], o: [0, 6 * U, 0], c: SHIRT, a: 'body', n: 'body', t: 7 },
  { s: [8.2 * U, 1.3 * U, 4.2 * U], p: [0, HIP, 0], o: [0, 0.9 * U, 0], c: HEM, a: 'body' },
  { s: [8.3 * U, 1 * U, 4.3 * U], p: [0, HIP, 0], o: [0, 1.9 * U, 0], c: STRAP, a: 'body' },
  ...arm(-1, 'armA', 'foreA'), ...arm(1, 'armB', 'foreB'),
  { s: [8 * U, 8 * U, 8 * U], p: [0, NECK, 0], o: [0, 4 * U, 0], c: SKIN, a: 'head', n: 'head', par: 'body' },
  { s: [8.4 * U, 2 * U, 8.4 * U], p: [0, NECK, 0], o: [0, 7.4 * U, -0.2 * U], c: HAIR, a: 'head', par: 'body' },
  { s: [8.4 * U, 4.6 * U, 1.6 * U], p: [0, NECK, 0], o: [0, 4.9 * U, -3.6 * U], c: HAIR, a: 'head', par: 'body' },
];

/** Worn armour, by armour slot (0 head, 1 body, 2 legs): boxes a little larger than what they cover, riding the same joints.
 *  Colour 0 stands for the piece's own colour; a darker trim is derived from it. */
export const ARMOR_PARTS: [Part[], Part[], Part[]] = [
  [
    { s: [9 * U, 3.4 * U, 9 * U], p: [0, NECK, 0], o: [0, 7 * U, 0], c: 0, a: 'head', par: 'body', t: 6 },
    { s: [9 * U, 4.2 * U, 1.2 * U], p: [0, NECK, 0], o: [0, 3.6 * U, -4.1 * U], c: 0, a: 'head', par: 'body' },
    { s: [1.1 * U, 4 * U, 7.6 * U], p: [0, NECK, 0], o: [-4.15 * U, 4 * U, -0.4 * U], c: 0, a: 'head', par: 'body' },
    { s: [1.1 * U, 4 * U, 7.6 * U], p: [0, NECK, 0], o: [4.15 * U, 4 * U, -0.4 * U], c: 0, a: 'head', par: 'body' },
    { s: [9.2 * U, 0.8 * U, 9.2 * U], p: [0, NECK, 0], o: [0, 5.2 * U, 0], c: 1, a: 'head', par: 'body' },
  ],
  [
    { s: [8.8 * U, 8 * U, 4.8 * U], p: [0, HIP, 0], o: [0, 7.8 * U, 0], c: 0, a: 'body', t: 6 },
    { s: [4.4 * U, 1.8 * U, 4.4 * U], p: [-5.6 * U, SHOULDER, 0], o: [0, 0.6 * U, 0], c: 1, a: 'armA', par: 'body' },
    { s: [4.4 * U, 1.8 * U, 4.4 * U], p: [5.6 * U, SHOULDER, 0], o: [0, 0.6 * U, 0], c: 1, a: 'armB', par: 'body' },
  ],
  [
    { s: [4.6 * U, 6.5 * U, 4.6 * U], p: [-2 * U, HIP, 0], o: [0, -3.3 * U, 0], c: 0, a: 'legA', t: 6 },
    { s: [4.6 * U, 6.5 * U, 4.6 * U], p: [2 * U, HIP, 0], o: [0, -3.3 * U, 0], c: 0, a: 'legB', t: 6 },
    { s: [8.8 * U, 1.6 * U, 4.8 * U], p: [0, HIP, 0], o: [0, 0.4 * U, 0], c: 1, a: 'body' },
  ],
];
