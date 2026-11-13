// One tab at a time on a world (8.2, D38). Each tab saves from its own memory, and a commit writes the world and
// player records whole but only the edits its own tab changed, so two tabs on one world would leave storage holding a
// mix of both. The page holds the world's lock while it plays it or deletes it; the simulation's worker holds a
// second one while its host can still commit, which a page waits for, so that a tab just closed finishes its last
// save before another one reads or deletes. Where the browser has no Web Locks, nothing is held.

const page = (id: string): string => 'cairnlight:world:' + id;
const host = (id: string): string => 'cairnlight:host:' + id;
const locks = (): LockManager | null => (typeof navigator !== 'undefined' && navigator.locks) || null;

/** Hold world `id` for this page. Resolves with the function that lets it go, or null while another tab holds it.
 *  A tab that has just been reloaded or closed may let go a moment late, so a refusal is looked at again for 2 s. */
export async function claimWorld(id: string): Promise<(() => void) | null> {
  const lm = locks();
  if (!lm) return () => {};
  for (let tries = 0; ; tries++) {
    const release = await new Promise<(() => void) | null>((res) => {
      void lm.request(page(id), { ifAvailable: true }, (l) => (l ? new Promise<void>((done) => res(done)) : (res(null), undefined)));
    });
    if (release) {
      // the host of a tab that has gone may be in its last commit
      await lm.request(host(id), () => undefined);
      return release;
    }
    if (tries >= 10) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
}
/** The simulation's worker: held from before its host opens storage until the worker ends. */
export async function holdHost(id: string): Promise<void> {
  const lm = locks();
  if (!lm) return;
  await new Promise<void>((res) => { void lm.request(host(id), () => { res(); return new Promise<void>(() => {}); }); });
}
