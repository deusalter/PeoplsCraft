// The one real input behind every drawn field (direction, 8). It lies over the drawn field, unseen, so that the
// browser's own editing, clipboard, selection and input methods work, and the kit copies what it holds.
import { TEXT, tokens } from './font/face';
import type { FieldSpec, FieldState, KeyEv } from './node';

export interface EntryHooks {
  changed(s: FieldState): void;
  /** Enter, Tab and Esc are the kit's while a field has focus. */
  key(e: KeyEv): void;
  now(): number;
}

/** The glyph boundary nearest to `x` units into a line of text. */
export function indexAt(str: string, x: number): number {
  const ts = tokens(str, TEXT);
  let cx = 0, at = 0;
  for (const t of ts) {
    const w = t.g.w + TEXT.gap;
    if (x < cx + w / 2) return at;
    cx += w;
    at += t.src.length;
  }
  return str.length;
}

export class TextEntry {
  readonly input: HTMLInputElement;
  private state: FieldState | null = null;
  private spec: FieldSpec | null = null;
  private composeFrom = 0;

  constructor(host: HTMLElement, private hooks: EntryHooks) {
    const i = document.createElement('input');
    i.type = 'text';
    i.autocomplete = 'off';
    i.spellcheck = false;
    i.setAttribute('autocapitalize', 'off');
    Object.assign(i.style, {
      position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none',
      fontSize: '16px', border: '0', padding: '0', margin: '0', outline: 'none', background: 'transparent', color: 'transparent',
    });
    host.appendChild(i);
    this.input = i;
    i.addEventListener('input', () => this.read());
    i.addEventListener('compositionstart', () => { this.composeFrom = i.selectionStart ?? 0; });
    i.addEventListener('compositionupdate', (e) => {
      if (!this.state) return;
      this.state.compose = [this.composeFrom, this.composeFrom + e.data.length];
      this.read();
    });
    i.addEventListener('compositionend', () => { if (this.state) this.state.compose = null; this.read(); });
    document.addEventListener('selectionchange', () => { if (document.activeElement === i) this.read(); });
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        this.hooks.key({ key: e.key, code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, repeat: e.repeat });
      }
      // Nothing typed into a field reaches the game's bindings.
      e.stopPropagation();
    });
    i.addEventListener('keyup', (e) => e.stopPropagation());
  }

  get active(): boolean { return this.state !== null; }

  /** Gives the input a field's text and rules and lays it over the field's rectangle, in CSS pixels. */
  attach(spec: FieldSpec, state: FieldState, rect: { left: number; top: number; width: number; height: number }): void {
    this.spec = spec;
    this.state = state;
    const i = this.input;
    i.type = spec.password ? 'password' : 'text';
    i.maxLength = spec.limit ?? 524288;
    if (i.value !== state.value) i.value = state.value;
    Object.assign(i.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    if (document.activeElement !== i) i.focus({ preventScroll: true });
    i.setSelectionRange(state.start, state.end);
  }

  detach(): void {
    this.state = null;
    this.spec = null;
    if (document.activeElement === this.input) this.input.blur();
  }

  /** Places the caret from a press on the drawn field, `x` units from where the text starts. */
  pressAt(x: number, extend: boolean): void {
    if (!this.state) return;
    const at = indexAt(this.input.value, x);
    if (extend) this.input.setSelectionRange(Math.min(at, this.state.start), Math.max(at, this.state.end));
    else this.input.setSelectionRange(at, at);
    this.read();
  }

  private read(): void {
    const s = this.state, spec = this.spec, i = this.input;
    if (!s || !spec) return;
    let v = i.value;
    if (spec.allow && !s.compose) {
      const allow = spec.allow;
      const kept = [...v].filter((ch) => allow.test(ch)).join('');
      if (kept !== v) {
        const caret = Math.max(0, (i.selectionStart ?? kept.length) - (v.length - kept.length));
        i.value = kept;
        i.setSelectionRange(caret, caret);
        v = kept;
        s.refusedAt = this.hooks.now();
      }
    }
    s.value = v;
    s.start = i.selectionStart ?? v.length;
    s.end = i.selectionEnd ?? v.length;
    this.hooks.changed(s);
  }
}
