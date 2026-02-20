"use client";

import { useState, useRef, useCallback, useId } from "react";

interface DataPoint {
  index: number;
  value: number;
}

interface SeriesChartProps {
  data: DataPoint[];
  name: string;
  color?: string;
  height?: number;
}

const PAD = { top: 12, right: 64, bottom: 28, left: 8 };
const GRID_ROWS = 5;

export function SeriesChart({
  data,
  name,
  color = "#6366f1",
  height = 320,
}: SeriesChartProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: DataPoint;
    prevPoint: DataPoint | null;
  } | null>(null);
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
        <span className="text-[10px] text-[#333]">NO DATA</span>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.index - b.index);
  const values = sorted.map((d) => d.value);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = (rawMax - rawMin) * 0.08 || 1;
  const minVal = rawMin - margin;
  const maxVal = rawMax + margin;
  const valRange = maxVal - minVal;
  const minIdx = sorted[0].index;
  const maxIdx = sorted[sorted.length - 1].index;
  const idxRange = maxIdx - minIdx || 1;

  const chartW = containerWidth - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const scaleX = (idx: number) => PAD.left + ((idx - minIdx) / idxRange) * chartW;
  const scaleY = (val: number) => PAD.top + (1 - (val - minVal) / valRange) * chartH;

  // First/last values for change indicator
  const firstVal = sorted[0].value;
  const lastVal = sorted[sorted.length - 1].value;
  const change = lastVal - firstVal;
  const changePct = firstVal !== 0 ? (change / Math.abs(firstVal)) * 100 : 0;
  const isUp = change >= 0;
  const trendColor = isUp ? "#22c55e" : "#ef4444";

  // Grid levels
  const gridLevels = Array.from({ length: GRID_ROWS + 1 }, (_, i) => {
    const frac = i / GRID_ROWS;
    return minVal + frac * valRange;
  });

  // X-axis tick positions (roughly 6 ticks)
  const xTickCount = Math.min(sorted.length, 6);
  const xTicks: number[] = [];
  for (let i = 0; i < xTickCount; i++) {
    const idx = Math.round((i / (xTickCount - 1)) * (sorted.length - 1));
    xTicks.push(sorted[idx].index);
  }

  // Build line segments colored by direction
  const segments: { d: string; up: boolean }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const d = `M ${scaleX(prev.index)} ${scaleY(prev.value)} L ${scaleX(curr.index)} ${scaleY(curr.value)}`;
    segments.push({ d, up: curr.value >= prev.value });
  }

  // Volume-like bars (simulated from absolute delta)
  const deltas = sorted.map((p, i) =>
    i === 0 ? 0 : Math.abs(p.value - sorted[i - 1].value)
  );
  const maxDelta = Math.max(...deltas, 0.001);
  const volH = chartH * 0.15;

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

    let closest = sorted[0];
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const dist = Math.abs(scaleX(sorted[i].index) - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = sorted[i];
        closestIdx = i;
      }
    }
    setTooltip({
      x: scaleX(closest.index),
      y: scaleY(closest.value),
      point: closest,
      prevPoint: closestIdx > 0 ? sorted[closestIdx - 1] : null,
    });
  };

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
  };

  const fmtSigned = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

  return (
    <div
      ref={measuredRef}
      className="w-full"
      style={{ background: "#0c0c0e", borderRadius: 6, overflow: "hidden" }}
    >
      {/* Top bar: name + change */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 0",
        }}
      >
        <span style={{ fontSize: 11, color: "#555", fontFamily: "var(--font-mono)" }}>
          {name}
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e4e4e7", fontFamily: "var(--font-mono)" }}>
            {fmt(lastVal)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: trendColor, fontFamily: "var(--font-mono)" }}>
            {fmtSigned(change)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={containerWidth}
        height={height}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines + Y labels (right side) */}
        {gridLevels.map((level, i) => {
          const y = scaleY(level);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + chartW}
                y2={y}
                stroke="#1a1a1f"
                strokeWidth={1}
              />
              <text
                x={PAD.left + chartW + 8}
                y={y + 3}
                style={{ fontSize: 9, fill: "#444", fontFamily: "var(--font-mono)" }}
              >
                {fmt(level)}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {xTicks.map((idx, i) => {
          const x = scaleX(idx);
          return (
            <g key={i}>
              <line x1={x} y1={PAD.top + chartH} x2={x} y2={PAD.top + chartH + 4} stroke="#1a1a1f" strokeWidth={1} />
              <text
                x={x}
                y={PAD.top + chartH + 16}
                textAnchor="middle"
                style={{ fontSize: 8, fill: "#444", fontFamily: "var(--font-mono)" }}
              >
                {fmt(idx)}
              </text>
            </g>
          );
        })}

        {/* Volume bars at bottom */}
        {sorted.map((p, i) => {
          if (i === 0) return null;
          const delta = deltas[i];
          const barH = (delta / maxDelta) * volH;
          const x = scaleX(p.index);
          const barW = Math.max(1, chartW / sorted.length * 0.6);
          const up = p.value >= sorted[i - 1].value;
          return (
            <rect
              key={i}
              x={x - barW / 2}
              y={PAD.top + chartH - barH}
              width={barW}
              height={barH}
              fill={up ? "#22c55e" : "#ef4444"}
              opacity={0.15}
              rx={1}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line segments colored by direction */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.up ? "#22c55e" : "#ef4444"}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}

        {/* Last price horizontal line */}
        <line
          x1={PAD.left}
          y1={scaleY(lastVal)}
          x2={PAD.left + chartW}
          y2={scaleY(lastVal)}
          stroke={trendColor}
          strokeWidth={0.5}
          strokeDasharray="3 3"
          opacity={0.5}
        />
        {/* Last price label on right axis */}
        <rect
          x={PAD.left + chartW + 1}
          y={scaleY(lastVal) - 8}
          width={58}
          height={16}
          rx={3}
          fill={trendColor}
        />
        <text
          x={PAD.left + chartW + 30}
          y={scaleY(lastVal) + 3}
          textAnchor="middle"
          style={{ fontSize: 9, fill: "#000", fontWeight: 700, fontFamily: "var(--font-mono)" }}
        >
          {fmt(lastVal)}
        </text>

        {/* Crosshair + tooltip */}
        {tooltip && (
          <>
            {/* Vertical crosshair */}
            <line
              x1={tooltip.x}
              y1={PAD.top}
              x2={tooltip.x}
              y2={PAD.top + chartH}
              stroke="#444"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
            {/* Horizontal crosshair */}
            <line
              x1={PAD.left}
              y1={tooltip.y}
              x2={PAD.left + chartW}
              y2={tooltip.y}
              stroke="#444"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />

            {/* Point dot */}
            <circle cx={tooltip.x} cy={tooltip.y} r={3.5} fill={trendColor} />
            <circle cx={tooltip.x} cy={tooltip.y} r={6} fill={trendColor} opacity={0.2} />

            {/* Value label at right axis */}
            <rect
              x={PAD.left + chartW + 1}
              y={tooltip.y - 8}
              width={58}
              height={16}
              rx={3}
              fill="#27272a"
              stroke="#444"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left + chartW + 30}
              y={tooltip.y + 3}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "#e4e4e7", fontFamily: "var(--font-mono)" }}
            >
              {fmt(tooltip.point.value)}
            </text>

            {/* Index label at bottom */}
            <rect
              x={tooltip.x - 20}
              y={PAD.top + chartH + 2}
              width={40}
              height={14}
              rx={3}
              fill="#27272a"
              stroke="#444"
              strokeWidth={0.5}
            />
            <text
              x={tooltip.x}
              y={PAD.top + chartH + 12}
              textAnchor="middle"
              style={{ fontSize: 8, fill: "#e4e4e7", fontFamily: "var(--font-mono)" }}
            >
              {fmt(tooltip.point.index)}
            </text>

            {/* Floating tooltip box */}
            {(() => {
              const pointChange = tooltip.prevPoint
                ? tooltip.point.value - tooltip.prevPoint.value
                : 0;
              const pointUp = pointChange >= 0;
              const boxX = tooltip.x + 14;
              const boxY = Math.max(PAD.top, tooltip.y - 36);
              const flipX = boxX + 100 > containerWidth - PAD.right;

              return (
                <g transform={`translate(${flipX ? tooltip.x - 108 : boxX}, ${boxY})`}>
                  <rect
                    width={94}
                    height={32}
                    rx={4}
                    fill="#18181b"
                    stroke="#333"
                    strokeWidth={0.5}
                  />
                  <text x={6} y={13} style={{ fontSize: 10, fill: "#e4e4e7", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                    {fmt(tooltip.point.value)}
                  </text>
                  {tooltip.prevPoint && (
                    <text x={6} y={26} style={{ fontSize: 9, fill: pointUp ? "#22c55e" : "#ef4444", fontFamily: "var(--font-mono)" }}>
                      {fmtSigned(pointChange)}
                    </text>
                  )}
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
