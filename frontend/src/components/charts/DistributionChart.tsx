"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

interface DistributionChartProps {
  items: DistributionItem[];
  height?: number;
  className?: string;
}

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899", "#14b8a6"];

export function DistributionChart({ items, height = 160, className }: DistributionChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (items.length === 0) return null;

  const max = Math.max(...items.map((d) => d.value), 0.01);
  const barGap = 4;
  const barWidth = Math.min(40, Math.max(12, 400 / items.length));

  return (
    <div className={className} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: barGap, height }}>
        {items.map((item, i) => {
          const pct = (item.value / max) * 100;
          const color = item.color || COLORS[i % COLORS.length];
          const isHov = hovered === i;

          return (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: barWidth + 20 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Value label on hover */}
              <span
                className="text-[9px] font-mono tabular-nums mb-1"
                style={{
                  color,
                  opacity: isHov ? 1 : 0,
                  transition: "opacity 0.15s ease",
                }}
              >
                {item.value.toFixed(2)}
              </span>

              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
                style={{
                  width: barWidth,
                  borderRadius: "4px 4px 2px 2px",
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                  opacity: hovered !== null && !isHov ? 0.4 : 1,
                  transition: "opacity 0.15s ease",
                  minHeight: 2,
                }}
              />

              {/* Label */}
              <span
                className="text-[8px] text-muted mt-1 truncate text-center"
                style={{ maxWidth: barWidth + 16 }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
