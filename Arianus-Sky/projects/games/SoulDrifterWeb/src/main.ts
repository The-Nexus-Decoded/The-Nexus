import "./styles.css";
import { CharacterCreation } from "./characterCreation";
import { normalizeLegacyCharacterProfile, setActiveCharacter, type CharacterProfile } from "./game/character";
import { createRunSeed, parseDebugRunSeed } from "./game/dungeon";
import { createMultiplayerLayer, type MultiplayerLayer } from "./game/net/multiplayerLayer";
import type { MpConnectionStatus } from "./game/net/netClient";
import { storyDatabase } from "./game/persistence";
import { World3D } from "./game/World3D";
import {
  animationTuningRegistry,
  loadAnimationTuningDocument,
} from "./game/animationTuning";
import {
  lightingTuningRegistry,
  loadLightingTuningDocument,
} from "./game/lightingTuning";

let activeWorld: World3D | null = null;
let activeMultiplayer: MultiplayerLayer | null = null;

/** Tiny connection badge for the multiplayer base layer (created in JS so the
 *  static HUD markup and its boundary tests stay untouched). */
function multiplayerBadge(): HTMLElement {
  let badge = document.getElementById("mp-status-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "mp-status-badge";
    badge.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:40;padding:4px 10px;border-radius:10px;" +
      "font:12px Georgia,serif;color:#e8dfc8;background:rgba(6,10,10,.62);border:1px solid rgba(232,223,200,.25);" +
      "pointer-events:none;letter-spacing:.02em;";
    document.body.appendChild(badge);
  }
  return badge;
}

function renderMultiplayerStatus(zone: string, status: MpConnectionStatus): void {
  const badge = multiplayerBadge();
  switch (status.kind) {
    case "online":
      badge.textContent = `${zone} · ${status.playerCount}/${status.cap} drifters`;
      badge.style.color = "#cfe8c8";
      break;
    case "connecting":
      badge.textContent = `${zone} · linking…`;
      badge.style.color = "#e8dfc8";
      break;
    case "full":
      badge.textContent = `${zone} · full (${status.cap}/${status.cap})`;
      badge.style.color = "#e8c8a8";
      break;
    case "offline":
      badge.textContent = `${zone} · ${status.reason}`;
      badge.style.color = "#e8a8a8";
      break;
    default:
      badge.textContent = "";
  }
}

function connectMultiplayerIfEnabled(world: World3D, profile: CharacterProfile): void {
  const params = new URL(window.location.href).searchParams;
  const url = params.get("mp") || (import.meta.env.VITE_MP_URL as string | undefined) || "";
  if (!url) return;
  const zone = params.get("zone") || (import.meta.env.VITE_MP_ZONE as string | undefined) || "heartvale";
  activeMultiplayer = createMultiplayerLayer({
    url,
    zone,
    playerName: profile.name,
    appearance: { raceId: profile.raceId, callingId: profile.callingId },
    bridge: world.multiplayerBridge(),
    onStatus: (status) => renderMultiplayerStatus(zone, status),
  });
  activeMultiplayer.connect();
}

async function launchGame(profile: CharacterProfile, resumeSavedSoul: boolean): Promise<void> {
  // Character shaping persists; a trial oath belongs only to the generated
  // crawl that created it. Reloading creates a new seed, so it must also ask
  // the player to choose Wayfarer or Oathbreaker again.
  delete profile.chosenTrial;
  setActiveCharacter(profile);
  const savedInventory = resumeSavedSoul
    ? await storyDatabase.loadInventory().catch(() => null)
    : null;
  if (!resumeSavedSoul) await storyDatabase.clearInventory().catch(() => undefined);
  if (!resumeSavedSoul) await storyDatabase.clearAvatarPreview().catch(() => undefined);
  await Promise.all([
    storyDatabase.saveCharacter(profile),
    storyDatabase.reachCheckpoint("character-created", "the-weaving"),
  ]);
  const shell = document.getElementById("app-shell");
  const container = document.getElementById("game");
  if (!shell || !container) throw new Error("Missing SoulDrifter application shell.");
  shell.hidden = false;

  activeWorld?.destroy();
  activeMultiplayer?.disconnect();
  activeMultiplayer = null;
  const requestedDebugSeed = import.meta.env.DEV
    ? parseDebugRunSeed(new URL(window.location.href).searchParams.get("debugSeed"))
    : null;
  const world = new World3D(container, profile, requestedDebugSeed ?? createRunSeed(), savedInventory ?? undefined);
  activeWorld = world;
  try {
    await world.start();
    connectMultiplayerIfEnabled(world, profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The 3D dungeon failed to awaken.";
    container.innerHTML = `<div class="fatal-error"><strong>The Soulwell lost its shape.</strong><span>${message}</span></div>`;
    throw error;
  }
}

async function bootstrap(): Promise<void> {
  const tuningUrl = import.meta.env.VITE_ANIMATION_TUNING_URL || "/config/animation-tuning.json";
  const lightingUrl = import.meta.env.VITE_LIGHTING_TUNING_URL || "/config/lighting-tuning.json";
  const [loadedProfile, savedAvatarPreview, animationTuning, lightingTuning] = await Promise.all([
    storyDatabase.loadCharacter().catch(() => null),
    storyDatabase.loadAvatarPreview().catch(() => null),
    loadAnimationTuningDocument(tuningUrl).catch((error) => {
      console.warn("Animation tuning document unavailable; built-in defaults remain active.", error);
      return animationTuningRegistry.snapshot();
    }),
    loadLightingTuningDocument(lightingUrl).catch((error) => {
      console.warn("Lighting tuning document unavailable; built-in defaults remain active.", error);
      return lightingTuningRegistry.snapshot();
    }),
  ]);
  animationTuningRegistry.replace(animationTuning);
  lightingTuningRegistry.replace(lightingTuning);
  let savedProfile: CharacterProfile | null = null;
  let savedProfileError = "";
  if (loadedProfile) {
    try {
      savedProfile = normalizeLegacyCharacterProfile(loadedProfile);
    } catch (error) {
      savedProfileError = error instanceof Error ? error.message : "The saved soul uses an unsupported ancestry and calling.";
      console.warn("Saved SoulDrifter profile was preserved but cannot be resumed.", error);
    }
  }
  if (savedProfile && JSON.stringify(savedProfile) !== JSON.stringify(loadedProfile)) {
    await storyDatabase.saveCharacter(savedProfile).catch(() => undefined);
  }
  new CharacterCreation(
    (profile, resumeSavedSoul) => { void launchGame(profile, resumeSavedSoul); },
    savedProfile,
    savedAvatarPreview,
  );
  if (savedProfileError) {
    const creationError = document.getElementById("creation-error");
    if (creationError) creationError.textContent = `${savedProfileError} The original save remains preserved; weave a permitted soul to continue.`;
  }
}

void bootstrap();
