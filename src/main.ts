import { strSeed } from './core/noise';
import { installDevTools } from './dev';
import { Game } from './game';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const q = new URLSearchParams(location.search);
const seed = q.has('seed') ? strSeed(q.get('seed')!) : 20261109;
const game = new Game(canvas, ui, { seed });
installDevTools(game);
game.start();
