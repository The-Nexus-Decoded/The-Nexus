/**
 * Writes the game's exploration progress into the Lore Atlas state
 * (localStorage "souldrifter.atlasState.v1"). The atlas iframe reads the same
 * key and live-refreshes via storage events, so maps reveal as the player
 * actually visits places. Realm locks and POI reveals are never demoted here.
 */

const ATLAS_LS_KEY = "souldrifter.atlasState.v1";

export type AtlasPoiStatus = "rumored" | "explored" | "completed";

interface AtlasState {
  realms: Record<string, { unlocked: boolean }>;
  pois: Record<string, string>;
}

const STATUS_ORDER: Record<string, number> = { unknown: 0, rumored: 1, explored: 2, completed: 3 };

/** Thalenyr is the start realm; a sync write must never strand it locked. */
const SEED: AtlasState = { realms: { thalenyr: { unlocked: true } }, pois: {} };

function loadAtlasState(): AtlasState {
  try {
    const raw = localStorage.getItem(ATLAS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AtlasState>;
      return {
        realms: { ...SEED.realms, ...(parsed.realms ?? {}) },
        pois: { ...(parsed.pois ?? {}) },
      };
    }
  } catch {
    // Private-mode storage refusals are fine; the atlas stays at its default.
  }
  return JSON.parse(JSON.stringify(SEED)) as AtlasState;
}

function saveAtlasState(state: AtlasState): void {
  try {
    localStorage.setItem(ATLAS_LS_KEY, JSON.stringify(state));
  } catch {
    // A full or blocked store must never interrupt gameplay.
  }
}

export function markAtlasPoi(realmId: string, poiId: string, status: AtlasPoiStatus): void {
  const state = loadAtlasState();
  const key = `${realmId}.${poiId}`;
  const current = STATUS_ORDER[state.pois[key] ?? "unknown"] ?? 0;
  const next = STATUS_ORDER[status] ?? 0;
  if (current >= next) return;
  state.pois[key] = status;
  saveAtlasState(state);
}

export function unlockAtlasRealm(realmId: string): void {
  const state = loadAtlasState();
  if (state.realms[realmId]?.unlocked) return;
  state.realms[realmId] = { unlocked: true };
  saveAtlasState(state);
}
