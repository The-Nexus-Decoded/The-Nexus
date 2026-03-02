import os
import logging
import base64
import json
from typing import Dict, Any, Optional
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solders.message import to_bytes_versioned
from solana.rpc.api import Client as SyncClient
from solana.rpc.async_api import AsyncClient
import httpx

class RpcIntegrator:
    def __init__(self):
        self.logger = logging.getLogger("RpcIntegrator")
        # Configuration from environment
        self.rpc_endpoint = os.environ.get("SOLANA_RPC_ENDPOINT", "https://api.mainnet-beta.solana.com")
        self.jupiter_quote_url = os.environ.get("JUPITER_QUOTE_URL", "https://quote-api.jup.ag/v6/quote")
        self.jupiter_swap_url = os.environ.get("JUPITER_SWAP_URL", "https://quote-api.jup.ag/v6/swap")
        self.wallet: Optional[Keypair] = None
        self._load_wallet()
        self.sync_client = SyncClient(self.rpc_endpoint)
        self.async_client = AsyncClient(self.rpc_endpoint)
        self.logger.info("RpcIntegrator initialized.")

    def _load_wallet(self):
        """Load wallet private key from environment or secure file."""
        env_key = os.environ.get("TRADING_WALLET_SECRET")
        if env_key:
            try:
                self.wallet = Keypair.from_base58_string(env_key)
                self.logger.info("Loaded wallet from TRADING_WALLET_SECRET env var.")
                return
            except Exception as e:
                self.logger.error(f"Failed to load wallet from env: {e}")
        # Fallback to keys directory
        keys_dir = os.environ.get("KEYS_DIR", "/data/openclaw/keys")
        key_path = os.path.join(keys_dir, "trading_wallet.json")
        if os.path.exists(key_path):
            try:
                with open(key_path, "r") as f:
                    secret = json.load(f)
                self.wallet = Keypair.from_bytes(bytes(secret))
                self.logger.info(f"Loaded wallet from {key_path}")
            except Exception as e:
                self.logger.error(f"Failed to load wallet from {key_path}: {e}")
        else:
            self.logger.warning("Wallet not found; execution will be disabled.")

    def route_trade(self, token_address: str, amount: float) -> str:
        self.logger.info(f"Evaluating route for {token_address} (Amount: ${amount})")
        # Simple heuristic: default to JUPITER
        return "JUPITER"

    def execute_jupiter_trade(self, token_address: str, amount: float) -> bool:
        self.logger.info(f"Executing Jupiter trade for {token_address}, amount ${amount}")
        if not self.wallet:
            self.logger.error("Wallet not loaded; cannot execute trade.")
            return False
        try:
            # Use USDC as input mint by default; configurable via env
            usdc_mint = os.environ.get("USDC_MINT", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
            input_mint = usdc_mint
            output_mint = token_address
            # Convert amount (USD) to smallest units (USDC has 6 decimals)
            input_amount = int(amount * 1_000_000)
            if input_amount <= 0:
                self.logger.error(f"Invalid input amount: {amount}")
                return False
            
            # Step 1: Get quote from Jupiter
            quote_url = f"{self.jupiter_quote_url}?inputMint={input_mint}&outputMint={output_mint}&amount={input_amount}&slippageBps=50"
            resp = httpx.get(quote_url, timeout=10.0)
            if resp.status_code != 200:
                self.logger.error(f"Jupiter quote failed: {resp.status_code} {resp.text}")
                return False
            quote_data = resp.json()
            if "routePlan" not in quote_data:
                self.logger.error(f"Jupiter quote error: {quote_data.get('error', 'unknown')}")
                return False
            
            # Step 2: Request swap transaction
            swap_payload = {
                "quoteResponse": quote_data,
                "userPublicKey": str(self.wallet.pubkey()),
                "wrapAndUnwrapSol": True
            }
            swap_resp = httpx.post(self.jupiter_swap_url, json=swap_payload, timeout=10.0)
            if swap_resp.status_code != 200:
                self.logger.error(f"Jupiter swap tx fetch failed: {swap_resp.status_code} {swap_resp.text}")
                return False
            swap_data = swap_resp.json()
            tx_base64 = swap_data.get("swapTransaction")
            if not tx_base64:
                self.logger.error("No swapTransaction in Jupiter response")
                return False
            
            # Step 3: Decode, sign, and send transaction
            try:
                tx_bytes = base64.b64decode(tx_base64)
                self.logger.debug(f"Decoded transaction bytes length: {len(tx_bytes)}")
            except Exception as e:
                self.logger.error(f"Base64 decode failed: {e}")
                return False
            try:
                transaction = VersionedTransaction.from_bytes(tx_bytes)
            except Exception as e:
                self.logger.error(f"Transaction deserialization failed (bytes len={len(tx_bytes)}): {e}")
                return False
            signature = self.wallet.sign_message(to_bytes_versioned(transaction.message))
            transaction.signatures = [signature]
            send_resp = self.sync_client.send_transaction(transaction)
            if send_resp.error:
                self.logger.error(f"Transaction send error: {send_resp.error}")
                return False
            tx_hash = str(send_resp.value)
            self.logger.info(f"Jupiter trade executed: tx_hash={tx_hash}")
            return True
        except Exception as e:
            self.logger.error(f"Exception in execute_jupiter_trade: {e}", exc_info=True)
            return False

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        self.logger.info(f"Executing Meteora trade via Jupiter for {token_address}, amount ${amount}")
        # Delegate to Jupiter (Meteora is typically included in Jupiter routes)
        return self.execute_jupiter_trade(token_address, amount)
