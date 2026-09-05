#!/usr/bin/env hython
"""Export pre-decimated Poly Haven LOD bgeos to per-material glTFs.

Reads source-assets/polyhaven/<id>/<id>_lod.bgeo.sc (uv, N, gltf_material_name),
splits prims by material name, and writes one glTF per material slot to
public/assets/zones/heartvale/models/<id>/<id>.lod.<slot>.gltf so the runtime
can bind the correct full-res 1k textures (leaves need alpha cutout, trunks
are opaque). Buffer URIs are rewritten to relative basenames for web serving.

Assets without a _lod.bgeo.sc are small enough to ship as their original
full-res glTF and are skipped here by design.

Run:
    "H:/Program Files/Side Effects Software/Houdini 22.0.368/bin/hython.exe" \
        scripts/houdini/export-lod-gltf.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import hou

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "source-assets" / "polyhaven"
DST = REPO / "public" / "assets" / "zones" / "heartvale" / "models"

ASSETS = [
    "tree_small_02", "island_tree_01", "island_tree_02", "island_tree_03",
    "shrub_01", "wild_rooibos_bush",
    "boulder_01", "stone_01", "grass_medium_01",
]

TMP = REPO / "source-assets" / "polyhaven" / "_tmp_lod.bgeo.sc"


def fix_buffer_uris(gltf_path: Path) -> None:
    """Rewrite absolute buffer URIs to relative basenames (raw text — the ROP
    may emit backslashes that are not valid JSON escapes)."""
    import re
    text = gltf_path.read_text(encoding="utf-8")
    pattern = re.compile(r'("uri"\s*:\s*")([^"]*_data\.bin)(")')
    def repl(match: "re.Match[str]") -> str:
        base = Path(match.group(2).replace("/", "\\")).name
        return f"{match.group(1)}{base}{match.group(3)}"
    fixed = pattern.sub(repl, text)
    if fixed != text:
        gltf_path.write_text(fixed, encoding="utf-8")


def export_slot(geo_container: "hou.Node", file_sop: "hou.Node", blast: "hou.Node",
                asset_id: str, slot: str, material: str, total_pts: int) -> bool:
    blast.parm("group").set(f"@gltf_material_name={material}")
    out_dir = DST / asset_id
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"{asset_id}.lod.{slot}.gltf"

    rop = hou.node("/out").createNode("gltf", f"lod_out_{asset_id}_{slot}")
    rop.parm("usesoppath").set(True)
    rop.parm("soppath").set(blast.path())
    rop.parm("outputfile").set(str(target))
    try:
        rop.render(verbose=False)
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL {asset_id}/{slot}: {exc}")
        rop.destroy()
        return False
    rop.destroy()

    if not target.is_file() or target.stat().st_size == 0:
        print(f"FAIL {asset_id}/{slot}: no output")
        return False
    fix_buffer_uris(target)
    bin_size = target.with_suffix("").stat().st_size if False else 0
    data_bin = target.parent / f"{asset_id}.lod.{slot}_data.bin"
    kb = data_bin.stat().st_size // 1024 if data_bin.is_file() else 0
    print(f"OK   {asset_id}/{slot}: {kb} KB bin ({total_pts} pts total)")
    return True


def export_one(asset_id: str) -> int:
    bgeo = SRC / asset_id / f"{asset_id}_lod.bgeo.sc"
    if not bgeo.is_file():
        print(f"SKIP {asset_id}: no lod bgeo")
        return 0

    geo = hou.Geometry()
    geo.loadFromFile(str(bgeo))
    mat_attrib = geo.findPrimAttrib("gltf_material_name")
    materials = sorted(set(mat_attrib.strings())) if mat_attrib else []
    if not materials:
        materials = [""]

    # Drop any stale whole-mesh export from earlier runs.
    stale = DST / asset_id / f"{asset_id}.lod.gltf"
    if stale.is_file():
        stale.unlink()

    geo.saveToFile(str(TMP))
    container = hou.node("/obj").createNode("geo", f"lod_export_{asset_id}")
    for child in container.children():
        child.destroy()
    file_sop = container.createNode("file", "lod_file")
    file_sop.parm("file").set(str(TMP))
    blast = container.createNode("blast", "by_material")
    blast.setInput(0, file_sop)
    blast.parm("negate").set(True)  # keep group, delete rest

    ok = 0
    for material in materials:
        slot = material.replace(f"{asset_id}_", "") if material else "all"
        if export_slot(container, file_sop, blast, asset_id, slot, material, len(geo.points())):
            ok += 1

    container.destroy()
    if TMP.is_file():
        TMP.unlink()
    return ok


def main() -> int:
    total = sum(export_one(a) for a in ASSETS)
    print(f"exported {total} material-slot LOD gltfs across {len(ASSETS)} assets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
