// Plays the simulation's fx events: sounds, particle bursts, floating text, toasts, banners, shake.
// The per-particle loops and their random numbers live here, not in the simulation.
import type { GameAudio } from '../audio/audio';
import { BLOCKS, T_LAYER } from '../data/blocks';
import { RARITY, item } from '../data/items';
import { MOB_LIST } from '../data/mobs';
import type { Player } from '../player/player';
import type { Particles } from '../render/batches';
import { BURST, type Fx } from '../sim/fx';
import type { Hud } from '../ui/hud';
import type { World } from '../world/world';
import type { Session } from './session';

export interface FxHost { audio: GameAudio; particles: Particles; hud: Hud; player: Player; world: World }

/** The codes the entity store plays itself once connected: projectiles, drops, creature removals, boss marks. */
export const ENTITY_FX: ReadonlySet<string> = new Set(['ps', 'pe', 'da', 'dn', 'dd', 'md', 'mk']);

export const tintOf = (id: number): number => { const t = BLOCKS[id].tint; return t === 1 ? 0x86c653 : t === 2 ? 0x6fb445 : t === 3 ? 0x3a84dc : 0xffffff; };

export class FxPlay {
  private popT = 0;
  /** Events this player does not handle itself (creature and projectile endings, boss marks). */
  onEntity: ((ev: Fx) => void) | null = null;
  constructor(private g: FxHost) {}

  tick(dt: number): void { if (this.popT > 0) this.popT -= dt; }

  /** Play the `fx` of a connection, in the order the host sent them; the entity codes are left to the entity store. */
  connect(s: Session): void { s.on('fx', (m) => { for (const ev of m.l) if (!ENTITY_FX.has(ev[0])) this.play(ev); }); }

  play(ev: Fx): void {
    const g = this.g;
    switch (ev[0]) {
      case 's': g.audio.play(ev[1], ev[2], ev[3], ev[4] === undefined ? undefined : [ev[4], ev[5]!, ev[6]!]); break;
      case 'p': this.burst(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6]); break;
      case 'f': g.hud.floater(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6]); break;
      case 't': if (ev[1]) g.hud.toast(ev[1], ev[2] || undefined); break;
      case 'n': g.hud.showBanner(ev[1], ev[2], ev[3]); break;
      case 'k': g.player.shake(ev[1]); break;
      case 'h': g.hud.hitMark(ev[1]); break;
      case 'u': {
        const d = item(ev[1]);
        g.hud.pickup(ev[1], ev[2], d.name, RARITY[d.rarity].color, ev[3]);
        if (this.popT <= 0) { g.audio.play('pop', 0.7, 0.9 + Math.random() * 0.3); this.popT = 0.06; }
        break;
      }
      default: if (this.onEntity) this.onEntity(ev);
    }
  }

  burst(kind: number, x: number, y: number, z: number, a: number, c: number): void {
    const ps = this.g.particles, R = Math.random;
    switch (kind) {
      case BURST.block: {
        const l = this.g.world.getLight(x, y, z), layer = T_LAYER[a * 6], tint = tintOf(a), glow = BLOCKS[a].emissive > 150 ? 0.7 : 0;
        for (let i = 0; i < 18; i++) ps.spawn(x + R(), y + R(), z + R(), (R() - 0.5) * 3.4, R() * 4, (R() - 0.5) * 3.4, 0.5 + R() * 0.4, 0.13, tint, glow, 16, layer, true, Math.max((l >> 4) / 15, 0.2), (l & 15) / 15);
        break;
      }
      case BURST.mobHit: { const col = MOB_LIST[a].parts[0].c; for (let i = 0; i < 6; i++) ps.spawn(x, y, z, (R() - 0.5) * 4, R() * 4, (R() - 0.5) * 4, 0.4, 0.1, col, 0, 12); break; }
      case BURST.puff: for (let i = 0; i < a; i++) ps.spawn(x, y, z, (R() - 0.5) * 3, R() * 3, (R() - 0.5) * 3, 0.6, 0.12, c, 1, 0); break;
      case BURST.summoned: for (let j = 0; j < 8; j++) ps.spawn(x + (R() - 0.5) * 0.8, y, z + (R() - 0.5) * 0.8, (R() - 0.5) * 1.5, 2 + R() * 2, (R() - 0.5) * 1.5, 0.6, 0.14, a, 1, 2); break;
      case BURST.bossSummon: { const col = MOB_LIST[a].parts[0].c; for (let i = 0; i < 60; i++) ps.spawn(x, y, z, (R() - 0.5) * 10, R() * 12, (R() - 0.5) * 10, 1.2, 0.2, col, 1, 5); break; }
      case BURST.bossDeath: { const parts = MOB_LIST[a].parts; for (let i = 0; i < 120; i++) ps.spawn(x, y, z, (R() - 0.5) * 16, R() * 14, (R() - 0.5) * 16, 1.6, 0.24, parts[(R() * parts.length) | 0].c, 1, 6); break; }
      case BURST.bossPhase: { const parts = MOB_LIST[a].parts; for (let i = 0; i < 40; i++) ps.spawn(x, y, z, (R() - 0.5) * 12, R() * 8, (R() - 0.5) * 12, 1, 0.2, parts[(R() * parts.length) | 0].c, 0.8, 4); break; }
      case BURST.slamRing: for (let i = 0; i < 48; i++) { const an = (i / 48) * 6.283; ps.spawn(x + Math.cos(an) * 1.5, y, z + Math.sin(an) * 1.5, Math.cos(an) * a * 1.6, 1.5, Math.sin(an) * a * 1.6, 0.6, 0.22, 0xd8c8a8, 0.3, 4); } break;
      case BURST.eruption: for (let i = 0; i < 40; i++) ps.spawn(x, y, z, (R() - 0.5) * 12, 4 + R() * 8, (R() - 0.5) * 12, 0.9, 0.22, 0xe4d39a, 0, 14, -1, true); break;
      case BURST.teleport: for (let i = 0; i < 24; i++) ps.spawn(x, y + R() * a, z, (R() - 0.5) * 6, (R() - 0.5) * 6, (R() - 0.5) * 6, 0.5, 0.16, 0xffffff, 1, 0); break;
      case BURST.footfall: for (let i = 0; i < 8; i++) ps.spawn(x + (R() - 0.5) * 1.2, y, z + (R() - 0.5) * 1.2, (R() - 0.5) * 3, 0.8 + R() * 1.6, (R() - 0.5) * 3, 0.6, 0.18, 0xb8ac94, 0, 5); break;
      case BURST.forgeSmoke: ps.spawn(x + 0.5 + (R() - 0.5) * 0.4, y + 1.05, z + 0.5 + (R() - 0.5) * 0.4, 0, 0.8, 0, 1.2, 0.1, 0x8a8a92, 0, -0.4); break;
    }
  }
}
