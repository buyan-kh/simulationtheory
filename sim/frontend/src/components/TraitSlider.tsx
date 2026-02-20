'use client';

interface TraitSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
  readOnly?: boolean;
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

export default function TraitSlider({ label, value, onChange, color = 'cyan', readOnly = false }: TraitSliderProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const fill = COLOR_MAP[color] || color;

  return (
    <div className="flex items-center gap-2">
      <span className="font-pixel text-pixel-text-dim w-24 truncate uppercase" style={{ fontSize: '7px' }}>{label}</span>
      <div className="flex-1 relative">
        <div className="pixel-bar-container" style={{ height: '10px' }}>
          <div className="pixel-bar-fill" style={{ width: `${pct}%`, background: fill }} />
        </div>
        {!readOnly && (
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(pct)}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        )}
      </div>
      <span className="font-pixel w-8 text-right" style={{ fontSize: '7px', color: fill }}>
        {Math.round(pct)}
      </span>
    </div>
  );
}
