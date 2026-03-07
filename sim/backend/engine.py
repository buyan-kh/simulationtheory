import math
import random
from models import (
    SimulationState, SimulationConfig, Character, CharacterCreate,
    BatchCharacterCreate,
    Action, Event, EventType, Environment, ChatMessage, House, Location,
    MemoryEntry, EmotionalState, PersonalityTraits, Needs,
)
from agents import AgentBrain, DialogueGenerator
from events import EventGenerator
from groups import GroupManager
from trade import TradeManager
from crafting import process_crafting
from db import SimulationDB
from spatial import SpatialGrid
from lod import LODManager, LODTier

# World bounds
WORLD_BOUND = 300  # sim coords go from -300 to 300

HOUSE_PLOTS = [
    # Town center residential area
    {"x": -30, "y": -30}, {"x": -15, "y": -35}, {"x": 0, "y": -40},
    {"x": 15, "y": -35}, {"x": 30, "y": -30}, {"x": -40, "y": -15},
    {"x": 40, "y": -15}, {"x": -40, "y": 15}, {"x": 40, "y": 15},
    {"x": -30, "y": 30}, {"x": -15, "y": 35}, {"x": 0, "y": 40},
    {"x": 15, "y": 35}, {"x": 30, "y": 30}, {"x": -50, "y": 0},
    {"x": 50, "y": 0}, {"x": -20, "y": -50}, {"x": 20, "y": -50},
    {"x": -20, "y": 50}, {"x": 20, "y": 50},
    # Inner ring
    {"x": -60, "y": -30}, {"x": 60, "y": -30}, {"x": -60, "y": 30}, {"x": 60, "y": 30},
    {"x": -45, "y": -45}, {"x": 45, "y": -45}, {"x": -45, "y": 45}, {"x": 45, "y": 45},
    {"x": -70, "y": 0}, {"x": 70, "y": 0}, {"x": 0, "y": -70}, {"x": 0, "y": 70},
    # Suburbs (spread out for bigger map)
    {"x": -100, "y": -40}, {"x": 100, "y": -40}, {"x": -100, "y": 40}, {"x": 100, "y": 40},
    {"x": -80, "y": -80}, {"x": 80, "y": -80}, {"x": -80, "y": 80}, {"x": 80, "y": 80},
    {"x": -120, "y": 0}, {"x": 120, "y": 0}, {"x": 0, "y": -120}, {"x": 0, "y": 120},
    {"x": -140, "y": -60}, {"x": 140, "y": -60}, {"x": -140, "y": 60}, {"x": 140, "y": 60},
    {"x": -110, "y": -110}, {"x": 110, "y": -110}, {"x": -110, "y": 110}, {"x": 110, "y": 110},
    {"x": -160, "y": 0}, {"x": 160, "y": 0}, {"x": 0, "y": -160}, {"x": 0, "y": 160},
    # Far suburbs
    {"x": -180, "y": -80}, {"x": 180, "y": -80}, {"x": -180, "y": 80}, {"x": 180, "y": 80},
    {"x": -200, "y": 0}, {"x": 200, "y": 0}, {"x": 0, "y": -200}, {"x": 0, "y": 200},
]


def _generate_spiral_plot(index: int) -> dict[str, float]:
    """Generate house plot positions in a spiral pattern for overflow."""
    angle = index * 0.8
    radius = 60 + index * 4
    x = round(math.cos(angle) * radius, 1)
    y = round(math.sin(angle) * radius, 1)
    # Clamp to world bounds
    x = max(-WORLD_BOUND + 20, min(WORLD_BOUND - 20, x))
    y = max(-WORLD_BOUND + 20, min(WORLD_BOUND - 20, y))
    return {"x": x, "y": y}


