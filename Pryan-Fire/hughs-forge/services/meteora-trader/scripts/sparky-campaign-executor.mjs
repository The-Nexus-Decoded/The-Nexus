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
const MIN_NATIVE_SOL = 0.03;
const SLIPPAGE_PCT = 0.5;
const MIN_FEE_CLAIM_VALUE_SOL = 0.02;
const MIN_FEE_CLAIM_INTERVAL_MS = 15 * 60 * 1000;
const TRANSFER_FEE_BUFFER_LAMPORTS = 10_000n;
const TERMINAL_EXECUTION_ALLOWANCE_SOL = 0.005;
const RECOVERY_FALLBACK_PRICE_MULTIPLE = 8.5;
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

async function positionOrNull(connection, pool, address) {
  if (!address) return null;
  const publicKey = new PublicKey(address);
  if (!await connection.getAccountInfo(publicKey, 'confirmed')) return null;
  return pool.getPosition(publicKey);
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

async function reconcileSendingStage(connection, journal, stageName) {
  const stage = journal.stages[stageName];
  if (!stage || stage.status !== 'sending' || !stage.signature) return false;
  const result = await connection.getSignatureStatuses([stage.signature], { searchTransactionHistory: true });
  const status = result.value[0];
  if (!status) throw new Error(`stage_signature_not_found:${stageName}:${stage.signature}`);
  if (status.err) throw new Error(`stage_failed_on_chain:${stageName}:${JSON.stringify(status.err)}`);
  if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
    stage.status = 'confirmed';
    stage.reconciledAt = new Date().toISOString();
    atomicWriteJson(STATE_FILE, journal);
    return true;
  }
  throw new Error(`stage_still_pending:${stageName}:${stage.signature}`);
}

async function sendStage(connection, journal, stageName, transaction, signers) {
  const existing = journal.stages[stageName];
  if (existing?.status === 'confirmed') return existing.signature;
  if (existing?.status === 'sending') {
    await reconcileSendingStage(connection, journal, stageName);
    return journal.stages[stageName].signature;
  }
  const prepared = await simulateSigned(connection, transaction, signers, stageName);
  const signature = bs58.encode(prepared.transaction.signature);
  journal.stages[stageName] = {
    status: 'sending',
    signature,
    preparedAt: new Date().toISOString(),
    unitsConsumed: prepared.unitsConsumed,
  };
  atomicWriteJson(STATE_FILE, journal);
  const sent = await connection.sendRawTransaction(prepared.transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
    preflightCommitment: 'confirmed',
  });
  if (sent !== signature) throw new Error(`${stageName}_signature_changed_on_send`);
  const confirmation = await connection.confirmTransaction({ signature, ...prepared.latest }, 'confirmed');
  if (confirmation.value.err) throw new Error(`${stageName}_confirmation_failed:${JSON.stringify(confirmation.value.err)}`);
  journal.stages[stageName].status = 'confirmed';
  journal.stages[stageName].confirmedAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, journal);
  return signature;
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
  const activeBinId = Number((await pool.getActiveBin()).binId);
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
    await sendStage(connection, journal, `wide_g${generation}_create`, createTx, [wallet, wideKeypair]);
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
    const strategy = {
      minBinId: lower,
      maxBinId: upper,
      strategyType: StrategyType.BidAsk,
    };
    if (remainingYRaw === 0n) strategy.singleSidedX = true;
    const transactions = await pool.addLiquidityByStrategyChunkable({
      positionPubKey: wideKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount: new BN(remainingXRaw.toString()),
      totalYAmount: new BN(remainingYRaw.toString()),
      strategy,
      slippage: SLIPPAGE_PCT,
    });
    for (let index = 0; index < transactions.length; index += 1) {
      await sendStage(
        connection,
        journal,
        `wide_g${generation}_deposit_${remainingXRaw}_${remainingYRaw}_${index + 1}`,
        transactions[index],
        [wallet],
      );
    }
  }
  journal.positions.wide = {
    address: wideKeypair.publicKey.toBase58(),
    generation,
    strategy: 'BidAsk',
    lowerBinId: lower,
    upperBinId: upper,
  };
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
    );
  }
  const existing = await pool.getPosition(tightKeypair.publicKey);
  const existingInventory = positionInventory(existing);
  if (existingInventory.tokenXRaw === 0n && existingInventory.tokenYRaw === 0n
      && (tightXRaw > 0n || tightYRaw > 0n)) {
    const strategy = {
      minBinId: lower,
      maxBinId: upper,
      strategyType: StrategyType.Spot,
    };
    if (tightYRaw === 0n) strategy.singleSidedX = true;
    const transactions = await pool.addLiquidityByStrategyChunkable({
      positionPubKey: tightKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount: new BN(tightXRaw.toString()),
      totalYAmount: new BN(tightYRaw.toString()),
      strategy,
      slippage: SLIPPAGE_PCT,
    });
    for (let index = 0; index < transactions.length; index += 1) {
      await sendStage(
        connection,
        journal,
        `tight_g${generation}_deposit_${index + 1}`,
        transactions[index],
        [wallet],
      );
    }
  }
  journal.positions.tight = {
    address: tightKeypair.publicKey.toBase58(),
    generation,
    strategy: 'Spot',
    lowerBinId: lower,
    upperBinId: upper,
  };
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
      await sendStage(connection, journal, `root_close_${index + 1}`, transactions[index], [wallet]);
    }
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
  const liveBin = Number((await pool.getActiveBin()).binId);
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
    activeBinId: Number((await pool.getActiveBin()).binId),
  };
  atomicWriteJson(STATE_FILE, journal);
  return journal;
}

