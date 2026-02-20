"""Python wrapper around Rust chart builder."""

from __future__ import annotations

import json

from sp26.config import SP26Config
from sp26.types import ChartResult, EmbedResult

try:
    from sp26._core import chart as _chart
except ImportError:
    _chart = None


class ChartBuilder:
    """Builds a chart from embedded series using the Rust backend."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config

    def build(self, embed_result: EmbedResult) -> ChartResult:
        if _chart is None:
            raise RuntimeError("Rust _core module not available. Run `maturin develop` first.")

        series_json = [
            json.dumps({
                "name": s.name,
                "points": [{"index": p.index, "value": p.value} for p in s.points],
                "metadata": s.metadata if isinstance(s.metadata, dict) else {},
            })
            for s in embed_result.series
        ]

        handle = _chart.create_chart(series_json)
        series_count = _chart.get_series_count(handle.id)
        total_points = _chart.get_total_points(handle.id)

        return ChartResult(
            chart_id=handle.id,
            series_count=series_count,
            total_points=total_points,
        )
