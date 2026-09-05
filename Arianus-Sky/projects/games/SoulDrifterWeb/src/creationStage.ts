/**
 * The creator's painted backdrop: one prologue painting, blurred and cover-cropped per
 * station, crossfaded between two stacked canvases, with a slow drift.
 *
 * The sharp painting never reaches the screen. It is composited once per station change
 * into an offscreen canvas at a quarter of the viewport, blurred there, and the visible
 * canvases are CSS-stretched to the viewport - the upscale adds to the blur for free and
 * keeps the whole thing to one decode and a few kilobytes of pixels.
 */

export type CreationStationId = "name" | "race" | "appearance" | "calling" | "memory" | "review";

export interface StageCrop {
  /** Focal point of the painting, 0..1 across and down; the crop keeps it centred. */
  focalX: number;
  focalY: number;
  /** Extra zoom on top of the cover fit. */
  scale: number;
}

/**
 * Per-station crops. The painting carries two painted figures (the returned soul left of
 * centre, Ilyra right of centre), so it is used as abstract light only: zoomed past 1.5
 * on the well between them and blurred hard, never anchored to a figure.
 */
export const STATION_CROPS: Readonly<Record<CreationStationId, StageCrop>> = Object.freeze({
  name: { focalX: 0.48, focalY: 0.58, scale: 1.55 },
  race: { focalX: 0.48, focalY: 0.55, scale: 1.50 },
  appearance: { focalX: 0.48, focalY: 0.55, scale: 1.50 },
  calling: { focalX: 0.48, focalY: 0.55, scale: 1.50 },
  memory: { focalX: 0.48, focalY: 0.53, scale: 1.55 },
  review: { focalX: 0.48, focalY: 0.50, scale: 1.60 },
});
/** Portrait phones see a narrow strip of the painting; this x keeps it figure-free. */
const PORTRAIT_FOCAL_X = 0.47;

export const STAGE_BACKDROP_URL = "/assets/generated/prologue/10-ilyra-awakening.webp";
const CROSSFADE_MS = 600;
const BLUR_PX = 8;

/** Where to draw a cover-cropped image so `crop.focal` lands on the canvas centre. */
export function coverCropPlacement(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  crop: StageCrop,
): { x: number; y: number; width: number; height: number } {
  const fit = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight) * crop.scale;
  const width = imageWidth * fit;
  const height = imageHeight * fit;
  // Centre the focal point, then clamp so the image still covers the canvas.
  const x = Math.min(0, Math.max(canvasWidth - width, canvasWidth * 0.5 - crop.focalX * width));
  const y = Math.min(0, Math.max(canvasHeight - height, canvasHeight * 0.5 - crop.focalY * height));
  return { x, y, width, height };
}

export interface CreationStageOptions {
  imageUrl?: string;
  reducedMotion?: boolean;
  /** Divisor applied to the viewport for the composite; phones use 3, desktops 4. */
  resolutionDivisor?: number;
}

export class CreationStageBackdrop {
  private image: HTMLImageElement | null = null;
  private station: CreationStationId = "name";
  private front = 0;
  private readonly offscreen = document.createElement("canvas");
  private readonly reducedMotion: boolean;
  private readonly divisor: number;
  private disposed = false;
  private pendingStation: CreationStationId | null = null;

  public constructor(
    private readonly canvases: readonly [HTMLCanvasElement, HTMLCanvasElement],
    options: CreationStageOptions = {},
  ) {
    this.reducedMotion = options.reducedMotion ?? false;
    this.divisor = options.resolutionDivisor ?? 4;
    for (const canvas of canvases) {
      canvas.classList.add("stage-backdrop");
      canvas.style.opacity = "0";
    }
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => {
      if (this.disposed) return;
      this.image = image;
      this.paint(this.pendingStation ?? this.station, true);
      this.pendingStation = null;
    });
    image.addEventListener("error", () => {
      console.warn("Creation stage backdrop failed to load; the stage stays plain.");
    });
    image.src = options.imageUrl ?? STAGE_BACKDROP_URL;
    window.addEventListener("resize", this.onResize);
  }

  public setStation(station: CreationStationId): void {
    if (!this.image) {
      this.pendingStation = station;
      this.station = station;
      return;
    }
    const shown = this.front === 0 ? this.canvases[0] : this.canvases[1];
    if (station === this.station && shown.style.opacity === "1") return;
    this.station = station;
    this.paint(station, false);
  }

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener("resize", this.onResize);
  }

  private readonly onResize = (): void => {
    if (this.image) this.paint(this.station, true);
  };

  /** Composites the station's crop into the back canvas and fades it in over the front one. */
  private paint(station: CreationStationId, immediate: boolean): void {
    const image = this.image;
    if (!image) return;
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const authored = STATION_CROPS[station];
    const crop = viewportHeight > viewportWidth ? { ...authored, focalX: PORTRAIT_FOCAL_X } : authored;
    const width = Math.max(1, Math.round(viewportWidth / this.divisor));
    const height = Math.max(1, Math.round(viewportHeight / this.divisor));

    const offscreen = this.offscreen;
    offscreen.width = width;
    offscreen.height = height;
    const context = offscreen.getContext("2d");
    if (!context) return;
    const placement = coverCropPlacement(image.naturalWidth, image.naturalHeight, width, height, crop);
    // A runtime check that does not narrow `context` to never in the fallback branch.
    const supportsFilter = typeof (context as { filter?: unknown }).filter === "string";
    if (supportsFilter) {
      context.filter = `blur(${BLUR_PX}px)`;
      context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
      context.filter = "none";
    } else {
      // No canvas filter (older Safari): draw at an eighth and let the upscale box-blur it.
      const small = document.createElement("canvas");
      small.width = Math.max(1, Math.round(width / 2));
      small.height = Math.max(1, Math.round(height / 2));
      const smallContext = small.getContext("2d");
      if (!smallContext) return;
      const smallPlacement = coverCropPlacement(image.naturalWidth, image.naturalHeight, small.width, small.height, crop);
      smallContext.drawImage(image, smallPlacement.x, smallPlacement.y, smallPlacement.width, smallPlacement.height);
      context.drawImage(small, 0, 0, width, height);
    }

    const back = immediate ? this.front : 1 - this.front;
    const target = back === 0 ? this.canvases[0] : this.canvases[1];
    target.width = width;
    target.height = height;
    target.getContext("2d")?.drawImage(offscreen, 0, 0);
    // No drift: a moving painting behind a still body reads as parallax ghosting.
    target.style.transition = immediate || this.reducedMotion ? "none" : `opacity ${CROSSFADE_MS}ms linear`;
    target.style.opacity = "1";
    if (!immediate) {
      const previous = this.front === 0 ? this.canvases[0] : this.canvases[1];
      previous.style.transition = this.reducedMotion ? "none" : `opacity ${CROSSFADE_MS}ms linear`;
      previous.style.opacity = "0";
      this.front = back;
    }
  }
}
