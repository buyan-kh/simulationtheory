import math
import random
from models import (
    Character, Action, ActionType, Event, EventType,
    SimulationState, Group, GroupMember, Location,
)


class GroupManager:

    def process_groups(self, sim: SimulationState, actions: dict[str, Action]) -> list[Event]:
        events: list[Event] = []
        tick = sim.tick

        # Process group-related actions
        for char_id, action in actions.items():
            char = sim.characters.get(char_id)
            if not char or not char.alive:
                continue

            if action.type == ActionType.FORM_GROUP:
                ev = self._form_group(char, sim)
                if ev:
                    events.append(ev)

            elif action.type == ActionType.JOIN_GROUP:
                ev = self._try_join_group(char, sim)
                if ev:
                    events.append(ev)

            elif action.type == ActionType.LEAVE_GROUP:
                ev = self._leave_group(char, sim)
                if ev:
                    events.append(ev)

        # Organic group formation: characters with strong mutual relationships auto-form groups
        events.extend(self._organic_group_formation(sim))

        # Update loyalty and check dissolution
        for group in list(sim.groups.values()):
            if group.dissolved:
                continue
            self._update_loyalty(group, sim)
            ev = self._check_dissolution(group, sim)
            if ev:
                events.append(ev)

        # Group rivalry detection
        events.extend(self._detect_rivalries(sim))

        # Territory control and treasury
        events.extend(self._process_territory(sim, actions))

        # Group warfare at contested territories
        events.extend(self._process_warfare(sim, actions))

        return events

    def _form_group(self, founder: Character, sim: SimulationState) -> Event | None:
        if founder.group_id:
            return None

        rng = random.Random(hash(("form_group", founder.id, sim.tick)))
        names = ["The Alliance", "The Order", "The Pack", "The Circle",
                 "The Brotherhood", "The Guild", "The Covenant", "The Vanguard",
                 "The Syndicate", "The Conclave"]
        name = rng.choice(names) + f" of {founder.name}"

        group = Group(
            name=name,
            founded_tick=sim.tick,
            leader_id=founder.id,
            members=[GroupMember(character_id=founder.id, role="leader", joined_tick=sim.tick, loyalty=1.0)],
            goals=[rng.choice(founder.goals)] if founder.goals else ["survive"],
        )
        sim.groups[group.id] = group
        founder.group_id = group.id
        founder.group_role = "leader"

        return Event(
            tick=sim.tick, type=EventType.GROUP_FORMED,
            title=f"{name} founded",
            description=f"{founder.name} has founded {name}, seeking to unite like-minded individuals.",
            participants=[founder.id],
            outcomes=[f"{founder.name} leads a new faction"],
            importance=0.7,
        )

    def _try_join_group(self, char: Character, sim: SimulationState) -> Event | None:
        if char.group_id:
            return None

        # Find a group with a member the character likes
        best_group = None
        best_rel = 0.3  # minimum threshold
        for group in sim.groups.values():
            if group.dissolved or len(group.members) >= 8:
                continue
            for member in group.members:
                rel = char.relationships.get(member.character_id, 0)
                if rel > best_rel:
                    best_rel = rel
                    best_group = group

        if not best_group:
            return None

        best_group.members.append(GroupMember(
            character_id=char.id, role="member", joined_tick=sim.tick,
        ))
        char.group_id = best_group.id
        char.group_role = "member"

        return Event(
            tick=sim.tick, type=EventType.MEMBER_JOINED,
            title=f"{char.name} joins {best_group.name}",
            description=f"{char.name} has joined {best_group.name} as a member.",
            participants=[char.id, best_group.leader_id or ""],
            outcomes=[f"{best_group.name} grows stronger"],
            importance=0.5,
        )

    def _leave_group(self, char: Character, sim: SimulationState) -> Event | None:
        if not char.group_id or char.group_id not in sim.groups:
            return None

        group = sim.groups[char.group_id]
        group.members = [m for m in group.members if m.character_id != char.id]
        old_group_name = group.name

        if group.leader_id == char.id:
            if group.members:
                new_leader = max(group.members, key=lambda m: m.loyalty)
                group.leader_id = new_leader.character_id
                new_leader.role = "leader"
                if new_leader.character_id in sim.characters:
                    sim.characters[new_leader.character_id].group_role = "leader"
            else:
                group.leader_id = None

        char.group_id = None
        char.group_role = None

        return Event(
            tick=sim.tick, type=EventType.MEMBER_LEFT,
            title=f"{char.name} leaves {old_group_name}",
            description=f"{char.name} has departed from {old_group_name}.",
            participants=[char.id],
            outcomes=[f"{old_group_name} loses a member"],
            importance=0.5,
        )

    def _organic_group_formation(self, sim: SimulationState) -> list[Event]:
        """Characters with mutual strong relationships may organically form groups."""
        events: list[Event] = []
        rng = random.Random(hash(("organic_group", sim.tick)))

        if rng.random() > 0.1:  # Only check 10% of ticks
            return events

        ungrouped = [c for c in sim.characters.values() if c.alive and not c.group_id]
        for char in ungrouped:
            # Find 1+ ungrouped allies
            allies = []
            for other in ungrouped:
                if other.id == char.id:
                    continue
                if (char.relationships.get(other.id, 0) > 0.5 and
                        other.relationships.get(char.id, 0) > 0.5):
                    allies.append(other)
            if len(allies) >= 1 and rng.random() < 0.3:
                # Form group with char as leader
                ev = self._form_group(char, sim)
                if ev:
                    events.append(ev)
                    group = sim.groups.get(char.group_id)
                    if group:
                        for ally in allies[:3]:  # Cap at 3 initial members
                            if not ally.group_id:
                                group.members.append(GroupMember(
                                    character_id=ally.id, role="member",
                                    joined_tick=sim.tick,
                                ))
                                ally.group_id = group.id
                                ally.group_role = "member"
                    break  # Only one organic formation per tick

        return events

    def _update_loyalty(self, group: Group, sim: SimulationState):
        leader = sim.characters.get(group.leader_id) if group.leader_id else None
        for member in group.members:
            char = sim.characters.get(member.character_id)
            if not char or not char.alive:
                continue
            if leader and member.character_id != group.leader_id:
                rel = char.relationships.get(group.leader_id, 0)
                member.loyalty = max(0, min(1, member.loyalty + rel * 0.05))
                # Low agreeableness erodes loyalty faster
                if char.traits.agreeableness < 0.3:
                    member.loyalty = max(0, member.loyalty - 0.02)

    def _check_dissolution(self, group: Group, sim: SimulationState) -> Event | None:
        alive_members = [m for m in group.members
                         if m.character_id in sim.characters and sim.characters[m.character_id].alive]

        if len(alive_members) == 0:
            group.dissolved = True
            group.dissolved_tick = sim.tick
            self._release_territory(group, sim)
            return Event(
                tick=sim.tick, type=EventType.GROUP_DISSOLVED,
                title=f"{group.name} has dissolved",
                description=f"{group.name} has no remaining members and ceases to exist.",
                participants=[],
                outcomes=["A faction is no more"],
                importance=0.6,
            )

        group.members = alive_members  # Prune dead members

        avg_loyalty = sum(m.loyalty for m in alive_members) / len(alive_members) if alive_members else 0
        if avg_loyalty < 0.2 and len(alive_members) > 1:
            # Dissolve
            group.dissolved = True
            group.dissolved_tick = sim.tick
            self._release_territory(group, sim)
            for m in alive_members:
                char = sim.characters.get(m.character_id)
                if char:
                    char.group_id = None
                    char.group_role = None
            return Event(
                tick=sim.tick, type=EventType.GROUP_DISSOLVED,
                title=f"{group.name} collapses",
                description=f"Internal strife tears {group.name} apart. Members go their separate ways.",
                participants=[m.character_id for m in alive_members],
                outcomes=["The faction is no more"],
                importance=0.7,
            )

        return None

    def _detect_rivalries(self, sim: SimulationState) -> list[Event]:
        events: list[Event] = []
        active_groups = [g for g in sim.groups.values() if not g.dissolved and len(g.members) >= 2]

        for i, g1 in enumerate(active_groups):
            for g2 in active_groups[i + 1:]:
                if g2.id in g1.rival_group_ids:
                    continue
                # Check if members of different groups are hostile
                hostile_count = 0
                for m1 in g1.members:
                    c1 = sim.characters.get(m1.character_id)
                    if not c1:
                        continue
                    for m2 in g2.members:
                        rel = c1.relationships.get(m2.character_id, 0)
                        if rel < -0.3:
                            hostile_count += 1
                if hostile_count >= 2:
                    g1.rival_group_ids.append(g2.id)
                    g2.rival_group_ids.append(g1.id)
                    events.append(Event(
                        tick=sim.tick, type=EventType.GROUP_CONFLICT,
                        title=f"Rivalry: {g1.name} vs {g2.name}",
                        description=f"Tensions between {g1.name} and {g2.name} have escalated into open rivalry.",
                        participants=[m.character_id for m in g1.members + g2.members],
                        outcomes=["Two factions are now rivals"],
                        importance=0.75,
                    ))
        return events

    def _release_territory(self, group: Group, sim: SimulationState):
        """Release all territory when a group dissolves."""
        for loc in sim.environment.locations:
            if loc.owner_group_id == group.id:
                loc.owner_group_id = None
        group.territory_ids.clear()
        group.resources["territory"] = 0.0

    # ── Territory Control & Treasury ──

    def _process_territory(self, sim: SimulationState, actions: dict[str, Action]) -> list[Event]:
        events: list[Event] = []
        rng = random.Random(hash(("territory", sim.tick)))

        # Build location index by id
        loc_by_id = {loc.id: loc for loc in sim.environment.locations}

        for group in sim.groups.values():
            if group.dissolved:
                continue

            alive_members = [m for m in group.members
                             if m.character_id in sim.characters and sim.characters[m.character_id].alive]
            if not alive_members:
                continue

            # --- Treasury: members contribute 10% of gather income ---
            for m in alive_members:
                char = sim.characters[m.character_id]
                action = actions.get(char.id)
                if action and action.type == ActionType.GATHER:
                    # 10% of the 3.0 wealth earned from farm gathering
                    contribution = 0.3
                    if char.resources.get("wealth", 0) >= contribution:
                        char.resources["wealth"] -= contribution
                        group.resources["treasury"] = group.resources.get("treasury", 0) + contribution

            # --- Territory claiming: groups with treasury >= 20 can claim unowned locations ---
            treasury = group.resources.get("treasury", 0)
            if treasury >= 20 and len(group.territory_ids) < len(alive_members):
                # Only try once every 10 ticks to avoid spam
                if sim.tick % 10 != 0:
                    continue

                # Find nearest unowned, unclaimed location to group center
                cx = sum(sim.characters[m.character_id].position["x"] for m in alive_members) / len(alive_members)
                cy = sum(sim.characters[m.character_id].position["y"] for m in alive_members) / len(alive_members)

                best_loc = None
                best_dist = float("inf")
                for loc in sim.environment.locations:
                    if loc.owner_group_id is not None:
                        continue
                    # Don't claim cemetery or non-removable essentials that shouldn't be fought over
                    if loc.type == "cemetery":
                        continue
                    dx = loc.x - cx
                    dy = loc.y - cy
                    d = dx * dx + dy * dy
                    if d < best_dist:
                        best_dist = d
                        best_loc = loc

                if best_loc:
                    cost = 15.0
                    group.resources["treasury"] -= cost
                    best_loc.owner_group_id = group.id
                    group.territory_ids.append(best_loc.id)
                    events.append(Event(
                        tick=sim.tick, type=EventType.GROUP_CONFLICT,
                        title=f"{group.name} claims {best_loc.name}",
                        description=f"{group.name} has established control over {best_loc.name}, spending {cost:.0f} from their treasury.",
                        participants=[m.character_id for m in alive_members],
                        outcomes=[f"{best_loc.name} is now {group.name} territory"],
                        importance=0.7,
                    ))

            # --- Territory resource bonus: members near owned territory get bonus ---
            for tid in group.territory_ids:
                loc = loc_by_id.get(tid)
                if not loc:
                    continue
                for m in alive_members:
                    char = sim.characters[m.character_id]
                    dx = char.position["x"] - loc.x
                    dy = char.position["y"] - loc.y
                    if dx * dx + dy * dy < 900:  # within 30 units
                        # Small resource bonus for being on home territory
                        char.resources["energy"] = min(100, char.resources.get("energy", 0) + 1.0)
                        char.needs.hunger = min(100.0, char.needs.hunger + 0.5)

            # --- Clean up lost territory (if location was taken by another group) ---
            group.territory_ids = [
                tid for tid in group.territory_ids
                if tid in loc_by_id and loc_by_id[tid].owner_group_id == group.id
            ]
            group.resources["territory"] = float(len(group.territory_ids))

        return events

    # ── Group Warfare ──

    def _process_warfare(self, sim: SimulationState, actions: dict[str, Action]) -> list[Event]:
        """Rival groups with overlapping territory interests fight for control."""
        events: list[Event] = []
        rng = random.Random(hash(("warfare", sim.tick)))

        # Only process every 5 ticks to avoid constant fighting
        if sim.tick % 5 != 0:
            return events

        active_groups = [g for g in sim.groups.values() if not g.dissolved and g.territory_ids]
        loc_by_id = {loc.id: loc for loc in sim.environment.locations}

        for g1 in active_groups:
            for rival_id in g1.rival_group_ids:
                g2 = sim.groups.get(rival_id)
                if not g2 or g2.dissolved or not g2.territory_ids:
                    continue

                # 20% chance of a raid per rival pair per check
                if rng.random() > 0.2:
                    continue

                # Attacker (g1) targets a random territory of defender (g2)
                target_tid = rng.choice(g2.territory_ids)
                target_loc = loc_by_id.get(target_tid)
                if not target_loc:
                    continue

                # Compute group strengths: sum of (health * loyalty) for alive members
                def group_strength(group: Group) -> float:
                    total = 0.0
                    for m in group.members:
                        c = sim.characters.get(m.character_id)
                        if c and c.alive:
                            total += (c.health / 100.0) * m.loyalty
                    return total

                atk_strength = group_strength(g1) + rng.uniform(-0.5, 0.5)
                def_strength = group_strength(g2) + rng.uniform(-0.5, 0.5)
                # Defender gets home advantage
                def_strength *= 1.2

                g1_members = [m.character_id for m in g1.members if m.character_id in sim.characters and sim.characters[m.character_id].alive]
                g2_members = [m.character_id for m in g2.members if m.character_id in sim.characters and sim.characters[m.character_id].alive]

                if atk_strength > def_strength:
                    # Attacker wins: seize territory
                    target_loc.owner_group_id = g1.id
                    g2.territory_ids = [t for t in g2.territory_ids if t != target_tid]
                    g1.territory_ids.append(target_tid)
                    g2.resources["territory"] = float(len(g2.territory_ids))
                    g1.resources["territory"] = float(len(g1.territory_ids))

                    # Casualties: defenders lose health
                    for mid in g2_members:
                        c = sim.characters[mid]
                        c.health = max(0.0, c.health - rng.uniform(5, 15))
                    # Attackers take lighter casualties
                    for mid in g1_members:
                        c = sim.characters[mid]
                        c.health = max(0.0, c.health - rng.uniform(2, 8))

                    events.append(Event(
                        tick=sim.tick, type=EventType.GROUP_CONFLICT,
                        title=f"{g1.name} seizes {target_loc.name} from {g2.name}",
                        description=f"{g1.name} raided {target_loc.name} and wrested control from {g2.name}. "
                                    f"Attack strength {atk_strength:.1f} vs defense {def_strength:.1f}.",
                        participants=g1_members + g2_members,
                        outcomes=[f"{target_loc.name} is now controlled by {g1.name}"],
                        importance=0.85,
                    ))
                else:
                    # Defender holds: attackers take heavier casualties
                    for mid in g1_members:
                        c = sim.characters[mid]
                        c.health = max(0.0, c.health - rng.uniform(5, 15))
                    for mid in g2_members:
                        c = sim.characters[mid]
                        c.health = max(0.0, c.health - rng.uniform(2, 8))

                    # Failed raid costs treasury
                    g1.resources["treasury"] = max(0, g1.resources.get("treasury", 0) - 5)

                    events.append(Event(
                        tick=sim.tick, type=EventType.GROUP_CONFLICT,
                        title=f"{g2.name} defends {target_loc.name} against {g1.name}",
                        description=f"{g1.name} attempted to seize {target_loc.name} but {g2.name} held firm. "
                                    f"Attack strength {atk_strength:.1f} vs defense {def_strength:.1f}.",
                        participants=g1_members + g2_members,
                        outcomes=[f"{g2.name} retains control of {target_loc.name}"],
                        importance=0.8,
                    ))

                # Warfare worsens relationships between groups
                for mid1 in g1_members:
                    c1 = sim.characters[mid1]
                    for mid2 in g2_members:
                        c1.relationships[mid2] = max(-1.0, c1.relationships.get(mid2, 0) - 0.15)
                        c2 = sim.characters[mid2]
                        c2.relationships[mid1] = max(-1.0, c2.relationships.get(mid1, 0) - 0.15)

                break  # One battle per rival pair per check

        return events
