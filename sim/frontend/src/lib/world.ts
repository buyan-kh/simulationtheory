// World generation and town layout
// Creates a 200x200 tile grid (3200x3200 world px) with terrain, buildings, decorations
// Chunks are generated lazily — only visible tiles get rendered
// Designed so PixelCanvas can consume it as Sprite[]

import type { Sprite } from './sprites/renderer';
import type { Location } from './types';
import { drawTile, drawObject, getObjectSize, type TileType, type ObjectType } from './sprites/terrain';
import { drawBuilding, getBuildingSize, locationToBuildingType, type BuildingType } from './sprites/buildings';

// ==================== CONSTANTS ====================
const TILE_PX = 16;        // pixels per tile at scale=1
const WORLD_TILES = 200;   // tiles across (200x200 = 40,000 tiles)
const WORLD_PX = WORLD_TILES * TILE_PX; // 3200
const SCALE = 2;           // draw at 2x for chunky pixel look
const COORD_RANGE = 600;   // sim coords go from -300 to 300
const CHUNK_SIZE = 16;     // tiles per terrain chunk (16x16 = 256 tiles per chunk)

// ==================== SEEDED RNG ====================
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// Position-based seeded random (deterministic per tile, no full map needed)
function tileRng(col: number, row: number, seed: number = 42): number {
  let s = ((col * 73856093) ^ (row * 19349663) ^ (seed * 83492791)) & 0x7fffffff;
  s = ((s * 16807) + 0) % 2147483647;
  return s / 2147483647;
}

// ==================== COORDINATE MAPPING ====================
export function simToWorld(sx: number, sy: number): { wx: number; wy: number } {
  return {
    wx: ((sx + 300) / COORD_RANGE) * WORLD_PX,
    wy: ((sy + 300) / COORD_RANGE) * WORLD_PX,
  };
}

export function worldToSim(wx: number, wy: number): { sx: number; sy: number } {
  return {
    sx: (wx / WORLD_PX) * COORD_RANGE - 300,
    sy: (wy / WORLD_PX) * COORD_RANGE - 300,
  };
}

export const WORLD_SIZE = WORLD_PX * SCALE;

// ==================== LAZY TILE GENERATION ====================
// Instead of generating a full 200x200 array, we compute tile type on the fly
// using deterministic seeded random based on position

interface TileInfo {
  type: TileType;
  variant: number;
}

// Pre-computed sets for road tiles and river tiles
let roadTiles: Set<string> | null = null;
let riverTiles: Set<string> | null = null;
let sandTiles: Set<string> | null = null;
let dirtTiles: Set<string> | null = null;

function buildRoadSet(locations: Location[]): Set<string> {
  const roads = new Set<string>();
  const locPositions = locations.map(l => {
    const { wx, wy } = simToWorld(l.x, l.y);
    return { col: Math.floor(wx / TILE_PX), row: Math.floor(wy / TILE_PX) };
  });

  function addRoad(c1: number, r1: number, c2: number, r2: number) {
    const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    // Horizontal segment (3 tiles wide)
    for (let c = minC; c <= maxC; c++) {
      roads.add(`${r1 - 1},${c},sidewalk`);
      roads.add(`${r1},${c},road_line`);
      roads.add(`${r1 + 1},${c},sidewalk`);
    }
    // Vertical segment (3 tiles wide)
    for (let r = minR; r <= maxR; r++) {
      roads.add(`${r},${c2 - 1},sidewalk`);
      roads.add(`${r},${c2},road_line`);
      roads.add(`${r},${c2 + 1},sidewalk`);
    }
  }

  if (locPositions.length > 0) {
    const center = locPositions[0];
    for (let i = 1; i < locPositions.length; i++) {
      addRoad(center.col, center.row, locPositions[i].col, locPositions[i].row);
    }
    // Connect nearby locations
    for (let i = 1; i < locPositions.length; i++) {
      for (let j = i + 1; j < locPositions.length; j++) {
        const dist = Math.abs(locPositions[i].col - locPositions[j].col) + Math.abs(locPositions[i].row - locPositions[j].row);
        if (dist < 60) {
          addRoad(locPositions[i].col, locPositions[i].row, locPositions[j].col, locPositions[j].row);
        }
      }
    }
  }
  return roads;
}

