// Pixel art building sprites for Canvas rendering
// Buildings are drawn at various sizes, with details like doors, windows, roofs, chimneys

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

interface BuildingDef {
  width: number;   // in pixels (before scale)
  height: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, frame: number) => void;
}

// Color palette
const WALL_BEIGE = '#c8b890';
const WALL_BEIGE_LT = '#d8c8a0';
const WALL_BEIGE_DK = '#b0a078';
const WALL_STONE = '#8a8a8a';
const WALL_STONE_LT = '#9a9a9a';
const WALL_STONE_DK = '#6a6a6a';
const ROOF_RED = '#aa3322';
const ROOF_RED_LT = '#cc4433';
const ROOF_RED_DK = '#882211';
const ROOF_BLUE = '#2244aa';
const ROOF_BLUE_LT = '#3355bb';
const ROOF_BLUE_DK = '#112288';
const ROOF_GREEN = '#226622';
const ROOF_GREEN_LT = '#338833';
const ROOF_GREEN_DK = '#114411';
const ROOF_GOLD = '#aa8833';
const ROOF_GOLD_LT = '#ccaa44';
const ROOF_GOLD_DK = '#886622';
const ROOF_PURPLE = '#663388';
const ROOF_PURPLE_LT = '#8844aa';
const ROOF_PURPLE_DK = '#442266';
const DOOR = '#4a2a0a';
const DOOR_LT = '#5a3a1a';
const WINDOW_GLASS = '#88bbdd';
const WINDOW_GLOW = '#ffd86050';
const WOOD_FRAME = '#5a3a1a';
const CHIMNEY = '#6a5a5a';
const CHIMNEY_DK = '#4a3a3a';

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, scale: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

// ==================== HOUSE SMALL (24x28) ====================
const HOUSE_SMALL: BuildingDef = {
  width: 24, height: 28,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Wall
    ctx.fillStyle = WALL_BEIGE;
    ctx.fillRect(x(2), y(12), 20 * s, 14 * s);
    ctx.fillStyle = WALL_BEIGE_LT;
    ctx.fillRect(x(3), y(13), 18 * s, 1 * s);
    ctx.fillStyle = WALL_BEIGE_DK;
    ctx.fillRect(x(2), y(25), 20 * s, 1 * s);

    // Roof
    ctx.fillStyle = ROOF_RED;
    ctx.beginPath();
    ctx.moveTo(x(0), y(13));
    ctx.lineTo(x(12), y(2));
    ctx.lineTo(x(24), y(13));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF_RED_LT;
    ctx.beginPath();
    ctx.moveTo(x(0), y(13));
    ctx.lineTo(x(12), y(2));
    ctx.lineTo(x(12), y(13));
    ctx.closePath();
    ctx.fill();
    // Roof outline
    ctx.strokeStyle = ROOF_RED_DK;
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x(0), y(13));
    ctx.lineTo(x(12), y(2));
    ctx.lineTo(x(24), y(13));
    ctx.stroke();

    // Door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(9), y(19), 6 * s, 7 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(10), y(20), 4 * s, 5 * s);
    // Door knob
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x(13), y(22), 1 * s, 1 * s);

    // Windows
    ctx.fillStyle = WOOD_FRAME;
    ctx.fillRect(x(3), y(15), 5 * s, 5 * s);
    ctx.fillStyle = WINDOW_GLASS;
    ctx.fillRect(x(4), y(16), 3 * s, 3 * s);
    ctx.fillStyle = WOOD_FRAME;
    ctx.fillRect(x(16), y(15), 5 * s, 5 * s);
    ctx.fillStyle = WINDOW_GLASS;
    ctx.fillRect(x(17), y(16), 3 * s, 3 * s);
    // Window cross
    ctx.fillStyle = WOOD_FRAME;
    ctx.fillRect(x(5), y(16), 1 * s, 3 * s);
    ctx.fillRect(x(4), y(17), 3 * s, 1 * s);
    ctx.fillRect(x(18), y(16), 1 * s, 3 * s);
    ctx.fillRect(x(17), y(17), 3 * s, 1 * s);

    // Chimney
    ctx.fillStyle = CHIMNEY;
    ctx.fillRect(x(17), y(3), 3 * s, 7 * s);
    ctx.fillStyle = CHIMNEY_DK;
    ctx.fillRect(x(17), y(3), 3 * s, 1 * s);

    // Base line
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(26), 20 * s, 1 * s);
  },
};

