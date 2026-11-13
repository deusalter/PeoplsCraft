// The world map (section 6, World map): a stone slab with a tab for each place the crew can chart, the chart in a well
// that pans and zooms by whole steps, the known places in a list, and Travel where the world allows a crossing.
import { ALTAR_MARK, GATE_MARK, MAP_HEIGHT, MAP_LIT, MAP_SHALLOWS, MAP_SHORE, MAP_TEXTURE, MAP_TONES, type MapKind, MOUTH_MARK, OWN_ARROW, type Texture } from '../art/chart';
import { GROUND, GROUND_H, GROUND_W } from '../art/ground';
import { HEADS } from '../art/heads';
import { COMPASS_MARKS, PING } from '../art/marks';
import { SILHOUETTES } from '../art/silhouettes';
import { clock, count, measure } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { KeyEv, Node, Screen, Ui } from '../node';
import { type Colour, SEATS } from '../palette';
import { button } from '../parts/button';
import { frameWell, type RowSpec, well } from '../parts/well';
import { tabbedSlab } from '../parts/tabs';
import { CHUNK, type Place, countryAt, FELL, groundAt, ME, PINGS, PLACES, STORE, WALK_RADIUS, WALKED } from '../sample/map';
import type { Surface } from '../surface';
import { firstFocus, go, placeWindow } from './books-common';
import type { NamedScreen } from './index';

export type ChartTab = 'ground' | 'store';

export interface MapView {
  tab: ChartTab;
  /** Strides to the unit: 8, 4 or 2. */
  zoom: number;
  /** The place at the middle of the chart, in strides. */
  centre: { x: number; z: number };
  places: Place[];
  chosen: number;
  pings: { seat: number; x: number; z: number }[];
  /** Seconds the Recall Stone still cools. */
  cooling(t: number): number;
  onTab(t: ChartTab): void;
  onPan(x: number, z: number): void;
  onZoom(z: number): void;
  onChoose(i: number): void;
  onPing(x: number, z: number): void;
  onTravel(p: Place): void;
  onClose(): void;
}

// The chart is 178 by 168 so that the list beside it is 110 wide and its places' names are not cut.
const W = 312, H = 212, CW = 178, CH = 168, ZOOMS = [8, 4, 2], LIST_X = 194, LIST_W = 110;
const TABS: { key: ChartTab; icon: string; name: string }[] = [
  { key: 'ground', icon: 'turf', name: 'The Living Ground' },
  { key: 'store', icon: 'codex:place_dungeon', name: STORE.name },
];

/** Whether a place lies in a chunk the crew has walked through, to tell known ground from ground not yet walked. */
const SEGS = WALKED.flatMap((w) => w.slice(1).map((p, i) => [w[i], p] as const));
const known = new Map<number, boolean>();
function walked(px: number, pz: number): boolean {
  const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);
  const k = cx * 65536 + cz;
  let v = known.get(k);
  if (v === undefined) { v = nearWay((cx + 0.5) * CHUNK, (cz + 0.5) * CHUNK); known.set(k, v); }
  return v;
}
function nearWay(x: number, z: number): boolean {
  const r2 = WALK_RADIUS * WALK_RADIUS;
  for (const [[ax, az], [bx, bz]] of SEGS) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const ex = ax + t * dx - x, ez = az + t * dz - z;
    if (ex * ex + ez * ez <= r2) return true;
  }
  return false;
}

/**
 * The living ground, drawn at one scale: cells of 2 by 2 units, each one of the eight kinds in its flat tone, ground not
 * yet walked as parchment. A cell whose neighbour above or to the left stands lower takes its kind's lit tone, one whose
 * neighbour below or to the right stands lower its edge tone, so that rises read lit from the top left; water beside
 * land is the shallows, a band one cell wide, with a line of surf one unit wide where it touches the land. Each face
 * carries its kind's marks on a grid fixed to the world (grass tufts, grains of sand, crowns of trees, ripples), so that
 * a fill reads as ground. Where parchment meets the known a rule of one unit of root.0 runs along it.
 */
