#!/usr/bin/env hython
"""BREACH-V2 interior build — Houdini Apprentice scene from a run layout.

  hython scripts/houdini/build-breach-v2-apprentice.py <layout.json> <out.hipnc> <out.obj> <game-root> [workspace-root]

One continuous shell per runbook §5: floors + perimeter walls with real door
gaps + corridor shells, PBR flagstone/masonry (world-scale UVs — no visible
gameplay cells), the dungeon kit placed from the layout JSON (authored legal
sockets only), custom landmarks (true Soul Well pool, true Memory Loom,
training effigy, trial doors, First Memory), wall-art frames (runbook §5A),
corruption accents by room level, review cameras + lights.

Apprentice = prototype/review only (non-commercial; shipping needs the
approved licensed export path). Three.js remains the runtime.
"""

import argparse
import base64
import json
import math
import os
import struct
import sys
from pathlib import Path

import hou

Color = tuple[float, float, float]
MATERIALS: dict[str, str] = {}

WALL_H = 3.2
WALL_H_GRAND = 4.0   # vestibule machine-temple
WALL_H_BOSS = 4.5
WALL_T = 0.5
FLOOR_T = 0.3
DOOR_LINTEL_H = 2.6  # opening clear height


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("layout", type=Path)
    parser.add_argument("hip", type=Path)
    parser.add_argument("obj", type=Path)
    parser.add_argument("game_root", type=Path)
    parser.add_argument("workspace_root", type=Path, nargs="?", default=None)
    return parser.parse_args()


def safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in value)


def hash_yaw(text: str) -> float:
    h = 2166136261
    for ch in text:
        h = (h ^ ord(ch)) * 16777619 % (2 ** 32)
    return float(h % 8) * 45.0


# ---------------------------------------------------------------------------
# GLB texture extraction + kit materials (mechanics proven in #450)
# ---------------------------------------------------------------------------
def extract_glb_texture(source_path: Path, slot: str, destination: Path) -> Path | None:
    data = source_path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        return None
    _, version, total_length = struct.unpack_from("<4sII", data, 0)
    if version != 2 or total_length > len(data):
        raise RuntimeError(f"Unsupported GLB header in {source_path}")
    document = None
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
    texture_ref = (
        material.get("pbrMetallicRoughness", {}).get(slot)
        if slot in ("baseColorTexture", "metallicRoughnessTexture")
        else material.get(slot)
    )
    if not texture_ref:
        return None
    texture = document["textures"][int(texture_ref["index"])]
    image = document["images"][int(texture["source"])]
    if "bufferView" in image:
        view = document["bufferViews"][int(image["bufferView"])]
        start = int(view.get("byteOffset", 0))
        image_bytes = binary_chunk[start:start + int(view["byteLength"])]
    else:
        uri = str(image.get("uri", ""))
        if uri.startswith("data:"):
            image_bytes = base64.b64decode(uri.split(",", 1)[1])
        elif uri:
            return (source_path.parent / uri).resolve()
        else:
            return None
    mime = str(image.get("mimeType", "image/jpeg"))
    ext = ".png" if mime == "image/png" else ".webp" if mime == "image/webp" else ".jpg"
    out = destination.with_suffix(ext)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.is_file() or out.read_bytes() != image_bytes:
        out.write_bytes(image_bytes)
    return out.resolve()


def principled(name: str, color: Color, roughness: float, metallic: float = 0.0,
               emissive: Color | None = None, emissive_intensity: float = 0.0) -> str:
    if name in MATERIALS:
        return MATERIALS[name]
    mat_net = hou.node("/mat") or hou.node("/").createNode("matnet", "mat")
    existing = mat_net.node(name)
    if existing:
        existing.destroy()
    mat = mat_net.createNode("principledshader::2.0", name)
    mat.parmTuple("basecolor").set(color)
    mat.parm("rough").set(roughness)
    mat.parm("metallic").set(metallic)
    if emissive is not None:
        mat.parm("emitcolor_usePointColor").set(0)
        mat.parmTuple("emitcolor").set(emissive)
        mat.parm("emitint").set(emissive_intensity)
    MATERIALS[name] = mat.path()
    return mat.path()


def textured_material(name: str, color_map: Path, normal_map: Path | None,
                      rough_map: Path | None, ao_map: Path | None, hip_dir: Path) -> str:
    if name in MATERIALS:
        return MATERIALS[name]
    mat_net = hou.node("/mat") or hou.node("/").createNode("matnet", "mat")
    existing = mat_net.node(name)
    if existing:
        existing.destroy()
    mat = mat_net.createNode("principledshader::2.0", name)

    def rel(p: Path) -> str:
        return f"$HIP/{os.path.relpath(p, hip_dir).replace(os.sep, '/')}"

    mat.parm("basecolor_useTexture").set(1)
    mat.parm("basecolor_texture").set(rel(color_map))
    if normal_map and normal_map.is_file():
        mat.parm("baseBumpAndNormal_enable").set(1)
        mat.parm("baseBumpAndNormal_type").set("normal")
        mat.parm("baseNormal_useTexture").set(1)
        mat.parm("baseNormal_texture").set(rel(normal_map))
    if rough_map and rough_map.is_file():
        mat.parm("rough").set(1.0)
        mat.parm("rough_useTexture").set(1)
        mat.parm("rough_texture").set(rel(rough_map))
        mat.parm("rough_textureColorSpace").set("Raw")
    if ao_map and ao_map.is_file() and mat.parm("occlusion_texture"):
        mat.parm("occlusion_useTexture").set(1)
        mat.parm("occlusion_texture").set(rel(ao_map))
    MATERIALS[name] = mat.path()
    return mat.path()


