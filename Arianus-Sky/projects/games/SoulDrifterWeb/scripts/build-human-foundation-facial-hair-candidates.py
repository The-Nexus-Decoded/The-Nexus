"""Build quarantined, exact-head Human facial-hair candidates for issue #487.

The five candidates are made from deterministic tapered strand geometry rooted
directly on the exact surgical-head skin surface.  They are not caps, shells,
or floating shelves.  This builder exports and renders evidence only beneath
the locked issue evidence directory; it has no integration or promotion mode.

The current exact-head proof is hash locked for geometry fit, but its serialized
lower-face UV baseline is rejected.  This script therefore fails closed before
Blender or output generation.  Candidate work may resume only from a new
neutral textured head SHA whose zero-mask render is pixel-equivalent to its
canonical base texture.  Jaw/viseme motion acceptance remains blocked until
that replacement head is promoted.
"""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import random
import shutil
import struct
import subprocess
import sys
from typing import Any


ISSUE = 487
EVIDENCE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487\facial-hair-candidates-v2"
)
SOURCE_GLB = EVIDENCE_ROOT / "inputs" / "human-foundation-exact-head-source-51A1C57B.glb"
SOURCE_SHA256 = "51A1C57B4CB5DE1CD4972EFFDF4A55EC5446AFC3B41220C9E6FEC747E189B49F"
SOURCE_STATUS = "QUARANTINED_SURGICAL_PROOF_NOT_PROMOTED"
SOURCE_TEXTURE_BASELINE_STATUS = "REJECTED_CORRUPTED_LOWER_FACE_UV"
SOURCE_TEXTURE_RESUME_GATE = (
    "REQUIRES_NEW_NEUTRAL_TEXTURED_HEAD_SHA_AND_ZERO_MASK_BASE_TEXTURE_EQUIVALENCE"
)
REFERENCE_ROOT = EVIDENCE_ROOT / "references"
CANDIDATE_ROOT = EVIDENCE_ROOT / "candidates"
FFMPEG_EXE = Path(r"C:\Users\olawal\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe")

HEAD_OBJECT = "HumanFoundation_HeadBase"
ARMATURE_OBJECT = "HumanFoundation_Armature"
HEAD_BONE = "mixamorig:Head"
RUNTIME_OBJECTS = {
    "HumanFoundation_BodyNoHead",
    HEAD_OBJECT,
    "HumanFoundation_LowerTeeth",
    "HumanFoundation_Tongue",
    "HumanFoundation_UpperTeeth",
}
EXPECTED_HEAD_VERTEX_COUNT = 7045
EXPECTED_HEAD_POLYGON_COUNT = 10580
EXPECTED_HEAD_BASIS_SHA256 = (
    "6424BF60EACE51DE2A482ED5984D128C10A8A89EAC63623FB9C82AE1BBBAA9E4"
)
EXPECTED_HEAD_TOPOLOGY_SHA256 = (
    "D774E49F3C71BA6E87F6AD025E7536DCC54F1EFBF4355133CBC4AD1AC1D867BD"
)
EXPECTED_NECK_SEAM_SHA256 = (
    "15EF8E0082CDE77A1430D9B321313D3E083BB8406C12B21861E2B90C8ADB372C"
)
EXPECTED_BONE_COUNT = 65

FACIAL_HAIR_STYLES: dict[str, dict[str, Any]] = {
    "stubble": {
        "runtimeName": "STUBBLE",
        "objectName": "HumanFoundation_FacialHair_Stubble",
        "strandCount": 420,
        "seed": 487101,
        "references": ("stubble-front", "beard-profile", "beard-three-quarter"),
    },
    "moustache": {
        "runtimeName": "MOUSTACHE",
        "objectName": "HumanFoundation_FacialHair_Moustache",
        "strandCount": 620,
        "seed": 487102,
        "references": ("moustache-front", "beard-three-quarter"),
    },
    "goatee": {
        "runtimeName": "GOATEE",
        "objectName": "HumanFoundation_FacialHair_Goatee",
        "strandCount": 1100,
        "seed": 487103,
        "references": ("goatee-front", "beard-three-quarter"),
    },
    "short-beard": {
        "runtimeName": "SHORT_BEARD",
        "objectName": "HumanFoundation_FacialHair_ShortBeard",
        "strandCount": 2800,
        "seed": 487104,
        "references": ("beard-profile", "beard-three-quarter", "stubble-front"),
    },
    "full-beard": {
        "runtimeName": "FULL_BEARD",
        "objectName": "HumanFoundation_FacialHair_FullBeard",
        "strandCount": 3600,
        "seed": 487105,
        "references": ("full-beard-front", "beard-profile", "beard-three-quarter"),
    },
}

REFERENCE_SPECS: dict[str, dict[str, Any]] = {
    "stubble-front": {
        "title": "File:Stubbly face.jpg",
        "image": "stubble-front.jpg",
        "imageSha256": "30FC02DB1757E5662A1891DA7C48C6C6C29EEBE1F92427FCC11E73C72971EE86",
        "api": "stubble-front.wikimedia-api.json",
        "apiSha256": "034464D450318FF807F87EFF7123D700D125184FEFEA1E13A6A284414D6A91B4",
        "license": "Public domain",
        "author": "Chameleon at English Wikipedia",
        "page": "https://commons.wikimedia.org/wiki/File:Stubbly_face.jpg",
        "purpose": "front close-up showing true surface stubble density and length",
    },
    "moustache-front": {
        "title": "File:Moustache Man.jpg",
        "image": "moustache-front.jpg",
        "imageSha256": "0F7671FF052A1BAB897D754D44A20CBB224FE70B0A413BFFF118496D6144891E",
        "api": "moustache-front.wikimedia-api.json",
        "apiSha256": "70B4FED6D59C6F83581654796826F10618A852547B2C7321DA0FAFE8076FAA85",
        "license": "CC BY-SA 4.0",
        "author": "Mumflr McDink",
        "page": "https://commons.wikimedia.org/wiki/File:Moustache_Man.jpg",
        "purpose": "upper-lip root line, bilateral flow, and lip clearance",
    },
    "goatee-front": {
        "title": "File:JDGoatee.jpg",
        "image": "goatee-front.jpg",
        "imageSha256": "65A09E6299CD34EE4960DD50FB182DB9E8D30F7C548EC0EDDB4BCBCBA58DD7DC",
        "api": "goatee-front.wikimedia-api.json",
        "apiSha256": "E0858027A48330D0EA929177AB13435E7E0D636A78D0F701F88DAD3B71ACD544",
        "license": "Public domain",
        "author": "PeterPan23 at English Wikipedia",
        "page": "https://commons.wikimedia.org/wiki/File:JDGoatee.jpg",
        "purpose": "goatee separation from cheeks and downward chin flow",
    },
    "beard-profile": {
        "title": "File:Bearded man in profile, probably 1883 (PORTRAITS 2321).jpg",
        "image": "beard-profile.jpg",
        "imageSha256": "5F52BB79DDCFAA96F4926A36A20D59B844A0D1D0FF214CFC30BCFAAEE03211A0",
        "api": "beard-profile.wikimedia-api.json",
        "apiSha256": "E60C1F0575B0C75C86FFD5DF6F39FDBD926B1534914D4C3D293ADB5B043EAA5F",
        "license": "Public domain",
        "author": "Edwin L. Brand",
        "page": "https://commons.wikimedia.org/wiki/File:Bearded_man_in_profile,_probably_1883_(PORTRAITS_2321).jpg",
        "purpose": "profile jaw attachment, cheek transition, and under-chin silhouette",
    },
    "beard-three-quarter": {
        "title": "File:Three-quarter face portrait of man with beard LCCN2006688331.jpg",
        "image": "beard-three-quarter.jpg",
        "imageSha256": "127597EEBE35AB73497AFC2F3B375FE36FA650B7BAA4F110BA5993F1CE8D8582",
        "api": "beard-three-quarter.wikimedia-api.json",
        "apiSha256": "01F0FC79CF8FF3319E460993984445682E9CF105F7FD7ED11BD05050C30D1CF6",
        "license": "Public domain",
        "author": "Library of Congress, PPOC",
        "page": "https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg",
        "purpose": "three-quarter cheek-to-jaw continuity and moustache/beard transition",
    },
    "full-beard-front": {
        "title": "File:Bearded man with long hair-3052641.jpg",
        "image": "full-beard-front.jpg",
        "imageSha256": "AA0467D2605C92D3DDC5EED890BE3DAB5CF3F9CDA21D98182C9B918E1D873AF7",
        "api": "full-beard-front.wikimedia-api.json",
        "apiSha256": "6428487388BB78060F663BFC878D4730678AFA80F5C7023726C9025DE7A46D12",
        "license": "CC0",
        "author": "subhamshome28",
        "page": "https://commons.wikimedia.org/wiki/File:Bearded_man_with_long_hair-3052641.jpg",
        "purpose": "full-beard layering, chin length, and non-solid strand breakup",
    },
}

