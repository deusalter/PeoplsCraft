// The second sheet: buttons, tabs, a list in its well with the scroll track, fields, checkboxes, sliders, key caps.
import { measure } from '../font/measure';
import type { Node } from '../node';
import { button, plusButton } from '../parts/button';
import { checkbox, field, slider } from '../parts/controls';
import { keycap } from '../parts/keycap';
import { slab } from '../parts/slab';
import { tabbedSlab } from '../parts/tabs';
import { type RowSpec, slabTrack, well } from '../parts/well';
import { type Sheet, ink, page, salt } from './common';

const TABS = [
  { id: 'tab.pack', icon: 'pack', name: 'Pack' },
  { id: 'tab.body', icon: 'body', name: 'Body' },
  { id: 'tab.patterns', icon: 'patterns', name: 'Patterns' },
  { id: 'tab.skills', icon: 'skills', name: 'Skills' },
];

const ROWS: RowSpec[] = [
  { id: 'row.0', icon: 'ingot', name: 'Bar of lees-iron', num: 12 },
  { id: 'row.1', icon: 'crystal', name: 'Shard of the Hollow', colour: 'violet.lt', num: 3, force: { hover: true } },
  { id: 'row.2', icon: 'pendant', name: 'Amāvassa’s lamp', colour: 'ember.hi', num: 1 },
  { id: 'row.3', icon: 'tonic', name: 'Red tonic', num: 1240, numColour: 'blood.lt', disabled: true },
  { id: 'row.4', icon: 'loaf', name: 'Loaf', num: 7 },
  { id: 'row.5', icon: 'key', name: 'Key to the kiln', num: 1 },
];

