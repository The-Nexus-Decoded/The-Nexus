import type { BreachV2Layout } from "./breach-v2-layout.ts";
import type { BreachV2RunController } from "./breach-v2-gameplay";
import {
  BREACH_V2_PANEL_EVENT,
  BREACH_V2_PANEL_REQUEST_EVENT,
  breachV2PanelId,
  type BreachV2PanelRequestDetail,
} from "./breach-v2-mobile-controls.ts";

interface Position2D { x: number; z: number }

interface InteractionTarget extends Position2D {
  id: string;
  label: string;
  interactionRadius?: number;
}

export interface BreachV2EnvironmentUiTarget extends Position2D {
  id: string;
  label: string;
  interactionId?: string;
  damageable: boolean;
  interactionRadius?: number;
}

export interface BreachV2GameplayUi {
  update(): void;
  interactNearest(): string | null;
  damageNearest(): string | null;
  destroy(): void;
}

export function shouldCollapseBreachV2GameplayUi(viewportWidth: number): boolean {
  return viewportWidth <= 640;
}

function button(label: string, title: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.title = title;
  element.style.cssText = [
    "border:1px solid rgba(154,216,232,.42)", "border-radius:4px", "padding:7px 9px",
    "background:rgba(14,31,38,.94)", "color:#d9f4f7", "font:11px/1.2 monospace",
    "cursor:pointer", "min-height:36px",
  ].join(";");
  return element;
}

