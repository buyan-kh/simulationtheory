"""Tests for the simulation engine core logic."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import SimulationConfig, Character, Action, ActionType, SimulationState
from engine import SimulationEngine, get_time_period, get_hour


def test_get_hour():
    assert get_hour(0) == 0
    assert get_hour(12) == 12
    assert get_hour(24) == 0
    assert get_hour(25) == 1


def test_get_time_period():
    assert get_time_period(0) == "sleep"   # hour 0
    assert get_time_period(5) == "sleep"   # hour 5
    assert get_time_period(6) == "morning" # hour 6
    assert get_time_period(7) == "morning" # hour 7
    assert get_time_period(8) == "work"    # hour 8
    assert get_time_period(16) == "work"   # hour 16
    assert get_time_period(17) == "free"   # hour 17
    assert get_time_period(21) == "free"   # hour 21
    assert get_time_period(22) == "sleep"  # hour 22
    assert get_time_period(23) == "sleep"  # hour 23


def test_create_simulation():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Test Sim")
    assert sim.name == "Test Sim"
    assert sim.tick == 0
    assert len(sim.characters) == 0


def test_add_character():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Test")
    from models import CharacterCreate
    char = engine.add_character(sim.id, CharacterCreate(name="Alice"))
    assert char.name == "Alice"
    assert char.alive is True
    assert char.id in sim.characters
    # Should have a house assigned
    assert char.house_id is not None
    # Should have starter furniture
    assert len(char.equipped_items) > 0


def test_batch_create_characters():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Test Batch")
    from models import BatchCharacterCreate
    chars = engine.batch_create_characters(sim.id, BatchCharacterCreate(count=5))
    assert len(chars) == 5
    assert len(sim.characters) == 5
    # All should have unique names
    names = [c.name for c in chars]
    assert len(set(names)) == 5


def test_simulation_step():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Step Test")
    from models import BatchCharacterCreate
    engine.batch_create_characters(sim.id, BatchCharacterCreate(count=3))
    events, chat = engine.step(sim.id)
    assert sim.tick == 1


def test_needs_decay_after_step():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Needs Test")
    from models import BatchCharacterCreate
    chars = engine.batch_create_characters(sim.id, BatchCharacterCreate(count=1))
    char = chars[0]
    initial_hunger = char.needs.hunger
    engine.step(sim.id)
    # Hunger should have decayed
    assert char.needs.hunger < initial_hunger


def test_delete_simulation():
    engine = SimulationEngine()
    sim = engine.create_simulation(name="Delete Test")
    sim_id = sim.id
    engine.delete_simulation(sim_id)
    assert sim_id not in engine.simulations
