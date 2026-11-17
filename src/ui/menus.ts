// Title / world-select screen, pause menu, settings and the death screen.
import { GAME_TITLE } from '../core/constants';
import { strSeed } from '../core/noise';
import type { Game } from '../game';
import { NAME_RE, TOKEN_KEY } from '../net/protocol';
import { GfxSettings, PRESETS } from '../render/gfx';
import { type WorldSummary, deleteWorld, listWorlds } from '../storage/idb';
import { claimWorld } from '../storage/lock';
import { el } from './hud';
import { ashlar } from './kit/art/button';
import { HEX, ci } from './kit/palette';
import { TitleScene, sceneLayout, unitScale } from './titlescene';

export interface Settings { preset: string; gfx: GfxSettings; sens: number; sfx: number; music: number; bob: boolean;
  shake: number; autoJump: boolean; autoTool: boolean; flyToggle: boolean; rawMouse: boolean; /** 0 = automatic */ uiScale: number }
const KEY = 'cairnlight.settings' /* working name kept so saved settings survive the rename */;
export function loadSettings(): Settings {
  const def: Settings = { preset: 'medium', gfx: { ...PRESETS.medium }, sens: 1, sfx: 0.8, music: 0.45, bob: true,
    shake: 1, autoJump: false, autoTool: true, flyToggle: true, rawMouse: false, uiScale: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...def, ...s, gfx: { ...def.gfx, ...(s.gfx || {}) } }; } catch { /* first run */ }
  return def;
}
export const saveSettings = (s: Settings): void => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };

// Interface scale: written to --ui on <html>; CSS zooms the HUD, windows and menus by it.
let uiChoice = 0, uiNow = 1, uiHooked = false;
const autoUiScale = (): number => Math.max(0.75, Math.min(2, Math.floor(Math.min(window.innerWidth / 1280, window.innerHeight / 720) * 8) / 8));
/** The scale currently in effect (after resolving Auto). */
export const uiScale = (): number => uiNow;
export function applyUiScale(v: number): void {
  applyPixelScale();
  uiChoice = v;
  uiNow = v > 0 ? Math.max(0.5, Math.min(2, v)) : autoUiScale();
  document.documentElement.style.setProperty('--ui', String(uiNow));
  if (!uiHooked) { uiHooked = true; window.addEventListener('resize', () => { applyPixelScale(); if (uiChoice <= 0) applyUiScale(0); }); }
}

/**
 * The menus are drawn in the kit's units at a whole-number zoom (--px), the scale the title's picture is drawn at, so
 * that every edge and letter of them lands on whole pixels. The menu button's pebbles are painted once, by the kit's
 * own placing (art/button), into a tile the buttons repeat.
 */
let pebbles = false;
function applyPixelScale(): void {
  const root = document.documentElement.style;
  root.setProperty('--px', String(unitScale()));
  if (pebbles) return;
  pebbles = true;
  const W = 96, H = 20, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  for (const [px, py, col] of ashlar(W + 6, H, 0, 0, 0, 0x5eed)) { x.fillStyle = HEX[ci(col)]; x.fillRect(px - 2, py - 2, 1, 1); }
  root.setProperty('--pebbles', `url(${c.toDataURL()})`);
}

const KEYS: [string, string][] = [['W A S D', 'Move'], ['Space', 'Jump / swim up'], ['Shift', 'Sneak'], ['R, Ctrl or double-tap W', 'Sprint'], ['Left mouse', 'Mine / attack'], ['Right mouse', 'Use / place'], ['Middle mouse', 'Pick block'],
  ['E', 'Inventory and crafting'], ['G', 'Guide'], ['Q', 'Drop item'], ['Ctrl+Q', 'Drop stack'], ['H', 'Use best salve'], ['1-9, wheel', 'Hotbar'], ['Shift-click', 'Quick move'], ['Right-click', 'Split stack'],
  ['F1', 'Hide HUD'], ['F3', 'Debug overlay'], ['T', 'Command line'], ['Esc', 'Pause']];

/** The tab the settings plate was last left on, kept for the next time it opens. */
let settingsTab = 0;
const TABS = ['Picture', 'Effects', 'Sound', 'Play'] as const;

/**
 * Settings on one plate under four tabs, a row to each setting: its name on the left, its control on the right, a
 * slider's value written after it. A tab is a small slab; the one that is open is pressed in.
 */
