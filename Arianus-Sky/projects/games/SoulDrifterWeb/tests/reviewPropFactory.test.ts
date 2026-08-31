import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReviewPropFactory, REVIEW_PROP_DEFINITIONS } from "../src/review/weapon-lab/review-prop-factory";
import { configureReviewAssetLoader, type fetchPinnedReviewAsset } from "../src/review/weapon-lab/review-asset-loader";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(maxInstances = 6) {
  const definition = REVIEW_PROP_DEFINITIONS[0]!, scene = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  // Last vertex is not rendered and must never pull the grounded prop down.
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-.2, -.1, 0, .2, -.1, 0, 0, 1, 0, 0, -100, 0], 3));
  geometry.setIndex([0, 1, 2]);
  for (const name of definition.armMaterials) {
    const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() });
    material.name = name; const mesh = new THREE.Mesh(geometry, material); mesh.name = name; scene.add(mesh);
  }
  const loader = { parseAsync: vi.fn(async () => ({ scene } as unknown as GLTF)) };
  const fetchAsset = vi.fn<typeof fetchPinnedReviewAsset>(async () => ({ bytes: new ArrayBuffer(0), resourcePath: "", checksumVerified: true }));
  const factory = createReviewPropFactory({ loader, fetchAsset, maxInstances });
  return { scene, geometry, loader, fetchAsset, factory, definition };
}

