'use client';

import type { Character } from '@/lib/types';
import { getMoodColor, getMoodEmoji } from './EmotionDisplay';

interface CharacterSpriteProps {
  character: Character;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
  showName?: boolean;
}

const TRAIT_BORDER_COLORS: Record<string, string> = {
  openness: '#aa44ff',
  conscientiousness: '#00e5ff',
  extraversion: '#ffd700',
  agreeableness: '#00ff88',
  neuroticism: '#ff3366',
};

const ARCHETYPE_HAT_COLORS: Record<string, string> = {
  openness: '#aa44ff',
  conscientiousness: '#4488ff',
  extraversion: '#ff8844',
  agreeableness: '#00ff88',
  neuroticism: '#ff3366',
};

function getDominantTrait(traits: Character['traits']): string {
  let max = -1;
  let dominant = 'openness';
  for (const [key, val] of Object.entries(traits)) {
    if (val > max) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

export default function CharacterSprite({ character, selected, onClick, compact = false, showName = true }: CharacterSpriteProps) {
  const dominantTrait = getDominantTrait(character.traits);
  const borderColor = selected ? '#ffd700' : (TRAIT_BORDER_COLORS[dominantTrait] || '#4a4a8a');
  const hatColor = ARCHETYPE_HAT_COLORS[dominantTrait] || '#4a4a8a';
  const moodColor = getMoodColor(character.emotional_state);
  const size = compact ? 28 : 40;
  const isDead = !character.alive;

  return (
    <div
      className={`relative flex flex-col items-center cursor-pointer ${!isDead ? 'animate-pixel-float' : ''}`}
      onClick={onClick}
      style={{ width: size + 16 }}
    >
      <div
        className={`relative flex items-center justify-center ${selected ? 'animate-pixel-pulse' : ''}`}
        style={{
          width: size,
          height: size,
          background: isDead ? '#1a1a1a' : '#12122a',
          border: `3px solid ${borderColor}`,
          boxShadow: selected
            ? `0 0 8px rgba(255,215,0,0.5), inset 0 0 4px rgba(255,215,0,0.2), 2px 2px 0 0 rgba(0,0,0,0.4)`
            : `2px 2px 0 0 rgba(0,0,0,0.4)`,
          imageRendering: 'pixelated',
          filter: isDead ? 'grayscale(100%)' : 'none',
          opacity: isDead ? 0.5 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: compact ? 10 : 14,
            height: compact ? 5 : 6,
            background: hatColor,
            border: '1px solid rgba(0,0,0,0.3)',
          }}
        />

        {isDead ? (
          <span className="font-pixel text-neon-red" style={{ fontSize: compact ? '8px' : '12px' }}>X</span>
        ) : (
          <span className="font-pixel" style={{ fontSize: compact ? '8px' : '12px', color: moodColor }}>
            {character.name.charAt(0).toUpperCase()}
          </span>
        )}

        {!isDead && !compact && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              fontSize: '8px',
            }}
          >
            {getMoodEmoji(character.emotional_state)}
          </span>
        )}
      </div>

      {showName && (
        <span
          className="font-pixel text-pixel-text-dim text-center truncate mt-1"
          style={{
            fontSize: '6px',
            maxWidth: size + 16,
            color: selected ? '#ffd700' : undefined,
          }}
        >
          {character.name}
        </span>
      )}
    </div>
  );
}
