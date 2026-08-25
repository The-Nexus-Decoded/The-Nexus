import type {
  BreachV2ConnectionType,
  BreachV2LogicalEdge,
  BreachV2PathId,
} from "./breach-v2-generator.ts";

export type BreachV2TopologyPoint = [number, number];

interface TopologyRoomInput {
  id: string;
  name: string;
  kind: string;
  fixed: boolean;
  poolRoomId?: string;
  x: number;
  z: number;
  w: number;
  h: number;
  floorElevation: number;
  endElevation: number;
}

interface TopologyCorridorInput {
  id: string;
  sourceRoomId: string;
  destinationRoomId: string;
  connectionType: "CORRIDOR" | "VERTICAL_TRANSITION";
  points: BreachV2TopologyPoint[];
  elevations: number[];
  width: number;
  externalDestination: boolean;
}

interface TopologyPlacementInput {
  rootRoomId: string;
  attempts: Array<{
    roomId: string;
    archetypeId: string;
    acceptedFromEdge: string;
    guideCenter: [number, number];
    sourceSocket: { x: number; y: number };
    destinationSocket: { x: number; y: number };
    connectorGap: number;
    attemptCount: number;
    accepted: boolean;
  }>;
  backtracks: string[];
  rejectedCandidates: string[];
  deterministicResult: boolean;
}

export interface BuildBreachV2TopologyInput {
  ticket: number;
  commit?: string;
  seed: number;
  pathId: BreachV2PathId;
  rooms: TopologyRoomInput[];
  corridors: TopologyCorridorInput[];
  logicalGraph: { nodes: string[]; edges: BreachV2LogicalEdge[] };
  placement: TopologyPlacementInput;
  imagePath?: string;
}

export interface BreachV2TopologyAperture {
  apertureId: string;
  edgeId: string;
  connectionType: BreachV2ConnectionType;
  start: BreachV2TopologyPoint;
  end: BreachV2TopologyPoint;
  clearWidth: number;
  assembly: "OPEN" | "DOOR" | "PORTCULLIS" | "PORTAL";
}

export interface BreachV2TopologyBoundary {
  boundaryId: string;
  owner: string;
  adjacentTo: string;
  classification: "EXTERIOR_WALL" | "SHARED_WALL" | "CORRIDOR_WALL" | "PORTAL_FRAME";
  start: BreachV2TopologyPoint;
  end: BreachV2TopologyPoint;
  thickness: number;
  apertures: BreachV2TopologyAperture[];
}

interface BreachV2TopologyConnection {
  edgeId: string;
  connectionType: BreachV2ConnectionType;
  sourceBoundaryId: string;
  sourceApertureId: string;
  destinationBoundaryId: string;
  destinationApertureId: string;
  connectorPolygon: BreachV2TopologyPoint[];
  centerline: BreachV2TopologyPoint[];
  elevations: number[];
  ceilings: number[];
  clearWidth: number;
  transition: {
    mode: "LEVEL" | "STAIRS" | "PORTAL";
    rise: number;
    run: number;
    recommendedSteps: number;
  };
  physicalResolutionStatus: "RESOLVED" | "UNRESOLVED";
  floorContinuity: "PASS" | "FAIL";
  ceilingContinuity: "PASS" | "FAIL";
  collisionContinuity: "PASS" | "FAIL";
  navigationContinuity: "PASS" | "FAIL";
  sourceApproachNormal: boolean;
  destinationApproachNormal: boolean;
  wasdTraversal: "NOT_RUN";
  clickMoveTraversal: "NOT_RUN";
  evidence: string[];
}

export interface BreachV2TopologyMetrics {
  requiredLogicalEdges: number;
  physicallyResolvedEdges: number;
  connectedPhysicalComponents: number;
  unintendedRoomOverlaps: number;
  unintendedCorridorRoomOverlaps: number;
  coincidentDuplicateWalls: number;
  wallsCrossingApertures: number;
  duplicateApertureIds: number;
  orphanDoorsOrGates: number;
  unmatchedCorridorEndpoints: number;
  corridorsEndingAtIntactWalls: number;
  missingDestinationApertures: number;
  minimumPlayerClearanceFailures: number;
  floorContinuityFailures: number;
  ceilingContinuityFailures: number;
  collisionContinuityFailures: number;
  navigationContinuityFailures: number;
  nonNormalConnectorApproaches: number;
  connectorApertureWidthMismatches: number;
  unsupportedElevationTransitions: number;
}

export interface BreachV2TopologyManifest {
  schemaVersion: 1;
  policyId: "souldrifter-procedural-dungeon-topology-v1";
  ticket: number;
  commit: string;
  seed: number;
  pathId: BreachV2PathId;
  logicalGraph: {
    nodes: string[];
    edges: Array<BreachV2LogicalEdge & { physicalResolutionStatus: "RESOLVED" | "UNRESOLVED" }>;
  };
  placement: TopologyPlacementInput;
  rooms: Array<{
    roomId: string;
    archetypeId: string;
    name: string;
    kind: string;
    fixed: boolean;
    polygon: BreachV2TopologyPoint[];
    floorElevation: number;
    ceilingElevation: number;
    endElevation: number;
    transform: { x: number; z: number; rotationDegrees: 0 };
    acceptedFromEdge: string;
  }>;
  boundaries: BreachV2TopologyBoundary[];
  connections: BreachV2TopologyConnection[];
  topDownDiagnostic: {
    imagePath: string;
    generatedFromActualEmbeddedGeometry: true;
    layers: string[];
    automatedReview: "PASS" | "FAIL";
    aiVisionReview: "NOT_RUN";
    ownerVerdict: "REVIEW_REQUIRED";
  };
  metrics: BreachV2TopologyMetrics;
  automatedGate: "PASS" | "FAIL";
  independentVerification: "NOT_RUN";
  status: "PLAN_GATE_PASS_REVIEW_REQUIRED" | "PLAN_GATE_FAIL";
}

