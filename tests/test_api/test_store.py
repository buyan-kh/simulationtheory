"""Tests for the RunStore and RunRecord."""

from __future__ import annotations

import asyncio

import pytest

from sp26.api.models import RunStatus, StageInfo, StageStatus
from sp26.api.store import RunRecord, RunStore
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


class TestRunRecord:
    def test_init_defaults(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        assert record.run_id == "r1"
        assert record.input_format == InputFormat.TEXT
        assert record.status == RunStatus.PENDING
        assert record.created_at is not None
        assert record.completed_at is None
        assert record.stages == []
        assert record.result is None
        assert record.error is None
        assert record.chart_series == []
        assert record.chart_id is None
        assert record._subscribers == []

    def test_init_with_csv_format(self) -> None:
        record = RunRecord("r2", InputFormat.CSV)
        assert record.input_format == InputFormat.CSV

    def test_init_with_json_format(self) -> None:
        record = RunRecord("r3", InputFormat.JSON)
        assert record.input_format == InputFormat.JSON


class TestRunRecordPubSub:
    async def test_subscribe_returns_queue(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q = record.subscribe()
        assert isinstance(q, asyncio.Queue)
        assert q in record._subscribers

    async def test_subscribe_creates_separate_queues(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q1 = record.subscribe()
        q2 = record.subscribe()
        assert q1 is not q2
        assert len(record._subscribers) == 2

    async def test_publish_delivers_to_all_subscribers(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q1 = record.subscribe()
        q2 = record.subscribe()

        await record.publish({"stage": "ingest", "status": "running"})

        e1 = await asyncio.wait_for(q1.get(), timeout=1.0)
        e2 = await asyncio.wait_for(q2.get(), timeout=1.0)
        assert e1 == {"stage": "ingest", "status": "running"}
        assert e2 == {"stage": "ingest", "status": "running"}

    async def test_publish_multiple_events(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q = record.subscribe()

        await record.publish({"stage": "ingest", "status": "running"})
        await record.publish({"stage": "ingest", "status": "complete"})

        e1 = await asyncio.wait_for(q.get(), timeout=1.0)
        e2 = await asyncio.wait_for(q.get(), timeout=1.0)
        assert e1["status"] == "running"
        assert e2["status"] == "complete"

    async def test_unsubscribe_removes_queue(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q = record.subscribe()
        assert q in record._subscribers

        record.unsubscribe(q)
        assert q not in record._subscribers

    async def test_unsubscribe_nonexistent_queue_no_error(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        other_q: asyncio.Queue = asyncio.Queue()
        record.unsubscribe(other_q)  # should not raise

    async def test_publish_after_unsubscribe(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        q1 = record.subscribe()
        q2 = record.subscribe()

        record.unsubscribe(q1)
        await record.publish({"stage": "embed", "status": "complete"})

        assert q1.empty()
        e2 = await asyncio.wait_for(q2.get(), timeout=1.0)
        assert e2["stage"] == "embed"

    async def test_no_subscribers_publish(self) -> None:
        record = RunRecord("r1", InputFormat.TEXT)
        # Should not raise even with no subscribers
        await record.publish({"stage": "ingest", "status": "running"})


class TestRunStoreCreate:
    async def test_create_returns_record(self) -> None:
        store = RunStore()
        record = await store.create("r1", InputFormat.TEXT)
        assert isinstance(record, RunRecord)
        assert record.run_id == "r1"
        assert record.input_format == InputFormat.TEXT

    async def test_create_stores_record(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.CSV)
        fetched = await store.get("r1")
        assert fetched is not None
        assert fetched.run_id == "r1"

    async def test_create_multiple_records(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.create("r2", InputFormat.CSV)
        await store.create("r3", InputFormat.JSON)
        records = await store.list_all()
        assert len(records) == 3


class TestRunStoreGet:
    async def test_get_existing(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        record = await store.get("r1")
        assert record is not None
        assert record.run_id == "r1"

    async def test_get_missing_returns_none(self) -> None:
        store = RunStore()
        assert await store.get("nonexistent") is None

    async def test_get_returns_same_object(self) -> None:
        store = RunStore()
        created = await store.create("r1", InputFormat.TEXT)
        fetched = await store.get("r1")
        assert created is fetched


class TestRunStoreListAll:
    async def test_list_empty_store(self) -> None:
        store = RunStore()
        records = await store.list_all()
        assert records == []

    async def test_list_preserves_insertion_order(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.create("r2", InputFormat.CSV)
        records = await store.list_all()
        assert [r.run_id for r in records] == ["r1", "r2"]


class TestRunStoreUpdateStatus:
    async def test_update_to_running(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.update_status("r1", RunStatus.RUNNING)
        record = await store.get("r1")
        assert record is not None
        assert record.status == RunStatus.RUNNING
        assert record.completed_at is None

    async def test_update_to_completed_sets_timestamp(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.update_status("r1", RunStatus.COMPLETED)
        record = await store.get("r1")
        assert record is not None
        assert record.status == RunStatus.COMPLETED
        assert record.completed_at is not None

    async def test_update_to_failed_sets_timestamp(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.update_status("r1", RunStatus.FAILED)
        record = await store.get("r1")
        assert record is not None
        assert record.status == RunStatus.FAILED
        assert record.completed_at is not None

    async def test_update_nonexistent_run(self) -> None:
        store = RunStore()
        # Should not raise
        await store.update_status("nonexistent", RunStatus.RUNNING)


class TestRunStoreSetResult:
    async def test_set_result(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        result = _make_pipeline_result()
        await store.set_result("r1", result)
        record = await store.get("r1")
        assert record is not None
        assert record.result is not None
        assert record.result.input_summary == "test input"
        assert len(record.result.predictions) == 1
        assert record.result.predictions[0].id == "p1"

    async def test_set_result_nonexistent_run(self) -> None:
        store = RunStore()
        result = _make_pipeline_result()
        # Should not raise
        await store.set_result("nonexistent", result)


class TestRunStoreSetError:
    async def test_set_error(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.set_error("r1", "something broke")
        record = await store.get("r1")
        assert record is not None
        assert record.error == "something broke"

    async def test_set_error_nonexistent_run(self) -> None:
        store = RunStore()
        # Should not raise
        await store.set_error("nonexistent", "error")


class TestRunStoreAddStage:
    async def test_add_new_stage(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.add_stage(
            "r1",
            StageInfo(name="ingest", status=StageStatus.RUNNING),
        )
        record = await store.get("r1")
        assert record is not None
        assert len(record.stages) == 1
        assert record.stages[0].name == "ingest"
        assert record.stages[0].status == StageStatus.RUNNING

    async def test_update_existing_stage(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.add_stage(
            "r1",
            StageInfo(name="ingest", status=StageStatus.RUNNING),
        )
        await store.add_stage(
            "r1",
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=15.0),
        )
        record = await store.get("r1")
        assert record is not None
        assert len(record.stages) == 1
        assert record.stages[0].status == StageStatus.COMPLETE
        assert record.stages[0].duration_ms == 15.0

    async def test_add_multiple_stages(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.add_stage(
            "r1",
            StageInfo(name="ingest", status=StageStatus.COMPLETE, duration_ms=10.0),
        )
        await store.add_stage(
            "r1",
            StageInfo(name="embed", status=StageStatus.RUNNING),
        )
        record = await store.get("r1")
        assert record is not None
        assert len(record.stages) == 2
        assert record.stages[0].name == "ingest"
        assert record.stages[1].name == "embed"

    async def test_add_stage_with_error(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        await store.add_stage(
            "r1",
            StageInfo(
                name="embed",
                status=StageStatus.FAILED,
                duration_ms=5.0,
                error="API key invalid",
            ),
        )
        record = await store.get("r1")
        assert record is not None
        assert record.stages[0].status == StageStatus.FAILED
        assert record.stages[0].error == "API key invalid"

    async def test_add_stage_nonexistent_run(self) -> None:
        store = RunStore()
        # Should not raise
        await store.add_stage(
            "nonexistent",
            StageInfo(name="ingest", status=StageStatus.RUNNING),
        )


class TestRunStoreSetChartData:
    async def test_set_chart_data(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        series = _make_ingest_series()
        await store.set_chart_data("r1", 42, series)
        record = await store.get("r1")
        assert record is not None
        assert record.chart_id == 42
        assert len(record.chart_series) == 1
        assert record.chart_series[0].name == "price"
        assert len(record.chart_series[0].points) == 2

    async def test_set_chart_data_multiple_series(self) -> None:
        store = RunStore()
        await store.create("r1", InputFormat.TEXT)
        series = [
            DataSeries(
                name="price",
                points=[DataPoint(index=0.0, value=100.0)],
            ),
            DataSeries(
                name="volume",
                points=[DataPoint(index=0.0, value=5000.0)],
            ),
        ]
        await store.set_chart_data("r1", 7, series)
        record = await store.get("r1")
        assert record is not None
        assert record.chart_id == 7
        assert len(record.chart_series) == 2

    async def test_set_chart_data_nonexistent_run(self) -> None:
        store = RunStore()
        series = _make_ingest_series()
        # Should not raise
        await store.set_chart_data("nonexistent", 1, series)
