use pyo3::prelude::*;
use rayon::prelude::*;

/// Cosine similarity between two vectors.
#[pyfunction]
pub fn cosine_similarity(a: Vec<f64>, b: Vec<f64>) -> PyResult<f64> {
    if a.len() != b.len() {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Vectors must have the same length",
        ));
    }
    Ok(cosine_sim(&a, &b))
}

/// Compute pairwise cosine similarity matrix for a list of vectors.
/// Returns a flat Vec<f64> of length n*n (row-major).
#[pyfunction]
pub fn cosine_similarity_matrix(vectors: Vec<Vec<f64>>) -> PyResult<Vec<f64>> {
    let n = vectors.len();
    let result: Vec<f64> = (0..n)
        .into_par_iter()
        .flat_map(|i| {
            (0..n)
                .map(|j| {
                    if i == j {
                        1.0
                    } else {
                        cosine_sim(&vectors[i], &vectors[j])
                    }
                })
                .collect::<Vec<_>>()
        })
        .collect();
    Ok(result)
}

fn cosine_sim(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}
