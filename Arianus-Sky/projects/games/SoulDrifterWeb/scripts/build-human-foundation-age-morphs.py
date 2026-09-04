"""Build quarantined, same-topology Human age morph candidates for issue #487.

Young Adult is always the approved head's neutral Basis.  This builder adds
exactly two age keys, ``Age_Middle`` and ``Age_Elder``, from the locked CC0
MakeHuman head-age source.  It deliberately has no runtime-promotion mode.

The build path is fail closed: it requires an explicit owner approval receipt
that binds the promoted source GLB, SHA-256, Basis/topology contract, existing
facial morphs, neck seam, and oral-cavity objects.  Until that receipt exists,
the script will not create an output directory or write any artifact.

Run contract/preflight checks with normal Python.  Run source inspection and
candidate construction with the cached Blender 5.2.1 executable.
"""

from __future__ import annotations

import argparse
from datetime import datetime
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import struct
import subprocess
import sys
from typing import Any


ISSUE = 487
HEAD_OBJECT = "HumanFoundation_HeadBase"
BODY_OBJECT = "HumanFoundation_BodyNoHead"
ARMATURE_ROOT = "mixamorig:Hips"
EXPECTED_BONE_COUNT = 65
AGE_MORPHS = ("Age_Middle", "Age_Elder")
AGE_WEIGHTS = {"Age_Middle": 0.5, "Age_Elder": 1.0}

APPROVAL_SCHEMA = "souldrifter.human-head-source-approval.v1"
APPROVAL_STATUS = "PROMOTED_SOURCE_APPROVED_FOR_AGE_AUTHORING"
APPROVAL_SCOPE = "ISSUE_487_HUMAN_AGE_MORPHS"
APPROVAL_AUTHORITY = "SOULDRIFTER_OWNER"

EVIDENCE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487\age-morph-proof"
)
CANDIDATE_NAME = "human-foundation-age-morph-candidate.glb"
PROVENANCE_NAME = "human-foundation-age-morph-candidate.provenance.json"

MAKEHUMAN_REPO = Path(
    r"H:\CodexData\souldrifter-toolchain\sources\makehuman-official"
)
MAKEHUMAN_REMOTE = "https://github.com/makehumancommunity/makehuman.git"
MAKEHUMAN_COMMIT = "a8bc2d54ff0ac92e78ff71431b1023eda42bf482"
MAKEHUMAN_LICENSE_PATH = "LICENSE.ASSETS.md"
MAKEHUMAN_LICENSE_SHA256 = (
    "F6089CBA01CB570A24712B41AB8A586CCD3CC5EF53DC266CA50B95C288956D2C"
)
MAKEHUMAN_BASE_PATH = "makehuman/data/3dobjs/base.obj"
MAKEHUMAN_BASE_SHA256 = (
    "8E761E6624B8F54536409135D1636DA63B32486A90D4897F84E121D144F6FB4C"
)
MAKEHUMAN_AGE_PATH = "makehuman/data/targets/head/head-age-incr.target"
MAKEHUMAN_AGE_SHA256 = (
    "FF677345BD81E3F439BDF75496BBEE620CA3C3F029955A546837AFD283ABF73A"
)
MAKEHUMAN_BODY_VERTEX_COUNT = 13380
MAKEHUMAN_TOTAL_VERTEX_COUNT = 19158
MAKEHUMAN_AGE_ENTRY_COUNT = 3195
MAKEHUMAN_HEAD_MIN_Y = 6.25

REQUIRED_CAVITY_OBJECTS = (
    "HumanFoundation_UpperTeeth",
    "HumanFoundation_LowerTeeth",
    "HumanFoundation_Tongue",
)
SEAM_TOLERANCE_METERS = 3.0e-5
MAXIMUM_AGE_DELTA_METERS = 0.02
MINIMUM_AFFECTED_VERTEX_COUNT = 100


class AgeMorphGateError(RuntimeError):
    """A fail-closed contract violation suitable for machine-readable output."""


def script_arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--command",
        choices=(
            "contract",
            "audit-serialized-source",
            "inspect-source",
            "build-candidate",
        ),
        required=True,
    )
    parser.add_argument("--source-glb")
    parser.add_argument("--source-sha256")
    parser.add_argument("--source-approval-receipt")
    parser.add_argument("--output-dir", default=str(EVIDENCE_ROOT))
    parser.add_argument("--replace-existing", action="store_true")
    return parser.parse_args(values)


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def bytes_sha256(value: bytes) -> str:
    return sha256(value).hexdigest().upper()


def normalized_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


def same_path(left: Path, right: Path) -> bool:
    return normalized_path(left).casefold() == normalized_path(right).casefold()


def is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def validate_sha256(value: str | None, label: str) -> str:
    normalized = (value or "").strip().upper()
    if len(normalized) != 64 or any(character not in "0123456789ABCDEF" for character in normalized):
        raise AgeMorphGateError(f"{label} must be an explicit 64-character SHA-256")
    return normalized


def contract_payload() -> dict[str, Any]:
    return {
        "schema": "souldrifter.human-age-morph-builder-contract.v1",
        "issue": ISSUE,
        "youngAdult": "Basis",
        "authoredMorphs": list(AGE_MORPHS),
        "weights": AGE_WEIGHTS,
        "sourceApproval": {
            "schema": APPROVAL_SCHEMA,
            "status": APPROVAL_STATUS,
            "scope": APPROVAL_SCOPE,
            "authority": APPROVAL_AUTHORITY,
            "required": True,
        },
        "makeHuman": {
            "repository": MAKEHUMAN_REMOTE,
            "commit": MAKEHUMAN_COMMIT,
            "license": "CC0-1.0",
            "licenseSha256": MAKEHUMAN_LICENSE_SHA256,
            "ageTarget": MAKEHUMAN_AGE_PATH,
            "ageTargetSha256": MAKEHUMAN_AGE_SHA256,
        },
        "output": {
            "root": normalized_path(EVIDENCE_ROOT),
            "candidate": CANDIDATE_NAME,
            "provenance": PROVENANCE_NAME,
            "runtimePromotionMode": False,
            "visualQaPassed": False,
        },
    }


