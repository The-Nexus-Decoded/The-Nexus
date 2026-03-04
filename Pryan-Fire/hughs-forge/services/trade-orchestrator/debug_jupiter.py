#!/usr/bin/env python3
import os
import json
import httpx
import base64
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction

# Load wallet
wallet_path = '/data/openclaw/keys/trading_wallet.json'
with open(wallet_path) as f:
    secret = json.load(f)
wallet = Keypair.from_bytes(bytes(secret))
user_pubkey = str(wallet.pubkey())
print('Wallet pubkey:', user_pubkey)

# Load Jupiter API key from env or jupiter.env
JUPITER_API_KEY = os.getenv("JUPITER_API_KEY")
if not JUPITER_API_KEY:
    env_path = "/data/openclaw/keys/jupiter.env"
    try:
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        if k == "JUPITER_API_KEY":
                            JUPITER_API_KEY = v
                            print("Loaded JUPITER_API_KEY from jupiter.env")
                            break
    except Exception as e:
        print(f"Failed to read JUPITER_API_KEY: {e}")

JUPITER_ENDPOINTS = ["https://api.jup.ag/swap/v1"]

def fetch_quote(user_pubkey: str):
    params = {
        'inputMint': 'So11111111111111111111111111111111111111112',
        'outputMint': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'amount': '1000000',
        'slippageBps': 50,
        'userPublicKey': user_pubkey
    }
    headers = {}
    if JUPITER_API_KEY:
        headers['x-api-key'] = JUPITER_API_KEY
    resp = httpx.get('https://api.jup.ag/swap/v1/quote', params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()

def fetch_swap_transaction(quote: dict, user_pubkey: str):
    payload = {
        'quoteResponse': quote,
        'userPublicKey': user_pubkey,
        'wrapAndUnwrapSol': True,
        'useSharedAccounts': False,
        'prioritizationFeeLamports': 'auto',
    }
    headers = {}
    if JUPITER_API_KEY:
        headers['x-api-key'] = JUPITER_API_KEY
    resp = httpx.post('https://api.jup.ag/swap/v1/swap', json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data.get('swapTransaction')

quote = fetch_quote(user_pubkey)
print('Quote outAmount:', quote.get('outAmount'))

swap_b64 = fetch_swap_transaction(quote, user_pubkey)
print('swapTransaction length:', len(swap_b64) if swap_b64 else None)

if swap_b64:
    raw = base64.b64decode(swap_b64)
    print('Raw bytes length:', len(raw))
    try:
        vt = VersionedTransaction.from_bytes(raw)
        print('Deserialized as VersionedTransaction')
        accts = vt.message.account_keys
        print('Account keys count:', len(accts))
        present = wallet.pubkey() in accts
        print('Wallet in account keys?', present)
        if present:
            idx = accts.index(wallet.pubkey())
            print('Wallet index:', idx)
            print('Number of signature slots:', len(vt.signatures))
            print('Is our signature slot already filled?', bool(vt.signatures[idx]))
    except Exception as e:
        print('Failed to deserialize:', e)
