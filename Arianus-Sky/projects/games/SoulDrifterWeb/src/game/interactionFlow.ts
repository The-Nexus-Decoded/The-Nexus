export type InteractiveKind =
  | "npc"
  | "soul-well"
  | "chest"
  | "pillar"
  | "rubble"
  | "brazier"
  | "crate"
  | "bench"
  | "chair"
  | "gate"
  | "essence"
  | "memory-loom"
  | "training-effigy";

export interface InteractionCapability {
  destructible: boolean;
  questCritical: boolean;
  maxHp: number;
  protectionReason?: string;
}

const DESTRUCTIBLE_HP: Partial<Record<InteractiveKind, number>> = {
  chest: 10,
  pillar: 14,
  rubble: 5,
  brazier: 7,
  crate: 6,
  bench: 9,
  chair: 5,
};

const PROTECTED_KINDS = new Set<InteractiveKind>([
  "npc",
  "soul-well",
  "gate",
  "essence",
  "memory-loom",
  "training-effigy",
]);

export function interactionCapability(kind: InteractiveKind): InteractionCapability {
  if (PROTECTED_KINDS.has(kind)) {
    return {
      destructible: false,
      questCritical: true,
      maxHp: 0,
      protectionReason: "This quest-critical object is held by the Soulwell pattern and cannot be damaged.",
    };
  }
  const maxHp = DESTRUCTIBLE_HP[kind] ?? 0;
  return { destructible: maxHp > 0, questCritical: false, maxHp };
}

export type InteractionRequestPlan =
  | { action: "approach"; showPromptAfterApproach: true }
  | { action: "prompt"; showPromptAfterApproach: false }
  | { action: "disabled"; reason: string; showPromptAfterApproach: false };

export function planInteractionRequest(input: { distance: number; canApproach: boolean }): InteractionRequestPlan {
  if (input.distance <= 1) return { action: "prompt", showPromptAfterApproach: false };
  if (input.canApproach) return { action: "approach", showPromptAfterApproach: true };
  return {
    action: "disabled",
    reason: "No clear approach remains around that obstruction.",
    showPromptAfterApproach: false,
  };
}

export interface DestructibleHitResult {
  hp: number;
  destroyed: boolean;
  loot: "splintered-supply-cache" | null;
  protectionReason?: string;
}

export function applyDestructibleHit(input: {
  kind: InteractiveKind;
  hp: number;
  damage: number;
  seed: number;
}): DestructibleHitResult {
  const capability = interactionCapability(input.kind);
  if (!capability.destructible) {
    return {
      hp: input.hp,
      destroyed: false,
      loot: null,
      protectionReason: capability.protectionReason,
    };
  }
  const hp = Math.max(0, input.hp - Math.max(0, input.damage));
  return {
    hp,
    destroyed: hp === 0,
    loot: hp === 0 && input.seed % 4 === 0 ? "splintered-supply-cache" : null,
  };
}

export interface PortcullisFrame {
  y: number;
  blocksMovement: boolean;
  state: "sealed" | "lifting" | "open";
}

export function portcullisFrame(input: {
  progress: number;
  closedY: number;
  liftHeight: number;
}): PortcullisFrame {
  const progress = Math.max(0, Math.min(1, input.progress));
  const y = Number((input.closedY + input.liftHeight * progress).toFixed(4));
  return {
    y,
    blocksMovement: progress < 0.92,
    state: progress <= 0 ? "sealed" : progress < 0.92 ? "lifting" : "open",
  };
}

export function trialGatePresentation(difficulty: "wayfarer" | "oathbreaker"): {
  difficultyLabel: "Standard" | "Severe";
  rewardLabel: string;
} {
  return difficulty === "wayfarer"
    ? { difficultyLabel: "Standard", rewardLabel: "Wayfarer cache · steady reward" }
    : { difficultyLabel: "Severe", rewardLabel: "Oathbreaker cache · stronger reward" };
}
