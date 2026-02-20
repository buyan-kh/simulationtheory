"""Comprehensive tests for the SP26 API server endpoints."""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from sp26.api.models import RunStatus, StageInfo, StageStatus
from sp26.api.server import create_app
from sp26.api.store import RunStore
from sp26.config import SP26Config
from sp26.types import (
    DataPoint,
    DataSeries,
    DecodedOutput,
    ExploredPath,
    GameTheoryResult,
    InputFormat,
    PathNode,
    PathResult,
    PipelineResult,
    Prediction,
    RandomizedResult,
)


@pytest.fixture
def config() -> SP26Config:
    return SP26Config(
        openai_api_key="test-key",
        anthropic_api_key="test-key",
        embedding_dimension=4,
        feedback_iterations=1,
    )


@pytest.fixture
def app(config: SP26Config) -> MagicMock:
    return create_app(config)


@pytest.fixture
async def client(app: MagicMock) -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _make_pipeline_result() -> PipelineResult:
    return PipelineResult(
        input_summary="test input",
        predictions=[
            Prediction(
                id="p1",
                description="price goes up",
                confidence=0.8,
                reasoning="trend",
                source_series=["price"],
            ),
        ],
        game_theory=GameTheoryResult(
            equilibria=[],
            dominant_strategies={},
            minimax_value=0.5,
            ranked_predictions=[],
        ),
        decoded=DecodedOutput(
            summary="test summary",
            detailed_analysis="detailed",
            key_findings=["finding1"],
        ),
        paths=PathResult(
            paths=[
                ExploredPath(
                    nodes=[PathNode(id="n1", label="start", value=1.0)],
                    total_value=1.0,
                    probability=0.5,
                )
            ],
            best_path=None,
        ),
        randomized=RandomizedResult(
            sampled_outcomes=[],
            mean_confidence=0.7,
            variance=0.1,
            exploration_rate=0.1,
        ),
        iterations_run=1,
    )


def _make_ingest_series() -> list[DataSeries]:
    return [
        DataSeries(
            name="price",
            points=[
                DataPoint(index=0.0, value=100.0),
                DataPoint(index=1.0, value=105.0),
            ],
            metadata={"source": "test"},
        ),
    ]


# ── Helper: submit a run and wait for pipeline completion ──────────


async def _submit_and_wait(
    client: AsyncClient,
    content: str = "test",
    fmt: str = "text",
    sleep: float = 0.15,
) -> str:
    """Submit a run and return the run_id after waiting for background task."""
    resp = await client.post("/api/run", json={"content": content, "format": fmt})
    run_id = resp.json()["run_id"]
    await asyncio.sleep(sleep)
    return run_id


# ── POST /api/run ──────────────────────────────────────────────────


