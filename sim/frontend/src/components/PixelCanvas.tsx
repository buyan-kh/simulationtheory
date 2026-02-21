'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character, Location, ChatMessage } from '@/lib/types';
import { PixelRenderer, Sprite } from '@/lib/sprites/renderer';
import { generateWorld, simToWorld, WORLD_SIZE, SCALE } from '@/lib/world';
import {
  drawCharacter,
  drawCharacterName,
  CHARACTER_PALETTES,
  type Direction,
  type HatStyle,
} from '@/lib/sprites/characters';

interface PixelCanvasProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  chatMessages: ChatMessage[];
  currentTick: number;
}

const CHAR_SPRITE_W = 16 * SCALE;
const CHAR_SPRITE_H = 16 * SCALE;

const HAT_STYLES: HatStyle[] = ['none', 'wizard', 'warrior', 'hood', 'crown'];

function getDirection(char: Character, prevPositions: Map<string, { x: number; y: number }>): Direction {
  const prev = prevPositions.get(char.id);
  if (!prev) return 'down';
  const dx = char.position.x - prev.x;
  const dy = char.position.y - prev.y;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return 'down';
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

function isWalking(char: Character, prevPositions: Map<string, { x: number; y: number }>): boolean {
  const prev = prevPositions.get(char.id);
  if (!prev) return false;
  return Math.abs(char.position.x - prev.x) > 0.1 || Math.abs(char.position.y - prev.y) > 0.1;
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
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new PixelRenderer(canvas);
    rendererRef.current = renderer;

    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    canvas.style.cursor = 'grab';
    renderer.start();

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
      rendererRef.current?.centerOn(WORLD_SIZE / 2, WORLD_SIZE / 2);
      rendererRef.current?.setCamera(WORLD_SIZE / 2, WORLD_SIZE / 2, 0.8);
      hasCenteredRef.current = true;
    }
  }, [characters]);

  // Center on selected character
  useEffect(() => {
    if (selectedCharacterId && characters[selectedCharacterId]) {
      const char = characters[selectedCharacterId];
      const { wx, wy } = simToWorld(char.position.x, char.position.y);
      rendererRef.current?.centerOn(wx * SCALE, wy * SCALE);
    }
  }, [selectedCharacterId, characters]);

  // Build character sprites
  const buildCharacterSprites = useCallback((): Sprite[] => {
    const sprites: Sprite[] = [];
    const charIds = Object.keys(characters);
    const recentMessages = chatMessages.filter((m) => currentTick - m.tick <= 2);
    const prevPositions = prevPositionsRef.current;

    for (const [id, char] of Object.entries(characters)) {
      const { wx, wy } = simToWorld(char.position.x, char.position.y);
      const px = wx * SCALE - CHAR_SPRITE_W / 2;
      const py = wy * SCALE - CHAR_SPRITE_H;
      const charIndex = charIds.indexOf(id);
      const palette = CHARACTER_PALETTES[charIndex % CHARACTER_PALETTES.length];
      const hatStyle = HAT_STYLES[charIndex % HAT_STYLES.length];
      const dir = getDirection(char, prevPositions);
      const walking = isWalking(char, prevPositions);
      const selected = id === selectedCharacterId;

      sprites.push({
        x: px,
        y: py,
        width: CHAR_SPRITE_W,
        height: CHAR_SPRITE_H,
        layer: 2,
        id,
        draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
          drawCharacter(ctx, px, py, palette, dir, frame, walking, !char.alive, selected, hatStyle, SCALE);
          drawCharacterName(ctx, px, py, char.name, selected, SCALE);
        },
      });

      // Speech bubble
      const charMessages = recentMessages.filter((m) => m.speaker_id === id);
      const latestMessage = charMessages[charMessages.length - 1];
      if (latestMessage) {
        const bubbleWidth = Math.min(latestMessage.content.length * 5 + 16, 140);
        const bubbleHeight = 20;
        const bubbleX = px + CHAR_SPRITE_W / 2 - bubbleWidth / 2;
        const bubbleY = py - bubbleHeight - 16;

        sprites.push({
          x: bubbleX,
          y: bubbleY,
          width: bubbleWidth,
          height: bubbleHeight + 6,
          layer: 3,
          draw: (ctx: CanvasRenderingContext2D) => {
            const isThought = latestMessage.is_thought;
            ctx.fillStyle = isThought ? 'rgba(80,80,160,0.85)' : 'rgba(255,255,255,0.92)';
            ctx.beginPath();
            ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 4);
            ctx.fill();

            ctx.strokeStyle = isThought ? '#6666aa' : '#aaaaaa';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Pointer
            ctx.fillStyle = isThought ? 'rgba(80,80,160,0.85)' : 'rgba(255,255,255,0.92)';
            ctx.beginPath();
            ctx.moveTo(bubbleX + bubbleWidth / 2 - 4, bubbleY + bubbleHeight);
            ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 5);
            ctx.lineTo(bubbleX + bubbleWidth / 2 + 4, bubbleY + bubbleHeight);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = isThought ? '#ccccff' : '#222222';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            const truncated = latestMessage.content.length > 24
              ? latestMessage.content.slice(0, 22) + '..'
              : latestMessage.content;
            ctx.fillText(truncated, bubbleX + bubbleWidth / 2, bubbleY + 13);
            ctx.textAlign = 'start';
          },
        });
      }
    }

    return sprites;
  }, [characters, selectedCharacterId, chatMessages, currentTick]);

  // Build relationship lines
  const buildRelationshipSprites = useCallback((): Sprite[] => {
    if (!selectedCharacterId || !characters[selectedCharacterId]) return [];
    const selected = characters[selectedCharacterId];
    const sprites: Sprite[] = [];

    for (const [id, char] of Object.entries(characters)) {
      if (id === selectedCharacterId) continue;
      const rel = selected.relationships[id];
      if (rel === undefined || rel === 0) continue;

      const from = simToWorld(selected.position.x, selected.position.y);
      const to = simToWorld(char.position.x, char.position.y);
      const isPositive = rel > 0;
      const strength = Math.min(1, Math.abs(rel));

      const minX = Math.min(from.wx, to.wx) * SCALE;
      const minY = Math.min(from.wy, to.wy) * SCALE;
      const maxX = Math.max(from.wx, to.wx) * SCALE;
      const maxY = Math.max(from.wy, to.wy) * SCALE;

      sprites.push({
        x: minX,
        y: minY,
        width: (maxX - minX) || 1,
        height: (maxY - minY) || 1,
        layer: 1,
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.strokeStyle = isPositive ? '#00ff88' : '#ff3366';
          ctx.lineWidth = 1 + strength * 2;
          ctx.globalAlpha = 0.3 + strength * 0.4;
          if (!isPositive) ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(from.wx * SCALE, from.wy * SCALE);
          ctx.lineTo(to.wx * SCALE, to.wy * SCALE);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        },
      });
    }

    return sprites;
  }, [characters, selectedCharacterId]);

  // Rebuild all sprites when state changes
  useEffect(() => {
    const charCount = Object.keys(characters).length;
    const world = generateWorld(locations, charCount);

    const allSprites: Sprite[] = [
      ...world.terrainSprites,
      ...world.decorationSprites,
      ...world.houseSprites,
      ...world.locationSprites,
      ...buildRelationshipSprites(),
      ...buildCharacterSprites(),
    ];

    rendererRef.current?.setSprites(allSprites);

    // Track previous positions for direction detection
    const prev = prevPositionsRef.current;
    for (const [id, char] of Object.entries(characters)) {
      prev.set(id, { x: char.position.x, y: char.position.y });
    }
  }, [characters, locations, selectedCharacterId, chatMessages, currentTick, buildCharacterSprites, buildRelationshipSprites]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative bg-[#0a0a1a]">
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
