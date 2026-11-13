// New world (section 6, New world): a name and a seed in two fields on the ground tile, then Create or Back.
import type { Screen } from '../node';
import { button } from '../parts/button';
import { field } from '../parts/controls';
import { groundMenu, line } from '../parts/menu';
import { firstFieldFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface NewWorldView {
  name: string;
  seed: string;
  onName(v: string): void;
  onSeed(v: string): void;
  onCreate(): void;
  onBack(): void;
}

export const newWorldScreen: Screen<NewWorldView> = (v, ui) => {
  firstFieldFocus(ui, 'new-world', 'new.name', true);
  const enter = (e: { key: string }) => { if (e.key === 'Enter') { v.onCreate(); return true; } };
  const name = field({ id: 'new.name', x: 113, y: 70, w: 200, h: 16, value: v.name, limit: 28, host: 'ground', onText: v.onName, ui });
  const seed = field({ id: 'new.seed', x: 113, y: 104, w: 200, h: 16, value: v.seed, limit: 32, placeholder: 'Left empty, one is drawn', host: 'ground', onText: v.onSeed, ui });
  name.on = { ...name.on, key: enter };
  seed.on = { ...seed.on, key: enter };
  return groundMenu(ui, 'new-world', [
    line({ x: 113, y: 40, w: 200, text: 'New world', c: 'salt', shadow: true }),
    line({ x: 113, y: 60, w: 60, text: 'Name', c: 'salt', shadow: true }),
    name,
    line({ x: 113, y: 94, w: 60, text: 'Seed', c: 'salt', shadow: true }),
    seed,
    button({ id: 'new.create', x: 113, y: 150, w: 200, label: 'Create', disabled: !v.name.trim(), onPress: v.onCreate }),
    button({ id: 'new.back', x: 113, y: 174, w: 200, label: 'Back', onPress: v.onBack }),
  ], { on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } } });
};

const state = { name: 'New world', seed: '' };

export const SCREENS: NamedScreen[] = [{
  name: 'new-world', title: 'New world', world: false,
  build: (ui) => newWorldScreen({
    ...state,
    onName: (t) => { const was = !!state.name.trim(); state.name = t; if (was !== !!t.trim()) ui.invalidate(); },
    onSeed: (t) => { state.seed = t; },
    onCreate: () => { if (state.name.trim()) go('loading'); },
    onBack: () => go('worlds'),
  }, ui),
}];
