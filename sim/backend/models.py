from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import uuid
import time


class PersonalityTraits(BaseModel):
    openness: float = Field(default=0.5, ge=0.0, le=1.0)
    conscientiousness: float = Field(default=0.5, ge=0.0, le=1.0)
    extraversion: float = Field(default=0.5, ge=0.0, le=1.0)
    agreeableness: float = Field(default=0.5, ge=0.0, le=1.0)
    neuroticism: float = Field(default=0.5, ge=0.0, le=1.0)


class EmotionalState(BaseModel):
    happiness: float = Field(default=0.0, ge=-1.0, le=1.0)
    anger: float = Field(default=0.0, ge=-1.0, le=1.0)
    fear: float = Field(default=0.0, ge=-1.0, le=1.0)
    trust: float = Field(default=0.0, ge=-1.0, le=1.0)
    surprise: float = Field(default=0.0, ge=-1.0, le=1.0)
    disgust: float = Field(default=0.0, ge=-1.0, le=1.0)
    sadness: float = Field(default=0.0, ge=-1.0, le=1.0)


class MemoryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    content: str
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    related_characters: list[str] = []
    emotional_context: EmotionalState = Field(default_factory=EmotionalState)


class Memory(BaseModel):
    short_term: list[MemoryEntry] = []
    long_term: list[MemoryEntry] = []
    beliefs: dict[str, str] = {}


class ActionType(str, Enum):
    COOPERATE = "cooperate"
    COMPETE = "compete"
    NEGOTIATE = "negotiate"
    ALLY = "ally"
    BETRAY = "betray"
    EXPLORE = "explore"
    REST = "rest"
    GATHER = "gather"
    SHARE = "share"
    ATTACK = "attack"
    DEFEND = "defend"
    OBSERVE = "observe"
    COMMUNICATE = "communicate"


class Action(BaseModel):
    type: ActionType
    target_id: str | None = None
    detail: str = ""
    reasoning: str = ""


class Character(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    profile: str = ""
    traits: PersonalityTraits = Field(default_factory=PersonalityTraits)
    goals: list[str] = []
    motivations: list[str] = []
    image_url: str | None = None
    emotional_state: EmotionalState = Field(default_factory=EmotionalState)
    memory: Memory = Field(default_factory=Memory)
    resources: dict[str, float] = Field(default_factory=lambda: {"energy": 100.0, "influence": 50.0, "wealth": 50.0})
    relationships: dict[str, float] = {}
    last_action: Action | None = None
    last_reasoning: str = ""
    alive: bool = True
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})


class CharacterCreate(BaseModel):
    name: str
    profile: str = ""
    traits: PersonalityTraits = Field(default_factory=PersonalityTraits)
    goals: list[str] = []
    motivations: list[str] = []
    image_url: str | None = None


class EventType(str, Enum):
    INTERACTION = "interaction"
    ENVIRONMENTAL = "environmental"
    DECISION = "decision"
    EMERGENT = "emergent"
    ALLIANCE_FORMED = "alliance_formed"
    CONFLICT = "conflict"
    NEGOTIATION = "negotiation"
    RESOURCE_CHANGE = "resource_change"
    EMOTIONAL_SHIFT = "emotional_shift"


class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    type: EventType
    title: str
    description: str
    participants: list[str] = []
    outcomes: list[str] = []
    importance: float = Field(default=0.5, ge=0.0, le=1.0)


class Environment(BaseModel):
    name: str = "The Commons"
    description: str = "A shared space where characters interact and compete for resources."
    resources: dict[str, float] = Field(default_factory=lambda: {
        "food": 100.0, "shelter": 100.0, "territory": 100.0, "knowledge": 50.0,
    })
    conditions: dict[str, str] = Field(default_factory=lambda: {
        "weather": "calm", "stability": "peaceful", "scarcity": "moderate",
    })
    locations: list[dict] = Field(default_factory=lambda: [
        {"name": "Market Square", "x": 0, "y": 0, "type": "trade"},
        {"name": "The Arena", "x": 100, "y": 0, "type": "conflict"},
        {"name": "Council Hall", "x": 0, "y": 100, "type": "diplomacy"},
        {"name": "Wilderness", "x": -100, "y": -100, "type": "exploration"},
        {"name": "Library", "x": 50, "y": 50, "type": "knowledge"},
    ])


class SimulationConfig(BaseModel):
    randomness: float = Field(default=0.3, ge=0.0, le=1.0)
    information_symmetry: float = Field(default=0.5, ge=0.0, le=1.0)
    resource_scarcity: float = Field(default=0.3, ge=0.0, le=1.0)
    max_ticks: int = 1000


class SimulationState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int = 0
    characters: dict[str, Character] = {}
    environment: Environment = Field(default_factory=Environment)
    events: list[Event] = []
    config: SimulationConfig = Field(default_factory=SimulationConfig)
    running: bool = False
    created_at: float = Field(default_factory=time.time)
