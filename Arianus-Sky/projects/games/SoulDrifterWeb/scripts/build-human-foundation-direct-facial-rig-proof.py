"""Fail-closed direct Rigify proof for the exact approved issue #487 Tripo head.

This builder deliberately does not transfer geometry from MakeHuman or any
other template.  It fits Blender 5.2.1's bundled Rigify eye and jaw modules
directly to a head-local duplicate of the exact approved Tripo mesh, bakes a
small proof set back onto that same topology, and strips all authoring rigs
before writing an evidence-only GLB.  Canonical runtime assets are never
overwritten by this script.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict, deque
from hashlib import sha256
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Vector
import numpy as np


ISSUE = 487
SOURCE_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8"
EXPECTED_BASIS_SHA256 = "26A57C72964440C7782F2D99F2671234514BA3536731109BF681E9F0DC868555"
HEAD_OBJECT = "HumanFoundation_HeadBase"
BODY_OBJECT = "HumanFoundation_BodyNoHead"
ROOT_BONE = "mixamorig:Hips"
HEAD_BONE = "mixamorig:Head"
PROOF_TARGETS = ("eyeBlinkLeft", "eyeBlinkRight", "jawOpen")
RIGIFY_MODULES = ("face.skin_eye", "face.skin_jaw")
EXPECTED_VERTICES = 6025
EXPECTED_POLYGONS = 6264
EXPECTED_RUNTIME_BONES = 65


class ProofGateError(RuntimeError):
    """Fail-closed proof error carrying deterministic machine-readable evidence."""

    def __init__(self, message: str, details: dict[str, object]):
        super().__init__(message)
        self.details = details


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage",
        choices=("alignment-audit", "bind-bake-proof"),
        default="alignment-audit",
    )
    parser.add_argument(
        "--source-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-head-base.glb"
        ),
    )
    parser.add_argument(
        "--evidence-dir",
        default=(
            r"H:\CodexData\souldrifter-toolchain\evidence\487"
            r"\direct-rig-facial-proof"
        ),
    )
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def write_json(path: Path, payload: dict[str, object]) -> dict[str, object]:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return {
        "path": str(path).replace("\\", "/"),
        "sha256": file_sha256(path),
    }


def mesh_basis_signature(obj: bpy.types.Object) -> dict[str, object]:
    mesh = obj.data
    digest = sha256()
    digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
    for vertex in mesh.vertices:
        digest.update(struct.pack("<3d", *vertex.co))
        digest.update(struct.pack("<3d", *vertex.normal))
    for polygon in mesh.polygons:
        digest.update(struct.pack("<I", len(polygon.vertices)))
        for vertex_index in polygon.vertices:
            digest.update(struct.pack("<I", vertex_index))
        digest.update(struct.pack("<I", polygon.material_index))
    for layer in mesh.uv_layers:
        digest.update(layer.name.encode("utf-8") + b"\0")
        for loop in layer.data:
            digest.update(struct.pack("<2d", *loop.uv))
    material_slots = [
        slot.material.name if slot.material else None for slot in obj.material_slots
    ]
    digest.update(json.dumps(material_slots, separators=(",", ":")).encode("utf-8"))
    return {
        "sha256": digest.hexdigest().upper(),
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "uvLayers": [layer.name for layer in mesh.uv_layers],
        "materialSlots": material_slots,
    }


def import_locked_source(path: Path) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    if not path.is_file() or file_sha256(path) != SOURCE_SHA256:
        raise RuntimeError(f"Locked source hash changed or is missing: {path}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    head = bpy.data.objects.get(HEAD_OBJECT)
    body = bpy.data.objects.get(BODY_OBJECT)
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if head is None or body is None or len(armatures) != 1:
        raise RuntimeError(
            f"Locked source objects changed: head={head}, body={body}, "
            f"armatures={[obj.name for obj in armatures]}"
        )
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_RUNTIME_BONES or roots != [ROOT_BONE]:
        raise RuntimeError(
            f"Runtime armature changed: {len(armature.data.bones)} bones, roots={roots}"
        )
    if HEAD_BONE not in armature.data.bones:
        raise RuntimeError(f"Runtime head bone missing: {HEAD_BONE}")
    signature = mesh_basis_signature(head)
    if signature != {
        "sha256": EXPECTED_BASIS_SHA256,
        "vertices": EXPECTED_VERTICES,
        "polygons": EXPECTED_POLYGONS,
        "uvLayers": signature["uvLayers"],
        "materialSlots": signature["materialSlots"],
    }:
        raise RuntimeError(f"Exact approved head Basis changed: {signature}")
    return head, body, armature


def head_local_points(
    obj: bpy.types.Object, armature: bpy.types.Object
) -> list[Vector]:
    head_world = armature.matrix_world @ armature.data.bones[HEAD_BONE].matrix_local
    object_to_head = head_world.inverted() @ obj.matrix_world
    return [object_to_head @ vertex.co for vertex in obj.data.vertices]


def logical_topology(
    obj: bpy.types.Object, points: list[Vector]
) -> tuple[
    list[tuple[float, float, float]],
    dict[tuple[float, float, float], list[int]],
    dict[tuple[float, float, float], Vector],
    dict[tuple[float, float, float], set[tuple[float, float, float]]],
    set[tuple[tuple[float, float, float], ...]],
]:
    raw_keys = [tuple(round(value, 6) for value in point) for point in points]
    raw_for_key: dict[tuple[float, float, float], list[int]] = defaultdict(list)
    key_points: dict[tuple[float, float, float], Vector] = {}
    for raw_index, key in enumerate(raw_keys):
        raw_for_key[key].append(raw_index)
        key_points.setdefault(key, points[raw_index])
    adjacency = {key: set() for key in raw_for_key}
    faces: set[tuple[tuple[float, float, float], ...]] = set()
    for polygon in obj.data.polygons:
        keys = tuple(sorted({raw_keys[index] for index in polygon.vertices}))
        if len(keys) != 3:
            raise RuntimeError(f"Exact head contains a non-triangular logical face: {keys}")
        faces.add(keys)
        for offset, first in enumerate(keys):
            for second in keys[offset + 1 :]:
                adjacency[first].add(second)
                adjacency[second].add(first)
    return raw_keys, raw_for_key, key_points, adjacency, faces


def connected_components(
    vertices: set[tuple[float, float, float]],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
) -> list[set[tuple[float, float, float]]]:
    remaining = set(vertices)
    components = []
    while remaining:
        seed = remaining.pop()
        component = {seed}
        queue = deque([seed])
        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return sorted(components, key=len, reverse=True)


def exact_regions(
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
    faces: set[tuple[tuple[float, float, float], ...]],
) -> dict[str, object]:
    minimum_y = min(point.y for point in key_points.values())
    seam = {key for key, point in key_points.items() if abs(point.y - minimum_y) <= 0.00003}
    if len(seam) != 64:
        raise RuntimeError(f"Exact neck seam changed: {len(seam)}")

    eyes = {}
    for side in ("left", "right"):
        aperture = {
            key
            for key, point in key_points.items()
            if 0.05260 <= point.z <= 0.05270
            and 0.0543 <= point.y <= 0.0716
            and (
                0.0084 <= point.x <= 0.0258
                if side == "left"
                else -0.0258 <= point.x <= -0.0079
            )
        }
        if len(aperture) != 16:
            raise RuntimeError(f"Exact {side} eye aperture changed: {len(aperture)}")
        rings = [aperture]
        seen = set(aperture)
        center = sum((key_points[key] for key in aperture), Vector()) / len(aperture)
        for ring_index in range(1, 6):
            prior_depth = sum(key_points[key].z for key in rings[-1]) / len(rings[-1])
            candidates = {
                neighbor
                for key in rings[-1]
                for neighbor in adjacency[key]
                if neighbor not in seen
                and 0.047 <= key_points[neighbor].y <= 0.079
                and (key_points[neighbor].x > 0) == (side == "left")
                and prior_depth + 0.00025
                <= key_points[neighbor].z
                <= prior_depth + 0.0027
            }
            if len(candidates) != 16:
                candidates = set(
                    sorted(
                        candidates,
                        key=lambda key: (
                            abs(key_points[key].z - (prior_depth + 0.00155)),
                            abs(key_points[key].y - center.y),
                            key,
                        ),
                    )[:16]
                )
            if len(candidates) != 16:
                raise RuntimeError(
                    f"Exact {side} eye ring {ring_index} changed: {len(candidates)}"
                )
            rings.append(candidates)
            seen.update(candidates)
        eyes[side] = {"aperture": aperture, "rings": rings, "region": seen}

    edge_use: Counter[tuple[tuple[float, float, float], ...]] = Counter()
    for face in faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                edge_use[tuple(sorted((first, second)))] += 1
    mouth_edges = [
        edge
        for edge, count in edge_use.items()
        if count == 1
        and all(
            abs(key[0]) <= 0.032
            and 0.010 <= key[1] <= 0.040
            and key[2] >= 0.052
            for key in edge
        )
    ]
    mouth_graph: dict[
        tuple[float, float, float], set[tuple[float, float, float]]
    ] = defaultdict(set)
    for first, second in mouth_edges:
        mouth_graph[first].add(second)
        mouth_graph[second].add(first)
    mouth_chains = connected_components(set(mouth_graph), mouth_graph)
    if [len(chain) for chain in mouth_chains] != [19, 15, 9, 7]:
        raise RuntimeError(
            f"Exact mouth boundary chains changed: {[len(chain) for chain in mouth_chains]}"
        )
    ordered_mouth_chains = []
    for chain in mouth_chains:
        endpoints = sorted(key for key in chain if len(mouth_graph[key] & chain) == 1)
        if len(endpoints) != 2:
            raise RuntimeError(
                f"Exact mouth chain is not an ordered path: {len(chain)}/{len(endpoints)}"
            )
        ordered = [endpoints[0]]
        previous = None
        current = endpoints[0]
        while current != endpoints[1]:
            candidates = sorted(
                (mouth_graph[current] & chain) - ({previous} if previous else set())
            )
            if len(candidates) != 1:
                raise RuntimeError(
                    f"Exact mouth chain branches at {current}: {len(candidates)}"
                )
            previous, current = current, candidates[0]
            ordered.append(current)
        if len(ordered) != len(chain):
            raise RuntimeError("Ordered mouth chain does not cover every point once")
        ordered_mouth_chains.append(ordered)
    mouth_upper = set().union(
        *(
            chain
            for chain in mouth_chains
            if sum(key[1] for key in chain) / len(chain) > 0.024
        )
    )
    mouth_lower = set().union(
        *(chain for chain in mouth_chains if chain.isdisjoint(mouth_upper))
    )
    surface_components = connected_components(set(key_points), adjacency)
    if [len(component) for component in surface_components] != [2792, 234, 188]:
        raise RuntimeError(
            "Exact surface components changed: "
            f"{[len(component) for component in surface_components]}"
        )
    exterior = surface_components[0]
    outer_upper = {
        key
        for key in exterior
        if abs(key[0]) <= 0.018
        and 0.0255 <= key[1] <= 0.0321
        and key[2] >= 0.070
    }
    outer_lower = {
        key
        for key in exterior
        if abs(key[0]) <= 0.018
        and 0.019 <= key[1] <= 0.0253
        and key[2] >= 0.070
    }
    if len(outer_upper) != 69 or len(outer_lower) != 93:
        raise RuntimeError(
            f"Exact outer lip partitions changed: {len(outer_upper)}/{len(outer_lower)}"
        )
    mouth_upper |= outer_upper
    mouth_lower |= outer_lower

    jaw = set(mouth_lower)
    pinned_upper = mouth_upper
    distance = {key: 0 for key in jaw}
    queue = deque(jaw)
    while queue:
        current = queue.popleft()
        next_distance = distance[current] + 1
        if next_distance > 44:
            continue
        for neighbor in adjacency[current]:
            point = key_points[neighbor]
            if neighbor in distance or neighbor in pinned_upper:
                continue
            if point.y < -0.013 or point.y > 0.052 or abs(point.x) > 0.068 or point.z < -0.040:
                continue
            distance[neighbor] = next_distance
            jaw.add(neighbor)
            queue.append(neighbor)
    if len(jaw) != 1438:
        raise RuntimeError(f"Exact jaw region changed: {len(jaw)}")
    return {
        "seam": seam,
        "eyes": eyes,
        "mouthUpper": mouth_upper,
        "mouthLower": mouth_lower,
        "mouthChainsOrdered": ordered_mouth_chains,
        "jaw": jaw,
        "jawDistance": distance,
        "surfaceComponents": surface_components,
        "rawForKey": raw_for_key,
    }


def enable_rigify() -> tuple[dict[str, object], object, object]:
    bpy.ops.preferences.addon_enable(module="rigify")
    import rigify
    from rigify.rigs.face import skin_eye, skin_jaw

    modules = {}
    for name in RIGIFY_MODULES:
        spec = importlib.util.find_spec(f"rigify.rigs.{name}")
        if spec is None or spec.origin is None:
            raise RuntimeError(f"Bundled Rigify module is missing: {name}")
        path = Path(spec.origin)
        modules[name] = {
            "path": str(path).replace("\\", "/"),
            "sha256": file_sha256(path),
        }
    return {"version": list(rigify.bl_info["version"]), "modules": modules}, skin_eye, skin_jaw


def new_metarig(name: str) -> bpy.types.Object:
    data = bpy.data.armatures.new(name + "Data")
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    return obj


def fit_eye_metarig(
    meta: bpy.types.Object,
    side: str,
    rings: list[set[tuple[float, float, float]]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    aperture = rings[0]
    points = [key_points[key] for key in aperture]
    target_x_min = min(point.x for point in points)
    target_x_max = max(point.x for point in points)
    target_z_min = min(point.y for point in points)
    target_z_max = max(point.y for point in points)
    aperture_depth = -sum(point.z for point in points) / len(points)
    source_bones = {
        bone.name: (bone.head_local.copy(), bone.tail_local.copy())
        for bone in meta.data.bones
    }
    sample_lid_points = [
        point
        for name, endpoints in source_bones.items()
        if name.startswith("lid")
        for point in endpoints
    ]
    sample_x_min = min(point.x for point in sample_lid_points)
    sample_x_max = max(point.x for point in sample_lid_points)
    sample_z_min = min(point.z for point in sample_lid_points)
    sample_z_max = max(point.z for point in sample_lid_points)
    sample_eye_center = source_bones["eye.L"][0]
    sample_radius = max(
        abs(point.y - sample_eye_center.y) for point in sample_lid_points
    )
    target_radius_x = (target_x_max - target_x_min) * 0.5
    target_radius_z = (target_z_max - target_z_min) * 0.5
    target_radius = (target_radius_x * target_radius_z) ** 0.5
    depth_scale = target_radius / sample_radius
    eye_center_depth = aperture_depth + target_radius
    ring_depths = [
        sum(key_points[key].z for key in ring) / len(ring) for ring in rings
    ]
    if any(second <= first for first, second in zip(ring_depths, ring_depths[1:])):
        raise RuntimeError(
            f"Exact {side} eye ring depth progression is not outward: {ring_depths}"
        )

    def fitted(point: Vector) -> Vector:
        tx = (point.x - sample_x_min) / (sample_x_max - sample_x_min)
        if side == "left":
            x = target_x_min + tx * (target_x_max - target_x_min)
        else:
            x = target_x_max - tx * (target_x_max - target_x_min)
        tz = (point.z - sample_z_min) / (sample_z_max - sample_z_min)
        z = target_z_min + tz * (target_z_max - target_z_min)
        y = eye_center_depth + point.y * depth_scale
        return Vector((x, y, z))

    bpy.context.view_layer.objects.active = meta
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in meta.data.edit_bones:
        source_head, source_tail = source_bones[bone.name]
        bone.head = fitted(source_head)
        bone.tail = fitted(source_tail)
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "side": side,
        "apertureCount": len(aperture),
        "apertureHeadLocalBounds": {
            "minimum": [target_x_min, target_z_min, -aperture_depth],
            "maximum": [target_x_max, target_z_max, -aperture_depth],
        },
        "eyeCenterRigLocal": [
            (target_x_min + target_x_max) * 0.5,
            eye_center_depth,
            (target_z_min + target_z_max) * 0.5,
        ],
        "derivation": {
            "method": "exact-aperture-radii-and-six-ring-depth-progression",
            "targetApertureRadii": [target_radius_x, target_radius_z],
            "targetEquivalentRadius": target_radius,
            "sampleRigifyLidDepthRadius": sample_radius,
            "depthScale": depth_scale,
            "headLocalRingMeanDepths": ring_depths,
        },
    }


def fit_jaw_metarig(
    meta: bpy.types.Object,
    regions: dict[str, object],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    source_bones = {
        bone.name: (bone.head_local.copy(), bone.tail_local.copy())
        for bone in meta.data.bones
    }
    sample_lip_points = [
        point
        for name, endpoints in source_bones.items()
        if name.startswith("lip")
        for point in endpoints
    ]
    sample_upper = [
        point
        for name, endpoints in source_bones.items()
        if ".T." in name
        for point in endpoints
    ]
    sample_lower = [
        point
        for name, endpoints in source_bones.items()
        if ".B." in name
        for point in endpoints
    ]
    if not sample_upper or not sample_lower:
        raise RuntimeError("Bundled Rigify jaw sample lost upper/lower lip landmarks")
    ordered = regions["mouthChainsOrdered"]
    target_upper_keys = set().union(
        *(
            set(chain)
            for chain in ordered
            if sum(key[1] for key in chain) / len(chain) > 0.024
        )
    )
    target_lower_keys = set().union(
        *(set(chain) for chain in ordered if set(chain).isdisjoint(target_upper_keys))
    )
    target_upper = [key_points[key] for key in target_upper_keys]
    target_lower = [key_points[key] for key in target_lower_keys]
    target_lips = target_upper + target_lower
    target_jaw = [key_points[key] for key in regions["jaw"]]

    source_half_width = max(abs(point.x) for point in sample_lip_points)
    target_half_width = max(abs(point.x) for point in target_lips)
    scale_x = target_half_width / source_half_width
    source_upper_z = sum(point.z for point in sample_upper) / len(sample_upper)
    source_lower_z = sum(point.z for point in sample_lower) / len(sample_lower)
    target_upper_z = sum(point.y for point in target_upper) / len(target_upper)
    target_lower_z = sum(point.y for point in target_lower) / len(target_lower)
    scale_z = (target_upper_z - target_lower_z) / (source_upper_z - source_lower_z)
    shift_z = target_upper_z - source_upper_z * scale_z

    source_pivot_y = source_bones["jaw"][0].y
    source_lip_y = sum(point.y for point in sample_lip_points) / len(sample_lip_points)
    target_pivot_y = -min(point.z for point in target_jaw)
    target_lip_y = -sum(point.z for point in target_lips) / len(target_lips)
    scale_y = (target_lip_y - target_pivot_y) / (source_lip_y - source_pivot_y)
    shift_y = target_pivot_y - source_pivot_y * scale_y
    if min(scale_x, scale_y, scale_z) <= 0.0:
        raise RuntimeError(
            f"Derived jaw fit is not orientation preserving: {scale_x}/{scale_y}/{scale_z}"
        )

    def fitted(point: Vector) -> Vector:
        return Vector(
            (point.x * scale_x, point.y * scale_y + shift_y, point.z * scale_z + shift_z)
        )

    bpy.context.view_layer.objects.active = meta
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in meta.data.edit_bones:
        source_head, source_tail = source_bones[bone.name]
        bone.head = fitted(source_head)
        bone.tail = fitted(source_tail)
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "method": "exact-ordered-lips-and-jaw-bounds-to-rigify-sample-landmarks",
        "mapping": {
            "scale": [scale_x, scale_y, scale_z],
            "translation": [0.0, shift_y, shift_z],
        },
        "source": {
            "lipHalfWidth": source_half_width,
            "upperMeanZ": source_upper_z,
            "lowerMeanZ": source_lower_z,
            "pivotY": source_pivot_y,
            "lipMeanY": source_lip_y,
        },
        "target": {
            "orderedChainSizes": [len(chain) for chain in ordered],
            "lipHalfWidth": target_half_width,
            "upperMeanVertical": target_upper_z,
            "lowerMeanVertical": target_lower_z,
            "jawPosteriorHeadLocalDepth": -target_pivot_y,
            "lipMeanHeadLocalDepth": -target_lip_y,
        },
    }


def create_aligned_module(
    label: str,
    sample_module,
    fit_callback,
) -> tuple[bpy.types.Object, bpy.types.Object, dict[str, object], set[bpy.types.Object]]:
    from rigify import generate

    before_objects = set(bpy.data.objects)
    before_armatures = {obj.name for obj in bpy.data.objects if obj.type == "ARMATURE"}
    meta = new_metarig(f"META-Face487-{label}")
    sample_module.create_sample(meta)
    fit_receipt = fit_callback(meta)
    aligned_bones = {
        bone.name: {
            "head": [float(value) for value in bone.head_local],
            "tail": [float(value) for value in bone.tail_local],
        }
        for bone in meta.data.bones
    }
    bpy.context.view_layer.objects.active = meta
    meta.select_set(True)
    generate.generate_rig(bpy.context, meta)
    generated = [
        obj
        for obj in bpy.data.objects
        if obj.type == "ARMATURE"
        and obj is not meta
        and obj.name not in before_armatures
    ]
    if len(generated) != 1:
        raise RuntimeError(
            f"Rigify {label} generation produced {[obj.name for obj in generated]}"
        )
    rig = generated[0]
    control_names = sorted(
        name
        for name in rig.pose.bones.keys()
        if not name.startswith(("DEF-", "ORG-", "MCH-"))
    )
    deform_names = sorted(name for name in rig.pose.bones.keys() if name.startswith("DEF-"))
    receipt = {
        "label": label,
        "metarigBoneCount": len(meta.data.bones),
        "generatedRig": rig.name,
        "generatedBoneCount": len(rig.data.bones),
        "controlNames": control_names,
        "deformNames": deform_names,
        "fit": fit_receipt,
        "alignedMetarigBones": aligned_bones,
    }
    return meta, rig, receipt, before_objects


def strip_created_objects(before_objects: set[bpy.types.Object]) -> None:
    for obj in list(set(bpy.data.objects) - before_objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def generate_aligned_module(
    label: str,
    sample_module,
    fit_callback,
) -> dict[str, object]:
    _meta, _rig, receipt, before_objects = create_aligned_module(
        label, sample_module, fit_callback
    )
    strip_created_objects(before_objects)
    return receipt


def head_to_rig(point: Vector) -> Vector:
    """Map locked head-local (X horizontal, Y vertical, Z forward) to Rigify."""
    return Vector((point.x, -point.z, point.y))


def rig_to_head(point: Vector) -> Vector:
    return Vector((point.x, point.z, -point.y))


def object_point_from_head_local(
    obj: bpy.types.Object, armature: bpy.types.Object, point: Vector
) -> Vector:
    head_world = armature.matrix_world @ armature.data.bones[HEAD_BONE].matrix_local
    return obj.matrix_world.inverted() @ head_world @ point


def create_authoring_head(
    raw_points: list[Vector], polygons: list[tuple[int, int, int]], label: str
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"TMP-Face487-{label}Mesh")
    mesh.from_pydata([head_to_rig(point) for point in raw_points], [], polygons)
    mesh.update()
    obj = bpy.data.objects.new(f"TMP-Face487-{label}", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def segment_distance_squared(point: Vector, start: Vector, end: Vector) -> float:
    vector = end - start
    if vector.length_squared <= 1.0e-18:
        return (point - start).length_squared
    factor = max(0.0, min(1.0, (point - start).dot(vector) / vector.length_squared))
    return (point - (start + factor * vector)).length_squared


def nearest_bone_name(
    point: Vector, rig: bpy.types.Object, names: list[str]
) -> str:
    return min(
        names,
        key=lambda name: (
            segment_distance_squared(
                point,
                rig.data.bones[name].head_local,
                rig.data.bones[name].tail_local,
            ),
            name,
        ),
    )


def full_chain_segment_weights(
    point: Vector, rig: bpy.types.Object, names: list[str]
) -> list[tuple[str, float]]:
    distances = sorted(
        (
            segment_distance_squared(
                point,
                rig.data.bones[name].head_local,
                rig.data.bones[name].tail_local,
            ),
            name,
        )
        for name in names
    )
    coincident = [name for distance, name in distances if distance <= 1.0e-18]
    if coincident:
        equal_weight = 1.0 / len(coincident)
        return [(name, equal_weight) for name in coincident]
    inverse = [(name, 1.0 / math.sqrt(distance)) for distance, name in distances]
    total = sum(weight for _name, weight in inverse)
    return [(name, weight / total) for name, weight in inverse]


def ordered_eye_ring_arcs(
    ring: set[tuple[float, float, float]],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    graph = {key: adjacency[key] & ring for key in ring}
    degree_counts = Counter(len(neighbors) for neighbors in graph.values())
    if degree_counts != Counter({2: len(ring)}):
        raise RuntimeError(
            f"Exact eye ring is not one 2-regular cycle: {dict(degree_counts)}"
        )
    left_corner = min(ring, key=lambda key: (key_points[key].x, key))
    right_corner = max(ring, key=lambda key: (key_points[key].x, key))
    paths = []
    for first_step in sorted(graph[left_corner]):
        path = [left_corner, first_step]
        previous, current = left_corner, first_step
        while current != right_corner:
            candidates = graph[current] - {previous}
            if len(candidates) != 1:
                raise RuntimeError(
                    f"Exact eye ring path branches at {current}: {len(candidates)}"
                )
            next_key = next(iter(candidates))
            if next_key in path and next_key != right_corner:
                raise RuntimeError("Exact eye ring path loops before opposite corner")
            path.append(next_key)
            previous, current = current, next_key
        paths.append(path)
    if len(paths) != 2 or set(paths[0]) | set(paths[1]) != ring:
        raise RuntimeError("Ordered eye arcs do not cover the exact ring")
    if set(paths[0]) & set(paths[1]) != {left_corner, right_corner}:
        raise RuntimeError("Ordered eye arcs overlap away from the exact corners")
    paths.sort(
        key=lambda path: (
            sum(key_points[key].y for key in path[1:-1]) / len(path[1:-1]),
            path,
        ),
        reverse=True,
    )
    labels = {}
    masks = {}
    arc_receipts = {}
    for label, path in zip(("upper", "lower"), paths, strict=True):
        cumulative = [0.0]
        for first, second in zip(path, path[1:]):
            cumulative.append(
                cumulative[-1] + (key_points[second] - key_points[first]).length
            )
        total = cumulative[-1]
        raw_masks = [min(distance, total - distance) for distance in cumulative]
        maximum = max(raw_masks)
        if total <= 0.0 or maximum <= 0.0:
            raise RuntimeError("Exact eye arc has zero geodesic length")
        normalized = [value / maximum for value in raw_masks]
        for key, mask in zip(path, normalized, strict=True):
            if key not in (left_corner, right_corner):
                labels[key] = label
            masks[key] = max(masks.get(key, 0.0), mask)
        arc_receipts[label] = {
            "orderedLogicalCoordinates": [list(key) for key in path],
            "geodesicLengthMeters": total,
            "cornerMasks": normalized,
        }
    labels[left_corner] = "upper"
    labels[right_corner] = "upper"
    if set(labels) != ring or set(masks) != ring:
        raise RuntimeError("Exact eye arc labels or masks are incomplete")
    return {
        "leftCornerLogicalCoordinate": list(left_corner),
        "rightCornerLogicalCoordinate": list(right_corner),
        "labels": labels,
        "masks": masks,
        "paths": {label: path for label, path in zip(("upper", "lower"), paths)},
        "arcs": arc_receipts,
    }


def add_weight(
    obj: bpy.types.Object, groups: dict[str, bpy.types.VertexGroup],
    name: str, indices: list[int], weight: float,
) -> None:
    if weight <= 0.0:
        return
    group = groups.get(name)
    if group is None:
        group = obj.vertex_groups.new(name=name)
        groups[name] = group
    group.add(indices, weight, "REPLACE")


def bind_eye_region(
    obj: bpy.types.Object,
    rig: bpy.types.Object,
    side_region: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
) -> dict[str, object]:
    upper = sorted(
        name for name in rig.data.bones.keys() if name.startswith("DEF-lid") and ".T." in name
    )
    lower = sorted(
        name for name in rig.data.bones.keys() if name.startswith("DEF-lid") and ".B." in name
    )
    if len(upper) != 4 or len(lower) != 4:
        raise RuntimeError(f"Rigify eye deform chains changed: {upper}/{lower}")
    stationary_anchor = "DEF-eye_master.L"
    if stationary_anchor not in rig.data.bones:
        raise RuntimeError(f"Rigify eye stationary anchor changed: {stationary_anchor}")
    ring_arcs = [
        ordered_eye_ring_arcs(ring, adjacency, key_points)
        for ring in side_region["rings"]
    ]
    groups: dict[str, bpy.types.VertexGroup] = {}
    assigned = 0
    boundary = []
    raw_weight_receipts = {}
    for ring_index, ring in enumerate(side_region["rings"]):
        linear_radial_weight = (len(side_region["rings"]) - 1 - ring_index) / (
            len(side_region["rings"]) - 1
        )
        arc = ring_arcs[ring_index]
        for key in sorted(ring):
            raw_ids = raw_for_key[key]
            corner_weight = arc["masks"][key]
            product_seed_weight = linear_radial_weight * corner_weight
            moving_weight = product_seed_weight
            branch = arc["labels"][key]
            influences = []
            if moving_weight <= 0.0:
                add_weight(obj, groups, stationary_anchor, raw_ids, 1.0)
                boundary.extend(raw_ids)
            else:
                point = head_to_rig(key_points[key])
                candidates = upper if branch == "upper" else lower
                influences = full_chain_segment_weights(point, rig, candidates)
                for name, normalized_weight in influences:
                    add_weight(
                        obj,
                        groups,
                        name,
                        raw_ids,
                        moving_weight * normalized_weight,
                    )
                add_weight(
                    obj, groups, stationary_anchor, raw_ids, 1.0 - moving_weight
                )
                assigned += len(raw_ids)
            weight_receipt = {
                "logicalCoordinate": list(key),
                "ringIndex": ring_index,
                "topologicalArc": branch,
                "linearRadialWeight": linear_radial_weight,
                "geodesicCornerMask": corner_weight,
                "productSeedWeight": product_seed_weight,
                "movingWeight": moving_weight,
                "movingInfluences": [
                    {
                        "bone": name,
                        "normalizedBranchWeight": normalized_weight,
                        "finalWeight": moving_weight * normalized_weight,
                    }
                    for name, normalized_weight in influences
                ],
                "stationaryAnchorWeight": 1.0 - moving_weight,
            }
            for raw_id in raw_ids:
                raw_weight_receipts[str(raw_id)] = weight_receipt
    modifier = obj.modifiers.new("DirectRigifyBind", "ARMATURE")
    modifier.object = rig
    modifier.use_vertex_groups = True
    return {
        "method": (
            "topologically-ordered-upper-lower-ring-arcs-with-geodesic-corner-"
            "mask-times-radial-falloff-and-positive-inverse-segment-distance-"
            "weights"
        ),
        "maximumMovingInfluencesPerRawVertex": len(upper),
        "maximumTotalInfluencesPerRawVertex": len(upper) + 1,
        "influenceNormalization": (
            "positive-branch-segment-distance-sum-to-radial-times-corner-weight"
        ),
        "cornerMaskPolicy": (
            "zero-at-both-topological-shared-corners-one-at-each-arc-midpoint-"
            "from-exact-ring-geodesic-arclength"
        ),
        "radialFalloffPolicy": (
            "linear-exact-six-ring-index-times-geodesic-corner-mask"
        ),
        "armatureDeformation": "Blender-linear-blend-skinning",
        "ringArcReceipts": [
            {
                key: value
                for key, value in arc.items()
                if key not in ("labels", "masks", "paths")
            }
            for arc in ring_arcs
        ],
        "rawVertexWeightReceipts": raw_weight_receipts,
        "falloffAnchorDeformBone": stationary_anchor,
        "falloffAnchorPolicy": "identity-remainder-prevents-armature-weight-renormalization",
        "assignedRawVertices": assigned,
        "deformBones": upper + lower,
        "zeroMotionBoundaryRawVertices": sorted(boundary),
    }


def bind_jaw_region(
    obj: bpy.types.Object,
    rig: bpy.types.Object,
    regions: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    lower_lip_bones = sorted(
        name for name in rig.data.bones.keys() if name.startswith("DEF-lip") and ".B." in name
    )
    stationary_anchor = "DEF-head-static-anchor"
    anchor_head: Vector
    anchor_length: float
    if stationary_anchor not in rig.data.bones:
        target_points = list(key_points.values())
        target_center = sum(target_points, Vector()) / len(target_points)
        target_vertical_span = (
            max(point.y for point in target_points)
            - min(point.y for point in target_points)
        )
        anchor_length = target_vertical_span * 0.05
        if anchor_length <= 1.0e-6:
            raise RuntimeError(
                f"Exact target cannot derive stationary anchor length: {anchor_length}"
            )
        anchor_head = head_to_rig(target_center)
        bpy.context.view_layer.objects.active = rig
        rig.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        edit_anchor = rig.data.edit_bones.new(stationary_anchor)
        edit_anchor.head = anchor_head
        edit_anchor.tail = anchor_head + Vector((0.0, 0.0, anchor_length))
        edit_anchor.use_deform = True
        edit_anchor.parent = None
        bpy.ops.object.mode_set(mode="OBJECT")
    else:
        existing_anchor = rig.data.bones[stationary_anchor]
        anchor_head = existing_anchor.head_local.copy()
        anchor_length = existing_anchor.length
    if (
        len(lower_lip_bones) != 6
        or "DEF-jaw" not in rig.data.bones
        or stationary_anchor not in rig.data.bones
    ):
        raise RuntimeError(
            "Rigify jaw deform bones changed: "
            f"lower={lower_lip_bones}, jaw={'DEF-jaw' in rig.data.bones}, "
            f"stationaryAnchor={stationary_anchor in rig.data.bones}"
        )
    groups: dict[str, bpy.types.VertexGroup] = {}
    lower_keys = regions["mouthLower"]
    maximum_distance = max(regions["jawDistance"].values())
    assigned = 0
    boundary = []
    raw_weight_receipts = {}
    for key in sorted(regions["jaw"]):
        raw_ids = raw_for_key[key]
        if key in lower_keys:
            name = nearest_bone_name(head_to_rig(key_points[key]), rig, lower_lip_bones)
            add_weight(obj, groups, name, raw_ids, 1.0)
            assigned += len(raw_ids)
            weight_receipt = {
                "logicalCoordinate": list(key),
                "geodesicDistance": regions["jawDistance"][key],
                "movingInfluences": [{"bone": name, "weight": 1.0}],
                "stationaryAnchorWeight": 0.0,
            }
            for raw_id in raw_ids:
                raw_weight_receipts[str(raw_id)] = weight_receipt
            continue
        distance = regions["jawDistance"][key]
        weight = max(0.0, 1.0 - distance / maximum_distance) ** 2
        if weight <= 0.0:
            add_weight(obj, groups, stationary_anchor, raw_ids, 1.0)
            boundary.extend(raw_ids)
        else:
            add_weight(obj, groups, "DEF-jaw", raw_ids, weight)
            add_weight(obj, groups, stationary_anchor, raw_ids, 1.0 - weight)
            assigned += len(raw_ids)
        weight_receipt = {
            "logicalCoordinate": list(key),
            "geodesicDistance": distance,
            "movingInfluences": (
                [{"bone": "DEF-jaw", "weight": weight}] if weight > 0.0 else []
            ),
            "stationaryAnchorWeight": 1.0 - weight,
        }
        for raw_id in raw_ids:
            raw_weight_receipts[str(raw_id)] = weight_receipt
    modifier = obj.modifiers.new("DirectRigifyBind", "ARMATURE")
    modifier.object = rig
    modifier.use_vertex_groups = True
    return {
        "method": (
            "ordered-lower-lip-to-nearest-Rigify-DEF-lip-plus-geodesic-"
            "DEF-jaw-falloff-with-explicit-stationary-remainder"
        ),
        "assignedRawVertices": assigned,
        "lowerLipDeformBones": lower_lip_bones,
        "jawDeformBone": "DEF-jaw",
        "falloffAnchorDeformBone": stationary_anchor,
        "falloffAnchorPolicy": (
            "temporary-authoring-only-unparented-deform-bone-provides-identity-"
            "remainder-and-prevents-armature-weight-renormalization"
        ),
        "falloffAnchorDerivation": {
            "method": "exact-target-logical-bounds-center-and-vertical-span",
            "headRigLocal": list(anchor_head),
            "tailRigLocal": list(anchor_head + Vector((0.0, 0.0, anchor_length))),
            "lengthFractionOfExactTargetVerticalSpan": 0.05,
            "lengthMeters": anchor_length,
            "parent": None,
            "authoringOnly": True,
        },
        "maximumGeodesicDistance": maximum_distance,
        "rawVertexWeightReceipts": raw_weight_receipts,
        "zeroMotionBoundaryRawVertices": sorted(boundary),
    }


def clear_pose(rig: bpy.types.Object) -> None:
    for pose_bone in rig.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def evaluated_head_points(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [rig_to_head(vertex.co.copy()) for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def pose_eye_controls(
    rig: bpy.types.Object,
    side_region: dict[str, object],
    key_points: dict[tuple[float, float, float], Vector],
    travel_amplitude: float,
) -> dict[str, object]:
    clear_pose(rig)
    aperture_points = [key_points[key] for key in side_region["aperture"]]
    center_vertical = sum(point.y for point in aperture_points) / len(aperture_points)
    center_horizontal = sum(point.x for point in aperture_points) / len(aperture_points)
    radius_vertical = (
        max(point.y for point in aperture_points)
        - min(point.y for point in aperture_points)
    ) * 0.5
    radius_horizontal = (
        max(point.x for point in aperture_points)
        - min(point.x for point in aperture_points)
    ) * 0.5
    residual = radius_vertical * 0.04
    controls = {}
    for index in (2, 3, 4):
        top_name = f"lid{index}.T.L"
        bottom_name = f"lid{index}.B.L"
        top = rig.pose.bones.get(top_name)
        bottom = rig.pose.bones.get(bottom_name)
        if top is None or bottom is None:
            raise RuntimeError(
                f"Rigify blink control pair missing: {top_name}/{bottom_name}"
            )
        top_matrix = top.matrix.copy()
        bottom_matrix = bottom.matrix.copy()
        rest_top = float(top_matrix.translation.z)
        rest_bottom = float(bottom_matrix.translation.z)
        pair_horizontal = float(
            (top_matrix.translation.x + bottom_matrix.translation.x) * 0.5
        )
        normalized_corner_distance = min(
            1.0,
            abs(pair_horizontal - center_horizontal) / radius_horizontal,
        )
        geometric_closure_factor = 1.0 - normalized_corner_distance
        closure_factor = geometric_closure_factor * travel_amplitude
        pair_midpoint = (rest_top + rest_bottom) * 0.5
        target_top = rest_top + closure_factor * (
            pair_midpoint + residual - rest_top
        )
        target_bottom = rest_bottom + closure_factor * (
            pair_midpoint - residual - rest_bottom
        )
        top_matrix.translation.z = target_top
        bottom_matrix.translation.z = target_bottom
        top.matrix = top_matrix
        bottom.matrix = bottom_matrix
        controls[top_name] = {
            "restVertical": rest_top,
            "targetVertical": target_top,
            "measuredHorizontal": pair_horizontal,
            "cornerAnchorFactor": normalized_corner_distance,
            "geometricClosureFactor": geometric_closure_factor,
            "closureFactor": closure_factor,
        }
        controls[bottom_name] = {
            "restVertical": rest_bottom,
            "targetVertical": target_bottom,
            "measuredHorizontal": pair_horizontal,
            "cornerAnchorFactor": normalized_corner_distance,
            "geometricClosureFactor": geometric_closure_factor,
            "closureFactor": closure_factor,
        }
    bpy.context.view_layer.update()
    return {
        "method": (
            "paired-Rigify-lid-controls-converged-by-measured-horizontal-"
            "distance-with-exact-corner-anchoring"
        ),
        "parameterStatus": "FIRST_PROOF_REVIEW_PARAMETER_NOT_ANATOMICAL_CANON",
        "travelAmplitude": travel_amplitude,
        "residualFractionOfApertureRadius": 0.04,
        "exactApertureCenterVertical": center_vertical,
        "exactApertureCenterHorizontal": center_horizontal,
        "exactApertureRadiusVertical": radius_vertical,
        "exactApertureRadiusHorizontal": radius_horizontal,
        "residualGapPerSide": residual,
        "controls": controls,
    }


def float32_delta_sha(source: list[Vector], target: list[Vector]) -> str:
    digest = sha256()
    for start, end in zip(source, target, strict=True):
        digest.update(struct.pack("<3f", *(end - start)))
    return digest.hexdigest().upper()


def normalized_path_positions(
    path: list[tuple[float, float, float]],
    key_points: dict[tuple[float, float, float], Vector],
) -> list[float]:
    cumulative = [0.0]
    for first, second in zip(path, path[1:]):
        cumulative.append(
            cumulative[-1] + (key_points[second] - key_points[first]).length
        )
    if cumulative[-1] <= 0.0:
        raise RuntimeError("Exact eyelid path has zero length")
    return [distance / cumulative[-1] for distance in cumulative]


def sample_path_vertical(
    path: list[tuple[float, float, float]],
    positions: list[float],
    parameter: float,
    key_points: dict[tuple[float, float, float], Vector],
) -> float:
    for index in range(len(positions) - 1):
        first_parameter = positions[index]
        second_parameter = positions[index + 1]
        if parameter <= second_parameter or index == len(positions) - 2:
            span = max(second_parameter - first_parameter, 1.0e-12)
            factor = max(
                0.0, min(1.0, (parameter - first_parameter) / span)
            )
            first = key_points[path[index]].y
            second = key_points[path[index + 1]].y
            return first + factor * (second - first)
    raise RuntimeError(f"Normalized eyelid parameter is outside [0,1]: {parameter}")


def hybrid_exact_topology_blink(
    neutral: list[Vector],
    rigify_deformed: list[Vector],
    side_region: dict[str, object],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
    key_points: dict[tuple[float, float, float], Vector],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    residual_fraction: float,
) -> tuple[list[Vector], dict[str, object]]:
    ring_arcs = [
        ordered_eye_ring_arcs(ring, adjacency, key_points)
        for ring in side_region["rings"]
    ]
    aperture_points = [key_points[key] for key in side_region["aperture"]]
    aperture_radius = (
        max(point.y for point in aperture_points)
        - min(point.y for point in aperture_points)
    ) * 0.5
    aperture_radius_horizontal = (
        max(point.x for point in aperture_points)
        - min(point.x for point in aperture_points)
    ) * 0.5
    equivalent_eye_radius = (aperture_radius * aperture_radius_horizontal) ** 0.5
    eye_center = Vector(
        (
            (max(point.x for point in aperture_points) + min(point.x for point in aperture_points))
            * 0.5,
            (max(point.y for point in aperture_points) + min(point.y for point in aperture_points))
            * 0.5,
            sum(point.z for point in aperture_points) / len(aperture_points)
            - equivalent_eye_radius,
        )
    )
    residual = aperture_radius * residual_fraction
    target = [point.copy() for point in neutral]
    all_ring_keys = set().union(*side_region["rings"])
    fixed_angular_travel: dict[tuple[float, float, float], float] = {}
    constraint_roles: dict[tuple[float, float, float], str] = {}
    aperture_metadata: dict[tuple[float, float, float], dict[str, object]] = {}
    aperture_arc = ring_arcs[0]
    aperture_positions = {
        label: normalized_path_positions(path, key_points)
        for label, path in aperture_arc["paths"].items()
    }
    for label in ("upper", "lower"):
        own_path = aperture_arc["paths"][label]
        opposite_label = "lower" if label == "upper" else "upper"
        opposite_path = aperture_arc["paths"][opposite_label]
        for key, parameter in zip(
            own_path, aperture_positions[label], strict=True
        ):
            opposite_vertical = sample_path_vertical(
                opposite_path,
                aperture_positions[opposite_label],
                parameter,
                key_points,
            )
            meeting_vertical = (key_points[key].y + opposite_vertical) * 0.5
            desired_vertical = meeting_vertical + (
                residual if label == "upper" else -residual
            )
            neutral_offset = key_points[key] - eye_center
            yz_radius = math.hypot(neutral_offset.y, neutral_offset.z)
            if yz_radius <= 1.0e-12:
                raise RuntimeError(
                    f"Exact eyelid aperture vertex lies on derived eye center: {key}"
                )
            neutral_angle = math.atan2(neutral_offset.y, neutral_offset.z)
            desired_sine = max(
                -1.0,
                min(1.0, (desired_vertical - eye_center.y) / yz_radius),
            )
            desired_angle = math.asin(desired_sine)
            corner_mask = aperture_arc["masks"][key]
            fixed_angular_travel[key] = corner_mask * (
                desired_angle - neutral_angle
            )
            constraint_roles[key] = (
                "aperture-normalized-arc-driven"
                if corner_mask > 0.0
                else "aperture-corner-zero-Dirichlet"
            )
            aperture_metadata[key] = {
                "topologicalArc": label,
                "normalizedArcParameter": parameter,
                "oppositeMeasuredVertical": opposite_vertical,
                "meetingVertical": meeting_vertical,
                "desiredVertical": desired_vertical,
                "geodesicCornerMask": corner_mask,
                "pairedTargetAngularPositionRadians": desired_angle,
            }

    for key in side_region["rings"][5]:
        fixed_angular_travel[key] = 0.0
        constraint_roles[key] = "outer-boundary-zero-Dirichlet"
    ring_four_clearance_constraint_count = 0
    for key in side_region["rings"][4]:
        if ring_arcs[4]["masks"][key] <= 0.25:
            fixed_angular_travel[key] = 0.0
            constraint_roles[key] = "ring4-quarter-arc-clearance-zero-Dirichlet"
            ring_four_clearance_constraint_count += 1
    corner_constraint_count = 0
    for ring_index in (1, 2, 3):
        for key in side_region["rings"][ring_index]:
            if ring_arcs[ring_index]["masks"][key] <= 1.0e-12:
                fixed_angular_travel[key] = 0.0
                constraint_roles[key] = "ring-corner-zero-Dirichlet"
                corner_constraint_count += 1

    unknowns = sorted(
        set().union(*side_region["rings"][1:5]) - set(fixed_angular_travel)
    )
    tolerance = 1.0e-11
    outside_zero_neighbor_edges = 0
    for key in unknowns:
        outside_zero_neighbor_edges += sum(
            neighbor not in all_ring_keys for neighbor in adjacency[key]
        )
    unknown_index = {key: index for index, key in enumerate(unknowns)}
    matrix = np.zeros((len(unknowns), len(unknowns)), dtype=np.float64)
    right_hand_side = np.zeros(len(unknowns), dtype=np.float64)
    for key, row in unknown_index.items():
        neighbors = sorted(adjacency[key])
        if not neighbors:
            raise RuntimeError(f"Isolated exact eyelid support vertex: {key}")
        matrix[row, row] = len(neighbors)
        for neighbor in neighbors:
            if neighbor in unknown_index:
                matrix[row, unknown_index[neighbor]] -= 1.0
            else:
                right_hand_side[row] += fixed_angular_travel.get(neighbor, 0.0)
    matrix_rank = int(np.linalg.matrix_rank(matrix))
    if matrix_rank != len(unknowns):
        raise RuntimeError(
            "Exact eyelid uniform harmonic matrix is not full-rank: "
            f"{matrix_rank}/{len(unknowns)}"
        )
    solution = np.linalg.solve(matrix, right_hand_side)
    final_residual = float(
        np.max(np.abs(matrix @ solution - right_hand_side), initial=0.0)
    )
    if final_residual > tolerance:
        raise RuntimeError(
            "Exact eyelid uniform harmonic direct solve exceeds residual: "
            f"{final_residual}"
        )
    current = {
        key: float(solution[unknown_index[key]]) for key in unknowns
    }
    angular_travel = {**fixed_angular_travel, **current}
    if set(angular_travel) != all_ring_keys:
        raise RuntimeError(
            "Exact eyelid harmonic field does not cover the six-ring support: "
            f"missing={sorted(all_ring_keys - set(angular_travel))}"
        )
    solution_digest = sha256()
    for key in sorted(angular_travel):
        solution_digest.update(struct.pack("<3fd", *key, angular_travel[key]))
    matrix_digest = sha256()
    for key in unknowns:
        matrix_digest.update(struct.pack("<3f", *key))
    matrix_digest.update(matrix.astype("<f8", copy=False).tobytes(order="C"))
    matrix_digest.update(
        right_hand_side.astype("<f8", copy=False).tobytes(order="C")
    )

    vertex_receipts = {}
    for ring_index, (ring, arc) in enumerate(
        zip(side_region["rings"], ring_arcs, strict=True)
    ):
        path_metadata = {}
        for label in ("upper", "lower"):
            path = arc["paths"][label]
            positions = normalized_path_positions(path, key_points)
            for key, parameter in zip(path, positions, strict=True):
                path_metadata.setdefault(
                    key,
                    {
                        "topologicalArc": label,
                        "normalizedArcParameter": parameter,
                        "geodesicCornerMask": arc["masks"][key],
                    },
                )
        for key in sorted(ring):
                metadata = {**path_metadata[key], **aperture_metadata.get(key, {})}
                neutral_offset = key_points[key] - eye_center
                yz_radius = math.hypot(neutral_offset.y, neutral_offset.z)
                if yz_radius <= 1.0e-12:
                    raise RuntimeError(
                        f"Exact eyelid vertex lies on derived eye center: {key}"
                    )
                neutral_angle = math.atan2(neutral_offset.y, neutral_offset.z)
                target_angle = neutral_angle + angular_travel[key]
                desired_y = eye_center.y + yz_radius * math.sin(target_angle)
                desired_z = eye_center.z + yz_radius * math.cos(target_angle)
                delta_vertical = desired_y - key_points[key].y
                delta_depth = desired_z - key_points[key].z
                for raw_id in raw_for_key[key]:
                    point = neutral[raw_id].copy()
                    point.y = desired_y
                    point.z = desired_z
                    target[raw_id] = point
                    vertex_receipts[str(raw_id)] = {
                        "logicalCoordinate": list(key),
                        "ringIndex": ring_index,
                        **metadata,
                        "constraintRole": constraint_roles.get(
                            key, "uniform-harmonic-interior"
                        ),
                        "eyeCenterHeadLocal": list(eye_center),
                        "neutralYZRadiusMeters": yz_radius,
                        "neutralAngularPositionRadians": neutral_angle,
                        "harmonicAngularTravelRadians": angular_travel[key],
                        "finalAngularPositionRadians": target_angle,
                        "deltaVertical": delta_vertical,
                        "deltaDepth": delta_depth,
                    }
    horizontal_preservation = max(
        abs(end.x - start.x)
        for start, end in zip(neutral, target, strict=True)
    )
    if horizontal_preservation > 1.0e-12:
        raise RuntimeError(
            f"Exact-topology blink changed horizontal coordinates: {horizontal_preservation}"
        )
    yz_radius_preservation = max(
        abs(
            math.hypot(end.y - eye_center.y, end.z - eye_center.z)
            - math.hypot(start.y - eye_center.y, start.z - eye_center.z)
        )
        for start, end in zip(neutral, target, strict=True)
    )
    if yz_radius_preservation > 1.0e-8:
        raise RuntimeError(
            "Exact-topology blink does not preserve target-derived eye-sphere radius: "
            f"{yz_radius_preservation}"
        )
    corrective_deltas = [
        target_point - rigify_point
        for rigify_point, target_point in zip(
            rigify_deformed, target, strict=True
        )
    ]
    return target, {
        "method": (
            "Rigify-control-driven-exact-topology-corrective-from-normalized-"
            "upper-lower-geodesic-arc-pairing"
        ),
        "parameterStatus": "FIRST_PROOF_REVIEW_PARAMETER_NOT_ANATOMICAL_CANON",
        "residualFractionOfApertureRadius": residual_fraction,
        "residualGapPerSideMeters": residual,
        "cornerPolicy": "exact-shared-corners-fixed",
        "outerBoundaryPolicy": (
            "sixth-ring-fixed-plus-fifth-ring-normalized-quarter-arc-corner-"
            "clearance-bands-fixed"
        ),
        "radialFalloff": (
            "deterministic-positive-uniform-harmonic-extension-of-aperture-"
            "angular-travel-to-zero-Dirichlet-corners-and-outer-rings"
        ),
        "harmonicExtension": {
            "solver": "NumPy-float64-direct-uniform-positive-logical-Laplacian",
            "unknownLogicalVertexCount": len(unknowns),
            "apertureConstraintCount": len(side_region["rings"][0]),
            "cornerZeroConstraintCount": corner_constraint_count,
            "ringFourClearanceZeroConstraintCount": (
                ring_four_clearance_constraint_count
            ),
            "ringFourClearanceMaximumNormalizedCornerMask": 0.25,
            "outerZeroConstraintCount": len(side_region["rings"][5]),
            "implicitOutsideZeroNeighborEdgeCount": outside_zero_neighbor_edges,
            "toleranceRadians": tolerance,
            "finalMaximumLinearResidualRadians": final_residual,
            "matrixRank": matrix_rank,
            "matrixConditionNumber": float(np.linalg.cond(matrix)),
            "orderedMatrixAndRightHandSideSha256": matrix_digest.hexdigest().upper(),
            "solutionFloat64Sha256": solution_digest.hexdigest().upper(),
        },
        "surfaceTravelPolicy": (
            "preserve-per-vertex-YZ-radius-about-target-derived-eye-center-"
            "and-interpolate-angular-position"
        ),
        "eyeCenterHeadLocal": list(eye_center),
        "equivalentEyeRadiusMeters": equivalent_eye_radius,
        "horizontalPreservationMaximumDeltaMeters": horizontal_preservation,
        "yzRadiusPreservationMaximumErrorMeters": yz_radius_preservation,
        "rigifyEvaluatedDeltaFloat32Sha256": float32_delta_sha(
            neutral, rigify_deformed
        ),
        "correctiveDeltaFloat32Sha256": float32_delta_sha(
            rigify_deformed, target
        ),
        "finalDeltaFloat32Sha256": float32_delta_sha(neutral, target),
        "correctiveMaximumDeltaMeters": max(
            delta.length for delta in corrective_deltas
        ),
        "rawVertexReceipts": vertex_receipts,
    }


def harmonic_jaw_influence(
    regions: dict[str, object],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
    key_points: dict[tuple[float, float, float], Vector],
    raw_for_key: dict[tuple[float, float, float], list[int]],
) -> tuple[
    dict[tuple[float, float, float], float],
    dict[str, object],
]:
    jaw_keys = set(regions["jaw"])
    components = regions["surfaceComponents"]
    exterior = components[0]
    lower_oral_sheets = [
        (index, component)
        for index, component in enumerate(components[1:], start=1)
        if component & regions["mouthLower"]
        and not component & regions["mouthUpper"]
    ]
    upper_oral_sheets = [
        (index, component)
        for index, component in enumerate(components[1:], start=1)
        if component & regions["mouthUpper"]
        and not component & regions["mouthLower"]
    ]
    if len(lower_oral_sheets) != 1 or len(upper_oral_sheets) != 1:
        raise RuntimeError(
            "Exact oral sheet classification changed: "
            f"lower={[index for index, _component in lower_oral_sheets]}, "
            f"upper={[index for index, _component in upper_oral_sheets]}"
        )
    lower_sheet_index, lower_sheet = lower_oral_sheets[0]
    upper_sheet_index, upper_sheet = upper_oral_sheets[0]
    exterior_jaw = jaw_keys & exterior
    exterior_lower_lip_support = set(regions["mouthLower"]) & exterior
    if not exterior_lower_lip_support <= exterior_jaw:
        raise RuntimeError("Exact lower-lip constraints escape the semantic jaw region")
    lower_mandible_vertical = min(
        key_points[key].y for key in exterior_lower_lip_support
    )
    lower_mandible_core = {
        key
        for key in exterior_jaw
        if key_points[key].y <= lower_mandible_vertical
    }
    exterior_moving_constraints = lower_mandible_core
    moving_constraints = exterior_moving_constraints | lower_sheet
    maximum_distance = max(regions["jawDistance"].values())
    zero_constraints = {
        key
        for key in exterior_jaw - exterior_moving_constraints
        if key not in exterior_lower_lip_support
        and (
            key in regions["seam"]
            or regions["jawDistance"][key] == maximum_distance
            or any(neighbor not in exterior_jaw for neighbor in adjacency[key])
        )
    }
    fixed = {
        **{key: 1.0 for key in moving_constraints},
        **{key: 0.0 for key in zero_constraints},
    }
    unknowns = sorted(exterior_jaw - set(fixed))
    unknown_index = {key: index for index, key in enumerate(unknowns)}
    matrix = np.zeros((len(unknowns), len(unknowns)), dtype=np.float64)
    right_hand_side = np.zeros(len(unknowns), dtype=np.float64)
    outside_zero_neighbor_edges = 0
    for key, row in unknown_index.items():
        neighbors = sorted(adjacency[key])
        if not neighbors:
            raise RuntimeError(f"Isolated exact jaw support vertex: {key}")
        matrix[row, row] = len(neighbors)
        for neighbor in neighbors:
            if neighbor in unknown_index:
                matrix[row, unknown_index[neighbor]] -= 1.0
            elif neighbor in fixed:
                right_hand_side[row] += fixed[neighbor]
            else:
                outside_zero_neighbor_edges += 1
    matrix_rank = int(np.linalg.matrix_rank(matrix))
    if matrix_rank != len(unknowns):
        raise RuntimeError(
            "Exact jaw uniform harmonic matrix is not full-rank: "
            f"{matrix_rank}/{len(unknowns)}"
        )
    solution = np.linalg.solve(matrix, right_hand_side)
    tolerance = 1.0e-11
    final_residual = float(
        np.max(np.abs(matrix @ solution - right_hand_side), initial=0.0)
    )
    if final_residual > tolerance:
        raise RuntimeError(
            "Exact jaw uniform harmonic direct solve exceeds residual: "
            f"{final_residual}"
        )
    if (
        float(np.min(solution, initial=0.0)) < -1.0e-10
        or float(np.max(solution, initial=1.0)) > 1.0 + 1.0e-10
    ):
        raise RuntimeError(
            "Exact jaw harmonic influence violates the positive maximum principle: "
            f"{float(np.min(solution))}/{float(np.max(solution))}"
        )
    influence = {
        **fixed,
        **{key: float(solution[index]) for key, index in unknown_index.items()},
    }
    if set(influence) != jaw_keys:
        raise RuntimeError(
            f"Exact jaw harmonic field is incomplete: {len(influence)}/{len(jaw_keys)}"
        )
    matrix_digest = sha256()
    for key in unknowns:
        matrix_digest.update(struct.pack("<3f", *key))
    matrix_digest.update(matrix.astype("<f8", copy=False).tobytes(order="C"))
    matrix_digest.update(
        right_hand_side.astype("<f8", copy=False).tobytes(order="C")
    )
    solution_digest = sha256()
    for key in sorted(influence):
        solution_digest.update(struct.pack("<3fd", *key, influence[key]))
    zero_raw = sorted(
        raw_id for key in zero_constraints for raw_id in raw_for_key[key]
    )
    return influence, {
        "solver": "NumPy-float64-direct-uniform-positive-logical-Laplacian",
        "field": "scalar-jaw-rotation-influence-alpha",
        "movingConstraintCount": len(moving_constraints),
        "lowerLipConstraintCount": 0,
        "lowerLipTransitionSupportCount": len(exterior_lower_lip_support),
        "lowerLipTransitionPolicy": (
            "uniform-harmonic-interior-between-rigid-lower-mandible-core-and-"
            "stationary-upper-mouth-neighbors"
        ),
        "lowerMandibleCoreConstraintCount": len(lower_mandible_core),
        "lowerMandibleCoreMaximumHeadLocalVertical": lower_mandible_vertical,
        "zeroBoundaryConstraintCount": len(zero_constraints),
        "unknownLogicalVertexCount": len(unknowns),
        "implicitOutsideZeroNeighborEdgeCount": outside_zero_neighbor_edges,
        "minimumInfluence": min(influence.values()),
        "maximumInfluence": max(influence.values()),
        "tolerance": tolerance,
        "finalMaximumLinearResidual": final_residual,
        "matrixRank": matrix_rank,
        "matrixConditionNumber": float(np.linalg.cond(matrix)),
        "orderedMatrixAndRightHandSideSha256": matrix_digest.hexdigest().upper(),
        "solutionFloat64Sha256": solution_digest.hexdigest().upper(),
        "componentPolicy": {
            "exteriorComponentIndex": 0,
            "exteriorComponentSize": len(exterior),
            "exteriorJawVertexCount": len(exterior_jaw),
            "lowerOralSheetComponentIndex": lower_sheet_index,
            "lowerOralSheetVertexCount": len(lower_sheet),
            "lowerOralSheetPolicy": "rigid-alpha-one-with-jaw",
            "upperOralSheetComponentIndex": upper_sheet_index,
            "upperOralSheetVertexCount": len(upper_sheet),
            "upperOralSheetPolicy": "outside-jaw-support-exactly-stationary",
        },
        "zeroMotionBoundaryRawVertices": zero_raw,
        "logicalInfluences": [
            {
                "logicalCoordinate": list(key),
                "alpha": influence[key],
                "constraintRole": (
                    "lower-lip-or-mandible-core-one-Dirichlet"
                    if key in moving_constraints
                    else (
                        "semantic-boundary-zero-Dirichlet"
                        if key in zero_constraints
                        else "uniform-harmonic-interior"
                    )
                ),
            }
            for key in sorted(influence)
        ],
    }


def hybrid_exact_topology_jaw(
    neutral: list[Vector],
    rigify_deformed: list[Vector],
    regions: dict[str, object],
    key_points: dict[tuple[float, float, float], Vector],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    influence: dict[tuple[float, float, float], float],
    pivot_rig_local: Vector,
    angle_radians: float,
) -> tuple[list[Vector], dict[str, object]]:
    target = [point.copy() for point in neutral]
    vertex_receipts = {}
    logical_hinge_radius_errors = []
    for key in sorted(regions["jaw"]):
        alpha = influence[key]
        angular_travel = alpha * angle_radians
        representative = key_points[key]
        offset_rig = head_to_rig(representative) - pivot_rig_local
        rotated_rig = (
            pivot_rig_local
            + Matrix.Rotation(angular_travel, 3, "X") @ offset_rig
        )
        moved_representative = rig_to_head(rotated_rig)
        delta = moved_representative - representative
        logical_hinge_radius_errors.append(
            abs(
                (head_to_rig(moved_representative) - pivot_rig_local).length
                - offset_rig.length
            )
        )
        for raw_id in raw_for_key[key]:
            target[raw_id] = neutral[raw_id] + delta
            vertex_receipts[str(raw_id)] = {
                "logicalCoordinate": list(key),
                "harmonicInfluenceAlpha": alpha,
                "angularTravelRadians": angular_travel,
                "deltaHeadLocal": list(delta),
            }
    horizontal_preservation = max(
        abs(end.x - start.x)
        for start, end in zip(neutral, target, strict=True)
    )
    if horizontal_preservation > 1.0e-12:
        raise RuntimeError(
            f"Exact-topology jaw changed horizontal coordinates: {horizontal_preservation}"
        )
    raw_hinge_radius_preservation = max(
        abs(
            (head_to_rig(end) - pivot_rig_local).length
            - (head_to_rig(start) - pivot_rig_local).length
        )
        for start, end in zip(neutral, target, strict=True)
    )
    hinge_radius_preservation = max(logical_hinge_radius_errors)
    hinge_radius_scale = max(
        (head_to_rig(point) - pivot_rig_local).length for point in neutral
    )
    float32_radius_ulp = abs(float(np.spacing(np.float32(hinge_radius_scale))))
    float32_radius_tolerance = 4.0 * float32_radius_ulp
    if (
        hinge_radius_preservation > float32_radius_tolerance
        or raw_hinge_radius_preservation > float32_radius_tolerance
    ):
        raise RuntimeError(
            "Exact-topology jaw does not preserve hinge radius: "
            f"logical={hinge_radius_preservation}, "
            f"raw={raw_hinge_radius_preservation}, "
            f"fourFloat32Ulps={float32_radius_tolerance}"
        )
    corrective_deltas = [
        target_point - rigify_point
        for rigify_point, target_point in zip(
            rigify_deformed, target, strict=True
        )
    ]
    return target, {
        "method": (
            "Rigify-jaw-control-driven-exact-topology-corrective-with-"
            "harmonic-scalar-rigid-like-mandibular-rotation"
        ),
        "parameterStatus": "FIRST_PROOF_REVIEW_PARAMETER_NOT_ANATOMICAL_CANON",
        "pivotRigLocal": list(pivot_rig_local),
        "angleRadians": angle_radians,
        "surfaceTravelPolicy": (
            "rotate-each-logical-point-by-alpha-times-control-angle-about-"
            "target-fitted-Rigify-hinge"
        ),
        "horizontalPreservationMaximumDeltaMeters": horizontal_preservation,
        "hingeRadiusPreservationMaximumErrorMeters": hinge_radius_preservation,
        "rawDuplicateHingeRadiusMaximumErrorMeters": (
            raw_hinge_radius_preservation
        ),
        "hingeRadiusFloat32PrecisionGate": {
            "exactHeadMaximumRadiusScaleMeters": hinge_radius_scale,
            "float32UlpAtScaleMeters": float32_radius_ulp,
            "allowedUlpCount": 4,
            "toleranceMeters": float32_radius_tolerance,
        },
        "rigifyEvaluatedDeltaFloat32Sha256": float32_delta_sha(
            neutral, rigify_deformed
        ),
        "correctiveDeltaFloat32Sha256": float32_delta_sha(
            rigify_deformed, target
        ),
        "finalDeltaFloat32Sha256": float32_delta_sha(neutral, target),
        "correctiveMaximumDeltaMeters": max(
            delta.length for delta in corrective_deltas
        ),
        "rawVertexReceipts": vertex_receipts,
    }


def jaw_overlap_diagnostics(
    overlaps: list[dict[str, object]],
    raw_keys: list[tuple[float, float, float]],
    regions: dict[str, object],
    influence: dict[tuple[float, float, float], float],
    influence_receipt: dict[str, object],
) -> list[dict[str, object]]:
    component_by_key = {
        key: index
        for index, component in enumerate(regions["surfaceComponents"])
        for key in component
    }
    role_by_key = {
        tuple(entry["logicalCoordinate"]): entry["constraintRole"]
        for entry in influence_receipt["logicalInfluences"]
    }

    def vertices(raw_ids: list[int]) -> list[dict[str, object]]:
        return [
            {
                "rawVertexIndex": raw_id,
                "logicalCoordinate": list(raw_keys[raw_id]),
                "componentIndex": component_by_key[raw_keys[raw_id]],
                "alpha": influence.get(raw_keys[raw_id], 0.0),
                "constraintRole": role_by_key.get(
                    raw_keys[raw_id], "outside-jaw-support-exactly-stationary"
                ),
            }
            for raw_id in raw_ids
        ]

    return [
        {
            "polygonIndices": overlap["polygonIndices"],
            "firstVertices": vertices(overlap["firstRawVertexIndices"]),
            "secondVertices": vertices(overlap["secondRawVertexIndices"]),
        }
        for overlap in overlaps[:10]
    ]


def pose_jaw_control(
    obj: bpy.types.Object,
    rig: bpy.types.Object,
    regions: dict[str, object],
    key_points: dict[tuple[float, float, float], Vector],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    stationary_anchor: str,
    angle_amplitude: float,
) -> tuple[list[Vector], dict[str, object]]:
    jaw = rig.pose.bones.get("jaw")
    if jaw is None:
        raise RuntimeError("Rigify jaw control missing")
    anchor_pose = rig.pose.bones.get(stationary_anchor)
    anchor_rest = rig.data.bones.get(stationary_anchor)
    if anchor_pose is None or anchor_rest is None:
        raise RuntimeError(f"Rigify jaw stationary anchor missing: {stationary_anchor}")
    target_lips = [key_points[key] for key in regions["mouthUpper"] | regions["mouthLower"]]
    mouth_width = max(point.x for point in target_lips) - min(point.x for point in target_lips)
    pivot = rig.data.bones["jaw"].head_local
    lip_center = sum((head_to_rig(point) for point in target_lips), Vector()) / len(target_lips)
    lever = max((lip_center - pivot).length, 1.0e-6)
    desired_opening = mouth_width * 0.42
    base_angle = min(math.radians(16.0), math.atan2(desired_opening, lever))
    if not (0.0 < angle_amplitude <= 1.0):
        raise RuntimeError(f"Jaw angle amplitude is outside (0,1]: {angle_amplitude}")
    angle = base_angle * angle_amplitude
    lower_raw = [
        raw_for_key[key][0]
        for key in regions["mouthLower"]
    ]
    candidates = []
    for sign in (1.0, -1.0):
        clear_pose(rig)
        jaw.rotation_mode = "XYZ"
        jaw.rotation_euler.x = sign * angle
        bpy.context.view_layer.update()
        points = evaluated_head_points(obj)
        lower_mean = sum(points[index].y for index in lower_raw) / len(lower_raw)
        candidates.append((lower_mean, sign, points))
    lower_mean, sign, points = min(candidates, key=lambda item: (item[0], item[1]))
    clear_pose(rig)
    jaw.rotation_mode = "XYZ"
    jaw.rotation_euler.x = sign * angle
    bpy.context.view_layer.update()
    points = evaluated_head_points(obj)
    anchor_deformation = anchor_pose.matrix @ anchor_rest.matrix_local.inverted()
    identity = Matrix.Identity(4)
    anchor_maximum_deviation = max(
        abs(anchor_deformation[row][column] - identity[row][column])
        for row in range(4)
        for column in range(4)
    )
    if anchor_maximum_deviation > 1.0e-8:
        raise ProofGateError(
            f"Jaw falloff anchor {stationary_anchor} moves under jaw control",
            {
                "gate": "jaw-stationary-anchor-transform",
                "target": "jawOpen",
                "stationaryAnchor": stationary_anchor,
                "maximumMatrixDeviationFromIdentity": anchor_maximum_deviation,
                "deformationMatrix": [list(row) for row in anchor_deformation],
            },
        )
    return points, {
        "method": "Rigify-jaw-control-angle-from-exact-mouth-width-and-derived-pivot-lever",
        "parameterStatus": "FIRST_PROOF_REVIEW_PARAMETER_NOT_ANATOMICAL_CANON",
        "desiredOpeningFractionOfMouthWidth": 0.42,
        "maximumAngleDegrees": 16.0,
        "control": "jaw",
        "mouthWidth": mouth_width,
        "pivotToLipLever": lever,
        "desiredOpening": desired_opening,
        "baseAngleRadians": base_angle,
        "angleAmplitude": angle_amplitude,
        "angleRadians": sign * angle,
        "pivotRigLocal": list(pivot),
        "selectedLowerLipMeanVertical": lower_mean,
        "stationaryAnchor": {
            "bone": stationary_anchor,
            "maximumMatrixDeviationFromIdentity": anchor_maximum_deviation,
            "deformationMatrix": [list(row) for row in anchor_deformation],
        },
    }


def exact_intersection_precision(points: list[Vector]) -> dict[str, float | int | str]:
    coordinate_scale = max(
        abs(coordinate)
        for point in points
        for coordinate in point
    )
    if not math.isfinite(coordinate_scale) or coordinate_scale <= 0.0:
        raise RuntimeError(
            f"Exact head has invalid intersection coordinate scale: {coordinate_scale}"
        )
    float32_ulp = abs(float(np.spacing(np.float32(coordinate_scale))))
    if not math.isfinite(float32_ulp) or float32_ulp <= 0.0:
        raise RuntimeError(
            f"Exact head has invalid float32 intersection ULP: {float32_ulp}"
        )
    factor = 4
    return {
        "method": (
            "complete-deterministic-triangle-AABB-sweep-plus-conservative-"
            "SAT-with-exact-Basis-float32-ULP"
        ),
        "coordinateScaleMeters": coordinate_scale,
        "float32UlpMeters": float32_ulp,
        "ulpFactor": factor,
        "toleranceMeters": factor * float32_ulp,
    }


def triangles_intersect_sat(
    first: tuple[int, int, int],
    second: tuple[int, int, int],
    points: list[Vector],
    tolerance: float,
) -> bool:
    first_points = [points[index] for index in first]
    second_points = [points[index] for index in second]
    first_edges = [
        first_points[(index + 1) % 3] - first_points[index]
        for index in range(3)
    ]
    second_edges = [
        second_points[(index + 1) % 3] - second_points[index]
        for index in range(3)
    ]
    first_normal = first_edges[0].cross(first_edges[1])
    second_normal = second_edges[0].cross(second_edges[1])
    if first_normal.length_squared <= 1.0e-24 or second_normal.length_squared <= 1.0e-24:
        # A degenerate triangle cannot establish a separating plane, so retain it
        # as an intersection candidate and fail closed in the caller.
        return True
    axes = [first_normal, second_normal]
    axes.extend(
        first_edge.cross(second_edge)
        for first_edge in first_edges
        for second_edge in second_edges
    )
    # Edge-cross-edge axes collapse onto the shared normal for coplanar
    # triangles.  These in-plane axes keep the SAT complete in that case.
    axes.extend(first_normal.cross(edge) for edge in first_edges)
    axes.extend(second_normal.cross(edge) for edge in second_edges)
    for axis in axes:
        length_squared = axis.length_squared
        if length_squared <= 1.0e-24:
            continue
        unit_axis = axis / math.sqrt(length_squared)
        first_projection = [point.dot(unit_axis) for point in first_points]
        second_projection = [point.dot(unit_axis) for point in second_points]
        if (
            max(first_projection) < min(second_projection) - tolerance
            or max(second_projection) < min(first_projection) - tolerance
        ):
            return False
    return True


def nonadjacent_self_overlaps(
    points: list[Vector],
    polygons: list[tuple[int, int, int]],
    raw_keys: list[tuple[float, float, float]],
    intersection_precision: dict[str, float | int | str],
) -> set[tuple[int, int]]:
    tolerance = float(intersection_precision["toleranceMeters"])
    bounds = []
    for polygon_index, polygon in enumerate(polygons):
        polygon_points = [points[index] for index in polygon]
        bounds.append(
            (
                min(point.x for point in polygon_points) - tolerance,
                max(point.x for point in polygon_points) + tolerance,
                min(point.y for point in polygon_points) - tolerance,
                max(point.y for point in polygon_points) + tolerance,
                min(point.z for point in polygon_points) - tolerance,
                max(point.z for point in polygon_points) + tolerance,
                polygon_index,
            )
        )
    active: list[tuple[float, float, float, float, float, float, int]] = []
    candidates: set[tuple[int, int]] = set()
    for current in sorted(bounds, key=lambda item: (item[0], item[6])):
        active = [item for item in active if item[1] >= current[0]]
        for other in active:
            if (
                other[3] >= current[2]
                and current[3] >= other[2]
                and other[5] >= current[4]
                and current[5] >= other[4]
            ):
                candidates.add(tuple(sorted((other[6], current[6]))))
        active.append(current)
    polygon_logical_sets = [
        {raw_keys[index] for index in polygon} for polygon in polygons
    ]
    return {
        (first, second)
        for first, second in sorted(candidates)
        if not polygon_logical_sets[first] & polygon_logical_sets[second]
        and triangles_intersect_sat(
            polygons[first], polygons[second], points, tolerance
        )
    }


def deformation_gate(
    name: str,
    neutral: list[Vector],
    deformed: list[Vector],
    polygons: list[tuple[int, int, int]],
    raw_keys: list[tuple[float, float, float]],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    allowed_keys: set[tuple[float, float, float]],
    seam_keys: set[tuple[float, float, float]],
    baseline_overlaps: set[tuple[int, int]],
    intersection_precision: dict[str, float | int | str],
) -> dict[str, object]:
    allowed_raw = {index for key in allowed_keys for index in raw_for_key[key]}
    seam_raw = {index for key in seam_keys for index in raw_for_key[key]}
    deltas = [target - source for source, target in zip(neutral, deformed, strict=True)]
    outside_maximum = max(
        (delta.length for index, delta in enumerate(deltas) if index not in allowed_raw),
        default=0.0,
    )
    seam_maximum = max((deltas[index].length for index in seam_raw), default=0.0)
    if outside_maximum > 1.0e-7 or seam_maximum > 1.0e-7:
        raise RuntimeError(
            f"{name} escapes its semantic region: outside={outside_maximum}, seam={seam_maximum}"
        )
    parity_maximum = 0.0
    for raw_ids in raw_for_key.values():
        reference = deltas[raw_ids[0]]
        for index in raw_ids[1:]:
            parity_maximum = max(
                parity_maximum, float((deltas[index] - reference).length)
            )
    if parity_maximum > 1.0e-7:
        raise RuntimeError(f"{name} breaks duplicate-coordinate parity: {parity_maximum}")
    flips = []
    for polygon_index, (a, b, c) in enumerate(polygons):
        neutral_normal = (neutral[b] - neutral[a]).cross(neutral[c] - neutral[a])
        target_normal = (deformed[b] - deformed[a]).cross(deformed[c] - deformed[a])
        if (
            neutral_normal.length > 1.0e-12
            and target_normal.length > 1.0e-12
            and neutral_normal.dot(target_normal) <= 0.0
        ):
            flips.append(
                {
                    "polygonIndex": polygon_index,
                    "rawVertexIndices": [a, b, c],
                    "logicalCoordinates": [list(neutral[index]) for index in (a, b, c)],
                    "deformedCoordinates": [list(deformed[index]) for index in (a, b, c)],
                    "deltaVectors": [list(deltas[index]) for index in (a, b, c)],
                    "neutralNormal": list(neutral_normal),
                    "deformedNormal": list(target_normal),
                    "normalDot": float(neutral_normal.dot(target_normal)),
                    "insideAllowedRegion": [index in allowed_raw for index in (a, b, c)],
                }
            )
    if flips:
        raise ProofGateError(
            f"{name} flips {len(flips)} exact-head triangles",
            {
                "gate": "exact-head-triangle-orientation",
                "target": name,
                "flipCount": len(flips),
                "flippedTriangles": flips,
                "intersectionPrecision": intersection_precision,
            },
        )
    new_overlaps = (
        nonadjacent_self_overlaps(
            deformed, polygons, raw_keys, intersection_precision
        )
        - baseline_overlaps
    )
    if new_overlaps:
        overlap_details = [
            {
                "polygonIndices": [first, second],
                "firstRawVertexIndices": list(polygons[first]),
                "secondRawVertexIndices": list(polygons[second]),
                "firstDeformedCoordinates": [
                    list(deformed[index]) for index in polygons[first]
                ],
                "secondDeformedCoordinates": [
                    list(deformed[index]) for index in polygons[second]
                ],
            }
            for first, second in sorted(new_overlaps)
        ]
        raise ProofGateError(
            f"{name} creates {len(new_overlaps)} new nonadjacent overlaps",
            {
                "gate": "exact-head-nonadjacent-overlap",
                "target": name,
                "flipCount": 0,
                "newNonadjacentOverlapCount": len(new_overlaps),
                "newNonadjacentOverlaps": overlap_details,
                "intersectionPrecision": intersection_precision,
            },
        )
    affected = sum(delta.length > 1.0e-7 for delta in deltas)
    maximum = max(delta.length for delta in deltas)
    if affected < 12 or not (1.0e-4 <= maximum <= 0.035):
        raise RuntimeError(f"{name} is not a bounded meaningful morph: {affected}/{maximum}")
    digest = sha256()
    for delta in deltas:
        digest.update(struct.pack("<3f", *delta))
    return {
        "affectedRawVertices": affected,
        "maximumDeltaMeters": maximum,
        "outsideRegionMaximumDeltaMeters": outside_maximum,
        "neckSeamMaximumDeltaMeters": seam_maximum,
        "duplicateParityMaximumDeltaMeters": parity_maximum,
        "triangleFlipCount": len(flips),
        "newNonadjacentOverlapCount": len(new_overlaps),
        "intersectionPrecision": intersection_precision,
        "deltaFloat32Sha256": digest.hexdigest().upper(),
    }


def bake_shape_key(
    head: bpy.types.Object,
    armature: bpy.types.Object,
    name: str,
    points: list[Vector],
) -> None:
    key = head.shape_key_add(name=name, from_mix=False)
    for index, point in enumerate(points):
        key.data[index].co = object_point_from_head_local(head, armature, point)


def blink_gap_metrics(
    neutral: list[Vector],
    deformed: list[Vector],
    side_region: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    ordered = sorted(side_region["aperture"], key=lambda key: key_points[key].y)
    lower, upper = ordered[:4], ordered[-4:]
    neutral_gap = (
        sum(neutral[raw_for_key[key][0]].y for key in upper) / len(upper)
        - sum(neutral[raw_for_key[key][0]].y for key in lower) / len(lower)
    )
    target_gap = (
        sum(deformed[raw_for_key[key][0]].y for key in upper) / len(upper)
        - sum(deformed[raw_for_key[key][0]].y for key in lower) / len(lower)
    )
    ratio = target_gap / neutral_gap
    return {
        "neutralApertureGapMeters": neutral_gap,
        "closedApertureGapMeters": target_gap,
        "closedOverNeutral": ratio,
    }


def blink_gap_receipt(
    neutral: list[Vector],
    deformed: list[Vector],
    side_region: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    metrics = blink_gap_metrics(
        neutral, deformed, side_region, raw_for_key, key_points
    )
    if not (0.0 < metrics["closedOverNeutral"] <= 0.35):
        raise RuntimeError(
            "Rigify blink does not close the aperture: "
            f"{metrics['neutralApertureGapMeters']}->"
            f"{metrics['closedApertureGapMeters']}"
        )
    return metrics


def mouth_cavity_metrics(
    neutral: list[Vector],
    deformed: list[Vector],
    regions: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    upper = [key for key in regions["mouthUpper"] if abs(key_points[key].x) <= 0.006]
    lower = [key for key in regions["mouthLower"] if abs(key_points[key].x) <= 0.006]
    neutral_gap = (
        sum(neutral[raw_for_key[key][0]].y for key in upper) / len(upper)
        - sum(neutral[raw_for_key[key][0]].y for key in lower) / len(lower)
    )
    target_gap = (
        sum(deformed[raw_for_key[key][0]].y for key in upper) / len(upper)
        - sum(deformed[raw_for_key[key][0]].y for key in lower) / len(lower)
    )
    sheets = regions["surfaceComponents"][1:]
    exterior = regions["surfaceComponents"][0]
    outer_depth = max(key_points[key].z for key in exterior & regions["mouthUpper"])
    recessed_depth = max(
        key_points[key].z
        for component in sheets
        for key in component & (regions["mouthUpper"] | regions["mouthLower"])
    )
    recession = outer_depth - recessed_depth
    return {
        "neutralCentralLipGapMeters": neutral_gap,
        "openCentralLipGapMeters": target_gap,
        "openingIncreaseMeters": target_gap - neutral_gap,
        "recessedSheetComponentSizes": [len(component) for component in sheets],
        "outerToRecessedDepthMeters": recession,
        "teethTongueStatus": "ABSENT_NOT_CLAIMED_IN_THREE_TARGET_PROOF",
    }


def mouth_cavity_receipt(
    neutral: list[Vector],
    deformed: list[Vector],
    regions: dict[str, object],
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
) -> dict[str, object]:
    metrics = mouth_cavity_metrics(
        neutral, deformed, regions, raw_for_key, key_points
    )
    if (
        metrics["openingIncreaseMeters"] < 0.002
        or metrics["outerToRecessedDepthMeters"] < 0.003
    ):
        raise RuntimeError(
            "jawOpen exposes no proven recessed mouth cavity: "
            f"gap={metrics['neutralCentralLipGapMeters']}->"
            f"{metrics['openCentralLipGapMeters']}, "
            f"recession={metrics['outerToRecessedDepthMeters']}"
        )
    return metrics


def material_receipt(head: bpy.types.Object) -> dict[str, object]:
    materials = []
    for slot in head.material_slots:
        material = slot.material
        if material is None:
            continue
        images = []
        if material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image is not None:
                    images.append(
                        {
                            "name": node.image.name,
                            "size": list(node.image.size),
                            "source": node.image.source,
                        }
                    )
        materials.append(
            {
                "name": material.name,
                "useNodes": material.use_nodes,
                "images": images,
            }
        )
    if not materials:
        raise RuntimeError("Exact head has no imported PBR material")
    return {
        "policy": "PRESERVE_IMPORTED_PBR_OR_USE_NEUTRAL_MATTE_GRAY_ONLY",
        "materials": materials,
    }


def alignment_audit(args: argparse.Namespace) -> dict[str, object]:
    source = Path(args.source_glb).resolve()
    evidence = Path(args.evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    head, _body, armature = import_locked_source(source)
    basis = mesh_basis_signature(head)
    points = head_local_points(head, armature)
    _raw_keys, raw_for_key, key_points, adjacency, faces = logical_topology(head, points)
    regions = exact_regions(raw_for_key, key_points, adjacency, faces)
    rigify_receipt, skin_eye, skin_jaw = enable_rigify()
    modules = [
        generate_aligned_module(
            "eye-left",
            skin_eye,
            lambda meta: fit_eye_metarig(
                meta, "left", regions["eyes"]["left"]["rings"], key_points
            ),
        ),
        generate_aligned_module(
            "eye-right",
            skin_eye,
            lambda meta: fit_eye_metarig(
                meta, "right", regions["eyes"]["right"]["rings"], key_points
            ),
        ),
        generate_aligned_module(
            "jaw", skin_jaw, lambda meta: fit_jaw_metarig(meta, regions, key_points)
        ),
    ]
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if armatures != [armature]:
        raise RuntimeError(
            f"Temporary Rigify armatures were not stripped: {[obj.name for obj in armatures]}"
        )
    report = {
        "schema": "souldrifter.direct-rigify-alignment-audit.v1",
        "issue": ISSUE,
        "status": "PASS_TARGET_DERIVED_ALIGNMENT_ONLY_NO_MORPHS_NO_PROMOTION",
        "source": {
            "path": str(source).replace("\\", "/"),
            "sha256": SOURCE_SHA256,
        },
        "exactBasis": basis,
        "runtimeArmature": {
            "name": armature.name,
            "boneCount": len(armature.data.bones),
            "rootBones": [
                bone.name for bone in armature.data.bones if bone.parent is None
            ],
        },
        "semanticTopology": {
            "logicalVertexCount": len(key_points),
            "rawVertexCount": len(points),
            "neckSeamLogicalCount": len(regions["seam"]),
            "eyeRingLogicalCounts": {
                side: [len(ring) for ring in regions["eyes"][side]["rings"]]
                for side in ("left", "right")
            },
            "mouthUpperLogicalCount": len(regions["mouthUpper"]),
            "mouthLowerLogicalCount": len(regions["mouthLower"]),
            "jawLogicalCount": len(regions["jaw"]),
            "surfaceComponentSizes": [
                len(component) for component in regions["surfaceComponents"]
            ],
        },
        "material": material_receipt(head),
        "rigify": rigify_receipt,
        "alignedModules": modules,
        "promotion": "BLOCKED_UNTIL_DIRECT_BIND_BAKE_GATES_AND_VISUAL_PROOF_PASS",
    }
    receipt_path = evidence / "alignment-audit-receipt.json"
    receipt = write_json(receipt_path, report)
    report["receipt"] = receipt
    print("DIRECT_RIGIFY_ALIGNMENT_AUDIT=" + json.dumps(report, sort_keys=True))
    return report


def bind_bake_proof(args: argparse.Namespace) -> dict[str, object]:
    source = Path(args.source_glb).resolve()
    evidence = Path(args.evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    head, _body, armature = import_locked_source(source)
    basis = mesh_basis_signature(head)
    neutral = head_local_points(head, armature)
    raw_keys, raw_for_key, key_points, adjacency, faces = logical_topology(head, neutral)
    regions = exact_regions(raw_for_key, key_points, adjacency, faces)
    polygons = [tuple(polygon.vertices) for polygon in head.data.polygons]
    if any(len(polygon) != 3 for polygon in polygons):
        raise RuntimeError("Exact head is no longer fully triangulated")
    intersection_precision = exact_intersection_precision(neutral)
    baseline_overlaps = nonadjacent_self_overlaps(
        neutral, polygons, raw_keys, intersection_precision
    )
    rigify_receipt, skin_eye, skin_jaw = enable_rigify()
    if head.data.shape_keys is not None:
        raise RuntimeError("Exact source unexpectedly already has shape keys")
    head.shape_key_add(name="Basis", from_mix=False)

    target_receipts = {}
    for side, target_name in (("left", "eyeBlinkLeft"), ("right", "eyeBlinkRight")):
        side_region = regions["eyes"][side]
        _meta, rig, module, before_objects = create_aligned_module(
            f"bind-{side}",
            skin_eye,
            lambda meta, side=side, side_region=side_region: fit_eye_metarig(
                meta, side, side_region["rings"], key_points
            ),
        )
        authoring_head = create_authoring_head(neutral, polygons, f"bind-{side}")
        binding = bind_eye_region(
            authoring_head, rig, side_region, raw_for_key, key_points, adjacency
        )
        controls = pose_eye_controls(rig, side_region, key_points, 1.0)
        rigify_deformed = evaluated_head_points(authoring_head)
        pure_rigify_base = {"status": "PASS"}
        try:
            pure_rigify_base["gates"] = deformation_gate(
                target_name + "-pure-Rigify-base",
                neutral,
                rigify_deformed,
                polygons,
                raw_keys,
                raw_for_key,
                side_region["region"],
                regions["seam"],
                baseline_overlaps,
                intersection_precision,
            )
        except ProofGateError as error:
            pure_rigify_base = {
                "status": "REJECTED_AS_STANDALONE_REQUIRES_CORRECTIVE",
                "gateDetails": error.details,
            }
        residual_search = []
        selected = None
        for residual_fraction in (0.04, 0.06, 0.08, 0.10, 0.12, 0.15):
            candidate, candidate_corrective = hybrid_exact_topology_blink(
                neutral,
                rigify_deformed,
                side_region,
                adjacency,
                key_points,
                raw_for_key,
                residual_fraction,
            )
            candidate_boundary_maximum = max(
                (candidate[index] - neutral[index]).length
                for index in binding["zeroMotionBoundaryRawVertices"]
            )
            candidate_gap = blink_gap_metrics(
                neutral, candidate, side_region, raw_for_key, key_points
            )
            candidate_result = {
                "residualFractionOfApertureRadius": residual_fraction,
                "closedOverNeutral": candidate_gap["closedOverNeutral"],
                "zeroMotionBoundaryMaximumDeltaMeters": candidate_boundary_maximum,
            }
            if candidate_boundary_maximum > 1.0e-7:
                candidate_result.update(
                    {
                        "status": "FAIL_BOUNDARY_MOTION",
                        "reason": candidate_boundary_maximum,
                    }
                )
                residual_search.append(candidate_result)
                continue
            candidate_gates = {
                "0.00": {
                    "status": "PASS_EXACT_BASIS",
                    "maximumDeltaMeters": 0.0,
                    "triangleFlipCount": 0,
                    "newNonadjacentOverlapCount": 0,
                }
            }
            failed_gate = None
            for weight in (0.25, 0.5, 0.75, 1.0):
                intermediate = [
                    start + weight * (end - start)
                    for start, end in zip(neutral, candidate, strict=True)
                ]
                try:
                    candidate_gates[f"{weight:.2f}"] = deformation_gate(
                        f"{target_name}@{weight:.2f}",
                        neutral,
                        intermediate,
                        polygons,
                        raw_keys,
                        raw_for_key,
                        side_region["region"],
                        regions["seam"],
                        baseline_overlaps,
                        intersection_precision,
                    )
                except ProofGateError as error:
                    failed_gate = {
                        "interpolationWeight": weight,
                        "gate": error.details.get("gate"),
                        "target": error.details.get("target"),
                        "flipCount": error.details.get("flipCount", 0),
                        "newNonadjacentOverlapCount": error.details.get(
                            "newNonadjacentOverlapCount", 0
                        ),
                        "flippedTriangles": error.details.get(
                            "flippedTriangles", []
                        ),
                        "newNonadjacentOverlaps": error.details.get(
                            "newNonadjacentOverlaps", []
                        ),
                    }
                    break
            if failed_gate is not None:
                candidate_result.update(
                    {"status": "FAIL_DEFORMATION_GATE", **failed_gate}
                )
                residual_search.append(candidate_result)
                continue
            if not (0.0 < candidate_gap["closedOverNeutral"] <= 0.35):
                candidate_result.update(
                    {"status": "FAIL_APERTURE_CLOSURE_CONTRACT"}
                )
                residual_search.append(candidate_result)
                continue
            candidate_result.update({"status": "PASS_SELECTED"})
            residual_search.append(candidate_result)
            selected = (
                candidate,
                candidate_corrective,
                candidate_boundary_maximum,
                candidate_gates,
                candidate_gap,
            )
            break
        if selected is None:
            raise ProofGateError(
                f"{target_name} has no safe residual-clearance candidate",
                {
                    "gate": "exact-topology-blink-residual-clearance-search",
                    "target": target_name,
                    "residualFractionSearch": residual_search,
                },
            )
        deformed, corrective, boundary_maximum, interpolation_gates, gap = selected
        corrective["residualFractionSearch"] = residual_search
        corrective["selectedResidualFractionOfApertureRadius"] = (
            corrective["residualFractionOfApertureRadius"]
        )
        gate = interpolation_gates["1.00"]
        bake_shape_key(head, armature, target_name, deformed)
        target_receipts[target_name] = {
            "module": module,
            "binding": {
                **binding,
                "zeroMotionBoundaryMaximumDeltaMeters": boundary_maximum,
            },
            "controls": controls,
            "pureRigifyBase": pure_rigify_base,
            "hybridCorrective": corrective,
            "interpolationGates": interpolation_gates,
            "aperture": gap,
            "gates": gate,
        }
        strip_created_objects(before_objects)

    eye_checkpoint = {
        "schema": "souldrifter.direct-rigify-eye-proof-checkpoint.v1",
        "issue": ISSUE,
        "status": "PASS_BLINK_LEFT_RIGHT_JAW_NOT_YET_PROVEN_NOT_PROMOTED",
        "source": {
            "path": str(source).replace("\\", "/"),
            "sha256": SOURCE_SHA256,
        },
        "exactBasis": basis,
        "intersectionPrecision": intersection_precision,
        "neutralNonadjacentOverlapCount": len(baseline_overlaps),
        "targets": target_receipts,
        "promotion": "BLOCKED_PENDING_JAW_AND_MULTI_ANGLE_VISUAL_PROOF",
    }
    eye_checkpoint["receipt"] = write_json(
        evidence / "eye-proof-checkpoint-receipt.json", eye_checkpoint
    )

    _meta, rig, module, before_objects = create_aligned_module(
        "bind-jaw",
        skin_jaw,
        lambda meta: fit_jaw_metarig(meta, regions, key_points),
    )
    authoring_head = create_authoring_head(neutral, polygons, "bind-jaw")
    binding = bind_jaw_region(
        authoring_head, rig, regions, raw_for_key, key_points
    )
    angle_search = []
    base_rigify_deformed = None
    base_controls = None
    for angle_amplitude in (1.0, 0.75, 0.5, 0.25):
        candidate, candidate_controls = pose_jaw_control(
            authoring_head,
            rig,
            regions,
            key_points,
            raw_for_key,
            binding["falloffAnchorDeformBone"],
            angle_amplitude,
        )
        if angle_amplitude == 1.0:
            base_rigify_deformed = candidate
            base_controls = candidate_controls
        candidate_boundary_maximum = max(
            (candidate[index] - neutral[index]).length
            for index in binding["zeroMotionBoundaryRawVertices"]
        )
        candidate_cavity = mouth_cavity_metrics(
            neutral, candidate, regions, raw_for_key, key_points
        )
        candidate_result = {
            "angleAmplitude": angle_amplitude,
            "angleDegrees": math.degrees(candidate_controls["angleRadians"]),
            "zeroMotionBoundaryMaximumDeltaMeters": candidate_boundary_maximum,
            "centralMouthOpeningIncreaseMeters": candidate_cavity[
                "openingIncreaseMeters"
            ],
        }
        if candidate_boundary_maximum > 1.0e-7:
            candidate_result.update(
                {
                    "status": "FAIL_BOUNDARY_MOTION",
                    "reason": candidate_boundary_maximum,
                }
            )
            angle_search.append(candidate_result)
            continue
        try:
            candidate_gate = deformation_gate(
                f"jawOpen-pure-Rigify@{angle_amplitude:.2f}",
                neutral,
                candidate,
                polygons,
                raw_keys,
                raw_for_key,
                regions["jaw"],
                regions["seam"],
                baseline_overlaps,
                intersection_precision,
            )
        except ProofGateError as error:
            candidate_result.update(
                {
                    "status": "FAIL_DEFORMATION_GATE",
                    "gate": error.details.get("gate"),
                    "flipCount": error.details.get("flipCount", 0),
                    "newNonadjacentOverlapCount": error.details.get(
                        "newNonadjacentOverlapCount", 0
                    ),
                    "flippedTriangles": error.details.get(
                        "flippedTriangles", []
                    ),
                    "newNonadjacentOverlaps": error.details.get(
                        "newNonadjacentOverlaps", []
                    ),
                }
            )
            angle_search.append(candidate_result)
            continue
        if candidate_cavity["openingIncreaseMeters"] < 0.002:
            candidate_result.update(
                {
                    "status": "FAIL_MOUTH_CAVITY_OPENING",
                    "minimumOpeningIncreaseMeters": 0.002,
                }
            )
            angle_search.append(candidate_result)
            continue
        candidate_result.update({"status": "PASS", "gates": candidate_gate})
        angle_search.append(candidate_result)
    if base_rigify_deformed is None or base_controls is None:
        raise RuntimeError("Jaw angle audit did not capture its full Rigify control pose")
    influence, influence_receipt = harmonic_jaw_influence(
        regions, adjacency, key_points, raw_for_key
    )
    hybrid_search = []
    hybrid_safe = []
    for angle_amplitude in (1.0, 0.75, 0.5, 0.25):
        candidate, candidate_corrective = hybrid_exact_topology_jaw(
            neutral,
            base_rigify_deformed,
            regions,
            key_points,
            raw_for_key,
            influence,
            Vector(base_controls["pivotRigLocal"]),
            base_controls["angleRadians"] * angle_amplitude,
        )
        candidate_boundary_maximum = max(
            (candidate[index] - neutral[index]).length
            for index in influence_receipt["zeroMotionBoundaryRawVertices"]
        )
        candidate_cavity = mouth_cavity_metrics(
            neutral, candidate, regions, raw_for_key, key_points
        )
        candidate_result = {
            "angleAmplitude": angle_amplitude,
            "angleDegrees": math.degrees(
                base_controls["angleRadians"] * angle_amplitude
            ),
            "zeroMotionBoundaryMaximumDeltaMeters": candidate_boundary_maximum,
            "centralMouthOpeningIncreaseMeters": candidate_cavity[
                "openingIncreaseMeters"
            ],
        }
        if candidate_boundary_maximum > 1.0e-7:
            candidate_result.update(
                {
                    "status": "FAIL_BOUNDARY_MOTION",
                    "reason": candidate_boundary_maximum,
                }
            )
            hybrid_search.append(candidate_result)
            continue
        interpolation_gates = {
            "0.00": {
                "status": "PASS_EXACT_BASIS",
                "maximumDeltaMeters": 0.0,
                "triangleFlipCount": 0,
                "newNonadjacentOverlapCount": 0,
            }
        }
        failed_gate = None
        for weight in (0.25, 0.5, 0.75, 1.0):
            intermediate = [
                start + weight * (end - start)
                for start, end in zip(neutral, candidate, strict=True)
            ]
            try:
                interpolation_gates[f"{weight:.2f}"] = deformation_gate(
                    f"jawOpen-hybrid@{angle_amplitude:.2f}x/{weight:.2f}w",
                    neutral,
                    intermediate,
                    polygons,
                    raw_keys,
                    raw_for_key,
                    regions["jaw"],
                    regions["seam"],
                    baseline_overlaps,
                    intersection_precision,
                )
            except ProofGateError as error:
                overlap_details = error.details.get(
                    "newNonadjacentOverlaps", []
                )
                failed_gate = {
                    "interpolationWeight": weight,
                    "gate": error.details.get("gate"),
                    "flipCount": error.details.get("flipCount", 0),
                    "newNonadjacentOverlapCount": error.details.get(
                        "newNonadjacentOverlapCount", 0
                    ),
                    "flippedTriangles": error.details.get(
                        "flippedTriangles", []
                    ),
                    "newNonadjacentOverlaps": overlap_details,
                    "firstTenOverlapAlphaComponentDiagnostics": (
                        jaw_overlap_diagnostics(
                            overlap_details,
                            raw_keys,
                            regions,
                            influence,
                            influence_receipt,
                        )
                        if overlap_details
                        else []
                    ),
                }
                break
        if failed_gate is not None:
            candidate_result.update(
                {"status": "FAIL_DEFORMATION_GATE", **failed_gate}
            )
            hybrid_search.append(candidate_result)
            continue
        if candidate_cavity["openingIncreaseMeters"] < 0.002:
            candidate_result.update(
                {
                    "status": "FAIL_MOUTH_CAVITY_OPENING",
                    "minimumOpeningIncreaseMeters": 0.002,
                }
            )
            hybrid_search.append(candidate_result)
            continue
        candidate_result.update(
            {"status": "PASS", "interpolationGates": interpolation_gates}
        )
        hybrid_search.append(candidate_result)
        hybrid_safe.append(
            (
                abs(base_controls["angleRadians"] * angle_amplitude),
                candidate,
                candidate_corrective,
                angle_amplitude,
                candidate_boundary_maximum,
                candidate_cavity,
                interpolation_gates,
            )
        )
    if not hybrid_safe:
        raise ProofGateError(
            "jawOpen has no safe exact-topology hybrid angle meeting cavity contract",
            {
                "gate": "jaw-hybrid-angle-line-search",
                "target": "jawOpen",
                "pureRigifyAngleSearch": angle_search,
                "hybridAngleSearch": hybrid_search,
                "harmonicInfluence": influence_receipt,
                "diagnosis": (
                    "exact-topology-harmonic-jaw-corrective-still-fails-strict-"
                    "interpolation-or-cavity-contract"
                ),
            },
        )
    (
        _selected_angle,
        deformed,
        corrective,
        selected_amplitude,
        boundary_maximum,
        cavity,
        interpolation_gates,
    ) = min(hybrid_safe, key=lambda item: item[0])
    controls = {
        **base_controls,
        "pureRigifyAngleSearch": angle_search,
        "selectedHybridAngleAmplitude": selected_amplitude,
        "selectedHybridAngleRadians": (
            base_controls["angleRadians"] * selected_amplitude
        ),
    }
    corrective["harmonicInfluence"] = influence_receipt
    corrective["hybridAngleSearch"] = hybrid_search
    cavity = mouth_cavity_receipt(
        neutral, deformed, regions, raw_for_key, key_points
    )
    gate = interpolation_gates["1.00"]
    bake_shape_key(head, armature, "jawOpen", deformed)
    target_receipts["jawOpen"] = {
        "module": module,
        "binding": {
            **binding,
            "zeroMotionBoundaryMaximumDeltaMeters": boundary_maximum,
        },
        "controls": controls,
        "pureRigifyBase": {
            "status": "REJECTED_AS_STANDALONE_REQUIRES_CORRECTIVE",
            "angleSearch": angle_search,
        },
        "hybridCorrective": corrective,
        "interpolationGates": interpolation_gates,
        "cavity": cavity,
        "gates": gate,
    }
    strip_created_objects(before_objects)

    if mesh_basis_signature(head) != basis:
        raise RuntimeError("Direct Rigify bake changed the exact approved Basis")
    shape_names = list(head.data.shape_keys.key_blocks.keys())
    if shape_names != ["Basis", *PROOF_TARGETS]:
        raise RuntimeError(f"Direct proof shape-key order changed: {shape_names}")
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if armatures != [armature] or len(armature.data.bones) != EXPECTED_RUNTIME_BONES:
        raise RuntimeError(
            f"Temporary authoring rig survived bake: {[obj.name for obj in armatures]}"
        )
    report = {
        "schema": "souldrifter.direct-rigify-bind-bake-proof.v1",
        "issue": ISSUE,
        "status": "PASS_STRUCTURAL_BIND_BAKE_NOT_RENDERED_NOT_PROMOTED",
        "source": {
            "path": str(source).replace("\\", "/"),
            "sha256": SOURCE_SHA256,
        },
        "exactBasis": basis,
        "bindingPolicy": (
            "Exact head-local duplicate, semantic-region vertex groups, bundled Rigify "
            "DEF bones, real Rigify controls, evaluated bake, exact Basis unchanged"
        ),
        "rigify": rigify_receipt,
        "intersectionPrecision": intersection_precision,
        "neutralNonadjacentOverlapCount": len(baseline_overlaps),
        "targets": target_receipts,
        "runtimeArmature": {
            "name": armature.name,
            "boneCount": len(armature.data.bones),
            "rootBones": [
                bone.name for bone in armature.data.bones if bone.parent is None
            ],
        },
        "promotion": "BLOCKED_PENDING_MULTI_ANGLE_ANIMATED_VISUAL_AND_FRESH_EXPORT_GATES",
    }
    receipt_path = evidence / "bind-bake-proof-receipt.json"
    report["receipt"] = write_json(receipt_path, report)
    print("DIRECT_RIGIFY_BIND_BAKE_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def main() -> None:
    args = parse_args()
    try:
        if args.stage == "alignment-audit":
            alignment_audit(args)
        elif args.stage == "bind-bake-proof":
            bind_bake_proof(args)
        else:
            raise RuntimeError(f"Unsupported stage: {args.stage}")
    except Exception as error:
        evidence = Path(args.evidence_dir).resolve()
        evidence.mkdir(parents=True, exist_ok=True)
        failure = {
            "schema": "souldrifter.direct-rigify-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_CANDIDATE_PROMOTED",
            "stage": args.stage,
            "reason": str(error),
            "promotion": "BLOCKED",
        }
        if isinstance(error, ProofGateError):
            failure["gateDetails"] = error.details
        failure["receipt"] = write_json(
            evidence / "direct-rigify-failure-receipt.json", failure
        )
        print("DIRECT_RIGIFY_FAILURE=" + json.dumps(failure, sort_keys=True))
        raise


if __name__ == "__main__":
    main()
