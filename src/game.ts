// Game: the client. Owns the view, the input, the HUD and the audio, runs the local player's body, and
// talks to the simulation through its session and nothing else: what it shows of the world, the player
// and the creatures are mirrors that the host's messages fill.
import * as THREE from 'three';
import { GameAudio } from './audio/audio';
import { DAY_LENGTH } from './core/constants';
import { clamp } from './core/noise';
import { B, BLOCKS, T_LAYER } from './data/blocks';
import { BIOMES } from './data/biomes';
import { DIMS } from './data/dims';
import { type Item, ITEMS, TIERS, article, item } from './data/items';
import { NPCS } from './data/npcs';
import { BlockClient } from './client/blocks';
import { Combat } from './client/combat';
import { EntityStore } from './client/entities';
import { FxPlay, tintOf } from './client/fxplay';
import { InvClient, moonTint } from './client/invclient';
import { type MoveState, type Session, moveFlags } from './client/session';
import { type EventWire, MOVE_EVERY, type S2COf } from './net/protocol';
import { Input } from './player/input';
import { Interact } from './player/interact';
import { Player, STRIDE } from './player/player';
import { buildArm } from './player/viewmodel';
import { BoxBatch, Particles, makeItemMaterial } from './render/batches';
import { Env, Gfx } from './render/gfx';
import { Icons } from './render/icons';
import { ItemModels } from './render/itemModel';
import type { MobView } from './render/mobView';
import { STEP, isNight } from './sim/clock';
import { BURST } from './sim/fx';
import type { Inventory } from './sim/inventory';
import { rayHitMobs } from './sim/mobhit';
import { npcOf } from './sim/npcs';
import * as rules from './sim/rules';
import type { PlayerStats } from './sim/stats';
import { DebugOverlay } from './ui/debug';
import { Hud, el } from './ui/hud';
import { GameMenu, Settings } from './ui/menus';
import { QuestView } from './ui/questView';
import { Windows } from './ui/windows';
import { Climate } from './world/gen/climate';
import type { WorkerPool } from './world/pool';
import { World } from './world/world';

export interface GameConfig {
  session: Session;
  settings: Settings;
  /** The page's chunk workers. */
  pool: WorkerPool;
  /** One step of a host whose clock this client drives (a simulation in this page): null when it has stepped, else a
   *  promise that settles when it has. Absent when the host keeps its own time. */
  step?: () => Promise<void> | null;
  /** false when the browser blocks IndexedDB */
  canSave?: boolean;
  /** An automated run: no question before the tab closes. */
  quick?: boolean;
  /** Say `ready` only when the whole view is meshed, so a scripted run starts from the same loaded world every time. */
  det?: boolean;
}
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
// Interaction prompts, built once so the per-tick prompt check allocates nothing.
const IS_NPC = (m: MobView): boolean => m.def.ai === 'npc';
const SUMMON_USE: string[] = [], ALTAR_OFFER: string[] = [], ALTAR_NEED: string[] = [], TRADE_PROMPT = new Map<string, string>();
for (const it of ITEMS.values()) if (it.use?.startsWith('summon')) {
  const n = +it.use.slice(6);
  SUMMON_USE[n] = it.use; ALTAR_OFFER[n] = `Right-click: offer the ${it.name}`; ALTAR_NEED[n] = `Needs ${article(it.name)} ${it.name}`;
}

