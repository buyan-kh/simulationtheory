"""Shared fixtures for SP26 tests."""

from __future__ import annotations

import pytest

from sp26.config import SP26Config
from sp26.types import (
    DataPoint,
    DataSeries,
    EmbedResult,
    EmbeddedSeries,
    IngestResult,
    Prediction,
    PredictionResult,
)


@pytest.fixture
def config() -> SP26Config:
    return SP26Config(
        openai_api_key="test-key",
        anthropic_api_key="test-key",
        embedding_dimension=4,
        num_clusters=2,
        feedback_iterations=1,
        monte_carlo_samples=100,
        mcts_simulations=10,
        max_path_depth=3,
    )


@pytest.fixture
def sample_series() -> list[DataSeries]:
    return [
        DataSeries(
            name="price",
            points=[
                DataPoint(index=0.0, value=100.0),
                DataPoint(index=1.0, value=105.0),
                DataPoint(index=2.0, value=110.0),
            ],
            metadata={"source": "csv"},
        ),
        DataSeries(
            name="volume",
            points=[
                DataPoint(index=0.0, value=1000.0),
                DataPoint(index=1.0, value=1200.0),
                DataPoint(index=2.0, value=900.0),
            ],
            metadata={"source": "csv"},
        ),
        DataSeries(
            name="sentiment",
            points=[
                DataPoint(index=0.0, value=0.8),
                DataPoint(index=1.0, value=0.6),
                DataPoint(index=2.0, value=0.9),
            ],
            metadata={"source": "csv"},
        ),
    ]


@pytest.fixture
def sample_ingest_result(sample_series: list[DataSeries]) -> IngestResult:
    return IngestResult(
        series=sample_series,
        raw_text="price,volume,sentiment\n100,1000,0.8\n105,1200,0.6\n110,900,0.9",
    )


@pytest.fixture
def sample_embeddings() -> list[list[float]]:
    return [
        [1.0, 0.0, 0.0, 0.0],
        [0.8, 0.6, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
    ]


@pytest.fixture
def sample_embed_result(
    sample_series: list[DataSeries],
    sample_embeddings: list[list[float]],
) -> EmbedResult:
    return EmbedResult(
        series=[
            EmbeddedSeries(
                name=s.name,
                points=s.points,
                embedding=emb,
                metadata=s.metadata,
            )
            for s, emb in zip(sample_series, sample_embeddings)
        ],
        dimension=4,
    )


@pytest.fixture
def sample_predictions() -> list[Prediction]:
    return [
        Prediction(
            id="p1",
            description="price and volume will move together",
            confidence=0.8,
            reasoning="High similarity",
            source_series=["price", "volume"],
        ),
        Prediction(
            id="p2",
            description="sentiment acts independently",
            confidence=0.5,
            reasoning="Low cluster overlap",
            source_series=["sentiment"],
        ),
    ]


@pytest.fixture
def sample_prediction_result(sample_predictions: list[Prediction]) -> PredictionResult:
    return PredictionResult(predictions=sample_predictions, chart_id=1)
