"""Base game theory protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sp26.types import GameTheoryResult, PredictionResult


@runtime_checkable
class GameTheoryProtocol(Protocol):
    """Protocol for game theory engines."""

    def analyze(self, prediction_result: PredictionResult) -> GameTheoryResult:
        ...
