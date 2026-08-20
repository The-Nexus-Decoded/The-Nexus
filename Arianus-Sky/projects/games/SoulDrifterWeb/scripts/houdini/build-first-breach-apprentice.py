#!/usr/bin/env python3
"""Build the non-commercial First Breach Houdini source and browser OBJ."""

from __future__ import annotations

import argparse
import base64
import json
import math
import os
import re
import struct
from pathlib import Path
from typing import Iterable, Sequence

import hou


Color = tuple[float, float, float]
Vector3 = tuple[float, float, float]


ZONE_COLORS: dict[str, Color] = {
    "training": (0.68, 0.78, 0.75),
    "passage-one": (0.56, 0.64, 0.61),
    "skirmish": (0.50, 0.58, 0.56),
    "passage-two": (0.57, 0.55, 0.49),
    "boss": (0.63, 0.47, 0.40),
}
WALL_COLORS: dict[str, Color] = {
    "training": (0.78, 0.67, 0.53),
    "passage-one": (0.65, 0.61, 0.52),
    "skirmish": (0.60, 0.58, 0.51),
    "passage-two": (0.66, 0.56, 0.45),
    "boss": (0.69, 0.46, 0.37),
}
BRONZE: Color = (0.46, 0.29, 0.12)
SOULGLASS: Color = (0.08, 0.56, 0.54)
EMBER: Color = (0.82, 0.16, 0.035)
SOUL_CHANNEL: Color = (0.025, 0.28, 0.27)
EMBER_CHANNEL: Color = (0.38, 0.055, 0.012)
WOOD: Color = (0.34, 0.18, 0.075)
IRON: Color = (0.12, 0.14, 0.14)
MORTAR: Color = (0.13, 0.12, 0.105)
ASH: Color = (0.18, 0.15, 0.13)
BONE: Color = (0.62, 0.59, 0.48)
MOSS: Color = (0.23, 0.31, 0.20)

MATERIAL_PATHS = {
    "stone_floor": "/mat/FB_Stone_Floor",
    "stone_wall": "/mat/FB_Stone_Wall",
    "stone_prop": "/mat/FB_Stone_Prop",
    "bronze": "/mat/FB_Aged_Bronze",
    "wood": "/mat/FB_Aged_Wood",
    "iron": "/mat/FB_Dark_Iron",
    "mortar": "/mat/FB_Dark_Mortar",
    "bone": "/mat/FB_Aged_Bone",
    "moss": "/mat/FB_Moss",
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
    if kind == "mortar":
        return MATERIAL_PATHS["mortar"]
    if kind == "emissive":
        return MATERIAL_PATHS["ember" if same_color(color, EMBER) or same_color(color, EMBER_CHANNEL) else "soulglass"]
    if same_color(color, BRONZE):
        return MATERIAL_PATHS["bronze"]
    if same_color(color, WOOD):
        return MATERIAL_PATHS["wood"]
    if same_color(color, IRON):
        return MATERIAL_PATHS["iron"]
    if same_color(color, BONE):
        return MATERIAL_PATHS["bone"]
    if same_color(color, MOSS):
        return MATERIAL_PATHS["moss"]
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
        node.parm("basecolor_textureIntensity").set(0.78 if texture_set == "flagstone" else 0.94)
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

    shader("FB_Aged_Bronze", BRONZE, 0.62, 0.68)
    shader("FB_Aged_Wood", WOOD, 0.86)
    shader("FB_Dark_Iron", IRON, 0.78, 0.58)
    shader("FB_Dark_Mortar", MORTAR, 1.0)
    shader("FB_Aged_Bone", BONE, 0.96)
    shader("FB_Moss", MOSS, 1.0)
    soulglass = shader("FB_Soulglass", SOULGLASS, 0.14, 0.18)
    soulglass.parm("emitcolor_usePointColor").set(1)
    soulglass.parmTuple("emitcolor").set(SOULGLASS)
    soulglass.parm("emitint").set(0.04)
    ember = shader("FB_Ember", EMBER, 0.22)
    ember.parm("emitcolor_usePointColor").set(1)
    ember.parmTuple("emitcolor").set(EMBER)
    ember.parm("emitint").set(0.06)
    material_network.layoutChildren()


def extract_glb_texture(source_path: Path, slot: str, destination: Path) -> Path | None:
    data = source_path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        return None

    _, version, total_length = struct.unpack_from("<4sII", data, 0)
    if version != 2 or total_length > len(data):
        raise RuntimeError(f"Unsupported GLB header in {source_path}")

    document: dict | None = None
    binary_chunk = b""
    offset = 12
    while offset + 8 <= total_length:
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8:offset + 8 + chunk_length]
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b"\x00 \t\r\n").decode("utf-8"))
        elif chunk_type == 0x004E4942:
            binary_chunk = chunk
        offset += 8 + chunk_length

    if not document or not document.get("materials"):
        return None
    material = document["materials"][0]
    texture_ref = material.get("pbrMetallicRoughness", {}).get(slot) if slot == "baseColorTexture" else material.get(slot)
    if not texture_ref:
        return None
    texture = document["textures"][int(texture_ref["index"])]
    image = document["images"][int(texture["source"])]
    image_bytes: bytes
    if "bufferView" in image:
        view = document["bufferViews"][int(image["bufferView"])]
        start = int(view.get("byteOffset", 0))
        end = start + int(view["byteLength"])
        image_bytes = binary_chunk[start:end]
    else:
        uri = str(image.get("uri", ""))
        if uri.startswith("data:"):
            image_bytes = base64.b64decode(uri.split(",", 1)[1])
        elif uri:
            return (source_path.parent / uri).resolve()
        else:
            return None

    mime_type = str(image.get("mimeType", "image/jpeg"))
    extension = ".png" if mime_type == "image/png" else ".webp" if mime_type == "image/webp" else ".jpg"
    output_path = destination.with_suffix(extension)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not output_path.is_file() or output_path.read_bytes() != image_bytes:
        output_path.write_bytes(image_bytes)
    return output_path.resolve()


