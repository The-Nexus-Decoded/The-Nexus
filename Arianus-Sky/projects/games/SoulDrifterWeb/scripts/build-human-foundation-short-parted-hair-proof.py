"""Build a native Blender short, side-parted Human hair proof.

This proof keeps guide authoring separate from child interpolation.  It imports
the canonical Human head, extracts a hidden scalp surface from that exact mesh,
creates a small guide-curves object, and loads Blender's bundled Essentials hair
node groups rather than recreating Blender's interpolation system in Python.

Run with Blender 5.2+::

    blender --background --python build-human-foundation-short-parted-hair-proof.py -- --help
"""

from __future__ import annotations

import argparse
from bisect import bisect_left
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Iterable

import bpy
import bmesh
from mathutils import Matrix, Vector


SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[1]
DEFAULT_SOURCE_ASSET = (
    PROJECT_ROOT
    / "public"
    / "assets"
    / "3d"
    / "characters"
    / "human-foundation-pilot"
    / "human-foundation-pilot-modular-head-base.glb"
)
DEFAULT_EVIDENCE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487"
)
HEAD_OBJECT_NAME = "HumanFoundation_HeadBase"
SCALP_OBJECT_NAME = "HumanFoundation_HairScalp"
GUIDE_OBJECT_NAME = "HumanFoundation_HairGuides"
SCALP_UV_NAME = "HumanFoundation_ScalpUV"
DENSITY_MASK_ATTRIBUTE = "human_hair_density_mask"
MACRO_GUIDE_MAP_ATTRIBUTE = "human_macro_clump_index"
WORLD_UP = Vector((0.0, 0.0, 1.0))
WORLD_FORWARD = Vector((1.0, 0.0, 0.0))
WORLD_RIGHT = Vector((0.0, -1.0, 0.0))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_exact_head(source_asset: Path, object_name: str = HEAD_OBJECT_NAME) -> bpy.types.Object:
    """Import only the canonical modular Human head from blend or glTF source."""
    if not source_asset.is_file():
        raise FileNotFoundError(f"Canonical Human source not found: {source_asset}")
    suffix = source_asset.suffix.casefold()
    if suffix == ".blend":
        with bpy.data.libraries.load(str(source_asset), link=False) as (source, target):
            candidates = (object_name, "HumanFoundation_HeadBase", "HeadBase")
            match = next((name for name in candidates if name in source.objects), None)
            if match is None:
                matches = [
                    name
                    for name in source.objects
                    if name and ("headbase" in name.casefold() or "head_base" in name.casefold())
                ]
                raise RuntimeError(
                    f"{object_name!r} missing from {source_asset}; possible matches: {matches}"
                )
            target.objects = [match]
        head = target.objects[0]
        if head is not None:
            bpy.context.collection.objects.link(head)
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(source_asset))
        candidates = (object_name, "HumanFoundation_HeadBase", "HeadBase")
        head = next((bpy.data.objects.get(name) for name in candidates if bpy.data.objects.get(name)), None)
    else:
        raise RuntimeError(f"Unsupported canonical Human source type: {source_asset.suffix}")
    if head is None or head.type != "MESH":
        raise RuntimeError(f"{object_name!r} did not resolve to a mesh")
    preserved_world_matrix = head.matrix_world.copy()
    head.data.transform(preserved_world_matrix, shape_keys=True)
    head.parent = None
    head.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for candidate in tuple(bpy.context.scene.objects):
        if candidate != head:
            bpy.data.objects.remove(candidate, do_unlink=True)
    bpy.context.view_layer.update()
    maximum_matrix_delta = max(
        abs(head.matrix_world[row][column] - Matrix.Identity(4)[row][column])
        for row in range(4)
        for column in range(4)
    )
    if maximum_matrix_delta > 1.0e-8:
        raise RuntimeError("Canonical Human head transform was not normalized during isolation")
    head.name = HEAD_OBJECT_NAME
    head.hide_render = False
    return head


def verify_head_axis_contract(head: bpy.types.Object) -> dict[str, object]:
    """Verify the imported Human's world-space forward/right/up contract."""
    matrix = head.matrix_world
    basis = matrix.to_3x3()
    local_forward = (basis @ Vector((1.0, 0.0, 0.0))).normalized()
    local_up = (basis @ Vector((0.0, 0.0, 1.0))).normalized()
    local_right = (basis @ Vector((0.0, -1.0, 0.0))).normalized()
    alignment = {
        "forward": float(local_forward.dot(WORLD_FORWARD)),
        "up": float(local_up.dot(WORLD_UP)),
        "right": float(local_right.dot(WORLD_RIGHT)),
    }
    if min(alignment.values()) < 0.999:
        raise RuntimeError(f"Canonical Human head axis contract changed: {alignment}")
    world_vertices = [matrix @ vertex.co for vertex in head.data.vertices]
    bounds = [
        (min(point[axis] for point in world_vertices), max(point[axis] for point in world_vertices))
        for axis in range(3)
    ]
    spans = [high - low for low, high in bounds]
    if spans[2] <= spans[0] or spans[2] <= spans[1]:
        raise RuntimeError(f"Canonical Human head vertical span is no longer dominant: {spans}")
    return {
        "alignment": alignment,
        "bounds_world": [[float(low), float(high)] for low, high in bounds],
        "spans_world": [float(value) for value in spans],
    }


def hairline_floor_world(
    world_position: Vector,
    bounds: list[tuple[float, float]],
) -> float:
    """A conservative exact-head hairline, lower at rear and higher at forehead."""
    x_min, x_max = bounds[0]
    z_min, z_max = bounds[2]
    depth = max(1.0e-8, x_max - x_min)
    height = max(1.0e-8, z_max - z_min)
    front_fraction = max(0.0, min(1.0, (world_position.x - x_min) / depth))
    front_rise = front_fraction * front_fraction * (3.0 - 2.0 * front_fraction)
    return z_min + height * (0.50 + 0.20 * front_rise)


