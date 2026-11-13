// Pause (section 6, Pause): four buttons on the world under three quarters of root.0, and no slab.
import type { Node, Screen } from '../node';
import { button } from '../parts/button';
import { line, washedMenu } from '../parts/menu';
import { firstFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface PauseView {
  world: string;
  /** On a server the world goes on: the heading is "Menu" and the last door "Leave". */
  server: boolean;
  /** "Saved", "Saving", or why not, which is said in blood. */
  saved?: { text: string; ok: boolean };
  onBack(): void;
  onSettings(): void;
  onControls(): void;
  onLeave(): void;
}

export const pauseScreen: Screen<PauseView> = (v, ui) => {
  firstFocus(ui, 'pause', 'pause.back');
  const kids: Node[] = [
    line({ x: 113, y: 40, w: 200, text: v.server ? 'Menu' : 'Paused', c: 'salt', shadow: true, centre: true }),
    line({ x: 113, y: 52, w: 200, text: v.world, c: 'root.4', shadow: true, centre: true }),
    button({ id: 'pause.back', x: 113, y: 84, w: 200, label: 'Back to the game', onPress: v.onBack }),
    button({ id: 'pause.settings', x: 113, y: 108, w: 200, label: 'Settings', onPress: v.onSettings }),
    button({ id: 'pause.controls', x: 113, y: 132, w: 200, label: 'Controls', onPress: v.onControls }),
    button({ id: 'pause.leave', x: 113, y: 156, w: 200, label: v.server ? 'Leave' : 'Save and leave', onPress: v.onLeave }),
  ];
  if (v.saved) kids.push(line({ x: 113, y: 64, w: 200, text: v.saved.text, c: v.saved.ok ? 'root.4' : 'blood.lt', shadow: true, centre: true }));
  return washedMenu(ui, 'pause', { c: 'root.0', quarters: 3 }, kids, {
    on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } },
  });
};

const view = (o: Pick<PauseView, 'world' | 'server' | 'saved'>): PauseView => ({
  ...o,
  onBack: () => go('hud'), onSettings: () => go('settings'), onControls: () => go('controls-play'), onLeave: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'pause', title: 'Pause', world: true, build: (ui) => pauseScreen(view({ world: 'Hearth on the Yavas', server: false, saved: { text: 'Saved', ok: true } }), ui) },
  { name: 'pause-server', title: 'Pause, on a server', world: true, build: (ui) => pauseScreen(view({ world: 'Spark', server: true }), ui) },
  { name: 'pause-unsaved', title: 'Pause, not saved', world: true, build: (ui) => pauseScreen(view({ world: 'Tusāravan pines under Sānu', server: false, saved: { text: 'Not saved: the browser is out of room', ok: false } }), ui) },
];