def require_source_arguments(args: argparse.Namespace) -> tuple[Path, str]:
    if not args.source_glb:
        raise AgeMorphGateError("--source-glb is required; no default source is permitted")
    source = Path(args.source_glb).resolve()
    expected_sha = validate_sha256(args.source_sha256, "--source-sha256")
    if not source.is_file():
        raise AgeMorphGateError(f"source GLB does not exist: {source}")
    actual_sha = file_sha256(source)
    if actual_sha != expected_sha:
        raise AgeMorphGateError(
            f"source GLB SHA-256 mismatch: expected {expected_sha}, got {actual_sha}"
        )
    return source, actual_sha


def serialized_glb_contract(source: Path) -> dict[str, Any]:
    """Audit only content physically serialized in a GLB JSON chunk.

    Blender's glTF importer creates a non-exported Icosphere custom shape for
    armature pose bones.  That importer-only object must not be confused with a
    helper serialized by the source.  Conversely, every serialized mesh is
    audited here before Blender can rename, hide, or supplement the scene.
    """
    try:
        payload = source.read_bytes()
    except OSError as error:
        raise AgeMorphGateError(f"source GLB is unreadable: {error}") from error
    if len(payload) < 20:
        raise AgeMorphGateError("source GLB is too short to contain a JSON chunk")
    magic, version, declared_length = struct.unpack_from("<4sII", payload, 0)
    if magic != b"glTF" or version != 2:
        raise AgeMorphGateError(
            f"source is not a GLB 2.0 container: magic={magic!r}, version={version}"
        )
    if declared_length != len(payload):
        raise AgeMorphGateError(
            f"source GLB length changed: header={declared_length}, bytes={len(payload)}"
        )
    offset = 12
    json_chunk: bytes | None = None
    chunk_types: list[str] = []
    while offset < declared_length:
        if offset + 8 > declared_length:
            raise AgeMorphGateError("source GLB has a truncated chunk header")
        chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += 8
        end = offset + chunk_length
        if end > declared_length:
            raise AgeMorphGateError("source GLB has a truncated chunk payload")
        chunk_types.append(struct.pack("<I", chunk_type).decode("ascii", errors="replace"))
        if chunk_type == 0x4E4F534A:
            if json_chunk is not None:
                raise AgeMorphGateError("source GLB contains multiple JSON chunks")
            json_chunk = payload[offset:end]
        offset = end
    if offset != declared_length or json_chunk is None:
        raise AgeMorphGateError("source GLB does not contain exactly one readable JSON chunk")
    try:
        document = json.loads(json_chunk.rstrip(b" \t\r\n\0").decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AgeMorphGateError(f"source GLB JSON chunk is invalid: {error}") from error
    if not isinstance(document, dict):
        raise AgeMorphGateError("source GLB JSON root is not an object")
    asset = document.get("asset")
    if not isinstance(asset, dict) or asset.get("version") != "2.0":
        raise AgeMorphGateError("source GLB JSON asset.version is not 2.0")
    nodes = document.get("nodes", [])
    meshes = document.get("meshes", [])
    cameras = document.get("cameras", [])
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        raise AgeMorphGateError("source GLB nodes are malformed")
    if not isinstance(meshes, list) or not all(isinstance(mesh, dict) for mesh in meshes):
        raise AgeMorphGateError("source GLB meshes are malformed")
    if not isinstance(cameras, list):
        raise AgeMorphGateError("source GLB cameras are malformed")
    extensions = document.get("extensions", {})
    if not isinstance(extensions, dict):
        raise AgeMorphGateError("source GLB extensions are malformed")
    punctual = extensions.get("KHR_lights_punctual", {})
    if not isinstance(punctual, dict):
        raise AgeMorphGateError("source GLB punctual-light extension is malformed")
    light_definitions = punctual.get("lights", [])
    if not isinstance(light_definitions, list):
        raise AgeMorphGateError("source GLB punctual-light definitions are malformed")
    camera_nodes = [
        {"nodeIndex": index, "name": node.get("name")}
        for index, node in enumerate(nodes)
        if "camera" in node
    ]
    light_nodes = []
    for index, node in enumerate(nodes):
        node_extensions = node.get("extensions", {})
        if not isinstance(node_extensions, dict):
            raise AgeMorphGateError(f"source GLB node {index} extensions are malformed")
        if "KHR_lights_punctual" in node_extensions:
            light_nodes.append({"nodeIndex": index, "name": node.get("name")})
    if cameras or camera_nodes or light_definitions or light_nodes:
        raise AgeMorphGateError(
            "serialized GLB contains presentation cameras/lights: "
            f"cameraDefinitions={len(cameras)}, cameraNodes={camera_nodes}, "
            f"lightDefinitions={len(light_definitions)}, lightNodes={light_nodes}"
        )

    mesh_nodes: list[dict[str, Any]] = []
    referenced_meshes: set[int] = set()
    duplicate_names: set[str] = set()
    seen_names: set[str] = set()
    for node_index, node in enumerate(nodes):
        if "mesh" not in node:
            continue
        mesh_index = node["mesh"]
        if (
            isinstance(mesh_index, bool)
            or not isinstance(mesh_index, int)
            or not 0 <= mesh_index < len(meshes)
        ):
            raise AgeMorphGateError(
                f"source GLB node {node_index} has an invalid mesh reference: {mesh_index!r}"
            )
        node_name = node.get("name")
        mesh_name = meshes[mesh_index].get("name")
        if not isinstance(node_name, str) or not node_name:
            raise AgeMorphGateError(f"serialized mesh node {node_index} has no auditable name")
        if node_name in seen_names:
            duplicate_names.add(node_name)
        seen_names.add(node_name)
        referenced_meshes.add(mesh_index)
        mesh_nodes.append(
            {
                "nodeIndex": node_index,
                "nodeName": node_name,
                "meshIndex": mesh_index,
                "meshName": mesh_name,
            }
        )
    if duplicate_names:
        raise AgeMorphGateError(
            f"serialized GLB contains duplicate mesh-node names: {sorted(duplicate_names)}"
        )
    unreferenced = sorted(set(range(len(meshes))) - referenced_meshes)
    if unreferenced:
        raise AgeMorphGateError(
            f"serialized GLB contains unreferenced mesh definitions: {unreferenced}"
        )
    helper_nodes = sorted(
        entry["nodeName"]
        for entry in mesh_nodes
        if not entry["nodeName"].startswith("HumanFoundation_")
    )
    helper_definitions = sorted(
        f"[{index}] {mesh.get('name')!r}"
        for index, mesh in enumerate(meshes)
        if not isinstance(mesh.get("name"), str)
        or not mesh["name"].startswith("HumanFoundation_")
    )
    if helper_nodes or helper_definitions:
        raise AgeMorphGateError(
            "serialized GLB contains helper meshes: "
            f"nodes={helper_nodes}, definitions={helper_definitions}"
        )
    return {
        "format": "GLB_2_0",
        "declaredByteLength": declared_length,
        "jsonChunkSha256": bytes_sha256(json_chunk),
        "chunkTypes": chunk_types,
        "nodeCount": len(nodes),
        "meshCount": len(meshes),
        "meshNodes": mesh_nodes,
        "meshDefinitionNames": [mesh["name"] for mesh in meshes],
        "serializedHelperMeshes": [],
        "serializedCameraCount": 0,
        "serializedPunctualLightCount": 0,
    }


def parse_approval_time(value: Any) -> str:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise AgeMorphGateError("approval.approvedAt must be an explicit UTC ISO-8601 timestamp")
    try:
        datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as error:
        raise AgeMorphGateError("approval.approvedAt is not valid ISO-8601") from error
    return value


def require_approval(
    args: argparse.Namespace, source: Path, source_sha: str
) -> tuple[dict[str, Any], Path, str]:
    if not args.source_approval_receipt:
        raise AgeMorphGateError(
            "--source-approval-receipt is required before any age candidate may be written"
        )
    receipt_path = Path(args.source_approval_receipt).resolve()
    if not receipt_path.is_file():
        raise AgeMorphGateError(f"source approval receipt does not exist: {receipt_path}")
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AgeMorphGateError(f"source approval receipt is unreadable: {error}") from error
    if receipt.get("schema") != APPROVAL_SCHEMA:
        raise AgeMorphGateError("source approval receipt schema is not accepted")
    if receipt.get("issue") != ISSUE:
        raise AgeMorphGateError("source approval receipt is not for issue #487")
    if receipt.get("status") != APPROVAL_STATUS or receipt.get("scope") != APPROVAL_SCOPE:
        raise AgeMorphGateError("source approval receipt does not approve age authoring")
    source_contract = receipt.get("source")
    if not isinstance(source_contract, dict):
        raise AgeMorphGateError("source approval receipt has no source contract")
    if source_contract.get("promoted") is not True:
        raise AgeMorphGateError("source approval receipt does not mark the source as promoted")
    if source_contract.get("sha256", "").upper() != source_sha:
        raise AgeMorphGateError("source approval receipt SHA-256 does not match the source")
    receipt_source_path = source_contract.get("path")
    if not isinstance(receipt_source_path, str) or not same_path(Path(receipt_source_path), source):
        raise AgeMorphGateError("source approval receipt path does not match --source-glb")
    approval = receipt.get("approval")
    if not isinstance(approval, dict):
        raise AgeMorphGateError("source approval receipt has no approval decision")
    if approval.get("authority") != APPROVAL_AUTHORITY or approval.get("decision") != "APPROVED":
        raise AgeMorphGateError("source approval authority/decision is not accepted")
    approved_by = approval.get("approvedBy")
    if not isinstance(approved_by, str) or not approved_by.strip():
        raise AgeMorphGateError("approval.approvedBy must identify the approving owner")
    parse_approval_time(approval.get("approvedAt"))
    topology = receipt.get("topology")
    if not isinstance(topology, dict):
        raise AgeMorphGateError("source approval receipt has no exact topology contract")
    return receipt, receipt_path, file_sha256(receipt_path)


def require_quarantined_output(args: argparse.Namespace) -> Path:
    output_dir = Path(args.output_dir).resolve()
    if not same_path(output_dir, EVIDENCE_ROOT):
        raise AgeMorphGateError(
            f"candidate output is locked to the non-runtime evidence root: {EVIDENCE_ROOT}"
        )
    lowered = normalized_path(output_dir).casefold()
    if "/public/" in lowered or "/src/" in lowered:
        raise AgeMorphGateError("runtime/source-tree output is forbidden")
    if not is_within(output_dir, EVIDENCE_ROOT):
        raise AgeMorphGateError("candidate output escaped the evidence root")
    candidate = output_dir / CANDIDATE_NAME
    provenance = output_dir / PROVENANCE_NAME
    if not args.replace_existing and (candidate.exists() or provenance.exists()):
        raise AgeMorphGateError(
            "quarantined candidate already exists; use --replace-existing explicitly"
        )
    return output_dir


def git_text(repo: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise AgeMorphGateError(
            f"git {' '.join(arguments)} failed: {result.stderr.strip()}"
        )
    return result.stdout.strip()


def git_blob(repo: Path, commit: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo), "cat-file", "blob", f"{commit}:{path}"],
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        raise AgeMorphGateError(
            f"cached MakeHuman blob is unavailable: {path}: "
            f"{result.stderr.decode('utf-8', errors='replace').strip()}"
        )
    return result.stdout


def makehuman_source_audit() -> tuple[dict[str, Any], bytes, bytes]:
    if not MAKEHUMAN_REPO.is_dir():
        raise AgeMorphGateError(f"cached MakeHuman repository is missing: {MAKEHUMAN_REPO}")
    commit = git_text(MAKEHUMAN_REPO, "rev-parse", "HEAD")
    if commit != MAKEHUMAN_COMMIT:
        raise AgeMorphGateError(f"cached MakeHuman commit changed: {commit}")
    remote = git_text(MAKEHUMAN_REPO, "remote", "get-url", "origin")
    if remote.rstrip("/") != MAKEHUMAN_REMOTE.rstrip("/"):
        raise AgeMorphGateError(f"cached MakeHuman origin changed: {remote}")
    license_bytes = git_blob(MAKEHUMAN_REPO, MAKEHUMAN_COMMIT, MAKEHUMAN_LICENSE_PATH)
    base_bytes = git_blob(MAKEHUMAN_REPO, MAKEHUMAN_COMMIT, MAKEHUMAN_BASE_PATH)
    age_bytes = git_blob(MAKEHUMAN_REPO, MAKEHUMAN_COMMIT, MAKEHUMAN_AGE_PATH)
    observed = {
        "license": bytes_sha256(license_bytes),
        "base": bytes_sha256(base_bytes),
        "age": bytes_sha256(age_bytes),
    }
    expected = {
        "license": MAKEHUMAN_LICENSE_SHA256,
        "base": MAKEHUMAN_BASE_SHA256,
        "age": MAKEHUMAN_AGE_SHA256,
    }
    if observed != expected:
        raise AgeMorphGateError(
            f"cached MakeHuman CC0 source/hash contract changed: {observed}"
        )
    return (
        {
            "repository": MAKEHUMAN_REMOTE,
            "commit": commit,
            "license": "CC0-1.0",
            "licensePath": MAKEHUMAN_LICENSE_PATH,
            "licenseSha256": observed["license"],
            "basePath": MAKEHUMAN_BASE_PATH,
            "baseSha256": observed["base"],
            "ageTargetPath": MAKEHUMAN_AGE_PATH,
            "ageTargetSha256": observed["age"],
            "middleWeight": AGE_WEIGHTS["Age_Middle"],
            "elderWeight": AGE_WEIGHTS["Age_Elder"],
        },
        base_bytes,
        age_bytes,
    )


def load_blender() -> tuple[Any, Any, Any]:
    try:
        import bpy  # type: ignore
        from mathutils import Vector  # type: ignore
        from mathutils.bvhtree import BVHTree  # type: ignore
    except ModuleNotFoundError as error:
        raise AgeMorphGateError(
            "inspect-source/build-candidate must run through the cached Blender executable"
        ) from error
    return bpy, Vector, BVHTree


def float32_triplet(values: Any) -> bytes:
    return struct.pack("<3f", float(values[0]), float(values[1]), float(values[2]))


def basis_points(obj: Any) -> list[Any]:
    if obj.data.shape_keys is not None:
        blocks = obj.data.shape_keys.key_blocks
        if not blocks or blocks[0].name != "Basis":
            raise AgeMorphGateError(f"{obj.name} shape-key Basis is missing or reordered")
        return [entry.co.copy() for entry in blocks[0].data]
    return [vertex.co.copy() for vertex in obj.data.vertices]


def point_array_sha256(points: list[Any]) -> str:
    digest = sha256()
    digest.update(struct.pack("<I", len(points)))
    for point in points:
        digest.update(float32_triplet(point))
    return digest.hexdigest().upper()


def mesh_topology_sha256(obj: Any) -> str:
    digest = sha256()
    mesh = obj.data
    digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
    for polygon in mesh.polygons:
        digest.update(struct.pack("<II", len(polygon.vertices), polygon.material_index))
        for index in polygon.vertices:
            digest.update(struct.pack("<I", index))
    for layer in mesh.uv_layers:
        digest.update(layer.name.encode("utf-8") + b"\0")
        for loop in layer.data:
            digest.update(struct.pack("<2f", float(loop.uv.x), float(loop.uv.y)))
    for material in mesh.materials:
        digest.update((material.name if material else "<null>").encode("utf-8") + b"\0")
    return digest.hexdigest().upper()


def morph_contract(obj: Any) -> list[dict[str, Any]]:
    if obj.data.shape_keys is None:
        return []
    return [
        {"name": block.name, "sha256": point_array_sha256([entry.co for entry in block.data])}
        for block in obj.data.shape_keys.key_blocks
        if block.name != "Basis"
    ]


def seam_contract(points: list[Any]) -> tuple[dict[str, Any], set[int]]:
    minimum_y = min(float(point.y) for point in points)
    raw = {
        index
        for index, point in enumerate(points)
        if abs(float(point.y) - minimum_y) <= SEAM_TOLERANCE_METERS
    }
    logical = sorted({float32_triplet(points[index]) for index in raw})
    if len(raw) < 8 or len(logical) < 8:
        raise AgeMorphGateError(
            f"exact neck seam is not readable: {len(raw)} raw/{len(logical)} logical vertices"
        )
    digest = sha256()
    for value in logical:
        digest.update(value)
    return (
        {
            "rawVertexCount": len(raw),
            "logicalVertexCount": len(logical),
            "coordinateSha256": digest.hexdigest().upper(),
        },
        raw,
    )


def cavity_contract(head: Any) -> tuple[dict[str, Any], set[int]]:
    names = [material.name if material else "" for material in head.data.materials]
    indices = {
        index
        for index, name in enumerate(names)
        if "mouth" in name.casefold() or "oral" in name.casefold()
    }
    if not indices:
        raise AgeMorphGateError("head has no explicit mouth/oral cavity material")
    protected = {
        vertex_index
        for polygon in head.data.polygons
        if polygon.material_index in indices
        for vertex_index in polygon.vertices
    }
    if len(protected) < 12:
        raise AgeMorphGateError(
            f"oral cavity protection set is unexpectedly small: {len(protected)}"
        )
    return (
        {
            "materialNames": [names[index] for index in sorted(indices)],
            "protectedRawVertexCount": len(protected),
        },
        protected,
    )


def mesh_contract(obj: Any) -> dict[str, Any]:
    points = basis_points(obj)
    return {
        "name": obj.name,
        "vertexCount": len(obj.data.vertices),
        "polygonCount": len(obj.data.polygons),
        "basisSha256": point_array_sha256(points),
        "topologySha256": mesh_topology_sha256(obj),
        "materials": [material.name if material else None for material in obj.data.materials],
        "uvLayers": [layer.name for layer in obj.data.uv_layers],
    }


def importer_only_helpers(
    bpy: Any, serialized_source: dict[str, Any]
) -> tuple[list[Any], list[dict[str, Any]]]:
    serialized_mesh_nodes = {
        entry["nodeName"] for entry in serialized_source["meshNodes"]
    }
    all_meshes = sorted(
        (obj for obj in bpy.data.objects if obj.type == "MESH"), key=lambda obj: obj.name
    )
    runtime_meshes = [obj for obj in all_meshes if obj.name in serialized_mesh_nodes]
    observed_runtime_names = {obj.name for obj in runtime_meshes}
    missing = sorted(serialized_mesh_nodes - observed_runtime_names)
    if missing:
        raise AgeMorphGateError(
            f"Blender fresh import lost serialized runtime mesh nodes: {missing}"
        )
    helpers: list[dict[str, Any]] = []
    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj in runtime_meshes:
            continue
        if obj.type not in {"MESH", "CAMERA", "LIGHT"}:
            continue
        pose_shape_users = 0
        if obj.type == "MESH":
            pose_shape_users = sum(
                1
                for armature in bpy.data.objects
                if armature.type == "ARMATURE"
                for pose_bone in armature.pose.bones
                if pose_bone.custom_shape == obj
            )
        helpers.append(
            {
                "classification": "BLENDER_GLTF_IMPORTER_ONLY_NOT_SERIALIZED",
                "objectName": obj.name,
                "objectType": obj.type,
                "dataName": obj.data.name if obj.data is not None else None,
                "collections": sorted(collection.name for collection in obj.users_collection),
                "poseCustomShapeUserCount": pose_shape_users,
            }
        )
    return runtime_meshes, sorted(helpers, key=lambda entry: entry["objectName"])


def inspect_imported_scene(
    bpy: Any,
    *,
    allow_age_morphs: bool,
    serialized_source: dict[str, Any],
) -> dict[str, Any]:
    mesh_objects, importer_helpers = importer_only_helpers(bpy, serialized_source)
    by_name = {obj.name: obj for obj in mesh_objects}
    required = {HEAD_OBJECT, BODY_OBJECT, *REQUIRED_CAVITY_OBJECTS}
    missing = sorted(required - set(by_name))
    if missing:
        raise AgeMorphGateError(f"promoted runtime source is missing required meshes: {missing}")
    head = by_name[HEAD_OBJECT]
    if any(len(polygon.vertices) != 3 for polygon in head.data.polygons):
        raise AgeMorphGateError("exact head is not triangulated after fresh GLB import")
    points = basis_points(head)
    if not points or not all(math.isfinite(component) for point in points for component in point):
        raise AgeMorphGateError("exact head Basis contains non-finite coordinates")
    morphs = morph_contract(head)
    morph_names = [entry["name"] for entry in morphs]
    age_present = [name for name in AGE_MORPHS if name in morph_names]
    if age_present and not allow_age_morphs:
        raise AgeMorphGateError(f"approved source already contains age morphs: {age_present}")
    if allow_age_morphs and morph_names[-len(AGE_MORPHS) :] != list(AGE_MORPHS):
        raise AgeMorphGateError(
            f"fresh candidate morph order is not canonical: {morph_names}"
        )
    seam, _ = seam_contract(points)
    cavity, _ = cavity_contract(head)
    armatures = sorted(
        (obj for obj in bpy.data.objects if obj.type == "ARMATURE"), key=lambda obj: obj.name
    )
    if len(armatures) != 1:
        raise AgeMorphGateError(
            f"promoted runtime source must contain one armature: {[obj.name for obj in armatures]}"
        )
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONE_COUNT or roots != [ARMATURE_ROOT]:
        raise AgeMorphGateError(
            f"canonical body rig changed: {len(armature.data.bones)} bones, roots={roots}"
        )
    if len(bpy.data.actions) != 0:
        raise AgeMorphGateError("head source/candidate must not embed animation actions")
    return {
        "headObject": HEAD_OBJECT,
        "serializedSource": serialized_source,
        "importerOnlyHelpers": importer_helpers,
        "head": mesh_contract(head),
        "existingMorphs": morphs,
        "neckSeam": seam,
        "oralCavity": cavity,
        "runtimeMeshes": [mesh_contract(obj) for obj in mesh_objects],
        "armature": {
            "name": armature.name,
            "boneCount": len(armature.data.bones),
            "rootBones": roots,
        },
        "embeddedActionCount": 0,
    }


def import_source(bpy: Any, source: Path) -> dict[str, Any]:
    serialized_source = serialized_glb_contract(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    return serialized_source


def approval_template(source: Path, source_sha: str, topology: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": APPROVAL_SCHEMA,
        "issue": ISSUE,
        "status": APPROVAL_STATUS,
        "scope": APPROVAL_SCOPE,
        "source": {
            "path": normalized_path(source),
            "sha256": source_sha,
            "promoted": True,
        },
        "topology": topology,
        "approval": {
            "authority": APPROVAL_AUTHORITY,
            "decision": "APPROVED",
            "approvedBy": "<owner identity required>",
            "approvedAt": "<UTC ISO-8601 required>",
        },
    }


def assert_topology_approval(receipt: dict[str, Any], observed: dict[str, Any]) -> None:
    approved = receipt.get("topology")
    if canonical_json(approved) != canonical_json(observed):
        raise AgeMorphGateError(
            "fresh source import does not match the exact topology/Basis/morph/seam contract "
            "in the approval receipt"
        )


def parse_makehuman_obj(base_bytes: bytes, Vector: Any) -> tuple[list[Any], list[tuple[int, int, int]]]:
    vertices: list[Any] = []
    triangles: list[tuple[int, int, int]] = []
    group = ""
    for raw_line in base_bytes.decode("utf-8", errors="strict").splitlines():
        values = raw_line.split()
        if not values:
            continue
        if values[0] == "v":
            vertices.append(Vector(tuple(map(float, values[1:4]))))
        elif values[0] == "g":
            group = values[1]
        elif values[0] == "f" and group == "body":
            face = [int(token.split("/")[0]) - 1 for token in values[1:]]
            if any(index >= MAKEHUMAN_BODY_VERTEX_COUNT for index in face):
                raise AgeMorphGateError("MakeHuman body face references helper geometry")
            triangles.extend(
                (face[0], face[index], face[index + 1])
                for index in range(1, len(face) - 1)
            )
    if len(vertices) != MAKEHUMAN_TOTAL_VERTEX_COUNT or not triangles:
        raise AgeMorphGateError(
            f"MakeHuman hm08 parse changed: {len(vertices)} vertices/{len(triangles)} triangles"
        )
    head_triangles = [
        triangle
        for triangle in triangles
        if all(vertices[index].y >= MAKEHUMAN_HEAD_MIN_Y for index in triangle)
    ]
    if len(head_triangles) < 1000:
        raise AgeMorphGateError(
            f"MakeHuman head surface extraction changed: {len(head_triangles)} triangles"
        )
    return vertices, head_triangles


def parse_makehuman_target(age_bytes: bytes, Vector: Any) -> dict[int, Any]:
    target: dict[int, Any] = {}
    for raw_line in age_bytes.decode("utf-8", errors="strict").splitlines():
        values = raw_line.split()
        if not values or values[0].startswith("#"):
            continue
        if len(values) != 4:
            raise AgeMorphGateError(f"malformed MakeHuman age target row: {raw_line}")
        index = int(values[0])
        if not 0 <= index < MAKEHUMAN_TOTAL_VERTEX_COUNT or index in target:
            raise AgeMorphGateError(f"invalid/duplicate MakeHuman target index: {index}")
        target[index] = Vector(tuple(map(float, values[1:4])))
    if len(target) != MAKEHUMAN_AGE_ENTRY_COUNT:
        raise AgeMorphGateError(
            f"MakeHuman age target entry count changed: {len(target)}"
        )
    if not all(math.isfinite(component) for delta in target.values() for component in delta):
        raise AgeMorphGateError("MakeHuman age target contains non-finite deltas")
    return target


def barycentric_weights(point: Any, a: Any, b: Any, c: Any) -> tuple[float, float, float]:
    edge0 = b - a
    edge1 = c - a
    offset = point - a
    d00 = edge0.dot(edge0)
    d01 = edge0.dot(edge1)
    d11 = edge1.dot(edge1)
    d20 = offset.dot(edge0)
    d21 = offset.dot(edge1)
    denominator = d00 * d11 - d01 * d01
    if abs(denominator) <= 1.0e-14:
        raise AgeMorphGateError("MakeHuman registration encountered a degenerate triangle")
    second = (d11 * d20 - d01 * d21) / denominator
    third = (d00 * d21 - d01 * d20) / denominator
    first = 1.0 - second - third
    result = (first, second, third)
    if any(value < -1.0e-4 or value > 1.0001 for value in result):
        raise AgeMorphGateError(f"MakeHuman barycentric registration escaped a triangle: {result}")
    clamped = tuple(max(0.0, min(1.0, value)) for value in result)
    total = sum(clamped)
    return tuple(value / total for value in clamped)


def smoothstep(value: float) -> float:
    clamped = max(0.0, min(1.0, value))
    return clamped * clamped * (3.0 - 2.0 * clamped)


def transfer_age_deltas(
    head: Any,
    source_vertices: list[Any],
    source_triangles: list[tuple[int, int, int]],
    source_target: dict[int, Any],
    Vector: Any,
    BVHTree: Any,
) -> tuple[list[Any], dict[str, Any]]:
    neutral = basis_points(head)
    seam, seam_raw = seam_contract(neutral)
    cavity, cavity_raw = cavity_contract(head)
    groups: dict[bytes, list[int]] = {}
    for index, point in enumerate(neutral):
        groups.setdefault(float32_triplet(point), []).append(index)
    protected_keys = {
        float32_triplet(neutral[index]) for index in seam_raw | cavity_raw
    }
    protected_raw = {
        index for key in protected_keys for index in groups[key]
    }
    skin_points = [
        point for index, point in enumerate(neutral) if index not in protected_raw
    ]
    source_head_ids = sorted(
        {index for triangle in source_triangles for index in triangle}
    )
    source_points = [source_vertices[index] for index in source_head_ids]
    source_min = Vector(tuple(min(point[axis] for point in source_points) for axis in range(3)))
    source_max = Vector(tuple(max(point[axis] for point in source_points) for axis in range(3)))
    target_min = Vector(tuple(min(point[axis] for point in skin_points) for axis in range(3)))
    target_max = Vector(tuple(max(point[axis] for point in skin_points) for axis in range(3)))
    source_extent = source_max - source_min
    target_extent = target_max - target_min
    scale = Vector(
        tuple(float(target_extent[axis] / source_extent[axis]) for axis in range(3))
    )
    if any(not math.isfinite(value) or value <= 0.0 for value in scale):
        raise AgeMorphGateError(f"invalid neutral registration scale: {tuple(scale)}")
    tree = BVHTree.FromPolygons(source_vertices, source_triangles, all_triangles=True, epsilon=0.0)
    logical_delta: dict[bytes, Any] = {}
    distances: list[float] = []
    for key, raw_indices in groups.items():
        basis = neutral[raw_indices[0]]
        if key in protected_keys:
            logical_delta[key] = Vector((0.0, 0.0, 0.0))
            continue
        registered = Vector(
            tuple(
                source_min[axis] + (basis[axis] - target_min[axis]) / scale[axis]
                for axis in range(3)
            )
        )
        nearest, _normal, triangle_index, distance = tree.find_nearest(registered)
        if nearest is None or triangle_index is None:
            raise AgeMorphGateError("MakeHuman neutral registration did not resolve a head vertex")
        triangle = source_triangles[triangle_index]
        weights = barycentric_weights(
            nearest,
            source_vertices[triangle[0]],
            source_vertices[triangle[1]],
            source_vertices[triangle[2]],
        )
        source_delta = sum(
            (source_target.get(index, Vector((0.0, 0.0, 0.0))) * weight
             for index, weight in zip(triangle, weights, strict=True)),
            Vector((0.0, 0.0, 0.0)),
        )
        delta = Vector(tuple(source_delta[axis] * scale[axis] for axis in range(3)))
        height_fraction = float((basis.y - target_min.y) / max(target_extent.y, 1.0e-12))
        delta *= smoothstep(height_fraction / 0.22)
        if not all(math.isfinite(component) for component in delta):
            raise AgeMorphGateError("transferred MakeHuman age delta is non-finite")
        if delta.length > MAXIMUM_AGE_DELTA_METERS:
            raise AgeMorphGateError(
                f"transferred age delta exceeds {MAXIMUM_AGE_DELTA_METERS}m: {delta.length}"
            )
        logical_delta[key] = delta
        distances.append(float(distance))
    deltas = [logical_delta[float32_triplet(point)].copy() for point in neutral]
    affected = sum(1 for delta in deltas if delta.length > 1.0e-7)
    maximum = max((delta.length for delta in deltas), default=0.0)
    if affected < MINIMUM_AFFECTED_VERTEX_COUNT or maximum <= 1.0e-6:
        raise AgeMorphGateError(
            f"transferred age target is not meaningful: {affected} vertices/{maximum}m"
        )
    seam_maximum = max((deltas[index].length for index in seam_raw), default=0.0)
    cavity_maximum = max((deltas[index].length for index in cavity_raw), default=0.0)
    if seam_maximum != 0.0 or cavity_maximum != 0.0:
        raise AgeMorphGateError(
            f"transferred age target moved protected geometry: seam={seam_maximum}, "
            f"cavity={cavity_maximum}"
        )
    return deltas, {
        "method": "hm08-bbox-affine-nearest-triangle-barycentric-v1",
        "sourceHeadMinimumY": MAKEHUMAN_HEAD_MIN_Y,
        "sourceHeadTriangleCount": len(source_triangles),
        "axisScaleMetersPerHm08Unit": [float(value) for value in scale],
        "logicalVertexCount": len(groups),
        "affectedRawVertexCount": affected,
        "maximumElderDeltaMeters": maximum,
        "maximumRegistrationDistanceHm08Units": max(distances, default=0.0),
        "neckFalloffHeightFraction": 0.22,
        "neckSeam": {**seam, "maximumDeltaMeters": seam_maximum},
        "oralCavity": {**cavity, "maximumDeltaMeters": cavity_maximum},
    }


def triangle_orientation_gate(head: Any, neutral: list[Any], candidate: list[Any]) -> dict[str, Any]:
    flipped = 0
    minimum_ratio = math.inf
    for polygon in head.data.polygons:
        a, b, c = polygon.vertices
        neutral_normal = (neutral[b] - neutral[a]).cross(neutral[c] - neutral[a])
        candidate_normal = (candidate[b] - candidate[a]).cross(candidate[c] - candidate[a])
        if neutral_normal.length <= 1.0e-12 or candidate_normal.length <= 1.0e-12:
            raise AgeMorphGateError("age morph created or encountered a degenerate triangle")
        ratio = float(candidate_normal.length / neutral_normal.length)
        minimum_ratio = min(minimum_ratio, ratio)
        if neutral_normal.dot(candidate_normal) <= 0.0:
            flipped += 1
    if flipped:
        raise AgeMorphGateError(f"age morph flipped {flipped} head triangles")
    return {"triangleFlipCount": 0, "minimumTriangleAreaRatio": minimum_ratio}


def author_age_keys(head: Any, deltas: list[Any]) -> dict[str, Any]:
    existing = morph_contract(head)
    existing_names = [entry["name"] for entry in existing]
    if any(name in existing_names for name in AGE_MORPHS):
        raise AgeMorphGateError("approved source already has canonical age morph names")
    if head.data.shape_keys is None:
        head.shape_key_add(name="Basis", from_mix=False)
    neutral = basis_points(head)
    statistics: dict[str, Any] = {}
    for name in AGE_MORPHS:
        weight = AGE_WEIGHTS[name]
        key = head.shape_key_add(name=name, from_mix=False)
        candidate = []
        for index, point in enumerate(neutral):
            value = point + deltas[index] * weight
            key.data[index].co = value
            candidate.append(value)
        statistics[name] = {
            "weightOnOfficialMakeHumanHeadAgeIncrement": weight,
            "shapeKeySha256": point_array_sha256(candidate),
            **triangle_orientation_gate(head, neutral, candidate),
        }
    for block in head.data.shape_keys.key_blocks:
        block.value = 0.0
    if canonical_json(existing) != canonical_json(
        [entry for entry in morph_contract(head) if entry["name"] not in AGE_MORPHS]
    ):
        raise AgeMorphGateError("age authoring changed a pre-existing facial morph")
    head["souldrifterAgeMorphStatus"] = "QUARANTINED_VISUAL_QA_PENDING"
    head["souldrifterAgeMorphYoungAdult"] = "Basis"
    head["souldrifterAgeMorphNames"] = json.dumps(list(AGE_MORPHS))
    head["souldrifterFacialReadiness"] = "AGE_MORPH_VISUAL_QA_PENDING"
    return {"youngAdult": "Basis", "morphs": statistics}


def export_candidate(
    bpy: Any, output: Path, runtime_mesh_names: set[str]
) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    selected_meshes = [
        obj
        for obj in bpy.data.objects
        if obj.type == "MESH" and obj.name in runtime_mesh_names
    ]
    missing = sorted(runtime_mesh_names - {obj.name for obj in selected_meshes})
    if missing:
        raise AgeMorphGateError(
            f"candidate export lost serialized runtime mesh nodes: {missing}"
        )
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise AgeMorphGateError(
            f"candidate export requires one armature: {[obj.name for obj in armatures]}"
        )
    selected = [*selected_meshes, armatures[0]]
    for obj in selected:
        obj.select_set(True)
    armature = armatures[0]
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
        export_all_influences=False,
        export_influence_nb=4,
        export_extras=True,
    )


def non_age_morphs(contract: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        entry for entry in contract["existingMorphs"] if entry["name"] not in AGE_MORPHS
    ]


def validate_fresh_candidate(
    bpy: Any,
    temporary_output: Path,
    source_contract: dict[str, Any],
    authored: dict[str, Any],
) -> dict[str, Any]:
    serialized_source = import_source(bpy, temporary_output)
    fresh = inspect_imported_scene(
        bpy,
        allow_age_morphs=True,
        serialized_source=serialized_source,
    )
    if canonical_json(fresh["head"]) != canonical_json(source_contract["head"]):
        raise AgeMorphGateError("fresh GLB import changed the approved head Basis/topology")
    if canonical_json(fresh["runtimeMeshes"]) != canonical_json(source_contract["runtimeMeshes"]):
        raise AgeMorphGateError("fresh GLB import changed a runtime mesh Basis/topology contract")
    if canonical_json(fresh["neckSeam"]) != canonical_json(source_contract["neckSeam"]):
        raise AgeMorphGateError("fresh GLB import changed the locked neck seam")
    if canonical_json(fresh["oralCavity"]) != canonical_json(source_contract["oralCavity"]):
        raise AgeMorphGateError("fresh GLB import changed the protected oral cavity")
    if canonical_json(non_age_morphs(fresh)) != canonical_json(
        source_contract["existingMorphs"]
    ):
        raise AgeMorphGateError("fresh GLB import changed an existing facial morph")
    age_fresh = {
        entry["name"]: entry["sha256"]
        for entry in fresh["existingMorphs"]
        if entry["name"] in AGE_MORPHS
    }
    age_expected = {
        name: authored["morphs"][name]["shapeKeySha256"] for name in AGE_MORPHS
    }
    if age_fresh != age_expected:
        raise AgeMorphGateError(
            f"fresh GLB age morph hashes changed: expected {age_expected}, got {age_fresh}"
        )
    head = bpy.data.objects[HEAD_OBJECT]
    if head.get("souldrifterFacialReadiness") != "AGE_MORPH_VISUAL_QA_PENDING":
        raise AgeMorphGateError("fresh candidate lost its fail-closed facial readiness marker")
    return {
        "status": "PASS_STRUCTURAL_FRESH_IMPORT",
        "headBasisAndTopologyPreserved": True,
        "preExistingMorphsPreserved": True,
        "neckSeamPreserved": True,
        "oralCavityProtected": True,
        "ageMorphNamesAndOrder": list(AGE_MORPHS),
        "ageMorphSha256": age_fresh,
        "embeddedActionCount": fresh["embeddedActionCount"],
        "serializedSource": fresh["serializedSource"],
        "importerOnlyHelpers": fresh["importerOnlyHelpers"],
        "facialReadiness": head.get("souldrifterFacialReadiness"),
    }


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def build_candidate(args: argparse.Namespace) -> dict[str, Any]:
    # Approval and path gates run before Blender import or any directory/file write.
    source, source_sha = require_source_arguments(args)
    approval, approval_path, approval_sha = require_approval(args, source, source_sha)
    output_dir = require_quarantined_output(args)
    makehuman, base_bytes, age_bytes = makehuman_source_audit()
    bpy, Vector, BVHTree = load_blender()
    serialized_source = import_source(bpy, source)
    observed = inspect_imported_scene(
        bpy,
        allow_age_morphs=False,
        serialized_source=serialized_source,
    )
    assert_topology_approval(approval, observed)
    source_vertices, source_triangles = parse_makehuman_obj(base_bytes, Vector)
    age_target = parse_makehuman_target(age_bytes, Vector)
    head = bpy.data.objects[HEAD_OBJECT]
    deltas, transfer = transfer_age_deltas(
        head,
        source_vertices,
        source_triangles,
        age_target,
        Vector,
        BVHTree,
    )
    authored = author_age_keys(head, deltas)

    output_dir.mkdir(parents=True, exist_ok=True)
    candidate = output_dir / CANDIDATE_NAME
    provenance = output_dir / PROVENANCE_NAME
    temporary_candidate = output_dir / (CANDIDATE_NAME + ".tmp.glb")
    if temporary_candidate.exists():
        temporary_candidate.unlink()
    try:
        export_candidate(
            bpy,
            temporary_candidate,
            {entry["name"] for entry in observed["runtimeMeshes"]},
        )
        fresh_import = validate_fresh_candidate(
            bpy, temporary_candidate, observed, authored
        )
        candidate_sha = file_sha256(temporary_candidate)
        os.replace(temporary_candidate, candidate)
    except Exception:
        if temporary_candidate.exists():
            temporary_candidate.unlink()
        raise
    payload = {
        "schema": "souldrifter.human-age-morph-candidate.v1",
        "issue": ISSUE,
        "status": "QUARANTINED_CANDIDATE_VISUAL_QA_PENDING",
        "route": "BLENDER_EXACT_HEAD_CC0_MAKEHUMAN_AGE_TRANSFER",
        "source": {
            "path": normalized_path(source),
            "sha256": source_sha,
            "approvalReceipt": normalized_path(approval_path),
            "approvalReceiptSha256": approval_sha,
            "topology": observed,
        },
        "makeHuman": makehuman,
        "authoring": {**authored, "transfer": transfer},
        "output": {
            "path": normalized_path(candidate),
            "sha256": candidate_sha,
            "runtimeOutputWritten": False,
        },
        "validation": fresh_import,
        "visualQa": {
            "passed": False,
            "status": "REQUIRED_NOT_PERFORMED_BY_BUILDER",
            "requiredEvidence": [
                "Young Adult, Middle-Aged, and Elder front/profile/three-quarter renders",
                "age plus blink, jaw, every speech viseme, and core expression combinations",
                "creator and dialogue close-up runtime proof",
                "owner approval",
            ],
        },
        "promotion": {
            "status": "BLOCKED",
            "reason": "structural fresh import is not visual or owner QA",
            "runtimePromotionModeAvailable": False,
        },
    }
    write_json_atomic(provenance, payload)
    return payload


def inspect_source(args: argparse.Namespace) -> dict[str, Any]:
    source, source_sha = require_source_arguments(args)
    bpy, _Vector, _BVHTree = load_blender()
    serialized_source = import_source(bpy, source)
    topology = inspect_imported_scene(
        bpy,
        allow_age_morphs=False,
        serialized_source=serialized_source,
    )
    return {
        "schema": "souldrifter.human-head-source-inspection.v1",
        "issue": ISSUE,
        "status": "INSPECTION_ONLY_NO_APPROVAL_NO_OUTPUT_WRITTEN",
        "source": {"path": normalized_path(source), "sha256": source_sha},
        "topology": topology,
        "approvalTemplate": approval_template(source, source_sha, topology),
        "candidateBuild": "BLOCKED_UNTIL_OWNER_APPROVAL_RECEIPT",
    }


def main() -> int:
    args = script_arguments()
    try:
        if args.command == "contract":
            print("AGE_MORPH_CONTRACT=" + canonical_json(contract_payload()))
            return 0
        if args.command == "audit-serialized-source":
            source, source_sha = require_source_arguments(args)
            payload = {
                "schema": "souldrifter.human-head-serialized-source-audit.v1",
                "issue": ISSUE,
                "status": "PASS_SERIALIZED_SOURCE_ONLY_NO_BLENDER_NO_OUTPUT_WRITTEN",
                "source": {"path": normalized_path(source), "sha256": source_sha},
                "serializedSource": serialized_glb_contract(source),
            }
            print("AGE_MORPH_SERIALIZED_SOURCE_AUDIT=" + canonical_json(payload))
            return 0
        if args.command == "inspect-source":
            payload = inspect_source(args)
            print("AGE_MORPH_SOURCE_INSPECTION=" + canonical_json(payload))
            return 0
        payload = build_candidate(args)
        print("AGE_MORPH_CANDIDATE=" + canonical_json(payload))
        return 0
    except AgeMorphGateError as error:
        failure = {
            "schema": "souldrifter.human-age-morph-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_RUNTIME_OUTPUT",
            "reason": str(error),
        }
        print("AGE_MORPH_FAILURE=" + canonical_json(failure), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
