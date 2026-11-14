// Heads-up display: hotbar, vitals, boss bar, quest tracker, toasts and floating combat text.
import * as THREE from 'three';
import { RARITY, item, itemName, itemRarity } from '../data/items';
import type { Game } from '../game';
import { BOSS_BARS } from '../data/hudstyle';
import { HOTBAR } from '../sim/inventory';
import { eventLabel, eventProgress } from '../client/invclient';
import { BUFFS } from '../sim/stats';
import { Social, bearing, stateOf } from '../client/social';
import { PF_DEAD, PF_LOADING, PF_SLEEP, PING_REACH, SELF_DEAD, SELF_LOADING, SELF_SLEEPING } from '../net/protocol';
import { newRayHit, raycast } from '../sim/physics';
import { ChatView, SEAT } from './chat';
import { RosterView } from './roster';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) { if (cls[0] === '#') e.id = cls.slice(1); else e.className = cls; }
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
interface Bar { root: HTMLElement; fill: HTMLElement; ghost: HTMLElement | null; label: HTMLElement; v: number; t: string }
/** `ghost` adds a pale trail under the fill that drains a beat after a hit. */
function bar(cls: string, parent: HTMLElement, ghost = false): Bar {
  const root = el('div', 'bar ' + cls, parent), g = ghost ? el('u', '', root) : null, fill = el('i', '', root), label = el('b', '', root);
  return { root, fill, ghost: g, label, v: -1, t: '' };
}
function setBar(b: Bar, frac: number, text: string): void {
  frac = Math.max(0, Math.min(1, frac));
  if (Math.abs(frac - b.v) > 0.002) { b.v = frac; b.fill.style.transform = `scaleX(${frac})`; if (b.ghost) b.ghost.style.transform = b.fill.style.transform; }
  if (text !== b.t) { b.t = text; b.label.textContent = text; }
}
const COMPASS_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], PIP_CLS = ['home', 'death', 'goal'];
/** Half the strip in pixels, and the bearing (radians either side of straight ahead) it spans. */
const CW = 150, CSPAN = 1.2;
const wrapPi = (a: number): number => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
const STAT_WORDS: Record<string, string> = { def: 'defense', speed: 'speed', regen: 'regen', hp: 'health', mana: 'mana', crit: 'crit', melee: 'melee', ranged: 'ranged', magic: 'crystal-work', summon: 'totem', mining: 'mining' };
/** "+6 defense, +20% speed": fractional stats read as percentages. */
function buffLine(stats: Record<string, number | undefined>): string {
  const out: string[] = [];
  for (const k in stats) { const v = stats[k]; if (!v) continue; out.push((v > 0 ? '+' : '') + (Math.abs(v) < 1 && k !== 'regen' ? Math.round(v * 100) + '%' : v) + ' ' + (STAT_WORDS[k] ?? k)); }
  return out.join(', ');
}
const HURT_FX: Keyframe[] = [{ opacity: 0.8 }, { opacity: 0 }];
const HURT_T: KeyframeAnimationOptions = { duration: 550, easing: 'ease-out' }, DIR_T: KeyframeAnimationOptions = { duration: 1000, easing: 'ease-in' };
interface Floater { el: HTMLElement; x: number; y: number; z: number; life: number; max: number; vy: number }
/** A compass pip made on demand: a friend (a round mark in the seat's colour, the name under it) or a ping (a diamond, its distance). */
interface Pip { el: HTMLElement; i: HTMLElement; d: HTMLElement; px: number; on: boolean; edge: boolean; slot: number; name: string; m: number }
/** A name tag over another player: name and state, a thin health bar; whether terrain hides it, looked at every 0.25 s. */
interface Tag { el: HTMLElement; name: HTMLElement; bar: HTMLElement; slot: number; text: string; hp: number; seen: boolean; look: number; on: boolean }
/** A ping in the world: a marker with the pinger's name and the distance. */
interface Mark { el: HTMLElement; label: HTMLElement; text: string; on: boolean }
/** Players' tags show within this distance (2.5). */
const TAG_R = 48;
const PING_COLOR = '#ffd27a';
const ray = newRayHit();

