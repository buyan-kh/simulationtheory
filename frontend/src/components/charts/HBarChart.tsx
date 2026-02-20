"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface HBarItem {
  label: string;
  value: number;
  color?: string;
}

interface HBarChartProps {
  items: HBarItem[];
  maxValue?: number;
  height?: number;
  className?: string;
}

function getDefaultColor(rank: number, total: number): string {
  const t = total > 1 ? rank / (total - 1) : 0;
  if (t <= 0.25) return "#22c55e";
  if (t <= 0.5) return "#3b82f6";
  if (t <= 0.75) return "#f59e0b";
  return "#71717a";
}

export function HBarChart({ items, maxValue, height = 22, className }: HBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = maxValue ?? Math.max(...items.map((d) => d.value), 0.001);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      {items.map((item, i) => {
        const pct = Math.max(2, Math.min(100, (item.value / max) * 100));
        const color = item.color || getDefaultColor(i, items.length);
        const isHov = hovered === i;

        return (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Bar */}
            <div
              className="flex-1 rounded overflow-hidden"
              style={{ height, background: "#1a1a1f", cursor: "default" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  opacity: hovered !== null && !isHov ? 0.35 : 1,
                  transition: "opacity 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 6,
                  minWidth: 36,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 600, color: "#000", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                  {(item.value * 100).toFixed(0)}%
                </span>
              </motion.div>
            </div>

            {/* Hover tooltip with full label */}
            {isHov && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: -28,
                  zIndex: 10,
                  background: "#18181b",
                  border: "1px solid #333",
                  borderRadius: 4,
                  padding: "3px 8px",
                  maxWidth: 320,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: 10, color: "#e4e4e7", fontFamily: "var(--font-mono)" }}>
                  {item.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
