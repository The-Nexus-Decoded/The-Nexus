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
  feeSleevePct: 20,
  protectedReservePct: 20,
  feeSleeveUpsidePct: 35,
  maxRangePriceMultiple: 12,
  maxPlanAgeSeconds: 60,
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

export function buildTwoPositionPlan(input) {
  const activeBinId = Math.trunc(assertFinite('active_bin_id', input.activeBinId));
  const binStep = assertFinite('bin_step', input.binStep);
  const activePrice = assertFinite('active_price', input.activePrice);
  const tokenAmount = assertFinite('token_amount', input.tokenAmount);
  const existingSol = assertFinite('existing_sol', input.existingSol || 0);
  const requiredExitSol = assertFinite('required_exit_sol', input.requiredExitSol);
  const feeSleevePct = clampPercent('fee_sleeve_pct', input.feeSleevePct ?? DEFAULTS.feeSleevePct);
  const reservePct = clampPercent(
    'protected_reserve_pct',
    input.protectedReservePct ?? DEFAULTS.protectedReservePct,
  );
  const ladderPct = 100 - feeSleevePct - reservePct;
  if (ladderPct <= 0) throw new Error('recovery_ladder_allocation_must_be_positive');
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
    selected = {
      upperBinId,
      upperPrice,
      targetPrice,
      valueAtPrice,
      ladderWeights,
    };
    break;
  }

  if (!selected) {
    return {
      feasible: false,
      reason: 'required_exit_not_reachable_inside_enrollment_range_limit',
      scope: input.scope,
      requiredExitSol,
      maxRangePriceMultiple: maxMultiple,
      futureFeesCountedTowardTarget: false,
    };
  }

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
    },
    modeledOutcome: {
      currentValueSol: currentValue,
      targetPrice: selected.targetPrice,
      targetPriceMultiple: selected.targetPrice / activePrice,
      valueAtTargetSol: targetValue,
      valueAtRangeTopSol: selected.valueAtPrice(selected.upperPrice),
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
    protectedReservePct: payload.protectedReservePct,
    feeSleeveUpsidePct: payload.feeSleeveUpsidePct,
    maxRangePriceMultiple: payload.maxRangePriceMultiple,
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
