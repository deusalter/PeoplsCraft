import { POINTER } from './art/pointer';
import { Atlas, CanvasSurface, context, makeCanvas } from './canvas';
import { measure } from './font/measure';
import type { Colour } from './palette';
import { type Layout, layout } from './scale';
import { type IconSource, type Surface, BaseSurface, GridSurface } from './surface';
import { TextEntry } from './textentry';
import { paintTip, placeTip, tipBox } from './tooltip';
import {
  type Cue, type DragEv, type FieldState, type Held, type KeyEv, type Layer, type Live, type Node, type PointerEv, type Ui,
  LAYERS,
} from './node';

export interface RootOptions {
  /** Where the canvases and the input go; the document's body when not given. */
  host?: HTMLElement;
  icons?: IconSource;
  /** Washes drawn as their opaque stand-ins, for the pixel-grid check. */
  strict?: boolean;
  scale?: 'auto' | number;
  /** Keys the interface did not use, for the game's bindings. */
  onKey?(e: KeyboardEvent): void;
  onCue?(c: Cue): void;
}

export interface MountOptions {
  build: (ui: Ui) => Node;
  /** Built again whenever this returns a new value. */
  rev?: () => unknown;
  /** Takes every press: nothing in a lower layer is hit while it is up. */
  modal?: boolean;
  /** Esc, or the screen's own close. */
  close?: () => void;
  /** A press that hit nothing of this layer: dropping a held stack into the world. */
  outside?: (e: PointerEv) => void;
}

interface Rect { x: number; y: number; w: number; h: number }
interface Placed { n: Node; ax: number; ay: number; clip: Rect | null; parent: Placed | null }
interface Mount extends MountOptions { tree: Node | null; placed: Placed[]; lastRev: unknown; stale: boolean }

const POINTER_CANVAS = 48;
const POINTER_AT = 16;
const DOUBLE_S = 0.3;
const BLINK_S = 0.5;

function takes(n: Node): boolean {
  return n.takes ?? !!(n.on || n.tip || n.focus || n.field);
}

function inside(p: Placed, x: number, y: number): boolean {
  if (x < p.ax || y < p.ay || x >= p.ax + p.n.w || y >= p.ay + p.n.h) return false;
  const c = p.clip;
  return !c || (x >= c.x && y >= c.y && x < c.x + c.w && y < c.y + c.h);
}

function intersect(a: Rect | null, b: Rect): Rect {
  if (!a) return b;
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
}

/** The interface's root: four layers of retained trees on one canvas, and everything the pointer and keys do to them. */
export class Root implements Ui {
  readonly canvas: HTMLCanvasElement;
  readonly pointerCanvas: HTMLCanvasElement;
  private ctx;
  private pctx;
  private atlas = new Atlas();
  private surface!: CanvasSurface;
  private psurface!: CanvasSurface;
  private entry: TextEntry;
  layout: Layout = layout(0, 0);
  private choice: 'auto' | number;
  private strict: boolean;
  private icons: IconSource;
  private mounts = new Map<Layer, Mount>();
  private t0 = performance.now();
  private dirty = true;
  private raf = 0;

  held: Held | null = null;
  private heldDrawn: Held | null = null;
  private px = -1;
  private py = -1;
  private pointerShown = false;
  private hover: Placed | null = null;
  private pressed: { p: Placed; button: number; x: number; y: number; dragging: boolean } | null = null;
  private lastPress: { id: string | Node; button: number; t: number } | null = null;
  private passed: Placed | null = null;
  private focusId: string | null = null;
  private focusVisible = false;
  private scrolls = new Map<string, number>();
  private fields = new Map<string, FieldState>();
  private restSince = 0;
  private tipShown = false;
  private wheelRest = 0;

