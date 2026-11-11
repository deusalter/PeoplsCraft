/** Light as the spawn and sun-burn rules need it, 0..15 each. Sim code reads light only through this. */
export interface LightSource {
  sky(x: number, y: number, z: number): number;
  block(x: number, y: number, z: number): number;
}
