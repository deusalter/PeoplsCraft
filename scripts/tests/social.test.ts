// The social state over a session that only records: the roster follows the host's `pl` and `where`, the chat log
// keeps its last lines whole, pings age out, and compass bearings point the right way all round.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_KEEP, Social, bearing, stateOf, wrapPi } from '../../src/client/social';
import { Session } from '../../src/client/session';
import { CHAT_MAX, PF_AWAY, PF_DEAD, PF_GROUND, PF_SLEEP, PING_SECONDS, type C2S, type PlayerInfo, type S2C } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';
import * as THREE from 'three';
import { EntityStore, type EntityHost } from '../../src/client/entities';
import { B } from '../../src/data/blocks';
import { ITEMS, TIERS } from '../../src/data/items';
import { ARMOR_PARTS, PLAYER_PARTS } from '../../src/data/playerModel';
import { PF_DIG, PF_HURT, PF_SWING_SHIFT, PF_WATER, PING_REACH } from '../../src/net/protocol';
import { encodeSnapshot, type SnapPlayer } from '../../src/net/snapshot';
import type { BoxBatch } from '../../src/render/batches';
import type { ItemModels } from '../../src/render/itemModel';
import { DEAD_HIDE, HURT_T, PlayerRender, PlayerView, SWING_T, TOPPLE_T, crackStage } from '../../src/render/playerView';
import type { Fx } from '../../src/sim/fx';
import { TAG_LOOK, TAG_R, hudKey, pingAt, screenAt, tagSight } from '../../src/ui/hud';
import type { World } from '../../src/world/world';

class Wire implements Transport {
  readonly kind = 'ws' as const;
  state: Transport['state'] = 'open';
  onOpen: Transport['onOpen'] = null; onMessage: Transport['onMessage'] = null; onBinary: Transport['onBinary'] = null; onClose: Transport['onClose'] = null;
  out: C2S[] = [];
  send(m: C2S): void { this.out.push(m); }
  sendBin(): void {}
  close(): void { this.state = 'closed'; }
}
const info = (slot: number, name: string, dim = 0): PlayerInfo => ({ slot, name, dim, held: '', armor: ['', '', ''], level: 1 });
const welcome = (players: PlayerInfo[], slot = 1): S2C => ({ t: 'welcome', proto: 1, boot: 1, you: { slot, id: 'a' }, world: { name: 'w', seed: 1, seedText: '1' }, dim: 0,
  pos: [10, 64, -20, 0, 0], tp: 0, tick: 0, clock: 0, flags: [], quest: 0, event: { a: null, k: 0, g: 0 }, spawn: [0, 0], cfg: { cheats: false, simRadius: 5, viewMax: 16, maxPlayers: 8 }, players });
function setup(): { w: Wire; s: Session; so: Social; say: (...m: S2C[]) => void } {
  const w = new Wire(), s = new Session(w), so = new Social();
  so.connect(s);
  return { w, s, so, say: (...m) => { for (const q of m) w.onMessage!(q); s.pump(); } };
}

