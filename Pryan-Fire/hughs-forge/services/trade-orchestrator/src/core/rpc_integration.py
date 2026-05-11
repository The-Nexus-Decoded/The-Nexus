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

    def fetch_order_preview(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch or simulate a non-executing Jupiter Ultra order preview.

        Dry-run defaults to simulation so the local lane can be tested without
        Jupiter credentials. Set REVENUE_LANE_SIMULATE_ORDER=0 to force a real
        non-executing /order probe.
        """
        if self.dry_run and os.getenv("REVENUE_LANE_SIMULATE_ORDER", "1") != "0":
            return {
                "ok": True,
                "mode": "simulated",
                "endpoint": "/ultra/v1/order",
                "non_executing": True,
                "requires_authorized_jupiter_key": True,
                "request_id_present": True,
                "transaction_present": True,
            }

        input_mint = signal.get("input_mint") or signal.get("token_address") or signal.get("mint")
        output_mint = signal.get("output_mint")
        amount_atoms = signal.get("amount_atoms")
        taker = signal.get("taker") or os.getenv("TRADING_WALLET_PUBLIC_KEY")
        decimals = int(signal.get("decimals", 9))
        slippage_bps = int(signal.get("max_slippage_bps", signal.get("slippage_bps", 50)))

        if not input_mint or not output_mint:
            return {"ok": False, "reason": "missing_input_or_output_mint"}
        if not amount_atoms:
            amount_usd = float(signal.get("amount_usd", signal.get("amount", 0.0)) or 0.0)
            amount_atoms = int(amount_usd * (10 ** decimals))
        if not taker:
            return {"ok": False, "reason": "missing_taker_public_key"}

        order = self._fetch_ultra_order(str(input_mint), str(output_mint), int(amount_atoms), slippage_bps, str(taker))
        if not order:
            return {"ok": False, "reason": "jupiter_order_probe_failed"}

        parsed = self._parse_ultra_order(order)
        if not parsed["ok"]:
            return {"ok": False, "reason": parsed["error"]}

        return {
            "ok": True,
            "mode": "live_probe",
            "endpoint": "/ultra/v1/order",
            "non_executing": True,
            "request_id_present": True,
            "transaction_present": True,
        }

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

            # Step 1: Get an unsigned executable order from Ultra.
            order_response = self._fetch_ultra_order(input_mint, output_mint, amount_raw, slippage_bps, str(self.wallet.pubkey()))
            if not order_response:
                return {"success": False, "signature": None, "error": "order_failed"}

            parsed_order = self._parse_ultra_order(order_response)
            if not parsed_order["ok"]:
                return {"success": False, "signature": None, "error": parsed_order["error"]}

            # Step 2: Deserialize the unsigned VersionedTransaction.
            try:
                tx_bytes = base64.b64decode(parsed_order["transaction"], validate=True)
                tx = VersionedTransaction.from_bytes(tx_bytes)
                self.logger.info("Deserialized Ultra order transaction.")
            except Exception as e:
                self.logger.error(f"Invalid Ultra transaction payload: {e}")
                return {"success": False, "signature": None, "error": "invalid_order_transaction"}

            # Step 3: Sign the transaction
            signed_tx = VersionedTransaction(tx.message, [self.wallet])
            request_id = parsed_order["request_id"]

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


    def _parse_ultra_order(self, order_response: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the minimum executable Ultra order shape.

        Jupiter Ultra /order returns `transaction` + `requestId`. Missing or
        malformed values fail closed; callers must not sign or execute partial
        responses.
        """
        transaction = order_response.get("transaction")
        request_id = order_response.get("requestId")
        if not isinstance(transaction, str) or not transaction.strip():
            self.logger.error(f"Ultra order missing transaction: {order_response}")
            return {"ok": False, "error": "invalid_order_response"}
        if not isinstance(request_id, str) or not request_id.strip():
            self.logger.error(f"Ultra order missing requestId: {order_response}")
            return {"ok": False, "error": "invalid_order_response"}
        return {"ok": True, "transaction": transaction, "request_id": request_id}

    def _fetch_quote(
        self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 50
    ) -> Optional[Dict[str, Any]]:
        """Fetch a non-executing Jupiter Ultra order preview."""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
        }
        headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        url = f"{self.jupiter_endpoint}/order"
        try:
            self.logger.info(f"Fetching Ultra order preview from: {url}")
            resp = httpx.get(url, params=params, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            self.logger.warning(f"Ultra order preview returned {resp.status_code}: {resp.text[:200]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Ultra order preview request failed: {e}")
        return None

    def _fetch_swap_transaction(
        self, quote: Dict[str, Any], user_public_key: str
    ) -> Optional[str]:
        """Return a validated Ultra transaction from an existing order response."""
        parsed = self._parse_ultra_order(quote)
        if not parsed["ok"]:
            return None
        return parsed["transaction"]

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
