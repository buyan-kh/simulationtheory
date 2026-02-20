export interface DataPoint {
  index: number;
  value: number;
  label?: string;
}

export interface DataSeries {
  name: string;
  points: DataPoint[];
  metadata?: Record<string, string>;
}

export interface IngestResult {
  series: DataSeries[];
  source_format: string;
  total_points: number;
}

export interface EmbedResult {
  series_name: string;
  embedding: number[];
  text_summary: string;
}

export interface ChartResult {
  chart_id: string;
  series_count: number;
  total_points: number;
}

export interface SimilarityPair {
  series_a: string;
  series_b: string;
  score: number;
}

export interface Cluster {
  name: string;
  members: string[];
}

export interface SimilarityResult {
  pairs: SimilarityPair[];
  clusters: Cluster[];
}

export interface Prediction {
  description: string;
  confidence: number;
  source_series: string;
}

export interface PredictionResult {
  predictions: Prediction[];
}

export interface Strategy {
  name: string;
  description: string;
  payoff: number;
}

export interface PlayerStrategy {
  player: string;
  strategies: Strategy[];
  optimal: string;
}

export interface Equilibrium {
  type: string;
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
}

export interface GameTheoryResult {
  players: PlayerStrategy[];
  equilibria: Equilibrium[];
  dominant_strategies: Record<string, string>;
}

export interface DecodedOutput {
  summary: string;
  details: string[];
  recommendations: string[];
}

export interface PathNode {
  series_name: string;
  similarity: number;
  depth: number;
}

export interface ExploredPath {
  nodes: PathNode[];
  total_similarity: number;
}

export interface PathResult {
  paths: ExploredPath[];
  explored_count: number;
}

export interface RandomizedResult {
  method: string;
  iterations: number;
  results: Record<string, number>;
  best_action: string;
}

export interface PipelineStage {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  duration_ms?: number;
  error?: string;
}

export interface PipelineResult {
  ingest: IngestResult;
  embeddings: EmbedResult[];
  chart: ChartResult;
  similarity: SimilarityResult;
  predictions: PredictionResult;
  game_theory: GameTheoryResult;
  decoded: DecodedOutput;
  paths: PathResult;
  randomized: RandomizedResult;
}

// Backend API response types

/** Matches backend RunSummary */
export interface RunSummary {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  input_format: "auto" | "text" | "csv" | "json";
  created_at: string;
  completed_at?: string | null;
  error?: string | null;
}

/** Matches backend RunDetailResponse */
export interface PipelineRun {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  input_format: "auto" | "text" | "csv" | "json";
  created_at: string;
  completed_at?: string | null;
  stages: PipelineStage[];
  result?: PipelineResult | null;
  error?: string | null;
}

/** Matches backend RunSubmitResponse */
export interface RunSubmitResponse {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
}

/** Matches backend RunListResponse */
export interface RunListResponse {
  runs: RunSummary[];
  total: number;
}
