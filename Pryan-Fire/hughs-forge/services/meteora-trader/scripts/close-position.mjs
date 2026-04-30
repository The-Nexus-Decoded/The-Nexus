#!/usr/bin/env node
/**
 * Close a Meteora DLMM position.
 *
 * Input: JSON payload on stdin or DLMM_CLOSE_PAYLOAD env var.
 * Output: single JSON object on stdout.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function loadSolanaDeps() {
  const { Connection, Keypair, PublicKey, sendAndConfirmTransaction } = require('@solana/web3.js');
  const { BN } = require('@coral-xyz/anchor');
  const dlmmModule = require('@meteora-ag/dlmm');
  const DLMM = dlmmModule.default || dlmmModule;
  return { Connection, Keypair, PublicKey, sendAndConfirmTransaction, BN, DLMM };
}

function readPayload() {
  const raw = process.env.DLMM_CLOSE_PAYLOAD || fs.readFileSync(0, 'utf8');
  if (!raw || !raw.trim()) throw new Error('missing_payload');
  return JSON.parse(raw);
}

function loadKeypair(walletPath, Keypair) {
  const parsed = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const secret = Array.isArray(parsed) ? parsed : parsed.secretKey;
  if (!Array.isArray(secret)) throw new Error('wallet_file_must_be_secret_key_array');
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function writeResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function asTxArray(txs) {
  return Array.isArray(txs) ? txs : [txs];
}

function tokenMetadata(positionData) {
  const candidates = [
    {
      mint: positionData.mint_x,
      symbol: positionData.token_x_symbol || positionData.symbol_x || 'X',
      decimals: Number(positionData.decimals_x ?? positionData.token_x_decimals ?? (positionData.mint_x === USDC_MINT ? 6 : 9)),
    },
    {
      mint: positionData.mint_y,
      symbol: positionData.token_y_symbol || positionData.symbol_y || 'Y',
      decimals: Number(positionData.decimals_y ?? positionData.token_y_decimals ?? (positionData.mint_y === USDC_MINT ? 6 : 9)),
    },
  ];
  const seen = new Set();
  return candidates.filter((asset) => {
    if (!asset.mint || seen.has(asset.mint)) return false;
    seen.add(asset.mint);
    return true;
  });
}

async function tokenBalanceAtoms(connection, owner, mintAddress, PublicKey) {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(mintAddress) }, 'confirmed');
  return accounts.value.reduce((total, account) => {
    const amount = account.account.data?.parsed?.info?.tokenAmount?.amount || '0';
    return total + BigInt(amount);
  }, 0n);
}

async function snapshotBalances(connection, owner, assets, PublicKey) {
  const balances = {};
  for (const asset of assets) {
    // DLMM positions use SPL token accounts. The SOL_MINT address represents
    // wrapped SOL (WSOL), not native lamports; native wallet balance includes
    // rent refunds, fees, and unrelated SOL movement, so it must not feed the
    // post-close swap amount.
    balances[asset.mint] = await tokenBalanceAtoms(connection, owner, asset.mint, PublicKey);
  }
  return balances;
}

function postCloseAssets(assets, beforeBalances, afterBalances) {
  return assets.map((asset) => {
    const before = beforeBalances[asset.mint] ?? 0n;
    const after = afterBalances[asset.mint] ?? 0n;
    const delta = after - before;
    return {
      mint: asset.mint,
      symbol: asset.symbol,
      decimals: Number.isFinite(asset.decimals) ? asset.decimals : (asset.mint === USDC_MINT ? 6 : 9),
      before_atoms: before.toString(),
      after_atoms: after.toString(),
      delta_atoms: delta > 0n ? delta.toString() : '0',
    };
  }).filter((asset) => asset.delta_atoms !== '0');
}

try {
  const payload = readPayload();
  const positionData = payload.position || payload.trigger?.position || {};
  const execution = payload.execution || {};

  const positionAddress = positionData.position || payload.position_pubkey;
  const poolAddress = payload.pool || positionData.pool || positionData.lb_pair || payload.pool_pubkey;
  if (!positionAddress) throw new Error('missing_position');
  if (!poolAddress) throw new Error('missing_pool');

  const rpcUrl = execution.solana_rpc_url || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const walletPath = execution.wallet_path || process.env.TRADING_WALLET_PATH || process.env.WALLET_KEYPAIR_PATH;
  if (!walletPath) throw new Error('missing_wallet_path');

  const { Connection, Keypair, PublicKey, sendAndConfirmTransaction, BN, DLMM } = loadSolanaDeps();
  const connection = new Connection(rpcUrl, 'confirmed');
  const wallet = loadKeypair(walletPath, Keypair);

  const expectedOwner = payload.wallet?.address || execution.owner_public_key || process.env.TRADING_WALLET_PUBLIC_KEY;
  if (expectedOwner && expectedOwner !== String(wallet.publicKey)) {
    throw new Error(`wallet_owner_mismatch:${wallet.publicKey}`);
  }

  const trackedAssets = tokenMetadata(positionData);
  const beforeBalances = await snapshotBalances(connection, wallet.publicKey, trackedAssets, PublicKey);

  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress));
  const positions = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);
  const userPosition = positions.userPositions.find((pos) =>
    pos.publicKey.equals(new PublicKey(positionAddress))
  );

  if (!userPosition) throw new Error('position_not_found_for_wallet_pool');

  const binIds = (userPosition.positionData?.positionBinData || [])
    .map((bin) => Number(bin.binId))
    .filter((binId) => Number.isFinite(binId));

  let transactions;
  if (binIds.length > 0) {
    transactions = await dlmmPool.removeLiquidity({
      position: userPosition.publicKey,
      user: wallet.publicKey,
      fromBinId: Math.min(...binIds),
      toBinId: Math.max(...binIds),
      bps: new BN(10_000),
      shouldClaimAndClose: true,
    });
  } else {
    transactions = [await dlmmPool.closePosition({ owner: wallet.publicKey, position: userPosition })];
  }

  const signatures = [];
  for (const tx of asTxArray(transactions)) {
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { skipPreflight: false, commitment: 'confirmed' }
    );
    signatures.push(signature);
  }

  const afterBalances = await snapshotBalances(connection, wallet.publicKey, trackedAssets, PublicKey);

  writeResult({
    success: true,
    position: positionAddress,
    pool: poolAddress,
    wallet: String(wallet.publicKey),
    signatures,
    post_close_assets: postCloseAssets(trackedAssets, beforeBalances, afterBalances),
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  writeResult({ success: false, error: message });
  process.exit(1);
}
