import { callingById, raceById, type CharacterProfile } from "./character";
import {
  SIPHON_CLEAVE_PACK,
  WEAPON_STRIKE_PACK,
  HUMANOID_ACTIVE_ANIMATION_PACKS,
  type AnimationPackSpec,
} from "./animationPacks";

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

interface PlayerAvatarManifest {
  modelPath: string;
  animationPacks: readonly AnimationPackSpec[];
}

const HUMANOID_SHADOWKNIGHT_AVATAR: PlayerAvatarManifest = {
  modelPath: "/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb",
  animationPacks: [
    ...HUMANOID_ACTIVE_ANIMATION_PACKS,
    SIPHON_CLEAVE_PACK,
    WEAPON_STRIKE_PACK,
  ],
};

const HUMAN_SHADOWKNIGHT_AVATAR: PlayerAvatarManifest = {
  modelPath: "/assets/3d/characters/human-shadowknight/human-shadowknight.glb",
  animationPacks: [
    ...HUMANOID_ACTIVE_ANIMATION_PACKS,
    SIPHON_CLEAVE_PACK,
    WEAPON_STRIKE_PACK,
  ],
};

const PLAYER_AVATAR_BY_IDENTITY: Readonly<Record<string, PlayerAvatarManifest>> = {
  "human:shadowknight": HUMAN_SHADOWKNIGHT_AVATAR,
  "elf:shadowknight": HUMANOID_SHADOWKNIGHT_AVATAR,
  "dwarf:shadowknight": HUMAN_SHADOWKNIGHT_AVATAR,
  "halfling:shadowknight": HUMAN_SHADOWKNIGHT_AVATAR,
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

export function resolvePlayerAvatarManifest(
  profile: Pick<CharacterProfile, "raceId" | "callingId">,
): PlayerAvatarManifest {
  const identity = resolveCharacterIdentity(profile);
  return PLAYER_AVATAR_BY_IDENTITY[`${identity.raceId}:${identity.callingId}`]
    ?? { modelPath: PLAYER_MODEL_BY_CALLING[identity.callingId], animationPacks: [] };
}

export function resolvePlayerModelPath(profile: Pick<CharacterProfile, "raceId" | "callingId">): string {
  return resolvePlayerAvatarManifest(profile).modelPath;
}
