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
import re
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
GRASS_ROOT: Color = (0.075, 0.17, 0.05)
GRASS_TIP: Color = (0.36, 0.50, 0.16)
DRY_ROOT: Color = (0.28, 0.26, 0.10)
DRY_TIP: Color = (0.55, 0.50, 0.22)
BIRCH_BARK: Color = (0.62, 0.60, 0.55)
LEAF_BIRCH: Color = (0.38, 0.52, 0.16)
LEAF_WILLOW: Color = (0.30, 0.46, 0.14)

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
    "grass": "/mat/HVR_Grass",
    "sky": "/mat/HVR_Sky",
    "npc": "/mat/HVR_NPC",
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

    tex_root = "$HIP/../textures/heartvale"

    def shader(name: str, color: Color, roughness: float, metallic: float = 0.0, texture: str | None = None, tint: bool = True) -> hou.Node:
        # Geometry carries its color as point Cd; keep the shader base white so the
        # OpenGL review renders don't multiply basecolor x point color. Textured
        # materials can opt out of the tint (the texture carries the hue) or keep
        # it (bark: grayscale texture x point-color tint = oak dark / birch pale).
        _ = color
        existing = material_network.node(name)
        if existing:
            existing.destroy()
        node = material_network.createNode("principledshader::2.0", name)
        node.parmTuple("basecolor").set((1.0, 1.0, 1.0))
        node.parm("basecolor_usePointColor").set(1)
        node.parm("rough").set(roughness)
        node.parm("metallic").set(metallic)
        if texture is not None:
            node.parm("basecolor_useTexture").set(1)
            node.parm("basecolor_texture").set(f"{tex_root}/{texture}.png")
            if not tint:
                node.parm("basecolor_usePointColor").set(0)
        return node

    shader("HVR_Terrain", (1.0, 1.0, 1.0), 0.96)
    shader("HVR_Terrace_Stone", TERRACE_STONE, 0.90, texture="terrace-flagstone", tint=False)
    shader("HVR_Well_Stone", WELL_STONE, 0.86, texture="wellstone", tint=False)
    water = shader("HVR_River_Water", RIVER_WATER, 0.12)
    if water.parm("alpha"):
        water.parm("alpha").set(1.0)
    soulwater = shader("HVR_Soul_Water", SOUL_WATER, 0.10)
    soulwater.parmTuple("emitcolor").set(SOUL_WATER)
    soulwater.parm("emitint").set(0.05)
    shard = shader("HVR_Echo_Shard", SHARD, 0.14, 0.10)
    shard.parm("emitcolor_usePointColor").set(1)
    shard.parmTuple("emitcolor").set(SHARD)
    shard.parm("emitint").set(0.06)
    shader("HVR_Portal_Dark", PORTAL_DARK, 1.0)
    shader("HVR_Bark", BARK, 0.94, texture="bark")  # grayscale texture x tint: oak dark, birch pale
    leaf = shader("HVR_Leaf", LEAF_DEEP, 0.82)
    leaf.parm("emitcolor_usePointColor").set(1)
    leaf.parmTuple("emitcolor").set((1.0, 1.0, 1.0))
    leaf.parm("emitint").set(0.22)
    shader("HVR_Rock", ROCK, 0.97)
    shader("HVR_Timber", TIMBER, 0.88, texture="timber", tint=False)
    shader("HVR_Plaster", PLASTER, 0.96, texture="plaster", tint=False)
    shader("HVR_Thatch", THATCH, 0.98, texture="thatch", tint=False)
    shader("HVR_Slate", SLATE, 0.72, texture="slate", tint=False)
    shader("HVR_Dock_Wood", DOCK_WOOD, 0.90, texture="dockwood", tint=False)
    shader("HVR_Reed", REED, 0.92)
    grass = shader("HVR_Grass", (1.0, 1.0, 1.0), 0.88)
    grass.parm("emitcolor_usePointColor").set(1)
    grass.parmTuple("emitcolor").set((1.0, 1.0, 1.0))
    grass.parm("emitint").set(0.22)
    sky = shader("HVR_Sky", (0.0, 0.0, 0.0), 1.0)
    sky.parm("emitcolor_usePointColor").set(1)
    sky.parmTuple("emitcolor").set((1.0, 1.0, 1.0))
    sky.parm("emitint").set(0.55)
    shader("HVR_NPC", (1.0, 1.0, 1.0), 0.88)  # tunics/skin ride on point Cd
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

    def add_tapered_tube(self, name: str, p0: Vector3, p1: Vector3, r0: float, r1: float, sides: int, color: Color, kind: str, material: str) -> None:
        """Uncapped tapered segment between two points — trunks, branches, stems."""
        dx, dy, dz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
        length = math.sqrt(dx * dx + dy * dy + dz * dz) or 1e-6
        dx, dy, dz = dx / length, dy / length, dz / length
        ax, ay, az = (1.0, 0.0, 0.0) if abs(dy) > 0.93 else (0.0, 1.0, 0.0)
        ux, uy, uz = dy * az - dz * ay, dz * ax - dx * az, dx * ay - dy * ax
        ul = math.sqrt(ux * ux + uy * uy + uz * uz) or 1e-6
        ux, uy, uz = ux / ul, uy / ul, uz / ul
        vx, vy, vz = dy * uz - dz * uy, dz * ux - dx * uz, dx * uy - dy * ux
        ring0: list[hou.Point] = []
        ring1: list[hou.Point] = []
        for i in range(sides):
            a = i / sides * math.tau
            ca, sa = math.cos(a), math.sin(a)
            ox, oy, oz = ux * ca + vx * sa, uy * ca + vy * sa, uz * ca + vz * sa
            ring0.append(self._point((p0[0] + ox * r0, p0[1] + oy * r0, p0[2] + oz * r0), color))
            ring1.append(self._point((p1[0] + ox * r1, p1[1] + oy * r1, p1[2] + oz * r1), color))
        for i in range(sides):
            nxt = (i + 1) % sides
            self._polygon([ring0[i], ring0[nxt], ring1[nxt], ring1[i]], name, kind, color, material)

    def add_leaf_card(self, name: str, center: Vector3, width: float, height: float, yaw: float, pitch: float, roll: float, color: Color, kind: str, material: str) -> None:
        """Single quad foliage card with free orientation."""
        hw, hh = width / 2.0, height / 2.0
        cr, sr = math.cos(roll), math.sin(roll)
        cp, sp = math.cos(pitch), math.sin(pitch)
        cy, sy = math.cos(yaw), math.sin(yaw)
        pts: list[hou.Point] = []
        for lx, ly in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)):
            x0, y0 = lx * cr - ly * sr, lx * sr + ly * cr
            y1, z1 = y0 * cp, y0 * sp
            x2 = x0 * cy - z1 * sy
            z2 = x0 * sy + z1 * cy
            pts.append(self._point((center[0] + x2, center[1] + y1, center[2] + z2), color))
        self._polygon(pts, name, kind, color, material)
        self._polygon(list(reversed(pts)), name, kind, color, material)  # double-sided


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
            return mix3(WET_BANK, MEADOW, 0.4), 4
        if d_road < 2.2:
            jitter = 0.5 + 0.5 * value_noise(x * 0.5, z * 0.5, self.seed ^ 0x77)
            return mix3(DIRT_ROAD, RIVERBED, 0.12 * jitter), 2
        patch = fbm(x * 0.05, z * 0.05, self.seed ^ 0xBEEF, 3)
        moisture = fbm(x * 0.021 + 9.0, z * 0.021 - 4.0, self.seed ^ 0xF00D, 3)
        lush = smoothstep(-0.35, 0.25, moisture)
        color = mix3(GRASS_DRY, GRASS_LUSH, lush)
        color = mix3(color, MEADOW, 0.4 * smoothstep(0.1, 0.5, patch))
        # high-frequency hue jitter so the ground never reads as flat fill
        jitter = value_noise(x * 0.9, z * 0.9, self.seed ^ 0x51CE) * 0.05
        color = (clamp(color[0] + jitter * 0.6, 0.0, 1.0), clamp(color[1] + jitter, 0.0, 1.0), clamp(color[2] + jitter * 0.4, 0.0, 1.0))
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