const CELL = 2;
function paintGround(s: Surface, v: MapView): void {
  const z = v.zoom * CELL, cx = v.centre.x, cz = v.centre.z;
  const nw = CW / CELL, nh = CH / CELL, gw = nw + 2, gh = nh + 2;
  const kinds: MapKind[] = new Array(gw * gh);
  for (let row = 0; row < gh; row++) {
    for (let u = 0; u < gw; u++) {
      const wx = cx + (u - 1 - nw / 2 + 0.5) * z, wz = cz + (row - 1 - nh / 2 + 0.5) * z;
      kinds[row * gw + u] = walked(wx, wz) ? groundAt(wx, wz) : 'unknown';
    }
  }
  const at = (u: number, row: number) => kinds[(row + 1) * gw + u + 1];
  const lower = (n: MapKind, k: MapKind) => n !== 'unknown' && MAP_HEIGHT[n] < MAP_HEIGHT[k];
  const land = (n: MapKind) => n !== 'unknown' && n !== 'water';
  // Whether a cell shows its kind's plain face, which alone takes marks.
  const plain = new Uint8Array(nw * nh);
  for (let row = 0; row < nh; row++) {
    let run = 0, runC: Colour | null = null;
    for (let u = 0; u <= nw; u++) {
      let c: Colour | null = null;
      if (u < nw) {
        const k = at(u, row);
        const up = at(u, row - 1), left = at(u - 1, row), down = at(u, row + 1), right = at(u + 1, row);
        if (k === 'unknown') c = MAP_TONES.unknown[0];
        else if (k === 'water') c = [up, left, down, right].some(land) ? MAP_SHALLOWS : MAP_TONES.water[0];
        else if (lower(up, k) || lower(left, k)) c = MAP_LIT[k];
        else if (lower(down, k) || lower(right, k)) c = MAP_TONES[k][1];
        else c = MAP_TONES[k][0];
        if (k !== 'unknown' && c === MAP_TONES[k][0]) plain[row * nw + u] = 1;
      }
      if (c !== runC) {
        if (runC) s.fill((u - run) * CELL, row * CELL, run * CELL, CELL, runC);
        runC = c; run = 0;
      }
      run++;
    }
  }
  // The marks, on a grid of the world's units so that they move with the ground as it pans.
  const ox = Math.round(cx / v.zoom) - CW / 2, oy = Math.round(cz / v.zoom) - CH / 2;
  const fits = (k: MapKind, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= CW || y >= CH) return false;
    const u = Math.floor(x / CELL), row = Math.floor(y / CELL);
    return at(u, row) === k && plain[row * nw + u] === 1;
  };
  for (const [k, t] of Object.entries(MAP_TEXTURE) as [MapKind, Texture][]) {
    const gy0 = Math.floor(oy / t.py) - 1, gy1 = Math.ceil((oy + CH) / t.py);
    for (let gy = gy0; gy <= gy1; gy++) {
      const shift = ((gy % 2) + 2) % 2 ? Math.floor(t.px / 2) : 0;
      const gx0 = Math.floor((ox - shift) / t.px) - 1, gx1 = Math.ceil((ox + CW - shift) / t.px);
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = gx * t.px + shift - ox, y = gy * t.py - oy;
        if (!t.mark.every(([dx, dy]) => fits(k, x + dx, y + dy))) continue;
        for (const [dx, dy, c] of t.mark) s.fill(x + dx, y + dy, 1, 1, c);
      }
    }
  }
  for (let row = 0; row < nh; row++) {
    for (let u = 0; u < nw; u++) {
      const x = u * CELL, y = row * CELL;
      const k = at(u, row);
      if (k === 'water') {
        if (land(at(u, row - 1))) s.fill(x, y, CELL, 1, MAP_SHORE);
        if (land(at(u, row + 1))) s.fill(x, y + CELL - 1, CELL, 1, MAP_SHORE);
        if (land(at(u - 1, row))) s.fill(x, y, 1, CELL, MAP_SHORE);
        if (land(at(u + 1, row))) s.fill(x + CELL - 1, y, 1, CELL, MAP_SHORE);
        continue;
      }
      if (k !== 'unknown') continue;
      if (at(u, row - 1) !== 'unknown') s.fill(x, y, CELL, 1, 'root.0');
      if (at(u, row + 1) !== 'unknown') s.fill(x, y + CELL - 1, CELL, 1, 'root.0');
      if (at(u - 1, row) !== 'unknown') s.fill(x, y, 1, CELL, 'root.0');
      if (at(u + 1, row) !== 'unknown') s.fill(x + CELL - 1, y, 1, CELL, 'root.0');
    }
  }
}

