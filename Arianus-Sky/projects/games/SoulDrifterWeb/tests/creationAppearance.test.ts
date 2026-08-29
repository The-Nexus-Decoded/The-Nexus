import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  appearanceAgeStage,
  appearanceControlPercent,
  isCreatorAppearanceSelectionAvailable,
} from "../src/characterCreation";
import {
  EMPTY_CREATION_PREVIEW_AVAILABILITY,
  inspectCreationPreviewAvailability,
} from "../src/creationPreview";
import { resolveCharacterAppearance } from "../src/game/character";
import {
  MODULAR_APPEARANCE_PROVIDER_APPROVED,
  MODULAR_APPEARANCE_PROVIDER_STATUS_KEY,
} from "../src/game/presentation";

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
    face.morphTargetDictionary = { Age_Middle: 0, Age_Elder: 1 };
    model.add(face);

    expect(inspectCreationPreviewAvailability(model)).toEqual({
      hairStyles: ["shaved-buzzed", "cropped"],
      facialHair: ["none", "stubble"],
      ageMorphsAvailable: true,
    });
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
});
