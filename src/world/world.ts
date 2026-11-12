// Main-thread chunk manager. Holds the chunk records, schedules worker jobs nearest-first,
// uploads meshes inside a per-frame budget and unloads by distance.
// Two ways to fill the records: from the generator and the save loader (the World the simulation runs on in this
// thread), or, after connect(), through a ClientVoxels that subscribes each chunk to the host and readies it when
// its generation and its edit set have both arrived (4.7).
import * as THREE from 'three';
import { BUILD_MAX, CH, CVOL, chunkKey } from '../core/constants';
import { T_ATTEN, T_EMITS, T_OPAQUE } from '../data/blocks';
import { U } from '../render/gfx';
import { ClientVoxels, VoxChunk } from '../net/clientvoxels';
import { hashBlocks } from '../sim/genjob';
import type { BlockEnt } from '../sim/voxels';
import type { EntInit } from './gen/types';
import type { MeshPart } from './mesher';
import { WorkerPool } from './pool';

/** `pal` is the index of the block-id palette the chunk was written with (see Game.palettes). */
export interface SavedChunk { blocks: Uint8Array; biomes: Uint8Array; hasEmit: boolean; ents: BlockEnt[]; pal?: number }

export class Chunk extends VoxChunk {
  light: Uint8Array | null = null;
  dirty = true; pending = false; meshed = false; urgent = false;
  modified = false;
  fails = 0;            // worker or load failures in a row (retries are capped)
  meshes: (THREE.Mesh | null)[] = [null, null, null];
  ents = new Map<number, BlockEnt>();
}

// Chunk meshes are culled through Mesh.intersectsFrustum, which three calls for the main and the shadow camera:
// first by distance (a column wholly past the fog end is drawn in plain fog colour), then with a box around the
// column, because three's own test uses the bounding sphere and that is about 60 blocks wide for a tall column.
let cullX = 0, cullZ = 0, cullR2 = Infinity;
const _box = new THREE.Box3();
function chunkInFrustum(this: THREE.Mesh, f: THREE.Frustum | THREE.FrustumArray): boolean {
  const p = this.position, b = this.geometry.boundingBox!;
  const dx = Math.max(p.x - cullX, 0, cullX - p.x - 16), dz = Math.max(p.z - cullZ, 0, cullZ - p.z - 16);
  if (dx * dx + dz * dz > cullR2) return false;
  _box.min.set(p.x - 0.25, b.min.y - 0.25, p.z - 0.25); _box.max.set(p.x + 16.25, b.max.y + 0.25, p.z + 16.25);   // the pad covers leaf sway and the water wave
  return (f as THREE.Frustum).intersectsBox(_box);
}

export class World {
  readonly chunks = new Map<number, Chunk>();
  readonly group = new THREE.Group();
  renderDist = 12;
  hasSky = true;
  savedKeys = new Set<number>();
  loader: ((cx: number, cz: number) => Promise<SavedChunk | null>) | null = null;
  onUnload: ((c: Chunk) => void) | null = null;
  onBlockChange: ((x: number, y: number, z: number, old: number, now: number) => void) | null = null;
  onChunkReady: ((c: Chunk, fresh: boolean, ents: EntInit[]) => void) | null = null;
  meshMs = 0;
  uploadsThisFrame = 0;
  /** The block store when the world is connected to a host; null on the in-thread simulation's path. */
  vox: ClientVoxels<Chunk> | null = null;

  private offsets = new Int16Array(0);
  private results: any[] = [];
  private urgent: Chunk[] = [];
  private pcx = 1e9; private pcz = 1e9; private scan = 0;
  private last: Chunk | null = null;
  private unloadTimer = 0;
  private warm: THREE.Mesh[] = [];

  private spare: ArrayBuffer[] = [];   // region buffers returned by finished mesh jobs
  constructor(readonly pool: WorkerPool, readonly materials: THREE.Material[], public seed: number, public dim: number) {
    this.setRenderDist(this.renderDist);
    this.group.matrixAutoUpdate = false;
  }

