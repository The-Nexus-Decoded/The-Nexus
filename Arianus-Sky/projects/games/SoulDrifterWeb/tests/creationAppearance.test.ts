import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  appearanceAgeStage,
  appearanceControlPercent,
  appearanceDependentControls,
  isCreatorAppearanceSelectionAvailable,
  resetCreationStageScroll,
} from "../src/characterCreation";
import {
  bodyPreviewFitDistance,
  CREATOR_RELAXED_IDLE_PACK,
  EMPTY_CREATION_PREVIEW_AVAILABILITY,
  inspectCreationPreviewAvailability,
  stabilizeCreatorRelaxedIdle,
} from "../src/creationPreview";
import { resolveCharacterAppearance } from "../src/game/character";
import {
  applyModularAppearance,
  HUMAN_SCALP_FOLLICLE_MASK_SHA256_KEY,
  HUMAN_SCALP_FOLLICLE_MASK_SOURCE_HEAD_SHA256_KEY,
  HUMAN_SCALP_FOLLICLE_MASK_STATUS_KEY,
  HUMAN_SCALP_FOLLICLE_MASK_URL_KEY,
  HUMAN_SCALP_FOLLICLE_MASK_UV_SET_KEY,
  HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY,
  MODULAR_APPEARANCE_PROVIDER_APPROVED,
  MODULAR_APPEARANCE_PROVIDER_STATUS_KEY,
  setHumanScalpFollicleUndercoat,
} from "../src/game/presentation";
import {
  attachValidatedHumanAppearanceModules,
  createHumanAppearancePortraitController,
  HUMAN_DIALOGUE_MORPH_NAMES,
  inspectHumanAppearanceAvailability,
} from "../src/game/humanAppearanceAssembly";

function approvedProvider(): THREE.Group {
  const provider = new THREE.Group();
  provider.userData[MODULAR_APPEARANCE_PROVIDER_STATUS_KEY] = MODULAR_APPEARANCE_PROVIDER_APPROVED;
  return provider;
}

const FOLLICLE_SOURCE_HEAD_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8";
const TRIPO_MATERIAL_NAME = "tripo_079291c6_872f_4a79_8d7e_51aedb0891a6";

function approvedFollicleHair(url: string, strength = 0.24): THREE.Group {
  const hair = new THREE.Group();
  hair.name = "SK_Hair_Cropped";
  hair.userData[HUMAN_SCALP_FOLLICLE_MASK_STATUS_KEY] = "LOCAL_AUTHORING_VALIDATED";
  hair.userData[HUMAN_SCALP_FOLLICLE_MASK_URL_KEY] = url;
  hair.userData[HUMAN_SCALP_FOLLICLE_MASK_SHA256_KEY] = "A".repeat(64);
  hair.userData[HUMAN_SCALP_FOLLICLE_MASK_UV_SET_KEY] = "UVMap";
  hair.userData[HUMAN_SCALP_FOLLICLE_MASK_SOURCE_HEAD_SHA256_KEY] = FOLLICLE_SOURCE_HEAD_SHA256;
  hair.userData[HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY] = strength;
  return hair;
}

function tripoSkinMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), roughness: 0.73 });
  material.name = TRIPO_MATERIAL_NAME;
  material.normalMap = new THREE.Texture();
  material.roughnessMap = new THREE.Texture();
  return material;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("character-creator modular appearance contract", () => {
  it("discovers only provider-approved modules while keeping no-volume defaults available", () => {
    const model = new THREE.Group();
    const provider = approvedProvider();
    const cropped = new THREE.Group();
    cropped.name = "SK_Hair_Cropped";
    const stubble = new THREE.Group();
    stubble.name = "SK_FacialHair_Stubble";
    provider.add(cropped, stubble);

    const rejectedLegacyHair = new THREE.Group();
    rejectedLegacyHair.name = "SK_Hair_Long";
    model.add(provider, rejectedLegacyHair);

    const face = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    face.userData.souldrifterFacialReadiness = "READY";
    face.morphTargetDictionary = {
      Age_Middle: 0,
      Age_Elder: 1,
      Face_SoftRound: 2,
      Face_AngularHighCheek: 3,
      Face_BroadStrong: 4,
    };
    provider.add(face);

    expect(inspectCreationPreviewAvailability(model)).toEqual({
      faceTypes: ["foundation", "soft-round", "angular-high-cheek", "broad-strong"],
      hairStyles: ["shaved-buzzed", "cropped"],
      facialHair: ["none", "stubble"],
      ageMorphsAvailable: true,
      dialogueMorphsAvailable: false,
    });
  });

  it("attaches only locally validated locked modules and applies one compatible face morph", () => {
    const target = new THREE.Group();
    const headBone = new THREE.Bone();
    headBone.name = "mixamorigHead";
    target.add(headBone);
    const face = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    face.morphTargetDictionary = { Face_SoftRound: 0, Face_AngularHighCheek: 1, Face_BroadStrong: 2 };
    face.morphTargetInfluences = [0, 0, 0];
    target.add(face);

    const source = new THREE.Group();
    source.userData.souldrifterApprovalStatus = "LOCAL_AUTHORING_VALIDATED";
    const cropped = new THREE.Group();
    cropped.name = "SK_Hair_Cropped";
    const sourceHead = new THREE.Bone();
    sourceHead.name = "mixamorigHead";
    const fullBeard = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    fullBeard.name = "SK_FacialHair_FullBeard";
    fullBeard.bind(new THREE.Skeleton([sourceHead], [new THREE.Matrix4()]));
    const rejected = new THREE.Group();
    rejected.name = "SK_Hair_Long";
    rejected.userData.souldrifterApprovalStatus = "REJECTED";
    source.add(sourceHead, cropped, fullBeard);
    const rejectedRoot = new THREE.Group();
    rejectedRoot.add(rejected);
    source.add(rejectedRoot);

    const hydration = attachValidatedHumanAppearanceModules(target, source);
    const result = applyModularAppearance(target, {
      raceId: "human",
      hairStyle: "cropped",
      facialHair: "full-beard",
      faceType: "angular-high-cheek",
    });

    expect(hydration.attachedModules).toEqual(["SK_Hair_Cropped", "SK_FacialHair_FullBeard"]);
    expect(result).toMatchObject({
      hair: "applied",
      facialHair: "applied",
      faceMorphApplied: "Face_AngularHighCheek",
      missingProviderAssets: [],
    });
    expect(face.morphTargetInfluences).toEqual([0, 1, 0]);
    expect((fullBeard.skeleton.bones[0] as THREE.Bone)).toBe(headBone);
    expect(cropped.parent).toBe(headBone);
    expect(inspectHumanAppearanceAvailability(target).hairStyles).toContain("cropped");
  });

  it("recolors approved textured hair while preserving its authored strand map", () => {
    const model = new THREE.Group();
    const provider = approvedProvider();
    const cropped = new THREE.Group();
    cropped.name = "SK_Hair_Cropped";
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: new THREE.Texture(),
    });
    material.name = "MAT_HumanHair_Tintable_Cropped";
    cropped.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    provider.add(cropped);
    model.add(provider);

    const result = applyModularAppearance(model, {
      raceId: "human",
      hairStyle: "cropped",
      facialHair: "none",
      hairColor: "white",
    });

    expect(result.tintedMaterials).toBe(1);
    expect(material.color.getHex()).toBe(0xd7d3ca);
    expect(material.userData.souldrifterHairMapRecolor).toBe("souldrifter-hair-map-recolor-v2");
    expect(material.userData.souldrifterHairRuntimeMaterial).toBe("alpha-tested-msaa-anisotropic-cards-v2");
    expect(material.alphaHash).toBe(false);
    expect(material.alphaTest).toBeGreaterThanOrEqual(0.35);
    expect(material.alphaToCoverage).toBe(true);
    expect(material.transparent).toBe(false);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.metalness).toBe(0);
    expect(material.roughness).toBeGreaterThanOrEqual(0.58);
    expect(material.customProgramCacheKey()).toContain("souldrifter-hair-map-recolor-v2");

    const shader = { fragmentShader: "#include <map_fragment>" };
    (material.onBeforeCompile as unknown as (candidate: typeof shader, renderer: never) => void)(shader, undefined as never);
    expect(shader.fragmentShader).toContain("souldrifterHairLuma");
    expect(shader.fragmentShader).toContain("mix( 0.72, 1.18");
    expect(shader.fragmentShader).not.toContain("#include <map_fragment>");
  });

  it("blends an approved root-density mask after the exact Tripo 4K map without replacing PBR channels", async () => {
    const model = new THREE.Group();
    const sourceMaterial = tripoSkinMaterial();
    const baseMap = sourceMaterial.map;
    const normalMap = sourceMaterial.normalMap;
    const roughnessMap = sourceMaterial.roughnessMap;
    const body = new THREE.Mesh(new THREE.BoxGeometry(), sourceMaterial);
    body.name = "HumanFoundation_Body";
    const provider = approvedProvider();
    const hair = approvedFollicleHair(
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-contract-v1.png",
      0.28,
    );
    provider.add(hair);
    model.add(body, provider);
    const mask = new THREE.Texture();

    setHumanScalpFollicleUndercoat(
      model,
      hair,
      new THREE.Color(0x25140d),
      async () => mask,
    );
    expect(model.userData.souldrifterScalpFollicleUndercoat.status).toBe("LOADING");
    await flushPromises();

    const material = body.material as THREE.MeshStandardMaterial;
    expect(material).not.toBe(sourceMaterial);
    expect(material.map).toBe(baseMap);
    expect(material.normalMap).toBe(normalMap);
    expect(material.roughnessMap).toBe(roughnessMap);
    expect(material.roughness).toBe(0.73);
    expect(mask.flipY).toBe(false);
    expect(mask.colorSpace).toBe(THREE.NoColorSpace);
    expect(model.userData.souldrifterScalpFollicleUndercoat).toEqual({
      status: "ACTIVE",
      url: "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-contract-v1.png",
      strength: 0.28,
    });
    const stableProgramKey = material.customProgramCacheKey();
    const stableCompileHook = material.onBeforeCompile;
    const stableMaterialVersion = material.version;
    expect(stableProgramKey).toContain("souldrifter-scalp-follicle-undercoat-v2");

    // The appearance path supplies the final creator tint after greying, not
    // merely the base dye colour. Strength and tint update as uniforms against
    // the already cached mask, without forcing a new material program.
    hair.userData[HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY] = 0.22;
    applyModularAppearance(model, {
      raceId: "human",
      hairStyle: "cropped",
      facialHair: "none",
      hairColor: "black",
      hairGreying: 1,
    });
    expect(material.customProgramCacheKey()).toBe(stableProgramKey);
    expect(material.onBeforeCompile).toBe(stableCompileHook);
    expect(material.version).toBe(stableMaterialVersion);
    expect(model.userData.souldrifterScalpFollicleUndercoat.strength).toBe(0.22);

    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      fragmentShader: "void main() {\n#include <map_fragment>\n#include <normal_fragment_maps>\n#include <roughnessmap_fragment>\n}",
    };
    (material.onBeforeCompile as unknown as (candidate: typeof shader, renderer: never) => void)(
      shader,
      undefined as never,
    );
    expect(shader.fragmentShader.indexOf("#include <map_fragment>")).toBeLessThan(
      shader.fragmentShader.indexOf("souldrifterFollicleDensity"),
    );
    expect(shader.fragmentShader).toContain("#include <normal_fragment_maps>");
    expect(shader.fragmentShader).toContain("#include <roughnessmap_fragment>");
    expect(shader.fragmentShader).toContain("souldrifterFollicleTintChroma");
    expect(shader.fragmentShader).toContain("souldrifterFollicleRootShadow");
    expect(shader.fragmentShader).toContain("diffuseColor.rgb *=");
    expect(shader.fragmentShader).not.toContain("diffuseColor.rgb = mix(");
    expect((shader.uniforms.souldrifterFollicleMask!.value as THREE.Texture)).toBe(mask);
    expect((shader.uniforms.souldrifterFollicleTint!.value as THREE.Color).getHex()).toBe(0xa8a39b);
    expect(shader.uniforms.souldrifterFollicleStrength!.value).toBe(0.22);
  });

  it("fails closed when legacy follicle metadata exceeds the audited 0.30 strength ceiling", async () => {
    const model = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(), tripoSkinMaterial());
    body.name = "HumanFoundation_Body";
    const provider = approvedProvider();
    const hair = approvedFollicleHair(
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-strength-ceiling-v1.png",
      0.30,
    );
    provider.add(hair);
    model.add(body, provider);
    let loads = 0;
    const loader = async () => {
      loads += 1;
      return new THREE.Texture();
    };

    setHumanScalpFollicleUndercoat(model, hair, new THREE.Color(0x25140d), loader);
    await flushPromises();
    expect(model.userData.souldrifterScalpFollicleUndercoat.status).toBe("ACTIVE");

    hair.userData[HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY] = 0.68;
    setHumanScalpFollicleUndercoat(model, hair, new THREE.Color(0x25140d), loader);

    const state = (body.material as THREE.Material).userData.souldrifterScalpFollicleUniformState;
    expect(model.userData.souldrifterScalpFollicleUndercoat).toEqual({
      status: "DISABLED",
      reason: "missing-or-invalid-approved-mask",
    });
    expect(state.mask.value).toBeNull();
    expect(state.strength.value).toBe(0);
    expect(loads).toBe(1);
  });

  it("targets HeadBase but never BodyNoHead and rejects duplicate scalp or skin-channel underlays", async () => {
    const model = new THREE.Group();
    const sharedMaterial = tripoSkinMaterial();
    const body = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
    body.name = "HumanFoundation_BodyNoHead";
    const head = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
    head.name = "HumanFoundation_HeadBase";
    const provider = approvedProvider();
    const hair = approvedFollicleHair(
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-head-only-v1.png",
    );
    provider.add(hair);
    model.add(body, head, provider);
    const loader = async () => new THREE.Texture();

    setHumanScalpFollicleUndercoat(model, hair, new THREE.Color(0x2b160d), loader);
    await flushPromises();

    expect(body.material).toBe(sharedMaterial);
    expect(head.material).not.toBe(sharedMaterial);
    expect(sharedMaterial.userData.souldrifterScalpFollicleRuntime).toBeUndefined();
    expect((head.material as THREE.Material).userData.souldrifterScalpFollicleRuntime).toBe(
      "souldrifter-scalp-follicle-undercoat-v2",
    );

    const underlayMaterial = new THREE.MeshStandardMaterial();
    underlayMaterial.userData.souldrifterTintChannel = "SKIN";
    const forbiddenUnderlay = new THREE.Mesh(new THREE.BoxGeometry(), underlayMaterial);
    forbiddenUnderlay.name = "RootUnderlay";
    hair.add(forbiddenUnderlay);
    setHumanScalpFollicleUndercoat(model, hair, new THREE.Color(0x2b160d), loader);
    expect(model.userData.souldrifterScalpFollicleUndercoat.status).toBe("DISABLED");
  });

  it("caches masks by URL, isolates model uniforms, and ignores stale async mask requests", async () => {
    const sharedMaterial = tripoSkinMaterial();
    const makeModel = (suffix: string) => {
      const model = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
      body.name = "HumanFoundation_Body";
      const provider = approvedProvider();
      const hair = approvedFollicleHair(
        `/assets/3d/characters/human-foundation-pilot/follicle-masks/test-cache-${suffix}.png`,
      );
      provider.add(hair);
      model.add(body, provider);
      return { model, body, hair };
    };
    const first = makeModel("shared-v1");
    const second = makeModel("shared-v1");
    let sharedLoads = 0;
    const sharedMask = new THREE.Texture();
    const sharedLoader = async () => {
      sharedLoads += 1;
      return sharedMask;
    };
    setHumanScalpFollicleUndercoat(first.model, first.hair, new THREE.Color(0x25140d), sharedLoader);
    setHumanScalpFollicleUndercoat(second.model, second.hair, new THREE.Color(0xa8a39b), sharedLoader);
    await flushPromises();

    expect(sharedLoads).toBe(1);
    expect(first.body.material).not.toBe(second.body.material);
    const firstState = (first.body.material as THREE.Material).userData.souldrifterScalpFollicleUniformState;
    const secondState = (second.body.material as THREE.Material).userData.souldrifterScalpFollicleUniformState;
    expect(firstState).not.toBe(secondState);
    expect(firstState.tint.value.getHex()).toBe(0x25140d);
    expect(secondState.tint.value.getHex()).toBe(0xa8a39b);

    let resolveOld!: (texture: THREE.Texture) => void;
    let resolveNew!: (texture: THREE.Texture) => void;
    first.hair.userData[HUMAN_SCALP_FOLLICLE_MASK_URL_KEY] =
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-race-old.png";
    setHumanScalpFollicleUndercoat(
      first.model,
      first.hair,
      new THREE.Color(0x31190f),
      () => new Promise((resolve) => { resolveOld = resolve as (texture: THREE.Texture) => void; }),
    );
    first.hair.userData[HUMAN_SCALP_FOLLICLE_MASK_URL_KEY] =
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-race-new.png";
    setHumanScalpFollicleUndercoat(
      first.model,
      first.hair,
      new THREE.Color(0x412015),
      () => new Promise((resolve) => { resolveNew = resolve as (texture: THREE.Texture) => void; }),
    );
    const newMask = new THREE.Texture();
    resolveNew(newMask);
    await flushPromises();
    resolveOld(new THREE.Texture());
    await flushPromises();
    expect(first.model.userData.souldrifterScalpFollicleUndercoat.url).toContain("test-race-new.png");
    expect(firstState.mask.value).toBe(newMask);
    expect(firstState.tint.value.getHex()).toBe(0x412015);

    setHumanScalpFollicleUndercoat(first.model, undefined, new THREE.Color(0));
    expect(first.model.userData.souldrifterScalpFollicleUndercoat.status).toBe("DISABLED");
    expect(firstState.mask.value).toBeNull();
    expect(firstState.strength.value).toBe(0);
  });

  it("creates a dialogue portrait from the same assembled identity without mutating the world actor", () => {
    const worldActor = new THREE.Group();
    const worldFace = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    worldFace.morphTargetDictionary = Object.fromEntries(HUMAN_DIALOGUE_MORPH_NAMES.map((name, index) => [name, index]));
    worldFace.morphTargetInfluences = HUMAN_DIALOGUE_MORPH_NAMES.map(() => 0);
    worldActor.add(worldFace);

    const portrait = createHumanAppearancePortraitController(worldActor, "ilyra");
    portrait.beginDialogue("Welcome back, returned soul.", 0);
    portrait.update(0.24);
    const portraitFace = portrait.model.children[0] as THREE.Mesh;

    expect(portrait.capability.status).toBe("READY");
    expect(portrait.model.userData.souldrifterPortraitSource).toBe(worldActor.uuid);
    expect(portraitFace.morphTargetInfluences?.some((weight) => weight > 0)).toBe(true);
    expect(worldFace.morphTargetInfluences?.every((weight) => weight === 0)).toBe(true);
  });

  it("fails closed when a saved selection has no canonical provider geometry", () => {
    const ready = inspectCreationPreviewAvailability(approvedProvider());
    expect(isCreatorAppearanceSelectionAvailable(resolveCharacterAppearance({
      hairStyle: "shaved-buzzed",
      skinTone: "deep",
      facialHair: "none",
      age: 0,
    }), ready)).toBe(true);
    expect(isCreatorAppearanceSelectionAvailable(resolveCharacterAppearance({
      hairStyle: "long",
      skinTone: "deep",
      facialHair: "none",
      age: 0,
    }), ready)).toBe(false);
    expect(isCreatorAppearanceSelectionAvailable(resolveCharacterAppearance({
      hairStyle: "shaved-buzzed",
      skinTone: "deep",
      facialHair: "none",
      age: 0.5,
    }), EMPTY_CREATION_PREVIEW_AVAILABILITY)).toBe(false);
  });

  it("labels and clamps the normalized age and greying controls deterministically", () => {
    expect(appearanceAgeStage(-1)).toBe("Young Adult");
    expect(appearanceAgeStage(0.5)).toBe("Middle-Aged");
    expect(appearanceAgeStage(1)).toBe("Elder");
    expect(appearanceControlPercent(-0.2)).toBe(0);
    expect(appearanceControlPercent(0.486)).toBe(49);
    expect(appearanceControlPercent(3)).toBe(100);
  });

  it("keeps color and greying controls disabled until visible canonical hair exists", () => {
    expect(appearanceDependentControls(
      { hairStyle: "shaved-buzzed", facialHair: "none" },
      { hairStyles: ["shaved-buzzed"], facialHair: ["none"] },
    )).toEqual({ hairColor: false, hairGreying: false, facialHairGreying: false });
    expect(appearanceDependentControls(
      { hairStyle: "long", facialHair: "stubble" },
      { hairStyles: ["shaved-buzzed", "long"], facialHair: ["none", "stubble"] },
    )).toEqual({ hairColor: true, hairGreying: true, facialHairGreying: true });
  });

  it("fits the complete T-pose arm span inside a portrait creator canvas", () => {
    const boundsSize = new THREE.Vector3(1.8, 2.2, 0.4);
    const aspect = 0.75;
    const fov = 35;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
    const expectedHorizontalFit = (boundsSize.y / (2 * tanHalfFov * aspect)) * 1.2;

    expect(bodyPreviewFitDistance(boundsSize, aspect, fov)).toBeCloseTo(expectedHorizontalFit, 6);
  });

  it("uses the stable locomotion idle for face inspection instead of the nodding NPC-listen clip", () => {
    expect(CREATOR_RELAXED_IDLE_PACK).toEqual({
      url: "/assets/3d/animations/human-foundation-pilot/review-packs/human-foundation-pilot-review-male-locomotion-01.glb",
      sourceClipName: "MaleLocomotion__Idle",
    });
    expect(CREATOR_RELAXED_IDLE_PACK.sourceClipName).not.toContain("NpcListen");
  });

  it("holds neck and head tracks neutral while preserving torso breathing", () => {
    const neck = new THREE.QuaternionKeyframeTrack(
      "mixamorig:Neck.quaternion",
      [0, 0.5, 1],
      [0, 0, 0, 1, 0.1, 0, 0, 0.995, -0.1, 0, 0, 0.995],
    );
    const head = new THREE.VectorKeyframeTrack(
      "mixamorig:Head.position",
      [0, 1],
      [0, 1.6, 0, 0, 1.64, 0.02],
    );
    const spine = new THREE.QuaternionKeyframeTrack(
      "mixamorig:Spine2.quaternion",
      [0, 1],
      [0, 0, 0, 1, 0.02, 0, 0, 0.9998],
    );
    const source = new THREE.AnimationClip("Idle", 1, [neck, head, spine]);

    const stabilized = stabilizeCreatorRelaxedIdle(source);

    expect(Array.from(stabilized.tracks[0]!.values)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(Array.from(stabilized.tracks[1]!.values.slice(3))).toEqual(
      Array.from(stabilized.tracks[1]!.values.slice(0, 3)),
    );
    expect(Array.from(stabilized.tracks[2]!.values)).toEqual(Array.from(spine.values));
    expect(Array.from(neck.values)).not.toEqual(Array.from(stabilized.tracks[0]!.values));
  });

  it("resets inherited stage scroll after rendering a new creation step", () => {
    const stage = { scrollTop: 497, focusOwner: "appearance-heading" };

    resetCreationStageScroll(stage);

    expect(stage).toEqual({ scrollTop: 0, focusOwner: "appearance-heading" });
  });
});
