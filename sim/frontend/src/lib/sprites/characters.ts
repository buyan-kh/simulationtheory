// Pixel art character sprites for Canvas rendering
// 16x16 grid, RPG-style characters inspired by SNES-era games

export interface CharacterColors {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  outline: string;
}

export type Direction = 'down' | 'up' | 'left' | 'right';

export const CHARACTER_PALETTES: CharacterColors[] = [
  { skin: '#FFD5B8', hair: '#00AACC', shirt: '#0077AA', pants: '#334455', outline: '#1a1a2a' },
  { skin: '#FFD5B8', hair: '#CC2255', shirt: '#AA0044', pants: '#442233', outline: '#1a1a2a' },
  { skin: '#FFD5B8', hair: '#22AA66', shirt: '#008844', pants: '#223344', outline: '#1a1a2a' },
  { skin: '#FFD5B8', hair: '#CCAA00', shirt: '#AA8800', pants: '#443322', outline: '#1a1a2a' },
  { skin: '#E8C4A0', hair: '#CC3333', shirt: '#AA2222', pants: '#442222', outline: '#1a1a2a' },
  { skin: '#E8C4A0', hair: '#4444CC', shirt: '#3333AA', pants: '#222244', outline: '#1a1a2a' },
  { skin: '#C8A882', hair: '#8844CC', shirt: '#6633AA', pants: '#332244', outline: '#1a1a2a' },
  { skin: '#C8A882', hair: '#CC6633', shirt: '#AA5522', pants: '#443322', outline: '#1a1a2a' },
];

export type HatStyle = 'wizard' | 'warrior' | 'hood' | 'crown' | 'none';

// Color indices for sprite data:
// 0 = transparent
// 1 = outline
// 2 = skin
// 3 = hair
// 4 = shirt
// 5 = pants
// 6 = eye color (dark)
// 7 = hair highlight
// 8 = shirt highlight
// 9 = skin shadow
// 10 = shoe/boot
// 11 = white (eye whites, teeth)
// 12 = belt

// ==================== DOWN-FACING SPRITES ====================

const SPRITE_DOWN_IDLE: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 11, 6, 2, 11, 6, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 9, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 0, 0, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 10, 10, 0, 0, 10, 10, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
];

const SPRITE_DOWN_WALK1: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 11, 6, 2, 11, 6, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 9, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 0, 0, 0, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 1, 0, 0, 0, 1, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
];

const SPRITE_DOWN_WALK2: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 11, 6, 2, 11, 6, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 9, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 1, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 1, 0, 0, 0, 1, 10, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
];

// ==================== UP-FACING SPRITES ====================

const SPRITE_UP_IDLE: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 2, 2, 2, 2, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 0, 0, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 10, 10, 0, 0, 10, 10, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
];

const SPRITE_UP_WALK1: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 2, 2, 2, 2, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 0, 0, 0, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 1, 0, 0, 0, 1, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
];

const SPRITE_UP_WALK2: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 7, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 2, 2, 2, 2, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 8, 4, 4, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 1, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 1, 0, 0, 0, 1, 10, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
];

// ==================== LEFT-FACING SPRITES ====================

const SPRITE_LEFT_IDLE: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 6, 11, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 0, 0, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 10, 10, 0, 0, 10, 10, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
];

const SPRITE_LEFT_WALK1: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 6, 11, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 0, 0, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 1, 0, 0, 0, 0, 1, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
];

const SPRITE_LEFT_WALK2: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 7, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 6, 11, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 2, 2, 2, 2, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 9, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 8, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 1, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 10, 1, 0, 0, 0, 1, 10, 10, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
];

// Right-facing sprites are mirrored from left
function mirrorSprite(sprite: number[][]): number[][] {
  return sprite.map(row => [...row].reverse());
}

const SPRITE_RIGHT_IDLE = mirrorSprite(SPRITE_LEFT_IDLE);
const SPRITE_RIGHT_WALK1 = mirrorSprite(SPRITE_LEFT_WALK1);
const SPRITE_RIGHT_WALK2 = mirrorSprite(SPRITE_LEFT_WALK2);

// ==================== HAT OVERLAYS ====================
// These replace the top rows of any sprite. Values of -1 mean "keep original pixel".

const HAT_WIZARD: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 3, 7, 7, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
];

const HAT_WARRIOR: number[][] = [
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 12, 12, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
];

const HAT_HOOD: number[][] = [
  [0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 7, 7, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 0, 1, 3, -1, -1, -1, -1, -1, -1, -1, -1, 3, 1, 0, 0],
];

