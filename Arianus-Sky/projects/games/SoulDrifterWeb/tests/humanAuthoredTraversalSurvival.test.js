import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = `${projectRoot}public/assets/3d/animations/human-foundation-pilot`;
const restPath = `${projectRoot}public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb`;
const outputPath = `${assetRoot}/human-foundation-pilot-authored-traversal-survival.glb`;
const reportPath = `${assetRoot}/human-foundation-pilot-authored-traversal-survival-report.json`;
const scriptPath = `${projectRoot}scripts/build-human-authored-traversal-survival.py`;
const referencePath = `${projectRoot}docs/HUMAN_AUTHORED_TRAVERSAL_SURVIVAL_REFERENCE_PACKET.md`;

const expectedRestHash = 'B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81';
const expectedClips = [
  'AuthoredLocomotion__DodgeBackward',
  'AuthoredLocomotion__DodgeForward',
  'AuthoredLocomotion__DodgeLeft',
  'AuthoredLocomotion__DodgeRight',
  'AuthoredLocomotion__RunStart',
  'AuthoredLocomotion__RunStop',
  'AuthoredLocomotion__WalkStart',
  'AuthoredLocomotion__WalkStop',
  'AuthoredNpc__Farewell',
  'AuthoredNpc__Listen',
  'AuthoredSurvival__Drowning',
  'AuthoredSurvival__OpenWaterSurface',
  'AuthoredSurvival__UnderwaterSwim',
  'AuthoredSurvival__WaterDive',
  'AuthoredTraversal__NeutralFallLoop',
  'AuthoredTraversal__NeutralLandToRun',
  'AuthoredTraversal__ShimmyLeft',
  'AuthoredTraversal__ShimmyRight',
  'AuthoredTraversal__StairsAscend',
  'AuthoredTraversal__StairsDescend',
];
const expectedRequirements = [
  'death.drowning',
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
const restBytes = readFileSync(restPath);
const outputBytes = readFileSync(outputPath);
const gltf = parseGlbJson(outputBytes);

describe('issue #487 original authored traversal and survival pack', () => {
  it('starts from the immutable zero-action accepted rest rig', () => {
    expect(sha256(restBytes)).toBe(expectedRestHash);
    expect(report.sourceRestRig).toMatchObject({
      bytes: restBytes.length,
      sha256: expectedRestHash,
      importedActionCount: 0,
      boneCount: 65,
      rootBones: ['mixamorig:Hips'],
    });
  });

  it('covers exactly the twenty assigned master-list gaps', () => {
    expect(report.creationMethod).toBe('ORIGINAL_KEYFRAMED_MOTION');
    expect(report.sourceReuse).toBe(false);
    expect(report.clipCount).toBe(20);
    expect(report.coveredRequirements).toEqual(expectedRequirements);
    expect(report.clips.map((clip) => clip.clipName).sort()).toEqual(expectedClips);
    expect(new Set(report.clips.map((clip) => clip.preExportPoseSha256)).size).toBe(20);
  });

  it('forbids every source-derived or cross-action shortcut', () => {
    for (const clip of report.clips) {
      expect(clip.status).toBe('UNREVIEWED_ORIGINAL_BLENDER_AUTHORING');
      expect(clip.authoringMethod).toBe('ORIGINAL_BLENDER_KEYFRAMES_WITH_TEMPORARY_HAND_IK');
      expect(clip.sourceActionNames).toEqual([]);
      expect(clip.sourceReuse).toBe(false);
      expect(Object.values(clip.forbiddenOperations)).toEqual([
        false,
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(clip.referenceIds.length).toBeGreaterThan(0);
      expect(clip.mechanics.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('matches the generated GLB, builder, and reference packet receipts', () => {
    expect(report.output).toMatchObject({
      bytes: outputBytes.length,
      sha256: sha256(outputBytes),
      actionCount: 20,
    });
    expect(report.generator.sha256).toBe(sha256(readFileSync(scriptPath)));
    const referenceBytes = readFileSync(referencePath);
    const referencePacket = referenceBytes.toString('utf8');
    expect(report.referencePacketReceipt).toMatchObject({
      path: 'docs/HUMAN_AUTHORED_TRAVERSAL_SURVIVAL_REFERENCE_PACKET.md',
      bytes: referenceBytes.length,
      sha256: sha256(referenceBytes),
    });
    expect(report.remainingGates).not.toContain('REFERENCE_PACKET_COMMITTED');
    for (const clip of report.clips) {
      for (const referenceId of clip.referenceIds) {
        expect(referencePacket).toContain(`\`${referenceId}\``);
      }
    }
  });

  it('fresh-reimports every action with stable bone trajectories', () => {
    expect(report.freshImportValidation).toMatchObject({
      passed: true,
      armatureCount: 1,
      boneCount: 65,
      rootBones: ['mixamorig:Hips'],
      clipCount: 20,
      clipNames: expectedClips,
    });
    for (const clip of report.clips) {
      expect(clip.freshImportTrajectoryValidation).toMatchObject({ passed: true });
    }
  });

  it('passes fresh textured-rig contact, root, grounding, loop, and speed proof', () => {
    expect(report.freshRuntimeValidation).toMatchObject({
      passed: true,
      acceptedTexturedRestRigSha256: expectedRestHash,
      preciseEvaluatedSkinnedMeshBounds: true,
      validatedClipCount: 20,
      validatedClipNames: expectedClips,
    });
    expect(report.remainingGates).not.toContain('CONTACT_ROOT_GROUNDING_LOOP_SPEED_VALIDATION');
    for (const clip of report.clips) {
      expect(clip.groundingBake.method).toBe('PRE_EXPORT_PRECISE_SKINNED_MESH_CONTACT_BAKE');
      expect(clip.freshRuntimeValidation).toMatchObject({
        passed: true,
        freshAcceptedTexturedRestRig: true,
        root: { passed: true },
        speed: { passed: true },
        contactAndGrounding: { passed: true, preciseEvaluatedSkinnedMesh: true },
        loop: { passed: true },
      });
    }
  });

  it('contains exactly the twenty named actions on the canonical skeleton', () => {
    expect(gltf.animations.map((animation) => animation.name).sort()).toEqual(expectedClips);
    expect(gltf.animations).toHaveLength(20);
    expect(gltf.skins).toHaveLength(1);
    expect(gltf.skins[0].joints).toHaveLength(65);
    const jointNames = gltf.skins[0].joints.map((index) => gltf.nodes[index].name);
    expect(jointNames).toContain('mixamorig:Hips');
  });
});
