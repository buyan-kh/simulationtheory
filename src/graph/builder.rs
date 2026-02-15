use pyo3::prelude::*;

use super::core::{allocate_id, GraphHandle, insert_graph};
use crate::types::{GraphEdge, GraphNode};

/// Create a graph from lists of serialized nodes and edges (JSON strings).
#[pyfunction]
pub fn create_graph(
    nodes_json: Vec<String>,
    edges_json: Vec<String>,
) -> PyResult<GraphHandle> {
    let nodes: Vec<GraphNode> = nodes_json
        .iter()
        .map(|s| serde_json::from_str(s))
        .collect::<Result<_, _>>()
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid node JSON: {e}")))?;

    let edges: Vec<GraphEdge> = edges_json
        .iter()
        .map(|s| serde_json::from_str(s))
        .collect::<Result<_, _>>()
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid edge JSON: {e}")))?;

    let id = allocate_id();
    insert_graph(id, nodes, edges);
    Ok(GraphHandle { id })
}