const HAT_CROWN: number[][] = [
  [0, 0, 0, 0, 1, 8, 1, 8, 8, 1, 8, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
];

// Map sprite data by direction
type SpriteSet = { idle: number[][]; walk1: number[][]; walk2: number[][] };

const SPRITES: Record<Direction, SpriteSet> = {
  down:  { idle: SPRITE_DOWN_IDLE, walk1: SPRITE_DOWN_WALK1, walk2: SPRITE_DOWN_WALK2 },
  up:    { idle: SPRITE_UP_IDLE, walk1: SPRITE_UP_WALK1, walk2: SPRITE_UP_WALK2 },
  left:  { idle: SPRITE_LEFT_IDLE, walk1: SPRITE_LEFT_WALK1, walk2: SPRITE_LEFT_WALK2 },
  right: { idle: SPRITE_RIGHT_IDLE, walk1: SPRITE_RIGHT_WALK1, walk2: SPRITE_RIGHT_WALK2 },
};

const HAT_DATA: Record<HatStyle, number[][] | null> = {
  wizard: HAT_WIZARD,
  warrior: HAT_WARRIOR,
  hood: HAT_HOOD,
  crown: HAT_CROWN,
  none: null,
};

// Resolve color index to actual color string
function resolveColor(index: number, colors: CharacterColors, isDead: boolean): string | null {
  if (index === 0) return null; // transparent
  let color: string;
  switch (index) {
    case 1: color = colors.outline; break;
    case 2: color = colors.skin; break;
    case 3: color = colors.hair; break;
    case 4: color = colors.shirt; break;
    case 5: color = colors.pants; break;
    case 6: color = '#1a1a2e'; break;   // eye pupil
    case 7: // hair highlight
      color = lightenColor(colors.hair, 30);
      break;
    case 8: // shirt highlight
      color = lightenColor(colors.shirt, 25);
      break;
    case 9: // skin shadow
      color = darkenColor(colors.skin, 20);
      break;
    case 10: // shoes
      color = darkenColor(colors.pants, 25);
      break;
    case 11: color = '#FFFFFF'; break;   // white (eyes)
    case 12: // belt
      color = darkenColor(colors.shirt, 35);
      break;
    default: color = '#FF00FF'; break;   // debug magenta
  }
  if (isDead) {
    color = toGrayscale(color);
  }
  return color;
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function toGrayscale(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  return `#${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}`;
}

function drawPixel(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  scale: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(px, py, scale, scale);
}

function renderSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: number[][],
  colors: CharacterColors,
  isDead: boolean,
  scale: number,
): void {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const idx = sprite[row][col];
      const color = resolveColor(idx, colors, isDead);
      if (color !== null) {
        drawPixel(ctx, x + col * scale, y + row * scale, scale, color);
      }
    }
  }
}

function applyHat(sprite: number[][], hatStyle: HatStyle): number[][] {
  const hatOverlay = HAT_DATA[hatStyle];
  if (!hatOverlay) return sprite;

  // Clone the sprite
  const result = sprite.map(row => [...row]);

  // Wizard hat extends upward — shift the whole sprite down to make room
  if (hatStyle === 'wizard') {
    // Overlay the hat starting from the top of the sprite
    // The wizard hat is 5 rows, replacing rows 0-4
    for (let row = 0; row < hatOverlay.length && row < result.length; row++) {
      for (let col = 0; col < hatOverlay[row].length && col < result[row].length; col++) {
        const val = hatOverlay[row][col];
        if (val !== -1) {
          result[row][col] = val;
        }
      }
    }
  } else {
    // Other hats overlay on top rows
    for (let row = 0; row < hatOverlay.length && row < result.length; row++) {
      for (let col = 0; col < hatOverlay[row].length && col < result[row].length; col++) {
        const val = hatOverlay[row][col];
        if (val !== -1 && val !== 0) {
          result[row][col] = val;
        }
      }
    }
  }

  return result;
}

function drawDeadEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  scale: number,
): void {
  if (direction === 'up') return; // Can't see eyes from behind

  const eyeColor = '#444444';
  ctx.fillStyle = eyeColor;

  if (direction === 'down') {
    // Left X eye
    ctx.fillRect(x + 6 * scale, y + 4 * scale, scale, scale);
    ctx.fillRect(x + 7 * scale, y + 4 * scale, scale, scale);
    // Right X eye
    ctx.fillRect(x + 9 * scale, y + 4 * scale, scale, scale);
    ctx.fillRect(x + 10 * scale, y + 4 * scale, scale, scale);
  } else if (direction === 'left') {
    // Single visible X eye
    ctx.fillRect(x + 5 * scale, y + 4 * scale, scale, scale);
    ctx.fillRect(x + 6 * scale, y + 4 * scale, scale, scale);
  } else if (direction === 'right') {
    ctx.fillRect(x + 9 * scale, y + 4 * scale, scale, scale);
    ctx.fillRect(x + 10 * scale, y + 4 * scale, scale, scale);
  }
}

export function drawCharacterShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  const shadowWidth = 10 * scale;
  const shadowHeight = 3 * scale;
  const sx = x + 3 * scale;
  const sy = y + 15 * scale;
  ctx.beginPath();
  ctx.ellipse(
    sx + shadowWidth / 2,
    sy + shadowHeight / 2,
    shadowWidth / 2,
    shadowHeight / 2,
    0, 0, Math.PI * 2,
  );
  ctx.fill();
}

export function drawCharacterName(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  isSelected: boolean,
  scale: number,
): void {
  const fontSize = Math.max(8, 5 * scale);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';

  const textX = x + 8 * scale;
  const textY = y - 3 * scale;

  // Background pill
  const metrics = ctx.measureText(name);
  const padding = 3;
  const bgX = textX - metrics.width / 2 - padding;
  const bgY = textY - fontSize + 1;
  const bgW = metrics.width + padding * 2;
  const bgH = fontSize + 2;

  ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bgW, bgH, 3);
  ctx.fill();

  // Text
  ctx.fillStyle = isSelected ? '#1a1a2a' : '#FFFFFF';
  ctx.fillText(name, textX, textY);
  ctx.textAlign = 'left';
}

export function drawSelectionIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  frame: number,
): void {
  // Pulsing golden diamond above the character
  const pulse = Math.sin(frame * 0.15) * 2;
  const centerX = x + 8 * scale;
  const topY = y - 7 * scale + pulse;
  const size = 3 * scale;

  // Outer glow
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(centerX, topY - size - 1);
  ctx.lineTo(centerX + size + 1, topY);
  ctx.lineTo(centerX, topY + size + 1);
  ctx.lineTo(centerX - size - 1, topY);
  ctx.closePath();
  ctx.fill();

  // Inner diamond
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(centerX, topY - size);
  ctx.lineTo(centerX + size, topY);
  ctx.lineTo(centerX, topY + size);
  ctx.lineTo(centerX - size, topY);
  ctx.closePath();
  ctx.fill();

  // Bright center highlight
  ctx.fillStyle = '#FFEC8B';
  const innerSize = size * 0.4;
  ctx.beginPath();
  ctx.moveTo(centerX, topY - innerSize);
  ctx.lineTo(centerX + innerSize, topY);
  ctx.lineTo(centerX, topY + innerSize);
  ctx.lineTo(centerX - innerSize, topY);
  ctx.closePath();
  ctx.fill();

  // Downward arrow below diamond
  const arrowY = topY + size + 1;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(centerX - scale * 0.5, arrowY, scale, scale * 2);
  ctx.beginPath();
  ctx.moveTo(centerX - scale * 1.5, arrowY + scale * 2);
  ctx.lineTo(centerX, arrowY + scale * 3.5);
  ctx.lineTo(centerX + scale * 1.5, arrowY + scale * 2);
  ctx.closePath();
  ctx.fill();
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: CharacterColors,
  direction: Direction,
  frame: number,
  isWalking: boolean,
  isDead: boolean,
  isSelected: boolean,
  hatStyle: HatStyle,
  scale: number,
): void {
  const spriteSet = SPRITES[direction];

  // Pick the right frame
  let sprite: number[][];
  if (!isWalking || isDead) {
    sprite = spriteSet.idle;
  } else {
    sprite = frame % 2 === 0 ? spriteSet.walk1 : spriteSet.walk2;
  }

  // Apply hat
  sprite = applyHat(sprite, hatStyle);

  // Draw shadow first
  drawCharacterShadow(ctx, x, y, scale);

  // Render the sprite
  renderSprite(ctx, x, y, sprite, colors, isDead, scale);

  // Draw X eyes if dead
  if (isDead) {
    drawDeadEyes(ctx, x, y, direction, scale);
  }

  // Selection indicator
  if (isSelected) {
    drawSelectionIndicator(ctx, x, y, scale, frame);
  }
}
