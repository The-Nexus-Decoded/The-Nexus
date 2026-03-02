#!/usr/bin/env python3
import os
import json
import httpx
import base64
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction

wallet_path = '/data/openclaw/keys/trading_wallet.json'
with open(wallet_path) as f:
    secret = json.load(f)
wallet = Keypair.from_bytes(bytes(secret))
print('Wallet pubkey:', wallet.pubkey())

# Fetch quote
params = {
    'inputMint': 'So11111111111111111111111111111111111111112',
    'outputMint': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'amount': '1000000',
    'slippageBps': 50,
    'userPublicKey': str(wallet.pubkey())
}
headers = {}
jupiter_key = os.getenv('JUPITER_API_KEY')
if jupiter_key:
    headers['x-api-key'] = jupiter_key
resp = httpx.get('https://api.jup.ag/swap/v1/quote', params=params, headers=headers, timeout=10)
quote = resp.json()
print('Quote outAmount:', quote.get('outAmount'))

# Fetch swap transaction
payload = {
    'quoteResponse': quote,
    'userPublicKey': str(wallet.pubkey()),
    'wrapAndUnwrapSol': True,
    'useSharedAccounts': False,
    'prioritizationFeeLamports': 'auto',
}
resp = httpx.post('https://api.jup.ag/swap/v1/swap', json=payload, headers=headers, timeout=10)
data = resp.json()
swap_b64 = data.get('swapTransaction')
print('Swap tx length:', len(swap_b64) if swap_b64 else None)

if swap_b64:
    raw = base64.b64decode(swap_b64)
    print('Raw bytes length:', len(raw))
    try:
        vt = VersionedTransaction.from_bytes(raw)
        print('VersionedTransaction deserialized')
        print('Account keys count:', len(vt.message.account_keys))
        print('Wallet in account keys?', wallet.pubkey() in vt.message.account_keys)
        try:
            idx = vt.message.account_keys.index(wallet.pubkey())
            print('Wallet index:', idx)
            print('Existing signatures count:', len(vt.signatures))
            print('All signatures (as bool):', [bool(s) for s in vt.signatures])
        except ValueError:
            print('Wallet pubkey not in account_keys')
    except Exception as e:
        print('Failed to deserialize as VersionedTransaction:', e)
