// Game: owns every system and runs the fixed-step simulation plus the render loop.
import * as THREE from 'three';
import { GameAudio } from './audio/audio';
import { BUILD_MAX, CVOL, DAY_LENGTH, SEA, chunkKey } from './core/constants';
import { B, BLOCKS, T_DAMAGE, T_LAYER, T_LIQUID, T_OPAQUE, T_REPLACE, T_SOLID, T_SUPPORT } from './data/blocks';
import { BIOME, BIOMES } from './data/biomes';
import { DIMS } from './data/dims';
import { Item, ITEMS, TIERS, item, RARITY, rollModifier, matches } from './data/items';
import { LOOT } from './data/loot';
import { BOSSES } from './data/mobs';
import { SMELTS } from './data/recipes';
import { DropSystem } from './entities/drops';
import { Mob, MobSystem } from './entities/mobs';
import { ProjectileSystem } from './entities/projectiles';
import { Input } from './player/input';
import { Interact, InteractHost } from './player/interact';
import { RayHit } from './player/physics';
import { Player } from './player/player';
import { BoxBatch, Particles, makeItemMaterial } from './render/batches';
import { Env, Gfx } from './render/gfx';
import { Icons } from './render/icons';
import { ItemModels } from './render/itemModel';
import { EventSystem } from './systems/events';
import { Fluids } from './systems/fluids';
import { Inventory, Slot } from './systems/inventory';
import { NpcSystem } from './systems/npcs';
import { QuestSystem } from './systems/quests';
import type { SaveDB, WorldMeta } from './systems/save';
import { PlayerStats } from './systems/stats';
import { DebugOverlay } from './ui/debug';
import { Hud, el } from './ui/hud';
import { GameMenu, Settings } from './ui/menus';
import { Windows } from './ui/windows';
import { Climate, newCol } from './world/gen/climate';
import { locate } from './world/gen/structures';
import { WorkerPool } from './world/pool';
import { BlockEnt, Chunk, World } from './world/world';

const STEP = 1 / 60;
export interface GameConfig { meta: WorldMeta; db: SaveDB; settings: Settings; /** false when the browser blocks IndexedDB */ canSave?: boolean }
const STATIONS: Record<string, string> = { workbench: 'workbench', anvil: 'anvil', runeloom: 'runeloom', tinker: 'tinker' };
// Interaction prompts, built once so the per-tick prompt check allocates nothing.
const IS_NPC = (m: Mob): boolean => m.def.ai === 'npc';
const SUMMON_USE: string[] = [], ALTAR_OFFER: string[] = [], ALTAR_NEED: string[] = [], TRADE_PROMPT = new Map<string, string>();
for (const it of ITEMS.values()) if (it.use?.startsWith('summon')) {
  const n = +it.use.slice(6);
  SUMMON_USE[n] = it.use; ALTAR_OFFER[n] = `Right-click: offer the ${it.name}`; ALTAR_NEED[n] = `Needs ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}`;
}

export class Game implements InteractHost {
  readonly gfx: Gfx; readonly pool: WorkerPool; readonly world: World; readonly input: Input;
  readonly player = new Player(); readonly interact: Interact; readonly debug: DebugOverlay; readonly climate: Climate;
  readonly inv = new Inventory(); readonly stats = new PlayerStats(); readonly flags = new Set<string>();
  readonly particles = new Particles(); readonly boxes = new BoxBatch(); readonly audio = new GameAudio();
  readonly mobs: MobSystem; readonly proj: ProjectileSystem; readonly drops: DropSystem;
  readonly icons: Icons; readonly models: ItemModels; readonly hud: Hud; readonly win: Windows; readonly menu: GameMenu;
  readonly quests: QuestSystem; readonly events: EventSystem; readonly npcs: NpcSystem; readonly fluids: Fluids;
  time = 0; clock = 0.06; dim = 0; ready = false; paused = false;
  creative = false; creativeHidden = false; god = false;
  spawn: [number, number, number] | null = null;
  prof = { world: 0, tick: 0, render: 0 };
  private last = performance.now(); private acc = 0; private raf = 0; private keysReady = false;
  private env: Env = { time: 0, dim: 0, fogTint: [1, 1, 1], haze: 0, cave: 0, underwater: false, moonTint: null, moonPhase: 0, darkness: 0 };
  private loading: HTMLElement | null = null; private loadMsg = 'Raising the land';
  private atkCd = 0; private useCd = 0; private swing = 0; private equip = 0; private handKey = '?'; private hand: THREE.Mesh; private handLight = new THREE.Vector4(1, 0, 0, 0);
  private armGeo: THREE.BufferGeometry;
  private portalT = 0; private portalArmed = true; private portalReturn: Record<number, [number, number, number]> = {}; private arriving = -1;
  private blockT = 0; private saveT = 0; private popT = 0; private warnT = 0; private hazardT = 0; private recallT = 0; private safe: [number, number, number] = [0, 0, 0];
  private console: HTMLInputElement; private v = new THREE.Vector3(); private worldSpawn: [number, number] = [0, 0];
  private chestOpen: Chunk | null = null; private hudOn = true; private palettes: string[][] = [];
  private npcPromptT = 0; private npcPrompt: string | null = null; private conClosed = 0;
  /** Date.now() of the last successful save (0 = not yet). */
  lastSave = 0; private saveFailT = -1e9; private noSaveWarned = false;

