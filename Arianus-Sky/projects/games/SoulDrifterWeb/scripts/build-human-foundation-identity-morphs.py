"""Build quarantined, topology-compatible Human identity morphs for issue #487.

The foundation Basis remains neutral.  This script appends the exact runtime
keys ``Face_SoftRound``, ``Face_AngularHighCheek``, and ``Face_BroadStrong``
using only hash-locked CC0 MakeHuman targets.  It preserves every facial and
age morph already present on the explicitly approved source.

There is intentionally no runtime-promotion mode.  A candidate can be written
only after an owner approval receipt binds a promoted source GLB, SHA-256,
Basis/topology, existing morphs, neck seam, and oral cavity.  Structural fresh
import is not visual QA; generated candidates stay fail closed until reviewed.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
from typing import Any


ISSUE = 487
IDENTITY_MORPHS = (
    "Face_SoftRound",
    "Face_AngularHighCheek",
    "Face_BroadStrong",
)
APPROVAL_SCHEMA = "souldrifter.human-head-source-approval.v1"
APPROVAL_STATUS = "PROMOTED_SOURCE_APPROVED_FOR_IDENTITY_AUTHORING"
APPROVAL_SCOPE = "ISSUE_487_HUMAN_IDENTITY_MORPHS"
APPROVAL_AUTHORITY = "SOULDRIFTER_OWNER"

EVIDENCE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487\identity-morph-proof"
)
CANDIDATE_NAME = "human-foundation-identity-morph-candidate.glb"
PROVENANCE_NAME = "human-foundation-identity-morph-candidate.provenance.json"

TARGET_SPECS: dict[str, dict[str, Any]] = {
    "head-round": {
        "path": "makehuman/data/targets/head/head-round.target",
        "sha256": "BD96B745B19432AC838F15438AA87E9002F597E59353861721E12E6DA0F2C625",
        "entries": 1974,
    },
    "head-diamond": {
        "path": "makehuman/data/targets/head/head-diamond.target",
        "sha256": "7072C718C8476CA38D6758FB7531FD945612D51ACDCA6555DA8A8F770284C41D",
        "entries": 679,
    },
    "left-cheek-bones-up": {
        "path": "makehuman/data/targets/cheek/l-cheek-bones-incr.target",
        "sha256": "244FFA39D2D2DB94FF15130719346B4CAE2236BF2A309C5682EAC352DA06BE50",
        "entries": 63,
    },
    "right-cheek-bones-up": {
        "path": "makehuman/data/targets/cheek/r-cheek-bones-incr.target",
        "sha256": "A393F67ACCE21568AB832091DAADAB267685D464492647CB0C4E8CB5AF58C4C9",
        "entries": 63,
    },
    "left-cheek-position-up": {
        "path": "makehuman/data/targets/cheek/l-cheek-trans-up.target",
        "sha256": "A538A79637616B18F0BA6B0EC749D7B8548791FCB0F9352B37FA82EF4840DF39",
        "entries": 93,
    },
    "right-cheek-position-up": {
        "path": "makehuman/data/targets/cheek/r-cheek-trans-up.target",
        "sha256": "C776254FF7FC00DC8CAE1FB957605291042CBE1B30C519C2079A75A1CA409231",
        "entries": 93,
    },
    "head-square": {
        "path": "makehuman/data/targets/head/head-square.target",
        "sha256": "001D0D135D964DAF4AD99BA46A0F77C5BC2378F04E53C2B5A20242AB19CBF265",
        "entries": 693,
    },
    "chin-width": {
        "path": "makehuman/data/targets/chin/chin-width-incr.target",
        "sha256": "DEEF506BFE1883D9D4C38667332C9970785226566EFBAE4724FD3D60C02EFCF4",
        "entries": 198,
    },
}

# Every component is a real MakeHuman slider target.  Accents remain modest so
# the primary official shape owns the silhouette; actual visual acceptance is
# still mandatory and is never asserted by this script.
IDENTITY_RECIPES: dict[str, tuple[tuple[str, float], ...]] = {
    "Face_SoftRound": (("head-round", 1.0),),
    "Face_AngularHighCheek": (
        ("head-diamond", 1.0),
        ("left-cheek-bones-up", 0.45),
        ("right-cheek-bones-up", 0.45),
        ("left-cheek-position-up", 0.30),
        ("right-cheek-position-up", 0.30),
    ),
    "Face_BroadStrong": (
        ("head-square", 1.0),
        ("chin-width", 0.55),
    ),
}


def load_common() -> Any:
    path = Path(__file__).with_name("build-human-foundation-age-morphs.py")
    spec = importlib.util.spec_from_file_location("souldrifter_age_morph_common", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load exact-head common gates: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COMMON = load_common()
GateError = COMMON.AgeMorphGateError


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


def contract_payload() -> dict[str, Any]:
    return {
        "schema": "souldrifter.human-identity-morph-builder-contract.v1",
        "issue": ISSUE,
        "foundation": "Basis",
        "authoredMorphs": list(IDENTITY_MORPHS),
        "recipes": {
            name: [
                {
                    "target": target,
                    "weight": weight,
                    "path": TARGET_SPECS[target]["path"],
                    "sha256": TARGET_SPECS[target]["sha256"],
                }
                for target, weight in recipe
            ]
            for name, recipe in IDENTITY_RECIPES.items()
        },
        "sourceApproval": {
            "schema": APPROVAL_SCHEMA,
            "status": APPROVAL_STATUS,
            "scope": APPROVAL_SCOPE,
            "authority": APPROVAL_AUTHORITY,
            "required": True,
        },
        "makeHuman": {
            "repository": COMMON.MAKEHUMAN_REMOTE,
            "commit": COMMON.MAKEHUMAN_COMMIT,
            "license": "CC0-1.0",
            "licenseSha256": COMMON.MAKEHUMAN_LICENSE_SHA256,
        },
        "output": {
            "root": COMMON.normalized_path(EVIDENCE_ROOT),
            "candidate": CANDIDATE_NAME,
            "provenance": PROVENANCE_NAME,
            "runtimePromotionMode": False,
            "visualQaPassed": False,
        },
    }


def require_identity_approval(
    args: argparse.Namespace, source: Path, source_sha: str
) -> tuple[dict[str, Any], Path, str]:
    if not args.source_approval_receipt:
        raise GateError(
            "--source-approval-receipt is required before any identity candidate may be written"
        )
    receipt_path = Path(args.source_approval_receipt).resolve()
    if not receipt_path.is_file():
        raise GateError(f"source approval receipt does not exist: {receipt_path}")
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise GateError(f"source approval receipt is unreadable: {error}") from error
    if receipt.get("schema") != APPROVAL_SCHEMA or receipt.get("issue") != ISSUE:
        raise GateError("source approval receipt schema/issue is not accepted")
    if receipt.get("status") != APPROVAL_STATUS or receipt.get("scope") != APPROVAL_SCOPE:
        raise GateError("source approval receipt does not approve identity authoring")
    source_contract = receipt.get("source")
    if not isinstance(source_contract, dict) or source_contract.get("promoted") is not True:
        raise GateError("source approval receipt does not bind a promoted source")
    if source_contract.get("sha256", "").upper() != source_sha:
        raise GateError("source approval receipt SHA-256 does not match the source")
    path_value = source_contract.get("path")
    if not isinstance(path_value, str) or not COMMON.same_path(Path(path_value), source):
        raise GateError("source approval receipt path does not match --source-glb")
    approval = receipt.get("approval")
    if not isinstance(approval, dict):
        raise GateError("source approval receipt has no approval decision")
    if approval.get("authority") != APPROVAL_AUTHORITY or approval.get("decision") != "APPROVED":
        raise GateError("source approval authority/decision is not accepted")
    approved_by = approval.get("approvedBy")
    if not isinstance(approved_by, str) or not approved_by.strip():
        raise GateError("approval.approvedBy must identify the approving owner")
    approved_at = approval.get("approvedAt")
    if not isinstance(approved_at, str) or not approved_at.endswith("Z"):
        raise GateError("approval.approvedAt must be an explicit UTC ISO-8601 timestamp")
    try:
        datetime.fromisoformat(approved_at[:-1] + "+00:00")
    except ValueError as error:
        raise GateError("approval.approvedAt is not valid ISO-8601") from error
    if not isinstance(receipt.get("topology"), dict):
        raise GateError("source approval receipt has no exact topology contract")
    return receipt, receipt_path, COMMON.file_sha256(receipt_path)


def require_quarantined_output(args: argparse.Namespace) -> Path:
    output_dir = Path(args.output_dir).resolve()
    if not COMMON.same_path(output_dir, EVIDENCE_ROOT):
        raise GateError(
            f"candidate output is locked to the non-runtime evidence root: {EVIDENCE_ROOT}"
        )
    lowered = COMMON.normalized_path(output_dir).casefold()
    if "/public/" in lowered or "/src/" in lowered:
        raise GateError("runtime/source-tree output is forbidden")
    candidate = output_dir / CANDIDATE_NAME
    provenance = output_dir / PROVENANCE_NAME
    if not args.replace_existing and (candidate.exists() or provenance.exists()):
        raise GateError(
            "quarantined identity candidate exists; use --replace-existing explicitly"
        )
    return output_dir


def identity_source_audit() -> tuple[dict[str, Any], bytes, dict[str, bytes]]:
    repo = COMMON.MAKEHUMAN_REPO
    if not repo.is_dir():
        raise GateError(f"cached MakeHuman repository is missing: {repo}")
    commit = COMMON.git_text(repo, "rev-parse", "HEAD")
    remote = COMMON.git_text(repo, "remote", "get-url", "origin")
    if commit != COMMON.MAKEHUMAN_COMMIT or remote.rstrip("/") != COMMON.MAKEHUMAN_REMOTE.rstrip("/"):
        raise GateError(f"cached MakeHuman source changed: {remote}@{commit}")
    license_bytes = COMMON.git_blob(repo, commit, COMMON.MAKEHUMAN_LICENSE_PATH)
    base_bytes = COMMON.git_blob(repo, commit, COMMON.MAKEHUMAN_BASE_PATH)
    if COMMON.bytes_sha256(license_bytes) != COMMON.MAKEHUMAN_LICENSE_SHA256:
        raise GateError("cached MakeHuman CC0 license blob changed")
    if COMMON.bytes_sha256(base_bytes) != COMMON.MAKEHUMAN_BASE_SHA256:
        raise GateError("cached MakeHuman hm08 Basis changed")
    target_blobs: dict[str, bytes] = {}
    target_receipts = []
    for name, specification in TARGET_SPECS.items():
        blob = COMMON.git_blob(repo, commit, specification["path"])
        observed_sha = COMMON.bytes_sha256(blob)
        if observed_sha != specification["sha256"]:
            raise GateError(
                f"cached MakeHuman target changed: {name}: {observed_sha}"
            )
        target_blobs[name] = blob
        target_receipts.append(
            {
                "name": name,
                "path": specification["path"],
                "sha256": observed_sha,
                "entryCount": specification["entries"],
            }
        )
    return (
        {
            "repository": COMMON.MAKEHUMAN_REMOTE,
            "commit": commit,
            "license": "CC0-1.0",
            "licensePath": COMMON.MAKEHUMAN_LICENSE_PATH,
            "licenseSha256": COMMON.MAKEHUMAN_LICENSE_SHA256,
            "basePath": COMMON.MAKEHUMAN_BASE_PATH,
            "baseSha256": COMMON.MAKEHUMAN_BASE_SHA256,
            "targets": target_receipts,
        },
        base_bytes,
        target_blobs,
    )


def parse_target(blob: bytes, specification: dict[str, Any], Vector: Any) -> dict[int, Any]:
    result: dict[int, Any] = {}
    for raw_line in blob.decode("utf-8", errors="strict").splitlines():
        values = raw_line.split()
        if not values or values[0].startswith("#"):
            continue
        if len(values) != 4:
            raise GateError(f"malformed MakeHuman target row: {raw_line}")
        index = int(values[0])
        if not 0 <= index < COMMON.MAKEHUMAN_TOTAL_VERTEX_COUNT or index in result:
            raise GateError(f"invalid/duplicate MakeHuman target index: {index}")
        result[index] = Vector(tuple(map(float, values[1:4])))
    if len(result) != specification["entries"]:
        raise GateError(
            f"MakeHuman target entry count changed: {specification['path']}: {len(result)}"
        )
    if not all(math.isfinite(component) for delta in result.values() for component in delta):
        raise GateError(f"MakeHuman target contains non-finite deltas: {specification['path']}")
    return result


def combine_recipes(
    parsed: dict[str, dict[int, Any]], Vector: Any
) -> dict[str, dict[int, Any]]:
    combined: dict[str, dict[int, Any]] = {}
    for morph_name, recipe in IDENTITY_RECIPES.items():
        result: dict[int, Any] = {}
        for target_name, weight in recipe:
            for index, delta in parsed[target_name].items():
                if index not in result:
                    result[index] = Vector((0.0, 0.0, 0.0))
                result[index] += delta * weight
        if not result or not any(delta.length > 1.0e-9 for delta in result.values()):
            raise GateError(f"identity recipe is empty: {morph_name}")
        combined[morph_name] = result
    return combined


def inspect_identity_scene(
    bpy: Any,
    *,
    allow_identity: bool,
    serialized_source: dict[str, Any],
) -> dict[str, Any]:
    meshes, importer_helpers = COMMON.importer_only_helpers(
        bpy, serialized_source
    )
    by_name = {obj.name: obj for obj in meshes}
    required = {
        COMMON.HEAD_OBJECT,
        COMMON.BODY_OBJECT,
        *COMMON.REQUIRED_CAVITY_OBJECTS,
    }
    missing = sorted(required - set(by_name))
    if missing:
        raise GateError(f"promoted runtime source is missing required meshes: {missing}")
    head = by_name[COMMON.HEAD_OBJECT]
    if any(len(polygon.vertices) != 3 for polygon in head.data.polygons):
        raise GateError("exact head is not triangulated after fresh GLB import")
    points = COMMON.basis_points(head)
    if not points or not all(math.isfinite(component) for point in points for component in point):
        raise GateError("exact head Basis contains non-finite coordinates")
    morphs = COMMON.morph_contract(head)
    names = [entry["name"] for entry in morphs]
    present = [name for name in IDENTITY_MORPHS if name in names]
    if present and not allow_identity:
        raise GateError(f"approved source already contains identity morphs: {present}")
    if allow_identity and names[-len(IDENTITY_MORPHS) :] != list(IDENTITY_MORPHS):
        raise GateError(f"fresh candidate identity morph order is not canonical: {names}")
    seam, _ = COMMON.seam_contract(points)
    cavity, _ = COMMON.cavity_contract(head)
    armatures = sorted(
        (obj for obj in bpy.data.objects if obj.type == "ARMATURE"), key=lambda obj: obj.name
    )
    if len(armatures) != 1:
        raise GateError(
            f"promoted runtime source must contain one armature: {[obj.name for obj in armatures]}"
        )
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != COMMON.EXPECTED_BONE_COUNT or roots != [COMMON.ARMATURE_ROOT]:
        raise GateError(
            f"canonical body rig changed: {len(armature.data.bones)} bones, roots={roots}"
        )
    if len(bpy.data.actions) != 0:
        raise GateError("head source/candidate must not embed animation actions")
    return {
        "headObject": COMMON.HEAD_OBJECT,
        "serializedSource": serialized_source,
        "importerOnlyHelpers": importer_helpers,
        "head": COMMON.mesh_contract(head),
        "existingMorphs": morphs,
        "neckSeam": seam,
        "oralCavity": cavity,
        "runtimeMeshes": [COMMON.mesh_contract(obj) for obj in meshes],
        "armature": {
            "name": armature.name,
            "boneCount": len(armature.data.bones),
            "rootBones": roots,
        },
        "embeddedActionCount": 0,
    }


def approval_template(source: Path, source_sha: str, topology: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": APPROVAL_SCHEMA,
        "issue": ISSUE,
        "status": APPROVAL_STATUS,
        "scope": APPROVAL_SCOPE,
        "source": {
            "path": COMMON.normalized_path(source),
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
    if COMMON.canonical_json(receipt.get("topology")) != COMMON.canonical_json(observed):
        raise GateError(
            "fresh source import does not match the approved exact "
            "Basis/topology/morph/seam/oral-cavity contract"
        )


def smooth_identity_deltas(
    head: Any,
    deltas: list[Any],
    Vector: Any,
    *,
    iterations: int,
) -> list[Any]:
    """Smooth transfer noise on logical vertices while pinning seam/cavity coordinates."""
    neutral = COMMON.basis_points(head)
    groups: dict[bytes, list[int]] = {}
    for index, point in enumerate(neutral):
        groups.setdefault(COMMON.float32_triplet(point), []).append(index)
    seam, seam_raw = COMMON.seam_contract(neutral)
    cavity, cavity_raw = COMMON.cavity_contract(head)
    del seam, cavity
    protected = {
        COMMON.float32_triplet(neutral[index]) for index in seam_raw | cavity_raw
    }
    logical = {
        key: deltas[raw_indices[0]].copy() for key, raw_indices in groups.items()
    }
    adjacency: dict[bytes, set[bytes]] = {key: set() for key in groups}
    for polygon in head.data.polygons:
        keys = [COMMON.float32_triplet(neutral[index]) for index in polygon.vertices]
        for index, key in enumerate(keys):
            adjacency[key].update(keys[:index] + keys[index + 1 :])
            adjacency[key].discard(key)
    for _ in range(iterations):
        updated: dict[bytes, Any] = {}
        for key, value in logical.items():
            if key in protected:
                updated[key] = Vector((0.0, 0.0, 0.0))
                continue
            neighbors = adjacency[key]
            if not neighbors:
                updated[key] = value.copy()
                continue
            average = sum(
                (logical[neighbor] for neighbor in neighbors),
                Vector((0.0, 0.0, 0.0)),
            ) / len(neighbors)
            updated[key] = value * 0.55 + average * 0.45
        logical = updated
    return [logical[COMMON.float32_triplet(point)].copy() for point in neutral]


def orientation_metrics(head: Any, neutral: list[Any], candidate: list[Any]) -> dict[str, Any]:
    flipped = 0
    minimum_ratio = math.inf
    for polygon in head.data.polygons:
        a, b, c = polygon.vertices
        basis_normal = (neutral[b] - neutral[a]).cross(neutral[c] - neutral[a])
        candidate_normal = (candidate[b] - candidate[a]).cross(candidate[c] - candidate[a])
        if basis_normal.length <= 1.0e-12 or candidate_normal.length <= 1.0e-12:
            return {"triangleFlipCount": 1, "minimumTriangleAreaRatio": 0.0}
        minimum_ratio = min(
            minimum_ratio, float(candidate_normal.length / basis_normal.length)
        )
        if basis_normal.dot(candidate_normal) <= 0.0:
            flipped += 1
    return {
        "triangleFlipCount": flipped,
        "minimumTriangleAreaRatio": minimum_ratio,
    }


def select_safe_identity_deltas(
    head: Any, transferred: list[Any], Vector: Any
) -> tuple[list[Any], dict[str, Any]]:
    """Choose the strongest deterministic smoothed transfer that preserves orientation."""
    neutral = COMMON.basis_points(head)
    smoothing_iterations = 6
    smoothed = smooth_identity_deltas(
        head, transferred, Vector, iterations=smoothing_iterations
    )
    for amplitude in (1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25):
        scaled = [delta * amplitude for delta in smoothed]
        candidate = [point + scaled[index] for index, point in enumerate(neutral)]
        metrics = orientation_metrics(head, neutral, candidate)
        maximum = max((delta.length for delta in scaled), default=0.0)
        affected = sum(1 for delta in scaled if delta.length > 1.0e-7)
        if (
            metrics["triangleFlipCount"] == 0
            and metrics["minimumTriangleAreaRatio"] >= 0.15
            and maximum <= COMMON.MAXIMUM_AGE_DELTA_METERS
            and affected >= COMMON.MINIMUM_AFFECTED_VERTEX_COUNT
        ):
            return scaled, {
                "logicalLaplacianIterations": smoothing_iterations,
                "neighborBlendPerIteration": 0.45,
                "selectedGlobalAmplitude": amplitude,
                "affectedRawVertexCount": affected,
                "maximumFinalDeltaMeters": maximum,
                **metrics,
            }
    raise GateError(
        "real MakeHuman identity transfer cannot preserve exact-head triangle orientation"
    )


def author_identity_keys(
    head: Any,
    source_vertices: list[Any],
    source_triangles: list[tuple[int, int, int]],
    recipes: dict[str, dict[int, Any]],
    Vector: Any,
    BVHTree: Any,
) -> tuple[dict[str, Any], dict[str, Any]]:
    existing = COMMON.morph_contract(head)
    if any(entry["name"] in IDENTITY_MORPHS for entry in existing):
        raise GateError("approved source already has canonical identity morph names")
    if head.data.shape_keys is None:
        head.shape_key_add(name="Basis", from_mix=False)
    neutral = COMMON.basis_points(head)
    authored: dict[str, Any] = {}
    transfer_receipts: dict[str, Any] = {}
    for name in IDENTITY_MORPHS:
        transferred, transfer = COMMON.transfer_age_deltas(
            head,
            source_vertices,
            source_triangles,
            recipes[name],
            Vector,
            BVHTree,
        )
        deltas, safety = select_safe_identity_deltas(head, transferred, Vector)
        key = head.shape_key_add(name=name, from_mix=False)
        candidate = []
        for index, point in enumerate(neutral):
            value = point + deltas[index]
            key.data[index].co = value
            candidate.append(value)
        authored[name] = {
            "shapeKeySha256": COMMON.point_array_sha256(candidate),
            **COMMON.triangle_orientation_gate(head, neutral, candidate),
            "recipe": [
                {"target": target, "weight": weight}
                for target, weight in IDENTITY_RECIPES[name]
            ],
            "transferSafety": safety,
        }
        maximum_delta = transfer.pop("maximumElderDeltaMeters")
        transfer_receipts[name] = {
            **transfer,
            "maximumRawIdentityDeltaMeters": maximum_delta,
            **safety,
        }
    for block in head.data.shape_keys.key_blocks:
        block.value = 0.0
    preserved = [
        entry
        for entry in COMMON.morph_contract(head)
        if entry["name"] not in IDENTITY_MORPHS
    ]
    if COMMON.canonical_json(existing) != COMMON.canonical_json(preserved):
        raise GateError("identity authoring changed a pre-existing facial/age morph")
    head["souldrifterIdentityMorphStatus"] = "QUARANTINED_VISUAL_QA_PENDING"
    head["souldrifterIdentityMorphNames"] = json.dumps(list(IDENTITY_MORPHS))
    head["souldrifterFacialReadiness"] = "IDENTITY_MORPH_VISUAL_QA_PENDING"
    return (
        {"foundation": "Basis", "morphs": authored},
        transfer_receipts,
    )


def non_identity_morphs(contract: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        entry
        for entry in contract["existingMorphs"]
        if entry["name"] not in IDENTITY_MORPHS
    ]


def validate_fresh_candidate(
    bpy: Any,
    temporary_output: Path,
    source_contract: dict[str, Any],
    authored: dict[str, Any],
) -> dict[str, Any]:
    serialized_source = COMMON.import_source(bpy, temporary_output)
    fresh = inspect_identity_scene(
        bpy,
        allow_identity=True,
        serialized_source=serialized_source,
    )
    if COMMON.canonical_json(fresh["head"]) != COMMON.canonical_json(source_contract["head"]):
        raise GateError("fresh GLB import changed the approved head Basis/topology")
    if COMMON.canonical_json(fresh["runtimeMeshes"]) != COMMON.canonical_json(
        source_contract["runtimeMeshes"]
    ):
        raise GateError("fresh GLB import changed a runtime mesh Basis/topology contract")
    if COMMON.canonical_json(fresh["neckSeam"]) != COMMON.canonical_json(
        source_contract["neckSeam"]
    ):
        raise GateError("fresh GLB import changed the locked neck seam")
    if COMMON.canonical_json(fresh["oralCavity"]) != COMMON.canonical_json(
        source_contract["oralCavity"]
    ):
        raise GateError("fresh GLB import changed the protected oral cavity")
    if COMMON.canonical_json(non_identity_morphs(fresh)) != COMMON.canonical_json(
        source_contract["existingMorphs"]
    ):
        raise GateError("fresh GLB import changed an existing facial/age morph")
    identity_fresh = {
        entry["name"]: entry["sha256"]
        for entry in fresh["existingMorphs"]
        if entry["name"] in IDENTITY_MORPHS
    }
    expected = {
        name: authored["morphs"][name]["shapeKeySha256"] for name in IDENTITY_MORPHS
    }
    if identity_fresh != expected:
        raise GateError(
            f"fresh GLB identity hashes changed: expected {expected}, got {identity_fresh}"
        )
    head = bpy.data.objects[COMMON.HEAD_OBJECT]
    if head.get("souldrifterFacialReadiness") != "IDENTITY_MORPH_VISUAL_QA_PENDING":
        raise GateError("fresh candidate lost its fail-closed facial readiness marker")
    return {
        "status": "PASS_STRUCTURAL_FRESH_IMPORT",
        "headBasisAndTopologyPreserved": True,
        "preExistingFacialAndAgeMorphsPreserved": True,
        "neckSeamPreserved": True,
        "oralCavityProtected": True,
        "identityMorphNamesAndOrder": list(IDENTITY_MORPHS),
        "identityMorphSha256": identity_fresh,
        "serializedSource": fresh["serializedSource"],
        "importerOnlyHelpers": fresh["importerOnlyHelpers"],
        "facialReadiness": head.get("souldrifterFacialReadiness"),
    }


def build_candidate(args: argparse.Namespace) -> dict[str, Any]:
    source, source_sha = COMMON.require_source_arguments(args)
    approval, approval_path, approval_sha = require_identity_approval(
        args, source, source_sha
    )
    output_dir = require_quarantined_output(args)
    makehuman, base_blob, target_blobs = identity_source_audit()
    bpy, Vector, BVHTree = COMMON.load_blender()
    serialized_source = COMMON.import_source(bpy, source)
    observed = inspect_identity_scene(
        bpy,
        allow_identity=False,
        serialized_source=serialized_source,
    )
    assert_topology_approval(approval, observed)
    source_vertices, source_triangles = COMMON.parse_makehuman_obj(base_blob, Vector)
    parsed = {
        name: parse_target(blob, TARGET_SPECS[name], Vector)
        for name, blob in target_blobs.items()
    }
    recipes = combine_recipes(parsed, Vector)
    authored, transfers = author_identity_keys(
        bpy.data.objects[COMMON.HEAD_OBJECT],
        source_vertices,
        source_triangles,
        recipes,
        Vector,
        BVHTree,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    candidate = output_dir / CANDIDATE_NAME
    provenance = output_dir / PROVENANCE_NAME
    temporary_candidate = output_dir / (CANDIDATE_NAME + ".tmp.glb")
    if temporary_candidate.exists():
        temporary_candidate.unlink()
    try:
        COMMON.export_candidate(
            bpy,
            temporary_candidate,
            {entry["name"] for entry in observed["runtimeMeshes"]},
        )
        fresh_import = validate_fresh_candidate(
            bpy, temporary_candidate, observed, authored
        )
        candidate_sha = COMMON.file_sha256(temporary_candidate)
        os.replace(temporary_candidate, candidate)
    except Exception:
        if temporary_candidate.exists():
            temporary_candidate.unlink()
        raise
    payload = {
        "schema": "souldrifter.human-identity-morph-candidate.v1",
        "issue": ISSUE,
        "status": "QUARANTINED_CANDIDATE_VISUAL_QA_PENDING",
        "route": "BLENDER_EXACT_HEAD_CC0_MAKEHUMAN_IDENTITY_TRANSFER",
        "source": {
            "path": COMMON.normalized_path(source),
            "sha256": source_sha,
            "approvalReceipt": COMMON.normalized_path(approval_path),
            "approvalReceiptSha256": approval_sha,
            "topology": observed,
        },
        "makeHuman": makehuman,
        "authoring": {**authored, "transfers": transfers},
        "output": {
            "path": COMMON.normalized_path(candidate),
            "sha256": candidate_sha,
            "runtimeOutputWritten": False,
        },
        "validation": fresh_import,
        "visualQa": {
            "passed": False,
            "status": "REQUIRED_NOT_PERFORMED_BY_BUILDER",
            "requiredEvidence": [
                "Foundation and all three identity families in front/profile/three-quarter views",
                "every identity plus Young Adult, Middle-Aged, and Elder",
                "every identity plus blink, jaw, speech visemes, and core expressions",
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
    COMMON.write_json_atomic(provenance, payload)
    return payload


def inspect_source(args: argparse.Namespace) -> dict[str, Any]:
    source, source_sha = COMMON.require_source_arguments(args)
    bpy, _Vector, _BVHTree = COMMON.load_blender()
    serialized_source = COMMON.import_source(bpy, source)
    topology = inspect_identity_scene(
        bpy,
        allow_identity=False,
        serialized_source=serialized_source,
    )
    return {
        "schema": "souldrifter.human-identity-source-inspection.v1",
        "issue": ISSUE,
        "status": "INSPECTION_ONLY_NO_APPROVAL_NO_OUTPUT_WRITTEN",
        "source": {"path": COMMON.normalized_path(source), "sha256": source_sha},
        "topology": topology,
        "approvalTemplate": approval_template(source, source_sha, topology),
        "candidateBuild": "BLOCKED_UNTIL_OWNER_APPROVAL_RECEIPT",
    }


def main() -> int:
    args = script_arguments()
    try:
        if args.command == "contract":
            print("IDENTITY_MORPH_CONTRACT=" + COMMON.canonical_json(contract_payload()))
            return 0
        if args.command == "audit-serialized-source":
            source, source_sha = COMMON.require_source_arguments(args)
            payload = {
                "schema": "souldrifter.human-identity-serialized-source-audit.v1",
                "issue": ISSUE,
                "status": "PASS_SERIALIZED_SOURCE_ONLY_NO_BLENDER_NO_OUTPUT_WRITTEN",
                "source": {
                    "path": COMMON.normalized_path(source),
                    "sha256": source_sha,
                },
                "serializedSource": COMMON.serialized_glb_contract(source),
            }
            print(
                "IDENTITY_MORPH_SERIALIZED_SOURCE_AUDIT="
                + COMMON.canonical_json(payload)
            )
            return 0
        if args.command == "inspect-source":
            payload = inspect_source(args)
            print("IDENTITY_MORPH_SOURCE_INSPECTION=" + COMMON.canonical_json(payload))
            return 0
        payload = build_candidate(args)
        print("IDENTITY_MORPH_CANDIDATE=" + COMMON.canonical_json(payload))
        return 0
    except GateError as error:
        failure = {
            "schema": "souldrifter.human-identity-morph-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_RUNTIME_OUTPUT",
            "reason": str(error),
        }
        print("IDENTITY_MORPH_FAILURE=" + COMMON.canonical_json(failure), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