export class Game {
  readonly gfx: Gfx; readonly pool: WorkerPool; readonly world: World; readonly input: Input;
  readonly player = new Player(); readonly interact: Interact; readonly debug: DebugOverlay; climate: Climate;
  readonly session: Session; readonly invc: InvClient; readonly blocks: BlockClient; readonly combat: Combat; readonly fx: FxPlay;
  readonly particles = new Particles(); readonly boxes = new BoxBatch(); readonly audio = new GameAudio();
  readonly ents: EntityStore;
  readonly icons: Icons; readonly models: ItemModels; readonly hud: Hud; readonly win: Windows; readonly menu: GameMenu;
  readonly quests: QuestView;
  time = 0; ready = false; paused = false;
  prof = { world: 0, tick: 0, render: 0 };
  private last = performance.now(); private acc = 0; private raf = 0;
  /** The host has welcomed this client: there is a world to load. */
  private joined = false; private everReady = false;
  /** A frame whose step is still on its way; the frames that start meanwhile do nothing. */
  private busy: Promise<void> | null = null;
  private nTicks = 0; private tickMs = 0; private frameN = 0;
  /** The clock the host's tick is estimated against and round trips are timed with: wall time less the time this client
   *  stood still (paused, or with no frame for longer than a frame may count), since a host it steps stood still with it. */
  private heldMs = 0; private pausedAt = 0;
  private env: Env = { time: 0, dim: 0, fogTint: [1, 1, 1], haze: 0, cave: 0, underwater: false, moonTint: null, moonPhase: 0, darkness: 0 };
  private loading: HTMLElement | null = null; private loadMsg = 'Raising the land';
  private swing = 0; private equip = 0; private handKey = '?'; private hand: THREE.Mesh; private handLight = new THREE.Vector4(1, 0, 0, 0);
  private armGeo: THREE.BufferGeometry;
  private swayX = 0; private swayY = 0; private fallY = 0; private lastYaw = 0; private lastPitch = 0;   // held-item inertia
  private stepN = 0; private wasWet = false; private wasUnder = false; private wasLava = false; private splashCd = 0;
  private portalT = 0; private portalArmed = true; private portalA = 0; private portalGold = false;
  private console: HTMLInputElement; private v = new THREE.Vector3();
  private hudOn = true;
  private npcPromptT = 0; private npcPrompt: string | null = null; private conClosed = 0;
  /** Date.now() of the last successful save (0 = not yet). */
  lastSave = 0; private saveFailT = -1e9; private noSaveWarned = false;
  private saveWaiters: (() => void)[] = [];
  private cmdId = 0; private cmds = new Map<number, (text: string) => void>();
  // movement: the last teleport applied, the `ready` said for it, and what the last movement message told of jumps
  private tpId = 0; private readySent = -1; private moveT = 0;
  private mv: MoveState = { tp: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flags: 0 };
  private moveMark = 0; private jumpsSeen = 0; private jumpsSent = 0;
  private boot = 0;

  // ---- mirrors: the shared world state as the host last told it, and the local player's as the inventory client holds it ----
  flags = new Set<string>();
  /** Days; advanced here between two `time` messages. */
  clock = 0.06;
  /** Index of the guide step the world has reached. */
  quest = 0;
  /** The world event as the HUD shows it: which is running, kills, goal. */
  event: EventWire = { a: null, k: 0, g: 0 };
  dim = 0;
  /** Where the player starts without a bed, as x and z. */
  worldSpawn: [number, number] = [0, 0];
  seed = 0; seedText = ''; worldName = '';
  /** This client's slot on the host. */
  slot = 0;
  get inv(): Inventory { return this.invc.inv; }
  get stats(): PlayerStats { return this.invc.stats; }
  get creative(): boolean { return this.invc.modes.creative; }
  get spawn(): [number, number, number] | null { return this.invc.bed; }
  /** Recall stone cooldown in seconds; the HUD shades the stone's slot with it. */
  get recallT(): number { return this.invc.recallT; }
  /** Last death as [dimension, x, y, z], shown on the compass until the player walks back to it. */
  get deathAt(): [number, number, number, number] | null { return this.invc.deathAt; }
  /** What the open shop bought from the player and still offers back, oldest first. */
  get sold(): readonly { id: number; it: Item; price: number }[] { return this.invc.sold; }

