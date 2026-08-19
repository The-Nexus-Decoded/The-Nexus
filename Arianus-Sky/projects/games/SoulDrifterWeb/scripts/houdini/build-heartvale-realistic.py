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
import sys
from pathlib import Path
from typing import Any, Sequence

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
    "soil": "/mat/HVR_Soil",
    "forestfloor": "/mat/HVR_Forest_Floor",
    "iron": "/mat/HVR_Iron",
}



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

    tex_root = "$HIP/../textures/heartvale"  # procedural fallbacks (bark etc.)
    ph_tex = lambda tex_id: f"$HIP/../polyhaven/textures/{tex_id}/{tex_id}_diff_1k.jpg"  # CC0 PBR sets

    def shader(name: str, color: Color, roughness: float, metallic: float = 0.0, texture: str | None = None, tint: bool = True, ph: bool = False) -> hou.Node:
        # Geometry carries its color as point Cd; keep the shader base white so the
        # OpenGL review renders don't multiply basecolor x point color. Textured
        # materials can opt out of the tint (the texture carries the hue) or keep
        # it (bark/roofs/plaster: texture x point-color tint = per-instance variety).
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
            node.parm("basecolor_texture").set(ph_tex(texture) if ph else f"{tex_root}/{texture}.png")
            if not tint:
                node.parm("basecolor_usePointColor").set(0)
        return node

    shader("HVR_Terrain", (1.0, 1.0, 1.0), 0.96)
    shader("HVR_Terrace_Stone", TERRACE_STONE, 0.90, texture="mossy_cobblestone", tint=False, ph=True)
    shader("HVR_Well_Stone", WELL_STONE, 0.86, texture="mossy_stone_wall", tint=False, ph=True)
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
    shader("HVR_Timber", TIMBER, 0.88, texture="wood_planks", ph=True)  # tint x planks = per-house timber variety
    shader("HVR_Plaster", PLASTER, 0.96, texture="plastered_wall", ph=True)  # tint x plaster = per-house lime wash
    shader("HVR_Thatch", THATCH, 0.98, texture="thatch_roof_angled", ph=True)
    shader("HVR_Slate", SLATE, 0.72, texture="roof_slates_02", ph=True)
    shader("HVR_Dock_Wood", DOCK_WOOD, 0.90, texture="wood_planks", ph=True)
    shader("HVR_Soil", (0.85, 0.80, 0.72), 0.99, texture="brown_mud_leaves_01", tint=False, ph=True)
    shader("HVR_Forest_Floor", (0.85, 0.82, 0.75), 0.99, texture="forest_floor", tint=False, ph=True)
    iron = shader("HVR_Iron", (0.16, 0.15, 0.14), 0.55, 0.85, tint=False)
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

    def _polygon(self, points: Sequence[hou.Point], name: str, kind: str, color: Color, material: str, uv_scale: float = 0.3) -> None:
        polygon = self.geometry.createPolygon()
        vertices: list[hou.Vertex] = []
        for point in points:
            vertices.append(polygon.addVertex(point))
        if uv_scale > 0.0:
            positions = [point.position() for point in points]
            ranges = [max(p[axis] for p in positions) - min(p[axis] for p in positions) for axis in range(3)]
            if ranges[1] <= min(ranges[0], ranges[2]):
                projected = [(p[0], p[2]) for p in positions]
            elif ranges[0] <= min(ranges[1], ranges[2]):
                projected = [(p[2], p[1]) for p in positions]
            else:
                projected = [(p[0], p[1]) for p in positions]
            for vertex, (u, v) in zip(vertices, projected, strict=True):
                vertex.setAttribValue("uv", (u * uv_scale, v * uv_scale, 0.0))
        polygon.setAttribValue("name", name)
        polygon.setAttribValue("path", f"/HeartvaleReal/{kind}/{name}")
        polygon.setAttribValue("souldrifter_kind", kind)
        polygon.setAttribValue("shop_materialpath", material)

    def add_quad(self, name: str, corners: Sequence[Vector3], color: Color, kind: str, material: str, uv_scale: float = 0.3) -> None:
        self._polygon([self._point(p, color) for p in corners], name, kind, color, material, uv_scale)

    def add_box(self, name: str, center: Vector3, size: Vector3, color: Color, kind: str, material: str, yaw: float = 0.0, uv_scale: float = 0.3) -> None:
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
            self._polygon([points[i] for i in face], name, kind, color, material, uv_scale)

    def add_cylinder(self, name: str, center: Vector3, radius: float, height: float, sides: int, color: Color, kind: str, material: str, cap_top: bool = True, cap_bottom: bool = True, uv_scale: float = 0.3) -> None:
        bottom: list[hou.Point] = []
        top: list[hou.Point] = []
        for index in range(sides):
            angle = index / sides * math.tau
            x = center[0] + math.cos(angle) * radius
            z = center[2] + math.sin(angle) * radius
            bottom.append(self._point((x, center[1] - height / 2, z), color))
            top.append(self._point((x, center[1] + height / 2, z), color))
        if cap_bottom:
            self._polygon(list(reversed(bottom)), name, kind, color, material, uv_scale)
        if cap_top:
            self._polygon(top, name, kind, color, material, uv_scale)
        for index in range(sides):
            nxt = (index + 1) % sides
            self._polygon([bottom[index], bottom[nxt], top[nxt], top[index]], name, kind, color, material, uv_scale)

    def add_ring(self, name: str, center: Vector3, inner: float, outer: float, y: float, sides: int, color: Color, kind: str, material: str, uv_scale: float = 0.3) -> None:
        for index in range(sides):
            a0 = index / sides * math.tau
            a1 = (index + 1) / sides * math.tau
            self.add_quad(name, [
                (center[0] + math.cos(a0) * inner, y, center[2] + math.sin(a0) * inner),
                (center[0] + math.cos(a1) * inner, y, center[2] + math.sin(a1) * inner),
                (center[0] + math.cos(a1) * outer, y, center[2] + math.sin(a1) * outer),
                (center[0] + math.cos(a0) * outer, y, center[2] + math.sin(a0) * outer),
            ], color, kind, material, uv_scale)

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

    def add_prism_roof(self, name: str, center: Vector3, width: float, depth: float, height: float, color: Color, kind: str, material: str, yaw: float = 0.0, uv_scale: float = 0.3) -> None:
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
            self._polygon([pts[i] for i in face], name, kind, color, material, uv_scale)

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


# --- Height/splat field (numpy): ONE source of truth for mesh + runtime exports ---
# v2 frame: layout arrives in plate world meters; the build works in soulwell-
# relative local meters. The basin is 3360×2700 m (hv-1…hv-7 span + margin).
import numpy as np

EXPORT_STEP = 2.5   # runtime heightmap/splat resolution (meters per texel)
MESH_STEP = 5.0     # Houdini blockout mesh resolution (2× export, exact subset)
DOMAIN_X = (-1180.0, 2300.0)  # local meters; hv-6 west edge ≈ -1117.5, hv-5/7 east ≈ +2242.5
DOMAIN_Z = (-1160.0, 1665.0)  # hv-2 north ≈ -1096, hv-4 south ≈ +1604
SPLAT_CHANNELS = ["grass", "dry", "road", "riverbed", "wet", "stone", "forest"]
FOREST_FLOOR_TINT: Color = (0.30, 0.24, 0.15)


def _hash2_np(ix: np.ndarray, iz: np.ndarray, seed: int) -> np.ndarray:
    """Vectorized _hash2. Low 48 bits of Python's infinite-precision two's
    complement arithmetic match int64, so this is bit-identical to the scalar
    version (verified against it at build time below)."""
    v = (ix.astype(np.int64) * 0x1F123BB5) ^ (iz.astype(np.int64) * 0x5F356495) ^ np.int64(seed)
    v = ((v ^ (v >> 16)) * 0x45D9F3B) & 0xFFFFFFFF
    v = v ^ (v >> 16)
    return (v & 0xFFFFFF).astype(np.float64) / float(0x1000000)


def _value_noise_np(x: np.ndarray, z: np.ndarray, seed: int) -> np.ndarray:
    ix, iz = np.floor(x), np.floor(z)
    fx, fz = x - ix, z - iz
    sx = fx * fx * (3.0 - 2.0 * fx)
    sz = fz * fz * (3.0 - 2.0 * fz)
    a = _hash2_np(ix, iz, seed)
    b = _hash2_np(ix + 1.0, iz, seed)
    c = _hash2_np(ix, iz + 1.0, seed)
    d = _hash2_np(ix + 1.0, iz + 1.0, seed)
    low = a + (b - a) * sx
    high = c + (d - c) * sx
    return (low + (high - low) * sz) * 2.0 - 1.0


def _fbm_np(x: np.ndarray, z: np.ndarray, seed: int, octaves: int = 4, lacunarity: float = 2.0, gain: float = 0.5) -> np.ndarray:
    total = np.zeros_like(x)
    amplitude, frequency, norm = 1.0, 1.0, 0.0
    for octave in range(octaves):
        total += amplitude * _value_noise_np(x * frequency, z * frequency, seed + octave * 131)
        norm += amplitude
        amplitude *= gain
        frequency *= lacunarity
    return total / norm


