'use client';

import { getDayNightState } from '@/lib/sprites/renderer';

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

function TimeIndicator({ tick }: { tick: number }) {
  const state = getDayNightState(tick);
  const hour = state.hour;
  const hourStr = String(hour).padStart(2, '0') + ':00';

  // Icon and color based on time of day
  let icon: string;
  let color: string;
  let glowColor: string;
  switch (state.phase) {
    case 'night':
      icon = '\u263E'; // crescent moon
      color = '#8888cc';
      glowColor = 'rgba(136,136,204,0.4)';
      break;
    case 'dawn':
      icon = '\u2600'; // sun
      color = '#ffaa44';
      glowColor = 'rgba(255,170,68,0.4)';
      break;
    case 'day':
      icon = '\u2600'; // sun
      color = '#ffdd44';
      glowColor = 'rgba(255,221,68,0.4)';
      break;
    case 'dusk':
      icon = '\u2600'; // sun
      color = '#ff7744';
      glowColor = 'rgba(255,119,68,0.4)';
      break;
  }

  return (
    <div className="flex items-center gap-1.5" title={`${state.phase.toUpperCase()} - ${hourStr}`}>
      <span style={{ color, textShadow: `0 0 6px ${glowColor}`, fontSize: '12px' }}>{icon}</span>
      <span className="font-pixel" style={{ fontSize: '8px', color }}>{hourStr}</span>
      <span className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '7px' }}>{state.phase}</span>
    </div>
  );
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
  const tickStr = String(tick).padStart(3, '0');

  return (
    <div className="pixel-panel flex items-center gap-2 px-3 py-2">
      <div className="flex items-center gap-2 mr-2">
        <span className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '8px' }}>Tick:</span>
        <span className="font-pixel text-neon-cyan text-glow-cyan" style={{ fontSize: '12px' }}>{tickStr}</span>
      </div>

      <div className="pixel-divider w-px h-6 mx-1" style={{ width: '2px' }} />

      <TimeIndicator tick={tick} />

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
