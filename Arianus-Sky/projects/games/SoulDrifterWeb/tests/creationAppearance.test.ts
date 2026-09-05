import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  appearanceAgeStage,
  creatorViewOffset,
  appearanceControlPercent,
  appearanceDependentControls,
  isCreatorAppearanceSelectionAvailable,
  resetCreationStageScroll,
} from "../src/characterCreation";
import {
  bodyPreviewFitDistance,
  CreatorAdditivePose,
  CREATOR_GAZE_LIMITS,
  CREATOR_REACTION_CLIPS,
  CREATOR_RELAXED_IDLE_PACK,
  EMPTY_CREATION_PREVIEW_AVAILABILITY,
  inspectCreationPreviewAvailability,
  creatorBreathEnvelope,
  creatorGazeAngles,
  creatorWheelZoomStep,
  creationZoomedStop,
  previewModelUrl,
  resolveCreatorReactionSpec,
  stabilizeCreatorRelaxedIdle,
  type CreationPreviewReaction,
} from "../src/creationPreview";
import { HUMAN_FOUNDATION_MODEL_PATH } from "../src/game/avatarIdentity";
import { resolveCharacterAppearance, SKIN_TONES } from "../src/game/character";
import {
  applyModularAppearance,
  skinToneMaterialColor,
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
  hair.name = "SK_Hair_Cropped_Straight";
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
    cropped.name = "SK_Hair_Cropped_Straight";
    const stubble = new THREE.Group();
    stubble.name = "SK_FacialHair_Stubble";
    provider.add(cropped, stubble);

    const rejectedLegacyHair = new THREE.Group();
    rejectedLegacyHair.name = "SK_Hair_Long_Straight";
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
      hairTextures: ["straight"],
      hairStylesByTexture: {
        straight: ["shaved-buzzed", "cropped"],
        curly: ["shaved-buzzed"],
      },
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
    cropped.name = "SK_Hair_Cropped_Straight";
    const sourceHead = new THREE.Bone();
    sourceHead.name = "mixamorigHead";
    const fullBeard = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    fullBeard.name = "SK_FacialHair_FullBeard";
    fullBeard.bind(new THREE.Skeleton([sourceHead], [new THREE.Matrix4()]));
    const rejected = new THREE.Group();
    rejected.name = "SK_Hair_Long_Straight";
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

    expect(hydration.attachedModules).toEqual(["SK_Hair_Cropped_Straight", "SK_FacialHair_FullBeard"]);
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
    cropped.name = "SK_Hair_Cropped_Straight";
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

  it("keeps the creator's authored skin colour a Color when it isolates the skin material", async () => {
    // Material.clone() round-trips userData through JSON, which turns a THREE.Color
    // into a hex number; the creator copies from userData.authoredColor on every
    // appearance change, and copying a number into a Color yields NaN (a black body).
    const model = new THREE.Group();
    const sourceMaterial = tripoSkinMaterial();
    sourceMaterial.userData.authoredColor = new THREE.Color(0xcfbfba);
    const body = new THREE.Mesh(new THREE.BoxGeometry(), sourceMaterial);
    body.name = "HumanFoundation_Body";
    const provider = approvedProvider();
    const hair = approvedFollicleHair(
      "/assets/3d/characters/human-foundation-pilot/follicle-masks/test-authored-colour-v1.png",
    );
    provider.add(hair);
    model.add(body, provider);

    setHumanScalpFollicleUndercoat(model, hair, new THREE.Color(0x171412), async () => new THREE.Texture());
    await flushPromises();

    const material = body.material as THREE.MeshStandardMaterial;
    expect(material).not.toBe(sourceMaterial);
    const authored = material.userData.authoredColor as unknown;
    expect(authored).toBeInstanceOf(THREE.Color);
    expect((authored as THREE.Color).getHex()).toBe(0xcfbfba);
    expect(authored).not.toBe(sourceMaterial.userData.authoredColor);
    // the creator's next appearance change: copy the authored base, blend the tone
    const next = new THREE.Color().copy(authored as THREE.Color).lerp(new THREE.Color(0x8a6a58), 0.62);
    expect(Number.isFinite(next.r) && Number.isFinite(next.g) && Number.isFinite(next.b)).toBe(true);
    // and the plain-JSON shape the clone used to leave behind is exactly what breaks it
    const jsonRoundTrip = JSON.parse(JSON.stringify({ authoredColor: new THREE.Color(0xcfbfba) })).authoredColor;
    expect(typeof jsonRoundTrip).toBe("number");
    expect(Number.isFinite(new THREE.Color().copy(jsonRoundTrip as unknown as THREE.Color).r)).toBe(false);
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
      { hairStyle: "shaved-buzzed", hairTexture: "straight", facialHair: "none" },
      { hairStyles: ["shaved-buzzed"], facialHair: ["none"] } as never,
    )).toEqual({ hairColor: false, hairGreying: false, facialHairGreying: false });
    expect(appearanceDependentControls(
      { hairStyle: "long", hairTexture: "straight", facialHair: "stubble" },
      { hairStyles: ["shaved-buzzed", "long"], facialHair: ["none", "stubble"] } as never,
    )).toEqual({ hairColor: true, hairGreying: true, facialHairGreying: true });
  });

  // The body station used to roll the camera to `up = (-1, 0, 0)` and frame the
  // T-pose arm span, because `skeleton.pose()` double-applied the armature's
  // +90 deg X rotation and tipped the figure onto its side. Binding the idle
  // clip removed that bug, so the roll and its -PI/2 body yaw came out with it.
  // The figure is now upright and arms-down: world Y is screen-vertical.
  it("fits an upright figure by height, with world Y as the screen-vertical axis", () => {
    const boundsSize = new THREE.Vector3(0.29, 1.0, 0.22); // arms-down idle bounds
    const aspect = 0.75; // portrait canvas
    const fov = 30;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
    const expectedVerticalFit = (boundsSize.y / (2 * tanHalfFov)) * 1.2;

    expect(bodyPreviewFitDistance(boundsSize, aspect, fov)).toBeCloseTo(expectedVerticalFit, 6);
  });

  // A wide viewport must not crop the shoulders: below an aspect where height
  // alone suffices, the horizontal term has to win.
  it("falls back to the horizontal fit when the canvas is too narrow for the shoulders", () => {
    const boundsSize = new THREE.Vector3(2.4, 1.0, 0.22);
    const aspect = 0.4;
    const fov = 30;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
    const expectedHorizontalFit = (boundsSize.x / (2 * tanHalfFov * aspect)) * 1.2;

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

  // Regression: GLTFLoader runs node names through PropertyBinding.sanitizeNodeName,
  // which strips ":" - so the loaded rig exposes "mixamorigHead", never
  // "mixamorig:Head". The original matcher only recognised the authored colon
  // form, so at runtime it flattened 0 of 195 tracks while this suite stayed
  // green against hand-written colon-bearing names. Pin the runtime form.
  it("holds neck and head tracks neutral using the sanitized runtime bone names", () => {
    const sanitizedNeck = THREE.PropertyBinding.sanitizeNodeName("mixamorig:Neck");
    expect(sanitizedNeck).toBe("mixamorigNeck");

    const neck = new THREE.QuaternionKeyframeTrack(
      `${sanitizedNeck}.quaternion`,
      [0, 1],
      [0, 0, 0, 1, 0.1, 0, 0, 0.995],
    );
    const headTop = new THREE.VectorKeyframeTrack(
      `${THREE.PropertyBinding.sanitizeNodeName("mixamorig:HeadTop_End")}.position`,
      [0, 1],
      [0, 1.8, 0, 0, 1.84, 0.02],
    );
    const spine = new THREE.QuaternionKeyframeTrack(
      `${THREE.PropertyBinding.sanitizeNodeName("mixamorig:Spine2")}.quaternion`,
      [0, 1],
      [0, 0, 0, 1, 0.02, 0, 0, 0.9998],
    );

    const stabilized = stabilizeCreatorRelaxedIdle(new THREE.AnimationClip("Idle", 1, [neck, headTop, spine]));

    expect(Array.from(stabilized.tracks[0]!.values)).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
    // Both keyframes collapse onto the first frame's value (Float32, so compare
    // the halves rather than the authored literals).
    expect(Array.from(stabilized.tracks[1]!.values.slice(3))).toEqual(
      Array.from(stabilized.tracks[1]!.values.slice(0, 3)),
    );
    expect(Array.from(headTop.values.slice(3))).not.toEqual(Array.from(headTop.values.slice(0, 3)));
    expect(Array.from(stabilized.tracks[2]!.values)).toEqual(Array.from(spine.values));
  });

  // These pin the SHAPE of the breath curve, not its amplitude. Amplitude is a
  // visual judgement and is signed off from a render, never from a number - the
  // previous pass was rejected precisely because numeric gates stood in for
  // looking at the screen.
  it("shapes breathing as a quicker inhale and a slower release", () => {
    const period = 4.6;
    const inhale = 0.42;

    // Rests empty, fills to a single peak at the top of the inhale.
    expect(creatorBreathEnvelope(0)).toBeCloseTo(0, 6);
    expect(creatorBreathEnvelope(period * inhale)).toBeCloseTo(1, 6);

    // The release occupies more of the cycle than the inhale, so at the
    // midpoint of each the release is still fuller than the inhale was.
    expect(creatorBreathEnvelope(period * inhale * 0.5)).toBeLessThan(
      creatorBreathEnvelope(period * (inhale + (1 - inhale) * 0.5)),
    );

    // Never leaves 0..1, so amplitude stays exactly what the caller asked for.
    for (let step = 0; step <= 64; step += 1) {
      const value = creatorBreathEnvelope((period * step) / 64);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("keeps breathing periodic and defined for long-running and negative time", () => {
    const period = 4.6;
    expect(creatorBreathEnvelope(1.7)).toBeCloseTo(creatorBreathEnvelope(1.7 + period * 50), 6);
    expect(Number.isFinite(creatorBreathEnvelope(-3.2))).toBe(true);
    expect(creatorBreathEnvelope(-3.2)).toBeGreaterThanOrEqual(0);
  });

  it("resets inherited stage scroll after rendering a new creation step", () => {
    const stage = { scrollTop: 497, focusOwner: "appearance-heading" };

    resetCreationStageScroll(stage);

    expect(stage).toEqual({ scrollTop: 0, focusOwner: "appearance-heading" });
  });
});

describe("creator reactions and gaze", () => {
  it("resolves every reaction to an approved, prop-free, in-place Human clip", () => {
    for (const reaction of Object.keys(CREATOR_REACTION_CLIPS) as CreationPreviewReaction[]) {
      const spec = resolveCreatorReactionSpec(reaction);
      expect(spec, reaction).not.toBeNull();
      expect(["OWNER_APPROVED", "IN_GAME_QA_ACCEPTED"]).toContain(spec!.reviewStatus);
      expect(spec!.rootPolicy).toBe("in-place");
      expect(spec!.externalTargetBinding).toBeUndefined();
      expect(spec!.semanticClipName).toBe(CREATOR_REACTION_CLIPS[reaction].semanticClipName);
      expect(spec!.url).toMatch(/^\/assets\/3d\/animations\/human-foundation-pilot\//);
    }
  });

  it("turns the head toward the pointer and compensates the turntable within neck limits", () => {
    const maxYaw = THREE.MathUtils.degToRad(CREATOR_GAZE_LIMITS.yawDegrees);
    const maxPitch = THREE.MathUtils.degToRad(CREATOR_GAZE_LIMITS.pitchDegrees);
    expect(creatorGazeAngles(1, 0, 0).yaw).toBeCloseTo(maxYaw, 6);
    expect(creatorGazeAngles(-3, 0, 0).yaw).toBeCloseTo(-maxYaw, 6);
    expect(creatorGazeAngles(0, 1, 0).pitch).toBeCloseTo(maxPitch, 6);
    expect(creatorGazeAngles(0, -4, 0).pitch).toBeCloseTo(-maxPitch, 6);
    // Body turned an eighth of a turn toward screen-right: the head turns
    // back toward a pointer at the centre.
    expect(creatorGazeAngles(0, 0, Math.PI / 8).yaw).toBeCloseTo(-Math.PI / 8, 6);
    // Turned away entirely (and after several full turns): the neck's limit
    // holds, no whiplash.
    expect(Math.abs(creatorGazeAngles(0, 0, Math.PI).yaw)).toBeCloseTo(maxYaw, 6);
    expect(Math.abs(creatorGazeAngles(0, 0, 7 * Math.PI).yaw)).toBeCloseTo(maxYaw, 6);
    expect(creatorGazeAngles(0, 0, 4 * Math.PI).yaw).toBeCloseTo(0, 6);
  });
});

describe("creator additive pose", () => {
  function rig(): { root: THREE.Object3D; spine: THREE.Object3D; head: THREE.Object3D } {
    const root = new THREE.Object3D();
    const spine = new THREE.Object3D();
    spine.name = "mixamorigSpine";
    const head = new THREE.Object3D();
    head.name = "mixamorigHead";
    root.add(spine);
    spine.add(head);
    return { root, spine, head };
  }
  const HELD = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.2);
  function idleClip(): THREE.AnimationClip {
    const swing = [new THREE.Quaternion(), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.3)];
    return new THREE.AnimationClip("idle", 1, [
      new THREE.QuaternionKeyframeTrack("mixamorigSpine.quaternion", [0, 1], [...swing[0]!.toArray(), ...swing[1]!.toArray()]),
      // A stabilised track: every key holds the same value, like the creator's neck and head.
      new THREE.QuaternionKeyframeTrack("mixamorigHead.quaternion", [0, 1], [...HELD.toArray(), ...HELD.toArray()]),
    ]);
  }

  it("pins the three.js rule the layer must survive: an unchanged track is not rewritten", () => {
    const { root, head } = rig();
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(idleClip()).play();
    for (let frame = 0; frame < 3; frame += 1) mixer.update(1 / 60);
    expect(head.quaternion.angleTo(HELD)).toBeCloseTo(0, 6);
    const disturbed = HELD.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5));
    head.quaternion.copy(disturbed);
    mixer.update(1 / 60);
    // The mixer left the disturbed value in place: nothing resets the bone for us.
    expect(head.quaternion.angleTo(disturbed)).toBeCloseTo(0, 6);
  });

  it("keeps a per-frame additive offset from integrating on bones the mixer stops writing", () => {
    const { root, spine, head } = rig();
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(idleClip()).play();
    mixer.update(0);
    const pose = new CreatorAdditivePose();
    pose.register(head);
    pose.register(spine);
    expect(pose.size).toBe(2);
    const gaze = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(10));
    const breath = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(0.5));
    const spineOffsets: number[] = [];
    const headOffsets: number[] = [];
    for (let frame = 0; frame < 600; frame += 1) {
      pose.restore();
      mixer.update(1 / 60);
      pose.snapshot();
      const mixerSpine = spine.quaternion.clone();
      head.quaternion.multiply(gaze);
      spine.quaternion.multiply(breath);
      spineOffsets.push(THREE.MathUtils.radToDeg(spine.quaternion.angleTo(mixerSpine)));
      headOffsets.push(THREE.MathUtils.radToDeg(head.quaternion.angleTo(HELD)));
    }
    // Ten seconds of frames later the head carries exactly one gaze offset from the held value...
    expect(Math.max(...headOffsets)).toBeCloseTo(10, 3);
    expect(Math.min(...headOffsets)).toBeCloseTo(10, 3);
    // ...and the breathing spine carries exactly one breath offset from the mixer's pose every frame.
    expect(Math.max(...spineOffsets)).toBeCloseTo(0.5, 3);
    expect(Math.min(...spineOffsets)).toBeCloseTo(0.5, 3);
  });

  it("clears its joints so a released model is not written again", () => {
    const { head } = rig();
    const pose = new CreatorAdditivePose();
    pose.register(head);
    pose.clear();
    expect(pose.size).toBe(0);
    head.quaternion.set(0, 0.5, 0, Math.SQRT1_2);
    pose.restore();
    expect(head.quaternion.y).toBeCloseTo(0.5, 6);
  });
});

