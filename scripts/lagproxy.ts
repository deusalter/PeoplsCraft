// A TCP proxy that makes a link bad on purpose: every segment read from either side is written to the other a set
// delay later, give or take a jitter, in order, and a share of segments stalls the stream behind it for a while, as
// a Wi-Fi retransmit does. The defaults are the Stage 6 row of section 11: 150 ms +- 40 ms of round trip (half of
// it each way), with stalls of 250 to 400 ms on 2 % of segments.
//
//   npm run node -- scripts/lagproxy.ts --listen 9000 --to 127.0.0.1:8080 [--rtt 150] [--jitter 40] [--stall 0.02]
import { type AddressInfo, type Socket, createConnection, createServer } from 'node:net';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LagOptions {
  /** Where the server listens. */
  host: string; port: number;
  /** Port to listen on; 0 for a free one. */
  listen?: number;
  /** Round trip added, and its jitter (both ms); each direction takes half. */
  rtt?: number; jitter?: number;
  /** Share of segments that stall, and how long a stall lasts (ms). */
  stallShare?: number; stallMin?: number; stallMax?: number;
}
export interface LagProxy {
  port: number;
  /** Segments passed and stalled, both directions. */
  stats: { segments: number; stalls: number; bytes: number };
  close(): Promise<void>;
}

export function startLagProxy(o: LagOptions): Promise<LagProxy> {
  const oneWay = (o.rtt ?? 150) / 2, jit = (o.jitter ?? 40) / 2, share = o.stallShare ?? 0.02, sMin = o.stallMin ?? 250, sMax = o.stallMax ?? 400;
  const stats = { segments: 0, stalls: 0, bytes: 0 };
  const open = new Set<Socket>();
  /** Copy `from` to `to` late. A segment is never written before the one in front of it: one queue per direction and one
   *  timer for its head, since timers of different lengths that fall due in the same millisecond fire in any order. */
  const pipe = (from: Socket, to: Socket): void => {
    const q: { at: number; d: Buffer | 'end' | 'close' }[] = [];
    let last = 0, timer: ReturnType<typeof setTimeout> | null = null;
    const pump = (): void => {
      timer = null;
      const now = performance.now();
      while (q.length && q[0].at <= now) {
        const { d } = q.shift()!;
        if (d === 'end') to.end(); else if (d === 'close') to.destroy(); else if (!to.destroyed) to.write(d);
      }
      if (q.length) timer = setTimeout(pump, Math.max(0, q[0].at - now));
    };
    const later = (at: number, d: Buffer | 'end' | 'close'): void => {
      at = Math.max(at, last); last = at;
      q.push({ at, d });
      if (!timer) timer = setTimeout(pump, Math.max(0, q[0].at - performance.now()));
    };
    from.on('data', (d: Buffer) => {
      stats.segments++; stats.bytes += d.length;
      let at = performance.now() + oneWay + (Math.random() * 2 - 1) * jit;
      if (Math.random() < share) { stats.stalls++; at += sMin + Math.random() * (sMax - sMin); }
      later(at, d);
    });
    // the end and the close go through after the data in front of them
    from.on('end', () => later(performance.now(), 'end'));
    from.on('close', () => later(performance.now(), 'close'));
    from.on('error', () => {});
  };
  const server = createServer((client) => {
    client.setNoDelay(true);
    const up = createConnection({ host: o.host, port: o.port });
    up.setNoDelay(true);
    open.add(client); open.add(up);
    client.on('close', () => open.delete(client)); up.on('close', () => open.delete(up));
    pipe(client, up); pipe(up, client);
  });
  return new Promise((ok, no) => {
    server.once('error', no);
    server.listen(o.listen ?? 0, '127.0.0.1', () => {
      ok({
        port: (server.address() as AddressInfo).port, stats,
        close: () => new Promise<void>((done) => { for (const s of open) s.destroy(); server.close(() => done()); }),
      });
    });
  });
}

// run by itself, not lent to the scenario runner's bundle
if (basename(fileURLToPath(import.meta.url)).startsWith('lagproxy.')) {
  const a = process.argv.slice(2), get = (k: string): string | undefined => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  const to = get('to') ?? '127.0.0.1:8080', [host, port] = [to.slice(0, to.lastIndexOf(':')), Number(to.slice(to.lastIndexOf(':') + 1))];
  const p = await startLagProxy({ host, port, listen: Number(get('listen') ?? 0), rtt: Number(get('rtt') ?? 150), jitter: Number(get('jitter') ?? 40), stallShare: Number(get('stall') ?? 0.02) });
  console.log(`lag proxy on 127.0.0.1:${p.port} -> ${to}`);
}
