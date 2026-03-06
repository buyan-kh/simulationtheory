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
    TRADE = "trade"
    FORM_GROUP = "form_group"
    JOIN_GROUP = "join_group"
    LEAVE_GROUP = "leave_group"
    # Life actions
    BUILD_HOME = "build_home"
    KILL = "kill"
    BULLY = "bully"
    LEARN = "learn"
    TEACH = "teach"
    COURT = "court"
    CRAFT = "craft"


class Action(BaseModel):
    type: ActionType
    target_id: str | None = None
    detail: str = ""
    reasoning: str = ""


class House(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    size: str = "small"  # small, medium, large
    max_residents: int = 1
    residents: list[str] = []  # character IDs


class Needs(BaseModel):
    hunger: float = Field(default=80.0, ge=0.0, le=100.0)
    energy: float = Field(default=80.0, ge=0.0, le=100.0)
    social: float = Field(default=80.0, ge=0.0, le=100.0)
    fun: float = Field(default=80.0, ge=0.0, le=100.0)
    hygiene: float = Field(default=80.0, ge=0.0, le=100.0)


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
    house_id: str | None = None
    needs: Needs = Field(default_factory=Needs)
    # Lifecycle
    age: int = Field(default=20, ge=0)
    max_age: int = Field(default=80, ge=1)
    health: float = Field(default=100.0, ge=0.0, le=100.0)
    cause_of_death: str | None = None
    death_tick: int | None = None
    parent_ids: list[str] = []
    # Social
    group_id: str | None = None
    group_role: str | None = None  # leader, officer, member
    # Trade
    trade_skill: float = Field(default=0.5, ge=0.0, le=1.0)


class CharacterCreate(BaseModel):
    name: str
    profile: str = ""
    traits: PersonalityTraits = Field(default_factory=PersonalityTraits)
    goals: list[str] = []
    motivations: list[str] = []
    image_url: str | None = None


class BatchCharacterCreate(BaseModel):
    count: int = Field(default=10, ge=1, le=10000)
    name_prefix: str = ""  # Optional prefix; names auto-generated if empty


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
    DEATH = "death"
    BIRTH = "birth"
    GROUP_FORMED = "group_formed"
    GROUP_DISSOLVED = "group_dissolved"
    GROUP_CONFLICT = "group_conflict"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    LEADERSHIP_CHANGE = "leadership_change"
    TRADE_COMPLETED = "trade_completed"
    TRADE_POSTED = "trade_posted"
    MARKET_SHIFT = "market_shift"


class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    type: EventType
    title: str
    description: str
    participants: list[str] = []
    outcomes: list[str] = []
    importance: float = Field(default=0.5, ge=0.0, le=1.0)


class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    x: float = 0.0
    y: float = 0.0
    type: str = "trade"
    biome: str = "plains"  # plains, forest, desert, mountain, swamp, coastal
    resources: dict[str, float] = Field(default_factory=lambda: {"food": 10.0, "materials": 10.0})
    resource_regen_rate: dict[str, float] = Field(default_factory=lambda: {"food": 1.0, "materials": 0.5})
    capacity: int = 10
    owner_group_id: str | None = None
    modifiers: dict[str, float] = Field(default_factory=dict)
    is_removable: bool = True


def _default_locations() -> list[Location]:
    return [
        # Town center
        Location(name="Market Square", x=0, y=0, type="trade", biome="plains", is_removable=False),
        Location(name="The Cozy Cafe", x=40, y=-40, type="cafe", biome="plains", is_removable=False),
        Location(name="Golden Plate", x=-40, y=-60, type="restaurant", biome="plains", is_removable=False),
        Location(name="Central Park", x=-60, y=40, type="park", biome="plains", is_removable=False),
        Location(name="Library", x=60, y=60, type="knowledge", biome="plains", is_removable=False),
        # Mid-range
        Location(name="The Arena", x=150, y=0, type="conflict", biome="plains", is_removable=False),
        Location(name="Council Hall", x=0, y=150, type="diplomacy", biome="plains", is_removable=False),
        Location(name="McBurger's", x=100, y=-80, type="fast_food", biome="plains", is_removable=False),
        Location(name="The Farm", x=-120, y=-100, type="farm", biome="plains",
                 resources={"food": 50.0, "materials": 5.0},
                 resource_regen_rate={"food": 3.0, "materials": 0.2},
                 capacity=15, is_removable=False),
        # Outskirts
        Location(name="Wilderness", x=-200, y=-180, type="exploration", biome="forest", is_removable=False),
        Location(name="Cemetery", x=180, y=160, type="cemetery", biome="plains",
                 resources={"food": 0.0, "materials": 0.0},
                 resource_regen_rate={"food": 0.0, "materials": 0.0},
                 capacity=100, is_removable=False),
        # New locations for bigger map
        Location(name="Riverside Beach", x=-150, y=120, type="park", biome="coastal", is_removable=False),
        Location(name="Mountain Lodge", x=200, y=180, type="cafe", biome="mountain", is_removable=False),
        Location(name="South Farm", x=80, y=-180, type="farm", biome="plains",
                 resources={"food": 40.0, "materials": 8.0},
                 resource_regen_rate={"food": 2.5, "materials": 0.3},
                 capacity=12, is_removable=False),
        Location(name="Trading Post", x=-180, y=0, type="trade", biome="forest", is_removable=False),
    ]


class Environment(BaseModel):
    name: str = "The Commons"
    description: str = "A shared space where characters interact and compete for resources."
    resources: dict[str, float] = Field(default_factory=lambda: {
        "food": 100.0, "shelter": 100.0, "territory": 100.0, "knowledge": 50.0,
    })
    conditions: dict[str, str] = Field(default_factory=lambda: {
        "weather": "calm", "stability": "peaceful", "scarcity": "moderate",
    })
    locations: list[Location] = Field(default_factory=_default_locations)
    houses: list[House] = []


class WorldItem(BaseModel):
    """An item created by an agent — pixel art stored as a flat color grid."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    creator_id: str
    created_tick: int = 0
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    width: int = 8   # pixel grid width
    height: int = 8  # pixel grid height
    # Flat list of hex color strings (or null for transparent), row-major order
    pixels: list[str | None] = []
    item_type: str = "decoration"  # furniture, tool, decoration, food, art
    usable: bool = True
    placed_in_house: str | None = None  # house_id if placed inside a house


class SimulationConfig(BaseModel):
    randomness: float = Field(default=0.3, ge=0.0, le=1.0)
    information_symmetry: float = Field(default=0.5, ge=0.0, le=1.0)
    resource_scarcity: float = Field(default=0.3, ge=0.0, le=1.0)
    max_ticks: int = 1000
    aging_rate: int = Field(default=1, ge=0)
    enable_permadeath: bool = True
    enable_offspring: bool = True
    max_population: int = 1000


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    speaker_id: str
    speaker_name: str
    content: str
    tone: str = "neutral"
    target_id: str | None = None
    target_name: str | None = None
    is_thought: bool = False
    action_context: str = ""


class GroupMember(BaseModel):
    character_id: str
    role: str = "member"  # leader, officer, member
    joined_tick: int = 0
    loyalty: float = Field(default=0.7, ge=0.0, le=1.0)


class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    founded_tick: int = 0
    leader_id: str | None = None
    members: list[GroupMember] = []
    goals: list[str] = []
    resources: dict[str, float] = Field(default_factory=lambda: {"treasury": 0.0, "territory": 0.0})
    territory_ids: list[str] = []
    reputation: float = Field(default=0.5, ge=0.0, le=1.0)
    rival_group_ids: list[str] = []
    ally_group_ids: list[str] = []
    dissolved: bool = False
    dissolved_tick: int | None = None


class TradeOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    offer_resource: str
    offer_amount: float
    request_resource: str
    request_amount: float
    created_tick: int = 0
    expires_tick: int = 0
    status: str = "open"  # open, accepted, expired, cancelled
    accepted_by: str | None = None


class TradeHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    seller_id: str
    buyer_id: str
    sold_resource: str
    sold_amount: float
    bought_resource: str
    bought_amount: float


class MarketState(BaseModel):
    offers: list[TradeOffer] = []
    history: list[TradeHistory] = []
    price_index: dict[str, float] = Field(default_factory=lambda: {
        "energy": 1.0, "influence": 1.5, "wealth": 1.0,
    })


class SimulationState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    tick: int = 0
    characters: dict[str, Character] = {}
    environment: Environment = Field(default_factory=Environment)
    events: list[Event] = []
    chat_log: list[ChatMessage] = []
    config: SimulationConfig = Field(default_factory=SimulationConfig)
    running: bool = False
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    groups: dict[str, Group] = {}
    market: MarketState = Field(default_factory=MarketState)
    world_items: list[WorldItem] = []


class SimulationSummary(BaseModel):
    id: str
    name: str
    tick: int
    character_count: int
    event_count: int
    created_at: float
    updated_at: float
