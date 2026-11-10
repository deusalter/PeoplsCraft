// Title / world-select screen, pause menu, settings and the death screen.
import { GAME_TITLE } from '../core/constants';
import { strSeed } from '../core/noise';
import type { Game } from '../game';
import { GfxSettings, PRESETS } from '../render/gfx';
import type { SaveDB, WorldMeta } from '../systems/save';
import { el } from './hud';

export interface Settings { preset: string; gfx: GfxSettings; sens: number; sfx: number; music: number; bob: boolean;
  shake: number; autoJump: boolean; autoTool: boolean; flyToggle: boolean; rawMouse: boolean }
const KEY = 'cairnlight.settings';
export function loadSettings(): Settings {
  const def: Settings = { preset: 'medium', gfx: { ...PRESETS.medium }, sens: 1, sfx: 0.8, music: 0.45, bob: true,
    shake: 1, autoJump: false, autoTool: true, flyToggle: true, rawMouse: false };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...def, ...s, gfx: { ...def.gfx, ...(s.gfx || {}) } }; } catch { /* first run */ }
  return def;
}
export const saveSettings = (s: Settings): void => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };

const KEYS: [string, string][] = [['W A S D', 'Move'], ['Space', 'Jump / swim up'], ['Shift', 'Sneak'], ['R, Ctrl or double-tap W', 'Sprint'], ['Left mouse', 'Mine / attack'], ['Right mouse', 'Use / place'], ['Middle mouse', 'Pick block'],
  ['E', 'Inventory and crafting'], ['G', 'Guide'], ['Q', 'Drop item'], ['1-9, wheel', 'Hotbar'], ['F3', 'Debug overlay'], ['T', 'Command line'], ['Esc', 'Pause']];

function drawCairn(c: HTMLCanvasElement): void {
  c.width = 43; c.height = 48;
  const x = c.getContext('2d')!;
  const stone = (cx: number, y: number, w: number, h: number, col: string, hi: string): void => { x.fillStyle = '#0a0b10'; x.fillRect(cx - w / 2 - 1, y - 1, w + 2, h + 2); x.fillStyle = col; x.fillRect(cx - w / 2, y, w, h); x.fillStyle = hi; x.fillRect(cx - w / 2, y, w, 2); };
  stone(21, 38, 34, 9, '#5a6274', '#7a8294'); stone(22, 29, 26, 8, '#6a7284', '#8a92a4'); stone(20, 21, 18, 7, '#5a6274', '#7a8294'); stone(21, 14, 12, 6, '#7a8294', '#9aa2b4');
  x.fillStyle = '#ffe9a8'; x.fillRect(18, 5, 6, 6); x.fillStyle = '#fff'; x.fillRect(20, 7, 2, 2);
  x.fillStyle = 'rgba(242,193,78,0.35)'; x.fillRect(15, 2, 12, 12);
}

