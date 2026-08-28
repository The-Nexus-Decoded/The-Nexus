#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CAMPAIGN,
  boundedSlippageBps,
  campaignMilestones,
  campaignReturnSol,
  classifyCloseNativeDelta,
  deployableCampaignTokenRaw,
  exitProfitSweepLamports,
  feeSweepLamports,
  isDeferredRentSimulationError,
  managedPositionSetDecision,
  nextLiquiditySlippagePct,
  rangeState,
  retargetGuardDecision,
  singlePositionRangeDisposition,
  terminalCoverageDisposition,
  targetValueSol,
} from './sparky-campaign-executor.mjs';
import {
  bidAskTerminalPrincipalSol,
  solveWideUpperBin,
  terminalCoverageProof,
  trancheTargetSol,
} from './terminal-coverage.mjs';

assert.equal(
  targetValueSol(CAMPAIGN.entryBasisSol, CAMPAIGN.targetProfitPct),
  CAMPAIGN.targetValueSol,
);
assert.equal(trancheTargetSol([
  { capitalSol: CAMPAIGN.entryBasisSol, profitPct: CAMPAIGN.targetProfitPct },
  { capitalSol: 1, profitPct: CAMPAIGN.targetProfitPct },
]), CAMPAIGN.targetValueSol + (1 + CAMPAIGN.targetProfitPct / 100));

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

const exactWidePlan = solveWideUpperBin({
  tokenAmount: 100,
  spotTerminalPrincipalSol: 0.4,
  requiredTargetSol: 3.2,
  executionCostAllowanceSol: 0.005,
  activeBinId: -600,
  activePrice: 0.02,
  binStep: 100,
});
assert.ok(exactWidePlan);
assert.equal(exactWidePlan.projectedFeesCounted, false);
assert.equal(exactWidePlan.passes, true);
if (exactWidePlan.upperBinId > exactWidePlan.lowerBinId) {
  const priorBinWideValue = bidAskTerminalPrincipalSol({
    tokenAmount: 100,
    existingSol: 0,
    activeBinId: exactWidePlan.lowerBinId,
    upperBinId: exactWidePlan.upperBinId - 1,
    activePrice: 0.02,
    binStep: 100,
  });
  assert.equal(terminalCoverageProof({
    wideTerminalPrincipalSol: priorBinWideValue,
    spotTerminalPrincipalSol: 0.4,
    requiredTargetSol: 3.2,
    executionCostAllowanceSol: 0.005,
  }).passes, false, 'solver must select the first passing upper bin');
}
assert.equal(solveWideUpperBin({
  tokenAmount: 1,
  spotTerminalPrincipalSol: 0,
  requiredTargetSol: 1_000_000,
  activeBinId: -600,
  activePrice: 0.02,
  binStep: 100,
  maximumBinCount: 5,
}), null, 'an unprovable plan must fail closed instead of using a fallback');

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
assert.equal(deployableCampaignTokenRaw(2_703_525_237n, 0n), 2_703_525_237n);
assert.equal(deployableCampaignTokenRaw(2_703_525_237n, 3_000_000_000n), 0n);
assert.equal(isDeferredRentSimulationError('{"InsufficientFundsForRent":{"account_index":0}}'), true);
assert.equal(isDeferredRentSimulationError('insufficient lamports for rent'), true);
assert.equal(isDeferredRentSimulationError('custom program error: 0x1'), true);
assert.equal(isDeferredRentSimulationError('Blockhash not found'), false);

const rentExcludedClose = classifyCloseNativeDelta(
  912_000_000n,
  10_000_000n,
  2_000_000n,
  900_000_000n,
);
assert.deepEqual(rentExcludedClose, {
  grossReceivedLamports: 912_000_000n,
  excludedRentLamports: 900_000_000n,
  economicReceivedLamports: 12_000_000n,
  principalLamports: 10_000_000n,
  realizedFeeLamports: 2_000_000n,
  unclassifiedLamports: 0n,
});
const closeCostsReduceFeesFirst = classifyCloseNativeDelta(
  911_500_000n,
  10_000_000n,
  2_000_000n,
  900_000_000n,
);
assert.equal(closeCostsReduceFeesFirst.principalLamports, 10_000_000n);
assert.equal(closeCostsReduceFeesFirst.realizedFeeLamports, 1_500_000n);
assert.equal(closeCostsReduceFeesFirst.excludedRentLamports, 900_000_000n);

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

assert.deepEqual(singlePositionRangeDisposition(tightThird), {
  action: 'retarget_single_spot',
  actionBlocked: false,
  reason: null,
});
assert.deepEqual(singlePositionRangeDisposition({ ...tightThird, range: 'out_below' }), {
  action: 'migrate_to_dual_recovery',
  actionBlocked: false,
  reason: null,
});
assert.deepEqual(singlePositionRangeDisposition(tightFirst), {
  action: 'hold',
  actionBlocked: false,
  reason: 'awaiting_confirmation',
});

const exactManagedSet = managedPositionSetDecision(
  { wide: { address: 'wide-1' }, tight: { address: 'tight-1' } },
  ['tight-1', 'wide-1'],
);
assert.equal(exactManagedSet.exactMatch, true);
assert.equal(exactManagedSet.action, 'continue');

const manualTakeoverSet = managedPositionSetDecision(
  { wide: { address: 'wide-1' }, tight: { address: 'tight-1' } },
  ['manual-1'],
);
assert.equal(manualTakeoverSet.exactMatch, false);
assert.deepEqual(manualTakeoverSet.missing, ['tight-1', 'wide-1']);
assert.deepEqual(manualTakeoverSet.unexpected, ['manual-1']);
assert.equal(manualTakeoverSet.action, 'pause_for_manual_takeover_reconciliation');

assert.deepEqual(terminalCoverageDisposition({ passes: true }), {
  action: 'continue',
  actionBlocked: false,
  reason: null,
});
assert.deepEqual(terminalCoverageDisposition({ passes: false }), {
  action: 'pause_for_explicit_replan',
  actionBlocked: true,
  reason: 'terminal_coverage_proof_failed',
});

process.stdout.write('sparky campaign executor policy tests passed\n');
