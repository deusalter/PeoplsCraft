// The two ends of a connection, and what a host needs from the platform it runs on. Interfaces only:
// the WebSocket, worker and in-thread transports each implement the first two.
//
// Every transport is one ordered, lossless stream. JSON-shaped messages and binary messages keep
// their order relative to each other. A message handed to `send` must not be changed afterwards: the
// in-thread transport passes it on by reference.
import type { C2S, S2C } from './protocol';

/** Client side. */
export interface Transport {
  readonly kind: 'ws' | 'worker' | 'loopback';
  state: 'connecting' | 'open' | 'retrying' | 'closed';
  send(m: C2S): void;
  /** A movement message. */
  sendBin(b: ArrayBuffer): void;
  /** Fires again after every reconnect. */
  onOpen: (() => void) | null;
  onMessage: ((m: S2C) => void) | null;
  onBinary: ((b: ArrayBuffer) => void) | null;
  /** `code` is 'retrying' or a final error code. */
  onClose: ((code: string) => void) | null;
  close(): void;
}

/** Host side, one per client. */
export interface Conn {
  readonly id: number;
  /** Worker or in-thread: the solo player, with solo privileges and no rate caps. */
  readonly local: boolean;
  readonly addr: string;
  send(m: S2C): void;
  sendBin(b: ArrayBuffer): void;
  /** Bytes queued and not yet written (0 on local transports). */
  readonly buffered: number;
  close(code: string): void;
  onMessage: ((m: C2S) => void) | null;
  onBinary: ((b: ArrayBuffer) => void) | null;
  onClose: (() => void) | null;
}

export interface HostEnv {
  /** Milliseconds, monotonic. */
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(h: unknown): void;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
}
