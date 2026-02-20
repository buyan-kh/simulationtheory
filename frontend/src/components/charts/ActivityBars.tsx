"use client";

import { useState } from "react";

interface ActivityBar {
  label: string;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

interface ActivityBarsProps {
  bars: ActivityBar[];
  height?: number;
  className?: string;
}

export function ActivityBars({ bars, height = 120, className }: ActivityBarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (bars.length === 0) return null;

  const maxTotal = Math.max(...bars.map((b) => b.completed + b.failed + b.running + b.pending), 1);
  const barWidth = Math.min(24, Math.max(6, 400 / bars.length));
  const gap = Math.max(2, barWidth * 0.3);

  return (
    <div className={className} style={{ position: "relative" }}>
      <svg
        width="100%"
        height={height + 20}
        viewBox={`0 0 ${bars.length * (barWidth + gap)} ${height + 20}`}
        preserveAspectRatio="none"
      >
        {bars.map((bar, i) => {
          const total = bar.completed + bar.failed + bar.running + bar.pending;
          const x = i * (barWidth + gap);
          const isHov = hovered === i;

          // Stack: completed (bottom) -> running -> pending -> failed (top)
          const segments = [
            { value: bar.completed, color: "#10b981" },
            { value: bar.running, color: "#3b82f6" },
            { value: bar.pending, color: "#71717a" },
            { value: bar.failed, color: "#f43f5e" },
          ];

          let yOffset = height;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {segments.map((seg, si) => {
                if (seg.value === 0) return null;
                const segH = (seg.value / maxTotal) * height;
                yOffset -= segH;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={yOffset}
                    width={barWidth}
                    height={segH}
                    rx={2}
                    fill={seg.color}
                    opacity={isHov ? 1 : 0.7}
                    style={{ transition: "opacity 0.15s ease" }}
                  />
                );
              })}
              {/* Baseline tick */}
              {i % Math.max(1, Math.floor(bars.length / 6)) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height + 14}
                  textAnchor="middle"
                  className="fill-muted text-[8px]"
                >
                  {bar.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hovered !== null && bars[hovered] && (
        <div
          className="absolute top-0 right-0 rounded-[var(--radius-sm)] bg-surface border border-border px-2 py-1.5 pointer-events-none"
          style={{ fontSize: 10 }}
        >
          <span className="text-muted">{bars[hovered].label}: </span>
          <span style={{ color: "#10b981" }}>{bars[hovered].completed}</span>
          {bars[hovered].failed > 0 && (
            <span style={{ color: "#f43f5e" }}> / {bars[hovered].failed}</span>
          )}
        </div>
      )}
    </div>
  );
}
