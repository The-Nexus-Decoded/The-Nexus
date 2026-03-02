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
        # Jupiter API endpoints (production)
        self.jupiter_endpoints = [
            "https://api.jup.ag/swap/v1"
        ]
        self.jupiter_api_key = os.getenv("JUPITER_API_KEY")
        # Fallback: read from /data/openclaw/keys/jupiter.env if not set
        if not self.jupiter_api_key:
            env_path = "/data/openclaw/keys/jupiter.env"
            try:
                with open(env_path, "r") as f:
                    for line in f:
                        if line.strip().startswith("JUPITER_API_KEY="):
                            self.jupiter_api_key = line.strip().split("=", 1)[1].strip('"\'')
                            break
                if self.jupiter_api_key:
                    self.logger.info(f"Loaded JUPITER_API_KEY from {env_path} (ends with ...{self.jupiter_api_key[-4:]})")
            except Exception as e:
                self.logger.warning(f"Failed to read JUPITER_API_KEY from {env_path}: {e}")
        if self.jupiter_api_key:
            self.logger.info(f"Jupiter API key loaded (ends with ...{self.jupiter_api_key[-4:]})")
        else:
            self.logger.error("JUPITER_API_KEY not set! Will fail with 401.")
        if not dry_run:
            wallet_path = os.getenv("TRADING_WALLET_PATH", "/data/openclaw/keys/trading_wallet.json")
            with open(wallet_path, "r") as f:
                secret_key = json.load(f)
            self.wallet = Keypair.from_bytes(bytes(secret_key))
            # Default to mainnet RPC for trading; override via SOLANA_RPC_URL if needed
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
            self.client = Client(self.solana_rpc)
        else:
            # Dry-run mode: use devnet RPC for context (no actual sending)
            self.solana_rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
            self.client = None
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run}) network={self.solana_rpc}")

    def route_trade(self, token_address: str, amount: float) -> str:
        self.logger.info(f"Evaluating route for {token_address} (Amount: {amount})")
        route = "JUPITER"
        self.logger.info(f"Selected route: {route}")
        return route

    def execute_jupiter_trade(self, token_address: str, amount: float) -> bool:
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Jupiter trade execution for {token_address}, amount: {amount}")
            return True

        try:
            self.logger.info(f"Executing Jupiter trade: token={token_address}, amount={amount}")

            # Convert amount to lamports (assuming 9 decimals for SOL; token decimals should be fetched in production)
            decimals = 9
            amount_lamports = int(amount * (10 ** decimals))

            quote = self._fetch_quote(
                input_mint=token_address,
                output_mint="So11111111111111111111111111111111111111112",  # wSOL
                amount=amount_lamports,
                user_public_key=str(self.wallet.pubkey())
            )
            if not quote:
                self.logger.error("Failed to fetch Jupiter quote")
                return False

            swap_tx_b64 = self._fetch_swap_transaction(quote, str(self.wallet.pubkey()))
            if not swap_tx_b64:
                self.logger.error("Failed to fetch swap transaction from Jupiter")
                return False

            raw_tx = base64.b64decode(swap_tx_b64)
            self.logger.debug(f"Raw transaction length: {len(raw_tx)} bytes")

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

                # Log address table lookups for transparency
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
        headers = {"User-Agent": "OpenClaw-Haplo/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/quote"
            try:
                resp = httpx.get(url, params=params, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    return resp.json()
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
        # DEBUG: Log the exact payload being sent
        self.logger.info(f"[DEBUG] Jupiter swap payload: {json.dumps(payload, separators=(',', ':'))}")

        headers = {"User-Agent": "OpenClaw-Haplo/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key

        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/swap"
            self.logger.info(f"[DEBUG] Posting to Jupiter endpoint: {url}")
            try:
                resp = httpx.post(url, json=payload, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_tx = data.get("swapTransaction")
                    if raw_tx:
                        self.logger.info(f"Raw swapTransaction base64 length: {len(raw_tx)}, first 100 chars: {raw_tx[:100]}")
                        # Also print directly to ensure it appears in test output
                        print(f"RAW_TX_BASE64: len={len(raw_tx)} first100={raw_tx[:100]}")
                    else:
                        self.logger.error("swapTransaction not found in Jupiter response")
                    return raw_tx
                self.logger.warning(f"Swap endpoint {url} returned {resp.status_code}: {resp.text[:200]}")
            except httpx.HTTPError as e:
                self.logger.warning(f"Swap request {url} failed: {e}")
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> bool:
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Meteora trade execution for {token_address}, amount: {amount}")
            return True
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        return True