  constructor(private opts: RootOptions = {}) {
    const host = opts.host ?? document.body;
    this.choice = opts.scale ?? 'auto';
    this.strict = !!opts.strict;
    this.icons = opts.icons ?? (() => null);
    this.canvas = makeCanvas('gui');
    Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', cursor: 'none', touchAction: 'none' });
    this.pointerCanvas = makeCanvas('gui-pointer');
    Object.assign(this.pointerCanvas.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', display: 'none', willChange: 'transform' });
    host.append(this.canvas, this.pointerCanvas);
    this.ctx = context(this.canvas);
    this.pctx = context(this.pointerCanvas);
    this.entry = new TextEntry(host, {
      changed: (s) => { this.byId(this.focusId)?.n.on?.text?.(s); this.dirty = true; },
      key: (e) => this.fieldKey(e),
      now: () => this.t,
    });
    this.observe();
    this.listen();
    this.raf = requestAnimationFrame(this.frame);
  }

  get w(): number { return this.layout.w; }
  get h(): number { return this.layout.h; }
  get t(): number { return (performance.now() - this.t0) / 1000; }

  // ---- size

  private observe(): void {
    const apply = (W: number, H: number) => this.resize(W, H);
    try {
      const ro = new ResizeObserver((es) => {
        const e = es[0];
        const d = e.devicePixelContentBoxSize?.[0];
        if (d) apply(d.inlineSize, d.blockSize);
        else apply(Math.round(e.contentRect.width * devicePixelRatio), Math.round(e.contentRect.height * devicePixelRatio));
      });
      ro.observe(this.canvas, { box: 'device-pixel-content-box' });
    } catch {
      const ro = new ResizeObserver(() => apply(Math.round(this.canvas.clientWidth * devicePixelRatio), Math.round(this.canvas.clientHeight * devicePixelRatio)));
      ro.observe(this.canvas);
    }
    apply(Math.round(this.canvas.clientWidth * devicePixelRatio), Math.round(this.canvas.clientHeight * devicePixelRatio));
  }

  private resize(W: number, H: number): void {
    if (W === this.layout.W && H === this.layout.H && this.surface) return;
    this.canvas.width = W;
    this.canvas.height = H;
    this.layout = layout(W, H, this.choice);
    const L = this.layout;
    this.surface = new CanvasSurface(this.ctx, Math.max(1, L.s), L.s ? L.ox : 0, L.s ? L.oy : 0, L.s ? L.w : W, L.s ? L.h : H, this.atlas);
    this.prepare(this.surface);
    const ps = Math.max(1, L.s);
    this.pointerCanvas.width = POINTER_CANVAS * ps;
    this.pointerCanvas.height = POINTER_CANVAS * ps;
    const cssPerDev = this.canvas.clientWidth ? this.canvas.clientWidth / W : 1 / devicePixelRatio;
    this.pointerCanvas.style.width = `${POINTER_CANVAS * ps * cssPerDev}px`;
    this.pointerCanvas.style.height = `${POINTER_CANVAS * ps * cssPerDev}px`;
    this.psurface = new CanvasSurface(this.pctx, ps, 0, 0, POINTER_CANVAS, POINTER_CANVAS, this.atlas);
    this.prepare(this.psurface);
    this.heldDrawn = null;
    for (const m of this.mounts.values()) m.stale = true;
    this.dirty = true;
  }

  private prepare(s: BaseSurface): void { s.setIcons(this.icons); s.strict = this.strict; }

  setScale(choice: 'auto' | number): void {
    this.choice = choice;
    const { W, H } = this.layout;
    this.layout = layout(0, 0);
    this.resize(W, H);
  }

  // ---- layers

  mount(layer: Layer, m: MountOptions): void {
    this.mounts.set(layer, { ...m, tree: null, placed: [], lastRev: undefined, stale: true });
    this.dirty = true;
  }

  unmount(layer: Layer): void {
    this.mounts.delete(layer);
    this.hover = null;
    this.pressed = null;
    this.dirty = true;
  }

  invalidate(layer?: Layer): void {
    for (const [l, m] of this.mounts) if (!layer || l === layer) m.stale = true;
    this.dirty = true;
  }

  wake(): void { this.dirty = true; }

  private rebuild(m: Mount): void {
    m.stale = false;
    m.lastRev = m.rev?.();
    m.tree = m.build(this);
    m.placed = [];
    const walk = (n: Node, ox: number, oy: number, clip: Rect | null, parent: Placed | null) => {
      for (const v of [n.x, n.y, n.w, n.h]) if (!Number.isInteger(v)) throw new Error(`node ${n.id ?? '?'}: ${v} is not a whole unit`);
      const p: Placed = { n, ax: ox + n.x, ay: oy + n.y, clip, parent };
      m.placed.push(p);
      if (n.field && n.id && !this.fields.has(n.id)) {
        this.fields.set(n.id, { value: n.field.value, start: n.field.value.length, end: n.field.value.length, compose: null, refusedAt: -1 });
      } else if (n.field && n.id && n.id !== this.focusId) {
        const f = this.fields.get(n.id)!;
        if (f.value !== n.field.value) { f.value = n.field.value; f.start = f.end = f.value.length; }
      }
      const kc = n.clip ? intersect(clip, { x: p.ax, y: p.ay, w: n.w, h: n.h }) : clip;
      for (const k of n.kids ?? []) walk(k, p.ax, p.ay, kc, p);
    };
    walk(m.tree, 0, 0, null, null);
  }

  private allPlaced(): Placed[] {
    const out: Placed[] = [];
    for (const l of LAYERS) { const m = this.mounts.get(l); if (m) out.push(...m.placed); }
    return out;
  }

  private byId(id: string | null): Placed | null {
    if (!id) return null;
    for (const p of this.allPlaced()) if (p.n.id === id) return p;
    return null;
  }

  private same(a: Placed | null, b: Placed | null): boolean {
    if (!a || !b) return a === b;
    return a.n === b.n || (!!a.n.id && a.n.id === b.n.id);
  }

  /** The topmost node that takes the pointer at a unit, and the topmost modal layer's mount if nothing was hit in it. */
  private hit(x: number, y: number): { p: Placed | null; modal: Mount | null } {
    for (let li = LAYERS.length - 1; li >= 0; li--) {
      const m = this.mounts.get(LAYERS[li]);
      if (!m) continue;
      for (let i = m.placed.length - 1; i >= 0; i--) {
        const p = m.placed[i];
        if (takes(p.n) && inside(p, x, y)) return { p, modal: null };
      }
      if (m.modal) return { p: null, modal: m };
    }
    return { p: null, modal: null };
  }

  private live(p: Placed): Live {
    const n = p.n;
    const isFocus = !!n.id && n.id === this.focusId;
    return {
      hover: this.same(this.hover, p),
      down: !!this.pressed && this.same(this.pressed.p, p) && (!this.pressed.dragging || this.same(this.hover, p)),
      focus: isFocus && this.focusVisible,
      t: this.t,
    };
  }

  // ---- state kept across rebuilds

  scroll(id: string): number { return this.scrolls.get(id) ?? 0; }
  setScroll(id: string, v: number): void { this.scrolls.set(id, v); this.invalidate(); }
  field(id: string): FieldState | undefined { return this.fields.get(id); }
  focused(): string | null { return this.focusId; }

  focusOn(id: string | null, byKey = false): void {
    this.focusId = id;
    this.focusVisible = byKey && id !== null;
    const p = this.byId(id);
    if (p?.n.field && p.n.id) this.attachField(p);
    else this.entry.detach();
    this.dirty = true;
  }

  refuse(id: string): void {
    const f = this.fields.get(id);
    if (f) f.refusedAt = this.t;
    this.cue('refuse');
    this.dirty = true;
  }

  cue(c: Cue): void { this.opts.onCue?.(c); }

  private attachField(p: Placed): void {
    const L = this.layout, r = this.canvas.getBoundingClientRect();
    const k = r.width / (L.W || 1);
    const st = this.fields.get(p.n.id!)!;
    this.entry.attach(p.n.field!, st, {
      left: r.left + (L.ox + p.ax * L.s) * k, top: r.top + (L.oy + p.ay * L.s) * k,
      width: p.n.w * L.s * k, height: p.n.h * L.s * k,
    });
  }

  // ---- painting

  private frame = (): void => {
    this.raf = requestAnimationFrame(this.frame);
    this.step();
  };

  /** Builds what is stale and paints if anything changed. Called each display frame; a script may call it too. */
  step(): void {
    let rebuilt = false;
    for (const m of this.mounts.values()) {
      if (!m.stale && m.rev && !Object.is(m.rev(), m.lastRev)) m.stale = true;
      if (m.stale && this.layout.s) { this.rebuild(m); rebuilt = true; }
    }
    if (rebuilt) {
      if (this.pressed) this.pressed.p = this.relink(this.pressed.p) ?? this.pressed.p;
      if (this.px >= 0) this.hoverAt(this.px, this.py, false);
      this.dirty = true;
    }
    const placed = this.allPlaced();
    if (placed.some((p) => p.n.anim)) this.dirty = true;
    const f = this.byId(this.focusId);
    if (f?.n.field) {
      const phase = Math.floor(this.t / BLINK_S);
      if (phase !== this.blinkPhase) { this.blinkPhase = phase; this.dirty = true; }
    }
    const tip = this.currentTip();
    if (!!tip !== this.tipShown) this.dirty = true;
    if (this.dirty) { this.dirty = false; this.paintTo(this.surface); }
    this.paintPointer();
  }
  private blinkPhase = -1;

  private relink(p: Placed): Placed | null {
    if (!p.n.id) return null;
    return this.byId(p.n.id);
  }

  private currentTip() {
    if (this.held || !this.hover || !this.pointerShown) return null;
    const p = this.hover;
    const tip = p.n.tip?.(this.live(p));
    if (!tip) return null;
    return this.t - this.restSince < (tip.delay ?? 0) ? null : tip;
  }

  /** Paints the whole interface onto a surface: the layers in order, then the tooltip. */
  paintTo(s: BaseSurface): void {
    if (s instanceof CanvasSurface) s.clear();
    if (!this.layout.s) {
      const msg = 'The window is too small';
      s.text(msg, Math.floor((s.w - measure(msg)) / 2), Math.floor((s.h - 10) / 2), 'salt', true);
      return;
    }
    for (const l of LAYERS) {
      const m = this.mounts.get(l);
      if (m?.tree) this.paintNode(s, m.tree, m.placed, { i: 0 });
    }
    const tip = this.currentTip();
    this.tipShown = !!tip;
    if (tip) {
      const b = tipBox(tip);
      const at = placeTip(b, this.px, this.py, s.w, s.h);
      paintTip(s, tip, b, at.x, at.y);
    }
  }

  private paintNode(s: Surface, n: Node, placed: Placed[], k: { i: number }): void {
    const p = placed[k.i++];
    s.translate(n.x, n.y);
    if (n.paint) n.paint(s, this.live(p));
    if (n.kids?.length) {
      if (n.clip) s.clip(0, 0, n.w, n.h);
      for (const kid of n.kids) this.paintNode(s, kid, placed, k);
      if (n.clip) s.unclip();
    }
    s.translate(-n.x, -n.y);
  }

  /** The same frame on a grid of palette indices, for the pixel-grid check. */
  gridFrame(): GridSurface {
    const g = new GridSurface(Math.max(1, this.layout.w), Math.max(1, this.layout.h));
    this.prepare(g);
    this.paintTo(g);
    return g;
  }

  private paintPointer(): void {
    const show = this.pointerShown && this.layout.s > 0;
    this.pointerCanvas.style.display = show ? 'block' : 'none';
    if (!show) return;
    const L = this.layout;
    const k = this.canvas.clientWidth / (L.W || 1);
    const dx = (L.ox + (this.px - POINTER_AT) * L.s) * k, dy = (L.oy + (this.py - POINTER_AT) * L.s) * k;
    this.pointerCanvas.style.transform = `translate(${dx}px, ${dy}px)`;
    const want = this.held ?? POINTER_HELD;
    if (want === this.heldDrawn && !this.held) return;
    this.heldDrawn = want;
    this.psurface.clear();
    want.paint(this.psurface, POINTER_AT, POINTER_AT);
  }

  // ---- input

  private unitAt(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect(), L = this.layout;
    const dx = (clientX - r.left) * (L.W / (r.width || 1)), dy = (clientY - r.top) * (L.H / (r.height || 1));
    const s = Math.max(1, L.s);
    return [Math.floor((dx - L.ox) / s), Math.floor((dy - L.oy) / s)];
  }

  private ev(p: Placed | null, x: number, y: number, button: number, e: MouseEvent, double = false): PointerEv {
    return { x: x - (p?.ax ?? 0), y: y - (p?.ay ?? 0), gx: x, gy: y, button, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, double };
  }

  private hoverAt(x: number, y: number, fromMove: boolean): void {
    const h = this.hit(x, y).p;
    if (!this.same(h, this.hover)) {
      this.hover?.n.on?.leave?.();
      this.hover = h;
      h?.n.on?.enter?.();
      this.restSince = this.t;
      this.dirty = true;
    } else if (h && fromMove) {
      if (this.tipShown) this.dirty = true;
      else this.restSince = this.t;
    }
  }

  private listen(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointerleave', () => { this.pointerShown = false; this.hoverAt(-9999, -9999, false); this.paintPointer(); });
    c.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private onMove(e: PointerEvent): void {
    const [x, y] = this.unitAt(e.clientX, e.clientY);
    this.pointerShown = true;
    if (this.focusVisible) { this.focusVisible = false; this.dirty = true; }
    if (x === this.px && y === this.py) return;
    this.px = x; this.py = y;
    this.hoverAt(x, y, true);
    if (this.hover?.n.on?.move) { this.hover.n.on.move(this.ev(this.hover, x, y, -1, e)); this.dirty = true; }
    const pr = this.pressed;
    if (pr) {
      const d = { phase: (pr.dragging ? 'move' : 'start') as DragEv['phase'], dx: x - pr.x, dy: y - pr.y, over: this.hover?.n ?? null, from: pr.p.n };
      pr.dragging = true;
      pr.p.n.on?.drag?.({ ...this.ev(pr.p, x, y, pr.button, e), ...d });
      if (this.hover && !this.same(this.hover, pr.p) && !this.same(this.hover, this.passed)) {
        this.passed = this.hover;
        this.hover.n.on?.pass?.(this.ev(this.hover, x, y, pr.button, e));
      }
      this.dirty = true;
    }
    this.paintPointer();
  }

  private onDown(e: PointerEvent): void {
    // Without this the browser moves the document's focus off the hidden input when the canvas is pressed.
    e.preventDefault();
    const [x, y] = this.unitAt(e.clientX, e.clientY);
    this.px = x; this.py = y;
    this.pointerShown = true;
    const { p, modal } = this.hit(x, y);
    this.hoverAt(x, y, false);
    if (!p) {
      if (modal?.outside) modal.outside(this.ev(null, x, y, e.button, e));
      if (this.focusId && this.byId(this.focusId)?.n.field) this.focusOn(null);
      return;
    }
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic event has no pointer to capture */ }
    const key = p.n.id ?? p.n;
    const double = !!this.lastPress && this.lastPress.id === key && this.lastPress.button === e.button && this.t - this.lastPress.t < DOUBLE_S;
    this.lastPress = { id: key, button: e.button, t: this.t };
    this.pressed = { p, button: e.button, x, y, dragging: false };
    this.passed = p;
    if ((p.n.focus || p.n.field) && p.n.id) this.focusOn(p.n.id, false);
    else if (this.focusId) this.focusOn(null);
    if (p.n.field) this.entry.pressAt(x - p.ax - p.n.field.textX + (p.n.field.scroll ?? 0), e.shiftKey);
    p.n.on?.down?.(this.ev(p, x, y, e.button, e, double));
    this.dirty = true;
  }

  private onUp(e: PointerEvent): void {
    const pr = this.pressed;
    if (!pr || pr.button !== e.button) return;
    const [x, y] = this.unitAt(e.clientX, e.clientY);
    this.pressed = null;
    this.passed = null;
    const over = this.hit(x, y).p;
    const ev = this.ev(pr.p, x, y, e.button, e);
    pr.p.n.on?.up?.(ev);
    if (this.same(over, pr.p)) pr.p.n.on?.click?.(ev);
    if (pr.dragging) {
      const d: DragEv = { ...ev, phase: 'end', dx: x - pr.x, dy: y - pr.y, over: over?.n ?? null, from: pr.p.n };
      pr.p.n.on?.drag?.(d);
      if (over && !this.same(over, pr.p)) over.n.on?.drop?.({ ...d, x: x - over.ax, y: y - over.ay });
    }
    this.dirty = true;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    // A notch is about 100 pixels in Chrome and Firefox, or three lines.
    const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
    this.wheelRest += px;
    const notches = Math.trunc(this.wheelRest / 100) || (Math.abs(px) >= 1 && Math.abs(this.wheelRest) >= 50 ? Math.sign(this.wheelRest) : 0);
    if (!notches) return;
    this.wheelRest -= notches * 100;
    if (Math.sign(this.wheelRest) !== Math.sign(px)) this.wheelRest = 0;
    const [x, y] = this.unitAt(e.clientX, e.clientY);
    for (let p = this.hit(x, y).p; p; p = p.parent) {
      const h = p.n.on?.wheel;
      if (h && h({ ...this.ev(p, x, y, 1, e), notches }) !== false) break;
    }
    this.dirty = true;
  }

  private keyEv(e: KeyboardEvent): KeyEv {
    return { key: e.key, code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, repeat: e.repeat };
  }

  /** Offers a key to a node and its ancestors; true when one used it. */
  private offer(p: Placed | null, k: KeyEv): boolean {
    for (; p; p = p.parent) {
      const h = p.n.on?.key;
      if (h && h(k)) return true;
    }
    return false;
  }

  private onKey(e: KeyboardEvent): void {
    const k = this.keyEv(e);
    if (this.useKey(k)) { e.preventDefault(); this.dirty = true; return; }
    this.opts.onKey?.(e);
  }

  private fieldKey(k: KeyEv): void {
    if (k.key === 'Enter' && this.offer(this.byId(this.focusId), k)) { this.dirty = true; return; }
    if (k.key === 'Escape') { this.focusOn(null); this.dirty = true; return; }
    this.useKey(k);
    this.dirty = true;
  }

  private useKey(k: KeyEv): boolean {
    const f = this.byId(this.focusId);
    // Focus given on open is not drawn; the first Tab or arrow shows where it stands instead of moving it on.
    if (f && !this.focusVisible && !f.n.field && (k.key === 'Tab' || k.key.startsWith('Arrow'))) { this.focusVisible = true; return true; }
    if (k.key === 'Tab') { this.walkFocus(k.shift ? -1 : 1); return true; }
    if (this.offer(f, k)) return true;
    if (this.hover && !this.same(this.hover, f) && this.offer(this.hover, k)) return true;
    if ((k.key === 'Enter' || k.key === ' ') && f && !f.n.field) { this.pressNode(f); return true; }
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dir[k.key] && f) { this.moveFocus(...dir[k.key]); return true; }
    if (k.key === 'Escape') {
      for (let li = LAYERS.length - 1; li >= 0; li--) {
        const m = this.mounts.get(LAYERS[li]);
        if (m?.close) { m.close(); return true; }
      }
    }
    return false;
  }

