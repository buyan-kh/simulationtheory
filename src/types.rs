use serde::{Deserialize, Serialize};

/// A single data point in a chart series.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub index: f64,
    pub value: f64,
}

/// A named series of data points with optional metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSeries {
    pub name: String,
    pub points: Vec<DataPoint>,
    pub metadata: std::collections::HashMap<String, String>,
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