def create_kit_material(asset_id: str, source_path: Path, texture_cache: Path) -> str:
    material_network = hou.node("/mat")
    if material_network is None:
        raise RuntimeError("Missing /mat network")
    material_name = f"FB_Kit_{safe_name(asset_id)}"
    existing = material_network.node(material_name)
    if existing:
        existing.destroy()
    material = material_network.createNode("principledshader::2.0", material_name)
    material.parm("basecolor_usePointColor").set(0)
    material.parmTuple("basecolor").set((0.74, 0.70, 0.62))
    material.parm("rough").set(0.76)
    material.parm("metallic").set(0.28 if any(token in asset_id for token in ("iron", "weapon", "armor", "chain", "cage", "portcullis", "brazier", "sconce", "candelabra")) else 0.04)

    base_color = extract_glb_texture(source_path, "baseColorTexture", texture_cache / f"{asset_id}-basecolor")
    if base_color:
        material.parm("basecolor_useTexture").set(1)
        material.parm("basecolor_texture").set(base_color.as_posix())
        material.parm("basecolor_textureIntensity").set(0.86)
    normal = extract_glb_texture(source_path, "normalTexture", texture_cache / f"{asset_id}-normal")
    if normal:
        material.parm("baseBumpAndNormal_enable").set(1)
        material.parm("baseBumpAndNormal_type").set("normal")
        material.parm("baseNormal_useTexture").set(1)
        material.parm("baseNormal_texture").set(normal.as_posix())
        material.parm("baseNormal_scale").set(0.62)
    return material.path()


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
        uv_scale = 0.22 if kind == "floor" else 0.42 if kind == "wall" else 0.30
        for vertex, (u, v) in zip(vertices, projected, strict=True):
            vertex.setAttribValue("uv", (u * uv_scale, v * uv_scale, 0.0))
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


def add_masonry_wall_run(
    builder: GeometryBuilder,
    orientation: str,
    fixed: int,
    start: int,
    end: int,
    zone: str,
    height: float,
    tile_size: float,
    seed: int,
) -> None:
    fixed_world = fixed * 0.5 * tile_size
    run_min = (start - 0.5) * tile_size
    run_max = (end + 0.5) * tile_size
    run_length = run_max - run_min
    thickness = 0.58
    wall_name = f"wall_{orientation}_{fixed}_{start}_{end}_{zone}"
    backing_center = (
        (fixed_world, height * 0.5 - 0.04, (run_min + run_max) * 0.5)
        if orientation == "vertical"
        else ((run_min + run_max) * 0.5, height * 0.5 - 0.04, fixed_world)
    )
    backing_size = (
        (thickness * 0.72, height, run_length)
        if orientation == "vertical"
        else (run_length, height, thickness * 0.72)
    )
    builder.add_box(f"{wall_name}_mortar", backing_center, backing_size, MORTAR, "mortar")

    row_height = 0.62
    row_count = max(2, int(height / row_height))
    base_color = WALL_COLORS[zone]
    for row in range(row_count):
        cursor = run_min - (0.62 if row % 2 else 0.0)
        segment = 0
        while cursor < run_max:
            block_hash = _hash2d(fixed * 31 + row, start * 17 + segment, seed ^ 0xB10C5)
            target_length = 1.22 + (block_hash % 29) * 0.018
            segment_start = max(cursor + 0.035, run_min + 0.025)
            segment_end = min(cursor + target_length - 0.035, run_max - 0.025)
            if segment_end - segment_start > 0.22:
                block_length = segment_end - segment_start
                block_height = row_height * (0.78 + ((block_hash >> 6) % 11) * 0.012)
                block_depth = thickness * (0.94 + ((block_hash >> 12) % 9) * 0.012)
                depth_jitter = (((block_hash >> 17) % 9) - 4) * 0.009
                brightness = 0.82 + ((block_hash >> 21) % 23) * 0.009
                color = tuple(min(1.0, channel * brightness) for channel in base_color)
                varying = (segment_start + segment_end) * 0.5
                y = 0.06 + row * row_height + block_height * 0.5
                center = (
                    (fixed_world + depth_jitter, y, varying)
                    if orientation == "vertical"
                    else (varying, y, fixed_world + depth_jitter)
                )
                size = (
                    (block_depth, block_height, block_length)
                    if orientation == "vertical"
                    else (block_length, block_height, block_depth)
                )
                builder.add_box(f"{wall_name}_course_{row}_{segment}", center, size, color, "wall")
            cursor += target_length
            segment += 1

    cap_y = row_count * row_height + 0.08
    cap_cursor = run_min
    cap_index = 0
    while cap_cursor < run_max:
        cap_length = min(1.12, run_max - cap_cursor)
        varying = cap_cursor + cap_length * 0.5
        center = (
            (fixed_world, cap_y, varying)
            if orientation == "vertical"
            else (varying, cap_y, fixed_world)
        )
        size = (
            (thickness + 0.18, 0.24, max(0.12, cap_length - 0.035))
            if orientation == "vertical"
            else (max(0.12, cap_length - 0.035), 0.24, thickness + 0.18)
        )
        builder.add_box(f"{wall_name}_cap_{cap_index}", center, size, base_color, "wall")
        cap_cursor += cap_length
        cap_index += 1

    for endpoint_index, endpoint in enumerate((run_min, run_max)):
        center = (
            (fixed_world, height * 0.47, endpoint)
            if orientation == "vertical"
            else (endpoint, height * 0.47, fixed_world)
        )
        builder.add_box(
            f"{wall_name}_buttress_{endpoint_index}",
            center,
            (0.82, height + 0.18, 0.82),
            base_color,
            "wall",
        )


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


def add_floor_conduit(
    builder: GeometryBuilder,
    name: str,
    start: tuple[float, float],
    end: tuple[float, float],
    color: Color,
    kind: str = "emissive",
    width: float = 0.048,
) -> None:
    delta_x = end[0] - start[0]
    delta_z = end[1] - start[1]
    length = math.hypot(delta_x, delta_z)
    if length <= 0.001:
        return
    builder.add_box(
        name,
        ((start[0] + end[0]) * 0.5, 0.055, (start[1] + end[1]) * 0.5),
        (length, 0.035, width),
        color,
        kind,
        yaw=math.atan2(delta_z, delta_x),
    )


