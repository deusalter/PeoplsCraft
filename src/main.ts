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
import type { Sim } from './sim/sim';
import { WorkerTransport } from './net/worker-client';
import { InlineSource } from './sim/chunksource';
import { MemStorage, type Storage } from './sim/storage';
import { IdbStorage, deleteWorld, storageReady } from './storage/idb';
import './style.css';
import { TitleMenu, type WorldChoice, applyUiScale, loadSettings, noSaveText } from './ui/menus';
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

  const cores = navigator.hardwareConcurrency || 4;
  const failed = (pool: WorkerPool, e: unknown): void => {
    console.warn('the world could not be opened', e);
    pool.dispose();
    const box = el('div', '#loading', ui);
    box.innerHTML = '<h1>PEOPLS CRAFT</h1><div class="msg"></div>';
    (box.querySelector('.msg') as HTMLElement).textContent = 'This world could not be opened: ' + (e instanceof Error ? e.message : String(e));
  };
  // A world from the title menu runs in the simulation's worker on its own clock. `?quick` runs it in this page, stepped by
  // the game's frames, and `?quick&worker` in the worker, stepped by the game's frames over messages.
  const play = async (w: WorldChoice, quick: boolean): Promise<void> => {
    const inWorker = !quick || q.has('worker'), det = q.has('det');
    // one core is the simulation's when it has a thread of its own
    const pool = new WorkerPool(Math.max(2, Math.min(6, cores - (inWorker ? 3 : 2))));
    let session: Session, step: (() => Promise<void> | null) | undefined, sim: Sim | undefined, ask: (src: string, arg: unknown) => Promise<unknown>;
    if (inWorker) {
      const t = new WorkerTransport(new Worker(new URL('./sim-worker.ts', import.meta.url), { type: 'module' }));
      try { await t.start({ id: w.id, name: w.name, seed: w.seed, seedText: w.seedText, clock: quick ? 'manual' : 'real', viewMax: VIEW_MAX, save: canSave, dev: import.meta.env.DEV }); }
      catch (e) { t.close(); failed(pool, e); return; }
      session = new Session(t);
      if (quick) step = () => t.step(1);
      ask = (src, arg) => t.ask(src, arg);
    } else {
      const storage: Storage = canSave ? new IdbStorage(w.id) : new MemStorage();
      // &det generates in this thread, two chunks a step, so that which step a chunk arrives in does not depend on the workers
      const pooled = det ? null : new PoolSource(pool, w.seed), source = pooled ?? new InlineSource(w.seed, () => performance.now());
      const host = new SimHost(env, storage, source, { id: w.id, name: w.name, seed: w.seed, seedText: w.seedText, cheats: true, password: null, maxPlayers: 1,
        viewMax: VIEW_MAX, clock: 'manual', saveEvery: 30, solo: true });
      try { await host.start(); } catch (e) { failed(pool, e); return; }
      if (pooled) pooled.seed = host.sim.seed;
      // ?clone: every message crosses as it would cross a socket, so a value that would not survive one shows up here
      const { transport, conn } = loopback({ clone: q.has('clone') });
      host.connect(conn);
      session = new Session(transport);
      // &det: a step waits for every storage read issued so far, so that two scripted runs load the same things in the same steps
      step = det ? () => host.stepManual(1) : () => { host.step(); return null; };
      sim = host.sim;
      ask = async (src, arg) => (new Function('return (' + src + ')')() as (s: Sim, a: unknown, h: SimHost) => unknown)(host.sim, arg, host);
    }
    const game = new Game(canvas, ui, { session, settings, pool, canSave, noSave: noSave?.code, quick, det, step });
    session.hello({ name: 'Player', token: '', view: Math.max(VIEW_MIN, Math.min(VIEW_MAX, Math.round(settings.gfx.renderDist))), build: BUILD });
    installDevTools(game, { sim, ask });
    game.start();
  };
  // ?quick=<seed> skips the menu with a throwaway world (used by automated checks)
  if (q.has('quick')) {
    const seedText = q.get('quick') || 'cairn', id = 'quick-' + seedText;
    if (q.has('fresh') && canSave) await deleteWorld(id);
    await play({ id, name: 'Quick world', seed: /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText), seedText }, true);
    return;
  }
  new TitleMenu(ui, settings, (w) => void play(w, false), canSave, noSaveText(noSave?.code).menu);
}
void boot();
