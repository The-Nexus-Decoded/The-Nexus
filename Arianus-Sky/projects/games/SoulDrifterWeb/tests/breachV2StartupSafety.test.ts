import { describe, expect, it, vi } from "vitest";

import {
  BREACH_V2_LEGACY_SPATIAL_SESSION_KEY,
  clearBreachV2LegacySpatialStateForExplicitUrl,
  compileBreachV2StartupShaders,
} from "../src/game/dungeons/breach-v2-startup-safety";

describe("BREACH-V2 startup safety", () => {
  it.each([
    "https://example.test/?dungeonPreview=breach-v2&cam=isometric",
    "https://example.test/?dungeonPreview=breach-v2&start=H-01",
    "https://example.test/?dungeonPreview=breach-v2&cam=isometric&start=H-01",
  ])("clears obsolete spatial state when the URL is authoritative: %s", (href) => {
    const removeItem = vi.fn();
    expect(clearBreachV2LegacySpatialStateForExplicitUrl(new URL(href), { removeItem })).toBe(true);
    expect(removeItem).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledWith(BREACH_V2_LEGACY_SPATIAL_SESSION_KEY);
  });

  it("leaves session state untouched when no camera or start is explicit", () => {
    const removeItem = vi.fn();
    const url = new URL("https://example.test/?dungeonPreview=breach-v2&seed=4182");
    expect(clearBreachV2LegacySpatialStateForExplicitUrl(url, { removeItem })).toBe(false);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("compiles shaders without forcing textures, renders, or a WebGL finish", async () => {
    const compileAsync = vi.fn(async () => undefined);
    const initTexture = vi.fn();
    const render = vi.fn();
    const getContext = vi.fn();
    const scene = { id: "scene" };
    const camera = { id: "camera" };
    const renderer = { compileAsync, initTexture, render, getContext };

    await compileBreachV2StartupShaders(renderer, scene, camera);

    expect(compileAsync).toHaveBeenCalledOnce();
    expect(compileAsync).toHaveBeenCalledWith(scene, camera);
    expect(initTexture).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(getContext).not.toHaveBeenCalled();
  });
});
