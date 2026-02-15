use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    pub id: String,
    pub label: String,
    pub value: f64,
    pub children: Vec<TreeNode>,
}

/// Create a game tree from JSON representation.
/// Input: JSON string of tree structure.
/// Returns: flattened list of (node_id, parent_id_or_empty, label, value).
#[pyfunction]
pub fn create_game_tree(
    tree_json: &str,
) -> PyResult<Vec<(String, String, String, f64)>> {
    let root: TreeNode = serde_json::from_str(tree_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid tree JSON: {e}")))?;

    let mut result = Vec::new();
    flatten_tree(&root, "", &mut result);
    Ok(result)
}

fn flatten_tree(node: &TreeNode, parent_id: &str, out: &mut Vec<(String, String, String, f64)>) {
    out.push((
        node.id.clone(),
        parent_id.to_string(),
        node.label.clone(),
        node.value,
    ));
    for child in &node.children {
        flatten_tree(child, &node.id, out);
    }
}
