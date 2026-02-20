"""JSON ingestor — extracts numeric leaf values as data series keyed by JSON path."""

from __future__ import annotations

import json
from typing import Any

from sp26.types import DataPoint, DataSeries, IngestResult, RawInput


class JsonIngestor:
    """Parses JSON data: extracts all numeric leaf values keyed by JSON path."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(series=[], raw_text=text)

        data = json.loads(text)

        # Collect all numeric values keyed by their JSON path
        path_values: dict[str, list[tuple[int, float]]] = {}
        self._walk(data, "", path_values, counter=0)

        series: list[DataSeries] = []
        for path, indexed_values in sorted(path_values.items()):
            points = [
                DataPoint(index=float(idx), value=val)
                for idx, val in indexed_values
            ]
            series.append(DataSeries(
                name=path,
                points=points,
                metadata={"source": "json", "json_path": path},
            ))

        # Fallback: if no numeric values found, create a structure_depth series
        if not series:
            depth_values: list[tuple[int, float]] = []
            self._measure_depth(data, 0, depth_values, counter=0)
            if depth_values:
                points = [
                    DataPoint(index=float(idx), value=val)
                    for idx, val in depth_values
                ]
                series.append(DataSeries(
                    name="structure_depth",
                    points=points,
                    metadata={"source": "json", "note": "no numeric values found"},
                ))

        return IngestResult(series=series, raw_text=text)

    def _walk(
        self,
        data: Any,
        prefix: str,
        path_values: dict[str, list[tuple[int, float]]],
        counter: int,
    ) -> int:
        if isinstance(data, dict):
            for k, v in data.items():
                path = f"{prefix}.{k}" if prefix else k
                counter = self._walk(v, path, path_values, counter)
        elif isinstance(data, list):
            for i, item in enumerate(data):
                counter = self._walk(item, prefix, path_values, counter)
        elif isinstance(data, (int, float)) and not isinstance(data, bool):
            path_values.setdefault(prefix, []).append((counter, float(data)))
            counter += 1
        return counter

    def _measure_depth(
        self,
        data: Any,
        depth: int,
        results: list[tuple[int, float]],
        counter: int,
    ) -> int:
        if isinstance(data, dict):
            for v in data.values():
                counter = self._measure_depth(v, depth + 1, results, counter)
        elif isinstance(data, list):
            for item in data:
                counter = self._measure_depth(item, depth + 1, results, counter)
        else:
            results.append((counter, float(depth)))
            counter += 1
        return counter
