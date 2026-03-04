from solana.rpc.types import MemcmpOpts
from solders.pubkey import Pubkey

BOT_WALLET_PUBKEY = Pubkey.from_string("74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")

print("Testing MemcmpOpts...")
try:
    print("1. With bytes(pubkey):")
    opts1 = MemcmpOpts(offset=8, bytes=bytes(BOT_WALLET_PUBKEY))
    print(f"Success. opts1: {opts1}")
except Exception as e:
    print(f"Failed: {e}")

try:
    print("\n2. With str(pubkey):")
    opts2 = MemcmpOpts(offset=8, bytes=str(BOT_WALLET_PUBKEY))
    print(f"Success. opts2: {opts2}")
except Exception as e:
    print(f"Failed: {e}")

try:
    print("\n3. With list of ints (pubkey bytes):")
    opts3 = MemcmpOpts(offset=8, bytes=list(bytes(BOT_WALLET_PUBKEY)))
    print(f"Success. opts3: {opts3}")
except Exception as e:
    print(f"Failed: {e}")
    
try:
    # Anchorpy might be building the JSON RPC request and expecting a base58 string 
    # for the 'bytes' field in the MemcmpOpts, which is standard for Solana RPC.
    print("\n4. With base58 string directly (which is what str(pubkey) does):")
    opts4 = MemcmpOpts(offset=8, bytes=str(BOT_WALLET_PUBKEY))
    print(f"Success. opts4: {opts4}")
    
    # If it's failing inside anchorpy during the `.all()` call, let's look at anchorpy's code.
except Exception as e:
    print(f"Failed: {e}")

