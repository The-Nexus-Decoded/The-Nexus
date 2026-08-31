import { MathUtils } from "three";

export interface PolygonVertex { attributes: Record<string, number[]> }
export interface ClipPlane { axis: 0 | 1 | 2; boundary: number; keepGreater: boolean }

function interpolateVertex(left: PolygonVertex, right: PolygonVertex, alpha: number): PolygonVertex {
  const attributes: Record<string, number[]> = {};
  Object.entries(left.attributes).forEach(([name, leftValues]) => {
    const rightValues = right.attributes[name]!;
    attributes[name] = leftValues.map((value, index) => (
      MathUtils.lerp(value, rightValues[index]!, alpha)
    ));
  });
  return { attributes };
}

/** Shared convex surface split. Interpolates original UV/normal attributes;
 * it does not cap a cut, invent an interior, normalize or rescale geometry.
 * Existing door results remain byte-identical; review authoring also uses X cuts.
 */
export function splitPolygon(polygon: PolygonVertex[], plane: ClipPlane): {
  inside: PolygonVertex[]; outside: PolygonVertex[];
} {
  const inside: PolygonVertex[] = [], outside: PolygonVertex[] = [];
  const coordinate = (vertex: PolygonVertex): number => vertex.attributes.position![plane.axis]!;
  const isInside = (value: number): boolean => plane.keepGreater ? value >= plane.boundary : value <= plane.boundary;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!, next = polygon[(index + 1) % polygon.length]!;
    const currentCoordinate = coordinate(current), nextCoordinate = coordinate(next);
    const currentInside = isInside(currentCoordinate), nextInside = isInside(nextCoordinate);
    (currentInside ? inside : outside).push(current);
    if (currentInside === nextInside) continue;
    const alpha = (plane.boundary - currentCoordinate) / (nextCoordinate - currentCoordinate);
    const intersection = interpolateVertex(current, next, alpha);
    inside.push(intersection); outside.push(intersection);
  }
  return { inside, outside };
}
