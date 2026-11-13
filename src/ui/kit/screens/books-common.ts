// What the screens of the books set share on the kit page: going from one mock screen to another as the game would.
import type { Ui } from '../node';

/** Opens another mock screen on the kit page, keeping its scale and strict mode, as a press in the game would. */
export function go(name: string): void {
  if (typeof location === 'undefined') return;
  const p = new URLSearchParams(location.search);
  p.set('screen', name);
  location.search = p.toString();
}

/** Focus drawn on one part when a screen first opens, as its table's "First" line asks. */
export function firstFocus(ui: Ui, key: string, id: string | null): void {
  if (opened.has(key)) return;
  opened.add(key);
  ui.focusOn(id, true);
}
const opened = new Set<string>();
