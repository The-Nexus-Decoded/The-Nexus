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
    expect(modelRegister.program.notifyWhenCreditBalanceBelow).toBe(800);
    expect(modelRegister.creditPolicy.notifyWhenCreditBalanceBelow).toBe(800);

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
      selectedBespokeMultiViewProviderModel: "meshy-7-multi-image",
      prismExternalCreatureMultiViewPolicy: "do-not-retry-after-policy-rejection-and-auto-refund",
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
      status: "custom-four-view-meshy-poc-owner-preferred-source-candidate-awaiting-retopology-and-rig",
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

  it("keeps all three Breachling tier fronts provisional and biological", () => {
    for (const assetId of [
      "creature-breachling-stalker-image-first-v001",
      "creature-oathbound-breachling-image-first-v001",
      "creature-breachling-ravager-image-first-v001",
    ]) {
      const task = sourceTask(assetId);
      expect(task).toMatchObject({
        plannedConversionModel: "meshy-7-multi-image",
        plannedTextureQuality: "standard",
        status: "provisional-visual-direction-liked-but-frozen-pending-full-spec-parity-audit",
        ownerReview: "visual-direction-liked-not-production-approved",
        sharedRigWith: "creature-breachling-base-image-first-v001",
        grownBiologicalArmorOnly: true,
        manufacturedOrWornArmorAllowed: false,
        runtimePromotionAllowed: false,
      });
    }
  });

  it("preserves and rejects the paid two-front Warden while preparing a gated replacement", () => {
    const task = sourceTask("creature-cinderbound-warden-image-first-v001");

    expect(task).toMatchObject({
      operation: "image-to-3d-multi-view-four-image",
      provider: "3d-ai-studio",
      model: "prism-3.1-multi-view",
      actualCredits: 45,
      taskId: "445fd16b-4006-4c18-a54a-fed2a63da955",
      creditBalanceBeforeTask: 2392,
      creditBalanceAfterTask: 2347,
      status: "generated-rejected-cloud-source-preserved-replacement-source-set-in-progress",
      ownerReview: "rejected-two-head-back-mismatch-and-missing-live-core-flame",
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
      plannedConversionModel: "meshy-7-multi-image",
      submissionAllowed: false,
      missingViews: ["exact-ninety-degree-left-v2", "exact-ninety-degree-right-v2"],
    });
    expect(task.designOutcome).toMatchObject({
      coreVfxSocket: "VFX_CoreFlame",
      coreVfxRule:
        "model-a-hollow-furnace-cage-and-core-cavity-but-render-moving-flame-as-runtime-vfx-not-baked-provider-geometry",
      rightArm: "integrated-obsidian-sweep-blade-housing-with-no-handheld-weapon",
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
