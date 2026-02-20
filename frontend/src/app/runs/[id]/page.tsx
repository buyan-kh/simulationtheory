"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SeriesChart } from "@/components/charts/SeriesChart";
import { HBarChart } from "@/components/charts/HBarChart";
import { HeatmapGrid } from "@/components/charts/HeatmapGrid";
import { RadarChart } from "@/components/charts/RadarChart";
import { NodeGraph } from "@/components/charts/NodeGraph";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { useRunsStore } from "@/stores/runs";
import { getChartData } from "@/lib/api";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import type { PipelineRun } from "@/lib/types";

// ---------- Backend types ----------

interface BackendPrediction {
  id?: string;
  description: string;
  confidence: number;
  reasoning?: string;
  source_series?: string[] | string;
}

interface BackendEquilibrium {
  profiles?: { player: string; strategies: { name: string; probability: number }[] }[];
  payoff?: [number, number];
  type?: string;
  strategies?: Record<string, string>;
  payoffs?: Record<string, number>;
}

interface BackendGameTheory {
  equilibria?: BackendEquilibrium[];
  dominant_strategies?: Record<string, string | null>;
  minimax_value?: number | null;
  ranked_predictions?: BackendPrediction[];
}

interface BackendPathNode {
  id?: string;
  label?: string;
  value?: number;
  series_name?: string;
  similarity?: number;
  depth?: number;
}

interface BackendPath {
  nodes?: BackendPathNode[];
  total_value?: number;
  total_similarity?: number;
  probability?: number;
}

interface BackendPathResult {
  paths?: BackendPath[];
  best_path?: BackendPath | null;
  explored_count?: number;
}

interface BackendRandomized {
  sampled_outcomes?: BackendPrediction[];
  mean_confidence?: number;
  variance?: number;
  exploration_rate?: number;
  method?: string;
  iterations?: number;
  results?: Record<string, number>;
  best_action?: string;
}

interface BackendResult {
  input_summary?: string;
  predictions?: BackendPrediction[];
  game_theory?: BackendGameTheory | null;
  decoded?: { summary?: string; detailed_analysis?: string; key_findings?: string[]; details?: string[]; recommendations?: string[] } | null;
  paths?: BackendPathResult | null;
  randomized?: BackendRandomized | null;
  iterations_run?: number;
  ingest?: unknown;
  embeddings?: unknown;
  chart?: unknown;
  similarity?: {
    pairs?: { series_a: string; series_b: string; score: number }[];
    clusters?: { name?: string; cluster_id?: number; members?: string[]; series_names?: string[] }[];
  };
}

interface ChartSeries {
  name: string;
  points: { index: number; value: number; label?: string }[];
}

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#ec4899", "#14b8a6"];

// ---------- Helpers ----------

function buildSimilarityMatrix(pairs: { series_a: string; series_b: string; score: number }[]) {
  const nameSet = new Set<string>();
  for (const p of pairs) { nameSet.add(p.series_a); nameSet.add(p.series_b); }
  const labels = Array.from(nameSet).sort();
  const n = labels.length;
  const idx = new Map(labels.map((l, i) => [l, i]));
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (const p of pairs) {
    const r = idx.get(p.series_a)!;
    const c = idx.get(p.series_b)!;
    matrix[r][c] = p.score;
    matrix[c][r] = p.score;
  }
  // Diagonal = 1
  for (let i = 0; i < n; i++) matrix[i][i] = 1;

  return { labels, matrix };
}

function buildGameTheoryRadar(gt: BackendGameTheory) {
  const axes: { label: string; value: number }[] = [];

  // Build axes from available data
  const eqCount = gt.equilibria?.length ?? 0;
  const domCount = Object.values(gt.dominant_strategies || {}).filter(Boolean).length;
  const minimax = gt.minimax_value;
  const rankedCount = gt.ranked_predictions?.length ?? 0;

  if (eqCount > 0) axes.push({ label: "Equilibria", value: Math.min(eqCount / 5, 1) });
  if (domCount > 0) axes.push({ label: "Dominant", value: Math.min(domCount / 4, 1) });
  if (minimax != null) axes.push({ label: "Minimax", value: Math.min(Math.abs(minimax), 1) });
  if (rankedCount > 0) axes.push({ label: "Ranked", value: Math.min(rankedCount / 10, 1) });

  // From equilibria payoffs
  if (gt.equilibria) {
    for (const eq of gt.equilibria.slice(0, 3)) {
      if (eq.payoffs) {
        for (const [player, val] of Object.entries(eq.payoffs)) {
          axes.push({ label: player.slice(0, 8), value: Math.min(Math.max(val, 0), 1) });
        }
      }
      if (eq.payoff) {
        axes.push({ label: "P1 Payoff", value: Math.min(Math.max(eq.payoff[0], 0), 1) });
        axes.push({ label: "P2 Payoff", value: Math.min(Math.max(eq.payoff[1], 0), 1) });
      }
      break; // Just first equilibrium
    }
  }

  // Need at least 3 axes
  while (axes.length < 3) {
    axes.push({ label: `Axis ${axes.length + 1}`, value: 0.5 });
  }

  return axes.slice(0, 8);
}