def add_floor_ring(
    builder: GeometryBuilder,
    name: str,
    center: tuple[float, float],
    radius: float,
    color: Color,
    kind: str,
    segments: int = 32,
) -> None:
    segment_length = math.tau * radius / segments * 0.90
    for index in range(segments):
        angle = index / segments * math.tau
        builder.add_box(
            f"{name}_{index}",
            (center[0] + math.cos(angle) * radius, 0.042, center[1] + math.sin(angle) * radius),
            (segment_length, 0.035, 0.065),
            color,
            kind,
            yaw=angle + math.pi / 2,
        )


def add_floor_patch(
    builder: GeometryBuilder,
    name: str,
    center: tuple[float, float],
    radius_x: float,
    radius_z: float,
    color: Color,
    seed: int,
    vertices: int = 9,
) -> None:
    points: list[hou.Point] = []
    for index in range(vertices):
        angle = index / vertices * math.tau
        patch_hash = _hash2d(index, vertices, seed)
        jitter = 0.72 + (patch_hash % 29) * 0.012
        position = (
            center[0] + math.cos(angle) * radius_x * jitter,
            0.024,
            center[1] + math.sin(angle) * radius_z * jitter,
        )
        points.append(builder._point(position, color))
    builder._polygon(points, name, "mortar" if same_color(color, MORTAR) else "prop", color)


def add_training_chamber_identity(payload: dict, builder: GeometryBuilder) -> None:
    dungeon = payload["dungeon"]
    tile_size = float(payload["tileSize"])
    seed = int(payload["seed"])
    props = {prop["id"]: prop for prop in dungeon["props"]}

    def bookshelf(name: str, grid_x: float, grid_z: float, yaw: float = 0.0) -> None:
        x = grid_x * tile_size
        z = grid_z * tile_size
        builder.add_box(f"{name}_back", (x, 1.18, z), (1.72, 2.36, 0.16), WOOD, "prop", yaw=yaw)
        for offset_index, offset in enumerate((-0.78, 0.78)):
            local_x, local_z = rotated_xz(offset, 0.0, yaw)
            builder.add_box(f"{name}_post_{offset_index}", (x + local_x, 1.18, z + local_z), (0.16, 2.42, 0.38), IRON, "prop", yaw=yaw)
        for level in range(4):
            shelf_y = 0.18 + level * 0.66
            builder.add_box(f"{name}_shelf_{level}", (x, shelf_y, z), (1.72, 0.12, 0.44), WOOD, "prop", yaw=yaw)
            if level == 3:
                continue
            for book in range(7):
                book_hash = _hash2d(level, book, seed ^ sum(ord(character) for character in name))
                book_x = -0.61 + book * 0.19
                local_x, local_z = rotated_xz(book_x, -0.11, yaw)
                book_color = (BRONZE, SOULGLASS, WOOD)[book_hash % 3]
                builder.add_box(
                    f"{name}_book_{level}_{book}",
                    (x + local_x, shelf_y + 0.27, z + local_z),
                    (0.12, 0.40 + (book_hash % 5) * 0.025, 0.20),
                    book_color,
                    "prop",
                    yaw=yaw + (((book_hash >> 4) % 5) - 2) * 0.018,
                )

    for index, placement in enumerate(((2.8, 0.10, 0.0), (9.3, 0.10, 0.0), (12.4, 0.10, 0.0), (0.10, 4.1, math.pi / 2))):
        bookshelf(f"training_archive_{index}", *placement)

    shrine_x = 6.0 * tile_size
    shrine_z = -0.34 * tile_size
    for side_index, side in enumerate((-1.0, 1.0)):
        builder.add_box(f"realm_shrine_pier_{side_index}", (shrine_x + side * 1.72, 1.72, shrine_z), (0.54, 3.44, 0.58), WALL_COLORS["training"], "wall")
        builder.add_box(f"realm_shrine_pier_cap_{side_index}", (shrine_x + side * 1.72, 3.22, shrine_z + 0.05), (0.82, 0.32, 0.72), BRONZE, "prop")
    builder.add_box("realm_shrine_lintel", (shrine_x, 3.58, shrine_z), (4.12, 0.58, 0.62), WALL_COLORS["training"], "wall")
    builder.add_box("realm_shrine_recess", (shrine_x, 2.05, shrine_z + 0.20), (2.78, 2.48, 0.10), IRON, "prop")
    for ring_index, radius in enumerate((0.82, 0.58, 0.34)):
        builder.add_octahedron(
            f"realm_shrine_memory_{ring_index}",
            (shrine_x, 2.12, shrine_z + 0.30 + ring_index * 0.09),
            radius,
            SOULGLASS if ring_index == 2 else BRONZE if ring_index == 0 else IRON,
            "emissive" if ring_index == 2 else "prop",
        )

    mural_colors = (EMBER, SOULGLASS, BRONZE)
    for index, grid_x in enumerate((3.25, 9.5, 12.55)):
        x = grid_x * tile_size
        z = -0.34 * tile_size
        builder.add_box(f"realm_relief_{index}_back", (x, 2.22, z), (2.52, 1.52, 0.20), IRON, "prop")
        builder.add_box(f"realm_relief_{index}_field", (x, 2.22, z + 0.13), (2.18, 1.20, 0.10), BRONZE, "prop")
        builder.add_octahedron(f"realm_relief_{index}_world", (x - 0.35, 2.22, z + 0.25), 0.31, mural_colors[index], "emissive")
        builder.add_box(f"realm_relief_{index}_fracture", (x + 0.52, 2.22, z + 0.25), (0.06, 0.92, 0.06), SOULGLASS, "emissive", yaw=-0.32 + index * 0.16)

    for index, placement in enumerate(((0.62, 2.2, True), (0.62, 11.35, False), (14.35, 2.2, False), (14.15, 11.55, True))):
        grid_x, grid_z, broken = placement
        x = grid_x * tile_size
        z = grid_z * tile_size
        shaft_height = 2.15 if broken else 3.62
        builder.add_cylinder(f"training_column_{index}_base", (x, 0.18, z), 0.82, 0.36, 12, WALL_COLORS["training"], "prop")
        builder.add_cylinder(f"training_column_{index}_shaft", (x, 0.36 + shaft_height * 0.5, z), 0.49, shaft_height, 12, WALL_COLORS["training"], "prop")
        builder.add_cylinder(f"training_column_{index}_collar", (x, 1.42 if broken else 2.38, z), 0.56, 0.16, 12, BRONZE, "prop")
        if broken:
            builder.add_box(f"training_column_{index}_fallen", (x + 0.78, 0.42, z + 0.42), (1.42, 0.68, 0.72), WALL_COLORS["training"], "prop", yaw=0.42 + index * 0.23)

    for index, placement in enumerate(((11.2, 2.3, -0.18), (1.7, 10.1, 0.32), (12.8, 11.2, -0.18))):
        add_abandoned_table(builder, f"training_table_{index}", placement[0] * tile_size, placement[1] * tile_size, placement[2], index)

    for index, placement in enumerate(((2.1, 6.1, SOULGLASS), (9.6, 2.0, SOULGLASS), (13.5, 6.95, EMBER), (9.6, 11.8, EMBER))):
        x = placement[0] * tile_size
        z = placement[1] * tile_size
        builder.add_cylinder(f"training_brazier_{index}_base", (x, 0.13, z), 0.44, 0.26, 10, WALL_COLORS["training"], "prop")
        builder.add_cylinder(f"training_brazier_{index}_stem", (x, 0.72, z), 0.15, 1.18, 8, IRON, "prop")
        builder.add_cylinder(f"training_brazier_{index}_bowl", (x, 1.36, z), 0.48, 0.24, 12, BRONZE, "prop")
        builder.add_octahedron(f"training_brazier_{index}_flame", (x, 1.73, z), 0.30, placement[2], "emissive")

    well = props["well"]
    loom = props["memory-loom"]
    well_position = (well["x"] * tile_size, well["y"] * tile_size)
    loom_position = (loom["x"] * tile_size, loom["y"] * tile_size)
    add_floor_conduit(builder, "loom_to_soulwell_conduit", loom_position, well_position, BRONZE, "prop", 0.07)
    for gate_id, color in (("gate-wayfarer", SOUL_CHANNEL), ("gate-oathbreaker", EMBER_CHANNEL)):
        gate = props[gate_id]
        gate_position = ((gate["x"] + 0.2) * tile_size, gate["y"] * tile_size)
        add_floor_conduit(builder, f"{gate_id}_conduit", well_position, gate_position, color, "emissive", 0.075)

    for index, placement in enumerate(((0.32, 1.3, 0.0), (5.4, 0.22, 0.0), (13.8, 0.28, 0.0), (0.22, 8.7, math.pi / 2))):
        x = placement[0] * tile_size
        z = placement[1] * tile_size
        builder.add_box(f"training_moss_{index}", (x, 0.15, z), (1.42, 0.10, 0.18), MOSS, "prop", yaw=placement[2])

    for index, (grid_x, grid_z, radius_x, radius_z, color) in enumerate((
        (2.1, 2.0, 1.8, 0.9, ASH),
        (12.9, 9.8, 2.2, 1.1, ASH),
        (3.1, 11.2, 1.6, 0.8, ASH),
        (11.7, 1.2, 1.5, 0.7, ASH),
    )):
        add_floor_patch(
            builder,
            f"training_age_patch_{index}",
            (grid_x * tile_size, grid_z * tile_size),
            radius_x,
            radius_z,
            color,
            seed ^ (0x7A9E + index * 41),
            8 + index,
        )

    for index, placement in enumerate(((0.9, 12.2), (2.0, 12.45), (12.8, 12.5), (14.3, 10.9), (0.55, 6.8), (13.9, 1.2))):
        x = placement[0] * tile_size
        z = placement[1] * tile_size
        for shard in range(3):
            shard_hash = _hash2d(index, shard, seed ^ 0xA63D)
            radius = 0.16 + (shard_hash % 5) * 0.035
            builder.add_octahedron(
                f"training_debris_{index}_{shard}",
                (x + (shard - 1) * 0.31, radius * 0.72, z + ((shard_hash >> 5) % 5 - 2) * 0.09),
                radius,
                MOSS if shard_hash % 7 == 0 else WALL_COLORS["training"],
                "dressing",
            )

    for index, (grid_x, grid_z, length, yaw) in enumerate(((3.1, 11.9, 2.2, -0.35), (10.7, 10.8, 1.6, 0.48), (1.4, 5.4, 1.8, -0.9), (12.1, 3.0, 2.0, 0.22))):
        builder.add_box(
            f"training_floor_fracture_{index}",
            (grid_x * tile_size, 0.018, grid_z * tile_size),
            (length, 0.028, 0.045),
            MORTAR,
            "mortar",
            yaw=yaw,
        )


