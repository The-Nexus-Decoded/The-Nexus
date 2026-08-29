"""Create a motion-only runtime GLB from an evidence animation candidate.

Evidence candidates intentionally retain their original bytes and may include
review-only meshes, cameras, or lights.  This fail-closed promotion boundary
imports one evidence GLB, selects only its canonical 65-bone armature, exports
a distinct runtime-ready GLB, then factory-resets Blender and proves the fresh
import contains exactly one ARMATURE object and no scene or proxy geometry.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import shutil
import struct
import sys

import bpy


EXPECTED_BONES = 65
EXPECTED_ROOTS = ["mixamorig:Hips"]
EXPECTED_FPS = 30


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def factory_reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = EXPECTED_FPS
    bpy.context.scene.render.fps_base = 1


def import_glb(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def choose_canonical_armature() -> bpy.types.Object:
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected exactly one candidate armature, found {len(armatures)}"
        )
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONES or roots != EXPECTED_ROOTS:
        raise RuntimeError(
            f"Expected {EXPECTED_BONES} bones/{EXPECTED_ROOTS}, got "
            f"{len(armature.data.bones)}/{roots}"
        )
    return armature


def action_names() -> list[str]:
    return sorted(
        action.name
        for action in bpy.data.actions
        if action.frame_range[1] > action.frame_range[0]
    )


def action_fcurves(action: bpy.types.Action) -> list[bpy.types.FCurve]:
    if action.is_action_layered:
        return [
            curve
            for layer in action.layers
            for strip in layer.strips
            for slot in action.slots
            if strip.type == "KEYFRAME" and strip.channelbag(slot) is not None
            for curve in strip.channelbag(slot).fcurves
        ]
    return list(action.fcurves)


def action_fingerprints() -> list[dict[str, object]]:
    """Fingerprint every action's tracks and quantized keyframe trajectory."""
    fingerprints: list[dict[str, object]] = []
    for action in sorted(bpy.data.actions, key=lambda item: item.name):
        if action.frame_range[1] <= action.frame_range[0]:
            continue
        tracks: list[dict[str, object]] = []
        for curve in sorted(
            action_fcurves(action),
            key=lambda item: (item.data_path, item.array_index),
        ):
            keys = [
                [round(float(point.co[0]), 7), round(float(point.co[1]), 7)]
                for point in curve.keyframe_points
            ]
            tracks.append(
                {
                    "dataPath": curve.data_path,
                    "arrayIndex": curve.array_index,
                    "keyframes": keys,
                }
            )
        payload = {
            "name": action.name,
            "frameRange": [
                round(float(action.frame_range[0]), 7),
                round(float(action.frame_range[1]), 7),
            ],
            "trackCount": len(tracks),
            "keyframeCount": sum(len(track["keyframes"]) for track in tracks),
            "tracks": tracks,
        }
        fingerprint = sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest().upper()
        fingerprints.append(
            {
                "name": payload["name"],
                "frameRange": payload["frameRange"],
                "trackCount": payload["trackCount"],
                "keyframeCount": payload["keyframeCount"],
                "sha256": fingerprint,
                "valueQuantizationDecimals": 7,
            }
        )
    return fingerprints


