// The kit's own page: one named screen from the registry, on a stand-in world or on the ground tile.
//   uikit.html?screen=type&scale=3     ?screen=index lists the screens     &strict=1 draws washes opaque
import { FRAMED_PLATE, PLATE, SLAB } from './art/slab';
import { DARK_SLOT, SLOT } from './art/slot';
import { GROUND } from './art/ground';
import { POINTER } from './art/pointer';
import { SMALL, TEXT } from './font/face';
import { count, measure, rightX } from './font/measure';
import { box, cut } from './font/wrap';
import type { Node, Ui } from './node';
import { type Colour, type Ramp, COLOURS, GRADES, HEX, tone } from './palette';
import { Root, heldStack } from './root';
import { type IconImage, WORLD, BLEND, IMAGE } from './surface';
import { paintTip, tipBox } from './tooltip';
import { centred } from './scale';
import { ITEMS } from './mock/icons';
import { TAB_MARKS } from './art/icons';
import { SHEETS } from './sheets';
import { SAMPLE_ICONS, SCREEN_FILES } from './screens';
import { well } from './parts/well';

interface DemoScreen {
  title: string;
  /** The world stands behind it, dimmed; otherwise the ground tile fills the screen. */
  world: boolean;
  build(ui: Ui): Node;
}

const params = new URLSearchParams(location.search);
const strict = params.get('strict') === '1';
const fault = params.get('fault');

// ---- sample icons: pictures standing in for the game's, deliberately outside the palette

function icon(paint: (x: number, y: number) => [number, number, number] | null): IconImage {
  const rgba = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = paint(x, y);
    if (!c) continue;
    rgba.set([...c, 255], (y * 16 + x) * 4);
  }
  return { w: 16, h: 16, rgba };
}

const ICONS: Record<string, IconImage> = {
  block: icon((x, y) => {
    if (x < 1 || y < 1 || x > 14 || y > 14) return null;
    if (x === 1 || y === 1) return [150, 186, 96];
    if (x === 14 || y === 14) return [64, 88, 44];
    return (x * 7 + y * 3) % 5 === 0 ? [96, 132, 64] : [118, 156, 78];
  }),
  ingot: icon((x, y) => {
    if (y < 6 || y > 12) return null;
    const l = 3 - Math.floor((y - 6) / 2), r = 12 + Math.floor((y - 6) / 2);
    if (x < l || x > r) return null;
    if (y === 6) return [236, 228, 200];
    if (y === 12 || x === r) return [120, 104, 80];
    return x === l ? [220, 206, 170] : [188, 170, 128];
  }),
  shard: icon((x, y) => {
    const d = Math.abs(x - 8) + Math.abs(y - 8);
    if (d > 6) return null;
    if (d === 6) return x + y <= 16 ? [180, 240, 255] : [40, 90, 140];
    return x + y < 15 ? [110, 190, 235] : [70, 140, 200];
  }),
};

// ---- the type sheet

const CHARSET = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789  Ā ā Ī ī Ū ū ṭ',
  ". , : ; ! ? ' \" ( ) [ ] { } - – — + = / \\",
  '* % # & _ < > @ ~ ^ | ` $ × … °',
  '{tofu} {lees} {check} {cross} {right} {left} {up} {down} {step} {shield} {lmb} {rmb} {mmb}',
];
// The small face is shown only doing its one job, counts with no room for the text face, under a label in the text face:
// set out as a second alphabet it read as a second font for words.
const SMALL_LABEL = 'Counts with no room:';
const SMALL_SET = '128   999   1k   12k   0:08   12';
const PARAGRAPH = 'Salt-fired clay, pale and warm, holds the pack. What is written on it is written in lees. ' +
  'The old road to Amāvassa runs past the kilns of Īshū, where the jars are counted at 1,240 {lees} a cart.\n' +
  'A line too long for its box is cut.';
const NUMBERS = [7, 64, 1240, 12000];

