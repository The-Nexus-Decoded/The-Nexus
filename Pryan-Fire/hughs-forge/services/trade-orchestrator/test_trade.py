#!/usr/bin/env python3
import sys, os
import logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(name)s: %(message)s')

sys.path.insert(0, '/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/src')

from core.orchestrator import TradeOrchestrator
from solders.keypair import Keypair
import json
print(f"[IMPORT] TradeOrchestrator loaded from: {TradeOrchestrator.__module__}, file: {TradeOrchestrator.__init__.__code__.co_filename}")

DB = 'trades.db'
TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
AMOUNT = 0.001  # 0.001 SOL for mainnet test

# Load wallet to show pubkey
wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/keys/trading_wallet.json")
with open(wallet_path, "r") as f:
    secret = json.load(f)
kp = Keypair.from_bytes(bytes(secret))
print(f"[TEST] Using wallet pubkey: {kp.pubkey()}")

print(f'[TEST] Initializing orchestrator (db={DB})')
orch = TradeOrchestrator(db_path=DB, dry_run=False)
signal = {'token_address': TOKEN, 'amount': AMOUNT}
print(f'[TEST] Sending signal: {signal}')
state = orch.process_signal(signal)
print(f'[TEST] Final state: {state}')