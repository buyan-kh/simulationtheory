"""SP26 — Game-Theoretic Prediction Engine."""

__version__ = "0.1.0"

from sp26.types import RawInput, PipelineResult
from sp26.config import SP26Config
from sp26.pipeline import Pipeline

__all__ = ["Pipeline", "SP26Config", "RawInput", "PipelineResult", "__version__"]
