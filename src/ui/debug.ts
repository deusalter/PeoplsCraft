// F3 overlay: frame timing, chunk and draw statistics, position.
export class DebugOverlay {
  readonly el: HTMLElement;
  visible = false;
  private frames = 0; private acc = 0; private worst = 0; private fps = 0; private ms = 0; private worstShown = 0; private t = 0;
  extra: (() => string) | null = null;
  constructor(parent: HTMLElement) {
    this.el = document.createElement('pre');
    this.el.id = 'debug'; this.el.style.display = 'none';
    parent.appendChild(this.el);
  }
  toggle(): void { this.visible = !this.visible; this.el.style.display = this.visible ? 'block' : 'none'; this.el.parentElement?.classList.toggle('dbg', this.visible); }
  /** Call once per frame with the frame's delta in seconds. Returns true when the text should refresh. */
  frame(dt: number): boolean {
    this.frames++; this.acc += dt; this.t += dt;
    if (dt > this.worst) this.worst = dt;
    if (this.t < 0.25) return false;
    this.fps = this.frames / this.acc; this.ms = (this.acc / this.frames) * 1000; this.worstShown = this.worst * 1000;
    this.frames = 0; this.acc = 0; this.worst = 0; this.t = 0;
    return this.visible;
  }
  get currentFps(): number { return this.fps; }
  get frameMs(): number { return this.ms; }
  set(lines: string[]): void {
    this.el.textContent = `${this.fps.toFixed(0)} fps  ${this.ms.toFixed(2)} ms avg  ${this.worstShown.toFixed(1)} ms worst\n` + lines.join('\n');
  }
}
