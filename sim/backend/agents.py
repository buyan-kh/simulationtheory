import math
import random
from models import (
    Character, SimulationState, Action, ActionType, Event, EventType,
    MemoryEntry, EmotionalState, ChatMessage,
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


DIALOGUE_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "cooperate": {
        "friendly": [
            "Hey {target}, let's team up! Together we're unstoppable.",
            "I've been thinking, {target}... we could accomplish a lot more side by side.",
            "{target}, what do you say we pool our efforts? I think we'd make a great team.",
            "You know what, {target}? I trust you. Let's work together on this.",
            "Two heads are better than one, right {target}? Let's do this!",
            "I'd love to work with you, {target}. I think we complement each other well.",
            "{target}! Perfect timing. I was just thinking we should join forces.",
            "There's strength in numbers, {target}. Shall we?",
        ],
        "hostile": [
            "Fine, {target}. I'll work with you. But don't think this makes us friends.",
            "Listen, {target}, I don't like this any more than you do. But we need each other right now.",
            "Temporary arrangement, {target}. The moment this is done, we go our separate ways.",
            "Don't get comfortable, {target}. This alliance is purely practical.",
            "I'm working with you, {target}. Not for you. Remember that.",
            "{target}, I'll cooperate. But cross me and you'll regret it.",
        ],
        "nervous": [
            "Um, {target}? I-I was hoping maybe we could... work together?",
            "I know this might be weird, {target}, but I think we should cooperate...",
            "Please don't say no, {target}... I really think we need each other right now.",
            "{target}, I'm not good at this, but... partners?",
            "I hope I'm not overstepping, {target}, but would you consider working together?",
        ],
        "excited": [
            "Oh this is gonna be GREAT, {target}! You and me, taking on the world!",
            "{target}!! Let's do this! I've got so many ideas for us!",
            "YES! {target}, I was hoping you'd be up for teaming up! Let's GO!",
            "This is the best decision ever, {target}! We're gonna crush it together!",
            "{target}, you won't regret this! I promise we'll be an incredible team!",
        ],
        "formal": [
            "I propose a collaborative arrangement, {target}. One that serves both our interests.",
            "{target}, I believe a structured cooperation would benefit us mutually.",
            "If you're amenable, {target}, I'd like to formalize a working relationship.",
            "{target}, the logical course of action is cooperation. Shall we proceed?",
            "I've analyzed our situation, {target}. Cooperation yields the optimal outcome for both parties.",
        ],
    },
    "attack": {
        "aggressive": [
            "This ends now, {target}!",
            "You've pushed me too far, {target}. Defend yourself!",
            "Prepare yourself, {target}!",
            "I've had enough of you, {target}. Time to settle this!",
            "You want a fight, {target}? You've got one!",
            "No more games, {target}. This is it!",
            "You brought this on yourself, {target}!",
            "{target}! Face me, you coward!",
        ],
        "nervous": [
            "I-I have to do this, {target}... I'm sorry.",
            "Don't make this harder than it needs to be...",
            "I wish there was another way, {target}... but there isn't.",
            "Forgive me, {target}. I have no choice.",
            "My hands are shaking, but I have to do this, {target}...",
            "I don't want to hurt you, {target}, but you leave me no choice...",
        ],
        "sarcastic": [
            "Oh {target}, this is going to be fun. For me, anyway.",
            "Nothing personal, {target}. Well, maybe a little personal.",
            "Let's see how tough you really are, {target}. My bet? Not very.",
            "Sorry {target}, but someone has to put you in your place.",
            "Don't worry, {target}. This will only hurt... a lot.",
            "{target}, you should've stayed out of my way. Rookie mistake.",
        ],
        "threatening": [
            "Last chance to walk away, {target}. You won't get another.",
            "I'm going to make an example of you, {target}.",
            "Everyone will know what happens when you cross me, {target}.",
            "{target}, remember this moment. It's the last time you'll feel safe.",
            "I warned you, {target}. Now you'll see what I'm capable of.",
            "You should be afraid, {target}. Very afraid.",
        ],
        "cold": [
            "Nothing personal, {target}.",
            "This is simply necessary, {target}.",
            "I take no pleasure in this, {target}. It's just business.",
            "{target}. This was inevitable.",
            "You were always going to end up here, {target}. Accept it.",
        ],
    },
    "betray": {
        "sarcastic": [
            "Sorry {target}, nothing personal... actually, it kind of is.",
            "Did you really think I was your friend, {target}? How naive.",
            "Surprise, {target}! Bet you didn't see this coming.",
            "Oh {target}, you made this too easy. Trusting me was your first mistake.",
            "Thanks for everything, {target}. Really. I couldn't have done this without you.",
            "Here's a life lesson, {target}: trust no one. Especially me.",
        ],
        "nervous": [
            "F-forgive me, {target}... I had no choice.",
            "I didn't want it to come to this, {target}...",
            "Please understand, {target}... I did what I had to do.",
            "I'm sorry, {target}. I'm so, so sorry. But I need to survive.",
            "You'll hate me, {target}. I know. But I can't... I just can't keep going like this.",
            "Don't look at me like that, {target}... please...",
        ],
        "hostile": [
            "You were a fool to trust me, {target}.",
            "This is what happens when you let your guard down, {target}.",
            "You thought we were allies, {target}? Think again.",
            "I never needed you, {target}. You were just a stepping stone.",
            "Goodbye, {target}. You served your purpose.",
            "Consider this a lesson, {target}. The strong survive.",
        ],
        "cold": [
            "Our arrangement has run its course, {target}.",
            "I calculated the odds, {target}. This was the logical move.",
            "Sentiment is a weakness, {target}. One I can't afford.",
            "Don't take it personally, {target}. It's just survival.",
            "I weighed our alliance against my interests, {target}. You lost.",
        ],
    },
    "negotiate": {
        "friendly": [
            "Let's talk this out, {target}. I'm sure we can find common ground.",
            "Hey {target}, I think if we put our heads together, we can make a deal that works for both of us.",
            "{target}, I'd rather solve this with words than anything else. What do you think?",
            "There's gotta be a win-win here, {target}. Let's figure it out.",
            "I come in peace, {target}. Let's negotiate like civilized folks.",
            "What if we could both walk away happy, {target}? Hear me out.",
        ],
        "formal": [
            "I propose an arrangement, {target}. One that benefits us both.",
            "{target}, I would like to discuss terms for a mutually beneficial agreement.",
            "Let us be pragmatic, {target}. I have a proposition worth your consideration.",
            "I've prepared an offer, {target}. I believe you'll find the terms favorable.",
            "{target}, diplomacy is the mark of wisdom. Shall we negotiate?",
            "I request a formal discussion, {target}. There is much to gain on both sides.",
        ],
        "cautious": [
            "I'd like to talk, {target}. But let's set some ground rules first.",
            "{target}, I'm willing to negotiate, but I need assurances.",
            "Before we discuss terms, {target}, I need to know I can trust you.",
            "Let's proceed carefully here, {target}. Too much is at stake for hasty deals.",
            "I have a proposal, {target}. But I want to be clear about expectations.",
        ],
        "strategic": [
            "I have something you need, {target}. And you have something I want.",
            "Let's be real, {target}. We both know what's at stake. So let's deal.",
            "{target}, I think you'll find my terms... very motivating.",
            "Here's the situation, {target}: cooperation serves us both. Resistance serves neither.",
            "Think of this as an investment, {target}. We both stand to profit.",
            "I'm offering you a lifeline, {target}. I suggest you take it.",
        ],
    },
    "ally": {
        "excited": [
            "An alliance! {target}, this is going to be legendary!",
            "{target}!! We're going to be unstoppable together!",
            "You and me, {target}! Best alliance this world has ever seen!",
            "I can't believe it, {target}! We're actually doing this! ALLIES!",
            "This is the start of something incredible, {target}!",
            "Partners! {target}, I've been hoping for this!",
        ],
        "cautious": [
            "I'd like to propose we join forces, {target}. Cautiously.",
            "An alliance could work, {target}. But we need clear boundaries.",
            "I'm willing to ally with you, {target}. But let's take this slow.",
            "{target}, I think an alliance serves our mutual interests. Carefully managed.",
            "Trust is earned, {target}. But I'm willing to start building it.",
            "Let's try this, {target}. One step at a time.",
        ],
        "friendly": [
            "I'd be honored to call you my ally, {target}.",
            "What do you say, {target}? Watch each other's backs?",
            "{target}, there's nobody I'd rather have at my side.",
            "I think this could be the beginning of a beautiful alliance, {target}.",
            "You've earned my respect, {target}. Let's make it official.",
            "Friends protect friends, {target}. Let's be allies.",
        ],
        "formal": [
            "I propose a formal alliance, {target}. With clear terms and mutual obligations.",
            "{target}, I believe a strategic partnership would serve us both well.",
            "An alliance is the wisest course, {target}. Shall we formalize it?",
            "I extend a formal offer of alliance, {target}. Let us unite our strengths.",
            "{target}, together we command greater influence. A formal pact is in order.",
        ],
    },
    "explore": {
        "curious": [
            "*I wonder what lies beyond that ridge...*",
            "*Something feels different about this area. I need to investigate.*",
            "*What secrets are hidden out here? Only one way to find out.*",
            "*There's so much of this world I haven't seen yet...*",
            "*Curiosity may have killed the cat, but I'm not a cat.*",
            "*The unknown calls to me. What wonders await?*",
        ],
        "adventurous": [
            "*Time to venture into the unknown. Nothing ventured, nothing gained.*",
            "*Adventure awaits! Let's see what's out there.*",
            "*The wilderness calls, and I must answer.*",
            "*Every step into the unknown is a step toward discovery.*",
            "*Fortune favors the bold. Time to explore.*",
            "*New horizons ahead. Let's push further.*",
        ],
        "philosophical": [
            "*The map is not the territory. Time to learn the land firsthand.*",
            "*To explore is to live. Stagnation is a slow death.*",
            "*What lies beyond the edge of the known? Perhaps meaning itself.*",
            "*Each journey changes the traveler. Who will I be when I return?*",
            "*The world is vast and full of mystery. How can I sit still?*",
        ],
        "nervous": [
            "*I don't know what's out there... but I have to look.*",
            "*Every noise makes me jump. But I need to keep moving.*",
            "*Please let this path be safe... please...*",
            "*My heart pounds with every step. But I can't stay put forever.*",
            "*Into the unknown... alone. Deep breaths...*",
        ],
    },
    "rest": {
        "tired": [
            "*I need to catch my breath... these past turns have been exhausting.*",
            "*Just... a few minutes. Just need to close my eyes...*",
            "*My body aches. I can't keep going without rest.*",
            "*Sleep. I need sleep. Everything else can wait.*",
            "*I've pushed myself too hard. Time to recover.*",
            "*Even warriors need rest. No shame in that.*",
        ],
        "relieved": [
            "*Finally, a moment of peace. I earned this.*",
            "*The quiet is nice for a change. Let me enjoy it.*",
            "*No threats, no decisions, just... rest. Bliss.*",
            "*I can feel my strength returning already.*",
            "*A calm moment in the storm. I'll take it.*",
        ],
        "anxious": [
            "*I should be doing something... but I can barely stand.*",
            "*Resting feels wrong when there's so much at stake...*",
            "*Am I wasting time? No... no, I need this.*",
            "*What if something happens while I'm resting? What if—no. Rest.*",
            "*I can't afford to rest, but I can't afford not to either.*",
        ],
    },
    "gather": {
        "focused": [
            "*Resources are getting scarce. Better stock up while I can.*",
            "*Need to be methodical about this. Every bit counts.*",
            "*Focus. Gather what's needed. Stay efficient.*",
            "*The more I gather now, the better off I'll be later.*",
            "*One resource at a time. Stay disciplined.*",
            "*Supply lines are everything. Time to build mine up.*",
        ],
        "determined": [
            "*I won't go hungry. Not today, not ever.*",
            "*Whatever it takes, I'm getting what I need to survive.*",
            "*Scarcity won't defeat me. I'll find a way.*",
            "*Every resource gathered is another day I survive.*",
            "*I refuse to be caught unprepared.*",
        ],
        "anxious": [
            "*Running low on everything... this is bad.*",
            "*Please let there be enough. Please...*",
            "*If I don't find resources soon, I'm in real trouble.*",
            "*The others have more than me. I need to catch up, fast.*",
            "*Scraping together whatever I can find. It's barely enough.*",
        ],
    },
    "observe": {
        "analytical": [
            "*Interesting... {target} seems to be making alliances. I should keep watch.*",
            "*Patterns. Everything has patterns. I just need to read them.*",
            "*Let me assess the situation before making any moves.*",
            "*Knowledge is power. And right now, I'm gathering plenty of it.*",
            "*Everyone thinks they're being subtle. They're not. I see everything.*",
            "*The dynamics are shifting. I need to understand how before I act.*",
        ],
        "curious": [
            "*What are they up to over there? Something's going on...*",
            "*I need to understand what's happening before I get involved.*",
            "*There's more to this situation than meets the eye.*",
            "*Fascinating... the way they interact tells me so much.*",
            "*If I watch carefully enough, the truth always reveals itself.*",
        ],
        "paranoid": [
            "*They're plotting something. I can feel it.*",
            "*I don't trust any of them. Best to watch from a distance.*",
            "*Everyone has an angle. I need to figure out theirs.*",
            "*Something isn't right. I need to stay alert.*",
            "*Are they watching me too? I need to be careful.*",
            "*Trust no one. Observe everyone.*",
        ],
    },
    "communicate": {
        "friendly": [
            "{target}! Good to see you. What news do you bring?",
            "Hey {target}, got a minute? I wanted to catch up.",
            "{target}, I've been meaning to talk to you! How are things?",
            "There you are, {target}! I was hoping we'd cross paths.",
            "Always good to see a familiar face, {target}. What's on your mind?",
            "Let's chat, {target}. It's been too long since we talked.",
        ],
        "suspicious": [
            "What do you want, {target}? And don't bother lying to me.",
            "Talk, {target}. But choose your words carefully.",
            "I have questions, {target}. And you'd better have honest answers.",
            "Don't think I don't know what you've been up to, {target}.",
            "{target}. We need to talk. And I want the truth.",
            "I've been watching you, {target}. Care to explain yourself?",
        ],
        "excited": [
            "{target}! You won't believe what I've discovered!",
            "Oh {target}, I have SO much to tell you!",
            "Quick, {target}! I've got incredible news!",
            "{target}!! Come here, I need to share something amazing!",
            "Wait till you hear this, {target}! This changes everything!",
        ],
        "formal": [
            "A word, {target}, if you have a moment.",
            "I wish to discuss a matter of importance with you, {target}.",
            "{target}, there are developments we should address.",
            "Might I have a moment of your time, {target}?",
            "I believe we have matters to discuss, {target}.",
        ],
    },
    "share": {
        "generous": [
            "Here, {target}, take some of my supplies. We look out for each other.",
            "You look like you could use this, {target}. No strings attached.",
            "{target}, take this. I've got more than I need right now.",
            "I'd rather share than hoard, {target}. Here you go.",
            "What's mine is yours, {target}. We're in this together.",
            "I want you to have this, {target}. Everyone deserves a fair share.",
        ],
        "strategic": [
            "Consider this a gift, {target}. And gifts... are remembered.",
            "I'm investing in our relationship, {target}. Take these resources.",
            "A little generosity goes a long way, {target}. Remember this.",
            "Think of this as a down payment on future cooperation, {target}.",
            "I'm sharing this with you, {target}. I trust you'll return the favor someday.",
            "Take this, {target}. Let's just say... you'll owe me one.",
        ],
        "warm": [
            "You've been so kind, {target}. Let me give something back.",
            "Seeing you struggle hurts, {target}. Please, take these.",
            "Friends share, {target}. And I consider you a friend.",
            "I couldn't enjoy my surplus knowing you're in need, {target}.",
            "It makes me happy to share with you, {target}. Truly.",
        ],
        "reluctant": [
            "Fine, {target}. Take some. But don't make a habit of asking.",
            "Here. Don't say I never gave you anything, {target}.",
            "I suppose I can spare a little, {target}. Just this once.",
            "Against my better judgment, {target}. Here. Take it.",
            "You need this more than me. For now, {target}. Just for now.",
        ],
    },
    "defend": {
        "brave": [
            "I won't let you through, {target}! Stand down!",
            "You want a fight? You'll have to go through me, {target}!",
            "I'll defend this ground with everything I have!",
            "Come at me, {target}! I'm not afraid of you!",
            "Not one step further, {target}! I stand my ground!",
            "I won't back down. Not now, not ever!",
        ],
        "scared": [
            "*Stay calm... stay calm... I just need to hold this position...*",
            "*They're coming. Oh no, they're coming. I have to be brave...*",
            "*My hands are trembling. But I can't let them see my fear.*",
            "*Just hold the line. That's all I have to do. Hold the line...*",
            "*I'm terrified. But running would be worse.*",
            "*Please don't attack... please just go away...*",
        ],
        "determined": [
            "This is my ground, {target}. You won't take it from me.",
            "I've worked too hard to lose everything now. I'll defend what's mine.",
            "You underestimate my resolve, {target}. I will not yield.",
            "Every inch of this territory was earned. I'll defend every inch.",
            "I didn't come this far to fall now. Bring it on.",
        ],
        "angry": [
            "Try me, {target}! I dare you!",
            "You think you can take what's mine?! Over my dead body!",
            "Come on then, {target}! Let's see what you've got!",
            "I'm done being pushed around! Nobody touches what's mine!",
            "You picked the wrong target, {target}!",
        ],
    },
    "compete": {
        "competitive": [
            "May the best one win, {target}!",
            "Let's see what you're made of, {target}! Game on!",
            "I've been looking forward to this, {target}. A real challenge!",
            "Competition brings out the best in us, {target}. Let's go!",
            "Ready to test your limits, {target}? Because I'm ready to test mine!",
            "This should be interesting, {target}. Show me what you've got!",
        ],
        "trash_talk": [
            "You don't stand a chance, {target}. Might as well give up now.",
            "Oh please, {target}. I could do this in my sleep.",
            "This is going to be embarrassing for you, {target}.",
            "I almost feel bad for you, {target}. Almost.",
            "Save yourself the humiliation, {target}. Just walk away.",
            "You? Against me, {target}? That's adorable.",
        ],
        "determined": [
            "I'm going to win this, {target}. I have to.",
            "Everything's on the line, {target}. I won't lose.",
            "This competition means everything to me. I'll give it my all.",
            "I've prepared for this moment, {target}. Have you?",
            "Victory or nothing, {target}. That's my only option.",
        ],
        "playful": [
            "Race you to the top, {target}! Last one there's a rotten egg!",
            "Friendly competition, {target}! No hard feelings, win or lose?",
            "Let's make it interesting, {target}! What do you say?",
            "I bet I can outdo you, {target}! Wanna find out?",
            "This is gonna be fun, {target}! May the best competitor win!",
        ],
    },
}

