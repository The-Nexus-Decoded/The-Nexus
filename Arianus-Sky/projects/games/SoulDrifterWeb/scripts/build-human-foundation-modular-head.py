"""Extract a modular head from the accepted #487 Quad Smart Mesh body.

Tripo Studio does not segment Quad models.  This deterministic Blender route
bisects the exact accepted body at a rest-rig-derived neck plane, preserving
the source armature, skin weights, UVs, material slots, scale, axes, and
origin.  It emits a body-without-head plus the matching base head in one GLB.

Run with the cached Blender receipt:

    blender --background --factory-startup --python \
      scripts/build-human-foundation-modular-head.py
"""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Vector


EXPECTED_SOURCE_SHA256 = (
    "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81"
)
ROOT_BONE = "mixamorig:Hips"
NECK_BONE = "mixamorig:Neck"
HEAD_BONE = "mixamorig:Head"
SEAM_VERSION = "human-masculine-athletic-neck-v1"
SEAM_TOLERANCE = 0.00001


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-glb",
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
            / "human-foundation-pilot-modular-head-base.glb"
        ),
    )
    parser.add_argument(
        "--report",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-head-base.provenance.json"
        ),
    )
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def imported_objects(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def sole_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    matches = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one armature, got {[obj.name for obj in matches]}")
    return matches[0]


def skinned_meshes(
    objects: list[bpy.types.Object], armature: bpy.types.Object
) -> list[bpy.types.Object]:
    return [
        obj
        for obj in objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        )
    ]


def duplicate_mesh(source: bpy.types.Object, name: str) -> bpy.types.Object:
    duplicate = source.copy()
    duplicate.data = source.data.copy()
    duplicate.name = name
    duplicate.data.name = f"{name}Mesh"
    bpy.context.collection.objects.link(duplicate)
    return duplicate


def bisect_mesh(
    obj: bpy.types.Object, seam_y: float, keep_upper: bool
) -> dict[str, object]:
    editable = bmesh.new()
    editable.from_mesh(obj.data)
    geometry = list(editable.verts) + list(editable.edges) + list(editable.faces)
    bmesh.ops.bisect_plane(
        editable,
        geom=geometry,
        plane_co=Vector((0.0, seam_y, 0.0)),
        plane_no=Vector((0.0, 1.0, 0.0)),
        dist=SEAM_TOLERANCE,
        clear_inner=keep_upper,
        clear_outer=not keep_upper,
    )
    bmesh.ops.remove_doubles(
        editable,
        verts=list(editable.verts),
        dist=0.0000001,
    )
    editable.to_mesh(obj.data)
    editable.free()
    obj.data.validate(clean_customdata=False)
    obj.data.update()

    y_values = [vertex.co.y for vertex in obj.data.vertices]
    seam_vertices = [
        vertex.co.copy()
        for vertex in obj.data.vertices
        if abs(vertex.co.y - seam_y) <= SEAM_TOLERANCE * 2.0
    ]
    if len(seam_vertices) < 8:
        raise RuntimeError(f"{obj.name} produced only {len(seam_vertices)} seam vertices")
    if keep_upper and min(y_values) < seam_y - SEAM_TOLERANCE * 4.0:
        raise RuntimeError(f"{obj.name} retained geometry below the seam")
    if not keep_upper and max(y_values) > seam_y + SEAM_TOLERANCE * 4.0:
        raise RuntimeError(f"{obj.name} retained geometry above the seam")
    return {
        "vertices": len(obj.data.vertices),
        "polygons": len(obj.data.polygons),
        "minimumY": round(min(y_values), 8),
        "maximumY": round(max(y_values), 8),
        "seamVertexCount": len(seam_vertices),
        "seamVertices": seam_vertices,
    }


def seam_signature(points: list[Vector]) -> Counter[tuple[float, float, float]]:
    return Counter(
        (round(point.x, 6), round(point.y, 6), round(point.z, 6)) for point in points
    )


