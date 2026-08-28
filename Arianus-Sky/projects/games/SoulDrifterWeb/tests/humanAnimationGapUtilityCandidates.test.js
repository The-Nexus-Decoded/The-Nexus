import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = `${projectRoot}public/assets/3d/animations/human-foundation-pilot`;
const sourcePath = `${assetRoot}/human-foundation-pilot-animation-library.glb`;
const outputPath = `${assetRoot}/human-foundation-pilot-gap-utility-candidates.glb`;
const reportPath = `${assetRoot}/human-foundation-pilot-gap-utility-candidates-report.json`;
const scriptPath = `${projectRoot}scripts/build-human-animation-gap-utility.py`;

const expectedSourceHash = '6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793';
const expectedRequirements = [
  'death.drowning',
  'interaction.chop',
  'interaction.door.lock-unlock',
  'interaction.lift-carry-place',
  'interaction.lockpick',
  'interaction.loot-inspect',
  'interaction.mine',
  'interaction.valve',
  'locomotion.dodge.directional',
  'locomotion.fall.loop',
  'locomotion.land.running',
  'locomotion.shimmy',
  'locomotion.stairs',
  'locomotion.start-stop',
  'npc.farewell',
  'npc.listen',
  'water.dive',
  'water.surface.open',
  'water.underwater-swim',
];
const expectedClips = [
  'GapUtility__CarryLoopCandidate',
  'GapUtility__DodgeBackwardCandidate',
  'GapUtility__DodgeForwardCandidate',
  'GapUtility__DodgeLeftCandidate',
  'GapUtility__DodgeRightCandidate',
  'GapUtility__DoorLockCandidate',
  'GapUtility__DoorUnlockCandidate',
  'GapUtility__DrowningCandidate',
  'GapUtility__LiftCandidate',
  'GapUtility__LockpickCandidate',
  'GapUtility__LootInspectGroundCandidate',
  'GapUtility__LootInspectStandingCandidate',
  'GapUtility__MiningCandidate',
  'GapUtility__NeutralFallLoopCandidate',
  'GapUtility__NeutralLandToRunCandidate',
  'GapUtility__NpcFarewellCandidate',
  'GapUtility__NpcListenCandidate',
  'GapUtility__OpenWaterSurfaceCandidate',
  'GapUtility__PlaceCandidate',
  'GapUtility__RunStartCandidate',
  'GapUtility__RunStopCandidate',
  'GapUtility__ShimmyLeftCandidate',
  'GapUtility__ShimmyRightCandidate',
  'GapUtility__StairsAscendCandidate',
  'GapUtility__StairsDescendCandidate',
  'GapUtility__UnderwaterSwimCandidate',
  'GapUtility__ValveTurnCandidate',
  'GapUtility__WalkStartCandidate',
  'GapUtility__WalkStopCandidate',
  'GapUtility__WaterDiveCandidate',
  'GapUtility__WoodChopCandidate',
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function parseGlbJson(buffer) {
  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  expect(buffer.readUInt32LE(4)).toBe(2);
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) {
      return JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString('utf8').trim());
    }
    offset += 8 + length;
  }
  throw new Error('GLB did not contain a JSON chunk');
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const sourceBytes = readFileSync(sourcePath);
const outputBytes = readFileSync(outputPath);
const gltf = parseGlbJson(outputBytes);

describe('issue #487 Human utility gap candidates', () => {
  it('keeps the immutable 400-clip source receipt intact', () => {
    expect(sha256(sourceBytes)).toBe(expectedSourceHash);
    expect(report.sourceLibrary).toMatchObject({
      bytes: sourceBytes.length,
      sha256: expectedSourceHash,
      clipCount: 400,
      boneCount: 65,
      rootBones: ['mixamorig:Hips'],
    });
  });

  it('records every assigned current requirement and source-derived recipe', () => {
    expect(report.coveredRequirements).toEqual(expectedRequirements);
    expect(report.clipCount).toBe(31);
    expect(report.clips.map((clip) => clip.clipName).sort()).toEqual(expectedClips);
    expect(new Set(report.clips.map((clip) => clip.generatedPoseSampleSha256)).size).toBe(31);
    for (const clip of report.clips) {
      expect(clip.candidateStatus).toBe('SOURCE_DERIVED_VISUAL_REVIEW_REQUIRED');
      expect(clip.requirements.length).toBeGreaterThan(0);
      expect(clip.semanticRowIds).toEqual(clip.requirements);
      expect(clip.displayLabel.length).toBeGreaterThan(3);
      expect(clip.derivedActionName).toBe(clip.clipName);
      expect(['LOOP', 'ONE_SHOT']).toContain(clip.playbackIntent);
      expect(clip.recommendedPreview.durationSeconds).toBeGreaterThanOrEqual(3);
      expect(clip.recommendedPreview.cameraFraming).toContain('view');
      expect(clip.sourceActions.length).toBeGreaterThan(0);
      expect(clip.sourceActionNames).toEqual(clip.sourceActions.map((source) => source.clipName));
      expect(clip.transform.operation.length).toBeGreaterThan(20);
      expect(clip.generatedPoseSampleSha256).toMatch(/^[A-F0-9]{64}$/);
      for (const source of clip.sourceActions) {
        expect(source.clipName.length).toBeGreaterThan(0);
        expect(source.poseSampleSha256).toMatch(/^[A-F0-9]{64}$/);
      }
    }
  });

  it('matches the generated GLB and builder hashes', () => {
    expect(report.sourceDerivedOnly).toBe(true);
    expect(report.visualReviewStatus).toBe('REQUIRED');
    expect(report.productionApproval).toBe(false);
    expect(report.blenderVersion).toBe('5.2.1 LTS');
    expect(report.scriptSha256).toBe(sha256(readFileSync(scriptPath)));
    expect(report.output).toMatchObject({ bytes: outputBytes.length, sha256: sha256(outputBytes) });
  });

  it('contains exactly the named candidate animations', () => {
    expect(gltf.animations.map((animation) => animation.name).sort()).toEqual(expectedClips);
    expect(gltf.animations).toHaveLength(31);
  });

  it('re-imported on the canonical 65-bone hierarchy', () => {
    expect(report.reimportValidation).toMatchObject({
      passed: true,
      armatureCount: 1,
      boneCount: 65,
      rootBones: ['mixamorig:Hips'],
      clipCount: 31,
      clipNames: expectedClips,
    });
    expect(gltf.skins).toHaveLength(1);
    expect(gltf.skins[0].joints).toHaveLength(65);
    const jointNames = gltf.skins[0].joints.map((index) => gltf.nodes[index].name);
    expect(jointNames).toContain('mixamorig:Hips');
  });
});
