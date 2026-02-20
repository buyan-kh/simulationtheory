"use client";

import { useState } from "react";

interface HeatmapGridProps {
  labels: string[];
  matrix: number[][];
  className?: string;
}

function interpolateColor(value: number): string {
  // 0 = dark/cold, 1 = bright/hot
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped < 0.25) {
    const t = clamped / 0.25;
    return `rgba(99, 102, 241, ${0.08 + t * 0.17})`;
  }
  if (clamped < 0.5) {
    const t = (clamped - 0.25) / 0.25;
    return `rgba(6, 182, 212, ${0.25 + t * 0.25})`;
  }
  if (clamped < 0.75) {
    const t = (clamped - 0.5) / 0.25;
    return `rgba(16, 185, 129, ${0.4 + t * 0.25})`;
  }
  const t = (clamped - 0.75) / 0.25;
  return `rgba(16, 185, 129, ${0.65 + t * 0.35})`;
}

export function HeatmapGrid({ labels, matrix, className }: HeatmapGridProps) {
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);
  const n = labels.length;
  if (n === 0) return null;

  const cellSize = Math.min(48, Math.max(28, 320 / n));
  const labelW = 64;
  const totalW = labelW + n * cellSize;

  return (
    <div className={className} style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-block", minWidth: totalW }}>
        {/* Column labels */}
        <div style={{ display: "flex", marginLeft: labelW }}>
          {labels.map((l, i) => (
            <div
              key={i}
              className="text-[9px] text-muted truncate"
              style={{
                width: cellSize,
                textAlign: "center",
                transform: "rotate(-45deg)",
                transformOrigin: "bottom left",
                whiteSpace: "nowrap",
                marginBottom: 4,
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Rows */}
        {matrix.map((row, r) => (
          <div key={r} style={{ display: "flex", alignItems: "center" }}>
            <span
              className="text-[9px] text-muted truncate text-right pr-1"
              style={{ width: labelW, flexShrink: 0 }}
            >
              {labels[r]}
            </span>
            {row.map((val, c) => {
              const isHov = hovered?.r === r && hovered?.c === c;
              return (
                <div
                  key={c}
                  onMouseEnter={() => setHovered({ r, c })}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: r === c ? "var(--surface-hover)" : interpolateColor(val),
                    border: isHov ? "1.5px solid var(--foreground)" : "1px solid var(--background)",
                    borderRadius: 3,
                    cursor: "default",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border 0.1s ease",
                  }}
                >
                  {isHov && r !== c && (
                    <span className="text-[9px] font-mono font-bold" style={{ color: "var(--foreground)" }}>
                      {val.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
