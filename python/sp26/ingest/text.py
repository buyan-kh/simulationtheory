"""Text ingestor — derives data series from text properties."""

from __future__ import annotations

import re
from collections import Counter

from sp26.types import DataPoint, DataSeries, IngestResult, RawInput


class TextIngestor:
    """Extracts data series from natural language text properties."""

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(series=[], raw_text=text)

        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return IngestResult(series=[], raw_text=text)

        series: list[DataSeries] = []

        # Series 1: sentence_length — character count per sentence
        length_points = [
            DataPoint(index=float(i), value=float(len(s)))
            for i, s in enumerate(sentences)
        ]
        series.append(DataSeries(
            name="sentence_length",
            points=length_points,
            metadata={"source": "text", "unit": "characters"},
        ))

        # Series 2: entity_density — count of capitalized phrases per sentence
        density_points = []
        for i, s in enumerate(sentences):
            entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', s)
            density_points.append(DataPoint(index=float(i), value=float(len(entities))))
        series.append(DataSeries(
            name="entity_density",
            points=density_points,
            metadata={"source": "text", "unit": "entities_per_sentence"},
        ))

        # Series 3+: freq_{word} — top-10 word frequencies by sentence position
        all_words: list[str] = []
        for s in sentences:
            all_words.extend(w.lower() for w in re.findall(r'\b\w+\b', s))
        word_counts = Counter(all_words)
        top_words = [w for w, _ in word_counts.most_common(10)]

        for word in top_words:
            points = []
            for i, s in enumerate(sentences):
                sentence_words = [w.lower() for w in re.findall(r'\b\w+\b', s)]
                count = sentence_words.count(word)
                points.append(DataPoint(index=float(i), value=float(count)))
            series.append(DataSeries(
                name=f"freq_{word}",
                points=points,
                metadata={"source": "text", "word": word},
            ))

        return IngestResult(series=series, raw_text=text)
