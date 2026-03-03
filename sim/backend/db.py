import sqlite3
import time
from pathlib import Path

from models import SimulationState

DB_PATH = Path(__file__).parent / "simulations.db"


class SimulationDB:
    def __init__(self, db_path: Path = DB_PATH):
        self.conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                tick INTEGER NOT NULL DEFAULT 0,
                character_count INTEGER NOT NULL DEFAULT 0,
                event_count INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                state_json TEXT NOT NULL
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                sim_id TEXT NOT NULL,
                tick INTEGER NOT NULL,
                state_json TEXT NOT NULL,
                PRIMARY KEY (sim_id, tick)
            )
        """)
        self.conn.commit()

    def save(self, sim: SimulationState):
        sim.updated_at = time.time()
        self.conn.execute(
            """INSERT OR REPLACE INTO simulations
               (id, name, tick, character_count, event_count, created_at, updated_at, state_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sim.id,
                sim.name,
                sim.tick,
                len(sim.characters),
                len(sim.events),
                sim.created_at,
                sim.updated_at,
                sim.model_dump_json(),
            ),
        )
        self.conn.commit()

    def load(self, sim_id: str) -> SimulationState | None:
        row = self.conn.execute(
            "SELECT state_json FROM simulations WHERE id = ?", (sim_id,)
        ).fetchone()
        if row is None:
            return None
        return SimulationState.model_validate_json(row["state_json"])

    def list_summaries(self) -> list[dict]:
        rows = self.conn.execute(
            """SELECT id, name, tick, character_count, event_count, created_at, updated_at
               FROM simulations ORDER BY updated_at DESC"""
        ).fetchall()
        return [dict(row) for row in rows]

    def delete(self, sim_id: str):
        self.conn.execute("DELETE FROM simulations WHERE id = ?", (sim_id,))
        self.conn.execute("DELETE FROM snapshots WHERE sim_id = ?", (sim_id,))
        self.conn.commit()

    # ── Snapshot methods for replay ──

    def save_snapshot(self, sim: SimulationState):
        self.conn.execute(
            "INSERT OR REPLACE INTO snapshots (sim_id, tick, state_json) VALUES (?, ?, ?)",
            (sim.id, sim.tick, sim.model_dump_json()),
        )
        self.conn.commit()

    def load_snapshot(self, sim_id: str, tick: int) -> SimulationState | None:
        row = self.conn.execute(
            "SELECT state_json FROM snapshots WHERE sim_id = ? AND tick = ?",
            (sim_id, tick),
        ).fetchone()
        if row is None:
            return None
        return SimulationState.model_validate_json(row["state_json"])

    def get_snapshot_ticks(self, sim_id: str) -> list[int]:
        rows = self.conn.execute(
            "SELECT tick FROM snapshots WHERE sim_id = ? ORDER BY tick",
            (sim_id,),
        ).fetchall()
        return [row["tick"] for row in rows]

    def delete_snapshots(self, sim_id: str):
        self.conn.execute("DELETE FROM snapshots WHERE sim_id = ?", (sim_id,))
        self.conn.commit()
