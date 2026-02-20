"""Pydantic models for API requests and responses."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from sp26.types import (
    DataPoint,
    DataSeries,
    DecodedOutput,
    GameTheoryResult,
    InputFormat,
    PathResult,
    PipelineResult,
    Prediction,
    RandomizedResult,
)


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class StageInfo(BaseModel):
    """Status of a single pipeline stage."""
    name: str
    status: StageStatus = StageStatus.PENDING
    duration_ms: float | None = None
    error: str | None = None


class RunSubmitRequest(BaseModel):
    """Request body for POST /api/run."""
    content: str
    format: InputFormat = InputFormat.AUTO
    metadata: dict[str, Any] = Field(default_factory=dict)


class RunSubmitResponse(BaseModel):
    """Response for POST /api/run."""
    run_id: str
    status: RunStatus


class RunSummary(BaseModel):
    """Summary for listing runs."""
    run_id: str
    status: RunStatus
    input_format: InputFormat
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class RunListResponse(BaseModel):
    """Response for GET /api/runs."""
    runs: list[RunSummary]
    total: int


class RunDetailResponse(BaseModel):
    """Response for GET /api/runs/{run_id}."""
    run_id: str
    status: RunStatus
    input_format: InputFormat
    created_at: datetime
    completed_at: datetime | None = None
    stages: list[StageInfo] = Field(default_factory=list)
    result: PipelineResult | None = None
    error: str | None = None


class ChartSeriesResponse(BaseModel):
    """A single series in chart data."""
    name: str
    points: list[DataPoint]
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChartDataResponse(BaseModel):
    """Response for GET /api/runs/{run_id}/chart."""
    run_id: str
    chart_id: int | None = None
    series: list[ChartSeriesResponse] = Field(default_factory=list)


class PredictionsResponse(BaseModel):
    """Response for GET /api/runs/{run_id}/predictions."""
    run_id: str
    predictions: list[Prediction] = Field(default_factory=list)


class StageEvent(BaseModel):
    """SSE / WebSocket event for pipeline progress."""
    stage: str
    status: str
    duration_ms: float | None = None
    error: str | None = None