describe("creator preview model routing", () => {
  it("previews Humans on the foundation body and keeps the legacy bodies for legacy saves", () => {
    expect(previewModelUrl("human")).toBe(HUMAN_FOUNDATION_MODEL_PATH);
    expect(previewModelUrl("")).toBe(HUMAN_FOUNDATION_MODEL_PATH);
    expect(previewModelUrl("elf")).toBe("/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb");
    expect(previewModelUrl("dwarf")).toBe("/assets/3d/characters/human-shadowknight/human-shadowknight.glb");
    expect(previewModelUrl("halfling")).toBe("/assets/3d/characters/human-shadowknight/human-shadowknight.glb");
  });
});

describe("creator wheel zoom", () => {
  it("maps wheel input to a zoom step in the same range for pixels, lines and pages", () => {
    expect(creatorWheelZoomStep(-100, 0)).toBeCloseTo(100 / 900, 6);
    expect(creatorWheelZoomStep(100, 0)).toBeCloseTo(-100 / 900, 6);
    expect(creatorWheelZoomStep(-3, 1)).toBeCloseTo(48 / 900, 6);
    expect(creatorWheelZoomStep(-1, 2)).toBeCloseTo(400 / 900, 6);
    expect(creatorWheelZoomStep(0, 0)).toBe(0);
  });

  it("dollies from the station stop to the face stop and clamps at both ends", () => {
    const station = { position: new THREE.Vector3(0, 0.5, 2), target: new THREE.Vector3(0, 0.4, 0) };
    const face = { position: new THREE.Vector3(0, 0.9, 0.6), target: new THREE.Vector3(0, 0.9, 0) };
    expect(creationZoomedStop(station, face, 0).position.distanceTo(station.position)).toBeCloseTo(0, 6);
    expect(creationZoomedStop(station, face, 1).target.distanceTo(face.target)).toBeCloseTo(0, 6);
    const half = creationZoomedStop(station, face, 0.5);
    expect(half.position.z).toBeCloseTo(1.3, 6);
    expect(half.target.y).toBeCloseTo(0.65, 6);
    expect(creationZoomedStop(station, face, 4).position.distanceTo(face.position)).toBeCloseTo(0, 6);
    expect(creationZoomedStop(station, face, -2).position.distanceTo(station.position)).toBeCloseTo(0, 6);
    // the inputs are not mutated
    expect(station.position.z).toBe(2);
  });
});

