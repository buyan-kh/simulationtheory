"""Monte Carlo randomization for robustness testing."""

from __future__ import annotations

import random
import uuid

import numpy as np

from sp26.config import SP26Config
from sp26.types import (
    GameTheoryResult,
    PathResult,
    Prediction,
    PredictionResult,
    RandomizedResult,
)


class MonteCarloRandomizer:
    """Monte Carlo sampling over predictions for robustness analysis."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def randomize(
        self,
        game_result: GameTheoryResult,
        path_result: PathResult,
        prediction_result: PredictionResult,
    ) -> RandomizedResult:
        predictions = prediction_result.predictions
        if not predictions:
            return RandomizedResult(sampled_outcomes=[])

        confidences = np.array([p.confidence for p in predictions])
        total = confidences.sum()
        if total == 0:
            probs = np.ones(len(predictions)) / len(predictions)
        else:
            probs = confidences / total

        # Monte Carlo sampling
        sampled: list[Prediction] = []
        sample_counts: dict[str, int] = {}
        rng = random.Random()

        for _ in range(self._config.monte_carlo_samples):
            idx = rng.choices(range(len(predictions)), weights=probs.tolist(), k=1)[0]
            sample_counts[predictions[idx].id] = sample_counts.get(predictions[idx].id, 0) + 1

        # Create sampled outcomes with adjusted confidence
        for pred in predictions:
            count = sample_counts.get(pred.id, 0)
            if count > 0:
                adjusted_confidence = count / self._config.monte_carlo_samples
                sampled.append(Prediction(
                    id=str(uuid.uuid4())[:8],
                    description=pred.description,
                    confidence=adjusted_confidence,
                    reasoning=f"Monte Carlo: {count}/{self._config.monte_carlo_samples} samples ({adjusted_confidence:.1%}). Original: {pred.reasoning}",
                    source_series=pred.source_series,
                ))

        # Sort by adjusted confidence
        sampled.sort(key=lambda p: p.confidence, reverse=True)

        # Compute statistics
        sampled_confs = [p.confidence for p in sampled]
        mean_conf = float(np.mean(sampled_confs)) if sampled_confs else 0.0
        variance = float(np.var(sampled_confs)) if sampled_confs else 0.0

        return RandomizedResult(
            sampled_outcomes=sampled,
            mean_confidence=mean_conf,
            variance=variance,
            exploration_rate=self._config.epsilon,
        )
