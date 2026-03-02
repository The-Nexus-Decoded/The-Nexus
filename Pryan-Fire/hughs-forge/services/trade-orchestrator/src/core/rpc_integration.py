import logging
import os
import httpx
import json
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
        # Jupiter API endpoints: use v1 (api.jup.ag/swap/v1)
        self.jupiter_endpoints = [
            "https://api.jup.ag/swap/v1"
        ]
        self.jupiter_api_key = os.getenv("JUPITER_API_KEY")
        # Fallback: read from /data/openclaw/keys/jupiter.env if not set
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
        # Load trading wallet (skip if dry_run)
        self.wallet = None
        if not dry_run:
            wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/keys/trading_wallet.json")
            with open(wallet_path, "r") as f:
                secret_key = json.load(f)
            self.wallet = Keypair.from_bytes(bytes(secret_key))
            if self.wallet:
                self.logger.info(f"Loaded wallet public key: {self.wallet.pubkey()}")
            # Solana RPC: default to mainnet for live trading
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
            self.client = Client(self.solana_rpc)
        else:
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
            self.client = None
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run}) network={self.solana_rpc}")

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
                input_mint="So11111111111111111111111111111111111111112",  # Wrapped SOL
                output_mint=token_address,
                amount=amount_lamports,
                user_public_key=str(self.wallet.pubkey())
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
            self.logger.info(f"RAW_BASE64_LEN={len(swap_tx_b64)} FIRST100={swap_tx_b64[:100]}")
            self.logger.info(f"Raw transaction length: {len(raw_tx)} bytes")

            # Determine transaction format: versioned (magic 0x80/0x81) vs legacy
            use_versioned = False
            try:
                if raw_tx[0] in (0x80, 0x81):
                    tx = VersionedTransaction.from_bytes(raw_tx)
                    use_versioned = True
                    self.logger.info("Deserialized as VersionedTransaction")
                else:
                    raise ValueError("Not a versioned transaction")
            except Exception as e:
                self.logger.warning(f"Versioned deserialization failed: {e}. Trying legacy Transaction.")
                try:
                    tx = Transaction.from_bytes(raw_tx)
                    self.logger.info(f"Legacy transaction account keys: {[str(pk) for pk in tx.message.account_keys]}")
                    self.logger.info("Deserialized as legacy Transaction")
                except Exception as e2:
                    self.logger.error(f"Failed to deserialize transaction: {e2}")
                    return False

            # Sign and send based on format
            if use_versioned:
                msg = tx.message
                account_keys = list(msg.account_keys)
                wallet_pubkey = self.wallet.pubkey()
                try:
                    idx = account_keys.index(wallet_pubkey)
                except ValueError:
                    self.logger.error("Wallet pubkey not found in transaction account keys")
                    self.logger.debug(f"Account keys: {account_keys}")
                    return False

                message_bytes = bytes(msg)
                signature = self.wallet.sign_message(message_bytes)
                sigs = list(tx.signatures)
                if idx < len(sigs):
                    sigs[idx] = signature
                else:
                    self.logger.error(f"Signature index {idx} out of bounds (sigs length {len(sigs)})")
                    return False
                signed_tx = VersionedTransaction.populate(msg, sigs)

                # Log address table lookups if present
                if hasattr(msg, 'address_table_lookups') and msg.address_table_lookups:
                    lookups = msg.address_table_lookups
                    self.logger.info(f"Address table lookups: {len(lookups)} entries")
                    for i, lookup in enumerate(lookups):
                        self.logger.debug(f"Lookup {i}: account_key={lookup.account_key}, writable={lookup.writable_indexes}, readonly={lookup.readonly_indexes}")

                self.logger.info("Sending versioned transaction")
                result = self.client.send_raw_transaction(
                    bytes(signed_tx),
                    opts=TxOpts(skip_confirmation=False, preflight_commitment="processed")
                )
            else:
                recent_blockhash = self.client.get_latest_blockhash().value.blockhash
                tx.sign([self.wallet], recent_blockhash)
                self.logger.info("Sending legacy transaction")
                result = self.client.send_transaction(
                    tx,
                    opts=TxOpts(skip_confirmation=False, preflight_commitment="processed")
                )

            self.logger.info(f"Transaction send result: {result}")
            return True

        except Exception as e:
            self.logger.error(f"Jupiter trade failed: {e}", exc_info=True)
            return False

    def _fetch_quote(self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 50, user_public_key: str = None) -> Optional[Dict[str, Any]]:
        """Fetch quote from Jupiter (synchronous httpx)"""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false",
        }
        if user_public_key:
            params["userPublicKey"] = user_public_key
        self.logger.debug(f"Jupiter quote params: {params}")
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/quote"
            try:
                resp = httpx.get(url, params=params, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    quote = resp.json()
                    self.logger.debug(f"Jupiter quote response: {json.dumps(quote)}")
                    return quote
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
        }
        self.logger.debug(f"Jupiter swap payload: {json.dumps(payload)}")
        headers = {
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/swap"
            try:
                resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    self.logger.debug(f"Jupiter swap response: {json.dumps(data)}")
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
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Meteora trade execution for {token_address}, amount: {amount}")
            return True
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        # Placeholder for actual Meteora execution logic
        return True