function buildPathGraph(pathResult: BackendPathResult, bestPath: BackendPath | null) {
  const nodes: { id: string; label: string; value?: number; depth?: number }[] = [];
  const edges: { from: string; to: string; weight?: number }[] = [];
  const seen = new Set<string>();

  const allPaths = pathResult.paths || [];
  for (const path of allPaths.slice(0, 5)) {
    const pathNodes = path.nodes || [];
    for (let ni = 0; ni < pathNodes.length; ni++) {
      const node = pathNodes[ni];
      const id = node.id || node.label || node.series_name || `n${ni}`;
      if (!seen.has(id)) {
        seen.add(id);
        nodes.push({
          id,
          label: node.label || node.series_name || id,
          value: node.value ?? node.similarity,
          depth: node.depth ?? ni,
        });
      }
      if (ni > 0) {
        const prevNode = pathNodes[ni - 1];
        const prevId = prevNode.id || prevNode.label || prevNode.series_name || `n${ni - 1}`;
        edges.push({ from: prevId, to: id, weight: node.similarity });
      }
    }
  }

  const highlightPath = bestPath?.nodes?.map(
    (n) => n.id || n.label || n.series_name || ""
  ) || [];

  return { nodes, edges, highlightPath };
}

// ---------- Pipeline Progress (visual, minimal text) ----------