// ==================== HOUSE MEDIUM (32x32) ====================
const HOUSE_MEDIUM: BuildingDef = {
  width: 32, height: 32,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Wall
    ctx.fillStyle = WALL_BEIGE;
    ctx.fillRect(x(2), y(14), 28 * s, 16 * s);
    ctx.fillStyle = WALL_BEIGE_LT;
    ctx.fillRect(x(3), y(15), 26 * s, 1 * s);
    ctx.fillStyle = WALL_BEIGE_DK;
    ctx.fillRect(x(2), y(29), 28 * s, 1 * s);

    // Roof
    ctx.fillStyle = ROOF_BLUE;
    ctx.beginPath();
    ctx.moveTo(x(0), y(15));
    ctx.lineTo(x(16), y(2));
    ctx.lineTo(x(32), y(15));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF_BLUE_LT;
    ctx.beginPath();
    ctx.moveTo(x(0), y(15));
    ctx.lineTo(x(16), y(2));
    ctx.lineTo(x(16), y(15));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ROOF_BLUE_DK;
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x(0), y(15));
    ctx.lineTo(x(16), y(2));
    ctx.lineTo(x(32), y(15));
    ctx.stroke();

    // Door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(13), y(22), 6 * s, 8 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(14), y(23), 4 * s, 6 * s);
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x(17), y(26), 1 * s, 1 * s);

    // Windows (2 per side)
    for (const wx of [3, 23]) {
      ctx.fillStyle = WOOD_FRAME;
      ctx.fillRect(x(wx), y(17), 6 * s, 5 * s);
      ctx.fillStyle = WINDOW_GLASS;
      ctx.fillRect(x(wx + 1), y(18), 4 * s, 3 * s);
      ctx.fillStyle = WOOD_FRAME;
      ctx.fillRect(x(wx + 2), y(18), 1 * s, 3 * s);
      ctx.fillRect(x(wx + 1), y(19), 4 * s, 1 * s);
    }

    // Chimney
    ctx.fillStyle = CHIMNEY;
    ctx.fillRect(x(24), y(4), 4 * s, 8 * s);
    ctx.fillStyle = CHIMNEY_DK;
    ctx.fillRect(x(24), y(4), 4 * s, 1 * s);

    // Base
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(30), 28 * s, 1 * s);
  },
};

// ==================== HOUSE LARGE (40x36) ====================
const HOUSE_LARGE: BuildingDef = {
  width: 40, height: 36,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Main wall
    ctx.fillStyle = WALL_BEIGE;
    ctx.fillRect(x(2), y(16), 36 * s, 18 * s);
    ctx.fillStyle = WALL_BEIGE_LT;
    ctx.fillRect(x(3), y(17), 34 * s, 1 * s);
    ctx.fillStyle = WALL_BEIGE_DK;
    ctx.fillRect(x(2), y(33), 36 * s, 1 * s);

    // Main roof
    ctx.fillStyle = ROOF_GREEN;
    ctx.beginPath();
    ctx.moveTo(x(0), y(17));
    ctx.lineTo(x(20), y(2));
    ctx.lineTo(x(40), y(17));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF_GREEN_LT;
    ctx.beginPath();
    ctx.moveTo(x(0), y(17));
    ctx.lineTo(x(20), y(2));
    ctx.lineTo(x(20), y(17));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ROOF_GREEN_DK;
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x(0), y(17));
    ctx.lineTo(x(20), y(2));
    ctx.lineTo(x(40), y(17));
    ctx.stroke();

    // Double door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(15), y(24), 10 * s, 10 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(16), y(25), 4 * s, 8 * s);
    ctx.fillRect(x(20), y(25), 4 * s, 8 * s);
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x(19), y(28), 1 * s, 1 * s);
    ctx.fillRect(x(20), y(28), 1 * s, 1 * s);

    // Windows
    for (const wx of [3, 10, 26, 33]) {
      ctx.fillStyle = WOOD_FRAME;
      ctx.fillRect(x(wx), y(19), 5 * s, 5 * s);
      ctx.fillStyle = WINDOW_GLASS;
      ctx.fillRect(x(wx + 1), y(20), 3 * s, 3 * s);
    }

    // Chimney
    ctx.fillStyle = CHIMNEY;
    ctx.fillRect(x(30), y(4), 4 * s, 10 * s);
    ctx.fillStyle = CHIMNEY_DK;
    ctx.fillRect(x(30), y(4), 4 * s, 1 * s);

    // Base
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(34), 36 * s, 1 * s);
  },
};

