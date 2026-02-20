'use client';

interface SimControlsProps {
  tick: number;
  isRunning: boolean;
  autoPlaySpeed: number;
  onStep: () => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenSettings: () => void;
  stepping: boolean;
}

export default function SimControls({
  tick,
  isRunning,
  autoPlaySpeed,
  onStep,
  onTogglePlay,
  onSpeedChange,
  onOpenSettings,
  stepping,
}: SimControlsProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 glass-strong rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Tick</span>
        <span className="text-sm font-mono font-bold text-neon-cyan text-glow-cyan">{tick}</span>
      </div>

      <div className="w-px h-5 bg-white/10" />

      <button
        onClick={onStep}
        disabled={isRunning || stepping}
        className="px-3 py-1.5 text-xs font-bold tracking-wider rounded-lg bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {stepping ? '...' : '▶ STEP'}
      </button>

      <button
        onClick={onTogglePlay}
        className={`px-3 py-1.5 text-xs font-bold tracking-wider rounded-lg transition-colors ${
          isRunning
            ? 'bg-neon-red/10 text-neon-red hover:bg-neon-red/20'
            : 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20'
        }`}
      >
        {isRunning ? '⏸ PAUSE' : '▶▶ PLAY'}
      </button>

      <div className="w-px h-5 bg-white/10" />

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">SPEED</span>
        <input
          type="range"
          min="200"
          max="3000"
          step="100"
          value={autoPlaySpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-20 h-1 appearance-none bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-cyan"
        />
        <span className="text-[10px] text-gray-500 font-mono w-10">{(autoPlaySpeed / 1000).toFixed(1)}s</span>
      </div>

      <div className="w-px h-5 bg-white/10" />

      <button
        onClick={onOpenSettings}
        className="p-1.5 text-gray-500 hover:text-neon-gold transition-colors rounded-lg hover:bg-white/5"
        title="Settings"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    </div>
  );
}
