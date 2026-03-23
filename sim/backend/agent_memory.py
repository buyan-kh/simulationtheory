"""Persistent per-agent memory files (.txt).

Each agent gets a human-readable .txt file that is updated every tick,
containing their full state: traits, values, identity, relationships,
interaction history, memories, status, health, needs, emotions, etc.
"""

import os
import re
from models import Character, SimulationState, RelationshipType


# Root directory for all agent memory files
MEMORY_ROOT = os.path.join(os.path.dirname(__file__), "agent_memories")


def _sim_dir(sim_id: str) -> str:
    """Return the directory for a simulation's agent memory files."""
    return os.path.join(MEMORY_ROOT, sim_id)


def _safe_filename(name: str, char_id: str) -> str:
    """Generate a safe filename from agent name + short ID."""
    safe = re.sub(r'[^\w\s-]', '', name).strip().replace(' ', '_').lower()
    short_id = char_id[:8]
    return f"{safe}_{short_id}.txt"


def _format_bar(value: float, max_val: float = 100.0, width: int = 20) -> str:
    """Render a simple ASCII progress bar."""
    ratio = max(0.0, min(1.0, value / max_val))
    filled = int(ratio * width)
    return f"[{'█' * filled}{'░' * (width - filled)}] {value:.1f}/{max_val:.0f}"


def _format_trait(name: str, value: float) -> str:
    """Format a 0-1 trait with a descriptor."""
    if value < 0.2:
        level = "Very Low"
    elif value < 0.4:
        level = "Low"
    elif value < 0.6:
        level = "Moderate"
    elif value < 0.8:
        level = "High"
    else:
        level = "Very High"
    return f"  {name:<22} {value:.3f}  ({level})"


def _format_emotion(name: str, value: float) -> str:
    """Format a -1 to +1 emotion."""
    if abs(value) < 0.1:
        feel = "Neutral"
    elif value > 0:
        feel = "Strong" if value > 0.5 else "Mild"
    else:
        feel = "Strong Negative" if value < -0.5 else "Mild Negative"
    return f"  {name:<22} {value:+.2f}  ({feel})"


