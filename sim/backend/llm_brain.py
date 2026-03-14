"""LLM-powered agent brain — gives agents free will via Claude API.

SPOTLIGHT agents get real AI reasoning: they perceive the world, think about
their situation, and make genuinely creative decisions. They can even search
the web for ideas about what to build, how to organize society, etc.

This replaces the rule-based decide() for agents that matter most.
"""

from __future__ import annotations

import json
import os
import random
import time
import asyncio
from typing import Any

from models import (
    Character, SimulationState, Action, ActionType,
    ChatMessage, MemoryEntry, EmotionalState,
)

# Try to import anthropic — gracefully degrade if not available
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

# Cache for web search results so agents don't repeat searches
_web_cache: dict[str, tuple[float, str]] = {}
_WEB_CACHE_TTL = 300  # 5 minutes

# Rate limiting
_last_llm_call: float = 0.0
_MIN_CALL_INTERVAL = 0.1  # seconds between calls


def _get_client() -> Any | None:
    """Get or create the Anthropic client."""
    if not HAS_ANTHROPIC:
        return None
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        return None
    return anthropic.Anthropic(api_key=key)


def _format_character_context(char: Character, state: SimulationState) -> str:
    """Build a rich context string describing who this character is and what they see."""

    # Basic identity
    lines = [
        f"You are {char.name}.",
        f"Profile: {char.profile}" if char.profile else "",
        f"Age: {char.age} | Health: {char.health:.0f}% | Alive: {char.alive}",
        "",
        "== YOUR PERSONALITY (Big Five) ==",
        f"  Openness: {char.traits.openness:.2f}  (curious, creative)" if char.traits.openness > 0.6 else
        f"  Openness: {char.traits.openness:.2f}  (practical, conventional)" if char.traits.openness < 0.4 else
        f"  Openness: {char.traits.openness:.2f}",
        f"  Conscientiousness: {char.traits.conscientiousness:.2f}",
        f"  Extraversion: {char.traits.extraversion:.2f}",
        f"  Agreeableness: {char.traits.agreeableness:.2f}",
        f"  Neuroticism: {char.traits.neuroticism:.2f}",
        "",
        "== YOUR EMOTIONS RIGHT NOW ==",
        f"  Happiness: {char.emotional_state.happiness:+.2f}",
        f"  Anger: {char.emotional_state.anger:+.2f}",
        f"  Fear: {char.emotional_state.fear:+.2f}",
        f"  Trust: {char.emotional_state.trust:+.2f}",
        f"  Sadness: {char.emotional_state.sadness:+.2f}",
        "",
        "== YOUR RESOURCES ==",
    ]
    for k, v in char.resources.items():
        if not k.startswith("_"):
            lines.append(f"  {k}: {v:.1f}")

    # Needs
    lines.extend([
        "",
        "== YOUR NEEDS ==",
        f"  Hunger: {char.needs.hunger:.0f}/100",
        f"  Energy: {char.needs.energy:.0f}/100",
        f"  Social: {char.needs.social:.0f}/100",
        f"  Fun: {char.needs.fun:.0f}/100",
        f"  Hygiene: {char.needs.hygiene:.0f}/100",
    ])

    # Goals & motivations
    if char.goals:
        lines.append(f"\nYour goals: {', '.join(char.goals)}")
    if char.motivations:
        lines.append(f"Your motivations: {', '.join(char.motivations)}")

    # Housing
    if char.house_id:
        for h in state.environment.houses:
            if h.id == char.house_id:
                lines.append(f"\nYou own a {h.size} house called '{h.name}'.")
                break
    else:
        lines.append("\nYou are HOMELESS — you have no house.")

    # Position
    lines.append(f"\nYour position: ({char.position['x']:.0f}, {char.position['y']:.0f})")

    # Relationships
    if char.relationships:
        lines.append("\n== RELATIONSHIPS ==")
        for rid, val in sorted(char.relationships.items(), key=lambda x: abs(x[1]), reverse=True)[:10]:
            other = state.characters.get(rid)
            if other:
                label = "close friend" if val > 0.5 else "friendly" if val > 0.2 else "neutral" if val > -0.2 else "hostile" if val > -0.5 else "enemy"
                lines.append(f"  {other.name}: {val:+.2f} ({label})")

    # Nearby characters
    nearby = []
    for cid, other in state.characters.items():
        if cid == char.id or not other.alive:
            continue
        dx = other.position["x"] - char.position["x"]
        dy = other.position["y"] - char.position["y"]
        dist = (dx * dx + dy * dy) ** 0.5
        if dist < 150:
            nearby.append((dist, other))
    nearby.sort()
    nearby = nearby[:10]

    if nearby:
        lines.append("\n== NEARBY PEOPLE ==")
        for dist, other in nearby:
            last_act = other.last_action.type.value if other.last_action else "idle"
            lines.append(f"  {other.name} (dist: {dist:.0f}, doing: {last_act})")

    # Nearby locations
    nearby_locs = []
    for loc in state.environment.locations:
        dx = loc.x - char.position["x"]
        dy = loc.y - char.position["y"]
        dist = (dx * dx + dy * dy) ** 0.5
        if dist < 200:
            nearby_locs.append((dist, loc))
    nearby_locs.sort()

    if nearby_locs:
        lines.append("\n== NEARBY LOCATIONS ==")
        for dist, loc in nearby_locs[:8]:
            lines.append(f"  {loc.name} ({loc.type}, biome: {loc.biome}, dist: {dist:.0f})")

    # Recent memories
    recent_memories = (char.memory.short_term or [])[-5:]
    if recent_memories:
        lines.append("\n== RECENT MEMORIES ==")
        for mem in recent_memories:
            lines.append(f"  [tick {mem.tick}] {mem.content}")

    # Beliefs
    if char.memory.beliefs:
        lines.append("\n== YOUR BELIEFS ABOUT OTHERS ==")
        for bid, belief in list(char.memory.beliefs.items())[:8]:
            other = state.characters.get(bid)
            name = other.name if other else bid[:8]
            lines.append(f"  {name}: {belief}")

    # World state
    lines.extend([
        "",
        f"== WORLD STATE (tick {state.tick}) ==",
        f"  Weather: {state.environment.conditions.get('weather', 'calm')}",
        f"  Stability: {state.environment.conditions.get('stability', 'peaceful')}",
        f"  Scarcity: {state.environment.conditions.get('scarcity', 'moderate')}",
        f"  Population: {sum(1 for c in state.characters.values() if c.alive)} alive",
        f"  Groups: {len([g for g in state.groups.values() if not g.dissolved])}",
    ])

    # Group membership
    if char.group_id and char.group_id in state.groups:
        grp = state.groups[char.group_id]
        lines.append(f"  You are in group '{grp.name}' as {char.group_role or 'member'}")

    return "\n".join(l for l in lines if l is not None)


