"""Build a quarantined solid-strand LOD0 proof for the Human cropped haircut.

This is deliberately independent from the shipping card conversion.  It replays
the locked v218 exact-head Hair Curves pipeline through Blender's bundled
procedural hair nodes, captures the evaluated child curves before cards, and
turns a deterministic exact-scalp distribution into closed, tapered micro-wedges.

The proof contains no scalp shell, cap, alpha cards, or promoted game asset.
Only a 640px front evidence render and a structural receipt are emitted.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from hashlib import sha256
from pathlib import Path
from types import ModuleType
from typing import Iterable

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ISSUE = 487
MODULE_NAME = "SK_Hair_Cropped"
SOURCE_STAGE = "POST_OFFICIAL_PROCEDURAL_NODES_PRE_RUNTIME_CARD_CONVERSION"
TARGET_TRIANGLES = (25_000, 60_000)
LOCKED_ROOT_BOUNDS_TOLERANCE_METERS = 0.00035
TRIANGLES_PER_STRAND = 6
RENDER_ROOT_COUNT = 9_000
RENDER_ROOT_MIN_SEPARATION_METERS = 0.00068
RENDER_ROOT_CLEARANCE_METERS = 0.00010
LOCKED_FAMILIES = ("Coverage", "MidLayer", "TopLayer", "ShortHairs", "Flyaways")
FLOW_GUIDE_FAMILIES = ("Coverage", "MidLayer", "TopLayer", "ShortHairs")
WEDGE_REAR_HALF_WIDTH_RANGE_METERS = (0.000625, 0.000775)
WEDGE_FORWARD_HALF_WIDTH_RANGE_METERS = (0.000425, 0.000575)
WEDGE_LENGTH_HAIRLINE_RANGE_METERS = (0.00135, 0.00165)
WEDGE_LENGTH_INTERIOR_BONUS_METERS = (0.00030, 0.00045)
WEDGE_LENGTH_CROWN_BONUS_METERS = (0.00015, 0.00015)
WEDGE_BURIED_ROOT_RANGE_METERS = (0.00020, 0.00026)
WEDGE_REAR_ROOF_HEIGHT_RANGE_METERS = (0.00028, 0.00040)
WEDGE_FORWARD_ROOF_HEIGHT_RANGE_METERS = (0.00016, 0.00028)
WEDGE_REAR_OVERHANG_RANGE_METERS = (0.00010, 0.00018)
WEDGE_FLOW_JITTER_RADIANS = math.radians(4.0)


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-head",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-head-base.glb"
        ),
    )
    parser.add_argument(
        "--generator",
        default=str(
            game_root / "scripts/build-human-foundation-modular-appearance.py"
        ),
    )
    parser.add_argument(
        "--locked-diagnostic",
        default=(
            "H:/CodexData/souldrifter-toolchain/evidence/487/"
            "modular-appearance-v218-cropped-postnode-precard-curves/"
            "SK_Hair_Cropped/postnode-precard-diagnostic.json"
        ),
    )
    parser.add_argument(
        "--issue448-hair-root",
        default=(
            "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/"
            "SoulDrifter/issue-448/technicalized-pilots/hair-library-v001"
        ),
    )
    parser.add_argument(
        "--evidence-dir",
        default=(
            "H:/CodexData/souldrifter-toolchain/evidence/487/"
            "modular-appearance-cropped-strand-lod0-v001"
        ),
    )
    parser.add_argument("--hair-only-debug", action="store_true")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def load_generator(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location("souldrifter_modular_hair", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load modular appearance generator: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def extract_legacy_curve(curve: bpy.types.Curve) -> list[list[tuple[float, float, float]]]:
    strands: list[list[tuple[float, float, float]]] = []
    for spline in curve.splines:
        points = [tuple(float(value) for value in point.co.xyz) for point in spline.points]
        if len(points) >= 2:
            strands.append(points)
    return strands


def capture_locked_postnode_curves(
    generator: ModuleType,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
    issue448_root: Path,
    evidence_dir: Path,
) -> dict[str, list[list[tuple[float, float, float]]]]:
    captured: dict[str, list[list[tuple[float, float, float]]]] = {}

    def diagnostic_capture(
        _reference_head: bpy.types.Object,
        family_curves: dict[str, bpy.types.Curve],
        _evidence_dir: Path,
        _module_name: str,
        *,
        stage: str = "",
        file_prefix: str = "",
    ) -> dict[str, object]:
        del file_prefix
        if stage == SOURCE_STAGE:
            for label, curve in family_curves.items():
                captured[label] = extract_legacy_curve(curve)
        return {"status": "PASS", "stage": stage}

    def lightweight_material(
        module_name: str, source_path: Path
    ) -> tuple[bpy.types.Material, dict[str, object]]:
        material = bpy.data.materials.new(f"MAT_{module_name}_LOD0Capture")
        material.use_nodes = True
        return material, {
            "sourceGeometryPolicy": "HASH_CHECKED_NOT_IMPORTED",
            "sourcePath": str(source_path).replace("\\", "/"),
            "runtimeCardAtlas": "NOT_BUILT_FOR_SOLID_STRAND_PROOF",
        }

    original_bake = generator.bake_surface_attached_groom

    def locked_v218_bake(*call_args, **call_kwargs):
        """Restore the v218 child multiplicity before the later card ablations."""
        label = call_kwargs.get("precard_diagnostic_family")
        call_kwargs["children_per_guide"] = 2 if label in {"MidLayer", "TopLayer"} else 1
        return original_bake(*call_args, **call_kwargs)

    generator.render_groom_curve_diagnostic = diagnostic_capture
    generator.make_issue448_authored_card_material = lightweight_material
    generator.bake_surface_attached_groom = locked_v218_bake
    generator.emit_cropped_follicle_density_mask = lambda *_args, **_kwargs: {
        "status": "NOT_EMITTED_EXISTING_V237_MASK_REMAINS_QUARANTINED"
    }
    # The production diagnostic writer assumes its per-module directory was
    # already created by the real renderer.  Our capture renderer is purposely
    # side-effect free, so establish only that evidence-owned directory here.
    (evidence_dir / MODULE_NAME).mkdir(parents=True, exist_ok=True)
    objects_before_capture = {obj.name for obj in bpy.data.objects}
    try:
        generator.build_zoned_cropped_hair(
            MODULE_NAME,
            issue448_root,
            reference_head,
            armature,
            evidence_dir,
            evidence_dir,
            None,
        )
    except SystemExit as error:
        if error.code not in (None, 0):
            raise
    finally:
        for obj in tuple(bpy.data.objects):
            if obj.name not in objects_before_capture:
                bpy.data.objects.remove(obj, do_unlink=True)
    if set(captured) != set(LOCKED_FAMILIES):
        raise RuntimeError(f"Post-node family capture incomplete: {sorted(captured)}")
    return captured


def root_bounds(curves: Iterable[list[tuple[float, float, float]]]) -> dict[str, list[float]]:
    roots = [curve[0] for curve in curves]
    return {
        "min": [min(root[axis] for root in roots) for axis in range(3)],
        "max": [max(root[axis] for root in roots) for axis in range(3)],
    }


def validate_against_v218(
    curves: dict[str, list[list[tuple[float, float, float]]]],
    locked_path: Path,
    source_head_sha256: str,
) -> dict[str, object]:
    locked = json.loads(locked_path.read_text(encoding="utf-8"))
    if locked.get("stage") != SOURCE_STAGE or locked.get("status") != "PASS":
        raise RuntimeError("Locked v218 diagnostic is not the approved post-node stage")
    if locked.get("sourceHeadSha256") != source_head_sha256:
        raise RuntimeError("Locked v218 diagnostic references another head hash")
    comparisons: dict[str, object] = {}
    for label, family_curves in curves.items():
        expected = locked["families"][label]
        observed_bounds = root_bounds(family_curves)
        point_counts = [len(curve) for curve in family_curves]
        deltas = [
            abs(observed_bounds[bound][axis] - expected["rootBounds"][bound][axis])
            for bound in ("min", "max")
            for axis in range(3)
        ]
        match = (
            len(family_curves) == expected["curveCount"]
            and min(point_counts) == expected["pointCountMin"]
            and max(point_counts) == expected["pointCountMax"]
            # v218 stored aggregate bounds rather than every child point. The
            # official Interpolate Hair Curves node replays child placement
            # within the authored jitter radius, so lock exact counts/profile
            # and permit only a sub-jitter aggregate-bounds delta.
            and max(deltas) <= LOCKED_ROOT_BOUNDS_TOLERANCE_METERS
        )
        comparisons[label] = {
            "match": match,
            "curveCount": len(family_curves),
            "pointCountMin": min(point_counts),
            "pointCountMax": max(point_counts),
            "rootBounds": observed_bounds,
            "lockedRootBoundsMaxDeltaMeters": max(deltas),
            "lockedRootBoundsToleranceMeters": LOCKED_ROOT_BOUNDS_TOLERANCE_METERS,
        }
        if not match:
            raise RuntimeError(
                "Current post-node curves drifted from locked v218: "
                f"{label} count={len(family_curves)}/{expected['curveCount']} "
                f"points={min(point_counts)}-{max(point_counts)} "
                f"maxRootBoundsDelta={max(deltas):.12f} "
                f"observed={observed_bounds} expected={expected['rootBounds']}"
            )
    return {
        "status": "PASS",
        "lockedDiagnostic": str(locked_path).replace("\\", "/"),
        "lockedDiagnosticSha256": file_sha256(locked_path),
        "sourceHeadSha256": source_head_sha256,
        "families": comparisons,
    }


def deterministic_rank(index: int, root: tuple[float, float, float]) -> int:
    quantized = tuple(round(value * 1_000_000) for value in root)
    return (
        index * 73_856_093
        ^ quantized[0] * 19_349_663
        ^ quantized[1] * 83_492_791
        ^ quantized[2] * 2_654_435_761
    ) & 0xFFFFFFFF


def generate_blue_noise_render_roots(
    generator: ModuleType,
    surface: BVHTree,
) -> tuple[list[Vector], list[Vector], dict[str, object]]:
    """Create non-banded exact-scalp roots independent of the v218 guide rings."""
    roots: list[Vector] = []
    normals: list[Vector] = []
    cells: dict[tuple[int, int, int], list[int]] = {}
    minimum_accepted_distance = float("inf")
    candidate_attempts = 0
    maximum_attempts = RENDER_ROOT_COUNT * 180
    y_min = 0.4375
    y_max = 0.5015

    while len(roots) < RENDER_ROOT_COUNT and candidate_attempts < maximum_attempts:
        attempt = candidate_attempts
        candidate_attempts += 1
        # Two incommensurate low-discrepancy sequences avoid the authored
        # latitude rings while remaining deterministic and reproducible.
        vertical_amount = ((attempt + 0.5) * 0.7548776662466927) % 1.0
        azimuth_amount = ((attempt + 0.5) * 0.5698402909980532) % 1.0
        y = y_min + (y_max - y_min) * vertical_amount
        angle = 2.0 * math.pi * azimuth_amount
        sampled = generator.authored_scalp_point(
            surface,
            y,
            angle,
            RENDER_ROOT_CLEARANCE_METERS,
        )
        if sampled is None:
            continue
        root, normal = sampled
        hairline_noise = (
            ((attempt * 2_654_435_761 + 1_013_904_223) & 0xFFFFFFFF)
            / 0xFFFFFFFF
        )
        hairline_floor = generator.cropped_hairline_floor(root)
        if root.y < hairline_floor + hairline_noise * 0.00135:
            continue

        cell = tuple(
            math.floor(component / RENDER_ROOT_MIN_SEPARATION_METERS)
            for component in root
        )
        nearest_distance = float("inf")
        rejected = False
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for neighbor_index in cells.get(
                        (cell[0] + dx, cell[1] + dy, cell[2] + dz),
                        (),
                    ):
                        distance = (root - roots[neighbor_index]).length
                        nearest_distance = min(nearest_distance, distance)
                        if distance < RENDER_ROOT_MIN_SEPARATION_METERS:
                            rejected = True
                            break
                    if rejected:
                        break
                if rejected:
                    break
            if rejected:
                break
        if rejected:
            continue
        if nearest_distance < float("inf"):
            minimum_accepted_distance = min(minimum_accepted_distance, nearest_distance)
        cells.setdefault(cell, []).append(len(roots))
        roots.append(root)
        normals.append(normal.normalized())

    if len(roots) != RENDER_ROOT_COUNT:
        raise RuntimeError(
            "Blue-noise exact-scalp render-root target was not reached: "
            f"{len(roots)}/{RENDER_ROOT_COUNT} after {candidate_attempts} candidates"
        )

    clearance_max = 0.0
    hairline_margin_min = float("inf")
    azimuth_bins = [0] * 24
    vertical_bins = [0] * 12
    center = generator.TARGET_HEAD_CENTER
    for root in roots:
        _, _, _, distance = surface.find_nearest(root)
        if distance is None:
            raise RuntimeError("Blue-noise render-root clearance audit failed")
        clearance_max = max(clearance_max, float(distance))
        hairline_margin_min = min(
            hairline_margin_min,
            float(root.y - generator.cropped_hairline_floor(root)),
        )
        azimuth = math.atan2(root.z - center.z, root.x - center.x)
        azimuth_bins[
            int(((azimuth + math.pi) / (2.0 * math.pi)) * len(azimuth_bins))
            % len(azimuth_bins)
        ] += 1
        vertical = max(0.0, min(0.999999, (root.y - y_min) / (y_max - y_min)))
        vertical_bins[int(vertical * len(vertical_bins))] += 1

    return roots, normals, {
        "status": "PASS",
        "policy": "DETERMINISTIC_LOW_DISCREPANCY_BLUE_NOISE_EXACT_SCALP_ROOTS",
        "targetRootCount": RENDER_ROOT_COUNT,
        "acceptedRootCount": len(roots),
        "candidateAttempts": candidate_attempts,
        "minimumSeparationMeters": RENDER_ROOT_MIN_SEPARATION_METERS,
        "observedMinimumAcceptedDistanceMeters": minimum_accepted_distance,
        "rootClearanceMeters": RENDER_ROOT_CLEARANCE_METERS,
        "observedClearanceMaxMeters": clearance_max,
        "hairlineMarginMinMeters": hairline_margin_min,
        "azimuthBinCounts": azimuth_bins,
        "verticalBinCounts": vertical_bins,
        "authoredPolarGuideRootsUsedAsRenderRoots": False,
    }


def interpolate_render_curves(
    generator: ModuleType,
    reference_head: bpy.types.Object,
    locked_curves: dict[str, list[list[tuple[float, float, float]]]],
    roots: list[Vector],
    normals: list[Vector],
) -> tuple[list[list[tuple[float, float, float]]], dict[str, object]]:
    """Use Blender's native Interpolate Curves node with v218 flow donors."""
    legacy = bpy.data.curves.new("SK_Hair_Cropped_V218FlowGuides", "CURVE")
    legacy.dimensions = "3D"
    legacy.resolution_u = 1
    guide_count = 0
    for label in FLOW_GUIDE_FAMILIES:
        for stored_points in locked_curves[label]:
            points = tuple(Vector(point) for point in stored_points)
            generator.append_curve_strand(
                legacy,
                points,
                tuple(1.0 for _ in points),
            )
            guide_count += 1
    guide_object = bpy.data.objects.new("SK_Hair_Cropped_V218FlowGuides", legacy)
    bpy.context.collection.objects.link(guide_object)
    guide_object.matrix_world = reference_head.matrix_world.copy()
    bpy.ops.object.select_all(action="DESELECT")
    guide_object.select_set(True)
    bpy.context.view_layer.objects.active = guide_object
    bpy.ops.object.convert(target="CURVES")
    groom = bpy.context.view_layer.objects.active
    groom.name = "SK_Hair_Cropped_BlueNoiseInterpolatedCurves"
    groom.data.surface = reference_head
    if reference_head.data.uv_layers.active is not None:
        groom.data.surface_uv_map = reference_head.data.uv_layers.active.name
    guide_offsets = [value.value for value in groom.data.curve_offset_data]
    guide_normal_attribute = groom.data.attributes.get("surface_normal")
    if guide_normal_attribute is None:
        guide_normal_attribute = groom.data.attributes.new(
            name="surface_normal",
            type="FLOAT_VECTOR",
            domain="CURVE",
        )
    surface = generator.exact_head_surface(reference_head)
    for curve_index, value in enumerate(guide_normal_attribute.data):
        root = groom.data.points[guide_offsets[curve_index]].position
        _, normal, _, distance = surface.find_nearest(root)
        if normal is None or distance is None or distance > 0.008:
            raise RuntimeError("v218 flow-guide normal audit failed")
        value.vector = normal.normalized()

    root_mesh = bpy.data.meshes.new("SK_Hair_Cropped_BlueNoiseRootsMesh")
    root_mesh.from_pydata([tuple(root) for root in roots], [], [])
    normal_attribute = root_mesh.attributes.new(
        name="surface_normal",
        type="FLOAT_VECTOR",
        domain="POINT",
    )
    for value, normal in zip(normal_attribute.data, normals):
        value.vector = normal
    root_object = bpy.data.objects.new("SK_Hair_Cropped_BlueNoiseRoots", root_mesh)
    bpy.context.collection.objects.link(root_object)
    root_object.matrix_world = reference_head.matrix_world.copy()

    group = bpy.data.node_groups.new(
        "SK_Hair_Cropped_BlueNoiseGuideInterpolation",
        "GeometryNodeTree",
    )
    group.interface.new_socket(
        name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry"
    )
    group.interface.new_socket(
        name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry"
    )
    group_input = group.nodes.new("NodeGroupInput")
    group_output = group.nodes.new("NodeGroupOutput")
    root_info = group.nodes.new("GeometryNodeObjectInfo")
    root_info.transform_space = "RELATIVE"
    root_info.inputs["Object"].default_value = root_object
    mesh_to_points = group.nodes.new("GeometryNodeMeshToPoints")
    mesh_to_points.mode = "VERTICES"
    guide_up = group.nodes.new("GeometryNodeInputNamedAttribute")
    guide_up.data_type = "FLOAT_VECTOR"
    guide_up.inputs["Name"].default_value = "surface_normal"
    point_up = group.nodes.new("GeometryNodeInputNamedAttribute")
    point_up.data_type = "FLOAT_VECTOR"
    point_up.inputs["Name"].default_value = "surface_normal"
    interpolate = group.nodes.new("GeometryNodeInterpolateCurves")
    interpolate.inputs["Max Neighbors"].default_value = 4
    group.links.new(group_input.outputs["Geometry"], interpolate.inputs["Guide Curves"])
    group.links.new(root_info.outputs["Geometry"], mesh_to_points.inputs["Mesh"])
    group.links.new(mesh_to_points.outputs["Points"], interpolate.inputs["Points"])
    group.links.new(guide_up.outputs["Attribute"], interpolate.inputs["Guide Up"])
    group.links.new(point_up.outputs["Attribute"], interpolate.inputs["Point Up"])
    group.links.new(interpolate.outputs["Curves"], group_output.inputs["Geometry"])
    modifier = groom.modifiers.new(
        name="Interpolate Blue-Noise Exact-Scalp Curves",
        type="NODES",
    )
    modifier.node_group = group
    bpy.ops.object.modifier_apply(modifier=modifier.name)

    offsets = [value.value for value in groom.data.curve_offset_data]
    interpolated: list[list[tuple[float, float, float]]] = []
    for curve_index in range(len(groom.data.curves)):
        interpolated.append(
            [
                tuple(float(component) for component in groom.data.points[point_index].position)
                for point_index in range(offsets[curve_index], offsets[curve_index + 1])
            ]
        )
    if len(interpolated) != len(roots):
        raise RuntimeError(
            "Blender Interpolate Curves root cardinality changed: "
            f"{len(interpolated)} != {len(roots)}"
        )
    point_counts = [len(curve) for curve in interpolated]
    if min(point_counts) < 5:
        raise RuntimeError("Blender Interpolate Curves emitted degenerate render curves")
    groom.hide_render = True
    root_object.hide_render = True
    return interpolated, {
        "status": "PASS",
        "engine": "BLENDER_GEOMETRY_NODE_INTERPOLATE_CURVES",
        "flowGuideFamilies": list(FLOW_GUIDE_FAMILIES),
        "flowGuideCurveCount": guide_count,
        "renderCurveCount": len(interpolated),
        "pointCountMin": min(point_counts),
        "pointCountMax": max(point_counts),
        "maxNeighbors": 4,
        "orientationPolicy": "SURFACE_NORMAL_NAMED_ATTRIBUTE_FOR_GUIDE_AND_POINT_UP",
    }


