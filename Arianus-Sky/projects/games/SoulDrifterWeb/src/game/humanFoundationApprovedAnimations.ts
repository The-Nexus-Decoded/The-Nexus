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
