"""Tests for randomization strategies."""

from sp26.config import SP26Config
from sp26.randomize.epsilon_greedy import EpsilonGreedyRandomizer
from sp26.randomize.montecarlo import MonteCarloRandomizer
from sp26.types import (
    GameTheoryResult,
    PathResult,
    Prediction,
    PredictionResult,
)


class TestMonteCarloRandomizer:
    def test_basic_sampling(self):
        config = SP26Config(monte_carlo_samples=1000)
        randomizer = MonteCarloRandomizer(config)

        predictions = PredictionResult(
            predictions=[
                Prediction(id="p1", description="A", confidence=0.9, source_entities=["e1"]),
                Prediction(id="p2", description="B", confidence=0.1, source_entities=["e2"]),
            ],
            graph_id=1,
        )

        result = randomizer.randomize(
            GameTheoryResult(), PathResult(paths=[]), predictions
        )

        assert len(result.sampled_outcomes) >= 1
        # Higher confidence prediction should be sampled more
        confs = {p.description: p.confidence for p in result.sampled_outcomes}
        assert confs.get("A", 0) > confs.get("B", 0)

    def test_empty_predictions(self):
        config = SP26Config()
        randomizer = MonteCarloRandomizer(config)

        result = randomizer.randomize(
            GameTheoryResult(),
            PathResult(paths=[]),
            PredictionResult(predictions=[], graph_id=1),
        )
        assert result.sampled_outcomes == []

    def test_statistics(self):
        config = SP26Config(monte_carlo_samples=500)
        randomizer = MonteCarloRandomizer(config)

        predictions = PredictionResult(
            predictions=[
                Prediction(id="p1", description="A", confidence=0.5),
                Prediction(id="p2", description="B", confidence=0.5),
            ],
            graph_id=1,
        )

        result = randomizer.randomize(
            GameTheoryResult(), PathResult(paths=[]), predictions
        )

        assert result.mean_confidence > 0
        assert result.variance >= 0


class TestEpsilonGreedyRandomizer:
    def test_mostly_exploits_best(self):
        config = SP26Config(epsilon=0.1)
        randomizer = EpsilonGreedyRandomizer(config)

        predictions = PredictionResult(
            predictions=[
                Prediction(id="p1", description="Best", confidence=0.95),
                Prediction(id="p2", description="Worst", confidence=0.05),
            ],
            graph_id=1,
        )

        result = randomizer.select(predictions, num_selections=100)

        # Best should be selected much more often
        best_outcome = next(
            (p for p in result.sampled_outcomes if "Best" in p.description), None
        )
        assert best_outcome is not None
        assert best_outcome.confidence > 0.5

    def test_epsilon_zero_always_exploits(self):
        config = SP26Config(epsilon=0.0)
        randomizer = EpsilonGreedyRandomizer(config)

        predictions = PredictionResult(
            predictions=[
                Prediction(id="p1", description="Best", confidence=0.9),
                Prediction(id="p2", description="Other", confidence=0.1),
            ],
            graph_id=1,
        )

        result = randomizer.select(predictions, num_selections=50)

        # With epsilon=0, should always select best
        assert len(result.sampled_outcomes) == 1
        assert "Best" in result.sampled_outcomes[0].description
        assert result.sampled_outcomes[0].confidence == 1.0

    def test_empty_predictions(self):
        config = SP26Config()
        randomizer = EpsilonGreedyRandomizer(config)

        result = randomizer.select(
            PredictionResult(predictions=[], graph_id=1)
        )
        assert result.sampled_outcomes == []

    def test_exploration_rate_in_result(self):
        config = SP26Config(epsilon=0.2)
        randomizer = EpsilonGreedyRandomizer(config)

        predictions = PredictionResult(
            predictions=[
                Prediction(id="p1", description="A", confidence=0.7),
            ],
            graph_id=1,
        )

        result = randomizer.select(predictions)
        assert result.exploration_rate == 0.2
