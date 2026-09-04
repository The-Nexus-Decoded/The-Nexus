"""Author the issue #487 generic grounded get-up from the accepted knockdown boundary.

The accepted Spell Impact terminal pose is matched only as the required start
boundary. The standing first pose of that same accepted action is matched only
as the required gameplay-stance end boundary, translated to the landed root
position. Every interior frame is newly solved from reference-driven body
mechanics; no source motion is sampled, reversed, spliced, or relabeled.
"""

from __future__ import annotations

from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


SCRIPT_PATH = Path(__file__).resolve()
HELPER_PATH = SCRIPT_PATH.with_name("build-human-authored-traversal-survival.py")
REFERENCE_PACKET = "docs/HUMAN_AUTHORED_GET_UP_REFERENCE_PACKET.md"
SPELL_ASSET = (
    "public/assets/3d/animations/human-foundation-pilot/"
    "human-foundation-pilot-authored-spell-impact-knockback-fall.glb"
)
CLIP_NAME = "AuthoredRecovery__GroundedGetUp"
SEMANTIC_ROWS = (
    "reaction.spell.get-up",
    "locomotion.knockdown.get-up",
)
FRAMES = 111
JOINT_CONTINUITY_LIMIT_RADIANS = 0.16
CONTACT_CHAIN_BONES = {
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:LeftHand",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:RightHand",
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
}
_previous_authored_matrices: dict[str, Matrix] | None = None


