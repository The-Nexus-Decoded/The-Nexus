import asyncio
import json
import logging
from typing import Dict, Any, Optional
import discord
from discord.ext import commands

# The Warden: Risk Management Gating logic.
# Inscribed by Haplo (ola-claw-dev) for the Patryn Trading Pipeline.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Warden")

class RiskManager:
    def __init__(self, discord_token: str = None, channel_id: int = None):
        if discord_token and channel_id:
            self.token = discord_token
            self.channel_id = int(channel_id)
            self.bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
            self._discord_enabled = True
            # Initialize bot event handlers if running
            self._setup_bot()
        else:
            # Fail-closed mode: missing Discord approvals must never auto-approve live money.
            self.token = None
            self.channel_id = None
            self.bot = None
            self._discord_enabled = False
            logger.error("RiskManager initialized in FAIL-CLOSED mode (no Discord credentials). Trades require explicit owner approval integration.")
        
        self.lock = asyncio.Lock()
        self.pending_trades: Dict[str, asyncio.Event] = {}
        self.trade_approvals: Dict[str, bool] = {}

    def _setup_bot(self):
        """Set up Discord bot event handlers."""
        @self.bot.event
        async def on_ready():
            logger.info(f"Discord bot connected. Monitoring channel: {self.channel_id}")

        @self.bot.event
        async def on_reaction(reaction: discord.Reaction, user: discord.User):
            if user.bot:
                return
            if "PATRYN STRIKE AUTHORIZATION" in reaction.message.content:
                try:
                    trade_id = reaction.message.content.split("**ID:** `")[1].split("`")[0]
                except IndexError:
                    return
                if trade_id in self.pending_trades:
                    if str(reaction.emoji) == "✅":
                        self.trade_approvals[trade_id] = True
                        self.pending_trades[trade_id].set()
                        await reaction.message.channel.send(f"⚔️ Strike Authorized: `{trade_id}`")
                    elif str(reaction.emoji) == "❌":
                        self.trade_approvals[trade_id] = False
                        self.pending_trades[trade_id].set()
                        await reaction.message.channel.send(f"🛡️ Strike Aborted: `{trade_id}`")

    def _format_approval_message(self, trade_id: str, details: Dict[str, Any]) -> str:
        """
        Forges a high-fidelity Discord message for Lord Xar.
        """
        action = details.get('action', 'UNKNOWN_STRIKE')
        pool = details.get('pool', 'N/A')
        amount = details.get('amount', '0.0')
        token = details.get('token', 'SOL')
        est_yield = details.get('yield', 'N/A')
        slippage = details.get('slippage', '0.5%')
        
        emoji = "🔥" if "CLAIM" in action else "🗡️"
        
        return (
            f"🛡️ **PATRYN STRIKE AUTHORIZATION** 🛡️\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"**ID:** `{trade_id}`\n"
            f"**Action:** {emoji} `{action}`\n"
            f"**Target Pool:** `{pool}`\n"
            f"**Size:** `{amount} {token}`\n"
            f"**Max Slippage:** `{slippage}`\n"
            f"**Est. Fees/Yield:** `{est_yield}`\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"React with ✅ to **AUTHORIZE** strike.\n"
            f"React with ❌ to **ABORT**."
        )

    async def check_trade(self, trade_id: str, trade_details: Dict[str, Any]) -> bool:
        """
        Gates a trade until human confirmation via Discord.
        Without Discord credentials, fail closed. Missing approval plumbing must
        never become implicit approval for live money.
        """
        if not self._discord_enabled:
            logger.error(f"Trade {trade_id} blocked: no owner approval gate configured.")
            return False
            
        async with self.lock:
            logger.info(f"Checking trade: {trade_id}")
            
            channel = self.bot.get_channel(self.channel_id)
            if not channel:
                logger.error(f"Trading channel {self.channel_id} not found!")
                return False

            message_text = self._format_approval_message(trade_id, trade_details)
            
            message = await channel.send(message_text)
            await message.add_reaction("✅")
            await message.add_reaction("❌")

            event = asyncio.Event()
            self.pending_trades[trade_id] = event
            
            try:
                # Wait for interaction (Timeout after 5 mins - fail CLOSED)
                await asyncio.wait_for(event.wait(), timeout=300.0)
                return self.trade_approvals.get(trade_id, False)
            except asyncio.TimeoutError:
                logger.warning(f"Trade {trade_id} timed out. ABORTING strike.")
                await channel.send(f"⚠️ **ABORTED**: Trade `{trade_id}` timed out (5m).")
                return False
            finally:
                self.pending_trades.pop(trade_id, None)
                self.trade_approvals.pop(trade_id, None)

    async def on_reaction(self, reaction: discord.Reaction, user: discord.User):
        if user.bot:
            return

        if "PATRYN STRIKE AUTHORIZATION" in reaction.message.content:
            # Extract trade_id from the formatted block
            content = reaction.message.content
            try:
                trade_id = content.split("**ID:** `")[1].split("`")[0]
            except IndexError:
                return
            
            if trade_id in self.pending_trades:
                if str(reaction.emoji) == "✅":
                    self.trade_approvals[trade_id] = True
                    self.pending_trades[trade_id].set()
                    await reaction.message.channel.send(f"⚔️ Strike Authorized: `{trade_id}`")
                elif str(reaction.emoji) == "❌":
                    self.trade_approvals[trade_id] = False
                    self.pending_trades[trade_id].set()
                    await reaction.message.channel.send(f"🛡️ Strike Aborted: `{trade_id}`")
