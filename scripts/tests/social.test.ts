// The social state over a session that only records: the roster follows the host's `pl` and `where`, the chat log
// keeps its last lines whole, pings age out, and compass bearings point the right way all round.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_KEEP, Social, bearing, stateOf, wrapPi } from '../../src/client/social';
import { Session } from '../../src/client/session';
import { CHAT_MAX, PF_AWAY, PF_DEAD, PF_GROUND, PF_SLEEP, PING_SECONDS, type C2S, type PlayerInfo, type S2C } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';

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
  for (let i = 0; i < 130; i++) say({ t: 'chat', slot: 1, name: 'Asha', text: i === 129 ? long : `line ${i}` });
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
