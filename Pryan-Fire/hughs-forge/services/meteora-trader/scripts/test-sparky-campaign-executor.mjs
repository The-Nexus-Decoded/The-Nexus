#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CAMPAIGN,
  boundedSlippageBps,
  campaignMilestones,
  campaignReturnSol,
  exitProfitSweepLamports,
  feeSweepLamports,
  nextLiquiditySlippagePct,
  rangeState,
  retargetGuardDecision,
  targetValueSol,
} from './sparky-campaign-executor.mjs';
import {
  terminalCoverageProof,
  trancheTargetSol,
} from './terminal-coverage.mjs';

assert.equal(targetValueSol(CAMPAIGN.entryBasisSol, 40), CAMPAIGN.targetValueSol);
assert.equal(trancheTargetSol([
  { capitalSol: CAMPAIGN.entryBasisSol, profitPct: 40 },
  { capitalSol: 1, profitPct: 40 },
]), 4.577488783);

const insufficientCoverage = terminalCoverageProof({
  wideTerminalPrincipalSol: 1.8903620326203512,
  spotTerminalPrincipalSol: 0.4325988576694562,
  requiredTargetSol: CAMPAIGN.targetValueSol,
  executionCostAllowanceSol: 0.005,
});
assert.equal(insufficientCoverage.passes, false);
assert.equal(insufficientCoverage.projectedFeesCounted, false);
const sufficientCoverage = terminalCoverageProof({
  wideTerminalPrincipalSol: 2.75,
  spotTerminalPrincipalSol: 0.4325988576694562,
  requiredTargetSol: CAMPAIGN.targetValueSol,
  executionCostAllowanceSol: 0.005,
});
assert.equal(sufficientCoverage.passes, true);

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
assert.equal(boundedSlippageBps(200), 200);
assert.throws(() => boundedSlippageBps(301), /slippage_bps_outside_safety_bounds/);
assert.throws(() => boundedSlippageBps(49), /slippage_bps_outside_safety_bounds/);
assert.equal(nextLiquiditySlippagePct(0.5), 1);
assert.equal(nextLiquiditySlippagePct(1), 2);
assert.equal(nextLiquiditySlippagePct(2), 3);
assert.equal(nextLiquiditySlippagePct(3), 5);
assert.equal(nextLiquiditySlippagePct(5), null);

assert.equal(rangeState(-631, -630, -409), 'out_below');
assert.equal(rangeState(-630, -630, -409), 'lower_edge');
assert.equal(rangeState(-629, -630, -409), 'lower_edge');
assert.equal(rangeState(-500, -630, -409), 'in_range');
assert.equal(rangeState(-409, -630, -409), 'upper_edge');
assert.equal(rangeState(-408, -630, -409), 'out_above');

const guardNow = Date.parse('2026-08-27T08:00:00.000Z');
const tightHysteresis = retargetGuardDecision({
  role: 'tight',
  range: 'out_above',
  activeBinId: -576,
  lowerBinId: -598,
  upperBinId: -577,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow,
});
assert.equal(tightHysteresis.shouldRetarget, false);
assert.equal(tightHysteresis.blockedReason, 'outside_distance_hysteresis');

const tightFirst = retargetGuardDecision({
  role: 'tight',
  range: 'out_above',
  activeBinId: -574,
  lowerBinId: -598,
  upperBinId: -577,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow,
});
const tightSecond = retargetGuardDecision({
  role: 'tight',
  range: 'out_above',
  activeBinId: -574,
  lowerBinId: -598,
  upperBinId: -577,
  previous: tightFirst,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow + 15_000,
});
const tightThird = retargetGuardDecision({
  role: 'tight',
  range: 'out_above',
  activeBinId: -574,
  lowerBinId: -598,
  upperBinId: -577,
  previous: tightSecond,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow + 30_000,
});
assert.equal(tightFirst.blockedReason, 'awaiting_confirmation');
assert.equal(tightSecond.blockedReason, 'awaiting_confirmation');
assert.equal(tightThird.shouldRetarget, true);

const cappedRetargets = Array.from({ length: 6 }, (_, index) => ({
  role: 'tight',
  priorState: 'out_above',
  at: new Date(guardNow - index * 60_000).toISOString(),
}));
const tightCapped = retargetGuardDecision({
  role: 'tight',
  range: 'out_above',
  activeBinId: -574,
  lowerBinId: -598,
  upperBinId: -577,
  previous: { range: 'out_above', consecutiveOutOfRange: 2 },
  retargets: cappedRetargets,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow,
});
assert.equal(tightCapped.shouldRetarget, false);
assert.equal(tightCapped.blockedReason, 'hourly_retarget_cap');

const recoveredInRange = retargetGuardDecision({
  role: 'tight',
  range: 'in_range',
  activeBinId: -585,
  lowerBinId: -598,
  upperBinId: -577,
  previous: tightSecond,
  positionStartedAt: '2026-08-27T07:58:00.000Z',
  nowMs: guardNow,
});
assert.equal(recoveredInRange.consecutiveOutOfRange, 0);
assert.equal(recoveredInRange.blockedReason, 'position_not_out_of_range');

process.stdout.write('sparky campaign executor policy tests passed\n');