async function preflightMigrationAfterRootClose(connection, wallet, previous, liveBin) {
  const pool = await loadPool(connection);
  const active = Number((await pool.getActiveBin()).binId);
  if (active !== liveBin) throw new Error('active_bin_changed_during_replan');
  const oldRoot = plannerInput();
  const synthetic = {
    ...oldRoot,
    live: false,
    activeBinId: active,
    binStep: Number(pool.lbPair.binStep),
    activePrice: Number((await pool.getActiveBin()).pricePerToken),
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
  const query = new URLSearchParams({
    inputMint,
    outputMint,
    amount: BigInt(amountRaw).toString(),
    slippageBps: String(slippageBps),
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
  const query = new URLSearchParams({
    inputMint,
    outputMint,
    amount: BigInt(amountRaw).toString(),
    taker,
    slippageBps: String(slippageBps),
  });
  const response = await fetch(`${JUPITER_URL}/order?${query}`, { headers: jupiterHeaders() });
  const body = await response.json();
  if (!response.ok || !body.transaction || !body.requestId || !body.outAmount) {
    throw new Error(`jupiter_order_failed:${response.status}:${body.error || 'malformed_response'}`);
  }
  return body;
}

async function executeJupiterOrder(order, wallet) {
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
  return body;
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
  const activeBinId = Number((await pool.getActiveBin()).binId);
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
  if (realizedFeeX > 0n) {
    const order = await jupiterOrder(CAMPAIGN.sparkyMint, realizedFeeX, CAMPAIGN.owner);
    const executed = await executeJupiterOrder(order, wallet);
    journal.stages[`fee_swap_${Date.now()}`] = {
      status: 'confirmed',
      signature: executed.signature,
      requestId: order.requestId,
      inputRaw: realizedFeeX.toString(),
      outputRaw: String(order.outAmount),
      confirmedAt: new Date().toISOString(),
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  const afterSwap = await walletSnapshot(connection, wallet.publicKey);
  const transactionDelta = afterSwap.lamports - before.lamports;
  const netFeeLamports = transactionDelta + pendingFeeSol;
  journal.ledger.pendingFeeXRaw = '0';
  journal.ledger.pendingFeeSolLamports = '0';
  atomicWriteJson(STATE_FILE, journal);
  return netFeeLamports > 0n ? netFeeLamports : 0n;
}

async function transferLamports(connection, wallet, destination, lamports, journal, stageName) {
  if (lamports <= 0n) return null;
  const transaction = new Transaction().add(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(destination),
    lamports,
  }));
  return sendStage(connection, journal, stageName, transaction, [wallet]);
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
      await sendStage(
        connection,
        journal,
        `${prefix}_${position.publicKey.toBase58()}_${index + 1}`,
        transactions[index],
        [wallet],
      );
    }
  }
}

async function convertRetargetFeeXToSol(connection, wallet, journal, feeXRaw, stageName) {
  if (feeXRaw <= 0n) return { pendingFeeXRaw: 0n, realizedFeeSolLamports: 0n };
  const order = await jupiterOrder(CAMPAIGN.sparkyMint, feeXRaw, CAMPAIGN.owner);
  if (BigInt(order.outAmount) <= TRANSFER_FEE_BUFFER_LAMPORTS) {
    return { pendingFeeXRaw: feeXRaw, realizedFeeSolLamports: 0n };
  }
  const before = await walletSnapshot(connection, wallet.publicKey);
  const executed = await executeJupiterOrder(order, wallet);
  const after = await walletSnapshot(connection, wallet.publicKey);
  const realizedFeeSolLamports = after.lamports > before.lamports
    ? after.lamports - before.lamports
    : 0n;
  journal.stages[stageName] = {
    status: 'confirmed',
    signature: executed.signature,
    requestId: order.requestId,
    inputRaw: feeXRaw.toString(),
    outputRaw: realizedFeeSolLamports.toString(),
    confirmedAt: new Date().toISOString(),
  };
  return { pendingFeeXRaw: 0n, realizedFeeSolLamports };
}

async function retargetOutOfRangePosition(connection, pool, wallet, journal, role, position) {
  const currentRecord = journal.positions[role];
  const generation = Number(currentRecord.generation || 0) + 1;
  const priorWidth = currentRecord.upperBinId - currentRecord.lowerBinId + 1;
  const activeBinId = Number((await pool.getActiveBin()).binId);
  const state = rangeState(activeBinId, currentRecord.lowerBinId, currentRecord.upperBinId);
  if (!state.startsWith('out_')) return false;

  const inventory = positionInventory(position);
  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, [position], `${role}_g${generation}_retarget_close`);
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const receivedX = afterClose.sparkyRaw - before.sparkyRaw;
  const expectedX = inventory.tokenXRaw + inventory.feeXRaw;
  const principalXRaw = expectedX > 0n
    ? receivedX * inventory.tokenXRaw / expectedX
    : 0n;
  const realizedFeeXRaw = receivedX - principalXRaw;
  const receivedSol = afterClose.lamports > before.lamports ? afterClose.lamports - before.lamports : 0n;
  const principalYRaw = receivedSol < inventory.tokenYRaw ? receivedSol : inventory.tokenYRaw;
  const realizedFeeSol = receivedSol - principalYRaw;

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
    const executed = await executeJupiterOrder(order, wallet);
    const afterSwap = await walletSnapshot(connection, wallet.publicKey);
    const receivedFromSwap = afterSwap.sparkyRaw - beforeSwap.sparkyRaw;
    if (receivedFromSwap <= 0n) throw new Error(`${role}_retarget_sol_to_sparky_swap_empty`);
    redeployXRaw += receivedFromSwap;
    journal.stages[`${role}_g${generation}_retarget_swap`] = {
      status: 'confirmed',
      signature: executed.signature,
      requestId: order.requestId,
      inputRaw: swapInput.toString(),
      outputRaw: receivedFromSwap.toString(),
      confirmedAt: new Date().toISOString(),
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

async function repairWideTerminalCoverage(connection, pool, wallet, journal, wide, tight) {
  const currentProof = terminalProofForPositions(pool, journal, wide, tight);
  if (currentProof.passes) return false;
  const inventory = positionInventory(wide);
  const active = await pool.getActiveBin();
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
    tokenAmount: Number(atomicToUi(prospectiveXRaw, pool.tokenX.mint.decimals)),
    spotTerminalPrincipalSol: spotTerminal,
    requiredTargetSol: requiredCampaignTargetSol(journal),
    executionCostAllowanceSol: TERMINAL_EXECUTION_ALLOWANCE_SOL,
    activeBinId,
    activePrice: Number(active.pricePerToken),
    binStep: Number(pool.lbPair.binStep),
  });
  if (!plan) throw new Error('principal_only_terminal_coverage_infeasible');

  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, [wide], `wide_g${generation}_coverage_close`);
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const receivedX = afterClose.sparkyRaw - before.sparkyRaw;
  const expectedX = inventory.tokenXRaw + inventory.feeXRaw;
  const principalXRaw = expectedX > 0n ? receivedX * inventory.tokenXRaw / expectedX : 0n;
  const realizedFeeXRaw = receivedX - principalXRaw;
  const receivedSol = afterClose.lamports > before.lamports ? afterClose.lamports - before.lamports : 0n;
  const principalYRaw = receivedSol < inventory.tokenYRaw ? receivedSol : inventory.tokenYRaw;
  const realizedFeeSol = receivedSol - principalYRaw;
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
    const executed = await executeJupiterOrder(order, wallet);
    const afterSwap = await walletSnapshot(connection, wallet.publicKey);
    redeployXRaw += afterSwap.sparkyRaw - beforeSwap.sparkyRaw;
    journal.stages[`wide_g${generation}_coverage_swap`] = {
      status: 'confirmed', signature: executed.signature, requestId: order.requestId,
      inputRaw: (principalYRaw - TRANSFER_FEE_BUFFER_LAMPORTS).toString(),
      outputRaw: String(order.outAmount), confirmedAt: new Date().toISOString(),
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
  const freshActive = await freshPool.getActiveBin();
  const freshTight = await positionOrNull(connection, freshPool, journal.positions.tight.address);
  if (!freshTight) throw new Error('tight_position_missing_during_wide_coverage_repair');
  const finalPlan = solveWideUpperBin({
    tokenAmount: Number(atomicToUi(redeployXRaw, freshPool.tokenX.mint.decimals)),
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
  const existingReplacement = await positionOrNull(connection, pool, replacement.publicKey);
  const lowerBinId = existingReplacement
    ? Number(existingReplacement.positionData.lowerBinId)
    : activeBinId;
  const upperBinId = existingReplacement
    ? Number(existingReplacement.positionData.upperBinId)
    : activeBinId + width;
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
    role: 'wide', generation, reason: 'principal_only_terminal_coverage_repair',
    priorPosition: wide.publicKey.toBase58(), replacementPosition: replacement.publicKey.toBase58(),
    activeBinId: Number(freshActive.binId), lowerBinId: finalPlan.lowerBinId,
    upperBinId: finalPlan.upperBinId, proof: finalPlan, at: new Date().toISOString(),
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
  const prefix = `wide_g${generation}_coverage_close_`;
  const signatures = Object.entries(journal.stages)
    .filter(([name, stage]) => name.startsWith(prefix) && stage.status === 'confirmed')
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
  const walletState = await walletSnapshot(connection, wallet.publicKey);
  if (walletState.sparkyRaw < recoveredXRaw) throw new Error('wide_recovery_wallet_inventory_missing');
  const active = await pool.getActiveBin();
  const activeBinId = Number(active.binId);
  const width = Math.ceil(
    Math.log(RECOVERY_FALLBACK_PRICE_MULTIPLE)
      / Math.log(1 + Number(pool.lbPair.binStep) / 10_000),
  );
  const replacement = derivePositionKeypair(wallet, 'wide', generation);
  await createWidePosition(
    connection,
    pool,
    wallet,
    journal,
    { recoveryPosition: { minBinId: lowerBinId, maxBinId: upperBinId } },
    replacement,
    recoveredXRaw,
    0n,
    generation,
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
    generation,
    reason: 'interrupted_coverage_recovery_from_confirmed_transaction_deltas',
    replacementPosition: replacement.publicKey.toBase58(),
    recoveredXRaw: recoveredXRaw.toString(),
    activeBinId,
    lowerBinId,
    upperBinId,
    proof,
    at: new Date().toISOString(),
  });
  journal.terminalCoverageProof = { ...proof, verifiedAt: new Date().toISOString() };
  journal.coverageRepairBlocked = !proof.passes;
  atomicWriteJson(STATE_FILE, journal);
  if (!proof.passes) throw new Error('recovered_wide_terminal_coverage_proof_failed');
  return true;
}

async function settleTargetExit(connection, pool, wallet, journal, positions, snapshot) {
  const before = await walletSnapshot(connection, wallet.publicKey);
  await closePositions(connection, pool, wallet, journal, positions, 'target_close');
  const afterClose = await walletSnapshot(connection, wallet.publicKey);
  const pendingFeeX = BigInt(journal.ledger.pendingFeeXRaw || 0);
  const pendingFeeSol = BigInt(journal.ledger.pendingFeeSolLamports || 0);
  const campaignTokenRaw = afterClose.sparkyRaw - before.sparkyRaw + pendingFeeX;
  if (campaignTokenRaw > 0n) {
    const order = await jupiterOrder(CAMPAIGN.sparkyMint, campaignTokenRaw, CAMPAIGN.owner);
    const executed = await executeJupiterOrder(order, wallet);
    journal.stages.target_exit_swap = {
      status: 'confirmed',
      signature: executed.signature,
      inputRaw: campaignTokenRaw.toString(),
      outputRaw: String(order.outAmount),
      confirmedAt: new Date().toISOString(),
    };
    atomicWriteJson(STATE_FILE, journal);
  }
  const afterExit = await walletSnapshot(connection, wallet.publicKey);
  const exitProceeds = afterExit.lamports - before.lamports + pendingFeeSol;
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
  if (!journal.terminalCoverageProof.passes) {
    if (journal.coverageRepairBlocked) throw new Error('coverage_repair_blocked_after_failed_post_proof');
    await repairWideTerminalCoverage(connection, pool, wallet, journal, liveWide, liveTight);
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
    const netFeeLamports = await claimFees(connection, pool, wallet, journal, positions);
    if (netFeeLamports > 0n) {
      const netAfterTransferBuffer = netFeeLamports > TRANSFER_FEE_BUFFER_LAMPORTS
        ? netFeeLamports - TRANSFER_FEE_BUFFER_LAMPORTS
        : 0n;
      journal.ledger.cumulativeNetFeesEarnedLamports = (
        BigInt(journal.ledger.cumulativeNetFeesEarnedLamports || 0) + netAfterTransferBuffer
      ).toString();
      const sweepLamports = feeSweepLamports(netFeeLamports, true);
      const signature = await transferLamports(
        connection,
        wallet,
        CAMPAIGN.profitWallet,
        sweepLamports,
        journal,
        `fee_profit_sweep_${Date.now()}`,
      );
      journal.ledger.cumulativeFeesSweptLamports = (
        BigInt(journal.ledger.cumulativeFeesSweptLamports || 0) + sweepLamports
      ).toString();
      journal.ledger.feeSweeps.push({
        at: new Date().toISOString(),
        netFeeLamports: netFeeLamports.toString(),
        sweptLamports: sweepLamports.toString(),
        signature,
      });
      journal.ledger.lastFeeActionAt = new Date().toISOString();
      atomicWriteJson(STATE_FILE, journal);
    }
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
  const wallet = keypairFromText(await readStdin());
  const connection = new Connection(RPC_URL, 'confirmed');
  const walletState = await walletSnapshot(connection, wallet.publicKey);
  if (Number(walletState.lamports) / LAMPORTS_PER_SOL < MIN_NATIVE_SOL) {
    throw new Error('insufficient_native_sol_safety_buffer');
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
      atomicWriteJson(STATE_FILE, journal);
    }
    await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ status: 'failed', error: message, stateFile: STATE_FILE }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
