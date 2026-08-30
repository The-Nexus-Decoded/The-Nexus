import type { InventoryItem } from "../equipment";
import {
  ARROW_TYPES,
  createQuiverInventory,
  type ArrowType,
  type QuiverInventoryState,
} from "./archeryInventory";

export function equippedQuiverItem(items: readonly InventoryItem[]): InventoryItem | undefined {
  return items.find((item) => item.slot === "back" && item.equipped && (item.quiverCapacity ?? 0) > 0);
}

export function quiverInventoryFromItems(items: readonly InventoryItem[]): QuiverInventoryState | undefined {
  const quiver = equippedQuiverItem(items);
  if (!quiver) return undefined;
  const counts: Partial<Record<ArrowType, number>> = {};
  for (const item of items) {
    if (item.containerId !== quiver.id || item.kind !== "ammunition" || !item.arrowType) continue;
    counts[item.arrowType] = (counts[item.arrowType] ?? 0) + (item.quantity ?? 0);
  }
  return createQuiverInventory(
    counts,
    quiver.selectedArrowType ?? "standard",
    quiver.quiverCapacity,
  );
}

export function syncQuiverInventoryToItems(items: InventoryItem[], state: QuiverInventoryState): void {
  const quiver = equippedQuiverItem(items);
  if (!quiver) throw new Error("Cannot persist arrows without an equipped quiver.");
  if (quiver.quiverCapacity !== state.capacity) throw new Error("Persisted quiver capacity does not match runtime state.");
  quiver.selectedArrowType = state.selectedType;

  for (const type of ARROW_TYPES) {
    const existing = items.find((item) => item.containerId === quiver.id && item.arrowType === type);
    if (existing) {
      existing.quantity = state.arrows[type];
      continue;
    }
    if (state.arrows[type] <= 0) continue;
    items.push({
      id: `${quiver.id}-arrows-${type}`,
      name: `${type[0]!.toUpperCase()}${type.slice(1)} arrows`,
      kind: "ammunition",
      equipped: false,
      containerId: quiver.id,
      arrowType: type,
      quantity: state.arrows[type],
      stackLimit: state.capacity,
      description: `${type} arrows stored as independent items inside ${quiver.name}.`,
    });
  }
}
