// World events: night raids, the recurring Hollow Moon, and Ashen Host invasions that scale
// with how many bosses have fallen.
import { T_LIQUID, T_SOLID } from '../data/blocks';
import type { Mob } from '../entities/mobs';
import type { Game } from '../game';

export class EventSystem {
  active: 'raid' | 'moon' | 'ashen' | null = null;
  private kills = 0; private goal = 0; private spawnT = 0; private lastPhase = -1; lastAshen = -10;
  constructor(private g: Game) {}

  label(): string {
    switch (this.active) {
      case 'raid': return `Night raid  ${this.kills} / ${this.goal}`;
      case 'ashen': return `The Ashen Host  ${this.kills} / ${this.goal}`;
      case 'moon': return 'The Hollow Moon is risen';
      default: return '';
    }
  }
  progress(): number {
    if (this.active === 'moon') { const t = this.g.clock % 1; return 1 - Math.max(0, Math.min(1, (t - 0.5) / 0.5)); }
    return this.goal ? this.kills / this.goal : 0;
  }
  moonTint(): [number, number, number] | null { return this.active === 'moon' ? [1.0, 0.42, 0.78] : null; }

  start(kind: 'raid' | 'moon' | 'ashen'): void {
    const g = this.g, diff = g.difficulty();
    this.active = kind; this.kills = 0; this.spawnT = 3;
    if (kind === 'raid') { this.goal = 10 + diff * 3; g.hud.showBanner('A raid gathers in the dark', 'Hold until dawn or break them', '#ff9a8a'); g.audio.play('horn'); g.mobs.pressure = 1; }
    else if (kind === 'ashen') { this.goal = 18 + diff * 6; g.hud.showBanner('The Ashen Host marches', 'Defeat them to break the invasion', '#ffb86a'); g.audio.play('horn'); g.mobs.pressure = 1; this.lastAshen = Math.floor(g.clock); }
    else { g.hud.showBanner('The Hollow Moon rises', 'Strange things walk tonight', '#ff8ad0'); g.audio.play('bell'); g.mobs.pressure = 0.8; }
  }
  end(won: boolean): void {
    const g = this.g, kind = this.active;
    if (!kind) return;
    this.active = null; g.mobs.pressure = 0;
    if (kind === 'moon') { g.hud.showBanner('The moon sets', '', '#c8d0e8'); return; }
    if (won) {
      const coins = (kind === 'ashen' ? 60 : 25) * (1 + g.difficulty());
      g.inv.coins += coins; g.inv.touch(); g.gainXp(40 + g.difficulty() * 30);
      g.hud.showBanner(kind === 'ashen' ? 'The Ashen Host is broken' : 'The raid is broken', `+${coins} coins`, '#b8f070');
      g.audio.play('levelup');
      if (kind === 'ashen') { g.flags.add('event:ashen'); const left = g.inv.add({ k: 'ash_token', n: 4 + g.difficulty() * 2 }); if (left) g.dropItem({ k: 'ash_token', n: left }); }
      g.flags.add('event:' + kind);
    } else g.hud.showBanner(kind === 'raid' ? 'Dawn scatters the raid' : 'The Host withdraws', '', '#c8d0e8');
    for (const m of g.mobs.list) if (m.active && m.event && !m.boss) m.active = false;
  }
  onKill(m: Mob): void {
    if (!this.active || this.active === 'moon' || !m.event) return;
    this.kills++;
    if (this.kills >= this.goal) this.end(true);
  }

  tick(dt: number): void {
    const g = this.g, t = g.clock % 1, day = Math.floor(g.clock);
    if (g.dim !== 0) { if (this.active) this.end(false); this.lastPhase = t < 0.5 ? 0 : 1; return; }
    const phase = t < 0.5 ? 0 : 1;
    if (this.lastPhase >= 0 && phase !== this.lastPhase && !g.mobs.activeBoss()) {
      if (phase === 1) {
        // dusk
        if (this.active === 'ashen') this.end(false);
        if (day % 8 === 7 && g.flags.has('boss:3')) this.start('moon');
        else if ((g.flags.has('boss:1') || g.npcs.count() >= 2) && Math.random() < 0.22) this.start('raid');
      } else {
        // dawn
        if (this.active === 'raid' || this.active === 'moon') this.end(false);
        if (g.flags.has('boss:2') && day - this.lastAshen >= 3 && Math.random() < 0.2) this.start('ashen');
      }
    }
    this.lastPhase = phase;
    if (this.active !== 'raid' && this.active !== 'ashen') return;
    this.spawnT -= dt;
    if (this.spawnT > 0 || g.mobs.count((m) => m.event) >= 8 + g.difficulty()) return;
    this.spawnT = 4.5;
    const p = g.player, w = g.world, diff = g.difficulty();
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = 18 + Math.random() * 10, x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r);
      let y = w.topY(x, z);
      while (y > 1 && !T_SOLID[w.getBlock(x, y, z)]) y--;
      if (y < 2 || T_LIQUID[w.getBlock(x, y + 1, z)]) continue;
      const roll = Math.random();
      const key = this.active === 'raid' ? (roll < 0.6 ? 'gloomshade' : roll < 0.85 ? 'thornling' : diff >= 2 ? 'ashen_raider' : 'gloomshade')
        : roll < 0.55 ? 'ashen_raider' : roll < 0.85 ? 'ashen_hexer' : diff >= 3 || this.kills > this.goal * 0.5 ? 'siege_brute' : 'ashen_raider';
      const m = g.mobs.spawn(key, x + 0.5, y + 1.05, z + 0.5);
      if (m) { m.event = true; m.dmgMul = 1 + diff * 0.45; m.hp = m.maxHp = Math.round(m.def.hp * (1 + diff * 0.7)); }
    }
  }
  serialize(): unknown { return { a: this.active, k: this.kills, g: this.goal, l: this.lastAshen }; }
  load(d: any): void { if (!d) return; this.active = d.a ?? null; this.kills = d.k ?? 0; this.goal = d.g ?? 0; this.lastAshen = d.l ?? -10; if (this.active) this.g.mobs.pressure = 1; }
}
