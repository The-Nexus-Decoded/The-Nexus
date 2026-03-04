#!/bin/bash
# Wrapper script to start Combined Runner (Orchestrator + Scanners) with proper environment
cd /data/openclaw/workspace/Pryan-Fire
export PYTHONPATH="/data/openclaw/workspace/Pryan-Fire/hughs-forge/risk-manager/src:/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/src"
exec /data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/venv/bin/python3 combined_runner.py
