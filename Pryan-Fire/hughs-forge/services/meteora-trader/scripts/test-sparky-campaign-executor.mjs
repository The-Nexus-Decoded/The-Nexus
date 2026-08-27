#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CAMPAIGN,
  campaignMilestones,
  campaignReturnSol,
  exitProfitSweepLamports,
  feeSweepLamports,
  rangeState,
  targetValueSol,
} from './sparky-campaign-executor.mjs';

assert.equal(targetValueSol(CAMPAIGN.entryBasisSol, 40), CAMPAIGN.targetValueSol);

const fivePercentDown = {
  positionsExecutableValueSol: 95,
  cumulativeNetFeesEarnedSol: 0,
  executionCostsSol: 0,
};
assert.equal(campaignReturnSol(fivePercentDown), 95);
assert.equal(campaignMilestones(fivePercentDown, {
  entryBasisSol: 100,
  targetValueSol: 140,
}).breakEvenReached, false);

const recoveredWithSweptFees = {
  positionsExecutableValueSol: 95,
  cumulativeNetFeesEarnedSol: 45,
  executionCostsSol: 0,
};
const recovered = campaignMilestones(recoveredWithSweptFees, {
  entryBasisSol: 100,
  targetValueSol: 140,
});
assert.equal(recovered.breakEvenReached, true);
assert.equal(recovered.targetReached, true);
assert.ok(Math.abs(recovered.profitPct - 40) < 1e-9);

assert.equal(feeSweepLamports(2_000_000n, false), 0n);
assert.equal(feeSweepLamports(2_000_000n, true), 1_990_000n);
assert.equal(exitProfitSweepLamports(14_000_000_000n, 10), 3_999_990_000n);

assert.equal(rangeState(-631, -630, -409), 'out_below');
assert.equal(rangeState(-630, -630, -409), 'lower_edge');
assert.equal(rangeState(-629, -630, -409), 'lower_edge');
assert.equal(rangeState(-500, -630, -409), 'in_range');
assert.equal(rangeState(-409, -630, -409), 'upper_edge');
assert.equal(rangeState(-408, -630, -409), 'out_above');

process.stdout.write('sparky campaign executor policy tests passed\n');
