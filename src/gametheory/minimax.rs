use pyo3::prelude::*;

/// Solve a zero-sum game using minimax.
/// Input: rows, cols, flat payoffs (from player 1's perspective).
/// Returns (minimax_value, p1_best_row, p2_best_col).
#[pyfunction]
pub fn minimax_solve(
    rows: usize,
    cols: usize,
    payoffs: Vec<f64>,
) -> PyResult<(f64, usize, usize)> {
    if payoffs.len() != rows * cols {
        return Err(pyo3::exceptions::PyValueError::new_err("Invalid payoff size"));
    }

    // Maximin: Player 1 maximizes their minimum payoff
    let mut maximin_val = f64::NEG_INFINITY;
    let mut best_row = 0;
    for i in 0..rows {
        let row_min = (0..cols)
            .map(|j| payoffs[i * cols + j])
            .fold(f64::INFINITY, f64::min);
        if row_min > maximin_val {
            maximin_val = row_min;
            best_row = i;
        }
    }

    // Minimax: Player 2 minimizes Player 1's maximum payoff
    let mut minimax_val = f64::INFINITY;
    let mut best_col = 0;
    for j in 0..cols {
        let col_max = (0..rows)
            .map(|i| payoffs[i * cols + j])
            .fold(f64::NEG_INFINITY, f64::max);
        if col_max < minimax_val {
            minimax_val = col_max;
            best_col = j;
        }
    }

    // For zero-sum games, if maximin == minimax, we have a saddle point
    let value = if (maximin_val - minimax_val).abs() < 1e-10 {
        maximin_val
    } else {
        // Return maximin as the guaranteed value for player 1
        maximin_val
    };

    Ok((value, best_row, best_col))
}
