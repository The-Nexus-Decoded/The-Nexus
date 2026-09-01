import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import catalog from "./review-prop-catalog.json";
import { configureReviewAssetLoader, fetchPinnedReviewAsset } from "./review-asset-loader";
import { ReviewContactSurface, reviewRenderedVertexIndices } from "./combat-review-contact";
import { createBreachV2ResourceDisposalRegistry, disposeBreachV2ObjectResources } from "../../game/dungeons/breach-v2-breachlings";
import { HEAVY_DUNGEON_DOOR_FRAME_LIMITS, partitionHeavyDungeonDoor } from "../../game/environment/HeavyDungeonDoor";

export const REVIEW_PROP_LIMIT = 6;
export const REVIEW_PROP_DEFINITIONS = Object.freeze(catalog.assets.map((entry) => Object.freeze({ ...entry,
  contactMeshes: Object.freeze([...entry.contactMeshes]), armMaterials: Object.freeze([...entry.armMaterials]),
  remainingGates: Object.freeze([...entry.remainingGates]),
  joints: Object.freeze((entry.joints ?? []).map((joint) => Object.freeze({ ...joint }))),
})));
export type ReviewPropDefinition = typeof REVIEW_PROP_DEFINITIONS[number];
export interface ReviewPropJointControl { readonly id: string; readonly label: string; readonly min: number; readonly max: number; readonly value: number }
export interface ReviewPropInstance {
  readonly instanceId: string; readonly definition: ReviewPropDefinition;
  readonly root: THREE.Group; readonly model: THREE.Object3D; readonly contactSurface: ReviewContactSurface;
  bounds(): THREE.Box3;
  place(position: readonly [number, number, number], yawRadians: number): void;
  joints(): readonly ReviewPropJointControl[];
  setJoint(id: string, degrees: number): void;
  resetJoints(): void;
  dispose(): void;
}

function renderedBounds(root: THREE.Object3D, local = false): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const inverse = local ? root.matrixWorld.clone().invert() : null;
  const box = new THREE.Box3(), point = new THREE.Vector3();
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const index of reviewRenderedVertexIndices(object)) {
      object.getVertexPosition(index, point).applyMatrix4(object.matrixWorld);
      if (inverse) point.applyMatrix4(inverse);
      if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error("Nonfinite prop geometry");
      box.expandByPoint(point);
    }
  });
  if (box.isEmpty()) throw new Error("Prop has no visible indexed geometry");
  return box;
}

/** Immutable source cache, independent placements/materials and actual surface
 * collision. Foliage is explicitly excluded, not treated as a solid bounding box.
 */
