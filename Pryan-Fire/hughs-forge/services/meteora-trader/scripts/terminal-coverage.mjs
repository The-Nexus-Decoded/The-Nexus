import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const dependencyPackage = process.env.METEORA_NODE_MODULES_PACKAGE_JSON;
const require = createRequire(dependencyPackage ? pathToFileURL(dependencyPackage) : import.meta.url);
const { calculateBidAskDistribution } = require('@meteora-ag/dlmm');

function rawToNumber(raw, decimals) {
  return Number((raw || 0).toString()) / (10 ** decimals);
}

function priceAtBin(activePrice, activeBinId, binId, binStep) {
  return activePrice * ((1 + binStep / 10_000) ** (binId - activeBinId));
}

export function positionTerminalPrincipalSol(positionData, xDecimals, yDecimals) {
  return positionData.positionBinData.reduce((total, bin) => (
    total
      + rawToNumber(bin.positionYAmount, yDecimals)
      + rawToNumber(bin.positionXAmount, xDecimals) * Number(bin.pricePerToken)
  ), 0);
}

export function trancheTargetSol(tranches) {
  return tranches.reduce((total, tranche) => (
    total + Number(tranche.capitalSol) * (1 + Number(tranche.profitPct) / 100)
  ), 0);
}

export function bidAskTerminalPrincipalSol({
  tokenAmount,
  existingSol = 0,
  activeBinId,
  upperBinId,
  activePrice,
  binStep,
}) {
  const binIds = Array.from(
    { length: upperBinId - activeBinId + 1 },
    (_, index) => activeBinId + index,
  );
  const distribution = calculateBidAskDistribution(activeBinId, binIds);
  const rows = distribution.map((row) => ({
    binId: Number(row.binId),
    weight: Number(row.xAmountBpsOfTotal.toString()),
  }));
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) throw new Error('empty_bid_ask_distribution');
  return Number(existingSol) + rows.reduce((total, row) => (
    total + Number(tokenAmount) * row.weight / totalWeight
      * priceAtBin(activePrice, activeBinId, row.binId, binStep)
  ), 0);
}

export function terminalCoverageProof({
  wideTerminalPrincipalSol,
  spotTerminalPrincipalSol,
  requiredTargetSol,
  executionCostAllowanceSol = 0,
}) {
  const netTerminalPrincipalSol = Number(wideTerminalPrincipalSol)
    + Number(spotTerminalPrincipalSol)
    - Number(executionCostAllowanceSol);
  return {
    wideTerminalPrincipalSol: Number(wideTerminalPrincipalSol),
    spotTerminalPrincipalSol: Number(spotTerminalPrincipalSol),
    executionCostAllowanceSol: Number(executionCostAllowanceSol),
    requiredTargetSol: Number(requiredTargetSol),
    netTerminalPrincipalSol,
    surplusSol: netTerminalPrincipalSol - Number(requiredTargetSol),
    passes: netTerminalPrincipalSol + 1e-12 >= Number(requiredTargetSol),
    projectedFeesCounted: false,
  };
}

export function solveWideUpperBin({
  tokenAmount,
  existingSol = 0,
  spotTerminalPrincipalSol,
  requiredTargetSol,
  executionCostAllowanceSol = 0,
  activeBinId,
  activePrice,
  binStep,
  maximumBinCount = 1400,
}) {
  for (let upperBinId = activeBinId; upperBinId < activeBinId + maximumBinCount; upperBinId += 1) {
    const wideTerminal = bidAskTerminalPrincipalSol({
      tokenAmount,
      existingSol,
      activeBinId,
      upperBinId,
      activePrice,
      binStep,
    });
    const proof = terminalCoverageProof({
      wideTerminalPrincipalSol: wideTerminal,
      spotTerminalPrincipalSol,
      requiredTargetSol,
      executionCostAllowanceSol,
    });
    if (proof.passes) return { lowerBinId: activeBinId, upperBinId, ...proof };
  }
  return null;
}
