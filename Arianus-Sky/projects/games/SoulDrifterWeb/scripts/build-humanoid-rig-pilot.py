"""Create a local, non-shipping humanoid skinning and animation proof.

The input must be the reviewed local topology pilot, identified by SHA-256.
This script creates a deterministic canonical-name armature, procedural skin
weights, a short deformation action, two visual proof renders, and an audit
report. It is a rig feasibility gate, not runtime promotion.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--rest-preview", required=True, type=Path)
    parser.add_argument("--pose-preview", required=True, type=Path)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--expected-source-sha256", required=True)
    parser.add_argument("--preview-resolution", type=int, default=1024)
    return parser.parse_args(sys.argv[separator + 1 :])


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def mesh_objects() -> list[bpy.types.Object]:
    return [item for item in bpy.context.scene.objects if item.type == "MESH"]


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [item.matrix_world @ Vector(corner) for item in meshes for corner in item.bound_box]
    return (
        Vector(tuple(min(point[index] for point in corners) for index in range(3))),
        Vector(tuple(max(point[index] for point in corners) for index in range(3))),
    )


def create_armature(height: float) -> bpy.types.Object:
    lateral = height * 0.064
    z = lambda ratio: height * ratio
    specs = {
        "root": ((0, 0, 0), (0, 0, z(0.05)), None, False),
        "pelvis": ((0, 0, z(0.47)), (0, 0, z(0.55)), "root", True),
        "spine.lower": ((0, 0, z(0.55)), (0, 0, z(0.66)), "pelvis", True),
        "spine.upper": ((0, 0, z(0.66)), (0, 0, z(0.78)), "spine.lower", True),
        "neck": ((0, 0, z(0.78)), (0, 0, z(0.85)), "spine.upper", True),
        "head": ((0, 0, z(0.85)), (0, 0, z(0.98)), "neck", True),
    }
    for side, direction in (("L", 1), ("R", -1)):
        hip_y = lateral * direction
        specs.update(
            {
                f"thigh.{side}": ((0, hip_y, z(0.50)), (0, hip_y, z(0.29)), "pelvis", True),
                f"shin.{side}": ((0, hip_y, z(0.29)), (0, hip_y, z(0.07)), f"thigh.{side}", True),
                f"foot.{side}": ((0, hip_y, z(0.07)), (z(0.10), hip_y, z(0.025)), f"shin.{side}", True),
                f"clavicle.{side}": (
                    (0, 0, z(0.76)),
                    (0, z(0.13) * direction, z(0.78)),
                    "spine.upper",
                    True,
                ),
                f"upper_arm.{side}": (
                    (0, z(0.13) * direction, z(0.78)),
                    (0, z(0.31) * direction, z(0.76)),
                    f"clavicle.{side}",
                    True,
                ),
                f"forearm.{side}": (
                    (0, z(0.31) * direction, z(0.76)),
                    (0, z(0.43) * direction, z(0.755)),
                    f"upper_arm.{side}",
                    True,
                ),
                f"hand.{side}": (
                    (0, z(0.43) * direction, z(0.755)),
                    (0, z(0.50) * direction, z(0.755)),
                    f"forearm.{side}",
                    True,
                ),
            }
        )

    armature_data = bpy.data.armatures.new("SD_CanonicalHumanoidRig")
    rig = bpy.data.objects.new("SD_CanonicalHumanoidRig", armature_data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent, deform) in specs.items():
        bone = armature_data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_deform = deform
        if parent:
            bone.parent = armature_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    rig.show_in_front = True
    rig["souldrifterLineage"] = "local-derived"
    rig["runtimePromotionAllowed"] = False
    rig["technicalizationStatus"] = "local-skinning-animation-proof"
    return rig


def blend_pair(value: float, boundary: float, width: float, low: str, high: str) -> dict[str, float]:
    start = boundary - width / 2
    factor = max(0.0, min(1.0, (value - start) / width))
    return {low: 1.0 - factor, high: factor}


def vertex_weights(point: Vector, height: float) -> dict[str, float]:
    z = point.z / height
    lateral = point.y / height
    side = "L" if lateral >= 0 else "R"
    reach = abs(lateral)

    if z >= 0.68 and reach >= 0.105:
        if reach < 0.15:
            return blend_pair(reach, 0.13, 0.05, "spine.upper", f"clavicle.{side}")
        if reach < 0.34:
            return blend_pair(reach, 0.27, 0.06, f"clavicle.{side}", f"upper_arm.{side}")
        if reach < 0.45:
            return blend_pair(reach, 0.40, 0.05, f"upper_arm.{side}", f"forearm.{side}")
        return blend_pair(reach, 0.47, 0.05, f"forearm.{side}", f"hand.{side}")

    if z < 0.54:
        if z < 0.09:
            return blend_pair(z, 0.07, 0.04, f"foot.{side}", f"shin.{side}")
        if z < 0.33:
            return blend_pair(z, 0.29, 0.06, f"shin.{side}", f"thigh.{side}")
        weights = blend_pair(z, 0.50, 0.08, f"thigh.{side}", "pelvis")
        if abs(lateral) < 0.035:
            weights[f"thigh.{'R' if side == 'L' else 'L'}"] = 0.12
        return weights

    if z < 0.61:
        return blend_pair(z, 0.57, 0.08, "pelvis", "spine.lower")
    if z < 0.72:
        return blend_pair(z, 0.66, 0.08, "spine.lower", "spine.upper")
    if z < 0.82:
        return blend_pair(z, 0.78, 0.06, "spine.upper", "neck")
    return blend_pair(z, 0.85, 0.06, "neck", "head")


def add_skin(meshes: list[bpy.types.Object], rig: bpy.types.Object, height: float) -> dict[str, object]:
    assignments: dict[str, int] = {}
    weighted_vertices = 0
    maximum_influences = 0
    deform_names = [bone.name for bone in rig.data.bones if bone.use_deform]
    for item in meshes:
        groups = {name: item.vertex_groups.new(name=name) for name in deform_names}
        for vertex in item.data.vertices:
            point = item.matrix_world @ vertex.co
            weights = {name: value for name, value in vertex_weights(point, height).items() if value > 0.001}
            total = sum(weights.values())
            if total <= 0:
                continue
            weighted_vertices += 1
            maximum_influences = max(maximum_influences, len(weights))
            for name, value in weights.items():
                groups[name].add([vertex.index], value / total, "REPLACE")
                assignments[name] = assignments.get(name, 0) + 1
        modifier = item.modifiers.new(name="SD_CanonicalHumanoidSkin", type="ARMATURE")
        modifier.object = rig
        item.parent = rig
        item["runtimePromotionAllowed"] = False
        item["technicalizationStatus"] = "local-skinning-animation-proof"
    total_vertices = sum(len(item.data.vertices) for item in meshes)
    return {
        "assignments": dict(sorted(assignments.items())),
        "weightedVertices": weighted_vertices,
        "unweightedVertices": total_vertices - weighted_vertices,
        "maximumInfluences": maximum_influences,
    }


def add_proof_action(rig: bpy.types.Object) -> None:
    rig.animation_data_create()
    action = bpy.data.actions.new("Humanoid_DeformationProof")
    rig.animation_data.action = action
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40
    animated = {
        "upper_arm.L": ("X", math.radians(18)),
        "upper_arm.R": ("X", math.radians(-18)),
        "forearm.L": ("X", math.radians(42)),
        "forearm.R": ("X", math.radians(-42)),
        "head": ("Z", math.radians(8)),
        "thigh.L": ("Y", math.radians(-8)),
        "shin.L": ("Y", math.radians(15)),
    }
    for name in animated:
        bone = rig.pose.bones[name]
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.keyframe_insert("rotation_euler", frame=1, group=name)
    for name, (axis, value) in animated.items():
        bone = rig.pose.bones[name]
        bone.rotation_euler["XYZ".index(axis)] = value
        bone.keyframe_insert("rotation_euler", frame=20, group=name)
        bone.rotation_euler = (0, 0, 0)
        bone.keyframe_insert("rotation_euler", frame=40, group=name)


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def setup_preview(meshes: list[bpy.types.Object], resolution: int) -> None:
    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum
    target = Vector((0, 0, minimum.z + dimensions.z * 0.52))
    distance = max(dimensions.z * 1.7, 2.8)
    camera_data = bpy.data.cameras.new("ProofCamera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("ProofCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (distance * 0.82, -distance * 0.58, target.z + dimensions.z * 0.08)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    add_area_light("ProofKey", (-distance * 0.7, -distance * 0.75, dimensions.z * 1.15), 1700, 2.2)
    add_area_light("ProofFill", (distance * 0.8, -distance * 0.2, dimensions.z * 0.8), 900, 2.2)
    add_area_light("ProofRim", (0, distance * 0.8, dimensions.z * 1.3), 1300, 1.8)
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    floor = bpy.context.object
    material = bpy.data.materials.new("ProofFloor")
    material.diffuse_color = (0.045, 0.055, 0.07, 1)
    floor.data.materials.append(material)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("ProofWorld")
    scene.world.color = (0.018, 0.022, 0.03)


def render_frame(frame: int, output: Path) -> None:
    bpy.context.scene.frame_set(frame)
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output = args.output.resolve()
    audit = args.audit.resolve()
    rest_preview = args.rest_preview.resolve()
    pose_preview = args.pose_preview.resolve()
    for path in (output, audit, rest_preview, pose_preview):
        path.parent.mkdir(parents=True, exist_ok=True)
    source_hash = file_sha256(source)
    if source_hash != args.expected_source_sha256.upper():
        raise RuntimeError(f"Source hash mismatch: expected {args.expected_source_sha256}, got {source_hash}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = mesh_objects()
    if not meshes:
        raise RuntimeError("Source imported without mesh objects")
    minimum, maximum = world_bounds(meshes)
    height = maximum.z - minimum.z
    rig = create_armature(height)
    weighting = add_skin(meshes, rig, height)
    add_proof_action(rig)
    setup_preview(meshes, args.preview_resolution)
    render_frame(1, rest_preview)
    render_frame(20, pose_preview)

    bpy.ops.object.select_all(action="DESELECT")
    for item in [*meshes, rig]:
        item.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.context.scene.frame_set(1)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )
    for item in meshes:
        item.data.calc_loop_triangles()
    report = {
        "schemaVersion": 1,
        "assetId": args.asset_id,
        "lineageKind": "local-derived",
        "status": "non-shipping-skinning-animation-proof",
        "parentSource": {
            "sourceKind": "local-derived",
            "assetId": "body-human-masculine-heavy-local-retopo-pilot-v001",
            "file": source.name,
            "sha256": source_hash,
            "bytes": source.stat().st_size,
        },
        "localRecipe": {
            "tool": "Blender",
            "toolVersion": bpy.app.version_string,
            "script": "scripts/build-humanoid-rig-pilot.py",
            "gpuAccelerationUsed": True,
            "gpuAccelerationUse": "BLENDER_EEVEE_NEXT proof rendering; procedural weighting is CPU-bound",
            "parameters": {
                "rig": "SD_CanonicalHumanoidRig",
                "deformJoints": 19,
                "weighting": "deterministic-region-blends-with-three-influence-maximum",
                "proofAction": "Humanoid_DeformationProof",
            },
        },
        "output": {
            "file": output.name,
            "sha256": file_sha256(output),
            "bytes": output.stat().st_size,
            "meshObjects": len(meshes),
            "vertices": sum(len(item.data.vertices) for item in meshes),
            "triangles": sum(len(item.data.loop_triangles) for item in meshes),
            "materials": sum(len(item.material_slots) for item in meshes),
            "skins": 1,
            "joints": len(rig.data.bones),
            "animations": ["Humanoid_DeformationProof"],
        },
        "weighting": weighting,
        "proofFrames": {"rest": 1, "pose": 20, "end": 40},
        "runtimePromotionAllowed": False,
        "remainingGates": [
            "owner-deformation-review",
            "deformation-friendly-quad-topology",
            "canonical-head-seam",
            "weight-paint-correction",
            "locomotion-retarget-proof",
            "equipment-clipping-proof",
        ],
    }
    audit.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
