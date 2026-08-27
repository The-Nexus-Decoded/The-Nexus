"""Export breach-v2-registry.mjs from breach_v2_design.py (measured-only).

The flat map (docs/maps/breach-v2/breach-v2-flatmap-1600.webp) is the source
of truth; breach_v2_design.py is its machine-readable twin. This exporter
derives the dungeon registry module (runbook §3) so the two can never drift.

Run from scripts/maps/ (or the workspace flatmaps/breach-v2/ mirror):
  python export_breach_v2_registry.py <game-root>     # writes
  <game-root>/src/game/dungeons/breach-v2-registry.mjs
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from breach_v2_design import (  # noqa: E402
    ASSET_META, BOOK_PROPS, BOSS_ANCHOR_SOCKETS, BOSS_RUNE_CIRCLE, BOSS_SET,
    CORRIDOR_WIDTH, CORRUPTION_GRADIENT, DRESSING, EASY_POOL, FIXED_DRESSING,
    FIXED_ROOMS, HARD_POOL, KIT_DIMS, LOOT_TABLE, PATH_SLOTS, PLAZA_LANDMARKS,
    PROP_TABLE, SEED_POLICY, SPAWN_TABLE, VESTIBULE_LANDMARKS, WALL_ART,
    WAY_UPWARD_EXIT_ELEVATION, WORLD_ANCHOR,
)

ROOM_INDEX = {r["id"]: r for r in FIXED_ROOMS}
BLOCKING_ASSETS = {"hanging-iron-cage"}


def facing(room_w, room_h, x, y, placement):
    """Inward surface normal for wall/ceiling placements (nearest wall wins)."""
    if placement == "ceiling":
        return "down"
    if placement != "wall":
        return "up"
    dists = {"W": x, "E": room_w - x, "N": y, "S": room_h - y}
    wall = min(dists, key=dists.get)
    return {"W": "east", "E": "west", "N": "south", "S": "north"}[wall]


def placements(room_id, room_w, room_h):
    """Merge dressing + wall art + book props into placement-metadata records."""
    out = []
    for asset, x, y in FIXED_DRESSING.get(room_id, DRESSING.get(room_id, [])):
        group, placement = ASSET_META[asset]
        height, footprint = KIT_DIMS[asset]
        out.append(dict(asset=asset, x=x, y=y, placement=placement, group=group,
                        facing=facing(room_w, room_h, x, y, placement),
                        height=height, footprint=footprint,
                        blocking=asset in BLOCKING_ASSETS or (
                            group in ("loot", "furniture", "structure", "rubble", "corruption")
                            and asset not in ("bone-pile", "iron-floor-grate", "shed-chitin-pile",
                                              "weapon-armor-heap", "bottles-jugs-crockery-cluster",
                                              "supply-pile", "candelabra-cluster", "wall-torch-sconce",
                                              "heavy-door")
                        ),
                        role=("loot-cache" if asset == "storage-chest" else
                              "destructible-cover" if asset in (
                                  "storage-barrel", "reinforced-crate", "broken-handcart"
                              ) else "dressing")))
    for art_id, x, y, w_m in WALL_ART.get(room_id, []):
        out.append(dict(asset=art_id, x=x, y=y, width=w_m, placement="wall", group="art",
                        facing=facing(room_w, room_h, x, y, "wall"), blocking=False,
                        height=round(w_m * 0.7, 2), footprint=w_m,
                        role="wall-art"))
    for asset, x, y, *rest in BOOK_PROPS.get(room_id, []):
        height, footprint = KIT_DIMS[asset]
        out.append(dict(asset=asset, x=x, y=y, placement="floor", group="books",
                        facing="up", height=height, footprint=footprint,
                        elevation=rest[0] if rest else 0.0,
                        blocking=False, role="readable-props"))
    return out


def door_sockets(sockets, w, h):
    pos = {"W": (0.0, h / 2), "E": (w, h / 2), "N": (w / 2, 0.0), "S": (w / 2, h)}
    return [dict(side=s, x=pos[s][0], y=pos[s][1]) for s in sockets]


def spawn_sockets(n, w, h):
    return [dict(x=(k + 1) * w / (n + 1), y=0.42 * h) for k in range(n)]


def pool_room(room):
    items = DRESSING[room["id"]]
    return dict(
        id=room["id"], name=room["name"], kind="gallery", pool=None,  # pool set by caller
        w=room["w"], h=room["h"], flavor=room["flavor"],
        doors=door_sockets(room["sockets"], room["w"], room["h"]),
        spawnSockets=spawn_sockets(room["spawns"], room["w"], room["h"]),
        placements=placements(room["id"], room["w"], room["h"]),
    )


def main():
    game_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    out_path = game_root / "src" / "game" / "dungeons" / "breach-v2-registry.mjs"

    vestibule = ROOM_INDEX["vestibule"]
    landmarks = []
    for lm in VESTIBULE_LANDMARKS:
        entry = dict(lm)
        entry["roomId"] = "vestibule"
        landmarks.append(entry)
    for lm in PLAZA_LANDMARKS:
        entry = dict(lm)
        entry["roomId"] = "threshold-plaza"
        landmarks.append(entry)

    fixed = []
    for room in FIXED_ROOMS:
        fixed.append(dict(
            id=room["id"], name=room["name"], kind=room["kind"],
            x=room["x"], y=room["y"], w=room["w"], h=room["h"],
            floorElevation=room["elevation"], notes=room["notes"],
            placements=placements(room["id"], room["w"], room["h"]),
        ))

    easy = [dict(pool_room(r), pool="easy") for r in EASY_POOL]
    hard = [dict(pool_room(r), pool="hard") for r in HARD_POOL]

    registry = {
        "id": "breach-v2",
        "sourceMap": "docs/maps/breach-v2/breach-v2-flatmap-1600.webp",
        "units": {"meters": True, "navCellMeters": 1.75,
                  "note": "true world-frame meters; nav cell hidden under continuous geometry"},
        "worldAnchor": {"zone": WORLD_ANCHOR["zone"], "x": WORLD_ANCHOR["x"], "z": WORLD_ANCHOR["y"],
                        "elevation": WAY_UPWARD_EXIT_ELEVATION,
                        "note": "exit Connector emerges at the Soul Well Basin POI (Heartvale hv-1)"},
        "fixedRooms": fixed,
        "landmarks": landmarks,
        "paths": {
            "wayfarer": {"difficulty": "easy", "pool": "easy", "minChambers": 3, "maxChambers": 5,
                         "corridorWidthMeters": CORRIDOR_WIDTH["wayfarer"],
                         "slotCenters": [[s["x"], s["y"]] for s in PATH_SLOTS["wayfarer"]],
                         "slotElevations": [s["elevation"] for s in PATH_SLOTS["wayfarer"]],
                         "convergenceSocket": [176.0, 8.0]},
            "oathbreaker": {"difficulty": "hard", "pool": "hard", "minChambers": 3, "maxChambers": 5,
                            "corridorWidthMeters": CORRIDOR_WIDTH["oathbreaker"],
                            "slotCenters": [[s["x"], s["y"]] for s in PATH_SLOTS["oathbreaker"]],
                            "slotElevations": [s["elevation"] for s in PATH_SLOTS["oathbreaker"]],
                            "convergenceSocket": [176.0, 12.0]},
        },
        "pools": {"easy": easy, "hard": hard},
        "bossSet": {"bosses": BOSS_SET["bosses"], "perRun": BOSS_SET["perRun"],
                    "note": BOSS_SET["note"],
                    "activeAnchor": BOSS_SET["activeAnchor"],
                    "anchorSockets": [list(a) for a in BOSS_ANCHOR_SOCKETS],
                    "runeCircle": BOSS_RUNE_CIRCLE},
        "tables": {"spawn": SPAWN_TABLE, "loot": LOOT_TABLE, "props": PROP_TABLE},
        "corruption": [{"area": n, "level": v} for n, v in CORRUPTION_GRADIENT],
        "seedPolicy": dict(SEED_POLICY),
        "invariants": {
            "chambersPerRun": [3, 5],
            "poolSeparation": "easy rooms never appear on the hard path and vice versa",
            "noDuplicateRooms": "a run never draws the same pool room twice",
            "reachability": "start -> boss -> exit connected on every seed; every objective reachable",
            "socketIntegrity": "every chamber connects through real door sockets; corridor widths fixed",
            "noBlockedCriticals": "dressing never blocks doors, NPCs, spawns, quest objects, boss route",
            "monotonicAscent": "every authored route rises from the Realm-Lock floor to Heartvale",
            "firstMemoryOnce": "the First Memory is awarded exactly once",
            "comparisonSeed": 4182,
        },
    }

    body = json.dumps(registry, indent=2, ensure_ascii=False)
    header = '''/**
 * BREACH-V2 dungeon registry — single source of truth for the starting zone
 * (runbook §3, issue #451). DERIVED measured-only from the flat map:
 *   docs/maps/breach-v2/breach-v2-flatmap-1600.webp
 * via scripts/maps/breach_v2_design.py + export_breach_v2_registry.py.
 * Do not hand-edit numbers here; edit the design module and re-export.
 *
 * Layout: fixed Vestibule -> Threshold Plaza (two doors) -> seeded 3-5 chamber
 * path (easy pool for Wayfarer, hard pool for Oathbreaker) -> Convergence ->
 * Ashen Lock (Cinderbound Warden, boss set 1 of 1) -> First Memory Vault ->
 * Way Upward exit Connector into Heartvale hv-1 (Soul Well Basin).
 *
 * Placement records carry the §6 minimum metadata: roomId (via parent room),
 * asset/type, x/y in local room meters, placement + facing normal, blocking,
 * role, footprint + height (mirrors of DungeonPropCatalog.ts, asserted 1:1 by
 * tests/breachV2Registry.test.mjs — the catalog stays the runtime authority),
 * and (for wall art) width.
 */

export const BREACH_V2_REGISTRY = '''
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(header + body + ";\n", encoding="utf-8")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
