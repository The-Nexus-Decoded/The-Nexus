import logging
import os
import json
import httpx
from typing import Dict, Any, Optional
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.transaction import Transaction, VersionedTransaction
import base64

logger = logging.getLogger("RpcIntegrator")

class RpcIntegrator:
    def __init__(self, dry_run: bool = False):
        self.logger = logging.getLogger("RpcIntegrator")
        self.dry_run = dry_run
        self.jupiter_endpoints = ["https://api.jup.ag/swap/v1"]
        self.jupiter_api_key = os.getenv("JUPITER_API_KEY")
        if not self.jupiter_api_key:
            env_path = "/data/openclaw/keys/jupiter.env"
            try:
                if os.path.exists(env_path):
                    with open(env_path) as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#"):
                                k, v = line.split("=", 1)
                                if k == "JUPITER_API_KEY":
                                    self.jupiter_api_key = v
                                    self.logger.info("Loaded JUPITER_API_KEY from jupiter.env")
                                    break
            except Exception as e:
                self.logger.warning(f"Failed to read JUPITER_API_KEY from {env_path}: {e}")
        self.wallet = None
        if not dry_run:
            wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/workspace/keys/trading_wallet.json")
            with open(wallet_path, "r") as f:
                secret_key = json.load(f)
            self.wallet = Keypair.from_bytes(bytes(secret_key))
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
            self.client = Client(self.solana_rpc)
        else:
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
            self.client = None
        # Meteora integration toggle (controlled via METEORA_ENABLED env var)
        self.meteora_enabled = os.getenv("METEORA_ENABLED", "false").lower() == "true"
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run}) network={self.solana_rpc} meteora_enabled={self.meteora_enabled}")

    def route_trade(self, token_address: str, amount: float) -> str:
        """
        Determines the best route for the trade.
        For now, defaults to Meteora if applicable, else Jupiter.
        """
        self.logger.info(f"Evaluating route for {token_address} (Amount: {amount})")
        # In a real implementation, we would query both and compare quotes.
        # Toggle: Respect METEORA_ENABLED configuration
        if self.meteora_enabled:
            self.logger.info("Meteora enabled via configuration; routing to Meteora")
            return "METEORA"
        else:
            self.logger.info("Meteora disabled; routing to Jupiter")
            return "JUPITER"

    def execute_jupiter_trade(self, token_address: str, amount: float) -> bool:
        """
        Executes a trade via Jupiter aggregator.
        Returns True on success, False on failure.
        """
        # Dry run: skip actual on-chain transaction
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Jupiter trade execution for {token_address}, amount: {amount}")
            return True

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
                amount=amount_lamports,
                user_pubkey=str(self.wallet.pubkey())
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
            raw_tx = base64.b64decode(swap_tx_b64)
            self.logger.debug(f"Raw transaction length: {len(raw_tx)}")

            # Try VersionedTransaction first (new Solana transaction format)
            from solders.transaction import VersionedTransaction
            try:
                tx = VersionedTransaction.from_bytes(raw_tx)
                self.logger.info("Deserialized as VersionedTransaction")
                msg = tx.message
                wallet_pubkey = self.wallet.pubkey()
                account_keys = msg.account_keys
                try:
                    wallet_idx = account_keys.index(wallet_pubkey)
                except ValueError:
                    self.logger.error("Wallet pubkey not found in account keys")
                    return False
                if not msg.is_signer(wallet_idx):
                    self.logger.error("Wallet account is not a signer")
                    return False
                message_bytes = bytes(msg)
                signature = self.wallet.sign_message(message_bytes)
                sigs = list(tx.signatures)
                if wallet_idx < len(sigs):
                    sigs[wallet_idx] = signature
                else:
                    self.logger.error(f"Signature index {wallet_idx} out of range (len={len(sigs)})")
                    return False
                signed_tx = VersionedTransaction.populate(msg, sigs)
                # Log address table lookups for debugging
                if hasattr(msg, 'address_table_lookups') and msg.address_table_lookups:
                    lookups = msg.address_table_lookups
                    self.logger.info(f"Address table lookups: {len(lookups)} entries")
                    for i, lookup in enumerate(lookups):
                        self.logger.debug(f"Lookup {i}: account_key={lookup.account_key}")
                self.logger.info("Sending versioned transaction via send_raw_transaction")
                result = self.client.send_raw_transaction(bytes(signed_tx), opts=TxOpts(skip_preflight=True, max_retries=3))
                self.logger.info(f"Transaction send result: {result}")
                return True
            except Exception as ve:
                self.logger.warning(f"VersionedTransaction handling failed: {ve}. Trying legacy Transaction.")
                # Fallback to legacy Transaction (older format)
                try:
                    tx = Transaction.from_bytes(raw_tx)
                    self.logger.info("Deserialized as legacy Transaction")
                    # Fetch recent blockhash for signing
                    try:
                        blockhash_resp = self.client.get_latest_blockhash()
                        recent_blockhash = blockhash_resp.value.blockhash
                    except Exception as e:
                        self.logger.error(f"Failed to fetch recent blockhash: {e}")
                        return False
                    # Sign transaction with wallet and blockhash
                    tx.sign([self.wallet], recent_blockhash)
                    self.logger.info("Sending legacy transaction via send_transaction")
                    result = self.client.send_transaction(tx, opts=TxOpts(skip_preflight=True, max_retries=3))
                    self.logger.info(f"Transaction send result: {result}")
                    return True
                except Exception as le:
                    self.logger.error(f"Legacy transaction handling also failed: {le}", exc_info=True)
                    return False

        except Exception as e:
            self.logger.error(f"Jupiter trade failed: {e}", exc_info=True)
            return False

    def _fetch_quote(self, input_mint: str, output_mint: str, amount: int, user_pubkey: str, slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        """Fetch quote from Jupiter (synchronous httpx)"""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false",
            "userPublicKey": user_pubkey
        }
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/quote"
            try:
                self.logger.info(f"Fetching quote from: {url}")
                resp = httpx.get(url, params=params, headers=headers, timeout=10.0, follow_redirects=True)
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
            "useSharedAccounts": False,
            "prioritizationFeeLamports": "auto",
            "dynamicComputeUnitLimit": True,
            "restrictIntermediateTokens": True
        }
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/swap"
            self.logger.info(f"[DEBUG] Swap transaction endpoint URL: {url}")
            try:
                self.logger.info(f"Requesting swap transaction from: {url}")
                resp = httpx.post(url, json=payload, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    data = resp.json()
                    swap_tx_b64 = data.get("swapTransaction")
                    if swap_tx_b64:
                        self.logger.info(f"Raw swap transaction (base64, first 100 chars): {swap_tx_b64[:100]}...")
                    return swap_tx_b64
                else:
                    self.logger.warning(f"Swap endpoint {url} returned {resp.status_code}: {resp.text[:200]}")
            except httpx.HTTPError as e:
                self.logger.warning(f"Swap request {url} failed: {e}")
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        """
        Executes a trade via Meteora DLMM.
        """
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Meteora trade execution for {token_address}, amount: {amount}")
            return True
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        # Placeholder for actual Meteora execution logic
        return True