test('the roster follows joins, leaves, renames and realm changes', () => {
  const { so, say } = setup();
  say(welcome([info(1, 'Asha'), info(2, 'Bram')]));
  assert.deepEqual(so.list().map((m) => [m.slot, m.name, m.self]), [[1, 'Asha', true], [2, 'Bram', false]]);
  assert.equal(so.lines.length, 0, 'who was already there is not announced');
  const r0 = so.rosterRev;
  say({ t: 'pl', add: [info(3, 'Cato')] });
  assert.ok(so.rosterRev > r0);
  assert.deepEqual(so.list().map((m) => m.name), ['Asha', 'Bram', 'Cato']);
  assert.equal(so.lines.at(-1)!.text, 'Cato joined');
  // the same seat bound again under another name (a resume): one entry, renamed
  say({ t: 'pl', add: [info(3, 'Corin')] });
  assert.equal(so.members.size, 3);
  assert.equal(so.member(3)!.name, 'Corin');
  assert.equal(so.lines.at(-1)!.text, 'Cato is now Corin');
  // a realm change: the coarse position no longer counts until the next `where`
  say({ t: 'where', l: [2, 0, 100, -40, 3, 0, 5, 5] });
  assert.deepEqual([so.member(2)!.x, so.member(2)!.z, so.member(2)!.placed], [100, -40, true]);
  assert.deepEqual(so.friends().map((m) => m.slot).sort(), [2, 3]);
  say({ t: 'pl', upd: [info(2, 'Bram', 1)] });
  assert.equal(so.member(2)!.dim, 1);
  assert.equal(so.member(2)!.placed, false);
  assert.equal(so.lines.at(-1)!.text, 'Bram went to The Hollow');
  assert.deepEqual(so.friends().map((m) => m.slot), [3], 'a friend in another realm has no pip here');
  say({ t: 'where', l: [2, 1, 7, 8] });
  assert.deepEqual(so.friends().map((m) => m.slot), [3]);
  // an update that changes nothing announces nothing
  const n = so.lines.length;
  say({ t: 'pl', upd: [{ ...info(3, 'Corin'), level: 4, held: 'iron_sword' }] });
  assert.equal(so.lines.length, n);
  assert.equal(so.member(3)!.level, 4); assert.equal(so.member(3)!.held, 'iron_sword');
  say({ t: 'pl', del: [3] });
  assert.equal(so.member(3), undefined);
  assert.equal(so.lines.at(-1)!.text, 'Corin left');
  say({ t: 'pl', del: [9] });
  assert.equal(so.lines.at(-1)!.text, 'Corin left', 'a seat never seen leaves nothing to say');
  // this client's own realm follows its `tp`
  say({ t: 'tp', id: 1, dim: 2, x: 0, y: 80, z: 0, load: true });
  assert.equal(so.dim, 2); assert.equal(so.self!.dim, 2);
  // a new welcome starts the roster over
  say(welcome([info(4, 'Dara')], 4));
  assert.deepEqual(so.list().map((m) => [m.slot, m.self]), [[4, true]]);
});

test('the snapshot flags give a player a state', () => {
  const { so, say } = setup();
  say(welcome([info(1, 'Asha'), info(2, 'Bram')]));
  assert.equal(stateOf(so.member(2)!.flags), '');
  so.setFlags(2, PF_GROUND | PF_SLEEP);
  assert.equal(stateOf(so.member(2)!.flags), 'asleep');
  assert.equal(stateOf(PF_AWAY), 'away');
  assert.equal(stateOf(PF_DEAD | PF_SLEEP), 'fallen');
  assert.equal(stateOf(PF_GROUND), '');
});

test('chat keeps the last 100 lines, whole, and sends commands as commands', async () => {
  const { w, so, say } = setup();
  say(welcome([info(1, 'Asha')]));
  const long = 'word '.repeat(39) + 'end';
  for (let i = 0; i < 130; i++) {
    say({ t: 'chat', slot: 1, name: 'Asha', text: i === 129 ? long : `line ${i}` });
    assert.equal(so.lines.length, Math.min(i + 1, CHAT_KEEP), `after line ${i}`);
    assert.equal(so.lines[0].text, `line ${Math.max(0, i + 1 - CHAT_KEEP)}`, 'only the oldest goes');
  }
  assert.equal(CHAT_KEEP, 100);
  assert.equal(so.lines.length, 100);
  assert.equal(so.lines[0].text, 'line 30');
  assert.equal(so.lines.at(-1)!.text, long, 'a long line is kept as one line, unwrapped');
  assert.ok(!so.lines.some((l) => l.text.includes('\n')));
  assert.ok(so.lines.every((l, i) => i === 0 || l.n === so.lines[i - 1].n + 1), 'numbered in order');
  say({ t: 'chat', slot: 0, name: '', text: 'The server will restart' });
  assert.equal(so.lines.at(-1)!.kind, 'server');

  so.submit('   ');
  assert.equal(w.out.length, 0, 'blank sends nothing');
  so.submit('  hello there ');
  assert.deepEqual(w.out.at(-1), { t: 'chat', text: 'hello there' });
  so.submit('x'.repeat(CHAT_MAX + 50));
  assert.equal((w.out.at(-1) as { text: string }).text.length, CHAT_MAX);
  so.submit('\u{1F600}'.repeat(CHAT_MAX));
  const cutText = (w.out.at(-1) as { text: string }).text;
  assert.ok(cutText.length <= CHAT_MAX && !/[\ud800-\udbff]$/.test(cutText), 'no half of a pair at the cut');
  const asked: string[] = [];
  so.cmd = async (t) => { asked.push(t); return 'Time set.'; };
  const before = w.out.length;
  so.submit('/time 0.5');
  assert.equal(w.out.length, before, 'a command does not go out as chat');
  assert.deepEqual(asked, ['time 0.5']);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(so.lines.slice(-2).map((l) => [l.kind, l.text]), [['cmd', '/time 0.5'], ['reply', 'Time set.']]);
  so.submit('/');
  assert.deepEqual(asked, ['time 0.5'], 'a bare slash runs nothing');
});

