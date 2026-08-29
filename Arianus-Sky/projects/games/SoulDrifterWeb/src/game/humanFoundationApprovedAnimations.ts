export interface ExternalInteractionTargetBinding {
  ownership: "EXTERNAL_GAMEPLAY_PROP";
  bindingSlot: "interaction-door-lock";
  propRole: "LOCKABLE_DOOR_CYLINDER";
  assetResolution: "INTERACTION_CONTEXT";
  actorAlignment: "FACE_TARGET_SQUARE";
  contactMode: "BILATERAL_TOOL_CONTACT";
  leftHandNode: string;
  rightHandNode: string;
  contactWindowNormalized: readonly [number, number];
  requiredToolRoles: readonly ["TENSION_WRENCH", "HOOK_PICK"];
  authoringProxyIncluded: false;
}

export interface HumanFoundationApprovedAnimationSpec {
  url: string;
  sourceClipName: string;
  semanticClipName: string;
  sourceSha256: string;
  reviewStatus: "OWNER_APPROVED" | "IN_GAME_QA_ACCEPTED";
  rootPolicy: "in-place" | "authored";
  rootNodeName: string;
  groundedReferenceClipName: string;
  externalTargetBinding?: ExternalInteractionTargetBinding;
}

export const HUMAN_FOUNDATION_APPROVED_ANIMATIONS: readonly HumanFoundationApprovedAnimationSpec[] = [
  {
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lockpick.glb",
    sourceClipName: "AuthoredUtility__Lockpick",
    semanticClipName: "AuthoredUtility__Lockpick",
    sourceSha256: "2AB154B7E9F58419A15D6F7C33557CFE77413F8B7448D507F1304DD06F84255A",
    reviewStatus: "OWNER_APPROVED",
    rootPolicy: "in-place",
    rootNodeName: "mixamorigHips",
    groundedReferenceClipName: "MaleLocomotion__Idle",
    externalTargetBinding: {
      ownership: "EXTERNAL_GAMEPLAY_PROP",
      bindingSlot: "interaction-door-lock",
      propRole: "LOCKABLE_DOOR_CYLINDER",
      assetResolution: "INTERACTION_CONTEXT",
      actorAlignment: "FACE_TARGET_SQUARE",
      contactMode: "BILATERAL_TOOL_CONTACT",
      leftHandNode: "mixamorig:LeftHand",
      rightHandNode: "mixamorig:RightHand",
      contactWindowNormalized: [31 / 131, 115 / 131],
      requiredToolRoles: ["TENSION_WRENCH", "HOOK_PICK"],
      authoringProxyIncluded: false,
    },
  },
  {
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-spell-impact-knockback-fall.glb",
    sourceClipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
    semanticClipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
    sourceSha256: "6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
    rootPolicy: "authored",
    rootNodeName: "mixamorigHips",
    groundedReferenceClipName: "MaleLocomotion__Idle",
  },
  {
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-npc-listen.glb",
    sourceClipName: "AuthoredUtility__NpcListen",
    semanticClipName: "AuthoredUtility__NpcListen",
    sourceSha256: "23615F625DC7C095D5BABF1358075060A6B69CC93FC7453AEDE88A8595F61DD6",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
    rootPolicy: "in-place",
    rootNodeName: "mixamorigHips",
    groundedReferenceClipName: "MaleLocomotion__Idle",
  },
  {
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-farewell.glb",
    sourceClipName: "AuthoredUtility__Farewell",
    semanticClipName: "AuthoredUtility__Farewell",
    sourceSha256: "760C60A83805918CB4034279998EC85F6A1D41E773F69DF850223DBF013E7F28",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
    rootPolicy: "in-place",
    rootNodeName: "mixamorigHips",
    groundedReferenceClipName: "MaleLocomotion__Idle",
  },
];

export function selectApprovedAnimationSource<T extends { name: string }>(
  spec: HumanFoundationApprovedAnimationSpec,
  animations: readonly T[],
): T {
  const selected = animations.find((animation) => animation.name === spec.sourceClipName);
  if (!selected) {
    throw new Error(`Approved animation pack ${spec.url} is missing ${spec.sourceClipName}.`);
  }
  return selected;
}
