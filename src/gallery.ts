// Developer gallery (?gallery): every block tile and item icon on one page, enlarged, so the
// procedural pixel art can be judged by eye. Not part of the game.
import { BLOCKS, TEXTURE_NAMES } from './data/blocks';
import { ITEM_LIST } from './data/items';
import { Atlas } from './render/atlas';
import { Icons } from './render/icons';

const TINT = [0xffffff, 0x86c653, 0x6fb445, 0x3a84dc];

export function showGallery(): void {
  const atlas = new Atlas(), icons = new Icons(atlas);
  const q = new URLSearchParams(location.search), only = q.get('gallery') || 'all', scale = +(q.get('scale') || 5);
  document.body.style.cssText = 'overflow:auto;background:#3a3f4a;color:#e9e4d6;font:11px ui-monospace,monospace;user-select:text';
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:10px;align-items:flex-start';
  document.body.innerHTML = ''; document.body.appendChild(root);
  const cell = (label: string, c: HTMLCanvasElement): void => {
    const d = document.createElement('div'); d.style.cssText = `width:${Math.max(c.width * (c.dataset.s ? +c.dataset.s : 1), 64)}px;text-align:center;overflow:hidden;white-space:nowrap`;
    c.style.cssText = `width:${c.width * +(c.dataset.s || 1)}px;height:${c.height * +(c.dataset.s || 1)}px;image-rendering:pixelated;display:block;margin:0 auto;background:repeating-conic-gradient(#555 0 25%,#666 0 50%) 0 0/16px 16px`;
    d.appendChild(c); const s = document.createElement('div'); s.textContent = label; d.appendChild(s); root.appendChild(d);
  };
  if (only === 'all' || only === 'tiles') {
    TEXTURE_NAMES.forEach((name, i) => {
      const users = BLOCKS.filter((b) => b.faces.includes(name)), b = users[0];
      const opaque = !b || b.mat === 'opaque', tint = b ? TINT[b.tint] : 0xffffff, t = atlas.tiles[i];
      // 2x2 repeat shows how the tile joins itself
      const c = document.createElement('canvas'); c.width = 32; c.height = 32; c.dataset.s = String(scale);
      const ctx = c.getContext('2d')!, img = ctx.createImageData(16, 16);
      for (let p = 0; p < 1024; p += 4) {
        const a = t[p + 3], masked = opaque ? a < 128 : true, glow = !!b && b.emissive > 0;
        let r = t[p], g = t[p + 1], bl = t[p + 2];
        if (b && b.tint && masked && !glow) { r = (r * (tint >> 16)) / 255; g = (g * ((tint >> 8) & 255)) / 255; bl = (bl * (tint & 255)) / 255; }
        img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = bl; img.data[p + 3] = opaque ? 255 : a;
      }
      for (const [x, y] of [[0, 0], [16, 0], [0, 16], [16, 16]]) ctx.putImageData(img, x, y);
      cell(name, c);
    });
  }
  if (only === 'all' || only === 'icons') {
    const sheet = icons.sheet;
    ITEM_LIST.forEach((it, i) => {
      if (it.block !== undefined && only !== 'all') return;
      const c = document.createElement('canvas'); c.width = 32; c.height = 32; c.dataset.s = String(Math.max(2, Math.round(scale / 2)));
      c.getContext('2d')!.drawImage(sheet, (i % 20) * 32, Math.floor(i / 20) * 32, 32, 32, 0, 0, 32, 32);
      cell(it.key, c);
    });
  }
}
