// The client's picture of everything that moves: one view per creature, projectile and drop, holding
// what drawing needs (the previous tick for blending, eased light, meshes). While the simulation
// runs in the same thread the views are filled straight from its lists, tick by tick.
import { DropRender, DropView } from '../render/dropView';
import type { ItemModels } from '../render/itemModel';
import type { Realm } from '../sim/realm';
import type { World } from '../world/world';

export class EntityStore {
  readonly drops: DropView[] = [];
  readonly dropRender: DropRender;

  constructor(private world: World, models: ItemModels) { this.dropRender = new DropRender(models); }

  /** Before a simulation step: what is true now is the state the next frames blend from. */
  begin(realm: Realm): void {
    const dl = realm.drops.list;
    for (let i = 0; i < dl.length && i < this.drops.length; i++) { const d = dl[i], v = this.drops[i]; if (v.active && d.active && v.id === d.id) { v.px = d.x; v.py = d.y; v.pz = d.z; } }
  }

  /** Bring every view up to the simulation's current state. Something new starts where it is. */
  sync(realm: Realm): void {
    const dl = realm.drops.list;
    while (this.drops.length < dl.length) this.drops.push(new DropView());
    for (let i = 0; i < dl.length; i++) {
      const d = dl[i], v = this.drops[i];
      if (!d.active) { if (v.active) this.dropRender.hide(v); continue; }
      if (!v.active || v.id !== d.id) {
        this.dropRender.hide(v); this.dropRender.show(v, d.it.k);
        v.active = true; v.id = d.id; v.px = d.x; v.py = d.y; v.pz = d.z;
      }
      v.x = d.x; v.y = d.y; v.z = d.z; v.age = d.age;
    }
  }

  /** After a simulation step: the view work that happens once a tick. */
  end(realm: Realm, _dt: number): void {
    this.sync(realm);
    const w = this.world;
    for (const v of this.drops) {
      if (!v.active) continue;
      const l = w.getLight(Math.floor(v.x), Math.floor(v.y + 0.3), Math.floor(v.z));
      v.light.set((l >> 4) / 15, (l & 15) / 15, 0, 0);
    }
  }

  renderDrops(alpha: number): void { this.dropRender.render(this.drops, alpha); }
}
