#!/usr/bin/env python3
"""Build the non-commercial First Breach Houdini source and browser OBJ."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
from pathlib import Path
from typing import Iterable, Sequence

import hou


Color = tuple[float, float, float]
Vector3 = tuple[float, float, float]


ZONE_COLORS: dict[str, Color] = {
    "training": (0.43, 0.47, 0.44),
    "passage-one": (0.37, 0.41, 0.39),
    "skirmish": (0.34, 0.38, 0.37),
    "passage-two": (0.40, 0.38, 0.34),
    "boss": (0.46, 0.32, 0.26),
}
WALL_COLORS: dict[str, Color] = {
    "training": (0.52, 0.55, 0.52),
    "passage-one": (0.44, 0.48, 0.46),
    "skirmish": (0.40, 0.45, 0.43),
    "passage-two": (0.48, 0.43, 0.37),
    "boss": (0.55, 0.37, 0.30),
}
BRONZE: Color = (0.63, 0.40, 0.18)
SOULGLASS: Color = (0.12, 0.78, 0.74)
EMBER: Color = (1.0, 0.25, 0.06)
WOOD: Color = (0.30, 0.18, 0.10)
BONE: Color = (0.62, 0.59, 0.48)

MATERIAL_PATHS = {
    "stone_floor": "/mat/FB_Stone_Floor",
    "stone_wall": "/mat/FB_Stone_Wall",
    "stone_prop": "/mat/FB_Stone_Prop",
    "bronze": "/mat/FB_Aged_Bronze",
    "wood": "/mat/FB_Aged_Wood",
    "soulglass": "/mat/FB_Soulglass",
    "ember": "/mat/FB_Ember",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("layout", type=Path)
    parser.add_argument("hip", type=Path)
    parser.add_argument("obj", type=Path)
    parser.add_argument("game_root", type=Path)
    return parser.parse_args()


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_") or "unnamed"


def rotated_xz(x: float, z: float, angle: float) -> tuple[float, float]:
    cosine = math.cos(angle)
    sine = math.sin(angle)
    return x * cosine - z * sine, x * sine + z * cosine


def same_color(left: Color, right: Color) -> bool:
    return all(abs(a - b) < 0.0001 for a, b in zip(left, right, strict=True))


def material_path(color: Color, kind: str) -> str:
    if kind == "floor":
        return MATERIAL_PATHS["stone_floor"]
    if kind == "wall":
        return MATERIAL_PATHS["stone_wall"]
    if kind == "emissive":
        return MATERIAL_PATHS["ember" if same_color(color, EMBER) else "soulglass"]
    if same_color(color, BRONZE):
        return MATERIAL_PATHS["bronze"]
    if same_color(color, WOOD):
        return MATERIAL_PATHS["wood"]
    if same_color(color, SOULGLASS):
        return MATERIAL_PATHS["soulglass"]
    return MATERIAL_PATHS["stone_prop"]


def _hash2d(x: int, y: int, seed: int) -> int:
    value = (x * 0x1F123BB5) ^ (y * 0x5F356495) ^ seed
    value = ((value ^ (value >> 16)) * 0x45D9F3B) & 0xFFFFFFFF
    return value ^ (value >> 16)


def create_materials(texture_references: dict[str, dict[str, str]]) -> None:
    material_network = hou.node("/mat")
    if material_network is None:
        material_network = hou.node("/").createNode("matnet", "mat")

    def shader(name: str, color: Color, roughness: float, metallic: float = 0.0) -> hou.Node:
        existing = material_network.node(name)
        if existing:
            existing.destroy()
        node = material_network.createNode("principledshader::2.0", name)
        node.parmTuple("basecolor").set(color)
        node.parm("basecolor_usePointColor").set(1)
        node.parm("rough").set(roughness)
        node.parm("metallic").set(metallic)
        return node

    for name, roughness, texture_set, normal_scale in (
        ("FB_Stone_Floor", 0.94, "flagstone", 0.72),
        ("FB_Stone_Wall", 0.98, "masonry", 1.05),
        ("FB_Stone_Prop", 0.92, "masonry", 0.82),
    ):
        references = texture_references[texture_set]
        node = shader(name, (1.0, 1.0, 1.0), roughness)
        node.parm("basecolor_useTexture").set(1)
        node.parm("basecolor_texture").set(references["color"])
        node.parm("basecolor_textureWrap").set("repeat")
        node.parm("rough_useTexture").set(1)
        node.parm("rough_texture").set(references["roughness"])
        node.parm("rough_textureWrap").set("repeat")
        node.parm("baseBumpAndNormal_enable").set(1)
        node.parm("baseBumpAndNormal_type").set("normal")
        node.parm("baseNormal_useTexture").set(1)
        node.parm("baseNormal_texture").set(references["normal"])
        node.parm("baseNormal_scale").set(normal_scale)
        node.parm("baseNormal_wrap").set("repeat")

    shader("FB_Aged_Bronze", BRONZE, 0.34, 0.82)
    shader("FB_Aged_Wood", WOOD, 0.66)
    soulglass = shader("FB_Soulglass", SOULGLASS, 0.14, 0.18)
    soulglass.parm("emitcolor_usePointColor").set(1)
    soulglass.parmTuple("emitcolor").set(SOULGLASS)
    soulglass.parm("emitint").set(1.7)
    ember = shader("FB_Ember", EMBER, 0.22)
    ember.parm("emitcolor_usePointColor").set(1)
    ember.parmTuple("emitcolor").set(EMBER)
    ember.parm("emitint").set(4.5)
    material_network.layoutChildren()


class GeometryBuilder:
    def __init__(self) -> None:
        self.geometry = hou.Geometry()
        self.geometry.addAttrib(hou.attribType.Point, "Cd", (1.0, 1.0, 1.0))
        self.geometry.addAttrib(hou.attribType.Prim, "name", "")
        self.geometry.addAttrib(hou.attribType.Prim, "path", "")
        self.geometry.addAttrib(hou.attribType.Prim, "souldrifter_kind", "")
        self.geometry.addAttrib(hou.attribType.Prim, "shop_materialpath", "")
        self.geometry.addAttrib(hou.attribType.Vertex, "uv", (0.0, 0.0, 0.0))

    def _point(self, position: Vector3, color: Color) -> hou.Point:
        point = self.geometry.createPoint()
        point.setPosition(position)
        point.setAttribValue("Cd", color)
        return point

    def _polygon(self, points: Sequence[hou.Point], name: str, kind: str, color: Color) -> None:
        polygon = self.geometry.createPolygon()
        vertices: list[hou.Vertex] = []
        for point in points:
            vertices.append(polygon.addVertex(point))
        positions = [point.position() for point in points]
        ranges = [max(position[axis] for position in positions) - min(position[axis] for position in positions) for axis in range(3)]
        if ranges[1] <= min(ranges[0], ranges[2]):
            projected = [(position[0], position[2]) for position in positions]
        elif ranges[0] <= min(ranges[1], ranges[2]):
            projected = [(position[2], position[1]) for position in positions]
        else:
            projected = [(position[0], position[1]) for position in positions]
        for vertex, (u, v) in zip(vertices, projected, strict=True):
            vertex.setAttribValue("uv", (u * 0.28, v * 0.28, 0.0))
        polygon.setAttribValue("name", name)
        polygon.setAttribValue("path", f"/FirstBreach/{kind}/{name}")
        polygon.setAttribValue("souldrifter_kind", kind)
        polygon.setAttribValue("shop_materialpath", material_path(color, kind))

    def add_box(
        self,
        name: str,
        center: Vector3,
        size: Vector3,
        color: Color,
        kind: str,
        yaw: float = 0.0,
    ) -> None:
        half_x, half_y, half_z = size[0] / 2, size[1] / 2, size[2] / 2
        corners: list[Vector3] = []
        for local_y in (-half_y, half_y):
            for local_z in (-half_z, half_z):
                for local_x in (-half_x, half_x):
                    x, z = rotated_xz(local_x, local_z, yaw)
                    corners.append((center[0] + x, center[1] + local_y, center[2] + z))
        points = [self._point(position, color) for position in corners]
        faces = (
            (0, 1, 3, 2),
            (4, 6, 7, 5),
            (0, 4, 5, 1),
            (2, 3, 7, 6),
            (0, 2, 6, 4),
            (1, 5, 7, 3),
        )
        for face in faces:
            self._polygon([points[index] for index in face], name, kind, color)

    def add_cylinder(
        self,
        name: str,
        center: Vector3,
        radius: float,
        height: float,
        sides: int,
        color: Color,
        kind: str,
    ) -> None:
        bottom: list[hou.Point] = []
        top: list[hou.Point] = []
        for index in range(sides):
            angle = index / sides * math.tau
            x = center[0] + math.cos(angle) * radius
            z = center[2] + math.sin(angle) * radius
            bottom.append(self._point((x, center[1] - height / 2, z), color))
            top.append(self._point((x, center[1] + height / 2, z), color))
        self._polygon(list(reversed(bottom)), name, kind, color)
        self._polygon(top, name, kind, color)
        for index in range(sides):
            next_index = (index + 1) % sides
            self._polygon(
                [bottom[index], bottom[next_index], top[next_index], top[index]],
                name,
                kind,
                color,
            )

    def add_octahedron(
        self,
        name: str,
        center: Vector3,
        radius: float,
        color: Color,
        kind: str,
    ) -> None:
        positions = (
            (center[0], center[1] + radius, center[2]),
            (center[0], center[1] - radius, center[2]),
            (center[0] + radius, center[1], center[2]),
            (center[0] - radius, center[1], center[2]),
            (center[0], center[1], center[2] + radius),
            (center[0], center[1], center[2] - radius),
        )
        points = [self._point(position, color) for position in positions]
        for face in ((0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)):
            self._polygon([points[index] for index in face], name, kind, color)


def contiguous_runs(values: Iterable[tuple[int, str]]) -> list[tuple[int, int, str]]:
    ordered = sorted(values)
    if not ordered:
        return []
    runs: list[tuple[int, int, str]] = []
    start, previous, zone = ordered[0][0], ordered[0][0], ordered[0][1]
    for value, next_zone in ordered[1:]:
        if value == previous + 1 and next_zone == zone:
            previous = value
            continue
        runs.append((start, previous, zone))
        start, previous, zone = value, value, next_zone
    runs.append((start, previous, zone))
    return runs


def add_abandoned_table(builder: GeometryBuilder, name: str, x: float, z: float, yaw: float, damage: int) -> None:
    builder.add_box(f"{name}_top", (x, 0.78, z), (1.62, 0.16, 0.86), WOOD, "dressing", yaw=yaw)
    offsets = [(-0.62, -0.28), (-0.62, 0.28), (0.62, -0.28), (0.62, 0.28)]
    for index, (offset_x, offset_z) in enumerate(offsets):
        if index == damage % len(offsets):
            continue
        rotated_x, rotated_z = rotated_xz(offset_x, offset_z, yaw)
        builder.add_box(
            f"{name}_leg_{index}",
            (x + rotated_x, 0.38, z + rotated_z),
            (0.14, 0.76, 0.14),
            WOOD,
            "dressing",
            yaw=yaw,
        )
    builder.add_box(f"{name}_forgotten_tool", (x + 0.18, 0.90, z - 0.08), (0.58, 0.06, 0.09), BRONZE, "dressing", yaw=yaw + 0.34)


def add_barrel(builder: GeometryBuilder, name: str, x: float, z: float) -> None:
    builder.add_cylinder(f"{name}_staves", (x, 0.55, z), 0.43, 1.10, 12, WOOD, "dressing")
    for index, height in enumerate((0.18, 0.52, 0.92)):
        builder.add_cylinder(f"{name}_hoop_{index}", (x, height, z), 0.45, 0.07, 12, BRONZE, "dressing")


def add_storage_stack(builder: GeometryBuilder, name: str, x: float, z: float, yaw: float, variant: int) -> None:
    builder.add_box(f"{name}_crate_low", (x, 0.36, z), (0.92, 0.72, 0.86), WOOD, "dressing", yaw=yaw)
    builder.add_box(f"{name}_crate_high", (x + 0.36, 0.84, z - 0.14), (0.64, 0.58, 0.58), WOOD, "dressing", yaw=yaw + 0.18)
    if variant % 2 == 0:
        add_barrel(builder, f"{name}_barrel", x - 0.66, z + 0.12)


def add_bone_scatter(builder: GeometryBuilder, name: str, x: float, z: float, variant: int) -> None:
    for index in range(5):
        angle = (variant * 0.37 + index * 1.31) % math.tau
        radius = 0.16 + (index % 3) * 0.13
        builder.add_box(
            f"{name}_bone_{index}",
            (x + math.cos(angle) * radius, 0.08, z + math.sin(angle) * radius),
            (0.42 if index < 3 else 0.26, 0.07, 0.08),
            BONE,
            "dressing",
            yaw=angle,
        )
    builder.add_octahedron(f"{name}_skull", (x - 0.22, 0.18, z + 0.18), 0.19, BONE, "dressing")


def add_cave_in(builder: GeometryBuilder, name: str, x: float, z: float, color: Color, wall_yaw: float, variant: int) -> None:
    for index in range(8):
        lateral = ((index * 5 + variant) % 9 - 4) * 0.17
        depth = (index % 3) * 0.16
        local_x, local_z = rotated_xz(lateral, depth, wall_yaw)
        radius = 0.28 + ((variant >> (index % 8)) & 3) * 0.07
        builder.add_octahedron(
            f"{name}_rock_{index}",
            (x + local_x, radius * 0.72 + (index // 5) * 0.22, z + local_z),
            radius,
            color,
            "dressing",
        )


def add_false_wall(builder: GeometryBuilder, name: str, x: float, z: float, wall_yaw: float, color: Color) -> None:
    builder.add_box(f"{name}_panel", (x, 1.18, z), (1.28, 2.36, 0.12), color, "wall", yaw=wall_yaw)
    for offset in (-0.56, 0.56):
        local_x, local_z = rotated_xz(offset, 0.075, wall_yaw)
        builder.add_box(f"{name}_seam_{offset}", (x + local_x, 1.18, z + local_z), (0.035, 2.18, 0.035), BRONZE, "dressing", yaw=wall_yaw)


def add_broken_barricade(builder: GeometryBuilder, name: str, x: float, z: float, yaw: float, variant: int) -> None:
    for index in range(3):
        builder.add_box(
            f"{name}_plank_{index}",
            (x + (index - 1) * 0.18, 0.34 + index * 0.27, z),
            (1.28 - index * 0.16, 0.13, 0.16),
            WOOD,
            "dressing",
            yaw=yaw + (index - 1) * 0.22 + (variant % 3) * 0.04,
        )
    builder.add_box(f"{name}_brace", (x, 0.58, z), (0.15, 1.16, 0.15), BRONZE, "dressing", yaw=yaw + 0.55)


def add_environment(payload: dict, builder: GeometryBuilder) -> None:
    dungeon = payload["dungeon"]
    tile_size = float(payload["tileSize"])
    floor_height = float(payload["floorHeight"])
    tiles = dungeon["tiles"]
    tile_lookup = {(tile["x"], tile["y"]): tile for tile in tiles}

    rows: dict[int, list[tuple[int, str]]] = {}
    for tile in tiles:
        rows.setdefault(tile["y"], []).append((tile["x"], tile["zoneId"]))
    for y, values in rows.items():
        for start, end, zone in contiguous_runs(values):
            width = (end - start + 1) * tile_size + 0.035
            center_x = (start + end) * 0.5 * tile_size
            name = f"floor_{zone}_{start}_{end}_{y}"
            builder.add_box(name, (center_x, -floor_height / 2, y * tile_size), (width, floor_height, tile_size + 0.035), ZONE_COLORS[zone], "floor")

    for room in dungeon["rooms"]:
        center_x = room["center"]["x"] * tile_size
        center_z = room["center"]["y"] * tile_size
        width = max(2.0, min(room["width"] * tile_size * 0.52, 13.0))
        tint = BRONZE if room["id"] == "boss" else SOULGLASS
        builder.add_box(f"{room['id']}_realm_inlay", (center_x, 0.018, center_z), (width, 0.035, 0.15), tint, "inlay", yaw=-0.18 if room["id"] == "skirmish" else 0.0)
        builder.add_octahedron(f"{room['id']}_realm_lock", (center_x, 0.34, center_z), 0.26 if room["id"] != "boss" else 0.38, tint, "inlay")

    boundaries: dict[tuple[str, int], list[tuple[int, str]]] = {}
    for tile in tiles:
        x, y, zone = tile["x"], tile["y"], tile["zoneId"]
        for dx, dy, orientation, fixed, varying in (
            (-1, 0, "vertical", x * 2 - 1, y),
            (1, 0, "vertical", x * 2 + 1, y),
            (0, -1, "horizontal", y * 2 - 1, x),
            (0, 1, "horizontal", y * 2 + 1, x),
        ):
            if (x + dx, y + dy) not in tile_lookup:
                boundaries.setdefault((orientation, fixed), []).append((varying, zone))

    for (orientation, fixed), values in boundaries.items():
        for start, end, zone in contiguous_runs(values):
            length = (end - start + 1) * tile_size + 0.12
            height = 3.45 if zone == "boss" else 2.9 if zone in ("training", "skirmish") else 2.35
            if orientation == "vertical":
                center = (fixed * 0.5 * tile_size, height / 2 - 0.04, (start + end) * 0.5 * tile_size)
                size = (0.34, height, length)
            else:
                center = ((start + end) * 0.5 * tile_size, height / 2 - 0.04, fixed * 0.5 * tile_size)
                size = (length, height, 0.34)
            wall_name = f"wall_{orientation}_{fixed}_{start}_{end}_{zone}"
            builder.add_box(wall_name, center, size, WALL_COLORS[zone], "wall")
            for endpoint_index, endpoint in enumerate((start, end)):
                if orientation == "vertical":
                    buttress_center = (fixed * 0.5 * tile_size, height * 0.47, endpoint * tile_size)
                else:
                    buttress_center = (endpoint * tile_size, height * 0.47, fixed * 0.5 * tile_size)
                builder.add_cylinder(f"{wall_name}_buttress_{endpoint_index}", buttress_center, 0.28, height + 0.18, 8, BRONZE if zone == "boss" else WALL_COLORS[zone], "buttress")

    for prop in dungeon["props"]:
        x = prop["x"] * tile_size
        z = prop["y"] * tile_size
        name = safe_name(prop["id"])
        kind = prop["kind"]
        if kind == "soul-well":
            builder.add_cylinder(f"{name}_base", (x, 0.30, z), 1.45, 0.60, 16, WALL_COLORS["training"], "prop")
            builder.add_cylinder(f"{name}_basin", (x, 0.66, z), 1.16, 0.16, 20, BRONZE, "prop")
            builder.add_octahedron(f"{name}_focus", (x, 1.62, z), 0.34, SOULGLASS, "prop")
        elif kind == "pillar":
            builder.add_box(f"{name}_base", (x, 0.16, z), (1.15, 0.32, 1.15), WALL_COLORS[prop["roomId"]], "prop")
            builder.add_cylinder(name, (x, 1.42, z), 0.42, 2.52, 8, WALL_COLORS[prop["roomId"]], "prop")
            builder.add_box(f"{name}_cap", (x, 2.75, z), (1.10, 0.26, 1.10), BRONZE, "prop")
        elif kind == "rubble":
            for index in range(4):
                builder.add_box(f"{name}_{index}", (x + (index - 1.5) * 0.22, 0.16 + index % 2 * 0.06, z + ((index * 7) % 3 - 1) * 0.20), (0.58, 0.32, 0.42), WALL_COLORS[prop["roomId"]], "prop", yaw=index * 0.47)
        elif kind == "brazier":
            builder.add_cylinder(f"{name}_stand", (x, 0.55, z), 0.26, 1.10, 8, BRONZE, "prop")
            builder.add_cylinder(f"{name}_bowl", (x, 1.18, z), 0.52, 0.20, 12, BRONZE, "prop")
            builder.add_octahedron(f"{name}_flame", (x, 1.60, z), 0.32, EMBER, "emissive")
        elif kind in ("crate", "chest"):
            builder.add_box(name, (x, 0.48, z), (1.18, 0.96, 1.02), WOOD, "prop", yaw=0.08 * ((prop["x"] + prop["y"]) % 3 - 1))
            builder.add_box(f"{name}_band", (x, 0.52, z), (1.24, 0.13, 1.07), BRONZE, "prop")
        elif kind in ("bench", "chair"):
            width = 1.45 if kind == "bench" else 0.78
            builder.add_box(f"{name}_seat", (x, 0.52, z), (width, 0.16, 0.62), WOOD, "prop")
            builder.add_box(f"{name}_back", (x, 0.95, z + 0.25), (width, 0.72, 0.14), WOOD, "prop")
            for offset in (-0.42, 0.42) if kind == "bench" else (-0.22, 0.22):
                builder.add_box(f"{name}_leg_{offset}", (x + offset, 0.25, z), (0.14, 0.50, 0.14), BRONZE, "prop")
        elif kind == "gate":
            for offset in (-0.72, 0.72):
                builder.add_box(f"{name}_post_{offset}", (x + offset, 1.50, z), (0.30, 3.0, 0.44), WALL_COLORS["training"], "prop")
            builder.add_box(f"{name}_lintel", (x, 2.84, z), (1.75, 0.34, 0.48), BRONZE, "prop")
            for index in range(-2, 3):
                builder.add_box(f"{name}_bar_{index}", (x + index * 0.26, 1.35, z), (0.08, 2.45, 0.10), BRONZE, "prop")
        elif kind == "essence":
            builder.add_octahedron(name, (x, 0.82, z), 0.64, SOULGLASS, "emissive")
        elif kind == "memory-loom":
            builder.add_box(f"{name}_frame", (x, 1.16, z), (1.70, 2.28, 0.32), BRONZE, "prop")
            builder.add_box(f"{name}_memory", (x, 1.16, z), (1.28, 1.74, 0.12), SOULGLASS, "emissive")
        elif kind == "training-effigy":
            builder.add_cylinder(f"{name}_base", (x, 0.18, z), 0.62, 0.36, 10, BRONZE, "prop")
            builder.add_box(f"{name}_body", (x, 1.13, z), (0.72, 1.54, 0.42), WOOD, "prop")
            builder.add_cylinder(f"{name}_head", (x, 2.08, z), 0.34, 0.58, 10, WOOD, "prop")

    reserved = {
        (item["x"], item["y"])
        for item in [
            *dungeon["props"],
            *dungeon["npcs"],
            *dungeon["enemies"],
            *dungeon["blockedTiles"],
            dungeon["playerStart"],
        ]
    }
    dressing_candidates: list[tuple[int, dict, tuple[int, int]]] = []
    seed = int(payload["seed"])
    for tile in tiles:
        tile_x, tile_y = tile["x"], tile["y"]
        if any(abs(tile_x - reserved_x) + abs(tile_y - reserved_y) <= 1 for reserved_x, reserved_y in reserved):
            continue
        missing_directions = [
            (dx, dy)
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))
            if (tile_x + dx, tile_y + dy) not in tile_lookup
        ]
        if not missing_directions:
            continue
        direction = min(
            missing_directions,
            key=lambda item: _hash2d(tile_x * 11 + item[0], tile_y * 13 + item[1], seed ^ 0x0CC0A11),
        )
        score = _hash2d(tile_x, tile_y, seed ^ 0xD3C0A7E)
        dressing_candidates.append((score, tile, direction))

    room_quotas = {"training": 10, "skirmish": 24, "boss": 12}
    selected_candidates: list[tuple[int, dict, tuple[int, int]]] = []
    for room_id, quota in room_quotas.items():
        room_candidates = [candidate for candidate in dressing_candidates if candidate[1]["roomId"] == room_id]
        selected_candidates.extend(sorted(room_candidates, key=lambda item: item[0])[:quota])

    for index, (score, tile, (dx, dy)) in enumerate(sorted(selected_candidates, key=lambda item: item[0])):
        tile_x, tile_y = tile["x"], tile["y"]
        x = (tile_x + dx * 0.34) * tile_size
        z = (tile_y + dy * 0.34) * tile_size
        wall_x = (tile_x + dx * 0.49) * tile_size
        wall_z = (tile_y + dy * 0.49) * tile_size
        wall_yaw = math.pi / 2 if dx else 0.0
        room_id = tile["roomId"]
        zone = tile["zoneId"]
        name = f"history_{room_id}_{tile_x}_{tile_y}_{index}"
        variant = score & 0xFFFF

        if room_id == "training":
            choice = score % 5
            if choice == 0:
                add_abandoned_table(builder, name, x, z, wall_yaw, variant)
            elif choice == 1:
                add_storage_stack(builder, name, x, z, wall_yaw, variant)
            elif choice == 2:
                add_barrel(builder, name, x, z)
            elif choice == 3:
                add_false_wall(builder, name, wall_x, wall_z, wall_yaw, WALL_COLORS[zone])
            else:
                add_broken_barricade(builder, name, x, z, wall_yaw, variant)
        elif room_id == "boss":
            choice = score % 5
            if choice == 0:
                add_cave_in(builder, name, x, z, WALL_COLORS[zone], wall_yaw, variant)
            elif choice == 1:
                add_bone_scatter(builder, name, x, z, variant)
            elif choice == 2:
                add_broken_barricade(builder, name, x, z, wall_yaw, variant)
            elif choice == 3:
                add_false_wall(builder, name, wall_x, wall_z, wall_yaw, WALL_COLORS[zone])
            else:
                add_barrel(builder, name, x, z)
        else:
            choice = score % 7
            if choice == 0:
                add_cave_in(builder, name, x, z, WALL_COLORS[zone], wall_yaw, variant)
            elif choice == 1:
                add_false_wall(builder, name, wall_x, wall_z, wall_yaw, WALL_COLORS[zone])
            elif choice == 2:
                add_abandoned_table(builder, name, x, z, wall_yaw, variant)
            elif choice == 3:
                add_storage_stack(builder, name, x, z, wall_yaw, variant)
            elif choice == 4:
                add_bone_scatter(builder, name, x, z, variant)
            elif choice == 5:
                add_barrel(builder, name, x, z)
            else:
                add_broken_barricade(builder, name, x, z, wall_yaw, variant)


def create_model_reference(
    parent: hou.Node,
    name: str,
    source_path: Path,
    position: tuple[float, float],
    target_height: float,
    visible: bool,
) -> dict:
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    container = parent.createNode("geo", safe_name(name))
    for child in container.children():
        child.destroy()
    importer = container.createNode("gltf::2.0", "SOURCE_GLTF")
    importer.parm("gltffile").set(source_path.as_posix())
    importer.parm("importnodegeometryas").set("flattenedgeometry")
    importer.parm("enablematerialimport").set(1 if visible else 0)
    geometry = importer.geometry()
    if not geometry or not geometry.prims():
        raise RuntimeError(f"Houdini imported no geometry from {source_path}")
    bounds = geometry.boundingBox()
    source_height = max(bounds.sizevec()[1], 0.001)
    scale = target_height / source_height
    transform = container.createNode("xform", "NORMALIZE_AND_GROUND")
    transform.setInput(0, importer)
    transform.parm("scale").set(scale)
    transform.parm("tx").set(-bounds.center()[0] * scale)
    transform.parm("ty").set(-bounds.minvec()[1] * scale)
    transform.parm("tz").set(-bounds.center()[2] * scale)
    transform.setDisplayFlag(True)
    transform.setRenderFlag(True)
    container.parmTuple("t").set((position[0], 0.0, position[1]))
    container.setDisplayFlag(visible)
    return {
        "name": name,
        "source": source_path.as_posix(),
        "points": len(geometry.points()),
        "primitives": len(geometry.prims()),
        "scale": scale,
        "visible": visible,
    }


def create_actor_references(obj: hou.Node, payload: dict, game_root: Path) -> list[dict]:
    tile_size = float(payload["tileSize"])
    dungeon = payload["dungeon"]
    references = payload["modelReferences"]
    preview = obj.createNode("subnet", "GAMEPLAY_MODEL_REFERENCES")
    library = obj.createNode("subnet", "COMPLETE_CHARACTER_LIBRARY")
    diagnostics: list[dict] = []

    def source(relative: str) -> Path:
        return game_root / "public" / relative

    player = dungeon["playerStart"]
    diagnostics.append(create_model_reference(preview, "player_human_shadowknight", source(references["gameplay"]["player"]), (player["x"] * tile_size, player["y"] * tile_size), 2.04, True))
    for npc in dungeon["npcs"]:
        diagnostics.append(create_model_reference(preview, f"npc_{npc['id']}", source(references["gameplay"]["npcs"][npc["id"]]), (npc["x"] * tile_size, npc["y"] * tile_size), 1.95 if npc["id"] != "brannoc" else 2.10, True))
    for enemy in dungeon["enemies"]:
        key = "miniboss" if enemy["kind"] == "miniboss" else "breachling"
        height = 2.42 if enemy["kind"] == "miniboss" else 1.82
        diagnostics.append(create_model_reference(preview, enemy["id"], source(references["gameplay"][key]), (enemy["x"] * tile_size, enemy["y"] * tile_size), height, True))

    for index, (name, relative) in enumerate(references["library"].items()):
        diagnostics.append(create_model_reference(library, f"library_{name}", source(relative), (index * 2.6, -8.0), 2.0, False))
    library.setDisplayFlag(False)
    preview.moveToGoodPosition()
    library.moveToGoodPosition()
    return diagnostics


def create_camera(obj: hou.Node, payload: dict) -> None:
    tiles = payload["dungeon"]["tiles"]
    tile_size = float(payload["tileSize"])
    min_x = min(tile["x"] for tile in tiles) * tile_size
    max_x = max(tile["x"] for tile in tiles) * tile_size
    min_z = min(tile["y"] for tile in tiles) * tile_size
    max_z = max(tile["y"] for tile in tiles) * tile_size
    center_x = (min_x + max_x) / 2
    center_z = (min_z + max_z) / 2
    span = max(max_x - min_x, max_z - min_z)

    target = obj.createNode("null", "ISO_CAMERA_TARGET")
    target.parmTuple("t").set((center_x, 0.0, center_z))
    camera = obj.createNode("cam", "ISO_CAMERA")
    camera.parmTuple("t").set((center_x - span * 0.43, span * 0.62, center_z + span * 0.43))
    if camera.parm("lookatpath"):
        camera.parm("lookatpath").set(target.path())
    if camera.parm("projection"):
        camera.parm("projection").set("ortho")
    if camera.parm("orthowidth"):
        camera.parm("orthowidth").set(span * 1.18)

    rooms = {room["id"]: room for room in payload["dungeon"]["rooms"]}

    def detail_camera(room_id: str, name: str, width_multiplier: float) -> hou.Node:
        room = rooms[room_id]
        room_x = room["center"]["x"] * tile_size
        room_z = room["center"]["y"] * tile_size
        room_span = max(room["width"], room["height"]) * tile_size
        detail_target = obj.createNode("null", f"{name}_TARGET")
        detail_target.parmTuple("t").set((room_x, 0.55, room_z))
        detail = obj.createNode("cam", name)
        detail.parmTuple("t").set((room_x - room_span * 0.72, room_span * 0.84, room_z + room_span * 0.72))
        detail.parm("lookatpath").set(detail_target.path())
        detail.parm("projection").set("ortho")
        detail.parm("orthowidth").set(room_span * width_multiplier)
        return detail

    training_camera = detail_camera("training", "TRAINING_MATERIAL_CAMERA", 1.32)
    detail_camera("boss", "BOSS_MATERIAL_CAMERA", 1.36)
    training_camera.setCurrent(True)


def create_lighting(obj: hou.Node, payload: dict) -> None:
    tile_size = float(payload["tileSize"])
    rooms = {room["id"]: room for room in payload["dungeon"]["rooms"]}

    def distant(name: str, rotation: Vector3, color: Color, exposure: float) -> None:
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("distant")
        light.parmTuple("r").set(rotation)
        light.parmTuple("light_color").set(color)
        light.parm("light_exposure").set(exposure)
        light.parm("ogl_enablelight").set(1)

    def local(name: str, room_id: str, height: float, color: Color, intensity: float, exposure: float) -> None:
        room = rooms[room_id]
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("point")
        light.parmTuple("t").set((room["center"]["x"] * tile_size, height, room["center"]["y"] * tile_size))
        light.parmTuple("light_color").set(color)
        light.parm("light_intensity").set(intensity)
        light.parm("light_exposure").set(exposure)
        light.parm("ogl_enablelight").set(1)

    ambient = obj.createNode("ambient", "DUNGEON_AMBIENT_FILL")
    ambient.parmTuple("light_color").set((0.22, 0.29, 0.34))
    ambient.parm("light_intensity").set(1.25)
    ambient.parm("ogl_enablelight").set(1)

    distant("ISO_MOON_KEY", (-52.0, -34.0, -24.0), (0.58, 0.72, 0.88), 1.15)
    distant("ISO_WARM_FILL", (-34.0, 142.0, 16.0), (0.82, 0.50, 0.30), 0.1)
    local("SOULWELL_GLOW", "training", 2.35, (0.10, 0.82, 0.78), 5.2, 1.1)
    local("ASHEN_LOCK_GLOW", "boss", 2.7, (1.0, 0.20, 0.045), 6.4, 1.35)


def create_review_renders(out: hou.Node) -> None:
    for name, camera in (
        ("TRAINING_REVIEW_RENDER", "/obj/TRAINING_MATERIAL_CAMERA"),
        ("BOSS_REVIEW_RENDER", "/obj/BOSS_MATERIAL_CAMERA"),
    ):
        render = out.createNode("opengl", name)
        render.parm("camera").set(camera)
        render.parm("picture").set("ip")
        render.parmTuple("res").set((1280, 720))
        render.parm("tres").set(1)
        render.parm("usetextures").set(1)
        render.parm("hqlighting").set(1)
        render.parm("lightsamples").set(16)
        render.parm("shadows").set(1)
        render.parm("shadowquality").set("areaaa")
        render.parm("shadowmap").set(4096)
        render.parm("ambocclusion").set(1)
        render.parm("uniformfog").set(1)
        render.parm("fogdensity").set(0.0007)
        render.parm("fogopacity").set(0.32)
        render.parmTuple("fogcolor").set((0.075, 0.105, 0.125))
        render.parmTuple("fogrange").set((0.0, 1000.0))
        render.parm("bloom").set(1)
        render.parm("bloomscale").set(6.0)
        render.parm("bloomintensity").set(0.28)
        render.parm("bloomthreshold").set(0.88)
        render.parm("colorcorrect").set("lut_gamma")
        render.parm("gamma").set(1.0)

    out.layoutChildren()


def main() -> None:
    args = parse_args()
    if hou.licenseCategory().name() != "Apprentice":
        raise RuntimeError(f"Expected Houdini Apprentice; active license is {hou.licenseCategory().name()}.")

    payload = json.loads(args.layout.read_text(encoding="utf-8"))
    args.hip.parent.mkdir(parents=True, exist_ok=True)
    args.obj.parent.mkdir(parents=True, exist_ok=True)
    game_root = args.game_root.resolve()
    texture_root = game_root / "public" / "assets" / "textures" / "environment" / "first-breach"
    texture_files = {
        texture_set: {
            channel: texture_root / f"{texture_set}-{filename}"
            for channel, filename in (
                ("color", "color.jpg"),
                ("normal", "normal-gl.jpg"),
                ("roughness", "roughness.jpg"),
            )
        }
        for texture_set in ("flagstone", "masonry")
    }
    for files in texture_files.values():
        for texture_file in files.values():
            if not texture_file.is_file():
                raise FileNotFoundError(texture_file)
    texture_references = {
        texture_set: {
            channel: f"$HIP/{Path(os.path.relpath(texture_file, args.hip.resolve().parent)).as_posix()}"
            for channel, texture_file in files.items()
        }
        for texture_set, files in texture_files.items()
    }

    hou.hipFile.clear(suppress_save_prompt=True)
    hou.setFps(30)
    create_materials(texture_references)
    obj = hou.node("/obj")
    environment = obj.createNode("geo", "FIRST_BREACH_PROCEDURAL_ENVIRONMENT")
    for child in environment.children():
        child.destroy()

    builder = GeometryBuilder()
    add_environment(payload, builder)
    stash = environment.createNode("stash", "AUTHORED_ENVIRONMENT")
    stash.parm("stash").set(builder.geometry)
    bevel = environment.createNode("polybevel::3.0", "WEATHERED_EDGE_BEVEL")
    bevel.setInput(0, stash)
    bevel.parm("offset").set(0.028)
    bevel.parm("divisions").set(2)
    normal = environment.createNode("normal", "SURFACE_NORMALS")
    normal.setInput(0, bevel)
    normal.setDisplayFlag(True)
    normal.setRenderFlag(True)

    diagnostics = create_actor_references(obj, payload, game_root)
    create_camera(obj, payload)
    create_lighting(obj, payload)
    create_review_renders(hou.node("/out"))

    metadata = obj.createNode("null", "FIRST_BREACH_BUILD_METADATA")
    metadata.setUserData("souldrifter_seed", str(payload["seed"]))
    metadata.setUserData("souldrifter_source", payload["source"])
    metadata.setUserData("souldrifter_license", hou.licenseCategory().name())
    metadata.setUserData("souldrifter_textures", json.dumps(texture_references, separators=(",", ":")))
    metadata.setUserData("souldrifter_model_diagnostics", json.dumps(diagnostics, separators=(",", ":")))

    obj.layoutChildren()
    environment.layoutChildren()
    hou.hipFile.save(args.hip.resolve().as_posix())
    normal.geometry().saveToFile(args.obj.resolve().as_posix())
    if not args.obj.is_file() or args.obj.stat().st_size == 0:
        raise RuntimeError(f"Houdini did not create {args.obj}")

    print(json.dumps({
        "houdiniVersion": hou.applicationVersionString(),
        "license": hou.licenseCategory().name(),
        "seed": payload["seed"],
        "tiles": len(payload["dungeon"]["tiles"]),
        "environmentPoints": len(builder.geometry.points()),
        "environmentPrimitives": len(builder.geometry.prims()),
        "modelReferences": len(diagnostics),
        "hip": args.hip.resolve().as_posix(),
        "hipBytes": args.hip.stat().st_size,
        "obj": args.obj.resolve().as_posix(),
        "objBytes": args.obj.stat().st_size,
        "textures": texture_references,
        "materials": len(MATERIAL_PATHS),
    }))


if __name__ == "__main__":
    main()
