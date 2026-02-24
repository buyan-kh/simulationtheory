'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character, Location } from '@/lib/types';
import type { PixelRenderer, Camera } from '@/lib/sprites/renderer';
import { simToWorld, WORLD_SIZE, SCALE } from '@/lib/world';
import { CHARACTER_PALETTES } from '@/lib/sprites/characters';
import { locationToBuildingType } from '@/lib/sprites/buildings';

interface MinimapProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  rendererRef: React.RefObject<PixelRenderer | null>;
}

const MINIMAP_SIZE = 150;

// Colors for terrain approximation
const TERRAIN_BG = '#1a3a1a';       // grass
const WATER_COLOR = '#1a3a6a';      // water
const ROAD_COLOR = '#5a5a6a';       // cobblestone
const SAND_COLOR = '#c2b280';       // sand

// Building colors by type
const BUILDING_COLORS: Record<string, string> = {
  shop: '#CCAA00',
  arena: '#CC3333',
  council: '#4444CC',
  library: '#8844CC',
  tavern: '#CC6633',
  well: '#6a6a7a',
  fountain: '#3a5a8a',
  house_small: '#8B6914',
  house_medium: '#9A7820',
  house_large: '#AA8830',
};

export default function Minimap({
  characters,
  locations,
  selectedCharacterId,
  rendererRef,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  // Convert world coordinates (in world-pixel * SCALE space) to minimap coordinates
  const worldToMinimap = useCallback((wx: number, wy: number) => {
    return {
      mx: (wx / WORLD_SIZE) * MINIMAP_SIZE,
      my: (wy / WORLD_SIZE) * MINIMAP_SIZE,
    };
  }, []);

  // Convert minimap coordinates to world coordinates (in world-pixel * SCALE space)
  const minimapToWorld = useCallback((mx: number, my: number) => {
    return {
      wx: (mx / MINIMAP_SIZE) * WORLD_SIZE,
      wy: (my / MINIMAP_SIZE) * WORLD_SIZE,
    };
  }, []);

  // Handle click/drag on minimap to pan camera
  const handleMinimapInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { wx, wy } = minimapToWorld(mx, my);
      renderer.centerOn(wx, wy);
    },
    [rendererRef, minimapToWorld]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.stopPropagation();
      isDraggingRef.current = true;
      handleMinimapInteraction(e);
    },
    [handleMinimapInteraction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();
      handleMinimapInteraction(e);
    },
    [handleMinimapInteraction]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const renderer = rendererRef.current;
      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // Background (terrain approximation)
      ctx.fillStyle = TERRAIN_BG;
      ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // Dark forest border
      const borderWidth = (8 / 80) * MINIMAP_SIZE; // 8 tiles out of 80
      ctx.fillStyle = '#0a2a0a';
      ctx.fillRect(0, 0, MINIMAP_SIZE, borderWidth);
      ctx.fillRect(0, MINIMAP_SIZE - borderWidth, MINIMAP_SIZE, borderWidth);
      ctx.fillRect(0, 0, borderWidth, MINIMAP_SIZE);
      ctx.fillRect(MINIMAP_SIZE - borderWidth, 0, borderWidth, MINIMAP_SIZE);

      // River (approximate: column 55 out of 80 tiles, 3 tiles wide)
      const riverX = (55 / 80) * MINIMAP_SIZE;
      const riverW = (3 / 80) * MINIMAP_SIZE;
      ctx.fillStyle = WATER_COLOR;
      ctx.fillRect(riverX - riverW / 2, 0, riverW, MINIMAP_SIZE);

      // Sand banks
      ctx.fillStyle = SAND_COLOR;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(riverX - riverW / 2 - 2, 0, 2, MINIMAP_SIZE);
      ctx.fillRect(riverX + riverW / 2, 0, 2, MINIMAP_SIZE);
      ctx.globalAlpha = 1;

      // Roads between locations
      if (locations.length > 0) {
        ctx.strokeStyle = ROAD_COLOR;
        ctx.lineWidth = 1;
        const locMiniPos = locations.map((l) => {
          const { wx, wy } = simToWorld(l.x, l.y);
          return worldToMinimap(wx * SCALE, wy * SCALE);
        });

        // Connect each to center (first location)
        const center = locMiniPos[0];
        for (let i = 1; i < locMiniPos.length; i++) {
          const target = locMiniPos[i];
          ctx.beginPath();
          ctx.moveTo(center.mx, center.my);
          ctx.lineTo(target.mx, center.my);
          ctx.lineTo(target.mx, target.my);
          ctx.stroke();
        }
      }

      // Buildings (locations)
      for (const loc of locations) {
        const { wx, wy } = simToWorld(loc.x, loc.y);
        const { mx, my } = worldToMinimap(wx * SCALE, wy * SCALE);
        const bType = locationToBuildingType(loc.type, loc.name);
        ctx.fillStyle = BUILDING_COLORS[bType] || '#6a6a7a';
        const bw = 5;
        const bh = 4;
        ctx.fillRect(mx - bw / 2, my - bh / 2, bw, bh);
        // Dark outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(mx - bw / 2, my - bh / 2, bw, bh);
      }

      // Characters
      const charIds = Object.keys(characters);
      for (const [id, char] of Object.entries(characters)) {
        const { wx, wy } = simToWorld(char.position.x, char.position.y);
        const { mx, my } = worldToMinimap(wx * SCALE, wy * SCALE);
        const charIndex = charIds.indexOf(id);
        const palette = CHARACTER_PALETTES[charIndex % CHARACTER_PALETTES.length];

        const isSelected = id === selectedCharacterId;
        const dotSize = isSelected ? 3 : 2;

        // Pulsing ring for selected character
        if (isSelected) {
          const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Character dot
        ctx.fillStyle = palette.shirt;
        ctx.beginPath();
        ctx.arc(mx, my, dotSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright outline for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Viewport rectangle
      if (renderer) {
        const camera = renderer.getCamera();
        const viewport = renderer.getViewportSize();

        // Calculate the viewport bounds in world coordinates
        const halfW = (viewport.width / 2) / camera.zoom;
        const halfH = (viewport.height / 2) / camera.zoom;

        const topLeft = worldToMinimap(camera.x - halfW, camera.y - halfH);
        const bottomRight = worldToMinimap(camera.x + halfW, camera.y + halfH);

        const vw = bottomRight.mx - topLeft.mx;
        const vh = bottomRight.my - topLeft.my;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(topLeft.mx, topLeft.my, vw, vh);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [characters, locations, selectedCharacterId, rendererRef, worldToMinimap]);

  return (
    <canvas
      ref={canvasRef}
      width={MINIMAP_SIZE}
      height={MINIMAP_SIZE}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
        borderRadius: 6,
        border: '2px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.6)',
        cursor: 'crosshair',
        zIndex: 10,
      }}
    />
  );
}