test('a ping lasts its seconds, one per player, and leaves with its player or the realm', () => {
  const { w, so, say } = setup();
  say(welcome([info(1, 'Asha'), info(2, 'Bram')]));
  so.ping(4, 70, -3);
  assert.deepEqual(w.out.at(-1), { t: 'ping', x: 4, y: 70, z: -3 });
  assert.equal(so.pings.length, 0, 'the mark waits for the host');
  say({ t: 'fx', l: [['pg', 2, 4, 70, -3]] });
  assert.deepEqual(so.pings.map((p) => [p.name, p.x, p.y, p.z, p.t]), [['Bram', 4, 70, -3, PING_SECONDS]]);
  so.tick(PING_SECONDS / 2);
  say({ t: 'fx', l: [['pg', 1, 0, 64, 0]] });
  assert.equal(so.pings.length, 2);
  so.tick(PING_SECONDS / 2 - 0.01);
  assert.deepEqual(so.pings.map((p) => p.slot), [2, 1]);
  so.tick(0.02);
  assert.deepEqual(so.pings.map((p) => p.slot), [1], "Bram's has expired");
  say({ t: 'fx', l: [['pg', 1, 9, 64, 9]] });
  assert.deepEqual(so.pings.map((p) => [p.x, p.t]), [[9, PING_SECONDS]], 'a second ping moves the first');
  so.tick(PING_SECONDS + 1);
  assert.equal(so.pings.length, 0);
  say({ t: 'fx', l: [['pg', 2, 1, 1, 1]] }, { t: 'pl', del: [2] });
  assert.equal(so.pings.length, 0, 'gone with the player');
  say({ t: 'fx', l: [['pg', 1, 1, 1, 1]] }, { t: 'tp', id: 2, dim: 1, x: 0, y: 0, z: 0, load: true });
  assert.equal(so.pings.length, 0, 'gone with the realm');
});

test('compass bearings to a friend and a ping, at the four quarters and across the wrap', () => {
  const near = (a: number, b: number): void => assert.ok(Math.abs(wrapPi(a - b)) < 1e-9, `${a} is not ${b}`);
  const Q = Math.PI / 2;
  // yaw 0 looks north (-z); east is a quarter turn to the right
  near(bearing(0, 0, 0, 0, -10), 0);
  near(bearing(0, 0, 0, 10, 0), Q);
  near(bearing(0, 0, 0, 0, 10), Math.PI);
  near(bearing(0, 0, 0, -10, 0), -Q);
  // looking east (yaw -PI/2: yaw grows to the left), north is a quarter turn to the left
  near(bearing(5, 5, -Q, 5, -5), -Q);
  near(bearing(5, 5, -Q, 15, 5), 0);
  near(bearing(5, 5, -Q, 5, 15), Q);
  near(bearing(5, 5, Q, 15, 5), Math.PI);
  // across the wrap: just either side of straight behind stay on their own side
  const left = bearing(0, 0, 0, -0.01, 10), right = bearing(0, 0, 0, 0.01, 10);
  assert.ok(left < -3.1 && left > -Math.PI, String(left));
  assert.ok(right > 3.1 && right <= Math.PI, String(right));
  // many turns of yaw make no difference
  near(bearing(0, 0, 6 * Math.PI + 0.3, 10, 0), Q + 0.3);
  near(bearing(0, 0, -6 * Math.PI - 0.3, 10, 0), Q - 0.3);
  for (let i = -20; i <= 20; i++) { const b = bearing(1, 2, i * 0.77, 3, -4); assert.ok(b > -Math.PI && b <= Math.PI); }
  // what the HUD feeds it: a friend from `where`, a ping from `pg`
  const { so, say } = setup();
  say(welcome([info(1, 'Asha'), info(2, 'Bram')]), { t: 'where', l: [1, 0, 0, 0, 2, 0, 30, 0] }, { t: 'fx', l: [['pg', 2, 0, 64, 30]] });
  const f = so.friends()[0], p = so.pings[0];
  near(bearing(so.self!.x, so.self!.z, 0, f.x, f.z), Q);
  near(bearing(so.self!.x, so.self!.z, 0, p.x, p.z), Math.PI);
});

