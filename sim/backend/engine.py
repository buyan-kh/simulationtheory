import math
import random
from models import (
    SimulationState, SimulationConfig, Character, CharacterCreate,
    Action, Event, Environment, ChatMessage, House,
)
from agents import AgentBrain, DialogueGenerator
from events import EventGenerator

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
        self.brain = AgentBrain()
        self.event_gen = EventGenerator()
        self.dialogue = DialogueGenerator()

    def create_simulation(self, config: SimulationConfig | None = None) -> SimulationState:
        sim = SimulationState()
        if config:
            sim.config = config
        self.simulations[sim.id] = sim
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

        return all_events, chat_messages

    def get_state(self, sim_id: str) -> SimulationState:
        return self.simulations[sim_id]

    def remove_character(self, sim_id: str, char_id: str):
        sim = self.simulations[sim_id]
        if char_id in sim.characters:
            del sim.characters[char_id]

    def update_config(self, sim_id: str, config: SimulationConfig):
        sim = self.simulations[sim_id]
        sim.config = config

    def delete_simulation(self, sim_id: str):
        if sim_id in self.simulations:
            del self.simulations[sim_id]

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

    # Action type -> target location mapping
    _ACTION_LOCATION_MAP = {
        "cooperate": (0, 0),       # Market Square
        "share": (0, 0),           # Market Square
        "negotiate": (0, 0),       # Market Square
        "attack": (100, 0),        # The Arena
        "defend": (100, 0),        # The Arena
        "compete": (100, 0),       # The Arena
        "betray": (100, 0),        # The Arena
        "ally": (0, 100),          # Council Hall
        "communicate": (0, 100),   # Council Hall
        "explore": (-100, -100),   # Wilderness
        "gather": (-100, -100),    # Wilderness
        "observe": (50, 50),       # Library
        "rest": (50, 50),          # Library
    }

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
                    target_x, target_y = self._ACTION_LOCATION_MAP["rest"]
            else:
                target = self._ACTION_LOCATION_MAP.get(action.type.value)
                if target is None:
                    continue
                target_x, target_y = target
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
