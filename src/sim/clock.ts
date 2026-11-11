// Simulation time: the fixed step, and what the world clock (counted in days) means for day and night.
import { smoothstep } from '../core/noise';
import { DIMS } from '../data/dims';

export const STEP = 1 / 60;

export const isNight = (clock: number): boolean => { const t = clock % 1; return t > 0.52 && t < 0.98; };

/** Daylight, 0..1: the number the renderer lights the sky with (Gfx.update), from the clock alone. */
export function dayAmount(clock: number, dim: number): number {
  const a = (DIMS[dim].fixedTime ?? clock % 1) * Math.PI * 2, x = Math.cos(a), y = Math.sin(a), z = 0.32;
  // the sun's elevation, in the renderer's own order of operations so the two agree to the last bit
  return smoothstep(-0.1, 0.22, y * (1 / Math.sqrt(x * x + y * y + z * z)));
}
