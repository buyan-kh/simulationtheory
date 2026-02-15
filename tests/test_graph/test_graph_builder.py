"""Tests for graph construction."""

import pytest

from sp26._core import graph as _graph
from sp26.config import SP26Config
from sp26.graph.builder import GraphBuilder
from sp26.types import EmbedResult, EmbeddedEntity, Relationship


@pytest.fixture
def graph_builder(config: SP26Config) -> GraphBuilder:
    return GraphBuilder(config)


@pytest.fixture
def embed_result() -> EmbedResult:
    return EmbedResult(
        entities=[
            EmbeddedEntity(id="e1", label="Alice", embedding=[1.0, 0.0, 0.0, 0.0]),
            EmbeddedEntity(id="e2", label="Bob", embedding=[0.0, 1.0, 0.0, 0.0]),
            EmbeddedEntity(id="e3", label="Charlie", embedding=[0.0, 0.0, 1.0, 0.0]),
        ],
        relationships=[
            Relationship(source_id="e1", target_id="e2", relation="knows"),
            Relationship(source_id="e2", target_id="e3", relation="knows"),
        ],
        dimension=4,
    )


def test_build_graph(graph_builder: GraphBuilder, embed_result: EmbedResult):
    result = graph_builder.build(embed_result)
    assert result.node_count == 3
    assert result.edge_count == 2
    assert result.graph_id > 0
    _graph.drop_graph(result.graph_id)


def test_graph_neighbors(graph_builder: GraphBuilder, embed_result: EmbedResult):
    result = graph_builder.build(embed_result)
    neighbors = _graph.get_neighbors(result.graph_id, "e1")
    assert "e2" in neighbors

    neighbors_e2 = _graph.get_neighbors(result.graph_id, "e2")
    assert "e3" in neighbors_e2

    _graph.drop_graph(result.graph_id)


def test_graph_embedding_retrieval(graph_builder: GraphBuilder, embed_result: EmbedResult):
    result = graph_builder.build(embed_result)
    emb = _graph.get_node_embedding(result.graph_id, "e1")
    assert emb == [1.0, 0.0, 0.0, 0.0]
    _graph.drop_graph(result.graph_id)
