// Pixel art building sprites drawn on Canvas via fillRect pixel grids

type PixelGrid = (string | null)[][];

interface BuildingDef {
  pixels: PixelGrid;
  width: number;
  height: number;
}

export type BuildingType =
  | 'house_small'
  | 'house_medium'
  | 'house_large'
  | 'shop'
  | 'arena'
  | 'council'
  | 'library'
  | 'tavern'
  | 'well'
  | 'fountain';

// ── Color Palette ──────────────────────────────────────────────────────

const RF = '#CC4422'; // roof
const RD = '#AA3311'; // roof dark
const RE = '#882211'; // roof edge
const SH = '#BB3818'; // shingle alt

const WD = '#8B6914'; // wood
const WK = '#6B4A0E'; // wood dark
const WL = '#9A7820'; // wood light
const PL = '#7A5810'; // plank

const ST = '#6a6a7a'; // stone
const SD = '#5a5a6a'; // stone dark
const SL = '#7a7a8a'; // stone light
const SE = '#4a4a5a'; // stone edge
const FN = '#3a3a4a'; // foundation

const GL = '#3a5a8a'; // glass
const GT = '#4a6a9a'; // glass light

const DR = '#5a3a1a'; // door
const DD = '#4a2a0a'; // door dark

const GD = '#ffd700'; // gold
const GK = '#ccaa00'; // gold dark

const CH = '#6a5050'; // chimney
const CK = '#5a4040'; // chimney dark

const WA = '#4a8acc'; // water
const WW = '#6aaaee'; // water light
const WV = '#3a6a9a'; // water dark

const AA = '#cc6622'; // awning
const AB = '#eedd88'; // awning stripe

const BN = '#cc3333'; // banner
const BK = '#aa2222'; // banner dark

const TN = '#c4a46a'; // tan
const TD = '#a4845a'; // tan dark
const TL = '#d4b47a'; // tan light

const YG = '#ffdd66'; // yellow glow
const YL = '#ffee88'; // glow light

const PI = '#c0c0cc'; // pillar
const PD = '#a0a0aa'; // pillar dark
const PT = '#d8d8dd'; // pillar light

const BS = '#5a6a8a'; // blue stone
const BD = '#4a5a7a'; // blue stone dark
const BL = '#6a7a9a'; // blue stone light

const SG = '#8a7a5a'; // sign
const SK = '#6a5a3a'; // sign dark

const RP = '#8a7a5a'; // rope
const BU = '#6a5540'; // bucket

// ── Grid Helpers ───────────────────────────────────────────────────────

function grid(w: number, h: number): PixelGrid {
  return Array.from({ length: h }, () => new Array<string | null>(w).fill(null));
}

function rc(g: PixelGrid, x: number, y: number, w: number, h: number, c: string) {
  for (let r = y; r < y + h; r++)
    for (let co = x; co < x + w; co++)
      if (r >= 0 && r < g.length && co >= 0 && co < g[0].length) g[r][co] = c;
}

function px(g: PixelGrid, x: number, y: number, c: string) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
}

function hl(g: PixelGrid, x: number, y: number, n: number, c: string) {
  for (let i = 0; i < n; i++) px(g, x + i, y, c);
}

function vl(g: PixelGrid, x: number, y: number, n: number, c: string) {
  for (let i = 0; i < n; i++) px(g, x, y + i, c);
}

function roof(g: PixelGrid, cx: number, ty: number, hb: number, ht: number, m: string, d: string, e: string) {
  for (let r = 0; r < ht; r++) {
    const hw = Math.floor((r + 1) * hb / ht);
    for (let x = cx - hw; x <= cx + hw; x++) px(g, x, ty + r, ((r + x) & 1) ? d : m);
    px(g, cx - hw, ty + r, e);
    px(g, cx + hw, ty + r, e);
  }
}

function wWin(g: PixelGrid, x: number, y: number, w: number, h: number) {
  rc(g, x, y, w, h, WK);
  rc(g, x + 1, y + 1, w - 2, h - 2, GL);
  px(g, x + 1, y + 1, GT);
  if (w >= 4) hl(g, x + 1, y + Math.floor(h / 2), w - 2, WK);
  if (h >= 4) vl(g, x + Math.floor(w / 2), y + 1, h - 2, WK);
}

