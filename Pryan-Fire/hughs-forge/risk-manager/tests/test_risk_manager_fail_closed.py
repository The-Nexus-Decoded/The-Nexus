from __future__ import annotations

import asyncio
import os
import sys
import types


class _FakeBot:
    def __init__(self, *args, **kwargs):
        pass

    def event(self, func):
        return func

    def get_channel(self, channel_id):
        return None


fake_discord = types.ModuleType("discord")
fake_discord.Reaction = object
fake_discord.User = object
fake_discord.Intents = types.SimpleNamespace(all=lambda: object())
fake_ext = types.ModuleType("discord.ext")
fake_commands = types.ModuleType("discord.ext.commands")
fake_commands.Bot = _FakeBot
sys.modules.setdefault("discord", fake_discord)
sys.modules.setdefault("discord.ext", fake_ext)
sys.modules.setdefault("discord.ext.commands", fake_commands)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from RiskManager import RiskManager


def test_missing_discord_credentials_fail_closed():
    manager = RiskManager()

    approved = asyncio.run(manager.check_trade("trade-1", {"amount": 1}))

    assert approved is False
    assert manager._discord_enabled is False
