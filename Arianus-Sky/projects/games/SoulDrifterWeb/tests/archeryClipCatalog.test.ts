import { describe, expect, it } from "vitest";
import {
  ARCHERY_CLIP_CATALOG,
  archeryClipSpec,
  missingArcherySourceClipNames,
  requiredArcherySourceClipNames,
} from "../src/game/archery/archeryClipCatalog";

describe("archery clip catalog", () => {
  it("defines every reviewed bow action as a unique semantic role", () => {
    expect(ARCHERY_CLIP_CATALOG).toHaveLength(13);
    expect(new Set(ARCHERY_CLIP_CATALOG.map((spec) => spec.role)).size).toBe(13);
    expect(new Set(ARCHERY_CLIP_CATALOG.map((spec) => spec.semanticName)).size).toBe(13);
  });

  it("preserves the authored retrieval markers and exact source clip", () => {
    expect(archeryClipSpec("retrieve-arrow")).toMatchObject({
      sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowDrawArrow"],
      sourceDurationSeconds: 1.067,
      markers: {
        featherGrip: 0.22,
        fullyExtracted: 0.5,
        overhead: 0.66,
        forwardStaged: 0.82,
        nocked: 0.94,
      },
    });
  });

  it("reports missing raw sources once even when multiple authored actions share one", () => {
    const required = requiredArcherySourceClipNames();
    expect(required.filter((name) => name.endsWith("BowShoot"))).toHaveLength(1);
    expect(missingArcherySourceClipNames(required.filter((name) => !name.endsWith("BowShoot"))))
      .toEqual(["Interactions__HumanMasculineAthleticMuscularBowShoot"]);
    expect(missingArcherySourceClipNames(required)).toEqual([]);
  });
});
