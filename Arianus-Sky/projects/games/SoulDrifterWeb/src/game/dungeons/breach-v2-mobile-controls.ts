export const BREACH_V2_ISOMETRIC_MIN_DISTANCE = 6;
export const BREACH_V2_ISOMETRIC_MAX_DISTANCE = 36;
export const BREACH_V2_MOBILE_ZOOM_STEP = 3.5;

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
