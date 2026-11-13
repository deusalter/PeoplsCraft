// Pause (section 6, Pause): a clay slab over the dimmed world, titled like any window, with the world, whether it is
// saved, and four buttons on it.
import type { Node, Screen } from '../node';
import { button } from '../parts/button';
import { line, washedMenu } from '../parts/menu';
import { slab } from '../parts/slab';
import { firstFocus, go } from './books-common';
import { HERE, SERVER } from '../sample/crew';
import type { NamedScreen } from './index';

export interface PauseView {
  world: string;
  /** On a server the world goes on: the heading says so and the last door is "Leave". */
  server: boolean;
  /** "Saved", "Saving", or why not, which is said in blood. */
  saved?: { text: string; ok: boolean };
  /** On a server: where it is and who is on, so that the crew is known without closing the menu to hold Tab. */
  crew?: { address: string; here: number; seats: number };
  onBack(): void;
  onSettings(): void;
  onControls(): void;
  onLeave(): void;
}

export const pauseScreen: Screen<PauseView> = (v, ui) => {
  firstFocus(ui, 'pause', 'pause.back');
  // The lines end 10 under their cell's top; the buttons stand 8 under the last line, 4 apart, and 8 over the foot.
  const second = v.crew ?? v.saved;
  const top = (second ? 28 : 18) + 10 + 8;
  const W = 216, H = top + 4 * 24 - 4 + 8, X = 113 - 8, Y = Math.floor((240 - H) / 2);
  const kids: Node[] = [
    line({ x: 8, y: 18, w: W - 16, text: v.world, c: 'ink.faded', shadow: false }),
    button({ id: 'pause.back', x: 8, y: top, w: 200, label: 'Back to the game', onPress: v.onBack }),
    button({ id: 'pause.settings', x: 8, y: top + 24, w: 200, label: 'Settings', onPress: v.onSettings }),
    button({ id: 'pause.controls', x: 8, y: top + 48, w: 200, label: 'Controls', onPress: v.onControls }),
    button({ id: 'pause.leave', x: 8, y: top + 72, w: 200, label: v.server ? 'Leave' : 'Save and leave', onPress: v.onLeave }),
  ];
  if (v.crew) kids.push(line({ x: 8, y: 28, w: W - 16, text: `${v.crew.address}, ${v.crew.here} of ${v.crew.seats} here`, c: 'ink.faded', shadow: false }));
  if (v.saved) kids.push(line({ x: 8, y: 28, w: W - 16, text: v.saved.text, c: v.saved.ok ? 'ink.faded' : 'blood.dk', shadow: false }));
  return washedMenu(ui, 'pause', { c: 'root.0', quarters: 2 }, [
    slab({ x: X, y: Y, w: W, h: H, ramp: 'clay', title: v.server ? 'Paused (the world runs on)' : 'Paused', kids }),
  ], {
    on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } },
  });
};

const view = (o: Pick<PauseView, 'world' | 'server' | 'saved' | 'crew'>): PauseView => ({
  ...o,
  onBack: () => go('hud'), onSettings: () => go('settings'), onControls: () => go('controls-play'), onLeave: () => go('title'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'pause', title: 'Pause', world: true, build: (ui) => pauseScreen(view({ world: 'Hearth on the Yavas', server: false, saved: { text: 'Saved', ok: true } }), ui) },
  { name: 'pause-server', title: 'Pause, on a server', world: true, build: (ui) => pauseScreen(view({ world: SERVER, server: true, crew: { address: 'spark.local:8420', here: HERE, seats: 8 } }), ui) },
  { name: 'pause-unsaved', title: 'Pause, not saved', world: true, build: (ui) => pauseScreen(view({ world: 'Tusāravan pines under Sānu', server: false, saved: { text: 'Not saved: the browser is out of room', ok: false } }), ui) },
];
