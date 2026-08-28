export const BREACH_V2_ISOMETRIC_MIN_DISTANCE = 6;
export const BREACH_V2_ISOMETRIC_MAX_DISTANCE = 36;

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
}): MobileMovementPad {
  const { container, keys, enabled } = options;
  if (!enabled) return { destroy: () => undefined };

  const root = document.createElement("div");
  root.dataset.testid = "breach-v2-mobile-dpad";
  root.setAttribute("aria-label", "Movement pad");
  root.style.cssText = [
    "position:absolute", "left:14px", "bottom:max(18px,env(safe-area-inset-bottom))", "z-index:24",
    "display:grid", "grid-template:repeat(3,46px)/repeat(3,46px)", "gap:4px",
    "width:146px", "height:146px", "pointer-events:none", "touch-action:none",
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

  container.appendChild(root);
  return {
    destroy: () => {
      for (const direction of DIRECTIONS) keys.delete(direction.code);
      root.remove();
    },
  };
}
