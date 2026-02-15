"""Python wrapper around Rust graph builder."""

from __future__ import annotations

import json

from sp26.config import SP26Config
from sp26.types import EmbedResult, GraphResult

try:
    from sp26._core import graph as _graph
except ImportError:
    _graph = None


class GraphBuilder:
    """Builds a graph from embedded entities using the Rust backend."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def build(self, embed_result: EmbedResult) -> GraphResult:
        if _graph is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        nodes_json = [
            json.dumps({
                "id": e.id,
                "label": e.label,
                "embedding": e.embedding,
                "metadata": e.attributes if isinstance(e.attributes, dict) else {},
            })
            for e in embed_result.entities
        ]

        edges_json = [
            json.dumps({
                "source": r.source_id,
                "target": r.target_id,
                "weight": r.weight,
                "relation": r.relation,
            })
            for r in embed_result.relationships
        ]

        handle = _graph.create_graph(nodes_json, edges_json)
        node_count = _graph.get_node_count(handle.id)
        edge_count = _graph.get_edge_count(handle.id)

        return GraphResult(
            graph_id=handle.id,
            node_count=node_count,
            edge_count=edge_count,
        )
