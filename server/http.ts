// The one port: the built client as static files, `GET /info` for the title menu, and the WebSocket
// upgrade (taken by wsserver.ts). Plain http: the server runs on a friend's machine with no certificate.
import { createReadStream, statSync } from 'node:fs';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

/** What the title menu asks before it offers to join (2.3). */
export interface Info { server: true; name: string; players: number; max: number; password: boolean }

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
};

/** `root`: the folder of the client build. Files under `assets/` carry a hash in their names and never change; everything
 *  else is asked for again each time, so that a page is never older than the server that serves it (4.2). */
export function createHttp(root: string, info: () => Info): Server {
  const base = normalize(root.endsWith(sep) ? root : root + sep);
  const handle = (req: IncomingMessage, res: ServerResponse): void => {
    const head = req.method === 'HEAD';
    if (req.method !== 'GET' && !head) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let path: string;
    try { path = decodeURIComponent((req.url ?? '/').split('?')[0]); } catch { res.writeHead(400).end(); return; }
    if (path === '/info') {
      const body = JSON.stringify(info());
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
      res.end(head ? undefined : body);
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(base, path));
    if (!file.startsWith(base) || path.includes('\0')) { res.writeHead(404).end(); return; }
    let size: number;
    try { const st = statSync(file); if (!st.isFile()) throw new Error('not a file'); size = st.size; } catch { res.writeHead(404, { 'Content-Type': TYPES['.txt'] }).end(head ? undefined : 'Not found'); return; }
    const hashed = file.startsWith(base + 'assets' + sep);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': size,
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff',
    });
    if (head) { res.end(); return; }
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  };
  return createServer(handle);
}
