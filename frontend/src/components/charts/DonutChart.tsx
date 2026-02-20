"use client";

import { useState, useRef, useCallback } from "react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 28,
  className,
}: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;
  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const offset = accumulated;
    accumulated += pct;
    return { ...seg, pct, offset, index: i };
  });

  const active = hovered !== null ? arcs[hovered] : null;

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth - 6}
          opacity={0.3}
        />
        {arcs.map((arc) => {
          const isHovered = hovered === arc.index;
          const sw = isHovered ? strokeWidth + 4 : strokeWidth;
          return (
            <circle
              key={arc.index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={sw}
              strokeDasharray={`${arc.pct * circumference} ${circumference}`}
              strokeDashoffset={-arc.offset * circumference}
              strokeLinecap="round"
              opacity={hovered !== null && !isHovered ? 0.3 : 1}
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "all 0.2s ease", cursor: "pointer" }}
              onMouseEnter={() => setHovered(arc.index)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {active ? (
          <>
            <span className="text-2xl font-bold tabular-nums" style={{ color: active.color }}>
              {Math.round(active.pct * 100)}%
            </span>
            <span className="text-[10px] text-muted">{active.label}</span>
          </>
        ) : (
          <span className="text-3xl font-bold tabular-nums">{total}</span>
        )}
      </div>
    </div>
  );
}