def frame_for_tangent(tangent: Vector, surface_normal: Vector) -> tuple[Vector, Vector]:
    tangent = tangent.normalized()
    outward = surface_normal.normalized()
    lateral = outward.cross(tangent)
    if lateral.length_squared < 1.0e-12:
        reference = Vector((0.0, 0.0, 1.0))
        lateral = reference.cross(tangent)
    lateral.normalize()
    outward = tangent.cross(lateral).normalized()
    return lateral, outward


def make_solid_strand_mesh(
    curves: list[list[tuple[float, float, float]]],
    surface: BVHTree,
    hairline_floor_fn,
) -> tuple[bpy.types.Object, dict[str, object]]:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    material_indices: list[int] = []
    for curve_index, stored_points in enumerate(curves):
        source_points = [Vector(point) for point in stored_points]
        if len(source_points) < 2:
            raise RuntimeError("Interpolated render curve cardinality is too small")
        width_noise = deterministic_rank(curve_index, stored_points[0])
        root = source_points[0]
        hairline_margin = max(0.0, root.y - hairline_floor_fn(root))
        edge_amount = max(0.0, min(1.0, hairline_margin / 0.006))
        crown_amount = max(0.0, min(1.0, (root.y - 0.445) / 0.055))
        random_width = (width_noise % 1009) / 1008.0
        random_length = ((width_noise >> 11) % 1013) / 1012.0
        random_shape = ((width_noise >> 21) % 1009) / 1008.0
        rear_half_width = (
            WEDGE_REAR_HALF_WIDTH_RANGE_METERS[0]
            + random_width
            * (
                WEDGE_REAR_HALF_WIDTH_RANGE_METERS[1]
                - WEDGE_REAR_HALF_WIDTH_RANGE_METERS[0]
            )
        )
        forward_half_width = (
            WEDGE_FORWARD_HALF_WIDTH_RANGE_METERS[0]
            + random_shape
            * (
                WEDGE_FORWARD_HALF_WIDTH_RANGE_METERS[1]
                - WEDGE_FORWARD_HALF_WIDTH_RANGE_METERS[0]
            )
        )
        length_min = (
            WEDGE_LENGTH_HAIRLINE_RANGE_METERS[0]
            + edge_amount * WEDGE_LENGTH_INTERIOR_BONUS_METERS[0]
            + crown_amount * WEDGE_LENGTH_CROWN_BONUS_METERS[0]
        )
        length_max = (
            WEDGE_LENGTH_HAIRLINE_RANGE_METERS[1]
            + edge_amount * WEDGE_LENGTH_INTERIOR_BONUS_METERS[1]
            + crown_amount * WEDGE_LENGTH_CROWN_BONUS_METERS[1]
        )
        wedge_length = length_min + random_length * (length_max - length_min)
        buried_depth = (
            WEDGE_BURIED_ROOT_RANGE_METERS[0]
            + random_shape
            * (
                WEDGE_BURIED_ROOT_RANGE_METERS[1]
                - WEDGE_BURIED_ROOT_RANGE_METERS[0]
            )
        )
        rear_roof_height = (
            WEDGE_REAR_ROOF_HEIGHT_RANGE_METERS[0]
            + random_width
            * (
                WEDGE_REAR_ROOF_HEIGHT_RANGE_METERS[1]
                - WEDGE_REAR_ROOF_HEIGHT_RANGE_METERS[0]
            )
        )
        forward_roof_height = (
            WEDGE_FORWARD_ROOF_HEIGHT_RANGE_METERS[0]
            + random_length
            * (
                WEDGE_FORWARD_ROOF_HEIGHT_RANGE_METERS[1]
                - WEDGE_FORWARD_ROOF_HEIGHT_RANGE_METERS[0]
            )
        )
        desired_rear_overhang = (
            WEDGE_REAR_OVERHANG_RANGE_METERS[0]
            + random_shape
            * (
                WEDGE_REAR_OVERHANG_RANGE_METERS[1]
                - WEDGE_REAR_OVERHANG_RANGE_METERS[0]
            )
        )
        rear_overhang = min(desired_rear_overhang, hairline_margin * 0.45)
        roof_material_index = 2 if width_noise % 29 == 0 else 1
        _, surface_normal, _, root_distance = surface.find_nearest(root)
        if surface_normal is None or root_distance is None or root_distance > 0.002:
            raise RuntimeError("Interpolated solid tuft root left the exact scalp")
        outward = surface_normal.normalized()
        tangent = source_points[min(3, len(source_points) - 1)] - source_points[0]
        tangent -= outward * tangent.dot(outward)
        if tangent.length_squared < 1.0e-12:
            raise RuntimeError("Interpolated solid tuft lost its scalp-tangent flow")
        tangent.normalize()
        if edge_amount < 0.90 and tangent.y < 0.0:
            tangent.negate()
        lateral = outward.cross(tangent).normalized()
        jitter_amount = (
            (((width_noise >> 7) % 1021) / 1020.0) - 0.5
        ) * 2.0 * WEDGE_FLOW_JITTER_RADIANS
        tangent = (tangent * math.cos(jitter_amount) + lateral * math.sin(jitter_amount)).normalized()
        lateral = outward.cross(tangent).normalized()

        def projected_roof_corner(candidate: Vector, height: float) -> Vector:
            location, normal, _, distance = surface.find_nearest(candidate)
            if location is None or normal is None or distance is None or distance > 0.003:
                raise RuntimeError("Scalp-conforming micro-wedge roof left the exact head")
            return location + normal.normalized() * height

        rear_center = root - tangent * rear_overhang
        forward_center = root + tangent * wedge_length
        rear_left = projected_roof_corner(
            rear_center - lateral * rear_half_width,
            rear_roof_height,
        )
        forward_left = projected_roof_corner(
            forward_center - lateral * forward_half_width,
            forward_roof_height,
        )
        forward_right = projected_roof_corner(
            forward_center + lateral * forward_half_width,
            forward_roof_height,
        )
        rear_right = projected_roof_corner(
            rear_center + lateral * rear_half_width,
            rear_roof_height,
        )
        buried_anchor = root - outward * buried_depth
        tuft_vertices = [
            buried_anchor,
            rear_left,
            forward_left,
            forward_right,
            rear_right,
        ]
        strand_start = len(vertices)
        vertices.extend(tuple(vertex) for vertex in tuft_vertices)
        clump_center = (
            tuft_vertices[0]
            + tuft_vertices[1]
            + tuft_vertices[2]
            + tuft_vertices[3]
            + tuft_vertices[4]
        ) / 5.0
        for face_index, local_face in enumerate(
            (
                (1, 2, 3),
                (1, 3, 4),
                (0, 1, 4),
                (0, 2, 1),
                (0, 3, 2),
                (0, 4, 3),
            )
        ):
            a, b, c = (tuft_vertices[index] for index in local_face)
            face_center = (a + b + c) / 3.0
            face_normal = (b - a).cross(c - a)
            if face_normal.dot(face_center - clump_center) < 0.0:
                local_face = (local_face[0], local_face[2], local_face[1])
            faces.append(tuple(strand_start + index for index in local_face))
            material_indices.append(roof_material_index if face_index < 2 else 0)

    mesh = bpy.data.meshes.new("SK_Hair_Cropped_SolidStrandLOD0Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("SK_Hair_Cropped_SolidStrandLOD0", mesh)
    bpy.context.collection.objects.link(obj)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index
        polygon.use_smooth = polygon.index % TRIANGLES_PER_STRAND < 2
    triangle_count = sum(max(1, len(polygon.vertices) - 2) for polygon in mesh.polygons)
    expected = len(curves) * TRIANGLES_PER_STRAND
    if triangle_count != expected:
        raise RuntimeError(f"Solid strand triangle accounting changed: {triangle_count} != {expected}")
    if not TARGET_TRIANGLES[0] <= triangle_count <= TARGET_TRIANGLES[1]:
        raise RuntimeError(f"Solid strand LOD0 misses triangle budget: {triangle_count}")
    return obj, {
        "status": "PASS",
        "strategy": "BLUE_NOISE_ROOTS_NATIVE_INTERPOLATED_TO_SCALP_CONFORMING_TRAPEZOIDAL_MICRO_WEDGES",
        "selectedStrands": len(curves),
        "selectedByFamily": {"BlueNoiseInterpolatedRenderRoots": len(curves)},
        "verticesPerClump": 5,
        "trianglesPerStrand": TRIANGLES_PER_STRAND,
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "triangles": triangle_count,
        "triangleBudget": list(TARGET_TRIANGLES),
        "separateClosedComponents": len(curves),
        "scalpShellObjects": 0,
        "alphaCards": 0,
        "geometryOpacity": "OPAQUE_SOLID",
        "crossSection": "CLOSED_TRAPEZOIDAL_MICRO_WEDGE_WITH_BVH_PROJECTED_ROOF_AND_BURIED_ANCHOR",
        "curveFit": "BLUE_NOISE_EXACT_SCALP_ROOTS_NATIVE_INTERPOLATED_FROM_V218_FLOW_GUIDES",
        "tipPolicy": "HASH_STAGGERED_TAPERED_FORWARD_ROOF_WITH_FOUR_DEGREE_FLOW_JITTER",
    }


def make_hair_material(name: str, color: tuple[float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.78
    if shader.inputs.get("Specular IOR Level"):
        shader.inputs["Specular IOR Level"].default_value = 0.18
    if shader.inputs.get("Anisotropic IOR Level"):
        shader.inputs["Anisotropic IOR Level"].default_value = 0.15
    if shader.inputs.get("Coat Weight"):
        shader.inputs["Coat Weight"].default_value = 0.0
    if shader.inputs.get("Sheen Weight"):
        shader.inputs["Sheen Weight"].default_value = 0.0
    return material


def apply_exact_head_follicle_undercoat(
    reference_head: bpy.types.Object,
    hairline_floor_fn,
) -> dict[str, object]:
    """Tint the existing scalp surface; never add a cap or shell object."""
    attribute_name = "CroppedFollicleProofMask"
    attribute = reference_head.data.attributes.get(attribute_name)
    if attribute is not None:
        reference_head.data.attributes.remove(attribute)
    attribute = reference_head.data.attributes.new(
        name=attribute_name,
        type="FLOAT_COLOR",
        domain="POINT",
    )
    values = []
    for vertex in reference_head.data.vertices:
        rank = deterministic_rank(vertex.index, tuple(vertex.co))
        noise = (((rank % 1009) / 1008.0) - 0.5) * 0.00080
        margin = vertex.co.y - hairline_floor_fn(vertex.co) + noise
        amount = max(0.0, min(1.0, (margin + 0.00055) / 0.00450))
        amount = amount * amount * (3.0 - 2.0 * amount)
        attribute.data[vertex.index].color = (amount, amount, amount, 1.0)
        values.append(amount)

    source_material = reference_head.data.materials[0].copy()
    source_material.name = "MAT_EvidenceNeutralGeometryClay_CroppedFollicle_00"
    reference_head.data.materials[0] = source_material
    source_shader = source_material.node_tree.nodes.get("Principled BSDF")
    if source_shader is None:
        raise RuntimeError("Exact-head follicle undercoat lost its Principled shader")
    source_color = tuple(source_shader.inputs["Base Color"].default_value)
    tint = (0.0090, 0.0060, 0.0045, 1.0)
    strength = 1.0
    bucket_count = 8
    for bucket in range(1, bucket_count):
        amount = bucket / (bucket_count - 1)
        material = source_material.copy()
        material.name = f"MAT_EvidenceNeutralGeometryClay_CroppedFollicle_{bucket:02d}"
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = tuple(
            source_color[channel] * (1.0 - amount * strength)
            + tint[channel] * amount * strength
            for channel in range(4)
        )
        reference_head.data.materials.append(material)
    bucket_counts = [0] * bucket_count
    for polygon in reference_head.data.polygons:
        amount = sum(values[index] for index in polygon.vertices) / len(polygon.vertices)
        bucket = max(0, min(bucket_count - 1, round(amount * (bucket_count - 1))))
        polygon.material_index = bucket
        bucket_counts[bucket] += 1
    return {
        "status": "PASS",
        "policy": "EXACT_HEAD_GRADED_POLYGON_FOLLICLE_TINT_NO_ADDED_GEOMETRY",
        "attribute": attribute_name,
        "strength": strength,
        "materialBucketCount": bucket_count,
        "materialBucketPolygonCounts": bucket_counts,
        "featherMeters": 0.0045,
        "irregularityMeters": 0.0008,
        "maskMin": min(values),
        "maskMax": max(values),
        "maskMean": sum(values) / len(values),
        "scalpShellObjects": 0,
        "capObjects": 0,
    }


def render_front(
    generator: ModuleType,
    reference_head: bpy.types.Object,
    hair: bpy.types.Object,
    output: Path,
    hair_only_debug: bool,
) -> dict[str, object]:
    # Captured v218 points are in the exact head's local coordinate system.
    # Carry the imported glTF node transform onto the proof object, exactly as
    # the accepted v218 diagnostic renderer does for its disposable curves.
    hair.matrix_world = reference_head.matrix_world.copy()
    hair.data.materials.append(make_hair_material("MAT_CroppedLOD0_Sidewall", (0.0085, 0.0058, 0.0045)))
    hair.data.materials.append(make_hair_material("MAT_CroppedLOD0_Roof", (0.0120, 0.0085, 0.0065)))
    hair.data.materials.append(make_hair_material("MAT_CroppedLOD0_RoofVariation", (0.0135, 0.0095, 0.0073)))
    camera, target, face_axis, vertical_axis, _ = generator.prepare_evidence_scene(
        reference_head,
        neutral_geometry_material=True,
    )
    follicle_undercoat = (
        {"status": "DISABLED_HAIR_ONLY_DEBUG"}
        if hair_only_debug
        else apply_exact_head_follicle_undercoat(
            reference_head,
            generator.cropped_hairline_floor,
        )
    )
    if hair_only_debug:
        for obj in bpy.context.scene.objects:
            if obj.type == "MESH" and obj != hair:
                obj.hide_render = True
    renderable_mesh_audit = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        material_slots = []
        for material in obj.data.materials:
            shader = (
                material.node_tree.nodes.get("Principled BSDF")
                if material is not None and material.use_nodes
                else None
            )
            material_slots.append(
                {
                    "name": material.name if material is not None else None,
                    "baseColor": (
                        list(shader.inputs["Base Color"].default_value)
                        if shader is not None
                        else None
                    ),
                }
            )
        renderable_mesh_audit.append(
            {
                "name": obj.name,
                "polygons": len(obj.data.polygons),
                "materials": material_slots,
            }
        )
    print("CROPPED_STRAND_RENDERABLE_MESH_AUDIT=" + json.dumps(renderable_mesh_audit))
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    camera.location = target + face_axis * 0.285 + vertical_axis * 0.050
    generator.look_at(camera, target + vertical_axis * 0.034)
    output.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    return follicle_undercoat


def build() -> dict[str, object]:
    args = parse_args()
    generator_path = Path(args.generator).resolve()
    source_head_path = Path(args.source_head).resolve()
    locked_path = Path(args.locked_diagnostic).resolve()
    issue448_root = Path(args.issue448_hair_root).resolve()
    evidence_dir = Path(args.evidence_dir).resolve()
    for required in (generator_path, source_head_path, locked_path):
        if not required.is_file():
            raise RuntimeError(f"Required input missing: {required}")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    generator = load_generator(generator_path)
    source_head_sha256 = file_sha256(source_head_path)
    if source_head_sha256 != generator.SOURCE_HEAD_SHA256:
        raise RuntimeError("Exact Human head hash contract changed")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = generator.imported_glb_objects(source_head_path)
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError("Expected one canonical Human armature")
    reference_head = bpy.data.objects.get("HumanFoundation_HeadBase")
    if reference_head is None:
        raise RuntimeError("Exact modular Human head is missing")
    captured = capture_locked_postnode_curves(
        generator,
        reference_head,
        armatures[0],
        issue448_root,
        evidence_dir,
    )
    lock_validation = validate_against_v218(captured, locked_path, source_head_sha256)
    surface = generator.exact_head_surface(reference_head)
    render_roots, render_normals, root_distribution = generate_blue_noise_render_roots(
        generator,
        surface,
    )
    interpolated_curves, interpolation = interpolate_render_curves(
        generator,
        reference_head,
        captured,
        render_roots,
        render_normals,
    )
    hair, geometry = make_solid_strand_mesh(
        interpolated_curves,
        surface,
        generator.cropped_hairline_floor,
    )
    output_image = evidence_dir / "SK_Hair_Cropped" / "front.png"
    follicle_undercoat = render_front(
        generator,
        reference_head,
        hair,
        output_image,
        args.hair_only_debug,
    )
    report = {
        "schemaVersion": 1,
        "issue": ISSUE,
        "status": "QUARANTINED_VISUAL_QA_REJECTED",
        "module": MODULE_NAME,
        "route": "SOLID_TAPERED_STRAND_LOD0_ONLY_GAMEPLAY_CARDS_DEFERRED",
        "toolchain": {
            "binary": str(Path(bpy.app.binary_path).resolve()).replace("\\", "/"),
            "blenderVersion": bpy.app.version_string,
            "officialHairCurveStage": SOURCE_STAGE,
        },
        "inputs": {
            "generator": str(generator_path).replace("\\", "/"),
            "generatorSha256": file_sha256(generator_path),
            "sourceHead": str(source_head_path).replace("\\", "/"),
            "sourceHeadSha256": source_head_sha256,
        },
        "v218LockValidation": lock_validation,
        "renderRootDistribution": root_distribution,
        "nativeInterpolation": interpolation,
        "geometry": geometry,
        "follicleUndercoat": follicle_undercoat,
        "visualGate": {
            "resolution": [640, 640],
            "view": "front",
            "requiredRejectConditions": ["NEEDLES", "CORNROWS", "CAP", "BALD"],
            "selfReview": "REJECT_CAP_SHINGLE_PATTERN_PALE_SCALP_READ",
            "image": str(output_image).replace("\\", "/"),
        },
        "promotion": "FORBIDDEN_PROOF_ONLY",
        "gameplayLodCards": "FUTURE_LOD_NOT_BUILT_BY_THIS_PROOF",
    }
    report_path = evidence_dir / "cropped-strand-lod0-proof.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CROPPED_STRAND_LOD0_PROOF=" + json.dumps(report, sort_keys=True))
    return report


if __name__ == "__main__":
    build()
