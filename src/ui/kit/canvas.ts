// The only file that touches a 2D context. Every draw is a fillRect or a drawImage at whole device pixels.
import { type Colour, HEX, RGB, ci } from './palette';
import { type PixelMap, type Variant, toRGBA, variantKey } from './pixmap';
import { type IconImage, type Look, BaseSurface } from './surface';

export type Ctx = CanvasRenderingContext2D;

export function context(c: HTMLCanvasElement): Ctx {
  const ctx = c.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('canvas: no 2D context');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Paints a map onto a canvas at one pixel to the unit. */
export function paintMap(ctx: Ctx, m: PixelMap, x: number, y: number, v: Variant = {}): void {
  ctx.putImageData(new ImageData(toRGBA(m, v), m.w, m.h), x, y);
}

interface Slot { page: HTMLCanvasElement; x: number; y: number }

const PAGE = 1024;

/**
 * Every painted part, packed once into pages at one pixel to the unit, in shelves with a clear pixel between
 * neighbours so that a scaled copy can never take a neighbour's edge.
 */
export class Atlas {
  private pages: { canvas: HTMLCanvasElement; ctx: Ctx; x: number; y: number; row: number }[] = [];
  private slots = new Map<string, Slot>();
  private imageIds = new WeakMap<object, number>();
  private nextImage = 1;

  get size(): number { return this.slots.size; }
  get pageCount(): number { return this.pages.length; }

  private place(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx; x: number; y: number } {
    if (w + 1 > PAGE || h + 1 > PAGE) throw new Error(`atlas: ${w} by ${h} is larger than a page`);
    let p = this.pages[this.pages.length - 1];
    if (p && p.x + w + 1 > PAGE) { p.x = 0; p.y += p.row + 1; p.row = 0; }
    if (!p || p.y + h + 1 > PAGE) {
      const canvas = document.createElement('canvas');
      canvas.width = PAGE; canvas.height = PAGE;
      p = { canvas, ctx: context(canvas), x: 0, y: 0, row: 0 };
      this.pages.push(p);
    }
    const at = { canvas: p.canvas, ctx: p.ctx, x: p.x, y: p.y };
    p.x += w + 1;
    p.row = Math.max(p.row, h);
    return at;
  }

  map(m: PixelMap, v: Variant): Slot {
    const key = variantKey(m, v);
    let s = this.slots.get(key);
    if (!s) {
      const at = this.place(m.w, m.h);
      paintMap(at.ctx, m, at.x, at.y, v);
      s = { page: at.canvas, x: at.x, y: at.y };
      this.slots.set(key, s);
    }
    return s;
  }

  image(img: IconImage, look: Look, flat: Colour): Slot {
    let id = this.imageIds.get(img);
    if (!id) { id = this.nextImage++; this.imageIds.set(img, id); }
    const key = `img${id}|${look}|${look === 'flat' ? flat : ''}`;
    let s = this.slots.get(key);
    if (!s) {
      const at = this.place(16, 16);
      const px = new Uint8ClampedArray(16 * 16 * 4);
      const [fr, fg, fb] = RGB[ci(flat)];
      for (let i = 0; i < 256; i++) {
        if (img.rgba[i * 4 + 3] < 128) continue;
        if (look === 'flat') { px[i * 4] = fr; px[i * 4 + 1] = fg; px[i * 4 + 2] = fb; }
        else { px[i * 4] = img.rgba[i * 4]; px[i * 4 + 1] = img.rgba[i * 4 + 1]; px[i * 4 + 2] = img.rgba[i * 4 + 2]; }
        px[i * 4 + 3] = 255;
      }
      at.ctx.putImageData(new ImageData(px, 16, 16), at.x, at.y);
      s = { page: at.canvas, x: at.x, y: at.y };
      this.slots.set(key, s);
    }
    return s;
  }
}

/** Draws to a canvas: a unit is `s` by `s` device pixels from the grid's origin. */
export class CanvasSurface extends BaseSurface {
  constructor(private ctx: Ctx, readonly s: number, readonly ox: number, readonly oy: number, w: number, h: number, private atlas: Atlas) {
    super(w, h);
    ctx.imageSmoothingEnabled = false;
  }

  /** Clears the whole canvas, the device pixels outside the grid included. */
  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  protected rect(x: number, y: number, w: number, h: number, c: number): void {
    const { s } = this;
    this.ctx.fillStyle = HEX[c];
    this.ctx.fillRect(this.ox + x * s, this.oy + y * s, w * s, h * s);
  }

  protected washRect(x: number, y: number, w: number, h: number, c: number, quarters: number): void {
    const { s } = this;
    const [r, g, b] = RGB[c];
    this.ctx.fillStyle = `rgba(${r},${g},${b},${quarters / 4})`;
    this.ctx.fillRect(this.ox + x * s, this.oy + y * s, w * s, h * s);
  }

  protected blit(m: PixelMap, v: Variant, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    const a = this.atlas.map(m, v), { s } = this;
    this.ctx.drawImage(a.page, a.x + sx, a.y + sy, sw, sh, this.ox + dx * s, this.oy + dy * s, dw * s, dh * s);
  }

  protected blitImage(img: IconImage, look: Look, flat: Colour, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number): void {
    const a = this.atlas.image(img, look, flat), { s } = this;
    this.ctx.drawImage(a.page, a.x + sx, a.y + sy, sw, sh, this.ox + dx * s, this.oy + dy * s, sw * s, sh * s);
  }
}

/** Makes a canvas for the interface: no smoothing, no CSS scaling of its own pixels. */
export function makeCanvas(id: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.id = id;
  c.style.imageRendering = 'pixelated';
  return c;
}
