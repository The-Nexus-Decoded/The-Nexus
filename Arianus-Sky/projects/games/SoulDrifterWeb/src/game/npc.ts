import { callingById, type CharacterProfile } from "./character";

export interface DialogueChoice {
  id: string;
  label: string;
  response: string;
  checkpoint: string;
}

export interface RawDialogueScene {
  id: string;
  opening: string[];
  raceLines?: Record<string, string>;
  callingLines?: Record<string, string>;
  choices: DialogueChoice[];
}

export interface RawNpcDefinition {
  name: string;
  role: string;
  room: string;
  sprite: string;
  scene: RawDialogueScene;
}

export interface NpcDatabase {
  version: number;
  npcs: Record<string, RawNpcDefinition>;
}

export interface DialogueScene {
  id: string;
  npcId: string;
  speaker: string;
  role: string;
  sprite: string;
  lines: string[];
  choices: DialogueChoice[];
}

export interface NpcStoryOverride {
  name?: string;
  role?: string;
  sprite?: string;
  scene?: Partial<Omit<RawDialogueScene, "raceLines" | "callingLines">> & {
    raceLines?: Record<string, string>;
    callingLines?: Record<string, string>;
  };
}

function template(text: string, profile: CharacterProfile): string {
  const calling = callingById(profile.callingId);
  return text
    .replaceAll("{name}", profile.name)
    .replaceAll("{race}", profile.raceName)
    .replaceAll("{calling}", profile.callingName)
    .replaceAll("{signatureSkill}", calling.signatureSkill)
    .replaceAll("{defensiveSkill}", calling.defensiveSkill);
}

export function buildDialogue(
  database: NpcDatabase,
  npcId: string,
  profile: CharacterProfile,
  override?: NpcStoryOverride | null,
): DialogueScene {
  const baseNpc = database.npcs[npcId];
  if (!baseNpc) throw new Error(`Unknown NPC: ${npcId}`);
  const npc: RawNpcDefinition = {
    ...baseNpc,
    ...override,
    scene: {
      ...baseNpc.scene,
      ...override?.scene,
      raceLines: { ...baseNpc.scene.raceLines, ...override?.scene?.raceLines },
      callingLines: { ...baseNpc.scene.callingLines, ...override?.scene?.callingLines },
    },
  };

  const lines = [...npc.scene.opening];
  const raceLine = npc.scene.raceLines?.[profile.raceId];
  const callingLine = npc.scene.callingLines?.[profile.callingId];
  if (raceLine) lines.push(raceLine);
  if (callingLine) lines.push(callingLine);

  return {
    id: npc.scene.id,
    npcId,
    speaker: npc.name,
    role: npc.role,
    sprite: npc.sprite,
    lines: lines.map((line) => template(line, profile)),
    choices: npc.scene.choices.map((choice) => ({ ...choice, response: template(choice.response, profile) })),
  };
}