def create_kit_material(asset_id: str, source_path: Path, texture_cache: Path) -> str:
    name = f"BV2_Kit_{safe_name(asset_id)}"
    if name in MATERIALS:
        return MATERIALS[name]
    mat_net = hou.node("/mat") or hou.node("/").createNode("matnet", "mat")
    existing = mat_net.node(name)
    if existing:
        existing.destroy()
    mat = mat_net.createNode("principledshader::2.0", name)
    mat.parmTuple("basecolor").set((0.74, 0.70, 0.62))
    mat.parm("rough").set(0.76)
    mat.parm("metallic").set(0.28 if any(t in asset_id for t in
                                         ("iron", "weapon", "armor", "chain", "cage",
                                          "portcullis", "brazier", "sconce", "candelabra")) else 0.04)
    base_color = extract_glb_texture(source_path, "baseColorTexture", texture_cache / f"{asset_id}-basecolor")
    if base_color:
        mat.parm("basecolor_useTexture").set(1)
        mat.parm("basecolor_texture").set(base_color.as_posix())
    normal = extract_glb_texture(source_path, "normalTexture", texture_cache / f"{asset_id}-normal")
    if normal:
        mat.parm("baseBumpAndNormal_enable").set(1)
        mat.parm("baseBumpAndNormal_type").set("normal")
        mat.parm("baseNormal_useTexture").set(1)
        mat.parm("baseNormal_texture").set(normal.as_posix())
    mr = extract_glb_texture(source_path, "metallicRoughnessTexture",
                             texture_cache / f"{asset_id}-metallic-roughness")
    if mr:
        # glTF combined map: G = roughness, B = metallic (preserve 1:1)
        mat.parm("rough").set(1.0)
        mat.parm("rough_useTexture").set(1)
        mat.parm("rough_texture").set(mr.as_posix())
        mat.parm("rough_monoChannel").set("2")
        mat.parm("rough_textureColorSpace").set("Raw")
        mat.parm("metallic").set(1.0)
        mat.parm("metallic_useTexture").set(1)
        mat.parm("metallic_texture").set(mr.as_posix())
        mat.parm("metallic_monoChannel").set("3")
        mat.parm("metallic_textureColorSpace").set("Raw")
    MATERIALS[name] = mat.path()
    return mat.path()


# ---------------------------------------------------------------------------
# Shell: continuous floors + walls with real door gaps (no visible cells)
# ---------------------------------------------------------------------------
def box_node(parent: "hou.Node", name: str, center: tuple[float, float, float],
             size: tuple[float, float, float]) -> "hou.Node":
    node = parent.createNode("box", safe_name(name))
    node.parmTuple("size").set(size)
    node.parmTuple("t").set(center)
    return node


def world_uv(parent: "hou.Node", name: str, axis: str, scale_m: float = 4.0) -> "hou.Node":
    """World-scale UVs via wrangle (no repeated cells: 1 texture repeat per scale_m)."""
    wr = parent.createNode("attribwrangle", safe_name(name))
    wr.parm("class").set("vertex")
    if axis == "y":  # floors: top faces read world x/z
        snippet = f"v@uv = set(v@P.x / {scale_m}, v@P.z / {scale_m}, 0);"
    elif axis == "x":  # walls running along Z: read z/y
        snippet = f"v@uv = set(v@P.z / {scale_m}, v@P.y / {scale_m}, 0);"
    else:  # walls running along X: read x/y
        snippet = f"v@uv = set(v@P.x / {scale_m}, v@P.y / {scale_m}, 0);"
    wr.parm("snippet").set(snippet)
    return wr


