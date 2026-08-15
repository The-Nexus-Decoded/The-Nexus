import { describe, expect, it } from "vitest";
import { AvatarMotionController } from "../src/game/avatarMotionController";
import { CINDER_GUARD_MOTION, RECOVER_MOTION, WEAPON_STRIKE_MOTION } from "../src/game/motionArchetypes";

describe("avatar motion state controller", () => {
  it("selects a walk for exactly one tile and a run for longer paths", () => {
    const controller = new AvatarMotionController();
    expect(controller.beginLocomotion(1, "auto").clipNames[0]).toBe("WalkBaseline");
    controller.complete();
    expect(controller.beginLocomotion(2, "auto").clipNames[0]).toBe("RunBaseline");
  });

  it("honors an explicit walk or run preference independently of path length", () => {
    const controller = new AvatarMotionController();
    expect(controller.beginLocomotion(4, "walk").clipNames[0]).toBe("WalkBaseline");
    controller.complete();
    expect(controller.beginLocomotion(1, "run").clipNames[0]).toBe("RunBaseline");
  });

  it("owns relaxed and armed idle recovery instead of accepting a raw generic Idle reset", () => {
    const controller = new AvatarMotionController();
    expect(controller.idle().clipNames[0]).toBe("IdleRelaxed");
    controller.setWeapon("drawn");
    expect(controller.idle().clipNames[0]).toBe("IdleArmed");
    controller.beginAction(WEAPON_STRIKE_MOTION);
    expect(controller.idle()).toMatchObject({ phase: "action", clipNames: WEAPON_STRIKE_MOTION.clipNames });
    expect(controller.complete()).toMatchObject({ phase: "idle", weapon: "drawn" });
  });

  it("keeps Cinder Guard sword-aware and makes Recover explicitly hands-free", () => {
    expect(CINDER_GUARD_MOTION).toMatchObject({
      weaponState: "drawn",
      torsoIntent: "ward-cast",
      handContacts: {
        dominant: { target: "hilt" },
        support: { target: "free", intent: "ward" },
      },
    });
    expect(CINDER_GUARD_MOTION.clipNames[0]).toBe("CastWard");
    expect(RECOVER_MOTION).toMatchObject({
      weaponState: "sheathed",
      torsoIntent: "recovery-channel",
      handContacts: {
        dominant: { target: "free" },
        support: { target: "free" },
      },
    });
  });

  it("does not leave death and returns hit reactions to the correct weapon-aware idle", () => {
    const controller = new AvatarMotionController();
    controller.setWeapon("drawn");
    controller.beginHit();
    expect(controller.complete()).toMatchObject({ phase: "idle", weapon: "drawn", clipNames: ["IdleArmed", "IdleRelaxed", "Idle"] });
    controller.beginDeath();
    expect(controller.complete()).toMatchObject({ phase: "death" });
    expect(controller.beginLocomotion(2)).toMatchObject({ phase: "death" });
    expect(controller.current().clipNames).toEqual(["DeathBaseline", "DeathMixamo", "Death"]);
  });

  it("has one explicit revive transition after the grounded death lock", () => {
    const controller = new AvatarMotionController();
    controller.setWeapon("drawn");
    controller.beginDeath();
    expect(controller.revive("sheathed")).toMatchObject({
      phase: "idle",
      weapon: "sheathed",
      clipNames: ["IdleRelaxed", "Idle"],
    });
  });
});