def _smoothstep_np(e0: float, e1: float, v: np.ndarray) -> np.ndarray:
    t = np.clip((v - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _polyline_distance_field(xs: np.ndarray, zs: np.ndarray, samples: list[tuple[float, float]], max_dist: float) -> np.ndarray:
    """Approximate euclidean distance to a polyline via ring dilation (good to
    max_dist; beyond that the value saturates). Samples are densified to ~1 m
    first so rasterization at 2.5 m leaves no gaps."""
    step = float(xs[1] - xs[0])
    nz, nx = len(zs), len(xs)
    dense: list[tuple[float, float]] = []
    for (ax, az), (bx, bz) in zip(samples, samples[1:]):
        length = math.hypot(bx - ax, bz - az)
        n = max(1, int(length))
        for s in range(n):
            t = s / n
            dense.append((ax + (bx - ax) * t, az + (bz - az) * t))
    if samples:
        dense.append(samples[-1])
    mask = np.zeros((nz, nx), dtype=bool)
    if dense:
        arr = np.asarray(dense)
        ix = np.clip(np.rint((arr[:, 0] - xs[0]) / step).astype(np.int64), 0, nx - 1)
        iz = np.clip(np.rint((arr[:, 1] - zs[0]) / step).astype(np.int64), 0, nz - 1)
        mask[iz, ix] = True
    dist = np.full((nz, nx), np.inf)
    dist[mask] = 0.0
    frontier = mask
    rings = int(math.ceil(max_dist / step))
    for k in range(1, rings + 1):
        dil = frontier.copy()
        dil[1:, :] |= frontier[:-1, :]
        dil[:-1, :] |= frontier[1:, :]
        dil[:, 1:] |= frontier[:, :-1]
        dil[:, :-1] |= frontier[:, 1:]
        new = dil & ~np.isfinite(dist)
        if not new.any():
            break
        dist[new] = k * step
        frontier = dil
    return np.where(np.isfinite(dist), dist, max_dist + step)


class HeightField:
    """Terrain height + splat weights + tints on one numpy grid. The Houdini
    mesh, the runtime heightmap/splat exports, and every placement call sample
    this field, so mesh/export/scatter always agree (runbook §3)."""

    def __init__(self, layout: "HeartvaleLayout") -> None:
        """Phase 1: heights + distance fields + moisture (no splat yet — the
        forest-floor channel needs tree positions, planned after heights)."""
        seed = layout.seed
        self.x0, self.x1 = DOMAIN_X
        self.z0, self.z1 = DOMAIN_Z
        self.step = EXPORT_STEP
        self.xs = self.x0 + np.arange(int(round((self.x1 - self.x0) / self.step)) + 1) * self.step
        self.zs = self.z0 + np.arange(int(round((self.z1 - self.z0) / self.step)) + 1) * self.step
        X, Z = np.meshgrid(self.xs, self.zs)  # (nz, nx), row-major, +Z rows

        # Basin-scale relief: domain-warped fBm with ~600 m wavelengths, local
        # detail kept at real scale, plus the authored terrace/Erboug forms.
        wx = X + 120.0 * _fbm_np(X * 0.0009 + 40.0, Z * 0.0009 - 17.0, seed ^ 0xA53A, 3)
        wz = Z + 120.0 * _fbm_np(X * 0.0009 - 23.0, Z * 0.0009 + 51.0, seed ^ 0x9E37, 3)
        base = 9.0 * _fbm_np(wx * 0.0016, wz * 0.0016, seed, 5)
        base += 0.35 * _fbm_np(X * 0.11, Z * 0.11, seed ^ 0x51ED, 3)
        base = base + 2.2 * np.exp(-((X - 0.0) ** 2 + (Z + 14.0) ** 2) / (2 * 10.0**2))  # terrace mound
        erboug = layout.anchors["erboug"]["world"]
        base = base + 6.0 * np.exp(-((X - erboug["x"]) ** 2 + (Z - erboug["z"]) ** 2) / (2 * 65.0**2))
        base = base - 6.0 * _smoothstep_np(300.0, 1500.0, Z)  # gentle descent south toward Vaeldor
        self.base = base

        H = base + (1.35 - base) * _smoothstep_np(16.0, 10.5, np.hypot(X, Z))  # terrace plateau
        self.d_river = _polyline_distance_field(self.xs, self.zs, layout.river_samples, 20.0)
        carve = 1.65 * (1.0 - _smoothstep_np(2.4, 5.4, self.d_river))
        carve += 0.35 * (1.0 - _smoothstep_np(4.0, 7.5, self.d_river))  # soft banks
        H = H - carve
        self.d_road = _polyline_distance_field(self.xs, self.zs, layout.road_samples, 20.0)
        H = H + (np.round(H / 0.30) * 0.30 - H) * (0.5 * (1.0 - _smoothstep_np(1.8, 4.2, self.d_road)))
        self.H = H

        self.moisture = _fbm_np(X * 0.021 + 9.0, Z * 0.021 - 4.0, seed ^ 0xF00D, 3)
        self.moisture = self.moisture + 0.35 * (1.0 - _smoothstep_np(3.0, 14.0, self.d_river))  # riparian green-up

        self._X = X
        self._Z = Z
        self.weights: np.ndarray | None = None
        self.tint: np.ndarray | None = None

    def build_splat(self, layout: "HeartvaleLayout", tree_positions: list[tuple[float, float]]) -> None:
        """Phase 2: splat weights + tints. Runs after vegetation planning so the
        forest-floor channel can be painted around every planned trunk."""
        X, Z = self._X, self._Z
        nz, nx = X.shape
        lush = _smoothstep_np(-0.35, 0.25, self.moisture)
        W = np.zeros((len(SPLAT_CHANNELS), nz, nx), dtype=np.float64)
        W[0] = lush
        W[1] = 1.0 - lush

        def overlay(channel: int, w: np.ndarray) -> None:
            W[:] = W * (1.0 - w)[None, :, :]
            W[channel] += w

        # T1: forest floor painted INTO the ground — feathered, per-tree noisy
        # radius (~1.5–2.5 m) leaf-litter under every planned trunk.
        forest = np.zeros((nz, nx))
        rng = random.Random(layout.seed ^ 0xF012)
        for tx, tz in tree_positions:
            radius = rng.uniform(1.5, 2.5)
            jx = int(round((tx - self.x0) / self.step))
            iz = int(round((tz - self.z0) / self.step))
            reach = int(math.ceil(radius / self.step)) + 1
            x_lo, x_hi = max(0, jx - reach), min(nx, jx + reach + 1)
            z_lo, z_hi = max(0, iz - reach), min(nz, iz + reach + 1)
            if x_lo >= x_hi or z_lo >= z_hi:
                continue
            DX, DZ = np.meshgrid(self.xs[x_lo:x_hi] - tx, self.zs[z_lo:z_hi] - tz)
            d = np.hypot(DX, DZ)
            w = np.clip(1.0 - d / radius, 0.0, 1.0) ** 0.7 * 0.9
            np.maximum(forest[z_lo:z_hi, x_lo:x_hi], w, out=forest[z_lo:z_hi, x_lo:x_hi])
        wet = _smoothstep_np(2.2, 3.4, self.d_river) * (1.0 - _smoothstep_np(4.2, 5.6, self.d_river))
        road = 1.0 - _smoothstep_np(1.7, 3.0, self.d_road)
        riverbed = 1.0 - _smoothstep_np(2.6, 4.0, self.d_river)
        stone = 1.0 - _smoothstep_np(11.0, 12.5, np.hypot(X, Z))
        overlay(6, forest)
        overlay(4, wet)
        overlay(2, road)
        overlay(3, riverbed)
        overlay(5, stone)
        self.weights = W

        # Vertex tint (Houdini blockout Cd + subtle runtime modulation)
        patch = _fbm_np(X * 0.02, Z * 0.02, layout.seed ^ 0xBEEF, 3)
        meadow_blend = 0.4 * _smoothstep_np(0.1, 0.5, patch)
        col = np.empty((3, nz, nx))
        for i in range(3):
            c = GRASS_DRY[i] + (GRASS_LUSH[i] - GRASS_DRY[i]) * lush
            col[i] = c + (MEADOW[i] - c) * meadow_blend
        for target, w in (
            (FOREST_FLOOR_TINT, forest),
            (WET_BANK, wet * 0.7),
            (DIRT_ROAD, road),
            (RIVERBED, riverbed),
            (TERRACE_STONE, stone),
        ):
            for i in range(3):
                col[i] = col[i] * (1.0 - w) + target[i] * w
        jitter = _value_noise_np(X * 0.9, Z * 0.9, layout.seed ^ 0x51CE) * 0.05
        col[0] = np.clip(col[0] + jitter * 0.6, 0.0, 1.0)
        col[1] = np.clip(col[1] + jitter, 0.0, 1.0)
        col[2] = np.clip(col[2] + jitter * 0.4, 0.0, 1.0)
        self.tint = col
        self.weights = W

    def _sample(self, grid: np.ndarray, x: float, z: float) -> float:
        fx = (x - self.x0) / self.step
        fz = (z - self.z0) / self.step
        fx = min(max(fx, 0.0), grid.shape[1] - 1.001)
        fz = min(max(fz, 0.0), grid.shape[0] - 1.001)
        ix, iz = int(fx), int(fz)
        tx, tz = fx - ix, fz - iz
        a, b = grid[iz, ix], grid[iz, ix + 1]
        c, d = grid[iz + 1, ix], grid[iz + 1, ix + 1]
        return float((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz)

    def height(self, x: float, z: float) -> float:
        return self._sample(self.H, x, z)

    def base_height(self, x: float, z: float) -> float:
        return self._sample(self.base, x, z)

    def moisture_at(self, x: float, z: float) -> float:
        return self._sample(self.moisture, x, z)

    def splat_weights_at(self, x: float, z: float) -> list[float]:
        ix = int(round((x - self.x0) / self.step))
        iz = int(round((z - self.z0) / self.step))
        ix = min(max(ix, 0), self.weights.shape[2] - 1)
        iz = min(max(iz, 0), self.weights.shape[1] - 1)
        return [float(self.weights[c, iz, ix]) for c in range(len(SPLAT_CHANNELS))]


class HeartvaleLayout:
    """v2 frame layout: payload world coords are plate-frame meters; everything
    in the build uses soulwell-relative local meters (same axes). Heights come
    from the attached HeightField — never recompute terrain functions locally."""

    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.tile_size = float(payload["scale"]["tileSize"])  # logical grid only (15 m)
        soulwell = next(a for a in payload["anchors"] if a["id"] == "soulwell")
        self.origin_plate = (soulwell["world"]["x"], soulwell["world"]["z"])
        self.zones = payload.get("zones", [])
        self.seed = int(payload["seed"])
        self.field: HeightField | None = None

        def localize(samples: Sequence[Sequence[float]]) -> list[tuple[float, float]]:
            return [(wx - self.origin_plate[0], wz - self.origin_plate[1]) for wx, wz in samples]

        self.rivers = [(r["id"], localize(r["samples"])) for r in payload["rivers"]]
        self.roads = [(r["id"], localize(r["samples"])) for r in payload["roads"]]
        self.river_samples = [s for _, samples in self.rivers for s in samples]
        self.road_samples = [s for _, samples in self.roads for s in samples]
        self.anchors: dict[str, dict] = {}
        for anchor in payload["anchors"]:
            entry = dict(anchor)
            entry["worldPlate"] = dict(anchor["world"])
            entry["world"] = {
                "x": anchor["world"]["x"] - self.origin_plate[0],
                "z": anchor["world"]["z"] - self.origin_plate[1],
            }
            self.anchors[anchor["id"]] = entry

    def attach_field(self, field: HeightField) -> None:
        self.field = field

    def terrain_height(self, x: float, z: float) -> float:
        assert self.field is not None, "attach_field() must run before placement"
        return self.field.height(x, z)

    def base_height(self, x: float, z: float) -> float:
        assert self.field is not None, "attach_field() must run before placement"
        return self.field.base_height(x, z)

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


def build_terrain(builder: GeometryBuilder, layout: HeartvaleLayout) -> None:
    """Blockout mesh: every 2nd field texel (5 m grid — an exact subset of the
    2.5 m export grid, so the mesh and the runtime heightmap always agree)."""
    field = layout.field
    assert field is not None
    sub = int(round(MESH_STEP / EXPORT_STEP))
    xs = field.xs[::sub]
    zs = field.zs[::sub]
    H = field.H[::sub, ::sub]
    tint = field.tint[:, ::sub, ::sub]
    nx, nz = len(xs), len(zs)

    point_grid: list[list[hou.Point]] = []
    for iz in range(nz):
        row: list[hou.Point] = []
        for ix in range(nx):
            row.append(builder._point(
                (float(xs[ix]), float(H[iz, ix]), float(zs[iz])),
                (float(tint[0, iz, ix]), float(tint[1, iz, ix]), float(tint[2, iz, ix])),
            ))
        point_grid.append(row)

    for iz in range(nz - 1):
        for ix in range(nx - 1):
            corners = [point_grid[iz][ix], point_grid[iz + 1][ix], point_grid[iz + 1][ix + 1], point_grid[iz][ix + 1]]
            colors = [p.attribValue("Cd") for p in corners]
            color = tuple(sum(c[i] for c in colors) / 4.0 for i in range(3))
            # constant name/path and no uvs on terrain: 393k unique strings and
            # 1.6M uv triples would otherwise triple the committed .hipnc size
            builder._polygon(corners, "terrain", "terrain", color, MATERIAL_PATHS["terrain"], 0.0)


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
    radius, sides = 3200.0, 48
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
        half_width = 3.2
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
    builder.add_cylinder("terrace_lower_step", (0, pad + 0.15, 0), 10.5, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"], uv_scale=0.45)
    builder.add_cylinder("terrace_upper_step", (0, pad + 0.42, 0), 8.75, 0.30, 28, TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"], uv_scale=0.45)
    top = pad + 0.57
    # Soulwell ring: mossy stone courses with iron bands, plus a timber windlass
    # frame (posts, axle, rope, bucket) so the spawn anchor reads as a real well.
    builder.add_cylinder("well_outer_ring", (0, top + 0.55, 0), 2.60, 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"], cap_top=False, uv_scale=0.6)
    builder.add_cylinder("well_shaft_dark", (0, top + 0.45, 0), 2.05, 0.90, 16, PORTAL_DARK, "well", MATERIAL_PATHS["portal"])
    builder.add_cylinder("well_soul_water", (0, top + 0.95, 0), 1.95, 0.08, 16, SOUL_WATER, "well", MATERIAL_PATHS["soulwater"])
    builder.add_ring("well_rim_cap", (0, 0, 0), 2.05, 2.60, top + 1.10, 16, WELL_STONE, "well", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_cylinder("well_band_lower", (0, top + 0.26, 0), 2.66, 0.08, 16, (0.16, 0.15, 0.14), "well", MATERIAL_PATHS["iron"], cap_top=False, cap_bottom=False)
    builder.add_cylinder("well_band_upper", (0, top + 0.86, 0), 2.66, 0.08, 16, (0.16, 0.15, 0.14), "well", MATERIAL_PATHS["iron"], cap_top=False, cap_bottom=False)
    for px in (-2.9, 2.9):
        builder.add_box(f"well_windlass_post_{px:+.1f}", (px, top + 1.70, 0), (0.20, 3.40, 0.20), TIMBER, "well", MATERIAL_PATHS["timber"], uv_scale=0.5)
        builder.add_box(f"well_windlass_foot_{px:+.1f}", (px, top + 0.10, 0), (0.55, 0.20, 0.55), WELL_STONE, "well", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_tapered_tube("well_windlass_axle", (-3.05, top + 3.15, 0), (3.05, top + 3.15, 0), 0.09, 0.09, 8, DOCK_WOOD, "well", MATERIAL_PATHS["dock"])
    builder.add_tapered_tube("well_rope", (0, top + 3.10, 0), (0, top + 1.08, 0), 0.024, 0.024, 5, (0.45, 0.37, 0.24), "well", MATERIAL_PATHS["timber"])
    builder.add_cylinder("well_bucket", (0, top + 0.96, 0), 0.17, 0.26, 8, DOCK_WOOD, "well", MATERIAL_PATHS["dock"], uv_scale=0.5)
    builder.add_octahedron("echo_shard_large", (0.15, top + 3.85, 0.10), 0.52, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_mid", (-0.55, top + 4.60, 0.35), 0.34, SHARD, "shard", MATERIAL_PATHS["shard"])
    builder.add_octahedron("echo_shard_small", (0.60, top + 5.20, -0.30), 0.24, SHARD, "shard", MATERIAL_PATHS["shard"])
    arch_z = -8.2
    builder.add_box("breach_arch_jamb_west", (-1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_box("breach_arch_jamb_east", (1.25, top + 1.30, arch_z), (0.65, 2.60, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_box("breach_arch_lintel", (0, top + 2.85, arch_z), (3.20, 0.70, 1.10), WELL_STONE, "portal", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_box("breach_passage_dark", (0, top + 1.20, arch_z - 0.75), (1.85, 2.40, 0.60), PORTAL_DARK, "portal", MATERIAL_PATHS["portal"])
    for step_index in range(3):
        builder.add_box(f"breach_step_{step_index}", (0, top + 0.42 - step_index * 0.19, arch_z + 1.05 + step_index * 0.62), (2.1, 0.19, 0.66), TERRACE_STONE, "portal", MATERIAL_PATHS["terrace"], uv_scale=0.5)
    builder.add_box("overlook_parapet_west", (-1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    builder.add_box("overlook_parapet_east", (1.6, top + 0.42, 8.1), (1.7, 0.84, 0.45), WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"], uv_scale=0.6)
    for slab_index in range(4):
        builder.add_box(f"terrace_flagstone_{slab_index}", (0.10 * (slab_index % 2), top + 0.025, -6.1 + slab_index * 1.35), (1.30, 0.06, 1.05), TERRACE_STONE, "terrace", MATERIAL_PATHS["terrace"], yaw=0.05 * ((slab_index % 3) - 1), uv_scale=0.5)
    for column_index, angle in enumerate((0.6, 1.9, 3.4, 4.9)):
        radius = 9.4
        height = (0.9, 1.5, 0.7, 1.2)[column_index]
        builder.add_cylinder(f"terrace_column_stub_{column_index}", (math.cos(angle) * radius, pad + 0.30 + height / 2, math.sin(angle) * radius), 0.38, height, 10, WELL_STONE, "terrace", MATERIAL_PATHS["wellstone"], uv_scale=0.6)


def build_anwel(builder: GeometryBuilder, layout: HeartvaleLayout) -> dict:
    """Anwel river-town: timber-framed, enterable houses around an east-bank plaza.
    Returns the data-authored village spec (also exported as village.json).

    The canon river course AND the north-south road both run through the atlas
    anchor point, so the village sits ~7 m east — beside the road, off the wet
    bank. Houses are hollow shells with 2.2 m door openings (character ~1.8 m)
    and a window, so they are enterable in-game and in later engine ports."""
    anchor = layout.anchors["anwel"]["world"]
    ax, az = anchor["x"], anchor["z"]
    plaza = (ax + 7.0, az - 0.5)

    def gy(x: float, z: float) -> float:
        return layout.terrain_height(x, z)

    def house(name: str, lx: float, lz: float, w: float, d: float, h: float, roof: str = "thatch",
              wash: Color = (1.0, 1.0, 1.0), timber_tint: Color = (1.0, 1.0, 1.0),
              roof_tint: Color = (1.0, 1.0, 1.0), chimney: bool = False) -> None:
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
        builder.add_box(f"{name}_footing", (x, base + 0.15, z), (w + 0.3, 0.3, d + 0.3), WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"], yaw=yaw, uv_scale=0.55)
        builder.add_box(f"{name}_floor", (x, base + 0.36, z), (w, 0.12, d), DOCK_WOOD, "anwel", MATERIAL_PATHS["dock"], yaw=yaw, uv_scale=0.5)

        def panel(tag: str, ox: float, oz: float, y0: float, y1: float, sx: float, sz: float) -> None:
            cx, cz = spot(ox, oz)
            builder.add_box(f"{name}_{tag}", (cx, wall0 + (y0 + y1) / 2, cz), (sx, y1 - y0, sz), wash, "anwel", MATERIAL_PATHS["plaster"], yaw=yaw, uv_scale=0.5)

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

        # plank door (recessed into the opening) + stone doorstep
        dx_, dz_ = spot(w / 2 - 0.10, 0.0)
        builder.add_box(f"{name}_door", (dx_, wall0 + door_h / 2 - 0.03, dz_), (0.06, door_h - 0.08, door_w - 0.10), timber_tint, "anwel", MATERIAL_PATHS["dock"], yaw=yaw, uv_scale=0.5)
        sx_, sz_ = spot(w / 2 + 0.28, 0.0)
        builder.add_box(f"{name}_doorstep", (sx_, wall0 - 0.34, sz_), (0.62, 0.10, door_w + 0.2), WELL_STONE, "anwel", MATERIAL_PATHS["wellstone"], yaw=yaw, uv_scale=0.55)

        # window shutters (both sides of the window on the -X wall)
        for sz_off in (-(win_w / 2 + 0.14), win_w / 2 + 0.14):
            shx, shz = spot(-w / 2 - 0.05, sz_off)
            builder.add_box(f"{name}_shutter_{sz_off:+.2f}", (shx, wall0 + (win_sill + win_top) / 2, shz), (0.05, win_top - win_sill, 0.24), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        # window frame + mullions so the opening catches light (T4)
        for mz in (-(win_w / 2 + 0.04), win_w / 2 + 0.04):
            fx_, fz_ = spot(-w / 2 - 0.02, mz)
            builder.add_box(f"{name}_win_jamb_{mz:+.2f}", (fx_, wall0 + (win_sill + win_top) / 2, fz_), (0.09, win_top - win_sill + 0.10, 0.09), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        for my, tag in ((win_sill - 0.05, "sill"), (win_top + 0.05, "header")):
            fx_, fz_ = spot(-w / 2 - 0.02, 0.0)
            builder.add_box(f"{name}_win_{tag}", (fx_, wall0 + my, fz_), (0.09, 0.09, win_w + 0.18), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        fx_, fz_ = spot(-w / 2 - 0.01, 0.0)
        builder.add_box(f"{name}_win_mullion_v", (fx_, wall0 + (win_sill + win_top) / 2, fz_), (0.05, win_top - win_sill, 0.05), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)
        builder.add_box(f"{name}_win_mullion_h", (fx_, wall0 + (win_sill + win_top) / 2, fz_), (0.05, 0.05, win_w), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)

        # timber frame: corner posts + door surround
        for cx in (-1, 1):
            for cz in (-1, 1):
                px, pz = spot(cx * (w / 2 - 0.09), cz * (d / 2 - 0.09))
                builder.add_box(f"{name}_post_{cx}_{cz}", (px, wall0 + h / 2, pz), (0.18, h, 0.18), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        for dz in (-door_w / 2, door_w / 2):
            px, pz = spot(w / 2 + 0.03, dz)
            builder.add_box(f"{name}_doorframe_{dz:+.2f}", (px, wall0 + door_h / 2, pz), (0.10, door_h, 0.10), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        roof_h = h * 0.55
        builder.add_prism_roof(f"{name}_roof", (x, wall0 + h, z), w + 0.7, d + 0.7, roof_h, roof_tint, "anwel", MATERIAL_PATHS[roof], yaw=yaw, uv_scale=0.75)
        # ridge beam caps the gable
        builder.add_box(f"{name}_ridge", (x, wall0 + h + roof_h - 0.03, z), (w + 0.85, 0.12, 0.14), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        # eave boards + gable timber framing (T4: kills the razor-sharp box read)
        for ez_sign in (-1, 1):
            ex_, ez_ = spot(0.0, ez_sign * ((d + 0.7) / 2 - 0.06))
            builder.add_box(f"{name}_eave_{ez_sign:+d}", (ex_, wall0 + h + 0.03, ez_), (w + 0.85, 0.10, 0.13), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
        for gx_sign in (-1, 1):
            px_, pz_ = spot(gx_sign * (w / 2 - 0.06), 0.0)
            builder.add_box(f"{name}_gable_post_{gx_sign:+d}", (px_, wall0 + h + roof_h / 2, pz_), (0.10, roof_h, 0.10), timber_tint, "anwel", MATERIAL_PATHS["timber"], yaw=yaw, uv_scale=0.5)
            for gz_sign in (-1, 1):
                bx_, bz_ = spot(gx_sign * (w / 2 - 0.06), gz_sign * (d / 2 - 0.10))
                builder.add_tapered_tube(f"{name}_gable_brace_{gx_sign:+d}_{gz_sign:+d}", (bx_, wall0 + h + 0.04, bz_), (px_, wall0 + h + roof_h - 0.08, pz_), 0.05, 0.05, 4, timber_tint, "anwel", MATERIAL_PATHS["timber"])
        if chimney:
            chx, chz = spot(-w * 0.18, -d * 0.20)
            builder.add_box(f"{name}_chimney", (chx, wall0 + h + roof_h + 0.55, chz), (0.48, 1.6, 0.48), wash, "anwel", MATERIAL_PATHS["wellstone"], yaw=yaw, uv_scale=0.55)
            builder.add_box(f"{name}_chimney_cap", (chx, wall0 + h + roof_h + 1.40, chz), (0.62, 0.12, 0.62), SLATE, "anwel", MATERIAL_PATHS["slate"], yaw=yaw, uv_scale=0.6)

    # Lime-wash / timber / roof variation so no two cottages read the same.
    # Data-authored: these specs also ship to the runtime in village.json.
    house_specs = [
        {"name": "anwel_reeve_hall", "lx": 13.8, "lz": 4.2, "w": 5.4, "d": 4.2, "h": 3.0, "roof": "slate",
         "wash": (0.92, 0.88, 0.78), "timber": (0.75, 0.62, 0.50), "roofTint": (0.85, 0.88, 0.95), "chimney": True},
        {"name": "anwel_cottage_north", "lx": 6.2, "lz": 6.4, "w": 3.6, "d": 3.0, "h": 2.6, "roof": "thatch",
         "wash": (1.02, 0.98, 0.90), "timber": (1.05, 0.95, 0.82), "roofTint": (1.05, 0.95, 0.80), "chimney": False},
        {"name": "anwel_fisher_hut", "lx": 1.8, "lz": 4.6, "w": 2.8, "d": 2.4, "h": 2.3, "roof": "thatch",
         "wash": (0.82, 0.80, 0.72), "timber": (0.62, 0.55, 0.48), "roofTint": (0.78, 0.72, 0.60), "chimney": False},
        {"name": "anwel_cottage_east", "lx": 15.0, "lz": -2.2, "w": 3.2, "d": 2.8, "h": 2.5, "roof": "thatch",
         "wash": (0.98, 0.90, 0.74), "timber": (0.88, 0.76, 0.62), "roofTint": (0.92, 0.85, 0.68), "chimney": True},
        {"name": "anwel_store_barn", "lx": 10.8, "lz": -7.6, "w": 4.4, "d": 3.2, "h": 2.8, "roof": "slate",
         "wash": (0.86, 0.82, 0.70), "timber": (0.70, 0.60, 0.50), "roofTint": (1.0, 0.92, 0.85), "chimney": False},
        {"name": "anwel_cottage_south", "lx": 5.4, "lz": -8.2, "w": 3.4, "d": 2.8, "h": 2.5, "roof": "thatch",
         "wash": (1.05, 1.00, 0.94), "timber": (0.95, 0.85, 0.70), "roofTint": (1.10, 1.00, 0.82), "chimney": True},
    ]
    for spec in house_specs:
        house(spec["name"], spec["lx"], spec["lz"], spec["w"], spec["d"], spec["h"], spec["roof"],
              wash=spec["wash"], timber_tint=spec["timber"], roof_tint=spec["roofTint"], chimney=spec["chimney"])

    # Fenced garden plots behind/beside houses — the separation and small
    # gardens a real village has between buildings. Gate gap faces the lane.
    def garden(name: str, gcx: float, gcz: float, w: float, d: float) -> None:
        x, z = ax + gcx, az + gcz
        gy0 = gy(x, z)
        post_step = 0.9
        gate = 1.1  # gate gap on the south (lane-facing) side
        sides = (
            ("n", [(x - w / 2 + i * post_step, z - d / 2) for i in range(int(w / post_step) + 1)]),
            ("e", [(x + w / 2, z - d / 2 + i * post_step) for i in range(int(d / post_step) + 1)]),
            ("w", [(x - w / 2, z - d / 2 + i * post_step) for i in range(int(d / post_step) + 1)]),
        )
        south_posts = []
        i = 0
        while True:
            px = x - w / 2 + i * post_step
            if px > x + w / 2:
                break
            if abs(px - x) > gate / 2:  # leave the gate open
                south_posts.append((px, z + d / 2))
            i += 1
        sides += (("s", south_posts),)
        post_index = 0
        for side_name, posts in sides:
            for px, pz in posts:
                py = gy(px, pz)
                builder.add_box(f"{name}_post_{post_index}", (px, py + 0.42, pz), (0.09, 0.84, 0.09), TIMBER, "anwel", MATERIAL_PATHS["timber"])
                post_index += 1
            for a, b in zip(posts, posts[1:]):
                if math.hypot(b[0] - a[0], b[1] - a[1]) > post_step * 1.5:
                    continue  # don't rail across the gate
                mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                rail_len = math.hypot(b[0] - a[0], b[1] - a[1])
                yaw = math.atan2(b[0] - a[0], b[1] - a[1])
                builder.add_box(f"{name}_rail_{post_index}_{side_name}", (mx, gy(mx, mz) + 0.62, mz), (0.06, 0.07, rail_len), TIMBER, "anwel", MATERIAL_PATHS["timber"], yaw=yaw)
                post_index += 1

    garden_specs = [
        {"name": "garden_reeve", "lx": 13.8, "lz": 8.8, "w": 4.5, "d": 3.0},
        {"name": "garden_north", "lx": 9.8, "lz": 6.9, "w": 3.5, "d": 2.6},
        {"name": "garden_south", "lx": 5.4, "lz": -11.8, "w": 4.0, "d": 3.0},
        {"name": "garden_east", "lx": 18.2, "lz": -2.2, "w": 3.2, "d": 3.2},
    ]
    for spec in garden_specs:
        garden(spec["name"], spec["lx"], spec["lz"], spec["w"], spec["d"])

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

    # Data-authored capture for the runtime village builder (village.json).
    return {
        "anchor": {"x": ax, "z": az},
        "plaza": {"x": plaza[0], "z": plaza[1]},
        "houses": [
            {
                **{k: (list(v) if isinstance(v, tuple) else v) for k, v in spec.items()},
                "x": ax + spec["lx"],
                "z": az + spec["lz"],
                "yawDeg": math.degrees(math.atan2(plaza[1] - (az + spec["lz"]), plaza[0] - (ax + spec["lx"]))),
            }
            for spec in house_specs
        ],
        "gardens": [{**spec, "x": ax + spec["lx"], "z": az + spec["lz"]} for spec in garden_specs],
        "well": {"x": plaza[0], "z": plaza[1]},
        "dock": {"x": ax - 2.9, "z0": az - 2.6, "planks": 6, "plankSpacing": 0.75},
    }


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


def scatter_vegetation(builder: GeometryBuilder, layout: HeartvaleLayout) -> dict[str, Any]:
    """Plan vegetation/rock positions across the whole 3360×2700 m section.
    Nothing is built into the authored mesh anymore — positions are consumed by
    build_polyhaven() (near-field Houdini blockout instances) and exported to
    scatter.json for the runtime (the full plan)."""
    rng = random.Random(layout.seed ^ 0xC0FFEE)
    x0, x1 = DOMAIN_X
    z0, z1 = DOMAIN_Z
    anwel = layout.anchors["anwel"]["world"]
    lockroot = layout.anchors["lockroot"]["world"]

    def excluded(x: float, z: float, margin: float = 0.0) -> bool:
        if math.hypot(x, z) < 13.0 + margin:
            return True
        if math.hypot(x - (anwel["x"] + 7.0), z - (anwel["z"] - 0.5)) < 14.0:  # village green + house ring
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
    trees: list[tuple[float, float, float, str, float]] = []  # x, gy, z, species, pscale
    shrubs: list[tuple[float, float, float, int, float]] = []  # x, gy, z, variant, pscale
    rocks: list[tuple[float, float, float, float]] = []  # x, gy, z, radius
    sedges: list[tuple[float, float, float, float]] = []  # x, gy, z, pscale

    # Trees — clustered by noise so they read as groves. Massing follows the
    # plate: the Thalholt/west wilds treeline (hv-6) and the Lockroot reach NE.
    for _ in range(24000):
        if len(trees) >= 850:
            break
        x = rng.uniform(x0 + 10, x1 - 10)
        z = rng.uniform(z0 + 10, z1 - 10)
        grove = fbm(x * 0.004 + 7.0, z * 0.004 - 3.0, layout.seed + 77, 3)
        bias = 0.0
        if x < -460.0:  # west wilds strip (hv-6)
            bias = 0.28
        elif x > lockroot["x"] - 260.0 and z < lockroot["z"] + 260.0 and z < -300.0:
            bias = 0.22  # Lockroot reach
        if grove < 0.10 - bias and rng.random() > 0.15:
            continue
        if math.hypot(x, z) > 500.0 and math.hypot(x - anwel["x"], z - anwel["z"]) > 400.0 and rng.random() > 0.35:
            continue  # keep the far march sparse
        if excluded(x, z):
            continue
        gy = layout.terrain_height(x, z)
        if layout.river_distance(x, z) < 12.0:
            species = "willow"
        elif x < -460.0 and rng.random() < 0.6:
            species = "oak"
        elif z < -300.0 and rng.random() < 0.5:
            species = "birch"
        else:
            species = "oak"
        trees.append((x, gy, z, species, rng.uniform(0.9, 1.7)))
        placed_trees.append((x, gy, z))

    # Shrubs — under trees, along roadsides and river edges.
    for _ in range(9000):
        if len(shrubs) >= 600:
            break
        if placed_trees and rng.random() < 0.6:
            tx, _, tz = placed_trees[rng.randrange(len(placed_trees))]
            angle = rng.uniform(0.0, math.tau)
            dist = rng.uniform(2.5, 7.0)
            x, z = tx + math.cos(angle) * dist, tz + math.sin(angle) * dist
        else:
            x = rng.uniform(x0 + 10, x1 - 10)
            z = rng.uniform(z0 + 10, z1 - 10)
        if x < x0 + 6 or x > x1 - 6 or z < z0 + 6 or z > z1 - 6:
            continue
        if excluded(x, z, margin=-1.0):
            continue
        gy = layout.terrain_height(x, z)
        shrubs.append((x, gy, z, rng.randrange(4), rng.uniform(0.8, 1.6)))

    # Rocks
    for _ in range(3000):
        if len(rocks) >= 250:
            break
        x = rng.uniform(x0 + 10, x1 - 10)
        z = rng.uniform(z0 + 10, z1 - 10)
        if excluded(x, z, margin=-2.0):
            continue
        gy = layout.terrain_height(x, z)
        rocks.append((x, gy, z, rng.uniform(0.3, 1.2)))

    # Sedge tufts along riverbanks
    for _ in range(6000):
        if len(sedges) >= 300:
            break
        x = rng.uniform(x0 + 10, x1 - 10)
        z = rng.uniform(z0 + 10, z1 - 10)
        d = layout.river_distance(x, z)
        if d < 2.8 or d > 6.5:
            continue
        if layout.road_distance(x, z) < 2.0:
            continue
        gy = layout.terrain_height(x, z)
        sedges.append((x, gy, z, rng.uniform(1.1, 2.0)))

    return {
        "trees": len(trees),
        "shrubs": len(shrubs),
        "rocks": len(rocks),
        "reeds": len(sedges),
        "treePositions": trees,
        "shrubPositions": shrubs,
        "rockPositions": rocks,
        "sedgePositions": sedges,
    }


def _quat_mul(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def _clump_prototype(root: Color, tip: Color) -> hou.Geometry:
    """One grass CLUMP (T2): 5 tapered blades fanned from a small base,
    varied heights 0.25–0.5 m and lean, so clumps read as tufts not cards."""
    geometry = hou.Geometry()
    geometry.addAttrib(hou.attribType.Point, "Cd", (1.0, 1.0, 1.0))
    geometry.addAttrib(hou.attribType.Prim, "shop_materialpath", "")
    rng = random.Random(7)
    for blade in range(5):
        yaw = blade / 5.0 * math.tau + rng.uniform(-0.35, 0.35)
        height = rng.uniform(0.25, 0.50)
        width0 = rng.uniform(0.045, 0.070)
        bend = rng.uniform(0.10, 0.24)
        ox, oz = math.cos(yaw) * 0.05, math.sin(yaw) * 0.05
        dx, dz = math.cos(yaw), math.sin(yaw)
        segments = 4
        prev: tuple[hou.Point, hou.Point] | None = None
        for i in range(segments + 1):
            t = i / segments
            along = bend * t * t
            cx, cy, cz = ox + dx * along, height * t, oz + dz * along
            half = width0 * (1.0 - 0.8 * t) / 2.0
            px, pz = -dz * half, dx * half
            shade = 0.85 + 0.15 * t
            color = mix3(root, tip, t)
            color = (color[0] * shade, color[1] * shade, color[2] * shade)
            left = geometry.createPoint()
            left.setPosition((cx - px, cy, cz - pz))
            left.setAttribValue("Cd", color)
            right = geometry.createPoint()
            right.setPosition((cx + px, cy, cz + pz))
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


def plan_grass_clumps(layout: HeartvaleLayout) -> list[tuple[float, float, float, float, int]]:
    """T2 runtime grass plan: noise-driven patchiness (dense meadows, bald
    patches, sparse verges), per-clump scale/rotation/variant, density falloff
    near roads/water. Rows: [x, z, scale, yaw, variant] (variant 0 dry 1 lush).
    Coordinates are soulwell-local meters — the runtime adds the plate offset."""
    field = layout.field
    assert field is not None
    rng = random.Random(layout.seed ^ 0x6A455)
    anwel = layout.anchors["anwel"]["world"]

    clumps: list[tuple[float, float, float, float, int]] = []
    bands = (
        # (center x, z, inner r, outer r, spacing)
        (0.0, 0.0, 0.0, 130.0, 0.9),        # soulwell meadow, dense
        (0.0, 0.0, 130.0, 330.0, 2.2),      # soulwell far ring
        (anwel["x"], anwel["z"], 0.0, 120.0, 1.0),   # around Anwel
        (anwel["x"], anwel["z"], 120.0, 300.0, 2.4),
    )
    for cx, cz, inner, outer, spacing in bands:
        gx = cx - outer
        while gx < cx + outer:
            gz = cz - outer
            while gz < cz + outer:
                gz += spacing
                x = gx + rng.uniform(-0.4, 0.4) * spacing
                z = gz + rng.uniform(-0.4, 0.4) * spacing
                r = math.hypot(x - cx, z - cz)
                if r < inner or r >= outer:
                    continue
                if math.hypot(x, z) < 11.6:
                    continue
                if math.hypot(x - (anwel["x"] + 7.0), z - (anwel["z"] - 0.5)) < 14.0:
                    continue
                d_river = layout.river_distance(x, z)
                d_road = layout.road_distance(x, z)
                if d_river < 2.8 or d_road < 2.1:
                    continue
                # patchiness: meadow clumping noise — bald patches stay bald
                patch = fbm(x * 0.03, z * 0.03, layout.seed ^ 0xBEEF, 3)
                if patch < -0.12 and rng.random() > 0.15:
                    continue
                # density falloff near roads/water: trampled verges, wet margins
                if d_road < 4.0 and rng.random() < 0.5 * (1.0 - smoothstep(2.1, 4.0, d_road)):
                    continue
                if d_river < 6.0 and rng.random() < 0.45 * (1.0 - smoothstep(2.8, 6.0, d_river)):
                    continue
                moisture = field.moisture_at(x, z)
                variant = 1 if moisture > -0.05 else 0
                clumps.append((
                    round(x, 2), round(z, 2),
                    round(rng.uniform(0.7, 1.45), 2),
                    round(rng.uniform(0.0, math.tau), 2),
                    variant,
                ))
            gx += spacing
    return clumps


def build_grass_field(grass_node: hou.Node, layout: HeartvaleLayout, clumps: list[tuple[float, float, float, float, int]]) -> int:
    """Blockout grass: clump cards on the near-field subset of the runtime plan
    (the full plan ships to the runtime in scatter.json)."""
    anwel = layout.anchors["anwel"]["world"]
    copies: list[hou.Node] = []
    total = 0
    for want_variant, label, root, tip in (
        (1, "LUSH", GRASS_ROOT, GRASS_TIP),
        (0, "DRY", DRY_ROOT, DRY_TIP),
    ):
        points_geo = hou.Geometry()
        points_geo.addAttrib(hou.attribType.Point, "pscale", 1.0)
        points_geo.addAttrib(hou.attribType.Point, "orient", (0.0, 0.0, 0.0, 1.0))
        placed = 0
        for x, z, scale, yaw, variant in clumps:
            if variant != want_variant:
                continue
            if math.hypot(x, z) > 70.0 and math.hypot(x - anwel["x"], z - anwel["z"]) > 70.0:
                continue  # near-field only in the blockout scene
            point = points_geo.createPoint()
            point.setPosition((x, layout.terrain_height(x, z) + 0.005, z))
            q_yaw = (0.0, math.sin(yaw / 2.0), 0.0, math.cos(yaw / 2.0))
            tilt = (hash((int(x * 10), int(z * 10))) % 100) / 100.0 * 0.22
            q_tilt = (math.sin(tilt / 2.0), 0.0, 0.0, math.cos(tilt / 2.0))
            point.setAttribValue("orient", _quat_mul(q_yaw, q_tilt))
            point.setAttribValue("pscale", scale)
            placed += 1
        if placed == 0:
            continue
        proto_stash = grass_node.createNode("stash", f"CLUMP_PROTO_{label}")
        proto_stash.parm("stash").set(_clump_prototype(root, tip))
        points_stash = grass_node.createNode("stash", f"CLUMP_POINTS_{label}")
        points_stash.parm("stash").set(points_geo)
        copy = grass_node.createNode("copytopoints", f"COPY_CLUMPS_{label}")
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


def _ph_load(ph_node: hou.Node, ph_root: Path, aid: str, label: str, use_lod: bool = True) -> hou.Node:
    """Load an asset: cached polyreduced prototype (.bgeo.sc) when available,
    else the live glTF (unpack needed). LOD caches come from
    reduce-polyhaven-assets.py."""
    lod = ph_root / aid / f"{aid}_lod.bgeo.sc"
    file_node = ph_node.createNode("file", f"PHFILE_{label}")
    if use_lod and lod.is_file():
        file_node.parm("file").set(f"{POLYHAVEN_DIR}/{aid}/{aid}_lod.bgeo.sc")
        return file_node  # plain polygons already, no unpack needed
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
              yaw: float = 0.0, hook: bool = False, use_lod: bool = True) -> hou.Node:
    """Load, height-normalize, and place one asset. hook=True hangs the asset's
    top at `ground` (used for door lanterns); otherwise its base sits on ground."""
    unpack = _ph_load(ph_node, ph_root, aid, label, use_lod)
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
                aid: str, label: str, spots: list[tuple[float, float, float]], target_height: float,
                use_lod: bool = True, sink: float = 0.0) -> hou.Node:
    """Copy a height-normalized asset onto Python-scattered points (pscale per point)."""
    unpack = _ph_load(ph_node, ph_root, aid, label, use_lod)
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
        point.setPosition((x, layout.terrain_height(x, z) - sink * pscale, z))
        point.setAttribValue("pscale", pscale)
    stash = ph_node.createNode("stash", f"PHPOINTS_{label}")
    stash.parm("stash").set(points_geo)

    copy = ph_node.createNode("copytopoints", f"PHCOPY_{label}")
    copy.setInput(0, xf)
    copy.setInput(1, stash)
    return _ph_assign(ph_node, copy, matnet, ph_root, aid, label)


def build_polyhaven(ph_node: hou.Node, layout: HeartvaleLayout, ph_root: Path, planned: dict[str, Any]) -> dict[str, int]:
    """CC0 Poly Haven dressing: the living layer of the zone.

    Everything scatters REAL assets — trees, shrubs, boulders, grass tufts,
    ferns, flowers, forest-floor debris, village props — over the position
    plans from scatter_vegetation() plus authored garden/village spots.
    Heavy assets use polyreduced .bgeo.sc prototypes (reduce-polyhaven-assets.py);
    only the two spawn-area hero trees reference the full LOD0 glTFs."""
    matnet = hou.node("/mat")
    rng = random.Random(layout.seed ^ 0x9A17)
    anchor = layout.anchors["anwel"]["world"]
    ax, az = anchor["x"], anchor["z"]
    plaza = (ax + 7.0, az - 0.5)

    def gy(x: float, z: float) -> float:
        return layout.terrain_height(x, z)

    counts = {"props": 0, "grassClumps": 0, "bushes": 0, "heroTrees": 0,
              "phTrees": 0, "phRocks": 0, "phPlants": 0, "phDebris": 0}
    outs: list[hou.Node] = []

    def scatter(aid: str, label: str, spots: list[tuple[float, float, float]], target_height: float, counter: str, use_lod: bool = True, sink: float = 0.0) -> None:
        if not spots:
            return
        outs.append(_ph_scatter(ph_node, matnet, ph_root, layout, aid, label, spots, target_height, use_lod, sink))
        counts[counter] += len(spots)

    def place(aid: str, label: str, x: float, z: float, target_height: float, yaw: float = 0.0,
              hook: bool = False, use_lod: bool = True, sink: float = 0.0, counter: str = "props") -> None:
        outs.append(_ph_place(ph_node, matnet, ph_root, aid, label, x, z, gy(x, z) - sink,
                              target_height, yaw, hook, use_lod))
        counts[counter] += 1

    # --- Trees: real CC0 geometry at near-field planned positions --------------
    # The section plan holds ~850 trees; the Houdini blockout only instances
    # trunks within 320 m of the Soul Well or Anwel (viewport weight) — the
    # FULL plan ships to the runtime in scatter.json, which instanced-meshes it.
    species_assets = {"oak": ("tree_small_02", 6.0), "birch": ("island_tree_03", 5.5), "willow": ("island_tree_01", 7.0)}
    tree_spots: dict[str, list[tuple[float, float, float]]] = {aid: [] for aid, _ in species_assets.values()}
    tree_spots["island_tree_02"] = []
    for x, _gy, z, species, ps in planned["treePositions"]:
        if math.hypot(x, z) > 320.0 and math.hypot(x - ax, z - az) > 320.0:
            continue  # far-field: runtime-only
        aid, base = species_assets[species]
        if species == "oak" and rng.random() < 0.22:
            aid, base = "island_tree_02", 6.0
        tree_spots[aid].append((x, z, ps))
    for aid, base in list(species_assets.values()) + [("island_tree_02", 6.0)]:
        scatter(aid, f"TREES_{aid.upper()}", tree_spots[aid], base, "phTrees", sink=0.10)

    # Two full-LOD0 hero trees right where the player wakes and first walks
    for aid, label, x, z, height, yaw in (
        ("tree_small_02", "HERO_TREE_TERRACE", 6.5, -6.0, 8.0, 25.0),
        ("island_tree_02", "HERO_TREE_RIVER", ax - 4.5, az + 8.5, 7.5, 160.0),
    ):
        outs.append(_ph_place(ph_node, matnet, ph_root, aid, label, x, z, gy(x, z) - 0.12, height, yaw=yaw, use_lod=False))
        counts["heroTrees"] += 1

    # --- Tree-base blending (T1): the GROUND changes under trees --------------
    # No geometry discs — the forest-floor splat channel (painted in
    # HeightField.build_splat around every planned trunk) carries the blend.
    # Geometry side: trunks sunk 10 cm (above) + litter/twig props and a grass
    # tuft leaning against about half the trunks.
    base_tufts: list[tuple[float, float, float]] = []
    for x, _gy, z, _species, ps in planned["treePositions"]:
        if math.hypot(x, z) > 320.0 and math.hypot(x - ax, z - az) > 320.0:
            continue
        if rng.random() < 0.5:
            ang = rng.uniform(0.0, math.tau)
            dist = rng.uniform(0.7, 1.3) * ps
            base_tufts.append((x + math.cos(ang) * dist, z + math.sin(ang) * dist, rng.uniform(0.8, 1.3)))
    scatter("grass_medium_01", "TREE_BASE_TUFTS", base_tufts, 0.20, "grassClumps")

    # --- Shrubs ------------------------------------------------------------------
    shrub_assets = [("shrub_01", 0.55), ("shrub_02", 1.15), ("shrub_03", 0.50), ("wild_rooibos_bush", 0.70)]
    shrub_spots: dict[str, list[tuple[float, float, float]]] = {aid: [] for aid, _ in shrub_assets}
    for x, _gy, z, variant, ps in planned["shrubPositions"]:
        aid, _base = shrub_assets[variant]
        shrub_spots[aid].append((x, z, ps))
    for aid, base in shrub_assets:
        scatter(aid, f"SHRUBS_{aid.upper()}", shrub_spots[aid], base, "bushes")

    # --- Rocks: real boulders and stones instead of octahedra --------------------
    boulder_spots: list[tuple[float, float, float]] = []
    stone_spots: list[tuple[float, float, float]] = []
    for x, _gy, z, radius in planned["rockPositions"]:
        if radius < 0.65:
            stone_spots.append((x, z, radius * 8.0))
        else:
            boulder_spots.append((x, z, radius))
    scatter("boulder_01", "ROCKS_BOULDER", boulder_spots, 1.0, "phRocks")
    scatter("stone_01", "ROCKS_STONE", stone_spots, 0.10, "phRocks")

    # Mossy outcrops at scenic fixed spots (riverbend, terrace base, treeline foot)
    for index, (x, z) in enumerate(((-8.0, -40.0), (14.0, 20.0), (-16.0, 8.0), (24.0, -48.0), (-6.0, -64.0), (30.0, 60.0))):
        aid = "rock_moss_set_01" if index % 2 == 0 else "rock_moss_set_02"
        place(aid, f"OUTCROP_{index}", x, z, 1.5, yaw=rng.uniform(0.0, 360.0), sink=0.35, counter="phRocks")

    # --- Riverbank sedges become real grass tufts --------------------------------
    scatter("grass_medium_02", "SEDGE_BANKS", [(x, z, ps) for x, _gy, z, ps in planned["sedgePositions"]], 0.50, "grassClumps")

    # --- Mass grass cover: tuft patches across the vale (near-field blockout) --
    vale_grass: list[tuple[float, float, float]] = []
    attempts = 0
    while len(vale_grass) < 700 and attempts < 12000:
        attempts += 1
        if rng.random() < 0.55:
            ang, rad = rng.uniform(0.0, math.tau), rng.uniform(13.0, 260.0)
            x, z = math.cos(ang) * rad, math.sin(ang) * rad
        else:
            ang, rad = rng.uniform(0.0, math.tau), rng.uniform(14.0, 220.0)
            x, z = ax + math.cos(ang) * rad, az + math.sin(ang) * rad
        if math.hypot(x - plaza[0], z - plaza[1]) < 14.0:
            continue
        if layout.river_distance(x, z) < 3.0 or layout.road_distance(x, z) < 2.4:
            continue
        vale_grass.append((x, z, rng.uniform(1.0, 1.8)))
    scatter("grass_medium_01", "GRASS_VALE", vale_grass, 0.22, "grassClumps")

    # --- Forest-floor life: ferns, moss, flowers, stumps, fallen logs ------------
    tree_xz = [(x, z) for x, _gy, z, _s, _p in planned["treePositions"]]

    def near_trees(count: int, dmin: float, dmax: float, smin: float, smax: float) -> list[tuple[float, float, float]]:
        spots: list[tuple[float, float, float]] = []
        tries = 0
        while len(spots) < count and tries < count * 30 and tree_xz:
            tries += 1
            tx, tz = tree_xz[rng.randrange(len(tree_xz))]
            ang = rng.uniform(0.0, math.tau)
            dist = rng.uniform(dmin, dmax)
            x, z = tx + math.cos(ang) * dist, tz + math.sin(ang) * dist
            if layout.river_distance(x, z) < 2.6 or layout.road_distance(x, z) < 1.6:
                continue
            spots.append((x, z, rng.uniform(smin, smax)))
        return spots

    scatter("fern_02", "FERNS", near_trees(30, 1.5, 6.0, 1.0, 1.8), 0.43, "phPlants")
    scatter("moss_01", "MOSS", near_trees(16, 0.8, 1.8, 6.0, 12.0), 0.05, "phPlants")
    scatter("tree_stump_01", "STUMPS", near_trees(8, 3.0, 7.0, 1.2, 2.0), 0.57, "phDebris")
    scatter("dry_branches_medium_01", "BRANCHES", near_trees(10, 2.0, 6.0, 1.0, 1.8), 0.34, "phDebris")

    log_spots = near_trees(6, 3.0, 8.0, 1.5, 2.5)
    for index, (x, z, ps) in enumerate(log_spots):
        place("dead_tree_trunk", f"FALLEN_LOG_{index}", x, z, 0.30 * ps, yaw=rng.uniform(0.0, 360.0), counter="phDebris")

    # Wildflowers: roadsides and the moth meadow
    flower_spots: list[tuple[float, float, float]] = []
    tries = 0
    while len(flower_spots) < 26 and tries < 800:
        tries += 1
        x = rng.uniform(-45.0, 45.0)
        z = rng.uniform(-45.0, 45.0)
        d_road = layout.road_distance(x, z)
        if 2.3 < d_road < 4.5 and layout.river_distance(x, z) > 3.0:
            flower_spots.append((x, z, rng.uniform(1.0, 1.8)))
    mx, mz = -17.5, -11.4  # moth meadow, just NW of the terrace (local meters)
    for _ in range(8):
        ang = rng.uniform(0.0, math.tau)
        r = rng.uniform(2.0, 8.0)
        flower_spots.append((mx + math.cos(ang) * r, mz + math.sin(ang) * r, rng.uniform(1.0, 1.8)))
    scatter("celandine_01", "FLOWERS", flower_spots, 0.19, "phPlants")

    # --- Village: lane props, door lanterns, garden plots ------------------------
    place("wooden_barrels_01", "BARRELS_DOCK", ax - 2.3, az - 1.6, 0.95, yaw=15.0)
    place("wooden_barrels_01", "BARRELS_BARN", ax + 12.9, az - 8.2, 0.95, yaw=40.0)
    place("wooden_crate_01", "CRATE_DOCK_A", ax - 3.5, az + 1.6, 0.50, yaw=70.0)
    place("wooden_crate_01", "CRATE_DOCK_B", ax - 3.1, az + 2.3, 0.50, yaw=20.0)
    place("wooden_crate_01", "CRATE_BARN_A", ax + 9.2, az - 8.7, 0.55, yaw=0.0)
    place("wooden_crate_01", "CRATE_BARN_B", ax + 10.0, az - 8.0, 0.50, yaw=55.0)
    place("wooden_crate_02", "CRATE2_DOCK", ax - 3.8, az + 0.9, 0.46, yaw=25.0)
    place("wooden_crate_02", "CRATE2_BARN", ax + 9.7, az - 9.3, 0.46, yaw=100.0)
    place("wine_barrel_01", "WINE_DOCK", ax - 2.6, az + 2.2, 0.87, yaw=5.0)
    place("wine_barrel_01", "WINE_BARN", ax + 11.8, az - 6.9, 0.87, yaw=75.0)
    place("wine_barrel_01", "WINE_REEVE", ax + 12.9, az + 3.1, 0.87, yaw=140.0)
    place("wooden_bucket_01", "BUCKET_WELL_A", plaza[0] - 0.8, plaza[1] + 0.7, 0.50, yaw=10.0)
    place("wooden_bucket_01", "BUCKET_WELL_B", plaza[0] + 0.9, plaza[1] - 0.7, 0.50, yaw=130.0)

    # Door lanterns — hung beside each house door at 2.0 m (doors face the green)
    houses = ((13.8, 4.2, 5.4), (6.2, 6.4, 3.6), (1.8, 4.6, 2.8), (15.0, -2.2, 3.2), (10.8, -7.6, 4.4), (5.4, -8.2, 3.4))
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

    # Gardens: planter boxes + soft planting inside each fenced plot
    gardens = ((13.8, 8.8, 4.5, 3.0), (9.8, 6.9, 3.5, 2.6), (5.4, -11.8, 4.0, 3.0), (18.2, -2.2, 3.2, 3.2))
    for index, (gcx, gcz, gw, gd) in enumerate(gardens):
        cx, cz = ax + gcx, az + gcz
        place("planter_box_01", f"PLANTER_{index}_A", cx - gw * 0.22, cz - gd * 0.18, 0.42, yaw=rng.uniform(-8.0, 8.0))
        place("planter_box_01", f"PLANTER_{index}_B", cx + gw * 0.22, cz + gd * 0.18, 0.42, yaw=90.0 + rng.uniform(-8.0, 8.0))
        bed_spots = [
            (cx + rng.uniform(-0.4, 0.4) * gw, cz + rng.uniform(-0.4, 0.4) * gd, rng.uniform(0.7, 1.0)),
            (cx + rng.uniform(-0.4, 0.4) * gw, cz + rng.uniform(-0.4, 0.4) * gd, rng.uniform(0.7, 1.0)),
        ]
        scatter("grass_medium_01", f"GARDEN_GRASS_{index}", bed_spots, 0.20, "grassClumps")
        scatter("celandine_01", f"GARDEN_FLOWERS_{index}",
                [(cx + rng.uniform(-0.35, 0.35) * gw, cz + rng.uniform(-0.35, 0.35) * gd, rng.uniform(0.8, 1.2))],
                0.19, "phPlants")
        scatter("shrub_03", f"GARDEN_BUSH_{index}",
                [(cx - gw * 0.30, cz + gd * 0.30, rng.uniform(0.8, 1.1))], 0.50, "bushes")

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
    # id, local x, local z (soulwell-relative meters; Anwel now at z ≈ -207),
    # facing yaw (deg), tunic color
    ("mira-eddlestone", 4.6, -205.7, 200.0, (0.30, 0.42, 0.22)),
    ("dockmaster-pell", -2.4, -206.4, 90.0, (0.18, 0.26, 0.38)),
    ("fletcher-anes", 6.0, -202.4, 170.0, (0.38, 0.27, 0.16)),
    ("herder-bonn", 3.2, -212.3, 20.0, (0.45, 0.35, 0.16)),
    ("cael-roadwarden", 1.2, -211.0, 0.0, (0.28, 0.32, 0.38)),
    ("wellkeeper-sef", 2.6, 2.2, 220.0, (0.16, 0.40, 0.38)),
    ("reeve-droma", 12.6, -204.4, 250.0, (0.42, 0.18, 0.20)),
    ("scavenger-ils", -3.4, -209.4, 60.0, (0.32, 0.32, 0.30)),
    ("old-fen", -3.0, -208.2, 120.0, (0.24, 0.38, 0.30)),
    ("shepherdess-rill", 1.0, 8.0, 180.0, (0.55, 0.50, 0.38)),
    ("sergeant-hull", 2.2, 12.5, 180.0, (0.36, 0.38, 0.42)),
    ("brother-owyn", 2.0, -211.7, 10.0, (0.60, 0.57, 0.50)),
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
    # Zone review: frame hv-1 + Anwel (the vertical slice) from the SW sky.
    slice_center = (60.0, -80.0)
    _ortho_camera(obj, "ISO_ZONE_CAMERA", (slice_center[0] - 620.0, 760.0, slice_center[1] + 620.0), (slice_center[0], 0.0, slice_center[1]), 1450.0)

    def eye(x: float, z: float, above: float = 1.7) -> Vector3:
        return (x, layout.terrain_height(x, z) + above, z)

    # Ground-level perspective shots — the player's actual first impressions.
    terrace_eye = (5.8, 3.9, -8.8)  # east side of the terrace, clear of the Breach arch
    ground = _persp_camera(obj, "GROUND_TERRACE_CAMERA", terrace_eye, (-1.5, 1.7, 7.5), 32.0)
    anwel = layout.anchors["anwel"]["world"]
    plaza = (anwel["x"] + 7.0, anwel["z"] - 0.5)
    _persp_camera(obj, "ANWEL_STREET_CAMERA", eye(anwel["x"] - 4.0, anwel["z"] - 15.0, 7.0), (plaza[0], layout.terrain_height(*plaza) + 1.2, plaza[1] - 0.5), 36.0)
    # Riverbank shot: on the Anwel run just south of the terrace.
    river_samples = dict(layout.rivers).get("anwel-run", layout.rivers[0][1])
    bank_x, bank_z = min(river_samples, key=lambda s: math.hypot(s[0] - 0.0, s[1] - 60.0))
    _persp_camera(obj, "RIVER_BANK_CAMERA", eye(bank_x - 12.0, bank_z + 9.0), (bank_x + 4.0, layout.terrain_height(bank_x + 4.0, bank_z - 6.0) + 0.6, bank_z - 6.0), 40.0)
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


def export_portable(outdir: Path, layout: HeartvaleLayout, planned: dict, clumps: list, village: dict) -> dict:
    """Engine-agnostic exports, soulwell-local meters (runtime adds plateOffset):
    float32 heightmap, 7-channel uint8 splat WEIGHTS (feathered blends, T1/T3),
    meta, and the data-authored scatter/village/npc JSON. Mirrored into
    public/data/zones/heartvale/ so the Three.js runtime reads the same truth."""
    field = layout.field
    assert field is not None and field.weights is not None and field.tint is not None
    outdir.mkdir(parents=True, exist_ok=True)
    nx, nz = len(field.xs), len(field.zs)

    height_path = outdir / "heartvale-heightmap-f32.raw"
    field.H.astype("<f4").tofile(height_path)
    splat_path = outdir / "heartvale-splat-weights-u8.raw"
    weights_u8 = np.clip(np.round(field.weights * 255.0), 0, 255).astype(np.uint8)
    weights_u8.tofile(splat_path)  # channel-major: C × nz × nx
    tint_path = outdir / "heartvale-tint-u8.raw"
    np.clip(np.round(field.tint * 255.0), 0, 255).astype(np.uint8).tofile(tint_path)

    meta = {
        "schemaVersion": 3,
        "frame": "soulwell-local meters (+X east, +Z south); add plateOffset for plate-world meters",
        "plateOffset": [layout.origin_plate[0], layout.origin_plate[1]],
        "plateFrame": "origin = M-003 plate top-left, +x east, +z south, meters; 1 cell = 1500 m",
        "originLocal": [field.x0, field.z0],
        "samples": {"x": nx, "z": nz},
        "metersPerSample": field.step,
        "heightmap": {"file": height_path.name, "dtype": "float32-le", "units": "meters", "order": "row-major (+Z rows)"},
        "splat": {
            "file": splat_path.name,
            "dtype": "uint8",
            "order": "channel-major, each channel row-major nz×nx",
            "channels": SPLAT_CHANNELS,
        },
        "tint": {"file": tint_path.name, "dtype": "uint8-rgb", "order": "channel-major rgb planes nz×nx"},
        "zones": layout.zones,
        "engines": {
            "threejs": "GridDisplace with heightmap; ShaderMaterial splat-blends the 7 channel textures; scatter.json drives InstancedMesh vegetation.",
            "unreal": "Landscape import: convert heightmap to 16-bit PNG; splat channels -> Landscape Layer weights.",
            "unity": "TerrainData.SetHeights; splat channels -> TerrainLayer alphamaps.",
        },
    }
    meta_path = outdir / "heartvale-terrain-export.json"
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", "utf8")

    def local_to_plate(x: float, z: float) -> list[float]:
        return [round(x + layout.origin_plate[0], 2), round(z + layout.origin_plate[1], 2)]

    scatter = {
        "schemaVersion": 2,
        "frame": meta["frame"],
        "assets": {
            "trees": {"oak": "tree_small_02", "birch": "island_tree_03", "willow": "island_tree_01", "oakAlt": "island_tree_02"},
            "shrubs": ["shrub_01", "shrub_02", "shrub_03", "wild_rooibos_bush"],
            "rocks": {"boulder": "boulder_01", "stone": "stone_01"},
            "sedge": "grass_medium_02",
            "grassTuft": "grass_medium_01",
        },
        "trees": [[round(x, 2), round(z, 2), species, round(ps, 2)] for x, _gy, z, species, ps in planned["treePositions"]],
        "shrubs": [[round(x, 2), round(z, 2), variant, round(ps, 2)] for x, _gy, z, variant, ps in planned["shrubPositions"]],
        "rocks": [[round(x, 2), round(z, 2), round(radius, 2)] for x, _gy, z, radius in planned["rockPositions"]],
        "sedges": [[round(x, 2), round(z, 2), round(ps, 2)] for x, _gy, z, ps in planned["sedgePositions"]],
        "grassClumps": [list(row) for row in clumps],
    }
    scatter_path = outdir / "heartvale-scatter.json"
    scatter_path.write_text(json.dumps(scatter, separators=(",", ":")) + "\n", "utf8")

    village_path = outdir / "heartvale-village.json"
    village_path.write_text(json.dumps({"schemaVersion": 2, "frame": meta["frame"], **village}, indent=2) + "\n", "utf8")

    npcs_path = outdir / "heartvale-npcs.json"
    npcs_path.write_text(json.dumps({
        "schemaVersion": 2,
        "frame": meta["frame"],
        "npcs": [
            {"id": npc_id, "x": x, "z": z, "yawDeg": yaw, "tunic": list(tunic)}
            for npc_id, x, z, yaw, tunic in NPC_PLACEMENTS
        ],
    }, indent=2) + "\n", "utf8")

    outputs = {
        "heightmap": height_path, "splat": splat_path, "tint": tint_path, "meta": meta_path,
        "scatter": scatter_path, "village": village_path, "npcs": npcs_path,
    }
    runtime_dir = Path(__file__).resolve().parents[2] / "public" / "data" / "zones" / "heartvale"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    mirrored: list[str] = []
    for path in outputs.values():
        target = runtime_dir / path.name
        target.write_bytes(path.read_bytes())
        mirrored.append(target.as_posix())
    return {key: path.as_posix() for key, path in outputs.items()} | {"runtimeMirror": mirrored}


def main() -> None:
    args = parse_args()
    license_category = hou.licenseCategory().name()
    payload = json.loads(args.layout.read_text(encoding="utf-8"))
    layout = HeartvaleLayout(payload)
    args.hip.parent.mkdir(parents=True, exist_ok=True)
    args.outdir.mkdir(parents=True, exist_ok=True)

    # Field phase 1 (heights/distances) → vegetation plan (needs heights) →
    # field phase 2 (splat weights incl. forest floor under planned trunks).
    field = HeightField(layout)
    layout.attach_field(field)
    planned = scatter_vegetation(GeometryBuilder(), layout)
    field.build_splat(layout, [(x, z) for x, _gy, z, _s, _p in planned["treePositions"]])
    grass_clumps = plan_grass_clumps(layout)

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
    build_terrain(builder, layout)
    build_water(builder, layout)
    build_sky(builder)
    build_terrace(builder, layout)
    village = build_anwel(builder, layout)
    counts: dict[str, Any] = {
        "trees": planned["trees"], "shrubs": planned["shrubs"], "rocks": planned["rocks"],
        "reeds": planned["reeds"], "grassClumpsPlanned": len(grass_clumps),
    }

    grass_node = obj.createNode("geo", "HEARTVALE_GRASS_FIELD")
    for child in grass_node.children():
        child.destroy()
    counts["grassClumpInstances"] = build_grass_field(grass_node, layout, grass_clumps)

    ph_node = obj.createNode("geo", "HEARTVALE_POLYHAVEN")
    for child in ph_node.children():
        child.destroy()
    ph_root = args.hip.resolve().parent.parent / "polyhaven"
    counts.update(build_polyhaven(ph_node, layout, ph_root, planned))

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
    # OBJ handoff is a temp artifact (never committed) — full scene, terrain
    # included; engines should prefer the heightmap/splat exports for terrain.
    obj_path = args.outdir / "heartvale-realistic-environment.obj"
    normal.geometry().saveToFile(obj_path.as_posix())

    create_lighting(obj)
    create_cameras(obj, layout)
    renders = create_review_renders(hou.node("/out"), args.outdir)

    metadata = obj.createNode("null", "HEARTVALE_REALISTIC_METADATA")
    metadata.setUserData("souldrifter_seed", str(payload["seed"]))
    metadata.setUserData("souldrifter_source", payload["source"])
    metadata.setUserData("souldrifter_license", license_category)
    metadata.setUserData("souldrifter_scale", json.dumps(payload["scale"], separators=(",", ":")))
    metadata.setUserData("souldrifter_portability", "heightmap+splat-weights+scatter/village/npc json+obj; see heartvale-terrain-export.json")

    obj.layoutChildren()
    environment.layoutChildren()
    hou.hipFile.save(args.hip.resolve().as_posix())

    portable = export_portable(args.outdir, layout, planned, grass_clumps, village)
    # Headless OpenGL can segfault mid-batch (Vulkan driver); stills are rendered
    # one process per camera via scripts/houdini/render-heartvale-still.py.
    render_results = [{**entry, "status": "pending: render via render-heartvale-still.py"} for entry in renders]

    print(json.dumps({
        "houdiniVersion": hou.applicationVersionString(),
        "license": license_category,
        "seed": payload["seed"],
        "frame": payload["scale"]["frame"],
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
