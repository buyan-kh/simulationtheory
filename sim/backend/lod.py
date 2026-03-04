"""Level-of-Detail manager for multi-tier agent simulation.

Agents are classified into tiers that determine simulation fidelity:

  SPOTLIGHT  — Full decision-making, dialogue, memory every tick.
               These are the characters the user is watching closely.
  ACTIVE     — Full decisions every tick, but no dialogue generation.
               Characters near spotlight agents or with relationships to them.
  BACKGROUND — Simplified decisions every N ticks. No dialogue, summary memory.
               Everyone else.

This lets us scale from 30 agents to 1000+ without changing the core
decision-making logic — we just run it less often for less important agents.
"""

from __future__ import annotations
from enum import IntEnum
from spatial import SpatialGrid
from models import Character


class LODTier(IntEnum):
    SPOTLIGHT = 0
    ACTIVE = 1
    BACKGROUND = 2


# How often each tier updates (in ticks)
TIER_UPDATE_INTERVAL: dict[LODTier, int] = {
    LODTier.SPOTLIGHT: 1,
    LODTier.ACTIVE: 1,
    LODTier.BACKGROUND: 5,
}

# Radius around spotlight agents that counts as "active"
ACTIVE_RADIUS: float = 80.0

# Relationship threshold to be promoted to ACTIVE regardless of distance
RELATIONSHIP_ACTIVE_THRESHOLD: float = 0.5


class LODManager:
    """Classifies agents into LOD tiers and tracks spotlight agents."""

    __slots__ = ("spotlight_ids", "tiers")

    def __init__(self):
        self.spotlight_ids: set[str] = set()
        self.tiers: dict[str, LODTier] = {}

    def set_spotlight(self, char_ids: set[str]) -> None:
        """Replace the spotlight set."""
        self.spotlight_ids = set(char_ids)

    def add_spotlight(self, char_id: str) -> None:
        self.spotlight_ids.add(char_id)

    def remove_spotlight(self, char_id: str) -> None:
        self.spotlight_ids.discard(char_id)

    def classify(
        self,
        characters: dict[str, Character],
        grid: SpatialGrid,
    ) -> dict[LODTier, list[str]]:
        """Classify all alive characters into tiers.

        Rules:
          1. Characters in spotlight_ids → SPOTLIGHT
          2. Characters within ACTIVE_RADIUS of any spotlight agent,
             OR with a relationship ≥ threshold to a spotlight agent → ACTIVE
          3. Everyone else → BACKGROUND

        If no spotlight agents are set, ALL agents are ACTIVE (backwards
        compatible with the current behavior).
        """
        result: dict[LODTier, list[str]] = {
            LODTier.SPOTLIGHT: [],
            LODTier.ACTIVE: [],
            LODTier.BACKGROUND: [],
        }

        alive_ids = [cid for cid, c in characters.items() if c.alive]

        # No spotlight → everyone is active (original behavior)
        if not self.spotlight_ids:
            result[LODTier.ACTIVE] = alive_ids
            for cid in alive_ids:
                self.tiers[cid] = LODTier.ACTIVE
            return result

        # Build the set of active IDs (near spotlight or related)
        active_ids: set[str] = set()
        valid_spotlight: set[str] = set()

        for sid in self.spotlight_ids:
            if sid in characters and characters[sid].alive:
                valid_spotlight.add(sid)
                nearby = grid.get_nearby_for_char(sid, ACTIVE_RADIUS, characters)
                active_ids.update(nearby)

        # Also promote agents with strong relationships to spotlight agents
        for sid in valid_spotlight:
            spotlight_char = characters[sid]
            for rel_id, rel_val in spotlight_char.relationships.items():
                if rel_val >= RELATIONSHIP_ACTIVE_THRESHOLD and rel_id in characters and characters[rel_id].alive:
                    active_ids.add(rel_id)

        # Classify
        for cid in alive_ids:
            if cid in valid_spotlight:
                result[LODTier.SPOTLIGHT].append(cid)
                self.tiers[cid] = LODTier.SPOTLIGHT
            elif cid in active_ids:
                result[LODTier.ACTIVE].append(cid)
                self.tiers[cid] = LODTier.ACTIVE
            else:
                result[LODTier.BACKGROUND].append(cid)
                self.tiers[cid] = LODTier.BACKGROUND

        return result

    def should_update(self, tier: LODTier, tick: int) -> bool:
        """Whether agents in this tier should run decisions this tick."""
        interval = TIER_UPDATE_INTERVAL[tier]
        return tick % interval == 0

    def get_tier(self, char_id: str) -> LODTier:
        return self.tiers.get(char_id, LODTier.ACTIVE)

    def get_stats(self, characters: dict[str, Character]) -> dict:
        """Return tier counts for analytics."""
        counts = {tier.name: 0 for tier in LODTier}
        for cid, c in characters.items():
            if not c.alive:
                continue
            tier = self.tiers.get(cid, LODTier.ACTIVE)
            counts[tier.name] += 1
        return {
            "tiers": counts,
            "spotlight_ids": list(self.spotlight_ids),
            "total_alive": sum(counts.values()),
        }
