mod core;
mod builder;
mod ops;

use pyo3::prelude::*;

pub fn register(parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let m = PyModule::new(parent.py(), "graph")?;
    m.add_class::<core::GraphHandle>()?;
    m.add_function(wrap_pyfunction!(builder::create_graph, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_neighbors, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_node_count, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_edge_count, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_all_node_ids, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_node_embedding, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::drop_graph, &m)?)?;
    parent.add_submodule(&m)?;
    Ok(())
}
