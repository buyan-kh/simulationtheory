'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character, Location, ChatMessage, WorldItem } from '@/lib/types';
import { PixelRenderer, Sprite, getDayNightState } from '@/lib/sprites/renderer';
import { generateWorld, simToWorld, WORLD_SIZE, SCALE } from '@/lib/world';
import {
  drawCharacter,
  drawCharacterName,
  CHARACTER_PALETTES,
  type Direction,
  type HatStyle,
} from '@/lib/sprites/characters';
import { drawObject } from '@/lib/sprites/terrain';
import { InterpolationManager } from '@/lib/interpolation';
import Minimap from './Minimap';

interface PixelCanvasProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  onClickBuilding?: (buildingName: string) => void;
  chatMessages: ChatMessage[];
  currentTick: number;
  worldItems?: WorldItem[];
  autoPlaySpeed?: number;
}

const CHAR_SPRITE_W = 16 * SCALE;
const CHAR_SPRITE_H = 16 * SCALE;

const HAT_STYLES: HatStyle[] = ['none', 'wizard', 'warrior', 'hood', 'crown'];

function dirFromDelta(dx: number, dy: number, lastDir: Direction): Direction {
  if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return lastDir;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export default function PixelCanvas({
  characters,
  locations,
  selectedCharacterId,
  onSelectCharacter,
  onClickBuilding,
  chatMessages,
  currentTick,
  worldItems = [],
  autoPlaySpeed = 300,
}: PixelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);
  const hasCenteredRef = useRef(false);
  const interpRef = useRef(new InterpolationManager());
  const lastDirectionsRef = useRef(new Map<string, Direction>());

  // Update interpolation tick duration when speed changes
  useEffect(() => {
    interpRef.current.setTickDuration(autoPlaySpeed);
  }, [autoPlaySpeed]);

  // Feed new positions to interpolation manager
  useEffect(() => {
    interpRef.current.updateTargets(characters);
  }, [characters]);

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
  const onClickBuildingRef = useRef(onClickBuilding);
  onClickBuildingRef.current = onClickBuilding;

  useEffect(() => {
    rendererRef.current?.setClickHandler((id: string) => {
      if (id.startsWith('building:')) {
        const buildingName = id.slice('building:'.length);
        onClickBuildingRef.current?.(buildingName);
      } else {
        onSelectRef.current(id);
      }
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

  // Center on selected character (using interpolated position)
  useEffect(() => {
    if (selectedCharacterId && characters[selectedCharacterId]) {
      const pos = interpRef.current.getPosition(selectedCharacterId);
      const char = characters[selectedCharacterId];
      const sx = pos ? pos.x : char.position.x;
      const sy = pos ? pos.y : char.position.y;
      const { wx, wy } = simToWorld(sx, sy);
      rendererRef.current?.centerOn(wx * SCALE, wy * SCALE);
    }
  }, [selectedCharacterId, characters]);

  // Update day/night cycle on renderer
  useEffect(() => {
    rendererRef.current?.setDayNight(currentTick);
  }, [currentTick]);

  // Build character sprites — draw functions read interpolated positions at draw time
  const buildCharacterSprites = useCallback((): Sprite[] => {
    const sprites: Sprite[] = [];
    const charIds = Object.keys(characters);
    const recentMessages = chatMessages.filter((m) => currentTick - m.tick <= 2);
    const interp = interpRef.current;
    const lastDirs = lastDirectionsRef.current;

    for (const [id, char] of Object.entries(characters)) {
      // Use target position for sorting/culling (close enough)
      const { wx, wy } = simToWorld(char.position.x, char.position.y);
      const sortPx = wx * SCALE - CHAR_SPRITE_W / 2;
      const sortPy = wy * SCALE - CHAR_SPRITE_H;
      const charIndex = charIds.indexOf(id);
      const palette = CHARACTER_PALETTES[charIndex % CHARACTER_PALETTES.length];
      const hatStyle = HAT_STYLES[charIndex % HAT_STYLES.length];
      const selected = id === selectedCharacterId;

      // Check movement phase for car rendering
      const movePhase = (char.resources as Record<string, number>)?.['_move_phase'] ?? 0;
      const isDriving = movePhase === 2;

      sprites.push({
        x: sortPx,
        y: sortPy,
        width: isDriving ? 44 : CHAR_SPRITE_W,
        height: isDriving ? CHAR_SPRITE_H + 10 : CHAR_SPRITE_H,
        layer: 2,
        id,
        draw: (ctx: CanvasRenderingContext2D, _sx: number, _sy: number, frame: number) => {
          // Read interpolated position at draw time (called every render frame)
          const pos = interp.getPosition(id);
          const simX = pos ? pos.x : char.position.x;
          const simY = pos ? pos.y : char.position.y;
          const { wx: iwx, wy: iwy } = simToWorld(simX, simY);
          const px = iwx * SCALE - CHAR_SPRITE_W / 2;
          const py = iwy * SCALE - CHAR_SPRITE_H;

          // Direction from interpolation target delta
          const delta = interp.getDirection(id);
          const lastDir = lastDirs.get(id) || 'down';
          const dir = dirFromDelta(delta.dx, delta.dy, lastDir);
          lastDirs.set(id, dir);
          const walking = interp.isMoving(id);

          if (isDriving) {
            // Draw car underneath the character (they're riding in it)
            const carType = charIndex % 2 === 0 ? 'car_red' : 'car_blue';
            drawObject(ctx, px - 6, py + CHAR_SPRITE_H - 16, carType, 0, frame, SCALE);
            // Draw the character sitting in/on the car (slightly raised)
            drawCharacter(ctx, px, py - 4, palette, dir, frame, false, false, selected, hatStyle, SCALE);
            drawCharacterName(ctx, px, py - 4, char.name, selected, SCALE, false);
          } else {
            drawCharacter(ctx, px, py, palette, dir, frame, walking, !char.alive, selected, hatStyle, SCALE);
            drawCharacterName(ctx, px, py, char.name, selected, SCALE, !char.alive);
          }
        },
      });

      // Speech bubble — also uses interpolated position
      const charMessages = recentMessages.filter((m) => m.speaker_id === id);
      const latestMessage = charMessages[charMessages.length - 1];
      if (latestMessage) {
        const bubbleWidth = Math.min(latestMessage.content.length * 5 + 16, 140);
        const bubbleHeight = 20;

        sprites.push({
          x: sortPx + CHAR_SPRITE_W / 2 - bubbleWidth / 2,
          y: sortPy - bubbleHeight - 16,
          width: bubbleWidth,
          height: bubbleHeight + 6,
          layer: 3,
          draw: (ctx: CanvasRenderingContext2D) => {
            const pos = interp.getPosition(id);
            const simX = pos ? pos.x : char.position.x;
            const simY = pos ? pos.y : char.position.y;
            const { wx: iwx, wy: iwy } = simToWorld(simX, simY);
            const cpx = iwx * SCALE - CHAR_SPRITE_W / 2;
            const cpy = iwy * SCALE - CHAR_SPRITE_H;
            const bubbleX = cpx + CHAR_SPRITE_W / 2 - bubbleWidth / 2;
            const bubbleY = cpy - bubbleHeight - 16;

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

  // Build world item sprites
  const buildWorldItemSprites = useCallback((): Sprite[] => {
    const sprites: Sprite[] = [];

    for (const item of worldItems) {
      if (!item.pixels || item.pixels.length === 0) continue;
      if (item.placed_in_house) continue;

      const { wx, wy } = simToWorld(item.position.x, item.position.y);
      const itemScale = SCALE;
      const px = wx * SCALE - (item.width * itemScale) / 2;
      const py = wy * SCALE - (item.height * itemScale);

      sprites.push({
        x: px,
        y: py,
        width: item.width * itemScale,
        height: item.height * itemScale,
        layer: 1,
        draw: (ctx: CanvasRenderingContext2D) => {
          for (let row = 0; row < item.height; row++) {
            for (let col = 0; col < item.width; col++) {
              const color = item.pixels[row * item.width + col];
              if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(
                  px + col * itemScale,
                  py + row * itemScale,
                  itemScale,
                  itemScale,
                );
              }
            }
          }

          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          const labelW = item.name.length * 3.5 + 6;
          const labelX = px + (item.width * itemScale) / 2 - labelW / 2;
          const labelY = py - 8;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelW, 8, 2);
          ctx.fill();

          ctx.fillStyle = '#cccccc';
          ctx.font = '5px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.name, px + (item.width * itemScale) / 2, labelY + 6);
          ctx.textAlign = 'start';
        },
      });
    }

    return sprites;
  }, [worldItems]);

  // Build relationship lines (use interpolated positions)
  const buildRelationshipSprites = useCallback((): Sprite[] => {
    if (!selectedCharacterId || !characters[selectedCharacterId]) return [];
    const selected = characters[selectedCharacterId];
    const sprites: Sprite[] = [];
    const interp = interpRef.current;

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
          // Use interpolated positions for smooth line following
          const fromPos = interp.getPosition(selectedCharacterId!);
          const toPos = interp.getPosition(id);
          const fsx = fromPos ? fromPos.x : selected.position.x;
          const fsy = fromPos ? fromPos.y : selected.position.y;
          const tsx = toPos ? toPos.x : char.position.x;
          const tsy = toPos ? toPos.y : char.position.y;
          const f = simToWorld(fsx, fsy);
          const t = simToWorld(tsx, tsy);

          ctx.strokeStyle = isPositive ? '#00ff88' : '#ff3366';
          ctx.lineWidth = 1 + strength * 2;
          ctx.globalAlpha = 0.3 + strength * 0.4;
          if (!isPositive) ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(f.wx * SCALE, f.wy * SCALE);
          ctx.lineTo(t.wx * SCALE, t.wy * SCALE);
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
      ...buildWorldItemSprites(),
      ...buildRelationshipSprites(),
      ...buildCharacterSprites(),
    ];

    rendererRef.current?.setSprites(allSprites);
  }, [characters, locations, selectedCharacterId, chatMessages, currentTick, worldItems, buildCharacterSprites, buildRelationshipSprites, buildWorldItemSprites]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative bg-[#0a0a1a]">
      <canvas ref={canvasRef} className="block" />
      <Minimap
        characters={characters}
        locations={locations}
        selectedCharacterId={selectedCharacterId}
        rendererRef={rendererRef}
      />
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
