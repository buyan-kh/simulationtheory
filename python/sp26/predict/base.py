"""Base predictor protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sp26.types import EmbedResult, PredictionResult, SimilarityResult


@runtime_checkable
class PredictorProtocol(Protocol):
    """Protocol for prediction modules."""

    def predict(
        self, similarity_result: SimilarityResult, embed_result: EmbedResult
    ) -> PredictionResult:
        ...
