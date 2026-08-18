import { describe, expect, it } from "vitest";
import modelRegister from "../docs/3d-ai-studio/first-breach-model-register.json";

describe("First Breach production model register", () => {
  it("keeps every paid geometry group behind exact owner approval", () => {
    expect(modelRegister.program.issue).toBe(448);
    expect(modelRegister.program.paidOperationApproved).toBe(false);
    expect(modelRegister.creditPolicy.batchApprovalImplied).toBe(false);
    expect(modelRegister.creditPolicy.stopOnUnexpectedCost).toBe(true);

    for (const group of modelRegister.assetGroups) {
      expect(group.geometrySource).toBe("3d-ai-studio");
      expect(group.status).toBe("approval-required");
    }
  });

  it("defines the permanent humanoid foundation and only Level 1 production content", () => {
    const bodyGroup = modelRegister.assetGroups.find((group) => group.id === "playable-body-families");
    expect(bodyGroup?.lifetime).toBe("game-wide");
    expect(bodyGroup?.items).toEqual(
      expect.arrayContaining([
        "human-masculine",
        "human-feminine",
        "elf-masculine",
        "elf-feminine",
        "dwarf-masculine",
        "dwarf-feminine",
        "halfling-masculine",
        "halfling-feminine",
      ]),
    );

    expect(modelRegister.scope.deferred).toEqual(
      expect.arrayContaining([
        "open-world-trees-grass-walls-buildings-terrain-and-biome-kits",
        "higher-level-weapons-armor-and-specialization-equipment",
        "monsters-beyond-first-breach",
      ]),
    );
  });

  it("requires matching animated conversation faces for all three tutorial NPCs", () => {
    const npcGroup = modelRegister.assetGroups.find((group) => group.id === "named-tutorial-npcs");
    expect(npcGroup?.items).toEqual(["ilyra", "orren", "brannoc"]);
    expect(npcGroup?.matchingConversationFaceRequired).toBe(true);
    expect(modelRegister.conversationFace.sameRuntimeIdentityAsWorldActor).toBe(true);
    expect(modelRegister.conversationFace.recordedVoiceDrivesVisemes).toBe(true);
    expect(modelRegister.conversationFace.requiredControls).toEqual(
      expect.arrayContaining(["blink", "gaze", "brows", "jaw", "speech-visemes", "expression-presets"]),
    );
  });

  it("forbids generic production substitutes for every First Breach creature assembly", () => {
    const creatureGroup = modelRegister.assetGroups.find((group) => group.id === "first-breach-creatures");
    expect(creatureGroup?.placeholderReuseAllowedForProduction).toBe(false);
    expect(creatureGroup?.items).toEqual(
      expect.arrayContaining([
        "training-effigy-sentinel",
        "breachling",
        "breachling-stalker",
        "oathbound-breachling",
        "breachling-ravager",
        "cinderbound-warden",
      ]),
    );
  });

  it("records the exact bounded Breachling source task and its non-shipping result", () => {
    const task = modelRegister.sourceGenerationTasks.find((entry) => entry.assetId === "creature-breachling-base-v001");

    expect(task).toMatchObject({
      operation: "text-to-3d",
      model: "prism-3.1",
      textureQuality: "ultra",
      meshQuality: "standard",
      materialType: "shaded",
      expectedCredits: 40,
      maximumCredits: 40,
      status: "generated-cloud-source-awaiting-owner-review-and-untouched-export",
      taskId: "82459e9b-e63b-4be1-a3be-cad264fedc44",
      actualCredits: 40,
      creditBalanceAfterTask: 2432,
      runtimePromotionAllowed: false,
    });
    expect(task?.promptSha256).toBe("640AF9D6DB5969C7EC6E0F0910FFD5D181E0968E044CE0E7F81169EA89E55394");
    expect(task?.prompt).toContain("One complete isolated creature");
    expect(task?.generationOutcome).toMatchObject({
      cloudSourceRetained: true,
      untouchedExportPreserved: false,
      poseFinding: "requested-neutral-a-pose-generated-combat-crouch",
      decision: "retain-as-design-source-not-yet-a-rig-candidate",
    });
  });

  it("records the bounded Cinderbound Warden source task before paid submission", () => {
    const task = modelRegister.sourceGenerationTasks.find(
      (entry) => entry.assetId === "creature-cinderbound-warden-v001",
    );

    expect(task).toMatchObject({
      operation: "text-to-3d",
      model: "prism-3.1",
      textureQuality: "ultra",
      meshQuality: "standard",
      materialType: "shaded",
      expectedCredits: 40,
      maximumCredits: 40,
      status: "approved-ready-to-submit",
      runtimePromotionAllowed: false,
    });
    expect(task?.promptSha256).toBe("6E4FCE9519340D9DEA584F04B84D441B056D3EB7753983AC23AA537EEC34C829");
    expect(task?.prompt).toContain("One complete isolated creature");
  });

  it("covers every current level surface that must be revalidated", () => {
    expect(modelRegister.validationSurfaces).toEqual(
      expect.arrayContaining([
        "character-creation",
        "paper-doll",
        "realm-lock-vestibule",
        "ilyra-conversation",
        "orren-conversation",
        "brannoc-conversation",
        "training-sentinel",
        "fractured-galleries",
        "ashen-lock",
        "player-and-enemy-defeat",
        "first-memory-completion",
      ]),
    );
  });
});
