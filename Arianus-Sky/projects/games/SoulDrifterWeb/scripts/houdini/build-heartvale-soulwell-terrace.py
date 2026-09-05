#!/usr/bin/env hython
"""Build the Heartvale Soul Well starting area (Houdini source + browser OBJ).

Reads the layout JSON produced by export-heartvale-soulwell-layout.mjs and
builds the basin terrain, rivers, roads, the Soul Well emergence terrace, and
seeded dressing. Saves a .hipnc source scene and exports an OBJ blockout.

Scale authority (must match the layout JSON):
  1 tile = 1.75 m, 1 atlas unit = 5 tiles, world origin = Soul Well terrace,
  +X east, +Z south, +Y up.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
from pathlib import Path
from typing import Sequence

import hou


Color = tuple[float, float, float]
Vector3 = tuple[float, float, float]

# Palette — Heartvale: temperate river valley, harvest plains, kind forest.
GRASS: Color = (0.30, 0.44, 0.20)
GRASS_DRY: Color = (0.42, 0.48, 0.22)
MEADOW: Color = (0.36, 0.50, 0.24)
DIRT_ROAD: Color = (0.45, 0.36, 0.25)
RIVERBED: Color = (0.52, 0.47, 0.35)
TERRACE_STONE: Color = (0.55, 0.53, 0.47)
WELL_STONE: Color = (0.42, 0.41, 0.37)
RIVER_WATER: Color = (0.16, 0.34, 0.36)
SOUL_WATER: Color = (0.10, 0.52, 0.50)
SHARD: Color = (0.12, 0.62, 0.58)
PORTAL_DARK: Color = (0.05, 0.06, 0.07)
BARK: Color = (0.30, 0.21, 0.13)
LEAF: Color = (0.24, 0.42, 0.18)
LEAF_WARM: Color = (0.35, 0.46, 0.17)
ROCK: Color = (0.44, 0.43, 0.39)
MARKER: Color = (0.50, 0.49, 0.44)

MATERIAL_PATHS = {
    "terrain": "/mat/HV_Terrain",
    "terrace": "/mat/HV_Terrace_Stone",
    "wellstone": "/mat/HV_Well_Stone",
    "water": "/mat/HV_River_Water",
    "soulwater": "/mat/HV_Soul_Water",
    "shard": "/mat/HV_Echo_Shard",
    "portal": "/mat/HV_Portal_Dark",
    "bark": "/mat/HV_Bark",
    "leaf": "/mat/HV_Leaf",
    "rock": "/mat/HV_Rock",
    "marker": "/mat/HV_Marker_Stone",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("layout", type=Path)
    parser.add_argument("hip", type=Path)
    parser.add_argument("obj", type=Path)
    return parser.parse_args()


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_") or "unnamed"


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def create_materials() -> None:
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

    shader("HV_Terrain", (1.0, 1.0, 1.0), 0.95)
    shader("HV_Terrace_Stone", TERRACE_STONE, 0.92)
    shader("HV_Well_Stone", WELL_STONE, 0.88)
    water = shader("HV_River_Water", RIVER_WATER, 0.18)
    if water.parm("alpha"):
        water.parm("alpha").set(0.86)
    soulwater = shader("HV_Soul_Water", SOUL_WATER, 0.12)
    soulwater.parmTuple("emitcolor").set(SOUL_WATER)
    soulwater.parm("emitint").set(0.05)
    shard = shader("HV_Echo_Shard", SHARD, 0.16, 0.10)
    shard.parm("emitcolor_usePointColor").set(1)
    shard.parmTuple("emitcolor").set(SHARD)
    shard.parm("emitint").set(0.06)
    shader("HV_Portal_Dark", PORTAL_DARK, 1.0)
    shader("HV_Bark", BARK, 0.92)
    leaf = shader("HV_Leaf", LEAF, 0.85)
    leaf.parm("basecolor_usePointColor").set(1)
    shader("HV_Rock", ROCK, 0.97)
    shader("HV_Marker_Stone", MARKER, 0.94)
    material_network.layoutChildren()


class GeometryBuilder:
    """Hand-built polygon soup with per-prim name/kind/material attribs."""

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

    def _polygon(
        self,
        points: Sequence[hou.Point],
        name: str,
        kind: str,
        color: Color,
        material: str,
    ) -> None:
        polygon = self.geometry.createPolygon()
        vertices: list[hou.Vertex] = []
        for point in points:
            vertices.append(polygon.addVertex(point))
        positions = [point.position() for point in points]
        ranges = [max(p[axis] for p in positions) - min(p[axis] for p in positions) for axis in range(3)]
        if ranges[1] <= min(ranges[0], ranges[2]):
            projected = [(p[0], p[2]) for p in positions]
        elif ranges[0] <= min(ranges[1], ranges[2]):
            projected = [(p[2], p[1]) for p in positions]
        else:
            projected = [(p[0], p[1]) for p in positions]
        uv_scale = 0.30
        for vertex, (u, v) in zip(vertices, projected, strict=True):
            vertex.setAttribValue("uv", (u * uv_scale, v * uv_scale, 0.0))
        polygon.setAttribValue("name", name)
        polygon.setAttribValue("path", f"/Heartvale/{kind}/{name}")
        polygon.setAttribValue("souldrifter_kind", kind)
        polygon.setAttribValue("shop_materialpath", material)

    def add_quad(
        self,
        name: str,
        corners: Sequence[Vector3],
        color: Color,
        kind: str,
        material: str,
    ) -> None:
        points = [self._point(position, color) for position in corners]
        self._polygon(points, name, kind, color, material)

    def add_box(
        self,
        name: str,
        center: Vector3,
        size: Vector3,
        color: Color,
        kind: str,
        material: str,
        yaw: float = 0.0,
    ) -> None:
        half_x, half_y, half_z = size[0] / 2, size[1] / 2, size[2] / 2
        corners: list[Vector3] = []
        for local_y in (-half_y, half_y):
            for local_z in (-half_z, half_z):
                for local_x in (-half_x, half_x):
                    x = local_x * math.cos(yaw) - local_z * math.sin(yaw)
                    z = local_x * math.sin(yaw) + local_z * math.cos(yaw)
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
            self._polygon([points[index] for index in face], name, kind, color, material)

    def add_cylinder(
        self,
        name: str,
        center: Vector3,
        radius: float,
        height: float,
        sides: int,
        color: Color,
        kind: str,
        material: str,
        cap_bottom: bool = True,
        cap_top: bool = True,
    ) -> None:
        bottom: list[hou.Point] = []
        top: list[hou.Point] = []
        for index in range(sides):
            angle = index / sides * math.tau
            x = center[0] + math.cos(angle) * radius
            z = center[2] + math.sin(angle) * radius
            bottom.append(self._point((x, center[1] - height / 2, z), color))
            top.append(self._point((x, center[1] + height / 2, z), color))
        if cap_bottom:
            self._polygon(list(reversed(bottom)), name, kind, color, material)
        if cap_top:
            self._polygon(top, name, kind, color, material)
        for index in range(sides):
            next_index = (index + 1) % sides
            self._polygon(
                [bottom[index], bottom[next_index], top[next_index], top[index]],
                name, kind, color, material,
            )

    def add_ring(
        self,
        name: str,
        center: Vector3,
        inner_radius: float,
        outer_radius: float,
        y: float,
        sides: int,
        color: Color,
        kind: str,
        material: str,
    ) -> None:
        """Flat horizontal annulus (well rim caps, terrace trim)."""
        for index in range(sides):
            a0 = index / sides * math.tau
            a1 = (index + 1) / sides * math.tau
            corners = [
                (center[0] + math.cos(a0) * inner_radius, y, center[2] + math.sin(a0) * inner_radius),
                (center[0] + math.cos(a1) * inner_radius, y, center[2] + math.sin(a1) * inner_radius),
                (center[0] + math.cos(a1) * outer_radius, y, center[2] + math.sin(a1) * outer_radius),
                (center[0] + math.cos(a0) * outer_radius, y, center[2] + math.sin(a0) * outer_radius),
            ]
            self.add_quad(name, corners, color, kind, material)

    def add_octahedron(
        self,
        name: str,
        center: Vector3,
        radius: float,
        color: Color,
        kind: str,
        material: str,
        squash: float = 1.0,
    ) -> None:
        positions = (
            (center[0], center[1] + radius, center[2]),
            (center[0], center[1] - radius, center[2]),
            (center[0] + radius * squash, center[1], center[2]),
            (center[0] - radius * squash, center[1], center[2]),
            (center[0], center[1], center[2] + radius * squash),
            (center[0], center[1], center[2] - radius * squash),
        )
        points = [self._point(position, color) for position in positions]
        for face in ((0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)):
            self._polygon([points[index] for index in face], name, kind, color, material)


class HeartvaleLayout:
    """Layout wrapper: coordinate conversion, terrain height, distance masks."""

    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.tile_size = float(payload["scale"]["tileSize"])
        self.zone_grid = int(payload["scale"]["zoneGrid"])
        soulwell = next(a for a in payload["anchors"] if a["id"] == "soulwell")
        self.origin_grid = (soulwell["grid"]["x"], soulwell["grid"]["y"])

        def to_world(samples: list[list[float]]) -> list[tuple[float, float]]:
            return [self.grid_to_world(gx, gy) for gx, gy in samples]

        self.rivers = [(r["id"], to_world(r["samples"])) for r in payload["rivers"]]
        self.roads = [(r["id"], to_world(r["samples"])) for r in payload["roads"]]
        self.river_samples = [sample for _, samples in self.rivers for sample in samples]
        self.road_samples = [sample for _, samples in self.roads for sample in samples]
        self.anchors = {a["id"]: a for a in payload["anchors"]}

    def grid_to_world(self, gx: float, gy: float) -> tuple[float, float]:
        return (
            (gx - self.origin_grid[0]) * self.tile_size,
            (gy - self.origin_grid[1]) * self.tile_size,
        )

    @staticmethod
    def _nearest(samples: list[tuple[float, float]], x: float, z: float) -> float:
        best = float("inf")
        for sx, sz in samples:
            d = (sx - x) * (sx - x) + (sz - z) * (sz - z)
            if d < best:
                best = d
        return math.sqrt(best)

    def river_distance(self, x: float, z: float) -> float:
        return self._nearest(self.river_samples, x, z)

    def road_distance(self, x: float, z: float) -> float:
        return self._nearest(self.road_samples, x, z)

    def base_height(self, x: float, z: float) -> float:
        """Rolling meadow height before carving (metres, terrace top = 1.35)."""
        h = 1.10 * math.sin(x * 0.021 + 1.3) * math.sin(z * 0.017 - 0.4)
        h += 0.50 * math.sin(x * 0.043) * math.sin(z * 0.050 + 2.0)
        # Mound north of the terrace — the Breach stair climbs out of it.
        h += 2.2 * math.exp(-((x - 0.0) ** 2 + (z + 14.0) ** 2) / (2 * 10.0**2))
        # Erboug rise to the east — the stones stand on high open ground.
        erboug = self.anchors["erboug"]["world"]
        h += 3.0 * math.exp(-((x - erboug["x"]) ** 2 + (z - erboug["z"]) ** 2) / (2 * 18.0**2))
        # Gentle falloff toward the far south so the basin drains to the mires.
        h -= 1.2 * smoothstep(80.0, 200.0, z)
        return h

    def terrain_height(self, x: float, z: float) -> float:
        h = self.base_height(x, z)
        # Terrace plateau: flat stone-ready pad under the Soul Well terrace.
        r = math.hypot(x, z)
        h = mix(h, 1.35, smoothstep(16.0, 10.5, r))
        # River channel carve.
        d_river = self.river_distance(x, z)
        h -= 1.55 * (1.0 - smoothstep(2.6, 5.2, d_river))
        # Roads damp the noise so the walk reads as a travelled path.
        d_road = self.road_distance(x, z)
        h = mix(h, round(h / 0.35) * 0.35, 0.55 * (1.0 - smoothstep(2.0, 4.5, d_road)))
        return h


def build_terrain(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Zone-wide terrain at 2-tile (3.5 m) sampling, colored by masks."""
    half_extent = layout.zone_grid * layout.tile_size / 2.0  # 140 m square
    step = layout.tile_size * 2.0
    count = int(half_extent * 2.0 / step)  # 80 quads per side
    origin = -half_extent

    # Shared point grid (81 x 81).
    point_grid: list[list[hou.Point]] = []
    for iz in range(count + 1):
        row: list[hou.Point] = []
        for ix in range(count + 1):
            x = origin + ix * step
            z = origin + iz * step
            row.append(builder._point((x, layout.terrain_height(x, z), z), GRASS))
        point_grid.append(row)

    for iz in range(count):
        for ix in range(count):
            x0 = origin + ix * step
            z0 = origin + iz * step
            cx = x0 + step / 2.0
            cz = z0 + step / 2.0
            d_river = layout.river_distance(cx, cz)
            d_road = layout.road_distance(cx, cz)
            r = math.hypot(cx, cz)
            if r < 12.0:
                color = TERRACE_STONE
            elif d_river < 3.2:
                color = RIVERBED
            elif d_road < 2.4:
                color = DIRT_ROAD
            else:
                patch = math.sin(cx * 0.13 + 0.7) * math.sin(cz * 0.11 - 1.1)
                color = GRASS if patch > 0.25 else GRASS_DRY if patch < -0.35 else MEADOW
            builder._polygon(
                [point_grid[iz][ix], point_grid[iz + 1][ix], point_grid[iz + 1][ix + 1], point_grid[iz][ix + 1]],
                f"terrain_{ix:02d}_{iz:02d}", "terrain", color, MATERIAL_PATHS["terrain"],
            )
            # Point colors carry the mask into the OBJ vertex colors.
            for corner in (point_grid[iz][ix], point_grid[iz + 1][ix], point_grid[iz + 1][ix + 1], point_grid[iz][ix + 1]):
                corner.setAttribValue("Cd", color)


