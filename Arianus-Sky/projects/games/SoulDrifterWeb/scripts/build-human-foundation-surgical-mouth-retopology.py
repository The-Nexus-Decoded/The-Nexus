"""Fail-closed surgical lip/oral retopology proof for SoulDrifter issue #487.

The accepted Tripo head is the visible-identity source, but its disconnected
oral sheets cannot produce a collision-free two millimetre jaw opening.  This
builder therefore replaces only the smallest proven exterior mouth disk and
the two detached oral sheets.  Everything outside the selected disk, including
the versioned neck seam, must remain coordinate-identical.

All outputs are quarantined evidence.  This script never overwrites a canonical
runtime GLB.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict, deque
from hashlib import sha256
import importlib.util
from itertools import combinations
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
import numpy as np


ISSUE = 487
EXPECTED_RUNTIME_BONES = 65
DIRECT_BUILDER_NAME = "build-human-foundation-direct-facial-rig-proof.py"
DEFAULT_EVIDENCE = (
    r"H:\CodexData\souldrifter-toolchain\evidence\487"
    r"\surgical-mouth-retopology-proof"
)
CC0_ARCHIVE = Path(
    r"H:\CodexData\souldrifter-toolchain\sources\makehuman-system-assets"
    r"\makehuman_system_assets_cc0.zip"
)
TEETH_SOURCE = Path(
    r"H:\CodexData\souldrifter-toolchain\sources\makehuman-system-assets"
    r"\extracted\teeth\teeth_base\teeth_base.obj"
)
TEETH_LICENSE_EVIDENCE = TEETH_SOURCE.with_name("teeth_base.mhclo")
TONGUE_SOURCE = Path(
    r"H:\CodexData\souldrifter-toolchain\sources\makehuman-system-assets"
    r"\extracted\tongue\tongue01\tongue01.obj"
)
TONGUE_LICENSE_EVIDENCE = TONGUE_SOURCE.with_name("tongue01.mhclo")
TEETH_MATERIAL_SOURCE = TEETH_SOURCE.with_name("teeth.mhmat")
TEETH_TEXTURE_SOURCE = TEETH_SOURCE.with_name("teeth.png")
TONGUE_MATERIAL_SOURCE = TONGUE_SOURCE.with_name("tongue01.mhmat")
TONGUE_TEXTURE_SOURCE = TONGUE_SOURCE.with_name("tongue01_diffuse.png")
LOCKED_CC0_HASHES = {
    CC0_ARCHIVE: "B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107",
    TEETH_SOURCE: "F55198069E55D360C4B4CC7ECB1CC292B2C7665753AB8B65EABF46A8783F2875",
    TONGUE_SOURCE: "12F4A6A9F85ABAE2CE3B4AA42D8119E1F679A437E0E89CB928EC68B29A7A1587",
    TEETH_MATERIAL_SOURCE: "3BAEFF72D9EB06CA16C3CFF7CA2AB304216717DEE247E0D88F1DC33037C8320E",
    TEETH_TEXTURE_SOURCE: "D0AFB57869C6FBB56B98F5EFC4AEC629EE7593E70D8DD2BFB9DE923ACFB65F43",
    TONGUE_MATERIAL_SOURCE: "7769DF66C69B8C09A0EC713D70D8381ABBB08AC82207369F5413970495CD4340",
    TONGUE_TEXTURE_SOURCE: "3150BE398E48E8BA1FEAC164C3143C16C0B2E959D9FFB6155F0171F59CFB4EA9",
}
FROZEN_EYE_RECEIPT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487"
    r"\direct-rig-facial-proof\eye-proof-checkpoint-receipt.json"
)
FROZEN_EYE_RECEIPT_SHA256 = (
    "B98C867C714EC5D31C1F99008CC253A4B091436AC3CBBDD1880D95D342309D65"
)


class SurgicalGateError(RuntimeError):
    """Fail-closed topology or deformation error with auditable details."""

    def __init__(self, message: str, details: dict[str, object]):
        super().__init__(message)
        self.details = details


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage",
        choices=(
            "topology-audit",
            "build-proof",
            "oral-proof",
            "jaw-proof",
            "render-proof",
        ),
        default="topology-audit",
    )
    parser.add_argument(
        "--source-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-head-base.glb"
        ),
    )
    parser.add_argument("--evidence-dir", default=DEFAULT_EVIDENCE)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def glb_json_document(path: Path) -> dict[str, object]:
    """Read the serialized GLB JSON chunk without relying on Blender import state."""

    with path.open("rb") as handle:
        magic, version, total_length = struct.unpack("<4sII", handle.read(12))
        if magic != b"glTF" or version != 2 or total_length != path.stat().st_size:
            raise RuntimeError(f"Invalid GLB header: {path}")
        while handle.tell() < total_length:
            chunk_length, chunk_type = struct.unpack("<II", handle.read(8))
            payload = handle.read(chunk_length)
            if chunk_type == 0x4E4F534A:
                return json.loads(payload.rstrip(b"\x00 ").decode("utf-8"))
    raise RuntimeError(f"GLB is missing its JSON chunk: {path}")


def write_json(path: Path, payload: dict[str, object]) -> dict[str, object]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return {"path": path.as_posix(), "sha256": file_sha256(path)}


def load_direct_builder():
    path = Path(__file__).resolve().with_name(DIRECT_BUILDER_NAME)
    spec = importlib.util.spec_from_file_location("souldrifter_direct_face_proof", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load locked direct proof helpers: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def edge_key(first, second):
    return tuple(sorted((first, second)))


def ordered_boundary_cycles(
    boundary_edges: set[tuple[tuple[float, float, float], tuple[float, float, float]]]
) -> list[list[tuple[float, float, float]]]:
    graph: dict[tuple[float, float, float], set[tuple[float, float, float]]] = (
        defaultdict(set)
    )
    for first, second in boundary_edges:
        graph[first].add(second)
        graph[second].add(first)
    invalid = [
        {"logicalCoordinate": list(key), "degree": len(neighbors)}
        for key, neighbors in sorted(graph.items())
        if len(neighbors) != 2
    ]
    if invalid:
        raise SurgicalGateError(
            "Candidate cut has a branching or open boundary",
            {"gate": "disk-boundary-degree", "invalidBoundaryDegrees": invalid},
        )
    remaining = set(graph)
    cycles: list[list[tuple[float, float, float]]] = []
    while remaining:
        start = min(remaining)
        cycle = [start]
        previous = None
        current = start
        while True:
            candidates = sorted(
                graph[current] - ({previous} if previous is not None else set())
            )
            if not candidates:
                raise RuntimeError("Boundary traversal ended before closing")
            following = candidates[0]
            if following == start:
                break
            if following in cycle:
                raise RuntimeError("Boundary traversal repeated before closing")
            cycle.append(following)
            previous, current = current, following
        remaining.difference_update(cycle)
        cycles.append(cycle)
    return sorted(cycles, key=lambda cycle: (-len(cycle), cycle[0]))


def patch_metrics(
    patch_faces: set[tuple[tuple[float, float, float], ...]]
) -> dict[str, object]:
    vertices = set().union(*patch_faces) if patch_faces else set()
    edge_use: Counter[tuple[tuple[float, float, float], ...]] = Counter()
    adjacency = {vertex: set() for vertex in vertices}
    for face in patch_faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                edge = edge_key(first, second)
                edge_use[edge] += 1
                adjacency[first].add(second)
                adjacency[second].add(first)
    boundary_edges = {edge for edge, count in edge_use.items() if count == 1}
    components = []
    remaining = set(vertices)
    while remaining:
        seed = min(remaining)
        component = {seed}
        queue = deque([seed])
        remaining.remove(seed)
        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    faces_for_edge: dict[tuple[tuple[float, float, float], ...], set] = defaultdict(set)
    for face in patch_faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                faces_for_edge[edge_key(first, second)].add(face)
    face_adjacency = {face: set() for face in patch_faces}
    for edge_faces in faces_for_edge.values():
        for face in edge_faces:
            face_adjacency[face].update(edge_faces - {face})
    remaining_faces = set(patch_faces)
    face_components = []
    while remaining_faces:
        seed_face = min(remaining_faces)
        face_component = {seed_face}
        face_queue = deque([seed_face])
        remaining_faces.remove(seed_face)
        while face_queue:
            current_face = face_queue.popleft()
            for neighbor_face in face_adjacency[current_face]:
                if neighbor_face in remaining_faces:
                    remaining_faces.remove(neighbor_face)
                    face_component.add(neighbor_face)
                    face_queue.append(neighbor_face)
        face_components.append(face_component)
    boundary_graph: dict[
        tuple[float, float, float], set[tuple[float, float, float]]
    ] = defaultdict(set)
    for first, second in boundary_edges:
        boundary_graph[first].add(second)
        boundary_graph[second].add(first)
    invalid_boundary_degrees = [
        {"logicalCoordinate": list(key), "degree": len(neighbors)}
        for key, neighbors in sorted(boundary_graph.items())
        if len(neighbors) != 2
    ]
    cycles = (
        ordered_boundary_cycles(boundary_edges)
        if boundary_edges and not invalid_boundary_degrees
        else []
    )
    chi = len(vertices) - len(edge_use) + len(patch_faces)
    return {
        "vertexCount": len(vertices),
        "edgeCount": len(edge_use),
        "faceCount": len(patch_faces),
        "eulerCharacteristic": chi,
        "connectedComponentCount": len(components),
        "edgeConnectedFaceComponentCount": len(face_components),
        "edgeConnectedFaceComponentSizes": sorted(
            (len(component) for component in face_components), reverse=True
        ),
        "boundaryCycleCount": len(cycles),
        "boundaryCycleLengths": [len(cycle) for cycle in cycles],
        "boundaryCycles": cycles,
        "invalidBoundaryDegrees": invalid_boundary_degrees,
        "isTriangulatedDisk": (
            len(components) == 1
            and len(face_components) == 1
            and chi == 1
            and len(cycles) == 1
            and not invalid_boundary_degrees
        ),
    }


def logical_geodesic_distance(
    seeds: set[tuple[float, float, float]],
    allowed: set[tuple[float, float, float]],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
) -> dict[tuple[float, float, float], int]:
    distance = {seed: 0 for seed in sorted(seeds)}
    queue = deque(sorted(seeds))
    while queue:
        current = queue.popleft()
        following_distance = distance[current] + 1
        for neighbor in sorted(adjacency[current]):
            if neighbor in allowed and neighbor not in distance:
                distance[neighbor] = following_distance
                queue.append(neighbor)
    return distance


def deterministic_surgical_patch(
    exterior: set[tuple[float, float, float]],
    exterior_faces: set[tuple[tuple[float, float, float], ...]],
    lip_support: set[tuple[float, float, float]],
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]],
) -> tuple[
    set[tuple[float, float, float]],
    set[tuple[tuple[float, float, float], ...]],
    dict[tuple[float, float, float], int],
    dict[str, object],
]:
    """Select the audited minimum valid cut from exact source connectivity.

    The radius-two disk alone terminates inside the Tripo interface cluster and
    has a branching cut boundary.  The smallest valid completion adds exactly
    five distance-three vertices adjacent to that cluster.  Candidate choice is
    derived only from topology and exact logical coordinates: enumerate the
    bounded neighborhood, require the locked disk/cut metrics, then choose the
    minimum summed distance to the radius-two nonmanifold endpoints with a
    lexicographic tie-break.  No anatomical offsets or hand-picked vertex IDs
    enter the selection.
    """

    distance = logical_geodesic_distance(lip_support, exterior, adjacency)
    base_selected = {key for key, value in distance.items() if value <= 2}
    base_patch = {
        face for face in exterior_faces if set(face) & base_selected
    }
    base_edge_use: Counter[tuple] = Counter(
        edge_key(first, second)
        for face in base_patch
        for offset, first in enumerate(face)
        for second in face[offset + 1 :]
    )
    interface_vertices = {
        key
        for edge, count in base_edge_use.items()
        if count > 2
        for key in edge
    }
    if not interface_vertices:
        raise SurgicalGateError(
            "Radius-two source patch no longer exposes the audited interface cluster",
            {
                "gate": "minimal-cut-radius-two-interface-cluster-present",
                "baseSelectionCount": len(base_selected),
                "basePatchFaceCount": len(base_patch),
            },
        )
    distance_three = {key for key, value in distance.items() if value == 3}
    candidate_pool = sorted(
        key
        for key in distance_three
        if key in interface_vertices
        or any(neighbor in interface_vertices for neighbor in adjacency[key])
    )
    if len(candidate_pool) < 5 or len(candidate_pool) > 24:
        raise SurgicalGateError(
            "Audited distance-three interface candidate pool changed",
            {
                "gate": "minimal-cut-bounded-distance-three-candidate-pool",
                "candidatePoolCount": len(candidate_pool),
                "candidatePool": [list(key) for key in candidate_pool],
            },
        )

    valid_candidates = []
    for extra in combinations(candidate_pool, 5):
        selected = base_selected | set(extra)
        patch = {face for face in exterior_faces if set(face) & selected}
        metrics = patch_metrics(patch)
        if (
            len(selected) != 308
            or len(patch) != 717
            or metrics["vertexCount"] != 396
            or metrics["boundaryCycleCount"] != 1
            or metrics["boundaryCycleLengths"] != [87]
            or metrics["invalidBoundaryDegrees"]
            or not metrics["isTriangulatedDisk"]
        ):
            continue
        patch_edge_use: Counter[tuple] = Counter(
            edge_key(first, second)
            for face in patch
            for offset, first in enumerate(face)
            for second in face[offset + 1 :]
        )
        kept_faces = exterior_faces - patch
        kept_edge_use: Counter[tuple] = Counter(
            edge_key(first, second)
            for face in kept_faces
            for offset, first in enumerate(face)
            for second in face[offset + 1 :]
        )
        boundary_edges = [
            edge for edge, count in patch_edge_use.items() if count == 1
        ]
        if any(
            patch_edge_use[edge] != 1 or kept_edge_use[edge] != 1
            for edge in boundary_edges
        ):
            continue
        interface_distance_score = sum(
            min(
                math.dist(key, interface_key)
                for interface_key in interface_vertices
            )
            for key in extra
        )
        valid_candidates.append(
            (
                interface_distance_score,
                extra,
                selected,
                patch,
                metrics,
            )
        )
    if not valid_candidates:
        raise SurgicalGateError(
            "No exact minimum five-vertex completion satisfies the locked cut",
            {
                "gate": "minimal-cut-exact-five-vertex-completion",
                "baseSelectionCount": len(base_selected),
                "candidatePoolCount": len(candidate_pool),
            },
        )
    valid_candidates.sort(key=lambda item: (item[0], item[1]))
    score, extra, selected_vertices, incident_faces, metrics = valid_candidates[0]
    selection_receipt = {
        "method": (
            "radius-two-from-exact-lip-support-plus-five-distance-three-"
            "interface-neighborhood-vertices"
        ),
        "tieBreak": (
            "minimum-summed-Euclidean-distance-to-radius-two-nonmanifold-"
            "endpoints-then-lexicographic-coordinate-order"
        ),
        "baseRadius": 2,
        "baseSelectionCount": len(base_selected),
        "interfaceEndpointCount": len(interface_vertices),
        "candidatePoolCount": len(candidate_pool),
        "validCandidateCount": len(valid_candidates),
        "chosenInterfaceDistanceScore": score,
        "chosenExtraLogicalCoordinates": [list(key) for key in extra],
        "chosenExtraCoordinateSha256": sha256(
            json.dumps(extra, separators=(",", ":")).encode("utf-8")
        ).hexdigest().upper(),
        "selectedLogicalCoordinateSha256": sha256(
            json.dumps(sorted(selected_vertices), separators=(",", ":")).encode(
                "utf-8"
            )
        ).hexdigest().upper(),
        "lockedMetrics": {
            "selectionLogicalCount": len(selected_vertices),
            "incidentPatchLogicalCount": metrics["vertexCount"],
            "incidentPatchFaceCount": len(incident_faces),
            "boundaryCycleLengths": metrics["boundaryCycleLengths"],
        },
    }
    return selected_vertices, incident_faces, distance, selection_receipt


def source_face_records(
    head: bpy.types.Object,
    raw_keys: list[tuple[float, float, float]],
) -> dict[tuple[tuple[float, float, float], ...], dict[str, object]]:
    if len(head.data.uv_layers) != 1:
        raise RuntimeError(
            f"Expected one locked source UV layer, found {len(head.data.uv_layers)}"
        )
    uv_data = head.data.uv_layers[0].data
    records = {}
    for polygon in sorted(head.data.polygons, key=lambda item: item.index):
        ordered_keys = tuple(raw_keys[index] for index in polygon.vertices)
        logical_face = tuple(sorted(set(ordered_keys)))
        if len(logical_face) != 3:
            raise RuntimeError(
                f"Source polygon is not a logical triangle: {polygon.index}/{logical_face}"
            )
        if logical_face in records:
            continue
        ordered_uvs = tuple(
            tuple(float(value) for value in uv_data[loop_index].uv)
            for loop_index in polygon.loop_indices
        )
        records[logical_face] = {
            "polygonIndex": polygon.index,
            "orderedKeys": ordered_keys,
            "orderedUvs": ordered_uvs,
            "materialIndex": polygon.material_index,
        }
    return records


def canonical_cycle_parameters(
    boundary: list[tuple[float, float, float]],
    key_points,
) -> tuple[list[float], float]:
    lengths = [
        float((key_points[boundary[(index + 1) % len(boundary)]] - key_points[key]).length)
        for index, key in enumerate(boundary)
    ]
    perimeter = sum(lengths)
    if not math.isfinite(perimeter) or perimeter <= 0.0:
        raise RuntimeError(f"Invalid surgical boundary perimeter: {perimeter}")
    cumulative = 0.0
    parameters = []
    for length in lengths:
        parameters.append(cumulative / perimeter)
        cumulative += length
    return parameters, perimeter


def harmonic_annulus_points(
    outer_points: list[Vector],
    inner_points: list[Vector],
    radial_segment_count: int,
) -> tuple[list[list[Vector]], dict[str, object]]:
    """Solve one positive-uniform boundary-constrained annular surface.

    L0 and L1 are exact Dirichlet boundaries.  Every interior vertex has four
    positive unit-weight neighbors: previous/next angular sample and previous/
    next radial ring.  A deterministic float64 conjugate-gradient solve avoids
    the dense matrix required by Blender's bundled NumPy while retaining the
    same symmetric positive-definite uniform graph Laplacian.
    """

    cardinality = len(outer_points)
    if cardinality != len(inner_points) or cardinality < 8:
        raise RuntimeError(
            "Harmonic annulus boundary cardinalities are invalid: "
            f"{cardinality}/{len(inner_points)}"
        )
    if radial_segment_count < 2:
        raise RuntimeError(
            f"Harmonic annulus needs at least two radial segments: {radial_segment_count}"
        )
    interior_ring_count = radial_segment_count - 1
    unknown_count = interior_ring_count * cardinality

    def unknown_index(radial_index: int, angular_index: int) -> int:
        return (radial_index - 1) * cardinality + angular_index

    def matrix_vector(values: np.ndarray) -> np.ndarray:
        result = 4.0 * values.copy()
        for radial_index in range(1, radial_segment_count):
            for angular_index in range(cardinality):
                row = unknown_index(radial_index, angular_index)
                result[row] -= values[
                    unknown_index(
                        radial_index,
                        (angular_index - 1) % cardinality,
                    )
                ]
                result[row] -= values[
                    unknown_index(
                        radial_index,
                        (angular_index + 1) % cardinality,
                    )
                ]
                if radial_index > 1:
                    result[row] -= values[
                        unknown_index(radial_index - 1, angular_index)
                    ]
                if radial_index < radial_segment_count - 1:
                    result[row] -= values[
                        unknown_index(radial_index + 1, angular_index)
                    ]
        return result

    outer = np.asarray(
        [[float(value) for value in point] for point in outer_points],
        dtype=np.float64,
    )
    inner = np.asarray(
        [[float(value) for value in point] for point in inner_points],
        dtype=np.float64,
    )
    right = np.zeros((unknown_count, 3), dtype=np.float64)
    initial = np.zeros_like(right)
    for radial_index in range(1, radial_segment_count):
        fraction = radial_index / radial_segment_count
        for angular_index in range(cardinality):
            row = unknown_index(radial_index, angular_index)
            initial[row] = (
                (1.0 - fraction) * outer[angular_index]
                + fraction * inner[angular_index]
            )
            if radial_index == 1:
                right[row] += outer[angular_index]
            if radial_index == radial_segment_count - 1:
                right[row] += inner[angular_index]

    coordinate_scale = float(max(np.max(np.abs(outer)), np.max(np.abs(inner))))
    tolerance = max(
        128.0 * float(np.finfo(np.float64).eps) * coordinate_scale,
        1.0e-14,
    )
    solution = initial.copy()
    iteration_counts = []
    maximum_residuals = []
    for axis in range(2):
        values = solution[:, axis].copy()
        residual = right[:, axis] - matrix_vector(values)
        direction = residual.copy()
        residual_squared = float(np.dot(residual, residual))
        iterations = 0
        while float(np.max(np.abs(residual))) > tolerance:
            if iterations >= 10000:
                raise SurgicalGateError(
                    "Uniform harmonic annulus solve did not converge",
                    {
                        "gate": "harmonic-annulus-conjugate-gradient-convergence",
                        "axis": axis,
                        "iterationCount": iterations,
                        "maximumResidual": float(np.max(np.abs(residual))),
                        "tolerance": tolerance,
                    },
                )
            product = matrix_vector(direction)
            denominator = float(np.dot(direction, product))
            if denominator <= 0.0 or not math.isfinite(denominator):
                raise RuntimeError(
                    "Uniform harmonic annulus graph lost positive definiteness"
                )
            step = residual_squared / denominator
            values += step * direction
            following_residual = residual - step * product
            following_squared = float(
                np.dot(following_residual, following_residual)
            )
            direction = following_residual + (
                following_squared / residual_squared
            ) * direction
            residual = following_residual
            residual_squared = following_squared
            iterations += 1
        solution[:, axis] = values
        iteration_counts.append(iterations)
        maximum_residuals.append(float(np.max(np.abs(residual))))
    # Head-local Z is facial depth.  Preserve strict per-index monotonic inward
    # ordering from the exact L0 depth to the measured L1 depth instead of
    # allowing angular smoothing to fold a radial column back through itself.
    solution[:, 2] = initial[:, 2]
    iteration_counts.append(0)
    maximum_residuals.append(0.0)

    rings = [list(outer_points)]
    for radial_index in range(1, radial_segment_count):
        rings.append(
            [
                Vector(solution[unknown_index(radial_index, angular_index)])
                for angular_index in range(cardinality)
            ]
        )
    rings.append(list(inner_points))
    solution_values = np.asarray(
        [
            [float(value) for point in ring for value in point]
            for ring in rings
        ],
        dtype="<f8",
    )
    receipt = {
        "solver": "FLOAT64_CONJUGATE_GRADIENT_POSITIVE_UNIFORM_GRAPH_LAPLACIAN",
        "dirichletBoundaries": ["EXACT_L0_ATTACHMENT", "MEASURED_L1_OUTER_LIP"],
        "angularCardinality": cardinality,
        "radialSegmentCount": radial_segment_count,
        "unknownVertexCount": unknown_count,
        "neighborWeights": {
            "previousAngular": 1.0,
            "nextAngular": 1.0,
            "previousRadial": 1.0,
            "nextRadial": 1.0,
        },
        "axisPolicy": {
            "headLocalX": "POSITIVE_UNIFORM_HARMONIC",
            "headLocalY": "POSITIVE_UNIFORM_HARMONIC",
            "headLocalZ": "PER_INDEX_LINEAR_MONOTONIC_L0_TO_L1_DEPTH",
        },
        "coordinateScaleMeters": coordinate_scale,
        "residualToleranceMeters": tolerance,
        "iterationCountsByAxis": iteration_counts,
        "maximumResidualByAxis": maximum_residuals,
        "solutionFloat64Sha256": sha256(solution_values.tobytes()).hexdigest().upper(),
    }
    return rings, receipt


def patch_adjacency(
    patch_faces: set[tuple[tuple[float, float, float], ...]]
) -> dict[tuple[float, float, float], set[tuple[float, float, float]]]:
    vertices = set().union(*patch_faces)
    adjacency = {key: set() for key in vertices}
    for face in patch_faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                adjacency[first].add(second)
                adjacency[second].add(first)
    return adjacency


def cyclic_face_key(face) -> tuple:
    rotations = [tuple(face[offset:] + face[:offset]) for offset in range(3)]
    return min(rotations)


def orient_patch_faces(
    patch_faces: set[tuple[tuple[float, float, float], ...]],
    boundary: list[tuple[float, float, float]],
) -> dict[tuple[tuple[float, float, float], ...], tuple]:
    edges_to_faces: dict[tuple, list] = defaultdict(list)
    for face in sorted(patch_faces):
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                edges_to_faces[edge_key(first, second)].append(face)
    first_edge = edge_key(boundary[0], boundary[1])
    seeds = edges_to_faces[first_edge]
    if len(seeds) != 1:
        raise RuntimeError(f"Canonical boundary seed edge is not unique: {first_edge}/{seeds}")
    seed = seeds[0]
    seed_third = next(key for key in seed if key not in first_edge)
    oriented = {seed: cyclic_face_key([boundary[0], boundary[1], seed_third])}
    queue = deque([seed])
    while queue:
        face = queue.popleft()
        ordered = oriented[face]
        directed_edges = [
            (ordered[index], ordered[(index + 1) % 3]) for index in range(3)
        ]
        for first, second in directed_edges:
            for neighbor in edges_to_faces[edge_key(first, second)]:
                if neighbor == face:
                    continue
                third = next(key for key in neighbor if key not in {first, second})
                candidate = cyclic_face_key([second, first, third])
                existing = oriented.get(neighbor)
                if existing is not None and existing != candidate:
                    raise RuntimeError(
                        f"Surgical patch is not consistently orientable: {neighbor}"
                    )
                if existing is None:
                    oriented[neighbor] = candidate
                    queue.append(neighbor)
    if set(oriented) != patch_faces:
        raise RuntimeError(
            f"Oriented patch did not cover every face: {len(oriented)}/{len(patch_faces)}"
        )
    return oriented


def cross2(first: np.ndarray, second: np.ndarray) -> float:
    return float(first[0] * second[1] - first[1] * second[0])


def harmonic_disk_parameterization(
    patch_faces: set[tuple[tuple[float, float, float], ...]],
    boundary: list[tuple[float, float, float]],
    key_points,
    _face_records: dict[tuple[tuple[float, float, float], ...], dict[str, object]],
) -> tuple[dict[tuple[float, float, float], np.ndarray], dict[str, object]]:
    adjacency = patch_adjacency(patch_faces)
    boundary_set = set(boundary)
    interior = sorted(set(adjacency) - boundary_set)
    parameters, perimeter = canonical_cycle_parameters(boundary, key_points)
    boundary_uv = {
        key: np.array(
            [math.cos(2.0 * math.pi * parameter), math.sin(2.0 * math.pi * parameter)],
            dtype=np.float64,
        )
        for key, parameter in zip(boundary, parameters, strict=True)
    }
    unknown_index = {key: index for index, key in enumerate(interior)}
    matrix = np.zeros((len(interior), len(interior)), dtype=np.float64)
    right = np.zeros((len(interior), 2), dtype=np.float64)
    for key in interior:
        row = unknown_index[key]
        neighbors = sorted(adjacency[key])
        if len(neighbors) < 3:
            raise RuntimeError(f"Patch interior valence is below three: {key}/{neighbors}")
        matrix[row, row] = float(len(neighbors))
        for neighbor in neighbors:
            if neighbor in unknown_index:
                matrix[row, unknown_index[neighbor]] -= 1.0
            elif neighbor in boundary_uv:
                right[row] += boundary_uv[neighbor]
            else:
                raise RuntimeError(f"Patch adjacency escaped disk: {key}->{neighbor}")
    solution = np.linalg.solve(matrix, right)
    residual = matrix @ solution - right
    maximum_residual = float(np.max(np.abs(residual))) if residual.size else 0.0
    if maximum_residual > 1.0e-11:
        raise RuntimeError(f"Uniform harmonic solve residual is too high: {maximum_residual}")
    uv = dict(boundary_uv)
    uv.update({key: solution[index] for key, index in unknown_index.items()})
    # The Tripo patch contains conflicting stored face winding in the five-key
    # interface cluster that is being deleted.  Winding is not graph topology:
    # the canonical one-face-per-logical-triple graph is still a disk.  The
    # Tutte embedding therefore gates injectivity from absolute triangle area
    # plus nonadjacent edge crossings, independent of those rejected source
    # windings.
    canonical_faces = {face: tuple(sorted(face)) for face in patch_faces}
    signed_areas = []
    for logical_face in sorted(patch_faces):
        ordered = canonical_faces[logical_face]
        first, second, third = (uv[key] for key in ordered)
        area = cross2(second - first, third - first) * 0.5
        signed_areas.append(area)
    minimum_absolute_area = min(abs(area) for area in signed_areas)
    signs = {1 if area > 0.0 else -1 if area < 0.0 else 0 for area in signed_areas}
    if minimum_absolute_area <= 1.0e-12 or 0 in signs:
        raise SurgicalGateError(
            "Positive-weight harmonic graph embedding contains a collapsed UV triangle",
            {
                "gate": "harmonic-nonzero-uv-triangle-area-independent-of-source-winding",
                "minimumAbsoluteSignedArea": minimum_absolute_area,
                "signedAreaSigns": sorted(signs),
            },
        )
    edges = sorted(
        {
            edge_key(first, second)
            for face in patch_faces
            for offset, first in enumerate(face)
            for second in face[offset + 1 :]
        }
    )
    crossings = []
    for edge_index, (a_key, b_key) in enumerate(edges):
        a = uv[a_key]
        b = uv[b_key]
        for c_key, d_key in edges[edge_index + 1 :]:
            if {a_key, b_key} & {c_key, d_key}:
                continue
            c = uv[c_key]
            d = uv[d_key]
            if (
                max(a[0], b[0]) < min(c[0], d[0])
                or max(c[0], d[0]) < min(a[0], b[0])
                or max(a[1], b[1]) < min(c[1], d[1])
                or max(c[1], d[1]) < min(a[1], b[1])
            ):
                continue
            cross_ab_c = cross2(b - a, c - a)
            cross_ab_d = cross2(b - a, d - a)
            cross_cd_a = cross2(d - c, a - c)
            cross_cd_b = cross2(d - c, b - c)
            if cross_ab_c * cross_ab_d < -1.0e-20 and cross_cd_a * cross_cd_b < -1.0e-20:
                crossings.append(
                    {
                        "first": [list(a_key), list(b_key)],
                        "second": [list(c_key), list(d_key)],
                    }
                )
                if len(crossings) >= 20:
                    break
        if len(crossings) >= 20:
            break
    if crossings:
        raise SurgicalGateError(
            "Positive-weight harmonic patch contains nonadjacent UV edge crossings",
            {"gate": "harmonic-nonadjacent-edge-crossing", "crossings": crossings},
        )
    digest = sha256()
    digest.update(np.asarray(matrix, dtype="<f8").tobytes())
    digest.update(np.asarray(right, dtype="<f8").tobytes())
    digest.update(np.asarray(solution, dtype="<f8").tobytes())
    digest.update(
        json.dumps(
            [list(key) for key in interior], separators=(",", ":")
        ).encode("utf-8")
    )
    orientation_sha = sha256(
        json.dumps(
            [
                [list(key) for key in canonical_faces[face]]
                for face in sorted(canonical_faces)
            ],
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest().upper()
    return uv, {
        "method": "positive-uniform-canonical-logical-graph-tutte-disk",
        "boundaryConstraint": "convex-unit-circle-normalized-3d-chord-length",
        "boundaryCount": len(boundary),
        "interiorCount": len(interior),
        "matrixShape": list(matrix.shape),
        "maximumAbsoluteLinearSolveResidual": maximum_residual,
        "minimumAbsoluteSignedUvTriangleArea": minimum_absolute_area,
        "signedUvTriangleAreaSignsReflectRejectedSourceWindingOnly": sorted(signs),
        "nonadjacentUvEdgeCrossingCount": 0,
        "canonicalFaceTripleOrderSha256": orientation_sha,
        "boundaryPerimeterMeters": perimeter,
        "matrixRhsSolutionOrderSha256": digest.hexdigest().upper(),
    }


def parameterization_support_receipt(
    harmonic_uv: dict[tuple[float, float, float], np.ndarray],
    lip_support: set[tuple[float, float, float]],
) -> dict[str, object]:
    radii = np.array(
        sorted(float(np.linalg.norm(harmonic_uv[key])) for key in lip_support),
        dtype=np.float64,
    )
    quantiles = {
        f"q{int(percentile):02d}": float(np.percentile(radii, percentile))
        for percentile in (0, 10, 25, 50, 75, 90, 100)
    }
    return {
        "logicalSupportCount": len(radii),
        "radialQuantiles": quantiles,
        "radialMean": float(np.mean(radii)),
        "radialStdDev": float(np.std(radii)),
        "radialFloat64Sha256": sha256(radii.astype("<f8").tobytes()).hexdigest().upper(),
    }


def cc0_source_receipt() -> dict[str, object]:
    assets = []
    for source, expected_hash in LOCKED_CC0_HASHES.items():
        if not source.is_file():
            raise RuntimeError(f"Locked CC0 source is missing: {source}")
        actual_hash = file_sha256(source)
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"Locked CC0 source hash changed: {source} {actual_hash} != {expected_hash}"
            )
        assets.append({"path": source.as_posix(), "sha256": actual_hash})
    for license_evidence in (TEETH_LICENSE_EVIDENCE, TONGUE_LICENSE_EVIDENCE):
        text = license_evidence.read_text(encoding="utf-8")
        if "explicitly released as CC0" not in text:
            raise RuntimeError(f"CC0 declaration missing: {license_evidence}")
    return {
        "policy": "FRESH_OFFICIAL_CC0_MAKEHUMAN_SYSTEM_ASSETS_FIT_NOT_DROP_IN",
        "assets": assets,
        "licenseEvidence": [
            TEETH_LICENSE_EVIDENCE.as_posix(),
            TONGUE_LICENSE_EVIDENCE.as_posix(),
        ],
    }


def parse_obj_geometry(path: Path) -> dict[str, object]:
    """Read the locked CC0 OBJ deterministically without changing the scene."""
    points: list[Vector] = []
    uvs: list[tuple[float, float]] = []
    polygons: list[tuple[int, ...]] = []
    polygon_uvs: list[tuple[int, ...]] = []
    for line_number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if line.startswith("v "):
            values = line.split()
            if len(values) != 4:
                raise RuntimeError(f"Unexpected OBJ vertex at {path}:{line_number}")
            points.append(Vector(tuple(float(value) for value in values[1:])))
        elif line.startswith("vt "):
            values = line.split()
            if len(values) < 3:
                raise RuntimeError(f"Unexpected OBJ UV at {path}:{line_number}")
            uvs.append((float(values[1]), float(values[2])))
        elif line.startswith("f "):
            raw_tokens = [token.split("/") for token in line.split()[1:]]
            if len(raw_tokens) < 3:
                raise RuntimeError(f"Unexpected OBJ face at {path}:{line_number}")
            polygon = []
            polygon_uv = []
            for token in raw_tokens:
                raw_index = token[0]
                source_index = int(raw_index)
                index = (
                    source_index - 1
                    if source_index > 0
                    else len(points) + source_index
                )
                if index < 0 or index >= len(points):
                    raise RuntimeError(
                        f"OBJ index escaped declared vertices at {path}:{line_number}"
                    )
                polygon.append(index)
                if len(token) < 2 or not token[1]:
                    raise RuntimeError(f"OBJ face has no UV at {path}:{line_number}")
                source_uv_index = int(token[1])
                uv_index = (
                    source_uv_index - 1
                    if source_uv_index > 0
                    else len(uvs) + source_uv_index
                )
                if uv_index < 0 or uv_index >= len(uvs):
                    raise RuntimeError(
                        f"OBJ UV index escaped declared UVs at {path}:{line_number}"
                    )
                polygon_uv.append(uv_index)
            polygons.append(tuple(polygon))
            polygon_uvs.append(tuple(polygon_uv))
    adjacency = [set() for _ in points]
    for polygon in polygons:
        for index, first in enumerate(polygon):
            second = polygon[(index + 1) % len(polygon)]
            adjacency[first].add(second)
            adjacency[second].add(first)
    components: list[list[int]] = []
    visited: set[int] = set()
    for seed in range(len(points)):
        if seed in visited:
            continue
        stack = [seed]
        visited.add(seed)
        component = []
        while stack:
            vertex = stack.pop()
            component.append(vertex)
            for neighbor in sorted(adjacency[vertex], reverse=True):
                if neighbor not in visited:
                    visited.add(neighbor)
                    stack.append(neighbor)
        components.append(sorted(component))
    components.sort(key=lambda component: component[0])
    return {
        "points": points,
        "uvs": uvs,
        "polygons": polygons,
        "polygonUvs": polygon_uvs,
        "components": components,
    }


def component_bounds(points: list[Vector], vertices: set[int] | list[int]):
    selected = [points[index] for index in sorted(vertices)]
    return {
        "minimum": Vector(
            tuple(min(point[axis] for point in selected) for axis in range(3))
        ),
        "maximum": Vector(
            tuple(max(point[axis] for point in selected) for axis in range(3))
        ),
        "centroid": sum(selected, Vector()) / len(selected),
    }


def locked_oral_source_geometry() -> dict[str, object]:
    provenance = cc0_source_receipt()
    teeth = parse_obj_geometry(TEETH_SOURCE)
    tongue = parse_obj_geometry(TONGUE_SOURCE)
    teeth_components = teeth["components"]
    tongue_components = tongue["components"]
    component_sizes = [len(component) for component in teeth_components]
    if (
        len(teeth["points"]) != 3868
        or len(teeth["polygons"]) != 3560
        or component_sizes != [1852, *([63] * 32)]
    ):
        raise RuntimeError(
            "Locked CC0 teeth topology changed: "
            f"{len(teeth['points'])}/{len(teeth['polygons'])}/{component_sizes}"
        )
    if (
        len(tongue["points"]) != 226
        or len(tongue["polygons"]) != 224
        or [len(component) for component in tongue_components] != [226]
    ):
        raise RuntimeError("Locked CC0 tongue topology changed")
    # The connected 1,852-vertex gum shell spans both jaws and is deliberately
    # excluded: it cannot be assigned rigidly to upper or lower jaw without a
    # second topology operation.  The 32 individual tooth islands are cleanly
    # separated in the official source order.
    lower_components = teeth_components[1:17]
    upper_components = teeth_components[17:33]
    lower_vertices = set().union(*(set(component) for component in lower_components))
    upper_vertices = set().union(*(set(component) for component in upper_components))
    lower_bounds = component_bounds(teeth["points"], lower_vertices)
    upper_bounds = component_bounds(teeth["points"], upper_vertices)
    paired_lower = sorted(
        lower_components,
        key=lambda component: component_bounds(teeth["points"], component)[
            "centroid"
        ].x,
    )
    paired_upper = sorted(
        upper_components,
        key=lambda component: component_bounds(teeth["points"], component)[
            "centroid"
        ].x,
    )
    paired_occlusal_overlaps = [
        max(teeth["points"][index].y for index in lower)
        - min(teeth["points"][index].y for index in upper)
        for lower, upper in zip(paired_lower, paired_upper, strict=True)
    ]
    paired_contact_midpoints = [
        0.5
        * (
            max(teeth["points"][index].y for index in lower)
            + min(teeth["points"][index].y for index in upper)
        )
        for lower, upper in zip(paired_lower, paired_upper, strict=True)
    ]
    source_overlap = float(
        np.median(np.asarray(paired_occlusal_overlaps, dtype=np.float64))
    )
    if source_overlap <= 0.0:
        raise RuntimeError(
            f"Locked CC0 paired tooth rows lost occlusal overlap: {source_overlap}"
        )
    tongue_bounds = component_bounds(tongue["points"], tongue_components[0])
    measurements = {
        "coordinateFrame": "X_HORIZONTAL_Y_VERTICAL_Z_FORWARD_NO_REFLECTION",
        "excludedConnectedGumShellVertexCount": len(teeth_components[0]),
        "lowerToothIslandCount": len(lower_components),
        "upperToothIslandCount": len(upper_components),
        "verticesPerToothIsland": 63,
        "lowerBounds": {
            name: [float(value) for value in lower_bounds[name]]
            for name in ("minimum", "maximum")
        },
        "upperBounds": {
            name: [float(value) for value in upper_bounds[name]]
            for name in ("minimum", "maximum")
        },
        "pairedOcclusalOverlapSourceUnits": source_overlap,
        "pairedOcclusalOverlapSamplesSourceUnits": paired_occlusal_overlaps,
        "maximumPairedOcclusalOverlapSourceUnits": max(
            paired_occlusal_overlaps
        ),
        "pairedContactMidpointSourceUnits": float(
            np.median(np.asarray(paired_contact_midpoints, dtype=np.float64))
        ),
        "pairedContactMidpointSamplesSourceUnits": paired_contact_midpoints,
        "tongueBounds": {
            name: [float(value) for value in tongue_bounds[name]]
            for name in ("minimum", "maximum")
        },
    }
    return {
        "provenance": provenance,
        "teeth": teeth,
        "tongue": tongue,
        "lowerComponents": lower_components,
        "upperComponents": upper_components,
        "lowerVertices": lower_vertices,
        "upperVertices": upper_vertices,
        "lowerBounds": lower_bounds,
        "upperBounds": upper_bounds,
        "tongueBounds": tongue_bounds,
        "measurements": measurements,
    }


def logical_vertex_weights(
    head: bpy.types.Object,
    raw_for_key: dict[tuple[float, float, float], list[int]],
) -> tuple[list[str], dict[tuple[float, float, float], dict[int, float]], float]:
    group_names = [group.name for group in head.vertex_groups]
    weights = {}
    maximum_duplicate_delta = 0.0
    for key, raw_indices in raw_for_key.items():
        samples = []
        for raw_index in raw_indices:
            sample = {
                item.group: float(item.weight)
                for item in head.data.vertices[raw_index].groups
            }
            samples.append(sample)
        all_groups = sorted(set().union(*(set(sample) for sample in samples)))
        averaged = {}
        for group_index in all_groups:
            values = [sample.get(group_index, 0.0) for sample in samples]
            maximum_duplicate_delta = max(
                maximum_duplicate_delta, max(values) - min(values)
            )
            value = sum(values) / len(values)
            if value > 1.0e-8:
                averaged[group_index] = value
        total = sum(averaged.values())
        if total <= 0.0:
            raise RuntimeError(f"Source logical vertex has no skin weights: {key}")
        weights[key] = {
            group_index: value / total for group_index, value in averaged.items()
        }
    return group_names, weights, maximum_duplicate_delta


def barycentric_3d(point: Vector, first: Vector, second: Vector, third: Vector):
    edge0 = second - first
    edge1 = third - first
    relative = point - first
    dot00 = edge0.dot(edge0)
    dot01 = edge0.dot(edge1)
    dot11 = edge1.dot(edge1)
    dot20 = relative.dot(edge0)
    dot21 = relative.dot(edge1)
    denominator = dot00 * dot11 - dot01 * dot01
    if abs(denominator) <= 1.0e-20:
        raise RuntimeError("Projection source triangle is degenerate")
    second_weight = (dot11 * dot20 - dot01 * dot21) / denominator
    third_weight = (dot00 * dot21 - dot01 * dot20) / denominator
    first_weight = 1.0 - second_weight - third_weight
    weights = np.array(
        [first_weight, second_weight, third_weight], dtype=np.float64
    )
    if float(np.min(weights)) < -2.0e-5 or float(np.max(weights)) > 1.00002:
        raise RuntimeError(f"Closest-point barycentrics escaped triangle: {weights}")
    weights = np.clip(weights, 0.0, 1.0)
    weights /= float(np.sum(weights))
    return weights


def interpolate_weight_maps(
    maps: list[dict[int, float]], coefficients: np.ndarray
) -> dict[int, float]:
    groups = sorted(set().union(*(set(values) for values in maps)))
    result = {
        group: sum(
            float(coefficients[index]) * maps[index].get(group, 0.0)
            for index in range(len(maps))
        )
        for group in groups
    }
    result = {group: value for group, value in result.items() if value > 1.0e-8}
    total = sum(result.values())
    if total <= 0.0:
        raise RuntimeError("Projected vertex lost all skin weights")
    return {group: value / total for group, value in result.items()}


def patch_projector(
    patch_faces: set[tuple[tuple[float, float, float], ...]],
    key_points,
    face_records,
    logical_weights,
):
    vertices = sorted(set().union(*patch_faces))
    vertex_index = {key: index for index, key in enumerate(vertices)}
    faces = sorted(patch_faces)
    bvh = BVHTree.FromPolygons(
        [key_points[key] for key in vertices],
        [[vertex_index[key] for key in face] for face in faces],
        all_triangles=True,
    )
    if bvh is None:
        raise RuntimeError("Could not construct frozen source-patch BVH")

    def project(
        query: Vector,
        *,
        ring_name: str,
        ring_index: int,
        projection_mode: str = "HEAD_LOCAL_NEGATIVE_Z_RAY",
    ) -> dict[str, object]:
        # L1/L2 are ordered indexed loops.  A global closest-point query can
        # send two adjacent samples to the same source vertex at a folded lip
        # ridge, collapsing the new band.  Project along the head-local depth
        # axis instead: a ray hit retains the independently derived X/Y sample
        # and only reads the accepted source surface's depth, UVs, and weights.
        if projection_mode == "HEAD_LOCAL_NEGATIVE_Z_RAY":
            location, _normal, face_index, distance = bvh.ray_cast(
                query, Vector((0.0, 0.0, -1.0)), 0.05
            )
        elif projection_mode == "NEAREST_3D_FROZEN_PATCH":
            location, _normal, face_index, distance = bvh.find_nearest(query)
        else:
            raise RuntimeError(f"Unsupported surgical projection mode: {projection_mode}")
        if location is None or face_index is None or distance is None:
            nearest, _nearest_normal, nearest_face, nearest_distance = bvh.find_nearest(
                query
            )
            raise SurgicalGateError(
                "Ordered surgical-loop depth projection missed the frozen source patch",
                {
                    "gate": "ordered-one-to-one-source-surface-projection",
                    "ringName": ring_name,
                    "ringIndex": ring_index,
                    "queryHeadLocal": [float(value) for value in query],
                    "projectionMode": projection_mode,
                    "directionHeadLocal": (
                        [0.0, 0.0, -1.0]
                        if projection_mode == "HEAD_LOCAL_NEGATIVE_Z_RAY"
                        else None
                    ),
                    "maximumDistanceMeters": 0.05,
                    "nearestPointHeadLocal": (
                        [float(value) for value in nearest] if nearest is not None else None
                    ),
                    "nearestFaceIndex": nearest_face,
                    "nearestDistanceMeters": (
                        float(nearest_distance) if nearest_distance is not None else None
                    ),
                    "nearestXyDisplacementMeters": (
                        float(Vector((nearest.x - query.x, nearest.y - query.y)).length)
                        if nearest is not None
                        else None
                    ),
                },
            )
        logical_face = faces[face_index]
        record = face_records[logical_face]
        ordered = record["orderedKeys"]
        points = [key_points[key] for key in ordered]
        coefficients = barycentric_3d(location, *points)
        uvs = [np.asarray(value, dtype=np.float64) for value in record["orderedUvs"]]
        uv = sum(
            (coefficients[index] * uvs[index] for index in range(3)),
            np.zeros(2, dtype=np.float64),
        )
        skin = interpolate_weight_maps(
            [logical_weights[key] for key in ordered], coefficients
        )
        return {
            "point": location.copy(),
            "uv": tuple(float(value) for value in uv),
            "weights": skin,
            "sourceLogicalFace": logical_face,
            "sourcePolygonIndex": record["polygonIndex"],
            "barycentric": [float(value) for value in coefficients],
            "queryDistanceMeters": float(distance),
            "method": projection_mode,
        }

    return project


def barycentric_2d(
    query: np.ndarray,
    first: np.ndarray,
    second: np.ndarray,
    third: np.ndarray,
) -> np.ndarray:
    denominator = cross2(second - first, third - first)
    if abs(denominator) <= 1.0e-20:
        raise RuntimeError("Harmonic source triangle is degenerate")
    first_weight = cross2(second - query, third - query) / denominator
    second_weight = cross2(third - query, first - query) / denominator
    third_weight = 1.0 - first_weight - second_weight
    return np.asarray(
        [first_weight, second_weight, third_weight], dtype=np.float64
    )


def harmonic_patch_projector(
    patch_faces: set[tuple[tuple[float, float, float], ...]],
    harmonic_uv: dict[tuple[float, float, float], np.ndarray],
    key_points,
    face_records,
    logical_weights,
):
    """Map one injective harmonic-disk point back to the frozen source patch."""

    faces = sorted(patch_faces)
    tolerance = 2.0e-10

    def project(
        query: np.ndarray, *, ring_name: str, ring_index: int
    ) -> dict[str, object]:
        query = np.asarray(query, dtype=np.float64)
        candidates = []
        for logical_face in faces:
            ordered = tuple(sorted(logical_face))
            coefficients = barycentric_2d(
                query, *(harmonic_uv[key] for key in ordered)
            )
            minimum = float(np.min(coefficients))
            maximum = float(np.max(coefficients))
            if minimum >= -tolerance and maximum <= 1.0 + tolerance:
                candidates.append((minimum, logical_face, ordered, coefficients))
        if not candidates:
            raise SurgicalGateError(
                "Projected collar point escaped the injective harmonic source disk",
                {
                    "gate": "surface-collar-harmonic-disk-complete-coverage",
                    "ringName": ring_name,
                    "ringIndex": ring_index,
                    "queryUv": [float(value) for value in query],
                    "containmentTolerance": tolerance,
                },
            )
        # Points on a shared edge have two valid source triangles.  Prefer the
        # candidate with the largest minimum barycentric clearance, then the
        # canonical logical-face order.  This is deterministic and maps every
        # query to exactly one source triangle without positional widening.
        _minimum, logical_face, ordered, coefficients = sorted(
            candidates, key=lambda item: (-item[0], item[1])
        )[0]
        coefficients = np.clip(coefficients, 0.0, 1.0)
        coefficients /= float(np.sum(coefficients))
        coefficient_by_key = dict(zip(ordered, coefficients, strict=True))
        point = sum(
            (
                float(coefficient_by_key[key]) * key_points[key]
                for key in ordered
            ),
            Vector(),
        )
        record = face_records[logical_face]
        record_coefficients = np.asarray(
            [coefficient_by_key[key] for key in record["orderedKeys"]],
            dtype=np.float64,
        )
        source_uvs = [
            np.asarray(value, dtype=np.float64) for value in record["orderedUvs"]
        ]
        uv = sum(
            (
                record_coefficients[index] * source_uvs[index]
                for index in range(3)
            ),
            np.zeros(2, dtype=np.float64),
        )
        skin = interpolate_weight_maps(
            [logical_weights[key] for key in record["orderedKeys"]],
            record_coefficients,
        )
        return {
            "point": point,
            "uv": tuple(float(value) for value in uv),
            "weights": skin,
            "sourceLogicalFace": logical_face,
            "sourcePolygonIndex": record["polygonIndex"],
            "barycentric": [float(value) for value in record_coefficients],
            "queryDistanceMeters": 0.0,
            "harmonicQuery": [float(value) for value in query],
            "harmonicCandidateCount": len(candidates),
            "method": "POSITIVE_UNIFORM_HARMONIC_DISK_BARYCENTRIC",
        }

    return project


def make_oral_material() -> bpy.types.Material:
    material = bpy.data.materials.get("HumanFoundation_MouthBag_Matte")
    if material is None:
        material = bpy.data.materials.new("HumanFoundation_MouthBag_Matte")
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError("Neutral mouth material has no Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.18, 0.025, 0.035, 1.0)
    principled.inputs["Roughness"].default_value = 0.72
    if "Metallic" in principled.inputs:
        principled.inputs["Metallic"].default_value = 0.0
    return material


def coordinate_hash(keys) -> str:
    return sha256(
        json.dumps(
            [list(key) for key in sorted(keys)], separators=(",", ":")
        ).encode("utf-8")
    ).hexdigest().upper()


def append_band_faces(
    face_meta: dict[tuple[int, int, int], dict[str, object]],
    first_ring: list[int],
    second_ring: list[int],
    vertex_uvs: list[tuple[float, float]],
    material_index: int,
    first_ring_segment_uvs: list[dict[int, tuple[float, float]]] | None = None,
) -> None:
    count = len(first_ring)
    if count != len(second_ring):
        raise RuntimeError("Indexed surgical loop cardinalities differ")
    for index in range(count):
        following = (index + 1) % count
        for face in (
            (first_ring[index], first_ring[following], second_ring[following]),
            (first_ring[index], second_ring[following], second_ring[index]),
        ):
            key = tuple(sorted(face))
            if key in face_meta:
                raise RuntimeError(f"Duplicate rebuilt logical face: {key}")
            uv_by_vertex = {vertex: vertex_uvs[vertex] for vertex in face}
            if first_ring_segment_uvs is not None:
                segment_uvs = first_ring_segment_uvs[index]
                for vertex in face:
                    if vertex in segment_uvs:
                        uv_by_vertex[vertex] = segment_uvs[vertex]
            face_meta[key] = {
                "vertices": face,
                "uvByVertex": uv_by_vertex,
                "materialIndex": material_index,
            }


def convex_hull_xy(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Return one deterministic counter-clockwise hull for source-measured XY points."""

    ordered = sorted(set((float(x), float(y)) for x, y in points))
    if len(ordered) < 3:
        raise RuntimeError("Oral slice has fewer than three unique XY support points")

    def cross(origin, first, second) -> float:
        return (first[0] - origin[0]) * (second[1] - origin[1]) - (
            first[1] - origin[1]
        ) * (second[0] - origin[0])

    lower: list[tuple[float, float]] = []
    for point in ordered:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0.0:
            lower.pop()
        lower.append(point)
    upper: list[tuple[float, float]] = []
    for point in reversed(ordered):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0.0:
            upper.pop()
        upper.append(point)
    hull = lower[:-1] + upper[:-1]
    if len(hull) < 3:
        raise RuntimeError("Oral slice support points are collinear")
    return hull