function gWin(g: PixelGrid, x: number, y: number, w: number, h: number) {
  rc(g, x, y, w, h, WK);
  rc(g, x + 1, y + 1, w - 2, h - 2, YG);
  px(g, x + 1, y + 1, YL);
  if (w >= 4) hl(g, x + 1, y + Math.floor(h / 2), w - 2, WK);
  if (h >= 4) vl(g, x + Math.floor(w / 2), y + 1, h - 2, WK);
}

function wDoor(g: PixelGrid, x: number, y: number, w: number, h: number) {
  rc(g, x, y, w, h, DR);
  vl(g, x, y, h, DD);
  vl(g, x + w - 1, y, h, DD);
  hl(g, x, y, w, DD);
  if (h >= 6) hl(g, x + 1, y + Math.floor(h / 2), w - 2, DD);
  px(g, x + w - 2, y + Math.floor(h / 2) + 1, GD);
}

function planks(g: PixelGrid, x: number, y: number, w: number, h: number) {
  rc(g, x, y, w, h, WD);
  for (let r = 3; r < h; r += 4) hl(g, x, y + r, w, WK);
  for (let c = 5; c < w; c += 6)
    for (let r = 0; r < h; r++)
      if (r % 4 !== 3) px(g, x + c, y + r, PL);
  vl(g, x, y, h, WK);
  vl(g, x + w - 1, y, h, WK);
}

function stones(g: PixelGrid, x: number, y: number, w: number, h: number) {
  for (let r = 0; r < h; r++) {
    const off = (r & 1) ? 2 : 0;
    for (let c = 0; c < w; c++) {
      const b = (c + off) % 4;
      px(g, x + c, y + r, b === 0 ? SD : b === 1 ? SL : ST);
    }
  }
}

// ── Building Constructors ──────────────────────────────────────────────

function makeHouseSmall(): BuildingDef {
  const w = 24, h = 28, g = grid(w, h);

  // Roof (rows 2-11)
  roof(g, 11, 2, 10, 10, RF, RD, RE);
  hl(g, 1, 11, 22, RE);

  // Chimney above roof (rows 0-11)
  rc(g, 17, 0, 2, 12, CH);
  vl(g, 17, 0, 12, CK);
  hl(g, 17, 0, 2, CK);

  // Walls (rows 12-24)
  planks(g, 3, 12, 18, 13);
  hl(g, 2, 12, 20, WK);

  // Window with shutters
  wWin(g, 5, 15, 4, 4);
  vl(g, 4, 15, 4, WK);
  vl(g, 9, 15, 4, WK);

  // Door
  wDoor(g, 14, 19, 4, 6);
  // Doorstep
  hl(g, 13, 24, 6, SE);

  // Foundation (rows 25-27)
  rc(g, 2, 25, 20, 3, SE);
  hl(g, 2, 25, 20, ST);

  return { pixels: g, width: w, height: h };
}

function makeHouseMedium(): BuildingDef {
  const w = 32, h = 28, g = grid(w, h);

  // Roof
  roof(g, 15, 2, 14, 10, RF, RD, RE);
  hl(g, 1, 11, 30, RE);

  // Chimney
  rc(g, 25, 0, 2, 12, CH);
  vl(g, 25, 0, 12, CK);
  hl(g, 25, 0, 2, CK);

  // Walls
  planks(g, 2, 12, 28, 13);
  hl(g, 1, 12, 30, WK);

  // Two windows with shutters
  wWin(g, 4, 15, 5, 4);
  vl(g, 3, 15, 4, WK); vl(g, 9, 15, 4, WK);
  wWin(g, 14, 15, 5, 4);
  vl(g, 13, 15, 4, WK); vl(g, 19, 15, 4, WK);

  // Door
  wDoor(g, 23, 19, 5, 6);

  // Flower box
  rc(g, 4, 19, 5, 1, WK);
  px(g, 5, 19, '#4a8a4a'); px(g, 7, 19, '#cc5544');
  rc(g, 14, 19, 5, 1, WK);
  px(g, 15, 19, '#cc5544'); px(g, 17, 19, '#4a8a4a');

  // Foundation
  rc(g, 1, 25, 30, 3, SE);
  hl(g, 1, 25, 30, ST);

  return { pixels: g, width: w, height: h };
}

