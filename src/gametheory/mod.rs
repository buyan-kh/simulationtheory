mod payoff;
mod nash;
mod minimax;
mod dominance;

use pyo3::prelude::*;

pub fn register(parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let m = PyModule::new(parent.py(), "gametheory")?;
    m.add_function(wrap_pyfunction!(payoff::create_payoff_matrix, &m)?)?;
    m.add_function(wrap_pyfunction!(nash::find_nash_equilibria, &m)?)?;
    m.add_function(wrap_pyfunction!(minimax::minimax_solve, &m)?)?;
    m.add_function(wrap_pyfunction!(dominance::find_dominant_strategies, &m)?)?;
    parent.add_submodule(&m)?;
    Ok(())
}
