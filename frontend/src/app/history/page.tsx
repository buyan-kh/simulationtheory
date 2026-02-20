"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { DonutChart } from "@/components/charts/DonutChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { useRunsStore } from "@/stores/runs";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import type { RunSummary } from "@/lib/types";

type StatusFilter = "all" | "running" | "completed" | "failed" | "pending";

const FILTER_COLORS: Record<StatusFilter, string> = {
  all: "#71717a",
  running: "#3b82f6",
  completed: "#10b981",
  failed: "#f43f5e",
  pending: "#71717a",
};

function formatDuration(created: string, completed: string | null | undefined): string {
  if (!completed) return "--";
  const ms = new Date(completed).getTime() - new Date(created).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m`;
}

const PAGE_SIZE = 12;

export default function HistoryPage() {
  const { runs, total, isLoading, fetchRuns } = useRunsStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { completed: 0, failed: 0, running: 0, pending: 0 };
    for (const r of runs) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }
    return counts;
  }, [runs]);

  const filteredRuns = useMemo(() => {
    let result: RunSummary[] = [...runs];
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [runs, statusFilter, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / PAGE_SIZE));
  const paginatedRuns = filteredRuns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Duration sparkline data
  const durationTrend = useMemo(() => {
    const sorted = [...runs]
      .filter((r) => r.completed_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sorted.map((r) => {
      const ms = new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime();
      return ms / 1000;
    });
  }, [runs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
        <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
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
      {/* Visual summary row */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Status donut */}
        <Card hoverable>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold tabular-nums">{runs.length}</span>
                <span className="block text-[10px] text-muted">total</span>
              </div>
              <DonutChart
                segments={[
                  { label: "ok", value: statusCounts.completed, color: "#10b981" },
                  { label: "fail", value: statusCounts.failed, color: "#f43f5e" },
                  { label: "run", value: statusCounts.running + statusCounts.pending, color: "#3b82f6" },
                ].filter((s) => s.value > 0)}
                size={48}
                strokeWidth={8}
              />
            </div>
          </CardContent>
        </Card>

        {/* Success rate */}
        <Card hoverable>
          <CardContent>
            <span className="text-2xl font-bold tabular-nums text-emerald-400">
              {runs.length > 0 ? Math.round((statusCounts.completed / runs.length) * 100) : 0}%
            </span>
            <span className="block text-[10px] text-muted">success rate</span>
          </CardContent>
        </Card>

        {/* Failed count */}
        <Card hoverable>
          <CardContent>
            <span className={cn("text-2xl font-bold tabular-nums", statusCounts.failed > 0 ? "text-rose-400" : "text-muted")}>
              {statusCounts.failed}
            </span>
            <span className="block text-[10px] text-muted">failed</span>
          </CardContent>
        </Card>

        {/* Duration trend */}
        <Card hoverable>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[10px] text-muted">duration trend</span>
              {durationTrend.length >= 2 ? (
                <Sparkline values={durationTrend} color="#f59e0b" width={100} height={32} />
              ) : (
                <span className="text-[10px] text-muted">--</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter bar - visual dots */}
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        {(["all", "completed", "failed", "running", "pending"] as StatusFilter[]).map((f) => {
          const active = statusFilter === f;
          const color = FILTER_COLORS[f];
          const count = f === "all" ? runs.length : statusCounts[f as keyof typeof statusCounts] || 0;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer",
                active ? "bg-surface border border-border" : "text-muted hover:text-foreground"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? color : "var(--muted)" }} />
              {f === "all" ? "all" : f.slice(0, 4)}
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSortNewest((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground cursor-pointer"
          >
            <Clock className="h-3 w-3" />
            {sortNewest ? "new" : "old"}
          </button>
        </div>
      </motion.div>

      {/* Runs grid - visual cards */}
      {paginatedRuns.length === 0 ? (
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3">
                <svg className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              {statusFilter !== "all" ? (
                <p className="text-xs text-muted">No {statusFilter} runs</p>
              ) : (
                <>
                  <p className="text-xs text-muted mb-3">No runs yet</p>
                  <Link href="/run"><Button size="sm">Run Pipeline <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {paginatedRuns.map((run) => {
            const statusColor =
              run.status === "completed" ? "#10b981" :
              run.status === "failed" ? "#f43f5e" :
              run.status === "running" ? "#3b82f6" : "#71717a";
            const duration = formatDuration(run.created_at, run.completed_at);

            return (
              <motion.div key={run.run_id} variants={staggerItem}>
                <Link href={`/runs/${run.run_id}`}>
                  <Card hoverable className="h-full">
                    <CardContent>
                      <div className="flex flex-col items-center gap-2 py-1">
                        {/* Status ring */}
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center"
                          style={{ background: `${statusColor}10`, border: `2px solid ${statusColor}40` }}
                        >
                          <div className="h-3.5 w-3.5 rounded-full" style={{ background: statusColor }} />
                        </div>

                        {/* ID */}
                        <span className="text-[10px] font-mono text-muted">
                          {run.run_id.slice(0, 8)}
                        </span>

                        {/* Badge + format */}
                        <div className="flex items-center gap-1.5">
                          <Badge status={run.status} />
                          <span
                            className="text-[8px] px-1 py-0.5 rounded-full border border-border text-muted"
                          >
                            {run.input_format}
                          </span>
                        </div>

                        {/* Duration */}
                        <span className="text-[9px] text-muted tabular-nums">{duration}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {filteredRuns.length > PAGE_SIZE && (
        <motion.div variants={staggerItem} className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4" /></svg>
          </Button>
          <span className="text-[10px] text-muted tabular-nums">{page + 1}/{totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