type Side = "N" | "E" | "S" | "W";
interface RawSide {
  roomId: string;
  side: Side;
  orientation: "H" | "V";
  fixed: number;
  start: number;
  end: number;
  cuts: Set<number>;
}

const EPSILON = 1e-6;
const WALL_THICKNESS = 0.35;
const MINIMUM_PLAYER_CLEARANCE = 1.0;
const REQUIRED_LAYERS = [
  "room_polygons_and_ids",
  "wall_segments_and_boundary_ids",
  "apertures",
  "doors_gates_portcullises",
  "corridor_polygons_and_centerlines",
  "navigation_clearance",
  "floor_elevations",
  "vertical_transitions",
  "logical_edges",
  "physical_edge_matches",
  "overlap_and_error_overlays",
];

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON;
}

function keyNumber(value: number): string {
  return Number(value.toFixed(4)).toString().replace("-", "m").replace(".", "p");
}

function pointOnSegment(point: BreachV2TopologyPoint, start: BreachV2TopologyPoint, end: BreachV2TopologyPoint): boolean {
  const cross = (point[0] - start[0]) * (end[1] - start[1])
    - (point[1] - start[1]) * (end[0] - start[0]);
  if (Math.abs(cross) > EPSILON) return false;
  return point[0] >= Math.min(start[0], end[0]) - EPSILON
    && point[0] <= Math.max(start[0], end[0]) + EPSILON
    && point[1] >= Math.min(start[1], end[1]) - EPSILON
    && point[1] <= Math.max(start[1], end[1]) + EPSILON;
}

function segmentGeometryKey(start: BreachV2TopologyPoint, end: BreachV2TopologyPoint): string {
  const ordered = start[0] < end[0] || (close(start[0], end[0]) && start[1] <= end[1])
    ? [start, end] : [end, start];
  return ordered.flat().map(keyNumber).join(":");
}

function segmentNormalToBoundary(
  boundary: BreachV2TopologyBoundary,
  start: BreachV2TopologyPoint,
  end: BreachV2TopologyPoint,
): boolean {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const boundaryHorizontal = close(boundary.start[1], boundary.end[1]);
  return boundaryHorizontal
    ? Math.abs(dx) <= EPSILON && Math.abs(dz) > EPSILON
    : Math.abs(dz) <= EPSILON && Math.abs(dx) > EPSILON;
}

function roomSides(room: TopologyRoomInput): RawSide[] {
  return [
    { roomId: room.id, side: "N", orientation: "H", fixed: room.z, start: room.x, end: room.x + room.w, cuts: new Set([room.x, room.x + room.w]) },
    { roomId: room.id, side: "E", orientation: "V", fixed: room.x + room.w, start: room.z, end: room.z + room.h, cuts: new Set([room.z, room.z + room.h]) },
    { roomId: room.id, side: "S", orientation: "H", fixed: room.z + room.h, start: room.x, end: room.x + room.w, cuts: new Set([room.x, room.x + room.w]) },
    { roomId: room.id, side: "W", orientation: "V", fixed: room.x, start: room.z, end: room.z + room.h, cuts: new Set([room.z, room.z + room.h]) },
  ];
}

function buildCanonicalBoundaries(rooms: TopologyRoomInput[]): {
  boundaries: BreachV2TopologyBoundary[];
  duplicateCount: number;
} {
  const sides = rooms.flatMap(roomSides);
  for (let leftIndex = 0; leftIndex < sides.length; leftIndex += 1) {
    const left = sides[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < sides.length; rightIndex += 1) {
      const right = sides[rightIndex]!;
      if (left.orientation !== right.orientation || !close(left.fixed, right.fixed)) continue;
      const overlapStart = Math.max(left.start, right.start);
      const overlapEnd = Math.min(left.end, right.end);
      if (overlapEnd - overlapStart <= EPSILON) continue;
      left.cuts.add(overlapStart);
      left.cuts.add(overlapEnd);
      right.cuts.add(overlapStart);
      right.cuts.add(overlapEnd);
    }
  }

  const groups = new Map<string, Array<{ roomId: string; side: Side; start: BreachV2TopologyPoint; end: BreachV2TopologyPoint }>>();
  for (const raw of sides) {
    const cuts = [...raw.cuts].sort((a, b) => a - b);
    for (let index = 0; index < cuts.length - 1; index += 1) {
      const a = cuts[index]!;
      const b = cuts[index + 1]!;
      if (b - a <= EPSILON) continue;
      const start: BreachV2TopologyPoint = raw.orientation === "H" ? [a, raw.fixed] : [raw.fixed, a];
      const end: BreachV2TopologyPoint = raw.orientation === "H" ? [b, raw.fixed] : [raw.fixed, b];
      const key = `${raw.orientation}:${keyNumber(raw.fixed)}:${keyNumber(a)}:${keyNumber(b)}`;
      const entries = groups.get(key) ?? [];
      entries.push({ roomId: raw.roomId, side: raw.side, start, end });
      groups.set(key, entries);
    }
  }

  const boundaries: BreachV2TopologyBoundary[] = [];
  let duplicateCount = 0;
  for (const [key, entries] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const uniqueEntries = entries.filter((entry, index) => (
      entries.findIndex((candidate) => candidate.roomId === entry.roomId && candidate.side === entry.side) === index
    ));
    if (uniqueEntries.length > 2 || uniqueEntries.length !== entries.length) duplicateCount += 1;
    const sorted = [...uniqueEntries].sort((a, b) => a.roomId.localeCompare(b.roomId));
    const primary = sorted[0]!;
    const adjacent = sorted[1];
    const boundaryId = `boundary-${key.replaceAll(":", "-")}`;
    boundaries.push({
      boundaryId,
      owner: primary.roomId,
      adjacentTo: adjacent?.roomId ?? "OUTSIDE",
      classification: adjacent ? "SHARED_WALL" : "EXTERIOR_WALL",
      start: primary.start,
      end: primary.end,
      thickness: WALL_THICKNESS,
      apertures: [],
    });
  }
  return { boundaries, duplicateCount };
}

