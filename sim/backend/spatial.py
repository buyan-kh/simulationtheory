"""Spatial hash grid for O(1) average-case neighbor lookups.

Instead of checking all N characters to find nearby ones (O(N²) across the
population), we partition the world into grid cells. Each character belongs
to one cell. To find neighbors within radius R, we only check cells that
overlap the query circle — typically a small constant number.
"""

from __future__ import annotations
from models import Character


class SpatialGrid:
    """Fixed-size hash grid over 2D world space."""

    __slots__ = ("cell_size", "_cells", "_char_cell")

    def __init__(self, cell_size: float = 30.0):
        self.cell_size = cell_size
        self._cells: dict[tuple[int, int], list[str]] = {}
        self._char_cell: dict[str, tuple[int, int]] = {}

    def _key(self, x: float, y: float) -> tuple[int, int]:
        s = self.cell_size
        return (int(x // s) if x >= 0 else int(x // s) - 1,
                int(y // s) if y >= 0 else int(y // s) - 1)

    # ── Build ──

    def rebuild(self, characters: dict[str, Character]) -> None:
        """Rebuild grid from all alive characters. Call once per tick."""
        self._cells.clear()
        self._char_cell.clear()
        for char_id, char in characters.items():
            if not char.alive:
                continue
            key = self._key(char.position["x"], char.position["y"])
            bucket = self._cells.get(key)
            if bucket is None:
                bucket = []
                self._cells[key] = bucket
            bucket.append(char_id)
            self._char_cell[char_id] = key

    # ── Query ──

    def get_nearby_ids(
        self,
        x: float,
        y: float,
        radius: float,
        exclude_id: str | None = None,
        characters: dict[str, Character] | None = None,
    ) -> list[str]:
        """Return IDs of alive characters within `radius` of (x, y).

        If `characters` is provided, distances are checked exactly.
        Otherwise, returns all characters in cells overlapping the query area
        (slightly over-inclusive but much faster).
        """
        s = self.cell_size
        cell_r = int(radius / s) + 1
        cx, cy = self._key(x, y)
        r_sq = radius * radius
        result: list[str] = []

        for dx in range(-cell_r, cell_r + 1):
            for dy in range(-cell_r, cell_r + 1):
                bucket = self._cells.get((cx + dx, cy + dy))
                if bucket is None:
                    continue
                for cid in bucket:
                    if cid == exclude_id:
                        continue
                    if characters is not None:
                        c = characters[cid]
                        ddx = c.position["x"] - x
                        ddy = c.position["y"] - y
                        if ddx * ddx + ddy * ddy > r_sq:
                            continue
                    result.append(cid)
        return result

    def get_nearby_for_char(
        self,
        char_id: str,
        radius: float,
        characters: dict[str, Character],
    ) -> list[str]:
        """Get alive character IDs within `radius` of `char_id`."""
        if char_id not in self._char_cell:
            return []
        char = characters[char_id]
        return self.get_nearby_ids(
            char.position["x"],
            char.position["y"],
            radius,
            exclude_id=char_id,
            characters=characters,
        )

    def count(self) -> int:
        """Total tracked characters."""
        return len(self._char_cell)
