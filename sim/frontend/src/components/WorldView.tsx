'use client';

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

const LOCATION_ICONS: Record<string, string> = {
  trade: '🏪',
  market: '🏪',
  conflict: '⚔',
  arena: '⚔',
  diplomacy: '🏛',
  council: '🏛',
  exploration: '🌲',
  wilderness: '🌲',
  knowledge: '📚',
  library: '📚',
};

const LOCATION_TILES: Record<string, string> = {
  trade: 'tile-market',
  market: 'tile-market',
  conflict: 'tile-arena',
  arena: 'tile-arena',
  diplomacy: 'tile-stone',
  council: 'tile-stone',
  exploration: 'tile-grass',
  wilderness: 'tile-grass',
  knowledge: 'tile-library',
  library: 'tile-library',
};

const WORLD_W = 600;
const WORLD_H = 400;

function worldToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: (x / 100) * WORLD_W + WORLD_W / 2,
    py: (y / 100) * WORLD_H + WORLD_H / 2,
  };
}

export default function WorldView({
  characters,
  locations,
  selectedCharacterId,
  onSelectCharacter,
  chatMessages,
  currentTick,
}: WorldViewProps) {
  const chars = Object.values(characters);
  const selectedChar = selectedCharacterId ? characters[selectedCharacterId] : null;
  const recentMessages = chatMessages.filter((m) => currentTick - m.tick <= 2);

  return (
    <div
      className="pixel-panel w-full h-full overflow-auto relative"
      style={{
        background: '#0a0a1a',
        backgroundImage:
          'linear-gradient(rgba(42,42,90,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(42,42,90,0.15) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      <div
        className="relative"
        style={{ width: WORLD_W, height: WORLD_H, margin: '0 auto' }}
      >
        {locations.map((loc) => {
          const { px, py } = worldToPixel(loc.x, loc.y);
          const tileClass = LOCATION_TILES[loc.type] || LOCATION_TILES[loc.name.toLowerCase()] || 'tile-grass';
          const icon = LOCATION_ICONS[loc.type] || LOCATION_ICONS[loc.name.toLowerCase()] || '📍';

          return (
            <div
              key={loc.name}
              className={`absolute ${tileClass}`}
              style={{
                left: px - 40,
                top: py - 30,
                width: 80,
                height: 60,
                border: '2px solid #2a2a5a',
                boxShadow: '2px 2px 0 0 rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: '16px' }}>{icon}</span>
              <span
                className="font-pixel text-pixel-text-dim text-center"
                style={{ fontSize: '6px', marginTop: '2px' }}
              >
                {loc.name}
              </span>
            </div>
          );
        })}

        {selectedChar && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: WORLD_W, height: WORLD_H, zIndex: 2 }}
          >
            {chars.map((c) => {
              if (c.id === selectedCharacterId) return null;
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
                  strokeDasharray={isPositive ? 'none' : '4,4'}
                  opacity={0.4 + strength * 0.3}
                />
              );
            })}
          </svg>
        )}

        {chars.map((c) => {
          const { px, py } = worldToPixel(c.position.x, c.position.y);
          const moodColor = getMoodColor(c.emotional_state);
          const isSelected = c.id === selectedCharacterId;
          const isDead = !c.alive;
          const charMessages = recentMessages.filter((m) => m.speaker_id === c.id);
          const latestMessage = charMessages[charMessages.length - 1];

          return (
            <div
              key={c.id}
              className="absolute cursor-pointer"
              style={{
                left: px - 20,
                top: py - 20,
                width: 40,
                height: 40,
                transition: 'left 0.5s ease, top 0.5s ease',
                zIndex: isSelected ? 10 : 5,
              }}
              onClick={() => onSelectCharacter(c.id)}
            >
              {latestMessage && (
                <ChatBubble message={latestMessage} characterName={c.name} />
              )}

              <div
                className={`relative w-full h-full flex items-center justify-center ${isDead ? '' : 'animate-pixel-float'}`}
                style={{
                  background: isDead ? '#1a1a1a' : '#12122a',
                  border: `3px solid ${isSelected ? '#ffd700' : moodColor}`,
                  boxShadow: isSelected
                    ? `0 0 10px rgba(255,215,0,0.5), 2px 2px 0 0 rgba(0,0,0,0.4)`
                    : `2px 2px 0 0 rgba(0,0,0,0.4)`,
                  imageRendering: 'pixelated',
                  filter: isDead ? 'grayscale(100%)' : 'none',
                  opacity: isDead ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12,
                    height: 5,
                    background: moodColor,
                    border: '1px solid rgba(0,0,0,0.3)',
                  }}
                />
                {isDead ? (
                  <span className="font-pixel text-neon-red" style={{ fontSize: '10px' }}>X</span>
                ) : (
                  <span className="font-pixel" style={{ fontSize: '10px', color: moodColor }}>
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div
                className="font-pixel text-center truncate"
                style={{
                  fontSize: '6px',
                  color: isSelected ? '#ffd700' : '#6a6a8a',
                  marginTop: '2px',
                  width: '100%',
                }}
              >
                {c.name}
              </div>
            </div>
          );
        })}

        {chars.length === 0 && locations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '16px', marginBottom: '8px' }}>🌌</div>
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
