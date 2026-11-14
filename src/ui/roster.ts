// Who is online, shown while Tab is held: name, level, realm, what they are doing, how far. It only shows what
// client/social.ts holds.
import { type Social, realmName } from '../client/social';

const STATE: Record<string, string> = { away: 'away', asleep: 'asleep', fallen: 'fallen', loading: 'arriving' };

export class RosterView {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private rev = -1; private t = 0; private on = false;

  constructor(parent: HTMLElement, private social: Social, private where: () => { x: number; z: number }) {
    const r = this.root = document.createElement('div');
    r.id = 'roster';
    r.style.cssText = 'position:absolute;left:50%;top:70px;transform:translateX(-50%);min-width:300px;max-width:calc(100vw - 28px);display:none;background:rgba(13,15,20,.82);border:1px solid #3b4254;padding:6px 10px;font-size:12px;line-height:18px;color:#e9e4d6;text-shadow:1px 1px 0 #000;z-index:23;pointer-events:none';
    this.body = document.createElement('div');
    r.appendChild(this.body);
    parent.appendChild(r);
  }
  get shown(): boolean { return this.on; }
  show(on: boolean): void {
    if (on === this.on) return;
    this.on = on; this.root.style.display = on ? 'block' : 'none';
    if (on) this.draw();
  }
  update(dt: number): void {
    if (!this.on) return;
    // distances change all the time: redraw twice a second, or at once when someone joins, leaves or moves realm
    this.t += dt;
    if (this.social.rosterRev !== this.rev || this.t > 0.5) this.draw();
  }

  private draw(): void {
    this.rev = this.social.rosterRev; this.t = 0;
    const so = this.social, me = this.where(), list = so.list(), b = this.body;
    b.textContent = '';
    const head = document.createElement('div');
    head.textContent = list.length === 1 ? 'Only you are here' : `${list.length} here`;
    head.style.cssText = 'color:#ffd27a;font-weight:700;margin-bottom:3px';
    b.appendChild(head);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:auto auto auto auto;column-gap:14px';
    for (const m of list) {
      const st = STATE[so.state(m)] ?? '';
      const far = m.self ? 'you' : m.dim === so.dim && m.placed ? `${Math.round(Math.hypot(m.x - me.x, m.z - me.z))} m` : '';
      const cells = [m.name, `Lv ${m.level}`, realmName(m.dim) + (st ? ` · ${st}` : ''), far];
      cells.forEach((t, i) => {
        const c = document.createElement('span');
        c.textContent = t;
        c.style.color = i === 0 ? (m.self ? '#ffe08a' : '#e9e4d6') : i === 3 ? '#b4bacb' : '#a3a9b8';
        if (i === 3) c.style.textAlign = 'right';
        grid.appendChild(c);
      });
    }
    b.appendChild(grid);
  }
}
