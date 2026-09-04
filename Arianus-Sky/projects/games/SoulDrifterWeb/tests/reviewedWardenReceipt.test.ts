import { describe, expect, it } from "vitest";
import { cinderboundWardenActionNames } from "../src/game/dungeons/breach-v2-wardens";
import {
  prepareReviewedWardenReceipts, REVIEWED_FOURVIEW_WARDEN_RECEIPTS, reviewedWardenNote,
  type ReviewedWardenReceipt,
} from "../src/review/weapon-lab/reviewed-warden-receipt";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function wayfarer(overrides: Partial<ReviewedWardenReceipt> = {}): ReviewedWardenReceipt {
  return {
    kind: "wayfarer",
    url: "/assets/weapon-lab/wardens/wayfarer-cinderbound-warden-fourview-v1.glb",
    runtimeSourceSha256: SHA_A,
    bytes: 17_484_284,
    sha256: SHA_B,
    runtimeScale: 3.6733054326308605,
    clips: [...cinderboundWardenActionNames("wayfarer")],
    ...overrides,
  };
}

describe("Rebuilt Warden review intake", () => {
  it("lists exactly the rebuilt Warden bodies that cleared their gates", () => {
    expect(Object.keys(REVIEWED_FOURVIEW_WARDEN_RECEIPTS)).toEqual(["wayfarer"]);
    expect(Object.isFrozen(REVIEWED_FOURVIEW_WARDEN_RECEIPTS)).toBe(true);
    const listed = MOB_CATALOG.filter((entry) => entry.id.startsWith("warden-") && entry.id.endsWith("-4v"));
    expect(listed.map((entry) => entry.id)).toEqual(["warden-wayfarer-4v"]);
    const rebuilt = listed[0]!;
    // the rebuilt body is served from its own review url and never over the shipped asset
    expect(rebuilt.url).toBe(REVIEWED_FOURVIEW_WARDEN_RECEIPTS.wayfarer!.url);
    expect(rebuilt.runtimeUrl).toBe("/assets/3d/creatures/cinderbound-wardens/cinderbound-warden.glb");
    expect(rebuilt.url).not.toBe(rebuilt.runtimeUrl);
    expect(rebuilt.reviewedWardenMotion).toBe(REVIEWED_FOURVIEW_WARDEN_RECEIPTS.wayfarer);
    expect(rebuilt.label).toContain("four-view body");
    // the shipped Warden entry is untouched and still selectable
    const shipped = MOB_CATALOG.find((entry) => entry.id === "warden-wayfarer")!;
    expect(shipped.url).toBe(shipped.runtimeUrl);
    expect(shipped.reviewedWardenMotion).toBeUndefined();
    expect(shipped.sha256).not.toBe(rebuilt.sha256);
  });

  it("pins the rebuilt Warden to the shipped body it stands in for", () => {
    const shipped = MOB_CATALOG.find((entry) => entry.id === "warden-wayfarer")!;
    expect(REVIEWED_FOURVIEW_WARDEN_RECEIPTS.wayfarer!.runtimeSourceSha256).toBe(shipped.sha256);
  });

  it("accepts a complete receipt and freezes its clip list", () => {
    const prepared = prepareReviewedWardenReceipts({ wayfarer: wayfarer() });
    const receipt = prepared.wayfarer!;
    expect(receipt.kind).toBe("wayfarer");
    expect(receipt.clips).toEqual([...cinderboundWardenActionNames("wayfarer")]);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.clips)).toBe(true);
    expect(reviewedWardenNote(receipt)).toContain(`${receipt.clips.length} clips`);
  });

  it("accepts the Greater Warden's shorter authored clip set", () => {
    const oathbreaker = prepareReviewedWardenReceipts({
      oathbreaker: {
        ...wayfarer(), kind: "oathbreaker",
        url: "/assets/weapon-lab/wardens/oathbreaker-greater-cinderbound-warden-fourview-v1.glb",
        clips: [...cinderboundWardenActionNames("oathbreaker")],
      },
    }).oathbreaker!;
    expect(oathbreaker.clips).not.toContain("FurnaceShutdown");
    expect(oathbreaker.clips.length).toBeLessThan(cinderboundWardenActionNames("wayfarer").length);
  });

  it("rejects a pack that is missing any clip the runtime enumerates", () => {
    const short = cinderboundWardenActionNames("wayfarer").filter((name) => name !== "DeathCollapse");
    expect(() => prepareReviewedWardenReceipts({ wayfarer: wayfarer({ clips: [...short] }) }))
      .toThrow(/Invalid reviewed Warden receipt/);
  });

  it("rejects a receipt that points outside the review asset folder", () => {
    for (const url of [
      "/assets/3d/creatures/cinderbound-wardens/cinderbound-warden.glb",
      "/assets/weapon-lab/mobs/wayfarer-cinderbound-warden-fourview-v1.glb",
      "/assets/weapon-lab/wardens/oathbreaker-greater-cinderbound-warden-fourview-v1.glb",
      "https://example.invalid/wayfarer.glb",
    ]) {
      expect(() => prepareReviewedWardenReceipts({ wayfarer: wayfarer({ url }) }), url)
        .toThrow(/Invalid reviewed Warden receipt/);
    }
  });

  it("rejects mismatched kinds, bad hashes, bad sizes, bad scales and duplicate clips", () => {
    const bad: Partial<ReviewedWardenReceipt>[] = [
      { kind: "oathbreaker" },
      { sha256: "not-a-hash" },
      { sha256: SHA_B.toUpperCase() },
      { runtimeSourceSha256: "" },
      { bytes: 0 },
      { bytes: 1.5 },
      { runtimeScale: 0 },
      { runtimeScale: 1000 },
      { runtimeScale: Number.NaN },
      { clips: [...cinderboundWardenActionNames("wayfarer"), "Idle"] },
      { clips: [...cinderboundWardenActionNames("wayfarer"), "not a clip name"] },
    ];
    for (const overrides of bad) {
      expect(() => prepareReviewedWardenReceipts({ wayfarer: wayfarer(overrides) }), JSON.stringify(overrides))
        .toThrow(/Invalid reviewed Warden receipt/);
    }
  });

  it("rejects an unknown Warden kind outright", () => {
    expect(() => prepareReviewedWardenReceipts({ wanderer: wayfarer() } as never))
      .toThrow(/Invalid reviewed Warden receipt/);
  });
});