function buildRiverSet(): { river: Set<string>; sand: Set<string> } {
  const river = new Set<string>();
  const sand = new Set<string>();
  // River runs diagonally across the map with meander
  const riverBaseCol = 140;
  for (let row = 0; row < WORLD_TILES; row++) {
    const wobble = Math.floor(Math.sin(row * 0.08) * 5 + Math.cos(row * 0.03) * 3);
    const col = riverBaseCol + wobble;
    for (let w = -2; w <= 2; w++) {
      const c = col + w;
      if (c >= 0 && c < WORLD_TILES) {
        river.add(`${row},${c}`);
      }
    }
    for (const w of [-3, 3]) {
      const c = col + w;
      if (c >= 0 && c < WORLD_TILES) {
        sand.add(`${row},${c}`);
      }
    }
  }
  return { river, sand };
}

// Farm crop fields (Stardew Valley style)
let cropTiles: Set<string> | null = null;

function buildCropSet(locations: Location[]): Set<string> {
  const crops = new Set<string>();
  for (const loc of locations) {
    if (loc.type !== 'farm') continue;
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    // Create crop field rows around farm
    for (let dr = 3; dr <= 10; dr++) {
      for (let dc = -8; dc <= 8; dc++) {
        // Alternating crop and plowed rows
        if (dr % 2 === 0) {
          crops.add(`${cr + dr},${cc + dc},crops`);
        } else {
          crops.add(`${cr + dr},${cc + dc},plowed`);
        }
      }
    }
    // Also some behind
    for (let dr = -6; dr <= -3; dr++) {
      for (let dc = -5; dc <= 5; dc++) {
        crops.add(`${cr + dr},${cc + dc},crops`);
      }
    }
  }
  return crops;
}

function buildDirtSet(locations: Location[]): Set<string> {
  const dirt = new Set<string>();
  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        dirt.add(`${cr + dr},${cc + dc}`);
      }
    }
  }
  return dirt;
}

function getTileAt(row: number, col: number): TileInfo {
  const key = `${row},${col}`;

  // Check road first (highest priority)
  if (roadTiles) {
    if (roadTiles.has(`${key},road_line`)) return { type: 'road_line', variant: 0 };
    if (roadTiles.has(`${key},sidewalk`)) return { type: 'sidewalk', variant: 0 };
  }

  // Check river
  if (riverTiles?.has(key)) {
    return { type: (row + col) % 2 === 0 ? 'water' : 'water2', variant: 0 };
  }
  if (sandTiles?.has(key)) {
    return { type: 'sand', variant: 0 };
  }

  // Check crop fields near farms
  if (cropTiles) {
    if (cropTiles.has(`${key},crops`)) return { type: 'crops', variant: 0 };
    if (cropTiles.has(`${key},plowed`)) return { type: 'plowed', variant: 0 };
  }

  // Check dirt near buildings
  if (dirtTiles?.has(key)) {
    return { type: 'dirt', variant: 0 };
  }

  // Edge forest
  const edgeDist = Math.min(row, col, WORLD_TILES - 1 - row, WORLD_TILES - 1 - col);
  if (edgeDist < 6) {
    return { type: 'grass_dark', variant: 0 };
  }

  // Regular terrain — deterministic per position
  const v = tileRng(col, row, 42);
  let type: TileType = 'grass';
  if (v < 0.08) type = 'grass2';
  else if (v < 0.16) type = 'grass3';
  else if (v < 0.18) type = 'flowers';
  return { type, variant: Math.floor(tileRng(col, row, 99) * 3) };
}

// ==================== DECORATION GENERATION ====================

interface Decoration {
  type: ObjectType;
  col: number;
  row: number;
}

