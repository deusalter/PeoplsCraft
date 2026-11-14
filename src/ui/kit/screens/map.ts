// The world map (section 6, World map): a stone slab with a tab for each place the crew can chart, the chart in a well
// that pans and zooms by whole steps, the known places in a list, and Travel where the world allows a crossing.
import { ALTAR_MARK, GATE_MARK, MAP_HEIGHT, MAP_LIT, MAP_SHALLOWS, MAP_SHORE, MAP_TEXTURE, MAP_TONES, type MapKind, MOUTH_MARK, OWN_ARROW, type Texture } from '../art/chart';
import { HEADS } from '../art/heads';
import { COMPASS_MARKS, PING } from '../art/marks';
import { SILHOUETTES } from '../art/silhouettes';
import { clock, count, measure } from '../font/measure';
import { box, cut } from '../font/wrap';
import type { KeyEv, Node, Screen, Tip, Ui } from '../node';
import { type Colour, SEATS } from '../palette';
import { button } from '../parts/button';
import { frameWell, type RowSpec, well } from '../parts/well';
import { tabbedSlab } from '../parts/tabs';
import { seat } from '../sample/crew';
import { CHUNK, type Place, countryAt, FELL, groundAt, ME, PINGS, PLACES, STORE, STORE_PLACES, WALK_RADIUS, WALKED } from '../sample/map';
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
  /** How many of `places`, from the first, are on this chart; the rest are listed under "Elsewhere". All, on the ground. */
  here?: number;
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

