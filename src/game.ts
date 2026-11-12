// Game: the client. Owns the view, the input, the HUD and the audio, runs the local player's body,
// and drives the simulation one fixed step at a time.
import * as THREE from 'three';
import { GameAudio } from './audio/audio';
import { CVOL, chunkKey } from './core/constants';
import { clamp } from './core/noise';
import { B, BLOCKS, T_LAYER } from './data/blocks';
import { BIOMES } from './data/biomes';
import { DIMS } from './data/dims';
import { type Item, ITEMS, TIERS, article, item } from './data/items';
import { NPCS } from './data/npcs';
import type { ActHost, DigHost } from './client/api';
import { EntityStore } from './client/entities';
import { FxPlay, tintOf } from './client/fxplay';
import { LOCAL_ID, fromLegacy, toLegacy } from './client/legacy';
import { WorldStore } from './client/worldstore';
import type { EventWire, S2C } from './net/protocol';
import { Input } from './player/input';
import { Interact } from './player/interact';
import { Player, STRIDE } from './player/player';
import { buildArm } from './player/viewmodel';
import { BoxBatch, Particles, makeItemMaterial } from './render/batches';
import { Env, Gfx } from './render/gfx';
import { Icons } from './render/icons';
import { ItemModels } from './render/itemModel';
import type { MobView } from './render/mobView';
import * as act from './sim/actions';
import { cheat } from './sim/cheats';
import { STEP, isNight } from './sim/clock';
import { BURST, type Fx, type Scope, type Sink } from './sim/fx';
import { placeGate } from './sim/gates';
import type { Inventory } from './sim/inventory';
import type { InvOp, OpResult } from './sim/invops';
import { rayHitMobs } from './sim/mobhit';
import { npcOf } from './sim/npcs';
import type { RayHit } from './sim/physics';
import { type SimPlayer, recall, respawn } from './sim/player';
import * as rules from './sim/rules';
import { Sim } from './sim/sim';
import type { PlayerStats } from './sim/stats';
import type { SaveDB, WorldMeta } from './systems/save';
import { DebugOverlay } from './ui/debug';
import { Hud, el, moonTint } from './ui/hud';
import { GameMenu, Settings } from './ui/menus';
import { QuestView } from './ui/questView';
import { Windows } from './ui/windows';
import { Climate } from './world/gen/climate';
import { WorkerPool } from './world/pool';
import { Chunk, World } from './world/world';

export interface GameConfig { meta: WorldMeta; db: SaveDB; settings: Settings; /** false when the browser blocks IndexedDB */ canSave?: boolean }
const NOTHING_SOLD: { id: number; it: Item; price: number }[] = [];
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
// Interaction prompts, built once so the per-tick prompt check allocates nothing.
const IS_NPC = (m: MobView): boolean => m.def.ai === 'npc';
const NOT_FRIEND = (m: MobView): boolean => m.def.ai !== 'minion' && m.def.ai !== 'npc';
const SUMMON_USE: string[] = [], ALTAR_OFFER: string[] = [], ALTAR_NEED: string[] = [], TRADE_PROMPT = new Map<string, string>();
for (const it of ITEMS.values()) if (it.use?.startsWith('summon')) {
  const n = +it.use.slice(6);
  SUMMON_USE[n] = it.use; ALTAR_OFFER[n] = `Right-click: offer the ${it.name}`; ALTAR_NEED[n] = `Needs ${article(it.name)} ${it.name}`;
}

export class Game implements DigHost, ActHost, Sink {
  readonly gfx: Gfx; readonly pool: WorkerPool; readonly world: World; readonly input: Input;
  readonly player = new Player(); readonly interact: Interact; readonly debug: DebugOverlay; readonly climate: Climate;
  readonly sim: Sim; readonly me: SimPlayer; readonly fx: FxPlay;
  readonly particles = new Particles(); readonly boxes = new BoxBatch(); readonly audio = new GameAudio();
  readonly ents: EntityStore;
  readonly icons: Icons; readonly models: ItemModels; readonly hud: Hud; readonly win: Windows; readonly menu: GameMenu;
  readonly quests: QuestView;
  time = 0; ready = false; paused = false;
  prof = { world: 0, tick: 0, render: 0 };
  private last = performance.now(); private acc = 0; private raf = 0; private keysReady = false;
  private env: Env = { time: 0, dim: 0, fogTint: [1, 1, 1], haze: 0, cave: 0, underwater: false, moonTint: null, moonPhase: 0, darkness: 0 };
  private loading: HTMLElement | null = null; private loadMsg = 'Raising the land';
  private atkCd = 0; private useCd = 0; private swing = 0; private equip = 0; private handKey = '?'; private hand: THREE.Mesh; private handLight = new THREE.Vector4(1, 0, 0, 0);
  private armGeo: THREE.BufferGeometry;
  private swayX = 0; private swayY = 0; private fallY = 0; private lastYaw = 0; private lastPitch = 0;   // held-item inertia
  private stepN = 0; private wasWet = false; private wasUnder = false; private splashCd = 0;
  private saveT = 0; private warnT = 0; private portalA = 0; private portalGold = false;
  private console: HTMLInputElement; private v = new THREE.Vector3();
  private hudOn = true; private palettes: string[][] = [];
  private npcPromptT = 0; private npcPrompt: string | null = null; private conClosed = 0;
  /** Date.now() of the last successful save (0 = not yet). */
  lastSave = 0; private saveFailT = -1e9; private noSaveWarned = false;
  /** Sequence number of the last inventory op this client sent. */
  private opSeq = 0;