// ---- other players as drawn: the entity store fed snapshots of one other player, and the HUD's rules for tags, keys and pings

const GROUND = 64, MS = 1000 / 60, STEP = 1 / 60;
/** Stone below GROUND; a pool of water four deep at x 20..29. */
const blockAt = (x: number, y: number): number => (y < 0 || y >= GROUND ? 0 : x >= 20 && x < 30 && y >= GROUND - 4 ? B.water : B.stone);
const voxels = { getBlock: (x: number, y: number) => blockAt(x, y), ready: () => true, getLight: () => 0xf0, topY: () => GROUND - 1, biomeAt: () => 0 };
const models = { isCube: () => false, get: () => new THREE.BufferGeometry() } as unknown as ItemModels;
/** A stand-in for the creatures' box batch: each box's colour, flash and centre. */
class Boxes { l: { c: number; flash: number; x: number; y: number; z: number }[] = []; add(m: THREE.Matrix4, c: number, _s: number, _b: number, flash: number): void { const e = m.elements; this.l.push({ c, flash, x: e[12], y: e[13], z: e[14] }); } }
const HEAD = PLAYER_PARTS.findIndex((q) => q.a === 'head');

function other(): { ents: EntityStore; v: () => PlayerView; feed: (from: number, to: number, p: (tick: number) => Partial<SnapPlayer>, each?: (v: PlayerView) => void) => void;
  fx: (...l: Fx[]) => void; spawns: number[][]; sounds: { name: string; at?: number[] }[]; draw: (info?: Partial<PlayerInfo>) => Boxes } {
  const tr: Transport = { kind: 'loopback', state: 'open', send() {}, sendBin() {}, onOpen: null, onMessage: null, onBinary: null, onClose: null, close() {} };
  const s = new Session(tr), spawns: number[][] = [], sounds: { name: string; at?: number[] }[] = [];
  const host = { world: voxels, particles: { spawn: (...a: number[]) => { spawns.push(a); } }, audio: { play: (name: string, _v: number, _p: number, at?: number[]) => { sounds.push({ name, at }); } },
    player: { x: 0, y: GROUND, z: 0, shake() {} }, gfx: { dayAmt: 1 }, paused: false, time: 0, dim: 0 } as unknown as EntityHost;
  const ents = new EntityStore(host, models);
  let now = 0;
  ents.clock = () => now;
  ents.connect(s);
  tr.onMessage!(welcome([info(1, 'Asha'), info(2, 'Bram')])); s.pump();
  const feed = (from: number, to: number, p: (tick: number) => Partial<SnapPlayer>, each?: (v: PlayerView) => void): void => {
    for (let t = from; t <= to; t++) {
      now = t * MS;
      if (t % 3 === 0) {
        tr.onBinary!(encodeSnapshot({ flags: 0, tick: t, ackMove: 0, tp: 0, hunger: 20, ox: 0, oz: 0, hp: 100, mana: 40, mobs: [],
          players: [{ slot: 2, x: 0.5, y: GROUND, z: 0.5, yaw: 0, pitch: 0, flags: PF_GROUND, hp: 1, dig: 0, ...p(t) }] }));
        s.pump();
      }
      ents.netTick(STEP);
      if (each) each(ents.player(2)!);
    }
  };
  const draw = (pi: Partial<PlayerInfo> = {}): Boxes => {
    const b = new Boxes();
    ents.playerRender.render(b as unknown as BoxBatch, ents.players, 1, 0, () => ({ ...info(2, 'Bram'), ...pi }), voxels as unknown as World, null, 1);
    return b;
  };
  return { ents, v: () => ents.player(2)!, feed, fx: (...l) => { tr.onMessage!({ t: 'fx', l }); s.pump(); }, spawns, sounds, draw };
}
/** How many frames in a row, from the first, a timer read from the view stayed above 0; and the value it started at. */
function run(values: number[]): { first: number; frames: number } {
  const i = values.findIndex((x) => x > 0);
  let n = 0;
  while (i >= 0 && values[i + n] > 0) n++;
  return { first: i >= 0 ? values[i] : 0, frames: n };
}

