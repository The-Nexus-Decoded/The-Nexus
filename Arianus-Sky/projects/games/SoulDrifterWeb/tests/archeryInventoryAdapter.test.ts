import { describe, expect, it } from "vitest";
import { commitArrowRelease, selectArrowType } from "../src/game/archery/archeryInventory";
import { quiverInventoryFromItems, syncQuiverInventoryToItems } from "../src/game/archery/archeryInventoryAdapter";
import { createStarterInventory } from "../src/game/equipment";

describe("archery inventory persistence adapter", () => {
  it("loads the starter quiver and arrows from separate inventory items", () => {
    const items = createStarterInventory("sharpshooter");
    expect(quiverInventoryFromItems(items)).toEqual({
      capacity: 100,
      selectedType: "standard",
      arrows: { standard: 10, fire: 0, ice: 0, poison: 0 },
    });
  });

  it("round-trips release depletion and selected elemental arrow type", () => {
    const items = createStarterInventory("sharpshooter");
    items.push({
      id: "starter-arrows-fire",
      name: "Fire arrows",
      kind: "ammunition",
      equipped: false,
      containerId: "starter-quiver",
      arrowType: "fire",
      quantity: 4,
      stackLimit: 100,
      description: "Fire arrows stored independently inside the quiver.",
    });
    const state = quiverInventoryFromItems(items)!;
    expect(selectArrowType(state, "fire")).toBe(true);
    expect(commitArrowRelease(state).released).toBe(true);
    syncQuiverInventoryToItems(items, state);

    expect(items.find((item) => item.id === "starter-quiver")?.selectedArrowType).toBe("fire");
    expect(items.find((item) => item.id === "starter-arrows-fire")?.quantity).toBe(3);
    expect(quiverInventoryFromItems(structuredClone(items))).toEqual(state);
  });

  it("creates newly acquired elemental arrow stacks inside the equipped quiver", () => {
    const items = createStarterInventory("sharpshooter");
    const state = quiverInventoryFromItems(items)!;
    state.arrows.poison = 2;
    syncQuiverInventoryToItems(items, state);
    expect(items.find((item) => item.arrowType === "poison")).toMatchObject({
      containerId: "starter-quiver",
      quantity: 2,
      equipped: false,
    });
  });
});
