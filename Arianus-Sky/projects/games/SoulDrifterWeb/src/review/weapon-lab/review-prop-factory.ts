import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import catalog from "./review-prop-catalog.json";
import { configureReviewAssetLoader, fetchPinnedReviewAsset } from "./review-asset-loader";
import { ReviewContactSurface, reviewRenderedVertexIndices } from "./combat-review-contact";
import { createBreachV2ResourceDisposalRegistry, disposeBreachV2ObjectResources } from "../../game/dungeons/breach-v2-breachlings";

export const REVIEW_PROP_DEFINITIONS = Object.freeze(catalog.assets.map((entry) => Object.freeze({ ...entry,
  contactMeshes: Object.freeze([...entry.contactMeshes]), armMaterials: Object.freeze([...entry.armMaterials]),
  remainingGates: Object.freeze([...entry.remainingGates]),
})));
export type ReviewPropDefinition = typeof REVIEW_PROP_DEFINITIONS[number];
export interface ReviewPropInstance {
  readonly instanceId: string; readonly definition: ReviewPropDefinition;
  readonly root: THREE.Group; readonly model: THREE.Object3D; readonly contactSurface: ReviewContactSurface;
  bounds(): THREE.Box3;
  place(position: readonly [number, number, number], yawRadians: number): void;
  dispose(): void;
}

function renderedBounds(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3(), point = new THREE.Vector3();
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const index of reviewRenderedVertexIndices(object)) {
      object.getVertexPosition(index, point).applyMatrix4(object.matrixWorld);
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
  const maxInstances = options.maxInstances ?? 6;
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
      let contactSurface: ReviewContactSurface | undefined;
      try {
        const gltf = await source(definition);
        signal?.throwIfAborted();
        if (disposed) throw new DOMException("Prop loading cancelled", "AbortError");
        const root = new THREE.Group(), model = gltf.scene.clone(true);
        root.name = instanceId; root.add(model); model.scale.multiplyScalar(definition.unitScale);
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
        // Keep the authored X/Z origin and scale; only seat the measured base.
        const localBounds = renderedBounds(root), floorOffset = -localBounds.min.y;
        model.position.y += floorOffset; localBounds.translate(new THREE.Vector3(0, floorOffset, 0));
        contactSurface = new ReviewContactSurface(root, (mesh) => definition.contactMeshes.includes(mesh.name));
        contactSurface.update();
        let released = false;
        const instance: ReviewPropInstance = { instanceId, definition, root, model, contactSurface,
          bounds() { root.updateWorldMatrix(true, true); return localBounds.clone().applyMatrix4(root.matrixWorld); },
          place(position, yaw) {
            if (released) throw new Error("Review prop disposed");
            if (![...position, yaw].every(Number.isFinite)) throw new Error("Prop placement must be finite");
            root.position.fromArray(position); root.rotation.y = yaw; contactSurface!.update();
          },
          dispose() {
            if (released) return; released = true; root.removeFromParent(); contactSurface!.dispose();
            materials.forEach((material) => material.dispose()); instances.delete(instance);
          },
        };
        instances.add(instance); return instance;
      } catch (error) {
        contactSurface?.dispose(); materials.forEach((material) => material.dispose()); throw error;
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
