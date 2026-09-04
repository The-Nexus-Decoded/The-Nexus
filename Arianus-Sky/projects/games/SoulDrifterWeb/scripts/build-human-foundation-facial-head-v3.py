"""Fail-closed issue #487 facial-transfer proof scaffold.

This file intentionally contains no facial deformation authoring.  It locks the
owner-approved Tripo Smart Mesh Basis, validates the canonical CC0 MakeHuman
ARKit source pack and bundled Rigify modules, and defines the interfaces the
three-target transfer proof must satisfy before it may create a candidate GLB.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from hashlib import sha256
import importlib.util
import json
import math
from pathlib import Path
import struct
import subprocess
import sys

import bpy
from mathutils import Vector, geometry
from mathutils.bvhtree import BVHTree
import numpy as np
ISSUE = 487
SOURCE_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8"
PACK_COMMIT = "7eaba3453134385bb5ea9811ef0b33b85b4b556d"
PACK_JSON_SHA256 = "1A3A6924AEE114ABB4015C0E721BA3528EB8221CF5E4DC068F1978717D48F443"
PACK_LICENSE_SHA256 = "F4E7F373B9B996950337E8D41A4A2939C2D90B7725E9BAF3D5084A22717AD328"
TARGET_MANIFEST_SHA256 = "D819F15404A673DD9B167B5B8A623D90BCFA733908F4B873F233AEF58E0ACC3C"
PROOF_TARGETS = ("eyeBlinkLeft", "eyeBlinkRight", "jawOpen")
AUTHORING_RIG_NAMES = ("META-Face487", "RIG-Face487")
RIGIFY_MODULES = ("face.skin_eye", "face.skin_jaw", "face.basic_tongue")
HEAD_OBJECT = "HumanFoundation_HeadBase"
BODY_OBJECT = "HumanFoundation_BodyNoHead"
ROOT_BONE = "mixamorig:Hips"
HEAD_BONE = "mixamorig:Head"
HM08_SHA256 = "8E761E6624B8F54536409135D1636DA63B32486A90D4897F84E121D144F6FB4C"


class FacialTransferGateError(RuntimeError):
    """Fail-closed gate error carrying JSON-safe audit evidence."""

    def __init__(self, message: str, diagnostic: dict[str, object]):
        super().__init__(message)
        self.diagnostic = diagnostic


@dataclass(frozen=True)
class CorrespondenceRecord:
    """One persisted semantic-region barycentric transfer record."""

    tripo_raw_vertex: int
    tripo_logical_vertex: int
    region: str
    hm08_triangle: tuple[int, int, int]
    barycentric: tuple[float, float, float]
    signed_normal_offset: float


@dataclass
class LocalAffineContract:
    """Full-rank semantic map plus every deterministic leave-one-out rebuild."""

    full_coefficients: np.ndarray
    leave_one_out_coefficients: list[np.ndarray]
    maximum_held_out_error: float
    receipt: dict[str, object]

    @staticmethod
    def transform(coefficients: np.ndarray, point: np.ndarray) -> np.ndarray:
        return np.append(np.asarray(point, dtype=np.float64), 1.0)[[3, 0, 1, 2]] @ coefficients

    @staticmethod
    def secant(
        coefficients: np.ndarray, point: np.ndarray, displacement: np.ndarray
    ) -> np.ndarray:
        return LocalAffineContract.transform(
            coefficients, point + displacement
        ) - LocalAffineContract.transform(coefficients, point)


class RegistrationInterface:
    """Contract for the neutral TPS/RBF registration supplied in phase 2."""

    schema = "souldrifter.face-transfer-registration.v1"

    @staticmethod
    def validate(records: list[CorrespondenceRecord], vertex_count: int) -> None:
        if len(records) != vertex_count:
            raise RuntimeError(
                f"Registration is incomplete: {len(records)} records for {vertex_count} vertices"
            )
        raw_ids = [record.tripo_raw_vertex for record in records]
        if sorted(raw_ids) != list(range(vertex_count)):
            raise RuntimeError("Registration must resolve every raw Tripo vertex exactly once")
        for record in records:
            if not record.region:
                raise RuntimeError(f"Vertex {record.tripo_raw_vertex} has no semantic region")
            if abs(sum(record.barycentric) - 1.0) > 1.0e-6:
                raise RuntimeError(
                    f"Vertex {record.tripo_raw_vertex} barycentric weights do not sum to one"
                )
            if not all(0.0 <= value <= 1.0 for value in record.barycentric):
                raise RuntimeError(
                    f"Vertex {record.tripo_raw_vertex} lies outside its registered triangle"
                )


class RigifyAuthoringInterface:
    """Temporary face-rig boundary; never parents to the Mixamo armature."""

    @staticmethod
    def validate_modules() -> dict[str, object]:
        bpy.ops.preferences.addon_enable(module="rigify")
        import rigify

        module_files: dict[str, str] = {}
        for module in RIGIFY_MODULES:
            spec = importlib.util.find_spec(f"rigify.rigs.{module}")
            if spec is None or spec.origin is None:
                raise RuntimeError(f"Bundled Rigify module unavailable: {module}")
            module_files[module] = spec.origin
        return {
            "version": list(rigify.bl_info["version"]),
            "moduleFiles": module_files,
        }

    @staticmethod
    def strip_and_validate_runtime_armature() -> dict[str, object]:
        for name in AUTHORING_RIG_NAMES:
            candidate = bpy.data.objects.get(name)
            if candidate is not None:
                bpy.data.objects.remove(candidate, do_unlink=True)
        armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
        if len(armatures) != 1:
            raise RuntimeError(
                f"Runtime scene must contain one armature, got {[obj.name for obj in armatures]}"
            )
        armature = armatures[0]
        roots = [bone.name for bone in armature.data.bones if bone.parent is None]
        if len(armature.data.bones) != 65 or roots != [ROOT_BONE]:
            raise RuntimeError(
                f"Locked body rig changed: {len(armature.data.bones)} bones, roots={roots}"
            )
        return {"name": armature.name, "boneCount": 65, "rootBones": roots}


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage",
        choices=("source-audit", "registration-proof"),
        default="source-audit",
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
        "--target-root",
        default=(
            r"H:\CodexData\souldrifter-toolchain\evidence\487"
            r"\native-hm08-head-spike\extra-targets"
        ),
    )
    parser.add_argument(
        "--hm08-obj",
        default=r"H:\CodexData\souldrifter-toolchain\sources\makehuman-hm08\base.obj",
    )
    parser.add_argument(
        "--evidence-dir",
        default=(
            r"H:\CodexData\souldrifter-toolchain\evidence\487"
            r"\facial-head-v3-transfer-proof"
        ),
    )
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def imported_objects(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


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
    material_slots = [slot.material.name if slot.material else None for slot in obj.material_slots]
    digest.update(json.dumps(material_slots, separators=(",", ":")).encode("utf-8"))
    return {
        "sha256": digest.hexdigest().upper(),
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "uvLayers": [layer.name for layer in mesh.uv_layers],
        "materialSlots": material_slots,
    }


def target_pack_audit(root: Path) -> dict[str, object]:
    pack_path = root / "assets/faceunits01/packs/faceunits01.json"
    license_path = root / "LICENSE"
    target_dir = root / "assets/faceunits01/targets/faceunits"
    if file_sha256(pack_path) != PACK_JSON_SHA256:
        raise RuntimeError("Canonical faceunits01 pack JSON changed")
    if file_sha256(license_path) != PACK_LICENSE_SHA256:
        raise RuntimeError("Canonical faceunits01 CC0 license changed")
    commit = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if commit != PACK_COMMIT:
        raise RuntimeError(f"Canonical faceunits01 checkout changed: {commit}")
    files = sorted(target_dir.glob("*.target"), key=lambda path: path.name.casefold())
    manifest = "".join(
        f"{path.name}\t{file_sha256(path)}\t{path.stat().st_size}\n" for path in files
    ).encode("utf-8")
    if len(files) != 52 or len(manifest) != 4791:
        raise RuntimeError(
            f"Canonical faceunits manifest dimensions changed: {len(files)} files/{len(manifest)} bytes"
        )
    aggregate = sha256(manifest).hexdigest().upper()
    if aggregate != TARGET_MANIFEST_SHA256:
        raise RuntimeError(f"Canonical faceunits manifest hash changed: {aggregate}")
    metadata = json.loads(pack_path.read_text(encoding="utf-8"))
    names = [path.stem for path in files]
    if sorted(metadata) != sorted(names):
        raise RuntimeError("Pack metadata and target filenames differ")
    if any(metadata[name].get("license") != "CC0" for name in names):
        raise RuntimeError("Every faceunit must declare CC0 independently")
    return {
        "repository": "https://github.com/makehumancommunity/extra-targets.git",
        "commit": commit,
        "packJsonSha256": PACK_JSON_SHA256,
        "licenseSha256": PACK_LICENSE_SHA256,
        "targetCount": len(files),
        "targetManifestBytes": len(manifest),
        "targetManifestSha256": aggregate,
        "targetNames": names,
        "proofTargetFiles": {
            name: {
                "path": str(target_dir / f"{name}.target").replace("\\", "/"),
                "sha256": file_sha256(target_dir / f"{name}.target"),
            }
            for name in PROOF_TARGETS
        },
    }


def rejected_artifact_receipt() -> dict[str, object]:
    directory = Path(
        r"H:\CodexData\souldrifter-toolchain\evidence\487\rejected-procedural-builder"
    )
    expected = {
        "build-human-foundation-facial-head-v3.rejected-procedural.py": "54F8BF1D6257260AB98FB50C15517C6D5F7996434539CEAB6B7057D57886C335",
        "human-foundation-pilot-facial-head-v3.rejected-procedural.glb": "A095315EB3A789FC2131429F0B43BBE38B59735FDD0E03B378DA79D47F6A326F",
        "human-foundation-pilot-facial-head-v3.rejected-procedural.provenance.json": "9CA47ED78974282240A92F78B97B5C2B348AA4E99B3EB8313892CE48FE149989",
    }
    actual = {name: file_sha256(directory / name) for name in expected}
    if actual != expected:
        raise RuntimeError(f"Rejected procedural archive changed: {actual}")
    return {
        "status": "QUARANTINED_NOT_FOR_PROMOTION",
        "directory": str(directory).replace("\\", "/"),
        "files": actual,
    }


def source_audit(args: argparse.Namespace) -> dict[str, object]:
    source = Path(args.source_glb).resolve()
    target_root = Path(args.target_root).resolve()
    evidence = Path(args.evidence_dir).resolve()
    if file_sha256(source) != SOURCE_SHA256:
        raise RuntimeError("Owner-approved exact Tripo Smart Mesh source changed")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objects = imported_objects(source)
    by_name = {obj.name: obj for obj in objects}
    if HEAD_OBJECT not in by_name or BODY_OBJECT not in by_name:
        raise RuntimeError(f"Exact source objects changed: {sorted(by_name)}")
    armature = RigifyAuthoringInterface.strip_and_validate_runtime_armature()
    report = {
        "schema": "souldrifter.facial-transfer-source-audit.v1",
        "issue": ISSUE,
        "status": "PASS_SOURCE_AUDIT_ONLY_NO_CANDIDATE_GENERATED",
        "source": {
            "path": str(source).replace("\\", "/"),
            "sha256": SOURCE_SHA256,
            "headObject": HEAD_OBJECT,
            "basis": mesh_basis_signature(by_name[HEAD_OBJECT]),
            "runtimeArmature": armature,
        },
        "faceunits": target_pack_audit(target_root),
        "rigify": RigifyAuthoringInterface.validate_modules(),
        "registrationInterface": {
            "schema": RegistrationInterface.schema,
            "requiredFields": list(CorrespondenceRecord.__dataclass_fields__),
            "status": "NOT_BUILT_FAIL_CLOSED",
        },
        "proofTargets": list(PROOF_TARGETS),
        "rejectedProceduralArtifacts": rejected_artifact_receipt(),
        "promotion": "BLOCKED_UNTIL_REGISTRATION_AND_THREE_TARGET_VISUAL_GATES_PASS",
    }
    evidence.mkdir(parents=True, exist_ok=True)
    receipt = evidence / "source-audit-receipt.json"
    receipt.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("FACIAL_TRANSFER_SOURCE_AUDIT=" + json.dumps(report, sort_keys=True))
    return report


def parse_hm08(path: Path) -> tuple[np.ndarray, np.ndarray]:
    vertices: list[tuple[float, float, float]] = []
    triangles: list[tuple[int, int, int]] = []
    group = ""
    with path.open("r", encoding="utf-8", errors="replace") as stream:
        for line in stream:
            if line.startswith("v "):
                vertices.append(tuple(map(float, line.split()[1:4])))
            elif line.startswith("g "):
                group = line.split(maxsplit=1)[1].strip()
            elif line.startswith("f ") and group == "body":
                face = [int(token.split("/")[0]) - 1 for token in line.split()[1:]]
                if not all(index < 13380 for index in face):
                    raise RuntimeError("HM08 body face references a helper vertex")
                triangles.extend(
                    (face[0], face[index], face[index + 1])
                    for index in range(1, len(face) - 1)
                )
    if len(vertices) < 15128 or not triangles:
        raise RuntimeError(
            f"HM08 parse failed: {len(vertices)} vertices/{len(triangles)} triangles"
        )
    return np.asarray(vertices, dtype=np.float64), np.asarray(triangles, dtype=np.int32)


def read_target(path: Path, vertex_count: int) -> np.ndarray:
    """Decode the documented MakeHuman target axes into Blender's OBJ-import frame."""
    result = np.zeros((vertex_count, 3), dtype=np.float64)
    count = 0
    with path.open("r", encoding="utf-8", errors="replace") as stream:
        for line in stream:
            if not line.strip() or line.startswith("#"):
                continue
            values = line.split()
            dx, dz, inverted_y = map(float, values[1:4])
            result[int(values[0])] = (dx, -inverted_y, dz)
            count += 1
    if count == 0 or not np.isfinite(result).all():
        raise RuntimeError(f"Invalid faceunit target: {path}")
    return result


