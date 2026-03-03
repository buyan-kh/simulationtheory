import math
import random
from models import (
    SimulationState, SimulationConfig, Character, CharacterCreate,
    Action, Event, EventType, Environment, ChatMessage, House, Location,
    MemoryEntry, EmotionalState, PersonalityTraits, Needs,
)
from agents import AgentBrain, DialogueGenerator
from events import EventGenerator
from groups import GroupManager
from trade import TradeManager
from db import SimulationDB

HOUSE_PLOTS = [
    {"x": -30, "y": -30}, {"x": -15, "y": -35}, {"x": 0, "y": -40},
    {"x": 15, "y": -35}, {"x": 30, "y": -30}, {"x": -40, "y": -15},
    {"x": 40, "y": -15}, {"x": -40, "y": 15}, {"x": 40, "y": 15},
    {"x": -30, "y": 30}, {"x": -15, "y": 35}, {"x": 0, "y": 40},
    {"x": 15, "y": 35}, {"x": 30, "y": 30}, {"x": -50, "y": 0},
    {"x": 50, "y": 0}, {"x": -20, "y": -50}, {"x": 20, "y": -50},
    {"x": -20, "y": 50}, {"x": 20, "y": 50},
    {"x": -60, "y": -30}, {"x": 60, "y": -30}, {"x": -60, "y": 30}, {"x": 60, "y": 30},
    {"x": -45, "y": -45}, {"x": 45, "y": -45}, {"x": -45, "y": 45}, {"x": 45, "y": 45},
    {"x": -70, "y": 0}, {"x": 70, "y": 0}, {"x": 0, "y": -70}, {"x": 0, "y": 70},
]


def _generate_spiral_plot(index: int) -> dict[str, float]:
    """Generate house plot positions in a spiral pattern for overflow."""
    angle = index * 0.8
    radius = 40 + index * 3
    return {"x": round(math.cos(angle) * radius, 1), "y": round(math.sin(angle) * radius, 1)}


