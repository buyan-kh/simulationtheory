"use client";

import { useState, useMemo } from "react";

interface GraphNode {
  id: string;
  label: string;
  value?: number;
  depth?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
}

interface NodeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightPath?: string[];
  width?: number;
  height?: number;
  className?: string;
}

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

export function NodeGraph({
  nodes,
  edges,
  highlightPath,
  width = 500,
  height = 240,
  className,
}: NodeGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    // Group nodes by depth
    const depths = new Map<number, GraphNode[]>();
    nodes.forEach((n) => {
      const d = n.depth ?? 0;
      if (!depths.has(d)) depths.set(d, []);
      depths.get(d)!.push(n);
    });

    const maxDepth = Math.max(...Array.from(depths.keys()), 0);
    const positions = new Map<string, { x: number; y: number }>();

    depths.forEach((group, depth) => {
      const xStep = maxDepth > 0 ? depth / maxDepth : 0.5;
      const x = 40 + xStep * (width - 80);
      group.forEach((n, i) => {
        const yStep = group.length > 1 ? i / (group.length - 1) : 0.5;
        const y = 30 + yStep * (height - 60);
        positions.set(n.id, { x, y });
      });
    });

    return positions;
  }, [nodes, edges, width, height]);

  const highlightSet = useMemo(() => new Set(highlightPath || []), [highlightPath]);

  return (
    <div className={className}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = layout.get(edge.from);
          const to = layout.get(edge.to);
          if (!from || !to) return null;

          const isHighlighted =
            highlightSet.has(edge.from) && highlightSet.has(edge.to);
          const isHov = hovered === edge.from || hovered === edge.to;

          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isHighlighted ? "#6366f1" : "var(--border-color)"}
              strokeWidth={isHighlighted ? 2 : isHov ? 1.5 : 1}
              opacity={isHighlighted ? 0.8 : isHov ? 0.6 : 0.3}
              style={{ transition: "all 0.2s ease" }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = layout.get(node.id);
          if (!pos) return null;

          const isHighlighted = highlightSet.has(node.id);
          const isHov = hovered === node.id;
          const color = COLORS[i % COLORS.length];
          const r = isHighlighted ? 10 : isHov ? 9 : 7;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Glow */}
              {isHighlighted && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill={color}
                  opacity={0.15}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={isHighlighted ? color : "var(--surface)"}
                stroke={color}
                strokeWidth={isHighlighted ? 2 : 1.5}
                style={{ transition: "all 0.2s ease" }}
              />
              {/* Label */}
              {(isHov || isHighlighted) && (
                <text
                  x={pos.x}
                  y={pos.y - r - 6}
                  textAnchor="middle"
                  className="fill-foreground text-[9px] font-medium"
                >
                  {node.label}
                </text>
              )}
              {/* Value */}
              {isHov && node.value != null && (
                <text
                  x={pos.x}
                  y={pos.y + r + 12}
                  textAnchor="middle"
                  className="fill-muted text-[8px] font-mono"
                >
                  {node.value.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
