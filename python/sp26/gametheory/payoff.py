"""Payoff matrix construction from predictions."""

from __future__ import annotations

from sp26.types import Prediction


def build_payoff_matrix(
    predictions: list[Prediction],
) -> tuple[int, int, list[float], list[float]]:
    """Build a 2-player payoff matrix from predictions.

    Player 1 = "nature/system" choosing which prediction comes true.
    Player 2 = "agent" choosing which prediction to prepare for.

    Payoff for Player 1: confidence of prediction i if it's the one that occurs.
    Payoff for Player 2: how well preparation j matches outcome i.
    """
    n = len(predictions)
    if n == 0:
        return (0, 0, [], [])

    p1_payoffs: list[float] = []
    p2_payoffs: list[float] = []

    for i in range(n):
        for j in range(n):
            # Player 1's payoff: confidence of the occurring prediction
            p1_payoffs.append(predictions[i].confidence)

            # Player 2's payoff: 1.0 if correctly predicted, scaled by confidence overlap otherwise
            if i == j:
                p2_payoffs.append(predictions[j].confidence)
            else:
                # Partial credit based on shared source series
                overlap = len(
                    set(predictions[i].source_series) & set(predictions[j].source_series)
                )
                total = max(
                    1,
                    len(set(predictions[i].source_series) | set(predictions[j].source_series)),
                )
                p2_payoffs.append(predictions[j].confidence * overlap / total)

    return (n, n, p1_payoffs, p2_payoffs)
