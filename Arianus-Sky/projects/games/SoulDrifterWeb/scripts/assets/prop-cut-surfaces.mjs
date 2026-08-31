import { ShapeUtils, Vector2, Vector3 } from "three";
import { splitPolygon } from "../../src/game/geometry/clipPropPolygon.ts";

const position = (v) => v.attributes.position;
const key = (p) => p.map((n) => Math.round(n * 1e6)).join(",");
const distance2 = (a, b) => a.reduce((s, n, i) => s + (n - b[i]) ** 2, 0);

/** Follow a genuine section contour. Ambiguous branches fail closed instead of
 * silently bridging an unrelated surface. This does not move source vertices.
 */
function traceLoops(segments) {
  const points = new Map(), neighbors = new Map(), edges = new Set();
  for (const [a, b] of segments) {
    const ka = key(a), kb = key(b); if (ka === kb) continue;
    const edge = [ka, kb].sort().join("|"); if (edges.has(edge)) continue;
    edges.add(edge); points.set(ka, a); points.set(kb, b);
    for (const [k, other] of [[ka, kb], [kb, ka]]) {
      if (!neighbors.has(k)) neighbors.set(k, new Set()); neighbors.get(k).add(other);
    }
  }
  const bad = [...neighbors].filter(([, n]) => n.size !== 2);
  if (bad.length) throw new Error(`Ambiguous cut contour: ${bad.length} non-cycle vertices; ${bad.slice(0, 3).map(([k, n]) => `${k}(${n.size})`).join(";")}`);
  const remaining = new Set(points.keys()), loops = [];
  while (remaining.size) {
    const start = remaining.values().next().value, loop = []; let current = start, previous;
    do {
      if (!remaining.delete(current)) throw new Error("Cut contour intersects another cycle");
      loop.push(points.get(current));
      const next = [...neighbors.get(current)].find((candidate) => candidate !== previous);
      previous = current; current = next;
    } while (current !== start);
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Same UV-preserving split used by the runtime door, plus exact cut contours. */
export function sectionProp(polygons, plane) {
  if (![0, 1, 2].includes(plane.axis) || !Number.isFinite(plane.boundary) || typeof plane.keepGreater !== "boolean") throw new Error("Invalid cut plane");
  const inside = [], outside = [], segments = [];
  let hasLess = false, hasGreater = false;
  const hasArea = (polygon) => {
    if (polygon.length < 3) return false;
    const origin = new Vector3(...position(polygon[0]));
    for (let i = 1; i + 1 < polygon.length; i++) {
      const a = new Vector3(...position(polygon[i])).sub(origin), b = new Vector3(...position(polygon[i + 1])).sub(origin);
      if (a.cross(b).lengthSq() > 1e-24) return true;
    }
    return false;
  };
  for (const polygon of polygons) {
    const cut = splitPolygon(polygon, plane);
    if (hasArea(cut.inside)) inside.push(cut.inside);
    if (hasArea(cut.outside)) outside.push(cut.outside);
    const coordinates = polygon.map((v) => position(v)[plane.axis]);
    hasLess ||= Math.min(...coordinates) < plane.boundary;
    hasGreater ||= Math.max(...coordinates) > plane.boundary;
    // Faces on either side contribute an existing exact-edge section too.
    // Entirely coplanar faces are not section edges; a tangent-only plane below
    // returns no caps rather than duplicating an existing exterior face.
    if (coordinates.every((value) => value === plane.boundary)) continue;
    const ends = [...cut.inside, ...cut.outside].map(position).filter((p) => Math.abs(p[plane.axis] - plane.boundary) < 1e-9);
    let best = [], max = 0;
    for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
      const d = distance2(ends[i], ends[j]); if (d > max) { max = d; best = [ends[i], ends[j]]; }
    }
    if (best.length) segments.push(best);
  }
  return { inside, outside, loops: hasLess && hasGreater ? traceLoops(segments) : [] };
}

/** A real, UV-mapped cut face, optionally around an open container aperture.
 * Caller supplies inspected material-atlas UV bounds; no flat-color substitute.
 */
export function propCutFace(contour, holes, axis, normalSign, uvBounds) {
  const axes = [(axis + 1) % 3, (axis + 2) % 3];
  if (![0, 1, 2].includes(axis) || ![-1, 1].includes(normalSign) || uvBounds.length !== 4 || !uvBounds.every(Number.isFinite)
    || [contour, ...holes].some((loop) => loop.length < 3 || loop.some((p) => p.length !== 3 || !p.every(Number.isFinite)))
    || [contour, ...holes].flat().some((p) => Math.abs(p[axis] - contour[0][axis]) > 1e-8)) throw new Error("Invalid cut face");
  const loops = [contour, ...holes].map((loop, i) => {
    const result = loop.map((p) => [...p]);
    const area = ShapeUtils.area(result.map((p) => new Vector2(p[axes[0]], p[axes[1]])));
    if ((area < 0) === (i === 0)) result.reverse(); return result;
  });
  const vectors = loops.map((loop) => loop.map((p) => new Vector2(p[axes[0]], p[axes[1]])));
  const triangles = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
  const all = loops.flat(), normal = [0, 0, 0]; normal[axis] = normalSign;
  const min = axes.map((a) => Math.min(...contour.map((p) => p[a]))), max = axes.map((a) => Math.max(...contour.map((p) => p[a])));
  if (!triangles.length || max.some((n, i) => n - min[i] < 1e-12)) throw new Error("Degenerate cut face");
  return triangles.map((ids) => (normalSign < 0 ? [...ids].reverse() : ids).map((id) => {
    const p = all[id], u = (p[axes[0]] - min[0]) / (max[0] - min[0]), v = (p[axes[1]] - min[1]) / (max[1] - min[1]);
    return { attributes: { position: [...p], normal: [...normal], uv: [uvBounds[0] + u * (uvBounds[2] - uvBounds[0]), uvBounds[1] + v * (uvBounds[3] - uvBounds[1])] } };
  }));
}

function within(point, loop, axis) {
  const u = (axis + 1) % 3, v = (axis + 2) % 3; let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if ((a[v] > point[v]) !== (b[v] > point[v]) && point[u] < (b[u] - a[u]) * (point[v] - a[v]) / (b[v] - a[v]) + a[u]) inside = !inside;
  }
  return inside;
}

/** Preserve nested cavities when sealing a cut through a hollow prop. */
export function capPropSection(loops, axis, normalSign, uvBounds) {
  const containers = loops.map((loop, i) => loops.map((other, j) => i !== j && within(loop[0], other, axis) ? j : -1).filter((j) => j >= 0));
  return loops.flatMap((loop, i) => {
    const depth = containers[i].length;
    if (depth % 2) return [];
    const holes = loops.filter((_, j) => containers[j].length === depth + 1 && containers[j].includes(i));
    return propCutFace(loop, holes, axis, normalSign, uvBounds);
  });
}

/** Closed source subset with real cut surfaces on both resulting parts. */
export function splitClosedProp(polygons, plane, uvBounds) {
  const result = sectionProp(polygons, plane), sign = plane.keepGreater ? -1 : 1;
  result.inside.push(...capPropSection(result.loops, plane.axis, sign, uvBounds));
  result.outside.push(...capPropSection(result.loops, plane.axis, -sign, uvBounds));
  return result;
}
