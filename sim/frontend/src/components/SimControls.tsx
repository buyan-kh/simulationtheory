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

const SPEEDS = [
  { label: '1x', value: 2000 },
  { label: '2x', value: 1000 },
  { label: '5x', value: 400 },
  { label: '10x', value: 200 },
];

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
  const tickStr = String(tick).padStart(3, '0');

  return (
    <div className="pixel-panel flex items-center gap-2 px-3 py-2">
      <div className="flex items-center gap-2 mr-2">
        <span className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '8px' }}>Tick:</span>
        <span className="font-pixel text-neon-cyan text-glow-cyan" style={{ fontSize: '12px' }}>{tickStr}</span>
      </div>

      <div className="pixel-divider w-px h-6 mx-1" style={{ width: '2px' }} />

      <button
        onClick={onStep}
        disabled={isRunning || stepping}
        className="pixel-btn pixel-btn-cyan"
        style={{ fontSize: '8px', padding: '6px 10px' }}
      >
        {stepping ? '...' : '▶ STEP'}
      </button>

      <button
        onClick={onTogglePlay}
        className={`pixel-btn ${isRunning ? 'pixel-btn-red' : 'pixel-btn-green'}`}
        style={{ fontSize: '8px', padding: '6px 10px' }}
      >
        {isRunning ? '⏸ STOP' : '▶▶ RUN'}
      </button>

      <div className="pixel-divider w-px h-6 mx-1" style={{ width: '2px' }} />

      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSpeedChange(s.value)}
            className={`pixel-btn ${autoPlaySpeed === s.value ? 'pixel-btn-gold' : ''}`}
            style={{ fontSize: '7px', padding: '4px 6px' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="pixel-divider w-px h-6 mx-1" style={{ width: '2px' }} />

      <button
        onClick={onOpenSettings}
        className="pixel-btn"
        style={{ fontSize: '8px', padding: '6px 8px' }}
        title="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
