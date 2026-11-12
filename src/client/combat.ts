// What a click does before it is a dig: today's Game.primary and Game.secondary, with the decision
// kept here and what it changes asked of the host. Each action leaves through session.act, behind
// the movement message of where it was made; what it uses up is taken off the inventory view at
// once, under the action's seq, until the host has answered.
import * as THREE from 'three';
import { BLOCKS } from '../data/blocks';
import { item } from '../data/items';
import { STATIONS, USE_COST, placeSound } from '../sim/actions';
import { type RayMob, rayHitMobs } from '../sim/mobhit';
import { npcOf } from '../sim/npcs';
import type { RayHit } from '../sim/physics';
import { attackRate } from '../sim/rules';
import type { Player } from '../player/player';
import type { ActHost, EditHost, Ghosts } from './api';
import type { InvClient } from './invclient';
import type { Session } from './session';

/** What the hands need of the game around them. */
export interface CombatView {
  readonly player: Player;
  readonly interact: { readonly hit: RayHit };
  readonly ents: { readonly mobs: readonly HandMob[] };
  readonly audio: { play(name: string, vol?: number, pitch?: number): void };
  readonly win: { show(mode: 'station', o: { station: string }): void };
  toast(text: string, color?: string): void;
  /** Start the held item's swing. */
  swing(): void;
  /** A crate this player just broke open: its burst and sound, which the host leaves to the client that broke it. */
  burst(x: number, y: number, z: number, id: number): void;
}

/** A creature as the hands see it: what the ray tests, and the id a blow or a word names (a MobView is one). */
export type HandMob = RayMob & { readonly id: number };
const IS_NPC = (m: HandMob): boolean => m.def.ai === 'npc';
const NOT_FRIEND = (m: HandMob): boolean => m.def.ai !== 'minion' && m.def.ai !== 'npc';
/** Uses the host acts on; any other right-click on a block goes on to the held item, as today. */
const ACTS = (use: string): boolean => !!STATIONS[use] || use.startsWith('forge') || use.startsWith('altar') || use === 'chest' || use === 'crate' || use === 'bed' || use === 'guestbed' || use === 'door' || use === 'berries';

export class Combat implements ActHost {
  /** The client's own cadence: swings and uses are made at the rate they always were; the host judges them by its credits. */
  atkCd = 0; useCd = 0;
  private warnT = 0; private d = new THREE.Vector3();

  constructor(private v: CombatView, private session: Session, private inv: InvClient, private edit: EditHost, private ghosts: Ghosts) {}

