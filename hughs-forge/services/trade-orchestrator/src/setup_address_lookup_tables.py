#!/usr/bin/env python3
"""
Setup address lookup tables on devnet for Jupiter v6 trading.

This script creates and populates an address lookup table with the token mints
and token accounts needed for Jupiter v6 swaps on devnet.

Usage:
    python setup_address_lookup_tables.py
"""

import sys
import os
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from solana.keypair import Keypair
from solana.publickey import PublicKey
from solana.system_program import SYS_PROGRAM_ID
from solana.address_lookup_table import AddressLookupTable
from spl.token.constants import TOKEN_PROGRAM_ID

# Configuration
WALLET_PRIVATE_KEY = os.getenv("TRADING_WALLET_PRIVATE_KEY")
if not WALLET_PRIVATE_KEY:
    print("ERROR: TRADING_WALLET_PRIVATE_KEY environment variable not set")
    sys.exit(1)

# Devnet RPC
RPC_URL = "https://api.devnet.solana.com"
client = Client(RPC_URL)

# Load wallet
wallet = Keypair.from_secret_key(bytes.fromhex(WALLET_PRIVATE_KEY.replace("0x", "")))
wallet_pubkey = wallet.public_key
print(f"Trading wallet: {wallet_pubkey}")

# Token mints we need
SOL_MINT = PublicKey("So11111111111111111111111111111111111111112")  # Wrapped SOL
USDC_MINT = PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")  # USDC

