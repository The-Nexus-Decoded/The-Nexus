import type { BreachV2Layout } from "./breach-v2-layout.ts";

interface BreachV2DevPanelOptions {
  container: HTMLElement;
  layout: BreachV2Layout;
  seed: number;
  path: "wayfarer" | "oathbreaker";
  cam: string;
  warp: (x: number, z: number) => boolean;
}

const CAMERA_MODES = [
  ["walk", "Walk from start"],
  ["vestibule", "Realm-Lock Vestibule"],
  ["plaza", "Threshold Plaza"],
  ["gallery", "Current route gallery"],
  ["boss", "Ashen Lock boss"],
  ["exit", "Way Upward exit"],
  ["overview", "Full dungeon overview"],
] as const;

function replacePreviewParams(values: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.location.assign(url);
}

export function setupBreachV2DevPanel(options: BreachV2DevPanelOptions): void {
  const panel = document.createElement("aside");
  panel.dataset.testid = "breach-v2-dev-panel";
  panel.setAttribute("aria-label", "BREACH-V2 developer map controls");
  panel.style.cssText = [
    "position:absolute", "top:12px", "right:12px", "z-index:30", "width:min(310px,calc(100vw - 24px))",
    "max-height:calc(100vh - 24px)", "overflow:auto", "padding:12px", "box-sizing:border-box",
    "background:linear-gradient(165deg,rgba(16,19,20,.96),rgba(27,22,18,.94))",
    "color:#e9dfc7", "border:1px solid rgba(190,145,76,.58)", "border-radius:3px",
    "box-shadow:0 18px 55px rgba(0,0,0,.52),inset 0 0 30px rgba(128,73,28,.08)",
    "font:12px/1.45 Georgia,serif", "backdrop-filter:blur(9px)", "letter-spacing:.02em",
  ].join(";");

  const header = document.createElement("button");
  header.type = "button";
  header.dataset.testid = "breach-v2-dev-toggle";
  header.style.cssText = [
    "display:flex", "align-items:center", "justify-content:space-between", "width:100%", "padding:0 0 9px",
    "border:0", "border-bottom:1px solid rgba(190,145,76,.35)", "background:transparent", "color:#e4b967",
    "font:700 12px/1.2 Georgia,serif", "letter-spacing:.13em", "cursor:pointer", "text-transform:uppercase",
  ].join(";");
  header.innerHTML = "<span>Dungeon survey controls</span><span aria-hidden=\"true\">`</span>";
  panel.appendChild(header);

  const body = document.createElement("div");
  body.style.paddingTop = "8px";
  panel.appendChild(body);

  const initiallyOpen = import.meta.env.DEV || new URL(window.location.href).searchParams.get("dev") === "1";
  let open = initiallyOpen;
  const syncOpen = (): void => {
    body.hidden = !open;
    panel.style.width = open ? "min(310px,calc(100vw - 24px))" : "min(240px,calc(100vw - 24px))";
    header.setAttribute("aria-expanded", String(open));
  };
  const toggle = (): void => { open = !open; syncOpen(); };
  header.addEventListener("click", toggle);
  window.addEventListener("keydown", (event) => {
    if ((event.key === "`" || event.key === "~") && !(event.target instanceof HTMLInputElement)) toggle();
  });

  const section = (label: string): HTMLDivElement => {
    const heading = document.createElement("div");
    heading.textContent = label;
    heading.style.cssText = "margin:10px 0 5px;color:#9e9178;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase";
    body.appendChild(heading);
    return heading;
  };
  const button = (label: string, action: () => void, active = false): HTMLButtonElement => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.style.cssText = [
      "display:block", "width:100%", "margin:3px 0", "padding:6px 8px", "text-align:left", "cursor:pointer",
      `background:${active ? "rgba(155,95,38,.42)" : "rgba(34,38,34,.78)"}`,
      `border:1px solid ${active ? "#c9954b" : "rgba(112,103,78,.48)"}`, "border-radius:2px", "color:#eee4cf",
      "font:11px/1.25 ui-monospace,Consolas,monospace",
    ].join(";");
    element.addEventListener("click", action);
    body.appendChild(element);
    return element;
  };

  section("Run configuration");
  const routeRow = document.createElement("div");
  routeRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px";
  for (const path of ["wayfarer", "oathbreaker"] as const) {
    const routeButton = button(path, () => replacePreviewParams({ path, start: "vestibule" }), path === options.path);
    routeRow.appendChild(routeButton);
  }
  body.appendChild(routeRow);

  const seedRow = document.createElement("div");
  seedRow.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:4px;margin-top:5px";
  const seedInput = document.createElement("input");
  seedInput.type = "number";
  seedInput.min = "0";
  seedInput.step = "1";
  seedInput.value = String(options.seed);
  seedInput.setAttribute("aria-label", "Dungeon seed");
  seedInput.style.cssText = "min-width:0;padding:6px 8px;background:#141815;color:#f0e5ce;border:1px solid rgba(112,103,78,.6);border-radius:2px;font:11px ui-monospace,monospace";
  const applySeed = document.createElement("button");
  applySeed.type = "button";
  applySeed.textContent = "Rebuild";
  applySeed.style.cssText = "padding:6px 9px;background:#6f4525;color:#fff1d5;border:1px solid #b47d43;border-radius:2px;cursor:pointer;font:700 11px ui-monospace,monospace";
  applySeed.addEventListener("click", () => {
    const parsed = Number.parseInt(seedInput.value, 10);
    replacePreviewParams({ seed: String(Number.isFinite(parsed) ? Math.max(0, parsed) : 4182), start: "vestibule" });
  });
  seedRow.append(seedInput, applySeed);
  body.appendChild(seedRow);

  section("Camera mode");
  for (const [id, label] of CAMERA_MODES) {
    button(label, () => replacePreviewParams({ cam: id }), options.cam === id);
  }

  section("Warp to section");
  for (const room of options.layout.rooms) {
    const roomId = "poolRoomId" in room ? room.poolRoomId : room.id;
    const label = `${room.fixed ? "◆" : "◇"} ${room.name} · ${roomId}`;
    const x = room.x + room.w / 2;
    const z = room.z + room.h / 2;
    const roomButton = button(label, () => {
      if (!options.warp(x, z)) replacePreviewParams({ cam: "walk", start: room.id });
    });
    roomButton.dataset.roomId = room.id;
  }

  section("QA helpers");
  button("Reset walk to Soul Well", () => replacePreviewParams({ cam: "walk", start: "vestibule" }));
  button("Show encounter markers", () => replacePreviewParams({ markers: "1" }));
  button("Hide encounter markers", () => replacePreviewParams({ markers: null }));

  const foot = document.createElement("p");
  foot.textContent = "Walk: WASD / arrows · Shift sprint · drag look · wheel zoom · Q/E rotate";
  foot.style.cssText = "margin:10px 0 0;padding-top:8px;border-top:1px solid rgba(190,145,76,.24);color:#b8ad96;font:10px/1.45 ui-monospace,monospace";
  body.appendChild(foot);

  options.container.appendChild(panel);
  syncOpen();
}
