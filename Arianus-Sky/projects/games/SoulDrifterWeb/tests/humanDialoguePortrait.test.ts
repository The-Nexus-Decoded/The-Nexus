import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import type { HumanAppearancePortraitController } from "../src/game/humanAppearanceAssembly";
import {
  HumanDialoguePortraitRenderer,
  type HumanDialoguePortraitElements,
  type HumanDialoguePortraitRenderSurface,
} from "../src/game/humanDialoguePortrait";

function portraitElements(): HumanDialoguePortraitElements {
  return {
    stage: { dataset: {} } as unknown as HTMLElement,
    canvas: { clientWidth: 240, clientHeight: 300, hidden: false } as unknown as HTMLCanvasElement,
    fallbackImage: { hidden: false } as unknown as HTMLImageElement,
  };
}

function portraitController(id: string) {
  const model = new THREE.Group();
  model.name = id;
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.6), new THREE.MeshBasicMaterial()));
  return {
    model,
    capability: {
      status: "READY",
      animatedMeshCount: 1,
      availableMorphs: [],
      missingMorphs: [],
      availableAgeMorphs: [],
      capabilities: { blink: true, gaze: true, speech: true },
    },
    beginDialogue: vi.fn<(text: string, elapsedSeconds: number) => void>(),
    speakLine: vi.fn<(text: string, elapsedSeconds: number) => void>(),
    update: vi.fn<(elapsedSeconds: number) => void>(),
    closeDialogue: vi.fn<() => void>(),
  } satisfies HumanAppearancePortraitController;
}

function renderSurface() {
  return {
    setPixelRatio: vi.fn<(pixelRatio: number) => void>(),
    setSize: vi.fn<(width: number, height: number, updateStyle: boolean) => void>(),
    render: vi.fn<(scene: THREE.Scene, camera: THREE.Camera) => void>(),
    dispose: vi.fn<() => void>(),
    forceContextLoss: vi.fn<() => void>(),
  } satisfies HumanDialoguePortraitRenderSurface;
}

describe("shared Human dialogue portrait renderer", () => {
  it("reuses one renderer and canvas while replacing the isolated actor controller", () => {
    const elements = portraitElements();
    const surface = renderSurface();
    const factory = vi.fn(() => surface);
    const portrait = new HumanDialoguePortraitRenderer(elements, factory);
    const first = portraitController("ilyra");
    const second = portraitController("orren");

    portrait.mountActor(first, "Welcome back.", 2);
    portrait.speakLine("Choose your path.", 2.4);
    portrait.frame(2.5);
    portrait.mountActor(second, "The loom is waiting.", 3);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(elements.canvas);
    expect(elements.stage.dataset.portraitMode).toBe("actor");
    expect(elements.canvas.hidden).toBe(false);
    expect(elements.fallbackImage.hidden).toBe(true);
    expect(first.beginDialogue).toHaveBeenCalledWith("Welcome back.", 2);
    expect(first.speakLine).toHaveBeenCalledWith("Choose your path.", 2.4);
    expect(first.update).toHaveBeenLastCalledWith(2.5);
    expect(first.closeDialogue).toHaveBeenCalledTimes(1);
    expect(first.model.parent).toBeNull();
    expect(second.beginDialogue).toHaveBeenCalledWith("The loom is waiting.", 3);
    expect(surface.setSize).toHaveBeenCalledWith(240, 300, false);
    expect(surface.render).toHaveBeenCalled();
  });

  it("keeps static quest sprites renderer-free and releases the WebGL context on destroy", () => {
    const elements = portraitElements();
    const surface = renderSurface();
    const factory = vi.fn(() => surface);
    const portrait = new HumanDialoguePortraitRenderer(elements, factory);

    portrait.showFallback();
    expect(factory).not.toHaveBeenCalled();
    expect(elements.stage.dataset.portraitMode).toBe("sprite");
    expect(elements.canvas.hidden).toBe(true);
    expect(elements.fallbackImage.hidden).toBe(false);

    const actor = portraitController("brannoc");
    portrait.mountActor(actor, "Steel remembers.", 4);
    portrait.destroy();
    portrait.destroy();

    expect(actor.closeDialogue).toHaveBeenCalledTimes(1);
    expect(surface.dispose).toHaveBeenCalledTimes(1);
    expect(surface.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(() => portrait.mountActor(portraitController("late"), "Too late.", 5)).toThrow(/after renderer disposal/);
  });
});
