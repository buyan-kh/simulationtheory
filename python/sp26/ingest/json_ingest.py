"""JSON ingestor — extracts entities and relationships from JSON data."""

from __future__ import annotations

import json
import uuid
from typing import Any

from sp26.types import Entity, IngestResult, RawInput, Relationship


class JsonIngestor:
    """Parses JSON data into entities and relationships."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(entities=[], relationships=[], raw_text=text)

        data = json.loads(text)
        entities: list[Entity] = []
        relationships: list[Relationship] = []

        self._extract(data, entities, relationships, parent_id=None, key="root")

        return IngestResult(
            entities=entities,
            relationships=relationships,
            raw_text=text,
        )

    def _extract(
        self,
        data: Any,
        entities: list[Entity],
        relationships: list[Relationship],
        parent_id: str | None,
        key: str,
    ) -> str:
        eid = str(uuid.uuid4())[:8]

        if isinstance(data, dict):
            label = key
            entities.append(Entity(
                id=eid,
                label=label,
                entity_type="object",
                attributes={k: str(v)[:100] for k, v in data.items() if not isinstance(v, (dict, list))},
            ))
            if parent_id:
                relationships.append(Relationship(
                    source_id=parent_id,
                    target_id=eid,
                    relation="contains",
                ))
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    self._extract(v, entities, relationships, parent_id=eid, key=k)

        elif isinstance(data, list):
            entities.append(Entity(
                id=eid,
                label=f"{key}[]",
                entity_type="array",
            ))
            if parent_id:
                relationships.append(Relationship(
                    source_id=parent_id,
                    target_id=eid,
                    relation="contains",
                ))
            for i, item in enumerate(data):
                self._extract(item, entities, relationships, parent_id=eid, key=f"{key}[{i}]")

        else:
            entities.append(Entity(
                id=eid,
                label=f"{key}={data}",
                entity_type="value",
                attributes={"value": str(data)},
            ))
            if parent_id:
                relationships.append(Relationship(
                    source_id=parent_id,
                    target_id=eid,
                    relation="has_value",
                ))

        return eid
