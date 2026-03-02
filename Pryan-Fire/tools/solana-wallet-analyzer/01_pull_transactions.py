#!/usr/bin/env python3
"""
Solana Wallet Analyzer - Pull Transactions

Pulls full transaction history for configured wallets from Helius.
Creates output directories if missing and writes data atomically.
"""

import os
import json
import time
import logging
import random
import string
from datetime import datetime
import urllib.request
import urllib.error

# ----------------------------
# Configuration & Environment
# ----------------------------

def load_env(env_path):
    """Load environment variables from a .env file (simple KEY=VALUE parsing)."""
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            key, _, value = line.partition('=')
            os.environ[key] = value

# Load .env from script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
load_env(os.path.join(script_dir, ".env"))

HELIUS_API_KEY = os.getenv("HELIUS_API_KEY")
if not HELIUS_API_KEY:
    raise RuntimeError("HELIUS_API_KEY is not set in environment or .env")

WALLET_ADDRESSES = []
WALLET_LABELS = []
for i in range(1, 4):
    addr = os.getenv(f"WALLET_{i}_ADDRESS")
    label = os.getenv(f"WALLET_{i}_LABEL", f"Wallet{i}")
    if not addr:
        raise RuntimeError(f"WALLET_{i}_ADDRESS is not set")
    WALLET_ADDRESSES.append(addr)
    WALLET_LABELS.append(label)

RPC_ENDPOINT = f"https://api.helius.xyz/rpc?api-key={HELIUS_API_KEY}"

# ----------------------------
# Logging Setup
# ----------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("WalletAnalyzer")

# ----------------------------
# Helper Functions
# ----------------------------

def atomic_write_json(data, path):
    """Atomically write data as JSON to a file using a temporary file then rename."""
    dir_path = os.path.dirname(path)
    os.makedirs(dir_path, exist_ok=True)
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    temp_path = os.path.join(dir_path, f"tmp{rand_suffix}.tmp")
    try:
        with open(temp_path, 'w') as f:
            json.dump(data, f)
        os.replace(temp_path, path)
    except Exception:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise

def rpc_call(payload):
    """Make a JSON-RPC call to Helius endpoint."""
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        RPC_ENDPOINT,
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response = resp.read().decode('utf-8')
            return json.loads(response)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise RuntimeError(f"HTTP {e.code}: {error_body}") from e
    except Exception as e:
        raise RuntimeError(f"Request failed: {e}") from e

def get_signatures(address, limit=100, before=None):
    """Fetch a page of signatures for an address."""
    params = [address, {"limit": limit}]
    if before:
        params[1]["before"] = before
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": params
    }
    result = rpc_call(payload)
    if "error" in result:
        raise RuntimeError(f"RPC error: {result['error']}")
    return result.get("result", [])

def get_transaction(signature):
    """Fetch a single transaction by signature."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [signature, {"encoding": "json"}]
    }
    result = rpc_call(payload)
    if "error" in result:
        raise RuntimeError(f"RPC error: {result['error']}")
    return result.get("result")

# ----------------------------
# Main Logic
# ----------------------------

def main():
    logger.info("Starting Solana Wallet Analyzer - Pull transactions")
    for idx, (address, label) in enumerate(zip(WALLET_ADDRESSES, WALLET_LABELS), start=1):
        wallet_dir = os.path.join("output", f"wallet_{idx}")
        os.makedirs(wallet_dir, exist_ok=True)
        output_file = os.path.join(wallet_dir, "raw_transactions.json")

        # Start fresh each run; overwrite existing file
        if os.path.exists(output_file):
            logger.warning(f"[{label}] Output file already exists. Overwriting.")
            all_transactions = []
        else:
            all_transactions = []

        total = 0
        page = 1
        before = None

        while True:
            logger.info(f"[{label}] Page {page} | Fetching signatures...")
            try:
                sigs = get_signatures(address, limit=100, before=before)
            except Exception as e:
                logger.error(f"[{label}] Failed to fetch signatures: {e}")
                break

            if not sigs:
                logger.info(f"[{label}] No more signatures. Done.")
                break

            # Fetch full transaction data for each signature
            page_transactions = []
            for sig_entry in sigs:
                sig = sig_entry.get("signature")
                if not sig:
                    continue
                try:
                    tx = get_transaction(sig)
                    if tx:
                        page_transactions.append(tx)
                except Exception as e:
                    logger.warning(f"[{label}] Failed to fetch transaction {sig}: {e}")
                    continue

            # Append to global list
            all_transactions.extend(page_transactions)
            total = len(all_transactions)

            # Determine oldest date from this batch (from signatures' blockTime)
            oldest_ts = None
            for entry in sigs:
                ts = entry.get("blockTime")
                if ts is not None and (oldest_ts is None or ts < oldest_ts):
                    oldest_ts = ts
            oldest_date = datetime.fromtimestamp(oldest_ts).strftime("%Y-%m-%d") if oldest_ts else "unknown"

            logger.info(f"[{label}] Page {page} | {total} transactions | oldest: {oldest_date}")

            # Atomic write to disk after each page
            try:
                atomic_write_json(all_transactions, output_file)
            except Exception as e:
                logger.error(f"[{label}] Failed to write output: {e}")
                break

            # Prepare for next page: use the oldest signature as 'before'
            # Note: signatures list is in descending order (newest first). The last entry is the oldest.
            before = sigs[-1].get("signature")
            page += 1

            # Be gentle on the API
            time.sleep(0.2)

        logger.info(f"[{label}] Completed. Total transactions: {total}")

    logger.info("All wallets processed.")

if __name__ == "__main__":
    main()
