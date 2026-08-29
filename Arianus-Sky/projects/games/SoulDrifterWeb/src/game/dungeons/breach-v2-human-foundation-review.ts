import type { BreachV2HumanFoundationActor } from "./breach-v2-human-foundation-actor";

export interface BreachV2HumanFoundationReview {
  root: HTMLElement;
  update(): void;
  dispose(): void;
}

export function filterHumanFoundationActions(
  actionNames: readonly string[],
  query: string,
): string[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return actionNames.filter((name) => {
    const searchable = humanFoundationActionLabel(name).toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function humanFoundationActionLabel(name: string): string {
  return name
    .replaceAll("__", " · ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/(\D)(\d+)/g, "$1 $2")
    .replaceAll("Human Masculine Athletic Muscular", "")
    .replace(/\s+/g, " ")
    .trim();
}

export function setupBreachV2HumanFoundationReview(
  container: HTMLElement,
  actor: BreachV2HumanFoundationActor,
): BreachV2HumanFoundationReview {
  const root = document.createElement("aside");
  root.dataset.testid = "human-foundation-animation-review";
  root.setAttribute("aria-label", "Human Foundation animation review");
  root.style.cssText = [
    "position:absolute", "left:max(12px,env(safe-area-inset-left))", "top:max(12px,env(safe-area-inset-top))",
    "z-index:72", "width:min(340px,calc(100vw - 24px))", "max-height:calc(100dvh - 24px)",
    "overflow:auto", "padding:12px", "box-sizing:border-box", "color:#eee4cf",
    "background:linear-gradient(165deg,rgba(13,18,19,.97),rgba(29,22,18,.96))",
    "border:1px solid rgba(190,145,76,.62)", "border-radius:4px", "box-shadow:0 18px 55px rgba(0,0,0,.58)",
    "font:11px/1.35 ui-monospace,Consolas,monospace", "backdrop-filter:blur(9px)",
  ].join(";");

  const titleRow = document.createElement("div");
  titleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px";
  const title = document.createElement("strong");
  title.textContent = "Human animation lab";
  title.style.cssText = "color:#e4b967;font:700 12px Georgia,serif;letter-spacing:.12em;text-transform:uppercase";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Hide";
  close.style.cssText = "padding:5px 8px;border:1px solid #896a3c;background:#211b16;color:#e9dfc7;cursor:pointer";
  titleRow.append(title, close);

  const body = document.createElement("div");
  const filter = document.createElement("input");
  filter.type = "search";
  filter.placeholder = "Filter idle, sword, great sword, bow…";
  filter.setAttribute("aria-label", "Filter Human Foundation animations");
  filter.style.cssText = "width:100%;box-sizing:border-box;padding:8px;background:#101615;color:#f4ead4;border:1px solid #64543c";

  const inventory = document.createElement("select");
  inventory.size = 10;
  inventory.setAttribute("aria-label", "Human Foundation animation list");
  inventory.style.cssText = "width:100%;margin-top:7px;padding:5px;background:#0d1212;color:#e8ddc7;border:1px solid #64543c";

  const status = document.createElement("div");
  status.dataset.testid = "human-foundation-animation-status";
  status.style.cssText = "min-height:32px;margin:7px 0;color:#bfb49d";

  const timeline = document.createElement("input");
  timeline.type = "range";
  timeline.min = "0";
  timeline.max = "1000";
  timeline.step = "1";
  timeline.value = "0";
  timeline.setAttribute("aria-label", "Animation timeline");
  timeline.style.width = "100%";

  const controls = document.createElement("div");
  controls.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px";
  const button = (label: string, action: () => void): HTMLButtonElement => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.style.cssText = "padding:7px 5px;background:#31251b;color:#f0e2c8;border:1px solid #8c693c;cursor:pointer";
    element.addEventListener("click", action);
    controls.appendChild(element);
    return element;
  };

  const names = actor.animationNames();
  let selected = names[0] ?? "";
  let paused = false;
  const rebuildInventory = (): void => {
    const filtered = filterHumanFoundationActions(names, filter.value);
    inventory.replaceChildren(...filtered.map((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = humanFoundationActionLabel(name);
      return option;
    }));
    if (!filtered.includes(selected)) selected = filtered[0] ?? "";
    inventory.value = selected;
    status.textContent = `${filtered.length} of ${names.length} production actions`;
  };
  const playSelected = (): void => {
    if (!selected) return;
    actor.play(selected);
    actor.pause(false);
    paused = false;
  };

  filter.addEventListener("input", rebuildInventory);
  inventory.addEventListener("change", () => {
    selected = inventory.value;
    playSelected();
  });
  timeline.addEventListener("input", () => {
    if (!selected) return;
    actor.pose(selected, Number(timeline.value) / 1000);
    paused = true;
  });
  button("Play", playSelected);
  button("Pause", () => {
    paused = !paused;
    actor.pause(paused);
  });
  button("Restart", () => {
    timeline.value = "0";
    playSelected();
  });

  close.addEventListener("click", () => {
    const collapsed = !body.hidden;
    body.hidden = collapsed;
    close.textContent = collapsed ? "Show" : "Hide";
    root.style.width = collapsed ? "auto" : "min(340px,calc(100vw - 24px))";
  });

  body.append(filter, inventory, status, timeline, controls);
  root.append(titleRow, body);
  container.appendChild(root);
  rebuildInventory();

  return {
    root,
    update: () => {
      const snapshot = actor.snapshot();
      const duration = Math.max(snapshot.durationSeconds, 0.0001);
      if (!paused) timeline.value = String(Math.round((snapshot.timeSeconds / duration) * 1000));
      status.textContent = [
        humanFoundationActionLabel(snapshot.animation),
        `${snapshot.timeSeconds.toFixed(2)} / ${snapshot.durationSeconds.toFixed(2)} s`,
        snapshot.groundingStatus,
      ].join(" · ");
    },
    dispose: () => root.remove(),
  };
}