def build_shell(obj: "hou.Node", payload: dict, mat_floor: str, mat_wall: str) -> "hou.Node":
    shell = obj.createNode("geo", "BREACH_V2_SHELL")
    for child in shell.children():
        child.destroy()

    rooms = payload["rooms"]
    corridors = payload["corridors"]

    # ---- openings per room side ------------------------------------------------
    # side -> list of (center_along_m, width_m)
    openings: dict[tuple[str, str], list[tuple[float, float]]] = {}

    def side_of(room: dict, px: float, pz: float) -> str | None:
        tol = 0.75
        if abs(px - room["x"]) <= tol:
            return "W"
        if abs(px - (room["x"] + room["w"])) <= tol:
            return "E"
        if abs(pz - room["z"]) <= tol:
            return "N"
        if abs(pz - (room["z"] + room["h"])) <= tol:
            return "S"
        return None

    for corridor in corridors:
        pts = corridor["points"]
        width = min(corridor["width"], 3.2)
        for endpoint in (pts[0], pts[-1]):
            ex, ez = endpoint
            for room in rooms:
                side = side_of(room, ex, ez)
                if not side:
                    continue
                along = ex if side in ("N", "S") else ez
                base = room["x"] if side in ("N", "S") else room["z"]
                openings.setdefault((room["id"], side), []).append((along - base, width))

    # abutting fixed rooms (shared full walls need an arch opening)
    fixed = [r for r in rooms if r.get("fixed")]
    for a in fixed:
        for b in fixed:
            if a["id"] >= b["id"]:
                continue
            if abs(a["x"] + a["w"] - b["x"]) < 0.05:  # a west of b, shared vertical edge
                lo = max(a["z"], b["z"])
                hi = min(a["z"] + a["h"], b["z"] + b["h"])
                if hi - lo > 1.0:
                    width = min(hi - lo - 1.0, 4.0)
                    center = (lo + hi) / 2
                    openings.setdefault((a["id"], "E"), []).append((center - a["z"], width))
                    openings.setdefault((b["id"], "W"), []).append((center - b["z"], width))

    # ---- geometry streams ------------------------------------------------------
    floor_merge = shell.createNode("merge", "FLOOR_SLABS")
    wall_x_merge = shell.createNode("merge", "WALLS_ALONG_X")  # N/S walls (run along x)
    wall_z_merge = shell.createNode("merge", "WALLS_ALONG_Z")  # E/W walls (run along z)
    floor_idx = wall_x_idx = wall_z_idx = 0

    def wall_run(merge_node, idx, rid, cx, cz, sx, sz, h, tag):
        node = box_node(shell, f"wall_{rid}_{tag}", (cx, h / 2, cz), (sx, h, sz))
        merge_node.setInput(idx, node)
        return idx + 1

    for room in rooms:
        rx, rz, rw, rh = room["x"], room["z"], room["w"], room["h"]
        wall_h = WALL_H_BOSS if room["kind"] == "boss" else WALL_H_GRAND if room["kind"] == "start" else WALL_H
        # floor slab (top surface at y=0)
        slab = box_node(shell, f"floor_{room['id']}", (rx + rw / 2, -FLOOR_T / 2, rz + rh / 2),
                        (rw + WALL_T * 2, FLOOR_T, rh + WALL_T * 2))
        floor_merge.setInput(floor_idx, slab)
        floor_idx += 1

        # wall sides: (side, axis-along-x?, origin, length)
        sides = {
            "N": (True, rx - WALL_T, rz - WALL_T / 2, rw + 2 * WALL_T),
            "S": (True, rx - WALL_T, rz + rh + WALL_T / 2, rw + 2 * WALL_T),
            "W": (False, rx - WALL_T / 2, rz, rh),
            "E": (False, rx + rw + WALL_T / 2, rz, rh),
        }
        for side, (along_x, start_a, fixed_c, length) in sides.items():
            side_open = sorted(openings.get((room["id"], side), []))
            # clamp + merge openings
            spans: list[tuple[float, float]] = []
            for center, width in side_open:
                o0 = max(0.4, center - width / 2)
                o1 = min(length - 0.4, center + width / 2)
                if o1 > o0:
                    spans.append((o0, o1))
            cursor = 0.0
            seg = 0
            jitter_seed = f"{room['id']}:{side}"
            for o0, o1 in spans + [(length, length)]:
                if o0 - cursor > 0.1:
                    seg_len = o0 - cursor
                    mid = cursor + seg_len / 2
                    jitter = (hash_yaw(f"{jitter_seed}:{seg}") % 5) * 0.08
                    h = wall_h + jitter
                    if along_x:
                        wall_run(wall_x_merge, wall_x_idx, room["id"], start_a + mid, fixed_c,
                                 seg_len, WALL_T, h, f"{side}{seg}")
                        wall_x_idx += 1
                    else:
                        wall_run(wall_z_merge, wall_z_idx, room["id"], fixed_c, start_a + mid,
                                 WALL_T, seg_len, h, f"{side}{seg}")
                        wall_z_idx += 1
                    seg += 1
                if o0 < length:
                    # lintel above the opening
                    lw = o1 - o0
                    mid = (o0 + o1) / 2
                    lintel_h = wall_h - DOOR_LINTEL_H
                    if lintel_h > 0.05:
                        if along_x:
                            wall_run(wall_x_merge, wall_x_idx, room["id"], start_a + mid, fixed_c,
                                     lw, WALL_T, lintel_h, f"{side}{seg}_lintel")
                            node = wall_x_merge.input(wall_x_idx)
                            wall_x_idx += 1
                        else:
                            wall_run(wall_z_merge, wall_z_idx, room["id"], fixed_c, start_a + mid,
                                     WALL_T, lw, lintel_h, f"{side}{seg}_lintel")
                            node = wall_z_merge.input(wall_z_idx)
                            wall_z_idx += 1
                        if node:
                            node.parmTuple("t").set((node.parmTuple("t").eval()[0],
                                                     DOOR_LINTEL_H + lintel_h / 2,
                                                     node.parmTuple("t").eval()[2]))
                cursor = max(cursor, o1)

    # corridors: floor + side walls per axis-aligned run
    for corridor in corridors:
        pts = corridor["points"]
        w = corridor["width"]
        for i in range(len(pts) - 1):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]
            if abs(ax - bx) < 0.01 and abs(az - bz) < 0.01:
                continue
            x0, x1 = min(ax, bx), max(ax, bx)
            z0, z1 = min(az, bz), max(az, bz)
            if x1 - x0 < 0.01:  # vertical run (along z)
                floor_merge.setInput(floor_idx, box_node(
                    shell, f"cfloor_{corridor['id']}_{i}", (ax, -FLOOR_T / 2, (z0 + z1) / 2),
                    (w + WALL_T * 2, FLOOR_T, z1 - z0)))
                floor_idx += 1
                wall_z_idx = wall_run(wall_z_merge, wall_z_idx, corridor["id"],
                                      ax - w / 2 - WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0,
                                      WALL_H, f"v{i}a")
                wall_z_idx = wall_run(wall_z_merge, wall_z_idx, corridor["id"],
                                      ax + w / 2 + WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0,
                                      WALL_H, f"v{i}b")
            else:  # horizontal run (along x)
                floor_merge.setInput(floor_idx, box_node(
                    shell, f"cfloor_{corridor['id']}_{i}", ((x0 + x1) / 2, -FLOOR_T / 2, az),
                    (x1 - x0, FLOOR_T, w + WALL_T * 2)))
                floor_idx += 1
                wall_x_idx = wall_run(wall_x_merge, wall_x_idx, corridor["id"],
                                      (x0 + x1) / 2, az - w / 2 - WALL_T / 2, x1 - x0, WALL_T,
                                      WALL_H, f"h{i}a")
                wall_x_idx = wall_run(wall_x_merge, wall_x_idx, corridor["id"],
                                      (x0 + x1) / 2, az + w / 2 + WALL_T / 2, x1 - x0, WALL_T,
                                      WALL_H, f"h{i}b")

    # void undercroft (reads as depth below the lock)
    bounds_x0 = min(r["x"] for r in rooms) - 4
    bounds_x1 = max(r["x"] + r["w"] for r in rooms) + 4
    bounds_z0 = min(r["z"] for r in rooms) - 4
    bounds_z1 = max(r["z"] + r["h"] for r in rooms) + 4
    void = box_node(shell, "VOID_UNDERCROFT", ((bounds_x0 + bounds_x1) / 2, -1.8,
                                               (bounds_z0 + bounds_z1) / 2),
                    (bounds_x1 - bounds_x0, 3.0, bounds_z1 - bounds_z0))
    void_mat = principled("BV2_Void", (0.02, 0.025, 0.035), 0.95)
    void_mat_node = shell.createNode("material", "VOID_MATERIAL")
    void_mat_node.setInput(0, void)
    void_mat_node.parm("shop_materialpath1").set(void_mat)

    # finalize streams: world-scale UVs + materials
    uv_floor = world_uv(shell, "FLOOR_UV", "y", 4.0)
    uv_floor.setInput(0, floor_merge)
    floor_mat = shell.createNode("material", "FLOOR_MATERIAL")
    floor_mat.setInput(0, uv_floor)
    floor_mat.parm("shop_materialpath1").set(mat_floor)

    uv_wx = world_uv(shell, "WALL_UV_X", "z", 4.0)
    uv_wx.setInput(0, wall_x_merge)
    uv_wz = world_uv(shell, "WALL_UV_Z", "x", 4.0)
    uv_wz.setInput(0, wall_z_merge)
    wall_merge = shell.createNode("merge", "WALL_STREAMS")
    wall_merge.setInput(0, uv_wx)
    wall_merge.setInput(1, uv_wz)
    wall_mat = shell.createNode("material", "WALL_MATERIAL")
    wall_mat.setInput(0, wall_merge)
    wall_mat.parm("shop_materialpath1").set(mat_wall)

    out = shell.createNode("merge", "SHELL_OUT")
    out.setInput(0, floor_mat)
    out.setInput(1, wall_mat)
    bevel = shell.createNode("polybevel::3.0", "WEATHERED_EDGES")
    bevel.setInput(0, out)
    bevel.parm("offset").set(0.02)
    bevel.parm("divisions").set(1)
    normals = shell.createNode("normal", "SURFACE_NORMALS")
    normals.setInput(0, bevel)
    normals.setDisplayFlag(True)
    normals.setRenderFlag(True)
    shell.layoutChildren()
    return normals


