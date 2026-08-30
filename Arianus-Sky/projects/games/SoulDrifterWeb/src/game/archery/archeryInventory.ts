export const QUIVER_CAPACITY = 100;
export const MULTISHOT_ARROW_COUNT = 3;

export type ArrowType = "standard" | "fire" | "ice" | "poison";

export const ARROW_TYPES: readonly ArrowType[] = ["standard", "fire", "ice", "poison"];

export interface QuiverInventoryState {
  capacity: number;
  selectedType: ArrowType;
  arrows: Record<ArrowType, number>;
}

export type ArrowReleaseFailure = "invalid-count" | "insufficient-arrows";

export interface ArrowReleaseResult {
  released: boolean;
  arrowType: ArrowType;
  count: number;
  remaining: number;
  reason?: ArrowReleaseFailure;
}

function wholeNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function quiverArrowCount(state: QuiverInventoryState): number {
  return ARROW_TYPES.reduce((total, type) => total + wholeNonNegative(state.arrows[type]), 0);
}

export function createQuiverInventory(
  counts: Partial<Record<ArrowType, number>> = { standard: 10 },
  selectedType: ArrowType = "standard",
  capacity = QUIVER_CAPACITY,
): QuiverInventoryState {
  const state: QuiverInventoryState = {
    capacity: wholeNonNegative(capacity),
    selectedType,
    arrows: {
      standard: wholeNonNegative(counts.standard ?? 0),
      fire: wholeNonNegative(counts.fire ?? 0),
      ice: wholeNonNegative(counts.ice ?? 0),
      poison: wholeNonNegative(counts.poison ?? 0),
    },
  };
  if (quiverArrowCount(state) > state.capacity) throw new Error("Quiver contents exceed capacity.");
  return state;
}

export function selectArrowType(state: QuiverInventoryState, type: ArrowType): boolean {
  if (state.arrows[type] <= 0) return false;
  state.selectedType = type;
  return true;
}

export function addArrowsToQuiver(state: QuiverInventoryState, type: ArrowType, count: number): number {
  const requested = wholeNonNegative(count);
  const accepted = Math.min(requested, Math.max(0, state.capacity - quiverArrowCount(state)));
  state.arrows[type] += accepted;
  return accepted;
}

/**
 * Commits ammunition only at the release marker. Failed single or multishot
 * releases are atomic and never partially consume a quiver stack.
 */
export function commitArrowRelease(state: QuiverInventoryState, count = 1): ArrowReleaseResult {
  if (!Number.isInteger(count) || count <= 0) {
    return {
      released: false,
      arrowType: state.selectedType,
      count: 0,
      remaining: state.arrows[state.selectedType],
      reason: "invalid-count",
    };
  }
  const available = state.arrows[state.selectedType];
  if (available < count) {
    return {
      released: false,
      arrowType: state.selectedType,
      count: 0,
      remaining: available,
      reason: "insufficient-arrows",
    };
  }
  state.arrows[state.selectedType] -= count;
  return {
    released: true,
    arrowType: state.selectedType,
    count,
    remaining: state.arrows[state.selectedType],
  };
}

export function visibleQuiverArrowCount(state: QuiverInventoryState): number {
  return Math.min(state.capacity, quiverArrowCount(state));
}
