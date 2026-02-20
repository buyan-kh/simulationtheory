'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { Character, Location, ChatMessage } from '@/lib/types';
import { getMoodColor } from './EmotionDisplay';
import ChatBubble from './ChatBubble';

interface WorldViewProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  chatMessages: ChatMessage[];
  currentTick: number;
}

// World coordinate range: -120 to 120 maps to pixel space
const WORLD_SIZE = 1200; // total pixel size of the town map
const COORD_RANGE = 240; // -120 to 120

// Character colors by index
const CHAR_COLORS = [
  '#00e5ff', '#ff00aa', '#00ff88', '#ffd700',
  '#ff3366', '#4488ff', '#aa44ff', '#ff8844',
];

// Building class for each location type
const BUILDING_CLASS: Record<string, string> = {
  trade: 'building-shop',
  market: 'building-shop',
  conflict: 'building-arena',
  arena: 'building-arena',
  diplomacy: 'building-council',
  council: 'building-council',
  exploration: 'building-wilderness',
  wilderness: 'building-wilderness',
  knowledge: 'building-library',
  library: 'building-library',
};

// Decorative elements around the town
interface Decoration {
  type: 'tree' | 'pine' | 'lamp' | 'rock' | 'fence' | 'flowers';
  x: number;
  y: number;
}

// Seeded random for consistent decoration placement
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateDecorations(): Decoration[] {
  const rng = seededRandom(42);
  const decorations: Decoration[] = [];

  // Trees scattered around the edges and between buildings
  for (let i = 0; i < 35; i++) {
    decorations.push({
      type: rng() > 0.5 ? 'tree' : 'pine',
      x: rng() * WORLD_SIZE,
      y: rng() * WORLD_SIZE,
    });
  }

  // Lamp posts along paths
  const lampPositions = [
    [520, 560], [680, 560], [560, 440], [560, 680],
    [420, 480], [780, 480], [480, 380], [480, 720],
    [360, 360], [840, 360], [360, 760], [840, 760],
  ];
  for (const [lx, ly] of lampPositions) {
    decorations.push({ type: 'lamp', x: lx, y: ly });
  }

  // Rocks
  for (let i = 0; i < 12; i++) {
    decorations.push({
      type: 'rock',
      x: rng() * WORLD_SIZE,
      y: rng() * WORLD_SIZE,
    });
  }

  // Flower patches
  for (let i = 0; i < 6; i++) {
    decorations.push({
      type: 'flowers',
      x: 200 + rng() * 800,
      y: 200 + rng() * 800,
    });
  }

  return decorations;
}

const DECORATIONS = generateDecorations();

function worldToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: ((x + 120) / COORD_RANGE) * WORLD_SIZE,
    py: ((y + 120) / COORD_RANGE) * WORLD_SIZE,
  };
}

// Track previous positions for walking animation
const prevPositions: Record<string, { x: number; y: number }> = {};

