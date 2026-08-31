import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CINDERBOUND_WARDEN_ASSETS } from "../src/game/dungeons/breach-v2-wardens";
import { REVIEWED_BASE_MOB_URL } from "../src/review/weapon-lab/reviewed-mob-receipt";
import { ReviewContactSurface, sampleReviewMeshVertices } from "../src/review/weapon-lab/combat-review-contact";

function mesh(): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0,
    3, -1, 0, 5, -1, 0, 4, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  const result = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  result.name = "actual indexed test surface";
  return result;
}

describe("Combat Review deformed triangle contact", () => {
  it("measures actual triangles rather than empty space inside a bounding box", () => {
    const subject = mesh();
    const surface = new ReviewContactSurface(subject);
    expect(surface.update()).toMatchObject({ meshes: 1, triangles: 2, revision: 1 });
    const hit = surface.closest(new THREE.Vector3(0, 0, 0.02), 0.03)!;
    expect(hit.distance).toBeCloseTo(0.02);
    expect(hit.point.toArray()).toEqual([0, 0, 0]);
    expect(hit.normal.toArray()).toEqual([0, 0, 1]);
    expect(hit.faceIndex).toBe(0);
    expect(hit.evidence).toContain("deformed-triangle:");
    expect(surface.closest(new THREE.Vector3(2, 0, 0), 0.03)).toBeNull();
  });

  it("sweeps through thin surfaces without tunnelling and reports original face IDs", () => {
    const surface = new ReviewContactSurface(mesh());
    surface.update();
    const hit = surface.segment(new THREE.Vector3(4, 0, -5), new THREE.Vector3(4, 0, 5))!;
    expect(hit.faceIndex).toBe(1);
    expect(hit.distance).toBeCloseTo(5);
    expect(surface.segment(new THREE.Vector3(2, 0, -5), new THREE.Vector3(2, 0, 5))).toBeNull();
    expect(surface.segment(new THREE.Vector3(4, 0, -5), new THREE.Vector3(4, 0, -1))).toBeNull();
    expect(surface.segment(new THREE.Vector3(4, 0, 0), new THREE.Vector3(4, 0, 0))).not.toBeNull();
  });

  it("refits in world space under independent scaled and rotated actor roots", () => {
    const subject = mesh();
    const root = new THREE.Group();
    root.add(subject);
    const surface = new ReviewContactSurface(root);
    surface.update();
    root.position.set(3, 2, 1);
    root.rotation.y = Math.PI / 2;
    root.scale.setScalar(2);
    surface.update();
    const hit = surface.closest(new THREE.Vector3(3.05, 2, 1), 0.06)!;
    expect(hit.distance).toBeCloseTo(0.05);
    expect(hit.normal.x).toBeCloseTo(1);
    expect(hit.sampleRevision).toBe(2);
    expect(surface.closest(new THREE.Vector3(0, 0, 0), 0.01)).toBeNull();
  });

  it("uses skin deformation and exact per-model probe vertices without editing bind data", () => {
    const geometry = mesh().geometry;
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(24), 4));
    const weights = new Float32Array(24);
    for (let i = 0; i < 6; i += 1) weights[i * 4] = 1;
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
    const subject = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    const bone = new THREE.Bone();
    subject.add(bone);
    subject.bind(new THREE.Skeleton([bone]));
    const original = Array.from(geometry.getAttribute("position").array);
    const inverse = subject.skeleton.boneInverses[0]!.clone();
    const surface = new ReviewContactSurface(subject);
    surface.update();
    bone.position.z = 2;
    surface.update();
    expect(surface.closest(new THREE.Vector3(0, 0, 2.01), 0.02)!.distance).toBeCloseTo(0.01);
    expect(sampleReviewMeshVertices(subject, [0])[0]!.toArray()).toEqual([-1, -1, 2]);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual(original);
    expect(subject.skeleton.boneInverses[0]!.equals(inverse)).toBe(true);
    expect(() => sampleReviewMeshVertices(subject, [6])).toThrow(/outside/);
    bone.position.z = 3;
    expect(sampleReviewMeshVertices(subject, [0])[0]!.z).toBe(3);
    const actorRoot = new THREE.Group();
    actorRoot.add(subject);
    actorRoot.position.set(3, 0, 1);
    actorRoot.rotation.y = Math.PI / 2;
    actorRoot.scale.setScalar(2);
    const movedSurface = new ReviewContactSurface(actorRoot);
    movedSurface.update();
    const expected = new THREE.Vector3(-1, -1, 3).applyMatrix4(actorRoot.matrixWorld);
    expect(sampleReviewMeshVertices(subject, [0])[0]!.distanceTo(expected)).toBeLessThan(1e-8);
    expect(movedSurface.closest(expected, 0.0001)!.distance).toBeLessThan(1e-6);
  });

  it("includes morph target deformation", () => {
    const subject = mesh();
    subject.geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([
      -1, -1, 2, 1, -1, 2, 0, 1, 2, 3, -1, 2, 5, -1, 2, 4, 1, 2,
    ], 3)];
    subject.updateMorphTargets();
    const surface = new ReviewContactSurface(subject);
    surface.update();
    subject.morphTargetInfluences![0] = 0.5;
    surface.update();
    expect(surface.closest(new THREE.Vector3(0, 0, 1.02), 0.03)!.distance).toBeCloseTo(0.02);
  });

  it("obeys draw ranges, visible material groups, and hidden parent/break-off parts", () => {
    const subject = mesh();
    subject.geometry.addGroup(0, 3, 0);
    subject.geometry.addGroup(3, 3, 1);
    const materials = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
    subject.material = materials;
    materials[1]!.visible = false;
    const parent = new THREE.Group();
    parent.add(subject);
    const surface = new ReviewContactSurface(subject);
    expect(surface.update().triangles).toBe(1);
    expect(surface.closest(new THREE.Vector3(4, 0, 0), 0.01)).toBeNull();
    materials[1]!.visible = true;
    subject.geometry.setDrawRange(3, 3);
    expect(surface.update().triangles).toBe(1);
    expect(surface.closest(new THREE.Vector3(4, 0, 0), 0.01)!.faceIndex).toBe(1);
    parent.visible = false;
    expect(surface.update().meshes).toBe(0);
    parent.visible = true;
    expect(surface.update().meshes).toBe(1);
    subject.visible = false;
    expect(surface.update().meshes).toBe(0);
  });

  it("does not render/contact material-array meshes without groups or fully transparent VFX", () => {
    const subject = mesh();
    const surface = new ReviewContactSurface(subject);
    subject.material = [new THREE.MeshBasicMaterial()];
    expect(surface.update().triangles).toBe(0);
    subject.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    expect(surface.update().triangles).toBe(0);
  });

  it("owns contact geometry only and keeps another actor sharing resources independent", () => {
    const first = mesh();
    const second = new THREE.Mesh(first.geometry, first.material);
    second.position.z = 4;
    const geometryDispose = vi.spyOn(first.geometry, "dispose");
    const materialDispose = vi.spyOn(first.material as THREE.Material, "dispose");
    const a = new ReviewContactSurface(first);
    const b = new ReviewContactSurface(second);
    a.update(); b.update();
    a.dispose(); a.dispose();
    expect(b.closest(new THREE.Vector3(0, 0, 4.01), 0.02)!.distance).toBeCloseTo(0.01);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(() => a.update()).toThrow(/disposed/);
    expect(() => a.closest(new THREE.Vector3())).toThrow(/disposed/);
  });

  it("reports unsupported instances, accepts explicit collision-skin filters and rejects invalid input", () => {
    const subject = mesh();
    const instances = new THREE.InstancedMesh(subject.geometry, subject.material, 2);
    const root = new THREE.Group();
    root.add(subject, instances);
    const surface = new ReviewContactSurface(root);
    expect(surface.update().unsupportedMeshIds).toEqual([instances.uuid]);
    const filtered = new ReviewContactSurface(root, (candidate) => candidate === subject);
    expect(filtered.update()).toMatchObject({ meshes: 1, unsupportedMeshIds: [] });
    expect(() => filtered.closest(new THREE.Vector3(NaN, 0, 0))).toThrow(/finite/);
    expect(() => filtered.closest(new THREE.Vector3(), -1)).toThrow(/nonnegative/);
  });

  it("preserves triangle provenance across a large indirect BVH and replaced topology", () => {
    const subject = mesh();
    const positions: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const x = ((i * 17) % 40) * 3;
      positions.push(x - 1, -1, 0, x + 1, -1, 0, x, 1, 0);
    }
    subject.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    subject.geometry.setIndex(Array.from({ length: 120 }, (_, index) => index));
    const surface = new ReviewContactSurface(subject);
    surface.update();
    for (const face of [0, 7, 19, 38]) {
      const x = ((face * 17) % 40) * 3;
      expect(surface.closest(new THREE.Vector3(x, 0, 0.02), 0.03)!.faceIndex).toBe(face);
    }
    subject.geometry.setIndex([3, 4, 5]);
    expect(surface.update().triangles).toBe(1);
    expect(surface.closest(new THREE.Vector3(0, 0, 0), 0.03)).toBeNull();
    const position = subject.geometry.getAttribute("position");
    for (const index of [3, 4, 5]) position.setZ(index, 2);
    position.needsUpdate = true;
    surface.update();
    expect(surface.closest(new THREE.Vector3(51, 0, 2.02), 0.03)!.distance).toBeCloseTo(0.02);
  });

  it.each([
    [REVIEWED_BASE_MOB_URL, "LungeAttack"],
    [CINDERBOUND_WARDEN_ASSETS.wayfarer.url, "BladeSweep"],
  ])("samples actual installed skinned geometry %s without mutating its source", async (url, action) => {
    const importNode = <T>(specifier: string): Promise<T> => import(/* @vite-ignore */ specifier);
    const { readFileSync } = await importNode<{ readFileSync(path: URL): Uint8Array }>("node:fs");
    const bytes = Uint8Array.from(readFileSync(new URL(`../public${url}`, import.meta.url)));
    const loader = new GLTFLoader();
    // Only texture decoding is replaced in this CPU test; mesh/skin/clips are exact.
    loader.register(() => ({ name: "TEST_CPU_IMAGES", loadTexture: async () => new THREE.Texture() }));
    const gltf = await loader.parseAsync(bytes.buffer, "");
    const subject = gltf.scene;
    subject.position.set(2, 0, -3);
    subject.rotation.y = 0.73;
    subject.scale.setScalar(1.7);
    let skin: THREE.SkinnedMesh | null = null;
    subject.traverse((child) => { if ((child as THREE.SkinnedMesh).isSkinnedMesh) skin ??= child as THREE.SkinnedMesh; });
    expect(skin).not.toBeNull();
    const sampledSkin = skin as unknown as THREE.SkinnedMesh;
    const sourcePositions = Array.from(sampledSkin.geometry.getAttribute("position").array);
    const clip = gltf.animations.find((candidate) => candidate.name === action)!;
    expect(clip).toBeDefined();
    const mixer = new THREE.AnimationMixer(subject);
    mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play();
    const surface = new ReviewContactSurface(subject);
    for (const time of [0, clip.duration * 0.5, clip.duration * 0.2]) {
      mixer.setTime(time);
      const summary = surface.update();
      expect(summary.triangles).toBeGreaterThan(1000);
      expect(summary.unsupportedMeshIds).toEqual([]);
      const vertex = sampledSkin.geometry.index?.getX(0) ?? 0;
      const point = sampleReviewMeshVertices(sampledSkin, [vertex])[0]!;
      expect(surface.closest(point, 0.0001)!.distance).toBeLessThan(0.00001);
    }
    expect(Array.from(sampledSkin.geometry.getAttribute("position").array)).toEqual(sourcePositions);
    surface.dispose();
    mixer.uncacheRoot(subject);
  }, 20_000);
});
