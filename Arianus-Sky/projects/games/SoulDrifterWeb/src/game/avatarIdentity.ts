import { callingById, raceById, type CharacterProfile } from "./character";

const PLAYER_MODEL_BY_CALLING: Readonly<Record<CharacterProfile["callingId"], string>> = {
  warrior: "/assets/3d/characters/warrior.gltf",
  mage: "/assets/3d/characters/mage.gltf",
  priest: "/assets/3d/characters/priest.gltf",
  sharpshooter: "/assets/3d/characters/sharpshooter.gltf",
  paladin: "/assets/3d/characters/paladin.gltf",
  summoner: "/assets/3d/characters/summoner.gltf",
  asura: "/assets/3d/characters/asura.gltf",
  slayer: "/assets/3d/characters/slayer.gltf",
  shadowknight: "/assets/3d/characters/shadowknight.gltf",
};

const PLAYER_MODEL_BY_IDENTITY: Readonly<Record<string, string>> = {
  "elf:shadowknight": "/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb",
};

export function resolveCharacterIdentity(profile: Pick<CharacterProfile, "raceId" | "callingId">) {
  const race = raceById(profile.raceId);
  const calling = callingById(profile.callingId);
  return {
    raceId: race.id,
    raceName: race.name,
    raceGlyph: race.glyph,
    callingId: calling.id,
    callingName: calling.name,
  } as const;
}

export function resolvePlayerModelPath(profile: Pick<CharacterProfile, "raceId" | "callingId">): string {
  const identity = resolveCharacterIdentity(profile);
  return PLAYER_MODEL_BY_IDENTITY[`${identity.raceId}:${identity.callingId}`]
    ?? PLAYER_MODEL_BY_CALLING[identity.callingId];
}
