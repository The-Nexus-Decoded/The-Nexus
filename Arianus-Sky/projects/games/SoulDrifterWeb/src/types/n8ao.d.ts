/** Minimal typings for the untyped n8ao package (vendored declaration). */
declare module "n8ao" {
  import type { Camera, Scene } from "three";
  import type { Pass } from "postprocessing";

  export interface N8AOConfiguration {
    aoRadius: number;
    distanceFalloff: number;
    intensity: number;
    halfRes: boolean;
    color: unknown;
    [key: string]: unknown;
  }

  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: N8AOConfiguration;
    setSize(width: number, height: number): void;
  }
}