export const controlsSheet: Sheet = {
  title: 'Parts: buttons, tabs and controls',
  world: true,
  build(ui) {
    const kids: Node[] = [];
    // Buttons: on the world, in every state.
    const bw = 98;
    const states: [string, Partial<{ hover: boolean; down: boolean; focus: boolean }>, boolean][] = [
      ['Normal', {}, false], ['Hovered', { hover: true }, false], ['Focused', { focus: true }, false],
      ['Pressed', { hover: true, down: true }, false], ['Disabled', {}, true],
    ];
    states.forEach(([name, force, disabled], i) => {
      kids.push(button({ id: `btn.${i}`, x: 0, y: i * 22, w: bw, label: name, force, disabled }));
    });
    kids.push(button({ id: 'btn.wide', x: 0, y: 112, w: 200, label: 'Back to the world' }));
    kids.push(button({ id: 'btn.cycle', x: 102, y: 0, w: 98, label: 'Graphics: low' }));
    // Small buttons on a slab.
    const sm = (y: number, h: 12 | 14 | 16, label: string, force = {}) => button({ id: `sm.${h}.${label}`, x: 8, y, w: measure(label) + 10, h, label, force });
    kids.push(slab({
      x: 102, y: 22, w: 98, h: 87, ramp: 'clay', title: 'Small ones',
      kids: [sm(18, 12, 'Sort'), sm(33, 14, 'Take all'), sm(50, 16, 'Mend', { hover: true }), plusButton({ id: 'sm.plus', x: 60, y: 18 }), ink(8, 70, '12, 14, 16 tall', 'ink.faded')],
    }));
    // Tabs on the top edge, the second chosen, the third hovered; side tabs on a stone slab.
    kids.push(tabbedSlab({
      id: 'tabbed', x: 206, y: 21, w: 120, h: 60, ramp: 'clay', title: 'Tabs on top', edge: 'top', tabs: TABS, chosen: 1,
      forceTab: { i: 2, force: { hover: true } },
      kids: [ink(8, 20, 'The chosen tab', 'ink.faded'), ink(8, 30, 'joins the face.', 'ink.faded')],
    }));
    kids.push(tabbedSlab({
      id: 'sided', x: 352, y: 0, w: 122, h: 82, ramp: 'stone', title: 'Side tabs', edge: 'left', tabs: TABS.slice(0, 3), chosen: 1,
      kids: [ink(8, 20, 'Folded panels', 'ink.faded'), ink(8, 30, 'of a narrow', 'ink.faded'), ink(8, 40, 'screen.', 'ink.faded')],
    }));
    // A list in a well, with its track and a thumb; a second well whose thumb is hovered.
    kids.push(slab({
      x: 206, y: 86, w: 268, h: 92, ramp: 'clay', title: 'A list in its well',
      kids: [
        well({ id: 'list', x: 8, y: 18, w: 160, h: 66, host: 'clay', rows: ROWS, chosen: 2, ui }),
        well({ id: 'list2', x: 172, y: 18, w: 88, h: 66, host: 'clay', rows: ROWS.slice(0, 5).map((r) => ({ ...r, force: undefined, id: `${r.id}b` })), thumbForce: { hover: true }, ui }),
      ],
    }));
    // Fields, checkboxes and sliders on a timber slab.
    kids.push(slab({
      x: 0, y: 136, w: 202, h: 126, ramp: 'timber', title: 'Fields',
      kids: [
        field({ id: 'f.empty', x: 8, y: 18, w: 90, value: '', placeholder: 'Name', host: 'timber', ui }),
        field({ id: 'f.full', x: 104, y: 18, w: 90, value: 'Hearth of Ash', host: 'timber', ui }),
        field({ id: 'f.focus', x: 8, y: 36, w: 90, value: 'Kiln row', host: 'timber', show: { focus: true }, ui }),
        field({ id: 'f.sel', x: 104, y: 36, w: 90, value: 'Īshū kilns', host: 'timber', show: { focus: true, select: [0, 4] }, ui }),
        field({ id: 'f.ref', x: 8, y: 54, w: 90, value: 'No ~ here', host: 'timber', show: { refused: true }, ui }),
        field({ id: 'f.pw', x: 104, y: 54, w: 90, value: 'secret', password: true, host: 'timber', ui }),
        checkbox({ id: 'c.off', x: 8, y: 74, on: false, label: 'Off', host: 'timber' }),
        checkbox({ id: 'c.on', x: 60, y: 74, on: true, label: 'On', host: 'timber' }),
        checkbox({ id: 'c.hov', x: 104, y: 74, on: true, label: 'Hovered', host: 'timber', force: { hover: true } }),
        slider({ id: 's.a', x: 8, y: 92, w: 90, value: 0.35, host: 'timber', ui }),
        slider({ id: 's.b', x: 104, y: 92, w: 90, value: 0.8, host: 'timber', force: { hover: true }, ui }),
        ink(8, 108, 'A slider and a hovered one', 'ink.faded'),
      ],
    }));
    // Fields of a full-screen menu, on the ground; key caps.
    kids.push(slab({
      x: 206, y: 182, w: 268, h: 80, ramp: 'stone', title: 'Key caps and a menu field',
      kids: [
        keycap({ x: 8, y: 20, label: 'E' }), ink(20, 20, 'Pack'),
        keycap({ x: 52, y: 20, label: 'Shift' }), ink(52 + measure('Shift') + 9, 20, 'Send'),
        keycap({ x: 130, y: 20, label: 'Esc' }), ink(130 + measure('Esc') + 9, 20, 'Close'),
        field({ id: 'f.menu', x: 8, y: 40, w: 160, h: 16, value: 'Hearth of Ash', host: 'stone', ui }),
        checkbox({ id: 'c.st', x: 176, y: 42, on: true, label: 'Cheats', host: 'stone' }),
        ink(8, 62, 'A field 16 tall, as a menu has it', 'ink.faded'),
        slabTrack({ id: 'track.slab', x: 254, y: 18, h: 54, ramp: 'stone', top: 2, visible: 4, total: 9 }),
        ink(214, 62, 'Track', 'ink.faded'),
      ],
    }));
    return page(ui, kids);
  },
};
