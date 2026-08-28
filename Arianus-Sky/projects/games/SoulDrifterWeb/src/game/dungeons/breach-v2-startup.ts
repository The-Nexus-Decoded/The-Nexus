import type { BreachV2PathId } from "./breach-v2-generator.ts";

interface PreviewModule {
  startDungeonPreview(
    host: HTMLElement,
    options: { seed: number; path: BreachV2PathId; cam: string },
  ): Promise<void>;
}

interface LocationPort {
  href: string;
  assign(url: string | URL): void;
  reload(): void;
}

export interface BreachV2PreviewStartupOptions {
  document?: Document;
  location?: LocationPort;
  loadPreview?: () => Promise<PreviewModule>;
  onRetry?: () => void;
  onBack?: (url: URL) => void;
}

function previewExitUrl(href: string): URL {
  const url = new URL(href);
  for (const key of ["dungeonPreview", "seed", "path", "cam", "dev", "start", "rev"]) {
    url.searchParams.delete(key);
  }
  return url;
}

function renderPreviewStartupFailure(
  host: HTMLElement,
  error: unknown,
  retry: () => void,
  back: () => void,
): void {
  host.replaceChildren();
  const documentPort = host.ownerDocument;
  const panel = documentPort.createElement("section");
  panel.dataset.testid = "breach-v2-startup-error";
  panel.setAttribute("role", "alert");
  panel.style.cssText = [
    "position:fixed", "inset:0", "display:grid", "place-items:center", "padding:24px",
    "box-sizing:border-box", "background:#080c10", "color:#eee4cf", "font:15px/1.5 ui-monospace,monospace",
  ].join(";");
  const card = documentPort.createElement("div");
  card.style.cssText = [
    "width:min(560px,100%)", "padding:24px", "border:1px solid rgba(228,185,103,.58)",
    "border-radius:16px", "background:linear-gradient(165deg,#101518,#211a15)", "box-shadow:0 24px 80px #000",
  ].join(";");
  const title = documentPort.createElement("h1");
  title.textContent = "The dungeon preview could not start";
  title.style.cssText = "margin:0;color:#f0c879;font:700 22px/1.2 Georgia,serif";
  const message = documentPort.createElement("p");
  message.dataset.testid = "breach-v2-startup-error-message";
  message.textContent = error instanceof Error ? error.message : "An unknown preview startup error occurred.";
  const guidance = documentPort.createElement("p");
  guidance.textContent = "Retry the preview. If storage is waiting on an older version, close other SoulDrifter tabs first.";
  guidance.style.color = "#b9c7c7";
  const actions = documentPort.createElement("div");
  actions.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin-top:18px";
  const retryButton = documentPort.createElement("button");
  retryButton.type = "button";
  retryButton.dataset.testid = "breach-v2-startup-retry";
  retryButton.textContent = "Retry preview";
  const backButton = documentPort.createElement("button");
  backButton.type = "button";
  backButton.dataset.testid = "breach-v2-startup-back";
  backButton.textContent = "Back to SoulDrifter";
  for (const button of [retryButton, backButton]) {
    button.style.cssText = "min-height:44px;padding:0 16px;border:1px solid #d6a85f;border-radius:999px;background:#182228;color:#fff1d5;cursor:pointer";
  }
  retryButton.addEventListener("click", retry);
  backButton.addEventListener("click", back);
  actions.append(retryButton, backButton);
  card.append(title, message, guidance, actions);
  panel.appendChild(card);
  host.appendChild(panel);
  retryButton.focus();
}

export async function startBreachV2PreviewRoute(
  options: BreachV2PreviewStartupOptions = {},
): Promise<boolean> {
  const documentPort = options.document ?? document;
  const locationPort = options.location ?? window.location;
  const searchParams = new URL(locationPort.href).searchParams;
  if (searchParams.get("dungeonPreview") !== "breach-v2") return false;

  const creationShell = documentPort.getElementById("character-creation");
  if (creationShell) creationShell.hidden = true;
  const host = documentPort.createElement("div");
  host.dataset.testid = "breach-v2-preview-host";
  documentPort.body.appendChild(host);
  const seedParam = searchParams.get("seed");
  const seed = seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : 4182;
  const path: BreachV2PathId = searchParams.get("path") === "oathbreaker" ? "oathbreaker" : "wayfarer";
  const cam = searchParams.get("cam") ?? "isometric";

  try {
    const preview = await (options.loadPreview?.() ?? import("./breach-v2-preview.ts"));
    await preview.startDungeonPreview(host, { seed, path, cam });
  } catch (error) {
    console.error("BREACH-V2 preview startup failed.", error);
    const exitUrl = previewExitUrl(locationPort.href);
    renderPreviewStartupFailure(
      host,
      error,
      options.onRetry ?? (() => locationPort.reload()),
      () => options.onBack ? options.onBack(exitUrl) : locationPort.assign(exitUrl),
    );
  }
  return true;
}