function slab(x: number, y: number, w: number, h: number, ramp: Ramp, kids: Node[] = []): Node {
  return { x, y, w, h, paint: (s) => s.nine(SLAB, 0, 0, w, h, ramp), kids };
}
function plate(x: number, y: number, w: number, h: number, kids: Node[] = []): Node {
  return { x, y, w, h, paint: (s) => s.nine(PLATE, 0, 0, w, h), kids };
}
function label(x: number, y: number, text: string, c: Colour, shadow = false, face = TEXT): Node {
  return { x, y, w: Math.max(1, measure(text, face)), h: face.height, paint: (s) => { s.text(text, 0, 0, c, shadow, face); } };
}

/** The specimen on one ground: light (ink, no shadow) or dark (salt, shadow). */
function specimen(dark: boolean, w: number): Node[] {
  const ink: Colour = dark ? 'salt' : 'ink', less: Colour = dark ? 'root.4' : 'ink.faded';
  const out: Node[] = [label(8, 6, dark ? 'On a dark plate' : 'On a clay slab', ink, dark)];
  CHARSET.forEach((line, i) => out.push(label(8, 18 + i * 10, line, ink, dark)));
  out.push(label(8, 79, SMALL_LABEL, less, dark));
  out.push(label(8 + measure(SMALL_LABEL) + 6, 82, SMALL_SET, ink, dark, SMALL));
  const right = w - 9;
  const para = box(PARAGRAPH, right - 8 - 40, 4);
  out.push({ x: 8, y: 94, w: right - 48, h: para.h, paint: (s) => { for (const l of para.lines) s.text(l.text, 0, l.y, ink, dark); } });
  NUMBERS.forEach((n, i) => {
    const str = count(n);
    out.push(label(rightX(str, right), 94 + i * 10, str, ink, dark));
  });
  return out;
}

/** Every colour's name in that colour, flowing in lines. */
function swatches(dark: boolean, width: number): { nodes: Node[]; h: number } {
  const nodes: Node[] = [];
  let x = 0, y = 0;
  for (const c of COLOURS) {
    const w = measure(c);
    if (x > 0 && x + w > width) { x = 0; y += 10; }
    nodes.push(label(x, y, c, c, dark));
    x += w + 5;
  }
  return { nodes, h: y + 10 };
}

const typeScreen: DemoScreen = {
  title: 'Type',
  world: true,
  build(ui) {
    const colW = 236, topH = 138;
    const sw = swatches(false, colW - 16);
    const botH = 18 + sw.h + 4;
    const W = colW * 2 + 2, H = topH + 2 + botH;
    const at = centred(ui.w, ui.h, W, H);
    const lightSw = swatches(false, colW - 16), darkSw = swatches(true, colW - 16);
    return {
      x: 0, y: 0, w: ui.w, h: ui.h,
      paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
      kids: [{
        x: Math.max(0, at.x), y: Math.max(0, at.y), w: W, h: H,
        kids: [
          slab(0, 0, colW, topH, 'clay', specimen(false, colW)),
          plate(colW + 2, 0, colW, topH, specimen(true, colW)),
          slab(0, topH + 2, colW, botH, 'clay', [label(8, 6, 'Every colour', 'ink'), { x: 8, y: 18, w: colW - 16, h: sw.h, kids: lightSw.nodes }]),
          plate(colW + 2, topH + 2, colW, botH, [label(8, 6, 'Every colour', 'salt', true), { x: 8, y: 18, w: colW - 16, h: sw.h, kids: darkSw.nodes }]),
        ],
      }],
    };
  },
};

// ---- the parts sheet

function slotGrid(id: string, cols: number, rows: number, ramp: Ramp, fill: (i: number) => { icon: string; n: number; grade: number } | null): Node {
  const kids: Node[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const item = fill(i);
    kids.push({
      id: `${id}.${i}`, x: (i % cols) * 18, y: Math.floor(i / cols) * 18, w: 18, h: 18, focus: true,
      paint: (s, live) => {
        s.nine(SLOT, 0, 0, 18, 18, ramp);
        if (live.hover) s.fill(1, 1, 16, 16, tone(ramp, 'sh'));
        if (live.focus) { s.fill(1, 1, 16, 1, 'salt'); s.fill(1, 16, 16, 1, 'salt'); s.fill(1, 2, 1, 14, 'salt'); s.fill(16, 2, 1, 14, 'salt'); }
        if (item) {
          s.icon(item.icon, 1, 1);
          if (item.n > 1) { const t = String(item.n); s.text(t, rightX(t, 16), 9, 'salt', true); }
        }
      },
      tip: () => item ? {
        frame: GRADES[item.grade].frame,
        lines: [
          { text: item.icon === 'block' ? 'Turf' : item.icon === 'ingot' ? 'Iron Bar' : 'Shard', c: GRADES[item.grade].dark },
          { text: `${GRADES[item.grade].name} grade, ${item.icon === 'shard' ? 'stone' : 'material'}`, c: 'root.4' },
          { text: 'Used in making.', c: 'salt' },
          { text: '{lmb} take   {rmb} take half', c: 'root.4' },
        ],
      } : null,
      on: { down: () => ui.cue('take') },
    });
  }
  return { x: 0, y: 0, w: cols * 18, h: rows * 18, kids };
}