REACTION_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "won_conflict": {
        "proud": [
            "That'll teach you to mess with me.",
            "And let that be a lesson to anyone else who tries.",
            "Victory. As expected.",
            "Don't ever challenge me again.",
            "I told you this would happen.",
            "Another victory added to the record.",
        ],
        "relieved": [
            "*Phew... that was close.*",
            "*Thank goodness... I barely made it.*",
            "*I won, but it cost me. I need to be more careful.*",
            "*That could have gone either way. I got lucky.*",
            "*My heart is still racing. But I survived.*",
        ],
        "humble": [
            "*I didn't want it to come to this, but I had to protect myself.*",
            "*No pleasure in this victory. Only necessity.*",
            "*I hope they're okay. I didn't want to hurt anyone.*",
            "*Winning doesn't feel as good as I thought it would.*",
        ],
    },
    "lost_conflict": {
        "angry": [
            "This isn't over, {target}...",
            "You got lucky, {target}. Next time will be different.",
            "I'll remember this, {target}. And I won't forget.",
            "Enjoy your victory, {target}. It won't last.",
            "Mark my words, {target}. I'll be back.",
        ],
        "defeated": [
            "*I need to get stronger...*",
            "*How did I lose? What went wrong?*",
            "*Maybe I'm not cut out for this...*",
            "*Everything hurts. My pride most of all.*",
            "*I have to pick myself up. Can't stay down forever.*",
        ],
        "scared": [
            "*I can't go through that again. I need to avoid conflict.*",
            "*They're too strong. I'm in over my head.*",
            "*I need allies. I can't survive alone against that.*",
            "*If they come back, I don't know if I'll make it.*",
        ],
    },
    "was_betrayed": {
        "furious": [
            "I TRUSTED you, {target}!!",
            "You traitor! I'll make you pay for this, {target}!",
            "How could you, {target}?! After everything we've been through!",
            "You're dead to me, {target}. DEAD!",
            "I should have known, {target}! I should have KNOWN!",
            "Betrayal. The worst crime there is. And you'll answer for it, {target}.",
        ],
        "heartbroken": [
            "*I should have known... I should have known...*",
            "*Why, {target}? I thought we were friends...*",
            "*The trust is gone. It's all gone.*",
            "*Everyone leaves. Everyone betrays. Why did I think this time would be different?*",
            "*My heart aches more than my wounds...*",
        ],
        "cold": [
            "Noted, {target}. I won't make this mistake twice.",
            "*File that under 'lessons learned.' Trust no one.*",
            "Interesting, {target}. Very interesting. I'll remember this.",
            "*Fool me once, shame on you. There won't be a second time.*",
            "*Emotion clouded my judgment. That ends now.*",
        ],
    },
    "alliance_formed": {
        "excited": [
            "Together, we'll be unstoppable!",
            "This alliance changes everything! I can feel it!",
            "Best decision I've ever made!",
            "The others don't stand a chance against us now!",
            "Our combined strength is going to reshape everything!",
        ],
        "cautious": [
            "*Finally, someone I can count on. I hope.*",
            "*An ally. Good. But I'll keep my guard up, just in case.*",
            "*Trust, but verify. That's my approach to this alliance.*",
            "*This could be the turning point. Or the biggest mistake of my life.*",
        ],
        "warm": [
            "*It feels good to not be alone anymore.*",
            "*Having someone at my side gives me hope.*",
            "*Maybe things will be okay after all. Together, we're strong.*",
            "*A friend in this harsh world. That's worth more than gold.*",
        ],
    },
    "resource_crisis": {
        "panicked": [
            "*Food is running low... this could get ugly.*",
            "*We're running out of everything. I need to act fast!*",
            "*This is bad. This is really, really bad.*",
            "*If resources don't recover soon, it's going to be every person for themselves.*",
            "*Scarcity breeds desperation. And desperate people are dangerous.*",
        ],
        "determined": [
            "*Tight times call for tough decisions. I'll make it through.*",
            "*Scarcity won't break me. I've survived worse.*",
            "*Time to ration everything. Every bit counts now.*",
            "*The strong adapt. I will adapt.*",
        ],
        "scheming": [
            "*When resources are scarce, opportunity knocks for the clever.*",
            "*Others will panic. I'll capitalize.*",
            "*Scarcity means leverage. And I intend to have plenty.*",
            "*Time to see who's really prepared. Spoiler: it's me.*",
        ],
    },
    "successful_cooperation": {
        "happy": [
            "See? Working together pays off!",
            "That went even better than I hoped! Great teamwork!",
            "*This is how it should be. Cooperation over conflict.*",
            "Together we accomplished what neither of us could alone!",
            "I knew teaming up was the right call!",
        ],
        "grateful": [
            "Thank you for working with me, {target}. It means a lot.",
            "*I'm glad I'm not alone in this.*",
            "We make a good team, {target}. I appreciate you.",
            "*Not everyone would have cooperated. {target} is good people.*",
        ],
    },
    "failed_negotiation": {
        "frustrated": [
            "*That negotiation went nowhere. What a waste of time.*",
            "You're making a mistake by not dealing with me, {target}.",
            "*Diplomacy failed. Time to consider other options.*",
            "*I extended an olive branch and got nothing. Fine.*",
        ],
        "philosophical": [
            "*Not every negotiation succeeds. But the attempt itself has value.*",
            "*They weren't ready to deal. Perhaps next time.*",
            "*Patience. The right deal will come eventually.*",
        ],
    },
}


