// Title / world-select screen, pause menu, settings and the death screen.
import { GAME_TITLE } from '../core/constants';
import { strSeed } from '../core/noise';
import type { Game } from '../game';
import { NAME_RE, TOKEN_KEY } from '../net/protocol';
import { GfxSettings, PRESETS } from '../render/gfx';
import { type WorldSummary, deleteWorld, listWorlds } from '../storage/idb';
import { claimWorld } from '../storage/lock';
import { el } from './hud';

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
  uiChoice = v;
  uiNow = v > 0 ? Math.max(0.5, Math.min(2, v)) : autoUiScale();
  document.documentElement.style.setProperty('--ui', String(uiNow));
  if (!uiHooked) { uiHooked = true; window.addEventListener('resize', () => { if (uiChoice <= 0) applyUiScale(0); }); }
}

const KEYS: [string, string][] = [['W A S D', 'Move'], ['Space', 'Jump / swim up'], ['Shift', 'Sneak'], ['R, Ctrl or double-tap W', 'Sprint'], ['Left mouse', 'Mine / attack'], ['Right mouse', 'Use / place'], ['Middle mouse', 'Pick block'],
  ['E', 'Inventory and crafting'], ['G', 'Guide'], ['Q', 'Drop item'], ['Ctrl+Q', 'Drop stack'], ['H', 'Use best salve'], ['1-9, wheel', 'Hotbar'], ['Shift-click', 'Quick move'], ['Right-click', 'Split stack'],
  ['F1', 'Hide HUD'], ['F3', 'Debug overlay'], ['T', 'Command line'], ['Esc', 'Pause']];

function drawCairn(c: HTMLCanvasElement): void {
  c.width = 43; c.height = 48;
  const x = c.getContext('2d')!;
  const stone = (cx: number, y: number, w: number, h: number, col: string, hi: string): void => { x.fillStyle = '#0a0b10'; x.fillRect(cx - w / 2 - 1, y - 1, w + 2, h + 2); x.fillStyle = col; x.fillRect(cx - w / 2, y, w, h); x.fillStyle = hi; x.fillRect(cx - w / 2, y, w, 2); };
  stone(21, 38, 34, 9, '#5a6274', '#7a8294'); stone(22, 29, 26, 8, '#6a7284', '#8a92a4'); stone(20, 21, 18, 7, '#5a6274', '#7a8294'); stone(21, 14, 12, 6, '#7a8294', '#9aa2b4');
  x.fillStyle = '#ffe9a8'; x.fillRect(18, 5, 6, 6); x.fillStyle = '#fff'; x.fillRect(20, 7, 2, 2);
  x.fillStyle = 'rgba(242,193,78,0.35)'; x.fillRect(15, 2, 12, 12);
}

