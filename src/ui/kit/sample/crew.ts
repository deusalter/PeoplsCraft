// A sample crew of eight on the server Spark: the players' own handles, their seats, levels, jobs and where they are.
// The handles are what players type into the join screen, not names of the world; the last is sixteen characters long.

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
  /** What they wear: head, body, legs and two trinkets, as icon keys; null where nothing is worn. */
  worn: (string | null)[];
}

export const CREW: CrewMember[] = [
  { seat: 1, name: 'Rook', level: 14, job: 'Melee', place: 'Yavas', online: true, worn: ['helm', 'plate', 'greaves', 'pendant', null] },
  { seat: 2, name: 'Mira_K', level: 12, job: 'Crystal-work', place: 'Yavas', at: [38, -22], online: true, worn: [null, 'plate', null, 'pendant', 'crystal'] },
  { seat: 3, name: 'tamsin', level: 15, job: 'Ranged', place: 'Panka', at: [-140, 96], online: true, worn: ['helm', null, 'greaves', null, null] },
  { seat: 4, name: 'Pellwright', level: 9, job: "Cutter's trade", place: 'a Sealed Store', at: [430, 260], online: true, worn: [null, null, null, null, null] },
  { seat: 5, name: 'fern42', level: 11, job: 'Totem', place: 'Davalavan', at: [-90, 260], online: true, worn: [null, 'plate', 'greaves', 'pendant', null] },
  { seat: 6, name: 'Oskar', level: 7, job: 'Melee', place: 'Yavas', at: [-60, -180], online: true, worn: ['helm', 'plate', null, null, null] },
  { seat: 7, name: 'Jun', level: 3, job: 'Ranged', place: 'Yavas', at: [6, 4], online: false, worn: [null, null, null, null, null] },
  { seat: 8, name: 'brackenfoot_1999', level: 21, job: "Cutter's trade", place: 'Kāsa', at: [300, 170], online: true, worn: ['helm', 'plate', 'greaves', 'pendant', 'crystal'] },
];
