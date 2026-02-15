"""Embedding cache to avoid redundant API calls."""

from __future__ import annotations


class EmbeddingCache:
    """Simple in-memory cache for embeddings, keyed by text."""

    def __init__(self) -> None:
        self._store: dict[str, list[float]] = {}

    def get(self, text: str) -> list[float] | None:
        return self._store.get(text)

    def put(self, text: str, embedding: list[float]) -> None:
        self._store[text] = embedding

    def clear(self) -> None:
        self._store.clear()

    def __len__(self) -> int:
        return len(self._store)
