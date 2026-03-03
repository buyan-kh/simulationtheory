from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import io
import zipfile
from models import (
    SimulationState, SimulationConfig, SimulationSummary,
    Character, CharacterCreate, BatchCharacterCreate,
    Event, Memory, ChatMessage,
    Location, Group, MarketState, TradeOffer, TradeHistory,
)
from engine import SimulationEngine
from analytics import SimulationAnalytics

app = FastAPI(title="Multi-Agent Simulation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SimulationEngine()
analytics = SimulationAnalytics()


class CreateSimulationRequest(BaseModel):
    name: str | None = None
    randomness: float | None = None
    information_symmetry: float | None = None
    resource_scarcity: float | None = None
    max_ticks: int | None = None


class StepResponse(BaseModel):
    events: list[Event]
    state: SimulationState
    chat_messages: list[ChatMessage]


@app.get("/api/simulations", response_model=list[SimulationSummary])
def list_simulations():
    return engine.list_summaries()


@app.post("/api/simulations", response_model=SimulationState)
def create_simulation(req: CreateSimulationRequest | None = None):
    config = None
    name = ""
    if req:
        name = req.name or ""
        if any(v is not None for v in [req.randomness, req.information_symmetry, req.resource_scarcity, req.max_ticks]):
            kwargs = {}
            if req.randomness is not None:
                kwargs["randomness"] = req.randomness
            if req.information_symmetry is not None:
                kwargs["information_symmetry"] = req.information_symmetry
            if req.resource_scarcity is not None:
                kwargs["resource_scarcity"] = req.resource_scarcity
            if req.max_ticks is not None:
                kwargs["max_ticks"] = req.max_ticks
            config = SimulationConfig(**kwargs)
    return engine.create_simulation(config, name=name)


def _get_sim(sim_id: str) -> SimulationState:
    """Load simulation by ID, raising 404 if not found."""
    try:
        return engine.get_state(sim_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Simulation not found")


@app.get("/api/simulations/{sim_id}", response_model=SimulationState)
def get_simulation(sim_id: str):
    return _get_sim(sim_id)


@app.post("/api/simulations/{sim_id}/step", response_model=StepResponse)
def step_simulation(sim_id: str):
    _get_sim(sim_id)
    events, chat_messages = engine.step(sim_id)
    return StepResponse(events=events, state=engine.get_state(sim_id), chat_messages=chat_messages)


@app.patch("/api/simulations/{sim_id}/config", response_model=SimulationState)
def update_config(sim_id: str, config: SimulationConfig):
    _get_sim(sim_id)
    engine.update_config(sim_id, config)
    return engine.get_state(sim_id)


@app.delete("/api/simulations/{sim_id}")
def delete_simulation(sim_id: str):
    engine.delete_simulation(sim_id)
    return {"status": "deleted"}


# ── Characters ──

@app.post("/api/simulations/{sim_id}/characters", response_model=Character)
def add_character(sim_id: str, char_create: CharacterCreate):
    _get_sim(sim_id)
    return engine.add_character(sim_id, char_create)


@app.post("/api/simulations/{sim_id}/characters/batch", response_model=list[Character])
def batch_create_characters(sim_id: str, req: BatchCharacterCreate):
    _get_sim(sim_id)
    return engine.batch_create_characters(sim_id, req)


@app.get("/api/simulations/{sim_id}/characters/{char_id}", response_model=Character)
def get_character(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    return sim.characters[char_id]


@app.delete("/api/simulations/{sim_id}/characters/{char_id}")
def remove_character(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    engine.remove_character(sim_id, char_id)
    return {"status": "removed"}


@app.get("/api/simulations/{sim_id}/characters/{char_id}/memory", response_model=Memory)
def get_character_memory(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    return sim.characters[char_id].memory


@app.get("/api/simulations/{sim_id}/characters/{char_id}/reasoning")
def get_character_reasoning(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    char = sim.characters[char_id]
    return {
        "character_id": char_id,
        "name": char.name,
        "last_action": char.last_action,
        "last_reasoning": char.last_reasoning,
    }


@app.get("/api/simulations/{sim_id}/events", response_model=list[Event])
def get_events(sim_id: str, since_tick: int = Query(default=0, ge=0)):
    sim = _get_sim(sim_id)
    return [e for e in sim.events if e.tick >= since_tick]


@app.get("/api/simulations/{sim_id}/chat", response_model=list[ChatMessage])
def get_chat(sim_id: str, since_tick: int = Query(default=0, ge=0)):
    sim = _get_sim(sim_id)
    return [m for m in sim.chat_log if m.tick >= since_tick]


# ── Locations ──

@app.get("/api/simulations/{sim_id}/locations")
def list_locations(sim_id: str):
    sim = _get_sim(sim_id)
    return sim.environment.locations


@app.post("/api/simulations/{sim_id}/locations")
def add_location(sim_id: str, location: Location):
    sim = _get_sim(sim_id)
    sim.environment.locations.append(location)
    engine.db.save(sim)
    return location


@app.delete("/api/simulations/{sim_id}/locations/{loc_id}")
def remove_location(sim_id: str, loc_id: str):
    sim = _get_sim(sim_id)
    loc = next((l for l in sim.environment.locations if l.id == loc_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if not loc.is_removable:
        raise HTTPException(status_code=400, detail="Cannot remove core location")
    sim.environment.locations = [l for l in sim.environment.locations if l.id != loc_id]
    engine.db.save(sim)
    return {"status": "removed"}


# ── Groups ──

@app.get("/api/simulations/{sim_id}/groups")
def list_groups(sim_id: str):
    sim = _get_sim(sim_id)
    return list(sim.groups.values())


@app.get("/api/simulations/{sim_id}/groups/{group_id}")
def get_group(sim_id: str, group_id: str):
    sim = _get_sim(sim_id)
    if group_id not in sim.groups:
        raise HTTPException(status_code=404, detail="Group not found")
    return sim.groups[group_id]


# ── Market ──

@app.get("/api/simulations/{sim_id}/market")
def get_market(sim_id: str):
    sim = _get_sim(sim_id)
    return sim.market


@app.get("/api/simulations/{sim_id}/market/offers")
def get_offers(sim_id: str, status: str = "open"):
    sim = _get_sim(sim_id)
    return [o for o in sim.market.offers if o.status == status]


@app.get("/api/simulations/{sim_id}/market/history")
def get_trade_history(sim_id: str, limit: int = Query(default=50, ge=1, le=500)):
    sim = _get_sim(sim_id)
    return sim.market.history[-limit:]


@app.get("/api/simulations/{sim_id}/market/prices")
def get_prices(sim_id: str):
    sim = _get_sim(sim_id)
    return sim.market.price_index


# ── Replay ──

@app.get("/api/simulations/{sim_id}/replay/ticks")
def get_replay_ticks(sim_id: str):
    _get_sim(sim_id)
    return engine.db.get_snapshot_ticks(sim_id)


@app.get("/api/simulations/{sim_id}/replay/{tick}")
def get_replay_state(sim_id: str, tick: int):
    state = engine.db.load_snapshot(sim_id, tick)
    if state is None:
        raise HTTPException(status_code=404, detail="Snapshot not found for this tick")
    return state


# ── Analytics ──

@app.get("/api/simulations/{sim_id}/analytics/summary")
def get_analytics_summary(sim_id: str):
    sim = _get_sim(sim_id)
    return analytics.compute_summary(sim)


@app.get("/api/simulations/{sim_id}/analytics/relationships")
def get_relationship_graph(sim_id: str):
    sim = _get_sim(sim_id)
    return analytics.relationship_graph(sim)


@app.get("/api/simulations/{sim_id}/analytics/resource-trends")
def get_resource_trends(sim_id: str):
    sim = _get_sim(sim_id)
    ticks = engine.db.get_snapshot_ticks(sim_id)
    # Sample up to 50 snapshots for performance
    if len(ticks) > 50:
        step = len(ticks) // 50
        ticks = ticks[::step]
    snapshots = []
    for t in ticks:
        snap = engine.db.load_snapshot(sim_id, t)
        if snap:
            snapshots.append(snap)
    return analytics.resource_trends(sim, snapshots)


@app.get("/api/simulations/{sim_id}/analytics/event-frequency")
def get_event_frequency(sim_id: str):
    sim = _get_sim(sim_id)
    return analytics.event_frequency(sim)


@app.get("/api/simulations/{sim_id}/export/json")
def export_json(sim_id: str):
    sim = _get_sim(sim_id)
    return JSONResponse(
        content=sim.model_dump(),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=simulation_{sim_id}.json"},
    )


@app.get("/api/simulations/{sim_id}/export/csv")
def export_csv(sim_id: str):
    sim = _get_sim(sim_id)
    csv_files = analytics.export_csv(sim)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in csv_files.items():
            zf.writestr(filename, content)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=simulation_{sim_id}.zip"},
    )
