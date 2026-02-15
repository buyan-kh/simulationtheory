"""Tests for game theory core."""

import pytest

from sp26._core import gametheory as _gt


def test_payoff_matrix_creation():
    rows, cols, p1, p2 = _gt.create_payoff_matrix(
        2, 2, [3.0, 0.0, 5.0, 1.0], [3.0, 5.0, 0.0, 1.0]
    )
    assert rows == 2
    assert cols == 2
    assert len(p1) == 4
    assert len(p2) == 4


def test_payoff_matrix_invalid_size():
    with pytest.raises(ValueError):
        _gt.create_payoff_matrix(2, 2, [1.0, 2.0], [1.0, 2.0, 3.0, 4.0])


def test_nash_prisoners_dilemma():
    """Prisoner's Dilemma has one Nash equilibrium: (Defect, Defect)."""
    # Classic Prisoner's Dilemma:
    #          C      D
    #   C   (3,3)  (0,5)
    #   D   (5,0)  (1,1)
    equilibria = _gt.find_nash_equilibria(
        2, 2,
        [3.0, 0.0, 5.0, 1.0],  # P1 payoffs
        [3.0, 5.0, 0.0, 1.0],  # P2 payoffs
    )

    # Should find (D, D) as pure Nash equilibrium
    assert len(equilibria) >= 1
    found_dd = False
    for p1_strat, p2_strat in equilibria:
        if p1_strat[1] == 1.0 and p2_strat[1] == 1.0:
            found_dd = True
    assert found_dd, f"Expected (Defect, Defect) equilibrium, got {equilibria}"


def test_nash_matching_pennies():
    """Matching Pennies has only a mixed Nash equilibrium at (0.5, 0.5)."""
    #           H      T
    #   H    (1,-1) (-1,1)
    #   T   (-1,1)  (1,-1)
    equilibria = _gt.find_nash_equilibria(
        2, 2,
        [1.0, -1.0, -1.0, 1.0],
        [-1.0, 1.0, 1.0, -1.0],
    )

    # Should find mixed equilibrium (0.5, 0.5)
    assert len(equilibria) >= 1
    found_mixed = False
    for p1_strat, p2_strat in equilibria:
        if abs(p1_strat[0] - 0.5) < 0.01 and abs(p2_strat[0] - 0.5) < 0.01:
            found_mixed = True
    assert found_mixed, f"Expected mixed (0.5, 0.5) equilibrium, got {equilibria}"


def test_minimax_zero_sum():
    # Simple zero-sum game with saddle point:
    #      C1   C2
    # R1   3    5
    # R2   1    4
    # Maximin: max(min(3,5), min(1,4)) = max(3,1) = 3 (row 0)
    # Minimax: min(max(3,1), max(5,4)) = min(3,5) = 3 (col 0)
    value, best_row, best_col = _gt.minimax_solve(2, 2, [3.0, 5.0, 1.0, 4.0])
    assert abs(value - 3.0) < 1e-10
    assert best_row == 0
    assert best_col == 0


def test_dominant_strategies():
    # Prisoner's Dilemma: D strictly dominates C for both players
    p1_dom, p2_dom = _gt.find_dominant_strategies(
        2, 2,
        [3.0, 0.0, 5.0, 1.0],
        [3.0, 5.0, 0.0, 1.0],
    )
    # Row 1 (Defect) dominates for P1
    assert p1_dom == 1
    # Col 1 (Defect) dominates for P2
    assert p2_dom == 1


def test_no_dominant_strategy():
    # Matching Pennies: no dominant strategy
    p1_dom, p2_dom = _gt.find_dominant_strategies(
        2, 2,
        [1.0, -1.0, -1.0, 1.0],
        [-1.0, 1.0, 1.0, -1.0],
    )
    assert p1_dom is None
    assert p2_dom is None
