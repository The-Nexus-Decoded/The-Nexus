import * as THREE from "three";

export const BREACH_V2_RUNTIME_DIAGNOSTICS_STORAGE_KEY = "breach-v2-runtime-diagnostics-v1";
export const BREACH_V2_RUNTIME_DIAGNOSTICS_LIMIT = 120;

export interface BreachV2RuntimeDiagnosticRecord {
  timestamp: string;
  sessionId: string;
  event: string;
  data: Record<string, unknown>;
}

type DiagnosticStorage = Pick<Storage, "getItem" | "setItem">;

export interface BreachV2RuntimeDiagnosticSink {
  record(event: string, data?: Record<string, unknown>): void;
}

export interface BreachV2RuntimeDiagnostics extends BreachV2RuntimeDiagnosticSink {
  readonly sessionId: string;
  sample(
    deltaSeconds: number,
    state: {
      cameraMode: string;
      camera: THREE.PerspectiveCamera;
      player: { x: number; y: number; z: number };
    },
  ): void;
  dispose(): void;
}

export function readBreachV2RuntimeDiagnostics(
  storage: Pick<Storage, "getItem"> | null,
): BreachV2RuntimeDiagnosticRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(BREACH_V2_RUNTIME_DIAGNOSTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is BreachV2RuntimeDiagnosticRecord => (
      typeof entry === "object"
      && entry !== null
      && typeof (entry as Partial<BreachV2RuntimeDiagnosticRecord>).timestamp === "string"
      && typeof (entry as Partial<BreachV2RuntimeDiagnosticRecord>).sessionId === "string"
      && typeof (entry as Partial<BreachV2RuntimeDiagnosticRecord>).event === "string"
      && typeof (entry as Partial<BreachV2RuntimeDiagnosticRecord>).data === "object"
      && (entry as Partial<BreachV2RuntimeDiagnosticRecord>).data !== null
    ));
  } catch {
    return [];
  }
}

export function appendBreachV2RuntimeDiagnostic(
  storage: DiagnosticStorage | null,
  record: BreachV2RuntimeDiagnosticRecord,
  limit = BREACH_V2_RUNTIME_DIAGNOSTICS_LIMIT,
  existingRecords?: readonly BreachV2RuntimeDiagnosticRecord[],
): BreachV2RuntimeDiagnosticRecord[] {
  const boundedLimit = Math.max(1, Math.floor(limit));
  const records = [...(existingRecords ?? readBreachV2RuntimeDiagnostics(storage)), record]
    .slice(-boundedLimit);
  if (storage) {
    try {
      storage.setItem(BREACH_V2_RUNTIME_DIAGNOSTICS_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The DOM overlay and in-memory record still work when storage is blocked or full.
    }
  }
  return records;
}

function safeLocalStorage(): DiagnosticStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function errorName(gl: WebGLRenderingContext | WebGL2RenderingContext, error: number): string {
  if (error === gl.INVALID_ENUM) return "INVALID_ENUM";
  if (error === gl.INVALID_VALUE) return "INVALID_VALUE";
  if (error === gl.INVALID_OPERATION) return "INVALID_OPERATION";
  if (error === gl.OUT_OF_MEMORY) return "OUT_OF_MEMORY";
  if (error === gl.INVALID_FRAMEBUFFER_OPERATION) return "INVALID_FRAMEBUFFER_OPERATION";
  if ("CONTEXT_LOST_WEBGL" in gl && error === gl.CONTEXT_LOST_WEBGL) return "CONTEXT_LOST_WEBGL";
  return `0x${error.toString(16)}`;
}

function readGlErrors(gl: WebGLRenderingContext | WebGL2RenderingContext): string[] {
  const errors: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const error = gl.getError();
    if (error === gl.NO_ERROR) break;
    errors.push(errorName(gl, error));
  }
  return errors;
}

function sceneResourceCounts(scene: THREE.Scene): { materials: number; lights: number; objects: number } {
  const materials = new Set<THREE.Material>();
  let lights = 0;
  let objects = 0;
  scene.traverse((object) => {
    objects += 1;
    if (object instanceof THREE.Light && object.visible) lights += 1;
    if (!(object instanceof THREE.Mesh)) return;
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => materials.add(material));
  });
  return { materials: materials.size, lights, objects };
}

function heapSnapshot(): Record<string, number> | null {
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  }).memory;
  return memory ? {
    usedBytes: memory.usedJSHeapSize,
    totalBytes: memory.totalJSHeapSize,
    limitBytes: memory.jsHeapSizeLimit,
  } : null;
}

interface BreachV2DiagnosticOverlay {
  root: HTMLDetailsElement;
  summary: HTMLElement;
  output: HTMLPreElement;
  exportButton: HTMLButtonElement;
}

