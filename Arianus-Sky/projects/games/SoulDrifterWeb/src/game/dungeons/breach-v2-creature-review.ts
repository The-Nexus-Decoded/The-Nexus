import type { BreachV2BreachlingRuntime } from "./breach-v2-breachlings";

export interface BreachV2CreatureReview {
  update(): void;
  dispose(): void;
}

export function filterBreachlingActions(actionNames: readonly string[], query: string): string[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return actionNames.filter((name) => {
    const searchable = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function setupBreachV2CreatureReview(
  container: HTMLElement,
  runtime: BreachV2BreachlingRuntime,
): BreachV2CreatureReview {
  const root = document.createElement("aside");
  root.dataset.testid = "breachling-animation-review";
  root.setAttribute("aria-label", "Breachling animation review");
  root.style.cssText = [
    "position:absolute", "left:max(12px,env(safe-area-inset-left))", "top:max(12px,env(safe-area-inset-top))",
    "z-index:72", "width:min(340px,calc(100vw - 24px))", "max-height:calc(100dvh - 24px)",
    "overflow:auto", "padding:12px", "box-sizing:border-box", "color:#eee4cf",
    "background:linear-gradient(165deg,rgba(13,18,19,.97),rgba(29,22,18,.96))",
    "border:1px solid rgba(129,187,87,.65)", "box-shadow:0 18px 55px rgba(0,0,0,.58)",
    "font:11px/1.35 ui-monospace,Consolas,monospace", "backdrop-filter:blur(9px)",
  ].join(";");
  const title = document.createElement("strong");
  title.textContent = "Creature animation lab";
  title.style.cssText = "display:block;margin-bottom:8px;color:#b6dc80;font:700 12px Georgia,serif;letter-spacing:.12em;text-transform:uppercase";
  const actorSelect = document.createElement("select");
  actorSelect.setAttribute("aria-label", "Breachling actor");
  const filter = document.createElement("input");
  filter.type = "search";
  filter.placeholder = "Filter idle, bite, tail, spit, death…";
  filter.setAttribute("aria-label", "Filter Breachling animations");
  const actionSelect = document.createElement("select");
  actionSelect.size = 10;
  actionSelect.setAttribute("aria-label", "Breachling animation list");
  for (const element of [actorSelect, filter, actionSelect]) {
    element.style.cssText = "width:100%;box-sizing:border-box;margin:3px 0;padding:7px;background:#101615;color:#f4ead4;border:1px solid #526345";
  }
  const status = document.createElement("div");
  status.style.cssText = "min-height:32px;margin:7px 0;color:#b8c7a6";
  const timeline = document.createElement("input");
  timeline.type = "range";
  timeline.min = "0";
  timeline.max = "1000";
  timeline.value = "0";
  timeline.setAttribute("aria-label", "Breachling animation timeline");
  timeline.style.width = "100%";
  const controls = document.createElement("div");
  controls.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px";
  const button = (label: string, action: () => void): void => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.style.cssText = "padding:7px 5px;background:#26321e;color:#f0e2c8;border:1px solid #668248;cursor:pointer";
    element.addEventListener("click", action);
    controls.appendChild(element);
  };
  let actorId = "";
  let actionName = "";
  let actorSignature = "";
  let paused = false;
  const rebuildActions = (): void => {
    const actor = runtime.snapshots().find((candidate) => candidate.id === actorId);
    const names = filterBreachlingActions(actor?.actionNames ?? [], filter.value);
    if (!names.includes(actionName)) actionName = names[0] ?? "";
    actionSelect.replaceChildren(...names.map((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name.replace(/([a-z])([A-Z])/g, "$1 $2");
      return option;
    }));
    actionSelect.value = actionName;
  };
  const play = (): void => {
    if (!actorId || !actionName) return;
    // Explicit inspection must start from the selected pose, not blend a
    // terminal corpse into a standing attack through the floor.
    runtime.play(actorId, actionName, { immediate: true });
    runtime.pause(actorId, false);
    paused = false;
  };
  actorSelect.addEventListener("change", () => {
    actorId = actorSelect.value;
    actionName = "";
    rebuildActions();
  });
  filter.addEventListener("input", rebuildActions);
  actionSelect.addEventListener("change", () => {
    actionName = actionSelect.value;
    play();
  });
  timeline.addEventListener("input", () => {
    if (!actorId || !actionName) return;
    runtime.pose(actorId, actionName, Number(timeline.value) / 1000);
    paused = true;
  });
  button("Play", play);
  button("Pause", () => {
    if (!actorId) return;
    paused = !paused;
    runtime.pause(actorId, paused);
  });
  button("Restart", () => {
    timeline.value = "0";
    play();
  });
  root.append(title, actorSelect, filter, actionSelect, status, timeline, controls);
  container.appendChild(root);

  return {
    update: () => {
      const actors = runtime.snapshots();
      const nextSignature = actors.map((actor) => actor.id).join("|");
      if (nextSignature !== actorSignature) {
        actorSignature = nextSignature;
        if (!actors.some((actor) => actor.id === actorId)) actorId = actors[0]?.id ?? "";
        actorSelect.replaceChildren(...actors.map((actor) => {
          const option = document.createElement("option");
          option.value = actor.id;
          option.textContent = `${actor.tier} · ${actor.id.split(":").at(-1)}`;
          return option;
        }));
        actorSelect.value = actorId;
        actionName = "";
        rebuildActions();
      }
      const actor = actors.find((candidate) => candidate.id === actorId);
      status.textContent = actor
        ? `${actor.tier} · ${actor.currentClip} · ${actor.targetHeightMeters.toFixed(3)} m · ${actor.groundingStatus}`
        : "No Breachlings in this fixed room. Warp to a combat chamber.";
    },
    dispose: () => root.remove(),
  };
}
