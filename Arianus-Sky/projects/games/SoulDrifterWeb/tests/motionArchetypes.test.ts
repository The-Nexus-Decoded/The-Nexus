import { describe, expect, it } from "vitest";
import {
  ENEMY_MELEE_MOTION,
  MOTION_ARCHETYPE_IDS,
  MOTION_BY_SKILL_ID,
  MOTION_SKILL_IDS,
  UNARMED_KICK_MOTION,
  UNARMED_PUNCH_MOTION,
  WEAPON_STRIKE_MOTION,
} from "../src/game/motionArchetypes";

describe("motion archetype contracts", () => {
  it("keeps every required motion family addressable without race or calling forks", () => {
    expect(new Set(MOTION_ARCHETYPE_IDS).size).toBe(MOTION_ARCHETYPE_IDS.length);
    expect(MOTION_ARCHETYPE_IDS).toEqual(expect.arrayContaining([
      "stationary-horizontal-arc",
      "advancing-slash",
      "overhead-chop",
      "thrust",
      "rising-cut",
      "360-cleave",
      "dash-lunge",
      "retreating-counter",
      "shield-bash",
      "staff-sweep",
      "bow-crossbow",
      "casting-channeling",
      "jab-cross",
      "front-kick",
    ]));
  });

  it("routes the no-weapon fallback through simple grounded source motions", () => {
    expect(UNARMED_PUNCH_MOTION).toMatchObject({
      skillId: "weapon-strike",
      registryKey: "combat.basic.unarmed-punch",
      id: "jab-cross",
      clipNames: ["UnarmedPunch"],
      weaponFamily: "unarmed",
      grip: "unarmed",
      rootPolicy: "in-place",
      displacement: { tiles: 0, meters: 0 },
    });
    expect(UNARMED_KICK_MOTION).toMatchObject({
      skillId: "weapon-strike",
      registryKey: "combat.basic.unarmed-kick",
      id: "front-kick",
      clipNames: ["UnarmedKick"],
      weaponFamily: "unarmed",
      grip: "unarmed",
      rootPolicy: "in-place",
      displacement: { tiles: 0, meters: 0 },
    });
    expect(UNARMED_PUNCH_MOTION.clipNames).not.toContain("SwordComboMixamo");
    expect(UNARMED_KICK_MOTION.clipNames).not.toContain("SwordComboMixamo");
    expect(UNARMED_PUNCH_MOTION.footContacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ foot: "left" }),
      expect.objectContaining({ foot: "right" }),
    ]));
    expect(UNARMED_KICK_MOTION.footContacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ foot: "left", planted: [0, 1] }),
    ]));
  });

  it("owns Weapon Strike playback, grounding, event, and interrupt timing", () => {
    expect(WEAPON_STRIKE_MOTION).toMatchObject({
      skillId: "weapon-strike",
      registryKey: "combat.basic.weapon-strike",
      id: "stationary-horizontal-arc",
      weaponFamily: "sword",
      grip: "one-handed",
      handContacts: {
        dominant: { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" },
        support: { hand: "left", target: "free", intent: "balance-guard", continuity: "continuous" },
      },
      playbackRate: 0.65,
      rootPolicy: "in-place",
      displacement: { tiles: 0, meters: 0 },
      facing: "auto-face-target",
      hit: { shape: "frontal-arc", reachTiles: 1 },
      interruptibility: { telegraph: true, active: false, recovery: true },
    });
    expect(WEAPON_STRIKE_MOTION.timing.telegraph[1]).toBeLessThan(WEAPON_STRIKE_MOTION.timing.event.at);
    expect(WEAPON_STRIKE_MOTION.timing.event).toEqual({
      kind: "contact",
      at: WEAPON_STRIKE_MOTION.timing.recovery[0],
      marker: "weapon-strike.contact",
    });
    expect(WEAPON_STRIKE_MOTION.timing.cancelWindow[0]).toBeGreaterThan(WEAPON_STRIKE_MOTION.timing.event.at);
    expect(WEAPON_STRIKE_MOTION.footContacts.map(({ foot }) => foot)).toEqual(["left", "right"]);
  });

  it("gives enemy melee a readable wind-up, contact marker, and recovery at a clip-specific speed", () => {
    expect(ENEMY_MELEE_MOTION.clipNames.length).toBeGreaterThan(0);
    expect(ENEMY_MELEE_MOTION.playbackRate).toBeLessThanOrEqual(1);
    expect(ENEMY_MELEE_MOTION.timing.telegraph[1]).toBeLessThan(ENEMY_MELEE_MOTION.timing.event.at);
    expect(ENEMY_MELEE_MOTION.timing.event.at).toBe(ENEMY_MELEE_MOTION.timing.recovery[0]);
    expect(ENEMY_MELEE_MOTION.timing.recovery[1] - ENEMY_MELEE_MOTION.timing.recovery[0]).toBeGreaterThanOrEqual(0.3);
    expect(new Set([
      WEAPON_STRIKE_MOTION.playbackRate,
      UNARMED_PUNCH_MOTION.playbackRate,
      UNARMED_KICK_MOTION.playbackRate,
      ENEMY_MELEE_MOTION.playbackRate,
    ]).size).toBeGreaterThan(1);
    expect(Math.max(
      WEAPON_STRIKE_MOTION.playbackRate,
      UNARMED_PUNCH_MOTION.playbackRate,
      UNARMED_KICK_MOTION.playbackRate,
      ENEMY_MELEE_MOTION.playbackRate,
    )).toBeLessThanOrEqual(1.1);
  });

  it("registers the four current skills as actor-agnostic shared contracts", () => {
    expect(Object.keys(MOTION_BY_SKILL_ID)).toEqual(MOTION_SKILL_IDS);
    for (const skillId of MOTION_SKILL_IDS) {
      const contract = MOTION_BY_SKILL_ID[skillId];
      expect(contract.skillId).toBe(skillId);
      expect(contract.registryKey).toMatch(/^combat\./);
      expect(contract.clipNames.length).toBeGreaterThan(0);
      expect(contract.handContacts.dominant).toMatchObject(skillId === "recover"
        ? { hand: "right", target: "free", intent: "channel", continuity: "continuous" }
        : { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" });
      expect(contract.handContacts.support.hand).toBe("left");
      expect(contract.timing.telegraph[0]).toBeGreaterThanOrEqual(0);
      expect(contract.timing.telegraph[0]).toBeLessThanOrEqual(contract.timing.telegraph[1]);
      expect(contract.timing.telegraph[1]).toBeLessThanOrEqual(contract.timing.event.at);
      expect(contract.timing.event.marker).toContain(skillId);
      expect(contract.timing.event.at).toBeLessThanOrEqual(contract.timing.recovery[0]);
      expect(contract.timing.recovery[0]).toBeLessThanOrEqual(contract.timing.recovery[1]);
      expect(contract.timing.recovery[1]).toBeLessThanOrEqual(1);
      expect(contract.timing.cancelWindow[0]).toBeGreaterThanOrEqual(contract.timing.event.at);
      expect(contract.timing.cancelWindow[0]).toBeLessThanOrEqual(contract.timing.cancelWindow[1]);
      expect(contract.timing.cancelWindow[1]).toBeLessThanOrEqual(1);
      expect(contract).not.toHaveProperty("actorId");
      expect(contract).not.toHaveProperty("playerOnly");
    }
    expect(MOTION_BY_SKILL_ID.recover.clipNames[0]).toBe("CastSummon");
    expect(MOTION_BY_SKILL_ID["weapon-strike"].clipNames[0]).toBe("WeaponStrikeBaseline");
    expect(MOTION_BY_SKILL_ID["weapon-strike"].clipNames).not.toContain("BasicThrust");
    expect(MOTION_BY_SKILL_ID["weapon-strike"].playbackRate).toBe(0.65);
    expect(MOTION_BY_SKILL_ID["weapon-strike"].handContacts.support).toMatchObject({
      target: "free",
      intent: "balance-guard",
    });
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].id).toBe("stationary-horizontal-arc");
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].clipNames[0]).toBe("SiphonCleaveBaseline");
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].clipNames).not.toContain("SiphonCleaveSource");
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].playbackRate).toBe(0.47);
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].timing.event.at).toBe(0.88);
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].clipNames).not.toContain("SwordComboMixamo");
    expect(MOTION_BY_SKILL_ID["siphon-cleave"].handContacts.support).toMatchObject({
      target: "free",
      intent: "channel",
    });
    expect(MOTION_BY_SKILL_ID["cinder-guard"].timing.event.kind).toBe("release");
    expect(MOTION_BY_SKILL_ID["cinder-guard"].weaponState).toBe("drawn");
    expect(MOTION_BY_SKILL_ID.recover.weaponState).toBe("sheathed");
  });
});
