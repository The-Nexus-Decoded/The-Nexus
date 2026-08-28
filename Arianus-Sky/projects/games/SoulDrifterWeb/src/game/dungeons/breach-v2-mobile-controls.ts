export const BREACH_V2_ISOMETRIC_MIN_DISTANCE = 6;
export const BREACH_V2_ISOMETRIC_MAX_DISTANCE = 36;
export const BREACH_V2_MOBILE_ZOOM_STEP = 3.5;
export const BREACH_V2_TOUCH_ROTATE_THRESHOLD = 12;
export const BREACH_V2_PANEL_EVENT = "breach-v2-panel-opened";
export const BREACH_V2_PANEL_REQUEST_EVENT = "breach-v2-panel-requested";

export type BreachV2GraphicsMode = "auto" | "low" | "standard" | "high";
export type BreachV2GraphicsQuality = Exclude<BreachV2GraphicsMode, "auto">;

export function resolveBreachV2AutoGraphicsQuality(options: {
  coarsePointer: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  pixelRatio: number;
}): BreachV2GraphicsQuality {
  const { coarsePointer, hardwareConcurrency, deviceMemoryGb, pixelRatio } = options;
  if (coarsePointer && (hardwareConcurrency <= 4 || (deviceMemoryGb ?? 4) <= 4)) return "low";
  if (coarsePointer || hardwareConcurrency <= 8 || (deviceMemoryGb !== null && deviceMemoryGb <= 8)) {
    return "standard";
  }
  return pixelRatio > 1.5 ? "standard" : "high";
}

export function resolveBreachV2TouchYaw(
  currentYaw: number,
  horizontalDelta: number,
  sensitivity = 0.0075,
): number {
  return currentYaw - horizontalDelta * sensitivity;
}

export function resolveBreachV2CameraStep(
  currentDistance: number,
  delta: number,
  minDistance = BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  maxDistance = BREACH_V2_ISOMETRIC_MAX_DISTANCE,
): number {
  return Math.min(maxDistance, Math.max(minDistance, currentDistance + delta));
}

export function shouldRequireBreachV2Landscape(
  coarsePointer: boolean,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  return coarsePointer && viewportHeight > viewportWidth;
}

export function shouldDockBreachV2PerformanceDetails(
  coarsePointer: boolean,
  viewportWidth: number,
): boolean {
  return coarsePointer || viewportWidth <= 760;
}

export function resolveBreachV2PinchDistance(
  currentDistance: number,
  previousSpan: number,
  currentSpan: number,
  minDistance = BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  maxDistance = BREACH_V2_ISOMETRIC_MAX_DISTANCE,
): number {
  if (previousSpan <= 0 || currentSpan <= 0) return currentDistance;
  return Math.min(maxDistance, Math.max(
    minDistance,
    currentDistance * (previousSpan / currentSpan),
  ));
}

interface MobileMovementPad {
  destroy(): void;
}

export interface BreachV2SettingsPanel {
  updateEffectiveQuality(quality: BreachV2GraphicsQuality): void;
  destroy(): void;
}

function pillButton(label: string, accent: "cyan" | "gold" = "gold"): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  const border = accent === "cyan" ? "rgba(127,232,255,.5)" : "rgba(228,185,103,.58)";
  const color = accent === "cyan" ? "#c9f7ff" : "#f0c879";
  element.style.cssText = [
    "min-height:42px", "padding:0 16px", "border-radius:999px", `border:1px solid ${border}`,
    "background:rgba(8,12,16,.84)", `color:${color}`, "box-shadow:0 8px 24px rgba(0,0,0,.42)",
    "backdrop-filter:blur(9px)", "font:700 11px/1 Georgia,serif", "letter-spacing:.11em",
    "text-transform:uppercase", "cursor:pointer", "touch-action:manipulation",
  ].join(";");
  return element;
}

