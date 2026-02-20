"""Tests for Pydantic types."""

from sp26.types import (
    ChartResult,
    Cluster,
    DataPoint,
    DataSeries,
    DecodedOutput,
    EmbeddedSeries,
    Equilibrium,
    ExploredPath,
    GameTheoryResult,
    IngestResult,
    InputFormat,
    PathNode,
    PathResult,
    PipelineResult,
    PlayerStrategy,
    Prediction,
    PredictionResult,
    RandomizedResult,
    RawInput,
    SimilarityPair,
    SimilarityResult,
    Strategy,
)


def test_raw_input_defaults():
    ri = RawInput(content="hello world")
    assert ri.format == InputFormat.AUTO
    assert ri.metadata == {}


def test_raw_input_explicit_format():
    ri = RawInput(content="a,b\n1,2", format=InputFormat.CSV)
    assert ri.format == InputFormat.CSV


def test_data_point():
    dp = DataPoint(index=0.0, value=42.5)
    assert dp.index == 0.0
    assert dp.value == 42.5


def test_data_series():
    ds = DataSeries(
        name="price",
        points=[DataPoint(index=0.0, value=100.0), DataPoint(index=1.0, value=105.0)],
    )
    assert ds.name == "price"
    assert len(ds.points) == 2


def test_data_series_serialization():
    ds = DataSeries(name="test", points=[DataPoint(index=0.0, value=1.0)])
    data = ds.model_dump()
    assert data["name"] == "test"
    ds2 = DataSeries.model_validate(data)
    assert ds2 == ds


def test_ingest_result():
    ir = IngestResult(
        series=[DataSeries(name="s1", points=[])],
        raw_text="test",
    )
    assert len(ir.series) == 1


def test_embedded_series():
    es = EmbeddedSeries(name="test", embedding=[1.0, 2.0, 3.0])
    assert len(es.embedding) == 3


def test_chart_result():
    cr = ChartResult(chart_id=1, series_count=3, total_points=10)
    assert cr.series_count == 3


def test_similarity_pair():
    sp = SimilarityPair(series_a="a", series_b="b", score=0.95)
    assert sp.metric == "cosine"


def test_cluster():
    c = Cluster(cluster_id=0, series_names=["a", "b"])
    assert len(c.series_names) == 2


def test_prediction_confidence_bounds():
    p = Prediction(id="p1", description="test", confidence=0.5)
    assert 0.0 <= p.confidence <= 1.0


def test_strategy():
    s = Strategy(name="cooperate", probability=0.7, prediction_id="p1")
    assert s.probability == 0.7


def test_equilibrium():
    eq = Equilibrium(
        profiles=[
            PlayerStrategy(
                player="p1",
                strategies=[Strategy(name="a", probability=1.0)],
            ),
        ],
    )
    assert len(eq.profiles) == 1


def test_game_theory_result_defaults():
    gtr = GameTheoryResult()
    assert gtr.equilibria == []
    assert gtr.minimax_value is None


def test_decoded_output():
    do = DecodedOutput(
        summary="test summary",
        key_findings=["finding1"],
    )
    assert len(do.key_findings) == 1


def test_path_result():
    pr = PathResult(
        paths=[
            ExploredPath(
                nodes=[PathNode(id="n1", label="start", value=1.0)],
                total_value=1.0,
            )
        ],
    )
    assert len(pr.paths) == 1


def test_randomized_result():
    rr = RandomizedResult(sampled_outcomes=[], mean_confidence=0.5)
    assert rr.exploration_rate == 0.0


def test_pipeline_result_defaults():
    pr = PipelineResult()
    assert pr.iterations_run == 0
    assert pr.predictions == []


def test_json_round_trip():
    """Verify all types can serialize to JSON and back."""
    pr = PipelineResult(
        input_summary="test",
        predictions=[
            Prediction(id="p1", description="test", confidence=0.5),
        ],
        game_theory=GameTheoryResult(
            equilibria=[],
            minimax_value=1.0,
        ),
        decoded=DecodedOutput(summary="summary"),
        paths=PathResult(paths=[]),
        randomized=RandomizedResult(sampled_outcomes=[]),
        iterations_run=3,
    )
    json_str = pr.model_dump_json()
    restored = PipelineResult.model_validate_json(json_str)
    assert restored.input_summary == "test"
    assert len(restored.predictions) == 1
    assert restored.iterations_run == 3
