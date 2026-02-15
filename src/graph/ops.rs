use petgraph::Direction;
use pyo3::prelude::*;

use super::core::with_graphs;

/// Get neighbor node IDs for a given node in a graph.
#[pyfunction]
pub fn get_neighbors(graph_id: u64, node_id: &str) -> PyResult<Vec<String>> {
    with_graphs(|store| {
        let (graph, index_map, _) = store
            .get(&graph_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Graph not found"))?;
        let idx = index_map
            .get(node_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Node not found"))?;
        let neighbors = graph
            .neighbors_directed(*idx, Direction::Outgoing)
            .map(|n| graph[n].clone())
            .collect();
        Ok(neighbors)
    })
}

/// Get the number of nodes in a graph.
#[pyfunction]
pub fn get_node_count(graph_id: u64) -> PyResult<usize> {
    with_graphs(|store| {
        let (graph, _, _) = store
            .get(&graph_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Graph not found"))?;
        Ok(graph.node_count())
    })
}

/// Get the number of edges in a graph.
#[pyfunction]
pub fn get_edge_count(graph_id: u64) -> PyResult<usize> {
    with_graphs(|store| {
        let (graph, _, _) = store
            .get(&graph_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Graph not found"))?;
        Ok(graph.edge_count())
    })
}

/// Get all node IDs in a graph.
#[pyfunction]
pub fn get_all_node_ids(graph_id: u64) -> PyResult<Vec<String>> {
    with_graphs(|store| {
        let (_, index_map, _) = store
            .get(&graph_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Graph not found"))?;
        Ok(index_map.keys().cloned().collect())
    })
}

/// Get the embedding vector for a node.
#[pyfunction]
pub fn get_node_embedding(graph_id: u64, node_id: &str) -> PyResult<Vec<f64>> {
    with_graphs(|store| {
        let (_, _, node_data) = store
            .get(&graph_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Graph not found"))?;
        let node = node_data
            .get(node_id)
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("Node not found"))?;
        Ok(node.embedding.clone())
    })
}

/// Drop a graph from the store, freeing memory.
#[pyfunction]
pub fn drop_graph(graph_id: u64) -> PyResult<bool> {
    super::core::with_graphs_mut(|store| Ok(store.remove(&graph_id).is_some()))
}