# ---------------------------------------------------------------------------
# Kit props (authored sockets from the layout)
# ---------------------------------------------------------------------------
def create_model_reference(parent, name, source_path: Path, x, z, yaw_deg,
                           target_height, max_footprint, elevation, vertical_scale,
                           material_path):
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    container = parent.createNode("geo", safe_name(name))
    for child in container.children():
        child.destroy()
    importer = container.createNode("gltf::2.0", "SOURCE_GLTF")
    importer.parm("gltffile").set(source_path.as_posix())
    importer.parm("importnodegeometryas").set("flattenedgeometry")
    importer.parm("enablematerialimport").set(0)
    geometry = importer.geometry()
    if not geometry or not geometry.prims():
        raise RuntimeError(f"Houdini imported no geometry from {source_path}")
    bounds = geometry.boundingBox()
    source_height = max(bounds.sizevec()[1], 0.001)
    source_footprint = max(bounds.sizevec()[0], bounds.sizevec()[2], 0.001)
    scale = min(target_height / source_height, max_footprint / source_footprint)
    transform = container.createNode("xform", "NORMALIZE_AND_GROUND")
    transform.setInput(0, importer)
    transform.parm("scale").set(scale)
    transform.parmTuple("s").set((1.0, vertical_scale, 1.0))
    transform.parm("tx").set(-bounds.center()[0] * scale)
    transform.parm("ty").set(-bounds.minvec()[1] * scale)
    transform.parm("tz").set(-bounds.center()[2] * scale)
    material = container.createNode("material", "APPLY_KIT_MATERIAL")
    material.setInput(0, transform)
    material.parm("shop_materialpath1").set(material_path)
    material.setDisplayFlag(True)
    material.setRenderFlag(True)
    container.parmTuple("t").set((x, elevation, z))
    container.parmTuple("r").set((0.0, yaw_deg, 0.0))
    container.setUserData("souldrifter_source", source_path.as_posix())
    return {
        "name": name, "points": len(geometry.points()), "primitives": len(geometry.prims()),
        "scale": scale, "yaw": yaw_deg, "elevation": elevation,
    }


def place_kit_props(obj, payload, game_root: Path):
    kit = obj.createNode("subnet", "BREACH_V2_KIT_PLACEMENT")
    texture_cache = game_root / "source-assets" / "houdini" / ".cache" / "dungeon-kit-textures"
    material_cache: dict[str, str] = {}
    diagnostics = []
    for i, p in enumerate(payload["placements"]):
        if not p.get("glbSource"):
            continue  # wall art / books handled separately
        source = (game_root / p["glbSource"]).resolve()
        if p["asset"] not in material_cache:
            material_cache[p["asset"]] = create_kit_material(p["asset"], source, texture_cache)
        diag = create_model_reference(
            kit, f"{p['roomId']}_{p['asset']}_{i}", source, p["x"], p["z"],
            p["yaw"], p["height"], p["footprint"], p["elevation"],
            p.get("verticalScale") or 1.0, material_cache[p["asset"]],
        )
        diag.update({"assetId": p["asset"], "roomId": p["roomId"], "role": p["role"]})
        diagnostics.append(diag)
    kit.setUserData("souldrifter_seed", str(payload["meta"]["seed"]))
    kit.setUserData("souldrifter_path", payload["meta"]["path"])
    return diagnostics


