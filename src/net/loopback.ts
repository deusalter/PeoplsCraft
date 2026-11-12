// The transport between a client and a host that live in one thread: what one end sends is handed to the
// other end's callback at once and by reference, so neither side may change a message after sending it.
// Each side queues what it is handed (the host until its next step, the session until its next pump).
import type { C2S, S2C } from './protocol';
import type { Conn, Transport } from './transport';

export interface Loopback { transport: Transport; conn: Conn }

let nextId = 1;

/** A connected pair. `clone`: every message is taken through JSON on its way across, and every binary message copied, so a
 *  value that would not survive a socket does not survive here either. `local`: the host treats the connection as the
 *  solo player's (false to stand in for a remote one in tests). */
export function loopback(opt: { clone?: boolean; local?: boolean } = {}): Loopback {
  const clone = !!opt.clone;
  const over = <T>(m: T): T => (clone ? (JSON.parse(JSON.stringify(m)) as T) : m);
  const bin = (b: ArrayBuffer): ArrayBuffer => (clone ? b.slice(0) : b);
  const transport: Transport = {
    kind: 'loopback', state: 'open',
    onOpen: null, onMessage: null, onBinary: null, onClose: null,
    send(m: C2S): void { if (transport.state === 'open' && conn.onMessage) conn.onMessage(over(m)); },
    sendBin(b: ArrayBuffer): void { if (transport.state === 'open' && conn.onBinary) conn.onBinary(bin(b)); },
    close(): void {
      if (transport.state === 'closed') return;
      transport.state = 'closed';
      if (conn.onClose) conn.onClose();
    },
  };
  const conn: Conn = {
    id: nextId++, local: opt.local ?? true, addr: 'loopback', buffered: 0,
    onMessage: null, onBinary: null, onClose: null,
    send(m: S2C): void { if (transport.state === 'open' && transport.onMessage) transport.onMessage(over(m)); },
    sendBin(b: ArrayBuffer): void { if (transport.state === 'open' && transport.onBinary) transport.onBinary(bin(b)); },
    close(code: string): void {
      if (transport.state === 'closed') return;
      transport.state = 'closed';
      if (transport.onClose) transport.onClose(code);
    },
  };
  return { transport, conn };
}