class TestSubmitRun:
    async def test_submit_returns_run_id(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            resp = await client.post(
                "/api/run",
                json={"content": "test data", "format": "text"},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert "run_id" in data
            assert data["status"] == "pending"
            assert len(data["run_id"]) == 12

    async def test_submit_with_auto_format(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            resp = await client.post(
                "/api/run",
                json={"content": "some,csv,data\n1,2,3"},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "pending"

    async def test_submit_with_csv_format(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            resp = await client.post(
                "/api/run",
                json={"content": "a,b\n1,2", "format": "csv"},
            )

            assert resp.status_code == 200
            assert resp.json()["status"] == "pending"

    async def test_submit_with_json_format(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            resp = await client.post(
                "/api/run",
                json={"content": '{"key": "value"}', "format": "json"},
            )

            assert resp.status_code == 200
            assert resp.json()["status"] == "pending"

    async def test_submit_with_metadata(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            resp = await client.post(
                "/api/run",
                json={
                    "content": "test",
                    "format": "text",
                    "metadata": {"tag": "demo"},
                },
            )

            assert resp.status_code == 200

    async def test_submit_invalid_body(self, client: AsyncClient) -> None:
        resp = await client.post("/api/run", json={})
        assert resp.status_code == 422

    async def test_submit_missing_content(self, client: AsyncClient) -> None:
        resp = await client.post("/api/run", json={"format": "text"})
        assert resp.status_code == 422

    async def test_submit_pipeline_called_with_correct_args(
        self, client: AsyncClient
    ) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            await client.post(
                "/api/run",
                json={"content": "hello world", "format": "text"},
            )

            await asyncio.sleep(0.1)
            mock_run.assert_called_once()
            call_args = mock_run.call_args
            raw_input = call_args[0][0]
            assert raw_input.content == "hello world"
            assert raw_input.format == InputFormat.TEXT


# ── GET /api/runs ──────────────────────────────────────────────────


class TestListRuns:
    async def test_list_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/runs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["runs"] == []
        assert data["total"] == 0

    async def test_list_after_submit(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            await client.post(
                "/api/run", json={"content": "test", "format": "text"}
            )
            await asyncio.sleep(0.05)

            resp = await client.get("/api/runs")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] >= 1
            run = data["runs"][0]
            assert "run_id" in run
            assert "created_at" in run
            assert run["input_format"] == "text"

    async def test_list_multiple_runs(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            await client.post(
                "/api/run", json={"content": "test1", "format": "text"}
            )
            await client.post(
                "/api/run", json={"content": "test2", "format": "csv"}
            )
            await asyncio.sleep(0.1)

            resp = await client.get("/api/runs")
            data = resp.json()
            assert data["total"] == 2
            assert len(data["runs"]) == 2

    async def test_list_shows_correct_status(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            await client.post(
                "/api/run", json={"content": "test", "format": "text"}
            )
            await asyncio.sleep(0.15)

            resp = await client.get("/api/runs")
            data = resp.json()
            assert data["runs"][0]["status"] == "completed"

    async def test_list_shows_failed_status(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.side_effect = RuntimeError("boom")

            await client.post(
                "/api/run", json={"content": "test", "format": "text"}
            )
            await asyncio.sleep(0.15)

            resp = await client.get("/api/runs")
            data = resp.json()
            assert data["runs"][0]["status"] == "failed"
            assert data["runs"][0]["error"] is not None


# ── GET /api/runs/{run_id} ────────────────────────────────────────


class TestGetRun:
    async def test_get_nonexistent_run(self, client: AsyncClient) -> None:
        resp = await client.get("/api/runs/nonexistent")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Run not found"

    async def test_get_completed_run(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["run_id"] == run_id
            assert data["status"] == "completed"
            assert data["result"] is not None
            assert data["result"]["input_summary"] == "test input"
            assert len(data["result"]["predictions"]) == 1

    async def test_get_completed_run_has_stages(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            data = resp.json()
            assert "stages" in data
            # The mock resolves immediately so stages may not be populated
            # but the field should exist in the response

    async def test_get_completed_run_has_completed_at(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            data = resp.json()
            assert data["completed_at"] is not None

    async def test_get_failed_run(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.side_effect = RuntimeError("Pipeline exploded")

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "failed"
            assert "Pipeline exploded" in data["error"]

    async def test_get_failed_run_has_completed_at(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.side_effect = RuntimeError("fail")

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            data = resp.json()
            assert data["completed_at"] is not None

    async def test_get_run_result_structure(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            result = resp.json()["result"]
            assert "input_summary" in result
            assert "predictions" in result
            assert "game_theory" in result
            assert "decoded" in result
            assert "paths" in result
            assert "randomized" in result
            assert "iterations_run" in result

    async def test_get_run_prediction_fields(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}")
            pred = resp.json()["result"]["predictions"][0]
            assert pred["id"] == "p1"
            assert pred["description"] == "price goes up"
            assert pred["confidence"] == 0.8
            assert pred["reasoning"] == "trend"
            assert pred["source_series"] == ["price"]


# ── GET /api/runs/{run_id}/chart ──────────────────────────────────


class TestGetChart:
    async def test_chart_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/runs/nonexistent/chart")
        assert resp.status_code == 404

    async def test_chart_data(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 42, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/chart")
            assert resp.status_code == 200
            data = resp.json()
            assert data["run_id"] == run_id
            assert data["chart_id"] == 42
            assert len(data["series"]) == 1
            assert data["series"][0]["name"] == "price"
            assert len(data["series"][0]["points"]) == 2

    async def test_chart_series_point_structure(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/chart")
            points = resp.json()["series"][0]["points"]
            assert points[0]["index"] == 0.0
            assert points[0]["value"] == 100.0
            assert points[1]["index"] == 1.0
            assert points[1]["value"] == 105.0

    async def test_chart_with_no_chart_id(self, client: AsyncClient) -> None:
        """Run exists but pipeline returned no chart_id."""
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), None, [])

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/chart")
            assert resp.status_code == 200
            data = resp.json()
            assert data["chart_id"] is None
            assert data["series"] == []

    async def test_chart_metadata(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/chart")
            series = resp.json()["series"][0]
            assert series["metadata"] == {"source": "test"}


# ── GET /api/runs/{run_id}/predictions ────────────────────────────


class TestGetPredictions:
    async def test_predictions_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/runs/nonexistent/predictions")
        assert resp.status_code == 404

    async def test_predictions_before_completion(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            hang = asyncio.Event()
            mock_run.side_effect = lambda *a, **k: hang.wait()

            submit_resp = await client.post(
                "/api/run", json={"content": "test", "format": "text"}
            )
            run_id = submit_resp.json()["run_id"]

            await asyncio.sleep(0.05)

            resp = await client.get(f"/api/runs/{run_id}/predictions")
            assert resp.status_code == 200
            data = resp.json()
            assert data["predictions"] == []
            assert data["run_id"] == run_id

    async def test_predictions_after_completion(self, client: AsyncClient) -> None:
        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (_make_pipeline_result(), 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/predictions")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["predictions"]) == 1
            assert data["predictions"][0]["id"] == "p1"
            assert data["predictions"][0]["confidence"] == 0.8
            assert data["predictions"][0]["description"] == "price goes up"
            assert data["predictions"][0]["source_series"] == ["price"]

    async def test_predictions_with_multiple_predictions(
        self, client: AsyncClient
    ) -> None:
        result = _make_pipeline_result()
        result.predictions.append(
            Prediction(
                id="p2",
                description="volume decreases",
                confidence=0.6,
                reasoning="inverse correlation",
                source_series=["volume"],
            )
        )

        with patch(
            "sp26.api.server.run_pipeline_with_hooks", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = (result, 1, _make_ingest_series())

            run_id = await _submit_and_wait(client)

            resp = await client.get(f"/api/runs/{run_id}/predictions")
            data = resp.json()
            assert len(data["predictions"]) == 2
            ids = {p["id"] for p in data["predictions"]}
            assert ids == {"p1", "p2"}


# ── GET /api/stream/{run_id} — SSE ────────────────────────────────


class TestSSEStream:
    async def test_stream_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/stream/nonexistent")
        assert resp.status_code == 404

    async def test_stream_completed_run(self, client: AsyncClient, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("test-run", InputFormat.TEXT)
        record.status = RunStatus.COMPLETED
        record.result = _make_pipeline_result()

        record.stages = [
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=10.0),
            StageInfo(name="embed", status=StageStatus.COMPLETE, duration_ms=20.0),
        ]

        resp = await client.get("/api/stream/test-run")
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")

    async def test_stream_completed_run_body_contains_events(
        self, client: AsyncClient, app: MagicMock
    ) -> None:
        store: RunStore = app.state.store
        record = await store.create("sse-body", InputFormat.TEXT)
        record.status = RunStatus.COMPLETED
        record.result = _make_pipeline_result()
        record.stages = [
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=10.0),
        ]

        resp = await client.get("/api/stream/sse-body")
        body = resp.text
        # The body should contain SSE-formatted events with "ingest" stage data
        assert "ingest" in body

    async def test_stream_failed_run(self, client: AsyncClient, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("fail-run", InputFormat.TEXT)
        record.status = RunStatus.FAILED
        record.error = "something broke"
        record.stages = [
            StageInfo(
                name="embed",
                status=StageStatus.FAILED,
                duration_ms=5.0,
                error="API error",
            ),
        ]

        resp = await client.get("/api/stream/fail-run")
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        body = resp.text
        assert "embed" in body


# ── WebSocket /ws/pipeline/{run_id} ───────────────────────────────


class TestWebSocket:
    async def test_ws_completed_run(self, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("ws-test", InputFormat.TEXT)
        record.status = RunStatus.COMPLETED
        record.result = _make_pipeline_result()

        record.stages = [
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=5.0),
        ]

        from starlette.testclient import TestClient

        sync_client = TestClient(app)
        with sync_client.websocket_connect("/ws/pipeline/ws-test") as ws:
            data = ws.receive_json()
            assert data["stage"] == "ingest"
            assert data["status"] == "complete"

            data = ws.receive_json()
            assert data["stage"] == "pipeline"
            assert data["status"] == "completed"

    async def test_ws_not_found(self, app: MagicMock) -> None:
        from starlette.testclient import TestClient

        sync_client = TestClient(app)
        with pytest.raises(Exception):
            with sync_client.websocket_connect("/ws/pipeline/nope") as ws:
                ws.receive_json()

    async def test_ws_completed_run_multiple_stages(self, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("ws-multi", InputFormat.TEXT)
        record.status = RunStatus.COMPLETED
        record.result = _make_pipeline_result()
        record.stages = [
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=5.0),
            StageInfo(name="embed", status=StageStatus.COMPLETE, duration_ms=10.0),
            StageInfo(name="chart", status=StageStatus.COMPLETE, duration_ms=3.0),
        ]

        from starlette.testclient import TestClient

        sync_client = TestClient(app)
        with sync_client.websocket_connect("/ws/pipeline/ws-multi") as ws:
            stages_received = []
            # Receive all 3 catch-up stage events + pipeline done
            for _ in range(4):
                data = ws.receive_json()
                stages_received.append(data["stage"])

            assert stages_received == ["ingest", "embed", "chart", "pipeline"]

    async def test_ws_failed_run(self, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("ws-fail", InputFormat.TEXT)
        record.status = RunStatus.FAILED
        record.error = "something went wrong"
        record.stages = [
            StageInfo(
                name="embed",
                status=StageStatus.FAILED,
                duration_ms=2.0,
                error="API failure",
            ),
        ]

        from starlette.testclient import TestClient

        sync_client = TestClient(app)
        with sync_client.websocket_connect("/ws/pipeline/ws-fail") as ws:
            data = ws.receive_json()
            assert data["stage"] == "embed"
            assert data["status"] == "failed"
            assert data["error"] == "API failure"

            data = ws.receive_json()
            assert data["stage"] == "pipeline"
            assert data["status"] == "failed"

    async def test_ws_catch_up_includes_duration(self, app: MagicMock) -> None:
        store: RunStore = app.state.store
        record = await store.create("ws-dur", InputFormat.TEXT)
        record.status = RunStatus.COMPLETED
        record.result = _make_pipeline_result()
        record.stages = [
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=42.5),
        ]

        from starlette.testclient import TestClient

        sync_client = TestClient(app)
        with sync_client.websocket_connect("/ws/pipeline/ws-dur") as ws:
            data = ws.receive_json()
            assert data["duration_ms"] == 42.5


# ── CORS ───────────────────────────────────────────────────────────


class TestCORS:
    async def test_cors_headers(self, client: AsyncClient) -> None:
        resp = await client.options(
            "/api/runs",
            headers={
                "origin": "http://localhost:3000",
                "access-control-request-method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"

    async def test_cors_disallowed_origin(self, client: AsyncClient) -> None:
        resp = await client.options(
            "/api/runs",
            headers={
                "origin": "http://evil.com",
                "access-control-request-method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") != "http://evil.com"

    async def test_cors_post_method(self, client: AsyncClient) -> None:
        resp = await client.options(
            "/api/run",
            headers={
                "origin": "http://localhost:3000",
                "access-control-request-method": "POST",
            },
        )
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ── App creation / state ──────────────────────────────────────────


class TestAppState:
    def test_app_has_store(self, app: MagicMock) -> None:
        assert hasattr(app.state, "store")
        assert isinstance(app.state.store, RunStore)

    def test_app_has_config(self, app: MagicMock) -> None:
        assert hasattr(app.state, "config")
        assert isinstance(app.state.config, SP26Config)

    def test_create_app_with_default_config(self) -> None:
        app = create_app()
        assert app.state.config is not None
        assert isinstance(app.state.store, RunStore)

    def test_create_app_with_custom_config(self, config: SP26Config) -> None:
        app = create_app(config)
        assert app.state.config.openai_api_key == "test-key"
        assert app.state.config.embedding_dimension == 4
