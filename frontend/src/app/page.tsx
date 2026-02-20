"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { DonutChart } from "@/components/charts/DonutChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { ActivityBars } from "@/components/charts/ActivityBars";
import { useRunsStore } from "@/stores/runs";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { RunSummary } from "@/lib/types";

function buildActivityBars(runs: RunSummary[]) {
  // Group runs by day (last 14 days)
  const now = new Date();
  const days: { label: string; completed: number; failed: number; running: number; pending: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(5, 10); // MM-DD
    days.push({ label: key, completed: 0, failed: 0, running: 0, pending: 0 });
  }

  for (const run of runs) {
    const runDate = new Date(run.created_at).toISOString().slice(5, 10);
    const bar = days.find((d) => d.label === runDate);
    if (bar) {
      if (run.status === "completed") bar.completed++;
      else if (run.status === "failed") bar.failed++;
      else if (run.status === "running") bar.running++;
      else bar.pending++;
    }
  }

  return days;
}

function buildRunTrend(runs: RunSummary[]): number[] {
  // Cumulative run count over last 14 entries
  const sorted = [...runs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const vals: number[] = [];
  for (let i = 0; i < Math.min(sorted.length, 20); i++) {
    vals.push(i + 1);
  }
  return vals.length >= 2 ? vals : [0, 0];
}

function buildSuccessRateTrend(runs: RunSummary[]): number[] {
  // Rolling success rate over last N runs
  const sorted = [...runs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const vals: number[] = [];
  let completed = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].status === "completed") completed++;
    vals.push(completed / (i + 1));
  }
  return vals.length >= 2 ? vals : [0, 0];
}

export default function DashboardPage() {
  const { runs, isLoading, fetchRuns } = useRunsStore();

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const completedCount = useMemo(
    () => runs.filter((r) => r.status === "completed").length,
    [runs]
  );
  const failedCount = useMemo(
    () => runs.filter((r) => r.status === "failed").length,
    [runs]
  );
  const runningCount = useMemo(
    () => runs.filter((r) => r.status === "running" || r.status === "pending").length,
    [runs]
  );
  const successRate = useMemo(() => {
    if (runs.length === 0) return 0;
    return Math.round((completedCount / runs.length) * 100);
  }, [runs, completedCount]);

  const donutSegments = useMemo(
    () => [
      { label: "Completed", value: completedCount, color: "#10b981" },
      { label: "Failed", value: failedCount, color: "#f43f5e" },
      { label: "In Progress", value: runningCount, color: "#3b82f6" },
    ].filter((s) => s.value > 0),
    [completedCount, failedCount, runningCount]
  );

  const activityBars = useMemo(() => buildActivityBars(runs), [runs]);
  const runTrend = useMemo(() => buildRunTrend(runs), [runs]);
  const successTrend = useMemo(() => buildSuccessRateTrend(runs), [runs]);

  // Format distribution donut
  const formatSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of runs) counts[r.input_format] = (counts[r.input_format] || 0) + 1;
    const colors: Record<string, string> = { text: "#6366f1", csv: "#06b6d4", json: "#f59e0b", auto: "#8b5cf6" };
    return Object.entries(counts).map(([fmt, count]) => ({
      label: fmt,
      value: count,
      color: colors[fmt] || "#71717a",
    }));
  }, [runs]);

  const recentRuns = useMemo(() => runs.slice(0, 8), [runs]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-20 w-20 rounded-full bg-surface-hover flex items-center justify-center mb-2">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 16l4-8 4 4 4-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-muted">No runs yet</p>
        <Link href="/run">
          <Button variant="primary" size="sm">
            Run Pipeline <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Top row: Donut + Activity chart */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Status donut */}
        <Card hoverable className="md:col-span-4">
          <CardContent>
            <div className="flex items-center justify-center py-2">
              <DonutChart segments={donutSegments} size={160} />
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {donutSegments.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity bars */}
        <Card hoverable className="md:col-span-8">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted">14-day activity</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] text-muted">ok</span></div>
                <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /><span className="text-[9px] text-muted">fail</span></div>
              </div>
            </div>
            <ActivityBars bars={activityBars} height={130} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Sparkline metrics row */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hoverable>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-3xl font-bold tabular-nums">{runs.length}</span>
                <span className="block text-[10px] text-muted mt-0.5">total runs</span>
              </div>
              <Sparkline values={runTrend} color="#6366f1" width={80} height={32} />
            </div>
          </CardContent>
        </Card>

        <Card hoverable>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-3xl font-bold tabular-nums text-emerald-400">{successRate}%</span>
                <span className="block text-[10px] text-muted mt-0.5">success</span>
              </div>
              <Sparkline values={successTrend} color="#10b981" width={80} height={32} />
            </div>
          </CardContent>
        </Card>

        <Card hoverable>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-3xl font-bold tabular-nums text-rose-400">{failedCount}</span>
                <span className="block text-[10px] text-muted mt-0.5">failed</span>
              </div>
              {failedCount > 0 && (
                <div className="h-8 w-8 rounded-full border-2 border-rose-500/30 flex items-center justify-center">
                  <span className="text-[10px] text-rose-400 font-mono">!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Format distribution mini donut */}
        <Card hoverable>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-muted">formats</span>
                <div className="flex gap-1 mt-1">
                  {formatSegments.map((s) => (
                    <span key={s.label} className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: `${s.color}15`, color: s.color }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              {formatSegments.length > 0 && (
                <DonutChart segments={formatSegments} size={52} strokeWidth={8} />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent runs as visual timeline */}
      <motion.div variants={staggerItem}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-wider text-muted">recent</span>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {recentRuns.map((run) => {
                const statusColor =
                  run.status === "completed" ? "#10b981" :
                  run.status === "failed" ? "#f43f5e" :
                  run.status === "running" ? "#3b82f6" : "#71717a";
                return (
                  <Link
                    key={run.run_id}
                    href={`/runs/${run.run_id}`}
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors"
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ background: `${statusColor}15`, border: `2px solid ${statusColor}40` }}
                    >
                      <div className="h-3 w-3 rounded-full" style={{ background: statusColor }} />
                    </div>
                    <span className="text-[9px] font-mono text-muted group-hover:text-foreground transition-colors">
                      {run.run_id.slice(0, 6)}
                    </span>
                    <Badge status={run.status} />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA */}
      <motion.div variants={staggerItem} className="flex justify-center pt-2">
        <Link href="/run">
          <Button variant="primary">
            Run Pipeline <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
