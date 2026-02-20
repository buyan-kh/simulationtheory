'use client';

import type { Character } from '@/lib/types';
import { getDominantEmotion, getMoodColor } from './EmotionDisplay';
import ResourceBar from './ResourceBar';

interface CharacterCardProps {
  character: Character;
  selected: boolean;
  onClick: () => void;
}

const RESOURCE_COLORS = ['neon-cyan', 'neon-green', 'neon-gold', 'neon-magenta', 'neon-blue'];

export default function CharacterCard({ character, selected, onClick }: CharacterCardProps) {
  const dominant = getDominantEmotion(character.emotional_state);
  const moodColor = getMoodColor(character.emotional_state);
  const resourceEntries = Object.entries(character.resources).slice(0, 3);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
        selected
          ? 'glass-strong glow-border-cyan bg-neon-cyan/5'
          : 'glass hover:bg-white/5'
      } ${!character.alive ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, ${moodColor}22, ${moodColor}08)`,
            border: `1px solid ${moodColor}44`,
            boxShadow: selected ? `0 0 12px ${moodColor}33` : 'none',
          }}
        >
          {character.image_url ? (
            <img src={character.image_url} alt="" className="w-full h-full rounded-lg object-cover" />
          ) : (
            <span className="text-base">{character.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-200 truncate">{character.name}</span>
            <span className="text-xs" title={dominant.label}>{dominant.emoji}</span>
            {!character.alive && (
              <span className="text-[10px] text-neon-red uppercase tracking-wider">Dead</span>
            )}
          </div>

          {character.last_action && (
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">
              {character.last_action.type}
              {character.last_action.target_id && ` → ${character.last_action.target_id}`}
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