def add_boss_chamber_identity(payload: dict, builder: GeometryBuilder) -> None:
    dungeon = payload["dungeon"]
    tile_size = float(payload["tileSize"])
    seed = int(payload["seed"])
    boss = next(room for room in dungeon["rooms"] if room["id"] == "boss")
    center_x = boss["center"]["x"] * tile_size
    center_z = boss["center"]["y"] * tile_size
    center = (center_x, center_z)

    add_floor_patch(builder, "ashen_lock_scorch", center, 5.4, 4.6, ASH, seed ^ 0xA501, 13)
    add_floor_ring(builder, "ashen_lock_outer", center, 4.25, WALL_COLORS["boss"], "prop", 40)
    add_floor_ring(builder, "ashen_lock_bronze", center, 3.48, BRONZE, "prop", 36)
    add_floor_ring(builder, "ashen_lock_inner", center, 2.12, IRON, "prop", 28)
    builder.add_cylinder("ashen_lock_plinth", (center_x, 0.22, center_z), 1.54, 0.44, 20, WALL_COLORS["boss"], "prop")
    builder.add_cylinder("ashen_lock_brand", (center_x, 0.47, center_z), 1.12, 0.08, 20, IRON, "prop")
    builder.add_octahedron("ashen_lock_ember_heart", (center_x, 0.92, center_z), 0.32, EMBER, "emissive")

    monolith_offsets = ((-4.7, -3.4), (4.7, -3.4), (-4.7, 3.4), (4.7, 3.4))
    for index, (offset_x, offset_z) in enumerate(monolith_offsets):
        x = center_x + offset_x
        z = center_z + offset_z
        damaged = index in (1, 3)
        height = 2.35 if damaged else 3.25
        builder.add_cylinder(f"ash_monolith_{index}_base", (x, 0.22, z), 0.92, 0.44, 10, WALL_COLORS["boss"], "prop")
        builder.add_box(f"ash_monolith_{index}_shaft", (x, 0.44 + height * 0.5, z), (0.92, height, 0.92), WALL_COLORS["boss"], "prop", yaw=index * 0.21)
        builder.add_box(f"ash_monolith_{index}_collar", (x, 1.38, z), (1.08, 0.20, 1.08), BRONZE, "prop", yaw=index * 0.21)
        builder.add_box(f"ash_monolith_{index}_soot_cap", (x, height + 0.46, z), (1.0, 0.10, 1.0), IRON, "prop", yaw=index * 0.21)
        if damaged:
            builder.add_box(f"ash_monolith_{index}_fallen_cap", (x + 0.72, 0.34, z + 0.42), (1.18, 0.58, 0.88), WALL_COLORS["boss"], "prop", yaw=0.46 + index * 0.15)
        else:
            builder.add_cylinder(f"ash_monolith_{index}_brazier", (x, height + 0.52, z), 0.48, 0.22, 10, BRONZE, "prop")
            builder.add_octahedron(f"ash_monolith_{index}_ember", (x, height + 0.86, z), 0.22, EMBER, "emissive")
        add_floor_conduit(builder, f"ash_chain_{index}", center, (x, z), BRONZE, "prop")

    for index in range(8):
        angle = index / 8 * math.tau + 0.16
        start_radius = 1.26
        end_radius = 4.1 + (index % 3) * 0.44
        add_floor_conduit(
            builder,
            f"ashen_fracture_{index}",
            (center_x + math.cos(angle) * start_radius, center_z + math.sin(angle) * start_radius),
            (center_x + math.cos(angle + 0.10) * end_radius, center_z + math.sin(angle + 0.10) * end_radius),
            BRONZE if index % 3 == 0 else MORTAR,
            "prop" if index % 3 == 0 else "mortar",
        )

    perimeter_offsets = (
        (-11.8, -8.6), (-5.9, -9.6), (0.0, -10.0), (5.9, -9.6), (11.8, -8.6),
        (-12.6, 0.0), (12.6, 0.0),
        (-11.8, 8.6), (-5.9, 9.6), (0.0, 10.0), (5.9, 9.6), (11.8, 8.6),
    )
    for index, (offset_x, offset_z) in enumerate(perimeter_offsets):
        x = center_x + offset_x
        z = center_z + offset_z
        broken = index in (1, 4, 6, 9)
        height = 1.8 if broken else 3.15
        builder.add_cylinder(f"boss_perimeter_column_{index}_base", (x, 0.16, z), 0.68, 0.32, 10, WALL_COLORS["boss"], "prop")
        builder.add_cylinder(f"boss_perimeter_column_{index}_shaft", (x, 0.32 + height * 0.5, z), 0.42, height, 10, WALL_COLORS["boss"], "prop")
        if broken:
            builder.add_box(f"boss_perimeter_column_{index}_fall", (x + 0.68, 0.36, z + 0.36), (1.34, 0.58, 0.70), WALL_COLORS["boss"], "prop", yaw=index * 0.31)
        else:
            builder.add_box(f"boss_perimeter_column_{index}_cap", (x, height + 0.42, z), (1.12, 0.24, 1.12), IRON, "prop")

    for index, (offset_x, offset_z, yaw) in enumerate(((-13.4, -8.8, 0.18), (12.8, -8.4, -0.28), (-12.8, 8.2, 0.42), (12.4, 8.5, -0.18))):
        add_cave_in(builder, f"boss_collapse_{index}", center_x + offset_x, center_z + offset_z, WALL_COLORS["boss"], yaw, seed ^ (0xC011 + index * 31))

    for index, (offset_x, offset_z, radius_x, radius_z) in enumerate(((-8.6, -4.2, 2.5, 1.4), (8.8, 4.8, 2.8, 1.6), (-7.4, 6.4, 2.0, 1.2), (7.5, -6.2, 2.2, 1.3))):
        add_floor_patch(builder, f"boss_ash_stain_{index}", (center_x + offset_x, center_z + offset_z), radius_x, radius_z, ASH, seed ^ (0x51A1 + index * 47), 8 + index % 3)

    altar_x = center_x + boss["width"] * tile_size * 0.30
    builder.add_box("warden_reliquary_base", (altar_x, 0.42, center_z), (2.62, 0.84, 1.62), WALL_COLORS["boss"], "prop")
    builder.add_box("warden_reliquary_slab", (altar_x, 0.91, center_z), (2.84, 0.18, 1.78), IRON, "prop")
    builder.add_box("warden_reliquary_chain", (altar_x, 1.08, center_z), (2.18, 0.10, 0.16), BRONZE, "prop", yaw=-0.24)
    builder.add_octahedron("warden_reliquary_heart", (altar_x, 1.52, center_z), 0.34, EMBER, "emissive")

    scatter_radius_x = boss["width"] * tile_size * 0.36
    scatter_radius_z = boss["height"] * tile_size * 0.34
    for index in range(18):
        scatter_hash = _hash2d(index, boss["center"]["x"], seed ^ 0xA55E)
        angle = index / 18 * math.tau + (scatter_hash % 17) * 0.014
        radius_x = scatter_radius_x * (0.74 + (scatter_hash % 19) * 0.011)
        radius_z = scatter_radius_z * (0.72 + ((scatter_hash >> 5) % 19) * 0.012)
        x = center_x + math.cos(angle) * radius_x
        z = center_z + math.sin(angle) * radius_z
        if index % 4 == 0:
            add_bone_scatter(builder, f"boss_bone_field_{index}", x, z, scatter_hash)
        else:
            radius = 0.18 + (scatter_hash % 5) * 0.045
            builder.add_octahedron(f"boss_ash_debris_{index}", (x, radius * 0.72, z), radius, WALL_COLORS["boss"], "dressing")


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
            height = 3.45 if zone == "boss" else 2.9 if zone in ("training", "skirmish") else 2.35
            add_masonry_wall_run(builder, orientation, fixed, start, end, zone, height, tile_size, int(payload["seed"]))

    for prop in dungeon["props"]:
        if prop.get("assetId"):
            # Approved GLB kit props are imported as authored geometry below.
            # Keeping the primitive placeholder would create overlapping assets.
            spec = payload["environmentAssets"][prop["assetId"]]
            if spec.get("fireAnchorY") is not None:
                fire_x = (float(prop["x"]) + float(prop.get("offsetX", 0.0))) * tile_size
                fire_z = (float(prop["y"]) + float(prop.get("offsetY", 0.0))) * tile_size
                fire_y = float(spec.get("elevation", 0.0)) + float(spec["fireAnchorY"])
                fire_color = SOULGLASS if spec.get("fireColor") == "soul" else EMBER
                builder.add_octahedron(f"{safe_name(prop['id'])}_flame", (fire_x, fire_y, fire_z), 0.24, fire_color, "emissive")
            continue
        x = prop["x"] * tile_size
        z = prop["y"] * tile_size
        name = safe_name(prop["id"])
        kind = prop["kind"]
        if kind == "soul-well":
            builder.add_cylinder(f"{name}_plinth", (x, 0.17, z), 1.62, 0.34, 20, WALL_COLORS["training"], "prop")
            builder.add_cylinder(f"{name}_step", (x, 0.39, z), 1.38, 0.20, 24, BRONZE, "prop")
            builder.add_cylinder(f"{name}_basin", (x, 0.58, z), 1.16, 0.22, 28, IRON, "prop")
            builder.add_cylinder(f"{name}_water", (x, 0.71, z), 1.02, 0.055, 32, SOULGLASS, "emissive")
            for support_index, angle in enumerate((0.52, 2.62, 4.72)):
                support_x = x + math.cos(angle) * 1.18
                support_z = z + math.sin(angle) * 1.18
                builder.add_box(
                    f"{name}_cradle_{support_index}",
                    (support_x, 1.24, support_z),
                    (0.15, 1.62, 0.15),
                    IRON,
                    "prop",
                    yaw=-angle + 0.28,
                )
            builder.add_octahedron(f"{name}_focus", (x, 1.76, z), 0.38, SOULGLASS, "emissive")
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
            hard = "oathbreaker" in prop["id"]
            portal_color = EMBER if hard else SOULGLASS
            portal_x = (prop["x"] + 0.49) * tile_size
            stone_color = tuple(channel * (0.82 if hard else 1.0) for channel in WALL_COLORS["training"])
            for offset_index, offset in enumerate((-1.15, 1.15)):
                builder.add_box(f"{name}_pier_{offset_index}", (portal_x, 1.72, z + offset), (0.82, 3.44, 0.58), stone_color, "wall")
                builder.add_box(f"{name}_pier_base_{offset_index}", (portal_x - 0.08, 0.18, z + offset), (1.04, 0.36, 0.82), BRONZE, "prop")
                builder.add_box(f"{name}_pier_cap_{offset_index}", (portal_x, 3.23, z + offset), (1.02, 0.32, 0.82), stone_color, "wall")
            builder.add_box(f"{name}_lintel", (portal_x, 3.62, z), (0.82, 0.58, 2.88), stone_color, "wall")
            builder.add_octahedron(f"{name}_keystone", (portal_x - 0.45, 3.67, z), 0.34, portal_color, "emissive")
            builder.add_box(f"{name}_shadow", (portal_x - 0.22, 1.64, z), (0.075, 2.82, 1.74), IRON, "prop")
            for rune_index, rune_y in enumerate((0.48, 2.72)):
                builder.add_box(f"{name}_rune_{rune_index}", (portal_x - 0.43, rune_y, z), (0.08, 0.10, 1.58), portal_color, "emissive")
            for index in range(-2, 3):
                builder.add_box(f"{name}_bar_{index}", (portal_x - 0.40, 1.48, z + index * 0.30), (0.12, 2.72, 0.10), IRON, "prop")
            for rail_index, rail_y in enumerate((0.42, 1.46, 2.49)):
                builder.add_box(f"{name}_rail_{rail_index}", (portal_x - 0.41, rail_y, z), (0.13, 0.13, 1.60), BRONZE if hard else IRON, "prop")
            builder.add_box(f"{name}_threshold", (portal_x - 0.72, 0.055, z), (1.28, 0.10, 2.02), BRONZE if hard else IRON, "prop")
        elif kind == "essence":
            builder.add_octahedron(name, (x, 0.82, z), 0.64, SOULGLASS, "emissive")
        elif kind == "memory-loom":
            builder.add_box(f"{name}_frame", (x, 1.16, z), (1.70, 2.28, 0.32), BRONZE, "prop")
            builder.add_box(f"{name}_memory", (x, 1.16, z), (1.28, 1.74, 0.12), SOULGLASS, "emissive")
        elif kind == "training-effigy":
            builder.add_cylinder(f"{name}_base", (x, 0.18, z), 0.62, 0.36, 10, BRONZE, "prop")
            builder.add_box(f"{name}_body", (x, 1.13, z), (0.72, 1.54, 0.42), WOOD, "prop")
            builder.add_cylinder(f"{name}_head", (x, 2.08, z), 0.34, 0.58, 10, WOOD, "prop")

    add_training_chamber_identity(payload, builder)
    add_boss_chamber_identity(payload, builder)

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

    room_quotas = {"training": 4, "skirmish": 24, "boss": 8}
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
    *,
    max_footprint: float | None = None,
    elevation: float = 0.0,
    rotation_y: float = 0.0,
    vertical_scale: float = 1.0,
    material_path: str | None = None,
) -> dict:
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    container = parent.createNode("geo", safe_name(name))
    for child in container.children():
        child.destroy()
    importer = container.createNode("gltf::2.0", "SOURCE_GLTF")
    importer.parm("gltffile").set(source_path.as_posix())
    importer.parm("importnodegeometryas").set("flattenedgeometry")
    importer.parm("enablematerialimport").set(0 if material_path else (1 if visible else 0))
    geometry = importer.geometry()
    if not geometry or not geometry.prims():
        raise RuntimeError(f"Houdini imported no geometry from {source_path}")
    bounds = geometry.boundingBox()
    source_height = max(bounds.sizevec()[1], 0.001)
    source_footprint = max(bounds.sizevec()[0], bounds.sizevec()[2], 0.001)
    scale = target_height / source_height
    if max_footprint is not None:
        scale = min(scale, max_footprint / source_footprint)
    transform = container.createNode("xform", "NORMALIZE_AND_GROUND")
    transform.setInput(0, importer)
    transform.parm("scale").set(scale)
    transform.parmTuple("s").set((1.0, vertical_scale, 1.0))
    transform.parm("tx").set(-bounds.center()[0] * scale)
    transform.parm("ty").set(-bounds.minvec()[1] * scale)
    transform.parm("tz").set(-bounds.center()[2] * scale)
    display_node = transform
    if material_path:
        material = container.createNode("material", "APPLY_PREVIEW_MATERIAL")
        material.setInput(0, transform)
        material.parm("shop_materialpath1").set(material_path)
        display_node = material
    display_node.setDisplayFlag(True)
    display_node.setRenderFlag(True)
    container.parmTuple("t").set((position[0], elevation, position[1]))
    container.parmTuple("r").set((0.0, math.degrees(rotation_y), 0.0))
    container.setUserData("souldrifter_source", source_path.as_posix())
    container.setDisplayFlag(visible)
    return {
        "name": name,
        "source": source_path.as_posix(),
        "points": len(geometry.points()),
        "primitives": len(geometry.prims()),
        "scale": scale,
        "maxFootprint": max_footprint,
        "elevation": elevation,
        "rotationY": rotation_y,
        "verticalScale": vertical_scale,
        "material": material_path,
        "visible": visible,
    }


