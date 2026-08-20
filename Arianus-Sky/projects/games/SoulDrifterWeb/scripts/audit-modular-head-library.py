"""Independently re-import and audit the modular SoulDrifter head library."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import traceback

import bpy


REQUIRED_MORPHS = {
    "blink.left",
    "blink.right",
    "squint",
    "brow.raise",
    "brow.lower",
    "brow.asymmetry",
    "jaw.open",
    "smile",
    "frown",
    "viseme.aa",
    "viseme.ee",
    "viseme.oh",
}


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--audit-output", required=True, type=Path)
    return parser.parse_args(sys.argv[separator + 1 :])


def import_head(path: Path) -> bpy.types.Object:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"{path.name}: expected one mesh, found {len(meshes)}")
    return meshes[0]


def main() -> None:
    args = arguments()
    manifest_path = args.manifest.resolve()
    audit_output = args.audit_output.resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = []
    reference_topology = None

    for source in manifest["outputs"]:
        path = Path(source["output"])
        head = import_head(path)
        shape_keys = head.data.shape_keys
        morphs = set()
        morph_max_displacements = {}
        if shape_keys is not None:
            morphs = {key.name for key in shape_keys.key_blocks if key.name != "Basis"}
            basis = shape_keys.key_blocks.get("Basis")
            if basis is not None:
                for name in morphs:
                    key = shape_keys.key_blocks[name]
                    morph_max_displacements[name] = max(
                        (point.co - basis.data[index].co).length
                        for index, point in enumerate(key.data)
                    )
        triangles = sum(len(polygon.vertices) - 2 for polygon in head.data.polygons)
        topology = (len(head.data.vertices), triangles)
        if reference_topology is None:
            reference_topology = topology
        errors = []
        if topology != reference_topology:
            errors.append(f"topology {topology} differs from {reference_topology}")
        if not REQUIRED_MORPHS.issubset(morphs):
            errors.append(f"missing morphs {sorted(REQUIRED_MORPHS - morphs)}")
        inert_morphs = sorted(
            name
            for name in REQUIRED_MORPHS.intersection(morphs)
            if morph_max_displacements.get(name, 0.0) < 0.001
        )
        explosive_morphs = sorted(
            name
            for name in REQUIRED_MORPHS.intersection(morphs)
            if morph_max_displacements.get(name, 0.0) > 0.06
        )
        if inert_morphs:
            errors.append(f"inert morphs {inert_morphs}")
        if explosive_morphs:
            errors.append(f"explosive morphs {explosive_morphs}")
        if any(item.type == "ARMATURE" for item in bpy.context.scene.objects):
            errors.append("standalone head unexpectedly contains an armature")
        if source.get("attachmentProfile") != "head-seam-v1":
            errors.append("manifest attachment profile is not head-seam-v1")
        records.append({
            "assetId": source["assetId"],
            "path": str(path),
            "vertices": topology[0],
            "triangles": topology[1],
            "morphTargets": sorted(morphs),
            "morphMaxDisplacements": {
                name: round(value, 8)
                for name, value in sorted(morph_max_displacements.items())
            },
            "errorCount": len(errors),
            "errors": errors,
        })

    family_pairs = {
        (item["familyId"], item["presentation"]) for item in manifest["outputs"]
    }
    expected_pairs = {
        (family, presentation)
        for family in (
            "african-diaspora-black",
            "east-asian",
            "south-asian-indian",
            "european",
        )
        for presentation in ("feminine", "masculine")
    }
    library_errors = []
    if family_pairs != expected_pairs:
        library_errors.append("family/presentation matrix is incomplete")
    if len(manifest.get("skinToneMaterialFamilies", {})) < 6:
        library_errors.append("fewer than six skin-tone material families")
    if not manifest.get("prototypePolicy", {}).get("identityReferenceReviewRequired"):
        library_errors.append("identity/reference review gate is missing")
    if manifest.get("prototypePolicy", {}).get("runtimePromotionAllowed"):
        library_errors.append("unreviewed prototype incorrectly permits runtime promotion")
    failed_assets = [item["assetId"] for item in records if item["errorCount"]]
    passed = not failed_assets and not library_errors
    result = {
        "schemaVersion": 1,
        "manifest": str(manifest_path),
        "variantCount": len(records),
        "requiredMorphTargets": sorted(REQUIRED_MORPHS),
        "sharedTopology": {
            "vertices": reference_topology[0] if reference_topology else 0,
            "triangles": reference_topology[1] if reference_topology else 0,
        },
        "failedAssets": failed_assets,
        "libraryErrors": library_errors,
        "passed": passed,
        "records": records,
    }
    audit_output.parent.mkdir(parents=True, exist_ok=True)
    audit_output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "audit": str(audit_output),
        "variantCount": len(records),
        "passed": passed,
        "failedAssets": failed_assets,
        "libraryErrors": library_errors,
    }, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001 - Blender must propagate batch failures.
        traceback.print_exc()
        raise SystemExit(1)
