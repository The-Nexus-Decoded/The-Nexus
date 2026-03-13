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

        # Jupiter API endpoint (Ultra v1)
        self.jupiter_endpoint = "https://api.jup.ag/ultra/v1"
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
        Executes a trade via Jupiter Ultra API.

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
                f"Jupiter Ultra trade: input={input_mint}, output={output_mint}, "
                f"amount={amount}, decimals={decimals}, slippage={slippage_bps}bps"
            )
            amount_raw = int(amount * (10 ** decimals))

            # Step 1: Get swap transaction via Ultra API (combines quote + swap)
            order_response = self._fetch_ultra_order(input_mint, output_mint, amount_raw, slippage_bps, str(self.wallet.pubkey()))
            if not order_response:
                return {"success": False, "signature": None, "error": "order_failed"}

            swap_tx_b64 = order_response.get("swapTransaction")
            request_id = order_response.get("requestId")
            if not swap_tx_b64 or not request_id:
                self.logger.error(f"Missing swapTransaction or requestId: {order_response}")
                return {"success": False, "signature": None, "error": "invalid_order_response"}

            # Step 2: Deserialize as VersionedTransaction
            tx_bytes = base64.b64decode(swap_tx_b64)
            try:
                tx = VersionedTransaction.from_bytes(tx_bytes)
                self.logger.info("Deserialized as VersionedTransaction.")
            except Exception as e:
                self.logger.warning(f"VersionedTransaction failed ({e}), trying legacy Transaction.")
                from solders.transaction import Transaction as LegacyTransaction
                tx = LegacyTransaction.from_bytes(tx_bytes)
                self.logger.info("Deserialized as legacy Transaction.")

            # Step 3: Sign the transaction
            signed_tx = VersionedTransaction(tx.message, [self.wallet])

            # Step 4: Execute via Ultra API
            exec_result = self._execute_ultra_order(signed_tx, request_id)
            if not exec_result:
                return {"success": False, "signature": None, "error": "execute_failed"}

            # Check execution status
            status = exec_result.get("status")
            if status == "Success":
                sig_str = exec_result.get("signature")
                self.logger.info(f"Ultra execution SUCCESS: {sig_str}")
                return {"success": True, "signature": sig_str, "error": None}
            else:
                error = exec_result.get("error", "Unknown error")
                self.logger.error(f"Ultra execution FAILED: {error}")
                return {"success": False, "signature": None, "error": error}

        except Exception as e:
            self.logger.error(f"Jupiter Ultra trade failed: {e}", exc_info=True)
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
            "instructionVersion": "V2",  # Enable V2 instructions for v2 pool support
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
            "dynamicComputeUnitLimit": True,  # Auto-adjust compute units
            "dynamicSlippage": True,  # Enable dynamic slippage for v2 pools
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

    def _fetch_ultra_order(
        self, input_mint: str, output_mint: str, amount: int, slippage_bps: int, taker: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch swap transaction from Jupiter Ultra API."""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "taker": taker,
        }
        headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        url = f"{self.jupiter_endpoint}/order"
        try:
            self.logger.info(f"Fetching Ultra order from: {url}")
            resp = httpx.get(url, params=params, headers=headers, timeout=15.0)
            if resp.status_code == 200:
                return resp.json()
            self.logger.warning(f"Ultra order returned {resp.status_code}: {resp.text[:500]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Ultra order request failed: {e}")
        return None

    def _execute_ultra_order(self, signed_tx: VersionedTransaction, request_id: str) -> Optional[Dict[str, Any]]:
        """Execute signed transaction via Jupiter Ultra API."""
        payload = {
            "signedTransaction": base64.b64encode(bytes(signed_tx)).decode(),
            "requestId": request_id,
        }
        headers = {"User-Agent": "OpenClaw-Hugh/1.0", "Content-Type": "application/json"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        url = f"{self.jupiter_endpoint}/execute"
        try:
            self.logger.info(f"Executing Ultra order: {url}")
            resp = httpx.post(url, json=payload, headers=headers, timeout=15.0)
            if resp.status_code == 200:
                return resp.json()
            self.logger.warning(f"Ultra execute returned {resp.status_code}: {resp.text[:500]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Ultra execute request failed: {e}")
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        """Executes a trade via Meteora DLMM."""
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        # Placeholder for actual Meteora execution logic
        return True
