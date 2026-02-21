// Pixel art terrain tiles and nature objects for Canvas rendering
// Tiles: 16x16, Objects: various sizes

export type TileType = 'grass' | 'grass2' | 'grass3' | 'grass_dark' | 'dirt' | 'cobblestone' | 'water' | 'water2' | 'sand' | 'flowers';
export type ObjectType = 'tree' | 'tree2' | 'tree3' | 'pine' | 'bush' | 'rock_small' | 'rock_large' | 'rock_mossy' | 'fence_h' | 'fence_post' | 'bridge_h' | 'bridge_v' | 'lamp_post' | 'sign_post' | 'flower_patch' | 'tall_grass';

// ==================== TILE DATA (16x16 each) ====================

const G1 = '#1a4a1a'; // grass dark
const G2 = '#2a5a2a'; // grass mid
const G3 = '#2a6a2a'; // grass
const G4 = '#3a7a3a'; // grass light
const GD = '#143a14'; // dark grass base
const GD2 = '#1a3a1a';

const D1 = '#4a3a20'; // dirt dark
const D2 = '#5a4a30'; // dirt mid
const D3 = '#6a5a40'; // dirt light
const D4 = '#7a6a50'; // dirt highlight

const S1 = '#4a4a5a'; // stone dark
const S2 = '#5a5a6a'; // stone mid
const S3 = '#6a6a7a'; // stone light
const S4 = '#7a7a8a'; // stone highlight

const W1 = '#0a2a5a'; // water dark
const W2 = '#1a3a6a'; // water mid
const W3 = '#2a4a7a'; // water light
const W4 = '#3a5a8a'; // water highlight

function makeTile(base: string, details: [number, number, string][]): string[][] {
  const tile: string[][] = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) row.push(base);
    tile.push(row);
  }
  for (const [r, c, color] of details) {
    if (r < 16 && c < 16) tile[r][c] = color;
  }
  return tile;
}

const GRASS_V1 = makeTile(G2, [
  [2, 5, G4], [3, 12, G3], [6, 1, G4], [7, 9, G3], [8, 14, G4],
  [10, 3, G3], [11, 10, G4], [13, 7, G3], [14, 2, G4], [1, 14, G1],
  [5, 8, G1], [9, 4, G1], [12, 13, G1], [15, 6, G3],
]);

const GRASS_V2 = makeTile(G2, [
  [1, 3, G4], [2, 10, G3], [4, 7, G4], [5, 14, G1], [7, 2, G3],
  [8, 11, G4], [10, 6, G1], [11, 13, G4], [13, 1, G3], [14, 9, G4],
  [3, 15, G1], [6, 5, G4], [9, 12, G3], [12, 8, G1],
]);

const GRASS_V3 = makeTile(G3, [
  [0, 8, G2], [2, 3, G4], [3, 13, G2], [5, 6, G4], [6, 11, G2],
  [8, 1, G4], [9, 9, G2], [11, 5, G4], [12, 14, G2], [14, 4, G4],
  [1, 10, G1], [4, 2, G1], [7, 15, G1], [10, 7, G1], [13, 12, G1],
]);

const DARK_GRASS = makeTile(GD, [
  [1, 4, GD2], [3, 11, GD2], [6, 2, GD2], [8, 9, GD2], [11, 6, GD2],
  [13, 13, GD2], [5, 7, G1], [10, 3, G1], [14, 10, G1],
]);

const DIRT_TILE = makeTile(D2, [
  [1, 4, D3], [2, 11, D1], [4, 7, D3], [5, 2, D4], [6, 13, D1],
  [8, 5, D3], [9, 10, D4], [10, 1, D1], [12, 8, D3], [13, 14, D1],
  [3, 6, D4], [7, 12, D1], [11, 3, D4], [14, 9, D1], [15, 5, D3],
]);