function createOverlay(container: HTMLElement): BreachV2DiagnosticOverlay {
  const root = document.createElement("details");
  root.dataset.testid = "breach-v2-runtime-diagnostics";
  root.style.cssText = [
    "position:absolute", "right:12px", "bottom:max(12px,env(safe-area-inset-bottom))", "z-index:90",
    "width:min(480px,calc(100vw - 24px))", "max-height:min(30dvh,240px)", "overflow:auto", "box-sizing:border-box",
    "margin:0", "padding:7px 9px", "border:1px solid rgba(255,174,92,.55)", "border-radius:8px",
    "background:rgba(10,8,7,.88)", "color:#ffd9ad", "box-shadow:0 8px 28px rgba(0,0,0,.52)",
    "font:10px/1.35 ui-monospace,Consolas,monospace", "pointer-events:auto", "backdrop-filter:blur(7px)",
  ].join(";");
  const summary = document.createElement("summary");
  summary.style.cssText = "cursor:pointer;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  summary.textContent = "GPU diagnostics · starting";
  const output = document.createElement("pre");
  output.setAttribute("aria-live", "polite");
  output.style.cssText = [
    "max-height:min(22dvh,170px)", "overflow:auto", "margin:7px 0 0", "padding:7px",
    "background:rgba(0,0,0,.28)", "border-radius:5px", "white-space:pre-wrap", "overflow-wrap:anywhere",
    "font:9px/1.35 ui-monospace,Consolas,monospace",
  ].join(";");
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Download diagnostics JSON";
  exportButton.style.cssText = [
    "margin-top:7px", "padding:6px 8px", "border:1px solid rgba(255,174,92,.55)", "border-radius:5px",
    "background:#251812", "color:#ffd9ad", "font:9px/1 ui-monospace,Consolas,monospace", "cursor:pointer",
  ].join(";");
  root.append(summary, output, exportButton);
  container.appendChild(root);
  return { root, summary, output, exportButton };
}

export function createBreachV2RuntimeDiagnostics(options: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  cameraMode: string;
  seed: number;
  path: "wayfarer" | "oathbreaker";
  revision: string;
}): BreachV2RuntimeDiagnostics {
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const storage = safeLocalStorage();
  const overlay = createOverlay(options.container);
  const gl = options.renderer.getContext();
  let records = readBreachV2RuntimeDiagnostics(storage);
  let sampleSeconds = 0;
  let sampleFrames = 0;
  let worstFrameMs = 0;
  let resourceSampleSeconds = 6;
  let resources = sceneResourceCounts(options.scene);

  const redraw = (): void => {
    const latest = records.slice(-8).reverse();
    const newest = latest[0];
    overlay.summary.textContent = newest
      ? `GPU diagnostics · ${newest.event}`
      : "GPU diagnostics · no events";
    overlay.output.textContent = [
      `BREACH-V2 GPU DIAGNOSTICS · ${sessionId}`,
      ...latest.map((entry) => (
        `${entry.timestamp.slice(11, 23)} ${entry.event} ${JSON.stringify(entry.data)}`
      )),
    ].join("\n");
    overlay.output.scrollTop = 0;
  };
  const record = (event: string, data: Record<string, unknown> = {}): void => {
    records = appendBreachV2RuntimeDiagnostic(storage, {
      timestamp: new Date().toISOString(),
      sessionId,
      event,
      data,
    }, BREACH_V2_RUNTIME_DIAGNOSTICS_LIMIT, records);
    if (event.includes("failure") || event.includes("error") || event === "webgl-context-lost") {
      overlay.root.open = true;
    }
    redraw();
  };
  const exportRecords = (): void => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `breach-v2-diagnostics-${sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  overlay.exportButton.addEventListener("click", exportRecords);

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  record("session-start", {
    seed: options.seed,
    path: options.path,
    cameraMode: options.cameraMode,
    revision: options.revision,
    renderer: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : "unavailable",
    vendor: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : "unavailable",
    limits: {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as ArrayLike<number>),
    },
  });

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    record("webgl-context-lost", {
      statusMessage: "statusMessage" in event ? String(event.statusMessage) : "",
      rendererContextLost: gl.isContextLost(),
    });
  };
  const onContextRestored = (): void => record("webgl-context-restored", {});
  const onWindowError = (event: ErrorEvent): void => record("window-error", {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  });
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => record("unhandled-rejection", {
    reason: event.reason instanceof Error ? `${event.reason.message}\n${event.reason.stack ?? ""}` : String(event.reason),
  });
  const onPageHide = (event: PageTransitionEvent): void => record("pagehide", { persisted: event.persisted });
  options.renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  options.renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("pagehide", onPageHide);

  return {
    sessionId,
    record,
    sample: (deltaSeconds, state) => {
      sampleSeconds += deltaSeconds;
      sampleFrames += 1;
      worstFrameMs = Math.max(worstFrameMs, deltaSeconds * 1000);
      resourceSampleSeconds += deltaSeconds;
      if (sampleSeconds < 2) return;
      const glErrors = readGlErrors(gl);
      if (resourceSampleSeconds >= 6) {
        resources = sceneResourceCounts(options.scene);
        resourceSampleSeconds = 0;
      }
      record("frame-sample", {
        fps: Number((sampleFrames / sampleSeconds).toFixed(1)),
        averageFrameMs: Number((sampleSeconds * 1000 / sampleFrames).toFixed(2)),
        worstFrameMs: Number(worstFrameMs.toFixed(2)),
        cameraMode: state.cameraMode,
        camera: {
          x: Number(state.camera.position.x.toFixed(3)),
          y: Number(state.camera.position.y.toFixed(3)),
          z: Number(state.camera.position.z.toFixed(3)),
          zoom: Number(state.camera.zoom.toFixed(3)),
        },
        player: {
          x: Number(state.player.x.toFixed(3)),
          y: Number(state.player.y.toFixed(3)),
          z: Number(state.player.z.toFixed(3)),
        },
        renderer: {
          calls: options.renderer.info.render.calls,
          triangles: options.renderer.info.render.triangles,
          geometries: options.renderer.info.memory.geometries,
          textures: options.renderer.info.memory.textures,
          programs: options.renderer.info.programs?.length ?? 0,
          ...resources,
        },
        heap: heapSnapshot(),
        contextLost: gl.isContextLost(),
        glErrors,
      });
      sampleSeconds = 0;
      sampleFrames = 0;
      worstFrameMs = 0;
    },
    dispose: () => {
      options.renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      options.renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("pagehide", onPageHide);
      overlay.exportButton.removeEventListener("click", exportRecords);
      overlay.root.remove();
    },
  };
}
