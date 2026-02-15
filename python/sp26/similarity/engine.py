"""Python wrapper around Rust similarity engine."""

from __future__ import annotations

from sp26.config import SP26Config
from sp26.types import (
    Cluster,
    EmbedResult,
    GraphResult,
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

    def compute(self, embed_result: EmbedResult, graph_result: GraphResult) -> SimilarityResult:
        if _sim is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        entities = embed_result.entities
        if not entities:
            return SimilarityResult(pairs=[], clusters=[], graph_id=graph_result.graph_id)

        vectors = [e.embedding for e in entities]

        # Compute pairwise cosine similarity
        n = len(vectors)
        flat_sim = _sim.cosine_similarity_matrix(vectors)

        pairs: list[SimilarityPair] = []
        for i in range(n):
            for j in range(i + 1, n):
                score = flat_sim[i * n + j]
                if score >= self._config.similarity_threshold:
                    pairs.append(SimilarityPair(
                        entity_a=entities[i].id,
                        entity_b=entities[j].id,
                        score=score,
                        metric="cosine",
                    ))

        # Cluster
        k = min(self._config.num_clusters, n)
        assignments = _sim.kmeans_cluster(vectors, k, self._config.kmeans_max_iters)

        clusters_map: dict[int, list[str]] = {}
        for idx, cluster_id in enumerate(assignments):
            clusters_map.setdefault(cluster_id, []).append(entities[idx].id)

        clusters = [
            Cluster(cluster_id=cid, entity_ids=eids)
            for cid, eids in sorted(clusters_map.items())
        ]

        return SimilarityResult(
            pairs=pairs,
            clusters=clusters,
            graph_id=graph_result.graph_id,
        )