def create_environment_prop_references(obj: hou.Node, payload: dict, game_root: Path) -> list[dict]:
    tile_size = float(payload["tileSize"])
    asset_specs = payload["environmentAssets"]
    source_roots = (
        game_root / "docs" / "3d-ai-studio" / "source-models" / "environment" / "dungeon-completion-kit",
        game_root / "docs" / "3d-ai-studio" / "source-models" / "environment" / "dungeon-kit",
    )
    kit = obj.createNode("subnet", "APPROVED_DUNGEON_KIT")
    texture_cache = game_root / "source-assets" / "houdini" / ".cache" / "dungeon-kit-textures"
    diagnostics: list[dict] = []
    material_paths: dict[str, str] = {}

    def source_for(asset_id: str, source_url: str) -> Path:
        filename = Path(source_url).name
        for root in source_roots:
            candidate = root / filename
            if candidate.is_file():
                return candidate
        raise FileNotFoundError(f"No Houdini source GLB for {asset_id}: {filename}")

    for prop in payload["dungeon"]["props"]:
        asset_id = prop.get("assetId")
        if not asset_id:
            continue
        spec = asset_specs[asset_id]
        source_path = source_for(asset_id, spec["sourceUrl"])
        if asset_id not in material_paths:
            material_paths[asset_id] = create_kit_material(asset_id, source_path, texture_cache)
        material_path = material_paths[asset_id]
        x = (float(prop["x"]) + float(prop.get("offsetX", 0.0))) * tile_size
        z = (float(prop["y"]) + float(prop.get("offsetY", 0.0))) * tile_size
        diagnostic = create_model_reference(
            kit,
            f"{prop['id']}_{asset_id}",
            source_path,
            (x, z),
            float(spec["targetHeight"]),
            True,
            max_footprint=float(spec["maxFootprint"]),
            elevation=float(spec.get("elevation", 0.0)),
            rotation_y=float(prop.get("rotationY", 0.0)),
            vertical_scale=float(spec.get("verticalScale", 1.0)),
            material_path=material_path,
        )
        diagnostic["assetId"] = asset_id
        diagnostic["roomId"] = prop["roomId"]
        model_node = kit.node(safe_name(diagnostic["name"]))
        model_node.setUserData("souldrifter_asset_id", asset_id)
        model_node.setUserData("souldrifter_room_id", prop["roomId"])
        diagnostics.append(diagnostic)

    kit.setUserData("souldrifter_seed", str(payload["seed"]))
    kit.setUserData("souldrifter_semantic_placement", "true")
    kit.moveToGoodPosition()
    return diagnostics


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
    preview.setDisplayFlag(False)
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
    target.setDisplayFlag(False)
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
        detail_target.setDisplayFlag(False)
        detail = obj.createNode("cam", name)
        detail.parmTuple("t").set((room_x - room_span * 0.72, room_span * 0.84, room_z + room_span * 0.72))
        detail.parm("lookatpath").set(detail_target.path())
        detail.parm("projection").set("ortho")
        detail.parm("orthowidth").set(room_span * width_multiplier)
        return detail

    training_camera = detail_camera("training", "TRAINING_MATERIAL_CAMERA", 1.32)
    detail_camera("skirmish", "SKIRMISH_MATERIAL_CAMERA", 1.18)
    detail_camera("boss", "BOSS_MATERIAL_CAMERA", 1.18)
    training_camera.setCurrent(True)


