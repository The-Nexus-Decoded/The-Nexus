import { afterEach, describe, expect, it, vi } from "vitest";
import { setupBreachV2CreatureReview } from "../src/game/dungeons/breach-v2-creature-review";
import type { BreachV2BreachlingRuntime } from "../src/game/dungeons/breach-v2-breachlings";

class ReviewElement extends EventTarget {
  children: ReviewElement[] = [];
  style = { cssText: "", width: "" };
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  value = "";
  textContent = "";
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  append(...children: ReviewElement[]): void { this.children.push(...children); }
  appendChild(child: ReviewElement): void { this.children.push(child); }
  replaceChildren(...children: ReviewElement[]): void { this.children = children; }
  remove(): void { this.children = []; }
}

function setup() {
  const elements: ReviewElement[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const element = new ReviewElement();
      elements.push(element);
      return element;
    },
  });
  const runtime = {
    snapshots: () => [{
      id: "base", tier: "base", actionNames: ["Death", "BiteAttack"],
      currentClip: "Death", targetHeightMeters: 1.025, groundingStatus: "calibrated-live-pose",
    }],
    play: vi.fn(), pause: vi.fn(), pose: vi.fn(),
  };
  const review = setupBreachV2CreatureReview(
    new ReviewElement() as unknown as HTMLElement,
    runtime as unknown as BreachV2BreachlingRuntime,
  );
  review.update();
  const action = elements.find((element) => element.attributes.get("aria-label") === "Breachling animation list")!;
  return { elements, runtime, review, action };
}

afterEach(() => vi.unstubAllGlobals());

describe("Breachling explicit review transitions", () => {
  it("selects an attack immediately instead of blending from the terminal death", () => {
    const { action, runtime, review } = setup();
    action.value = "BiteAttack";
    action.dispatchEvent(new Event("change"));
    expect(runtime.play).toHaveBeenCalledExactlyOnceWith("base", "BiteAttack", { immediate: true });
    expect(runtime.pause).toHaveBeenCalledWith("base", false);
    review.dispose();
  });

  it.each(["Play", "Restart"])("%s restarts an explicit pose without the corpse crossfade", (label) => {
    const { elements, runtime, review } = setup();
    elements.find((element) => element.textContent === label)!.dispatchEvent(new Event("click"));
    expect(runtime.play).toHaveBeenCalledExactlyOnceWith("base", "Death", { immediate: true });
    review.dispose();
  });

  it("keeps timeline scrubbing on the existing deterministic pose path", () => {
    const { elements, runtime, review } = setup();
    const timeline = elements.find((element) => element.attributes.get("aria-label") === "Breachling animation timeline")!;
    timeline.value = "1000";
    timeline.dispatchEvent(new Event("input"));
    expect(runtime.pose).toHaveBeenCalledExactlyOnceWith("base", "Death", 1);
    expect(runtime.play).not.toHaveBeenCalled();
    review.dispose();
  });
});
