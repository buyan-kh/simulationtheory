import random
from models import (
    SimulationState, SimulationConfig, Character, CharacterCreate,
    Action, Event, Environment, ChatMessage,
)
from agents import AgentBrain, DialogueGenerator
from events import EventGenerator


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