export function settingsPanel(parent: HTMLElement, s: Settings, apply: () => void): HTMLElement {
  const box = el('div', 'panel wcol', parent); box.style.minWidth = '380px';
  box.style.maxHeight = 'calc(100vh - 240px)'; box.style.overflowY = 'auto';   // the list is taller than a laptop screen
  const render = (): void => {
    const top = box.scrollTop;   // a toggle rebuilds the list: keep the place
    box.innerHTML = '';
    el('div', 'ttl', box, 'Graphics preset');
    const seg = el('div', 'opt', box), sg = el('div', 'seg', seg);
    for (const p of ['low', 'medium', 'high']) { const b = el('button', 'btn sm' + (s.preset === p ? ' gold' : ''), sg, p); b.onclick = () => { s.preset = p; s.gfx = { ...PRESETS[p] }; apply(); render(); }; }
    const toggle = (label: string, k: keyof GfxSettings): void => {
      const o = el('div', 'opt', box); el('span', '', o, label);
      const b = el('button', 'btn sm' + (s.gfx[k] ? ' gold' : ''), o, s.gfx[k] ? 'On' : 'Off');
      b.onclick = () => { (s.gfx as any)[k] = !s.gfx[k]; s.preset = 'custom'; apply(); render(); };
    };
    const slider = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void, fmt: (v: number) => string): void => {
      const o = el('div', 'opt', box), lab = el('span', '', o, `${label}: ${fmt(get())}`), r = el('input', '', o);
      r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(get());
      r.oninput = () => { set(+r.value); lab.textContent = `${label}: ${fmt(get())}`; };
      r.onchange = () => apply();
    };
    slider('Render distance', 4, 16, 1, () => s.gfx.renderDist, (v) => { s.gfx.renderDist = v; s.preset = 'custom'; }, (v) => v + ' chunks');
    slider('Field of view', 60, 100, 1, () => s.gfx.fov, (v) => (s.gfx.fov = v), (v) => v + '°');
    slider('Resolution scale', 0.5, 1, 0.05, () => s.gfx.scale, (v) => { s.gfx.scale = v; s.preset = 'custom'; }, (v) => Math.round(v * 100) + '%');
    toggle('Bloom', 'bloom'); toggle('Sun shadows', 'shadows'); toggle('Tone mapping', 'tonemap'); toggle('Vignette', 'vignette');
    toggle('Clouds', 'clouds'); toggle('Swaying foliage and waves', 'sway'); toggle('Anti-aliasing (MSAA)', 'msaa');
    toggle('Edge smoothing (FXAA)', 'fxaa'); toggle('Eye adaptation', 'adapt'); toggle('Adaptive resolution', 'autoScale');
    slider('Texture filtering', 0, 4, 1, () => Math.round(Math.log2(s.gfx.aniso || 1)), (v) => { s.gfx.aniso = 2 ** v; s.preset = 'custom'; }, (v) => (v ? 2 ** v + 'x' : 'Off'));
    el('div', 'ttl', box, 'Controls and sound').style.marginTop = '6px';
    slider('Mouse sensitivity', 0.3, 2.5, 0.05, () => s.sens, (v) => (s.sens = v), (v) => v.toFixed(2));
    slider('Effects volume', 0, 1, 0.05, () => s.sfx, (v) => (s.sfx = v), (v) => Math.round(v * 100) + '%');
    slider('Music volume', 0, 1, 0.05, () => s.music, (v) => (s.music = v), (v) => Math.round(v * 100) + '%');
    const o = el('div', 'opt', box); el('span', '', o, 'View bobbing');
    const b = el('button', 'btn sm' + (s.bob ? ' gold' : ''), o, s.bob ? 'On' : 'Off'); b.onclick = () => { s.bob = !s.bob; apply(); render(); };
    slider('Screen shake', 0, 1, 0.05, () => s.shake, (v) => (s.shake = v), (v) => Math.round(v * 100) + '%');
    const flag = (label: string, k: 'autoJump' | 'autoTool' | 'flyToggle' | 'rawMouse'): void => {
      const row = el('div', 'opt', box); el('span', '', row, label);
      el('button', 'btn sm' + (s[k] ? ' gold' : ''), row, s[k] ? 'On' : 'Off').onclick = () => { s[k] = !s[k]; apply(); render(); };
    };
    flag('Auto-jump up single blocks', 'autoJump'); flag('Switch tools automatically', 'autoTool');
    flag('Double-tap Space to fly (creative)', 'flyToggle'); flag('Raw mouse input (no acceleration)', 'rawMouse');
    box.scrollTop = top;
  };
  render();
  return box;
}
function keysPanel(parent: HTMLElement): void {
  const k = el('div', 'keys', parent);
  for (const [a, b] of KEYS) { el('b', '', k, a); el('span', '', k, b); }
}