export class Hud {
  readonly root: HTMLElement;
  /** cd: which cooldown shades the slot (0 none, 1 salve, 2 recall stone); cv: last written overlay fraction. */
  private slots: { root: HTMLElement; ic: HTMLElement; n: HTMLElement; cdEl: HTMLElement; cd: number; cv: number; k: string; cnt: number }[] = [];
  private heldSig = ''; private ammoName = false; private primed = false;
  private hp: Bar; private food: Bar; private mana: Bar; private xp: Bar; private coins: HTMLElement; private lvl: HTMLElement;
  private itemName: HTMLElement; private toasts: HTMLElement; private banner: HTMLElement; private bannerT = 0; private bannerGap = 0;
  private bannerQ: [string, string, string][] = [];
  private pick: { key: string; n: number; el: HTMLElement | null; timer: ReturnType<typeof setTimeout> | undefined } = { key: '', n: 0, el: null, timer: undefined };
  private boss: HTMLElement; private bossName: HTMLElement; private bossTitle: HTMLElement; private bossBar: Bar;
  private bossKey = ''; private bossNotches: HTMLElement[] = []; private bossHpI = -1; private bossText = ''; private bossPhase = 0;
  private quest: HTMLElement; private event: HTMLElement; private eventBar: Bar; private eventText: HTMLElement;
  private buffs: HTMLElement; private prompt: HTMLElement; private hurt: HTMLElement; private portal: HTMLElement;
  private hurtDir: HTMLElement; private cross: HTMLElement; private hitT = 0; private hitOn = false; private critOn = false;
  private floats: Floater[] = []; private tags: HTMLElement[] = []; private savedEl: HTMLElement;
  private rev = -1; private sel = -1; private nameT = 0; private questKey = ''; private questIdx = -1; private questT = 0; private regenOn = false; private buffGen = 0; private coinV = -1; private lvlV = -1; private ptsV = -1;
  private v = new THREE.Vector3();
  private marks: { el: HTMLElement; b: number; px: number }[] = [];
  private pips: { el: HTMLElement; d: HTMLElement; px: number; on: boolean; edge: boolean; m: number }[] = [];
  private coord: HTMLElement; private cX = NaN; private cY = NaN; private cZ = NaN; private cMin = -1;
  private buffRows = new Map<string, { el: HTMLElement; time: HTMLElement; sec: number; gen: number; exp: boolean }>();
  /** Bound once so the per-frame buff pass allocates nothing; text is written only when a second ticks over. */
  private buffCb = (t: number, k: string): void => {
    let row = this.buffRows.get(k);
    if (!row) {
      const e = el('div', '', this.buffs), b = BUFFS[k];
      el('b', '', e, b?.name ?? k);
      const time = el('span', 't', e);
      if (b) el('small', '', e, buffLine(b.stats));
      row = { el: e, time, sec: -1, gen: 0, exp: false };
      this.buffRows.set(k, row);
    }
    row.gen = this.buffGen;
    const sec = Math.ceil(t);
    if (sec !== row.sec) {
      row.sec = sec; row.time.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      if ((sec <= 10) !== row.exp) { row.exp = sec <= 10; row.el.classList.toggle('exp', row.exp); }
    }
  };
  // cached values so frames where nothing changed build no strings and touch no classes
  private hpI = -1; private maxHpI = -1; private hpText = ''; private manaI = -1; private maxManaI = -1; private manaText = ''; private foodI = -1; private foodText = '';
  private hpLow = false; private foodLow = false; private bossOn = false; private eventOn = false; private promptText: string | null = null; private evKind = ''; private evProg = -1;
  private vw = window.innerWidth; private vh = window.innerHeight;
  /** Who else is here, what was said, where they pointed: the state the chat, the list, the tags and the pips show. */
  readonly social = new Social();
  readonly chat: ChatView; readonly roster: RosterView;
  private pipL: HTMLElement; private more: Pip[] = [];
  private ptags: Tag[] = []; private marks2: Mark[] = [];
  private keyDown = (e: KeyboardEvent): void => this.onKeyDown(e);
  private keyUp = (e: KeyboardEvent): void => { if (e.code === 'Tab') this.roster.show(false); };