# ---------------------------------------------------------------------------
# Custom landmarks (V14 Soul Well, true Memory Loom, effigy, doors, memory)
# ---------------------------------------------------------------------------
def emissive_plane(parent, name, x, y, z, w, h, yaw_deg, color, intensity):
    node = parent.createNode("box", safe_name(name))
    node.parmTuple("size").set((w, h, 0.04))
    node.parmTuple("t").set((x, y, z))
    node.parmTuple("r").set((0.0, yaw_deg, 0.0))
    mat = principled(f"BV2_Emissive_{safe_name(name)}", (0.05, 0.05, 0.06), 0.5,
                     emissive=color, emissive_intensity=intensity)
    apply = parent.createNode("material", safe_name(f"{name}_mat"))
    apply.setInput(0, node)
    apply.parm("shop_materialpath1").set(mat)
    return apply


def build_landmarks(obj, payload, game_root: Path, workspace_root: Path | None):
    lm = payload["landmarks"]
    group = obj.createNode("geo", "BREACH_V2_LANDMARKS")
    for child in group.children():
        child.destroy()
    merge = group.createNode("merge", "LANDMARK_GEO")

    # --- Soul Well (V14): small silvery glowing pool + shard + ripples
    well = lm["soulWell"]
    basin = group.createNode("tube", "SOULWELL_BASIN_RIM")
    basin.parm("rad1").set(well["apron"])
    basin.parm("rad2").set(well["apron"] * 0.92)
    basin.parm("height").set(0.55)
    basin.parm("orient").set("y")
    basin.parmTuple("t").set((well["x"], 0.27, well["z"]))
    pool = group.createNode("circle", "SOULWELL_POOL_SURFACE")
    pool.parm("radx").set(well["r"])
    pool.parm("rady").set(well["r"])
    pool.parm("orient").set("zx")
    pool.parm("divs").set(48)
    pool.parmTuple("t").set((well["x"], 0.18, well["z"]))
    pool_mat = principled("BV2_SoulWell_Pool", (0.35, 0.75, 0.85), 0.12, metallic=0.6,
                          emissive=(0.45, 0.85, 0.95), emissive_intensity=1.6)
    pool_apply = group.createNode("material", "SOULWELL_POOL_MAT")
    pool_apply.setInput(0, pool)
    pool_apply.parm("shop_materialpath1").set(pool_mat)
    shard = group.createNode("sphere", "SOULWELL_SUSPENDED_SHARD")
    shard.parm("radx").set(0.22)
    shard.parm("rady").set(0.34)
    shard.parm("radz").set(0.22)
    shard.parmTuple("t").set((well["x"], 2.1, well["z"]))
    shard_mat = principled("BV2_SoulWell_Shard", (0.55, 0.85, 0.95), 0.2, metallic=0.4,
                           emissive=(0.5, 0.85, 1.0), emissive_intensity=1.2)
    shard_apply = group.createNode("material", "SOULWELL_SHARD_MAT")
    shard_apply.setInput(0, shard)
    shard_apply.parm("shop_materialpath1").set(shard_mat)
    merge.setInput(0, basin)
    merge.setInput(1, pool_apply)
    merge.setInput(2, shard_apply)
    idx = 3
    for ring_i, radius in enumerate((0.62, 1.16, 1.68)):
        ring = group.createNode("tube", f"SOULWELL_RIPPLE_{ring_i}")
        ring.parm("rad1").set(radius)
        ring.parm("rad2").set(radius + 0.03)
        ring.parm("height").set(0.02)
        ring.parm("orient").set("y")
        ring.parmTuple("t").set((well["x"], 0.2, well["z"]))
        merge.setInput(idx, ring)
        idx += 1

    # --- Memory Loom (TRUE loom): frame + hanging threads, violet glow
    loom = lm["memoryLoom"]
    loom_mat = principled("BV2_LoomFrame", (0.32, 0.24, 0.16), 0.7, metallic=0.1)
    thread_mat = principled("BV2_LoomThreads", (0.5, 0.4, 0.75), 0.4,
                            emissive=(0.55, 0.45, 0.85), emissive_intensity=0.7)
    for part, (dx, dz, sx, sy, sz) in {
        "post_l": (-1.1, 0.0, 0.18, 2.6, 0.18),
        "post_r": (1.1, 0.0, 0.18, 2.6, 0.18),
        "beam_top": (0.0, 0.0, 2.4, 0.18, 0.18),
        "beam_base": (0.0, 0.0, 2.2, 0.22, 0.5),
    }.items():
        node = group.createNode("box", f"LOOM_{part}")
        node.parmTuple("size").set((sx, sy, sz))
        node.parmTuple("t").set((loom["x"] + dx, sy / 2 if "beam" not in part else (2.5 if part == "beam_top" else 0.11), loom["z"] + dz))
        apply = group.createNode("material", f"LOOM_{part}_mat")
        apply.setInput(0, node)
        apply.parm("shop_materialpath1").set(loom_mat)
        merge.setInput(idx, apply)
        idx += 1
    for t in range(9):
        thread = group.createNode("box", f"LOOM_THREAD_{t}")
        thread.parmTuple("size").set((0.03, 2.0, 0.02))
        thread.parmTuple("t").set((loom["x"] - 0.96 + t * 0.24, 1.4, loom["z"]))
        apply = group.createNode("material", f"LOOM_THREAD_{t}_mat")
        apply.setInput(0, thread)
        apply.parm("shop_materialpath1").set(thread_mat)
        merge.setInput(idx, apply)
        idx += 1

    # --- Training effigy: post + crossbar + battered head
    effigy = lm["effigy"]
    eff_mat = principled("BV2_Effigy", (0.45, 0.34, 0.2), 0.85)
    for part, (dx, sx, sy, sz, cy) in {
        "post": (0.0, 0.22, 1.7, 0.22, 0.85),
        "arms": (0.0, 1.5, 0.18, 0.18, 1.35),
        "head": (0.0, 0.42, 0.5, 0.42, 1.95),
    }.items():
        node = group.createNode("box", f"EFFIGY_{part}")
        node.parmTuple("size").set((sx, sy, sz))
        node.parmTuple("t").set((effigy["x"] + dx, cy, effigy["z"]))
        apply = group.createNode("material", f"EFFIGY_{part}_mat")
        apply.setInput(0, node)
        apply.parm("shop_materialpath1").set(eff_mat)
        merge.setInput(idx, apply)
        idx += 1

    # --- trial door veils (soul-cyan Wayfarer / ember Oathbreaker)
    for door_key, color in (("doorWayfarer", (0.3, 0.85, 0.95)), ("doorOathbreaker", (0.95, 0.42, 0.2))):
        door = lm[door_key]
        emissive_plane(group, f"{door_key}_VEIL", door["x"] + 0.3, 1.3, door["z"],
                       0.1, 2.6, 90.0, color, 1.1)
        veil = group.node(safe_name(f"{door_key}_VEIL_mat"))
        merge.setInput(idx, veil)
        idx += 1

    # --- First Memory: dais + floating violet crystal
    fm = lm["firstMemory"]
    dais = group.createNode("tube", "FIRST_MEMORY_DAIS")
    dais.parm("rad1").set(1.1)
    dais.parm("rad2").set(1.3)
    dais.parm("height").set(0.5)
    dais.parm("cap").set(1)
    dais.parmTuple("t").set((fm["x"], 0.25, fm["z"]))
    merge.setInput(idx, dais)
    idx += 1
    crystal = group.createNode("sphere", "FIRST_MEMORY_CRYSTAL")
    crystal.parm("radx").set(0.28)
    crystal.parm("rady").set(0.44)
    crystal.parm("radz").set(0.28)
    crystal.parmTuple("t").set((fm["x"], 1.6, fm["z"]))
    cm = principled("BV2_FirstMemory", (0.6, 0.5, 0.9), 0.15,
                    emissive=(0.65, 0.5, 1.0), emissive_intensity=1.8)
    capply = group.createNode("material", "FIRST_MEMORY_MAT")
    capply.setInput(0, crystal)
    capply.parm("shop_materialpath1").set(cm)
    merge.setInput(idx, capply)
    idx += 1

    # --- actor markers (characters/monsters are #448/#449 scope)
    marker_specs = [
        ("ilyra", lm["ilyra"], (0.4, 0.9, 0.5)),
        ("orren", lm["orren"], (0.4, 0.8, 0.45)),
        ("brannoc", lm["brannoc"], (0.5, 0.75, 0.4)),
    ]
    for name, pos, color in marker_specs:
        marker = group.createNode("tube", f"NPC_MARKER_{name}")
        marker.parm("rad1").set(0.32)
        marker.parm("rad2").set(0.32)
        marker.parm("height").set(1.75)
        marker.parm("cap").set(1)
        marker.parmTuple("t").set((pos["x"], 0.875, pos["z"]))
        mm = principled(f"BV2_NPC_{name}", color, 0.5, emissive=color, emissive_intensity=0.25)
        mapply = group.createNode("material", f"NPC_{name}_mat")
        mapply.setInput(0, marker)
        mapply.parm("shop_materialpath1").set(mm)
        merge.setInput(idx, mapply)
        idx += 1
    for enemy in payload["enemies"]:
        marker = group.createNode("tube", safe_name(f"ENEMY_MARKER_{enemy['id']}"))
        marker.parm("rad1").set(0.3)
        marker.parm("rad2").set(0.3)
        marker.parm("height").set(0.9)
        marker.parm("cap").set(1)
        marker.parmTuple("t").set((enemy["x"], 0.45, enemy["z"]))
        em = principled("BV2_EnemyMarker", (0.75, 0.25, 0.2), 0.6,
                        emissive=(0.75, 0.25, 0.2), emissive_intensity=0.35)
        eapply = group.createNode("material", safe_name(f"ENEMY_{enemy['id']}_mat"))
        eapply.setInput(0, marker)
        eapply.parm("shop_materialpath1").set(em)
        merge.setInput(idx, eapply)
        idx += 1
    boss = payload["boss"]
    bring = group.createNode("circle", "BOSS_ANCHOR_RING")
    bring.parm("radx").set(2.2)
    bring.parm("rady").set(2.2)
    bring.parm("orient").set("zx")
    bring.parmTuple("t").set((boss["x"], 0.06, boss["z"]))
    bm = principled("BV2_BossRing", (0.8, 0.3, 0.15), 0.6,
                    emissive=(0.9, 0.35, 0.15), emissive_intensity=0.8)
    bapply = group.createNode("material", "BOSS_RING_mat")
    bapply.setInput(0, bring)
    bapply.parm("shop_materialpath1").set(bm)
    merge.setInput(idx, bapply)
    idx += 1

    out = group.createNode("null", "LANDMARKS_OUT")
    out.setInput(0, merge)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    group.layoutChildren()
    return group


