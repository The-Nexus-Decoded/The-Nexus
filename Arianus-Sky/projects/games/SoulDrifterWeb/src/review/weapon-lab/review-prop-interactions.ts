import type { CombatReviewSnapshot } from "./combat-review-controller";

const smoothstep = (phase: number, start: number, end: number): number => {
  const value = Math.max(0, Math.min(1, (phase - start) / (end - start)));
  return value * value * (3 - 2 * value);
};

/** Source-timed prop pose only. It is not hand IK, collision or gameplay state. */
export function reviewPropInteractionFrame(propKind: string, snapshot: CombatReviewSnapshot):
  { readonly joints: Readonly<Record<string, number>>; readonly note: string } | null {
  if (propKind !== "chest" || !snapshot.active || !snapshot.ready || !snapshot.frame) return null;
  const slot = snapshot.slots.find((entry) => entry.definitionId === "human:environment"
    && entry.selected.action.endsWith("OpenChestLid"));
  if (!slot) return null;
  const action = slot.actions.find((entry) => entry.id === slot.selected.action);
  if (!action || action.durationSeconds <= 0) return null;
  const phase = Math.max(0, Math.min(1, snapshot.frame.timeSeconds / action.durationSeconds));
  return { joints: Object.freeze({ hasp: 60 * smoothstep(phase, .19, .28), lid: 105 * smoothstep(phase, .32, .66) }),
    note: "Source-timed chest preview. Character hand contact, collision and gameplay state remain unverified." };
}
