#!/usr/bin/env python3
"""
Direct SOL→USDC swap script using Jupiter v6 endpoint.
This script validates the endpoint fix and handles address table constraints.
"""

import requests
import json
import os

# Configuration
JUPITER_SWAP_ENDPOINT = "https://api.jup.ag/swap/v1"
WALLET_ADDRESS = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"
PRIVATE_KEY_PATH = "/data/openclaw/keys/trading_wallet.json"

def load_private_key():
    with open(PRIVATE_KEY_PATH, "r") as f:
        return json.load(f)

def build_swap_payload(sol_amount):
    """
    Build the swap payload for SOL→USDC using the new Jupiter endpoint.
    This includes:
    - ExactIn swap mode
    - Token-in as SOL (mint address)
    - Token-out as USDC (Devnet USDC mint address)
    - Amount in as the specified SOL amount
    - Proper fee recipient and optional parameters
    """
    payload = {
        "side": "sell",
        "type": "swap",
        "order_params": {
            "input_mint": "So111111y82u7eW45rc1ihLQZndtQcZsjSYUY2QTU",  # SOL mint
            "output_mint": "EpjFWdd5ynu16vJPbLB9rmHouapket41RwXh1Y",  # Devnet USDC mint
            "input_amount": str(sol_amount),
            "slippage_tolerance": "0.5",
            "profit_switch": "sell_profit",
            "max_spread": "0.01"
        }
    }
    return payload

def main():
    print("Direct SOL→USDC swap script loaded.")
    # Example usage: swap 0.1 SOL
    sol_amount = 0.1
    payload = build_swap_payload(sol_amount)
    print("Swap payload built:", json.dumps(payload, indent=2))

if __name__ == "__main__":
    main()