# ---------------------------------------------------------------------------
# Wall art (runbook §5A) + books/scrolls + corruption accents
# ---------------------------------------------------------------------------
FACING_YAW = {"south": 0.0, "north": 180.0, "east": -90.0, "west": 90.0}

ART_MASTERS = {  # zero-cost existing masters (reused per §5A rule 2)
    "art-thalenyr-atlas": ("lore-atlas/assets/M-003_painted_atlas.png", "Thalenyr world atlas"),
    "art-heartvale-section": ("heartvale_section_cut_v2.png", "Heartvale section map"),
    "art-breach-v2-flatmap": ("flatmaps/breach-v2/breach-v2-flatmap-master.png", "Breach zone map"),
}


def build_wall_art_and_books(obj, payload, workspace_root: Path | None):
    group = obj.createNode("geo", "BREACH_V2_WALL_ART")
    for child in group.children():
        child.destroy()
    merge = group.createNode("merge", "ART_GEO")
    idx = 0
    frame_mat = principled("BV2_ArtFrame", (0.24, 0.18, 0.1), 0.5, metallic=0.35)
    placeholder_mat = principled("BV2_ArtPlaceholder", (0.3, 0.26, 0.3), 0.8)
    paper_mat = principled("BV2_Paper", (0.85, 0.8, 0.66), 0.85)
    for p in payload["placements"]:
        if p["role"] == "wall-art":
            w = p.get("width") or 1.6
            h = p.get("height") or w * 0.7
            yaw = FACING_YAW.get(p["facing"], 0.0)
            frame = group.createNode("box", safe_name(f"frame_{p['asset']}_{p['roomId']}"))
            frame.parmTuple("size").set((w + 0.16, h + 0.16, 0.08))
            frame.parmTuple("t").set((p["x"], 1.65, p["z"]))
            frame.parmTuple("r").set((0.0, yaw, 0.0))
            fapply = group.createNode("material", safe_name(f"frame_{p['asset']}_mat"))
            fapply.setInput(0, frame)
            fapply.parm("shop_materialpath1").set(frame_mat)
            merge.setInput(idx, fapply)
            idx += 1
            plane = group.createNode("box", safe_name(f"art_{p['asset']}_{p['roomId']}"))
            plane.parmTuple("size").set((w, h, 0.03))
            # push the art plane slightly off the wall along the facing normal
            normal_offset = {"south": (0, 0, 0.06), "north": (0, 0, -0.06),
                             "east": (0.06, 0, 0), "west": (-0.06, 0, 0)}.get(p["facing"], (0, 0, 0.06))
            plane.parmTuple("t").set((p["x"] + normal_offset[0], 1.65, p["z"] + normal_offset[2]))
            plane.parmTuple("r").set((0.0, yaw, 0.0))
            mat_path = placeholder_mat
            master = ART_MASTERS.get(p["asset"])
            if master and workspace_root:
                img = (workspace_root / "souldrifter-thalenyr" / master[0]).resolve()
                if img.is_file():
                    mat_name = f"BV2_Art_{safe_name(p['asset'])}"
                    mat_net = hou.node("/mat")
                    existing = mat_net.node(mat_name)
                    if existing:
                        existing.destroy()
                    m = mat_net.createNode("principledshader::2.0", mat_name)
                    m.parm("basecolor_useTexture").set(1)
                    m.parm("basecolor_texture").set(img.as_posix())
                    m.parm("rough").set(0.6)
                    MATERIALS[mat_name] = m.path()
                    mat_path = m.path()
            papply = group.createNode("material", safe_name(f"art_{p['asset']}_mat"))
            papply.setInput(0, plane)
            papply.parm("shop_materialpath1").set(mat_path)
            merge.setInput(idx, papply)
            idx += 1
        elif p["role"] == "readable-props":
            if p["asset"] == "scrolls-pile":
                node = group.createNode("tube", safe_name(f"scrolls_{p['roomId']}_{idx}"))
                node.parm("rad1").set(0.16)
                node.parm("rad2").set(0.16)
                node.parm("height").set(0.7)
                node.parm("cap").set(1)
                node.parmTuple("r").set((0.0, 0.0, 90.0))
                node.parmTuple("t").set((p["x"], 0.16, p["z"]))
            else:
                node = group.createNode("box", safe_name(f"books_{p['roomId']}_{idx}"))
                node.parmTuple("size").set((0.5, 0.24, 0.36))
                node.parmTuple("r").set((0.0, p["yaw"], 0.0))
                node.parmTuple("t").set((p["x"], 0.12, p["z"]))
            bapply = group.createNode("material", safe_name(f"book_{idx}_mat"))
            bapply.setInput(0, node)
            bapply.parm("shop_materialpath1").set(paper_mat)
            merge.setInput(idx, bapply)
            idx += 1
    out = group.createNode("null", "ART_OUT")
    out.setInput(0, merge)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    group.layoutChildren()
    return group


