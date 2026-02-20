"""OpenAI embedding client."""

from __future__ import annotations

import httpx

from sp26.config import SP26Config
from sp26.embed.cache import EmbeddingCache
from sp26.types import DataSeries, EmbedResult, EmbeddedSeries, IngestResult


class OpenAIEmbedder:
    """Embeds series descriptions using the OpenAI embeddings API."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config
        self._cache = EmbeddingCache()
        self._base_url = "https://api.openai.com/v1/embeddings"

    async def embed(self, ingest_result: IngestResult) -> EmbedResult:
        # Build a text summary per series for embedding
        texts = [self._summarize_series(s) for s in ingest_result.series]

        # Check cache for all texts
        uncached_texts: list[str] = []
        uncached_indices: list[int] = []
        for i, text in enumerate(texts):
            if not self._cache.get(text):
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Fetch uncached embeddings from API
        if uncached_texts:
            embeddings = await self._fetch_embeddings(uncached_texts)
            for text, embedding in zip(uncached_texts, embeddings):
                self._cache.put(text, embedding)

        # Build result
        embedded_series: list[EmbeddedSeries] = []
        for series, text in zip(ingest_result.series, texts):
            embedding = self._cache.get(text)
            if embedding is None:
                raise RuntimeError(f"Missing embedding for series {series.name!r}")
            embedded_series.append(EmbeddedSeries(
                name=series.name,
                points=series.points,
                embedding=embedding,
                metadata=series.metadata,
            ))

        return EmbedResult(
            series=embedded_series,
            dimension=self._config.embedding_dimension,
        )

    @staticmethod
    def _summarize_series(series: DataSeries) -> str:
        """Build a text summary of a series for embedding."""
        n = len(series.points)
        if n == 0:
            return f"Data series '{series.name}': empty series"

        values = [p.value for p in series.points]
        min_val = min(values)
        max_val = max(values)
        mean_val = sum(values) / n

        # Determine trend
        if n >= 2:
            first_half = values[: n // 2]
            second_half = values[n // 2 :]
            first_mean = sum(first_half) / len(first_half)
            second_mean = sum(second_half) / len(second_half)
            if second_mean > first_mean * 1.05:
                trend = "rising"
            elif second_mean < first_mean * 0.95:
                trend = "falling"
            else:
                trend = "stable"
        else:
            trend = "single point"

        return (
            f"Data series '{series.name}': {n} points, "
            f"range [{min_val:.4g}, {max_val:.4g}], "
            f"mean {mean_val:.4g}, trend {trend}"
        )

    async def _fetch_embeddings(self, texts: list[str]) -> list[list[float]]:
        headers = {
            "Authorization": f"Bearer {self._config.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._config.embedding_model,
            "input": texts,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self._base_url,
                json=payload,
                headers=headers,
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        # Sort by index to preserve order
        results = sorted(data["data"], key=lambda x: x["index"])
        return [r["embedding"] for r in results]