class SimulationEngine:

    def __init__(self):
        self.simulations: dict[str, SimulationState] = {}
        self.db = SimulationDB()
        self.brain = AgentBrain()
        self.event_gen = EventGenerator()
        self.dialogue = DialogueGenerator()
        self.group_mgr = GroupManager()
        self.trade_mgr = TradeManager()

    def create_simulation(self, config: SimulationConfig | None = None, name: str = "") -> SimulationState:
        sim = SimulationState()
        if config:
            sim.config = config
        if name:
            sim.name = name
        else:
            count = len(self.db.list_summaries()) + 1
            sim.name = f"Simulation #{count}"
        self.simulations[sim.id] = sim
        self.db.save(sim)
        return sim

    def add_character(self, sim_id: str, char_create: CharacterCreate) -> Character:
        sim = self.simulations[sim_id]
        rng = random.Random(hash((sim_id, char_create.name, len(sim.characters))))

        char = Character(
            name=char_create.name,
            profile=char_create.profile,
            traits=char_create.traits,
            goals=char_create.goals,
            motivations=char_create.motivations,
            image_url=char_create.image_url,
            position={"x": rng.uniform(-80, 80), "y": rng.uniform(-80, 80)},
        )
        sim.characters[char.id] = char
        self._assign_house(sim, char)
        self.db.save(sim)
        return char

    def step(self, sim_id: str) -> tuple[list[Event], list[ChatMessage]]:
        sim = self.simulations[sim_id]

        if sim.tick >= sim.config.max_ticks:
            return [], []

        chat_messages: list[ChatMessage] = []

        actions: dict[str, Action] = {}
        for char_id, char in sim.characters.items():
            if not char.alive:
                continue
            action = self.brain.decide(char, sim)
            actions[char_id] = action

        for char_id, action in actions.items():
            char = sim.characters[char_id]
            target = sim.characters.get(action.target_id) if action.target_id else None
            msg = self.dialogue.generate_action_dialogue(char, action, target, sim)
            if msg:
                chat_messages.append(msg)

        self._move_characters(sim, actions)

        interaction_events = self.event_gen.resolve_actions(sim.characters, actions, sim)
        environmental_events = self.event_gen.generate_environmental_events(sim)
        all_events_so_far = interaction_events + environmental_events
        emergent_events = self.event_gen.detect_emergent_events(sim, all_events_so_far)

        all_events = interaction_events + environmental_events + emergent_events

        self.event_gen.apply_outcomes(all_events, sim)

        self._update_needs(sim, actions)

        # Lifecycle: aging, death, offspring
        lifecycle_events = self._process_lifecycle(sim)
        all_events.extend(lifecycle_events)

        # Groups
        group_events = self.group_mgr.process_groups(sim, actions)
        all_events.extend(group_events)

        # Trade/Market
        trade_events = self.trade_mgr.process_market(sim, actions)
        all_events.extend(trade_events)

        # Location resource regeneration
        self._regen_location_resources(sim)

        for char in sim.characters.values():
            if not char.alive:
                continue
            self.brain.update_emotions(char, all_events)
            self.brain.consolidate_memory(char, all_events, sim.tick)
            for event in all_events:
                msg = self.dialogue.generate_reaction_dialogue(char, event, sim)
                if msg:
                    chat_messages.append(msg)

        sim.events.extend(all_events)
        sim.chat_log.extend(chat_messages)
        sim.tick += 1
        self.db.save(sim)
        self.db.save_snapshot(sim)

        return all_events, chat_messages

    def get_state(self, sim_id: str) -> SimulationState:
        if sim_id not in self.simulations:
            sim = self.db.load(sim_id)
            if sim is None:
                raise KeyError(sim_id)
            self.simulations[sim_id] = sim
        return self.simulations[sim_id]

    def remove_character(self, sim_id: str, char_id: str):
        sim = self.simulations[sim_id]
        if char_id in sim.characters:
            del sim.characters[char_id]
            self.db.save(sim)

    def update_config(self, sim_id: str, config: SimulationConfig):
        sim = self.simulations[sim_id]
        sim.config = config
        self.db.save(sim)

    def delete_simulation(self, sim_id: str):
        if sim_id in self.simulations:
            del self.simulations[sim_id]
        self.db.delete(sim_id)

    def list_summaries(self) -> list[dict]:
        return self.db.list_summaries()

    _HOUSE_SIZE_MAX = {"small": 1, "medium": 2, "large": 3}

    def _assign_house(self, sim: SimulationState, char: Character):
        """Assign a house to the character, sharing with agreeable residents or creating a new one."""
        # Try to find an existing house with space and agreeable residents
        if char.traits.agreeableness > 0.6:
            for house in sim.environment.houses:
                # Allow up to 3 residents (large) for agreeable groups
                if len(house.residents) >= 3:
                    continue
                # Check all current residents are agreeable
                all_agreeable = all(
                    sim.characters[rid].traits.agreeableness > 0.6
                    for rid in house.residents if rid in sim.characters
                )
                if house.residents and all_agreeable:
                    house.residents.append(char.id)
                    char.house_id = house.id
                    house.name = "Shared House"
                    # Upgrade size to match resident count
                    if len(house.residents) <= 1:
                        house.size = "small"
                        house.max_residents = 1
                    elif len(house.residents) == 2:
                        house.size = "medium"
                        house.max_residents = 2
                    else:
                        house.size = "large"
                        house.max_residents = 3
                    return

        # Create a new house at the next available plot
        used_positions = {(h.position["x"], h.position["y"]) for h in sim.environment.houses}
        plot = None
        for p in HOUSE_PLOTS:
            if (p["x"], p["y"]) not in used_positions:
                plot = p
                break
        if plot is None:
            # Generate a spiral plot beyond the predefined ones
            idx = len(sim.environment.houses) - len(HOUSE_PLOTS)
            plot = _generate_spiral_plot(max(idx, 0))

        house = House(
            name=f"House of {char.name}",
            position={"x": float(plot["x"]), "y": float(plot["y"])},
            size="small",
            max_residents=1,
            residents=[char.id],
        )
        sim.environment.houses.append(house)
        char.house_id = house.id

    # ── Needs decay rates per tick ──
    _NEEDS_DECAY = {"hunger": 2.0, "energy": 3.0, "social": 1.5, "fun": 1.0, "hygiene": 0.5}

    # ── Action → needs satisfaction mapping ──
    _ACTION_NEEDS_BOOST: dict[str, dict[str, float]] = {
        "rest": {"energy": 30.0, "hygiene": 5.0},
        "gather": {"hunger": 20.0, "fun": 5.0},
        "communicate": {"social": 25.0, "fun": 5.0},
        "ally": {"social": 15.0},
        "negotiate": {"social": 10.0},
        "cooperate": {"social": 15.0, "fun": 5.0},
        "share": {"social": 20.0, "hunger": 5.0},
        "explore": {"fun": 15.0, "hygiene": -5.0},
        "observe": {"fun": 10.0},
        "compete": {"fun": 10.0, "energy": -5.0},
        "attack": {"energy": -10.0, "fun": 5.0},
        "defend": {"energy": -5.0},
        "betray": {"social": -10.0, "fun": 5.0},
    }

    def _update_needs(self, sim: SimulationState, actions: dict[str, "Action"]):
        """Decay needs each tick and apply boosts from actions. Low needs affect emotions."""
        for char_id, char in sim.characters.items():
            if not char.alive:
                continue

            needs = char.needs

            # Decay all needs
            for need_name, rate in self._NEEDS_DECAY.items():
                current = getattr(needs, need_name)
                setattr(needs, need_name, max(0.0, current - rate))

            # Apply action boosts
            action = actions.get(char_id)
            if action:
                boosts = self._ACTION_NEEDS_BOOST.get(action.type.value, {})
                for need_name, amount in boosts.items():
                    current = getattr(needs, need_name)
                    setattr(needs, need_name, max(0.0, min(100.0, current + amount)))

            # Low needs affect emotions
            if needs.hunger < 20:
                char.emotional_state.anger = min(1.0, char.emotional_state.anger + 0.15)
                char.emotional_state.happiness = max(-1.0, char.emotional_state.happiness - 0.1)
            if needs.energy < 20:
                char.emotional_state.sadness = min(1.0, char.emotional_state.sadness + 0.15)
                char.emotional_state.happiness = max(-1.0, char.emotional_state.happiness - 0.1)
            if needs.social < 20:
                char.emotional_state.sadness = min(1.0, char.emotional_state.sadness + 0.1)
            if needs.fun < 20:
                char.emotional_state.happiness = max(-1.0, char.emotional_state.happiness - 0.05)
            if needs.hygiene < 20:
                char.emotional_state.disgust = min(1.0, char.emotional_state.disgust + 0.1)

    # Action type -> location type mapping (resolved dynamically)
    _ACTION_LOCATION_TYPE = {
        "cooperate": "trade",
        "share": "trade",
        "negotiate": "trade",
        "trade": "trade",
        "attack": "conflict",
        "defend": "conflict",
        "compete": "conflict",
        "betray": "conflict",
        "ally": "diplomacy",
        "communicate": "diplomacy",
        "form_group": "diplomacy",
        "join_group": "diplomacy",
        "leave_group": "diplomacy",
        "explore": "exploration",
        "gather": "exploration",
        "observe": "knowledge",
        "rest": "knowledge",
    }

    # Fallback coordinates if no matching location found
    _ACTION_LOCATION_MAP = {
        "cooperate": (0, 0),
        "share": (0, 0),
        "negotiate": (0, 0),
        "trade": (0, 0),
        "attack": (100, 0),
        "defend": (100, 0),
        "compete": (100, 0),
        "betray": (100, 0),
        "ally": (0, 100),
        "communicate": (0, 100),
        "form_group": (0, 100),
        "join_group": (0, 100),
        "leave_group": (0, 100),
        "explore": (-100, -100),
        "gather": (-100, -100),
        "observe": (50, 50),
        "rest": (50, 50),
    }

    def _find_location_by_type(self, sim: SimulationState, loc_type: str) -> Location | None:
        for loc in sim.environment.locations:
            if loc.type == loc_type:
                return loc
        return None

    def _move_characters(self, sim: SimulationState, actions: dict[str, Action]):
        for char_id, action in actions.items():
            char = sim.characters[char_id]

            # When resting, move toward assigned house
            if action.type.value == "rest" and char.house_id:
                house = next((h for h in sim.environment.houses if h.id == char.house_id), None)
                if house:
                    target_x = house.position["x"]
                    target_y = house.position["y"]
                else:
                    target_x, target_y = self._ACTION_LOCATION_MAP.get("rest", (50, 50))
            else:
                # Try dynamic location lookup first
                loc_type = self._ACTION_LOCATION_TYPE.get(action.type.value)
                loc = self._find_location_by_type(sim, loc_type) if loc_type else None
                if loc:
                    target_x, target_y = loc.x, loc.y
                else:
                    fallback = self._ACTION_LOCATION_MAP.get(action.type.value)
                    if fallback is None:
                        continue
                    target_x, target_y = fallback

            dx = target_x - char.position["x"]
            dy = target_y - char.position["y"]

            speed = 0.3 + random.uniform(0, 0.2)
            char.position["x"] += dx * speed
            char.position["y"] += dy * speed

            # Add random offset when near the target location
            dist = (dx * dx + dy * dy) ** 0.5
            if dist < 10:
                char.position["x"] += random.uniform(-8, 8)
                char.position["y"] += random.uniform(-8, 8)

            # Clamp to world bounds
            char.position["x"] = max(-120, min(120, char.position["x"]))
            char.position["y"] = max(-120, min(120, char.position["y"]))

    # ── Lifecycle processing ──

    def _process_lifecycle(self, sim: SimulationState) -> list[Event]:
        events: list[Event] = []
        tick = sim.tick

        for char in list(sim.characters.values()):
            if not char.alive:
                continue

            # Aging
            char.age += sim.config.aging_rate
            self._apply_age_effects(char)

            # Death checks
            cause = self._check_death(char, sim)
            if cause:
                events.append(self._kill_character(char, sim, cause))

        # Offspring
        if sim.config.enable_offspring:
            offspring_events = self._check_offspring(sim)
            events.extend(offspring_events)

        return events

    def _apply_age_effects(self, char: Character):
        """Modify stats based on age brackets."""
        ratio = char.age / char.max_age
        if ratio < 0.25:  # young: energy bonus
            char.resources["energy"] = min(100, char.resources.get("energy", 0) + 2)
        elif ratio > 0.75:  # elderly: wisdom but frailty
            char.resources["influence"] = char.resources.get("influence", 0) + 0.5
            char.resources["energy"] = max(0, char.resources.get("energy", 0) - 1)
            char.health = max(0, char.health - 0.5)

    def _check_death(self, char: Character, sim: SimulationState) -> str | None:
        if not sim.config.enable_permadeath:
            return None
        if char.age >= char.max_age:
            return "old age"
        if char.health <= 0:
            return "injuries"
        if char.needs.hunger <= 0 and char.needs.energy <= 0:
            return "starvation"
        return None

    def _kill_character(self, char: Character, sim: SimulationState, cause: str) -> Event:
        char.alive = False
        char.cause_of_death = cause
        char.death_tick = sim.tick

        # Remove from group
        if char.group_id and char.group_id in sim.groups:
            group = sim.groups[char.group_id]
            group.members = [m for m in group.members if m.character_id != char.id]
            if group.leader_id == char.id:
                group.leader_id = group.members[0].character_id if group.members else None

        # Create legacy memories for witnesses
        for other in sim.characters.values():
            if other.id == char.id or not other.alive:
                continue
            rel = other.relationships.get(char.id, 0)
            if abs(rel) > 0.2:
                other.memory.long_term.append(MemoryEntry(
                    tick=sim.tick,
                    content=f"{char.name} died from {cause}. I {'mourn their loss' if rel > 0 else 'feel conflicted about their passing'}.",
                    importance=0.8,
                    related_characters=[char.id],
                ))

        # Redistribute some wealth
        remaining_wealth = char.resources.get("wealth", 0) * 0.5
        alive_chars = [c for c in sim.characters.values() if c.alive and c.id != char.id]
        if alive_chars and remaining_wealth > 0:
            share = remaining_wealth / len(alive_chars)
            for c in alive_chars:
                c.resources["wealth"] = c.resources.get("wealth", 0) + share

        return Event(
            tick=sim.tick, type=EventType.DEATH,
            title=f"{char.name} has died",
            description=f"{char.name} died from {cause} at age {char.age}.",
            participants=[char.id],
            outcomes=[f"{char.name} is no longer among the living"],
            importance=0.9,
        )

    def _check_offspring(self, sim: SimulationState) -> list[Event]:
        events: list[Event] = []
        alive = [c for c in sim.characters.values() if c.alive]
        if len(alive) >= sim.config.max_population:
            return events

        rng = random.Random(hash(("offspring", sim.tick)))
        checked: set[tuple[str, str]] = set()

        for c1 in alive:
            for c2 in alive:
                if c1.id >= c2.id:
                    continue
                pair = (c1.id, c2.id)
                if pair in checked:
                    continue
                checked.add(pair)

                rel1 = c1.relationships.get(c2.id, 0)
                rel2 = c2.relationships.get(c1.id, 0)
                if rel1 > 0.7 and rel2 > 0.7 and rng.random() < 0.05:
                    child = self._create_offspring(c1, c2, sim, rng)
                    sim.characters[child.id] = child
                    self._assign_house(sim, child)
                    events.append(Event(
                        tick=sim.tick, type=EventType.BIRTH,
                        title=f"{child.name} is born",
                        description=f"{child.name} is born to {c1.name} and {c2.name}, inheriting traits from both parents.",
                        participants=[c1.id, c2.id, child.id],
                        outcomes=[f"A new character joins the simulation"],
                        importance=0.8,
                    ))
                    if len(sim.characters) >= sim.config.max_population:
                        return events
        return events

    def _create_offspring(self, p1: Character, p2: Character, sim: SimulationState, rng: random.Random) -> Character:
        """Create a child character with blended traits from two parents."""
        def blend(v1: float, v2: float) -> float:
            avg = (v1 + v2) / 2
            return max(0.0, min(1.0, avg + rng.gauss(0, 0.1)))

        traits = PersonalityTraits(
            openness=blend(p1.traits.openness, p2.traits.openness),
            conscientiousness=blend(p1.traits.conscientiousness, p2.traits.conscientiousness),
            extraversion=blend(p1.traits.extraversion, p2.traits.extraversion),
            agreeableness=blend(p1.traits.agreeableness, p2.traits.agreeableness),
            neuroticism=blend(p1.traits.neuroticism, p2.traits.neuroticism),
        )

        # Name generation
        syllables = ["an", "el", "or", "is", "ar", "en", "il", "on", "ra", "li", "na", "to"]
        name = rng.choice(syllables).capitalize() + rng.choice(syllables) + rng.choice(syllables)

        # Inherit some goals/motivations
        goals = list(set(rng.sample(p1.goals, min(1, len(p1.goals))) + rng.sample(p2.goals, min(1, len(p2.goals)))))
        motivations = list(set(rng.sample(p1.motivations, min(1, len(p1.motivations))) + rng.sample(p2.motivations, min(1, len(p2.motivations)))))

        child = Character(
            name=name,
            profile=f"Child of {p1.name} and {p2.name}",
            traits=traits,
            goals=goals or ["survive"],
            motivations=motivations or ["curiosity"],
            age=0,
            max_age=rng.randint(60, 100),
            parent_ids=[p1.id, p2.id],
            position={"x": (p1.position["x"] + p2.position["x"]) / 2, "y": (p1.position["y"] + p2.position["y"]) / 2},
            needs=Needs(hunger=90, energy=90, social=90, fun=90, hygiene=90),
        )

        # Parents get positive relationship with child
        p1.relationships[child.id] = 0.8
        p2.relationships[child.id] = 0.8
        child.relationships[p1.id] = 0.6
        child.relationships[p2.id] = 0.6

        return child

    # ── Location resource regeneration ──

    def _regen_location_resources(self, sim: SimulationState):
        for loc in sim.environment.locations:
            for res, rate in loc.resource_regen_rate.items():
                loc.resources[res] = loc.resources.get(res, 0) + rate