def convex_hull_ray_radius(
    center: tuple[float, float],
    hull: list[tuple[float, float]],
    direction: tuple[float, float],
) -> float:
    """Intersect a ray from an interior point with a deterministic convex hull."""

    dx, dy = direction
    direction_length = math.hypot(dx, dy)
    if direction_length <= 1.0e-12:
        raise RuntimeError("Oral slice received a zero-length sampling direction")
    dx /= direction_length
    dy /= direction_length
    cx, cy = center
    intersections = []
    for index, first in enumerate(hull):
        second = hull[(index + 1) % len(hull)]
        ex = second[0] - first[0]
        ey = second[1] - first[1]
        denominator = dx * ey - dy * ex
        if abs(denominator) <= 1.0e-15:
            continue
        px = first[0] - cx
        py = first[1] - cy
        travel = (px * ey - py * ex) / denominator
        segment = (px * dy - py * dx) / denominator
        if travel >= -1.0e-12 and -1.0e-12 <= segment <= 1.0 + 1.0e-12:
            intersections.append(max(0.0, float(travel)))
    if not intersections:
        raise RuntimeError("Oral slice sampling ray did not intersect its convex hull")
    positive = [value for value in intersections if value > 1.0e-12]
    if not positive:
        raise RuntimeError("Oral slice sampling center is not strictly inside its hull")
    return min(positive)


def oral_slice_support_points(
    surfaces: dict[str, dict[str, object]],
    lower_z: float,
    upper_z: float,
) -> tuple[list[tuple[float, float]], int]:
    """Collect conservative source geometry support for one head-local depth slab."""

    result: list[tuple[float, float]] = []
    triangle_count = 0
    for owner in ("upper", "lower", "tongue"):
        surface = surfaces[owner]
        points = surface["points"]
        for triangle in surface["triangles"]:
            triangle_points = [points[index] for index in triangle]
            minimum_z = min(point.z for point in triangle_points)
            maximum_z = max(point.z for point in triangle_points)
            if maximum_z < lower_z or minimum_z > upper_z:
                continue
            triangle_count += 1
            result.extend((float(point.x), float(point.y)) for point in triangle_points)
    return result, triangle_count


