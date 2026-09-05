#!/usr/bin/env hython
"""Reduce heavy Poly Haven assets to cached LOD prototypes (.bgeo.sc).

Runs once per asset; the Heartvale build then references the cached prototype
instead of the multi-million-prim LOD0 glTF, keeping scene builds fast and the
committed hip lean. Idempotent: assets with an existing cache are skipped.

Usage (from SoulDrifterWeb):
  hython scripts/houdini/reduce-polyhaven-assets.py [asset_id ...]
With no arguments, reduces the default table below.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import hou

REPO_ROOT = Path(__file__).resolve().parents[2]
PH_ROOT = REPO_ROOT / "source-assets" / "polyhaven"

# asset_id -> target primitive count after reduction
REDUCTION_TABLE = {
    "tree_small_02": 60_000,
    "island_tree_01": 55_000,
    "island_tree_02": 50_000,
    "island_tree_03": 55_000,
    "shrub_01": 12_000,
    "wild_rooibos_bush": 8_000,
    "grass_medium_01": 6_000,
    "rock_moss_set_01": 14_000,
    "rock_moss_set_02": 14_000,
    "boulder_01": 9_000,
    "stone_01": 2_500,
    "dead_tree_trunk": 10_000,
    "tree_stump_01": 7_000,
}


def reduce_asset(aid: str, target: int) -> None:
    cache = PH_ROOT / aid / f"{aid}_lod.bgeo.sc"
    if cache.is_file():
        print(f"{aid}: cache exists, skipping")
        return
    source = PH_ROOT / aid / f"{aid}.gltf"
    if not source.is_file():
        print(f"{aid}: MISSING gltf, skipping")
        return

    started = time.time()
    geo = hou.Geometry()
    geo.loadFromFile(source.as_posix())

    # Flatten the packed glTF prims into plain polygons.
    flat = hou.Geometry()
    for prim in geo.prims():
        if prim.type() == hou.primType.PackedGeometry:
            flat.merge(prim.getEmbeddedGeometry())
        else:
            flat.merge(geo)
            break
    before = len(flat.prims())
    if before <= target:
        print(f"{aid}: {before} prims <= target {target}, caching unreduced")
        flat.saveToFile(cache.as_posix())
        return

    obj = hou.node("/obj")
    temp = obj.createNode("geo", f"REDUCE_{aid.upper()}")
    for child in temp.children():
        child.destroy()
    stash = temp.createNode("stash", "SRC")
    stash.parm("stash").set(flat)
    reduce = temp.createNode("polyreduce::2.0", "REDUCE")
    reduce.setInput(0, stash)
    reduce.parm("percentage").set(max(0.1, target / before * 100.0))
    out = reduce.geometry()
    print(f"{aid}: {before} -> {len(out.prims())} prims in {time.time() - started:.0f}s")
    out.saveToFile(cache.as_posix())
    temp.destroy()


def main() -> None:
    ids = sys.argv[1:] or list(REDUCTION_TABLE)
    for aid in ids:
        reduce_asset(aid, REDUCTION_TABLE.get(aid, 10_000))


if __name__ == "__main__":
    main()
