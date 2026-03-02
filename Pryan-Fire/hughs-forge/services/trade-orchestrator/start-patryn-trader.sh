#!/bin/bash
# Wrapper script to start Combined Runner (Orchestrator + Scanners) with proper environment
cd /data/repos/Pryan-Fire
export PYTHONPATH="/data/repos/Pryan-Fire/hughs-forge/risk-manager/src:/data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src"
exec /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/venv/bin/python3 combined_runner.py --meteora