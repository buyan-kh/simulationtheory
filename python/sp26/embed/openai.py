"""OpenAI embedding client."""

from __future__ import annotations

import httpx

from sp26.config import SP26Config
from sp26.embed.cache import EmbeddingCache
from sp26.types import EmbedResult, EmbeddedEntity, IngestResult


class OpenAIEmbedder:
    """Embeds text using the OpenAI embeddings API."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config
        self._cache = EmbeddingCache()
        self._base_url = "https://api.openai.com/v1/embeddings"

    async def embed(self, ingest_result: IngestResult) -> EmbedResult:
        texts = [e.label for e in ingest_result.entities]

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
        embedded_entities: list[EmbeddedEntity] = []
        for entity in ingest_result.entities:
            embedding = self._cache.get(entity.label)
            if embedding is None:
                raise RuntimeError(f"Missing embedding for {entity.label!r}")
            embedded_entities.append(EmbeddedEntity(
                id=entity.id,
                label=entity.label,
                entity_type=entity.entity_type,
                embedding=embedding,
                attributes=entity.attributes,
            ))

        return EmbedResult(
            entities=embedded_entities,
            relationships=ingest_result.relationships,
            dimension=self._config.embedding_dimension,
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
