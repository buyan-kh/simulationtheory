"""Tests for embedding layer."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from sp26.config import SP26Config
from sp26.embed.cache import EmbeddingCache
from sp26.embed.openai import OpenAIEmbedder
from sp26.types import Entity, IngestResult, Relationship


class TestEmbeddingCache:
    def test_put_and_get(self):
        cache = EmbeddingCache()
        cache.put("hello", [1.0, 2.0])
        assert cache.get("hello") == [1.0, 2.0]

    def test_miss_returns_none(self):
        cache = EmbeddingCache()
        assert cache.get("missing") is None

    def test_clear(self):
        cache = EmbeddingCache()
        cache.put("a", [1.0])
        cache.clear()
        assert cache.get("a") is None
        assert len(cache) == 0

    def test_len(self):
        cache = EmbeddingCache()
        cache.put("a", [1.0])
        cache.put("b", [2.0])
        assert len(cache) == 2


class TestOpenAIEmbedder:
    @pytest.mark.asyncio
    async def test_embed_calls_api(self):
        config = SP26Config(openai_api_key="test", embedding_dimension=3)
        embedder = OpenAIEmbedder(config)

        mock_response = {
            "data": [
                {"index": 0, "embedding": [1.0, 0.0, 0.0]},
                {"index": 1, "embedding": [0.0, 1.0, 0.0]},
            ]
        }

        with patch.object(embedder, "_fetch_embeddings", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]

            result = await embedder.embed(IngestResult(
                entities=[
                    Entity(id="e1", label="Alice"),
                    Entity(id="e2", label="Bob"),
                ],
                relationships=[],
                raw_text="test",
            ))

            assert len(result.entities) == 2
            assert result.entities[0].embedding == [1.0, 0.0, 0.0]
            assert result.entities[1].embedding == [0.0, 1.0, 0.0]
            assert result.dimension == 3

    @pytest.mark.asyncio
    async def test_embed_uses_cache(self):
        config = SP26Config(openai_api_key="test", embedding_dimension=3)
        embedder = OpenAIEmbedder(config)

        # Pre-populate cache
        embedder._cache.put("Alice", [1.0, 0.0, 0.0])
        embedder._cache.put("Bob", [0.0, 1.0, 0.0])

        with patch.object(embedder, "_fetch_embeddings", new_callable=AsyncMock) as mock_fetch:
            result = await embedder.embed(IngestResult(
                entities=[
                    Entity(id="e1", label="Alice"),
                    Entity(id="e2", label="Bob"),
                ],
                relationships=[],
                raw_text="test",
            ))

            # Should not call API since everything is cached
            mock_fetch.assert_not_called()
            assert len(result.entities) == 2