export class TitleMenu {
  private root: HTMLElement;
  constructor(ui: HTMLElement, private db: SaveDB, private settings: Settings, private onPlay: (m: WorldMeta) => void) {
    this.root = el('div', '#menu', ui); this.root.classList.add('solid');
    void this.home();
  }
  private head(sub: string): void {
    this.root.innerHTML = '';
    drawCairn(el('canvas', '#cairn', this.root));
    el('h1', '', this.root, GAME_TITLE.toUpperCase()); el('div', 'sub', this.root, sub);
  }
  private async home(): Promise<void> {
    this.head('a voxel sandbox of lost lights');
    const col = el('div', 'col', this.root), worlds = await this.db.listWorlds();
    for (const w of worlds.slice(0, 6)) {
      const row = el('div', 'world', col), info = el('div', '', row);
      el('div', 'nm', info, w.name); el('div', 'mt', info, `seed ${w.seedText} · ${new Date(w.played).toLocaleDateString()} · level ${w.data?.stats?.level ?? 1}`);
      el('div', 'sp', row);
      const del = el('button', 'btn sm bad', row, 'Delete');
      del.onclick = async (e) => { e.stopPropagation(); if (del.textContent === 'Sure?') { await this.db.deleteWorld(w.id); void this.home(); } else del.textContent = 'Sure?'; };
      row.onclick = () => this.play(w);
    }
    el('button', 'btn gold', col, worlds.length ? 'New world' : 'Begin').onclick = () => this.create();
    el('button', 'btn', col, 'Settings').onclick = () => this.options();
    el('button', 'btn', col, 'Controls').onclick = () => { this.head('controls'); keysPanel(this.root); el('button', 'btn', this.root, 'Back').onclick = () => void this.home(); };
  }
  private create(): void {
    this.head('new world');
    const col = el('div', 'col', this.root);
    const name = el('input', '', col); name.type = 'text'; name.placeholder = 'World name'; name.maxLength = 28; name.value = 'New Cairn';
    const seed = el('input', '', col); seed.type = 'text'; seed.placeholder = 'Seed (leave blank for a random one)'; seed.maxLength = 32;
    el('button', 'btn gold', col, 'Create world').onclick = () => {
      const seedText = seed.value.trim() || String(Math.floor(Math.random() * 1e9));
      const n = /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText);
      this.play({ id: 'w' + Date.now().toString(36), name: name.value.trim() || 'New Cairn', seed: n, seedText, created: Date.now(), played: Date.now(), data: null });
    };
    el('button', 'btn', col, 'Back').onclick = () => void this.home();
    name.focus(); name.select();
  }
  private options(): void {
    this.head('settings');
    settingsPanel(this.root, this.settings, () => saveSettings(this.settings));
    el('button', 'btn', this.root, 'Back').onclick = () => void this.home();
  }
  private play(m: WorldMeta): void { this.root.remove(); this.onPlay(m); }
}

export class GameMenu {
  private root: HTMLElement;
  open = false; dead = false;
  constructor(ui: HTMLElement, private g: Game) { this.root = el('div', '#menu', ui); this.root.classList.add('hidden'); }
  private show(): void { this.open = true; this.root.classList.remove('hidden'); this.g.input.uiMode = true; this.g.input.unlock(); }
  close(): void {
    if (!this.open || this.dead) return;
    this.open = false; this.root.classList.add('hidden'); this.g.input.uiMode = false; this.g.input.lock(); this.g.paused = false;
  }
  pause(): void {
    const g = this.g;
    if (this.dead) return;
    g.paused = true; this.show();
    this.root.innerHTML = '';
    el('h2', '', this.root, 'PAUSED'); el('div', 'sub', this.root, g.cfg.meta.name);
    const col = el('div', 'col', this.root);
    el('button', 'btn gold', col, 'Resume').onclick = () => this.close();
    el('button', 'btn', col, 'Settings').onclick = () => this.options();
    el('button', 'btn', col, 'Controls').onclick = () => { this.root.innerHTML = ''; el('h2', '', this.root, 'CONTROLS'); keysPanel(this.root); el('button', 'btn', this.root, 'Back').onclick = () => this.pause(); };
    el('button', 'btn', col, 'Save and quit to title').onclick = async () => { await g.save(); location.reload(); };
    void g.save();
  }
  private options(): void {
    const g = this.g;
    this.root.innerHTML = '';
    el('h2', '', this.root, 'SETTINGS');
    settingsPanel(this.root, g.cfg.settings, () => { g.applySettings(); saveSettings(g.cfg.settings); });
    el('button', 'btn', this.root, 'Back').onclick = () => this.pause();
  }
  death(cause: string, lost: number): void {
    const g = this.g;
    this.dead = true; this.show();
    this.root.innerHTML = '';
    const h = el('h2', '', this.root, 'YOU FELL'); h.style.color = '#ff8a7a';
    el('div', 'sub', this.root, cause + (lost ? ` · ${lost} coins lost` : ''));
    const col = el('div', 'col', this.root);
    el('button', 'btn gold', col, 'Rise again').onclick = () => { this.dead = false; g.respawn(); this.close(); };
    el('button', 'btn', col, 'Save and quit to title').onclick = async () => { g.respawn(); await g.save(); location.reload(); };
  }
}