def rebuild_head_mesh(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    neutral,
    raw_keys,
    raw_for_key,
    key_points,
    regions,
    exterior_faces,
    patch,
    boundary,
) -> dict[str, object]:
    face_records = source_face_records(head, raw_keys)
    group_names, logical_weights, weight_parity = logical_vertex_weights(
        head, raw_for_key
    )
    kept_faces = exterior_faces - patch
    if len(exterior_faces) != 5506 or len(patch) != 717 or len(kept_faces) != 4789:
        raise SurgicalGateError(
            "Minimal surgical cut changed the locked exterior face partition",
            {
                "gate": "minimal-cut-locked-exterior-face-partition",
                "expected": {
                    "sourceExteriorFaceCount": 5506,
                    "removedPatchFaceCount": 717,
                    "untouchedExteriorFaceCount": 4789,
                },
                "actual": {
                    "sourceExteriorFaceCount": len(exterior_faces),
                    "removedPatchFaceCount": len(patch),
                    "untouchedExteriorFaceCount": len(kept_faces),
                },
            },
        )
    kept_edge_use: Counter[
        tuple[tuple[float, float, float], tuple[float, float, float]]
    ] = Counter()
    for face in kept_faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                kept_edge_use[edge_key(first, second)] += 1
    source_kept_nonmanifold_edges = {
        edge: count for edge, count in kept_edge_use.items() if count > 2
    }
    source_exterior_edge_use: Counter[
        tuple[tuple[float, float, float], tuple[float, float, float]]
    ] = Counter()
    for face in exterior_faces:
        for offset, first in enumerate(face):
            for second in face[offset + 1 :]:
                source_exterior_edge_use[edge_key(first, second)] += 1
    source_exterior_boundary_edges = {
        edge for edge, count in source_exterior_edge_use.items() if count == 1
    }
    kept_keys = sorted(set().union(*kept_faces))
    baseline_key_index = {key: index for index, key in enumerate(kept_keys)}
    baseline_faces = sorted(kept_faces)
    baseline_points = [key_points[key] for key in kept_keys]
    baseline_polygons = [
        tuple(baseline_key_index[key] for key in face) for face in baseline_faces
    ]
    baseline_precision = direct.exact_intersection_precision(baseline_points)
    baseline_overlap_indices = direct.nonadjacent_self_overlaps(
        baseline_points, baseline_polygons, kept_keys, baseline_precision
    )
    source_kept_overlap_face_pairs = {
        tuple(sorted((baseline_faces[first], baseline_faces[second])))
        for first, second in baseline_overlap_indices
    }
    key_to_index = {}
    head_points: list[Vector] = []
    object_points: list[Vector] = []
    vertex_uvs: list[tuple[float, float]] = []
    vertex_weights: list[dict[int, float]] = []
    vertex_roles: list[str] = []

    def append_vertex(
        point, uv, weights, role, original_key=None, original_object_point=None
    ) -> int:
        index = len(head_points)
        head_local_point = Vector(point)
        head_points.append(head_local_point)
        object_points.append(
            Vector(original_object_point)
            if original_object_point is not None
            else direct.object_point_from_head_local(head, armature, head_local_point)
        )
        vertex_uvs.append(tuple(float(value) for value in uv))
        vertex_weights.append(dict(weights))
        vertex_roles.append(role)
        if original_key is not None:
            key_to_index[original_key] = index
        return index

    uv_for_key = {}
    for logical_face in sorted(kept_faces):
        record = face_records[logical_face]
        for key, uv in zip(
            record["orderedKeys"], record["orderedUvs"], strict=True
        ):
            uv_for_key.setdefault(key, uv)
    for key in kept_keys:
        append_vertex(
            key_points[key],
            uv_for_key[key],
            logical_weights[key],
            "UNCHANGED_SOURCE_EXTERIOR",
            key,
            head.data.vertices[raw_for_key[key][0]].co.copy(),
        )

    face_meta: dict[tuple[int, int, int], dict[str, object]] = {}
    for logical_face in sorted(kept_faces):
        record = face_records[logical_face]
        vertices = tuple(key_to_index[key] for key in record["orderedKeys"])
        face_meta[tuple(sorted(vertices))] = {
            "vertices": vertices,
            "uvByVertex": {
                key_to_index[key]: uv
                for key, uv in zip(
                    record["orderedKeys"], record["orderedUvs"], strict=True
                )
            },
            "materialIndex": int(record["materialIndex"]),
        }

    boundary_ring = [key_to_index[key] for key in boundary]
    kept_faces_by_edge: dict[
        tuple[tuple[float, float, float], tuple[float, float, float]], list
    ] = defaultdict(list)
    for logical_face in kept_faces:
        for offset, first in enumerate(logical_face):
            for second in logical_face[offset + 1 :]:
                kept_faces_by_edge[edge_key(first, second)].append(logical_face)
    boundary_segment_uvs = []
    boundary_segment_uv_digest = sha256()
    boundary_uv_seam_vertices: dict[
        tuple[float, float, float], set[tuple[float, float]]
    ] = defaultdict(set)
    for index, first in enumerate(boundary):
        following = (index + 1) % len(boundary)
        second = boundary[following]
        candidates = kept_faces_by_edge[edge_key(first, second)]
        if len(candidates) != 1:
            raise SurgicalGateError(
                "Locked cut boundary does not have one retained source UV face",
                {
                    "gate": "l0-retained-face-per-segment-uv-provenance",
                    "segmentIndex": index,
                    "first": list(first),
                    "second": list(second),
                    "retainedFaceCount": len(candidates),
                },
            )
        record = face_records[candidates[0]]
        uv_by_key = dict(
            zip(record["orderedKeys"], record["orderedUvs"], strict=True)
        )
        segment_uvs = {
            boundary_ring[index]: tuple(float(value) for value in uv_by_key[first]),
            boundary_ring[following]: tuple(
                float(value) for value in uv_by_key[second]
            ),
        }
        boundary_segment_uvs.append(segment_uvs)
        boundary_uv_seam_vertices[first].add(segment_uvs[boundary_ring[index]])
        boundary_uv_seam_vertices[second].add(
            segment_uvs[boundary_ring[following]]
        )
        boundary_segment_uv_digest.update(
            np.asarray(
                [
                    *segment_uvs[boundary_ring[index]],
                    *segment_uvs[boundary_ring[following]],
                ],
                dtype="<f8",
            ).tobytes()
        )
    parameters, boundary_perimeter = canonical_cycle_parameters(boundary, key_points)
    lip_support = (regions["mouthUpper"] | regions["mouthLower"]) & regions["surfaceComponents"][0]
    outer_upper = [key for key in lip_support if key_points[key].y >= 0.0255]
    outer_lower = [key for key in lip_support if key_points[key].y <= 0.0253]
    center_x = (
        min(key_points[key].x for key in lip_support)
        + max(key_points[key].x for key in lip_support)
    ) * 0.5
    upper_inner_y = min(key_points[key].y for key in outer_upper)
    lower_inner_y = max(key_points[key].y for key in outer_lower)
    center_y = (upper_inner_y + lower_inner_y) * 0.5
    neutral_half_gap = (upper_inner_y - lower_inner_y) * 0.5
    if not (0.0 < neutral_half_gap < 0.001):
        raise RuntimeError(
            f"Source-derived neutral inner-lip half gap changed: {neutral_half_gap}"
        )
    outer_half_width = max(abs(key_points[key].x - center_x) for key in lip_support)
    outer_half_height = max(abs(key_points[key].y - center_y) for key in lip_support)
    lip_support_edges = {
        edge_key(first, second)
        for face in exterior_faces
        for offset, first in enumerate(face)
        for second in face[offset + 1 :]
        if first in lip_support and second in lip_support
    }
    if not lip_support_edges:
        raise RuntimeError("Exact outer-lip support contains no source topology edges")
    lip_edge_spacing = float(
        np.median(
            np.asarray(
                [
                    float((key_points[first] - key_points[second]).length)
                    for first, second in sorted(lip_support_edges)
                ],
                dtype=np.float64,
            )
        )
    )
    aperture_half_width = outer_half_width - lip_edge_spacing
    if aperture_half_width <= outer_half_width * 0.75:
        raise RuntimeError(
            "Source-derived aperture inset is not a bounded single-loop spacing: "
            f"{aperture_half_width}/{outer_half_width}/{lip_edge_spacing}"
        )
    boundary_signed_area_twice = sum(
        key_points[key].x * key_points[boundary[(index + 1) % len(boundary)]].y
        - key_points[boundary[(index + 1) % len(boundary)]].x * key_points[key].y
        for index, key in enumerate(boundary)
    )
    if abs(boundary_signed_area_twice) <= 1.0e-12:
        raise RuntimeError("Locked L0 boundary has zero projected signed area")
    parameter_orientation = 1.0 if boundary_signed_area_twice > 0.0 else -1.0
    parameter_phase = math.atan2(
        key_points[boundary[0]].y - center_y,
        key_points[boundary[0]].x - center_x,
    )
    patch_vertices = sorted(set().union(*patch))
    patch_front_z = max(key_points[key].z for key in patch_vertices)
    project = patch_projector(
        patch, key_points, face_records, logical_weights
    )
    projected_ring_samples = {}
    for ring_name, half_width, half_height in (
        ("L1_OUTER_LIP", outer_half_width, outer_half_height),
        ("L2_APERTURE", aperture_half_width, neutral_half_gap),
    ):
        samples = []
        for ring_index, parameter in enumerate(parameters):
            theta = parameter_phase + parameter_orientation * 2.0 * math.pi * parameter
            query = Vector(
                (
                    center_x + half_width * math.cos(theta),
                    center_y + half_height * math.sin(theta),
                    patch_front_z + 0.01,
                )
            )
            sample = project(query, ring_name=ring_name, ring_index=ring_index)
            samples.append(sample)
        projected_ring_samples[ring_name] = samples

    outer_samples = projected_ring_samples["L1_OUTER_LIP"]
    # Both loops use the same locked L0 arclength parameters, its projected
    # signed orientation, and an L0[0]-derived angular phase.  Their indexed
    # correspondence is therefore identity by construction.  A direct L0-L1
    # span is not emitted: the deeply folded accepted source boundary requires
    # multiple source-projected collar rings.  The final exact intersection
    # gate audits the actual emitted collar instead of rejecting it based on an
    # unused long-span diagnostic band.
    ordered_sample_indices = list(range(len(boundary)))
    alignment_shift = 0
    alignment_direction = 1
    alignment_score = sum(
        float((key_points[key] - outer_samples[index]["point"]).length_squared)
        for index, key in enumerate(boundary)
    )
    direct_span_points = [key_points[key] for key in boundary] + [
        outer_samples[index]["point"] for index in ordered_sample_indices
    ]
    direct_span_polygons = []
    for index in range(len(boundary)):
        following = (index + 1) % len(boundary)
        direct_span_polygons.extend(
            (
                (index, following, len(boundary) + following),
                (index, len(boundary) + following, len(boundary) + index),
            )
        )
    direct_span_overlap_count = len(
        direct.nonadjacent_self_overlaps(
            direct_span_points,
            direct_span_polygons,
            [
                tuple(round(float(value), 6) for value in point)
                for point in direct_span_points
            ],
            direct.exact_intersection_precision(direct_span_points),
        )
    )
    ring_projections = {}
    rings = [boundary_ring]
    ring_raw_indices_by_role = {"L0_ATTACHMENT": boundary_ring}
    ordered_outer_samples = [
        projected_ring_samples["L1_OUTER_LIP"][index]
        for index in ordered_sample_indices
    ]
    boundary_to_outer_distances = [
        float((key_points[key] - sample["point"]).length)
        for key, sample in zip(boundary, ordered_outer_samples, strict=True)
    ]
    maximum_boundary_to_outer_distance = max(boundary_to_outer_distances)
    collar_target_maximum_step = 1.25 * lip_edge_spacing
    surface_segment_count = max(
        2,
        int(math.ceil(maximum_boundary_to_outer_distance / collar_target_maximum_step)),
    )
    if surface_segment_count > 32:
        raise SurgicalGateError(
            "Source-derived facial collar requires an unbounded ring count",
            {
                "gate": "projected-surface-collar-bounded-density",
                "maximumBoundaryToOuterLipDistanceMeters": maximum_boundary_to_outer_distance,
                "targetMaximumSegmentLengthMeters": collar_target_maximum_step,
                "requiredSurfaceSegmentCount": surface_segment_count,
                "maximumAllowedSurfaceSegmentCount": 32,
            },
        )
    annulus_point_rings, harmonic_annulus_receipt = harmonic_annulus_points(
        [key_points[key] for key in boundary],
        [sample["point"] for sample in ordered_outer_samples],
        surface_segment_count,
    )
    collar_flat_values = []
    for collar_index in range(1, surface_segment_count):
        ring_name = f"C{collar_index:02d}_PROJECTED_SOURCE_SURFACE"
        samples = []
        for ring_index, point in enumerate(annulus_point_rings[collar_index]):
            sample = project(
                point,
                ring_name=ring_name,
                ring_index=ring_index,
                projection_mode="NEAREST_3D_FROZEN_PATCH",
            )
            sample["sourceSurfacePointHeadLocal"] = [
                float(value) for value in sample["point"]
            ]
            sample["point"] = point.copy()
            sample["method"] = (
                "HARMONIC_ANNULUS_GEOMETRY_WITH_NEAREST_FROZEN_SOURCE_"
                "ATTRIBUTE_TRANSFER"
            )
            samples.append(sample)
            collar_flat_values.extend(float(value) for value in sample["point"])
        ring = [
            append_vertex(
                sample["point"],
                sample["uv"],
                sample["weights"],
                ring_name,
            )
            for sample in samples
        ]
        rings.append(ring)
        ring_raw_indices_by_role[ring_name] = ring
        ring_projections[ring_name] = [
            {
                "sourcePolygonIndex": sample["sourcePolygonIndex"],
                "barycentric": sample["barycentric"],
                "queryDistanceMeters": sample["queryDistanceMeters"],
                "method": sample["method"],
            }
            for sample in samples
        ]
    for ring_name in ("L1_OUTER_LIP", "L2_APERTURE"):
        samples = projected_ring_samples[ring_name]
        ordered_samples = [samples[index] for index in ordered_sample_indices]
        ring = [
            append_vertex(
                sample["point"],
                sample["uv"],
                sample["weights"],
                ring_name,
            )
            for sample in ordered_samples
        ]
        rings.append(ring)
        ring_raw_indices_by_role[ring_name] = ring
        ring_projections[ring_name] = [
            {
                "sourcePolygonIndex": sample["sourcePolygonIndex"],
                "barycentric": sample["barycentric"],
                "queryDistanceMeters": sample["queryDistanceMeters"],
                "method": sample["method"],
            }
            for sample in ordered_samples
        ]
    head_material_band_count = len(rings) - 1
    surface_collar_receipt = {
        "method": (
            "LOCKED_L0_TO_MEASURED_L1_BOUNDARY_CONSTRAINED_HARMONIC_ANNULUS_"
            "WITH_MONOTONIC_DEPTH_AND_NEAREST_SOURCE_ATTRIBUTE_TRANSFER"
        ),
        "parameterization": (
            "IDENTITY_INDEXING_FROM_SHARED_L0_ARCLENGTH_PHASE_AND_ORIENTATION;_"
            "POSITIVE_UNIFORM_ANNULAR_GRAPH_LAPLACIAN_FOR_XY;_MONOTONIC_Z"
        ),
        "harmonicAnnulus": harmonic_annulus_receipt,
        "spacingDerivation": "1.25_TIMES_SOURCE_MEDIAN_LIP_EDGE_SPACING",
        "sourceLipMedianEdgeSpacingMeters": lip_edge_spacing,
        "targetMaximumSegmentLengthMeters": collar_target_maximum_step,
        "maximumBoundaryToOuterLipDistanceMeters": maximum_boundary_to_outer_distance,
        "rootMeanSquareBoundaryToOuterLipDistanceMeters": math.sqrt(
            sum(value * value for value in boundary_to_outer_distances)
            / len(boundary_to_outer_distances)
        ),
        "surfaceSegmentCount": surface_segment_count,
        "intermediateCollarRingCount": surface_segment_count - 1,
        "ringCardinality": len(boundary),
        "projectedCollarFloat64Sha256": sha256(
            np.asarray(collar_flat_values, dtype="<f8").tobytes()
        ).hexdigest().upper(),
        "l0RetainedSegmentUvFloat64Sha256": boundary_segment_uv_digest.hexdigest().upper(),
        "l0UvSeamVertexCount": sum(
            len(values) > 1 for values in boundary_uv_seam_vertices.values()
        ),
    }

    sheet_keys = set().union(*regions["surfaceComponents"][1:])
    bag_back_z = min(key_points[key].z for key in sheet_keys)
    source_oral_sheet_front_z = max(key_points[key].z for key in sheet_keys)
    aperture_ring = ring_raw_indices_by_role["L2_APERTURE"]
    bag_depth = max(head_points[index].z for index in aperture_ring) - bag_back_z
    if bag_depth < 0.003:
        raise RuntimeError(f"Source-derived mouth-bag depth is too small: {bag_depth}")
    oral_source = locked_oral_source_geometry()
    aperture_uvs = [vertex_uvs[index] for index in aperture_ring]
    aperture_weights = [vertex_weights[index] for index in aperture_ring]
    aperture_points = [head_points[index] for index in aperture_ring]
    aperture_front_z = max(point.z for point in aperture_points)
    envelope_fit_derived = {
        "centerX": float(center_x),
        "centerY": float(center_y),
        "apertureHalfWidthMeters": float(aperture_half_width),
        "sourceLipMedianEdgeSpacingMeters": float(lip_edge_spacing),
        "apertureMaximumDepthZ": float(aperture_front_z),
        "mouthBagDepthMeters": float(bag_depth),
    }
    # The prior exact-neutral proof established that the first two source lip
    # spacings are the smallest collision-free hidden collar.  Place the oral
    # package behind that measured collar, then derive every deeper wall slice
    # from the correspondingly shifted source surfaces.
    design_depth_offset = 2.0 * lip_edge_spacing
    envelope_surfaces, envelope_transforms = oral_fit_surfaces(
        oral_source, envelope_fit_derived, design_depth_offset
    )
    anatomy_points = [
        point
        for owner in ("upper", "lower", "tongue")
        for point in envelope_surfaces[owner]["points"]
    ]
    anatomy_front_z = max(point.z for point in anatomy_points)
    anatomy_back_z = min(point.z for point in anatomy_points)
    slice_step = 0.5 * lip_edge_spacing
    slice_clearance = 0.25 * lip_edge_spacing
    # A connected wall band spans two neighboring slice intervals.  Gather
    # source-triangle support over that complete chord footprint so neither
    # endpoint profile can cut through anatomy that lies between samples.
    slice_support_half_span = 2.0 * slice_step
    rear_cap_clearance = 0.5 * lip_edge_spacing
    first_depth = slice_step
    last_depth = bag_depth - rear_cap_clearance
    if anatomy_front_z >= aperture_front_z - 0.25 * lip_edge_spacing:
        raise RuntimeError(
            "Source-measured oral anatomy leaves no deterministic front collar clearance"
        )
    if anatomy_back_z <= bag_back_z + rear_cap_clearance:
        raise RuntimeError(
            "Source-measured oral anatomy leaves no deterministic back-wall clearance"
        )
    if last_depth <= first_depth:
        raise RuntimeError("Source-derived mouth bag cannot hold a sliced oral envelope")
    slice_depths = []
    depth = first_depth
    while depth < last_depth - 1.0e-12:
        slice_depths.append(depth)
        depth += slice_step
    slice_depths.append(last_depth)
    slice_profiles = []
    envelope_flat_values = []
    minimum_core_radius = max(neutral_half_gap, 0.25 * lip_edge_spacing)
    for depth_index, depth in enumerate(slice_depths, start=1):
        depth_fraction = depth / bag_depth
        ring = []
        supporting_triangle_counts = []
        unique_support_point_counts = []
        hull_vertex_counts = []
        sample_depths = []
        for index, aperture_point in enumerate(aperture_points):
            sample_z = (1.0 - depth_fraction) * aperture_point.z + depth_fraction * bag_back_z
            support_points, supporting_triangle_count = oral_slice_support_points(
                envelope_surfaces,
                sample_z - slice_support_half_span,
                sample_z + slice_support_half_span,
            )
            support_points.extend(
                (
                    (center_x - minimum_core_radius, center_y - minimum_core_radius),
                    (center_x + minimum_core_radius, center_y - minimum_core_radius),
                    (center_x + minimum_core_radius, center_y + minimum_core_radius),
                    (center_x - minimum_core_radius, center_y + minimum_core_radius),
                )
            )
            # Every deeper slice contains the exact neutral aperture footprint.
            # This prevents a narrow front tooth slice from shrinking the side
            # wall before the posterior dental arch expands again.
            support_points.extend(
                (float(point.x), float(point.y)) for point in aperture_points
            )
            hull = convex_hull_xy(support_points)
            supporting_triangle_counts.append(supporting_triangle_count)
            unique_support_point_counts.append(len(set(support_points)))
            hull_vertex_counts.append(len(hull))
            sample_depths.append(float(sample_z))
            normalized_x = float(aperture_point.x - center_x) / aperture_half_width
            normalized_y = float(aperture_point.y - center_y) / neutral_half_gap
            direction_x = normalized_x
            direction_y = normalized_y
            direction_length = math.hypot(direction_x, direction_y)
            if direction_length <= 1.0e-12:
                raise RuntimeError("Locked aperture loop contains its own center")
            direction = (
                direction_x / direction_length,
                direction_y / direction_length,
            )
            if depth <= design_depth_offset + 1.0e-12:
                point_x = float(aperture_point.x)
                point_y = float(aperture_point.y)
            else:
                radial_distance = (
                    convex_hull_ray_radius((center_x, center_y), hull, direction)
                    + slice_clearance
                )
                point_x = center_x + direction[0] * radial_distance
                point_y = center_y + direction[1] * radial_distance
            point = Vector(
                (
                    point_x,
                    point_y,
                    sample_z,
                )
            )
            envelope_flat_values.extend((float(point.x), float(point.y), float(point.z)))
            ring.append(
                append_vertex(
                    point,
                    (parameters[index], depth_fraction),
                    aperture_weights[index],
                    f"L{depth_index + 2}_SOURCE_SLICE_MOUTH_BAG",
                )
            )
        rings.append(ring)
        ring_points = [head_points[index] for index in ring]
        slice_profiles.append(
            {
                "ringIndex": depth_index + 2,
                "depthMeters": float(depth),
                "depthFraction": float(depth_fraction),
                "minimumSampleDepthZ": min(sample_depths),
                "maximumSampleDepthZ": max(sample_depths),
                "supportingTriangleCountRange": [
                    min(supporting_triangle_counts),
                    max(supporting_triangle_counts),
                ],
                "uniqueSupportPointCountRange": [
                    min(unique_support_point_counts),
                    max(unique_support_point_counts),
                ],
                "convexHullVertexCountRange": [
                    min(hull_vertex_counts),
                    max(hull_vertex_counts),
                ],
                "minimumX": float(min(point.x for point in ring_points)),
                "maximumX": float(max(point.x for point in ring_points)),
                "minimumY": float(min(point.y for point in ring_points)),
                "maximumY": float(max(point.y for point in ring_points)),
            }
        )
    cap_weights = {}
    for weights in aperture_weights:
        for group, value in weights.items():
            cap_weights[group] = cap_weights.get(group, 0.0) + value / len(aperture_weights)
    cap_index = append_vertex(
        Vector((center_x, center_y, bag_back_z)),
        (0.5, 1.0),
        cap_weights,
        f"L{len(rings)}_SOURCE_SLICE_MOUTH_BAG_CAP",
    )

    source_materials = [material for material in head.data.materials]
    oral_material = make_oral_material()
    oral_material_index = len(source_materials)
    for band_index, (first_ring, second_ring) in enumerate(
        zip(rings, rings[1:])
    ):
        material_index = (
            0 if band_index < head_material_band_count else oral_material_index
        )
        append_band_faces(
            face_meta,
            first_ring,
            second_ring,
            vertex_uvs,
            material_index,
            first_ring_segment_uvs=(
                boundary_segment_uvs if band_index == 0 else None
            ),
        )
    last_ring = rings[-1]
    for index in range(len(last_ring)):
        following = (index + 1) % len(last_ring)
        face = (last_ring[index], last_ring[following], cap_index)
        face_meta[tuple(sorted(face))] = {
            "vertices": face,
            "uvByVertex": {
                vertex: vertex_uvs[vertex] for vertex in face
            },
            "materialIndex": oral_material_index,
        }

    mesh = bpy.data.meshes.new("HumanFoundation_HeadBase_SurgicalMouthProofMesh")
    mesh.from_pydata(
        object_points,
        [],
        [meta["vertices"] for meta in face_meta.values()],
    )
    mesh.materials.clear()
    for material in source_materials:
        mesh.materials.append(material)
    mesh.materials.append(oral_material)
    work = bmesh.new()
    work.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(work, faces=list(work.faces))
    work.to_mesh(mesh)
    work.free()
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        key = tuple(sorted(polygon.vertices))
        meta = face_meta.get(key)
        if meta is None:
            raise RuntimeError(f"Recalculated face lost provenance: {key}")
        polygon.material_index = int(meta["materialIndex"])
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = meta["uvByVertex"][vertex_index]
    old_mesh = head.data
    head.data = mesh
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)
    for group in list(head.vertex_groups):
        head.vertex_groups.remove(group)
    exporter_min_influence = 0.0001
    runtime_weight_floor = float(
        np.nextafter(np.float32(exporter_min_influence), np.float32(np.inf))
    )
    culled_influence_count = 0
    culled_vertex_count = 0
    maximum_culled_weight = 0.0
    for vertex_index, weights in enumerate(vertex_weights):
        kept = {
            group_index: value
            for group_index, value in weights.items()
            if value >= runtime_weight_floor
        }
        removed = [
            value for value in weights.values() if value < runtime_weight_floor
        ]
        if not kept:
            strongest = max(weights, key=weights.get)
            kept = {strongest: weights[strongest]}
            removed = [
                value for group_index, value in weights.items() if group_index != strongest
            ]
        if removed:
            culled_vertex_count += 1
            culled_influence_count += len(removed)
            maximum_culled_weight = max(maximum_culled_weight, max(removed))
        total = sum(kept.values())
        vertex_weights[vertex_index] = {
            group_index: value / total for group_index, value in kept.items()
        }
    groups = [head.vertex_groups.new(name=name) for name in group_names]
    for vertex_index, weights in enumerate(vertex_weights):
        for group_index, value in weights.items():
            groups[group_index].add([vertex_index], value, "REPLACE")
    logical_role_by_key = {}
    for point, role in zip(head_points, vertex_roles, strict=True):
        key = tuple(round(float(value), 6) for value in point)
        prior = logical_role_by_key.setdefault(key, role)
        if prior != role:
            raise RuntimeError(
                f"Rebuilt logical coordinate has conflicting semantic roles: {key}/{prior}/{role}"
            )
    return {
        "headLocalPoints": head_points,
        "vertexRoles": vertex_roles,
        "logicalRoleByKey": logical_role_by_key,
        "rings": rings,
        "ringRawIndicesByRole": ring_raw_indices_by_role,
        "capIndex": cap_index,
        "keptKeys": set(kept_keys),
        "boundaryKeys": set(boundary),
        "boundaryPerimeterMeters": boundary_perimeter,
        "weightDuplicateParityMaximum": weight_parity,
        "runtimeSkinWeightCanonicalization": {
            "policy": "DROP_AT_OR_BELOW_CACHED_BLENDER_GLTF_EXPORTER_MIN_INFLUENCE_THEN_RENORMALIZE",
            "cachedBlenderVersion": "5.2.1",
            "exporterSource": "io_scene_gltf2/blender/exp/primitive_extract.py::__get_bone_data",
            "exporterDropsWeightAtOrBelow": exporter_min_influence,
            "minimumRetainedWeight": runtime_weight_floor,
            "culledVertexCount": culled_vertex_count,
            "culledInfluenceCount": culled_influence_count,
            "maximumCulledWeight": maximum_culled_weight,
        },
        "sourceKeptNonmanifoldEdges": source_kept_nonmanifold_edges,
        "sourceExteriorBoundaryEdges": source_exterior_boundary_edges,
        "sourceKeptOverlapFacePairs": source_kept_overlap_face_pairs,
        "sourceKeptOverlapPrecision": baseline_precision,
        "ringProjections": ring_projections,
        "surfaceCollar": surface_collar_receipt,
        "derivedMeasurements": {
            "centerX": float(center_x),
            "centerY": float(center_y),
            "upperInnerY": float(upper_inner_y),
            "lowerInnerY": float(lower_inner_y),
            "neutralApertureHalfGapMeters": float(neutral_half_gap),
            "outerLipHalfWidthMeters": float(outer_half_width),
            "outerLipHalfHeightMeters": float(outer_half_height),
            "sourceLipMedianEdgeSpacingMeters": lip_edge_spacing,
            "apertureHalfWidthMeters": aperture_half_width,
            "apertureMaximumDepthZ": float(aperture_front_z),
            "mouthBagBackDepthZ": float(bag_back_z),
            "mouthBagDepthMeters": float(bag_depth),
            "sourceOralSheetFrontDepthZ": float(source_oral_sheet_front_z),
            "dentalHalfWidthMeters": float(aperture_half_width - 0.5 * lip_edge_spacing),
            "dentalUniformScale": float(envelope_transforms["dentalUniformScale"]),
            "neutralOcclusalGapMeters": float(
                envelope_transforms["neutralOcclusalGapMeters"]
            ),
            "lowerDentalMinimumYMeters": float(
                envelope_transforms["bounds"]["lowerTeeth"]["minimum"][1]
            ),
            "upperDentalMaximumYMeters": float(
                envelope_transforms["bounds"]["upperTeeth"]["maximum"][1]
            ),
            "oralVaultHalfWidthMeters": float(
                max(
                    max(abs(profile["minimumX"] - center_x), abs(profile["maximumX"] - center_x))
                    for profile in slice_profiles
                )
            ),
            "oralVaultMinimumYMeters": float(
                min(profile["minimumY"] for profile in slice_profiles)
            ),
            "oralVaultMaximumYMeters": float(
                max(profile["maximumY"] for profile in slice_profiles)
            ),
            "oralVaultHoldBackDepthZ": float(anatomy_back_z - slice_clearance),
            "oralVaultDepthsMeters": [float(value) for value in slice_depths],
            "oralVaultRingHalfWidthsMeters": [
                float(
                    max(
                        abs(profile["minimumX"] - center_x),
                        abs(profile["maximumX"] - center_x),
                    )
                )
                for profile in slice_profiles
            ],
            "oralVaultRingLowerHalfHeightsMeters": [
                float(center_y - profile["minimumY"])
                for profile in slice_profiles
            ],
            "oralVaultRingUpperHalfHeightsMeters": [
                float(profile["maximumY"] - center_y)
                for profile in slice_profiles
            ],
            "oralSliceEnvelope": {
                "algorithm": (
                    "CONSERVATIVE_TRIANGLE_SLAB_CONVEX_HULL_RADIAL_SAMPLE_WITH_"
                    "SOURCE_DERIVED_CLEARANCE"
                ),
                "designDepthOffsetMeters": float(design_depth_offset),
                "frontCollarDepthMeters": float(design_depth_offset),
                "frontCollarPolicy": "EXACT_L2_RADII_UNTIL_SHIFTED_ANATOMY_FRONT",
                "sliceStepMeters": float(slice_step),
                "sliceSupportHalfSpanMeters": float(slice_support_half_span),
                "radialClearanceMeters": float(slice_clearance),
                "minimumRadialPolicy": (
                    "CONVEX_HULL_INCLUDES_EXACT_L2_FOOTPRINT;_SAMPLED_BY_"
                    "NORMALIZED_APERTURE_ANGLE"
                ),
                "minimumCoreRadiusMeters": float(minimum_core_radius),
                "rearCapClearanceMeters": float(rear_cap_clearance),
                "anatomyFrontDepthZ": float(anatomy_front_z),
                "anatomyBackDepthZ": float(anatomy_back_z),
                "profileCount": len(slice_profiles),
                "profileFloat64Sha256": sha256(
                    np.asarray(envelope_flat_values, dtype="<f8").tobytes()
                ).hexdigest().upper(),
                "profiles": slice_profiles,
            },
            "l0ProjectedSignedAreaTwice": float(boundary_signed_area_twice),
            "indexedLoopParameterPhaseRadians": float(parameter_phase),
            "indexedLoopParameterOrientation": int(parameter_orientation),
            "indexedLoopAlignmentShift": alignment_shift,
            "indexedLoopAlignmentDirection": alignment_direction,
            "indexedLoopCorrespondence": (
                "IDENTITY_FROM_SHARED_L0_ARCLENGTH_PARAMETERS_PHASE_AND_ORIENTATION"
            ),
            "unusedDirectSpanSelfOverlapCount": direct_span_overlap_count,
            "unusedDirectSpanPolicy": (
                "DIAGNOSTIC_ONLY_NOT_EMITTED;_ACTUAL_MULTI_RING_COLLAR_MUST_PASS_"
                "THE_FULL_EXACT_INTERSECTION_GATE"
            ),
            "indexedLoopAlignmentRootMeanSquareDistanceMeters": math.sqrt(
                alignment_score / len(boundary)
            ),
        },
        "sourceMaterialCount": len(source_materials),
        "oralMaterialIndex": oral_material_index,
        "oralSource": {
            "provenance": oral_source["provenance"],
            "measurements": oral_source["measurements"],
            "gumShellPolicy": "EXCLUDED_CONNECTED_CROSS_JAW_SHELL",
        },
    }


def float32_point_hash(keys, key_points) -> str:
    values = np.asarray(
        [[float(value) for value in key_points[key]] for key in sorted(keys)],
        dtype="<f4",
    )
    return sha256(values.tobytes()).hexdigest().upper()


