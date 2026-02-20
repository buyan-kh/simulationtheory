"""SP26 configuration."""

from __future__ import annotations

import os

from pydantic import BaseModel, Field


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


class SP26Config(BaseModel):
    """Configuration for the SP26 pipeline."""

    # API keys (read from environment by default)
    openai_api_key: str = Field(default_factory=lambda: _env("OPENAI_API_KEY"))
    anthropic_api_key: str = Field(default_factory=lambda: _env("ANTHROPIC_API_KEY"))

    # Embedding
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536

    # Graph
    similarity_threshold: float = 0.7

    # Game theory
    max_strategies: int = 10

    # Pipeline
    feedback_iterations: int = 3
    max_predictions: int = 20

    # Path exploration
    max_path_depth: int = 5
    mcts_simulations: int = 100

    # Randomization
    monte_carlo_samples: int = 1000
    epsilon: float = 0.1

    # Clustering
    num_clusters: int = 5
    kmeans_max_iters: int = 100

    # NL Ingestion
    nl_ingest_model: str = "claude-sonnet-4-5-20250929"
    nl_max_factors: int = 8
    nl_max_ingest_tokens: int = 1024

    # Decode
    decode_model: str = "claude-sonnet-4-5-20250929"
    max_decode_tokens: int = 1024
