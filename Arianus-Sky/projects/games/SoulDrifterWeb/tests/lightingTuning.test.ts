import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIGHTING_TUNING,
  LIGHTING_TUNING_SCHEMA_VERSION,
  LightingTuningRegistry,
  normalizeLightingTuningDocument,
} from "../src/game/lightingTuning";

describe("lighting tuning document", () => {
  it("normalizes a versioned backend-editable lighting profile", () => {
    const profile = normalizeLightingTuningDocument({
      schemaVersion: LIGHTING_TUNING_SCHEMA_VERSION,
      revision: "admin-preview-4",
      exposure: 1.25,
      paperDollExposure: 1.3,
      fogDensity: 0.02,
      shadowQuality: "pcf-soft",
      shadowMapSize: 1500,
      hemisphereIntensity: 0.5,
      ambientIntensity: 0.1,
      keyIntensity: 3.4,
      rimIntensity: 0.9,
      localLightMultiplier: 0.7,
      roomOverrides: { training: { localLightMultiplier: 0.6 } },
    });
    expect(profile.revision).toBe("admin-preview-4");
    expect(profile.shadowMapSize).toBe(1024);
    expect(profile.roomOverrides.training?.localLightMultiplier).toBe(0.6);
  });

  it("rejects incompatible schemas and clamps unsafe values", () => {
    expect(normalizeLightingTuningDocument({ schemaVersion: 99 })).toEqual(DEFAULT_LIGHTING_TUNING);
    const profile = normalizeLightingTuningDocument({
      ...DEFAULT_LIGHTING_TUNING,
      exposure: 99,
      fogDensity: -1,
      localLightMultiplier: 0,
    });
    expect(profile.exposure).toBe(2.5);
    expect(profile.fogDensity).toBe(0);
    expect(profile.localLightMultiplier).toBe(0.1);
  });

  it("replaces the active profile through one shared registry boundary", () => {
    const registry = new LightingTuningRegistry();
    registry.replace({ ...DEFAULT_LIGHTING_TUNING, revision: "live-admin-edit", keyIntensity: 4 });
    expect(registry.snapshot()).toMatchObject({ revision: "live-admin-edit", keyIntensity: 4 });
  });
});
