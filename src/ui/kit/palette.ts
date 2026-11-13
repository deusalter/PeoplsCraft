// The 47 colours of the interface (direction, section 2), in the order of its table. A colour is used by name in
// code and by its one-character code in pixel maps; every other value is derived from this list.

const TABLE = [
  ['root.0', '#0c0d13', 'K'],
  ['root.1', '#191b26', 'k'],
  ['root.2', '#2a2d3c', 'j'],
  ['root.3', '#454a5e', 'h'],
  ['root.4', '#8b92a8', 'g'],
  ['salt', '#f7f2e3', 'W'],
  ['clay.lt', '#e3d7ba', 'L'],
  ['clay.face', '#c9b896', 'F'],
  ['clay.sh', '#a68d6e', 'S'],
  ['clay.dk', '#7d6756', 'D'],
  ['clay.pit', '#4f403c', 'Z'],
  ['timber.hi', '#f0c98d', 'e'],
  ['timber.lt', '#d7a265', 'f'],
  ['timber.face', '#b98049', 'T'],
  ['timber.sh', '#8f5a36', 't'],
  ['timber.dk', '#663d2c', 'U'],
  ['timber.pit', '#402625', 'X'],
  ['stone.hi', '#e4e8dc', 'A'],
  ['stone.lt', '#c3cab9', 'G'],
  ['stone.face', '#9da695', 'H'],
  ['stone.sh', '#6f7a76', 'J'],
  ['stone.dk', '#4e585d', 'M'],
  ['stone.pit', '#323844', 'z'],
  ['ink', '#2b1f2e', 'I'],
  ['ink.faded', '#5c4c56', 'i'],
  ['blood.lt', '#f2785c', 'r'],
  ['blood', '#c9372f', 'R'],
  ['blood.dk', '#7c1c2b', 'q'],
  ['ember.hi', '#ffe08a', 'y'],
  ['ember.lt', '#f7b54a', 'o'],
  ['ember', '#dd7a26', 'O'],
  ['ember.dk', '#8a3a1a', 'u'],
  ['growth.lt', '#b5e36b', 'n'],
  ['growth', '#63ad3c', 'N'],
  ['growth.dk', '#235c34', 'm'],
  ['arm.lt', '#8fd3f5', 'b'],
  ['arm', '#3d8fdb', 'B'],
  ['arm.dk', '#28488f', 'd'],
  ['cyan.lt', '#58e6d9', 'c'],
  ['cyan.dk', '#0b5a66', 'C'],
  ['violet.lt', '#c39bff', 'v'],
  ['violet.dk', '#5b34a6', 'V'],
  ['dusk.lt', '#ff9e57', 'a'],
  ['rose.lt', '#ff6f9c', 'p'],
  ['rose.dk', '#96164a', 'P'],
  ['gilt.dk', '#6b4d08', 'Y'],
  ['blood.pit', '#4a1606', 'Q'],
] as const;

export type Colour = (typeof TABLE)[number][0];
export type Ramp = 'clay' | 'timber' | 'stone';
export type Role = 'hi' | 'lt' | 'face' | 'sh' | 'dk' | 'pit';

export const ROLES: readonly Role[] = ['hi', 'lt', 'face', 'sh', 'dk', 'pit'];
export const RAMPS: readonly Ramp[] = ['clay', 'timber', 'stone'];

export const COLOURS: readonly Colour[] = TABLE.map((r) => r[0]);
export const HEX: readonly string[] = TABLE.map((r) => r[1]);
export const CODE: readonly string[] = TABLE.map((r) => r[2]);
/** r, g, b of each colour by index. */
export const RGB: readonly (readonly [number, number, number])[] = TABLE.map((r) => {
  const n = parseInt(r[1].slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});

const INDEX = new Map<string, number>(TABLE.map((r, i) => [r[0], i]));
const BY_CODE = new Map<string, number>(TABLE.map((r, i) => [r[2], i]));

if (INDEX.size !== 47 || BY_CODE.size !== 47) throw new Error('palette: names or codes are not unique');

export function isColour(name: string): name is Colour { return INDEX.has(name); }
export function isRole(name: string): name is Role { return (ROLES as readonly string[]).includes(name); }

/** The index of a colour, which is what pixel maps and the grid surface store. */
export function ci(c: Colour): number {
  const i = INDEX.get(c);
  if (i === undefined) throw new Error(`palette: no colour ${c}`);
  return i;
}
export function byCode(code: string): number | undefined { return BY_CODE.get(code); }

const RAMP_TABLE: Record<Ramp, readonly Colour[]> = {
  clay: ['salt', 'clay.lt', 'clay.face', 'clay.sh', 'clay.dk', 'clay.pit'],
  timber: ['timber.hi', 'timber.lt', 'timber.face', 'timber.sh', 'timber.dk', 'timber.pit'],
  stone: ['stone.hi', 'stone.lt', 'stone.face', 'stone.sh', 'stone.dk', 'stone.pit'],
};

export function tone(ramp: Ramp, role: Role): Colour { return RAMP_TABLE[ramp][ROLES.indexOf(role)]; }
export function toneIndex(ramp: Ramp, roleIdx: number): number { return ci(RAMP_TABLE[ramp][roleIdx]); }

/** Grades 0 to 6: the tone on a dark plate, the tone on a light face, the tooltip's frame. */
export const GRADES: readonly { name: string; dark: Colour; light: Colour; frame: Colour }[] = [
  { name: 'Surface', dark: 'salt', light: 'ink', frame: 'root.4' },
  { name: 'Upper', dark: 'growth.lt', light: 'growth.dk', frame: 'growth.lt' },
  { name: 'Deep', dark: 'cyan.lt', light: 'cyan.dk', frame: 'cyan.lt' },
  { name: 'Hollow', dark: 'violet.lt', light: 'violet.dk', frame: 'violet.lt' },
  { name: 'Island', dark: 'dusk.lt', light: 'ember.dk', frame: 'dusk.lt' },
  { name: 'Floor', dark: 'rose.lt', light: 'rose.dk', frame: 'rose.lt' },
  { name: 'Old', dark: 'ember.hi', light: 'gilt.dk', frame: 'ember.hi' },
];

/** The colour of each of the eight seats, 1 to 8 (index 0 is seat 1). */
export const SEATS: readonly Colour[] = ['arm.lt', 'growth.lt', 'ember.lt', 'rose.lt', 'cyan.lt', 'violet.lt', 'blood.lt', 'salt'];

/** Colours by meaning, on dark and on a light face. */
export const MEANING = {
  plain: { dark: 'salt', light: 'ink' },
  less: { dark: 'root.4', light: 'ink.faded' },
  better: { dark: 'growth.lt', light: 'growth.dk' },
  worse: { dark: 'blood.lt', light: 'blood.dk' },
  link: { dark: 'arm.lt', light: 'arm.dk' },
} as const satisfies Record<string, { dark: Colour; light: Colour }>;

/** The opaque colour a wash is drawn as in strict mode. */
export function washStandIn(c: Colour): Colour { return c === 'root.0' ? 'root.1' : c; }