const COBBLESTONE_TILE: string[][] = (() => {
  const t: string[][] = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) {
      // Create a brick-like pattern
      const isHLine = r % 4 === 0;
      const offset = (Math.floor(r / 4) % 2) * 4;
      const isVLine = (c + offset) % 8 === 0;
      if (isHLine || isVLine) {
        row.push(S1);
      } else {
        row.push(((r + c) % 7 < 2) ? S3 : S2);
      }
    }
    t.push(row);
  }
  return t;
})();

const WATER_F1 = makeTile(W2, [
  [1, 3, W3], [1, 4, W3], [1, 5, W4], [1, 6, W3],
  [5, 8, W3], [5, 9, W4], [5, 10, W4], [5, 11, W3],
  [9, 1, W3], [9, 2, W4], [9, 3, W3],
  [13, 6, W3], [13, 7, W4], [13, 8, W3], [13, 9, W3],
  [3, 12, W1], [7, 5, W1], [11, 10, W1], [15, 2, W1],
]);

const WATER_F2 = makeTile(W2, [
  [2, 7, W3], [2, 8, W4], [2, 9, W3],
  [6, 2, W3], [6, 3, W4], [6, 4, W3],
  [10, 11, W3], [10, 12, W4], [10, 13, W3],
  [14, 4, W3], [14, 5, W4], [14, 6, W3],
  [0, 10, W1], [4, 1, W1], [8, 14, W1], [12, 7, W1],
]);

const SAND_TILE = makeTile('#8a7a5a', [
  [1, 5, '#9a8a6a'], [3, 12, '#7a6a4a'], [5, 3, '#9a8a6a'], [7, 10, '#7a6a4a'],
  [9, 7, '#9a8a6a'], [11, 1, '#7a6a4a'], [13, 14, '#9a8a6a'], [14, 8, '#7a6a4a'],
]);

const FLOWERS_TILE = makeTile(G2, [
  [2, 4, '#cc4466'], [2, 5, '#dd5577'], [4, 11, '#ffaa44'], [4, 12, '#ffbb55'],
  [7, 2, '#44aaff'], [7, 3, '#55bbff'], [9, 9, '#ff66aa'], [9, 10, '#ff77bb'],
  [12, 6, '#ffdd44'], [12, 7, '#ffee55'], [14, 13, '#cc44cc'], [14, 14, '#dd55dd'],
  [1, 8, G4], [5, 3, G4], [8, 13, G4], [11, 1, G4], [13, 10, G4],
]);

const TILE_MAP: Record<string, string[][] | string[][][]> = {
  grass: [GRASS_V1, GRASS_V2, GRASS_V3],
  grass2: [GRASS_V2],
  grass3: [GRASS_V3],
  grass_dark: [DARK_GRASS],
  dirt: [DIRT_TILE],
  cobblestone: [COBBLESTONE_TILE],
  water: [WATER_F1, WATER_F2],
  water2: [WATER_F2, WATER_F1],
  sand: [SAND_TILE],
  flowers: [FLOWERS_TILE],
};