export function settingsPanel(parent: HTMLElement, s: Settings, apply: () => void): HTMLElement {
  const root = el('div', 'panel settings', parent);
  const render = (): void => {
    root.innerHTML = '';
    const tabs = el('div', 'tabs', root);
    TABS.forEach((name, i) => {
      el('button', 'btn sm' + (i === settingsTab ? ' gold' : ''), tabs, name).onclick = () => { settingsTab = i; render(); };
    });
    const box = el('div', 'rows', root);
    const row = (label: string): HTMLElement => { const o = el('div', 'opt', box); el('span', '', o, label); return el('div', 'ctl', o); };
    const onOff = (label: string, get: () => boolean, set: (v: boolean) => void): void => {
      const b = el('button', 'btn sm' + (get() ? ' gold' : ''), row(label), get() ? 'On' : 'Off');
      b.onclick = () => { set(!get()); apply(); render(); };
    };
    const gfx = (label: string, k: keyof GfxSettings): void => onOff(label, () => !!s.gfx[k], (v) => { (s.gfx as any)[k] = v; s.preset = 'custom'; });
    const slider = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void, fmt: (v: number) => string, live = false): HTMLInputElement => {
      const c = row(label), r = el('input', '', c), val = el('span', 'val', c, fmt(get()));
      r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(get());
      r.oninput = () => { set(+r.value); val.textContent = fmt(get()); if (live) apply(); };
      r.onchange = () => apply();
      return r;
    };
    if (settingsTab === 0) {
      const seg = el('div', 'seg', row('Preset'));
      for (const p of ['low', 'medium', 'high']) {
        el('button', 'btn sm' + (s.preset === p ? ' gold' : ''), seg, p[0].toUpperCase() + p.slice(1)).onclick = () => { s.preset = p; s.gfx = { ...PRESETS[p] }; apply(); render(); };
      }
      slider('Render distance', 4, 16, 1, () => s.gfx.renderDist, (v) => { s.gfx.renderDist = v; s.preset = 'custom'; }, (v) => v + ' chunks');
      slider('Field of view', 60, 100, 1, () => s.gfx.fov, (v) => (s.gfx.fov = v), (v) => v + '°');
      slider('Resolution scale', 0.5, 1, 0.05, () => s.gfx.scale, (v) => { s.gfx.scale = v; s.preset = 'custom'; }, (v) => Math.round(v * 100) + '%');
      gfx('Adaptive resolution', 'autoScale');
      slider('Texture filtering', 0, 4, 1, () => Math.round(Math.log2(s.gfx.aniso || 1)), (v) => { s.gfx.aniso = 2 ** v; s.preset = 'custom'; }, (v) => (v ? 2 ** v + 'x' : 'Off'));
      gfx('Anti-aliasing (MSAA)', 'msaa'); gfx('Edge smoothing (FXAA)', 'fxaa');
    } else if (settingsTab === 1) {
      gfx('Sun shadows', 'shadows'); gfx('Bloom', 'bloom'); gfx('Tone mapping', 'tonemap'); gfx('Eye adaptation', 'adapt');
      gfx('Vignette', 'vignette'); gfx('Clouds', 'clouds'); gfx('Swaying foliage and waves', 'sway');
    } else if (settingsTab === 2) {
      slider('Effects volume', 0, 1, 0.05, () => s.sfx, (v) => (s.sfx = v), (v) => Math.round(v * 100) + '%', true);
      slider('Music volume', 0, 1, 0.05, () => s.music, (v) => (s.music = v), (v) => Math.round(v * 100) + '%', true);
    } else {
      slider('Mouse sensitivity', 0.3, 2.5, 0.05, () => s.sens, (v) => (s.sens = v), (v) => v.toFixed(2));
      onOff('Raw mouse input', () => s.rawMouse, (v) => (s.rawMouse = v));
      onOff('View bobbing', () => s.bob, (v) => (s.bob = v));
      slider('Screen shake', 0, 1, 0.05, () => s.shake, (v) => (s.shake = v), (v) => Math.round(v * 100) + '%');
      onOff('Auto-jump up single blocks', () => s.autoJump, (v) => (s.autoJump = v));
      onOff('Switch tools automatically', () => s.autoTool, (v) => (s.autoTool = v));
      onOff('Double-tap Space to fly (creative)', () => s.flyToggle, (v) => (s.flyToggle = v));
      // the leftmost stop (below 75%) means Auto; applied on release so the slider does not jump under the mouse while dragging
      const ui = slider('UI scale', 0.625, 2, 0.125, () => s.uiScale || 0.625, (v) => (s.uiScale = v < 0.7 ? 0 : v), (v) => (v < 0.7 ? 'Auto' : Math.round(v * 100) + '%'));
      ui.onchange = () => { applyUiScale(s.uiScale); apply(); };
    }
  };
  render();
  return root;
}
function keysPanel(parent: HTMLElement): void {
  const k = el('div', 'keys', parent);
  for (const [a, b] of KEYS) { el('b', '', k, a); el('span', '', k, b); }
}

