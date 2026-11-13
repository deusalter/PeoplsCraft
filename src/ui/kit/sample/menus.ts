// Sample data for the full-screen menus: the build, the worlds saved in this browser, what servers answer.

export const BUILD = '0.1.0';

/** Said on the title when it is true that nothing will be saved. */
export const UNSAVED = 'Private window: nothing will be saved';

export interface WorldRow { name: string; seed: number; played: string; level: number; openElsewhere?: boolean }

/**
 * Newest first. Players name their worlds, at most 28 characters, here after the places of names.json; seven rows are
 * more than the well shows, so it scrolls.
 */
export const WORLDS: WorldRow[] = [
  { name: 'Hearth on the Yavas', seed: 4471, played: '12 November', level: 14 },
  { name: 'Below the Kankāl Altar', seed: 90233, played: '9 November', level: 22, openElsewhere: true },
  { name: 'Kusum', seed: 118, played: '2 November', level: 3 },
  { name: 'Tusāravan pines under Sānu', seed: 55501234, played: '28 October', level: 41 },
  { name: 'Island Meadow', seed: 77, played: '20 October', level: 30 },
  { name: 'Jīmūt over the Kāsa', seed: 3021, played: '4 October', level: 9 },
  { name: 'Davalavan', seed: 66190, played: '1 October', level: 1 },
];

export interface ServerAnswer {
  ok: boolean;
  text: string;
  /** The field a refusal is about, which is framed in blood with the refusal under it. */
  field?: 'address' | 'name' | 'password';
}

/** What a server can say to a join, plainly. */
export const ANSWERS: Record<string, ServerAnswer> = {
  here: { ok: true, text: 'Spark, 3 of 8 here' },
  taken: { ok: false, text: 'That name is taken', field: 'name' },
  password: { ok: false, text: 'Wrong password', field: 'password' },
  full: { ok: false, text: 'The server is full' },
  version: { ok: false, text: 'This server runs another version' },
  none: { ok: false, text: 'No answer' },
};

/** What loading says as it goes, in order. */
export const LOADING_STEPS = ['Laying the ground', 'Raising the villages', 'Lighting the hearths', 'Coming up'];
