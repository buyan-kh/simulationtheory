"""Procedural pixel art item generation for agent crafting.

Agents choose to CRAFT based on personality and needs. This module generates
small pixel art sprites (8x8 to 16x12) using simple procedural rules.
Each item type has a base template that gets personality-colored variations.
Items are stored in SimulationState.world_items and rendered by the frontend.
"""

import random
from models import WorldItem, Character, SimulationState

# ── Color palettes by mood/personality ──────────────────────────────────
_WARM = ["#cc4422", "#dd6633", "#ee8844", "#ffaa55", "#cc6622"]
_COOL = ["#2244aa", "#3366cc", "#4488dd", "#55aaee", "#336688"]
_EARTH = ["#8b6914", "#6b4a0e", "#9a7820", "#7a5810", "#5a3a0a"]
_GREEN = ["#228833", "#33aa44", "#44cc55", "#338844", "#226633"]
_PASTEL = ["#eeccaa", "#ddbbaa", "#ccaa88", "#bbaa99", "#ddccbb"]
_DARK = ["#3a3a4a", "#4a4a5a", "#5a5a6a", "#2a2a3a", "#4a3a3a"]
_BRIGHT = ["#ff4466", "#44ddff", "#ffdd44", "#44ff88", "#dd44ff"]

_WOOD_COLORS = ["#8b6914", "#6b4a0e", "#9a7820", "#7a5810"]
_METAL_COLORS = ["#6a6a7a", "#7a7a8a", "#5a5a6a", "#8a8a9a"]
_FABRIC_COLORS = ["#cc3333", "#3333cc", "#33cc33", "#cccc33", "#cc33cc", "#33cccc"]
_STONE_COLORS = ["#6a6a6a", "#7a7a7a", "#5a5a5a", "#8a8a8a"]


def _pick_palette(char: Character, rng: random.Random) -> list[str]:
    """Choose color palette based on character personality."""
    if char.traits.openness > 0.7:
        return rng.choice([_BRIGHT, _PASTEL, _COOL])
    if char.traits.neuroticism > 0.7:
        return rng.choice([_DARK, _COOL])
    if char.traits.extraversion > 0.7:
        return rng.choice([_WARM, _BRIGHT])
    if char.traits.agreeableness > 0.7:
        return rng.choice([_GREEN, _PASTEL, _EARTH])
    if char.traits.conscientiousness > 0.7:
        return rng.choice([_EARTH, _DARK, _METAL_COLORS])
    return rng.choice([_WARM, _COOL, _EARTH, _GREEN])


def _choose_item_type(char: Character, sim: SimulationState, rng: random.Random) -> str:
    """Choose what type of item to craft based on needs and personality."""
    weights: dict[str, float] = {
        "bed": 0.0, "chair": 0.0, "table": 0.0, "lamp": 0.0,
        "painting": 0.0, "flower_pot": 0.0, "bookshelf": 0.0,
        "cooking_pot": 0.0, "sword": 0.0, "shield": 0.0,
        "statue": 0.0, "sign": 0.0, "barrel": 0.0, "crate": 0.0,
        "candle": 0.0, "rug": 0.0,
    }

    # Needs-driven
    if char.needs.energy < 40:
        weights["bed"] += 3.0
    if char.needs.hunger < 40:
        weights["cooking_pot"] += 3.0
    if char.needs.fun < 40:
        weights["painting"] += 2.0
        weights["statue"] += 1.5
    if char.needs.social < 40:
        weights["chair"] += 2.0
        weights["table"] += 2.0

    # Personality-driven
    weights["painting"] += char.traits.openness * 2.0
    weights["statue"] += char.traits.openness * 1.5
    weights["flower_pot"] += char.traits.agreeableness * 2.0
    weights["bookshelf"] += char.traits.openness * 1.5
    weights["sword"] += (1 - char.traits.agreeableness) * 2.0
    weights["shield"] += char.traits.neuroticism * 1.5
    weights["lamp"] += char.traits.conscientiousness * 1.5
    weights["rug"] += char.traits.agreeableness * 1.0
    weights["barrel"] += char.traits.conscientiousness * 1.0
    weights["crate"] += char.traits.conscientiousness * 1.0
    weights["sign"] += char.traits.extraversion * 1.5
    weights["candle"] += char.traits.neuroticism * 1.0
    weights["table"] += char.traits.conscientiousness * 1.0
    weights["chair"] += char.traits.extraversion * 0.8

    # Don't make duplicates too often — check what this character already made
    existing = [it.name.lower() for it in sim.world_items if it.creator_id == char.id]
    for item_name in weights:
        if item_name.replace("_", " ") in " ".join(existing):
            weights[item_name] *= 0.2  # deprioritize repeats

    # Ensure minimum weight
    for k in weights:
        weights[k] = max(weights[k], 0.1)

    items = list(weights.keys())
    w = [weights[i] for i in items]
    return rng.choices(items, weights=w, k=1)[0]


