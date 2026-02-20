use std::collections::HashMap;
use std::sync::{LazyLock, RwLock};

use pyo3::prelude::*;

use crate::types::ChartSeries;

/// Internal chart storage: maps chart_id → list of named series.
type ChartStore = HashMap<u64, Vec<ChartSeries>>;

static CHARTS: LazyLock<RwLock<ChartStore>> = LazyLock::new(|| RwLock::new(HashMap::new()));
static NEXT_ID: LazyLock<std::sync::atomic::AtomicU64> =
    LazyLock::new(|| std::sync::atomic::AtomicU64::new(1));

/// Opaque handle to a Rust-side chart.
#[pyclass]
#[derive(Debug, Clone)]
pub struct ChartHandle {
    #[pyo3(get)]
    pub id: u64,
}

#[pymethods]
impl ChartHandle {
    fn __repr__(&self) -> String {
        format!("ChartHandle(id={})", self.id)
    }
}

pub fn allocate_id() -> u64 {
    NEXT_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

pub fn with_charts<F, R>(f: F) -> R
where
    F: FnOnce(&ChartStore) -> R,
{
    let store = CHARTS.read().unwrap();
    f(&store)
}

pub fn with_charts_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut ChartStore) -> R,
{
    let mut store = CHARTS.write().unwrap();
    f(&mut store)
}

pub fn insert_chart(id: u64, series: Vec<ChartSeries>) {
    with_charts_mut(|store| {
        store.insert(id, series);
    });
}
