"""Path explorer — generates possible future paths using the Rust backend."""

from __future__ import annotations

import json

from sp26.config import SP26Config
from sp26.types import (
    ExploredPath,
    GameTheoryResult,
    GraphResult,
    PathNode,
    PathResult,
)

try:
    from sp26._core import graph as _graph
    from sp26._core import paths as _paths
except ImportError:
    _graph = None
    _paths = None


class PathExplorer:
    """Explores possible future paths through the prediction graph."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def explore(
        self,
        game_result: GameTheoryResult,
        graph_result: GraphResult,
    ) -> PathResult:
        if _graph is None or _paths is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        # Build adjacency list from graph
        node_ids = _graph.get_all_node_ids(graph_result.graph_id)
        adjacency: dict[str, list[str]] = {}
        values: dict[str, float] = {}

        for nid in node_ids:
            neighbors = _graph.get_neighbors(graph_result.graph_id, nid)
            adjacency[nid] = neighbors
            values[nid] = 0.0

        # Assign values from ranked predictions
        for i, pred in enumerate(game_result.ranked_predictions):
            for eid in pred.source_entities:
                if eid in values:
                    values[eid] = max(values[eid], pred.confidence * (1.0 - 0.1 * i))

        if not node_ids:
            return PathResult(paths=[], best_path=None)

        adj_json = json.dumps(adjacency)
        values_json = json.dumps(values)
        start = node_ids[0]

        # BFS paths
        raw_paths = _paths.bfs_paths(adj_json, start, self._config.max_path_depth)

        # MCTS for value-weighted exploration
        mcts_results = _paths.mcts_search(
            adj_json, values_json, start,
            self._config.mcts_simulations,
            self._config.max_path_depth,
        )
        mcts_values = {nid: avg_val for nid, _, avg_val in mcts_results}

        # Convert to ExploredPath objects
        explored: list[ExploredPath] = []
        for raw_path in raw_paths:
            nodes = [
                PathNode(
                    id=nid,
                    label=nid,
                    value=mcts_values.get(nid, values.get(nid, 0.0)),
                )
                for nid in raw_path
            ]
            total = sum(n.value for n in nodes)
            explored.append(ExploredPath(
                nodes=nodes,
                total_value=total,
                probability=total / max(1.0, len(nodes)),
            ))

        # Sort by total value
        explored.sort(key=lambda p: p.total_value, reverse=True)
        best = explored[0] if explored else None

        return PathResult(paths=explored, best_path=best)
