#!/usr/bin/env hython
"""Heartvale realistic world build — the engine-portable source of truth.

Upgrades the v1 blockout into a realistic, portable environment:
- fBm terrain with domain warp, river carve with banks, terrace plateau
- River water with wet-bank blend, reeds, richer trees, rocks
- Anwel settlement blockout (timber-framed houses, dock, well, fences)
- Portable exports: float32 heightmap + uint8 splat masks (raw + meta JSON),
  full-scene OBJ, and the .hipnc source — consumable by Three.js, Unreal,
  and Unity alike.

Preview-first workflow: renders OpenGL stills from Houdini itself so the
owner approves the look in Houdini before any Three.js porting work.

Usage (from SoulDrifterWeb):
  hython scripts/houdini/build-heartvale-realistic.py <layout.json> <hip> <outdir>
"""

from __future__ import annotations

import argparse
import json
import math
import random
import struct
import sys
from pathlib import Path
from typing import Sequence

import hou


Color = tuple[float, float, float]
Vector3 = tuple[float, float, float]

# --- Palette (naturalistic) ----------------------------------------------------
GRASS_LUSH: Color = (0.17, 0.33, 0.12)
GRASS_DRY: Color = (0.38, 0.42, 0.18)
MEADOW: Color = (0.26, 0.40, 0.16)
DIRT_ROAD: Color = (0.31, 0.245, 0.17)
RIVERBED: Color = (0.42, 0.36, 0.27)
WET_BANK: Color = (0.33, 0.29, 0.21)
TERRACE_STONE: Color = (0.52, 0.50, 0.45)
WELL_STONE: Color = (0.40, 0.39, 0.35)
RIVER_WATER: Color = (0.16, 0.37, 0.42)
SOUL_WATER: Color = (0.10, 0.50, 0.48)
SHARD: Color = (0.12, 0.62, 0.58)
PORTAL_DARK: Color = (0.05, 0.06, 0.07)
BARK: Color = (0.27, 0.19, 0.12)
LEAF_DEEP: Color = (0.19, 0.37, 0.13)
LEAF_LIGHT: Color = (0.34, 0.50, 0.18)
ROCK: Color = (0.42, 0.41, 0.37)
TIMBER: Color = (0.32, 0.22, 0.13)
PLASTER: Color = (0.72, 0.66, 0.55)
THATCH: Color = (0.52, 0.42, 0.24)
SLATE: Color = (0.30, 0.32, 0.34)
DOCK_WOOD: Color = (0.38, 0.29, 0.17)
REED: Color = (0.40, 0.46, 0.22)

MATERIAL_PATHS = {
    "terrain": "/mat/HVR_Terrain",
    "terrace": "/mat/HVR_Terrace_Stone",
    "wellstone": "/mat/HVR_Well_Stone",
    "water": "/mat/HVR_River_Water",
    "soulwater": "/mat/HVR_Soul_Water",
    "shard": "/mat/HVR_Echo_Shard",
    "portal": "/mat/HVR_Portal_Dark",
    "bark": "/mat/HVR_Bark",
    "leaf": "/mat/HVR_Leaf",
    "rock": "/mat/HVR_Rock",
    "timber": "/mat/HVR_Timber",
    "plaster": "/mat/HVR_Plaster",
    "thatch": "/mat/HVR_Thatch",
    "slate": "/mat/HVR_Slate",
    "dock": "/mat/HVR_Dock_Wood",
    "reed": "/mat/HVR_Reed",
}

TERRAIN_SAMPLES = 200  # quads per side over the 280 m zone (1.4 m resolution)
HEIGHT_EXPORT_SAMPLES = 200


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("layout", type=Path)
    parser.add_argument("hip", type=Path)
    parser.add_argument("outdir", type=Path)
    return parser.parse_args()


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix3(a: Color, b: Color, t: float) -> Color:
    return (mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t))


# --- Value noise / fBm ----------------------------------------------------------

def _hash2(ix: int, iz: int, seed: int) -> float:
    value = (ix * 0x1F123BB5) ^ (iz * 0x5F356495) ^ seed
    value = ((value ^ (value >> 16)) * 0x45D9F3B) & 0xFFFFFFFF
    value ^= value >> 16
    return (value & 0xFFFFFF) / float(0x1000000)


def value_noise(x: float, z: float, seed: int) -> float:
    ix, iz = math.floor(x), math.floor(z)
    fx, fz = x - ix, z - iz
    sx = fx * fx * (3 - 2 * fx)
    sz = fz * fz * (3 - 2 * fz)
    a = _hash2(ix, iz, seed)
    b = _hash2(ix + 1, iz, seed)
    c = _hash2(ix, iz + 1, seed)
    d = _hash2(ix + 1, iz + 1, seed)
    return mix(mix(a, b, sx), mix(c, d, sx), sz) * 2.0 - 1.0


