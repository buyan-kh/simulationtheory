'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character, Location, ChatMessage } from '@/lib/types';
import { PixelRenderer, Sprite } from '@/lib/sprites/renderer';

interface PixelCanvasProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  chatMessages: ChatMessage[];
  currentTick: number;
}

// World: 80x80 tiles at 16px each = 1280x1280 pixel world
const TILE_SIZE = 16;
const WORLD_TILES = 80;
const WORLD_PX = WORLD_TILES * TILE_SIZE; // 1280
const COORD_RANGE = 240; // -120 to 120

// Character palette
const CHAR_COLORS = [
  '#00e5ff', '#ff00aa', '#00ff88', '#ffd700',
  '#ff3366', '#4488ff', '#aa44ff', '#ff8844',
];

// Building colors by location type
const BUILDING_COLORS: Record<string, string> = {
  trade: '#c8a040',
  market: '#c8a040',
  conflict: '#a03030',
  arena: '#a03030',
  diplomacy: '#3060a0',
  council: '#3060a0',
  exploration: '#307030',
  wilderness: '#307030',
  knowledge: '#7040a0',
  library: '#7040a0',
};

function worldToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: ((x + 120) / COORD_RANGE) * WORLD_PX,
    py: ((y + 120) / COORD_RANGE) * WORLD_PX,
  };
}

// Seeded random for consistent terrain/decoration generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function buildTerrainSprites(): Sprite[] {
  const sprites: Sprite[] = [];

  // Grass background tile
  sprites.push({
    x: 0,
    y: 0,
    width: WORLD_PX,
    height: WORLD_PX,
    layer: 0,
    draw: (ctx, sx, sy) => {
      // Base grass color
      ctx.fillStyle = '#2d5a1e';
      ctx.fillRect(sx, sy, WORLD_PX, WORLD_PX);

      // Grass texture variation
      const rng = seededRandom(123);
      ctx.fillStyle = '#346b22';
      for (let i = 0; i < 400; i++) {
        const gx = Math.floor(rng() * WORLD_TILES) * TILE_SIZE;
        const gy = Math.floor(rng() * WORLD_TILES) * TILE_SIZE;
        ctx.fillRect(sx + gx, sy + gy, TILE_SIZE, TILE_SIZE);
      }
      ctx.fillStyle = '#264f18';
      for (let i = 0; i < 200; i++) {
        const gx = Math.floor(rng() * WORLD_TILES) * TILE_SIZE;
        const gy = Math.floor(rng() * WORLD_TILES) * TILE_SIZE;
        ctx.fillRect(sx + gx, sy + gy, TILE_SIZE, TILE_SIZE);
      }
    },
  });

  // Scattered trees
  const rng = seededRandom(42);
  for (let i = 0; i < 40; i++) {
    const tx = Math.floor(rng() * WORLD_PX);
    const ty = Math.floor(rng() * WORLD_PX);
    sprites.push({
      x: tx - 8,
      y: ty - 20,
      width: 16,
      height: 24,
      layer: 1,
      draw: (ctx, sx, sy, frame) => {
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(sx + 6, sy + 14, 4, 10);
        // Foliage (slight sway based on frame + position)
        const sway = Math.sin((frame + i) * 0.5) * 1;
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(sx + 1 + sway, sy + 2, 14, 8);
        ctx.fillStyle = '#228b22';
        ctx.fillRect(sx + 3 + sway, sy, 10, 10);
        ctx.fillStyle = '#2aa52a';
        ctx.fillRect(sx + 5 + sway, sy - 2, 6, 6);
      },
    });
  }

  return sprites;
}

// Cache terrain sprites since they don't change
const cachedTerrainSprites = buildTerrainSprites();

