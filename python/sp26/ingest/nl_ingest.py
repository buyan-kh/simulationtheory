"""NL ingestor — uses LLM to extract semantic factors from natural language."""

from __future__ import annotations

import json
import logging
import re

import httpx

from sp26.config import SP26Config
from sp26.ingest.text import TextIngestor
from sp26.types import DataPoint, DataSeries, IngestResult, RawInput

logger = logging.getLogger(__name__)

TEMPORAL_LABELS = ["past", "present", "near_future", "far_future"]

EXTRACTION_PROMPT = """\
You are a semantic analysis engine. Given natural language text, extract the key \
underlying factors/variables at play and score them across a temporal dimension.

For each factor, provide:
- name: a short snake_case identifier (e.g., "career_risk", "emotional_distress")
- description: a one-sentence description of what this factor represents
- scores: exactly 4 float values between 0.0 and 1.0, representing:
  [0] = past state (before the described situation)
  [1] = present state (current situation as described)
  [2] = near future (likely next development)
  [3] = far future (longer-term trajectory)

Extract at most {max_factors} factors. Focus on the most significant dynamics.

Respond with ONLY a JSON object in this exact format, no other text:
{{
  "factors": [
    {{
      "name": "factor_name",
      "description": "What this factor represents",
      "scores": [0.1, 0.5, 0.7, 0.8]
    }}
  ]
}}

Text to analyze:
{text}"""


class NLIngestor:
    """Extracts semantic factors from natural language using an LLM."""

    def __init__(self, config: SP26Config) -> None:
        self._config = config
        self._fallback = TextIngestor()
        self._base_url = "https://api.anthropic.com/v1/messages"

    def ingest(self, raw_input: RawInput) -> IngestResult:
        text = raw_input.content.strip()
        if not text:
            return IngestResult(series=[], raw_text=text)

        if not self._config.anthropic_api_key:
            logger.warning("No Anthropic API key configured; falling back to TextIngestor")
            return self._fallback.ingest(raw_input)

        try:
            factors = self._extract_factors(text)
        except Exception:
            logger.exception("NL extraction failed; falling back to TextIngestor")
            return self._fallback.ingest(raw_input)

        if not factors:
            logger.warning("No factors extracted; falling back to TextIngestor")
            return self._fallback.ingest(raw_input)

        series = self._factors_to_series(factors)
        return IngestResult(series=series, raw_text=text)

    def _extract_factors(self, text: str) -> list[dict]:
        prompt = EXTRACTION_PROMPT.format(
            max_factors=self._config.nl_max_factors,
            text=text,
        )

        headers = {
            "x-api-key": self._config.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self._config.nl_ingest_model,
            "max_tokens": self._config.nl_max_ingest_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }

        with httpx.Client() as client:
            response = client.post(
                self._base_url,
                json=payload,
                headers=headers,
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        response_text = data["content"][0]["text"]
        return self._parse_factors(response_text)

    def _parse_factors(self, text: str) -> list[dict]:
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)

        parsed = json.loads(cleaned)
        raw_factors = parsed.get("factors", [])

        valid_factors: list[dict] = []
        seen_names: set[str] = set()

        for f in raw_factors[: self._config.nl_max_factors]:
            name = self._sanitize_name(f.get("name", ""))
            description = str(f.get("description", ""))
            scores = f.get("scores", [])

            if not name or not isinstance(scores, list) or len(scores) != 4:
                continue

            try:
                scores = [max(0.0, min(1.0, float(s))) for s in scores]
            except (ValueError, TypeError):
                continue

            # Handle duplicate names
            original_name = name
            counter = 2
            while name in seen_names:
                name = f"{original_name}_{counter}"
                counter += 1
            seen_names.add(name)

            valid_factors.append({
                "name": name,
                "description": description,
                "scores": scores,
            })

        return valid_factors

    @staticmethod
    def _sanitize_name(name: str) -> str:
        """Convert a name to a valid snake_case identifier."""
        name = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().lower())
        name = re.sub(r"_+", "_", name).strip("_")
        return name[:50]

    @staticmethod
    def _factors_to_series(factors: list[dict]) -> list[DataSeries]:
        series: list[DataSeries] = []
        for factor in factors:
            points = [
                DataPoint(index=float(i), value=score)
                for i, score in enumerate(factor["scores"])
            ]
            series.append(DataSeries(
                name=factor["name"],
                points=points,
                metadata={
                    "source": "nl_extraction",
                    "description": factor["description"],
                    "temporal_labels": TEMPORAL_LABELS,
                },
            ))
        return series
