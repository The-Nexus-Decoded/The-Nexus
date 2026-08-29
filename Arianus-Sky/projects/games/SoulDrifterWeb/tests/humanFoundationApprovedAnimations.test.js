import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HUMAN_FOUNDATION_APPROVED_ANIMATIONS,
  selectApprovedAnimationSource,
} from "../src/game/humanFoundationApprovedAnimations";

describe("issue #487 approved Human animation runtime registry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("installs only the owner-approved Lockpick bytes with dynamic door/lock bindings", async () => {
    vi.stubGlobal("self", globalThis);
    expect(HUMAN_FOUNDATION_APPROVED_ANIMATIONS).toHaveLength(1);
    const lockpick = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    expect(lockpick).toMatchObject({
      url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lockpick.glb",
      sourceClipName: "AuthoredUtility__Lockpick",
      semanticClipName: "AuthoredUtility__Lockpick",
      sourceSha256: "2AB154B7E9F58419A15D6F7C33557CFE77413F8B7448D507F1304DD06F84255A",
      rootPolicy: "in-place",
      rootNodeName: "mixamorigHips",
      groundedReferenceClipName: "MaleLocomotion__Idle",
      externalTargetBinding: {
        ownership: "EXTERNAL_GAMEPLAY_PROP",
        bindingSlot: "interaction-door-lock",
        propRole: "LOCKABLE_DOOR_CYLINDER",
        assetResolution: "INTERACTION_CONTEXT",
        actorAlignment: "FACE_TARGET_SQUARE",
        contactMode: "BILATERAL_TOOL_CONTACT",
        leftHandNode: "mixamorig:LeftHand",
        rightHandNode: "mixamorig:RightHand",
        requiredToolRoles: ["TENSION_WRENCH", "HOOK_PICK"],
        authoringProxyIncluded: false,
      },
    });
    expect(lockpick.externalTargetBinding).not.toHaveProperty("assetUrl");

    const runtimePath = resolve("public", lockpick.url.replace(/^\/assets\//, "assets/"));
    const runtimeBytes = readFileSync(runtimePath);
    expect(createHash("sha256").update(runtimeBytes).digest("hex").toUpperCase()).toBe(lockpick.sourceSha256);
    const arrayBuffer = runtimeBytes.buffer.slice(
      runtimeBytes.byteOffset,
      runtimeBytes.byteOffset + runtimeBytes.byteLength,
    );
    const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
    expect(gltf.animations.map((animation) => animation.name)).toEqual(["AuthoredUtility__Lockpick"]);

    const shippedMeshes = [];
    const shippedGuideNames = [];
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) shippedMeshes.push(object.name);
      if (/AUTHORING_CONTACT_GUIDE|LockpickDoor|PinTumblerCylinder|TensionWrench|HookPick/i.test(object.name)) {
        shippedGuideNames.push(object.name);
      }
    });
    expect(shippedMeshes).toEqual([]);
    expect(shippedGuideNames).toEqual([]);
  });

  it("fails closed when the approved source clip is absent", () => {
    const lockpick = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    expect(() => selectApprovedAnimationSource(lockpick, [{ name: "WrongClip" }]))
      .toThrow(`Approved animation pack ${lockpick.url} is missing ${lockpick.sourceClipName}.`);
  });
});
