import { describe, expect, it } from "vitest";
import bodyAnchorIntake from "../docs/3d-ai-studio/body-anchor-intake.json";
import modelRegister from "../docs/3d-ai-studio/first-breach-model-register.json";

const sourceTask = (assetId: string) =>
  modelRegister.sourceGenerationTasks.find((entry) => entry.assetId === assetId) as any;

describe("First Breach production model register", () => {
  it("records the bounded issue authorization without expanding it to downstream paid work", () => {
    expect(modelRegister.program.issue).toBe(448);
    expect(modelRegister.program.paidOperationApproved).toBe(true);
    expect(modelRegister.program.textTo3dGenerationApproved).toBe(false);
    expect(modelRegister.creditPolicy.batchApprovalImplied).toBe(true);
    expect(modelRegister.creditPolicy.stopOnUnexpectedCost).toBe(true);
    expect(modelRegister.creditPolicy.excludedOperations).toEqual(
      expect.arrayContaining(["remesh", "rigging", "paid-animation"]),
    );
    expect(modelRegister.program.creditFloorRemovedByOwner).toBe(true);
    expect(modelRegister.creditPolicy.creditFloorRemovedByOwner).toBe(true);
    expect(modelRegister.program.notifyWhenCreditBalanceBelow).toBeNull();
    expect(modelRegister.creditPolicy.notifyWhenCreditBalanceBelow).toBeNull();

    for (const group of modelRegister.assetGroups) {
      expect(group.geometrySource).toBe("3d-ai-studio");
      expect(group.status).toBe("approval-required");
    }
  });

  it("enforces prospective full-spec prompt parity without discarding paid source candidates", () => {
    const gate = modelRegister.generationPolicy.canonicalSpecParityGate;

    expect(gate).toMatchObject({
      requiredForEveryGeneratedSource: true,
      appliesProspectivelyFromDecision: true,
      existingPaidOutputsGrandfatheredForVisualAndTechnicalQa: true,
      existingPaidOutputsRequireAutomaticRegeneration: false,
      shorthandPromptsAllowed: false,
      referenceOnlyDeltaPromptsAllowed: false,
      canonicalIdentityAndAnatomyBlockReusedVerbatim: true,
      onlyCameraOrOutputSuffixMayChangeBetweenViews: true,
      ownerVisualReviewRequiredAfterChecklistPass: true,
    });
    expect(gate.requiredReviewDimensions).toEqual(
      expect.arrayContaining([
        "silhouette",
        "scale-and-proportions",
        "anatomy-and-joint-logic",
        "face-and-identity",
        "surface-material-and-color",
        "role-and-lore-read",
        "pose-and-camera-view",
        "required-details",
        "forbidden-traits",
      ]),
    );
    expect(modelRegister.bodyAnchorIntake).toMatchObject({
      acceptedVisualSources: 12,
      acceptedProductionSources: 0,
      canonicalPromptParityVerified: false,
    });
    expect(bodyAnchorIntake.workflow).toMatchObject({
      prospectiveCanonicalFullSpecParityRequired: true,
      retrospectiveCompletePromptParityVerified: false,
      retrospectivePromptGapTriggersRebuild: false,
      shorthandOrReferenceOnlyDeltaPromptsAllowedProspectively: false,
    });
    expect(bodyAnchorIntake.workflow.existingPaidSourceDisposition).toContain("no-automatic-regeneration");
  });

  it("blocks ambiguous side and rear references for every creature body plan", () => {
    const gate = modelRegister.generationPolicy.imageTo3dProduction.multiViewSourceGate;

    expect(gate.submissionBlockedUntilEveryViewPasses).toBe(true);
    expect(gate).toMatchObject({
      canonicalSourceGenerator: "chatgpt-built-in-imagegen-not-3d-ai-studio-image-generation",
      articulatedActorTurnaroundTool: "3d-ai-studio-character-sheet-generator-gpt-image-2-medium",
      articulatedActorTurnaroundUse: "fallback-for-simpler-humanoid-or-npc-proof-not-default-for-bespoke-monsters",
      bespokeMonsterPreferredSource: "four-separate-owner-reviewed-chatgpt-views-with-full-canonical-spec-parity",
      selectedBespokeMultiViewProviderModel: "asset-specific-provider-selected-from-accepted-output-quality",
      prismExternalBreachlingMultiViewPolicy: "do-not-retry-after-policy-rejection-and-auto-refund",
      turnaroundMasterAllowedAsStagingOnly: true,
      turnaroundMasterAllowedAsImageTo3dInput: false,
      providerFixedSlotOrder: ["front", "left", "back", "right"],
      browserUploadExactApprovedFilesRequired: true,
      backgroundRemovalForConnectorAddressabilityAllowed: false,
    });
    expect(gate.appliesTo).toEqual(
      expect.arrayContaining([
        "humanoid",
        "biped-creature",
        "quadruped-creature",
        "avian-creature",
        "mechanical-creature",
      ]),
    );
    expect(gate.rearRequiredEvidence).toEqual(
      expect.arrayContaining([
        "back-of-skull-or-rear-head-shell",
        "spine-scapulae-or-rear-axial-structure",
        "backs-of-hands-paws-wings-or-forelimbs",
      ]),
    );
    expect(gate.rearForbiddenFrontCues).toEqual(
      expect.arrayContaining([
        "eyes-nose-mouth-teeth-tongue-or-face",
        "throat-chest-abdomen-front-rib-cage-or-front-core",
        "palms-palm-mechanisms-or-anterior-paw-pads",
      ]),
    );
    expect(gate.sideRequiredEvidence).toContain("exact-ninety-degree-orthographic-profile");
    expect(gate.sideForbiddenCues).toEqual(
      expect.arrayContaining(["three-quarter-camera-angle", "second-eye-or-opposite-cheek", "palm-surface"]),
    );
    expect(gate.crossViewConsistencyRequired).toEqual(
      expect.arrayContaining([
        "same-subject-scale-and-ground-height",
        "same-camera-distance-and-orthographic-framing",
        "same-appendage-count-and-asymmetric-side-placement",
      ]),
    );
    expect(gate.completedModelInspection).toEqual(
      expect.arrayContaining(["front", "left", "back", "right", "top", "underside"]),
    );
    expect(gate.failureAction).toBe("reject-source-view-regenerate-and-spend-zero-provider-credits");

    expect(modelRegister.generationPolicy.imageTo3dProduction.nonCharacterObjectRouting).toEqual({
      simpleSymmetricObject: "single-clean-three-quarter-image",
      complexAsymmetricObject: "four-view-object-turnaround-split-into-front-left-back-right",
      characterSheetGeneratorAllowed: false,
      canonicalFrontDefinedBy: "functional-facing-direction-or-documented-presentation-side",
    });
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

    const expectedSources = [
      {
        assetId: "npc-ilyra-image-first-v001",
        taskId: "02c05b91-3da0-49bf-8337-f019bbedee33",
        bodyFile: "sd-npc-ilyra-chatgpt-fullbody-front-v1-source.png",
        faceFile: "sd-npc-ilyra-chatgpt-conversation-head-front-v1-source.png",
        glbFile: "sd-npc-ilyra-prism-task-02c05b91-untouched.glb",
      },
      {
        assetId: "npc-orren-image-first-v001",
        taskId: "a00a1818-57cd-4953-90a5-b62ac934b30d",
        bodyFile: "sd-npc-orren-chatgpt-fullbody-front-v1-source.png",
        faceFile: "sd-npc-orren-chatgpt-conversation-head-front-v1-source.png",
        glbFile: "sd-npc-orren-prism-task-a00a1818-untouched.glb",
      },
      {
        assetId: "npc-brannoc-image-first-v001",
        taskId: "74ff6706-6833-451d-b542-4c2e75ab007c",
        bodyFile: "sd-npc-brannoc-chatgpt-fullbody-front-v1-source.png",
        faceFile: "sd-npc-brannoc-chatgpt-conversation-head-front-v1-source.png",
        glbFile: "sd-npc-brannoc-prism-task-74ff6706-untouched.glb",
      },
    ];

    for (const expected of expectedSources) {
      const task = sourceTask(expected.assetId);
      expect(task).toMatchObject({
        operation: "image-to-3d-single-image",
        model: "prism-3.1",
        status: "accepted-production-source-facial-conform-and-rigging-pending",
        runtimePromotionAllowed: false,
      });
      expect(task.sourceImage.file).toBe(expected.bodyFile);
      expect(task.conversationFaceSource.file).toBe(expected.faceFile);
      expect(task.identityContract.sameIdentityAcrossWorldActorAndConversationFace).toBe(true);
      expect(task.conversion).toMatchObject({
        taskId: expected.taskId,
        actualCredits: 40,
        pbr: true,
        faceLimit: 150000,
      });
      expect(task.conversion.untouchedExport.file).toBe(expected.glbFile);
      expect(task.conversion.technicalInspection).toMatchObject({ skins: 0, animations: 0 });
    }
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

  it("retains the direct text Breachling only as a non-shipping family reference", () => {
    const task = sourceTask("creature-breachling-base-v001");

    expect(task).toMatchObject({
      operation: "text-to-3d",
      taskId: "82459e9b-e63b-4be1-a3be-cad264fedc44",
      actualCredits: 40,
      creditBalanceAfterTask: 2432,
      ownerReview: "approved-as-family-style-reference",
      runtimePromotionAllowed: false,
    });
    expect(task.promptSha256).toBe("640AF9D6DB5969C7EC6E0F0910FFD5D181E0968E044CE0E7F81169EA89E55394");
    expect(task.generationOutcome.decision).toBe("retain-as-design-source-not-yet-a-rig-candidate");
  });

  it("records the owner-selected custom-four-view Meshy Breachling POC winner", () => {
    const task = sourceTask("creature-breachling-base-image-first-v001");

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image-poc",
      model: "meshy-7-multi-image",
      textureQuality: "standard",
      topologySetting: "quad",
      expectedCredits: 45,
      maximumCredits: 45,
      status: "custom-four-view-meshy-poc-owner-preferred-workflow-proof-superseded-for-production-by-beast-tail-rule",
      taskId: "7ad8a98c-8984-4091-a71c-ed053295e156",
      actualCredits: 45,
      ownerReview: "custom-four-view-meshy-poc-preferred-over-auto-sheet-same-engine-comparison",
      runtimePromotionAllowed: false,
    });
    expect(task.viewContract).toMatchObject({
      sourceSetDecision: "rejected-before-provider-submission",
      compositeSheetAllowed: false,
    });
    expect(task.viewContract.sideGate).toContain("upright-dragonkin-like-humanoids");
    expect(task.designContract.forbiddenBodyRead).toEqual(
      expect.arrayContaining(["upright-humanoid", "dragonkin", "dragonborn", "heroic-biped"]),
    );
    expect(task.designContract.anatomy).toContain("spine-hinged-forward-about-forty-degrees");
    expect(task.designContract.tierArmorContract).toMatchObject({
      construction: "grown-biological-dermal-plating-emerging-from-the-hide",
      manufacturedOrWornArmorAllowed: false,
    });
    expect(task.designContract.beastTailContract).toMatchObject({
      requiredAcrossFamily: true,
      sharedRigRequirement: "one-tail-enabled-breachling-family-rig-with-a-versioned-tail-chain-used-by-every-tier",
    });
    expect(task.tailPolicyOverride).toMatchObject({
      decision: "all-breachling-beast-tiers-require-one-functional-tail",
      supersedesHistoricalPromptTrait: "no-tail",
    });
    expect(task.canonicalPromptPolicy).toMatchObject({
      fullIdentityBlockRequiredVerbatimForEveryView: true,
      shorthandOrReferenceOnlyPromptAllowed: false,
      onlyCameraSuffixMayChange: true,
    });
    expect(task.canonicalPromptPolicy.canonicalIdentityBlock).toContain("about forty degrees");
    expect(task.replacementSourceSet).toMatchObject({
      status: "canonical-four-view-v5-safe-rear-owner-approved-and-meshy-converted",
      submissionAllowed: true,
      ownerReview: "approved",
      missingViews: [],
    });
    expect(task.replacementSourceSet.viewOrderForProvider).toEqual(["front", "left", "rear", "right"]);
    expect(task.replacementSourceSet.sourceImages.map((source: any) => source.view)).toEqual([
      "front",
      "left",
      "rear",
      "right",
    ]);
    for (const source of task.replacementSourceSet.sourceImages) {
      expect(source.promptParity).toContain("full-canonical-identity-block-plus-");
      expect(source.anomalyGate).toContain("passed");
    }
    expect(task.replacementSourceSet.sourceImages.find((source: any) => source.view === "rear")).toMatchObject({
      file: "sd-creature-breachling-base-chatgpt-rear-v5-safe-source.png",
      sha256: "5E41BD54732E216529D91F1680AF5BBB2C2FAA7846E9658821815CB84DC2F3F3",
    });
    expect(task.workflowComparison).toMatchObject({
      decision: "custom-four-view-meshy-wins-for-bespoke-monsters",
      ownerDecision: "ours-is-better-custom-four-view-meshy",
      characterSheet: {
        taskId: "b3c21a78-3c79-442b-b383-ae3a7eb5bcd6-0",
        actualCredits: 6,
      },
      characterSheetToPrism: {
        taskId: "1bea1354-38aa-45e1-a2b8-827d01ecdfb5",
        actualCredits: 40,
      },
      customFourViewToMeshy: {
        taskId: "7ad8a98c-8984-4091-a71c-ed053295e156",
        actualCredits: 45,
        ownerPreferred: true,
      },
      characterSheetToMeshy: {
        taskId: "d16c2f59-1213-4339-8741-14ecdc3e01f3",
        actualCredits: 45,
        ownerPreferred: false,
      },
    });
    expect(task.workflowComparison.prismCustomFourView).toMatchObject({
      status: "policy-rejected-and-auto-refunded",
      browserAttemptsWithoutStableTaskId: 2,
      netCredits: 0,
      retryAllowed: false,
    });
    expect(task.workflowComparison.customFourViewToMeshy.meshInspection).toMatchObject({
      vertices: 1046575,
      triangles: 1997824,
      skins: 0,
      animations: 0,
    });
    expect(task.workflowComparison.runtimeGate).toContain("not-runtime-ready");
  });

  it("records the inspected tail-corrected base as the provisional production source", () => {
    const task = sourceTask("creature-breachling-base-tailed-image-first-v002");

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image",
      model: "meshy-7-multi-image",
      studioProject: "SoulDrifter",
      studioProjectId: 310153,
      textureQuality: "standard",
      topologySetting: "quad",
      texturesEnabled: true,
      pbrEnabled: true,
      taskId: "2897ca72-80fa-4872-ae65-98a088a7d63c",
      actualCredits: 45,
      status: "generated-provisional-production-source-candidate-owner-final-review-pending-retopology-and-rig",
      supersedesForProduction: "creature-breachling-base-image-first-v001",
      preservesHistoricalPoc: true,
      sharedRigWith: "future-tail-enabled-breachling-family-rig-v1",
      runtimePromotionAllowed: false,
    });
    expect(task.creditReceipt).toMatchObject({
      balanceBeforeSubmission: 1424,
      postCompletionObservedBalance: 819,
      postCompletionBalanceAttributableToThisTaskAlone: false,
      concurrentPaidTasksObservedFromParallelLevelAssetWork: true,
      hardFloor: 800,
      paidGenerationBlockedAfterThisTask: true,
    });
    expect(task.viewOrderForProvider).toEqual(["front", "left", "rear", "right"]);
    expect(task.sourceImages.map((source: any) => source.view)).toEqual(["front", "left", "rear", "right"]);
    for (const source of task.sourceImages) {
      expect(source.promptParity).toContain("full-canonical-identity-anatomy-material-and-forbidden-trait-block");
      expect(source.anomalyGate).toContain("passed");
    }
    expect(task.sourceImages.find((source: any) => source.view === "rear")).toMatchObject({
      file: "sd-creature-breachling-base-chatgpt-rear-v6-tail-canonical-source.png",
      sha256: "A317BAFD4F2DC71B284F63350969745ECEE2791E5410B0D4B9C0FAE35CF945FA",
      tailEvidence: "one-tail-continuous-with-the-center-sacrum-thick-at-the-root-and-sweeping-image-left",
    });
    expect(task.promptLineage).toMatchObject({
      finalSourcePromptParityVerified: true,
      fullCanonicalIdentityBlockRepeatedVerbatimInEveryView: true,
      onlyCameraSuffixChangedBetweenViews: true,
    });
    expect(task.untouchedExport).toMatchObject({
      file: "sd-creature-breachling-base-meshy7-multiview-ash-tail-source.glb",
      bytes: 52772424,
      sha256: "797419CC9E3D19575DD3A55F91A0CD199427CC3F9AA27E6DC59659AA2809FCD9",
    });
    expect(task.meshInspection).toMatchObject({
      nodes: 1,
      meshes: 1,
      primitives: 1,
      vertices: 859345,
      triangles: 1648748,
      skins: 0,
      animations: 0,
      morphTargets: 0,
      materials: 1,
      textures: 3,
    });
    expect(task.visualInspection).toMatchObject({
      passed: true,
      renderedViews: ["front", "left", "rear", "right"],
    });
    expect(task.visualInspection.findings).toEqual(
      expect.arrayContaining([
        "one-head-one-tail-two-arms-two-legs",
        "no-mirrored-front-or-second-head-on-the-rear",
      ]),
    );
  });

  it("records the inspected rust-red tailed Stalker as a provisional source candidate", () => {
    const task = sourceTask("creature-breachling-stalker-image-first-v001");

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image",
      model: "meshy-7-multi-image",
      studioProject: "SoulDrifter",
      studioProjectId: 310153,
      textureQuality: "standard",
      topologySetting: "quad",
      taskId: "4f473756-9660-48d1-a6f7-14d6de55524a",
      actualCredits: 45,
      status: "generated-provisional-source-candidate-owner-final-review-pending-retopology-and-rig",
      sharedRigWith: "future-tail-enabled-breachling-family-rig-v1",
      grownBiologicalArmorOnly: true,
      manufacturedOrWornArmorAllowed: false,
      runtimePromotionAllowed: false,
    });
    expect(task.viewOrderForProvider).toEqual(["front", "left", "rear", "right"]);
    expect(task.sourceImages.map((source: any) => source.view)).toEqual(["front", "left", "rear", "right"]);
    expect(task.sourceImages.find((source: any) => source.view === "rear")).toMatchObject({
      file: "sd-creature-breachling-stalker-chatgpt-rear-v4-rust-tail-canonical-source.png",
      sha256: "73116E23ECB4CCA1F823140ED3D510B5E8BA21D8A810D02AEABB753A30CC27E3",
      tailEvidence: "one-tail-continuous-with-the-center-sacrum-thick-at-the-root-and-sweeping-image-left",
    });
    expect(task.designOutcome).toMatchObject({
      tier: "second-breachling-tier-above-base-and-below-oathbound-and-ravager",
      palette:
        "deep-rust-red-dark-crimson-living-scales-with-burgundy-joints-near-black-horns-claws-and-ridge-tips-and-amber-eyes",
    });
    expect(task.promptLineage).toMatchObject({
      finalSourcePromptParityVerified: false,
      automaticRegenerationAllowed: false,
    });
    expect(task.untouchedExport).toMatchObject({
      file: "sd-creature-breachling-stalker-meshy7-multiview-rust-tail-source.glb",
      bytes: 60994784,
      sha256: "C167BDF8EF29BAB195B76656FED32FEC3909CF72353F3C8CB82A9E3EC19DC4E5",
    });
    expect(task.meshInspection).toMatchObject({
      nodes: 1,
      meshes: 1,
      primitives: 1,
      vertices: 1005742,
      triangles: 1905366,
      skins: 0,
      animations: 0,
      morphTargets: 0,
      materials: 1,
      textures: 3,
    });
    expect(task.visualInspection).toMatchObject({
      passed: true,
      renderedViews: ["front", "left", "rear", "right"],
    });
    expect(task.visualInspection.findings).toEqual(
      expect.arrayContaining([
        "one-head-one-tail-two-arms-two-legs",
        "no-mirrored-front-or-second-head-on-the-rear",
      ]),
    );
  });

  it("records conversion-ready Oathbound and Ravager four-view sources without crossing the credit floor", () => {
    for (const assetId of [
      "creature-oathbound-breachling-image-first-v001",
      "creature-breachling-ravager-image-first-v001",
    ]) {
      const task = sourceTask(assetId);
      expect(task).toMatchObject({
        operation: "chatgpt-four-view-source-set-complete-awaiting-conversion",
        plannedConversionModel: "meshy-7-multi-image",
        plannedTextureQuality: "standard",
        status: "four-view-source-set-complete-owner-review-pending-conversion-blocked-by-credit-floor",
        ownerReview: "historical-direction-liked-final-four-view-v3-set-pending-owner-review",
        sharedRigWith: "future-tail-enabled-breachling-family-rig-v1",
        grownBiologicalArmorOnly: true,
        manufacturedOrWornArmorAllowed: false,
        runtimePromotionAllowed: false,
      });
      expect(task.viewOrderForProvider).toEqual(["front", "left", "rear", "right"]);
      expect(task.sourceImages.map((source: any) => source.view)).toEqual(["front", "left", "rear", "right"]);
      for (const source of task.sourceImages) {
        expect(source.anomalyGate).toContain("passed");
        expect(source.tailEvidence).toContain("tail");
      }
      expect(task.promptLineage).toMatchObject({
        finalSourcePromptParityVerified: true,
        fullCanonicalIdentityBlockRepeatedInEveryView: true,
        cameraAndOutputSuffixChangedPerView: true,
      });
      expect(task.conversionCreditGate).toMatchObject({
        balanceObserved: 819,
        hardFloor: 800,
        plannedTaskCredits: 45,
        submissionAllowed: false,
        reason: "planned-conversion-would-cross-the-owner-hard-credit-floor",
      });
    }

    const oathbound = sourceTask("creature-oathbound-breachling-image-first-v001");
    expect(oathbound.sourceImages.find((source: any) => source.view === "rear")).toMatchObject({
      file: "sd-creature-breachling-oathbound-chatgpt-rear-v3-green-tail-canonical-source.png",
      sha256: "65C98BC39E7901EC8E30063BF805A6A94272E5F642C2E91084EE7872EBEBFBD8",
    });
    expect(oathbound.designOutcome.grownArmor).toContain("mineralized-osteoderms");

    const ravager = sourceTask("creature-breachling-ravager-image-first-v001");
    expect(ravager.sourceImages.find((source: any) => source.view === "rear")).toMatchObject({
      file: "sd-creature-breachling-ravager-chatgpt-rear-v3-cinder-tail-canonical-source.png",
      sha256: "7AD6EC124C6B87BA35658A2F1D900472C283C03EA35D9F9346A143D6BB286011",
    });
    expect(ravager.designOutcome.grownArmor).toContain("natural-horns");
  });

  it("preserves rejected Warden provenance and accepts the corrected Prism source", () => {
    const task = sourceTask("creature-cinderbound-warden-image-first-v001");

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image",
      provider: "3d-ai-studio",
      model: "prism-3.1-multi-view",
      actualCredits: 45,
      taskId: "445fd16b-4006-4c18-a54a-fed2a63da955",
      creditBalanceBeforeTask: 2392,
      creditBalanceAfterTask: 2347,
      status: "rejected-original-prism-and-meshy-sources-preserved-corrected-prism-source-accepted-for-technicalization",
      ownerReview: "corrected-prism-v3-passes-owner-specified-red-eye-furnace-claw-arm-and-true-rear-contract",
      runtimePromotionAllowed: false,
    });
    expect(task.sourceImages.map((source: any) => source.view)).toEqual(["front", "left", "rear", "right"]);
    expect(task.untouchedExport).toMatchObject({
      file: "sd-creature-cinderbound-warden-prism-multiview-task-445fd16b-untouched.glb",
      bytes: 43863688,
      sha256: "11848C1BBEA857AF13DDA0653B7185FCF63D6DF2AC547CB5046805FE424E3666",
    });
    expect(task.generationOutcome.productionCandidateAccepted).toBe(false);
    expect(task.generationOutcome.fatalFindings).toEqual(
      expect.arrayContaining([
        "duplicate-two-head-silhouette",
        "rear-reference-repeated-front-facing-anatomy",
        "front-and-back-became-the-same-body-surface",
      ]),
    );
    expect(task.replacementSourceSet).toMatchObject({
      status: "corrected-prism-v3-multiview-source-accepted-for-technicalization",
      plannedConversionModel: "prism-3.1-multi-image",
      submissionAllowed: true,
      missingViews: [],
    });
    expect(task.replacementSourceSet.viewOrderForProvider).toEqual(["front", "left", "rear", "right"]);
    expect(task.replacementSourceSet.sourceImages.map((source: any) => source.view)).toEqual([
      "front",
      "left",
      "rear",
      "right",
    ]);
    expect(task.replacementSourceSet.sourceImages.find((source: any) => source.view === "left")).toMatchObject({
      file: "sd-creature-cinderbound-warden-chatgpt-left-v3-true-profile-source.png",
      sha256: "CB1AF5F7482A007406F1DD5E05B531BC755A4C6A5476DC7F8799623ED797B955",
    });
    expect(task.replacementSourceSet.sourceImages.find((source: any) => source.view === "right")).toMatchObject({
      file: "sd-creature-cinderbound-warden-chatgpt-right-v3-true-profile-source.png",
      sha256: "CB833B61F42839CD332EE27E9E1A5D5D04FE5A6097B7345B4AD62708525DFDC9",
    });
    expect(task.replacementSourceSet.sourceImages.find((source: any) => source.view === "front")).toMatchObject({
      file: "sd-creature-cinderbound-warden-chatgpt-front-v3-red-eyes-furnace-source.png",
      sha256: "9131CD10BA794B3329FD89B25374C9540D5155DAF67826A1320DFBCE3FB046D6",
    });
    expect(task.replacementSourceSet.asymmetryContract).toMatchObject({
      bladeMirroringOrDuplicationAllowed: false,
      rearFrontDuplicationAllowed: false,
      headCount: 1,
      frontRedEyeCount: 2,
      rearEyeCount: 0,
    });
    expect(task.replacementSourceSet.conversionCreditGate).toMatchObject({
      balanceObserved: 819,
      hardFloor: 800,
      plannedTaskCredits: 45,
      hardFloorRemovedByOwner: true,
      submissionAllowed: true,
      balanceAfterTask: 774,
    });
    expect(task.replacementSourceSet.conversion).toMatchObject({
      provider: "3d-ai-studio",
      model: "meshy-7-multi-image",
      taskId: "ca97a8d6-2fc0-4c9a-8ed4-8cf7eb6d3764",
      projectId: 310153,
      actualCredits: 45,
      creditBalanceBeforeTask: 819,
      creditBalanceAfterTask: 774,
      topology: "quad",
      textureQuality: "2k",
      pbr: true,
      status: "superseded-by-corrected-prism-v3-retained-for-provenance",
    });
    expect(task.replacementSourceSet.conversion.untouchedExport).toMatchObject({
      file: "sd-creature-cinderbound-warden-meshy7-corrected-multiview-task-ca97a8d6-untouched.glb",
      bytes: 68660976,
      sha256: "13A4F16B158B2BE8A921D75AD0C0F89F3C41EED818FD9D323B23629BB44C5A5D",
    });
    expect(task.replacementSourceSet.conversion.technicalInspection).toMatchObject({
      triangles: 1985294,
      skins: 0,
      animations: 0,
    });
    expect(task.replacementSourceSet.supersedingConversion).toMatchObject({
      model: "prism-3.1-multi-image",
      taskId: "b249e29c-7ead-45da-85f0-3f996eaf8f90",
      actualCredits: 45,
      creditBalanceBeforeTask: 694,
      creditBalanceAfterTask: 649,
      status:
        "accepted-production-source-rigid-emissive-pilot-proved-runtime-integration-pending",
    });
    expect(task.replacementSourceSet.supersedingConversion.untouchedExport).toMatchObject({
      file: "sd-creature-cinderbound-warden-prism-corrected-multiview-task-b249e29c-untouched.glb",
      bytes: 8002660,
      sha256: "165FDBAEC8176269BFB51FD0E7A21DA671459D635748A0147EBB554495626C6C",
    });
    expect(task.replacementSourceSet.supersedingConversion.technicalInspection).toMatchObject({
      triangles: 144490,
      skins: 0,
      animations: 0,
    });
    expect(task.replacementSourceSet.supersedingConversion.visualInspection.passed).toEqual(
      expect.arrayContaining([
        "one-head-with-two-distinct-red-glowing-eyes",
        "bright-ember-furnace-inside-open-ribbed-chest-cage",
        "oversized-integrated-curved-claw-blade-and-separate-soul-tax-palm",
        "true-armored-rear-with-no-face-or-duplicate-furnace",
      ]),
    );
    expect(
      task.replacementSourceSet.supersedingConversion.offlineTechnicalizationPilot,
    ).toMatchObject({
      blenderVersion: "4.5.12 LTS",
      sourceSha256Verified: true,
      sourceTopology: {
        connectedComponents: 294,
      },
      rig: {
        boneCount: 17,
        deformBoneCount: 16,
        assignedComponents: 294,
        skinCount: 1,
        proofAnimation: "Warden_RigidProof",
        proofFrameRange: [1, 30],
      },
      lod0: {
        file: "sd-creature-cinderbound-warden-rigid-lod0-pilot-v006.glb",
        bytes: 6774664,
        sha256: "57A73C1CBB8887F67679F6F962FDB1124378A20A42EBBC47957687F80294C836",
        triangles: 80399,
        targetHeightMeters: 2.13,
        meshes: 1,
        materials: 3,
        skins: 1,
        joints: 17,
        animations: ["Warden_RigidProof"],
      },
      emissiveVisualSemantics: [
        "EyeGlow.L",
        "EyeGlow.R",
        "CoreEmber.Center",
        "CoreEmber.Upper",
        "CoreEmber.Lower",
      ],
      weaponSemantics: ["ClawBlade.Right", "SoulTaxPalm.Left"],
      status: "external-rigid-lod0-emissive-proof-runtime-promotion-pending",
      runtimePromotionAllowed: false,
    });
    expect(task.designOutcome).toMatchObject({
      coreVfxSocket: "VFX_CoreFlame",
      coreVfxRule:
        "model-a-hollow-furnace-cage-and-core-cavity-but-render-moving-flame-as-runtime-vfx-not-baked-provider-geometry",
      rightArm: "integrated-obsidian-sweep-blade-housing-with-no-handheld-weapon",
    });
  });

  it("preserves four cross-ancestry facial families without multiplying paid head geometry", () => {
    const library = modelRegister.appearanceReferenceLibrary as any;
    const familyCounts = new Map<string, number>();

    expect(library.runtimePromotionAllowed).toBe(false);
    expect(library.facePolicy).toMatchObject({
      availableAcrossAncestries: ["human", "elf", "dwarf", "halfling"],
      availableAcrossBodyProfiles: ["slim", "athletic", "heavy"],
      mechanicalImpact: "none",
      paidStandaloneConversionRequired: false,
    });
    expect(library.faceReferences).toHaveLength(8);

    for (const reference of library.faceReferences) {
      familyCounts.set(reference.familyId, (familyCounts.get(reference.familyId) ?? 0) + 1);
      expect(reference.file).toMatch(/^sd-face-.+-chatgpt-v1\.png$/);
      expect(reference.sha256).toMatch(/^[A-F0-9]{64}$/);
      expect(reference.bytes).toBeGreaterThan(0);
    }

    expect(Object.fromEntries(familyCounts)).toEqual({
      "african-diaspora-black": 2,
      "east-asian": 2,
      "south-asian-indian": 2,
      european: 2,
    });
    expect(library.faceReferences.filter((entry: any) => entry.presentation === "masculine")).toHaveLength(4);
    expect(library.faceReferences.filter((entry: any) => entry.presentation === "feminine")).toHaveLength(4);
  });

  it("preserves the twelve-style hair library and records its provider conversion gate", () => {
    const library = modelRegister.appearanceReferenceLibrary as any;
    const conversions = modelRegister.modularSourceConversions as any;
    const hairConversions = conversions.entries.filter((entry: any) => entry.category === "hair");

    expect(library.hairReferences).toHaveLength(12);
    expect(library.hairReferences.filter((entry: any) => entry.presentation === "masculine")).toHaveLength(6);
    expect(library.hairReferences.filter((entry: any) => entry.presentation === "feminine")).toHaveLength(6);
    expect(new Set(library.hairReferences.map((entry: any) => entry.assetId)).size).toBe(12);
    expect(hairConversions).toHaveLength(12);
    expect(hairConversions.filter((entry: any) => entry.taskId)).toHaveLength(12);
    expect(hairConversions.filter((entry: any) => entry.status === "source-approved-awaiting-provider-upload-window")).toHaveLength(0);

    for (const reference of library.hairReferences) {
      expect(reference.sha256).toMatch(/^[A-F0-9]{64}$/);
      expect(reference.bytes).toBeGreaterThan(0);
    }
  });

  it("registers modular starter gear and wearables as source-only low-poly conversions", () => {
    const conversions = modelRegister.modularSourceConversions as any;
    const gear = conversions.entries.filter((entry: any) => entry.assetId.startsWith("gear-"));
    const wearables = conversions.entries.filter((entry: any) => entry.category === "wearable");
    const completed = conversions.entries.filter((entry: any) => entry.taskId);

    expect(conversions).toMatchObject({
      status: "source-conversion-batch-complete-no-runtime-promotion",
      studioProject: "SoulDrifter",
      studioProjectId: 310153,
      provider: "3d-ai-studio",
      model: "meshy-7-smart-topology-low-poly",
      settings: {
        singleImage: true,
        lowPoly: true,
        texture: true,
        textureQuality: "2k",
        pbr: true,
        maximumPolygons: 15000,
        expectedCreditsPerTask: 20,
        generationRateLimitPerMinute: 3,
        uploadRateLimitPerHour: 20,
      },
    });
    expect(gear).toHaveLength(10);
    expect(wearables).toHaveLength(4);
    expect(completed).toHaveLength(26);

    for (const entry of conversions.entries) {
      expect(entry.sourceSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(entry.runtimePromotionAllowed).toBe(false);
    }
    for (const entry of completed) {
      expect(entry.taskId).toMatch(/^[a-f0-9-]{36}$/);
      expect(entry.exportFile).toMatch(/\.glb$/);
      expect(entry.exportSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(entry.exportBytes).toBeGreaterThan(0);
      expect(entry.triangles).toBeGreaterThan(0);
      expect(entry.triangles).toBeLessThanOrEqual(15000);
    }

    const rejectedKnife = conversions.entries.find((entry: any) => entry.assetId === "gear-ritual-knife-starter-v001");
    expect(rejectedKnife).toMatchObject({
      status: "rejected-provider-invented-split-blade",
      fallbackAssetId: "gear-worn-dagger-starter-v001",
      runtimePromotionAllowed: false,
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