// ==================== SHOP (32x32) ====================
const SHOP: BuildingDef = {
  width: 32, height: 32,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Wall
    ctx.fillStyle = '#d8c0a0';
    ctx.fillRect(x(2), y(10), 28 * s, 20 * s);
    ctx.fillStyle = '#e0c8a8';
    ctx.fillRect(x(3), y(11), 26 * s, 1 * s);

    // Awning
    ctx.fillStyle = ROOF_GOLD;
    ctx.fillRect(x(0), y(8), 32 * s, 4 * s);
    ctx.fillStyle = ROOF_GOLD_LT;
    ctx.fillRect(x(0), y(8), 32 * s, 2 * s);
    // Awning stripes
    ctx.fillStyle = ROOF_GOLD_DK;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(x(i * 4), y(10), 2 * s, 2 * s);
    }

    // Sign
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x(8), y(3), 16 * s, 5 * s);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x(9), y(4), 14 * s, 3 * s);
    // "SHOP" text pixels
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${3 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', x(16), y(6.5));
    ctx.textAlign = 'start';

    // Large display window
    ctx.fillStyle = WOOD_FRAME;
    ctx.fillRect(x(3), y(14), 12 * s, 10 * s);
    ctx.fillStyle = WINDOW_GLASS;
    ctx.fillRect(x(4), y(15), 10 * s, 8 * s);
    // Display items
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(x(6), y(19), 2 * s, 3 * s);
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(x(10), y(18), 2 * s, 4 * s);

    // Door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(19), y(18), 8 * s, 12 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(20), y(19), 6 * s, 10 * s);
    // Door window
    ctx.fillStyle = WINDOW_GLASS;
    ctx.fillRect(x(21), y(20), 4 * s, 4 * s);
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x(25), y(24), 1 * s, 1 * s);

    // Base
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(30), 28 * s, 1 * s);
  },
};

// ==================== ARENA (48x40) ====================
const ARENA: BuildingDef = {
  width: 48, height: 40,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Base structure
    ctx.fillStyle = WALL_STONE;
    ctx.fillRect(x(4), y(10), 40 * s, 28 * s);
    ctx.fillStyle = WALL_STONE_LT;
    ctx.fillRect(x(5), y(11), 38 * s, 1 * s);
    ctx.fillStyle = WALL_STONE_DK;
    ctx.fillRect(x(4), y(37), 40 * s, 1 * s);

    // Towers left & right
    ctx.fillStyle = WALL_STONE_DK;
    ctx.fillRect(x(0), y(5), 8 * s, 33 * s);
    ctx.fillRect(x(40), y(5), 8 * s, 33 * s);
    // Tower tops (crenellations)
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = WALL_STONE;
      ctx.fillRect(x(i * 2), y(3), 2 * s, 4 * s);
      ctx.fillRect(x(40 + i * 2), y(3), 2 * s, 4 * s);
    }

    // Red banner across
    ctx.fillStyle = '#aa2222';
    ctx.fillRect(x(10), y(12), 28 * s, 4 * s);
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(x(10), y(12), 28 * s, 2 * s);

    // Gate
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x(16), y(22), 16 * s, 16 * s);
    ctx.fillStyle = '#3a2a1a';
    // Arch top
    ctx.beginPath();
    ctx.arc(x(24), y(22), 8 * s, Math.PI, 0);
    ctx.fill();
    // Gate bars
    ctx.fillStyle = '#4a4a4a';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x(17 + i * 3), y(22), 1 * s, 16 * s);
    }

    // Torches on towers
    ctx.fillStyle = '#ff8844';
    ctx.fillRect(x(3), y(8), 2 * s, 2 * s);
    ctx.fillRect(x(43), y(8), 2 * s, 2 * s);

    // Base
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x(0), y(38), 48 * s, 1 * s);
  },
};

// ==================== COUNCIL HALL (44x36) ====================
const COUNCIL: BuildingDef = {
  width: 44, height: 36,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Main wall
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(x(4), y(14), 36 * s, 20 * s);
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(x(5), y(15), 34 * s, 1 * s);

    // Pillars
    ctx.fillStyle = '#b8b8b8';
    for (const px of [6, 14, 22, 30, 38]) {
      ctx.fillRect(x(px - 1), y(16), 3 * s, 18 * s);
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(x(px - 1), y(16), 3 * s, 1 * s);
      ctx.fillRect(x(px - 1), y(33), 3 * s, 1 * s);
      ctx.fillStyle = '#b8b8b8';
    }

    // Pediment (triangular)
    ctx.fillStyle = ROOF_BLUE;
    ctx.beginPath();
    ctx.moveTo(x(2), y(15));
    ctx.lineTo(x(22), y(2));
    ctx.lineTo(x(42), y(15));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF_BLUE_LT;
    ctx.beginPath();
    ctx.moveTo(x(2), y(15));
    ctx.lineTo(x(22), y(2));
    ctx.lineTo(x(22), y(15));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ROOF_BLUE_DK;
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x(2), y(15));
    ctx.lineTo(x(22), y(2));
    ctx.lineTo(x(42), y(15));
    ctx.stroke();

    // Emblem in pediment
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x(22), y(9), 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Double door
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(17), y(24), 10 * s, 10 * s);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(x(18), y(25), 4 * s, 8 * s);
    ctx.fillRect(x(22), y(25), 4 * s, 8 * s);

    // Steps
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(x(14), y(34), 16 * s, 1 * s);
    ctx.fillStyle = '#909090';
    ctx.fillRect(x(12), y(35), 20 * s, 1 * s);
  },
};

