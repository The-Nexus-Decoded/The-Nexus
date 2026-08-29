import type { BreachV2WardenRuntime } from "./breach-v2-wardens";

export interface BreachV2WardenReview {
  update(): void;
  dispose(): void;
}

export function filterWardenActions(actionNames: readonly string[], query: string): string[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return actionNames.filter((name) => {
    const searchable = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function setupBreachV2WardenReview(
  container: HTMLElement,
  runtime: BreachV2WardenRuntime,
): BreachV2WardenReview {
  const root = document.createElement("aside");
  root.dataset.testid = "cinderbound-warden-review";
  root.setAttribute("aria-label", "Cinderbound Warden animation and damage review");
  root.style.cssText = [
    "position:absolute", "right:max(12px,env(safe-area-inset-right))", "bottom:max(12px,env(safe-area-inset-bottom))",
    "z-index:72", "width:min(360px,calc(100vw - 24px))", "max-height:min(680px,calc(100dvh - 86px))",
    "overflow:auto", "padding:12px", "box-sizing:border-box", "color:#f3dfc7",
    "background:linear-gradient(165deg,rgba(22,17,15,.97),rgba(37,20,13,.96))",
    "border:1px solid rgba(235,113,45,.68)", "box-shadow:0 18px 55px rgba(0,0,0,.62)",
    "font:11px/1.35 ui-monospace,Consolas,monospace", "backdrop-filter:blur(9px)",
  ].join(";");
  const title = document.createElement("strong");
  title.textContent = "Warden combat lab";
  title.style.cssText = "display:block;margin-bottom:8px;color:#ff9c4c;font:700 12px Georgia,serif;letter-spacing:.12em;text-transform:uppercase";
  const filter = document.createElement("input");
  filter.type = "search";
  filter.placeholder = "Filter idle, blade, fire, hit, death…";
  filter.setAttribute("aria-label", "Filter Warden animations");
  const actionSelect = document.createElement("select");
  actionSelect.size = 8;
  actionSelect.setAttribute("aria-label", "Warden animation list");
  for (const element of [filter, actionSelect]) {
    element.style.cssText = "width:100%;box-sizing:border-box;margin:3px 0;padding:7px;background:#181211;color:#f7e6d1;border:1px solid #76452e";
  }
  const status = document.createElement("div");
  status.style.cssText = "min-height:42px;margin:7px 0;color:#d7b99d";
  const timeline = document.createElement("input");
  timeline.type = "range";
  timeline.min = "0";
  timeline.max = "1000";
  timeline.value = "0";
  timeline.setAttribute("aria-label", "Warden animation timeline");
  timeline.style.width = "100%";
  const playbackControls = document.createElement("div");
  playbackControls.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px";
  const damageTitle = document.createElement("strong");
  damageTitle.textContent = "Damage segmentation";
  damageTitle.style.cssText = "display:block;margin:11px 0 5px;color:#ffbd72;text-transform:uppercase;letter-spacing:.08em";
  const damageControls = document.createElement("div");
  damageControls.style.cssText = "display:grid;grid-template-columns:repeat(5,1fr);gap:4px";
  const addButton = (parent: HTMLElement, label: string, action: () => void): void => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.style.cssText = "padding:7px 4px;background:#392018;color:#ffe8cf;border:1px solid #9a5736;cursor:pointer";
    element.addEventListener("click", action);
    parent.appendChild(element);
  };
  let actionName = "";
  let actionSignature = "";
  let paused = false;
  const rebuildActions = (): void => {
    const actor = runtime.snapshots()[0];
    const names = filterWardenActions(actor?.actionNames ?? [], filter.value);
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
    if (!actionName || runtime.snapshots().length === 0) return;
    runtime.play(actionName);
    runtime.pause(false);
    paused = false;
  };
  filter.addEventListener("input", rebuildActions);
  actionSelect.addEventListener("change", () => {
    actionName = actionSelect.value;
    play();
  });
  timeline.addEventListener("input", () => {
    if (!actionName || runtime.snapshots().length === 0) return;
    runtime.pose(actionName, Number(timeline.value) / 1000);
    paused = true;
  });
  addButton(playbackControls, "Play", play);
  addButton(playbackControls, "Pause", () => {
    if (runtime.snapshots().length === 0) return;
    paused = !paused;
    runtime.pause(paused);
  });
  addButton(playbackControls, "Restart", () => {
    timeline.value = "0";
    play();
  });
  [0, 30, 60, 90, 100].forEach((percent) => {
    addButton(damageControls, `${percent}%`, () => runtime.setDamageFraction(percent / 100));
  });
  root.append(
    title,
    filter,
    actionSelect,
    status,
    timeline,
    playbackControls,
    damageTitle,
    damageControls,
  );
  container.appendChild(root);

  return {
    update: () => {
      const actor = runtime.snapshots()[0];
      const nextSignature = actor?.actionNames.join("|") ?? "";
      if (nextSignature !== actionSignature) {
        actionSignature = nextSignature;
        actionName = "";
        rebuildActions();
      }
      status.textContent = actor
        ? `${actor.label} · ${actor.currentClip} · ${actor.targetHeightMeters.toFixed(2)} m · HP ${actor.healthPercent}% · detached ${actor.detachedStages.join("/") || "none"} · ${actor.groundingStatus}`
        : "The Warden loads only in the boss chamber. Warp there to review it.";
    },
    dispose: () => root.remove(),
  };
}
