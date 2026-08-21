export type FirstMemoryAction = "sealed" | "claim" | "ascend" | "arrived";

export function resolveFirstMemoryAction(input: {
  bossDefeated: boolean;
  memoryClaimed: boolean;
  ascended: boolean;
}): FirstMemoryAction {
  if (!input.bossDefeated) return "sealed";
  if (!input.memoryClaimed) return "claim";
  return input.ascended ? "arrived" : "ascend";
}