  constructor(canvas: HTMLCanvasElement, readonly ui: HTMLElement, readonly cfg: GameConfig) {
    const s = this.session = cfg.session;
    this.gfx = new Gfx(canvas);
    this.icons = new Icons(this.gfx.atlas); this.models = new ItemModels(this.gfx.atlas, this.icons);
    this.pool = cfg.pool;
    // seed and dimension come with the welcome; nothing is generated before it
    this.world = new World(this.pool, this.gfx.materials, 0, 0);
    this.climate = new Climate(0);
    this.world.vox.attach(s);
    this.invc = new InvClient(s, () => this.flags);
    this.gfx.scene.add(this.world.group, this.boxes.mesh, this.particles.mesh);
    this.gfx.shadowCasters = this.world.group;
    this.gfx.boxCaster = this.boxes;
    this.input = new Input(canvas);
    this.interact = new Interact(this.gfx.scene, this.world, this.player);
    this.ents = new EntityStore(this, this.models); this.ents.connect(s);
    this.gfx.scene.add(this.ents.mobRender.shadows.mesh, this.ents.dropRender.group);
    this.hud = new Hud(ui, this); this.win = new Windows(ui, this); this.win.channel = this.invc; this.menu = new GameMenu(ui, this);
    this.debug = new DebugOverlay(ui);
    this.quests = new QuestView(this);
    this.fx = new FxPlay(this); this.fx.connect(s);
    this.blocks = new BlockClient({
      vox: this.world.vox, session: s, inv: this.invc, bodies: this.ents, me: this.invc, body: this.player, autoTool: () => cfg.settings.autoTool,
      view: { burst: (x, y, z, id) => this.fx.burst(BURST.block, x, y, z, id, 0), play: (n, v, r) => this.audio.play(n, v, r), digTick: (x, y, z, id, nx, ny, nz) => this.digTick(x, y, z, id, nx, ny, nz) },
    });
    this.blocks.attach(s);
    this.combat = new Combat({
      player: this.player, interact: this.interact, ents: this.ents, audio: this.audio, win: this.win, toast: (t, c) => this.toast(t, c), swing: () => { this.swing = 1; },
      burst: (x, y, z, id) => { this.fx.burst(BURST.block, x, y, z, id, 0); this.audio.play('break_' + BLOCKS[id].sound, 0.9); },
    }, s, this.invc, this.blocks, this.ents);

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
      if (e.key === 'Enter') { const c = this.console.value.trim(); this.closeConsole(); if (c) void this.cmd(c.replace(/^\//, '')).then((r) => this.toast(r, '#8fd0ff')); }
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
      // Ctrl is a sprint key and Ctrl+W closes the tab: ask before closing mid-play (not with a menu open), and whenever
      // something done since the last save would be lost; never in an automated run
      if (!cfg.quick && ((this.ready && this.input.locked && !this.stats.dead) || s.unsaved)) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) void this.save(); });

    if (cfg.step) s.clock = this.ents.clock = () => (this.pausedAt || performance.now()) - this.heldMs;
    s.mover = () => this.moveState();
    s.on('welcome', (m) => this.onWelcome(m));
    s.on('tp', (m) => this.onTp(m));
    s.on('hurt', (m) => this.onHurt(m));
    s.on('dead', (m) => this.onDead(m));
    s.on('flags', (m) => { for (const f of m.add) this.flags.add(f); for (const f of m.del) this.flags.delete(f); });
    s.on('quest', (m) => { this.quest = m.index; });
    s.on('time', (m) => { this.clock = m.clock; });
    s.on('event', (m) => { this.event = { a: m.a, k: m.k, g: m.g }; });
    s.on('cmdr', (m) => { const f = this.cmds.get(m.id); if (f) { this.cmds.delete(m.id); f(m.text); } });
    s.on('saved', (m) => this.onSaved(m));
    s.on('error', (m) => { this.ready = false; this.showLoading(m.msg || 'The connection was closed.'); });
    this.invc.onOpen = (m, box) => {
      const n = m.mode === 'shop' ? NPCS.find((q) => q.key === m.npc) : undefined;
      if (m.mode === 'forge' && box?.kind === 'forge') { this.audio.play('click'); this.win.show('forge', { forge: box }); }
      else if (m.mode === 'chest' && box?.kind === 'chest') { this.audio.play('chest'); this.win.show('chest', { chest: box.s }); }
      else if (n) { this.audio.play('click'); this.win.show('shop', { shop: n }); }
      // nothing to show for it: the host must not go on holding a window this client never opened
      else this.invc.send({ o: 'close' });
    };
    this.invc.onEnded = () => this.win.ended();
    this.invc.onFlight = (on) => { this.player.flying = on; };

    this.player.frozen = true;
    this.applySettings();
  }