export function settingsPanel(parent: HTMLElement, s: Settings, apply: () => void): HTMLElement {
  const root = el('div', 'panel wrow settings', parent);
  const render = (): void => {
    // a toggle rebuilds the list: keep the place in the scrolling menu
    const sc = root.closest<HTMLElement>('#menu'), top = sc ? sc.scrollTop : 0;
    root.innerHTML = '';
    // two columns: rows are appended to whichever column `box` currently points at
    let box = el('div', 'wcol', root);
    el('div', 'ttl', box, 'Graphics preset');
    const seg = el('div', 'opt', box), sg = el('div', 'seg', seg);
    for (const p of ['low', 'medium', 'high']) { const b = el('button', 'btn sm' + (s.preset === p ? ' gold' : ''), sg, p); b.onclick = () => { s.preset = p; s.gfx = { ...PRESETS[p] }; apply(); render(); }; }
    const toggle = (label: string, k: keyof GfxSettings): void => {
      const o = el('div', 'opt', box); el('span', '', o, label);
      const b = el('button', 'btn sm' + (s.gfx[k] ? ' gold' : ''), o, s.gfx[k] ? 'On' : 'Off');
      b.onclick = () => { (s.gfx as any)[k] = !s.gfx[k]; s.preset = 'custom'; apply(); render(); };
    };
    const slider = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void, fmt: (v: number) => string, live = false): HTMLInputElement => {
      const o = el('div', 'opt', box), lab = el('span', '', o, `${label}: ${fmt(get())}`), r = el('input', '', o);
      r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(get());
      r.oninput = () => { set(+r.value); lab.textContent = `${label}: ${fmt(get())}`; if (live) apply(); };
      r.onchange = () => apply();
      return r;
    };
    slider('Render distance', 4, 16, 1, () => s.gfx.renderDist, (v) => { s.gfx.renderDist = v; s.preset = 'custom'; }, (v) => v + ' chunks');
    slider('Field of view', 60, 100, 1, () => s.gfx.fov, (v) => (s.gfx.fov = v), (v) => v + '°');
    slider('Resolution scale', 0.5, 1, 0.05, () => s.gfx.scale, (v) => { s.gfx.scale = v; s.preset = 'custom'; }, (v) => Math.round(v * 100) + '%');
    slider('Texture filtering', 0, 4, 1, () => Math.round(Math.log2(s.gfx.aniso || 1)), (v) => { s.gfx.aniso = 2 ** v; s.preset = 'custom'; }, (v) => (v ? 2 ** v + 'x' : 'Off'));
    toggle('Adaptive resolution', 'autoScale');
    toggle('Bloom', 'bloom'); toggle('Sun shadows', 'shadows'); toggle('Tone mapping', 'tonemap'); toggle('Vignette', 'vignette');
    toggle('Anti-aliasing (MSAA)', 'msaa'); toggle('Edge smoothing (FXAA)', 'fxaa');
    box = el('div', 'wcol', root);
    el('div', 'ttl', box, 'Effects');
    toggle('Clouds', 'clouds'); toggle('Swaying foliage and waves', 'sway');
    toggle('Eye adaptation', 'adapt');
    el('div', 'ttl', box, 'Controls and sound');
    // the leftmost stop (below 75%) means Auto; applied on release so the slider does not jump under the mouse while dragging
    const ui = slider('UI scale', 0.625, 2, 0.125, () => s.uiScale || 0.625, (v) => (s.uiScale = v < 0.7 ? 0 : v), (v) => (v < 0.7 ? `Auto (${Math.round(autoUiScale() * 100)}%)` : Math.round(v * 100) + '%'));
    ui.onchange = () => { applyUiScale(s.uiScale); apply(); };
    slider('Mouse sensitivity', 0.3, 2.5, 0.05, () => s.sens, (v) => (s.sens = v), (v) => v.toFixed(2));
    slider('Effects volume', 0, 1, 0.05, () => s.sfx, (v) => (s.sfx = v), (v) => Math.round(v * 100) + '%', true);
    slider('Music volume', 0, 1, 0.05, () => s.music, (v) => (s.music = v), (v) => Math.round(v * 100) + '%', true);
    const o = el('div', 'opt', box); el('span', '', o, 'View bobbing');
    const b = el('button', 'btn sm' + (s.bob ? ' gold' : ''), o, s.bob ? 'On' : 'Off'); b.onclick = () => { s.bob = !s.bob; apply(); render(); };
    slider('Screen shake', 0, 1, 0.05, () => s.shake, (v) => (s.shake = v), (v) => Math.round(v * 100) + '%');
    const flag = (label: string, k: 'autoJump' | 'autoTool' | 'flyToggle' | 'rawMouse'): void => {
      const row = el('div', 'opt', box); el('span', '', row, label);
      el('button', 'btn sm' + (s[k] ? ' gold' : ''), row, s[k] ? 'On' : 'Off').onclick = () => { s[k] = !s[k]; apply(); render(); };
    };
    flag('Auto-jump up single blocks', 'autoJump'); flag('Switch tools automatically', 'autoTool');
    flag('Double-tap Space to fly (creative)', 'flyToggle'); flag('Raw mouse input (no acceleration)', 'rawMouse');
    if (sc) sc.scrollTop = top;
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

const line = (parent: HTMLElement, text: string): void => { el('div', '', parent, text).style.cssText = 'text-align:center;color:var(--dim);font-size:12px'; };

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
  constructor(ui: HTMLElement, private settings: Settings, private onPlay: (w: WorldChoice) => void, private canSave = true,
    private noSaveWhy = noSaveText(undefined).menu, private net: JoinMenu | null = null) {
    this.root = el('div', '#menu', ui); this.root.classList.add('solid');
    window.addEventListener('keydown', this.onEsc);
    if (net?.open) this.join(); else void this.home();
  }
  private head(sub: string): void {
    this.root.innerHTML = '';
    drawCairn(el('canvas', '#cairn', this.root));
    el('h1', '', this.root, GAME_TITLE.toUpperCase()); el('div', 'sub', this.root, sub);
    if (!this.canSave) el('div', 'warn', this.root, this.noSaveWhy);
  }
  private async home(): Promise<void> {
    this.head('a voxel sandbox of lost lights'); this.back = null;
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
    el('button', 'btn', col, 'Controls').onclick = () => { this.head('controls'); keysPanel(this.root); this.back = () => void this.home(); el('button', 'btn', this.root, 'Back').onclick = this.back; };
  }
  private create(): void {
    this.head('new world');
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
    this.head('settings');
    settingsPanel(this.root, this.settings, () => saveSettings(this.settings));
    this.back = () => void this.home();
    el('button', 'btn', this.root, 'Back').onclick = this.back;
  }
  private play(w: WorldChoice): void { this.close(); this.onPlay(w); }
  /** Take the menu down for good. */
  close(): void { window.removeEventListener('keydown', this.onEsc); this.root.remove(); }

  /** The join screen. `why`: what went wrong with the last attempt. */
  join(why = ''): void {
    const net = this.net;
    if (!net) return;
    const here = net.here;
    this.head('join a world');
    const col = el('div', 'col', this.root);
    let addr: HTMLInputElement | null = null;
    if (here) line(col, `${here.name} · ${here.players} of ${here.max} playing`);
    else { addr = el('input', '', col); addr.type = 'text'; addr.placeholder = 'Address (host:port)'; addr.maxLength = 200; addr.value = net.address || remembered(SERVER_KEY); }
    const name = el('input', '', col); name.type = 'text'; name.placeholder = 'Your name'; name.maxLength = 16; name.value = savedName();
    let pw: HTMLInputElement | null = null;
    if (!here || here.password) {
      pw = el('input', '', col); pw.type = 'password'; pw.placeholder = here ? 'Password' : 'Password (if the server has one)'; pw.maxLength = 128;
      pw.style.cssText = 'background:#0c0e13;border:1px solid #000;box-shadow:inset 0 0 0 1px #3b4254;color:var(--text);font:inherit;padding:8px 10px;outline:none';
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
    this.head('join a world');
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
    el('h2', '', this.root, 'PAUSED'); el('div', 'sub', this.root, g.worldName);
    const remote = !g.session.local;
    const saved = el('div', 'saved', this.root, remote ? 'The server keeps this world' : g.cfg.canSave === false ? noSaveText(g.cfg.noSave).pause : 'Saving...');
    if (g.cfg.canSave === false) saved.classList.add('warn');
    const col = el('div', 'col', this.root);
    el('button', 'btn gold', col, 'Resume').onclick = () => this.close();
    el('button', 'btn', col, 'Settings').onclick = () => this.options();
    el('button', 'btn', col, 'Controls').onclick = () => { this.sub = true; this.root.innerHTML = ''; el('h2', '', this.root, 'CONTROLS'); keysPanel(this.root); el('button', 'btn', this.root, 'Back').onclick = () => this.pause(); };
    el('button', 'btn', col, 'Save and quit to title').onclick = () => void g.quit();
    if (!remote) void g.save().then(() => { if (g.cfg.canSave !== false) saved.textContent = g.lastSave > Date.now() - 5000 ? 'Progress saved' : 'Could not save just now'; });
  }
  /** Escape: back out of a sub-screen, or resume from the pause screen. */
  escape(): void { if (this.sub) this.pause(); else this.close(); }
  private options(): void {
    const g = this.g;
    this.sub = true; this.root.innerHTML = '';
    el('h2', '', this.root, 'SETTINGS');
    settingsPanel(this.root, g.cfg.settings, () => { g.applySettings(); saveSettings(g.cfg.settings); });
    el('button', 'btn', this.root, 'Back').onclick = () => this.pause();
  }
  death(cause: string, lost: number): void {
    const g = this.g;
    this.dead = true; this.show();
    this.root.innerHTML = ''; this.root.classList.add('death');
    const h = el('h2', '', this.root, 'YOU FELL'); h.style.color = '#ff8a7a';
    el('div', 'sub', this.root, cause + (lost ? ` · ${lost} coins lost` : ''));
    const col = el('div', 'col', this.root);
    const rise = el('button', 'btn gold', col, 'Rise again'), quit = el('button', 'btn', col, 'Save and quit to title');
    rise.onclick = () => { this.dead = false; g.respawn(); this.close(); };
    quit.onclick = () => { g.respawn(); void g.quit(); };
    // held back while the screen fades in, so a still-attacking click cannot respawn unseen
    rise.disabled = quit.disabled = true; setTimeout(() => { rise.disabled = quit.disabled = false; }, 800);
  }
}
