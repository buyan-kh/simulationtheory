"""Tests for prediction module."""

from sp26.config import SP26Config
from sp26.predict.predictor import Predictor
from sp26.types import (
    Cluster,
    EmbedResult,
    EmbeddedEntity,
    Relationship,
    SimilarityPair,
    SimilarityResult,
)


def test_predictor_from_clusters():
    config = SP26Config(embedding_dimension=4, max_predictions=10)
    predictor = Predictor(config)

    embed_result = EmbedResult(
        entities=[
            EmbeddedEntity(id="e1", label="Alice", embedding=[1.0, 0.0, 0.0, 0.0]),
            EmbeddedEntity(id="e2", label="Bob", embedding=[0.0, 1.0, 0.0, 0.0]),
            EmbeddedEntity(id="e3", label="Charlie", embedding=[0.0, 0.0, 1.0, 0.0]),
        ],
        relationships=[],
        dimension=4,
    )

    similarity_result = SimilarityResult(
        pairs=[],
        clusters=[
            Cluster(cluster_id=0, entity_ids=["e1", "e2"]),
            Cluster(cluster_id=1, entity_ids=["e3"]),
        ],
        graph_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) >= 1
    # Cluster with 2 entities should produce a prediction
    assert any("Alice" in p.description and "Bob" in p.description for p in result.predictions)


def test_predictor_from_similarity_pairs():
    config = SP26Config(embedding_dimension=4, max_predictions=10)
    predictor = Predictor(config)

    embed_result = EmbedResult(
        entities=[
            EmbeddedEntity(id="e1", label="Alpha", embedding=[1.0, 0.0, 0.0, 0.0]),
            EmbeddedEntity(id="e2", label="Beta", embedding=[0.0, 1.0, 0.0, 0.0]),
        ],
        relationships=[],
        dimension=4,
    )

    similarity_result = SimilarityResult(
        pairs=[
            SimilarityPair(entity_a="e1", entity_b="e2", score=0.95),
        ],
        clusters=[],
        graph_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) >= 1
    assert any("Alpha" in p.description and "Beta" in p.description for p in result.predictions)


def test_predictor_empty_data():
    config = SP26Config()
    predictor = Predictor(config)

    embed_result = EmbedResult(entities=[], relationships=[], dimension=4)
    similarity_result = SimilarityResult(pairs=[], clusters=[], graph_id=1)

    result = predictor.predict(similarity_result, embed_result)
    # Should produce at least one fallback prediction
    assert len(result.predictions) == 1
    assert result.predictions[0].confidence == 0.1


def test_predictor_respects_max_predictions():
    config = SP26Config(max_predictions=2)
    predictor = Predictor(config)

    entities = [
        EmbeddedEntity(id=f"e{i}", label=f"Entity{i}", embedding=[float(i)] * 4)
        for i in range(10)
    ]
    embed_result = EmbedResult(entities=entities, relationships=[], dimension=4)

    pairs = [
        SimilarityPair(entity_a=f"e{i}", entity_b=f"e{i+1}", score=0.9 - i * 0.05)
        for i in range(9)
    ]
    similarity_result = SimilarityResult(
        pairs=pairs,
        clusters=[Cluster(cluster_id=0, entity_ids=[f"e{i}" for i in range(10)])],
        graph_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) <= 2
