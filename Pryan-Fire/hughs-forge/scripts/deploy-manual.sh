#!/bin/bash
# Manual Deployment Rune (rsync + SSH bypass)
TARGET_HOST="100.104.166.53"
TARGET_USER="olawal"
TARGET_DIR="/data/repos/Pryan-Fire"

echo "🗡️ Initiating rsync strike to ${TARGET_HOST}..."
rsync -avz --exclude 'node_modules' --exclude '.git' ./ ${TARGET_USER}@${TARGET_HOST}:${TARGET_DIR}
