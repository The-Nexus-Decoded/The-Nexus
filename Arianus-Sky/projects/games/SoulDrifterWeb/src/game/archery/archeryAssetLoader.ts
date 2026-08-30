import { Box3, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import {
  ARCHERY_ASSET_PATHS,
  type ArcheryAssetMetrics,
  type ArcheryAssetRole,
  type ArcheryPbrTextureChannel,
  validateArcheryAssetMetrics,
} from "./archeryAssetContract";
import { ARROW_TYPES, type ArrowType } from "./archeryInventory";
import type { ArcheryPresentationAssets } from "./archeryPresentation";

export type ArcheryAssetLoad = (path: string) => Promise<Object3D>;
export type ArcheryAssetManifest = Readonly<Record<ArcheryAssetRole, ArcheryAssetMetrics>>;

const ARCHERY_ASSET_ROLES = Object.freeze(Object.keys(ARCHERY_ASSET_PATHS) as ArcheryAssetRole[]);

interface RuntimePbrEvidence {
  materialCount: number;
  textureChannels: ArcheryPbrTextureChannel[];
}

function collectRuntimePbrEvidence(root: Object3D): RuntimePbrEvidence {
  const materials = new Set<MeshStandardMaterial>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of meshMaterials) {
      const candidate = material as MeshStandardMaterial;
      if (candidate.isMeshStandardMaterial) materials.add(candidate);
    }
  });

  const textureChannels = new Set<ArcheryPbrTextureChannel>();
  for (const material of materials) {
    if (material.map) textureChannels.add("baseColor");
    if (material.normalMap) textureChannels.add("normal");
    if (material.roughnessMap) textureChannels.add("roughness");
    if (material.aoMap) textureChannels.add("ao");
  }
  return { materialCount: materials.size, textureChannels: [...textureChannels] };
}

function runtimeLengthMeters(root: Object3D): number {
  root.updateMatrixWorld(true);
  return new Box3().setFromObject(root).getSize(new Vector3()).y;
}

function arrowTypeForRole(role: ArcheryAssetRole): ArrowType | undefined {
  if (!role.startsWith("arrow-")) return undefined;
  const arrowType = role.slice("arrow-".length) as ArrowType;
  return ARROW_TYPES.includes(arrowType) ? arrowType : undefined;
}

function validatedRuntimeMetrics(root: Object3D, recorded: ArcheryAssetMetrics): ArcheryAssetMetrics {
  const pbr = collectRuntimePbrEvidence(root);
  return {
    ...recorded,
    lengthMeters: runtimeLengthMeters(root),
    pbrMaterialCount: pbr.materialCount,
    pbrTextureChannels: pbr.textureChannels,
    rootObjectCount: root.parent === null ? 1 : 0,
  };
}

export async function loadValidatedArcheryAssets(
  load: ArcheryAssetLoad,
  manifest: ArcheryAssetManifest,
  bow: Object3D,
): Promise<ArcheryPresentationAssets> {
  const loaded = await Promise.all(ARCHERY_ASSET_ROLES.map(async (role) => {
    const recorded = manifest[role];
    if (recorded.role !== role) throw new Error(`${role}: intake manifest role does not match its shipping path.`);
    const root = await load(ARCHERY_ASSET_PATHS[role]);
    return { role, root, metrics: validatedRuntimeMetrics(root, recorded) };
  }));

  const seenRoots = new Set<Object3D>();
  const failures: string[] = [];
  for (const entry of loaded) {
    if (seenRoots.has(entry.root)) failures.push(`${entry.role}: shipping roles cannot reuse the same root object.`);
    seenRoots.add(entry.root);
    const validation = validateArcheryAssetMetrics(entry.metrics);
    failures.push(...validation.failures.map((failure) => `${entry.role}: ${failure}`));
  }
  if (failures.length > 0) throw new Error(`Archery asset intake rejected:\n${failures.join("\n")}`);

  const byRole = new Map(loaded.map((entry) => [entry.role, entry.root] as const));
  const arrows = {} as Record<ArrowType, Object3D>;
  for (const role of ARCHERY_ASSET_ROLES) {
    const arrowType = arrowTypeForRole(role);
    if (arrowType) arrows[arrowType] = byRole.get(role)!;
  }
  return {
    bow,
    quiver: byRole.get("quiver")!,
    harness: byRole.get("harness")!,
    arrows,
  };
}
