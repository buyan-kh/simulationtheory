"""Tests for prediction module."""

from sp26.config import SP26Config
from sp26.predict.predictor import Predictor
from sp26.types import (
    Cluster,
    DataPoint,
    EmbedResult,
    EmbeddedSeries,
    SimilarityPair,
    SimilarityResult,
)


def test_predictor_from_clusters():
    config = SP26Config(embedding_dimension=4, max_predictions=10)
    predictor = Predictor(config)

    embed_result = EmbedResult(
        series=[
            EmbeddedSeries(name="price", embedding=[1.0, 0.0, 0.0, 0.0],
                           points=[DataPoint(index=0.0, value=100.0)]),
            EmbeddedSeries(name="volume", embedding=[0.0, 1.0, 0.0, 0.0],
                           points=[DataPoint(index=0.0, value=5000.0)]),
            EmbeddedSeries(name="sentiment", embedding=[0.0, 0.0, 1.0, 0.0],
                           points=[DataPoint(index=0.0, value=0.8)]),
        ],
        dimension=4,
    )

    similarity_result = SimilarityResult(
        pairs=[],
        clusters=[
            Cluster(cluster_id=0, series_names=["price", "volume"]),
            Cluster(cluster_id=1, series_names=["sentiment"]),
        ],
        chart_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) >= 1
    # Cluster with 2 series should produce a prediction
    assert any("price" in p.description and "volume" in p.description for p in result.predictions)


def test_predictor_from_similarity_pairs():
    config = SP26Config(embedding_dimension=4, max_predictions=10)
    predictor = Predictor(config)

    embed_result = EmbedResult(
        series=[
            EmbeddedSeries(name="alpha", embedding=[1.0, 0.0, 0.0, 0.0],
                           points=[DataPoint(index=0.0, value=10.0), DataPoint(index=1.0, value=15.0)]),
            EmbeddedSeries(name="beta", embedding=[0.0, 1.0, 0.0, 0.0],
                           points=[DataPoint(index=0.0, value=20.0), DataPoint(index=1.0, value=25.0)]),
        ],
        dimension=4,
    )

    similarity_result = SimilarityResult(
        pairs=[
            SimilarityPair(series_a="alpha", series_b="beta", score=0.95),
        ],
        clusters=[],
        chart_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) >= 1
    assert any("alpha" in p.description and "beta" in p.description for p in result.predictions)


def test_predictor_empty_data():
    config = SP26Config()
    predictor = Predictor(config)

    embed_result = EmbedResult(series=[], dimension=4)
    similarity_result = SimilarityResult(pairs=[], clusters=[], chart_id=1)

    result = predictor.predict(similarity_result, embed_result)
    # Should produce at least one fallback prediction
    assert len(result.predictions) == 1
    assert result.predictions[0].confidence == 0.1


def test_predictor_respects_max_predictions():
    config = SP26Config(max_predictions=2)
    predictor = Predictor(config)

    series_list = [
        EmbeddedSeries(name=f"s{i}", embedding=[float(i)] * 4,
                       points=[DataPoint(index=0.0, value=float(i))])
        for i in range(10)
    ]
    embed_result = EmbedResult(series=series_list, dimension=4)

    pairs = [
        SimilarityPair(series_a=f"s{i}", series_b=f"s{i+1}", score=0.9 - i * 0.05)
        for i in range(9)
    ]
    similarity_result = SimilarityResult(
        pairs=pairs,
        clusters=[Cluster(cluster_id=0, series_names=[f"s{i}" for i in range(10)])],
        chart_id=1,
    )

    result = predictor.predict(similarity_result, embed_result)
    assert len(result.predictions) <= 2
