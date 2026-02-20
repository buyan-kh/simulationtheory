import math
import random
from models import (
    Character, Action, ActionType, Event, EventType, SimulationState,
)


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class EventGenerator:

    def resolve_actions(
        self,
        characters: dict[str, Character],
        actions: dict[str, Action],
        state: SimulationState,
    ) -> list[Event]:
        events: list[Event] = []
        processed_pairs: set[tuple[str, str]] = set()
        tick = state.tick

        for char_id, action in actions.items():
            if action.target_id is None:
                event = self._resolve_solo_action(char_id, action, characters, state)
                if event:
                    events.append(event)
                continue

            target_id = action.target_id
            if target_id not in characters:
                continue

            pair = tuple(sorted([char_id, target_id]))
            if pair in processed_pairs:
                continue
            processed_pairs.add(pair)

            target_action = actions.get(target_id)
            char = characters[char_id]
            target = characters[target_id]

            if action.type == ActionType.COOPERATE and target_action and target_action.target_id == char_id:
                if target_action.type == ActionType.COOPERATE:
                    events.append(self._mutual_cooperation(char, target, tick))
                elif target_action.type == ActionType.BETRAY:
                    events.append(self._betrayal(target, char, tick))
                elif target_action.type == ActionType.ATTACK:
                    events.append(self._conflict(target, char, tick, state))
                else:
                    events.append(self._one_sided_cooperation(char, target, tick))

            elif action.type == ActionType.ATTACK:
                if target_action and target_action.target_id == char_id and target_action.type == ActionType.ATTACK:
                    events.append(self._mutual_conflict(char, target, tick, state))
                elif target_action and target_action.target_id == char_id and target_action.type == ActionType.DEFEND:
                    events.append(self._defended_attack(char, target, tick, state))
                else:
                    events.append(self._conflict(char, target, tick, state))

            elif action.type == ActionType.ALLY:
                if target_action and target_action.target_id == char_id and target_action.type in {ActionType.ALLY, ActionType.COOPERATE}:
                    events.append(self._alliance_formed(char, target, tick))
                else:
                    events.append(self._alliance_proposed(char, target, tick))

            elif action.type == ActionType.BETRAY:
                events.append(self._betrayal(char, target, tick))

            elif action.type == ActionType.NEGOTIATE:
                if target_action and target_action.target_id == char_id and target_action.type == ActionType.NEGOTIATE:
                    events.append(self._mutual_negotiation(char, target, tick))
                else:
                    events.append(self._negotiation_attempt(char, target, tick))

            elif action.type == ActionType.SHARE:
                events.append(self._resource_sharing(char, target, tick))

            elif action.type == ActionType.COMMUNICATE:
                events.append(self._communication(char, target, tick))

            elif action.type == ActionType.COMPETE:
                if target_action and target_action.target_id == char_id and target_action.type == ActionType.COMPETE:
                    events.append(self._competition(char, target, tick, state))
                else:
                    events.append(self._one_sided_competition(char, target, tick, state))

            elif action.type == ActionType.DEFEND:
                events.append(Event(
                    tick=tick, type=EventType.DECISION,
                    title=f"{char.name} takes a defensive stance",
                    description=f"{char.name} fortifies their position, wary of {target.name}.",
                    participants=[char_id, target_id],
                    outcomes=[f"{char.name} is better prepared for threats"],
                    importance=0.3,
                ))

        return events

    def generate_environmental_events(self, state: SimulationState) -> list[Event]:
        events: list[Event] = []
        rng = random.Random(hash(("env", state.tick)))
        randomness = state.config.randomness
        tick = state.tick

        if rng.random() < 0.15 * randomness:
            resource = rng.choice(list(state.environment.resources.keys()))
            change = rng.uniform(-15, 20)
            old_val = state.environment.resources[resource]
            new_val = max(0, old_val + change)
            state.environment.resources[resource] = new_val

            if change > 0:
                title = f"Abundance of {resource}"
                desc = f"Environmental conditions have increased {resource} supply from {old_val:.0f} to {new_val:.0f}."
            else:
                title = f"Scarcity of {resource}"
                desc = f"Environmental conditions have reduced {resource} supply from {old_val:.0f} to {new_val:.0f}."

            events.append(Event(
                tick=tick, type=EventType.ENVIRONMENTAL,
                title=title, description=desc,
                participants=list(state.characters.keys()),
                outcomes=[f"{resource} changed by {change:+.0f}"],
                importance=0.4 + abs(change) / 40,
            ))

        if rng.random() < 0.1 * randomness:
            weather_options = ["calm", "stormy", "harsh", "pleasant", "foggy", "scorching"]
            new_weather = rng.choice(weather_options)
            old_weather = state.environment.conditions.get("weather", "calm")
            if new_weather != old_weather:
                state.environment.conditions["weather"] = new_weather
                events.append(Event(
                    tick=tick, type=EventType.ENVIRONMENTAL,
                    title=f"Weather shifts to {new_weather}",
                    description=f"The weather changes from {old_weather} to {new_weather}, affecting all inhabitants.",
                    participants=list(state.characters.keys()),
                    outcomes=[f"Weather is now {new_weather}"],
                    importance=0.3,
                ))

        if rng.random() < 0.05 * randomness:
            events.append(Event(
                tick=tick, type=EventType.ENVIRONMENTAL,
                title="A mysterious discovery",
                description="Something unusual has been found in the environment, sparking curiosity and tension.",
                participants=list(state.characters.keys()),
                outcomes=["New opportunities and dangers emerge"],
                importance=0.7,
            ))

        scarcity = state.config.resource_scarcity
        if scarcity > 0:
            for resource, amount in state.environment.resources.items():
                drain = scarcity * rng.uniform(0.5, 2.0)
                state.environment.resources[resource] = max(0, amount - drain)

        return events

    def detect_emergent_events(self, state: SimulationState, recent_events: list[Event]) -> list[Event]:
        emergent: list[Event] = []
        tick = state.tick
        characters = state.characters

        alliance_members: dict[str, set[str]] = {}
        for event in recent_events:
            if event.type == EventType.ALLIANCE_FORMED:
                for pid in event.participants:
                    if pid not in alliance_members:
                        alliance_members[pid] = set()
                    alliance_members[pid].update(event.participants)

        coalition_groups: list[set[str]] = []
        visited: set[str] = set()
        for member, allies in alliance_members.items():
            if member in visited:
                continue
            group = set()
            stack = [member]
            while stack:
                current = stack.pop()
                if current in visited:
                    continue
                visited.add(current)
                group.add(current)
                for ally in alliance_members.get(current, set()):
                    if ally not in visited:
                        stack.append(ally)
            if len(group) >= 3:
                coalition_groups.append(group)

        for group in coalition_groups:
            names = [characters[cid].name for cid in group if cid in characters]
            emergent.append(Event(
                tick=tick, type=EventType.EMERGENT,
                title="Coalition formed",
                description=f"A powerful coalition has emerged among {', '.join(names)}. Their combined influence reshapes the balance of power.",
                participants=list(group),
                outcomes=["Power balance shifts", "Non-members may feel threatened"],
                importance=0.85,
            ))

        for resource, amount in state.environment.resources.items():
            if amount < 15:
                emergent.append(Event(
                    tick=tick, type=EventType.EMERGENT,
                    title=f"Crisis: {resource} shortage",
                    description=f"{resource} has dropped to critically low levels ({amount:.0f}). Desperation and conflict are likely.",
                    participants=list(characters.keys()),
                    outcomes=[f"{resource} scarcity intensifies competition"],
                    importance=0.9,
                ))
                state.environment.conditions["scarcity"] = "severe"

        resource_totals: dict[str, float] = {}
        for char in characters.values():
            if not char.alive:
                continue
            total = sum(char.resources.values())
            resource_totals[char.id] = total

        if len(resource_totals) >= 2:
            max_holder = max(resource_totals, key=resource_totals.get)
            max_val = resource_totals[max_holder]
            avg_val = sum(resource_totals.values()) / len(resource_totals)
            if avg_val > 0 and max_val > avg_val * 2.5:
                dominant = characters[max_holder]
                emergent.append(Event(
                    tick=tick, type=EventType.EMERGENT,
                    title=f"{dominant.name} dominates",
                    description=f"{dominant.name} has accumulated far more resources than anyone else, creating a power imbalance.",
                    participants=list(characters.keys()),
                    outcomes=[f"{dominant.name} holds disproportionate power", "Others may unite against them"],
                    importance=0.8,
                ))

        trust_values = []
        for char in characters.values():
            if not char.alive:
                continue
            trust_values.append(char.emotional_state.trust)
        if trust_values and sum(trust_values) / len(trust_values) < -0.3:
            emergent.append(Event(
                tick=tick, type=EventType.EMERGENT,
                title="Era of suspicion",
                description="Trust has collapsed across the community. Everyone watches their back.",
                participants=list(characters.keys()),
                outcomes=["Cooperation becomes nearly impossible", "Betrayals become more likely"],
                importance=0.75,
            ))

        conflict_count = sum(1 for e in recent_events if e.type == EventType.CONFLICT)
        if conflict_count >= 3:
            emergent.append(Event(
                tick=tick, type=EventType.EMERGENT,
                title="Escalating violence",
                description="Multiple conflicts have erupted. The situation is spiraling toward all-out war.",
                participants=list(characters.keys()),
                outcomes=["Fear spreads", "Alliances become crucial for survival"],
                importance=0.85,
            ))

        return emergent

    def apply_outcomes(self, events: list[Event], state: SimulationState):
        for event in events:
            for outcome in event.outcomes:
                outcome_lower = outcome.lower()
                for char_id in event.participants:
                    if char_id not in state.characters:
                        continue
                    char = state.characters[char_id]

                    if "gains" in outcome_lower or "received" in outcome_lower:
                        for res_name in char.resources:
                            if res_name in outcome_lower:
                                try:
                                    parts = outcome_lower.split()
                                    for i, p in enumerate(parts):
                                        if p in ("gains", "received", "gets"):
                                            val = float(parts[i + 1])
                                            char.resources[res_name] = char.resources.get(res_name, 0) + val
                                            break
                                except (IndexError, ValueError):
                                    pass

                    if "loses" in outcome_lower or "lost" in outcome_lower:
                        for res_name in char.resources:
                            if res_name in outcome_lower:
                                try:
                                    parts = outcome_lower.split()
                                    for i, p in enumerate(parts):
                                        if p in ("loses", "lost"):
                                            val = float(parts[i + 1])
                                            char.resources[res_name] = max(0, char.resources.get(res_name, 0) - val)
                                            break
                                except (IndexError, ValueError):
                                    pass

            if event.type == EventType.ALLIANCE_FORMED:
                for i, pid1 in enumerate(event.participants):
                    for pid2 in event.participants[i + 1:]:
                        if pid1 in state.characters and pid2 in state.characters:
                            c1 = state.characters[pid1]
                            c2 = state.characters[pid2]
                            c1.relationships[pid2] = _clamp(c1.relationships.get(pid2, 0) + 0.3, -1, 1)
                            c2.relationships[pid1] = _clamp(c2.relationships.get(pid1, 0) + 0.3, -1, 1)

            elif event.type == EventType.CONFLICT:
                for i, pid1 in enumerate(event.participants):
                    for pid2 in event.participants[i + 1:]:
                        if pid1 in state.characters and pid2 in state.characters:
                            c1 = state.characters[pid1]
                            c2 = state.characters[pid2]
                            c1.relationships[pid2] = _clamp(c1.relationships.get(pid2, 0) - 0.2, -1, 1)
                            c2.relationships[pid1] = _clamp(c2.relationships.get(pid1, 0) - 0.2, -1, 1)

    def _mutual_cooperation(self, a: Character, b: Character, tick: int) -> Event:
        bonus = 5.0
        a.resources["influence"] = a.resources.get("influence", 0) + bonus
        b.resources["influence"] = b.resources.get("influence", 0) + bonus
        a.resources["wealth"] = a.resources.get("wealth", 0) + 3
        b.resources["wealth"] = b.resources.get("wealth", 0) + 3
        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{a.name} and {b.name} cooperate",
            description=f"{a.name} and {b.name} work together, combining their strengths for mutual benefit.",
            participants=[a.id, b.id],
            outcomes=[
                f"{a.name} gains 5 influence and 3 wealth",
                f"{b.name} gains 5 influence and 3 wealth",
            ],
            importance=0.5,
        )

    def _one_sided_cooperation(self, cooperator: Character, other: Character, tick: int) -> Event:
        cooperator.resources["influence"] = cooperator.resources.get("influence", 0) + 2
        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{cooperator.name} extends a hand to {other.name}",
            description=f"{cooperator.name} attempts cooperation, but {other.name} is focused elsewhere.",
            participants=[cooperator.id, other.id],
            outcomes=[f"{cooperator.name} gains 2 influence from goodwill"],
            importance=0.3,
        )

    def _betrayal(self, betrayer: Character, victim: Character, tick: int) -> Event:
        stolen = min(10, victim.resources.get("wealth", 0))
        betrayer.resources["wealth"] = betrayer.resources.get("wealth", 0) + stolen
        victim.resources["wealth"] = max(0, victim.resources.get("wealth", 0) - stolen)
        betrayer.resources["influence"] = max(0, betrayer.resources.get("influence", 0) - 8)

        betrayer.relationships[victim.id] = _clamp(betrayer.relationships.get(victim.id, 0) - 0.4, -1, 1)
        victim.relationships[betrayer.id] = _clamp(victim.relationships.get(betrayer.id, 0) - 0.6, -1, 1)

        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{betrayer.name} betrays {victim.name}",
            description=f"{betrayer.name} betrayed {victim.name}'s trust, stealing resources and sowing distrust.",
            participants=[betrayer.id, victim.id],
            outcomes=[
                f"{betrayer.name} stole {stolen:.0f} wealth from {victim.name}",
                f"{betrayer.name} loses 8 influence from reputation damage",
                f"{victim.name} lost {stolen:.0f} wealth",
            ],
            importance=0.8,
        )

    def _conflict(self, attacker: Character, defender: Character, tick: int, state: SimulationState) -> Event:
        rng = random.Random(hash(("conflict", attacker.id, defender.id, tick)))
        atk_power = attacker.resources.get("energy", 50) * 0.6 + attacker.resources.get("influence", 0) * 0.2
        def_power = defender.resources.get("energy", 50) * 0.4 + defender.resources.get("influence", 0) * 0.3
        atk_power += rng.gauss(0, state.config.randomness * 10)

        if atk_power > def_power:
            loot = min(8, defender.resources.get("wealth", 0))
            attacker.resources["wealth"] = attacker.resources.get("wealth", 0) + loot
            defender.resources["wealth"] = max(0, defender.resources.get("wealth", 0) - loot)
            attacker.resources["energy"] = max(0, attacker.resources.get("energy", 0) - 10)
            defender.resources["energy"] = max(0, defender.resources.get("energy", 0) - 15)
            winner, loser = attacker, defender
        else:
            attacker.resources["energy"] = max(0, attacker.resources.get("energy", 0) - 15)
            defender.resources["energy"] = max(0, defender.resources.get("energy", 0) - 5)
            winner, loser = defender, attacker

        return Event(
            tick=tick, type=EventType.CONFLICT,
            title=f"Conflict: {attacker.name} vs {defender.name}",
            description=f"{attacker.name} attacks {defender.name} in a fierce confrontation. {winner.name} wins the exchange.",
            participants=[attacker.id, defender.id],
            outcomes=[
                f"{winner.name} wins the conflict",
                f"{loser.name} suffers losses",
            ],
            importance=0.7,
        )

    def _mutual_conflict(self, a: Character, b: Character, tick: int, state: SimulationState) -> Event:
        rng = random.Random(hash(("mutual_conflict", a.id, b.id, tick)))
        a_power = a.resources.get("energy", 50) + rng.gauss(0, 10)
        b_power = b.resources.get("energy", 50) + rng.gauss(0, 10)

        a.resources["energy"] = max(0, a.resources.get("energy", 0) - 20)
        b.resources["energy"] = max(0, b.resources.get("energy", 0) - 20)

        if a_power > b_power:
            loot = min(10, b.resources.get("wealth", 0))
            a.resources["wealth"] = a.resources.get("wealth", 0) + loot
            b.resources["wealth"] = max(0, b.resources.get("wealth", 0) - loot)
            result = f"{a.name} wins the brutal exchange"
        else:
            loot = min(10, a.resources.get("wealth", 0))
            b.resources["wealth"] = b.resources.get("wealth", 0) + loot
            a.resources["wealth"] = max(0, a.resources.get("wealth", 0) - loot)
            result = f"{b.name} wins the brutal exchange"

        return Event(
            tick=tick, type=EventType.CONFLICT,
            title=f"Battle: {a.name} vs {b.name}",
            description=f"A vicious battle erupts between {a.name} and {b.name}. Both suffer heavy losses. {result}.",
            participants=[a.id, b.id],
            outcomes=[result, "Both combatants are exhausted"],
            importance=0.8,
        )

    def _defended_attack(self, attacker: Character, defender: Character, tick: int, state: SimulationState) -> Event:
        rng = random.Random(hash(("defended", attacker.id, defender.id, tick)))
        atk_power = attacker.resources.get("energy", 50) * 0.5 + rng.gauss(0, 5)
        def_power = defender.resources.get("energy", 50) * 0.7 + defender.resources.get("influence", 0) * 0.2

        attacker.resources["energy"] = max(0, attacker.resources.get("energy", 0) - 12)
        defender.resources["energy"] = max(0, defender.resources.get("energy", 0) - 5)

        if atk_power > def_power:
            loot = min(5, defender.resources.get("wealth", 0))
            attacker.resources["wealth"] = attacker.resources.get("wealth", 0) + loot
            defender.resources["wealth"] = max(0, defender.resources.get("wealth", 0) - loot)
            desc = f"{attacker.name} breaks through {defender.name}'s defenses."
        else:
            defender.resources["influence"] = defender.resources.get("influence", 0) + 5
            desc = f"{defender.name} successfully repels {attacker.name}'s attack, gaining respect."

        return Event(
            tick=tick, type=EventType.CONFLICT,
            title=f"{attacker.name} attacks, {defender.name} defends",
            description=desc,
            participants=[attacker.id, defender.id],
            outcomes=[desc],
            importance=0.6,
        )

    def _alliance_formed(self, a: Character, b: Character, tick: int) -> Event:
        a.relationships[b.id] = _clamp(a.relationships.get(b.id, 0) + 0.4, -1, 1)
        b.relationships[a.id] = _clamp(b.relationships.get(a.id, 0) + 0.4, -1, 1)
        a.resources["influence"] = a.resources.get("influence", 0) + 5
        b.resources["influence"] = b.resources.get("influence", 0) + 5
        return Event(
            tick=tick, type=EventType.ALLIANCE_FORMED,
            title=f"Alliance: {a.name} & {b.name}",
            description=f"{a.name} and {b.name} formalize an alliance, pledging mutual support and cooperation.",
            participants=[a.id, b.id],
            outcomes=[
                f"{a.name} and {b.name} are now allies",
                "Both gain 5 influence",
            ],
            importance=0.7,
        )

    def _alliance_proposed(self, proposer: Character, target: Character, tick: int) -> Event:
        proposer.relationships[target.id] = _clamp(proposer.relationships.get(target.id, 0) + 0.1, -1, 1)
        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{proposer.name} proposes alliance to {target.name}",
            description=f"{proposer.name} extends an offer of alliance to {target.name}, who has yet to respond.",
            participants=[proposer.id, target.id],
            outcomes=[f"{target.name} may consider the alliance next turn"],
            importance=0.4,
        )

    def _mutual_negotiation(self, a: Character, b: Character, tick: int) -> Event:
        a_skill = a.traits.extraversion * 0.4 + a.traits.agreeableness * 0.3 + a.resources.get("influence", 0) * 0.01
        b_skill = b.traits.extraversion * 0.4 + b.traits.agreeableness * 0.3 + b.resources.get("influence", 0) * 0.01

        exchange = 3.0
        if a_skill > b_skill:
            a.resources["wealth"] = a.resources.get("wealth", 0) + exchange
            b.resources["wealth"] = max(0, b.resources.get("wealth", 0) - exchange * 0.5)
            outcome_detail = f"{a.name} gets a better deal"
        else:
            b.resources["wealth"] = b.resources.get("wealth", 0) + exchange
            a.resources["wealth"] = max(0, a.resources.get("wealth", 0) - exchange * 0.5)
            outcome_detail = f"{b.name} gets a better deal"

        a.relationships[b.id] = _clamp(a.relationships.get(b.id, 0) + 0.1, -1, 1)
        b.relationships[a.id] = _clamp(b.relationships.get(a.id, 0) + 0.1, -1, 1)

        return Event(
            tick=tick, type=EventType.NEGOTIATION,
            title=f"{a.name} and {b.name} negotiate",
            description=f"{a.name} and {b.name} sit down for negotiations. {outcome_detail}.",
            participants=[a.id, b.id],
            outcomes=[outcome_detail, "Both parties gain rapport"],
            importance=0.5,
        )

    def _negotiation_attempt(self, negotiator: Character, target: Character, tick: int) -> Event:
        negotiator.resources["influence"] = negotiator.resources.get("influence", 0) + 2
        return Event(
            tick=tick, type=EventType.NEGOTIATION,
            title=f"{negotiator.name} tries to negotiate with {target.name}",
            description=f"{negotiator.name} approaches {target.name} to negotiate, but {target.name} is preoccupied.",
            participants=[negotiator.id, target.id],
            outcomes=[f"{negotiator.name} gains 2 influence from diplomatic effort"],
            importance=0.3,
        )

    def _resource_sharing(self, sharer: Character, receiver: Character, tick: int) -> Event:
        amount = min(5.0, sharer.resources.get("wealth", 0) * 0.15)
        sharer.resources["wealth"] = max(0, sharer.resources.get("wealth", 0) - amount)
        receiver.resources["wealth"] = receiver.resources.get("wealth", 0) + amount
        sharer.resources["influence"] = sharer.resources.get("influence", 0) + 3
        sharer.relationships[receiver.id] = _clamp(sharer.relationships.get(receiver.id, 0) + 0.2, -1, 1)
        receiver.relationships[sharer.id] = _clamp(receiver.relationships.get(sharer.id, 0) + 0.25, -1, 1)

        return Event(
            tick=tick, type=EventType.RESOURCE_CHANGE,
            title=f"{sharer.name} shares with {receiver.name}",
            description=f"{sharer.name} generously shares {amount:.0f} wealth with {receiver.name}.",
            participants=[sharer.id, receiver.id],
            outcomes=[
                f"{receiver.name} received {amount:.0f} wealth",
                f"{sharer.name} gains 3 influence and goodwill",
            ],
            importance=0.4,
        )

    def _communication(self, a: Character, b: Character, tick: int) -> Event:
        a.relationships[b.id] = _clamp(a.relationships.get(b.id, 0) + 0.1, -1, 1)
        b.relationships[a.id] = _clamp(b.relationships.get(a.id, 0) + 0.05, -1, 1)
        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{a.name} and {b.name} converse",
            description=f"{a.name} engages {b.name} in conversation, sharing thoughts and gathering information.",
            participants=[a.id, b.id],
            outcomes=["Information exchanged", "Relationship slightly improved"],
            importance=0.25,
        )

    def _competition(self, a: Character, b: Character, tick: int, state: SimulationState) -> Event:
        rng = random.Random(hash(("compete", a.id, b.id, tick)))
        a_score = (
            a.resources.get("energy", 50) * 0.3
            + a.traits.conscientiousness * 20
            + rng.gauss(0, state.config.randomness * 15)
        )
        b_score = (
            b.resources.get("energy", 50) * 0.3
            + b.traits.conscientiousness * 20
            + rng.gauss(0, state.config.randomness * 15)
        )

        prize = 8.0
        if a_score > b_score:
            a.resources["wealth"] = a.resources.get("wealth", 0) + prize
            a.resources["influence"] = a.resources.get("influence", 0) + 3
            winner, loser = a, b
        else:
            b.resources["wealth"] = b.resources.get("wealth", 0) + prize
            b.resources["influence"] = b.resources.get("influence", 0) + 3
            winner, loser = b, a

        a.resources["energy"] = max(0, a.resources.get("energy", 0) - 8)
        b.resources["energy"] = max(0, b.resources.get("energy", 0) - 8)

        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"Competition: {a.name} vs {b.name}",
            description=f"{a.name} and {b.name} compete fiercely. {winner.name} comes out on top.",
            participants=[a.id, b.id],
            outcomes=[
                f"{winner.name} wins {prize:.0f} wealth and 3 influence",
                f"{loser.name} loses the competition",
            ],
            importance=0.5,
        )

    def _one_sided_competition(self, competitor: Character, target: Character, tick: int, state: SimulationState) -> Event:
        competitor.resources["energy"] = max(0, competitor.resources.get("energy", 0) - 5)
        competitor.resources["wealth"] = competitor.resources.get("wealth", 0) + 3
        return Event(
            tick=tick, type=EventType.INTERACTION,
            title=f"{competitor.name} competes near {target.name}",
            description=f"{competitor.name} pushes for advantage around {target.name}'s territory.",
            participants=[competitor.id, target.id],
            outcomes=[f"{competitor.name} gains minor resources from competitive posturing"],
            importance=0.3,
        )

    def _resolve_solo_action(self, char_id: str, action: Action, characters: dict[str, Character], state: SimulationState) -> Event | None:
        char = characters.get(char_id)
        if not char:
            return None
        tick = state.tick

        match action.type:
            case ActionType.EXPLORE:
                rng = random.Random(hash(("explore", char_id, tick)))
                locs = state.environment.locations
                if locs:
                    target_loc = rng.choice(locs)
                    char.position["x"] += (target_loc["x"] - char.position["x"]) * 0.3
                    char.position["y"] += (target_loc["y"] - char.position["y"]) * 0.3
                char.resources["energy"] = max(0, char.resources.get("energy", 0) - 5)
                found = rng.random() < 0.4
                if found:
                    char.resources["wealth"] = char.resources.get("wealth", 0) + 3
                    return Event(
                        tick=tick, type=EventType.DECISION,
                        title=f"{char.name} explores and discovers something",
                        description=f"{char.name} ventures into new territory and finds valuable resources.",
                        participants=[char_id],
                        outcomes=[f"{char.name} gains 3 wealth from exploration"],
                        importance=0.4,
                    )
                return Event(
                    tick=tick, type=EventType.DECISION,
                    title=f"{char.name} explores",
                    description=f"{char.name} scouts the area, mapping out the surroundings.",
                    participants=[char_id],
                    outcomes=["Knowledge gained about the area"],
                    importance=0.2,
                )

            case ActionType.REST:
                recovery = 15 + char.traits.conscientiousness * 10
                char.resources["energy"] = min(100, char.resources.get("energy", 0) + recovery)
                return Event(
                    tick=tick, type=EventType.DECISION,
                    title=f"{char.name} rests",
                    description=f"{char.name} takes time to rest and recover, regaining {recovery:.0f} energy.",
                    participants=[char_id],
                    outcomes=[f"{char.name} recovers {recovery:.0f} energy"],
                    importance=0.15,
                )

            case ActionType.GATHER:
                char.resources["energy"] = max(0, char.resources.get("energy", 0) - 8)
                gathered = 5 + char.traits.conscientiousness * 5
                char.resources["wealth"] = char.resources.get("wealth", 0) + gathered
                env_drain = gathered * 0.3
                for res in state.environment.resources:
                    state.environment.resources[res] = max(0, state.environment.resources[res] - env_drain / len(state.environment.resources))
                return Event(
                    tick=tick, type=EventType.RESOURCE_CHANGE,
                    title=f"{char.name} gathers resources",
                    description=f"{char.name} spends time gathering, accumulating {gathered:.0f} wealth.",
                    participants=[char_id],
                    outcomes=[f"{char.name} gained {gathered:.0f} wealth"],
                    importance=0.3,
                )

            case ActionType.OBSERVE:
                char.resources["energy"] = max(0, char.resources.get("energy", 0) - 2)
                return Event(
                    tick=tick, type=EventType.DECISION,
                    title=f"{char.name} observes",
                    description=f"{char.name} watches carefully, taking in everything around them.",
                    participants=[char_id],
                    outcomes=["Information gathered through observation"],
                    importance=0.15,
                )

            case _:
                return None
