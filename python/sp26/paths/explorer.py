"""Path explorer — generates possible future paths using the Rust backend."""

from __future__ import annotations

import json

from sp26.config import SP26Config
from sp26.types import (
    ChartResult,
    ExploredPath,
    GameTheoryResult,
    PathNode,
    PathResult,
    SimilarityResult,
)

try:
    from sp26._core import paths as _paths
except ImportError:
    _paths = None


class PathExplorer:
    """Explores possible future paths through the prediction space."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def explore(
        self,
        game_result: GameTheoryResult,
        chart_result: ChartResult,
        similarity_result: SimilarityResult,
    ) -> PathResult:
        if _paths is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        # Build adjacency from similarity pairs + clusters
        adjacency, all_nodes = self._build_adjacency(similarity_result)

        values: dict[str, float] = {name: 0.0 for name in all_nodes}

        # Assign values from ranked predictions
        for i, pred in enumerate(game_result.ranked_predictions):
            for sname in pred.source_series:
                if sname in values:
                    values[sname] = max(values[sname], pred.confidence * (1.0 - 0.1 * i))

        if not all_nodes:
            return PathResult(paths=[], best_path=None)

        adj_json = json.dumps(adjacency)
        values_json = json.dumps(values)
        start = sorted(all_nodes)[0]

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

    def _build_adjacency(
        self, similarity_result: SimilarityResult
    ) -> tuple[dict[str, list[str]], set[str]]:
        """Build adjacency from similarity pairs and clusters."""
        adjacency: dict[str, list[str]] = {}
        all_nodes: set[str] = set()

        # From similarity pairs: bidirectional adjacency
        for pair in similarity_result.pairs:
            all_nodes.add(pair.series_a)
            all_nodes.add(pair.series_b)
            adjacency.setdefault(pair.series_a, []).append(pair.series_b)
            adjacency.setdefault(pair.series_b, []).append(pair.series_a)

        # From clusters: all series in a cluster are adjacent to each other
        for cluster in similarity_result.clusters:
            for name in cluster.series_names:
                all_nodes.add(name)
            for i, a in enumerate(cluster.series_names):
                for b in cluster.series_names[i + 1 :]:
                    if b not in adjacency.get(a, []):
                        adjacency.setdefault(a, []).append(b)
                    if a not in adjacency.get(b, []):
                        adjacency.setdefault(b, []).append(a)

        # Ensure all nodes appear in adjacency
        for node in all_nodes:
            adjacency.setdefault(node, [])

        return adjacency, all_nodes
