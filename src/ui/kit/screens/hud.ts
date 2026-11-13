// The HUD (section 6) in its states: a great feeder up with a world event under it; looking at a creature; looking at
// a block that cannot be taken yet; and what a new arrival sees.
import type { Ui } from '../node';
import { hudScreen } from './play/hud';
import type { NamedScreen } from './index';

export const SCREENS: NamedScreen[] = [
  { name: 'hud', title: 'HUD, a great feeder up', world: true, build: (ui: Ui) => hudScreen(ui, { boss: true, world: true }) },
  { name: 'hud-look', title: 'HUD, looking at a creature', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'gloomshade', name: 'Tama', life: 0.45 } }) },
  { name: 'hud-block', title: 'HUD, looking at a block', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'lumenite_ore', name: 'Hīrak Ore', line: 'Needs an iron pick', refusal: true } }) },
  { name: 'hud-first', title: 'HUD, a new arrival', world: true, build: (ui: Ui) => hudScreen(ui, { first: true }) },
];