// The chart is 168 square so that the list beside it is 120 wide and a handle of sixteen is not cut.
const W = 312, H = 212, CW = 168, CH = 168, ZOOMS = [8, 4, 2], LIST_X = 184, LIST_W = 120;
/** The zoom buttons, 16 square, the last ending at the chart well's right edge. */
const ZB = 16, ZOOM_Y = 191, ZOOM_IN_X = 8 + CW + 2 - ZB, ZOOM_OUT_X = ZOOM_IN_X - ZB - 2;
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
/** A fixed hash of a lattice point, for the marks of the ground. */
function latticeHash(gx: number, gy: number, seed: number): number {
  let h = (Math.imul(gx, 374761393) + Math.imul(gy, 668265263) + Math.imul(seed, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

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
        else c = MAP_TONES[k][0];
        if (k !== 'unknown' && c === MAP_TONES[k][0] && (k === 'water' || ![up, left, down, right].some((n) => lower(n, k)))) plain[row * nw + u] = 1;
      }
      if (c !== runC) {
        if (runC) s.fill((u - run) * CELL, row * CELL, run * CELL, CELL, runC);
        runC = c; run = 0;
      }
      run++;
    }
  }
  // A rise is lit by one unit of its kind's lit tone along a side whose neighbour above or to the left stands lower, and
  // shaded by one unit of its edge tone along a side whose neighbour below or to the right stands lower. Whole cells of
  // edge tone made a band two deep round every rise.
  for (let row = 0; row < nh; row++) {
    for (let u = 0; u < nw; u++) {
      const k = at(u, row);
      if (k === 'unknown' || k === 'water') continue;
      const x = u * CELL, y = row * CELL;
      if (lower(at(u, row + 1), k)) s.fill(x, y + CELL - 1, CELL, 1, MAP_TONES[k][1]);
      if (lower(at(u + 1, row), k)) s.fill(x + CELL - 1, y, 1, CELL, MAP_TONES[k][1]);
      if (lower(at(u, row - 1), k)) s.fill(x, y, CELL, 1, MAP_LIT[k]);
      if (lower(at(u - 1, row), k)) s.fill(x, y, 1, CELL, MAP_LIT[k]);
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
        // A kind with several marks picks one, moves it off the lattice and leaves some points bare by a hash of the
        // point, so that the same ground always carries the same marks.
        const h = latticeHash(gx, gy, k.length);
        if (t.bare && h % t.bare === 0) continue;
        const mark = t.marks ? t.marks[(h >>> 3) % t.marks.length] : t.mark;
        const j = t.jitter ?? 0;
        const x = gx * t.px + shift - ox + (j ? (h >>> 6) % (j + 1) : 0), y = gy * t.py - oy + (j ? (h >>> 9) % (j + 1) : 0);
        if (!mark.every(([dx, dy]) => fits(k, x + dx, y + dy))) continue;
        for (const [dx, dy, c] of mark) s.fill(x + dx, y + dy, 1, 1, c);
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
  return `${count(d)} m ${winds[((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8]}`;
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

/**
 * The sealed store, as it has been entered, on flat root.1 for ground not entered: rooms and the passages between them
 * laid out as floor on a grid of units, then walled from that grid, so that a doorway is only where a passage's floor
 * meets a room's. Each room is a hollow, as a slot is: flagstones of stone.sh with seams of stone.pit, 8 units to the
 * stone (4 at the farther zooms) and every other course moved half a stone along, fixed to the store; a wall is `t`
 * units deep, stone.dk where the floor lies below or right of it and stone.lt where it lies above or left, with a
 * root.0 outline. A passage is 3 wide. A locked door is a leaf of ember across its doorway, with the key beside it.
 */
function paintStore(s: Surface, v: MapView): void {
  const z = v.zoom;
  const [ox, oy] = unitOf(v, 0, 0);
  // Not the ground tile: the menus behind stand on it, and a chart drawn on it could not be told from them.
  s.fill(0, 0, CW, CH, 'root.1');
  const t = z <= 2 ? 2 : 1, P = t === 2 ? 8 : 4;
  // A margin round the chart so that a wall just outside it still shades what is inside.
  const M = t + 2, gw = CW + 2 * M, gh = CH + 2 * M;
  const floor = new Uint8Array(gw * gh);
  const isFloor = (x: number, y: number) => x >= -M && y >= -M && x < CW + M && y < CH + M && floor[(y + M) * gw + x + M] === 1;
  const lay = (x0: number, y0: number, w: number, h: number) => {
    for (let y = Math.max(-M, y0); y < Math.min(CH + M, y0 + h); y++) for (let x = Math.max(-M, x0); x < Math.min(CW + M, x0 + w); x++) floor[(y + M) * gw + x + M] = 1;
  };
  for (const r of STORE.rooms) {
    const x = ox + Math.round(r.x / z), y = oy + Math.round(r.z / z), w = Math.round(r.w / z), h = Math.round(r.h / z);
    lay(x + t + 1, y + t + 1, w - 2 * (t + 1), h - 2 * (t + 1));
  }
  const gap = Math.round(8 / z), wide = Math.min(3, gap);
  const leaves: { x: number; y: number; w: number; h: number; across: boolean }[] = [];
  for (const d of STORE.doors) {
    const x = ox + Math.round(d.x / z), y = oy + Math.round(d.z / z);
    const mid = Math.floor((gap - wide) / 2);
    // From inside the near room's floor, through both walls and the gap, into the far room's floor.
    // A locked door opens on ground not yet entered: no passage, only its leaf set in the wall.
    const from = -(t + 2), to = gap + t + 2;
    if (!d.locked) { if (d.across) lay(x + mid, y + from, wide, to - from); else lay(x + from, y + mid, to - from, wide); }
    if (d.locked) leaves.push(d.across ? { x: x + mid, y: y - t - 1, w: wide, h: t + 1, across: true } : { x: x - t - 1, y: y + mid, w: t + 1, h: wide, across: false });
  }
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (isFloor(x, y)) {
        const fy = y - oy, course = Math.floor(fy / P), fx = x - ox + (course % 2 ? P / 2 : 0);
        const seam = ((fy % P) + P) % P === 0 || ((fx % P) + P) % P === 0;
        s.fill(x, y, 1, 1, seam ? 'stone.pit' : 'stone.sh');
        continue;
      }
      let near = 99, sx = 0, sy = 0;
      for (let dy = -(t + 1); dy <= t + 1; dy++) for (let dx = -(t + 1); dx <= t + 1; dx++) {
        if (!isFloor(x + dx, y + dy)) continue;
        near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= t) { sx += Math.sign(dx); sy += Math.sign(dy); }
      }
      if (near > t + 1) continue;
      if (near === t + 1) { s.fill(x, y, 1, 1, 'root.0'); continue; }
      // The room is sunk: the wall above or left of its floor is in shade, the one below or right of it in the light.
      const shade = sx + sy > 0 || (sx + sy === 0 && sy > 0);
      s.fill(x, y, 1, 1, shade ? 'stone.dk' : 'stone.lt');
    }
  }
  for (const l of leaves) {
    s.fill(l.x, l.y, l.w, l.h, 'ember');
    s.fill(l.x, l.y, l.w, 1, 'ember.lt'); s.fill(l.x, l.y, 1, l.h, 'ember.lt');
    s.fill(l.x, l.y + l.h - 1, l.w, 1, 'ember.dk'); s.fill(l.x + l.w - 1, l.y + 1, 1, l.h - 1, 'ember.dk');
    s.draw(SILHOUETTES.key, l.across ? l.x - 2 : l.x + l.w + 2, l.across ? l.y - 10 : l.y - 6, { flat: 'salt' });
  }
  // The stair up, in the room it rises from: treads lit on their top edge, stepping down to the right.
  const st = STORE_PLACES.find((p) => p.kind === 'stair');
  if (st) {
    const [u, w] = unitOf(v, st.x, st.z);
    s.fill(u - 4, w - 4, 9, 9, 'root.0');
    for (let k = 0; k < 4; k++) {
      s.fill(u - 3, w - 3 + k * 2, 7, 1, 'stone.hi');
      s.fill(u - 3, w - 2 + k * 2, 7, 1, k === 3 ? 'stone.dk' : 'stone.sh');
    }
  }
  const [u, w] = unitOf(v, STORE.at.x, STORE.at.z);
  s.map(HEADS[STORE.at.seat - 1], u - 5, w - 5);
}

