use pyo3::prelude::*;
use rayon::prelude::*;

/// Euclidean distance between two vectors.
#[pyfunction]
pub fn euclidean_distance(a: Vec<f64>, b: Vec<f64>) -> PyResult<f64> {
    if a.len() != b.len() {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Vectors must have the same length",
        ));
    }
    Ok(euclidean_dist(&a, &b))
}

/// Compute pairwise Euclidean distance matrix. Returns flat Vec<f64> of length n*n.
#[pyfunction]
pub fn euclidean_distance_matrix(vectors: Vec<Vec<f64>>) -> PyResult<Vec<f64>> {
    let n = vectors.len();
    let result: Vec<f64> = (0..n)
        .into_par_iter()
        .flat_map(|i| {
            (0..n)
                .map(|j| {
                    if i == j {
                        0.0
                    } else {
                        euclidean_dist(&vectors[i], &vectors[j])
                    }
                })
                .collect::<Vec<_>>()
        })
        .collect();
    Ok(result)
}

fn euclidean_dist(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f64>()
        .sqrt()
}
