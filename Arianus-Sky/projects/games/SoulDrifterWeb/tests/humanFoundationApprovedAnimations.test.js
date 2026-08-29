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

  it("installs only independently accepted motion-only bytes with explicit review state", async () => {
    vi.stubGlobal("self", globalThis);
    const expectedSpecs = [
      {
        url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lockpick.glb",
        sourceClipName: "AuthoredUtility__Lockpick",
        semanticClipName: "AuthoredUtility__Lockpick",
        sourceSha256: "2AB154B7E9F58419A15D6F7C33557CFE77413F8B7448D507F1304DD06F84255A",
        reviewStatus: "OWNER_APPROVED",
        rootPolicy: "in-place",
        rootNodeName: "mixamorigHips",
        groundedReferenceClipName: "MaleLocomotion__Idle",
      },
      {
        url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-spell-impact-knockback-fall.glb",
        sourceClipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
        semanticClipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
        sourceSha256: "6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E",
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        rootPolicy: "authored",
        rootNodeName: "mixamorigHips",
        groundedReferenceClipName: "MaleLocomotion__Idle",
      },
      {
        url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-npc-listen.glb",
        sourceClipName: "AuthoredUtility__NpcListen",
        semanticClipName: "AuthoredUtility__NpcListen",
        sourceSha256: "23615F625DC7C095D5BABF1358075060A6B69CC93FC7453AEDE88A8595F61DD6",
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        rootPolicy: "in-place",
        rootNodeName: "mixamorigHips",
        groundedReferenceClipName: "MaleLocomotion__Idle",
      },
      {
        url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-farewell.glb",
        sourceClipName: "AuthoredUtility__Farewell",
        semanticClipName: "AuthoredUtility__Farewell",
        sourceSha256: "760C60A83805918CB4034279998EC85F6A1D41E773F69DF850223DBF013E7F28",
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        rootPolicy: "in-place",
        rootNodeName: "mixamorigHips",
        groundedReferenceClipName: "MaleLocomotion__Idle",
      },
    ];

    expect(HUMAN_FOUNDATION_APPROVED_ANIMATIONS).toHaveLength(expectedSpecs.length);
    expect(HUMAN_FOUNDATION_APPROVED_ANIMATIONS).toMatchObject(expectedSpecs);

    const lockpick = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    expect(lockpick).toMatchObject({
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

    for (const spec of HUMAN_FOUNDATION_APPROVED_ANIMATIONS) {
      const runtimePath = resolve("public", spec.url.replace(/^\/assets\//, "assets/"));
      const runtimeBytes = readFileSync(runtimePath);
      expect(createHash("sha256").update(runtimeBytes).digest("hex").toUpperCase()).toBe(spec.sourceSha256);
      const arrayBuffer = runtimeBytes.buffer.slice(
        runtimeBytes.byteOffset,
        runtimeBytes.byteOffset + runtimeBytes.byteLength,
      );
      const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
      expect(gltf.animations.map((animation) => animation.name)).toEqual([spec.sourceClipName]);
      expect(gltf.animations[0].tracks.some((track) => track.name === `${spec.rootNodeName}.position`)).toBe(true);

      const shippedMeshes = [];
      const shippedGuideNames = [];
      let shippedBoneCount = 0;
      gltf.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) shippedMeshes.push(object.name);
        if (object instanceof THREE.Bone) shippedBoneCount += 1;
        if (/AUTHORING_CONTACT_GUIDE|proxy|guide|LockpickDoor|PinTumblerCylinder|TensionWrench|HookPick/i.test(object.name)) {
          shippedGuideNames.push(object.name);
        }
      });
      expect(shippedMeshes, `${spec.sourceClipName} must not ship proxy meshes`).toEqual([]);
      expect(shippedGuideNames, `${spec.sourceClipName} must not ship guide nodes`).toEqual([]);
      expect(shippedBoneCount, `${spec.sourceClipName} must preserve the accepted 65-bone rig`).toBe(65);
    }
  });

  it("fails closed when the approved source clip is absent", () => {
    const lockpick = HUMAN_FOUNDATION_APPROVED_ANIMATIONS[0];
    expect(() => selectApprovedAnimationSource(lockpick, [{ name: "WrongClip" }]))
      .toThrow(`Approved animation pack ${lockpick.url} is missing ${lockpick.sourceClipName}.`);
  });
});