STATIC_VIEWS = (
    ("front", 0.0),
    ("three-quarter-left", 45.0),
    ("left-profile", 90.0),
    ("rear", 180.0),
    ("right-profile", 270.0),
    ("three-quarter-right", 315.0),
)
ROOT_DISTANCE_LIMIT_METERS = 0.0012


class FacialHairGateError(RuntimeError):
    """Fail-closed candidate or source violation."""


def script_arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--command", choices=("contract", "audit-inputs", "build"), required=True)
    parser.add_argument("--styles", default=",".join(FACIAL_HAIR_STYLES))
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


def normalized_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


def float_triplet_bytes(value: Any) -> bytes:
    return struct.pack("<3f", float(value[0]), float(value[1]), float(value[2]))


def atomic_json(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def glb_document(path: Path) -> tuple[dict[str, Any], bytes]:
    payload = path.read_bytes()
    if len(payload) < 20:
        raise FacialHairGateError(f"GLB is truncated: {path}")
    magic, version, length = struct.unpack_from("<4sII", payload, 0)
    if magic != b"glTF" or version != 2 or length != len(payload):
        raise FacialHairGateError(
            f"GLB header is invalid: magic={magic!r}, version={version}, "
            f"headerLength={length}, bytes={len(payload)}"
        )
    offset = 12
    json_chunk: bytes | None = None
    while offset < length:
        if offset + 8 > length:
            raise FacialHairGateError("GLB chunk header is truncated")
        chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += 8
        end = offset + chunk_length
        if end > length:
            raise FacialHairGateError("GLB chunk is truncated")
        if chunk_type == 0x4E4F534A:
            if json_chunk is not None:
                raise FacialHairGateError("GLB contains multiple JSON chunks")
            json_chunk = payload[offset:end]
        offset = end
    if json_chunk is None:
        raise FacialHairGateError("GLB has no JSON chunk")
    try:
        document = json.loads(json_chunk.rstrip(b" \t\r\n\0").decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise FacialHairGateError(f"GLB JSON is invalid: {error}") from error
    if not isinstance(document, dict):
        raise FacialHairGateError("GLB JSON root is not an object")
    return document, json_chunk


def serialized_mesh_audit(path: Path) -> dict[str, Any]:
    document, json_chunk = glb_document(path)
    nodes = document.get("nodes", [])
    meshes = document.get("meshes", [])
    if not isinstance(nodes, list) or not isinstance(meshes, list):
        raise FacialHairGateError("GLB nodes/meshes arrays are malformed")
    mesh_nodes = []
    references: set[int] = set()
    helpers = []
    for node_index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise FacialHairGateError(f"GLB node {node_index} is malformed")
        if "mesh" not in node:
            continue
        mesh_index = node["mesh"]
        if not isinstance(mesh_index, int) or isinstance(mesh_index, bool):
            raise FacialHairGateError(f"GLB node {node_index} mesh index is malformed")
        if not 0 <= mesh_index < len(meshes):
            raise FacialHairGateError(f"GLB node {node_index} mesh index is out of range")
        name = node.get("name")
        mesh_name = meshes[mesh_index].get("name") if isinstance(meshes[mesh_index], dict) else None
        mesh_nodes.append({"nodeName": name, "meshName": mesh_name, "meshIndex": mesh_index})
        references.add(mesh_index)
        if not isinstance(name, str) or not name.startswith("HumanFoundation_"):
            helpers.append({"nodeName": name, "meshName": mesh_name})
        if not isinstance(mesh_name, str) or not mesh_name.startswith("HumanFoundation_"):
            helpers.append({"nodeName": name, "meshName": mesh_name})
    unreferenced = sorted(set(range(len(meshes))) - references)
    if helpers or unreferenced:
        raise FacialHairGateError(
            f"serialized GLB contains helper/unreferenced meshes: {helpers}/{unreferenced}"
        )
    cameras = document.get("cameras", [])
    lights = document.get("extensions", {}).get("KHR_lights_punctual", {}).get("lights", [])
    if cameras or lights:
        raise FacialHairGateError("serialized GLB contains cameras or lights")
    return {
        "jsonChunkSha256": sha256(json_chunk).hexdigest().upper(),
        "nodeCount": len(nodes),
        "meshCount": len(meshes),
        "meshNodes": mesh_nodes,
        "serializedHelperMeshes": [],
        "serializedCameraCount": 0,
        "serializedPunctualLightCount": 0,
        "icosphereSerialized": "Icosphere" in json_chunk.decode("utf-8", errors="ignore"),
    }


def clean_html(value: Any) -> str:
    text = str(value or "")
    result = []
    in_tag = False
    for character in text:
        if character == "<":
            in_tag = True
        elif character == ">":
            in_tag = False
        elif not in_tag:
            result.append(character)
    return " ".join("".join(result).split())


def audit_references() -> list[dict[str, Any]]:
    receipts = []
    for slug, expected in REFERENCE_SPECS.items():
        image = REFERENCE_ROOT / expected["image"]
        api = REFERENCE_ROOT / expected["api"]
        if not image.is_file() or not api.is_file():
            raise FacialHairGateError(f"locked real-person reference is missing: {slug}")
        image_sha = file_sha256(image)
        api_sha = file_sha256(api)
        if image_sha != expected["imageSha256"] or api_sha != expected["apiSha256"]:
            raise FacialHairGateError(
                f"locked real-person reference changed: {slug}: {image_sha}/{api_sha}"
            )
        metadata = json.loads(api.read_text(encoding="utf-8"))
        page = metadata["query"]["pages"][0]
        info = page["imageinfo"][0]
        license_name = info["extmetadata"]["LicenseShortName"]["value"]
        if page["title"] != expected["title"] or license_name != expected["license"]:
            raise FacialHairGateError(
                f"reference title/license changed: {slug}: {page['title']}/{license_name}"
            )
        receipts.append(
            {
                "slug": slug,
                "title": page["title"],
                "imagePath": normalized_path(image),
                "imageSha256": image_sha,
                "metadataPath": normalized_path(api),
                "metadataSha256": api_sha,
                "width": info["width"],
                "height": info["height"],
                "license": license_name,
                "usageTerms": info["extmetadata"]["UsageTerms"]["value"],
                "author": expected["author"] or clean_html(info["extmetadata"].get("Artist", {}).get("value")),
                "descriptionUrl": info["descriptionurl"],
                "purpose": expected["purpose"],
                "pixelsUsedAsTextureOrProjection": False,
            }
        )
    return receipts


def audit_inputs() -> dict[str, Any]:
    if not SOURCE_GLB.is_file():
        raise FacialHairGateError(f"exact-head source is missing: {SOURCE_GLB}")
    source_sha = file_sha256(SOURCE_GLB)
    if source_sha != SOURCE_SHA256:
        raise FacialHairGateError(
            f"exact-head source SHA changed: expected {SOURCE_SHA256}, got {source_sha}"
        )
    serialized = serialized_mesh_audit(SOURCE_GLB)
    if serialized["icosphereSerialized"]:
        raise FacialHairGateError("exact-head source serializes Icosphere")
    references = audit_references()
    return {
        "schema": "souldrifter.human-facial-hair-input-audit.v2",
        "issue": ISSUE,
        "status": "PASS_HASH_LICENSE_GEOMETRY_ONLY_TEXTURE_BASELINE_REJECTED",
        "exactHead": {
            "path": normalized_path(SOURCE_GLB),
            "sha256": source_sha,
            "status": SOURCE_STATUS,
            "textureBaselineStatus": SOURCE_TEXTURE_BASELINE_STATUS,
            "resumeGate": SOURCE_TEXTURE_RESUME_GATE,
            "serialized": serialized,
        },
        "realPersonReferences": references,
        "referenceCount": len(references),
    }


def contract_payload() -> dict[str, Any]:
    return {
        "schema": "souldrifter.human-facial-hair-candidate-builder.v2",
        "issue": ISSUE,
        "exactHead": {
            "path": normalized_path(SOURCE_GLB),
            "sha256": SOURCE_SHA256,
            "status": SOURCE_STATUS,
            "textureBaselineStatus": SOURCE_TEXTURE_BASELINE_STATUS,
            "resumeGate": SOURCE_TEXTURE_RESUME_GATE,
            "basisSha256": EXPECTED_HEAD_BASIS_SHA256,
            "topologySha256": EXPECTED_HEAD_TOPOLOGY_SHA256,
        },
        "styles": {
            slug: {
                "runtimeName": specification["runtimeName"],
                "objectName": specification["objectName"],
                "strandCount": specification["strandCount"],
                "references": list(specification["references"]),
            }
            for slug, specification in FACIAL_HAIR_STYLES.items()
        },
        "geometry": {
            "kind": "DETERMINISTIC_TAPERED_SURFACE_FOLLOWING_STRANDS",
            "rootSource": "EXACT_HEAD_SKIN_TRIANGLES",
            "floatingCapsOrShelvesAllowed": False,
            "maximumRootDistanceMeters": ROOT_DISTANCE_LIMIT_METERS,
        },
        "stubble": {
            "method": "CANONICAL_UV_MATERIAL_DENSITY_MASK_PLUS_SPARSE_MICROFIBERS",
            "channels": ["albedo", "roughness", "microheight"],
            "zeroMaskBaseTextureEquivalenceRequired": True,
            "zeroMaskBaseTextureEquivalencePassed": False,
        },
        "visualProof": {
            "staticViews": [name for name, _angle in STATIC_VIEWS],
            "turntable": True,
            "selfReviewRequired": True,
            "visualQaPassed": False,
        },
        "motionProof": {
            "jawAndViseme": "BLOCKED_UNTIL_FINAL_PROMOTED_HEAD_SHA",
        },
        "output": {
            "root": normalized_path(CANDIDATE_ROOT),
            "quarantined": True,
            "integrationModeAvailable": False,
            "promotionModeAvailable": False,
        },
    }


def load_blender() -> tuple[Any, Any, Any]:
    try:
        import bpy  # type: ignore
        from mathutils import Vector  # type: ignore
        from mathutils.bvhtree import BVHTree  # type: ignore
    except ModuleNotFoundError as error:
        raise FacialHairGateError(
            "build must run through the cached Blender 5.2.1 executable"
        ) from error
    return bpy, Vector, BVHTree


def basis_points(obj: Any) -> list[Any]:
    if obj.data.shape_keys is not None:
        blocks = obj.data.shape_keys.key_blocks
        if not blocks or blocks[0].name != "Basis":
            raise FacialHairGateError("exact head Basis is missing or reordered")
        return [entry.co.copy() for entry in blocks[0].data]
    return [vertex.co.copy() for vertex in obj.data.vertices]


def point_array_sha256(points: list[Any]) -> str:
    digest = sha256()
    digest.update(struct.pack("<I", len(points)))
    for point in points:
        digest.update(float_triplet_bytes(point))
    return digest.hexdigest().upper()


def topology_sha256(obj: Any) -> str:
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


def triangle_surface_contract(obj: Any) -> dict[str, Any]:
    """Capture topology using coincident-position IDs, independent of UV splits."""
    points: list[tuple[float, float, float]] = []
    point_ids: dict[tuple[float, float, float], int] = {}
    vertex_ids: list[int] = []
    for vertex in obj.data.vertices:
        world = obj.matrix_world @ vertex.co
        point = tuple(float(axis) for axis in world)
        point_id = point_ids.get(point)
        if point_id is None:
            point_id = len(points)
            point_ids[point] = point_id
            points.append(point)
        vertex_ids.append(point_id)
    triangles: Counter[tuple[int, int, int]] = Counter()
    for polygon in obj.data.polygons:
        if len(polygon.vertices) != 3:
            raise FacialHairGateError(
                f"exact head contains non-triangle polygon {polygon.index}"
            )
        triangle = tuple(sorted(vertex_ids[index] for index in polygon.vertices))
        triangles[triangle] += 1
    digest = sha256()
    digest.update(struct.pack("<II", len(points), sum(triangles.values())))
    for point in points:
        digest.update(struct.pack("<3f", *point))
    for triangle, count in sorted(triangles.items()):
        digest.update(struct.pack("<4I", *triangle, count))
    return {
        "points": points,
        "triangles": triangles,
        "sha256": digest.hexdigest().upper(),
        "canonicalPointCount": len(points),
        "triangleCount": sum(triangles.values()),
    }


def validate_exact_head(bpy: Any) -> dict[str, Any]:
    head = bpy.data.objects.get(HEAD_OBJECT)
    armature = bpy.data.objects.get(ARMATURE_OBJECT)
    if head is None or head.type != "MESH" or armature is None or armature.type != "ARMATURE":
        raise FacialHairGateError("exact head or canonical armature is missing after fresh import")
    basis = basis_points(head)
    observed = {
        "vertexCount": len(head.data.vertices),
        "polygonCount": len(head.data.polygons),
        "basisSha256": point_array_sha256(basis),
        "topologySha256": topology_sha256(head),
        "boneCount": len(armature.data.bones),
        "headBonePresent": HEAD_BONE in armature.pose.bones,
    }
    expected = {
        "vertexCount": EXPECTED_HEAD_VERTEX_COUNT,
        "polygonCount": EXPECTED_HEAD_POLYGON_COUNT,
        "basisSha256": EXPECTED_HEAD_BASIS_SHA256,
        "topologySha256": EXPECTED_HEAD_TOPOLOGY_SHA256,
        "boneCount": EXPECTED_BONE_COUNT,
        "headBonePresent": True,
    }
    if observed != expected:
        raise FacialHairGateError(f"exact-head topology contract changed: {observed}")
    return observed


def import_exact_head(bpy: Any) -> tuple[Any, Any, dict[str, Any]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_GLB))
    head = bpy.data.objects[HEAD_OBJECT]
    armature = bpy.data.objects[ARMATURE_OBJECT]
    topology = validate_exact_head(bpy)
    return head, armature, topology


def facial_region(style: str, point: Any, normal: Any) -> str | None:
    x, y, z = float(point.x), float(point.y), float(point.z)
    lateral = abs(y)
    moustache = (
        0.3975 < z < 0.4095
        and 0.0025 < lateral < 0.024
        and x > 0.035
        and normal.x > 0.25
    )
    chin = (
        0.370 < z < 0.398
        and lateral < 0.022
        and x > 0.018
        and normal.x > 0.18
    )
    lip_void = 0.392 < z < 0.402 and lateral < 0.032
    jaw = (
        0.369 < z < 0.408
        and lateral < 0.050
        and x > 0.005
        and normal.x > -0.05
        and not lip_void
        and not moustache
        and not chin
    )
    cheek_top = 0.413 + max(0.0, lateral - 0.022) * 0.50
    cheek = (
        0.392 < z < cheek_top
        and 0.019 < lateral < 0.0495
        and x > 0.0
        and normal.x > -0.05
        and not moustache
    )
    if style == "moustache":
        return "moustache" if moustache else None
    if style == "goatee":
        if moustache:
            return "moustache"
        return "chin" if chin else None
    if style in {"short-beard", "full-beard", "stubble"}:
        for name, included in (
            ("moustache", moustache),
            ("chin", chin),
            ("jaw", jaw),
            ("cheek", cheek),
        ):
            if included:
                return name
    return None


def surface_candidates(head: Any, style: str) -> list[dict[str, Any]]:
    matrix = head.matrix_world
    normal_matrix = matrix.to_3x3()
    candidates = []
    for polygon in head.data.polygons:
        if polygon.material_index != 0 or len(polygon.vertices) != 3:
            continue
        vertices = [matrix @ head.data.vertices[index].co for index in polygon.vertices]
        center = sum(vertices, vertices[0] * 0.0) / 3.0
        normal = (normal_matrix @ polygon.normal).normalized()
        region = facial_region(style, center, normal)
        if region is None:
            continue
        area = (vertices[1] - vertices[0]).cross(vertices[2] - vertices[0]).length * 0.5
        if not math.isfinite(area) or area <= 1.0e-12:
            continue
        candidates.append(
            {
                "polygonIndex": polygon.index,
                "vertices": vertices,
                "center": center,
                "normal": normal,
                "region": region,
                "area": float(area),
            }
        )
    if len(candidates) < 25:
        raise FacialHairGateError(
            f"{style} has too few exact-surface candidate triangles: {len(candidates)}"
        )
    return candidates


def uniform_triangle_point(vertices: list[Any], rng: random.Random) -> Any:
    first = rng.random()
    second = rng.random()
    if first + second > 1.0:
        first = 1.0 - first
        second = 1.0 - second
    return vertices[0] + (vertices[1] - vertices[0]) * first + (vertices[2] - vertices[0]) * second


def strand_parameters(
    style: str,
    region: str,
    surface: Any,
    normal: Any,
    rng: random.Random,
    Vector: Any,
) -> tuple[Any, Any, float, float]:
    sign = 1.0 if surface.y >= 0.0 else -1.0
    jitter = Vector(
        (
            rng.uniform(-0.12, 0.12),
            rng.uniform(-0.12, 0.12),
            rng.uniform(-0.10, 0.10),
        )
    )
    if style == "stubble":
        direction = normal * 0.90 + Vector((0.02, sign * 0.04, -0.18)) + jitter * 0.25
        length = rng.uniform(0.0003, 0.0007)
        diameter = rng.uniform(0.00006, 0.00010)
    elif region == "moustache":
        direction = normal * 0.35 + Vector((0.02, sign * 0.38, -0.72)) + jitter * 0.12
        length = rng.uniform(0.0028, 0.0055)
        diameter = rng.uniform(0.00020, 0.00034)
    elif style == "goatee":
        direction = normal * 0.38 + Vector((0.02, sign * 0.07, -0.78)) + jitter * 0.18
        length = rng.uniform(0.006, 0.014)
        diameter = rng.uniform(0.00022, 0.00036)
    else:
        if region == "cheek":
            short_range = (0.0025, 0.0055) if style == "short-beard" else (0.006, 0.012)
            direction = normal * 0.55 + Vector((0.02, sign * 0.08, -0.65)) + jitter * 0.16
            length = rng.uniform(*short_range)
        elif region == "jaw":
            short_range = (0.004, 0.008) if style == "short-beard" else (0.010, 0.020)
            direction = normal * 0.40 + Vector((0.02, sign * 0.07, -0.78)) + jitter * 0.17
            length = rng.uniform(*short_range)
        else:
            short_range = (0.006, 0.011) if style == "short-beard" else (0.015, 0.030)
            direction = normal * 0.30 + Vector((0.02, sign * 0.05, -0.90)) + jitter * 0.18
            length = rng.uniform(*short_range)
        diameter = rng.uniform(0.00020, 0.00036)
    direction.normalize()
    radius = diameter * 0.5
    root = surface + normal * (radius + 0.00010)
    return root, direction, length, radius


def add_tapered_strand(
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, ...]],
    root: Any,
    direction: Any,
    normal: Any,
    length: float,
    radius: float,
    curl: float,
    Vector: Any,
) -> None:
    side = direction.cross(normal)
    if side.length <= 1.0e-8:
        side = direction.cross(Vector((0.0, 0.0, 1.0)))
    if side.length <= 1.0e-8:
        side = Vector((0.0, 1.0, 0.0))
    side.normalize()
    second = direction.cross(side).normalized()
    middle = root + direction * (length * 0.48) + side * (curl * length * 0.25)
    tip = root + direction * length + side * (curl * length)
    start = len(vertices)
    for center, scale in ((root, 1.0), (middle, 0.56)):
        vertices.extend(
            tuple(center + side * math.cos(angle) * radius * scale + second * math.sin(angle) * radius * scale)
            for angle in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5)
        )
    vertices.append(tuple(tip))
    for index in range(4):
        following = (index + 1) % 4
        faces.append((start + index, start + following, start + 4 + following, start + 4 + index))
        faces.append((start + 4 + index, start + 4 + following, start + 8))