class DialogueGenerator:

    def _get_tone(self, character: Character) -> str:
        emo = character.emotional_state
        traits = character.traits

        if emo.anger > 0.5:
            if traits.agreeableness > 0.6:
                return "frustrated"
            return "aggressive"
        if emo.fear > 0.5:
            return "nervous"
        if emo.happiness > 0.5:
            if traits.extraversion > 0.6:
                return "excited"
            return "friendly"
        if emo.sadness > 0.4:
            return "sad"
        if emo.trust < -0.3:
            if traits.agreeableness < 0.4:
                return "hostile"
            return "suspicious"
        if emo.trust > 0.3:
            return "friendly"

        if traits.agreeableness > 0.7:
            return "friendly"
        if traits.agreeableness < 0.3:
            return "hostile"
        if traits.neuroticism > 0.7:
            return "nervous"
        if traits.extraversion > 0.7:
            return "excited"
        if traits.openness > 0.7:
            return "curious"
        if traits.conscientiousness > 0.7:
            return "formal"

        return "neutral"

    def _pick_template(self, action_type: str, tone: str, has_target: bool) -> str | None:
        templates = DIALOGUE_TEMPLATES.get(action_type, {})
        if not templates:
            return None

        if tone in templates:
            return random.choice(templates[tone])

        tone_map = {
            "aggressive": ["hostile", "angry", "threatening"],
            "hostile": ["aggressive", "cold", "sarcastic"],
            "nervous": ["scared", "anxious", "cautious"],
            "friendly": ["warm", "generous", "happy"],
            "excited": ["friendly", "competitive", "playful"],
            "suspicious": ["cautious", "paranoid", "cold"],
            "sad": ["defeated", "heartbroken", "tired"],
            "frustrated": ["angry", "hostile", "determined"],
            "curious": ["analytical", "philosophical", "adventurous"],
            "formal": ["strategic", "analytical", "cautious"],
            "neutral": ["friendly", "formal", "cautious", "determined"],
            "cold": ["hostile", "formal", "strategic"],
            "warm": ["friendly", "generous", "happy"],
        }

        fallbacks = tone_map.get(tone, [])
        for fb in fallbacks:
            if fb in templates:
                return random.choice(templates[fb])

        all_options = []
        for t_list in templates.values():
            all_options.extend(t_list)
        if all_options:
            return random.choice(all_options)
        return None

    def _pick_reaction_template(self, reaction_type: str, tone: str) -> str | None:
        templates = REACTION_TEMPLATES.get(reaction_type, {})
        if not templates:
            return None

        if tone in templates:
            return random.choice(templates[tone])

        tone_map = {
            "aggressive": ["angry", "furious"],
            "hostile": ["angry", "furious", "cold"],
            "nervous": ["scared", "panicked", "defeated"],
            "friendly": ["happy", "warm", "grateful", "excited"],
            "excited": ["happy", "proud", "excited"],
            "suspicious": ["cautious", "cold", "scheming"],
            "sad": ["defeated", "heartbroken"],
            "frustrated": ["angry", "determined"],
            "curious": ["philosophical", "cautious"],
            "formal": ["cold", "cautious", "determined"],
            "neutral": ["relieved", "cautious", "determined"],
            "cold": ["cold", "determined"],
            "warm": ["happy", "grateful", "warm"],
        }

        fallbacks = tone_map.get(tone, [])
        for fb in fallbacks:
            if fb in templates:
                return random.choice(templates[fb])

        all_options = []
        for t_list in templates.values():
            all_options.extend(t_list)
        if all_options:
            return random.choice(all_options)
        return None

    def generate_action_dialogue(
        self, character: Character, action: Action, target: Character | None, state: SimulationState
    ) -> ChatMessage | None:
        rng = random.Random(hash(("dialogue", character.id, state.tick)))

        solo_actions = {ActionType.EXPLORE, ActionType.REST, ActionType.GATHER, ActionType.OBSERVE}
        is_solo = action.type in solo_actions

        if is_solo:
            if rng.random() > 0.7:
                return None
        else:
            if rng.random() > 0.85:
                return None

        tone = self._get_tone(character)
        action_key = action.type.value
        template = self._pick_template(action_key, tone, target is not None)
        if not template:
            return None

        target_name = target.name if target else ""
        content = template.replace("{target}", target_name)

        is_thought = content.startswith("*") and content.endswith("*")
        if is_solo and not is_thought:
            content = f"*{content}*"
            is_thought = True

        return ChatMessage(
            tick=state.tick,
            speaker_id=character.id,
            speaker_name=character.name,
            content=content,
            tone=tone,
            target_id=target.id if target else None,
            target_name=target_name if target_name else None,
            is_thought=is_thought,
            action_context=action_key,
        )

    def generate_reaction_dialogue(
        self, character: Character, event: Event, state: SimulationState
    ) -> ChatMessage | None:
        if character.id not in event.participants:
            return None

        rng = random.Random(hash(("reaction", character.id, event.id)))
        if rng.random() > 0.6:
            return None

        tone = self._get_tone(character)
        reaction_type = self._classify_event_reaction(character, event, state)
        if not reaction_type:
            return None

        template = self._pick_reaction_template(reaction_type, tone)
        if not template:
            return None

        other_id = None
        other_name = ""
        for pid in event.participants:
            if pid != character.id and pid in state.characters:
                other_id = pid
                other_name = state.characters[pid].name
                break

        content = template.replace("{target}", other_name)
        is_thought = content.startswith("*") and content.endswith("*")

        return ChatMessage(
            tick=state.tick,
            speaker_id=character.id,
            speaker_name=character.name,
            content=content,
            tone=tone,
            target_id=other_id,
            target_name=other_name if other_name else None,
            is_thought=is_thought,
            action_context=f"reaction_{event.type.value}",
        )

    def _classify_event_reaction(self, character: Character, event: Event, state: SimulationState) -> str | None:
        if event.type == EventType.CONFLICT:
            is_winner = any("wins" in o.lower() and character.name.lower() in o.lower() for o in event.outcomes)
            return "won_conflict" if is_winner else "lost_conflict"

        if event.type == EventType.ALLIANCE_FORMED:
            return "alliance_formed"

        if event.type == EventType.INTERACTION:
            if "betray" in event.description.lower():
                victim_names = []
                for pid in event.participants:
                    if pid != character.id and pid in state.characters:
                        victim_names.append(state.characters[pid].name)
                if "betray" in event.title.lower():
                    parts = event.title.lower().split("betray")
                    if len(parts) >= 2 and character.name.lower() in parts[1]:
                        return "was_betrayed"
                for o in event.outcomes:
                    if "stole" in o.lower() and any(f"from {character.name.lower()}" in o.lower() for _ in [1]):
                        return "was_betrayed"

            if "cooperat" in event.description.lower():
                return "successful_cooperation"

            if "competit" in event.description.lower():
                is_winner = any("wins" in o.lower() and character.name.lower() in o.lower() for o in event.outcomes)
                return "won_conflict" if is_winner else "lost_conflict"

        if event.type == EventType.NEGOTIATION:
            if "preoccupied" in event.description.lower() or "yet to respond" in event.description.lower():
                return "failed_negotiation"

        if event.type == EventType.EMERGENT:
            if "crisis" in event.title.lower() or "shortage" in event.title.lower() or "scarcity" in event.title.lower():
                return "resource_crisis"

        return None
