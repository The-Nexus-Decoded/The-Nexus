import logging
import os
import json
import base64
import httpx
from typing import Dict, Any, Optional
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.signature import Signature
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solana.rpc.commitment import Confirmed

logger = logging.getLogger("RpcIntegrator")

# Default confirmation timeout in seconds
TX_CONFIRM_TIMEOUT = 30


class RpcIntegrator:
    def __init__(self, dry_run: bool = False):
        self.logger = logging.getLogger("RpcIntegrator")
        self.dry_run = dry_run

        # Jupiter API endpoint
        self.jupiter_endpoint = "https://api.jup.ag/swap/v1"
        self.jupiter_api_key = os.getenv("JUPITER_API_KEY")

        # Load trading wallet (skip in dry_run mode)
        self.wallet = None
        if not dry_run:
            wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/keys/trading_wallet.json")
            try:
                with open(wallet_path, "r") as f:
                    secret_key = json.load(f)
                self.wallet = Keypair.from_secret_key(bytes(secret_key))
                self.logger.info("Wallet loaded successfully.")
            except FileNotFoundError:
                self.logger.error(f"Wallet file not found: {wallet_path}")
                raise
            except Exception as e:
                self.logger.error(f"Failed to load wallet: {e}")
                raise
        else:
            self.logger.info("Dry-run mode — wallet not loaded.")

        # Solana RPC
        self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
        self.client = Client(self.solana_rpc)
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run}, rpc={self.solana_rpc})")

    def route_trade(self, token_address: str, amount: float) -> str:
        """Determines the best route for the trade."""
        self.logger.info(f"Evaluating route for {token_address} (Amount: {amount})")
        route = "JUPITER"
        self.logger.info(f"Selected route: {route}")
        return route

    def execute_jupiter_trade(
        self,
        input_mint: str,
        output_mint: str,
        amount: float,
        decimals: int = 9,
        slippage_bps: int = 50,
    ) -> Dict[str, Any]:
        """
        Executes a trade via Jupiter aggregator.

        Returns dict with:
          - success: bool
          - signature: str or None
          - error: str or None
        """
        if self.dry_run:
            self.logger.info("Dry-run mode — skipping trade execution.")
            return {"success": False, "signature": None, "error": "dry_run"}

        if self.wallet is None:
            self.logger.error("No wallet loaded — cannot execute trade.")
            return {"success": False, "signature": None, "error": "no_wallet"}

        try:
            self.logger.info(
                f"Jupiter trade: input={input_mint}, output={output_mint}, "
                f"amount={amount}, decimals={decimals}, slippage={slippage_bps}bps"
            )
            amount_raw = int(amount * (10 ** decimals))

            # Step 1: Get quote
            quote = self._fetch_quote(input_mint, output_mint, amount_raw, slippage_bps)
            if not quote:
                return {"success": False, "signature": None, "error": "quote_failed"}

            # Step 2: Get swap transaction
            swap_tx_b64 = self._fetch_swap_transaction(quote, str(self.wallet.pubkey()))
            if not swap_tx_b64:
                return {"success": False, "signature": None, "error": "swap_tx_failed"}

            # Step 3: Deserialize as VersionedTransaction (Jupiter v6 format)
            tx_bytes = base64.b64decode(swap_tx_b64)
            try:
                tx = VersionedTransaction.from_bytes(tx_bytes)
                self.logger.info("Deserialized as VersionedTransaction.")
            except Exception as e:
                self.logger.warning(f"VersionedTransaction failed ({e}), trying legacy Transaction.")
                from solders.transaction import Transaction as LegacyTransaction
                tx = LegacyTransaction.from_bytes(tx_bytes)
                self.logger.info("Deserialized as legacy Transaction.")

            # Step 4: Sign the transaction
            signed_tx = VersionedTransaction(tx.message, [self.wallet])

            # Step 5: Send
            self.logger.info(f"Sending transaction to {self.solana_rpc}...")
            send_result = self.client.send_raw_transaction(
                bytes(signed_tx),
                opts=TxOpts(skip_preflight=False, preflight_commitment="processed"),
            )

            # Extract signature
            sig_str = str(send_result.value)
            self.logger.info(f"Tx sent. Signature: {sig_str}")

            # Step 6: Confirm on-chain
            self.logger.info(f"Waiting for confirmation (timeout={TX_CONFIRM_TIMEOUT}s)...")
            confirm_result = self.client.confirm_transaction(
                Signature.from_string(sig_str),
                commitment="confirmed",
                sleep_seconds=1,
                last_valid_block_height=None,
            )

            # Check confirmation
            if confirm_result.value and len(confirm_result.value) > 0:
                conf = confirm_result.value[0]
                if hasattr(conf, "err") and conf.err is not None:
                    self.logger.error(f"Tx confirmed but FAILED on-chain: {conf.err}")
                    return {"success": False, "signature": sig_str, "error": f"on_chain_error: {conf.err}"}

            self.logger.info(f"Tx CONFIRMED: {sig_str}")
            return {"success": True, "signature": sig_str, "error": None}

        except Exception as e:
            self.logger.error(f"Jupiter trade failed: {e}", exc_info=True)
            return {"success": False, "signature": None, "error": str(e)}

    def _fetch_quote(
        self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 50
    ) -> Optional[Dict[str, Any]]:
        """Fetch quote from Jupiter."""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false",
        }
        headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        url = f"{self.jupiter_endpoint}/quote"
        try:
            self.logger.info(f"Fetching quote from: {url}")
            resp = httpx.get(url, params=params, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            self.logger.warning(f"Quote returned {resp.status_code}: {resp.text[:200]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Quote request failed: {e}")
        return None

    def _fetch_swap_transaction(
        self, quote: Dict[str, Any], user_public_key: str
    ) -> Optional[str]:
        """Request swap transaction from Jupiter."""
        payload = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True,
            "useSharedAccounts": False,
            "prioritizationFeeLamports": "auto",
        }
        headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        url = f"{self.jupiter_endpoint}/swap"
        try:
            self.logger.info(f"Requesting swap tx from: {url}")
            resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.json().get("swapTransaction")
            self.logger.warning(f"Swap returned {resp.status_code}: {resp.text[:200]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Swap request failed: {e}")
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        """Executes a trade via Meteora DLMM."""
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        # Placeholder for actual Meteora execution logic
        return True