function makeHouseLarge(): BuildingDef {
  const w = 40, h = 32, g = grid(w, h);

  // Roof (rows 2-13)
  roof(g, 19, 2, 18, 12, RF, SH, RE);
  hl(g, 1, 13, 38, RE);

  // Chimney (3 wide)
  rc(g, 33, 0, 3, 14, CH);
  vl(g, 33, 0, 14, CK);
  hl(g, 33, 0, 3, CK);

  // Upper walls - wood (rows 14-21)
  planks(g, 2, 14, 36, 8);
  hl(g, 1, 14, 38, WK);

  // Lower walls - stone (rows 22-27)
  stones(g, 2, 22, 36, 6);
  hl(g, 2, 22, 36, WK);

  // Three windows
  wWin(g, 4, 16, 5, 4);
  wWin(g, 14, 16, 5, 4);
  wWin(g, 28, 16, 5, 4);
  for (const sx of [3, 9, 13, 19, 27, 33]) vl(g, sx, 16, 4, WK);

  // Large door (center, stone section)
  wDoor(g, 17, 23, 6, 5);
  hl(g, 17, 22, 6, SD);

  // Foundation (rows 28-31)
  rc(g, 1, 28, 38, 4, FN);
  hl(g, 1, 28, 38, SE);

  return { pixels: g, width: w, height: h };
}

function makeShop(): BuildingDef {
  const w = 36, h = 32, g = grid(w, h);

  // Roof (rows 0-7)
  roof(g, 17, 0, 16, 8, SH, RD, RE);

  // Walls (rows 8-27)
  planks(g, 2, 8, 32, 20);
  hl(g, 1, 8, 34, WK);

  // Awning/canopy (rows 9-12)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 28; c++)
      px(g, 3 + c, 9 + r, ((c + r) % 4 < 2) ? AA : AB);
  hl(g, 3, 12, 28, WK);

  // Display window
  rc(g, 4, 14, 12, 8, WK);
  rc(g, 5, 15, 10, 6, GL);
  px(g, 5, 15, GT);
  // Goods in window
  rc(g, 6, 19, 2, 2, '#cc8844');
  rc(g, 9, 18, 2, 3, '#88aa44');
  px(g, 12, 19, '#ddaa44');
  px(g, 13, 20, '#cc6644');

  // Counter shelf
  rc(g, 3, 22, 14, 2, WK);
  px(g, 5, 22, '#dd6644');
  px(g, 8, 22, '#44aa66');
  px(g, 11, 22, '#ddaa44');

  // Sign
  rc(g, 24, 13, 8, 4, SG);
  hl(g, 24, 13, 8, SK);
  hl(g, 24, 16, 8, SK);
  px(g, 26, 14, GD); px(g, 27, 14, GD); px(g, 29, 14, GD);
  px(g, 26, 15, GD); px(g, 28, 15, GD); px(g, 30, 15, GD);

  // Door
  wDoor(g, 22, 21, 5, 7);

  // Foundation (rows 28-31)
  rc(g, 1, 28, 34, 4, SE);
  hl(g, 1, 28, 34, ST);

  return { pixels: g, width: w, height: h };
}

function makeArena(): BuildingDef {
  const w = 48, h = 36, g = grid(w, h);

  // Crenellations (rows 0-3)
  for (let bx = 2; bx < 46; bx += 6) {
    rc(g, bx, 0, 3, 2, SL);
    rc(g, bx, 2, 3, 2, ST);
  }
  hl(g, 2, 2, 44, ST);
  hl(g, 2, 3, 44, SD);

  // Upper wall with small arch windows (rows 4-7)
  stones(g, 2, 4, 44, 4);
  for (let ax = 6; ax < 42; ax += 8) {
    rc(g, ax, 5, 3, 2, SD);
    px(g, ax + 1, 4, SD);
  }

  // Main walls (rows 8-27)
  stones(g, 2, 8, 44, 20);
  // Vertical pilasters
  for (const p of [4, 14, 24, 34, 44]) {
    vl(g, p, 4, 24, SL);
    vl(g, p - 1, 4, 24, SD);
  }

  // Red banners (rows 5-16)
  for (let r = 0; r < 12; r++) {
    const bw = r < 2 ? 3 : r < 8 ? 4 : 3;
    const b1 = 6 - Math.floor(bw / 2);
    rc(g, b1, 5 + r, bw, 1, r % 2 === 0 ? BN : BK);
    const b2 = 41 - Math.floor(bw / 2);
    rc(g, b2, 5 + r, bw, 1, r % 2 === 0 ? BN : BK);
  }
  px(g, 6, 17, BK); px(g, 41, 17, BK);

  // Arched entrance (center, rows 20-27)
  const al = 19, ar = 28;
  for (let r = 24; r <= 27; r++)
    for (let c = al + 1; c < ar; c++) g[r][c] = null;
  for (let c = al + 2; c < ar - 1; c++) g[23][c] = null;
  for (let c = al + 3; c < ar - 2; c++) g[22][c] = null;
  // Arch frame
  vl(g, al, 20, 8, SL);
  vl(g, ar, 20, 8, SL);
  hl(g, al + 3, 20, ar - al - 5, SL);
  px(g, al + 1, 21, SL); px(g, ar - 1, 21, SL);
  px(g, al + 2, 20, SL); px(g, ar - 2, 20, SL);

  // Torch sconces on sides of entrance
  px(g, al - 2, 21, '#ff8844'); px(g, al - 2, 22, '#cc6622');
  px(g, ar + 2, 21, '#ff8844'); px(g, ar + 2, 22, '#cc6622');

  // Foundation/steps (rows 28-35)
  rc(g, 1, 28, 46, 4, SE);
  hl(g, 1, 28, 46, ST);
  rc(g, 0, 32, 48, 4, FN);
  hl(g, 0, 32, 48, SE);

  return { pixels: g, width: w, height: h };
}

