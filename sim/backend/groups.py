import random
from models import (
    Character, Action, ActionType, Event, EventType,
    SimulationState, Group, GroupMember,
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
