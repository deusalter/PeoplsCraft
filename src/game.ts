// Game: owns every system and runs the fixed-step simulation plus the render loop.
import * as THREE from 'three';
import { SEA } from './core/constants';
import { DAY_LENGTH } from './core/constants';
import { B, BLOCKS, T_REPLACE, T_SUPPORT, T_SOLID } from './data/blocks';
import { BIOME, BIOMES } from './data/biomes';
import { DIMS } from './data/dims';
import { Env, Gfx } from './render/gfx';
import { Input } from './player/input';
import { Interact, InteractHost } from './player/interact';
import { RayHit, boxFree } from './player/physics';
import { Player } from './player/player';
import { DebugOverlay } from './ui/debug';
import { Climate, newCol } from './world/gen/climate';
import { WorkerPool } from './world/pool';
import { World } from './world/world';

const STEP = 1 / 60;

export interface GameConfig { seed: number }

export class Game implements InteractHost {
  readonly gfx: Gfx; readonly pool: WorkerPool; readonly world: World; readonly input: Input;
  readonly player = new Player(); readonly interact: Interact; readonly debug: DebugOverlay;
  readonly climate: Climate;
  readonly ui: HTMLElement;
  time = 0;            // seconds since the session began
  clock = 0.08;        // world time in days (fraction = time of day, 0 = sunrise)
  dim = 0;
  ready = false;
  paused = false;
  sens = 0.0023;
  private last = performance.now(); private acc = 0; private raf = 0;
  private env: Env = { time: 0, dim: 0, fogTint: [1, 1, 1], haze: 0, cave: 0, underwater: false, moonTint: null, moonPhase: 0, darkness: 0 };
  private loadingEl: HTMLElement | null = null;
  /** Worst main-thread cost per phase since the overlay last refreshed (ms). */
  prof = { world: 0, tick: 0, render: 0 };
  private palette = ['stone', 'cobble', 'oak_planks', 'glass', 'torch', 'crystal_cyan', 'crystal_violet', 'lantern', 'oak_log'].map((k) => B[k]);
  private slot = 0;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement, readonly cfg: GameConfig) {
    this.ui = ui;
    this.gfx = new Gfx(canvas);
    this.pool = new WorkerPool(Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2)));
    this.world = new World(this.pool, this.gfx.materials, cfg.seed, 0);
    this.world.renderDist = this.gfx.settings.renderDist;
    this.gfx.scene.add(this.world.group);
    this.gfx.shadowCasters = this.world.group;
    this.climate = new Climate(cfg.seed);
    this.input = new Input(canvas);
    this.interact = new Interact(this.gfx.scene, this.world, this.player);
    this.debug = new DebugOverlay(ui);

    const cross = document.createElement('div'); cross.id = 'crosshair'; ui.appendChild(cross);
    this.loadingEl = document.createElement('div'); this.loadingEl.id = 'loading';
    this.loadingEl.innerHTML = '<h1>CAIRNLIGHT</h1><div class="bar"><i></i></div><div class="msg">Raising the land</div>';
    ui.appendChild(this.loadingEl);

    this.input.onKey = (code) => {
      if (code === 'F3') { this.debug.toggle(); return true; }
      return false;
    };
    this.world.onBlockChange = (x, y, z, _old, now) => {
      // things that need the block beneath them pop off when it goes
      if (!T_SOLID[now]) { const up = this.world.getBlock(x, y + 1, z); if (T_SUPPORT[up]) this.world.setBlock(x, y + 1, z, 0); }
    };
    window.addEventListener('resize', () => this.gfx.resize());

    const s = this.findSpawn();
    this.player.teleport(s[0] + 0.5, SEA + 40, s[1] + 0.5);
    this.player.frozen = true;
  }

  private findSpawn(): [number, number] {
    const c = newCol();
    for (let r = 0; r < 3000; r += 12) for (let a = 0; a < 8; a++) {
      const x = Math.round(Math.cos(a * 0.785 + r) * r), z = Math.round(Math.sin(a * 0.785 + r) * r);
      this.climate.sample(x, z, c);
      if (c.biome !== BIOME.ocean && c.biome !== BIOME.beach && c.h > SEA + 2 && c.h < SEA + 40 && c.mount < 0.25) return [x, z];
    }
    return [0, 0];
  }

  start(): void { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop(): void { cancelAnimationFrame(this.raf); this.pool.dispose(); }

  // ---- InteractHost ---------------------------------------------------------------
  reach(): number { return 5; }
  breakTime(id: number): number { const h = BLOCKS[id].hard; return h < 0 ? Infinity : h * 0.25; }
  onBroken(x: number, y: number, z: number, _id: number): void { this.world.setBlock(x, y, z, 0); }
  onDigTick(): void { /* particles + sound arrive with the survival systems */ }
  primary(): boolean { return false; }
  secondary(hit: RayHit | null, pressed: boolean): boolean {
    if (!hit) return false;
    void pressed;
    let x = hit.x, y = hit.y, z = hit.z;
    if (!T_REPLACE[hit.id]) { x += hit.nx; y += hit.ny; z += hit.nz; }
    if (!T_REPLACE[this.world.getBlock(x, y, z)]) return false;
    const id = this.palette[this.slot], p = this.player;
    if (T_SOLID[id] && x + 1 > p.x - p.hw && x < p.x + p.hw && y + 1 > p.y && y < p.y + p.h && z + 1 > p.z - p.hw && z < p.z + p.hw) return false;
    return this.world.setBlock(x, y, z, id);
  }

  // ---- loop ---------------------------------------------------------------------------
  private tick(dt: number): void {
    const p = this.player, inp = this.input;
    if (!this.ready) return;
    for (let i = 0; i < 9; i++) if (inp.hit('Digit' + (i + 1))) this.slot = i;
    if (inp.hit('KeyF')) { p.flying = !p.flying; }
    p.tick(dt, inp, this.world, this.time);
    this.interact.tick(dt, inp, this, inp.locked);
    this.clock += dt / DAY_LENGTH;
    if (p.y < -20) p.teleport(p.x, 200, p.z);
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.runFrame(dt);
  };

  /** Drive the game without requestAnimationFrame (automated tests, background tabs). */
  async pump(seconds: number): Promise<void> {
    const ch = new MessageChannel();
    const yieldNow = (): Promise<void> => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
    for (let t = 0; t < seconds; t += STEP) { this.runFrame(STEP); this.last = performance.now(); await yieldNow(); }
  }

  runFrame(dt: number): void {
    this.time += dt;
    const p = this.player, inp = this.input;
    if (inp.locked) p.look(inp.dx, inp.dy, this.sens);

    const t0 = performance.now();
    this.world.update(p.x, p.z, 3);
    if (!this.ready) this.checkReady();
    const t1 = performance.now();

    let ticked = false;
    if (!this.paused) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.tick(STEP); this.acc -= STEP; n++; ticked = true; if (n === 1) inp.endTick(); }
      if (n === 5) this.acc = 0;
    }
    void ticked;
    const t2 = performance.now();
    p.applyCamera(this.gfx.camera, this.paused ? 1 : this.acc / STEP, dt, this.gfx.settings.fov, this.time, true);
    this.updateEnv(dt);
    this.gfx.update(this.time, this.env, this.gfx.camera.position);
    this.gfx.render(false);
    const t3 = performance.now(), pr = this.prof;
    pr.world = Math.max(pr.world, t1 - t0); pr.tick = Math.max(pr.tick, t2 - t1); pr.render = Math.max(pr.render, t3 - t2);
    if (this.debug.frame(dt)) { this.debug.set(this.debugLines()); pr.world = pr.tick = pr.render = 0; }
    inp.endFrame();
  }

  private checkReady(): void {
    const p = this.player, done = this.world.areaMeshed(p.x, p.z, 3);
    const c = this.world.counts();
    const bar = this.loadingEl?.querySelector('i') as HTMLElement | null;
    if (bar) bar.style.width = Math.min(100, (c.meshed / 49) * 100) + '%';
    if (!done) return;
    const x = Math.floor(p.x), z = Math.floor(p.z);
    let y = this.world.topY(x, z);
    while (y > 1 && !T_SOLID[this.world.getBlock(x, y, z)]) y--;
    p.teleport(p.x, y + 1.01, p.z);
    p.frozen = false; this.ready = true;
    this.loadingEl?.remove(); this.loadingEl = null;
  }

  private updateEnv(dt: number): void {
    const p = this.player, e = this.env, w = this.world;
    const x = Math.floor(p.x), y = Math.floor(p.y + p.eye), z = Math.floor(p.z);
    const bio = BIOMES[w.biomeAt(x, z)] ?? BIOMES[0];
    const k = Math.min(1, dt * 0.8);
    for (let i = 0; i < 3; i++) e.fogTint[i] += (bio.fog[i] - e.fogTint[i]) * k;
    e.haze += (bio.haze - e.haze) * k;
    const sky = w.getLight(x, y, z) >> 4;
    const caveT = DIMS[this.dim].hasSky && sky < 5 && y < w.topY(x, z) - 4 ? 1 : 0;
    e.cave += (caveT - e.cave) * Math.min(1, dt * 1.2);
    e.underwater = p.headInWater;
    e.time = this.clock % 1; e.dim = this.dim;
    e.moonPhase = (Math.floor(this.clock) % 8) / 4 - 1;
  }

  private debugLines(): string[] {
    const p = this.player, w = this.world, c = w.counts(), info = this.gfx.renderer.info;
    const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z), l = w.getLight(x, y + 1, z);
    const facing = ['south (-z)', 'west (-x)', 'north (+z)', 'east (+x)'][((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4];
    const tod = ((this.clock % 1) * 24 + 6) % 24;
    return [
      `chunks  ${c.meshed} meshed / ${c.loaded} loaded / ${c.waiting} waiting   workers ${this.pool.busy}/${this.pool.size}   mesh ${w.meshMs.toFixed(1)} ms`,
      `draw    ${info.render.calls} calls   ${(info.render.triangles / 1000).toFixed(0)}k tris   ${info.memory.geometries} geometries`,
      `pos     ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}   chunk ${x >> 4} ${z >> 4}   facing ${facing}`,
      `world   ${DIMS[this.dim].name}   ${BIOMES[w.biomeAt(x, z)]?.name ?? '?'}   light sky ${l >> 4} block ${l & 15}   ${Math.floor(tod)}:${String(Math.floor((tod % 1) * 60)).padStart(2, '0')}`,
      `view    ${w.renderDist} chunks   seed ${this.cfg.seed}   ${p.onGround ? 'ground' : p.inWater ? 'water' : 'air'}${p.flying ? ' fly' : ''}`,
      `cpu     chunks ${this.prof.world.toFixed(1)} ms   sim ${this.prof.tick.toFixed(1)} ms   draw ${this.prof.render.toFixed(1)} ms (worst)`,
      this.debug.extra ? this.debug.extra() : '',
    ];
  }
}
void boxFree;