describe("review prop ownership and real contact surfaces", () => {
  it("shares immutable source geometry while isolating placement, material and solid contact surfaces", async () => {
    const { factory, scene, loader, fetchAsset, geometry, definition } = setup();
    const a = await factory.create({ definitionId: definition.id, instanceId: "tree-a" });
    const b = await factory.create({ definitionId: definition.id, instanceId: "tree-b" });
    expect(fetchAsset).toHaveBeenCalledOnce(); expect(loader.parseAsync).toHaveBeenCalledOnce();
    expect(a.root).not.toBe(b.root); expect(a.model).not.toBe(b.model);
    expect(a.bounds().min.y).toBeCloseTo(0); expect(a.bounds().max.y).toBeCloseTo(1.1);
    const am = a.model.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const bm = b.model.children[0] as typeof am, sm = scene.children[0] as typeof am;
    expect(am.geometry).toBe(geometry); expect(am.material).not.toBe(bm.material);
    expect(am.material.map).toBe(sm.material.map); expect(am.material.aoMap).toBe(am.material.roughnessMap); expect(sm.material.aoMap).toBeNull();
    expect(a.contactSurface.snapshot()).toMatchObject({ meshes: 2, triangles: 2 }); // no foliage collider
    a.place([5, 0, 3], Math.PI / 2); expect(b.root.position.toArray()).toEqual([0, 0, 0]);
    expect(a.contactSurface.bounds().getCenter(new THREE.Vector3()).x).toBeCloseTo(5);
    const releaseGeometry = vi.spyOn(geometry, "dispose"); a.dispose(); a.dispose();
    expect(releaseGeometry).not.toHaveBeenCalled(); expect(() => a.place([0, 0, 0], 0)).toThrow("disposed");
    factory.dispose(); factory.dispose(); await Promise.resolve();
    expect(releaseGeometry).toHaveBeenCalledOnce(); expect(b.root.parent).toBeNull();
  });

  it("rejects duplicates, unknown assets, invalid placements and the explicit population limit", async () => {
    const { factory, fetchAsset, definition } = setup(1);
    await expect(factory.create({ definitionId: "missing", instanceId: "a" })).rejects.toThrow("Unknown"); expect(fetchAsset).not.toHaveBeenCalled();
    const a = await factory.create({ definitionId: definition.id, instanceId: "a" });
    await expect(factory.create({ definitionId: definition.id, instanceId: "a" })).rejects.toThrow("Duplicate");
    await expect(factory.create({ definitionId: definition.id, instanceId: "b" })).rejects.toThrow("at most");
    expect(() => a.place([NaN, 0, 0], 0)).toThrow("finite"); a.dispose();
    await expect(factory.create({ definitionId: definition.id, instanceId: "b" })).resolves.toBeDefined();
    factory.dispose(); await expect(factory.create({ definitionId: definition.id, instanceId: "c" })).rejects.toThrow("disposed");
  });

  it("cancels one late caller without poisoning the reusable source cache", async () => {
    const { factory, loader, fetchAsset, definition } = setup();
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    fetchAsset.mockImplementation(async () => { await gate; return { bytes: new ArrayBuffer(0), resourcePath: "", checksumVerified: true }; });
    const abort = new AbortController(), job = factory.create({ definitionId: definition.id, instanceId: "cancelled", signal: abort.signal });
    abort.abort(); release(); await expect(job).rejects.toMatchObject({ name: "AbortError" });
    await factory.create({ definitionId: definition.id, instanceId: "live" });
    expect(loader.parseAsync).toHaveBeenCalledOnce(); expect(fetchAsset).toHaveBeenCalledOnce(); factory.dispose();
  });

  it("releases a source that finishes after factory disposal and retries failed downloads", async () => {
    const { factory, geometry, definition, fetchAsset } = setup();
    fetchAsset.mockRejectedValueOnce(new Error("offline"));
    await expect(factory.create({ definitionId: definition.id, instanceId: "first" })).rejects.toThrow("offline");
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    fetchAsset.mockImplementation(async () => { await gate; return { bytes: new ArrayBuffer(0), resourcePath: "", checksumVerified: true }; });
    const disposed = vi.spyOn(geometry, "dispose"), job = factory.create({ definitionId: definition.id, instanceId: "late" });
    factory.dispose(); release(); await expect(job).rejects.toMatchObject({ name: "AbortError" }); await Promise.resolve();
    expect(disposed).toHaveBeenCalledOnce();
  });

  it("fails closed on missing named solid geometry, materials or PBR maps", async () => {
    for (const mode of ["geometry", "textures", "material-name"]) {
      const { scene, factory, definition } = setup();
      const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      if (mode === "geometry") mesh.name = "wrong-source";
      else if (mode === "textures") mesh.material.normalMap = null;
      else mesh.material.name = "wrong-material";
      await expect(factory.create({ definitionId: definition.id, instanceId: mode })).rejects.toThrow(
        mode === "geometry" ? "contact mesh missing" : mode === "textures" ? "PBR maps" : "PBR material missing");
      factory.dispose();
    }
  });
});

it("loads the actual pinned tree and measures only its 48k bark triangles", async () => {
  const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
  const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
  const definition = REVIEW_PROP_DEFINITIONS[0]!, bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
  vi.stubGlobal("document", { baseURI: "http://localhost/weapon-lab.html" });
  vi.stubGlobal("fetch", async () => new Response(bytes));
  const loader = configureReviewAssetLoader(new GLTFLoader());
  // Only image decoding is stubbed in Node: container, actual geometry, materials
  // and SHA checks all remain real. Native image rendering is a separate gate.
  loader.register(() => ({ name: "TEST_IMAGE_DECODING", loadTexture: async () => {
    const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
  } }));
  const factory = createReviewPropFactory({ loader });
  try {
    const tree = await factory.create({ definitionId: definition.id, instanceId: "actual-tree" });
    expect(tree.contactSurface.snapshot()).toMatchObject({ meshes: 2, triangles: 48000 });
    expect(tree.bounds().min.y).toBeCloseTo(0); expect(tree.bounds().max.y).toBeGreaterThan(4);
    expect(tree.bounds().max.y).toBeLessThan(5);
    tree.place([2, 0, -3], Math.PI / 3);
    expect(tree.contactSurface.snapshot().unsupportedMeshIds).toEqual([]);
  } finally { factory.dispose(); }
}, 20_000);