def create_lighting(obj: hou.Node, payload: dict) -> None:
    tile_size = float(payload["tileSize"])
    rooms = {room["id"]: room for room in payload["dungeon"]["rooms"]}
    props = {prop["id"]: prop for prop in payload["dungeon"]["props"]}

    def distant(name: str, rotation: Vector3, color: Color, exposure: float) -> None:
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("distant")
        light.parmTuple("r").set(rotation)
        light.parmTuple("light_color").set(color)
        light.parm("light_exposure").set(exposure)
        light.parm("ogl_enablelight").set(1)
        light.setDisplayFlag(False)

    def point(name: str, grid_x: float, grid_z: float, height: float, color: Color, intensity: float, exposure: float, radius: float = 7.0) -> None:
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("point")
        light.parmTuple("t").set((grid_x * tile_size, height, grid_z * tile_size))
        light.parmTuple("light_color").set(color)
        light.parm("light_intensity").set(intensity * 2.2)
        light.parm("light_exposure").set(exposure)
        light.parm("atten_dist").set(radius * 0.65)
        light.parm("activeradiusenable").set(1)
        light.parm("activeradius").set(radius)
        light.parm("shadow_softness").set(0.55)
        light.parm("ogl_enablelight").set(1)
        light.setDisplayFlag(False)

    ambient = obj.createNode("ambient", "DUNGEON_AMBIENT_FILL")
    ambient.parmTuple("light_color").set((0.12, 0.16, 0.18))
    ambient.parm("light_intensity").set(0.38)
    ambient.parm("ogl_enablelight").set(1)
    ambient.setDisplayFlag(False)

    distant("ISO_MOON_KEY", (-52.0, -34.0, -24.0), (0.44, 0.59, 0.72), 0.48)
    distant("ISO_WARM_RIM", (-34.0, 142.0, 16.0), (0.78, 0.43, 0.24), -0.42)
    well = props["well"]
    point("SOULWELL_GLOW", well["x"], well["y"], 2.25, (0.08, 0.70, 0.66), 1.8, 0.0, 8.5)
    for gate_id, name, color, intensity in (
        ("gate-wayfarer", "WAYFARER_GATE_GLOW", (0.10, 0.66, 0.62), 0.90),
        ("gate-oathbreaker", "OATHBREAKER_GATE_GLOW", (0.86, 0.15, 0.03), 1.05),
    ):
        gate = props[gate_id]
        point(name, gate["x"] - 0.45, gate["y"], 2.15, color, intensity, 0.0, 5.8)
    point("ARCHIVE_SOUL_LAMP", 7.8, 1.15, 2.55, (0.16, 0.65, 0.62), 0.78, 0.0, 5.2)
    point("TRAINING_EMBER_LAMP", 10.0, 11.4, 2.15, (0.95, 0.24, 0.08), 0.86, 0.0, 5.2)
    for prop in payload["dungeon"]["props"]:
        asset_id = prop.get("assetId")
        if not asset_id:
            continue
        spec = payload["environmentAssets"][asset_id]
        if spec.get("fireAnchorY") is None:
            continue
        fire_color = (0.08, 0.70, 0.66) if spec.get("fireColor") == "soul" else (0.96, 0.25, 0.055)
        point(
            f"PROP_FIRE_{safe_name(prop['id'])}",
            float(prop["x"]) + float(prop.get("offsetX", 0.0)),
            float(prop["y"]) + float(prop.get("offsetY", 0.0)),
            float(spec.get("elevation", 0.0)) + float(spec["fireAnchorY"]),
            fire_color,
            0.62 if spec.get("fireCastsShadow") else 0.42,
            -0.18,
            4.8,
        )
    training = rooms["training"]
    point("TRAINING_ROOM_FILL", training["center"]["x"], training["center"]["y"], 7.5, (0.34, 0.46, 0.49), 0.46, -0.5, 14.0)
    boss = rooms["boss"]
    point("ASHEN_LOCK_GLOW", boss["center"]["x"], boss["center"]["y"], 2.4, (0.92, 0.19, 0.035), 1.45, 0.0, 9.0)
    point("BOSS_ROOM_FILL", boss["center"]["x"], boss["center"]["y"], 8.5, (0.36, 0.28, 0.24), 0.52, -0.5, 16.0)
    for index, (offset_x, offset_z) in enumerate(((-4.7, -3.4), (4.7, 3.4), (-10.2, 5.8), (10.4, -5.8))):
        point(f"BOSS_FIRE_POOL_{index}", boss["center"]["x"] + offset_x / tile_size, boss["center"]["y"] + offset_z / tile_size, 2.0, (0.88, 0.24, 0.055), 0.72, 0.0)


