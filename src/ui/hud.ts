// Heads-up display: hotbar, vitals, boss bar, quest tracker, toasts and floating combat text.
import * as THREE from 'three';
import { RARITY, item, itemName, itemRarity } from '../data/items';
import type { Game } from '../game';
import { BUFFS } from '../systems/stats';
import { HOTBAR } from '../systems/inventory';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) { if (cls[0] === '#') e.id = cls.slice(1); else e.className = cls; }
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
interface Bar { root: HTMLElement; fill: HTMLElement; label: HTMLElement; v: number; t: string }
function bar(cls: string, parent: HTMLElement): Bar {
  const root = el('div', 'bar ' + cls, parent), fill = el('i', '', root), label = el('b', '', root);
  return { root, fill, label, v: -1, t: '' };
}
function setBar(b: Bar, frac: number, text: string): void {
  frac = Math.max(0, Math.min(1, frac));
  if (Math.abs(frac - b.v) > 0.002) { b.v = frac; b.fill.style.transform = `scaleX(${frac})`; }
  if (text !== b.t) { b.t = text; b.label.textContent = text; }
}
interface Floater { el: HTMLElement; x: number; y: number; z: number; life: number; max: number; vy: number }

export class Hud {
  readonly root: HTMLElement;
  /** cd: which cooldown shades the slot (0 none, 1 salve, 2 recall stone); cv: last written overlay fraction. */
  private slots: { root: HTMLElement; ic: HTMLElement; n: HTMLElement; cdEl: HTMLElement; cd: number; cv: number; k: string; cnt: number }[] = [];
  private heldSig = ''; private ammoName = false; private primed = false;
  private hp: Bar; private food: Bar; private mana: Bar; private xp: Bar; private coins: HTMLElement; private lvl: HTMLElement;
  private itemName: HTMLElement; private toasts: HTMLElement; private banner: HTMLElement; private bannerT = 0;
  private boss: HTMLElement; private bossName: HTMLElement; private bossTitle: HTMLElement; private bossBar: Bar;
  private quest: HTMLElement; private event: HTMLElement; private eventBar: Bar; private eventText: HTMLElement;
  private buffs: HTMLElement; private prompt: HTMLElement; private hurt: HTMLElement; private portal: HTMLElement;
  private floats: Floater[] = []; private tags: HTMLElement[] = [];
  private rev = -1; private sel = -1; private nameT = 0; private questKey = ''; private buffKey = ''; private coinV = -1; private lvlV = -1; private ptsV = -1;
  private v = new THREE.Vector3();
  // cached values so frames where nothing changed build no strings and touch no classes
  private hpI = -1; private maxHpI = -1; private hpText = ''; private manaI = -1; private maxManaI = -1; private manaText = ''; private foodI = -1; private foodText = '';
  private hpLow = false; private foodLow = false; private bossOn = false; private eventOn = false; private promptText: string | null = null; private evKind = ''; private evProg = -1;
  private vw = window.innerWidth; private vh = window.innerHeight;

  constructor(ui: HTMLElement, private g: Game) {
    const r = this.root = el('div', '#hud', ui);
    this.hurt = el('div', '#hurt', r); this.portal = el('div', '#portalfx', r);
    el('div', '#crosshair', r);
    const wrap = el('div', '#hotwrap', r), bars = el('div', 'bars', wrap);
    this.hp = bar('hp', bars); this.food = bar('food', bars); this.mana = bar('mana', bars); this.coins = el('div', '#coins', bars);
    this.xp = bar('xp', bars);
    const hb = el('div', '#hotbar', wrap);
    for (let i = 0; i < HOTBAR; i++) {
      const s = el('div', 'slot', hb), ic = el('div', 'ic', s), cdEl = el('div', 'cd', s); el('div', 'k', s, String(i + 1));
      this.slots.push({ root: s, ic, n: el('div', 'n', s), cdEl, cd: 0, cv: 0, k: '', cnt: 0 });
    }
    this.lvl = el('div', '#lvl', r); this.itemName = el('div', '#itemname', r);
    this.toasts = el('div', '#toasts', r); this.banner = el('div', '#banner', r);
    this.boss = el('div', '#boss', r); this.bossTitle = el('div', 'tt', this.boss); this.bossName = el('div', 'nm', this.boss); this.bossBar = bar('', this.boss);
    this.boss.classList.add('hidden');
    this.quest = el('div', '#quest', r);
    this.event = el('div', '#event', r); this.eventText = el('div', '', this.event); this.eventBar = bar('', this.event); this.event.classList.add('hidden');
    this.buffs = el('div', '#buffs', r); this.prompt = el('div', '#prompt', r); this.prompt.classList.add('hidden');
    for (let i = 0; i < 48; i++) { const e = el('div', 'float', r); e.style.display = 'none'; this.floats.push({ el: e, x: 0, y: 0, z: 0, life: 0, max: 1, vy: 0 }); }
    for (let i = 0; i < 10; i++) { const e = el('div', 'float tag', r); e.style.display = 'none'; this.tags.push(e); }
    window.addEventListener('resize', () => { this.vw = window.innerWidth; this.vh = window.innerHeight; });
  }
  setVisible(v: boolean): void { this.root.classList.toggle('hidden', !v); }

