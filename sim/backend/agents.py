import math
import random
from models import (
    Character, SimulationState, Action, ActionType, Event, EventType,
    MemoryEntry, EmotionalState,
)


PERSONALITY_ACTION_WEIGHTS: dict[str, dict[ActionType, float]] = {
    "openness": {
        ActionType.EXPLORE: 0.9, ActionType.COMMUNICATE: 0.6, ActionType.NEGOTIATE: 0.5,
        ActionType.COOPERATE: 0.4, ActionType.SHARE: 0.5, ActionType.OBSERVE: 0.7,
    },
    "conscientiousness": {
        ActionType.GATHER: 0.8, ActionType.DEFEND: 0.6, ActionType.REST: 0.5,
        ActionType.OBSERVE: 0.6, ActionType.COOPERATE: 0.5,
    },
    "extraversion": {
        ActionType.COMMUNICATE: 0.9, ActionType.NEGOTIATE: 0.7, ActionType.ALLY: 0.7,
        ActionType.COOPERATE: 0.6, ActionType.COMPETE: 0.5, ActionType.SHARE: 0.4,
    },
    "agreeableness": {
        ActionType.COOPERATE: 0.9, ActionType.SHARE: 0.8, ActionType.ALLY: 0.7,
        ActionType.NEGOTIATE: 0.5, ActionType.COMMUNICATE: 0.5,
        ActionType.ATTACK: -0.6, ActionType.BETRAY: -0.8, ActionType.COMPETE: -0.3,
    },
    "neuroticism": {
        ActionType.DEFEND: 0.7, ActionType.REST: 0.5, ActionType.OBSERVE: 0.6,
        ActionType.ATTACK: 0.4, ActionType.BETRAY: 0.3,
        ActionType.EXPLORE: -0.4, ActionType.NEGOTIATE: -0.3,
    },
}

GOAL_ACTION_MAP: dict[str, list[ActionType]] = {
    "wealth": [ActionType.GATHER, ActionType.COMPETE, ActionType.NEGOTIATE],
    "accumulate": [ActionType.GATHER, ActionType.COMPETE, ActionType.NEGOTIATE],
    "power": [ActionType.COMPETE, ActionType.ATTACK, ActionType.ALLY],
    "dominate": [ActionType.ATTACK, ActionType.COMPETE, ActionType.BETRAY],
    "knowledge": [ActionType.EXPLORE, ActionType.OBSERVE, ActionType.COMMUNICATE],
    "learn": [ActionType.EXPLORE, ActionType.OBSERVE, ActionType.COMMUNICATE],
    "peace": [ActionType.COOPERATE, ActionType.NEGOTIATE, ActionType.SHARE],
    "harmony": [ActionType.COOPERATE, ActionType.SHARE, ActionType.ALLY],
    "survive": [ActionType.GATHER, ActionType.DEFEND, ActionType.REST],
    "survival": [ActionType.GATHER, ActionType.DEFEND, ActionType.REST],
    "influence": [ActionType.NEGOTIATE, ActionType.ALLY, ActionType.COMMUNICATE],
    "friendship": [ActionType.COOPERATE, ActionType.SHARE, ActionType.COMMUNICATE],
    "revenge": [ActionType.ATTACK, ActionType.BETRAY, ActionType.COMPETE],
    "explore": [ActionType.EXPLORE, ActionType.OBSERVE, ActionType.GATHER],
    "trade": [ActionType.NEGOTIATE, ActionType.SHARE, ActionType.COOPERATE],
    "protect": [ActionType.DEFEND, ActionType.ALLY, ActionType.COOPERATE],
}