/** How far a place is and which way, as the eight winds. */
function way(p: Place): string {
  const dx = p.x - ME.x, dz = p.z - ME.z;
  const d = Math.round(Math.hypot(dx, dz));
  const winds = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  return `${count(d)} ${winds[((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8]}`;
}

function unitOf(v: MapView, x: number, z: number): [number, number] {
  return [Math.round(CW / 2 + (x - v.centre.x) / v.zoom), Math.round(CH / 2 + (z - v.centre.z) / v.zoom)];
}

function paintMarks(s: Surface, v: MapView): void {
  const mark = (x: number, z: number, f: (u: number, w: number) => void) => { const [u, w] = unitOf(v, x, z); f(u, w); };
  for (const p of v.places) {
    if (p.kind === 'altar') mark(p.x, p.z, (u, w) => s.map(ALTAR_MARK, u - 3, w - 3));
    if (p.kind === 'gate') mark(p.x, p.z, (u, w) => s.map(GATE_MARK, u - 3, w - 3));
    if (p.kind === 'mouth') mark(p.x, p.z, (u, w) => s.map(MOUTH_MARK, u - 3, w - 3));
    if (p.kind === 'bed') mark(p.x, p.z, (u, w) => s.map(COMPASS_MARKS.bed, u - 3, w - 3));
  }
  mark(FELL.x, FELL.z, (u, w) => s.map(COMPASS_MARKS.fell, u - 3, w - 3));
  for (const p of v.pings) mark(p.x, p.z, (u, w) => s.draw(PING, u - 4, w - 6, { tint: SEATS[p.seat - 1] }));
  for (const p of v.places) if (p.kind === 'friend') mark(p.x, p.z, (u, w) => s.map(HEADS[p.seat! - 1], u - 5, w - 5));
  mark(ME.x, ME.z, (u, w) => s.draw(OWN_ARROW[ME.facing], u - 3, w - 3, { tint: SEATS[0] }));
}

/** The sealed store: its rooms drawn on the ground tile as they are entered, doors as gaps, a locked one with a key on it. */
function paintStore(s: Surface, v: MapView): void {
  const z = v.zoom;
  const [ox, oy] = unitOf(v, 0, 0);
  s.tile(GROUND, 0, 0, CW, CH, ((-ox % GROUND_W) + GROUND_W) % GROUND_W, ((-oy % GROUND_H) + GROUND_H) % GROUND_H);
  for (const r of STORE.rooms) {
    const x = ox + Math.round(r.x / z), y = oy + Math.round(r.z / z), w = Math.round(r.w / z), h = Math.round(r.h / z);
    s.fill(x, y, w, h, 'root.0');
    s.fill(x + 1, y + 1, w - 2, h - 2, 'stone.lt');
  }
  for (const d of STORE.doors) {
    const x = ox + Math.round(d.x / z), y = oy + Math.round(d.z / z);
    const len = Math.max(2, Math.round(8 / z));
    if (d.locked) {
      if (d.across) s.fill(x, y - 1, len, 2, 'ember'); else s.fill(x - 1, y, 2, len, 'ember');
      s.draw(SILHOUETTES.key, x - 7, y - 4, { flat: 'salt' });
    } else if (d.across) s.fill(x, y - 1, len, 2, 'stone.lt');
    else s.fill(x - 1, y, 2, len, 'stone.lt');
  }
  const [u, w] = unitOf(v, STORE.at.x, STORE.at.z);
  s.map(HEADS[STORE.at.seat - 1], u - 5, w - 5);
}

