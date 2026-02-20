"use client";

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

function getDefaultColor(value: number, max: number): string {
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.7) return "#10b981";
  if (pct >= 0.4) return "#f59e0b";
  return "#f43f5e";
}

export function HBarChart({ items, maxValue, height = 28, className }: HBarChartProps) {
  const max = maxValue ?? Math.max(...items.map((d) => d.value), 0.01);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => {
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        const color = item.color || getDefaultColor(item.value, max);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="text-[11px] text-muted truncate text-right"
              style={{ width: 80, flexShrink: 0 }}
            >
              {item.label}
            </span>
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height, background: "var(--border-color)", opacity: 0.3 }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                style={{
                  height: "100%",
                  borderRadius: "9999px",
                  background: `linear-gradient(90deg, ${color}cc, ${color})`,
                }}
              />
            </div>
            <span
              className="text-[11px] font-mono tabular-nums"
              style={{ width: 42, flexShrink: 0, color, textAlign: "right" }}
            >
              {(item.value * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