function PipelineProgressVisual({ stages }: { stages: PipelineRun["stages"] }) {
  const completed = stages.filter((s) => s.status === "completed").length;
  const total = stages.length;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-4">
          <DonutChart
            segments={[
              { label: "Done", value: completed, color: "#10b981" },
              { label: "Remaining", value: total - completed, color: "var(--border-color)" },
            ]}
            size={64}
            strokeWidth={10}
          />
          <div className="flex-1">
            <div className="flex gap-1">
              {stages.map((stage, i) => {
                const color =
                  stage.status === "completed" ? "#10b981" :
                  stage.status === "running" ? "#3b82f6" :
                  stage.status === "failed" ? "#f43f5e" : "var(--border-color)";
                return (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{ height: 6, background: color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  />
                );
              })}
            </div>
            <div className="flex gap-1 mt-1.5">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-[7px] text-muted truncate"
                >
                  {stage.name.replace(/^(pipeline_)?/, "").slice(0, 5)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Loading / Error ----------

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="h-14 w-14 rounded-full border-2 border-rose-500/30 flex items-center justify-center">
        <span className="text-rose-400 text-lg">!</span>
      </div>
      <p className="text-sm text-muted">{message}</p>
      <Button variant="secondary" size="sm" onClick={() => router.push("/history")}>
        Back
      </Button>
    </div>
  );
}

// ==========================================================================
// MAIN PAGE
// ==========================================================================

export default function RunResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentRun, isLoading, error, fetchRun } = useRunsStore();
  const [chartSeries, setChartSeries] = useState<ChartSeries[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (params.id) fetchRun(params.id);
  }, [params.id, fetchRun]);

  useEffect(() => {
    if (!params.id || !currentRun || currentRun.status !== "completed") return;
    setChartLoading(true);
    getChartData(params.id)
      .then((data) => {
        if (data && typeof data === "object") {
          const asAny = data as Record<string, unknown>;
          if (Array.isArray(asAny.series)) {
            setChartSeries(
              (asAny.series as ChartSeries[]).filter((s) => s.points?.length > 0)
            );
          } else {
            const record = data as Record<string, number[]>;
            const series: ChartSeries[] = Object.entries(record)
              .filter(([key]) => key !== "run_id" && key !== "chart_id")
              .map(([name, values]) => ({
                name,
                points: Array.isArray(values) ? values.map((v, i) => ({ index: i, value: v })) : [],
              }))
              .filter((s) => s.points.length > 0);
            setChartSeries(series);
          }
        }
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [params.id, currentRun]);

  const result = currentRun?.result as BackendResult | undefined;

  const predictions = result?.predictions || [];
  const sortedPredictions = useMemo(
    () => [...predictions].sort((a, b) => b.confidence - a.confidence),
    [predictions]
  );

  const similarityData = useMemo(() => {
    if (!result?.similarity?.pairs?.length) return null;
    return buildSimilarityMatrix(result.similarity.pairs);
  }, [result?.similarity]);

  const gameRadar = useMemo(() => {
    if (!result?.game_theory) return null;
    return buildGameTheoryRadar(result.game_theory);
  }, [result?.game_theory]);

  const pathGraph = useMemo(() => {
    if (!result?.paths?.paths?.length) return null;
    return buildPathGraph(result.paths, result.paths.best_path || null);
  }, [result?.paths]);

  const randomItems = useMemo(() => {
    if (!result?.randomized?.results) return [];
    return Object.entries(result.randomized.results)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ label, value }));
  }, [result?.randomized]);

  const sampledConfidences = useMemo(() => {
    const outcomes = result?.randomized?.sampled_outcomes || [];
    return outcomes.slice(0, 12).map((o, i) => ({
      label: o.description.slice(0, 10),
      value: o.confidence,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [result?.randomized]);

  if (isLoading && !currentRun) return <LoadingSkeleton />;
  if (error) return <ErrorCard message={error} />;
  if (!currentRun) return <ErrorCard message="Run not found" />;

  const run = currentRun;
  const isCompleted = run.status === "completed";
  const isPending = run.status === "pending" || run.status === "running";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header: minimal */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/history")}>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4" /></svg>
          </Button>
          <span className="font-mono text-sm text-muted">{run.run_id.slice(0, 12)}</span>
        </div>
        <Badge status={run.status} />
      </motion.div>

      {/* Error banner */}
      {run.error && (
        <motion.div variants={staggerItem}>
          <div className="rounded-[var(--radius-sm)] border border-rose-500/20 bg-rose-500/5 px-3 py-2">
            <p className="text-xs text-rose-400">{run.error}</p>
          </div>
        </motion.div>
      )}

      {/* Pipeline progress */}
      {isPending && run.stages?.length > 0 && (
        <motion.div variants={staggerItem}>
          <PipelineProgressVisual stages={run.stages} />
        </motion.div>
      )}

      {isCompleted && result && (
        <>
          {/* 1. Data Series Charts - HERO section, full-width stock charts */}
          {chartLoading ? (
            <motion.div variants={staggerItem}>
              <Skeleton className="h-80 w-full rounded-[var(--radius)]" />
            </motion.div>
          ) : chartSeries.length > 0 && (
            <motion.div variants={staggerItem} className="space-y-3">
              {chartSeries.map((s, i) => (
                <div key={s.name} className="rounded-[var(--radius)] overflow-hidden">
                  <SeriesChart
                    data={s.points}
                    name={s.name}
                    color={CHART_COLORS[i % CHART_COLORS.length]}
                    height={340}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {/* 2. Predictions + Similarity side by side */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Predictions as bar chart */}
            {sortedPredictions.length > 0 && (
              <Card>
                <CardContent>
                  <span className="text-[10px] uppercase tracking-wider text-muted block mb-3">
                    predictions
                    <span className="text-[9px] text-[#444] ml-2">top {Math.min(sortedPredictions.length, 8)}</span>
                  </span>
                  <HBarChart
                    items={sortedPredictions.slice(0, 8).map((p) => ({
                      label: p.description,
                      value: p.confidence,
                    }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Similarity heatmap */}
            {similarityData && (
              <Card>
                <CardContent>
                  <span className="text-[10px] uppercase tracking-wider text-muted block mb-3">similarity</span>
                  <HeatmapGrid
                    labels={similarityData.labels}
                    matrix={similarityData.matrix}
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* 3. Game Theory + Paths side by side */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Game Theory radar */}
            {gameRadar && (
              <Card>
                <CardContent>
                  <span className="text-[10px] uppercase tracking-wider text-muted block mb-3">game theory</span>
                  <div className="flex justify-center">
                    <RadarChart axes={gameRadar} size={200} />
                  </div>
                  {/* Dominant strategies as small visual chips */}
                  {result.game_theory?.dominant_strategies && (
                    <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                      {Object.entries(result.game_theory.dominant_strategies)
                        .filter(([, v]) => v != null)
                        .map(([player, strat]) => (
                          <span
                            key={player}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            {player}: {strat}
                          </span>
                        ))}
                    </div>
                  )}
                  {/* Minimax as a single value badge */}
                  {result.game_theory?.minimax_value != null && (
                    <div className="flex justify-center mt-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                        minimax: {result.game_theory.minimax_value.toFixed(3)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Paths as node graph */}
            {pathGraph && pathGraph.nodes.length > 0 && (
              <Card>
                <CardContent>
                  <span className="text-[10px] uppercase tracking-wider text-muted block mb-3">paths</span>
                  <NodeGraph
                    nodes={pathGraph.nodes}
                    edges={pathGraph.edges}
                    highlightPath={pathGraph.highlightPath}
                    height={220}
                  />
                  {result.paths?.explored_count != null && (
                    <div className="flex justify-center mt-2">
                      <span className="text-[9px] text-muted font-mono">
                        {result.paths.explored_count} explored
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* 4. Randomization */}
          {result.randomized && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted">randomization</span>
                    <div className="flex items-center gap-3">
                      {result.randomized.method && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-hover text-muted border border-border">
                          {result.randomized.method}
                        </span>
                      )}
                      {result.randomized.mean_confidence != null && (
                        <span className="text-[9px] font-mono text-muted">
                          avg: {(result.randomized.mean_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Distribution chart */}
                    {randomItems.length > 0 && (
                      <DistributionChart items={randomItems} height={140} />
                    )}

                    {/* Sampled outcomes confidence bars */}
                    {sampledConfidences.length > 0 && (
                      <DistributionChart items={sampledConfidences} height={140} />
                    )}
                  </div>

                  {/* Stats row as visual elements */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    {result.randomized.variance != null && (
                      <div className="flex flex-col items-center">
                        <div
                          className="rounded-full"
                          style={{
                            width: 32 + result.randomized.variance * 200,
                            height: 32 + result.randomized.variance * 200,
                            maxWidth: 56,
                            maxHeight: 56,
                            background: "rgba(99, 102, 241, 0.15)",
                            border: "1.5px solid rgba(99, 102, 241, 0.3)",
                          }}
                        />
                        <span className="text-[8px] text-muted mt-1">variance</span>
                      </div>
                    )}
                    {result.randomized.exploration_rate != null && (
                      <div className="flex flex-col items-center">
                        <DonutChart
                          segments={[
                            { label: "explore", value: result.randomized.exploration_rate, color: "#f59e0b" },
                            { label: "exploit", value: 1 - result.randomized.exploration_rate, color: "var(--border-color)" },
                          ]}
                          size={48}
                          strokeWidth={8}
                        />
                        <span className="text-[8px] text-muted mt-1">explore/exploit</span>
                      </div>
                    )}
                    {result.randomized.best_action && (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-medium text-emerald-400 px-2 py-1 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/20">
                          {result.randomized.best_action}
                        </span>
                        <span className="text-[8px] text-muted mt-1">best</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 5. Similarity clusters as visual bubbles */}
          {result.similarity?.clusters && result.similarity.clusters.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardContent>
                  <span className="text-[10px] uppercase tracking-wider text-muted block mb-3">clusters</span>
                  <div className="flex flex-wrap gap-3">
                    {result.similarity.clusters.map((c, i) => {
                      const members = c.members || c.series_names || [];
                      const color = CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <div
                          key={i}
                          className="rounded-[var(--radius)] p-3"
                          style={{ background: `${color}10`, border: `1px solid ${color}30` }}
                        >
                          <div className="flex flex-wrap gap-1">
                            {members.map((m) => (
                              <span
                                key={m}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                                style={{ background: `${color}20`, color }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 6. Decoded output - minimal, just the summary if present */}
          {result.decoded?.summary && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardContent>
                  <p className="text-sm text-muted leading-relaxed">{result.decoded.summary}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Completed but no result */}
      {isCompleted && !result && (
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted">No results generated.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Failed with stages */}
      {run.status === "failed" && run.stages?.length > 0 && (
        <motion.div variants={staggerItem}>
          <PipelineProgressVisual stages={run.stages} />
        </motion.div>
      )}
    </motion.div>
  );
}