function makeCouncil(): BuildingDef {
  const w = 48, h = 40, g = grid(w, h);

  // Triangular pediment (rows 0-13)
  roof(g, 23, 0, 22, 14, BS, BD, BD);
  // Golden ridge
  for (let r = 0; r < 14; r++) px(g, 23, r, GK);
  // Golden trim at base
  hl(g, 1, 13, 46, GD);

  // Entablature (rows 14-15)
  rc(g, 2, 14, 44, 2, BL);
  hl(g, 2, 14, 44, GK);
  hl(g, 2, 15, 44, BD);

  // Main facade (rows 16-35)
  stones(g, 4, 16, 40, 20);

  // 4 Pillars
  for (const cx of [6, 16, 30, 40]) {
    // Capital
    rc(g, cx - 1, 16, 4, 2, PT);
    hl(g, cx - 1, 16, 4, GK);
    // Shaft
    rc(g, cx, 18, 2, 16, PI);
    vl(g, cx, 18, 16, PD);
    vl(g, cx + 1, 18, 16, PT);
    // Base
    rc(g, cx - 1, 34, 4, 2, PD);
  }

  // Windows between pillars
  wWin(g, 9, 20, 5, 6);
  wWin(g, 34, 20, 5, 6);

  // Grand double door (center)
  rc(g, 19, 22, 10, 14, DR);
  vl(g, 19, 22, 14, DD); vl(g, 28, 22, 14, DD);
  hl(g, 19, 22, 10, DD);
  vl(g, 24, 23, 12, DD);
  hl(g, 20, 28, 8, DD);
  px(g, 23, 30, GD); px(g, 25, 30, GD);
  // Arch
  hl(g, 20, 21, 8, GD);
  px(g, 19, 21, GK); px(g, 28, 21, GK);

  // Golden emblem diamond on pediment
  px(g, 23, 5, GD);
  px(g, 22, 6, GD); px(g, 24, 6, GD);
  px(g, 21, 7, GD); px(g, 23, 7, GD); px(g, 25, 7, GD);
  px(g, 22, 8, GD); px(g, 24, 8, GD);
  px(g, 23, 9, GD);

  // Foundation/steps (rows 36-39)
  rc(g, 2, 36, 44, 2, SE);
  hl(g, 2, 36, 44, ST);
  rc(g, 0, 38, 48, 2, FN);
  hl(g, 0, 38, 48, SE);

  return { pixels: g, width: w, height: h };
}

function makeLibrary(): BuildingDef {
  const w = 32, h = 40, g = grid(w, h);

  // Steep peaked roof (rows 0-13)
  roof(g, 15, 0, 14, 14, TD, TN, TD);
  hl(g, 1, 13, 30, WK);

  // Walls (rows 14-35)
  rc(g, 2, 14, 28, 22, TN);
  vl(g, 2, 14, 22, TD);
  vl(g, 29, 14, 22, TD);
  hl(g, 2, 14, 28, WK);
  hl(g, 2, 24, 28, WK);

  // Tall windows with bookshelves
  const bkColors = ['#cc4444', '#4488cc', '#44aa44', '#ccaa44'];
  for (const wx of [4, 13, 22]) {
    rc(g, wx, 15, 5, 18, WK);
    rc(g, wx + 1, 16, 3, 16, GL);
    // Shelves and books
    for (let sy = 19; sy <= 31; sy += 4) {
      hl(g, wx + 1, sy, 3, WK);
    }
    let bi = 0;
    for (let sy = 20; sy <= 31; sy += 4) {
      for (let bx = 0; bx < 3; bx++) {
        px(g, wx + 1 + bx, sy, bkColors[(bi + bx) % 4]);
        if (sy + 1 <= 31) px(g, wx + 1 + bx, sy + 1, bkColors[(bi + bx + 1) % 4]);
      }
      bi++;
    }
    px(g, wx + 1, 16, GT);
  }

  // Door
  wDoor(g, 12, 30, 5, 6);
  // Arch
  hl(g, 13, 29, 3, TD);
  px(g, 14, 28, TD);

  // Foundation (rows 36-39)
  rc(g, 1, 36, 30, 4, SE);
  hl(g, 1, 36, 30, ST);

  return { pixels: g, width: w, height: h };
}

