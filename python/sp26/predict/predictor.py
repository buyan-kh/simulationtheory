"""Prediction module — generates predictions from graph state and similarity clusters."""

from __future__ import annotations

import uuid

from sp26.config import SP26Config
from sp26.types import (
    EmbedResult,
    Prediction,
    PredictionResult,
    SimilarityResult,
)


class Predictor:
    """Generates predictions from similarity analysis and embeddings."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def predict(
        self, similarity_result: SimilarityResult, embed_result: EmbedResult
    ) -> PredictionResult:
        predictions: list[Prediction] = []
        entity_map = {e.id: e for e in embed_result.entities}

        # Prediction from clusters: entities in the same cluster are likely to interact
        for cluster in similarity_result.clusters:
            if len(cluster.entity_ids) < 2:
                continue

            labels = [
                entity_map[eid].label
                for eid in cluster.entity_ids
                if eid in entity_map
            ]
            if not labels:
                continue

            confidence = min(0.9, 0.3 + 0.1 * len(labels))
            predictions.append(Prediction(
                id=str(uuid.uuid4())[:8],
                description=f"Entities [{', '.join(labels[:5])}] are likely to interact or evolve together",
                confidence=confidence,
                reasoning=f"Cluster of {len(labels)} related entities with high embedding similarity",
                source_entities=cluster.entity_ids[:5],
            ))

        # Prediction from high-similarity pairs
        for pair in sorted(similarity_result.pairs, key=lambda p: p.score, reverse=True)[
            : self._config.max_predictions
        ]:
            label_a = entity_map.get(pair.entity_a)
            label_b = entity_map.get(pair.entity_b)
            if label_a and label_b:
                predictions.append(Prediction(
                    id=str(uuid.uuid4())[:8],
                    description=f"'{label_a.label}' and '{label_b.label}' will likely have a strong interaction",
                    confidence=pair.score,
                    reasoning=f"High cosine similarity ({pair.score:.3f}) between embeddings",
                    source_entities=[pair.entity_a, pair.entity_b],
                ))

        # Limit total predictions
        predictions = predictions[: self._config.max_predictions]

        # Ensure at least one prediction
        if not predictions:
            predictions.append(Prediction(
                id=str(uuid.uuid4())[:8],
                description="Insufficient data for specific predictions; system is in observation mode",
                confidence=0.1,
                reasoning="No strong similarity patterns detected",
            ))

        return PredictionResult(
            predictions=predictions,
            graph_id=similarity_result.graph_id,
        )
