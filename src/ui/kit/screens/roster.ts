// The roster (section 6, 5.24): held open with Tab over the HUD, eight players on a plain dark plate centred on the
// stage at y 30. It takes no pointer and no focus; the crew list, the Guide's step and the toasts are not drawn while it
// is held.
import type { Node, Ui } from '../node';
import { roster } from '../parts/plates';
import { PLAYERS, SERVER, hud } from './play/hud';
import type { NamedScreen } from './index';

function build(ui: Ui): Node {
  const st = ui.layout.stage;
  return {
    x: 0, y: 0, w: ui.w, h: ui.h,
    kids: [
      ...hud(ui, { crew: false, prompt: false, notices: false }),
      roster({ cx: st.x + Math.floor(st.w / 2), y: 30, server: SERVER, members: PLAYERS }),
    ],
  };
}

export const SCREENS: NamedScreen[] = [{ name: 'roster', title: 'Roster, the crew who are here', world: true, build }];