export const mapScreen: Screen<MapView> = (v, ui) => {
  firstFocus(ui, 'map', null);
  const ground = v.tab === 'ground';
  const place = v.places[v.chosen];
  let from = { ...v.centre };
  const hover = { x: 0, z: 0, on: false, friend: null as Place | null };
  // The friend whose head is under the pointer, so that heads told apart only by their frame can be named.
  const friendAt = (ex: number, ey: number): Place | null => {
    if (!ground) return null;
    for (const p of v.places) {
      if (p.kind !== 'friend') continue;
      const [u, w] = unitOf(v, p.x, p.z);
      if (ex >= u - 5 && ex < u + 5 && ey >= w - 5 && ey < w + 5) return p;
    }
    return null;
  };
  const chart: Node = {
    id: `map.chart.${v.tab}`, x: 0, y: 0, w: CW, h: CH, takes: true,
    paint: (s) => (ground ? (paintGround(s, v), paintMarks(s, v)) : paintStore(s, v)),
    on: {
      down: (e) => {
        from = { ...v.centre };
        if (e.button === 2 && ground) v.onPing(v.centre.x + (e.x - CW / 2) * v.zoom, v.centre.z + (e.y - CH / 2) * v.zoom);
      },
      drag: (e) => { if (e.phase !== 'end' && e.button === 0) v.onPan(from.x - e.dx * v.zoom, from.z - e.dy * v.zoom); },
      wheel: (e) => { v.onZoom(e.notches > 0 ? -1 : 1); return true; },
      move: (e) => {
        hover.on = true; hover.x = Math.round(v.centre.x + (e.x - CW / 2) * v.zoom); hover.z = Math.round(v.centre.z + (e.y - CH / 2) * v.zoom);
        const f = friendAt(e.x, e.y);
        if (f !== hover.friend) { hover.friend = f; ui.wake(); }
      },
      leave: () => { hover.on = false; hover.friend = null; ui.wake(); },
    },
  };
  const rows: RowSpec[] = v.places.map((p) => {
    return { id: p.id, icon: p.icon, name: p.name, colour: p.seat ? SEATS[p.seat - 1] : 'salt' };
  });
  const cooling = place?.cooling !== undefined;
  const builtOpen = cooling && v.cooling(ui.t) <= 0;
  const kids: Node[] = [
    frameWell({ x: 8, y: 18, w: CW + 2, h: CH + 2, host: 'stone', kids: [chart] }),
    {
      x: 8, y: 194, w: CW - 32, h: 10,
      paint: (s) => {
        const t = !hover.on ? (ground ? 'Point at the chart' : STORE.name)
          : ground ? `X ${hover.x}  Z ${hover.z}, ${walked(hover.x, hover.z) ? countryAt(hover.x, hover.z).name : 'not walked'}` : `X ${hover.x}  Z ${hover.z}`;
        s.text(cut(t, CW - 32), 0, 0, hover.on ? 'ink' : 'ink.faded');
      },
    },
    button({ id: 'map.out', x: CW - 20, y: 192, w: 14, h: 14, ramp: 'stone', label: '-', disabled: v.zoom === ZOOMS[0], onPress: () => v.onZoom(-1) }),
    button({ id: 'map.in', x: CW - 4, y: 192, w: 14, h: 14, ramp: 'stone', label: '+', disabled: v.zoom === ZOOMS[ZOOMS.length - 1], onPress: () => v.onZoom(1) }),
    well({
      id: 'map.places', x: LIST_X, y: 18, w: LIST_W, h: 130, rowH: 16, host: 'stone', ui, rows, chosen: v.chosen,
      onChoose: (i) => { v.onChoose(i); v.onPan(v.places[i].x, v.places[i].z); },
    }),
    button({ id: 'map.travel', x: LIST_X, y: 152, w: LIST_W, h: 16, ramp: 'stone', label: 'Travel', disabled: !builtOpen, onPress: () => place && v.onTravel(place) }),
    {
      x: LIST_X, y: 172, w: LIST_W, h: 30, anim: cooling,
      paint: (s) => {
        if (!place) return;
        const left = Math.ceil(v.cooling(ui.t));
        if (cooling && (left <= 0) !== builtOpen) ui.invalidate();
        const t = !cooling ? `${place.crossing}. ${way(place)}` : left > 0 ? `${place.crossing}, cooling ${clock(left)}` : `${place.crossing}, ready`;
        for (const l of box(t, LIST_W, 3).lines) s.text(l.text, 0, l.y, cooling && left <= 0 ? 'growth.dk' : 'ink');
      },
    },
    {
      // The name tag (5.25) of the friend under the pointer, over their head, drawn last so that neither the chart's
      // edge nor the list cuts it.
      x: 0, y: 0, w: W, h: H,
      paint: (s) => {
        const f = hover.friend;
        if (!f) return;
        const [u, w] = unitOf(v, f.x, f.z);
        const tw = measure(f.name) + 10;
        const tx = Math.max(0, Math.min(W - tw, 9 + u - Math.floor(tw / 2))), ty = 19 + w - 5 - 13;
        s.fill(tx, ty, tw, 11, 'root.1');
        s.fill(tx + 1, ty + 2, 2, 7, SEATS[f.seat! - 1]);
        s.text(f.name, tx + 5, ty, 'salt', true);
      },
    },
  ];
  const at = placeWindow(ui, W, H, 21);
  const slab = tabbedSlab({
    id: 'map.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'stone', edge: 'top',
    title: ground ? `The Living Ground, ${countryAt(ME.x, ME.z).name}` : STORE.name,
    tabs: TABS.map((t) => ({ id: `map.tab.${t.key}`, icon: t.icon, name: t.name })),
    chosen: TABS.findIndex((t) => t.key === v.tab), onTab: (i) => { ui.cue('tab'); v.onTab(TABS[i].key); }, kids,
  });
  return {
    id: 'map', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [slab],
    on: {
      key: (e: KeyEv) => {
        if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') { v.onClose(); return true; }
        if (e.key === '1') { v.onTab('ground'); return true; }
        if (e.key === '2') { v.onTab('store'); return true; }
        if (e.key === '+' || e.key === '=') { v.onZoom(1); return true; }
        if (e.key === '-') { v.onZoom(-1); return true; }
        const d: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
        if (d[e.key] && !ui.focused()?.startsWith('place.')) { v.onPan(v.centre.x + d[e.key][0] * v.zoom, v.centre.z + d[e.key][1] * v.zoom); return true; }
      },
    },
  };
};

