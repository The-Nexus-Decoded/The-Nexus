#!/bin/bash
# Wrapper script to start TradeOrchestrator with proper environment
cd /data/repos/Pryan-Fire
export PYTHONPATH="/data/repos/Pryan-Fire/hughs-forge/risk-manager/src:/data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src"
exec /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/venv/bin/python3 hughs-forge/services/trade-orchestrator/src/TradeOrchestrator.py