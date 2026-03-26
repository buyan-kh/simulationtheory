"""Basic tests for simulation models and core logic."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import (
    Character, PersonalityTraits, SchwartzValues, EmotionalState,
    Needs, Action, ActionType, SimulationState, SimulationConfig,
    Location, House, Group, GroupMember, WorldItem, MemoryEntry,
    RelationshipType,
)


def test_character_creation():
    char = Character(name="Test Agent")
    assert char.name == "Test Agent"
    assert char.alive is True
    assert char.health == 100.0
    assert char.age == 20
    assert char.spouse_id is None
    assert char.group_id is None


def test_personality_traits_bounds():
    traits = PersonalityTraits(openness=0.0, conscientiousness=1.0, extraversion=0.5,
                                agreeableness=0.5, neuroticism=0.5, honesty_humility=0.5)
    assert traits.openness == 0.0
    assert traits.conscientiousness == 1.0


def test_schwartz_values():
    values = SchwartzValues(self_enhancement=0.8, openness_to_change=0.3,
                            self_transcendence=0.6, conservation=0.4)
    assert values.self_enhancement == 0.8
    assert values.conservation == 0.4


def test_needs_defaults():
    needs = Needs()
    assert needs.hunger == 80.0
    assert needs.energy == 80.0
    assert needs.social == 80.0
    assert needs.fun == 80.0
    assert needs.hygiene == 80.0


def test_action_types():
    action = Action(type=ActionType.COOPERATE, target_id="abc", detail="test")
    assert action.type == ActionType.COOPERATE
    assert action.target_id == "abc"


def test_simulation_state():
    sim = SimulationState()
    assert sim.tick == 0
    assert len(sim.characters) == 0
    assert len(sim.events) == 0
    assert sim.running is False


def test_config_defaults():
    config = SimulationConfig()
    assert config.randomness == 0.3
    assert config.enable_permadeath is True
    assert config.enable_offspring is True
    assert config.max_population == 1000


def test_location_creation():
    loc = Location(name="Test Market", x=10.0, y=20.0, type="trade", biome="plains")
    assert loc.name == "Test Market"
    assert loc.x == 10.0
    assert loc.biome == "plains"


def test_house_creation():
    house = House(name="Test House", position={"x": 5.0, "y": 10.0}, size="small")
    assert house.size == "small"
    assert house.max_residents == 1
    assert len(house.residents) == 0


def test_group_creation():
    group = Group(name="Test Faction", leader_id="leader1")
    assert group.name == "Test Faction"
    assert group.dissolved is False
    assert len(group.members) == 0


def test_relationship_types():
    assert RelationshipType.SPOUSE.value == "spouse"
    assert RelationshipType.ROMANTIC.value == "romantic"
    assert RelationshipType.EX_SPOUSE.value == "ex_spouse"


def test_world_item():
    item = WorldItem(name="Test Sword", creator_id="char1", width=5, height=10,
                     pixels=[None] * 50, item_type="tool")
    assert item.name == "Test Sword"
    assert item.item_type == "tool"
    assert item.placed_in_house is None


def test_memory_entry():
    mem = MemoryEntry(tick=5, content="Saw a fight", importance=0.8, related_characters=["a", "b"])
    assert mem.tick == 5
    assert mem.importance == 0.8
    assert len(mem.related_characters) == 2


def test_emotional_state():
    emo = EmotionalState(happiness=0.5, anger=-0.3)
    assert emo.happiness == 0.5
    assert emo.anger == -0.3
    assert emo.fear == 0.0