EMOTION_ACTION_MAP: dict[str, dict[ActionType, float]] = {
    "happiness": {
        ActionType.COOPERATE: 0.5, ActionType.SHARE: 0.6, ActionType.COMMUNICATE: 0.4,
        ActionType.ALLY: 0.3,
    },
    "anger": {
        ActionType.ATTACK: 0.7, ActionType.COMPETE: 0.5, ActionType.BETRAY: 0.3,
        ActionType.COOPERATE: -0.4, ActionType.SHARE: -0.3,
    },
    "fear": {
        ActionType.DEFEND: 0.7, ActionType.REST: 0.4, ActionType.OBSERVE: 0.5,
        ActionType.ATTACK: -0.5, ActionType.EXPLORE: -0.3,
    },
    "trust": {
        ActionType.COOPERATE: 0.6, ActionType.ALLY: 0.7, ActionType.SHARE: 0.5,
        ActionType.NEGOTIATE: 0.4,
        ActionType.BETRAY: -0.6, ActionType.ATTACK: -0.3,
    },
    "sadness": {
        ActionType.REST: 0.6, ActionType.OBSERVE: 0.4,
        ActionType.COMMUNICATE: -0.3, ActionType.COMPETE: -0.3,
    },
    "disgust": {
        ActionType.COMPETE: 0.3, ActionType.DEFEND: 0.3,
        ActionType.COOPERATE: -0.4, ActionType.ALLY: -0.3,
    },
}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class AgentBrain:

    def perceive(self, character: Character, state: SimulationState) -> dict:
        nearby_chars: list[dict] = []
        for cid, other in state.characters.items():
            if cid == character.id or not other.alive:
                continue
            dx = other.position["x"] - character.position["x"]
            dy = other.position["y"] - character.position["y"]
            dist = math.sqrt(dx * dx + dy * dy)

            visibility = state.config.information_symmetry
            visible = dist < 200 * visibility + 50

            if visible:
                relationship = character.relationships.get(cid, 0.0)
                belief = character.memory.beliefs.get(cid)
                nearby_chars.append({
                    "id": cid,
                    "name": other.name,
                    "distance": dist,
                    "relationship": relationship,
                    "belief": belief,
                    "last_action": other.last_action.type.value if other.last_action else None,
                    "resources_visible": {
                        k: v for k, v in other.resources.items()
                    } if visibility > 0.7 else {},
                })

        recent_events = [
            e for e in state.events
            if e.tick >= state.tick - 3 and character.id in e.participants
        ]

        nearby_locations = []
        for loc in state.environment.locations:
            dx = loc["x"] - character.position["x"]
            dy = loc["y"] - character.position["y"]
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < 150:
                nearby_locations.append({**loc, "distance": dist})

        return {
            "nearby_characters": nearby_chars,
            "recent_events": recent_events,
            "nearby_locations": nearby_locations,
            "environment_resources": state.environment.resources,
            "environment_conditions": state.environment.conditions,
            "own_resources": character.resources,
        }

    def recall_relevant_memories(self, character: Character, context: str) -> list[MemoryEntry]:
        keywords = set(context.lower().split())
        relevant: list[tuple[MemoryEntry, float]] = []

        all_memories = character.memory.short_term + character.memory.long_term
        for mem in all_memories:
            mem_words = set(mem.content.lower().split())
            overlap = len(keywords & mem_words)
            if overlap > 0:
                score = overlap * 0.3 + mem.importance * 0.7
                relevant.append((mem, score))

        relevant.sort(key=lambda x: x[1], reverse=True)
        return [m for m, _ in relevant[:10]]

    def evaluate_options(self, character: Character, perception: dict) -> list[tuple[Action, float]]:
        nearby = perception["nearby_characters"]
        options: list[tuple[Action, float]] = []

        traits = character.traits
        emotions = character.emotional_state

        for action_type in ActionType:
            base_score = 0.0

            for trait_name, action_weights in PERSONALITY_ACTION_WEIGHTS.items():
                trait_val = getattr(traits, trait_name)
                weight = action_weights.get(action_type, 0.0)
                base_score += trait_val * weight

            for emotion_name, action_weights in EMOTION_ACTION_MAP.items():
                emo_val = getattr(emotions, emotion_name, 0.0)
                weight = action_weights.get(action_type, 0.0)
                base_score += emo_val * weight * 0.5

            goal_boost = 0.0
            for goal in character.goals:
                goal_lower = goal.lower()
                for keyword, boosted_actions in GOAL_ACTION_MAP.items():
                    if keyword in goal_lower and action_type in boosted_actions:
                        goal_boost += 0.4
            base_score += goal_boost

            needs_target = action_type in {
                ActionType.COOPERATE, ActionType.COMPETE, ActionType.NEGOTIATE,
                ActionType.ALLY, ActionType.BETRAY, ActionType.ATTACK,
                ActionType.DEFEND, ActionType.SHARE, ActionType.COMMUNICATE,
            }

            if needs_target and nearby:
                for nc in nearby:
                    target_score = base_score
                    rel = nc["relationship"]

                    if action_type in {ActionType.COOPERATE, ActionType.ALLY, ActionType.SHARE, ActionType.COMMUNICATE}:
                        target_score += rel * 0.5
                    elif action_type in {ActionType.ATTACK, ActionType.BETRAY, ActionType.COMPETE}:
                        target_score -= rel * 0.4

                    belief = nc.get("belief")
                    if belief == "untrustworthy":
                        if action_type in {ActionType.COOPERATE, ActionType.ALLY, ActionType.SHARE}:
                            target_score -= 0.6
                        elif action_type in {ActionType.DEFEND, ActionType.COMPETE}:
                            target_score += 0.3
                    elif belief == "ally":
                        if action_type in {ActionType.COOPERATE, ActionType.ALLY, ActionType.SHARE}:
                            target_score += 0.4
                        elif action_type in {ActionType.ATTACK, ActionType.BETRAY}:
                            target_score -= 0.7

                    proximity_bonus = max(0, 1.0 - nc["distance"] / 200) * 0.2
                    target_score += proximity_bonus

                    detail = self._build_detail(action_type, character, nc)
                    reasoning = self._build_reasoning(action_type, character, nc, target_score)

                    options.append((
                        Action(type=action_type, target_id=nc["id"], detail=detail, reasoning=reasoning),
                        target_score,
                    ))

            elif not needs_target:
                energy = character.resources.get("energy", 50)
                if action_type == ActionType.REST and energy < 40:
                    base_score += 0.5
                elif action_type == ActionType.GATHER:
                    if any(v < 30 for v in character.resources.values()):
                        base_score += 0.4

                detail = self._build_solo_detail(action_type, character, perception)
                reasoning = self._build_solo_reasoning(action_type, character, base_score)
                options.append((
                    Action(type=action_type, detail=detail, reasoning=reasoning),
                    base_score,
                ))

        return options

    def decide(self, character: Character, state: SimulationState) -> Action:
        perception = self.perceive(character, state)

        context_parts = []
        for nc in perception["nearby_characters"]:
            context_parts.append(nc["name"])
        for evt in perception["recent_events"]:
            context_parts.append(evt.title)
        context = " ".join(context_parts)

        memories = self.recall_relevant_memories(character, context)
        memory_influence = {}
        for mem in memories:
            for char_id in mem.related_characters:
                if char_id not in memory_influence:
                    memory_influence[char_id] = 0.0
                if any(w in mem.content.lower() for w in ["betray", "attack", "stole", "lied"]):
                    memory_influence[char_id] -= 0.3
                elif any(w in mem.content.lower() for w in ["helped", "cooperat", "shared", "ally"]):
                    memory_influence[char_id] += 0.2

        options = self.evaluate_options(character, perception)

        for i, (action, score) in enumerate(options):
            if action.target_id and action.target_id in memory_influence:
                adjustment = memory_influence[action.target_id]
                if action.type in {ActionType.COOPERATE, ActionType.ALLY, ActionType.SHARE}:
                    score += adjustment
                elif action.type in {ActionType.ATTACK, ActionType.BETRAY, ActionType.COMPETE}:
                    score -= adjustment
                options[i] = (action, score)

        randomness = state.config.randomness
        rng = random.Random(hash((character.id, state.tick)))
        for i, (action, score) in enumerate(options):
            noise = rng.gauss(0, randomness * 0.5)
            options[i] = (action, score + noise)

        if not options:
            return Action(type=ActionType.OBSERVE, detail="Nothing to do", reasoning="No options available")

        options.sort(key=lambda x: x[1], reverse=True)

        temperature = 0.3 + randomness * 0.7
        top_n = max(1, min(5, len(options)))
        candidates = options[:top_n]

        weights = []
        max_score = candidates[0][1]
        for _, score in candidates:
            w = math.exp((score - max_score) / max(temperature, 0.01))
            weights.append(w)

        total = sum(weights)
        weights = [w / total for w in weights]

        r = rng.random()
        cumulative = 0.0
        chosen = candidates[0][0]
        for (action, _), w in zip(candidates, weights):
            cumulative += w
            if r <= cumulative:
                chosen = action
                break

        character.last_action = chosen
        character.last_reasoning = chosen.reasoning
        return chosen

    def update_emotions(self, character: Character, events: list[Event]):
        emo = character.emotional_state
        decay = 0.05

        emo.happiness = _clamp(emo.happiness * (1 - decay), -1, 1)
        emo.anger = _clamp(emo.anger * (1 - decay), -1, 1)
        emo.fear = _clamp(emo.fear * (1 - decay), -1, 1)
        emo.trust = _clamp(emo.trust * (1 - decay), -1, 1)
        emo.surprise = _clamp(emo.surprise * (1 - decay * 3), -1, 1)
        emo.sadness = _clamp(emo.sadness * (1 - decay), -1, 1)
        emo.disgust = _clamp(emo.disgust * (1 - decay), -1, 1)

        for event in events:
            if character.id not in event.participants:
                continue

            if event.type == EventType.ALLIANCE_FORMED:
                emo.happiness = _clamp(emo.happiness + 0.2, -1, 1)
                emo.trust = _clamp(emo.trust + 0.3, -1, 1)
            elif event.type == EventType.CONFLICT:
                is_winner = any("wins" in o and character.name in o for o in event.outcomes)
                if is_winner:
                    emo.happiness = _clamp(emo.happiness + 0.15, -1, 1)
                else:
                    emo.anger = _clamp(emo.anger + 0.3, -1, 1)
                    emo.sadness = _clamp(emo.sadness + 0.15, -1, 1)
                emo.fear = _clamp(emo.fear + 0.1, -1, 1)
            elif event.type == EventType.NEGOTIATION:
                emo.trust = _clamp(emo.trust + 0.1, -1, 1)
            elif event.type == EventType.RESOURCE_CHANGE:
                gained = any("gained" in o or "received" in o for o in event.outcomes)
                lost = any("lost" in o or "depleted" in o for o in event.outcomes)
                if gained:
                    emo.happiness = _clamp(emo.happiness + 0.1, -1, 1)
                if lost:
                    emo.sadness = _clamp(emo.sadness + 0.15, -1, 1)
                    emo.fear = _clamp(emo.fear + 0.05, -1, 1)
            elif event.type == EventType.EMERGENT:
                emo.surprise = _clamp(emo.surprise + 0.4, -1, 1)
            elif event.type == EventType.INTERACTION:
                positive = any(w in event.description.lower() for w in ["cooperate", "share", "help", "ally"])
                negative = any(w in event.description.lower() for w in ["betray", "attack", "steal", "compete"])
                if positive:
                    emo.happiness = _clamp(emo.happiness + 0.1, -1, 1)
                    emo.trust = _clamp(emo.trust + 0.1, -1, 1)
                if negative:
                    emo.anger = _clamp(emo.anger + 0.15, -1, 1)
                    emo.trust = _clamp(emo.trust - 0.15, -1, 1)

            if event.type in {EventType.CONFLICT, EventType.EMERGENT}:
                neuroticism = character.traits.neuroticism
                emo.fear = _clamp(emo.fear + neuroticism * 0.15, -1, 1)
                emo.anger = _clamp(emo.anger + neuroticism * 0.1, -1, 1)

    def consolidate_memory(self, character: Character, events: list[Event], tick: int):
        for event in events:
            if character.id not in event.participants:
                continue

            entry = MemoryEntry(
                tick=tick,
                content=f"{event.title}: {event.description}",
                importance=event.importance,
                related_characters=[p for p in event.participants if p != character.id],
                emotional_context=character.emotional_state.model_copy(),
            )
            character.memory.short_term.append(entry)

        if len(character.memory.short_term) > 20:
            character.memory.short_term.sort(key=lambda m: m.importance, reverse=True)
            to_promote = character.memory.short_term[:5]
            character.memory.long_term.extend(to_promote)
            character.memory.short_term = character.memory.short_term[5:20]

        betrayal_counts: dict[str, int] = {}
        cooperation_counts: dict[str, int] = {}
        all_memories = character.memory.short_term + character.memory.long_term

        for mem in all_memories:
            for char_id in mem.related_characters:
                if any(w in mem.content.lower() for w in ["betray", "attack", "stole", "lied", "backstab"]):
                    betrayal_counts[char_id] = betrayal_counts.get(char_id, 0) + 1
                if any(w in mem.content.lower() for w in ["cooperat", "shared", "helped", "ally", "alliance"]):
                    cooperation_counts[char_id] = cooperation_counts.get(char_id, 0) + 1

        for char_id, count in betrayal_counts.items():
            if count >= 3:
                character.memory.beliefs[char_id] = "untrustworthy"
            elif count >= 2 and cooperation_counts.get(char_id, 0) < count:
                character.memory.beliefs[char_id] = "suspicious"

        for char_id, count in cooperation_counts.items():
            if count >= 3 and betrayal_counts.get(char_id, 0) == 0:
                character.memory.beliefs[char_id] = "ally"
            elif count >= 2 and betrayal_counts.get(char_id, 0) == 0:
                character.memory.beliefs[char_id] = "friendly"

    def _build_detail(self, action_type: ActionType, character: Character, nc: dict) -> str:
        name = nc["name"]
        match action_type:
            case ActionType.COOPERATE:
                return f"Working together with {name} on a shared objective"
            case ActionType.COMPETE:
                return f"Competing against {name} for resources"
            case ActionType.NEGOTIATE:
                return f"Proposing a deal to {name}"
            case ActionType.ALLY:
                return f"Forming an alliance with {name}"
            case ActionType.BETRAY:
                return f"Betraying {name}'s trust for personal gain"
            case ActionType.ATTACK:
                return f"Attacking {name}"
            case ActionType.DEFEND:
                return f"Defending against {name}"
            case ActionType.SHARE:
                return f"Sharing resources with {name}"
            case ActionType.COMMUNICATE:
                return f"Exchanging information with {name}"
            case _:
                return f"Interacting with {name}"

    def _build_solo_detail(self, action_type: ActionType, character: Character, perception: dict) -> str:
        match action_type:
            case ActionType.EXPLORE:
                locs = perception.get("nearby_locations", [])
                if locs:
                    return f"Exploring toward {locs[0]['name']}"
                return "Venturing into unknown territory"
            case ActionType.REST:
                return "Resting to recover energy"
            case ActionType.GATHER:
                return "Gathering resources from the environment"
            case ActionType.OBSERVE:
                return "Carefully observing surroundings"
            case _:
                return f"Performing {action_type.value}"

    def _build_reasoning(self, action_type: ActionType, character: Character, nc: dict, score: float) -> str:
        parts = []
        rel = nc["relationship"]
        belief = nc.get("belief")

        if rel > 0.3:
            parts.append(f"positive relationship with {nc['name']} ({rel:.1f})")
        elif rel < -0.3:
            parts.append(f"negative relationship with {nc['name']} ({rel:.1f})")

        if belief:
            parts.append(f"believes {nc['name']} is {belief}")

        dominant_trait = max(
            ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
            key=lambda t: getattr(character.traits, t),
        )
        parts.append(f"driven by high {dominant_trait}")

        if character.goals:
            parts.append(f"pursuing goal: {character.goals[0]}")

        return f"Chose to {action_type.value} because: {', '.join(parts)}. Score: {score:.2f}"

    def _build_solo_reasoning(self, action_type: ActionType, character: Character, score: float) -> str:
        parts = []
        energy = character.resources.get("energy", 50)
        if energy < 40:
            parts.append("low energy")
        if character.goals:
            parts.append(f"pursuing: {character.goals[0]}")

        dominant_trait = max(
            ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
            key=lambda t: getattr(character.traits, t),
        )
        parts.append(f"personality: high {dominant_trait}")

        ctx = ", ".join(parts) if parts else "general assessment"
        return f"Chose to {action_type.value} based on {ctx}. Score: {score:.2f}"
