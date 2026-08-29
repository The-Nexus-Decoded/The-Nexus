import * as THREE from "three";

import type { HumanAppearancePortraitController } from "./humanAppearanceAssembly";

export interface HumanDialoguePortraitElements {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  fallbackImage: HTMLImageElement;
}

export interface HumanDialoguePortraitRenderSurface {
  setPixelRatio(pixelRatio: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
  forceContextLoss?(): void;
}

export type HumanDialoguePortraitRendererFactory = (
  canvas: HTMLCanvasElement,
) => HumanDialoguePortraitRenderSurface;

const createWebGlRenderer: HumanDialoguePortraitRendererFactory = (canvas) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
};

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required dialogue portrait element #${id}.`);
  return element as T;
}

/**
 * Owns one reusable dialogue canvas and renderer. Actor portraits are isolated
 * clones of an already assembled live actor, so this renderer never starts a
 * second model request or builds a second appearance identity.
 */
export class HumanDialoguePortraitRenderer {
  private readonly scene = new THREE.Scene();
  private readonly actorRoot = new THREE.Group();
  private readonly camera = new THREE.PerspectiveCamera(29, 1, 0.01, 100);
  private renderer: HumanDialoguePortraitRenderSurface | null = null;
  private activeController: HumanAppearancePortraitController | null = null;
  private renderWidth = 0;
  private renderHeight = 0;
  private cameraDirty = true;
  private disposed = false;

  public constructor(
    private readonly elements: HumanDialoguePortraitElements,
    private readonly rendererFactory: HumanDialoguePortraitRendererFactory = createWebGlRenderer,
  ) {
    this.actorRoot.name = "human-dialogue-portrait-actor";
    this.scene.add(
      this.actorRoot,
      new THREE.HemisphereLight(0xcbe8ef, 0x241b18, 2.1),
      new THREE.AmbientLight(0x8da5ab, 1.35),
    );
    const key = new THREE.DirectionalLight(0xffead0, 3.2);
    key.position.set(2.5, 4.5, 4);
    this.scene.add(key);
    this.camera.layers.enableAll();
    this.showFallback();
  }

  public mountActor(
    controller: HumanAppearancePortraitController,
    dialogueText: string,
    elapsedSeconds: number,
  ): void {
    if (this.disposed) throw new Error("Cannot mount a dialogue portrait after renderer disposal.");
    this.releaseActor();
    this.activeController = controller;
    const model = controller.model;
    model.position.set(0, 0, 0);
    model.quaternion.identity();
    model.traverse((child) => {
      if (child instanceof THREE.Sprite) child.visible = false;
    });
    this.actorRoot.add(model);
    model.updateMatrixWorld(true);
    this.cameraDirty = true;

    this.elements.stage.dataset.portraitMode = "actor";
    this.elements.fallbackImage.hidden = true;
    this.elements.canvas.hidden = false;
    controller.beginDialogue(dialogueText, elapsedSeconds);
    this.frame(elapsedSeconds);
  }

  public speakLine(text: string, elapsedSeconds: number): void {
    this.activeController?.speakLine(text, elapsedSeconds);
  }

  /** Updates facial motion and draws one frame into the shared canvas. */
  public frame(elapsedSeconds: number): boolean {
    const controller = this.activeController;
    if (!controller || this.disposed) return false;
    controller.update(elapsedSeconds);
    const renderer = this.ensureRenderer();
    const width = Math.max(1, Math.round(this.elements.canvas.clientWidth || 190));
    const height = Math.max(1, Math.round(this.elements.canvas.clientHeight || 285));
    if (width !== this.renderWidth || height !== this.renderHeight) {
      renderer.setSize(width, height, false);
      this.renderWidth = width;
      this.renderHeight = height;
      this.cameraDirty = true;
    }
    if (this.cameraDirty) {
      this.fitCamera(controller.model, width / height);
      this.cameraDirty = false;
    }
    renderer.render(this.scene, this.camera);
    return true;
  }

  /** Restores the static image path used by non-actor dialogue and quest scenes. */
  public showFallback(): void {
    this.releaseActor();
    this.elements.stage.dataset.portraitMode = "sprite";
    this.elements.canvas.hidden = true;
    this.elements.fallbackImage.hidden = false;
  }

  public destroy(): void {
    if (this.disposed) return;
    this.showFallback();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer = null;
    this.disposed = true;
  }

  private ensureRenderer(): HumanDialoguePortraitRenderSurface {
    if (!this.renderer) {
      this.renderer = this.rendererFactory(this.elements.canvas);
      const pixelRatio = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 2);
      this.renderer.setPixelRatio(pixelRatio);
    }
    return this.renderer;
  }

  private releaseActor(): void {
    if (!this.activeController) return;
    this.activeController.closeDialogue();
    this.activeController.model.removeFromParent();
    this.activeController = null;
  }

  private fitCamera(model: THREE.Object3D, aspect: number): void {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const bodyHeight = Math.max(0.5, size.y);
    const targetY = bounds.max.y - bodyHeight * 0.19;
    const verticalHalfSpan = Math.max(0.3, bodyHeight * 0.25);
    const horizontalHalfSpan = Math.max(0.25, size.x * 0.42);
    const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    const distance = Math.max(
      verticalHalfSpan / halfFovTangent,
      horizontalHalfSpan / (Math.max(0.25, aspect) * halfFovTangent),
    ) * 1.12;
    this.camera.aspect = aspect;
    this.camera.position.set(center.x, targetY, center.z + distance);
    this.camera.lookAt(center.x, targetY - bodyHeight * 0.025, center.z);
    this.camera.updateProjectionMatrix();
  }
}

export function bindHumanDialoguePortraitRenderer(): HumanDialoguePortraitRenderer {
  return new HumanDialoguePortraitRenderer({
    stage: requiredElement<HTMLElement>("dialogue-portrait-stage"),
    canvas: requiredElement<HTMLCanvasElement>("dialogue-portrait-canvas"),
    fallbackImage: requiredElement<HTMLImageElement>("dialogue-portrait"),
  });
}
