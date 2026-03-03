'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ReplayControlsProps {
  currentTick: number;
  maxTick: number;
  ticks: number[];
  onSeek: (tick: number) => void;
  onExit: () => void;
}

export default function ReplayControls({ currentTick, maxTick, ticks, onSeek, onExit }: ReplayControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const findNearestTick = useCallback((target: number, direction: 1 | -1): number => {
    if (ticks.length === 0) return 0;
    const idx = ticks.indexOf(target);
    if (idx >= 0) {
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < ticks.length) return ticks[nextIdx];
      return target;
    }
    // Find nearest
    if (direction === 1) {
      return ticks.find(t => t > target) ?? ticks[ticks.length - 1];
    }
    return [...ticks].reverse().find(t => t < target) ?? ticks[0];
  }, [ticks]);

  const stepForward = useCallback(() => {
    const next = findNearestTick(currentTick, 1);
    if (next !== currentTick) onSeek(next);
    else setPlaying(false);
  }, [currentTick, findNearestTick, onSeek]);

  const stepBackward = useCallback(() => {
    const prev = findNearestTick(currentTick, -1);
    if (prev !== currentTick) onSeek(prev);
  }, [currentTick, findNearestTick, onSeek]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        stepForward();
      }, 1000 / speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, stepForward]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseInt(e.target.value);
    // Find nearest available tick
    const nearest = ticks.reduce((prev, curr) =>
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev, ticks[0] ?? 0);
    onSeek(nearest);
  };

  return (
    <div className="pixel-panel p-2" style={{ borderColor: '#ff00aa' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-pixel animate-pixel-blink" style={{ fontSize: '8px', color: '#ff00aa' }}>REPLAY</span>
        <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>
          Tick {currentTick}/{maxTick}
        </span>
        <div className="flex-1" />
        <button onClick={onExit} className="pixel-btn pixel-btn-red" style={{ fontSize: '7px', padding: '2px 6px' }}>
          EXIT REPLAY
        </button>
      </div>

      {/* Timeline slider */}
      <div className="mb-2">
        <input
          type="range"
          min={0}
          max={maxTick}
          value={currentTick}
          onChange={handleSlider}
          className="w-full"
          style={{ accentColor: '#ff00aa' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 justify-center">
        <button onClick={stepBackward} className="pixel-btn" style={{ fontSize: '8px', padding: '2px 8px' }}>
          ◄◄
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          className={`pixel-btn ${playing ? 'pixel-btn-red' : 'pixel-btn-green'}`}
          style={{ fontSize: '8px', padding: '2px 12px' }}
        >
          {playing ? '▐▐' : '►'}
        </button>
        <button onClick={stepForward} className="pixel-btn" style={{ fontSize: '8px', padding: '2px 8px' }}>
          ►►
        </button>
        <div className="flex items-center gap-1 ml-4">
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`pixel-btn ${speed === s ? 'pixel-btn-cyan' : ''}`}
              style={{ fontSize: '7px', padding: '1px 4px' }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
