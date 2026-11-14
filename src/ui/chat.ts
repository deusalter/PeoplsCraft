// The chat log and the line that writes to it. It only shows what client/social.ts holds: the last lines, which fade
// a while after they arrive unless the line is open, and an input that hands what is typed back to it.
import type { ChatLine, Social } from '../client/social';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, parent: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (id) e.id = id.slice(1);
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/** Lines on screen, and seconds a line stays once it has arrived while the line is closed. */
const SHOWN = 10, STAY = 12;
const COLOR: Record<ChatLine['kind'], string> = { chat: '#e9e4d6', server: '#ffd27a', cmd: '#9fb6d8', reply: '#8fd0ff', note: '#a3a9b8' };
/** A colour per seat, so a conversation can be followed at a glance; the compass and the ping markers use the same. */
export const SEAT = ['#f0c27a', '#8fd0ff', '#a8e690', '#ff9a8a', '#d8a0ff', '#ffe08a', '#7fe0d0', '#f6a0c8'];

export interface ChatHost {
  /** The line has opened: keys and the pointer go to it. */
  opened(): void;
  /** It has closed: give them back to the game. */
  closed(): void;
}

export class ChatView {
  readonly root: HTMLElement;
  private log: HTMLElement; private input: HTMLInputElement;
  private rev = -1; private age = 0;
  /** When each line on screen was first seen, by its number. */
  private seen = new Map<number, number>();
  private rows: { el: HTMLElement; n: number }[] = [];
  private sent: string[] = []; private back = -1;
  private open_ = false;

  constructor(parent: HTMLElement, private social: Social, private host: ChatHost) {
    const r = this.root = el('div', '#chat', parent);
    r.style.cssText = 'position:absolute;left:14px;bottom:196px;width:min(440px,calc(100vw - 28px));display:flex;flex-direction:column;gap:3px;pointer-events:none;z-index:24';
    this.log = el('div', '', r);
    this.log.style.cssText = 'display:flex;flex-direction:column;gap:1px;font-size:13px;line-height:17px';
    this.input = el('input', '', r);
    this.input.type = 'text'; this.input.maxLength = 200; this.input.spellcheck = false;
    this.input.style.cssText = 'display:none;pointer-events:auto;background:rgba(8,10,14,.85);color:#e9e4d6;border:1px solid #3b4254;padding:5px 8px;font:13px ui-monospace,monospace;outline:none';
    this.input.onkeydown = (e) => {
      // the game listens on the window: nothing typed here may reach it
      e.stopPropagation();
      if (e.key === 'Enter') { const t = this.input.value; if (t.trim()) { this.sent.push(t); if (this.sent.length > 30) this.sent.shift(); } this.close(); this.social.submit(t); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.sent.length) return;
        this.back = e.key === 'ArrowUp' ? (this.back < 0 ? this.sent.length - 1 : Math.max(0, this.back - 1)) : this.back < 0 ? -1 : this.back + 1;
        if (this.back >= this.sent.length) this.back = -1;
        this.input.value = this.back < 0 ? '' : this.sent[this.back];
      }
    };
    this.input.onkeyup = (e) => e.stopPropagation();
    // clicking away must not leave the line open with the game ignoring input
    this.input.onblur = () => { if (this.open_) this.close(); };
  }

  get isOpen(): boolean { return this.open_; }
  open(prefix = ''): void {
    if (this.open_) return;
    this.open_ = true; this.back = -1;
    this.input.value = prefix; this.input.style.display = 'block';
    this.host.opened();
    // focused at once, so that keys pressed right after the one that opened it land here (that key's own default was prevented)
    this.input.focus(); this.input.setSelectionRange(prefix.length, prefix.length);
    this.draw();
  }
  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.input.style.display = 'none'; this.input.blur();
    this.host.closed();
    this.draw();
  }

  update(dt: number): void {
    this.age += dt;
    if (this.social.chatRev !== this.rev) { this.rev = this.social.chatRev; this.draw(); return; }
    // fading is whole lines going, a few times a second at most
    if (!this.open_) for (const r of this.rows) if (r.el.style.display !== 'none' && this.age - (this.seen.get(r.n) ?? 0) > STAY) r.el.style.display = 'none';
  }

  private draw(): void {
    const lines = this.social.lines, from = Math.max(0, lines.length - SHOWN);
    while (this.rows.length < SHOWN) {
      const e = el('div', '', this.log);
      e.style.cssText = 'padding:1px 7px;background:rgba(13,15,20,.55);color:#e9e4d6;text-shadow:1px 1px 0 #000;overflow-wrap:anywhere;white-space:pre-wrap;align-self:flex-start;max-width:100%';
      this.rows.push({ el: e, n: -1 });
    }
    const keep = new Map<number, number>();
    for (let i = 0; i < SHOWN; i++) {
      const r = this.rows[i], line = from + i < lines.length ? lines[from + i] : undefined;
      if (!line) { r.el.style.display = 'none'; r.n = -1; continue; }
      const at = this.seen.get(line.n) ?? this.age;
      keep.set(line.n, at);
      if (r.n !== line.n) {
        r.n = line.n; r.el.textContent = '';
        r.el.style.color = COLOR[line.kind]; r.el.style.fontStyle = line.kind === 'note' ? 'italic' : '';
        if (line.kind === 'chat') { const b = el('b', '', r.el, line.name + ' '); b.style.color = SEAT[line.slot % SEAT.length]; }
        r.el.append(line.text);
      }
      r.el.style.display = this.open_ || this.age - at <= STAY ? '' : 'none';
    }
    this.seen = keep;
  }
}
