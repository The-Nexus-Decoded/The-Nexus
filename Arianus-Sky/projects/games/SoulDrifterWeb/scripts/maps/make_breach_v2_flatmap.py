"""BREACH-V2 starting zone — FLAT MAP (deliverable 1, issue #451).

Renders the whole starting zone at TRUE METERS, one uniform scale everywhere:
  fixed spine (Vestibule -> Threshold Plaza -> two doors -> seeded chamber
  slots -> Convergence -> Ashen Lock -> First Memory Vault -> exit Connector),
  the full EASY and HARD room pools (every room true size), spawn/loot/prop
  tables, boss set, seed policy, corruption gradient, meter scale bar.

Master PNG  -> workspace (never shipped)
1600px WebP -> repo docs/maps/breach-v2/  (MAP_ASSET_PIPELINE convention)

Run:  python make_breach_v2_flatmap.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from breach_v2_design import (
    ASSET_META, BOOK_PROPS, BOSS_ANCHOR_SOCKETS, BOSS_RUNE_CIRCLE, BOSS_SET, CORRIDOR_WIDTH,
    CORRUPTION_GRADIENT, DRESSING,
    EASY_POOL, FIXED_DRESSING, FIXED_ROOMS, HARD_POOL, LOOT_TABLE, PATH_SLOTS,
    PLAZA_LANDMARKS, PROP_TABLE, SEED_POLICY, SLOT_BOX, SPAWN_TABLE,
    VESTIBULE_LANDMARKS, WALL_ART, WAY_UPWARD_EXIT_ELEVATION, WORLD_ANCHOR,
)

HERE = Path(__file__).parent
MASTER = HERE / "breach-v2-flatmap-master.png"
EXPORT = HERE.parent.parent / "docs" / "maps" / "breach-v2" / "breach-v2-flatmap-1600.webp"

SCALE = 9.0  # px per meter — UNIFORM across every panel on this sheet
PPM = SCALE

# Canvas layout
CANVAS_W = 3400
HEADER_H = 118
SPINE_X0, SPINE_Y0 = 40, 150
SPINE_W, SPINE_H = 2410, 700
RAIL_X0, RAIL_Y0 = 2490, 150
RAIL_W = 870
POOLS_Y0 = 910
POOL_PANEL_W = 1180
POOL_CELL_H = 380
POOL_FRAME_H = 800
STRIP_C_Y0 = 1790
STRIP_D_Y0 = 2160
FOOTER_Y0 = 2440
CANVAS_H = 2560

# Palette (dark drafted-plan aesthetic)
INK = (14, 15, 18)
PANEL = (20, 22, 26)
PANEL_EDGE = (70, 66, 56)
PAPER = (232, 223, 200)
PAPER_DIM = (190, 185, 170)
STONE = (44, 40, 35)
STONE_HARD = (40, 34, 34)
WALL = (200, 184, 138)
GRID = (255, 255, 255, 22)
CYAN = (70, 217, 232)      # soul machinery / Wayfarer
EMBER = (232, 106, 60)     # corruption / Oathbreaker
GOLD = (230, 190, 90)      # loot
RED = (226, 84, 70)        # spawns
GREEN = (120, 200, 130)    # safe / NPC
VIOLET = (168, 120, 220)   # memory / First Memory
FIXED_TAG = (150, 160, 175)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    if bold:
        cands = [r"C:\Windows\Fonts\georgiab.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
    else:
        cands = [r"C:\Windows\Fonts\georgia.ttf", r"C:\Windows\Fonts\arial.ttf"]
    for path in cands:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def hatch_floor(draw: ImageDraw.ImageDraw, x0: float, y0: float, x1: float, y1: float,
                color=(255, 255, 255, 14)) -> None:
    """Flagstone hint: faint 1.75 m cell crosshatch inside a floor rect."""
    step = 1.75 * PPM
    x = x0 + step
    while x < x1:
        draw.line([x, y0, x, y1], fill=color, width=1)
        x += step
    y = y0 + step
    while y < y1:
        draw.line([x0, y, x1, y], fill=color, width=1)
        y += step


def dash_rect(draw: ImageDraw.ImageDraw, x0: float, y0: float, x1: float, y1: float,
              color, width: int, dash: float = 14.0, gap: float = 9.0) -> None:
    """Dashed rectangle outline."""
    def dashed_line(ax, ay, bx, by):
        import math
        length = math.hypot(bx - ax, by - ay)
        if length == 0:
            return
        dx, dy = (bx - ax) / length, (by - ay) / length
        d = 0.0
        while d < length:
            e = min(d + dash, length)
            draw.line([ax + dx * d, ay + dy * d, ax + dx * e, ay + dy * e], fill=color, width=width)
            d = e + gap
    dashed_line(x0, y0, x1, y0)
    dashed_line(x1, y0, x1, y1)
    dashed_line(x1, y1, x0, y1)
    dashed_line(x0, y1, x0, y0)


GROUP_COLORS = {
    "fire": (255, 154, 60), "loot": GOLD, "goods": (170, 140, 80),
    "corruption": (214, 70, 120), "macabre": (205, 200, 185),
    "furniture": (190, 150, 100), "rubble": (135, 122, 105),
    "structure": (170, 175, 190), "books": (232, 224, 200), "art": (240, 214, 130),
}


def number_chip(draw: ImageDraw.ImageDraw, x: float, y: float, n: int, color,
                fsize: int = 13) -> None:
    f = font(fsize, bold=True)
    s = str(n)
    tw = draw.textlength(s, font=f)
    draw.rectangle([x - 2, y - 1, x + tw + 4, y + f.size + 3],
                   fill=(8, 9, 11, 225), outline=color + (220,), width=1)
    draw.text((x + 1, y + 1), s, font=f, fill=color)


def draw_wall_art(draw: ImageDraw.ImageDraw, items, to_px, scale: float,
                  numbered: bool = True, start: int = 0, fsize: int = 12) -> None:
    """Framed wall-art planes (runbook §5A): gold frames hugging the wall."""
    color = GROUP_COLORS["art"]
    for i, (art_id, mx, my, w_m) in enumerate(items):
        x, y = to_px(mx, my)
        w = w_m * scale
        h = max(6.0, 1.05 * scale)
        draw.rectangle([x - w / 2, y - h / 2, x + w / 2, y + h / 2],
                       fill=(52, 46, 34), outline=color, width=2)
        draw.rectangle([x - w / 2 + 2, y - h / 2 + 2, x + w / 2 - 2, y + h / 2 - 2],
                       outline=color + (120,), width=1)
        if numbered:
            number_chip(draw, x + w / 2 + 3, y - h / 2 - 2, start + i + 1, color, fsize)


def draw_dressing(draw: ImageDraw.ImageDraw, items, to_px, scale: float,
                  numbered: bool = False, fsize: int = 13, start: int = 0) -> None:
    """Draw placed dungeon-kit assets as glyphs: square=wall, circle=floor,
    triangle=ceiling; colored by group; optional 1-based number chips."""
    for i, item in enumerate(items):
        asset, mx, my = item[:3]  # readable props also carry surface elevation
        group, placement = ASSET_META[asset]
        color = GROUP_COLORS[group]
        x, y = to_px(mx, my)
        r = max(4.0, 0.55 * scale)
        if placement == "wall":
            draw.rectangle([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=color,
                           outline=(10, 10, 12), width=1)
        elif placement == "ceiling":
            draw.polygon([(x, y + r), (x - r, y - r * 0.7), (x + r, y - r * 0.7)],
                         fill=color, outline=(10, 10, 12))
        else:
            draw.ellipse([x - r, y - r, x + r, y + r], fill=color, outline=(10, 10, 12), width=1)
        if numbered:
            n = str(start + i + 1)
            f = font(fsize, bold=True)
            tw = draw.textlength(n, font=f)
            bx, by = x + r + 2, y - r - 4
            draw.rectangle([bx - 2, by - 1, bx + tw + 4, by + f.size + 3],
                           fill=(8, 9, 11, 225), outline=color + (220,), width=1)
            draw.text((bx + 1, by + 1), n, font=f, fill=color)


def draw_room(draw: ImageDraw.ImageDraw, px: float, py: float, w_m: float, h_m: float,
              floor=STONE, wall=WALL, wall_w=5) -> tuple[float, float, float, float]:
    """Draw a walled room; returns the floor rect in px."""
    x0, y0 = px, py
    x1, y1 = px + w_m * PPM, py + h_m * PPM
    draw.rectangle([x0, y0, x1, y1], fill=floor)
    hatch_floor(draw, x0, y0, x1, y1)
    draw.rectangle([x0, y0, x1, y1], outline=wall, width=wall_w)
    return x0, y0, x1, y1


def draw_door(draw: ImageDraw.ImageDraw, x: float, y: float, w_m: float, side: str,
              color) -> None:
    """Door gap marker centred at (x,y) on a wall; side = wall orientation."""
    half = w_m * PPM / 2
    if side in ("N", "S"):
        draw.line([x - half, y, x + half, y], fill=(14, 15, 18), width=9)
        draw.line([x - half, y, x + half, y], fill=color, width=3)
        draw.polygon([(x - half - 7, y - 7 if side == "N" else y + 7),
                      (x + half + 7, y - 7 if side == "N" else y + 7),
                      (x, y)], outline=color)
    else:
        draw.line([x, y - half, x, y + half], fill=(14, 15, 18), width=9)
        draw.line([x, y - half, x, y + half], fill=color, width=3)


def draw_ascent(draw: ImageDraw.ImageDraw, start: tuple[float, float], end: tuple[float, float],
                from_elevation: float, to_elevation: float, color) -> None:
    """Draw a corridor centerline with stair ticks and an uphill arrow."""
    import math
    x0, y0 = start
    x1, y1 = end
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    if length < 1:
        return
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    draw.line([start, end], fill=color + (210,), width=5)
    for index in range(1, 6):
        t = index / 6
        cx, cy = x0 + dx * t, y0 + dy * t
        draw.line([cx - px * 5, cy - py * 5, cx + px * 5, cy + py * 5], fill=PAPER_DIM, width=2)
    base = (x1 - ux * 12, y1 - uy * 12)
    draw.polygon([end, (base[0] + px * 6, base[1] + py * 6),
                  (base[0] - px * 6, base[1] - py * 6)], fill=color)
    label(draw, (x0 + x1) / 2, (y0 + y1) / 2 - 12,
          f"↑ +{from_elevation:.1f}→+{to_elevation:.1f} m", font(11, bold=True), color, anchor="ma")


def tag(draw: ImageDraw.ImageDraw, x: float, y: float, text: str, color, f=None,
        anchor="la") -> None:
    f = f or font(16, bold=True)
    tw = draw.textlength(text, font=f)
    th = f.size + 8
    if anchor == "la":
        ax, ay = x, y
    elif anchor == "ra":
        ax, ay = x - tw - 2, y
    else:  # ma — centered
        ax, ay = x - tw / 2, y - th / 2
    draw.rectangle([ax - 5, ay - 3, ax + tw + 7, ay + th], fill=(8, 9, 11, 215),
                   outline=color + (200,), width=1)
    draw.text((ax + 1, ay + 2), text, font=f, fill=color)


def label(draw, x, y, text, f, fill=PAPER, anchor="la"):
    draw.text((x, y), text, font=f, fill=fill, anchor=anchor)


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
def draw_header(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([0, 0, CANVAS_W, HEADER_H], fill=(10, 11, 13))
    label(draw, 30, 18, "BREACH-V2 — THE FIRST BREACH · STARTING ZONE FLAT MAP (Level 01)",
          font(46, bold=True), PAPER)
    label(draw, 30, 76,
          "issue #451 · branch codex/451-souldrifter-breach-v2 · flat-map-first per DUNGEON_BUILD_RUNBOOK §1 · "
          "owner rulings V14 (Soul Well = small silvery glowing pool) + V15 (true 3D) · all dims in TRUE METERS",
          font(22), PAPER_DIM)
    label(draw, CANVAS_W - 30, 76, "uniform scale on the whole sheet — measure anything",
          font(22, bold=True), GOLD, anchor="ra")
    draw.line([0, HEADER_H - 1, CANVAS_W, HEADER_H - 1], fill=PANEL_EDGE, width=2)


# ---------------------------------------------------------------------------
# Panel A — fixed spine plan
# ---------------------------------------------------------------------------
# Plan space: meters -> px inside panel A. Plan x range -4..236, y range -18..34.
PLAN_X0, PLAN_Y0 = -4.0, -18.0


def plan_px(mx: float, my: float) -> tuple[float, float]:
    return SPINE_X0 + 40 + (mx - PLAN_X0) * PPM, SPINE_Y0 + 30 + (my - PLAN_Y0) * PPM


def draw_spine(draw: ImageDraw.ImageDraw) -> None:
    # Panel frame
    draw.rectangle([SPINE_X0 - 12, SPINE_Y0 - 46, SPINE_X0 + SPINE_W, SPINE_Y0 + SPINE_H + 60],
                   fill=PANEL, outline=PANEL_EDGE, width=2)
    label(draw, SPINE_X0, SPINE_Y0 - 38, "A · FIXED SPINE + ASCENT — same every run (seeded middle shown as slots; "
          "Vestibule + Plaza detailed in panel A2)", font(30, bold=True), PAPER)

    # 5 m reference grid across the plan area
    for gm in range(0, 266, 5):
        x, _ = plan_px(gm, 0)
        draw.line([x, SPINE_Y0, x, SPINE_Y0 + SPINE_H], fill=GRID, width=1)
        if gm % 10 == 0:
            label(draw, x + 3, SPINE_Y0 + SPINE_H + 8, f"{gm} m", font(16), (150, 148, 138))
    for gm in range(-15, 36, 5):
        _, y = plan_px(0, gm)
        draw.line([SPINE_X0 - 12 + 52, y, SPINE_X0 + SPINE_W, y], fill=GRID, width=1)
        label(draw, SPINE_X0 - 12 + 36, y - 8, f"{gm}", font(13), (120, 118, 110))

    corruption_by_kind = {"start": 0.05, "corridor": 0.08, "plaza": 0.10, "convergence": 0.70,
                          "ante": 0.80, "boss": 1.00, "vault": 0.60, "exit": 0.30}

    # --- seeded middle FIRST (under fixed architecture): dashed slot boxes + centerlines
    for path, slots in PATH_SLOTS.items():
        color = CYAN if path == "wayfarer" else EMBER
        points = []
        for s in slots:
            cx, cy = plan_px(s["x"], s["y"])
            points.append((cx, cy))
            w, h = SLOT_BOX["w"] * PPM, SLOT_BOX["h"] * PPM
            dash_rect(draw, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, color + (190,), 3)
            label(draw, cx, cy - 10, f"S{s['slot']}", font(19, bold=True), color, anchor="ma")
            label(draw, cx, cy + 14, f"+{s['elevation']:.1f} m ↑", font(12, bold=True), color, anchor="ma")
        start = plan_px(52.0, 6.5 if path == "wayfarer" else 13.5)
        conv = plan_px(176.0, 8.0 if path == "wayfarer" else 12.0)
        chain = [start, *points, conv]
        for a, b in zip(chain, chain[1:]):
            mid = (b[0], a[1])
            for p0, p1 in ((a, mid), (mid, b)):
                import math
                length = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
                if length == 0:
                    continue
                dx, dy = (p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length
                d = 0.0
                while d < length:
                    e = min(d + 16, length)
                    draw.line([p0[0] + dx * d, p0[1] + dy * d, p0[0] + dx * e, p0[1] + dy * e],
                              fill=color + (200,), width=3)
                    d = e + 10
    label(draw, *plan_px(112, -16.6), "WAYFARER PATH (easy) — 3–5 seeded chambers, EASY pool only (panel B1)",
          font(19, bold=True), CYAN, anchor="ma")
    label(draw, *plan_px(112, 33.4), "OATHBREAKER PATH (hard) — 3–5 seeded chambers, HARD pool only (panel B2)",
          font(19, bold=True), EMBER, anchor="ma")
    label(draw, *plan_px(253, -16.6), "corridors 3.5 m (easy) / 3.0 m (hard), seeded bends",
          font(14), PAPER_DIM, anchor="ra")

    # --- fixed rooms
    for room in FIXED_ROOMS:
        x0, y0 = plan_px(room["x"], room["y"])
        x1, y1 = plan_px(room["x"] + room["w"], room["y"] + room["h"])
        floor = STONE
        if room["kind"] == "plaza":
            floor = (36, 46, 42)
        elif room["kind"] == "boss":
            floor = (52, 36, 32)
        elif room["kind"] == "vault":
            floor = (40, 34, 52)
        elif room["kind"] == "exit":
            floor = (36, 44, 36)
        wall = WALL if room["kind"] not in ("corridor",) else (140, 130, 100)
        draw.rectangle([x0, y0, x1, y1], fill=floor)
        hatch_floor(draw, x0, y0, x1, y1)
        lvl = corruption_by_kind[room["kind"]]
        if lvl > 0.12:
            draw.rectangle([x0, y0, x1, y1], fill=(190, 40, 30, int(90 * lvl)))
        draw.rectangle([x0, y0, x1, y1], outline=wall, width=5 if room["kind"] != "corridor" else 3)
        # authored kit dressing (fixed rooms — same every run); boss room numbered
        items = FIXED_DRESSING.get(room["id"])
        if items:
            ox, oy = room["x"], room["y"]
            draw_dressing(draw, items,
                          lambda mx, my, _ox=ox, _oy=oy: plan_px(_ox + mx, _oy + my),
                          PPM * 0.7, numbered=(room["kind"] == "boss"), fsize=11)
        art = WALL_ART.get(room["id"])
        if art:
            ox, oy = room["x"], room["y"]
            draw_wall_art(draw, art,
                          lambda mx, my, _ox=ox, _oy=oy: plan_px(_ox + mx, _oy + my),
                          PPM * 0.7, numbered=False)
        books = BOOK_PROPS.get(room["id"])
        if books:
            ox, oy = room["x"], room["y"]
            draw_dressing(draw, books,
                          lambda mx, my, _ox=ox, _oy=oy: plan_px(_ox + mx, _oy + my),
                          PPM * 0.7, numbered=False)
        cx = (x0 + x1) / 2
        label(draw, x0 + 5, y0 + 5, f"+{room['elevation']:.1f} m", font(11, bold=True), GOLD)
        if room["kind"] == "corridor":
            label(draw, cx, y0 - 8, "Gallery Link · 6 x 6 m · FIXED", font(13), PAPER_DIM, anchor="ma")
        elif room["kind"] == "convergence":
            label(draw, cx, y0 - 22, "Convergence Gallery · FIXED", font(16, bold=True), PAPER, anchor="ma")
            label(draw, cx, y1 + 6, "12 x 10 m", font(14), GOLD, anchor="ma")
        elif room["kind"] == "ante":
            label(draw, cx, y1 + 8, "Ashen Threshold (ante)", font(15, bold=True), PAPER, anchor="ma")
            label(draw, cx, y1 + 28, "12 x 9 m · FIXED", font(13), GOLD, anchor="ma")
        elif room["kind"] == "boss":
            label(draw, cx, y0 - 24,
                  f"The Ashen Lock — boss room · FIXED · {room['w']:g} x {room['h']:g} m",
                  font(18, bold=True),
                  PAPER, anchor="ma")
        elif room["kind"] == "vault":
            label(draw, cx, y0 - 15, "First Memory Vault · FIXED · 10 x 8 m", font(13, bold=True),
                  VIOLET, anchor="ma")
        elif room["kind"] == "exit":
            label(draw, cx, y1 + 8, "The Way Upward (exit) · FIXED", font(14, bold=True), GREEN, anchor="ma")

    # --- Vestibule: Soul Well + landmark dots only (detail in panel A2)
    vx0, vy0 = plan_px(0, 0)
    vx1, _ = plan_px(30, 22)
    label(draw, (vx0 + vx1) / 2, vy0 - 26, "Realm-Lock Vestibule — FIXED · 30 x 22 m · cleanest",
          font(18, bold=True), PAPER, anchor="ma")
    well = VESTIBULE_LANDMARKS[0]
    lx, ly = plan_px(well["x"], well["y"])
    apron = well["apron"] * PPM
    r = well["r"] * PPM
    draw.ellipse([lx - apron, ly - apron, lx + apron, ly + apron],
                 fill=(24, 30, 34), outline=(120, 150, 160), width=3)
    draw.ellipse([lx - r, ly - r, lx + r, ly + r], fill=(46, 90, 104), outline=CYAN, width=3)
    for lm, color in ((VESTIBULE_LANDMARKS[2], GREEN), (VESTIBULE_LANDMARKS[3], VIOLET),
                      (VESTIBULE_LANDMARKS[4], GOLD), (VESTIBULE_LANDMARKS[5], (200, 170, 120))):
        mx, my = plan_px(lm["x"], lm["y"])
        draw.ellipse([mx - 5, my - 5, mx + 5, my + 5], fill=color)

    # Bronze conduits: Loom -> Well -> plaza -> paired doors
    bronze = (150, 116, 62)
    draw.line([plan_px(3.6, 8.2), plan_px(8.75, 11.0)], fill=bronze + (220,), width=3)
    draw.line([plan_px(8.75, 11.0), plan_px(26.0, 11.0)], fill=bronze + (220,), width=3)
    draw.line([plan_px(26.0, 11.0), plan_px(44.0, 10.0)], fill=bronze + (220,), width=3)
    draw.line([plan_px(44.0, 10.0), plan_px(52.0, 6.5)], fill=bronze + (220,), width=3)
    draw.line([plan_px(44.0, 10.0), plan_px(52.0, 13.5)], fill=bronze + (220,), width=3)
    draw_ascent(draw, plan_px(29.0, 11.0), plan_px(31.0, 11.0), 0.0, 0.4, GOLD)
    draw_ascent(draw, plan_px(35.0, 11.0), plan_px(37.0, 11.0), 0.4, 0.8, GOLD)

    # --- Threshold plaza: NPCs + the TWO DOORS
    px0, py0 = plan_px(36, 4)
    px1, _ = plan_px(52, 16)
    label(draw, (px0 + px1) / 2, py0 - 24, "Threshold Plaza — FIXED · 16 x 12 m · SAFE",
          font(17, bold=True), PAPER, anchor="ma")
    for lm in PLAZA_LANDMARKS:
        dlx, dly = plan_px(36.0 + lm["x"], 4.0 + lm["y"])  # plaza landmarks are room-local
        if lm["id"].startswith("door-"):
            color = CYAN if lm["id"] == "door-wayfarer" else EMBER
            draw_door(draw, dlx, dly, lm["w"], "E", color)
        else:
            rr = lm["r"] * PPM
            draw.ellipse([dlx - rr, dly - rr, dlx + rr, dly + rr], fill=GREEN)
    label(draw, *plan_px(50.8, 4.7), "WAYFARER (easy)", font(14, bold=True), CYAN, anchor="ra")
    label(draw, *plan_px(50.8, 15.6), "OATHBREAKER (hard)", font(14, bold=True), EMBER, anchor="ra")
    label(draw, *plan_px(44, 17.5), "doors locked until tutorial seals · voiced comparison, never silent commit",
          font(14), GREEN, anchor="ma")

    # --- Convergence / Ashen Lock suite detailing
    draw_door(draw, *plan_px(176.0, 8.0), 3.0, "W", CYAN)
    draw_door(draw, *plan_px(176.0, 12.0), 3.0, "W", EMBER)
    draw_door(draw, *plan_px(188.0, 10.0), 3.0, "E", GOLD)
    a = plan_px(188.0, 10.0)
    b = plan_px(192.0, 10.0)
    draw.line([a, b], fill=(140, 130, 100), width=int(3.2 * PPM))
    draw.line([a, b], fill=(20, 22, 26, 255), width=int(3.2 * PPM * 0.45))
    draw_ascent(draw, a, b, 5.6, 6.2, GOLD)
    draw_door(draw, *plan_px(192.0, 10.0), 3.0, "W", GOLD)

    draw_ascent(draw, plan_px(204.0, 10.0), plan_px(208.0, 10.0), 6.2, 6.8, EMBER)
    draw_door(draw, *plan_px(208.0, 10.0), 3.5, "W", EMBER)
    label(draw, *plan_px(210.0, 12.4), "one-way portcullis", font(13, bold=True), EMBER)

    for ax, ay in BOSS_ANCHOR_SOCKETS:
        axp, ayp = plan_px(ax, ay)
        rr = BOSS_RUNE_CIRCLE["radius"] * PPM
        draw.ellipse([axp - rr, ayp - rr, axp + rr, ayp + rr], outline=EMBER + (150,), width=2)
        draw.ellipse([axp - rr * 0.72, ayp - rr * 0.72, axp + rr * 0.72, ayp + rr * 0.72],
                     outline=EMBER + (90,), width=1)
        draw.polygon([(axp, ayp - 7), (axp + 7, ayp), (axp, ayp + 7), (axp - 7, ayp)],
                     outline=EMBER, width=2)
    bx, by = plan_px(223.0, 10.0)
    draw.polygon([(bx, by - 13), (bx + 13, by), (bx, by + 13), (bx - 13, by)], fill=EMBER)
    tag(draw, *plan_px(209.5, 3.4), "CINDERBOUND WARDEN", EMBER)
    label(draw, *plan_px(223, 19.6), "boss set 1 of 1 · 3 rune-circle anchors · corruption 1.00",
          font(13), (225, 150, 130), anchor="ma")

    # Vault link + First Memory
    draw_ascent(draw, plan_px(238.0, 7.0), plan_px(242.0, 7.0), 6.8, 7.6, VIOLET)
    draw_door(draw, *plan_px(242.0, 7.0), 2.5, "W", VIOLET)
    mx, my = plan_px(247.0, 7.0)
    draw.polygon([(mx, my - 10), (mx + 9, my), (mx, my + 10), (mx - 9, my)], fill=VIOLET)
    label(draw, *plan_px(247, 9.4), "FIRST MEMORY — once", font(12, bold=True), VIOLET, anchor="ma")

    # Sequential Memory Vault -> Way Upward -> Heartvale ascent. There is no
    # direct Ashen Lock -> exit bypass.
    draw_ascent(draw, plan_px(247.0, 11.0), plan_px(247.0, 12.0), 7.6, 7.9, GREEN)
    draw_door(draw, *plan_px(247.0, 12.0), 2.5, "N", GREEN)
    draw_ascent(draw, plan_px(258.0, 15.0), plan_px(262.0, 15.0), 7.9,
                WAY_UPWARD_EXIT_ELEVATION, GREEN)
    ex, ey = plan_px(258.0, 15.0)
    draw.polygon([(ex - 4, ey - 12), (ex + 14, ey), (ex - 4, ey + 12)], fill=GREEN)
    label(draw, *plan_px(250, 13.4),
          f"ascending passage · stairs to +{WAY_UPWARD_EXIT_ELEVATION:.1f} m",
          font(12), GREEN, anchor="ma")
    tag(draw, *plan_px(196.0, 22.6),
        f"EXIT → Heartvale hv-1 (Soul Well Basin) · anchor ({WORLD_ANCHOR['x']}, {WORLD_ANCHOR['y']})",
        GREEN)

    # --- fixed-room dressing index (compressed; vestibule/plaza numbered in A2)
    def _compress(items):
        counts = {}
        for asset, _x, _y in items:
            counts[asset] = counts.get(asset, 0) + 1
        return " · ".join(f"{a} x{n}" if n > 1 else a for a, n in counts.items())

    tbx, tby = plan_px(-2.0, 23.0)
    label(draw, tbx, tby, "FIXED DRESSING (kit IDs) — Vestibule/Plaza/Link numbered in panel A2 · "
          "boss room numbered on plan", font(14, bold=True), PAPER)
    rows = [
        ("gallery link", FIXED_DRESSING["plaza-link"]),
        ("convergence", FIXED_DRESSING["convergence"]),
        ("ashen threshold", FIXED_DRESSING["ashen-threshold"]),
        ("memory vault", FIXED_DRESSING["memory-vault"]),
        ("way upward (exit)", FIXED_DRESSING["exit-connector"]),
    ]
    ry = tby + 22
    for name, items in rows:
        label(draw, tbx, ry, f"{name}: ", font(13, bold=True), GOLD)
        nx = tbx + draw.textlength(f"{name}: ", font=font(13, bold=True))
        label(draw, nx, ry, _compress(items), font(13), PAPER_DIM)
        ry += 19
    label(draw, tbx, ry, "ashen lock (boss): ", font(13, bold=True), GOLD)
    bx2 = tbx + draw.textlength("ashen lock (boss): ", font=font(13, bold=True))
    label(draw, bx2, ry,
          "1 stair-dais · 2-3 guardian-statue · 4-6 corruption-growth · 7-8 chain-shackle · "
          "9-10 floor-brazier · 11 bone-pile · 12 cave-in-rubble · 13 hanging-brazier", font(13), PAPER_DIM)
    ry += 19
    label(draw, tbx, ry, "wall art (§5A): ", font(13, bold=True), GROUP_COLORS["art"])
    wx = tbx + draw.textlength("wall art (§5A): ", font=font(13, bold=True))
    label(draw, wx, ry,
          "vestibule: thalenyr-atlas + heartvale-section maps, lock-inscription relief · plaza: breach flatmap, "
          "wayfarer/oathbreaker banners", font(13), PAPER_DIM)
    ry += 19
    label(draw, tbx + 92, ry,
          "convergence: ashen banner · ante: warden relief · boss: cinderbound banner x2 · vault: first-memory "
          "relief · E-03/E-07/H-03/H-07: painting/scroll/banners", font(13), PAPER_DIM)


# ---------------------------------------------------------------------------
# Panel A2 — Vestibule + Threshold Plaza detail (2x zoom inset)
# ---------------------------------------------------------------------------
DETAIL_SCALE = 16.0
A2_X0, A2_Y0 = 28, 1760
A2_ORIGIN_X, A2_ORIGIN_Y = A2_X0 + 60, A2_Y0 + 90


def a2_px(mx: float, my: float) -> tuple[float, float]:
    return A2_ORIGIN_X + mx * DETAIL_SCALE, A2_ORIGIN_Y + my * DETAIL_SCALE


def draw_vestibule_detail(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([A2_X0, A2_Y0 - 46, A2_X0 + 1232, A2_Y0 + 700], fill=PANEL,
                   outline=PANEL_EDGE, width=2)
    label(draw, A2_X0 + 12, A2_Y0 - 38, "A2 · VESTIBULE + THRESHOLD PLAZA DETAIL — 16 px/m (1.8x the spine scale) · "
          "numbered glyphs = placed kit assets", font(24, bold=True), PAPER)

    # 5 m grid
    for gm in range(0, 56, 5):
        x, _ = a2_px(gm, 0)
        draw.line([x, A2_Y0 + 40, x, A2_Y0 + 470], fill=GRID, width=1)
        label(draw, x + 2, A2_Y0 + 474, f"{gm}", font(13), (120, 118, 110))
    for gm in range(0, 26, 5):
        _, y = a2_px(0, gm)
        draw.line([A2_X0 + 40, y, A2_X0 + 1210, y], fill=GRID, width=1)

    # rooms
    for room in FIXED_ROOMS[:3]:
        x0, y0 = a2_px(room["x"], room["y"])
        x1, y1 = a2_px(room["x"] + room["w"], room["y"] + room["h"])
        floor = STONE if room["kind"] == "start" else ((36, 46, 42) if room["kind"] == "plaza" else (34, 32, 28))
        draw.rectangle([x0, y0, x1, y1], fill=floor)
        hatch_floor(draw, x0, y0, x1, y1, color=(255, 255, 255, 18))
        draw.rectangle([x0, y0, x1, y1], outline=WALL, width=5)
        if room["kind"] == "corridor":
            label(draw, (x0 + x1) / 2, y1 + 22, "Gallery Link · 6 x 6 m", font(14, bold=True),
                  PAPER_DIM, anchor="ma")
        else:
            label(draw, (x0 + x1) / 2, y0 + 8, room["name"], font(19, bold=True), PAPER, anchor="ma")
            label(draw, (x0 + x1) / 2, y0 + 32, f'{room["w"]:.0f} x {room["h"]:.0f} m', font(15), GOLD, anchor="ma")

    # conduits under landmarks
    bronze = (150, 116, 62)
    for p0, p1 in [((3.6, 8.2), (8.75, 11.0)), ((8.75, 11.0), (26.0, 11.0)), ((26.0, 11.0), (44.0, 10.0)),
                   ((44.0, 10.0), (52.0, 6.5)), ((44.0, 10.0), (52.0, 13.5))]:
        draw.line([a2_px(*p0), a2_px(*p1)], fill=bronze + (220,), width=5)
    label(draw, *a2_px(19, 9.5), "bronze conduit", font(13), bronze, anchor="ma")

    # landmarks with interaction rings + tags
    for lm in VESTIBULE_LANDMARKS:
        lx, ly = a2_px(lm["x"], lm["y"])
        if lm["id"] == "soul-well":
            apron = lm["apron"] * DETAIL_SCALE
            r = lm["r"] * DETAIL_SCALE
            draw.ellipse([lx - apron, ly - apron, lx + apron, ly + apron],
                         fill=(24, 30, 34), outline=(120, 150, 160), width=4)
            draw.ellipse([lx - r, ly - r, lx + r, ly + r], fill=(46, 90, 104), outline=CYAN, width=4)
            draw.ellipse([lx - r * 0.55, ly - r * 0.55, lx + r * 0.55, ly + r * 0.55],
                         outline=(180, 240, 248), width=2)
            tag(draw, lx + 1.4 * DETAIL_SCALE, ly - 4.3 * DETAIL_SCALE, "SOUL WELL — silvery glowing "
                "pool", CYAN, f=font(17, bold=True))
            label(draw, lx + 1.5 * DETAIL_SCALE, ly - 2.9 * DETAIL_SCALE, "pool Ø 3.6 m · rim Ø 5.3 m",
                  font(13), CYAN)
        elif lm["id"] == "player-emergence":
            rr = lm["r"] * DETAIL_SCALE
            draw.ellipse([lx - rr, ly - rr, lx + rr, ly + rr], outline=(240, 240, 240), width=3)
            draw.line([lx - rr - 6, ly, lx + rr + 6, ly], fill=(240, 240, 240), width=2)
            tag(draw, lx - 0.9 * DETAIL_SCALE, ly + 0.6 * DETAIL_SCALE, "player emergence",
                (240, 240, 240), f=font(14, bold=True), anchor="ra")
        elif lm["id"] == "memory-loom":
            rr = lm["r"] * DETAIL_SCALE
            draw.rectangle([lx - rr, ly - rr * 0.7, lx + rr, ly + rr * 0.7], outline=VIOLET, width=4)
            draw.line([lx - rr, ly, lx + rr, ly], fill=VIOLET, width=2)
            dash_rect(draw, lx - 2.1 * DETAIL_SCALE, ly - 2.1 * DETAIL_SCALE,
                      lx + 2.1 * DETAIL_SCALE, ly + 2.1 * DETAIL_SCALE, VIOLET + (110,), 1, 8, 6)
            tag(draw, lx - 0.2 * DETAIL_SCALE, ly - 3.6 * DETAIL_SCALE, "MEMORY LOOM (true) — 3 stat pts · "
                "1 ancestry boon · 1 discipline", VIOLET, f=font(15, bold=True))
        elif lm["id"] == "coffer":
            rr = lm["r"] * DETAIL_SCALE
            draw.rectangle([lx - rr, ly - rr * 0.7, lx + rr, ly + rr * 0.7], outline=GOLD, width=4)
            dash_rect(draw, lx - 1.9 * DETAIL_SCALE, ly - 1.9 * DETAIL_SCALE,
                      lx + 1.9 * DETAIL_SCALE, ly + 1.9 * DETAIL_SCALE, GOLD + (110,), 1, 8, 6)
            tag(draw, lx + 0.5 * DETAIL_SCALE, ly + 1.7 * DETAIL_SCALE, "WAYFARER'S COFFER — starter gear "
                "inspection", GOLD, f=font(15, bold=True))
        elif lm["id"] == "effigy":
            rr = lm["r"] * DETAIL_SCALE
            draw.ellipse([lx - rr, ly - rr, lx + rr, ly + rr], outline=(200, 170, 120), width=4)
            draw.line([lx, ly - rr, lx, ly + rr], fill=(200, 170, 120), width=3)
            dash_rect(draw, lx - 2.2 * DETAIL_SCALE, ly - 2.2 * DETAIL_SCALE,
                      lx + 2.2 * DETAIL_SCALE, ly + 2.2 * DETAIL_SCALE, (200, 170, 120, 110), 1, 8, 6)
            tag(draw, lx - 0.4 * DETAIL_SCALE, ly - 3.4 * DETAIL_SCALE, "TRUE TRAINING EFFIGY — level-one "
                "rehearsal", (200, 170, 120), f=font(15, bold=True))
        elif lm["id"] == "ilyra":
            rr = lm["r"] * DETAIL_SCALE
            draw.ellipse([lx - rr, ly - rr, lx + rr, ly + rr], fill=GREEN)
            draw.ellipse([lx - 2 * DETAIL_SCALE, ly - 2 * DETAIL_SCALE, lx + 2 * DETAIL_SCALE,
                          ly + 2 * DETAIL_SCALE], outline=GREEN + (90,), width=1)
            tag(draw, lx + 1.4 * DETAIL_SCALE, ly + 0.8 * DETAIL_SCALE, "WELLKEEPER ILYRA",
                GREEN, f=font(14, bold=True))
            label(draw, lx + 1.6 * DETAIL_SCALE, ly + 2.5 * DETAIL_SCALE, "Chronicle of Returning",
                  font(12), GREEN)

    # plaza NPCs + doors
    for lm in PLAZA_LANDMARKS:
        lx, ly = a2_px(36.0 + lm["x"], 4.0 + lm["y"])  # plaza landmarks are room-local
        if lm["id"].startswith("door-"):
            color = CYAN if lm["id"] == "door-wayfarer" else EMBER
            draw_door(draw, lx, ly, lm["w"], "E", color)
            label(draw, lx + 0.7 * DETAIL_SCALE, ly - 12,
                  "WAYFARER DOOR (easy) — soul-cyan" if lm["id"] == "door-wayfarer"
                  else "OATHBREAKER DOOR (hard) — ember-red",
                  font(15, bold=True), color)
        else:
            rr = lm["r"] * DETAIL_SCALE
            draw.ellipse([lx - rr, ly - rr, lx + rr, ly + rr], fill=GREEN)
            draw.ellipse([lx - 2 * DETAIL_SCALE, ly - 2 * DETAIL_SCALE, lx + 2 * DETAIL_SCALE,
                          ly + 2 * DETAIL_SCALE], outline=GREEN + (90,), width=1)
            tag(draw, lx - 0.9 * DETAIL_SCALE, ly - 0.5 * DETAIL_SCALE,
                "BREACH SCOUT ORREN" if lm["id"] == "orren" else "ARENA WARDEN BRANNOC",
                GREEN, f=font(14, bold=True), anchor="ra")

    # authored kit dressing + wall art + books — numbered glyphs, decoded below
    draw_dressing(draw, FIXED_DRESSING["vestibule"],
                  lambda mx, my: a2_px(mx, my), DETAIL_SCALE, numbered=True, fsize=12, start=0)
    draw_wall_art(draw, WALL_ART["vestibule"], lambda mx, my: a2_px(mx, my), DETAIL_SCALE,
                  start=len(FIXED_DRESSING["vestibule"]), fsize=12)
    draw_dressing(draw, BOOK_PROPS["vestibule"],
                  lambda mx, my: a2_px(mx, my), DETAIL_SCALE, numbered=True, fsize=12,
                  start=len(FIXED_DRESSING["vestibule"]) + len(WALL_ART["vestibule"]))
    plaza_start = len(FIXED_DRESSING["vestibule"]) + len(WALL_ART["vestibule"]) + len(BOOK_PROPS["vestibule"])
    draw_dressing(draw, FIXED_DRESSING["threshold-plaza"],
                  lambda mx, my: a2_px(36.0 + mx, 4.0 + my), DETAIL_SCALE, numbered=True, fsize=12,
                  start=plaza_start)
    draw_wall_art(draw, WALL_ART["threshold-plaza"], lambda mx, my: a2_px(36.0 + mx, 4.0 + my),
                  DETAIL_SCALE, start=plaza_start + len(FIXED_DRESSING["threshold-plaza"]), fsize=12)
    link_start = plaza_start + len(FIXED_DRESSING["threshold-plaza"]) + len(WALL_ART["threshold-plaza"])
    draw_dressing(draw, FIXED_DRESSING["plaza-link"],
                  lambda mx, my: a2_px(30.0 + mx, 8.0 + my), DETAIL_SCALE, numbered=True, fsize=12,
                  start=link_start)

    # numbered dressing list (wrapped, full panel width)
    list_f = font(14)
    ly0 = A2_Y0 + 500
    vestibule_art_start = len(FIXED_DRESSING["vestibule"]) + 1
    vestibule_books_start = vestibule_art_start + len(WALL_ART["vestibule"])
    plaza_art_start = plaza_start + len(FIXED_DRESSING["threshold-plaza"]) + 1
    label(draw, A2_X0 + 24, ly0,
          f"KIT DRESSING + WALL ART — Vestibule 1–{plaza_start} "
          f"(art {vestibule_art_start}–{vestibule_books_start - 1}, books {vestibule_books_start}–{plaza_start}) · "
          f"Plaza {plaza_start + 1}–{link_start} (art {plaza_art_start}–{link_start}) · "
          f"Link {link_start + 1}–{link_start + len(FIXED_DRESSING['plaza-link'])}:",
          font(15, bold=True), PAPER)
    flow = [a for a, _x, _y in FIXED_DRESSING["vestibule"]] \
        + [aid for aid, _x, _y, _w in WALL_ART["vestibule"]] \
        + [item[0] for item in BOOK_PROPS["vestibule"]] \
        + [a for a, _x, _y in FIXED_DRESSING["threshold-plaza"]] \
        + [aid for aid, _x, _y, _w in WALL_ART["threshold-plaza"]] \
        + [a for a, _x, _y in FIXED_DRESSING["plaza-link"]]
    line = ""
    ty = ly0 + 24
    for n, name in enumerate(flow):
        chunk = f"{n + 1}·{name}"
        cand = (line + "  " + chunk).strip()
        if draw.textlength(cand, font=list_f) > 1160:
            label(draw, A2_X0 + 24, ty, line, list_f, (200, 195, 180))
            ty += 20
            line = chunk
        else:
            line = cand
    if line:
        label(draw, A2_X0 + 24, ty, line, list_f, (200, 195, 180))
        ty += 20

    label(draw, A2_X0 + 24, A2_Y0 + 650,
          "dashed rings = 2 m interaction clearances — navigation stays open among start, Ilyra, Loom, coffer, effigy, "
          "and both gates (LEVEL_01) · doors locked until the tutorial seals · touching a door opens the voiced "
          "Wayfarer/Oathbreaker comparison — never silent commit", font(15), PAPER_DIM)

# ---------------------------------------------------------------------------
# Panels B/C — room pools at true size
# ---------------------------------------------------------------------------
def draw_pool(draw: ImageDraw.ImageDraw, x0: int, y0: int, title: str, color,
              pool: list[dict], note: str) -> None:
    draw.rectangle([x0 - 12, y0 - 46, x0 + POOL_PANEL_W, y0 + POOL_FRAME_H], fill=PANEL,
                   outline=PANEL_EDGE, width=2)
    label(draw, x0, y0 - 38, title, font(28, bold=True), color)
    label(draw, x0, y0 + POOL_FRAME_H - 40, note, font(17), PAPER_DIM)
    label(draw, x0 + POOL_PANEL_W - 10, y0 + POOL_FRAME_H - 40, "numbered glyphs = placed kit assets",
          font(15), PAPER_DIM, anchor="ra")
    cols = 4
    cell_w, cell_h = 288, POOL_CELL_H
    for i, room in enumerate(pool):
        cx = x0 + (i % cols) * cell_w + 18
        cy = y0 + (i // cols) * cell_h + 14
        w_px, h_px = room["w"] * PPM, room["h"] * PPM
        floor = STONE if pool is EASY_POOL else STONE_HARD
        rx0, ry0, rx1, ry1 = draw_room(draw, cx, cy, room["w"], room["h"], floor=floor,
                                       wall=color, wall_w=4)
        for s in room["sockets"]:
            if s == "W":
                draw_door(draw, rx0, (ry0 + ry1) / 2, 2.5, "W", PAPER)
            elif s == "E":
                draw_door(draw, rx1, (ry0 + ry1) / 2, 2.5, "E", PAPER)
            elif s == "N":
                draw_door(draw, (rx0 + rx1) / 2, ry0, 2.5, "N", PAPER)
            else:
                draw_door(draw, (rx0 + rx1) / 2, ry1, 2.5, "S", PAPER)
        # enemy spawn sockets (red diamonds) along the mid lane
        for k in range(room["spawns"]):
            sx = rx0 + (k + 1) * (w_px / (room["spawns"] + 1))
            sy = ry0 + h_px * 0.42
            draw.polygon([(sx, sy - 6), (sx + 6, sy), (sx, sy + 6), (sx - 6, sy)],
                         outline=RED, width=2)
        # authored kit placement (numbered) — includes the loot chest
        items = list(DRESSING[room["id"]])
        art = WALL_ART.get(room["id"], [])
        books = BOOK_PROPS.get(room["id"], [])
        to_px = lambda mx, my, _cx=cx, _cy=cy: (_cx + mx * PPM, _cy + my * PPM)
        draw_dressing(draw, items, to_px, PPM, numbered=True, fsize=12)
        draw_wall_art(draw, art, to_px, PPM, start=len(items), fsize=12)
        draw_dressing(draw, books, to_px, PPM, numbered=True, fsize=12,
                      start=len(items) + len(art))
        all_named = [a for a, _x, _y in items] + [aid for aid, _x, _y, _w in art] \
            + [item[0] for item in books]
        label(draw, cx, cy + h_px + 6, f"{room['id']} · {room['name']}", font(19, bold=True), PAPER)
        label(draw, cx, cy + h_px + 30, f"{room['w']:.0f} x {room['h']:.0f} m = {room['w']*room['h']:.0f} m2",
              font(16, bold=True), GOLD)
        label(draw, cx, cy + h_px + 52,
              f"doors {'/'.join(room['sockets'])} · spawn sockets {room['spawns']} · chest 1",
              font(15), PAPER_DIM)
        label(draw, cx, cy + h_px + 72, room["flavor"], font(15), (170, 168, 158))
        # kit placement list (numbered, wrapped)
        kit_f = font(13)
        line = ""
        ty = cy + h_px + 92
        for n, name in enumerate(all_named):
            chunk = f"{n + 1}·{name}"
            cand = (line + "  " + chunk).strip()
            if draw.textlength(cand, font=kit_f) > cell_w - 30:
                label(draw, cx, ty, line, kit_f, (200, 195, 180))
                ty += 17
                line = chunk
            else:
                line = cand
        if line:
            label(draw, cx, ty, line, kit_f, (200, 195, 180))


# ---------------------------------------------------------------------------
# Rail — legend + tables
# ---------------------------------------------------------------------------
def rail_section(draw, y, title):
    label(draw, RAIL_X0, y, title, font(24, bold=True), PAPER)
    draw.line([RAIL_X0, y + 32, RAIL_X0 + RAIL_W - 20, y + 32], fill=PANEL_EDGE, width=2)
    return y + 44


def wrap_label(draw, x, y, text, f, fill, width_px, line_h):
    """Draw wrapped text; returns y after the block."""
    words, line = text.split(), ""
    for w in words:
        if draw.textlength((line + " " + w).strip(), font=f) > width_px:
            label(draw, x, y, line, f, fill)
            y += line_h
            line = w
        else:
            line = (line + " " + w).strip()
    if line:
        label(draw, x, y, line, f, fill)
        y += line_h
    return y


def draw_rail(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([RAIL_X0 - 14, RAIL_Y0 - 46, RAIL_X0 + RAIL_W, 2240], fill=PANEL,
                   outline=PANEL_EDGE, width=2)
    label(draw, RAIL_X0, RAIL_Y0 - 38, "B · TABLES — RNG picks subset + order, never what exists",
          font(23, bold=True), PAPER)
    y = RAIL_Y0

    y = rail_section(draw, y, "LEGEND")
    items = [
        (WALL, "fixed architecture (same every run)"),
        (CYAN, "Wayfarer / soul machinery / easy path"),
        (EMBER, "Oathbreaker / breach corruption / hard"),
        (GOLD, "loot socket / locked door"),
        (RED, "enemy spawn socket"),
        (GREEN, "NPC / safe zone / exit"),
        (VIOLET, "Memory Loom / First Memory"),
        ((190, 160, 110), "prop socket (dressing seed)"),
        ((150, 116, 62), "bronze conduit (loom-well-doors)"),
        (GROUP_COLORS["art"], "wall art — framed, zoom-readable (§5A)"),
        (GROUP_COLORS["books"], "books / scrolls (texture props)"),
    ]
    for color, text in items:
        draw.rectangle([RAIL_X0, y + 3, RAIL_X0 + 22, y + 21], fill=color)
        label(draw, RAIL_X0 + 32, y, text, font(18), PAPER_DIM)
        y += 28
    y += 12

    y = rail_section(draw, y, "SPAWN TABLE (per run)")
    for path, color in (("wayfarer", CYAN), ("oathbreaker", EMBER)):
        t = SPAWN_TABLE[path]
        label(draw, RAIL_X0, y, path.upper(), font(19, bold=True), color)
        y += 27
        for k in ("enemies", "distribution", "health", "damage", "galleryPressure", "bossPressure"):
            y = wrap_label(draw, RAIL_X0 + 14, y, f"{k}: {t[k]}", font(16), PAPER_DIM, RAIL_W - 60, 22)
        y += 4
    y = wrap_label(draw, RAIL_X0, y,
                   "Boss: Cinderbound Warden — seeded pattern (cinder-sweep / ash-call / soul-tax), readable telegraph",
                   font(16, bold=True), PAPER, RAIL_W - 30, 22)
    y += 14

    y = rail_section(draw, y, "LOOT TABLE")
    for path, color in (("wayfarer", CYAN), ("oathbreaker", EMBER)):
        t = LOOT_TABLE[path]
        label(draw, RAIL_X0, y, path.upper(), font(19, bold=True), color)
        y += 27
        y = wrap_label(draw, RAIL_X0 + 14, y, f"reward: {t['pathReward']}", font(16), PAPER_DIM, RAIL_W - 60, 22)
        y = wrap_label(draw, RAIL_X0 + 14, y, f"caches: {t['caches']}", font(16), PAPER_DIM, RAIL_W - 60, 22)
        y = wrap_label(draw, RAIL_X0 + 14, y, f"bonus: {t['bonus']}", font(16), PAPER_DIM, RAIL_W - 60, 22)
        y += 4
    y += 12

    y = rail_section(draw, y, "PROP TABLES (dungeon-kit IDs)")
    for name, key, color in (("Vestibule (fixed)", "vestibule", PAPER), ("EASY pool", "easy", CYAN),
                             ("HARD pool", "hard", EMBER), ("Boss suite", "boss-suite", EMBER)):
        label(draw, RAIL_X0, y, name, font(18, bold=True), color)
        y += 25
        y = wrap_label(draw, RAIL_X0 + 14, y, ", ".join(PROP_TABLE[key]), font(15), PAPER_DIM, RAIL_W - 50, 21)
        y += 8
    y += 6

    y = rail_section(draw, y, "BOSS SET")
    y = wrap_label(draw, RAIL_X0 + 14, y,
                   f"per run: {BOSS_SET['perRun']}x Cinderbound Warden (weight 1). 3 boss-anchor sockets + set "
                   "architecture keep future 3-of-6 boss sets possible; BREACH-V2 ships exactly one.",
                   font(16), PAPER_DIM, RAIL_W - 40, 22)
    y += 10

    y = rail_section(draw, y, "SEED POLICY")
    for k in ("layoutSeed", "dressingSeed", "rng", "validation"):
        y = wrap_label(draw, RAIL_X0 + 14, y, f"{k}: {SEED_POLICY[k]}", font(15), PAPER_DIM, RAIL_W - 40, 21)
    label(draw, RAIL_X0 + 14, y, "comparison seed: 4182 (kept from #450)", font(15, bold=True), GOLD)


# ---------------------------------------------------------------------------
# Run assembly strip + corruption gradient
# ---------------------------------------------------------------------------
def draw_strips(draw: ImageDraw.ImageDraw) -> None:
    # C — run assembly, right column, 2 rows x 4 steps
    draw.rectangle([1290, STRIP_C_Y0 - 46, 2470, STRIP_C_Y0 + 340], fill=PANEL, outline=PANEL_EDGE, width=2)
    label(draw, 1302, STRIP_C_Y0 - 38, "C · HOW A RUN ASSEMBLES (seed picks subset + order only)",
          font(23, bold=True), PAPER)
    steps = [
        ("Vestibule", "fixed · +0.0 m", PAPER), ("Threshold Plaza", "fixed · safe · +0.8 m", GREEN),
        ("door choice", "Wayfarer / Oathbreaker", GOLD),
        ("3–5 seeded chambers", "path pool · +1.6→+4.8 m", CYAN),
        ("Convergence", "fixed · +5.6 m", PAPER), ("Ashen Lock", "fixed · 1 boss · +6.8 m", EMBER),
        ("First Memory", "once · +7.6 m", VIOLET), ("Way Upward → hv-1", "stairs · +7.9→+10.4 m", GREEN),
    ]
    for i, (name, sub, color) in enumerate(steps):
        x = 1310 + (i % 4) * 292
        y = STRIP_C_Y0 + 28 + (i // 4) * 150
        w = 270
        draw.rectangle([x, y, x + w, y + 110], fill=(26, 28, 32), outline=color, width=3)
        label(draw, x + w / 2, y + 26, name, font(19, bold=True), PAPER, anchor="ma")
        label(draw, x + w / 2, y + 58, sub, font(16), color, anchor="ma")
        if i % 4 < 3:
            ax = x + w + 3
            draw.polygon([(ax, y + 48), (ax + 16, y + 55), (ax, y + 62)], fill=PAPER_DIM)
        elif i == 3:
            ax = x + w / 2
            draw.polygon([(ax - 7, y + 116), (ax + 7, y + 116), (ax, y + 132)], fill=PAPER_DIM)
    label(draw, 1310, STRIP_C_Y0 + 306,
          "locked doors until tutorial seals · voiced comparison on touch", font(15), PAPER_DIM)

    # D — corruption gradient, right column
    gy = STRIP_D_Y0
    draw.rectangle([1290, gy - 46, 2470, gy + 220], fill=PANEL, outline=PANEL_EDGE, width=2)
    label(draw, 1302, gy - 38, "D · CORRUPTION LANGUAGE — densest at the Ashen Lock", font(23, bold=True), PAPER)
    x = 1310
    y = gy + 20
    for name, level in CORRUPTION_GRADIENT:
        w = 137
        c = (int(40 + 180 * level), int(38 - 18 * level), int(34 + 20 * level))
        draw.rectangle([x, y, x + w, y + 92], fill=c, outline=EMBER if level > 0.5 else PANEL_EDGE, width=2)
        words = name.split(" ")
        lines, cur = [], ""
        for word in words:
            if draw.textlength((cur + " " + word).strip(), font=font(13, bold=True)) > w - 10:
                lines.append(cur)
                cur = word
            else:
                cur = (cur + " " + word).strip()
        lines.append(cur)
        for li, ln in enumerate(lines[:3]):
            label(draw, x + w / 2, y + 8 + li * 18, ln, font(13, bold=True), PAPER, anchor="ma")
        label(draw, x + w / 2, y + 68, f"{level:.2f}", font(14), PAPER_DIM, anchor="ma")
        x += w + 12
    label(draw, 1310, gy + 130,
          "silvery/machinic accents + breachling growth rise with depth · mortal-tier magic only (levels 1–19)",
          font(15), PAPER_DIM)
    label(draw, 1310, gy + 154, "exit Connector fades toward Heartvale daylight", font(15), PAPER_DIM)


# ---------------------------------------------------------------------------
# Footer — scale bar
# ---------------------------------------------------------------------------
def draw_footer(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([0, FOOTER_Y0, CANVAS_W, CANVAS_H], fill=(10, 11, 13))
    draw.line([0, FOOTER_Y0, CANVAS_W, FOOTER_Y0], fill=PANEL_EDGE, width=2)
    bx, by = 60, FOOTER_Y0 + 44
    for m in range(0, 21, 5):
        x = bx + m * PPM
        draw.line([x, by - 10, x, by + 10], fill=PAPER, width=3)
        label(draw, x, by + 16, f"{m}", font(17, bold=True), PAPER, anchor="ma")
    draw.line([bx, by, bx + 20 * PPM, by], fill=PAPER, width=4)
    for m in range(20):
        if m % 2 == 0:
            draw.rectangle([bx + m * PPM, by - 5, bx + (m + 1) * PPM, by + 5], fill=PAPER_DIM)
    label(draw, bx, by - 36, "SCALE — meters (uniform 9 px/m on master)", font(18, bold=True), PAPER)
    label(draw, bx + 440, by - 36, "engine nav cell = 1.75 m (hidden under continuous geometry at runtime)",
          font(16), PAPER_DIM)
    label(draw, bx, by + 44,
          "Master PNG: workspace souldrifter-thalenyr/flatmaps/breach-v2/ · shipped: docs/maps/breach-v2/breach-v2-flatmap-1600.webp (WebP q75) · "
          "registry derived measured-only from this map", font(16), PAPER_DIM)
    label(draw, CANVAS_W - 40, FOOTER_Y0 + 44, "BREACH-V2 · 2026-08-24 · v3 (ascent + portal audit)",
          font(18, bold=True), PAPER_DIM, anchor="ra")


def main() -> None:
    img = Image.new("RGB", (CANVAS_W, CANVAS_H), INK)
    draw = ImageDraw.Draw(img, "RGBA")
    draw_header(draw)
    draw_spine(draw)
    draw_vestibule_detail(draw)
    draw_pool(draw, 40, POOLS_Y0, "B1 · WAYFARER (EASY) POOL — 7 rooms, true size; 3–5 drawn per run", CYAN,
              EASY_POOL, "roomy · forgiving · standard loot · corruption ~0.25 · easy rooms never appear on the hard path")
    draw_pool(draw, 1290, POOLS_Y0, "B2 · OATHBREAKER (HARD) POOL — 7 rooms, true size; 3–5 drawn per run", EMBER,
              HARD_POOL, "tighter · denser spawns · better loot · corruption ~0.45 · hard rooms never appear on the easy path")
    draw_rail(draw)
    draw_strips(draw)
    draw_footer(draw)
    img.save(MASTER)
    export = img.resize((1600, round(CANVAS_H * 1600 / CANVAS_W)), Image.LANCZOS)
    export.save(EXPORT, quality=75, method=6)
    print(f"master: {MASTER} {img.size}")
    print(f"export: {EXPORT} {export.size} {EXPORT.stat().st_size/1024:.0f} KiB")


if __name__ == "__main__":
    main()