def render_agent_file(char: Character, sim: SimulationState) -> str:
    """Render the full .txt content for a single agent."""
    lines: list[str] = []
    tick = sim.tick

    # ── Header ──
    status = "ALIVE" if char.alive else f"DEAD (cause: {char.cause_of_death or 'unknown'}, tick {char.death_tick})"
    lines.append(f"{'=' * 60}")
    lines.append(f"  AGENT FILE: {char.name}")
    lines.append(f"  ID: {char.id}")
    lines.append(f"  Status: {status}")
    lines.append(f"  Last Updated: Tick {tick}")
    lines.append(f"{'=' * 60}")
    lines.append("")

    # ── Vitals ──
    lines.append("── VITALS ──")
    lines.append(f"  Age:        {char.age} / {char.max_age}")
    lines.append(f"  Health:     {_format_bar(char.health)}")
    lines.append(f"  Position:   ({char.position['x']:.1f}, {char.position['y']:.1f})")
    lines.append(f"  Reputation: {char.reputation:+.2f}")
    if char.disease:
        lines.append(f"  Disease:    {char.disease.get('type', '?')} (severity {char.disease.get('severity', 0):.1f}, day {char.disease.get('duration', 0)})")
    lines.append("")

    # ── Identity ──
    lines.append("── IDENTITY ──")
    lines.append(f"  Profile:    {char.profile}")
    lines.append(f"  Occupation: {char.occupation or 'None'}")
    lines.append(f"  Skills:     {', '.join(char.skills) if char.skills else 'None'}")
    lines.append(f"  Hobbies:    {', '.join(char.hobbies) if char.hobbies else 'None'}")
    lines.append(f"  Roles:      {', '.join(char.social_roles) if char.social_roles else 'None'}")
    lines.append(f"  Goals:      {', '.join(char.goals) if char.goals else 'None'}")
    lines.append(f"  Motivations:{', '.join(char.motivations) if char.motivations else 'None'}")
    lines.append("")

    # ── Needs ──
    lines.append("── NEEDS ──")
    lines.append(f"  Hunger:  {_format_bar(char.needs.hunger)}")
    lines.append(f"  Energy:  {_format_bar(char.needs.energy)}")
    lines.append(f"  Social:  {_format_bar(char.needs.social)}")
    lines.append(f"  Fun:     {_format_bar(char.needs.fun)}")
    lines.append(f"  Hygiene: {_format_bar(char.needs.hygiene)}")
    lines.append("")

    # ── Personality (HEXACO) ──
    lines.append("── PERSONALITY (HEXACO) ──")
    t = char.traits
    lines.append(_format_trait("Openness", t.openness))
    lines.append(_format_trait("Conscientiousness", t.conscientiousness))
    lines.append(_format_trait("Extraversion", t.extraversion))
    lines.append(_format_trait("Agreeableness", t.agreeableness))
    lines.append(_format_trait("Neuroticism", t.neuroticism))
    lines.append(_format_trait("Honesty-Humility", t.honesty_humility))
    lines.append("")

    # ── Values (Schwartz) ──
    lines.append("── VALUES (SCHWARTZ) ──")
    v = char.values
    lines.append(_format_trait("Self-Enhancement", v.self_enhancement))
    lines.append(_format_trait("Openness to Change", v.openness_to_change))
    lines.append(_format_trait("Self-Transcendence", v.self_transcendence))
    lines.append(_format_trait("Conservation", v.conservation))
    lines.append("")

    # ── Emotions ──
    lines.append("── EMOTIONAL STATE ──")
    e = char.emotional_state
    lines.append(_format_emotion("Happiness", e.happiness))
    lines.append(_format_emotion("Anger", e.anger))
    lines.append(_format_emotion("Fear", e.fear))
    lines.append(_format_emotion("Trust", e.trust))
    lines.append(_format_emotion("Surprise", e.surprise))
    lines.append(_format_emotion("Disgust", e.disgust))
    lines.append(_format_emotion("Sadness", e.sadness))
    lines.append("")

    # ── Resources ──
    lines.append("── RESOURCES ──")
    for res_name, res_val in sorted(char.resources.items()):
        lines.append(f"  {res_name:<16} {res_val:.1f}")
    if char.equipped_items:
        lines.append(f"  Equipped Items: {', '.join(char.equipped_items)}")
    lines.append("")

    # ── Housing ──
    lines.append("── HOUSING ──")
    if char.house_id:
        house = next((h for h in sim.environment.houses if h.id == char.house_id), None)
        if house:
            roommates = [sim.characters[r].name for r in house.residents if r != char.id and r in sim.characters]
            lines.append(f"  House:      {house.name} ({house.size})")
            lines.append(f"  Location:   ({house.position['x']:.0f}, {house.position['y']:.0f})")
            if roommates:
                lines.append(f"  Roommates:  {', '.join(roommates)}")
        else:
            lines.append(f"  House ID:   {char.house_id} (not found)")
    else:
        lines.append("  Homeless")
    lines.append("")

    # ── Family ──
    lines.append("── FAMILY ──")
    if char.spouse_id:
        spouse = sim.characters.get(char.spouse_id)
        lines.append(f"  Spouse:     {spouse.name if spouse else char.spouse_id}")
    if char.parent_ids:
        parents = [sim.characters.get(pid) for pid in char.parent_ids]
        parent_names = [p.name if p else "?" for p in parents]
        lines.append(f"  Parents:    {', '.join(parent_names)}")
    children = [cid for cid, rtype in char.relationship_types.items() if rtype == RelationshipType.CHILD.value]
    if children:
        child_names = [sim.characters[cid].name for cid in children if cid in sim.characters]
        lines.append(f"  Children:   {', '.join(child_names)}")
    if char.courtship_target:
        target = sim.characters.get(char.courtship_target)
        lines.append(f"  Courting:   {target.name if target else char.courtship_target} (progress: {char.courtship_progress:.0%})")
    if not char.spouse_id and not char.parent_ids and not children and not char.courtship_target:
        lines.append("  No known family")
    lines.append("")

    # ── Group ──
    lines.append("── GROUP / FACTION ──")
    if char.group_id and char.group_id in sim.groups:
        group = sim.groups[char.group_id]
        lines.append(f"  Group:      {group.name}")
        lines.append(f"  Role:       {char.group_role or 'member'}")
        lines.append(f"  Members:    {len(group.members)}")
        if group.leader_id and group.leader_id in sim.characters:
            lines.append(f"  Leader:     {sim.characters[group.leader_id].name}")
    else:
        lines.append("  No group affiliation")
    lines.append("")

    # ── Relationships ──
    lines.append("── RELATIONSHIPS ──")
    if char.relationships:
        # Sort by affinity (strongest first)
        sorted_rels = sorted(char.relationships.items(), key=lambda x: abs(x[1]), reverse=True)
        for other_id, affinity in sorted_rels:
            other = sim.characters.get(other_id)
            other_name = other.name if other else other_id[:8]
            rel_type = char.relationship_types.get(other_id, "")
            rel_label = f" [{rel_type}]" if rel_type else ""
            sentiment = "hostile" if affinity < -0.3 else "cold" if affinity < 0 else "neutral" if affinity < 0.3 else "warm" if affinity < 0.6 else "close"
            alive_tag = "" if (other and other.alive) else " (dead)"
            lines.append(f"  {other_name:<20} {affinity:+.2f}  {sentiment}{rel_label}{alive_tag}")
    else:
        lines.append("  No relationships yet")
    lines.append("")

    # ── Memories ──
    lines.append("── RECENT MEMORIES (Short-Term) ──")
    if char.memory.short_term:
        for mem in char.memory.short_term[-15:]:
            related = ""
            if mem.related_characters:
                names = []
                for rid in mem.related_characters:
                    r = sim.characters.get(rid)
                    names.append(r.name if r else rid[:8])
                related = f" [with: {', '.join(names)}]"
            lines.append(f"  [Tick {mem.tick:>4}] (imp:{mem.importance:.1f}) {mem.content}{related}")
    else:
        lines.append("  No recent memories")
    lines.append("")

    lines.append("── LONG-TERM MEMORIES ──")
    if char.memory.long_term:
        for mem in char.memory.long_term[-20:]:
            related = ""
            if mem.related_characters:
                names = []
                for rid in mem.related_characters:
                    r = sim.characters.get(rid)
                    names.append(r.name if r else rid[:8])
                related = f" [with: {', '.join(names)}]"
            lines.append(f"  [Tick {mem.tick:>4}] (imp:{mem.importance:.1f}) {mem.content}{related}")
    else:
        lines.append("  No long-term memories")
    lines.append("")

    # ── Beliefs ──
    lines.append("── BELIEFS ──")
    if char.memory.beliefs:
        for subject, belief in char.memory.beliefs.items():
            # Subject might be a char ID
            subj_char = sim.characters.get(subject)
            subj_name = subj_char.name if subj_char else subject
            lines.append(f"  {subj_name}: {belief}")
    else:
        lines.append("  No formed beliefs")
    lines.append("")

    # ── Crime Record ──
    if char.crime_record:
        lines.append("── CRIME RECORD ──")
        for crime in char.crime_record[-10:]:
            target = sim.characters.get(crime.get("target_id", ""))
            target_name = target.name if target else crime.get("target_id", "?")[:8]
            lines.append(f"  [Tick {crime.get('tick', '?'):>4}] {crime.get('type', '?')} against {target_name}")
        lines.append("")

    # ── Last Action ──
    lines.append("── LAST ACTION ──")
    if char.last_action:
        a = char.last_action
        target_name = ""
        if a.target_id:
            t = sim.characters.get(a.target_id)
            target_name = f" -> {t.name}" if t else f" -> {a.target_id[:8]}"
        lines.append(f"  Action:    {a.type.value}{target_name}")
        if a.detail:
            lines.append(f"  Detail:    {a.detail}")
        if a.reasoning:
            lines.append(f"  Reasoning: {a.reasoning}")
    else:
        lines.append("  No action taken yet")
    lines.append("")

    lines.append(f"{'=' * 60}")
    lines.append(f"  END OF FILE — {char.name}")
    lines.append(f"{'=' * 60}")

    return "\n".join(lines)


