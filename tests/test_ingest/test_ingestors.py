"""Tests for data ingestors."""

from sp26.ingest.auto import AutoIngestor
from sp26.ingest.csv_ingest import CsvIngestor
from sp26.ingest.json_ingest import JsonIngestor
from sp26.ingest.text import TextIngestor
from sp26.types import InputFormat, RawInput


class TestTextIngestor:
    def test_extracts_capitalized_entities(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Alice met Bob at the Park."))
        labels = {e.label for e in result.entities}
        assert "Alice" in labels
        assert "Bob" in labels
        assert "Park" in labels

    def test_creates_cooccurrence_relationships(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Alice met Bob."))
        assert len(result.relationships) > 0
        assert result.relationships[0].relation == "co_occurs"

    def test_fallback_to_statements(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="this is lowercase. another sentence."))
        assert len(result.entities) == 2
        assert result.entities[0].entity_type == "statement"

    def test_empty_input(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.entities == []

    def test_raw_text_preserved(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Hello World."))
        assert result.raw_text == "Hello World."


class TestCsvIngestor:
    def test_parses_csv_rows(self):
        csv_data = "name,age\nAlice,30\nBob,25"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        assert len(result.entities) == 2
        assert result.entities[0].entity_type == "row"

    def test_creates_sequential_relationships(self):
        csv_data = "name,age\nAlice,30\nBob,25\nCharlie,35"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        assert len(result.relationships) == 2
        assert all(r.relation == "next_row" for r in result.relationships)

    def test_attributes_from_columns(self):
        csv_data = "name,age\nAlice,30"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        assert result.entities[0].attributes["name"] == "Alice"
        assert result.entities[0].attributes["age"] == "30"

    def test_empty_csv(self):
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.entities == []


class TestJsonIngestor:
    def test_parses_object(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(RawInput(content='{"name": "Alice", "age": 30}'))
        assert any(e.entity_type == "object" for e in result.entities)

    def test_parses_array(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(RawInput(content='[{"a": 1}, {"b": 2}]'))
        assert any(e.entity_type == "array" for e in result.entities)

    def test_nested_objects(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(
            RawInput(content='{"user": {"name": "Alice", "settings": {"theme": "dark"}}}')
        )
        assert len(result.entities) > 2
        assert any(r.relation == "contains" for r in result.relationships)

    def test_empty_json(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.entities == []


class TestAutoIngestor:
    def test_detects_json(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content='{"key": "value"}'))
        assert any(e.entity_type == "object" for e in result.entities)

    def test_detects_csv(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content="a,b,c\n1,2,3\n4,5,6"))
        assert all(e.entity_type == "row" for e in result.entities)

    def test_detects_text(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content="Alice went to the store."))
        labels = {e.label for e in result.entities}
        assert "Alice" in labels

    def test_explicit_format_overrides(self):
        ingestor = AutoIngestor()
        # This is valid JSON but we force text parsing
        result = ingestor.ingest(
            RawInput(content='{"key": "value"}', format=InputFormat.TEXT)
        )
        # Text parser won't create "object" type entities
        assert not any(e.entity_type == "object" for e in result.entities)