def fbm(x: float, z: float, seed: int, octaves: int = 4, lacunarity: float = 2.0, gain: float = 0.5) -> float:
    total = 0.0
    amplitude = 1.0
    frequency = 1.0
    norm = 0.0
    for octave in range(octaves):
        total += amplitude * value_noise(x * frequency, z * frequency, seed + octave * 131)
        norm += amplitude
        amplitude *= gain
        frequency *= lacunarity
    return total / norm


def create_materials() -> None:
    material_network = hou.node("/mat")
    if material_network is None:
        material_network = hou.node("/").createNode("matnet", "mat")

    def shader(name: str, color: Color, roughness: float, metallic: float = 0.0) -> hou.Node:
        # Geometry carries its true color as point Cd; keep the shader base white
        # so the OpenGL review renders don't multiply basecolor x point color.
        _ = color
        existing = material_network.node(name)
        if existing:
            existing.destroy()
        node = material_network.createNode("principledshader::2.0", name)
        node.parmTuple("basecolor").set((1.0, 1.0, 1.0))
        node.parm("basecolor_usePointColor").set(1)
        node.parm("rough").set(roughness)
        node.parm("metallic").set(metallic)
        return node

    shader("HVR_Terrain", (1.0, 1.0, 1.0), 0.96)
    shader("HVR_Terrace_Stone", TERRACE_STONE, 0.90)
    shader("HVR_Well_Stone", WELL_STONE, 0.86)
    water = shader("HVR_River_Water", RIVER_WATER, 0.12)
    if water.parm("alpha"):
        water.parm("alpha").set(0.88)
    soulwater = shader("HVR_Soul_Water", SOUL_WATER, 0.10)
    soulwater.parmTuple("emitcolor").set(SOUL_WATER)
    soulwater.parm("emitint").set(0.05)
    shard = shader("HVR_Echo_Shard", SHARD, 0.14, 0.10)
    shard.parm("emitcolor_usePointColor").set(1)
    shard.parmTuple("emitcolor").set(SHARD)
    shard.parm("emitint").set(0.06)
    shader("HVR_Portal_Dark", PORTAL_DARK, 1.0)
    shader("HVR_Bark", BARK, 0.94)
    shader("HVR_Leaf", LEAF_DEEP, 0.82)
    shader("HVR_Rock", ROCK, 0.97)
    shader("HVR_Timber", TIMBER, 0.88)
    shader("HVR_Plaster", PLASTER, 0.96)
    shader("HVR_Thatch", THATCH, 0.98)
    shader("HVR_Slate", SLATE, 0.72)
    shader("HVR_Dock_Wood", DOCK_WOOD, 0.90)
    shader("HVR_Reed", REED, 0.92)
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

    def _polygon(self, points: Sequence[hou.Point], name: str, kind: str, color: Color, material: str) -> None:
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
        for vertex, (u, v) in zip(vertices, projected, strict=True):
            vertex.setAttribValue("uv", (u * 0.3, v * 0.3, 0.0))
        polygon.setAttribValue("name", name)
        polygon.setAttribValue("path", f"/HeartvaleReal/{kind}/{name}")
        polygon.setAttribValue("souldrifter_kind", kind)
        polygon.setAttribValue("shop_materialpath", material)

    def add_quad(self, name: str, corners: Sequence[Vector3], color: Color, kind: str, material: str) -> None:
        self._polygon([self._point(p, color) for p in corners], name, kind, color, material)

    def add_box(self, name: str, center: Vector3, size: Vector3, color: Color, kind: str, material: str, yaw: float = 0.0) -> None:
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        corners: list[Vector3] = []
        for ly in (-hy, hy):
            for lz in (-hz, hz):
                for lx in (-hx, hx):
                    x = lx * math.cos(yaw) - lz * math.sin(yaw)
                    z = lx * math.sin(yaw) + lz * math.cos(yaw)
                    corners.append((center[0] + x, center[1] + ly, center[2] + z))
        points = [self._point(p, color) for p in corners]
        for face in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            self._polygon([points[i] for i in face], name, kind, color, material)

    def add_cylinder(self, name: str, center: Vector3, radius: float, height: float, sides: int, color: Color, kind: str, material: str, cap_top: bool = True, cap_bottom: bool = True) -> None:
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
            nxt = (index + 1) % sides
            self._polygon([bottom[index], bottom[nxt], top[nxt], top[index]], name, kind, color, material)

    def add_ring(self, name: str, center: Vector3, inner: float, outer: float, y: float, sides: int, color: Color, kind: str, material: str) -> None:
        for index in range(sides):
            a0 = index / sides * math.tau
            a1 = (index + 1) / sides * math.tau
            self.add_quad(name, [
                (center[0] + math.cos(a0) * inner, y, center[2] + math.sin(a0) * inner),
                (center[0] + math.cos(a1) * inner, y, center[2] + math.sin(a1) * inner),
                (center[0] + math.cos(a1) * outer, y, center[2] + math.sin(a1) * outer),
                (center[0] + math.cos(a0) * outer, y, center[2] + math.sin(a0) * outer),
            ], color, kind, material)

    def add_octahedron(self, name: str, center: Vector3, radius: float, color: Color, kind: str, material: str, squash: float = 1.0, stretch_y: float = 1.0) -> None:
        positions = (
            (center[0], center[1] + radius * stretch_y, center[2]),
            (center[0], center[1] - radius * stretch_y, center[2]),
            (center[0] + radius * squash, center[1], center[2]),
            (center[0] - radius * squash, center[1], center[2]),
            (center[0], center[1], center[2] + radius * squash),
            (center[0], center[1], center[2] - radius * squash),
        )
        points = [self._point(p, color) for p in positions]
        for face in ((0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)):
            self._polygon([points[i] for i in face], name, kind, color, material)

    def add_prism_roof(self, name: str, center: Vector3, width: float, depth: float, height: float, color: Color, kind: str, material: str, yaw: float = 0.0) -> None:
        """Gabled roof: ridge along local X."""
        hw, hd = width / 2, depth / 2
        base = [
            (-hw, 0, -hd), (hw, 0, -hd), (hw, 0, hd), (-hw, 0, hd),
            (-hw, height, 0), (hw, height, 0),
        ]
        pts: list[hou.Point] = []
        for lx, ly, lz in base:
            x = lx * math.cos(yaw) - lz * math.sin(yaw)
            z = lx * math.sin(yaw) + lz * math.cos(yaw)
            pts.append(self._point((center[0] + x, center[1] + ly, center[2] + z), color))
        for face in ((0, 4, 5, 1), (3, 2, 5, 4), (0, 1, 2, 3), (0, 3, 4), (1, 5, 2)):
            self._polygon([pts[i] for i in face], name, kind, color, material)


