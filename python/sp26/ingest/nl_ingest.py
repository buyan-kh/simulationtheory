"""NL ingestor — uses LLM to extract narrative timelines from natural language."""

from __future__ import annotations

import json
import logging
import re

import httpx

from sp26.config import SP26Config
from sp26.ingest.text import TextIngestor
from sp26.types import DataPoint, DataSeries, IngestResult, RawInput

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """\
You are a narrative-to-chart engine. Given natural language, extract one or more \
data series that represent the key themes, emotions, or variables described. \
Each series is a timeline of events with a numeric score.

For each series, produce an ordered list of events/moments. Each event has:
- label: a SHORT phrase describing what happened at this point (max 6 words)
- value: a float between 0.0 and 1.0 representing the intensity/level at this point

The events should follow the narrative order. Extract the real meaning — if someone \
says "things got worse", that's a drop in value. If they say "I recovered", that's a rise.

Extract at most {max_factors} series. Each series should have between 3 and 12 events.
Focus on the most meaningful dimensions the user is describing.

Respond with ONLY a JSON object, no other text:
{{
  "series": [
    {{
      "name": "short_name",
      "events": [
        {{"label": "Starting point", "value": 0.5}},
        {{"label": "Something happened", "value": 0.8}},
        {{"label": "Things changed", "value": 0.3}}
      ]
    }}
  ]
}}

Text to analyze:
{text}"""


class NLIngestor:
    """Extracts narrative timelines from natural language using an LLM."""

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
            extracted = self._extract_series(text)
        except Exception:
            logger.exception("NL extraction failed; falling back to TextIngestor")
            return self._fallback.ingest(raw_input)

        if not extracted:
            logger.warning("No series extracted; falling back to TextIngestor")
            return self._fallback.ingest(raw_input)

        series = self._build_series(extracted)
        return IngestResult(series=series, raw_text=text)

    def _extract_series(self, text: str) -> list[dict]:
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
        return self._parse_response(response_text)

    def _parse_response(self, text: str) -> list[dict]:
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)

        parsed = json.loads(cleaned)
        raw_series = parsed.get("series", [])

        valid: list[dict] = []
        seen_names: set[str] = set()

        for s in raw_series[: self._config.nl_max_factors]:
            name = self._sanitize_name(s.get("name", ""))
            events = s.get("events", [])

            if not name or not isinstance(events, list) or len(events) < 2:
                continue

            # Validate events
            valid_events: list[dict] = []
            for e in events[:12]:
                label = str(e.get("label", "")).strip()
                try:
                    value = max(0.0, min(1.0, float(e.get("value", 0.5))))
                except (ValueError, TypeError):
                    continue
                if label:
                    valid_events.append({"label": label, "value": value})

            if len(valid_events) < 2:
                continue

            # Handle duplicate names
            original_name = name
            counter = 2
            while name in seen_names:
                name = f"{original_name}_{counter}"
                counter += 1
            seen_names.add(name)

            valid.append({"name": name, "events": valid_events})

        return valid

    @staticmethod
    def _sanitize_name(name: str) -> str:
        name = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().lower())
        name = re.sub(r"_+", "_", name).strip("_")
        return name[:50]

    @staticmethod
    def _build_series(extracted: list[dict]) -> list[DataSeries]:
        series: list[DataSeries] = []
        for s in extracted:
            points = [
                DataPoint(
                    index=float(i),
                    value=event["value"],
                    label=event["label"],
                )
                for i, event in enumerate(s["events"])
            ]
            series.append(DataSeries(
                name=s["name"],
                points=points,
                metadata={"source": "nl_extraction"},
            ))
        return series
