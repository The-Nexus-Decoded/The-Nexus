import "./styles.css";
import { CharacterCreation } from "./characterCreation";
import { normalizeLegacyCharacterProfile, setActiveCharacter, type CharacterProfile } from "./game/character";
import { createRunSeed, parseDebugRunSeed } from "./game/dungeon";
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
import { installPilotAnimationReview } from "./pilotAnimationReview";

let activeWorld: World3D | null = null;

installPilotAnimationReview();

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
  const requestedDebugSeed = import.meta.env.DEV
    ? parseDebugRunSeed(new URL(window.location.href).searchParams.get("debugSeed"))
    : null;
  const world = new World3D(container, profile, requestedDebugSeed ?? createRunSeed(), savedInventory ?? undefined);
  activeWorld = world;
  try {
    await world.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The 3D dungeon failed to awaken.";
    container.innerHTML = `<div class="fatal-error"><strong>The Soulwell lost its shape.</strong><span>${message}</span></div>`;
    throw error;
  }
}

void (async () => {
  // Dungeon preview branch: ?dungeonPreview=breach-v2 renders the BREACH-V2
  // starting zone straight from the seeded generator, bypassing character
  // creation. Used by the visual review gate (DUNGEON_BUILD_RUNBOOK §5.5) —
  // Level 01 (World3D) is untouched.
  const searchParams = new URL(window.location.href).searchParams;
  const previewDungeon = searchParams.get("dungeonPreview");
  if (previewDungeon === "breach-v2") {
    const { startDungeonPreview } = await import("./game/dungeons/breach-v2-preview.ts");
    const shell = document.getElementById("character-creation");
    if (shell) shell.hidden = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const seedParam = searchParams.get("seed");
    const seed = seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : 4182;
    const pathParam = searchParams.get("path");
    const path = pathParam === "oathbreaker" ? "oathbreaker" : "wayfarer";
    const cam = searchParams.get("cam") ?? "isometric"; // 3D Ultima-style gameplay view; wheel zoom + drag orbit
    await startDungeonPreview(host, { seed, path, cam });
    return;
  }
  await bootstrap();
})();

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