function darkSlots(n: number): Node[] {
  return Array.from({ length: n }, (_, i): Node => {
    const it = i === 1 ? null : SAMPLE(i);
    return {
      id: `dark.${i}`, x: i * 18, y: 0, w: 18, h: 18, takes: true,
      paint: (s, live) => {
        s.nine(DARK_SLOT, 0, 0, 18, 18);
        if (live.hover) s.fill(1, 1, 16, 16, 'root.2');
        if (it) { s.icon(it.icon, 1, 1); if (it.n > 1) { const t = String(it.n); s.text(t, rightX(t, 16), 9, 'salt', true); } }
      },
    };
  });
}

const SAMPLE = (i: number) => {
  const k = i % 5;
  if (k === 3) return null;
  return { icon: ['block', 'ingot', 'shard', 'block', 'ingot'][k], n: [64, 1, 3, 0, 12][k] || 1, grade: [0, 1, 3, 0, 6][k] };
};

let fieldValue = 'Hearth on the Yavas';

function demoField(ui: Ui, id: string, x: number, y: number, w: number): Node {
  return {
    id, x, y, w, h: 14,
    field: { value: fieldValue, limit: 32, textX: 4 },
    on: { text: (st) => { fieldValue = st.value; ui.wake(); } },
    paint: (s, live) => {
      const st = ui.field(id);
      const focused = ui.focused() === id;
      s.fill(0, 0, w, 14, 'root.0');
      s.fill(1, 1, w - 2, 12, 'root.1');
      s.fill(1, 13, w - 1, 1, 'root.3');
      s.fill(w - 1, 1, 1, 12, 'root.3');
      if (focused || live.focus) {
        s.fill(1, 1, w - 2, 1, 'salt'); s.fill(1, 12, w - 2, 1, 'salt'); s.fill(1, 2, 1, 10, 'salt'); s.fill(w - 2, 2, 1, 10, 'salt');
      }
      const v = st?.value ?? '';
      if (!v && !focused) { s.text('Name of the world', 4, 2, 'root.4'); return; }
      s.clip(2, 1, w - 4, 12);
      if (st && st.start !== st.end) {
        const a = measure(v.slice(0, st.start)), b = measure(v.slice(0, st.end));
        s.fill(4 + a + (st.start ? 1 : 0), 2, Math.max(1, b - a), 10, 'arm.dk');
      }
      const tw = s.text(v, 4, 2, 'salt', true);
      if (focused && st && Math.floor(ui.t * 2) % 2 === 0) {
        const cx = st.end >= v.length ? 4 + tw + 1 : 4 + measure(v.slice(0, st.end)) + (st.end ? 1 : 0);
        s.fill(cx, 2, 1, 10, 'salt');
      }
      s.unclip();
    },
  };
}

