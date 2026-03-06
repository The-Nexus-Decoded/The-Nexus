#!/usr/bin/env python3
"""Fetch and analyze wallet transactions from Solana RPC"""
import requests
import json
from datetime import datetime
from collections import defaultdict

RPC_URL = "https://api.mainnet-beta.solana.com"

WALLETS = {
    "trading": "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x",
    "owner": "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb"
}

def get_signatures(address, limit=20):
    """Fetch transaction signatures for an address"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [address, {"limit": limit}]
    }
    resp = requests.post(RPC_URL, json=payload, timeout=30)
    return resp.json()["result"]

def get_transaction(sig):
    """Fetch transaction details"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [sig, {"maxSupportedTransactionVersion": 0, "encoding": "jsonParsed"}]
    }
    resp = requests.post(RPC_URL, json=payload, timeout=30)
    return resp.json()["result"]

def analyze_transaction(tx, wallet_addr):
    """Extract useful info from a transaction"""
    if not tx or not tx.get("meta"):
        return None
    
    meta = tx["meta"]
    block_time = tx.get("blockTime")
    fee = meta.get("fee", 0) / 1e9  # Convert lamports to SOL
    
    # Look for token transfers involving this wallet
    token_transfers = []
    inner = meta.get("innerInstructions", [])
    
    for ix in inner:
        for instr in ix.get("instructions", []):
            parsed = instr.get("parsed", {})
            if isinstance(parsed, dict):
                ptype = parsed.get("type", "")
                info = parsed.get("info", {})
                
                if ptype in ["transfer", "transferChecked"]:
                    source = info.get("source", "")
                    dest = info.get("destination", "")
                    mint = info.get("mint", "")
                    amount = info.get("tokenAmount", {}).get("uiAmount", 0)
                    
                    if source == wallet_addr or dest == wallet_addr:
                        token_transfers.append({
                            "mint": mint,
                            "source": source,
                            "destination": dest,
                            "amount": amount,
                            "type": ptype
                        })
    
    return {
        "blockTime": block_time,
        "fee": fee,
        "error": meta.get("err"),
        "tokenTransfers": token_transfers
    }

# Main analysis
print("=" * 60)
print("WALLET HISTORY ANALYSIS FOR STRATEGY V2")
print("=" * 60)
print(f"Generated: {datetime.now().isoformat()}")
print()

for wallet_name, wallet_addr in WALLETS.items():
    print(f"\n### {wallet_name.upper()} WALLET: {wallet_addr}")
    print("-" * 50)
    
    sigs = get_signatures(wallet_addr, limit=15)
    print(f"Recent transactions: {len(sigs)}")
    
    total_fees = 0
    tx_count = 0
    token_mints = set()
    
    for sig_info in sigs[:10]:  # Analyze last 10
        sig = sig_info["signature"]
        tx = get_transaction(sig)
        analysis = analyze_transaction(tx, wallet_addr)
        
        if analysis:
            tx_count += 1
            total_fees += analysis["fee"]
            
            for tt in analysis["tokenTransfers"]:
                if tt["mint"]:
                    token_mints.add(tt["mint"])
    
    print(f"Analyzed: {tx_count} transactions")
    print(f"Total fees paid: {total_fees:.6f} SOL")
    print(f"Unique tokens: {len(token_mints)}")
    if token_mints:
        print(f"Token Mints: {list(token_mints)[:5]}")

print("\n" + "=" * 60)
