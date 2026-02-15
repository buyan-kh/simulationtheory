"""Shared fixtures for SP26 tests."""

from __future__ import annotations

import pytest

from sp26.config import SP26Config
from sp26.types import (
    EmbedResult,
    EmbeddedEntity,
    Entity,
    IngestResult,
    Prediction,
    PredictionResult,
    Relationship,
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
def sample_entities() -> list[Entity]:
    return [
        Entity(id="e1", label="Alice", entity_type="person"),
        Entity(id="e2", label="Bob", entity_type="person"),
        Entity(id="e3", label="Charlie", entity_type="person"),
    ]


@pytest.fixture
def sample_relationships() -> list[Relationship]:
    return [
        Relationship(source_id="e1", target_id="e2", relation="knows"),
        Relationship(source_id="e2", target_id="e3", relation="knows"),
    ]


@pytest.fixture
def sample_ingest_result(
    sample_entities: list[Entity], sample_relationships: list[Relationship]
) -> IngestResult:
    return IngestResult(
        entities=sample_entities,
        relationships=sample_relationships,
        raw_text="Alice knows Bob. Bob knows Charlie.",
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
    sample_entities: list[Entity],
    sample_relationships: list[Relationship],
    sample_embeddings: list[list[float]],
) -> EmbedResult:
    return EmbedResult(
        entities=[
            EmbeddedEntity(
                id=e.id,
                label=e.label,
                entity_type=e.entity_type,
                embedding=emb,
            )
            for e, emb in zip(sample_entities, sample_embeddings)
        ],
        relationships=sample_relationships,
        dimension=4,
    )


@pytest.fixture
def sample_predictions() -> list[Prediction]:
    return [
        Prediction(
            id="p1",
            description="Alice and Bob will interact",
            confidence=0.8,
            reasoning="High similarity",
            source_entities=["e1", "e2"],
        ),
        Prediction(
            id="p2",
            description="Charlie acts independently",
            confidence=0.5,
            reasoning="Low cluster overlap",
            source_entities=["e3"],
        ),
    ]


@pytest.fixture
def sample_prediction_result(sample_predictions: list[Prediction]) -> PredictionResult:
    return PredictionResult(predictions=sample_predictions, graph_id=1)
