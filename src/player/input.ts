// Keyboard / mouse state with per-frame edge detection and pointer-lock handling.
export class Input {
  private keys = new Set<string>();
  private hits = new Set<string>();
  buttons = [false, false, false];
  clicks = [false, false, false];
  dx = 0; dy = 0; wheel = 0;
  locked = false;
  /** When true, keyboard and mouse are routed to the UI and the game ignores them. */
  uiMode = false;
  onLockChange: ((locked: boolean) => void) | null = null;
  onKey: ((code: string, e: KeyboardEvent) => boolean) | null = null;

  constructor(readonly el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (this.onKey && this.onKey(e.code, e)) { e.preventDefault(); return; }
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (typing) return;
      if (!e.repeat) this.hits.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'Tab', 'F3', 'F1', 'F5', 'Slash'].includes(e.code) || (e.ctrlKey && this.locked)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.buttons.fill(false); });
    el.addEventListener('mousedown', (e) => {
      if (this.uiMode) return;
      if (!this.locked) { this.lock(); return; }
      this.buttons[e.button] = true; this.clicks[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => { this.buttons[e.button] = false; });
    window.addEventListener('mousemove', (e) => { if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; } });
    el.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      if (!this.locked) { this.keys.clear(); this.buttons.fill(false); }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }
  /** Request pointer lock; resolves false when the browser refuses (e.g. no user gesture, or too soon after Esc). */
  lock(): Promise<boolean> {
    try {
      const p = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && p.then) return p.then(() => true, () => false);
      // older browsers return nothing: wait for whichever event answers first
      return new Promise((res) => {
        const end = (ok: boolean) => (): void => { document.removeEventListener('pointerlockchange', yes); document.removeEventListener('pointerlockerror', no); res(ok); };
        const yes = end(true), no = end(false);
        document.addEventListener('pointerlockchange', yes); document.addEventListener('pointerlockerror', no);
      });
    } catch { return Promise.resolve(false); }
  }
  unlock(): void { if (document.pointerLockElement) document.exitPointerLock(); }
  down(code: string): boolean { return !this.uiMode && this.keys.has(code); }
  hit(code: string): boolean { return !this.uiMode && this.hits.has(code); }
  /** Edge-detected press that also fires while a UI is open (for toggles like E / Esc). */
  hitAny(code: string): boolean { return this.hits.has(code); }
  /** Clear edge-triggered state once a simulation tick has consumed it. */
  endTick(): void { this.hits.clear(); this.clicks.fill(false); this.wheel = 0; }
  endFrame(): void { this.dx = 0; this.dy = 0; }
  /** Test hook: simulate held keys without real events. */
  setKey(code: string, on: boolean): void { if (on) { this.keys.add(code); this.hits.add(code); } else this.keys.delete(code); }
}
