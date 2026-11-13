import { glyphs } from '../font/face';
import { NONE, coded } from '../pixmap';

// The title mark (5.28): "Peopls Craft" built of the timber the benches are made of, standing out of the wall. Each
// letter is the text face at three units to its unit, faced with boards 7 tall lit from the top left, and pushed back
// 3 units down and to the right: the first two steps of that depth in `timber.dk`, the last in `timber.pit`. The whole
// is outlined once in `root.0`. Letters stand 3 units further apart than the face sets them, so that the depth of one
// never runs into the next.

const K = 3, DEPTH = 3, SPREAD = 3;
const NAME = 'Peopls Craft';

function build(str: string): string[] {
  const gs = glyphs(str);
  const textW = gs.reduce((n, g) => n + (g.w + 1) * K + SPREAD, 0) - K - SPREAD;
  // Glyph rows 1 to 9 hold everything the name uses (capitals from 1, the tail of p to 9).
  const top = 1, rows = 9;
  const W = textW + DEPTH + 2, H = rows * K + DEPTH + 2;
  const face: boolean[][] = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  let gx = 1;
  for (const g of gs) {
    if (g.map) {
      for (let y = top; y < top + rows; y++) for (let x = 0; x < g.w; x++) {
        if (g.map.cells[y * g.map.w + x] === NONE) continue;
        for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) face[1 + (y - top) * K + v][gx + x * K + u] = true;
      }
    }
    gx += (g.w + 1) * K + SPREAD;
  }
  const isFace = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && face[y][x];
  const depth = (x: number, y: number): number => {
    for (let d = 1; d <= DEPTH; d++) if (isFace(x - d, y - d)) return d;
    return 0;
  };
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (isFace(x, y) || depth(x, y) > 0);
  const out: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      if (isFace(x, y)) {
        const board = (y - 1) % 7;
        if (!isFace(x, y - 1) || !isFace(x - 1, y)) row += 'e';
        else if (board === 6) row += 't';
        else if (board === 0) row += 'f';
        else row += 'T';
      } else if (depth(x, y)) {
        row += depth(x, y) < DEPTH ? 'U' : 'X';
      } else {
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (solid(x + dx, y + dy)) { edge = true; break; }
        row += edge ? 'K' : '.';
      }
    }
    out.push(row);
  }
  return out;
}

export const TITLE_MARK = coded(build(NAME), 'title');