/** Why this page cannot save, as the title menu, the banner in the game and the pause screen each say it. `code` is the
 *  StorageError's: 'version' when the database was written by a newer build, anything else when the browser refuses it. */
export function noSaveText(code: string | undefined): { menu: string; banner: string; pause: string } {
  return code === 'version'
    ? { menu: 'These worlds were saved by a newer version of the game. Nothing will be saved here.',
      banner: 'These worlds were saved by a newer version of the game. Progress is lost when the tab closes.', pause: 'Saving is unavailable: a newer version saved these worlds' }
    : { menu: 'This browser is blocking storage. Worlds will not be saved.',
      banner: 'This browser is blocking storage. Progress is lost when the tab closes.', pause: 'Saving is unavailable in this browser' };
}

const line = (parent: HTMLElement, text: string): void => { el('div', 'line', parent, text); };

/** The world the title menu was asked to open: one of the list, or a new one that exists once it is first saved. */
export interface WorldChoice { id: string; name: string; seed: number; seedText: string }

/** What a server answers at `GET ./info`. */
export interface ServerInfo {
  server: true; name: string; players: number; max: number; password: boolean;
  /** Present only on a server started with `--harness`: its pages give the test harness `window.T`. */
  harness?: true;
}
/** A server the title menu was asked to join. `address` as the player typed it, or the page's own origin. */
export interface JoinChoice { address: string; name: string; password?: string }
export interface JoinMenu {
  /** The server that served this page, when one did: its address is the page's own and is not asked for. */
  here: ServerInfo | null;
  /** An address to offer (the last one joined, or `?server=`). */
  address: string;
  /** Start joining. What it returns gives the attempt up. */
  onJoin: (j: JoinChoice) => () => void;
  /** Open on the join screen rather than the home screen. */
  open?: boolean;
}
const NAME_KEY = 'peopls.name', SERVER_KEY = 'peopls.server';
const remembered = (k: string): string => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const remember = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
/** The name this browser last joined with. */
export const savedName = (): string => remembered(NAME_KEY);
/** This browser's token (4.2): 32 random hex characters, made once and kept. A page that cannot keep it is a new player
 *  each time it loads. */
export function playerToken(): string {
  const t = remembered(TOKEN_KEY);
  if (/^[0-9a-f]{32}$/.test(t)) return t;
  const n = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  remember(TOKEN_KEY, n);
  return n;
}

