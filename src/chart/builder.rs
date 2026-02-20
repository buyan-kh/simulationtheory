use pyo3::prelude::*;

use super::core::{allocate_id, insert_chart, ChartHandle};
use crate::types::ChartSeries;

/// Create a chart from a list of serialized series (JSON strings).
#[pyfunction]
pub fn create_chart(series_json: Vec<String>) -> PyResult<ChartHandle> {
    let series: Vec<ChartSeries> = series_json
        .iter()
        .map(|s| serde_json::from_str(s))
        .collect::<Result<_, _>>()
        .map_err(|e| {
            pyo3::exceptions::PyValueError::new_err(format!("Invalid series JSON: {e}"))
        })?;

    let id = allocate_id();
    insert_chart(id, series);
    Ok(ChartHandle { id })
}