export function setupBreachV2SettingsPanel(options: {
  container: HTMLElement;
  initialMode: BreachV2GraphicsMode;
  initialEffectiveQuality: BreachV2GraphicsQuality;
  initialStatsVisible: boolean;
  performanceDetails?: HTMLElement;
  dockPerformanceDetails?: boolean;
  onModeChange: (mode: BreachV2GraphicsMode) => void;
  onStatsVisibilityChange: (visible: boolean) => void;
}): BreachV2SettingsPanel {
  const {
    container,
    initialMode,
    initialEffectiveQuality,
    initialStatsVisible,
    performanceDetails,
    dockPerformanceDetails = false,
    onModeChange,
    onStatsVisibilityChange,
  } = options;
  const root = document.createElement("section");
  root.dataset.testid = "breach-v2-settings";
  root.setAttribute("aria-label", "Dungeon controls and settings");
  root.style.cssText = [
    "position:absolute", "top:max(12px,env(safe-area-inset-top))", "right:12px", "z-index:70", "pointer-events:auto",
  ].join(";");
  const trigger = pillButton("Settings");
  trigger.dataset.testid = "breach-v2-settings-toggle";
  trigger.setAttribute("aria-expanded", "false");
  const panel = document.createElement("div");
  panel.hidden = true;
  panel.style.cssText = [
    "position:absolute", "top:50px", "right:0",
    "width:min(360px,calc(100vw - 24px))", "max-height:calc(100dvh - 74px)", "overflow:auto",
    "box-sizing:border-box", "padding:16px",
    "border:1px solid rgba(228,185,103,.52)", "border-radius:16px",
    "background:linear-gradient(165deg,rgba(10,15,19,.97),rgba(29,23,18,.96))",
    "box-shadow:0 18px 55px rgba(0,0,0,.55)", "backdrop-filter:blur(12px)", "color:#eee4cf",
    "font:12px/1.4 ui-monospace,Consolas,monospace",
  ].join(";");
  const title = document.createElement("div");
  title.textContent = "Dungeon control center";
  title.style.cssText = "color:#f0c879;font:700 13px/1.2 Georgia,serif;letter-spacing:.1em;text-transform:uppercase";
  const toolsLabel = document.createElement("div");
  toolsLabel.textContent = "Panels";
  toolsLabel.style.cssText = "margin-top:14px;color:#9feaff;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase";
  const toolsGrid = document.createElement("div");
  toolsGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px";
  const panelLaunchers = [
    { id: "combat", label: "Combat", detail: "Encounters & actions", testid: "breach-v2-open-combat" },
    { id: "navigation", label: "Navigate", detail: "Rooms, views & QA", testid: "breach-v2-open-navigation" },
  ] as const;
  for (const launcher of panelLaunchers) {
    const control = document.createElement("button");
    control.type = "button";
    control.dataset.testid = launcher.testid;
    control.setAttribute("aria-label", `Open ${launcher.label.toLowerCase()} controls`);
    control.style.cssText = [
      "display:grid", "gap:3px", "min-height:56px", "padding:8px 10px", "text-align:left",
      "border:1px solid rgba(127,232,255,.34)", "border-radius:10px", "background:rgba(12,28,34,.78)",
      "color:#d9f4f7", "font:700 11px/1.1 ui-monospace,monospace", "cursor:pointer",
    ].join(";");
    const name = document.createElement("strong");
    name.textContent = launcher.label;
    const detail = document.createElement("small");
    detail.textContent = launcher.detail;
    detail.style.cssText = "color:#8fa8aa;font:9px/1.2 ui-monospace,monospace;font-weight:400";
    control.append(name, detail);
    control.addEventListener("click", () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent(BREACH_V2_PANEL_REQUEST_EVENT, { detail: launcher.id }));
    });
    toolsGrid.appendChild(control);
  }
  const qualityLabel = document.createElement("div");
  qualityLabel.style.cssText = "margin-top:14px;color:#9feaff;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase";
  qualityLabel.textContent = "Graphics quality";
  const effective = document.createElement("div");
  effective.style.cssText = "margin-top:5px;color:#b8c3c9;font-size:10px";
  const qualityGrid = document.createElement("div");
  qualityGrid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:9px";
  const modeButtons = new Map<BreachV2GraphicsMode, HTMLButtonElement>();
  let mode = initialMode;
  let effectiveQuality = initialEffectiveQuality;
  const syncQuality = (): void => {
    effective.textContent = `Active: ${effectiveQuality.toUpperCase()}${mode === "auto" ? " · Auto" : " · Manual"}`;
    for (const [candidate, control] of modeButtons) {
      const active = candidate === mode;
      control.setAttribute("aria-pressed", String(active));
      control.style.background = active ? "rgba(145,91,38,.72)" : "rgba(28,34,34,.82)";
      control.style.borderColor = active ? "#d29a4e" : "rgba(123,132,119,.42)";
      control.style.color = active ? "#fff1d5" : "#d5ddd8";
    }
  };
  for (const candidate of ["auto", "low", "standard", "high"] as const) {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = candidate === "standard" ? "Std" : candidate;
    control.title = `${candidate} graphics quality`;
    control.style.cssText = [
      "min-width:0", "min-height:38px", "padding:0 5px", "border:1px solid", "border-radius:9px",
      "font:700 10px/1 ui-monospace,Consolas,monospace", "text-transform:uppercase", "cursor:pointer",
    ].join(";");
    control.addEventListener("click", () => {
      mode = candidate;
      onModeChange(candidate);
      syncQuality();
    });
    modeButtons.set(candidate, control);
    qualityGrid.appendChild(control);
  }
  let statsVisible = initialStatsVisible;
  const statsToggle = document.createElement("button");
  statsToggle.type = "button";
  statsToggle.dataset.testid = "breach-v2-stats-toggle";
  statsToggle.style.cssText = [
    "display:flex", "align-items:center", "justify-content:space-between", "width:100%", "min-height:42px",
    "margin-top:14px", "padding:0 11px", "border:1px solid rgba(127,232,255,.34)", "border-radius:10px",
    "background:rgba(12,28,34,.78)", "color:#d9f4f7", "font:700 11px/1 ui-monospace,monospace", "cursor:pointer",
  ].join(";");
  const syncStats = (): void => {
    statsToggle.textContent = `Performance details  ${statsVisible ? "ON" : "OFF"}`;
    statsToggle.setAttribute("aria-pressed", String(statsVisible));
  };
  statsToggle.addEventListener("click", () => {
    statsVisible = !statsVisible;
    onStatsVisibilityChange(statsVisible);
    syncStats();
  });
  panel.append(title, toolsLabel, toolsGrid, qualityLabel, effective, qualityGrid, statsToggle);
  if (dockPerformanceDetails && performanceDetails) {
    const diagnosticsLabel = document.createElement("div");
    diagnosticsLabel.textContent = "Live diagnostics";
    diagnosticsLabel.style.cssText = "margin-top:14px;color:#9feaff;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase";
    performanceDetails.dataset.presentation = "settings-docked";
    performanceDetails.style.cssText = [
      "position:static", "width:100%", "max-width:none", "margin-top:8px", "padding:8px 9px",
      "box-sizing:border-box", "background:rgba(4,9,13,.72)", "border:1px solid rgba(127,232,255,.2)",
      "color:#d8e8e6", "font:9px/1.4 ui-monospace,Consolas,monospace", "border-radius:9px",
      "pointer-events:none", "white-space:pre-wrap", "overflow-wrap:anywhere", "box-shadow:none", "backdrop-filter:none",
    ].join(";");
    panel.append(diagnosticsLabel, performanceDetails);
  }
  root.append(trigger, panel);
  container.appendChild(root);
  const setOpen = (open: boolean): void => {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.textContent = open ? "Close" : "Settings";
    if (open) window.dispatchEvent(new CustomEvent(BREACH_V2_PANEL_EVENT, { detail: "settings" }));
  };
  trigger.addEventListener("click", () => setOpen(panel.hidden !== false));
  const closeForOtherPanel = (event: Event): void => {
    if ((event as CustomEvent<string>).detail !== "settings") setOpen(false);
  };
  window.addEventListener(BREACH_V2_PANEL_EVENT, closeForOtherPanel);
  syncQuality();
  syncStats();
  return {
    updateEffectiveQuality: (quality) => {
      effectiveQuality = quality;
      syncQuality();
    },
    destroy: () => {
      window.removeEventListener(BREACH_V2_PANEL_EVENT, closeForOtherPanel);
      root.remove();
    },
  };
}