const partsScreen: DemoScreen = {
  title: 'Parts',
  world: true,
  build(ui) {
    const W = 474, H = 262;
    const at = centred(ui.w, ui.h, W, H);
    const tipSample = {
      frame: GRADES[2].frame,
      lines: [{ text: 'Keen Hīrak Pick', c: GRADES[2].dark }, { text: 'Deep grade, tool', c: 'root.4' as Colour }, { text: '+12% speed in stone', c: 'growth.lt' as Colour }, { text: '-1 reach', c: 'blood.lt' as Colour }],
    };
    const tb = tipBox(tipSample);
    const named = { frame: GRADES[6].frame, named: true, lines: [{ text: 'Cairn Lamp', c: GRADES[6].dark }, { text: 'Old, a lamp', c: 'root.4' as Colour }] };
    const nb = tipBox(named);
    const ramps: Ramp[] = ['clay', 'timber', 'stone'];
    const kids: Node[] = ramps.map((r, i) => slab(i * 122, 0, 120, 78, r, [
      label(8, 6, r === 'clay' ? 'Clay slab' : r === 'timber' ? 'Timber slab' : 'Stone slab', 'ink'),
      { ...slotGrid(r, 5, 3, r, (k) => SAMPLE(k + i)), x: 8, y: 18 },
    ]));
    kids.push(
      plate(366, 0, 108, 40, [label(5, 4, 'Plain plate', 'salt', true), label(5, 16, cut('A line that is far too long', 96), 'root.4', true)]),
      { x: 366, y: 42, w: 90, h: 18, kids: darkSlots(5) },
      { x: 0, y: 80, w: tb.w, h: tb.h, paint: (s) => paintTip(s, tipSample, tb, 0, 0) },
      { x: 0, y: 80 + tb.h + 3, w: nb.w, h: nb.h, paint: (s) => paintTip(s, named, nb, 0, 0) },
      { x: 122, y: 146, w: 120, h: 29, paint: (s) => { s.nine(FRAMED_PLATE, 0, 0, 120, 29, { tint: 'blood' }); s.text('A refusal frame', 5, 3, 'blood.lt', true); s.text('{cross} Not enough lees', 5, 15, 'salt', true); } },
      { x: 244, y: 80, w: 112, h: 64, paint: (s) => s.tile(GROUND, 0, 0, 112, 64, 5, 2) },
      { x: 358, y: 80, w: 116, h: 64, paint: (s) => {
        s.nine(SLAB, 0, 0, 116, 64, 'stone');
        s.text('Pointer, held', 8, 6, 'ink');
        s.map(POINTER, 12, 22);
        heldStack('ingot', 12).paint(s, 48, 38);
        heldStack('shard', 1).paint(s, 84, 38);
      } },
      slab(122, 80, 120, 64, 'clay', [label(8, 6, 'A text field', 'ink'), demoField(ui, 'field.name', 8, 20, 104), label(8, 38, 'Press it and type', 'ink.faded')]),
      slab(244, 146, 230, 116, 'timber', [
        label(8, 6, 'Large slot and grid', 'ink'),
        { x: 8, y: 18, w: 26, h: 26, paint: (s) => { s.nine(SLOT, 0, 0, 26, 26, 'timber'); s.icon('ingot', 5, 5); } },
        { ...slotGrid('grid', 9, 2, 'timber', (k) => SAMPLE(k + 2)), x: 8, y: 50 },
        { ...slotGrid('bar', 9, 1, 'timber', (k) => SAMPLE(k)), x: 8, y: 90 },
      ]),
      slab(0, 196, 242, 66, 'clay', [
        label(8, 6, 'Wrapped in a box of three lines', 'ink'),
        { x: 8, y: 18, w: 226, h: 30, paint: (s) => { for (const l of box(PARAGRAPH, 226, 3).lines) s.text(l.text, 0, l.y, 'ink'); } },
      ]),
    );
    const root: Node = {
      x: 0, y: 0, w: ui.w, h: ui.h,
      paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
      kids: [{ x: Math.max(0, at.x), y: Math.max(0, at.y), w: W, h: H, kids }],
    };
    return root;
  },
};

// ---- the index

/** The mark of each family of screens on the index, by the name's first word. */
const FAMILY_ICON: Record<string, string> = {
  type: 'bounty', parts: 'patterns', sample: 'patterns', chat: 'crew', chest: 'chest', codex: 'codex', controls: 'interface',
  fall: 'alert', furnace: 'coal', hud: 'guide', join: 'play', joining: 'tinker_bench', journal: 'guide', loading: 'fresh',
  map: 'map', new: 'fresh', pack: 'pack', pause: 'play', pot: 'tonic', rework: 'ingot', roster: 'crew', settings: 'interface',
  shop: 'key', skills: 'skills', title: 'picture', tooltips: 'alert', workbench: 'workbench', anvil: 'anvil',
  lineframe: 'runeloom', worlds: 'turf',
};

