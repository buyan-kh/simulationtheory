'use client';

import type { EmotionalState } from '@/lib/types';

interface EmotionDisplayProps {
  emotions: EmotionalState;
  compact?: boolean;
}

const EMOTION_CONFIG: Record<keyof EmotionalState, { color: string; emoji: string }> = {
  happiness: { color: '#00ff88', emoji: '😊' },
  anger: { color: '#ff3366', emoji: '😠' },
  fear: { color: '#aa44ff', emoji: '😨' },
  trust: { color: '#00e5ff', emoji: '🤝' },
  surprise: { color: '#ffd700', emoji: '😮' },
  disgust: { color: '#ff8844', emoji: '🤢' },
  sadness: { color: '#4488ff', emoji: '😢' },
};

export function getDominantEmotion(emotions: EmotionalState): keyof EmotionalState {
  let max = -1;
  let dominant: keyof EmotionalState = 'happiness';
  for (const [key, val] of Object.entries(emotions)) {
    if (val > max) {
      max = val;
      dominant = key as keyof EmotionalState;
    }
  }
  return dominant;
}

export function getMoodColor(emotions: EmotionalState): string {
  const dominant = getDominantEmotion(emotions);
  return EMOTION_CONFIG[dominant].color;
}

export function getMoodEmoji(emotions: EmotionalState): string {
  const dominant = getDominantEmotion(emotions);
  return EMOTION_CONFIG[dominant].emoji;
}

export default function EmotionDisplay({ emotions, compact = false }: EmotionDisplayProps) {
  if (compact) {
    const dominant = getDominantEmotion(emotions);
    const config = EMOTION_CONFIG[dominant];
    return (
      <span
        className="pixel-badge font-pixel"
        style={{ borderColor: config.color, color: config.color }}
      >
        {config.emoji} {dominant}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {(Object.keys(EMOTION_CONFIG) as (keyof EmotionalState)[]).map((key) => {
        const config = EMOTION_CONFIG[key];
        const val = emotions[key] ?? 0;
        const pct = Math.round(val * 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span style={{ fontSize: '10px' }}>{config.emoji}</span>
            <span className="font-pixel text-pixel-text-dim w-20 truncate uppercase" style={{ fontSize: '7px' }}>{key}</span>
            <div className="pixel-bar-container flex-1" style={{ height: '8px' }}>
              <div
                className="pixel-bar-fill"
                style={{ width: `${pct}%`, background: config.color }}
              />
            </div>
            <span className="font-pixel w-6 text-right" style={{ fontSize: '7px', color: config.color }}>
              {pct}
            </span>
          </div>
        );
      })}
    </div>
  );
}