function buildLocationSprites(locations: Location[]): Sprite[] {
  return locations.map((loc) => {
    const { px, py } = worldToPixel(loc.x, loc.y);
    const color = BUILDING_COLORS[loc.type] || BUILDING_COLORS[loc.name.toLowerCase()] || '#888888';
    const bw = 48;
    const bh = 48;

    return {
      x: px - bw / 2,
      y: py - bh / 2,
      width: bw,
      height: bh,
      layer: 1,
      draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number) => {
        // Building body
        ctx.fillStyle = color;
        ctx.fillRect(sx + 4, sy + 12, 40, 32);

        // Darker outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 4, sy + 12, 40, 32);

        // Roof (triangle)
        ctx.fillStyle = darkenColor(color, 0.3);
        ctx.beginPath();
        ctx.moveTo(sx, sy + 14);
        ctx.lineTo(sx + 24, sy);
        ctx.lineTo(sx + 48, sy + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Door
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(sx + 18, sy + 30, 12, 14);

        // Windows
        ctx.fillStyle = '#ffd86040';
        ctx.fillRect(sx + 8, sy + 18, 8, 8);
        ctx.fillRect(sx + 32, sy + 18, 8, 8);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(loc.name, sx + bw / 2, sy + bh + 10);
        ctx.textAlign = 'start';
      },
    };
  });
}

function buildCharacterSprites(
  characters: Record<string, Character>,
  selectedCharacterId: string | null,
  recentMessages: ChatMessage[],
): Sprite[] {
  const sprites: Sprite[] = [];
  const charIds = Object.keys(characters);

  for (const [id, char] of Object.entries(characters)) {
    const { px, py } = worldToPixel(char.position.x, char.position.y);
    const charIndex = charIds.indexOf(id);
    const color = CHAR_COLORS[charIndex % CHAR_COLORS.length];
    const isSelected = id === selectedCharacterId;
    const isDead = !char.alive;

    // Character sprite (32x32 centered on position)
    const cw = 32;
    const ch = 32;
    sprites.push({
      x: px - cw / 2,
      y: py - ch / 2,
      width: cw,
      height: ch,
      layer: 2,
      id,
      draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number, frame: number) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(sx + cw / 2, sy + ch - 2, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isDead) {
          // Dead character: gray X
          ctx.fillStyle = '#333333';
          ctx.fillRect(sx + 8, sy + 6, 16, 20);
          ctx.fillStyle = '#666666';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('X', sx + cw / 2, sy + 20);
          ctx.textAlign = 'start';
          return;
        }

        // Body (simple pixel character)
        const bobY = Math.sin(frame * 0.8 + charIndex) * 1;

        // Selection glow
        if (isSelected) {
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 8;
        }

        // Head
        ctx.fillStyle = '#ffd5b0';
        ctx.fillRect(sx + 11, sy + 4 + bobY, 10, 10);

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(sx + 9, sy + 14 + bobY, 14, 10);

        // Legs
        const walkOffset = Math.sin(frame * 1.5 + charIndex) * 2;
        ctx.fillStyle = darkenColor(color, 0.3);
        ctx.fillRect(sx + 10, sy + 24 + bobY, 4, 6);
        ctx.fillRect(sx + 18, sy + 24 + bobY + walkOffset * 0.3, 4, 6);

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(sx + 13, sy + 7 + bobY, 2, 2);
        ctx.fillRect(sx + 17, sy + 7 + bobY, 2, 2);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Name label
        ctx.fillStyle = isSelected ? '#ffd700' : '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(char.name, sx + cw / 2, sy - 2 + bobY);
        ctx.textAlign = 'start';
      },
    });

    // Speech bubble for recent messages
    const charMessages = recentMessages.filter((m) => m.speaker_id === id);
    const latestMessage = charMessages[charMessages.length - 1];
    if (latestMessage) {
      const bubbleWidth = Math.min(latestMessage.content.length * 5 + 16, 140);
      const bubbleHeight = 20;
      sprites.push({
        x: px - bubbleWidth / 2,
        y: py - ch / 2 - bubbleHeight - 12,
        width: bubbleWidth,
        height: bubbleHeight,
        layer: 3,
        draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number) => {
          // Bubble background
          ctx.fillStyle = latestMessage.is_thought ? 'rgba(100,100,180,0.85)' : 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.roundRect(sx, sy, bubbleWidth, bubbleHeight, 4);
          ctx.fill();

          // Bubble border
          ctx.strokeStyle = latestMessage.is_thought ? '#6666aa' : '#888888';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Pointer triangle
          ctx.fillStyle = latestMessage.is_thought ? 'rgba(100,100,180,0.85)' : 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.moveTo(sx + bubbleWidth / 2 - 4, sy + bubbleHeight);
          ctx.lineTo(sx + bubbleWidth / 2, sy + bubbleHeight + 6);
          ctx.lineTo(sx + bubbleWidth / 2 + 4, sy + bubbleHeight);
          ctx.closePath();
          ctx.fill();

          // Text
          ctx.fillStyle = latestMessage.is_thought ? '#ccccff' : '#222222';
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          const truncated =
            latestMessage.content.length > 24
              ? latestMessage.content.slice(0, 22) + '..'
              : latestMessage.content;
          ctx.fillText(truncated, sx + bubbleWidth / 2, sy + 13);
          ctx.textAlign = 'start';
        },
      });
    }
  }

  return sprites;
}

