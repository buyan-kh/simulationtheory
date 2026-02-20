"""Inter-stage Pydantic types for the SP26 pipeline."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Stage 1: Ingestion ──────────────────────────────────────────────

class InputFormat(str, Enum):
    TEXT = "text"
    CSV = "csv"
    JSON = "json"
    AUTO = "auto"


class RawInput(BaseModel):
    """Raw input to the pipeline."""
    content: str
    format: InputFormat = InputFormat.AUTO
    metadata: dict[str, Any] = Field(default_factory=dict)


class DataPoint(BaseModel):
    """A single data point in a series."""
    index: float
    value: float


class DataSeries(BaseModel):
    """A named series of data points."""
    name: str
    points: list[DataPoint] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestResult(BaseModel):
    """Output of the ingestion stage."""
    series: list[DataSeries]
    raw_text: str = ""


# ── Stage 2: Embedding ──────────────────────────────────────────────

class EmbeddedSeries(BaseModel):
    """A data series with its embedding vector."""
    name: str
    points: list[DataPoint] = Field(default_factory=list)
    embedding: list[float]
    metadata: dict[str, Any] = Field(default_factory=dict)


class EmbedResult(BaseModel):
    """Output of the embedding stage."""
    series: list[EmbeddedSeries]
    dimension: int


# ── Stage 3: Chart ─────────────────────────────────────────────────

class ChartResult(BaseModel):
    """Output of the chart construction stage."""
    chart_id: int
    series_count: int
    total_points: int


# ── Stage 4: Similarity ─────────────────────────────────────────────

class SimilarityPair(BaseModel):
    """A pair of series with their similarity score."""
    series_a: str
    series_b: str
    score: float
    metric: str = "cosine"


class Cluster(BaseModel):
    """A cluster of series."""
    cluster_id: int
    series_names: list[str]
    centroid: list[float] | None = None


class SimilarityResult(BaseModel):
    """Output of the similarity stage."""
    pairs: list[SimilarityPair]
    clusters: list[Cluster]
    chart_id: int


# ── Stage 5: Prediction ─────────────────────────────────────────────

class Prediction(BaseModel):
    """A single prediction about what happens next."""
    id: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = ""
    source_series: list[str] = Field(default_factory=list)


class PredictionResult(BaseModel):
    """Output of the prediction stage."""
    predictions: list[Prediction]
    chart_id: int


# ── Stage 6: Game Theory ────────────────────────────────────────────

class Strategy(BaseModel):
    """A strategy in a game."""
    name: str
    probability: float = Field(ge=0.0, le=1.0)
    prediction_id: str = ""


class PlayerStrategy(BaseModel):
    """Strategy profile for a player."""
    player: str
    strategies: list[Strategy]


class Equilibrium(BaseModel):
    """A Nash equilibrium."""
    profiles: list[PlayerStrategy]
    payoff: tuple[float, float] = (0.0, 0.0)


class GameTheoryResult(BaseModel):
    """Output of the game theory stage."""
    equilibria: list[Equilibrium] = Field(default_factory=list)
    dominant_strategies: dict[str, str | None] = Field(default_factory=dict)
    minimax_value: float | None = None
    ranked_predictions: list[Prediction] = Field(default_factory=list)


# ── Stage 7: Decode ─────────────────────────────────────────────────

class DecodedOutput(BaseModel):
    """Natural language output from the decoder."""
    summary: str
    detailed_analysis: str = ""
    key_findings: list[str] = Field(default_factory=list)


# ── Stage 8: Paths ──────────────────────────────────────────────────

class PathNode(BaseModel):
    """A node in an explored path."""
    id: str
    label: str
    value: float = 0.0


class ExploredPath(BaseModel):
    """A path through the prediction space."""
    nodes: list[PathNode]
    total_value: float = 0.0
    probability: float = 0.0


class PathResult(BaseModel):
    """Output of the path exploration stage."""
    paths: list[ExploredPath]
    best_path: ExploredPath | None = None


# ── Stage 9: Randomize ──────────────────────────────────────────────

class RandomizedResult(BaseModel):
    """Output of the randomization stage."""
    sampled_outcomes: list[Prediction]
    mean_confidence: float = 0.0
    variance: float = 0.0
    exploration_rate: float = 0.0


# ── Pipeline ─────────────────────────────────────────────────────────

class PipelineResult(BaseModel):
    """Final output of the full pipeline."""
    input_summary: str = ""
    predictions: list[Prediction] = Field(default_factory=list)
    game_theory: GameTheoryResult | None = None
    decoded: DecodedOutput | None = None
    paths: PathResult | None = None
    randomized: RandomizedResult | None = None
    iterations_run: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
