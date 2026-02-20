'use client';

interface TraitSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
  readOnly?: boolean;
}

export default function TraitSlider({ label, value, onChange, color = 'neon-cyan', readOnly = false }: TraitSliderProps) {
  const colorStyles: Record<string, { bar: string; text: string }> = {
    'neon-cyan': { bar: 'bg-neon-cyan', text: 'text-neon-cyan' },
    'neon-magenta': { bar: 'bg-neon-magenta', text: 'text-neon-magenta' },
    'neon-green': { bar: 'bg-neon-green', text: 'text-neon-green' },
    'neon-gold': { bar: 'bg-neon-gold', text: 'text-neon-gold' },
    'neon-red': { bar: 'bg-neon-red', text: 'text-neon-red' },
    'neon-purple': { bar: 'bg-neon-purple', text: 'text-neon-purple' },
    'neon-orange': { bar: 'bg-neon-orange', text: 'text-neon-orange' },
    'neon-blue': { bar: 'bg-neon-blue', text: 'text-neon-blue' },
  };

  const style = colorStyles[color] || colorStyles['neon-cyan'];

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-mono ${style.text}`}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${style.bar} transition-all duration-300`}
          style={{ width: `${value * 100}%`, opacity: 0.8 }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${style.bar} blur-sm transition-all duration-300`}
          style={{ width: `${value * 100}%`, opacity: 0.4 }}
        />
      </div>
      {!readOnly && (
        <input
          type="range"
          min="0"
          max="100"
          value={value * 100}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="w-full h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,240,255,0.5)]"
        />
      )}
    </div>
  );
}