// ==================== LIBRARY (40x36) ====================
const LIBRARY: BuildingDef = {
  width: 40, height: 36,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Wall
    ctx.fillStyle = '#a08870';
    ctx.fillRect(x(2), y(12), 36 * s, 22 * s);
    ctx.fillStyle = '#b09880';
    ctx.fillRect(x(3), y(13), 34 * s, 1 * s);

    // Roof
    ctx.fillStyle = ROOF_PURPLE;
    ctx.fillRect(x(0), y(8), 40 * s, 6 * s);
    ctx.fillStyle = ROOF_PURPLE_LT;
    ctx.fillRect(x(0), y(8), 40 * s, 3 * s);
    ctx.strokeStyle = ROOF_PURPLE_DK;
    ctx.lineWidth = s * 0.5;
    ctx.strokeRect(x(0), y(8), 40 * s, 6 * s);

    // Tower/cupola
    ctx.fillStyle = ROOF_PURPLE;
    ctx.fillRect(x(16), y(1), 8 * s, 8 * s);
    ctx.fillStyle = ROOF_PURPLE_LT;
    ctx.fillRect(x(16), y(1), 4 * s, 8 * s);
    // Dome
    ctx.beginPath();
    ctx.arc(x(20), y(2), 4 * s, Math.PI, 0);
    ctx.fillStyle = ROOF_PURPLE_LT;
    ctx.fill();

    // Tall windows (stained glass look)
    for (const wx of [4, 12, 24, 32]) {
      ctx.fillStyle = WOOD_FRAME;
      ctx.fillRect(x(wx), y(15), 4 * s, 12 * s);
      ctx.fillStyle = '#6688aa';
      ctx.fillRect(x(wx + 1), y(16), 2 * s, 10 * s);
      // Arch top
      ctx.beginPath();
      ctx.arc(x(wx + 2), y(16), 1.5 * s, Math.PI, 0);
      ctx.fill();
    }

    // Door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(17), y(26), 6 * s, 8 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(18), y(27), 4 * s, 6 * s);

    // Sign: LIBRARY
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${2.5 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('LIBRARY', x(20), y(11.5));
    ctx.textAlign = 'start';

    // Base
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(34), 36 * s, 1 * s);
  },
};

// ==================== TAVERN (36x32) ====================
const TAVERN: BuildingDef = {
  width: 36, height: 32,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Wall
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x(2), y(12), 32 * s, 18 * s);
    ctx.fillStyle = '#9a7a5a';
    ctx.fillRect(x(3), y(13), 30 * s, 1 * s);

    // Roof
    ctx.fillStyle = ROOF_RED;
    ctx.beginPath();
    ctx.moveTo(x(0), y(13));
    ctx.lineTo(x(18), y(2));
    ctx.lineTo(x(36), y(13));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF_RED_LT;
    ctx.beginPath();
    ctx.moveTo(x(0), y(13));
    ctx.lineTo(x(18), y(2));
    ctx.lineTo(x(18), y(13));
    ctx.closePath();
    ctx.fill();

    // Sign post with hanging sign
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x(30), y(8), 2 * s, 8 * s);
    ctx.fillRect(x(24), y(8), 8 * s, 1 * s);
    // Sign
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(x(24), y(9), 6 * s, 4 * s);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x(25), y(10), 1 * s, 2 * s); // Mug icon
    ctx.fillRect(x(26), y(11), 2 * s, 1 * s);

    // Windows with warm glow
    for (const wx of [4, 24]) {
      ctx.fillStyle = WOOD_FRAME;
      ctx.fillRect(x(wx), y(16), 6 * s, 5 * s);
      ctx.fillStyle = WINDOW_GLOW;
      ctx.fillRect(x(wx + 1), y(17), 4 * s, 3 * s);
    }

    // Door
    ctx.fillStyle = DOOR;
    ctx.fillRect(x(14), y(20), 8 * s, 10 * s);
    ctx.fillStyle = DOOR_LT;
    ctx.fillRect(x(15), y(21), 6 * s, 8 * s);

    // Chimney with smoke
    ctx.fillStyle = CHIMNEY;
    ctx.fillRect(x(8), y(4), 3 * s, 6 * s);

    // Base
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x(2), y(30), 32 * s, 1 * s);
  },
};

