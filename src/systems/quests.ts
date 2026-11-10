// Tracks progress through the guide and tells the HUD what to show next.
import { DIM_NAMES } from '../core/constants';
import { QUESTS } from '../data/quests';
import type { Game } from '../game';
import { locate, structDim } from '../world/gen/structures';

export interface Tracker { key: string; index: number; chapter: string; title: string; hint: string; where: string; have: number; need: number }

export class QuestSystem {
  index = 0;
  /** Nearest structure the current step points at, in this dimension, for the HUD compass. */
  target: [number, number] | null = null;
  private t = 0; private where = ''; private whereT = 0; private cur: Tracker | null = null;
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
    this.rebuild();
  }
  /** Refresh the tracker: progress every half second, compass text every 1.5 s. */
  private rebuild(): void {
    const g = this.g, q = QUESTS[this.index];
    if (this.whereT <= 0 || !this.cur || this.cur.index !== this.index) { this.whereT = 1.5; this.where = q.where ? this.compass(q.where) : ''; if (!q.where) this.target = null; }
    const need = q.have ? q.have[1] : q.level ?? 0, have = q.have ? Math.min(g.inv.count(q.have[0]), need) : q.level ? Math.min(g.stats.level, need) : 0;
    const c = this.cur;
    if (c && c.index === this.index && c.where === this.where && c.have === have) return;
    // a fresh object each time it changes, so nothing holding the old one sees it mutate
    this.cur = { key: q.key + '|' + this.where + '|' + have, index: this.index, chapter: q.chapter, title: q.title, hint: q.hint, where: this.where, have, need };
  }
  /** Compass text for quests that point at a structure. */
  private compass(key: string): string {
    const g = this.g, dim = structDim(key);
    if (dim !== g.dim) { this.target = null; return `In ${DIM_NAMES[dim]}`; }
    const o = locate(key, g.player.x, g.player.z, g.cfg.meta.seed, dim === 0 ? g.climate : null);
    if (!o) { this.target = null; return ''; }
    if (!this.target || this.target[0] !== o[0] || this.target[1] !== o[2]) this.target = [o[0], o[2]];
    const dx = o[0] - g.player.x, dz = o[2] - g.player.z, d = Math.hypot(dx, dz);
    if (d < 14) return 'You are here';
    const dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8];
    return `Nearest altar: ${Math.round(d)} m ${dir}  (${o[0]}, ${o[2]})`;
  }
  /** Cached; built on first use too, because the HUD asks before the first tick (and while paused). */
  tracker(): Tracker {
    if (!this.cur || this.cur.index !== this.index) this.rebuild();
    return this.cur!;
  }
  list(): { title: string; hint: string; done: boolean; current: boolean }[] {
    return QUESTS.map((q, i) => ({ title: q.title, hint: q.hint, done: i < this.index, current: i === this.index }));
  }
}
