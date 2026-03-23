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
from agent_memory import AgentMemoryManager

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


# ── God Mode ──

class ForceActionRequest(BaseModel):
    action_type: str


class GiftRequest(BaseModel):
    resource: str = "wealth"
    amount: float = 50


@app.post("/api/simulations/{sim_id}/characters/{char_id}/force-action")
def force_action(sim_id: str, char_id: str, req: ForceActionRequest):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    char = sim.characters[char_id]
    if not char.alive:
        raise HTTPException(status_code=400, detail="Character is dead")
    from models import Action
    char.last_action = Action(
        type=req.action_type,
        target_id=None,
        detail=f"[God Mode] Forced to {req.action_type}",
        reasoning="Divine intervention",
    )
    engine.db.save(sim)
    return {"status": "ok", "action": req.action_type}


@app.post("/api/simulations/{sim_id}/characters/{char_id}/gift")
def gift_resource(sim_id: str, char_id: str, req: GiftRequest):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    char = sim.characters[char_id]
    char.resources[req.resource] = char.resources.get(req.resource, 0) + req.amount
    engine.db.save(sim)
    return {"status": "ok", "resource": req.resource, "new_amount": char.resources[req.resource]}


@app.post("/api/simulations/{sim_id}/characters/{char_id}/smite")
def smite_character(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    char = sim.characters[char_id]
    if not char.alive:
        raise HTTPException(status_code=400, detail="Character is already dead")
    char.alive = False
    char.cause_of_death = "divine_smite"
    char.death_tick = sim.tick
    char.health = 0
    engine.db.save(sim)
    return {"status": "ok", "message": f"{char.name} has been smitten"}


@app.post("/api/simulations/{sim_id}/characters/{char_id}/heal")
def heal_character(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    char = sim.characters[char_id]
    char.health = 100
    if hasattr(char, 'needs') and char.needs:
        char.needs.hunger = 100
        char.needs.energy = 100
        char.needs.social = 100
        char.needs.fun = 100
        char.needs.hygiene = 100
    if not char.alive:
        char.alive = True
        char.cause_of_death = None
        char.death_tick = None
    engine.db.save(sim)
    return {"status": "ok", "message": f"{char.name} has been fully healed"}


class IntroduceRequest(BaseModel):
    target_id: str
    boost: float = 0.3


@app.post("/api/simulations/{sim_id}/characters/{char_id}/introduce")
def introduce_characters(sim_id: str, char_id: str, req: IntroduceRequest):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    if req.target_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Target character not found")
    if char_id == req.target_id:
        raise HTTPException(status_code=400, detail="Cannot introduce a character to themselves")
    char_a = sim.characters[char_id]
    char_b = sim.characters[req.target_id]
    # Boost relationship in both directions
    boost = max(0.0, min(1.0, req.boost))
    char_a.relationships[req.target_id] = min(1.0, char_a.relationships.get(req.target_id, 0) + boost)
    char_b.relationships[char_id] = min(1.0, char_b.relationships.get(char_id, 0) + boost)
    engine.db.save(sim)
    return {
        "status": "ok",
        "message": f"{char_a.name} and {char_b.name} have been introduced",
        "relationship_a_to_b": char_a.relationships[req.target_id],
        "relationship_b_to_a": char_b.relationships[char_id],
    }


class SpawnEventRequest(BaseModel):
    event_type: str  # "weather", "resource_boom", "resource_bust", "disaster"
    description: str = ""


@app.post("/api/simulations/{sim_id}/spawn-event")
def spawn_event(sim_id: str, req: SpawnEventRequest):
    sim = _get_sim(sim_id)
    import uuid

    event_configs = {
        "weather": {
            "title": "Divine Weather Change",
            "type": EventType.ENVIRONMENTAL if hasattr(EventType, 'ENVIRONMENTAL') else "environmental",
            "description": req.description or "The skies shift as a divine hand alters the weather.",
            "importance": 0.6,
        },
        "resource_boom": {
            "title": "Resource Boom",
            "type": EventType.RESOURCE_CHANGE if hasattr(EventType, 'RESOURCE_CHANGE') else "resource_change",
            "description": req.description or "Resources suddenly multiply across the land.",
            "importance": 0.8,
        },
        "resource_bust": {
            "title": "Resource Bust",
            "type": EventType.RESOURCE_CHANGE if hasattr(EventType, 'RESOURCE_CHANGE') else "resource_change",
            "description": req.description or "Resources dwindle as scarcity grips the land.",
            "importance": 0.8,
        },
        "disaster": {
            "title": "Natural Disaster",
            "type": EventType.ENVIRONMENTAL if hasattr(EventType, 'ENVIRONMENTAL') else "environmental",
            "description": req.description or "A catastrophic disaster strikes the region.",
            "importance": 1.0,
        },
    }

    cfg = event_configs.get(req.event_type)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {req.event_type}. Valid: {list(event_configs.keys())}")

    event = Event(
        id=str(uuid.uuid4()),
        tick=sim.tick,
        type=cfg["type"],
        title=cfg["title"],
        description=cfg["description"],
        participants=[],
        outcomes=[f"[God Mode] {req.event_type}"],
        importance=cfg["importance"],
    )
    sim.events.append(event)

    # Apply effects
    alive_chars = [c for c in sim.characters.values() if c.alive]
    if req.event_type == "resource_boom":
        for char in alive_chars:
            for res in char.resources:
                char.resources[res] = char.resources[res] * 1.5
    elif req.event_type == "resource_bust":
        for char in alive_chars:
            for res in char.resources:
                char.resources[res] = char.resources[res] * 0.5
    elif req.event_type == "disaster":
        import random
        for char in alive_chars:
            damage = random.randint(10, 40)
            char.health = max(0, (char.health or 100) - damage)
            if char.health <= 0:
                char.alive = False
                char.cause_of_death = "natural_disaster"
                char.death_tick = sim.tick

    engine.db.save(sim)
    return {"status": "ok", "event_id": event.id, "event_type": req.event_type}


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


# ── Spotlight / LOD ──

class SpotlightRequest(BaseModel):
    character_ids: list[str]


@app.get("/api/simulations/{sim_id}/lod")
def get_lod_stats(sim_id: str):
    sim = _get_sim(sim_id)
    lod = engine.get_lod(sim_id)
    return lod.get_stats(sim.characters)


@app.put("/api/simulations/{sim_id}/spotlight")
def set_spotlight(sim_id: str, req: SpotlightRequest):
    sim = _get_sim(sim_id)
    for cid in req.character_ids:
        if cid not in sim.characters:
            raise HTTPException(status_code=404, detail=f"Character {cid} not found")
    lod = engine.get_lod(sim_id)
    lod.set_spotlight(set(req.character_ids))
    return {"spotlight": req.character_ids}


@app.post("/api/simulations/{sim_id}/spotlight/{char_id}")
def add_to_spotlight(sim_id: str, char_id: str):
    sim = _get_sim(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    lod = engine.get_lod(sim_id)
    lod.add_spotlight(char_id)
    return {"status": "added", "spotlight": list(lod.spotlight_ids)}


@app.delete("/api/simulations/{sim_id}/spotlight/{char_id}")
def remove_from_spotlight(sim_id: str, char_id: str):
    lod = engine.get_lod(sim_id)
    lod.remove_spotlight(char_id)
    return {"status": "removed", "spotlight": list(lod.spotlight_ids)}


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


# ── LLM Brain ──

class ApiKeyRequest(BaseModel):
    api_key: str


@app.post("/api/llm/configure")
def configure_llm(req: ApiKeyRequest):
    """Set the Anthropic API key for LLM-powered agents."""
    import os
    os.environ["ANTHROPIC_API_KEY"] = req.api_key
    # Reset the brain so it re-checks availability
    engine.llm_brain._available = None
    engine.llm_brain._client = None
    available = engine.llm_brain.is_available()
    return {"status": "configured", "available": available}


@app.get("/api/llm/status")
def llm_status():
    """Check LLM brain status."""
    return engine.llm_brain.get_stats()


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


# ── Agent Memory Files ──

@app.get("/api/simulations/{sim_id}/characters/{char_id}/memory-file")
def get_agent_memory_file(sim_id: str, char_id: str):
    """Get the persistent .txt memory file for a specific agent."""
    sim = _get_sim(sim_id)
    char = sim.characters.get(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    content = engine.agent_memory.read_agent_file(sim_id, char_id, char.name)
    if content is None:
        # Generate on the fly if file doesn't exist yet
        engine.agent_memory.write_agent_file(char, sim)
        content = engine.agent_memory.read_agent_file(sim_id, char_id, char.name)
    return {"character_id": char_id, "name": char.name, "content": content}


@app.get("/api/simulations/{sim_id}/memory-files")
def list_agent_memory_files(sim_id: str):
    """List all agent memory files for a simulation."""
    _get_sim(sim_id)  # validate sim exists
    files = engine.agent_memory.list_agent_files(sim_id)
    return {"sim_id": sim_id, "files": files, "count": len(files)}