def glb_scene_inventory(path: Path) -> dict[str, object]:
    """Read the GLB JSON chunk so importer-only helpers cannot fake a mesh."""
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise RuntimeError(f"Not a binary glTF file: {path}")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"First GLB chunk is not JSON: {path}")
    document = json.loads(data[20 : 20 + json_length].decode("utf-8"))
    nodes = document.get("nodes", [])
    accessors = document.get("accessors", [])
    animations: list[dict[str, object]] = []
    for animation in document.get("animations", []):
        samplers = animation.get("samplers", [])
        channels = animation.get("channels", [])
        structure = {
            "name": animation.get("name"),
            "channelCount": len(channels),
            "samplerCount": len(samplers),
            "inputSampleCount": sum(
                int(accessors[sampler["input"]].get("count", 0))
                for sampler in samplers
            ),
            "outputSampleCount": sum(
                int(accessors[sampler["output"]].get("count", 0))
                for sampler in samplers
            ),
            "channels": sorted(
                (
                    {
                        "node": channel.get("target", {}).get("node"),
                        "path": channel.get("target", {}).get("path"),
                        "sampler": channel.get("sampler"),
                    }
                    for channel in channels
                ),
                key=lambda item: (
                    -1 if item["node"] is None else item["node"],
                    "" if item["path"] is None else item["path"],
                    -1 if item["sampler"] is None else item["sampler"],
                ),
            ),
            "samplers": [
                {
                    "interpolation": sampler.get("interpolation", "LINEAR"),
                    "inputCount": int(
                        accessors[sampler["input"]].get("count", 0)
                    ),
                    "outputCount": int(
                        accessors[sampler["output"]].get("count", 0)
                    ),
                }
                for sampler in samplers
            ],
        }
        structure["structureSha256"] = sha256(
            json.dumps(structure, sort_keys=True, separators=(",", ":")).encode(
                "utf-8"
            )
        ).hexdigest().upper()
        animations.append(structure)
    return {
        "nodeCount": len(nodes),
        "meshCount": len(document.get("meshes", [])),
        "cameraCount": len(document.get("cameras", [])),
        "lightCount": len(
            document.get("extensions", {})
            .get("KHR_lights_punctual", {})
            .get("lights", [])
        ),
        "animationCount": len(document.get("animations", [])),
        "animations": animations,
        "meshNodeNames": [node.get("name") for node in nodes if "mesh" in node],
    }


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)

    source_scene = glb_scene_inventory(args.input)
    source_is_motion_only = (
        source_scene["meshCount"] == 0
        and source_scene["cameraCount"] == 0
        and source_scene["lightCount"] == 0
    )
    if not source_is_motion_only:
        raise RuntimeError(
            "The evidence GLB stores scene geometry or cameras/lights; refusing "
            "a lossy Blender re-export. A raw glTF channel-preserving sanitizer "
            "is required for this candidate."
        )

    factory_reset()
    import_glb(args.input)
    armature = choose_canonical_armature()
    source_actions = action_names()
    source_fingerprints = action_fingerprints()
    if not source_actions:
        raise RuntimeError("Evidence candidate has no animation actions")

    # glTF's selection export includes descendants of a selected armature.
    # Delete every evidence-scene object first so a parented proxy mesh cannot
    # cross the motion-only boundary even when it was never explicitly selected.
    for obj in list(bpy.data.objects):
        if obj != armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    attempt_path = args.output.with_name(
        f"{args.output.stem}-reexport-attempt.invalid{args.output.suffix}"
    )
    bpy.ops.export_scene.gltf(
        filepath=str(attempt_path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=False,
        export_frame_step=1,
        export_force_sampling=True,
        export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=True,
        export_optimize_animation_keep_anim_object=True,
        export_bake_animation=True,
        export_anim_slide_to_zero=False,
        export_skins=True,
        export_materials="NONE",
        export_cameras=False,
        export_lights=False,
        export_morph=False,
    )

    # The owner authorized one corrected re-export attempt, but the raw source
    # is already motion-only. Keep the attempt as invalid evidence unless it is
    # byte-identical; no size reduction or Blender resampling may replace the
    # canonical animation bytes.
    factory_reset()
    import_glb(attempt_path)
    attempt_scene = glb_scene_inventory(attempt_path)
    choose_canonical_armature()
    attempt_actions = action_names()
    attempt_fingerprints = action_fingerprints()
    attempt_structural_exact = attempt_scene["animations"] == source_scene["animations"]
    attempt_fingerprints_exact = attempt_fingerprints == source_fingerprints
    attempt_byte_identical = file_sha256(attempt_path) == file_sha256(args.input)

    previous_invalid: dict[str, object] | None = None
    if args.output.exists() and file_sha256(args.output) != file_sha256(args.input):
        previous_path = args.output.with_name(
            f"{args.output.stem}-previous.invalid{args.output.suffix}"
        )
        if not previous_path.exists():
            shutil.copy2(args.output, previous_path)
        previous_invalid = {
            "path": str(previous_path.resolve()),
            "sha256": file_sha256(previous_path),
            "status": "INVALID_REJECTED_RESAMPLED_EXPORT",
        }

    shutil.copy2(args.input, args.output)
    if file_sha256(args.output) != file_sha256(args.input):
        raise RuntimeError("Byte-identical canonical motion copy failed")

    factory_reset()
    import_glb(args.output)
    raw_scene = glb_scene_inventory(args.output)
    raw_imported = sorted(
        ({"name": obj.name, "type": obj.type} for obj in bpy.data.objects),
        key=lambda item: (item["type"], item["name"]),
    )
    imported_armature = choose_canonical_armature()
    # Blender materializes an Icosphere custom-shape helper when it imports a
    # meshless armature GLB. It is not a GLB scene node. Prove that distinction
    # from the binary inventory, then remove only those importer-created helper
    # objects before asserting the normalized fresh-import object set.
    importer_helpers: list[dict[str, str]] = []
    if raw_scene["meshCount"] == 0:
        custom_shapes = {
            bone.custom_shape
            for bone in imported_armature.pose.bones
            if bone.custom_shape is not None
        }
        for obj in list(bpy.data.objects):
            if obj.type == "MESH" and obj in custom_shapes:
                importer_helpers.append({"name": obj.name, "type": obj.type})
                bpy.data.objects.remove(obj, do_unlink=True)
    imported = sorted(
        ({"name": obj.name, "type": obj.type} for obj in bpy.data.objects),
        key=lambda item: (item["type"], item["name"]),
    )
    imported_armature = choose_canonical_armature()
    imported_actions = action_names()
    imported_fingerprints = action_fingerprints()
    types = sorted({item["type"] for item in imported})
    only_armature = len(imported) == 1 and types == ["ARMATURE"]
    actions_preserved = imported_actions == source_actions
    fingerprints_preserved = imported_fingerprints == source_fingerprints
    raw_animation_structure_preserved = raw_scene["animations"] == source_scene["animations"]
    byte_identical = file_sha256(args.output) == file_sha256(args.input)
    zero_mesh_camera_light = (
        raw_scene["meshCount"] == 0
        and raw_scene["cameraCount"] == 0
        and raw_scene["lightCount"] == 0
        and not any(
            item["type"] in {"MESH", "CAMERA", "LIGHT"}
            for item in imported
        )
    )
    passed = (
        only_armature
        and actions_preserved
        and fingerprints_preserved
        and raw_animation_structure_preserved
        and byte_identical
        and zero_mesh_camera_light
    )
    report = {
        "schemaVersion": 2,
        "status": "RUNTIME_COPY_VERIFIED_QUARANTINED",
        "promotion": {"status": "QUARANTINED", "runtimeInstalled": False},
        "sanitizationMode": "BYTE_IDENTICAL_CANONICAL_MOTION_COPY",
        "sourceEvidence": {
            "path": str(args.input.resolve()),
            "sha256": file_sha256(args.input),
            "bytes": args.input.stat().st_size,
            "rawGlbScene": source_scene,
        },
        "correctedReexportAttempt": {
            "path": str(attempt_path.resolve()),
            "sha256": file_sha256(attempt_path),
            "bytes": attempt_path.stat().st_size,
            "status": (
                "EXACT_BUT_NOT_SELECTED"
                if attempt_byte_identical
                else "INVALID_REJECTED_RESAMPLED_EXPORT"
            ),
            "rawAnimationStructureExact": attempt_structural_exact,
            "actionTrackKeyframeFingerprintsExact": attempt_fingerprints_exact,
            "byteIdentical": attempt_byte_identical,
            "sourceActionFingerprints": source_fingerprints,
            "attemptActionFingerprints": attempt_fingerprints,
            "sourceActionNames": source_actions,
            "attemptActionNames": attempt_actions,
            "rawGlbScene": attempt_scene,
        },
        "previousInvalidOutput": previous_invalid,
        "runtimeReady": {
            "path": str(args.output.resolve()),
            "sha256": file_sha256(args.output),
            "bytes": args.output.stat().st_size,
            "byteIdenticalToSource": byte_identical,
        },
        "strictTrajectoryEquivalence": {
            "passed": byte_identical,
            "proof": "BYTE_IDENTICAL_SHA256",
            "maximumTimeDeltaSeconds": 0.0,
            "maximumTranslationDeltaMeters": 0.0,
            "maximumScaleDelta": 0.0,
            "maximumQuaternionComponentDelta": 0.0,
            "maximumQuaternionAngularErrorDegrees": 0.0,
            "tolerances": {
                "timeSeconds": 0.0000001,
                "translationMeters": 0.000001,
                "scale": 0.000001,
                "quaternionComponent": 0.000001,
                "quaternionAngularDegrees": 0.001,
            },
        },
        "freshImport": {
            "passed": passed,
            "rawGlbScene": raw_scene,
            "rawBlenderObjects": raw_imported,
            "removedImporterGeneratedHelpers": importer_helpers,
            "objects": imported,
            "objectTypes": types,
            "onlyArmature": only_armature,
            "zeroMeshCameraLight": zero_mesh_camera_light,
            "armatureCount": sum(
                1 for item in imported if item["type"] == "ARMATURE"
            ),
            "boneCount": len(imported_armature.data.bones),
            "rootBones": [
                bone.name
                for bone in imported_armature.data.bones
                if bone.parent is None
            ],
            "sourceActionNames": source_actions,
            "importedActionNames": imported_actions,
            "actionsPreserved": actions_preserved,
            "sourceActionFingerprints": source_fingerprints,
            "importedActionFingerprints": imported_fingerprints,
            "actionFingerprintsPreserved": fingerprints_preserved,
            "rawAnimationStructurePreserved": raw_animation_structure_preserved,
        },
    }
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not passed:
        raise RuntimeError(f"Motion-only fresh-import gate failed: {report}")
    print(
        "ISSUE_487_MOTION_ONLY="
        + json.dumps(
            {
                "path": str(args.output),
                "sha256": report["runtimeReady"]["sha256"],
                "actions": imported_actions,
                "freshImportObjects": imported,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
