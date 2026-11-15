// Pause (section 6, Pause): no window. Over the dimmed world, "Paused" in salt at the head of the menus' column, the
// world and whether it is saved under it, bare with their shadow, and a column of stone buttons, as the tradition's game menu stands.
// A clay slab behind stone buttons set two materials against each other and boxed a column that needed no box.
import type { Node, Screen } from '../node';
import { cut } from '../font/wrap';
import { button } from '../parts/button';
import { COLUMN_W, line, washedMenu } from '../parts/menu';
import { firstFocus, go } from './books-common';
import { HERE, SERVER } from '../sample/crew';
import type { NamedScreen } from './index';

export interface PauseView {
  world: string;
  /** On a server the world goes on: a line says so, the crew has a door, and the last door is "Leave". */
  server: boolean;
  /** "Saved 0:42 ago", "Saving", or why not, which is said in blood. */
  saved?: { text: string; ok: boolean };
  /** On a server: where it is and who is on, so that the crew is known without closing the menu to hold Tab. */
  crew?: { address: string; here: number; seats: number };
  onBack(): void;
  onSettings(): void;
  onControls(): void;
  /** On a server: the roster, held open until it is closed. */
  onCrew?(): void;
  onLeave(): void;
  /** Offered only when the last save failed: the door above "Leave without saving". */
  onRetry?(): void;
}

const X = 113;
/** The title's cell, from the top of the menus' block of 240. */
const TITLE_Y = 40;

export const pauseScreen: Screen<PauseView> = (v, ui) => {
  firstFocus(ui, 'pause', 'pause.back');
  const kids: Node[] = [line({ x: X, y: TITLE_Y, w: COLUMN_W, text: 'Paused', c: 'salt', shadow: true, centre: true })];
  // The lines under the title stand bare on the dimmed world with their shadow, 4 under the title's cell and 10 apart.
  // On a strip of the chat wash cut to their width they read as a web label chip, the one plate on the screen.
  let y = TITLE_Y + 14;
  const said: { t: string; c: 'salt' | 'root.4' | 'blood.lt' }[] = [];
  const say = (text: string, c: 'salt' | 'root.4' | 'blood.lt') => { said.push({ t: cut(text, COLUMN_W), c }); };
  // On a server: the place and its address in salt, then who is on and that the world goes on in grey. "The world runs
  // on" in blood.lt over three centred lines spent the warning colour on a line that warns of nothing. Alone: the
  // world in salt and when it was saved in grey; when the save failed the world steps down to grey under the warning.
  if (v.server && v.crew) {
    say(`${v.world}  ${v.crew.address}`, 'salt');
    say(`${v.crew.here} of ${v.crew.seats} here, the world runs on`, 'root.4');
  } else {
    const failed = v.saved !== undefined && !v.saved.ok;
    say(v.world, failed ? 'root.4' : 'salt');
    if (v.saved) say(v.saved.text, v.saved.ok ? 'root.4' : 'blood.lt');
  }
  said.forEach((l, i) => kids.push(line({ x: X, y: y + i * 10, w: COLUMN_W, text: l.t, c: l.c, shadow: true, centre: true })));
  y += said.length * 10;
  // A failed save must not be promised again by the last door: it is offered once more above a door that says so.
  const failed = !v.server && v.saved !== undefined && !v.saved.ok;
  const doors: { id: string; label: string; onPress?: () => void; warn?: boolean }[] = [
    { id: 'pause.back', label: 'Back to the game', onPress: v.onBack },
    { id: 'pause.settings', label: 'Settings', onPress: v.onSettings },
    { id: 'pause.controls', label: 'Controls', onPress: v.onControls },
  ];
  if (v.server) doors.push({ id: 'pause.crew', label: 'Crew', onPress: v.onCrew });
  if (failed) doors.push({ id: 'pause.retry', label: 'Try to save again', onPress: v.onRetry }, { id: 'pause.leave', label: 'Leave without saving', warn: true, onPress: v.onLeave });
  else doors.push({ id: 'pause.leave', label: v.server ? 'Leave' : 'Save and leave', onPress: v.onLeave });
  // The buttons stand 8 under the last line's cell and 4 apart.
  const top = y + 8;
  doors.forEach((d, i) => kids.push(button({ id: d.id, x: X, y: top + i * 24, w: COLUMN_W, label: d.label, warn: d.warn, onPress: d.onPress })));
  return washedMenu(ui, 'pause', { c: 'root.0', quarters: 2 }, kids, {
    on: { key: (e) => { if (e.key === 'Escape') { v.onBack(); return true; } } },
  });
};

const view = (o: Pick<PauseView, 'world' | 'server' | 'saved' | 'crew'>): PauseView => ({
  ...o,
  onBack: () => go('hud'), onSettings: () => go('settings'), onControls: () => go('controls-play'), onCrew: () => go('roster'), onLeave: () => go('title'), onRetry: () => go('pause'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'pause', title: 'Pause', world: true, build: (ui) => pauseScreen(view({ world: 'Hearth on the Yavas', server: false, saved: { text: 'Saved 0:42 ago', ok: true } }), ui) },
  { name: 'pause-server', title: 'Pause, on a server', world: true, build: (ui) => pauseScreen(view({ world: SERVER, server: true, crew: { address: 'spark.local:8420', here: HERE, seats: 8 } }), ui) },
  { name: 'pause-unsaved', title: 'Pause, not saved', world: true, build: (ui) => pauseScreen(view({ world: 'Tusāravan pines under Sānu', server: false, saved: { text: 'Not saved: the browser is out of room', ok: false } }), ui) },
];
