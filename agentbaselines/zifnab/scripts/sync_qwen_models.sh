#!/bin/bash
set -euo pipefail

SOURCE="/data/repos/"
DEST="openclaw@$1:$2"
echo "=== Syncing Qwen3.5 models to $DEST ==="
echo "Time: $(date)"
echo "Source: $SOURCE"
echo "Destination: $DEST"

# Sync each model directory
for model in Qwen3.5-2B Qwen3.5-4B Qwen3.5-9B; do
    echo ""
    echo "--- Syncing $model ---"
    rsync -avz --progress \
        --include="$model/" \
        --include="$model/**" \
        --exclude="*" \
        "$SOURCE" "$DEST"
done

echo ""
echo "=== Sync complete ==="
echo "Time: $(date)"

# Verify on remote
echo "Verifying on remote..."
ssh "$1" "ls -la $2/Qwen3.5-*"