  constructor(canvas: HTMLCanvasElement, readonly ui: HTMLElement, readonly cfg: GameConfig) {
    const meta = cfg.meta, d = meta.data;
    this.gfx = new Gfx(canvas);
    this.icons = new Icons(this.gfx.atlas); this.models = new ItemModels(this.gfx.atlas, this.icons);
    this.pool = new WorkerPool(Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2)));
    this.dim = d?.dim ?? 0;
    this.world = new World(this.pool, this.gfx.materials, meta.seed, this.dim);
    this.world.hasSky = DIMS[this.dim].hasSky;
    this.climate = new Climate(meta.seed);
    this.gfx.scene.add(this.world.group, this.boxes.mesh, this.particles.mesh);
    this.gfx.shadowCasters = this.world.group;
    this.input = new Input(canvas);
    this.interact = new Interact(this.gfx.scene, this.world, this.player);
    this.mobs = new MobSystem(this); this.proj = new ProjectileSystem(this); this.drops = new DropSystem(this);
    this.gfx.scene.add(this.drops.group);
    this.hud = new Hud(ui, this); this.win = new Windows(ui, this); this.menu = new GameMenu(ui, this);
    this.debug = new DebugOverlay(ui);
    this.quests = new QuestSystem(this); this.events = new EventSystem(this); this.npcs = new NpcSystem(this); this.fluids = new Fluids(this.world);

    // held-item view model
    const mat = makeItemMaterial(true); mat.side = THREE.DoubleSide;
    this.armGeo = new THREE.BoxGeometry(0.22, 0.22, 0.7);
    const n = this.armGeo.getAttribute('position').count, col = new Uint8Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = 224; col[i * 3 + 1] = 176; col[i * 3 + 2] = 136; }
    this.armGeo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
    this.hand = new THREE.Mesh(this.armGeo, mat);
    this.hand.onBeforeRender = (_r, _s, _c, _g, m) => { (m as THREE.ShaderMaterial).uniforms.uObj.value.copy(this.handLight); (m as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
    this.gfx.handScene.add(this.hand);

    this.loading = el('div', '#loading', ui);
    this.loading.innerHTML = '<h1>CAIRNLIGHT</h1><div class="bar"><i></i></div><div class="msg"></div>';
    this.console = el('input', '', ui); this.console.type = 'text';
    this.console.style.cssText = 'position:absolute;left:12px;bottom:150px;width:420px;display:none;pointer-events:auto;background:rgba(8,10,14,.85);color:#e9e4d6;border:1px solid #3b4254;padding:6px 8px;font:13px ui-monospace,monospace;outline:none;z-index:25';
    this.console.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const c = this.console.value.trim(); this.closeConsole(); if (c) this.toast(this.cheat(c.replace(/^\//, '')), '#8fd0ff'); }
      else if (e.key === 'Escape') this.closeConsole();
    };
    // clicking or tabbing away must not leave the console open with the game ignoring input
    this.console.onblur = () => { if (this.console.style.display !== 'none') { this.closeConsole(); this.conClosed = performance.now(); } };

    this.input.onKey = (code) => this.onKey(code);
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
      // Ctrl+W is next to the sprint keys: ask before closing mid-play (not with a menu open, not in automated ?quick runs)
      if (this.ready && this.input.locked && !this.stats.dead && !location.search.includes('quick')) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) void this.save(); });

    this.world.onBlockChange = (x, y, z, _old, now) => {
      if (!T_SOLID[now] || !T_OPAQUE[now]) { const up = this.world.getBlock(x, y + 1, z); if (T_SUPPORT[up]) this.breakNatural(x, y + 1, z); }
      if (T_REPLACE[now] && !T_LIQUID[now]) this.fluids.poke(x, y, z);
    };
    this.world.onChunkReady = (_c, fresh, ents) => {
      if (!fresh) return;
      for (const e of ents) this.world.setEnt(e.x, e.y, e.z, e.kind, e.kind === 'nest' ? { mob: e.data, t: 0 } : { loot: e.data, s: null });
    };
    this.world.onUnload = (c) => this.saveChunk(c);
    // Saved chunks hold raw block ids. Each save records the id->key table it was written with, so a
    // later build with a different block table can translate old chunks as they load.
    const keys = BLOCKS.map((q) => q.key);
    this.palettes = d?.palettes ?? [];
    if (!this.palettes.length || this.palettes[this.palettes.length - 1].join() !== keys.join()) this.palettes.push(keys);
    this.world.loader = async (cx, cz) => {
      const c = await cfg.db.getChunk(meta.id, this.dim, cx, cz, CVOL);
      const cur = this.palettes.length - 1;
      if (c && (c.pal ?? 0) !== cur) {
        const from = this.palettes[c.pal ?? 0] ?? keys, map = new Uint8Array(256);
        from.forEach((k, i) => { const id = keys.indexOf(k); map[i] = id < 0 ? 0 : id; });
        for (let i = 0; i < c.blocks.length; i++) c.blocks[i] = map[c.blocks[i]];
      }
      return c;
    };

    // restore
    if (d) {
      this.inv.load(d.inv); this.stats.load(d.stats); this.clock = d.clock ?? 0.06; this.spawn = d.spawn ?? null;
      for (const f of d.flags || []) this.flags.add(f);
      this.quests.index = d.quests ?? 0; this.events.load(d.events); this.npcs.load(d.npcs); this.portalReturn = d.portalReturn || {};
      this.player.teleport(d.player.x, d.player.y, d.player.z); this.player.yaw = d.player.yaw; this.player.pitch = d.player.pitch;
      this.worldSpawn = d.worldSpawn ?? this.findSpawn();
    } else {
      this.worldSpawn = this.findSpawn();
      this.player.teleport(this.worldSpawn[0] + 0.5, SEA + 60, this.worldSpawn[1] + 0.5);
      this.arriving = 0;
    }
    this.player.frozen = true;
    this.stats.recompute(this.inv);
    this.applySettings();
    void cfg.db.chunkList(meta.id, this.dim).then((l) => { this.world.savedKeys = new Set(l.map((c) => chunkKey(c[0], c[1]))); this.keysReady = true; });
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
  applySettings(): void {
    const s = this.cfg.settings;
    this.gfx.applySettings(s.gfx);
    if (this.world.renderDist !== s.gfx.renderDist) this.world.setRenderDist(s.gfx.renderDist);
    this.audio.setVolumes(s.sfx, s.music);
  }
  start(): void { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop(): void { cancelAnimationFrame(this.raf); this.pool.dispose(); }

  // ---- small services used across systems ----------------------------------------------
  isNight(): boolean { const t = this.clock % 1; return t > 0.52 && t < 0.98; }
  difficulty(): number { let n = 0; for (let i = 1; i <= 8; i++) if (this.flags.has('boss:' + i)) n++; return n; }
  toast(text: string, color?: string): void { if (text) this.hud.toast(text, color); }
  floater(x: number, y: number, z: number, text: string, color: string, big = false): void { this.hud.floater(x, y, z, text, color, big); }
  dropItem(it: Item): void {
    const p = this.player, d = p.dir(this.v);
    this.drops.spawn(p.x + d.x * 0.4, p.y + p.eye - 0.3, p.z + d.z * 0.4, it, d.x * 5, d.y * 5 + 1.5, d.z * 5, 1.2);
  }
  gainXp(n: number): void {
    const ups = this.stats.addXp(Math.round(n));
    if (!ups) return;
    this.stats.recompute(this.inv); this.stats.hp = this.stats.maxHp;
    this.hud.showBanner(`Level ${this.stats.level}`, '+2 attribute points · press E to spend', '#c8f58a');
    this.audio.play('levelup');
  }
  onPickup(key: string, n: number): void {
    const d = item(key);
    this.hud.toast(`+${n} ${d.name}`, RARITY[d.rarity].color);
    if (this.popT <= 0) { this.audio.play('pop', 0.7, 0.9 + Math.random() * 0.3); this.popT = 0.06; }
  }
  onCrafted(key: string, _n: number): void { this.flags.add('craft:' + key); }
  markEntDirty(e: BlockEnt): void { const c = this.world.chunkAt(e.x >> 4, e.z >> 4); if (c) c.modified = true; }
  markChestDirty(): void { if (this.chestOpen) this.chestOpen.modified = true; }
  private rollLoot(table: string, rnd: () => number = Math.random): Item[] {
    const t = LOOT[table];
    if (!t) return [];
    const out: Item[] = [], total = t.entries.reduce((s, e) => s + e[1], 0), rolls = t.rolls[0] + Math.floor(rnd() * (t.rolls[1] - t.rolls[0] + 1));
    for (let i = 0; i < rolls; i++) {
      let r = rnd() * total;
      for (const e of t.entries) { r -= e[1]; if (r <= 0) { if (ITEMS.has(e[0])) out.push({ k: e[0], n: e[2] + Math.floor(rnd() * (e[3] - e[2] + 1)), m: rollModifier(e[0], rnd, t.mod) }); break; } }
    }
    const coins = t.coins[0] + Math.floor(rnd() * (t.coins[1] - t.coins[0] + 1));
    if (coins) { this.inv.coins += coins; this.inv.touch(); this.toast(`+${coins} coins`, '#f2c14e'); }
    return out;
  }

  // ---- combat ---------------------------------------------------------------------------
  hurtPlayer(dmg: number, fx: number, fz: number, cause: string, from: Mob | null = null, knock = 6): void {
    const p = this.player, st = this.stats;
    if (this.god || this.creative || st.dead) return;
    const took = st.damage(dmg);
    if (took === 0) return;
    if (took < 0) { this.floater(p.x, p.y + 2, p.z, 'Dodged', '#9ad0ff'); return; }
    this.hud.flashHurt(); p.shake(Math.min(0.7, 0.25 + took / st.maxHp)); this.audio.play('hurt');
    const dx = p.x - fx, dz = p.z - fz, l = Math.hypot(dx, dz) || 1, kr = 1 - Math.min(0.9, st.d.knockRes);
    p.kbx += (dx / l) * knock * kr; p.kbz += (dz / l) * knock * kr;
    if (p.onGround && kr > 0.3) p.vy = 5;
    if (from && st.d.thorns > 0) this.mobs.hurt(from, took * st.d.thorns + 1, -dx, -dz, 2, false);
    if (st.dead) this.onDeath(cause);
  }
  private onDeath(cause: string): void {
    const lost = Math.floor(this.inv.coins * 0.15);
    this.inv.coins -= lost; this.inv.touch();
    this.audio.play('death'); this.win.close(true);
    for (const m of this.mobs.list) if (m.active && m.def.ai === 'minion') m.active = false;
    this.menu.death(cause === 'fall' ? 'The ground was farther than it looked' : cause === 'lava' ? 'Lava does not negotiate' : cause === 'void' ? 'There was nothing under you' : cause === 'hunger' ? 'Starved' : `Slain by ${cause}`, lost);
  }
  respawn(): void {
    const s = this.spawn, p = this.player;
    this.stats.respawn();
    if (this.dim !== 0) { this.travel(0, true); return; }
    if (s && BLOCKS[this.world.getBlock(s[0], s[1], s[2])].use === 'bed') p.teleport(s[0] + 0.5, s[1] + 0.6, s[2] + 0.5);
    else { p.teleport(this.worldSpawn[0] + 0.5, SEA + 60, this.worldSpawn[1] + 0.5); this.arriving = 0; this.ready = false; this.showLoading('Returning'); }
  }
  onMobKilled(m: Mob): void {
    const d = m.def, luck = 1 + this.stats.d.luck;
    this.gainXp(d.xp);
    const coins = Math.round((d.coins[0] + Math.random() * (d.coins[1] - d.coins[0])) * luck);
    if (coins > 0) { this.inv.coins += coins; this.inv.touch(); this.floater(m.x, m.y + m.h + 0.6, m.z, `+${coins}c`, '#f2c14e'); if (coins > 20) this.audio.play('coin'); }
    for (const [k, chance, a, b] of d.drops) {
      if (Math.random() > chance * (d.boss ? 1 : luck)) continue;
      this.drops.spawn(m.x, m.y + m.h * 0.5, m.z, { k, n: a + Math.floor(Math.random() * (b - a + 1)), m: rollModifier(k, Math.random, d.boss ? 0.7 : 0.4) });
    }
    this.events.onKill(m);
    if (d.boss) {
      this.flags.add('boss:' + d.boss.n);
      this.hud.showBanner(`${d.name} has fallen`, d.boss.n === 8 ? 'The first light is yours' : 'Check the guide for what this unlocks', '#ffe27a');
      this.audio.play('levelup'); this.player.shake(0.6);
      for (let i = 0; i < 120; i++) this.particles.spawn(m.x, m.y + m.h * 0.5, m.z, (Math.random() - 0.5) * 16, Math.random() * 14, (Math.random() - 0.5) * 16, 1.6, 0.24, d.parts[(Math.random() * d.parts.length) | 0].c, 1, 6);
      this.onBossGone(m, true);
    }
  }
  onBossGone(_m: Mob, _won: boolean): void { for (const q of this.mobs.list) if (q.active && q.event && !q.boss && this.events.active === null) q.active = false; this.proj.clear(); }

  // ---- InteractHost -----------------------------------------------------------------------
  reach(): number { return (this.creative ? 7 : 5) + this.stats.d.reach * 0.5; }
  private canHarvest(id: number): boolean {
    const b = BLOCKS[id], h = this.inv.held(), t = h ? item(h.k).tool : undefined;
    return b.power === 0 || (!!t && t.kind === b.tool && t.power >= b.power);
  }
  breakTime(id: number): number {
    const b = BLOCKS[id];
    if (this.creative) return 0;
    if (b.hard < 0) return Infinity;
    const h = this.inv.held(), t = h ? item(h.k).tool : undefined, p = this.player;
    let speed = t && t.kind === b.tool ? t.speed : 1;
    speed *= 1 + this.stats.d.mining;
    if (p.headInWater) speed /= 4;
    if (!p.onGround && !p.inWater) speed /= 2.5;
    return (b.hard * (this.canHarvest(id) ? 1.5 : 5)) / speed;
  }
  onDigTick(x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number): void {
    const b = BLOCKS[id], l = this.world.getLight(x + nx, y + ny, z + nz);
    this.swing = 1;
    this.audio.play('dig_' + b.sound, 0.7);
    for (let i = 0; i < 3; i++) this.particles.spawn(x + 0.5 + nx * 0.55 + (Math.random() - 0.5) * 0.5, y + 0.5 + ny * 0.55 + (Math.random() - 0.5) * 0.5, z + 0.5 + nz * 0.55 + (Math.random() - 0.5) * 0.5,
      nx * 1.5 + (Math.random() - 0.5) * 2, ny * 1.5 + Math.random() * 2, nz * 1.5 + (Math.random() - 0.5) * 2, 0.5, 0.12, this.tintOf(id), 0, 14, T_LAYER[id * 6], true, (l >> 4) / 15, (l & 15) / 15);
  }
  private tintOf(id: number): number { const t = BLOCKS[id].tint; return t === 1 ? 0x86c653 : t === 2 ? 0x6fb445 : t === 3 ? 0x3a84dc : 0xffffff; }
  private burst(x: number, y: number, z: number, id: number): void {
    const l = this.world.getLight(x, y, z), layer = T_LAYER[id * 6], tint = this.tintOf(id), glow = BLOCKS[id].emissive > 150 ? 0.7 : 0;
    for (let i = 0; i < 18; i++) this.particles.spawn(x + Math.random(), y + Math.random(), z + Math.random(), (Math.random() - 0.5) * 3.4, Math.random() * 4, (Math.random() - 0.5) * 3.4,
      0.5 + Math.random() * 0.4, 0.13, tint, glow, 16, layer, true, Math.max((l >> 4) / 15, 0.2), (l & 15) / 15);
  }
  /** Break a block as the world would (no tool check): pops plants, torches and the like. */
  private breakNatural(x: number, y: number, z: number): void {
    const id = this.world.getBlock(x, y, z);
    if (!id) return;
    this.world.setBlock(x, y, z, 0);
    for (const [k, c, a, b] of BLOCKS[id].drops) if (Math.random() < c) this.drops.spawn(x + 0.5, y + 0.3, z + 0.5, { k, n: a + Math.floor(Math.random() * (b - a + 1)) });
  }
  onBroken(x: number, y: number, z: number, id: number): void {
    const w = this.world, b = BLOCKS[id], harvest = this.canHarvest(id) && !this.creative;
    const e = w.getEnt(x, y, z);
    if (e) {
      const s: Slot[] = e.kind === 'crate' ? this.rollLoot(e.data.loot) : e.data.s || (e.data.loot ? this.rollLoot(e.data.loot) : []);
      for (const it of s) if (it) this.drops.spawn(x + 0.5, y + 0.5, z + 0.5, it);
      w.removeEnt(x, y, z);
    }
    if (b.use === 'guestbed') this.npcs.removeBed(x, y, z);
    if (b.door) { for (const dy of [-1, 1]) if (w.getBlock(x, y + dy, z) === id) w.setBlock(x, y + dy, z, 0); }
    w.setBlock(x, y, z, 0);
    this.burst(x, y, z, id);
    this.audio.play('break_' + b.sound, 0.9);
    this.stats.exhaustion += 0.02;
    this.flags.add('mine:' + b.key);
    if (harvest) for (const [k, c, lo, hi] of b.drops) if (Math.random() < c) this.drops.spawn(x + 0.5, y + 0.4, z + 0.5, { k, n: lo + Math.floor(Math.random() * (hi - lo + 1)) }, undefined, undefined, undefined, 0.25);
  }

  primary(pressed: boolean, held: boolean): boolean {
    if (!held || this.stats.dead) return false;
    const inv = this.inv, st = this.stats, p = this.player, it = inv.held(), d = it ? item(it.k) : null, wpn = d?.weapon, style = wpn?.style ?? 'melee';
    const dir = p.dir(this.v), ex = p.x, ey = p.y + p.eye, ez = p.z;
    const rate = (wpn?.rate ?? 2.2) * (1 + st.d.atkSpeed), crit = Math.random() < st.d.crit;
    if (style !== 'melee' && wpn) {
      if (this.atkCd > 0) return true;
      this.atkCd = 1 / rate;
      if (style === 'ranged') {
        const slot = inv.findTagged('arrow');
        if (slot < 0) { if (this.warnT <= 0) { this.toast('No arrows', '#ff9a8a'); this.audio.play('error', 0.5); this.warnT = 1.5; } return true; }
        const a = inv.slots[slot]!, extra = item(a.k).ammoDmg ?? 0;
        if (--a.n <= 0) inv.slots[slot] = null;
        inv.touch();
        this.proj.fire('arrow', ex + dir.x * 0.4, ey - 0.12 + dir.y * 0.4, ez + dir.z * 0.4, dir.x, dir.y + 0.02, dir.z, (wpn.dmg + extra) * st.dmgMult('ranged') * (crit ? 2 : 1), true, wpn.projSpeed, 'ranged', wpn.knock, crit);
        this.audio.play('bow'); this.swing = 1;
      } else {
        const cost = wpn.mana ?? 0;
        if (st.mana < cost) { if (this.warnT <= 0) { this.toast('Not enough mana', '#9ad0ff'); this.audio.play('error', 0.5); this.warnT = 1.5; } return true; }
        st.mana -= cost; this.swing = 1;
        if (style === 'magic') { this.proj.fire(wpn.proj!, ex + dir.x * 0.5, ey - 0.15 + dir.y * 0.5, ez + dir.z * 0.5, dir.x, dir.y, dir.z, wpn.dmg * st.dmgMult('magic') * (crit ? 2 : 1), true, wpn.projSpeed, 'magic', wpn.knock, crit); this.audio.play('magic'); }
        else {
          const mine = this.mobs.list.filter((m) => m.active && m.def.ai === 'minion');
          if (mine.length >= st.d.minions) mine.sort((a, b) => a.id - b.id)[0].active = false;
          const m = this.mobs.spawn(wpn.minion!, p.x + dir.x, p.y + 1.5, p.z + dir.z);
          if (m) { m.minionDmg = wpn.dmg; this.audio.play('summon'); for (let i = 0; i < 14; i++) this.particles.spawn(m.x, m.y + 0.3, m.z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.6, 0.12, m.def.parts[0].c, 1, 0); }
          this.atkCd = 0.6;
        }
      }
      return true;
    }
    const reach = (wpn?.reach ?? 3.3) + st.d.reach * 0.5, h = this.interact.hit;
    const r = this.mobs.rayHit(ex, ey, ez, dir.x, dir.y, dir.z, reach, 0.18, (m) => m.def.ai !== 'minion' && m.def.ai !== 'npc');
    if (r && (!h.hit || r.t <= h.dist + 0.2)) {
      if (this.atkCd <= 0) {
        this.atkCd = 1 / rate; this.swing = 1; this.audio.play('swing', 0.6);
        const dmg = (wpn?.dmg ?? 2) * st.dmgMult('melee') * (crit ? 2 : 1) * (0.92 + Math.random() * 0.16);
        this.mobs.hurt(r.m, dmg, dir.x, dir.z, wpn?.knock ?? 3, crit);
        p.shake(crit ? 0.22 : 0.12); st.exhaustion += 0.03;
      }
      return true;
    }
    if (pressed && this.atkCd <= 0) { this.swing = 1; this.atkCd = 0.25; if (!h.hit) this.audio.play('swing', 0.4); }
    return false;
  }

  secondary(hit: RayHit | null, pressed: boolean): boolean {
    const p = this.player, w = this.world, inv = this.inv, st = this.stats;
    if (st.dead) return false;
    const dir = p.dir(this.v);
    // talk to townsfolk
    if (pressed) {
      const r = this.mobs.rayHit(p.x, p.y + p.eye, p.z, dir.x, dir.y, dir.z, hit ? Math.min(4, hit.dist) : 4, 0.15, (m) => m.def.ai === 'npc');
      if (r) { const n = this.npcs.def(r.m.def.key); if (n) { r.m.talk = 6; this.audio.play('click'); this.win.show('shop', { shop: n }); return true; } }
    }
    const it = inv.held(), d = it ? item(it.k) : null;
    if (hit && pressed && !p.sneaking) {
      const use = BLOCKS[hit.id].use;
      if (use && this.useBlock(hit, use)) return true;
    }
    if (!it || !d) return false;
    if (d.block !== undefined && hit) return this.place(hit, d.block);
    if (d.use && hit && pressed) {
      if (d.use === 'door') return this.placeDoor(hit);
      if (d.use === 'gate1' || d.use === 'gate2') {
        const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
        if (hit.ny !== 1) { this.toast('Place the gate on the ground.', '#ff9a8a'); return true; }
        this.buildGate(d.use === 'gate1' ? 1 : 2, x, y, z, Math.abs(dir.z) > Math.abs(dir.x));
        inv.consumeHeld(); this.audio.play('portal'); return true;
      }
      if (d.use.startsWith('summon')) { this.toast('Use this at its altar. The guide points the way.', '#ffd9a0'); return true; }
    }
    if (!pressed || this.useCd > 0) return false;
    if (d.use === 'recall') {
      if (this.recallT > 0) { this.toast('The stone is still warm.', '#ff9a8a'); return true; }
      this.recallT = 30; this.audio.play('teleport');
      if (this.dim !== 0) this.travel(0, true); else this.respawnPoint();
      return true;
    }
    if (d.food || d.heal || d.restoreMana || d.buff) {
      if (d.heal && !d.food) { if (st.salveCd > 0) { if (this.warnT <= 0) { this.toast(`Salves need ${Math.ceil(st.salveCd)}s more`, '#ff9a8a'); this.warnT = 1; } return true; } st.salveCd = 9; }
      else if (d.food && st.hunger >= 20 && !d.heal && !d.restoreMana) return false;
      if (d.food) { st.hunger = Math.min(20, st.hunger + d.food); if (d.food >= 8) st.buffs.set('fed', 120); }
      if (d.heal) { st.heal(d.heal); this.floater(p.x + dir.x, p.y + 1.6, p.z + dir.z, '+' + d.heal, '#7fd66b'); }
      if (d.restoreMana) st.mana = Math.min(st.maxMana, st.mana + d.restoreMana);
      if (d.buff) st.buffs.set(d.buff[0], d.buff[1]);
      st.recompute(inv); inv.consumeHeld(); this.useCd = 0.35; this.swing = 1;
      this.audio.play(d.food ? 'eat' : 'drink');
      return true;
    }
    return false;
  }
  private respawnPoint(): void {
    const s = this.spawn, p = this.player;
    if (s && BLOCKS[this.world.getBlock(s[0], s[1], s[2])].use === 'bed') p.teleport(s[0] + 0.5, s[1] + 0.6, s[2] + 0.5);
    else { p.teleport(this.worldSpawn[0] + 0.5, SEA + 60, this.worldSpawn[1] + 0.5); this.arriving = 0; this.ready = false; this.showLoading('Returning'); }
  }

  private useBlock(hit: RayHit, use: string): boolean {
    const w = this.world, { x, y, z } = hit, p = this.player;
    if (STATIONS[use]) { this.audio.play('click'); this.win.show('station', { station: STATIONS[use] }); return true; }
    if (use.startsWith('forge')) {
      let e = w.getEnt(x, y, z);
      if (!e) e = w.setEnt(x, y, z, 'forge', { s: [null, null, null], burn: 0, burnMax: 0, prog: 0, need: 0, level: +use.slice(5), rev: 0 });
      if (e) { this.audio.play('click'); this.win.show('forge', { forge: e }); }
      return true;
    }
    if (use === 'chest') {
      let e = w.getEnt(x, y, z);
      if (!e) e = w.setEnt(x, y, z, 'chest', { s: null, loot: null });
      if (!e) return true;
      if (!e.data.s) { e.data.s = new Array(27).fill(null); if (e.data.loot) this.rollLoot(e.data.loot).forEach((it, i) => (e!.data.s[(i * 5 + 3) % 27] = it)); e.data.loot = null; }
      this.chestOpen = w.chunkAt(x >> 4, z >> 4); this.markChestDirty();
      this.audio.play('chest'); this.win.show('chest', { chest: e.data.s });
      return true;
    }
    if (use === 'crate') { this.onBroken(x, y, z, hit.id); return true; }
    if (use === 'bed') {
      this.spawn = [x, y, z];
      if (this.isNight() && this.dim === 0) {
        if (this.mobs.nearestHostile(p.x, p.y, p.z, 14) || this.events.active) this.toast('You cannot rest with enemies near.', '#ff9a8a');
        else { this.clock = Math.floor(this.clock) + 1.02; this.stats.buffs.set('dawn', 180); this.stats.recompute(this.inv); this.hud.showBanner('Morning', 'You wake rested', '#ffe9a8'); }
      } else this.toast('Spawn point set.', '#b8f070');
      return true;
    }
    if (use === 'guestbed') { this.toast(this.npcs.status(x, y, z), '#8fd0ff'); return true; }
    if (use === 'door') {
      const swap: Record<string, string> = { door_x: 'door_x_open', door_x_open: 'door_x', door_z: 'door_z_open', door_z_open: 'door_z' }, to = B[swap[BLOCKS[hit.id].key]];
      for (const dy of [-1, 1]) if (w.getBlock(x, y + dy, z) === hit.id) w.setBlock(x, y + dy, z, to, true);
      w.setBlock(x, y, z, to, true); this.audio.play('door');
      return true;
    }
    if (use === 'berries') {
      w.setBlock(x, y, z, B.berry_bush_empty); this.drops.spawn(x + 0.5, y + 0.6, z + 0.5, { k: 'berries', n: 1 + Math.floor(Math.random() * 3) }); this.audio.play('dig_leaf');
      return true;
    }
    if (use.startsWith('altar')) { this.trySummon(+use.slice(5), x, y, z); return true; }
    return false;
  }
  private trySummon(n: number, x: number, y: number, z: number): void {
    const boss = BOSSES[n - 1], it = this.inv.held();
    if (this.mobs.activeBoss()) return;
    if (!it || item(it.k).use !== 'summon' + n) { const need = [...ITEMS.values()].find((q) => q.use === 'summon' + n); this.toast(`The altar waits for a ${need?.name ?? 'summoning item'}.`, '#ffd9a0'); return; }
    if (n === 7 && !this.isNight()) { this.toast('The Hart only answers at night.', '#ffd9a0'); return; }
    if (this.events.active) this.events.end(false);
    this.inv.consumeHeld();
    const m = this.mobs.spawn(boss.key, x + 0.5, y + (boss.boss!.move === 'walk' ? 1.2 : 5), z + 6.5);
    if (!m) return;
    m.boss!.altar = [x, y, z];
    this.hud.showBanner(boss.name, boss.boss!.intro, '#ffb86a');
    this.audio.play('roar', 1, boss.voice ?? 0.3); this.audio.play('bell', 0.7); this.player.shake(0.5);
    for (let i = 0; i < 60; i++) this.particles.spawn(x + 0.5, y + 1.2, z + 0.5, (Math.random() - 0.5) * 10, Math.random() * 12, (Math.random() - 0.5) * 10, 1.2, 0.2, boss.parts[0].c, 1, 5);
  }

  private place(hit: RayHit, id: number): boolean {
    const w = this.world, p = this.player, b = BLOCKS[id];
    let x = hit.x, y = hit.y, z = hit.z;
    if (!T_REPLACE[hit.id]) { x += hit.nx; y += hit.ny; z += hit.nz; }
    if (y < 1 || y > BUILD_MAX || !T_REPLACE[w.getBlock(x, y, z)]) return false;
    if (b.solid && x + 1 > p.x - p.hw && x < p.x + p.hw && y + 1 > p.y && y < p.y + p.h && z + 1 > p.z - p.hw && z < p.z + p.hw) return false;
    if (b.support && !(T_SOLID[w.getBlock(x, y - 1, z)] && T_OPAQUE[w.getBlock(x, y - 1, z)])) return false;
    if (b.solid && this.mobs.list.some((m) => m.active && m.def.ai !== 'minion' && x + 1 > m.x - m.hw && x < m.x + m.hw && y + 1 > m.y && y < m.y + m.h && z + 1 > m.z - m.hw && z < m.z + m.hw)) return false;
    if (!w.setBlock(x, y, z, id)) return false;
    if (!this.creative) this.inv.consumeHeld();
    if (b.use === 'guestbed') this.npcs.addBed(x, y, z);
    this.flags.add('place:' + b.key);
    this.audio.play(b.sound === 'stone' || b.sound === 'metal' ? 'place' : 'dig_' + b.sound, 0.8, 0.9); this.swing = 1;
    return true;
  }
  private placeDoor(hit: RayHit): boolean {
    const w = this.world, d = this.player.dir(this.v), x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    if (!T_REPLACE[w.getBlock(x, y, z)] || !T_REPLACE[w.getBlock(x, y + 1, z)] || !T_SOLID[w.getBlock(x, y - 1, z)]) return false;
    const id = Math.abs(d.z) > Math.abs(d.x) ? B.door_x : B.door_z;
    w.setBlock(x, y, z, id); w.setBlock(x, y + 1, z, id);
    this.inv.consumeHeld(); this.audio.play('door'); this.flags.add('place:door');
    return true;
  }
  /** Raise a 4x5 gate: frame around a 2x3 sheet of portal. */
  private buildGate(kind: number, x: number, y: number, z: number, alongX: boolean): void {
    const w = this.world, frame = kind === 1 ? B.hollow_frame : B.rift_frame, portal = kind === 1 ? B.hollow_portal : B.rift_portal;
    for (let a = -1; a <= 2; a++) for (let h = 0; h <= 4; h++) {
      const edge = a === -1 || a === 2 || h === 0 || h === 4;
      w.setBlock(x + (alongX ? a : 0), y + h, z + (alongX ? 0 : a), edge ? frame : portal);
    }
  }

  // ---- dimension travel ---------------------------------------------------------------------
  private showLoading(msg: string): void {
    this.loadMsg = msg;
    if (!this.loading) { this.loading = el('div', '#loading', this.ui); this.loading.innerHTML = '<h1>CAIRNLIGHT</h1><div class="bar"><i></i></div><div class="msg"></div>'; }
  }
  travel(to: number, home = false): void {
    const p = this.player, cfg = this.cfg;
    if (to === this.dim) { this.respawnPoint(); return; }
    this.win.close(true);
    if (!home) this.portalReturn[this.dim] = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
    const px = Math.floor(p.x), pz = Math.floor(p.z);
    this.ready = false; this.keysReady = false; p.frozen = true; this.showLoading(to === 0 ? 'Returning to the Overworld' : `Crossing into ${DIMS[to].name}`);
    this.mobs.clear(); this.proj.clear(); this.drops.clear(); this.fluids.clear(); if (this.events.active) this.events.end(false);
    this.world.setDim(to, DIMS[to].hasSky);
    this.dim = to; this.portalT = 0; this.portalArmed = false; this.hud.setPortal(0, false);
    const ret = home ? null : this.portalReturn[to];
    if (home) { const s = this.spawn; if (s) p.teleport(s[0] + 0.5, s[1] + 0.6, s[2] + 0.5); else { p.teleport(this.worldSpawn[0] + 0.5, SEA + 60, this.worldSpawn[1] + 0.5); this.arriving = 0; } }
    else if (ret) p.teleport(ret[0] + 0.5, ret[1] + 0.1, ret[2] + 0.5);
    else { p.teleport(px + 0.5, 120, pz + 0.5); this.arriving = to; }
    if (to !== 0) this.flags.add('dim:' + to);
    void cfg.db.chunkList(cfg.meta.id, to).then((l) => { this.world.savedKeys = new Set(l.map((c) => chunkKey(c[0], c[1]))); this.keysReady = true; });
  }
  /** Find footing after arriving somewhere new, and raise a return gate if we came by portal. */
  private land(): void {
    const p = this.player, w = this.world, kind = this.arriving, x0 = Math.floor(p.x), z0 = Math.floor(p.z);
    this.arriving = -1;
    const free = (x: number, y: number, z: number): boolean => T_SOLID[w.getBlock(x, y - 1, z)] === 1 && T_OPAQUE[w.getBlock(x, y - 1, z)] === 1 && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z) && !w.getBlock(x, y + 3, z);
    let best: [number, number, number] | null = null;
    search: for (let r = 0; r <= 28; r += 2) for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = x0 + dx, z = z0 + dz;
      if (kind === 1) { for (let y = 60; y < 150; y++) if (free(x, y, z)) { best = [x, y, z]; break search; } }
      else { let y = w.topY(x, z); while (y > 2 && !T_SOLID[w.getBlock(x, y, z)]) y--; if (y > 4 && free(x, y + 1, z) && !T_LIQUID[w.getBlock(x, y, z)]) { best = [x, y + 1, z]; break search; } }
    }
    if (!best) { best = [x0, kind === 2 ? 130 : 100, z0]; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 3; dx++) { w.setBlock(x0 + dx, best[1] - 1, z0 + dz, kind === 2 ? B.riftstone : B.gloomstone); for (let k = 0; k < 5; k++) w.setBlock(x0 + dx, best[1] + k, z0 + dz, 0); } }
    if (kind > 0) {
      for (let a = -1; a <= 2; a++) for (let k = 0; k < 5; k++) for (let dz = -1; dz <= 1; dz++) if (dz !== 0 || k > 0) { const id = w.getBlock(best[0] + a, best[1] + k, best[2] + dz); if (id && dz !== 0) w.setBlock(best[0] + a, best[1] + k, best[2] + dz, 0); }
      this.buildGate(kind, best[0], best[1] - 1, best[2], true);
      for (let a = -1; a <= 2; a++) w.setBlock(best[0] + a, best[1] - 1, best[2] + 1, kind === 1 ? B.gloomstone : B.riftstone);
      p.teleport(best[0] + 0.5, best[1] + 0.05, best[2] + 1.5);
      this.portalReturn[kind] = [best[0], best[1], best[2]];
      this.hud.showBanner(DIMS[kind].name, kind === 1 ? 'No sky here. Bring light.' : 'Mind the edges', kind === 1 ? '#8af0d8' : '#c8d0ff');
    } else p.teleport(best[0] + 0.5, best[1] + 0.05, best[2] + 0.5);
  }

  // ---- input ----------------------------------------------------------------------------------
  private onKey(code: string): boolean {
    if (!this.ready || this.menu.dead) return false;
    if (code === 'Escape') { if (this.win.open) this.win.close(); else if (this.menu.open) this.menu.escape(); else this.menu.pause(); return true; }
    if (this.menu.open || document.activeElement === this.console) return false;
    if (code === 'KeyE') { if (this.win.open) this.win.close(); else this.win.show('inv'); return true; }
    if (code === 'KeyG') { if (this.win.open && this.win.mode === 'guide') this.win.close(); else this.win.show('guide'); return true; }
    if (code === 'F3') { this.debug.toggle(); return true; }
    if (code === 'F1') { this.hudOn = !this.hudOn; this.hud.setVisible(this.hudOn); return true; }
    if ((code === 'KeyT' || code === 'Slash') && !this.win.open) { this.console.style.display = 'block'; this.console.value = ''; this.input.uiMode = true; this.input.unlock(); setTimeout(() => this.console.focus(), 0); return true; }
    return false;
  }
  private closeConsole(): void { if (this.console.style.display === 'none') return; this.console.style.display = 'none'; this.console.blur(); this.input.uiMode = false; this.input.lock(); }

  /** Developer commands (also reachable from the T command line). */
  cheat(cmd: string): string {
    const a = cmd.trim().split(/\s+/), p = this.player;
    switch (a[0]) {
      case 'give': { if (!ITEMS.has(a[1])) return 'unknown item ' + a[1]; const left = this.inv.add({ k: a[1], n: +(a[2] ?? 1) }); return left ? 'inventory full' : `gave ${a[2] ?? 1} ${a[1]}`; }
      case 'time': this.clock = Math.floor(this.clock) + (a[1] === 'day' ? 0.15 : a[1] === 'night' ? 0.6 : a[1] === 'dusk' ? 0.49 : +a[1] || 0); return 'time set';
      case 'tp': p.teleport(+a[1], +a[2], +a[3]); return 'teleported';
      case 'fly': p.flying = !p.flying; return 'fly ' + p.flying;
      case 'creative': this.creative = !this.creative; p.flying = this.creative; return 'creative ' + this.creative;
      case 'god': this.god = !this.god; return 'god ' + this.god;
      case 'heal': this.stats.hp = this.stats.maxHp; this.stats.hunger = 20; this.stats.mana = this.stats.maxMana; return 'healed';
      case 'level': this.stats.level = +a[1] || 1; this.stats.points += 2 * (+a[1] || 1); this.stats.recompute(this.inv); return 'level set';
      case 'kill': for (const m of this.mobs.list) if (m.active && m.def.hostile) this.mobs.hurt(m, 1e6, 0, 0, 0, false); return 'cleared';
      case 'spawn': return this.mobs.spawn(a[1], p.x + 3, p.y + 1, p.z) ? 'spawned' : 'failed';
      case 'boss': { const b = BOSSES[(+a[1] || 1) - 1]; const m = this.mobs.spawn(b.key, p.x, p.y + 3, p.z + 8); if (m) m.boss!.altar = [p.x, p.y, p.z]; return b.name; }
      case 'flag': this.flags.add(a[1]); return 'flag set';
      case 'event': this.events.start(a[1] as 'raid'); return 'event started';
      case 'dim': this.travel(+a[1] || 0); return 'travelling';
      case 'gear': { const t = TIERS[+a[1] || 2]; for (const k of ['sword', 'pickaxe', 'axe', 'bow', 'staff', 'totem', 'melee_0', 'melee_1', 'melee_2']) if (ITEMS.has(`${t.key}_${k}`)) this.inv.add({ k: `${t.key}_${k}`, n: 1 }); this.inv.add({ k: 'arrow', n: 99 }); this.inv.add({ k: 'salve', n: 10 }); return t.name + ' kit'; }
      case 'locate': { const o = locate(a[1], p.x, p.z, this.cfg.meta.seed, this.dim === 0 ? this.climate : null); return o ? `${a[1]} at ${o[0]} ${o[1]} ${o[2]}` : 'none found'; }
      case 'seed': return String(this.cfg.meta.seed);
      default: return 'commands: give time tp fly creative god heal level kill spawn boss flag event dim gear locate';
    }
  }

  // ---- simulation ----------------------------------------------------------------------------------
  private tick(dt: number): void {
    const p = this.player, inp = this.input, inv = this.inv, st = this.stats, w = this.world;
    if (!this.ready) return;
    for (let i = 0; i < 9; i++) if (inp.hit('Digit' + (i + 1))) inv.sel = i;
    if (inp.wheel) inv.sel = (inv.sel + Math.sign(inp.wheel) + 9) % 9;
    if (inp.hit('KeyQ')) { const h = inv.held(); if (h) { const n = inp.down('ControlLeft') ? h.n : 1; this.dropItem({ k: h.k, n, m: h.m }); inv.consumeHeld(n); } }
    st.sync(inv);
    p.moveMult = (1 + st.d.speed) * (p.inWater ? 1 + st.d.swim : 1); p.jumpMult = Math.sqrt(1 + st.d.jump); p.extraJumps = st.d.extraJump;
    p.frozen = st.dead || this.arriving >= 0;
    p.tick(dt, inp, w, this.time);
    if (this.atkCd > 0) this.atkCd -= dt; if (this.useCd > 0) this.useCd -= dt; if (this.popT > 0) this.popT -= dt; if (this.warnT > 0) this.warnT -= dt; if (this.recallT > 0) this.recallT -= dt;

    // landing, footsteps, hazards
    if (p.landed > 0) {
      const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
      if (p.landed > 1.2) this.audio.play('step_' + (BLOCKS[below]?.sound ?? 'stone'), Math.min(1, p.landed * 0.25));
      if (p.landed > 3.6 && !st.d.noFall && !this.creative) { st.hurtT = 0; const took = st.damage((p.landed - 3) * 5.5, true); if (took > 0) { this.hud.flashHurt(); this.audio.play('hurt'); p.shake(0.4); if (st.dead) this.onDeath('fall'); } }
    }
    if (p.onGround) { this.safe[0] = p.x; this.safe[1] = p.y; this.safe[2] = p.z; }
    if (p.stepAccum > (p.sprinting ? 2.5 : 2.1)) { p.stepAccum = 0; const below = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); if (below) this.audio.play('step_' + BLOCKS[below].sound, p.sneaking ? 0.25 : 0.6); }
    this.hazardT -= dt;
    if (this.hazardT <= 0) {
      this.hazardT = 0.5;
      if (p.inLava && !this.creative && !this.god) { st.hurtT = 0; if (st.damage(8, true) > 0) { this.hud.flashHurt(); this.audio.play('fizz'); if (st.dead) this.onDeath('lava'); } }
      else for (let dy = 0; dy < 2; dy++) for (const [dx, dz] of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36], [0, 0]]) {
        const id = w.getBlock(Math.floor(p.x + dx), Math.floor(p.y + dy * 0.9 - (dx || dz ? 0 : 0.1)), Math.floor(p.z + dz));
        if (T_DAMAGE[id] && !T_LIQUID[id]) { this.hurtPlayer(T_DAMAGE[id] * 3, Math.floor(p.x + dx) + 0.5, Math.floor(p.z + dz) + 0.5, BLOCKS[id].name, null, 3); dy = 2; break; }
      }
      if (p.headInWater !== this.env.underwater && this.ready) this.audio.play('splash', 0.5);
      if (st.hunger <= 0 && st.hp <= 5 && !st.dead && Math.random() < 0.1) { st.hurtT = 0; st.damage(6, true); if (st.dead) this.onDeath('hunger'); }
    }
    if (p.y < (this.dim === 2 ? 20 : -16) && !st.dead) {
      if (this.dim === 2 && !this.creative) { st.hurtT = 0; st.damage(st.maxHp * 0.35, true); this.hud.flashHurt(); this.audio.play('teleport'); if (st.dead) this.onDeath('void'); else { p.teleport(this.safe[0], this.safe[1] + 0.2, this.safe[2]); this.toast('The Rift throws you back.', '#c8d0ff'); } }
      else p.teleport(p.x, 220, p.z);
    }

    this.interact.tick(dt, inp, this, inp.locked && !st.dead);
    st.tick(dt, inv, p.sprinting);
    this.mobs.tick(dt); this.proj.tick(dt); this.drops.tick(dt);
    this.blockT -= dt; if (this.blockT <= 0) { this.blockT = 0.25; this.tickBlocks(0.25); }
    this.tickPortal(dt); this.fluids.tick(dt);
    this.events.tick(dt); this.npcs.tick(dt); this.quests.tick(dt);
    this.clock += dt / DAY_LENGTH;
    this.saveT += dt; if (this.saveT > 30) { this.saveT = 0; void this.save(); }

    // prompts
    const h = this.interact.hit;
    let prompt: string | null = null;
    // townsfolk first, as secondary() tries them before blocks; the ray is cheap but only needs checking a few times a second
    if (--this.npcPromptT <= 0) {
      this.npcPromptT = 6;
      const d = p.dir(this.v), r = this.mobs.rayHit(p.x, p.y + p.eye, p.z, d.x, d.y, d.z, h.hit ? Math.min(4, h.dist) : 4, 0.15, IS_NPC);
      this.npcPrompt = null;
      if (r && this.npcs.def(r.m.def.key)) {
        let t = TRADE_PROMPT.get(r.m.def.key);
        if (!t) { t = `Right-click: trade with ${r.m.def.name}`; TRADE_PROMPT.set(r.m.def.key, t); }
        this.npcPrompt = t;
      }
    }
    if (this.npcPrompt) prompt = this.npcPrompt;
    else if (h.hit && h.dist < this.reach()) {
      const u = BLOCKS[h.id].use;
      if (u && u.startsWith('altar')) { const n = +u.slice(5), held = inv.held(); prompt = this.mobs.activeBoss() ? null : held && item(held.k).use === SUMMON_USE[n] ? (n === 7 && !this.isNight() ? 'Answers only at night' : ALTAR_OFFER[n]) : ALTAR_NEED[n]; }
      else if (u) prompt = u === 'bed' ? 'Right-click: rest / set spawn' : u === 'guestbed' ? 'Right-click: check this room' : u === 'berries' ? 'Right-click: pick berries' : u === 'nest' ? null : 'Right-click: open';
      else if (!this.canHarvest(h.id) && BLOCKS[h.id].hard >= 0) prompt = `Needs a ${TIERS[Math.max(0, BLOCKS[h.id].power - 1)].name} pickaxe or better`;
    }
    this.hud.setPrompt(this.win.open || this.menu.open ? null : !inp.locked && !inp.uiMode ? 'Click to take control' : prompt);
  }

  private tickBlocks(dt: number): void {
    const w = this.world, p = this.player, cx = Math.floor(p.x) >> 4, cz = Math.floor(p.z) >> 4;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const c = w.chunkAt(cx + dx, cz + dz);
      if (!c || !c.ents.size) continue;
      for (const e of c.ents.values()) {
        if (e.kind === 'forge') this.tickForge(e, c, dt);
        else if (e.kind === 'nest') {
          const d = e.data; d.t = (d.t ?? 0) - dt;
          const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
          if (d.t <= 0 && dist < 18 && dist > 3) {
            d.t = 7;
            if (this.mobs.count((m) => m.def.key === d.mob && Math.hypot(m.x - e.x, m.z - e.z) < 14) < 3) {
              const m = this.mobs.spawn(d.mob, e.x + 0.5 + (Math.random() - 0.5) * 3, e.y + 1.1, e.z + 0.5 + (Math.random() - 0.5) * 3);
              if (m) for (let i = 0; i < 14; i++) this.particles.spawn(e.x + 0.5, e.y + 1, e.z + 0.5, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.6, 0.12, 0xff6a5a, 1, 0);
            }
          }
        }
      }
    }
    // random ticks: berry bushes regrow
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(p.x + (Math.random() - 0.5) * 64), z = Math.floor(p.z + (Math.random() - 0.5) * 64), y = Math.floor(p.y + (Math.random() - 0.5) * 24);
      if (w.getBlock(x, y, z) === B.berry_bush_empty && Math.random() < 0.02) w.setBlock(x, y, z, B.berry_bush);
    }
  }
  private tickForge(e: BlockEnt, c: Chunk, dt: number): void {
    const d = e.data, s = d.s as Slot[], w = this.world;
    const inp = s[0], r = inp ? SMELTS.find((q) => matches(q.in, inp.k) && q.forge <= d.level) : undefined;
    const out = s[2], room = !!r && (!out || (out.k === r.out && out.n + r.n <= item(r.out).stack));
    const was = d.burn > 0;
    if (d.burn > 0) d.burn -= dt;
    if (r && room) {
      if (d.burn <= 0 && s[1] && item(s[1].k).fuel) { d.burn = d.burnMax = item(s[1].k).fuel!; if (--s[1].n <= 0) s[1] = null; d.rev++; c.modified = true; }
      if (d.burn > 0) {
        d.need = r.time / (1 + (d.level - r.forge) * 0.6); d.prog += dt;
        if (d.prog >= d.need) {
          d.prog = 0;
          if (--inp!.n <= 0) s[0] = null;
          if (out) out.n += r.n; else s[2] = { k: r.out, n: r.n };
          d.rev++; c.modified = true; this.flags.add('smelt:' + r.out);
          if (Math.hypot(e.x - this.player.x, e.z - this.player.z) < 12) this.audio.play('fizz', 0.4, 1, [e.x, e.y, e.z]);
        }
      } else d.prog = Math.max(0, d.prog - dt * 2);
    } else { d.prog = 0; d.need = 0; }
    const now = d.burn > 0, id = w.getBlock(e.x, e.y, e.z);
    if (was !== now && (id === B.furnace || id === B.furnace_lit)) w.setBlock(e.x, e.y, e.z, now ? B.furnace_lit : B.furnace, true);
    if (now && Math.random() < 0.3) this.particles.spawn(e.x + 0.5 + (Math.random() - 0.5) * 0.4, e.y + 1.05, e.z + 0.5 + (Math.random() - 0.5) * 0.4, 0, 0.8, 0, 1.2, 0.1, 0x8a8a92, 0, -0.4);
  }
  private tickPortal(dt: number): void {
    const p = this.player, id = this.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z));
    const kind = id === B.hollow_portal ? 1 : id === B.rift_portal ? 2 : 0;
    if (!kind) { this.portalArmed = true; if (this.portalT > 0) { this.portalT = Math.max(0, this.portalT - dt * 2); this.hud.setPortal(this.portalT / 1.6, false); } return; }
    if (!this.portalArmed) return;
    if (this.portalT === 0) this.audio.play('portal');
    this.portalT += dt; this.hud.setPortal(Math.min(1, this.portalT / 1.6), kind === 2);
    if (this.portalT >= 1.6) this.travel(this.dim === kind ? 0 : kind);
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
    if (this.keysReady) this.world.update(p.x, p.z, 3);
    if (!this.ready) this.checkReady();
    const t1 = performance.now();
    if (!this.paused) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.tick(STEP); this.acc -= STEP; n++; if (n === 1) inp.endTick(); }
      if (n === 5) this.acc = 0;
    }
    const t2 = performance.now(), a = this.paused ? 1 : this.acc / STEP;
    p.applyCamera(this.gfx.camera, a, dt, this.cfg.settings.gfx.fov, this.time, this.cfg.settings.bob);
    this.audio.lx = p.x; this.audio.ly = p.y + p.eye; this.audio.lz = p.z;
    this.updateEnv(dt);
    this.gfx.update(this.time, this.env, this.gfx.camera.position);
    if (!this.paused) this.particles.update(dt, this.world);
    this.boxes.begin(); this.mobs.render(this.boxes, a, this.time); this.proj.render(this.boxes, a); this.boxes.end();
    this.updateHand(dt);
    this.gfx.flash = 0;
    this.gfx.render(this.ready && !this.stats.dead && this.hudOn);
    if (this.win.open) this.win.refresh();
    this.hud.update(dt);
    this.audio.update();
    const t3 = performance.now(), pr = this.prof;
    pr.world = Math.max(pr.world, t1 - t0); pr.tick = Math.max(pr.tick, t2 - t1); pr.render = Math.max(pr.render, t3 - t2);
    if (this.debug.frame(dt)) { this.debug.set(this.debugLines()); pr.world = pr.tick = pr.render = 0; }
    inp.endFrame();
  }

  private checkReady(): void {
    const p = this.player, w = this.world, c = w.counts();
    if (this.loading) { (this.loading.querySelector('i') as HTMLElement).style.width = Math.min(100, (c.meshed / 49) * 100) + '%'; (this.loading.querySelector('.msg') as HTMLElement).textContent = this.loadMsg; }
    if (!this.keysReady || !w.areaMeshed(p.x, p.z, 3)) return;
    if (this.arriving >= 0) this.land();
    p.frozen = false; this.ready = true; this.portalArmed = false;
    if (this.cfg.canSave === false && !this.noSaveWarned) { this.noSaveWarned = true; this.hud.showBanner('Saving is unavailable', 'This browser is blocking storage. Progress is lost when the tab closes.', '#ff9a8a'); }
    const l = this.loading; this.loading = null;
    if (l) { const rm = (): void => l.remove(); l.classList.add('out'); l.addEventListener('transitionend', rm, { once: true }); setTimeout(rm, 700); }
    if (!this.cfg.meta.data && this.dim === 0 && !this.flags.has('started')) {
      this.flags.add('started');
      this.hud.showBanner(this.cfg.meta.name, 'Click to look around · E for inventory · G for the guide', '#ffe9a8');
    }
  }

  private updateEnv(dt: number): void {
    const p = this.player, e = this.env, w = this.world;
    const x = Math.floor(p.x), y = Math.floor(p.y + p.eye), z = Math.floor(p.z);
    const bio = BIOMES[w.biomeAt(x, z)] ?? BIOMES[0], k = Math.min(1, dt * 0.8);
    for (let i = 0; i < 3; i++) e.fogTint[i] += (bio.fog[i] - e.fogTint[i]) * k;
    e.haze += (bio.haze - e.haze) * k;
    const sky = w.getLight(x, y, z) >> 4;
    const caveT = DIMS[this.dim].hasSky && sky < 5 && y < w.topY(x, z) - 4 ? 1 : 0;
    e.cave += (caveT - e.cave) * Math.min(1, dt * 1.2);
    e.underwater = p.headInWater; e.time = this.clock % 1; e.dim = this.dim;
    e.moonPhase = (Math.floor(this.clock) % 8) / 4 - 1; e.moonTint = this.events.moonTint();
    const boss = this.mobs.activeBoss();
    this.audio.setMood(!this.ready ? 'none' : boss ? 'boss' : this.dim === 1 ? 'hollows' : this.dim === 2 ? 'rift' : e.cave > 0.5 ? 'cave' : this.isNight() ? 'night' : 'day');
  }

  private updateHand(dt: number): void {
    const inv = this.inv, h = inv.held(), key = h ? h.k : '', p = this.player, hand = this.hand;
    if (key !== this.handKey) { this.handKey = key; this.equip = 1; hand.geometry = key ? this.models.get(key) : this.armGeo; this.stats.recompute(inv); }
    this.equip = Math.max(0, this.equip - dt * 5); this.swing = Math.max(0, this.swing - dt * 4.2);
    const s = Math.sin((1 - this.swing) * Math.PI) * (this.swing > 0 ? 1 : 0), hs = Math.hypot(p.vx, p.vz), bob = p.onGround ? Math.min(1, hs / 4.3) : 0;
    const bx = Math.cos(p.walkDist * 1.9) * 0.02 * bob, by = -Math.abs(Math.sin(p.walkDist * 1.9)) * 0.025 * bob;
    const cube = key ? this.models.isCube(key) : false, d = key ? item(key) : null, tool = !!d && (!!d.tool || !!d.weapon);
    if (!key) { hand.scale.set(0.5, 0.5, 0.5); hand.position.set(0.42 + bx, -0.36 + by - this.equip * 0.4 - s * 0.08, -0.62 - s * 0.2); hand.rotation.set(0.42 - s * 0.9, -0.25 + s * 0.4, 0.1); }
    else if (cube) { hand.scale.setScalar(0.15); hand.position.set(0.36 + bx - s * 0.1, -0.24 + by - this.equip * 0.4 - s * 0.1, -0.6 - s * 0.14); hand.rotation.set(0.14 - s * 0.7, 0.72, 0.04); }
    else { hand.scale.setScalar(tool ? 0.27 : 0.2); hand.position.set(0.36 + bx - s * 0.16, -0.2 + by - this.equip * 0.4 - s * 0.14, -0.6 - s * 0.12); hand.rotation.set(-s * 1.25 + (tool ? 0 : 0.1), -1.25 + s * 0.3, tool ? 0.28 - s * 0.5 : 0); }
    const l = this.world.getLight(Math.floor(p.x), Math.floor(p.y + p.eye), Math.floor(p.z));
    this.handLight.set((l >> 4) / 15, Math.max((l & 15) / 15, d?.block !== undefined && BLOCKS[d.block].light ? 0.9 : 0), 0, d?.block !== undefined && BLOCKS[d.block].emissive > 100 ? 0.5 : 0);
  }

  // ---- persistence -------------------------------------------------------------------------------------
  private saveChunk(c: Chunk): void {
    if (!c.blocks || !c.biomes) return;
    this.cfg.db.putChunk(this.cfg.meta.id, this.dim, c.cx, c.cz, { blocks: c.blocks, biomes: c.biomes, hasEmit: c.hasEmit, ents: [...c.ents.values()], pal: this.palettes.length - 1 });
    this.world.savedKeys.add(c.key); c.modified = false;
  }
  async save(): Promise<void> {
    if (!this.ready && !this.cfg.meta.data) return;
    const p = this.player, m = this.cfg.meta;
    m.played = Date.now();
    m.data = { player: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }, dim: this.dim, clock: this.clock, inv: this.inv.serialize(), stats: this.stats.serialize(), flags: [...this.flags],
      spawn: this.spawn, quests: this.quests.index, events: this.events.serialize(), npcs: this.npcs.serialize(), portalReturn: this.portalReturn, worldSpawn: this.worldSpawn, palettes: this.palettes };
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
    const facing = ['south (-z)', 'west (-x)', 'north (+z)', 'east (+x)'][((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4];
    const tod = ((this.clock % 1) * 24 + 6) % 24;
    return [
      `chunks  ${c.meshed} meshed / ${c.loaded} loaded / ${c.waiting} waiting   workers ${this.pool.busy}/${this.pool.size}   mesh ${w.meshMs.toFixed(1)} ms`,
      `draw    ${info.render.calls} calls   ${(info.render.triangles / 1000).toFixed(0)}k tris   ${info.memory.geometries} geometries`,
      `cpu     chunks ${this.prof.world.toFixed(1)} ms   sim ${this.prof.tick.toFixed(1)} ms   draw ${this.prof.render.toFixed(1)} ms (worst)`,
      `pos     ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}   chunk ${x >> 4} ${z >> 4}   facing ${facing}`,
      `world   ${DIMS[this.dim].name}   ${BIOMES[w.biomeAt(x, z)]?.name ?? '?'}   light sky ${l >> 4} block ${l & 15}   day ${Math.floor(this.clock)} ${Math.floor(tod)}:${String(Math.floor((tod % 1) * 60)).padStart(2, '0')}`,
      `ents    ${this.mobs.count(() => true)} creatures   ${this.proj.alive} projectiles   ${this.drops.alive} drops   ${this.particles.alive} particles   boxes ${this.boxes.count}`,
      `view    ${w.renderDist} chunks   seed ${this.cfg.meta.seedText}   ${p.onGround ? 'ground' : p.inWater ? 'water' : 'air'}${p.flying ? ' fly' : ''}${this.events.active ? '   event ' + this.events.active : ''}`,
    ];
  }
}