  // ---- mirrors: the local player's state and the shared world state, as the simulation holds them ----
  get inv(): Inventory { return this.me.inv; }
  get stats(): PlayerStats { return this.me.stats; }
  get flags(): ReadonlySet<string> { return this.sim.flags; }
  get clock(): number { return this.sim.shared.clock; }
  /** Index of the guide step the world has reached. */
  get quest(): number { return this.sim.shared.quest; }
  /** The world event as the HUD shows it: which is running, kills, goal. */
  get event(): EventWire { return this.sim.shared.events; }
  get dim(): number { return this.me.dim; }
  get creative(): boolean { return this.me.modes.creative; }
  get spawn(): [number, number, number] | null { return this.me.bed; }
  /** Recall stone cooldown in seconds; the HUD shades the stone's slot with it. */
  get recallT(): number { return this.me.recallT; }
  /** Where the player starts without a bed, as x and z. */
  get worldSpawn(): [number, number] { return this.sim.shared.worldSpawn; }
  /** Last death as [dimension, x, y, z], shown on the compass until the player walks back to it. */
  get deathAt(): [number, number, number, number] | null { return this.me.deathAt; }
  /** What the open shop bought from the player and still offers back, oldest first. */
  get sold(): readonly { id: number; it: Item; price: number }[] { return this.me.window?.sold ?? NOTHING_SOLD; }