export function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: TileType,
  variant: number,
  frame: number,
  scale: number,
): void {
  const tileData = TILE_MAP[type];
  if (!tileData) return;

  const isAnimated = type === 'water' || type === 'water2';
  const idx = isAnimated ? (frame % tileData.length) : (variant % tileData.length);
  const tile = tileData[idx] as string[][];

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      ctx.fillStyle = tile[r][c];
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

// ==================== NATURE OBJECTS ====================

type PixelGrid = (string | null)[][];

interface ObjectDef {
  pixels: PixelGrid;
  width: number;
  height: number;
}

const T = null; // transparent

// --- Trees ---
const TREE_1: ObjectDef = {
  width: 16, height: 24,
  pixels: [
    [T,T,T,T,T,T,G3,G3,G3,G3,T,T,T,T,T,T],
    [T,T,T,T,T,G3,G4,G4,G3,G3,G3,T,T,T,T,T],
    [T,T,T,T,G3,G4,G4,G3,G3,G3,G3,G3,T,T,T,T],
    [T,T,T,G3,G4,G3,G3,'#1a5a1a','#1a5a1a',G3,G3,G3,G3,T,T,T],
    [T,T,G3,G3,G3,G3,'#1a5a1a','#1a5a1a','#1a5a1a',G3,G3,G3,G3,G3,T,T],
    [T,G3,G3,G3,'#1a5a1a','#1a5a1a',G2,G2,'#1a5a1a','#1a5a1a',G3,G3,G3,G3,G3,T],
    [T,G3,G3,'#1a5a1a','#1a5a1a',G2,G2,G2,G2,'#1a5a1a','#1a5a1a',G3,G3,G3,G3,T],
    [G3,G3,G3,'#1a5a1a',G2,G2,G2,G2,G2,G2,'#1a5a1a',G3,G3,G3,G3,G3],
    [G3,G3,'#1a5a1a',G2,G2,G2,G1,G1,G2,G2,G2,'#1a5a1a',G3,G3,G3,G3],
    [T,G3,'#1a5a1a',G2,G2,G1,G1,G1,G1,G2,G2,'#1a5a1a',G3,G3,G3,T],
    [T,G3,G3,'#1a5a1a',G2,G2,G1,G1,G2,G2,'#1a5a1a',G3,G3,G3,T,T],
    [T,T,G3,G3,'#1a5a1a','#1a5a1a',G2,G2,'#1a5a1a','#1a5a1a',G3,G3,G3,T,T,T],
    [T,T,T,G3,G3,'#1a5a1a','#1a5a1a','#1a5a1a','#1a5a1a',G3,G3,G3,T,T,T,T],
    [T,T,T,T,G3,G3,'#1a5a1a','#1a5a1a',G3,G3,G3,T,T,T,T,T],
    [T,T,T,T,T,G3,G3,G3,G3,G3,T,T,T,T,T,T],
    [T,T,T,T,T,T,G3,G3,G3,T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,'#5a3a1a','#5a3a1a',T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,'#5a3a1a','#5a3a1a',T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,'#4a2a0a','#4a2a0a',T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,'#4a2a0a','#4a2a0a',T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,'#4a2a0a','#4a2a0a',T,T,T,T,T,T,T],
    [T,T,T,T,T,T,'#3a1a0a','#4a2a0a','#4a2a0a','#3a1a0a',T,T,T,T,T,T],
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  ],
};

// Pine tree
const PINE: ObjectDef = {
  width: 12, height: 28,
  pixels: (() => {
    const p: PixelGrid = [];
    const dk = '#0e3e0e';
    const md = '#1a5a2a';
    const lt = '#2a7a3a';
    const trunk = '#4a2a0a';
    // Point
    p.push([T,T,T,T,T,md,md,T,T,T,T,T]);
    p.push([T,T,T,T,dk,md,lt,dk,T,T,T,T]);
    p.push([T,T,T,dk,md,lt,lt,md,dk,T,T,T]);
    // Upper canopy
    p.push([T,T,dk,md,md,lt,lt,md,md,dk,T,T]);
    p.push([T,dk,md,md,lt,lt,lt,lt,md,md,dk,T]);
    p.push([dk,md,md,lt,lt,lt,lt,lt,lt,md,md,dk]);
    // Indent
    p.push([T,T,T,dk,md,md,md,md,dk,T,T,T]);
    // Middle canopy
    p.push([T,T,dk,md,md,lt,lt,md,md,dk,T,T]);
    p.push([T,dk,md,md,lt,lt,lt,lt,md,md,dk,T]);
    p.push([dk,md,dk,lt,lt,lt,lt,lt,lt,dk,md,dk]);
    p.push([dk,md,md,lt,lt,lt,lt,lt,lt,md,md,dk]);
    // Indent
    p.push([T,T,T,dk,md,md,md,md,dk,T,T,T]);
    // Lower canopy
    p.push([T,dk,md,md,lt,lt,lt,lt,md,md,dk,T]);
    p.push([dk,md,md,lt,lt,lt,lt,lt,lt,md,md,dk]);
    p.push([dk,dk,md,md,lt,lt,lt,lt,md,md,dk,dk]);
    p.push([dk,md,md,md,lt,lt,lt,lt,md,md,md,dk]);
    // Indent
    p.push([T,T,dk,md,md,md,md,md,md,dk,T,T]);
    // Bottom canopy
    p.push([T,dk,md,md,md,lt,lt,md,md,md,dk,T]);
    p.push([dk,md,md,md,lt,lt,lt,lt,md,md,md,dk]);
    p.push([dk,dk,md,md,md,lt,lt,md,md,md,dk,dk]);
    // Trunk
    p.push([T,T,T,T,T,trunk,trunk,T,T,T,T,T]);
    p.push([T,T,T,T,T,trunk,trunk,T,T,T,T,T]);
    p.push([T,T,T,T,T,trunk,trunk,T,T,T,T,T]);
    p.push([T,T,T,T,trunk,trunk,trunk,trunk,T,T,T,T]);
    // Pad to 28
    for (let i = p.length; i < 28; i++) p.push(Array(12).fill(T));
    return p;
  })(),
};

// Bush
const BUSH: ObjectDef = {
  width: 12, height: 8,
  pixels: [
    [T,T,T,G3,G3,G4,G4,G3,G3,T,T,T],
    [T,T,G3,G4,G4,G4,G4,G4,G4,G3,T,T],
    [T,G3,G4,G4,G3,G3,G3,G3,G4,G4,G3,T],
    [G3,G3,G3,G3,G2,G2,G2,G2,G3,G3,G3,G3],
    [G3,G2,G2,G2,G2,G1,G1,G2,G2,G2,G2,G3],
    [T,G3,G2,G2,G1,G1,G1,G1,G2,G2,G3,T],
    [T,T,G3,G3,G2,G2,G2,G2,G3,G3,T,T],
    [T,T,T,T,G3,G3,G3,G3,T,T,T,T],
  ],
};

// Small rock
const ROCK_SMALL: ObjectDef = {
  width: 8, height: 6,
  pixels: [
    [T,T,S3,S4,S4,S3,T,T],
    [T,S3,S4,S4,S3,S3,S2,T],
    [S2,S3,S3,S3,S2,S2,S2,S1],
    [S2,S2,S2,S2,S1,S1,S1,S1],
    [T,S1,S1,S1,S1,S1,T,T],
    [T,T,T,T,T,T,T,T],
  ],
};

// Large rock
const ROCK_LARGE: ObjectDef = {
  width: 14, height: 10,
  pixels: [
    [T,T,T,T,S3,S4,S4,S4,S3,S3,T,T,T,T],
    [T,T,T,S3,S4,S4,S4,S4,S3,S3,S2,T,T,T],
    [T,T,S3,S4,S4,S3,S3,S3,S3,S2,S2,S2,T,T],
    [T,S2,S3,S3,S3,S3,S2,S2,S2,S2,S2,S2,S1,T],
    [S2,S2,S3,S3,S2,S2,S2,S2,S2,S1,S1,S1,S1,S1],
    [S2,S2,S2,S2,S2,S2,S1,S1,S1,S1,S1,S1,S1,S1],
    [T,S1,S2,S2,S2,S1,S1,S1,S1,S1,S1,S1,S1,T],
    [T,S1,S1,S1,S1,S1,S1,S1,S1,S1,S1,S1,T,T],
    [T,T,T,S1,S1,S1,S1,S1,S1,S1,T,T,T,T],
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  ],
};

// Lamp post
const LAMP_POST: ObjectDef = {
  width: 6, height: 20,
  pixels: (() => {
    const iron = '#4a4a4a';
    const iron2 = '#5a5a5a';
    const glow = '#ffd700';
    const glow2 = '#ffee88';
    const p: PixelGrid = [];
    // Lamp head
    p.push([T, glow, glow2, glow2, glow, T]);
    p.push([glow, glow2, glow2, glow2, glow2, glow]);
    p.push([glow, glow2, glow2, glow2, glow2, glow]);
    p.push([T, iron2, iron2, iron2, iron2, T]);
    // Post
    for (let i = 0; i < 14; i++) {
      p.push([T, T, iron, iron2, T, T]);
    }
    // Base
    p.push([T, iron, iron, iron, iron, T]);
    p.push([iron, iron, iron, iron, iron, iron]);
    return p;
  })(),
};

// Fence horizontal segment
const FENCE_H: ObjectDef = {
  width: 16, height: 10,
  pixels: (() => {
    const w1 = '#6a4a2a';
    const w2 = '#7a5a3a';
    const w3 = '#5a3a1a';
    const p: PixelGrid = [];
    // Top rail
    p.push([T,T,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,T,T]);
    p.push([T,T,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,T,T]);
    // Gap
    p.push([T,T,w3,T,T,T,T,T,T,T,T,T,T,w3,T,T]);
    p.push([T,T,w3,T,T,T,T,T,T,T,T,T,T,w3,T,T]);
    // Bottom rail
    p.push([T,T,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,w2,T,T]);
    p.push([T,T,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,w1,T,T]);
    // Posts continue
    p.push([T,T,w3,T,T,T,T,T,T,T,T,T,T,w3,T,T]);
    p.push([T,T,w3,T,T,T,T,T,T,T,T,T,T,w3,T,T]);
    p.push([T,w3,w3,w3,T,T,T,T,T,T,T,T,w3,w3,w3,T]);
    p.push([T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T]);
    return p;
  })(),
};

// Sign post
const SIGN_POST: ObjectDef = {
  width: 10, height: 16,
  pixels: (() => {
    const w1 = '#6a4a2a';
    const w2 = '#7a5a3a';
    const w3 = '#8a6a4a';
    const post = '#5a3a1a';
    const p: PixelGrid = [];
    // Sign board
    p.push([T, w1,w1,w1,w1,w1,w1,w1,w1, T]);
    p.push([w1,w2,w3,w3,w3,w3,w3,w3,w2,w1]);
    p.push([w1,w3,w3,w3,w3,w3,w3,w3,w3,w1]);
    p.push([w1,w3,w3,w3,w3,w3,w3,w3,w3,w1]);
    p.push([w1,w2,w2,w2,w2,w2,w2,w2,w2,w1]);
    p.push([T, w1,w1,w1,w1,w1,w1,w1,w1, T]);
    // Post
    for (let i = 0; i < 8; i++) {
      p.push([T,T,T,T,post,post,T,T,T,T]);
    }
    // Base
    p.push([T,T,T,post,post,post,post,T,T,T]);
    p.push([T,T,T,T,T,T,T,T,T,T]);
    return p;
  })(),
};

// Flower patch
const FLOWER_PATCH: ObjectDef = {
  width: 16, height: 8,
  pixels: [
    [T,T,'#cc4466',T,T,T,'#ffaa44',T,T,T,T,'#44aaff',T,T,T,T],
    [T,'#cc4466','#dd5577','#cc4466',T,'#ffaa44','#ffbb55','#ffaa44',T,T,'#44aaff','#55bbff','#44aaff',T,T,T],
    [T,T,'#cc4466',T,T,T,'#ffaa44',T,T,T,T,'#44aaff',T,T,'#ff66aa',T],
    [T,T,T,T,T,T,T,T,'#ff66aa',T,T,T,T,'#ff66aa','#ff77bb','#ff66aa'],
    [T,'#ffdd44',T,T,T,T,T,'#ff66aa','#ff77bb','#ff66aa',T,T,T,T,'#ff66aa',T],
    ['#ffdd44','#ffee55','#ffdd44',T,T,'#cc44cc',T,T,'#ff66aa',T,T,T,T,T,T,T],
    [T,'#ffdd44',T,T,'#cc44cc','#dd55dd','#cc44cc',T,T,T,T,T,T,T,T,T],
    [T,T,T,T,T,'#cc44cc',T,T,T,T,T,T,T,T,T,T],
  ],
};

// Tree variant 2 — darker foliage
const TREE_2: ObjectDef = (() => {
  const pixels = TREE_1.pixels.map(row => row.map(c => {
    if (c === G4) return G3;
    if (c === G3) return '#1a6a1a';
    if (c === '#1a5a1a') return '#0e4e0e';
    return c;
  }));
  return { width: 16, height: 24, pixels };
})();

// Tree variant 3 — lighter, more vibrant foliage
const TREE_3: ObjectDef = (() => {
  const pixels = TREE_1.pixels.map(row => row.map(c => {
    if (c === G4) return '#3a9a3a';
    if (c === G3) return G4;
    if (c === '#1a5a1a') return G2;
    if (c === G2) return '#1a5a1a';
    return c;
  }));
  return { width: 16, height: 24, pixels };
})();

// Mossy rock
const ROCK_MOSSY: ObjectDef = {
  width: 12, height: 8,
  pixels: [
    [T,T,T,G3,G4,G4,G4,G3,G3,T,T,T],
    [T,T,G3,S4,G3,G4,G3,S4,S4,G3,T,T],
    [T,S3,S4,S4,S3,G3,S3,S3,S4,S4,S3,T],
    [S2,S3,S3,S3,S2,S2,S2,S2,S3,S3,S3,S2],
    [S2,S2,S2,S2,S2,S1,S1,S2,S2,S2,S2,S2],
    [T,S2,S2,S1,S1,S1,S1,S1,S1,S2,S2,T],
    [T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T],
    [T,T,T,T,S1,S1,S1,S1,T,T,T,T],
  ],
};

// Fence post (single)
const FENCE_POST_OBJ: ObjectDef = {
  width: 4, height: 12,
  pixels: (() => {
    const w1 = '#6a4a2a', w2 = '#7a5a3a', w3 = '#5a3a1a';
    const p: PixelGrid = [];
    p.push([T, w2, w2, T]);
    for (let i = 0; i < 9; i++) p.push([T, w3, w1, T]);
    p.push([w3, w3, w1, w1]);
    p.push([T, T, T, T]);
    return p;
  })(),
};

// Tall grass — frame 1 (upright)
const TALL_GRASS_F1: ObjectDef = {
  width: 8, height: 12,
  pixels: [
    [T,T,T,T,T,T,T,T],
    [T,T,G4,T,T,T,G3,T],
    [T,G3,G4,T,T,G3,G4,T],
    [T,G3,T,T,T,G3,T,G4],
    [T,G2,T,G4,T,G2,T,G3],
    [T,G2,T,G3,T,G2,T,G3],
    [T,G2,T,G3,T,G1,T,G2],
    [T,G1,T,G2,T,G1,T,G2],
    [T,G1,T,G2,T,G1,T,G1],
    [T,G1,T,G1,T,G1,T,G1],
    [T,G1,T,G1,T,G1,T,G1],
    [T,T,T,T,T,T,T,T],
  ],
};

// Tall grass — frame 2 (leaning right)
const TALL_GRASS_F2: ObjectDef = {
  width: 8, height: 12,
  pixels: [
    [T,T,T,T,T,T,T,T],
    [T,T,T,G4,T,T,T,G3],
    [T,T,G3,G4,T,T,G3,G4],
    [T,G3,T,T,T,G3,T,G4],
    [T,G2,T,T,G4,G2,T,G3],
    [T,G2,T,G3,T,G2,T,G3],
    [T,G2,T,G3,T,G1,T,G2],
    [T,G1,T,G2,T,G1,T,G2],
    [T,G1,T,G2,T,G1,T,G1],
    [T,G1,T,G1,T,G1,T,G1],
    [T,G1,T,G1,T,G1,T,G1],
    [T,T,T,T,T,T,T,T],
  ],
};

// Horizontal bridge (32x16)
const BRIDGE_H_OBJ: ObjectDef = {
  width: 32, height: 16,
  pixels: (() => {
    const pl = ['#7a5a3a', '#6a4a2a', '#8a6a4a'];
    const rail = '#5a3a1a';
    const gap = '#4a2a0a';
    const p: PixelGrid = [];
    for (let r = 0; r < 16; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < 32; c++) {
        const isEndPost = c <= 1 || c >= 30;
        const isRail = r === 2 || r === 13;
        const isEdge = r <= 1 || r >= 14;
        if (isEndPost || isEdge || isRail) {
          row.push(rail);
        } else if (c % 4 === 3) {
          row.push(gap);
        } else {
          row.push(pl[Math.floor(c / 4) % 3]);
        }
      }
      p.push(row);
    }
    return p;
  })(),
};

