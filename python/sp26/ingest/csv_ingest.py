"""CSV ingestor — extracts entities and relationships from CSV data."""

from __future__ import annotations

import csv
import io
import uuid

from sp26.types import Entity, IngestResult, RawInput, Relationship


class CsvIngestor:
    """Parses CSV data into entities (rows) and relationships (column-based)."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(entities=[], relationships=[], raw_text=text)

        reader = csv.DictReader(io.StringIO(text))
        entities: list[Entity] = []
        relationships: list[Relationship] = []
        prev_id: str | None = None

        for row in reader:
            eid = str(uuid.uuid4())[:8]
            label = " | ".join(f"{k}={v}" for k, v in row.items() if v)
            entities.append(Entity(
                id=eid,
                label=label[:100],
                entity_type="row",
                attributes=dict(row),
            ))

            # Sequential relationship between consecutive rows
            if prev_id is not None:
                relationships.append(Relationship(
                    source_id=prev_id,
                    target_id=eid,
                    relation="next_row",
                ))
            prev_id = eid

        return IngestResult(
            entities=entities,
            relationships=relationships,
            raw_text=text,
        )
