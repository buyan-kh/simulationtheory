"""FastAPI server for the SP26 prediction engine.

Dependencies (add to pyproject.toml):
  - fastapi
  - uvicorn
  - sse-starlette
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from typing import Any, AsyncGenerator, Callable, Awaitable

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from sp26.api.models import (
    ChartDataResponse,
    ChartSeriesResponse,
    PredictionsResponse,
    RunDetailResponse,
    RunListResponse,
    RunStatus,
    RunSubmitRequest,
    RunSubmitResponse,
    RunSummary,
    StageEvent,
    StageInfo,
    StageStatus,
)
from sp26.api.store import RunStore
from sp26.config import SP26Config
from sp26.types import (
    ChartResult,
    DecodedOutput,
    EmbedResult,
    GameTheoryResult,
    IngestResult,
    PathResult,
    PipelineResult,
    PredictionResult,
    RandomizedResult,
    RawInput,
    SimilarityResult,
)

# Type alias for the stage callback
StageCallback = Callable[[str, str, float | None, str | None], Awaitable[None]]


async def run_pipeline_with_hooks(
    raw_input: RawInput,
    config: SP26Config,
    on_stage: StageCallback,
) -> tuple[PipelineResult, int | None, list[Any]]:
    """Run the pipeline with per-stage callbacks for progress tracking.

    Returns (result, chart_id, ingest_series) so the server can store chart data.
    """
    from sp26.ingest.auto import AutoIngestor
    from sp26.embed.openai import OpenAIEmbedder
    from sp26.chart.builder import ChartBuilder
    from sp26.similarity.engine import SimilarityEngine
    from sp26.predict.predictor import Predictor
    from sp26.gametheory.engine import GameTheoryEngine
    from sp26.decode.decoder import Decoder
    from sp26.paths.explorer import PathExplorer
    from sp26.randomize.montecarlo import MonteCarloRandomizer

    ingestor = AutoIngestor(config)
    embedder = OpenAIEmbedder(config)
    chart_builder = ChartBuilder(config)
    similarity = SimilarityEngine(config)
    predictor = Predictor(config)
    game_theory = GameTheoryEngine(config)
    decoder = Decoder(config)
    path_explorer = PathExplorer(config)
    randomizer = MonteCarloRandomizer(config)

    chart_id = None
    ingest_series: list[Any] = []

    async def _run_stage(name: str, fn: Callable[[], Any]) -> Any:
        await on_stage(name, "running", None, None)
        t0 = time.monotonic()
        try:
            result = fn()
            if asyncio.iscoroutine(result):
                result = await result
            duration_ms = (time.monotonic() - t0) * 1000
            await on_stage(name, "complete", duration_ms, None)
            return result
        except Exception as exc:
            duration_ms = (time.monotonic() - t0) * 1000
            await on_stage(name, "failed", duration_ms, str(exc))
            raise

    # Stage 1: Ingest
    ingest_result: IngestResult = await _run_stage(
        "ingest", lambda: ingestor.ingest(raw_input)
    )
    ingest_series = list(ingest_result.series)

    # Stage 2: Embed
    embed_result: EmbedResult = await _run_stage(
        "embed", lambda: embedder.embed(ingest_result)
    )

    # Stage 3: Chart
    chart_result: ChartResult = await _run_stage(
        "chart", lambda: chart_builder.build(embed_result)
    )
    chart_id = chart_result.chart_id

    # Stage 4: Similarity
    similarity_result: SimilarityResult = await _run_stage(
        "similarity", lambda: similarity.compute(embed_result, chart_result)
    )

    # Stage 5: Predict
    prediction_result: PredictionResult = await _run_stage(
        "predict", lambda: predictor.predict(similarity_result, embed_result)
    )

    # Feedback loop
    game_result: GameTheoryResult | None = None
    decoded: DecodedOutput | None = None
    path_result: PathResult | None = None
    randomized: RandomizedResult | None = None
    current_predictions = prediction_result

    for iteration in range(config.feedback_iterations):
        game_result = await _run_stage(
            "gametheory", lambda: game_theory.analyze(current_predictions)
        )
        decoded = await _run_stage(
            "decode", lambda: decoder.decode(
                game_result, current_predictions, context=ingest_result.raw_text
            )
        )
        path_result = await _run_stage(
            "paths",
            lambda: path_explorer.explore(game_result, chart_result, similarity_result),
        )
        randomized = await _run_stage(
            "randomize",
            lambda: randomizer.randomize(game_result, path_result, current_predictions),
        )

        if randomized.sampled_outcomes:
            current_predictions = PredictionResult(
                predictions=randomized.sampled_outcomes,
                chart_id=chart_result.chart_id,
            )

    result = PipelineResult(
        input_summary=ingest_result.raw_text[:200],
        predictions=current_predictions.predictions,
        game_theory=game_result,
        decoded=decoded,
        paths=path_result,
        randomized=randomized,
        iterations_run=config.feedback_iterations,
    )

    return result, chart_id, ingest_series


def create_app(config: SP26Config | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    cfg = config or SP26Config()
    store = RunStore()

    app = FastAPI(
        title="SP26 — Game-Theoretic Prediction Engine",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Expose store on app state for testing
    app.state.store = store
    app.state.config = cfg

    # ── POST /api/run ─────────────────────────────────────────────
    @app.post("/api/run", response_model=RunSubmitResponse)
    async def submit_run(body: RunSubmitRequest) -> RunSubmitResponse:
        run_id = uuid.uuid4().hex[:12]
        record = await store.create(run_id, body.format)

        raw_input = RawInput(
            content=body.content,
            format=body.format,
            metadata=body.metadata,
        )

        async def _execute() -> None:
            await store.update_status(run_id, RunStatus.RUNNING)

            async def on_stage(
                name: str,
                status: str,
                duration_ms: float | None,
                error: str | None,
            ) -> None:
                stage_status = StageStatus(status)
                stage_info = StageInfo(
                    name=name,
                    status=stage_status,
                    duration_ms=duration_ms,
                    error=error,
                )
                await store.add_stage(run_id, stage_info)
                event = StageEvent(
                    stage=name,
                    status=status,
                    duration_ms=duration_ms,
                    error=error,
                ).model_dump()
                rec = await store.get(run_id)
                if rec:
                    await rec.publish(event)

            try:
                result, chart_id, ingest_series = await run_pipeline_with_hooks(
                    raw_input, cfg, on_stage
                )
                if chart_id is not None:
                    await store.set_chart_data(run_id, chart_id, ingest_series)
                await store.set_result(run_id, result)
                await store.update_status(run_id, RunStatus.COMPLETED)
                # Publish completion event
                rec = await store.get(run_id)
                if rec:
                    await rec.publish({"stage": "pipeline", "status": "complete"})
            except Exception as exc:
                await store.set_error(run_id, str(exc))
                await store.update_status(run_id, RunStatus.FAILED)
                rec = await store.get(run_id)
                if rec:
                    await rec.publish(
                        {"stage": "pipeline", "status": "failed", "error": str(exc)}
                    )

        asyncio.create_task(_execute())

        return RunSubmitResponse(run_id=run_id, status=RunStatus.PENDING)

    # ── GET /api/runs ─────────────────────────────────────────────
    @app.get("/api/runs", response_model=RunListResponse)
    async def list_runs() -> RunListResponse:
        records = await store.list_all()
        summaries = [
            RunSummary(
                run_id=r.run_id,
                status=r.status,
                input_format=r.input_format,
                created_at=r.created_at,
                completed_at=r.completed_at,
                error=r.error,
            )
            for r in records
        ]
        return RunListResponse(runs=summaries, total=len(summaries))

    # ── GET /api/runs/{run_id} ────────────────────────────────────
    @app.get("/api/runs/{run_id}", response_model=RunDetailResponse)
    async def get_run(run_id: str) -> RunDetailResponse:
        record = await store.get(run_id)
        if not record:
            raise HTTPException(status_code=404, detail="Run not found")
        return RunDetailResponse(
            run_id=record.run_id,
            status=record.status,
            input_format=record.input_format,
            created_at=record.created_at,
            completed_at=record.completed_at,
            stages=record.stages,
            result=record.result,
            error=record.error,
        )

    # ── GET /api/runs/{run_id}/chart ──────────────────────────────
    @app.get("/api/runs/{run_id}/chart", response_model=ChartDataResponse)
    async def get_chart(run_id: str) -> ChartDataResponse:
        record = await store.get(run_id)
        if not record:
            raise HTTPException(status_code=404, detail="Run not found")
        series = [
            ChartSeriesResponse(
                name=s.name,
                points=s.points,
                metadata=s.metadata,
            )
            for s in record.chart_series
        ]
        return ChartDataResponse(
            run_id=run_id,
            chart_id=record.chart_id,
            series=series,
        )

    # ── GET /api/runs/{run_id}/predictions ────────────────────────
    @app.get("/api/runs/{run_id}/predictions", response_model=PredictionsResponse)
    async def get_predictions(run_id: str) -> PredictionsResponse:
        record = await store.get(run_id)
        if not record:
            raise HTTPException(status_code=404, detail="Run not found")
        predictions = record.result.predictions if record.result else []
        return PredictionsResponse(run_id=run_id, predictions=predictions)

    # ── GET /api/stream/{run_id} — SSE ────────────────────────────
    @app.get("/api/stream/{run_id}")
    async def stream_run(run_id: str) -> EventSourceResponse:
        record = await store.get(run_id)
        if not record:
            raise HTTPException(status_code=404, detail="Run not found")

        async def event_generator() -> AsyncGenerator[dict[str, str], None]:
            # Send current stages as catch-up events
            for stage in record.stages:
                yield {
                    "event": "stage",
                    "data": json.dumps(
                        StageEvent(
                            stage=stage.name,
                            status=stage.status.value,
                            duration_ms=stage.duration_ms,
                            error=stage.error,
                        ).model_dump()
                    ),
                }

            # If already done, send final event and stop
            if record.status in (RunStatus.COMPLETED, RunStatus.FAILED):
                yield {
                    "event": "done",
                    "data": json.dumps({"status": record.status.value}),
                }
                return

            # Subscribe to live events
            q = record.subscribe()
            try:
                while True:
                    event = await q.get()
                    yield {
                        "event": "stage",
                        "data": json.dumps(event),
                    }
                    if event.get("stage") == "pipeline":
                        yield {
                            "event": "done",
                            "data": json.dumps({"status": event.get("status")}),
                        }
                        return
            finally:
                record.unsubscribe(q)

        return EventSourceResponse(event_generator())

    # ── WebSocket /ws/pipeline/{run_id} ───────────────────────────
    @app.websocket("/ws/pipeline/{run_id}")
    async def ws_pipeline(websocket: WebSocket, run_id: str) -> None:
        record = await store.get(run_id)
        if not record:
            await websocket.close(code=4004, reason="Run not found")
            return

        await websocket.accept()

        # Send current stages as catch-up
        for stage in record.stages:
            await websocket.send_json(
                StageEvent(
                    stage=stage.name,
                    status=stage.status.value,
                    duration_ms=stage.duration_ms,
                    error=stage.error,
                ).model_dump()
            )

        # If already done, send final and close
        if record.status in (RunStatus.COMPLETED, RunStatus.FAILED):
            await websocket.send_json(
                {"stage": "pipeline", "status": record.status.value}
            )
            await websocket.close()
            return

        # Subscribe to live events
        q = record.subscribe()
        try:
            while True:
                event = await q.get()
                await websocket.send_json(event)
                if event.get("stage") == "pipeline":
                    await websocket.close()
                    return
        except WebSocketDisconnect:
            pass
        finally:
            record.unsubscribe(q)

    return app


# Convenience: running with `python -m sp26.api.server`
if __name__ == "__main__":
    import uvicorn
    from pathlib import Path

    # Load .env file if present
    env_path = Path(__file__).resolve().parents[3] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    application = create_app()
    uvicorn.run(application, host="0.0.0.0", port=8000)
