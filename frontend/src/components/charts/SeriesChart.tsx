"use client";

import { useState, useRef, useCallback, useId } from "react";

interface DataPoint {
  index: number;
  value: number;
  label?: string;
}

interface SeriesChartProps {
  data: DataPoint[];
  name: string;
  color?: string;
  height?: number;
}

const PAD = { top: 16, right: 64, bottom: 56, left: 8 };
const GRID_ROWS = 5;

export function SeriesChart({
  data,
  name,
  color = "#6366f1",
  height = 340,
}: SeriesChartProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height, background: "#0d0d0f", borderRadius: 6 }}
      >
        <span className="text-[10px]" style={{ color: "#333" }}>NO DATA</span>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.index - b.index);
  const hasLabels = sorted.some((p) => p.label);
  const values = sorted.map((d) => d.value);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = (rawMax - rawMin) * 0.1 || 0.1;
  const minVal = rawMin - margin;
  const maxVal = rawMax + margin;
  const valRange = maxVal - minVal;
  const minIdx = sorted[0].index;
  const maxIdx = sorted[sorted.length - 1].index;
  const idxRange = maxIdx - minIdx || 1;

  // Extra bottom padding if we have labels
  const bottomPad = hasLabels ? PAD.bottom : 28;
  const chartW = containerWidth - PAD.left - PAD.right;
  const chartH = height - PAD.top - bottomPad;

  const scaleX = (idx: number) => PAD.left + ((idx - minIdx) / idxRange) * chartW;
  const scaleY = (val: number) => PAD.top + (1 - (val - minVal) / valRange) * chartH;

  // Change stats
  const firstVal = sorted[0].value;
  const lastVal = sorted[sorted.length - 1].value;
  const change = lastVal - firstVal;
  const changePct = firstVal !== 0 ? (change / Math.abs(firstVal)) * 100 : 0;
  const isUp = change >= 0;
  const trendColor = isUp ? "#22c55e" : "#ef4444";

  // Grid levels
  const gridLevels = Array.from({ length: GRID_ROWS + 1 }, (_, i) =>
    minVal + (i / GRID_ROWS) * valRange
  );

  // Line segments colored by direction
  const segments: { d: string; up: boolean }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    segments.push({
      d: `M ${scaleX(prev.index)} ${scaleY(prev.value)} L ${scaleX(curr.index)} ${scaleY(curr.value)}`,
      up: curr.value >= prev.value,
    });
  }

  // Volume bars
  const deltas = sorted.map((p, i) => (i === 0 ? 0 : Math.abs(p.value - sorted[i - 1].value)));
  const maxDelta = Math.max(...deltas, 0.001);
  const volH = chartH * 0.12;

  // Area gradient
  const gradId = `area-${uid.replace(/:/g, "")}`;
  const areaPath =
    sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.index)} ${scaleY(p.value)}`).join(" ") +
    ` L ${scaleX(maxIdx)} ${PAD.top + chartH} L ${scaleX(minIdx)} ${PAD.top + chartH} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const dist = Math.abs(scaleX(sorted[i].index) - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    setHovered(closestIdx);
  };

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
  };

  const fmtSigned = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

  const hoveredPoint = hovered !== null ? sorted[hovered] : null;
  const hoveredPrev = hovered !== null && hovered > 0 ? sorted[hovered - 1] : null;

  return (
    <div
      ref={measuredRef}
      className="w-full"
      style={{ background: "#0c0c0e", borderRadius: 6, overflow: "hidden" }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 0" }}>
        <span style={{ fontSize: 11, color: "#555", fontFamily: "var(--font-mono)" }}>{name}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e4e4e7", fontFamily: "var(--font-mono)" }}>
            {fmt(lastVal)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: trendColor, fontFamily: "var(--font-mono)" }}>
            {fmtSigned(change)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Hovered label banner */}
      {hoveredPoint?.label && (
        <div style={{ padding: "4px 12px 0", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: hoveredPrev ? (hoveredPoint.value >= hoveredPrev.value ? "#22c55e" : "#ef4444") : "#e4e4e7",
            fontFamily: "var(--font-sans)",
          }}>
            {hoveredPoint.label}
          </span>
          {hoveredPrev && (
            <span style={{
              fontSize: 10,
              color: hoveredPoint.value >= hoveredPrev.value ? "#22c55e" : "#ef4444",
              fontFamily: "var(--font-mono)",
            }}>
              {fmtSigned(hoveredPoint.value - hoveredPrev.value)}
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width={containerWidth}
        height={height}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.1} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels on right */}
        {gridLevels.map((level, i) => {
          const y = scaleY(level);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#1a1a1f" strokeWidth={1} />
              <text x={PAD.left + chartW + 8} y={y + 3} style={{ fontSize: 9, fill: "#444", fontFamily: "var(--font-mono)" }}>
                {fmt(level)}
              </text>
            </g>
          );
        })}

        {/* Volume bars */}
        {sorted.map((p, i) => {
          if (i === 0) return null;
          const delta = deltas[i];
          const barH = (delta / maxDelta) * volH;
          const x = scaleX(p.index);
          const barW = Math.max(1, chartW / sorted.length * 0.5);
          const up = p.value >= sorted[i - 1].value;
          return (
            <rect
              key={`vol-${i}`}
              x={x - barW / 2}
              y={PAD.top + chartH - barH}
              width={barW}
              height={barH}
              fill={up ? "#22c55e" : "#ef4444"}
              opacity={0.12}
              rx={1}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line segments */}
        {segments.map((seg, i) => (
          <path key={i} d={seg.d} fill="none" stroke={seg.up ? "#22c55e" : "#ef4444"} strokeWidth={1.5} strokeLinecap="round" />
        ))}

        {/* Last price line */}
        <line
          x1={PAD.left} y1={scaleY(lastVal)} x2={PAD.left + chartW} y2={scaleY(lastVal)}
          stroke={trendColor} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4}
        />
        <rect x={PAD.left + chartW + 1} y={scaleY(lastVal) - 8} width={58} height={16} rx={3} fill={trendColor} />
        <text
          x={PAD.left + chartW + 30} y={scaleY(lastVal) + 3} textAnchor="middle"
          style={{ fontSize: 9, fill: "#000", fontWeight: 700, fontFamily: "var(--font-mono)" }}
        >
          {fmt(lastVal)}
        </text>

        {/* Data points with labels */}
        {sorted.map((point, i) => {
          const x = scaleX(point.index);
          const y = scaleY(point.value);
          const isHov = hovered === i;
          const pointUp = i > 0 ? point.value >= sorted[i - 1].value : true;
          const pointColor = pointUp ? "#22c55e" : "#ef4444";

          return (
            <g key={`pt-${i}`}>
              {/* Point dot */}
              <circle cx={x} cy={y} r={isHov ? 5 : hasLabels ? 3.5 : 0} fill={isHov ? pointColor : "#0c0c0e"} stroke={pointColor} strokeWidth={isHov ? 2 : 1.5} />

              {/* Always-visible label tick marks on x-axis when labels exist */}
              {hasLabels && point.label && (
                <>
                  {/* Tick line from axis to label */}
                  <line x1={x} y1={PAD.top + chartH} x2={x} y2={PAD.top + chartH + 6} stroke="#333" strokeWidth={1} />

                  {/* Rotated label on x-axis */}
                  <text
                    x={x}
                    y={PAD.top + chartH + 10}
                    textAnchor="start"
                    transform={`rotate(35, ${x}, ${PAD.top + chartH + 10})`}
                    style={{
                      fontSize: isHov ? 10 : 8,
                      fill: isHov ? "#e4e4e7" : "#555",
                      fontFamily: "var(--font-sans)",
                      fontWeight: isHov ? 600 : 400,
                      transition: "fill 0.15s ease",
                    }}
                  >
                    {point.label.length > 24 ? point.label.slice(0, 22) + "..." : point.label}
                  </text>
                </>
              )}

              {/* Non-label x-axis ticks (fallback for numeric data) */}
              {!hasLabels && i % Math.max(1, Math.floor(sorted.length / 6)) === 0 && (
                <text x={x} y={PAD.top + chartH + 16} textAnchor="middle" style={{ fontSize: 8, fill: "#444", fontFamily: "var(--font-mono)" }}>
                  {fmt(point.index)}
                </text>
              )}
            </g>
          );
        })}

        {/* Crosshair on hover */}
        {hovered !== null && hoveredPoint && (() => {
          const x = scaleX(hoveredPoint.index);
          const y = scaleY(hoveredPoint.value);
          return (
            <>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH} stroke="#444" strokeWidth={0.5} strokeDasharray="2 2" />
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#444" strokeWidth={0.5} strokeDasharray="2 2" />

              {/* Glow */}
              <circle cx={x} cy={y} r={8} fill={hoveredPrev ? (hoveredPoint.value >= hoveredPrev.value ? "#22c55e" : "#ef4444") : trendColor} opacity={0.15} />

              {/* Value on right axis */}
              <rect x={PAD.left + chartW + 1} y={y - 8} width={58} height={16} rx={3} fill="#27272a" stroke="#444" strokeWidth={0.5} />
              <text x={PAD.left + chartW + 30} y={y + 3} textAnchor="middle" style={{ fontSize: 9, fill: "#e4e4e7", fontFamily: "var(--font-mono)" }}>
                {fmt(hoveredPoint.value)}
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
