"use client";

interface RadarAxis {
  label: string;
  value: number; // 0-1
}

interface RadarChartProps {
  axes: RadarAxis[];
  color?: string;
  size?: number;
  className?: string;
}

export function RadarChart({
  axes,
  color = "#6366f1",
  size = 220,
  className,
}: RadarChartProps) {
  const n = axes.length;
  if (n < 3) return null;

  const center = size / 2;
  const maxR = size / 2 - 28;
  const angleStep = (2 * Math.PI) / n;

  function polarToXY(angle: number, r: number): [number, number] {
    return [
      center + r * Math.cos(angle - Math.PI / 2),
      center + r * Math.sin(angle - Math.PI / 2),
    ];
  }

  const rings = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = axes.map((a, i) => {
    const angle = i * angleStep;
    return polarToXY(angle, a.value * maxR);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((r) => {
          const pts = Array.from({ length: n }, (_, i) => polarToXY(i * angleStep, r * maxR));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
          return (
            <path
              key={r}
              d={d}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const [x, y] = polarToXY(i * angleStep, maxR);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--border-color)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}

        {/* Data area fill */}
        <path d={dataPath} fill={color} opacity={0.15} />

        {/* Data area stroke */}
        <path d={dataPath} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />
        ))}

        {/* Labels */}
        {axes.map((a, i) => {
          const [x, y] = polarToXY(i * angleStep, maxR + 16);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted text-[9px]"
            >
              {a.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