  toast(text: string, color = '#e9e4d6'): void {
    const t = el('div', 'toast', undefined, text);
    t.style.color = color;
    this.toasts.prepend(t);
    while (this.toasts.children.length > 7) this.toasts.lastElementChild!.remove();
    setTimeout(() => t.remove(), 5200);
  }
  showBanner(text: string, sub = '', color = '#ffd9a0'): void {
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
    if (text !== null) this.prompt.textContent = text;
    if ((text === null) !== (this.promptText === null)) this.prompt.classList.toggle('hidden', text === null);
    this.promptText = text;
  }
  flashHurt(): void { this.hurt.style.transition = 'none'; this.hurt.style.opacity = '0.75'; requestAnimationFrame(() => { this.hurt.style.transition = 'opacity 0.5s'; this.hurt.style.opacity = '0'; }); }
  setPortal(a: number, gold: boolean): void {
    this.portal.style.opacity = String(a);
    this.portal.style.background = gold ? 'radial-gradient(circle, rgba(255,210,90,0) 20%, rgba(240,180,60,0.85) 100%)' : 'radial-gradient(circle, rgba(160,90,255,0) 20%, rgba(120,60,220,0.85) 100%)';
  }

  update(dt: number): void {
    const g = this.g, inv = g.inv, st = g.stats;
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
    if (hpLow !== this.hpLow) { this.hpLow = hpLow; this.hp.root.classList.toggle('low', hpLow); }
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
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.style.opacity = '0'; }

    const b = g.mobs.activeBoss();
    if (!!b !== this.bossOn) { this.bossOn = !!b; this.boss.classList.toggle('hidden', !b); }
    if (b) {
      if (this.bossName.textContent !== b.def.name) { this.bossName.textContent = b.def.name; this.bossTitle.textContent = b.def.boss!.title; }
      setBar(this.bossBar, b.hp / b.maxHp, '');
    }
    const q = g.quests.tracker();
    if (q.key !== this.questKey) {
      this.questKey = q.key;
      this.quest.innerHTML = '';
      el('div', 't', this.quest, q.chapter); el('div', 'h', this.quest, q.title); el('div', 'd', this.quest, q.hint);
      if (q.where) el('div', 'w', this.quest, q.where);
    }
    const ev = g.events;
    if ((ev.active !== null) !== this.eventOn) { this.eventOn = ev.active !== null; this.event.classList.toggle('hidden', !this.eventOn); }
    if (ev.active) {
      const pr = ev.progress();
      if (ev.active !== this.evKind || (ev.active !== 'moon' && pr !== this.evProg)) { this.evKind = ev.active; this.evProg = pr; this.eventText.textContent = ev.label(); }
      setBar(this.eventBar, pr, '');
    }
    let bk = '';
    for (const [k, t] of st.buffs) bk += k + Math.ceil(t / 5) + ';';
    if (bk !== this.buffKey) {
      this.buffKey = bk; this.buffs.innerHTML = '';
      for (const [k, t] of st.buffs) el('div', '', this.buffs, `${BUFFS[k]?.name ?? k}  ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
    }

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
    for (const m of g.mobs.list) {
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