  setRenderDist(r: number): void {
    this.renderDist = r;
    // every chunk in mesh range, plus the ring of neighbours those meshes need for lighting
    const R = r + 2, lim = r * r + r, list: [number, number, number][] = [];
    for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
      let need = false;
      for (let dz = -1; dz <= 1 && !need; dz++) for (let dx = -1; dx <= 1; dx++) {
        if ((x + dx) * (x + dx) + (z + dz) * (z + dz) <= lim) { need = true; break; }
      }
      if (need) list.push([x * x + z * z, x, z]);
    }
    list.sort((a, b) => a[0] - b[0]);
    this.offsets = new Int16Array(list.length * 2);
    list.forEach((o, i) => { this.offsets[i * 2] = o[1]; this.offsets[i * 2 + 1] = o[2]; });
    this.scan = 0; this.pcx = 1e9;
  }
  /** Fill the records through a ClientVoxels from now on: every record made is subscribed, every record dropped is
   *  unsubscribed, and a record is ready only when the host's edit set is in as well. The caller attaches the
   *  store to its session and calls its `tick` and `flush` from the frame. */
  connect(): ClientVoxels<Chunk> {
    if (this.vox) return this.vox;
    this.clear(false);
    const v = new ClientVoxels<Chunk>((cx, cz, key) => new Chunk(cx, cz, key), this.chunks);
    v.dim = this.dim;
    v.onCellChange = (c, x, _y, z, old, id) => this.cellChanged(c, x & 15, z & 15, old, id);
    v.onReady = (c) => {
      // after a resync the neighbours still hold meshes made against the old blocks
      c.fails = 0; this.markDirty(c); this.markAround(c); this.scan = 0; this.pump();
    };
    v.onReplace = (c) => { this.markDirty(c); this.markAround(c); };
    v.onRegen = () => { this.scan = 0; };
    v.onDrop = (c) => this.disposeMeshes(c);
    this.vox = v;
    return v;
  }

  /** View distance in chunks: the setting, cut down to what the dimension's fog lets through, and to the host's limit. */
  setView(chunks: number, fogScale: number): void {
    if (this.vox) chunks = Math.min(chunks, this.vox.cfg.viewMax);
    const r = Math.min(chunks, Math.max(4, Math.ceil(chunks * fogScale) + 1));
    if (r !== this.renderDist) this.setRenderDist(r);
  }
  /** Camera position for the distance cull. Call once the fog uniforms are set for the frame. */
  setCull(x: number, z: number): void {
    // sun shadows reach past a short fog: keep every caster inside the 144-block shadow box (half diagonal 102)
    const r = U.uShadowOn.value > 0 ? Math.max(U.uFogEnd.value, 104) : U.uFogEnd.value;
    cullX = x; cullZ = z; cullR2 = r * r;
  }

  // ---- block access ----------------------------------------------------------
  chunkAt(cx: number, cz: number): Chunk | null {
    const l = this.last;
    if (l && l.cx === cx && l.cz === cz) return l;
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return null;
    this.last = c;
    return c;
  }
  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || !c.blocks) return 0;
    return c.blocks[((((z & 15) << 4) | (x & 15)) << 8) | y];
  }
  /** True when the column's chunk has block data (entities freeze instead of falling through). */
  ready(x: number, z: number): boolean {
    const c = this.chunkAt(x >> 4, z >> 4);
    return !!c && c.state === 2;
  }
  /** Packed light: sky in the high nibble, block light in the low nibble. */
  getLight(x: number, y: number, z: number): number {
    if (y >= CH) return this.hasSky ? 0xf0 : 0;
    if (y < 0) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || !c.light) return this.hasSky ? 0xf0 : 0;
    return c.light[((((z & 15) << 4) | (x & 15)) << 8) | y];
  }
  biomeAt(x: number, z: number): number {
    const c = this.chunkAt(x >> 4, z >> 4);
    return c && c.biomes ? c.biomes[((z & 15) << 4) | (x & 15)] : 0;
  }
  /** Highest non-air block in a column, or -1 if the chunk is not loaded. */
  topY(x: number, z: number): number {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || !c.blocks) return -1;
    const base = (((z & 15) << 4) | (x & 15)) << 8;
    for (let y = CH - 2; y > 0; y--) if (c.blocks[base + y] !== 0) return y;
    return 0;
  }

  setBlock(x: number, y: number, z: number, id: number, silent = false): boolean {
    if (y < 1 || y > BUILD_MAX) return false;
    const cx = x >> 4, cz = z >> 4, c = this.chunkAt(cx, cz);
    if (!c || !c.blocks) return false;
    const lx = x & 15, lz = z & 15, i = (((lz << 4) | lx) << 8) | y, old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id; c.modified = true;
    if (T_EMITS[id]) c.hasEmit = true;
    if (c.ents.size && c.ents.has(i) && !silent) c.ents.delete(i);
    this.cellChanged(c, lx, lz, old, id);
    if (!silent && this.onBlockChange) this.onBlockChange(x, y, z, old, id);
    return true;
  }
  /** A cell of chunk `c` at local (lx, lz) changed from `old` to `id`: the chunk and the neighbours its light reaches need meshing. */
  private cellChanged(c: Chunk, lx: number, lz: number, old: number, id: number): void {
    const cx = c.cx, cz = c.cz;
    this.markDirty(c);
    // light can travel 15 blocks, so neighbours inside that reach need a new mesh too. A swap that cannot change
    // light (same opacity and attenuation, no emitter) only shows to a neighbour through its one-column rim.
    const reach = T_OPAQUE[old] === T_OPAQUE[id] && T_ATTEN[old] === T_ATTEN[id] && !T_EMITS[old] && !T_EMITS[id] ? 2 : 15;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const ddx = dx < 0 ? lx + 1 : dx > 0 ? 16 - lx : 0, ddz = dz < 0 ? lz + 1 : dz > 0 ? 16 - lz : 0;
      if (ddx + ddz > reach) continue;
      const n = this.chunkAt(cx + dx, cz + dz);
      if (n && n.state === 2) this.markDirty(n);
    }
  }
  private markAround(c: Chunk): void {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = (dx || dz) ? this.chunkAt(c.cx + dx, c.cz + dz) : null;
      if (n && n.state === 2) this.markDirty(n);
    }
  }
  private markDirty(c: Chunk): void {
    c.dirty = true;
    if (c.meshed && !c.urgent) { c.urgent = true; this.urgent.push(c); }
    this.scan = 0;
  }

  // ---- block entities ----------------------------------------------------------
  getEnt(x: number, y: number, z: number): BlockEnt | null {
    const c = this.chunkAt(x >> 4, z >> 4);
    return (c && c.ents.get(((((z & 15) << 4) | (x & 15)) << 8) | y)) || null;
  }
  setEnt(x: number, y: number, z: number, kind: string, data: any): BlockEnt | null {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c) return null;
    const e: BlockEnt = { x, y, z, kind, data };
    c.ents.set(((((z & 15) << 4) | (x & 15)) << 8) | y, e);
    c.modified = true;
    return e;
  }
  removeEnt(x: number, y: number, z: number): void {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (c && c.ents.delete(((((z & 15) << 4) | (x & 15)) << 8) | y)) c.modified = true;
  }

  // ---- scheduling ------------------------------------------------------------------
  /** `budgetBytes` caps the mesh data handed to the GPU this frame; the first result and block edits always go through. */
  update(px: number, pz: number, budgetBytes: number): void {
    const cx = Math.floor(px / 16), cz = Math.floor(pz / 16);
    if (cx !== this.pcx || cz !== this.pcz) { this.pcx = cx; this.pcz = cz; this.scan = 0; this.unloadTimer = 0; }
    if (--this.unloadTimer < 0) { this.unloadTimer = 120; this.unloadFar(); }

    // three uploads a geometry when its mesh first passes culling. Last frame's new meshes were drawn unculled once,
    // so they were uploaded inside that frame's budget instead of in a burst when the camera turns towards them.
    const warm = this.warm, res = this.results;
    for (let i = 0; i < warm.length; i++) warm[i].frustumCulled = true;
    warm.length = 0;
    let n = 0, bytes = 0;
    while (res.length && (n < 1 || bytes < budgetBytes || res[0].front)) { bytes += this.applyMesh(res.shift()); n++; }
    this.uploadsThisFrame = n;
    this.pump();
  }
  /** Hand work to every idle worker. Runs each frame and again whenever a job finishes, so a worker never waits for the next frame. */
  pump(): void {
    if (this.pcx === 1e9) return;   // no position yet (start, dimension change): the saved-chunk list may not be in
    while (this.pool.idleCount > 0 && this.dispatchOne()) { /* keep the pool fed */ }
  }

  private neighborsReady(c: Chunk): boolean {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.chunks.get(chunkKey(c.cx + dx, c.cz + dz));
      if (!n || n.state !== 2) return false;
    }
    return true;
  }

  private dispatchOne(): boolean {
    const urgent = this.urgent;
    for (let i = 0; i < urgent.length; i++) {
      const c = urgent[i];
      if (!c.dirty || c.state !== 2 || this.chunks.get(c.key) !== c) { c.urgent = false; urgent.splice(i--, 1); continue; }
      if (c.pending || !this.neighborsReady(c)) continue;
      c.urgent = false; urgent.splice(i, 1);
      this.sendMesh(c, true);
      return true;
    }
    // finished meshes wait in `results` for the upload budget: do not let them pile up (a hidden tab renders no frames)
    if (this.results.length >= 48) return false;
    const offs = this.offsets, R = this.renderDist, meshR = R * R + R;
    let adv = true;
    for (let i = this.scan; i < offs.length; i += 2) {
      const dx = offs[i], dz = offs[i + 1], cx = this.pcx + dx, cz = this.pcz + dz, key = chunkKey(cx, cz);
      let c = this.chunks.get(key);
      if (!c) {
        if (this.vox) c = this.vox.create(cx, cz);
        else { c = new Chunk(cx, cz, key); this.chunks.set(key, c); }
      }
      const inMesh = dx * dx + dz * dz <= meshR;
      if (adv) { if (c.state === 2 && (!inMesh || (c.meshed && !c.dirty))) this.scan = i + 2; else adv = false; }
      if (c.state === 0) { if (this.requestChunk(c)) return true; continue; }
      if (c.state === 2 && c.dirty && !c.pending && inMesh && this.neighborsReady(c)) { this.sendMesh(c, false); return true; }
    }
    return false;
  }

  /** Returns true if a worker was consumed. */
  private requestChunk(c: Chunk): boolean {
    c.state = 1;
    if (this.vox) return this.generate(c, this.vox);
    if (this.loader && this.savedKeys.has(c.key)) {
      const dim = this.dim;
      this.loader(c.cx, c.cz).then((s) => {
        if (this.dim !== dim || this.chunks.get(c.key) !== c) return;
        if (!s) { c.state = 0; this.savedKeys.delete(c.key); this.scan = 0; this.pump(); return; }
        c.blocks = s.blocks; c.biomes = s.biomes; c.hasEmit = s.hasEmit; c.modified = false;
        for (const e of s.ents) c.ents.set(((((e.z & 15) << 4) | (e.x & 15)) << 8) | e.y, e);
        c.state = 2; c.dirty = true; c.fails = 0; this.scan = 0;
        if (this.onChunkReady) this.onChunkReady(c, false, []);
        this.pump();
      }, (e) => {
        if (this.dim !== dim || this.chunks.get(c.key) !== c) return;
        // retry a failed read, but never fall back to generating over a saved build
        if (++c.fails < 3) { c.state = 0; this.scan = 0; } else console.warn(`chunk ${c.cx},${c.cz} could not be read`, e);
      });
      return false;
    }
    const dim = this.dim;
    this.pool.run({ t: 'gen', cx: c.cx, cz: c.cz, dim, seed: this.seed }, [], (m) => {
      if (this.dim !== dim || this.chunks.get(c.key) !== c) return;
      if (!m) {
        // the worker threw: try once more, then leave the chunk empty so its eight neighbours can still mesh
        if (++c.fails < 2) c.state = 0;
        else { c.blocks = new Uint8Array(CVOL); c.biomes = new Uint8Array(256); c.state = 2; c.dirty = true; console.warn(`chunk ${c.cx},${c.cz} failed to generate and was left empty`); }
        this.scan = 0; this.pump();
        return;
      }
      c.blocks = m.blocks; c.biomes = m.biomes; c.hasEmit = m.hasEmit;
      c.state = 2; c.dirty = true; c.fails = 0; this.scan = 0;
      // block entities the generator placed come back identical on regeneration: they do not make the chunk worth saving
      const was = c.modified;
      if (this.onChunkReady) this.onChunkReady(c, true, m.ents);
      c.modified = was;
      this.pump();
    });
    return true;
  }

  /** Connected: the generator's output goes to the block store, which readies the record once its edit set is in too. */
  private generate(c: Chunk, v: ClientVoxels<Chunk>): boolean {
    const dim = this.dim;
    this.pool.run({ t: 'gen', cx: c.cx, cz: c.cz, dim, seed: this.seed }, [], (m) => {
      if (this.dim !== dim || this.chunks.get(c.key) !== c || this.vox !== v) return;
      if (!m) {
        // try once more, then take an empty chunk: its hash differs from the host's, which then sends the true array
        if (++c.fails < 2) c.state = 0;
        else { const a = new Uint8Array(CVOL); v.generated(c, a, new Uint8Array(256), false, hashBlocks(a)); console.warn(`chunk ${c.cx},${c.cz} failed to generate and was left empty`); }
        this.scan = 0; this.pump();
        return;
      }
      v.generated(c, m.blocks, m.biomes, m.hasEmit, m.hash);
      this.scan = 0; this.pump();
    });
    return true;
  }

  private sendMesh(c: Chunk, front: boolean): void {
    // one pooled buffer per job: nine block arrays, then nine biome arrays; the worker hands it back with the result
    const region = this.spare.pop() ?? new ArrayBuffer(9 * CVOL + 9 * 256), view = new Uint8Array(region), emit: boolean[] = [];
    let n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++, n++) {
      const nb = this.chunks.get(chunkKey(c.cx + dx, c.cz + dz))!;
      view.set(nb.blocks!, n * CVOL); view.set(nb.biomes!, 9 * CVOL + n * 256); emit.push(nb.hasEmit);
    }
    c.pending = true; c.dirty = false;
    const dim = this.dim;
    this.pool.run({ t: 'mesh', cx: c.cx, cz: c.cz, sky: this.hasSky, region, emit }, [region], (m) => {
      if (m && m.region && this.spare.length < this.pool.size + 2) this.spare.push(m.region);
      if (this.dim !== dim || this.chunks.get(c.key) !== c) return;
      if (!m) {
        // the worker threw: retry a couple of times, then count the chunk as meshed so nothing waits on it for ever
        c.pending = false;
        if (++c.fails < 3) { c.dirty = true; this.scan = 0; } else { c.meshed = true; console.warn(`chunk ${c.cx},${c.cz} could not be meshed`); }
        this.pump();
        return;
      }
      m.c = c; m.front = front;
      if (front) this.results.unshift(m); else this.results.push(m);
      this.pump();
    });
  }

  /** Installs a finished mesh and returns how many bytes it will upload. */
  private applyMesh(m: { c: Chunk; parts: (MeshPart | null)[]; light: Uint8Array; ms: number }): number {
    const c = m.c;
    if (this.chunks.get(c.key) !== c) return 0;   // unloaded, or unloaded and created again, while the job ran
    let bytes = 0;
    c.pending = false; c.light = m.light; c.meshed = true; c.fails = 0;
    this.meshMs = this.meshMs * 0.95 + m.ms * 0.05;
    for (let i = 0; i < 3; i++) {
      const p = m.parts[i];
      let mesh = c.meshes[i];
      if (!p) { if (mesh) { mesh.geometry.dispose(); this.group.remove(mesh); c.meshes[i] = null; } continue; }
      const g = new THREE.BufferGeometry();
      const free = function (this: THREE.BufferAttribute) { (this as any).array = null; };
      g.setAttribute('aPos', new THREE.BufferAttribute(p.pos, 4).onUpload(free));
      g.setAttribute('aUv', new THREE.BufferAttribute(p.uv, 4).onUpload(free));
      g.setAttribute('aLight', new THREE.BufferAttribute(p.light, 4, true).onUpload(free));
      g.setAttribute('aTint', new THREE.BufferAttribute(p.tint, 4, true).onUpload(free));
      g.setIndex(new THREE.BufferAttribute(p.idx, 1).onUpload(free));
      g.boundingBox = new THREE.Box3(new THREE.Vector3(0, p.minY, 0), new THREE.Vector3(16, p.maxY, 16));
      g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
      bytes += p.pos.byteLength + p.uv.byteLength + p.light.byteLength + p.tint.byteLength + p.idx.byteLength;
      if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; }
      else {
        mesh = new THREE.Mesh(g, this.materials[i]);
        mesh.position.set(c.cx * 16, 0, c.cz * 16);
        mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.matrixWorld.copy(mesh.matrix);
        mesh.matrixWorldAutoUpdate = false;
        mesh.renderOrder = i;
        mesh.intersectsFrustum = chunkInFrustum;
        c.meshes[i] = mesh; this.group.add(mesh);
      }
      mesh.frustumCulled = false; this.warm.push(mesh);
    }
    return bytes;
  }

  private unloadFar(): void {
    const lim = this.renderDist + 3;
    for (const c of this.chunks.values()) {
      if (Math.abs(c.cx - this.pcx) <= lim && Math.abs(c.cz - this.pcz) <= lim) continue;
      this.dropChunk(c, true);
    }
  }
  private dropChunk(c: Chunk, save: boolean): void {
    if (this.vox) { this.vox.drop(c); return; }
    if (save && c.modified && c.state === 2 && this.onUnload) this.onUnload(c);
    this.disposeMeshes(c);
    this.chunks.delete(c.key);
  }
  private disposeMeshes(c: Chunk): void {
    for (let i = 0; i < 3; i++) { const m = c.meshes[i]; if (m) { m.geometry.dispose(); this.group.remove(m); c.meshes[i] = null; } }
    if (this.last === c) this.last = null;
  }

  /** Drop everything (dimension change or leaving the world). Modified chunks are saved first. Connected, nothing is
   *  unsubscribed: the host drops a connection's subscriptions itself when its player changes realm or joins again. */
  clear(save: boolean): void {
    if (this.vox) this.vox.clear();
    else for (const c of [...this.chunks.values()]) this.dropChunk(c, save);
    this.results.length = 0; this.urgent.length = 0; this.warm.length = 0; this.scan = 0; this.pcx = 1e9; this.last = null;
  }
  setDim(dim: number, hasSky: boolean): void { this.clear(true); this.dim = dim; this.hasSky = hasSky; if (this.vox) this.vox.dim = dim; }

  /** Count chunks with a mesh, and how many are still waiting. */
  counts(): { loaded: number; meshed: number; waiting: number } {
    let loaded = 0, meshed = 0, waiting = 0;
    const R = this.renderDist, lim = R * R + R;
    for (const c of this.chunks.values()) {
      if (c.state === 2) loaded++;
      if (c.meshed) meshed++;
      const dx = c.cx - this.pcx, dz = c.cz - this.pcz;
      if (dx * dx + dz * dz <= lim && (!c.meshed || c.dirty)) waiting++;
    }
    return { loaded, meshed, waiting };
  }
  /** True once every chunk within `r` chunks of the position has a mesh. */
  areaMeshed(px: number, pz: number, r: number): boolean {
    const cx = Math.floor(px / 16), cz = Math.floor(pz / 16);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const c = this.chunks.get(chunkKey(cx + dx, cz + dz));
      if (!c || !c.meshed) return false;
    }
    return true;
  }
}
