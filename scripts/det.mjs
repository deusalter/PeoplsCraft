// Smoke scenario `det` (ARCHITECTURE.md 10.1, stage 3): two runs of one script on a fresh `&det` world
// report the same tick and the same `simhash` after each of its 20 calls.
//
//   npm run smoke -- det              in the simulation's worker (`&worker&det`)
//   npm run smoke -- det ?loopback    in the page (`&det` alone)
//
// The calls stay inside the area loaded at the start: walking, a jump, digging, a placed block,
// creatures spawned and fought, night falling, all stepped with T.step and never with T.run.
export const query = '';

/** One call each; every one is followed by a `simhash`. Runs inside the page. */
async function script() {
  const p = T.game.player, out = [];
  const calls = [
    () => T.step(30),
    () => T.cmd('give cobble 16'),
    () => T.cmd('give iron_sword 1'),
    () => { p.yaw = 0.7; p.pitch = -0.2; T.key('KeyW', true); return T.step(45); },
    () => { T.key('KeyW', false); return T.step(20); },
    () => { T.key('Space', true); return T.step(12); },
    () => { T.key('Space', false); return T.step(40); },
    () => T.cmd('spawn thornling'),
    () => T.step(90),
    () => T.cmd('spawn burrowhog'),
    () => { p.pitch = -1.2; T.click(0, true); return T.step(80); },
    () => { T.click(0, false); return T.step(10); },
    () => { T.key('Digit1', true); return T.step(2); },
    () => { T.key('Digit1', false); T.click(2, true); return T.step(8); },
    () => { T.click(2, false); return T.step(30); },
    () => T.cmd('time night'),
    () => T.cmd('caps 6 6'),
    () => { p.yaw = -1.9; T.key('KeyA', true); return T.step(60); },
    () => { T.key('KeyA', false); return T.step(240); },
    () => T.cmd('kill'),
  ];
  for (const c of calls) {
    await c();
    out.push(await T.cmd('simhash'));
  }
  return out;
}

export async function run({ page, origin, log, extra }) {
  const loop = /(^|&)loopback\b/.test(extra.slice(1));
  const q = `quick=det&fresh&det${loop ? '' : '&worker'}${extra.replace(/&loopback\b/, '')}`;
  const runs = [];
  for (let r = 0; r < 2; r++) {
    await page.goto(`${origin}/?${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.T, null, { timeout: 60000 });
    const res = await page.evaluate(async (fn) => {
      if (!(await T.loaded())) throw new Error('the world did not load');
      T.grab(true);
      return new Function('return ' + fn)()();
    }, script.toString());
    log(`  run ${r + 1} on the ${loop ? 'loopback' : 'worker'}: ${res[0]} ... ${res[res.length - 1]}`);
    runs.push(res);
  }
  const differ = runs[0].map((h, i) => (h === runs[1][i] ? null : `call ${i + 1}: ${h} against ${runs[1][i]}`)).filter(Boolean);
  if (differ.length) log(differ.join('\n'));
  return { calls: runs[0].length, same: differ.length === 0, firstDiffers: differ[0] ?? null };
}

export const expect = { calls: 20, same: true, firstDiffers: null };
