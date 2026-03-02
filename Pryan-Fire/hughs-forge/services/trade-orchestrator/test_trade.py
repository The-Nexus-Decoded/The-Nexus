#!/usr/bin/env python3
import sys, os

# Ensure we load the code from the installed service location
sys.path.insert(0, '/data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src')

from core.orchestrator import TradeOrchestrator

# Config
DB = 'trades.db'
TOKEN = 'So11111111111111111111111111111111111111112'  # devnet SOL (wrap to wSOL)
AMOUNT = 0.01

print(f'[TEST] Initializing orchestrator (db={DB})')
orch = TradeOrchestrator(db_path=DB, dry_run=False)  # live on devnet
signal = {'token_address': TOKEN, 'amount': AMOUNT}
print(f'[TEST] Sending signal: {signal}')
state = orch.process_signal(signal)
print(f'[TEST] Final state: {state}')
