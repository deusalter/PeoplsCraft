// Player vitals and the RPG layer: levels, stat points, and every bonus derived from gear.
import { MOD_BY_KEY, StatKey, Stats, Style, item, setBonus } from '../data/items';
import type { Inventory } from './inventory';

export const STAT_NAMES = { str: 'Strength', agi: 'Agility', vit: 'Vitality', arc: 'Arcana' } as const;
export type Attr = keyof typeof STAT_NAMES;
export const ATTR_DESC: Record<Attr, string> = {
  str: '+2% melee damage and +1% mining speed per point',
  agi: '+1.5% ranged damage, +0.5% critical chance and +0.4% speed per point',
  vit: '+6 health and +0.25 defense per point',
  arc: '+2% magic and summon damage, +6 mana per point',
};
export const BUFFS: Record<string, { name: string; stats: Stats }> = {
  ironbark: { name: 'Ironbark', stats: { def: 6 } },
  swift: { name: 'Swiftroot', stats: { speed: 0.2 } },
  fed: { name: 'Well Fed', stats: { regen: 0.5 } },
  dawn: { name: 'Rested', stats: { regen: 0.5, speed: 0.05 } },
};

export class PlayerStats {
  hp = 100; maxHp = 100; mana = 40; maxMana = 40; hunger = 20;
  xp = 0; level = 1; points = 0;
  attr: Record<Attr, number> = { str: 0, agi: 0, vit: 0, arc: 0 };
  buffs = new Map<string, number>();
  /** Totals from gear, attributes and buffs. Rebuilt by recompute(). */
  d: Record<StatKey, number> = {} as Record<StatKey, number>;
  sets: string[] = [];
  hurtT = 0; salveCd = 0; exhaustion = 0; dead = false;
  private regenT = 0; private starveT = 0; private gearRev = -1;

  xpNeeded(): number { return Math.floor(30 + this.level * 22 + this.level * this.level * 4); }

