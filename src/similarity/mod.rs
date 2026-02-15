mod cosine;
mod euclidean;
mod clustering;

use pyo3::prelude::*;

pub fn register(parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let m = PyModule::new(parent.py(), "similarity")?;
    m.add_function(wrap_pyfunction!(cosine::cosine_similarity, &m)?)?;
    m.add_function(wrap_pyfunction!(cosine::cosine_similarity_matrix, &m)?)?;
    m.add_function(wrap_pyfunction!(euclidean::euclidean_distance, &m)?)?;
    m.add_function(wrap_pyfunction!(euclidean::euclidean_distance_matrix, &m)?)?;
    m.add_function(wrap_pyfunction!(clustering::kmeans_cluster, &m)?)?;
    parent.add_submodule(&m)?;
    Ok(())
}
