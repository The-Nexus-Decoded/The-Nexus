import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readStaticProp } from "../scripts/assets/static-prop-mesh.mjs";
import { sectionProp, propCutFace, capPropSection, splitClosedProp } from "../scripts/assets/prop-cut-surfaces.mjs";
const chest = fileURLToPath(new URL("../docs/3d-ai-studio/source-models/environment/dungeon-kit/storage-chest.glb", import.meta.url));
const sha = "8cc7d2c791614661e6997e9ea0632dbdbf8cd706b81dea5a45031921ffe4dc56";
const uv = [.235, .137, .326, .199];
describe("real prop cut surfaces", () => {
  it.each([-1, 1])("does not cap or duplicate a disconnected tangent component on side %s", (side) => {
    const box = (x, y) => [0, 1, 2].flatMap((axis) => [-1, 1].flatMap((sign) => {
      const u = (axis + 1) % 3, v = (axis + 2) % 3, center = [x, y, 0];
      const contour = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => {
        const p = [...center]; p[axis] += sign; p[u] += a; p[v] += b; return p;
      });
      return propCutFace(contour, [], axis, sign, uv);
    }));
    for (const keepGreater of [false, true]) {
      const result = splitClosedProp([...box(-3, side), ...box(3, 0)], {axis:1,boundary:0,keepGreater}, uv);
      expect(result.loops).toHaveLength(1);
      expect(result.loops[0].every((p) => p[0] >= 2)).toBe(true);
      const tangentInside = result.inside.filter((face) => face.every((v) => v.attributes.position[0] < 0));
      const tangentOutside = result.outside.filter((face) => face.every((v) => v.attributes.position[0] < 0));
      expect(tangentInside).toHaveLength((side > 0) === keepGreater ? 12 : 0);
      expect(tangentOutside).toHaveLength((side > 0) === keepGreater ? 0 : 12);
    }
  });
  it("caps an exact existing edge ring without retaining degenerate surfaces", () => {
    const ring = [[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]], polygons = [];
    for (let i=0;i<4;i++) for (const y of [-1,1]) polygons.push([ring[i], ring[(i+1)%4], [0,y,0]].map((p) => ({attributes:{position:p,normal:[0,1,0],uv:[0,0]}})));
    const result = splitClosedProp(polygons, {axis:1,boundary:0,keepGreater:false}, uv);
    expect(result.loops).toHaveLength(1); expect(result.loops[0]).toHaveLength(4);
    expect(result.inside).toHaveLength(6); expect(result.outside).toHaveLength(6);
    for(const half of [result.inside,result.outside]) {
      const caps = half.filter((face) => face.every((v) => v.attributes.position[1] === 0));
      const area = caps.reduce((sum, face) => {
        const [a,b,c] = face.map((v) => v.attributes.position);
        return sum + Math.abs((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]))/2;
      },0); expect(area).toBe(4);
    }
    const tangent = splitClosedProp(polygons, {axis:1,boundary:1,keepGreater:false},uv);
    expect(tangent.loops).toEqual([]); expect(tangent.outside).toEqual([]); expect(tangent.inside).toHaveLength(8);
  });
  it("finds the original chest seam and leaves the source untouched", () => {
    const source = readStaticProp(chest, sha), before = JSON.stringify(source.polygons);
    const result = sectionProp(source.polygons, { axis: 1, boundary: .122, keepGreater: false });
    // The actual hanging hasp is a second section, separated from the body rail.
    expect(result.loops).toHaveLength(2); expect(result.loops[0]).toHaveLength(136);
    expect(result.loops[1]).toHaveLength(9);
    expect(result.loops[1].every((p) => p[0] > .25 && Math.abs(p[2]) < .023)).toBe(true);
    expect(result.loops.flat().every((p) => Math.abs(p[1] - .122) < 1e-9)).toBe(true);
    expect(JSON.stringify(source.polygons)).toBe(before);
  });
  it("triangulates a real rim with an open aperture, not a filled box top", () => {
    const loop = [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]];
    const hole = [[-.8, 0, -.8], [.8, 0, -.8], [.8, 0, .8], [-.8, 0, .8]];
    const faces = propCutFace(loop, [hole], 1, 1, uv);
    let area = 0;
    for (const face of faces) {
      const [a, b, c] = face.map((v) => v.attributes.position);
      const crossY = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      expect(crossY).toBeGreaterThan(0); area += crossY / 2;
      expect(face.every((v) => v.attributes.normal[1] === 1 && v.attributes.uv.every(Number.isFinite))).toBe(true);
    }
    expect(area).toBeCloseTo(4 - 2.56, 10);
  });
  it("gives both halves opposite outward-facing caps", () => {
    const source = readStaticProp(chest, sha);
    const result = splitClosedProp(source.polygons, { axis: 1, boundary: .122, keepGreater: false }, uv);
    expect(result.inside.at(-1)[0].attributes.normal).toEqual([0, 1, 0]);
    expect(result.outside.at(-1)[0].attributes.normal).toEqual([0, -1, 0]);
  });
  it("keeps holes and solid islands when capping nested contours in arbitrary order", () => {
    const square = (r) => [[-r, 0, -r], [r, 0, -r], [r, 0, r], [-r, 0, r]];
    const faces = capPropSection([square(.8), square(.2), square(1)], 1, 1, uv);
    const area = faces.reduce((sum, face) => {
      const [a, b, c] = face.map((v) => v.attributes.position);
      return sum + ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) / 2;
    }, 0);
    expect(area).toBeCloseTo(4 - 2.56 + .16, 10);
  });
  it("refuses nonplanar/degenerate caps and ambiguous open contours", () => {
    expect(() => sectionProp([], { axis: 3, boundary: 0, keepGreater: true })).toThrow("Invalid cut plane");
    expect(() => propCutFace([[0,0,0], [1,0,0], [2,0,0]], [], 1, 1, uv)).toThrow("Degenerate");
    expect(() => propCutFace([[0,0,0], [1,0,0], [1,1,1]], [], 1, 1, uv)).toThrow("Invalid cut face");
    const open = [[[-1,-1,0], [1,-1,0], [1,1,0]].map((p) => ({ attributes:{position:p,normal:[0,0,1],uv:[0,0]} }))];
    expect(() => sectionProp(open, { axis: 1, boundary: 0, keepGreater: false })).toThrow("Ambiguous cut contour");
  });
});
