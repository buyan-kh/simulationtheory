"""Tests for Pydantic types."""

from sp26.types import (
    Cluster,
    DecodedOutput,
    EmbeddedEntity,
    Entity,
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
    Relationship,
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


def test_entity_serialization():
    e = Entity(id="e1", label="Test", entity_type="noun")
    data = e.model_dump()
    assert data["id"] == "e1"
    assert data["label"] == "Test"
    e2 = Entity.model_validate(data)
    assert e2 == e


def test_relationship():
    r = Relationship(source_id="a", target_id="b", relation="knows", weight=0.9)
    assert r.weight == 0.9


def test_ingest_result():
    ir = IngestResult(
        entities=[Entity(id="e1", label="A")],
        relationships=[],
        raw_text="test",
    )
    assert len(ir.entities) == 1


def test_embedded_entity():
    ee = EmbeddedEntity(id="e1", label="Test", embedding=[1.0, 2.0, 3.0])
    assert len(ee.embedding) == 3


def test_similarity_pair():
    sp = SimilarityPair(entity_a="a", entity_b="b", score=0.95)
    assert sp.metric == "cosine"


def test_cluster():
    c = Cluster(cluster_id=0, entity_ids=["a", "b"])
    assert len(c.entity_ids) == 2


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
