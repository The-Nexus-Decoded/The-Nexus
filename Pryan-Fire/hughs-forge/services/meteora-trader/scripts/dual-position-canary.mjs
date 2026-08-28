#!/usr/bin/env node
/**
 * Bounded live canary for The-Nexus #477.
 *
 * Withdraws a bounded, explicitly selected slice of the configured Sparky position without claiming or
 * swapping, then opens two token-X-only child positions from the withdrawn
 * inventory using the latest validated optimizer split: 95% wide BidAsk and
 * 5% tight Spot, with no loose token reserve. This is a mechanics canary, not a
 * claim that the full campaign target is reachable inside the 70-bin test
 * range.
 *
 * The wallet secret is accepted only on stdin. No secret or derived position
 * seed is written to disk or output. The public operation journal is stored
 * outside the repository when this file is deployed to the secure runtime.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dependencyPackage = process.env.METEORA_NODE_MODULES_PACKAGE_JSON;
const require = createRequire(
  dependencyPackage ? pathToFileURL(dependencyPackage) : import.meta.url,
);
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
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');

const POOL_ADDRESS = 'D2XeJBX5shvpdec9TspZzvvC6M78UAUfn165VeiPLvhK';
const ROOT_POSITION = 'HWSuro4P1PguyhfydtdGS1vv5FPeRarRJfVrb27A48CB';
const OWNER_ADDRESS = 'sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb';
const SPARKY_MINT = '3vSD9xyKCfRBpP3uDEUJaPyWGNWZDFkv4C4qHbjLpump';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const DEFAULT_WITHDRAW_BPS = 1_000;
const MIN_WITHDRAW_BPS = 100;
const MAX_WITHDRAW_BPS = 2_000;
const RECOVERY_PCT = 95n;
const FEE_PCT = 5n;
const RESERVE_PCT = 0n;
const RECOVERY_BIN_COUNT = 70;
const FEE_BIN_COUNT = 32;
const MAX_ACTIVE_BIN_DRIFT = 3;
const MIN_NATIVE_SOL = 0.03;
const SLIPPAGE_PCT = 0.5;
const OPERATION_ID_PREFIX = 'sparky-dual-position-canary-v1';
const LIVE_CONFIRMATION = 'SPARKY-BOUNDED-DUAL-POSITION';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = process.env.METEORA_CANARY_STATE_FILE
  || path.resolve(moduleDir, '..', 'state', `${OPERATION_ID_PREFIX}.json`);

function parseArgs(argv) {
  const args = { mode: 'preflight', confirmation: null, withdrawBps: DEFAULT_WITHDRAW_BPS };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') args.mode = argv[++index];
    else if (argv[index] === '--confirm-live-mainnet') args.confirmation = argv[++index];
    else if (argv[index] === '--withdraw-bps') args.withdrawBps = Number(argv[++index]);
    else throw new Error(`unknown_argument:${argv[index]}`);
  }
  if (!['preflight', 'execute', 'status'].includes(args.mode)) {
    throw new Error('mode_must_be_preflight_execute_or_status');
  }
  if (!Number.isInteger(args.withdrawBps)
      || args.withdrawBps < MIN_WITHDRAW_BPS
      || args.withdrawBps > MAX_WITHDRAW_BPS) {
    throw new Error(`withdraw_bps_must_be_between_${MIN_WITHDRAW_BPS}_and_${MAX_WITHDRAW_BPS}`);
  }
  args.operationId = `${OPERATION_ID_PREFIX}-${args.withdrawBps}bps`;
  return args;
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(temporary, filePath);
}

function readJournal() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
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
  let wallet;
  if (bytes.length === 64) wallet = Keypair.fromSecretKey(Uint8Array.from(bytes));
  else if (bytes.length === 32) wallet = Keypair.fromSeed(Uint8Array.from(bytes));
  else throw new Error(`unsupported_wallet_secret_length:${bytes.length}`);
  bytes.fill(0);
  return wallet;
}

function derivePositionKeypair(wallet, operationId, role) {
  const secretMaterial = Buffer.from(wallet.secretKey);
  const seed = crypto.createHash('sha256')
    .update(secretMaterial)
    .update(operationId)
    .update(role)
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

function positionRaw(positionData, side) {
  const preferred = side === 'X'
    ? positionData.totalXAmountExcludeTransferFee
    : positionData.totalYAmountExcludeTransferFee;
  const fallback = side === 'X' ? positionData.totalXAmount : positionData.totalYAmount;
  return BigInt((preferred ?? fallback).toString());
}

async function tokenBalanceRaw(connection, owner, mint) {
  const response = await connection.getParsedTokenAccountsByOwner(owner, { mint }, 'confirmed');
  return response.value.reduce((sum, account) => (
    sum + BigInt(account.account.data.parsed.info.tokenAmount.amount)
  ), 0n);
}

async function walletSnapshot(connection, owner, sparkyMint, decimals) {
  const [lamports, sparkyRaw] = await Promise.all([
    connection.getBalance(owner, 'confirmed'),
    tokenBalanceRaw(connection, owner, sparkyMint),
  ]);
  return {
    lamports: lamports.toString(),
    sol: (lamports / LAMPORTS_PER_SOL).toFixed(9),
    sparkyRaw: sparkyRaw.toString(),
    sparky: atomicToUi(sparkyRaw, decimals),
  };
}

function positionSummary(position, xDecimals, yDecimals) {
  const xRaw = positionRaw(position.positionData, 'X');
  const yRaw = positionRaw(position.positionData, 'Y');
  return {
    address: position.publicKey.toBase58(),
    owner: position.positionData.owner.toBase58(),
    lowerBinId: Number(position.positionData.lowerBinId),
    upperBinId: Number(position.positionData.upperBinId),
    tokenXRaw: xRaw.toString(),
    tokenX: atomicToUi(xRaw, xDecimals),
    tokenYRaw: yRaw.toString(),
    tokenY: atomicToUi(yRaw, yDecimals),
  };
}

async function loadVerifiedContext(connection, wallet) {
  if (wallet.publicKey.toBase58() !== OWNER_ADDRESS) throw new Error('wallet_owner_mismatch');
  const pool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS));
  const tokenX = pool.tokenX.publicKey.toBase58();
  const tokenY = pool.tokenY.publicKey.toBase58();
  if (tokenX !== SPARKY_MINT || tokenY !== WSOL_MINT) {
    throw new Error(`pool_mint_mismatch:${tokenX}:${tokenY}`);
  }
  const positions = await pool.getPositionsByUserAndLbPair(wallet.publicKey);
  const root = positions.userPositions.find(
    (position) => position.publicKey.toBase58() === ROOT_POSITION,
  );
  if (!root) throw new Error('root_position_not_found_for_wallet_pool');
  if (!root.positionData.owner.equals(wallet.publicKey)) throw new Error('position_owner_mismatch');
  if (positionRaw(root.positionData, 'X') <= 0n) throw new Error('root_position_has_no_token_x');
  return {
    pool,
    root,
    activeBinId: Number(positions.activeBin.binId),
    xDecimals: Number(pool.tokenX.mint.decimals),
    yDecimals: Number(pool.tokenY.mint.decimals),
  };
}

async function refreshTransaction(connection, transaction) {
  const latest = await connection.getLatestBlockhash('confirmed');
  transaction.feePayer = new PublicKey(OWNER_ADDRESS);
  transaction.recentBlockhash = latest.blockhash;
  transaction.lastValidBlockHeight = latest.lastValidBlockHeight;
  return latest;
}

async function simulateSigned(connection, transaction, signers, label) {
  await refreshTransaction(connection, transaction);
  transaction.sign(...signers);
  if (!transaction.verifySignatures()) {
    const missing = transaction.signatures
      .filter((entry) => !entry.signature)
      .map((entry) => entry.publicKey.toBase58());
    const roster = transaction.signatures.map((entry) => (
      `${entry.publicKey.toBase58()}:${entry.signature ? 'present' : 'missing'}`
    ));
    throw new Error(
      `${label}_local_signature_verification_failed:missing=${missing.join(',') || 'none'}:roster=${roster.join(',')}`,
    );
  }
  const encoded = transaction.serialize().toString('base64');
  const response = await connection._rpcRequest('simulateTransaction', [encoded, {
    encoding: 'base64',
    commitment: 'confirmed',
    sigVerify: true,
  }]);
  if (response.error) throw new Error(`${label}_simulation_rpc_error:${response.error.message}`);
  if (response.result.value.err) {
    const logs = (response.result.value.logs || []).slice(-12).join('|');
    throw new Error(`${label}_simulation_failed:${JSON.stringify(response.result.value.err)}:${logs}`);
  }
  return {
    transaction,
    latest: {
      blockhash: transaction.recentBlockhash,
      lastValidBlockHeight: transaction.lastValidBlockHeight,
    },
    unitsConsumed: response.result.value.unitsConsumed ?? null,
  };
}

async function sendSimulated(connection, prepared, journal, stage, label) {
  const signature = bs58.encode(prepared.transaction.signature);
  journal.stages[stage] = {
    status: 'sending',
    signature,
    preparedAt: new Date().toISOString(),
    unitsConsumed: prepared.unitsConsumed,
  };
  atomicWriteJson(STATE_FILE, journal);
  const sentSignature = await connection.sendRawTransaction(prepared.transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
    preflightCommitment: 'confirmed',
  });
  if (sentSignature !== signature) throw new Error(`${label}_signature_changed_on_send`);
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: prepared.latest.blockhash,
    lastValidBlockHeight: prepared.latest.lastValidBlockHeight,
  }, 'confirmed');
  if (confirmation.value.err) {
    throw new Error(`${label}_confirmation_failed:${JSON.stringify(confirmation.value.err)}`);
  }
  journal.stages[stage].status = 'confirmed';
  journal.stages[stage].confirmedAt = new Date().toISOString();
  atomicWriteJson(STATE_FILE, journal);
  return signature;
}

async function buildRemovalTransactions(pool, wallet, root, withdrawBps) {
  const transactions = await pool.removeLiquidity({
    user: wallet.publicKey,
    position: root.publicKey,
    fromBinId: Number(root.positionData.lowerBinId),
    toBinId: Number(root.positionData.upperBinId),
    bps: new BN(withdrawBps),
    shouldClaimAndClose: false,
    skipUnwrapSOL: false,
  });
  return Array.isArray(transactions) ? transactions : [transactions];
}

async function buildOpenTransaction(pool, wallet, positionKeypair, amountRaw, role, activeBinId) {
  const isRecovery = role === 'recovery';
  const binCount = isRecovery ? RECOVERY_BIN_COUNT : FEE_BIN_COUNT;
  return pool.initializePositionAndAddLiquidityByStrategy({
    positionPubKey: positionKeypair.publicKey,
    user: wallet.publicKey,
    totalXAmount: new BN(amountRaw.toString()),
    totalYAmount: new BN(0),
    strategy: {
      minBinId: activeBinId,
      maxBinId: activeBinId + binCount - 1,
      strategyType: isRecovery ? StrategyType.BidAsk : StrategyType.Spot,
      singleSidedX: true,
    },
    slippage: SLIPPAGE_PCT,
  });
}

function allocationFromWithdrawal(withdrawnXRaw) {
  const recoveryRaw = withdrawnXRaw * RECOVERY_PCT / 100n;
  const feeRaw = withdrawnXRaw * FEE_PCT / 100n;
  const reserveRaw = withdrawnXRaw - recoveryRaw - feeRaw;
  if (reserveRaw > 1n) {
    throw new Error('unallocated_token_rounding_invariant_failed');
  }
  return { recoveryRaw, feeRaw, reserveRaw };
}

function publicPreflight({ context, walletBefore, rootBefore, removalCount, withdrawBps, operationId }) {
  const expectedXRaw = BigInt(rootBefore.tokenXRaw) * BigInt(withdrawBps) / 10_000n;
  const allocation = allocationFromWithdrawal(expectedXRaw);
  return {
    status: 'preflight-ok',
    operationId,
    executionMode: 'bounded-mainnet-canary',
    wallet: OWNER_ADDRESS,
    pool: POOL_ADDRESS,
    rootPosition: ROOT_POSITION,
    activeBinId: context.activeBinId,
    rootPositionBefore: rootBefore,
    walletBefore,
    withdrawalBps: withdrawBps,
    withdrawalPercent: withdrawBps / 100,
    expectedWithdrawal: {
      sparkyRaw: expectedXRaw.toString(),
      sparky: atomicToUi(expectedXRaw, context.xDecimals),
    },
    intendedAllocation: {
      recoveryPct: Number(RECOVERY_PCT),
      feePct: Number(FEE_PCT),
      protectedReservePct: Number(RESERVE_PCT),
      recoveryRaw: allocation.recoveryRaw.toString(),
      feeRaw: allocation.feeRaw.toString(),
      reserveRaw: allocation.reserveRaw.toString(),
    },
    recoveryPosition: {
      strategy: 'BidAsk',
      binCount: RECOVERY_BIN_COUNT,
      minBinId: context.activeBinId,
      maxBinId: context.activeBinId + RECOVERY_BIN_COUNT - 1,
    },
    feePosition: {
      strategy: 'Spot',
      binCount: FEE_BIN_COUNT,
      minBinId: context.activeBinId,
      maxBinId: context.activeBinId + FEE_BIN_COUNT - 1,
    },
    rootPositionRemainingPct: 100 - (withdrawBps / 100),
    withdrawalTransactionCount: removalCount,
    mechanicsCanaryOnly: true,
    fullCampaignTargetProven: false,
    profitRealizedByOpening: false,
  };
}

async function executeCanary(connection, wallet, initialContext, preflight) {
  if (readJournal()) throw new Error(`operation_journal_already_exists:${STATE_FILE}`);
  const recoveryKeypair = derivePositionKeypair(wallet, preflight.operationId, 'recovery');
  const feeKeypair = derivePositionKeypair(wallet, preflight.operationId, 'fee');
  const existingPositions = await initialContext.pool.getPositionsByUserAndLbPair(wallet.publicKey);
  const existingAddresses = new Set(
    existingPositions.userPositions.map((position) => position.publicKey.toBase58()),
  );
  if (existingAddresses.has(recoveryKeypair.publicKey.toBase58())
      || existingAddresses.has(feeKeypair.publicKey.toBase58())) {
    throw new Error('derived_canary_child_position_already_exists');
  }
  const journal = {
    schemaVersion: 1,
    operationId: preflight.operationId,
    status: 'started',
    startedAt: new Date().toISOString(),
    preflight,
    childPositions: {
      recovery: recoveryKeypair.publicKey.toBase58(),
      fee: feeKeypair.publicKey.toBase58(),
    },
    stages: {},
  };
  atomicWriteJson(STATE_FILE, journal);

  const freshContext = await loadVerifiedContext(connection, wallet);
  if (Math.abs(freshContext.activeBinId - initialContext.activeBinId) > MAX_ACTIVE_BIN_DRIFT) {
    throw new Error('active_bin_drifted_before_withdrawal');
  }
  const walletBefore = preflight.walletBefore;
  const removalTransactions = await buildRemovalTransactions(
    freshContext.pool,
    wallet,
    freshContext.root,
    preflight.withdrawalBps,
  );
  if (removalTransactions.length !== preflight.withdrawalTransactionCount) {
    throw new Error('withdrawal_transaction_shape_changed');
  }
  for (let index = 0; index < removalTransactions.length; index += 1) {
    const prepared = await simulateSigned(
      connection,
      removalTransactions[index],
      [wallet],
      `withdrawal_${index + 1}`,
    );
    await sendSimulated(
      connection,
      prepared,
      journal,
      `withdrawal_${index + 1}`,
      `withdrawal_${index + 1}`,
    );
  }

  const walletAfterWithdrawal = await walletSnapshot(
    connection,
    wallet.publicKey,
    new PublicKey(SPARKY_MINT),
    freshContext.xDecimals,
  );
  const withdrawnXRaw = BigInt(walletAfterWithdrawal.sparkyRaw) - BigInt(walletBefore.sparkyRaw);
  const expectedXRaw = BigInt(preflight.expectedWithdrawal.sparkyRaw);
  if (withdrawnXRaw <= 0n || withdrawnXRaw * 100n < expectedXRaw * 95n) {
    throw new Error(`withdrawn_token_delta_below_safety_floor:${withdrawnXRaw}`);
  }
  const allocation = allocationFromWithdrawal(withdrawnXRaw);
  journal.withdrawal = {
    walletAfter: walletAfterWithdrawal,
    actualSparkyRaw: withdrawnXRaw.toString(),
    actualSparky: atomicToUi(withdrawnXRaw, freshContext.xDecimals),
    allocation: {
      recoveryRaw: allocation.recoveryRaw.toString(),
      feeRaw: allocation.feeRaw.toString(),
      protectedReserveRaw: allocation.reserveRaw.toString(),
    },
  };
  journal.status = 'withdrawn';
  atomicWriteJson(STATE_FILE, journal);

  let activeBin = Number((await freshContext.pool.getActiveBin()).binId);
  if (Math.abs(activeBin - initialContext.activeBinId) > MAX_ACTIVE_BIN_DRIFT) {
    throw new Error('active_bin_drifted_before_recovery_open');
  }
  const recoveryTx = await buildOpenTransaction(
    freshContext.pool,
    wallet,
    recoveryKeypair,
    allocation.recoveryRaw,
    'recovery',
    activeBin,
  );
  const recoveryPrepared = await simulateSigned(
    connection,
    recoveryTx,
    [wallet, recoveryKeypair],
    'recovery_open',
  );
  await sendSimulated(connection, recoveryPrepared, journal, 'recovery_open', 'recovery_open');
  journal.status = 'recovery-opened';
  journal.recoveryRange = {
    minBinId: activeBin,
    maxBinId: activeBin + RECOVERY_BIN_COUNT - 1,
  };
  atomicWriteJson(STATE_FILE, journal);

  const afterRecoveryPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS));
  activeBin = Number((await afterRecoveryPool.getActiveBin()).binId);
  if (Math.abs(activeBin - initialContext.activeBinId) > MAX_ACTIVE_BIN_DRIFT) {
    throw new Error('active_bin_drifted_before_fee_open');
  }
  const feeTx = await buildOpenTransaction(
    afterRecoveryPool,
    wallet,
    feeKeypair,
    allocation.feeRaw,
    'fee',
    activeBin,
  );
  const feePrepared = await simulateSigned(connection, feeTx, [wallet, feeKeypair], 'fee_open');
  await sendSimulated(connection, feePrepared, journal, 'fee_open', 'fee_open');

  const finalPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS));
  const [rootAfter, recoveryAfter, feeAfter, walletAfter] = await Promise.all([
    finalPool.getPosition(new PublicKey(ROOT_POSITION)),
    finalPool.getPosition(recoveryKeypair.publicKey),
    finalPool.getPosition(feeKeypair.publicKey),
    walletSnapshot(
      connection,
      wallet.publicKey,
      new PublicKey(SPARKY_MINT),
      freshContext.xDecimals,
    ),
  ]);
  const unallocatedCanaryRaw = BigInt(walletAfter.sparkyRaw) - BigInt(walletBefore.sparkyRaw);
  if (unallocatedCanaryRaw > 2n) {
    throw new Error(`unallocated_canary_inventory:${unallocatedCanaryRaw}`);
  }
  journal.status = 'completed';
  journal.completedAt = new Date().toISOString();
  journal.result = {
    rootPosition: positionSummary(rootAfter, freshContext.xDecimals, freshContext.yDecimals),
    recoveryPosition: positionSummary(recoveryAfter, freshContext.xDecimals, freshContext.yDecimals),
    feePosition: positionSummary(feeAfter, freshContext.xDecimals, freshContext.yDecimals),
    walletAfter,
    unallocatedCanaryRaw: unallocatedCanaryRaw.toString(),
    unallocatedCanary: atomicToUi(unallocatedCanaryRaw, freshContext.xDecimals),
    profitRealized: false,
    principalOrProfitTransferred: false,
  };
  atomicWriteJson(STATE_FILE, journal);
  return journal;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'status') {
    const journal = readJournal();
    process.stdout.write(`${JSON.stringify(journal || { status: 'not-started' }, null, 2)}\n`);
    return;
  }
  if (args.mode === 'execute' && args.confirmation !== LIVE_CONFIRMATION) {
    throw new Error('live_confirmation_phrase_missing');
  }
  const wallet = keypairFromText(await readStdin());
  const connection = new Connection(RPC_URL, 'confirmed');
  const context = await loadVerifiedContext(connection, wallet);
  const walletBefore = await walletSnapshot(
    connection,
    wallet.publicKey,
    new PublicKey(SPARKY_MINT),
    context.xDecimals,
  );
  if (Number(walletBefore.sol) < MIN_NATIVE_SOL) throw new Error('insufficient_native_sol_safety_buffer');
  const rootBefore = positionSummary(context.root, context.xDecimals, context.yDecimals);
  const removalTransactions = await buildRemovalTransactions(
    context.pool,
    wallet,
    context.root,
    args.withdrawBps,
  );
  const simulations = [];
  for (let index = 0; index < removalTransactions.length; index += 1) {
    const prepared = await simulateSigned(
      connection,
      removalTransactions[index],
      [wallet],
      `withdrawal_preflight_${index + 1}`,
    );
    simulations.push({ transaction: index + 1, ok: true, unitsConsumed: prepared.unitsConsumed });
  }
  const preflight = publicPreflight({
    context,
    walletBefore,
    rootBefore,
    removalCount: removalTransactions.length,
    withdrawBps: args.withdrawBps,
    operationId: args.operationId,
  });
  preflight.withdrawalSimulations = simulations;
  if (args.mode === 'preflight') {
    process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
    return;
  }
  const journal = await executeCanary(connection, wallet, context, preflight);
  process.stdout.write(`${JSON.stringify(journal, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(`${JSON.stringify({ status: 'failed', error: message, stateFile: STATE_FILE }, null, 2)}\n`);
  process.exitCode = 1;
});