def build_sky(builder: GeometryBuilder) -> None:
    """Inward-facing gradient sky wall — horizon haze to zenith blue."""
    bands = (
        (-600.0, 6.0, (0.82, 0.86, 0.89)),
        (6.0, 24.0, (0.72, 0.80, 0.88)),
        (24.0, 48.0, (0.62, 0.73, 0.86)),
        (48.0, 78.0, (0.52, 0.66, 0.83)),
        (78.0, 120.0, (0.42, 0.58, 0.80)),
        (120.0, 420.0, (0.32, 0.50, 0.76)),
    )
    radius, sides = 700.0, 48
    # distant ground plane so downward rays beyond the zone hit hazy meadow, not void
    builder.add_cylinder("sky_ground_plane", (0.0, -4.65, 0.0), radius, 0.1, 48, (0.42, 0.48, 0.26), "sky", MATERIAL_PATHS["sky"], cap_bottom=False)
    for y0, y1, color in bands:
        ring0: list[hou.Point] = []
        ring1: list[hou.Point] = []
        for i in range(sides):
            a = i / sides * math.tau
            ring0.append(builder._point((math.cos(a) * radius, y0, math.sin(a) * radius), color))
            ring1.append(builder._point((math.cos(a) * radius, y1, math.sin(a) * radius), color))
        for i in range(sides):
            nxt = (i + 1) % sides
            # reversed winding so the wall faces inward
            builder._polygon([ring0[i], ring1[i], ring1[nxt], ring0[nxt]], f"sky_{int(y0)}_{i:02d}", "sky", color, MATERIAL_PATHS["sky"])


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
    """Anwel river-town: timber-framed, enterable houses around an east-bank plaza.

    The canon river course AND the north-south road both run through the atlas
    anchor point, so the village sits ~7 m east — beside the road, off the wet
    bank. Houses are hollow shells with 2.2 m door openings (character ~1.8 m)
    and a window, so they are enterable in-game and in later engine ports."""
    anchor = layout.anchors["anwel"]["world"]
    ax, az = anchor["x"], anchor["z"]
    plaza = (ax + 7.0, az - 0.5)

    def gy(x: float, z: float) -> float:
        return layout.terrain_height(x, z)

    def house(name: str, lx: float, lz: float, w: float, d: float, h: float, roof: str = "thatch") -> None:
        x, z = ax + lx, az + lz
        yaw = math.atan2(plaza[1] - z, plaza[0] - x)  # door wall (+local X) faces the plaza
        cy_, sy_ = math.cos(yaw), math.sin(yaw)

        def spot(ox: float, oz: float) -> tuple[float, float]:
            return (x + ox * cy_ - oz * sy_, z + ox * sy_ + oz * cy_)

        base = gy(x, z) - 0.12
        t = 0.14  # wall thickness
        wall0 = base + 0.42  # top of footing/floor
        door_w, door_h = 1.15, 2.2
        win_w, win_sill, win_top = 0.95, 1.25, 2.15

        # footing + floor
        builder.add_box(f"{name}_footing", (x, base + 0.15, z), (w + 0.3, 0.3, d + 0.3), WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"], yaw=yaw)
        builder.add_box(f"{name}_floor", (x, base + 0.36, z), (w, 0.12, d), DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"], yaw=yaw)

        def panel(tag: str, ox: float, oz: float, y0: float, y1: float, sx: float, sz: float) -> None:
            cx, cz = spot(ox, oz)
            builder.add_box(f"{name}_{tag}", (cx, wall0 + (y0 + y1) / 2, cz), (sx, y1 - y0, sz), PLASTER, "anwel", MATERIAL_PATHS["plaster"], yaw=yaw)

        # door wall (+X local): two side panels + lintel over the open doorway
        side = (d - door_w) / 2
        panel("wall_door_left", w / 2 - t / 2, -(door_w + side) / 2, 0.0, h, t, side)
        panel("wall_door_right", w / 2 - t / 2, (door_w + side) / 2, 0.0, h, t, side)
        panel("wall_door_lintel", w / 2 - t / 2, 0.0, door_h, h, t, door_w)
        # window wall (-X local): sill, header, two side panels
        panel("wall_win_sill", -w / 2 + t / 2, 0.0, 0.0, win_sill, t, d)
        panel("wall_win_header", -w / 2 + t / 2, 0.0, win_top, h, t, d)
        wside = (d - win_w) / 2
        panel("wall_win_left", -w / 2 + t / 2, -(win_w + wside) / 2, win_sill, win_top, t, wside)
        panel("wall_win_right", -w / 2 + t / 2, (win_w + wside) / 2, win_sill, win_top, t, wside)
        # side walls (±Z local): full panels
        panel("wall_side_a", 0.0, -d / 2 + t / 2, 0.0, h, w - 2 * t, t)
        panel("wall_side_b", 0.0, d / 2 - t / 2, 0.0, h, w - 2 * t, t)

        # timber frame: corner posts + door surround
        for cx in (-1, 1):
            for cz in (-1, 1):
                px, pz = spot(cx * (w / 2 - 0.09), cz * (d / 2 - 0.09))
                builder.add_box(f"{name}_post_{cx}_{cz}", (px, wall0 + h / 2, pz), (0.18, h, 0.18), TIMBER, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)
        for dz in (-door_w / 2, door_w / 2):
            px, pz = spot(w / 2 + 0.03, dz)
            builder.add_box(f"{name}_doorframe_{dz:+.2f}", (px, wall0 + door_h / 2, pz), (0.10, door_h, 0.10), TIMBER, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)
        builder.add_prism_roof(f"{name}_roof", (x, wall0 + h, z), w + 0.7, d + 0.7, h * 0.55, THATCH if roof == "thatch" else SLATE, "anwel", MATERIAL_PATHS[roof], yaw=yaw)

    house("anwel_reeve_hall", 10.4, 2.6, 5.4, 4.2, 3.0, "slate")
    house("anwel_cottage_north", 5.6, -3.8, 3.6, 3.0, 2.6)
    house("anwel_cottage_east", 12.4, -1.8, 3.2, 2.8, 2.5)
    house("anwel_fisher_hut", 4.9, 2.6, 2.8, 2.4, 2.3)
    house("anwel_store_barn", 8.8, -6.2, 4.4, 3.2, 2.8)

    # Village well on the plaza
    wx, wz = plaza
    wy = gy(wx, wz)
    builder.add_cylinder("anwel_well_ring", (wx, wy + 0.4, wz), 0.9, 0.8, 12, WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"])
    builder.add_cylinder("anwel_well_water", (wx, wy + 0.62, wz), 0.65, 0.06, 12, RIVER_WATER, "anwel", MATERIAL_PATHS["water"])
    builder.add_prism_roof("anwel_well_roof", (wx, wy + 1.7, wz), 1.6, 1.2, 0.5, THATCH, "anwel", MATERIAL_PATHS["thatch"])
    for px in (-0.7, 0.7):
        builder.add_box(f"anwel_well_post_{px}", (wx + px, wy + 1.25, wz), (0.12, 1.3, 0.12), TIMBER, "anwel", MATERIAL_PATHS["timber"])

    # Dock into the river (west bank, river centre ~x = ax at Anwel)
    dock_x = ax - 2.9
    for plank in range(6):
        pz = az - 2.6 + plank * 0.75
        py = gy(dock_x + 1.2, pz)
        builder.add_box(f"dock_plank_{plank}", (dock_x, py + 0.32, pz), (2.6, 0.08, 0.6), DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"])
    for post in range(3):
        pz = az - 2.4 + post * 1.6
        py = gy(dock_x + 1.2, pz)
        builder.add_cylinder(f"dock_post_{post}", (dock_x - 1.1, py + 0.3, pz), 0.09, 1.1, 7, DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"])

    # Fences along the east side of the road in
    for fence in range(5):
        fx = ax + 3.4 + fence * 0.04
        fz = az + 4.5 + fence * 1.5
        fy = gy(fx, fz)
        builder.add_box(f"anwel_fence_post_{fence}", (fx, fy + 0.5, fz), (0.12, 1.0, 0.12), TIMBER, "anwel", MATERIAL_PATHS["timber"])
        if fence < 4:
            builder.add_box(f"anwel_fence_rail_{fence}", (fx, fy + 0.75, fz + 0.75), (0.07, 0.07, 1.5), TIMBER, "anwel", MATERIAL_PATHS["timber"])


TREE_SPECIES = {
    "oak": {"height": (4.5, 7.0), "trunk": (0.22, 0.38), "branches": (5, 7), "cards": 340, "leaf_a": LEAF_DEEP, "leaf_b": LEAF_LIGHT, "spread": 1.0, "droop": 0.0},
    "birch": {"height": (5.0, 7.5), "trunk": (0.10, 0.18), "branches": (6, 9), "cards": 260, "leaf_a": LEAF_BIRCH, "leaf_b": LEAF_LIGHT, "spread": 0.7, "droop": 0.0},
    "willow": {"height": (4.0, 6.0), "trunk": (0.20, 0.30), "branches": (7, 10), "cards": 380, "leaf_a": LEAF_WILLOW, "leaf_b": LEAF_LIGHT, "spread": 1.15, "droop": 0.85},
}


def build_tree(builder: GeometryBuilder, index: int, x: float, gy: float, z: float, rng: random.Random, species: str) -> None:
    """Branching tree: meandering tapered trunk, primary branches + twig forks,
    and hundreds of oriented leaf cards clustered around branch tips."""
    spec = TREE_SPECIES[species]
    name = f"tree_{index:03d}"
    height = rng.uniform(*spec["height"])
    trunk_r = rng.uniform(*spec["trunk"])
    bark = BIRCH_BARK if species == "birch" else BARK
    joints: list[Vector3] = [(x, gy - 0.15, z)]
    px, pz = x, z
    for s in range(4):
        px += rng.uniform(-0.012, 0.012) * height
        pz += rng.uniform(-0.012, 0.012) * height
        joints.append((px, gy + height * (s + 1) / 4.0, pz))
    for s in range(4):
        builder.add_tapered_tube(f"{name}_trunk_{s}", joints[s], joints[s + 1], trunk_r * (1.0 - 0.15 * s), trunk_r * (1.0 - 0.15 * (s + 1)), 6, bark, "tree", MATERIAL_PATHS["bark"])
    top = joints[-1]
    tips: list[Vector3] = [top]
    for b in range(rng.randint(*spec["branches"])):
        frac = rng.uniform(0.55, 1.0)
        base = (x + (joints[3][0] - x) * frac, gy + height * frac, z + (joints[3][2] - z) * frac)
        yaw = rng.uniform(0.0, math.tau)
        blen = rng.uniform(1.1, 2.1) * spec["spread"]
        rise = rng.uniform(0.5, 1.1) - spec["droop"] * 0.9
        mid = (base[0] + math.cos(yaw) * blen * 0.55, base[1] + rise * blen * 0.5, base[2] + math.sin(yaw) * blen * 0.55)
        end = (base[0] + math.cos(yaw) * blen, base[1] + rise * blen - spec["droop"] * blen * 0.55, base[2] + math.sin(yaw) * blen)
        builder.add_tapered_tube(f"{name}_br_{b}_a", base, mid, trunk_r * 0.42, trunk_r * 0.22, 5, bark, "tree", MATERIAL_PATHS["bark"])
        builder.add_tapered_tube(f"{name}_br_{b}_b", mid, end, trunk_r * 0.22, trunk_r * 0.08, 5, bark, "tree", MATERIAL_PATHS["bark"])
        tips.append(end)
        if rng.random() < 0.7:
            tyaw = yaw + rng.uniform(-0.9, 0.9)
            tlen = blen * rng.uniform(0.3, 0.5)
            tend = (end[0] + math.cos(tyaw) * tlen, end[1] + (rng.uniform(-0.2, 0.5) - spec["droop"] * 0.3) * tlen, end[2] + math.sin(tyaw) * tlen)
            builder.add_tapered_tube(f"{name}_tw_{b}", end, tend, trunk_r * 0.08, trunk_r * 0.03, 4, bark, "tree", MATERIAL_PATHS["bark"])
            tips.append(tend)
    per_shell = max(8, spec["cards"] // len(tips))
    card = 0
    for shell in tips:
        ex, ey = 0.95 * spec["spread"], 0.6
        for _ in range(per_shell):
            oy = rng.uniform(-ey, ey)
            center = (shell[0] + rng.uniform(-ex, ex), shell[1] + oy, shell[2] + rng.uniform(-ex, ex))
            shade = clamp(0.55 + 0.45 * (oy / ey), 0.0, 1.0) * rng.uniform(0.7, 1.3)
            color = mix3(spec["leaf_a"], spec["leaf_b"], clamp(shade, 0.0, 1.0))
            builder.add_leaf_card(f"{name}_leaf_{card:03d}", center, rng.uniform(0.24, 0.40), rng.uniform(0.18, 0.30), rng.uniform(0.0, math.tau), rng.uniform(-1.2, 1.2), rng.uniform(0.0, math.tau), color, "tree", MATERIAL_PATHS["leaf"])
            card += 1


def build_shrub(builder: GeometryBuilder, index: int, x: float, gy: float, z: float, rng: random.Random) -> None:
    """Twiggy bush: a fan of thin stems with small leaf cards in a loose shell."""
    name = f"shrub_{index:03d}"
    tips: list[Vector3] = []
    for s in range(rng.randint(4, 7)):
        yaw = rng.uniform(0.0, math.tau)
        reach = rng.uniform(0.25, 0.60)
        end = (x + math.cos(yaw) * reach, gy + rng.uniform(0.5, 1.0), z + math.sin(yaw) * reach)
        builder.add_tapered_tube(f"{name}_stem_{s}", (x, gy + 0.02, z), end, 0.035, 0.012, 4, BARK, "shrub", MATERIAL_PATHS["bark"])
        tips.append(end)
    card = 0
    for tip in tips:
        for _ in range(rng.randint(14, 22)):
            center = (tip[0] + rng.uniform(-0.45, 0.45), tip[1] + rng.uniform(-0.30, 0.30), tip[2] + rng.uniform(-0.45, 0.45))
            color = mix3(LEAF_DEEP, LEAF_LIGHT, rng.random())
            builder.add_leaf_card(f"{name}_leaf_{card:03d}", center, rng.uniform(0.12, 0.20), rng.uniform(0.09, 0.15), rng.uniform(0.0, math.tau), rng.uniform(-1.2, 1.2), rng.uniform(0.0, math.tau), color, "shrub", MATERIAL_PATHS["leaf"])
            card += 1


def scatter_vegetation(builder: GeometryBuilder, layout: HeartvaleLayout) -> dict[str, int]:
    rng = random.Random(layout.seed ^ 0xC0FFEE)
    counts = {"trees": 0, "shrubs": 0, "rocks": 0, "reeds": 0}
    half_extent = layout.zone_grid * layout.tile_size / 2.0
    anwel = layout.anchors["anwel"]["world"]

    def excluded(x: float, z: float, margin: float = 0.0) -> bool:
        if math.hypot(x, z) < 13.0 + margin:
            return True
        if math.hypot(x - (anwel["x"] + 7.0), z - (anwel["z"] - 0.5)) < 11.0:  # village plaza, east bank
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

    placed_trees: list[tuple[float, float, float]] = []

    # Trees — clustered by noise so they read as groves, denser near treeline NE.
    for _ in range(1600):
        if counts["trees"] >= 110:
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
        if layout.river_distance(x, z) < 9.0:
            species = "willow"
        elif x > 10 and z < -30 and rng.random() < 0.5:
            species = "birch"
        else:
            species = "oak"
        build_tree(builder, counts["trees"], x, gy, z, rng, species)
        placed_trees.append((x, gy, z))
        counts["trees"] += 1

    # Shrubs — under trees, along roadsides and river edges.
    for _ in range(1200):
        if counts["shrubs"] >= 90:
            break
        if placed_trees and rng.random() < 0.6:
            tx, _, tz = placed_trees[rng.randrange(len(placed_trees))]
            angle = rng.uniform(0.0, math.tau)
            dist = rng.uniform(2.5, 7.0)
            x, z = tx + math.cos(angle) * dist, tz + math.sin(angle) * dist
        else:
            x = rng.uniform(-half_extent + 6, half_extent - 6)
            z = rng.uniform(-half_extent + 6, half_extent - 6)
        if abs(x) > half_extent - 4 or abs(z) > half_extent - 4:
            continue
        if excluded(x, z, margin=-1.0):
            continue
        gy = layout.terrain_height(x, z)
        build_shrub(builder, counts["shrubs"], x, gy, z, rng)
        counts["shrubs"] += 1

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

    return counts


def _quat_mul(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def _blade_prototype(root: Color, tip: Color) -> hou.Geometry:
    """One curved tapered grass blade, local +Y up, bending toward +X."""
    geometry = hou.Geometry()
    geometry.addAttrib(hou.attribType.Point, "Cd", (1.0, 1.0, 1.0))
    geometry.addAttrib(hou.attribType.Prim, "shop_materialpath", "")
    segments, height, width0, bend = 4, 0.52, 0.038, 0.17
    prev: tuple[hou.Point, hou.Point] | None = None
    for i in range(segments + 1):
        t = i / segments
        cx, cy = bend * t * t, height * t
        half = width0 * (1.0 - 0.8 * t) / 2.0
        color = mix3(root, tip, t)
        left = geometry.createPoint()
        left.setPosition((cx - half, cy, 0.0))
        left.setAttribValue("Cd", color)
        right = geometry.createPoint()
        right.setPosition((cx + half, cy, 0.0))
        right.setAttribValue("Cd", color)
        if prev is not None:
            polygon = geometry.createPolygon()
            for point in (prev[0], prev[1], right, left):
                polygon.addVertex(point)
            polygon.setAttribValue("shop_materialpath", MATERIAL_PATHS["grass"])
            back = geometry.createPolygon()
            for point in (prev[1], prev[0], left, right):
                back.addVertex(point)
            back.setAttribValue("shop_materialpath", MATERIAL_PATHS["grass"])
        prev = (left, right)
    return geometry


def _grass_points(layout: HeartvaleLayout, rng: random.Random, want_lush: bool) -> tuple[hou.Geometry, int]:
    geometry = hou.Geometry()
    geometry.addAttrib(hou.attribType.Point, "Cd", (1.0, 1.0, 1.0))
    geometry.addAttrib(hou.attribType.Point, "orient", (0.0, 0.0, 0.0, 1.0))
    geometry.addAttrib(hou.attribType.Point, "pscale", 1.0)
    anwel = layout.anchors["anwel"]["world"]

    def blocked(x: float, z: float) -> bool:
        if math.hypot(x, z) < 11.6:
            return True
        if math.hypot(x - (anwel["x"] + 7.0), z - (anwel["z"] - 0.5)) < 9.5:  # trampled village plaza
            return True
        if layout.river_distance(x, z) < 2.8:
            return True
        return layout.road_distance(x, z) < 2.1

    placed = 0
    bands = ((0.0, 38.0, 0.38), (38.0, 80.0, 0.90), (80.0, 136.0, 2.2))
    for inner, outer, spacing in bands:
        gx = -outer
        while gx < outer:
            gz = -outer
            while gz < outer:
                gz += spacing
                x = gx + rng.uniform(-0.4, 0.4) * spacing
                z = gz + rng.uniform(-0.4, 0.4) * spacing
                r = math.hypot(x, z)
                if r < inner or r >= outer or blocked(x, z):
                    continue
                moisture = fbm(x * 0.021 + 9.0, z * 0.021 - 4.0, layout.seed ^ 0xF00D, 3)
                moisture += 0.35 * (1.0 - smoothstep(3.0, 14.0, layout.river_distance(x, z)))  # riparian green-up
                if (moisture > -0.05) != want_lush:
                    continue
                gy = layout.terrain_height(x, z)
                point = geometry.createPoint()
                point.setPosition((x, gy + 0.005, z))
                yaw = rng.uniform(0.0, math.tau)
                tilt = rng.uniform(0.0, 0.35)
                q_yaw = (0.0, math.sin(yaw / 2.0), 0.0, math.cos(yaw / 2.0))
                q_tilt = (math.sin(tilt / 2.0), 0.0, 0.0, math.cos(tilt / 2.0))
                point.setAttribValue("orient", _quat_mul(q_yaw, q_tilt))
                point.setAttribValue("pscale", rng.uniform(0.55, 1.45))
                placed += 1
            gx += spacing
    return geometry, placed


def build_grass_field(grass_node: hou.Node, layout: HeartvaleLayout) -> int:
    """Instanced blade grass: two prototypes (lush/dry), scatter points, copy-to-points.
    Kept in its own geo node so the OBJ export and the committed .hipnc stay lean."""
    rng = random.Random(layout.seed ^ 0x6A455)
    copies: list[hou.Node] = []
    total = 0
    for want_lush, label, root, tip in (
        (True, "LUSH", GRASS_ROOT, GRASS_TIP),
        (False, "DRY", DRY_ROOT, DRY_TIP),
    ):
        proto_stash = grass_node.createNode("stash", f"BLADE_PROTO_{label}")
        proto_stash.parm("stash").set(_blade_prototype(root, tip))
        points_stash = grass_node.createNode("stash", f"BLADE_POINTS_{label}")
        points_geo, placed = _grass_points(layout, rng, want_lush)
        points_stash.parm("stash").set(points_geo)
        copy = grass_node.createNode("copytopoints", f"COPY_BLADES_{label}")
        copy.setInput(0, proto_stash)
        copy.setInput(1, points_stash)
        copies.append(copy)
        total += placed
    merge = grass_node.createNode("merge", "GRASS_MERGE")
    for index, copy in enumerate(copies):
        merge.setInput(index, copy)
    out = grass_node.createNode("null", "OUT_GRASS")
    out.setInput(0, merge)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    grass_node.layoutChildren()
    return total


# --- Poly Haven dressing (CC0 assets, source-assets/polyhaven/) -----------------
POLYHAVEN_DIR = "$HIP/../polyhaven"


def _ph_material_map(ph_root: Path, aid: str) -> dict[str, str]:
    """glTF material name -> base-color texture uri, parsed from the asset itself."""
    data = json.loads((ph_root / aid / f"{aid}.gltf").read_text(encoding="utf-8"))
    images = data.get("images", [])
    textures = data.get("textures", [])
    mapping: dict[str, str] = {}
    for mat in data.get("materials", []):
        tex = mat.get("pbrMetallicRoughness", {}).get("baseColorTexture", {})
        index = tex.get("index")
        if index is None or index >= len(textures):
            continue
        source = textures[index].get("source")
        if source is None or source >= len(images):
            continue
        uri = images[source].get("uri", "")
        if uri:
            mapping[mat.get("name", aid)] = uri
    return mapping


def _ph_shader(matnet: hou.Node, aid: str, mat_name: str, uri: str) -> str:
    node_name = "PH_" + re.sub(r"[^A-Za-z0-9]+", "_", f"{aid}_{mat_name}").upper()
    existing = matnet.node(node_name)
    if existing is not None:
        return existing.path()
    node = matnet.createNode("principledshader::2.0", node_name)
    node.parmTuple("basecolor").set((1.0, 1.0, 1.0))
    node.parm("basecolor_usePointColor").set(0)
    node.parm("basecolor_useTexture").set(1)
    node.parm("basecolor_texture").set(f"{POLYHAVEN_DIR}/{aid}/{uri}")
    node.parm("rough").set(0.85)
    return node.path()


def _ph_load(ph_node: hou.Node, aid: str, label: str) -> hou.Node:
    file_node = ph_node.createNode("file", f"PHFILE_{label}")
    file_node.parm("file").set(f"{POLYHAVEN_DIR}/{aid}/{aid}.gltf")
    unpack = ph_node.createNode("unpack", f"PHUNPACK_{label}")
    unpack.setInput(0, file_node)
    return unpack


def _ph_assign(ph_node: hou.Node, source: hou.Node, matnet: hou.Node, ph_root: Path, aid: str, label: str) -> hou.Node:
    node = source
    for index, (mat_name, uri) in enumerate(sorted(_ph_material_map(ph_root, aid).items())):
        assign = ph_node.createNode("material", f"PHMAT_{label}_{index}")
        assign.setInput(0, node)
        assign.parm("group1").set(f"@gltf_material_name={mat_name}")
        assign.parm("shop_materialpath1").set(_ph_shader(matnet, aid, mat_name, uri))
        node = assign
    return node


def _ph_place(ph_node: hou.Node, matnet: hou.Node, ph_root: Path, aid: str, label: str,
              x: float, z: float, ground: float, target_height: float,
              yaw: float = 0.0, hook: bool = False) -> hou.Node:
    """Load, height-normalize, and place one asset. hook=True hangs the asset's
    top at `ground` (used for door lanterns); otherwise its base sits on ground."""
    unpack = _ph_load(ph_node, aid, label)
    bb = unpack.geometry().boundingBox()
    size = bb.sizevec()
    scale = target_height / size.y() if size.y() > 1e-6 else 1.0
    xf = ph_node.createNode("xform", f"PHXFORM_{label}")
    xf.setInput(0, unpack)
    xf.parm("scale").set(scale)
    xf.parmTuple("r").set((0.0, yaw, 0.0))
    ty = ground - (bb.maxvec().y() if hook else bb.minvec().y()) * scale
    xf.parmTuple("t").set((x, ty, z))
    return _ph_assign(ph_node, xf, matnet, ph_root, aid, label)


def _ph_scatter(ph_node: hou.Node, matnet: hou.Node, ph_root: Path, layout: HeartvaleLayout,
                aid: str, label: str, spots: list[tuple[float, float, float]], target_height: float) -> hou.Node:
    """Copy a height-normalized asset onto Python-scattered points (pscale per point)."""
    unpack = _ph_load(ph_node, aid, label)
    bb = unpack.geometry().boundingBox()
    size = bb.sizevec()
    scale = target_height / size.y() if size.y() > 1e-6 else 1.0
    xf = ph_node.createNode("xform", f"PHXFORM_{label}")
    xf.setInput(0, unpack)
    xf.parm("scale").set(scale)
    xf.parmTuple("t").set((0.0, -bb.minvec().y() * scale, 0.0))  # base at origin

    points_geo = hou.Geometry()
    points_geo.addAttrib(hou.attribType.Point, "pscale", 1.0)
    for x, z, pscale in spots:
        point = points_geo.createPoint()
        point.setPosition((x, layout.terrain_height(x, z), z))
        point.setAttribValue("pscale", pscale)
    stash = ph_node.createNode("stash", f"PHPOINTS_{label}")
    stash.parm("stash").set(points_geo)

    copy = ph_node.createNode("copytopoints", f"PHCOPY_{label}")
    copy.setInput(0, xf)
    copy.setInput(1, stash)
    return _ph_assign(ph_node, copy, matnet, ph_root, aid, label)


def build_polyhaven(ph_node: hou.Node, layout: HeartvaleLayout, ph_root: Path) -> dict[str, int]:
    """CC0 Poly Haven dressing: village props, verge grass, wild bushes, hero trees.

    All chains stay live file references (the .hipnc stays lean); scale is
    normalized per asset so everything lands at true world size."""
    matnet = hou.node("/mat")
    rng = random.Random(layout.seed ^ 0x9A17)
    anchor = layout.anchors["anwel"]["world"]
    ax, az = anchor["x"], anchor["z"]
    plaza = (ax + 7.0, az - 0.5)

    def gy(x: float, z: float) -> float:
        return layout.terrain_height(x, z)

    counts = {"props": 0, "grassClumps": 0, "bushes": 0, "heroTrees": 0}
    outs: list[hou.Node] = []

    def place(aid: str, label: str, x: float, z: float, target_height: float, yaw: float = 0.0, hook: bool = False) -> None:
        outs.append(_ph_place(ph_node, matnet, ph_root, aid, label, x, z, gy(x, z), target_height, yaw, hook))
        counts["props"] += 1

    # Village props — dock, store barn, plaza well (positions match build_anwel)
    place("wooden_barrels_01", "BARRELS_DOCK", ax - 2.3, az - 1.6, 0.95, yaw=15.0)
    place("wooden_barrels_01", "BARRELS_BARN", ax + 10.7, az - 7.2, 0.95, yaw=40.0)
    place("wooden_crate_01", "CRATE_DOCK_A", ax - 3.5, az + 1.6, 0.50, yaw=70.0)
    place("wooden_crate_01", "CRATE_DOCK_B", ax - 3.1, az + 2.3, 0.50, yaw=20.0)
    place("wooden_crate_01", "CRATE_BARN_A", ax + 7.1, az - 7.6, 0.55, yaw=0.0)
    place("wooden_crate_01", "CRATE_BARN_B", ax + 7.9, az - 6.9, 0.50, yaw=55.0)
    place("wooden_bucket_01", "BUCKET_WELL_A", plaza[0] - 0.8, plaza[1] + 0.7, 0.50, yaw=10.0)
    place("wooden_bucket_01", "BUCKET_WELL_B", plaza[0] + 0.9, plaza[1] - 0.7, 0.50, yaw=130.0)

    # Door lanterns — hung beside each house door at 2.0 m (doors face the plaza)
    houses = ((10.4, 2.6, 5.4), (5.6, -3.8, 3.6), (12.4, -1.8, 3.2), (4.9, 2.6, 2.8), (8.8, -6.2, 4.4))
    for index, (hx, hz, hw) in enumerate(houses):
        wx, wz = ax + hx, az + hz
        yaw_to_plaza = math.atan2(plaza[1] - wz, plaza[0] - wx)
        door_x = wx + math.cos(yaw_to_plaza) * (hw / 2 + 0.30)
        door_z = wz + math.sin(yaw_to_plaza) * (hw / 2 + 0.30)
        side_x, side_z = -math.sin(yaw_to_plaza) * 0.95, math.cos(yaw_to_plaza) * 0.95
        lx, lz = door_x + side_x, door_z + side_z
        outs.append(_ph_place(ph_node, matnet, ph_root, "wooden_lantern_01", f"LANTERN_{index}",
                              lx, lz, gy(lx, lz) + 2.0, 0.53, yaw=math.degrees(yaw_to_plaza), hook=True))
        counts["props"] += 1

    # Verge grass along the road near Anwel + a ring around the plaza
    grass_spots: list[tuple[float, float, float]] = []
    road_near = [s for s in layout.road_samples if abs(s[0] - ax) < 45.0 and abs(s[1] - az) < 45.0]
    for i in range(0, len(road_near), 3):
        sx, sz = road_near[i]
        ang = rng.uniform(0.0, 2.0 * math.pi)
        off = rng.uniform(1.6, 2.4)
        grass_spots.append((sx + math.cos(ang) * off, sz + math.sin(ang) * off, rng.uniform(0.7, 1.3)))
    for k in range(8):
        ang = k * math.pi / 4.0 + rng.uniform(-0.2, 0.2)
        r = rng.uniform(5.0, 6.5)
        grass_spots.append((plaza[0] + math.cos(ang) * r, plaza[1] + math.sin(ang) * r, rng.uniform(0.6, 1.0)))
    outs.append(_ph_scatter(ph_node, matnet, ph_root, layout, "grass_medium_01", "GRASS_VERGE", grass_spots, 0.22))
    counts["grassClumps"] += len(grass_spots)

    # Second grass species in the gossamer-moth meadow west of the terrace road
    meadow_spots: list[tuple[float, float, float]] = []
    mx, mz = layout.grid_to_world(30.0, 66.0)
    for k in range(10):
        ang = rng.uniform(0.0, 2.0 * math.pi)
        r = rng.uniform(2.0, 8.0)
        candidate = (mx + math.cos(ang) * r, mz + math.sin(ang) * r)
        if layout.river_distance(*candidate) > 2.0 and layout.road_distance(*candidate) > 1.2:
            meadow_spots.append((candidate[0], candidate[1], rng.uniform(0.8, 1.4)))
    outs.append(_ph_scatter(ph_node, matnet, ph_root, layout, "grass_medium_02", "GRASS_MEADOW", meadow_spots, 0.26))
    counts["grassClumps"] += len(meadow_spots)

    # Wild bushes: house gardens + east road verge (kept off road and water)
    bush_spots: list[tuple[float, float, float]] = []
    attempts = 0
    while len(bush_spots) < 14 and attempts < 120:
        attempts += 1
        ang = rng.uniform(0.0, 2.0 * math.pi)
        r = rng.uniform(4.0, 13.0)
        candidate = (plaza[0] + math.cos(ang) * r, plaza[1] + math.sin(ang) * r)
        if layout.river_distance(*candidate) > 2.0 and layout.road_distance(*candidate) > 1.5:
            bush_spots.append((candidate[0], candidate[1], rng.uniform(1.0, 1.8)))
    outs.append(_ph_scatter(ph_node, matnet, ph_root, layout, "wild_rooibos_bush", "BUSH_ANWEL", bush_spots, 0.60))
    counts["bushes"] += len(bush_spots)

    # Hero trees — full-geometry CC0 trees at landmark spots among the procedural stand
    for aid, label, x, z, height, yaw in (
        ("tree_small_02", "HERO_TREE_TERRACE", 6.5, -6.0, 8.0, 25.0),
        ("island_tree_02", "HERO_TREE_RIVER", ax - 4.5, az + 8.5, 7.5, 160.0),
        ("tree_small_02", "HERO_TREE_ANWEL", ax + 3.5, az - 10.5, 7.0, 200.0),
        ("island_tree_02", "HERO_TREE_SOUTH", -3.0, 16.0, 6.5, 310.0),
    ):
        outs.append(_ph_place(ph_node, matnet, ph_root, aid, label, x, z, gy(x, z), height, yaw=yaw))
        counts["heroTrees"] += 1

    merge = ph_node.createNode("merge", "POLYHAVEN_MERGE")
    for index, node in enumerate(outs):
        merge.setInput(index, node)
    out = ph_node.createNode("null", "OUT_POLYHAVEN")
    out.setInput(0, merge)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    ph_node.layoutChildren()
    matnet.layoutChildren()
    return counts


# --- NPC scale mannequins -------------------------------------------------------
# 1.75 m stand-ins for the 11 quest NPCs + Brother Owyn, so village scale reads
# correctly in the review renders (mannequin vs 2.2 m doorways, dock, well).
NPC_SKIN: Color = (0.62, 0.47, 0.35)
NPC_TROUSER: Color = (0.23, 0.18, 0.12)
NPC_HAIR: Color = (0.16, 0.11, 0.07)
NPC_PLACEMENTS: list[tuple[str, float, float, float, Color]] = [
    # id, world x, world z, facing yaw (deg), tunic color
    ("mira-eddlestone", 4.6, -24.9, 200.0, (0.30, 0.42, 0.22)),
    ("dockmaster-pell", -2.4, -25.6, 90.0, (0.18, 0.26, 0.38)),
    ("fletcher-anes", 6.3, -28.9, 160.0, (0.38, 0.27, 0.16)),
    ("herder-bonn", 3.2, -31.5, 20.0, (0.45, 0.35, 0.16)),
    ("cael-roadwarden", 1.2, -30.2, 0.0, (0.28, 0.32, 0.38)),
    ("wellkeeper-sef", 2.6, 2.2, 220.0, (0.16, 0.40, 0.38)),
    ("reeve-droma", 11.6, -24.6, 250.0, (0.42, 0.18, 0.20)),
    ("scavenger-ils", -3.4, -28.6, 60.0, (0.32, 0.32, 0.30)),
    ("old-fen", -3.0, -27.4, 120.0, (0.24, 0.38, 0.30)),
    ("shepherdess-rill", 1.0, 8.0, 180.0, (0.55, 0.50, 0.38)),
    ("sergeant-hull", 2.2, 12.5, 180.0, (0.36, 0.38, 0.42)),
    ("brother-owyn", 2.0, -30.9, 10.0, (0.60, 0.57, 0.50)),
]


def _build_mannequin(builder: GeometryBuilder, npc_id: str, x: float, z: float, ground: float, yaw_deg: float, tunic: Color) -> None:
    yaw = math.radians(yaw_deg)
    cy_, sy_ = math.cos(yaw), math.sin(yaw)

    def at(lx: float, lz: float) -> tuple[float, float]:
        return (x + lx * cy_ - lz * sy_, z + lx * sy_ + lz * cy_)

    mat = MATERIAL_PATHS["npc"]
    arm = (tunic[0] * 0.8, tunic[1] * 0.8, tunic[2] * 0.8)
    for side in (-1, 1):
        lx, lz = at(side * 0.11, 0.0)
        builder.add_cylinder(f"npc_{npc_id}_leg_{side}", (lx, ground + 0.40, lz), 0.075, 0.80, 7, NPC_TROUSER, "npc", mat)
        ax_, az_ = at(side * 0.26, 0.0)
        builder.add_cylinder(f"npc_{npc_id}_arm_{side}", (ax_, ground + 1.05, az_), 0.05, 0.55, 6, arm, "npc", mat)
    builder.add_cylinder(f"npc_{npc_id}_torso", (x, ground + 1.10, z), 0.17, 0.62, 8, tunic, "npc", mat)
    builder.add_cylinder(f"npc_{npc_id}_head", (x, ground + 1.62, z), 0.115, 0.24, 8, NPC_SKIN, "npc", mat)
    builder.add_box(f"npc_{npc_id}_hair", (x, ground + 1.78, z), (0.24, 0.08, 0.24), NPC_HAIR, "npc", mat, yaw=yaw)


def build_npcs(npc_node: hou.Node, layout: HeartvaleLayout) -> int:
    builder = GeometryBuilder()
    for npc_id, x, z, yaw, tunic in NPC_PLACEMENTS:
        _build_mannequin(builder, npc_id, x, z, layout.terrain_height(x, z), yaw, tunic)
    stash = npc_node.createNode("stash", "NPC_MANNEQUINS")
    stash.parm("stash").set(builder.geometry)
    normal = npc_node.createNode("normal", "NPC_NORMALS")
    normal.setInput(0, stash)
    normal.parm("cuspangle").set(50.0)
    out = npc_node.createNode("null", "OUT_NPCS")
    out.setInput(0, normal)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    npc_node.layoutChildren()
    return len(NPC_PLACEMENTS)



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
    ambient.parm("light_intensity").set(0.55)
    ambient.parm("ogl_enablelight").set(1)
    # Key light from the south so the north-facing review cameras see lit faces.
    distant("HEARTVALE_SUN_KEY", (-42.0, -15.0, 5.0), (1.0, 0.9, 0.75), 0.15)
    distant("HEARTVALE_SKY_RIM", (-20.0, 160.0, -15.0), (0.5, 0.65, 0.85), -1.6)
    distant("HEARTVALE_BOUNCE_FILL", (25.0, 55.0, -5.0), (0.72, 0.68, 0.60), -1.1)  # warm ground bounce, lifts shadow faces
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
    if camera.parm("far"):
        camera.parm("far").set(8000.0)
    return camera


def _persp_camera(obj: hou.Node, name: str, position: Vector3, target: Vector3, focal: float = 38.0) -> hou.Node:
    target_node = obj.createNode("null", f"{name}_TARGET")
    target_node.parmTuple("t").set(target)
    camera = obj.createNode("cam", name)
    camera.parmTuple("t").set(position)
    if camera.parm("lookatpath"):
        camera.parm("lookatpath").set(target_node.path())
    camera.parm("focal").set(focal)
    if camera.parm("far"):
        camera.parm("far").set(8000.0)
    return camera


def create_cameras(obj: hou.Node, layout: HeartvaleLayout) -> None:
    span = layout.zone_grid * layout.tile_size
    _ortho_camera(obj, "ISO_ZONE_CAMERA", (-span * 0.40, span * 0.55, 30.0 + span * 0.40), (0.0, 0.0, 30.0), span * 1.16)

    def eye(x: float, z: float, above: float = 1.7) -> Vector3:
        return (x, layout.terrain_height(x, z) + above, z)

    # Ground-level perspective shots — the player's actual first impressions.
    terrace_eye = (5.8, 3.9, -8.8)  # east side of the terrace, clear of the Breach arch
    ground = _persp_camera(obj, "GROUND_TERRACE_CAMERA", terrace_eye, (-1.5, 1.7, 7.5), 32.0)
    anwel = layout.anchors["anwel"]["world"]
    plaza = (anwel["x"] + 7.0, anwel["z"] - 0.5)
    _persp_camera(obj, "ANWEL_STREET_CAMERA", eye(anwel["x"] - 4.0, anwel["z"] - 15.0, 7.0), (plaza[0], layout.terrain_height(*plaza) + 1.2, plaza[1] - 0.5), 36.0)
    _persp_camera(obj, "RIVER_BANK_CAMERA", eye(-14.0, 27.0), (-2.0, layout.terrain_height(-2.0, 14.0) + 0.6, 14.0), 40.0)
    ground.setCurrent(True)


def create_review_renders(out: hou.Node, outdir: Path) -> list[dict]:
    results: list[dict] = []
    for name, camera in (
        ("GROUND_TERRACE_RENDER", "/obj/GROUND_TERRACE_CAMERA"),
        ("ANWEL_STREET_RENDER", "/obj/ANWEL_STREET_CAMERA"),
        ("RIVER_BANK_RENDER", "/obj/RIVER_BANK_CAMERA"),
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
    # Save once up front so $HIP resolves for the live Poly Haven file references
    # while the scene is still being cooked.
    hou.hipFile.save(args.hip.resolve().as_posix())
    create_materials()

    obj = hou.node("/obj")
    environment = obj.createNode("geo", "HEARTVALE_REALISTIC_WORLD")
    for child in environment.children():
        child.destroy()

    builder = GeometryBuilder()
    heights, splats, step, sample_count = build_terrain(builder, layout)
    build_water(builder, layout)
    build_sky(builder)
    build_terrace(builder, layout)
    build_anwel(builder, layout)
    counts = scatter_vegetation(builder, layout)

    grass_node = obj.createNode("geo", "HEARTVALE_GRASS_FIELD")
    for child in grass_node.children():
        child.destroy()
    counts["grassBlades"] = build_grass_field(grass_node, layout)

    ph_node = obj.createNode("geo", "HEARTVALE_POLYHAVEN")
    for child in ph_node.children():
        child.destroy()
    ph_root = args.hip.resolve().parent.parent / "polyhaven"
    counts.update(build_polyhaven(ph_node, layout, ph_root))

    npc_node = obj.createNode("geo", "HEARTVALE_NPCS")
    for child in npc_node.children():
        child.destroy()
    counts["npcs"] = build_npcs(npc_node, layout)

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