// Vertical bridge (16x32)
const BRIDGE_V_OBJ: ObjectDef = {
  width: 16, height: 32,
  pixels: (() => {
    const pl = ['#7a5a3a', '#6a4a2a', '#8a6a4a'];
    const rail = '#5a3a1a';
    const gap = '#4a2a0a';
    const p: PixelGrid = [];
    for (let r = 0; r < 32; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < 16; c++) {
        const isEndPost = r <= 1 || r >= 30;
        const isRail = c === 2 || c === 13;
        const isEdge = c <= 1 || c >= 14;
        if (isEndPost || isEdge || isRail) {
          row.push(rail);
        } else if (r % 4 === 3) {
          row.push(gap);
        } else {
          row.push(pl[Math.floor(r / 4) % 3]);
        }
      }
      p.push(row);
    }
    return p;
  })(),
};

const OBJECT_MAP: Record<string, ObjectDef | ObjectDef[]> = {
  tree: TREE_1,
  tree2: TREE_2,
  tree3: TREE_3,
  pine: PINE,
  bush: BUSH,
  rock_small: ROCK_SMALL,
  rock_large: ROCK_LARGE,
  rock_mossy: ROCK_MOSSY,
  fence_h: FENCE_H,
  fence_post: FENCE_POST_OBJ,
  lamp_post: LAMP_POST,
  sign_post: SIGN_POST,
  flower_patch: FLOWER_PATCH,
  tall_grass: [TALL_GRASS_F1, TALL_GRASS_F2],
  bridge_h: BRIDGE_H_OBJ,
  bridge_v: BRIDGE_V_OBJ,
};

export function drawObject(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: ObjectType,
  variant: number,
  frame: number,
  scale: number,
): void {
  const entry = OBJECT_MAP[type];
  if (!entry) return;

  // Resolve animated objects (arrays) vs static
  const def = Array.isArray(entry) ? entry[frame % entry.length] : entry;

  // Lamp post glow effect
  if (type === 'lamp_post') {
    const glowIntensity = 0.2 + Math.sin(frame * 0.2) * 0.1;
    ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity})`;
    ctx.beginPath();
    ctx.arc(x + 3 * scale, y + 2 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const pixels = def.pixels;
  for (let r = 0; r < pixels.length; r++) {
    for (let c = 0; c < pixels[r].length; c++) {
      const color = pixels[r][c];
      if (color !== null) {
        ctx.fillStyle = color;
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

export function getObjectSize(type: ObjectType): { width: number; height: number } {
  const entry = OBJECT_MAP[type];
  if (!entry) return { width: 16, height: 16 };
  const def = Array.isArray(entry) ? entry[0] : entry;
  return { width: def.width, height: def.height };
}