def build_corruption_accents(obj, payload):
    group = obj.createNode("geo", "BREACH_V2_CORRUPTION")
    for child in group.children():
        child.destroy()
    merge = group.createNode("merge", "CORRUPTION_GEO")
    idx = 0
    for room in payload["rooms"]:
        level = room.get("corruption", 0.0)
        if level < 0.45:
            continue
        intensity = 0.35 + level * 0.8
        mat = principled(f"BV2_Corruption_{safe_name(room['id'])}", (0.4, 0.12, 0.1), 0.5,
                         emissive=(0.85, 0.3, 0.15), emissive_intensity=intensity)
        # glowing vein strips along the N and W wall bases
        for tag, (cx, cz, sx, sz) in {
            "n": (room["x"] + room["w"] / 2, room["z"] + 0.12, room["w"] * 0.8, 0.06),
            "w": (room["x"] + 0.12, room["z"] + room["h"] / 2, 0.06, room["h"] * 0.8),
        }.items():
            strip = group.createNode("box", safe_name(f"vein_{room['id']}_{tag}"))
            strip.parmTuple("size").set((sx, 0.05, sz))
            strip.parmTuple("t").set((cx, 0.06, cz))
            apply = group.createNode("material", safe_name(f"vein_{room['id']}_{tag}_mat"))
            apply.setInput(0, strip)
            apply.parm("shop_materialpath1").set(mat)
            merge.setInput(idx, apply)
            idx += 1
    out = group.createNode("null", "CORRUPTION_OUT")
    out.setInput(0, merge)
    out.setDisplayFlag(True)
    out.setRenderFlag(True)
    return group


# ---------------------------------------------------------------------------
# Lights + review cameras (perspective — owner ruling V15)
# ---------------------------------------------------------------------------
def hex_color(value: str) -> Color:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def create_lighting(obj, payload):
    # dim cool fill so nothing collapses to black (failure lesson from #450)
    fill = obj.createNode("hlight::2.0", "AMBIENT_FILL")
    fill.parm("light_type").set("distant")
    fill.parmTuple("r").set((-35.0, 30.0, 0.0))
    fill.parmTuple("light_color").set((0.36, 0.42, 0.52))
    fill.parm("light_exposure").set(-1.4)
    fill.parm("ogl_enablelight").set(1)
    for spec in payload["lights"]:
        light = obj.createNode("hlight::2.0", safe_name(spec["id"]))
        light.parm("light_type").set("point")
        light.parmTuple("t").set((spec["x"], spec["y"], spec["z"]))
        light.parmTuple("light_color").set(hex_color(spec["color"]))
        light.parm("light_intensity").set(spec["intensity"])
        light.parm("light_exposure").set(0.0)
        if light.parm("attenuation_radius"):
            light.parm("attenuation_radius").set(spec.get("radius", 7.0))
        light.parm("ogl_enablelight").set(1)


