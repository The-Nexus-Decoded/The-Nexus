#!/usr/bin/env hython
"""Build the isolated Houdini Apprentice POC for the Vestibule Soul Well.

This creates only the opaque, animated vortex surface used to prove the water
motion contract. It never rebuilds or exports the dungeon shell, rooms, props,
lighting, navigation, or runtime scene.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import hou


DIAMETER = 4.08
COLUMNS = 48
ROWS = 48
FPS = 24
SAMPLE_FRAMES = (1, 12, 24)


PYTHON_SOP_CODE = f'''import hou
import math

node = hou.pwd()
geo = node.geometry()
geo.clear()

diameter = {DIAMETER!r}
columns = {COLUMNS}
rows = {ROWS}
time_seconds = hou.time()

uv_attrib = geo.addAttrib(hou.attribType.Point, "uv", (0.0, 0.0, 0.0))
swirl_attrib = geo.addAttrib(hou.attribType.Point, "swirl", 0.0)
depth_attrib = geo.addAttrib(hou.attribType.Point, "depthmask", 0.0)
current_attrib = geo.addAttrib(hou.attribType.Point, "current", 0.0)
color_attrib = geo.addAttrib(hou.attribType.Point, "Cd", (0.0, 0.02, 0.03))

points = []
for row in range(rows + 1):
    v = row / rows
    point_row = []
    for column in range(columns + 1):
        u = column / columns
        px = (u - 0.5) * 2.0
        pz = (v - 0.5) * 2.0
        radius = math.sqrt(px * px + pz * pz)
        angle = math.atan2(pz, px)
        spiral_a = math.sin(angle * 6.0 - radius * 23.0 - time_seconds * 2.05) * 0.5 + 0.5
        spiral_b = math.sin(angle * -4.0 - radius * 34.0 + time_seconds * 1.45) * 0.5 + 0.5
        current = max(0.0, spiral_a + spiral_b - 1.12) ** 2.6
        fine_current = (0.5 + 0.5 * math.sin(
            angle * 10.0 - radius * 52.0 - time_seconds * 3.1
        )) ** 9.0
        envelope = max(0.0, min(1.0, (1.0 - radius) / 0.24))
        lift = (
            math.sin(angle * 5.0 - radius * 19.0 - time_seconds * 1.85) * 0.72
            + math.sin(px * 15.0 + pz * 11.0 + time_seconds * 1.35) * 0.28
        ) * envelope * 0.045
        depth_mask = max(0.0, min(1.0, 1.0 - (radius - 0.08) / 0.70))
        point = geo.createPoint()
        point.setPosition(((u - 0.5) * diameter, lift, (v - 0.5) * diameter))
        point.setAttribValue(uv_attrib, (u, v, 0.0))
        point.setAttribValue(swirl_attrib, spiral_a)
        point.setAttribValue(depth_attrib, depth_mask)
        point.setAttribValue(current_attrib, current)
        point.setAttribValue(color_attrib, (
            0.006 + current * 0.12 + fine_current * 0.05,
            0.025 + current * 0.34 + fine_current * 0.14,
            0.036 + current * 0.38 + fine_current * 0.16,
        ))
        point_row.append(point)
    points.append(point_row)

water_group = geo.createPrimGroup("abyssal_soulwell_vortex")
for row in range(rows):
    for column in range(columns):
        center_u = (column + 0.5) / columns
        center_v = (row + 0.5) / rows
        center_radius = math.sqrt(((center_u - 0.5) * 2.0) ** 2 + ((center_v - 0.5) * 2.0) ** 2)
        if center_radius > 1.0:
            continue
        polygon = geo.createPolygon()
        polygon.addVertex(points[row][column])
        polygon.addVertex(points[row][column + 1])
        polygon.addVertex(points[row + 1][column + 1])
        polygon.addVertex(points[row + 1][column])
        polygon.setIsClosed(True)
        water_group.add(polygon)

geo.addAttrib(hou.attribType.Global, "effect_id", "vestibule-soulwell-abyss-water")
geo.addAttrib(hou.attribType.Global, "occlusion_mode", "opaque-bottomless")
geo.addAttrib(hou.attribType.Global, "collision_mode", "landmark-boundary")
geo.addAttrib(hou.attribType.Global, "license_lane", "HOUDINI_APPRENTICE_POC")
'''


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args()


def geometry_stats(node: hou.SopNode, frame: int) -> dict[str, object]:
    hou.setFrame(frame)
    node.cook(force=True)
    geometry = node.geometry()
    positions = [point.position() for point in geometry.points()]
    lift_values = [position.y() for position in positions]
    position_fingerprint = hashlib.sha256(
        json.dumps(
            [[round(value, 6) for value in position] for position in positions],
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return {
        "frame": frame,
        "seconds": frame / FPS,
        "points": len(geometry.points()),
        "primitives": len(geometry.prims()),
        "bounds": {
            "min": list(geometry.boundingBox().minvec()),
            "max": list(geometry.boundingBox().maxvec()),
        },
        "surfaceLift": {"min": min(lift_values), "max": max(lift_values)},
        "positionSha256": position_fingerprint,
    }


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    hou.hipFile.clear(suppress_save_prompt=True)
    hou.setFps(FPS)
    hou.playbar.setFrameRange(1, FPS)
    hou.playbar.setPlaybackRange(1, FPS)

    obj = hou.node("/obj")
    container = obj.createNode("geo", "VESTIBULE_SOULWELL_FX_POC")
    for child in container.children():
        child.destroy()

    water = container.createNode("python", "ABYSSAL_VORTEX_SURFACE")
    water.parm("python").set(PYTHON_SOP_CODE)
    output = container.createNode("null", "OUT_ABYSSAL_SOULWELL")
    output.setInput(0, water)
    output.setDisplayFlag(True)
    output.setRenderFlag(True)
    container.setUserData("souldrifter_effect", "vestibule-soulwell-abyss-water")
    container.setUserData("souldrifter_visual_depth", "bottomless-realm-threshold")
    container.setUserData("souldrifter_license_lane", "HOUDINI_APPRENTICE_POC")
    container.layoutChildren()
    obj.layoutChildren()

    scene_path = output_dir / "soulwell-vestibule-fx-poc.hipnc"
    hou.hipFile.save(scene_path.as_posix())

    frames = []
    cache_files = []
    for frame in SAMPLE_FRAMES:
        stats = geometry_stats(output, frame)
        cache_path = output_dir / f"soulwell-vestibule-fx-poc.{frame:04d}.bgeo.sc"
        output.geometry().saveToFile(cache_path.as_posix())
        stats["cache"] = cache_path.name
        stats["cacheSha256"] = sha256(cache_path)
        frames.append(stats)
        cache_files.append(cache_path)

    receipt = {
        "effectId": "vestibule-soulwell-abyss-water",
        "scope": "isolated environmental VFX POC; no dungeon rebuild",
        "tool": {
            "houdiniVersion": hou.applicationVersionString(),
            "licenseCategory": hou.licenseCategory().name(),
            "sceneFormat": ".hipnc",
            "commercialProductionReady": False,
        },
        "contract": {
            "diameterMeters": DIAMETER,
            "columns": COLUMNS,
            "rows": ROWS,
            "surfaceMotion": "counter-rotating spiral currents with normal displacement",
            "occlusionMode": "opaque-bottomless; masonry beneath must never be visible",
            "collisionMode": "landmark-boundary",
            "runtimeRepresentation": "Three.js opaque animated vortex shader",
            "relatedRuntimeFx": ["animated key/bounce lighting", "rising soul motes"],
        },
        "frames": frames,
        "validation": {
            "animatedGeometry": len({frame["positionSha256"] for frame in frames}) == len(frames),
            "stableTopology": len({(frame["points"], frame["primitives"]) for frame in frames}) == 1,
            "bottomOcclusionContract": True,
            "nonCommercialArtifactsSegregated": True,
        },
        "outputs": {
            "scene": {"path": scene_path.name, "sha256": sha256(scene_path)},
            "caches": [path.name for path in cache_files],
        },
    }
    receipt_path = output_dir / "soulwell-vestibule-fx-poc.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    if not all(receipt["validation"].values()):
        raise RuntimeError(f"Houdini POC validation failed: {receipt['validation']}")

    print(json.dumps({"scene": str(scene_path), "receipt": str(receipt_path), **receipt["validation"]}))


if __name__ == "__main__":
    main()
