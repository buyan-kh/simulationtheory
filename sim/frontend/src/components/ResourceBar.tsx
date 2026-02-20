'use client';

interface ResourceBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  compact?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  cyan: '#00e5ff',
  gold: '#ffd700',
  green: '#00ff88',
  red: '#ff3366',
  blue: '#4488ff',
  magenta: '#ff00aa',
  purple: '#aa44ff',
  orange: '#ff8844',
};

export default function ResourceBar({ label, value, max = 100, color = 'cyan', compact = false }: ResourceBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = COLOR_MAP[color] || color;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-pixel text-pixel-text-dim w-16 truncate uppercase" style={{ fontSize: '7px' }}>{label}</span>
        <div className="pixel-bar-container flex-1" style={{ height: '8px' }}>
          <div className="pixel-bar-fill" style={{ width: `${pct}%`, background: fill }} />
        </div>
        <span className="font-pixel w-6 text-right" style={{ fontSize: '7px', color: fill }}>{Math.round(value)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '8px' }}>{label}</span>
        <span className="font-pixel" style={{ fontSize: '8px', color: fill }}>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="pixel-bar-container">
        <div className="pixel-bar-fill" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}