describe("creator view offset", () => {
  it("centres the figure in the stage the folio leaves open at every desktop width", () => {
    expect(creatorViewOffset(1440, 440, false)).toBeCloseTo(440 / 1440 / 2, 6);
    expect(creatorViewOffset(1920, 520, false)).toBeCloseTo(520 / 1920 / 2, 6);
    // a 900 px window with a 46% folio used to get 0 and hid the figure behind the folio
    expect(creatorViewOffset(900, 414, false)).toBeCloseTo(0.23, 6);
    expect(creatorViewOffset(900, 414, true)).toBe(0);
    expect(creatorViewOffset(390, 390, false)).toBe(0);
    expect(creatorViewOffset(1440, 0, false)).toBe(0);
    expect(creatorViewOffset(1000, 900, false)).toBe(0.3);
  });
});

describe("skin tone material colour", () => {
  const luma = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  it("orders the palette from light to deep on the authored skin, which reads as Light untinted", () => {
    const base = new THREE.Color(0xffffff);
    const light = skinToneMaterialColor(base, SKIN_TONES.light.color);
    const fair = skinToneMaterialColor(base, SKIN_TONES.ashen.color);
    const brown = skinToneMaterialColor(base, SKIN_TONES.umber.color);
    const deep = skinToneMaterialColor(base, SKIN_TONES.deep.color);
    // the untinted foundation texture is the Light tone on the stage, so Light leaves the map alone
    expect(light.getHex()).toBe(0xffffff);
    expect(luma(fair)).toBeLessThan(luma(light));
    expect(luma(fair)).toBeGreaterThan(luma(light) * 0.4);
    expect(luma(brown)).toBeLessThan(luma(fair) * 0.6);
    expect(luma(deep)).toBeLessThan(luma(brown));
    // deep must read deep: about a tenth of the light skin's reflectance in linear light
    expect(luma(deep)).toBeLessThan(luma(light) * 0.12);
    expect(luma(deep)).toBeGreaterThan(luma(light) * 0.04);
  });
  it("writes into the given target, keeps the map's own base, and never blows out", () => {
    const base = new THREE.Color(0.8, 0.7, 0.6);
    const target = new THREE.Color();
    expect(skinToneMaterialColor(base, SKIN_TONES.light.color, target)).toBe(target);
    expect(base.r).toBeCloseTo(0.8, 6);
    expect(Math.max(target.r, target.g, target.b)).toBeLessThanOrEqual(0.8 * 1.25 + 1e-6);
  });
});
