"""Python wrapper around Rust similarity engine."""

from __future__ import annotations

from sp26.config import SP26Config
from sp26.types import (
    ChartResult,
    Cluster,
    EmbedResult,
    SimilarityPair,
    SimilarityResult,
)

try:
    from sp26._core import similarity as _sim
except ImportError:
    _sim = None


class SimilarityEngine:
    """Computes similarities and clusters using the Rust backend."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def compute(self, embed_result: EmbedResult, chart_result: ChartResult) -> SimilarityResult:
        if _sim is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        all_series = embed_result.series
        if not all_series:
            return SimilarityResult(pairs=[], clusters=[], chart_id=chart_result.chart_id)

        vectors = [s.embedding for s in all_series]

        # Compute pairwise cosine similarity
        n = len(vectors)
        flat_sim = _sim.cosine_similarity_matrix(vectors)

        pairs: list[SimilarityPair] = []
        for i in range(n):
            for j in range(i + 1, n):
                score = flat_sim[i * n + j]
                if score >= self._config.similarity_threshold:
                    pairs.append(SimilarityPair(
                        series_a=all_series[i].name,
                        series_b=all_series[j].name,
                        score=score,
                        metric="cosine",
                    ))

        # Cluster
        k = min(self._config.num_clusters, n)
        assignments = _sim.kmeans_cluster(vectors, k, self._config.kmeans_max_iters)

        clusters_map: dict[int, list[str]] = {}
        for idx, cluster_id in enumerate(assignments):
            clusters_map.setdefault(cluster_id, []).append(all_series[idx].name)

        clusters = [
            Cluster(cluster_id=cid, series_names=names)
            for cid, names in sorted(clusters_map.items())
        ]

        return SimilarityResult(
            pairs=pairs,
            clusters=clusters,
            chart_id=chart_result.chart_id,
        )