function generateDecorations(rng: () => number, locations: Location[]): Decoration[] {
  const decorations: Decoration[] = [];

  // No-spawn zones near buildings
  const noSpawn = new Set<string>();
  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    for (let dr = -5; dr <= 5; dr++) {
      for (let dc = -5; dc <= 5; dc++) {
        noSpawn.add(`${cr + dr},${cc + dc}`);
      }
    }
  }

  // Dense forest around edges (bigger map = more trees)
  for (let i = 0; i < 400; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    const edgeDist = Math.min(row, col, WORLD_TILES - 1 - row, WORLD_TILES - 1 - col);
    if (edgeDist < 15 && !noSpawn.has(`${row},${col}`)) {
      const tile = getTileAt(row, col);
      if (!tile.type.startsWith('water') && tile.type !== 'sand' && !tile.type.startsWith('road') && tile.type !== 'sidewalk') {
        decorations.push({ type: rng() < 0.5 ? 'pine' : 'tree', col, row });
      }
    }
  }

  // Scattered trees throughout meadows
  for (let i = 0; i < 120; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = getTileAt(row, col);
      if (tile.type.startsWith('grass')) {
        decorations.push({ type: rng() < 0.3 ? 'pine' : 'tree', col, row });
      }
    }
  }

  // Bushes
  for (let i = 0; i < 80; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = getTileAt(row, col);
      if (tile.type.startsWith('grass')) {
        decorations.push({ type: 'bush', col, row });
      }
    }
  }

  // Rocks
  for (let i = 0; i < 40; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    const tile = getTileAt(row, col);
    if (tile.type === 'sand' || tile.type === 'dirt') {
      decorations.push({ type: rng() < 0.5 ? 'rock_small' : 'rock_large', col, row });
    }
  }

  // Lamp posts near buildings
  for (const loc of locations) {
    const { wx, wy } = simToWorld(loc.x, loc.y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    for (const [dr, dc] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
      const r = cr + dr;
      const c = cc + dc;
      if (r >= 0 && r < WORLD_TILES && c >= 0 && c < WORLD_TILES) {
        decorations.push({ type: 'lamp_post', col: c, row: r });
      }
    }
  }

  // Flower patches
  for (let i = 0; i < 40; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = getTileAt(row, col);
      if (tile.type.startsWith('grass')) {
        decorations.push({ type: 'flower_patch', col, row });
      }
    }
  }

  // Fences near some locations
  for (let i = 0; i < Math.min(locations.length, 5); i++) {
    const { wx, wy } = simToWorld(locations[i].x, locations[i].y);
    const cr = Math.floor(wy / TILE_PX);
    const cc = Math.floor(wx / TILE_PX);
    decorations.push({ type: 'fence_h', col: cc - 3, row: cr + 3 });
    decorations.push({ type: 'fence_h', col: cc + 1, row: cr + 3 });
  }

  // Cars parked along roads
  for (let i = 0; i < 20; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    const tile = getTileAt(row, col);
    if (tile.type === 'sidewalk' || tile.type === 'road_line') {
      decorations.push({ type: (rng() < 0.5 ? 'car_red' : 'car_blue') as ObjectType, col, row: row - 1 });
    }
  }

  // Benches near parks and cafes
  for (const loc of locations) {
    const t = loc.type?.toLowerCase() || '';
    if (t === 'park' || t === 'cafe') {
      const { wx, wy } = simToWorld(loc.x, loc.y);
      const cr = Math.floor(wy / TILE_PX);
      const cc = Math.floor(wx / TILE_PX);
      decorations.push({ type: 'bench', col: cc + 3, row: cr + 2 });
      decorations.push({ type: 'bench', col: cc - 3, row: cr + 2 });
    }
  }

  // Trash cans
  for (const loc of locations) {
    const t = loc.type?.toLowerCase() || '';
    if (t === 'fast_food' || t === 'trade') {
      const { wx, wy } = simToWorld(loc.x, loc.y);
      const cr = Math.floor(wy / TILE_PX);
      const cc = Math.floor(wx / TILE_PX);
      decorations.push({ type: 'trash_can', col: cc + 2, row: cr + 3 });
    }
  }

  // Tall grass
  for (let i = 0; i < 50; i++) {
    const row = Math.floor(rng() * WORLD_TILES);
    const col = Math.floor(rng() * WORLD_TILES);
    if (!noSpawn.has(`${row},${col}`)) {
      const tile = getTileAt(row, col);
      if (tile.type.startsWith('grass')) {
        decorations.push({ type: 'tall_grass', col, row });
      }
    }
  }

  return decorations;
}

