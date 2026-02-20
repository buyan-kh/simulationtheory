"""Tests for NL decoder."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from sp26.config import SP26Config
from sp26.decode.decoder import Decoder
from sp26.types import (
    GameTheoryResult,
    Prediction,
    PredictionResult,
)


class TestDecoder:
    @pytest.mark.asyncio
    async def test_decode_parses_response(self):
        config = SP26Config(anthropic_api_key="test")
        decoder = Decoder(config)

        mock_response = (
            "SUMMARY: This is a test summary.\n"
            "ANALYSIS: Detailed analysis here.\n"
            "FINDINGS:\n"
            "- Finding one\n"
            "- Finding two\n"
        )

        with patch.object(decoder, "_call_api", new_callable=AsyncMock) as mock_api:
            mock_api.return_value = mock_response

            result = await decoder.decode(
                GameTheoryResult(),
                PredictionResult(
                    predictions=[
                        Prediction(id="p1", description="test", confidence=0.5),
                    ],
                    chart_id=1,
                ),
            )

            assert "test summary" in result.summary
            assert "Detailed analysis" in result.detailed_analysis
            assert len(result.key_findings) == 2
            assert "Finding one" in result.key_findings[0]

    @pytest.mark.asyncio
    async def test_decode_fallback_on_bad_format(self):
        config = SP26Config(anthropic_api_key="test")
        decoder = Decoder(config)

        with patch.object(decoder, "_call_api", new_callable=AsyncMock) as mock_api:
            mock_api.return_value = "Just a plain text response without structure."

            result = await decoder.decode(
                GameTheoryResult(),
                PredictionResult(predictions=[], chart_id=1),
            )

            # Should use the first 200 chars as fallback summary
            assert "plain text" in result.summary

    def test_build_prompt(self):
        config = SP26Config()
        decoder = Decoder(config)

        prompt = decoder._build_prompt(
            GameTheoryResult(minimax_value=2.5),
            PredictionResult(
                predictions=[
                    Prediction(id="p1", description="Market goes up", confidence=0.7),
                ],
                chart_id=1,
            ),
        )

        assert "Market goes up" in prompt
        assert "70%" in prompt
        assert "2.5" in prompt

    def test_build_prompt_with_context(self):
        config = SP26Config()
        decoder = Decoder(config)

        prompt = decoder._build_prompt(
            GameTheoryResult(),
            PredictionResult(
                predictions=[
                    Prediction(id="p1", description="career_risk rising", confidence=0.8),
                ],
                chart_id=1,
            ),
            context="I slept with my coworker Amy, it feels weird at work.",
        )

        assert "I slept with my coworker" in prompt
        assert "Original Context" in prompt

    def test_build_prompt_without_context(self):
        """Existing behavior preserved when no context is given."""
        config = SP26Config()
        decoder = Decoder(config)

        prompt = decoder._build_prompt(
            GameTheoryResult(),
            PredictionResult(
                predictions=[Prediction(id="p1", description="test", confidence=0.5)],
                chart_id=1,
            ),
        )

        assert "Original Context" not in prompt
