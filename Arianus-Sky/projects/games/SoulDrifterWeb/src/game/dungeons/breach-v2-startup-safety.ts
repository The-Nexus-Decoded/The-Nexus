export const BREACH_V2_LEGACY_SPATIAL_SESSION_KEY = "breach-v2-preview-spatial-v1";
export const BREACH_V2_CAMERA_SWITCH_SESSION_KEY = "breach-v2-camera-switch-position-v1";

export interface BreachV2CameraSwitchPosition {
  seed: number;
  path: "wayfarer" | "oathbreaker";
  x: number;
  z: number;
}

type CameraSwitchStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveBreachV2CameraSwitchPosition(
  storage: CameraSwitchStorage | null,
  position: BreachV2CameraSwitchPosition,
): boolean {
  if (!storage || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return false;
  try {
    storage.setItem(BREACH_V2_CAMERA_SWITCH_SESSION_KEY, JSON.stringify(position));
    return true;
  } catch {
    return false;
  }
}

export function consumeBreachV2CameraSwitchPosition(
  storage: CameraSwitchStorage | null,
  expected: Pick<BreachV2CameraSwitchPosition, "seed" | "path">,
): Pick<BreachV2CameraSwitchPosition, "x" | "z"> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BREACH_V2_CAMERA_SWITCH_SESSION_KEY);
    if (raw === null) return null;
    storage.removeItem(BREACH_V2_CAMERA_SWITCH_SESSION_KEY);
    const candidate = JSON.parse(raw) as Partial<BreachV2CameraSwitchPosition>;
    if (candidate.seed !== expected.seed || candidate.path !== expected.path) return null;
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.z)) return null;
    return { x: candidate.x!, z: candidate.z! };
  } catch {
    try {
      storage.removeItem(BREACH_V2_CAMERA_SWITCH_SESSION_KEY);
    } catch {
      // Storage cleanup is best-effort when the browser blocks session access.
    }
    return null;
  }
}

type SessionStorageWriter = Pick<Storage, "removeItem">;

export function clearBreachV2LegacySpatialStateForExplicitUrl(
  url: URL,
  storage: SessionStorageWriter | null,
): boolean {
  if (!url.searchParams.has("cam") && !url.searchParams.has("start")) return false;
  if (!storage) return false;
  try {
    storage.removeItem(BREACH_V2_LEGACY_SPATIAL_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

type ShaderCompiler<Scene, Camera> = {
  compileAsync(scene: Scene, camera: Camera): Promise<unknown>;
};

export async function compileBreachV2StartupShaders<Scene, Camera>(
  renderer: ShaderCompiler<Scene, Camera>,
  scene: Scene,
  camera: Camera,
): Promise<void> {
  await renderer.compileAsync(scene, camera);
}