/** The disabled Travel's words while the way cools: the crossing, that it cools, and the time, cut to the crossing alone when long. */
function waitLabel(crossing: string, left: number): string {
  const full = `${crossing} cooling, ${clock(left)}`;
  return measure(full) <= LIST_W - 4 ? full : `Cooling, ${clock(left)}`;
}

/** A zoom button's tooltip, which says why it stands grey when the chart can go no closer or no farther. */
const zoomTip = (text: string) => (live: { hover: boolean }): Tip | null => (live.hover ? { lines: [{ text, c: 'salt' }], delay: 0.4 } : null);

/** What a unit of the store's chart shows: Pellwright, a locked door, a room by its name, or ground not entered. */
function storeAt(v: MapView, ex: number, ey: number): string {
  const z = v.zoom;
  const [ox, oy] = unitOf(v, 0, 0);
  const [hu, hw] = unitOf(v, STORE.at.x, STORE.at.z);
  if (ex >= hu - 5 && ex < hu + 5 && ey >= hw - 5 && ey < hw + 5) return seat(STORE.at.seat).name;
  for (const d of STORE.doors) {
    if (!d.locked) continue;
    const x = ox + Math.round(d.x / z), y = oy + Math.round(d.z / z);
    if (Math.abs(ex - x) <= 4 && Math.abs(ey - y) <= 4) return 'A locked door: it wants a key';
  }
  for (const r of STORE.rooms) {
    const x = ox + Math.round(r.x / z), y = oy + Math.round(r.z / z);
    if (ex >= x && ex < x + Math.round(r.w / z) && ey >= y && ey < y + Math.round(r.h / z)) return r.name;
  }
  return 'Not entered yet';
}

