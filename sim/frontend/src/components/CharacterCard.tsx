'use client';

import type { Character } from '@/lib/types';
import { getMoodEmoji, getMoodColor } from './EmotionDisplay';
import ResourceBar from './ResourceBar';
import CharacterSprite from './CharacterSprite';

interface CharacterCardProps {
  character: Character;
  selected: boolean;
  onClick: () => void;
}

const RESOURCE_COLORS = ['cyan', 'gold', 'green', 'magenta', 'blue'];

export default function CharacterCard({ character, selected, onClick }: CharacterCardProps) {
  const resourceEntries = Object.entries(character.resources).slice(0, 3);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 pixel-panel transition-all ${
        selected ? 'glow-gold' : ''
      } ${!character.alive ? 'opacity-40' : ''}`}
      style={{
        borderColor: selected ? '#ffd700' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <CharacterSprite
          character={character}
          selected={selected}
          onClick={() => {}}
          compact
          showName={false}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-pixel-text truncate" style={{ fontSize: '8px' }}>
              {character.name}
            </span>
            <span style={{ fontSize: '10px' }}>{getMoodEmoji(character.emotional_state)}</span>
            {!character.alive && (
              <span className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#ff3366', color: '#ff3366' }}>
                DEAD
              </span>
            )}
          </div>

          {character.last_action && (
            <div className="mt-1">
              <span
                className="pixel-badge font-pixel"
                style={{
                  fontSize: '6px',
                  borderColor: getMoodColor(character.emotional_state),
                  color: getMoodColor(character.emotional_state),
                }}
              >
                {character.last_action.type}
              </span>
            </div>
          )}

          {resourceEntries.length > 0 && (
            <div className="mt-2 space-y-1">
              {resourceEntries.map(([key, val], i) => (
                <ResourceBar
                  key={key}
                  label={key}
                  value={val}
                  color={RESOURCE_COLORS[i % RESOURCE_COLORS.length]}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