def topology_with_locked_reference(
    direct,
    obj: bpy.types.Object,
    points: list[Vector],
    locked_key_points=None,
    locked_match_points=None,
):
    if locked_key_points is None:
        raw_keys, raw_for_key, key_points, adjacency, faces = direct.logical_topology(
            obj, points
        )
        return (
            raw_keys,
            raw_for_key,
            key_points,
            adjacency,
            faces,
            {
                "policy": "PREEXPORT_SIX_DECIMAL_LOGICAL_REFERENCE",
                "rawVertexCount": len(points),
                "logicalVertexCount": len(raw_for_key),
                "unmatchedRawVertexCount": 0,
                "ambiguousRawVertexCount": 0,
                "missingLogicalVertexCount": 0,
                "maximumMatchDeltaMeters": 0.0,
            },
        )

    locked_keys = sorted(locked_key_points)
    if locked_match_points is None:
        locked_match_points = locked_key_points
        match_space = "HEAD_BONE_LOCAL"
    else:
        if set(locked_match_points) != set(locked_key_points):
            raise RuntimeError("Locked match/reference logical key sets differ")
        match_space = "MESH_OBJECT_LOCAL"
    locked_points = [locked_match_points[key] for key in locked_keys]
    raw_match_points = (
        [vertex.co.copy() for vertex in obj.data.vertices]
        if match_space == "MESH_OBJECT_LOCAL"
        else points
    )
    coordinate_scale = max(
        abs(float(value)) for point in locked_points for value in point
    )
    ulp = abs(float(np.spacing(np.float32(coordinate_scale))))
    component_tolerance = 4.0 * ulp
    search_radius = math.sqrt(3.0) * component_tolerance
    tree = KDTree(len(locked_points))
    for index, point in enumerate(locked_points):
        tree.insert(point, index)
    tree.balance()
    minimum_reference_separation = math.inf
    for point in locked_points:
        nearest = tree.find_n(point, 2)
        if len(nearest) != 2:
            raise RuntimeError("Locked logical reference cannot prove pairwise separation")
        minimum_reference_separation = min(
            minimum_reference_separation, float(nearest[1][2])
        )
    if minimum_reference_separation <= 2.0 * search_radius:
        raise SurgicalGateError(
            "Locked logical reference is ambiguous at the float32 match radius",
            {
                "gate": "fresh-import-unambiguous-preexport-logical-reference",
                "minimumReferenceSeparationMeters": minimum_reference_separation,
                "float32UlpMeters": ulp,
                "componentToleranceMeters": component_tolerance,
                "euclideanSearchRadiusMeters": search_radius,
            },
        )

    registration_translation = Vector((0.0, 0.0, 0.0))
    coarse_registration_radius = 0.0
    maximum_unregistered_delta = 0.0
    if match_space == "MESH_OBJECT_LOCAL":
        # The glTF axis conversion can round-trip a skinned mesh with one
        # package-wide sub-micron translation even though all relative vertex
        # coordinates are unchanged.  Establish that translation only through
        # an unambiguous nearest-reference registration, then require every
        # residual scalar component to stay within four float32 ULP.
        coarse_registration_radius = minimum_reference_separation * 0.25
        deltas = []
        for match_point in raw_match_points:
            nearest_point, _nearest_index, nearest_distance = tree.find(match_point)
            if float(nearest_distance) >= coarse_registration_radius:
                raise SurgicalGateError(
                    "Fresh import exceeded the unambiguous package-translation registration radius",
                    {
                        "gate": "fresh-import-unambiguous-package-translation-registration",
                        "nearestDeltaMeters": float(nearest_distance),
                        "coarseRegistrationRadiusMeters": coarse_registration_radius,
                    },
                )
            maximum_unregistered_delta = max(
                maximum_unregistered_delta, float(nearest_distance)
            )
            deltas.append(
                [float(match_point[axis] - nearest_point[axis]) for axis in range(3)]
            )
        registration_translation = Vector(
            tuple(
                float(np.median(np.asarray(deltas, dtype=np.float64)[:, axis]))
                for axis in range(3)
            )
        )
        raw_match_points = [
            point - registration_translation for point in raw_match_points
        ]

    raw_keys = []
    raw_for_key: dict[tuple[float, float, float], list[int]] = defaultdict(list)
    key_points = {}
    maximum_match_delta = 0.0
    maximum_head_local_delta = 0.0
    unmatched = []
    ambiguous = []
    for raw_index, (point, match_point) in enumerate(
        zip(points, raw_match_points, strict=True)
    ):
        matches = sorted(
            (
                item
                for item in tree.find_range(match_point, search_radius)
                if max(
                    abs(float(match_point[axis] - item[0][axis]))
                    for axis in range(3)
                )
                <= component_tolerance
            ),
            key=lambda item: item[1],
        )
        if not matches:
            nearest_point, nearest_index, nearest_distance = tree.find(match_point)
            unmatched.append(
                {
                    "rawVertexIndex": raw_index,
                    "headLocalPoint": [float(value) for value in point],
                    "matchSpace": match_space,
                    "registeredMatchPoint": [float(value) for value in match_point],
                    "nearestLogicalId": nearest_index,
                    "nearestLogicalCoordinate": list(locked_keys[nearest_index]),
                    "nearestDeltaMeters": float(nearest_distance),
                    "nearestPoint": [float(value) for value in nearest_point],
                }
            )
            raw_keys.append(None)
            continue
        if len(matches) != 1:
            ambiguous.append(
                {
                    "rawVertexIndex": raw_index,
                    "headLocalPoint": [float(value) for value in point],
                    "matchSpace": match_space,
                    "registeredMatchPoint": [float(value) for value in match_point],
                    "candidateLogicalIds": [item[1] for item in matches],
                    "candidateDeltasMeters": [float(item[2]) for item in matches],
                }
            )
            raw_keys.append(None)
            continue
        _matched_point, locked_index, delta = matches[0]
        key = locked_keys[locked_index]
        raw_keys.append(key)
        raw_for_key[key].append(raw_index)
        key_points.setdefault(key, point)
        maximum_match_delta = max(maximum_match_delta, float(delta))
        maximum_head_local_delta = max(
            maximum_head_local_delta,
            float((point - locked_key_points[key]).length),
        )
    missing = [key for key in locked_keys if key not in raw_for_key]
    if unmatched or ambiguous or missing:
        raise SurgicalGateError(
            "Fresh import did not map one-to-one onto the preexport logical reference",
            {
                "gate": "fresh-import-exact-logical-reference-coverage",
                "float32UlpMeters": ulp,
                "componentToleranceMeters": component_tolerance,
                "euclideanSearchRadiusMeters": search_radius,
                "unmatchedRawVertexCount": len(unmatched),
                "ambiguousRawVertexCount": len(ambiguous),
                "missingLogicalVertexCount": len(missing),
                "firstUnmatched": unmatched[:20],
                "firstAmbiguous": ambiguous[:20],
                "firstMissingLogicalCoordinates": [list(key) for key in missing[:20]],
            },
        )

    adjacency = {key: set() for key in locked_keys}
    faces: set[tuple[tuple[float, float, float], ...]] = set()
    for polygon in obj.data.polygons:
        keys = tuple(sorted({raw_keys[index] for index in polygon.vertices}))
        if len(keys) != 3:
            raise RuntimeError(
                f"Fresh import contains a collapsed locked logical face: {polygon.index}/{keys}"
            )
        faces.add(keys)
        for offset, first in enumerate(keys):
            for second in keys[offset + 1 :]:
                adjacency[first].add(second)
                adjacency[second].add(first)
    return (
        raw_keys,
        raw_for_key,
        key_points,
        adjacency,
        faces,
        {
            "policy": "PREEXPORT_FLOAT32_ULP_REFERENCE",
            "matchSpace": match_space,
            "rawVertexCount": len(points),
            "logicalVertexCount": len(raw_for_key),
            "minimumReferenceSeparationMeters": minimum_reference_separation,
            "coarseRegistrationRadiusMeters": coarse_registration_radius,
            "maximumUnregisteredDeltaMeters": maximum_unregistered_delta,
            "registeredPackageTranslationMeters": [
                float(value) for value in registration_translation
            ],
            "coordinateScaleMeters": coordinate_scale,
            "float32UlpMeters": ulp,
            "matchToleranceUlpFactor": 4,
            "componentMatchToleranceMeters": component_tolerance,
            "euclideanSearchRadiusMeters": search_radius,
            "unmatchedRawVertexCount": 0,
            "ambiguousRawVertexCount": 0,
            "missingLogicalVertexCount": 0,
            "maximumMatchDeltaMeters": maximum_match_delta,
            "maximumHeadBoneLocalDeltaMeters": maximum_head_local_delta,
        },
    )


