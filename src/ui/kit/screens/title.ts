// The title (section 6, Title): the mark and four doors on the ground tile.
import type { Node, Screen } from '../node';
import { button } from '../parts/button';
import { titleMark } from '../parts/keycap';
import { groundMenu, line } from '../parts/menu';
import { BUILD, UNSAVED } from '../sample/menus';
import { firstFocus, go } from './books-common';
import type { NamedScreen } from './index';

export interface TitleView {
  build: string;
  /** Why nothing will be saved, only when it is true. */
  unsaved?: string;
  onWorlds(): void;
  onJoin(): void;
  onSettings(): void;
  onControls(): void;
}

export const titleScreen: Screen<TitleView> = (v, ui) => {
  firstFocus(ui, 'title', 'title.worlds');
  const kids: Node[] = [
    titleMark({ cx: 213, y: 28 }),
    button({ id: 'title.worlds', x: 113, y: 96, w: 200, label: 'Worlds', onPress: v.onWorlds }),
    button({ id: 'title.join', x: 113, y: 120, w: 200, label: 'Join a server', onPress: v.onJoin }),
    button({ id: 'title.settings', x: 113, y: 144, w: 200, label: 'Settings', onPress: v.onSettings }),
    button({ id: 'title.controls', x: 113, y: 168, w: 200, label: 'Controls', onPress: v.onControls }),
  ];
  if (v.unsaved) kids.push(line({ x: 113, y: 78, w: 200, text: v.unsaved, c: 'blood.lt', shadow: true, centre: true }));
  const root = groundMenu(ui, 'title', kids, {
    on: {
      key: (e) => {
        if (e.key === 'w' || e.key === 'W') { v.onWorlds(); return true; }
        if (e.key === 'j' || e.key === 'J') { v.onJoin(); return true; }
      },
    },
  });
  // The build stands at the screen's own bottom left, not in the menu's block.
  root.kids!.push(line({ x: 4, y: ui.h - 10, w: 80, text: BUILD, c: 'root.4', shadow: true, small: true }));
  return root;
};

const view = (unsaved?: string): TitleView => ({
  build: BUILD, unsaved,
  onWorlds: () => go('worlds'), onJoin: () => go('join'), onSettings: () => go('settings'), onControls: () => go('controls'),
});

export const SCREENS: NamedScreen[] = [
  { name: 'title', title: 'Title', world: false, build: (ui) => titleScreen(view(), ui) },
  { name: 'title-unsaved', title: 'Title, nothing saved', world: false, build: (ui) => titleScreen(view(UNSAVED), ui) },
];
