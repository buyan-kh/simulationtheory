mod types;
mod graph;
mod similarity;
mod gametheory;
mod paths;

use pyo3::prelude::*;

#[pymodule]
fn _core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    graph::register(m)?;
    similarity::register(m)?;
    gametheory::register(m)?;
    paths::register(m)?;
    Ok(())
}