function makeTavern(): BuildingDef {
  const w = 36, h = 32, g = grid(w, h);

  // Roof (rows 2-9)
  roof(g, 17, 2, 16, 8, RF, RD, RE);
  hl(g, 1, 9, 34, RE);

  // Chimney
  rc(g, 29, 0, 2, 10, CH);
  vl(g, 29, 0, 10, CK);
  hl(g, 29, 0, 2, CK);

  // Walls (rows 10-27)
  planks(g, 2, 10, 32, 18);
  hl(g, 1, 10, 34, WK);

  // Hanging sign bracket
  hl(g, 30, 11, 4, WK);
  vl(g, 33, 11, 2, WK);
  // Sign board
  rc(g, 31, 13, 4, 3, SG);
  hl(g, 31, 13, 4, SK); hl(g, 31, 15, 4, SK);
  px(g, 32, 14, GD); px(g, 33, 14, GD);

  // Two glowing windows
  gWin(g, 4, 14, 5, 5);
  gWin(g, 14, 14, 5, 5);
  // Shutters
  vl(g, 3, 14, 5, WK); vl(g, 9, 14, 5, WK);
  vl(g, 13, 14, 5, WK); vl(g, 19, 14, 5, WK);

  // Door
  wDoor(g, 23, 21, 5, 7);

  // Barrel beside door
  rc(g, 20, 25, 3, 3, '#7a5a30');
  hl(g, 20, 26, 3, '#5a4020');

  // Foundation (rows 28-31)
  rc(g, 1, 28, 34, 4, SE);
  hl(g, 1, 28, 34, ST);

  return { pixels: g, width: w, height: h };
}

function makeWell(): BuildingDef {
  const w = 16, h = 16, g = grid(w, h);

  // Roof beam
  hl(g, 2, 0, 12, RE);
  hl(g, 3, 1, 10, WD);
  hl(g, 3, 0, 10, WK);

  // Support posts
  vl(g, 3, 0, 10, WK);
  vl(g, 12, 0, 10, WK);

  // Rope and bucket
  vl(g, 8, 2, 4, RP);
  rc(g, 7, 6, 3, 2, BU);
  px(g, 7, 6, WK); px(g, 9, 6, WK);

  // Stone well rim
  rc(g, 3, 8, 10, 2, SL);
  hl(g, 3, 8, 10, ST);

  // Well walls
  stones(g, 4, 10, 8, 4);
  vl(g, 4, 10, 4, SD);
  vl(g, 11, 10, 4, SD);

  // Dark water inside
  hl(g, 5, 12, 6, '#1a2a3a');
  hl(g, 5, 13, 6, '#0a1a2a');

  // Base
  rc(g, 3, 14, 10, 2, SE);
  hl(g, 3, 14, 10, ST);

  return { pixels: g, width: w, height: h };
}

function makeFountain(): BuildingDef {
  const w = 24, h = 20, g = grid(w, h);

  // Spout column
  rc(g, 11, 2, 2, 8, ST);
  vl(g, 11, 2, 8, SD);
  vl(g, 12, 2, 8, SL);
  // Spout top cap
  rc(g, 10, 2, 4, 1, SL);
  px(g, 11, 1, SL); px(g, 12, 1, SL);

  // Upper basin (rows 8-9)
  rc(g, 6, 8, 12, 2, ST);
  hl(g, 6, 8, 12, SL);
  hl(g, 6, 9, 12, SD);
  hl(g, 7, 9, 10, WA);

  // Pedestal (rows 10-13)
  rc(g, 9, 10, 6, 4, ST);
  vl(g, 9, 10, 4, SD);
  vl(g, 14, 10, 4, SL);

  // Lower basin (rows 14-15)
  rc(g, 2, 14, 20, 2, ST);
  hl(g, 2, 14, 20, SL);
  hl(g, 2, 15, 20, SD);
  hl(g, 3, 15, 18, WA);

  // Base (rows 16-19)
  rc(g, 3, 16, 18, 2, SD);
  rc(g, 1, 18, 22, 2, SE);
  hl(g, 1, 18, 22, ST);

  return { pixels: g, width: w, height: h };
}

