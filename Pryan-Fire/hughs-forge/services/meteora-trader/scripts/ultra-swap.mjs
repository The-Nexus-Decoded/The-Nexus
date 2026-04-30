#!/usr/bin/env node
/**
 * Execute a prepared Jupiter Ultra post-close swap.
 *
 * Input: JSON payload on stdin or POST_CLOSE_SWAP_PAYLOAD env var.
 * Output: single JSON object on stdout.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadSolanaDeps() {
  const { Keypair, PublicKey, VersionedTransaction } = require('@solana/web3.js');
  return { Keypair, PublicKey, VersionedTransaction };
}

function readPayload() {
  const raw = process.env.POST_CLOSE_SWAP_PAYLOAD || fs.readFileSync(0, 'utf8');
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

function headers(execution) {
  const result = {
    'Content-Type': 'application/json',
    'User-Agent': 'OpenClaw-Hugh/1.0',
  };
  const apiKey = execution.jupiter_api_key || process.env.JUPITER_API_KEY;
  if (apiKey) result['x-api-key'] = apiKey;
  return result;
}

try {
  const payload = readPayload();
  const execution = payload.execution || {};
  const asset = payload.asset || {};
  const order = payload.ultra_order || {};

  const walletPath = execution.wallet_path || process.env.TRADING_WALLET_PATH || process.env.WALLET_KEYPAIR_PATH;
  if (!walletPath) throw new Error('missing_wallet_path');
  if (!order.transaction) throw new Error('missing_ultra_transaction');
  if (!order.requestId) throw new Error('missing_ultra_request_id');

  const { Keypair, PublicKey, VersionedTransaction } = loadSolanaDeps();
  const wallet = loadKeypair(walletPath, Keypair);

  const expectedOwner = payload.close_result?.wallet || payload.wallet?.address || execution.owner_public_key || process.env.TRADING_WALLET_PUBLIC_KEY;
  if (expectedOwner && !new PublicKey(expectedOwner).equals(wallet.publicKey)) {
    throw new Error(`wallet_owner_mismatch:${wallet.publicKey}`);
  }

  const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
  tx.sign([wallet]);
  const signedTransaction = Buffer.from(tx.serialize()).toString('base64');

  const endpoint = (execution.jupiter_ultra_endpoint || process.env.JUPITER_ULTRA_ENDPOINT || 'https://api.jup.ag/ultra/v1').replace(/\/$/, '');
  const response = await fetch(`${endpoint}/execute`, {
    method: 'POST',
    headers: headers(execution),
    body: JSON.stringify({ signedTransaction, requestId: order.requestId }),
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    writeResult({
      success: false,
      error: 'jupiter_ultra_execute_http_error',
      status_code: response.status,
      asset,
      request_id: order.requestId,
      response: body,
    });
    process.exit(1);
  }

  const status = body.status || body.result?.status;
  const signature = body.signature || body.result?.signature;
  if (status !== 'Success' || !signature) {
    writeResult({
      success: false,
      error: body.error || 'jupiter_ultra_execute_failed',
      status,
      asset,
      request_id: order.requestId,
      response: body,
    });
    process.exit(1);
  }

  writeResult({
    success: true,
    asset,
    request_id: order.requestId,
    signature,
    signatures: [signature],
    response: { status, signature },
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  writeResult({ success: false, error: message });
  process.exit(1);
}
