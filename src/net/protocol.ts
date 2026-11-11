// Messages between the simulation and a client. This file grows with the protocol; for now it holds
// the reliable per-player messages the simulation already sends through its sink.

export type S2C =
  /** The sim damaged this player (`dodged`: the blow was avoided and `dmg` is 0). */
  | { t: 'hurt'; dmg: number; fx: number; fz: number; knock: number; cause: string; dodged?: boolean }
  /** Death. `cause` is '' for a record that was loaded with no health left. */
  | { t: 'dead'; cause: string; lost: number; at: [number, number, number, number] }
  /** Authoritative position. `load`: the client freezes behind its loading screen until the area is meshed. */
  | { t: 'tp'; id: number; dim: number; x: number; y: number; z: number; yaw?: number; pitch?: number; load: boolean; msg?: string }
  /** The sim opened a window for this player. */
  | { t: 'open'; mode: 'station' | 'chest' | 'forge' | 'shop'; station?: string; npc?: string; x?: number; y?: number; z?: number };
