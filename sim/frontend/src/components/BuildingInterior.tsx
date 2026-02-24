'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character, Location } from '@/lib/types';
import { locationToBuildingType, type BuildingType } from '@/lib/sprites/buildings';

interface BuildingInteriorProps {
  buildingName: string;
  locations: Location[];
  characters: Record<string, Character>;
  onClose: () => void;
}

// Interior dimensions (pixels before scale)
const INTERIOR_W = 160;
const INTERIOR_H = 100;
const DRAW_SCALE = 2;

// Color palette
const FLOOR_WOOD = '#8B6914';
const FLOOR_DARK = '#6B4A0E';
const FLOOR_STONE = '#6a6a7a';
const FLOOR_SD = '#5a5a6a';
const WALL_TAN = '#c4a46a';
const WALL_DARK = '#a4845a';
const WALL_STONE = '#7a7a8a';
const WALL_SD = '#5a5a6a';
const WOOD = '#8B6914';
const WOOD_DK = '#6B4A0E';
const SHELF = '#9A7820';
const GLASS = '#3a5a8a';
const GLASS_LT = '#4a6a9a';
const GOLD = '#ffd700';
const FIRE_1 = '#ff6622';
const FIRE_2 = '#ffaa22';
const FIRE_3 = '#ffdd44';
const WATER = '#4a8acc';
const WATER_LT = '#6aaaee';

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function drawWoodFloor(ctx: CanvasRenderingContext2D, w: number, h: number, startY: number) {
  for (let y = startY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const plank = (x + (y % 2 === 0 ? 3 : 0)) % 8;
      ctx.fillStyle = plank === 0 ? FLOOR_DARK : FLOOR_WOOD;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawStoneFloor(ctx: CanvasRenderingContext2D, w: number, h: number, startY: number) {
  for (let y = startY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = ((x + (y & 1) * 2) % 4);
      ctx.fillStyle = b === 0 ? FLOOR_SD : FLOOR_STONE;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawWallBg(ctx: CanvasRenderingContext2D, w: number, endY: number, color: string, darkColor: string) {
  for (let y = 0; y < endY; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 7 === 0 ? darkColor : color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawStoneWall(ctx: CanvasRenderingContext2D, w: number, endY: number) {
  for (let y = 0; y < endY; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y & 1) ? 2 : 0;
      const b = (x + off) % 4;
      ctx.fillStyle = b === 0 ? WALL_SD : b === 1 ? WALL_STONE : '#6a6a7a';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, WOOD_DK);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, GLASS);
  ctx.fillStyle = GLASS_LT;
  ctx.fillRect(x + 1, y + 1, 1, 1);
  // Cross bars
  rect(ctx, x + Math.floor(w / 2), y + 1, 1, h - 2, WOOD_DK);
  rect(ctx, x + 1, y + Math.floor(h / 2), w - 2, 1, WOOD_DK);
}

// ---- Interior drawers per building type ----

const drawShopInterior: DrawFn = (ctx, w, h) => {
  drawWallBg(ctx, w, 40, WALL_TAN, WALL_DARK);
  drawWoodFloor(ctx, w, h, 40);

  // Back shelves
  for (let sy = 5; sy <= 30; sy += 10) {
    rect(ctx, 10, sy, 60, 2, SHELF);
    // Goods on shelves
    const goods = ['#cc8844', '#88aa44', '#ddaa44', '#cc6644', '#4488cc', '#dd6644'];
    for (let i = 0; i < 8; i++) {
      rect(ctx, 12 + i * 7, sy - 5, 3, 5, goods[i % goods.length]);
    }
  }

  // Counter
  rect(ctx, 80, 50, 60, 4, WOOD_DK);
  rect(ctx, 80, 54, 60, 20, WOOD);
  rect(ctx, 80, 54, 60, 1, WOOD_DK);
  // Cash register
  rect(ctx, 120, 46, 8, 4, '#666666');
  rect(ctx, 121, 44, 6, 2, '#888888');
  rect(ctx, 123, 43, 2, 1, GOLD);

  // Display barrels
  rect(ctx, 10, 60, 12, 14, '#7a5a30');
  rect(ctx, 10, 65, 12, 1, '#5a4020');
  rect(ctx, 25, 64, 10, 10, '#7a5a30');
  rect(ctx, 25, 68, 10, 1, '#5a4020');

  // Window
  drawWindow(ctx, 90, 8, 14, 18);

  // Awning top border
  for (let x = 0; x < w; x++) {
    ctx.fillStyle = ((x >> 2) & 1) ? '#cc6622' : '#eedd88';
    ctx.fillRect(x, 0, 1, 3);
  }
};

const drawArenaInterior: DrawFn = (ctx, w, h) => {
  drawStoneWall(ctx, w, 35);
  drawStoneFloor(ctx, w, h, 35);

  // Fighting ring - raised platform
  rect(ctx, 40, 50, 80, 40, '#7a6a5a');
  rect(ctx, 42, 52, 76, 36, '#8a7a6a');
  // Ring ropes
  rect(ctx, 40, 50, 80, 2, '#8a7a5a');
  rect(ctx, 40, 88, 80, 2, '#8a7a5a');
  rect(ctx, 40, 50, 2, 40, '#8a7a5a');
  rect(ctx, 118, 50, 2, 40, '#8a7a5a');
  // Corner posts
  for (const [px, py] of [[40, 48], [118, 48], [40, 88], [118, 88]]) {
    rect(ctx, px, py, 3, 3, WOOD_DK);
  }

  // Spectator seats left
  for (let row = 0; row < 3; row++) {
    rect(ctx, 4, 50 + row * 14, 30, 10, '#5a4a3a');
    rect(ctx, 4, 50 + row * 14, 30, 2, '#6a5a4a');
  }

  // Weapon rack right
  rect(ctx, 130, 40, 20, 50, WOOD);
  rect(ctx, 130, 40, 20, 2, WOOD_DK);
  // Weapons
  rect(ctx, 133, 45, 2, 20, '#aaaaaa'); // sword
  rect(ctx, 139, 44, 2, 22, '#999999'); // spear
  rect(ctx, 145, 46, 2, 18, '#aaaaaa'); // sword 2

  // Banners on wall
  for (const bx of [20, 130]) {
    for (let r = 0; r < 20; r++) {
      const bw = r < 3 ? 4 : r < 14 ? 6 : 6 - (r - 14);
      if (bw <= 0) continue;
      rect(ctx, bx + 3 - Math.floor(bw / 2), 5 + r, bw, 1, r % 2 === 0 ? '#cc3333' : '#aa2222');
    }
  }

  // Torch sconces
  for (const tx of [8, 68, 88, 148]) {
    rect(ctx, tx, 28, 3, 4, WOOD_DK);
    rect(ctx, tx, 25, 3, 3, FIRE_1);
    rect(ctx, tx + 1, 24, 1, 1, FIRE_3);
  }
};

const drawCouncilInterior: DrawFn = (ctx, w, h) => {
  drawStoneWall(ctx, w, 40);
  drawStoneFloor(ctx, w, h, 40);

  // Long table
  rect(ctx, 25, 55, 110, 6, WOOD_DK);
  rect(ctx, 25, 61, 110, 14, WOOD);
  rect(ctx, 25, 61, 110, 1, WOOD_DK);
  // Table legs
  for (const lx of [28, 65, 100, 130]) {
    rect(ctx, lx, 75, 3, 12, WOOD_DK);
  }

  // Chairs
  for (let i = 0; i < 6; i++) {
    const cx = 30 + i * 18;
    // Chair back
    rect(ctx, cx, 48, 8, 10, WOOD_DK);
    rect(ctx, cx + 1, 49, 6, 8, WOOD);
    // Chair seat
    rect(ctx, cx, 58, 8, 3, '#5a3a1a');
  }

  // Map on wall
  rect(ctx, 50, 8, 60, 26, '#d4c4a4');
  rect(ctx, 50, 8, 60, 1, WOOD_DK);
  rect(ctx, 50, 33, 60, 1, WOOD_DK);
  rect(ctx, 50, 8, 1, 26, WOOD_DK);
  rect(ctx, 109, 8, 1, 26, WOOD_DK);
  // Map details
  rect(ctx, 60, 15, 20, 12, '#8ab48a');
  rect(ctx, 85, 18, 15, 8, '#8ab48a');
  rect(ctx, 70, 20, 8, 3, WATER);
  rect(ctx, 55, 25, 3, 3, '#cc4444');

  // Candles on table
  for (const cx of [40, 80, 120]) {
    rect(ctx, cx, 52, 2, 3, '#eeeedd');
    rect(ctx, cx, 51, 2, 1, FIRE_2);
    ctx.fillStyle = FIRE_3;
    ctx.fillRect(cx, 50, 2, 1);
  }

  // Pillars
  for (const px of [8, 148]) {
    rect(ctx, px, 5, 4, 85, '#a0a0aa');
    rect(ctx, px, 5, 4, 2, '#d8d8dd');
    rect(ctx, px - 1, 3, 6, 2, GOLD);
  }

  // Golden emblem on wall
  for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [-2, 0], [0, 0], [2, 0], [-1, 1], [1, 1], [0, 2]]) {
    rect(ctx, 80 + dx, 5 + dy, 1, 1, GOLD);
  }
};

const drawLibraryInterior: DrawFn = (ctx, w, h) => {
  drawWallBg(ctx, w, 35, WALL_TAN, WALL_DARK);
  drawWoodFloor(ctx, w, h, 35);

  const bookColors = ['#cc4444', '#4488cc', '#44aa44', '#ccaa44', '#884488', '#cc8844', '#448888'];

  // Tall bookshelves
  for (const sx of [5, 30, 120, 145]) {
    rect(ctx, sx, 5, 18, 80, WOOD);
    rect(ctx, sx, 5, 18, 1, WOOD_DK);
    rect(ctx, sx, 5, 1, 80, WOOD_DK);
    rect(ctx, sx + 17, 5, 1, 80, WOOD_DK);

    // Shelves with books
    for (let sy = 10; sy <= 70; sy += 12) {
      rect(ctx, sx + 1, sy + 8, 16, 1, WOOD_DK);
      for (let bx = 0; bx < 7; bx++) {
        const bh = 4 + (bx % 3);
        rect(ctx, sx + 2 + bx * 2, sy + 8 - bh, 2, bh, bookColors[(bx + sy) % bookColors.length]);
      }
    }
  }

  // Reading desks
  for (const dx of [55, 85]) {
    rect(ctx, dx, 55, 22, 3, WOOD_DK);
    rect(ctx, dx, 58, 22, 10, WOOD);
    rect(ctx, dx + 2, 68, 3, 14, WOOD_DK);
    rect(ctx, dx + 17, 68, 3, 14, WOOD_DK);
    // Open book on desk
    rect(ctx, dx + 6, 52, 10, 3, '#eeddcc');
    rect(ctx, dx + 11, 52, 1, 3, WOOD_DK);
  }

  // Candles on desks
  for (const cx of [58, 100]) {
    rect(ctx, cx, 51, 2, 3, '#eeeedd');
    rect(ctx, cx, 50, 2, 1, FIRE_2);
    ctx.fillStyle = FIRE_3;
    ctx.fillRect(cx, 49, 2, 1);
  }

  // Globe in corner
  rect(ctx, 75, 36, 8, 8, '#4488aa');
  rect(ctx, 76, 35, 6, 1, '#4488aa');
  rect(ctx, 76, 44, 6, 1, '#4488aa');
  rect(ctx, 78, 44, 2, 6, WOOD_DK);
  rect(ctx, 76, 50, 6, 2, WOOD);
};

const drawTavernInterior: DrawFn = (ctx, w, h) => {
  drawWallBg(ctx, w, 38, '#7a5a3a', '#6a4a2a');
  drawWoodFloor(ctx, w, h, 38);

  // Bar counter
  rect(ctx, 90, 42, 60, 5, WOOD_DK);
  rect(ctx, 90, 47, 60, 20, WOOD);
  rect(ctx, 90, 47, 60, 1, WOOD_DK);
  // Bar shelves behind
  rect(ctx, 92, 10, 56, 28, WOOD);
  rect(ctx, 92, 10, 56, 1, WOOD_DK);
  rect(ctx, 92, 10, 1, 28, WOOD_DK);
  rect(ctx, 147, 10, 1, 28, WOOD_DK);
  for (let sy = 15; sy <= 32; sy += 8) {
    rect(ctx, 93, sy, 54, 1, WOOD_DK);
    // Bottles
    for (let i = 0; i < 10; i++) {
      const bc = ['#cc4444', '#44aa44', '#ccaa44', '#884488', '#4488cc'][i % 5];
      rect(ctx, 95 + i * 5, sy - 5, 2, 5, bc);
      rect(ctx, 95 + i * 5, sy - 6, 2, 1, bc);
    }
  }

  // Mugs on bar
  for (const mx of [95, 110, 125, 140]) {
    rect(ctx, mx, 39, 4, 3, '#888888');
    rect(ctx, mx + 3, 40, 2, 2, '#888888');
    rect(ctx, mx + 1, 39, 2, 1, '#ccaa44');
  }

  // Tables
  for (const [tx, ty] of [[15, 55], [50, 55], [15, 78]]) {
    rect(ctx, tx, ty, 20, 3, WOOD_DK);
    rect(ctx, tx, ty + 3, 20, 10, WOOD);
    rect(ctx, tx + 3, ty + 13, 3, 8, WOOD_DK);
    rect(ctx, tx + 14, ty + 13, 3, 8, WOOD_DK);
  }

  // Fireplace
  rect(ctx, 2, 10, 28, 28, WALL_SD);
  rect(ctx, 4, 12, 24, 24, '#2a1a0a');
  // Fire
  rect(ctx, 8, 28, 16, 8, FIRE_1);
  rect(ctx, 10, 26, 12, 4, FIRE_2);
  rect(ctx, 12, 24, 8, 3, FIRE_3);
  // Mantle
  rect(ctx, 0, 8, 32, 3, WALL_STONE);
  // Logs
  rect(ctx, 6, 33, 20, 3, WOOD_DK);

  // Hanging lamp
  rect(ctx, 48, 0, 1, 12, '#444444');
  rect(ctx, 44, 12, 9, 3, '#666666');
  rect(ctx, 46, 15, 5, 2, FIRE_2);
};

const drawHouseInterior: DrawFn = (ctx, w, h) => {
  drawWallBg(ctx, w, 38, WALL_TAN, WALL_DARK);
  drawWoodFloor(ctx, w, h, 38);

  // Bed
  rect(ctx, 10, 45, 35, 25, '#4a3a6a');
  rect(ctx, 10, 45, 35, 4, '#5a4a7a');
  rect(ctx, 10, 45, 3, 25, WOOD_DK);
  rect(ctx, 42, 45, 3, 25, WOOD_DK);
  // Pillow
  rect(ctx, 14, 47, 12, 6, '#dddddd');
  rect(ctx, 14, 47, 12, 1, '#eeeeee');
  // Blanket fold
  rect(ctx, 14, 55, 28, 2, '#3a2a5a');

  // Table and chair
  rect(ctx, 70, 55, 30, 3, WOOD_DK);
  rect(ctx, 70, 58, 30, 14, WOOD);
  rect(ctx, 73, 72, 3, 10, WOOD_DK);
  rect(ctx, 94, 72, 3, 10, WOOD_DK);
  // Chair
  rect(ctx, 108, 52, 12, 16, WOOD);
  rect(ctx, 108, 52, 12, 2, WOOD_DK);
  rect(ctx, 110, 68, 3, 10, WOOD_DK);
  rect(ctx, 117, 68, 3, 10, WOOD_DK);

  // Window
  drawWindow(ctx, 55, 10, 18, 20);
  // Curtains
  rect(ctx, 52, 8, 3, 24, '#8a4a5a');
  rect(ctx, 73, 8, 3, 24, '#8a4a5a');
  rect(ctx, 52, 8, 24, 2, '#8a4a5a');

  // Small rug
  for (let y = 78; y < 90; y++) {
    for (let x = 55; x < 85; x++) {
      ctx.fillStyle = ((x + y) % 4 < 2) ? '#8a4a3a' : '#aa6a4a';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Candle on table
  rect(ctx, 82, 52, 2, 3, '#eeeedd');
  rect(ctx, 82, 51, 2, 1, FIRE_2);

  // Dresser
  rect(ctx, 130, 42, 20, 30, WOOD);
  rect(ctx, 130, 42, 20, 2, WOOD_DK);
  rect(ctx, 130, 55, 20, 1, WOOD_DK);
  rect(ctx, 130, 42, 1, 30, WOOD_DK);
  rect(ctx, 149, 42, 1, 30, WOOD_DK);
  // Drawer handles
  rect(ctx, 139, 48, 2, 1, GOLD);
  rect(ctx, 139, 60, 2, 1, GOLD);
};

const drawWellInterior: DrawFn = (ctx, w, h) => {
  // Outdoor close-up view
  // Sky
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = y < 15 ? '#2a3a5a' : '#3a4a6a';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Ground
  for (let y = 30; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = (x + (y & 1) * 2) % 4;
      ctx.fillStyle = b === 0 ? '#5a5a3a' : '#6a6a4a';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Well structure (large, centered)
  const cx = 60;
  // Stone rim
  rect(ctx, cx, 40, 40, 6, '#7a7a8a');
  rect(ctx, cx, 40, 40, 2, '#8a8a9a');
  // Well shaft
  rect(ctx, cx + 4, 46, 32, 30, '#5a5a6a');
  rect(ctx, cx + 6, 48, 28, 26, '#1a2a3a');
  // Water
  rect(ctx, cx + 8, 60, 24, 12, WATER);
  rect(ctx, cx + 10, 62, 8, 2, WATER_LT);

  // Posts and roof beam
  rect(ctx, cx + 4, 10, 3, 32, WOOD_DK);
  rect(ctx, cx + 33, 10, 3, 32, WOOD_DK);
  rect(ctx, cx + 2, 8, 36, 3, WOOD);
  rect(ctx, cx + 2, 8, 36, 1, WOOD_DK);
  // Rope
  rect(ctx, cx + 19, 11, 1, 25, '#8a7a5a');
  // Bucket
  rect(ctx, cx + 17, 36, 5, 4, '#6a5540');
  rect(ctx, cx + 17, 36, 5, 1, WOOD_DK);
};

const drawFountainInterior: DrawFn = (ctx, w, h) => {
  // Outdoor close-up
  for (let y = 0; y < 25; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = y < 12 ? '#2a3a5a' : '#3a4a6a';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  for (let y = 25; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = ((x + (y & 1) * 2) % 4);
      ctx.fillStyle = b === 0 ? FLOOR_SD : FLOOR_STONE;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const cx = 55;
  // Lower basin
  rect(ctx, cx - 10, 55, 60, 8, '#6a6a7a');
  rect(ctx, cx - 10, 55, 60, 2, '#8a8a9a');
  rect(ctx, cx - 8, 57, 56, 4, WATER);
  rect(ctx, cx, 58, 12, 2, WATER_LT);

  // Pedestal
  rect(ctx, cx + 12, 35, 16, 20, '#6a6a7a');
  rect(ctx, cx + 14, 35, 12, 2, '#8a8a9a');

  // Upper basin
  rect(ctx, cx + 4, 32, 32, 4, '#7a7a8a');
  rect(ctx, cx + 4, 32, 32, 2, '#8a8a9a');
  rect(ctx, cx + 6, 33, 28, 2, WATER);
  rect(ctx, cx + 10, 33, 8, 1, WATER_LT);

  // Spout column
  rect(ctx, cx + 18, 10, 4, 22, '#7a7a8a');
  rect(ctx, cx + 17, 8, 6, 3, '#8a8a9a');

  // Water spray
  rect(ctx, cx + 19, 4, 2, 4, WATER_LT);
  rect(ctx, cx + 17, 6, 2, 3, WATER);
  rect(ctx, cx + 21, 6, 2, 3, WATER);

  // Falling water sides
  rect(ctx, cx + 6, 36, 1, 18, WATER);
  rect(ctx, cx + 33, 36, 1, 18, WATER);
};

const INTERIOR_DRAWERS: Record<BuildingType, DrawFn> = {
  shop: drawShopInterior,
  arena: drawArenaInterior,
  council: drawCouncilInterior,
  library: drawLibraryInterior,
  tavern: drawTavernInterior,
  house_small: drawHouseInterior,
  house_medium: drawHouseInterior,
  house_large: drawHouseInterior,
  well: drawWellInterior,
  fountain: drawFountainInterior,
};

const BUILDING_INFO: Record<BuildingType, { label: string; details: string[] }> = {
  shop: { label: 'SHOP', details: ['Goods for trade', 'Buy and sell items', 'Browse wares'] },
  arena: { label: 'ARENA', details: ['Combat training', 'Spectator fights', 'Weapon displays'] },
  council: { label: 'COUNCIL HALL', details: ['Diplomatic meetings', 'Strategic planning', 'Alliance formation'] },
  library: { label: 'LIBRARY', details: ['Ancient knowledge', 'Spell research', 'Historical records'] },
  tavern: { label: 'TAVERN', details: ['Hot meals & drink', 'Rumors & gossip', 'Rest for travelers'] },
  house_small: { label: 'COTTAGE', details: ['Cozy dwelling', 'Personal quarters'] },
  house_medium: { label: 'HOUSE', details: ['Comfortable home', 'Family quarters'] },
  house_large: { label: 'MANOR', details: ['Spacious estate', 'Noble residence'] },
  well: { label: 'WELL', details: ['Fresh water source', 'Village gathering spot'] },
  fountain: { label: 'FOUNTAIN', details: ['Town centerpiece', 'Flowing water'] },
};

function getCharactersNearBuilding(
  characters: Record<string, Character>,
  location: Location,
  threshold: number = 15,
): Character[] {
  const nearby: Character[] = [];
  for (const char of Object.values(characters)) {
    const dx = char.position.x - location.x;
    const dy = char.position.y - location.y;
    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      nearby.push(char);
    }
  }
  return nearby;
}

export default function BuildingInterior({
  buildingName,
  locations,
  characters,
  onClose,
}: BuildingInteriorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const location = locations.find((l) => l.name === buildingName);
  if (!location) return null;

  const buildingType = locationToBuildingType(location.type, location.name);
  const info = BUILDING_INFO[buildingType];
  const nearbyChars = getCharactersNearBuilding(characters, location);

  const drawInterior = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(DRAW_SCALE, DRAW_SCALE);

    const drawer = INTERIOR_DRAWERS[buildingType];
    if (drawer) {
      drawer(ctx, INTERIOR_W, INTERIOR_H);
    }

    ctx.restore();
  }, [buildingType]);

  useEffect(() => {
    drawInterior();
  }, [drawInterior]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 animate-slideUp"
      style={{ height: '40%' }}
    >
      {/* Backdrop for clicking outside */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      <div
        className="relative z-40 h-full flex flex-col bg-[#12122a] border-t-2 border-[#4a4a8a]"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[#2a2a5a] bg-[#1a1a3a] shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="text-pixel-sm text-neon-gold tracking-wider"
              style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}
            >
              {info.label}
            </span>
            <span className="text-pixel-xs text-gray-500">
              {buildingName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-pixel-xs text-gray-500 hover:text-neon-red transition-colors px-2 py-1"
          >
            [X] CLOSE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Interior canvas */}
          <div className="flex-1 flex items-center justify-center p-2 min-w-0">
            <canvas
              ref={canvasRef}
              width={INTERIOR_W * DRAW_SCALE}
              height={INTERIOR_H * DRAW_SCALE}
              className="max-w-full max-h-full border-2 border-[#2a2a5a] rounded"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Info sidebar */}
          <div className="w-[200px] border-l-2 border-[#2a2a5a] p-3 overflow-y-auto shrink-0">
            {/* Building details */}
            <div className="mb-4">
              <div className="text-pixel-xs text-gray-400 tracking-wider mb-2">DETAILS</div>
              {info.details.map((d, i) => (
                <div key={i} className="text-pixel-xs text-gray-500 mb-1">
                  - {d}
                </div>
              ))}
            </div>

            {/* Characters inside */}
            <div>
              <div className="text-pixel-xs text-gray-400 tracking-wider mb-2">
                OCCUPANTS ({nearbyChars.length})
              </div>
              {nearbyChars.length === 0 ? (
                <div className="text-pixel-xs text-gray-600">None nearby</div>
              ) : (
                nearbyChars.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 mb-1.5 px-1 py-0.5 rounded hover:bg-white/5"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: char.alive ? '#00ff88' : '#ff3366' }}
                    />
                    <span className="text-pixel-xs text-gray-300 truncate">
                      {char.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
