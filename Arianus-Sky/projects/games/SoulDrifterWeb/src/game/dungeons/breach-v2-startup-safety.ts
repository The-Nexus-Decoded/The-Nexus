export const BREACH_V2_LEGACY_SPATIAL_SESSION_KEY = "breach-v2-preview-spatial-v1";

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
