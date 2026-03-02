#!/usr/bin/env python3
import sys, os

sys.path.insert(0, '/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/src')

from core.orchestrator import TradeOrchestrator

DB = 'trades.db'
TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
AMOUNT = 0.001

print(f'[TEST] Initializing orchestrator (db={DB})')
orch = TradeOrchestrator(db_path=DB, dry_run=False)
signal = {'token_address': TOKEN, 'amount': AMOUNT}
print(f'[TEST] Sending signal: {signal}')
state = orch.process_signal(signal)
print(f'[TEST] Final state: {state}')