def load_helper():
    spec = importlib.util.spec_from_file_location(
        "issue487_authored_traversal_helper", HELPER_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load authored traversal helper: {HELPER_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


helper = load_helper()
original_key_matrices = helper.key_matrices


def weighted_skinned_meshes_for(
    armature: bpy.types.Object,
) -> list[bpy.types.Object]:
    """Return only visible meshes deformed by the canonical Human skeleton.

    The accepted runtime GLB also contains an unweighted importer-helper
    Icosphere. Treating generic scene bounds as character geometry made the old
    preview target that helper's static -1 m vertex while the visible Human
    remained roughly half a meter above the rendered floor.
    """
    bone_names = set(armature.data.bones.keys())
    accepted: list[bpy.types.Object] = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or not any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        ):
            continue
        deform_group_indices = {
            group.index for group in obj.vertex_groups if group.name in bone_names
        }
        weighted_vertex_count = sum(
            1
            for vertex in obj.data.vertices
            if any(
                assignment.group in deform_group_indices
                and assignment.weight > 0.000001
                for assignment in vertex.groups
            )
        )
        if weighted_vertex_count:
            accepted.append(obj)
    if not accepted:
        raise RuntimeError(
            f"{armature.name}: no visible mesh has canonical-skeleton vertex weights"
        )
    return accepted


def weighted_mesh_profile(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
) -> dict[str, object]:
    bone_names = set(armature.data.bones.keys())
    profile = []
    total_weighted_vertices = 0
    for obj in meshes:
        deform_group_indices = {
            group.index for group in obj.vertex_groups if group.name in bone_names
        }
        weighted_vertex_count = sum(
            1
            for vertex in obj.data.vertices
            if any(
                assignment.group in deform_group_indices
                and assignment.weight > 0.000001
                for assignment in vertex.groups
            )
        )
        if not weighted_vertex_count:
            raise RuntimeError(
                f"Visible-body validator received unweighted helper mesh {obj.name}"
            )
        total_weighted_vertices += weighted_vertex_count
        profile.append(
            {
                "name": obj.name,
                "vertexCount": len(obj.data.vertices),
                "weightedVertexCount": weighted_vertex_count,
            }
        )
    return {
        "meshes": profile,
        "meshCount": len(profile),
        "weightedVertexCount": total_weighted_vertices,
    }


def lerp_vector(left: Vector, right: Vector, blend: float) -> Vector:
    return left + (right - left) * max(0.0, min(1.0, blend))


def boundary_specs() -> tuple[dict[str, object], dict[str, object]]:
    terminal = helper.spell_impact_knockback_fall_pose(1.0)
    standing = helper.spell_impact_knockback_fall_pose(0.0)
    terminal_root = Vector(terminal["root"])
    standing["root"] = (terminal_root.x, terminal_root.y, terminal_root.z)
    return terminal, standing


def authored_get_up_pose(t: float) -> dict[str, object]:
    """Solve a dense technical stand-up recovery at every exported frame."""
    terminal, standing = boundary_specs()
    if t <= 0.0:
        return terminal
    if t >= 1.0:
        return standing

    # Continuous reference mechanics: response and side roll, side-supported
    # sit-up, opposite foot base, hip lift, free-leg thread, low stagger, rise.
    side_roll = helper.bell(t, 0.01, 0.17, 0.40)
    sit = helper.ease_between(t, 0.06, 0.44)
    base_foot = helper.ease_between(t, 0.08, 0.34)
    hip_lift = helper.bell(t, 0.25, 0.45, 0.64)
    leg_thread = helper.ease_between(t, 0.30, 0.58)
    rise = helper.ease_between(t, 0.48, 0.84)
    settle = helper.ease_between(t, 0.84, 1.0)

    root_pitch = (
        90.0 * (1.0 - sit)
        + 25.0 * sit * (1.0 - leg_thread)
        - 19.0 * leg_thread * (1.0 - rise)
    )
    root_roll = -27.0 * side_roll * (1.0 - rise) + 5.0 * hip_lift * (1.0 - rise)
    root_yaw = 8.0 * side_roll * (1.0 - rise)
    terminal_root = Vector(terminal["root"])

    right_terminal = Vector(terminal["handTargets"]["mixamorig:RightHand"])
    right_frame = Vector((-0.02, 0.25, 0.22))
    left_standing = Vector(standing["handTargets"]["mixamorig:LeftHand"])
    right_standing = Vector(standing["handTargets"]["mixamorig:RightHand"])
    post = helper.ease_between(t, 0.04, 0.28)
    release = helper.ease_between(t, 0.52, 0.86)
    right_hand = lerp_vector(lerp_vector(right_terminal, right_frame, post), right_standing, release)

    # Absolute armature-space contact targets begin at the evaluated accepted
    # terminal locations, so enabling the constraints on frame 2 cannot snap.
    # The posted hand and base foot then remain attached to the ground while
    # the pelvis travels over them; the free leg threads into its final base.
    left_hand_terminal = Vector((-0.087125, 0.376502, 1.253307))
    left_hand_post = Vector((-0.20, -0.444, 0.94))
    left_hand_landed = Vector((-0.040886, 0.149394, 0.927977))
    support_post = helper.ease_between(t, 0.03, 0.24)
    support_release = helper.ease_between(t, 0.46, 0.66)
    left_hand_contact = lerp_vector(
        lerp_vector(left_hand_terminal, left_hand_post, support_post),
        left_hand_landed,
        support_release,
    )

    right_foot_terminal = Vector((-0.025136, -0.003499, 0.607266))
    right_foot_landed = Vector((-0.025032, -0.443814, 1.184211))
    right_foot_contact = lerp_vector(
        right_foot_terminal,
        right_foot_landed,
        helper.ease_between(t, 0.08, 0.38),
    )
    left_foot_terminal = Vector((-0.023243, 0.227293, 0.621338))
    left_foot_landed = Vector((-0.024531, -0.443814, 1.025789))
    left_foot_contact = lerp_vector(
        left_foot_terminal,
        left_foot_landed,
        helper.ease_between(t, 0.10, 0.40),
    )

    # These curves are keyed on every frame, not left as sparse milestones.
    # The bent base leg receives load first; the free leg stays between actor
    # and threat, threads underneath, and becomes the staggered rear support.
    left_thigh = (
        7.0 * (1.0 - sit)
        - 31.0 * sit * (1.0 - leg_thread)
        - 58.0 * leg_thread * (1.0 - rise)
    )
    right_thigh = (
        -4.0 * (1.0 - base_foot)
        - 67.0 * base_foot * (1.0 - leg_thread)
        - 31.0 * leg_thread * (1.0 - rise)
    )
    left_knee = (
        9.0 * (1.0 - sit)
        + 61.0 * sit * (1.0 - leg_thread)
        + 91.0 * leg_thread * (1.0 - rise)
    )
    right_knee = (
        13.0 * (1.0 - base_foot)
        + 98.0 * base_foot * (1.0 - leg_thread)
        + 66.0 * leg_thread * (1.0 - rise)
    )

    rotations = {
        helper.ROOT: helper.degrees(root_roll, root_yaw, root_pitch),
        "mixamorig:Spine": helper.degrees(
            4.0 * side_roll * (1.0 - rise),
            -6.0 * side_roll * (1.0 - rise),
            9.0 * (1.0 - sit) - 27.0 * sit * (1.0 - rise) + 8.0 * hip_lift,
        ),
        "mixamorig:Spine1": helper.degrees(
            2.0 * side_roll * (1.0 - rise),
            -4.0 * side_roll * (1.0 - rise),
            7.0 * (1.0 - sit) - 19.0 * sit * (1.0 - rise) + 5.0 * hip_lift,
        ),
        "mixamorig:Spine2": helper.degrees(
            0.0,
            3.0 * side_roll * (1.0 - rise),
            4.0 * (1.0 - sit) - 11.0 * sit * (1.0 - rise),
        ),
        "mixamorig:Neck": helper.degrees(
            0.0,
            -4.0 * side_roll * (1.0 - rise),
            -7.0 * (1.0 - sit) + 19.0 * sit * (1.0 - rise),
        ),
        "mixamorig:Head": helper.degrees(
            0.0,
            3.0 * side_roll * (1.0 - rise),
            -3.0 * (1.0 - sit) + 9.0 * sit * (1.0 - rise),
        ),
        "mixamorig:LeftUpLeg": helper.degrees(-8.0 * side_roll, 0.0, left_thigh),
        "mixamorig:RightUpLeg": helper.degrees(7.0 * side_roll, 0.0, right_thigh),
        "mixamorig:LeftLeg": helper.degrees(0.0, 0.0, left_knee),
        "mixamorig:RightLeg": helper.degrees(0.0, 0.0, right_knee),
        "mixamorig:LeftFoot": helper.degrees(0.0, 0.0, -2.0 - 14.0 * leg_thread * (1.0 - rise)),
        "mixamorig:RightFoot": helper.degrees(0.0, 0.0, -2.0 + 17.0 * base_foot * (1.0 - rise)),
    }

    # The small lateral shift and lift are contact-baked against the evaluated
    # textured mesh. Forward root position stays at the accepted landing point.
    root = (
        terminal_root.x,
        terminal_root.y + 0.035 * hip_lift * (1.0 - rise),
        terminal_root.z - 0.085 * side_roll * (1.0 - rise) + 0.025 * leg_thread * (1.0 - rise),
    )
    if settle > 0.0:
        root = (
            root[0],
            helper.scalar_lerp(root[1], terminal_root.y, settle),
            helper.scalar_lerp(root[2], terminal_root.z, settle),
        )

    hand_targets = {"mixamorig:RightHand": right_hand}
    absolute_contact_targets = {}
    if t < 0.58:
        absolute_contact_targets["mixamorig:LeftHand"] = left_hand_contact
    else:
        hand_targets["mixamorig:LeftHand"] = left_standing
    if t < 0.78:
        absolute_contact_targets.update(
            {
                "mixamorig:LeftLeg": left_foot_contact,
                "mixamorig:RightLeg": right_foot_contact,
            }
        )

    return {
        "root": root,
        "rotations": rotations,
        "handTargets": hand_targets,
        # The shared authoring helper treats this map as absolute contact
        # targets; it supports the posting hand as well as both ankles.
        "legTargets": absolute_contact_targets,
    }


def authored_clips():
    return [
        helper.AuthoredClip(
            name=CLIP_NAME,
            label="Grounded Get-Up",
            requirement="reaction.spell.get-up",
            frames=FRAMES,
            loop=False,
            airborne=False,
            root_policy="IN_PLACE_GROUNDED_RECOVERY",
            reference_ids=(
                "roger-gracie-technical-stand-up",
                "infighting-technical-stand-up",
                "open-bjj-technical-stand-up",
                "floor-to-stand-biomechanics",
            ),
            mechanics=(
                "exact accepted Spell Impact terminal pose at the first frame",
                "brief responsive settle and side roll without a bind-pose pre-roll",
                "side hand post and opposite planted base foot carry visible load",
                "hips elevate before the free leg threads beneath the body",
                "pelvis and center of mass transfer over the support base before extension",
                "low stagger rises into the accepted natural standing boundary",
                "no spell gesture, death reversal, source-motion reuse, or automatic follow-on",
            ),
            pose=authored_get_up_pose,
        )
    ]


def key_continuous_matrices(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    matrices: dict[str, Matrix],
    frame: int,
) -> None:
    """Fail closed on IK branch flips while retaining dense whole-body keys.

    Blender's unconstrained limb IK can select an equivalent elbow or knee
    branch while a contact releases. Limit only the contact-chain local
    quaternion step; this is curve conditioning of the newly solved motion,
    not source sampling. Frame 1 is untouched, and the recovery tail lets all
    chains reach the declared standing boundary exactly.
    """
    global _previous_authored_matrices
    conditioned = {name: matrix.copy() for name, matrix in matrices.items()}
    if _previous_authored_matrices is not None:
        for bone_name in CONTACT_CHAIN_BONES:
            previous_location, previous_rotation, previous_scale = (
                _previous_authored_matrices[bone_name].decompose()
            )
            location, rotation, scale = conditioned[bone_name].decompose()
            angle = previous_rotation.rotation_difference(rotation).angle
            if angle > JOINT_CONTINUITY_LIMIT_RADIANS:
                rotation = previous_rotation.slerp(
                    rotation,
                    JOINT_CONTINUITY_LIMIT_RADIANS / angle,
                )
                conditioned[bone_name] = Matrix.LocRotScale(location, rotation, scale)
    original_key_matrices(armature, action, conditioned, frame)
    _previous_authored_matrices = conditioned


def set_action(armature: bpy.types.Object, action: bpy.types.Action, frame: int) -> None:
    armature.animation_data_create()
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def pose_matrices(armature: bpy.types.Object) -> dict[str, Matrix]:
    return {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}


def compare_poses(
    left: dict[str, Matrix],
    right: dict[str, Matrix],
    *,
    exclude_root_translation: bool = False,
) -> dict[str, float | bool]:
    max_translation = 0.0
    max_rotation = 0.0
    max_scale = 0.0
    for bone_name in left:
        left_location, left_rotation, left_scale = left[bone_name].decompose()
        right_location, right_rotation, right_scale = right[bone_name].decompose()
        if not (exclude_root_translation and bone_name == helper.ROOT):
            max_translation = max(max_translation, (left_location - right_location).length)
        max_rotation = max(
            max_rotation,
            left_rotation.rotation_difference(right_rotation).angle,
        )
        max_scale = max(
            max_scale,
            max(abs(a - b) for a, b in zip(left_scale, right_scale, strict=True)),
        )
    passed = max_translation <= 0.002 and max_rotation <= 0.002 and max_scale <= 0.0005
    return {
        "passed": passed,
        "maximumTranslationMeters": max_translation,
        "maximumRotationRadians": max_rotation,
        "maximumScaleDelta": max_scale,
    }


def import_actions(path: Path) -> tuple[set[bpy.types.Object], set[bpy.types.Action]]:
    before_objects = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return (
        set(bpy.context.scene.objects) - before_objects,
        set(bpy.data.actions) - before_actions,
    )


def remove_objects(objects: set[bpy.types.Object]) -> None:
    for obj in objects:
        if obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def verify_boundaries(rest_glb: Path, output_glb: Path, spell_glb: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = helper.FPS
    rest_objects, rest_actions = import_actions(rest_glb)
    if rest_actions:
        raise RuntimeError("Accepted rest rig unexpectedly imported actions")
    armatures = [obj for obj in rest_objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one accepted rest armature, got {len(armatures)}")
    armature = armatures[0]
    helper.validate_armature(armature, rest_glb)

    spell_objects, spell_actions = import_actions(spell_glb)
    get_up_objects, get_up_actions = import_actions(output_glb)
    remove_objects(spell_objects | get_up_objects)
    if len(spell_actions) != 1 or len(get_up_actions) != 1:
        raise RuntimeError(
            f"Expected one spell and one get-up action, got {len(spell_actions)}/{len(get_up_actions)}"
        )
    spell_action = next(iter(spell_actions))
    get_up_action = next(iter(get_up_actions))
    if get_up_action.name != CLIP_NAME:
        raise RuntimeError(f"Unexpected get-up action name: {get_up_action.name}")

    set_action(armature, spell_action, int(round(spell_action.frame_range[1])))
    spell_terminal = pose_matrices(armature)
    spell_terminal_root = armature.pose.bones[helper.ROOT].location.copy()
    set_action(armature, get_up_action, int(round(get_up_action.frame_range[0])))
    get_up_start = pose_matrices(armature)
    get_up_start_root = armature.pose.bones[helper.ROOT].location.copy()
    start_match = compare_poses(spell_terminal, get_up_start)

    set_action(armature, spell_action, int(round(spell_action.frame_range[0])))
    spell_standing = pose_matrices(armature)
    set_action(armature, get_up_action, int(round(get_up_action.frame_range[1])))
    get_up_end = pose_matrices(armature)
    get_up_end_root = armature.pose.bones[helper.ROOT].location.copy()
    end_match = compare_poses(
        spell_standing,
        get_up_end,
        exclude_root_translation=True,
    )

    # Fail closed on any one-frame snap in the dense exported action.
    previous = None
    maximum_frame_rotation = 0.0
    maximum_frame_rotation_bone = None
    maximum_frame_rotation_frame = None
    continuity_outliers = []
    maximum_root_step = 0.0
    start, end = [int(round(value)) for value in get_up_action.frame_range]
    for frame in range(start, end + 1):
        set_action(armature, get_up_action, frame)
        current = pose_matrices(armature)
        root_location = armature.pose.bones[helper.ROOT].location.copy()
        if previous is not None:
            previous_pose, previous_root = previous
            maximum_root_step = max(maximum_root_step, (root_location - previous_root).length)
            for bone_name in current:
                _, current_rotation, _ = current[bone_name].decompose()
                _, previous_rotation, _ = previous_pose[bone_name].decompose()
                rotation_step = previous_rotation.rotation_difference(current_rotation).angle
                if rotation_step > maximum_frame_rotation:
                    maximum_frame_rotation = rotation_step
                    maximum_frame_rotation_bone = bone_name
                    maximum_frame_rotation_frame = frame
                if rotation_step > 0.15:
                    continuity_outliers.append(
                        {
                            "frame": frame,
                            "bone": bone_name,
                            "rotationRadians": rotation_step,
                        }
                    )
        previous = (current, root_location)

    continuity_passed = maximum_frame_rotation <= 0.20 and maximum_root_step <= 0.08
    result = {
        "passed": bool(start_match["passed"] and end_match["passed"] and continuity_passed),
        "spellAsset": {
            "path": SPELL_ASSET,
            "bytes": spell_glb.stat().st_size,
            "sha256": sha256(spell_glb.read_bytes()).hexdigest().upper(),
            "clipName": spell_action.name,
        },
        "startMatchesAcceptedSpellTerminal": start_match,
        "endMatchesAcceptedNaturalStandingPoseAtLandedRoot": end_match,
        "landedRoot": {
            "spellTerminal": list(spell_terminal_root),
            "getUpStart": list(get_up_start_root),
            "getUpEnd": list(get_up_end_root),
        },
        "denseFrameContinuity": {
            "passed": continuity_passed,
            "frameCount": end - start + 1,
            "maximumConsecutiveBoneRotationRadians": maximum_frame_rotation,
            "maximumConsecutiveBoneRotationBone": maximum_frame_rotation_bone,
            "maximumConsecutiveBoneRotationFrame": maximum_frame_rotation_frame,
            "maximumConsecutiveRootTranslationMeters": maximum_root_step,
            "rotationOutliersAbovePoint15Radians": continuity_outliers,
            "limits": {"rotationRadians": 0.20, "rootTranslationMeters": 0.08},
        },
    }
    if not result["passed"]:
        raise RuntimeError(f"Get-up boundary or dense continuity validation failed: {result}")
    return result


def validate_visible_body_floor(
    rest_glb: Path,
    output_glb: Path,
) -> dict[str, object]:
    """Fail closed on the visible weighted Human body, never helper geometry."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = helper.FPS
    rest_objects, rest_actions = import_actions(rest_glb)
    if rest_actions:
        raise RuntimeError("Accepted rest rig unexpectedly imported actions")
    armature = next(obj for obj in rest_objects if obj.type == "ARMATURE")
    helper.validate_armature(armature, rest_glb)
    visible_meshes = weighted_skinned_meshes_for(armature)
    visible_mesh_set = set(visible_meshes)
    all_scene_meshes = {
        obj for obj in bpy.context.scene.objects if obj.type == "MESH"
    }
    excluded_meshes = sorted(obj.name for obj in all_scene_meshes - visible_mesh_set)
    if not excluded_meshes:
        raise RuntimeError("Visible-body validation did not exclude any helper geometry")
    rest_visible_lower = helper.skinned_mesh_lower_world(visible_meshes)

    action_objects, actions = import_actions(output_glb)
    remove_objects(action_objects)
    if len(actions) != 1:
        raise RuntimeError(f"Expected one get-up action, got {len(actions)}")
    action = next(iter(actions))
    if action.name != CLIP_NAME:
        raise RuntimeError(f"Unexpected get-up action name: {action.name}")
    armature.animation_data_create()
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]

    start, end = [int(round(value)) for value in action.frame_range]
    frame_metrics = []
    maximum_error = 0.0
    maximum_error_frame = None
    for frame in range(start, end + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        visible_lower = helper.skinned_mesh_lower_world(visible_meshes)
        error = visible_lower - rest_visible_lower
        if abs(error) > maximum_error:
            maximum_error = abs(error)
            maximum_error_frame = frame
        frame_metrics.append(
            {
                "frame": frame,
                "visibleBodyLowerWorldZ": visible_lower,
                "floorWorldZ": rest_visible_lower,
                "signedErrorMeters": error,
            }
        )
    tolerance = 0.0075
    passed = maximum_error <= tolerance
    result = {
        "passed": passed,
        "metricAuthority": "SKINNED_WEIGHTED_HUMAN_BODY_VERTICES_ONLY",
        "helperGeometryExcluded": True,
        "excludedMeshes": excluded_meshes,
        "visibleBodyProfile": weighted_mesh_profile(armature, visible_meshes),
        "testedFrameCount": len(frame_metrics),
        "floorWorldZ": rest_visible_lower,
        "maximumAbsoluteVisibleBodyFloorErrorMeters": maximum_error,
        "maximumErrorFrame": maximum_error_frame,
        "toleranceMeters": tolerance,
        "frames": frame_metrics,
    }
    if not passed:
        raise RuntimeError(f"Visible weighted Human body floor validation failed: {result}")
    return result


def update_report(
    report_path: Path,
    boundary_result: dict[str, object],
    visible_body_floor: dict[str, object],
) -> None:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["coveredRequirements"] = list(SEMANTIC_ROWS)
    report["boundaryContinuity"] = boundary_result
    report["visibleBodyFloorValidation"] = visible_body_floor
    report["realPersonReferences"] = [
        {
            "id": "roger-gracie-technical-stand-up",
            "url": "https://www.youtube.com/watch?v=Ggnz7_9uQkY",
            "timeRange": "00:00-end (complete real-person solo drill)",
        },
        {
            "id": "infighting-technical-stand-up",
            "url": "https://www.youtube.com/watch?v=yC_sSqO4Vx0",
            "articleUrl": "https://www.infighting.ca/bjj-basics-how-to-do-a-technical-stand-up/",
            "timeRange": "00:00-end (complete embedded real-person demonstration)",
        },
    ]
    for clip in report["clips"]:
        clip["semanticRowIds"] = list(SEMANTIC_ROWS)
        clip["requirementIds"] = list(SEMANTIC_ROWS)
        clip["authoringMethod"] = (
            "ORIGINAL_DENSE_PER_FRAME_BLENDER_KEYS_WITH_REQUIRED_BOUNDARY_POSE_MATCHING"
        )
        clip["forbiddenOperations"] = {
            "sourceMotionSampling": False,
            "deathReversal": False,
            "timeReversal": False,
            "splicing": False,
            "overlay": False,
            "interiorPoseCopying": False,
            "relabeling": False,
            "requiredBoundaryPoseMatching": True,
        }
        clip["boundaryAuthority"] = {
            "start": "accepted AuthoredReaction__SpellImpactKnockbackAndFall terminal pose",
            "end": "accepted AuthoredReaction__SpellImpactKnockbackAndFall natural standing first pose translated to landed root",
        }
        clip["recommendedPreview"] = {
            "durationSeconds": round(FRAMES / helper.FPS, 2),
            "cameraFraming": "normal-speed gameplay, front, side, and rear full-body views with floor, posting hand, base foot, hips, head, and both knees visible",
            "reviewFocus": [
                "exact accepted grounded start boundary",
                "no T-pose or death-reversal pre-roll",
                "posted-hand and planted-foot load",
                "hip lift before free-leg thread",
                "center of mass over support before rise",
                "no floor or limb penetration",
                "clean accepted natural-standing recovery",
            ],
        }
    report["remainingGates"] = [
        "NORMAL_SPEED_FOUR_VIEW_TEXTURED_PREVIEW",
        "INDEPENDENT_CONTINUOUS_PLAYBACK_REVIEW",
        "BREACH_V2_REAL_GAME_START_MID_END_GROUNDING",
    ]
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    # Reuse the established fail-closed exporter/grounding/re-import validator
    # without modifying the active traversal builder owned by another lane.
    helper.REFERENCE_PACKET = REFERENCE_PACKET
    helper.__file__ = str(SCRIPT_PATH)
    helper.authored_clips = authored_clips
    helper.key_matrices = key_continuous_matrices
    helper.skinned_meshes_for = weighted_skinned_meshes_for
    global _previous_authored_matrices
    _previous_authored_matrices = None
    helper.main()

    args = helper.parse_args()
    root_dir = Path.cwd().resolve()
    candidate_dir = (helper.CANDIDATE_STAGING_ROOT / args.candidate_id).resolve()
    output_glb = candidate_dir / "candidate.glb"
    report_path = candidate_dir / "technical-report.json"
    spell_glb = (root_dir / SPELL_ASSET).resolve()
    boundary_result = verify_boundaries(args.rest_glb.resolve(), output_glb, spell_glb)
    visible_body_floor = validate_visible_body_floor(args.rest_glb.resolve(), output_glb)
    update_report(report_path, boundary_result, visible_body_floor)
    print(
        "ISSUE_487_AUTHORED_GROUNDED_GET_UP="
        + json.dumps(
            {
                "candidate": str(output_glb),
                "bytes": output_glb.stat().st_size,
                "sha256": sha256(output_glb.read_bytes()).hexdigest().upper(),
                "boundaryContinuity": boundary_result,
                "visibleBodyFloorValidation": visible_body_floor,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
