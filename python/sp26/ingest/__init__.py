"""Data ingestion and normalization."""

from sp26.ingest.base import Ingestor
from sp26.ingest.text import TextIngestor
from sp26.ingest.csv_ingest import CsvIngestor
from sp26.ingest.json_ingest import JsonIngestor
from sp26.ingest.nl_ingest import NLIngestor
from sp26.ingest.auto import AutoIngestor

__all__ = ["Ingestor", "TextIngestor", "CsvIngestor", "JsonIngestor", "NLIngestor", "AutoIngestor"]
