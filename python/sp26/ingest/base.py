"""Base ingestor protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sp26.types import IngestResult, RawInput


@runtime_checkable
class Ingestor(Protocol):
    """Protocol for data ingestors."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        """Ingest raw input and return structured entities and relationships."""
        ...
