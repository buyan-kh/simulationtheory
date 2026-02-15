mod tree;
mod search;

use pyo3::prelude::*;

pub fn register(parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let m = PyModule::new(parent.py(), "paths")?;
    m.add_function(wrap_pyfunction!(tree::create_game_tree, &m)?)?;
    m.add_function(wrap_pyfunction!(search::bfs_paths, &m)?)?;
    m.add_function(wrap_pyfunction!(search::dfs_paths, &m)?)?;
    m.add_function(wrap_pyfunction!(search::mcts_search, &m)?)?;
    parent.add_submodule(&m)?;
    Ok(())
}