  // ---- what the host tells this client of itself ----
  /** A new connection, or the same one bound again: every mirror starts over, the world is emptied and loaded afresh. */
  private onWelcome(m: S2COf<'welcome'>): void {
    const p = this.player, cfg = this.cfg;
    if (this.boot && this.boot !== m.boot) this.toast('Server restarted');
    this.boot = m.boot; this.slot = m.you.slot;
    this.seed = m.world.seed; this.seedText = m.world.seedText; this.worldName = m.world.name;
    this.flags = new Set(m.flags); this.clock = m.clock; this.quest = m.quest; this.event = m.event; this.worldSpawn = m.spawn; this.dim = m.dim;
    if (this.win.open) this.win.ended();
    this.climate = new Climate(m.world.seed);
    this.world.seed = m.world.seed;
    this.world.setDim(m.dim, DIMS[m.dim].hasSky); this.world.setView(cfg.settings.gfx.renderDist, DIMS[m.dim].fogScale);
    p.frozen = true; p.flying = false;
    p.teleport(m.pos[0], m.pos[1], m.pos[2]); p.yaw = m.pos[3]; p.pitch = m.pos[4];
    this.tpId = m.tp; this.readySent = -1; this.ready = false; this.joined = true;
    this.portalT = 0; this.portalArmed = false; this.portalA = 0; this.portalGold = false; this.hud.setPortal(0, false);
    this.showLoading('Raising the land');
  }
  /** The host moved the player. A crossing swaps the world; `load` puts up the loading screen until the place is meshed. */
  private onTp(m: S2COf<'tp'>): void {
    const p = this.player, cfg = this.cfg;
    this.tpId = m.id;
    if (m.dim !== this.dim) {
      this.win.close(); p.frozen = true;
      this.dim = m.dim;
      this.world.setDim(m.dim, DIMS[m.dim].hasSky); this.world.setView(cfg.settings.gfx.renderDist, DIMS[m.dim].fogScale);
      this.portalT = 0; this.portalArmed = false; this.portalA = 0; this.portalGold = false; this.hud.setPortal(0, false);
    }
    p.teleport(m.x, m.y, m.z);
    if (m.yaw !== undefined) p.yaw = m.yaw;
    if (m.pitch !== undefined) p.pitch = m.pitch;
    if (m.load) { this.ready = false; p.frozen = true; this.readySent = -1; this.showLoading(m.msg ?? this.loadMsg); return; }
    if (this.ready) return;
    p.frozen = false; this.ready = true; this.everReady = true; this.moveT = MOVE_EVERY;
    if (cfg.canSave === false && !this.noSaveWarned) { this.noSaveWarned = true; this.hud.showBanner('Saving is unavailable', 'This browser is blocking storage. Progress is lost when the tab closes.', '#ff9a8a'); }
    const l = this.loading; this.loading = null;
    if (l) { const rm = (): void => l.remove(); l.classList.add('out'); l.addEventListener('transitionend', rm, { once: true }); setTimeout(rm, 700); }
  }
  private onHurt(m: S2COf<'hurt'>): void {
    const p = this.player, st = this.stats;
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
  }
  private onDead(m: S2COf<'dead'>): void {
    const c = m.cause, st = this.stats;
    // the snapshot that says so too may be a few ticks behind this message
    st.dead = this.invc.dead = true; st.hp = 0;
    if (c === '') { this.menu.death('You did not get back up', 0); return; }
    this.audio.play('death'); this.win.close(true);
    this.menu.death((c === 'fall' ? 'The ground was farther than it looked' : c === 'lava' ? 'Lava does not negotiate' : c === 'void' ? 'There was nothing under you' : c === 'hunger' ? 'Starved' : `Slain by ${c}`) + `  ·  at ${m.at[1]}, ${m.at[2]}, ${m.at[3]}`, m.lost);
  }
  private onSaved(m: S2COf<'saved'>): void {
    if (m.ok) { this.lastSave = Date.now(); if (this.cfg.canSave !== false) this.hud.saved(); }
    else if (performance.now() - this.saveFailT > 60000) { this.saveFailT = performance.now(); this.toast('Save failed. Your progress may not be kept.', '#ff9a8a'); }
    const w = this.saveWaiters;
    this.saveWaiters = [];
    for (const f of w) f();
  }
  /** Where the body is now, as a movement message reports it. `jumped`: the body has jumped since the last one sent. */
  private moveState(): MoveState {
    const p = this.player, s = this.session, m = this.mv;
    if (s.lastMove !== this.moveMark) { this.moveMark = s.lastMove; this.jumpsSent = this.jumpsSeen; }
    this.jumpsSeen = p.jumps;
    m.tp = this.tpId; m.x = p.x; m.y = p.y; m.z = p.z; m.vx = p.vx; m.vy = p.vy; m.vz = p.vz; m.yaw = p.yaw; m.pitch = p.pitch;
    m.flags = moveFlags(p, p.jumps !== this.jumpsSent, this.combat.useCd > 0, this.win.open);
    return m;
  }