  private pressNode(p: Placed): void {
    const e = { x: Math.floor(p.n.w / 2), y: Math.floor(p.n.h / 2), gx: p.ax + Math.floor(p.n.w / 2), gy: p.ay + Math.floor(p.n.h / 2), button: 0, shift: false, ctrl: false, alt: false, double: false };
    p.n.on?.down?.(e);
    p.n.on?.up?.(e);
    p.n.on?.click?.(e);
  }

  /** The stops for Tab, in reading order, in the topmost layer that has any. */
  private stops(): Placed[] {
    for (let li = LAYERS.length - 1; li >= 0; li--) {
      const m = this.mounts.get(LAYERS[li]);
      if (!m) continue;
      const s = m.placed.filter((p) => (p.n.focus || p.n.field) && p.n.id);
      if (s.length || m.modal) return s;
    }
    return [];
  }

  private walkFocus(d: number): void {
    const s = this.stops();
    if (!s.length) return;
    const i = s.findIndex((p) => p.n.id === this.focusId);
    const next = s[i < 0 ? (d > 0 ? 0 : s.length - 1) : (i + d + s.length) % s.length];
    this.focusOn(next.n.id!, true);
    this.cue('tab');
  }

  /** Moves the focus to the nearest stop in a direction, preferring one in line with the present one. */
  private moveFocus(dx: number, dy: number): void {
    const cur = this.byId(this.focusId);
    if (!cur) return;
    const cx = cur.ax + cur.n.w / 2, cy = cur.ay + cur.n.h / 2;
    let best: Placed | null = null, bestD = Infinity;
    for (const p of this.stops()) {
      if (p === cur) continue;
      const px = p.ax + p.n.w / 2 - cx, py = p.ay + p.n.h / 2 - cy;
      const along = px * dx + py * dy, across = Math.abs(px * dy) + Math.abs(py * dx);
      if (along <= 0) continue;
      const d = along + across * 3;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) this.focusOn(best.n.id!, true);
  }

  /** Stops the frame loop and removes what the root put in the document. */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
    this.pointerCanvas.remove();
    this.entry.input.remove();
  }
}

/** The plain pointer, when nothing is held. */
const POINTER_HELD: Held = { paint: (s, x, y) => s.map(POINTER, x, y) };

/** A stack held on the pointer: its icon centred on the pointer's place and its count as in a slot (5.22). */
export function heldStack(icon: string, n: number, colour: Colour = 'salt'): Held {
  return {
    paint(s, x, y) {
      s.icon(icon, x - 8, y - 8);
      if (n > 1) {
        const str = String(n);
        s.text(str, x + 7 - measure(str) + 1, y, colour, true);
      }
    },
  };
}
