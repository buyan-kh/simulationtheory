## Core Simulation Principles

These three principles guide ALL design and implementation decisions:

1. **Simple individual rules create complex societal patterns.** (Schelling, Sugarscape, Axelrod) — Don't over-engineer individual agent logic. Simple, interconnected micro-rules produce rich emergent macro behavior. Complexity comes from interaction, not from complicated agents.

2. **At scale, the Law of Large Numbers smooths individual chaos into predictable macro trends.** — Individual agents can be unpredictable and chaotic. That's fine. At 100K+ agents, statistical patterns emerge reliably. Don't try to make individuals predictable — make the distributions and interaction rules correct.

3. **The key: correctly model distributions, interaction rules, feedback loops, and constraints.** — Get these four things right and emergent phenomena (empires, cultures, economies, conflicts) arise naturally. Get any one wrong and the simulation feels artificial.

## Git Workflow

- Commit and push after every few meaningful changes (e.g., after completing a feature, fixing a bug, or finishing a logical unit of work)
- Do NOT add "Co-Authored-By" lines to commit messages
- Use concise, descriptive commit messages
- Push to the current branch after committing
