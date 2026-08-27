#!/usr/bin/env node
/**
 * Read-only two-position recovery planner for token-heavy Meteora DLMM positions.
 *
 * The recovery ladder uses an upward BidAsk distribution. The fee position uses
 * a tighter upward Spot distribution so materially more liquidity sits near the
 * active bin. Future fees are reported as upside and never used to prove that
 * the requested recovery value is achievable.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const dependencyPackage = process.env.METEORA_NODE_MODULES_PACKAGE_JSON;
const require = createRequire(
  dependencyPackage ? pathToFileURL(dependencyPackage) : import.meta.url,
);
const dlmmModule = require('@meteora-ag/dlmm');
const DLMM = dlmmModule.default || dlmmModule;
const { calculateBidAskDistribution, calculateSpotDistribution } = dlmmModule;
const { Connection, PublicKey } = require('@solana/web3.js');

const DEFAULTS = Object.freeze({
  minimumFeeSleevePct: 5,
  maximumFeeSleevePct: 40,
  feeSleeveStepPct: 1,
  protectedReservePct: 0,
  feeSleeveUpsidePct: 35,
  maxRangePriceMultiple: 12,
  maxPlanAgeSeconds: 60,
  feeEvaluationHorizonHours: 6,
  expectedTimeInRangePct: 60,
  estimatedFeeCycleCostSol: 0.0005,
  minimumNetFeeSol: 0.003,
  minimumFeeToCostMultiple: 3,
  maximumFeeOpportunityCostPctOfRequiredExit: 5,
});

function assertFinite(name, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`invalid_${name}`);
  return number;
}

function clampPercent(name, value) {
  const number = assertFinite(name, value);
  if (number < 0 || number > 100) throw new Error(`${name}_out_of_range`);
  return number;
}

function rawToNumber(raw, decimals) {
  return Number(raw.toString()) / (10 ** decimals);
}

function priceAtBin(activePrice, activeBinId, binId, binStep) {
  return activePrice * ((1 + (binStep / 10_000)) ** (binId - activeBinId));
}

function binForPriceMultiple(activeBinId, binStep, multiple) {
  if (multiple <= 1) return activeBinId;
  return activeBinId + Math.ceil(Math.log(multiple) / Math.log(1 + (binStep / 10_000)));
}

function distributionWeights(distribution, field) {
  const raw = distribution.map((row) => ({
    binId: Number(row.binId),
    weight: Number(row[field].toString()),
  }));
  const total = raw.reduce((sum, row) => sum + row.weight, 0);
  if (total <= 0) throw new Error(`empty_${field}_distribution`);
  return raw.map((row) => ({ binId: row.binId, weight: row.weight / total }));
}

function oneSidedXWeights(strategy, activeBinId, upperBinId) {
  const binIds = Array.from(
    { length: upperBinId - activeBinId + 1 },
    (_, index) => activeBinId + index,
  );
  const distribution = strategy === 'bid_ask'
    ? calculateBidAskDistribution(activeBinId, binIds)
    : calculateSpotDistribution(activeBinId, binIds);
  return distributionWeights(distribution, 'xAmountBpsOfTotal');
}

function modeledOneSidedValueSol({
  tokenAmount,
  weights,
  targetPrice,
  activePrice,
  activeBinId,
  binStep,
}) {
  return weights.reduce((total, row) => {
    const binPrice = priceAtBin(activePrice, activeBinId, row.binId, binStep);
    return total + (tokenAmount * row.weight * Math.min(targetPrice, binPrice));
  }, 0);
}

function solveTargetPrice(valueAtPrice, requiredValue, minimumPrice, maximumPrice) {
  if (valueAtPrice(minimumPrice) >= requiredValue) return minimumPrice;
  if (valueAtPrice(maximumPrice) < requiredValue) return null;
  let low = minimumPrice;
  let high = maximumPrice;
  for (let index = 0; index < 100; index += 1) {
    const middle = (low + high) / 2;
    if (valueAtPrice(middle) >= requiredValue) high = middle;
    else low = middle;
  }
  return high;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index];
}

function buildAllocationCandidate(input, feeSleevePct) {
  const {
    activeBinId,
    binStep,
    activePrice,
    tokenAmount,
    existingSol,
    requiredExitSol,
    reservePct,
    feeUpsidePct,
    maxMultiple,
  } = input;
  const ladderPct = 100 - feeSleevePct - reservePct;
  if (ladderPct <= 0) return null;
  const ladderTokens = tokenAmount * ladderPct / 100;
  const feeTokens = tokenAmount * feeSleevePct / 100;
  const reserveTokens = tokenAmount * reservePct / 100;
  const feeUpperBinId = binForPriceMultiple(activeBinId, binStep, 1 + (feeUpsidePct / 100));
  const feeWeights = oneSidedXWeights('spot', activeBinId, feeUpperBinId);
  const maximumUpperBinId = binForPriceMultiple(activeBinId, binStep, maxMultiple);

  let selected = null;
  for (let upperBinId = feeUpperBinId; upperBinId <= maximumUpperBinId; upperBinId += 1) {
    const ladderWeights = oneSidedXWeights('bid_ask', activeBinId, upperBinId);
    const upperPrice = priceAtBin(activePrice, activeBinId, upperBinId, binStep);
    const valueAtPrice = (targetPrice) => existingSol
      + modeledOneSidedValueSol({
        tokenAmount: ladderTokens,
        weights: ladderWeights,
        targetPrice,
        activePrice,
        activeBinId,
        binStep,
      })
      + modeledOneSidedValueSol({
        tokenAmount: feeTokens,
        weights: feeWeights,
        targetPrice,
        activePrice,
        activeBinId,
        binStep,
      })
      + (reserveTokens * targetPrice);
    const targetPrice = solveTargetPrice(valueAtPrice, requiredExitSol, activePrice, upperPrice);
    if (targetPrice === null) continue;
    selected = { upperBinId, upperPrice, targetPrice, valueAtPrice, ladderWeights };
    break;
  }
  if (!selected) return null;

  const activeFeeWeight = feeWeights
    .filter((row) => row.binId === activeBinId)
    .reduce((sum, row) => sum + row.weight, 0);
  const feeValueAtTarget = modeledOneSidedValueSol({
    tokenAmount: feeTokens,
    weights: feeWeights,
    targetPrice: selected.targetPrice,
    activePrice,
    activeBinId,
    binStep,
  });
  const feeHoldValueAtTarget = feeTokens * selected.targetPrice;
  const feeOpportunityCostSol = Math.max(0, feeHoldValueAtTarget - feeValueAtTarget);
  const feeOpportunityCostPctOfRequiredExit = feeOpportunityCostSol / requiredExitSol * 100;

  const solUsd = Number(input.solUsd || 0);
  const activePoolLiquiditySol = Number(input.activePoolLiquiditySol || 0);
  const conservativePoolFeeUsdPerHour = Number(input.conservativePoolFeeUsdPerHour || 0);
  const horizonHours = Number(input.feeEvaluationHorizonHours);
  const timeInRangeFraction = Number(input.expectedTimeInRangePct) / 100;
  const activeFeeValueSol = feeTokens * activePrice * activeFeeWeight;
  const activeLiquidityShare = activePoolLiquiditySol > 0
    ? activeFeeValueSol / (activePoolLiquiditySol + activeFeeValueSol)
    : 0;
  const expectedGrossFeeUsd = conservativePoolFeeUsdPerHour
    * horizonHours
    * timeInRangeFraction
    * activeLiquidityShare;
  const expectedGrossFeeSol = solUsd > 0 ? expectedGrossFeeUsd / solUsd : 0;
  const expectedNetFeeSol = expectedGrossFeeSol - Number(input.estimatedFeeCycleCostSol);
  const feeToCostMultiple = Number(input.estimatedFeeCycleCostSol) > 0
    ? expectedGrossFeeSol / Number(input.estimatedFeeCycleCostSol)
    : 0;
  const economicReasons = [];
  if (activePoolLiquiditySol <= 0 || conservativePoolFeeUsdPerHour <= 0 || solUsd <= 0) {
    economicReasons.push('live_fee_evidence_missing');
  }
  if (expectedNetFeeSol < Number(input.minimumNetFeeSol)) {
    economicReasons.push('expected_net_fees_below_minimum');
  }
  if (feeToCostMultiple < Number(input.minimumFeeToCostMultiple)) {
    economicReasons.push('fee_to_cost_multiple_below_minimum');
  }
  if (feeOpportunityCostPctOfRequiredExit
      > Number(input.maximumFeeOpportunityCostPctOfRequiredExit)) {
    economicReasons.push('tight_fee_sleeve_recovery_drag_too_large');
  }

  return {
    feeSleevePct,
    ladderPct,
    reservePct,
    ladderTokens,
    feeTokens,
    reserveTokens,
    feeUpperBinId,
    feeWeights,
    selected,
    activeFeeWeight,
    feeEconomics: {
      activeFeeValueSol,
      activeLiquiditySharePct: activeLiquidityShare * 100,
      conservativePoolFeeUsdPerHour,
      evaluationHorizonHours: horizonHours,
      expectedTimeInRangePct: Number(input.expectedTimeInRangePct),
      expectedGrossFeeUsd,
      expectedGrossFeeSol,
      estimatedFeeCycleCostSol: Number(input.estimatedFeeCycleCostSol),
      expectedNetFeeSol,
      feeToCostMultiple,
      feeOpportunityCostSol,
      feeOpportunityCostPctOfRequiredExit,
      eligible: economicReasons.length === 0,
      reasons: economicReasons,
    },
  };
}

export function buildTwoPositionPlan(input) {
  const activeBinId = Math.trunc(assertFinite('active_bin_id', input.activeBinId));
  const binStep = assertFinite('bin_step', input.binStep);
  const activePrice = assertFinite('active_price', input.activePrice);
  const tokenAmount = assertFinite('token_amount', input.tokenAmount);
  const existingSol = assertFinite('existing_sol', input.existingSol || 0);
  const requiredExitSol = assertFinite('required_exit_sol', input.requiredExitSol);
  const reservePct = clampPercent(
    'protected_reserve_pct',
    input.protectedReservePct ?? DEFAULTS.protectedReservePct,
  );
  if (activePrice <= 0 || tokenAmount <= 0 || requiredExitSol <= 0 || binStep <= 0) {
    throw new Error('positive_price_inventory_basis_and_bin_step_required');
  }

  const feeUpsidePct = assertFinite(
    'fee_sleeve_upside_pct',
    input.feeSleeveUpsidePct ?? DEFAULTS.feeSleeveUpsidePct,
  );
  if (feeUpsidePct <= 0) throw new Error('fee_sleeve_upside_pct_must_be_positive');
  const maxMultiple = assertFinite(
    'max_range_price_multiple',
    input.maxRangePriceMultiple ?? DEFAULTS.maxRangePriceMultiple,
  );
  if (maxMultiple <= 1) throw new Error('max_range_price_multiple_must_exceed_one');
  const normalized = {
    ...input,
    activeBinId,
    binStep,
    activePrice,
    tokenAmount,
    existingSol,
    requiredExitSol,
    reservePct,
    feeUpsidePct,
    maxMultiple,
    feeEvaluationHorizonHours: assertFinite(
      'fee_evaluation_horizon_hours',
      input.feeEvaluationHorizonHours ?? DEFAULTS.feeEvaluationHorizonHours,
    ),
    expectedTimeInRangePct: clampPercent(
      'expected_time_in_range_pct',
      input.expectedTimeInRangePct ?? DEFAULTS.expectedTimeInRangePct,
    ),
    estimatedFeeCycleCostSol: assertFinite(
      'estimated_fee_cycle_cost_sol',
      input.estimatedFeeCycleCostSol ?? DEFAULTS.estimatedFeeCycleCostSol,
    ),
    minimumNetFeeSol: assertFinite(
      'minimum_net_fee_sol', input.minimumNetFeeSol ?? DEFAULTS.minimumNetFeeSol,
    ),
    minimumFeeToCostMultiple: assertFinite(
      'minimum_fee_to_cost_multiple',
      input.minimumFeeToCostMultiple ?? DEFAULTS.minimumFeeToCostMultiple,
    ),
    maximumFeeOpportunityCostPctOfRequiredExit: assertFinite(
      'maximum_fee_opportunity_cost_pct_of_required_exit',
      input.maximumFeeOpportunityCostPctOfRequiredExit
        ?? DEFAULTS.maximumFeeOpportunityCostPctOfRequiredExit,
    ),
  };
  const forcedFeePct = input.feeSleevePct === undefined
    ? null
    : clampPercent('fee_sleeve_pct', input.feeSleevePct);
  const minFeePct = forcedFeePct ?? clampPercent(
    'minimum_fee_sleeve_pct', input.minimumFeeSleevePct ?? DEFAULTS.minimumFeeSleevePct,
  );
  const maxFeePct = forcedFeePct ?? clampPercent(
    'maximum_fee_sleeve_pct', input.maximumFeeSleevePct ?? DEFAULTS.maximumFeeSleevePct,
  );
  const feeStepPct = assertFinite(
    'fee_sleeve_step_pct', input.feeSleeveStepPct ?? DEFAULTS.feeSleeveStepPct,
  );
  if (feeStepPct <= 0 || minFeePct > maxFeePct) throw new Error('invalid_fee_sleeve_search_bounds');
  const candidates = [];
  for (let feePct = minFeePct; feePct <= maxFeePct + 1e-9; feePct += feeStepPct) {
    const candidate = buildAllocationCandidate(normalized, Number(feePct.toFixed(6)));
    if (candidate) candidates.push(candidate);
  }
  const selectedCandidate = candidates.find((candidate) => candidate.feeEconomics.eligible);
  if (!selectedCandidate) {
    return {
      feasible: false,
      reason: candidates.length
        ? 'no_fee_sleeve_satisfies_fee_and_recovery_constraints'
        : 'required_exit_not_reachable_inside_enrollment_range_limit',
      scope: input.scope,
      requiredExitSol,
      maxRangePriceMultiple: maxMultiple,
      futureFeesCountedTowardTarget: false,
      evaluatedFeeSleeves: candidates.map((candidate) => ({
        feeSleevePct: candidate.feeSleevePct,
        ...candidate.feeEconomics,
      })),
    };
  }

  const {
    feeSleevePct,
    ladderPct,
    ladderTokens,
    feeTokens,
    reserveTokens,
    feeUpperBinId,
    feeWeights,
    selected,
    feeEconomics,
  } = selectedCandidate;

  const currentValue = selected.valueAtPrice(activePrice);
  const targetValue = selected.valueAtPrice(selected.targetPrice);
  const feeUpperPrice = priceAtBin(activePrice, activeBinId, feeUpperBinId, binStep);
  const activeLadderWeightPct = selected.ladderWeights
    .filter((row) => row.binId === activeBinId)
    .reduce((sum, row) => sum + row.weight, 0) * 100;
  const activeFeeWeightPct = feeWeights
    .filter((row) => row.binId === activeBinId)
    .reduce((sum, row) => sum + row.weight, 0) * 100;

  return {
    feasible: true,
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    strategy: 'bid_ask_upward_two_position',
    requiredExitSol,
    futureFeesCountedTowardTarget: false,
    allocationMethod: forcedFeePct === null
      ? 'minimum_economically_viable_fee_sleeve_under_recovery_drag_cap'
      : 'operator_forced_fee_sleeve_validated_against_live_economics',
    marketEvidence: input.marketEvidence,
    allocations: {
      recoveryLadderPct: ladderPct,
      feePositionPct: feeSleevePct,
      protectedReservePct: reservePct,
      recoveryLadderTokens: ladderTokens,
      feePositionTokens: feeTokens,
      protectedReserveTokens: reserveTokens,
      existingSol,
    },
    recoveryPosition: {
      strategy: 'bid_ask',
      minBinId: activeBinId,
      maxBinId: selected.upperBinId,
      minPrice: activePrice,
      maxPrice: selected.upperPrice,
      priceMultiple: selected.upperPrice / activePrice,
      activeBinInventoryWeightPct: activeLadderWeightPct,
    },
    feePosition: {
      strategy: 'spot',
      rationale: 'Spot keeps materially more inventory near the active bin than BidAsk.',
      minBinId: activeBinId,
      maxBinId: feeUpperBinId,
      minPrice: activePrice,
      maxPrice: feeUpperPrice,
      priceMultiple: feeUpperPrice / activePrice,
      activeBinInventoryWeightPct: activeFeeWeightPct,
      economics: feeEconomics,
    },
    modeledOutcome: {
      currentValueSol: currentValue,
      targetPrice: selected.targetPrice,
      targetPriceMultiple: selected.targetPrice / activePrice,
      valueAtTargetSol: targetValue,
      valueAtRangeTopSol: selected.valueAtPrice(selected.upperPrice),
    },
    evaluatedFeeSleeves: candidates.map((candidate) => ({
      feeSleevePct: candidate.feeSleevePct,
      eligible: candidate.feeEconomics.eligible,
      reasons: candidate.feeEconomics.reasons,
      expectedNetFeeSol: candidate.feeEconomics.expectedNetFeeSol,
      feeOpportunityCostPctOfRequiredExit:
        candidate.feeEconomics.feeOpportunityCostPctOfRequiredExit,
    })),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`meteora_data_api_http_${response.status}`);
  return response.json();
}

async function readLiveMarketEvidence(pool, poolAddress, activeBin, xDecimals, yDecimals) {
  const apiBase = 'https://dlmm.datapi.meteora.ag';
  const [poolMetrics, feeHistory, ohlcv, binsAround] = await Promise.all([
    fetchJson(`${apiBase}/pools/${poolAddress}`),
    fetchJson(`${apiBase}/pools/${poolAddress}/volume/history?timeframe=5m`),
    fetchJson(`${apiBase}/pools/${poolAddress}/ohlcv?timeframe=5m`),
    pool.getBinsAroundActiveBin(0, 0),
  ]);
  const activePoolBin = binsAround.bins.find((bin) => Number(bin.binId) === Number(activeBin.binId));
  if (!activePoolBin) throw new Error('active_pool_bin_liquidity_missing');
  const activePrice = Number(activeBin.pricePerToken);
  const activePoolLiquiditySol = rawToNumber(activePoolBin.xAmount, xDecimals) * activePrice
    + rawToNumber(activePoolBin.yAmount, yDecimals);
  const netFiveMinuteFeesUsd = (feeHistory.data || [])
    .slice(0, -1)
    .map((bucket) => Number(bucket.fees || 0) - Number(bucket.protocol_fees || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const conservativePoolFeeUsdPerHour = percentile(netFiveMinuteFeesUsd, 0.25) * 12;
  const candles = (ohlcv.data || []).slice(0, -1);
  const highs = candles.map((candle) => Number(candle.high)).filter(Number.isFinite);
  const lows = candles.map((candle) => Number(candle.low)).filter(Number.isFinite);
  const recentRangePct = highs.length && lows.length
    ? (Math.max(...highs) / Math.min(...lows) - 1) * 100
    : DEFAULTS.feeSleeveUpsidePct;
  const suggestedFeeSleeveUpsidePct = Math.max(20, Math.min(50, recentRangePct * 1.5));
  const evidenceAgeSeconds = Number.isFinite(Number(feeHistory.end_time))
    ? Math.max(0, Math.floor(Date.now() / 1000) - Number(feeHistory.end_time))
    : null;
  return {
    solUsd: Number(poolMetrics.token_y?.price || 0),
    activePoolLiquiditySol,
    conservativePoolFeeUsdPerHour,
    suggestedFeeSleeveUpsidePct,
    marketEvidence: {
      source: 'meteora_dlmm_data_api_and_live_active_bin',
      observedAt: new Date().toISOString(),
      evidenceAgeSeconds,
      poolTvlUsd: Number(poolMetrics.tvl || 0),
      volumeUsd30m: Number(poolMetrics.volume?.['30m'] || 0),
      volumeUsd1h: Number(poolMetrics.volume?.['1h'] || 0),
      feesUsd30m: Number(poolMetrics.fees?.['30m'] || 0),
      feesUsd1h: Number(poolMetrics.fees?.['1h'] || 0),
      conservativePoolFeeUsdPerHour,
      activePoolLiquiditySol,
      recentRangePct,
      suggestedFeeSleeveUpsidePct,
      fiveMinuteBucketsUsed: netFiveMinuteFeesUsd.length,
    },
  };
}

async function readLivePosition(payload) {
  const rpcUrl = payload.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const poolAddress = new PublicKey(payload.pool);
  const positionAddress = new PublicKey(payload.position);
  const pool = await DLMM.create(connection, poolAddress);
  const [position, activeBin] = await Promise.all([
    pool.getPosition(positionAddress),
    pool.getActiveBin(),
  ]);
  const owner = String(position.positionData.owner || '');
  if (payload.wallet && owner && payload.wallet !== owner) throw new Error('position_owner_mismatch');
  const xDecimals = pool.tokenX.mint.decimals;
  const yDecimals = pool.tokenY.mint.decimals;
  const positionData = position.positionData;
  const tokenAmount = rawToNumber(positionData.totalXAmount, xDecimals)
    + rawToNumber(positionData.feeXExcludeTransferFee ?? positionData.feeX, xDecimals);
  const existingSol = rawToNumber(positionData.totalYAmount, yDecimals)
    + rawToNumber(positionData.feeYExcludeTransferFee ?? positionData.feeY, yDecimals);
  const market = await readLiveMarketEvidence(
    pool,
    payload.pool,
    activeBin,
    xDecimals,
    yDecimals,
  );
  return {
    scope: {
      wallet: payload.wallet || owner,
      pool: payload.pool,
      position: payload.position,
    },
    activeBinId: Number(activeBin.binId),
    binStep: Number(pool.lbPair.binStep),
    activePrice: Number(activeBin.pricePerToken),
    tokenAmount,
    existingSol,
    requiredExitSol: payload.requiredExitSol,
    feeSleevePct: payload.feeSleevePct,
    minimumFeeSleevePct: payload.minimumFeeSleevePct,
    maximumFeeSleevePct: payload.maximumFeeSleevePct,
    feeSleeveStepPct: payload.feeSleeveStepPct,
    protectedReservePct: payload.protectedReservePct ?? 0,
    feeSleeveUpsidePct: payload.feeSleeveUpsidePct ?? market.suggestedFeeSleeveUpsidePct,
    maxRangePriceMultiple: payload.maxRangePriceMultiple,
    feeEvaluationHorizonHours: payload.feeEvaluationHorizonHours,
    expectedTimeInRangePct: payload.expectedTimeInRangePct,
    estimatedFeeCycleCostSol: payload.estimatedFeeCycleCostSol,
    minimumNetFeeSol: payload.minimumNetFeeSol,
    minimumFeeToCostMultiple: payload.minimumFeeToCostMultiple,
    maximumFeeOpportunityCostPctOfRequiredExit:
      payload.maximumFeeOpportunityCostPctOfRequiredExit,
    solUsd: market.solUsd,
    activePoolLiquiditySol: market.activePoolLiquiditySol,
    conservativePoolFeeUsdPerHour: market.conservativePoolFeeUsdPerHour,
    marketEvidence: market.marketEvidence,
  };
}

function readPayload() {
  const raw = process.env.RECOVERY_PLAN_PAYLOAD || fs.readFileSync(0, 'utf8');
  if (!raw || !raw.trim()) throw new Error('missing_payload');
  return JSON.parse(raw);
}

async function main() {
  try {
    const payload = readPayload();
    const input = payload.live === false ? payload : await readLivePosition(payload);
    process.stdout.write(`${JSON.stringify(buildTwoPositionPlan(input), null, 2)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ feasible: false, error: message }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  await main();
}
