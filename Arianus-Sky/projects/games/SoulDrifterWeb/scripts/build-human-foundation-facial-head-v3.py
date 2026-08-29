"""Fail-closed issue #487 facial-transfer proof scaffold.

This file intentionally contains no facial deformation authoring.  It locks the
owner-approved Tripo Smart Mesh Basis, validates the canonical CC0 MakeHuman
ARKit source pack and bundled Rigify modules, and defines the interfaces the
three-target transfer proof must satisfy before it may create a candidate GLB.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys

import bpy
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
@dataclass(frozen=True)
class CorrespondenceRecord:
    """One persisted semantic-region barycentric transfer record."""

    tripo_raw_vertex: int
    tripo_logical_vertex: int
    region: str
    hm08_triangle: tuple[int, int, int]
    barycentric: tuple[float, float, float]
    signed_normal_offset: float
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
    parser.add_argument("--stage", choices=("source-audit",), default="source-audit")
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


def main() -> None:
    args = parse_args()
    if args.stage != "source-audit":
        raise RuntimeError(f"Unsupported fail-closed stage: {args.stage}")
    source_audit(args)


if __name__ == "__main__":
    main()
