// The states on the sample body, as names.json names them, in the order the HUD's status frames stand from the left
// and the pack's States tab lists them: what harms first, then what helps, soonest gone first.

export interface BodyState {
  icon: string;
  name: string;
  good: boolean;
  seconds: number;
  /** What it does, short, said before the time left. */
  does: string;
  /** How it ends, for its tooltip. */
  ends: string;
}

export const BODY_STATES: BodyState[] = [
  { icon: 'spore_sac', name: 'Spore in a wound', good: false, seconds: 38, does: 'Life drains', ends: 'A salve ends it' },
  { icon: 'swiftroot', name: 'Quickened', good: true, seconds: 8, does: '+20% speed', ends: 'From Flower Tea; ends when the time runs out' },
  { icon: 'ironbark', name: 'Toughened', good: true, seconds: 151, does: '+6 defence', ends: 'From a Bark Draught; ends when the time runs out' },
  { icon: 'loaf', name: 'Well Fed', good: true, seconds: 252, does: 'Hunger holds', ends: 'Ends when the time runs out' },
];
