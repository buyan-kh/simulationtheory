"""Epsilon-greedy exploration strategy."""

from __future__ import annotations

import random
import uuid

from sp26.config import SP26Config
from sp26.types import Prediction, PredictionResult, RandomizedResult


class EpsilonGreedyRandomizer:
    """Epsilon-greedy exploration: exploit the best prediction with (1-epsilon)
    probability, explore a random one with epsilon probability."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def select(
        self,
        prediction_result: PredictionResult,
        num_selections: int = 10,
    ) -> RandomizedResult:
        predictions = prediction_result.predictions
        if not predictions:
            return RandomizedResult(sampled_outcomes=[])

        # Sort by confidence
        sorted_preds = sorted(predictions, key=lambda p: p.confidence, reverse=True)
        best = sorted_preds[0]

        rng = random.Random()
        selections: list[Prediction] = []
        selection_counts: dict[str, int] = {}

        for _ in range(num_selections):
            if rng.random() < self._config.epsilon:
                # Explore: pick random
                chosen = rng.choice(predictions)
            else:
                # Exploit: pick best
                chosen = best

            selection_counts[chosen.id] = selection_counts.get(chosen.id, 0) + 1

        for pred in predictions:
            count = selection_counts.get(pred.id, 0)
            if count > 0:
                selections.append(Prediction(
                    id=str(uuid.uuid4())[:8],
                    description=pred.description,
                    confidence=count / num_selections,
                    reasoning=f"Epsilon-greedy: selected {count}/{num_selections} times. {pred.reasoning}",
                    source_series=pred.source_series,
                ))

        selections.sort(key=lambda p: p.confidence, reverse=True)

        mean_conf = sum(p.confidence for p in selections) / max(1, len(selections))
        variance = sum((p.confidence - mean_conf) ** 2 for p in selections) / max(1, len(selections))

        return RandomizedResult(
            sampled_outcomes=selections,
            mean_confidence=mean_conf,
            variance=variance,
            exploration_rate=self._config.epsilon,
        )