test('another player swings for 0.24 s on each change of its swing counter, never on the first count seen', () => {
  const o = other(), sw: number[] = [];
  const seq = (n: number): number => PF_GROUND | (n << PF_SWING_SHIFT);
  o.feed(90, 150, () => ({ flags: seq(3) }), (v) => sw.push(v.swing));
  assert.equal(run(sw).frames, 0, 'the count a body first comes into view with is no swing');
  sw.length = 0;
  o.feed(151, 220, (t) => ({ flags: seq(t >= 160 ? 0 : 3) }), (v) => sw.push(v.swing));
  const r = run(sw);
  assert.equal(r.first, 0.24);
  assert.equal(r.frames, 15, 'a swing of 0.24 s lasts 15 ticks of 1/60 s');
  assert.equal(sw.filter((x) => x === 0.24).length, 1, 'a counter that stays put starts nothing more');
  sw.length = 0;
  o.feed(221, 260, (t) => ({ flags: seq(t >= 230 ? 1 : 0) }), (v) => sw.push(v.swing));
  assert.equal(run(sw).frames, 15, 'the next count swings again');
  assert.equal(SWING_T, 0.24);
});

test('another player flashes for 0.22 s from the rising edge of its hurt bit, the flash read by its boxes', () => {
  const o = other(), hu: number[] = [];
  o.feed(90, 140, (t) => ({ flags: PF_GROUND | (t < 120 ? PF_HURT : 0) }), (v) => hu.push(v.hurt));
  assert.equal(run(hu).frames, 0, 'a body first seen already hurt does not flash');
  hu.length = 0;
  let flash = -1;
  o.feed(141, 200, (t) => ({ flags: PF_GROUND | (t >= 150 && t < 180 ? PF_HURT : 0) }), (v) => { hu.push(v.hurt); if (flash < 0 && v.hurt > 0) flash = Math.max(...o.draw().l.map((b) => b.flash)); });
  const r = run(hu);
  assert.equal(r.first, 0.22);
  assert.equal(r.frames, 14, 'a flash of 0.22 s lasts 14 ticks of 1/60 s, however long the bit stays set');
  assert.equal(flash, 1, 'full at the edge');
  assert.ok(o.draw().l.every((b) => b.flash === 0), 'and gone after');
  assert.equal(HURT_T, 0.22);
});

test('a fallen player topples, then is hidden; a sleeper lies down; one away bows its head', () => {
  const o = other();
  o.feed(90, 130, () => ({}));
  const stand = o.draw().l;
  assert.equal(stand.length, PLAYER_PARTS.length);
  const head = stand[HEAD];
  assert.ok(head.y > GROUND + 1.4, `standing head at ${head.y}`);
  // down: the body falls over within TOPPLE_T and is drawn until DEAD_HIDE
  let t0 = -1, shown = 0, lastShown = 0;
  o.feed(131, 131 + Math.ceil((DEAD_HIDE + 0.5) * 60), (t) => ({ flags: t >= 140 ? PF_DEAD : PF_GROUND }), (v) => {
    if (v.deadT < 0) return;
    if (t0 < 0) t0 = 0;
    const b = o.draw().l;
    if (b.length) { shown++; lastShown = v.deadT; }
    if (Math.abs(v.deadT - TOPPLE_T) < STEP / 2) assert.ok(b[HEAD].y < GROUND + 0.6, `toppled head at ${b[HEAD].y}`);
  });
  assert.ok(shown > 0 && lastShown < DEAD_HIDE && lastShown > DEAD_HIDE - 2 * STEP, `last drawn ${lastShown} s after the fall`);
  assert.equal(o.draw().l.length, 0, 'hidden once DEAD_HIDE has passed');

  const z = other();
  z.feed(90, 130, () => ({}));
  const awake = z.draw().l[HEAD];
  z.feed(131, 250, () => ({ flags: PF_GROUND | PF_SLEEP }));
  assert.ok(z.draw().l[HEAD].y < GROUND + 0.6, 'asleep, the head is down by the feet');
  z.feed(251, 400, () => ({ flags: PF_GROUND | PF_AWAY }));
  assert.equal(z.v().lie, 0, 'up again, and nothing of the lie left to freeze the head');
  const bowed = z.draw().l[HEAD];
  assert.ok(bowed.y < awake.y - 0.02 && Math.hypot(bowed.x - awake.x, bowed.z - awake.z) > 0.08, 'away, the head hangs forward');
});

