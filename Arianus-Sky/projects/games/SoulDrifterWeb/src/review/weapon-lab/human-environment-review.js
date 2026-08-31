import { sourcePrefix, clipActionName, isBasicLocomotionClip, isObjectInteractionClip, RUN_DIVE_GAP_NAME } from "./human-review-catalog.js";

export const ENVIRONMENT_REVIEW_DEFINITION = Object.freeze({
  id: "human:environment", family: "human", label: "Human · Environmental interactions (unarmed)",
  note: "Existing Human Foundation object, climbing and swimming motions without equipment. Source motion availability is not hand-contact, climbing-support or water-physics approval.",
});

/** Reuse the solo catalog's source classification; do not duplicate clip lists. */
export function environmentReviewActions(actions) {
  return Object.freeze(actions.filter(({ clipName: name }) => name === RUN_DIVE_GAP_NAME || isBasicLocomotionClip(name)
    || (sourcePrefix(name) === "Interactions" && (isObjectInteractionClip(name)
      || /Climb|Swim|IdleStandingRelaxed/.test(clipActionName(name)))))
    .map((action) => Object.freeze({ ...action }))
    .sort((a, b) => Number(b.semantic === "idle") - Number(a.semantic === "idle")));
}

/** A restricted view of one owned catalog actor, not a second rig or clip copy. */
export function createHumanEnvironmentReviewAdapter(actor) {
  if (actor.snapshot?.().mode !== "catalog") throw new Error("Environmental review requires an unarmed catalog actor");
  const actions = environmentReviewActions(actor.actions()), allowed = new Set(actions.map(({ id }) => id));
  if (!actions.length) throw new Error("No source environmental motions are available");
  return { instanceId: actor.instanceId, definitionId: actor.definitionId, root: actor.root, model: actor.model,
    actions: () => actions,
    sample(id, seconds) {
      if (!allowed.has(id)) throw new Error("Action is outside the environmental review catalog");
      actor.sample(id, seconds);
    },
    reset() { actor.sample(actions[0].id, 0); },
    socketWorld: typeof actor.socketWorld === "function" ? (name, target) => actor.socketWorld(name, target) : undefined,
    dispose() { actor.dispose(); },
  };
}