// ==================== SPRITE BUILDERS ====================

function buildTerrainSprites(): Sprite[] {
  // Chunk-based terrain — each chunk is CHUNK_SIZE x CHUNK_SIZE tiles
  // Chunks render lazily when their draw() is called
  const chunks: Sprite[] = [];
  const numChunks = Math.ceil(WORLD_TILES / CHUNK_SIZE);

  for (let chunkRow = 0; chunkRow < numChunks; chunkRow++) {
    for (let chunkCol = 0; chunkCol < numChunks; chunkCol++) {
      const chunkX = chunkCol * CHUNK_SIZE * TILE_PX * SCALE;
      const chunkY = chunkRow * CHUNK_SIZE * TILE_PX * SCALE;
      const chunkW = CHUNK_SIZE * TILE_PX * SCALE;
      const chunkH = CHUNK_SIZE * TILE_PX * SCALE;
      const startRow = chunkRow * CHUNK_SIZE;
      const startCol = chunkCol * CHUNK_SIZE;

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
              const tile = getTileAt(tileRow, tileCol);
              const tx = tileCol * TILE_PX * SCALE;
              const ty = tileRow * TILE_PX * SCALE;
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
      id: `building:${loc.name}`,
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

// ==================== HOUSE SPRITES ====================

interface HousePlot {
  worldX: number;
  worldY: number;
  type: BuildingType;
}

function generateHousePlots(rng: () => number, locations: Location[], count: number): HousePlot[] {
  const plots: HousePlot[] = [];
  // Spread houses across multiple residential neighborhoods
  const neighborhoods = [
    { baseCol: 30, baseRow: 60, cols: 8 },   // South-west neighborhood
    { baseCol: 80, baseRow: 110, cols: 8 },   // South neighborhood
    { baseCol: 50, baseRow: 140, cols: 6 },   // Far south
    { baseCol: 120, baseRow: 70, cols: 6 },   // East neighborhood
    { baseCol: 30, baseRow: 30, cols: 6 },    // North-west
  ];

  let placed = 0;
  for (const hood of neighborhoods) {
    const maxInHood = Math.ceil(count / neighborhoods.length) + 2;
    for (let i = 0; i < maxInHood && placed < count; i++) {
      const gridRow = Math.floor(i / hood.cols);
      const gridCol = i % hood.cols;
      const baseCol = hood.baseCol + gridCol * 5 + Math.floor(rng() * 3) - 1;
      const baseRow = hood.baseRow + gridRow * 5 + Math.floor(rng() * 3) - 1;

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
      placed++;
    }
  }

  return plots;
}

function buildHouseSprites(plots: HousePlot[]): Sprite[] {
  return plots.map((plot) => {
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

  // Initialize lookup sets (computed once)
  roadTiles = buildRoadSet(locations);
  const riverData = buildRiverSet();
  riverTiles = riverData.river;
  sandTiles = riverData.sand;
  cropTiles = buildCropSet(locations);
  dirtTiles = buildDirtSet(locations);

  const decorations = generateDecorations(seededRandom(123), locations);
  const housePlots = generateHousePlots(seededRandom(777), locations, Math.max(8, Math.ceil(characterCount * 1.2)));

  // Add dirt around houses to dirtTiles set
  for (const plot of housePlots) {
    const col = Math.floor(plot.worldX / (TILE_PX * SCALE));
    const row = Math.floor(plot.worldY / (TILE_PX * SCALE));
    for (let dr = -1; dr <= 2; dr++) {
      for (let dc = -1; dc <= 2; dc++) {
        dirtTiles.add(`${row + dr},${col + dc}`);
      }
    }
  }

  cachedWorld = {
    terrainSprites: buildTerrainSprites(),
    decorationSprites: buildDecorationSprites(decorations),
    locationSprites: buildLocationSprites(locations),
    houseSprites: buildHouseSprites(housePlots),
    housePlots,
  };
  cachedLocationKey = locKey;

  return cachedWorld;
}

export { SCALE, TILE_PX };