// ==================== WELL (12x14) ====================
const WELL: BuildingDef = {
  width: 12, height: 14,
  draw(ctx, bx, by, s) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Stone base (circular-ish)
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(x(1), y(8), 10 * s, 5 * s);
    ctx.fillRect(x(2), y(7), 8 * s, 1 * s);
    ctx.fillRect(x(2), y(13), 8 * s, 1 * s);

    // Water inside
    ctx.fillStyle = '#2a4a7a';
    ctx.fillRect(x(3), y(9), 6 * s, 3 * s);

    // Posts
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x(2), y(2), 1 * s, 8 * s);
    ctx.fillRect(x(9), y(2), 1 * s, 8 * s);

    // Roof
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(x(1), y(1), 10 * s, 2 * s);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x(1), y(1), 10 * s, 1 * s);

    // Bucket rope
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(x(5), y(3), 1 * s, 5 * s);
  },
};

// ==================== FOUNTAIN (20x16) ====================
const FOUNTAIN: BuildingDef = {
  width: 20, height: 16,
  draw(ctx, bx, by, s, frame) {
    const x = (cx: number) => bx + cx * s;
    const y = (cy: number) => by + cy * s;

    // Base pool
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(x(1), y(10), 18 * s, 5 * s);
    ctx.fillRect(x(3), y(9), 14 * s, 1 * s);
    ctx.fillRect(x(3), y(15), 14 * s, 1 * s);
    // Water in pool
    ctx.fillStyle = '#3a6a9a';
    ctx.fillRect(x(3), y(11), 14 * s, 3 * s);

    // Center pillar
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(x(9), y(4), 2 * s, 7 * s);

    // Top basin
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(x(7), y(3), 6 * s, 2 * s);
    ctx.fillStyle = '#3a6a9a';
    ctx.fillRect(x(8), y(3), 4 * s, 1 * s);

    // Water spray (animated)
    const sprayH = 2 + Math.sin(frame * 0.3);
    ctx.fillStyle = '#6a9acc';
    ctx.fillRect(x(9.5), y(3 - sprayH), 1 * s, sprayH * s);
    // Droplets
    ctx.fillStyle = '#88bbdd';
    const d1 = Math.sin(frame * 0.4) * 2;
    const d2 = Math.cos(frame * 0.35) * 2;
    ctx.fillRect(x(8 + d1), y(5), 1 * s, 1 * s);
    ctx.fillRect(x(12 + d2), y(5), 1 * s, 1 * s);
  },
};

const BUILDING_MAP: Record<BuildingType, BuildingDef> = {
  house_small: HOUSE_SMALL,
  house_medium: HOUSE_MEDIUM,
  house_large: HOUSE_LARGE,
  shop: SHOP,
  arena: ARENA,
  council: COUNCIL,
  library: LIBRARY,
  tavern: TAVERN,
  well: WELL,
  fountain: FOUNTAIN,
};

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: BuildingType,
  scale: number,
  frame: number,
): void {
  const def = BUILDING_MAP[type];
  if (!def) return;
  def.draw(ctx, x, y, scale, frame);
}

export function getBuildingSize(type: BuildingType): { width: number; height: number } {
  const def = BUILDING_MAP[type];
  if (!def) return { width: 32, height: 32 };
  return { width: def.width, height: def.height };
}

// Map location types from backend to building types
export function locationToBuildingType(locType: string, locName: string): BuildingType {
  const t = locType.toLowerCase();
  const n = locName.toLowerCase();
  if (t === 'trade' || t === 'market' || n.includes('market') || n.includes('shop')) return 'shop';
  if (t === 'conflict' || t === 'arena' || n.includes('arena')) return 'arena';
  if (t === 'diplomacy' || t === 'council' || n.includes('council') || n.includes('hall')) return 'council';
  if (t === 'knowledge' || t === 'library' || n.includes('library')) return 'library';
  if (t === 'exploration' || t === 'wilderness' || n.includes('tavern') || n.includes('inn')) return 'tavern';
  return 'tavern';
}