  applySettings(): void {
    const s = this.cfg.settings;
    this.gfx.applySettings(s.gfx);
    this.world.setView(s.gfx.renderDist, DIMS[this.dim].fogScale);
    this.audio.setVolumes(s.sfx, s.music);
    this.input.raw = s.rawMouse;
  }
  start(): void { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop(): void { cancelAnimationFrame(this.raf); }

  // ---- small services the windows, the menus and the HUD call ----------------------------------------------
  toast(text: string, color?: string): void { if (text) this.hud.toast(text, color); }
  respawn(): void { this.session.send({ t: 'respawn' }); }
  /** A command line for the host (the T console, and the test harness). Settles with the host's reply. */
  cmd(text: string): Promise<string> {
    const id = ++this.cmdId;
    return new Promise((res) => { this.cmds.set(id, res); this.session.send({ t: 'cmd', id, text }); });
  }
  /** Ask the host to save now. Settles when it says how that went. */
  save(): Promise<void> {
    if (!this.everReady) return Promise.resolve();
    return new Promise((res) => { this.saveWaiters.push(res); this.session.send({ t: 'save' }); });
  }
  /** One tick of mining: the swing, the dig sound, three chips off the face. */
  private digTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void {
    const b = BLOCKS[id], l = this.world.getLight(x + nx, y + ny, z + nz);
    this.swing = 1;
    this.audio.play('dig_' + b.sound, 0.7);
    for (let i = 0; i < 3; i++) this.particles.spawn(x + 0.5 + nx * 0.55 + (Math.random() - 0.5) * 0.5, y + 0.5 + ny * 0.55 + (Math.random() - 0.5) * 0.5, z + 0.5 + nz * 0.55 + (Math.random() - 0.5) * 0.5,
      nx * 1.5 + (Math.random() - 0.5) * 2, ny * 1.5 + Math.random() * 2, nz * 1.5 + (Math.random() - 0.5) * 2, 0.5, 0.12, tintOf(id), 0, 14, T_LAYER[id * 6], true, (l >> 4) / 15, (l & 15) / 15);
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
  /** The client's half of a tick: keys, the body, what the hands do, and the movement message that tells the host of it. */
  private tick(dt: number): void {
    const p = this.player, inp = this.input, invc = this.invc, inv = invc.inv, st = invc.stats, w = this.world, s = this.session;
    if (!this.ready) return;
    let sel = inv.sel;
    for (let i = 0; i < 9; i++) if (inp.hit(DIGITS[i])) sel = i;
    if (inp.wheel) sel = (((sel + inp.wheel) % 9) + 9) % 9;
    if (sel !== inv.sel) invc.setSel(sel);
    if (inp.hit('KeyH') && inp.locked) this.combat.quickHeal();
    if (inp.hit('KeyQ')) invc.send({ o: 'dropHeld', all: inp.down('ControlLeft') || inp.down('ControlRight') });
    // the body and the hand read derived stats below: fold in what the keys above and the host's last word changed
    st.sync(inv);
    p.moveMult = (1 + st.d.speed) * (p.inWater ? 1 + st.d.swim : 1); p.jumpMult = Math.sqrt(1 + st.d.jump); p.extraJumps = st.d.extraJump;
    p.autoJump = this.cfg.settings.autoJump; p.canFly = invc.modes.creative && this.cfg.settings.flyToggle;
    p.frozen = st.dead;
    p.tick(dt, inp, w, this.time);
    // on landing and on entering or leaving a liquid the host hears at once; otherwise every MOVE_EVERY ticks
    const edge = p.landed > 0 || p.inWater !== this.wasWet || p.inLava !== this.wasLava;
    this.wasLava = p.inLava;
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
    this.combat.tick(dt); this.fx.tick(dt); invc.tick(dt);

    // landing and footsteps
    if (p.landed > 1.2) { const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); this.audio.play('step_' + (BLOCKS[below]?.sound ?? 'stone'), Math.min(1, p.landed * 0.25)); }
    // a footfall each time the stride phase passes the bottom of the view bob
    const sn = Math.floor(p.walkDist / STRIDE + 0.5);
    if (sn !== this.stepN) { this.stepN = sn; if (p.onGround) { const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); if (below) this.audio.play('step_' + BLOCKS[below].sound, p.sneaking ? 0.25 : 0.6); } }

    if (++this.moveT >= MOVE_EVERY || edge) { this.moveT = 0; s.move(); }
    s.probe();
    this.interact.tick(dt, inp, this.blocks, this.combat, inp.locked && !st.dead);
    if (inp.clicks[1] && this.interact.hit.hit && invc.send({ o: 'pick', id: this.interact.hit.id }).ok) this.audio.play('click', 0.4);

    this.clock += dt / DAY_LENGTH;
    this.quests.tick(dt);
    this.portalHud(dt);

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
    else if (h.hit && h.dist < this.blocks.reach()) {
      const u = BLOCKS[h.id].use;
      if (u && u.startsWith('altar')) { const n = +u.slice(5), held = inv.held(); prompt = this.ents.boss() ? null : held && item(held.k).use === SUMMON_USE[n] ? (n === 7 && !isNight(this.clock) ? 'Answers only at night' : ALTAR_OFFER[n]) : ALTAR_NEED[n]; }
      else if (u) prompt = u === 'bed' ? 'Right-click: rest / set spawn' : u === 'guestbed' ? 'Right-click: check this room' : u === 'berries' ? 'Right-click: pick berries' : u === 'nest' ? null : 'Right-click: open';
      else if (!rules.canHarvest(h.id, inv) && BLOCKS[h.id].hard >= 0) { const tier = TIERS[Math.max(0, BLOCKS[h.id].power - 1)].name; prompt = `Needs ${article(tier)} ${tier} pick or better`; }
    }
    this.hud.setPrompt(this.win.open || this.menu.open ? null : !inp.locked && !inp.uiMode ? 'Click to take control' : prompt);
  }

