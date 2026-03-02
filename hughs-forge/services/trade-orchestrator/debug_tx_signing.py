#!/usr/bin/env python3
import os
import json
import httpx
import base64
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solana.rpc.api import Client
from solana.rpc.types import TxOpts

# Load wallet
wallet_path = '/data/openclaw/keys/trading_wallet.json'
with open(wallet_path) as f:
    secret = json.load(f)
wallet = Keypair.from_bytes(bytes(secret))
wallet_pubkey = wallet.pubkey()
print(f"Wallet pubkey: {wallet_pubkey}")

# Jupiter API key
jupiter_api_key = os.getenv("JUPITER_API_KEY")
if not jupiter_api_key:
    env_path = "/data/openclaw/keys/jupiter.env"
    with open(env_path) as f:
        for line in f:
            line=line.strip()
            if line and not line.startswith("#"):
                k,v=line.split("=",1)
                if k=="JUPITER_API_KEY":
                    jupiter_api_key=v
                    break
print(f"Jupiter API key: {jupiter_api_key[:8]}...")

# Fetch quote
params = {
    'inputMint': 'So11111111111111111111111111111111111111112',
    'outputMint': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'amount': '1000000',
    'slippageBps': 50,
    'userPublicKey': str(wallet_pubkey)
}
headers = {'x-api-key': jupiter_api_key} if jupiter_api_key else {}
resp = httpx.get('https://api.jup.ag/swap/v1/quote', params=params, headers=headers, timeout=10)
resp.raise_for_status()
quote = resp.json()
print(f"Quote outAmount: {quote.get('outAmount')}")

# Fetch swap transaction
payload = {
    'quoteResponse': quote,
    'userPublicKey': str(wallet_pubkey),
    'wrapAndUnwrapSol': True,
    'useSharedAccounts': False,
    'prioritizationFeeLamports': 'auto',
}
resp = httpx.post('https://api.jup.ag/swap/v1/swap', json=payload, headers=headers, timeout=10)
resp.raise_for_status()
data = resp.json()
swap_b64 = data.get('swapTransaction')
print(f"Swap tx length: {len(swap_b64) if swap_b64 else None}")

if not swap_b64:
    print("No swap transaction")
    exit(1)

raw_tx = base64.b64decode(swap_b64)
print(f"Raw bytes length: {len(raw_tx)}")

# Deserialize
tx = VersionedTransaction.from_bytes(raw_tx)
print("Deserialized as VersionedTransaction")

acct_keys = tx.message.account_keys
print(f"Account keys count: {len(acct_keys)}")
print(f"Account keys: {[str(k) for k in acct_keys]}")

# Find wallet index
try:
    idx = acct_keys.index(wallet_pubkey)
    print(f"Wallet index: {idx}")
except ValueError:
    print("ERROR: Wallet pubkey not found in account keys")
    exit(1)

sigs = list(tx.signatures)
print(f"Original signatures count: {len(sigs)}")
print(f"Original signatures (bool): {[bool(s) for s in sigs]}")
print(f"Signature at idx before: {bool(sigs[idx])}")

# Compute signature
msg = tx.message
message_bytes = bytes(msg)
signature = wallet.sign_message(message_bytes)
print(f"Computed signature (hex len {len(signature.bytes())}): {signature.bytes()[:20].hex()}")

# Replace
sigs[idx] = signature
print(f"Signature at idx after replace: {bool(sigs[idx])}")

# Build signed tx
signed_tx = VersionedTransaction.populate(msg, sigs)
print("Signed transaction constructed")

# Send via RPC (mainnet)
client = Client("https://api.mainnet-beta.solana.com")
print("Sending send_raw_transaction...")
try:
    result = client.send_raw_transaction(bytes(signed_tx), opts=TxOpts(skip_confirmation=False, preflight_commitment="processed"))
    print(f"Result: {result}")
except Exception as e:
    print(f"Exception: {e}")
    # Also try skip_preflight
    print("Retrying with skip_preflight=True...")
    try:
        result = client.send_raw_transaction(bytes(signed_tx), opts=TxOpts(skip_preflight=True))
        print(f"Result (skip_preflight): {result}")
    except Exception as e2:
        print(f"Second exception: {e2}")