  constructor(canvas: HTMLCanvasElement, readonly ui: HTMLElement, readonly cfg: GameConfig) {
    const meta = cfg.meta, d = meta.data;
    this.gfx = new Gfx(canvas);
    this.icons = new Icons(this.gfx.atlas); this.models = new ItemModels(this.gfx.atlas, this.icons);
    this.pool = new WorkerPool(Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2)));
    const dim0: number = d?.dim ?? 0;
    this.world = new World(this.pool, this.gfx.materials, meta.seed, dim0);
    this.world.hasSky = DIMS[dim0].hasSky;
    this.climate = new Climate(meta.seed);
    const store = new WorldStore(this.world), rec = fromLegacy(meta, this.climate);
    this.sim = new Sim(rec.world, { cheats: true, maxPlayers: 1, solo: true, manual: false }, { sink: this, store: (q) => store.of(q), log: (level, msg) => console[level](msg), requestSave: () => { void this.save(); } });
    this.me = this.sim.join(LOCAL_ID, 'Player', rec.player, true, this.player);
    this.gfx.scene.add(this.world.group, this.boxes.mesh, this.particles.mesh);
    this.gfx.shadowCasters = this.world.group;
    this.gfx.boxCaster = this.boxes;
    this.input = new Input(canvas);
    this.interact = new Interact(this.gfx.scene, this.world, this.player);
    this.ents = new EntityStore(this, this.models);
    this.gfx.scene.add(this.ents.mobRender.shadows.mesh, this.ents.dropRender.group);
    this.hud = new Hud(ui, this); this.win = new Windows(ui, this); this.menu = new GameMenu(ui, this);
    this.debug = new DebugOverlay(ui);
    this.quests = new QuestView(this);
    this.fx = new FxPlay(this); this.fx.onEntity = (ev) => this.ents.onFx(ev);

    // held-item view model
    const mat = makeItemMaterial(true); mat.side = THREE.DoubleSide;
    mat.uniforms.uLightDir = { value: this.gfx.handLightDir };   // the hand is drawn in view space
    this.armGeo = buildArm();
    this.hand = new THREE.Mesh(this.armGeo, mat);
    this.hand.onBeforeRender = (_r, _s, _c, _g, m) => { (m as THREE.ShaderMaterial).uniforms.uObj.value.copy(this.handLight); (m as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
    this.gfx.handScene.add(this.hand);

    this.loading = el('div', '#loading', ui);
    this.loading.innerHTML = '<h1>PEOPLS CRAFT</h1><div class="bar"><i></i></div><div class="msg"></div>';
    this.console = el('input', '', ui); this.console.type = 'text';
    this.console.style.cssText = 'position:absolute;left:12px;bottom:150px;width:420px;display:none;pointer-events:auto;background:rgba(8,10,14,.85);color:#e9e4d6;border:1px solid #3b4254;padding:6px 8px;font:13px ui-monospace,monospace;outline:none;z-index:25';
    this.console.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const c = this.console.value.trim(); this.closeConsole(); if (c) this.toast(this.cheat(c.replace(/^\//, '')), '#8fd0ff'); }
      else if (e.key === 'Escape') this.closeConsole();
    };
    // clicking or tabbing away must not leave the console open with the game ignoring input
    this.console.onblur = () => { if (this.console.style.display !== 'none') { this.closeConsole(); this.conClosed = performance.now(); } };

    this.input.onKey = (code, e) => this.onKey(code, e);
    this.input.onLockChange = (locked) => {
      if (locked) { this.audio.unlock(); if (this.paused && !this.menu.open) { this.paused = false; this.hud.setPrompt(null); } }
      else if (!this.input.uiMode && this.ready && !this.stats.dead) this.menu.pause();
    };
    // alt-tabbing away with a window or the console open would otherwise leave the world running
    window.addEventListener('blur', () => {
      if (!this.ready || this.stats.dead || this.menu.open) return;
      const con = this.console.style.display !== 'none' || performance.now() - this.conClosed < 250;
      if (!this.win.open && !con) return;
      if (con) this.closeConsole();
      this.win.close(true); this.menu.pause();
    });
    // a click on the world resumes after a refused re-lock (Input requests the lock on the same click)
    canvas.addEventListener('mousedown', () => { this.audio.unlock(); if (this.paused && this.ready && !this.menu.open && !this.stats.dead) { this.paused = false; this.hud.setPrompt(null); } });
    window.addEventListener('resize', () => this.gfx.resize());
    window.addEventListener('beforeunload', (e) => {
      void this.save();
      // Ctrl is a sprint key and Ctrl+W closes the tab: ask before closing mid-play (not with a menu open, not in automated ?quick runs)
      if (this.ready && this.input.locked && !this.stats.dead && !location.search.includes('quick')) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) void this.save(); });

    this.world.onUnload = (c) => this.saveChunk(c);
    // Saved chunks hold raw block ids. Each save records the id->key table it was written with, so a
    // later build with a different block table can translate old chunks as they load.
    const keys = BLOCKS.map((q) => q.key);
    this.palettes = d?.palettes ?? [];
    if (!this.palettes.length || this.palettes[this.palettes.length - 1].join() !== keys.join()) this.palettes.push(keys);
    this.world.loader = async (cx, cz) => {
      const c = await cfg.db.getChunk(meta.id, this.world.dim, cx, cz, CVOL);
      const cur = this.palettes.length - 1;
      if (c && (c.pal ?? 0) !== cur) {
        const from = this.palettes[c.pal ?? 0] ?? keys, map = new Uint8Array(256);
        from.forEach((k, i) => { const id = keys.indexOf(k); map[i] = id < 0 ? 0 : id; });
        for (let i = 0; i < c.blocks.length; i++) c.blocks[i] = map[c.blocks[i]];
      }
      return c;
    };

    this.player.frozen = true;
    this.applySettings();
    void cfg.db.chunkList(meta.id, dim0).then((l) => { this.world.savedKeys = new Set(l.map((c) => chunkKey(c[0], c[1]))); this.keysReady = true; });
  }

  // ---- Sink: what the simulation sends out, played at once ----
  emit(to: Scope, ev: Fx): void {
    const p = this.me;
    if ('all' in to || ('p' in to ? to.p === p.slot : to.dim === p.dim && to.not !== p.slot)) this.fx.play(ev);
  }
  send(_slot: number, m: S2C): void {
    const p = this.player, st = this.stats;
    if (m.t === 'hurt') {
      if (m.cause === 'fall') { this.hud.flashHurt(); this.audio.play('hurt'); p.shake(0.4); return; }
      if (m.cause === 'lava') { this.hud.flashHurt(); this.audio.play('fizz'); return; }
      if (m.cause === 'void') { this.hud.flashHurt(); this.audio.play('teleport'); return; }
      // where the blow came from, in view space: forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw)
      const sx = m.fx - p.x, sz = m.fz - p.z, sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
      this.hud.flashHurt(Math.hypot(sx, sz) < 0.05 ? undefined : Math.atan2(cy * sx - sy * sz, -sy * sx - cy * sz));
      p.shake(Math.min(0.7, 0.25 + m.dmg / st.maxHp)); this.audio.play('hurt');
      const dx = p.x - m.fx, dz = p.z - m.fz, l = Math.hypot(dx, dz) || 1, kr = 1 - Math.min(0.9, st.d.knockRes);
      p.kbx += (dx / l) * m.knock * kr; p.kbz += (dz / l) * m.knock * kr;
      if (p.onGround && kr > 0.3) p.vy = 5;
    } else if (m.t === 'dead') {
      const c = m.cause;
      if (c === '') { this.menu.death('You did not get back up', 0); return; }
      this.audio.play('death'); this.win.close(true);
      this.menu.death((c === 'fall' ? 'The ground was farther than it looked' : c === 'lava' ? 'Lava does not negotiate' : c === 'void' ? 'There was nothing under you' : c === 'hunger' ? 'Starved' : `Slain by ${c}`) + `  ·  at ${m.at[1]}, ${m.at[2]}, ${m.at[3]}`, m.lost);
    } else if (m.t === 'tp') this.onTp(m);
    else if (m.t === 'open') {
      const e = m.x !== undefined ? this.world.getEnt(m.x, m.y!, m.z!) : null, n = m.mode === 'shop' ? NPCS.find((q) => q.key === m.npc) : undefined;
      if (m.mode === 'forge' && e) { this.audio.play('click'); this.win.show('forge', { forge: e }); }
      else if (m.mode === 'chest' && e) { this.audio.play('chest'); this.win.show('chest', { chest: e.data.s }); }
      else if (n) { this.audio.play('click'); this.win.show('shop', { shop: n }); }
      // nothing to show for it: the simulation must not go on holding a window this client never opened
      else this.op({ o: 'close' });
    }
  }
  /** The simulation moved the player. A crossing swaps the world; `load` puts up the loading screen until the place is meshed. */
  private onTp(m: Extract<S2C, { t: 'tp' }>): void {
    const p = this.player, cfg = this.cfg;
    if (m.dim !== this.world.dim) {
      this.win.close(); this.keysReady = false; p.frozen = true;
      this.world.setDim(m.dim, DIMS[m.dim].hasSky); this.world.setView(cfg.settings.gfx.renderDist, DIMS[m.dim].fogScale);
      this.portalA = 0; this.portalGold = false; this.hud.setPortal(0, false);
      void cfg.db.chunkList(cfg.meta.id, m.dim).then((l) => { this.world.savedKeys = new Set(l.map((c) => chunkKey(c[0], c[1]))); this.keysReady = true; });
    }
    if (m.load) { this.ready = false; this.showLoading(m.msg ?? this.loadMsg); return; }
    if (this.ready) return;
    p.frozen = false; this.ready = true;
    if (cfg.canSave === false && !this.noSaveWarned) { this.noSaveWarned = true; this.hud.showBanner('Saving is unavailable', 'This browser is blocking storage. Progress is lost when the tab closes.', '#ff9a8a'); }
    const l = this.loading; this.loading = null;
    if (l) { const rm = (): void => l.remove(); l.classList.add('out'); l.addEventListener('transitionend', rm, { once: true }); setTimeout(rm, 700); }
  }
  broadcast(_m: S2C): void {}

  applySettings(): void {
    const s = this.cfg.settings;
    this.gfx.applySettings(s.gfx);
    this.world.setView(s.gfx.renderDist, DIMS[this.dim].fogScale);
    this.audio.setVolumes(s.sfx, s.music);
    this.input.raw = s.rawMouse;
  }
  start(): void { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop(): void { cancelAnimationFrame(this.raf); this.pool.dispose(); }

  // ---- small services the windows and the HUD call ----------------------------------------------
  toast(text: string, color?: string): void { if (text) this.hud.toast(text, color); }
  /** One inventory or container op. The simulation carries it out at once; the result says what to play and toast. */
  op(o: InvOp): OpResult { return act.invOp(this.sim, this.me, ++this.opSeq, o); }
  respawn(): void { respawn(this.sim, this.me); }
  /** Developer commands (also reachable from the T command line). */
  cheat(cmd: string): string { return cheat(this.sim, this.me, cmd); }
  /** A refusal the player should hear about, at most once per `gap` seconds. */
  private warn(text: string, color: string, gap: number, sound: boolean): void {
    if (this.warnT > 0) return;
    this.toast(text, color); if (sound) this.audio.play('error', 0.5); this.warnT = gap;
  }

  // ---- DigHost and ActHost: what the hands do. The decision is made here; what it changes is the simulation's. ----
  reach(): number { return rules.reach(this.stats, this.me.modes); }
  breakTime(id: number): number { return rules.breakTime(id, this.inv, this.stats, this.me.modes, this.player); }
  onDigTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void {
    const b = BLOCKS[id], l = this.world.getLight(x + nx, y + ny, z + nz);
    this.swing = 1;
    this.audio.play('dig_' + b.sound, 0.7);
    for (let i = 0; i < 3; i++) this.particles.spawn(x + 0.5 + nx * 0.55 + (Math.random() - 0.5) * 0.5, y + 0.5 + ny * 0.55 + (Math.random() - 0.5) * 0.5, z + 0.5 + nz * 0.55 + (Math.random() - 0.5) * 0.5,
      nx * 1.5 + (Math.random() - 0.5) * 2, ny * 1.5 + Math.random() * 2, nz * 1.5 + (Math.random() - 0.5) * 2, 0.5, 0.12, tintOf(id), 0, 14, T_LAYER[id * 6], true, (l >> 4) / 15, (l & 15) / 15);
  }
  /** The simulation is not told of a dig while it runs in this thread: it hears of the break. */
  onDig(_on: boolean, _x: number, _y: number, _z: number): void {}
  /** Auto-tool: when mining starts with a tool (or nothing) in hand, switch to the best hotbar tool for the block. */
  onDigStart(id: number): void {
    const b = BLOCKS[id], inv = this.inv, h = inv.held(), cur = h ? item(h.k).tool : undefined;
    if (!this.cfg.settings.autoTool || this.me.modes.creative || b.tool === 'none' || b.hard < 0 || (h && !cur)) return;
    let best = -1, bestV = cur && cur.kind === b.tool ? (cur.power >= b.power ? 1000 : 0) + cur.speed : -1;
    for (let i = 0; i < 9; i++) {
      const s = inv.slots[i], t = s ? item(s.k).tool : undefined;
      if (!t || t.kind !== b.tool) continue;
      const v = (t.power >= b.power ? 1000 : 0) + t.speed;   // able to harvest first, then fastest
      if (v > bestV) { bestV = v; best = i; }
    }
    if (best >= 0) this.op({ o: 'sel', i: best });
  }
  onBroken(x: number, y: number, z: number, id: number): void {
    if (!act.breakBlock(this.sim, this.me, x, y, z, id)) return;
    this.fx.burst(BURST.block, x, y, z, id, 0); this.audio.play('break_' + BLOCKS[id].sound, 0.9);
  }

  primary(pressed: boolean, held: boolean): boolean {
    if (!held || this.stats.dead) return false;
    const inv = this.inv, st = this.stats, p = this.player, it = inv.held(), d = it ? item(it.k) : null, wpn = d?.weapon, style = wpn?.style ?? 'melee';
    const dir = p.dir(this.v), ex = p.x, ey = p.y + p.eye, ez = p.z;
    const rate = rules.attackRate(inv, st);
    if (style !== 'melee' && wpn) {
      if (this.atkCd > 0) return true;
      this.atkCd = 1 / rate;
      const r = act.fire(this.sim, this.me, ex, ey, ez, dir.x, dir.y, dir.z);
      if (r === 2) this.warn('No arrows', '#ff9a8a', 1.5, true);
      else if (r === 3) this.warn('Not enough mana', '#9ad0ff', 1.5, true);
      else if (r === 1) { this.swing = 1; if (style === 'ranged') this.audio.play('bow'); else if (style === 'magic') this.audio.play('magic'); else this.atkCd = 0.6; }
      return true;
    }
    const reach = (wpn?.reach ?? 3.3) + st.d.reach * 0.5, h = this.interact.hit;
    const r = rayHitMobs(this.ents.mobs, ex, ey, ez, dir.x, dir.y, dir.z, reach, 0.18, NOT_FRIEND);
    if (r && (!h.hit || r.t <= h.dist + 0.2)) {
      if (this.atkCd <= 0) { this.atkCd = 1 / rate; this.swing = 1; this.audio.play('swing', 0.6); act.attack(this.sim, this.me, r.m.id, dir.x, dir.z); }
      return true;
    }
    if (pressed && this.atkCd <= 0) { this.swing = 1; this.atkCd = 0.25; if (!h.hit) this.audio.play('swing', 0.4); }
    return false;
  }

  secondary(hit: RayHit | null, pressed: boolean): boolean {
    const p = this.player, inv = this.inv, st = this.stats, me = this.me, sim = this.sim;
    if (st.dead) return false;
    const dir = p.dir(this.v);
    // talk to townsfolk
    if (pressed) {
      const r = rayHitMobs(this.ents.mobs, p.x, p.y + p.eye, p.z, dir.x, dir.y, dir.z, hit ? Math.min(4, hit.dist) : 4, 0.15, IS_NPC);
      if (r && npcOf(r.m.def.key) && act.talk(sim, me, r.m.id)) return true;
    }
    const it = inv.held(), d = it ? item(it.k) : null;
    if (hit && pressed && !p.sneaking) {
      const use = BLOCKS[hit.id].use;
      if (use && this.useBlock(hit, use)) return true;
    }
    if (!it || !d) return false;
    if (d.block !== undefined && hit) {
      if (!act.place(sim, me, hit, d.block)) return false;
      this.audio.play(act.placeSound(d.block), 0.8, 0.9); this.swing = 1;
      return true;
    }
    if (d.use && hit && pressed) {
      if (d.use === 'door') { if (!act.placeDoor(sim, me, hit)) return false; this.audio.play('door'); return true; }
      if (d.use === 'gate1' || d.use === 'gate2') {
        placeGate(sim, me, hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz, Math.abs(dir.z) > Math.abs(dir.x));
        return true;
      }
      if (d.use.startsWith('summon')) { this.toast('Use this at its altar. The guide points the way.', '#ffd9a0'); return true; }
    }
    if (!pressed || this.useCd > 0) return false;
    if (d.use === 'recall') { if (!recall(sim, me)) this.toast('The stone is still warm.', '#ff9a8a'); return true; }
    if (d.food || d.heal || d.restoreMana || d.buff) {
      const r = this.consume(inv.sel);
      if (r === 2) this.swing = 1;
      return r !== 0;
    }
    return false;
  }
  private useBlock(hit: RayHit, use: string): boolean {
    if (!act.useBlock(this.sim, this.me, hit, use)) return false;
    // a station opens here without waiting to be told; a crate is a block this player just broke
    if (act.STATIONS[use]) { this.audio.play('click'); this.win.show('station', { station: act.STATIONS[use] }); }
    else if (use === 'crate') { this.fx.burst(BURST.block, hit.x, hit.y, hit.z, hit.id, 0); this.audio.play('break_' + BLOCKS[hit.id].sound, 0.9); }
    return true;
  }
  /** Eat, drink or apply the consumable in `slot`. Returns 0 when nothing happened, 1 when refused with feedback, 2 when used. */
  private consume(slot: number): number {
    const it = this.inv.slots[slot], d = it ? item(it.k) : null;
    if (!d) return 0;
    const r = act.consume(this.sim, this.me, slot);
    if (r === 1) this.warn(`Salves need ${Math.ceil(this.stats.salveCd)}s more`, '#ff9a8a', 1, false);
    else if (r === 2) { this.useCd = 0.35; this.audio.play(d.food ? 'eat' : 'drink'); }
    return r;
  }
  /** H: apply the salve that best covers missing health without scrolling to it. */
  private quickHeal(): void {
    const inv = this.inv, st = this.stats, miss = st.maxHp - st.hp;
    if (st.dead || this.useCd > 0) return;
    if (st.salveCd > 0) { this.audio.play('error', 0.4); return; }
    let best = -1, bestHeal = 0, big = -1, bigHeal = 0;
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i], d = s ? item(s.k) : null;
      if (!d || !d.heal || d.food) continue;
      if (d.heal >= miss && (best < 0 || d.heal < bestHeal)) { best = i; bestHeal = d.heal; }
      if (d.heal > bigHeal) { big = i; bigHeal = d.heal; }
    }
    if (big < 0) { if (this.warnT <= 0) { this.toast('No salves', '#ff9a8a'); this.audio.play('error', 0.5); this.warnT = 1.5; } return; }
    if (miss < 1) { if (this.warnT <= 0) { this.toast('Already at full health', '#9aa0b2'); this.warnT = 1.5; } return; }
    this.consume(best >= 0 ? best : big);
  }


  // ---- loading ---------------------------------------------------------------------
  private showLoading(msg: string): void {
    this.loadMsg = msg;
    if (!this.loading) { this.loading = el('div', '#loading', this.ui); this.loading.innerHTML = '<h1>PEOPLS CRAFT</h1><div class="bar"><i></i></div><div class="msg"></div>'; }
  }
  // ---- input ----------------------------------------------------------------------------------
  private onKey(code: string, e: KeyboardEvent): boolean {
    if (!this.ready || this.menu.dead) return false;
    if (code === 'Escape') { if (this.win.open) this.win.close(); else if (this.menu.open) this.menu.escape(); else this.menu.pause(); return true; }
    if (this.menu.open || document.activeElement === this.console) return false;
    if (this.win.open && this.win.key(code, e)) return true;
    if (code === 'KeyE') { if (this.win.open) this.win.close(); else this.win.show('inv'); return true; }
    if (code === 'KeyG') { this.win.toggleGuide(); return true; }
    if (code === 'F3') { this.debug.toggle(); return true; }
    if (code === 'F1') { this.hudOn = !this.hudOn; this.hud.setVisible(this.hudOn); return true; }
    if ((code === 'KeyT' || code === 'Slash') && !this.win.open) { this.console.style.display = 'block'; this.console.value = ''; this.input.uiMode = true; this.input.unlock(); setTimeout(() => this.console.focus(), 0); return true; }
    return false;
  }
  private closeConsole(): void { if (this.console.style.display === 'none') return; this.console.style.display = 'none'; this.console.blur(); this.input.uiMode = false; this.input.lock(); }

  // ---- the fixed step ----------------------------------------------------------------------------------
  private tick(dt: number): void {
    const p = this.player, inp = this.input, inv = this.inv, st = this.stats, w = this.world, me = this.me, sim = this.sim;
    if (!this.ready) return;
    let sel = inv.sel;
    for (let i = 0; i < 9; i++) if (inp.hit(DIGITS[i])) sel = i;
    if (inp.wheel) sel = (((sel + inp.wheel) % 9) + 9) % 9;
    if (sel !== inv.sel) this.op({ o: 'sel', i: sel });
    if (inp.hit('KeyH') && inp.locked) this.quickHeal();
    if (inp.hit('KeyQ')) this.op({ o: 'dropHeld', all: inp.down('ControlLeft') || inp.down('ControlRight') });
    // the body and the hand read derived stats below: fold in what the keys above and the last step changed
    st.sync(inv);
    p.moveMult = (1 + st.d.speed) * (p.inWater ? 1 + st.d.swim : 1); p.jumpMult = Math.sqrt(1 + st.d.jump); p.extraJumps = st.d.extraJump;
    p.autoJump = this.cfg.settings.autoJump; p.canFly = me.modes.creative && this.cfg.settings.flyToggle;
    p.frozen = st.dead || me.arriving >= 0;
    p.tick(dt, inp, w, this.time);
    // water entry: a splash scaled by how hard we hit it, and a softer one as the head crosses the surface
    if (this.splashCd > 0) this.splashCd -= dt;
    if (p.inWater !== this.wasWet) {
      this.wasWet = p.inWater;
      const fall = (p.py - p.y) * 60;
      if (p.inWater && fall > 3 && this.splashCd <= 0) {
        this.splashCd = 0.6;
        const hard = Math.min(1, 0.25 + fall * 0.05), sy = Math.floor(p.y + 0.4) + 0.9, l = w.getLight(Math.floor(p.x), Math.floor(sy) + 1, Math.floor(p.z)), n = 6 + Math.round(hard * 10);
        this.audio.play('splash', hard);
        for (let i = 0; i < n; i++) this.particles.spawn(p.x + (Math.random() - 0.5) * 0.6, sy, p.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 2.5, 0.5, 0.09, 0xbfe4ff, 0, 14, -1, false, (l >> 4) / 15, (l & 15) / 15);
        if (fall > 12) p.shake(0.12);
      }
    }
    if (p.headInWater !== this.wasUnder) { this.wasUnder = p.headInWater; if (this.splashCd <= 0) { this.splashCd = 0.4; this.audio.play('splash', 0.3, p.headInWater ? 0.6 : 1.2); } }
    if (this.atkCd > 0) this.atkCd -= dt; if (this.useCd > 0) this.useCd -= dt; this.fx.tick(dt); if (this.warnT > 0) this.warnT -= dt;

    // landing and footsteps
    if (p.landed > 1.2) { const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); this.audio.play('step_' + (BLOCKS[below]?.sound ?? 'stone'), Math.min(1, p.landed * 0.25)); }
    // a footfall each time the stride phase passes the bottom of the view bob
    const sn = Math.floor(p.walkDist / STRIDE + 0.5);
    if (sn !== this.stepN) { this.stepN = sn; if (p.onGround) { const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); if (below) this.audio.play('step_' + BLOCKS[below].sound, p.sneaking ? 0.25 : 0.6); } }

    me.uiOpen = this.win.open;
    this.interact.tick(dt, inp, this, this, inp.locked && !st.dead);
    if (inp.clicks[1] && this.interact.hit.hit && this.op({ o: 'pick', id: this.interact.hit.id }).ok) this.audio.play('click', 0.4);

    // the world: one step of the simulation, with the views told before and after
    this.ents.begin(sim.realms[me.dim], dt);
    sim.step();
    this.ents.end(sim.realms[me.dim], dt);
    this.quests.tick(dt);
    this.portalHud();
    this.saveT += dt; if (this.saveT > 30) { this.saveT = 0; void this.save(); }

    // prompts
    const h = this.interact.hit;
    let prompt: string | null = null;
    // townsfolk first, as secondary() tries them before blocks; the ray is cheap but only needs checking a few times a second
    if (--this.npcPromptT <= 0) {
      this.npcPromptT = 6;
      const d = p.dir(this.v), r = rayHitMobs(this.ents.mobs, p.x, p.y + p.eye, p.z, d.x, d.y, d.z, h.hit ? Math.min(4, h.dist) : 4, 0.15, IS_NPC);
      this.npcPrompt = null;
      if (r && npcOf(r.m.def.key)) {
        let t = TRADE_PROMPT.get(r.m.def.key);
        if (!t) { t = `Right-click: trade with ${r.m.def.name}`; TRADE_PROMPT.set(r.m.def.key, t); }
        this.npcPrompt = t;
      }
    }
    if (this.npcPrompt) prompt = this.npcPrompt;
    else if (h.hit && h.dist < this.reach()) {
      const u = BLOCKS[h.id].use;
      if (u && u.startsWith('altar')) { const n = +u.slice(5), held = inv.held(); prompt = this.ents.boss() ? null : held && item(held.k).use === SUMMON_USE[n] ? (n === 7 && !isNight(this.clock) ? 'Answers only at night' : ALTAR_OFFER[n]) : ALTAR_NEED[n]; }
      else if (u) prompt = u === 'bed' ? 'Right-click: rest / set spawn' : u === 'guestbed' ? 'Right-click: check this room' : u === 'berries' ? 'Right-click: pick berries' : u === 'nest' ? null : 'Right-click: open';
      else if (!rules.canHarvest(h.id, inv) && BLOCKS[h.id].hard >= 0) { const tier = TIERS[Math.max(0, BLOCKS[h.id].power - 1)].name; prompt = `Needs ${article(tier)} ${tier} pick or better`; }
    }
    this.hud.setPrompt(this.win.open || this.menu.open ? null : !inp.locked && !inp.uiMode ? 'Click to take control' : prompt);
  }

  /** The portal overlay follows the crossing timer the simulation keeps for this player. */
  private portalHud(): void {
    const p = this.player, me = this.me, id = this.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z));
    const kind = id === B.hollow_portal ? 1 : id === B.rift_portal ? 2 : 0;
    let a = this.portalA, gold = this.portalGold;
    if (!kind) { a = me.portalT / 1.6; gold = false; } else if (me.portalArmed && !this.win.open) { a = Math.min(1, me.portalT / 1.6); gold = kind === 2; }
    if (a !== this.portalA || gold !== this.portalGold) { this.portalA = a; this.portalGold = gold; this.hud.setPortal(a, gold); }
  }

  // ---- frame ----------------------------------------------------------------------------------------
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
    const p = this.player, inp = this.input, sens = 0.0023 * this.cfg.settings.sens;
    if (inp.locked && !this.stats.dead) p.look(inp.dx, inp.dy, sens);
    const t0 = performance.now();
    if (this.keysReady) this.world.update(p.x, p.z, this.ready ? 1.5e6 : 8e6);
    if (!this.ready) this.checkReady();
    const t1 = performance.now();
    let n = 0;
    if (!this.paused) {
      this.acc += dt;
      while (this.acc >= STEP && n < 5) { this.tick(STEP); this.acc -= STEP; n++; if (n === 1) inp.endTick(); }
      if (n === 5) this.acc = 0;
      this.world.pump();   // send remesh jobs for this frame's block edits now, not next frame
    } else inp.endTick();   // no tick runs while paused, so presses made in the menu must not fire on resume
    const t2 = performance.now(), a = this.paused ? 1 : this.acc / STEP;
    p.applyCamera(this.gfx.camera, a, dt, this.cfg.settings.gfx.fov, this.time, this.cfg.settings.bob, this.cfg.settings.shake);
    this.interact.aim(this.reach(), inp.locked && !this.stats.dead);
    this.audio.lx = p.x; this.audio.ly = p.y + p.eye; this.audio.lz = p.z;
    this.updateEnv(dt);
    if (this.world.uploadsThisFrame > 0) this.gfx.shadowDirty = true;
    this.gfx.update(this.time, this.env, this.gfx.camera.position);
    this.world.setCull(this.gfx.camera.position.x, this.gfx.camera.position.z);
    if (!this.paused) this.particles.update(dt, this.world);
    // a tick leaves the views current; without one (paused, a frame between ticks) pick up what changed outside the step
    if (n === 0 || !this.ready) this.ents.sync(this.sim.realms[this.dim]);
    this.boxes.begin(); this.ents.render(this.boxes, a, this.time); this.boxes.end();
    this.ents.renderDrops(a);
    this.updateHand(dt);
    this.gfx.flash = 0;
    this.gfx.render(this.ready && !this.stats.dead && this.hudOn);
    if (this.win.open) this.win.refresh();
    this.hud.update(dt);
    this.audio.update();
    const t3 = performance.now(), pr = this.prof;
    if (this.ready && !this.paused && !document.hidden && this.world.uploadsThisFrame === 0) this.gfx.tune(dt * 1000, t3 - t0);
    pr.world = Math.max(pr.world, t1 - t0); pr.tick = Math.max(pr.tick, t2 - t1); pr.render = Math.max(pr.render, t3 - t2);
    if (this.debug.frame(dt)) { this.debug.set(this.debugLines()); pr.world = pr.tick = pr.render = 0; }
    inp.endFrame();
  }

  /** Behind the loading screen: when the place is meshed, tell the simulation; it lands the player and puts it in play. */
  private checkReady(): void {
    const p = this.player, w = this.world, c = w.counts();
    if (this.loading) { (this.loading.querySelector('i') as HTMLElement).style.width = Math.min(100, (c.meshed / 49) * 100) + '%'; (this.loading.querySelector('.msg') as HTMLElement).textContent = this.loadMsg; }
    if (!this.keysReady || !w.areaMeshed(p.x, p.z, 3)) return;
    this.me.clientReady = true; this.sim.prepare();
  }

  private updateEnv(dt: number): void {
    const p = this.player, e = this.env, w = this.world;
    const x = Math.floor(p.x), y = Math.floor(p.y + p.eye), z = Math.floor(p.z);
    const bio = BIOMES[w.biomeAt(x, z)] ?? BIOMES[0], k = Math.min(1, dt * 0.8);
    for (let i = 0; i < 3; i++) e.fogTint[i] += (bio.fog[i] - e.fogTint[i]) * k;
    e.haze += (bio.haze - e.haze) * k;
    const sky = w.getLight(x, y, z) >> 4;
    if (this.ready) this.gfx.setEye(dt, w.getLight(x, y, z), bio.water);
    const caveT = DIMS[this.dim].hasSky && sky < 5 && y < w.topY(x, z) - 4 ? 1 : 0;
    e.cave += (caveT - e.cave) * Math.min(1, dt * 1.2);
    e.underwater = p.headInWater; e.time = this.clock % 1; e.dim = this.dim;
    e.moonPhase = (Math.floor(this.clock) % 8) / 4 - 1; e.moonTint = moonTint(this.sim.shared.events);
    const boss = this.ents.boss();
    this.audio.setMood(!this.ready ? 'none' : boss ? 'boss' : this.dim === 1 ? 'hollows' : this.dim === 2 ? 'rift' : e.cave > 0.5 ? 'cave' : isNight(this.clock) ? 'night' : 'day');
  }

  private updateHand(dt: number): void {
    const inv = this.inv, h = inv.held(), key = h ? h.k : '', p = this.player, hand = this.hand;
    if (key !== this.handKey) { this.handKey = key; this.equip = 1; hand.geometry = key ? this.models.get(key) : this.armGeo; }
    this.equip = Math.max(0, this.equip - dt * 5); this.swing = Math.max(0, this.swing - dt * 4.2);
    // bob on the camera's own stride phase (advanced per frame), so hand and view stay in step at any refresh rate
    const s = Math.sin((1 - this.swing) * Math.PI) * (this.swing > 0 ? 1 : 0), bob = p.stride, sb = Math.sin(p.bobPhase);
    const bx = Math.cos(p.bobPhase) * 0.02 * bob, by = -sb * sb * 0.025 * bob;
    const cube = key ? this.models.isCube(key) : false, d = key ? item(key) : null, tool = !!d && (!!d.tool || !!d.weapon);
    if (!key) { hand.scale.set(0.5, 0.5, 0.5); hand.position.set(0.42 + bx, -0.36 + by - this.equip * 0.4 - s * 0.08, -0.62 - s * 0.2); hand.rotation.set(0.42 - s * 0.9, -0.25 + s * 0.4, 0.1); }
    else if (cube) { hand.scale.setScalar(0.15); hand.position.set(0.36 + bx - s * 0.1, -0.24 + by - this.equip * 0.4 - s * 0.1, -0.6 - s * 0.14); hand.rotation.set(0.14 - s * 0.7, 0.72, 0.04); }
    else { hand.scale.setScalar(tool ? 0.27 : 0.2); hand.position.set(0.36 + bx - s * 0.16, -0.2 + by - this.equip * 0.4 - s * 0.14, -0.6 - s * 0.12); hand.rotation.set(-s * 1.25 + (tool ? 0 : 0.1), -1.25 + s * 0.3, tool ? 0.28 - s * 0.5 : 0); }
    // inertia: the hand trails quick turns, sinks as you rise, floats as you fall and takes part of the landing dip
    if (dt > 0) {
      const k = Math.min(1, dt * 10);
      this.swayX += (clamp((p.yaw - this.lastYaw) / dt * 0.012, -0.06, 0.06) - this.swayX) * k;
      this.swayY += (clamp((p.pitch - this.lastPitch) / dt * 0.012, -0.06, 0.06) - this.swayY) * k;
      this.fallY += ((p.onGround || p.flying || p.inWater ? 0 : clamp(-p.vy * 0.006, -0.05, 0.06)) - this.fallY) * Math.min(1, dt * 8);
    }
    this.lastYaw = p.yaw; this.lastPitch = p.pitch;
    hand.position.x += this.swayX; hand.position.y += this.fallY - this.swayY - p.dip * 0.6;
    hand.rotation.y -= this.swayX * 1.2; hand.rotation.x -= this.swayY * 0.8;
    const l = this.world.getLight(Math.floor(p.x), Math.floor(p.y + p.eye), Math.floor(p.z));
    this.handLight.set((l >> 4) / 15, Math.max((l & 15) / 15, d?.block !== undefined && BLOCKS[d.block].light ? 0.9 : 0), 0, d?.block !== undefined && BLOCKS[d.block].emissive > 100 ? 0.5 : 0);
  }

  // ---- persistence -------------------------------------------------------------------------------------
  private saveChunk(c: Chunk): void {
    if (!c.blocks || !c.biomes) return;
    this.cfg.db.putChunk(this.cfg.meta.id, this.world.dim, c.cx, c.cz, { blocks: c.blocks, biomes: c.biomes, hasEmit: c.hasEmit, ents: [...c.ents.values()], pal: this.palettes.length - 1 });
    this.world.savedKeys.add(c.key); c.modified = false;
  }
  async save(): Promise<void> {
    if (!this.ready && !this.cfg.meta.data) return;
    const m = this.cfg.meta;
    m.played = Date.now();
    m.data = toLegacy(this.sim, this.me, this.palettes);
    for (const c of this.world.chunks.values()) if (c.modified && c.state === 2) this.saveChunk(c);
    try {
      await this.cfg.db.putWorld(m);
      if (this.cfg.canSave !== false) { this.lastSave = Date.now(); this.hud.saved(); }
    } catch (e) {
      console.warn('save failed', e);
      if (performance.now() - this.saveFailT > 60000) { this.saveFailT = performance.now(); this.toast('Save failed. Your progress may not be kept.', '#ff9a8a'); }
    }
  }

  private debugLines(): string[] {
    const p = this.player, w = this.world, c = w.counts(), info = this.gfx.renderer.info;
    const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z), l = w.getLight(x, y + 1, z);
    const facing = ['north (-z)', 'west (-x)', 'south (+z)', 'east (+x)'][((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4];
    const tod = ((this.clock % 1) * 24 + 6) % 24;
    return [
      `chunks  ${c.meshed} meshed / ${c.loaded} loaded / ${c.waiting} waiting   workers ${this.pool.busy}/${this.pool.size}   mesh ${w.meshMs.toFixed(1)} ms`,
      `draw    ${info.render.calls} calls   ${(info.render.triangles / 1000).toFixed(0)}k tris   ${info.memory.geometries} geometries   scale ${Math.round(this.gfx.renderScale * 100)}%`,
      `cpu     chunks ${this.prof.world.toFixed(1)} ms   sim ${this.prof.tick.toFixed(1)} ms   draw ${this.prof.render.toFixed(1)} ms (worst)`,
      `pos     ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}   chunk ${x >> 4} ${z >> 4}   facing ${facing}`,
      `world   ${DIMS[this.dim].name}   ${BIOMES[w.biomeAt(x, z)]?.name ?? '?'}   light sky ${l >> 4} block ${l & 15}   day ${Math.floor(this.clock)} ${Math.floor(tod)}:${String(Math.floor((tod % 1) * 60)).padStart(2, '0')}`,
      `ents    ${this.ents.mobCount} creatures   ${this.ents.projCount} projectiles   ${this.ents.dropCount} drops   ${this.particles.alive} particles   boxes ${this.boxes.count}`,
      `view    ${w.renderDist} chunks   seed ${this.cfg.meta.seedText}   ${p.onGround ? 'ground' : p.inWater ? 'water' : 'air'}${p.flying ? ' fly' : ''}${this.sim.shared.events.a ? '   event ' + this.sim.shared.events.a : ''}`,
    ];
  }
}
