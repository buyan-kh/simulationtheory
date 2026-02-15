"""NL Decoder — uses Anthropic API to generate natural language summaries."""

from __future__ import annotations

import httpx

from sp26.config import SP26Config
from sp26.types import DecodedOutput, GameTheoryResult, PredictionResult


class Decoder:
    """Decodes game theory results into natural language using Anthropic's API."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config
        self._base_url = "https://api.anthropic.com/v1/messages"

    async def decode(
        self,
        game_result: GameTheoryResult,
        prediction_result: PredictionResult,
    ) -> DecodedOutput:
        prompt = self._build_prompt(game_result, prediction_result)
        response_text = await self._call_api(prompt)
        return self._parse_response(response_text)

    def _build_prompt(
        self,
        game_result: GameTheoryResult,
        prediction_result: PredictionResult,
    ) -> str:
        predictions_text = "\n".join(
            f"- [{p.confidence:.0%}] {p.description}" for p in prediction_result.predictions[:10]
        )

        eq_text = ""
        for i, eq in enumerate(game_result.equilibria[:3]):
            strategies = []
            for profile in eq.profiles:
                strats = ", ".join(f"{s.name}({s.probability:.2f})" for s in profile.strategies)
                strategies.append(f"  {profile.player}: {strats}")
            eq_text += f"\nEquilibrium {i + 1}:\n" + "\n".join(strategies)

        dom_text = ""
        for player, strat in game_result.dominant_strategies.items():
            if strat:
                dom_text += f"\n  {player}: {strat}"

        return f"""Analyze the following game-theoretic prediction results and provide a clear, concise summary.

## Predictions
{predictions_text}

## Nash Equilibria
{eq_text or "No pure/mixed equilibria found."}

## Dominant Strategies
{dom_text or "No dominant strategies found."}

## Minimax Value
{game_result.minimax_value if game_result.minimax_value is not None else "N/A"}

Please provide:
1. A brief summary (2-3 sentences)
2. A detailed analysis
3. Key findings (bullet points)

Format your response as:
SUMMARY: <summary>
ANALYSIS: <analysis>
FINDINGS:
- <finding 1>
- <finding 2>
..."""

    async def _call_api(self, prompt: str) -> str:
        headers = {
            "x-api-key": self._config.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self._config.decode_model,
            "max_tokens": self._config.max_decode_tokens,
            "messages": [{"role": "user", "content": prompt}],
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

        return data["content"][0]["text"]

    def _parse_response(self, text: str) -> DecodedOutput:
        summary = ""
        analysis = ""
        findings: list[str] = []

        current_section = ""
        for line in text.split("\n"):
            if line.startswith("SUMMARY:"):
                current_section = "summary"
                summary = line[len("SUMMARY:"):].strip()
            elif line.startswith("ANALYSIS:"):
                current_section = "analysis"
                analysis = line[len("ANALYSIS:"):].strip()
            elif line.startswith("FINDINGS:"):
                current_section = "findings"
            elif current_section == "summary" and line.strip():
                summary += " " + line.strip()
            elif current_section == "analysis" and line.strip():
                analysis += " " + line.strip()
            elif current_section == "findings" and line.strip().startswith("- "):
                findings.append(line.strip()[2:])

        # Fallback if parsing didn't work well
        if not summary:
            summary = text[:200]

        return DecodedOutput(
            summary=summary.strip(),
            detailed_analysis=analysis.strip(),
            key_findings=findings,
        )
