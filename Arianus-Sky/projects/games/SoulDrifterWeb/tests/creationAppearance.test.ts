import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  appearanceAgeStage,
  appearanceControlPercent,
  isCreatorAppearanceSelectionAvailable,
  resetCreationStageScroll,
} from "../src/characterCreation";
import {
  EMPTY_CREATION_PREVIEW_AVAILABILITY,
  inspectCreationPreviewAvailability,
} from "../src/creationPreview";
import { resolveCharacterAppearance } from "../src/game/character";
import {
  applyModularAppearance,
  MODULAR_APPEARANCE_PROVIDER_APPROVED,
  MODULAR_APPEARANCE_PROVIDER_STATUS_KEY,
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

  it("resets inherited stage scroll after rendering a new creation step", () => {
    const stage = { scrollTop: 497, focusOwner: "appearance-heading" };

    resetCreationStageScroll(stage);

    expect(stage).toEqual({ scrollTop: 0, focusOwner: "appearance-heading" });
  });
});
