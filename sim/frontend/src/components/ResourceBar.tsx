'use client';

interface ResourceBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  compact?: boolean;
}

export default function ResourceBar({ label, value, max = 100, color = 'neon-cyan', compact = false }: ResourceBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colorMap: Record<string, string> = {
    'neon-cyan': 'from-neon-cyan/80 to-neon-cyan/40',
    'neon-magenta': 'from-neon-magenta/80 to-neon-magenta/40',
    'neon-green': 'from-neon-green/80 to-neon-green/40',
    'neon-gold': 'from-neon-gold/80 to-neon-gold/40',
    'neon-red': 'from-neon-red/80 to-neon-red/40',
    'neon-blue': 'from-neon-blue/80 to-neon-blue/40',
  };

  const gradient = colorMap[color] || colorMap['neon-cyan'];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 w-12 truncate uppercase">{label}</span>
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{Math.round(value)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
