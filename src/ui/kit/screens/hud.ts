// The HUD (section 6) in its states: a great feeder up with a world event under it; looking at a creature; looking at
// a block that cannot be taken yet; and what a new arrival sees.
import type { Ui } from '../node';
import { hudScreen } from './play/hud';
import type { NamedScreen } from './index';

export const SCREENS: NamedScreen[] = [
  { name: 'hud', title: 'HUD, a great feeder up', world: true, build: (ui: Ui) => hudScreen(ui, { boss: true, world: true }) },
  { name: 'hud-fight', title: 'HUD, a great feeder up and a creature looked at', world: true, build: (ui: Ui) => hudScreen(ui, { boss: true, look: { icon: 'gloomshade', name: 'Tama', life: 0.45, hostile: true } }) },
  { name: 'hud-look', title: 'HUD, looking at a creature', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'gloomshade', name: 'Tama', life: 0.45, hostile: true } }) },
  { name: 'hud-talk', title: 'HUD, looking at a townsperson', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'codex:people_house', name: 'Kammār', line: 'Smith', use: 'Talk' } }) },
  { name: 'hud-block', title: 'HUD, looking at a block the pick will break', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'lumenite_ore', name: 'Hīrak Ore', ore: 'lumenite_ore' } }) },
  { name: 'hud-block-weak', title: 'HUD, looking at a block the pick is too weak for', world: true, build: (ui: Ui) => hudScreen(ui, { look: { icon: 'cindrite_ore', name: 'Jalit Ore', ore: 'cindrite_ore' } }) },
  { name: 'hud-chat', title: 'HUD, lines of chat just come in', world: true, build: (ui: Ui) => hudScreen(ui, { chat: true }) },
  { name: 'hud-first', title: 'HUD, a new arrival', world: true, build: (ui: Ui) => hudScreen(ui, { first: true }) },
];