test('armour is drawn in its tier colour, and at most 8 held items are shown', () => {
  const r = new PlayerRender(models);
  const iron = TIERS.findIndex((t) => t.key === 'iron'), keys = [0, 1, 2].map((slot) => [...ITEMS.values()].find((d) => d.tier === iron && d.armor?.slot === slot)!.key);
  const parts = r.model(keys), base = ARMOR_PARTS.reduce((n, a) => n + a.length, 0);
  assert.equal(parts.length, PLAYER_PARTS.length + base);
  const body = ARMOR_PARTS.flat().filter((q) => q.c === 0).length;
  assert.equal(parts.filter((q) => q.c === TIERS[iron].color).length, body, 'each piece in the tier colour, the trim darker');
  assert.equal(r.model(['hide_0', '', '']).slice(PLAYER_PARTS.length).filter((q) => q.c === 0xa8703c).length, ARMOR_PARTS[0].filter((q) => q.c === 0).length, 'no tier: the icon colour');
  assert.equal(r.model(keys), parts, 'built once per combination');

  const views = Array.from({ length: 10 }, (_, i) => Object.assign(new PlayerView(), { active: true, slot: i + 1, x: i * 2, y: GROUND, z: 0, px: i * 2, py: GROUND, pz: 0 }));
  const held = (): PlayerInfo => ({ ...info(1, 'x'), held: 'iron_sword' });
  r.render(new Boxes() as unknown as BoxBatch, views, 1, 0, held, voxels as unknown as World, null, 1);
  assert.deepEqual(r.heldCount, { made: 8, shown: 8 });
  r.render(new Boxes() as unknown as BoxBatch, views.slice(0, 3), 1, 0, held, voxels as unknown as World, null, 1);
  assert.deepEqual(r.heldCount, { made: 8, shown: 3 });
});

test('another player digging chips the block it digs and cracks it by its dig progress; one falling into water splashes', () => {
  const o = other();
  o.feed(90, 120, () => ({}));
  o.fx(['dg', 2, true, 1, GROUND - 1, 0]);
  const s0 = o.spawns.length;
  o.feed(121, 180, () => ({ flags: PF_GROUND | PF_DIG, dig: 0.6 }));
  const digs = o.sounds.filter((q) => q.name === 'dig_stone');
  assert.ok(digs.length >= 4 && digs.length <= 5, `${digs.length} dig ticks in a second`);
  assert.deepEqual(digs[0].at, [1.5, GROUND - 0.5, 0.5], 'heard at the block');
  const chips = o.spawns.slice(s0);
  assert.equal(chips.length, digs.length * 3);
  assert.ok(chips.every((c) => Math.abs(c[0] - 1.5) < 0.9 && c[1] > GROUND - 1 && c[1] < GROUND + 0.5 && Math.abs(c[2] - 0.5) < 0.9), 'off the block');
  o.draw();
  assert.deepEqual(o.ents.playerRender.shownCracks(), [{ x: 1.5, y: GROUND - 0.5, z: 0.5, layer: 4 }]);
  assert.equal(crackStage(0.99), 7); assert.equal(crackStage(0.1), 0);
  o.fx(['dg', 2, false, 1, GROUND - 1, 0]);
  const s1 = o.spawns.length;
  o.feed(181, 240, () => ({ flags: PF_GROUND, dig: 0 }));
  o.draw();
  assert.equal(o.spawns.length, s1, 'no chips once it stops');
  assert.deepEqual(o.ents.playerRender.shownCracks(), []);

  // a walk into water on the level: no splash; a step down into it: one; a fall into it at half a block a tick: one
  const w = other();
  w.feed(90, 200, (t) => { const x = 15 + (t - 90) * 0.1; return { x, flags: x >= 20 ? PF_WATER : PF_GROUND }; });
  assert.equal(w.sounds.filter((q) => q.name === 'splash').length, 0, 'wading in makes no splash');
  const d = other();
  d.feed(90, 200, (t) => { const x = 15 + (t - 90) * 0.1; return { x, y: x >= 20 ? GROUND - 1 : GROUND, flags: x >= 20 ? PF_WATER : PF_GROUND }; });
  assert.equal(d.sounds.filter((q) => q.name === 'splash').length, 1, 'a step down into it splashes');
  const f = other();
  f.feed(90, 160, (t) => { const y = Math.max(GROUND - 2, GROUND + 20 - (t - 90) * 0.5); return { x: 25.5, y, flags: y < GROUND ? PF_WATER : 0 }; });
  const sp = f.sounds.filter((q) => q.name === 'splash');
  assert.equal(sp.length, 1);
  assert.ok(Math.abs(sp[0].at![0] - 25.5) < 1e-9 && sp[0].at![1] > GROUND - 2 && sp[0].at![1] < GROUND + 1);
  assert.ok(f.spawns.filter((q) => q[8] === 0xbfe4ff).length >= 6, 'and its spray');
});

