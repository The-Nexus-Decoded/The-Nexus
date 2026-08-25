import type { BreachV2Layout } from "./breach-v2-layout.ts";
import type { BreachV2RunController } from "./breach-v2-gameplay";

interface Position2D { x: number; z: number }

interface InteractionTarget extends Position2D {
  id: string;
  label: string;
  interactionRadius?: number;
}

export interface BreachV2GameplayUi {
  update(): void;
  interactNearest(): string | null;
  destroy(): void;
}

function button(label: string, title: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.title = title;
  element.style.cssText = [
    "border:1px solid rgba(154,216,232,.42)", "border-radius:4px", "padding:5px 8px",
    "background:rgba(14,31,38,.94)", "color:#d9f4f7", "font:11px/1.2 monospace",
    "cursor:pointer",
  ].join(";");
  return element;
}

export function setupBreachV2GameplayUi(options: {
  container: HTMLElement;
  layout: BreachV2Layout;
  controller: BreachV2RunController;
  getPlayerPosition: () => Position2D;
}): BreachV2GameplayUi {
  const { container, layout, controller, getPlayerPosition } = options;
  const panel = document.createElement("section");
  panel.setAttribute("aria-label", "First Breach run controls");
  panel.style.cssText = [
    "position:absolute", "left:10px", "top:10px", "z-index:8", "width:min(380px,calc(100vw - 20px))",
    "box-sizing:border-box", "padding:10px", "border:1px solid rgba(127,232,255,.35)",
    "border-radius:8px", "background:rgba(7,11,16,.86)", "backdrop-filter:blur(6px)",
    "color:#eee7d4", "font:12px/1.4 monospace", "box-shadow:0 8px 28px rgba(0,0,0,.38)",
  ].join(";");

  const heading = document.createElement("div");
  heading.style.cssText = "font-weight:700;color:#9feaff;letter-spacing:.06em;text-transform:uppercase";
  heading.textContent = "First Breach · Ascending Run";
  const objective = document.createElement("div");
  objective.style.cssText = "margin-top:5px;color:#fff3cb";
  const status = document.createElement("div");
  status.style.cssText = "margin-top:4px;color:#b8c3c9";
  const vitals = document.createElement("div");
  vitals.style.cssText = "margin-top:6px;color:#f3d3cc";

  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-top:8px";
  const styleSelect = document.createElement("select");
  styleSelect.setAttribute("aria-label", "Combat style");
  styleSelect.style.cssText = "border:1px solid rgba(154,216,232,.42);border-radius:4px;padding:5px;background:#0e1f26;color:#d9f4f7;font:11px monospace";
  styleSelect.append(new Option("Real-time", "real-time"), new Option("Turn-based", "turn-based"));
  styleSelect.addEventListener("change", () => controller.setCombatStyle(styleSelect.value as "real-time" | "turn-based"));
  const attack = button("1 Attack", "Attack the active encounter");
  const guard = button("2 Guard", "Guard against the next hostile strike");
  const recover = button("3 Recover", "Recover vitality");
  const restore = button("Restore", "Restore the exact defeated encounter");
  attack.addEventListener("click", () => controller.attack());
  guard.addEventListener("click", () => controller.guard());
  recover.addEventListener("click", () => controller.recover());
  restore.addEventListener("click", () => controller.restartEncounter());
  controls.append(styleSelect, attack, guard, recover, restore);

  const interaction = document.createElement("div");
  interaction.style.cssText = "display:flex;align-items:center;gap:7px;margin-top:8px";
  const interactButton = button("R Interact", "Interact with the nearest story landmark");
  const interactPrompt = document.createElement("span");
  interactPrompt.style.cssText = "color:#c9d5d8";
  interaction.append(interactButton, interactPrompt);
  panel.append(heading, objective, status, vitals, controls, interaction);
  container.appendChild(panel);

  const targets: InteractionTarget[] = [
    { ...layout.landmarks.ilyra, id: "ilyra", label: "Ilyra" },
    { ...layout.landmarks.memoryLoom, id: "memory-loom", label: "Memory Loom" },
    { ...layout.landmarks.coffer, id: "coffer", label: "Wayfarer's Coffer" },
    // The effigy's blocked nav footprint leaves the nearest legal player
    // position ~2.73 m from its center; keep its prompt reachable without
    // widening every story interaction in the zone.
    { ...layout.landmarks.effigy, id: "effigy", label: "training effigy", interactionRadius: 3 },
    { ...layout.landmarks.firstMemory, id: "first-memory", label: "First Memory" },
    { ...layout.landmarks.exitPoint, id: "heartvale-exit", label: "Heartvale threshold" },
  ];
  const nearestTarget = (): { target: InteractionTarget; distance: number } | null => {
    const player = getPlayerPosition();
    const nearest = targets
      .map((target) => ({ target, distance: Math.hypot(player.x - target.x, player.z - target.z) }))
      .filter(({ target, distance }) => distance <= (target.interactionRadius ?? 2.6))
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest ?? null;
  };
  const interactNearest = (): string | null => {
    const nearest = nearestTarget();
    if (!nearest) return null;
    controller.interact(nearest.target.id);
    return nearest.target.id;
  };
  interactButton.addEventListener("click", interactNearest);

  let signature = "";
  const update = (): void => {
    const state = controller.snapshot();
    const nearest = nearestTarget();
    const nextSignature = `${state.revision}:${nearest?.target.id ?? "none"}:${state.combatStyle}`;
    if (nextSignature === signature) return;
    signature = nextSignature;
    objective.textContent = `Objective: ${controller.objective()}`;
    status.textContent = state.statusMessage;
    vitals.textContent = state.activeEncounter
      ? `SoulDrifter ${state.playerHp}/${state.playerMaxHp} HP · ${state.activeEncounter.kind === "boss" ? "Warden" : "Gallery foe"} ${state.activeEncounter.enemyHp}/${state.activeEncounter.enemyMaxHp} HP`
      : `SoulDrifter ${state.playerHp}/${state.playerMaxHp} HP · ${state.phase.toUpperCase()}`;
    styleSelect.value = state.combatStyle;
    attack.disabled = !state.activeEncounter || state.phase === "defeat";
    guard.disabled = attack.disabled;
    recover.disabled = attack.disabled;
    restore.disabled = state.phase !== "defeat";
    interactButton.disabled = !nearest;
    interactPrompt.textContent = nearest ? `Nearby: ${nearest.target.label}` : "Move near a story landmark";
  };
  update();
  return { update, interactNearest, destroy: () => panel.remove() };
}