function buildRelationshipSprites(
  characters: Record<string, Character>,
  selectedCharacterId: string | null,
): Sprite[] {
  if (!selectedCharacterId || !characters[selectedCharacterId]) return [];

  const selected = characters[selectedCharacterId];
  const sprites: Sprite[] = [];

  for (const [id, char] of Object.entries(characters)) {
    if (id === selectedCharacterId) continue;
    const rel = selected.relationships[id];
    if (rel === undefined || rel === 0) continue;

    const from = worldToPixel(selected.position.x, selected.position.y);
    const to = worldToPixel(char.position.x, char.position.y);
    const isPositive = rel > 0;
    const strength = Math.min(1, Math.abs(rel));

    // Use the bounding box of the line
    const minX = Math.min(from.px, to.px);
    const minY = Math.min(from.py, to.py);
    const maxX = Math.max(from.px, to.px);
    const maxY = Math.max(from.py, to.py);

    sprites.push({
      x: minX,
      y: minY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
      layer: 1,
      draw: (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = isPositive ? '#00ff88' : '#ff3366';
        ctx.lineWidth = 1 + strength * 2;
        ctx.globalAlpha = 0.3 + strength * 0.4;
        if (!isPositive) {
          ctx.setLineDash([6, 4]);
        }
        ctx.beginPath();
        ctx.moveTo(from.px, from.py);
        ctx.lineTo(to.px, to.py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      },
    });
  }

  return sprites;
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amount))},${Math.floor(g * (1 - amount))},${Math.floor(b * (1 - amount))})`;
}

export default function PixelCanvas({
  characters,
  locations,
  selectedCharacterId,
  onSelectCharacter,
  chatMessages,
  currentTick,
}: PixelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);
  const hasCenteredRef = useRef(false);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new PixelRenderer(canvas);
    rendererRef.current = renderer;

    // Set initial size
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);

    // Default cursor
    canvas.style.cursor = 'grab';

    // Start render loop
    renderer.start();

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.setSize(width, height);
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Click handler
  const onSelectRef = useRef(onSelectCharacter);
  onSelectRef.current = onSelectCharacter;

  useEffect(() => {
    rendererRef.current?.setClickHandler((id: string) => {
      onSelectRef.current(id);
    });
  }, []);

  // Center on world on first data load
  useEffect(() => {
    if (!hasCenteredRef.current && Object.keys(characters).length > 0) {
      rendererRef.current?.centerOn(WORLD_PX / 2, WORLD_PX / 2);
      hasCenteredRef.current = true;
    }
  }, [characters]);

  // Center on selected character
  useEffect(() => {
    if (selectedCharacterId && characters[selectedCharacterId]) {
      const char = characters[selectedCharacterId];
      const { px, py } = worldToPixel(char.position.x, char.position.y);
      rendererRef.current?.centerOn(px, py);
    }
  }, [selectedCharacterId, characters]);

  // Rebuild sprites on state change
  const buildSprites = useCallback(() => {
    const recentMessages = chatMessages.filter((m) => currentTick - m.tick <= 2);

    const sprites: Sprite[] = [
      ...cachedTerrainSprites,
      ...buildLocationSprites(locations),
      ...buildRelationshipSprites(characters, selectedCharacterId),
      ...buildCharacterSprites(characters, selectedCharacterId, recentMessages),
    ];

    rendererRef.current?.setSprites(sprites);
  }, [characters, locations, selectedCharacterId, chatMessages, currentTick]);

  useEffect(() => {
    buildSprites();
  }, [buildSprites]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative">
      <canvas ref={canvasRef} className="block" />
      {Object.keys(characters).length === 0 && locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center font-mono text-gray-500 text-sm">
            Empty world — add characters to begin
          </div>
        </div>
      )}
    </div>
  );
}
