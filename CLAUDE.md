# SP26 — Game-Theoretic Prediction Engine

## What This Is

A prediction engine that ingests arbitrary data, converts it into numeric data series (charts), and uses game theory to predict what will happen next. Results are decoded back into natural language with path exploration and randomization for strategic analysis.

## Architecture / Pipeline

```
Input (NL, CSV, any data)
  → Data Series Extraction
    → Multidimensional Embedding
      → Chart Construction
        → Similarity Check
          → Prediction (what happens next)
            → Game Theory Engine (core)
              → Decode to Natural Language
                → Path Generation
                  → Randomization
                    → (feeds back into Game Theory)
```

### Core Components

1. **Data Ingestion** — Accept any input format (natural language, CSV, JSON, etc.) and convert to numeric data series
2. **Embedding Layer** — Build text summaries per series and embed via OpenAI into multidimensional vectors
3. **Chart Builder** — Store data series in Rust backend (replaces graph construction)
4. **Similarity Engine** — Run similarity/distance checks across series embeddings to find patterns and clusters
5. **Prediction Module** — Given chart state + similarity results, predict series behavior (trends, correlations)
6. **Game Theory Core** — Apply game-theoretic reasoning (Nash equilibria, minimax, strategic dominance) to evaluate and rank predictions
7. **NL Decoder** — Decode predictions and strategies back into human-readable natural language
8. **Path Explorer** — Generate possible future paths/trajectories from similarity-based adjacency
9. **Randomizer** — Introduce controlled randomness (Monte Carlo, epsilon-greedy) for exploration and robustness testing

## Project Structure

```
sp26/
├── CLAUDE.md
├── README.md
├── src/
│   ├── chart/         # chart (data series) storage and operations
│   ├── similarity/    # similarity/distance computation
│   ├── gametheory/    # game theory engine (core)
│   └── paths/         # path generation and exploration
├── python/sp26/
│   ├── ingest/        # data ingestion → data series
│   ├── embed/         # series embedding via OpenAI
│   ├── chart/         # chart builder (Rust bridge)
│   ├── similarity/    # similarity engine
│   ├── predict/       # prediction logic
│   ├── gametheory/    # game theory engine
│   ├── decode/        # NL decoding / output generation
│   ├── paths/         # path exploration
│   └── randomize/     # randomization strategies
├── tests/
└── data/              # sample datasets
```

## Key Types

- **DataPoint** — `(index, value)` pair in a series
- **DataSeries** — Named list of DataPoints with metadata
- **EmbeddedSeries** — DataSeries + embedding vector
- **ChartResult** — `(chart_id, series_count, total_points)` from Rust backend
- **SimilarityPair** — Two series names + similarity score
- **Cluster** — Group of series names
- **Prediction** — Description + confidence + source_series

## Git Workflow

- Commit and push after every few meaningful changes (e.g., after completing a feature, fixing a bug, or finishing a logical unit of work)
- Do NOT add "Co-Authored-By" lines to commit messages
- Use concise, descriptive commit messages
- Push to the current branch after committing

## Dev Guidelines

- Keep components modular — each pipeline stage should work independently
- All data between stages flows as well-defined Pydantic types
- Game theory core is the heart — it connects prediction, decoding, and path exploration
- Write tests for each component in isolation before integration testing
- Prefer correctness over performance initially; optimize hot paths later
