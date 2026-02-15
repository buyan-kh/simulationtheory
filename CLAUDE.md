# SP26 — Game-Theoretic Prediction Engine

## What This Is

A prediction engine that ingests arbitrary data, builds graph-based representations, and uses game theory to predict what will happen next. Results are decoded back into natural language with path exploration and randomization for strategic analysis.

## Architecture / Pipeline

```
Input (NL, CSV, any data)
  → Multidimensional Embedding
    → Graph Construction
      → Similarity Check
        → Prediction (what happens next)
          → Game Theory Engine (core)
            → Decode to Natural Language
              → Path Generation
                → Randomization
                  → (feeds back into Game Theory)
```

### Core Components

1. **Data Ingestion** — Accept any input format (natural language, CSV, JSON, etc.) and normalize it
2. **Embedding Layer** — Transform normalized data into multidimensional vector representations
3. **Graph Builder** — Construct a graph structure from embeddings (nodes = entities/states, edges = relationships/transitions)
4. **Similarity Engine** — Run similarity/distance checks across the graph to find patterns and clusters
5. **Prediction Module** — Given graph state + similarity results, predict what happens next
6. **Game Theory Core** — Apply game-theoretic reasoning (Nash equilibria, minimax, strategic dominance) to evaluate and rank predictions
7. **NL Decoder** — Decode predictions and strategies back into human-readable natural language
8. **Path Explorer** — Generate possible future paths/trajectories from current state
9. **Randomizer** — Introduce controlled randomness (Monte Carlo, epsilon-greedy) for exploration and robustness testing

## Project Structure

```
sp26/
├── CLAUDE.md
├── README.md
├── src/
│   ├── ingest/        # data ingestion and normalization
│   ├── embed/         # multidimensional embedding
│   ├── graph/         # graph construction and operations
│   ├── similarity/    # similarity/distance computation
│   ├── predict/       # prediction logic
│   ├── gametheory/    # game theory engine (core)
│   ├── decode/        # NL decoding / output generation
│   ├── paths/         # path generation and exploration
│   └── randomize/     # randomization strategies
├── tests/
└── data/              # sample datasets
```

## Dev Guidelines

- Keep components modular — each pipeline stage should work independently
- All data between stages flows as well-defined interfaces
- Game theory core is the heart — it connects prediction, decoding, and path exploration
- Write tests for each component in isolation before integration testing
- Prefer correctness over performance initially; optimize hot paths later
