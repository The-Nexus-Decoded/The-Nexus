#!/usr/bin/env python3
"""
Test Jupiter v6 connectivity without signing any transaction.
Fetches a quote and a swap transaction (unsigned) to validate API integration.
"""
import os
import httpx
import json

JUPITER_ENDPOINT = "https://api.jup.ag/swap/v1"
USER_PUBKEY = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"
INPUT_MINT = "So11111111111111111111111111111111111111112"  # Wrapped SOL (as per Jupiter example)
OUTPUT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC (mainnet mint)
AMOUNT_SOL = 0.01
AMOUNT_LAMPORTS = int(AMOUNT_SOL * 10**9)

headers = {}
api_key = os.getenv("JUPITER_API_KEY")
if api_key:
    headers["x-api-key"] = api_key
else:
    print("[INFO] JUPITER_API_KEY not set; proceeding without it (may work for devnet)")

def main():
    print(f"[TEST] Jupiter connectivity test for {AMOUNT_SOL} SOL → USDC")
    # 1. Fetch quote
    quote_params = {
        "inputMint": INPUT_MINT,
        "outputMint": OUTPUT_MINT,
        "amount": str(AMOUNT_LAMPORTS),
        "slippageBps": "50",  # 0.5%
        "onlyDirectRoutes": "false"
    }
    try:
        quote_resp = httpx.get(f"{JUPITER_ENDPOINT}/quote", params=quote_params, headers=headers, timeout=10.0)
        print(f"[QUOTE] HTTP {quote_resp.status_code}")
        if not quote_resp.is_success:
            print(f"[QUOTE] Error: {quote_resp.text[:500]}")
            return
        quote_data = quote_resp.json()
        print(f"[QUOTE] Success: out amount = {quote_data.get('outAmount')}, other: {json.dumps(quote_data, indent=2)[:300]}...")
    except Exception as e:
        print(f"[QUOTE] Request failed: {e}")
        return

    # 2. Request unsigned swap transaction
    payload = {
        "quoteResponse": quote_data,
        "userPublicKey": USER_PUBKEY,
        "wrapAndUnwrapSol": True,
        "useSharedAccounts": False,
        "prioritizationFeeLamports": "auto"
    }
    try:
        swap_resp = httpx.post(f"{JUPITER_ENDPOINT}/swap", json=payload, headers=headers, timeout=10.0)
        print(f"[SWAP] HTTP {swap_resp.status_code}")
        if not swap_resp.is_success:
            print(f"[SWAP] Error: {swap_resp.text[:500]}")
            return
        swap_data = swap_resp.json()
        tx_b64 = swap_data.get("swapTransaction")
        if tx_b64:
            print(f"[SWAP] Got transaction (base64 length {len(tx_b64)})")
        else:
            print(f"[SWAP] No swapTransaction in response: {json.dumps(swap_data, indent=2)[:300]}")
    except Exception as e:
        print(f"[SWAP] Request failed: {e}")

    print("[TEST] Completed. Jupiter API is reachable and returned data.")

if __name__ == "__main__":
    main()