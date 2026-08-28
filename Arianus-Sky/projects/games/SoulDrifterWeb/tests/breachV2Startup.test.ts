// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startBreachV2PreviewRoute } from "../src/game/dungeons/breach-v2-startup";

beforeEach(() => {
  document.body.replaceChildren();
  const creation = document.createElement("section");
  creation.id = "character-creation";
  document.body.appendChild(creation);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("BREACH-V2 preview startup recovery", () => {
  it("leaves the normal application alone when the preview route is absent", async () => {
    const loadPreview = vi.fn();
    const handled = await startBreachV2PreviewRoute({
      document,
      location: { href: "http://localhost/", assign: vi.fn(), reload: vi.fn() },
      loadPreview,
    });
    expect(handled).toBe(false);
    expect(loadPreview).not.toHaveBeenCalled();
    expect(document.getElementById("character-creation")?.hidden).toBe(false);
  });

  it("passes validated route settings into the preview", async () => {
    const startDungeonPreview = vi.fn().mockResolvedValue(undefined);
    const handled = await startBreachV2PreviewRoute({
      document,
      location: {
        href: "http://localhost/?dungeonPreview=breach-v2&seed=9001&path=oathbreaker&cam=walk",
        assign: vi.fn(),
        reload: vi.fn(),
      },
      loadPreview: async () => ({ startDungeonPreview }),
    });
    expect(handled).toBe(true);
    expect(startDungeonPreview).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      { seed: 9001, path: "oathbreaker", cam: "walk" },
    );
  });

  it("cleans partial UI and renders actionable Retry and Back recovery", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    const back = vi.fn();
    const startDungeonPreview = vi.fn(async (host: HTMLElement) => {
      const partialCanvas = document.createElement("canvas");
      partialCanvas.dataset.testid = "partial-preview";
      host.appendChild(partialCanvas);
      throw new Error("WebGL context unavailable");
    });
    const handled = await startBreachV2PreviewRoute({
      document,
      location: {
        href: "http://localhost/?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=isometric&dev=1&keep=yes",
        assign: vi.fn(),
        reload: vi.fn(),
      },
      loadPreview: async () => ({ startDungeonPreview }),
      onRetry: retry,
      onBack: back,
    });

    expect(handled).toBe(true);
    expect(document.querySelector("[data-testid='partial-preview']")).toBeNull();
    expect(document.querySelector("[data-testid='breach-v2-startup-error']")?.getAttribute("role")).toBe("alert");
    expect(document.querySelector("[data-testid='breach-v2-startup-error-message']")?.textContent).toContain("WebGL context unavailable");
    const retryButton = document.querySelector<HTMLButtonElement>("[data-testid='breach-v2-startup-retry']")!;
    const backButton = document.querySelector<HTMLButtonElement>("[data-testid='breach-v2-startup-back']")!;
    expect(document.activeElement).toBe(retryButton);
    retryButton.click();
    backButton.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(back).toHaveBeenCalledOnce();
    const exitUrl = back.mock.calls[0]?.[0] as URL;
    expect(exitUrl.searchParams.get("dungeonPreview")).toBeNull();
    expect(exitUrl.searchParams.get("dev")).toBeNull();
    expect(exitUrl.searchParams.get("keep")).toBe("yes");
  });
});
