import { describe, expect, it } from "vitest";
import {
  PILOT_SKIN_PRESETS,
  pilotSkinMaskWeight,
  pilotSkinPresetAllowed,
  recolorPilotSkinPixel,
} from "../src/game/pilotSkinReview";

describe("issue 487 pilot skin review", () => {
  it("separates warm skin texels from the gray boxer fabric", () => {
    expect(pilotSkinMaskWeight(0.72, 0.52, 0.43)).toBeGreaterThan(0.9);
    expect(pilotSkinMaskWeight(0.35, 0.37, 0.39)).toBe(0);
  });

  it("preserves non-skin pixels while retaining luminance detail in dark skin", () => {
    const fabric = [0.35, 0.37, 0.39] as const;
    expect(recolorPilotSkinPixel(fabric, [0.27, 0.14, 0.11])).toEqual(fabric);

    const highlight = recolorPilotSkinPixel([0.78, 0.59, 0.49], [0.27, 0.14, 0.11]);
    const shadow = recolorPilotSkinPixel([0.42, 0.28, 0.22], [0.27, 0.14, 0.11]);
    expect(highlight[0]).toBeGreaterThan(shadow[0]);
    expect(highlight[0]).toBeLessThan(0.6);
  });

  it("gates the Dark Elf palette to Elf ancestry", () => {
    expect(pilotSkinPresetAllowed("dark-elf", "elf")).toBe(true);
    expect(pilotSkinPresetAllowed("dark-elf", "human")).toBe(false);
    expect(pilotSkinPresetAllowed("dark-elf", "dwarf")).toBe(false);
    expect(PILOT_SKIN_PRESETS.map((preset) => preset.id)).toContain("deep-dark");
  });
});
