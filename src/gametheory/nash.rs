use pyo3::prelude::*;

/// Find Nash equilibria for a 2-player game using support enumeration.
/// Input: rows, cols, flat p1_payoffs, flat p2_payoffs.
/// Returns list of equilibria, each as (p1_strategy: Vec<f64>, p2_strategy: Vec<f64>).
#[pyfunction]
pub fn find_nash_equilibria(
    rows: usize,
    cols: usize,
    p1_payoffs: Vec<f64>,
    p2_payoffs: Vec<f64>,
) -> PyResult<Vec<(Vec<f64>, Vec<f64>)>> {
    let mut equilibria = Vec::new();

    // Check all pure strategy profiles for Nash equilibria
    for i in 0..rows {
        for j in 0..cols {
            let p1_current = p1_payoffs[i * cols + j];
            let p2_current = p2_payoffs[i * cols + j];

            // Check if player 1 can improve by deviating
            let p1_best = (0..rows)
                .map(|r| p1_payoffs[r * cols + j])
                .any(|v| v > p1_current);

            // Check if player 2 can improve by deviating
            let p2_best = (0..cols)
                .map(|c| p2_payoffs[i * cols + c])
                .any(|v| v > p2_current);

            if !p1_best && !p2_best {
                let mut s1 = vec![0.0; rows];
                let mut s2 = vec![0.0; cols];
                s1[i] = 1.0;
                s2[j] = 1.0;
                equilibria.push((s1, s2));
            }
        }
    }

    // For 2x2 games, also check for mixed strategy Nash equilibrium
    if rows == 2 && cols == 2 {
        if let Some(mixed) = find_2x2_mixed(rows, cols, &p1_payoffs, &p2_payoffs) {
            equilibria.push(mixed);
        }
    }

    Ok(equilibria)
}

fn find_2x2_mixed(
    _rows: usize,
    _cols: usize,
    p1: &[f64],
    p2: &[f64],
) -> Option<(Vec<f64>, Vec<f64>)> {
    // Player 2 mixes to make Player 1 indifferent:
    // p1[0,0]*q + p1[0,1]*(1-q) = p1[1,0]*q + p1[1,1]*(1-q)
    let a = p1[0]; // p1(row0, col0)
    let b = p1[1]; // p1(row0, col1)
    let c = p1[2]; // p1(row1, col0)
    let d = p1[3]; // p1(row1, col1)

    let denom_q = (a - b) - (c - d);
    if denom_q.abs() < 1e-10 {
        return None;
    }
    let q = (d - b) / denom_q;

    // Player 1 mixes to make Player 2 indifferent:
    // p2[0,0]*p + p2[1,0]*(1-p) = p2[0,1]*p + p2[1,1]*(1-p)
    let e = p2[0]; // p2(row0, col0)
    let f = p2[1]; // p2(row0, col1)
    let g = p2[2]; // p2(row1, col0)
    let h = p2[3]; // p2(row1, col1)

    let denom_p = (e - f) - (g - h);
    if denom_p.abs() < 1e-10 {
        return None;
    }
    let p = (h - f) / denom_p;

    // Check that both probabilities are in (0, 1) — strictly interior
    if p <= 0.0 || p >= 1.0 || q <= 0.0 || q >= 1.0 {
        return None;
    }

    Some((vec![p, 1.0 - p], vec![q, 1.0 - q]))
}