export function createReviewPropFactory(options: {
  loader?: Pick<GLTFLoader, "parseAsync">; fetchAsset?: typeof fetchPinnedReviewAsset;
  definitions?: readonly ReviewPropDefinition[]; maxInstances?: number;
} = {}) {
  const loader = options.loader ?? configureReviewAssetLoader(new GLTFLoader());
  const fetchAsset = options.fetchAsset ?? fetchPinnedReviewAsset;
  const definitions = options.definitions ?? REVIEW_PROP_DEFINITIONS;
  const maxInstances = options.maxInstances ?? REVIEW_PROP_LIMIT;
  if (!Number.isInteger(maxInstances) || maxInstances < 1 || maxInstances > 32) throw new Error("Invalid review prop limit");
  const lifetime = new AbortController(), cache = new Map<string, Promise<GLTF>>();
  const pending = new Set<string>(), instances = new Set<ReviewPropInstance>();
  const resources = createBreachV2ResourceDisposalRegistry();
  let disposed = false;
  function source(definition: ReviewPropDefinition): Promise<GLTF> {
    let job = cache.get(definition.id);
    if (!job) {
      job = fetchAsset(definition, { signal: lifetime.signal }).then((verified) => loader.parseAsync(verified.bytes, verified.resourcePath));
      cache.set(definition.id, job);
      void job.catch(() => { if (cache.get(definition.id) === job) cache.delete(definition.id); });
    }
    return job;
  }
  return {
    async create({ definitionId, instanceId, signal }: { definitionId: string; instanceId: string; signal?: AbortSignal }): Promise<ReviewPropInstance> {
      if (disposed) throw new Error("Review prop factory disposed");
      signal?.throwIfAborted();
      const definition = definitions.find((entry) => entry.id === definitionId);
      if (!definition) throw new Error("Unknown review prop");
      if (!instanceId || pending.has(instanceId) || [...instances].some((entry) => entry.instanceId === instanceId)) throw new Error("Duplicate or empty prop instance id");
      if (pending.size + instances.size >= maxInstances) throw new Error(`Review supports at most ${maxInstances} props`);
      pending.add(instanceId);
      const materials = new Set<THREE.Material>();
      const ownedGeometries = new Set<THREE.BufferGeometry>();
      let contactSurface: ReviewContactSurface | undefined;
      try {
        const gltf = await source(definition);
        signal?.throwIfAborted();
        if (disposed) throw new DOMException("Prop loading cancelled", "AbortError");
        const root = new THREE.Group(), model = gltf.scene.clone(true);
        root.name = instanceId; root.add(model); model.scale.multiplyScalar(definition.unitScale);
        if (definition.kind === "door") {
          const partition = partitionHeavyDungeonDoor(model), size = partition.fullBounds.getSize(new THREE.Vector3());
          const center = partition.fullBounds.getCenter(new THREE.Vector3()), leafCenter = partition.leafBounds.getCenter(new THREE.Vector3());
          const hinge = new THREE.Group(); hinge.name = "heavy-door-hinge";
          hinge.position.set(leafCenter.x, 0, partition.leafBounds.min.z);
          partition.leaf.position.sub(hinge.position); hinge.add(partition.leaf);
          let frameMaterial: THREE.Material | null = null, frameIndex = 0, leafIndex = 0;
          partition.frame.traverse((node) => { if (node instanceof THREE.Mesh) {
            node.name = `review-heavy-door-frame-${frameIndex++}`; ownedGeometries.add(node.geometry);
            const material = Array.isArray(node.material) ? node.material[0] : node.material; frameMaterial ??= material ?? null;
          } });
          partition.leaf.traverse((node) => { if (node instanceof THREE.Mesh) {
            node.name = `review-heavy-door-leaf-${leafIndex++}`; ownedGeometries.add(node.geometry);
          } });
          if (!frameMaterial || frameIndex !== 1 || leafIndex !== 1) throw new Error("Reviewed heavy door partition has an unexpected mesh layout");
          const railHeight = size.y * (1 - HEAVY_DUNGEON_DOOR_FRAME_LIMITS.top) / 2;
          const railGeometry = new THREE.BoxGeometry(Math.min(.22, size.x * .55), railHeight, size.z);
          const rail = new THREE.Mesh(railGeometry, frameMaterial); rail.name = "review-heavy-door-top-rail";
          rail.position.set(center.x, partition.fullBounds.max.y - railHeight / 2, center.z);
          rail.castShadow = true; rail.receiveShadow = true; ownedGeometries.add(railGeometry);
          model.clear(); model.scale.set(1, 1, 1); model.add(partition.frame, rail, hinge);
        }
        const found = new Set<string>(), foundMaterials = new Set<string>();
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          if (object instanceof THREE.SkinnedMesh) throw new Error("Static prop intake cannot contain an unreviewed rig");
          found.add(object.name); object.castShadow = true; object.receiveShadow = true;
          const clones = (Array.isArray(object.material) ? object.material : [object.material]).map((sourceMaterial) => {
            const material = sourceMaterial.clone(); materials.add(material);
            foundMaterials.add(material.name);
            if (definition.armMaterials.includes(material.name)) {
              if (!(material instanceof THREE.MeshStandardMaterial) || !material.map || !material.normalMap || !material.roughnessMap) {
                throw new Error("Reviewed prop is missing original PBR maps");
              }
              material.aoMap = material.roughnessMap; material.aoMapIntensity = 1;
            }
            return material;
          });
          object.material = Array.isArray(object.material) ? clones : clones[0]!;
        });
        if (definition.contactMeshes.some((name) => !found.has(name))) throw new Error("Reviewed prop contact mesh missing");
        if (definition.armMaterials.some((name) => !foundMaterials.has(name))) throw new Error("Reviewed prop PBR material missing");
        const joints = definition.joints.map((profile) => {
          const matches: THREE.Object3D[] = []; model.traverse((node) => { if (node.name === profile.node) matches.push(node); });
          if (matches.length !== 1 || matches[0] === model || !["x", "y", "z"].includes(profile.axis)
            || !profile.id || ![profile.min, profile.max].every(Number.isFinite) || profile.min > 0 || profile.max < 0 || profile.min >= profile.max) {
            throw new Error("Invalid or missing reviewed prop joint");
          }
          const node = matches[0]!, axis = new THREE.Vector3(profile.axis === "x" ? 1 : 0, profile.axis === "y" ? 1 : 0, profile.axis === "z" ? 1 : 0);
          return { profile, node, axis, rest: node.quaternion.clone(), value: 0 };
        });
        if (new Set(joints.map(({ profile }) => profile.id)).size !== joints.length
          || new Set(joints.map(({ node }) => node)).size !== joints.length) throw new Error("Duplicate reviewed prop joint");
        // Keep the authored X/Z origin and scale; only seat the measured base.
        const localBounds = renderedBounds(root), floorOffset = -localBounds.min.y;
        model.position.y += floorOffset; localBounds.translate(new THREE.Vector3(0, floorOffset, 0));
        contactSurface = new ReviewContactSurface(root, (mesh) => definition.contactMeshes.includes(mesh.name));
        contactSurface.update();
        let released = false;
        const refreshPose = () => { contactSurface!.update(); localBounds.copy(renderedBounds(root, true)); };
        const instance: ReviewPropInstance = { instanceId, definition, root, model, contactSurface,
          bounds() { root.updateWorldMatrix(true, true); return localBounds.clone().applyMatrix4(root.matrixWorld); },
          place(position, yaw) {
            if (released) throw new Error("Review prop disposed");
            if (![...position, yaw].every(Number.isFinite)) throw new Error("Prop placement must be finite");
            root.position.fromArray(position); root.rotation.y = yaw; contactSurface!.update();
          },
          joints() { return joints.map(({ profile, value }) => ({ id: profile.id, label: profile.label, min: profile.min, max: profile.max, value })); },
          setJoint(id, degrees) {
            if (released) throw new Error("Review prop disposed");
            const joint = joints.find(({ profile }) => profile.id === id);
            if (!joint || !Number.isFinite(degrees) || degrees < joint.profile.min || degrees > joint.profile.max) throw new Error("Invalid prop joint angle");
            joint.value = degrees;
            joint.node.quaternion.copy(joint.rest).multiply(new THREE.Quaternion().setFromAxisAngle(joint.axis, THREE.MathUtils.degToRad(degrees)));
            refreshPose();
          },
          resetJoints() {
            if (released) throw new Error("Review prop disposed");
            for (const joint of joints) { joint.value = 0; joint.node.quaternion.copy(joint.rest); }
            refreshPose();
          },
          dispose() {
            if (released) return; released = true; root.removeFromParent(); contactSurface!.dispose();
            materials.forEach((material) => material.dispose()); ownedGeometries.forEach((geometry) => geometry.dispose()); instances.delete(instance);
          },
        };
        instances.add(instance); return instance;
      } catch (error) {
        contactSurface?.dispose(); materials.forEach((material) => material.dispose()); ownedGeometries.forEach((geometry) => geometry.dispose()); throw error;
      } finally { pending.delete(instanceId); }
    },
    dispose() {
      if (disposed) return; disposed = true; lifetime.abort();
      for (const instance of [...instances]) instance.dispose();
      for (const job of cache.values()) void job.then((gltf) => disposeBreachV2ObjectResources(gltf.scene, resources)).catch(() => {});
      cache.clear();
    },
  };
}
