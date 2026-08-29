import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = `${projectRoot}public/assets/3d/animations/human-foundation-pilot`;
const restPath = `${projectRoot}public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb`;
const legacyOutputPath = `${assetRoot}/human-foundation-pilot-authored-traversal-survival.glb`;
const legacyReportPath = `${assetRoot}/human-foundation-pilot-authored-traversal-survival-report.json`;
const scriptPath = `${projectRoot}scripts/build-human-authored-traversal-survival.py`;
const referencePath = `${projectRoot}docs/HUMAN_AUTHORED_TRAVERSAL_SURVIVAL_REFERENCE_PACKET.md`;

const expectedRestHash = 'B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81';
const quarantineRoot = 'H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/traversal';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

const builder = readFileSync(scriptPath, 'utf8');
const referencePacket = readFileSync(referencePath, 'utf8');

describe('issue #487 traversal candidate quarantine contract', () => {
  it('keeps the immutable accepted zero-action rest rig as the only source', () => {
    expect(sha256(readFileSync(restPath))).toBe(expectedRestHash);
    expect(builder).toContain(`EXPECTED_REST_SHA256 = "${expectedRestHash}"`);
    expect(builder).toContain('if bpy.data.actions:');
    expect(builder).toContain('raise RuntimeError(f"Rest GLB unexpectedly contained actions: {imported_action_names}")');
  });

  it('does not expose the rejected multi-action pack to the runtime', () => {
    expect(existsSync(legacyOutputPath)).toBe(false);
    expect(existsSync(legacyReportPath)).toBe(false);
  });

  it('emits exactly one candidate into external quarantine per run', () => {
    expect(builder).toContain(quarantineRoot);
    expect(builder).toContain('parser.add_argument("--candidate-id", required=True)');
    expect(builder).toContain('parser.add_argument("--only", action="append", default=[])');
    expect(builder).toContain('Quarantined candidate authoring requires exactly one --only action');
    expect(builder).toContain('output_glb = candidate_dir / "candidate.glb"');
    expect(builder).toContain('report_path = candidate_dir / "technical-report.json"');
    expect(builder).not.toContain('parser.add_argument("--output-glb"');
  });

  it('records original authoring and forbids source-derived shortcuts', () => {
    expect(builder).toContain('"creationMethod": "ORIGINAL_KEYFRAMED_MOTION"');
    expect(builder).toContain('"sourceReuse": False');
    for (const operation of [
      'sourceClipSampling',
      'reversal',
      'splicing',
      'overlay',
      'poseCopying',
      'relabeling',
    ]) {
      expect(builder).toContain(`"${operation}": False`);
    }
  });

  it('requires real-person references and independent review before expansion', () => {
    expect(referencePacket).toContain('## Real-person reference footage');
    expect(referencePacket).toContain('https://');
    expect(referencePacket).toContain('independent continuous-playback review');
    expect(referencePacket).toMatch(/The other nineteen\s+actions must not be expanded until the independent coordinator passes this\s+exemplar\./);
    expect(referencePacket).toContain('It must not be written to `public/assets`');
  });
});
