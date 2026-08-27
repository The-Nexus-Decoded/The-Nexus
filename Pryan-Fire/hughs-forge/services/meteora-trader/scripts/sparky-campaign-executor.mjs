#!/usr/bin/env node
/**
 * Resumable local signer/controller for the enrolled SPARKY recovery campaign.
 *
 * The wallet secret is accepted only on stdin. It is never logged or written.
 * Public transaction state is journaled so an interrupted multi-transaction
 * migration can reconcile and resume instead of abandoning wallet inventory.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  positionTerminalPrincipalSol,
  solveWideUpperBin,
  terminalCoverageProof,
  trancheTargetSol,
} from './terminal-coverage.mjs';

const dependencyPackage = process.env.METEORA_NODE_MODULES_PACKAGE_JSON;
const require = createRequire(dependencyPackage ? pathToFileURL(dependencyPackage) : import.meta.url);
const dlmmModule = require('@meteora-ag/dlmm');
const DLMM = dlmmModule.default || dlmmModule;
const { StrategyType } = dlmmModule;
const { BN } = require('@coral-xyz/anchor');
const bs58Module = require('bs58');
const bs58 = bs58Module.default || bs58Module;
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');

export const CAMPAIGN = Object.freeze({
  id: 'sparky-capital-recovery-v1',
  pool: 'D2XeJBX5shvpdec9TspZzvvC6M78UAUfn165VeiPLvhK',
  rootPosition: 'HWSuro4P1PguyhfydtdGS1vv5FPeRarRJfVrb27A48CB',
  owner: 'sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb',
  sparkyMint: '3vSD9xyKCfRBpP3uDEUJaPyWGNWZDFkv4C4qHbjLpump',
  wsolMint: 'So11111111111111111111111111111111111111112',
  profitWallet: '3d3Q5meqQpVV4CLCyHfHyYFD4Yy7jvNNt4dovdkNyNhB',
  entryBasisSol: 2.269634845,
  targetProfitPct: 40,
  targetValueSol: 3.177488783,
  widePct: 70,
  tightPct: 30,
  autoCompound: false,
});

const LIVE_CONFIRMATION = 'SPARKY-CAMPAIGN-40PCT-LIVE';
const EDGE_GUARD_BINS = 2;
const MAX_ACTIVE_BIN_DRIFT = 2;
const PREFERRED_NATIVE_SOL = 0.03;
const MIN_ACTION_NATIVE_SOL = 0.015;
const LIQUIDITY_SLIPPAGE_LEVELS_PCT = Object.freeze([0.5, 1, 2, 3, 5]);
const MIN_FEE_CLAIM_VALUE_SOL = 0.02;
const MIN_FEE_CLAIM_INTERVAL_MS = 15 * 60 * 1000;
const TRANSFER_FEE_BUFFER_LAMPORTS = 10_000n;
const TERMINAL_EXECUTION_ALLOWANCE_SOL = 0.005;
const RETARGET_WINDOW_MS = 60 * 60 * 1000;
const RETARGET_POLICY = Object.freeze({
  wide: Object.freeze({ confirmations: 2, minimumDwellMs: 60_000, maximumPerHour: 2, outsideBins: 1 }),
  tight: Object.freeze({ confirmations: 3, minimumDwellMs: 60_000, maximumPerHour: 6, outsideBins: 2 }),
});
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const JUPITER_URL = (process.env.JUPITER_ULTRA_ENDPOINT || 'https://api.jup.ag/ultra/v1').replace(/\/$/, '');
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const PLANNER = path.join(moduleDir, 'plan-two-position-recovery.mjs');
const STATE_FILE = process.env.SPARKEY_CAMPAIGN_STATE_FILE
  || path.resolve(moduleDir, '..', 'state', `${CAMPAIGN.id}.json`);
const LOCK_FILE = `${STATE_FILE}.controller.lock`;
const MAX_SWAP_SLIPPAGE_BPS = 300;
const MIN_SWAP_SLIPPAGE_BPS = 50;
const ONCHAIN_VERIFY_ATTEMPTS = 3;

export function boundedSlippageBps(requestedBps = 200) {
  const value = Number(requestedBps);
  if (!Number.isInteger(value)) throw new Error('slippage_bps_must_be_an_integer');
  if (value < MIN_SWAP_SLIPPAGE_BPS || value > MAX_SWAP_SLIPPAGE_BPS) {
    throw new Error(`slippage_bps_outside_safety_bounds:${value}`);
  }
  return value;
}

export function nextLiquiditySlippagePct(currentPct) {
  const index = LIQUIDITY_SLIPPAGE_LEVELS_PCT.indexOf(Number(currentPct));
  if (index < 0 || index === LIQUIDITY_SLIPPAGE_LEVELS_PCT.length - 1) return null;
  return LIQUIDITY_SLIPPAGE_LEVELS_PCT[index + 1];
}

export function deployableCampaignTokenRaw(walletTokenRaw, pendingFeeTokenRaw = 0n) {
  const walletAmount = BigInt(walletTokenRaw);
  const pendingFees = BigInt(pendingFeeTokenRaw);
  return walletAmount > pendingFees ? walletAmount - pendingFees : 0n;
}

function liquiditySlippagePct(journal, role, generation) {
  const policy = journal.executionPolicy?.liquiditySlippage?.[role];
  return Number(policy?.generation) === generation
    ? Number(policy.pct)
    : LIQUIDITY_SLIPPAGE_LEVELS_PCT[0];
}

function recordLiquiditySlippageFailure(journal, role, generation, currentPct, error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes('ExceededAmountSlippageTolerance') && !message.includes('Custom:6003')) {
    throw error;
  }
  const nextPct = nextLiquiditySlippagePct(currentPct);
  if (nextPct === null) {
    throw new Error(`${role}_liquidity_slippage_safety_cap_reached:${currentPct}:${message}`);
  }
  journal.executionPolicy ||= {};
  journal.executionPolicy.liquiditySlippage ||= {};
  journal.executionPolicy.liquiditySlippage[role] = {
    generation,
    pct: nextPct,
    priorPct: currentPct,
    raisedAt: new Date().toISOString(),
    reason: 'meteora_simulation_exceeded_amount_slippage_tolerance',
  };
  atomicWriteJson(STATE_FILE, journal);
  throw new Error(`${role}_liquidity_slippage_raised_for_next_reconciliation:${currentPct}:${nextPct}`);
}

function resetLiquiditySlippage(journal, role) {
  if (journal.executionPolicy?.liquiditySlippage?.[role]) {
    delete journal.executionPolicy.liquiditySlippage[role];
  }
}

export function targetValueSol(entryBasisSol, targetProfitPct) {
  return entryBasisSol * (1 + targetProfitPct / 100);
}

export function campaignReturnSol(snapshot) {
  return snapshot.positionsExecutableValueSol
    + snapshot.cumulativeNetFeesEarnedSol
    - snapshot.executionCostsSol;
}

export function campaignMilestones(snapshot, campaign = CAMPAIGN) {
  const value = campaignReturnSol(snapshot);
  return {
    campaignReturnSol: value,
    breakEvenReached: value + 1e-12 >= campaign.entryBasisSol,
    targetReached: value + 1e-12 >= campaign.targetValueSol,
    profitPct: (value / campaign.entryBasisSol - 1) * 100,
  };
}

export function rangeState(activeBinId, lowerBinId, upperBinId) {
  if (activeBinId < lowerBinId) return 'out_below';
  if (activeBinId > upperBinId) return 'out_above';
  if (activeBinId <= lowerBinId + EDGE_GUARD_BINS) return 'lower_edge';
  if (activeBinId >= upperBinId - EDGE_GUARD_BINS) return 'upper_edge';
  return 'in_range';
}

export function retargetGuardDecision({
  role,
  range,
  activeBinId,
  lowerBinId,
  upperBinId,
  previous = {},
  retargets = [],
  positionStartedAt,
  nowMs = Date.now(),
}) {
  const policy = RETARGET_POLICY[role];
  if (!policy) throw new Error(`unknown_retarget_role:${role}`);
  const outside = range === 'out_below' || range === 'out_above';
  const outsideDistanceBins = range === 'out_below'
    ? lowerBinId - activeBinId
    : range === 'out_above'
      ? activeBinId - upperBinId
      : 0;
  const sameExcursion = outside && previous.range === range;
  const consecutiveOutOfRange = outside
    ? (sameExcursion ? Number(previous.consecutiveOutOfRange || 0) + 1 : 1)
    : 0;
  const recentRetargets = retargets.filter((record) => (
    record.role === role
      && (record.priorState === 'out_below' || record.priorState === 'out_above')
      && Number.isFinite(Date.parse(record.at))
      && nowMs - Date.parse(record.at) < RETARGET_WINDOW_MS
  )).length;
  const startedAtMs = Date.parse(positionStartedAt || '');
  const dwellMs = Number.isFinite(startedAtMs) ? Math.max(0, nowMs - startedAtMs) : 0;
  let blockedReason = null;
  if (!outside) blockedReason = 'position_not_out_of_range';
  else if (outsideDistanceBins < policy.outsideBins) blockedReason = 'outside_distance_hysteresis';
  else if (consecutiveOutOfRange < policy.confirmations) blockedReason = 'awaiting_confirmation';
  else if (dwellMs < policy.minimumDwellMs) blockedReason = 'minimum_dwell';
  else if (recentRetargets >= policy.maximumPerHour) blockedReason = 'hourly_retarget_cap';
  return {
    role,
    range,
    observedAt: new Date(nowMs).toISOString(),
    outsideDistanceBins,
    consecutiveOutOfRange,
    dwellMs,
    recentRetargets,
    policy,
    shouldRetarget: blockedReason === null,
    blockedReason,
  };
}

export function feeSweepLamports(realizedFeeLamports, breakEvenReached) {
  const fees = BigInt(realizedFeeLamports);
  if (!breakEvenReached || fees <= TRANSFER_FEE_BUFFER_LAMPORTS) return 0n;
  return fees - TRANSFER_FEE_BUFFER_LAMPORTS;
}

export function classifyCloseNativeDelta(
  grossReceivedLamports,
  expectedPrincipalLamports,
  expectedFeeLamports,
  refundableRentLamports,
) {
  const gross = BigInt(grossReceivedLamports);
  const expectedPrincipal = BigInt(expectedPrincipalLamports);
  const expectedFees = BigInt(expectedFeeLamports);
  const refundableRent = BigInt(refundableRentLamports);
  const excludedRent = gross < refundableRent ? gross : refundableRent;
  const economicReceived = gross - excludedRent;
  const principal = economicReceived < expectedPrincipal ? economicReceived : expectedPrincipal;
  const afterPrincipal = economicReceived - principal;
  const realizedFees = afterPrincipal < expectedFees ? afterPrincipal : expectedFees;
  return {
    grossReceivedLamports: gross,
    excludedRentLamports: excludedRent,
    economicReceivedLamports: economicReceived,
    principalLamports: principal,
    realizedFeeLamports: realizedFees,
    unclassifiedLamports: afterPrincipal - realizedFees,
  };
}

export function exitProfitSweepLamports(exitProceedsLamports, entryBasisSol = CAMPAIGN.entryBasisSol) {
  const basis = BigInt(Math.round(entryBasisSol * LAMPORTS_PER_SOL));
  const proceeds = BigInt(exitProceedsLamports);
  if (proceeds <= basis + TRANSFER_FEE_BUFFER_LAMPORTS) return 0n;
  return proceeds - basis - TRANSFER_FEE_BUFFER_LAMPORTS;
}

function parseArgs(argv) {
  const args = { mode: 'status', confirmation: '', intervalSeconds: 15 };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') args.mode = argv[++index];
    else if (argv[index] === '--confirm-live-mainnet') args.confirmation = argv[++index];
    else if (argv[index] === '--interval-seconds') args.intervalSeconds = Number(argv[++index]);
    else throw new Error(`unknown_argument:${argv[index]}`);
  }
  if (!['status', 'preflight', 'migrate', 'tick', 'run'].includes(args.mode)) {
    throw new Error('mode_must_be_status_preflight_migrate_tick_or_run');
  }
  if (!Number.isInteger(args.intervalSeconds) || args.intervalSeconds < 10) {
    throw new Error('interval_seconds_must_be_at_least_10');
  }
  return args;
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

function readJournal() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireControllerLock() {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(LOCK_FILE, 'wx', 0o600);
      fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
      fs.closeSync(descriptor);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
          if (Number(lock.pid) === process.pid) fs.unlinkSync(LOCK_FILE);
        } catch {
          // A missing or replaced lock must never be deleted by this process.
        }
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      let holder = null;
      try {
        holder = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      } catch {
        // An unreadable lock is treated as unsafe rather than overwritten.
      }
      if (holder && processIsAlive(Number(holder.pid))) {
        throw new Error(`controller_already_running:${holder.pid}`);
      }
      if (attempt === 0 && holder) {
        fs.unlinkSync(LOCK_FILE);
        continue;
      }
      throw new Error('controller_lock_unreadable_or_stale');
    }
  }
  throw new Error('controller_lock_acquisition_failed');
}

function newJournal() {
  return {
    schemaVersion: 1,
    campaign: CAMPAIGN,
    status: 'not_migrated',
    createdAt: new Date().toISOString(),
    positions: {},
    stages: {},
    ledger: {
      capitalTranches: [{
        id: 'original',
        capitalSol: CAMPAIGN.entryBasisSol,
        profitPct: CAMPAIGN.targetProfitPct,
        addedAt: new Date().toISOString(),
      }],
      cumulativeNetFeesEarnedLamports: '0',
      cumulativeFeesSweptLamports: '0',
      cumulativeExecutionCostsLamports: '0',
      excludedRentRefundLamports: '0',
      accountedFeeStages: [],
      feeBatches: [],
      feeSweeps: [],
      exitSettlement: null,
    },
  };
}

function loadOrCreateJournal() {
  const journal = readJournal() || newJournal();
  if (journal.campaign?.id !== CAMPAIGN.id || journal.campaign?.owner !== CAMPAIGN.owner) {
    throw new Error('campaign_journal_scope_mismatch');
  }
  journal.ledger.capitalTranches ||= [{
    id: 'original',
    capitalSol: CAMPAIGN.entryBasisSol,
    profitPct: CAMPAIGN.targetProfitPct,
    addedAt: journal.createdAt || new Date().toISOString(),
  }];
  journal.ledger.excludedRentRefundLamports ||= '0';
  journal.ledger.accountedFeeStages ||= [];
  journal.ledger.feeBatches ||= [];
  journal.ledger.feeSweeps ||= [];
  return journal;
}

function requiredCampaignTargetSol(journal) {
  return trancheTargetSol(journal.ledger.capitalTranches);
}

function campaignBasisSol(journal) {
  return journal.ledger.capitalTranches.reduce(
    (total, tranche) => total + Number(tranche.capitalSol),
    0,
  );
}

function terminalProofForPositions(pool, journal, wide, tight) {
  const xDecimals = pool.tokenX.mint.decimals;
  const yDecimals = pool.tokenY.mint.decimals;
  return terminalCoverageProof({
    wideTerminalPrincipalSol: positionTerminalPrincipalSol(wide.positionData, xDecimals, yDecimals),
    spotTerminalPrincipalSol: positionTerminalPrincipalSol(tight.positionData, xDecimals, yDecimals),
    requiredTargetSol: requiredCampaignTargetSol(journal),
    executionCostAllowanceSol: TERMINAL_EXECUTION_ALLOWANCE_SOL,
  });
}

async function readStdin() {
  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

function keypairFromText(input) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('wallet_secret_missing_from_stdin');
  let bytes;
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error('wallet_secret_json_must_be_array');
    bytes = Uint8Array.from(parsed);
  } else {
    bytes = Uint8Array.from(bs58.decode(trimmed));
  }
  const wallet = bytes.length === 64
    ? Keypair.fromSecretKey(Uint8Array.from(bytes))
    : bytes.length === 32
      ? Keypair.fromSeed(Uint8Array.from(bytes))
      : null;
  bytes.fill(0);
  if (!wallet) throw new Error('unsupported_wallet_secret_length');
  if (wallet.publicKey.toBase58() !== CAMPAIGN.owner) throw new Error('wallet_owner_mismatch');
  return wallet;
}

function derivePositionKeypair(wallet, role, generation = 0) {
  const secretMaterial = Buffer.from(wallet.secretKey);
  const seed = crypto.createHash('sha256')
    .update(secretMaterial)
    .update(CAMPAIGN.id)
    .update(role)
    .update(String(generation))
    .digest()
    .subarray(0, 32);
  const keypair = Keypair.fromSeed(seed);
  secretMaterial.fill(0);
  seed.fill(0);
  return keypair;
}

function atomicToUi(raw, decimals) {
  const value = BigInt(raw.toString());
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function rawAmount(value) {
  return BigInt((value || 0).toString());
}

function positionInventory(position) {
  const data = position.positionData;
  return {
    tokenXRaw: rawAmount(data.totalXAmountExcludeTransferFee ?? data.totalXAmount),
    tokenYRaw: rawAmount(data.totalYAmountExcludeTransferFee ?? data.totalYAmount),
    feeXRaw: rawAmount(data.feeXExcludeTransferFee ?? data.feeX),
    feeYRaw: rawAmount(data.feeYExcludeTransferFee ?? data.feeY),
  };
}

async function tokenBalanceRaw(connection, owner, mint) {
  const response = await connection.getParsedTokenAccountsByOwner(owner, { mint }, 'confirmed');
  return response.value.reduce(
    (sum, account) => sum + BigInt(account.account.data.parsed.info.tokenAmount.amount),
    0n,
  );
}

async function walletSnapshot(connection, owner) {
  const [lamports, sparkyRaw] = await Promise.all([
    connection.getBalance(owner, 'confirmed'),
    tokenBalanceRaw(connection, owner, new PublicKey(CAMPAIGN.sparkyMint)),
  ]);
  return { lamports: BigInt(lamports), sparkyRaw };
}

async function loadPool(connection) {
  const pool = await DLMM.create(connection, new PublicKey(CAMPAIGN.pool));
  if (pool.tokenX.publicKey.toBase58() !== CAMPAIGN.sparkyMint
      || pool.tokenY.publicKey.toBase58() !== CAMPAIGN.wsolMint) {
    throw new Error('pool_mint_mismatch');
  }
  return pool;
}

async function getActiveBinVerified(pool) {
  let lastError = null;
  for (let attempt = 1; attempt <= ONCHAIN_VERIFY_ATTEMPTS; attempt += 1) {
    try {
      const active = await pool.getActiveBin();
      if (active && Number.isFinite(Number(active.binId)) && Number.isFinite(Number(active.pricePerToken))) {
        return active;
      }
      lastError = new Error('active_bin_response_missing_fields');
    } catch (error) {
      lastError = error;
    }
    if (attempt < ONCHAIN_VERIFY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error(`active_bin_unavailable_after_retries:${lastError?.message || 'unknown'}`);
}

async function positionOrNull(connection, pool, address) {
  if (!address) return null;
  const publicKey = new PublicKey(address);
  if (!await connection.getAccountInfo(publicKey, 'confirmed')) return null;
  return pool.getPosition(publicKey);
}

async function positionPostcondition(connection, pool, address, lowerBinId, upperBinId, requireLiquidity) {
  const position = await positionOrNull(connection, pool, address);
  if (!position) return { ok: false, reason: 'position_account_missing' };
  const actualLower = Number(position.positionData.lowerBinId);
  const actualUpper = Number(position.positionData.upperBinId);
  const exactRange = actualLower === lowerBinId && actualUpper === upperBinId;
  const populatedRangeWithinEnrollment = requireLiquidity
    && actualLower >= lowerBinId
    && actualUpper <= upperBinId;
  const populatedRangeWithinSdkBoundary = requireLiquidity
    && actualLower >= lowerBinId - 1
    && actualUpper <= upperBinId + 1;
  if (!exactRange && !populatedRangeWithinEnrollment && !populatedRangeWithinSdkBoundary) {
    return {
      ok: false,
      reason: `position_range_mismatch:${actualLower}:${actualUpper}`,
    };
  }
  const inventory = positionInventory(position);
  const principalRaw = inventory.tokenXRaw + inventory.tokenYRaw;
  if (requireLiquidity && principalRaw <= 0n) {
    return { ok: false, reason: 'position_has_no_principal_liquidity' };
  }
  return {
    ok: true,
    evidence: {
      address,
      lowerBinId: actualLower,
      upperBinId: actualUpper,
      tokenXRaw: inventory.tokenXRaw.toString(),
      tokenYRaw: inventory.tokenYRaw.toString(),
    },
  };
}

async function positionClosedPostcondition(connection, address) {
  const account = await connection.getAccountInfo(new PublicKey(address), 'confirmed');
  return account
    ? { ok: false, reason: 'position_account_still_exists' }
    : { ok: true, evidence: { address, accountClosed: true } };
}

function recordActionReconciled(journal, actionName, evidence) {
  journal.actions ||= {};
  journal.actions[actionName] = {
    status: 'reconciled',
    reconciledAt: new Date().toISOString(),
    evidence,
  };
  atomicWriteJson(STATE_FILE, journal);
}

function plannerInput() {
  return {
    pool: CAMPAIGN.pool,
    position: CAMPAIGN.rootPosition,
    wallet: CAMPAIGN.owner,
    requiredExitSol: CAMPAIGN.targetValueSol,
    minimumFeeSleevePct: 5,
    maximumFeeSleevePct: 30,
    feeSleeveStepPct: 5,
    protectedReservePct: 0,
    maxRangePriceMultiple: 8.5,
  };
}

async function freshPlan() {
  const payload = JSON.stringify(plannerInput());
  const prior = process.env.RECOVERY_PLAN_PAYLOAD;
  process.env.RECOVERY_PLAN_PAYLOAD = payload;
  try {
    const imported = await import(`${pathToFileURL(PLANNER).href}?run=${Date.now()}`);
    if (typeof imported.buildTwoPositionPlan !== 'function' || typeof imported.readLivePosition !== 'function') {
      throw new Error('planner_exports_missing');
    }
    const plan = imported.buildTwoPositionPlan(await imported.readLivePosition(plannerInput()));
    if (!plan.feasible) throw new Error(`recovery_plan_infeasible:${plan.reasons?.join(',') || 'unknown'}`);
    return plan;
  } finally {
    if (prior === undefined) delete process.env.RECOVERY_PLAN_PAYLOAD;
    else process.env.RECOVERY_PLAN_PAYLOAD = prior;
  }
}

async function refreshTransaction(connection, transaction) {
  const latest = await connection.getLatestBlockhash('confirmed');
  transaction.feePayer = new PublicKey(CAMPAIGN.owner);
  transaction.recentBlockhash = latest.blockhash;
  transaction.lastValidBlockHeight = latest.lastValidBlockHeight;
  return latest;
}

async function simulateSigned(connection, transaction, signers, label) {
  const latest = await refreshTransaction(connection, transaction);
  transaction.sign(...signers);
  if (!transaction.verifySignatures()) throw new Error(`${label}_signature_verification_failed`);
  const response = await connection.simulateTransaction(transaction, signers, true);
  if (response.value.err) {
    const logs = (response.value.logs || []).slice(-12).join('|');
    throw new Error(`${label}_simulation_failed:${JSON.stringify(response.value.err)}:${logs}`);
  }
  return { transaction, latest, unitsConsumed: response.value.unitsConsumed ?? null };
}

async function waitForPostcondition(stageName, postcondition) {
  let lastError = null;
  for (let attempt = 1; attempt <= ONCHAIN_VERIFY_ATTEMPTS; attempt += 1) {
    try {
      const result = await postcondition();
      if (result === true) return { ok: true, attempts: attempt };
      if (result?.ok) return { ...result, attempts: attempt };
      lastError = new Error(result?.reason || 'postcondition_returned_false');
    } catch (error) {
      lastError = error;
    }
    if (attempt < ONCHAIN_VERIFY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`${stageName}_postcondition_failed:${lastError?.message || 'unknown'}`);
}

async function verifySignatureOnChain(connection, signature, stageName) {
  let lastReason = 'not_found';
  for (let attempt = 1; attempt <= ONCHAIN_VERIFY_ATTEMPTS; attempt += 1) {
    const result = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const status = result.value[0];
    if (status?.err) throw new Error(`stage_failed_on_chain:${stageName}:${JSON.stringify(status.err)}`);
    const confirmed = status?.confirmationStatus === 'confirmed'
      || status?.confirmationStatus === 'finalized';
    if (confirmed) {
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (transaction?.meta?.err) {
        throw new Error(`stage_transaction_meta_failed:${stageName}:${JSON.stringify(transaction.meta.err)}`);
      }
      if (transaction?.meta) {
        const secondRead = await connection.getSignatureStatuses(
          [signature],
          { searchTransactionHistory: true },
        );
        const secondStatus = secondRead.value[0];
        if (secondStatus?.err) {
          throw new Error(`stage_failed_on_recheck:${stageName}:${JSON.stringify(secondStatus.err)}`);
        }
        if (!['confirmed', 'finalized'].includes(secondStatus?.confirmationStatus)) {
          throw new Error(`stage_confirmation_regressed:${stageName}`);
        }
        return {
          slot: status.slot,
          confirmationStatus: secondStatus.confirmationStatus,
          signatureChecks: 2,
          transactionMetaVerified: true,
          attempts: attempt,
        };
      }
      lastReason = 'transaction_meta_not_available';
    } else if (status) {
      lastReason = status.confirmationStatus || 'processed';
    }
    if (attempt < ONCHAIN_VERIFY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`stage_not_chain_confirmed:${stageName}:${signature}:${lastReason}`);
}

async function finalizeStage(connection, journal, stageName, postcondition = null) {
  const stage = journal.stages[stageName];
  const chainEvidence = await verifySignatureOnChain(connection, stage.signature, stageName);
  stage.status = 'chain_confirmed';
  stage.chainEvidence = chainEvidence;
  stage.chainConfirmedAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, journal);
  if (postcondition) {
    stage.postcondition = await waitForPostcondition(stageName, postcondition);
    stage.status = 'reconciled';
    stage.reconciledAt = new Date().toISOString();
    atomicWriteJson(STATE_FILE, journal);
  }
  return true;
}

async function reconcileSendingStage(connection, journal, stageName, postcondition = null) {
  const stage = journal.stages[stageName];
  if (!stage || stage.status !== 'sending' || !stage.signature) return false;
  const result = await connection.getSignatureStatuses([stage.signature], { searchTransactionHistory: true });
  const status = result.value[0];
  if (!status) {
    const transaction = await connection.getTransaction(stage.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (transaction?.meta) {
      if (transaction.meta.err) {
        throw new Error(`stage_failed_on_chain:${stageName}:${JSON.stringify(transaction.meta.err)}`);
      }
      return finalizeStage(connection, journal, stageName, postcondition);
    }
    const blockHeight = await connection.getBlockHeight('confirmed');
    if (stage.lastValidBlockHeight && blockHeight > stage.lastValidBlockHeight) {
      stage.status = 'expired';
      stage.expiredAt = new Date().toISOString();
      stage.expiredBlockHeight = blockHeight;
      atomicWriteJson(STATE_FILE, journal);
      throw new Error(`stage_expired_verified_absent_retry_next_tick:${stageName}:${stage.signature}`);
    }
    throw new Error(`stage_signature_pending_or_rpc_stale:${stageName}:${stage.signature}`);
  }
  if (status.err) throw new Error(`stage_failed_on_chain:${stageName}:${JSON.stringify(status.err)}`);
  if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
    return finalizeStage(connection, journal, stageName, postcondition);
  }
  throw new Error(`stage_still_pending:${stageName}:${stage.signature}`);
}

async function sendStage(connection, journal, stageName, transaction, signers, options = {}) {
  const { postcondition = null } = options;
  const existing = journal.stages[stageName];
  if (['confirmed', 'chain_confirmed', 'reconciled'].includes(existing?.status)) {
    if (existing.status !== 'reconciled' && postcondition) {
      await finalizeStage(connection, journal, stageName, postcondition);
    }
    return existing.signature;
  }
  if (existing?.status === 'sending') {
    await reconcileSendingStage(connection, journal, stageName, postcondition);
    return journal.stages[stageName].signature;
  }
  const prepared = await simulateSigned(connection, transaction, signers, stageName);
  const signature = bs58.encode(prepared.transaction.signature);
  const nativeBalance = await connection.getBalance(new PublicKey(CAMPAIGN.owner), 'confirmed');
  if (nativeBalance < MIN_ACTION_NATIVE_SOL * LAMPORTS_PER_SOL) {
    throw new Error(`insufficient_native_sol_for_transaction:${nativeBalance}`);
  }
  const priorAttempts = existing
    ? [...(existing.priorAttempts || []), {
      signature: existing.signature,
      status: existing.status,
      expiredAt: existing.expiredAt,
    }]
    : [];
  journal.stages[stageName] = {
    status: 'sending',
    signature,
    preparedAt: new Date().toISOString(),
    unitsConsumed: prepared.unitsConsumed,
    blockhash: prepared.latest.blockhash,
    lastValidBlockHeight: prepared.latest.lastValidBlockHeight,
    priorAttempts,
  };
  atomicWriteJson(STATE_FILE, journal);
  const sent = await connection.sendRawTransaction(prepared.transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
    preflightCommitment: 'confirmed',
  });
  if (sent !== signature) throw new Error(`${stageName}_signature_changed_on_send`);
  // Do not use Connection.confirmTransaction here. Its websocket subscription can
  // throw outside the controller loop when a shared RPC returns 429. Polling the
  // journaled signature keeps every failure inside the resumable state machine.
  await finalizeStage(connection, journal, stageName, postcondition);
  return signature;
}

async function reconcileOutstandingStages(connection, journal) {
  const outstanding = Object.entries(journal.stages || {})
    .filter(([, stage]) => stage.status === 'sending');
  for (const [stageName] of outstanding) {
    await reconcileSendingStage(connection, journal, stageName);
  }
  if (outstanding.length) {
    journal.controllerHealth = {
      status: 'reconciled_interrupted_transactions',
      pid: process.pid,
      verifiedAt: new Date().toISOString(),
      actionBlocked: false,
      reconciledStages: outstanding.map(([stageName]) => stageName),
    };
    atomicWriteJson(STATE_FILE, journal);
  }
}

async function buildRootRemoval(pool, root) {
  return pool.removeLiquidity({
    user: new PublicKey(CAMPAIGN.owner),
    position: root.publicKey,
    fromBinId: Number(root.positionData.lowerBinId),
    toBinId: Number(root.positionData.upperBinId),
    bps: new BN(10_000),
    shouldClaimAndClose: true,
    skipUnwrapSOL: false,
  });
}

async function tryCreateSimulation(connection, build, signers, label) {
  try {
    const transaction = await build();
    const prepared = await simulateSigned(connection, transaction, signers, label);
    return { ok: true, unitsConsumed: prepared.unitsConsumed, deferredUntilRootClose: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('insufficient lamports') && !message.includes('custom program error: 0x1')) {
      throw error;
    }
    return {
      ok: null,
      unitsConsumed: null,
      deferredUntilRootClose: true,
      reason: 'current_wallet_rent_is_insufficient_before_confirmed_root_rent_and_sol_refund',
    };
  }
}

async function preflightMigration(connection, wallet) {
  const pool = await loadPool(connection);
  const root = await positionOrNull(connection, pool, CAMPAIGN.rootPosition);
  if (!root) throw new Error('root_position_not_found');
  if (!root.positionData.owner.equals(wallet.publicKey)) throw new Error('position_owner_mismatch');
  const activeBinId = Number((await getActiveBinVerified(pool)).binId);
  const inventory = positionInventory(root);
  const [walletBefore, rootAccount] = await Promise.all([
    walletSnapshot(connection, wallet.publicKey),
    connection.getAccountInfo(root.publicKey, 'confirmed'),
  ]);
  const plan = await freshPlan();
  if (Math.abs(plan.recoveryPosition.minBinId - activeBinId) > MAX_ACTIVE_BIN_DRIFT) {
    throw new Error('planner_active_bin_stale');
  }
  const removals = await buildRootRemoval(pool, root);
  const removalTransactions = Array.isArray(removals) ? removals : [removals];
  const simulations = [];
  for (let index = 0; index < removalTransactions.length; index += 1) {
    const prepared = await simulateSigned(
      connection,
      removalTransactions[index],
      [wallet],
      `root_close_preflight_${index + 1}`,
    );
    simulations.push({ transaction: index + 1, unitsConsumed: prepared.unitsConsumed, ok: true });
  }
  const wideKeypair = derivePositionKeypair(wallet, 'wide', 0);
  const tightKeypair = derivePositionKeypair(wallet, 'tight', 0);
  const wideCreateSimulation = await tryCreateSimulation(
    connection,
    () => pool.createExtendedEmptyPosition(
      Number(plan.recoveryPosition.minBinId),
      Number(plan.recoveryPosition.maxBinId),
      wideKeypair.publicKey,
      wallet.publicKey,
    ),
    [wallet, wideKeypair],
    'wide_create_preflight',
  );
  const tightCreateSimulation = await tryCreateSimulation(
    connection,
    () => pool.createEmptyPosition({
      positionPubKey: tightKeypair.publicKey,
      minBinId: Number(plan.feePosition.minBinId),
      maxBinId: Number(plan.feePosition.maxBinId),
      user: wallet.publicKey,
    }),
    [wallet, tightKeypair],
    'tight_create_preflight',
  );
  return {
    status: 'preflight_ok',
    campaign: CAMPAIGN,
    activeBinId,
    rootRange: {
      lowerBinId: Number(root.positionData.lowerBinId),
      upperBinId: Number(root.positionData.upperBinId),
      state: rangeState(
        activeBinId,
        Number(root.positionData.lowerBinId),
        Number(root.positionData.upperBinId),
      ),
    },
    rootInventory: {
      tokenXRaw: inventory.tokenXRaw.toString(),
      tokenYRaw: inventory.tokenYRaw.toString(),
      feeXRaw: inventory.feeXRaw.toString(),
      feeYRaw: inventory.feeYRaw.toString(),
    },
    plan,
    stagedRentEvidence: {
      walletBeforeLamports: walletBefore.lamports.toString(),
      refundableRootPositionRentLamports: String(rootAccount?.lamports || 0),
      rootSolAndFeeYReleasedLamports: (inventory.tokenYRaw + inventory.feeYRaw).toString(),
      postRootCloseChildSimulationRequired: true,
    },
    rootCloseSimulations: simulations,
    childCreateSimulations: {
      wide: wideCreateSimulation,
      tight: tightCreateSimulation,
    },
    resumableJournal: STATE_FILE,
  };
}

async function createWidePosition(
  connection,
  pool,
  wallet,
  journal,
  plan,
  wideKeypair,
  wideXRaw,
  wideYRaw,
  generation = 0,
) {
  const lower = Number(plan.recoveryPosition.minBinId);
  const upper = Number(plan.recoveryPosition.maxBinId);
  if (!await connection.getAccountInfo(wideKeypair.publicKey, 'confirmed')) {
    const createTx = await pool.createExtendedEmptyPosition(
      lower,
      upper,
      wideKeypair.publicKey,
      wallet.publicKey,
    );
    await sendStage(
      connection,
      journal,
      `wide_g${generation}_create`,
      createTx,
      [wallet, wideKeypair],
      {
        postcondition: () => positionPostcondition(
          connection,
          pool,
          wideKeypair.publicKey.toBase58(),
          lower,
          upper,
          false,
        ),
      },
    );
  }
  const existing = await pool.getPosition(wideKeypair.publicKey);
  const existingInventory = positionInventory(existing);
  const remainingXRaw = wideXRaw > existingInventory.tokenXRaw
    ? wideXRaw - existingInventory.tokenXRaw
    : 0n;
  const remainingYRaw = wideYRaw > existingInventory.tokenYRaw
    ? wideYRaw - existingInventory.tokenYRaw
    : 0n;
  if (remainingXRaw > 0n || remainingYRaw > 0n) {
    const slippagePct = liquiditySlippagePct(journal, 'wide', generation);
    const strategy = {
      minBinId: lower,
      maxBinId: upper,
      strategyType: StrategyType.BidAsk,
    };
    if (remainingYRaw === 0n) strategy.singleSidedX = true;
    try {
      const transactions = await pool.addLiquidityByStrategyChunkable({
        positionPubKey: wideKeypair.publicKey,
        user: wallet.publicKey,
        totalXAmount: new BN(remainingXRaw.toString()),
        totalYAmount: new BN(remainingYRaw.toString()),
        strategy,
        slippage: slippagePct,
      });
      for (let index = 0; index < transactions.length; index += 1) {
        await sendStage(
          connection,
          journal,
          `wide_g${generation}_deposit_${remainingXRaw}_${remainingYRaw}_${index + 1}`,
          transactions[index],
          [wallet],
          {
            postcondition: () => positionPostcondition(
              connection,
              pool,
              wideKeypair.publicKey.toBase58(),
              lower,
              upper,
              true,
            ),
          },
        );
      }
    } catch (error) {
      recordLiquiditySlippageFailure(journal, 'wide', generation, slippagePct, error);
    }
  }
  const wideEvidence = await waitForPostcondition(
    `wide_g${generation}_ready`,
    () => positionPostcondition(
      connection,
      pool,
      wideKeypair.publicKey.toBase58(),
      lower,
      upper,
      wideXRaw > 0n || wideYRaw > 0n,
    ),
  );
  journal.positions.wide = {
    address: wideKeypair.publicKey.toBase58(),
    generation,
    strategy: 'BidAsk',
    lowerBinId: Number(wideEvidence.evidence.lowerBinId),
    upperBinId: Number(wideEvidence.evidence.upperBinId),
    requestedLowerBinId: lower,
    requestedUpperBinId: upper,
  };
  resetLiquiditySlippage(journal, 'wide');
  recordActionReconciled(journal, `wide_g${generation}_ready`, wideEvidence);
  atomicWriteJson(STATE_FILE, journal);
}

async function createTightPosition(
  connection,
  pool,
  wallet,
  journal,
  plan,
  tightKeypair,
  tightXRaw,
  tightYRaw,
  generation = 0,
) {
  const lower = Number(plan.feePosition.minBinId);
  const upper = Number(plan.feePosition.maxBinId);
  if (!await connection.getAccountInfo(tightKeypair.publicKey, 'confirmed')) {
    const createTransaction = await pool.createEmptyPosition({
      positionPubKey: tightKeypair.publicKey,
      minBinId: lower,
      maxBinId: upper,
      user: wallet.publicKey,
    });
    await sendStage(
      connection,
      journal,
      `tight_g${generation}_create`,
      createTransaction,
      [wallet, tightKeypair],
      {
        postcondition: () => positionPostcondition(
          connection,
          pool,
          tightKeypair.publicKey.toBase58(),
          lower,
          upper,
          false,
        ),
      },
    );
  }
  const existing = await pool.getPosition(tightKeypair.publicKey);
  const existingInventory = positionInventory(existing);
  if (existingInventory.tokenXRaw === 0n && existingInventory.tokenYRaw === 0n
      && (tightXRaw > 0n || tightYRaw > 0n)) {
    const slippagePct = liquiditySlippagePct(journal, 'tight', generation);
    const strategy = {
      minBinId: lower,
      maxBinId: upper,
      strategyType: StrategyType.Spot,
    };
    if (tightYRaw === 0n) strategy.singleSidedX = true;
    try {
      const transactions = await pool.addLiquidityByStrategyChunkable({
        positionPubKey: tightKeypair.publicKey,
        user: wallet.publicKey,
        totalXAmount: new BN(tightXRaw.toString()),
        totalYAmount: new BN(tightYRaw.toString()),
        strategy,
        slippage: slippagePct,
      });
      for (let index = 0; index < transactions.length; index += 1) {
        await sendStage(
          connection,
          journal,
          `tight_g${generation}_deposit_${index + 1}`,
          transactions[index],
          [wallet],
          {
            postcondition: () => positionPostcondition(
              connection,
              pool,
              tightKeypair.publicKey.toBase58(),
              lower,
              upper,
              true,
            ),
          },
        );
      }
    } catch (error) {
      recordLiquiditySlippageFailure(journal, 'tight', generation, slippagePct, error);
    }
  }
  const tightEvidence = await waitForPostcondition(
    `tight_g${generation}_ready`,
    () => positionPostcondition(
      connection,
      pool,
      tightKeypair.publicKey.toBase58(),
      lower,
      upper,
      tightXRaw > 0n || tightYRaw > 0n,
    ),
  );
  journal.positions.tight = {
    address: tightKeypair.publicKey.toBase58(),
    generation,
    strategy: 'Spot',
    lowerBinId: Number(tightEvidence.evidence.lowerBinId),
    upperBinId: Number(tightEvidence.evidence.upperBinId),
    requestedLowerBinId: lower,
    requestedUpperBinId: upper,
  };
  resetLiquiditySlippage(journal, 'tight');
  recordActionReconciled(journal, `tight_g${generation}_ready`, tightEvidence);
  atomicWriteJson(STATE_FILE, journal);
}

async function migrate(connection, wallet, preflight) {
  const journal = loadOrCreateJournal();
  if (journal.status === 'active') return journal;
  if (journal.status === 'closed') throw new Error('campaign_already_closed');
  journal.status = 'migrating';
  journal.preflight = preflight;
  if (!journal.walletBeforeMigration) {
    const before = await walletSnapshot(connection, wallet.publicKey);
    journal.walletBeforeMigration = {
      lamports: before.lamports.toString(),
      sparkyRaw: before.sparkyRaw.toString(),
    };
    atomicWriteJson(STATE_FILE, journal);
  }

  let pool = await loadPool(connection);
  const root = await positionOrNull(connection, pool, CAMPAIGN.rootPosition);
  if (root) {
    const removals = await buildRootRemoval(pool, root);
    const transactions = Array.isArray(removals) ? removals : [removals];
    for (let index = 0; index < transactions.length; index += 1) {
      await sendStage(
        connection,
        journal,
        `root_close_${index + 1}`,
        transactions[index],
        [wallet],
        index === transactions.length - 1
          ? { postcondition: () => positionClosedPostcondition(connection, CAMPAIGN.rootPosition) }
          : {},
      );
    }
    const rootClosed = await waitForPostcondition(
      'root_close_reconciliation',
      () => positionClosedPostcondition(connection, CAMPAIGN.rootPosition),
    );
    recordActionReconciled(journal, 'root_close_reconciliation', rootClosed);
  }

  const afterRoot = await walletSnapshot(connection, wallet.publicKey);
  const beforeX = BigInt(journal.walletBeforeMigration.sparkyRaw);
  const withdrawnXRaw = afterRoot.sparkyRaw - beforeX;
  if (withdrawnXRaw <= 0n && !journal.migrationInventory?.principalXRaw) {
    throw new Error('root_close_did_not_produce_sparky_inventory');
  }
  if (!journal.migrationInventory?.principalXRaw) {
    const expectedPrincipalX = BigInt(preflight.rootInventory.tokenXRaw);
    const expectedFeeX = BigInt(preflight.rootInventory.feeXRaw);
    const expectedTotalX = expectedPrincipalX + expectedFeeX;
    const principalXRaw = withdrawnXRaw * expectedPrincipalX / expectedTotalX;
    const pendingFeeXRaw = withdrawnXRaw - principalXRaw;
    const beforeLamports = BigInt(journal.walletBeforeMigration.lamports);
    const nativeDelta = afterRoot.lamports > beforeLamports ? afterRoot.lamports - beforeLamports : 0n;
    const expectedPrincipalY = BigInt(preflight.rootInventory.tokenYRaw);
    const expectedFeeY = BigInt(preflight.rootInventory.feeYRaw);
    const refundableRootRent = BigInt(
      preflight.stagedRentEvidence?.refundableRootPositionRentLamports || 0,
    );
    const principalYRaw = nativeDelta < expectedPrincipalY ? nativeDelta : expectedPrincipalY;
    const afterPrincipal = nativeDelta - principalYRaw;
    const excludedRootRent = afterPrincipal < refundableRootRent
      ? afterPrincipal
      : refundableRootRent;
    const afterPrincipalAndRent = afterPrincipal - excludedRootRent;
    const pendingFeeSolLamports = afterPrincipalAndRent < expectedFeeY
      ? afterPrincipalAndRent
      : expectedFeeY;
    const expectedNativeInflow = expectedPrincipalY + expectedFeeY + refundableRootRent;
    const closeExecutionCostLamports = expectedNativeInflow > nativeDelta
      ? expectedNativeInflow - nativeDelta
      : 0n;
    const wideXRaw = principalXRaw * BigInt(CAMPAIGN.widePct) / 100n;
    const tightXRaw = principalXRaw - wideXRaw;
    const wideYRaw = principalYRaw * BigInt(CAMPAIGN.widePct) / 100n;
    const tightYRaw = principalYRaw - wideYRaw;
    journal.migrationInventory = {
      withdrawnXRaw: withdrawnXRaw.toString(),
      principalXRaw: principalXRaw.toString(),
      principalYRaw: principalYRaw.toString(),
      wideXRaw: wideXRaw.toString(),
      wideYRaw: wideYRaw.toString(),
      tightXRaw: tightXRaw.toString(),
      tightYRaw: tightYRaw.toString(),
      pendingFeeXRaw: pendingFeeXRaw.toString(),
      pendingFeeSolLamports: pendingFeeSolLamports.toString(),
      excludedRootRentRefundLamports: excludedRootRent.toString(),
      rootCloseExecutionCostLamports: closeExecutionCostLamports.toString(),
    };
    journal.ledger.cumulativeExecutionCostsLamports = closeExecutionCostLamports.toString();
  }
  const {
    wideXRaw: wideXText,
    wideYRaw: wideYText,
    tightXRaw: tightXText,
    tightYRaw: tightYText,
    pendingFeeXRaw: pendingFeeXText,
    pendingFeeSolLamports: pendingFeeSolText,
  } = journal.migrationInventory;
  const wideXRaw = BigInt(wideXText);
  const wideYRaw = BigInt(wideYText);
  const tightXRaw = BigInt(tightXText);
  const tightYRaw = BigInt(tightYText);
  const pendingFeeXRaw = BigInt(pendingFeeXText);
  const pendingFeeSolLamports = BigInt(pendingFeeSolText);
  journal.ledger.pendingFeeXRaw = pendingFeeXRaw.toString();
  journal.ledger.pendingFeeSolLamports = pendingFeeSolLamports.toString();
  atomicWriteJson(STATE_FILE, journal);

  pool = await loadPool(connection);
  const liveBin = Number((await getActiveBinVerified(pool)).binId);
  if (Math.abs(liveBin - preflight.activeBinId) > MAX_ACTIVE_BIN_DRIFT) {
    preflight = await preflightMigrationAfterRootClose(connection, wallet, preflight, liveBin);
    journal.preflight = preflight;
    atomicWriteJson(STATE_FILE, journal);
  }
  const wideKeypair = derivePositionKeypair(wallet, 'wide', 0);
  const tightKeypair = derivePositionKeypair(wallet, 'tight', 0);
  await createWidePosition(
    connection,
    pool,
    wallet,
    journal,
    preflight.plan,
    wideKeypair,
    wideXRaw,
    wideYRaw,
  );
  pool = await loadPool(connection);
  await createTightPosition(
    connection,
    pool,
    wallet,
    journal,
    preflight.plan,
    tightKeypair,
    tightXRaw,
    tightYRaw,
  );

  pool = await loadPool(connection);
  const [wide, tight] = await Promise.all([
    positionOrNull(connection, pool, journal.positions.wide.address),
    positionOrNull(connection, pool, journal.positions.tight.address),
  ]);
  if (!wide || !tight) throw new Error('child_position_reconciliation_failed');
  journal.status = 'active';
  journal.migratedAt = new Date().toISOString();
  journal.reconciliation = {
    wideTokenXRaw: positionInventory(wide).tokenXRaw.toString(),
    tightTokenXRaw: positionInventory(tight).tokenXRaw.toString(),
    activeBinId: Number((await getActiveBinVerified(pool)).binId),
  };
  atomicWriteJson(STATE_FILE, journal);
  return journal;
}

async function preflightMigrationAfterRootClose(connection, wallet, previous, liveBin) {
  const pool = await loadPool(connection);
  const activeState = await getActiveBinVerified(pool);
  const active = Number(activeState.binId);
  if (active !== liveBin) throw new Error('active_bin_changed_during_replan');
  const oldRoot = plannerInput();
  const synthetic = {
    ...oldRoot,
    live: false,
    activeBinId: active,
    binStep: Number(pool.lbPair.binStep),
    activePrice: Number(activeState.pricePerToken),
    tokenAmount: Number(atomicToUi(BigInt(previous.rootInventory.tokenXRaw), pool.tokenX.mint.decimals)),
    existingSol: 0,
    requiredExitSol: CAMPAIGN.targetValueSol,
    solUsd: previous.plan.marketEvidence?.solUsd || 200,
    activePoolLiquiditySol: previous.plan.marketEvidence.activePoolLiquiditySol,
    conservativePoolFeeUsdPerHour: previous.plan.marketEvidence.conservativePoolFeeUsdPerHour,
  };
  const imported = await import(`${pathToFileURL(PLANNER).href}?replan=${Date.now()}`);
  const plan = imported.buildTwoPositionPlan(synthetic);
  if (!plan.feasible) throw new Error('post_withdrawal_replan_infeasible');
  return { ...previous, activeBinId: active, plan, replannedAt: new Date().toISOString() };
}

function jupiterHeaders(json = false) {
  const headers = { 'User-Agent': 'HughsForge-SparkyCampaign/1.0' };
  if (json) headers['Content-Type'] = 'application/json';
  if (process.env.JUPITER_API_KEY) headers['x-api-key'] = process.env.JUPITER_API_KEY;
  return headers;
}

async function jupiterQuote(
  inputMint,
  amountRaw,
  slippageBps = 200,
  outputMint = CAMPAIGN.wsolMint,
) {
  if (BigInt(amountRaw) <= 0n) return null;
  const safeSlippageBps = boundedSlippageBps(slippageBps);
  const query = new URLSearchParams({
    inputMint,
    outputMint,
    amount: BigInt(amountRaw).toString(),
    slippageBps: String(safeSlippageBps),
  });
  const response = await fetch(`${JUPITER_URL}/order?${query}`, { headers: jupiterHeaders() });
  const body = await response.json();
  if (!response.ok || !body.outAmount) {
    throw new Error(`jupiter_quote_failed:${response.status}:${body.error || 'malformed_response'}`);
  }
  return body;
}

async function jupiterOrder(
  inputMint,
  amountRaw,
  taker,
  slippageBps = 200,
  outputMint = CAMPAIGN.wsolMint,
) {
  if (BigInt(amountRaw) <= 0n) return null;
  const safeSlippageBps = boundedSlippageBps(slippageBps);
  const query = new URLSearchParams({
    inputMint,
    outputMint,
    amount: BigInt(amountRaw).toString(),
    taker,
    slippageBps: String(safeSlippageBps),
  });
  const response = await fetch(`${JUPITER_URL}/order?${query}`, { headers: jupiterHeaders() });
  const body = await response.json();
  if (!response.ok || !body.transaction || !body.requestId || !body.outAmount) {
    throw new Error(`jupiter_order_failed:${response.status}:${body.error || 'malformed_response'}`);
  }
  return body;
}

async function executeJupiterOrder(connection, order, wallet, stageName) {
  const transaction = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
  transaction.sign([wallet]);
  const response = await fetch(`${JUPITER_URL}/execute`, {
    method: 'POST',
    headers: jupiterHeaders(true),
    body: JSON.stringify({
      signedTransaction: Buffer.from(transaction.serialize()).toString('base64'),
      requestId: order.requestId,
    }),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'Success' || !body.signature) {
    throw new Error(`jupiter_execute_failed:${response.status}:${body.error || body.status || 'unknown'}`);
  }
  const chainEvidence = await verifySignatureOnChain(connection, body.signature, stageName);
  return { ...body, chainEvidence };
}

async function deployWideWalletResidual(connection, pool, wallet, journal, position) {
  const record = journal.positions.wide;
  const residualPrefix = `wide_g${record.generation}_residual_`;
  const confirmedResidualStages = Object.entries(journal.stages || {})
    .filter(([stageName, stage]) => (
      stageName.startsWith(residualPrefix) && stage.status === 'chain_confirmed'
    ));
  for (const [stageName] of confirmedResidualStages) {
    await finalizeStage(connection, journal, stageName, () => positionPostcondition(
      connection,
      pool,
      position.publicKey.toBase58(),
      Number(record.lowerBinId),
      Number(record.upperBinId),
      true,
    ));
  }
  const reconciledPosition = await positionOrNull(connection, pool, position.publicKey);
  if (!reconciledPosition) throw new Error('wide_position_missing_during_residual_reconciliation');
  record.lowerBinId = Number(reconciledPosition.positionData.lowerBinId);
  record.upperBinId = Number(reconciledPosition.positionData.upperBinId);
  atomicWriteJson(STATE_FILE, journal);
  const dustThresholdRaw = 10n ** BigInt(pool.tokenX.mint.decimals);
  const tightResidualThresholdRaw = dustThresholdRaw * 10n;
  const maximumPasses = 3;
  for (let pass = 1; pass <= maximumPasses; pass += 1) {
    const before = await walletSnapshot(connection, wallet.publicKey);
    const pendingFeeXRaw = BigInt(journal.ledger.pendingFeeXRaw || 0);
    const deployableRaw = deployableCampaignTokenRaw(before.sparkyRaw, pendingFeeXRaw);
    if (deployableRaw <= dustThresholdRaw) {
      journal.wideResidual = {
        status: 'reconciled',
        observedAt: new Date().toISOString(),
        deployableRaw: deployableRaw.toString(),
        pendingFeeXRaw: pendingFeeXRaw.toString(),
        dustThresholdRaw: dustThresholdRaw.toString(),
      };
      atomicWriteJson(STATE_FILE, journal);
      return;
    }
    if (deployableRaw <= tightResidualThresholdRaw) {
      const tightRecord = journal.positions.tight;
      const tightPosition = await positionOrNull(connection, pool, tightRecord.address);
      if (!tightPosition) throw new Error('tight_position_missing_for_small_principal_residual');
      const slippagePct = liquiditySlippagePct(
        journal,
        'tight',
        Number(tightRecord.generation),
      );
      const strategy = {
        minBinId: Number(tightRecord.lowerBinId),
        maxBinId: Number(tightRecord.upperBinId),
        strategyType: StrategyType.Spot,
        singleSidedX: true,
      };
      try {
        const transactions = await pool.addLiquidityByStrategyChunkable({
          positionPubKey: tightPosition.publicKey,
          user: wallet.publicKey,
          totalXAmount: new BN(deployableRaw.toString()),
          totalYAmount: new BN(0),
          strategy,
          slippage: slippagePct,
        });
        if (!transactions.length) throw new Error('tight_residual_builder_returned_no_transactions');
        for (let index = 0; index < transactions.length; index += 1) {
          await sendStage(
            connection,
            journal,
            `tight_g${tightRecord.generation}_principal_residual_${deployableRaw}_${index + 1}`,
            transactions[index],
            [wallet],
            {
              postcondition: () => positionPostcondition(
                connection,
                pool,
                tightPosition.publicKey.toBase58(),
                Number(tightRecord.lowerBinId),
                Number(tightRecord.upperBinId),
                true,
              ),
            },
          );
        }
      } catch (error) {
        recordLiquiditySlippageFailure(
          journal,
          'tight',
          Number(tightRecord.generation),
          slippagePct,
          error,
        );
      }
      const afterTightDeposit = await walletSnapshot(connection, wallet.publicKey);
      const remainingAfterTight = deployableCampaignTokenRaw(
        afterTightDeposit.sparkyRaw,
        pendingFeeXRaw,
      );
      if (remainingAfterTight >= deployableRaw) {
        throw new Error(`tight_residual_deposit_made_no_progress:${deployableRaw}:${remainingAfterTight}`);
      }
      journal.wideResidual = {
        status: remainingAfterTight <= dustThresholdRaw ? 'reconciled' : 'retrying',
        destination: 'tight_spot',
        observedAt: new Date().toISOString(),
        beforeRaw: deployableRaw.toString(),
        remainingRaw: remainingAfterTight.toString(),
        pendingFeeXRaw: pendingFeeXRaw.toString(),
        dustThresholdRaw: dustThresholdRaw.toString(),
      };
      atomicWriteJson(STATE_FILE, journal);
      if (remainingAfterTight <= dustThresholdRaw) return;
      continue;
    }
    const slippagePct = liquiditySlippagePct(journal, 'wide', Number(record.generation));
    const strategy = {
      minBinId: Number(record.lowerBinId),
      maxBinId: Number(record.upperBinId),
      strategyType: StrategyType.BidAsk,
      singleSidedX: true,
    };
    try {
      const transactions = await pool.addLiquidityByStrategyChunkable({
        positionPubKey: position.publicKey,
        user: wallet.publicKey,
        totalXAmount: new BN(deployableRaw.toString()),
        totalYAmount: new BN(0),
        strategy,
        slippage: slippagePct,
      });
      if (!transactions.length) throw new Error('wide_residual_builder_returned_no_transactions');
      for (let index = 0; index < transactions.length; index += 1) {
        await sendStage(
          connection,
          journal,
          `wide_g${record.generation}_residual_${deployableRaw}_${pass}_${index + 1}`,
          transactions[index],
          [wallet],
          {
            postcondition: () => positionPostcondition(
              connection,
              pool,
              position.publicKey.toBase58(),
              Number(record.lowerBinId),
              Number(record.upperBinId),
              true,
            ),
          },
        );
      }
    } catch (error) {
      recordLiquiditySlippageFailure(
        journal,
        'wide',
        Number(record.generation),
        slippagePct,
        error,
      );
    }
    const after = await walletSnapshot(connection, wallet.publicKey);
    const remainingRaw = deployableCampaignTokenRaw(after.sparkyRaw, pendingFeeXRaw);
    if (remainingRaw >= deployableRaw) {
      throw new Error(`wide_residual_deposit_made_no_progress:${deployableRaw}:${remainingRaw}`);
    }
    journal.wideResidual = {
      status: remainingRaw <= dustThresholdRaw ? 'reconciled' : 'retrying',
      observedAt: new Date().toISOString(),
      pass,
      beforeRaw: deployableRaw.toString(),
      remainingRaw: remainingRaw.toString(),
      pendingFeeXRaw: pendingFeeXRaw.toString(),
      dustThresholdRaw: dustThresholdRaw.toString(),
    };
    atomicWriteJson(STATE_FILE, journal);
    if (remainingRaw <= dustThresholdRaw) {
      resetLiquiditySlippage(journal, 'wide');
      recordActionReconciled(journal, `wide_g${record.generation}_wallet_residual`, journal.wideResidual);
      return;
    }
  }
  throw new Error(`wide_wallet_residual_above_dust_after_${maximumPasses}_passes`);
}

async function executableSnapshot(connection, pool, journal) {
  const positionRecords = Object.values(journal.positions || {});
  const positions = (await Promise.all(
    positionRecords.map((record) => positionOrNull(connection, pool, record.address)),
  )).filter(Boolean);
  let principalX = 0n;
  let principalY = 0n;
  let feeX = 0n;
  let feeY = 0n;
  for (const position of positions) {
    const inventory = positionInventory(position);
    principalX += inventory.tokenXRaw;
    principalY += inventory.tokenYRaw;
    feeX += inventory.feeXRaw;
    feeY += inventory.feeYRaw;
  }
  const pendingFeeX = BigInt(journal.ledger.pendingFeeXRaw || 0);
  const pendingFeeSol = BigInt(journal.ledger.pendingFeeSolLamports || 0);
  const [principalQuote, feeQuote] = await Promise.all([
    jupiterQuote(CAMPAIGN.sparkyMint, principalX),
    jupiterQuote(CAMPAIGN.sparkyMint, feeX + pendingFeeX),
  ]);
  const positionsExecutableLamports = principalY + BigInt(principalQuote?.outAmount || 0);
  const unclaimedFeeLamports = feeY + pendingFeeSol + BigInt(feeQuote?.outAmount || 0);
  const cumulativeFeeLamports = BigInt(journal.ledger.cumulativeNetFeesEarnedLamports || 0);
  const costsLamports = BigInt(journal.ledger.cumulativeExecutionCostsLamports || 0);
  const activeBinId = Number((await getActiveBinVerified(pool)).binId);
  const snapshot = {
    observedAt: new Date().toISOString(),
    activeBinId,
    positionsExecutableValueSol: Number(positionsExecutableLamports) / LAMPORTS_PER_SOL,
    unclaimedFeeValueSol: Number(unclaimedFeeLamports) / LAMPORTS_PER_SOL,
    cumulativeNetFeesEarnedSol:
      Number(cumulativeFeeLamports + unclaimedFeeLamports) / LAMPORTS_PER_SOL,
    executionCostsSol: Number(costsLamports) / LAMPORTS_PER_SOL,
    positions: positionRecords.map((record) => ({
      ...record,
      rangeState: rangeState(activeBinId, record.lowerBinId, record.upperBinId),
    })),
  };
  return {
    ...snapshot,
    ...campaignMilestones(snapshot, {
      entryBasisSol: campaignBasisSol(journal),
      targetValueSol: requiredCampaignTargetSol(journal),
    }),
  };
}

function recordFeeBatch(journal, stageName, netFeeLamports, source) {
  const amount = BigInt(netFeeLamports);
  if (amount <= 0n || journal.ledger.accountedFeeStages.includes(stageName)) return false;
  journal.ledger.cumulativeNetFeesEarnedLamports = (
    BigInt(journal.ledger.cumulativeNetFeesEarnedLamports || 0) + amount
  ).toString();
  journal.ledger.accountedFeeStages.push(stageName);
  journal.ledger.feeBatches.push({
    stage: stageName,
    source,
    netFeeLamports: amount.toString(),
    accountedAt: new Date().toISOString(),
  });
  return true;
}

function reconcileUnaccountedFeeSwapStages(journal) {
  let changed = false;
  for (const [stageName, stage] of Object.entries(journal.stages || {})) {
    if (!/^fee_swap_\d+$/.test(stageName) || stage.status !== 'reconciled') continue;
    const walletDelta = stage.postcondition?.evidence?.walletLamportDelta;
    if (walletDelta === undefined) continue;
    changed = recordFeeBatch(
      journal,
      stageName,
      BigInt(walletDelta),
      'recovered_reconciled_fee_swap',
    ) || changed;
  }
  if (changed) atomicWriteJson(STATE_FILE, journal);
  return changed;
}

async function claimFees(connection, pool, wallet, journal, positions) {
  const before = await walletSnapshot(connection, wallet.publicKey);
  const claimablePositions = positions.filter((position) => {
    const inventory = positionInventory(position);
    return inventory.feeXRaw > 0n || inventory.feeYRaw > 0n;
  });
  const transactions = claimablePositions.length
    ? await pool.claimAllSwapFee({ owner: wallet.publicKey, positions: claimablePositions })
    : [];
  for (let index = 0; index < transactions.length; index += 1) {
    const stage = `fee_claim_${Date.now()}_${index + 1}`;
    await sendStage(connection, journal, stage, transactions[index], [wallet]);
  }
  const afterClaim = await walletSnapshot(connection, wallet.publicKey);
  const newlyClaimedX = afterClaim.sparkyRaw - before.sparkyRaw;
  const pendingFeeX = BigInt(journal.ledger.pendingFeeXRaw || 0);
  const pendingFeeSol = BigInt(journal.ledger.pendingFeeSolLamports || 0);
  const realizedFeeX = newlyClaimedX + pendingFeeX;
  let feeSwapStage = null;
  if (realizedFeeX > 0n) {
    const order = await jupiterOrder(CAMPAIGN.sparkyMint, realizedFeeX, CAMPAIGN.owner);
    feeSwapStage = `fee_swap_${Date.now()}`;
    const executed = await executeJupiterOrder(connection, order, wallet, feeSwapStage);
    journal.stages[feeSwapStage] = {
      status: 'chain_confirmed',
      signature: executed.signature,
      requestId: order.requestId,
      inputRaw: realizedFeeX.toString(),
      outputRaw: String(order.outAmount),
      chainEvidence: executed.chainEvidence,
      chainConfirmedAt: new Date().toISOString(),
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  const afterSwap = await walletSnapshot(connection, wallet.publicKey);
  const transactionDelta = afterSwap.lamports - before.lamports;
  if (feeSwapStage) {
    if (transactionDelta <= 0n) throw new Error(`${feeSwapStage}_wallet_output_delta_not_positive`);
    journal.stages[feeSwapStage].status = 'reconciled';
    journal.stages[feeSwapStage].reconciledAt = new Date().toISOString();
    journal.stages[feeSwapStage].postcondition = {
      ok: true,
      evidence: { walletLamportDelta: transactionDelta.toString() },
    };
  }
  const netFeeLamports = transactionDelta + pendingFeeSol;
  journal.ledger.pendingFeeXRaw = '0';
  journal.ledger.pendingFeeSolLamports = '0';
  const feeBatchStage = feeSwapStage || `fee_batch_${Date.now()}`;
  if (!feeSwapStage) {
    journal.stages[feeBatchStage] = {
      status: 'reconciled',
      reconciledAt: new Date().toISOString(),
      postcondition: {
        ok: netFeeLamports > 0n,
        evidence: { walletLamportDelta: transactionDelta.toString() },
      },
    };
  }
  recordFeeBatch(
    journal,
    feeBatchStage,
    netFeeLamports > 0n ? netFeeLamports : 0n,
    'claimed_and_realized_fees',
  );
  atomicWriteJson(STATE_FILE, journal);
  return {
    feeBatchStage,
    netFeeLamports: netFeeLamports > 0n ? netFeeLamports : 0n,
    transactionDeltaLamports: transactionDelta,
    includedPendingFeeSolLamports: pendingFeeSol,
  };
}

async function transferLamports(connection, wallet, destination, lamports, journal, stageName) {
  if (lamports <= 0n) return null;
  const destinationKey = new PublicKey(destination);
  const beforeBalance = BigInt(await connection.getBalance(destinationKey, 'confirmed'));
  const transaction = new Transaction().add(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: destinationKey,
    lamports,
  }));
  return sendStage(connection, journal, stageName, transaction, [wallet], {
    postcondition: async () => {
      const afterBalance = BigInt(await connection.getBalance(destinationKey, 'confirmed'));
      const received = afterBalance - beforeBalance;
      return received >= lamports
        ? { ok: true, evidence: { destination, receivedLamports: received.toString() } }
        : { ok: false, reason: `destination_balance_delta_too_small:${received}` };
    },
  });
}

async function sweepProvenFeesIfEligible(connection, wallet, journal, snapshot) {
  if (!snapshot.breakEvenReached) return null;
  const earned = BigInt(journal.ledger.cumulativeNetFeesEarnedLamports || 0);
  const swept = BigInt(journal.ledger.cumulativeFeesSweptLamports || 0);
  const unswept = earned > swept ? earned - swept : 0n;
  const sweepLamports = feeSweepLamports(unswept, true);
  if (sweepLamports <= 0n) return null;
  const walletBalance = BigInt(await connection.getBalance(wallet.publicKey, 'confirmed'));
  const preferredReserve = BigInt(Math.round(PREFERRED_NATIVE_SOL * LAMPORTS_PER_SOL));
  const requiredBalance = preferredReserve + TRANSFER_FEE_BUFFER_LAMPORTS + sweepLamports;
  if (walletBalance < requiredBalance) {
    throw new Error(
      `fee_sweep_exceeds_available_proven_balance:requested=${sweepLamports}`
      + `:wallet=${walletBalance}:required_reserve=${preferredReserve}`,
    );
  }
  const before = await walletSnapshot(connection, wallet.publicKey);
  const stageName = `fee_profit_sweep_${Date.now()}`;
  const signature = await transferLamports(
    connection,
    wallet,
    CAMPAIGN.profitWallet,
    sweepLamports,
    journal,
    stageName,
  );
  const after = await walletSnapshot(connection, wallet.publicKey);
  const sourceDelta = before.lamports > after.lamports ? before.lamports - after.lamports : 0n;
  const transferCost = sourceDelta > sweepLamports ? sourceDelta - sweepLamports : 0n;
  journal.ledger.cumulativeFeesSweptLamports = (swept + sweepLamports).toString();
  journal.ledger.cumulativeExecutionCostsLamports = (
    BigInt(journal.ledger.cumulativeExecutionCostsLamports || 0) + transferCost
  ).toString();
  journal.ledger.feeSweeps.push({
    at: new Date().toISOString(),
    stage: stageName,
    netEarnedFeeLamports: earned.toString(),
    sweptLamports: sweepLamports.toString(),
    transferCostLamports: transferCost.toString(),
    signature,
  });
  journal.ledger.lastFeeActionAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, journal);
  return { stageName, signature, sweepLamports, transferCost };
}

async function closePositions(connection, pool, wallet, journal, positions, prefix) {
  for (const position of positions) {
    const transactions = await pool.removeLiquidity({
      user: wallet.publicKey,
      position: position.publicKey,
      fromBinId: Number(position.positionData.lowerBinId),
      toBinId: Number(position.positionData.upperBinId),
      bps: new BN(10_000),
      shouldClaimAndClose: true,
      skipUnwrapSOL: false,
    });
    for (let index = 0; index < transactions.length; index += 1) {
      const address = position.publicKey.toBase58();
      await sendStage(
        connection,
        journal,
        `${prefix}_${address}_${index + 1}`,
        transactions[index],
        [wallet],
        index === transactions.length - 1
          ? { postcondition: () => positionClosedPostcondition(connection, address) }
          : {},
      );
    }
    const closedEvidence = await waitForPostcondition(
      `${prefix}_${position.publicKey.toBase58()}_closed`,
      () => positionClosedPostcondition(connection, position.publicKey.toBase58()),
    );
    recordActionReconciled(
      journal,
      `${prefix}_${position.publicKey.toBase58()}_closed`,
      closedEvidence,
    );
  }
}

async function convertRetargetFeeXToSol(connection, wallet, journal, feeXRaw, stageName) {
  if (feeXRaw <= 0n) return { pendingFeeXRaw: 0n, realizedFeeSolLamports: 0n };
  const order = await jupiterOrder(CAMPAIGN.sparkyMint, feeXRaw, CAMPAIGN.owner);
  if (BigInt(order.outAmount) <= TRANSFER_FEE_BUFFER_LAMPORTS) {
    return { pendingFeeXRaw: feeXRaw, realizedFeeSolLamports: 0n };
  }
  const before = await walletSnapshot(connection, wallet.publicKey);
  const executed = await executeJupiterOrder(connection, order, wallet, stageName);
  const after = await walletSnapshot(connection, wallet.publicKey);
  const realizedFeeSolLamports = after.lamports > before.lamports
    ? after.lamports - before.lamports
    : 0n;
  journal.stages[stageName] = {
    status: 'reconciled',
    signature: executed.signature,
    requestId: order.requestId,
    inputRaw: feeXRaw.toString(),
    outputRaw: realizedFeeSolLamports.toString(),
    chainEvidence: executed.chainEvidence,
    reconciledAt: new Date().toISOString(),
    postcondition: {
      ok: realizedFeeSolLamports > 0n,
      evidence: { walletLamportDelta: realizedFeeSolLamports.toString() },
    },
  };
  if (realizedFeeSolLamports <= 0n) throw new Error(`${stageName}_wallet_output_delta_not_positive`);
  return { pendingFeeXRaw: 0n, realizedFeeSolLamports };
}

async function retargetOutOfRangePosition(connection, pool, wallet, journal, role, position) {
  const currentRecord = journal.positions[role];
  const generation = Number(currentRecord.generation || 0) + 1;
  const priorWidth = currentRecord.upperBinId - currentRecord.lowerBinId + 1;
  const activeBinId = Number((await getActiveBinVerified(pool)).binId);
  const state = rangeState(activeBinId, currentRecord.lowerBinId, currentRecord.upperBinId);
  if (!state.startsWith('out_')) return false;

  const inventory = positionInventory(position);
  const positionAccount = await connection.getAccountInfo(position.publicKey, 'confirmed');
  if (!positionAccount) throw new Error(`${role}_position_account_missing_before_retarget_close`);
  const refundableRentLamports = BigInt(positionAccount.lamports);
  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, [position], `${role}_g${generation}_retarget_close`);
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const receivedX = afterClose.sparkyRaw - before.sparkyRaw;
  const expectedX = inventory.tokenXRaw + inventory.feeXRaw;
  const principalXRaw = expectedX > 0n
    ? receivedX * inventory.tokenXRaw / expectedX
    : 0n;
  const realizedFeeXRaw = receivedX - principalXRaw;
  const receivedSol = afterClose.lamports > before.lamports
    ? afterClose.lamports - before.lamports
    : 0n;
  const nativeClose = classifyCloseNativeDelta(
    receivedSol,
    inventory.tokenYRaw,
    inventory.feeYRaw,
    refundableRentLamports,
  );
  const principalYRaw = nativeClose.principalLamports;
  const realizedFeeSol = nativeClose.realizedFeeLamports;
  journal.ledger.excludedRentRefundLamports = (
    BigInt(journal.ledger.excludedRentRefundLamports || 0) + nativeClose.excludedRentLamports
  ).toString();
  journal.closeAccounting ||= [];
  journal.closeAccounting.push({
    role,
    generation,
    reason: 'out_of_range_retarget',
    priorPosition: position.publicKey.toBase58(),
    grossReceivedLamports: nativeClose.grossReceivedLamports.toString(),
    excludedRentLamports: nativeClose.excludedRentLamports.toString(),
    economicReceivedLamports: nativeClose.economicReceivedLamports.toString(),
    principalLamports: nativeClose.principalLamports.toString(),
    realizedFeeLamports: nativeClose.realizedFeeLamports.toString(),
    unclassifiedLamports: nativeClose.unclassifiedLamports.toString(),
    at: new Date().toISOString(),
  });

  let redeployXRaw = principalXRaw;
  if (principalYRaw > TRANSFER_FEE_BUFFER_LAMPORTS) {
    const swapInput = principalYRaw - TRANSFER_FEE_BUFFER_LAMPORTS;
    const beforeSwap = await walletSnapshot(connection, wallet.publicKey);
    const order = await jupiterOrder(
      CAMPAIGN.wsolMint,
      swapInput,
      CAMPAIGN.owner,
      200,
      CAMPAIGN.sparkyMint,
    );
    const swapStage = `${role}_g${generation}_retarget_swap`;
    const executed = await executeJupiterOrder(connection, order, wallet, swapStage);
    const afterSwap = await walletSnapshot(connection, wallet.publicKey);
    const receivedFromSwap = afterSwap.sparkyRaw - beforeSwap.sparkyRaw;
    if (receivedFromSwap <= 0n) throw new Error(`${role}_retarget_sol_to_sparky_swap_empty`);
    redeployXRaw += receivedFromSwap;
    journal.stages[swapStage] = {
      status: 'reconciled',
      signature: executed.signature,
      requestId: order.requestId,
      inputRaw: swapInput.toString(),
      outputRaw: receivedFromSwap.toString(),
      chainEvidence: executed.chainEvidence,
      reconciledAt: new Date().toISOString(),
      postcondition: {
        ok: true,
        evidence: { walletSparkyDeltaRaw: receivedFromSwap.toString() },
      },
    };
  }

  const convertedFees = await convertRetargetFeeXToSol(
    connection,
    wallet,
    journal,
    realizedFeeXRaw,
    `${role}_g${generation}_retarget_fee_swap`,
  );
  journal.ledger.pendingFeeXRaw = (
    BigInt(journal.ledger.pendingFeeXRaw || 0) + convertedFees.pendingFeeXRaw
  ).toString();
  journal.ledger.pendingFeeSolLamports = (
    BigInt(journal.ledger.pendingFeeSolLamports || 0)
      + realizedFeeSol
      + convertedFees.realizedFeeSolLamports
  ).toString();
  const lowerBinId = activeBinId;
  const upperBinId = state === 'out_below' && role === 'wide'
    ? Math.max(currentRecord.upperBinId, activeBinId + priorWidth - 1)
    : activeBinId + priorWidth - 1;
  const replacement = derivePositionKeypair(wallet, role, generation);
  if (role === 'wide') {
    await createWidePosition(
      connection,
      await loadPool(connection),
      wallet,
      journal,
      { recoveryPosition: { minBinId: lowerBinId, maxBinId: upperBinId } },
      replacement,
      redeployXRaw,
      0n,
      generation,
    );
  } else {
    await createTightPosition(
      connection,
      await loadPool(connection),
      wallet,
      journal,
      { feePosition: { minBinId: lowerBinId, maxBinId: upperBinId } },
      replacement,
      redeployXRaw,
      0n,
      generation,
    );
  }
  journal.retargets ||= [];
  journal.retargets.push({
    role,
    generation,
    priorPosition: position.publicKey.toBase58(),
    replacementPosition: replacement.publicKey.toBase58(),
    priorState: state,
    activeBinId,
    lowerBinId,
    upperBinId,
    at: new Date().toISOString(),
  });
  journal.retargetGuards ||= {};
  journal.retargetGuards[role] = {
    role,
    range: 'in_range',
    observedAt: new Date().toISOString(),
    outsideDistanceBins: 0,
    consecutiveOutOfRange: 0,
    dwellMs: 0,
    recentRetargets: journal.retargets.filter((record) => record.role === role).length,
    policy: RETARGET_POLICY[role],
    shouldRetarget: false,
    blockedReason: 'retarget_completed',
    lastRetargetAt: journal.retargets.at(-1).at,
  };
  atomicWriteJson(STATE_FILE, journal);
  return true;
}

async function repairWideTerminalCoverage(
  connection,
  pool,
  wallet,
  journal,
  wide,
  tight,
  { forceOptimize = false } = {},
) {
  const currentProof = terminalProofForPositions(pool, journal, wide, tight);
  if (currentProof.passes && !forceOptimize) return false;
  const priorPlacement = (journal.retargets || []).findLast((record) => (
    record.role === 'wide' && record.replacementPosition === wide.publicKey.toBase58()
  ));
  const modeledWideTerminal = Number(priorPlacement?.proof?.wideTerminalPrincipalSol || 0);
  const observedDistributionFactor = modeledWideTerminal > 0
    ? currentProof.wideTerminalPrincipalSol / modeledWideTerminal
    : 1;
  if (!(observedDistributionFactor > 0 && observedDistributionFactor <= 1.05)) {
    throw new Error('wide_distribution_calibration_invalid_retry_without_deploy');
  }
  const repairReason = currentProof.passes
    ? 'principal_only_terminal_coverage_reoptimization'
    : 'principal_only_terminal_coverage_repair';
  const inventory = positionInventory(wide);
  const active = await getActiveBinVerified(pool);
  const activeBinId = Number(active.binId);
  const generation = Number(journal.positions.wide.generation || 0) + 1;
  const expectedSwap = inventory.tokenYRaw > TRANSFER_FEE_BUFFER_LAMPORTS
    ? await jupiterQuote(
      CAMPAIGN.wsolMint,
      inventory.tokenYRaw - TRANSFER_FEE_BUFFER_LAMPORTS,
      200,
      CAMPAIGN.sparkyMint,
    )
    : null;
  const prospectiveXRaw = inventory.tokenXRaw + BigInt(expectedSwap?.outAmount || 0);
  const spotTerminal = positionTerminalPrincipalSol(
    tight.positionData,
    pool.tokenX.mint.decimals,
    pool.tokenY.mint.decimals,
  );
  const plan = solveWideUpperBin({
    tokenAmount: Number(atomicToUi(prospectiveXRaw, pool.tokenX.mint.decimals))
      * observedDistributionFactor,
    spotTerminalPrincipalSol: spotTerminal,
    requiredTargetSol: requiredCampaignTargetSol(journal),
    executionCostAllowanceSol: TERMINAL_EXECUTION_ALLOWANCE_SOL,
    activeBinId,
    activePrice: Number(active.pricePerToken),
    binStep: Number(pool.lbPair.binStep),
  });
  if (!plan) throw new Error('principal_only_terminal_coverage_infeasible');

  const positionAccount = await connection.getAccountInfo(wide.publicKey, 'confirmed');
  if (!positionAccount) throw new Error('wide_position_account_missing_before_coverage_close');
  const refundableRentLamports = BigInt(positionAccount.lamports);
  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, [wide], `wide_g${generation}_coverage_close`);
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const receivedX = afterClose.sparkyRaw - before.sparkyRaw;
  const expectedX = inventory.tokenXRaw + inventory.feeXRaw;
  const principalXRaw = expectedX > 0n ? receivedX * inventory.tokenXRaw / expectedX : 0n;
  const realizedFeeXRaw = receivedX - principalXRaw;
  const receivedSol = afterClose.lamports > before.lamports
    ? afterClose.lamports - before.lamports
    : 0n;
  const nativeClose = classifyCloseNativeDelta(
    receivedSol,
    inventory.tokenYRaw,
    inventory.feeYRaw,
    refundableRentLamports,
  );
  const principalYRaw = nativeClose.principalLamports;
  const realizedFeeSol = nativeClose.realizedFeeLamports;
  journal.ledger.excludedRentRefundLamports = (
    BigInt(journal.ledger.excludedRentRefundLamports || 0) + nativeClose.excludedRentLamports
  ).toString();
  journal.closeAccounting ||= [];
  journal.closeAccounting.push({
    role: 'wide',
    generation,
    reason: repairReason,
    priorPosition: wide.publicKey.toBase58(),
    grossReceivedLamports: nativeClose.grossReceivedLamports.toString(),
    excludedRentLamports: nativeClose.excludedRentLamports.toString(),
    economicReceivedLamports: nativeClose.economicReceivedLamports.toString(),
    principalLamports: nativeClose.principalLamports.toString(),
    realizedFeeLamports: nativeClose.realizedFeeLamports.toString(),
    unclassifiedLamports: nativeClose.unclassifiedLamports.toString(),
    at: new Date().toISOString(),
  });
  let redeployXRaw = principalXRaw;
  if (principalYRaw > TRANSFER_FEE_BUFFER_LAMPORTS) {
    const beforeSwap = await walletSnapshot(connection, wallet.publicKey);
    const order = await jupiterOrder(
      CAMPAIGN.wsolMint,
      principalYRaw - TRANSFER_FEE_BUFFER_LAMPORTS,
      CAMPAIGN.owner,
      200,
      CAMPAIGN.sparkyMint,
    );
    const swapStage = `wide_g${generation}_coverage_swap`;
    const executed = await executeJupiterOrder(connection, order, wallet, swapStage);
    const afterSwap = await walletSnapshot(connection, wallet.publicKey);
    const receivedFromSwap = afterSwap.sparkyRaw - beforeSwap.sparkyRaw;
    if (receivedFromSwap <= 0n) throw new Error(`${swapStage}_wallet_output_delta_not_positive`);
    redeployXRaw += receivedFromSwap;
    journal.stages[swapStage] = {
      status: 'reconciled', signature: executed.signature, requestId: order.requestId,
      inputRaw: (principalYRaw - TRANSFER_FEE_BUFFER_LAMPORTS).toString(),
      outputRaw: receivedFromSwap.toString(), chainEvidence: executed.chainEvidence,
      reconciledAt: new Date().toISOString(),
      postcondition: { ok: true, evidence: { walletSparkyDeltaRaw: receivedFromSwap.toString() } },
    };
  }
  const convertedFees = await convertRetargetFeeXToSol(
    connection,
    wallet,
    journal,
    realizedFeeXRaw,
    `wide_g${generation}_coverage_fee_swap`,
  );
  journal.ledger.pendingFeeXRaw = (
    BigInt(journal.ledger.pendingFeeXRaw || 0) + convertedFees.pendingFeeXRaw
  ).toString();
  journal.ledger.pendingFeeSolLamports = (
    BigInt(journal.ledger.pendingFeeSolLamports || 0)
      + realizedFeeSol
      + convertedFees.realizedFeeSolLamports
  ).toString();

  const freshPool = await loadPool(connection);
  const freshActive = await getActiveBinVerified(freshPool);
  const freshTight = await positionOrNull(connection, freshPool, journal.positions.tight.address);
  if (!freshTight) throw new Error('tight_position_missing_during_wide_coverage_repair');
  const finalPlan = solveWideUpperBin({
    tokenAmount: Number(atomicToUi(redeployXRaw, freshPool.tokenX.mint.decimals))
      * observedDistributionFactor,
    spotTerminalPrincipalSol: positionTerminalPrincipalSol(
      freshTight.positionData,
      freshPool.tokenX.mint.decimals,
      freshPool.tokenY.mint.decimals,
    ),
    requiredTargetSol: requiredCampaignTargetSol(journal),
    executionCostAllowanceSol: TERMINAL_EXECUTION_ALLOWANCE_SOL,
    activeBinId: Number(freshActive.binId),
    activePrice: Number(freshActive.pricePerToken),
    binStep: Number(freshPool.lbPair.binStep),
  });
  if (!finalPlan) throw new Error('post_close_principal_only_terminal_coverage_infeasible');
  const replacement = derivePositionKeypair(wallet, 'wide', generation);
  await createWidePosition(
    connection,
    freshPool,
    wallet,
    journal,
    { recoveryPosition: { minBinId: finalPlan.lowerBinId, maxBinId: finalPlan.upperBinId } },
    replacement,
    redeployXRaw,
    0n,
    generation,
  );
  journal.retargets ||= [];
  journal.retargets.push({
    role: 'wide', generation, reason: repairReason,
    priorPosition: wide.publicKey.toBase58(), replacementPosition: replacement.publicKey.toBase58(),
    activeBinId: Number(freshActive.binId), lowerBinId: finalPlan.lowerBinId,
    upperBinId: finalPlan.upperBinId, proof: finalPlan,
    observedDistributionFactor, at: new Date().toISOString(),
  });
  atomicWriteJson(STATE_FILE, journal);
  const confirmedWide = await positionOrNull(connection, await loadPool(connection), replacement.publicKey);
  const confirmedPool = await loadPool(connection);
  const confirmedTight = await positionOrNull(connection, confirmedPool, journal.positions.tight.address);
  const confirmedProof = terminalProofForPositions(confirmedPool, journal, confirmedWide, confirmedTight);
  journal.terminalCoverageProof = { ...confirmedProof, verifiedAt: new Date().toISOString() };
  journal.coverageRepairBlocked = !confirmedProof.passes;
  atomicWriteJson(STATE_FILE, journal);
  if (!confirmedProof.passes) throw new Error('confirmed_wide_terminal_coverage_proof_failed');
  return true;
}

async function ownerMintDeltaForSignature(connection, signature, owner, mint) {
  const transaction = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!transaction?.meta) throw new Error(`coverage_recovery_transaction_missing:${signature}`);
  const amountByIndex = (balances) => new Map((balances || [])
    .filter((balance) => balance.owner === owner && balance.mint === mint)
    .map((balance) => [balance.accountIndex, BigInt(balance.uiTokenAmount.amount)]));
  const before = amountByIndex(transaction.meta.preTokenBalances);
  const after = amountByIndex(transaction.meta.postTokenBalances);
  const indexes = new Set([...before.keys(), ...after.keys()]);
  return [...indexes].reduce(
    (total, index) => total + (after.get(index) || 0n) - (before.get(index) || 0n),
    0n,
  );
}

async function recoverInterruptedWideCoverage(connection, pool, wallet, journal, tight) {
  const generation = Number(journal.positions.wide.generation || 0) + 1;
  const closePrefixes = [
    `wide_g${generation}_coverage_close_`,
    `wide_g${generation}_retarget_close_`,
  ];
  const signatures = Object.entries(journal.stages)
    .filter(([name, stage]) => (
      closePrefixes.some((prefix) => name.startsWith(prefix))
        && ['confirmed', 'chain_confirmed', 'reconciled'].includes(stage.status)
    ))
    .map(([, stage]) => stage.signature);
  if (!signatures.length) throw new Error('missing_confirmed_wide_recovery_close_evidence');
  let recoveredXRaw = 0n;
  for (const signature of signatures) {
    recoveredXRaw += await ownerMintDeltaForSignature(
      connection,
      signature,
      CAMPAIGN.owner,
      CAMPAIGN.sparkyMint,
    );
  }
  if (recoveredXRaw <= 0n) throw new Error('wide_recovery_token_delta_not_positive');
  let replacementGeneration = Number(journal.wideRecovery?.sourceGeneration) === generation
    ? Number(journal.wideRecovery.replacementGeneration)
    : generation;
  let replacement = derivePositionKeypair(wallet, 'wide', replacementGeneration);
  let workingPool = pool;
  let existingReplacement = await positionOrNull(connection, workingPool, replacement.publicKey);
  if (existingReplacement) {
    // A partially created replacement cannot be assumed to have the correct
    // range. Return it to wallet inventory, then solve again from fresh chain
    // state. No token-agnostic width or price-multiple fallback is permitted.
    await closePositions(
      connection,
      workingPool,
      wallet,
      journal,
      [existingReplacement],
      `wide_g${generation}_partial_replacement_close`,
    );
    replacementGeneration += 1;
    journal.wideRecovery = {
      sourceGeneration: generation,
      replacementGeneration,
      reason: 'partial_replacement_closed_for_exact_replan',
      recordedAt: new Date().toISOString(),
    };
    atomicWriteJson(STATE_FILE, journal);
    replacement = derivePositionKeypair(wallet, 'wide', replacementGeneration);
    workingPool = await loadPool(connection);
    existingReplacement = null;
  }
  const existingXRaw = existingReplacement
    ? positionInventory(existingReplacement).tokenXRaw
    : 0n;
  const walletState = await walletSnapshot(connection, wallet.publicKey);
  const pendingFeeXRaw = BigInt(journal.ledger.pendingFeeXRaw || 0);
  const walletPrincipalXRaw = deployableCampaignTokenRaw(walletState.sparkyRaw, pendingFeeXRaw);
  const recoverablePrincipalXRaw = existingXRaw + walletPrincipalXRaw;
  if (recoverablePrincipalXRaw <= 0n) throw new Error('wide_recovery_wallet_inventory_missing');
  const freshActive = await getActiveBinVerified(workingPool);
  const freshActiveBinId = Number(freshActive.binId);
  const freshTight = await positionOrNull(connection, workingPool, journal.positions.tight.address);
  if (!freshTight) throw new Error('tight_position_missing_during_exact_wide_recovery');
  const exactPlan = solveWideUpperBin({
    tokenAmount: Number(atomicToUi(recoverablePrincipalXRaw, workingPool.tokenX.mint.decimals)),
    spotTerminalPrincipalSol: positionTerminalPrincipalSol(
      freshTight.positionData,
      workingPool.tokenX.mint.decimals,
      workingPool.tokenY.mint.decimals,
    ),
    requiredTargetSol: requiredCampaignTargetSol(journal),
    executionCostAllowanceSol: TERMINAL_EXECUTION_ALLOWANCE_SOL,
    activeBinId: freshActiveBinId,
    activePrice: Number(freshActive.pricePerToken),
    binStep: Number(workingPool.lbPair.binStep),
  });
  if (!exactPlan) {
    throw new Error('exact_wide_recovery_plan_unavailable_retry_without_deploy');
  }
  const lowerBinId = exactPlan.lowerBinId;
  const upperBinId = exactPlan.upperBinId;
  await createWidePosition(
    connection,
    workingPool,
    wallet,
    journal,
    { recoveryPosition: { minBinId: lowerBinId, maxBinId: upperBinId } },
    replacement,
    recoverablePrincipalXRaw,
    0n,
    replacementGeneration,
  );
  const confirmedPool = await loadPool(connection);
  const [confirmedWide, confirmedTight] = await Promise.all([
    positionOrNull(connection, confirmedPool, replacement.publicKey),
    positionOrNull(connection, confirmedPool, tight.publicKey),
  ]);
  if (!confirmedWide || !confirmedTight) throw new Error('wide_recovery_position_reconciliation_failed');
  const proof = terminalProofForPositions(confirmedPool, journal, confirmedWide, confirmedTight);
  journal.retargets ||= [];
  journal.retargets.push({
    role: 'wide',
    generation: replacementGeneration,
    reason: 'interrupted_coverage_recovery_exact_principal_plan',
    replacementPosition: replacement.publicKey.toBase58(),
    recoveredTransactionDeltaXRaw: recoveredXRaw.toString(),
    recoverablePrincipalXRaw: recoverablePrincipalXRaw.toString(),
    excludedPendingFeeXRaw: pendingFeeXRaw.toString(),
    activeBinId: freshActiveBinId,
    lowerBinId,
    upperBinId,
    requestedExactPlan: exactPlan,
    proof,
    at: new Date().toISOString(),
  });
  journal.terminalCoverageProof = { ...proof, verifiedAt: new Date().toISOString() };
  journal.coverageRepairBlocked = !proof.passes;
  delete journal.wideRecovery;
  atomicWriteJson(STATE_FILE, journal);
  if (!proof.passes) throw new Error('recovered_wide_terminal_coverage_proof_failed');
  return true;
}

async function settleTargetExit(connection, pool, wallet, journal, positions, snapshot) {
  const positionAccounts = await Promise.all(
    positions.map((position) => connection.getAccountInfo(position.publicKey, 'confirmed')),
  );
  if (positionAccounts.some((account) => !account)) {
    throw new Error('target_exit_position_account_missing_before_close');
  }
  const refundableRentLamports = positionAccounts.reduce(
    (total, account) => total + BigInt(account.lamports),
    0n,
  );
  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, positions, 'target_close');
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const pendingFeeX = BigInt(journal.ledger.pendingFeeXRaw || 0);
  const pendingFeeSol = BigInt(journal.ledger.pendingFeeSolLamports || 0);
  const campaignTokenRaw = afterClose.sparkyRaw - before.sparkyRaw + pendingFeeX;
  if (campaignTokenRaw > 0n) {
    const order = await jupiterOrder(CAMPAIGN.sparkyMint, campaignTokenRaw, CAMPAIGN.owner);
    const executed = await executeJupiterOrder(connection, order, wallet, 'target_exit_swap');
    journal.stages.target_exit_swap = {
      status: 'chain_confirmed',
      signature: executed.signature,
      inputRaw: campaignTokenRaw.toString(),
      outputRaw: String(order.outAmount),
      chainEvidence: executed.chainEvidence,
      chainConfirmedAt: new Date().toISOString(),
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  const afterExit = await walletSnapshot(connection, wallet.publicKey);
  if (journal.stages.target_exit_swap?.status === 'chain_confirmed') {
    const exitSwapDelta = afterExit.lamports - afterClose.lamports;
    if (exitSwapDelta <= 0n) throw new Error('target_exit_swap_wallet_output_delta_not_positive');
    journal.stages.target_exit_swap.status = 'reconciled';
    journal.stages.target_exit_swap.reconciledAt = new Date().toISOString();
    journal.stages.target_exit_swap.postcondition = {
      ok: true,
      evidence: { walletLamportDelta: exitSwapDelta.toString() },
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  const grossExitProceeds = afterExit.lamports > before.lamports
    ? afterExit.lamports - before.lamports
    : 0n;
  const excludedRent = grossExitProceeds < refundableRentLamports
    ? grossExitProceeds
    : refundableRentLamports;
  const exitProceeds = grossExitProceeds - excludedRent + pendingFeeSol;
  journal.ledger.excludedRentRefundLamports = (
    BigInt(journal.ledger.excludedRentRefundLamports || 0) + excludedRent
  ).toString();
  const retainedBasisSol = campaignBasisSol(journal);
  const sweepLamports = exitProfitSweepLamports(exitProceeds, retainedBasisSol);
  const sweepSignature = await transferLamports(
    connection,
    wallet,
    CAMPAIGN.profitWallet,
    sweepLamports,
    journal,
    'target_exit_profit_sweep',
  );
  journal.status = 'closed';
  journal.closedAt = new Date().toISOString();
  journal.ledger.pendingFeeXRaw = '0';
  journal.ledger.pendingFeeSolLamports = '0';
  journal.ledger.exitSettlement = {
    snapshot,
    grossExitProceedsLamports: grossExitProceeds.toString(),
    excludedRentRefundLamports: excludedRent.toString(),
    exitProceedsLamports: exitProceeds.toString(),
    entryBasisRetainedLamports: String(Math.round(retainedBasisSol * LAMPORTS_PER_SOL)),
    profitSweptLamports: sweepLamports.toString(),
    sweepSignature,
  };
  atomicWriteJson(STATE_FILE, journal);
}

async function tick(connection, wallet) {
  const journal = loadOrCreateJournal();
  if (journal.status !== 'active') throw new Error(`campaign_not_active:${journal.status}`);
  await reconcileOutstandingStages(connection, journal);
  reconcileUnaccountedFeeSwapStages(journal);
  const pool = await loadPool(connection);
  const positions = (await Promise.all(
    Object.values(journal.positions).map((record) => positionOrNull(connection, pool, record.address)),
  )).filter(Boolean);
  if (positions.length !== 2) {
    const tight = positions.find(
      (position) => position.publicKey.toBase58() === journal.positions.tight.address,
    );
    const wideExists = positions.some(
      (position) => position.publicKey.toBase58() === journal.positions.wide.address,
    );
    if (positions.length === 1 && tight && !wideExists) {
      await recoverInterruptedWideCoverage(connection, pool, wallet, journal, tight);
      const recovered = loadOrCreateJournal();
      recovered.lastSuccessfulTickAt = new Date().toISOString();
      delete recovered.lastError;
      atomicWriteJson(STATE_FILE, recovered);
      return recovered;
    }
    throw new Error('managed_position_count_mismatch');
  }
  const fundedWide = positions.find(
    (position) => position.publicKey.toBase58() === journal.positions.wide.address,
  );
  if (!fundedWide) throw new Error('managed_wide_position_missing_before_residual_reconciliation');
  await deployWideWalletResidual(connection, pool, wallet, journal, fundedWide);
  let snapshot = await executableSnapshot(connection, pool, journal);
  journal.lastSnapshot = snapshot;
  atomicWriteJson(STATE_FILE, journal);
  if (snapshot.targetReached) {
    await settleTargetExit(connection, pool, wallet, journal, positions, snapshot);
    const settled = loadOrCreateJournal();
    settled.lastSuccessfulTickAt = new Date().toISOString();
    delete settled.lastError;
    atomicWriteJson(STATE_FILE, settled);
    return settled;
  }

  const liveWide = positions.find(
    (position) => position.publicKey.toBase58() === journal.positions.wide.address,
  );
  const liveTight = positions.find(
    (position) => position.publicKey.toBase58() === journal.positions.tight.address,
  );
  journal.terminalCoverageProof = {
    ...terminalProofForPositions(pool, journal, liveWide, liveTight),
    verifiedAt: new Date().toISOString(),
  };
  atomicWriteJson(STATE_FILE, journal);
  const latestWidePlacement = (journal.retargets || []).findLast((record) => (
    record.role === 'wide'
      && record.replacementPosition === journal.positions.wide.address
  ));
  const fallbackWideNeedsOptimization = latestWidePlacement?.reason
    === 'interrupted_coverage_recovery_from_confirmed_transaction_deltas';
  if (!journal.terminalCoverageProof.passes || fallbackWideNeedsOptimization) {
    await repairWideTerminalCoverage(
      connection,
      pool,
      wallet,
      journal,
      liveWide,
      liveTight,
      { forceOptimize: fallbackWideNeedsOptimization },
    );
    const repaired = loadOrCreateJournal();
    repaired.lastSuccessfulTickAt = new Date().toISOString();
    delete repaired.lastError;
    atomicWriteJson(STATE_FILE, repaired);
    return repaired;
  }

  const hasFees = positions.some((position) => {
    const inventory = positionInventory(position);
    return inventory.feeXRaw > 0n || inventory.feeYRaw > 0n;
  });
  const hasPendingFees = BigInt(journal.ledger.pendingFeeXRaw || 0) > 0n
    || BigInt(journal.ledger.pendingFeeSolLamports || 0) > 0n;
  const lastFeeActionAt = Date.parse(journal.ledger.lastFeeActionAt || 0);
  const feeIntervalElapsed = !Number.isFinite(lastFeeActionAt)
    || Date.now() - lastFeeActionAt >= MIN_FEE_CLAIM_INTERVAL_MS;
  const feeValueEconomical = snapshot.unclaimedFeeValueSol >= MIN_FEE_CLAIM_VALUE_SOL;
  if (snapshot.breakEvenReached && (hasFees || hasPendingFees)
      && feeIntervalElapsed && feeValueEconomical) {
    await claimFees(connection, pool, wallet, journal, positions);
    journal.ledger.lastFeeActionAt = new Date().toISOString();
    atomicWriteJson(STATE_FILE, journal);
    snapshot = await executableSnapshot(connection, await loadPool(connection), journal);
    journal.lastSnapshot = snapshot;
    atomicWriteJson(STATE_FILE, journal);
    if (snapshot.targetReached) {
      await settleTargetExit(connection, await loadPool(connection), wallet, journal, positions, snapshot);
      const settled = loadOrCreateJournal();
      settled.lastSuccessfulTickAt = new Date().toISOString();
      delete settled.lastError;
      atomicWriteJson(STATE_FILE, settled);
      return settled;
    }
  }
  const feeSweep = await sweepProvenFeesIfEligible(connection, wallet, journal, snapshot);
  if (feeSweep) {
    snapshot = await executableSnapshot(connection, await loadPool(connection), journal);
    journal.lastSnapshot = snapshot;
  }

  const wideState = snapshot.positions.find((position) => position.strategy === 'BidAsk');
  const tightState = snapshot.positions.find((position) => position.strategy === 'Spot');
  const retargets = Array.isArray(journal.retargets) ? journal.retargets : [];
  const nowMs = Date.now();
  const lastRetargetAt = (role) => retargets.findLast((record) => record.role === role)?.at
    || journal.migratedAt;
  journal.retargetGuards ||= {};
  const wideGuard = retargetGuardDecision({
    role: 'wide',
    range: wideState?.rangeState || 'missing',
    activeBinId: snapshot.activeBinId,
    lowerBinId: journal.positions.wide.lowerBinId,
    upperBinId: journal.positions.wide.upperBinId,
    previous: journal.retargetGuards.wide,
    retargets,
    positionStartedAt: lastRetargetAt('wide'),
    nowMs,
  });
  const tightGuard = retargetGuardDecision({
    role: 'tight',
    range: tightState?.rangeState || 'missing',
    activeBinId: snapshot.activeBinId,
    lowerBinId: journal.positions.tight.lowerBinId,
    upperBinId: journal.positions.tight.upperBinId,
    previous: journal.retargetGuards.tight,
    retargets,
    positionStartedAt: lastRetargetAt('tight'),
    nowMs,
  });
  journal.retargetGuards.wide = wideGuard;
  journal.retargetGuards.tight = tightGuard;
  journal.rangeAlerts = {
    observedAt: snapshot.observedAt,
    wide: wideState?.rangeState || 'missing',
    tight: tightState?.rangeState || 'missing',
    attentionRequired: [wideState, tightState].some(
      (position) => position && position.rangeState !== 'in_range'),
    retargetRequired: wideGuard.shouldRetarget || tightGuard.shouldRetarget,
  };
  atomicWriteJson(STATE_FILE, journal);
  const widePosition = positions.find(
    (position) => position.publicKey.toBase58() === journal.positions.wide.address,
  );
  const tightPosition = positions.find(
    (position) => position.publicKey.toBase58() === journal.positions.tight.address,
  );
  if (wideGuard.shouldRetarget && widePosition) {
    await retargetOutOfRangePosition(
      connection,
      await loadPool(connection),
      wallet,
      journal,
      'wide',
      widePosition,
    );
  }
  if (tightGuard.shouldRetarget && tightPosition) {
    await retargetOutOfRangePosition(
      connection,
      await loadPool(connection),
      wallet,
      journal,
      'tight',
      tightPosition,
    );
  }
  journal.lastSuccessfulTickAt = new Date().toISOString();
  journal.controllerHealth = {
    status: 'healthy',
    pid: process.pid,
    verifiedAt: journal.lastSuccessfulTickAt,
    actionBlocked: false,
  };
  delete journal.lastError;
  atomicWriteJson(STATE_FILE, journal);
  return journal;
}

function publicStatus(journal) {
  if (!journal) return { status: 'not_started', stateFile: STATE_FILE, campaign: CAMPAIGN };
  return {
    status: journal.status,
    stateFile: STATE_FILE,
    campaign: journal.campaign,
    positions: journal.positions,
    lastSnapshot: journal.lastSnapshot,
    rangeAlerts: journal.rangeAlerts,
    migratedAt: journal.migratedAt,
    closedAt: journal.closedAt,
    ledger: journal.ledger,
    stages: journal.stages,
    actions: journal.actions,
    controllerHealth: journal.controllerHealth,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'status') {
    process.stdout.write(`${JSON.stringify(publicStatus(readJournal()), null, 2)}\n`);
    return;
  }
  if (['migrate', 'tick', 'run'].includes(args.mode) && args.confirmation !== LIVE_CONFIRMATION) {
    throw new Error('live_confirmation_phrase_missing');
  }
  const releaseControllerLock = ['migrate', 'tick', 'run'].includes(args.mode)
    ? acquireControllerLock()
    : () => {};
  const shutdown = () => {
    releaseControllerLock();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try {
  const wallet = keypairFromText(await readStdin());
  const connection = new Connection(RPC_URL, 'confirmed');
  const walletState = await walletSnapshot(connection, wallet.publicKey);
  const nativeSol = Number(walletState.lamports) / LAMPORTS_PER_SOL;
  if (nativeSol < MIN_ACTION_NATIVE_SOL) {
    throw new Error('insufficient_native_sol_safety_buffer');
  }
  if (nativeSol < PREFERRED_NATIVE_SOL) {
    const journal = loadOrCreateJournal();
    journal.nativeReserveWarning = {
      observedAt: new Date().toISOString(),
      nativeSol,
      preferredNativeSol: PREFERRED_NATIVE_SOL,
      hardActionFloorSol: MIN_ACTION_NATIVE_SOL,
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  if (args.mode === 'preflight') {
    process.stdout.write(`${JSON.stringify(await preflightMigration(connection, wallet), null, 2)}\n`);
    return;
  }
  if (args.mode === 'migrate') {
    const existing = loadOrCreateJournal();
    const preflight = existing.preflight || await preflightMigration(connection, wallet);
    process.stdout.write(`${JSON.stringify(publicStatus(await migrate(connection, wallet, preflight)), null, 2)}\n`);
    return;
  }
  if (args.mode === 'tick') {
    process.stdout.write(`${JSON.stringify(publicStatus(await tick(connection, wallet)), null, 2)}\n`);
    return;
  }
  while (true) {
    try {
      const journal = loadOrCreateJournal();
      if (journal.status === 'not_migrated' || journal.status === 'migrating') {
        const preflight = journal.preflight || await preflightMigration(connection, wallet);
        await migrate(connection, wallet, preflight);
      } else if (journal.status === 'active') {
        await tick(connection, wallet);
      } else if (journal.status === 'closed') {
        process.stdout.write(`${JSON.stringify(publicStatus(journal), null, 2)}\n`);
        return;
      }
    } catch (error) {
      const journal = loadOrCreateJournal();
      journal.lastError = {
        at: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      };
      journal.controllerHealth = {
        status: 'reconciling_error',
        pid: process.pid,
        verifiedAt: new Date().toISOString(),
        actionBlocked: true,
        blockedReason: journal.lastError.message,
      };
      atomicWriteJson(STATE_FILE, journal);
    }
    await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000));
  }
  } finally {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    releaseControllerLock();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;
    process.stdout.write(`${JSON.stringify({
      status: 'failed', error: message, stack, stateFile: STATE_FILE,
    }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
