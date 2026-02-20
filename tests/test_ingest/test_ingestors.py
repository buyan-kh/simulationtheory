"""Tests for data ingestors."""

from unittest.mock import patch

from sp26.config import SP26Config
from sp26.ingest.auto import AutoIngestor
from sp26.ingest.csv_ingest import CsvIngestor
from sp26.ingest.json_ingest import JsonIngestor
from sp26.ingest.text import TextIngestor
from sp26.types import DataSeries, IngestResult, InputFormat, RawInput


class TestTextIngestor:
    def test_produces_sentence_length_series(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Alice met Bob at the Park. Charlie left."))
        names = {s.name for s in result.series}
        assert "sentence_length" in names

    def test_produces_entity_density_series(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Alice met Bob. Charlie went home."))
        names = {s.name for s in result.series}
        assert "entity_density" in names

    def test_produces_word_frequency_series(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="The cat sat on the mat. The dog ran."))
        freq_series = [s for s in result.series if s.name.startswith("freq_")]
        assert len(freq_series) > 0
        assert any(s.name == "freq_the" for s in freq_series)

    def test_empty_input(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.series == []

    def test_raw_text_preserved(self):
        ingestor = TextIngestor()
        result = ingestor.ingest(RawInput(content="Hello World."))
        assert result.raw_text == "Hello World."


class TestCsvIngestor:
    def test_numeric_columns_become_series(self):
        csv_data = "name,age,score\nAlice,30,95\nBob,25,87"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        names = {s.name for s in result.series}
        assert "age" in names
        assert "score" in names

    def test_series_points_from_rows(self):
        csv_data = "name,value\nA,10\nB,20\nC,30"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        value_series = next(s for s in result.series if s.name == "value")
        assert len(value_series.points) == 3
        assert value_series.points[0].value == 10.0
        assert value_series.points[2].value == 30.0

    def test_row_index_as_data_point_index(self):
        csv_data = "x,y\n1,2\n3,4"
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=csv_data))
        series = result.series[0]
        assert series.points[0].index == 0.0
        assert series.points[1].index == 1.0

    def test_empty_csv(self):
        ingestor = CsvIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.series == []


class TestJsonIngestor:
    def test_extracts_numeric_values(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(RawInput(content='{"price": 100, "volume": 5000}'))
        names = {s.name for s in result.series}
        assert "price" in names
        assert "volume" in names

    def test_nested_numeric_values(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(
            RawInput(content='{"player": {"strength": 10, "speed": 8}}')
        )
        names = {s.name for s in result.series}
        assert "player.strength" in names
        assert "player.speed" in names

    def test_array_values(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(
            RawInput(content='{"scores": [10, 20, 30]}')
        )
        assert len(result.series) >= 1
        scores_series = next(s for s in result.series if s.name == "scores")
        assert len(scores_series.points) == 3

    def test_empty_json(self):
        ingestor = JsonIngestor()
        result = ingestor.ingest(RawInput(content=""))
        assert result.series == []


class TestAutoIngestor:
    def test_detects_json(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content='{"price": 100, "volume": 5000}'))
        names = {s.name for s in result.series}
        assert "price" in names

    def test_detects_csv(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content="a,b,c\n1,2,3\n4,5,6"))
        assert len(result.series) > 0
        # CSV with numeric columns should produce series
        assert all(len(s.points) > 0 for s in result.series)

    def test_detects_text(self):
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content="Alice went to the store."))
        names = {s.name for s in result.series}
        assert "sentence_length" in names

    def test_explicit_format_overrides(self):
        ingestor = AutoIngestor()
        # This is valid JSON but we force text parsing
        result = ingestor.ingest(
            RawInput(content='{"key": "value"}', format=InputFormat.TEXT)
        )
        # Text parser will produce sentence_length, not JSON-path series
        names = {s.name for s in result.series}
        assert "sentence_length" in names
        assert "key" not in names

    def test_text_uses_nl_ingestor_with_config(self):
        """When config is provided, text input routes to NLIngestor."""
        config = SP26Config(anthropic_api_key="test-key")
        ingestor = AutoIngestor(config)

        mock_result = IngestResult(
            series=[DataSeries(name="test_factor", points=[], metadata={"source": "nl_extraction"})],
            raw_text="Test text.",
        )
        with patch.object(ingestor._nl, "ingest", return_value=mock_result):
            result = ingestor.ingest(RawInput(content="Test text."))

        assert result.series[0].metadata["source"] == "nl_extraction"

    def test_text_uses_text_ingestor_without_config(self):
        """Without config, text input still routes to TextIngestor."""
        ingestor = AutoIngestor()
        result = ingestor.ingest(RawInput(content="Alice went to the store."))
        names = {s.name for s in result.series}
        assert "sentence_length" in names
