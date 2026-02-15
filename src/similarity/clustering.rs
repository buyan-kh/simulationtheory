use pyo3::prelude::*;

/// Simple k-means clustering. Returns a Vec of cluster assignments (one per vector).
/// Uses Lloyd's algorithm with random initialization.
#[pyfunction]
pub fn kmeans_cluster(vectors: Vec<Vec<f64>>, k: usize, max_iters: usize) -> PyResult<Vec<usize>> {
    let n = vectors.len();
    if n == 0 || k == 0 {
        return Ok(vec![]);
    }
    let dim = vectors[0].len();
    let k = k.min(n);

    // Initialize centroids by spacing evenly across data points
    let mut centroids: Vec<Vec<f64>> = (0..k)
        .map(|i| vectors[i * n / k].clone())
        .collect();

    let mut assignments = vec![0usize; n];

    for _ in 0..max_iters {
        // Assign each point to nearest centroid
        let new_assignments: Vec<usize> = vectors
            .iter()
            .map(|v| {
                centroids
                    .iter()
                    .enumerate()
                    .map(|(ci, c)| {
                        let dist: f64 = v.iter().zip(c.iter()).map(|(a, b)| (a - b).powi(2)).sum();
                        (ci, dist)
                    })
                    .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
                    .map(|(ci, _)| ci)
                    .unwrap_or(0)
            })
            .collect();

        let converged = new_assignments == assignments;
        assignments = new_assignments;

        if converged {
            break;
        }

        // Update centroids
        centroids = (0..k)
            .map(|ci| {
                let members: Vec<&Vec<f64>> = vectors
                    .iter()
                    .zip(assignments.iter())
                    .filter(|(_, &a)| a == ci)
                    .map(|(v, _)| v)
                    .collect();
                if members.is_empty() {
                    vec![0.0; dim]
                } else {
                    let count = members.len() as f64;
                    (0..dim)
                        .map(|d| members.iter().map(|v| v[d]).sum::<f64>() / count)
                        .collect()
                }
            })
            .collect();
    }

    Ok(assignments)
}