class SimulationEngine:

    def __init__(self):
        self.simulations: dict[str, SimulationState] = {}
        self.db = SimulationDB()
        self.brain = AgentBrain()
        self.event_gen = EventGenerator()
        self.dialogue = DialogueGenerator()
        self.group_mgr = GroupManager()
        self.trade_mgr = TradeManager()
        self.grid = SpatialGrid(cell_size=30.0)
        self.lod_managers: dict[str, LODManager] = {}  # sim_id -> LODManager

    def get_lod(self, sim_id: str) -> LODManager:
        if sim_id not in self.lod_managers:
            self.lod_managers[sim_id] = LODManager()
        return self.lod_managers[sim_id]

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

        age = rng.randint(16, 65)
        char = Character(
            name=char_create.name,
            profile=char_create.profile,
            traits=char_create.traits,
            goals=char_create.goals,
            motivations=char_create.motivations,
            image_url=char_create.image_url,
            position={"x": rng.uniform(-150, 150), "y": rng.uniform(-150, 150)},
            age=age,
            max_age=rng.randint(max(age + 15, 60), 100),
        )
        sim.characters[char.id] = char
        self._assign_house(sim, char)
        self.db.save(sim)
        return char

    # ── Name generation pools ──

    _FIRST_NAMES = [
        "Ada", "Amir", "Aria", "Axel", "Bao", "Bodhi", "Calla", "Caspian",
        "Dalia", "Dmitri", "Elara", "Enzo", "Esme", "Farah", "Felix", "Freya",
        "Gia", "Hana", "Hugo", "Idris", "Iris", "Jasper", "Juno", "Kai",
        "Kira", "Leif", "Lila", "Luna", "Magnus", "Mara", "Mateo", "Mika",
        "Nadia", "Nico", "Noor", "Odin", "Ora", "Orion", "Petra", "Quinn",
        "Ravi", "Rhea", "Ronan", "Rosa", "Samir", "Saya", "Selene", "Soren",
        "Tala", "Theo", "Uma", "Vera", "Wren", "Xena", "Yael", "Yuki",
        "Zara", "Zeke", "Anya", "Bjorn", "Cleo", "Dante", "Elio", "Faye",
        "Gideon", "Hiro", "Ines", "Jace", "Kato", "Lena", "Malik", "Nyla",
        "Omar", "Priya", "Remy", "Sage", "Tomas", "Uri", "Veda", "Wyatt",
    ]

    _LAST_NAMES = [
        "Alden", "Ashford", "Barros", "Chen", "Cruz", "Dara", "Delgado",
        "Erikson", "Fairchild", "Graves", "Hale", "Ishida", "Jalal", "Kato",
        "Kim", "Lagos", "Marin", "Nakamura", "Osei", "Park", "Qadir",
        "Reyes", "Santos", "Shah", "Tanaka", "Voss", "Wang", "Xu", "Yoon",
        "Zhao", "Berg", "Costa", "Duval", "Fischer", "Gupta", "Hansen",
        "Ibrahim", "Jensen", "Khan", "Liu", "Moreau", "Novak", "Olsen",
        "Patel", "Rivera", "Silva", "Torres", "Volkov", "Wolfe", "Yang",
    ]

    _GOALS_POOL = [
        "wealth", "power", "knowledge", "survive", "peace", "influence",
        "friendship", "revenge", "explore", "trade", "protect", "create",
        "justice", "freedom", "legacy", "community",
    ]

    _MOTIVATIONS_POOL = [
        "greed", "loyalty", "curiosity", "compassion", "fear", "ambition",
        "pride", "vengeance", "survival", "diplomacy", "honor", "love",
        "duty", "rebellion", "faith", "creativity",
    ]

    _PROFILES_POOL = [
        "A quiet observer who watches before acting.",
        "Brash and confident, always the first to speak up.",
        "Gentle soul with a hidden fierce streak.",
        "Calculating and strategic, always three steps ahead.",
        "Warm and generous, sometimes to a fault.",
        "A wanderer who never stays in one place for long.",
        "Hardened by life, slow to trust but fiercely loyal.",
        "Optimistic dreamer with grand visions for the future.",
        "Practical and grounded, focused on what works.",
        "Charismatic and persuasive, draws people in effortlessly.",
        "Stubborn and principled, never compromises on values.",
        "Nervous and cautious, but surprisingly brave when it counts.",
        "Old soul with wisdom beyond their years.",
        "Restless spirit always seeking the next challenge.",
        "Patient and methodical, trusts the process.",
        "Quick-tempered but quick to forgive.",
        "A natural caretaker who puts others first.",
        "Ambitious climber who sees every interaction as an opportunity.",
        "Thoughtful introvert who expresses best through actions.",
        "Joyful presence who lifts the mood of any group.",
    ]

    def _generate_random_traits(self, rng: random.Random) -> PersonalityTraits:
        """Generate personality traits using a bell curve distribution (like Dwarf Fortress).
        78% of values cluster around neutral (0.35-0.65), with rare extremes."""
        def bell_trait() -> float:
            # Mean 0.5, std 0.15 → 78% within 0.35-0.65, rare extremes
            val = rng.gauss(0.5, 0.15)
            return max(0.0, min(1.0, round(val, 3)))
        return PersonalityTraits(
            openness=bell_trait(),
            conscientiousness=bell_trait(),
            extraversion=bell_trait(),
            agreeableness=bell_trait(),
            neuroticism=bell_trait(),
        )

    def _generate_name(self, rng: random.Random, existing_names: set[str], prefix: str = "") -> str:
        """Generate a unique name, retrying on collision."""
        for _ in range(100):
            first = rng.choice(self._FIRST_NAMES)
            last = rng.choice(self._LAST_NAMES)
            name = f"{prefix}{first} {last}" if prefix else f"{first} {last}"
            if name not in existing_names:
                return name
        # Fallback: append a number
        return f"{prefix}{rng.choice(self._FIRST_NAMES)} {rng.choice(self._LAST_NAMES)}-{rng.randint(1, 9999)}"

    def batch_create_characters(self, sim_id: str, req: BatchCharacterCreate) -> list[Character]:
        """Create multiple characters with randomized traits, goals, and motivations."""
        sim = self.simulations[sim_id]
        rng = random.Random(hash((sim_id, "batch", len(sim.characters), req.count)))
        existing_names = {c.name for c in sim.characters.values()}
        created: list[Character] = []

        for i in range(req.count):
            name = self._generate_name(rng, existing_names, req.name_prefix)
            existing_names.add(name)

            traits = self._generate_random_traits(rng)
            goals = rng.sample(self._GOALS_POOL, k=rng.randint(1, 3))
            motivations = rng.sample(self._MOTIVATIONS_POOL, k=rng.randint(1, 3))
            profile = rng.choice(self._PROFILES_POOL)
            age = rng.randint(16, 65)

            char = Character(
                name=name,
                profile=profile,
                traits=traits,
                goals=goals,
                motivations=motivations,
                position={"x": rng.uniform(-150, 150), "y": rng.uniform(-150, 150)},
                age=age,
                max_age=rng.randint(max(age + 15, 60), 100),
                trade_skill=round(rng.uniform(0.1, 0.9), 2),
            )

            # Set starting emotions with slight variation
            char.emotional_state.happiness = round(rng.gauss(0.1, 0.2), 2)
            char.emotional_state.trust = round(rng.gauss(0.0, 0.15), 2)

            sim.characters[char.id] = char
            self._assign_house(sim, char)
            created.append(char)

        self.db.save(sim)
        return created

    def step(self, sim_id: str) -> tuple[list[Event], list[ChatMessage]]:
        sim = self.simulations[sim_id]

        if sim.tick >= sim.config.max_ticks:
            return [], []

        chat_messages: list[ChatMessage] = []
        lod = self.get_lod(sim_id)

        # ── 1. Rebuild spatial grid ──
        self.grid.rebuild(sim.characters)

        # ── 2. Classify agents by LOD tier ──
        tiers = lod.classify(sim.characters, self.grid)

        # ── 3. Decision phase (tier-aware) ──
        actions: dict[str, Action] = {}

        # Spotlight: always full decision
        for char_id in tiers[LODTier.SPOTLIGHT]:
            char = sim.characters[char_id]
            action = self.brain.decide(char, sim, self.grid)
            actions[char_id] = action

        # Active: full decision if population is small enough, else simplified
        # Budget: ~100 full decisions is fast (~0.3s). Above that, use simple.
        active_ids = tiers[LODTier.ACTIVE]
        full_budget = max(0, 100 - len(tiers[LODTier.SPOTLIGHT]))
        if len(active_ids) <= full_budget:
            for char_id in active_ids:
                char = sim.characters[char_id]
                action = self.brain.decide(char, sim, self.grid)
                actions[char_id] = action
        else:
            # Give full decisions to closest active agents to spotlight
            # and simplified to the rest
            active_by_priority: list[tuple[float, str]] = []
            for char_id in active_ids:
                char = sim.characters[char_id]
                # Priority: distance to nearest spotlight agent (closer = higher priority)
                min_dist = float("inf")
                for sid in tiers[LODTier.SPOTLIGHT]:
                    sc = sim.characters[sid]
                    dx = char.position["x"] - sc.position["x"]
                    dy = char.position["y"] - sc.position["y"]
                    d = dx * dx + dy * dy
                    if d < min_dist:
                        min_dist = d
                active_by_priority.append((min_dist, char_id))
            active_by_priority.sort()

            for i, (_, char_id) in enumerate(active_by_priority):
                char = sim.characters[char_id]
                if i < full_budget:
                    action = self.brain.decide(char, sim, self.grid)
                else:
                    action = self.brain.decide_simple(char, sim, self.grid)
                actions[char_id] = action

        # Background: simplified decisions every N ticks
        if lod.should_update(LODTier.BACKGROUND, sim.tick):
            for char_id in tiers[LODTier.BACKGROUND]:
                char = sim.characters[char_id]
                action = self.brain.decide_simple(char, sim, self.grid)
                actions[char_id] = action

        # ── 4. Dialogue (spotlight only) ──
        for char_id in tiers[LODTier.SPOTLIGHT]:
            action = actions.get(char_id)
            if not action:
                continue
            char = sim.characters[char_id]
            target = sim.characters.get(action.target_id) if action.target_id else None
            msg = self.dialogue.generate_action_dialogue(char, action, target, sim)
            if msg:
                chat_messages.append(msg)

        # ── 5. Movement ──
        self._move_characters(sim, actions)

        # ── 6. Event resolution ──
        interaction_events = self.event_gen.resolve_actions(sim.characters, actions, sim)
        environmental_events = self.event_gen.generate_environmental_events(sim)
        all_events_so_far = interaction_events + environmental_events
        emergent_events = self.event_gen.detect_emergent_events(sim, all_events_so_far)

        all_events = interaction_events + environmental_events + emergent_events

        self.event_gen.apply_outcomes(all_events, sim)

        # ── 7. Needs (all agents, cheap) ──
        self._update_needs(sim, actions)

        # ── 7b. Disease / contagion ──
        disease_events = self._process_disease(sim)
        all_events.extend(disease_events)

        # ── 7c. Property income ──
        property_events = self._process_property(sim, actions)
        all_events.extend(property_events)

        # ── 8. Lifecycle: aging, death, offspring ──
        lifecycle_events = self._process_lifecycle(sim)
        all_events.extend(lifecycle_events)

        # ── 9. Groups ──
        group_events = self.group_mgr.process_groups(sim, actions)
        all_events.extend(group_events)

        # ── 10. Trade/Market ──
        trade_events = self.trade_mgr.process_market(sim, actions)
        all_events.extend(trade_events)

        # ── 10b. Crafting ──
        craft_events = process_crafting(sim, actions)
        all_events.extend(craft_events)

        # ── 10c. Gossip ──
        self._process_gossip(sim, actions)

        # ── 11. Location resource regeneration ──
        self._regen_location_resources(sim)

        # ── 12. Emotions, memory, reaction dialogue (tier-aware) ──
        # Build participant lookup for fast event filtering
        participant_events: dict[str, list[Event]] = {}
        for event in all_events:
            for pid in event.participants:
                if pid not in participant_events:
                    participant_events[pid] = []
                participant_events[pid].append(event)

        for char in sim.characters.values():
            if not char.alive:
                continue
            tier = lod.get_tier(char.id)

            # Emotions: spotlight+active process their own events; background skip
            if tier in (LODTier.SPOTLIGHT, LODTier.ACTIVE):
                my_events = participant_events.get(char.id, [])
                self.brain.update_emotions(char, my_events)
                self.brain.consolidate_memory(char, my_events, sim.tick)
            elif tier == LODTier.BACKGROUND and lod.should_update(LODTier.BACKGROUND, sim.tick):
                my_events = participant_events.get(char.id, [])
                if my_events:
                    self.brain.update_emotions(char, my_events)
                    self.brain.consolidate_memory(char, my_events, sim.tick)

            # Reaction dialogue: spotlight only
            if tier == LODTier.SPOTLIGHT:
                for event in participant_events.get(char.id, []):
                    msg = self.dialogue.generate_reaction_dialogue(char, event, sim)
                    if msg:
                        chat_messages.append(msg)

        # ── 13. Persist ──
        sim.events.extend(all_events)
        sim.chat_log.extend(chat_messages)

        # Cap stored events/chat to prevent unbounded growth and serialization cost.
        # Keep at most 1000 events (recent ticks). Full history in snapshots.
        if len(sim.events) > 1000:
            sim.events = sim.events[-1000:]
        if len(sim.chat_log) > 200:
            sim.chat_log = sim.chat_log[-200:]

        sim.tick += 1

        # At scale (100+ agents), only save/snapshot every N ticks.
        # Serializing 1000+ characters to JSON is expensive.
        pop = sum(1 for c in sim.characters.values() if c.alive)
        save_interval = 1 if pop < 100 else (5 if pop < 500 else 10)
        if sim.tick % save_interval == 0:
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
        "gather": {"hunger": 25.0, "fun": 5.0},
        "communicate": {"social": 25.0, "fun": 10.0, "hunger": 10.0},
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
        # New life actions
        "build_home": {"energy": -15.0, "fun": 10.0},
        "kill": {"energy": -20.0, "social": -15.0},
        "bully": {"fun": 5.0, "social": -5.0},
        "learn": {"fun": 10.0, "energy": -5.0},
        "teach": {"social": 15.0, "fun": 5.0, "energy": -5.0},
        "court": {"social": 20.0, "fun": 15.0, "energy": -5.0},
        "craft": {"fun": 20.0, "energy": -10.0},
    }

    def _update_needs(self, sim: SimulationState, actions: dict[str, "Action"]):
        """Decay needs each tick and apply boosts from actions. Low needs affect emotions."""
        house_index: dict[str, House] = {h.id: h for h in sim.environment.houses}

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
                boosts = dict(self._ACTION_NEEDS_BOOST.get(action.type.value, {}))

                # ── Rest quality depends on location ──
                if action.type.value == "rest":
                    hour = sim.tick % 24
                    is_night = hour >= 21 or hour <= 4
                    if char.house_id and char.house_id in house_index:
                        house = house_index[char.house_id]
                        dx = char.position["x"] - house.position["x"]
                        dy = char.position["y"] - house.position["y"]
                        if dx * dx + dy * dy < 400:  # within ~20 units of home
                            boosts["energy"] = 30.0
                            boosts["hygiene"] = 10.0
                            # Bed bonus: extra energy if character owns a bed
                            items_by_id = {it.id: it for it in sim.world_items}
                            for item_id in char.equipped_items:
                                item = items_by_id.get(item_id)
                                if item and "bed" in item.name.lower():
                                    boosts["energy"] += 5.0
                                    break
                        else:
                            boosts["energy"] = 15.0  # resting but not home yet
                    else:
                        # Homeless: rest at cafe/park — worse recovery
                        boosts["energy"] = 15.0
                        boosts["hygiene"] = 0.0

                # ── Location-based economy ──
                # Gathering at farm = earning wealth (working for pay)
                if action.type.value == "gather":
                    for loc in sim.environment.locations:
                        if loc.type == "farm":
                            dx = char.position["x"] - loc.x
                            dy = char.position["y"] - loc.y
                            if dx * dx + dy * dy < 900:  # within ~30 units
                                boosts["hunger"] = boosts.get("hunger", 25.0) * 1.5
                                char.resources["wealth"] = char.resources.get("wealth", 0) + 3.0
                                break

                # Communicating at cafe/restaurant = spending wealth on food
                if action.type.value == "communicate":
                    for loc in sim.environment.locations:
                        if loc.type in ("cafe", "restaurant", "fast_food"):
                            dx = char.position["x"] - loc.x
                            dy = char.position["y"] - loc.y
                            if dx * dx + dy * dy < 900:
                                wealth = char.resources.get("wealth", 0)
                                if wealth >= 2:
                                    char.resources["wealth"] = wealth - 2.0
                                    boosts["hunger"] = boosts.get("hunger", 10.0) + 5.0
                                    boosts["social"] = boosts.get("social", 25.0) + 5.0
                                break

                # Teaching = earning wealth (payment for services)
                if action.type.value == "teach" and action.target_id:
                    char.resources["wealth"] = char.resources.get("wealth", 0) + 2.0
                    # Student pays if they can afford it
                    student = sim.characters.get(action.target_id)
                    if student and student.resources.get("wealth", 0) >= 2:
                        student.resources["wealth"] -= 2.0

                # Crafting = earning wealth (creating value)
                if action.type.value == "craft":
                    char.resources["wealth"] = char.resources.get("wealth", 0) + 3.0

                # Resting at cafe without a house = small cost for shelter
                if action.type.value == "rest" and not char.house_id:
                    for loc in sim.environment.locations:
                        if loc.type == "cafe":
                            dx = char.position["x"] - loc.x
                            dy = char.position["y"] - loc.y
                            if dx * dx + dy * dy < 900:
                                wealth = char.resources.get("wealth", 0)
                                if wealth >= 1:
                                    char.resources["wealth"] = wealth - 1.0
                                    boosts["energy"] = max(boosts.get("energy", 15.0), 20.0)
                                break

                # Territory control bonus: 20% boost when group controls this location
                if char.group_id:
                    for loc in sim.environment.locations:
                        if loc.owner_group_id == char.group_id:
                            dx = char.position["x"] - loc.x
                            dy = char.position["y"] - loc.y
                            if dx * dx + dy * dy < 900:
                                boosts = {k: v * 1.2 for k, v in boosts.items()}
                                break

                for need_name, amount in boosts.items():
                    current = getattr(needs, need_name, None)
                    if current is not None:
                        setattr(needs, need_name, max(0.0, min(100.0, current + amount)))

            # Homeless hygiene penalty
            if not char.house_id:
                needs.hygiene = max(0.0, needs.hygiene - 0.5)

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
        "cooperate": "diplomacy",
        "share": "park",
        "negotiate": "trade",
        "trade": "trade",
        "attack": "conflict",
        "defend": "conflict",
        "compete": "conflict",
        "betray": "conflict",
        "kill": "conflict",
        "bully": "conflict",
        "ally": "diplomacy",
        "communicate": "cafe",
        "form_group": "diplomacy",
        "join_group": "diplomacy",
        "leave_group": "diplomacy",
        "court": "park",
        "explore": "exploration",
        "gather": "farm",
        "build_home": "exploration",
        "observe": "park",
        "rest": "cafe",
        "learn": "knowledge",
        "teach": "knowledge",
        "craft": "knowledge",
    }

    # Fallback coordinates if no matching location found
    _ACTION_LOCATION_MAP = {
        "cooperate": (0, 150),       # Council Hall
        "share": (-60, 40),          # Central Park
        "negotiate": (0, 0),         # Market Square
        "trade": (0, 0),             # Market Square
        "attack": (150, 0),          # Arena
        "defend": (150, 0),          # Arena
        "compete": (150, 0),         # Arena
        "betray": (150, 0),          # Arena
        "kill": (150, 0),            # Arena
        "bully": (150, 0),           # Arena
        "ally": (0, 150),            # Council Hall
        "communicate": (40, -40),    # Cafe
        "form_group": (0, 150),      # Council Hall
        "join_group": (0, 150),      # Council Hall
        "leave_group": (0, 150),     # Council Hall
        "court": (-60, 40),          # Central Park
        "explore": (-200, -180),     # Wilderness
        "gather": (-120, -100),      # Farm
        "build_home": (-200, -180),  # Wilderness
        "observe": (-60, 40),        # Central Park
        "rest": (40, -40),           # Cafe (fallback if no house)
        "learn": (60, 60),           # Library
        "teach": (60, 60),           # Library
        "craft": (60, 60),           # Library
    }

    _location_type_cache: dict[str, dict[str, Location]] = {}  # sim_id -> {type -> Location}

    def _build_location_index(self, sim: SimulationState) -> dict[str, Location]:
        """Build a type->Location index for O(1) lookup. Cached per step."""
        idx: dict[str, Location] = {}
        for loc in sim.environment.locations:
            if loc.type not in idx:
                idx[loc.type] = loc
        return idx

    def _find_location_by_type(self, sim: SimulationState, loc_type: str, loc_index: dict[str, Location] | None = None) -> Location | None:
        if loc_index is not None:
            return loc_index.get(loc_type)
        for loc in sim.environment.locations:
            if loc.type == loc_type:
                return loc
        return None

    # Base movement speed per tick (in simulation units)
    _BASE_SPEED = 8.0  # ~8 units per tick for steady walking (bigger map)
    _DRIVE_SPEED = 16.0  # speed when driving (2x walking, was 30)

    def _move_characters(self, sim: SimulationState, actions: dict[str, Action]):
        # Build O(1) lookup indexes once per tick
        house_index: dict[str, House] = {h.id: h for h in sim.environment.houses}
        loc_index = self._build_location_index(sim)
        rng = random.Random(hash(("move", sim.tick)))

        for char_id, action in actions.items():
            char = sim.characters[char_id]

            # Determine target position based on action
            if action.type.value == "rest" and char.house_id:
                house = house_index.get(char.house_id)
                if house:
                    target_x = house.position["x"]
                    target_y = house.position["y"]
                else:
                    target_x, target_y = self._ACTION_LOCATION_MAP.get("rest", (50, 50))
            elif action.target_id and action.target_id in sim.characters:
                # Move toward interaction target, biased toward the relevant location
                target_char = sim.characters[action.target_id]
                tx, ty = target_char.position["x"], target_char.position["y"]
                # Blend with the action's preferred location so agents spread toward it
                loc_type = self._ACTION_LOCATION_TYPE.get(action.type.value)
                loc = loc_index.get(loc_type) if loc_type else None
                if loc:
                    # 60% toward target character, 40% toward location
                    target_x = tx * 0.6 + loc.x * 0.4
                    target_y = ty * 0.6 + loc.y * 0.4
                else:
                    target_x, target_y = tx, ty
            else:
                # Try dynamic location lookup first (O(1) with index)
                loc_type = self._ACTION_LOCATION_TYPE.get(action.type.value)
                loc = loc_index.get(loc_type) if loc_type else None
                if loc:
                    target_x, target_y = loc.x, loc.y
                else:
                    fallback = self._ACTION_LOCATION_MAP.get(action.type.value)
                    if fallback is None:
                        continue
                    target_x, target_y = fallback

            dx = target_x - char.position["x"]
            dy = target_y - char.position["y"]
            dist = (dx * dx + dy * dy) ** 0.5

            if dist < 5:
                # At destination — small wander
                char.position["x"] += rng.uniform(-3.0, 3.0)
                char.position["y"] += rng.uniform(-3.0, 3.0)
                char.resources.pop("_move_phase", None)
                char.resources.pop("_driving", None)
            elif dist > 80:
                # Long distance — phased car movement
                phase = int(char.resources.get("_move_phase", 0))
                walk_speed = self._BASE_SPEED * (0.8 + char.traits.extraversion * 0.4)

                if phase == 0:
                    # Start: walk first ~15 units toward destination (walking to car)
                    char.resources["_move_phase"] = 1.0
                    char.resources.pop("_driving", None)
                    move = min(walk_speed, dist)
                    char.position["x"] += (dx / dist) * move
                    char.position["y"] += (dy / dist) * move
                elif phase == 1:
                    # Walking to car — walk until 15 units covered, then switch to driving
                    char.resources.pop("_driving", None)
                    move = min(walk_speed, dist)
                    char.position["x"] += (dx / dist) * move
                    char.position["y"] += (dy / dist) * move
                    # After walking one tick, get in the car
                    char.resources["_move_phase"] = 2.0
                elif phase == 2:
                    # Driving — stop 20 units before destination
                    char.resources["_driving"] = 1.0
                    if dist < 25:
                        # Park the car, walk the rest
                        char.resources["_move_phase"] = 3.0
                        char.resources.pop("_driving", None)
                    else:
                        move = min(self._DRIVE_SPEED, dist - 20)
                        if move > 0:
                            char.position["x"] += (dx / dist) * move
                            char.position["y"] += (dy / dist) * move
                elif phase == 3:
                    # Walking from parked car to destination
                    char.resources.pop("_driving", None)
                    move = min(walk_speed, dist)
                    char.position["x"] += (dx / dist) * move
                    char.position["y"] += (dy / dist) * move
                    if dist < 8:
                        char.resources.pop("_move_phase", None)
            else:
                # Normal walking
                char.resources.pop("_move_phase", None)
                char.resources.pop("_driving", None)
                speed = self._BASE_SPEED * (0.8 + char.traits.extraversion * 0.4)
                # Rush home at night
                hour = sim.tick % 24
                if (hour >= 21 or hour <= 4) and action.type.value == "rest" and char.house_id:
                    speed *= 1.5
                if dist > 0:
                    move = min(speed, dist)
                    char.position["x"] += (dx / dist) * move
                    char.position["y"] += (dy / dist) * move
                # Small lateral sway for natural walking
                char.position["x"] += rng.uniform(-0.5, 0.5)
                char.position["y"] += rng.uniform(-0.5, 0.5)

            # Clamp to world bounds
            char.position["x"] = max(-WORLD_BOUND, min(WORLD_BOUND, char.position["x"]))
            char.position["y"] = max(-WORLD_BOUND, min(WORLD_BOUND, char.position["y"]))

    # ── Lifecycle processing ──

    def _process_lifecycle(self, sim: SimulationState) -> list[Event]:
        events: list[Event] = []
        tick = sim.tick

        for char in list(sim.characters.values()):
            if not char.alive:
                continue

            # Aging: once per in-game day (24 ticks), not every tick
            if sim.tick % 24 == 0:
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
            return "illness" if char.disease else "injuries"
        if char.needs.hunger <= 0 and char.needs.energy <= 0:
            return "starvation"
        return None

    def _kill_character(self, char: Character, sim: SimulationState, cause: str) -> Event:
        char.alive = False
        char.cause_of_death = cause
        char.death_tick = sim.tick

        # Move to cemetery
        cemetery = next((loc for loc in sim.environment.locations if loc.type == "cemetery"), None)
        if cemetery:
            # Stagger graves so they don't overlap
            dead_count = sum(1 for c in sim.characters.values() if not c.alive and c.id != char.id)
            row = dead_count // 6
            col = dead_count % 6
            char.position["x"] = cemetery.x - 12 + col * 5
            char.position["y"] = cemetery.y - 8 + row * 5

        # Remove from group
        if char.group_id and char.group_id in sim.groups:
            group = sim.groups[char.group_id]
            group.members = [m for m in group.members if m.character_id != char.id]
            if group.leader_id == char.id:
                group.leader_id = group.members[0].character_id if group.members else None

        # Create legacy memories only for characters who had a relationship with the deceased
        # (O(relationships) instead of O(n) scanning all characters)
        for other_id in list(char.relationships.keys()):
            other = sim.characters.get(other_id)
            if not other or not other.alive:
                continue
            rel = other.relationships.get(char.id, 0)
            if abs(rel) > 0.2:
                other.memory.long_term.append(MemoryEntry(
                    tick=sim.tick,
                    content=f"{char.name} died from {cause}. I {'mourn their loss' if rel > 0 else 'feel conflicted about their passing'}.",
                    importance=0.8,
                    related_characters=[char.id],
                ))

        # Clear spouse reference on partner
        if char.spouse_id:
            spouse = sim.characters.get(char.spouse_id)
            if spouse and spouse.spouse_id == char.id:
                spouse.spouse_id = None

        # Inherit wealth: spouse first, then children, then housemates
        remaining_wealth = char.resources.get("wealth", 0) * 0.5
        if remaining_wealth > 0:
            inherited = False
            # Try spouse
            if char.spouse_id:
                spouse = sim.characters.get(char.spouse_id)
                if spouse and spouse.alive:
                    spouse.resources["wealth"] = spouse.resources.get("wealth", 0) + remaining_wealth
                    inherited = True
            # Try children
            if not inherited:
                children = [sim.characters[cid] for cid in sim.characters
                            if sim.characters[cid].alive and char.id in sim.characters[cid].parent_ids]
                if children:
                    share = remaining_wealth / len(children)
                    for c in children:
                        c.resources["wealth"] = c.resources.get("wealth", 0) + share
                    inherited = True
            # Fall back to housemates
            if not inherited and char.house_id:
                house = next((h for h in sim.environment.houses if h.id == char.house_id), None)
                if house:
                    housemates = [sim.characters[rid] for rid in house.residents
                                  if rid in sim.characters and rid != char.id and sim.characters[rid].alive]
                    if housemates:
                        share = remaining_wealth / len(housemates)
                        for c in housemates:
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
        if sum(1 for c in sim.characters.values() if c.alive) >= sim.config.max_population:
            return events

        rng = random.Random(hash(("offspring", sim.tick)))
        checked: set[str] = set()

        # Only spouses can produce offspring
        for c1 in list(sim.characters.values()):
            if not c1.alive or c1.spouse_id is None:
                continue
            if c1.id in checked:
                continue
            c2 = sim.characters.get(c1.spouse_id)
            if not c2 or not c2.alive:
                continue
            checked.add(c1.id)
            checked.add(c2.id)

            if rng.random() < 0.05:
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

        # Set relationship types
        p1.relationship_types[child.id] = "parent"
        p2.relationship_types[child.id] = "parent"
        child.relationship_types[p1.id] = "child"
        child.relationship_types[p2.id] = "child"

        return child

    # ── Location resource regeneration ──

    def _regen_location_resources(self, sim: SimulationState):
        for loc in sim.environment.locations:
            for res, rate in loc.resource_regen_rate.items():
                loc.resources[res] = loc.resources.get(res, 0) + rate

    # ── Gossip ──

    def _process_gossip(self, sim: SimulationState, actions: dict[str, Action]):
        """When communicating, agents may gossip about a third party."""
        rng = random.Random(hash(("gossip", sim.tick)))
        NEGATIVE_KEYWORDS = {"attack", "betray", "steal", "kill", "bully", "fight", "hurt", "murder"}
        POSITIVE_KEYWORDS = {"helped", "shared", "cooperated", "taught", "healed", "gave", "saved"}

        for char_id, action in actions.items():
            if action.type != ActionType.COMMUNICATE or action.target_id is None:
                continue
            speaker = sim.characters.get(char_id)
            listener = sim.characters.get(action.target_id)
            if not speaker or not listener or not speaker.alive or not listener.alive:
                continue

            # Base 30% gossip chance, +20% for high extraversion
            gossip_chance = 0.3 + (speaker.traits.extraversion * 0.2)
            if rng.random() > gossip_chance:
                continue

            # Pick a random memory about a third party
            all_memories = speaker.memory.short_term + speaker.memory.long_term
            third_party_memories = [
                m for m in all_memories
                if m.related_characters and any(
                    rc != listener.id and rc != char_id and rc in sim.characters
                    for rc in m.related_characters
                )
            ]
            if not third_party_memories:
                continue

            memory = rng.choice(third_party_memories)
            subject_id = next(
                rc for rc in memory.related_characters
                if rc != listener.id and rc != char_id and rc in sim.characters
            )
            subject = sim.characters[subject_id]

            # Create gossip memory for listener
            gossip_content = f"{speaker.name} told me that {memory.content}"
            listener.memory.short_term.append(MemoryEntry(
                tick=sim.tick,
                content=gossip_content,
                importance=memory.importance * 0.7,
                related_characters=[subject_id, char_id],
            ))

            # Adjust listener's relationship with the gossip subject
            content_lower = memory.content.lower()
            if any(kw in content_lower for kw in NEGATIVE_KEYWORDS):
                listener.relationships[subject_id] = max(
                    -1.0, listener.relationships.get(subject_id, 0) - 0.1
                )
            elif any(kw in content_lower for kw in POSITIVE_KEYWORDS):
                listener.relationships[subject_id] = min(
                    1.0, listener.relationships.get(subject_id, 0) + 0.05
                )

    # ── Disease / Contagion ──

    _DISEASE_TYPES = ["plague", "flu", "infection"]

    def _process_disease(self, sim: SimulationState) -> list[Event]:
        events: list[Event] = []
        rng = random.Random(hash(("disease", sim.tick)))
        alive_chars = [c for c in sim.characters.values() if c.alive]
        if not alive_chars:
            return events

        # --- Random outbreak ---
        outbreak_chance = 0.005  # 0.5% per tick
        # Crowding check: if 10+ agents in any 30-unit cluster, double chance
        for char in alive_chars:
            nearby = self.grid.get_nearby_for_char(char.id, 30.0, sim.characters)
            if len(nearby) >= 10:
                outbreak_chance = 0.01
                break

        if rng.random() < outbreak_chance:
            victim = rng.choice(alive_chars)
            if victim.disease is None:
                dtype = rng.choice(self._DISEASE_TYPES)
                victim.disease = {
                    "type": dtype,
                    "severity": round(rng.uniform(0.2, 0.6), 2),
                    "duration": rng.randint(20, 50),
                    "contagion_rate": round(rng.uniform(0.1, 0.3), 2),
                }
                events.append(Event(
                    tick=sim.tick, type=EventType.DISEASE_OUTBREAK,
                    title=f"{victim.name} contracted {dtype}",
                    description=f"{victim.name} has fallen ill with {dtype} (severity {victim.disease['severity']}).",
                    participants=[victim.id],
                    importance=0.6,
                ))

        # --- Spread, effects, recovery ---
        for char in alive_chars:
            if char.disease is None:
                continue

            disease = char.disease

            # Spread to nearby characters (within 15 units)
            nearby_ids = self.grid.get_nearby_for_char(char.id, 15.0, sim.characters)
            for nid in nearby_ids:
                target = sim.characters[nid]
                if not target.alive or target.disease is not None:
                    continue
                hygiene = target.needs.hygiene
                susceptibility = 1.0 - hygiene / 100.0
                if hygiene < 30:
                    susceptibility *= 2.0
                spread_prob = disease["contagion_rate"] * susceptibility
                if rng.random() < spread_prob:
                    target.disease = {
                        "type": disease["type"],
                        "severity": round(rng.uniform(0.1, disease["severity"]), 2),
                        "duration": rng.randint(15, disease["duration"]),
                        "contagion_rate": disease["contagion_rate"],
                    }
                    events.append(Event(
                        tick=sim.tick, type=EventType.DISEASE_SPREAD,
                        title=f"{target.name} caught {disease['type']} from {char.name}",
                        description=f"{target.name} was infected with {disease['type']} by {char.name}.",
                        participants=[char.id, target.id],
                        importance=0.4,
                    ))

            # Effects: extra need drain and health damage
            char.needs.energy = max(0.0, char.needs.energy - 5.0)
            char.needs.hunger = max(0.0, char.needs.hunger - 3.0)
            if disease["severity"] > 0.7:
                char.health = max(0.0, char.health - 2.0)

            # Recovery: decrement duration
            is_resting = char.last_action and char.last_action.type.value == "rest"
            decrement = 2 if is_resting else 1
            disease["duration"] -= decrement
            if disease["duration"] <= 0:
                char.disease = None

        return events

    # ── Property Ownership ──

    def _process_property(self, sim: SimulationState, actions: dict[str, "Action"]) -> list[Event]:
        events: list[Event] = []

        # Passive income: owners earn wealth when agents visit their location
        location_visitor_count: dict[str, int] = {}
        for char in sim.characters.values():
            if not char.alive:
                continue
            for loc in sim.environment.locations:
                if loc.owner_id is None:
                    continue
                dx = char.position["x"] - loc.x
                dy = char.position["y"] - loc.y
                if dx * dx + dy * dy < 900 and char.id != loc.owner_id:  # within 30 units
                    loc_id = loc.id
                    location_visitor_count[loc_id] = location_visitor_count.get(loc_id, 0) + 1

        for loc in sim.environment.locations:
            if loc.owner_id is None:
                continue
            owner = sim.characters.get(loc.owner_id)
            if not owner or not owner.alive:
                loc.owner_id = None  # clear dead owner
                continue
            visitors = location_visitor_count.get(loc.id, 0)
            income = min(visitors, 5)  # max 5 wealth/tick per location
            if income > 0:
                owner.resources["wealth"] = owner.resources.get("wealth", 0) + income

        # Property claiming: wealthy agents with no property can claim unowned locations
        for char in sim.characters.values():
            if not char.alive:
                continue
            wealth = char.resources.get("wealth", 0)
            if wealth < 50:
                continue
            already_owns = any(loc.owner_id == char.id for loc in sim.environment.locations)
            if already_owns:
                continue
            has_goal = any(g.lower() in ("wealth", "trade") for g in char.goals)
            if not has_goal:
                continue
            for loc in sim.environment.locations:
                if loc.owner_id is not None or not loc.is_removable:
                    continue
                char.resources["wealth"] -= 40.0
                loc.owner_id = char.id
                events.append(Event(
                    tick=sim.tick, type=EventType.PROPERTY_CLAIMED,
                    title=f"{char.name} claimed {loc.name}",
                    description=f"{char.name} purchased ownership of {loc.name} for 40 wealth.",
                    participants=[char.id],
                    importance=0.6,
                ))
                break

        return events
