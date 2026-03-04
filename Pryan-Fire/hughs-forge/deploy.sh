#!/bin/bash
set -e
# This script is executed on the trade server by the GitHub Actions workflow.

# 1. Get the directory of the script to ensure paths are correct
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"
echo "--- Changed directory to $SCRIPT_DIR ---"

# 2. Pull the latest code from the main branch
echo "--- Pulling latest changes from main ---"
git fetch origin main
git reset --hard origin/main

# 3. Install/update Python dependencies in a virtual environment
echo "--- Installing Python dependencies ---"
if [ ! -d "venv" ]; then
  echo "--- Creating Python virtual environment ---"
  python3 -m venv venv
fi
source venv/bin/activate

# Install dependencies for both services (each has its own requirements.txt)
echo "--- Installing trade-executor dependencies ---"
pip install -r services/trade-executor/requirements.txt

echo "--- Installing trade-orchestrator dependencies ---"
pip install -r services/trade-orchestrator/requirements.txt

# 4. Run the main application as a smoke test
# This is expected to fail if the .env file is not present, but it confirms setup.
echo "--- Attempting to run the application (smoke test) ---"
python3 ../services/trade-executor/main.py

echo "--- Deployment script finished. ---"