// The sample keeps the chart's place, zoom, pings and the stone's cooling while the page is open.
function sample(name: string, title: string, tab: ChartTab): NamedScreen {
  const st = { tab, zoomI: { ground: 1, store: 2 } as Record<ChartTab, number>, centre: { ground: { x: ME.x, z: ME.z }, store: { x: 90, z: 40 } } as Record<ChartTab, { x: number; z: number }>, chosen: 0, pings: [...PINGS], cooledFrom: 3, cool: 12 };
  return {
    name, title, world: true,
    build: (ui: Ui) => mapScreen({
      tab: st.tab, zoom: ZOOMS[st.zoomI[st.tab]], centre: st.centre[st.tab], places: PLACES, chosen: st.chosen, pings: st.pings,
      // The stone stands at its cooling for the page's first three seconds, so that a shot holds still, then counts down.
      cooling: (t) => Math.max(0, st.cool - Math.max(0, t - st.cooledFrom)),
      onTab: (t) => { st.tab = t; ui.invalidate(); },
      onPan: (x, z) => { st.centre[st.tab] = { x: Math.round(x), z: Math.round(z) }; ui.invalidate(); },
      onZoom: (d) => { st.zoomI[st.tab] = Math.max(0, Math.min(ZOOMS.length - 1, st.zoomI[st.tab] + d)); ui.invalidate(); },
      onChoose: (i) => { st.chosen = i; ui.invalidate(); },
      onPing: (x, z) => { st.pings = [...st.pings.filter((p) => p.seat !== 1), { seat: 1, x: Math.round(x), z: Math.round(z) }]; ui.invalidate(); },
      onTravel: (p) => { ME.x = p.x - 4; ME.z = p.z + 6; st.centre.ground = { x: ME.x, z: ME.z }; st.cool = 30; st.cooledFrom = ui.t; ui.invalidate(); },
      onClose: () => go('hud'),
    }, ui),
  };
}

export const SCREENS: NamedScreen[] = [
  sample('map', 'World map: the living ground', 'ground'),
  sample('map-store', 'World map: inside a sealed store', 'store'),
];
