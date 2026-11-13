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

/**
 * The focus put in a drawn field when a screen first opens, its text selected if asked. A field's state exists only
 * once the tree holding it has been placed, so this waits for the build under way to finish.
 */
export function firstFieldFocus(ui: Ui, key: string, id: string, selectAll: boolean): void {
  if (opened.has(key)) return;
  opened.add(key);
  setTimeout(() => {
    const st = ui.field(id);
    if (st && selectAll) { st.start = 0; st.end = st.value.length; }
    ui.focusOn(id, true);
    ui.invalidate();
  }, 0);
}