def source_to_blender_frame(points: np.ndarray) -> np.ndarray:
    """Match Blender OBJ import: raw MakeHuman (x, y, z) -> (x, -z, y)."""
    return np.column_stack((points[:, 0], -points[:, 2], points[:, 1]))


def target_to_registration_frame(deltas: np.ndarray) -> np.ndarray:
    """Match the raw neutral frame used by the semantic registration selectors."""
    return np.column_stack((deltas[:, 0], deltas[:, 2], -deltas[:, 1]))


def native_source_golden_gate(
    evidence: Path,
    raw_source: np.ndarray,
    triangles: np.ndarray,
    canonical_targets: dict[str, np.ndarray],
    interocular_receipt: dict[str, object],
) -> dict[str, object]:
    """Prove target units/signs on untouched HM08 before cross-topology transfer."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = source_to_blender_frame(raw_source)
    body_source = source[:13380]
    mesh = bpy.data.meshes.new("HM08GoldenBodyMesh")
    mesh.from_pydata(
        [tuple(value) for value in body_source],
        [],
        [tuple(map(int, triangle)) for triangle in triangles],
    )
    mesh.update()
    actor = bpy.data.objects.new("HM08GoldenBody", mesh)
    bpy.context.collection.objects.link(actor)
    material = bpy.data.materials.new("HM08GoldenSkin")
    material.diffuse_color = (0.34, 0.27, 0.22, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.34, 0.27, 0.22, 1.0)
    principled.inputs["Roughness"].default_value = 0.62
    actor.data.materials.append(material)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("HM08GoldenWorld")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (
        0.025,
        0.030,
        0.040,
        1.0,
    )
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.20
    target = Vector((0.0, -1.28, 6.90))
    camera_data = bpy.data.cameras.new("HM08GoldenCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.55
    camera = bpy.data.objects.new("HM08GoldenCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, size in (
        ("HM08GoldenKey", (2.6, -4.1, 9.1), 420.0, 2.2),
        ("HM08GoldenFill", (-2.4, -3.2, 7.2), 250.0, 2.4),
        ("HM08GoldenRim", (0.0, 0.7, 8.5), 330.0, 2.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()

    views = {
        "front": Vector((0.0, -5.2, 6.90)),
        "profile": Vector((3.8, -1.28, 6.90)),
    }
    interocular = float(interocular_receipt["interocularHm08Units"])
    head_ids = np.where(raw_source[:13380, 1] >= 6.54)[0]
    head_height = float(np.ptp(raw_source[head_ids, 1]))
    expected_counts = {"eyeBlinkLeft": 783, "eyeBlinkRight": 783, "jawOpen": 2543}
    normalized_bounds = {
        "eyeBlinkLeft": (0.15, 0.30),
        "eyeBlinkRight": (0.15, 0.30),
        "jawOpen": (0.50, 0.70),
    }
    states = {"neutral": np.zeros_like(source), **canonical_targets}
    renders: list[str] = []
    metrics: dict[str, object] = {}
    neutral_triangles = body_source[triangles]
    neutral_normals = np.cross(
        neutral_triangles[:, 1] - neutral_triangles[:, 0],
        neutral_triangles[:, 2] - neutral_triangles[:, 0],
    )
    for state, delta in states.items():
        deformed = source + delta
        for index, vertex in enumerate(mesh.vertices):
            vertex.co = deformed[index]
        mesh.update()
        if state != "neutral":
            norms = np.linalg.norm(delta, axis=1)
            affected = np.where(norms > 0.0)[0]
            if len(affected) != expected_counts[state]:
                raise RuntimeError(
                    f"Canonical {state} affected-set changed: {len(affected)}"
                )
            maximum = float(norms[affected].max())
            ratio = maximum / interocular
            lower, upper = normalized_bounds[state]
            if not lower <= ratio <= upper:
                raise RuntimeError(
                    f"Canonical {state} normalized displacement changed: {ratio:.8f}"
                )
            deformed_triangles = deformed[:13380][triangles]
            deformed_normals = np.cross(
                deformed_triangles[:, 1] - deformed_triangles[:, 0],
                deformed_triangles[:, 2] - deformed_triangles[:, 0],
            )
            valid = (
                np.linalg.norm(neutral_normals, axis=1) > 1.0e-9
            ) & (np.linalg.norm(deformed_normals, axis=1) > 1.0e-9)
            flips = int(np.count_nonzero(np.einsum("ij,ij->i", neutral_normals[valid], deformed_normals[valid]) <= 0.0))
            metrics[state] = {
                "affectedVertexCount": int(len(affected)),
                "maximumDisplacementHm08Units": maximum,
                "maximumOverInterocular": ratio,
                "maximumOverHeadHeight": maximum / head_height,
                "sourceTriangleFlipCount": flips,
            }
        for view_name, position in views.items():
            camera.location = position
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            path = evidence / f"native-source-{state}-{view_name}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            renders.append(str(path).replace("\\", "/"))

    receipt = {
        "schema": "souldrifter.hm08-native-faceunit-golden.v1",
        "status": "PASS_NATIVE_SOURCE_UNITS_AND_SIGNS_ONLY",
        "hm08Sha256": HM08_SHA256,
        "decode": "target columns (dx,dz,inverted_y) -> Blender Vector((dx,-inverted_y,dz))",
        "interocularHm08Units": interocular,
        "interocularMeasurement": interocular_receipt,
        "headHeightHm08Units": head_height,
        "metrics": metrics,
        "renders": renders,
    }
    receipt_path = evidence / "native-source-golden-receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    receipt["receiptPath"] = str(receipt_path).replace("\\", "/")
    receipt["receiptSha256"] = file_sha256(receipt_path)
    return receipt


def runtime_armature() -> bpy.types.Object:
    matches = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one runtime armature, got {[obj.name for obj in matches]}")
    return matches[0]


def head_local_points(
    obj: bpy.types.Object, armature: bpy.types.Object
) -> list[Vector]:
    bone_matrix = armature.data.bones[HEAD_BONE].matrix_local
    inverse = bone_matrix.inverted() @ armature.matrix_world.inverted()
    return [inverse @ obj.matrix_world @ vertex.co for vertex in obj.data.vertices]


def head_local_logical_normals(
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    raw_for_key: dict[tuple[float, float, float], list[int]],
) -> dict[tuple[float, float, float], Vector]:
    """Average duplicate-coordinate normals in the locked head-local frame."""
    bone_matrix = armature.data.bones[HEAD_BONE].matrix_local
    object_to_head = bone_matrix.inverted() @ armature.matrix_world.inverted() @ obj.matrix_world
    normal_matrix = object_to_head.to_3x3().inverted().transposed()
    result = {}
    for key, raw_ids in raw_for_key.items():
        normal = sum(
            (normal_matrix @ obj.data.vertices[index].normal for index in raw_ids),
            Vector(),
        )
        result[key] = normal.normalized() if normal.length else normal
    return result


def object_point_from_head_local(
    obj: bpy.types.Object, armature: bpy.types.Object, point: Vector
) -> Vector:
    bone_matrix = armature.data.bones[HEAD_BONE].matrix_local
    world = armature.matrix_world @ bone_matrix @ point
    return obj.matrix_world.inverted() @ world


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
            raise RuntimeError(f"Tripo logical face is not a triangle: {len(keys)}")
        faces.add(keys)
        for offset, first in enumerate(keys):
            for second in keys[offset + 1 :]:
                adjacency[first].add(second)
                adjacency[second].add(first)
    return raw_keys, raw_for_key, key_points, adjacency, faces


def exact_target_regions(
    raw_for_key: dict[tuple[float, float, float], list[int]],
    key_points: dict[tuple[float, float, float], Vector],
    key_normals: dict[tuple[float, float, float], Vector],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
    faces: set[tuple[tuple[float, float, float], ...]],
) -> dict[str, object]:
    minimum_y = min(point.y for point in key_points.values())
    seam = {key for key, point in key_points.items() if abs(point.y - minimum_y) <= 0.00003}
    if len(seam) != 64:
        raise RuntimeError(f"Exact Tripo seam changed: {len(seam)} logical points")
    eyes: dict[str, dict[str, object]] = {}
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
            raise RuntimeError(f"Exact Tripo {side} aperture changed: {len(aperture)}")
        rings = [aperture]
        seen = set(aperture)
        center = sum((key_points[key] for key in aperture), Vector()) / len(aperture)
        for ring_index in range(1, 6):
            previous_depth = sum(key_points[key].z for key in rings[-1]) / len(rings[-1])
            candidates = {
                neighbor
                for key in rings[-1]
                for neighbor in adjacency[key]
                if neighbor not in seen
                and 0.047 <= key_points[neighbor].y <= 0.079
                and (key_points[neighbor].x > 0) == (side == "left")
                and previous_depth + 0.00025
                <= key_points[neighbor].z
                <= previous_depth + 0.0027
            }
            if len(candidates) != 16:
                ranked = sorted(
                    candidates,
                    key=lambda key: (
                        abs(key_points[key].z - (previous_depth + 0.00155)),
                        abs(key_points[key].y - center.y),
                    ),
                )
                candidates = set(ranked[:16])
            if len(candidates) != 16:
                raise RuntimeError(
                    f"Exact Tripo {side} eye ring {ring_index} changed: {len(candidates)}"
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
            abs(key[0]) <= 0.032 and 0.010 <= key[1] <= 0.040 and key[2] >= 0.052
            for key in edge
        )
    ]
    mouth_graph: dict[tuple[float, float, float], set[tuple[float, float, float]]] = defaultdict(set)
    for first, second in mouth_edges:
        mouth_graph[first].add(second)
        mouth_graph[second].add(first)
    chains: list[set[tuple[float, float, float]]] = []
    remaining = set(mouth_graph)
    while remaining:
        seed = remaining.pop()
        component = {seed}
        queue = deque([seed])
        while queue:
            current = queue.popleft()
            for neighbor in mouth_graph[current]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        chains.append(component)
    chains.sort(key=len, reverse=True)
    if [len(chain) for chain in chains] != [19, 15, 9, 7]:
        raise RuntimeError(f"Exact Tripo mouth chains changed: {[len(chain) for chain in chains]}")

    ordered_chains: list[list[tuple[float, float, float]]] = []
    for chain in chains:
        endpoints = sorted(key for key in chain if len(mouth_graph[key] & chain) == 1)
        if len(endpoints) != 2:
            raise RuntimeError(
                f"Exact Tripo lip boundary is not one ordered path: {len(chain)}/{len(endpoints)}"
            )
        if (
            abs(abs(endpoints[0][0]) - abs(endpoints[1][0])) > 0.00060
            or abs(endpoints[0][1] - endpoints[1][1]) > 0.00060
            or abs(endpoints[0][2] - endpoints[1][2]) > 0.00060
        ):
            raise RuntimeError(f"Exact Tripo lip corner endpoints lost symmetry: {endpoints}")
        ordered = [endpoints[0]]
        previous = None
        current = endpoints[0]
        while current != endpoints[1]:
            candidates = sorted((mouth_graph[current] & chain) - ({previous} if previous else set()))
            if len(candidates) != 1:
                raise RuntimeError(
                    f"Exact Tripo lip chain branches at {current}: {len(candidates)} continuations"
                )
            previous, current = current, candidates[0]
            ordered.append(current)
        if len(ordered) != len(chain) or set(ordered) != chain:
            raise RuntimeError("Exact Tripo ordered lip chain does not cover its component once")
        ordered_chains.append(ordered)

    upper = set().union(
        *(chain for chain in chains if sum(key[1] for key in chain) / len(chain) > 0.024)
    )
    lower = set().union(*(chain for chain in chains if chain.isdisjoint(upper)))

    remaining = set(key_points)
    surface_components: list[set[tuple[float, float, float]]] = []
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
        surface_components.append(component)
    surface_components.sort(key=len, reverse=True)
    if [len(component) for component in surface_components] != [2792, 234, 188]:
        raise RuntimeError(
            "Exact Tripo face surface components changed: "
            f"{[len(component) for component in surface_components]}"
        )
    exterior = surface_components[0]
    upper_sheets = [component for component in surface_components if upper <= component]
    lower_sheets = [component for component in surface_components if lower <= component]
    if len(upper_sheets) != 1 or len(lower_sheets) != 1:
        raise RuntimeError("Exact Tripo upper/lower aperture sheets are ambiguous")
    upper_sheet, lower_sheet = upper_sheets[0], lower_sheets[0]
    if len(upper_sheet) != 188 or len(lower_sheet) != 234 or upper_sheet is lower_sheet:
        raise RuntimeError(
            f"Exact Tripo aperture sheets changed: {len(upper_sheet)}/{len(lower_sheet)}"
        )

    lower_box = {
        key
        for key, point in key_points.items()
        if abs(point.x) <= 0.018
        and 0.019 <= point.y <= 0.0253
        and point.z >= 0.070
    }
    upper_box = {
        key
        for key, point in key_points.items()
        if abs(point.x) <= 0.018
        and 0.0255 <= point.y <= 0.0321
        and point.z >= 0.070
    }
    outer_lower = lower_box & exterior
    outer_upper = upper_box & exterior
    recessed_lower = lower_box - exterior
    recessed_upper = upper_box - exterior
    aperture_sheets = upper_sheet | lower_sheet
    if not recessed_lower <= aperture_sheets or not recessed_upper <= aperture_sheets:
        raise RuntimeError("Exact Tripo lip boxes contain an unclassified surface component")
    if (len(outer_lower), len(recessed_lower), len(outer_upper), len(recessed_upper)) != (
        93,
        8,
        69,
        11,
    ):
        raise RuntimeError(
            "Exact Tripo semantic lip partition changed: "
            f"lower={len(outer_lower)}+{len(recessed_lower)}, "
            f"upper={len(outer_upper)}+{len(recessed_upper)}"
        )

    def mirror_metrics(keys: set[tuple[float, float, float]]) -> dict[str, float]:
        residuals = [
            min(
                math.dist((-key[0], key[1], key[2]), candidate)
                for candidate in keys
            )
            for key in keys
        ]
        return {
            "meanResidualMeters": float(sum(residuals) / len(residuals)),
            "maximumResidualMeters": float(max(residuals)),
        }

    selector = {
        "schema": "souldrifter.exact-tripo-lip-selector.v1",
        "method": "ordered-boundary-chains-plus-connected-surface-partition",
        "surfaceComponentSizes": [len(component) for component in surface_components],
        "orderedBoundaryChains": [
            {
                "count": len(chain),
                "meanHeight": sum(key[1] for key in chain) / len(chain),
                "points": [list(key) for key in chain],
            }
            for chain in ordered_chains
        ],
        "outerUpper": [list(key) for key in sorted(outer_upper)],
        "outerLower": [list(key) for key in sorted(outer_lower)],
        "rejectedRecessedUpper": [list(key) for key in sorted(recessed_upper)],
        "rejectedRecessedLower": [list(key) for key in sorted(recessed_lower)],
        "invariants": {
            "exteriorComponentSize": len(exterior),
            "upperApertureSheetSize": len(upper_sheet),
            "lowerApertureSheetSize": len(lower_sheet),
            "recessedUpperComponentSizes": sorted(
                len(component)
                for component in surface_components
                if component & recessed_upper
            ),
            "recessedLowerComponentSizes": sorted(
                len(component)
                for component in surface_components
                if component & recessed_lower
            ),
            "outerUpperMirror": mirror_metrics(outer_upper),
            "outerLowerMirror": mirror_metrics(outer_lower),
            "outerUpperNormalZMean": sum(key_normals[key].z for key in outer_upper)
            / len(outer_upper),
            "outerLowerNormalZMean": sum(key_normals[key].z for key in outer_lower)
            / len(outer_lower),
            "outerUpperMaximumDepth": max(key[2] for key in outer_upper),
            "recessedUpperMaximumDepth": max(key[2] for key in recessed_upper),
            "outerLowerMaximumDepth": max(key[2] for key in outer_lower),
            "recessedLowerMaximumDepth": max(key[2] for key in recessed_lower),
            "outerCornerExtentResidualMeters": max(
                abs(abs(min(key[0] for key in outer_upper)) - abs(max(key[0] for key in outer_upper))),
                abs(abs(min(key[0] for key in outer_lower)) - abs(max(key[0] for key in outer_lower))),
            ),
        },
    }
    invariants = selector["invariants"]
    if (
        invariants["outerUpperMirror"]["maximumResidualMeters"] > 0.00075
        or invariants["outerLowerMirror"]["maximumResidualMeters"] > 0.00075
        or invariants["outerUpperNormalZMean"] <= 0.40
        or invariants["outerLowerNormalZMean"] <= 0.25
        or invariants["outerUpperMaximumDepth"]
        <= invariants["recessedUpperMaximumDepth"] + 0.003
        or invariants["outerLowerMaximumDepth"]
        <= invariants["recessedLowerMaximumDepth"] + 0.003
        or invariants["outerCornerExtentResidualMeters"] > 0.00060
    ):
        raise RuntimeError(f"Exact Tripo lip semantic invariants failed: {invariants}")
    selector["selectorSha256"] = sha256(
        json.dumps(selector, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest().upper()

    jaw = set(lower | outer_lower)
    queue = deque(jaw)
    distance = {key: 0 for key in jaw}
    pinned_upper = upper | outer_upper
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
    return {
        "seam": seam,
        "eyes": eyes,
        "mouthChains": ordered_chains,
        "mouthUpper": upper | outer_upper,
        "mouthLower": lower | outer_lower,
        "jaw": jaw,
        "exterior": exterior,
        "rawForKey": raw_for_key,
        "lipSelector": selector,
    }


def source_adjacency(triangles: np.ndarray) -> dict[int, set[int]]:
    adjacency: dict[int, set[int]] = defaultdict(set)
    for a, b, c in triangles:
        adjacency[int(a)].update((int(b), int(c)))
        adjacency[int(b)].update((int(a), int(c)))
        adjacency[int(c)].update((int(a), int(b)))
    return adjacency


def affected_component(
    target: np.ndarray,
    adjacency: dict[int, set[int]],
    vertices: np.ndarray,
    predicate,
) -> set[int]:
    affected = {index for index in range(13380) if np.linalg.norm(target[index]) > 0.0}
    components: list[set[int]] = []
    remaining = set(affected)
    while remaining:
        seed = remaining.pop()
        component = {seed}
        queue = deque([seed])
        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current] & affected:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        if predicate(vertices[list(component)].mean(axis=0)):
            components.append(component)
    if not components:
        raise RuntimeError("No unambiguous semantic source component found")
    return max(components, key=len)


def ordered_by_angle(ids, points, axes: tuple[int, int]) -> list:
    values = np.asarray([points[item] for item in ids], dtype=np.float64)
    center = values[:, axes].mean(axis=0)
    radii = np.maximum(np.ptp(values[:, axes], axis=0) * 0.5, 1.0e-9)
    return sorted(
        ids,
        key=lambda item: math.atan2(
            (points[item][axes[1]] - center[1]) / radii[1],
            (points[item][axes[0]] - center[0]) / radii[0],
        ),
    )


def select_angular_ring(
    candidates: set[int],
    points: np.ndarray,
    center: tuple[float, float],
    radii: tuple[float, float],
    count: int,
    depth_floor: float,
) -> list[int]:
    result: list[int] = []
    if min(radii) <= 0.0:
        raise RuntimeError(f"Angular-ring radii must be positive: {radii}")
    available = {
        vertex_index
        for vertex_index in candidates
        if points[vertex_index, 2] >= depth_floor
    }
    if len(available) < count:
        raise RuntimeError(
            f"Angular-ring depth/topology filter leaves {len(available)} of {count} points"
        )
    for index in range(count):
        angle = -math.pi + 2.0 * math.pi * index / count
        target_x = center[0] + radii[0] * math.cos(angle)
        target_y = center[1] + radii[1] * math.sin(angle)
        best = min(
            available,
            key=lambda vertex_index: (
                ((points[vertex_index, 0] - target_x) / radii[0]) ** 2
                + ((points[vertex_index, 1] - target_y) / radii[1]) ** 2,
                -points[vertex_index, 2],
                vertex_index,
            ),
        )
        result.append(best)
        available.remove(best)
    return result


def topology_shells(
    adjacency: dict[int, set[int]],
    seeds: list[int],
    allowed: set[int],
    maximum_distance: int,
) -> list[set[int]]:
    """Return exact unweighted geodesic shells inside one semantic component."""
    distance = {index: 0 for index in seeds}
    queue = deque(seeds)
    while queue:
        current = queue.popleft()
        if distance[current] >= maximum_distance:
            continue
        for neighbor in sorted(adjacency[current] & allowed):
            if neighbor in distance:
                continue
            distance[neighbor] = distance[current] + 1
            queue.append(neighbor)
    shells = [
        {index for index, value in distance.items() if value == shell}
        for shell in range(maximum_distance + 1)
    ]
    if shells[0] != set(seeds) or any(len(shell) < 16 for shell in shells):
        raise RuntimeError(
            "Semantic eye topology cannot provide six deterministic 16-point shells: "
            f"{[len(shell) for shell in shells]}"
        )
    return shells


def full_rank_receipt(
    source_values: np.ndarray, target_values: np.ndarray, label: str
) -> dict[str, object]:
    """Fail unless both corresponding neighborhoods span all three dimensions."""
    source_rank = int(np.linalg.matrix_rank(source_values - source_values.mean(axis=0)))
    target_rank = int(np.linalg.matrix_rank(target_values - target_values.mean(axis=0)))
    if len(source_values) < 4 or source_rank != 3 or target_rank != 3:
        raise RuntimeError(
            f"{label} lacks four noncoplanar neutral correspondences: "
            f"count={len(source_values)}, ranks={source_rank}/{target_rank}"
        )
    return {
        "correspondenceCount": len(source_values),
        "sourceCenteredRank": source_rank,
        "targetCenteredRank": target_rank,
    }


def source_eye_topology_neighborhoods(
    source: np.ndarray,
    source_regions: dict[str, set[int]],
    source_graph: dict[int, set[int]],
) -> dict[str, dict[str, object]]:
    """Select the six deterministic HM08 geodesic rings used by every gate."""
    result: dict[str, dict[str, object]] = {}
    for side, center, radii in (
        ("left", (0.307772, 7.284139), (0.18, 0.075)),
        ("right", (-0.307772, 7.284139), (0.18, 0.075)),
    ):
        aperture = select_angular_ring(
            source_regions[f"{side}_eye"], source, center, radii, 16, 1.36
        )
        shells = topology_shells(
            source_graph, aperture, source_regions[f"{side}_eye"], 5
        )
        rings = [aperture]
        for shell in shells[1:]:
            values = source[list(shell)]
            shell_radii = (
                float(np.ptp(values[:, 0]) * 0.5),
                float(np.ptp(values[:, 1]) * 0.5),
            )
            rings.append(
                select_angular_ring(
                    shell, source, center, shell_radii, 16, -1.0e9
                )
            )
        flattened = [index for ring in rings for index in ring]
        if len(set(flattened)) != 96:
            raise RuntimeError(f"{side} HM08 geodesic eye rings overlap")
        result[side] = {
            "rings": rings,
            "shellSizes": [len(shell) for shell in shells],
        }
    return result


def source_interocular_receipt(
    source: np.ndarray, neighborhoods: dict[str, dict[str, object]]
) -> dict[str, object]:
    """One derived, hash-locked scale measurement shared by every proof stage."""
    ring_ids = {
        side: neighborhoods[side]["rings"][0] for side in ("left", "right")
    }
    centers = {
        side: source[ring_ids[side]].mean(axis=0) for side in ("left", "right")
    }
    payload = {
        "schema": "souldrifter.hm08-interocular.v1",
        "method": "mean-of-deterministic-geodesic-ring0-controls",
        "leftSourceVertexIds": ring_ids["left"],
        "rightSourceVertexIds": ring_ids["right"],
        "leftCenterHm08": [float(value) for value in centers["left"]],
        "rightCenterHm08": [float(value) for value in centers["right"]],
        "interocularHm08Units": float(
            np.linalg.norm(centers["left"] - centers["right"])
        ),
    }
    payload["measurementSha256"] = sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest().upper()
    return payload


class PolyharmonicWarp:
    def __init__(
        self, source: np.ndarray, target: np.ndarray, regularization: float = 1.0e-10
    ):
        self.center = source.mean(axis=0)
        self.scale = np.maximum(source.std(axis=0), 1.0e-6)
        controls = (source - self.center) / self.scale
        distances = np.linalg.norm(controls[:, None, :] - controls[None, :, :], axis=2)
        kernel = distances**3
        kernel += np.eye(len(controls)) * regularization
        affine = np.column_stack((np.ones(len(controls)), controls))
        matrix = np.block(
            [[kernel, affine], [affine.T, np.zeros((4, 4), dtype=np.float64)]]
        )
        values = np.vstack((target, np.zeros((4, 3), dtype=np.float64)))
        solved = np.linalg.lstsq(matrix, values, rcond=1.0e-12)[0]
        self.controls = controls
        self.weights = solved[: len(controls)]
        self.affine = solved[len(controls) :]
        self.regularization = regularization

    def transform(self, points: np.ndarray) -> np.ndarray:
        normalized = (points - self.center) / self.scale
        distances = np.linalg.norm(
            normalized[:, None, :] - self.controls[None, :, :], axis=2
        )
        affine = np.column_stack((np.ones(len(normalized)), normalized))
        return distances**3 @ self.weights + affine @ self.affine

    def finite_difference_jacobian(self, point: np.ndarray, step: float) -> np.ndarray:
        """Symmetric finite difference retained only as an analytic-derivative audit."""
        if step <= 0.0 or not math.isfinite(step):
            raise RuntimeError(f"Invalid neutral-warp Jacobian step: {step}")
        result = np.empty((3, 3), dtype=np.float64)
        for axis in range(3):
            offset = np.zeros(3, dtype=np.float64)
            offset[axis] = step
            plus = self.transform(np.asarray([point + offset]))[0]
            minus = self.transform(np.asarray([point - offset]))[0]
            result[:, axis] = (plus - minus) / (2.0 * step)
        if not np.isfinite(result).all():
            raise RuntimeError("Neutral-warp Jacobian contains non-finite values")
        return result

    def jacobian(self, point: np.ndarray) -> np.ndarray:
        """Analytic derivative of the normalized r^3 polyharmonic warp."""
        normalized = (np.asarray(point, dtype=np.float64) - self.center) / self.scale
        offsets = normalized[None, :] - self.controls
        radii = np.linalg.norm(offsets, axis=1)
        radial_gradient_normalized = 3.0 * radii[:, None] * offsets
        radial_gradient_source = radial_gradient_normalized / self.scale[None, :]
        result = self.weights.T @ radial_gradient_source
        result += self.affine[1:, :].T / self.scale[None, :]
        if not np.isfinite(result).all():
            raise RuntimeError("Analytic neutral-warp Jacobian contains non-finite values")
        return result

    def derivative_convergence_receipt(
        self, point: np.ndarray, step: float
    ) -> dict[str, object]:
        """Bound analytic-vs-central differences at the locked three step sizes."""
        analytic = self.jacobian(point)
        multipliers = (0.5, 1.0, 2.0)
        approximations = [
            self.finite_difference_jacobian(point, step * multiplier)
            for multiplier in multipliers
        ]
        errors = np.asarray(
            [float(np.linalg.norm(analytic - approximation)) for approximation in approximations],
            dtype=np.float64,
        )
        derivative_scale = float(
            max(np.linalg.norm(analytic), np.finfo(np.float64).eps)
        )
        normalized_errors = errors / derivative_scale
        derived_relative_tolerance = float(np.cbrt(np.finfo(np.float64).eps))
        singular = np.linalg.svd(analytic, compute_uv=False)
        determinant = float(np.linalg.det(analytic))
        condition = float(
            singular[0] / max(singular[-1], np.finfo(np.float64).eps)
        )
        finite = bool(
            np.isfinite(analytic).all()
            and all(np.isfinite(value).all() for value in approximations)
            and np.isfinite(normalized_errors).all()
            and math.isfinite(determinant)
            and math.isfinite(condition)
        )
        return {
            "analyticJacobian": analytic.tolist(),
            "finiteDifferenceJacobians": {
                str(multiplier): approximation.tolist()
                for multiplier, approximation in zip(
                    multipliers, approximations, strict=True
                )
            },
            "halfStepErrorFrobenius": float(errors[0]),
            "nominalStepErrorFrobenius": float(errors[1]),
            "doubleStepErrorFrobenius": float(errors[2]),
            "relativeErrors": normalized_errors.tolist(),
            "derivativeScaleFrobenius": derivative_scale,
            "maximumRelativeError": float(normalized_errors.max()),
            "derivedRelativeTolerance": derived_relative_tolerance,
            "finiteDifferenceStepMultipliers": list(multipliers),
            "baseStepHm08Units": step,
            "evaluatedStepsHm08Units": [step * value for value in multipliers],
            "numeratorDefinition": (
                "Frobenius norm(analyticJacobian - finiteDifferenceJacobian)"
            ),
            "denominatorDefinition": (
                "max(Frobenius norm(analyticJacobian), float64 machine epsilon)"
            ),
            "analyticDeterminant": determinant,
            "analyticConditionNumber": condition,
            "analyticSingularValues": singular.tolist(),
            "gatePassed": bool(
                finite
                and float(normalized_errors.max()) <= derived_relative_tolerance
            ),
        }


def fit_positive_affine(
    source_values: np.ndarray, target_values: np.ndarray, label: str
) -> tuple[np.ndarray, float]:
    """Fit one full-rank affine neutral map and reject reflected solutions."""
    design = np.column_stack((np.ones(len(source_values)), source_values))
    if np.linalg.matrix_rank(design) != 4:
        raise RuntimeError(f"{label} source neighborhood loses affine rank")
    coefficients = np.linalg.lstsq(design, target_values, rcond=1.0e-12)[0]
    linear = coefficients[1:, :].T
    determinant = float(np.linalg.det(linear))
    if not np.isfinite(coefficients).all() or not math.isfinite(determinant):
        raise RuntimeError(f"{label} affine map is non-finite")
    if determinant <= 0.0:
        raise RuntimeError(f"{label} affine map reverses orientation: det={determinant}")
    return coefficients, determinant


def leave_one_out_local_contract(
    source_values: np.ndarray,
    target_values: np.ndarray,
    target_interocular: float,
    label: str,
) -> LocalAffineContract:
    """Cross-validate a semantic affine map without a hand-tuned error cutoff."""
    full_rank_receipt(source_values, target_values, label)
    full, full_determinant = fit_positive_affine(source_values, target_values, label)
    pairwise = np.linalg.norm(
        target_values[:, None, :] - target_values[None, :, :], axis=2
    )
    pairwise[pairwise == 0.0] = np.inf
    local_spacing = float(np.median(pairwise.min(axis=1)))
    if not math.isfinite(local_spacing) or local_spacing <= 0.0:
        raise RuntimeError(f"{label} target landmark spacing is invalid")
    coefficients: list[np.ndarray] = []
    errors: list[float] = []
    determinants: list[float] = []
    for held_out in range(len(source_values)):
        keep = np.arange(len(source_values)) != held_out
        candidate, determinant = fit_positive_affine(
            source_values[keep], target_values[keep], f"{label} LOO {held_out}"
        )
        predicted = LocalAffineContract.transform(candidate, source_values[held_out])
        error = float(np.linalg.norm(predicted - target_values[held_out]))
        if not math.isfinite(error):
            raise RuntimeError(f"{label} LOO {held_out} prediction is non-finite")
        coefficients.append(candidate)
        errors.append(error)
        determinants.append(determinant)
    maximum_error = max(errors)
    return LocalAffineContract(
        full_coefficients=full,
        leave_one_out_coefficients=coefficients,
        maximum_held_out_error=maximum_error,
        receipt={
            "method": "full-rank-affine-leave-one-out-v1",
            "controlCount": len(source_values),
            "fullDeterminant": full_determinant,
            "minimumLeaveOneOutDeterminant": min(determinants),
            "maximumHeldOutErrorMeters": maximum_error,
            "meanHeldOutErrorMeters": float(np.mean(errors)),
            "localTargetLandmarkSpacingMeters": local_spacing,
            "maximumHeldOutErrorOverLocalSpacing": maximum_error / local_spacing,
            "maximumHeldOutErrorOverTargetInterocular": maximum_error
            / target_interocular,
        },
    )


def validate_warp_orientation(
    warp: PolyharmonicWarp,
    source: np.ndarray,
    triangles: np.ndarray,
    semantic_control_ids: dict[str, list[int]],
    semantic_support_ids: dict[str, set[int]],
    jacobian_step: float,
    condition_limit: float,
) -> dict[str, object]:
    """Reject folds at controls, support, and recursively sampled source triangles."""
    result: dict[str, object] = {}
    derivative_receipts_by_label: dict[str, list[dict[str, object]]] = {}
    all_derivative_receipts: list[dict[str, object]] = []
    for label, control_ids in semantic_control_ids.items():
        receipts = []
        for control_offset, source_index in enumerate(control_ids):
            point = source[source_index]
            receipt = warp.derivative_convergence_receipt(point, jacobian_step)
            receipt.update(
                {
                    "region": label,
                    "controlOffset": control_offset,
                    "sourceVertexId": source_index,
                    "sourcePointHm08": point.tolist(),
                }
            )
            receipts.append(receipt)
            all_derivative_receipts.append(receipt)
        derivative_receipts_by_label[label] = receipts
    worst_derivative = max(
        all_derivative_receipts,
        key=lambda receipt: float(receipt["maximumRelativeError"]),
    )
    if not bool(worst_derivative["gatePassed"]):
        raise FacialTransferGateError(
            "Analytic Jacobian disagrees with the locked central-difference envelope: "
            f"region={worst_derivative['region']}, "
            f"sourceVertex={worst_derivative['sourceVertexId']}, "
            f"maximumRelativeError={worst_derivative['maximumRelativeError']}, "
            f"tolerance={worst_derivative['derivedRelativeTolerance']}",
            {
                "gate": "ANALYTIC_JACOBIAN_CENTRAL_DIFFERENCE_AUDIT",
                "status": "FAIL",
                "evaluatedControlCount": len(all_derivative_receipts),
                "worstSample": worst_derivative,
            },
        )
    for label, control_ids in semantic_control_ids.items():
        support_ids = semantic_support_ids[label]
        determinant_cache: dict[tuple[float, float, float], float] = {}
        conditions: list[float] = []

        def determinant_at(point: np.ndarray) -> float:
            key = tuple(float(value) for value in point)
            if key in determinant_cache:
                return determinant_cache[key]
            jacobian = warp.jacobian(point)
            singular = np.linalg.svd(jacobian, compute_uv=False)
            condition = float(
                singular[0] / max(singular[-1], np.finfo(np.float64).eps)
            )
            determinant = float(np.linalg.det(jacobian))
            if (
                not np.isfinite(jacobian).all()
                or not math.isfinite(condition)
                or not math.isfinite(determinant)
                or condition > condition_limit
            ):
                raise RuntimeError(
                    f"{label} neutral Jacobian is non-finite/ill-conditioned at {key}: "
                    f"det={determinant}, condition={condition}"
                )
            if determinant <= 0.0:
                raise RuntimeError(
                    f"{label} neutral warp reverses orientation at {key}: det={determinant}"
                )
            determinant_cache[key] = determinant
            conditions.append(condition)
            return determinant

        derivative_receipts = derivative_receipts_by_label[label]
        control_determinants = [determinant_at(source[index]) for index in control_ids]
        support_determinants = [
            determinant_at(source[index]) for index in sorted(support_ids)
        ]
        region_triangles = [
            tuple(map(int, triangle))
            for triangle in triangles
            if all(int(index) in support_ids for index in triangle)
        ]
        adaptive_samples = 0
        certified_leaves = 0

        def certify_triangle(a: np.ndarray, b: np.ndarray, c: np.ndarray, depth: int) -> None:
            nonlocal adaptive_samples, certified_leaves
            ab, bc, ca = (a + b) * 0.5, (b + c) * 0.5, (c + a) * 0.5
            center = (a + b + c) / 3.0
            samples = (a, b, c, ab, bc, ca, center)
            determinants = [determinant_at(point) for point in samples]
            adaptive_samples += len(samples)
            minimum, maximum = min(determinants), max(determinants)
            if maximum - minimum <= minimum:
                certified_leaves += 1
                return
            if depth >= 2:
                raise RuntimeError(
                    f"{label} adaptive determinant variation cannot be certified at depth "
                    f"{depth}: min={minimum}, max={maximum}"
                )
            certify_triangle(a, ab, ca, depth + 1)
            certify_triangle(ab, b, bc, depth + 1)
            certify_triangle(ca, bc, c, depth + 1)
            certify_triangle(ab, bc, ca, depth + 1)

        for triangle in region_triangles:
            certify_triangle(*(source[index] for index in triangle), 0)
        result[label] = {
            "method": "analytic-r3-positive-determinant-adaptive-v1",
            "controlSampleCount": len(control_determinants),
            "supportSampleCount": len(support_determinants),
            "sourceTriangleCount": len(region_triangles),
            "adaptiveEvaluationCount": adaptive_samples,
            "certifiedAdaptiveLeafCount": certified_leaves,
            "minimumControlDeterminant": min(control_determinants),
            "minimumSupportDeterminant": min(support_determinants),
            "maximumConditionNumber": max(conditions),
            "derivativeConvergence": {
                "sampleCount": len(derivative_receipts),
                "finiteDifferenceStepMultipliers": [0.5, 1.0, 2.0],
                "maximumHalfStepErrorFrobenius": max(
                    receipt["halfStepErrorFrobenius"] for receipt in derivative_receipts
                ),
                "maximumNominalStepErrorFrobenius": max(
                    receipt["nominalStepErrorFrobenius"] for receipt in derivative_receipts
                ),
                "maximumDoubleStepErrorFrobenius": max(
                    receipt["doubleStepErrorFrobenius"] for receipt in derivative_receipts
                ),
                "maximumRelativeError": max(
                    receipt["maximumRelativeError"] for receipt in derivative_receipts
                ),
                "derivedRelativeTolerance": min(
                    receipt["derivedRelativeTolerance"] for receipt in derivative_receipts
                ),
            },
        }
    return result


def build_neutral_warp(
    source: np.ndarray,
    source_triangles: np.ndarray,
    target_points: dict[tuple[float, float, float], Vector],
    regions: dict[str, object],
    source_regions: dict[str, set[int]],
    source_graph: dict[int, set[int]],
    source_eye_neighborhoods: dict[str, dict[str, object]],
    interocular_receipt: dict[str, object],
) -> tuple[
    PolyharmonicWarp, dict[str, object], dict[str, LocalAffineContract]
]:
    seam_target = ordered_by_angle(regions["seam"], target_points, (0, 2))
    neck_candidates = {
        index
        for index in range(13380)
        if 6.54 <= source[index, 1] <= 6.71 and source[index, 2] >= -0.15
    }
    neck_values = source[list(neck_candidates)]
    neck_center = (float(neck_values[:, 0].mean()), float(neck_values[:, 2].mean()))
    neck_radii = (
        float(np.ptp(neck_values[:, 0]) * 0.5),
        float(np.ptp(neck_values[:, 2]) * 0.5),
    )
    neck_source = select_angular_ring(
        neck_candidates,
        source[:, (0, 2, 1)],
        neck_center,
        neck_radii,
        64,
        -1.0e9,
    )
    control_source_ids = list(neck_source)
    control_target_keys = list(seam_target)
    landmark_groups: dict[str, object] = {
        "neck": {"hm08": neck_source, "tripo": [list(key) for key in seam_target]}
    }

    def add_landmarks(
        name: str,
        source_ids: list[int],
        target_ids: list[tuple[float, float, float]],
    ) -> None:
        if len(source_ids) != len(target_ids) or not source_ids:
            raise RuntimeError(f"Invalid neutral landmark group {name}")
        duplicate_source = set(source_ids) & set(control_source_ids)
        duplicate_target = set(target_ids) & set(control_target_keys)
        if duplicate_source or duplicate_target:
            raise RuntimeError(
                f"Neutral landmark group {name} duplicates existing controls: "
                f"source={sorted(duplicate_source)}, target={sorted(duplicate_target)}"
            )
        control_source_ids.extend(source_ids)
        control_target_keys.extend(target_ids)
        landmark_groups[name] = {
            "hm08": source_ids,
            "tripo": [list(key) for key in target_ids],
        }

    eye_neighborhoods: dict[str, dict[str, object]] = {}
    for side in ("left", "right"):
        source_ring_ids = source_eye_neighborhoods[side]["rings"]
        target_ring_ids: list[list[tuple[float, float, float]]] = []
        for ring_index, (source_ids, target_shell) in enumerate(
            zip(source_ring_ids, regions["eyes"][side]["rings"], strict=True)
        ):
            target_ids = ordered_by_angle(target_shell, target_points, (0, 1))
            add_landmarks(f"{side}EyeRing{ring_index}", source_ids, target_ids)
            target_ring_ids.append(target_ids)

        all_source_ids = [index for ring in source_ring_ids for index in ring]
        all_target_ids = [key for ring in target_ring_ids for key in ring]
        if len(set(all_source_ids)) != 96 or len(set(all_target_ids)) != 96:
            raise RuntimeError(f"{side} eye topology/geodesic rings overlap")
        rank = full_rank_receipt(
            source[all_source_ids],
            np.asarray(all_target_ids, dtype=np.float64),
            f"{side} eye topology/geodesic neighborhood",
        )
        outer_source = source_ring_ids[-1]
        outer_target = target_ring_ids[-1]
        source_anchor_roles = {
            "brow": max(outer_source, key=lambda index: (source[index, 1], index)),
            "cheek": min(outer_source, key=lambda index: (source[index, 1], index)),
            "socketInner": min(
                outer_source, key=lambda index: (abs(source[index, 0]), index)
            ),
            "socketOuter": max(
                outer_source, key=lambda index: (abs(source[index, 0]), -index)
            ),
            "depthFront": max(outer_source, key=lambda index: (source[index, 2], index)),
            "depthBack": min(outer_source, key=lambda index: (source[index, 2], index)),
        }
        target_anchor_roles = {
            "brow": max(outer_target, key=lambda key: (key[1], key)),
            "cheek": min(outer_target, key=lambda key: (key[1], key)),
            "socketInner": min(outer_target, key=lambda key: (abs(key[0]), key)),
            "socketOuter": max(outer_target, key=lambda key: (abs(key[0]), key)),
            "depthFront": max(outer_target, key=lambda key: (key[2], key)),
            "depthBack": min(outer_target, key=lambda key: (key[2], key)),
        }
        eye_neighborhoods[side] = {
            **rank,
            "geodesicShellSizes": source_eye_neighborhoods[side]["shellSizes"],
            "sourceRingVertexIds": source_ring_ids,
            "tripoRingPoints": [
                [list(key) for key in ring] for ring in target_ring_ids
            ],
            "explicitSourceAnchors": source_anchor_roles,
            "explicitTripoAnchors": {
                role: list(key) for role, key in target_anchor_roles.items()
            },
        }
    landmark_groups["eyeNeighborhoods"] = eye_neighborhoods

    mouth_keys = set().union(*regions["mouthChains"])
    target_mouth_all = ordered_by_angle(mouth_keys, target_points, (0, 1))
    target_mouth = [
        target_mouth_all[round(index * len(target_mouth_all) / 16) % len(target_mouth_all)]
        for index in range(16)
    ]
    source_mouth_candidates = {
        index
        for index in source_regions["jaw"]
        if abs(source[index, 0]) <= 0.42
        and 6.50 <= source[index, 1] <= 6.82
        and source[index, 2] >= 1.36
    }
    source_mouth = select_angular_ring(
        source_mouth_candidates,
        source,
        (0.0, 6.66),
        (0.32, 0.13),
        16,
        1.40,
    )
    add_landmarks("mouth", source_mouth, target_mouth)

    exterior = regions["exterior"]
    source_chin_candidates = [
        index
        for index in range(13380)
        if abs(source[index, 0]) <= 0.12
        and 6.25 <= source[index, 1] <= 6.48
        and source[index, 2] >= 1.35
    ]
    target_chin_candidates = [
        key
        for key in exterior
        if abs(key[0]) <= 0.012 and key[1] <= 0.0 and key[2] >= 0.045
    ]
    source_chin = [
        min(
            (index for index in source_chin_candidates if abs(source[index, 0]) <= 0.010),
            key=lambda index: (source[index, 1], -source[index, 2], index),
        )
    ]
    target_chin = [
        min(
            (key for key in target_chin_candidates if abs(key[0]) <= 0.001),
            key=lambda key: (key[1], -key[2], abs(key[0]), key),
        )
    ]
    for sign in (-1, 1):
        source_chin.append(
            min(
                (
                    index
                    for index in source_chin_candidates
                    if source[index, 0] * sign > 0.030
                ),
                key=lambda index: (
                    source[index, 1],
                    abs(abs(source[index, 0]) - 0.065),
                    -source[index, 2],
                    index,
                ),
            )
        )
        target_chin.append(
            min(
                (key for key in target_chin_candidates if key[0] * sign > 0.002),
                key=lambda key: (
                    key[1],
                    abs(abs(key[0]) - 0.005),
                    -key[2],
                    key,
                ),
            )
        )
    add_landmarks("chin", source_chin, target_chin)

    mandible_source: list[int] = []
    mandible_target: list[tuple[float, float, float]] = []
    for source_height, target_height in zip(
        (6.40, 6.48, 6.56, 6.62),
        (-0.002, 0.007, 0.015, 0.021),
        strict=True,
    ):
        source_id = min(
            (
                index
                for index in range(13380)
                if index not in set(control_source_ids) | set(mandible_source)
                and abs(source[index, 0]) <= 0.025
                and abs(source[index, 1] - source_height) <= 0.035
                and source[index, 2] >= 1.35
            ),
            key=lambda index: (
                abs(source[index, 1] - source_height),
                abs(source[index, 0]),
                -source[index, 2],
                index,
            ),
        )
        target_id = min(
            (
                key
                for key in exterior
                if key not in set(control_target_keys) | set(mandible_target)
                and abs(key[0]) <= 0.001
                and abs(key[1] - target_height) <= 0.0045
                and key[2] >= 0.045
            ),
            key=lambda key: (
                abs(key[1] - target_height),
                abs(key[0]),
                -key[2],
                key,
            ),
        )
        mandible_source.append(source_id)
        mandible_target.append(target_id)
    add_landmarks("mandibleCenterline", mandible_source, mandible_target)

    source_jawline: list[int] = []
    target_jawline: list[tuple[float, float, float]] = []
    used_source = set(control_source_ids)
    used_target = set(control_target_keys)
    for sign in (-1, 1):
        for source_height, target_height in zip(
            (6.43, 6.50, 6.57, 6.64, 6.71),
            (-0.006, 0.000, 0.006, 0.012, 0.018),
            strict=True,
        ):
            source_id = min(
                (
                    index
                    for index in range(13380)
                    if index not in used_source
                    and source[index, 0] * sign > 0.12
                    and abs(source[index, 1] - source_height) <= 0.045
                    and source[index, 2] >= 0.80
                ),
                key=lambda index: (
                    abs(source[index, 1] - source_height),
                    -abs(source[index, 0]),
                    -source[index, 2],
                    index,
                ),
            )
            target_id = min(
                (
                    key
                    for key in exterior
                    if key not in used_target
                    and key[0] * sign > 0.012
                    and abs(key[1] - target_height) <= 0.0045
                    and key[2] >= 0.0
                ),
                key=lambda key: (
                    abs(key[1] - target_height),
                    -abs(key[0]),
                    -key[2],
                    key,
                ),
            )
            source_jawline.append(source_id)
            target_jawline.append(target_id)
            used_source.add(source_id)
            used_target.add(target_id)
    add_landmarks("jawline", source_jawline, target_jawline)

    source_feature_ids: list[int] = []
    target_feature_ids: list[tuple[float, float, float]] = []

    def paired_feature(source_candidates, target_candidates) -> None:
        source_id = min(
            (index for index in source_candidates if index not in set(control_source_ids) | set(source_feature_ids)),
            key=lambda index: (-source[index, 2], index),
        )
        target_id = min(
            (key for key in target_candidates if key not in set(control_target_keys) | set(target_feature_ids)),
            key=lambda key: (-key[2], key),
        )
        source_feature_ids.append(source_id)
        target_feature_ids.append(target_id)

    paired_feature(
        [index for index in range(13380) if abs(source[index, 0]) <= 0.02 and 6.86 <= source[index, 1] <= 7.00],
        [key for key in exterior if abs(key[0]) <= 0.001 and 0.038 <= key[1] <= 0.048],
    )
    for sign in (-1, 1):
        paired_feature(
            [
                index
                for index in range(13380)
                if 0.03 <= source[index, 0] * sign <= 0.14
                and 6.84 <= source[index, 1] <= 7.02
            ],
            [
                key
                for key in exterior
                if 0.003 <= key[0] * sign <= 0.016
                and 0.036 <= key[1] <= 0.050
            ],
        )
        paired_feature(
            [
                index
                for index in range(13380)
                if 0.20 <= source[index, 0] * sign <= 0.42
                and 6.75 <= source[index, 1] <= 7.10
            ],
            [
                key
                for key in exterior
                if 0.016 <= key[0] * sign <= 0.034
                and 0.030 <= key[1] <= 0.055
            ],
        )
    add_landmarks("noseAndCheeks", source_feature_ids, target_feature_ids)

    control_source = np.asarray([source[index] for index in control_source_ids], dtype=np.float64)
    control_target = np.asarray(
        [target_points[key] for key in control_target_keys], dtype=np.float64
    )
    warp = None
    residuals = None
    for regularization in (
        1.0e-10,
        1.0e-8,
        1.0e-7,
        1.0e-6,
        1.0e-5,
        1.0e-4,
        1.0e-3,
        1.0e-2,
        1.0e-1,
        1.0,
    ):
        candidate = PolyharmonicWarp(
            control_source, control_target, regularization=regularization
        )
        candidate_residuals = np.linalg.norm(
            candidate.transform(control_source) - control_target, axis=1
        )
        if float(candidate_residuals.max()) <= 0.00050:
            warp = candidate
            residuals = candidate_residuals
    if warp is None or residuals is None:
        raise RuntimeError("No regularized neutral warp satisfies the 0.5 mm landmark gate")
    maximum_residual = float(residuals.max())
    source_eye_centers = {
        side: source[eye_neighborhoods[side]["sourceRingVertexIds"][0]].mean(axis=0)
        for side in ("left", "right")
    }
    target_eye_centers = {
        side: np.asarray(
            eye_neighborhoods[side]["tripoRingPoints"][0], dtype=np.float64
        ).mean(axis=0)
        for side in ("left", "right")
    }
    source_interocular = float(interocular_receipt["interocularHm08Units"])
    independently_derived_source_interocular = float(
        np.linalg.norm(source_eye_centers["left"] - source_eye_centers["right"])
    )
    if abs(source_interocular - independently_derived_source_interocular) > 1.0e-12:
        raise RuntimeError("Shared HM08 interocular receipt disagrees with registration")
    target_interocular = float(
        np.linalg.norm(target_eye_centers["left"] - target_eye_centers["right"])
    )
    jacobian_step = float(np.cbrt(np.finfo(np.float64).eps) * source_interocular)
    condition_limit = float(1.0 / math.sqrt(np.finfo(np.float64).eps))

    semantic_group_names = {
        "eyeBlinkLeft": tuple(f"leftEyeRing{index}" for index in range(6)),
        "eyeBlinkRight": tuple(f"rightEyeRing{index}" for index in range(6)),
        "jawOpen": ("mouth", "chin", "mandibleCenterline", "jawline"),
    }
    semantic_support_ids = {
        "eyeBlinkLeft": source_regions["left_eye"],
        "eyeBlinkRight": source_regions["right_eye"],
        "jawOpen": source_regions["jaw"],
    }
    semantic_control_ids: dict[str, list[int]] = {}
    semantic_local_maps: dict[str, LocalAffineContract] = {}
    for name, group_names in semantic_group_names.items():
        source_ids = [
            index
            for group_name in group_names
            for index in landmark_groups[group_name]["hm08"]
        ]
        target_keys = [
            tuple(key)
            for group_name in group_names
            for key in landmark_groups[group_name]["tripo"]
        ]
        semantic_control_ids[name] = source_ids
        semantic_local_maps[name] = leave_one_out_local_contract(
            source[source_ids],
            np.asarray(target_keys, dtype=np.float64),
            target_interocular,
            name,
        )
    orientation_receipt = validate_warp_orientation(
        warp,
        source,
        source_triangles,
        semantic_control_ids,
        semantic_support_ids,
        jacobian_step,
        condition_limit,
    )
    landmark_groups["metrics"] = {
        "controlCount": len(control_source),
        "polyharmonicRegularization": warp.regularization,
        "maximumResidualMeters": maximum_residual,
        "meanResidualMeters": float(residuals.mean()),
        "symmetryConstrainedByPairedEyeAndNeckLandmarks": True,
        "sourceInterocularHm08Units": source_interocular,
        "sourceInterocularReceipt": interocular_receipt,
        "targetInterocularMeters": target_interocular,
        "interocularScale": target_interocular / source_interocular,
        "jacobianMethod": "analytic-r3-v1",
        "jacobianStepHm08Units": jacobian_step,
        "jacobianConditionLimit": condition_limit,
        "semanticLocalMapCrossValidation": {
            name: contract.receipt for name, contract in semantic_local_maps.items()
        },
        "orientation": orientation_receipt,
    }
    return warp, landmark_groups, semantic_local_maps


def closest_triangle_record(
    point: Vector,
    triangle_ids: list[tuple[int, int, int]],
    centroids: np.ndarray,
    warped_source: np.ndarray,
) -> tuple[tuple[int, int, int], tuple[float, float, float], float]:
    query = np.asarray(point, dtype=np.float64)
    shortlist = np.argpartition(
        np.sum((centroids - query) ** 2, axis=1), min(31, len(centroids) - 1)
    )[: min(32, len(centroids))]
    best = None
    for candidate_index in shortlist:
        triangle = triangle_ids[int(candidate_index)]
        a, b, c = (Vector(warped_source[index]) for index in triangle)
        closest = geometry.closest_point_on_tri(point, a, b, c)
        distance = (point - closest).length_squared
        if best is None or distance < best[0]:
            v0, v1, v2 = b - a, c - a, closest - a
            d00, d01, d11 = v0.dot(v0), v0.dot(v1), v1.dot(v1)
            d20, d21 = v2.dot(v0), v2.dot(v1)
            denominator = d00 * d11 - d01 * d01
            if abs(denominator) < 1.0e-16:
                continue
            weight_b = (d11 * d20 - d01 * d21) / denominator
            weight_c = (d00 * d21 - d01 * d20) / denominator
            weights = np.clip((1.0 - weight_b - weight_c, weight_b, weight_c), 0.0, 1.0)
            weights = weights / weights.sum()
            normal = (b - a).cross(c - a).normalized()
            best = (distance, triangle, tuple(float(value) for value in weights), (point - closest).dot(normal))
    if best is None:
        raise RuntimeError("No non-degenerate semantic source triangle found")
    return best[1], best[2], float(best[3])


def build_correspondence(
    head: bpy.types.Object,
    raw_points: list[Vector],
    raw_keys: list[tuple[float, float, float]],
    key_points: dict[tuple[float, float, float], Vector],
    regions: dict[str, object],
    source: np.ndarray,
    triangles: np.ndarray,
    warped_source: np.ndarray,
    source_regions: dict[str, set[int]],
) -> list[CorrespondenceRecord]:
    triangle_regions: dict[str, tuple[list[tuple[int, int, int]], np.ndarray]] = {}
    source_head = {index for index in range(13380) if source[index, 1] >= 6.54}
    for name, vertex_region in (
        ("left_eye", source_regions["left_eye"]),
        ("right_eye", source_regions["right_eye"]),
        ("jaw", source_regions["jaw"]),
        ("pinned", source_head),
    ):
        selected = [
            tuple(map(int, triangle))
            for triangle in triangles
            if all(int(index) in vertex_region for index in triangle)
        ]
        if not selected:
            raise RuntimeError(f"No source triangles for semantic region {name}")
        triangle_regions[name] = (
            selected,
            np.asarray(
                [warped_source[list(triangle)].mean(axis=0) for triangle in selected]
            ),
        )
    logical_ids = {key: index for index, key in enumerate(sorted(key_points))}
    logical_records: dict[tuple[float, float, float], tuple] = {}
    for key, point in key_points.items():
        if key in regions["eyes"]["left"]["region"]:
            region = "left_eye"
        elif key in regions["eyes"]["right"]["region"]:
            region = "right_eye"
        elif key in regions["jaw"]:
            region = "jaw"
        else:
            region = "pinned"
        semantic_triangles, centroids = triangle_regions[region]
        logical_records[key] = (
            region,
            *closest_triangle_record(point, semantic_triangles, centroids, warped_source),
        )
    records = []
    for raw_index, key in enumerate(raw_keys):
        region, triangle, weights, offset = logical_records[key]
        records.append(
            CorrespondenceRecord(
                raw_index,
                logical_ids[key],
                region,
                triangle,
                weights,
                offset,
            )
        )
    RegistrationInterface.validate(records, len(head.data.vertices))
    return records


def nonadjacent_self_overlaps(
    points: list[Vector], polygons: list[tuple[int, int, int]]
) -> set[tuple[int, int]]:
    tree = BVHTree.FromPolygons(points, polygons, all_triangles=True, epsilon=0.0)
    overlaps = set()
    polygon_sets = [set(polygon) for polygon in polygons]
    for first, second in tree.overlap(tree):
        if first >= second or polygon_sets[first] & polygon_sets[second]:
            continue
        overlaps.add((first, second))
    return overlaps


def bake_three_targets(
    head: bpy.types.Object,
    armature: bpy.types.Object,
    raw_points: list[Vector],
    raw_keys: list[tuple[float, float, float]],
    regions: dict[str, object],
    records: list[CorrespondenceRecord],
    source: np.ndarray,
    warp: PolyharmonicWarp,
    targets: dict[str, np.ndarray],
    semantic_local_maps: dict[str, LocalAffineContract],
    condition_limit: float,
) -> dict[str, object]:
    if head.data.shape_keys:
        raise RuntimeError("Exact source unexpectedly already has shape keys")
    head.shape_key_add(name="Basis", from_mix=False)
    stats = {}
    allowed_region = {
        "eyeBlinkLeft": "left_eye",
        "eyeBlinkRight": "right_eye",
        "jawOpen": "jaw",
    }
    polygons = [tuple(polygon.vertices) for polygon in head.data.polygons]
    if any(len(polygon) != 3 for polygon in polygons):
        raise RuntimeError("Exact Tripo head is no longer triangulated")
    neutral_normals = [
        (raw_points[b] - raw_points[a]).cross(raw_points[c] - raw_points[a])
        for a, b, c in polygons
    ]
    baseline_overlaps = nonadjacent_self_overlaps(raw_points, polygons)
    seam_raw = {
        raw_index
        for logical in regions["seam"]
        for raw_index in regions["rawForKey"][logical]
    }
    for name in PROOF_TARGETS:
        key = head.shape_key_add(name=name, from_mix=False)
        maximum = 0.0
        affected = 0
        observed_conditions: list[float] = []
        observed_determinants: list[float] = []
        source_normalized_scales: list[float] = []
        local_source_normalized_scales: list[float] = []
        normalized_disagreements: list[float] = []
        logical_deltas: dict[int, Vector] = {}
        deformed_points = [point.copy() for point in raw_points]
        contract = semantic_local_maps[name]
        for record, basis in zip(records, raw_points, strict=True):
            delta = Vector()
            if record.region == allowed_region[name]:
                source_point = sum(
                    record.barycentric[offset] * source[source_index]
                    for offset, source_index in enumerate(record.hm08_triangle)
                )
                source_delta = sum(
                    record.barycentric[offset] * targets[name][source_index]
                    for offset, source_index in enumerate(record.hm08_triangle)
                )
                if np.linalg.norm(source_delta) > 1.0e-12:
                    jacobian = warp.jacobian(source_point)
                    singular = np.linalg.svd(jacobian, compute_uv=False)
                    condition = float(
                        singular[0] / max(singular[-1], np.finfo(np.float64).eps)
                    )
                    determinant = float(np.linalg.det(jacobian))
                    if (
                        not np.isfinite(singular).all()
                        or not math.isfinite(condition)
                        or not math.isfinite(determinant)
                        or condition > condition_limit
                    ):
                        raise RuntimeError(
                            f"Transferred {name} has invalid neutral Jacobian at "
                            f"{source_point.tolist()}: det={determinant}, condition={condition}"
                        )
                    if determinant <= 0.0:
                        raise RuntimeError(
                            f"Transferred {name} neutral warp reverses orientation at "
                            f"{source_point.tolist()}: det={determinant}; record={record}"
                        )
                    observed_conditions.append(condition)
                    observed_determinants.append(determinant)

                    mapped_neutral = warp.transform(np.asarray([source_point]))[0]
                    mapped_target = warp.transform(
                        np.asarray([source_point + source_delta])
                    )[0]
                    mapped_secant = mapped_target - mapped_neutral
                    local_secant = LocalAffineContract.secant(
                        contract.full_coefficients, source_point, source_delta
                    )
                    scale = max(
                        1.0,
                        np.linalg.norm(mapped_neutral),
                        np.linalg.norm(mapped_target),
                    )
                    roundoff = float(np.finfo(np.float64).eps * scale)
                    uncertainty = 2.0 * contract.maximum_held_out_error + roundoff
                    if (
                        np.linalg.norm(mapped_secant) > roundoff
                        and np.linalg.norm(local_secant) > roundoff
                        and float(np.dot(mapped_secant, local_secant)) <= 0.0
                    ):
                        raise RuntimeError(
                            f"Transferred {name} movement direction reverses relative to "
                            f"the cross-validated local map at {source_point.tolist()}"
                        )
                    full_disagreement = float(
                        np.linalg.norm(mapped_secant - local_secant)
                    )
                    if full_disagreement > uncertainty:
                        raise RuntimeError(
                            f"Transferred {name} exact secant disagrees with the local map: "
                            f"{full_disagreement} > {uncertainty} at {source_point.tolist()}"
                        )
                    for leave_one_out in contract.leave_one_out_coefficients:
                        leave_one_out_secant = LocalAffineContract.secant(
                            leave_one_out, source_point, source_delta
                        )
                        if (
                            np.linalg.norm(local_secant) > roundoff
                            and np.linalg.norm(leave_one_out_secant) > roundoff
                            and float(np.dot(local_secant, leave_one_out_secant)) <= 0.0
                        ):
                            raise RuntimeError(
                                f"Transferred {name} leave-one-out movement direction reverses "
                                f"at {source_point.tolist()}"
                            )
                        disagreement = float(
                            np.linalg.norm(local_secant - leave_one_out_secant)
                        )
                        if disagreement > uncertainty:
                            raise RuntimeError(
                                f"Transferred {name} leave-one-out secant disagreement: "
                                f"{disagreement} > {uncertainty} at {source_point.tolist()}"
                            )
                    source_magnitude = float(np.linalg.norm(source_delta))
                    source_normalized_scales.append(
                        float(np.linalg.norm(mapped_secant)) / source_magnitude
                    )
                    local_source_normalized_scales.append(
                        float(np.linalg.norm(local_secant)) / source_magnitude
                    )
                    normalized_disagreements.append(
                        full_disagreement / max(uncertainty, np.finfo(np.float64).eps)
                    )
                    delta = Vector(mapped_secant)
            prior = logical_deltas.get(record.tripo_logical_vertex)
            if prior is not None and (prior - delta).length > 1.0e-10:
                raise RuntimeError(
                    f"Transferred {name} breaks duplicate-coordinate parity at logical "
                    f"vertex {record.tripo_logical_vertex}"
                )
            logical_deltas[record.tripo_logical_vertex] = delta.copy()
            if record.tripo_raw_vertex in seam_raw and delta.length > 1.0e-9:
                raise RuntimeError(f"Transferred {name} moves the locked neck seam")
            if name == "jawOpen" and delta.length > 1.0e-9:
                if basis.y > 0.052 or raw_keys[record.tripo_raw_vertex] in regions["mouthUpper"]:
                    raise RuntimeError(
                        f"Transferred jawOpen moves pinned upper-face support at raw vertex "
                        f"{record.tripo_raw_vertex}"
                    )
            if delta.length > 1.0e-9:
                affected += 1
                if delta.length > maximum:
                    maximum = delta.length
            key.data[record.tripo_raw_vertex].co = object_point_from_head_local(
                head, armature, basis + delta
            )
            deformed_points[record.tripo_raw_vertex] = basis + delta
        if affected < 12 or not math.isfinite(maximum):
            raise RuntimeError(f"Transferred {name} is not meaningful: {affected}/{maximum}")
        flipped = 0
        for normal, (a, b, c) in zip(neutral_normals, polygons, strict=True):
            candidate_normal = (deformed_points[b] - deformed_points[a]).cross(
                deformed_points[c] - deformed_points[a]
            )
            if (
                normal.length > 1.0e-12
                and candidate_normal.length > 1.0e-12
                and normal.dot(candidate_normal) <= 0.0
            ):
                flipped += 1
        if flipped:
            raise RuntimeError(f"Transferred {name} flips {flipped} Tripo triangles")
        new_overlaps = nonadjacent_self_overlaps(deformed_points, polygons) - baseline_overlaps
        if new_overlaps:
            raise RuntimeError(
                f"Transferred {name} creates {len(new_overlaps)} new nonadjacent self-overlaps"
            )
        if not observed_determinants or not source_normalized_scales:
            raise RuntimeError(f"Transferred {name} produced no validated semantic samples")
        stats[name] = {
            "affectedRawVertices": affected,
            "maximumDeltaMeters": maximum,
            "nativeMaximumHm08Units": float(
                np.linalg.norm(targets[name], axis=1).max()
            ),
            "neutralJacobian": {
                "method": "analytic-r3-v1",
                "sampleCount": len(observed_determinants),
                "minimumDeterminant": min(observed_determinants),
                "maximumConditionNumber": max(observed_conditions),
            },
            "exactSecantCrossValidation": {
                **contract.receipt,
                "minimumSourceNormalizedScale": min(source_normalized_scales),
                "maximumSourceNormalizedScale": max(source_normalized_scales),
                "minimumLocalSourceNormalizedScale": min(
                    local_source_normalized_scales
                ),
                "maximumLocalSourceNormalizedScale": max(
                    local_source_normalized_scales
                ),
                "maximumDisagreementOverTwoHeldOutErrors": max(
                    normalized_disagreements
                ),
            },
            "triangleFlipCount": flipped,
            "newNonadjacentSelfOverlapCount": len(new_overlaps),
            "neckSeamMaximumDeltaMeters": 0.0,
        }
    return stats


def add_gate_camera(armature: bpy.types.Object) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("FaceTransferGateWorld")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (
        0.035,
        0.042,
        0.052,
        1.0,
    )
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22
    bone_matrix = armature.data.bones[HEAD_BONE].matrix_local

    def world(point: Vector) -> Vector:
        return armature.matrix_world @ bone_matrix @ point

    target = world(Vector((0.0, 0.048, 0.012)))
    camera_data = bpy.data.cameras.new("FaceTransferGateCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 0.205
    camera = bpy.data.objects.new("FaceTransferGateCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    for name, point, energy, size in (
        ("TransferKey", Vector((0.18, 0.17, 0.24)), 650.0, 0.18),
        ("TransferFill", Vector((-0.16, 0.10, 0.19)), 360.0, 0.18),
        ("TransferRim", Vector((0.0, 0.18, -0.18)), 420.0, 0.16),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = world(point)
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
    return camera


def render_three_target_gate(
    evidence: Path,
    head: bpy.types.Object,
    armature: bpy.types.Object,
) -> list[str]:
    camera = add_gate_camera(armature)
    scene = bpy.context.scene
    bone_matrix = armature.data.bones[HEAD_BONE].matrix_local

    def world(point: Vector) -> Vector:
        return armature.matrix_world @ bone_matrix @ point

    target = world(Vector((0.0, 0.048, 0.012)))
    views = {
        "front": Vector((0.0, 0.050, 0.42)),
        "profile": Vector((0.36, 0.050, 0.015)),
        "three-quarter": Vector((0.27, 0.070, 0.30)),
    }
    states = {"neutral": None, **{name: name for name in PROOF_TARGETS}}
    renders = []
    for state, active in states.items():
        for block in head.data.shape_keys.key_blocks:
            if block.name != "Basis":
                block.value = 1.0 if block.name == active else 0.0
        for view_name, position in views.items():
            camera.location = world(position)
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            path = evidence / f"{state}-{view_name}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            renders.append(str(path).replace("\\", "/"))
    return renders


def registration_proof(args: argparse.Namespace) -> dict[str, object]:
    source_path = Path(args.source_glb).resolve()
    hm08_path = Path(args.hm08_obj).resolve()
    target_root = Path(args.target_root).resolve()
    evidence = Path(args.evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    if file_sha256(source_path) != SOURCE_SHA256 or file_sha256(hm08_path) != HM08_SHA256:
        raise RuntimeError("Locked Tripo or HM08 source changed")
    target_pack_audit(target_root)
    source, triangles = parse_hm08(hm08_path)
    target_dir = target_root / "assets/faceunits01/targets/faceunits"
    canonical_targets = {
        name: read_target(target_dir / f"{name}.target", len(source))
        for name in PROOF_TARGETS
    }
    targets = {
        name: target_to_registration_frame(delta)
        for name, delta in canonical_targets.items()
    }
    source_graph = source_adjacency(triangles)
    source_regions = {
        "left_eye": affected_component(
            targets["eyeBlinkLeft"],
            source_graph,
            source,
            lambda center: center[0] > 0.20 and center[1] > 7.0,
        ),
        "right_eye": affected_component(
            targets["eyeBlinkRight"],
            source_graph,
            source,
            lambda center: center[0] < -0.20 and center[1] > 7.0,
        ),
        "jaw": affected_component(
            targets["jawOpen"],
            source_graph,
            source,
            lambda center: abs(center[0]) < 0.05 and center[1] < 7.0,
        ),
    }
    source_regions["left_eye"].update(
        neighbor
        for index in list(source_regions["left_eye"])
        for neighbor in source_graph[index]
    )
    source_regions["right_eye"].update(
        neighbor
        for index in list(source_regions["right_eye"])
        for neighbor in source_graph[index]
    )
    source_regions["jaw"] = {
        index
        for index in source_regions["jaw"]
        if source[index, 1] <= 7.05 and source[index, 2] >= 0.45
    }
    source_regions["jaw"].update(
        neighbor
        for index in list(source_regions["jaw"])
        for neighbor in source_graph[index]
        if source[neighbor, 1] <= 7.05 and source[neighbor, 2] >= 0.45
    )
    source_eye_neighborhoods = source_eye_topology_neighborhoods(
        source, source_regions, source_graph
    )
    interocular_measurement = source_interocular_receipt(
        source, source_eye_neighborhoods
    )
    native_golden = native_source_golden_gate(
        evidence,
        source,
        triangles,
        canonical_targets,
        interocular_measurement,
    )
    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported_objects(source_path)
    armature = runtime_armature()
    RigifyAuthoringInterface.strip_and_validate_runtime_armature()
    head = bpy.data.objects[HEAD_OBJECT]
    basis_signature = mesh_basis_signature(head)
    raw_points = head_local_points(head, armature)
    raw_keys, raw_for_key, key_points, adjacency, logical_faces = logical_topology(
        head, raw_points
    )
    key_normals = head_local_logical_normals(head, armature, raw_for_key)
    regions = exact_target_regions(
        raw_for_key, key_points, key_normals, adjacency, logical_faces
    )
    try:
        warp, landmarks, semantic_local_maps = build_neutral_warp(
            source,
            triangles,
            key_points,
            regions,
            source_regions,
            source_graph,
            source_eye_neighborhoods,
            interocular_measurement,
        )
    except RuntimeError as error:
        failure = {
            "schema": "souldrifter.facial-transfer-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_CANDIDATE_GENERATED",
            "stage": "NEUTRAL_REGISTRATION",
            "reason": str(error),
            "diagnostic": getattr(error, "diagnostic", None),
            "basisSignature": basis_signature,
            "sourceInterocularReceipt": interocular_measurement,
            "sourceEyeTopologyNeighborhoods": source_eye_neighborhoods,
            "nativeSourceGoldenReceipt": {
                "path": native_golden["receiptPath"],
                "sha256": native_golden["receiptSha256"],
            },
            "promotion": "BLOCKED",
        }
        failure_path = evidence / "transfer-failure-receipt.json"
        failure_path.write_text(json.dumps(failure, indent=2) + "\n", encoding="utf-8")
        raise RuntimeError(
            f"{error}; failureReceipt={failure_path}; "
            f"sha256={file_sha256(failure_path)}"
        ) from error
    warped_source = warp.transform(source)
    records = build_correspondence(
        head,
        raw_points,
        raw_keys,
        key_points,
        regions,
        source,
        triangles,
        warped_source,
        source_regions,
    )
    registration_payload = {
        "schema": RegistrationInterface.schema,
        "sourceSha256": SOURCE_SHA256,
        "hm08Sha256": HM08_SHA256,
        "basisSignature": basis_signature,
        "landmarks": landmarks,
        "targetRegionSelector": regions["lipSelector"],
        "records": [record.__dict__ for record in records],
    }
    registration_path = evidence / "neutral-registration.json"
    registration_path.write_text(
        json.dumps(registration_payload, indent=2) + "\n", encoding="utf-8"
    )
    try:
        transfer = bake_three_targets(
            head,
            armature,
            raw_points,
            raw_keys,
            regions,
            records,
            source,
            warp,
            targets,
            semantic_local_maps,
            landmarks["metrics"]["jacobianConditionLimit"],
        )
    except RuntimeError as error:
        failure = {
            "schema": "souldrifter.facial-transfer-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_CANDIDATE_GENERATED",
            "reason": str(error),
            "basisSignature": basis_signature,
            "nativeSourceGoldenReceipt": {
                "path": native_golden["receiptPath"],
                "sha256": native_golden["receiptSha256"],
            },
            "neutralRegistration": {
                "path": str(registration_path).replace("\\", "/"),
                "sha256": file_sha256(registration_path),
                "selectorSha256": regions["lipSelector"]["selectorSha256"],
                "landmarkMetrics": landmarks["metrics"],
            },
            "promotion": "BLOCKED",
        }
        failure_path = evidence / "transfer-failure-receipt.json"
        failure_path.write_text(json.dumps(failure, indent=2) + "\n", encoding="utf-8")
        raise RuntimeError(
            f"{error}; failureReceipt={failure_path}; "
            f"sha256={file_sha256(failure_path)}"
        ) from error
    if mesh_basis_signature(head) != basis_signature:
        raise RuntimeError("Adding proof shape keys changed the exact Tripo Basis")
    renders = render_three_target_gate(evidence, head, armature)
    report = {
        "schema": "souldrifter.facial-transfer-registration-proof.v1",
        "issue": ISSUE,
        "status": "STRUCTURAL_PROOF_RENDERED_NOT_PROMOTED",
        "basis": basis_signature,
        "nativeSourceGolden": native_golden,
        "registration": {
            "path": str(registration_path).replace("\\", "/"),
            "sha256": file_sha256(registration_path),
            "recordCount": len(records),
            "semanticRegionCounts": dict(Counter(record.region for record in records)),
            "landmarks": landmarks["metrics"],
        },
        "transfer": transfer,
        "renders": renders,
        "runtimeArmature": RigifyAuthoringInterface.strip_and_validate_runtime_armature(),
        "promotion": "BLOCKED_PENDING_VISUAL_REVIEW_RIGIFY_PREVIEW_AND_FRESH_IMPORT",
    }
    receipt = evidence / "registration-proof-receipt.json"
    receipt.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("FACIAL_TRANSFER_REGISTRATION_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def main() -> None:
    args = parse_args()
    if args.stage == "source-audit":
        source_audit(args)
    elif args.stage == "registration-proof":
        registration_proof(args)
    else:
        raise RuntimeError(f"Unsupported fail-closed stage: {args.stage}")


if __name__ == "__main__":
    main()
