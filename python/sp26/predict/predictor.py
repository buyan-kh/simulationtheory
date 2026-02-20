"""Prediction module — generates predictions from chart state and similarity clusters."""

from __future__ import annotations

import uuid

from sp26.config import SP26Config
from sp26.types import (
    EmbedResult,
    EmbeddedSeries,
    Prediction,
    PredictionResult,
    SimilarityResult,
)


class Predictor:
    """Generates predictions from similarity analysis and embedded series."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def predict(
        self, similarity_result: SimilarityResult, embed_result: EmbedResult
    ) -> PredictionResult:
        predictions: list[Prediction] = []
        series_map = {s.name: s for s in embed_result.series}

        # Prediction from clusters: series in the same cluster show correlated behavior
        for cluster in similarity_result.clusters:
            if len(cluster.series_names) < 2:
                continue

            names = [
                name for name in cluster.series_names if name in series_map
            ]
            if not names:
                continue

            # Analyze trends for series in this cluster
            trends = []
            for name in names[:5]:
                s = series_map[name]
                trend = self._detect_trend(s)
                trends.append(f"{name} ({trend})")

            confidence = min(0.9, 0.3 + 0.1 * len(names))
            predictions.append(Prediction(
                id=str(uuid.uuid4())[:8],
                description=(
                    f"Series [{', '.join(names[:5])}] show correlated behavior "
                    f"and are likely to move together"
                ),
                confidence=confidence,
                reasoning=f"Cluster of {len(names)} related series with high embedding similarity",
                source_series=cluster.series_names[:5],
            ))

        # Prediction from high-similarity pairs
        for pair in sorted(similarity_result.pairs, key=lambda p: p.score, reverse=True)[
            : self._config.max_predictions
        ]:
            series_a = series_map.get(pair.series_a)
            series_b = series_map.get(pair.series_b)
            if series_a and series_b:
                trend_a = self._detect_trend(series_a)
                trend_b = self._detect_trend(series_b)
                predictions.append(Prediction(
                    id=str(uuid.uuid4())[:8],
                    description=(
                        f"'{pair.series_a}' ({trend_a}) and '{pair.series_b}' ({trend_b}) "
                        f"will likely continue in sync"
                    ),
                    confidence=pair.score,
                    reasoning=f"High cosine similarity ({pair.score:.3f}) between series embeddings",
                    source_series=[pair.series_a, pair.series_b],
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
            chart_id=similarity_result.chart_id,
        )

    @staticmethod
    def _detect_trend(series: EmbeddedSeries) -> str:
        """Simple trend detection for a series."""
        points = series.points
        if len(points) < 2:
            return "stable"
        values = [p.value for p in points]
        n = len(values)
        first_half = values[: n // 2]
        second_half = values[n // 2 :]
        first_mean = sum(first_half) / len(first_half)
        second_mean = sum(second_half) / len(second_half)
        if second_mean > first_mean * 1.05:
            return "rising"
        elif second_mean < first_mean * 0.95:
            return "falling"
        return "stable"