export default function WorldView({
  characters,
  locations,
  selectedCharacterId,
  onSelectCharacter,
  chatMessages,
  currentTick,
}: WorldViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const [centered, setCentered] = useState(false);

  const chars = Object.values(characters);
  const charIds = Object.keys(characters);
  const recentMessages = chatMessages.filter((m) => currentTick - m.tick <= 2);

  // Center the map on load
  useEffect(() => {
    if (!centered && containerRef.current) {
      const el = containerRef.current;
      el.scrollLeft = (WORLD_SIZE - el.clientWidth) / 2;
      el.scrollTop = (WORLD_SIZE - el.clientHeight) / 2;
      setCentered(true);
    }
  }, [centered]);

  // Center on selected character
  useEffect(() => {
    if (selectedCharacterId && containerRef.current && characters[selectedCharacterId]) {
      const char = characters[selectedCharacterId];
      const { px, py } = worldToPixel(char.position.x, char.position.y);
      const el = containerRef.current;
      el.scrollTo({
        left: px - el.clientWidth / 2,
        top: py - el.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedCharacterId, characters]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.char-clickable')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      x: containerRef.current?.scrollLeft || 0,
      y: containerRef.current?.scrollTop || 0,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    containerRef.current.scrollLeft = scrollStart.x - (e.clientX - dragStart.x);
    containerRef.current.scrollTop = scrollStart.y - (e.clientY - dragStart.y);
  }, [isDragging, dragStart, scrollStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="town-map w-full h-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={mapRef}
        className="relative"
        style={{ width: WORLD_SIZE, height: WORLD_SIZE }}
      >
        {/* Grid overlay */}
        <div className="town-map-grid" />

        {/* Path tiles connecting locations */}
        <PathNetwork locations={locations} />

        {/* Decorative elements */}
        {DECORATIONS.map((dec, i) => (
          <div
            key={`dec-${i}`}
            className={`absolute ${
              dec.type === 'tree' ? 'pixel-tree animate-tree-sway' :
              dec.type === 'pine' ? 'pixel-tree-pine' :
              dec.type === 'lamp' ? 'pixel-lamp' :
              dec.type === 'rock' ? 'pixel-rock' :
              dec.type === 'flowers' ? 'tile-flowers' :
              'pixel-fence'
            }`}
            style={{
              left: dec.x,
              top: dec.y,
              zIndex: dec.type === 'lamp' ? 3 : 1,
              ...(dec.type === 'flowers' ? { width: 48, height: 48, borderRadius: '50%' } : {}),
              animationDelay: dec.type === 'tree' ? `${i * 0.3}s` : undefined,
            }}
          />
        ))}

        {/* Buildings at locations */}
        {locations.map((loc) => {
          const { px, py } = worldToPixel(loc.x, loc.y);
          const buildingClass = BUILDING_CLASS[loc.type] || BUILDING_CLASS[loc.name.toLowerCase()] || 'building-shop';

          return (
            <div
              key={loc.name}
              className="absolute"
              style={{
                left: px - 48,
                top: py - 48,
                zIndex: 4,
              }}
            >
              <div className={buildingClass} />
              <div className="building-label">{loc.name}</div>
            </div>
          );
        })}

        {/* Relationship lines (SVG overlay) */}
        {selectedCharacterId && characters[selectedCharacterId] && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: WORLD_SIZE, height: WORLD_SIZE, zIndex: 5 }}
          >
            {chars.map((c) => {
              if (c.id === selectedCharacterId) return null;
              const selectedChar = characters[selectedCharacterId];
              const rel = selectedChar.relationships[c.id];
              if (rel === undefined || rel === 0) return null;
              const from = worldToPixel(selectedChar.position.x, selectedChar.position.y);
              const to = worldToPixel(c.position.x, c.position.y);
              const isPositive = rel > 0;
              const strength = Math.min(1, Math.abs(rel));
              return (
                <line
                  key={`rel-${c.id}`}
                  x1={from.px}
                  y1={from.py}
                  x2={to.px}
                  y2={to.py}
                  stroke={isPositive ? '#00ff88' : '#ff3366'}
                  strokeWidth={1 + strength * 2}
                  strokeDasharray={isPositive ? 'none' : '6,4'}
                  opacity={0.3 + strength * 0.4}
                />
              );
            })}
          </svg>
        )}

        {/* Characters */}
        {chars.map((c) => {
          const { px, py } = worldToPixel(c.position.x, c.position.y);
          const charIndex = charIds.indexOf(c.id);
          const color = CHAR_COLORS[charIndex % CHAR_COLORS.length];
          const moodColor = getMoodColor(c.emotional_state);
          const isSelected = c.id === selectedCharacterId;
          const isDead = !c.alive;

          // Detect movement for walking animation
          const prev = prevPositions[c.id];
          const isWalking = prev && (
            Math.abs(prev.x - c.position.x) > 0.5 ||
            Math.abs(prev.y - c.position.y) > 0.5
          );
          prevPositions[c.id] = { x: c.position.x, y: c.position.y };

          // Latest chat message for this character
          const charMessages = recentMessages.filter((m) => m.speaker_id === c.id);
          const latestMessage = charMessages[charMessages.length - 1];

          return (
            <div
              key={c.id}
              className="absolute char-clickable"
              style={{
                left: px - 16,
                top: py - 16,
                zIndex: isSelected ? 20 : 10,
                transition: 'left 0.8s ease-in-out, top 0.8s ease-in-out',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCharacter(c.id);
              }}
            >
              {/* Chat bubble */}
              {latestMessage && (
                <ChatBubble message={latestMessage} characterName={c.name} />
              )}

              {/* Character name */}
              <div className="char-name" style={{ color: isSelected ? '#ffd700' : '#d0d0e0' }}>
                {c.name}
              </div>

              {/* The character letter */}
              <div
                className={`char-letter ${isDead ? '' : isWalking ? 'char-letter-walking' : 'char-letter-idle'}`}
                style={{
                  background: isDead ? '#1a1a1a' : `${color}15`,
                  borderColor: isSelected ? '#ffd700' : color,
                  color: isDead ? '#666' : moodColor,
                  filter: isDead ? 'grayscale(100%)' : 'none',
                  opacity: isDead ? 0.4 : 1,
                  boxShadow: isSelected
                    ? `0 0 10px rgba(255,215,0,0.6), 2px 2px 0 0 rgba(0,0,0,0.5)`
                    : `2px 2px 0 0 rgba(0,0,0,0.5)`,
                }}
              >
                {isDead ? 'X' : c.name.charAt(0).toUpperCase()}
              </div>

              {/* Shadow under character */}
              <div className="char-shadow" />
            </div>
          );
        })}

        {/* Empty state */}
        {chars.length === 0 && locations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '16px', marginBottom: '8px' }}>
                🌌
              </div>
              <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>
                Empty world — add characters to begin
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Path network connecting locations with dirt path tiles */
function PathNetwork({ locations }: { locations: Location[] }) {
  if (locations.length < 2) return null;

  // Draw paths between all pairs of locations
  const paths: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const a = worldToPixel(locations[i].x, locations[i].y);
      const b = worldToPixel(locations[j].x, locations[j].y);
      // Only connect nearby locations (Manhattan distance < 700px)
      const dist = Math.abs(a.px - b.px) + Math.abs(a.py - b.py);
      if (dist < 700) {
        paths.push({ x1: a.px, y1: a.py, x2: b.px, y2: b.py });
      }
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: WORLD_SIZE, height: WORLD_SIZE, zIndex: 2 }}
    >
      {paths.map((p, i) => (
        <line
          key={`path-${i}`}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          stroke="#3a3020"
          strokeWidth={16}
          strokeLinecap="round"
          opacity={0.7}
        />
      ))}
      {/* Second pass: lighter center line for dirt path effect */}
      {paths.map((p, i) => (
        <line
          key={`path-center-${i}`}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          stroke="#4a4030"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="4,8"
          opacity={0.5}
        />
      ))}
    </svg>
  );
}
