"""Tests for Python-side payoff matrix construction."""

from sp26.gametheory.payoff import build_payoff_matrix
from sp26.types import Prediction


def test_build_payoff_matrix_basic():
    predictions = [
        Prediction(id="p1", description="A", confidence=0.8, source_series=["s1"]),
        Prediction(id="p2", description="B", confidence=0.6, source_series=["s2"]),
    ]
    rows, cols, p1, p2 = build_payoff_matrix(predictions)
    assert rows == 2
    assert cols == 2
    assert len(p1) == 4
    assert len(p2) == 4
    # Diagonal of P2 should be the confidences (correct prediction)
    assert p2[0] == 0.8  # p2 prepares for p1, p1 occurs
    assert p2[3] == 0.6  # p2 prepares for p2, p2 occurs


def test_build_payoff_matrix_empty():
    rows, cols, p1, p2 = build_payoff_matrix([])
    assert rows == 0
    assert cols == 0


def test_build_payoff_overlap():
    predictions = [
        Prediction(id="p1", description="A", confidence=0.8, source_series=["s1", "s2"]),
        Prediction(id="p2", description="B", confidence=0.6, source_series=["s2", "s3"]),
    ]
    rows, cols, p1, p2 = build_payoff_matrix(predictions)
    # Off-diagonal P2 payoffs should reflect partial overlap
    # p1 occurs, agent prepared for p2: overlap={s2}, union={s1,s2,s3} → 0.6 * 1/3
    assert abs(p2[1] - 0.6 * 1 / 3) < 1e-10
