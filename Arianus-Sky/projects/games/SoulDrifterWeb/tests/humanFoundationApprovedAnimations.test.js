import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HUMAN_FOUNDATION_APPROVED_ANIMATIONS,
  selectApprovedAnimationSource,
} from "../src/game/humanFoundationApprovedAnimations";

describe("issue #487 approved Human animation runtime registry", () => {
  it("selects the owner-approved Lift bytes and requires an external gameplay prop binding", () => {
    expect(HUMAN_FOUNDATION_APPROVED_ANIMATIONS).toHaveLength(1);
    const lift = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    const selected = selectApprovedAnimationSource(lift, [
      { name: "Unrelated" },
      { name: "AuthoredUtility__Lift" },
    ]);

    expect(selected.name).toBe("AuthoredUtility__Lift");
    expect(lift).toMatchObject({
      url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lift.glb",
      semanticClipName: "AuthoredUtility__Lift",
      sourceSha256: "2C8AC197732B8852128B77E154F7FE8D2A0816A88CC9C3FC9E7BADC5589506C1",
      rootPolicy: "authored",
      externalPropBinding: {
        ownership: "EXTERNAL_GAMEPLAY_PROP",
        bindingSlot: "interaction-carried-object",
        propRole: "LIFTABLE_OBJECT",
        assetResolution: "INTERACTION_CONTEXT",
        attachmentMode: "BILATERAL_HAND_TARGETS",
        leftHandNode: "mixamorig:LeftHand",
        rightHandNode: "mixamorig:RightHand",
        releaseAtClipEnd: false,
        authoringProxyIncluded: false,
      },
    });
    expect(lift.externalPropBinding).not.toHaveProperty("assetUrl");

    const runtimePath = resolve("public", lift.url.replace(/^\/assets\//, "assets/"));
    const runtimeBytes = readFileSync(runtimePath);
    expect(createHash("sha256").update(runtimeBytes).digest("hex").toUpperCase()).toBe(lift.sourceSha256);
  });

  it("fails closed when the approved source clip is absent", () => {
    const lift = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    expect(() => selectApprovedAnimationSource(lift, [{ name: "WrongClip" }]))
      .toThrow(`Approved animation pack ${lift.url} is missing ${lift.sourceClipName}.`);
  });
});
