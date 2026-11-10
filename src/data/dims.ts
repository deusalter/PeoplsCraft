// Per-dimension environment: sky behaviour, fog and ambient light.
export interface DimEnv {
  name: string; hasSky: boolean;
  fixedTime: number | null;                // null = normal day/night cycle
  zenith: [number, number, number] | null; // overrides (linear RGB) when not null
  horizon: [number, number, number] | null;
  ambient: [number, number, number];
  skyLight: [number, number, number] | null;
  fogScale: number;                        // multiplies fog distance (1 = render distance)
  clouds: boolean; stars: number; aurora: [number, number, number];
  cloudY: number;                          // bottom of the cloud layer
  mist: [number, number];                  // height mist: density per block at the base height, base height
  grade: { sat: number; tint: [number, number, number]; bloom: number };   // final colour grade and bloom strength
  music: string;
}
export const DIMS: DimEnv[] = [
  { name: 'Overworld', hasSky: true, fixedTime: null, zenith: null, horizon: null, ambient: [0.013, 0.015, 0.022], skyLight: null, fogScale: 1, clouds: true, stars: 0, aurora: [0, 0, 0], cloudY: 196, mist: [0.0012, 96], grade: { sat: 1.1, tint: [1, 1, 1], bloom: 0.16 }, music: 'overworld' },
  { name: 'Gloomroot Hollows', hasSky: false, fixedTime: 0.75, zenith: [0.002, 0.007, 0.009], horizon: [0.006, 0.022, 0.026], ambient: [0.022, 0.04, 0.046], skyLight: [0, 0, 0], fogScale: 0.5, clouds: false, stars: 0, aurora: [0, 0, 0], cloudY: 0, mist: [0.004, 32], grade: { sat: 1.2, tint: [0.92, 1.02, 1.06], bloom: 0.3 }, music: 'hollows' },
  { name: 'The Skyrift', hasSky: true, fixedTime: 0.035, zenith: [0.03, 0.03, 0.14], horizon: [0.62, 0.3, 0.5], ambient: [0.03, 0.03, 0.05], skyLight: [0.34, 0.32, 0.5], fogScale: 1, clouds: true, stars: 0.8, aurora: [0.1, 0.5, 0.42], cloudY: 60, mist: [0.0035, 100], grade: { sat: 1.15, tint: [1.05, 0.97, 1.06], bloom: 0.22 }, music: 'rift' },
];