# ── Pixel art generators for each item type ──────────────────────────────

def _make_bed(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    """A small bed: wooden frame + colored blanket + pillow."""
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    blanket = rng.choice(pal)
    pillow = "#ffffff"

    # Frame (bottom 2 rows)
    for x in range(w):
        pixels[(h - 1) * w + x] = wood
        pixels[(h - 2) * w + x] = wood

    # Mattress
    for y in range(2, h - 2):
        for x in range(1, w - 1):
            pixels[y * w + x] = blanket

    # Pillow (top section)
    for x in range(1, min(4, w - 1)):
        pixels[2 * w + x] = pillow
        pixels[3 * w + x] = pillow

    # Legs
    pixels[(h - 1) * w + 0] = "#4a2a0a"
    pixels[(h - 1) * w + w - 1] = "#4a2a0a"

    return pixels


def _make_chair(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    seat = rng.choice(pal)

    # Back (left column)
    for y in range(1, h - 2):
        pixels[y * w + 0] = wood

    # Seat (middle rows)
    seat_y = h // 2
    for x in range(w):
        pixels[seat_y * w + x] = seat
        pixels[(seat_y + 1) * w + x] = wood

    # Legs
    for y in range(seat_y + 2, h):
        pixels[y * w + 0] = wood
        pixels[y * w + w - 1] = wood

    return pixels


def _make_table(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    top = rng.choice([wood, rng.choice(pal)])

    # Tabletop (top 2 rows)
    for x in range(w):
        pixels[0 * w + x] = top
        pixels[1 * w + x] = wood

    # Legs
    for y in range(2, h):
        pixels[y * w + 1] = wood
        pixels[y * w + w - 2] = wood

    return pixels


def _make_lamp(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    metal = rng.choice(_METAL_COLORS)
    glow = "#ffdd66"
    shade = rng.choice(pal)

    # Shade (top)
    for x in range(1, w - 1):
        pixels[0 * w + x] = shade
        pixels[1 * w + x] = shade

    # Glow
    cx = w // 2
    pixels[2 * w + cx] = glow
    if cx > 0:
        pixels[2 * w + cx - 1] = glow
    if cx < w - 1:
        pixels[2 * w + cx + 1] = glow

    # Pole
    for y in range(3, h - 1):
        pixels[y * w + cx] = metal

    # Base
    for x in range(max(0, cx - 1), min(w, cx + 2)):
        pixels[(h - 1) * w + x] = metal

    return pixels


def _make_painting(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    """Abstract painting — random colored pixels in a frame."""
    pixels: list[str | None] = [None] * (w * h)
    frame = rng.choice(_WOOD_COLORS)

    for y in range(h):
        for x in range(w):
            if x == 0 or x == w - 1 or y == 0 or y == h - 1:
                pixels[y * w + x] = frame
            else:
                pixels[y * w + x] = rng.choice(pal)

    return pixels


def _make_flower_pot(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    pot = rng.choice(["#cc6633", "#884422", "#aa5533"])
    flower = rng.choice(pal)
    stem = "#228833"

    # Stems
    cx = w // 2
    for y in range(2, h - 3):
        pixels[y * w + cx] = stem
    if cx > 0:
        pixels[2 * w + cx - 1] = stem

    # Flowers on top
    pixels[0 * w + cx] = flower
    if cx > 0:
        pixels[1 * w + cx - 1] = flower
    if cx < w - 1:
        pixels[1 * w + cx + 1] = flower

    # Pot (bottom)
    for y in range(h - 3, h):
        left = max(0, cx - 2 + (h - 1 - y))
        right = min(w, cx + 3 - (h - 1 - y))
        for x in range(left, right):
            pixels[y * w + x] = pot

    return pixels


def _make_bookshelf(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    book_colors = pal + _WARM[:2] + _COOL[:2]

    # Frame
    for y in range(h):
        pixels[y * w + 0] = wood
        pixels[y * w + w - 1] = wood

    # Shelves + books
    shelf_rows = [0, h // 3, 2 * h // 3, h - 1]
    for sy in shelf_rows:
        for x in range(w):
            pixels[sy * w + x] = wood

    # Books between shelves
    for i in range(len(shelf_rows) - 1):
        top = shelf_rows[i] + 1
        bot = shelf_rows[i + 1]
        for x in range(1, w - 1):
            color = rng.choice(book_colors)
            for y in range(top, bot):
                pixels[y * w + x] = color

    return pixels


def _make_cooking_pot(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    metal = rng.choice(_METAL_COLORS)
    food = rng.choice(["#cc8833", "#aa6622", "#ddaa44"])
    steam = "#cccccc"

    # Steam
    cx = w // 2
    pixels[0 * w + cx] = steam
    if cx > 0:
        pixels[1 * w + cx - 1] = steam
    if cx < w - 1:
        pixels[1 * w + cx + 1] = steam

    # Pot body
    for y in range(3, h - 1):
        for x in range(1, w - 1):
            pixels[y * w + x] = metal

    # Food inside
    for x in range(2, w - 2):
        pixels[3 * w + x] = food
        pixels[4 * w + x] = food

    # Handles
    pixels[4 * w + 0] = metal
    pixels[4 * w + w - 1] = metal

    # Base
    for x in range(1, w - 1):
        pixels[(h - 1) * w + x] = "#3a3a3a"

    return pixels


def _make_sword(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    blade = rng.choice(["#aaaacc", "#bbbbdd", "#9999bb"])
    hilt = rng.choice(_WOOD_COLORS)
    gem = rng.choice(pal)

    cx = w // 2
    # Blade (top)
    for y in range(0, h - 3):
        pixels[y * w + cx] = blade

    # Crossguard
    guard_y = h - 3
    for x in range(max(0, cx - 2), min(w, cx + 3)):
        pixels[guard_y * w + x] = hilt

    # Gem in center
    pixels[guard_y * w + cx] = gem

    # Handle
    for y in range(h - 2, h):
        pixels[y * w + cx] = hilt

    return pixels


def _make_shield(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    metal = rng.choice(_METAL_COLORS)
    face = rng.choice(pal)

    # Shield shape (rounded rectangle)
    for y in range(h):
        for x in range(w):
            # Round corners
            if (y == 0 or y == h - 1) and (x == 0 or x == w - 1):
                continue
            if y == 0 or y == h - 1 or x == 0 or x == w - 1:
                pixels[y * w + x] = metal
            else:
                pixels[y * w + x] = face

    # Cross emblem
    cx, cy = w // 2, h // 2
    for y in range(1, h - 1):
        pixels[y * w + cx] = metal
    for x in range(1, w - 1):
        pixels[cy * w + x] = metal

    return pixels


def _make_statue(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    stone = rng.choice(_STONE_COLORS)
    accent = rng.choice(pal)

    cx = w // 2
    # Head
    pixels[0 * w + cx] = stone
    if cx > 0:
        pixels[0 * w + cx - 1] = stone
    if cx < w - 1:
        pixels[0 * w + cx + 1] = stone
    pixels[1 * w + cx] = stone

    # Body
    for y in range(2, h - 2):
        for x in range(max(0, cx - 1), min(w, cx + 2)):
            pixels[y * w + x] = stone

    # Accent
    pixels[3 * w + cx] = accent

    # Base
    for x in range(w):
        pixels[(h - 1) * w + x] = stone
        pixels[(h - 2) * w + x] = stone

    return pixels


def _make_sign(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    board = rng.choice(pal)

    # Sign board
    for y in range(0, h - 3):
        for x in range(w):
            if x == 0 or x == w - 1 or y == 0 or y == h - 4:
                pixels[y * w + x] = wood
            else:
                pixels[y * w + x] = board

    # Post
    cx = w // 2
    for y in range(h - 3, h):
        pixels[y * w + cx] = wood

    return pixels


def _make_barrel(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    band = rng.choice(_METAL_COLORS)

    for y in range(h):
        # Barrel shape — narrower at top and bottom
        indent = 1 if (y <= 1 or y >= h - 2) else 0
        for x in range(indent, w - indent):
            if y == 1 or y == h - 2:  # metal bands
                pixels[y * w + x] = band
            else:
                pixels[y * w + x] = wood

    return pixels


def _make_crate(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wood = rng.choice(_WOOD_COLORS)
    plank = rng.choice(["#7a5810", "#8b6914"])

    for y in range(h):
        for x in range(w):
            if x == 0 or x == w - 1 or y == 0 or y == h - 1:
                pixels[y * w + x] = plank
            else:
                pixels[y * w + x] = wood

    # Cross planks
    for i in range(min(w, h)):
        if i < w and i < h:
            pixels[i * w + i] = plank
            pixels[i * w + (w - 1 - i)] = plank

    return pixels


def _make_candle(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    wax = rng.choice(["#eeddcc", "#ddccbb", "#ccbbaa"])
    flame = "#ffdd44"
    flame_tip = "#ff6622"

    cx = w // 2
    # Flame
    pixels[0 * w + cx] = flame_tip
    pixels[1 * w + cx] = flame
    if cx > 0:
        pixels[1 * w + cx - 1] = flame

    # Candle body
    for y in range(2, h - 1):
        pixels[y * w + cx] = wax
        if cx > 0:
            pixels[y * w + cx - 1] = wax

    # Base
    for x in range(max(0, cx - 1), min(w, cx + 2)):
        pixels[(h - 1) * w + x] = rng.choice(_METAL_COLORS)

    return pixels


def _make_rug(w: int, h: int, pal: list[str], rng: random.Random) -> list[str | None]:
    pixels: list[str | None] = [None] * (w * h)
    border = rng.choice(pal)
    inner = rng.choice(pal)
    pattern = rng.choice(pal)

    for y in range(h):
        for x in range(w):
            if x == 0 or x == w - 1 or y == 0 or y == h - 1:
                pixels[y * w + x] = border
            elif (x + y) % 2 == 0:
                pixels[y * w + x] = inner
            else:
                pixels[y * w + x] = pattern

    return pixels


# ── Generator registry ───────────────────────────────────────────────────

_ITEM_GENERATORS: dict[str, tuple[int, int, callable]] = {
    # item_type: (width, height, generator_fn)
    "bed":         (10, 8, _make_bed),
    "chair":       (6, 8, _make_chair),
    "table":       (10, 6, _make_table),
    "lamp":        (6, 10, _make_lamp),
    "painting":    (8, 8, _make_painting),
    "flower_pot":  (6, 8, _make_flower_pot),
    "bookshelf":   (8, 10, _make_bookshelf),
    "cooking_pot": (8, 8, _make_cooking_pot),
    "sword":       (5, 10, _make_sword),
    "shield":      (8, 8, _make_shield),
    "statue":      (8, 10, _make_statue),
    "sign":        (8, 8, _make_sign),
    "barrel":      (6, 8, _make_barrel),
    "crate":       (6, 6, _make_crate),
    "candle":      (5, 8, _make_candle),
    "rug":         (10, 6, _make_rug),
}

_ITEM_TYPE_MAP: dict[str, str] = {
    "bed": "furniture", "chair": "furniture", "table": "furniture",
    "lamp": "furniture", "bookshelf": "furniture", "rug": "furniture",
    "painting": "art", "statue": "art", "flower_pot": "decoration",
    "sign": "decoration", "candle": "decoration",
    "cooking_pot": "tool", "sword": "tool", "shield": "tool",
    "barrel": "decoration", "crate": "decoration",
}

_ITEM_NAMES: dict[str, list[str]] = {
    "bed": ["Cozy Bed", "Rustic Bed", "Dream Bed", "Sleeper's Rest"],
    "chair": ["Wooden Chair", "Sturdy Seat", "Fireside Chair", "Oak Chair"],
    "table": ["Oak Table", "Dining Table", "Work Desk", "Round Table"],
    "lamp": ["Iron Lamp", "Glow Lantern", "Night Light", "Beacon"],
    "painting": ["Abstract Art", "Landscape", "Portrait", "Masterwork"],
    "flower_pot": ["Bloom Pot", "Garden Vase", "Rose Planter", "Herb Pot"],
    "bookshelf": ["Library Shelf", "Book Tower", "Scholar's Shelf", "Tome Rack"],
    "cooking_pot": ["Iron Cauldron", "Stew Pot", "Soup Kettle", "Cook's Pot"],
    "sword": ["Iron Blade", "Short Sword", "Guard's Blade", "Steel Edge"],
    "shield": ["Round Shield", "Iron Buckler", "War Shield", "Defender"],
    "statue": ["Stone Figure", "Idol", "Memorial", "Totem"],
    "sign": ["Town Sign", "Notice Board", "Waypost", "Marker"],
    "barrel": ["Oak Barrel", "Storage Barrel", "Wine Cask", "Ale Keg"],
    "crate": ["Supply Crate", "Wooden Box", "Cargo Crate", "Tool Box"],
    "candle": ["Beeswax Candle", "Tallow Candle", "Prayer Candle", "Night Candle"],
    "rug": ["Woven Rug", "Colorful Carpet", "Floor Mat", "Tapestry Rug"],
}


def generate_starter_furniture(char: Character, house: "House", sim: SimulationState) -> list[WorldItem]:
    """Generate basic furniture for a new house: bed, table, and a personality-driven item."""
    from models import House
    rng = random.Random(hash((char.id, house.id, "starter_furniture")))
    palette = _pick_palette(char, rng)
    items: list[WorldItem] = []

    # Every house gets a bed and a table
    starter_types = ["bed", "table"]
    # Add a personality-driven third item
    if char.traits.openness > 0.6:
        starter_types.append("bookshelf")
    elif char.traits.extraversion > 0.6:
        starter_types.append("chair")
    elif char.traits.neuroticism > 0.6:
        starter_types.append("candle")
    else:
        starter_types.append("lamp")

    for item_kind in starter_types:
        w, h, gen_fn = _ITEM_GENERATORS[item_kind]
        pixels = gen_fn(w, h, palette, rng)
        name = rng.choice(_ITEM_NAMES.get(item_kind, [item_kind.replace("_", " ").title()]))
        item = WorldItem(
            name=name,
            creator_id=char.id,
            created_tick=sim.tick,
            position=dict(house.position),
            width=w,
            height=h,
            pixels=pixels,
            item_type=_ITEM_TYPE_MAP.get(item_kind, "furniture"),
            placed_in_house=house.id,
        )
        items.append(item)

    return items


def generate_item(char: Character, sim: SimulationState) -> WorldItem:
    """Generate a crafted item for a character based on their personality and needs."""
    rng = random.Random(hash((char.id, sim.tick, "craft")))

    item_kind = _choose_item_type(char, sim, rng)
    w, h, gen_fn = _ITEM_GENERATORS[item_kind]
    palette = _pick_palette(char, rng)
    pixels = gen_fn(w, h, palette, rng)

    # Place in house if character has one, otherwise at their position
    placed_in_house = char.house_id
    pos = dict(char.position)

    name = rng.choice(_ITEM_NAMES.get(item_kind, [item_kind.replace("_", " ").title()]))

    return WorldItem(
        name=f"{name} by {char.name}",
        creator_id=char.id,
        created_tick=sim.tick,
        position=pos,
        width=w,
        height=h,
        pixels=pixels,
        item_type=_ITEM_TYPE_MAP.get(item_kind, "decoration"),
        placed_in_house=placed_in_house,
    )


def process_crafting(sim: SimulationState, actions: dict[str, "Action"]) -> list:
    """Process all CRAFT actions and generate world items. Returns list of events."""
    from models import Event, EventType, ActionType

    events = []
    for char_id, action in actions.items():
        if action.type != ActionType.CRAFT:
            continue

        char = sim.characters.get(char_id)
        if not char or not char.alive:
            continue

        # Cost: crafting requires some wealth and energy
        wealth = char.resources.get("wealth", 0)
        if wealth < 5:
            continue

        char.resources["wealth"] = wealth - 5

        item = generate_item(char, sim)
        sim.world_items.append(item)
        char.equipped_items.append(item.id)

        # Cap total items to prevent unbounded growth
        if len(sim.world_items) > 500:
            sim.world_items = sim.world_items[-500:]

        events.append(Event(
            tick=sim.tick,
            type=EventType.INTERACTION,
            title=f"{char.name} crafted {item.name}",
            description=f"{char.name} spent time crafting a {item.item_type}: {item.name}",
            participants=[char.id],
            outcomes=[f"{char.name} created a new {item.item_type}"],
            importance=0.4,
        ))

    return events
