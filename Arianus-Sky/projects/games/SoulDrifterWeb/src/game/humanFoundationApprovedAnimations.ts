export interface ExternalGameplayPropBinding {
  ownership: "EXTERNAL_GAMEPLAY_PROP";
  bindingSlot: "interaction-carried-object";
  propRole: "LIFTABLE_OBJECT";
  assetResolution: "INTERACTION_CONTEXT";
  attachmentMode: "BILATERAL_HAND_TARGETS";
  leftHandNode: string;
  rightHandNode: string;
  contactWindowNormalized: readonly [number, number];
  releaseAtClipEnd: boolean;
  authoringProxyIncluded: false;
}

export interface HumanFoundationApprovedAnimationSpec {
  url: string;
  sourceClipName: string;
  semanticClipName: string;
  sourceSha256: string;
  rootPolicy: "in-place" | "authored";
  externalPropBinding?: ExternalGameplayPropBinding;
}

export const HUMAN_FOUNDATION_APPROVED_ANIMATIONS: readonly HumanFoundationApprovedAnimationSpec[] = [
  {
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lift.glb",
    sourceClipName: "AuthoredUtility__Lift",
    semanticClipName: "AuthoredUtility__Lift",
    sourceSha256: "2C8AC197732B8852128B77E154F7FE8D2A0816A88CC9C3FC9E7BADC5589506C1",
    rootPolicy: "authored",
    externalPropBinding: {
      ownership: "EXTERNAL_GAMEPLAY_PROP",
      bindingSlot: "interaction-carried-object",
      propRole: "LIFTABLE_OBJECT",
      assetResolution: "INTERACTION_CONTEXT",
      attachmentMode: "BILATERAL_HAND_TARGETS",
      leftHandNode: "mixamorig:LeftHand",
      rightHandNode: "mixamorig:RightHand",
      contactWindowNormalized: [29 / 83, 1],
      releaseAtClipEnd: false,
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
