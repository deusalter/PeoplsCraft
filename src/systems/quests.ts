// Tracks progress through the guide and tells the HUD what to show next.
import { DIM_NAMES } from '../core/constants';
import { QUESTS } from '../data/quests';
import type { Game } from '../game';
import { locate, structDim } from '../world/gen/structures';

export class QuestSystem {
  index = 0;
  private t = 0; private where = ''; private whereT = 0;
  constructor(private g: Game) {}

  private done(i: number): boolean {
    const q = QUESTS[i], g = this.g;
    if (q.have) return g.inv.count(q.have[0]) >= q.have[1] || g.flags.has('had:' + q.key);
    if (q.flag) return g.flags.has(q.flag);
    if (q.level) return g.stats.level >= q.level;
    return false;
  }
  tick(dt: number): void {
    this.t -= dt; this.whereT -= dt;
    if (this.t > 0) return;
    this.t = 0.5;
    const g = this.g;
    while (this.index < QUESTS.length - 1 && this.done(this.index)) {
      const q = QUESTS[this.index];
      g.flags.add('had:' + q.key);
      this.index++; this.whereT = 0;
      const xp = 15 + this.index * 6;
      g.hud.toast(`Guide: ${q.title} ✔  (+${xp} xp)`, '#b8f070');
      g.audio.play('quest');
      g.gainXp(xp);
    }
  }
  /** Compass text for quests that point at a structure. */
  private compass(key: string): string {
    const g = this.g, dim = structDim(key);
    if (dim !== g.dim) return `In ${DIM_NAMES[dim]}`;
    const o = locate(key, g.player.x, g.player.z, g.cfg.meta.seed, dim === 0 ? g.climate : null);
    if (!o) return '';
    const dx = o[0] - g.player.x, dz = o[2] - g.player.z, d = Math.hypot(dx, dz);
    if (d < 14) return 'You are here';
    const dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8];
    return `Nearest altar: ${Math.round(d)} m ${dir}  (${o[0]}, ${o[2]})`;
  }
  tracker(): { key: string; chapter: string; title: string; hint: string; where: string } {
    const q = QUESTS[this.index];
    if (q.where && this.whereT <= 0) { this.whereT = 1.5; this.where = this.compass(q.where); }
    const where = q.where ? this.where : '';
    return { key: q.key + where, chapter: q.chapter, title: q.title, hint: q.hint, where };
  }
  list(): { title: string; hint: string; done: boolean; current: boolean }[] {
    return QUESTS.map((q, i) => ({ title: q.title, hint: q.hint, done: i < this.index, current: i === this.index }));
  }
}