export function setupBreachV2GameplayUi(options: {
  container: HTMLElement;
  layout: BreachV2Layout;
  controller: BreachV2RunController;
  getPlayerPosition: () => Position2D;
  getEnvironmentTargets?: () => BreachV2EnvironmentUiTarget[];
  damageEnvironment?: (targetId: string) => void;
  isLineOfSightBlocked?: (start: Position2D, end: Position2D) => boolean;
}): BreachV2GameplayUi {
  const {
    container,
    layout,
    controller,
    getPlayerPosition,
    getEnvironmentTargets = () => [],
    damageEnvironment = () => undefined,
    isLineOfSightBlocked = () => false,
  } = options;
  const panel = document.createElement("section");
  panel.dataset.testid = "breach-v2-gameplay-panel";
  panel.setAttribute("aria-label", "First Breach run controls");
  panel.style.cssText = [
    "position:absolute", "left:12px", "top:max(12px,env(safe-area-inset-top))", "z-index:68", "width:min(380px,calc(100vw - 24px))",
    "box-sizing:border-box", "padding:10px", "border:1px solid rgba(127,232,255,.35)",
    "border-radius:8px", "background:rgba(7,11,16,.86)", "backdrop-filter:blur(6px)",
    "color:#eee7d4", "font:12px/1.4 monospace", "box-shadow:0 8px 28px rgba(0,0,0,.38)",
    "max-height:calc(100dvh - 20px)", "overflow:auto",
  ].join(";");

  const headingRow = document.createElement("div");
  headingRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px";
  const heading = document.createElement("div");
  heading.style.cssText = "font-weight:700;color:#9feaff;letter-spacing:.06em;text-transform:uppercase";
  heading.textContent = "First Breach · Ascending Run";
  const collapseButton = button("", "Collapse First Breach controls");
  collapseButton.setAttribute("aria-controls", "breach-v2-gameplay-controls-body");
  collapseButton.style.cssText += ";flex:0 0 auto;min-width:44px;padding:7px 10px;font-weight:700";
  headingRow.append(heading, collapseButton);
  const body = document.createElement("div");
  body.id = "breach-v2-gameplay-controls-body";
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
  const realtimeOption = document.createElement("option");
  realtimeOption.value = "real-time";
  realtimeOption.textContent = "Real-time";
  const turnBasedOption = document.createElement("option");
  turnBasedOption.value = "turn-based";
  turnBasedOption.textContent = "Turn-based";
  styleSelect.append(realtimeOption, turnBasedOption);
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
  const destruction = document.createElement("div");
  destruction.style.cssText = "display:flex;align-items:center;gap:7px;margin-top:6px";
  const damageButton = button("X Break", "Damage the nearest registered environment object");
  const damagePrompt = document.createElement("span");
  damagePrompt.style.cssText = "color:#c9d5d8";
  destruction.append(damageButton, damagePrompt);
  body.append(objective, status, vitals, controls, interaction, destruction);
  panel.append(headingRow, body);
  container.appendChild(panel);

  let collapsedViewport = shouldCollapseBreachV2GameplayUi(window.innerWidth);
  let expanded = !collapsedViewport;
  let userChoseExpansion = false;
  let restoreFocus: HTMLElement | null = null;
  const updateExpandedState = (): void => {
    panel.hidden = !expanded;
    body.hidden = !expanded;
    collapseButton.textContent = "Close";
    collapseButton.title = expanded ? "Collapse First Breach controls" : "Expand First Breach controls";
    collapseButton.setAttribute("aria-expanded", String(expanded));
    heading.hidden = !expanded;
    if (!expanded) return;
    panel.style.width = "min(380px,calc(100vw - 24px))";
    panel.style.padding = "10px";
    panel.style.border = "1px solid rgba(127,232,255,.35)";
    panel.style.background = "rgba(7,11,16,.86)";
    panel.style.boxShadow = "0 8px 28px rgba(0,0,0,.38)";
    panel.style.backdropFilter = "blur(6px)";
    panel.style.overflow = "auto";
    collapseButton.style.borderRadius = "999px";
    collapseButton.style.padding = "8px 13px";
    collapseButton.style.minHeight = "38px";
    collapseButton.style.background = "rgba(14,31,38,.94)";
    collapseButton.style.boxShadow = "none";
    collapseButton.style.backdropFilter = "none";
  };
  collapseButton.addEventListener("click", () => {
    userChoseExpansion = true;
    expanded = !expanded;
    updateExpandedState();
    if (expanded) {
      window.dispatchEvent(new CustomEvent(BREACH_V2_PANEL_EVENT, { detail: "combat" }));
    } else {
      const settings = container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-settings-toggle']");
      settings?.focus();
    }
  });
  const closeForOtherPanel = (event: Event): void => {
    if (breachV2PanelId(event) === "combat" || !expanded) return;
    expanded = false;
    updateExpandedState();
  };
  const openFromControlCenter = (event: Event): void => {
    if (breachV2PanelId(event) !== "combat") return;
    const detail = (event as CustomEvent<BreachV2PanelRequestDetail>).detail;
    restoreFocus = typeof detail === "object" ? detail.origin : null;
    userChoseExpansion = true;
    expanded = true;
    updateExpandedState();
    window.dispatchEvent(new CustomEvent(BREACH_V2_PANEL_EVENT, { detail: "combat" }));
    collapseButton.focus();
  };
  const closeOnEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !expanded) return;
    event.preventDefault();
    expanded = false;
    userChoseExpansion = true;
    updateExpandedState();
    if (restoreFocus?.isConnected) restoreFocus.focus();
    restoreFocus = null;
  };
  const syncViewportPolicy = (): void => {
    const nextCollapsedViewport = shouldCollapseBreachV2GameplayUi(window.innerWidth);
    if (nextCollapsedViewport === collapsedViewport) return;
    collapsedViewport = nextCollapsedViewport;
    if (userChoseExpansion) return;
    expanded = !collapsedViewport;
    updateExpandedState();
  };
  window.addEventListener(BREACH_V2_PANEL_EVENT, closeForOtherPanel);
  window.addEventListener(BREACH_V2_PANEL_REQUEST_EVENT, openFromControlCenter);
  window.addEventListener("keydown", closeOnEscape);
  window.addEventListener("resize", syncViewportPolicy);
  updateExpandedState();

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
  const hasInteractionLine = (
    player: { x: number; z: number },
    target: { x: number; z: number },
    distance: number,
  ): boolean => {
    if (distance <= 0.85) return true;
    // Stop the LOS trace just before the target's own solid footprint. The
    // target may block sight and movement authoritatively without blocking
    // interaction with its reachable face.
    const endpointInset = Math.min(0.85, distance * 0.5);
    const approachPoint = {
      x: target.x + ((player.x - target.x) / distance) * endpointInset,
      z: target.z + ((player.z - target.z) / distance) * endpointInset,
    };
    return !isLineOfSightBlocked(player, approachPoint);
  };
  const nearestTarget = (): { target: InteractionTarget; distance: number } | null => {
    const player = getPlayerPosition();
    const dynamicTargets = getEnvironmentTargets()
      .filter((target) => target.interactionId)
      .map((target) => ({
        ...target,
        id: target.interactionId!,
      }));
    const nearest = [...targets, ...dynamicTargets]
      .map((target) => ({ target, distance: Math.hypot(player.x - target.x, player.z - target.z) }))
      .filter(({ target, distance }) => (
        distance <= (target.interactionRadius ?? 2.6)
        && hasInteractionLine(player, target, distance)
      ))
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest ?? null;
  };
  const nearestDamageTarget = (): BreachV2EnvironmentUiTarget | null => {
    const player = getPlayerPosition();
    return getEnvironmentTargets()
      .filter((target) => target.damageable)
      .map((target) => ({ target, distance: Math.hypot(player.x - target.x, player.z - target.z) }))
      .filter(({ target, distance }) => (
        distance <= (target.interactionRadius ?? 2.8)
        && hasInteractionLine(player, target, distance)
      ))
      .sort((a, b) => a.distance - b.distance)[0]?.target ?? null;
  };
  const interactNearest = (): string | null => {
    const nearest = nearestTarget();
    if (!nearest) return null;
    controller.interact(nearest.target.id);
    return nearest.target.id;
  };
  interactButton.addEventListener("click", interactNearest);
  const damageNearest = (): string | null => {
    const nearest = nearestDamageTarget();
    if (!nearest) return null;
    damageEnvironment(nearest.id);
    return nearest.id;
  };
  damageButton.addEventListener("click", damageNearest);

  let signature = "";
  const update = (): void => {
    const state = controller.snapshot();
    const nearest = nearestTarget();
    const damageTarget = nearestDamageTarget();
    const nextSignature = `${state.revision}:${nearest?.target.id ?? "none"}:${damageTarget?.id ?? "none"}:${state.combatStyle}`;
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
    damageButton.disabled = !damageTarget;
    damagePrompt.textContent = damageTarget ? `Break/test: ${damageTarget.label}` : "No break/test target in range";
    for (const action of [attack, guard, recover, restore, interactButton, damageButton]) {
      action.style.opacity = action.disabled ? ".45" : "1";
      action.style.cursor = action.disabled ? "not-allowed" : "pointer";
    }
  };
  update();
  return {
    update,
    interactNearest,
    damageNearest,
    destroy: () => {
      window.removeEventListener(BREACH_V2_PANEL_EVENT, closeForOtherPanel);
      window.removeEventListener(BREACH_V2_PANEL_REQUEST_EVENT, openFromControlCenter);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", syncViewportPolicy);
      panel.remove();
    },
  };
}