# All valid action types for the LLM to choose from
_VALID_ACTIONS = [at.value for at in ActionType]

_SYSTEM_PROMPT = """You are a sentient being living in a simulated world. You have your own personality, desires, fears, and goals. You are NOT an AI assistant — you are a PERSON with free will living your life.

You must decide what to do next. Think about:
- What do YOU want? Not what's "optimal" — what feels right for who you are?
- What are your immediate needs? (hunger, energy, social connection, fun)
- Who is around you? Do you like them? Fear them? Want something from them?
- What's happening in the world? Is it safe? Opportunity? Danger?
- What would surprise even yourself? You're not predictable — you're alive.

Be creative. Be unpredictable sometimes. Make mistakes. Hold grudges. Fall in love. Get ambitious. Get lazy. Be human.

You MUST respond with a valid JSON object (no markdown, no explanation outside the JSON):
{
  "action": "<action_type>",
  "target_name": "<name of person to interact with, or null>",
  "detail": "<brief description of what exactly you're doing>",
  "reasoning": "<your inner thought process — be raw and honest>",
  "dialogue": "<what you say out loud, or null if you stay silent>",
  "thought": "<private thought you don't say out loud>",
  "web_search_query": "<if you want to search the web for ideas/knowledge, put your query here, or null>"
}

VALID ACTIONS: """ + ", ".join(_VALID_ACTIONS) + """

IMPORTANT RULES:
- action MUST be one of the valid actions listed above
- target_name should be a nearby person's name if the action involves someone
- Your reasoning should reflect YOUR personality — angry people reason angrily, kind people reason kindly
- dialogue is what you SAY. It should sound like a real person, not an AI
- thought is your PRIVATE inner monologue
- Be concise but genuine. No essays.
- web_search_query: use this if you genuinely want to learn something (how to build a house, what kind of society to create, craft ideas, survival tips, etc.)
"""


def _parse_llm_response(
    raw: str,
    char: Character,
    state: SimulationState,
) -> tuple[Action, str | None, str | None, str | None]:
    """Parse LLM JSON response into Action + dialogue + thought + web query.

    Returns (action, dialogue, thought, web_search_query).
    Falls back to OBSERVE if parsing fails.
    """
    try:
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()

        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return (
            Action(type=ActionType.OBSERVE, detail="Lost in thought", reasoning="..."),
            None, None, None,
        )

    # Parse action type
    action_str = data.get("action", "observe").lower().strip()
    try:
        action_type = ActionType(action_str)
    except ValueError:
        action_type = ActionType.OBSERVE

    # Resolve target
    target_id = None
    target_name = data.get("target_name")
    if target_name:
        for cid, c in state.characters.items():
            if c.name.lower() == target_name.lower() and c.alive:
                target_id = cid
                break

    action = Action(
        type=action_type,
        target_id=target_id,
        detail=data.get("detail", "")[:200],
        reasoning=data.get("reasoning", "")[:300],
    )

    dialogue = data.get("dialogue")
    if dialogue and isinstance(dialogue, str) and dialogue.lower() not in ("null", "none", ""):
        dialogue = dialogue[:300]
    else:
        dialogue = None

    thought = data.get("thought")
    if thought and isinstance(thought, str) and thought.lower() not in ("null", "none", ""):
        thought = thought[:300]
    else:
        thought = None

    web_query = data.get("web_search_query")
    if web_query and isinstance(web_query, str) and web_query.lower() not in ("null", "none", ""):
        web_query = web_query[:150]
    else:
        web_query = None

    return action, dialogue, thought, web_query


