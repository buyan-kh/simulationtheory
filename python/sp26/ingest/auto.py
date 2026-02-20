"""Auto-detecting ingestor — picks the right ingestor based on content."""

from __future__ import annotations

import json

from sp26.config import SP26Config
from sp26.types import IngestResult, InputFormat, RawInput
from sp26.ingest.text import TextIngestor
from sp26.ingest.csv_ingest import CsvIngestor
from sp26.ingest.json_ingest import JsonIngestor
from sp26.ingest.nl_ingest import NLIngestor


class AutoIngestor:
    """Automatically detects input format and delegates to the appropriate ingestor."""

    def __init__(self, config: SP26Config | None = None) -> None:
        self._text = TextIngestor()
        self._csv = CsvIngestor()
        self._json = JsonIngestor()
        self._nl = NLIngestor(config) if config else None

    def ingest(self, raw_input: RawInput) -> IngestResult:
        fmt = raw_input.format
        if fmt == InputFormat.AUTO:
            fmt = self._detect(raw_input.content)

        if fmt == InputFormat.JSON:
            return self._json.ingest(raw_input)
        elif fmt == InputFormat.CSV:
            return self._csv.ingest(raw_input)
        else:
            if self._nl is not None:
                return self._nl.ingest(raw_input)
            return self._text.ingest(raw_input)

    def _detect(self, content: str) -> InputFormat:
        stripped = content.strip()

        # Try JSON
        if stripped.startswith(("{", "[")):
            try:
                json.loads(stripped)
                return InputFormat.JSON
            except json.JSONDecodeError:
                pass

        # Try CSV (heuristic: has commas and newlines, first line looks like headers)
        lines = stripped.split("\n")
        if len(lines) >= 2:
            first_line = lines[0]
            if "," in first_line:
                comma_counts = [line.count(",") for line in lines[:5]]
                if len(set(comma_counts)) == 1 and comma_counts[0] > 0:
                    return InputFormat.CSV

        return InputFormat.TEXT
