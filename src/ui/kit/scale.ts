// The one scale of the interface (direction, section 3). Everything here is in device pixels or units.

export const MIN_W = 320;
export const MIN_H = 240;
export const MAX_SCALE = 8;

export interface Layout {
  /** Device pixels to the unit; 0 when the window is too small to draw in. */
  s: number;
  /** The window in device pixels. */
  W: number; H: number;
  /** The virtual screen in units. */
  w: number; h: number;
  /** The grid's origin in device pixels. */
  ox: number; oy: number;
  /** The stage, in units on the virtual screen: where the HUD is laid out. */
  stage: { x: number; y: number; w: number; h: number };
  wide: boolean;
}

/** The largest scale at which a virtual screen of 320 by 240 fits, held between 1 and 8; 0 under 320 by 240. */
export function fit(W: number, H: number): number {
  const f = Math.min(Math.floor(W / MIN_W), Math.floor(H / MIN_H));
  return f < 1 ? 0 : Math.min(MAX_SCALE, f);
}

/** The layout for a window, with the player's choice of scale (`'auto'` or a whole number). */
export function layout(W: number, H: number, choice: 'auto' | number = 'auto'): Layout {
  const f = fit(W, H);
  const s = f === 0 ? 0 : choice === 'auto' ? f : Math.max(1, Math.min(f, Math.floor(choice)));
  if (s === 0) return { s: 0, W, H, w: 0, h: 0, ox: 0, oy: 0, stage: { x: 0, y: 0, w: 0, h: 0 }, wide: false };
  const w = Math.floor(W / s), h = Math.floor(H / s);
  const sw = Math.min(w, Math.floor((h * 16) / 9));
  return {
    s, W, H, w, h,
    ox: Math.floor((W - w * s) / 2), oy: Math.floor((H - h * s) / 2),
    stage: { x: Math.floor((w - sw) / 2), y: 0, w: sw, h },
    wide: w >= 400,
  };
}

/** Where a window of `w` by `h` stands: centred, the odd unit to the left and top. */
export function centred(screenW: number, screenH: number, w: number, h: number): { x: number; y: number } {
  return { x: Math.floor((screenW - w) / 2), y: Math.floor((screenH - h) / 2) };
}
