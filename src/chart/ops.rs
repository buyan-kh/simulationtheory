use pyo3::prelude::*;

use super::core::{with_charts, with_charts_mut};

/// Get the number of series in a chart.
#[pyfunction]
pub fn get_series_count(chart_id: u64) -> PyResult<usize> {
    with_charts(|store| {
        let series = store
            .get(&chart_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Chart not found"))?;
        Ok(series.len())
    })
}

/// Get the total number of data points across all series.
#[pyfunction]
pub fn get_total_points(chart_id: u64) -> PyResult<usize> {
    with_charts(|store| {
        let series = store
            .get(&chart_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Chart not found"))?;
        Ok(series.iter().map(|s| s.points.len()).sum())
    })
}

/// Get the names of all series in a chart.
#[pyfunction]
pub fn get_series_names(chart_id: u64) -> PyResult<Vec<String>> {
    with_charts(|store| {
        let series = store
            .get(&chart_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Chart not found"))?;
        Ok(series.iter().map(|s| s.name.clone()).collect())
    })
}

/// Get all (index, value) pairs for a named series.
#[pyfunction]
pub fn get_series_values(chart_id: u64, series_name: &str) -> PyResult<Vec<(f64, f64)>> {
    with_charts(|store| {
        let all_series = store
            .get(&chart_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Chart not found"))?;
        let series = all_series
            .iter()
            .find(|s| s.name == series_name)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Series not found"))?;
        Ok(series.points.iter().map(|p| (p.index, p.value)).collect())
    })
}

/// Get a windowed slice of (index, value) pairs for a named series.
#[pyfunction]
pub fn get_series_window(
    chart_id: u64,
    series_name: &str,
    start_index: f64,
    end_index: f64,
) -> PyResult<Vec<(f64, f64)>> {
    with_charts(|store| {
        let all_series = store
            .get(&chart_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Chart not found"))?;
        let series = all_series
            .iter()
            .find(|s| s.name == series_name)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Series not found"))?;
        Ok(series
            .points
            .iter()
            .filter(|p| p.index >= start_index && p.index <= end_index)
            .map(|p| (p.index, p.value))
            .collect())
    })
}

/// Drop a chart from the store, freeing memory.
#[pyfunction]
pub fn drop_chart(chart_id: u64) -> PyResult<bool> {
    with_charts_mut(|store| Ok(store.remove(&chart_id).is_some()))
}