export const mapScreen: Screen<MapView> = (v, ui) => {
  firstFocus(ui, 'map', null);
  const ground = v.tab === 'ground';
  const place = v.places[v.chosen];
  let from = { ...v.centre };
  const hover = { x: 0, z: 0, on: false, friend: null as Place | null, what: '' };
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
        if (!ground) { const w = storeAt(v, e.x, e.y); if (w !== hover.what) { hover.what = w; ui.wake(); } }
      },
      leave: () => { hover.on = false; hover.friend = null; hover.what = ''; ui.wake(); },
    },
  };
  // The list in groups under grey headers: on the ground, places then players; in a store, what is in it, then the
  // rest under "Elsewhere". `rowAt[k]` is the place a row stands for, or -1 for a header.
  const rows: RowSpec[] = [], rowAt: number[] = [];
  const header = (text: string) => {
    rows.push({ id: `map.head.${rows.length}`, name: text, disabled: true, body: (s, _w, h) => s.text(text, 3, Math.floor((h - 9) / 2), 'root.4', true) });
    rowAt.push(-1);
  };
  const here = v.here ?? v.places.length;
  const isCrew = (p: Place) => p.kind === 'friend' || p.kind === 'self';
  const group = (from: number, to: number, crewHeader: string | null, placeHeader: string | null) => {
    // Without headers the rows keep the order they are given in.
    for (const wantCrew of crewHeader ? [false, true] : [null]) {
      const idx = [...Array(to - from).keys()].map((k) => k + from).filter((i) => wantCrew === null || isCrew(v.places[i]) === wantCrew);
      if (!idx.length) continue;
      const h = wantCrew === null ? null : wantCrew ? crewHeader : placeHeader;
      if (h) header(h);
      for (const i of idx) {
        const p = v.places[i];
        rows.push({ id: p.id, icon: p.icon, name: p.name, colour: p.seat ? SEATS[p.seat - 1] : 'salt' });
        rowAt.push(i);
      }
    }
  };
  if (here === v.places.length) group(0, here, 'Crew', 'Places');
  else { group(0, here, null, null); header('Elsewhere'); group(here, v.places.length, null, null); }
  const cooling = place?.cooling !== undefined;
  // The wait and its reason are written once, in the disabled button itself, where the eye goes; the screen is built
  // again each time the shown second changes.
  const builtLeft = cooling ? Math.max(0, Math.ceil(v.cooling(ui.t))) : 0;
  const builtOpen = cooling && builtLeft <= 0;
  const kids: Node[] = [
    frameWell({ x: 8, y: 18, w: CW + 2, h: CH + 2, host: 'stone', kids: [chart] }),
    {
      // What is under the pointer: on the living ground the place and its country, in a store the room, the door or
      // the friend; never the screen's title again.
      x: 8, y: 194, w: ZOOM_OUT_X - 12, h: 10,
      paint: (s) => {
        const t = !hover.on ? 'Point at the chart'
          : ground ? `X ${hover.x}  Z ${hover.z}, ${walked(hover.x, hover.z) ? countryAt(hover.x, hover.z).name : 'not walked'}` : hover.what;
        s.text(cut(t, ZOOM_OUT_X - 12), 0, 0, hover.on ? 'ink' : 'ink.faded');
      },
    },
    button({ id: 'map.out', x: ZOOM_OUT_X, y: ZOOM_Y, w: ZB, h: ZB, ramp: 'stone', label: '-', disabled: v.zoom === ZOOMS[0], onPress: () => v.onZoom(-1), tip: zoomTip(v.zoom === ZOOMS[0] ? 'Farthest' : 'Farther') }),
    button({ id: 'map.in', x: ZOOM_IN_X, y: ZOOM_Y, w: ZB, h: ZB, ramp: 'stone', label: '+', disabled: v.zoom === ZOOMS[ZOOMS.length - 1], onPress: () => v.onZoom(1), tip: zoomTip(v.zoom === ZOOMS[ZOOMS.length - 1] ? 'Closest' : 'Closer') }),
    well({
      id: 'map.places', x: LIST_X, y: 18, w: LIST_W, h: 130, rowH: 16, host: 'stone', ui, rows, chosen: rowAt.indexOf(v.chosen),
      onChoose: (k) => {
        const i = rowAt[k];
        if (i < 0) return;
        v.onChoose(i);
        // A place on another chart is chosen for its line under Travel; the chart stays where it is.
        if (i < here) v.onPan(v.places[i].x, v.places[i].z);
      },
    }),
    button({ id: 'map.travel', x: LIST_X, y: 152, w: LIST_W, h: 16, ramp: 'stone', label: builtLeft > 0 ? waitLabel(place!.crossing, builtLeft) : 'Travel', disabled: !builtOpen, onPress: () => place && v.onTravel(place) }),
    {
      x: LIST_X, y: 172, w: LIST_W, h: 30, anim: cooling,
      paint: (s) => {
        if (!place) return;
        const left = Math.max(0, Math.ceil(v.cooling(ui.t)));
        if (cooling && left !== builtLeft) ui.invalidate();
        // Under Travel, where it would take one; the wait is said once, in the button. A place in the store is told by
        // the chart beside it; how far and which way is said of the living ground only.
        const local = v.here !== undefined && v.chosen < v.here;
        const to = cooling ? `${place.crossing} to ${place.name}` : place.crossing;
        // How far stands on a line of its own, so that a wrap never parts a count from its "m".
        const b = box(local || place.kind === 'self' ? `${to}.` : to, LIST_W, 2);
        for (const l of b.lines) s.text(l.text, 0, l.y, 'ink');
        if (!local && place.kind !== 'self') s.text(cut(way(place), LIST_W), 0, b.lines.length * 10, 'ink');
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
  const lists: Record<ChartTab, { places: Place[]; here?: number }> = {
    ground: { places: PLACES },
    store: { places: [...STORE_PLACES, ...PLACES.filter((p) => p.seat !== STORE.at.seat)], here: STORE_PLACES.length },
  };
  const st = { tab, zoomI: { ground: 1, store: 2 } as Record<ChartTab, number>, centre: { ground: { x: ME.x, z: ME.z }, store: { x: 90, z: 40 } } as Record<ChartTab, { x: number; z: number }>, chosen: { ground: 0, store: 0 } as Record<ChartTab, number>, pings: [...PINGS], cooledFrom: 3, cool: 12 };
  return {
    name, title, world: true,
    build: (ui: Ui) => mapScreen({
      tab: st.tab, zoom: ZOOMS[st.zoomI[st.tab]], centre: st.centre[st.tab], ...lists[st.tab], chosen: st.chosen[st.tab], pings: st.pings,
      // The stone stands at its cooling for the page's first three seconds, so that a shot holds still, then counts down.
      cooling: (t) => Math.max(0, st.cool - Math.max(0, t - st.cooledFrom)),
      onTab: (t) => { st.tab = t; ui.invalidate(); },
      onPan: (x, z) => { st.centre[st.tab] = { x: Math.round(x), z: Math.round(z) }; ui.invalidate(); },
      onZoom: (d) => { st.zoomI[st.tab] = Math.max(0, Math.min(ZOOMS.length - 1, st.zoomI[st.tab] + d)); ui.invalidate(); },
      onChoose: (i) => { st.chosen[st.tab] = i; ui.invalidate(); },
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
