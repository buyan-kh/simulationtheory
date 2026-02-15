"""Game theory engine — orchestrates Rust game theory computations."""

from __future__ import annotations

from sp26.config import SP26Config
from sp26.gametheory.payoff import build_payoff_matrix
from sp26.types import (
    Equilibrium,
    GameTheoryResult,
    PlayerStrategy,
    Prediction,
    PredictionResult,
    Strategy,
)

try:
    from sp26._core import gametheory as _gt
except ImportError:
    _gt = None


class GameTheoryEngine:
    """Applies game-theoretic reasoning to rank and evaluate predictions."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def analyze(self, prediction_result: PredictionResult) -> GameTheoryResult:
        predictions = prediction_result.predictions[: self._config.max_strategies]

        if not predictions:
            return GameTheoryResult()

        rows, cols, p1_payoffs, p2_payoffs = build_payoff_matrix(predictions)

        if _gt is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        # Find Nash equilibria
        raw_equilibria = _gt.find_nash_equilibria(rows, cols, p1_payoffs, p2_payoffs)
        equilibria = self._parse_equilibria(raw_equilibria, predictions)

        # Find dominant strategies
        dom = _gt.find_dominant_strategies(rows, cols, p1_payoffs, p2_payoffs)
        dominant_strategies = {
            "nature": predictions[dom[0]].id if dom[0] is not None else None,
            "agent": predictions[dom[1]].id if dom[1] is not None else None,
        }

        # Minimax (using p1 payoffs as zero-sum approximation)
        minimax_value, best_row, best_col = _gt.minimax_solve(rows, cols, p1_payoffs)

        # Rank predictions by their equilibrium support
        ranked = self._rank_predictions(predictions, raw_equilibria)

        return GameTheoryResult(
            equilibria=equilibria,
            dominant_strategies=dominant_strategies,
            minimax_value=minimax_value,
            ranked_predictions=ranked,
        )

    def _parse_equilibria(
        self,
        raw: list[tuple[list[float], list[float]]],
        predictions: list[Prediction],
    ) -> list[Equilibrium]:
        equilibria = []
        for p1_strat, p2_strat in raw:
            profiles = [
                PlayerStrategy(
                    player="nature",
                    strategies=[
                        Strategy(
                            name=predictions[i].id,
                            probability=p,
                            prediction_id=predictions[i].id,
                        )
                        for i, p in enumerate(p1_strat)
                        if p > 1e-10
                    ],
                ),
                PlayerStrategy(
                    player="agent",
                    strategies=[
                        Strategy(
                            name=predictions[j].id,
                            probability=q,
                            prediction_id=predictions[j].id,
                        )
                        for j, q in enumerate(p2_strat)
                        if q > 1e-10
                    ],
                ),
            ]
            equilibria.append(Equilibrium(profiles=profiles))
        return equilibria

    def _rank_predictions(
        self,
        predictions: list[Prediction],
        equilibria: list[tuple[list[float], list[float]]],
    ) -> list[Prediction]:
        """Rank predictions by their total probability weight across all equilibria."""
        scores: dict[int, float] = {i: 0.0 for i in range(len(predictions))}
        for p1_strat, p2_strat in equilibria:
            for i, p in enumerate(p1_strat):
                scores[i] += p
            for j, q in enumerate(p2_strat):
                scores[j] += q

        ranked_indices = sorted(scores.keys(), key=lambda i: scores[i], reverse=True)
        return [predictions[i] for i in ranked_indices]
