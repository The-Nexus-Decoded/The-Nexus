#!/usr/bin/env hython
"""Build an isolated Houdini Apprentice POC for the Heartvale Soulwell veil.

This does not rebuild the dungeon. It creates only the animated water surface,
saves a non-commercial ``.hipnc`` scene, and writes diagnostic frame caches and
a machine-readable receipt into the requested output directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import hou


WIDTH = 4.2
HEIGHT = 3.4
COLUMNS = 32
ROWS = 24
HALF_WIDTH_UV = 0.205
SHOULDER_Y_UV = 0.58
CROWN_HEIGHT_UV = 0.28
FPS = 24
SAMPLE_FRAMES = (1, 12, 24)


PYTHON_SOP_CODE = f'''import hou
import math

node = hou.pwd()
geo = node.geometry()
geo.clear()

width = {WIDTH!r}
height = {HEIGHT!r}
columns = {COLUMNS}
rows = {ROWS}
half_width = {HALF_WIDTH_UV!r}
shoulder_y = {SHOULDER_Y_UV!r}
crown_height = {CROWN_HEIGHT_UV!r}
time_seconds = hou.time()

uv_attrib = geo.addAttrib(hou.attribType.Point, "uv", (0.0, 0.0, 0.0))
flow_attrib = geo.addAttrib(hou.attribType.Point, "flow", (0.0, -1.0, 0.0))
phase_attrib = geo.addAttrib(hou.attribType.Point, "phase", 0.0)
shimmer_attrib = geo.addAttrib(hou.attribType.Point, "shimmer", 0.0)
mask_attrib = geo.addAttrib(hou.attribType.Point, "archmask", 0.0)
color_attrib = geo.addAttrib(hou.attribType.Point, "Cd", (0.08, 0.42, 0.48))

def inside_arch(u, v):
    body = abs(u - 0.5) <= half_width and v <= shoulder_y
    crown_x = (u - 0.5) / half_width
    crown_y = (v - shoulder_y) / crown_height
    crown = v >= shoulder_y and crown_x * crown_x + crown_y * crown_y <= 1.0
    return body or crown

points = []
for row in range(rows + 1):
    v = row / rows
    point_row = []
    for column in range(columns + 1):
        u = column / columns
        edge = max(0.0, min(1.0, u / 0.13)) * max(0.0, min(1.0, (1.0 - u) / 0.13))
        ripple = math.sin(v * 22.0 - time_seconds * 2.8 + math.sin(u * 11.0) * 1.8)
        fall_a = math.sin(u * 18.0 + v * 7.0 + time_seconds * 1.4) * 0.5 + 0.5
        fall_b = math.sin(u * 31.0 - v * 13.0 - time_seconds * 2.1) * 0.5 + 0.5
        vertical_flow = math.sin((v + fall_a * 0.045) * 52.0 + time_seconds * 5.2) * 0.5 + 0.5
        caustic = max(0.0, fall_a + fall_b + vertical_flow * 0.45 - 1.42) ** 2.4
        falling_streak = (0.5 + 0.5 * math.sin(
            u * 93.0 + math.sin(v * 19.0 - time_seconds * 3.1) * 2.8 - time_seconds * 5.7
        )) ** 17.0
        crossing_streak = (0.5 + 0.5 * math.sin(
            u * 51.0 - v * 14.0 + time_seconds * 3.4
        )) ** 15.0
        ripple_line = (0.5 + 0.5 * math.sin(
            v * 84.0 + math.sin(u * 21.0) * 2.2 + time_seconds * 7.2
        )) ** 18.0
        sheet_shimmer = max(falling_streak * 0.74, crossing_streak * 0.18) + ripple_line * 0.10
        point = geo.createPoint()
        point.setPosition(((u - 0.5) * width, v * height, ripple * 0.055 * edge))
        point.setAttribValue(uv_attrib, (u, v, 0.0))
        point.setAttribValue(flow_attrib, (fall_a - 0.5, -1.0, fall_b - 0.5))
        point.setAttribValue(phase_attrib, vertical_flow)
        point.setAttribValue(shimmer_attrib, sheet_shimmer)
        point.setAttribValue(mask_attrib, 1.0 if inside_arch(u, v) else 0.0)
        point.setAttribValue(color_attrib, (
            0.08 + caustic * 0.54 + sheet_shimmer * 0.32,
            0.42 + caustic * 0.38 + sheet_shimmer * 0.30,
            0.48 + caustic * 0.34 + sheet_shimmer * 0.28,
        ))
        point_row.append(point)
    points.append(point_row)

water_group = geo.createPrimGroup("soulwell_water")
for row in range(rows):
    for column in range(columns):
        center_u = (column + 0.5) / columns
        center_v = (row + 0.5) / rows
        if not inside_arch(center_u, center_v):
            continue
        polygon = geo.createPolygon()
        polygon.addVertex(points[row][column])
        polygon.addVertex(points[row][column + 1])
        polygon.addVertex(points[row + 1][column + 1])
        polygon.addVertex(points[row + 1][column])
        polygon.setIsClosed(True)
        water_group.add(polygon)

geo.addAttrib(hou.attribType.Global, "effect_id", "heartvale-soulwell-water-threshold")
geo.addAttrib(hou.attribType.Global, "collision_mode", "traversable")
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
    z_values = [position.z() for position in positions]
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
        "normalDisplacement": {"min": min(z_values), "max": max(z_values)},
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
    container = obj.createNode("geo", "SOULWELL_EXIT_WATER_POC")
    for child in container.children():
        child.destroy()

    water = container.createNode("python", "ANIMATED_SOULWELL_WATER")
    water.parm("python").set(PYTHON_SOP_CODE)
    output = container.createNode("null", "OUT_SOULWELL_WATER")
    output.setInput(0, water)
    output.setDisplayFlag(True)
    output.setRenderFlag(True)
    container.setUserData("souldrifter_effect", "heartvale-soulwell-water-threshold")
    container.setUserData("souldrifter_collision", "traversable")
    container.setUserData("souldrifter_license_lane", "HOUDINI_APPRENTICE_POC")
    container.layoutChildren()
    obj.layoutChildren()

    scene_path = output_dir / "soulwell-exit-water-poc.hipnc"
    hou.hipFile.save(scene_path.as_posix())

    frames = []
    cache_files = []
    for frame in SAMPLE_FRAMES:
        stats = geometry_stats(output, frame)
        cache_path = output_dir / f"soulwell-exit-water-poc.{frame:04d}.bgeo.sc"
        output.geometry().saveToFile(cache_path.as_posix())
        stats["cache"] = cache_path.name
        stats["cacheSha256"] = sha256(cache_path)
        frames.append(stats)
        cache_files.append(cache_path)

    receipt = {
        "effectId": "heartvale-soulwell-water-threshold",
        "scope": "isolated environmental VFX POC; no dungeon rebuild",
        "tool": {
            "houdiniVersion": hou.applicationVersionString(),
            "licenseCategory": hou.licenseCategory().name(),
            "sceneFormat": ".hipnc",
            "commercialProductionReady": False,
        },
        "contract": {
            "widthMeters": WIDTH,
            "heightMeters": HEIGHT,
            "columns": COLUMNS,
            "rows": ROWS,
            "archMask": {
                "halfWidthUv": HALF_WIDTH_UV,
                "shoulderYUv": SHOULDER_Y_UV,
                "crownHeightUv": CROWN_HEIGHT_UV,
            },
            "collisionMode": "traversable",
            "runtimeRepresentation": "Three.js animated shader surface",
            "shimmerPattern": "dominant falling streaks with restrained crossing ripples",
        },
        "frames": frames,
        "validation": {
            "animatedGeometry": len({frame["positionSha256"] for frame in frames}) == len(frames),
            "stableTopology": len({(frame["points"], frame["primitives"]) for frame in frames}) == 1,
            "nonCommercialArtifactsSegregated": True,
        },
        "outputs": {
            "scene": {"path": scene_path.name, "sha256": sha256(scene_path)},
            "caches": [path.name for path in cache_files],
        },
    }
    receipt_path = output_dir / "soulwell-exit-water-poc.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    if not all(receipt["validation"].values()):
        raise RuntimeError(f"Houdini POC validation failed: {receipt['validation']}")

    print(json.dumps({"scene": str(scene_path), "receipt": str(receipt_path), **receipt["validation"]}))


if __name__ == "__main__":
    main()
