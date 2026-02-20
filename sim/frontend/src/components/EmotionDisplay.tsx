'use client';

import type { EmotionalState } from '@/lib/types';

interface EmotionDisplayProps {
  emotions: EmotionalState;
  compact?: boolean;
}

const EMOTION_CONFIG: { key: keyof EmotionalState; label: string; color: string; emoji: string }[] = [
  { key: 'happiness', label: 'Happy', color: 'bg-neon-green', emoji: '😊' },
  { key: 'anger', label: 'Anger', color: 'bg-neon-red', emoji: '😠' },
  { key: 'fear', label: 'Fear', color: 'bg-neon-purple', emoji: '😨' },
  { key: 'trust', label: 'Trust', color: 'bg-neon-cyan', emoji: '🤝' },
  { key: 'surprise', label: 'Surprise', color: 'bg-neon-gold', emoji: '😲' },
  { key: 'disgust', label: 'Disgust', color: 'bg-neon-orange', emoji: '🤢' },
  { key: 'sadness', label: 'Sad', color: 'bg-neon-blue', emoji: '😢' },
];

export function getDominantEmotion(emotions: EmotionalState): { key: keyof EmotionalState; label: string; color: string; emoji: string } {
  let best = EMOTION_CONFIG[0];
  let bestVal = -1;
  for (const cfg of EMOTION_CONFIG) {
    if (emotions[cfg.key] > bestVal) {
      bestVal = emotions[cfg.key];
      best = cfg;
    }
  }
  return best;
}

export function getMoodColor(emotions: EmotionalState): string {
  const dominant = getDominantEmotion(emotions);
  const colorMap: Record<string, string> = {
    'bg-neon-green': '#00ff88',
    'bg-neon-red': '#ff3366',
    'bg-neon-purple': '#aa44ff',
    'bg-neon-cyan': '#00f0ff',
    'bg-neon-gold': '#ffd700',
    'bg-neon-orange': '#ff8844',
    'bg-neon-blue': '#4488ff',
  };
  return colorMap[dominant.color] || '#00f0ff';
}

export default function EmotionDisplay({ emotions, compact = false }: EmotionDisplayProps) {
  if (compact) {
    const dominant = getDominantEmotion(emotions);
    return (
      <span className="text-xs" title={dominant.label}>
        {dominant.emoji}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {EMOTION_CONFIG.map(({ key, label, color }) => {
        const val = emotions[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-14 uppercase tracking-wider">{label}</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color} transition-all duration-500`}
                style={{ width: `${val * 100}%`, opacity: 0.75 }}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono w-8 text-right">
              {(val * 100).toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