def create_hair_material(bpy: Any, style: str) -> Any:
    material = bpy.data.materials.new(f"HumanFoundation_FacialHair_{style}_Material")
    material.use_nodes = True
    material.diffuse_color = (0.025, 0.012, 0.006, 1.0)
    material.use_backface_culling = False
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is not None:
        shader.inputs["Base Color"].default_value = (0.025, 0.012, 0.006, 1.0)
        shader.inputs["Roughness"].default_value = 0.56
        if "Metallic" in shader.inputs:
            shader.inputs["Metallic"].default_value = 0.0
    return material


def build_stubble_hybrid_material(bpy: Any, head: Any, output_dir: Path) -> dict[str, Any]:
    """Bake a UV density mass while retaining sparse close-up strand geometry."""
    import numpy as np  # Blender 5.2.1 bundled dependency

    size = 1024
    density = np.zeros((size, size), dtype=np.float32)
    uv_layer = head.data.uv_layers.active
    if uv_layer is None:
        raise FacialHairGateError("exact head has no active UV map for hybrid stubble")

    def smooth01(value: Any) -> Any:
        value = np.clip(value, 0.0, 1.0)
        return value * value * (3.0 - 2.0 * value)

    for polygon in head.data.polygons:
        if polygon.material_index != 0 or len(polygon.vertices) != 3:
            continue
        world = [head.matrix_world @ head.data.vertices[index].co for index in polygon.vertices]
        if max(point.z for point in world) < 0.365 or min(point.z for point in world) > 0.432:
            continue
        if max(point.x for point in world) <= -0.002:
            continue
        uv = [uv_layer.data[index].uv.copy() for index in polygon.loop_indices]
        if any(axis < -0.001 or axis > 1.001 for point in uv for axis in point):
            continue
        if max(point.x for point in uv) - min(point.x for point in uv) > 0.5:
            continue
        if max(point.y for point in uv) - min(point.y for point in uv) > 0.5:
            continue
        minimum_x = max(0, int(math.floor(min(point.x for point in uv) * size)) - 1)
        maximum_x = min(size - 1, int(math.ceil(max(point.x for point in uv) * size)) + 1)
        minimum_y = max(0, int(math.floor(min(point.y for point in uv) * size)) - 1)
        maximum_y = min(size - 1, int(math.ceil(max(point.y for point in uv) * size)) + 1)
        if minimum_x > maximum_x or minimum_y > maximum_y:
            continue
        pixel_x = (np.arange(minimum_x, maximum_x + 1, dtype=np.float32) + 0.5) / size
        pixel_y = (np.arange(minimum_y, maximum_y + 1, dtype=np.float32) + 0.5) / size
        grid_x, grid_y = np.meshgrid(pixel_x, pixel_y)
        u0, u1, u2 = uv
        denominator = (u1.y - u2.y) * (u0.x - u2.x) + (u2.x - u1.x) * (u0.y - u2.y)
        if abs(denominator) <= 1.0e-10:
            continue
        first = ((u1.y - u2.y) * (grid_x - u2.x) + (u2.x - u1.x) * (grid_y - u2.y)) / denominator
        second = ((u2.y - u0.y) * (grid_x - u2.x) + (u0.x - u2.x) * (grid_y - u2.y)) / denominator
        third = 1.0 - first - second
        inside = (first >= -1.0e-5) & (second >= -1.0e-5) & (third >= -1.0e-5)
        if not inside.any():
            continue
        world_x = first * world[0].x + second * world[1].x + third * world[2].x
        world_y = first * world[0].y + second * world[1].y + third * world[2].y
        world_z = first * world[0].z + second * world[1].z + third * world[2].z
        lateral = np.abs(world_y)
        upper_line = 0.413 + np.maximum(0.0, lateral - 0.022) * 0.50
        value = smooth01((upper_line - world_z) / 0.006)
        value *= smooth01((world_z - 0.367) / 0.006)
        value *= smooth01((0.051 - lateral) / 0.005)
        value *= smooth01((world_x + 0.002) / 0.012)
        nose_exclusion = (world_z > 0.401) & (lateral < 0.017)
        lip_exclusion = (world_z > 0.392) & (world_z < 0.402) & (lateral < 0.032)
        moustache = (
            (world_z > 0.400)
            & (world_z < 0.410)
            & (lateral > 0.003)
            & (lateral < 0.024)
            & (world_x > 0.032)
        )
        value[nose_exclusion | lip_exclusion] = 0.0
        value = np.maximum(value, moustache.astype(np.float32) * 0.82)
        noise = 0.78 + 0.22 * (
            0.5
            + 0.5
            * np.sin(grid_x * 487.0 + np.sin(grid_y * 311.0) * 3.0)
        )
        value *= noise
        value[~inside] = 0.0
        view = density[minimum_y : maximum_y + 1, minimum_x : maximum_x + 1]
        np.maximum(view, value.astype(np.float32), out=view)

    if float(density.max()) < 0.5 or int(np.count_nonzero(density > 0.08)) < 1000:
        raise FacialHairGateError("hybrid stubble UV density mask is empty or under-covered")
    fine_noise = 0.5 + 0.5 * np.sin(
        np.arange(size, dtype=np.float32)[:, None] * 91.0
        + np.arange(size, dtype=np.float32)[None, :] * 137.0
    )
    mask_pixels = np.zeros((size, size, 4), dtype=np.float32)
    mask_pixels[..., 0] = density
    mask_pixels[..., 1] = density * (0.72 + 0.28 * fine_noise)
    mask_pixels[..., 2] = density * fine_noise
    mask_pixels[..., 3] = 1.0
    mask_image = bpy.data.images.new("HumanFoundation_StubbleHybrid_Mask", size, size, alpha=True)
    mask_image.colorspace_settings.name = "Non-Color"
    mask_image.pixels.foreach_set(mask_pixels.ravel())
    mask_path = output_dir / "stubble-density-roughness-microheight-mask.png"
    mask_image.filepath_raw = str(mask_path)
    mask_image.file_format = "PNG"
    mask_image.save()

    material = head.data.materials[0]
    source_nodes = [node for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image]
    if not source_nodes:
        raise FacialHairGateError("exact-head source material lost its locked base-color image")
    source_image = source_nodes[0].image
    source_copy = source_image.copy()
    source_copy.scale(size, size)
    source_pixels = np.empty(size * size * 4, dtype=np.float32)
    source_copy.pixels.foreach_get(source_pixels)
    source_pixels = source_pixels.reshape((size, size, 4))
    amount = (density * 0.48)[..., None]
    tint = np.array((0.020, 0.010, 0.005), dtype=np.float32)
    composite_pixels = source_pixels.copy()
    composite_pixels[..., :3] = source_pixels[..., :3] * (1.0 - amount) + tint * amount
    composite = bpy.data.images.new("HumanFoundation_StubbleHybrid_BaseColor", size, size, alpha=True)
    composite.colorspace_settings.name = "sRGB"
    composite.pixels.foreach_set(composite_pixels.ravel())
    composite_path = output_dir / "stubble-textured-head-basecolor-proof.png"
    composite.filepath_raw = str(composite_path)
    composite.file_format = "PNG"
    composite.save()
    bpy.data.images.remove(source_copy)

    hybrid = material.copy()
    hybrid.name = "HumanFoundation_StubbleHybrid_SourceTextureMaterial"
    hybrid.diffuse_color = (0.18, 0.09, 0.05, 1.0)
    hybrid.use_nodes = True
    nodes = hybrid.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    base_texture = nodes.new("ShaderNodeTexImage")
    base_texture.name = "LockedSourceTexture_WithStubbleDensity"
    base_texture.image = composite
    mask_texture = nodes.new("ShaderNodeTexImage")
    mask_texture.name = "Stubble_Density_Roughness_MicroHeight"
    mask_texture.image = mask_image
    mask_texture.interpolation = "Linear"
    separate = nodes.new("ShaderNodeSeparateColor")
    roughness = nodes.new("ShaderNodeMath")
    roughness.operation = "MULTIPLY_ADD"
    roughness.inputs[1].default_value = 0.18
    roughness.inputs[2].default_value = 0.72
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.00035
    links = hybrid.node_tree.links
    links.new(base_texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(mask_texture.outputs["Color"], separate.inputs["Color"])
    links.new(separate.outputs["Green"], roughness.inputs[0])
    links.new(roughness.outputs[0], shader.inputs["Roughness"])
    links.new(separate.outputs["Blue"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    nodes.active = base_texture
    head.data.materials[0] = hybrid
    head["souldrifterStubbleHybrid"] = True
    return {
        "method": "UV_ALBEDO_ROUGHNESS_MICROHEIGHT_DENSITY_PLUS_SPARSE_MICROFIBERS",
        "maskPath": normalized_path(mask_path),
        "maskSha256": file_sha256(mask_path),
        "texturedProofBaseColorPath": normalized_path(composite_path),
        "texturedProofBaseColorSha256": file_sha256(composite_path),
        "textureResolution": [size, size],
        "sourceBaseColorImage": source_image.name,
        "sourceBaseColorResolution": list(source_image.size),
        "noseExcluded": True,
        "eyelidsExcluded": True,
        "lipsExcluded": True,
        "naturalRisingLowerCheekLine": True,
    }


def build_strand_mesh(
    bpy: Any,
    Vector: Any,
    BVHTree: Any,
    head: Any,
    armature: Any,
    style: str,
    output_dir: Path,
) -> tuple[Any, dict[str, Any]]:
    specification = FACIAL_HAIR_STYLES[style]
    rng = random.Random(specification["seed"])
    candidates = surface_candidates(head, style)
    chosen = rng.choices(
        candidates,
        weights=[entry["area"] for entry in candidates],
        k=specification["strandCount"],
    )
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    roots = []
    anchors = []
    regions: dict[str, int] = {}
    lengths = []
    for entry in chosen:
        for _attempt in range(16):
            surface = uniform_triangle_point(entry["vertices"], rng)
            if facial_region(style, surface, entry["normal"]) == entry["region"]:
                break
        else:
            # The triangle center already passed the same strict region gate.
            surface = entry["center"].copy()
        root, direction, length, radius = strand_parameters(
            style, entry["region"], surface, entry["normal"], rng, Vector
        )
        add_tapered_strand(
            vertices,
            faces,
            root,
            direction,
            entry["normal"],
            length,
            radius,
            rng.uniform(-0.16, 0.16),
            Vector,
        )
        roots.append(root.copy())
        anchors.append(surface.copy())
        regions[entry["region"]] = regions.get(entry["region"], 0) + 1
        lengths.append(length)

    mesh = bpy.data.meshes.new(specification["objectName"] + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(create_hair_material(bpy, style))
    mesh.update(calc_edges=True)
    hair = bpy.data.objects.new(specification["objectName"], mesh)
    bpy.context.scene.collection.objects.link(hair)
    world = hair.matrix_world.copy()
    hair.parent = armature
    hair.parent_type = "BONE"
    hair.parent_bone = HEAD_BONE
    hair.matrix_world = world
    hair["souldrifterIssue"] = ISSUE
    hair["souldrifterFacialHairStyle"] = specification["runtimeName"]
    hair["souldrifterGeometry"] = "TAPERED_SURFACE_FOLLOWING_STRANDS"
    hair["souldrifterMotionReadiness"] = "BLOCKED_UNTIL_FINAL_PROMOTED_HEAD_SHA"

    world_vertices = [head.matrix_world @ vertex.co for vertex in head.data.vertices]
    polygons = [tuple(polygon.vertices) for polygon in head.data.polygons]
    tree = BVHTree.FromPolygons(world_vertices, polygons, all_triangles=True, epsilon=0.0)
    distances = []
    for root in roots:
        _nearest, _normal, _index, distance = tree.find_nearest(root)
        if distance is None:
            raise FacialHairGateError(f"{style} root did not resolve against the exact head")
        distances.append(float(distance))
    maximum_distance = max(distances, default=math.inf)
    if maximum_distance > ROOT_DISTANCE_LIMIT_METERS:
        raise FacialHairGateError(
            f"{style} contains floating strand roots: {maximum_distance}m"
        )
    if style == "moustache" and (
        min(root.z for root in roots) < 0.396
        or max(root.z for root in roots) > 0.411
        or max(abs(root.y) for root in roots) > 0.032
    ):
        raise FacialHairGateError(
            "moustache roots escaped the upper-lip surface band: "
            f"z={min(root.z for root in roots)}..{max(root.z for root in roots)}, "
            f"lateral={max(abs(root.y) for root in roots)}"
        )
    if style in {"short-beard", "full-beard"} and (
        max(abs(root.y) for root in roots) < 0.035
        or min(root.z for root in roots) > 0.390
    ):
        raise FacialHairGateError(f"{style} does not cover the jaw in profile")
    root_digest = sha256()
    for root in roots:
        root_digest.update(float_triplet_bytes(root))
    hybrid = build_stubble_hybrid_material(bpy, head, output_dir) if style == "stubble" else None
    receipt = {
        "method": "DETERMINISTIC_TAPERED_SURFACE_FOLLOWING_STRANDS_V2",
        "strandCount": len(roots),
        "sourceTriangleCount": len(candidates),
        "regionStrandCounts": regions,
        "meshVertexCount": len(mesh.vertices),
        "meshPolygonCount": len(mesh.polygons),
        "minimumStrandLengthMeters": min(lengths),
        "maximumStrandLengthMeters": max(lengths),
        "maximumRootDistanceMeters": maximum_distance,
        "rootDistanceLimitMeters": ROOT_DISTANCE_LIMIT_METERS,
        "surfaceRootSha256": root_digest.hexdigest().upper(),
        "floatingRootCount": 0,
        "capOrShelfObjects": 0,
        "exactHeadSurfaceAnchors": len(anchors),
    }
    if hybrid is not None:
        receipt["hybridSurfaceDensity"] = hybrid
    return hair, receipt


def export_candidate(bpy: Any, hair: Any, output: Path) -> dict[str, Any]:
    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for name in sorted(RUNTIME_OBJECTS):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise FacialHairGateError(f"runtime object disappeared before export: {name}")
        obj.select_set(True)
        selected.append(obj)
    armature = bpy.data.objects[ARMATURE_OBJECT]
    armature.select_set(True)
    hair.select_set(True)
    selected.extend((armature, hair))
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
    serialized = serialized_mesh_audit(output)
    if serialized["icosphereSerialized"]:
        raise FacialHairGateError("candidate export serialized Blender's importer Icosphere")
    return serialized


def fresh_import_gate(
    bpy: Any,
    candidate: Path,
    hair_name: str,
    expected_triangle_surface: dict[str, Any],
) -> dict[str, Any]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(candidate))
    head = bpy.data.objects.get(HEAD_OBJECT)
    armature = bpy.data.objects.get(ARMATURE_OBJECT)
    if head is None or head.type != "MESH" or armature is None or armature.type != "ARMATURE":
        raise FacialHairGateError("fresh candidate import lost exact head or armature")
    if len(head.data.polygons) != EXPECTED_HEAD_POLYGON_COUNT:
        raise FacialHairGateError(
            "fresh candidate import changed exact-head triangle count: "
            f"{len(head.data.polygons)}"
        )
    from mathutils.kdtree import KDTree  # type: ignore

    tree = KDTree(len(expected_triangle_surface["points"]))
    for point_id, point in enumerate(expected_triangle_surface["points"]):
        tree.insert(point, point_id)
    tree.balance()
    mapped_vertex_ids = []
    distances = []
    for vertex in head.data.vertices:
        world = head.matrix_world @ vertex.co
        _nearest, point_id, distance = tree.find(world)
        mapped_vertex_ids.append(point_id)
        distances.append(float(distance))
    maximum_drift = max(distances, default=math.inf)
    if maximum_drift > 0.000002:
        raise FacialHairGateError(
            f"fresh candidate import moved exact-head surface vertices: {maximum_drift}m"
        )
    observed_triangles: Counter[tuple[int, int, int]] = Counter()
    for polygon in head.data.polygons:
        triangle = tuple(sorted(mapped_vertex_ids[index] for index in polygon.vertices))
        observed_triangles[triangle] += 1
    if observed_triangles != expected_triangle_surface["triangles"]:
        raise FacialHairGateError("fresh candidate import changed exact-head surface topology")
    if len(armature.data.bones) != EXPECTED_BONE_COUNT or HEAD_BONE not in armature.pose.bones:
        raise FacialHairGateError("fresh candidate import changed the canonical armature")
    hair = bpy.data.objects.get(hair_name)
    if hair is None or hair.type != "MESH":
        raise FacialHairGateError(f"fresh candidate import lost facial-hair mesh: {hair_name}")
    if hair.parent is None or hair.parent.type != "ARMATURE":
        raise FacialHairGateError(f"fresh candidate import lost rigid head attachment: {hair_name}")
    return {
        "status": "PASS_STRUCTURAL_FRESH_IMPORT",
        "exactHead": {
            "sourceTopologyLockedBeforeExport": True,
            "roundTripVertexCount": len(head.data.vertices),
            "roundTripPolygonCount": len(head.data.polygons),
            "triangleSurfaceSha256": expected_triangle_surface["sha256"],
            "triangleSurfacePreserved": True,
            "exporterVertexSplitsAllowedOnlyWithIdenticalTriangleSurface": True,
            "maximumSurfaceVertexDriftMeters": maximum_drift,
        },
        "hairObject": hair.name,
        "hairVertexCount": len(hair.data.vertices),
        "hairPolygonCount": len(hair.data.polygons),
        "armatureParent": hair.parent.name,
        "motionProof": "BLOCKED_UNTIL_FINAL_PROMOTED_HEAD_SHA",
    }


def configure_proof_scene(bpy: Any, Vector: Any, head: Any, hair: Any) -> tuple[Any, Any]:
    for obj in bpy.data.objects:
        obj.hide_render = obj not in {head, hair}
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("EvidenceWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.065, 0.075, 1.0)
    background.inputs["Strength"].default_value = 0.36
    scene.world = world
    bpy.ops.object.camera_add(location=(0.34, 0.0, 0.427))
    camera = bpy.context.object
    camera.name = "EvidenceCamera"
    camera.data.lens = 67
    camera.data.clip_start = 0.01
    camera.data.clip_end = 10.0
    scene.camera = camera
    return scene, camera


def place_camera(camera: Any, Vector: Any, angle_degrees: float) -> None:
    radius = 0.34
    radians = math.radians(angle_degrees)
    camera.location = (
        radius * math.cos(radians),
        radius * math.sin(radians),
        0.427,
    )
    target = Vector((0.005, 0.0, 0.425))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_proof(
    bpy: Any,
    Vector: Any,
    head: Any,
    hair: Any,
    output_dir: Path,
) -> dict[str, Any]:
    scene, camera = configure_proof_scene(bpy, Vector, head, hair)
    static_receipts = []
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    for name, angle in STATIC_VIEWS:
        place_camera(camera, Vector, angle)
        path = output_dir / f"view-{name}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        static_receipts.append(
            {"view": name, "path": normalized_path(path), "sha256": file_sha256(path)}
        )
        render_result = bpy.data.images.get("Render Result")
        if render_result is not None:
            render_result.buffers_free()

    frames = output_dir / "turntable-frames"
    frames.mkdir(parents=True, exist_ok=False)
    scene.render.resolution_x = 384
    scene.render.resolution_y = 384
    frame_count = 24
    for frame in range(frame_count):
        place_camera(camera, Vector, 360.0 * frame / frame_count)
        scene.render.filepath = str(frames / f"turntable-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
        render_result = bpy.data.images.get("Render Result")
        if render_result is not None:
            render_result.buffers_free()
    video = output_dir / "turntable.mp4"
    result = subprocess.run(
        [
            str(FFMPEG_EXE),
            "-y",
            "-loglevel",
            "error",
            "-framerate",
            "24",
            "-i",
            str(frames / "turntable-%03d.png"),
            "-c:v",
            "libx264",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(video),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not video.is_file():
        raise FacialHairGateError(f"turntable encoding failed: {result.stderr.strip()}")
    shutil.rmtree(frames)
    return {
        "staticViews": static_receipts,
        "turntable": {
            "path": normalized_path(video),
            "sha256": file_sha256(video),
            "frameCount": frame_count,
            "framesPerSecond": 24,
        },
        "displayOnlyMaterialOverride": False,
        "rendersActualSerializedCandidateMaterials": True,
    }


def prepare_style_directory(style: str, replace_existing: bool) -> Path:
    CANDIDATE_ROOT.mkdir(parents=True, exist_ok=True)
    output = (CANDIDATE_ROOT / style).resolve()
    if output.parent != CANDIDATE_ROOT.resolve():
        raise FacialHairGateError("candidate output escaped the evidence root")
    if output.exists():
        if not replace_existing:
            raise FacialHairGateError(
                f"quarantined evidence already exists for {style}; use --replace-existing"
            )
        shutil.rmtree(output)
    output.mkdir(parents=True)
    return output


def build_style(
    bpy: Any,
    Vector: Any,
    BVHTree: Any,
    style: str,
    input_receipt: dict[str, Any],
    replace_existing: bool,
) -> dict[str, Any]:
    output_dir = prepare_style_directory(style, replace_existing)
    head, armature, topology = import_exact_head(bpy)
    exact_triangle_surface = triangle_surface_contract(head)
    hair, geometry = build_strand_mesh(
        bpy, Vector, BVHTree, head, armature, style, output_dir
    )
    candidate = output_dir / f"human-foundation-facial-hair-{style}-candidate.glb"
    serialized = export_candidate(bpy, hair, candidate)
    candidate_sha = file_sha256(candidate)
    fresh = fresh_import_gate(
        bpy,
        candidate,
        FACIAL_HAIR_STYLES[style]["objectName"],
        exact_triangle_surface,
    )

    # Render from a new import so the proof reflects the serialized candidate.
    head = bpy.data.objects[HEAD_OBJECT]
    hair = bpy.data.objects[FACIAL_HAIR_STYLES[style]["objectName"]]
    visual_evidence = render_proof(bpy, Vector, head, hair, output_dir)
    references_by_slug = {
        entry["slug"]: entry for entry in input_receipt["realPersonReferences"]
    }
    payload = {
        "schema": "souldrifter.human-facial-hair-candidate.v2",
        "issue": ISSUE,
        "style": style,
        "runtimeName": FACIAL_HAIR_STYLES[style]["runtimeName"],
        "status": "QUARANTINED_STRUCTURAL_PASS_SELF_VISUAL_REVIEW_PENDING",
        "exactHead": {
            "path": normalized_path(SOURCE_GLB),
            "sha256": SOURCE_SHA256,
            "sourceStatus": SOURCE_STATUS,
            "topology": topology,
            "triangleSurfaceSha256": exact_triangle_surface["sha256"],
            "canonicalSurfacePointCount": exact_triangle_surface["canonicalPointCount"],
        },
        "realPersonReferenceEvidence": [
            references_by_slug[slug]
            for slug in FACIAL_HAIR_STYLES[style]["references"]
        ],
        "geometry": geometry,
        "candidate": {
            "path": normalized_path(candidate),
            "sha256": candidate_sha,
            "serialized": serialized,
            "runtimeIntegrated": False,
        },
        "freshImport": fresh,
        "visualEvidence": visual_evidence,
        "visualQa": {
            "passed": False,
            "status": "SELF_REVIEW_REQUIRED",
            "gates": [
                "no floating cap or shelf silhouette",
                "roots remain flush to exact head in every view",
                "moustache follows upper lip without floating",
                "goatee and beards follow chin/jaw in both profiles",
                "rear view contains no detached or leaked geometry",
            ],
        },
        "motionProof": {
            "status": "BLOCKED_UNTIL_FINAL_PROMOTED_HEAD_SHA",
            "jaw": False,
            "visemes": False,
        },
        "promotion": {
            "status": "BLOCKED",
            "integrationModeAvailable": False,
            "promotionModeAvailable": False,
        },
    }
    provenance = output_dir / "provenance.json"
    atomic_json(provenance, payload)
    payload["provenance"] = {
        "path": normalized_path(provenance),
        "sha256": file_sha256(provenance),
    }
    return payload


def selected_styles(value: str) -> list[str]:
    styles = [entry.strip() for entry in value.split(",") if entry.strip()]
    unknown = sorted(set(styles) - set(FACIAL_HAIR_STYLES))
    if not styles or unknown:
        raise FacialHairGateError(f"invalid facial-hair style selection: {unknown}")
    return styles


def build(args: argparse.Namespace) -> dict[str, Any]:
    if SOURCE_TEXTURE_BASELINE_STATUS != "PASS_ZERO_MASK_BASE_TEXTURE_EQUIVALENCE":
        raise FacialHairGateError(
            "exact-head texture baseline is rejected "
            f"({SOURCE_TEXTURE_BASELINE_STATUS}); {SOURCE_TEXTURE_RESUME_GATE}"
        )
    input_receipt = audit_inputs()
    if not FFMPEG_EXE.is_file():
        raise FacialHairGateError(f"cached ffmpeg executable is missing: {FFMPEG_EXE}")
    bpy, Vector, BVHTree = load_blender()
    receipts = []
    for style in selected_styles(args.styles):
        receipts.append(
            build_style(
                bpy,
                Vector,
                BVHTree,
                style,
                input_receipt,
                args.replace_existing,
            )
        )
    manifest = {
        "schema": "souldrifter.human-facial-hair-build-manifest.v2",
        "issue": ISSUE,
        "status": "QUARANTINED_SELF_VISUAL_REVIEW_REQUIRED",
        "inputs": input_receipt,
        "styles": [
            {
                "style": entry["style"],
                "candidate": entry["candidate"],
                "provenance": entry["provenance"],
                "visualEvidence": entry["visualEvidence"],
            }
            for entry in receipts
        ],
        "runtimeIntegrated": False,
        "promotion": "BLOCKED",
    }
    atomic_json(EVIDENCE_ROOT / "build-manifest.json", manifest)
    return manifest


def main() -> int:
    args = script_arguments()
    try:
        if args.command == "contract":
            print("FACIAL_HAIR_CONTRACT=" + canonical_json(contract_payload()))
            return 0
        if args.command == "audit-inputs":
            print("FACIAL_HAIR_INPUT_AUDIT=" + canonical_json(audit_inputs()))
            return 0
        print("FACIAL_HAIR_BUILD=" + canonical_json(build(args)))
        return 0
    except FacialHairGateError as error:
        failure = {
            "schema": "souldrifter.human-facial-hair-build-failure.v2",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_INTEGRATION_NO_PROMOTION",
            "reason": str(error),
        }
        print("FACIAL_HAIR_FAILURE=" + canonical_json(failure), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
