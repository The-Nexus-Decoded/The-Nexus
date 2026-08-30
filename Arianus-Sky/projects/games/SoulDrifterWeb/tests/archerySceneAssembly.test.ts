import { Group, Mesh, MeshStandardMaterial, Object3D, Texture, BoxGeometry } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  ARCHERY_ASSET_MANIFEST_PATH,
  ARCHERY_ASSET_PATHS,
  ARCHERY_BOW_ASSET_PATH,
} from "../src/game/archery/archeryAssetContract";
import {
  createArcherySceneAssembly,
  loadArcherySceneAssets,
} from "../src/game/archery/archerySceneAssembly";
import { createQuiverInventory } from "../src/game/archery/archeryInventory";

function actorFixture(): { model: Group; leftHand: Group; rightHand: Group; spine: Group } {
  const model = new Group();
  const leftHand = new Group();
  const rightHand = new Group();
  const spine = new Group();
  leftHand.name = "mixamorigLeftHand";
  rightHand.name = "mixamorigRightHand";
  spine.name = "mixamorigSpine2";
  model.add(leftHand, rightHand, spine);
  return { model, leftHand, rightHand, spine };
}

function assets() {
  return {
    bow: new Group(),
    quiver: new Group(),
    harness: new Group(),
    arrows: {
      standard: new Group(),
      fire: new Group(),
      ice: new Group(),
      poison: new Group(),
    },
  };
}

function texturedAsset(length: number): Object3D {
  const root = new Group();
  const material = new MeshStandardMaterial();
  material.map = new Texture();
  material.normalMap = new Texture();
  material.roughnessMap = new Texture();
  material.aoMap = new Texture();
  const mesh = new Mesh(new BoxGeometry(0.009, length, 0.009), material);
  root.add(mesh);
  return root;
}

function manifestDocument() {
  return {
    version: 1,
    assets: Object.keys(ARCHERY_ASSET_PATHS).map((role) => ({
      role,
      lengthMeters: role === "quiver" ? 0.64 : role === "harness" ? 0.48 : 0.94,
      shaftRadiusMeters: role.startsWith("arrow-") ? 0.0045 : undefined,
      forwardAxis: "+Y",
      rearAxis: "-Y",
      bakedArrowCount: 0,
      pbrMaterialCount: 1,
      pbrTextureChannels: ["baseColor", "normal", "roughness", "ao"],
      rootObjectCount: 1,
      sourceProvider: "tripo3d",
      sourceModelId: `tripo-${role}`,
      placeholder: false,
    })),
  };
}

describe("production archery scene assembly", () => {
  it("mounts one bow, an independent quiver, fitted harness, and arrow inventory on exact rig sockets", () => {
    const { model, leftHand, rightHand, spine } = actorFixture();
    const inventory = createQuiverInventory({ standard: 8, fire: 1, ice: 1 });
    const projectileWorld = new Group();
    const applyBowStringDraw = vi.fn();
    const assembly = createArcherySceneAssembly({
      model,
      projectileWorld,
      actorScale: 2,
      inventory,
      assets: assets(),
      applyBowStringDraw,
    });

    expect(leftHand.getObjectByName("archery-bow-hand")).toBeDefined();
    expect(rightHand.getObjectByName("archery-arrow-hand")).toBeDefined();
    expect(spine.getObjectByName("archery-bow-back")?.getObjectByName("bow-visual")).toBeDefined();
    expect(spine.getObjectByName("archery-quiver-back")?.getObjectByName("quiver-visual-empty")).toBeDefined();
    expect(spine.getObjectByName("archery-harness-torso")?.getObjectByName("quiver-harness-visual")).toBeDefined();
    expect(assembly.presentation.quiverArrowInstanceCount()).toBe(10);
    expect(assembly.roots.quiverBack).not.toBe(assembly.roots.harnessTorso);
    expect(assembly.roots.quiverBack.scale.x).toBeCloseTo(0.5);
    expect(assembly.roots.harnessTorso.scale.x).toBeCloseTo(0.41);
    expect(assembly.state).toBe("sheathed");

    assembly.setVisibleState("drawn");
    expect(assembly.state).toBe("drawn");
    expect(leftHand.getObjectByName("bow-visual")).toBeDefined();
    expect(spine.getObjectByName("archery-bow-back")?.getObjectByName("bow-visual")).toBeUndefined();
    assembly.setVisibleState("hidden");
    expect(assembly.roots.quiverBack.visible).toBe(false);
    expect(assembly.roots.harnessTorso.visible).toBe(false);
    assembly.dispose();
    expect(leftHand.getObjectByName("archery-bow-hand")).toBeUndefined();
    expect(spine.getObjectByName("archery-quiver-back")).toBeUndefined();
  });

  it("loads the shipping bow and every validated Tripo role from the public manifest", async () => {
    const paths: string[] = [];
    const loadAsset = vi.fn(async (path: string) => {
      paths.push(path);
      if (path === ARCHERY_BOW_ASSET_PATH) return texturedAsset(1);
      if (path === ARCHERY_ASSET_PATHS.quiver) return texturedAsset(0.64);
      if (path === ARCHERY_ASSET_PATHS.harness) return texturedAsset(0.48);
      return texturedAsset(0.94);
    });
    const loadManifest = vi.fn(async (path: string) => {
      expect(path).toBe(ARCHERY_ASSET_MANIFEST_PATH);
      return manifestDocument();
    });
    const loaded = await loadArcherySceneAssets({ loadAsset, loadManifest });

    expect(paths).toContain(ARCHERY_BOW_ASSET_PATH);
    expect(new Set(paths)).toEqual(new Set([ARCHERY_BOW_ASSET_PATH, ...Object.values(ARCHERY_ASSET_PATHS)]));
    expect(loaded.bow.name).toBe("shortbow-canonical-1.18m");
    expect(loaded.quiver.parent).toBeNull();
    expect(loaded.harness.parent).toBeNull();
    expect(Object.keys(loaded.arrows)).toEqual(["standard", "fire", "ice", "poison"]);
  });

  it("mounts to the production sharpshooter Fist and Torso bone aliases", () => {
    const model = new Group();
    const leftHand = Object.assign(new Group(), { name: "Fist.L" });
    const rightHand = Object.assign(new Group(), { name: "Fist.R" });
    const torso = Object.assign(new Group(), { name: "Torso" });
    model.add(leftHand, rightHand, torso);

    const assembly = createArcherySceneAssembly({
      model,
      projectileWorld: new Group(),
      actorScale: 1,
      inventory: createQuiverInventory({ standard: 10 }),
      assets: assets(),
      applyBowStringDraw: vi.fn(),
    });

    expect(leftHand.getObjectByName("archery-bow-hand")).toBeDefined();
    expect(rightHand.getObjectByName("archery-arrow-hand")).toBeDefined();
    expect(torso.getObjectByName("archery-quiver-back")).toBeDefined();
    expect(torso.getObjectByName("archery-harness-torso")).toBeDefined();
    assembly.dispose();
  });

  it("rejects rigs that would silently fall back to a shared or wrong socket", () => {
    const model = new Group();
    model.add(Object.assign(new Group(), { name: "mixamorigLeftHand" }));
    expect(() => createArcherySceneAssembly({
      model,
      projectileWorld: new Group(),
      actorScale: 1,
      inventory: createQuiverInventory({ standard: 10 }),
      assets: assets(),
      applyBowStringDraw: vi.fn(),
    })).toThrow(/RightHand rig bone/);
  });
});