export class TitleMenu {
  private root: HTMLElement;
  /** What Escape does on the current screen (null on the home screen). */
  private back: (() => void) | null = null;
  private onEsc = (e: KeyboardEvent): void => { if (e.code === 'Escape' && this.back) { e.preventDefault(); this.back(); } };
  /** The ground at night behind every screen of the title; on the screens under it, dimmed and without the mark. */
  private scene: TitleScene;
  private place = (): void => {
    const s = unitScale();
    this.root.style.setProperty('--coltop', sceneLayout(Math.ceil(innerWidth / s), Math.ceil(innerHeight / s)).colTop + 'px');
  };
  constructor(ui: HTMLElement, private settings: Settings, private onPlay: (w: WorldChoice) => void, private canSave = true,
    private noSaveWhy = noSaveText(undefined).menu, private net: JoinMenu | null = null) {
    this.scene = new TitleScene(ui);
    this.root = el('div', '#menu', ui); this.root.classList.add('solid');
    this.place();
    window.addEventListener('resize', this.place);
    window.addEventListener('keydown', this.onEsc);
    if (net?.open) this.join(); else void this.home();
  }
  /** Clears the menu for a screen. The home screen has no heading: the mark is drawn in the sky of the picture. */
  private head(title: string | null): void {
    this.root.innerHTML = '';
    const home = title === null;
    this.root.classList.toggle('home', home);
    this.root.classList.toggle('under', !home);
    this.scene.mark = home;
    if (home) el('h1', 'sr', this.root, GAME_TITLE);
    else el('h2', '', this.root, title);
    if (!this.canSave) el('div', 'warn', this.root, this.noSaveWhy);
  }
  private async home(): Promise<void> {
    this.head(null); this.back = null;
    const col = el('div', 'col', this.root), worlds: WorldSummary[] = this.canSave ? await listWorlds().catch(() => []) : [];
    const here = this.net?.here;
    if (this.net) el('button', 'btn' + (here ? ' gold' : ''), col, here ? `Join ${here.name}` : 'Join a server').onclick = () => this.join();
    const list = worlds.length ? el('div', 'scroll worlds', col) : col;
    for (const w of worlds) {
      const row = el('div', 'world', list), info = el('div', '', row);
      el('div', 'nm', info, w.name); el('div', 'mt', info, `seed ${w.seedText} · ${new Date(w.played).toLocaleDateString()} · level ${w.level}`);
      el('div', 'sp', row);
      const del = el('button', 'btn sm bad', row, 'Delete');
      del.onclick = async (e) => {
        e.stopPropagation();
        if (del.textContent !== 'Sure?') { del.textContent = 'Sure?'; return; }
        const release = await claimWorld(w.id);
        if (!release) { del.textContent = 'Open in another tab'; return; }
        try { await deleteWorld(w.id); } finally { release(); }
        void this.home();
      };
      row.onclick = () => this.play(w);
    }
    el('button', 'btn gold', col, worlds.length ? 'New world' : 'Begin').onclick = () => this.create();
    el('button', 'btn', col, 'Settings').onclick = () => this.options();
    el('button', 'btn', col, 'Controls').onclick = () => { this.head('Controls'); keysPanel(this.root); this.back = () => void this.home(); el('button', 'btn', this.root, 'Back').onclick = this.back; };
  }
  private create(): void {
    this.head('New world');
    const col = el('div', 'col', this.root);
    const name = el('input', '', col); name.type = 'text'; name.placeholder = 'World name'; name.maxLength = 28; name.value = 'New World';
    const seed = el('input', '', col); seed.type = 'text'; seed.placeholder = 'Seed (leave blank for a random one)'; seed.maxLength = 32;
    const go = el('button', 'btn gold', col, 'Create world');
    name.onkeydown = seed.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    go.onclick = () => {
      const seedText = seed.value.trim() || String(Math.floor(Math.random() * 1e9));
      const n = /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText);
      this.play({ id: 'w' + Date.now().toString(36), name: name.value.trim() || 'New World', seed: n, seedText });
    };
    this.back = () => void this.home();
    el('button', 'btn', col, 'Back').onclick = this.back;
    name.focus(); name.select();
  }
  private options(): void {
    this.head('Settings');
    settingsPanel(this.root, this.settings, () => saveSettings(this.settings));
    this.back = () => void this.home();
    el('button', 'btn', this.root, 'Back').onclick = this.back;
  }
  private play(w: WorldChoice): void { this.close(); this.onPlay(w); }
  /** Take the menu down for good. */
  close(): void { window.removeEventListener('keydown', this.onEsc); window.removeEventListener('resize', this.place); this.scene.destroy(); this.root.remove(); }

  /** The join screen. `why`: what went wrong with the last attempt. */
  join(why = ''): void {
    const net = this.net;
    if (!net) return;
    const here = net.here;
    this.head('Join a world');
    const col = el('div', 'col', this.root);
    let addr: HTMLInputElement | null = null;
    if (here) line(col, `${here.name} · ${here.players} of ${here.max} playing`);
    else { addr = el('input', '', col); addr.type = 'text'; addr.placeholder = 'Address (host:port)'; addr.maxLength = 200; addr.value = net.address || remembered(SERVER_KEY); }
    const name = el('input', '', col); name.type = 'text'; name.placeholder = 'Your name'; name.maxLength = 16; name.value = savedName();
    let pw: HTMLInputElement | null = null;
    if (!here || here.password) {
      pw = el('input', '', col); pw.type = 'password'; pw.placeholder = here ? 'Password' : 'Password (if the server has one)'; pw.maxLength = 128;
    }
    const msg = el('div', 'warn', col, why);
    const go = el('button', 'btn gold', col, 'Join');
    for (const i of [addr, name, pw]) if (i) i.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    go.onclick = () => {
      const n = name.value.trim(), a = addr ? addr.value.trim() : '';
      if (!NAME_RE.test(n)) { msg.textContent = 'A name is 1 to 16 letters, digits, spaces, _ or -.'; name.focus(); return; }
      if (addr && !a) { msg.textContent = 'Which server? Type its address, for example 192.168.1.20:8080.'; addr.focus(); return; }
      remember(NAME_KEY, n);
      if (addr) remember(SERVER_KEY, a);
      const stop = net.onJoin({ address: a, name: n, password: pw?.value || undefined });
      this.status('Connecting...', () => { stop(); this.join(); });
    };
    this.back = () => void this.home();
    el('button', 'btn', col, 'Back').onclick = this.back;
    (addr && !addr.value ? addr : !name.value ? name : pw ?? go).focus();
  }
  /** A join under way: what it is doing, and a way to give it up. */
  status(text: string, cancel: () => void): void {
    this.head('Join a world');
    const col = el('div', 'col', this.root);
    line(col, text);
    this.back = cancel;
    el('button', 'btn', col, 'Cancel').onclick = cancel;
  }
}

