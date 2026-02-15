use pyo3::prelude::*;
use std::collections::{HashMap, VecDeque};

/// BFS from a start node in the graph, returning all paths up to max_depth.
/// Input: graph adjacency list as JSON string: {"node_id": ["neighbor1", "neighbor2", ...]}.
/// Returns: list of paths, each path is a list of node IDs.
#[pyfunction]
pub fn bfs_paths(
    adjacency_json: &str,
    start: &str,
    max_depth: usize,
) -> PyResult<Vec<Vec<String>>> {
    let adj: HashMap<String, Vec<String>> = serde_json::from_str(adjacency_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {e}")))?;

    let mut paths = Vec::new();
    let mut queue: VecDeque<Vec<String>> = VecDeque::new();
    queue.push_back(vec![start.to_string()]);

    while let Some(path) = queue.pop_front() {
        if path.len() > max_depth {
            continue;
        }
        let last = path.last().unwrap().clone();
        if let Some(neighbors) = adj.get(&last) {
            let neighbors: &Vec<String> = neighbors;
            if neighbors.is_empty() || path.len() == max_depth {
                paths.push(path.clone());
            }
            for neighbor in neighbors {
                if !path.contains(neighbor) {
                    let mut new_path = path.clone();
                    new_path.push(neighbor.clone());
                    queue.push_back(new_path);
                }
            }
        } else {
            paths.push(path);
        }
    }

    Ok(paths)
}

/// DFS from a start node, returning all paths up to max_depth.
#[pyfunction]
pub fn dfs_paths(
    adjacency_json: &str,
    start: &str,
    max_depth: usize,
) -> PyResult<Vec<Vec<String>>> {
    let adj: HashMap<String, Vec<String>> = serde_json::from_str(adjacency_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {e}")))?;

    let mut paths = Vec::new();
    let mut stack: Vec<Vec<String>> = vec![vec![start.to_string()]];

    while let Some(path) = stack.pop() {
        if path.len() > max_depth {
            continue;
        }
        let last = path.last().unwrap().clone();
        if let Some(neighbors) = adj.get(&last) {
            let neighbors: &Vec<String> = neighbors;
            if neighbors.is_empty() || path.len() == max_depth {
                paths.push(path.clone());
            }
            for neighbor in neighbors {
                if !path.contains(neighbor) {
                    let mut new_path = path.clone();
                    new_path.push(neighbor.clone());
                    stack.push(new_path);
                }
            }
        } else {
            paths.push(path);
        }
    }

    Ok(paths)
}

/// Simple Monte Carlo Tree Search.
/// Input: adjacency list JSON, start node, number of simulations, max_depth.
/// Returns: list of (node_id, visit_count, avg_value) for each explored node.
#[pyfunction]
pub fn mcts_search(
    adjacency_json: &str,
    values_json: &str,
    start: &str,
    num_simulations: usize,
    max_depth: usize,
) -> PyResult<Vec<(String, usize, f64)>> {
    let adj: HashMap<String, Vec<String>> = serde_json::from_str(adjacency_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid adj JSON: {e}")))?;
    let values: HashMap<String, f64> = serde_json::from_str(values_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid values JSON: {e}")))?;

    let mut visits: HashMap<String, usize> = HashMap::new();
    let mut total_values: HashMap<String, f64> = HashMap::new();

    // Simple random rollout MCTS
    for sim in 0..num_simulations {
        let mut current = start.to_string();
        let mut path = vec![current.clone()];

        for _ in 0..max_depth {
            if let Some(neighbors) = adj.get(&current) {
                if neighbors.is_empty() {
                    break;
                }
                // Deterministic selection based on simulation index for reproducibility
                let next = &neighbors[sim % neighbors.len()];
                if path.contains(next) {
                    break;
                }
                current = next.clone();
                path.push(current.clone());
            } else {
                break;
            }
        }

        // Backpropagate value
        let leaf_value = values.get(&current).copied().unwrap_or(0.0);
        for node in &path {
            *visits.entry(node.clone()).or_insert(0) += 1;
            *total_values.entry(node.clone()).or_insert(0.0) += leaf_value;
        }
    }

    let result: Vec<(String, usize, f64)> = visits
        .iter()
        .map(|(node, &count)| {
            let avg = total_values.get(node).copied().unwrap_or(0.0) / count as f64;
            (node.clone(), count, avg)
        })
        .collect();

    Ok(result)
}