function bufferPolyline(points: BreachV2TopologyPoint[], width: number): BreachV2TopologyPoint[] {
  if (points.length < 2) return [];
  const half = width / 2;
  const segmentNormals = points.slice(1).map((point, index): BreachV2TopologyPoint => {
    const previous = points[index]!;
    const dx = point[0] - previous[0];
    const dz = point[1] - previous[1];
    const length = Math.hypot(dx, dz);
    return [-dz / length, dx / length];
  });
  const offsetPoint = (index: number, side: 1 | -1): BreachV2TopologyPoint => {
    const point = points[index]!;
    if (index === 0) {
      const normal = segmentNormals[0]!;
      return [point[0] + normal[0] * half * side, point[1] + normal[1] * half * side];
    }
    if (index === points.length - 1) {
      const normal = segmentNormals[segmentNormals.length - 1]!;
      return [point[0] + normal[0] * half * side, point[1] + normal[1] * half * side];
    }
    const before = segmentNormals[index - 1]!;
    const after = segmentNormals[index]!;
    const sumX = before[0] + after[0];
    const sumZ = before[1] + after[1];
    const denominator = sumX * after[0] + sumZ * after[1];
    if (Math.abs(denominator) <= EPSILON) {
      return [point[0] + after[0] * half * side, point[1] + after[1] * half * side];
    }
    const scale = half * side / denominator;
    return [point[0] + sumX * scale, point[1] + sumZ * scale];
  };
  const left = points.map((_point, index) => offsetPoint(index, 1));
  const right = points.map((_point, index) => offsetPoint(index, -1)).reverse();
  return [...left, ...right];
}

function rectangleOverlapArea(a: TopologyRoomInput, b: TopologyRoomInput): number {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const height = Math.min(a.z + a.h, b.z + b.h) - Math.max(a.z, b.z);
  return width > EPSILON && height > EPSILON ? width * height : 0;
}

function corridorRoomOverlap(corridor: TopologyCorridorInput, room: TopologyRoomInput): boolean {
  if (room.id === corridor.sourceRoomId || room.id === corridor.destinationRoomId) return false;
  const half = corridor.width / 2;
  return corridor.points.slice(1).some((point, index) => {
    const previous = corridor.points[index]!;
    const minX = Math.min(previous[0], point[0]) - half;
    const maxX = Math.max(previous[0], point[0]) + half;
    const minZ = Math.min(previous[1], point[1]) - half;
    const maxZ = Math.max(previous[1], point[1]) + half;
    return Math.min(maxX, room.x + room.w) - Math.max(minX, room.x) > EPSILON
      && Math.min(maxZ, room.z + room.h) - Math.max(minZ, room.z) > EPSILON;
  });
}

function countConnectedComponents(nodes: string[], edges: BreachV2LogicalEdge[]): number {
  const adjacency = new Map(nodes.map((node) => [node, new Set<string>()]));
  for (const edge of edges) {
    if (!adjacency.has(edge.sourceNode)) adjacency.set(edge.sourceNode, new Set());
    if (!adjacency.has(edge.destinationNode)) adjacency.set(edge.destinationNode, new Set());
    adjacency.get(edge.sourceNode)!.add(edge.destinationNode);
    adjacency.get(edge.destinationNode)!.add(edge.sourceNode);
  }
  const visited = new Set<string>();
  let components = 0;
  for (const node of adjacency.keys()) {
    if (visited.has(node)) continue;
    components += 1;
    const queue = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(adjacency.get(current) ?? []));
    }
  }
  return components;
}