  /** The portal overlay. The crossing is the host's to time; the same test on this client's own position draws the veil. */
  private portalHud(dt: number): void {
    const p = this.player, id = this.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z));
    const kind = id === B.hollow_portal ? 1 : id === B.rift_portal ? 2 : 0, open = this.win.open;
    if (!kind) { this.portalArmed = true; if (this.portalT > 0) this.portalT = Math.max(0, this.portalT - dt * 2); }
    else if (this.portalArmed && !open) this.portalT = Math.min(1.6, this.portalT + dt);
    let a = this.portalA, gold = this.portalGold;
    if (!kind) { a = this.portalT / 1.6; gold = false; } else if (this.portalArmed && !open) { a = Math.min(1, this.portalT / 1.6); gold = kind === 2; }
    if (a !== this.portalA || gold !== this.portalGold) { this.portalA = a; this.portalGold = gold; this.hud.setPortal(a, gold); }
  }

  // ---- frame ----------------------------------------------------------------------------------------
  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const gap = now - this.last, dt = Math.min(0.1, gap / 1000);
    // a hidden tab draws no frames: what a frame does not count did not pass for the host either
    if (gap > 100) this.heldMs += gap - 100;
    this.last = now;
    void this.runFrame(dt);
  };
  /** Drive the game without requestAnimationFrame (automated tests, background tabs). */
  async pump(seconds: number): Promise<void> {
    const ch = new MessageChannel();
    const yieldNow = (): Promise<void> => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
    for (let t = 0; t < seconds; t += STEP) { await this.runFrame(STEP); this.last = performance.now(); await yieldNow(); }
  }
  /** One frame. Where this client drives the host's clock and a step has to wait (for storage, or for another thread), the
   *  frame ends when the step has: the promise returned says when, and a frame that starts meanwhile does nothing. */
  runFrame(dt: number): Promise<void> | void {
    if (this.busy) return this.busy;
    this.time += dt;
    const p = this.player, inp = this.input, sens = 0.0023 * this.cfg.settings.sens, w = this.world;
    if (inp.locked && !this.stats.dead) p.look(inp.dx, inp.dy, sens);
    const t0 = performance.now();
    this.session.pump();
    if (this.joined) {
      w.update(p.x, p.z, this.ready ? 1.5e6 : 8e6);
      // the subscription timers run in seconds: a look four times a second is plenty
      if ((this.frameN++ & 15) === 0) w.vox.tick(t0, p.x, p.z);
      w.vox.flush(t0);
    }
    if (!this.ready) this.checkReady();
    const t1 = performance.now();
    this.nTicks = 0; this.tickMs = 0;
    if (this.paused) { if (!this.pausedAt) this.pausedAt = t1; }
    else if (this.pausedAt) { this.heldMs += t1 - this.pausedAt; this.pausedAt = 0; }
    if (!this.paused) {
      this.acc += dt;
      const wait = this.runTicks();
      if (wait) return (this.busy = wait.then(() => { this.busy = null; this.endFrame(dt, t0, t1); }, (e) => { this.busy = null; console.error('a step failed', e); }));
    } else inp.endTick();   // no tick runs while paused, so presses made in the menu must not fire on resume
    this.endFrame(dt, t0, t1);
  }
  /** The whole steps this frame owes, at most five: each is the session pumped, the client's tick, one step of the host
   *  where this client drives it, and the session pumped again, so that what the step answered is in before the next tick.
   *  Null when all of them ran; else a promise for the rest. */
  private runTicks(): Promise<void> | null {
    const step = this.cfg.step, s = this.session;
    while (this.acc >= STEP && this.nTicks < 5) {
      const t0 = performance.now();
      if (this.nTicks) s.pump();
      this.tick(STEP); this.acc -= STEP;
      if (++this.nTicks === 1) this.input.endTick();
      const wait = step ? step() : null;
      if (wait) { this.tickMs += performance.now() - t0; return wait.then(() => { const t = performance.now(); this.afterStep(); this.tickMs += performance.now() - t; const more = this.runTicks(); if (more) return more; }); }
      this.afterStep();
      this.tickMs += performance.now() - t0;
    }
    if (this.nTicks === 5) this.acc = 0;
    return null;
  }
  private afterStep(): void {
    this.session.pump();
    this.ents.netTick(STEP);
  }
  private endFrame(dt: number, t0: number, t1: number): void {
    const p = this.player, inp = this.input;
    const t2 = performance.now();
    if (!this.paused) this.world.pumpEdits();
    const a = this.paused ? 1 : this.acc / STEP;
    p.applyCamera(this.gfx.camera, a, dt, this.cfg.settings.gfx.fov, this.time, this.cfg.settings.bob, this.cfg.settings.shake);
    this.interact.aim(this.blocks.reach(), inp.locked && !this.stats.dead);
    this.audio.lx = p.x; this.audio.ly = p.y + p.eye; this.audio.lz = p.z;
    this.updateEnv(dt);
    if (this.world.uploadsThisFrame > 0) this.gfx.shadowDirty = true;
    this.gfx.update(this.time, this.env, this.gfx.camera.position);
    this.world.setCull(this.gfx.camera.position.x, this.gfx.camera.position.z);
    if (!this.paused) this.particles.update(dt, this.world);
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
    // a step that had to wait is not time this thread worked: `tick` counts the ticks themselves
    pr.world = Math.max(pr.world, t1 - t0); pr.tick = Math.max(pr.tick, this.tickMs); pr.render = Math.max(pr.render, t3 - t2);
    if (this.debug.frame(dt)) { this.debug.set(this.debugLines()); pr.world = pr.tick = pr.render = 0; }
    inp.endFrame();
  }

  /** Behind the loading screen: when the place is meshed, tell the host; it lands the player and answers with the `tp` that puts it in play. */
  private checkReady(): void {
    const p = this.player, w = this.world, c = w.counts();
    if (this.loading) { (this.loading.querySelector('i') as HTMLElement).style.width = Math.min(100, (c.meshed / 49) * 100) + '%'; (this.loading.querySelector('.msg') as HTMLElement).textContent = this.loadMsg; }
    if (!this.joined || this.readySent === this.tpId || !w.areaMeshed(p.x, p.z, 3) || (this.cfg.det && c.waiting > 0)) return;
    this.readySent = this.tpId;
    this.session.send({ t: 'ready', tp: this.tpId });
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
    e.moonPhase = (Math.floor(this.clock) % 8) / 4 - 1; e.moonTint = moonTint(this.event);
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
      `view    ${w.renderDist} chunks   seed ${this.seedText}   ${p.onGround ? 'ground' : p.inWater ? 'water' : 'air'}${p.flying ? ' fly' : ''}${this.event.a ? '   event ' + this.event.a : ''}`,
    ];
  }
}