class HeartvaleLayout:
    """Layout + terrain model. Heights and masks come from ONE function set so
    the mesh, the exported heightmap, and the splat masks always agree."""

    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.tile_size = float(payload["scale"]["tileSize"])
        self.zone_grid = int(payload["scale"]["zoneGrid"])
        soulwell = next(a for a in payload["anchors"] if a["id"] == "soulwell")
        self.origin_grid = (soulwell["grid"]["x"], soulwell["grid"]["y"])
        to_world = lambda samples: [self.grid_to_world(gx, gy) for gx, gy in samples]
        self.rivers = [(r["id"], to_world(r["samples"])) for r in payload["rivers"]]
        self.roads = [(r["id"], to_world(r["samples"])) for r in payload["roads"]]
        self.river_samples = [s for _, samples in self.rivers for s in samples]
        self.road_samples = [s for _, samples in self.roads for s in samples]
        self.anchors = {a["id"]: a for a in payload["anchors"]}
        self.seed = int(payload["seed"])

    def grid_to_world(self, gx: float, gy: float) -> tuple[float, float]:
        return ((gx - self.origin_grid[0]) * self.tile_size, (gy - self.origin_grid[1]) * self.tile_size)

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
        # Domain-warped fBm: rolling vale with believable ridge/valley structure.
        wx = x + 14.0 * fbm(x * 0.012 + 40.0, z * 0.012 - 17.0, self.seed ^ 0xA53A, 3)
        wz = z + 14.0 * fbm(x * 0.012 - 23.0, z * 0.012 + 51.0, self.seed ^ 0x9E37, 3)
        h = 2.1 * fbm(wx * 0.020, wz * 0.020, self.seed, 5)
        h += 0.35 * fbm(x * 0.11, z * 0.11, self.seed ^ 0x51ED, 3)
        h += 2.2 * math.exp(-((x - 0.0) ** 2 + (z + 14.0) ** 2) / (2 * 10.0**2))  # terrace mound
        erboug = self.anchors["erboug"]["world"]
        h += 3.0 * math.exp(-((x - erboug["x"]) ** 2 + (z - erboug["z"]) ** 2) / (2 * 18.0**2))
        h -= 1.2 * smoothstep(80.0, 200.0, z)
        return h

    def terrain_height(self, x: float, z: float) -> float:
        h = self.base_height(x, z)
        r = math.hypot(x, z)
        h = mix(h, 1.35, smoothstep(16.0, 10.5, r))
        d_river = self.river_distance(x, z)
        carve = 1.65 * (1.0 - smoothstep(2.4, 5.4, d_river))
        carve += 0.35 * (1.0 - smoothstep(4.0, 7.5, d_river))  # soft banks
        h -= carve
        d_road = self.road_distance(x, z)
        h = mix(h, round(h / 0.30) * 0.30, 0.5 * (1.0 - smoothstep(1.8, 4.2, d_road)))
        return h

    def splat(self, x: float, z: float) -> tuple[Color, int]:
        """Vertex color + dominant splat index (0 grass 1 dry 2 road 3 riverbed 4 wet 5 stone)."""
        r = math.hypot(x, z)
        if r < 12.0:
            return TERRACE_STONE, 5
        d_river = self.river_distance(x, z)
        d_road = self.road_distance(x, z)
        if d_river < 2.6:
            return RIVERBED, 3
        if d_river < 4.6:
            return mix3(WET_BANK, MEADOW, 0.25), 4
        if d_road < 2.2:
            jitter = 0.5 + 0.5 * value_noise(x * 0.5, z * 0.5, self.seed ^ 0x77)
            return mix3(DIRT_ROAD, RIVERBED, 0.12 * jitter), 2
        patch = fbm(x * 0.05, z * 0.05, self.seed ^ 0xBEEF, 3)
        moisture = fbm(x * 0.021 + 9.0, z * 0.021 - 4.0, self.seed ^ 0xF00D, 3)
        lush = smoothstep(-0.35, 0.25, moisture)
        color = mix3(GRASS_DRY, GRASS_LUSH, lush)
        color = mix3(color, MEADOW, 0.4 * smoothstep(0.1, 0.5, patch))
        splat_index = 1 if lush < 0.35 else 0
        return color, splat_index


