import csv
import io
import json
from collections import Counter
from models import SimulationState


class SimulationAnalytics:

    def compute_summary(self, sim: SimulationState) -> dict:
        chars = list(sim.characters.values())
        alive = [c for c in chars if c.alive]
        dead = [c for c in chars if not c.alive]

        event_counts = Counter(e.type.value for e in sim.events)

        rel_values = []
        for c in chars:
            rel_values.extend(c.relationships.values())
        avg_rel = sum(rel_values) / len(rel_values) if rel_values else 0

        most_influential = max(chars, key=lambda c: c.resources.get("influence", 0)).name if chars else None
        wealthiest = max(chars, key=lambda c: c.resources.get("wealth", 0)).name if chars else None
        most_connected = max(chars, key=lambda c: len(c.relationships)).name if chars else None

        return {
            "total_ticks": sim.tick,
            "total_characters": len(chars),
            "alive_characters": len(alive),
            "dead_characters": len(dead),
            "total_events": len(sim.events),
            "events_by_type": dict(event_counts),
            "avg_relationship": round(avg_rel, 3),
            "total_groups": len([g for g in sim.groups.values() if not g.dissolved]),
            "most_influential": most_influential,
            "wealthiest": wealthiest,
            "most_connected": most_connected,
        }

    def relationship_graph(self, sim: SimulationState) -> dict:
        nodes = []
        for c in sim.characters.values():
            nodes.append({
                "id": c.id,
                "name": c.name,
                "alive": c.alive,
                "group_id": c.group_id,
            })

        edges = []
        seen = set()
        for char in sim.characters.values():
            for target_id, strength in char.relationships.items():
                if abs(strength) < 0.1:
                    continue
                pair = tuple(sorted([char.id, target_id]))
                if pair in seen:
                    continue
                seen.add(pair)
                edges.append({
                    "source": char.id,
                    "target": target_id,
                    "weight": round(strength, 2),
                    "type": "ally" if strength > 0 else "rival",
                })

        return {"nodes": nodes, "edges": edges}

    def resource_trends(self, sim: SimulationState, snapshots: list[SimulationState]) -> dict:
        """Resource levels over time for each character."""
        trends: dict[str, list[dict]] = {}

        for snap in snapshots:
            for cid, char in snap.characters.items():
                if cid not in trends:
                    trends[cid] = []
                trends[cid].append({
                    "tick": snap.tick,
                    "name": char.name,
                    "energy": round(char.resources.get("energy", 0), 1),
                    "wealth": round(char.resources.get("wealth", 0), 1),
                    "influence": round(char.resources.get("influence", 0), 1),
                    "health": round(char.health, 1),
                    "alive": char.alive,
                })

        return trends

    def event_frequency(self, sim: SimulationState) -> dict:
        """Events per tick, bucketed."""
        buckets: dict[int, int] = {}
        for event in sim.events:
            bucket = event.tick // 5 * 5  # 5-tick buckets
            buckets[bucket] = buckets.get(bucket, 0) + 1
        return dict(sorted(buckets.items()))

    def export_json(self, sim: SimulationState) -> str:
        return sim.model_dump_json(indent=2)

    def export_csv(self, sim: SimulationState) -> dict[str, str]:
        """Export as multiple CSV strings."""
        result = {}

        # Characters CSV
        chars_buf = io.StringIO()
        writer = csv.writer(chars_buf)
        writer.writerow(["id", "name", "alive", "age", "health", "energy", "wealth", "influence",
                         "group_id", "cause_of_death", "openness", "conscientiousness",
                         "extraversion", "agreeableness", "neuroticism"])
        for c in sim.characters.values():
            writer.writerow([
                c.id, c.name, c.alive, c.age, round(c.health, 1),
                round(c.resources.get("energy", 0), 1),
                round(c.resources.get("wealth", 0), 1),
                round(c.resources.get("influence", 0), 1),
                c.group_id or "", c.cause_of_death or "",
                c.traits.openness, c.traits.conscientiousness,
                c.traits.extraversion, c.traits.agreeableness, c.traits.neuroticism,
            ])
        result["characters.csv"] = chars_buf.getvalue()

        # Events CSV
        events_buf = io.StringIO()
        writer = csv.writer(events_buf)
        writer.writerow(["id", "tick", "type", "title", "description", "importance", "participants"])
        for e in sim.events:
            writer.writerow([
                e.id, e.tick, e.type.value, e.title, e.description,
                e.importance, ";".join(e.participants),
            ])
        result["events.csv"] = events_buf.getvalue()

        # Relationships CSV
        rels_buf = io.StringIO()
        writer = csv.writer(rels_buf)
        writer.writerow(["source_id", "source_name", "target_id", "target_name", "strength"])
        for c in sim.characters.values():
            for tid, strength in c.relationships.items():
                target = sim.characters.get(tid)
                writer.writerow([
                    c.id, c.name, tid, target.name if target else tid, round(strength, 3),
                ])
        result["relationships.csv"] = rels_buf.getvalue()

        # Groups CSV
        groups_buf = io.StringIO()
        writer = csv.writer(groups_buf)
        writer.writerow(["id", "name", "leader_id", "member_count", "dissolved", "founded_tick"])
        for g in sim.groups.values():
            writer.writerow([
                g.id, g.name, g.leader_id or "",
                len(g.members), g.dissolved, g.founded_tick,
            ])
        result["groups.csv"] = groups_buf.getvalue()

        return result
