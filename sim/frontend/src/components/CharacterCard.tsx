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
        borderColor: selected ? '#c49a35' : undefined,
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
            {character.age !== undefined && (
              <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                {character.age}y
              </span>
            )}
            <span style={{ fontSize: '10px' }}>{getMoodEmoji(character.emotional_state)}</span>
            {character.group_role && (
              <span className="pixel-badge font-pixel" style={{ fontSize: '5px', borderColor: '#5a9aaa', color: '#5a9aaa' }}>
                {character.group_role === 'leader' ? '♛' : '⚑'}
              </span>
            )}
            {!character.alive && (
              <span className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#c4555a', color: '#c4555a' }}>
                DEAD
              </span>
            )}
          </div>

          {character.health !== undefined && character.alive && (
            <div className="mt-1 flex items-center gap-1">
              <span className="font-pixel" style={{ fontSize: '6px', color: character.health < 30 ? '#c4555a' : '#4a9a68' }}>HP</span>
              <div style={{ flex: 1, height: '3px', background: '#e8dfd2', border: '1px solid #c4b6a2' }}>
                <div style={{
                  width: `${Math.round(character.health)}%`,
                  height: '100%',
                  background: character.health < 30 ? '#c4555a' : character.health < 60 ? '#c48a40' : '#4a9a68',
                }} />
              </div>
            </div>
          )}

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