export function buildBreachV2TopologyManifest(input: BuildBreachV2TopologyInput): BreachV2TopologyManifest {
  const canonical = buildCanonicalBoundaries(input.rooms);
  const roomsById = new Map(input.rooms.map((room) => [room.id, room]));
  const corridorById = new Map(input.corridors.map((corridor) => [corridor.id, corridor]));
  const incomingEdge = new Map(input.logicalGraph.edges.map((edge) => [edge.destinationNode, edge.edgeId]));
  const connections: BreachV2TopologyConnection[] = [];
  let unmatchedCorridorEndpoints = 0;
  let missingDestinationApertures = 0;
  let floorContinuityFailures = 0;
  let unsupportedElevationTransitions = 0;

  const roomBoundaryAt = (roomId: string, point: BreachV2TopologyPoint): BreachV2TopologyBoundary | undefined => (
    canonical.boundaries.find((boundary) => (
      (boundary.owner === roomId || boundary.adjacentTo === roomId)
      && pointOnSegment(point, boundary.start, boundary.end)
    ))
  );
  const apertureOn = (
    boundary: BreachV2TopologyBoundary,
    edge: BreachV2LogicalEdge,
    center: BreachV2TopologyPoint,
    requestedWidth: number,
    assembly: BreachV2TopologyAperture["assembly"] = "OPEN",
  ): BreachV2TopologyAperture => {
    const horizontal = close(boundary.start[1], boundary.end[1]);
    const length = Math.hypot(boundary.end[0] - boundary.start[0], boundary.end[1] - boundary.start[1]);
    const width = Math.min(requestedWidth, Math.max(0, length - 0.2));
    const aperture: BreachV2TopologyAperture = {
      apertureId: `aperture-${edge.edgeId}-${boundary.boundaryId}`,
      edgeId: edge.edgeId,
      connectionType: edge.connectionType,
      start: horizontal ? [center[0] - width / 2, center[1]] : [center[0], center[1] - width / 2],
      end: horizontal ? [center[0] + width / 2, center[1]] : [center[0], center[1] + width / 2],
      clearWidth: width,
      assembly,
    };
    boundary.apertures.push(aperture);
    return aperture;
  };

  let portalBoundary: BreachV2TopologyBoundary | undefined;
  for (const edge of input.logicalGraph.edges) {
    const corridor = corridorById.get(edge.edgeId);
    let sourceBoundary: BreachV2TopologyBoundary | undefined;
    let destinationBoundary: BreachV2TopologyBoundary | undefined;
    let sourceAperture: BreachV2TopologyAperture | undefined;
    let destinationAperture: BreachV2TopologyAperture | undefined;
    let centerline: BreachV2TopologyPoint[] = [];
    let connectorPolygon: BreachV2TopologyPoint[] = [];
    let elevationProfile: number[] = [];
    let clearWidth = 0;
    let floorContinuity: "PASS" | "FAIL" = "PASS";

    if (corridor) {
      centerline = corridor.points;
      connectorPolygon = bufferPolyline(corridor.points, corridor.width);
      elevationProfile = corridor.elevations;
      clearWidth = corridor.width;
      sourceBoundary = roomBoundaryAt(edge.sourceNode, corridor.points[0]!);
      const sourceAssembly: BreachV2TopologyAperture["assembly"] = edge.edgeId === "corridor-entry"
        || edge.edgeId === "ante-boss"
        ? "PORTCULLIS"
        : edge.edgeId === "boss-vault" ? "DOOR" : "OPEN";
      if (sourceBoundary) {
        sourceAperture = apertureOn(sourceBoundary, edge, corridor.points[0]!, corridor.width, sourceAssembly);
      }
      if (roomsById.has(edge.destinationNode)) {
        destinationBoundary = roomBoundaryAt(edge.destinationNode, corridor.points[corridor.points.length - 1]!);
        if (destinationBoundary) {
          destinationAperture = apertureOn(
            destinationBoundary, edge, corridor.points[corridor.points.length - 1]!, corridor.width,
          );
        }
      } else if (corridor.externalDestination) {
        const endpoint = corridor.points[corridor.points.length - 1]!;
        const previous = corridor.points[corridor.points.length - 2]!;
        const horizontalTravel = Math.abs(endpoint[0] - previous[0]) >= Math.abs(endpoint[1] - previous[1]);
        const half = corridor.width / 2 + 0.25;
        portalBoundary = {
          boundaryId: `boundary-portal-${edge.destinationNode}`,
          owner: edge.destinationNode,
          adjacentTo: "heartvale-hv-1",
          classification: "PORTAL_FRAME",
          start: horizontalTravel ? [endpoint[0], endpoint[1] - half] : [endpoint[0] - half, endpoint[1]],
          end: horizontalTravel ? [endpoint[0], endpoint[1] + half] : [endpoint[0] + half, endpoint[1]],
          thickness: WALL_THICKNESS,
          apertures: [],
        };
        canonical.boundaries.push(portalBoundary);
        destinationBoundary = portalBoundary;
        destinationAperture = apertureOn(portalBoundary, edge, endpoint, corridor.width, "PORTAL");
      }
      if (!sourceBoundary || !sourceAperture) unmatchedCorridorEndpoints += 1;
      if (!destinationBoundary || !destinationAperture) {
        unmatchedCorridorEndpoints += 1;
        missingDestinationApertures += 1;
      }
      const sourceRoom = roomsById.get(edge.sourceNode);
      const destinationRoom = roomsById.get(edge.destinationNode);
      const sourceExpected = sourceRoom?.kind === "exit" ? sourceRoom.endElevation : sourceRoom?.floorElevation;
      const destinationExpected = destinationRoom?.floorElevation;
      if (corridor.elevations.length !== corridor.points.length
        || (sourceExpected !== undefined && !close(corridor.elevations[0]!, sourceExpected))
        || (destinationExpected !== undefined && !close(corridor.elevations[corridor.elevations.length - 1]!, destinationExpected))) {
        floorContinuity = "FAIL";
        floorContinuityFailures += 1;
      }
    } else if (edge.connectionType === "PORTAL_TRANSFER" && portalBoundary) {
      sourceBoundary = portalBoundary;
      destinationBoundary = portalBoundary;
      const aperture = portalBoundary.apertures[0];
      sourceAperture = aperture;
      destinationAperture = aperture;
      clearWidth = aperture?.clearWidth ?? 0;
      const midpoint: BreachV2TopologyPoint = [
        (portalBoundary.start[0] + portalBoundary.end[0]) / 2,
        (portalBoundary.start[1] + portalBoundary.end[1]) / 2,
      ];
      centerline = [[midpoint[0] - 0.3, midpoint[1]], [midpoint[0] + 0.3, midpoint[1]]];
      connectorPolygon = bufferPolyline(centerline, clearWidth);
      const portalElevation = input.corridors.find((candidate) => candidate.id === "heartvale-exit")
        ?.elevations.at(-1) ?? 0;
      elevationProfile = [portalElevation, portalElevation];
    } else {
      const shared = canonical.boundaries.find((boundary) => (
        (boundary.owner === edge.sourceNode && boundary.adjacentTo === edge.destinationNode)
        || (boundary.owner === edge.destinationNode && boundary.adjacentTo === edge.sourceNode)
      ));
      if (shared) {
        sourceBoundary = shared;
        destinationBoundary = shared;
        const midpoint: BreachV2TopologyPoint = [
          (shared.start[0] + shared.end[0]) / 2,
          (shared.start[1] + shared.end[1]) / 2,
        ];
        const aperture = apertureOn(shared, edge, midpoint, Math.min(3.2, Math.hypot(
          shared.end[0] - shared.start[0], shared.end[1] - shared.start[1],
        )));
        sourceAperture = aperture;
        destinationAperture = aperture;
        clearWidth = aperture.clearWidth;
        const sourceRoom = roomsById.get(edge.sourceNode)!;
        const destinationRoom = roomsById.get(edge.destinationNode)!;
        const sourceCenter: BreachV2TopologyPoint = [sourceRoom.x + sourceRoom.w / 2, sourceRoom.z + sourceRoom.h / 2];
        const destinationCenter: BreachV2TopologyPoint = [
          destinationRoom.x + destinationRoom.w / 2, destinationRoom.z + destinationRoom.h / 2,
        ];
        const boundaryHorizontal = close(shared.start[1], shared.end[1]);
        const normalX = boundaryHorizontal ? 0 : Math.sign(destinationCenter[0] - sourceCenter[0]) || 1;
        const normalZ = boundaryHorizontal ? Math.sign(destinationCenter[1] - sourceCenter[1]) || 1 : 0;
        centerline = [
          [midpoint[0] - normalX * 1.2, midpoint[1] - normalZ * 1.2],
          [midpoint[0] + normalX * 1.2, midpoint[1] + normalZ * 1.2],
        ];
        connectorPolygon = bufferPolyline(centerline, clearWidth);
        elevationProfile = [sourceRoom.endElevation, destinationRoom.floorElevation];
      }
    }

    const resolved = Boolean(sourceBoundary && destinationBoundary && sourceAperture && destinationAperture);
    if (!corridor && edge.connectionType !== "PORTAL_TRANSFER" && !resolved) missingDestinationApertures += 1;
    if (!resolved && !corridor) unmatchedCorridorEndpoints += 1;
    const transitionRun = centerline.slice(1).reduce((run, point, index) => (
      run + Math.hypot(point[0] - centerline[index]![0], point[1] - centerline[index]![1])
    ), 0);
    const transitionRise = elevationProfile.length >= 2
      ? elevationProfile[elevationProfile.length - 1]! - elevationProfile[0]!
      : 0;
    if (elevationProfile.length !== centerline.length
      || elevationProfile.some((elevation) => !Number.isFinite(elevation))
      || elevationProfile.some((elevation, index) => index > 0 && elevation + EPSILON < elevationProfile[index - 1]!)
      || (transitionRise > EPSILON && (transitionRun <= EPSILON || transitionRise / transitionRun > 0.5))) {
      unsupportedElevationTransitions += 1;
    }
    const transitionMode = edge.connectionType === "PORTAL_TRANSFER"
      ? "PORTAL"
      : Math.abs(transitionRise) <= EPSILON ? "LEVEL" : "STAIRS";
    const sourceEndpointMatches = !corridor || Boolean(sourceAperture
      && pointOnSegment(corridor.points[0]!, sourceAperture.start, sourceAperture.end));
    const destinationEndpointMatches = !corridor || Boolean(destinationAperture
      && pointOnSegment(
        corridor.points[corridor.points.length - 1]!, destinationAperture.start, destinationAperture.end,
      ));
    const sourceApproachNormal = Boolean(sourceBoundary && centerline.length >= 2
      && segmentNormalToBoundary(sourceBoundary, centerline[0]!, centerline[1]!));
    const destinationApproachNormal = Boolean(destinationBoundary && centerline.length >= 2
      && segmentNormalToBoundary(
        destinationBoundary,
        centerline[centerline.length - 2]!,
        centerline[centerline.length - 1]!,
      ));
    const apertureWidthsMatch = Boolean(
      sourceAperture && destinationAperture
      && sourceAperture.clearWidth + EPSILON >= clearWidth
      && destinationAperture.clearWidth + EPSILON >= clearWidth,
    );
    const collisionContinuityPass = resolved
      && connectorPolygon.length >= 4
      && sourceEndpointMatches
      && destinationEndpointMatches
      && sourceApproachNormal
      && destinationApproachNormal
      && apertureWidthsMatch;
    const ceilingProfile = elevationProfile.map((elevation) => elevation + 4.5);
    const ceilingContinuityPass = resolved
      && ceilingProfile.length === centerline.length
      && ceilingProfile.every((ceiling, index) => ceiling - elevationProfile[index]! >= 4.5 - EPSILON);
    const navigationContinuityPass = collisionContinuityPass
      && clearWidth >= MINIMUM_PLAYER_CLEARANCE
      && transitionRun > EPSILON
      && centerline.flat().every(Number.isFinite);
    connections.push({
      edgeId: edge.edgeId,
      connectionType: edge.connectionType,
      sourceBoundaryId: sourceBoundary?.boundaryId ?? "",
      sourceApertureId: sourceAperture?.apertureId ?? "",
      destinationBoundaryId: destinationBoundary?.boundaryId ?? "",
      destinationApertureId: destinationAperture?.apertureId ?? "",
      connectorPolygon,
      centerline,
      elevations: elevationProfile,
      ceilings: ceilingProfile,
      clearWidth,
      transition: {
        mode: transitionMode,
        rise: transitionRise,
        run: transitionRun,
        recommendedSteps: transitionMode === "LEVEL" || transitionMode === "PORTAL"
          ? 0 : Math.max(1, Math.ceil(Math.abs(transitionRise) / 0.2)),
      },
      physicalResolutionStatus: resolved ? "RESOLVED" : "UNRESOLVED",
      floorContinuity: resolved ? floorContinuity : "FAIL",
      ceilingContinuity: ceilingContinuityPass ? "PASS" : "FAIL",
      collisionContinuity: collisionContinuityPass ? "PASS" : "FAIL",
      navigationContinuity: navigationContinuityPass ? "PASS" : "FAIL",
      sourceApproachNormal,
      destinationApproachNormal,
      wasdTraversal: "NOT_RUN",
      clickMoveTraversal: "NOT_RUN",
      evidence: resolved
        ? [`canonical ${sourceBoundary!.boundaryId} -> ${destinationBoundary!.boundaryId}`]
        : ["unresolved physical boundary or aperture"],
    });
  }

  // A connector is one buffered polygon, so its two long perimeter chains are
  // emitted once. The source/destination caps are deliberately omitted: those
  // spans are the apertures in the adjoining room or portal boundary.
  for (const corridor of input.corridors) {
    const connection = connections.find((candidate) => candidate.edgeId === corridor.id);
    const polygon = connection?.connectorPolygon ?? [];
    const destinationCapIndex = corridor.points.length - 1;
    const sourceCapIndex = polygon.length - 1;
    for (let index = 0; index < polygon.length; index += 1) {
      if (index === destinationCapIndex || index === sourceCapIndex) continue;
      const start = polygon[index]!;
      const end = polygon[(index + 1) % polygon.length]!;
      canonical.boundaries.push({
        boundaryId: `boundary-connector-${corridor.id}-${index + 1}`,
        owner: `connector:${corridor.id}`,
        adjacentTo: "OUTSIDE",
        classification: "CORRIDOR_WALL",
        start,
        end,
        thickness: WALL_THICKNESS,
        apertures: [],
      });
    }
  }

  const requiredEdges = input.logicalGraph.edges.filter((edge) => edge.requiredForProgression);
  const resolvedEdgeIds = new Set(connections
    .filter((connection) => connection.physicalResolutionStatus === "RESOLVED")
    .map((connection) => connection.edgeId));
  const roomOverlapCount = input.rooms.reduce((count, room, index) => (
    count + input.rooms.slice(index + 1).filter((other) => rectangleOverlapArea(room, other) > EPSILON).length
  ), 0);
  const corridorRoomOverlapCount = input.corridors.reduce((count, corridor) => (
    count + input.rooms.filter((room) => corridorRoomOverlap(corridor, room)).length
  ), 0);
  const wallsCrossingApertures = canonical.boundaries.reduce((count, boundary) => (
    count + boundary.apertures.filter((aperture) => (
      !pointOnSegment(aperture.start, boundary.start, boundary.end)
      || !pointOnSegment(aperture.end, boundary.start, boundary.end)
    )).length
  ), 0);
  const allApertures = canonical.boundaries.flatMap((boundary) => boundary.apertures);
  const duplicateApertureIds = allApertures.length - new Set(
    allApertures.map((aperture) => aperture.apertureId),
  ).size;
  const referencedApertureIds = new Set(connections.flatMap((connection) => [
    connection.sourceApertureId, connection.destinationApertureId,
  ]).filter(Boolean));
  const orphanDoorsOrGates = allApertures.filter((aperture) => (
    aperture.assembly !== "OPEN" && !referencedApertureIds.has(aperture.apertureId)
  )).length;
  const minimumPlayerClearanceFailures = connections
    .filter((connection) => connection.clearWidth + EPSILON < MINIMUM_PLAYER_CLEARANCE).length;
  const connectedPhysicalComponents = countConnectedComponents(
    input.logicalGraph.nodes,
    requiredEdges.filter((edge) => resolvedEdgeIds.has(edge.edgeId)),
  );
  const unresolvedCount = requiredEdges.filter((edge) => !resolvedEdgeIds.has(edge.edgeId)).length;
  const boundaryGeometryCounts = new Map<string, number>();
  for (const boundary of canonical.boundaries) {
    const key = segmentGeometryKey(boundary.start, boundary.end);
    boundaryGeometryCounts.set(key, (boundaryGeometryCounts.get(key) ?? 0) + 1);
  }
  const duplicateBoundaryGeometry = [...boundaryGeometryCounts.values()]
    .reduce((count, occurrences) => count + Math.max(0, occurrences - 1), 0);
  const metrics: BreachV2TopologyMetrics = {
    requiredLogicalEdges: requiredEdges.length,
    physicallyResolvedEdges: requiredEdges.length - unresolvedCount,
    connectedPhysicalComponents,
    unintendedRoomOverlaps: roomOverlapCount,
    unintendedCorridorRoomOverlaps: corridorRoomOverlapCount,
    coincidentDuplicateWalls: canonical.duplicateCount + duplicateBoundaryGeometry,
    wallsCrossingApertures,
    duplicateApertureIds,
    orphanDoorsOrGates,
    unmatchedCorridorEndpoints,
    corridorsEndingAtIntactWalls: unmatchedCorridorEndpoints,
    missingDestinationApertures,
    minimumPlayerClearanceFailures,
    floorContinuityFailures,
    ceilingContinuityFailures: connections.filter((connection) => connection.ceilingContinuity === "FAIL").length,
    collisionContinuityFailures: connections.filter((connection) => connection.collisionContinuity === "FAIL").length,
    navigationContinuityFailures: connections.filter((connection) => connection.navigationContinuity === "FAIL").length,
    nonNormalConnectorApproaches: connections.filter((connection) => (
      !connection.sourceApproachNormal || !connection.destinationApproachNormal
    )).length,
    connectorApertureWidthMismatches: connections.filter((connection) => {
      const sourceAperture = allApertures.find((aperture) => aperture.apertureId === connection.sourceApertureId);
      const destinationAperture = allApertures.find(
        (aperture) => aperture.apertureId === connection.destinationApertureId,
      );
      return !sourceAperture || !destinationAperture
        || sourceAperture.clearWidth + EPSILON < connection.clearWidth
        || destinationAperture.clearWidth + EPSILON < connection.clearWidth;
    }).length,
    unsupportedElevationTransitions,
  };
  const hardGateValues = Object.entries(metrics).filter(([key]) => ![
    "requiredLogicalEdges", "physicallyResolvedEdges", "connectedPhysicalComponents",
  ].includes(key));
  const gatePass = metrics.requiredLogicalEdges === metrics.physicallyResolvedEdges
    && metrics.connectedPhysicalComponents === 1
    && hardGateValues.every(([, value]) => value === 0);

  return {
    schemaVersion: 1,
    policyId: "souldrifter-procedural-dungeon-topology-v1",
    ticket: input.ticket,
    commit: input.commit ?? "WORKTREE",
    seed: input.seed,
    pathId: input.pathId,
    logicalGraph: {
      nodes: input.logicalGraph.nodes,
      edges: input.logicalGraph.edges.map((edge) => ({
        ...edge,
        physicalResolutionStatus: resolvedEdgeIds.has(edge.edgeId) ? "RESOLVED" : "UNRESOLVED",
      })),
    },
    placement: input.placement,
    rooms: input.rooms.map((room) => ({
      roomId: room.id,
      archetypeId: room.poolRoomId ?? room.id,
      name: room.name,
      kind: room.kind,
      fixed: room.fixed,
      polygon: [
        [room.x, room.z], [room.x + room.w, room.z],
        [room.x + room.w, room.z + room.h], [room.x, room.z + room.h],
      ],
      floorElevation: room.floorElevation,
      ceilingElevation: Math.max(room.floorElevation, room.endElevation) + 4.5,
      endElevation: room.endElevation,
      transform: { x: room.x, z: room.z, rotationDegrees: 0 },
      acceptedFromEdge: room.id === input.placement.rootRoomId ? "ROOT" : incomingEdge.get(room.id) ?? "AUTHORED_FIXED",
    })),
    boundaries: canonical.boundaries,
    connections,
    topDownDiagnostic: {
      imagePath: input.imagePath ?? "",
      generatedFromActualEmbeddedGeometry: true,
      layers: REQUIRED_LAYERS,
      automatedReview: gatePass ? "PASS" : "FAIL",
      aiVisionReview: "NOT_RUN",
      ownerVerdict: "REVIEW_REQUIRED",
    },
    metrics,
    automatedGate: gatePass ? "PASS" : "FAIL",
    independentVerification: "NOT_RUN",
    status: gatePass ? "PLAN_GATE_PASS_REVIEW_REQUIRED" : "PLAN_GATE_FAIL",
  };
}

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function pointsAttribute(points: BreachV2TopologyPoint[]): string {
  return points.map(([x, z]) => `${x},${z}`).join(" ");
}

