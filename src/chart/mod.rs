mod core;
mod builder;
mod ops;

use pyo3::prelude::*;

pub fn register(parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let m = PyModule::new(parent.py(), "chart")?;
    m.add_class::<core::ChartHandle>()?;
    m.add_function(wrap_pyfunction!(builder::create_chart, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_series_count, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_total_points, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_series_names, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_series_values, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::get_series_window, &m)?)?;
    m.add_function(wrap_pyfunction!(ops::drop_chart, &m)?)?;
    parent.add_submodule(&m)?;
    Ok(())
}