const indexScreen: DemoScreen = {
  title: 'Index',
  world: false,
  build(ui) {
    // A full-screen menu of the kit: the ground tile, the heading on it in salt, and the screens as rows in dark wells
    // side by side, each row its family's mark and the name `?screen=` takes; a well that cannot hold its share scrolls.
    const names = Object.keys(SCREENS).filter((n) => n !== 'index');
    const WW = 150, GAP = 4;
    const cols = Math.max(1, Math.min(4, Math.floor((ui.w - 8 + GAP) / (WW + GAP))));
    const per = Math.ceil(names.length / cols);
    const visible = Math.max(1, Math.floor((ui.h - 22 - 6) / 18));
    const wh = Math.min(per, visible) * 18 + 2;
    const total = cols * WW + (cols - 1) * GAP;
    const x0 = Math.floor((ui.w - total) / 2), y0 = Math.floor((ui.h - 16 - wh) / 2) + 16;
    const kids: Node[] = [label(x0, y0 - 14, 'Screens of the kit', 'salt', true)];
    for (let c = 0; c < cols; c++) {
      const part = names.slice(c * per, (c + 1) * per);
      kids.push(well({
        id: `index.${c}`, x: x0 + c * (WW + GAP), y: y0, w: WW, h: wh, host: 'ground', ui,
        rows: part.map((n) => ({
          id: `screen.${n}`, icon: FAMILY_ICON[n.split('-')[0]] ?? 'patterns', name: n,
          tip: () => ({ lines: [{ text: SCREENS[n].title, c: 'salt' }], delay: 0.4 }),
        })),
        onChoose: (i) => { location.search = `?screen=${part[i]}`; },
      }));
    }
    return { x: 0, y: 0, w: ui.w, h: ui.h, paint: (s) => s.tile(GROUND, 0, 0, ui.w, ui.h), kids };
  },
};

const SCREENS: Record<string, DemoScreen> = { index: indexScreen, type: typeScreen, ...SHEETS, sample: partsScreen, ...SCREEN_FILES };

// ---- the page

const name = params.get('screen') ?? 'index';
const screen = SCREENS[name] ?? indexScreen;
const scaleParam = params.get('scale');

const world = document.getElementById('world');
if (world) world.style.display = screen.world && !strict ? 'block' : 'none';
document.body.style.background = strict ? HEX[COLOURS.indexOf('stone.pit')] : '#000';

const ui = new Root({
  strict,
  scale: scaleParam ? Math.max(1, Math.floor(Number(scaleParam)) || 1) : 'auto',
  icons: (k) => ITEMS[k] ?? TAB_MARKS[k] ?? SAMPLE_ICONS[k] ?? ICONS[k] ?? null,
});
const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
ui.mount('window', {
  build: (u) => {
    const n = screen.build(u);
    // A part on a half unit, which the kit must refuse to draw: the self-test of the pixel-grid check plants it.
    if (fault === 'half') n.kids = [...(n.kids ?? []), { x: 10.5, y: 3, w: 8, h: 8, paint: (s) => s.fill(0, 0, 8, 8, 'blood') }];
    return n;
  },
  modal: true,
});

/** What the scripts read: the grid the frame was drawn on, and the units that are not the palette's by design. */
const hook = {
  name, screens: Object.keys(SCREENS), errors, ready: false,
  palette: HEX,
  frame() {
    ui.step();
    const L = ui.layout;
    const g = ui.gridFrame();
    let exempt = '';
    for (let i = 0; i < g.cells.length; i++) {
      const c = g.cells[i];
      exempt += c === WORLD ? 'w' : c === BLEND ? 'b' : c === IMAGE ? 'i' : '.';
    }
    return { s: L.s, ox: L.ox, oy: L.oy, w: L.w, h: L.h, W: L.W, H: L.H, cells: Array.from(g.cells), exempt, strict, palette: Array.from(HEX) };
  },
};
(window as unknown as { __uikit: typeof hook }).__uikit = hook;

function settle(n: number): void {
  if (n === 0) { try { ui.step(); hook.ready = true; } catch (e) { errors.push(String(e)); hook.ready = true; } return; }
  requestAnimationFrame(() => settle(n - 1));
}
settle(3);

