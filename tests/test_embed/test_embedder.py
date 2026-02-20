"""Tests for embedding layer."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from sp26.config import SP26Config
from sp26.embed.cache import EmbeddingCache
from sp26.embed.openai import OpenAIEmbedder
from sp26.types import DataPoint, DataSeries, IngestResult


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

        with patch.object(embedder, "_fetch_embeddings", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]

            result = await embedder.embed(IngestResult(
                series=[
                    DataSeries(
                        name="price",
                        points=[DataPoint(index=0.0, value=100.0)],
                    ),
                    DataSeries(
                        name="volume",
                        points=[DataPoint(index=0.0, value=5000.0)],
                    ),
                ],
                raw_text="test",
            ))

            assert len(result.series) == 2
            assert result.series[0].embedding == [1.0, 0.0, 0.0]
            assert result.series[1].embedding == [0.0, 1.0, 0.0]
            assert result.dimension == 3

    @pytest.mark.asyncio
    async def test_embed_uses_cache(self):
        config = SP26Config(openai_api_key="test", embedding_dimension=3)
        embedder = OpenAIEmbedder(config)

        # Pre-populate cache with the summaries that the embedder will generate
        series_a = DataSeries(
            name="price",
            points=[DataPoint(index=0.0, value=100.0)],
        )
        series_b = DataSeries(
            name="volume",
            points=[DataPoint(index=0.0, value=5000.0)],
        )
        summary_a = OpenAIEmbedder._summarize_series(series_a)
        summary_b = OpenAIEmbedder._summarize_series(series_b)
        embedder._cache.put(summary_a, [1.0, 0.0, 0.0])
        embedder._cache.put(summary_b, [0.0, 1.0, 0.0])

        with patch.object(embedder, "_fetch_embeddings", new_callable=AsyncMock) as mock_fetch:
            result = await embedder.embed(IngestResult(
                series=[series_a, series_b],
                raw_text="test",
            ))

            # Should not call API since everything is cached
            mock_fetch.assert_not_called()
            assert len(result.series) == 2

    def test_summarize_series(self):
        series = DataSeries(
            name="price",
            points=[
                DataPoint(index=0.0, value=100.0),
                DataPoint(index=1.0, value=110.0),
                DataPoint(index=2.0, value=120.0),
            ],
        )
        summary = OpenAIEmbedder._summarize_series(series)
        assert "price" in summary
        assert "3 points" in summary
        assert "rising" in summary

    def test_summarize_empty_series(self):
        series = DataSeries(name="empty", points=[])
        summary = OpenAIEmbedder._summarize_series(series)
        assert "empty" in summary
