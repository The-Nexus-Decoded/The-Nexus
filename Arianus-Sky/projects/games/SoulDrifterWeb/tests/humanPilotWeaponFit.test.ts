import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  attachHumanPilotWeapon,
  HUMAN_PILOT_SOCKET_BONES,
  HUMAN_PILOT_WEAPON_FIT_SPECS,
  humanPilotWeaponFitSpec,
} from "../src/game/humanPilotWeaponFit";
import { ARCHERY_ASSET_PATHS } from "../src/game/archery/archeryAssetContract";

describe("Human Foundation V2 weapon-fit metadata", () => {
  it("keeps one unique source identity and runtime path per starter weapon", () => {
    expect(HUMAN_PILOT_WEAPON_FIT_SPECS).toHaveLength(11);
    expect(new Set(HUMAN_PILOT_WEAPON_FIT_SPECS.map(({ id }) => id)).size).toBe(11);
    expect(new Set(HUMAN_PILOT_WEAPON_FIT_SPECS.map(({ tripoModelId }) => tripoModelId)).size).toBe(11);
    expect(new Set(HUMAN_PILOT_WEAPON_FIT_SPECS.map(({ runtimeUrl }) => runtimeUrl)).size).toBe(11);
    expect(HUMAN_PILOT_SOCKET_BONES).toEqual({
      "right-hand": "mixamorigRightHand",
      "left-hand": "mixamorigLeftHand",
      hips: "mixamorigHips",
    });
  });

  it("records the measured longsword mesh and four-action grip correction", () => {
    const longsword = humanPilotWeaponFitSpec("iron_longsword");

    expect(longsword.drawn).toEqual({
      socket: "right-hand",
      positionMeters: [0, 0, 0],
      rotationRadians: [0, 0, -Math.PI / 2],
    });
    expect(longsword.gripProfile).toMatchObject({
      rig: "Human Foundation V2 Mixamo",
      socketName: "weapon-socket-hand-r",
      socketBone: "mixamorigRightHand",
      additiveSpace: "post-authored-bone-local",
      fingerCurlLocalXRadians: { index: 0.8, middle: 0.625, ring: 0.6, pinky: 0 },
      thumb: "authored-animation-unchanged",
      measuredFourFingerBoneCenterRadialMeters: [0.026748962, 0.027655218],
      meshCorrection: {
        operation: "radial-grip-reduction",
        radialScale: 0.65,
        blenderAxis: "+Z",
        runtimeAxis: "+Y",
        blenderRangeMeters: [-0.104, 0.106],
        transitionMeters: 0.018,
        originChanged: false,
        overallLengthChanged: false,
        correctedRuntimeSha256: "20f5f964405699065d77769bc86fa796d791ddf8144793f93c06066b0fb2b984",
      },
      verification: {
        issue458Commit: "23b203e9",
        result: "implemented-unverified-runtime-integration",
      },
    });
    expect(longsword.gripProfile?.validatedActions.map(({ clip }) => clip)).toEqual([
      "ProSwordAndShield__SwordAndShieldIdle",
      "ProSwordAndShield__SwordAndShieldAttack",
      "ProSwordAndShield__DrawSword1",
      "ProSwordAndShield__SheathSword1",
    ]);
  });

  it("uses the approved independent Tripo arrow and empty quiver instead of v1 placeholders", () => {
    const arrow = humanPilotWeaponFitSpec("arrow");
    const quiver = humanPilotWeaponFitSpec("quiver");

    expect(arrow).toMatchObject({
      tripoModelId: "cb10eebf-92de-4eff-95b0-541bdff9131a",
      runtimeUrl: ARCHERY_ASSET_PATHS["arrow-standard"],
      collisionEnvelopeMeters: [0.011, 0.94, 0.011],
    });
    expect(quiver).toMatchObject({
      tripoModelId: "7e65366b-7043-4776-ae77-6a8cb67be007",
      runtimeUrl: ARCHERY_ASSET_PATHS.quiver,
      collisionEnvelopeMeters: [0.24, 0.64, 0.2],
    });
    expect(arrow.runtimeUrl).not.toMatch(/v001\.glb$/);
    expect(quiver.runtimeUrl).not.toMatch(/v001\.glb$/);
  });

  it("attaches the corrected longsword transform without inheriting actor height scale", () => {
    const model = new THREE.Group();
    const hand = new THREE.Group();
    hand.name = "mixamorigRightHand";
    model.add(hand);
    const source = new THREE.Group();
    source.name = "canonical-longsword-source";
    const weapon = humanPilotWeaponFitSpec("iron_longsword");

    const attachment = attachHumanPilotWeapon(model, 1.03, source, weapon, "drawn");
    const offset = attachment.root.children[0]!;

    expect(attachment.socketBone).toBe(hand);
    expect(attachment.root.scale.toArray()).toEqual([1 / 1.03, 1 / 1.03, 1 / 1.03]);
    expect(offset.position.toArray()).toEqual([0, 0, 0]);
    expect(offset.rotation.z).toBeCloseTo(-Math.PI / 2, 8);
    expect(attachment.root.userData.gripProfile).toBe(weapon.gripProfile);
    expect(attachment.visual).not.toBe(source);
  });
});
