"""Pipeline orchestrator for SP26."""

from __future__ import annotations

from sp26.config import SP26Config
from sp26.types import (
    DecodedOutput,
    EmbedResult,
    GameTheoryResult,
    GraphResult,
    IngestResult,
    PathResult,
    PipelineResult,
    PredictionResult,
    RandomizedResult,
    RawInput,
    SimilarityResult,
)
from sp26.ingest.auto import AutoIngestor
from sp26.embed.openai import OpenAIEmbedder
from sp26.graph.builder import GraphBuilder
from sp26.similarity.engine import SimilarityEngine
from sp26.predict.predictor import Predictor
from sp26.gametheory.engine import GameTheoryEngine
from sp26.decode.decoder import Decoder
from sp26.paths.explorer import PathExplorer
from sp26.randomize.montecarlo import MonteCarloRandomizer


class Pipeline:
    """Orchestrates the full SP26 prediction pipeline."""

    def __init__(self, config: SP26Config | None = None) -> None:
        self.config = config or SP26Config()
        self._ingestor = AutoIngestor()
        self._embedder = OpenAIEmbedder(self.config)
        self._graph_builder = GraphBuilder(self.config)
        self._similarity = SimilarityEngine(self.config)
        self._predictor = Predictor(self.config)
        self._game_theory = GameTheoryEngine(self.config)
        self._decoder = Decoder(self.config)
        self._path_explorer = PathExplorer(self.config)
        self._randomizer = MonteCarloRandomizer(self.config)

    async def run(self, raw_input: RawInput) -> PipelineResult:
        """Run the full pipeline on the given input."""
        # Stage 1: Ingest
        ingest_result: IngestResult = self._ingestor.ingest(raw_input)

        # Stage 2: Embed
        embed_result: EmbedResult = await self._embedder.embed(ingest_result)

        # Stage 3: Graph
        graph_result: GraphResult = self._graph_builder.build(embed_result)

        # Stage 4: Similarity
        similarity_result: SimilarityResult = self._similarity.compute(
            embed_result, graph_result
        )

        # Stage 5: Predict
        prediction_result: PredictionResult = self._predictor.predict(
            similarity_result, embed_result
        )

        # Feedback loop: Game Theory ↔ Randomizer
        game_result: GameTheoryResult | None = None
        decoded: DecodedOutput | None = None
        path_result: PathResult | None = None
        randomized: RandomizedResult | None = None

        current_predictions = prediction_result
        for iteration in range(self.config.feedback_iterations):
            # Stage 6: Game Theory
            game_result = self._game_theory.analyze(current_predictions)

            # Stage 7: Decode
            decoded = await self._decoder.decode(game_result, current_predictions)

            # Stage 8: Paths
            path_result = self._path_explorer.explore(game_result, graph_result)

            # Stage 9: Randomize (feeds back into game theory on next iteration)
            randomized = self._randomizer.randomize(
                game_result, path_result, current_predictions
            )

            # Update predictions for next iteration with randomized results
            if randomized.sampled_outcomes:
                current_predictions = PredictionResult(
                    predictions=randomized.sampled_outcomes,
                    graph_id=graph_result.graph_id,
                )

        return PipelineResult(
            input_summary=ingest_result.raw_text[:200],
            predictions=current_predictions.predictions,
            game_theory=game_result,
            decoded=decoded,
            paths=path_result,
            randomized=randomized,
            iterations_run=self.config.feedback_iterations,
        )