const DIRECTIONS = [
  { code: "ArrowUp", label: "Move forward", glyph: "▲", gridArea: "1 / 2" },
  { code: "ArrowLeft", label: "Move left", glyph: "◀", gridArea: "2 / 1" },
  { code: "ArrowRight", label: "Move right", glyph: "▶", gridArea: "2 / 3" },
  { code: "ArrowDown", label: "Move backward", glyph: "▼", gridArea: "3 / 2" },
] as const;

export function setupBreachV2MobileMovementPad(options: {
  container: HTMLElement;
  keys: Set<string>;
  enabled: boolean;
  adjustCameraDistance: (delta: number) => void;
}): MobileMovementPad {
  const { container, keys, enabled, adjustCameraDistance } = options;
  if (!enabled) return { destroy: () => undefined };

  const root = document.createElement("div");
  root.dataset.testid = "breach-v2-mobile-dpad";
  root.setAttribute("aria-label", "Movement pad");
  root.style.cssText = [
    "position:absolute", "left:14px", "bottom:max(18px,env(safe-area-inset-bottom))", "z-index:24",
    "display:grid", "grid-template:repeat(3,46px)/repeat(3,46px)", "gap:4px",
    "width:204px", "height:146px", "pointer-events:none", "touch-action:none",
  ].join(";");

  const center = document.createElement("div");
  center.setAttribute("aria-hidden", "true");
  center.textContent = "✦";
  center.style.cssText = [
    "grid-area:2 / 2", "display:grid", "place-items:center", "border-radius:50%",
    "color:rgba(159,234,255,.72)", "background:rgba(7,11,16,.45)",
    "border:1px solid rgba(127,232,255,.18)", "font:16px Georgia,serif",
  ].join(";");
  root.appendChild(center);

  const zoomRail = document.createElement("div");
  zoomRail.setAttribute("aria-label", "Camera zoom controls");
  zoomRail.style.cssText = [
    "position:absolute", "left:168px", "bottom:calc(max(18px,env(safe-area-inset-bottom)) + 80px)",
    "z-index:25", "display:grid", "grid-auto-flow:column", "gap:8px", "width:92px", "height:42px",
    "pointer-events:none", "touch-action:none",
  ].join(";");
  const zoomControls = [
    { label: "Zoom camera in", glyph: "+", delta: -BREACH_V2_MOBILE_ZOOM_STEP, testid: "breach-v2-zoom-in" },
    { label: "Zoom camera out", glyph: "−", delta: BREACH_V2_MOBILE_ZOOM_STEP, testid: "breach-v2-zoom-out" },
  ] as const;
  for (const zoom of zoomControls) {
    const control = document.createElement("button");
    control.type = "button";
    control.dataset.testid = zoom.testid;
    control.setAttribute("aria-label", zoom.label);
    control.textContent = zoom.glyph;
    control.style.cssText = [
      "width:42px", "height:42px", "padding:0", "pointer-events:auto", "touch-action:manipulation",
      "border-radius:50%", "border:1px solid rgba(228,185,103,.56)", "background:rgba(16,19,20,.78)",
      "color:#f0c879", "box-shadow:0 6px 18px rgba(0,0,0,.34)", "backdrop-filter:blur(7px)",
      "font:700 22px/1 Georgia,serif", "cursor:pointer",
    ].join(";");
    control.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      adjustCameraDistance(zoom.delta);
      control.style.transform = "scale(.92)";
    });
    const release = (): void => { control.style.transform = "scale(1)"; };
    control.addEventListener("pointerup", release);
    control.addEventListener("pointercancel", release);
    zoomRail.appendChild(control);
  }
  for (const direction of DIRECTIONS) {
    const control = document.createElement("button");
    control.type = "button";
    control.dataset.keyCode = direction.code;
    control.setAttribute("aria-label", direction.label);
    control.textContent = direction.glyph;
    control.style.cssText = [
      `grid-area:${direction.gridArea}`, "width:46px", "height:46px", "padding:0",
      "pointer-events:auto", "touch-action:none", "border-radius:50%",
      "border:1px solid rgba(127,232,255,.46)", "background:rgba(7,11,16,.72)",
      "color:#c9f7ff", "box-shadow:0 6px 18px rgba(0,0,0,.32)",
      "font:700 18px/1 ui-monospace,monospace", "backdrop-filter:blur(7px)",
    ].join(";");
    const release = (): void => {
      keys.delete(direction.code);
      control.style.background = "rgba(7,11,16,.72)";
      control.style.transform = "scale(1)";
    };
    control.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      control.setPointerCapture(event.pointerId);
      keys.add(direction.code);
      control.style.background = "rgba(28,91,108,.92)";
      control.style.transform = "scale(.94)";
    });
    control.addEventListener("pointerup", release);
    control.addEventListener("pointercancel", release);
    control.addEventListener("lostpointercapture", release);
    root.appendChild(control);
  }

  container.append(root, zoomRail);
  return {
    destroy: () => {
      for (const direction of DIRECTIONS) keys.delete(direction.code);
      root.remove();
      zoomRail.remove();
    },
  };
}

