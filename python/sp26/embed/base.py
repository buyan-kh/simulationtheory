"""Base embedder protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sp26.types import EmbedResult, IngestResult


@runtime_checkable
class Embedder(Protocol):
    """Protocol for embedding providers."""

    async def embed(self, ingest_result: IngestResult) -> EmbedResult:
        """Embed all entities from an ingest result."""
        ...
