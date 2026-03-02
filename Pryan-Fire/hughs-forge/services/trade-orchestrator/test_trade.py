#!/usr/bin/env python3
"""
Trade orchestrator micro-test for Jupiter API integration.
Tests both dry-run and live micro-trade (0.001 SOL).
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Add src directory to path
SRC_PATH = Path(__file__).parent / "src"
sys.path.insert(0, str(SRC_PATH))

from core.rpc_integration import RpcIntegrator

def parse_args():
    parser = argparse.ArgumentParser(description="Test Jupiter trade execution")
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode (default)")
    parser.add_argument("--live", action="store_true", help="Run in live mode (real funds)")
    parser.add_argument("--amount", type=float, default=0.001, help="SOL amount to trade")
    return parser.parse_args()

def main():
    args = parse_args()

    # Determine mode: if --live is set, dry_run=False. Otherwise default to dry-run.
    dry_run = not args.live

    print(f"=== Jupiter API Integration Test ===")
    print(f"Mode: {'DRY-RUN' if dry_run else 'LIVE'}")
    print(f"Amount: {args.amount} SOL")
    print(f"Jupiter API Key: {'set' if os.getenv('JUPITER_API_KEY') else 'MISSING'}")
    print()

    # Set wallet path: use TRADING_WALLET_PATH if set, else default based on host
    wallet_path = os.getenv("TRADING_WALLET_PATH")
    if not wallet_path:
        # Default to common location on trade server
        wallet_path = "/data/openclaw/keys/trading_wallet.json"
        if not os.path.exists(wallet_path):
            print(f"ERROR: Wallet not found at {wallet_path}")
            print("Set TRADING_WALLET_PATH env var to correct location.")
            sys.exit(1)
        os.environ["TRADING_WALLET_PATH"] = wallet_path
        print(f"Using wallet at: {wallet_path}")

    # Initialize RpcIntegrator
    try:
        rpc = RpcIntegrator(dry_run=dry_run)
        print("RpcIntegrator initialized successfully")
    except Exception as e:
        print(f"ERROR initializing RpcIntegrator: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Test quote and swap
    # Using USDC as output (selling SOL for USDC)
    input_mint = "So11111111111111111111111111111111111111112"  # WSOL (we sell this)
    output_mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC

    print("\n1. Fetching quote from Jupiter...")
    try:
        # Convert SOL to lamports (9 decimals)
        amount_lamports = int(args.amount * 1e9)
        quote = rpc._fetch_quote(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount_lamports,
            user_pubkey=str(rpc.wallet.pubkey()) if not dry_run else "fake_pubkey"
        )
        if quote:
            print(f"   Quote received: {json.dumps(quote, indent=2)[:400]}...")
        else:
            print("   ERROR: No quote returned")
            sys.exit(1)
    except Exception as e:
        print(f"   ERROR fetching quote: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n2. Executing swap transaction...")
    try:
        success = rpc.execute_jupiter_trade(
            token_address=output_mint,  # Selling SOL for USDC
            amount=args.amount
        )
        if success:
            print("   ✓ Swap executed successfully")
        else:
            print("   ✗ Swap failed")
            sys.exit(1)
    except Exception as e:
        print(f"   ERROR executing swap: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