// ── Building Cache ─────────────────────────────────────────────────────

const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house_small: makeHouseSmall(),
  house_medium: makeHouseMedium(),
  house_large: makeHouseLarge(),
  shop: makeShop(),
  arena: makeArena(),
  council: makeCouncil(),
  library: makeLibrary(),
  tavern: makeTavern(),
  well: makeWell(),
  fountain: makeFountain(),
};

// ── Chimney Smoke Animation ────────────────────────────────────────────

const CHIMNEY_POS: Partial<Record<BuildingType, number>> = {
  house_small: 17,
  house_medium: 25,
  house_large: 33,
  tavern: 29,
};

function drawSmoke(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number,
  type: BuildingType, scale: number, frame: number,
) {
  const cx = CHIMNEY_POS[type];
  if (cx === undefined) return;

  const puffs = [
    { dx: 0, dy: -1, a: 0.45 },
    { dx: (frame & 1) ? -1 : 1, dy: -2, a: 0.3 },
    { dx: (frame & 1) ? 1 : -1, dy: -3, a: 0.18 },
    { dx: ((frame >> 1) & 1) ? 0 : 1, dy: -4, a: 0.08 },
  ];

  for (const p of puffs) {
    ctx.fillStyle = `rgba(180,180,190,${p.a})`;
    ctx.fillRect(bx + (cx + p.dx) * scale, by + p.dy * scale, scale, scale);
  }
}

// ── Fountain Water Animation ───────────────────────────────────────────

function drawWaterAnim(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number,
  scale: number, frame: number,
) {
  const even = (frame & 1) === 0;

  // Spray above spout
  ctx.fillStyle = even ? WW : WA;
  const spray: [number, number][] = even
    ? [[11, 0], [12, 0], [10, 1], [13, 1]]
    : [[11, 0], [12, 0], [9, 1], [14, 1]];
  for (const [dx, dy] of spray)
    ctx.fillRect(bx + dx * scale, by + dy * scale, scale, scale);

  // Falling water on sides
  ctx.fillStyle = even ? WA : WW;
  const falls: [number, number][] = even
    ? [[6, 10], [17, 10], [5, 12], [18, 12]]
    : [[7, 10], [16, 10], [4, 12], [19, 12]];
  for (const [dx, dy] of falls)
    ctx.fillRect(bx + dx * scale, by + dy * scale, scale, scale);

  // Ripple in lower basin
  ctx.fillStyle = WW;
  const rx = even ? 8 : 14;
  ctx.fillRect(bx + rx * scale, by + 15 * scale, scale * 2, scale);
}

// ── Exports ────────────────────────────────────────────────────────────

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: BuildingType,
  scale: number,
  frame?: number,
): void {
  const def = BUILDINGS[type];
  if (!def) return;

  const { pixels, width, height } = def;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const color = pixels[row][col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }

  const f = frame ?? 0;
  if (type in CHIMNEY_POS) drawSmoke(ctx, x, y, type, scale, f);
  if (type === 'fountain') drawWaterAnim(ctx, x, y, scale, f);
}

export function getBuildingSize(type: BuildingType): { width: number; height: number } {
  const def = BUILDINGS[type];
  if (!def) return { width: 32, height: 32 };
  return { width: def.width, height: def.height };
}

export function locationToBuildingType(locType: string, locName: string): BuildingType {
  const t = locType.toLowerCase();
  const n = locName.toLowerCase();
  if (t === 'trade' || t === 'market' || n.includes('market') || n.includes('shop')) return 'shop';
  if (t === 'conflict' || t === 'arena' || n.includes('arena')) return 'arena';
  if (t === 'diplomacy' || t === 'council' || n.includes('council') || n.includes('hall')) return 'council';
  if (t === 'knowledge' || t === 'library' || n.includes('library')) return 'library';
  if (t === 'exploration' || t === 'wilderness' || n.includes('tavern') || n.includes('inn')) return 'tavern';
  if (n.includes('well')) return 'well';
  if (n.includes('fountain')) return 'fountain';
  return 'tavern';
}
