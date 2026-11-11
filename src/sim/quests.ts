// Progress through the guide: which step the world is on (shared.quest) and when it is met.
import { item } from '../data/items';
import { QUESTS } from '../data/quests';
import { gainXp, type SimPlayer } from './player';
import type { Sim } from './sim';

export class QuestSim {
  private t = 0;
  constructor(private sim: Sim) {}

  /** A step is met when any one player meets it (what a player holds is never summed across players). */
  private done(i: number): boolean {
    const q = QUESTS[i], sim = this.sim, any = (f: (p: SimPlayer) => boolean): boolean => { for (const p of sim.players.values()) if (f(p)) return true; return false; };
    if (q.have) return any((p) => p.inv.count(q.have![0]) >= q.have![1]) || sim.flags.has('had:' + q.key);
    if (q.flag) {
      if (sim.flags.has(q.flag)) return true;
      if (!q.flag.startsWith('craft:')) return false;
      // a crafting step also counts when the thing was looted, bought, placed, or a better tool of its kind is owned
      const key = q.flag.slice(6), t = item(key).tool;
      if (sim.flags.has('place:' + key) || any((p) => p.inv.count(key) > 0)) return true;
      if (t) return any((p) => { for (const s of p.inv.slots) { const o = s ? item(s.k).tool : undefined; if (o && o.kind === t.kind && o.power >= t.power) return true; } return false; });
      return false;
    }
    if (q.level) return any((p) => p.stats.level >= q.level!);
    return false;
  }
  tick(dt: number): void {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.5;
    const sim = this.sim, s = sim.shared;
    while (s.quest < QUESTS.length - 1 && this.done(s.quest)) {
      const q = QUESTS[s.quest];
      sim.addFlag('had:' + q.key);
      s.quest++;
      const xp = 15 + s.quest * 6;
      sim.sink.emit({ all: true }, ['t', `Guide: ${q.title} ✔  (+${xp} xp)`, '#b8f070']);
      sim.sink.emit({ all: true }, ['s', 'quest', 1, 1]);
      for (const p of sim.players.values()) gainXp(sim, p, xp);
    }
  }
}
