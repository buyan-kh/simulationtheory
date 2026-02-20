"""Tests for NL ingestor."""

from __future__ import annotations

import json
from unittest.mock import patch, MagicMock

from sp26.config import SP26Config
from sp26.ingest.nl_ingest import NLIngestor
from sp26.types import RawInput


def _mock_api_response(factors: list[dict]) -> dict:
    """Build a mock Anthropic API response."""
    return {
        "content": [{"text": json.dumps({"factors": factors})}]
    }


def _patch_httpx(mock_response):
    """Create a patched httpx.Client context."""
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_response
    return patch("sp26.ingest.nl_ingest.httpx.Client", return_value=mock_client)


def _make_mock_response(factors: list[dict]) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = _mock_api_response(factors)
    resp.raise_for_status = MagicMock()
    return resp


class TestNLIngestor:
    def _config(self) -> SP26Config:
        return SP26Config(anthropic_api_key="test-key", nl_max_factors=5)

    def test_extracts_semantic_factors(self):
        ingestor = NLIngestor(self._config())

        mock_factors = [
            {
                "name": "career_risk",
                "description": "Risk to career",
                "scores": [0.2, 0.6, 0.8, 0.85],
            },
            {
                "name": "emotional_distress",
                "description": "Level of emotional distress",
                "scores": [0.3, 0.7, 0.6, 0.5],
            },
        ]

        with _patch_httpx(_make_mock_response(mock_factors)):
            result = ingestor.ingest(
                RawInput(content="I slept with my coworker. It feels weird at work.")
            )

        assert len(result.series) == 2
        assert result.series[0].name == "career_risk"
        assert result.series[1].name == "emotional_distress"
        assert len(result.series[0].points) == 4
        assert result.series[0].points[0].index == 0.0
        assert result.series[0].points[0].value == 0.2
        assert result.series[0].metadata["source"] == "nl_extraction"
        assert "description" in result.series[0].metadata
        assert result.raw_text != ""

    def test_falls_back_on_api_error(self):
        ingestor = NLIngestor(self._config())

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.side_effect = Exception("API error")

        with patch("sp26.ingest.nl_ingest.httpx.Client", return_value=mock_client):
            result = ingestor.ingest(
                RawInput(content="Some text here. Another sentence.")
            )

        names = {s.name for s in result.series}
        assert "sentence_length" in names

    def test_falls_back_on_no_api_key(self):
        config = SP26Config(anthropic_api_key="")
        ingestor = NLIngestor(config)
        result = ingestor.ingest(RawInput(content="Hello world. Testing."))
        names = {s.name for s in result.series}
        assert "sentence_length" in names

    def test_empty_input(self):
        ingestor = NLIngestor(self._config())
        result = ingestor.ingest(RawInput(content=""))
        assert result.series == []

    def test_handles_markdown_code_fences(self):
        ingestor = NLIngestor(self._config())

        response_text = '```json\n{"factors": [{"name": "stress", "description": "Stress level", "scores": [0.3, 0.8, 0.7, 0.5]}]}\n```'
        resp = MagicMock()
        resp.json.return_value = {"content": [{"text": response_text}]}
        resp.raise_for_status = MagicMock()

        with _patch_httpx(resp):
            result = ingestor.ingest(RawInput(content="I am very stressed."))

        assert len(result.series) == 1
        assert result.series[0].name == "stress"

    def test_clamps_scores(self):
        ingestor = NLIngestor(self._config())

        mock_factors = [
            {"name": "test", "description": "Test", "scores": [-0.5, 1.5, 0.5, 0.5]}
        ]

        with _patch_httpx(_make_mock_response(mock_factors)):
            result = ingestor.ingest(RawInput(content="Some text."))

        assert result.series[0].points[0].value == 0.0
        assert result.series[0].points[1].value == 1.0

    def test_respects_max_factors(self):
        config = SP26Config(anthropic_api_key="test-key", nl_max_factors=2)
        ingestor = NLIngestor(config)

        mock_factors = [
            {"name": f"factor_{i}", "description": f"F{i}", "scores": [0.5, 0.5, 0.5, 0.5]}
            for i in range(10)
        ]

        with _patch_httpx(_make_mock_response(mock_factors)):
            result = ingestor.ingest(RawInput(content="Many things happening."))

        assert len(result.series) <= 2

    def test_duplicate_names_get_suffix(self):
        ingestor = NLIngestor(self._config())

        mock_factors = [
            {"name": "risk", "description": "Risk A", "scores": [0.1, 0.2, 0.3, 0.4]},
            {"name": "risk", "description": "Risk B", "scores": [0.5, 0.6, 0.7, 0.8]},
        ]

        with _patch_httpx(_make_mock_response(mock_factors)):
            result = ingestor.ingest(RawInput(content="Double risk."))

        names = [s.name for s in result.series]
        assert names == ["risk", "risk_2"]

    def test_skips_malformed_factors(self):
        ingestor = NLIngestor(self._config())

        mock_factors = [
            {"name": "good", "description": "Valid", "scores": [0.1, 0.2, 0.3, 0.4]},
            {"name": "bad_scores", "description": "Wrong length", "scores": [0.1, 0.2]},
            {"name": "", "description": "No name", "scores": [0.1, 0.2, 0.3, 0.4]},
            {"name": "also_good", "description": "Valid too", "scores": [0.5, 0.6, 0.7, 0.8]},
        ]

        with _patch_httpx(_make_mock_response(mock_factors)):
            result = ingestor.ingest(RawInput(content="Mixed quality."))

        names = [s.name for s in result.series]
        assert names == ["good", "also_good"]
