// World generation and town layout
// Creates an 80x80 tile grid (1280x1280 world px) with terrain, buildings, decorations
// Designed so PixelCanvas can consume it as Sprite[]

import type { Sprite } from './sprites/renderer';
import type { Location } from './types';
import { drawTile, drawObject, getObjectSize, type TileType, type ObjectType } from './sprites/terrain';
import { drawBuilding, getBuildingSize, locationToBuildingType, type BuildingType } from './sprites/buildings';

// ==================== CONSTANTS ====================
const TILE_PX = 16;        // pixels per tile at scale=1
const WORLD_TILES = 80;    // tiles across
const WORLD_PX = WORLD_TILES * TILE_PX; // 1280
const SCALE = 2;           // draw at 2x for chunky pixel look
const COORD_RANGE = 240;   // sim coords go from -120 to 120

// ==================== SEEDED RNG ====================
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ==================== COORDINATE MAPPING ====================
export function simToWorld(sx: number, sy: number): { wx: number; wy: number } {
  return {
    wx: ((sx + 120) / COORD_RANGE) * WORLD_PX,
    wy: ((sy + 120) / COORD_RANGE) * WORLD_PX,
  };
}

export function worldToSim(wx: number, wy: number): { sx: number; sy: number } {
  return {
    sx: (wx / WORLD_PX) * COORD_RANGE - 120,
    sy: (wy / WORLD_PX) * COORD_RANGE - 120,
  };
}

export const WORLD_SIZE = WORLD_PX * SCALE;

// ==================== TILE MAP GENERATION ====================

interface TileInfo {
  type: TileType;
  variant: number;
}

function generateTileMap(rng: () => number, locations: Location[]): TileInfo[][] {
  const map: TileInfo[][] = [];

  // Initialize all grass
  for (let row = 0; row < WORLD_TILES; row++) {
    map[row] = [];
    for (let col = 0; col < WORLD_TILES; col++) {
      const v = rng();
      let type: TileType = 'grass';
      if (v < 0.1) type = 'grass2';
      else if (v < 0.2) type = 'grass3';
      else if (v < 0.22) type = 'flowers';
      map[row][col] = { type, variant: Math.floor(rng() * 3) };
    }
  }

  // Add a river running roughly from top-left to bottom-right
  const riverBaseCol = 55;
  for (let row = 0; row < WORLD_TILES; row++) {
    const wobble = Math.floor(Math.sin(row * 0.15) * 3);
    const col = riverBaseCol + wobble;
    for (let w = -1; w <= 1; w++) {
      const c = col + w;
      if (c >= 0 && c < WORLD_TILES) {
        map[row][c] = { type: (row + c) % 2 === 0 ? 'water' : 'water2', variant: 0 };
      }
    }
    // Sand banks
    for (const w of [-2, 2]) {
      const c = col + w;
      if (c >= 0 && c < WORLD_TILES) {
        map[row][c] = { type: 'sand', variant: 0 };
      }
    }
  }

  // Roads between locations (cobblestone paths)
  const locPositions = locations.map(l => {
    const { wx, wy } = simToWorld(l.x, l.y);
    return { col: Math.floor(wx / TILE_PX), row: Math.floor(wy / TILE_PX) };
  });

  // Connect each location to the nearest town center (Market Square = first location)
  if (locPositions.length > 0) {
    const center = locPositions[0];
    for (let i = 1; i < locPositions.length; i++) {
      const target = locPositions[i];
      drawRoad(map, center.col, center.row, target.col, target.row);
    }
    // Also connect neighbors
    for (let i = 1; i < locPositions.length; i++) {
      for (let j = i + 1; j < locPositions.length; j++) {
        const dist = Math.abs(locPositions[i].col - locPositions[j].col) + Math.abs(locPositions[i].row - locPositions[j].row);
        if (dist < 30) {
          drawRoad(map, locPositions[i].col, locPositions[i].row, locPositions[j].col, locPositions[j].row);
        }
      }
    }
  }

  // Dark grass patches around edges (forest boundary)
  for (let row = 0; row < WORLD_TILES; row++) {
    for (let col = 0; col < WORLD_TILES; col++) {
      const edgeDist = Math.min(row, col, WORLD_TILES - 1 - row, WORLD_TILES - 1 - col);
      if (edgeDist < 4 && map[row][col].type.startsWith('grass')) {
        map[row][col] = { type: 'grass_dark', variant: 0 };
      }
    }
  }

  // Dirt patches near buildings
  for (const pos of locPositions) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r >= 0 && r < WORLD_TILES && c >= 0 && c < WORLD_TILES) {
          if (map[r][c].type.startsWith('grass')) {
            map[r][c] = { type: 'dirt', variant: 0 };
          }
        }
      }
    }
  }

  return map;
}

