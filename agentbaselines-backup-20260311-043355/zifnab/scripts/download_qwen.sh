#!/bin/bash
set -euo pipefail

MODEL_SIZE="$1"
REPO_URL="$2"
DEST_DIR="/data/repos/$(basename "$REPO_URL" .git)"

echo "=== Starting Qwen3.5 ${MODEL_SIZE} download ==="
echo "Destination: $DEST_DIR"
echo "Time: $(date)"

# Ensure LFS is installed
if ! command -v git-lfs &> /dev/null; then
    echo "Installing git-lfs..."
    sudo apt-get update && sudo apt-get install -y git-lfs
    git lfs install
fi

# Clean up any partial clone
if [ -d "$DEST_DIR" ]; then
    echo "Removing existing partial clone..."
    rm -rf "$DEST_DIR"
fi

# Clone with LFS, show progress
echo "Cloning repository..."
git lfs clone --progress "$REPO_URL" "$DEST_DIR" 2>&1 | tee "/tmp/qwen-${MODEL_SIZE}-download.log"

# Verify LFS files are downloaded
echo "Verifying LFS files..."
cd "$DEST_DIR"
git lfs fetch --all
git lfs checkout

# Count actual vs expected files
ACTUAL=$(find . -type f -name "pytorch_model.bin" | wc -l)
echo "Found $ACTUAL pytorch_model.bin files"

echo "=== Download complete ==="
echo "Time: $(date)"