  recompute(inv: Inventory): void {
    const d = this.d as Record<string, number>;
    for (const k of ['melee', 'ranged', 'magic', 'summon', 'dmg', 'crit', 'def', 'hp', 'mana', 'manaRegen', 'regen', 'speed', 'jump', 'minions', 'mining', 'atkSpeed', 'knockRes', 'pickup', 'extraJump', 'noFall', 'thorns', 'dodge', 'luck', 'swim', 'reach']) d[k] = 0;
    const add = (s?: Stats): void => { if (s) for (const k in s) d[k] += (s as Record<string, number>)[k]; };
    const counts = new Map<string, number>();
    for (const s of inv.armor) {
      if (!s) continue;
      const it = item(s.k);
      add(it.stats); if (s.m) add(MOD_BY_KEY.get(s.m)?.stats);
      if (it.armor) counts.set(it.armor.set, (counts.get(it.armor.set) ?? 0) + 1);
    }
    this.sets = [];
    for (const [set, n] of counts) if (n >= 3) { const b = setBonus(set); if (b) { add(b.stats); this.sets.push(set); } }
    const seen = new Set<string>();
    for (const s of inv.acc) { if (!s || seen.has(s.k)) continue; seen.add(s.k); add(item(s.k).stats); if (s.m) add(MOD_BY_KEY.get(s.m)?.stats); }
    const h = inv.held();
    if (h && h.m && item(h.k).weapon) add(MOD_BY_KEY.get(h.m)?.stats);
    for (const k of this.buffs.keys()) add(BUFFS[k]?.stats);
    const a = this.attr;
    d.melee += a.str * 0.02; d.mining += a.str * 0.01;
    d.ranged += a.agi * 0.015; d.crit += 0.04 + a.agi * 0.005; d.speed += Math.min(0.2, a.agi * 0.004);
    d.def += a.vit * 0.25; d.magic += a.arc * 0.02; d.summon += a.arc * 0.02;
    d.minions += 1;
    this.maxHp = Math.round(100 + (this.level - 1) * 4 + a.vit * 6 + d.hp);
    this.maxMana = Math.round(40 + a.arc * 6 + d.mana);
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.mana > this.maxMana) this.mana = this.maxMana;
    this.gearRev = inv.rev;
  }
  /** Recompute only if the inventory changed since the last call. */
  sync(inv: Inventory): void { if (inv.rev !== this.gearRev) this.recompute(inv); }

  dmgMult(style: Style): number { return 1 + this.d[style] + this.d.dmg; }

  tick(dt: number, inv: Inventory, sprinting: boolean): void {
    if (this.dead) return;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.salveCd > 0) this.salveCd -= dt;
    let changed = false;
    for (const [k, t] of this.buffs) { if (t - dt <= 0) { this.buffs.delete(k); changed = true; } else this.buffs.set(k, t - dt); }
    if (changed) this.recompute(inv);
    this.mana = Math.min(this.maxMana, this.mana + (2.2 + this.attr.arc * 0.12 + this.d.manaRegen) * dt);
    // hunger: a slow baseline plus exhaustion from effort
    this.exhaustion += dt * (sprinting ? 0.055 : 0.014);
    if (this.exhaustion >= 1) { this.exhaustion -= 1; this.hunger = Math.max(0, this.hunger - 1); }
    this.regenT += dt;
    if (this.hunger >= 14 || this.d.regen > 0) {
      const every = 3.2 / (1 + this.d.regen + (this.hunger >= 18 ? 0.5 : 0));
      if (this.regenT >= every && this.hunger > 0) { this.regenT = 0; if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + Math.max(1, this.maxHp * 0.012)); this.exhaustion += 0.12; } }
    }
    if (this.hunger <= 0) { this.starveT += dt; if (this.starveT > 4) { this.starveT = 0; if (this.hp > 5) this.hp -= 2; } }
  }

  /** Apply incoming damage after defense. Returns the amount actually taken (0 if dodged or invulnerable). */
  damage(raw: number, rnd: () => number, ignoreArmor = false): number {
    if (this.dead || this.hurtT > 0) return 0;
    if (!ignoreArmor && rnd() < this.d.dodge) { this.hurtT = 0.4; return -1; }
    const dmg = Math.max(1, Math.round(ignoreArmor ? raw : raw - this.d.def * 0.5));
    this.hp -= dmg; this.hurtT = 0.55; this.exhaustion += 0.2;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return dmg;
  }
  heal(n: number): void { this.hp = Math.min(this.maxHp, this.hp + n); }
  /** Add XP. Returns the number of levels gained. */
  addXp(n: number): number {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.xpNeeded()) { this.xp -= this.xpNeeded(); this.level++; this.points += 2; ups++; }
    return ups;
  }
  spend(a: Attr, inv: Inventory): boolean {
    if (this.points <= 0) return false;
    this.points--; this.attr[a]++; this.recompute(inv);
    if (a === 'vit') this.hp = Math.min(this.maxHp, this.hp + 6);
    return true;
  }
  respawn(): void { this.dead = false; this.hp = Math.round(this.maxHp * 0.6); this.hunger = Math.max(this.hunger, 10); this.mana = this.maxMana * 0.5; this.hurtT = 2; this.buffs.clear(); }
  serialize(): unknown { return { hp: this.hp, mana: this.mana, hunger: this.hunger, xp: this.xp, level: this.level, points: this.points, attr: this.attr, buffs: [...this.buffs] }; }
  load(d: any): void {
    if (!d) return;
    this.hp = d.hp ?? 100; this.mana = d.mana ?? 40; this.hunger = d.hunger ?? 20; this.xp = d.xp ?? 0; this.level = d.level ?? 1; this.points = d.points ?? 0;
    this.attr = { str: 0, agi: 0, vit: 0, arc: 0, ...(d.attr || {}) }; this.buffs = new Map(d.buffs || []); this.dead = false;
  }
}