  tick(dt: number): void {
    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.useCd > 0) this.useCd -= dt;
    if (this.warnT > 0) this.warnT -= dt;
  }

  primary(pressed: boolean, held: boolean): boolean {
    const c = this.inv, inv = c.inv, st = c.stats;
    if (!held || c.dead) return false;
    const p = this.v.player, it = inv.held(), wpn = it ? item(it.k).weapon : undefined, style = wpn?.style ?? 'melee';
    const dir = p.dir(this.d), ex = p.x, ey = p.y + p.eye, ez = p.z;
    const rate = attackRate(inv, st);
    if (style !== 'melee' && wpn) {
      if (this.atkCd > 0) return true;
      this.atkCd = 1 / rate;
      const arrow = style === 'ranged' ? inv.findTagged('arrow') : -1;
      if (style === 'ranged' && arrow < 0) { this.warn('No arrows', '#ff9a8a', 1.5, true); return true; }
      if (style !== 'ranged' && st.mana < (wpn.mana ?? 0)) { this.warn('Not enough mana', '#9ad0ff', 1.5, true); return true; }
      const seq = c.nextSeq();
      if (arrow >= 0) c.internal(seq, { o: '_slot', i: arrow, n: 1 });
      // shown at once; the snapshot header says what the host made of it
      st.mana -= wpn.mana ?? 0;
      // the stand-in leaves where the host's shot will: the same offsets as actions.fire
      if (style === 'ranged') this.ghosts.ghost(seq, 'arrow', ex + dir.x * 0.4, ey - 0.12 + dir.y * 0.4, ez + dir.z * 0.4, dir.x, dir.y + 0.02, dir.z, wpn.projSpeed);
      else if (style === 'magic' && wpn.proj) this.ghosts.ghost(seq, wpn.proj, ex + dir.x * 0.5, ey - 0.15 + dir.y * 0.5, ez + dir.z * 0.5, dir.x, dir.y, dir.z, wpn.projSpeed);
      this.session.act({ t: 'fire', seq, o: [ex, ey, ez], d: [dir.x, dir.y, dir.z] });
      this.v.swing();
      if (style === 'ranged') this.v.audio.play('bow'); else if (style === 'magic') this.v.audio.play('magic'); else this.atkCd = 0.6;
      return true;
    }
    const reach = (wpn?.reach ?? 3.3) + st.d.reach * 0.5, h = this.v.interact.hit;
    const r = rayHitMobs(this.v.ents.mobs, ex, ey, ez, dir.x, dir.y, dir.z, reach, 0.18, NOT_FRIEND);
    if (r && (!h.hit || r.t <= h.dist + 0.2)) {
      if (this.atkCd <= 0) {
        this.atkCd = 1 / rate; this.v.swing(); this.v.audio.play('swing', 0.6);
        this.session.act({ t: 'atk', id: r.m.id, d: [dir.x, dir.y, dir.z] });
      }
      return true;
    }
    if (pressed && this.atkCd <= 0) { this.v.swing(); this.atkCd = 0.25; if (!h.hit) this.v.audio.play('swing', 0.4); }
    return false;
  }

  secondary(hit: RayHit | null, pressed: boolean): boolean {
    const c = this.inv, inv = c.inv, p = this.v.player;
    if (c.dead) return false;
    const dir = p.dir(this.d);
    // townsfolk first
    if (pressed) {
      const r = rayHitMobs(this.v.ents.mobs, p.x, p.y + p.eye, p.z, dir.x, dir.y, dir.z, hit ? Math.min(4, hit.dist) : 4, 0.15, IS_NPC);
      if (r && npcOf(r.m.def.key)) { this.session.act({ t: 'talk', id: r.m.id }); return true; }
    }
    const it = inv.held(), d = it ? item(it.k) : null;
    if (hit && pressed && !p.sneaking) {
      const use = BLOCKS[hit.id].use;
      if (use && ACTS(use) && this.useBlock(hit, use)) return true;
    }
    if (!it || !d) return false;
    if (d.block !== undefined && hit) {
      if (!this.edit.place(hit, d.block)) return false;
      this.v.audio.play(placeSound(d.block), 0.8, 0.9); this.v.swing();
      return true;
    }
    if (d.use && hit && pressed) {
      if (d.use === 'door') { if (!this.edit.placeDoor(hit)) return false; this.v.audio.play('door'); this.v.swing(); return true; }
      if (d.use === 'gate1' || d.use === 'gate2') {
        const seq = c.nextSeq();
        c.internal(seq, { o: '_held', n: 1 });
        this.session.act({ t: 'item', seq, slot: inv.sel, at: [hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz], ax: Math.abs(dir.z) > Math.abs(dir.x) });
        return true;
      }
      if (d.use.startsWith('summon')) { this.v.toast('Use this at its altar. The guide points the way.', '#ffd9a0'); return true; }
    }
    if (!pressed || this.useCd > 0) return false;
    if (d.use === 'recall') {
      if (c.recallT > 0 || c.stats.dead) this.v.toast('The stone is still warm.', '#ff9a8a');
      else { const seq = c.nextSeq(); this.session.act({ t: 'item', seq, slot: inv.sel }); }
      return true;
    }
    if (d.food || d.heal || d.restoreMana || d.buff) {
      const r = this.consume(inv.sel);
      if (r === 2) this.v.swing();
      return r !== 0;
    }
    return false;
  }

  /** H: apply the salve that best covers missing health without scrolling to it. */
  quickHeal(): void {
    const c = this.inv, inv = c.inv, st = c.stats, miss = st.maxHp - st.hp;
    if (c.dead || this.useCd > 0) return;
    if (st.salveCd > 0) { this.v.audio.play('error', 0.4); return; }
    let best = -1, bestHeal = 0, big = -1, bigHeal = 0;
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i], d = s ? item(s.k) : null;
      if (!d || !d.heal || d.food) continue;
      if (d.heal >= miss && (best < 0 || d.heal < bestHeal)) { best = i; bestHeal = d.heal; }
      if (d.heal > bigHeal) { big = i; bigHeal = d.heal; }
    }
    if (big < 0) { if (this.warnT <= 0) { this.v.toast('No salves', '#ff9a8a'); this.v.audio.play('error', 0.5); this.warnT = 1.5; } return; }
    if (miss < 1) { if (this.warnT <= 0) { this.v.toast('Already at full health', '#9aa0b2'); this.warnT = 1.5; } return; }
    this.consume(best >= 0 ? best : big);
  }

  /** A right-click on a block the host acts on. A station shows here at once; a door is predicted; the rest waits for the host. */
  private useBlock(hit: RayHit, use: string): boolean {
    const c = this.inv, v = this.v;
    if (use === 'door') { if (!this.edit.toggleDoor(hit)) return false; v.audio.play('door'); return true; }
    const seq = c.nextSeq(), station = STATIONS[use];
    if (station) c.openStation(seq, station);
    // an offering leaves the hand as it is laid on the altar
    else if (use.startsWith('altar')) { const h = c.inv.held(); if (h && item(h.k).use === 'summon' + use.slice(5)) c.internal(seq, { o: '_held', n: 1 }); }
    this.session.act({ t: 'use', seq, x: hit.x, y: hit.y, z: hit.z, id: hit.id });
    if (station) { v.audio.play('click'); v.win.show('station', { station }); }
    else if (use === 'crate') v.burst(hit.x, hit.y, hit.z, hit.id);
    return true;
  }
  /** Eat, drink or apply the consumable in `slot`. 0 nothing happened, 1 refused with feedback, 2 used. */
  private consume(slot: number): number {
    const c = this.inv, st = c.stats, it = c.inv.slots[slot], d = it ? item(it.k) : null;
    if (!d) return 0;
    if (d.heal && !d.food && st.salveCd > 0) { this.warn(`Salves need ${Math.ceil(st.salveCd)}s more`, '#ff9a8a', 1, false); return 1; }
    if (d.food && st.hunger >= 20 && !d.heal && !d.restoreMana) return 0;
    const seq = c.nextSeq();
    c.internal(seq, { o: '_slot', i: slot, n: 1 });
    if (d.heal && !d.food) st.salveCd = 9;
    this.session.act({ t: 'item', seq, slot });
    this.useCd = USE_COST; this.v.audio.play(d.food ? 'eat' : 'drink');
    return 2;
  }
  /** A refusal the player should hear about, at most once per `gap` seconds. */
  private warn(text: string, color: string, gap: number, sound: boolean): void {
    if (this.warnT > 0) return;
    this.v.toast(text, color); if (sound) this.v.audio.play('error', 0.5); this.warnT = gap;
  }
}