def extract_exact_head_scalp(
    head: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Extract the exact scalp in verified Human world axes and clean topology."""
    axis_receipt = verify_head_axis_contract(head)
    scalp = head.copy()
    scalp.data = head.data.copy()
    scalp.name = SCALP_OBJECT_NAME
    scalp.data.name = f"{SCALP_OBJECT_NAME}_Mesh"
    bpy.context.collection.objects.link(scalp)

    mesh = scalp.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    world_vertices = [scalp.matrix_world @ vertex.co for vertex in mesh.vertices]
    bounds = [
        (min(point[axis] for point in world_vertices), max(point[axis] for point in world_vertices))
        for axis in range(3)
    ]
    normal_matrix = scalp.matrix_world.to_3x3().inverted().transposed()
    remove = []
    for face in bm.faces:
        center_world = scalp.matrix_world @ face.calc_center_median()
        normal_world = (normal_matrix @ face.normal).normalized()
        y_center = (bounds[1][0] + bounds[1][1]) * 0.5
        y_half_span = max(1.0e-8, (bounds[1][1] - bounds[1][0]) * 0.5)
        side_fraction = abs(center_world.y - y_center) / y_half_span
        keep = (
            center_world.z >= hairline_floor_world(center_world, bounds)
            and normal_world.dot(WORLD_UP) > -0.45
            and side_fraction <= 0.92
        )
        if not keep:
            remove.append(face)
    bmesh.ops.delete(bm, geom=remove, context="FACES")
    loose_edges = [edge for edge in bm.edges if not edge.link_faces]
    if loose_edges:
        bmesh.ops.delete(bm, geom=loose_edges, context="EDGES")
    loose_vertices = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose_vertices:
        bmesh.ops.delete(bm, geom=loose_vertices, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if not mesh.polygons:
        raise RuntimeError("Exact-head scalp extraction selected no polygons")
    loose_edge_count = sum(1 for edge in mesh.edges if edge.is_loose)
    used_vertices = {index for polygon in mesh.polygons for index in polygon.vertices}
    loose_vertex_count = len(mesh.vertices) - len(used_vertices)
    if loose_edge_count or loose_vertex_count:
        raise RuntimeError(
            "Exact-head scalp cleanup left loose topology: "
            f"edges={loose_edge_count}, vertices={loose_vertex_count}"
        )
    uv_map = mesh.uv_layers.active
    if uv_map is None:
        uv_map = mesh.uv_layers.new(name=SCALP_UV_NAME)
        for loop in mesh.loops:
            position = mesh.vertices[loop.vertex_index].co
            loop_world = scalp.matrix_world @ position
            x_min, x_max = bounds[0]
            y_min, y_max = bounds[1]
            uv_map.data[loop.index].uv = (
                (loop_world.y - y_min) / max(1.0e-8, y_max - y_min),
                (loop_world.x - x_min) / max(1.0e-8, x_max - x_min),
            )
    rest_position = mesh.attributes.get("rest_position")
    if rest_position is None:
        rest_position = mesh.attributes.new(
            name="rest_position",
            type="FLOAT_VECTOR",
            domain="POINT",
        )
    for destination, vertex in zip(rest_position.data, mesh.vertices):
        destination.vector = vertex.co
    density_mask = mesh.attributes.get(DENSITY_MASK_ATTRIBUTE)
    if density_mask is None:
        density_mask = mesh.attributes.new(
            name=DENSITY_MASK_ATTRIBUTE,
            type="FLOAT",
            domain="POINT",
        )
    for destination, vertex in zip(density_mask.data, mesh.vertices):
        world_position = scalp.matrix_world @ vertex.co
        distance_above = world_position.z - hairline_floor_world(world_position, bounds)
        feather_width = max(1.0e-8, (bounds[2][1] - bounds[2][0]) * 0.055)
        vertical_density = max(0.0, min(1.0, distance_above / feather_width))
        y_center = (bounds[1][0] + bounds[1][1]) * 0.5
        y_half_span = max(1.0e-8, (bounds[1][1] - bounds[1][0]) * 0.5)
        side_fraction = abs(world_position.y - y_center) / y_half_span
        lateral_density = 1.0 - max(0.0, min(1.0, (side_fraction - 0.82) / 0.10))
        destination.value = vertical_density * lateral_density

    scalp.hide_render = True
    scalp.display_type = "WIRE"
    scalp_receipt = {
        **axis_receipt,
        "polygon_count": len(mesh.polygons),
        "vertex_count": len(mesh.vertices),
        "loose_edge_count": loose_edge_count,
        "loose_vertex_count": loose_vertex_count,
        "uv_map": uv_map.name,
        "density_mask_attribute": DENSITY_MASK_ATTRIBUTE,
        "density_mask_range": [
            float(min(value.value for value in density_mask.data)),
            float(max(value.value for value in density_mask.data)),
        ],
    }
    return scalp, scalp_receipt


def create_initial_guide_curves(
    scalp: bpy.types.Object,
    guide_count: int = 160,
    points_per_curve: int = 8,
) -> bpy.types.Object:
    """Author regional short-parted guides from eight-angle reference structure."""
    if guide_count < 8 or points_per_curve < 4:
        raise ValueError("Guide set is too small for a stable groom")
    mesh = scalp.data
    mesh.calc_loop_triangles()
    triangles = list(mesh.loop_triangles)
    if not triangles:
        raise RuntimeError("Scalp has no triangles for area-stratified guide roots")
    cumulative_areas: list[float] = []
    total_area = 0.0
    for triangle in triangles:
        world_points = [scalp.matrix_world @ mesh.vertices[index].co for index in triangle.vertices]
        area = (world_points[1] - world_points[0]).cross(world_points[2] - world_points[0]).length * 0.5
        total_area += area
        cumulative_areas.append(total_area)
    if total_area <= 1.0e-10:
        raise RuntimeError("Scalp surface area is degenerate")
    roots: list[tuple[Vector, Vector]] = []
    golden_fraction = 0.6180339887498949
    for root_index in range(guide_count):
        area_target = total_area * ((root_index + 0.5) / guide_count)
        triangle = triangles[min(bisect_left(cumulative_areas, area_target), len(triangles) - 1)]
        phase = (0.5 + root_index * golden_fraction) % 1.0
        radial = math.sqrt((0.5 + root_index * 0.7548776662466927) % 1.0)
        barycentric = (1.0 - radial, radial * (1.0 - phase), radial * phase)
        position = Vector((0.0, 0.0, 0.0))
        normal = Vector((0.0, 0.0, 0.0))
        for weight, vertex_index in zip(barycentric, triangle.vertices):
            vertex = mesh.vertices[vertex_index]
            position += vertex.co * weight
            normal += vertex.normal * weight
        roots.append((position, normal.normalized()))

    world_vertices = [scalp.matrix_world @ vertex.co for vertex in mesh.vertices]
    bounds = [
        (min(point[axis] for point in world_vertices), max(point[axis] for point in world_vertices))
        for axis in range(3)
    ]
    x_min, x_max = bounds[0]
    y_min, y_max = bounds[1]
    z_min, z_max = bounds[2]
    y_center = (y_min + y_max) * 0.5
    y_half_span = max(1.0e-8, (y_max - y_min) * 0.5)
    inverse_basis = scalp.matrix_world.to_3x3().inverted()
    region_counts = {"front": 0, "crown": 0, "temple": 0, "rear_nape": 0}
    region_lengths: dict[str, list[float]] = {name: [] for name in region_counts}

    native_positions: list[Vector] = []
    root_world_positions: list[Vector] = []
    front_fractions: list[float] = []
    side_fractions: list[float] = []
    height_fractions: list[float] = []

    for root_index, (position, normal) in enumerate(roots):
        root_world = scalp.matrix_world @ position
        front_fraction = max(0.0, min(1.0, (root_world.x - x_min) / max(1.0e-8, x_max - x_min)))
        height_fraction = max(0.0, min(1.0, (root_world.z - z_min) / max(1.0e-8, z_max - z_min)))
        side_fraction = max(0.0, min(1.0, abs(root_world.y - y_center) / y_half_span))
        root_world_positions.append(root_world)
        front_fractions.append(front_fraction)
        side_fractions.append(side_fraction)
        height_fractions.append(height_fraction)
        centerward = Vector((0.0, -1.0 if root_world.y > y_center else 1.0, 0.0))
        variation = 0.78 + 0.22 * ((root_index * 0.5698402909980532) % 1.0)
        flow_jitter = Vector(
            (
                0.05 * math.cos(root_index * 1.324717957244746),
                0.14 * math.sin(root_index * 2.399963229728653),
                0.10 * math.cos(root_index * 1.618033988749895),
            )
        )

        if front_fraction >= 0.67:
            region = "front"
            side_sweep_fraction = max(0.0, min(1.0, (root_world.y - y_min) / max(1.0e-8, y_max - y_min)))
            asymmetric_fringe = 0.018 * side_sweep_fraction
            broken_fringe = 0.0012 * math.sin(root_index * 2.399963229728653)
            length = max(
                0.010,
                (0.010 + 0.0025 * front_fraction + asymmetric_fringe) * variation
                + broken_fringe,
            )
            flow_world = (
                WORLD_FORWARD * 0.14
                + WORLD_UP * 0.10
                + Vector((0.0, -0.92, 0.0))
            )
            silhouette_lift = 0.0036
            tip_lift = 0.0028
        elif front_fraction <= 0.30:
            region = "rear_nape"
            rear_to_crown = max(0.0, min(1.0, front_fraction / 0.30))
            rear_to_crown = rear_to_crown * rear_to_crown * (3.0 - 2.0 * rear_to_crown)
            rear_flow = -WORLD_FORWARD * 0.08 - WORLD_UP * 0.82 + centerward * 0.16
            crown_flow = (
                WORLD_FORWARD * 0.70
                - WORLD_UP * 0.03
                + Vector((0.0, -0.46, 0.0))
            )
            flow_world = rear_flow.lerp(crown_flow, rear_to_crown)
            length = (0.010 + 0.006 * rear_to_crown + 0.0015 * height_fraction) * variation
            silhouette_lift = 0.0008 + 0.0017 * rear_to_crown
            tip_lift = 0.0004 + 0.0010 * rear_to_crown
        else:
            region = "crown"
            side_sweep_fraction = max(0.0, min(1.0, (root_world.y - y_min) / max(1.0e-8, y_max - y_min)))
            length = (0.015 + 0.009 * side_sweep_fraction + 0.004 * height_fraction) * variation
            flow_world = (
                WORLD_FORWARD * 0.30
                + WORLD_UP * 0.08
                + Vector((0.0, -0.78, 0.0))
            )
            silhouette_lift = 0.0034
            tip_lift = 0.0020
        flow_world += flow_jitter
        if side_fraction >= 0.72:
            temple_blend = max(0.0, min(1.0, (side_fraction - 0.72) / 0.28))
            temple_blend = temple_blend * temple_blend * (3.0 - 2.0 * temple_blend)
            temple_flow = -WORLD_FORWARD * 0.18 - WORLD_UP * 0.68 + centerward * 0.14
            temple_length = (0.0004 + (1.0 - side_fraction) * 0.010) * variation
            flow_world = flow_world.lerp(temple_flow, temple_blend)
            length = length * (1.0 - temple_blend) + temple_length * temple_blend
            silhouette_lift = silhouette_lift * (1.0 - temple_blend) + 0.00005 * temple_blend
            tip_lift *= 1.0 - temple_blend
            region = "temple"
        region_counts[region] += 1
        region_lengths[region].append(length)

        flow_local = (inverse_basis @ flow_world).normalized()
        tangent = flow_local - normal * flow_local.dot(normal)
        if tangent.length_squared < 1.0e-10:
            tangent = Vector((0.0, 1.0, 0.0)) - normal * normal.y
        tangent.normalize()
        for index in range(points_per_curve):
            t = index / (points_per_curve - 1)
            if index == 0:
                guide_position = position
            else:
                eased = t * t * (3.0 - 2.0 * t)
                clearance = (
                    0.00075
                    + silhouette_lift * math.sin(math.pi * t) ** 1.2
                    + 0.00045 * t
                    + tip_lift * t ** 1.8
                )
                guide_position = position + tangent * (length * eased) + normal * clearance
            native_positions.append(guide_position.copy())

    expected_point_count = len(roots) * points_per_curve
    if len(native_positions) != expected_point_count:
        raise RuntimeError(
            "Native guide authoring emitted an unexpected point count: "
            f"expected={expected_point_count}, actual={len(native_positions)}"
        )
    if any(count == 0 for count in region_counts.values()):
        local_root_positions = [position for position, _ in roots]
        local_vertex_positions = [vertex.co for vertex in mesh.vertices]
        local_root_bounds = [
            [
                min(point[axis] for point in local_root_positions),
                max(point[axis] for point in local_root_positions),
            ]
            for axis in range(3)
        ]
        local_scalp_bounds = [
            [
                min(point[axis] for point in local_vertex_positions),
                max(point[axis] for point in local_vertex_positions),
            ]
            for axis in range(3)
        ]
        root_bounds = [
            [
                min(point[axis] for point in root_world_positions),
                max(point[axis] for point in root_world_positions),
            ]
            for axis in range(3)
        ]
        raise RuntimeError(
            "Regional guide authoring missed a required hairstyle zone: "
            f"counts={region_counts}, root_bounds={root_bounds}, scalp_bounds={bounds}, "
            f"local_root_bounds={local_root_bounds}, local_scalp_bounds={local_scalp_bounds}, "
            f"scalp_matrix={[list(row) for row in scalp.matrix_world]}, "
            f"front_range={[min(front_fractions), max(front_fractions)]}, "
            f"side_range={[min(side_fractions), max(side_fractions)]}, "
            f"height_range={[min(height_fractions), max(height_fractions)]}"
        )

    root_clearances = []
    for root_position in native_positions[::points_per_curve]:
        found, surface_position, _, _ = scalp.closest_point_on_mesh(
            root_position,
            distance=0.01,
        )
        if not found:
            raise RuntimeError("A native guide root could not be projected to the exact scalp")
        root_clearances.append((root_position - surface_position).length)
    maximum_root_clearance = max(root_clearances, default=float("inf"))
    if maximum_root_clearance > 1.0e-5:
        raise RuntimeError(
            "Native guide roots are detached from the exact scalp: "
            f"maximum_clearance_m={maximum_root_clearance:.9f}"
        )

    curve_data = bpy.data.hair_curves.new(f"{GUIDE_OBJECT_NAME}_HairCurves")
    curve_data.add_curves([points_per_curve] * len(roots))
    position_attribute = curve_data.attributes.get("position")
    if position_attribute is None:
        raise RuntimeError("Blender did not create the native Hair Curves position attribute")
    position_attribute.data.foreach_set(
        "vector",
        [coordinate for point in native_positions for coordinate in point],
    )
    curve_data.surface = scalp
    curve_data.surface_uv_map = scalp.data.uv_layers.active.name
    guide_object = bpy.data.objects.new(GUIDE_OBJECT_NAME, curve_data)
    bpy.context.collection.objects.link(guide_object)
    guide_object["souldrifter_guide_count"] = len(roots)
    guide_object["souldrifter_points_per_guide"] = points_per_curve
    guide_object["souldrifter_surface_object"] = scalp.name
    guide_object.matrix_world = scalp.matrix_world.copy()
    groom = guide_object
    groom["souldrifter_guide_count"] = len(roots)
    groom["souldrifter_points_per_guide"] = points_per_curve
    groom["souldrifter_surface_object"] = scalp.name
    groom["souldrifter_reference_structure"] = (
        "short fantasy side-swept undercut, lifted broken top, compressed temples, "
        "asymmetric front, continuously blended rear flow, tapered nape"
    )
    groom["souldrifter_region_counts"] = json.dumps(region_counts, sort_keys=True)
    groom["souldrifter_maximum_root_clearance_m"] = maximum_root_clearance
    groom["souldrifter_region_length_m"] = json.dumps(
        {
            name: [min(values), max(values)] if values else [0.0, 0.0]
            for name, values in region_lengths.items()
        },
        sort_keys=True,
    )
    return groom


def create_short_fiber_undercoat(
    groom: bpy.types.Object,
    scalp: bpy.types.Object,
    length_factor: float = 0.45,
) -> bpy.types.Object:
    """Derive dense root fibers from the evaluated child groom, never from sparse guides."""
    if not 0.0 < length_factor < 1.0:
        raise ValueError(f"Undercoat length factor must be between zero and one: {length_factor}")
    bpy.context.view_layer.update()
    evaluated = groom.evaluated_get(bpy.context.evaluated_depsgraph_get())
    source_curve_count = len(evaluated.data.curves)
    source_point_count = len(evaluated.data.points)
    if source_curve_count == 0 or source_point_count % source_curve_count:
        raise RuntimeError(
            "Evaluated groom cannot produce a uniform dense undercoat: "
            f"curves={source_curve_count}, points={source_point_count}"
        )
    source_points_per_curve = source_point_count // source_curve_count
    if source_points_per_curve < 4:
        raise RuntimeError(
            f"Evaluated groom has too few points per curve: {source_points_per_curve}"
        )
    source_positions = evaluated.data.attributes.get("position")
    if source_positions is None:
        raise RuntimeError("Evaluated groom lost its native Hair Curves position attribute")
    sample_indices = (0, source_points_per_curve // 3, (source_points_per_curve * 2) // 3, source_points_per_curve - 1)
    undercoat_positions: list[Vector] = []
    for curve_index in range(source_curve_count):
        start = curve_index * source_points_per_curve
        root = Vector(source_positions.data[start].vector)
        for sample_index in sample_indices:
            point = Vector(source_positions.data[start + sample_index].vector)
            undercoat_positions.append(root + (point - root) * length_factor)

    curve_data = bpy.data.hair_curves.new("HumanFoundation_HairUndercoatCurves")
    curve_data.add_curves([len(sample_indices)] * source_curve_count)
    positions = curve_data.attributes.get("position")
    if positions is None:
        raise RuntimeError("Dense undercoat did not create a native position attribute")
    positions.data.foreach_set(
        "vector",
        [coordinate for point in undercoat_positions for coordinate in point],
    )
    curve_data.surface = scalp
    curve_data.surface_uv_map = scalp.data.uv_layers.active.name
    undercoat = bpy.data.objects.new("HumanFoundation_HairUndercoatGuides", curve_data)
    bpy.context.collection.objects.link(undercoat)
    undercoat.matrix_world = groom.matrix_world.copy()
    undercoat["souldrifter_role"] = "short_fiber_root_undercoat"
    undercoat["souldrifter_length_factor"] = length_factor
    undercoat["souldrifter_visible_cap_mesh"] = False
    undercoat["souldrifter_source_curve_count"] = source_curve_count
    return undercoat


def configure_undercoat_profile(undercoat: bpy.types.Object) -> dict[str, object]:
    """Give dense native root fibers a conservative physical profile without re-interpolation."""
    node_groups = load_official_hair_node_assets(("Set Hair Curve Profile",))
    profile = add_official_hair_modifier(
        undercoat,
        node_groups,
        "01 Dense Root Fiber Profile",
        "Set Hair Curve Profile",
    )
    for name, value in (
        ("Replace Radius", True),
        ("Radius", 0.000060),
        ("Shape", 0.55),
        ("Factor Min", 0.75),
        ("Factor Max", 1.0),
    ):
        set_modifier_value(profile, name, value)
    return {
        "source": "evaluated_child_roots",
        "curve_count": len(undercoat.data.curves),
        "point_count": len(undercoat.data.points),
        "modifier_names": [modifier.name for modifier in undercoat.modifiers],
    }


def official_hair_asset_library() -> Path:
    """Resolve Blender 5.2's bundled procedural hair node library exactly."""
    path = (
        Path(bpy.utils.system_resource("DATAFILES"))
        / "assets"
        / "nodes"
        / "procedural_hair_node_assets.blend"
    )
    if not path.is_file():
        raise FileNotFoundError(f"Official Blender procedural hair assets missing: {path}")
    return path


def load_official_hair_node_assets(
    asset_names: tuple[str, ...],
) -> dict[str, bpy.types.NodeTree]:
    """Append the audited official Blender 5.2 procedural-hair groups."""
    library_path = official_hair_asset_library()
    with bpy.data.libraries.load(
        str(library_path), link=False, assets_only=False
    ) as (source, target):
        missing = [name for name in asset_names if name not in source.node_groups]
        if missing:
            raise RuntimeError(f"Official Blender hair groups missing: {missing}")
        target.node_groups = list(asset_names)
    loaded = {
        requested: node_group
        for requested, node_group in zip(asset_names, target.node_groups)
        if node_group is not None
    }
    if set(loaded) != set(asset_names):
        raise RuntimeError(f"Official Blender hair-node append incomplete: {sorted(loaded)}")
    for node_group in loaded.values():
        node_group["souldrifter_official_asset_source"] = str(library_path)
    return loaded


def interface_identifier(
    group: bpy.types.NodeTree,
    display_name: str,
    *,
    in_out: str = "INPUT",
    socket_type: str | None = None,
) -> str:
    matches = [
        item
        for item in group.interface.items_tree
        if getattr(item, "item_type", None) == "SOCKET"
        and item.in_out == in_out
        and item.name == display_name
        and (socket_type is None or item.socket_type == socket_type)
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"Official hair socket contract changed: {group.name} "
            f"{in_out} {display_name} {socket_type}; matches={len(matches)}"
        )
    return matches[0].identifier


def set_modifier_value(
    modifier: bpy.types.Modifier,
    display_name: str,
    value: object,
    *,
    socket_type: str | None = None,
) -> None:
    identifier = interface_identifier(
        modifier.node_group, display_name, socket_type=socket_type
    )
    getattr(modifier.properties.inputs, identifier).value = value


def set_modifier_attribute(
    modifier: bpy.types.Modifier,
    display_name: str,
    attribute_name: str,
) -> None:
    identifier = interface_identifier(modifier.node_group, display_name)
    getattr(modifier.properties.inputs, identifier).attribute_name = attribute_name


def set_modifier_output_attribute(
    modifier: bpy.types.Modifier,
    display_name: str,
    attribute_name: str,
) -> None:
    identifier = interface_identifier(
        modifier.node_group, display_name, in_out="OUTPUT"
    )
    getattr(modifier.properties.outputs, identifier).attribute_name = attribute_name


def add_official_hair_modifier(
    groom: bpy.types.Object,
    node_groups: dict[str, bpy.types.NodeTree],
    modifier_name: str,
    group_name: str,
) -> bpy.types.Modifier:
    modifier = groom.modifiers.new(name=modifier_name, type="NODES")
    modifier.node_group = node_groups[group_name]
    return modifier


def configure_official_hair_chain(
    groom: bpy.types.Object,
    scalp: bpy.types.Object,
    density: float = 2_500_000.0,
) -> dict[str, object]:
    """Wire Blender's audited, non-destructive 5.2 groom modifier stack."""
    group_names = (
        "Attach Hair Curves to Surface",
        "Interpolate Hair Curves",
        "Trim Hair Curves",
        "Shrinkwrap Hair Curves",
        "Clump Hair Curves",
        "Hair Curves Noise",
        "Frizz Hair Curves",
        "Set Hair Curve Profile",
    )
    node_groups = load_official_hair_node_assets(group_names)
    uv_name = scalp.data.uv_layers.active.name

    attach = add_official_hair_modifier(
        groom, node_groups, "01 Attach to Exact Human Scalp", "Attach Hair Curves to Surface"
    )
    set_modifier_value(attach, "Surface Source", "Object")
    set_modifier_value(attach, "Surface Object", scalp, socket_type="NodeSocketObject")
    set_modifier_attribute(attach, "Surface UV Map", uv_name)
    set_modifier_value(attach, "Resting Surface", True)
    set_modifier_value(attach, "Use Existing Attachment", False)
    set_modifier_value(attach, "Snap to Surface", True)
    set_modifier_value(attach, "Blend along Curve", 0.08)
    set_modifier_value(attach, "Align to Surface Normal", True)
    set_modifier_output_attribute(attach, "Surface UV Coordinate", "surface_uv_coordinate")
    set_modifier_output_attribute(attach, "Surface Normal", "surface_normal")

    interpolation_group = node_groups["Interpolate Hair Curves"].copy()
    interpolation_group.name = "SoulDrifter Interpolate Hair Curves"
    density_socket = next(
        item
        for item in interpolation_group.interface.items_tree
        if getattr(item, "item_type", None) == "SOCKET"
        and item.in_out == "INPUT"
        and item.identifier == "Input_15"
    )
    density_socket.max_value = 3_000_000.0
    interpolate = groom.modifiers.new(name="02 Interpolate Exact-Scalp Children", type="NODES")
    interpolate.node_group = interpolation_group
    set_modifier_value(interpolate, "Resting Surface", True)
    set_modifier_value(interpolate, "Follow Surface Normal", True)
    set_modifier_value(interpolate, "Part by Mesh Islands", False)
    set_modifier_value(interpolate, "Interpolation Guides", 4)
    set_modifier_value(interpolate, "Distance to Guides", 0.12)
    set_modifier_value(interpolate, "Distribution Method", "Random")
    set_modifier_value(interpolate, "Density", density)
    set_modifier_attribute(interpolate, "Density Mask", DENSITY_MASK_ATTRIBUTE)
    set_modifier_value(interpolate, "Viewport Amount", 1.0)
    set_modifier_value(interpolate, "Seed", 487)
    set_modifier_output_attribute(interpolate, "Guide Index", "interpolated_guide_index")
    set_modifier_output_attribute(interpolate, "Surface Normal", "surface_normal")

    trim = add_official_hair_modifier(
        groom, node_groups, "03 Trim Short-Parted Length", "Trim Hair Curves"
    )
    set_modifier_value(trim, "Scale Uniform", False)
    set_modifier_value(trim, "Length Factor", 0.96)
    set_modifier_value(trim, "Replace Length", False)
    set_modifier_value(trim, "Mask", 1.0)
    set_modifier_value(trim, "Random Offset", 0.003)
    set_modifier_value(trim, "Pin at Parameter", 0.0)
    set_modifier_value(trim, "Seed", 488)

    shrinkwrap = add_official_hair_modifier(
        groom, node_groups, "04 Conform to Exact Human Scalp", "Shrinkwrap Hair Curves"
    )
    set_modifier_value(shrinkwrap, "Surface Input Type", "Object")
    set_modifier_value(shrinkwrap, "Surface", scalp, socket_type="NodeSocketObject")
    set_modifier_value(shrinkwrap, "Factor", 0.12)
    set_modifier_value(shrinkwrap, "Offset Distance", 0.00065)
    set_modifier_value(shrinkwrap, "Above Surface", True)
    set_modifier_value(shrinkwrap, "Smoothing Steps", 4)
    set_modifier_value(shrinkwrap, "Lock Roots", True)

    macro = add_official_hair_modifier(
        groom, node_groups, "05 Macro Clump", "Clump Hair Curves"
    )
    for name, value in (
        ("Factor", 0.006),
        ("Shape", 0.38),
        ("Tip Spread", 0.05),
        ("Clump Offset", 0.0012),
        ("Distance Falloff", 2.0),
        ("Distance Threshold", 0.008),
        ("Seed", 489),
        ("Preserve Length", True),
        ("Guide Distance", 0.006),
        ("Guide Mask", 1.0),
        ("Existing Guide Map", False),
    ):
        set_modifier_value(macro, name, value)
    set_modifier_output_attribute(macro, "Guide Index", MACRO_GUIDE_MAP_ATTRIBUTE)

    fine = add_official_hair_modifier(
        groom, node_groups, "06 Fine Clump", "Clump Hair Curves"
    )
    for name, value in (
        ("Factor", 0.003),
        ("Shape", 0.52),
        ("Tip Spread", 0.03),
        ("Clump Offset", 0.0004),
        ("Distance Falloff", 2.5),
        ("Distance Threshold", 0.003),
        ("Seed", 490),
        ("Preserve Length", True),
        ("Guide Distance", 0.0025),
        ("Guide Mask", 1.0),
        ("Existing Guide Map", True),
    ):
        set_modifier_value(fine, name, value)
    set_modifier_attribute(fine, "Guide Index", MACRO_GUIDE_MAP_ATTRIBUTE)

    noise = add_official_hair_modifier(
        groom, node_groups, "07 Natural Noise", "Hair Curves Noise"
    )
    for name, value in (
        ("Cumulative Offset", False),
        ("Factor", 0.0060),
        ("Distance", 0.00055),
        ("Shape", 0.52),
        ("Scale", 0.009),
        ("Scale along Curve", 0.34),
        ("Offset per Curve", 0.16),
        ("Seed", 491),
        ("Preserve Length", True),
    ):
        set_modifier_value(noise, name, value)

    frizz = add_official_hair_modifier(
        groom, node_groups, "08 Fine Frizz", "Frizz Hair Curves"
    )
    for name, value in (
        ("Cumulative Offset", True),
        ("Factor", 0.0022),
        ("Distance", 0.00022),
        ("Shape", 0.56),
        ("Seed", 492),
        ("Preserve Length", True),
    ):
        set_modifier_value(frizz, name, value)

    profile = add_official_hair_modifier(
        groom, node_groups, "09 Hair Curve Profile", "Set Hair Curve Profile"
    )
    for name, value in (
        ("Replace Radius", True),
        ("Radius", 0.000075),
        ("Shape", 0.45),
        ("Factor Min", 0.55),
        ("Factor Max", 1.0),
    ):
        set_modifier_value(profile, name, value)

    return {
        "official_asset_library": str(official_hair_asset_library()),
        "official_asset_library_sha256": sha256(official_hair_asset_library()),
        "density": density,
        "density_mask_attribute": DENSITY_MASK_ATTRIBUTE,
        "modifier_names": [modifier.name for modifier in groom.modifiers],
        "modifier_node_groups": [modifier.node_group.name for modifier in groom.modifiers],
        "macro_guide_map_attribute": MACRO_GUIDE_MAP_ATTRIBUTE,
    }


def create_root_darkened_hair_material(groom: bpy.types.Object) -> bpy.types.Material:
    """Assign a strand-varying, root-darkened Principled Hair material."""
    material = bpy.data.materials.new("MAT_Human_ShortParted_Hair")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (620.0, 0.0)
    hair = nodes.new("ShaderNodeBsdfHairPrincipled")
    hair.location = (340.0, 0.0)
    hair.parametrization = "COLOR"
    if "Roughness" in hair.inputs:
        hair.inputs["Roughness"].default_value = 0.56
    if "Radial Roughness" in hair.inputs:
        hair.inputs["Radial Roughness"].default_value = 0.66
    if "Coat" in hair.inputs:
        hair.inputs["Coat"].default_value = 0.03
    if "IOR" in hair.inputs:
        hair.inputs["IOR"].default_value = 1.55

    hair_info = nodes.new("ShaderNodeHairInfo")
    hair_info.location = (-620.0, 20.0)
    root_ramp = nodes.new("ShaderNodeValToRGB")
    root_ramp.name = "Root to Tip Pigment"
    root_ramp.location = (-380.0, 80.0)
    root_ramp.color_ramp.elements.remove(root_ramp.color_ramp.elements[1])
    root = root_ramp.color_ramp.elements[0]
    root.position = 0.0
    root.color = (0.00025, 0.00008, 0.00003, 1.0)
    middle = root_ramp.color_ramp.elements.new(0.30)
    middle.color = (0.0025, 0.00072, 0.00024, 1.0)
    tip = root_ramp.color_ramp.elements.new(1.0)
    tip.color = (0.008, 0.0021, 0.00072, 1.0)

    variation = nodes.new("ShaderNodeValToRGB")
    variation.name = "Per Strand Pigment Variation"
    variation.location = (-380.0, -130.0)
    variation.color_ramp.elements[0].color = (0.72, 0.62, 0.52, 1.0)
    variation.color_ramp.elements[1].color = (1.18, 1.05, 0.90, 1.0)

    pigment = nodes.new("ShaderNodeMixRGB")
    pigment.name = "Subtle Strand Variation"
    pigment.blend_type = "MULTIPLY"
    pigment.inputs[0].default_value = 0.22
    pigment.location = (40.0, 70.0)
    links.new(hair_info.outputs["Intercept"], root_ramp.inputs[0])
    links.new(hair_info.outputs["Random"], variation.inputs[0])
    links.new(root_ramp.outputs[0], pigment.inputs[1])
    links.new(variation.outputs[0], pigment.inputs[2])
    links.new(pigment.outputs[0], hair.inputs["Color"])
    links.new(hair.outputs[0], output.inputs[0])

    groom.data.materials.clear()
    groom.data.materials.append(material)
    return material


def look_at(target_object: bpy.types.Object, target: Vector) -> None:
    direction = target - target_object.location
    target_object.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_neutral_studio(head: bpy.types.Object) -> tuple[bpy.types.Scene, bpy.types.Object, Vector]:
    """Set a neutral orthographic portrait studio for repeatable groom review."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 1280
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.engine = "BLENDER_EEVEE"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    world = bpy.data.worlds.new("Human Hair Neutral Studio") if scene.world is None else scene.world
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.022, 0.028, 1.0)
    background.inputs["Strength"].default_value = 0.32

    world_points = [head.matrix_world @ vertex.co for vertex in head.data.vertices]
    target = Vector(
        (
            (min(point.x for point in world_points) + max(point.x for point in world_points)) * 0.5,
            (min(point.y for point in world_points) + max(point.y for point in world_points)) * 0.5,
            (min(point.z for point in world_points) + max(point.z for point in world_points)) * 0.5
            + 0.018,
        )
    )
    camera_data = bpy.data.cameras.new("Human Hair Review Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 0.285
    camera = bpy.data.objects.new("Human Hair Review Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    light_specs = (
        ("Hair Key", Vector((0.52, -0.38, 0.72)), 55.0, 0.34),
        ("Hair Fill", Vector((0.30, 0.46, 0.54)), 24.0, 0.42),
        ("Hair Rim", Vector((-0.32, -0.10, 0.70)), 38.0, 0.28),
    )
    for name, location, energy, size in light_specs:
        data = bpy.data.lights.new(name, type="AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, target)
    return scene, camera, target


def render_review_views(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    target: Vector,
    evidence_dir: Path,
    view_names: tuple[str, ...],
) -> list[str]:
    """Render requested neutral-studio evidence views without altering the groom."""
    directions = {
        "front": Vector((1.0, 0.0, 0.04)),
        "left": Vector((0.0, -1.0, 0.04)),
        "right": Vector((0.0, 1.0, 0.04)),
        "rear": Vector((-1.0, 0.0, 0.04)),
        "crown": Vector((0.10, 0.0, 1.0)),
    }
    image_paths: list[str] = []
    for view_name in view_names:
        direction = directions[view_name].normalized()
        camera.location = target + direction * 0.62
        camera.data.ortho_scale = 0.255 if view_name == "crown" else 0.285
        look_at(camera, target)
        output_path = evidence_dir / f"short-parted-native-{view_name}.png"
        scene.render.filepath = str(output_path)
        bpy.ops.render.render(write_still=True)
        image_paths.append(str(output_path))
    return image_paths


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-asset",
        "--source-blend",
        dest="source_asset",
        type=Path,
        default=DEFAULT_SOURCE_ASSET,
    )
    parser.add_argument("--source-head", default=HEAD_OBJECT_NAME)
    parser.add_argument("--guide-count", type=int, default=160)
    parser.add_argument("--points-per-guide", type=int, default=8)
    parser.add_argument("--density", type=float, default=2_500_000.0)
    parser.add_argument(
        "--views",
        default="front",
        help="Comma-separated review views: front,left,right,rear,crown",
    )
    parser.add_argument("--evidence-root", type=Path, default=DEFAULT_EVIDENCE_ROOT)
    parser.add_argument("--version", type=int, default=1)
    return parser.parse_args(list(argv))


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    args = parse_args(argv)
    view_names = tuple(name.strip().casefold() for name in args.views.split(",") if name.strip())
    allowed_views = {"front", "left", "right", "rear", "crown"}
    invalid_views = sorted(set(view_names) - allowed_views)
    if not view_names or invalid_views:
        raise RuntimeError(f"Invalid review views: {invalid_views or args.views!r}")
    evidence_dir = args.evidence_root / f"modular-appearance-short-parted-native-groom-v{args.version:03d}"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    clear_scene()
    head = import_exact_head(args.source_asset, args.source_head)
    scalp, scalp_receipt = extract_exact_head_scalp(head)
    guides = create_initial_guide_curves(scalp, args.guide_count, args.points_per_guide)
    chain_receipt = configure_official_hair_chain(guides, scalp, args.density)
    undercoat = create_short_fiber_undercoat(guides, scalp)
    undercoat_chain_receipt = configure_undercoat_profile(undercoat)
    hair_material = create_root_darkened_hair_material(guides)
    undercoat_material = create_root_darkened_hair_material(undercoat)
    scene, camera, target = setup_neutral_studio(head)
    guide_curve_count = len(guides.data.curves)
    guide_point_count = len(guides.data.points)
    bpy.context.view_layer.update()
    evaluated = guides.evaluated_get(bpy.context.evaluated_depsgraph_get())
    evaluated_curve_count = len(evaluated.data.curves)
    evaluated_point_count = len(evaluated.data.points)
    evaluated_position_attribute = evaluated.data.attributes.get("position")
    if evaluated_position_attribute is None:
        raise RuntimeError("Evaluated native groom lost its point-position attribute")
    evaluated_world_positions = [
        evaluated.matrix_world @ Vector(value.vector)
        for value in evaluated_position_attribute.data
    ]
    evaluated_bounds = [
        [
            min(point[axis] for point in evaluated_world_positions),
            max(point[axis] for point in evaluated_world_positions),
        ]
        for axis in range(3)
    ]
    head_bounds = scalp_receipt["bounds_world"]
    allowed_expansion_m = (0.035, 0.035, 0.035)
    for axis, expansion in enumerate(allowed_expansion_m):
        if (
            evaluated_bounds[axis][0] < head_bounds[axis][0] - expansion
            or evaluated_bounds[axis][1] > head_bounds[axis][1] + expansion
        ):
            raise RuntimeError(
                "Evaluated native groom escaped the exact-head review envelope: "
                f"axis={axis}, hair={evaluated_bounds[axis]}, "
                f"head={head_bounds[axis]}, expansion_m={expansion}"
            )
    receipt = {
        "source_asset": str(args.source_asset.resolve()),
        "source_sha256": sha256(args.source_asset),
        "head_object": head.name,
        "scalp_object": scalp.name,
        "guide_object": guides.name,
        "guide_count": guide_curve_count,
        "guide_point_count": guide_point_count,
        "points_per_guide": guides["souldrifter_points_per_guide"],
        "evaluated_curve_count": evaluated_curve_count,
        "evaluated_point_count": evaluated_point_count,
        "evaluated_bounds_world": evaluated_bounds,
        "maximum_root_clearance_m": guides["souldrifter_maximum_root_clearance_m"],
        "guide_regions": json.loads(guides["souldrifter_region_counts"]),
        "guide_region_length_m": json.loads(guides["souldrifter_region_length_m"]),
        "scalp": scalp_receipt,
        "official_hair_chain": chain_receipt,
        "root_undercoat": {
            "guide_object": undercoat.name,
            "guide_count": len(undercoat.data.curves),
            "length_factor": undercoat["souldrifter_length_factor"],
            "visible_cap_mesh": undercoat["souldrifter_visible_cap_mesh"],
            "official_hair_chain": undercoat_chain_receipt,
            "hair_material": undercoat_material.name,
        },
        "hair_material": hair_material.name,
        "material_shader": "Principled Hair BSDF, COLOR, root-darkened, per-strand variation",
        "render_views": list(view_names),
        "source_groom_preservation": {
            "modern_curves_data": guides.type == "CURVES",
            "guide_curves_preserved": guide_curve_count == args.guide_count,
            "modifiers_applied_destructively": False,
            "scalp_attachment_preserved": guides.data.surface == scalp,
            "future_hair_dynamics_ready": True,
            "future_dynamics_deferred_until_static_groom_approval": True,
        },
        "blender_version": bpy.app.version_string,
    }
    blend_path = evidence_dir / "native-groom-styled.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    receipt["blend_path"] = str(blend_path)
    receipt["render_paths"] = render_review_views(
        scene,
        camera,
        target,
        evidence_dir,
        view_names,
    )
    (evidence_dir / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