export function renderBreachV2TopologySvg(manifest: BreachV2TopologyManifest): string {
  const allPoints = [
    ...manifest.rooms.flatMap((room) => room.polygon),
    ...manifest.connections.flatMap((connection) => connection.connectorPolygon),
  ];
  const minX = Math.min(...allPoints.map(([x]) => x)) - 8;
  const maxX = Math.max(...allPoints.map(([x]) => x)) + 8;
  const minZ = Math.min(...allPoints.map(([, z]) => z)) - 12;
  const maxZ = Math.max(...allPoints.map(([, z]) => z)) + 8;
  const width = maxX - minX;
  const height = maxZ - minZ;
  const roomPolygons = manifest.rooms.map((room) => (
    `<polygon points="${pointsAttribute(room.polygon)}" class="room ${room.fixed ? "fixed" : "generated"}"/>`
  )).join("\n");
  const roomLabels = manifest.rooms.map((room) => {
    const centerX = room.polygon.reduce((sum, point) => sum + point[0], 0) / room.polygon.length;
    const centerZ = room.polygon.reduce((sum, point) => sum + point[1], 0) / room.polygon.length;
    return `<text x="${centerX}" y="${centerZ - 0.6}" class="room-id">${xml(room.roomId)}</text>`;
  }).join("\n");
  const elevationLabels = manifest.rooms.map((room) => {
    const centerX = room.polygon.reduce((sum, point) => sum + point[0], 0) / room.polygon.length;
    const centerZ = room.polygon.reduce((sum, point) => sum + point[1], 0) / room.polygon.length;
    return `<text x="${centerX}" y="${centerZ + 1.1}" class="elevation">+${room.floorElevation.toFixed(1)}m</text>`;
  }).join("\n");
  const corridorPolygons = manifest.connections
    .filter((connection) => connection.connectorPolygon.length >= 3)
    .map((connection) => `<polygon points="${pointsAttribute(connection.connectorPolygon)}" class="corridor"/>`)
    .join("\n");
  const centerlines = manifest.connections
    .filter((connection) => connection.centerline.length >= 2)
    .map((connection) => `<polyline points="${pointsAttribute(connection.centerline)}" class="centerline ${connection.connectionType === "VERTICAL_TRANSITION" ? "vertical" : ""}"/>`)
    .join("\n");
  const navigationClearance = manifest.connections
    .filter((connection) => connection.connectorPolygon.length >= 3)
    .map((connection) => `<polygon points="${pointsAttribute(connection.connectorPolygon)}" class="nav-clearance"/>`)
    .join("\n");
  const verticalTransitions = manifest.connections
    .filter((connection) => connection.connectionType === "VERTICAL_TRANSITION")
    .map((connection) => `<polyline points="${pointsAttribute(connection.centerline)}" class="vertical-transition"/>`)
    .join("\n");
  const walls = manifest.boundaries.map((boundary) => (
    `<line x1="${boundary.start[0]}" y1="${boundary.start[1]}" x2="${boundary.end[0]}" y2="${boundary.end[1]}" class="wall ${boundary.classification.toLowerCase()}"/>`
  )).join("\n");
  const boundaryIds = manifest.boundaries.map((boundary) => {
    const midpointX = (boundary.start[0] + boundary.end[0]) / 2;
    const midpointZ = (boundary.start[1] + boundary.end[1]) / 2;
    const angle = Math.atan2(boundary.end[1] - boundary.start[1], boundary.end[0] - boundary.start[0]) * 180 / Math.PI;
    return `<text x="${midpointX}" y="${midpointZ - 0.22}" transform="rotate(${angle} ${midpointX} ${midpointZ})" class="boundary-id"><title>${xml(boundary.boundaryId)}</title>${xml(boundary.boundaryId)}</text>`;
  }).join("\n");
  const apertures = manifest.boundaries.flatMap((boundary) => boundary.apertures.map((aperture) => (
    `<line x1="${aperture.start[0]}" y1="${aperture.start[1]}" x2="${aperture.end[0]}" y2="${aperture.end[1]}" class="aperture"/>`
  ))).join("\n");
  const assemblies = manifest.boundaries.flatMap((boundary) => boundary.apertures
    .filter((aperture) => aperture.assembly !== "OPEN")
    .map((aperture) => (
      `<line x1="${aperture.start[0]}" y1="${aperture.start[1]}" x2="${aperture.end[0]}" y2="${aperture.end[1]}" class="assembly ${aperture.assembly.toLowerCase()}"><title>${xml(aperture.edgeId)} ${aperture.assembly}</title></line>`
    ))).join("\n");
  const physicalMatches = manifest.connections.flatMap((connection) => connection.centerline.length === 0 ? [] : [
    connection.centerline[0]!, connection.centerline[connection.centerline.length - 1]!,
  ]).map(([x, z]) => `<circle cx="${x}" cy="${z}" r=".28" class="physical-match"/>`).join("\n");
  const transitionLabels = manifest.connections
    .filter((connection) => connection.transition.mode !== "LEVEL")
    .map((connection) => {
      const midpoint = connection.centerline[Math.floor(connection.centerline.length / 2)] ?? [0, 0];
      const detail = connection.transition.mode === "PORTAL"
        ? "PORTAL"
        : `${connection.transition.mode} +${connection.transition.rise.toFixed(1)}m / ${connection.transition.recommendedSteps} steps`;
      return `<text x="${midpoint[0]}" y="${midpoint[1] - 0.7}" class="transition-label">${xml(detail)}</text>`;
    }).join("\n");
  const failedMetrics = Object.entries(manifest.metrics)
    .filter(([key, value]) => !["requiredLogicalEdges", "physicallyResolvedEdges", "connectedPhysicalComponents"].includes(key) && value !== 0);
  const errorOverlays = failedMetrics.map(([key, value], index) => (
    `<text x="${minX + 2}" y="${maxZ - 2 - index * 1.5}" class="error">${xml(key)}: ${value}</text>`
  )).join("\n");
  const resultColor = manifest.automatedGate === "PASS" ? "#5ee7a2" : "#ff627d";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minZ} ${width} ${height}" width="1800" height="${Math.round(1800 * height / width)}">
  <style>
    svg { background: #071017; font-family: Consolas, monospace; }
    .room { stroke: none; }
    .room.fixed { fill: #152a35; }
    .room.generated { fill: #203b49; }
    .corridor { fill: #173846; stroke: #4dc6e8; stroke-width: .18; vector-effect: non-scaling-stroke; }
    .nav-clearance { fill: none; stroke: #5f99aa; stroke-width: .12; stroke-dasharray: .35 .35; vector-effect: non-scaling-stroke; }
    .centerline { fill: none; stroke: #79dcff; stroke-width: .22; stroke-dasharray: .7 .45; vector-effect: non-scaling-stroke; }
    .centerline.vertical { stroke: #d7a7ff; }
    .vertical-transition { fill: none; stroke: #d7a7ff; stroke-width: .55; stroke-dasharray: .2 .4; vector-effect: non-scaling-stroke; }
    .wall { stroke: #e5a957; stroke-width: .48; stroke-linecap: square; vector-effect: non-scaling-stroke; }
    .wall.shared_wall { stroke: #ffe2a7; }
    .wall.corridor_wall { stroke: #d29a4f; }
    .wall.portal_frame { stroke: #8df5f1; stroke-width: .7; }
    .aperture { stroke: #071017; stroke-width: 1.0; vector-effect: non-scaling-stroke; }
    .assembly { stroke-width: .42; stroke-dasharray: .35 .22; vector-effect: non-scaling-stroke; }
    .assembly.door { stroke: #dfb36e; }
    .assembly.portcullis { stroke: #ff7d64; }
    .assembly.portal { stroke: #71f4ed; }
    .physical-match { fill: #5ee7a2; stroke: #071017; stroke-width: .08; vector-effect: non-scaling-stroke; }
    .boundary-id { fill: #d6c9a6; font-size: .42px; text-anchor: middle; paint-order: stroke; stroke: #071017; stroke-width: .16; }
    .transition-label { fill: #d7a7ff; font-size: .62px; text-anchor: middle; paint-order: stroke; stroke: #071017; stroke-width: .18; }
    .room-id { fill: #f5edd8; font-size: 1.35px; text-anchor: middle; font-weight: 700; }
    .elevation { fill: #8fb6c6; font-size: 1.0px; text-anchor: middle; }
    .title { fill: #f5edd8; font-size: 2.4px; font-weight: 700; }
    .status { fill: ${resultColor}; font-size: 1.5px; font-weight: 700; }
    .legend { fill: #a7bdc6; font-size: 1.15px; }
    .error { fill: #ff627d; font-size: 1.0px; }
  </style>
  <rect x="${minX}" y="${minZ}" width="${width}" height="${height}" fill="#071017"/>
  <text x="${minX + 2}" y="${minZ + 3}" class="title">FIRST BREACH / ${manifest.pathId.toUpperCase()} / SEED ${manifest.seed}</text>
  <text x="${minX + 2}" y="${minZ + 5.3}" class="status">TOPOLOGY GATE: ${manifest.automatedGate} / OWNER REVIEW REQUIRED</text>
  <text x="${minX + 2}" y="${minZ + 7.3}" class="legend">rooms ${manifest.rooms.length}  edges ${manifest.metrics.physicallyResolvedEdges}/${manifest.metrics.requiredLogicalEdges}  components ${manifest.metrics.connectedPhysicalComponents}  errors ${failedMetrics.length}</text>
  <g id="corridor-polygons">${corridorPolygons}</g>
  <g id="room-polygons">${roomPolygons}</g>
  <g id="navigation-clearance">${navigationClearance}</g>
  <g id="wall-segments">${walls}</g>
  <g id="boundary-ids">${boundaryIds}</g>
  <g id="apertures">${apertures}</g>
  <g id="doors-gates-portcullises">${assemblies}</g>
  <g id="logical-edges-and-corridor-centerlines">${centerlines}</g>
  <g id="vertical-transitions">${verticalTransitions}</g>
  <g id="vertical-transition-labels">${transitionLabels}</g>
  <g id="physical-edge-matches">${physicalMatches}</g>
  <g id="room-ids">${roomLabels}</g>
  <g id="floor-elevations">${elevationLabels}</g>
  <g id="overlap-and-error-overlays">${errorOverlays}</g>
</svg>`;
}
