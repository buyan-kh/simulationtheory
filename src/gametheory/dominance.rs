use pyo3::prelude::*;

/// Find strictly dominant strategies for each player.
/// Returns (Option<p1_dominant_row>, Option<p2_dominant_col>).
#[pyfunction]
pub fn find_dominant_strategies(
    rows: usize,
    cols: usize,
    p1_payoffs: Vec<f64>,
    p2_payoffs: Vec<f64>,
) -> PyResult<(Option<usize>, Option<usize>)> {
    let p1_dom = find_p1_dominant(rows, cols, &p1_payoffs);
    let p2_dom = find_p2_dominant(rows, cols, &p2_payoffs);
    Ok((p1_dom, p2_dom))
}

/// A strategy i strictly dominates all others if for every opponent action j,
/// payoff(i, j) > payoff(k, j) for all k != i.
fn find_p1_dominant(rows: usize, cols: usize, payoffs: &[f64]) -> Option<usize> {
    'outer: for i in 0..rows {
        for k in 0..rows {
            if k == i {
                continue;
            }
            for j in 0..cols {
                if payoffs[i * cols + j] <= payoffs[k * cols + j] {
                    continue 'outer;
                }
            }
        }
        return Some(i);
    }
    None
}

fn find_p2_dominant(rows: usize, cols: usize, payoffs: &[f64]) -> Option<usize> {
    'outer: for j in 0..cols {
        for l in 0..cols {
            if l == j {
                continue;
            }
            for i in 0..rows {
                if payoffs[i * cols + j] <= payoffs[i * cols + l] {
                    continue 'outer;
                }
            }
        }
        return Some(j);
    }
    None
}