  constructor(ui: HTMLElement, private g: Game) {
    const r = this.root = el('div', '#hud', ui);
    this.hurt = el('div', '#hurt', r); this.portal = el('div', '#portalfx', r);
    el('div', '#lowhp', r); this.hurtDir = el('div', '#hurtdir', r);
    this.cross = el('div', '#crosshair', r);
    const wrap = el('div', '#hotwrap', r), bars = el('div', 'bars', wrap);
    this.hp = bar('hp', bars, true); this.food = bar('food', bars); el('s', 'notch', this.food.root); this.mana = bar('mana', bars); this.coins = el('div', '#coins', bars);
    this.xp = bar('xp', bars);
    const hb = el('div', '#hotbar', wrap);
    for (let i = 0; i < HOTBAR; i++) {
      const s = el('div', 'slot', hb), ic = el('div', 'ic', s), cdEl = el('div', 'cd', s); el('div', 'k', s, String(i + 1));
      this.slots.push({ root: s, ic, n: el('div', 'n', s), cdEl, cd: 0, cv: 0, k: '', cnt: 0 });
    }
    // compass: cardinal marks on a masked strip, pips (home, last death, guide target) on an unmasked layer above it
    const cw = el('div', '#compass', r), strip = el('div', 'strip', cw), pipL = this.pipL = el('div', 'pips', cw);
    el('div', 'mid', cw);
    for (let i = 0; i < 8; i++) this.marks.push({ el: el('div', i % 2 ? 'm sm' : 'm', strip, COMPASS_NAMES[i]), b: (i * Math.PI) / 4, px: -1e9 });
    for (let i = 0; i < 3; i++) {
      const e = el('div', 'pip ' + PIP_CLS[i], pipL); el('i', '', e);
      this.pips.push({ el: e, d: el('b', '', e), px: 1e9, on: true, edge: false, m: -1 });
    }
    this.coord = el('div', 'xyz', cw);
    this.lvl = el('div', '#lvl', r); this.itemName = el('div', '#itemname', r);
    this.toasts = el('div', '#toasts', r); this.banner = el('div', '#banner', r);
    this.boss = el('div', '#boss', r); this.bossTitle = el('div', 'tt', this.boss); this.bossName = el('div', 'nm', this.boss); this.bossBar = bar('', this.boss, true);
    // the tracker and the event box share one flowing column so neither can cover the other
    const side = el('div', '#side', r);
    this.quest = el('div', '#quest', side);
    this.event = el('div', '#event', side); this.eventText = el('div', '', this.event); this.eventBar = bar('', this.event); this.event.classList.add('hidden');
    this.buffs = el('div', '#buffs', r); this.prompt = el('div', '#prompt', r); this.prompt.classList.add('hidden');
    this.savedEl = el('div', '#saved', r, 'Saved');
    for (let i = 0; i < 48; i++) { const e = el('div', 'float', r); e.style.display = 'none'; this.floats.push({ el: e, x: 0, y: 0, z: 0, life: 0, max: 1, vy: 0 }); }
    for (let i = 0; i < 10; i++) { const e = el('div', 'float tag', r); e.style.display = 'none'; this.tags.push(e); }
    for (let i = 0; i < 8; i++) {
      const e = el('div', 'float tag', r), name = el('div', '', e), b = el('div', '', e), bar = el('i', '', b);
      e.style.display = 'none'; e.style.textAlign = 'center';
      b.style.cssText = 'height:3px;width:40px;margin:2px auto 0;background:rgba(0,0,0,.6);box-shadow:0 0 0 1px rgba(0,0,0,.6)';
      bar.style.cssText = 'display:block;height:100%;background:#e5544b;transform-origin:left';
      this.ptags.push({ el: e, name, bar, slot: -1, text: '', hp: -1, seen: true, look: 0, on: false });
    }
    for (let i = 0; i < 8; i++) {
      const e = el('div', 'float tag', r), d = el('div', '', e), label = el('div', '', e);
      e.style.display = 'none'; e.style.textAlign = 'center';
      d.style.cssText = `width:10px;height:10px;margin:0 auto 3px;transform:rotate(45deg);background:${PING_COLOR};box-shadow:0 0 0 1px #000,0 0 8px rgba(255,210,122,.8)`;
      this.marks2.push({ el: e, label, text: '', on: false });
    }
    window.addEventListener('resize', () => { this.vw = window.innerWidth; this.vh = window.innerHeight; });
    const so = this.social;
    so.cmd = (t) => g.cmd(t);
    so.connect(g.session);
    g.ents.info = (slot) => so.member(slot);
    this.chat = new ChatView(r, so, {
      opened: () => { g.input.uiMode = true; g.input.unlock(); },
      closed: () => { g.input.uiMode = false; void g.input.lock(); },
    });
    this.roster = new RosterView(r, so, () => g.player);
    // ahead of the game's own key handling on the window, so that T and / open this line and not another
    window.addEventListener('keydown', this.keyDown, true);
    window.addEventListener('keyup', this.keyUp, true);
    window.addEventListener('blur', () => this.roster.show(false));
  }

