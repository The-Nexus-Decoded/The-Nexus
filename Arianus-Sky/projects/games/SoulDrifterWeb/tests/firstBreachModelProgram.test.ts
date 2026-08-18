import { describe, expect, it } from "vitest";
import modelRegister from "../docs/3d-ai-studio/first-breach-model-register.json";

describe("First Breach production model register", () => {
  it("keeps every paid geometry group behind exact owner approval", () => {
    expect(modelRegister.program.issue).toBe(448);
    expect(modelRegister.program.paidOperationApproved).toBe(false);
    expect(modelRegister.program.textTo3dGenerationApproved).toBe(false);
    expect(modelRegister.generationPolicy.defaultOperation).toBe(
      "chatgpt-reference-image-then-image-to-3d-single-image",
    );
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
    expect(creatureGroup?.designCompletenessRequired).toEqual(
      expect.arrayContaining([
        "silhouette",
        "anatomy-and-joint-logic",
        "threat-language-and-facial-anatomy",
        "rig-and-control-requirements",
        "normal-isometric-camera-readability",
      ]),
    );
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
      ownerReview: "approved-as-family-style-reference",
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

  it("records the rejected text-to-3D Warden before replacing it through image-first production", () => {
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
      status: "generated-rejected-cloud-source",
      taskId: "7260c2d1-6e50-4078-a667-535ffc4ab5f5",
      actualCredits: 40,
      creditBalanceAfterTask: 2392,
      ownerReview: "rejected",
      runtimePromotionAllowed: false,
    });
    expect(task?.promptSha256).toBe("6E4FCE9519340D9DEA584F04B84D441B056D3EB7753983AC23AA537EEC34C829");
    expect(task?.prompt).toContain("One complete isolated creature");
    expect(task?.generationOutcome?.decision).toBe("reject-and-replace-through-chatgpt-image-first-workflow");
    expect(task?.designContract).toMatchObject({
      family: "unique-cinderbound-mechanical-golem-boss",
      biology: "none",
      rig: "purpose-built-mechanical-hierarchy-with-rigid-plate-joints-not-humanoid-skin-deformation",
    });
    expect(task?.designContract?.forbiddenRead).toEqual(
      expect.arrayContaining(["armored-human", "paladin", "biological-breachling"]),
    );
  });

  it("registers four exact identity-matched Breachling views before conversion", () => {
    const task = modelRegister.sourceGenerationTasks.find(
      (entry) => entry.assetId === "creature-breachling-base-image-first-v001",
    );

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image",
      model: "prism-3.1-multi-view",
      textureQuality: "ultra",
      meshQuality: "standard",
      expectedCredits: 45,
      maximumCredits: 45,
      status: "approved-ready-to-submit",
      ownerReview: "approved-huge-maw-four-view-source-set-shown-in-chat",
      runtimePromotionAllowed: false,
    });
    expect(task?.sourceImages).toEqual([
      expect.objectContaining({
        view: "front",
        file: "sd-creature-breachling-base-chatgpt-a-pose-v3-source.png",
        bytes: 1727534,
        width: 1254,
        height: 1254,
        sha256: "724B76297565E738189C29C9920C1473DFB88D46DAF349FD75E81FEE192A51CE",
        generationPromptSha256: "F66F00A06B98B8F4E85E77D8DED9195C737B85DC4F60537F11671345D5C8A944",
        finalEditPromptSha256: "4FBB83BC367B54209367C391868CDA88BBE2A8810F86304DE07E030C420675DC",
      }),
      expect.objectContaining({
        view: "left",
        file: "sd-creature-breachling-base-chatgpt-left-v1-source.png",
        bytes: 1740247,
        width: 1122,
        height: 1402,
        sha256: "AF40B81BCD21FBA3B832A3323FDE1E2D2873C9C31F0DBCD3EE55CE66198B208D",
        generationPromptSha256: "A32FD7027BD63099F1729D6BBCCA8C5DD288BB74DECFF2CB5D59567E75DB55CD",
      }),
      expect.objectContaining({
        view: "rear",
        file: "sd-creature-breachling-base-chatgpt-rear-v1-source.png",
        bytes: 1802881,
        width: 1254,
        height: 1254,
        sha256: "50ABC07414B545277E0C2E5BC66A83DFCFCD53A9AA1A3F3CE35D2BA3A1A9AAE6",
        generationPromptSha256: "F139E2EF1087092BC066CF354FC340ED377CB524B20EFFAE4F93ED6C5658CFA9",
      }),
      expect.objectContaining({
        view: "right",
        file: "sd-creature-breachling-base-chatgpt-right-v1-source.png",
        bytes: 1692371,
        width: 1122,
        height: 1402,
        sha256: "837748C86E1A9D70F273F2BE5D93092C649A4E7C13A438500132C0261F201E16",
        generationPromptSha256: "36BF35DA40AD0CA2DAC58BFF9962ABD8B1CD40FB444C207426430511D49144D6",
      }),
    ]);
    expect(task?.viewContract).toMatchObject({
      mode: "four-clean-separate-identity-matched-files",
      coverage: ["front", "left", "rear", "right"],
      compositeSheetAllowed: false,
    });
    expect(task?.supersededSourceImages).toHaveLength(2);
    expect(task?.designContract).toMatchObject({
      family: "breachling-hunched-predator",
      sharedRigAcrossTiers: true,
      mouth: "huge-broad-non-human-hinged-predator-maw-with-deep-cavity-layered-teeth-and-visible-tongue",
      tierRenderPolicy: "each-tier-receives-owner-reviewed-chatgpt-render-but-retains-the-shared-anatomy-and-rig",
    });
    expect(task?.designContract?.requiredFacialControls).toEqual(["jaw-open", "jaw-close", "snarl"]);
    expect(task?.designContract?.tierVariants).toMatchObject({
      base: expect.stringContaining("pale-ash-grey"),
      stalker: expect.stringContaining("darker-slate-smoke"),
      oathbound: expect.stringContaining("earth-brown-ochre"),
      ravager: expect.stringContaining("cinder-red-rust"),
    });
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
