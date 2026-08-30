import {
  MULTISHOT_ARROW_COUNT,
  commitArrowRelease,
  visibleQuiverArrowCount,
  type ArrowReleaseResult,
  type ArrowType,
  type QuiverInventoryState,
} from "./archeryInventory";

export const MINIMUM_BOW_RANGE_METERS = 1.5;

export type ArcheryAction = "single-shot" | "multishot";
export type ArcheryArrowPhase =
  | "stored"
  | "reaching"
  | "gripped"
  | "extracted"
  | "nocked"
  | "drawn"
  | "released"
  | "projectile"
  | "recovered";

export interface ArcheryActionState {
  action: ArcheryAction;
  phase: ArcheryArrowPhase;
  heldArrowCount: number;
  arrowType: ArrowType;
  stringDraw: number;
}

export type BowRangeDecision = "shoot" | "bow-strike" | "switch-to-melee";

const NEXT_PHASE: Readonly<Partial<Record<ArcheryArrowPhase, ArcheryArrowPhase>>> = {
  stored: "reaching",
  reaching: "gripped",
  gripped: "extracted",
  extracted: "nocked",
  nocked: "drawn",
  drawn: "released",
  released: "projectile",
  projectile: "recovered",
};

export function beginArcheryAction(inventory: QuiverInventoryState, action: ArcheryAction): ArcheryActionState {
  return {
    action,
    phase: "stored",
    heldArrowCount: action === "multishot" ? MULTISHOT_ARROW_COUNT : 1,
    arrowType: inventory.selectedType,
    stringDraw: 0,
  };
}

export function advanceArcheryPhase(state: ArcheryActionState, expectedPhase: ArcheryArrowPhase): ArcheryActionState {
  const next = NEXT_PHASE[state.phase];
  if (next !== expectedPhase) throw new Error(`Invalid archery transition ${state.phase} -> ${expectedPhase}.`);
  return {
    ...state,
    phase: expectedPhase,
    stringDraw: expectedPhase === "drawn" ? 1 : expectedPhase === "released" ? 0 : state.stringDraw,
  };
}

export function displayedQuiverCount(inventory: QuiverInventoryState, state?: ArcheryActionState): number {
  const reserved = state && ["gripped", "extracted", "nocked", "drawn"].includes(state.phase)
    ? state.heldArrowCount
    : 0;
  return Math.max(0, visibleQuiverArrowCount(inventory) - reserved);
}

export function commitArcheryRelease(
  inventory: QuiverInventoryState,
  state: ArcheryActionState,
): { state: ArcheryActionState; release: ArrowReleaseResult } {
  if (state.phase !== "drawn") throw new Error("An arrow can only release from full draw.");
  if (state.arrowType !== inventory.selectedType) throw new Error("Selected arrow type changed during the active shot.");
  const release = commitArrowRelease(inventory, state.heldArrowCount);
  if (!release.released) return { state: { ...state }, release };
  return { state: advanceArcheryPhase(state, "released"), release };
}

export function cancelArcheryAction(state: ArcheryActionState): ArcheryActionState {
  if (["released", "projectile"].includes(state.phase)) throw new Error("A released arrow cannot return to the quiver.");
  return { ...state, phase: "stored", stringDraw: 0 };
}

export function bowRangeDecision(
  targetDistanceMeters: number,
  hasBowStrike = true,
): BowRangeDecision {
  if (targetDistanceMeters >= MINIMUM_BOW_RANGE_METERS) return "shoot";
  return hasBowStrike ? "bow-strike" : "switch-to-melee";
}
