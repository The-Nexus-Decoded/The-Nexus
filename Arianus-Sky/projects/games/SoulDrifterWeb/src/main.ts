import "./styles.css";
import { CharacterCreation } from "./characterCreation";
import { setActiveCharacter, type CharacterProfile } from "./game/character";
import { createRunSeed } from "./game/dungeon";
import { storyDatabase } from "./game/persistence";
import { World3D } from "./game/World3D";

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
  await Promise.all([
    storyDatabase.saveCharacter(profile),
    storyDatabase.reachCheckpoint("character-created", "the-weaving"),
  ]);
  const shell = document.getElementById("app-shell");
  const container = document.getElementById("game");
  if (!shell || !container) throw new Error("Missing SoulDrifter application shell.");
  shell.hidden = false;

  const world = new World3D(container, profile, createRunSeed(), savedInventory ?? undefined);
  try {
    await world.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The 3D dungeon failed to awaken.";
    container.innerHTML = `<div class="fatal-error"><strong>The Soulwell lost its shape.</strong><span>${message}</span></div>`;
    throw error;
  }
}

async function bootstrap(): Promise<void> {
  const savedProfile = await storyDatabase.loadCharacter().catch(() => null);
  new CharacterCreation((profile, resumeSavedSoul) => { void launchGame(profile, resumeSavedSoul); }, savedProfile);
}

void bootstrap();
