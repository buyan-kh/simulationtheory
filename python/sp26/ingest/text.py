"""Text ingestor — extracts entities and relationships from plain text."""

from __future__ import annotations

import re
import uuid

from sp26.types import Entity, IngestResult, RawInput, Relationship


class TextIngestor:
    """Extracts entities from natural language text using simple heuristics."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(entities=[], relationships=[], raw_text=text)

        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        entities: list[Entity] = []
        relationships: list[Relationship] = []
        seen_labels: dict[str, str] = {}  # label → id

        for sentence in sentences:
            # Extract capitalized words as potential entities
            words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', sentence)
            for word in words:
                if word not in seen_labels:
                    eid = str(uuid.uuid4())[:8]
                    seen_labels[word] = eid
                    entities.append(Entity(
                        id=eid,
                        label=word,
                        entity_type="noun_phrase",
                    ))

            # Create relationships between entities that co-occur in a sentence
            sentence_entities = [seen_labels[w] for w in words if w in seen_labels]
            for i, src in enumerate(sentence_entities):
                for tgt in sentence_entities[i + 1:]:
                    if src != tgt:
                        relationships.append(Relationship(
                            source_id=src,
                            target_id=tgt,
                            relation="co_occurs",
                        ))

        # If no capitalized entities found, treat each sentence as an entity
        if not entities:
            for i, sentence in enumerate(sentences):
                eid = str(uuid.uuid4())[:8]
                entities.append(Entity(
                    id=eid,
                    label=sentence[:100],
                    entity_type="statement",
                ))
                if i > 0:
                    relationships.append(Relationship(
                        source_id=entities[i - 1].id,
                        target_id=eid,
                        relation="follows",
                    ))

        return IngestResult(
            entities=entities,
            relationships=relationships,
            raw_text=text,
        )