def _polyline_normals(samples: list[tuple[float, float]]) -> list[tuple[float, float]]:
    normals: list[tuple[float, float]] = []
    for index, (x, z) in enumerate(samples):
        if index == 0:
            dx, dz = samples[1][0] - x, samples[1][1] - z
        elif index == len(samples) - 1:
            dx, dz = x - samples[index - 1][0], z - samples[index - 1][1]
        else:
            dx = samples[index + 1][0] - samples[index - 1][0]
            dz = samples[index + 1][1] - samples[index - 1][1]
        length = math.hypot(dx, dz) or 1.0
        normals.append((-dz / length, dx / length))
    return normals


def build_water(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """River surface ribbons riding just above the carved channel bed."""
    for river_id, samples in layout.rivers:
        normals = _polyline_normals(samples)
        half_width = 2.3
        for index in range(len(samples) - 1):
            quads_corners: list[Vector3] = []
            for sample_index in (index, index + 1):
                sx, sz = samples[sample_index]
                nx, nz = normals[sample_index]
                y = layout.base_height(sx, sz) - 1.55 + 0.85
                quads_corners.append((sx + nx * half_width, y, sz + nz * half_width))
                quads_corners.append((sx - nx * half_width, y, sz - nz * half_width))
            builder.add_quad(
                f"water_{river_id}_{index:03d}",
                [quads_corners[0], quads_corners[2], quads_corners[3], quads_corners[1]],
                RIVER_WATER, "water", MATERIAL_PATHS["water"],
            )


def build_roads(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Compacted dirt ribbons just above the terrain so the network reads."""
    for road_id, samples in layout.roads:
        normals = _polyline_normals(samples)
        half_width = 1.6
        for index in range(0, len(samples) - 1, 2):
            end = min(index + 2, len(samples) - 1)
            corners: list[Vector3] = []
            for sample_index in (index, end):
                sx, sz = samples[sample_index]
                nx, nz = normals[sample_index]
                y = layout.terrain_height(sx, sz) + 0.05
                corners.append((sx + nx * half_width, y, sz + nz * half_width))
                corners.append((sx - nx * half_width, y, sz - nz * half_width))
            builder.add_quad(
                f"road_{road_id}_{index:03d}",
                [corners[0], corners[2], corners[3], corners[1]],
                DIRT_ROAD, "road", MATERIAL_PATHS["terrain"],
            )


def build_terrace(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """The Soul Well emergence terrace — the zone anchor at world origin."""
    pad = 1.35  # terrain plateau height at the terrace

    # Stepped circular platform.
    builder.add_cylinder("terrace_lower_step", (0, pad + 0.15, 0), 10.5, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"])
    builder.add_cylinder("terrace_upper_step", (0, pad + 0.42, 0), 8.75, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"])
    top = pad + 0.57

    # The Soul Well aboveground: stone ring, dark shaft, soul-water, rim cap.
    builder.add_cylinder("well_outer_ring", (0, top + 0.55, 0), 2.60, 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"])
    builder.add_cylinder("well_shaft_dark", (0, top + 0.62, 0), 2.05, 1.20, 16, PORTAL_DARK, "well", MATERIAL_PATHS["portal"])
    builder.add_cylinder("well_soul_water", (0, top + 0.92, 0), 1.95, 0.08, 16, SOUL_WATER, "well", MATERIAL_PATHS["soulwater"])
    builder.add_ring("well_rim_cap", (0, 0, 0), 2.05, 2.60, top + 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"])

    # Suspended shard echo motif — three fragments adrift above the water.
    builder.add_octahedron("echo_shard_large", (0.15, top + 3.10, 0.10), 0.52, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_mid", (-0.55, top + 3.95, 0.35), 0.34, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_small", (0.60, top + 4.55, -0.30), 0.24, SHARD, "shard", MATERIAL_PATHS["shard"])

    # Breach exit: stone arch on the north rim, dark passage into the mound.
    arch_z = -8.2
    builder.add_box("breach_arch_jamb_west", (-1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_arch_jamb_east", (1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_arch_lintel", (0, top + 2.85, arch_z), (3.20, 0.70, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_passage_dark", (0, top + 1.20, arch_z - 0.75), (1.85, 2.40, 0.60), PORTAL_DARK, "portal", MATERIAL_PATHS["portal"])
    # Worn steps from the arch down to the terrace floor.
    for step_index in range(3):
        builder.add_box(
            f"breach_step_{step_index}",
            (0, top + 0.42 - step_index * 0.19, arch_z + 1.05 + step_index * 0.62),
            (2.1, 0.19, 0.66), TERRACE_STONE, "portal", MATERIAL_PATHS["terrace"],
        )

    # Awakening overlook: low parapet pair on the south rim facing the basin.
    builder.add_box("overlook_parapet_west", (-1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"])
    builder.add_box("overlook_parapet_east", (1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"])

    # Flagstone path from the arch to the well rim.
    for slab_index in range(4):
        builder.add_box(
            f"terrace_flagstone_{slab_index}",
            (0.10 * (slab_index % 2), top + 0.025, -6.1 + slab_index * 1.35),
            (1.30, 0.06, 1.05), TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"],
            yaw=0.05 * ((slab_index % 3) - 1),
        )

    # Weathered column stubs marking the old terrace edge.
    for column_index, angle in enumerate((0.6, 1.9, 3.4, 4.9)):
        radius = 9.4
        height = (0.9, 1.5, 0.7, 1.2)[column_index]
        builder.add_cylinder(
            f"terrace_column_stub_{column_index}",
            (math.cos(angle) * radius, pad + 0.30 + height / 2, math.sin(angle) * radius),
            0.38, height, 10, WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"],
        )


def build_erboug_ring(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Blockout of the standing-stone ring on its rise (full POI is a later phase)."""
    world = layout.anchors["erboug"]["world"]
    cx, cz = world["x"], world["z"]
    ground = layout.terrain_height(cx, cz)
    for stone_index in range(7):
        angle = stone_index / 7 * math.tau
        sx = cx + math.cos(angle) * 8.0
        sz = cz + math.sin(angle) * 8.0
        sy = layout.terrain_height(sx, sz)
        height = 2.2 + 0.5 * math.sin(stone_index * 2.3)
        builder.add_box(
            f"erboug_stone_{stone_index}",
            (sx, sy + height / 2 - 0.15, sz),
            (0.9, height, 0.55), MARKER, "marker", MATERIAL_PATHS["marker"],
            yaw=-angle,
        )
    builder.add_cylinder("erboug_center_slab", (cx, ground + 0.12, cz), 1.4, 0.24, 9, MARKER, "marker", MATERIAL_PATHS["marker"])


def build_anchor_markers(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Waymark stones at every anchor site so the world reads at atlas scale."""
    for anchor_id, anchor in layout.anchors.items():
        if anchor_id in ("soulwell", "erboug"):
            continue  # terrace and ring already mark these
        world = anchor["world"]
        gy = layout.terrain_height(world["x"], world["z"])
        builder.add_box(
            f"waymark_{safe_name(anchor_id)}",
            (world["x"], gy + 0.8, world["z"]),
            (0.7, 1.9, 0.5), MARKER, "marker", MATERIAL_PATHS["marker"],
            yaw=0.4,
        )


def scatter_dressing(builder: GeometryBuilder, layout: HeartvaleLayout, seed: int) -> dict[str, int]:
    """Seeded trees and rocks, densest inside the starting-area radius."""
    rng = random.Random(seed)
    counts = {"trees": 0, "rocks": 0}
    half_extent = layout.zone_grid * layout.tile_size / 2.0

    def excluded(x: float, z: float) -> bool:
        if math.hypot(x, z) < 13.0:  # terrace pad
            return True
        if layout.river_distance(x, z) < 5.5:
            return True
        if layout.road_distance(x, z) < 4.0:
            return True
        for anchor in layout.anchors.values():
            world = anchor["world"]
            if math.hypot(x - world["x"], z - world["z"]) < 8.0:
                return True
        return False

    def try_place(kind: str, attempts: int, quota: int) -> None:
        placed = 0
        for _ in range(attempts):
            if placed >= quota:
                break
            x = rng.uniform(-half_extent + 6, half_extent - 6)
            z = rng.uniform(-half_extent + 6, half_extent - 6)
            # Density falls off with distance from the Well: full inside the
            # starting area, sparse toward the basin rim.
            r = math.hypot(x, z)
            if r > 40.0 and rng.random() > 0.45:
                continue
            if excluded(x, z):
                continue
            gy = layout.terrain_height(x, z)
            if kind == "tree":
                trunk_h = rng.uniform(1.9, 3.3)
                trunk_r = rng.uniform(0.16, 0.30)
                canopy_r = rng.uniform(1.1, 2.1)
                leaf_color = LEAF if rng.random() > 0.3 else LEAF_WARM
                builder.add_cylinder(
                    f"tree_trunk_{counts['trees']:03d}",
                    (x, gy + trunk_h / 2, z), trunk_r, trunk_h, 7,
                    BARK, "tree", MATERIAL_PATHS["bark"],
                )
                builder.add_octahedron(
                    f"tree_canopy_{counts['trees']:03d}",
                    (x, gy + trunk_h + canopy_r * 0.55, z), canopy_r,
                    leaf_color, "tree", MATERIAL_PATHS["leaf"], squash=1.0,
                )
                builder.add_octahedron(
                    f"tree_canopy_top_{counts['trees']:03d}",
                    (x, gy + trunk_h + canopy_r * 1.15, z), canopy_r * 0.62,
                    leaf_color, "tree", MATERIAL_PATHS["leaf"], squash=1.0,
                )
                counts["trees"] += 1
            else:
                rock_r = rng.uniform(0.35, 1.1)
                builder.add_octahedron(
                    f"rock_{counts['rocks']:03d}",
                    (x, gy + rock_r * 0.28, z), rock_r,
                    ROCK, "rock", MATERIAL_PATHS["rock"], squash=rng.uniform(1.0, 1.5),
                )
                counts["rocks"] += 1
            placed += 1

    try_place("tree", attempts=900, quota=110)
    try_place("rock", attempts=500, quota=48)
    return counts


def create_lighting(obj: hou.Node) -> None:
    def distant(name: str, rotation: Vector3, color: Color, exposure: float) -> None:
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("distant")
        light.parmTuple("r").set(rotation)
        light.parmTuple("light_color").set(color)
        light.parm("light_exposure").set(exposure)
        light.parm("ogl_enablelight").set(1)

    def point(name: str, position: Vector3, color: Color, intensity: float) -> None:
        light = obj.createNode("hlight::2.0", name)
        light.parm("light_type").set("point")
        light.parmTuple("t").set(position)
        light.parmTuple("light_color").set(color)
        light.parm("light_intensity").set(intensity)
        light.parm("light_exposure").set(0.0)
        light.parm("ogl_enablelight").set(1)

    ambient = obj.createNode("ambient", "HEARTVALE_SKY_FILL")
    ambient.parmTuple("light_color").set((0.42, 0.52, 0.62))
    ambient.parm("light_intensity").set(0.55)
    ambient.parm("ogl_enablelight").set(1)

    # Late-afternoon sun from the west, cool sky fill, soul-glow at the Well.
    distant("HEARTVALE_SUN_KEY", (-38.0, -118.0, 12.0), (1.0, 0.88, 0.72), 0.6)
    distant("HEARTVALE_SKY_RIM", (-24.0, 64.0, -18.0), (0.55, 0.68, 0.82), -1.1)
    point("SOULWELL_GLOW", (0.0, 3.4, 0.0), SOUL_WATER, 1.1)
    point("BREACH_PORTAL_GLOW", (0.0, 2.6, -8.4), (0.30, 0.75, 0.70), 0.5)


def create_cameras(obj: hou.Node, layout: HeartvaleLayout) -> None:
    span = layout.zone_grid * layout.tile_size  # 280 m

    zone_target = obj.createNode("null", "ISO_ZONE_CAMERA_TARGET")
    zone_target.parmTuple("t").set((0.0, 0.0, 30.0))
    zone_camera = obj.createNode("cam", "ISO_ZONE_CAMERA")
    zone_camera.parmTuple("t").set((-span * 0.40, span * 0.55, 30.0 + span * 0.40))
    if zone_camera.parm("lookatpath"):
        zone_camera.parm("lookatpath").set(zone_target.path())
    if zone_camera.parm("projection"):
        zone_camera.parm("projection").set("ortho")
    if zone_camera.parm("orthowidth"):
        zone_camera.parm("orthowidth").set(span * 1.05)

    terrace_target = obj.createNode("null", "TERRACE_REVIEW_CAMERA_TARGET")
    terrace_target.parmTuple("t").set((0.0, 2.2, -0.5))
    terrace_camera = obj.createNode("cam", "TERRACE_REVIEW_CAMERA")
    terrace_camera.parmTuple("t").set((-14.5, 11.0, 15.5))
    terrace_camera.parm("lookatpath").set(terrace_target.path())
    terrace_camera.parm("projection").set("ortho")
    terrace_camera.parm("orthowidth").set(30.0)
    terrace_camera.setCurrent(True)


def create_review_renders(out: hou.Node) -> None:
    for name, camera in (
        ("TERRACE_REVIEW_RENDER", "/obj/TERRACE_REVIEW_CAMERA"),
        ("ZONE_REVIEW_RENDER", "/obj/ISO_ZONE_CAMERA"),
    ):
        render = out.createNode("opengl", name)
        render.parm("camera").set(camera)
        render.parm("picture").set("ip")
        render.parmTuple("res").set((1280, 720))
        render.parm("tres").set(1)
        render.parm("hqlighting").set(1)
        render.parm("lightsamples").set(16)
        render.parm("shadows").set(1)
        render.parm("shadowquality").set("areaaa")
        render.parm("shadowmap").set(4096)
        render.parm("ambocclusion").set(1)
        render.parm("uniformfog").set(1)
        render.parm("fogdensity").set(0.0009)
        render.parm("fogopacity").set(0.18)
        render.parmTuple("fogcolor").set((0.62, 0.70, 0.74))
        render.parmTuple("fogrange").set((0.0, 1200.0))
        render.parm("bloom").set(1)
        render.parm("bloomscale").set(6.0)
        render.parm("bloomintensity").set(0.06)
        render.parm("bloomthreshold").set(0.98)
    out.layoutChildren()


def main() -> None:
    args = parse_args()
    license_category = hou.licenseCategory().name()

    payload = json.loads(args.layout.read_text(encoding="utf-8"))
    layout = HeartvaleLayout(payload)
    args.hip.parent.mkdir(parents=True, exist_ok=True)
    args.obj.parent.mkdir(parents=True, exist_ok=True)

    hou.hipFile.clear(suppress_save_prompt=True)
    hou.setFps(30)
    create_materials()

    obj = hou.node("/obj")
    environment = obj.createNode("geo", "HEARTVALE_SOULWELL_STARTING_AREA")
    for child in environment.children():
        child.destroy()

    builder = GeometryBuilder()
    build_terrain(builder, layout)
    build_water(builder, layout)
    build_roads(builder, layout)
    build_terrace(builder, layout)
    build_erboug_ring(builder, layout)
    build_anchor_markers(builder, layout)
    dressing_counts = scatter_dressing(builder, layout, int(payload["seed"]))

    stash = environment.createNode("stash", "AUTHORED_ENVIRONMENT")
    stash.parm("stash").set(builder.geometry)
    bevel = environment.createNode("polybevel::3.0", "WEATHERED_EDGE_BEVEL")
    bevel.setInput(0, stash)
    bevel.parm("offset").set(0.02)
    bevel.parm("divisions").set(2)
    normal = environment.createNode("normal", "SURFACE_NORMALS")
    normal.setInput(0, bevel)
    normal.parm("cuspangle").set(60.0)
    normal.setDisplayFlag(True)
    normal.setRenderFlag(True)

    create_lighting(obj)
    create_cameras(obj, layout)
    create_review_renders(hou.node("/out"))

    metadata = obj.createNode("null", "HEARTVALE_BUILD_METADATA")
    metadata.setUserData("souldrifter_seed", str(payload["seed"]))
    metadata.setUserData("souldrifter_source", payload["source"])
    metadata.setUserData("souldrifter_canon_source", payload["canonSource"])
    metadata.setUserData("souldrifter_license", license_category)
    metadata.setUserData("souldrifter_scale", json.dumps(payload["scale"], separators=(",", ":")))
    metadata.setUserData("souldrifter_anchors", json.dumps(payload["anchors"], separators=(",", ":")))

    obj.layoutChildren()
    environment.layoutChildren()
    hou.hipFile.save(args.hip.resolve().as_posix())
    normal.geometry().saveToFile(args.obj.resolve().as_posix())
    if not args.obj.is_file() or args.obj.stat().st_size == 0:
        raise RuntimeError(f"Houdini did not create {args.obj}")

    print(json.dumps({
        "houdiniVersion": hou.applicationVersionString(),
        "license": license_category,
        "seed": payload["seed"],
        "environmentPoints": len(builder.geometry.points()),
        "environmentPrimitives": len(builder.geometry.prims()),
        "trees": dressing_counts["trees"],
        "rocks": dressing_counts["rocks"],
        "anchors": len(payload["anchors"]),
        "hip": args.hip.resolve().as_posix(),
        "hipBytes": args.hip.stat().st_size,
        "obj": args.obj.resolve().as_posix(),
        "objBytes": args.obj.stat().st_size,
        "materials": len(MATERIAL_PATHS),
    }))


if __name__ == "__main__":
    main()