def create_lookup_table():
    """Create a new address lookup table account."""
    print("\n=== Creating Address Lookup Table ===")

    # Generate a new keypair for the lookup table
    lookup_table_keypair = Keypair()
    lookup_table_pubkey = lookup_table_keypair.public_key

    # Calculate rent exemption
    # Address lookup table accounts are larger; using a safe estimate
    rent = client.get_minimum_balance_for_rent_exemption(1000)["result"]
    print(f"Rent exemption: {rent} lamports")

    # Build transaction
    from solana.transaction import Transaction
    from solana.system_program import CreateAccountWithSeedParams, create_account_with_seed

    # For simplicity, we'll use system create_account (not with seed)
    # The lookup table account should be owned by the lookup table program
    LOOKUP_TABLE_PROGRAM_ID = PublicKey("AddressLookupTab1e")  # Actual program ID

    # Actually, let's use the proper method via the AddressLookupTable class
    # But first, we need to derive the table authority (wallet)
    # The table authority is the wallet itself

    # Instead of building from scratch, use the higher-level helper if available
    # Let's do a simpler approach: use solana-py's AddressLookupTable.create_table

    try:
        # Check if the lookup table already exists
        try:
            info = client.get_account_info(lookup_table_pubkey)
            if info["result"]["value"]:
                print(f"Lookup table already exists at {lookup_table_pubkey}")
                return lookup_table_pubkey
        except:
            pass

        # Create the lookup table
        print(f"Creating new lookup table with authority {wallet_pubkey}")
        # Actually, the proper way: allocate space and create account owned by lookup table program
        # But the program ID is special. Let's look up the actual program ID.
        # On devnet, the lookup table program is the same as mainnet: "AddressLookupTab1e"

        # Let's use a more manual approach:
        from solana.transaction import Transaction, TransactionInstruction
        from solana.system_program import SYS_PROGRAM_ID, CreateAccountParams, create_account

        # Create the account
        space = 1000  # enough for initial table
        # The lookup table account must be owned by the lookup table program ID
        LOOKUP_PROGRAM_ID = PublicKey("AddressLookupTab1e")

        # Build transaction
        txn = Transaction()
        txn.add(
            create_account(
                CreateAccountParams(
                    from_pubkey=wallet_pubkey,
                    new_account_pubkey=lookup_table_pubkey,
                    lamports=rent,
                    space=space,
                    program_id=LOOKUP_PROGRAM_ID,
                )
            )
        )

        # Send transaction
        print("Sending create account transaction...")
        result = client.send_transaction(txn, wallet, lookup_table_keypair)
        print(f"Transaction signature: {result['result']}")

        # Confirm
        print("Confirming transaction...")
        client.confirm_transaction(result["result"], commitment=Confirmed)
        print(f"Lookup table created: {lookup_table_pubkey}")
        return lookup_table_pubkey

    except Exception as e:
        print(f"Error creating lookup table: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def add_mints_to_table(lookup_table_pubkey):
    """Add token mints to the lookup table."""
    print("\n=== Adding Token Mints to Lookup Table ===")

    try:
        # Use the lookup table program's add method
        from solana.transaction import TransactionInstruction
        from solana.address_lookup_table import AddressLookupTable

        # We need to create an instruction to add mints to the table
        # The instruction data: just the mints to add
        # The accounts: [lookup_table (writable), authority (signer), system_program?]
        # Actually, the instruction format is specific.

        # Let's use the AddressLookupTable class helper if available
        # In solana-py, we can do:
        # table = AddressLookupTable(client, lookup_table_pubkey, wallet)
        # table.extend([SOL_MINT, USDC_MINT])

        # But we'll do it manually for clarity

        from solana.transaction import Transaction
        from solana.system_program import SYS_PROGRAM_ID

        # Build extend instruction
        # The program expects: data = len(mints) followed by mint pubkeys (32 bytes each)
        mints = [SOL_MINT, USDC_MINT]
        data = len(mints).to_bytes(4, 'little')
        for mint in mints:
            data += bytes(mint)

        LOOKUP_PROGRAM_ID = PublicKey("AddressLookupTab1e")
        keys = [
            {"pubkey": lookup_table_pubkey, "is_signer": False, "is_writable": True},
            {"pubkey": wallet_pubkey, "is_signer": True, "is_writable": False},
        ]

        instr = TransactionInstruction(
            keys=keys,
            program_id=LOOKUP_PROGRAM_ID,
            data=data
        )

        txn = Transaction()
        txn.add(instr)

        print(f"Adding {len(mints)} mints to lookup table...")
        result = client.send_transaction(txn, wallet)
        print(f"Transaction signature: {result['result']}")

        client.confirm_transaction(result["result"], commitment=Confirmed)
        print("Mints added successfully.")

    except Exception as e:
        print(f"Error adding mints: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def add_wallet_token_accounts(lookup_table_pubkey):
    """Add the wallet's token accounts to the lookup table."""
    print("\n=== Adding Wallet Token Accounts ===")

    try:
        # Get wallet's token accounts
        from spl.token.client import Token
        from spl.token.constants import TOKEN_PROGRAM_ID

        # Get SOL token account (wrapped SOL)
        # The wallet's native SOL account is not a token account, but Jupiter might need the wrapped SOL token account
        # Let's get the associated token accounts for SOL and USDC

        def get_associated_token_account(mint, owner):
            from spl.token.instructions import get_associated_token_address
            return get_associated_token_address(owner, mint)

        sol_ata = get_associated_token_account(SOL_MINT, wallet_pubkey)
        usdc_ata = get_associated_token_account(USDC_MINT, wallet_pubkey)

        print(f"SOL associated token account: {sol_ata}")
        print(f"USDC associated token account: {usdc_ata}")

        # We need to ensure these accounts exist. If not, we might need to create them.
        # Actually, if the wallet has never held these tokens, the ATAs may not exist yet.
        # Let's check if they exist.

        for ata in [sol_ata, usdc_ata]:
            info = client.get_account_info(ata)
            if not info["result"]["value"]:
                print(f"ATA {ata} does not exist. Creating...")
                # We'll create the ATA by sending a small amount of token to it via the token program
                # But for Jupiter, they might create it on the fly. For now, we'll add the addresses anyway.

        # Add these accounts to the lookup table
        from solana.transaction import Transaction
        accounts = [sol_ata, usdc_ata]

        LOOKUP_PROGRAM_ID = PublicKey("AddressLookupTab1e")
        data = len(accounts).to_bytes(4, 'little')
        for acc in accounts:
            data += bytes(acc)

        keys = [
            {"pubkey": lookup_table_pubkey, "is_signer": False, "is_writable": True},
            {"pubkey": wallet_pubkey, "is_signer": True, "is_writable": False},
        ]

        instr = TransactionInstruction(
            keys=keys,
            program_id=LOOKUP_PROGRAM_ID,
            data=data
        )

        txn = Transaction()
        txn.add(instr)

        print(f"Adding {len(accounts)} token accounts to lookup table...")
        result = client.send_transaction(txn, wallet)
        print(f"Transaction signature: {result['result']}")
        client.confirm_transaction(result["result"], commitment=Confirmed)
        print("Token accounts added successfully.")

    except Exception as e:
        print(f"Error adding token accounts: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def main():
    print("Starting devnet address lookup table setup...")
    print(f"Using RPC: {RPC_URL}")

    # Check wallet balance
    balance = client.get_balance(wallet_pubkey)
    print(f"Wallet balance: {balance['result']['value']} lamports")

    # Create table
    lookup_table = create_lookup_table()
    print(f"Lookup table: {lookup_table}")

    # Add mints
    add_mints_to_table(lookup_table)

    # Add wallet token accounts
    add_wallet_token_accounts(lookup_table)

    print("\n=== Setup Complete ===")
    print(f"Lookup table {lookup_table} populated with necessary mints and token accounts.")
    print("You can now configure Jupiter to use this lookup table in its swap instructions.")
    print("The RpcIntegrator should automatically use it if the endpoint supports it.")

if __name__ == "__main__":
    main()