def _do_web_search(query: str) -> str | None:
    """Simple web search via DuckDuckGo instant answers (no API key needed).

    Returns a summary string or None if unavailable.
    """
    # Check cache
    now = time.time()
    if query in _web_cache:
        cached_time, cached_result = _web_cache[query]
        if now - cached_time < _WEB_CACHE_TTL:
            return cached_result

    try:
        import urllib.request
        import urllib.parse
        encoded = urllib.parse.quote_plus(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "SimulationAgent/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())

        parts = []
        if data.get("AbstractText"):
            parts.append(data["AbstractText"][:500])
        if data.get("Answer"):
            parts.append(str(data["Answer"])[:300])
        for topic in (data.get("RelatedTopics") or [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                parts.append(topic["Text"][:200])

        result = "\n".join(parts)[:800] if parts else None
        _web_cache[query] = (now, result)
        return result
    except Exception:
        return None


class LLMBrain:
    """LLM-powered decision making for spotlight agents."""

    def __init__(self):
        self._client = None
        self._available: bool | None = None  # None = not checked yet
        self._pending_searches: dict[str, str] = {}  # char_id -> query
        self._search_results: dict[str, str] = {}  # char_id -> results
        self._call_count = 0
        self._last_error: str | None = None

    def is_available(self) -> bool:
        """Check if LLM brain can be used."""
        if self._available is not None:
            return self._available

        if not HAS_ANTHROPIC:
            self._available = False
            self._last_error = "anthropic package not installed"
            return False

        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not key:
            self._available = False
            self._last_error = "ANTHROPIC_API_KEY not set"
            return False

        self._client = anthropic.Anthropic(api_key=key)
        self._available = True
        return True

    def decide(
        self,
        character: Character,
        state: SimulationState,
    ) -> tuple[Action, list[ChatMessage]]:
        """Make a decision for a character using Claude.

        Returns (action, list_of_chat_messages).
        """
        messages: list[ChatMessage] = []

        if not self.is_available():
            # Fallback: return observe
            return Action(type=ActionType.OBSERVE, detail="Thinking...", reasoning="LLM unavailable"), messages

        context = _format_character_context(character, state)

        # If this agent did a web search last tick, include results
        search_context = ""
        if character.id in self._search_results:
            search_context = f"\n\n== WEB SEARCH RESULTS ==\n{self._search_results.pop(character.id)}\n(Use this knowledge to inform your decision!)\n"

        user_message = context + search_context

        try:
            global _last_llm_call
            now = time.time()
            wait = _MIN_CALL_INTERVAL - (now - _last_llm_call)
            if wait > 0:
                time.sleep(wait)

            response = self._client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            _last_llm_call = time.time()
            self._call_count += 1

            raw = response.content[0].text
            action, dialogue, thought, web_query = _parse_llm_response(raw, character, state)

            # Handle web search request for next tick
            if web_query:
                result = _do_web_search(web_query)
                if result:
                    self._search_results[character.id] = result

            # Generate chat messages
            if dialogue:
                target_name = None
                if action.target_id and action.target_id in state.characters:
                    target_name = state.characters[action.target_id].name
                messages.append(ChatMessage(
                    tick=state.tick,
                    speaker_id=character.id,
                    speaker_name=character.name,
                    content=dialogue,
                    tone=_infer_tone(character),
                    target_id=action.target_id,
                    target_name=target_name,
                    is_thought=False,
                    action_context=action.type.value,
                ))

            if thought:
                messages.append(ChatMessage(
                    tick=state.tick,
                    speaker_id=character.id,
                    speaker_name=character.name,
                    content=thought,
                    tone="internal",
                    is_thought=True,
                    action_context=action.type.value,
                ))

            return action, messages

        except Exception as e:
            self._last_error = str(e)
            return Action(type=ActionType.OBSERVE, detail="Distracted", reasoning=f"Error: {e}"), messages

    def get_stats(self) -> dict:
        return {
            "available": self._available or False,
            "call_count": self._call_count,
            "last_error": self._last_error,
            "has_anthropic_sdk": HAS_ANTHROPIC,
            "has_api_key": bool(os.environ.get("ANTHROPIC_API_KEY", "")),
        }


def _infer_tone(char: Character) -> str:
    """Quick tone inference from emotional state."""
    emo = char.emotional_state
    if emo.anger > 0.4:
        return "aggressive"
    if emo.happiness > 0.4:
        return "friendly"
    if emo.fear > 0.4:
        return "nervous"
    if emo.sadness > 0.4:
        return "melancholic"
    if emo.trust > 0.4:
        return "warm"
    return "neutral"