export class GameMenu {
  private root: HTMLElement;
  open = false; dead = false;
  private sub = false;
  constructor(ui: HTMLElement, private g: Game) { this.root = el('div', '#menu', ui); this.root.classList.add('hidden'); }
  private show(): void { this.open = true; this.root.classList.remove('hidden'); this.g.input.uiMode = true; this.g.input.unlock(); }
  close(): void {
    if (!this.open || this.dead) return;
    const g = this.g;
    this.open = false; this.root.classList.add('hidden'); this.root.classList.remove('death'); g.input.uiMode = false;
    // stay paused until the pointer is really ours again (browsers refuse a re-lock without a click, e.g. after Esc)
    void g.input.lock().then((ok) => { if (ok) g.paused = false; else if (!this.open && g.paused) g.hud.setPrompt('Click to resume'); });
  }
  pause(): void {
    const g = this.g;
    if (this.dead) return;
    g.paused = true; this.show(); this.sub = false;
    this.root.innerHTML = '';
    el('h2', '', this.root, 'Paused'); el('div', 'sub', this.root, g.worldName);
    const remote = !g.session.local;
    const saved = el('div', 'saved', this.root, remote ? 'The server keeps this world' : g.cfg.canSave === false ? noSaveText(g.cfg.noSave).pause : 'Saving...');
    if (g.cfg.canSave === false) saved.classList.add('warn');
    const col = el('div', 'col', this.root);
    el('button', 'btn gold', col, 'Resume').onclick = () => this.close();
    el('button', 'btn', col, 'Settings').onclick = () => this.options();
    el('button', 'btn', col, 'Controls').onclick = () => { this.sub = true; this.root.innerHTML = ''; el('h2', '', this.root, 'Controls'); keysPanel(this.root); el('button', 'btn', this.root, 'Back').onclick = () => this.pause(); };
    el('button', 'btn', col, 'Save and quit to title').onclick = () => void g.quit();
    if (!remote) void g.save().then(() => { if (g.cfg.canSave !== false) saved.textContent = g.lastSave > Date.now() - 5000 ? 'Progress saved' : 'Could not save just now'; });
  }
  /** Escape: back out of a sub-screen, or resume from the pause screen. */
  escape(): void { if (this.sub) this.pause(); else this.close(); }
  private options(): void {
    const g = this.g;
    this.sub = true; this.root.innerHTML = '';
    el('h2', '', this.root, 'Settings');
    settingsPanel(this.root, g.cfg.settings, () => { g.applySettings(); saveSettings(g.cfg.settings); });
    el('button', 'btn', this.root, 'Back').onclick = () => this.pause();
  }
  death(cause: string, lost: number): void {
    const g = this.g;
    this.dead = true; this.show();
    this.root.innerHTML = ''; this.root.classList.add('death');
    const h = el('h2', '', this.root, 'You fell'); h.style.color = HEX[ci('blood.lt')];
    el('div', 'sub', this.root, cause + (lost ? ` · ${lost} coins lost` : ''));
    const col = el('div', 'col', this.root);
    const rise = el('button', 'btn gold', col, 'Rise again'), quit = el('button', 'btn', col, 'Save and quit to title');
    rise.onclick = () => { this.dead = false; g.respawn(); this.close(); };
    quit.onclick = () => { g.respawn(); void g.quit(); };
    // held back while the screen fades in, so a still-attacking click cannot respawn unseen
    rise.disabled = quit.disabled = true; setTimeout(() => { rise.disabled = quit.disabled = false; }, 800);
  }
}
