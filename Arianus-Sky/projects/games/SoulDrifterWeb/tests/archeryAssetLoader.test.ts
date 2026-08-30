import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Texture } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  ARCHERY_ASSET_PATHS,
  type ArcheryAssetMetrics,
  type ArcheryAssetRole,
} from "../src/game/archery/archeryAssetContract";
import {
  loadValidatedArcheryAssets,
  type ArcheryAssetManifest,
} from "../src/game/archery/archeryAssetLoader";

const ROLES = Object.keys(ARCHERY_ASSET_PATHS) as ArcheryAssetRole[];

function texturedAsset(lengthMeters: number): Object3D {
  const root = new Group();
  const texture = () => new Texture();
  root.add(new Mesh(
    new BoxGeometry(0.008, lengthMeters, 0.008),
    new MeshStandardMaterial({
      map: texture(),
      normalMap: texture(),
      roughnessMap: texture(),
      aoMap: texture(),
    }),
  ));
  return root;
}

function manifestEntry(role: ArcheryAssetRole): ArcheryAssetMetrics {
  return {
    role,
    lengthMeters: role === "quiver" ? 0.64 : role.startsWith("arrow-") ? 0.94 : 0.7,
    shaftRadiusMeters: role.startsWith("arrow-") ? 0.004 : undefined,
    forwardAxis: "+Y",
    rearAxis: "-Y",
    bakedArrowCount: 0,
    pbrMaterialCount: 1,
    pbrTextureChannels: ["baseColor", "normal", "roughness", "ao"],
    rootObjectCount: 1,
    sourceProvider: "tripo3d",
    sourceModelId: `tripo-${role}`,
    placeholder: false,
  };
}

function acceptedManifest(): ArcheryAssetManifest {
  return Object.fromEntries(ROLES.map((role) => [role, manifestEntry(role)])) as unknown as ArcheryAssetManifest;
}

function assetMap(): Map<string, Object3D> {
  return new Map(ROLES.map((role) => {
    const metrics = manifestEntry(role);
    return [ARCHERY_ASSET_PATHS[role], texturedAsset(metrics.lengthMeters)];
  }));
}

describe("archery asset loader", () => {
  it("loads six independent Tripo roots and maps them to presentation roles", async () => {
    const assetsByPath = assetMap();
    const load = vi.fn(async (path: string) => assetsByPath.get(path)!);
    const bow = new Group();

    const assets = await loadValidatedArcheryAssets(load, acceptedManifest(), bow);

    expect(load.mock.calls.map(([path]) => path)).toEqual(Object.values(ARCHERY_ASSET_PATHS));
    expect(assets.bow).toBe(bow);
    expect(assets.quiver).toBe(assetsByPath.get(ARCHERY_ASSET_PATHS.quiver));
    expect(assets.harness).toBe(assetsByPath.get(ARCHERY_ASSET_PATHS.harness));
    expect(new Set(Object.values(assets.arrows)).size).toBe(4);
  });

  it("rejects a shared quiver-harness root instead of silently coupling their transforms", async () => {
    const assetsByPath = assetMap();
    assetsByPath.set(ARCHERY_ASSET_PATHS.harness, assetsByPath.get(ARCHERY_ASSET_PATHS.quiver)!);

    await expect(loadValidatedArcheryAssets(
      async (path) => assetsByPath.get(path)!,
      acceptedManifest(),
      new Group(),
    )).rejects.toThrow(/cannot reuse the same root object/i);
  });

  it("rejects runtime meshes that lack required texture channels or canonical arrow length", async () => {
    const assetsByPath = assetMap();
    const malformed = new Group();
    malformed.add(new Mesh(new BoxGeometry(0.02, 0.72, 0.02), new MeshStandardMaterial()));
    assetsByPath.set(ARCHERY_ASSET_PATHS["arrow-fire"], malformed);

    await expect(loadValidatedArcheryAssets(
      async (path) => assetsByPath.get(path)!,
      acceptedManifest(),
      new Group(),
    )).rejects.toThrow(/arrow-fire:.*missing the baseColor[\s\S]*0\.94m/i);
  });
});
