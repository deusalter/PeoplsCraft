// Keyboard / mouse state with per-frame edge detection and pointer-lock handling.
/** Modifier keys always get their keyup, even while Cmd is down. */
const MODS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);

export class Input {
  private keys = new Set<string>();
  private hits = new Set<string>();
  buttons = [false, false, false];
  clicks = [false, false, false];
  dx = 0; dy = 0; wheel = 0;
  locked = false;
  /** Ask for unaccelerated mouse deltas where the browser offers them. Applied each time the pointer locks. */
  raw = false;
  private rawOn = false; private skipMove = false;
  private wheelAcc = 0; private wheelT = 0; private wheelStepT = 0; private wheelPrev = 0; private wheelFall = 0;
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
    // macOS sends no keyup for non-modifier keys released while Cmd is down, so drop those when Cmd comes up;
    // still-held ones come back with the next key repeat or press. Shift (sneak) and Ctrl (sprint) are kept.
    window.addEventListener('keyup', (e) => { if (e.code === 'MetaLeft' || e.code === 'MetaRight') this.dropUnsynced(); else this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.buttons.fill(false); });
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();   // no browser autoscroll on middle click
      if (this.uiMode) return;
      if (!this.locked) { this.lock(); return; }
      this.buttons[e.button] = true; this.clicks[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => { this.buttons[e.button] = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      if (this.skipMove) { this.skipMove = false; return; }
      this.dx += e.movementX; this.dy += e.movementY;
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.locked || e.deltaY === 0) return;
      const now = e.timeStamp, gap = now - this.wheelT, sg = Math.sign(e.deltaY), mag = Math.abs(e.deltaY), wd = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      this.wheelT = now;
      // A notched wheel moves one slot per event: line-mode deltas, or the classic 120-unit detent
      // (macOS reports pixel deltas scaled by exactly 3 there, for mice and trackpads alike, so that case falls through).
      const notch = e.deltaMode !== 0 || (wd !== undefined && wd !== 0 && Math.abs(wd) % 120 === 0 && Math.abs(Math.abs(wd) - Math.abs(e.deltaY) * 3) > 1);
      // Pixel deltas: an event after a pause is a wheel notch or the start of a swipe and always counts. A continuous
      // stream (a trackpad swipe) then has to cover real distance for each further slot, and stops counting once the
      // deltas only shrink, which is the inertia after the fingers have lifted.
      if (notch || gap > 40) { this.wheel += sg; this.wheelAcc = 0; this.wheelStepT = now; this.wheelPrev = mag; this.wheelFall = 0; return; }
      if (sg * this.wheelAcc < 0) { this.wheelAcc = 0; this.wheelFall = 0; }
      if (mag < this.wheelPrev) this.wheelFall++; else if (mag > this.wheelPrev) this.wheelFall = 0;
      this.wheelPrev = mag;
      if (this.wheelFall >= 3) return;
      this.wheelAcc += e.deltaY;
      if (Math.abs(this.wheelAcc) >= 80 && now - this.wheelStepT >= 80) { this.wheel += sg; this.wheelAcc = 0; this.wheelStepT = now; }
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      if (!this.locked) { this.keys.clear(); this.buttons.fill(false); this.rawOn = false; }
      else {
        this.skipMove = true;   // browsers can deliver one huge delta as the lock engages
        // Re-requesting the lock we already hold switches it to raw input; if that is refused the ordinary lock stays.
        if (this.raw && !this.rawOn) {
          this.rawOn = true;
          try { const p = (el as HTMLElement & { requestPointerLock(o?: { unadjustedMovement?: boolean }): Promise<void> | void }).requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => {}); } catch { /* unsupported */ }
        }
      }
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
  private dropUnsynced(): void { for (const k of this.keys) if (!MODS.has(k)) this.keys.delete(k); }
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