def semantic_mesh_signature(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    locked_key_points=None,
    locked_match_points=None,
) -> tuple[dict[str, object], dict[str, object]]:
    """Canonicalize GLB semantics independently of exporter attribute splits.

    glTF stores independent position/normal/UV/skin index streams by duplicating
    Blender vertices where a corner attribute changes.  A raw mesh-index hash is
    therefore not a meaningful round-trip contract.  This signature welds only
    the already-locked six-decimal logical positions, then hashes oriented
    logical faces, per-corner UVs/normals, material assignments, and
    name-keyed skin weights.  Attribute values are quantized to one micro-unit;
    the geometry gate separately accounts for exact float32 position ULPs.
    """

    quantization = 1_000_000
    normal_quantization = 100_000

    def quantize(value: float) -> int:
        if not math.isfinite(float(value)):
            raise RuntimeError(f"Semantic mesh attribute is not finite: {value}")
        return int(round(float(value) * quantization))

    def quantize_normal(value: float) -> int:
        if not math.isfinite(float(value)):
            raise RuntimeError(f"Semantic corner normal is not finite: {value}")
        return int(round(float(value) * normal_quantization))

    points = direct.head_local_points(head, armature)
    (
        raw_keys,
        raw_for_key,
        _key_points,
        _adjacency,
        _faces,
        logical_mapping,
    ) = topology_with_locked_reference(
        direct,
        head,
        points,
        locked_key_points=locked_key_points,
        locked_match_points=locked_match_points,
    )

    maximum_duplicate_position_delta = 0.0
    for raw_indices in raw_for_key.values():
        if len(raw_indices) == 1:
            continue
        first = points[raw_indices[0]]
        maximum_duplicate_position_delta = max(
            maximum_duplicate_position_delta,
            max(float((points[index] - first).length) for index in raw_indices[1:]),
        )

    group_name_by_index = {group.index: group.name for group in head.vertex_groups}
    logical_weights = {}
    maximum_duplicate_weight_delta = 0.0
    maximum_influence_count = 0
    for key, raw_indices in sorted(raw_for_key.items()):
        samples = []
        for raw_index in raw_indices:
            sample = {
                group_name_by_index[item.group]: float(item.weight)
                for item in head.data.vertices[raw_index].groups
                if float(item.weight) > 1.0e-8
            }
            total = sum(sample.values())
            if total <= 0.0:
                raise RuntimeError(f"Semantic logical vertex has no skin weights: {key}")
            samples.append({name: value / total for name, value in sample.items()})
        names = sorted(set().union(*(set(sample) for sample in samples)))
        for name in names:
            values = [sample.get(name, 0.0) for sample in samples]
            maximum_duplicate_weight_delta = max(
                maximum_duplicate_weight_delta, max(values) - min(values)
            )
        quantized_samples = {
            tuple(
                (name, quantize(sample[name]))
                for name in sorted(sample)
                if quantize(sample[name]) != 0
            )
            for sample in samples
        }
        if len(quantized_samples) != 1:
            raise SurgicalGateError(
                "GLB attribute-split vertices changed logical skin weights",
                {
                    "gate": "fresh-import-attribute-split-skin-weight-parity",
                    "logicalCoordinate": list(key),
                    "rawVertexIndices": raw_indices,
                    "quantizedWeightVariants": [
                        [list(item) for item in variant]
                        for variant in sorted(quantized_samples)
                    ],
                    "maximumDuplicateWeightDelta": maximum_duplicate_weight_delta,
                    "quantizationUnitsPerOne": quantization,
                },
            )
        weights = next(iter(quantized_samples))
        maximum_influence_count = max(maximum_influence_count, len(weights))
        logical_weights[key] = weights

    uv_layers = list(head.data.uv_layers)
    material_slots = [
        slot.material.name if slot.material is not None else None
        for slot in head.material_slots
    ]
    logical_faces = {}
    smooth_polygon_count = 0
    for polygon in sorted(head.data.polygons, key=lambda item: item.index):
        if len(polygon.vertices) != 3:
            raise RuntimeError(
                f"Semantic mesh output is not triangulated: polygon {polygon.index}"
            )
        ordered_keys = tuple(raw_keys[index] for index in polygon.vertices)
        logical_face = tuple(sorted(set(ordered_keys)))
        if len(logical_face) != 3:
            raise SurgicalGateError(
                "Semantic mesh contains a collapsed logical face",
                {
                    "gate": "fresh-import-semantic-logical-face-cardinality",
                    "polygonIndex": polygon.index,
                    "orderedLogicalCoordinates": [list(key) for key in ordered_keys],
                },
            )
        if logical_face in logical_faces:
            raise SurgicalGateError(
                "Semantic mesh contains duplicate logical faces",
                {
                    "gate": "fresh-import-semantic-unique-logical-faces",
                    "logicalFace": [list(key) for key in logical_face],
                    "firstPolygonIndex": logical_faces[logical_face]["polygonIndex"],
                    "secondPolygonIndex": polygon.index,
                },
            )
        rotations = [
            ordered_keys[offset:] + ordered_keys[:offset] for offset in range(3)
        ]
        oriented_keys = min(rotations)
        corner_by_key = {}
        for loop_index in polygon.loop_indices:
            raw_index = head.data.loops[loop_index].vertex_index
            key = raw_keys[raw_index]
            corner_by_key[key] = {
                "logicalCoordinate": list(key),
                "uv": [
                    [quantize(value) for value in layer.data[loop_index].uv]
                    for layer in uv_layers
                ],
                "normal": [
                    quantize_normal(value)
                    for value in head.data.corner_normals[loop_index].vector
                ],
            }
        corners = [corner_by_key[key] for key in oriented_keys]
        material_name = (
            material_slots[polygon.material_index]
            if polygon.material_index < len(material_slots)
            else None
        )
        smooth_polygon_count += int(polygon.use_smooth)
        logical_faces[logical_face] = {
            "polygonIndex": polygon.index,
            "logicalFace": [list(key) for key in logical_face],
            "orientedLogicalCycle": [list(key) for key in oriented_keys],
            "materialName": material_name,
            "corners": corners,
        }

    canonical = {
        "coordinateRoundingDecimals": 6,
        "attributeQuantizationUnitsPerOne": quantization,
        "normalQuantizationUnitsPerOne": normal_quantization,
        "logicalCoordinates": [list(key) for key in sorted(raw_for_key)],
        "logicalWeights": [
            {
                "logicalCoordinate": list(key),
                "weights": [list(item) for item in logical_weights[key]],
            }
            for key in sorted(logical_weights)
        ],
        "logicalFaces": [
            {
                key: value
                for key, value in logical_faces[face].items()
                if key != "polygonIndex"
            }
            for face in sorted(logical_faces)
        ],
        "uvLayerNames": [layer.name for layer in uv_layers],
        "materialSlots": material_slots,
        "vertexGroupNames": sorted(group_name_by_index.values()),
    }
    encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )
    component_hashes = {
        name: sha256(
            json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest().upper()
        for name, value in canonical.items()
    }
    summary = {
        "sha256": sha256(encoded).hexdigest().upper(),
        "rawVertices": len(points),
        "logicalVertices": len(raw_for_key),
        "attributeSplitVertexCount": len(points) - len(raw_for_key),
        "rawPolygons": len(head.data.polygons),
        "logicalFaces": len(logical_faces),
        "uvLayerNames": [layer.name for layer in uv_layers],
        "materialSlots": material_slots,
        "vertexGroupCount": len(group_name_by_index),
        "maximumSkinInfluenceCount": maximum_influence_count,
        "smoothPolygonCount": smooth_polygon_count,
        "maximumAttributeSplitPositionDeltaMeters": maximum_duplicate_position_delta,
        "maximumAttributeSplitWeightDelta": maximum_duplicate_weight_delta,
        "coordinateRoundingDecimals": 6,
        "attributeQuantizationUnitsPerOne": quantization,
        "normalQuantizationUnitsPerOne": normal_quantization,
        "componentSha256": component_hashes,
        "logicalMapping": logical_mapping,
    }
    return summary, canonical


def first_semantic_mismatch(first, second, path: str = "$") -> dict[str, object] | None:
    if type(first) is not type(second):
        return {
            "path": path,
            "reason": "TYPE_MISMATCH",
            "preexportType": type(first).__name__,
            "postimportType": type(second).__name__,
        }
    if isinstance(first, dict):
        if set(first) != set(second):
            return {
                "path": path,
                "reason": "KEY_SET_MISMATCH",
                "preexportOnly": sorted(set(first) - set(second)),
                "postimportOnly": sorted(set(second) - set(first)),
            }
        for key in sorted(first):
            mismatch = first_semantic_mismatch(
                first[key], second[key], f"{path}.{key}"
            )
            if mismatch is not None:
                return mismatch
        return None
    if isinstance(first, list):
        if len(first) != len(second):
            return {
                "path": path,
                "reason": "LIST_LENGTH_MISMATCH",
                "preexportLength": len(first),
                "postimportLength": len(second),
            }
        for index, (first_value, second_value) in enumerate(
            zip(first, second, strict=True)
        ):
            mismatch = first_semantic_mismatch(
                first_value, second_value, f"{path}[{index}]"
            )
            if mismatch is not None:
                return mismatch
        return None
    if first != second:
        return {
            "path": path,
            "reason": "VALUE_MISMATCH",
            "preexport": first,
            "postimport": second,
        }
    return None


def semantic_equivalence_gate(
    first, second, logical_mapping: dict[str, object]
) -> dict[str, object]:
    normal_quantization = first["normalQuantizationUnitsPerOne"]
    if second.get("normalQuantizationUnitsPerOne") != normal_quantization:
        return {
            "pass": False,
            "firstMismatch": {
                "path": "$.normalQuantizationUnitsPerOne",
                "reason": "VALUE_MISMATCH",
                "preexport": normal_quantization,
                "postimport": second.get("normalQuantizationUnitsPerOne"),
            },
        }
    # Blender stores imported custom split normals in an octahedral INT16_2D
    # corner attribute.  Its packing bound is combined with the deterministic
    # triangle-normal sensitivity bound induced by the observed, already-gated
    # float32 vertex residual and the locked minimum logical separation.
    normal_packing_bound = math.sqrt(2.0) * 4.0 / 32767.0
    position_residual = float(logical_mapping["maximumMatchDeltaMeters"])
    minimum_separation = float(logical_mapping["minimumReferenceSeparationMeters"])
    normal_geometry_bound = 2.0 * math.asin(
        min(1.0, 2.0 * position_residual / minimum_separation)
    )
    normal_angular_tolerance = normal_packing_bound + normal_geometry_bound
    maximum_normal_angular_error = 0.0
    first_normal_excess = None

    def compare(first_value, second_value, path: str):
        nonlocal maximum_normal_angular_error, first_normal_excess
        if path.endswith(".normal"):
            if not (
                isinstance(first_value, list)
                and isinstance(second_value, list)
                and len(first_value) == len(second_value) == 3
            ):
                return {
                    "path": path,
                    "reason": "NORMAL_VECTOR_SHAPE_MISMATCH",
                }
            first_vector = np.asarray(first_value, dtype=np.float64) / float(
                normal_quantization
            )
            second_vector = np.asarray(second_value, dtype=np.float64) / float(
                normal_quantization
            )
            if not np.all(np.isfinite(first_vector)) or not np.all(
                np.isfinite(second_vector)
            ):
                return {"path": path, "reason": "NONFINITE_NORMAL"}
            first_length = float(np.linalg.norm(first_vector))
            second_length = float(np.linalg.norm(second_vector))
            if first_length <= 0.0 or second_length <= 0.0:
                return {"path": path, "reason": "ZERO_LENGTH_NORMAL"}
            cosine = float(
                np.clip(
                    np.dot(first_vector, second_vector)
                    / (first_length * second_length),
                    -1.0,
                    1.0,
                )
            )
            angle = math.acos(cosine)
            maximum_normal_angular_error = max(
                maximum_normal_angular_error, angle
            )
            if angle > normal_angular_tolerance:
                if first_normal_excess is None:
                    first_normal_excess = {
                        "path": path,
                        "reason": "CORNER_NORMAL_ANGULAR_ERROR",
                        "preexport": first_value,
                        "postimport": second_value,
                        "angularErrorRadians": angle,
                        "angularToleranceRadians": normal_angular_tolerance,
                    }
            return None
        if type(first_value) is not type(second_value):
            return {
                "path": path,
                "reason": "TYPE_MISMATCH",
                "preexportType": type(first_value).__name__,
                "postimportType": type(second_value).__name__,
            }
        if isinstance(first_value, dict):
            if set(first_value) != set(second_value):
                return {
                    "path": path,
                    "reason": "KEY_SET_MISMATCH",
                    "preexportOnly": sorted(set(first_value) - set(second_value)),
                    "postimportOnly": sorted(set(second_value) - set(first_value)),
                }
            for key in sorted(first_value):
                mismatch = compare(
                    first_value[key], second_value[key], f"{path}.{key}"
                )
                if mismatch is not None:
                    return mismatch
            return None
        if isinstance(first_value, list):
            if len(first_value) != len(second_value):
                return {
                    "path": path,
                    "reason": "LIST_LENGTH_MISMATCH",
                    "preexportLength": len(first_value),
                    "postimportLength": len(second_value),
                    "preexportPreview": first_value[:8],
                    "postimportPreview": second_value[:8],
                }
            for index, (left, right) in enumerate(
                zip(first_value, second_value, strict=True)
            ):
                mismatch = compare(left, right, f"{path}[{index}]")
                if mismatch is not None:
                    return mismatch
            return None
        if first_value != second_value:
            return {
                "path": path,
                "reason": "VALUE_MISMATCH",
                "preexport": first_value,
                "postimport": second_value,
            }
        return None

    non_normal_mismatch = compare(first, second, "$")
    mismatch = non_normal_mismatch or first_normal_excess
    return {
        "pass": mismatch is None,
        "firstMismatch": mismatch,
        "normalStorage": "BLENDER_CUSTOM_NORMAL_OCTAHEDRAL_INT16_2D",
        "normalPackingAngularBoundRadians": normal_packing_bound,
        "normalGeometrySensitivityBound": {
            "maximumRegisteredPositionResidualMeters": position_residual,
            "minimumReferenceSeparationMeters": minimum_separation,
            "formula": "2*asin(min(1,2*positionResidual/minimumSeparation))",
            "boundRadians": normal_geometry_bound,
        },
        "normalAngularToleranceRadians": normal_angular_tolerance,
        "normalAngularToleranceDegrees": math.degrees(normal_angular_tolerance),
        "maximumNormalAngularErrorRadians": maximum_normal_angular_error,
        "maximumNormalAngularErrorDegrees": math.degrees(
            maximum_normal_angular_error
        ),
        "allNonNormalSemanticsExact": non_normal_mismatch is None,
    }


def neutral_mesh_gate(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    source_key_points,
    source_regions,
    boundary,
    build,
    *,
    allow_attribute_splits: bool = False,
    locked_key_points=None,
    locked_match_points=None,
) -> dict[str, object]:
    points = direct.head_local_points(head, armature)
    (
        raw_keys,
        raw_for_key,
        key_points,
        adjacency,
        faces,
        logical_mapping,
    ) = topology_with_locked_reference(
        direct,
        head,
        points,
        locked_key_points=locked_key_points,
        locked_match_points=locked_match_points,
    )
    preflight_raw_keys = raw_keys
    preflight_raw_for_key = raw_for_key
    duplicate_coordinates = {
        key: raw_indices
        for key, raw_indices in preflight_raw_for_key.items()
        if len(raw_indices) > 1
    }
    role_by_key = build["logicalRoleByKey"]

    def role_for_key(key) -> str:
        return role_by_key.get(key, "UNCLASSIFIED_GLTF_ATTRIBUTE_SPLIT")

    collapsed_faces = []
    for polygon in head.data.polygons:
        raw_indices = list(polygon.vertices)
        keys = [preflight_raw_keys[index] for index in raw_indices]
        if len(set(keys)) < 3:
            collapsed_faces.append(
                {
                    "polygonIndex": polygon.index,
                    "rawVertexIndices": raw_indices,
                    "vertexRoles": [role_for_key(key) for key in keys],
                    "headLocalPoints": [
                        [float(value) for value in points[index]] for index in raw_indices
                    ],
                    "roundedLogicalCoordinates": [list(key) for key in keys],
                    "pairwiseDistancesMeters": [
                        float((points[raw_indices[first]] - points[raw_indices[second]]).length)
                        for first, second in ((0, 1), (1, 2), (2, 0))
                    ],
                }
            )
    coordinate_scale_all = max(
        abs(float(value)) for point in points for value in point
    )
    attribute_split_ulp = abs(float(np.spacing(np.float32(coordinate_scale_all))))
    attribute_split_tolerance = 4.0 * attribute_split_ulp
    maximum_attribute_split_delta = 0.0
    for raw_indices in duplicate_coordinates.values():
        first = points[raw_indices[0]]
        maximum_attribute_split_delta = max(
            maximum_attribute_split_delta,
            *(float((points[index] - first).length) for index in raw_indices[1:]),
        )
    invalid_duplicate_coordinates = bool(duplicate_coordinates) and (
        not allow_attribute_splits
        or maximum_attribute_split_delta > attribute_split_tolerance
    )
    if invalid_duplicate_coordinates or collapsed_faces:
        duplicate_details = []
        for key, raw_indices in sorted(duplicate_coordinates.items()):
            duplicate_details.append(
                {
                    "roundedLogicalCoordinate": list(key),
                    "rawVertexIndices": raw_indices,
                    "vertexRole": role_for_key(key),
                    "headLocalPoints": [
                        [float(value) for value in points[index]] for index in raw_indices
                    ],
                }
            )
        raise SurgicalGateError(
            "Neutral retopology contains non-unique rounded logical coordinates",
            {
                "gate": "ordered-loop-logical-coordinate-uniqueness",
                "roundingDecimals": 6,
                "attributeSplitsAllowed": allow_attribute_splits,
                "duplicateLogicalCoordinateCount": len(duplicate_coordinates),
                "maximumAttributeSplitCoordinateDeltaMeters": maximum_attribute_split_delta,
                "float32UlpMeters": attribute_split_ulp,
                "toleranceMeters": attribute_split_tolerance,
                "duplicates": duplicate_details[:50],
                "collapsedFaceCount": len(collapsed_faces),
                "collapsedFaces": collapsed_faces[:50],
            },
        )
    if len(faces) != len(head.data.polygons):
        raise SurgicalGateError(
            "Neutral retopology contains duplicate logical faces after attribute welding",
            {
                "gate": "neutral-unique-logical-face-count",
                "rawPolygonCount": len(head.data.polygons),
                "logicalFaceCount": len(faces),
            },
        )
    logical_keys = sorted(key_points)
    logical_index = {key: index for index, key in enumerate(logical_keys)}
    logical_points = [key_points[key] for key in logical_keys]
    logical_faces = sorted(faces)
    polygons = [
        tuple(logical_index[key] for key in face) for face in logical_faces
    ]
    kept_keys = build["keptKeys"]
    missing_kept = kept_keys - set(key_points)
    if missing_kept:
        raise SurgicalGateError(
            "Neutral retopology changed or removed nonmouth source coordinates",
            {
                "gate": "unchanged-nonmouth-coordinate-set",
                "missingCount": len(missing_kept),
                "firstMissing": [list(key) for key in sorted(missing_kept)[:20]],
            },
        )
    maximum_kept_delta = max(
        float((key_points[key] - source_key_points[key]).length) for key in kept_keys
    )
    coordinate_scale = max(
        abs(float(value)) for key in kept_keys for value in source_key_points[key]
    )
    ulp = abs(float(np.spacing(np.float32(coordinate_scale))))
    matrix_operation_count = 32 if locked_match_points is not None else 0
    float32_epsilon = float(np.finfo(np.float32).eps)
    matrix_gamma = (
        matrix_operation_count
        * float32_epsilon
        / (1.0 - matrix_operation_count * float32_epsilon)
        if matrix_operation_count
        else 0.0
    )
    matrix_roundtrip_bound = matrix_gamma * coordinate_scale
    unchanged_tolerance = max(4.0 * ulp, matrix_roundtrip_bound)
    if maximum_kept_delta > unchanged_tolerance:
        raise SurgicalGateError(
            "Neutral retopology moved unaffected source coordinates",
            {
                "gate": "unchanged-nonmouth-float32-coordinates",
                "maximumDeltaMeters": maximum_kept_delta,
                "float32UlpMeters": ulp,
                "matrixOperationCount": matrix_operation_count,
                "float32GammaN": matrix_gamma,
                "matrixRoundtripBoundMeters": matrix_roundtrip_bound,
                "toleranceMeters": unchanged_tolerance,
            },
        )
    source_seam = source_regions["seam"]
    if not source_seam <= set(key_points):
        raise RuntimeError("Neutral retopology removed a locked neck-seam point")
    maximum_seam_delta = max(
        float((key_points[key] - source_key_points[key]).length) for key in source_seam
    )
    if maximum_seam_delta > unchanged_tolerance:
        raise RuntimeError(
            f"Neutral retopology moved the locked neck seam: {maximum_seam_delta}"
        )
    boundary_deltas = [
        float((key_points[key] - source_key_points[key]).length) for key in boundary
    ]
    maximum_boundary_delta = max(boundary_deltas)
    if maximum_boundary_delta > unchanged_tolerance:
        raise RuntimeError(
            f"Neutral retopology moved L0 attachment coordinates: {maximum_boundary_delta}"
        )

    if any(len(polygon.vertices) != 3 for polygon in head.data.polygons):
        raise RuntimeError("Neutral retopology output is not fully triangulated")
    edge_use: Counter[tuple[int, int]] = Counter()
    for polygon in polygons:
        for offset, first in enumerate(polygon):
            for second in polygon[offset + 1 :]:
                edge_use[tuple(sorted((first, second)))] += 1
    observed_nonmanifold: dict[
        tuple[tuple[float, float, float], tuple[float, float, float]], int
    ] = {}
    nonmanifold = []
    for edge, count in sorted(edge_use.items()):
        if count <= 2:
            continue
        logical_edge = edge_key(logical_keys[edge[0]], logical_keys[edge[1]])
        observed_nonmanifold[logical_edge] = count
        expected_count = build["sourceKeptNonmanifoldEdges"].get(logical_edge)
        if expected_count == count:
            continue
        incident_polygons = [
            polygon_index
            for polygon_index, polygon in enumerate(polygons)
            if set(edge) <= set(polygon)
        ]
        nonmanifold.append(
            {
                "logicalVertexIndices": list(edge),
                "useCount": count,
                "sourceBaselineUseCount": expected_count,
                "logicalCoordinates": [list(logical_keys[index]) for index in edge],
                "headLocalPoints": [
                    [float(value) for value in logical_points[index]] for index in edge
                ],
                "vertexRoles": [role_for_key(logical_keys[index]) for index in edge],
                "incidentPolygonIndices": incident_polygons,
                "incidentLogicalFaces": [
                    [list(logical_keys[index]) for index in polygons[polygon_index]]
                    for polygon_index in incident_polygons
                ],
                "incidentFaceRoles": [
                    [
                        role_for_key(logical_keys[index])
                        for index in polygons[polygon_index]
                    ]
                    for polygon_index in incident_polygons
                ],
            }
        )
    if nonmanifold:
        raise SurgicalGateError(
            "Neutral retopology introduced or changed an edge used by more than two faces",
            {
                "gate": "neutral-no-new-or-changed-nonmanifold-edge-use",
                "edges": nonmanifold[:50],
            },
        )
    if observed_nonmanifold != build["sourceKeptNonmanifoldEdges"]:
        raise SurgicalGateError(
            "Neutral retopology did not preserve the exact unaffected nonmanifold baseline",
            {
                "gate": "neutral-preserve-unaffected-source-nonmanifold-baseline",
                "expected": [
                    {"logicalEdge": [list(key) for key in edge], "useCount": count}
                    for edge, count in sorted(build["sourceKeptNonmanifoldEdges"].items())
                ],
                "observed": [
                    {"logicalEdge": [list(key) for key in edge], "useCount": count}
                    for edge, count in sorted(observed_nonmanifold.items())
                ],
            },
        )
    boundary_edges = {edge for edge, count in edge_use.items() if count == 1}
    logical_boundary_edges = {
        edge_key(logical_keys[edge[0]], logical_keys[edge[1]])
        for edge in boundary_edges
    }
    expected_boundary_edges = build["sourceExteriorBoundaryEdges"]
    new_boundary_edges = logical_boundary_edges - expected_boundary_edges
    missing_boundary_edges = expected_boundary_edges - logical_boundary_edges
    if new_boundary_edges or missing_boundary_edges:
        raise SurgicalGateError(
            "Neutral retopology changed the exact preexisting exterior boundary set",
            {
                "gate": "preserve-preexisting-neck-and-eye-boundaries",
                "expectedBoundaryEdgeCount": len(expected_boundary_edges),
                "observedBoundaryEdgeCount": len(logical_boundary_edges),
                "newBoundaryEdges": [
                    [list(key) for key in edge] for edge in sorted(new_boundary_edges)[:50]
                ],
                "missingBoundaryEdges": [
                    [list(key) for key in edge]
                    for edge in sorted(missing_boundary_edges)[:50]
                ],
            },
        )
    boundary_vertices = {index for edge in boundary_edges for index in edge}
    boundary_keys = {logical_keys[index] for index in boundary_vertices}
    components = direct.connected_components(set(key_points), adjacency)
    if len(components) != 1:
        raise RuntimeError(
            f"Neutral retopology is not one connected head surface: {[len(value) for value in components]}"
        )
    areas = []
    for first, second, third in polygons:
        areas.append(
            0.5
            * float(
                (logical_points[second] - logical_points[first])
                .cross(logical_points[third] - logical_points[first])
                .length
            )
        )
    minimum_area = min(areas)
    if minimum_area <= 1.0e-12:
        raise SurgicalGateError(
            "Neutral retopology contains a degenerate triangle",
            {"gate": "neutral-positive-triangle-area", "minimumArea": minimum_area},
        )
    precision = direct.exact_intersection_precision(logical_points)
    overlaps = direct.nonadjacent_self_overlaps(
        logical_points, polygons, logical_keys, precision
    )
    observed_overlap_face_pairs = {
        tuple(
            sorted(
                (
                    tuple(sorted(logical_keys[index] for index in polygons[first])),
                    tuple(sorted(logical_keys[index] for index in polygons[second])),
                )
            )
        )
        for first, second in overlaps
    }
    baseline_overlap_face_pairs = build["sourceKeptOverlapFacePairs"]
    new_overlap_face_pairs = observed_overlap_face_pairs - baseline_overlap_face_pairs
    missing_overlap_face_pairs = baseline_overlap_face_pairs - observed_overlap_face_pairs
    if new_overlap_face_pairs or missing_overlap_face_pairs:
        details = [
            {
                "logicalFaces": [
                    [list(key) for key in face] for face in pair
                ],
                "faceRoles": [
                    sorted({role_for_key(key) for key in face})
                    for face in pair
                ],
            }
            for pair in sorted(new_overlap_face_pairs)[:50]
        ]
        raise SurgicalGateError(
            "Neutral retopology introduced or changed nonadjacent triangle intersections",
            {
                "gate": "neutral-zero-new-overlap-and-exact-unaffected-baseline",
                "sourceBaselineOverlapCount": len(baseline_overlap_face_pairs),
                "observedOverlapCount": len(observed_overlap_face_pairs),
                "newOverlapCount": len(new_overlap_face_pairs),
                "missingBaselineOverlapCount": len(missing_overlap_face_pairs),
                "firstNewOverlaps": details,
                "firstMissingBaselineOverlaps": [
                    [[list(key) for key in face] for face in pair]
                    for pair in sorted(missing_overlap_face_pairs)[:20]
                ],
                "intersectionPrecision": precision,
            },
        )
    return {
        "rawVertices": len(points),
        "attributeSplitVertexCount": len(points) - len(raw_for_key),
        "attributeSplitLogicalCoordinateCount": len(duplicate_coordinates),
        "maximumAttributeSplitCoordinateDeltaMeters": maximum_attribute_split_delta,
        "attributeSplitFloat32UlpMeters": attribute_split_ulp,
        "attributeSplitCoordinateToleranceMeters": attribute_split_tolerance,
        "attributeSplitsAllowed": allow_attribute_splits,
        "logicalMapping": logical_mapping,
        "rawPolygons": len(head.data.polygons),
        "logicalVertices": len(raw_for_key),
        "logicalFaces": len(faces),
        "connectedComponentCount": len(components),
        "preexistingUnaffectedEdgeUseGreaterThanTwoCount": len(
            observed_nonmanifold
        ),
        "newOrChangedEdgeUseGreaterThanTwoCount": 0,
        "preexistingUnaffectedNonmanifoldEdgeSha256": sha256(
            json.dumps(
                [
                    [[list(key) for key in edge], count]
                    for edge, count in sorted(observed_nonmanifold.items())
                ],
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest().upper(),
        "boundaryEdgeCount": len(boundary_edges),
        "boundaryLogicalVertexCount": len(boundary_keys),
        "preexistingExteriorBoundaryEdgeCount": len(expected_boundary_edges),
        "newBoundaryEdgeCount": 0,
        "missingBoundaryEdgeCount": 0,
        "preexistingExteriorBoundaryEdgeSha256": sha256(
            json.dumps(
                [[list(key) for key in edge] for edge in sorted(logical_boundary_edges)],
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest().upper(),
        "minimumTriangleAreaSquareMeters": minimum_area,
        "preexistingUnaffectedNonadjacentOverlapCount": len(
            observed_overlap_face_pairs
        ),
        "newNonadjacentOverlapCount": 0,
        "missingBaselineNonadjacentOverlapCount": 0,
        "preexistingUnaffectedOverlapFacePairSha256": sha256(
            json.dumps(
                [
                    [[list(key) for key in face] for face in pair]
                    for pair in sorted(observed_overlap_face_pairs)
                ],
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest().upper(),
        "intersectionPrecision": precision,
        "sourceBaselineIntersectionPrecision": build[
            "sourceKeptOverlapPrecision"
        ],
        "unchangedNonmouthLogicalCount": len(kept_keys),
        "unchangedNonmouthCoordinateSha256": coordinate_hash(kept_keys),
        "unchangedNonmouthFloat32PointSha256": float32_point_hash(
            kept_keys, key_points
        ),
        "unchangedNonmouthMaximumDeltaMeters": maximum_kept_delta,
        "neckSeamLogicalCount": len(source_seam),
        "neckSeamCoordinateSha256": coordinate_hash(source_seam),
        "neckSeamFloat32PointSha256": float32_point_hash(source_seam, key_points),
        "neckSeamMaximumDeltaMeters": maximum_seam_delta,
        "l0AttachmentLogicalCount": len(boundary),
        "l0AttachmentCoordinateSha256": coordinate_hash(set(boundary)),
        "l0AttachmentFloat32PointSha256": float32_point_hash(
            set(boundary), key_points
        ),
        "l0AttachmentMaximumDeltaMeters": maximum_boundary_delta,
        "float32UnchangedTolerance": {
            "coordinateScaleMeters": coordinate_scale,
            "float32UlpMeters": ulp,
            "ulpFactor": 4,
            "matrixOperationCount": matrix_operation_count,
            "float32GammaN": matrix_gamma,
            "matrixRoundtripBoundMeters": matrix_roundtrip_bound,
            "toleranceMeters": unchanged_tolerance,
        },
    }


def make_cc0_oral_material(
    name: str,
    texture_path: Path,
    diffuse_multiplier: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = diffuse_multiplier
    material.metallic = 0.0
    material.roughness = roughness
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Metallic"].default_value = 0.0
    principled.inputs["Roughness"].default_value = roughness
    texture = nodes.new("ShaderNodeTexImage")
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    image.pack()
    texture.image = image
    multiply = nodes.new("ShaderNodeMixRGB")
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1.0
    multiply.inputs[2].default_value = diffuse_multiplier
    material.node_tree.links.new(texture.outputs["Color"], multiply.inputs[1])
    material.node_tree.links.new(multiply.outputs["Color"], principled.inputs["Base Color"])
    material.node_tree.links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return material


def selected_obj_triangles(
    source: dict[str, object],
    selected_vertices: set[int],
    transform,
) -> dict[str, object]:
    ordered_source_vertices = sorted(selected_vertices)
    source_to_local = {
        source_index: local_index
        for local_index, source_index in enumerate(ordered_source_vertices)
    }
    points = [transform(source["points"][index]) for index in ordered_source_vertices]
    triangles: list[tuple[int, int, int]] = []
    triangle_uvs: list[tuple[tuple[float, float], ...]] = []
    selected_source_faces = 0
    for polygon, polygon_uv in zip(
        source["polygons"], source["polygonUvs"], strict=True
    ):
        if not set(polygon) <= selected_vertices:
            continue
        selected_source_faces += 1
        local_polygon = [source_to_local[index] for index in polygon]
        uv_polygon = [source["uvs"][index] for index in polygon_uv]
        for offset in range(1, len(local_polygon) - 1):
            local_triangle = (
                local_polygon[0],
                local_polygon[offset],
                local_polygon[offset + 1],
            )
            uv_triangle = (
                uv_polygon[0],
                uv_polygon[offset],
                uv_polygon[offset + 1],
            )
            triangles.append(local_triangle)
            triangle_uvs.append(uv_triangle)
    used_vertices = set().union(*(set(triangle) for triangle in triangles))
    if used_vertices != set(range(len(points))):
        raise RuntimeError(
            "Selected CC0 surface did not retain every declared component vertex"
        )
    return {
        "points": points,
        "triangles": triangles,
        "triangleUvs": triangle_uvs,
        "sourceVertexIndices": ordered_source_vertices,
        "sourceFaceCount": selected_source_faces,
    }


def create_oral_accessory_object(
    direct,
    name: str,
    surface: dict[str, object],
    head: bpy.types.Object,
    armature: bpy.types.Object,
    material: bpy.types.Material,
) -> bpy.types.Object:
    object_points = [
        direct.object_point_from_head_local(head, armature, point)
        for point in surface["points"]
    ]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(object_points, [], surface["triangles"])
    mesh.materials.append(material)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon, uv_triangle in zip(
        mesh.polygons, surface["triangleUvs"], strict=True
    ):
        polygon.material_index = 0
        polygon.use_smooth = True
        for loop_index, uv in zip(polygon.loop_indices, uv_triangle, strict=True):
            uv_layer.data[loop_index].uv = uv
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = armature
    obj.matrix_world = head.matrix_world.copy()
    head_group = obj.vertex_groups.new(name=direct.HEAD_BONE)
    head_group.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("HumanFoundation_RuntimeArmature", "ARMATURE")
    modifier.object = armature
    modifier.use_vertex_groups = True
    return obj


def transformed_bounds(points: list[Vector]) -> dict[str, list[float]]:
    return {
        "minimum": [
            float(min(point[axis] for point in points)) for axis in range(3)
        ],
        "maximum": [
            float(max(point[axis] for point in points)) for axis in range(3)
        ],
    }


def minimum_vertex_to_surface_distance(
    source_points: list[Vector],
    target_points: list[Vector],
    target_triangles: list[tuple[int, int, int]],
) -> float:
    bvh = BVHTree.FromPolygons(target_points, target_triangles, all_triangles=True)
    if bvh is None:
        raise RuntimeError("Could not build oral clearance BVH")
    distances = []
    for point in source_points:
        _location, _normal, _face, distance = bvh.find_nearest(point)
        if distance is None:
            raise RuntimeError("Oral clearance BVH returned no nearest surface")
        distances.append(float(distance))
    return min(distances)


def pair_surface_clearance(first: dict[str, object], second: dict[str, object]) -> float:
    return min(
        minimum_vertex_to_surface_distance(
            first["points"], second["points"], second["triangles"]
        ),
        minimum_vertex_to_surface_distance(
            second["points"], first["points"], first["triangles"]
        ),
    )


def oral_self_overlap_baseline(
    direct,
    surfaces: dict[str, dict[str, object]],
) -> dict[str, dict[str, object]]:
    """Lock source-intrinsic same-row contacts by local triangle identity."""

    result = {}
    for source_owner, package_owner in (
        ("upper", "upperTeeth"),
        ("lower", "lowerTeeth"),
        ("tongue", "tongue"),
    ):
        surface = surfaces[source_owner]
        points = [point.copy() for point in surface["points"]]
        polygons = [tuple(triangle) for triangle in surface["triangles"]]
        raw_keys = [
            tuple(round(float(value), 6) for value in point) for point in points
        ]
        precision = direct.exact_intersection_precision(points)
        face_pairs = {
            tuple(sorted(pair))
            for pair in direct.nonadjacent_self_overlaps(
                points, polygons, raw_keys, precision
            )
        }
        ordered_pairs = sorted(face_pairs)
        result[package_owner] = {
            "sourceOwner": source_owner,
            "vertexCount": len(points),
            "triangleCount": len(polygons),
            "facePairCount": len(ordered_pairs),
            "facePairSha256": sha256(
                json.dumps(ordered_pairs, separators=(",", ":")).encode("utf-8")
            ).hexdigest().upper(),
            "intersectionPrecision": precision,
            "_facePairs": face_pairs,
        }
    return result


def oral_self_overlap_baseline_receipt(
    baseline: dict[str, dict[str, object]],
) -> dict[str, dict[str, object]]:
    return {
        owner: {key: value for key, value in entry.items() if key != "_facePairs"}
        for owner, entry in baseline.items()
    }


def combined_oral_collision_gate(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    accessories: list[tuple[str, bpy.types.Object]],
    allowed_same_owner_overlaps: dict[str, dict[str, object]],
    point_overrides: dict[str, list[Vector]] | None = None,
) -> dict[str, object]:
    points: list[Vector] = []
    polygons: list[tuple[int, int, int]] = []
    raw_keys = []
    face_owners: list[str] = []
    face_local_indices: list[int] = []
    object_face_counts = {}

    def append_object(owner: str, obj: bpy.types.Object) -> None:
        offset = len(points)
        local_points = (
            direct.head_local_points(obj, armature)
            if point_overrides is None or owner not in point_overrides
            else point_overrides[owner]
        )
        if len(local_points) != len(obj.data.vertices):
            raise RuntimeError(
                f"Oral collision point override changed {owner} vertex count: "
                f"{len(local_points)}/{len(obj.data.vertices)}"
            )
        points.extend(local_points)
        owner_index = len({*face_owners, owner})
        raw_keys.extend(
            tuple(round(float(value), 6) for value in point) + (owner_index,)
            for point in local_points
        )
        object_face_counts[owner] = len(obj.data.polygons)
        for local_index, polygon in enumerate(obj.data.polygons):
            if len(polygon.vertices) != 3:
                raise RuntimeError(f"Oral collision input is not triangulated: {obj.name}")
            polygons.append(tuple(offset + index for index in polygon.vertices))
            face_owners.append(owner)
            face_local_indices.append(local_index)

    append_object("head", head)
    for owner, obj in accessories:
        append_object(owner, obj)
    precision = direct.exact_intersection_precision(points)
    overlaps = direct.nonadjacent_self_overlaps(
        points, polygons, raw_keys, precision
    )
    oral_overlaps = [
        (first, second)
        for first, second in sorted(overlaps)
        if face_owners[first] != "head" or face_owners[second] != "head"
    ]
    cross_owner_overlaps = [
        pair
        for pair in oral_overlaps
        if face_owners[pair[0]] != face_owners[pair[1]]
    ]
    observed_same_owner = {owner: set() for owner in allowed_same_owner_overlaps}
    unexpected_owner_overlaps = []
    for first, second in oral_overlaps:
        first_owner = face_owners[first]
        second_owner = face_owners[second]
        if first_owner != second_owner:
            continue
        local_pair = tuple(
            sorted((face_local_indices[first], face_local_indices[second]))
        )
        if first_owner not in observed_same_owner:
            unexpected_owner_overlaps.append((first, second, local_pair))
            continue
        observed_same_owner[first_owner].add(local_pair)
    baseline_differences = {}
    for owner, baseline in allowed_same_owner_overlaps.items():
        expected_pairs = baseline["_facePairs"]
        observed_pairs = observed_same_owner[owner]
        unexpected = sorted(observed_pairs - expected_pairs)
        missing = sorted(expected_pairs - observed_pairs)
        if (
            object_face_counts.get(owner) != baseline["triangleCount"]
            or unexpected
            or missing
        ):
            baseline_differences[owner] = {
                "expectedTriangleCount": baseline["triangleCount"],
                "observedTriangleCount": object_face_counts.get(owner),
                "expectedPairCount": len(expected_pairs),
                "observedPairCount": len(observed_pairs),
                "firstUnexpectedLocalFacePairs": [list(pair) for pair in unexpected[:50]],
                "firstMissingLocalFacePairs": [list(pair) for pair in missing[:50]],
            }
    if cross_owner_overlaps or unexpected_owner_overlaps or baseline_differences:
        raise SurgicalGateError(
            "Fitted oral anatomy has a new, changed, or missing contact",
            {
                "gate": "neutral-oral-anatomy-zero-cross-owner-and-exact-source-self-parity",
                "oralOverlapCount": len(oral_overlaps),
                "crossOwnerOverlapCount": len(cross_owner_overlaps),
                "unexpectedOwnerOverlapCount": len(unexpected_owner_overlaps),
                "baselineDifferences": baseline_differences,
                "allowedSourceSelfOverlap": oral_self_overlap_baseline_receipt(
                    allowed_same_owner_overlaps
                ),
                "firstOralOverlaps": [
                    {
                        "faceIndices": [first, second],
                        "owners": [face_owners[first], face_owners[second]],
                        "triangles": [
                            [list(points[index]) for index in polygons[first]],
                            [list(points[index]) for index in polygons[second]],
                        ],
                    }
                    for first, second in (
                        cross_owner_overlaps
                        + [(first, second) for first, second, _local in unexpected_owner_overlaps]
                    )[:50]
                ],
                "intersectionPrecision": precision,
            },
        )
    same_owner_receipt = {}
    for owner, baseline in allowed_same_owner_overlaps.items():
        ordered_pairs = sorted(observed_same_owner[owner])
        same_owner_receipt[owner] = {
            "triangleCount": object_face_counts[owner],
            "observedPairCount": len(ordered_pairs),
            "observedPairSha256": sha256(
                json.dumps(ordered_pairs, separators=(",", ":")).encode("utf-8")
            ).hexdigest().upper(),
            "expectedPairCount": baseline["facePairCount"],
            "expectedPairSha256": baseline["facePairSha256"],
            "status": "PASS_EXACT_SOURCE_BASELINE_PARITY",
        }
    return {
        "status": "PASS_ZERO_CROSS_OWNER_AND_EXACT_SOURCE_SELF_PARITY",
        "combinedTriangleCount": len(polygons),
        "combinedOverlapCountIncludingHeadBaseline": len(overlaps),
        "oralSourceBaselineOverlapCount": len(oral_overlaps),
        "crossOwnerOralOverlapCount": 0,
        "sameOwnerBaselineParity": same_owner_receipt,
        "intersectionPrecision": precision,
    }


def oral_fit_surfaces(
    oral_source: dict[str, object],
    derived: dict[str, object],
    depth_offset_meters: float = 0.0,
) -> tuple[dict[str, dict[str, object]], dict[str, object]]:
    if depth_offset_meters < 0.0:
        raise RuntimeError(f"Oral depth offset must be nonnegative: {depth_offset_meters}")
    center_x = float(derived["centerX"])
    center_y = float(derived["centerY"])
    aperture_half_width = float(derived["apertureHalfWidthMeters"])
    edge_spacing = float(derived["sourceLipMedianEdgeSpacingMeters"])
    aperture_maximum_z = float(derived["apertureMaximumDepthZ"])
    bag_depth = float(derived["mouthBagDepthMeters"])
    source_measurements = oral_source["measurements"]
    dental_scale = (
        aperture_half_width - 0.5 * edge_spacing
    ) / max(
        abs(oral_source["lowerBounds"]["minimum"].x),
        abs(oral_source["lowerBounds"]["maximum"].x),
    )
    contact_midpoint = float(
        source_measurements["pairedContactMidpointSourceUnits"]
    )
    maximum_overlap = float(
        source_measurements["maximumPairedOcclusalOverlapSourceUnits"]
    )
    neutral_occlusal_gap = 0.25 * edge_spacing
    common_vertical_translation = center_y - dental_scale * contact_midpoint
    row_shift = dental_scale * maximum_overlap + neutral_occlusal_gap
    lower_translation = Vector(
        (
            center_x,
            common_vertical_translation - 0.5 * row_shift,
            aperture_maximum_z
            - 1.5 * edge_spacing
            - dental_scale * oral_source["lowerBounds"]["maximum"].z
            - depth_offset_meters,
        )
    )
    upper_translation = Vector(
        (
            center_x,
            common_vertical_translation + 0.5 * row_shift,
            aperture_maximum_z
            - edge_spacing
            - dental_scale * oral_source["upperBounds"]["maximum"].z
            - depth_offset_meters,
        )
    )

    def lower_transform(point: Vector) -> Vector:
        return dental_scale * point + lower_translation

    def upper_transform(point: Vector) -> Vector:
        return dental_scale * point + upper_translation

    lower = selected_obj_triangles(
        oral_source["teeth"], oral_source["lowerVertices"], lower_transform
    )
    upper = selected_obj_triangles(
        oral_source["teeth"], oral_source["upperVertices"], upper_transform
    )
    if (
        len(lower["points"]) != 1008
        or len(upper["points"]) != 1008
        or len(lower["triangles"]) != 1792
        or len(upper["triangles"]) != 1792
    ):
        raise RuntimeError("CC0 tooth island triangulation changed")

    tongue_bounds = oral_source["tongueBounds"]
    tongue_scale = Vector(
        (
            (2.0 * (aperture_half_width - 0.5 * edge_spacing) * 0.92)
            / (tongue_bounds["maximum"].x - tongue_bounds["minimum"].x),
            (2.5 * edge_spacing)
            / (tongue_bounds["maximum"].y - tongue_bounds["minimum"].y),
            (0.55 * bag_depth)
            / (tongue_bounds["maximum"].z - tongue_bounds["minimum"].z),
        )
    )
    tongue_top_y = center_y - 0.5 * neutral_occlusal_gap - 1.5 * edge_spacing
    lower_front_z = max(point.z for point in lower["points"])
    tongue_front_z = lower_front_z - 2.0 * edge_spacing
    tongue_translation = Vector(
        (
            center_x,
            tongue_top_y - tongue_scale.y * tongue_bounds["maximum"].y,
            tongue_front_z - tongue_scale.z * tongue_bounds["maximum"].z,
        )
    )

    def tongue_transform(point: Vector) -> Vector:
        return Vector(
            (
                tongue_scale.x * point.x,
                tongue_scale.y * point.y,
                tongue_scale.z * point.z,
            )
        ) + tongue_translation

    tongue = selected_obj_triangles(
        oral_source["tongue"],
        set(oral_source["tongue"]["components"][0]),
        tongue_transform,
    )
    if len(tongue["points"]) != 226 or len(tongue["triangles"]) != 448:
        raise RuntimeError("CC0 tongue triangulation changed")
    transforms = {
        "coordinateFrame": source_measurements["coordinateFrame"],
        "determinants": {
            "lowerTeeth": dental_scale**3,
            "upperTeeth": dental_scale**3,
            "tongue": tongue_scale.x * tongue_scale.y * tongue_scale.z,
        },
        "dentalUniformScale": dental_scale,
        "selectedDepthOffsetMeters": depth_offset_meters,
        "neutralOcclusalGapMeters": neutral_occlusal_gap,
        "pairedContactMidpointSourceUnits": contact_midpoint,
        "maximumPairedOverlapSourceUnits": maximum_overlap,
        "lowerTranslation": list(lower_translation),
        "upperTranslation": list(upper_translation),
        "tongueScale": list(tongue_scale),
        "tongueTranslation": list(tongue_translation),
        "bounds": {
            "lowerTeeth": transformed_bounds(lower["points"]),
            "upperTeeth": transformed_bounds(upper["points"]),
            "tongue": transformed_bounds(tongue["points"]),
        },
    }
    if min(transforms["determinants"].values()) <= 0.0:
        raise RuntimeError(f"Oral fit contains a reflection: {transforms}")
    return {"lower": lower, "upper": upper, "tongue": tongue}, transforms


def oral_surface_overlap_metrics(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    surfaces: dict[str, dict[str, object]],
) -> dict[str, object]:
    points = direct.head_local_points(head, armature)
    polygons = [tuple(polygon.vertices) for polygon in head.data.polygons]
    face_owners = [
        f"headMaterial{polygon.material_index}" for polygon in head.data.polygons
    ]
    raw_keys = [
        tuple(round(float(value), 6) for value in point) + (0,)
        for point in points
    ]
    for owner_index, owner in enumerate(("upper", "lower", "tongue"), start=1):
        surface = surfaces[owner]
        offset = len(points)
        points.extend(point.copy() for point in surface["points"])
        raw_keys.extend(
            tuple(round(float(value), 6) for value in point) + (owner_index,)
            for point in surface["points"]
        )
        polygons.extend(
            tuple(offset + index for index in triangle)
            for triangle in surface["triangles"]
        )
        face_owners.extend([owner] * len(surface["triangles"]))
    precision = direct.exact_intersection_precision(points)
    overlaps = direct.nonadjacent_self_overlaps(
        points, polygons, raw_keys, precision
    )
    oral_overlaps = [
        pair
        for pair in sorted(overlaps)
        if face_owners[pair[0]] in {"upper", "lower", "tongue"}
        or face_owners[pair[1]] in {"upper", "lower", "tongue"}
    ]
    owner_pairs = Counter(
        tuple(sorted((face_owners[first], face_owners[second])))
        for first, second in oral_overlaps
    )
    return {
        "oralOverlapCount": len(oral_overlaps),
        "overlapCountByOwnerPair": {
            "|".join(owner_pair): count
            for owner_pair, count in sorted(owner_pairs.items())
        },
        "crossOwnerOralOverlapCount": sum(
            count
            for owner_pair, count in owner_pairs.items()
            if owner_pair[0] != owner_pair[1]
        ),
        "firstOverlapFaceIndices": [list(pair) for pair in oral_overlaps[:20]],
        "firstOverlapDetails": [
            {
                "faceIndices": [first, second],
                "owners": [face_owners[first], face_owners[second]],
                "triangles": [
                    [list(points[index]) for index in polygons[first]],
                    [list(points[index]) for index in polygons[second]],
                ],
            }
            for first, second in oral_overlaps[:20]
        ],
        "intersectionPrecision": precision,
    }


def build_oral_neutral_proof(args: argparse.Namespace) -> dict[str, object]:
    direct = load_direct_builder()
    evidence = Path(args.evidence_dir).resolve()
    neutral_glb = evidence / "human-foundation-surgical-mouth-neutral-proof.glb"
    neutral_receipt_path = evidence / "neutral-retopology-receipt.json"
    if not neutral_glb.is_file() or not neutral_receipt_path.is_file():
        raise RuntimeError("Passed neutral surgical milestone is missing")
    neutral_receipt = json.loads(neutral_receipt_path.read_text(encoding="utf-8"))
    if (
        neutral_receipt.get("status")
        != "PASS_NEUTRAL_RETOPOLOGY_FRESH_REIMPORT_JAW_NOT_YET_PROVEN_NOT_PROMOTED"
        or file_sha256(neutral_glb)
        != neutral_receipt["quarantinedGlb"]["sha256"]
    ):
        raise RuntimeError("Neutral surgical milestone receipt/hash is not locked")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(neutral_glb))
    head = bpy.data.objects.get(direct.HEAD_OBJECT)
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if head is None or len(armatures) != 1:
        raise RuntimeError("Neutral surgical milestone objects changed")
    armature = armatures[0]
    if len(armature.data.bones) != EXPECTED_RUNTIME_BONES:
        raise RuntimeError("Neutral surgical milestone armature changed")
    oral_source = locked_oral_source_geometry()
    derived = neutral_receipt["build"]["derivedMeasurements"]
    edge_spacing = float(derived["sourceLipMedianEdgeSpacingMeters"])
    minimum_clearance = 0.1 * edge_spacing
    minimum_back_clearance = 0.25 * edge_spacing
    depth_search = []
    selected = None
    for multiplier in (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0):
        depth_offset = multiplier * edge_spacing
        candidate_surfaces, candidate_transforms = oral_fit_surfaces(
            oral_source, derived, depth_offset
        )
        minimum_z = min(
            point.z
            for surface in candidate_surfaces.values()
            for point in surface["points"]
        )
        candidate = {
            "depthOffsetEdgeSpacingMultiplier": multiplier,
            "depthOffsetMeters": depth_offset,
            "minimumAnatomyDepthZ": float(minimum_z),
            "minimumAllowedDepthZ": float(
                derived["mouthBagBackDepthZ"] + minimum_back_clearance
            ),
        }
        if minimum_z < candidate["minimumAllowedDepthZ"]:
            candidate["status"] = "FAIL_BACK_WALL_CLEARANCE"
            depth_search.append(candidate)
            continue
        overlap_metrics = oral_surface_overlap_metrics(
            direct, head, armature, candidate_surfaces
        )
        pair_clearances = {
            "upperToLowerMeters": pair_surface_clearance(
                candidate_surfaces["upper"], candidate_surfaces["lower"]
            ),
            "tongueToLowerMeters": pair_surface_clearance(
                candidate_surfaces["tongue"], candidate_surfaces["lower"]
            ),
            "tongueToUpperMeters": pair_surface_clearance(
                candidate_surfaces["tongue"], candidate_surfaces["upper"]
            ),
        }
        candidate.update(
            {
                "overlap": overlap_metrics,
                "pairClearancesMeters": pair_clearances,
            }
        )
        if overlap_metrics["crossOwnerOralOverlapCount"]:
            candidate["status"] = "FAIL_INTERSECTION"
            depth_search.append(candidate)
            continue
        if min(pair_clearances.values()) < minimum_clearance:
            candidate["status"] = "FAIL_PAIR_CLEARANCE"
            depth_search.append(candidate)
            continue
        candidate["status"] = "PASS_SELECTED_SHALLOWEST_COLLISION_FREE"
        depth_search.append(candidate)
        selected = (
            candidate_surfaces,
            candidate_transforms,
            pair_clearances,
            overlap_metrics,
        )
        break
    if selected is None:
        raise SurgicalGateError(
            "No source-bounded oral depth offset clears the surgical vault",
            {
                "gate": "oral-depth-offset-line-search",
                "depthSearch": depth_search,
            },
        )
    surfaces, transforms, pair_clearances, surface_overlap_metrics = selected
    source_self_overlap_baseline = oral_self_overlap_baseline(direct, surfaces)
    teeth_material = make_cc0_oral_material(
        "HumanFoundation_Teeth_CC0",
        TEETH_TEXTURE_SOURCE,
        (0.64, 0.64, 0.64, 1.0),
        0.35,
    )
    tongue_material = make_cc0_oral_material(
        "HumanFoundation_Tongue_CC0",
        TONGUE_TEXTURE_SOURCE,
        (1.0, 1.0, 1.0, 1.0),
        0.60,
    )
    # bpy.data is cleared for the mandatory fresh-import gate below.  Cache
    # receipt strings before that invalidates the original RNA wrappers.
    teeth_material_name = teeth_material.name
    tongue_material_name = tongue_material.name
    upper = create_oral_accessory_object(
        direct,
        "HumanFoundation_UpperTeeth",
        surfaces["upper"],
        head,
        armature,
        teeth_material,
    )
    lower = create_oral_accessory_object(
        direct,
        "HumanFoundation_LowerTeeth",
        surfaces["lower"],
        head,
        armature,
        teeth_material,
    )
    tongue = create_oral_accessory_object(
        direct,
        "HumanFoundation_Tongue",
        surfaces["tongue"],
        head,
        armature,
        tongue_material,
    )
    collision_gate = combined_oral_collision_gate(
        direct,
        head,
        armature,
        [("upperTeeth", upper), ("lowerTeeth", lower), ("tongue", tongue)],
        source_self_overlap_baseline,
    )
    if min(pair_clearances.values()) < minimum_clearance:
        raise SurgicalGateError(
            "Fitted CC0 oral anatomy lacks the source-derived minimum clearance",
            {
                "gate": "neutral-oral-pair-clearance",
                "minimumRequiredMeters": minimum_clearance,
                "observed": pair_clearances,
            },
        )
    output_glb = evidence / "human-foundation-surgical-mouth-oral-neutral-proof.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=False,
        export_animations=False,
        export_all_influences=True,
        export_normals=True,
        export_skins=True,
        export_texcoords=True,
    )
    output_hash = file_sha256(output_glb)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    reimport_head = bpy.data.objects.get(direct.HEAD_OBJECT)
    reimport_armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    accessory_names = (
        "HumanFoundation_UpperTeeth",
        "HumanFoundation_LowerTeeth",
        "HumanFoundation_Tongue",
    )
    reimport_accessories = [bpy.data.objects.get(name) for name in accessory_names]
    if (
        reimport_head is None
        or len(reimport_armatures) != 1
        or any(obj is None for obj in reimport_accessories)
        or len(reimport_armatures[0].data.bones) != EXPECTED_RUNTIME_BONES
    ):
        raise RuntimeError("Fresh oral-neutral GLB reimport changed package objects")
    reimport_collision_gate = combined_oral_collision_gate(
        direct,
        reimport_head,
        reimport_armatures[0],
        list(zip(("upperTeeth", "lowerTeeth", "tongue"), reimport_accessories)),
        source_self_overlap_baseline,
    )
    report = {
        "schema": "souldrifter.surgical-mouth-oral-neutral-proof.v1",
        "issue": ISSUE,
        "status": "PASS_CC0_ORAL_NEUTRAL_FRESH_REIMPORT_JAW_NOT_YET_PROVEN_NOT_PROMOTED",
        "neutralMilestone": {
            "glb": neutral_glb.as_posix(),
            "sha256": neutral_receipt["quarantinedGlb"]["sha256"],
            "receipt": neutral_receipt_path.as_posix(),
            "receiptSha256": file_sha256(neutral_receipt_path),
        },
        "source": oral_source["provenance"],
        "classification": oral_source["measurements"],
        "gumShellPolicy": "EXCLUDED_CONNECTED_CROSS_JAW_SHELL_QUARANTINED",
        "transforms": transforms,
        "materials": {
            "teeth": {
                "name": teeth_material_name,
                "sourceDiffuseMultiplier": [0.64, 0.64, 0.64, 1.0],
                "reviewRoughness": 0.35,
                "textureSha256": LOCKED_CC0_HASHES[TEETH_TEXTURE_SOURCE],
            },
            "tongue": {
                "name": tongue_material_name,
                "sourceDiffuseMultiplier": [1.0, 1.0, 1.0, 1.0],
                "reviewRoughness": 0.60,
                "textureSha256": LOCKED_CC0_HASHES[TONGUE_TEXTURE_SOURCE],
            },
        },
        "neutralGates": {
            "collision": collision_gate,
            "surfacePrebuildCollision": surface_overlap_metrics,
            "sourceSelfOverlapBaseline": oral_self_overlap_baseline_receipt(
                source_self_overlap_baseline
            ),
            "pairClearancesMeters": pair_clearances,
            "minimumRequiredPairClearanceMeters": minimum_clearance,
            "depthOffsetSearch": depth_search,
        },
        "quarantinedGlb": {"path": output_glb.as_posix(), "sha256": output_hash},
        "freshReimport": {
            "runtimeBoneCount": len(reimport_armatures[0].data.bones),
            "objects": list(accessory_names),
            "collision": reimport_collision_gate,
        },
        "promotion": "BLOCKED_PENDING_JAW_SWEEP_AND_MULTI_ANGLE_VISUAL_PROOF",
    }
    report["receipt"] = write_json(
        evidence / "oral-neutral-proof-receipt.json", report
    )
    print("SURGICAL_MOUTH_ORAL_NEUTRAL_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def rigify_jaw_authoring_contract(direct, source: Path):
    """Fit and drive Blender's real Rigify jaw control on the accepted source."""

    source_head, _source_body, source_armature = direct.import_locked_source(source)
    source_neutral = direct.head_local_points(source_head, source_armature)
    (
        _source_raw_keys,
        source_raw_for_key,
        source_key_points,
        source_adjacency,
        source_faces,
    ) = direct.logical_topology(source_head, source_neutral)
    source_regions = direct.exact_regions(
        source_raw_for_key,
        source_key_points,
        source_adjacency,
        source_faces,
    )
    source_exterior = source_regions["surfaceComponents"][0]
    source_exterior_faces = {
        face for face in source_faces if set(face) <= source_exterior
    }
    source_lip_support = (
        source_regions["mouthUpper"] | source_regions["mouthLower"]
    ) & source_exterior
    _selected, removed_patch, _distance, _selection_receipt = deterministic_surgical_patch(
        source_exterior,
        source_exterior_faces,
        source_lip_support,
        source_adjacency,
    )
    preserved_faces = source_exterior_faces - removed_patch
    ordered_unchanged_keys = sorted(set().union(*preserved_faces))
    cut_metrics = patch_metrics(removed_patch)
    if (
        cut_metrics["boundaryCycleCount"] != 1
        or cut_metrics["boundaryCycleLengths"] != [87]
    ):
        raise RuntimeError("Rigify authoring rebuild lost the locked surgical boundary")
    surgical_build = rebuild_head_mesh(
        direct,
        source_head,
        source_armature,
        source_neutral,
        _source_raw_keys,
        source_raw_for_key,
        source_key_points,
        source_regions,
        source_exterior_faces,
        removed_patch,
        cut_metrics["boundaryCycles"][0],
    )
    surgical_neutral = direct.head_local_points(source_head, source_armature)
    (
        surgical_raw_keys,
        surgical_raw_for_key,
        surgical_key_points,
        surgical_adjacency,
        surgical_faces,
        surgical_logical_mapping,
    ) = topology_with_locked_reference(direct, source_head, surgical_neutral)
    surgical_match_points = {
        key: source_head.data.vertices[raw_indices[0]].co.copy()
        for key, raw_indices in surgical_raw_for_key.items()
    }
    surgical_logical_role_by_key = {}
    for raw_index, key in enumerate(surgical_raw_keys):
        role = surgical_build["vertexRoles"][raw_index]
        prior = surgical_logical_role_by_key.setdefault(key, role)
        if prior != role:
            raise SurgicalGateError(
                "Locked surgical logical coordinate has conflicting raw semantic roles",
                {
                    "gate": "surgical-preexport-raw-index-logical-role-parity",
                    "logicalCoordinate": list(key),
                    "firstRole": prior,
                    "conflictingRole": role,
                    "rawVertexIndex": raw_index,
                },
            )
    rigify_receipt, _skin_eye, skin_jaw = direct.enable_rigify()
    _meta, rig, module_receipt, before_objects = direct.create_aligned_module(
        "surgical-mouth-jaw",
        skin_jaw,
        lambda meta: direct.fit_jaw_metarig(
            meta, source_regions, source_key_points
        ),
    )
    jaw_control = rig.pose.bones.get("jaw")
    jaw_bone = rig.data.bones.get("jaw")
    if jaw_control is None or jaw_bone is None:
        raise RuntimeError("Generated Rigify jaw control is missing")
    target_lips = [
        source_key_points[key]
        for key in source_regions["mouthUpper"] | source_regions["mouthLower"]
    ]
    target_lower = [
        source_key_points[key] for key in source_regions["mouthLower"]
    ]
    mouth_width = max(point.x for point in target_lips) - min(
        point.x for point in target_lips
    )
    pivot = jaw_bone.head_local.copy()
    lip_center = sum(
        (direct.head_to_rig(point) for point in target_lips), Vector()
    ) / len(target_lips)
    lever = max((lip_center - pivot).length, 1.0e-6)
    desired_opening = mouth_width * 0.42
    base_angle = min(math.radians(16.0), math.atan2(desired_opening, lever))

    def moved_head(point: Vector, angle: float) -> Vector:
        rig_point = direct.head_to_rig(point)
        return direct.rig_to_head(
            pivot + Matrix.Rotation(angle, 3, "X") @ (rig_point - pivot)
        )

    sign_candidates = []
    for sign in (1.0, -1.0):
        signed_angle = sign * base_angle
        lower_mean = sum(
            moved_head(point, signed_angle).y for point in target_lower
        ) / len(target_lower)
        sign_candidates.append((lower_mean, sign))
    _lower_mean, selected_sign = min(sign_candidates)
    selected_angle = selected_sign * base_angle
    direct.clear_pose(rig)
    jaw_control.rotation_mode = "XYZ"
    jaw_control.rotation_euler.x = selected_angle
    bpy.context.view_layer.update()
    control_matrix = [[float(value) for value in row] for row in jaw_control.matrix]
    control_basis = [[float(value) for value in row] for row in jaw_control.matrix_basis]
    source_state = {
        "keys": set(source_key_points),
        "keyPoints": source_key_points,
        "adjacency": source_adjacency,
        "regions": source_regions,
        "orderedKeys": ordered_unchanged_keys,
        "preservedFaces": preserved_faces,
        "surgicalRawKeys": surgical_raw_keys,
        "surgicalLogicalRoleByKey": surgical_logical_role_by_key,
        "surgicalKeyPoints": surgical_key_points,
        "surgicalMatchPoints": surgical_match_points,
        "surgicalAdjacency": surgical_adjacency,
        "surgicalFaces": surgical_faces,
        "surgicalLogicalMapping": surgical_logical_mapping,
        "surgicalBuild": surgical_build,
    }
    receipt = {
        "method": "BUNDLED_BLENDER_5_2_1_RIGIFY_TARGET_FITTED_JAW_CONTROL",
        "rigify": rigify_receipt,
        "module": module_receipt,
        "control": "jaw",
        "pivotRigLocal": list(pivot),
        "mouthWidthMeters": float(mouth_width),
        "pivotToLipLeverMeters": float(lever),
        "desiredOpeningFractionOfMouthWidth": 0.42,
        "desiredOpeningMeters": float(desired_opening),
        "maximumAngleDegrees": 16.0,
        "selectedAngleRadians": float(selected_angle),
        "selectedAngleDegrees": float(math.degrees(selected_angle)),
        "selectedSignPolicy": "LOWER_MEAN_HEAD_LOCAL_VERTICAL_MOVES_DOWN",
        "signCandidateLowerMeanVerticalMeters": [
            {"sign": sign, "meanY": mean_y}
            for mean_y, sign in sign_candidates
        ],
        "evaluatedControlMatrix": control_matrix,
        "evaluatedControlMatrixBasis": control_basis,
        "parameterStatus": "FIRST_PROOF_REVIEW_PARAMETER_NOT_ANATOMICAL_CANON",
    }
    direct.strip_created_objects(before_objects)
    return source_state, receipt


def match_locked_source_subset(
    source_state: dict[str, object],
    target_raw_keys: list[tuple[float, float, float]],
    target_key_points: dict[tuple[float, float, float], Vector],
    target_faces: set[tuple[tuple[float, float, float], ...]],
    expected_match_count: int,
) -> tuple[dict[tuple[float, float, float], tuple[float, float, float]], dict[str, object]]:
    """Map by deterministic build order plus complete preserved-face topology."""

    ordered_source_keys = list(source_state["orderedKeys"])
    if len(ordered_source_keys) != expected_match_count:
        raise SurgicalGateError(
            "Locked deterministic source order changed before correspondence",
            {
                "gate": "jaw-unchanged-source-deterministic-order-count",
                "expected": expected_match_count,
                "actual": len(ordered_source_keys),
            },
        )
    if len(target_raw_keys) < expected_match_count:
        raise RuntimeError(
            f"Target has too few ordered vertices: {len(target_raw_keys)}/"
            f"{expected_match_count}"
        )
    ordered_target_keys = target_raw_keys[:expected_match_count]
    if len(set(ordered_source_keys)) != expected_match_count or len(
        set(ordered_target_keys)
    ) != expected_match_count:
        raise SurgicalGateError(
            "Deterministic correspondence contains a duplicate logical vertex",
            {
                "gate": "jaw-unchanged-source-order-one-to-one",
                "sourceUniqueCount": len(set(ordered_source_keys)),
                "targetUniqueCount": len(set(ordered_target_keys)),
                "expected": expected_match_count,
            },
        )
    mapping = dict(zip(ordered_source_keys, ordered_target_keys, strict=True))
    mapped_preserved_faces = {
        tuple(sorted(mapping[key] for key in face))
        for face in source_state["preservedFaces"]
    }
    missing_faces = mapped_preserved_faces - target_faces
    if missing_faces or len(mapped_preserved_faces) != len(source_state["preservedFaces"]):
        raise SurgicalGateError(
            "Deterministic vertex order does not preserve the locked face topology",
            {
                "gate": "jaw-unchanged-source-complete-preserved-face-parity",
                "expectedFaceCount": len(source_state["preservedFaces"]),
                "mappedFaceCount": len(mapped_preserved_faces),
                "missingFaceCount": len(missing_faces),
                "firstMissingMappedFaces": [
                    [list(key) for key in face] for face in sorted(missing_faces)[:20]
                ],
            },
        )
    source_key_points = source_state["keyPoints"]
    deltas = [
        target_key_points[target_key] - source_key_points[source_key]
        for source_key, target_key in mapping.items()
    ]
    maximum_delta = max((float(delta.length) for delta in deltas), default=0.0)
    maximum_component_delta = max(
        (
            abs(float(delta[axis]))
            for delta in deltas
            for axis in range(3)
        ),
        default=0.0,
    )
    digest = sha256()
    for source_key, target_key in sorted(mapping.items()):
        digest.update(np.asarray(source_key, dtype="<f8").tobytes())
        digest.update(np.asarray(target_key, dtype="<f8").tobytes())
    return mapping, {
        "method": "DETERMINISTIC_REBUILD_VERTEX_ORDER_PLUS_COMPLETE_PRESERVED_FACE_PARITY",
        "expectedAndObservedMatchCount": len(mapping),
        "preservedFaceCount": len(mapped_preserved_faces),
        "missingPreservedFaceCount": 0,
        "maximumCoordinateDeltaMetersDiagnosticOnly": maximum_delta,
        "maximumComponentDeltaMetersDiagnosticOnly": maximum_component_delta,
        "coordinateAcceptance": (
            "LOCKED_INPUT_GLBS_ALREADY_PASSED_THEIR_OWN_FLOAT32_GEOMETRY_GATES; "
            "NO_NEW_OR_WIDER_COORDINATE_TOLERANCE_USED_FOR_CORRESPONDENCE"
        ),
        "orderedMappingSha256": digest.hexdigest().upper(),
    }


def surgical_jaw_influence(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    source_state: dict[str, object],
    derived: dict[str, object],
    expected_unchanged_source_count: int,
):
    neutral = direct.head_local_points(head, armature)
    (
        raw_keys,
        raw_for_key,
        key_points,
        adjacency,
        faces,
        source_mapping_receipt,
    ) = topology_with_locked_reference(
        direct,
        head,
        neutral,
        locked_key_points=source_state["surgicalKeyPoints"],
        locked_match_points=source_state["surgicalMatchPoints"],
    )
    all_keys = set(key_points)
    preserved_source_keys = set(source_state["orderedKeys"])
    missing_preserved_source_keys = preserved_source_keys - all_keys
    source_to_target = {key: key for key in preserved_source_keys & all_keys}
    if (
        len(preserved_source_keys) != expected_unchanged_source_count
        or missing_preserved_source_keys
        or len(source_to_target) != expected_unchanged_source_count
    ):
        raise SurgicalGateError(
            "Fresh surgical head cannot recover the locked unchanged source set",
            {
                "gate": "jaw-unchanged-source-preexport-reference-coverage",
                "expected": expected_unchanged_source_count,
                "actual": len(source_to_target),
                "declaredPreservedSourceLogicalCount": len(preserved_source_keys),
                "missingPreservedSourceLogicalCoordinates": [
                    list(key) for key in sorted(missing_preserved_source_keys)[:50]
                ],
                "logicalReferenceMapping": source_mapping_receipt,
            },
        )
    unchanged_source_keys = set(source_to_target.values())
    new_patch_keys = all_keys - unchanged_source_keys
    if len(new_patch_keys) != len(all_keys) - expected_unchanged_source_count:
        raise RuntimeError("Surgical mouth logical partition is inconsistent")
    source_regions = source_state["regions"]
    source_key_points = source_state["keyPoints"]
    source_adjacency = source_state["adjacency"]
    source_present = set(source_to_target)
    source_exterior = source_regions["surfaceComponents"][0]
    # The locked minimal surgical disk intentionally removes every old lip-chain
    # vertex. Reuse the exact source-derived lower-inner-lip landmark that built
    # the replacement loops instead of guessing a generic cutoff.
    lower_mandible_vertical = float(derived["lowerInnerY"])
    source_jaw_present_source = source_regions["jaw"] & source_present
    source_core_source = {
        key
        for key in source_jaw_present_source & source_exterior
        if key_points[source_to_target[key]].y <= lower_mandible_vertical
    }
    maximum_source_distance = max(source_regions["jawDistance"].values())
    source_zero_source = {
        key
        for key in source_jaw_present_source - source_core_source
        if key in source_regions["seam"]
        or source_regions["jawDistance"][key] == maximum_source_distance
        or any(neighbor not in source_regions["jaw"] for neighbor in source_adjacency[key])
    }
    source_jaw_present = {
        source_to_target[key] for key in source_jaw_present_source
    }
    source_core = {source_to_target[key] for key in source_core_source}
    source_zero = {source_to_target[key] for key in source_zero_source}
    center_x = float(derived["centerX"])
    center_y = float(derived["centerY"])
    edge_spacing = float(derived["sourceLipMedianEdgeSpacingMeters"])
    transition = 0.5 * edge_spacing
    logical_roles = source_state["surgicalLogicalRoleByKey"]
    ring_groups = defaultdict(list)
    for key in sorted(new_patch_keys):
        role = logical_roles.get(key, "")
        if role.startswith("L") and not role.endswith("_CAP"):
            ring_groups[role].append(key)
    profile_fixed = {}
    profile_receipt = {}
    for role, ring_keys in sorted(ring_groups.items()):
        if len(ring_keys) < 8:
            raise RuntimeError(f"Structured surgical mouth ring changed: {role}/{len(ring_keys)}")
        radius_x = max(abs(key_points[key].x - center_x) for key in ring_keys)
        radius_y = max(abs(key_points[key].y - center_y) for key in ring_keys)
        if min(radius_x, radius_y) <= 1.0e-9:
            raise RuntimeError(f"Structured surgical mouth ring collapsed: {role}")
        values = []
        for key in ring_keys:
            normalized_y = (key_points[key].y - center_y) / radius_y
            lower_arc = max(0.0, min(1.0, -normalized_y))
            # Smoothstep gives zero slope at both fixed commissures/upper arc
            # and at the fully moving lower-center arc.
            value = lower_arc * lower_arc * (3.0 - 2.0 * lower_arc)
            if value <= 1.0e-12:
                value = 0.0
            elif value >= 1.0 - 1.0e-12:
                value = 1.0
            profile_fixed[key] = value
            values.append(value)
        profile_receipt[role] = {
            "logicalCount": len(ring_keys),
            "radiusXMeters": radius_x,
            "radiusYMeters": radius_y,
            "minimumAlpha": min(values),
            "maximumAlpha": max(values),
            "zeroCount": sum(value == 0.0 for value in values),
            "oneCount": sum(value == 1.0 for value in values),
        }
    aperture_keys = set(ring_groups.get("L2_APERTURE", ()))
    aperture_raw_indices = source_state["surgicalBuild"]["ringRawIndicesByRole"][
        "L2_APERTURE"
    ]
    expected_aperture_keys = {
        source_state["surgicalRawKeys"][raw_index]
        for raw_index in aperture_raw_indices
    }
    if (
        len(aperture_raw_indices) != 87
        or None in expected_aperture_keys
        or aperture_keys != expected_aperture_keys
    ):
        raise SurgicalGateError(
            "Locked L2 aperture ring raw/logical membership changed",
            {
                "gate": "jaw-l2-aperture-exact-preexport-membership",
                "expectedRawCardinality": 87,
                "actualRawCardinality": len(aperture_raw_indices),
                "expectedLogicalCardinality": len(expected_aperture_keys),
                "actualLogicalCardinality": len(aperture_keys),
                "missingLogicalCoordinates": [
                    list(key) for key in sorted(expected_aperture_keys - aperture_keys)
                ],
                "unexpectedLogicalCoordinates": [
                    list(key) for key in sorted(aperture_keys - expected_aperture_keys)
                ],
            },
        )
    lower_aperture = {
        key for key in aperture_keys if key_points[key].y < center_y
    }
    upper_aperture = {
        key for key in aperture_keys if key_points[key].y > center_y
    }
    profile_zero = {key for key, value in profile_fixed.items() if value == 0.0}
    profile_one = {key for key, value in profile_fixed.items() if value == 1.0}
    profile_fractional = set(profile_fixed) - profile_zero - profile_one
    moving_constraints = source_core | profile_one
    zero_constraints = source_zero | profile_zero
    support = source_jaw_present | new_patch_keys
    fixed = {
        **{key: 1.0 for key in source_core},
        **{key: 0.0 for key in source_zero},
        **profile_fixed,
    }
    unknowns = sorted(support - set(fixed))
    alpha = dict(fixed)
    for key in unknowns:
        point = key_points[key]
        alpha[key] = min(
            1.0,
            max(0.0, (center_y + transition - point.y) / (2.0 * transition)),
        )
    tolerance = 1.0e-12
    maximum_iterations = 20000
    final_update = math.inf
    iterations = 0
    for iterations in range(1, maximum_iterations + 1):
        final_update = 0.0
        for key in unknowns:
            neighbors = sorted(adjacency[key])
            if not neighbors:
                raise RuntimeError(f"Surgical jaw support has isolated vertex: {key}")
            value = sum(alpha.get(neighbor, 0.0) for neighbor in neighbors) / len(
                neighbors
            )
            final_update = max(final_update, abs(value - alpha[key]))
            alpha[key] = value
        if final_update <= tolerance:
            break
    if final_update > tolerance:
        raise RuntimeError(
            f"Surgical jaw harmonic solve did not converge: {final_update}"
        )
    residual = max(
        (
            abs(
                alpha[key]
                - sum(alpha.get(neighbor, 0.0) for neighbor in adjacency[key])
                / len(adjacency[key])
            )
            for key in unknowns
        ),
        default=0.0,
    )
    if residual > 2.0e-12 or min(alpha.values()) < -1.0e-10 or max(alpha.values()) > 1.0 + 1.0e-10:
        raise RuntimeError(
            f"Surgical jaw harmonic field failed residual/range: {residual}/"
            f"{min(alpha.values())}/{max(alpha.values())}"
        )
    central_upper = sorted(
        (
            key
            for key in upper_aperture
            if abs(key_points[key].x - center_x) <= 0.006
        ),
        key=lambda key: (abs(key_points[key].y - derived["upperInnerY"]), key),
    )[:12]
    central_lower = sorted(
        (
            key
            for key in lower_aperture
            if abs(key_points[key].x - center_x) <= 0.006
        ),
        key=lambda key: (abs(key_points[key].y - derived["lowerInnerY"]), key),
    )[:12]
    if len(central_upper) < 4 or len(central_lower) < 4:
        raise RuntimeError(
            f"Surgical central lip selectors changed: {len(central_upper)}/{len(central_lower)}"
        )
    digest = sha256()
    for key in sorted(alpha):
        digest.update(np.asarray(key, dtype="<f8").tobytes())
        digest.update(np.asarray([alpha[key]], dtype="<f8").tobytes())
    receipt = {
        "method": "POSITIVE_UNIFORM_LOGICAL_GRAPH_HARMONIC_SCALAR_JAW_INFLUENCE",
        "solver": "DETERMINISTIC_SORTED_FLOAT64_GAUSS_SEIDEL",
        "lockedSourceCorrespondence": source_mapping_receipt,
        "supportLogicalCount": len(support),
        "unchangedSourceLogicalCount": len(unchanged_source_keys),
        "newSurgicalPatchLogicalCount": len(new_patch_keys),
        "movingConstraintCount": len(moving_constraints),
        "zeroConstraintCount": len(zero_constraints),
        "unknownCount": len(unknowns),
        "sourceMandibleCoreConstraintCount": len(source_core),
        "newRingProfileDirichletCount": len(profile_fixed),
        "newRingProfileZeroCount": len(profile_zero),
        "newRingProfileOneCount": len(profile_one),
        "newRingProfileFractionalCount": len(profile_fractional),
        "ringProfiles": profile_receipt,
        "iterations": iterations,
        "maximumIterations": maximum_iterations,
        "updateTolerance": tolerance,
        "finalMaximumUpdate": final_update,
        "finalMaximumLinearResidual": residual,
        "minimumAlpha": min(alpha.values()),
        "maximumAlpha": max(alpha.values()),
        "orderedFieldFloat64Sha256": digest.hexdigest().upper(),
        "outsideSupportPolicy": "EXACTLY_STATIONARY_ALPHA_ZERO",
        "structuredRingPolicy": (
            "PER_RING_NORMALIZED_VERTICAL_LOWER_ARC_SMOOTHSTEP; UPPER_ARC_AND_"
            "COMMISSURES_ZERO; LOWER_CENTER_ONE"
        ),
        "sourceMandiblePolicy": "HARMONIC_BETWEEN_SOURCE_CORE_ONE_AND_BOUNDARY_ZERO",
        "centralUpperLogicalCoordinates": [list(key) for key in central_upper],
        "centralLowerLogicalCoordinates": [list(key) for key in central_lower],
    }
    context = {
        "neutral": neutral,
        "rawKeys": raw_keys,
        "rawForKey": raw_for_key,
        "keyPoints": key_points,
        "adjacency": adjacency,
        "faces": faces,
        "polygons": [tuple(polygon.vertices) for polygon in head.data.polygons],
        "support": support,
        "seam": {
            source_to_target[key]
            for key in source_regions["seam"]
            if key in source_to_target
        },
        "sourceToTargetKey": source_to_target,
        "logicalRoles": logical_roles,
        "constraintRoles": {
            key: (
                "ONE_DIRICHLET"
                if key in source_core
                else "ZERO_DIRICHLET"
                if key in source_zero
                else "PROFILE_ONE_DIRICHLET"
                if key in profile_one
                else "PROFILE_ZERO_DIRICHLET"
                if key in profile_zero
                else "PROFILE_FRACTIONAL_DIRICHLET"
                if key in profile_fractional
                else "HARMONIC_UNKNOWN"
                if key in support
                else "OUTSIDE_SUPPORT_STATIONARY"
            )
            for key in all_keys
        },
        "mappedEyes": {
            side: {
                **source_regions["eyes"][side],
                "aperture": {
                    source_to_target[key]
                    for key in source_regions["eyes"][side]["aperture"]
                },
                "region": {
                    source_to_target[key]
                    for key in source_regions["eyes"][side]["region"]
                },
            }
            for side in ("left", "right")
        },
        "centralUpper": central_upper,
        "centralLower": central_lower,
    }
    return alpha, receipt, context


def rotate_head_points_by_influence(
    direct,
    context: dict[str, object],
    influence: dict[tuple[float, float, float], float],
    pivot_rig_local: Vector,
    angle_radians: float,
) -> list[Vector]:
    neutral = context["neutral"]
    target = [point.copy() for point in neutral]
    for key in sorted(influence):
        alpha = influence[key]
        if alpha == 0.0:
            continue
        representative = context["keyPoints"][key]
        rig_point = direct.head_to_rig(representative)
        moved = direct.rig_to_head(
            pivot_rig_local
            + Matrix.Rotation(alpha * angle_radians, 3, "X")
            @ (rig_point - pivot_rig_local)
        )
        delta = moved - representative
        for raw_index in context["rawForKey"][key]:
            target[raw_index] = neutral[raw_index] + delta
    return target


def rotate_rigid_head_local_points(
    direct,
    points: list[Vector],
    pivot_rig_local: Vector,
    angle_radians: float,
) -> list[Vector]:
    rotation = Matrix.Rotation(angle_radians, 3, "X")
    return [
        direct.rig_to_head(
            pivot_rig_local
            + rotation @ (direct.head_to_rig(point) - pivot_rig_local)
        )
        for point in points
    ]


def central_mouth_gap(
    points: list[Vector],
    context: dict[str, object],
) -> float:
    upper = [
        points[context["rawForKey"][key][0]] for key in context["centralUpper"]
    ]
    lower = [
        points[context["rawForKey"][key][0]] for key in context["centralLower"]
    ]
    return sum(point.y for point in upper) / len(upper) - sum(
        point.y for point in lower
    ) / len(lower)


def shape_key_head_local_points(
    direct,
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    key_name: str,
) -> list[Vector]:
    if obj.data.shape_keys is None or key_name not in obj.data.shape_keys.key_blocks:
        raise RuntimeError(f"Missing shape key {obj.name}/{key_name}")
    head_world = armature.matrix_world @ armature.data.bones[direct.HEAD_BONE].matrix_local
    object_to_head = head_world.inverted() @ obj.matrix_world
    key = obj.data.shape_keys.key_blocks[key_name]
    return [object_to_head @ point.co for point in key.data]


def bake_frozen_eye_proofs(
    direct,
    head: bpy.types.Object,
    armature: bpy.types.Object,
    source_state: dict[str, object],
    context: dict[str, object],
    baseline_overlaps: set[tuple[int, int]],
    intersection_precision: dict[str, object],
) -> dict[str, object]:
    if (
        not FROZEN_EYE_RECEIPT.is_file()
        or file_sha256(FROZEN_EYE_RECEIPT) != FROZEN_EYE_RECEIPT_SHA256
    ):
        raise RuntimeError("Frozen eye proof checkpoint hash changed")
    checkpoint = json.loads(FROZEN_EYE_RECEIPT.read_text(encoding="utf-8"))
    if checkpoint.get("status") != "PASS_BLINK_LEFT_RIGHT_JAW_NOT_YET_PROVEN_NOT_PROMOTED":
        raise RuntimeError("Frozen eye proof checkpoint status changed")
    receipts = {}
    for target_name, side in (
        ("eyeBlinkLeft", "left"),
        ("eyeBlinkRight", "right"),
    ):
        raw_receipts = checkpoint["targets"][target_name]["hybridCorrective"][
            "rawVertexReceipts"
        ]
        delta_by_key = {}
        duplicate_delta_maximum = 0.0
        for entry in raw_receipts.values():
            key = tuple(entry["logicalCoordinate"])
            delta = Vector((0.0, entry["deltaVertical"], entry["deltaDepth"]))
            if key in delta_by_key:
                duplicate_delta_maximum = max(
                    duplicate_delta_maximum,
                    (delta - delta_by_key[key]).length,
                )
            else:
                delta_by_key[key] = delta
        source_to_target = context["sourceToTargetKey"]
        missing = sorted(set(delta_by_key) - set(source_to_target))
        if missing or duplicate_delta_maximum > 1.0e-12:
            raise SurgicalGateError(
                "Frozen blink cannot map exactly to the unchanged surgical eye topology",
                {
                    "gate": "frozen-blink-logical-transfer",
                    "target": target_name,
                    "missingLogicalCoordinates": [list(key) for key in missing[:50]],
                    "duplicateDeltaMaximumMeters": duplicate_delta_maximum,
                },
            )
        target_delta_by_key = {
            source_to_target[key]: delta for key, delta in delta_by_key.items()
        }
        target = [point.copy() for point in context["neutral"]]
        for key, delta in target_delta_by_key.items():
            for raw_index in context["rawForKey"][key]:
                target[raw_index] += delta
        gate = direct.deformation_gate(
            target_name + "-surgical-transfer",
            context["neutral"],
            target,
            context["polygons"],
            context["rawKeys"],
            context["rawForKey"],
            set(target_delta_by_key),
            context["seam"],
            baseline_overlaps,
            intersection_precision,
        )
        aperture = direct.blink_gap_receipt(
            context["neutral"],
            target,
            context["mappedEyes"][side],
            context["rawForKey"],
            context["keyPoints"],
        )
        direct.bake_shape_key(head, armature, target_name, target)
        receipts[target_name] = {
            "sourceReceipt": FROZEN_EYE_RECEIPT.as_posix(),
            "sourceReceiptSha256": FROZEN_EYE_RECEIPT_SHA256,
            "logicalDeltaCount": len(delta_by_key),
            "mappedTargetLogicalDeltaCount": len(target_delta_by_key),
            "duplicateDeltaMaximumMeters": duplicate_delta_maximum,
            "aperture": aperture,
            "gates": gate,
        }
    return receipts


def build_jaw_blink_proof(args: argparse.Namespace) -> dict[str, object]:
    """Bake and fresh-import the bounded blink/jaw proof on the surgical head."""

    direct = load_direct_builder()
    source = Path(args.source_glb).resolve()
    evidence = Path(args.evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    neutral_receipt_path = evidence / "neutral-retopology-receipt.json"
    oral_receipt_path = evidence / "oral-neutral-proof-receipt.json"
    oral_glb = evidence / "human-foundation-surgical-mouth-oral-neutral-proof.glb"
    if not neutral_receipt_path.is_file() or not oral_receipt_path.is_file():
        raise RuntimeError("Passed neutral/oral surgical milestones are missing")
    neutral_receipt = json.loads(neutral_receipt_path.read_text(encoding="utf-8"))
    oral_receipt = json.loads(oral_receipt_path.read_text(encoding="utf-8"))
    if (
        neutral_receipt.get("status")
        != "PASS_NEUTRAL_RETOPOLOGY_FRESH_REIMPORT_JAW_NOT_YET_PROVEN_NOT_PROMOTED"
        or oral_receipt.get("status")
        != "PASS_CC0_ORAL_NEUTRAL_FRESH_REIMPORT_JAW_NOT_YET_PROVEN_NOT_PROMOTED"
        or not oral_glb.is_file()
        or file_sha256(oral_glb) != oral_receipt["quarantinedGlb"]["sha256"]
    ):
        raise RuntimeError("Neutral/oral surgical milestone receipt or hash changed")

    # Generate and drive Blender 5.2.1's bundled Rigify jaw first. Only its
    # target-fitted hinge/control transform is retained; the temporary authoring
    # rig is stripped before the production 65-bone package is imported.
    source_state, authoring_receipt = rigify_jaw_authoring_contract(direct, source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(oral_glb))
    head = bpy.data.objects.get(direct.HEAD_OBJECT)
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    accessory_names = {
        "upperTeeth": "HumanFoundation_UpperTeeth",
        "lowerTeeth": "HumanFoundation_LowerTeeth",
        "tongue": "HumanFoundation_Tongue",
    }
    accessories = {
        owner: bpy.data.objects.get(name) for owner, name in accessory_names.items()
    }
    body = bpy.data.objects.get(direct.BODY_OBJECT)
    if (
        head is None
        or body is None
        or len(armatures) != 1
        or any(obj is None for obj in accessories.values())
        or len(armatures[0].data.bones) != EXPECTED_RUNTIME_BONES
    ):
        raise RuntimeError("Oral-neutral proof package objects or armature changed")
    armature = armatures[0]
    expected_runtime_object_names = {
        armature.name,
        body.name,
        head.name,
        *(obj.name for obj in accessories.values()),
    }
    stripped_nonruntime_objects = sorted(
        [
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent is not None else None,
            }
            for obj in bpy.data.objects
            if obj.name not in expected_runtime_object_names
        ],
        key=lambda record: (record["type"], record["name"]),
    )
    for obj in list(bpy.data.objects):
        if obj.name not in expected_runtime_object_names:
            bpy.data.objects.remove(obj, do_unlink=True)
    if set(bpy.data.objects.keys()) != expected_runtime_object_names:
        raise RuntimeError(
            "Runtime-only facial package stripping changed the required object set"
        )
    if any(obj.data.shape_keys is not None for obj in [head, *accessories.values()]):
        raise RuntimeError("Oral-neutral proof unexpectedly already has shape keys")

    head_basis = direct.mesh_basis_signature(head)
    derived = neutral_receipt["build"]["derivedMeasurements"]
    expected_unchanged = int(
        neutral_receipt["neutralGates"]["unchangedNonmouthLogicalCount"]
    )
    influence, influence_receipt, context = surgical_jaw_influence(
        direct,
        head,
        armature,
        source_state,
        derived,
        expected_unchanged,
    )
    head_precision = direct.exact_intersection_precision(context["neutral"])
    head_baseline_overlaps = direct.nonadjacent_self_overlaps(
        context["neutral"],
        context["polygons"],
        context["rawKeys"],
        head_precision,
    )
    head.shape_key_add(name="Basis", from_mix=False)
    blink_receipts = bake_frozen_eye_proofs(
        direct,
        head,
        armature,
        source_state,
        context,
        head_baseline_overlaps,
        head_precision,
    )

    def interpolate(
        neutral_points: list[Vector], target_points: list[Vector], weight: float
    ) -> list[Vector]:
        return [
            source_point + (target_point - source_point) * weight
            for source_point, target_point in zip(
                neutral_points, target_points, strict=True
            )
        ]

    # A full blink can pass while an interpolated wedge crosses at a quarter
    # weight. Prove the actual linear morph path, not only the end pose.
    for target_name, side in (
        ("eyeBlinkLeft", "left"),
        ("eyeBlinkRight", "right"),
    ):
        full = shape_key_head_local_points(direct, head, armature, target_name)
        sweep = {}
        for weight in (0.25, 0.50, 0.75, 1.00):
            points = interpolate(context["neutral"], full, weight)
            sweep[f"{weight:.2f}"] = {
                "gates": direct.deformation_gate(
                    f"{target_name}-preexport-{weight:.2f}",
                    context["neutral"],
                    points,
                    context["polygons"],
                    context["rawKeys"],
                    context["rawForKey"],
                    context["mappedEyes"][side]["region"],
                    context["seam"],
                    head_baseline_overlaps,
                    head_precision,
                ),
                "aperture": direct.blink_gap_metrics(
                    context["neutral"],
                    points,
                    context["mappedEyes"][side],
                    context["rawForKey"],
                    context["keyPoints"],
                ),
            }
        blink_receipts[target_name]["interpolationSweep"] = sweep

    oral_source = locked_oral_source_geometry()
    selected_depth = float(oral_receipt["transforms"]["selectedDepthOffsetMeters"])
    surfaces, _transforms = oral_fit_surfaces(oral_source, derived, selected_depth)
    oral_self_baseline = oral_self_overlap_baseline(direct, surfaces)
    accessory_neutral = {
        owner: direct.head_local_points(obj, armature)
        for owner, obj in accessories.items()
    }
    neutral_collision = combined_oral_collision_gate(
        direct,
        head,
        armature,
        [(owner, obj) for owner, obj in accessories.items()],
        oral_self_baseline,
    )
    neutral_gap = central_mouth_gap(context["neutral"], context)
    pivot = Vector(authoring_receipt["pivotRigLocal"])
    base_angle = float(authoring_receipt["selectedAngleRadians"])
    search_receipts = []
    safe_candidates = []
    for amplitude in (0.25, 0.50, 0.75, 1.00):
        angle = base_angle * amplitude
        head_target = rotate_head_points_by_influence(
            direct, context, influence, pivot, angle
        )
        target_points = {
            "head": head_target,
            "upperTeeth": [point.copy() for point in accessory_neutral["upperTeeth"]],
            "lowerTeeth": rotate_rigid_head_local_points(
                direct, accessory_neutral["lowerTeeth"], pivot, angle
            ),
            "tongue": rotate_rigid_head_local_points(
                direct, accessory_neutral["tongue"], pivot, angle
            ),
        }
        opening = central_mouth_gap(head_target, context) - neutral_gap
        candidate = {
            "amplitude": amplitude,
            "angleRadians": angle,
            "angleDegrees": math.degrees(angle),
            "centralOpeningIncreaseMeters": opening,
            "minimumRequiredOpeningIncreaseMeters": 0.002,
            "sweep": {},
        }
        if opening < 0.002:
            candidate["status"] = "FAIL_INSUFFICIENT_CAVITY_OPENING"
            search_receipts.append(candidate)
            continue
        try:
            for weight in (0.25, 0.50, 0.75, 1.00):
                head_points = interpolate(context["neutral"], head_target, weight)
                oral_points = {
                    owner: interpolate(accessory_neutral[owner], target_points[owner], weight)
                    for owner in accessories
                }
                head_gate = direct.deformation_gate(
                    f"jawOpen-preexport-{amplitude:.2f}-{weight:.2f}",
                    context["neutral"],
                    head_points,
                    context["polygons"],
                    context["rawKeys"],
                    context["rawForKey"],
                    context["support"],
                    context["seam"],
                    head_baseline_overlaps,
                    head_precision,
                )
                collision = combined_oral_collision_gate(
                    direct,
                    head,
                    armature,
                    [(owner, obj) for owner, obj in accessories.items()],
                    oral_self_baseline,
                    {"head": head_points, **oral_points},
                )
                candidate["sweep"][f"{weight:.2f}"] = {
                    "gates": head_gate,
                    "collision": collision,
                    "centralOpeningIncreaseMeters": (
                        central_mouth_gap(head_points, context) - neutral_gap
                    ),
                }
        except Exception as error:
            details = getattr(error, "details", None)
            if isinstance(details, dict) and details.get("flippedTriangles"):
                details = dict(details)
                details["vertexInfluenceDiagnostics"] = []
                for triangle in details["flippedTriangles"]:
                    for raw_index in triangle["rawVertexIndices"]:
                        key = context["rawKeys"][raw_index]
                        details["vertexInfluenceDiagnostics"].append(
                            {
                                "rawVertexIndex": raw_index,
                                "logicalCoordinate": list(key),
                                "alpha": influence.get(key, 0.0),
                                "logicalRole": context["logicalRoles"].get(key),
                                "constraintRole": context["constraintRoles"].get(key),
                            }
                        )
            candidate["status"] = "FAIL_STRICT_SWEEP_GATE"
            candidate["failure"] = {
                "reason": str(error),
                "details": details,
            }
            search_receipts.append(candidate)
            continue
        candidate["status"] = "PASS_SAFE_CANDIDATE"
        search_receipts.append(candidate)
        safe_candidates.append((abs(angle), angle, target_points, candidate))

    line_search_receipt = {
        "method": "ASCENDING_RIGIFY_CONTROL_AMPLITUDE_WITH_EXACT_LINEAR_MORPH_SWEEP",
        "rigifySelectedBaseAngleRadians": base_angle,
        "rigifySelectedBaseAngleDegrees": math.degrees(base_angle),
        "weights": [0.0, 0.25, 0.50, 0.75, 1.00],
        "neutral": {
            "centralGapMeters": neutral_gap,
            "collision": neutral_collision,
        },
        "candidates": search_receipts,
    }
    write_json(evidence / "jaw-angle-line-search-receipt.json", line_search_receipt)
    if not safe_candidates:
        raise SurgicalGateError(
            "Surgical jaw has no collision-free Rigify-derived angle with >=2 mm opening",
            {
                "gate": "surgical-jaw-angle-and-linear-sweep",
                "lineSearch": line_search_receipt,
            },
        )
    _absolute_angle, selected_angle, selected_targets, selected_search = min(
        safe_candidates, key=lambda item: item[0]
    )

    direct.bake_shape_key(head, armature, "jawOpen", selected_targets["head"])
    for owner in ("lowerTeeth", "tongue"):
        obj = accessories[owner]
        obj.shape_key_add(name="Basis", from_mix=False)
        direct.bake_shape_key(obj, armature, "jawOpen", selected_targets[owner])
    if direct.mesh_basis_signature(head) != head_basis:
        raise RuntimeError("Blink/jaw bake changed the surgical neutral Basis")
    expected_head_keys = ["Basis", "eyeBlinkLeft", "eyeBlinkRight", "jawOpen"]
    if list(head.data.shape_keys.key_blocks.keys()) != expected_head_keys:
        raise RuntimeError(
            f"Surgical facial shape-key order changed: "
            f"{list(head.data.shape_keys.key_blocks.keys())}"
        )
    for owner in ("lowerTeeth", "tongue"):
        observed = list(accessories[owner].data.shape_keys.key_blocks.keys())
        if observed != ["Basis", "jawOpen"]:
            raise RuntimeError(f"{owner} shape-key order changed: {observed}")
    if accessories["upperTeeth"].data.shape_keys is not None:
        raise RuntimeError("Stationary upper teeth unexpectedly received a shape key")

    # Lock the exact candidate Basis immediately before serialization.  The
    # oral-neutral milestone is already one GLB round-trip removed from the
    # original rebuild, so comparing a second export to the older object-space
    # reference accumulates exporter float32 quantization.  This fresh-import
    # gate instead proves exact semantic equivalence to the actual artifact
    # submitted to the exporter, while `head_basis` above independently proves
    # that adding the morphs did not alter the accepted oral-neutral Basis.
    candidate_neutral = direct.head_local_points(head, armature)
    candidate_key_points = {
        key: candidate_neutral[raw_indices[0]].copy()
        for key, raw_indices in context["rawForKey"].items()
    }
    candidate_match_points = {
        key: head.data.vertices[raw_indices[0]].co.copy()
        for key, raw_indices in context["rawForKey"].items()
    }
    candidate_semantic, candidate_semantic_payload = semantic_mesh_signature(
        direct,
        head,
        armature,
        locked_key_points=candidate_key_points,
        locked_match_points=candidate_match_points,
    )
    preexport_runtime_bone_count = len(armature.data.bones)
    preexport_bone_names = sorted(bone.name for bone in armature.data.bones)

    output_glb = evidence / "human-foundation-surgical-mouth-facial-proof.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=False,
        export_animations=False,
        export_all_influences=True,
        export_normals=True,
        export_skins=True,
        export_texcoords=True,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
    )
    output_hash = file_sha256(output_glb)
    serialized = glb_json_document(output_glb)
    serialized_node_names = [node.get("name") for node in serialized.get("nodes", [])]
    serialized_mesh_node_names = sorted(
        node["name"] for node in serialized.get("nodes", []) if "mesh" in node
    )
    expected_serialized_node_names = expected_runtime_object_names | set(
        preexport_bone_names
    )
    serialized_scene_receipt = {
        "nodeCount": len(serialized_node_names),
        "nodeNames": sorted(serialized_node_names),
        "meshNodeNames": serialized_mesh_node_names,
        "meshCount": len(serialized.get("meshes", [])),
        "skinCount": len(serialized.get("skins", [])),
        "cameraCount": len(serialized.get("cameras", [])),
        "lightExtensionPresent": "KHR_lights_punctual"
        in serialized.get("extensions", {}),
    }
    if (
        len(serialized_node_names) != len(set(serialized_node_names))
        or set(serialized_node_names) != expected_serialized_node_names
        or serialized_mesh_node_names
        != sorted(
            {
                direct.BODY_OBJECT,
                direct.HEAD_OBJECT,
                *accessory_names.values(),
            }
        )
        or serialized_scene_receipt["meshCount"] != 5
        or serialized_scene_receipt["skinCount"] != 1
        or serialized_scene_receipt["cameraCount"] != 0
        or serialized_scene_receipt["lightExtensionPresent"]
    ):
        raise SurgicalGateError(
            "Serialized facial-proof GLB contains a nonruntime scene object",
            {
                "gate": "facial-proof-serialized-runtime-only-node-set",
                "expectedNodeNames": sorted(expected_serialized_node_names),
                "observed": serialized_scene_receipt,
            },
        )

    # Fresh-import the actual GLB and repeat every structural morph gate against
    # the serialized float32 artifact that the runtime will consume.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    fresh_head = bpy.data.objects.get(direct.HEAD_OBJECT)
    fresh_armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    fresh_accessories = {
        owner: bpy.data.objects.get(name) for owner, name in accessory_names.items()
    }
    fresh_object_names = set(bpy.data.objects.keys())
    fresh_importer_only_objects = sorted(
        [
            {
                "name": obj.name,
                "type": obj.type,
                "vertexCount": len(obj.data.vertices) if obj.type == "MESH" else None,
                "parent": obj.parent.name if obj.parent is not None else None,
            }
            for obj in bpy.data.objects
            if obj.name not in expected_runtime_object_names
        ],
        key=lambda record: (record["type"], record["name"]),
    )
    if (
        fresh_head is None
        or len(fresh_armatures) != 1
        or any(obj is None for obj in fresh_accessories.values())
        or len(fresh_armatures[0].data.bones) != EXPECTED_RUNTIME_BONES
        or not expected_runtime_object_names <= fresh_object_names
        or fresh_importer_only_objects
        != [
            {
                "name": "Icosphere",
                "type": "MESH",
                "vertexCount": 42,
                "parent": None,
            }
        ]
    ):
        raise RuntimeError("Fresh facial-proof GLB changed objects or 65-bone armature")
    fresh_armature = fresh_armatures[0]
    fresh_shape_names = (
        list(fresh_head.data.shape_keys.key_blocks.keys())
        if fresh_head.data.shape_keys is not None
        else []
    )
    if fresh_shape_names != expected_head_keys:
        raise RuntimeError(f"Fresh GLB head morph order changed: {fresh_shape_names}")
    for owner in ("lowerTeeth", "tongue"):
        shape_names = (
            list(fresh_accessories[owner].data.shape_keys.key_blocks.keys())
            if fresh_accessories[owner].data.shape_keys is not None
            else []
        )
        if shape_names != ["Basis", "jawOpen"]:
            raise RuntimeError(f"Fresh GLB {owner} morph order changed: {shape_names}")

    fresh_neutral = direct.head_local_points(fresh_head, fresh_armature)
    (
        fresh_raw_keys,
        fresh_raw_for_key,
        fresh_key_points,
        _fresh_adjacency,
        _fresh_faces,
        fresh_mapping_receipt,
    ) = topology_with_locked_reference(
        direct,
        fresh_head,
        fresh_neutral,
        locked_key_points=candidate_key_points,
        locked_match_points=candidate_match_points,
    )
    fresh_semantic, fresh_semantic_payload = semantic_mesh_signature(
        direct,
        fresh_head,
        fresh_armature,
        locked_key_points=candidate_key_points,
        locked_match_points=candidate_match_points,
    )
    fresh_semantic_equivalence = semantic_equivalence_gate(
        candidate_semantic_payload,
        fresh_semantic_payload,
        fresh_semantic["logicalMapping"],
    )
    if not fresh_semantic_equivalence["pass"]:
        raise SurgicalGateError(
            "Fresh facial-proof GLB changed the exact preexport semantic Basis",
            {
                "gate": "facial-proof-clean-glb-reimport-semantic-equivalence",
                "preexportSemantic": candidate_semantic,
                "freshSemantic": fresh_semantic,
                "equivalence": fresh_semantic_equivalence,
            },
        )
    fresh_polygons = [tuple(polygon.vertices) for polygon in fresh_head.data.polygons]
    fresh_precision = direct.exact_intersection_precision(fresh_neutral)
    fresh_baseline_overlaps = direct.nonadjacent_self_overlaps(
        fresh_neutral, fresh_polygons, fresh_raw_keys, fresh_precision
    )
    fresh_seam = set(context["seam"])
    fresh_support = set(context["support"])
    fresh_mapped_eyes = context["mappedEyes"]
    if not (
        fresh_seam <= set(fresh_raw_for_key)
        and fresh_support <= set(fresh_raw_for_key)
    ):
        raise RuntimeError("Fresh GLB lost locked seam or jaw-support logical keys")
    fresh_context = {
        **context,
        "neutral": fresh_neutral,
        "rawKeys": fresh_raw_keys,
        "rawForKey": fresh_raw_for_key,
        "keyPoints": fresh_key_points,
        "polygons": fresh_polygons,
        "support": fresh_support,
        "seam": fresh_seam,
        "centralUpper": list(context["centralUpper"]),
        "centralLower": list(context["centralLower"]),
        "mappedEyes": fresh_mapped_eyes,
    }
    fresh_accessory_neutral = {
        owner: direct.head_local_points(obj, fresh_armature)
        for owner, obj in fresh_accessories.items()
    }
    fresh_sweeps = {"blink": {}, "jawOpen": {}}
    for target_name, side in (
        ("eyeBlinkLeft", "left"),
        ("eyeBlinkRight", "right"),
    ):
        full = shape_key_head_local_points(
            direct, fresh_head, fresh_armature, target_name
        )
        side_region = fresh_mapped_eyes[side]
        allowed = side_region["region"]
        fresh_sweeps["blink"][target_name] = {}
        for weight in (0.25, 0.50, 0.75, 1.00):
            points = interpolate(fresh_neutral, full, weight)
            fresh_sweeps["blink"][target_name][f"{weight:.2f}"] = {
                "gates": direct.deformation_gate(
                    f"{target_name}-fresh-import-{weight:.2f}",
                    fresh_neutral,
                    points,
                    fresh_polygons,
                    fresh_raw_keys,
                    fresh_raw_for_key,
                    allowed,
                    fresh_seam,
                    fresh_baseline_overlaps,
                    fresh_precision,
                ),
                "aperture": direct.blink_gap_metrics(
                    fresh_neutral,
                    points,
                    side_region,
                    fresh_raw_for_key,
                    fresh_key_points,
                ),
            }

    fresh_head_jaw = shape_key_head_local_points(
        direct, fresh_head, fresh_armature, "jawOpen"
    )
    fresh_oral_jaw = {
        "upperTeeth": [point.copy() for point in fresh_accessory_neutral["upperTeeth"]],
        "lowerTeeth": shape_key_head_local_points(
            direct,
            fresh_accessories["lowerTeeth"],
            fresh_armature,
            "jawOpen",
        ),
        "tongue": shape_key_head_local_points(
            direct, fresh_accessories["tongue"], fresh_armature, "jawOpen"
        ),
    }
    fresh_neutral_collision = combined_oral_collision_gate(
        direct,
        fresh_head,
        fresh_armature,
        [(owner, obj) for owner, obj in fresh_accessories.items()],
        oral_self_baseline,
    )
    fresh_neutral_gap = central_mouth_gap(fresh_neutral, fresh_context)
    for weight in (0.25, 0.50, 0.75, 1.00):
        head_points = interpolate(fresh_neutral, fresh_head_jaw, weight)
        oral_points = {
            owner: interpolate(
                fresh_accessory_neutral[owner], fresh_oral_jaw[owner], weight
            )
            for owner in fresh_accessories
        }
        fresh_sweeps["jawOpen"][f"{weight:.2f}"] = {
            "gates": direct.deformation_gate(
                f"jawOpen-fresh-import-{weight:.2f}",
                fresh_neutral,
                head_points,
                fresh_polygons,
                fresh_raw_keys,
                fresh_raw_for_key,
                fresh_support,
                fresh_seam,
                fresh_baseline_overlaps,
                fresh_precision,
            ),
            "collision": combined_oral_collision_gate(
                direct,
                fresh_head,
                fresh_armature,
                [(owner, obj) for owner, obj in fresh_accessories.items()],
                oral_self_baseline,
                {"head": head_points, **oral_points},
            ),
            "centralOpeningIncreaseMeters": (
                central_mouth_gap(head_points, fresh_context) - fresh_neutral_gap
            ),
        }
    if fresh_sweeps["jawOpen"]["1.00"]["centralOpeningIncreaseMeters"] < 0.002:
        raise RuntimeError("Fresh GLB jawOpen lost the required two millimetre opening")

    report = {
        "schema": "souldrifter.surgical-mouth-jaw-blink-proof.v1",
        "issue": ISSUE,
        "status": "PASS_STRUCTURAL_BLINK_JAW_FRESH_REIMPORT_NOT_RENDERED_NOT_PROMOTED",
        "source": {
            "path": source.as_posix(),
            "sha256": direct.SOURCE_SHA256,
            "approvedSourceBasis": direct.EXPECTED_BASIS_SHA256,
        },
        "surgicalNeutralMilestone": {
            "receipt": neutral_receipt_path.as_posix(),
            "receiptSha256": file_sha256(neutral_receipt_path),
        },
        "oralNeutralMilestone": {
            "glb": oral_glb.as_posix(),
            "sha256": oral_receipt["quarantinedGlb"]["sha256"],
            "receipt": oral_receipt_path.as_posix(),
            "receiptSha256": file_sha256(oral_receipt_path),
        },
        "authoring": authoring_receipt,
        "harmonicJawInfluence": influence_receipt,
        "blink": blink_receipts,
        "jawAngleSearch": line_search_receipt,
        "selectedJaw": selected_search,
        "preexport": {
            "headBasis": head_basis,
            "semanticMesh": candidate_semantic,
            "runtimeObjectNames": sorted(expected_runtime_object_names),
            "strippedNonruntimeObjects": stripped_nonruntime_objects,
            "serializedScene": serialized_scene_receipt,
            "headShapeKeys": expected_head_keys,
            "lowerTeethShapeKeys": ["Basis", "jawOpen"],
            "tongueShapeKeys": ["Basis", "jawOpen"],
            "upperTeethPolicy": "STATIONARY_NO_JAW_MORPH",
            "runtimeBoneCount": preexport_runtime_bone_count,
        },
        "quarantinedGlb": {"path": output_glb.as_posix(), "sha256": output_hash},
        "freshReimport": {
            "runtimeBoneCount": len(fresh_armature.data.bones),
            "blenderImporterOnlyObjectsNotSerializedInGlb": fresh_importer_only_objects,
            "headShapeKeys": fresh_shape_names,
            "logicalReferenceMapping": fresh_mapping_receipt,
            "semanticMesh": fresh_semantic,
            "semanticEquivalence": fresh_semantic_equivalence,
            "neutralCollision": fresh_neutral_collision,
            "sweeps": fresh_sweeps,
        },
        "promotion": "BLOCKED_PENDING_MULTI_ANGLE_ANIMATED_VISUAL_AND_AGE_MORPH_PROOF",
    }
    report["receipt"] = write_json(evidence / "jaw-blink-proof-receipt.json", report)
    print("SURGICAL_MOUTH_JAW_BLINK_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def png_evidence_receipt(path: Path) -> dict[str, object]:
    payload = path.read_bytes()
    if len(payload) < 24 or payload[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"Render did not produce a valid PNG: {path}")
    width, height = struct.unpack(">II", payload[16:24])
    if width < 512 or height < 512 or len(payload) < 10_000:
        raise RuntimeError(
            f"Render evidence is undersized or blank-looking: {path}/{width}x{height}/{len(payload)}"
        )
    return {
        "path": path.as_posix(),
        "sha256": sha256(payload).hexdigest().upper(),
        "bytes": len(payload),
        "width": width,
        "height": height,
    }


def video_evidence_receipt(path: Path, expected_frames: int) -> dict[str, object]:
    ffprobe = shutil.which("ffprobe")
    ffmpeg = shutil.which("ffmpeg")
    if ffprobe is None or ffmpeg is None:
        raise RuntimeError("Cached/local ffmpeg and ffprobe are required for facial demo proof")
    probe = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-count_frames",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(probe.stdout)
    stream = payload["streams"][0]
    frame_count = int(stream["nb_read_frames"])
    if frame_count != expected_frames:
        raise RuntimeError(
            f"Facial demo frame count changed: {path}/{frame_count}/{expected_frames}"
        )
    decode = subprocess.run(
        [ffmpeg, "-v", "error", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    if decode.returncode != 0:
        raise RuntimeError(f"Facial demo decode failed: {path}/{decode.stderr}")
    numerator, denominator = (
        int(value) for value in stream["avg_frame_rate"].split("/")
    )
    return {
        "path": path.as_posix(),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
        "codec": stream["codec_name"],
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "frames": frame_count,
        "fps": numerator / denominator,
        "durationSeconds": float(payload["format"]["duration"]),
        "fullDecodePassed": True,
    }


def build_render_proof(args: argparse.Namespace) -> dict[str, object]:
    """Render the exact quarantined head through its approved bounded morph cycle."""

    direct = load_direct_builder()
    evidence = Path(args.evidence_dir).resolve()
    structural_receipt_path = evidence / "jaw-blink-proof-receipt.json"
    candidate = evidence / "human-foundation-surgical-mouth-facial-proof.glb"
    if not structural_receipt_path.is_file() or not candidate.is_file():
        raise RuntimeError("Passed structural facial candidate is missing")
    structural = json.loads(structural_receipt_path.read_text(encoding="utf-8"))
    if (
        structural.get("status")
        != "PASS_STRUCTURAL_BLINK_JAW_FRESH_REIMPORT_NOT_RENDERED_NOT_PROMOTED"
        or structural["quarantinedGlb"]["sha256"] != file_sha256(candidate)
    ):
        raise RuntimeError("Structural facial candidate receipt/hash changed")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(candidate))
    head = bpy.data.objects.get(direct.HEAD_OBJECT)
    body = bpy.data.objects.get(direct.BODY_OBJECT)
    accessory_names = {
        "upperTeeth": "HumanFoundation_UpperTeeth",
        "lowerTeeth": "HumanFoundation_LowerTeeth",
        "tongue": "HumanFoundation_Tongue",
    }
    accessories = {
        owner: bpy.data.objects.get(name) for owner, name in accessory_names.items()
    }
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if (
        head is None
        or body is None
        or len(armatures) != 1
        or any(obj is None for obj in accessories.values())
        or len(armatures[0].data.bones) != EXPECTED_RUNTIME_BONES
    ):
        raise RuntimeError("Render proof import changed required facial objects")
    armature = armatures[0]
    required = {
        armature.name,
        head.name,
        body.name,
        *(obj.name for obj in accessories.values()),
    }
    importer_only = sorted(
        obj.name for obj in bpy.data.objects if obj.name not in required
    )
    if importer_only != ["Icosphere"]:
        raise RuntimeError(f"Unexpected render import helpers: {importer_only}")
    for obj in list(bpy.data.objects):
        if obj.name not in required:
            bpy.data.objects.remove(obj, do_unlink=True)

    expected_head_keys = ["Basis", "eyeBlinkLeft", "eyeBlinkRight", "jawOpen"]
    if (
        head.data.shape_keys is None
        or list(head.data.shape_keys.key_blocks.keys()) != expected_head_keys
    ):
        raise RuntimeError("Render proof head morph contract changed")
    for owner in ("lowerTeeth", "tongue"):
        shape_keys = accessories[owner].data.shape_keys
        if shape_keys is None or list(shape_keys.key_blocks.keys()) != [
            "Basis",
            "jawOpen",
        ]:
            raise RuntimeError(f"Render proof {owner} morph contract changed")

    material_policy = []
    object_colors = {
        body.name: (0.43, 0.44, 0.45, 1.0),
        head.name: (0.58, 0.59, 0.60, 1.0),
        accessories["upperTeeth"].name: (0.84, 0.84, 0.82, 1.0),
        accessories["lowerTeeth"].name: (0.84, 0.84, 0.82, 1.0),
        accessories["tongue"].name: (0.37, 0.38, 0.40, 1.0),
    }
    for obj in (body, head, *accessories.values()):
        for slot_index, material in enumerate(obj.data.materials):
            if material is None:
                continue
            color = object_colors[obj.name]
            if "MouthBag" in material.name:
                color = (0.10, 0.11, 0.12, 1.0)
            material.diffuse_color = color
            material.roughness = 0.82
            material.metallic = 0.0
            material_policy.append(
                {
                    "object": obj.name,
                    "slot": slot_index,
                    "material": material.name,
                    "displayColor": list(color),
                    "roughness": 0.82,
                    "metallic": 0.0,
                }
            )

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    # The approved Tripo identity depends on its embedded 4K albedo. Render
    # that source texture under matte Workbench lighting for the user-facing
    # proof; topology-only clay evidence is a separate diagnostic and must not
    # be mistaken for the approved visual identity.
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.07, 0.085, 0.105)
    scene.display.shading.show_shadows = True
    # Cavity shading exaggerated the source Smart Mesh's low-poly triangle
    # structure into dark radial wedges around the lips. The visual gate must
    # judge the actual smooth-shaded surface, so use matte studio light without
    # the non-production cavity overlay.
    scene.display.shading.show_cavity = False
    scene.display.shading.show_specular_highlight = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.film_transparent = False
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.fps = 24
    scene.render.fps_base = 1
    scene.frame_start = 1
    scene.frame_end = 96

    camera_data = bpy.data.cameras.new("HumanFacialProofCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 0.205
    camera_data.clip_start = 0.01
    camera_data.clip_end = 10.0
    camera = bpy.data.objects.new("HumanFacialProofCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    world_points = [head.matrix_world @ vertex.co for vertex in head.data.vertices]
    minimum = Vector(tuple(min(point[axis] for point in world_points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in world_points) for axis in range(3)))
    target = (minimum + maximum) * 0.5
    target.z -= 0.004
    # Derive anatomical camera directions from the exact runtime head bone.
    # Head-local axes are locked by the direct builder: X is the character's
    # left, Y is vertical, and Z is facial forward. World-axis guesses had
    # mislabeled a profile as front and the rear as a profile.
    head_world = (
        armature.matrix_world
        @ armature.data.bones[direct.HEAD_BONE].matrix_local
    )
    head_orientation = head_world.to_3x3()
    lateral = (head_orientation @ Vector((1.0, 0.0, 0.0))).normalized()
    vertical = (head_orientation @ Vector((0.0, 1.0, 0.0))).normalized()
    forward = (head_orientation @ Vector((0.0, 0.0, 1.0))).normalized()
    views = {
        "front": target + forward * 0.60,
        "three-quarter-left": target + forward * 0.48 + lateral * 0.36,
        "three-quarter-right": target + forward * 0.48 - lateral * 0.36,
        "profile-left": target + lateral * 0.60,
        "profile-right": target - lateral * 0.60,
    }

    def place_camera(view_name: str) -> None:
        camera.location = views[view_name]
        camera.rotation_euler = (target - camera.location).to_track_quat(
            "-Z", "Y"
        ).to_euler()

    head_keys = head.data.shape_keys.key_blocks

    def key_head(target_name: str, keys: dict[int, float]) -> None:
        block = head_keys[target_name]
        for frame, value in sorted(keys.items()):
            block.value = value
            block.keyframe_insert(data_path="value", frame=frame)

    key_head("eyeBlinkLeft", {1: 0.0, 5: 0.0, 8: 1.0, 11: 0.0, 96: 0.0})
    key_head("eyeBlinkRight", {1: 0.0, 17: 0.0, 20: 1.0, 23: 0.0, 96: 0.0})
    jaw_keys = {
        1: 0.0,
        30: 0.0,
        38: 0.35,
        46: 0.80,
        54: 0.20,
        62: 1.0,
        70: 0.25,
        78: 0.70,
        88: 0.0,
        96: 0.0,
    }
    key_head("jawOpen", jaw_keys)
    for owner in ("lowerTeeth", "tongue"):
        block = accessories[owner].data.shape_keys.key_blocks["jawOpen"]
        for frame, value in jaw_keys.items():
            block.value = value
            block.keyframe_insert(data_path="value", frame=frame)

    stills_dir = evidence / "facial-demo-stills"
    stills_dir.mkdir(parents=True, exist_ok=True)
    all_views = tuple(views)
    both_three_quarters = ("three-quarter-left", "three-quarter-right")
    still_specs = [
        ("neutral", 1, all_views),
        ("blink-left", 8, ("front",)),
        ("blink-right", 20, ("front",)),
        ("jaw-partial", 38, ("front", *both_three_quarters)),
        ("jaw-full", 62, all_views),
        ("reopen-neutral", 88, ("front", *both_three_quarters)),
    ]
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    still_receipts = []
    for state, frame, view_names in still_specs:
        scene.frame_set(frame)
        for view_name in view_names:
            place_camera(view_name)
            path = stills_dir / f"{state}-{view_name}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            receipt = png_evidence_receipt(path)
            receipt.update({"state": state, "frame": frame, "view": view_name})
            still_receipts.append(receipt)

    frames_dir = evidence / "facial-demo-sequence"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    place_camera("front")
    scene.render.filepath = str(frames_dir / "frame-")
    bpy.ops.render.render(animation=True)
    frames = sorted(frames_dir.glob("frame-*.png"))
    expected_frame_count = scene.frame_end - scene.frame_start + 1
    if len(frames) != expected_frame_count:
        raise RuntimeError(
            f"Facial demo render wrote {len(frames)}/{expected_frame_count} frames"
        )
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is required to encode facial proof videos")
    mp4 = evidence / "human-foundation-facial-proof-demo.mp4"
    webm = evidence / "human-foundation-facial-proof-demo.webm"
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-framerate",
            "24",
            "-start_number",
            "1",
            "-i",
            str(frames_dir / "frame-%04d.png"),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(mp4),
        ],
        check=True,
    )
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-framerate",
            "24",
            "-start_number",
            "1",
            "-i",
            str(frames_dir / "frame-%04d.png"),
            "-c:v",
            "libvpx-vp9",
            "-deadline",
            "good",
            "-cpu-used",
            "4",
            "-crf",
            "30",
            "-b:v",
            "0",
            "-pix_fmt",
            "yuv420p",
            str(webm),
        ],
        check=True,
    )
    videos = {
        "mp4": video_evidence_receipt(mp4, expected_frame_count),
        "webm": video_evidence_receipt(webm, expected_frame_count),
    }
    shutil.rmtree(frames_dir)

    report = {
        "schema": "souldrifter.surgical-mouth-visual-proof.v1",
        "issue": ISSUE,
        "status": "RENDER_COMPLETE_AWAITING_SELF_AND_HUMAN_REVIEW_NOT_PROMOTED",
        "candidate": {
            "path": candidate.as_posix(),
            "sha256": file_sha256(candidate),
            "structuralReceipt": structural_receipt_path.as_posix(),
            "structuralReceiptSha256": file_sha256(structural_receipt_path),
        },
        "exactHeadObject": direct.HEAD_OBJECT,
        "morphSequence": {
            "fps": 24,
            "frameStart": 1,
            "frameEnd": 96,
            "eyeBlinkLeft": {"peakFrame": 8},
            "eyeBlinkRight": {"peakFrame": 20},
            "jawOpenTalkingCycle": jaw_keys,
            "headMotionPolicy": "STABLE_HEAD_NO_NODDING_OR_GUESSED_POSE_MOTION",
        },
        "renderPolicy": {
            "mode": "EMBEDDED_SOURCE_4K_ALBEDO_MATTE_WORKBENCH",
            "engine": "BLENDER_WORKBENCH",
            "studioLight": "paint.sl",
            "specularHighlights": False,
            "skinRoughness": 0.82,
            "materials": material_policy,
            "background": list(scene.display.shading.background_color),
            "cameraTargetWorld": list(target),
            "cameraOrthoScale": camera_data.ortho_scale,
            "cameraBasisWorld": {
                "anatomicalLeft": list(lateral),
                "vertical": list(vertical),
                "facialForward": list(forward),
                "derivation": (
                    "RUNTIME_HEAD_BONE_MATRIX_TIMES_LOCKED_HEAD_LOCAL_X_Y_Z_AXES"
                ),
            },
            "views": {key: list(value) for key, value in views.items()},
        },
        "stills": still_receipts,
        "videos": videos,
        "promotion": "BLOCKED_PENDING_HUMAN_VISUAL_REVIEW_AND_AGE_MORPH_PROOF",
    }
    report["receipt"] = write_json(evidence / "visual-proof-receipt.json", report)
    print("SURGICAL_MOUTH_VISUAL_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def build_neutral_proof(args: argparse.Namespace) -> dict[str, object]:
    direct = load_direct_builder()
    source = Path(args.source_glb).resolve()
    evidence = Path(args.evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    head, _body, armature = direct.import_locked_source(source)
    source_basis = direct.mesh_basis_signature(head)
    neutral = direct.head_local_points(head, armature)
    raw_keys, raw_for_key, key_points, adjacency, faces = direct.logical_topology(
        head, neutral
    )
    regions = direct.exact_regions(raw_for_key, key_points, adjacency, faces)
    exterior = regions["surfaceComponents"][0]
    exterior_faces = {face for face in faces if set(face) <= exterior}
    lip_support = (regions["mouthUpper"] | regions["mouthLower"]) & exterior
    _selected, patch, _distance, selection_receipt = deterministic_surgical_patch(
        exterior, exterior_faces, lip_support, adjacency
    )
    metrics = patch_metrics(patch)
    if (
        metrics["boundaryCycleCount"] != 1
        or metrics["boundaryCycleLengths"] != [87]
        or metrics["invalidBoundaryDegrees"]
    ):
        raise RuntimeError(f"Locked minimal cut boundary changed before build: {metrics}")
    boundary = metrics["boundaryCycles"][0]
    patch_edge_use: Counter[tuple] = Counter(
        edge_key(first, second)
        for face in patch
        for offset, first in enumerate(face)
        for second in face[offset + 1 :]
    )
    kept_faces = exterior_faces - patch
    kept_edge_use: Counter[tuple] = Counter(
        edge_key(first, second)
        for face in kept_faces
        for offset, first in enumerate(face)
        for second in face[offset + 1 :]
    )
    unsafe_cut_edges = [
        {
            "logicalEdge": [list(key) for key in edge],
            "removedUseCount": patch_edge_use[edge],
            "keptUseCount": kept_edge_use[edge],
        }
        for edge in sorted(
            edge
            for edge, count in patch_edge_use.items()
            if count == 1
        )
        if patch_edge_use[edge] != 1 or kept_edge_use[edge] != 1
    ]
    if unsafe_cut_edges:
        raise SurgicalGateError(
            "Minimal cut boundary is not a one-removed/one-kept interface",
            {
                "gate": "minimal-cut-edge-global-two-manifold-interface",
                "unsafeEdges": unsafe_cut_edges[:50],
            },
        )
    source_kept_keys = set().union(*(exterior_faces - patch))
    source_hashes = {
        "unchangedNonmouthCoordinateSha256": coordinate_hash(source_kept_keys),
        "unchangedNonmouthFloat32PointSha256": float32_point_hash(
            source_kept_keys, key_points
        ),
        "neckSeamCoordinateSha256": coordinate_hash(regions["seam"]),
        "neckSeamFloat32PointSha256": float32_point_hash(
            regions["seam"], key_points
        ),
        "l0AttachmentCoordinateSha256": coordinate_hash(set(boundary)),
        "l0AttachmentFloat32PointSha256": float32_point_hash(
            set(boundary), key_points
        ),
    }
    build = rebuild_head_mesh(
        direct,
        head,
        armature,
        neutral,
        raw_keys,
        raw_for_key,
        key_points,
        regions,
        exterior_faces,
        patch,
        boundary,
    )
    neutral_gate = neutral_mesh_gate(
        direct, head, armature, key_points, regions, boundary, build
    )
    for field, expected_hash in source_hashes.items():
        if neutral_gate[field] != expected_hash:
            raise RuntimeError(
                f"Neutral proof hash mismatch for {field}: {neutral_gate[field]} != {expected_hash}"
            )
    preexport_basis = direct.mesh_basis_signature(head)
    if preexport_basis["sha256"] == source_basis["sha256"]:
        raise RuntimeError("Surgical retopology did not establish a fresh Basis signature")
    preexport_points = direct.head_local_points(head, armature)
    (
        _preexport_raw_keys,
        preexport_raw_for_key,
        preexport_key_points,
        _preexport_adjacency,
        _preexport_faces,
    ) = direct.logical_topology(head, preexport_points)
    preexport_object_key_points = {
        key: head.data.vertices[raw_indices[0]].co.copy()
        for key, raw_indices in preexport_raw_for_key.items()
    }
    preexport_semantic, preexport_semantic_payload = semantic_mesh_signature(
        direct, head, armature
    )
    if preexport_semantic["maximumSkinInfluenceCount"] > 4:
        raise SurgicalGateError(
            "Neutral retopology exceeds the locked four-influence runtime skin contract",
            {
                "gate": "preexport-maximum-four-skin-influences",
                "semanticSignature": preexport_semantic,
            },
        )
    output_glb = evidence / "human-foundation-surgical-mouth-neutral-proof.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=False,
        export_animations=False,
        export_all_influences=True,
        export_normals=True,
        export_skins=True,
        export_texcoords=True,
    )
    output_hash = file_sha256(output_glb)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    reimported_head = bpy.data.objects.get(direct.HEAD_OBJECT)
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if reimported_head is None or len(armatures) != 1:
        raise RuntimeError(
            f"Fresh neutral GLB reimport changed objects: head={reimported_head}, armatures={armatures}"
        )
    reimported_armature = armatures[0]
    if len(reimported_armature.data.bones) != EXPECTED_RUNTIME_BONES:
        raise RuntimeError(
            f"Fresh neutral GLB reimport changed bone count: {len(reimported_armature.data.bones)}"
        )
    postimport_basis = direct.mesh_basis_signature(reimported_head)
    postimport_semantic, postimport_semantic_payload = semantic_mesh_signature(
        direct,
        reimported_head,
        reimported_armature,
        locked_key_points=preexport_key_points,
        locked_match_points=preexport_object_key_points,
    )
    semantic_equivalence = semantic_equivalence_gate(
        preexport_semantic_payload,
        postimport_semantic_payload,
        postimport_semantic["logicalMapping"],
    )
    if not semantic_equivalence["pass"]:
        raise SurgicalGateError(
            "Fresh neutral GLB reimport changed the rebuilt semantic mesh",
            {
                "gate": "clean-glb-reimport-semantic-mesh-equivalence",
                "rawBasisExpectedToDifferBecauseOfAttributeSplits": True,
                "preexportRawBasis": preexport_basis,
                "postimportRawBasis": postimport_basis,
                "preexportSemantic": preexport_semantic,
                "postimportSemantic": postimport_semantic,
                "equivalenceGate": semantic_equivalence,
            },
        )
    reimport_gate = neutral_mesh_gate(
        direct,
        reimported_head,
        reimported_armature,
        key_points,
        regions,
        boundary,
        build,
        allow_attribute_splits=True,
        locked_key_points=preexport_key_points,
        locked_match_points=preexport_object_key_points,
    )
    report = {
        "schema": "souldrifter.surgical-mouth-neutral-proof.v1",
        "issue": ISSUE,
        "status": "PASS_NEUTRAL_RETOPOLOGY_FRESH_REIMPORT_JAW_NOT_YET_PROVEN_NOT_PROMOTED",
        "source": {
            "path": source.as_posix(),
            "sha256": direct.SOURCE_SHA256,
            "basis": source_basis,
        },
        "cut": {
            "selection": selection_receipt,
            "removedExteriorFaces": len(patch),
            "l0Cardinality": len(boundary),
            "removedPatchContainsRejectedSourceNonmanifoldEdges": True,
            "cutBoundaryUnsafeEdgeCount": 0,
        },
        "build": {
            "derivedMeasurements": build["derivedMeasurements"],
            "surfaceCollar": build["surfaceCollar"],
            "loopCardinalities": [len(ring) for ring in build["rings"]],
            "weightDuplicateParityMaximum": build["weightDuplicateParityMaximum"],
            "runtimeSkinWeightCanonicalization": build[
                "runtimeSkinWeightCanonicalization"
            ],
            "materialPolicy": (
                "preserve-imported-source-PBR-on-visible-L0-through-projected-"
                "surface-collar-and-L2; neutral-matte-rough-mouth-material-on-"
                "hidden-bag"
            ),
            "projection": {
                name: {
                    "sampleCount": len(samples),
                    "maximumQueryDistanceMeters": max(
                        sample["queryDistanceMeters"] for sample in samples
                    ),
                    "sourcePolygonIndicesSha256": sha256(
                        json.dumps(
                            [sample["sourcePolygonIndex"] for sample in samples],
                            separators=(",", ":"),
                        ).encode("utf-8")
                    ).hexdigest().upper(),
                }
                for name, samples in build["ringProjections"].items()
            },
        },
        "sourceHashes": source_hashes,
        "preexportBasis": preexport_basis,
        "preexportSemanticMesh": preexport_semantic,
        "neutralGates": neutral_gate,
        "quarantinedGlb": {
            "path": output_glb.as_posix(),
            "sha256": output_hash,
        },
        "freshReimport": {
            "rawBasis": postimport_basis,
            "semanticMesh": postimport_semantic,
            "semanticEquivalence": semantic_equivalence,
            "runtimeBoneCount": len(reimported_armature.data.bones),
            "gates": reimport_gate,
        },
        "teethTongueStatus": "NOT_ADDED_IN_NEUTRAL_MILESTONE",
        "promotion": "BLOCKED_PENDING_CC0_TEETH_TONGUE_JAW_SWEEP_AND_VISUAL_PROOF",
    }
    report["receipt"] = write_json(
        evidence / "neutral-retopology-receipt.json", report
    )
    print("SURGICAL_MOUTH_NEUTRAL_PROOF=" + json.dumps(report, sort_keys=True))
    return report


def topology_audit(args: argparse.Namespace) -> dict[str, object]:
    direct = load_direct_builder()
    source = Path(args.source_glb).resolve()
    evidence = Path(args.evidence_dir).resolve()
    head, _body, armature = direct.import_locked_source(source)
    neutral = direct.head_local_points(head, armature)
    raw_keys, raw_for_key, key_points, adjacency, faces = direct.logical_topology(
        head, neutral
    )
    regions = direct.exact_regions(raw_for_key, key_points, adjacency, faces)
    exterior = regions["surfaceComponents"][0]
    exterior_faces = {face for face in faces if set(face) <= exterior}
    lip_support = (regions["mouthUpper"] | regions["mouthLower"]) & exterior
    selected_vertices, patch, distance, selection_receipt = deterministic_surgical_patch(
        exterior, exterior_faces, lip_support, adjacency
    )
    metrics = patch_metrics(patch)
    patch_vertices = set().union(*patch)
    selected_raw = {index for key in selected_vertices for index in raw_for_key[key]}
    patch_raw = {index for key in patch_vertices for index in raw_for_key[key]}
    metrics.update(
        {
            "selectionLogicalCount": len(selected_vertices),
            "selectionRawCount": len(selected_raw),
            "incidentPatchLogicalCount": len(patch_vertices),
            "incidentPatchRawCount": len(patch_raw),
            "containsEveryExteriorLipSupport": lip_support <= selected_vertices,
            "lipSupportTouchesCutBoundary": bool(
                lip_support
                & set().union(*metrics["boundaryCycles"])
                if metrics["boundaryCycles"]
                else False
            ),
            "touchesNeckSeam": bool(patch_vertices & regions["seam"]),
            "touchesEyeRegion": bool(
                patch_vertices
                & (
                    regions["eyes"]["left"]["region"]
                    | regions["eyes"]["right"]["region"]
                )
            ),
        }
    )
    expected = {
        "selectionLogicalCount": 308,
        "selectionRawCount": 582,
        "incidentPatchLogicalCount": 396,
        "incidentPatchRawCount": 752,
        "faceCount": 717,
        "boundaryCycleCount": 1,
        "boundaryCycleLengths": [87],
    }
    actual = {key: metrics[key] for key in expected}
    if (
        actual != expected
        or not metrics["isTriangulatedDisk"]
        or not metrics["containsEveryExteriorLipSupport"]
        or metrics["lipSupportTouchesCutBoundary"]
        or metrics["touchesNeckSeam"]
        or metrics["touchesEyeRegion"]
    ):
        raise SurgicalGateError(
            "Locked minimal surgical patch changed",
            {
                "gate": "surgical-mouth-disk-selection",
                "expected": expected,
                "actual": actual,
                "metrics": metrics,
            },
        )
    boundary = metrics["boundaryCycles"][0]
    aperture_guides = set().union(*regions["mouthChainsOrdered"])
    projection_guides = {}
    for name, keys in (
        ("outerLipSupport", lip_support),
        ("sourceApertureChains", aperture_guides),
        ("cutBoundary", set(boundary)),
    ):
        projection_guides[name] = {
            "logicalCount": len(keys),
            "minimum": [
                min(float(key_points[key][axis]) for key in keys) for axis in range(3)
            ],
            "maximum": [
                max(float(key_points[key][axis]) for key in keys) for axis in range(3)
            ],
            "mean": [
                sum(float(key_points[key][axis]) for key in keys) / len(keys)
                for axis in range(3)
            ],
        }
    report = {
        "schema": "souldrifter.surgical-mouth-topology-audit.v1",
        "issue": ISSUE,
        "status": "PASS_DETERMINISTIC_SURGICAL_CUT_SELECTED_NOT_BUILT_NOT_PROMOTED",
        "source": {
            "path": source.as_posix(),
            "sha256": direct.SOURCE_SHA256,
            "exactBasis": direct.mesh_basis_signature(head),
        },
        "lockedRuntimeArmature": {
            "boneCount": len(armature.data.bones),
            "expectedBoneCount": EXPECTED_RUNTIME_BONES,
        },
        "sourceTopology": {
            "surfaceComponentSizes": [
                len(component) for component in regions["surfaceComponents"]
            ],
            "detachedOralSheetCount": 2,
            "exteriorLipSupportLogicalCount": len(lip_support),
        },
        "selectedCut": {
            "construction": (
                "exterior logical geodesic distance <=2 from all 162 lip supports, "
                "completed by the deterministic minimum five-vertex distance-three "
                "interface neighborhood; delete every exterior triangle incident "
                "to that selection. This is the audited minimum valid 87-edge cut."
            ),
            "selectionReceipt": selection_receipt,
            "maximumSelectedGeodesicDistance": max(
                distance[key] for key in selected_vertices
            ),
            "metrics": {key: value for key, value in metrics.items() if key != "boundaryCycles"},
            "orderedBoundaryLogicalCoordinates": [list(key) for key in boundary],
            "removedExteriorFaceLogicalCoordinates": [
                [list(key) for key in face] for face in sorted(patch)
            ],
        },
        "neutralProjectionGuides": projection_guides,
        "cc0OralAssets": cc0_source_receipt(),
        "promotion": "BLOCKED_PENDING_SURGICAL_BUILD_STRICT_SWEPT_GATES_REIMPORT_AND_VISUAL_PROOF",
    }
    report["receipt"] = write_json(evidence / "topology-audit-receipt.json", report)
    print("SURGICAL_MOUTH_TOPOLOGY_AUDIT=" + json.dumps(report, sort_keys=True))
    return report


def main() -> None:
    args = parse_args()
    try:
        if args.stage == "topology-audit":
            topology_audit(args)
        elif args.stage == "build-proof":
            build_neutral_proof(args)
        elif args.stage == "oral-proof":
            build_oral_neutral_proof(args)
        elif args.stage == "jaw-proof":
            build_jaw_blink_proof(args)
        elif args.stage == "render-proof":
            build_render_proof(args)
        else:
            raise RuntimeError(f"Unsupported stage: {args.stage}")
    except Exception as error:
        evidence = Path(args.evidence_dir).resolve()
        evidence.mkdir(parents=True, exist_ok=True)
        failure = {
            "schema": "souldrifter.surgical-mouth-failure.v1",
            "issue": ISSUE,
            "status": "FAIL_CLOSED_NO_CANDIDATE_PROMOTED",
            "stage": args.stage,
            "reason": str(error),
            "details": getattr(error, "details", None),
            "promotion": "BLOCKED_NO_CANONICAL_ASSET_OVERWRITTEN",
        }
        failure["receipt"] = write_json(
            evidence / "surgical-mouth-failure-receipt.json", failure
        )
        print("SURGICAL_MOUTH_FAILURE=" + json.dumps(failure, sort_keys=True))
        raise


if __name__ == "__main__":
    main()
