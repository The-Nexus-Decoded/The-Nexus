import { describe, expect, it } from "vitest";
import { nextHudDrawer } from "../src/game/ui";

describe("HUD drawer state", () => {
  it("opens one requested drawer and closes it when the same toggle is tapped again", () => {
    expect(nextHudDrawer(null, "status")).toBe("status");
    expect(nextHudDrawer("status", "status")).toBeNull();
  });

  it("switches directly between drawers without keeping the old drawer open", () => {
    expect(nextHudDrawer("status", "guide")).toBe("guide");
  });
});
