# Simulation Theory

A world simulation where simple agents create complex societies.

Autonomous agents with personalities, memories, and values live in a persistent world — forming relationships, trading resources, building factions, courting partners, and dying from their choices. Emergent civilizations arise from simple interaction rules, not scripted behavior.

## What Happens

Drop agents into a shared world. Each one gets:
- **HEXACO personality** (6 traits) + **Schwartz values** (4 dimensions) — drives how they act
- **Needs** (hunger, energy, social, fun, hygiene) — drives what they prioritize
- **Memory** (short-term, long-term, beliefs) — shapes future decisions
- **Emotions** (7 axes) — reacts to events and decays over time

They autonomously decide actions each tick: gather food, trade, court a partner, attack a rival, form a group, learn skills, build a home. The simulation resolves interactions (cooperation, betrayal, combat, negotiation), applies consequences, and lets macro patterns emerge.

### What Emerges
- **Economies** — agents trade surplus resources, prices fluctuate with supply/demand
- **Factions** — groups form organically from mutual friendships, claim territory, wage wars
- **Families** — courtship → proposal → marriage → offspring with inherited traits
- **Social events** — birthday parties, weddings, funerals, community gatherings
- **Crime & reputation** — attackers gain criminal records, witnesses lose trust
- **Disease outbreaks** — contagion spreads through proximity
- **Cultural drift** — isolated groups develop different value distributions over time

## Architecture

```
sim/
├── backend/          Python (FastAPI)
│   ├── engine.py     Step loop, LOD tiers, movement, lifecycle
│   ├── agents.py     AgentBrain decision-making, personality→action mapping
│   ├── events.py     Action resolution, environmental events, emergent detection
│   ├── groups.py     Faction formation, territory, warfare
│   ├── trade.py      Market offers, price dynamics, supply/demand
│   ├── crafting.py   Item creation, world items
│   ├── llm_brain.py  Optional Claude AI consciousness for spotlight agents
│   ├── lod.py        Level-of-detail (SPOTLIGHT / ACTIVE / BACKGROUND)
│   ├── models.py     Pydantic schemas
│   └── main.py       30+ API endpoints
│
└── frontend/         TypeScript (Next.js 15, React)
    └── src/
        ├── app/      Page routes (home, characters, simulation/[id])
        ├── components/  24 components (PixelCanvas, Inspector, GodMode, etc.)
        └── lib/      API client, types, Zustand store, pixel art renderer
```

## Key Systems

**Level of Detail (LOD)** — Scales from 30 to 1000+ agents:
- *Spotlight*: Full decisions + dialogue + LLM consciousness every tick
- *Active*: Full decisions every tick, near spotlight agents
- *Background*: Simplified decisions every 5 ticks

**Daily Schedule** — 24-tick day cycle:
- Sleep (22-6): agents go home, energy recovery
- Morning (6-8): transition from home to work
- Work (8-17): occupation-based location routing
- Free time (17-22): action-driven movement

**God Mode** — Direct intervention: force actions, gift resources, smite/heal agents, introduce characters, spawn weather/disasters, teleport, modify traits and relationships.

## Running

```bash
# Backend
cd sim/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd sim/frontend
npm install
npm run dev
```

## Design Philosophy

From `CLAUDE.md` — these principles guide all implementation:

1. **Simple individual rules create complex societal patterns.** Don't over-engineer agent logic. Complexity comes from interaction, not complicated agents.
2. **At scale, the Law of Large Numbers smooths individual chaos into predictable macro trends.** Individual agents can be chaotic. At 100K+ agents, statistical patterns emerge reliably.
3. **Correctly model distributions, interaction rules, feedback loops, and constraints.** Get these right and emergent phenomena arise naturally.
4. **Never make survival artificially easy.** Agents have the *ability* to survive, not the guarantee. Bad decisions lead to failure. Protect agency, not agents.
