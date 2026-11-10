import { strSeed } from './core/noise';
import { validateData } from './data/validate';
import { installDevTools } from './dev';
import { Game } from './game';
import { SaveDB, WorldMeta } from './systems/save';
import './style.css';
import { TitleMenu, applyUiScale, loadSettings } from './ui/menus';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;

async function boot(): Promise<void> {
  if (import.meta.env.DEV) { const bad = validateData(); if (bad.length) console.error('DATA PROBLEMS\n' + bad.join('\n')); (window as any).dataProblems = bad; }
  if (new URLSearchParams(location.search).has('gallery')) { (await import('./gallery')).showGallery(); return; }
  const db = new SaveDB();
  const canSave = await db.open();
  const settings = loadSettings();
  applyUiScale(settings.uiScale);
  const play = (meta: WorldMeta): void => {
    const game = new Game(canvas, ui, { meta, db, settings, canSave });
    installDevTools(game);
    game.start();
  };
  // ?quick=<seed> skips the menu with a throwaway world (used by automated checks)
  const q = new URLSearchParams(location.search);
  if (q.has('quick')) {
    const seedText = q.get('quick') || 'cairn';
    const id = 'quick-' + seedText, saved = q.has('fresh') ? undefined : (await db.listWorlds()).find((w) => w.id === id);
    if (q.has('fresh')) await db.deleteWorld(id);
    play(saved ?? { id, name: 'Quick world', seed: /^-?\d+$/.test(seedText) ? Number(seedText) | 0 : strSeed(seedText), seedText, created: Date.now(), played: Date.now(), data: null });
    return;
  }
  new TitleMenu(ui, db, settings, play, canSave);
}
void boot();