def create_review_renders(out: hou.Node) -> None:
    for name, camera in (
        ("FULL_ROUTE_REVIEW_RENDER", "/obj/ISO_CAMERA"),
        ("TRAINING_REVIEW_RENDER", "/obj/TRAINING_MATERIAL_CAMERA"),
        ("SKIRMISH_REVIEW_RENDER", "/obj/SKIRMISH_MATERIAL_CAMERA"),
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
        render.parm("fogopacity").set(0.22)
        render.parmTuple("fogcolor").set((0.075, 0.105, 0.125))
        render.parmTuple("fogrange").set((0.0, 1000.0))
        render.parm("bloom").set(1)
        render.parm("bloomscale").set(6.0)
        render.parm("bloomintensity").set(0.07)
        render.parm("bloomthreshold").set(0.98)
        render.parm("colorcorrect").set("lut_gamma")
        render.parm("gamma").set(1.12)

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

    environment_diagnostics = create_environment_prop_references(obj, payload, game_root)
    actor_diagnostics = create_actor_references(obj, payload, game_root)
    diagnostics = [*environment_diagnostics, *actor_diagnostics]
    create_camera(obj, payload)
    create_lighting(obj, payload)
    create_review_renders(hou.node("/out"))

    metadata = obj.createNode("null", "FIRST_BREACH_BUILD_METADATA")
    metadata.setUserData("souldrifter_seed", str(payload["seed"]))
    metadata.setUserData("souldrifter_source", payload["source"])
    metadata.setUserData("souldrifter_license", hou.licenseCategory().name())
    metadata.setUserData("souldrifter_textures", json.dumps(texture_references, separators=(",", ":")))
    metadata.setUserData("souldrifter_model_diagnostics", json.dumps(diagnostics, separators=(",", ":")))
    metadata.setUserData("souldrifter_environment_models", json.dumps(environment_diagnostics, separators=(",", ":")))

    obj.layoutChildren()
    environment.layoutChildren()
    hou.clearAllSelected()
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
        "environmentModels": len(environment_diagnostics),
        "hip": args.hip.resolve().as_posix(),
        "hipBytes": args.hip.stat().st_size,
        "obj": args.obj.resolve().as_posix(),
        "objBytes": args.obj.stat().st_size,
        "textures": texture_references,
        "materials": len(MATERIAL_PATHS),
    }))


if __name__ == "__main__":
    main()
