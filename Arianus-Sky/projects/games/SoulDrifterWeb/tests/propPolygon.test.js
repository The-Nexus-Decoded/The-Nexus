import * as THREE from "three";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseGlb } from "../scripts/replace-glb-animation.mjs";
import { splitPolygon } from "../src/game/geometry/clipPropPolygon.ts";
import { partitionHeavyDungeonDoor } from "../src/game/environment/HeavyDungeonDoor.ts";

const vertex = (position, uv = [0, 0], normal = [0, 0, 1]) => ({ attributes: { position, uv, normal } });
function area(polygon) {
  let result = 0;
  for (let i = 1; i + 1 < polygon.length; i++) {
    const point = (index) => new THREE.Vector3(...polygon[index].attributes.position);
    result += point(i).sub(point(0)).cross(point(i + 1).sub(point(0))).length() / 2;
  }
  return result;
}
describe("shared UV-preserving prop polygon cuts", () => {
  it.each([0, 1, 2])("preserves surface area/winding on axis %i without mutating the source", (axis) => {
    const point = (a, b) => { const v = [0, 0, 0]; v[axis] = a; v[(axis + 1) % 3] = b; return vertex(v); };
    const polygon = [point(-1, 0), point(1, 0), point(0, 2)], original = structuredClone(polygon);
    const result = splitPolygon(polygon, { axis, boundary: .2, keepGreater: true });
    expect(area(result.inside) + area(result.outside)).toBeCloseTo(area(polygon), 14);
    expect(polygon).toEqual(original);
    expect(result.inside.every((v) => v.attributes.position[axis] >= .2 - 1e-14)).toBe(true);
    expect(result.outside.every((v) => v.attributes.position[axis] <= .2 + 1e-14)).toBe(true);
  });

  it("interpolates the original UV and normal at the exact same cut point for both pieces", () => {
    const polygon = [vertex([-1, 0, 0], [0, .2], [1, 0, 0]), vertex([1, 0, 0], [1, .8], [0, 1, 0]), vertex([1, 1, 0])];
    const { inside, outside } = splitPolygon(polygon, { axis: 0, boundary: 0, keepGreater: true });
    const edge = inside.find((v) => v.attributes.position[0] === 0 && v.attributes.position[1] === 0);
    expect(outside).toContain(edge); expect(edge.attributes.uv).toEqual([.5, .5]);
    expect(edge.attributes.normal).toEqual([.5, .5, 0]);
  });

  it("preserves completely retained vertices and handles empty input", () => {
    const polygon = [vertex([1, 0, 0]), vertex([1, 1, 0]), vertex([1, 0, 1])];
    const result = splitPolygon(polygon, { axis: 0, boundary: 0, keepGreater: true });
    expect(result.outside).toEqual([]); expect(result.inside[0]).toBe(polygon[0]);
    expect(splitPolygon([], { axis: 2, boundary: 0, keepGreater: false })).toEqual({ inside: [], outside: [] });
  });
});

it("leaves actual existing door partition position/normal/UV buffers byte-identical to the pre-extraction snapshot", () => {
  const { json, bin } = parseGlb(fileURLToPath(new URL("../docs/3d-ai-studio/source-models/environment/dungeon-kit/heavy-door.glb", import.meta.url)));
  const primitive = json.meshes[0].primitives[0], geometry = new THREE.BufferGeometry();
  for (const [name, id] of Object.entries({ ...primitive.attributes, indices: primitive.indices })) {
    const a = json.accessors[id], view = json.bufferViews[a.bufferView], width = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    expect(view.byteStride).toBeUndefined();
    const Type = a.componentType === 5126 ? Float32Array : Uint32Array;
    const values = new Type(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * width);
    const attribute = new THREE.BufferAttribute(values, width);
    if (name === "indices") geometry.setIndex(attribute);
    else geometry.setAttribute({ POSITION: "position", NORMAL: "normal", TEXCOORD_0: "uv" }[name], attribute);
  }
  const result = partitionHeavyDungeonDoor(new THREE.Mesh(geometry));
  const hashes = [result.frame, result.leaf].map((object) => {
    const rows = [];
    object.traverse((node) => {
      if (node.isMesh) for (const [name, a] of Object.entries(node.geometry.attributes)) {
        rows.push([name, createHash("sha256").update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength)).digest("hex")]);
      }
    });
    return rows;
  });
  expect(hashes).toEqual([
    [["position", "489fd98969d8e6f84efb36b67c3eca73da008b2b0a9740c3da268162149911c2"],
      ["normal", "2fd7ba4b37a9f43cd1168d1c1a41413b25894d18881ed29f766f14321f7ef6bb"],
      ["uv", "af629a6f4d06396f39803fa46046256e6f35a7995d5ef9db4c2adb5cf8335b94"]],
    [["position", "af66ebfab74352255ac7e46af5141cbf5037a873286e0eb5aa97e9efefb36dfa"],
      ["normal", "0d14308f4d465651cfe64db110ec2a72c4f6cf681aed490b94263a7a50dcced1"],
      ["uv", "49a1f87315f3f4d4d1b91d0976ebffcab936b135026e70d9c4d0935a4bb74a15"]],
  ]);
});