def build_terrain(builder: GeometryBuilder, layout: HeartvaleLayout) -> tuple[list[float], list[int], float, int]:
    """Returns (heights, splats, step, count) for the portable heightmap export."""
    half_extent = layout.zone_grid * layout.tile_size / 2.0
    step = half_extent * 2.0 / TERRAIN_SAMPLES
    origin = -half_extent

    heights: list[float] = []
    splats: list[int] = []
    point_grid: list[list[hou.Point]] = []
    for iz in range(TERRAIN_SAMPLES + 1):
        row: list[hou.Point] = []
        for ix in range(TERRAIN_SAMPLES + 1):
            x = origin + ix * step
            z = origin + iz * step
            h = layout.terrain_height(x, z)
            color, splat_index = layout.splat(x, z)
            heights.append(h)
            splats.append(splat_index)
            row.append(builder._point((x, h, z), color))
        point_grid.append(row)

    for iz in range(TERRAIN_SAMPLES):
        for ix in range(TERRAIN_SAMPLES):
            corners = [point_grid[iz][ix], point_grid[iz + 1][ix], point_grid[iz + 1][ix + 1], point_grid[iz][ix + 1]]
            colors = [p.attribValue("Cd") for p in corners]
            color = tuple(sum(c[i] for c in colors) / 4.0 for i in range(3))
            builder._polygon(corners, f"terrain_{ix:03d}_{iz:03d}", "terrain", color, MATERIAL_PATHS["terrain"])

    return heights, splats, step, TERRAIN_SAMPLES + 1


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
    for river_id, samples in layout.rivers:
        normals = _polyline_normals(samples)
        half_width = 2.1
        for index in range(len(samples) - 1):
            corners: list[Vector3] = []
            for si in (index, index + 1):
                sx, sz = samples[si]
                nx, nz = normals[si]
                y = layout.base_height(sx, sz) - 1.65 + 0.95
                corners.append((sx + nx * half_width, y, sz + nz * half_width))
                corners.append((sx - nx * half_width, y, sz - nz * half_width))
            builder.add_quad(
                f"water_{river_id}_{index:03d}",
                [corners[0], corners[2], corners[3], corners[1]],
                RIVER_WATER, "water", MATERIAL_PATHS["water"],
            )


