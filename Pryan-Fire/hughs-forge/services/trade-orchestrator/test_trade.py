#!/usr/bin/env python3
import sys, os
import argparse

sys.path.insert(0, '/data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src')

from core.orchestrator import TradeOrchestrator

parser = argparse.ArgumentParser()
parser.add_argument('--dry-run', action='store_true', help='Skip on-chain execution')
parser.add_argument('--amount', type=float, default=0.001, help='SOL amount to trade')
args = parser.parse_args()

DB = 'trades.db'
TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
AMOUNT = args.amount

print(f'[TEST] Initializing orchestrator (db={DB}, dry_run={args.dry_run})')
orch = TradeOrchestrator(db_path=DB, dry_run=args.dry_run)
signal = {'token_address': TOKEN, 'amount': AMOUNT}
print(f'[TEST] Sending signal: {signal}')
state = orch.process_signal(signal)
print(f'[TEST] Final state: {state}')