def export_modular_glb(
    output: Path,
    armature: bpy.types.Object,
    body: bpy.types.Object,
    head: bpy.types.Object,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (armature, body, head):
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


def fresh_import_validation(
    output: Path,
    seam_y: float,
    source_materials: list[str],
    source_uv_layers: list[str],
) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objects = imported_objects(output)
    armature = sole_armature(objects)
    meshes = skinned_meshes(objects, armature)
    by_name = {obj.name: obj for obj in meshes}
    expected = {"HumanFoundation_BodyNoHead", "HumanFoundation_HeadBase"}
    if set(by_name) != expected:
        raise RuntimeError(f"Fresh import meshes differ: {sorted(by_name)}")
    helper_meshes = sorted(
        obj.name for obj in objects if obj.type == "MESH" and obj not in meshes
    )
    unexpected_helpers = [name for name in helper_meshes if name != "Icosphere"]
    if unexpected_helpers:
        raise RuntimeError(
            f"Modular head import created unexpected helper meshes: {unexpected_helpers}"
        )
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != 65 or roots != [ROOT_BONE]:
        raise RuntimeError(
            f"Rig changed: {len(armature.data.bones)} bones, roots {roots}"
        )
    if bpy.data.actions:
        raise RuntimeError(f"Modular base contains actions: {[a.name for a in bpy.data.actions]}")

    mesh_report: dict[str, object] = {}
    signatures: dict[str, Counter[tuple[float, float, float]]] = {}
    for name, obj in by_name.items():
        materials = [material.name for material in obj.data.materials if material]
        uv_layers = [layer.name for layer in obj.data.uv_layers]
        if materials != source_materials or uv_layers != source_uv_layers:
            raise RuntimeError(
                f"{name} changed materials/UVs: {materials}/{uv_layers}"
            )
        points = [
            vertex.co.copy()
            for vertex in obj.data.vertices
            if abs(vertex.co.y - seam_y) <= SEAM_TOLERANCE * 2.0
        ]
        signatures[name] = seam_signature(points)
        mesh_report[name] = {
            "vertices": len(obj.data.vertices),
            "polygons": len(obj.data.polygons),
            "materials": materials,
            "uvLayers": uv_layers,
            "seamVertexCount": len(points),
        }
    if signatures["HumanFoundation_BodyNoHead"] != signatures["HumanFoundation_HeadBase"]:
        raise RuntimeError("Fresh-import body/head seam signatures do not match")
    return {
        "boneCount": len(armature.data.bones),
        "rootBones": roots,
        "embeddedActionCount": len(bpy.data.actions),
        "meshes": mesh_report,
        "ignoredBlenderImporterHelpers": helper_meshes,
        "ignoredHelperReason": (
            "Blender glTF importer creates the Icosphere as an unweighted bone "
            "display helper; it is not an exported runtime primitive."
        ),
        "seamSignaturesMatch": True,
        "status": "PASS",
    }


def build() -> dict[str, object]:
    args = parse_args()
    source = Path(args.source_glb).resolve()
    output = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    source_hash = file_sha256(source)
    if source_hash != EXPECTED_SOURCE_SHA256:
        raise RuntimeError(f"Source SHA differs: {source_hash}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    objects = imported_objects(source)
    armature = sole_armature(objects)
    bodies = skinned_meshes(objects, armature)
    if len(bodies) != 1:
        raise RuntimeError(f"Expected one skinned body, got {[obj.name for obj in bodies]}")
    source_body = bodies[0]
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"Source has {len(armature.data.bones)} bones")
    if [bone.name for bone in armature.data.bones if bone.parent is None] != [ROOT_BONE]:
        raise RuntimeError("Source root-bone contract changed")
    if bpy.data.actions:
        raise RuntimeError("Source rest rig unexpectedly contains actions")

    neck = armature.data.bones[NECK_BONE]
    head = armature.data.bones[HEAD_BONE]
    seam_y = (neck.head_local.y + head.head_local.y) * 0.5
    materials = [material.name for material in source_body.data.materials if material]
    uv_layers = [layer.name for layer in source_body.data.uv_layers]

    body = duplicate_mesh(source_body, "HumanFoundation_BodyNoHead")
    modular_head = duplicate_mesh(source_body, "HumanFoundation_HeadBase")
    body_stats = bisect_mesh(body, seam_y, keep_upper=False)
    head_stats = bisect_mesh(modular_head, seam_y, keep_upper=True)
    if seam_signature(body_stats.pop("seamVertices")) != seam_signature(
        head_stats.pop("seamVertices")
    ):
        raise RuntimeError("Generated body/head seam signatures do not match")

    body["souldrifterAppearanceSlot"] = "body"
    modular_head["souldrifterAppearanceSlot"] = "head"
    modular_head["souldrifterHeadSeamVersion"] = SEAM_VERSION
    modular_head["souldrifterFacialTopologyStatus"] = "FOUNDATION_PENDING_MORPHS"
    for pose_bone in armature.pose.bones:
        pose_bone.custom_shape = None
    for obj in list(objects):
        if (
            obj != source_body
            and obj.type == "MESH"
            and obj.name in bpy.data.objects
        ):
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.objects.remove(source_body, do_unlink=True)

    export_modular_glb(output, armature, body, modular_head)
    validation = fresh_import_validation(output, seam_y, materials, uv_layers)
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "status": "HEAD_FOUNDATION_EXTRACTED",
        "ownerReviewStatus": "OWNER_QA_PENDING",
        "route": "BLENDER_QUAD_EXACT_BODY_BISECT",
        "providerConstraint": "Tripo Studio reports Quad models do not support segmentation.",
        "source": {
            "path": str(source).replace("\\", "/"),
            "sha256": source_hash,
            "taskId": "4a5ad734-7dcc-4184-a0c0-ccfc8a79f15f",
        },
        "seam": {
            "version": SEAM_VERSION,
            "axis": "source mesh local +Y",
            "position": round(seam_y, 8),
            "derivation": "midpoint(mixamorig:Neck.head_local.y, mixamorig:Head.head_local.y)",
            "bodyAndHeadSignaturesMatch": True,
        },
        "sourceContract": {
            "boneCount": 65,
            "rootBone": ROOT_BONE,
            "materials": materials,
            "uvLayers": uv_layers,
        },
        "generated": {"body": body_stats, "head": head_stats},
        "output": {
            "path": str(output).replace("\\", "/"),
            "bytes": output.stat().st_size,
            "sha256": file_sha256(output),
        },
        "validation": validation,
        "nextGate": "Author and visually validate facial topology, mouth interior, blink, visemes, and expression morphs on HumanFoundation_HeadBase.",
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_MODULAR_HEAD=" + json.dumps(report, sort_keys=True))
    return report


if __name__ == "__main__":
    build()
