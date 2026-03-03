import logging
import os
import json
import httpx
from typing import Dict, Any, Optional, Tuple, List
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.transaction import Transaction, VersionedTransaction
import base64
from datetime import datetime

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
        self.logger.info(f"RpcIntegrator initialized (dry_run={dry_run}) network={self.solana_rpc}")

    def route_trade(self, token_address: str, amount: float) -> str:
        self.logger.info(f"Evaluating route for {token_address} (Amount: {amount})")
        route = "JUPITER"
        self.logger.info(f"Selected Route: {route}")
        return route

    def execute_jupiter_trade(self, token_address: str, amount: float) -> Dict[str, Any]:
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Jupiter trade execution for {token_address}, amount: {amount}")
            return {
                "success": True,
                "tx_signature": "dry_run_mock_signature",
                "entry_price": None,
                "slippage_bps": 0,
                "fee_lamports": 0,
                "executed_at": datetime.utcnow().isoformat() + "Z",
                "error": None
            }

        try:
            self.logger.info(f"Executing Jupiter trade: token={token_address}, amount={amount}")
            decimals = 9
            amount_lamports = int(amount * (10 ** decimals))

            quote = self._fetch_quote(
                input_mint=token_address,
                output_mint="So11111111111111111111111111111111111111112",
                amount=amount_lamports,
                user_pubkey=str(self.wallet.pubkey())
            )
            if not quote:
                self.logger.error("Failed to fetch Jupiter quote")
                return {"success": False, "error": "Failed to fetch Jupiter quote"}

            swap_tx_b64, address_lookup_table_addresses = self._fetch_swap_transaction(quote, str(self.wallet.pubkey()))
            if not swap_tx_b64:
                self.logger.error("Failed to fetch swap transaction from Jupiter")
                return {"success": False, "error": "Failed to fetch swap transaction from Jupiter"}

            raw_tx = base64.b64decode(swap_tx_b64)
            self.logger.debug(f"Raw transaction length: {len(raw_tx)}")

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
                    return {"success": False, "error": "Wallet pubkey not found in account keys"}
                if not msg.is_signer(wallet_idx):
                    self.logger.error("Wallet account is not a signer")
                    return {"success": False, "error": "Wallet account is not a signer"}
                message_bytes = bytes(msg)
                signature = self.wallet.sign_message(message_bytes)
                sigs = list(tx.signatures)
                if wallet_idx < len(sigs):
                    sigs[wallet_idx] = signature
                else:
                    self.logger.error(f"Signature index {wallet_idx} out of range (len={len(sigs)})")
                    return {"success": False, "error": f"Signature index {wallet_idx} out of range"}
                signed_tx = VersionedTransaction.populate(msg, sigs)
                self.logger.info("Sending versioned transaction via send_raw_transaction")
                opts = TxOpts(skip_preflight=True, max_retries=3, address_lookup_table_addresses=address_lookup_table_addresses)
                result = self.client.send_raw_transaction(bytes(signed_tx), opts=opts)
                self.logger.info(f"Transaction send result: {result}")

                tx_signature = str(result.value) if hasattr(result, 'value') else str(result)
                entry_price = self._estimate_entry_price(quote, amount_lamports)
                return {
                    "success": True,
                    "tx_signature": tx_signature,
                    "entry_price": entry_price,
                    "slippage_bps": self._compute_slippage_bps(quote, amount_lamports),
                    "fee_lamports": None,
                    "executed_at": datetime.utcnow().isoformat() + "Z",
                    "error": None
                }
            except Exception as ve:
                self.logger.warning(f"VersionedTransaction handling failed: {ve}. Trying legacy Transaction.")
                try:
                    tx = Transaction.from_bytes(raw_tx)
                    self.logger.info("Deserialized as legacy Transaction")
                    try:
                        blockhash_resp = self.client.get_latest_blockhash()
                        recent_blockhash = blockhash_resp.value.blockhash
                    except Exception as e:
                        self.logger.error(f"Failed to fetch recent blockhash: {e}")
                        return {"success": False, "error": f"Failed to fetch recent blockhash: {e}"}
                    tx.sign([self.wallet], recent_blockhash)
                    self.logger.info("Sending legacy transaction via send_transaction")
                    result = self.client.send_transaction(tx, opts=TxOpts(skip_preflight=True, max_retries=3))
                    self.logger.info(f"Transaction send result: {result}")
                    tx_signature = str(result.value) if hasattr(result, 'value') else str(result)
                    entry_price = self._estimate_entry_price(quote, amount_lamports)
                    return {
                        "success": True,
                        "tx_signature": tx_signature,
                        "entry_price": entry_price,
                        "slippage_bps": self._compute_slippage_bps(quote, amount_lamports),
                        "fee_lamports": None,
                        "executed_at": datetime.utcnow().isoformat() + "Z",
                        "error": None
                    }
                except Exception as le:
                    self.logger.error(f"Legacy transaction handling also failed: {le}", exc_info=True)
                    return {"success": False, "error": f"Legacy transaction failed: {le}"}

        except Exception as e:
            self.logger.error(f"Jupiter trade failed: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def _estimate_entry_price(self, quote: Dict[str, Any], amount_lamports: int) -> Optional[float]:
        try:
            out_amount_str = quote.get("outAmount")
            in_amount_str = quote.get("inAmount")
            if out_amount_str and in_amount_str:
                out_amount = float(out_amount_str)
                in_amount = float(in_amount_str)
                if in_amount > 0:
                    return out_amount / in_amount
        except Exception:
            pass
        return None

    def _compute_slippage_bps(self, quote: Dict[str, Any], amount_lamports: int) -> Optional[int]:
        try:
            slippage_bps = quote.get("slippageBps")
            if slippage_bps is not None:
                return int(slippage_bps)
        except Exception:
            pass
        return None

    def execute_meteora_trade(self, token_address: str, amount: float) -> Dict[str, Any]:
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Skipping Meteora trade execution for {token_address}, amount: {amount}")
            return {
                "success": True,
                "tx_signature": "dry_run_mock_signature",
                "entry_price": None,
                "slippage_bps": 0,
                "fee_lamports": 0,
                "executed_at": datetime.utcnow().isoformat() + "Z",
                "error": None
            }
        self.logger.info(f"Executing Meteora trade for {token_address}...")
        return {
            "success": True,
            "tx_signature": None,
            "entry_price": None,
            "slippage_bps": None,
            "fee_lamports": None,
            "executed_at": datetime.utcnow().isoformat() + "Z",
            "error": None
        }

    def _fetch_quote(self, input_mint: str, output_mint: str, amount: int, user_pubkey: str, slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false",
            "userPublicKey": user_pubkey
        }
        headers = {"User-Agent": "OpenClaw-Haplo/1.0"}
        if self.jupiter_api_key:
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

    def _fetch_swap_transaction(self, quote: Dict[str, Any], user_public_key: str) -> Tuple[Optional[str], List[str]]:
        payload = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True,
            "useSharedAccounts": False,
            "prioritizationFeeLamports": "auto",
            "dynamicComputeUnitLimit": True,
            "restrictIntermediateTokens": True
        }
        headers = {"User-Agent": "OpenClaw-Haplo/1.0"}
        if self.jupiter_api_key:
            headers["x-api-key"] = self.jupiter_api_key
        for endpoint in self.jupiter_endpoints:
            url = f"{endpoint}/swap"
            try:
                self.logger.info(f"Requesting swap transaction from: {url}")
                resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    swap_tx_b64 = data.get("swapTransaction")
                    alt_addresses = data.get("addressLookupTableAddresses", [])
                    if swap_tx_b64:
                        self.logger.info(f"Raw swap transaction (base64, first 100 chars): {swap_tx_b64[:100]}...")
                        if alt_addresses:
                            self.logger.info(f"Received {len(alt_addresses)} ALT addresses: {alt_addresses}")
                    return swap_tx_b64, alt_addresses
                else:
                    self.logger.warning(f"Swap endpoint {url} returned {resp.status_code}: {resp.text[:200]}")
            except httpx.HTTPError as e:
                self.logger.warning(f"Swap request {url} failed: {e}")
        return None, []
