#!/bin/bash
# Local backup: openclaw backup create for all profiles on this server
# Main profiles (haplo/zifnab/hugh) use manual tar (state dir too large for full backup)
# Sub-profiles use openclaw backup create (small state dirs)
# Retention: 7 days
set -euo pipefail

BACKUP_DIR="/data/backups/openclaw"
LOG="/data/openclaw/logs/backup-local.log"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG")"
log() { echo "[$(date +%Y-%m-%dT%H:%M:%S)] $1" >> "$LOG"; }

HOSTNAME=$(hostname)
MAIN_PROFILE=""
SUB_PROFILES=""

case "$HOSTNAME" in
  ola-claw-dev)
    MAIN_PROFILE="haplo"
    SUB_PROFILES="alfred marit paithan orla"
    ;;
  ola-claw-main)
    MAIN_PROFILE="zifnab"
    SUB_PROFILES="rega sangdrax"
    ;;
  ola-claw-trade)
    MAIN_PROFILE="hugh"
    SUB_PROFILES="samah"
    ;;
  *) log "ERROR: Unknown hostname $HOSTNAME"; exit 1 ;;
esac

log "=== Local backup started on $HOSTNAME ==="
FAILED=0

# Main profile: manual tar of essential data only
# Excludes git repos, actions-runner, node_modules (all version-controlled or regenerable)
log "Backing up main profile: $MAIN_PROFILE (manual tar — essentials only)"
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%S)
ARCHIVE="$BACKUP_DIR/${TIMESTAMP}-${MAIN_PROFILE}-backup.tar.gz"
tar czf "$ARCHIVE" \
  -C /data/openclaw \
  --exclude='workspace/The-Nexus' \
  --exclude='workspace/Pryan-Fire' \
  --exclude='workspace/Arianus-Sky' \
  --exclude='workspace/Chelestra-Sea' \
  --exclude='workspace/Abarrach-Stone' \
  --exclude='workspace/actions-runner' \
  --exclude='workspace/ola-claw-ecosystem' \
  --exclude='workspace/venv' \
  --exclude='workspace/node_modules' \
  --exclude='workspace/.git' \
  --exclude='workspace/tax-forms-*' \
  --exclude='workspace/irs*' \
  openclaw.json \
  workspace/ \
  memory/ \
  agents/ \
  2>> "$LOG"

if [ $? -eq 0 ] && [ -f "$ARCHIVE" ]; then
  SIZE=$(du -h "$ARCHIVE" | cut -f1)
  log "  OK: $MAIN_PROFILE ($SIZE)"
else
  log "  FAILED: $MAIN_PROFILE"
  FAILED=$((FAILED + 1))
fi

# Sub-profiles: use openclaw backup create (small state dirs)
for profile in $SUB_PROFILES; do
  log "Backing up profile: $profile"
  if openclaw --profile "$profile" backup create --output "$BACKUP_DIR" --verify >> "$LOG" 2>&1; then
    log "  OK: $profile"
  else
    log "  FAILED: $profile"
    FAILED=$((FAILED + 1))
  fi
done

# Prune old backups
find "$BACKUP_DIR" -name "*-backup.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*-openclaw-backup.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
log "Pruned backups older than $RETENTION_DAYS days"

if [ "$FAILED" -eq 0 ]; then
  log "=== All profiles backed up successfully ==="
else
  log "=== $FAILED profile(s) failed ==="
  exit 1
fi