function drawRoad(map: TileInfo[][], c1: number, r1: number, c2: number, r2: number) {
  // Simple L-shaped road: horizontal then vertical
  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);

  // Horizontal segment at r1
  for (let c = minC; c <= maxC; c++) {
    if (r1 >= 0 && r1 < WORLD_TILES && c >= 0 && c < WORLD_TILES) {
      if (map[r1][c].type !== 'water' && map[r1][c].type !== 'water2') {
        map[r1][c] = { type: 'cobblestone', variant: 0 };
      }
    }
  }
  // Vertical segment at c2
  for (let r = minR; r <= maxR; r++) {
    if (r >= 0 && r < WORLD_TILES && c2 >= 0 && c2 < WORLD_TILES) {
      if (map[r][c2].type !== 'water' && map[r][c2].type !== 'water2') {
        map[r][c2] = { type: 'cobblestone', variant: 0 };
      }
    }
  }
}

// ==================== DECORATION GENERATION ====================

interface Decoration {
  type: ObjectType;
  col: number;
  row: number;
}

function generateDecorations(rng: () => number, tileMap: TileInfo[][], locations: Location[]): Decoration[] {
  const decorations: Decoration[] = [];

  // Mark tiles near locations as "no-spawn" zone
  const noSpawn = new Set<string>();
  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        noSpawn.add(`${cr + dr},${cc + dc}`);
      }
    }
  }

  // Forest around edges
  for (let i = 0; i < 120; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    const edgeDist = Math.min(row, col, WORLD_TILES - 1 - row, WORLD_TILES - 1 - col);
    if (edgeDist < 8 && !noSpawn.has(`${row},${col}`)) {
      const tile = tileMap[row]?.[col];
      if (tile && !tile.type.startsWith('water') && tile.type !== 'cobblestone' && tile.type !== 'sand') {
        decorations.push({ type: rng() < 0.5 ? 'pine' : 'tree', col, row });
      }
    }
  }

  // Scattered trees in meadow
  for (let i = 0; i < 30; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = tileMap[row]?.[col];
      if (tile && tile.type.startsWith('grass')) {
        decorations.push({ type: rng() < 0.3 ? 'pine' : 'tree', col, row });
      }
    }
  }

  // Bushes
  for (let i = 0; i < 25; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = tileMap[row]?.[col];
      if (tile && tile.type.startsWith('grass')) {
        decorations.push({ type: 'bush', col, row });
      }
    }
  }

  // Rocks near river
  for (let i = 0; i < 15; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    const tile = tileMap[row]?.[col];
    if (tile && (tile.type === 'sand' || tile.type === 'dirt')) {
      decorations.push({ type: rng() < 0.5 ? 'rock_small' : 'rock_large', col, row });
    }
  }

  // Lamp posts along roads near buildings
  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    // Place lamps at road edges near buildings
    for (const [dr, dc] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
      const r = cr + dr;
      const c = cc + dc;
      if (r >= 0 && r < WORLD_TILES && c >= 0 && c < WORLD_TILES) {
        const tile = tileMap[r]?.[c];
        if (tile && (tile.type === 'cobblestone' || tile.type === 'dirt')) {
          decorations.push({ type: 'lamp_post', col: c, row: r });
        }
      }
    }
  }

  // Flower patches in meadows
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = tileMap[row]?.[col];
      if (tile && tile.type.startsWith('grass')) {
        decorations.push({ type: 'flower_patch', col, row });
      }
    }
  }

  // Fences near some locations
  for (let i = 0; i < locations.length && i < 3; i++) {
    const { wx, wy } = simToWorld(locations[i].x, locations[i].y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    decorations.push({ type: 'fence_h', col: cc - 3, row: cr + 3 });
    decorations.push({ type: 'fence_h', col: cc + 1, row: cr + 3 });
  }

  return decorations;
}

