import { PoolSource } from './client/poolsource';
import { Session } from './client/session';
import { strSeed } from './core/noise';
import { installDevTools } from './dev';
import { validateData } from './dev/validate';
import { Game } from './game';
import { SimHost } from './net/host';
import { loopback } from './net/loopback';
import { VIEW_MAX, VIEW_MIN } from './net/protocol';
import type { HostEnv } from './net/transport';
import { MemStorage, type Storage } from './sim/storage';
import { IdbStorage, deleteWorld, storageReady } from './storage/idb';
import './style.css';
import { TitleMenu, type WorldChoice, applyUiScale, loadSettings } from './ui/menus';
import { el } from './ui/hud';
import { WorkerPool } from './world/pool';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const BUILD = '0.1.0';

const env: HostEnv = {
  now: () => performance.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as number),
  log: (level, msg) => console[level](msg),
};

async function boot(): Promise<void> {
  if (import.meta.env.DEV) { const bad = validateData(); if (bad.length) console.error('DATA PROBLEMS\n' + bad.join('\n')); (window as any).dataProblems = bad; }
  const q = new URLSearchParams(location.search);
  if (q.has('gallery')) { (await import('./gallery')).showGallery(); return; }
  const wait: HTMLElement[] = [];
  const noSave = await storageReady((msg) => {
    const box = wait[0] ?? (wait[0] = el('div', '#loading', ui));
    box.innerHTML = '<h1>PEOPLS CRAFT</h1><div class="msg"></div>';
    (box.querySelector('.msg') as HTMLElement).textContent = msg;
  });
  wait[0]?.remove();
  if (noSave) console.warn('saving is unavailable', noSave);
  const canSave = !noSave;
  const settings = loadSettings();
  applyUiScale(settings.uiScale);

  // The simulation runs in this page: a host of its own on the in-thread transport, stepped by the game's frames.
  const play = async (w: WorldChoice, quick: boolean): Promise<void> => {
    const pool = new WorkerPool(Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2)));
    const storage: Storage = canSave ? new IdbStorage(w.id) : new MemStorage();
    const source = new PoolSource(pool, w.seed);
    const host = new SimHost(env, storage, source, { id: w.id, name: w.name, seed: w.seed, seedText: w.seedText, cheats: true, password: null, maxPlayers: 1,
      viewMax: VIEW_MAX, clock: 'manual', saveEvery: 30, solo: true });
    try { await host.start(); } catch (e) {
      console.warn('the world could not be opened', e);
      pool.dispose();
      const box = el('div', '#loading', ui);
      box.innerHTML = '<h1>PEOPLS CRAFT</h1><div class="msg"></div>';
      (box.querySelector('.msg') as HTMLElement).textContent = 'This world could not be opened: ' + (e instanceof Error ? e.message : String(e));
      return;
    }
    source.seed = host.sim.seed;
    // ?clone: every message crosses as it would cross a socket, so a value that would not survive one shows up here
    const { transport, conn } = loopback({ clone: q.has('clone') });
    host.connect(conn);
    const session = new Session(transport), det = q.has('det');
    // &det: a step waits for every storage read issued so far, so that two scripted runs load the same things in the same steps
    const game = new Game(canvas, ui, { session, settings, pool, canSave, quick, det, step: det ? () => host.stepManual(1) : () => { host.step(); return null; } });
    session.hello({ name: 'Player', token: '', view: Math.max(VIEW_MIN, Math.min(VIEW_MAX, Math.round(settings.gfx.renderDist))), build: BUILD });
    installDevTools(game, host.sim);
    game.start();
  };
  // ?quick=<seed> skips the menu with a throwaway world (used by automated checks)
  if (q.has('quick')) {
    const seedText = q.get('quick') || 'cairn', id = 'quick-' + seedText;
    if (q.has('fresh') && canSave) await deleteWorld(id);
    await play({ id, name: 'Quick world', seed: /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText), seedText }, true);
    return;
  }
  new TitleMenu(ui, settings, (w) => void play(w, false), canSave, noSave?.code === 'version' ? 'These worlds were saved by a newer version of the game. Nothing will be saved here.' : undefined);
}
void boot();
