"""Build the temporary #487 Human pilot legacy appearance pack.

The accepted Human foundation GLB is the sole body, material, and 65-bone rig
authority.  Four cleared CC0 Quaternius appearance meshes are extracted from
the legacy Human Shadowknight GLB, conformed from its Head bind space into the
accepted pilot's ``mixamorig:Head`` bind space, and rigidly weighted to that
bone.  No source actions, armor, or weapons are retained.

Run with the cached Blender receipt for issue #487:

    blender --background --factory-startup --python \
      scripts/build-human-foundation-legacy-appearance.py

Optional paths may be supplied after ``--``.  Preview renders are evidence
only and must be written outside the repository.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree


APPEARANCE_NAMES = (
    "SK_Hair_Buzzed",
    "SK_Hair_Parted",
    "SK_Hair_Long",
    "SK_Beard_Full",
)
TARGET_HEAD_BONE = "mixamorig:Head"
SOURCE_HEAD_BONE = "Head"

# Reproduces the already-approved bind-space coverage correction from
# presentation.ts before the meshes are mapped into the new head space.
SOURCE_COVERAGE_FIT = {
    "SK_Hair_Buzzed": {"scale": 1.12, "offset": (0.0, -0.004, -0.004)},
    "SK_Hair_Parted": {"scale": 1.10, "offset": (0.0, -0.004, -0.005)},
}


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-shadowknight/human-shadowknight.glb"
        ),
    )
    parser.add_argument(
        "--pilot-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-runtime-4k.glb"
        ),
    )
    parser.add_argument(
        "--output-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-runtime-4k-legacy-appearance.glb"
        ),
    )
    parser.add_argument(
        "--report",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-runtime-4k-legacy-appearance.provenance.json"
        ),
    )
    parser.add_argument(
        "--preview-dir",
        help="Optional evidence directory outside the repository.",
    )
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def round_vector(value: Vector, digits: int = 8) -> list[float]:
    return [round(component, digits) for component in value]


def bounds(points: list[Vector]) -> tuple[Vector, Vector]:
    if not points:
        raise RuntimeError("Cannot calculate empty coordinate bounds")
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def bounds_payload(points: list[Vector]) -> dict[str, object]:
    minimum, maximum = bounds(points)
    return {
        "minimum": round_vector(minimum),
        "maximum": round_vector(maximum),
        "extent": round_vector(maximum - minimum),
        "center": round_vector((minimum + maximum) * 0.5),
    }


def imported_objects(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def sole_object(
    objects: list[bpy.types.Object], object_type: str, description: str
) -> bpy.types.Object:
    matches = [obj for obj in objects if obj.type == object_type]
    if len(matches) != 1:
        raise RuntimeError(
            f"Expected one {description}, got {[obj.name for obj in matches]}"
        )
    return matches[0]


def head_weighted_points(
    mesh: bpy.types.Object,
    armature: bpy.types.Object,
    bone_name: str,
    minimum_weight: float,
) -> list[Vector]:
    group = mesh.vertex_groups.get(bone_name)
    if group is None:
        raise RuntimeError(f"{mesh.name} has no {bone_name} vertex group")
    bone_world = armature.matrix_world @ armature.data.bones[bone_name].matrix_local
    inverse_head = bone_world.inverted()
    result: list[Vector] = []
    for vertex in mesh.data.vertices:
        weight = next(
            (
                membership.weight
                for membership in vertex.groups
                if membership.group == group.index
            ),
            0.0,
        )
        if weight >= minimum_weight:
            result.append(inverse_head @ (mesh.matrix_world @ vertex.co))
    if len(result) < 100:
        raise RuntimeError(
            f"Only {len(result)} vertices define {mesh.name}'s {bone_name} bounds"
        )
    return result


def recalculate_normals(mesh: bpy.types.Mesh) -> None:
    editable = bmesh.new()
    editable.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(editable, faces=list(editable.faces))
    editable.to_mesh(mesh)
    editable.free()
    mesh.validate(clean_customdata=False)
    mesh.update()


def remove_all_vertex_groups(obj: bpy.types.Object) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)


def conform_piece(
    source: bpy.types.Object,
    source_armature: bpy.types.Object,
    source_head_bounds: tuple[Vector, Vector],
    source_head_object_center: Vector,
    target_armature: bpy.types.Object,
    target_head_bounds: tuple[Vector, Vector],
) -> dict[str, object]:
    source_minimum, source_maximum = source_head_bounds
    target_minimum, target_maximum = target_head_bounds
    source_extent = source_maximum - source_minimum
    target_extent = target_maximum - target_minimum
    if min(source_extent) <= 0.0:
        raise RuntimeError(f"Invalid source head extent: {source_extent}")
    axis_scale = Vector(
        tuple(target_extent[axis] / source_extent[axis] for axis in range(3))
    )
    source_center = (source_minimum + source_maximum) * 0.5
    target_center = (target_minimum + target_maximum) * 0.5
    source_bone_world = (
        source_armature.matrix_world
        @ source_armature.data.bones[SOURCE_HEAD_BONE].matrix_local
    )
    target_bone_world = (
        target_armature.matrix_world
        @ target_armature.data.bones[TARGET_HEAD_BONE].matrix_local
    )
    coverage = SOURCE_COVERAGE_FIT.get(source.name)
    coverage_matrix = Matrix.Identity(4)
    if coverage:
        scale = coverage["scale"]
        offset = Vector(coverage["offset"])
        coverage_matrix = (
            Matrix.Translation(offset)
            @ Matrix.Translation(source_head_object_center)
            @ Matrix.Diagonal((scale, scale, scale, 1.0))
            @ Matrix.Translation(-source_head_object_center)
        )
    head_mapping = (
        Matrix.Translation(target_center)
        @ Matrix.Diagonal((*axis_scale, 1.0))
        @ Matrix.Translation(-source_center)
    )
    source_to_target_armature = (
        target_armature.matrix_world.inverted()
        @ target_bone_world
        @ head_mapping
        @ source_bone_world.inverted()
        @ source.matrix_world
        @ coverage_matrix
    )
    source.data.transform(source_to_target_armature)
    recalculate_normals(source.data)
    source.parent = target_armature
    source.matrix_parent_inverse = Matrix.Identity(4)
    source.matrix_basis = Matrix.Identity(4)
    remove_all_vertex_groups(source)
    group = source.vertex_groups.new(name=TARGET_HEAD_BONE)
    group.add(range(len(source.data.vertices)), 1.0, "REPLACE")
    for modifier in list(source.modifiers):
        source.modifiers.remove(modifier)
    modifier = source.modifiers.new(name="HumanFoundationHeadAttachment", type="ARMATURE")
    modifier.object = target_armature
    source["souldrifterAppearanceSlot"] = (
        "facialHair" if source.name == "SK_Beard_Full" else "hair"
    )
    source["souldrifterRuntimeToggleRequired"] = True
    source["souldrifterTemporaryLegacyReuse"] = True
    return {
        "name": source.name,
        "vertices": len(source.data.vertices),
        "triangles": sum(len(poly.vertices) - 2 for poly in source.data.polygons),
        "materials": [material.name for material in source.data.materials if material],
        "sourceCoverageFit": coverage,
        "headSpaceAxisScale": round_vector(axis_scale),
        "attachmentBone": TARGET_HEAD_BONE,
        "weight": 1.0,
    }


def export_pack(
    output: Path,
    armature: bpy.types.Object,
    body: bpy.types.Object,
    pieces: list[bpy.types.Object],
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [armature, body, *pieces]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
        export_all_influences=False,
        export_influence_nb=4,
        export_extras=True,
    )


def surface_fit_metrics(
    body: bpy.types.Object, pieces: list[bpy.types.Object]
) -> dict[str, object]:
    body_points = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    polygons = [list(polygon.vertices) for polygon in body.data.polygons]
    tree = BVHTree.FromPolygons(body_points, polygons, all_triangles=False)
    result: dict[str, object] = {}
    for piece in pieces:
        signed_distances: list[float] = []
        nearest_distances: list[float] = []
        for vertex in piece.data.vertices:
            point = piece.matrix_world @ vertex.co
            nearest = tree.find_nearest(point)
            if nearest[0] is None:
                raise RuntimeError(f"No body surface result for {piece.name}")
            location, normal, _index, distance = nearest
            nearest_distances.append(distance)
            signed_distances.append((point - location).dot(normal))
        deep_threshold = 0.015
        deep_count = sum(value < -deep_threshold for value in signed_distances)
        deep_ratio = deep_count / len(signed_distances)
        if deep_ratio > 0.02:
            raise RuntimeError(
                f"{piece.name} has {deep_ratio:.2%} of vertices deeper than "
                f"{deep_threshold:.3f} rig units inside the body"
            )
        result[piece.name] = {
            "sampledVertices": len(signed_distances),
            "nearestSurfaceDistanceMinimum": round(min(nearest_distances), 8),
            "nearestSurfaceDistanceMaximum": round(max(nearest_distances), 8),
            "signedDistanceMinimum": round(min(signed_distances), 8),
            "signedDistanceMaximum": round(max(signed_distances), 8),
            "deepPenetrationThreshold": deep_threshold,
            "deepPenetrationVertexCount": deep_count,
            "deepPenetrationRatio": round(deep_ratio, 8),
            "status": "PASS",
        }
    return result


def validate_head_attachment(
    armature: bpy.types.Object, pieces: list[bpy.types.Object]
) -> dict[str, object]:
    rest_bone = armature.data.bones[TARGET_HEAD_BONE]
    pose_bone = armature.pose.bones[TARGET_HEAD_BONE]
    samples = {
        "yaw_positive_20": (0.0, math.radians(20.0), 0.0),
        "pitch_negative_15": (math.radians(-15.0), 0.0, 0.0),
        "roll_positive_12": (0.0, 0.0, math.radians(12.0)),
    }
    result: dict[str, object] = {}
    rest_world = {
        piece.name: piece.matrix_world @ piece.data.vertices[0].co.copy()
        for piece in pieces
    }
    pose_bone.rotation_mode = "QUATERNION"
    for sample_name, angles in samples.items():
        pose_bone.rotation_quaternion = Euler(angles, "XYZ").to_quaternion()
        bpy.context.view_layer.update()
        dependency_graph = bpy.context.evaluated_depsgraph_get()
        sample_errors: dict[str, float] = {}
        sample_displacements: dict[str, float] = {}
        deformation = pose_bone.matrix @ rest_bone.matrix_local.inverted()
        for piece in pieces:
            rest_armature_local = armature.matrix_world.inverted() @ rest_world[piece.name]
            expected = armature.matrix_world @ (deformation @ rest_armature_local)
            evaluated = piece.evaluated_get(dependency_graph)
            evaluated_mesh = evaluated.to_mesh()
            actual = evaluated.matrix_world @ evaluated_mesh.vertices[0].co
            evaluated.to_mesh_clear()
            error = (actual - expected).length
            displacement = (actual - rest_world[piece.name]).length
            sample_errors[piece.name] = round(error, 10)
            sample_displacements[piece.name] = round(displacement, 8)
            if error > 0.00005:
                raise RuntimeError(
                    f"{piece.name} failed {sample_name} head attachment: {error}"
                )
        result[sample_name] = {
            "anglesDegrees": [round(math.degrees(value), 3) for value in angles],
            "maximumAttachmentError": max(sample_errors.values()),
            "perMeshError": sample_errors,
            "perMeshSampleVertexDisplacement": sample_displacements,
            "status": "PASS",
        }
    pose_bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    return result


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_previews(output: Path, preview_dir: Path) -> dict[str, object]:
    preview_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = imported_objects(output)
    armature = sole_object(imported, "ARMATURE", "preview armature")
    meshes = {obj.name: obj for obj in imported if obj.type == "MESH"}
    body = meshes["HumanFoundation_Body"]
    pieces = [meshes[name] for name in APPEARANCE_NAMES]
    head_points = head_weighted_points(body, armature, TARGET_HEAD_BONE, 0.5)
    head_minimum, head_maximum = bounds(head_points)
    head_center_local = (head_minimum + head_maximum) * 0.5
    head_matrix = armature.matrix_world @ armature.data.bones[TARGET_HEAD_BONE].matrix_local
    target = head_matrix @ head_center_local
    head_axes = head_matrix.to_3x3().normalized()
    forward = (head_axes @ Vector((0.0, 0.0, 1.0))).normalized()
    side = (head_axes @ Vector((1.0, 0.0, 0.0))).normalized()
    up = (head_axes @ Vector((0.0, 1.0, 0.0))).normalized()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AppearanceEvidenceWorld")
    scene.world.color = (0.025, 0.035, 0.05)
    scene.view_settings.look = "AgX - Medium High Contrast"

    camera_data = bpy.data.cameras.new("AppearanceEvidenceCamera")
    camera = bpy.data.objects.new("AppearanceEvidenceCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.lens = 68
    scene.camera = camera

    for name, energy, offset in (
        ("Key", 22.0, forward * 0.25 + side * 0.20 + up * 0.22),
        ("Fill", 10.0, forward * 0.12 - side * 0.24 + up * 0.10),
        ("Rim", 16.0, -forward * 0.20 + side * 0.10 + up * 0.28),
    ):
        light_data = bpy.data.lights.new(f"AppearanceEvidence{name}", "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = 0.22
        light = bpy.data.objects.new(light_data.name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = target + offset
        point_camera(light, target)

    evidence: dict[str, object] = {}
    for piece in pieces:
        for candidate in pieces:
            candidate.hide_render = candidate != piece
        per_view: dict[str, object] = {}
        for view_name, view_axis in (("front", forward), ("side", side)):
            camera.location = target + view_axis * 0.30 + up * 0.015
            point_camera(camera, target + up * 0.005)
            preview_path = preview_dir / f"{piece.name}-{view_name}.png"
            scene.render.filepath = str(preview_path)
            bpy.ops.render.render(write_still=True)
            per_view[view_name] = {
                "path": str(preview_path).replace("\\", "/"),
                "bytes": preview_path.stat().st_size,
                "sha256": file_sha256(preview_path),
                "width": scene.render.resolution_x,
                "height": scene.render.resolution_y,
            }
        evidence[piece.name] = per_view
    return evidence


def fresh_import_validation(
    output: Path,
    expected_body_materials: list[str],
) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = imported_objects(output)
    armature = sole_object(imported, "ARMATURE", "fresh-import armature")
    skinned_meshes = [
        obj
        for obj in imported
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        )
    ]
    mesh_by_name = {obj.name: obj for obj in skinned_meshes}
    expected_mesh_names = {"HumanFoundation_Body", *APPEARANCE_NAMES}
    if set(mesh_by_name) != expected_mesh_names:
        raise RuntimeError(
            f"Fresh-import meshes differ: {sorted(mesh_by_name)} != "
            f"{sorted(expected_mesh_names)}"
        )
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"Fresh import has {len(armature.data.bones)} bones")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != ["mixamorig:Hips"]:
        raise RuntimeError(f"Fresh-import roots differ: {roots}")
    if bpy.data.actions:
        raise RuntimeError(
            f"Appearance pack must contain no actions: {[a.name for a in bpy.data.actions]}"
        )
    body = mesh_by_name["HumanFoundation_Body"]
    body_materials = [material.name for material in body.data.materials if material]
    if body_materials != expected_body_materials:
        raise RuntimeError(
            f"Body materials changed: {body_materials} != {expected_body_materials}"
        )
    pieces = [mesh_by_name[name] for name in APPEARANCE_NAMES]
    for piece in pieces:
        group_index = piece.vertex_groups[TARGET_HEAD_BONE].index
        for vertex in piece.data.vertices:
            memberships = [
                membership
                for membership in vertex.groups
                if membership.weight > 0.000001
            ]
            if (
                len(memberships) != 1
                or memberships[0].group != group_index
                or abs(memberships[0].weight - 1.0) > 0.000001
            ):
                raise RuntimeError(f"{piece.name} has a non-rigid head weight")
    head_world = armature.matrix_world @ armature.data.bones[TARGET_HEAD_BONE].matrix_local
    inverse_head = head_world.inverted()
    piece_bounds = {
        piece.name: bounds_payload(
            [inverse_head @ (piece.matrix_world @ v.co) for v in piece.data.vertices]
        )
        for piece in pieces
    }
    return {
        "armature": armature.name,
        "boneCount": len(armature.data.bones),
        "rootBones": roots,
        "meshNames": sorted(mesh_by_name),
        "ignoredImporterHelpers": sorted(
            obj.name
            for obj in imported
            if obj.type == "MESH" and obj not in skinned_meshes
        ),
        "actionCount": len(bpy.data.actions),
        "bodyVertexCount": len(body.data.vertices),
        "bodyPolygonCount": len(body.data.polygons),
        "bodyMaterials": body_materials,
        "appearanceHeadLocalBounds": piece_bounds,
        "surfaceFit": surface_fit_metrics(body, pieces),
        "headRotationAttachment": validate_head_attachment(armature, pieces),
        "status": "PASS",
    }


def build() -> dict[str, object]:
    args = parse_args()
    source_path = Path(args.source_glb).resolve()
    pilot_path = Path(args.pilot_glb).resolve()
    output_path = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    for path in (source_path, pilot_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    pilot_objects = imported_objects(pilot_path)
    target_armature = sole_object(pilot_objects, "ARMATURE", "pilot armature")
    target_meshes = [
        obj
        for obj in pilot_objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == target_armature
            for modifier in obj.modifiers
        )
    ]
    if len(target_meshes) != 1:
        raise RuntimeError(f"Expected one pilot body, got {[o.name for o in target_meshes]}")
    body = target_meshes[0]
    target_armature.name = "HumanFoundation_Armature"
    body.name = "HumanFoundation_Body"
    if len(target_armature.data.bones) != 65:
        raise RuntimeError(
            f"Accepted pilot authority has {len(target_armature.data.bones)} bones"
        )
    if bpy.data.actions:
        raise RuntimeError("Accepted zero-action pilot unexpectedly imported actions")
    body_materials = [material.name for material in body.data.materials if material]
    target_head_points = head_weighted_points(
        body, target_armature, TARGET_HEAD_BONE, 0.5
    )
    target_head_bounds = bounds(target_head_points)

    source_objects = imported_objects(source_path)
    source_armature = sole_object(source_objects, "ARMATURE", "legacy armature")
    source_by_name = {obj.name: obj for obj in source_objects}
    missing = [name for name in (*APPEARANCE_NAMES, "SK_HumanHead") if name not in source_by_name]
    if missing:
        raise RuntimeError(f"Legacy source is missing {missing}")
    source_head = source_by_name["SK_HumanHead"]
    source_head_points = head_weighted_points(
        source_head, source_armature, SOURCE_HEAD_BONE, 0.5
    )
    source_head_bounds = bounds(source_head_points)
    source_head_object_bounds = bounds([v.co.copy() for v in source_head.data.vertices])
    source_head_object_center = sum(source_head_object_bounds, Vector()) * 0.5
    pieces = [source_by_name[name] for name in APPEARANCE_NAMES]
    piece_reports = [
        conform_piece(
            piece,
            source_armature,
            source_head_bounds,
            source_head_object_center,
            target_armature,
            target_head_bounds,
        )
        for piece in pieces
    ]
    for obj in source_objects:
        if obj not in pieces and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    if target_armature.animation_data is not None:
        target_armature.animation_data_clear()
    target_armature.data.pose_position = "POSE"
    export_pack(output_path, target_armature, body, pieces)

    validation = fresh_import_validation(output_path, body_materials)
    preview_evidence = None
    if args.preview_dir:
        preview_dir = Path(args.preview_dir).resolve()
        game_root = Path(__file__).resolve().parent.parent
        if preview_dir == game_root or game_root in preview_dir.parents:
            raise RuntimeError("Preview evidence must stay outside the repository")
        preview_evidence = render_previews(output_path, preview_dir)
    blender_version = bpy.app.version_string
    blender_build_hash = bpy.app.build_hash.decode("utf-8")
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "status": "PROVISIONAL_PILOT",
        "ownerReviewStatus": "OWNER_QA_PENDING",
        "provenance": {
            "pilotRigBodyAuthority": str(pilot_path).replace("\\", "/"),
            "pilotRigBodySha256": file_sha256(pilot_path),
            "legacyAppearanceSource": str(source_path).replace("\\", "/"),
            "legacyAppearanceSourceSha256": file_sha256(source_path),
            "legacySourceLicense": "CC0-1.0",
            "legacySourcePublisher": "Quaternius",
            "route": "EXISTING_REPO_INVENTORY_REUSE",
            "paidProviderOperation": False,
        },
        "toolchain": {
            "application": "Blender",
            "version": blender_version,
            "buildHash": blender_build_hash,
            "cachedReceiptUsed": True,
        },
        "output": {
            "path": str(output_path).replace("\\", "/"),
            "bytes": output_path.stat().st_size,
            "sha256": file_sha256(output_path),
            "embeddedActionCount": 0,
        },
        "conform": {
            "method": "SOURCE_HEAD_BIND_BOUNDS_TO_PILOT_HEAD_BIND_BOUNDS_AFFINE",
            "sourceHeadLocalBounds": bounds_payload(source_head_points),
            "targetHeadLocalBounds": bounds_payload(target_head_points),
            "pieces": piece_reports,
        },
        "validation": validation,
        "bodyRigIntegrity": {
            "bodyGeometryModifiedByBuilder": False,
            "bodyMaterialModifiedByBuilder": False,
            "armatureRestRigModifiedByBuilder": False,
            "embeddedActionsAdded": False,
            "onlyAddedMeshNames": list(APPEARANCE_NAMES),
            "status": "PASS",
        },
        "previewEvidence": preview_evidence,
        "limitations": [
            "Temporary reuse fit, not final bespoke Human pilot hair topology.",
            "Owner evidence review found Buzzed helmet-like and Long affected by crown gaps and face obstruction; Parted and Beard are usable only as provisional pilot pieces.",
            "All four appearance meshes are rigidly weighted to the head bone; long hair and beard have no secondary-motion bones or simulation.",
            "Legacy hair materials are preserved and are not final 8K strand/card PBR assets.",
            "Runtime must toggle the separate existing mesh names; this script does not edit TypeScript or install UI behavior.",
            "Fresh-import technical checks passed, but owner visual QA and BREACH-V2 runtime integration remain separate gates.",
        ],
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_FOUNDATION_LEGACY_APPEARANCE=" + json.dumps(report, sort_keys=True))
    return report


if __name__ == "__main__":
    build()
