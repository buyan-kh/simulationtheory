"""CSV ingestor — converts numeric columns into data series."""

from __future__ import annotations

import csv
import io

from sp26.types import DataPoint, DataSeries, IngestResult, RawInput


class CsvIngestor:
    """Parses CSV data: each numeric column becomes a DataSeries."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(series=[], raw_text=text)

        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return IngestResult(series=[], raw_text=text)

        fieldnames = list(rows[0].keys())

        # Identify numeric columns
        numeric_cols: list[str] = []
        for col in fieldnames:
            if _all_numeric(rows, col):
                numeric_cols.append(col)

        # If no purely numeric columns, try to parse all columns as best-effort
        if not numeric_cols:
            numeric_cols = [
                col for col in fieldnames if _any_numeric(rows, col)
            ]

        series: list[DataSeries] = []
        for col in numeric_cols:
            points: list[DataPoint] = []
            for i, row in enumerate(rows):
                val = _try_float(row.get(col, ""))
                if val is not None:
                    points.append(DataPoint(index=float(i), value=val))
            if points:
                series.append(DataSeries(
                    name=col,
                    points=points,
                    metadata={"source": "csv", "column": col},
                ))

        # If still no series, create a row_count series as fallback
        if not series:
            points = [DataPoint(index=float(i), value=1.0) for i in range(len(rows))]
            series.append(DataSeries(
                name="row_count",
                points=points,
                metadata={"source": "csv", "note": "no numeric columns found"},
            ))

        return IngestResult(series=series, raw_text=text)


def _try_float(val: str) -> float | None:
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _all_numeric(rows: list[dict], col: str) -> bool:
    return all(_try_float(row.get(col, "")) is not None for row in rows if row.get(col, ""))


def _any_numeric(rows: list[dict], col: str) -> bool:
    return any(_try_float(row.get(col, "")) is not None for row in rows)
