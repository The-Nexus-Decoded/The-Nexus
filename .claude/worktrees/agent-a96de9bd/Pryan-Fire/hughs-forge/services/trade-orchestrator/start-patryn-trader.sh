#!/bin/bash
# Wrapper script to start TradeOrchestrator with proper environment
cd /data/repos/The-Nexus/Pryan-Fire
export PYTHONPATH="/data/repos/The-Nexus/Pryan-Fire/hughs-forge/risk-manager/src:/data/repos/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/src"
exec /data/repos/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/venv/bin/python3 hughs-forge/services/trade-orchestrator/src/TradeOrchestrator.py