test('name tags show within 48 blocks and ask about terrain once per 0.25 s', () => {
  assert.equal(TAG_R, 48); assert.equal(TAG_LOOK, 0.25);
  let asks = 0, wall = false;
  const t = { look: 0, seen: true }, hidden = (): boolean => { asks++; return wall; };
  const dt = 1 / 64;
  let shown = 0;
  for (let i = 0; i < 64; i++) if (tagSight(t, 10, dt, hidden)) shown++;
  assert.equal(asks, 4, 'one terrain test per quarter second');
  assert.equal(shown, 64);
  assert.equal(tagSight({ look: 0, seen: true }, 48, dt, hidden), true, 'at 48 blocks');
  const n = asks;
  assert.equal(tagSight({ look: 0, seen: true }, 48.01, dt, hidden), false, 'past 48 blocks');
  assert.equal(tagSight({ look: 0, seen: true }, 200, dt, hidden), false);
  assert.equal(asks, n, 'out of range asks nothing');
  wall = true;
  const b = { look: 0, seen: true };
  assert.equal(tagSight(b, 10, dt, hidden), false, 'behind terrain');
  wall = false;
  let k = 0;
  while (!tagSight(b, 10, dt, hidden)) k++;
  assert.equal(k, 15, 'shown again at the next test, a quarter second on');
});

test('Enter, T and / open the chat line, Tab shows the list, V pings, and none of them while something else has the keys', () => {
  const free = { typing: false, busy: false, locked: true, dead: false };
  assert.equal(hudKey('Enter', false, free), 'chat');
  assert.equal(hudKey('KeyT', false, free), 'chat');
  assert.equal(hudKey('Slash', false, free), 'command');
  assert.equal(hudKey('Tab', false, free), 'list');
  assert.equal(hudKey('Tab', true, free), 'list', 'held Tab keeps the list up');
  assert.equal(hudKey('KeyV', false, free), 'ping');
  assert.equal(hudKey('KeyV', true, free), null, 'a held key pings once');
  assert.equal(hudKey('KeyV', false, { ...free, locked: false }), null, 'no ping without the pointer');
  assert.equal(hudKey('KeyV', false, { ...free, dead: true }), null);
  assert.equal(hudKey('KeyW', false, free), null);
  for (const k of ['Enter', 'KeyT', 'Slash', 'Tab', 'KeyV']) {
    assert.equal(hudKey(k, false, { ...free, typing: true }), null, `${k} while typing`);
    assert.equal(hudKey(k, false, { ...free, busy: true }), null, `${k} under a window`);
  }
});

test('a ping lands on the block looked at or 32 along the view, and its marker is projected where it is in the world', () => {
  const at = pingAt(voxels as unknown as World, 0.5, GROUND + 1.6, 0.5, 0, -1, 0, [0, 0, 0]);
  assert.deepEqual(at, [0.5, GROUND, 0.5], 'the top face of the block underfoot');
  assert.deepEqual(pingAt(voxels as unknown as World, 0.5, GROUND + 1.6, 0.5, 0, 1, 0, [0, 0, 0]), [0.5, GROUND + 1.6 + PING_REACH, 0.5]);
  assert.equal(PING_REACH, 32);
  const cam = new THREE.PerspectiveCamera(70, 800 / 600, 0.1, 500);
  cam.position.set(0, 70, 0); cam.lookAt(0, 70, -1); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const p = { x: 0, y: 0 };
  assert.ok(screenAt(cam, 0, 70, -10, 800, 600, p)); assert.ok(Math.abs(p.x - 400) < 1e-6 && Math.abs(p.y - 300) < 1e-6, 'ahead: the middle');
  assert.ok(screenAt(cam, 3, 72, -10, 800, 600, p)); assert.ok(p.x > 400 && p.y < 300, 'right and up');
  assert.equal(screenAt(cam, 0, 70, 10, 800, 600, p), false, 'behind: not drawn');
});
