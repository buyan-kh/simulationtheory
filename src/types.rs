use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};

/// A node in the prediction graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub embedding: Vec<f64>,
    pub metadata: std::collections::HashMap<String, String>,
}

/// An edge in the prediction graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub weight: OrderedFloat<f64>,
    pub relation: String,
}

/// A payoff entry in a game theory matrix.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Payoff {
    pub player1: f64,
    pub player2: f64,
}

/// A strategy profile (probability distribution over actions).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyProfile {
    pub player1: Vec<f64>,
    pub player2: Vec<f64>,
}

/// Result of a game theory analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameResult {
    pub equilibria: Vec<StrategyProfile>,
    pub dominant_strategies: Option<(Option<usize>, Option<usize>)>,
    pub minimax_value: Option<f64>,
}
