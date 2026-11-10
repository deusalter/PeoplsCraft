// Generators for the two extra dimensions. Filled in by the progression milestone.
import type { Generator } from './types';
import { OverworldGen } from './overworld';

export function makeDimGen(seed: number, _dim: number): Generator {
  return new OverworldGen(seed);
}
