#!/usr/bin/env python3
import os
import json
import httpx
import base64

JUPITER_ENDPOINTS = ["https://api.jup.ag/swap/v1"]
JUPITER_API_KEY = os.getenv("JUPITER_API_KEY")

def fetch_swap_transaction(user_pubkey: str):
    """Request a swap transaction from Jupiter"""
    payload = {
        "quoteResponse": {
            "inputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "inAmount": "1000000",  # 0.001 SOL in lamports
            "outputMint": "So11111111111111111111111111111111111111112",
            "outAmount": "46400000",
            "otherAmountThreshold": "45792000",
            "slippageBps": 50,
            "platformFee": 0,
            "userPublicKey": user_pubkey,
            "wrapAndUnwrapSol": True,
            "useSharedAccounts": False,
            "prioritizationFeeLamports": "auto"
        },
        "userPublicKey": user_pubkey,
        "wrapAndUnwrapSol": True,
        "useSharedAccounts": False,
        "prioritizationFeeLamports": "auto"
    }

    headers = {"Content-Type": "application/json"}
    if JUPITER_API_KEY:
        headers["x-api-key"] = JUPITER_API_KEY

    for endpoint in JUPITER_ENDPOINTS:
        url = f"{endpoint}/swap"
        print(f"Fetching swap transaction from {url}")
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print("Response keys:", list(data.keys()))
                swap_tx = data.get("swapTransaction")
                if swap_tx:
                    print(f"swapTransaction length: {len(swap_tx)} chars")
                    raw = base64.b64decode(swap_tx)
                    print(f"Raw bytes length: {len(raw)}")
                    print("First 20 bytes (hex):", raw[:20].hex())
                    return swap_tx, raw
                else:
                    print("No swapTransaction in response")
                    print("Full response:", json.dumps(data, indent=2)[:500])
            else:
                print(f"Error response: {resp.text[:500]}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    user_pubkey = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"
    fetch_swap_transaction(user_pubkey)