export function setupBreachV2MobileLandscapeGate(options: {
  container: HTMLElement;
  enabled: boolean;
}): MobileMovementPad {
  const { container, enabled } = options;
  if (!enabled) return { destroy: () => undefined };

  const gate = document.createElement("section");
  gate.dataset.testid = "breach-v2-landscape-gate";
  gate.setAttribute("aria-live", "polite");
  gate.style.cssText = [
    "position:absolute", "inset:0", "z-index:80", "display:none", "place-items:center", "padding:28px",
    "box-sizing:border-box", "background:radial-gradient(circle at 50% 42%,rgba(28,70,78,.96),rgba(6,9,13,.99) 64%)",
    "color:#e8f8f7", "text-align:center", "font-family:Georgia,serif", "touch-action:none",
  ].join(";");
  const card = document.createElement("div");
  card.style.cssText = "max-width:310px;padding:26px 24px;border:1px solid rgba(127,232,255,.36);border-radius:24px;background:rgba(7,11,16,.68);box-shadow:0 22px 60px rgba(0,0,0,.5);backdrop-filter:blur(10px)";
  const rune = document.createElement("div");
  rune.textContent = "↻";
  rune.setAttribute("aria-hidden", "true");
  rune.style.cssText = "margin:auto;width:64px;height:64px;display:grid;place-items:center;border:1px solid rgba(240,200,121,.58);border-radius:50%;color:#f0c879;font:38px/1 Georgia,serif";
  const title = document.createElement("h1");
  title.textContent = "Turn toward the horizon";
  title.style.cssText = "margin:18px 0 8px;color:#bff4fb;font:700 20px/1.15 Georgia,serif;letter-spacing:.04em";
  const instruction = document.createElement("p");
  instruction.textContent = "Rotate your phone sideways to enter the dungeon.";
  instruction.style.cssText = "margin:0;color:#d6ddd9;font:13px/1.55 ui-monospace,Consolas,monospace";
  card.append(rune, title, instruction);
  gate.appendChild(card);
  container.appendChild(gate);

  const sync = (): void => {
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    gate.style.display = shouldRequireBreachV2Landscape(true, width, height) ? "grid" : "none";
  };
  window.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("resize", sync);
  sync();
  return {
    destroy: () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      gate.remove();
    },
  };
}
