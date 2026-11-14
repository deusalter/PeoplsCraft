// Another player as this page draws it: a second client joins the in-page host of a `?quick` world over a loopback that
// stands in for a socket, walks a path the script gives it at walking pace, swings, digs, sleeps and wears armour, while
// this page's camera looks on. Screenshots for a person to look at; the run fails only when the body never appears.
//
//   node scripts/headless.mjs --query "quick=pview&fresh" --run scripts/playerview.mjs --out <folder>
export default async ({ page, shot, log }) => {
  await page.waitForFunction(() => window.T && window.T.game, null, { timeout: 60000 });
  if (!(await page.evaluate(() => window.T.loaded()))) throw new Error('the world never loaded');
  const X = 8, Y = 160, Z = -8;
  await page.evaluate(async ([X, Y, Z]) => {
    const T = window.T, g = T.game, p = g.player;
    g.paused = false; T.grab(true);
    await T.cmd('god on'); await T.cmd('caps 0 0'); await T.cmd('clearmobs'); await T.cmd('time 0.2');
    await T.cmd(`tp ${X + 0.5} ${Y + 1.01} ${Z + 0.5}`); await T.loaded();
    await T.cmd(`fill ${X - 20} ${Y} ${Z - 44} ${X + 20} ${Y} ${Z + 8} stone_bricks`);
    await T.cmd(`tp ${X + 0.5} ${Y + 1.01} ${Z + 0.5}`); p.yaw = 0; p.pitch = -0.05;
    await T.run(600);
  }, [X, Y, Z]);

  // the second client: a session over a remote-looking loopback, a body the script places, moves paced by the host's ticks
  await page.evaluate(async ([X, Y, Z]) => {
    const T = window.T;
    const { loopback } = await import('/src/net/loopback.ts');
    const { Session } = await import('/src/client/session.ts');
    const host = await T.ask((s, a, h) => h);
    host.opt.maxPlayers = 8; host.sim.opt.maxPlayers = 8;
    const { transport, conn } = loopback({ local: false });
    host.connect(conn);
    const s = new Session(transport);
    const B = window.B2 = { s, tp: 0, active: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, flags: 1, to: null, speed: 4.3, tick: host.sim.tick, log: [], cmdN: 0, cmds: new Map(), corrections: 0 };
    s.mover = () => ({ tp: B.tp, x: B.x, y: B.y, z: B.z, vx: B.vx, vy: 0, vz: B.vz, yaw: B.yaw, pitch: B.pitch, flags: B.flags });
    s.on('welcome', (m) => { B.tp = m.tp; [B.x, B.y, B.z, B.yaw, B.pitch] = m.pos; s.send({ t: 'ready', tp: m.tp }); });
    s.on('tp', (m) => {
      B.tp = m.id; B.x = m.x; B.y = m.y; B.z = m.z; B.log.push(`tp load=${m.load} ${m.x.toFixed(1)} ${m.y.toFixed(1)} ${m.z.toFixed(1)}`);
      if (m.load) { B.active = false; s.send({ t: 'ready', tp: m.id }); } else { if (B.active) B.corrections++; B.active = true; }
    });
    s.on('cmdr', (m) => { const f = B.cmds.get(m.id); if (f) { B.cmds.delete(m.id); f(m.text); } });
    s.on('error', (m) => B.log.push('error ' + m.code));
    B.cmd = (text) => new Promise((ok) => { const id = 1000 + ++B.cmdN; B.cmds.set(id, ok); s.send({ t: 'cmd', id, text }); });
    s.hello({ name: 'Wren', token: 'a1'.repeat(16), view: 4, build: '0.1.0' });
    let n = 0;
    B.timer = setInterval(() => {
      s.pump();
      const t = host.sim.tick, dt = (t - B.tick) / 60;
      B.tick = t;
      B.vx = B.vz = 0;
      if (B.active && B.to && dt > 0) {
        const dx = B.to[0] - B.x, dz = B.to[1] - B.z, l = Math.hypot(dx, dz), step = Math.min(l, B.speed * dt);
        if (l < 1e-3) B.to = null;
        else { B.x += (dx / l) * step; B.z += (dz / l) * step; B.vx = (dx / l) * B.speed; B.vz = (dz / l) * B.speed; B.yaw = Math.atan2(-dx, -dz); }
      }
      if (B.active && ++n % 3 === 0) s.move();
      s.probe();
    }, 16);
    await T.until(() => B.active, 20000);
    await B.cmd(`tp ${X + 0.5} ${Y + 1.01} ${Z - 7.5}`);
    await T.until(() => B.active && Math.abs(B.z - (Z - 7.5)) < 0.1, 20000);
    B.yaw = Math.PI; B.pitch = 0;
    await T.run(1500);
  }, [X, Y, Z]);
  const seen = await page.evaluate(() => window.T.game.ents.players.filter((v) => v.active).map((v) => ({ slot: v.slot, x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2) })));
  log('second player as seen here:', JSON.stringify(seen), (await page.evaluate(() => window.B2.log)).join(' | '));
  if (!seen.length) throw new Error('the second player never appeared in this page');

  const wren = (src) => page.evaluate(async (src) => {
    const T = window.T;
    return T.ask((0, eval)(src));
  }, src);
  const run = (ms) => page.evaluate((ms) => window.T.run(ms), ms);

  await shot('1-standing');
  // chat both ways, typed here through the keys the game listens to; a command and its answer; pings from each side
  await page.evaluate(() => window.B2.s.send({ t: 'chat', text: 'Over here, by the bricks.' }));
  await run(200);
  const say = async (key, text) => {
    await page.keyboard.press(key);
    await page.waitForFunction(() => document.activeElement && document.activeElement.tagName === 'INPUT', null, { timeout: 5000 });
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
    await run(400);
    await page.evaluate(() => { window.T.grab(true); });
  };
  await say('KeyT', 'On my way');
  await say('Slash', 'time 0.2');
  await page.evaluate(() => { window.T.grab(true); });
  await page.evaluate(([X, Y, Z]) => window.B2.s.act({ t: 'ping', x: X + 5.5, y: Y + 1, z: Z - 14.5 }), [X, Y, Z]);
  await page.evaluate(() => { window.T.game.player.pitch = -0.3; });
  await run(100);
  await page.keyboard.press('KeyV');
  await page.evaluate(() => { window.T.game.player.pitch = -0.05; });
  await run(500);
  await shot('1b-chat-pings');
  await page.keyboard.down('Tab');
  await run(300);
  await shot('1c-roster');
  await page.keyboard.up('Tab');
  await page.evaluate(() => { window.T.game.player.yaw = 0.7; });
  await run(300);
  await shot('1d-compass');
  await page.evaluate(() => { window.T.game.player.yaw = 0; });
  const social = await page.evaluate(() => { const so = window.T.game.hud.social; return { lines: so.lines.map((l) => `${l.kind}:${l.name}:${l.text}`), pings: so.pings.length, members: so.list().map((m) => m.name) }; });
  log('social', JSON.stringify(social));
  // walking across the view
  await page.evaluate(([X, Z]) => { window.B2.to = [X + 6.5, Z - 7.5]; }, [X, Z]);
  await run(700);
  await shot('2-walking-a');
  await run(180);
  await shot('2-walking-b');
  await page.evaluate(() => window.T.until(() => !window.B2.to, 8000));
  await page.evaluate(([X, Z]) => { window.B2.to = [X + 0.5, Z - 7.5]; }, [X, Z]);
  await page.evaluate(() => window.T.until(() => !window.B2.to, 8000));
  await page.evaluate(() => { window.B2.yaw = Math.PI * 0.75; });
  await run(500);
  // armour and a sword, as the roster carries them
  await wren(`(sim) => { const p = [...sim.players.values()].find((q) => q.name === 'Wren'); p.inv.armor[0] = { k: 'iron_melee_0', n: 1 }; p.inv.armor[1] = { k: 'iron_melee_1', n: 1 }; p.inv.armor[2] = { k: 'iron_melee_2', n: 1 }; p.inv.slots[p.inv.sel] = { k: 'iron_sword', n: 1 }; p.inv.rev++; return true; }`);
  await run(900);
  await shot('3-armoured');
  // swinging: one swing every 0.3 s, pictures through it
  await wren(`(sim) => { const p = [...sim.players.values()].find((q) => q.name === 'Wren'); globalThis.__sw = setInterval(() => { p.swingSeq = (p.swingSeq + 1) & 3; }, 300); return true; }`);
  for (let i = 0; i < 4; i++) { await run(70 + i * 37); await shot(`4-swing-${i}`); }
  await wren(`() => { clearInterval(globalThis.__sw); return true; }`);
  // the held block
  await wren(`(sim) => { const p = [...sim.players.values()].find((q) => q.name === 'Wren'); p.inv.slots[p.inv.sel] = { k: 'torch', n: 4 }; p.inv.rev++; return true; }`);
  await run(900);
  await shot('5-torch');
  // asleep
  await wren(`(sim) => { const p = [...sim.players.values()].find((q) => q.name === 'Wren'); p.sleeping = true; return true; }`);
  await run(1200);
  await shot('6-asleep');
  await wren(`(sim) => { const p = [...sim.players.values()].find((q) => q.name === 'Wren'); p.sleeping = false; return true; }`);
  // sneaking side on, and from 30 blocks
  await page.evaluate(() => { const B = window.B2; B.flags = 1 | 4; B.yaw = -Math.PI / 2; });
  await run(800);
  await shot('7-sneak');
  await page.evaluate(() => { const B = window.B2; B.flags = 1; });
  await page.evaluate(([X, Z]) => { window.B2.speed = 8; window.B2.to = [X + 0.5, Z - 30]; }, [X, Z]);
  await page.evaluate(() => window.T.until(() => !window.B2.to, 10000));
  await page.evaluate(() => { window.B2.yaw = Math.PI * 0.8; });
  await run(800);
  await shot('8-thirty-blocks');
  // away: the link stays open and says nothing
  await page.evaluate(() => { clearInterval(window.B2.timer); });
  await run(9000);
  await shot('9-away');
  const end = await page.evaluate(() => ({ log: window.B2.log, corrections: window.B2.corrections, views: window.T.game.ents.players.filter((v) => v.active).map((v) => v.flags) }));
  log('end', JSON.stringify(end));
  return 'done';
};
