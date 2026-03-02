import logging
import os
import httpx
from typing import Dict, Any, Optional
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.transaction import Transaction
import base64

logger = logging.getLogger("RpcIntegrator")

class RpcIntegrator:
    def __init__(self, dry_run: bool = False):
        self.logger = logging.getLogger("RpcIntegrator")
        self.dry_run = dry_run
        # Jupiter API endpoints
        self.jupiter_endpoints = [
            "https://api.jup.ag/swap/v1",
            "https://quote-api.jup.ag/v6"
        ]
        self.jupiter_api_key = os.getenv("JUPITER_API_KEY")
        # Load trading wallet only if not dry_run
        self.wallet = None
        if not dry_run:
            wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/keys/trading_wallet.json")
            with open(wallet_path, "r") as f:
                import json
                secret_key = json.load(f)
            self.wallet = Keypair.from_bytes(bytes(secret_key))
        # Solana RPC (from env or default to devnet for testing)
        self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
        self.client = Client(self.solana_rpc)
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run})")

    def route_trade(self, token_address: str, amount: float) -> str:
        """
        Determines the best route for the trade.
        For now, defaults to Meteora if applicable, else Jupiter.
        """
        self.logger.info(f"Evaluating route for {token_address} (Amount: {amount})")
        # In a real implementation, we would query both and compare quotes.
        # For this mock integration, we assume Jupiter is the default fallback.
        route = "JUPITER"
        self.logger.info(f"Selected route: {route}")
        return route

    def execute_jupiter_trade(self, token_address: str, amount: float) -> bool:
        """
        Executes a trade via Jupiter aggregator.
        Returns True on success, False on failure.
        """
        try:
            self.logger.info(f"Executing Jupiter trade: token={token_address}, amount={amount}")
            # Convert amount to lamports (assuming token has 9 decimals for SOL/USDC etc)
            # In production, fetch decimals from token mint
            decimals = 9
            amount_lamports = int(amount * (10 ** decimals))

            # Step 1: Get quote
            quote = self._fetch_quote(
                input_mint=token_address,
                output_mint="So11111111111111111111111111111111111111112",  # Wrapped SOL
                amount=amount_lamports
            )
            if not quote:
                self.logger.error("Failed to fetch Jupiter quote")
                return False

            # Step 2: Get swap transaction
            swap_tx_b64 = self._fetch_swap_transaction(quote, str(self.wallet.pubkey()))
            if not swap_tx_b64:
                self.logger.error("Failed to fetch swap transaction from Jupiter")
                return False

            # Step 3: Deserialize, sign, and send
            tx = Transaction.deserialize(base64.b64decode(swap_tx_b64))
            tx.sign(self.wallet)
            self.logger.info(f"Transaction prepared, sending to Solana RPC: {self.solana_rpc}")
            result = self.client.send_transaction(
                tx,
                opts=TxOpts(skip_confirmation=False, preflight_commitment="processed")
            )
            self.logger.info(f"Transaction sent: {result}")
            return True

        except Exception as e:
            self.logger.error(f"Jupiter trade failed: {e}", exc_info=True)
            return False

    def _fetch_quote(self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        """Fetch quote from Jupiter (synchronous httpx)"""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false"
        }
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["Authorization"] = f"Bearer {self.jupiter_api_key}"
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/quote"
            try:
                self.logger.info(f"Fetching quote from: {url}")
                resp = httpx.get(url, params=params, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    self.logger.warning(f"Quote endpoint {url} returned {resp.status_code}: {resp.text[:200]}")
            except httpx.HTTPError as e:
                self.logger.warning(f"Quote request {url} failed: {e}")
        return None

    def _fetch_swap_transaction(self, quote: Dict[str, Any], user_public_key: str) -> Optional[str]:
        """Request swap transaction from Jupiter"""
        payload = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True,
            "useSharedAccounts": True,
            "prioritizationFeeLamports": "auto"
        }
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["Authorization"] = f"Bearer {self.jupiter_api_key}"
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/swap"
            try:
                self.logger.info(f"Requesting swap transaction from: {url}")
                resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("swapTransaction")
                else:
                    self.logger.warning(f"Swap endpoint {url} returned {resp.status_code}: {resp.text[:200]}")
            except httpx.HTTPError as e:
                self.logger.warning(f"Swap request {url} failed: {e}")
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        """
        Executes a trade via Meteora DLMM.
        """
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        # Placeholder for actual Meteora execution logic
        return True
