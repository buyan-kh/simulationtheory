"""In-memory run storage with async-safe locking."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from sp26.api.models import RunStatus, StageInfo, StageStatus
from sp26.types import (
    DataSeries,
    InputFormat,
    PipelineResult,
)


class RunRecord:
    """Stores all state for a single pipeline run."""

    def __init__(self, run_id: str, input_format: InputFormat) -> None:
        self.run_id = run_id
        self.input_format = input_format
        self.status: RunStatus = RunStatus.PENDING
        self.created_at: datetime = datetime.now(timezone.utc)
        self.completed_at: datetime | None = None
        self.stages: list[StageInfo] = []
        self.result: PipelineResult | None = None
        self.error: str | None = None
        # Chart data stored separately for the /chart endpoint
        self.chart_series: list[DataSeries] = []
        self.chart_id: int | None = None
        # Event subscribers (asyncio.Queue per subscriber)
        self._subscribers: list[asyncio.Queue[dict[str, Any]]] = []

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        """Create a new event subscriber queue."""
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        """Remove a subscriber queue."""
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    async def publish(self, event: dict[str, Any]) -> None:
        """Publish an event to all subscribers."""
        for q in self._subscribers:
            await q.put(event)


class RunStore:
    """Thread-safe in-memory storage for pipeline runs."""

    def __init__(self) -> None:
        self._runs: dict[str, RunRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self, run_id: str, input_format: InputFormat) -> RunRecord:
        async with self._lock:
            record = RunRecord(run_id, input_format)
            self._runs[run_id] = record
            return record

    async def get(self, run_id: str) -> RunRecord | None:
        async with self._lock:
            return self._runs.get(run_id)

    async def list_all(self) -> list[RunRecord]:
        async with self._lock:
            return list(self._runs.values())

    async def update_status(self, run_id: str, status: RunStatus) -> None:
        async with self._lock:
            record = self._runs.get(run_id)
            if record:
                record.status = status
                if status in (RunStatus.COMPLETED, RunStatus.FAILED):
                    record.completed_at = datetime.now(timezone.utc)

    async def set_result(self, run_id: str, result: PipelineResult) -> None:
        async with self._lock:
            record = self._runs.get(run_id)
            if record:
                record.result = result

    async def set_error(self, run_id: str, error: str) -> None:
        async with self._lock:
            record = self._runs.get(run_id)
            if record:
                record.error = error

    async def add_stage(self, run_id: str, stage: StageInfo) -> None:
        async with self._lock:
            record = self._runs.get(run_id)
            if record:
                # Update existing stage or append new one
                for i, s in enumerate(record.stages):
                    if s.name == stage.name:
                        record.stages[i] = stage
                        return
                record.stages.append(stage)

    async def set_chart_data(
        self, run_id: str, chart_id: int, series: list[DataSeries]
    ) -> None:
        async with self._lock:
            record = self._runs.get(run_id)
            if record:
                record.chart_id = chart_id
                record.chart_series = series