// ==================== SPRITE BUILDERS ====================

function buildTerrainSprites(tileMap: TileInfo[][]): Sprite[] {
  // Instead of one sprite per tile (6400 sprites!), batch rows into chunks
  const CHUNK_SIZE = 10; // tiles per chunk
  const chunks: Sprite[] = [];

  for (let chunkRow = 0; chunkRow < WORLD_TILES; chunkRow += CHUNK_SIZE) {
    for (let chunkCol = 0; chunkCol < WORLD_TILES; chunkCol += CHUNK_SIZE) {
      const chunkX = chunkCol * TILE_PX * SCALE;
      const chunkY = chunkRow * TILE_PX * SCALE;
      const chunkW = CHUNK_SIZE * TILE_PX * SCALE;
      const chunkH = CHUNK_SIZE * TILE_PX * SCALE;

      const startRow = chunkRow;
      const startCol = chunkCol;

      chunks.push({
        x: chunkX,
        y: chunkY,
        width: chunkW,
        height: chunkH,
        layer: 0,
        draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
          for (let r = 0; r < CHUNK_SIZE; r++) {
            for (let c = 0; c < CHUNK_SIZE; c++) {
              const tileRow = startRow + r;
              const tileCol = startCol + c;
              if (tileRow >= WORLD_TILES || tileCol >= WORLD_TILES) continue;
              const tile = tileMap[tileRow][tileCol];
              const tx = (tileCol) * TILE_PX * SCALE;
              const ty = (tileRow) * TILE_PX * SCALE;
              drawTile(ctx, tx, ty, tile.type, tile.variant, frame, SCALE);
            }
          }
        },
      });
    }
  }

  return chunks;
}

function buildDecorationSprites(decorations: Decoration[]): Sprite[] {
  return decorations.map(dec => {
    const size = getObjectSize(dec.type);
    const wx = dec.col * TILE_PX * SCALE;
    const wy = dec.row * TILE_PX * SCALE;

    return {
      x: wx,
      y: wy,
      width: size.width * SCALE,
      height: size.height * SCALE,
      layer: 1,
      draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
        drawObject(ctx, wx, wy, dec.type, 0, frame, SCALE);
      },
    };
  });
}

function buildLocationSprites(locations: Location[]): Sprite[] {
  const sprites: Sprite[] = [];

  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const bType = locationToBuildingType(loc.type, loc.name);
    const bSize = getBuildingSize(bType);

    // Center the building on the location
    const bx = wx * SCALE - (bSize.width * SCALE) / 2;
    const by = wy * SCALE - (bSize.height * SCALE) / 2;

    sprites.push({
      x: bx,
      y: by,
      width: bSize.width * SCALE,
      height: bSize.height * SCALE,
      layer: 1,
      draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
        drawBuilding(ctx, bx, by, bType, SCALE, frame);
      },
    });

    // Building label
    sprites.push({
      x: bx,
      y: by + bSize.height * SCALE,
      width: bSize.width * SCALE,
      height: 16,
      layer: 3,
      draw: (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const labelW = loc.name.length * 5 + 8;
        const labelX = bx + (bSize.width * SCALE) / 2 - labelW / 2;
        const labelY = by + bSize.height * SCALE + 2;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, 12, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(loc.name, bx + (bSize.width * SCALE) / 2, labelY + 9);
        ctx.textAlign = 'start';
      },
    });
  }

  return sprites;
}

