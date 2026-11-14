// World events: night raids, the recurring Hollow Moon, and Ashen Host invasions that scale
// with how many bosses have fallen. They belong to the Overworld; their state is shared.events
// (a: which is running, k: kills, g: goal, l: day of the last Ashen Host). More players make a bigger host (7.5).
import { T_LIQUID, T_SOLID } from '../data/blocks';
import { dropItem } from './actions';
import type { Mob } from './mobs';
import { active, gainXp, type SimPlayer } from './player';
import type { Sim } from './sim';

/** The goal of a raid or a march for one player. */
const baseGoal = (kind: 'raid' | 'ashen', diff: number): number => (kind === 'raid' ? 10 + diff * 3 : 18 + diff * 6);
const online = (l: readonly SimPlayer[]): SimPlayer[] => l.filter((p) => p.online);

export class EventSim {
  private spawnT = 0; private lastPhase = -1;
  /** Players in the Overworld when the running event started. */
  private n = 1;
  constructor(private sim: Sim) {
    const ev = sim.shared.events, a = ev.a;
    if (a) sim.realms[0].mobs.pressure = a === 'moon' ? 0.8 : 1;
    // not saved: the goal was made from it, so it is read back from the goal
    if (a === 'raid' || a === 'ashen') this.n = Math.max(1, Math.round((ev.g / baseGoal(a, sim.difficulty()) - 1) / 0.5 + 1));
  }
  get active(): 'raid' | 'moon' | 'ashen' | null { return this.sim.shared.events.a; }

  start(kind: 'raid' | 'moon' | 'ashen'): void {
    const sim = this.sim, ev = sim.shared.events, diff = sim.difficulty(), mobs = sim.realms[0].mobs, to = { dim: 0 };
    ev.a = kind; ev.k = 0; this.spawnT = 3;
    this.n = Math.max(1, online(sim.realms[0].players).length);
    const goal = (k: 'raid' | 'ashen'): number => Math.round(baseGoal(k, diff) * (1 + 0.5 * (this.n - 1)));
    if (kind === 'raid') { ev.g = goal('raid'); sim.sink.emit(to, ['n', 'A raid gathers in the dark', 'Hold until dawn or break them', '#ff9a8a']); sim.sink.emit(to, ['s', 'horn', 1, 1]); mobs.pressure = 1; }
    else if (kind === 'ashen') { ev.g = goal('ashen'); sim.sink.emit(to, ['n', 'A march from the sand country', 'Beat them off before dusk', '#ffb86a']); sim.sink.emit(to, ['s', 'horn', 1, 1]); mobs.pressure = 1; ev.l = Math.floor(sim.shared.clock); }
    else { sim.sink.emit(to, ['n', 'Amāvassa', 'The moon is dark tonight', '#ff8ad0']); sim.sink.emit(to, ['s', 'bell', 1, 1]); mobs.pressure = 0.8; }
  }
  end(won: boolean): void {
    const sim = this.sim, ev = sim.shared.events, kind = ev.a, realm = sim.realms[0], mobs = realm.mobs, to = { dim: 0 };
    if (!kind) return;
    ev.a = null; mobs.pressure = 0;
    if (kind === 'moon') { sim.sink.emit(to, ['n', 'The moon sets', '', '#c8d0e8']); return; }
    if (won) {
      const coins = (kind === 'ashen' ? 60 : 25) * (1 + sim.difficulty());
      const won = online(realm.players);
      for (const p of won) { p.inv.coins += coins; p.inv.touch(); gainXp(sim, p, 40 + sim.difficulty() * 30); }
      sim.sink.emit(to, ['n', kind === 'ashen' ? 'The march is beaten off' : 'The raid is broken', `+${coins} coins`, '#b8f070']);
      sim.sink.emit(to, ['s', 'levelup', 1, 1]);
      if (kind === 'ashen') { sim.addFlag('event:ashen'); for (const p of won) { const left = p.inv.add({ k: 'ash_token', n: 4 + sim.difficulty() * 2 }); if (left) dropItem(sim, p, { k: 'ash_token', n: left }); } }
      sim.addFlag('event:' + kind);
    } else sim.sink.emit(to, ['n', kind === 'raid' ? 'Dawn scatters the raid' : 'The march turns for home', '', '#c8d0e8']);
    for (const m of mobs.list) if (m.active && m.event && !m.boss) mobs.remove(m);
  }
  onKill(m: Mob): void {
    const ev = this.sim.shared.events;
    if (!ev.a || ev.a === 'moon' || !m.event) return;
    ev.k++;
    if (ev.k >= ev.g) this.end(true);
  }

  tick(dt: number): void {
    const sim = this.sim, ev = sim.shared.events, realm = sim.realms[0], mobs = realm.mobs, rnd = sim.rnd, t = sim.shared.clock % 1, day = Math.floor(sim.shared.clock);
    if (!realm.players.some((p) => p.online)) { if (ev.a) this.end(false); this.lastPhase = t < 0.5 ? 0 : 1; return; }
    const phase = t < 0.5 ? 0 : 1;
    if (this.lastPhase >= 0 && phase !== this.lastPhase && !mobs.boss()) {
      if (phase === 1) {
        // dusk
        if (ev.a === 'ashen') this.end(false);
        // no raid is rolled on a moon night (the moon itself rises from state, below)
        if (!(day % 8 === 7 && sim.flags.has('boss:3')) && (sim.flags.has('boss:1') || sim.npcs.count() >= 2) && rnd() < 0.22) this.start('raid');
      } else {
        // dawn
        if (ev.a === 'raid' || ev.a === 'moon') this.end(false);
        if (sim.flags.has('boss:2') && day - ev.l >= 3 && rnd() < 0.2) this.start('ashen');
      }
    }
    this.lastPhase = phase;
    // The moon starts from state, not from the dusk edge: a dusk spent in another dimension or in a boss
    // fight would otherwise skip it for another eight days.
    if (!ev.a && phase === 1 && day % 8 === 7 && sim.flags.has('boss:3') && !mobs.boss()) this.start('moon');
    if (ev.a !== 'raid' && ev.a !== 'ashen') return;
    this.spawnT -= dt;
    if (this.spawnT > 0 || mobs.count((m) => m.event) >= 8 + sim.difficulty() + 3 * (this.n - 1)) return;
    // each wave gathers round one player in play, drawn at random. With nobody in play the wave waits.
    const act = realm.players.filter(active);
    if (!act.length) return;
    const pl = act.length === 1 ? act[0] : act[Math.floor(rnd() * act.length)];
    this.spawnT = 4.5;
    const p = pl.body, w = realm, diff = sim.difficulty();
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, r = 18 + rnd() * 10, x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r);
      let y = w.topY(x, z);
      while (y > 1 && !T_SOLID[w.getBlock(x, y, z)]) y--;
      if (y < 2 || T_LIQUID[w.getBlock(x, y + 1, z)]) continue;
      const roll = rnd();
      const key = ev.a === 'raid' ? (roll < 0.6 ? 'gloomshade' : roll < 0.85 ? 'thornling' : diff >= 2 ? 'ashen_raider' : 'gloomshade')
        : roll < 0.55 ? 'ashen_raider' : roll < 0.85 ? 'ashen_hexer' : diff >= 3 || ev.k > ev.g * 0.5 ? 'siege_brute' : 'ashen_raider';
      const m = mobs.spawn(key, x + 0.5, y + 1.05, z + 0.5);
      if (m) { m.event = true; m.dmgMul = 1 + diff * 0.45; m.hp = m.maxHp = Math.round(m.def.hp * (1 + diff * 0.7)); }
    }
  }
}
