from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import (
    SimulationState, SimulationConfig, Character, CharacterCreate,
    Event, Memory, ChatMessage,
)
from engine import SimulationEngine

app = FastAPI(title="Multi-Agent Simulation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SimulationEngine()


class CreateSimulationRequest(BaseModel):
    randomness: float | None = None
    information_symmetry: float | None = None
    resource_scarcity: float | None = None
    max_ticks: int | None = None


class StepResponse(BaseModel):
    events: list[Event]
    state: SimulationState
    chat_messages: list[ChatMessage]


@app.get("/api/simulations", response_model=list[SimulationState])
def list_simulations():
    return list(engine.simulations.values())


@app.post("/api/simulations", response_model=SimulationState)
def create_simulation(req: CreateSimulationRequest | None = None):
    config = None
    if req and any(v is not None for v in [req.randomness, req.information_symmetry, req.resource_scarcity, req.max_ticks]):
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
    return engine.create_simulation(config)


@app.get("/api/simulations/{sim_id}", response_model=SimulationState)
def get_simulation(sim_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return engine.get_state(sim_id)


@app.post("/api/simulations/{sim_id}/step", response_model=StepResponse)
def step_simulation(sim_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    events, chat_messages = engine.step(sim_id)
    return StepResponse(events=events, state=engine.get_state(sim_id), chat_messages=chat_messages)


@app.patch("/api/simulations/{sim_id}/config", response_model=SimulationState)
def update_config(sim_id: str, config: SimulationConfig):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    engine.update_config(sim_id, config)
    return engine.get_state(sim_id)


@app.delete("/api/simulations/{sim_id}")
def delete_simulation(sim_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    engine.delete_simulation(sim_id)
    return {"status": "deleted"}


@app.post("/api/simulations/{sim_id}/characters", response_model=Character)
def add_character(sim_id: str, char_create: CharacterCreate):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return engine.add_character(sim_id, char_create)


@app.get("/api/simulations/{sim_id}/characters/{char_id}", response_model=Character)
def get_character(sim_id: str, char_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    return sim.characters[char_id]


@app.delete("/api/simulations/{sim_id}/characters/{char_id}")
def remove_character(sim_id: str, char_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    engine.remove_character(sim_id, char_id)
    return {"status": "removed"}


@app.get("/api/simulations/{sim_id}/characters/{char_id}/memory", response_model=Memory)
def get_character_memory(sim_id: str, char_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
    if char_id not in sim.characters:
        raise HTTPException(status_code=404, detail="Character not found")
    return sim.characters[char_id].memory


@app.get("/api/simulations/{sim_id}/characters/{char_id}/reasoning")
def get_character_reasoning(sim_id: str, char_id: str):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
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
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
    return [e for e in sim.events if e.tick >= since_tick]


@app.get("/api/simulations/{sim_id}/chat", response_model=list[ChatMessage])
def get_chat(sim_id: str, since_tick: int = Query(default=0, ge=0)):
    if sim_id not in engine.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    sim = engine.get_state(sim_id)
    return [m for m in sim.chat_log if m.tick >= since_tick]
