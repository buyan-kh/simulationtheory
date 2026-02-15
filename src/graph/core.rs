use std::collections::HashMap;
use std::sync::{LazyLock, RwLock};

use petgraph::graph::{DiGraph, NodeIndex};
use pyo3::prelude::*;

use crate::types::{GraphEdge, GraphNode};

/// Internal graph storage: maps graph_id → (graph, node_id→index mapping, node data).
type GraphStore = HashMap<
    u64,
    (
        DiGraph<String, f64>,
        HashMap<String, NodeIndex>,
        HashMap<String, GraphNode>,
    ),
>;

static GRAPHS: LazyLock<RwLock<GraphStore>> = LazyLock::new(|| RwLock::new(HashMap::new()));
static NEXT_ID: LazyLock<std::sync::atomic::AtomicU64> =
    LazyLock::new(|| std::sync::atomic::AtomicU64::new(1));

/// Opaque handle to a Rust-side graph.
#[pyclass]
#[derive(Debug, Clone)]
pub struct GraphHandle {
    #[pyo3(get)]
    pub id: u64,
}

#[pymethods]
impl GraphHandle {
    fn __repr__(&self) -> String {
        format!("GraphHandle(id={})", self.id)
    }
}

pub fn allocate_id() -> u64 {
    NEXT_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

pub fn with_graphs<F, R>(f: F) -> R
where
    F: FnOnce(&GraphStore) -> R,
{
    let store = GRAPHS.read().unwrap();
    f(&store)
}

pub fn with_graphs_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut GraphStore) -> R,
{
    let mut store = GRAPHS.write().unwrap();
    f(&mut store)
}

pub fn insert_graph(
    id: u64,
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
) {
    let mut graph = DiGraph::new();
    let mut index_map = HashMap::new();
    let mut node_data = HashMap::new();

    for node in &nodes {
        let idx = graph.add_node(node.id.clone());
        index_map.insert(node.id.clone(), idx);
        node_data.insert(node.id.clone(), node.clone());
    }

    for edge in &edges {
        if let (Some(&src), Some(&tgt)) = (index_map.get(&edge.source), index_map.get(&edge.target))
        {
            graph.add_edge(src, tgt, edge.weight.into_inner());
        }
    }

    with_graphs_mut(|store| {
        store.insert(id, (graph, index_map, node_data));
    });
}
