import type { MotionArchetypeContract } from "./motionArchetypes";

export type AvatarMotionPhase = "idle" | "locomotion" | "action" | "interaction" | "hit" | "death";
export type AvatarWeaponState = "hidden" | "sheathed" | "drawn";
export type LocomotionPreference = "auto" | "walk" | "run";

export interface AvatarMotionDecision {
  phase: AvatarMotionPhase;
  weapon: AvatarWeaponState;
  clipNames: readonly string[];
  once: boolean;
  playbackRate: number;
  blendSeconds: number;
}

const IDLE_RELAXED = ["IdleRelaxed", "Idle"] as const;
const IDLE_ARMED = ["IdleArmed", "IdleRelaxed", "Idle"] as const;

/**
 * The sole semantic owner of an actor's motion phase and weapon-aware recovery.
 * Three.js playback is deliberately injected by World3D; this class owns policy,
 * so gameplay call sites can no longer erase state with an unrelated raw Idle.
 */
export class AvatarMotionController {
  private phase: AvatarMotionPhase = "idle";
  private weapon: AvatarWeaponState = "sheathed";
  private active: AvatarMotionDecision = this.idleDecision();

  current(): AvatarMotionDecision {
    return this.active;
  }

  setWeapon(weapon: AvatarWeaponState): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    this.weapon = weapon;
    if (this.phase === "idle") this.active = this.idleDecision();
    return this.active;
  }

  idle(): AvatarMotionDecision {
    if (this.phase !== "idle") return this.active;
    this.active = this.idleDecision();
    return this.active;
  }

  beginLocomotion(stepCount: number, preference: LocomotionPreference = "auto"): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    const shouldRun = preference === "run" || (preference === "auto" && stepCount > 1);
    this.phase = "locomotion";
    this.active = {
      phase: "locomotion",
      weapon: this.weapon,
      clipNames: shouldRun ? ["RunBaseline", "RunMixamo", "Run"] : ["WalkBaseline", "Walk"],
      once: false,
      playbackRate: shouldRun ? 1.08 : 1,
      blendSeconds: 0.12,
    };
    return this.active;
  }

  beginAction(contract: MotionArchetypeContract): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    this.weapon = contract.weaponState;
    this.phase = "action";
    this.active = {
      phase: "action",
      weapon: this.weapon,
      clipNames: contract.clipNames,
      once: true,
      playbackRate: contract.playbackRate,
      blendSeconds: contract.blendSeconds,
    };
    return this.active;
  }

  beginGenericAction(clipNames: readonly string[], playbackRate = 1, blendSeconds = 0.1): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    this.phase = "action";
    this.active = {
      phase: "action",
      weapon: this.weapon,
      clipNames,
      once: true,
      playbackRate,
      blendSeconds,
    };
    return this.active;
  }

  beginInteraction(clipNames: readonly string[]): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    // Never rewrite the persistent weapon state here: an interaction must not
    // resurrect a sheathed blade after the player unequipped it. World3D hides
    // the visual for the duration of the bend/reach and restores it after.
    this.phase = "interaction";
    this.active = { phase: "interaction", weapon: this.weapon, clipNames, once: true, playbackRate: 1, blendSeconds: 0.1 };
    return this.active;
  }

  beginHit(): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    this.phase = "hit";
    this.active = {
      phase: "hit",
      weapon: this.weapon,
      clipNames: ["HitReactionMixamo", "RecieveHit", "Defeat"],
      once: true,
      playbackRate: 1,
      blendSeconds: 0.06,
    };
    return this.active;
  }

  beginDeath(): AvatarMotionDecision {
    this.phase = "death";
    this.active = {
      phase: "death",
      weapon: this.weapon,
      clipNames: ["DeathBaseline", "DeathMixamo", "Death"],
      once: true,
      playbackRate: 1,
      blendSeconds: 0.08,
    };
    return this.active;
  }

  revive(weapon: AvatarWeaponState = "sheathed"): AvatarMotionDecision {
    this.weapon = weapon;
    this.phase = "idle";
    this.active = this.idleDecision();
    return this.active;
  }

  complete(): AvatarMotionDecision {
    if (this.phase === "death") return this.active;
    this.phase = "idle";
    this.active = this.idleDecision();
    return this.active;
  }

  private idleDecision(): AvatarMotionDecision {
    return {
      phase: "idle",
      weapon: this.weapon,
      clipNames: this.weapon === "drawn" ? IDLE_ARMED : IDLE_RELAXED,
      once: false,
      playbackRate: 1,
      blendSeconds: 0.14,
    };
  }
}