// ==================== HOUSE SPRITES FOR CHARACTERS ====================

interface HousePlot {
  worldX: number;
  worldY: number;
  type: BuildingType;
}

function generateHousePlots(rng: () => number, locations: Location[], count: number): HousePlot[] {
  const plots: HousePlot[] = [];
  // Scatter houses in a residential area (between locations)
  // Use bottom-left quadrant and right of center as residential

  for (let i = 0; i < count; i++) {
    // Place houses in a grid-like pattern with some randomness
    const gridRow = Math.floor(i / 6);
    const gridCol = i % 6;
    // Residential area: tiles 15-45 x 45-70
    const baseCol = 15 + gridCol * 5 + Math.floor(rng() * 3) - 1;
    const baseRow = 50 + gridRow * 5 + Math.floor(rng() * 3) - 1;

    const col = Math.max(5, Math.min(WORLD_TILES - 10, baseCol));
    const row = Math.max(5, Math.min(WORLD_TILES - 10, baseRow));

    const sizeRoll = rng();
    let type: BuildingType = 'house_small';
    if (sizeRoll > 0.7) type = 'house_large';
    else if (sizeRoll > 0.4) type = 'house_medium';

    plots.push({
      worldX: col * TILE_PX * SCALE,
      worldY: row * TILE_PX * SCALE,
      type,
    });
  }

  return plots;
}

function buildHouseSprites(plots: HousePlot[]): Sprite[] {
  return plots.map((plot, i) => {
    const bSize = getBuildingSize(plot.type);
    return {
      x: plot.worldX,
      y: plot.worldY,
      width: bSize.width * SCALE,
      height: bSize.height * SCALE,
      layer: 1,
      draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
        drawBuilding(ctx, plot.worldX, plot.worldY, plot.type, SCALE, frame);
      },
    };
  });
}

// ==================== PUBLIC API ====================

export interface WorldData {
  terrainSprites: Sprite[];
  decorationSprites: Sprite[];
  locationSprites: Sprite[];
  houseSprites: Sprite[];
  housePlots: HousePlot[];
}

let cachedWorld: WorldData | null = null;
let cachedLocationKey = '';

export function generateWorld(locations: Location[], characterCount: number): WorldData {
  // Only regenerate if locations change
  const locKey = locations.map(l => `${l.name}:${l.x}:${l.y}`).join('|');
  if (cachedWorld && cachedLocationKey === locKey) {
    return cachedWorld;
  }

  const rng = seededRandom(42);
  const tileMap = generateTileMap(rng, locations);
  const decorations = generateDecorations(seededRandom(123), tileMap, locations);
  const housePlots = generateHousePlots(seededRandom(777), locations, Math.max(6, Math.ceil(characterCount * 1.2)));

  // Add dirt around houses
  for (const plot of housePlots) {
    const col = Math.floor(plot.worldX / (TILE_PX * SCALE));
    const row = Math.floor(plot.worldY / (TILE_PX * SCALE));
    for (let dr = -1; dr <= 2; dr++) {
      for (let dc = -1; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < WORLD_TILES && c >= 0 && c < WORLD_TILES) {
          if (tileMap[r][c].type.startsWith('grass')) {
            tileMap[r][c] = { type: 'dirt', variant: 0 };
          }
        }
      }
    }
  }

  cachedWorld = {
    terrainSprites: buildTerrainSprites(tileMap),
    decorationSprites: buildDecorationSprites(decorations),
    locationSprites: buildLocationSprites(locations),
    houseSprites: buildHouseSprites(housePlots),
    housePlots,
  };
  cachedLocationKey = locKey;

  return cachedWorld;
}

export { SCALE, TILE_PX };