def look_at(obj, name, cam_pos, target_pos):
    target = obj.createNode("null", f"{name}_TARGET")
    target.parmTuple("t").set(target_pos)
    target.setDisplayFlag(False)
    cam = obj.createNode("cam", name)
    cam.parmTuple("t").set(cam_pos)
    if cam.parm("lookatpath"):
        cam.parm("lookatpath").set(target.path())
    cam.parm("projection").set("perspective")
    cam.parm("focal").set(32.0)
    return cam


def create_cameras(obj, payload):
    lm = payload["landmarks"]
    well = lm["soulWell"]
    look_at(obj, "CAM_VESTIBULE_HERO",
            (well["x"] + 9.5, 4.2, well["z"] + 8.0), (well["x"], 1.0, well["z"]))
    doors = lm["doorWayfarer"]
    look_at(obj, "CAM_PLAZA_DOORS",
            (doors["x"] - 11.0, 2.4, doors["z"] + 3.5), (doors["x"], 1.4, doors["z"] + 3.5))
    first = payload["rooms"][8] if len(payload["rooms"]) > 8 else payload["rooms"][-1]
    look_at(obj, "CAM_GALLERY",
            (first["x"] + 2.0, 3.2, first["z"] + 2.0),
            (first["x"] + first["w"] / 2, 1.0, first["z"] + first["h"] / 2))
    boss = payload["boss"]
    look_at(obj, "CAM_ASHEN_LOCK",
            (boss["x"] - 9.0, 4.6, boss["z"] - 6.0), (boss["x"], 1.4, boss["z"]))
    exitp = lm["exitPoint"]
    look_at(obj, "CAM_WAY_UPWARD",
            (exitp["x"] - 10.0, 2.6, exitp["z"]), (exitp["x"] + 2.0, 1.6, exitp["z"]))
    look_at(obj, "CAM_SPINE_OVERVIEW",
            (120.0, 46.0, -28.0), (120.0, 0.0, 10.0))


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main() -> None:
    args = parse_args()
    if hou.licenseCategory().name() != "Apprentice":
        raise RuntimeError(f"Expected Houdini Apprentice; active license is {hou.licenseCategory().name()}.")
    payload = json.loads(args.layout.read_text(encoding="utf-8"))
    args.hip.parent.mkdir(parents=True, exist_ok=True)
    args.obj.parent.mkdir(parents=True, exist_ok=True)
    game_root = args.game_root.resolve()
    workspace_root = args.workspace_root.resolve() if args.workspace_root else None

    tex_root = game_root / "public" / "assets" / "textures" / "environment" / "first-breach"
    flagstone = textured_material("BV2_Flagstone", tex_root / "flagstone-color.jpg",
                                  tex_root / "flagstone-normal-gl.jpg", tex_root / "flagstone-roughness.jpg",
                                  tex_root / "flagstone-ao.jpg", args.hip.resolve().parent)
    masonry = textured_material("BV2_Masonry", tex_root / "masonry-color.jpg",
                                tex_root / "masonry-normal-gl.jpg", tex_root / "masonry-roughness.jpg",
                                tex_root / "masonry-ao.jpg", args.hip.resolve().parent)

    hou.hipFile.clear(suppress_save_prompt=True)
    hou.setFps(30)
    obj = hou.node("/obj")

    shell_out = build_shell(obj, payload, flagstone, masonry)
    kit_diagnostics = place_kit_props(obj, payload, game_root)
    build_landmarks(obj, payload, game_root, workspace_root)
    build_wall_art_and_books(obj, payload, workspace_root)
    build_corruption_accents(obj, payload)
    create_lighting(obj, payload)
    create_cameras(obj, payload)

    metadata = obj.createNode("null", "BREACH_V2_BUILD_METADATA")
    metadata.setUserData("souldrifter_dungeon", payload["meta"]["dungeon"])
    metadata.setUserData("souldrifter_seed", str(payload["meta"]["seed"]))
    metadata.setUserData("souldrifter_path", payload["meta"]["path"])
    metadata.setUserData("souldrifter_license", hou.licenseCategory().name())
    metadata.setUserData("souldrifter_kit_models", json.dumps(kit_diagnostics, separators=(",", ":")))

    obj.layoutChildren()
    hou.clearAllSelected()
    hou.hipFile.save(args.hip.resolve().as_posix())

    # review OBJ: the continuous shell (kit GLBs stay referenced, not merged)
    shell_out.geometry().saveToFile(args.obj.resolve().as_posix())
    if not args.obj.is_file() or args.obj.stat().st_size == 0:
        raise RuntimeError(f"Houdini did not create {args.obj}")

    print(json.dumps({
        "houdiniVersion": hou.applicationVersionString(),
        "license": hou.licenseCategory().name(),
        "seed": payload["meta"]["seed"],
        "path": payload["meta"]["path"],
        "rooms": len(payload["rooms"]),
        "kitPlacements": len(kit_diagnostics),
        "shellPoints": len(shell_out.geometry().points()),
        "shellPrims": len(shell_out.geometry().prims()),
        "hip": args.hip.resolve().as_posix(),
        "hipBytes": args.hip.stat().st_size,
        "obj": args.obj.resolve().as_posix(),
        "objBytes": args.obj.stat().st_size,
    }))


if __name__ == "__main__":
    sys.exit(main())