def build_terrace(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    pad = 1.35
    builder.add_cylinder("terrace_lower_step", (0, pad + 0.15, 0), 10.5, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"])
    builder.add_cylinder("terrace_upper_step", (0, pad + 0.42, 0), 8.75, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"])
    top = pad + 0.57
    builder.add_cylinder("well_outer_ring", (0, top + 0.55, 0), 2.60, 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"], cap_top=False)
    builder.add_cylinder("well_shaft_dark", (0, top + 0.45, 0), 2.05, 0.90, 16, PORTAL_DARK, "well", MATERIAL_PATHS["portal"])
    builder.add_cylinder("well_soul_water", (0, top + 0.95, 0), 1.95, 0.08, 16, SOUL_WATER, "well", MATERIAL_PATHS["soulwater"])
    builder.add_ring("well_rim_cap", (0, 0, 0), 2.05, 2.60, top + 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"])
    builder.add_octahedron("echo_shard_large", (0.15, top + 3.10, 0.10), 0.52, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_mid", (-0.55, top + 3.95, 0.35), 0.34, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_small", (0.60, top + 4.55, -0.30), 0.24, SHARD, "shard", MATERIAL_PATHS["shard"])
    arch_z = -8.2
    builder.add_box("breach_arch_jamb_west", (-1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_arch_jamb_east", (1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_arch_lintel", (0, top + 2.85, arch_z), (3.20, 0.70, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"])
    builder.add_box("breach_passage_dark", (0, top + 1.20, arch_z - 0.75), (1.85, 2.40, 0.60), PORTAL_DARK, "portal", MATERIAL_PATHS["portal"])
    for step_index in range(3):
        builder.add_box(f"breach_step_{step_index}", (0, top + 0.42 - step_index * 0.19, arch_z + 1.05 + step_index * 0.62), (2.1, 0.19, 0.66), TERRACE_STONE, "portal", MATERIAL_PATHS["terrace"])
    builder.add_box("overlook_parapet_west", (-1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"])
    builder.add_box("overlook_parapet_east", (1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"])
    for slab_index in range(4):
        builder.add_box(f"terrace_flagstone_{slab_index}", (0.10 * (slab_index % 2), top + 0.025, -6.1 + slab_index * 1.35), (1.30, 0.06, 1.05), TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"], yaw=0.05 * ((slab_index % 3) - 1))
    for column_index, angle in enumerate((0.6, 1.9, 3.4, 4.9)):
        radius = 9.4
        height = (0.9, 1.5, 0.7, 1.2)[column_index]
        builder.add_cylinder(f"terrace_column_stub_{column_index}", (math.cos(angle) * radius, pad + 0.30 + height / 2, math.sin(angle) * radius), 0.38, height, 10, WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"])


def build_anwel(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Anwel river-town blockout: timber-framed houses, dock, well, fences."""
    anchor = layout.anchors["anwel"]["world"]
    ax, az = anchor["x"], anchor["z"]

    def gy(x: float, z: float) -> float:
        return layout.terrain_height(x, z)

    def house(name: str, lx: float, lz: float, w: float, d: float, h: float, yaw: float, roof: str = "thatch") -> None:
        x, z = ax + lx, az + lz
        base = gy(x, z) - 0.1
        # stone footing
        builder.add_box(f"{name}_footing", (x, base + 0.15, z), (w + 0.3, 0.3, d + 0.3), WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"], yaw=yaw)
        # plaster walls + timber frame corners
        builder.add_box(f"{name}_walls", (x, base + 0.3 + h / 2, z), (w, h, d), PLASTER, "anwel", MATERIAL_PATHS["plaster"], yaw=yaw)
        for cx in (-1, 1):
            for cz in (-1, 1):
                ox = cx * (w / 2 - 0.09) * math.cos(yaw) - cz * (d / 2 - 0.09) * math.sin(yaw)
                oz = cx * (w / 2 - 0.09) * math.sin(yaw) + cz * (d / 2 - 0.09) * math.cos(yaw)
                builder.add_box(f"{name}_post_{cx}_{cz}", (x + ox, base + 0.3 + h / 2, z + oz), (0.18, h, 0.18), TIMBER, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)
        builder.add_prism_roof(f"{name}_roof", (x, base + 0.3 + h, z), w + 0.7, d + 0.7, h * 0.55, THATCH if roof == "thatch" else SLATE, "anwel", MATERIAL_PATHS[roof], yaw=yaw)
        # door
        dx = (w / 2 + 0.02) * math.cos(yaw)
        dz = (w / 2 + 0.02) * math.sin(yaw)
        builder.add_box(f"{name}_door", (x + dx, base + 1.05, z + dz), (0.06, 1.5, 0.8), TIMBER, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)

    house("anwel_reeve_hall", 2.2, 3.0, 5.2, 4.0, 2.6, 0.15, "slate")
    house("anwel_cottage_north", -3.2, -2.4, 3.6, 3.0, 2.2, -0.2)
    house("anwel_cottage_east", 4.0, -1.2, 3.2, 2.8, 2.1, 0.35)
    house("anwel_fisher_hut", -4.4, 1.6, 2.8, 2.4, 1.9, 0.5)
    house("anwel_store_barn", 1.0, -4.6, 4.2, 3.2, 2.4, -0.1)

    # Village well
    wx, wz = ax + 0.4, az + 0.2
    wy = gy(wx, wz)
    builder.add_cylinder("anwel_well_ring", (wx, wy + 0.4, wz), 0.9, 0.8, 12, WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"])
    builder.add_cylinder("anwel_well_water", (wx, wy + 0.62, wz), 0.65, 0.06, 12, RIVER_WATER, "anwel", MATERIAL_PATHS["water"])
    builder.add_prism_roof("anwel_well_roof", (wx, wy + 1.7, wz), 1.6, 1.2, 0.5, THATCH, "anwel", MATERIAL_PATHS["thatch"])
    for px in (-0.7, 0.7):
        builder.add_box(f"anwel_well_post_{px}", (wx + px, wy + 1.25, wz), (0.12, 1.3, 0.12), TIMBER, "anwel", MATERIAL_PATHS["timber"])

    # Dock into the river (river runs ~x = ax - 3.5 at Anwel)
    dock_x = ax - 3.4
    for plank in range(6):
        pz = az - 2.6 + plank * 0.75
        py = gy(dock_x + 1.2, pz)
        builder.add_box(f"dock_plank_{plank}", (dock_x, py + 0.32, pz), (2.6, 0.08, 0.6), DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"])
    for post in range(3):
        pz = az - 2.4 + post * 1.6
        py = gy(dock_x + 1.2, pz)
        builder.add_cylinder(f"dock_post_{post}", (dock_x - 1.1, py + 0.3, pz), 0.09, 1.1, 7, DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"])

    # Fences along the road in
    for fence in range(5):
        fx = ax + 2.6 + fence * 0.02
        fz = az + 5.0 + fence * 1.5
        fy = gy(fx, fz)
        builder.add_box(f"anwel_fence_post_{fence}", (fx, fy + 0.5, fz), (0.12, 1.0, 0.12), TIMBER, "anwel", MATERIAL_PATHS["timber"])
        if fence < 4:
            builder.add_box(f"anwel_fence_rail_{fence}", (fx, fy + 0.75, fz + 0.75), (0.07, 0.07, 1.5), TIMBER, "anwel", MATERIAL_PATHS["timber"])


def scatter_vegetation(builder: GeometryBuilder, layout: HeartvaleLayout) -> dict[str, int]:
    rng = random.Random(layout.seed ^ 0xC0FFEE)
    counts = {"trees": 0, "rocks": 0, "reeds": 0, "grassTufts": 0}
    half_extent = layout.zone_grid * layout.tile_size / 2.0
    anwel = layout.anchors["anwel"]["world"]

    def excluded(x: float, z: float, margin: float = 0.0) -> bool:
        if math.hypot(x, z) < 13.0 + margin:
            return True
        if math.hypot(x - anwel["x"], z - anwel["z"]) < 9.0:
            return True
        if layout.river_distance(x, z) < 3.4:
            return True
        if layout.road_distance(x, z) < 2.8:
            return True
        for anchor in layout.anchors.values():
            w = anchor["world"]
            if math.hypot(x - w["x"], z - w["z"]) < 7.0:
                return True
        return False

    # Trees — clustered by noise so they read as groves, denser near treeline NE.
    for _ in range(1600):
        if counts["trees"] >= 150:
            break
        x = rng.uniform(-half_extent + 6, half_extent - 6)
        z = rng.uniform(-half_extent + 6, half_extent - 6)
        grove = fbm(x * 0.03 + 7.0, z * 0.03 - 3.0, layout.seed + 77, 3)
        bias = 0.25 if (x > 10 and z < -30) else 0.0  # Lockroot treeline NE
        if grove < 0.08 - bias and rng.random() > 0.18:
            continue
        if math.hypot(x, z) > 40.0 and rng.random() > 0.5:
            continue
        if excluded(x, z):
            continue
        gy = layout.terrain_height(x, z)
        trunk_h = rng.uniform(2.2, 4.0)
        trunk_r = rng.uniform(0.16, 0.32)
        canopy = rng.uniform(1.3, 2.3)
        leaf = mix3(LEAF_DEEP, LEAF_LIGHT, rng.random())
        builder.add_cylinder(f"tree_trunk_{counts['trees']:03d}", (x, gy + trunk_h / 2, z), trunk_r, trunk_h, 7, BARK, "tree", MATERIAL_PATHS["bark"])
        builder.add_octahedron(f"tree_canopy_{counts['trees']:03d}", (x, gy + trunk_h + canopy * 0.5, z), canopy, leaf, "tree", MATERIAL_PATHS["leaf"], stretch_y=0.85)
        builder.add_octahedron(f"tree_canopy_b_{counts['trees']:03d}", (x + canopy * 0.35, gy + trunk_h + canopy * 0.95, z + canopy * 0.2), canopy * 0.6, leaf, "tree", MATERIAL_PATHS["leaf"], stretch_y=0.8)
        counts["trees"] += 1

    # Rocks
    for _ in range(400):
        if counts["rocks"] >= 50:
            break
        x = rng.uniform(-half_extent + 6, half_extent - 6)
        z = rng.uniform(-half_extent + 6, half_extent - 6)
        if excluded(x, z, margin=-2.0):
            continue
        gy = layout.terrain_height(x, z)
        rock_r = rng.uniform(0.3, 1.2)
        builder.add_octahedron(f"rock_{counts['rocks']:03d}", (x, gy + rock_r * 0.25, z), rock_r, mix3(ROCK, RIVERBED, rng.random() * 0.4), "rock", MATERIAL_PATHS["rock"], squash=rng.uniform(1.0, 1.6), stretch_y=0.7)
        counts["rocks"] += 1

    # Sedge clumps along riverbanks
    for _ in range(1200):
        if counts["reeds"] >= 70:
            break
        x = rng.uniform(-half_extent + 6, half_extent - 6)
        z = rng.uniform(-half_extent + 6, half_extent - 6)
        d = layout.river_distance(x, z)
        if d < 2.2 or d > 5.2:
            continue
        if layout.road_distance(x, z) < 2.0:
            continue
        gy = layout.terrain_height(x, z)
        builder.add_octahedron(f"sedge_{counts['reeds']:03d}", (x, gy + 0.22, z), rng.uniform(0.30, 0.5), mix3(REED, GRASS_LUSH, rng.random() * 0.5), "reed", MATERIAL_PATHS["reed"], squash=1.2, stretch_y=0.65)
        counts["reeds"] += 1

    # Grass tufts near the terrace/start area (the lifelike first impression)
    for _ in range(500):
        if counts["grassTufts"] >= 90:
            break
        angle = rng.uniform(0, math.tau)
        r = rng.uniform(12.5, 42.0)
        x, z = math.cos(angle) * r, math.sin(angle) * r
        if excluded(x, z, margin=-1.5):
            continue
        gy = layout.terrain_height(x, z)
        color = mix3(GRASS_LUSH, LEAF_LIGHT, 0.3 + rng.random() * 0.5)
        builder.add_octahedron(f"tuft_{counts['grassTufts']:03d}", (x, gy + 0.14, z), rng.uniform(0.15, 0.24), color, "grass", MATERIAL_PATHS["reed"], squash=1.6, stretch_y=0.8)
        counts["grassTufts"] += 1

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
    ambient.parmTuple("light_color").set((0.45, 0.55, 0.65))
    ambient.parm("light_intensity").set(0.32)
    ambient.parm("ogl_enablelight").set(1)
    distant("HEARTVALE_SUN_KEY", (-35.0, -125.0, 10.0), (1.0, 0.9, 0.75), 0.15)
    distant("HEARTVALE_SKY_RIM", (-20.0, 60.0, -15.0), (0.5, 0.65, 0.85), -1.6)
    point("SOULWELL_GLOW", (0.0, 3.4, 0.0), SOUL_WATER, 1.1)


def _ortho_camera(obj: hou.Node, name: str, position: Vector3, target: Vector3, width: float) -> hou.Node:
    target_node = obj.createNode("null", f"{name}_TARGET")
    target_node.parmTuple("t").set(target)
    camera = obj.createNode("cam", name)
    camera.parmTuple("t").set(position)
    if camera.parm("lookatpath"):
        camera.parm("lookatpath").set(target_node.path())
    if camera.parm("projection"):
        camera.parm("projection").set("ortho")
    if camera.parm("orthowidth"):
        camera.parm("orthowidth").set(width)
    return camera


def create_cameras(obj: hou.Node, layout: HeartvaleLayout) -> None:
    span = layout.zone_grid * layout.tile_size
    _ortho_camera(obj, "ISO_ZONE_CAMERA", (-span * 0.40, span * 0.55, 30.0 + span * 0.40), (0.0, 0.0, 30.0), span * 1.16)
    terrace = _ortho_camera(obj, "TERRACE_REVIEW_CAMERA", (-13.0, 9.5, 14.0), (0.0, 2.2, -0.5), 26.0)
    anwel = layout.anchors["anwel"]["world"]
    _ortho_camera(obj, "ANWEL_REVIEW_CAMERA", (anwel["x"] - 12.0, 9.0, anwel["z"] + 13.0), (anwel["x"], 1.8, anwel["z"]), 24.0)
    _ortho_camera(obj, "RIVER_REVIEW_CAMERA", (-24.0, 10.0, 34.0), (-6.0, 0.5, 18.0), 34.0)
    terrace.setCurrent(True)


def create_review_renders(out: hou.Node, outdir: Path) -> list[dict]:
    results: list[dict] = []
    for name, camera in (
        ("TERRACE_REVIEW_RENDER", "/obj/TERRACE_REVIEW_CAMERA"),
        ("ANWEL_REVIEW_RENDER", "/obj/ANWEL_REVIEW_CAMERA"),
        ("RIVER_REVIEW_RENDER", "/obj/RIVER_REVIEW_CAMERA"),
        ("ZONE_REVIEW_RENDER", "/obj/ISO_ZONE_CAMERA"),
    ):
        render = out.createNode("opengl", name)
        render.parm("camera").set(camera)
        picture = outdir / f"{name.lower()}.png"
        render.parm("picture").set(picture.as_posix())
        render.parmTuple("res").set((1280, 720))
        render.parm("tres").set(1)
        render.parm("hqlighting").set(1)
        render.parm("lightsamples").set(16)
        render.parm("shadows").set(1)
        render.parm("shadowquality").set("areaaa")
        render.parm("shadowmap").set(4096)
        render.parm("ambocclusion").set(1)
        render.parm("uniformfog").set(1)
        render.parm("fogdensity").set(0.0008)
        render.parm("fogopacity").set(0.16)
        render.parmTuple("fogcolor").set((0.66, 0.72, 0.76))
        render.parmTuple("fogrange").set((0.0, 1200.0))
        render.parm("bloom").set(1)
        render.parm("bloomscale").set(6.0)
        render.parm("bloomintensity").set(0.05)
        render.parm("bloomthreshold").set(0.98)
        results.append({"node": name, "picture": picture.as_posix()})
    out.layoutChildren()
    return results


def execute_renders(out: hou.Node, renders: list[dict]) -> list[dict]:
    """Best-effort headless OpenGL stills; failures are reported, not fatal —
    the same nodes render interactively from the Houdini GUI."""
    executed: list[dict] = []
    for entry in renders:
        node = out.node(entry["node"])
        status = "skipped"
        if node is not None:
            try:
                node.render()
                status = "rendered" if Path(entry["picture"]).is_file() else "no-output"
            except Exception as error:  # noqa: BLE001 — report, never kill the build
                status = f"failed: {error}"
        executed.append({**entry, "status": status})
    return executed


def export_portable(outdir: Path, heights: list[float], splats: list[int], step: float, count: int, layout: HeartvaleLayout) -> dict:
    """Engine-agnostic exports: raw float32 heightmap, uint8 splat map, meta."""
    outdir.mkdir(parents=True, exist_ok=True)
    height_path = outdir / "heartvale-heightmap-f32.raw"
    splat_path = outdir / "heartvale-splat-u8.raw"
    height_path.write_bytes(struct.pack(f"<{len(heights)}f", *heights))
    splat_path.write_bytes(bytes(splats))
    meta = {
        "format": "row-major, origin = world (-140, -140), +X east, +Z south",
        "samplesPerSide": count,
        "metersPerSample": step,
        "extentMeters": layout.zone_grid * layout.tile_size,
        "worldOrigin": "soulwell-terrace",
        "heightmap": {"file": height_path.name, "dtype": "float32-le", "units": "meters"},
        "splat": {
            "file": splat_path.name,
            "dtype": "uint8",
            "legend": {"0": "grass", "1": "dry-grass", "2": "dirt-road", "3": "riverbed", "4": "wet-bank", "5": "terrace-stone"},
        },
        "engines": {
            "threejs": "PlaneGeometry 200x200 segments; displace vertices with heightmap; vertex-color or splat-blend materials.",
            "unreal": "Landscape import: convert heightmap to 16-bit PNG (scale/offset in meta), splat -> Landscape Layer weights.",
            "unity": "TerrainData.SetHeights from resampled float grid; splat -> TerrainLayer alphamaps.",
        },
    }
    meta_path = outdir / "heartvale-terrain-export.json"
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", "utf8")
    return {"heightmap": height_path.as_posix(), "splat": splat_path.as_posix(), "meta": meta_path.as_posix()}


def main() -> None:
    args = parse_args()
    license_category = hou.licenseCategory().name()
    payload = json.loads(args.layout.read_text(encoding="utf-8"))
    layout = HeartvaleLayout(payload)
    args.hip.parent.mkdir(parents=True, exist_ok=True)
    args.outdir.mkdir(parents=True, exist_ok=True)

    hou.hipFile.clear(suppress_save_prompt=True)
    hou.setFps(30)
    create_materials()

    obj = hou.node("/obj")
    environment = obj.createNode("geo", "HEARTVALE_REALISTIC_WORLD")
    for child in environment.children():
        child.destroy()

    builder = GeometryBuilder()
    heights, splats, step, sample_count = build_terrain(builder, layout)
    build_water(builder, layout)
    build_terrace(builder, layout)
    build_anwel(builder, layout)
    counts = scatter_vegetation(builder, layout)

    stash = environment.createNode("stash", "AUTHORED_ENVIRONMENT")
    stash.parm("stash").set(builder.geometry)
    normal = environment.createNode("normal", "SURFACE_NORMALS")
    normal.setInput(0, stash)
    normal.parm("cuspangle").set(55.0)
    normal.setDisplayFlag(True)
    normal.setRenderFlag(True)

    create_lighting(obj)
    create_cameras(obj, layout)
    renders = create_review_renders(hou.node("/out"), args.outdir)

    metadata = obj.createNode("null", "HEARTVALE_REALISTIC_METADATA")
    metadata.setUserData("souldrifter_seed", str(payload["seed"]))
    metadata.setUserData("souldrifter_source", payload["source"])
    metadata.setUserData("souldrifter_license", license_category)
    metadata.setUserData("souldrifter_scale", json.dumps(payload["scale"], separators=(",", ":")))
    metadata.setUserData("souldrifter_portability", "heightmap+splat+obj; see heartvale-terrain-export.json")

    obj.layoutChildren()
    environment.layoutChildren()
    hou.hipFile.save(args.hip.resolve().as_posix())

    obj_path = args.outdir / "heartvale-realistic-environment.obj"
    normal.geometry().saveToFile(obj_path.as_posix())
    portable = export_portable(args.outdir, heights, splats, step, sample_count, layout)
    # Headless OpenGL can segfault mid-batch (Vulkan driver); stills are rendered
    # one process per camera via scripts/houdini/render-heartvale-still.py.
    render_results = [{**entry, "status": "pending: render via render-heartvale-still.py"} for entry in renders]

    print(json.dumps({
        "houdiniVersion": hou.applicationVersionString(),
        "license": license_category,
        "seed": payload["seed"],
        "environmentPoints": len(builder.geometry.points()),
        "environmentPrimitives": len(builder.geometry.prims()),
        **counts,
        "hip": args.hip.resolve().as_posix(),
        "hipBytes": args.hip.stat().st_size,
        "obj": obj_path.as_posix(),
        "objBytes": obj_path.stat().st_size if obj_path.is_file() else 0,
        "portable": portable,
        "renders": render_results,
    }))


if __name__ == "__main__":
    main()
