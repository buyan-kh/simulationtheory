use pyo3::prelude::*;

/// Create a payoff matrix from flat arrays of player1 and player2 payoffs.
/// Returns (rows, cols, p1_payoffs, p2_payoffs) as a validated tuple.
#[pyfunction]
pub fn create_payoff_matrix(
    rows: usize,
    cols: usize,
    p1_payoffs: Vec<f64>,
    p2_payoffs: Vec<f64>,
) -> PyResult<(usize, usize, Vec<f64>, Vec<f64>)> {
    let expected = rows * cols;
    if p1_payoffs.len() != expected || p2_payoffs.len() != expected {
        return Err(pyo3::exceptions::PyValueError::new_err(format!(
            "Expected {} payoff values ({}x{}), got p1={}, p2={}",
            expected,
            rows,
            cols,
            p1_payoffs.len(),
            p2_payoffs.len()
        )));
    }
    Ok((rows, cols, p1_payoffs, p2_payoffs))
}
