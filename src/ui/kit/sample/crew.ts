// The one sample crew of eight on the server Spark, used by every screen that shows a player: the players' own handles,
// their seats, levels, jobs, where they are and how they fare. The handles are what players type into the join screen,
// not names of the world: one to sixteen of A to Z, a to z, 0 to 9, space, _ and -, so they carry no macron, and the
// last is the longest a handle can be. Rook, seat 1, is the one who plays; Jun is away.

export type Job = 'Melee' | 'Ranged' | 'Crystal-work' | 'Totem' | "Cutter's trade";

export interface CrewMember {
  seat: number;
  name: string;
  level: number;
  job: Job;
  /** The realm and country they stand in. */
  place: string;
  /** Strides from oneself on the chart, east and south; left out for oneself. */
  at?: [number, number];
  online: boolean;
  /** Life, 0 to 1; 0 is fallen. */
  life: number;
  /** Bars of connection, 0 to 3. */
  bars: number;
  /** What they wear: head, body, legs and two trinkets, as icon keys; null where nothing is worn. */
  worn: (string | null)[];
}

export const CREW: CrewMember[] = [
  { seat: 1, name: 'Rook', level: 14, job: 'Melee', place: 'Yavas', online: true, life: 0.84, bars: 3, worn: ['helm', 'plate', 'greaves', 'pendant', null] },
  { seat: 2, name: 'Mira_K', level: 12, job: 'Crystal-work', place: 'Yavas', at: [38, -22], online: true, life: 1, bars: 3, worn: [null, 'plate', null, 'pendant', 'crystal'] },
  { seat: 3, name: 'tamsin', level: 15, job: 'Ranged', place: 'Panka', at: [-140, 96], online: true, life: 0.35, bars: 2, worn: ['helm', null, 'greaves', null, null] },
  { seat: 4, name: 'Pellwright', level: 9, job: "Cutter's trade", place: 'a Sealed Store', at: [430, 260], online: true, life: 0.92, bars: 3, worn: [null, null, null, null, null] },
  { seat: 5, name: 'fern42', level: 11, job: 'Totem', place: 'Davalavan', at: [-90, 260], online: true, life: 0.6, bars: 1, worn: [null, 'plate', 'greaves', 'pendant', null] },
  { seat: 6, name: 'Oskar', level: 7, job: 'Melee', place: 'Yavas', at: [-60, -180], online: true, life: 0, bars: 3, worn: ['helm', 'plate', null, null, null] },
  { seat: 7, name: 'Jun', level: 3, job: 'Ranged', place: 'Yavas', at: [6, 4], online: false, life: 1, bars: 0, worn: [null, null, null, null, null] },
  { seat: 8, name: 'brackenfoot_1999', level: 21, job: "Cutter's trade", place: 'Kāsa', at: [300, 170], online: true, life: 0.71, bars: 0, worn: ['helm', 'plate', 'greaves', 'pendant', 'crystal'] },
];

/** The server the crew plays on, and how many of its eight seats are here now. */
export const SERVER = 'Spark';
export const HERE = CREW.filter((m) => m.online).length;

/** Strides from oneself, or nothing for oneself. */
export function strides(m: CrewMember): number | undefined {
  return m.at ? Math.round(Math.hypot(m.at[0], m.at[1])) : undefined;
}

/** A crew member by seat. */
export function seat(n: number): CrewMember { return CREW.find((m) => m.seat === n)!; }