class AgentMemoryManager:
    """Manages persistent .txt memory files for all agents in a simulation."""

    def __init__(self):
        os.makedirs(MEMORY_ROOT, exist_ok=True)

    def _ensure_sim_dir(self, sim_id: str) -> str:
        path = _sim_dir(sim_id)
        os.makedirs(path, exist_ok=True)
        return path

    def wipe_sim_dir(self, sim_id: str):
        """Remove all existing .txt files for a simulation (fresh start)."""
        sim_dir = _sim_dir(sim_id)
        if os.path.exists(sim_dir):
            for f in os.listdir(sim_dir):
                if f.endswith(".txt"):
                    os.remove(os.path.join(sim_dir, f))

    def write_agent_file(self, char: Character, sim: SimulationState):
        """Write/update the .txt file for a single agent."""
        sim_dir = self._ensure_sim_dir(sim.id)
        filename = _safe_filename(char.name, char.id)
        filepath = os.path.join(sim_dir, filename)
        content = render_agent_file(char, sim)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    def write_all_agents(self, sim: SimulationState):
        """Write/update .txt files for all agents (alive and dead)."""
        sim_dir = self._ensure_sim_dir(sim.id)
        for char in sim.characters.values():
            filename = _safe_filename(char.name, char.id)
            filepath = os.path.join(sim_dir, filename)
            content = render_agent_file(char, sim)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

    def read_agent_file(self, sim_id: str, char_id: str, char_name: str) -> str | None:
        """Read the .txt file for an agent. Returns None if not found."""
        sim_dir = _sim_dir(sim_id)
        filename = _safe_filename(char_name, char_id)
        filepath = os.path.join(sim_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        return None

    def list_agent_files(self, sim_id: str) -> list[str]:
        """List all agent memory filenames for a simulation."""
        sim_dir = _sim_dir(sim_id)
        if not os.path.exists(sim_dir):
            return []
        return sorted(f for f in os.listdir(sim_dir) if f.endswith(".txt"))

    def delete_sim_memories(self, sim_id: str):
        """Delete all agent memory files for a simulation."""
        sim_dir = _sim_dir(sim_id)
        if os.path.exists(sim_dir):
            for f in os.listdir(sim_dir):
                os.remove(os.path.join(sim_dir, f))
            os.rmdir(sim_dir)