  /** Enter, T or / open the chat line (/ with a slash in it), Tab shows who is here while held, V pings. */
  private onKeyDown(e: KeyboardEvent): void {
    const g = this.g, t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!g.ready || g.menu.open || g.menu.dead || g.win.open || this.chat.isOpen) return;
    if (e.code === 'Tab') { this.roster.show(true); return; }
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'KeyT' || e.code === 'Slash') {
      e.preventDefault(); e.stopImmediatePropagation();
      this.chat.open(e.code === 'Slash' ? '/' : '');
    } else if (e.code === 'KeyV' && g.input.locked && !g.stats.dead) {
      e.preventDefault(); e.stopImmediatePropagation();
      this.ping();
    }
  }
  /** A ping on the block looked at, or PING_REACH blocks along the view when nothing is there. */
  ping(): void {
    const p = this.g.player, d = p.dir(this.v), ex = p.x, ey = p.y + p.eye, ez = p.z;
    raycast(this.g.world, ex, ey, ez, d.x, d.y, d.z, PING_REACH, ray);
    if (ray.hit) this.social.ping(ray.x + 0.5 + ray.nx * 0.5, ray.y + 0.5 + ray.ny * 0.5, ray.z + 0.5 + ray.nz * 0.5);
    else this.social.ping(ex + d.x * PING_REACH, ey + d.y * PING_REACH, ez + d.z * PING_REACH);
  }
  /** Number of phase thresholds the boss has dropped below. */
  private phaseOf(phases: { below: number }[], f: number): number { let n = 0; for (let i = 0; i < phases.length; i++) if (phases[i].below < 1 && f <= phases[i].below) n++; return n; }
  setVisible(v: boolean): void { this.root.classList.toggle('hidden', !v); }

  toast(text: string, color = '#e9e4d6'): HTMLElement {
    const t = el('div', 'toast', undefined, text);
    t.style.color = color;
    this.toasts.prepend(t);
    while (this.toasts.children.length > 7) this.toasts.lastElementChild!.remove();
    setTimeout(() => this.fadeToast(t), 5200);
    return t;
  }
  private fadeToast(t: HTMLElement): void {
    if (!t.isConnected || t === this.pick.el) return;
    t.classList.add('out'); setTimeout(() => t.remove(), 300);
  }
  /** Pickups of the same item in a row fold into one line that keeps counting. */
  pickup(key: string, n: number, name: string, color: string, total: number): void {
    const pk = this.pick;
    if (pk.el && pk.key === key && pk.el.isConnected && !pk.el.classList.contains('out')) {
      pk.n += n; pk.el.textContent = `+${pk.n} ${name}  (${total})`;
      if (this.toasts.firstElementChild !== pk.el) this.toasts.prepend(pk.el);
      pk.el.classList.remove('bump'); void pk.el.offsetWidth; pk.el.classList.add('bump');
      clearTimeout(pk.timer);
    } else {
      pk.el = null; pk.key = key; pk.n = n;
      const t = this.toast(`+${n} ${name}  (${total})`, color); pk.el = t;
    }
    const t = pk.el!;
    pk.timer = setTimeout(() => { if (pk.el === t) pk.el = null; this.fadeToast(t); }, 5200);
  }
  showBanner(text: string, sub = '', color = '#ffd9a0'): void {
    // a banner already showing gets a short last beat, then the queue takes over (at most three waiting)
    if (this.bannerT > 0 || this.bannerGap > 0) {
      if (this.bannerQ.length < 3) this.bannerQ.push([text, sub, color]);
      if (this.bannerT > 1.5) this.bannerT = 1.5;
      return;
    }
    this.banner.innerHTML = ''; this.banner.append(text); if (sub) el('small', '', this.banner, sub);
    this.banner.style.color = color; this.banner.style.opacity = '1'; this.bannerT = 4.2;
  }
  floater(x: number, y: number, z: number, text: string, color: string, big = false): void {
    let f: Floater | null = null;
    for (let i = 0; i < this.floats.length; i++) if (this.floats[i].life <= 0) { f = this.floats[i]; break; }
    if (!f) return;
    f.x = x + (Math.random() - 0.5) * 0.4; f.y = y; f.z = z + (Math.random() - 0.5) * 0.4; f.life = f.max = big ? 1.1 : 0.85; f.vy = 1.6;
    f.el.textContent = text; f.el.style.color = color; f.el.className = big ? 'float big' : 'float'; f.el.style.display = 'block';
  }
  setPrompt(text: string | null): void {
    if (!text) text = null;
    if (text === this.promptText) return;
    if (text !== null) {
      // "Right-click: open" shows the key part as a key cap
      const i = text.indexOf(': ');
      if (i > 0) { this.prompt.innerHTML = ''; el('kbd', '', this.prompt, text.slice(0, i)); this.prompt.append(text.slice(i + 2)); } else this.prompt.textContent = text;
    }
    if ((text === null) !== (this.promptText === null)) this.prompt.classList.toggle('hidden', text === null);
    this.promptText = text;
  }
  /** Brief "Saved" mark in the corner (fades by CSS transition, no per-frame work). */
  saved(): void { const s = this.savedEl; s.style.transition = 'none'; s.style.opacity = '1'; requestAnimationFrame(() => { s.style.transition = 'opacity 1.5s 0.6s'; s.style.opacity = '0'; }); }
  /** `angle` is where the hit came from relative to the view, in radians clockwise from straight ahead. */
  flashHurt(angle?: number): void {
    this.hurt.animate(HURT_FX, HURT_T);
    if (angle === undefined) return;
    this.hurtDir.style.transform = `rotate(${angle.toFixed(3)}rad)`;
    this.hurtDir.animate(HURT_FX, DIR_T);
  }
  /** Brief crosshair confirmation when a player attack lands. */
  hitMark(crit: boolean): void {
    this.hitT = 0.14;
    if (!this.hitOn) { this.hitOn = true; this.cross.classList.add('hit'); }
    if (crit !== this.critOn) { this.critOn = crit; this.cross.classList.toggle('crit', crit); }
  }
  setPortal(a: number, gold: boolean): void {
    this.portal.style.opacity = String(a);
    this.portal.style.background = gold ? 'radial-gradient(circle, rgba(255,210,90,0) 20%, rgba(240,180,60,0.85) 100%)' : 'radial-gradient(circle, rgba(160,90,255,0) 20%, rgba(120,60,220,0.85) 100%)';
  }

  private updateCompass(): void {
    const g = this.g, p = g.player, yaw = p.yaw;
    // bearings are clockwise from north (-z); the view heading is -yaw, so relative bearing = bearing + yaw
    for (let i = 0; i < 8; i++) {
      const m = this.marks[i], rel = wrapPi(m.b + yaw), px = Math.abs(rel) > CSPAN ? 1e9 : Math.round((rel / CSPAN) * CW);
      if (px === m.px) continue;
      if ((px === 1e9) !== (m.px === 1e9)) m.el.style.visibility = px === 1e9 ? 'hidden' : '';
      m.px = px; if (px !== 1e9) m.el.style.transform = `translateX(${px}px)`;
    }
    const sp = g.spawn, da = g.deathAt, tg = g.quests.target, home = g.dim === 0;
    this.pip(0, home, sp ? sp[0] + 0.5 : g.worldSpawn[0] + 0.5, sp ? sp[2] + 0.5 : g.worldSpawn[1] + 0.5, p.x, p.z, yaw);
    this.pip(1, !!da && da[0] === g.dim, da ? da[1] + 0.5 : 0, da ? da[3] + 0.5 : 0, p.x, p.z, yaw);
    this.pip(2, !!tg, tg ? tg[0] + 0.5 : 0, tg ? tg[1] + 0.5 : 0, p.x, p.z, yaw);
    // friends where the snapshots show them, else where the last `where` put them; then the pings
    let n = 0;
    const so = this.social;
    for (const f of so.members.values()) {
      if (f.self || f.dim !== so.dim || !f.placed) continue;
      const v = g.ents.player(f.slot), fx = v ? v.x : f.x, fz = v ? v.z : f.z;
      if (Math.abs(fx - p.x) < 3 && Math.abs(fz - p.z) < 3) continue;
      this.morePip(n++, f.slot, f.name, -1, bearing(p.x, p.z, yaw, fx, fz));
    }
    for (const q of so.pings) {
      const m = Math.round(Math.hypot(q.x - p.x, q.z - p.z));
      if (m < 3) continue;
      this.morePip(n++, -1, '', m, bearing(p.x, p.z, yaw, q.x, q.z));
    }
    for (; n < this.more.length; n++) { const q = this.more[n]; if (q.on) { q.on = false; q.el.style.display = 'none'; } }
    const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z), tod = ((g.clock % 1) * 24 + 6) % 24, min = Math.floor(tod * 60);
    if (x !== this.cX || y !== this.cY || z !== this.cZ || min !== this.cMin) {
      this.cX = x; this.cY = y; this.cZ = z; this.cMin = min;
      this.coord.textContent = `X ${x}  Y ${y}  Z ${z}  ·  ${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
    }
  }
  private pip(i: number, on: boolean, tx: number, tz: number, x: number, z: number, yaw: number): void {
    const q = this.pips[i];
    // standing on a marker gives it no bearing, so it hides until the player walks away
    if (on && Math.abs(tx - x) < 3 && Math.abs(tz - z) < 3) on = false;
    if (on !== q.on) { q.on = on; q.el.style.display = on ? '' : 'none'; }
    if (!on) return;
    const dx = tx - x, dz = tz - z, rel = wrapPi(Math.atan2(dx, -dz) + yaw), edge = Math.abs(rel) > CSPAN;
    const px = Math.round((Math.max(-CSPAN, Math.min(CSPAN, rel)) / CSPAN) * CW), m = Math.round(Math.hypot(dx, dz));
    if (px !== q.px) { q.px = px; q.el.style.transform = `translateX(${px}px)`; }
    if (edge !== q.edge) { q.edge = edge; q.el.classList.toggle('edge', edge); }
    if (m !== q.m) { q.m = m; q.d.textContent = m < 1000 ? m + ' m' : (m / 1000).toFixed(1) + ' km'; }
  }

  /** Extra pip `i`: a friend in `slot` labelled `name`, or (slot -1) a ping `m` metres away. */
  private morePip(i: number, slot: number, name: string, m: number, rel: number): void {
    let q = this.more[i];
    if (!q) {
      const e = el('div', 'pip', this.pipL), ic = el('i', '', e);
      q = this.more[i] = { el: e, i: ic, d: el('b', '', e), px: 1e9, on: true, edge: false, slot: -2, name: '', m: -1 };
    }
    if (!q.on) { q.on = true; q.el.style.display = ''; }
    if (slot !== q.slot) {
      q.slot = slot; q.name = ''; q.m = -1;
      const color = slot < 0 ? PING_COLOR : SEAT[slot % SEAT.length];
      q.i.style.background = color; q.d.style.color = color;
      // friends are round, pings keep the stylesheet's diamond
      q.i.style.borderRadius = slot < 0 ? '' : '50%'; q.i.style.transform = slot < 0 ? '' : 'none';
    }
    const edge = Math.abs(rel) > CSPAN, px = Math.round((Math.max(-CSPAN, Math.min(CSPAN, rel)) / CSPAN) * CW);
    if (px !== q.px) { q.px = px; q.el.style.transform = `translateX(${px}px)`; }
    if (edge !== q.edge) { q.edge = edge; q.el.classList.toggle('edge', edge); }
    if (slot >= 0 && name !== q.name) { q.name = name; q.d.textContent = name; }
    else if (slot < 0 && m !== q.m) { q.m = m; q.d.textContent = m < 1000 ? m + ' m' : (m / 1000).toFixed(1) + ' km'; }
  }

  /** Name tags over other players within TAG_R that terrain does not hide, and the pings in the world. */
  private updateSocial(dt: number): void {
    const g = this.g, cam = g.gfx.camera, v = this.v, w = this.vw, h = this.vh, so = this.social;
    let ti = 0;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    // what each player is doing, for the list: from the snapshots, this client's own from their header
    const hd = g.ents.head, hf = hd ? hd.flags : 0;
    for (const m of so.members.values()) {
      if (m.self) { so.setFlags(m.slot, (hf & SELF_DEAD ? PF_DEAD : 0) | (hf & SELF_LOADING ? PF_LOADING : 0) | (hf & SELF_SLEEPING ? PF_SLEEP : 0)); continue; }
      const pv = g.ents.player(m.slot);
      so.setFlags(m.slot, pv && pv.active ? pv.flags : -1);
    }
    for (const pv of g.ents.players) {
      if (!pv.active || ti >= this.ptags.length || pv.deadT >= 0.6) continue;
      const m = so.member(pv.slot), lie = pv.lie > 0.5;
      const tx = pv.x, ty = pv.y + (lie ? 0.9 : pv.h + 0.5 - pv.crouch * 0.2), tz = pv.z, dx = tx - cx, dy = ty - cy, dz = tz - cz, dist = Math.hypot(dx, dy, dz);
      if (!m || dist > TAG_R) continue;
      const t = this.ptags[ti];
      if (t.slot !== pv.slot) { t.slot = pv.slot; t.look = 0; t.text = ''; t.hp = -1; }
      t.look -= dt;
      if (t.look <= 0) { t.look = 0.25; raycast(g.world, cx, cy, cz, dx / dist, dy / dist, dz / dist, Math.max(0, dist - 0.6), ray, false, true); t.seen = !ray.hit; }
      if (!t.seen) continue;
      v.set(tx, ty, tz).project(cam);
      if (v.z > 1) continue;
      ti++;
      const st = stateOf(pv.flags), text = st ? `${m.name} · ${st}` : m.name;
      if (text !== t.text) { t.text = text; t.name.textContent = text; t.name.style.color = st ? '#b4bacb' : '#fff'; }
      const hp = Math.round(pv.hp * 40) / 40;
      if (hp !== t.hp) { t.hp = hp; t.bar.style.transform = `scaleX(${hp})`; }
      if (!t.on) { t.on = true; t.el.style.display = 'block'; }
      t.el.style.opacity = String(Math.min(1, (TAG_R - dist) / 8));
      t.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
    for (; ti < this.ptags.length; ti++) { const t = this.ptags[ti]; t.slot = -1; if (t.on) { t.on = false; t.el.style.display = 'none'; } }
    let mi = 0;
    const p = g.player;
    for (const q of so.pings) {
      if (mi >= this.marks2.length) break;
      v.set(q.x, q.y + 0.6, q.z).project(cam);
      if (v.z > 1) continue;
      const k = this.marks2[mi++], d = Math.round(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)), text = `${q.name || 'Ping'} · ${d} m`;
      if (text !== k.text) { k.text = text; k.label.textContent = text; k.label.style.color = SEAT[q.slot % SEAT.length]; }
      if (!k.on) { k.on = true; k.el.style.display = 'block'; }
      k.el.style.opacity = String(Math.min(1, q.t));
      k.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
    for (; mi < this.marks2.length; mi++) { const k = this.marks2[mi]; if (k.on) { k.on = false; k.el.style.display = 'none'; } }
  }

  update(dt: number): void {
    const g = this.g, inv = g.inv, st = g.stats;
    this.social.tick(dt);
    this.updateSocial(dt);
    this.chat.update(dt);
    this.roster.update(dt);
    if (inv.rev !== this.rev || inv.sel !== this.sel) {
      const selChanged = inv.sel !== this.sel;
      this.rev = inv.rev; this.sel = inv.sel;
      for (let i = 0; i < HOTBAR; i++) {
        const s = inv.slots[i], v = this.slots[i], k = s ? s.k : '', n = s ? s.n : 0;
        g.icons.apply(v.ic, s ? s.k : null);
        v.n.textContent = s && s.n > 1 ? String(s.n) : '';
        v.root.className = 'slot' + (i === inv.sel ? ' sel' : '') + (s && itemRarity(s) > 0 ? ' r' + itemRarity(s) : '');
        // a pickup or swap landing in the hotbar gives the icon a small bump
        if (k && (k !== v.k || n > v.cnt) && this.primed) { v.ic.classList.remove('bump'); void v.ic.offsetWidth; v.ic.classList.add('bump'); }
        v.k = k; v.cnt = n;
        const d = s ? item(s.k) : null, cd = d ? (d.heal && !d.food ? 1 : d.use === 'recall' ? 2 : 0) : 0;
        if (cd !== v.cd) { v.cd = cd; if (!cd && v.cv) { v.cv = 0; v.cdEl.style.transform = 'scaleY(0)'; } }
      }
      const h = inv.held(), sig = h ? h.k + ':' + (h.m ?? '') : '';
      const wpn = h ? item(h.k).weapon : undefined;
      if (wpn?.ammo) {
        // bows keep their name up with the arrows they will fire next
        const a = inv.findTagged('arrow');
        this.itemName.textContent = itemName(h!) + (a < 0 ? '  ·  no arrows' : `  ·  ${item(inv.slots[a]!.k).name} x${inv.count(inv.slots[a]!.k)}`);
        this.itemName.style.color = RARITY[itemRarity(h!)].color; this.itemName.style.opacity = '1'; this.nameT = 0; this.ammoName = true;
      } else if (selChanged || sig !== this.heldSig || this.ammoName) {
        this.ammoName = false;
        if (h) { this.itemName.textContent = itemName(h); this.itemName.style.color = RARITY[itemRarity(h)].color; this.itemName.style.opacity = '1'; this.nameT = 1.6; }
        else { this.itemName.style.opacity = '0'; this.nameT = 0; }
      }
      this.heldSig = sig; this.primed = true;
    }
    if (this.nameT > 0) { this.nameT -= dt; if (this.nameT <= 0) this.itemName.style.opacity = '0'; }
    for (let i = 0; i < HOTBAR; i++) {
      const v = this.slots[i];
      if (!v.cd) continue;
      const f = Math.round(Math.max(0, Math.min(1, v.cd === 1 ? st.salveCd / 9 : g.recallT / 30)) * 100) / 100;
      if (f !== v.cv) { v.cv = f; v.cdEl.style.transform = `scaleY(${f})`; }
    }
    const hpI = Math.ceil(st.hp), manaI = Math.floor(st.mana), foodI = Math.ceil(st.hunger);
    if (hpI !== this.hpI || st.maxHp !== this.maxHpI) { this.hpI = hpI; this.maxHpI = st.maxHp; this.hpText = `${hpI} / ${st.maxHp}`; }
    if (manaI !== this.manaI || st.maxMana !== this.maxManaI) { this.manaI = manaI; this.maxManaI = st.maxMana; this.manaText = `${manaI} / ${st.maxMana}`; }
    if (foodI !== this.foodI) { this.foodI = foodI; this.foodText = foodI <= 4 ? `HUNGRY ${foodI} / 20` : `${foodI} / 20`; }
    setBar(this.hp, st.hp / st.maxHp, this.hpText);
    const hpLow = st.hp / st.maxHp < 0.25;
    if (hpLow !== this.hpLow) { this.hpLow = hpLow; this.hp.root.classList.toggle('low', hpLow); this.root.classList.toggle('lowhp', hpLow); }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) { this.hitOn = false; this.critOn = false; this.cross.classList.remove('hit', 'crit'); } }
    setBar(this.food, st.hunger / 20, this.foodText);
    const foodLow = st.hunger <= 4;
    if (foodLow !== this.foodLow) { this.foodLow = foodLow; this.food.root.classList.toggle('low', foodLow); }
    setBar(this.mana, st.mana / st.maxMana, this.manaText);
    setBar(this.xp, st.xp / st.xpNeeded(), '');
    if (inv.coins !== this.coinV) { this.coinV = inv.coins; this.coins.textContent = `${inv.coins} coins`; }
    if (st.level !== this.lvlV || st.points !== this.ptsV) {
      this.lvlV = st.level; this.ptsV = st.points;
      this.lvl.textContent = `Lv ${st.level}` + (st.points > 0 ? `  (+${st.points})` : '');
    }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) { this.banner.style.opacity = '0'; if (this.bannerQ.length) this.bannerGap = 0.6; } }
    else if (this.bannerGap > 0) { this.bannerGap -= dt; if (this.bannerGap <= 0) { const q = this.bannerQ.shift(); if (q) this.showBanner(q[0], q[1], q[2]); } }

    const b = g.ents.boss();
    if (!!b !== this.bossOn) { this.bossOn = !!b; this.boss.classList.toggle('show', !!b); this.root.classList.toggle('bossing', !!b); if (!b) this.bossKey = ''; }
    if (b) {
      const spec = b.def.boss!;
      if (this.bossKey !== b.def.key) {
        this.bossKey = b.def.key; this.bossName.textContent = b.def.name; this.bossTitle.textContent = spec.title; this.bossTitle.style.display = spec.title ? '' : 'none'; this.bossHpI = -1;
        for (const n of this.bossNotches) n.remove();
        this.bossNotches.length = 0;
        for (const ph of spec.phases) if (ph.below < 1 && ph.below > 0) { const n = el('s', '', this.bossBar.root); n.style.left = ph.below * 100 + '%'; this.bossNotches.push(n); }
        const c = BOSS_BARS[b.def.key];
        this.bossBar.fill.style.background = c ? `linear-gradient(${c[0]}, ${c[1]})` : '';
        this.bossPhase = this.phaseOf(spec.phases, b.hp / b.maxHp);
      }
      const hpI = Math.ceil(b.hp);
      if (hpI !== this.bossHpI) { this.bossHpI = hpI; this.bossText = `${hpI} / ${Math.round(b.maxHp)}`; }
      setBar(this.bossBar, b.hp / b.maxHp, this.bossText);
      const ph = this.phaseOf(spec.phases, b.hp / b.maxHp);
      if (ph !== this.bossPhase) { this.bossPhase = ph; this.boss.classList.remove('shift'); void this.boss.offsetWidth; this.boss.classList.add('shift'); }
    }
    const q = g.quests.tracker();
    if (q.key !== this.questKey) {
      this.questKey = q.key;
      this.quest.innerHTML = '';
      el('div', 't', this.quest, q.chapter); el('div', 'h', this.quest, q.title); el('div', 'd', this.quest, q.hint);
      if (q.need > 0) {
        const pr = el('div', 'p', this.quest); el('span', '', pr, `${q.have} / ${q.need}`);
        const b = el('div', 'pb', pr); el('i', '', b).style.transform = `scaleX(${q.have / q.need})`;
      }
      if (q.where) el('div', 'w', this.quest, q.where);
      if (q.index !== this.questIdx) { if (this.questIdx >= 0) { this.quest.classList.add('new'); this.questT = 1.2; } this.questIdx = q.index; }
    }
    if (this.questT > 0) { this.questT -= dt; if (this.questT <= 0) this.quest.classList.remove('new'); }
    const regen = st.hunger >= 14 && st.hp < st.maxHp && !st.dead;
    if (regen !== this.regenOn) { this.regenOn = regen; this.hp.root.classList.toggle('regen', regen); }
    const ev = g.event;
    if ((ev.a !== null) !== this.eventOn) { this.eventOn = ev.a !== null; this.event.classList.toggle('hidden', !this.eventOn); }
    if (ev.a) {
      const pr = eventProgress(ev, g.clock);
      if (ev.a !== this.evKind || (ev.a !== 'moon' && pr !== this.evProg)) { this.evKind = ev.a; this.evProg = pr; this.eventText.textContent = eventLabel(ev); }
      setBar(this.eventBar, pr, '');
    }
    this.buffGen++;
    st.buffs.forEach(this.buffCb);
    if (this.buffRows.size !== st.buffs.size) for (const [k, row] of this.buffRows) if (row.gen !== this.buffGen) { row.el.remove(); this.buffRows.delete(k); }

    this.updateCompass();

    // floating text
    const cam = g.gfx.camera, w = this.vw, h = this.vh, v = this.v;
    for (const f of this.floats) {
      if (f.life <= 0) continue;
      f.life -= dt; f.y += f.vy * dt; f.vy *= 1 - dt * 2.2;
      if (f.life <= 0) { f.el.style.display = 'none'; continue; }
      v.set(f.x, f.y, f.z).project(cam);
      if (v.z > 1) { f.el.style.opacity = '0'; continue; }
      f.el.style.opacity = String(Math.min(1, f.life / (f.max * 0.4)));
      f.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
    }
    // name tags over nearby townsfolk
    let ti = 0;
    for (const m of g.ents.mobs) {
      if (!m.active || m.def.ai !== 'npc' || ti >= this.tags.length) continue;
      if (Math.hypot(m.x - g.player.x, m.z - g.player.z) > 12) continue;
      v.set(m.x, m.y + m.h + 0.35, m.z).project(cam);
      if (v.z > 1) continue;
      const t = this.tags[ti++];
      if (t.textContent !== m.def.name) t.textContent = m.def.name;
      t.style.display = 'block'; t.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
    }
    for (; ti < this.tags.length; ti++) if (this.tags[ti].style.display !== 'none') this.tags[ti].style.display = 'none';
  }
}

/** Nights until the Hollow Moon (0 = tonight), or -1 before the Pale Warden has fallen. */
export function moonIn(flags: ReadonlySet<string>, clock: number): number { return flags.has('boss:3') ? 7 - (Math.floor(clock) % 8) : -1; }
