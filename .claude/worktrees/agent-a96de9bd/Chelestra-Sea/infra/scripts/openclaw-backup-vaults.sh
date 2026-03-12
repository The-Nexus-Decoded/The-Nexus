#!/bin/bash
# Sync all agent workspace .md files to Nexus-Vaults and commit
# Runs on Haplo (has The-Nexus monorepo clone)
# Collects from all 3 servers via SSH
set -euo pipefail

REPO="/data/openclaw/workspace/The-Nexus"
VAULTS="$REPO/Nexus-Vaults/agent-backups"
LOG="/data/openclaw/logs/backup-vaults.log"
HAPLO_IP="localhost"
ZIFNAB_IP="100.103.189.117"
HUGH_IP="100.104.166.53"

mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date +%Y-%m-%dT%H:%M:%S)] $1" >> "$LOG"; }

log "=== Vault sync started ==="

# Ensure repo is up to date
cd "$REPO"
git fetch origin main --quiet 2>>"$LOG" || true
git checkout main --quiet 2>>"$LOG" || true
git pull origin main --quiet 2>>"$LOG" || true

# Define server->profile mapping
declare -A SERVER_PROFILES
SERVER_PROFILES[haplo]="haplo:$HAPLO_IP:/data/openclaw/workspace"
SERVER_PROFILES[alfred]="alfred:$HAPLO_IP:/data/openclaw/workspace-alfred"
SERVER_PROFILES[marit]="marit:$HAPLO_IP:/data/openclaw/workspace-marit"
SERVER_PROFILES[paithan]="paithan:$HAPLO_IP:/data/openclaw/workspace-paithan"
SERVER_PROFILES[orla]="orla:$HAPLO_IP:/data/openclaw/workspace-orla"
SERVER_PROFILES[zifnab]="zifnab:$ZIFNAB_IP:/data/openclaw/workspace"
SERVER_PROFILES[rega]="rega:$ZIFNAB_IP:/data/openclaw/workspace-rega"
SERVER_PROFILES[sangdrax]="sangdrax:$ZIFNAB_IP:/data/openclaw/workspace-sangdrax"
SERVER_PROFILES[hugh]="hugh:$HUGH_IP:/data/openclaw/workspace"
SERVER_PROFILES[samah]="samah:$HUGH_IP:/data/openclaw/workspace-samah"

FAILED=0
CHANGED=0

for agent in haplo alfred marit paithan orla zifnab rega sangdrax hugh samah; do
  IFS=: read -r name host wspath <<< "${SERVER_PROFILES[$agent]}"
  dest="$VAULTS/$name"
  mkdir -p "$dest"

  log "Syncing $name from $host:$wspath"
  if [ "$host" = "localhost" ]; then
    cp "$wspath"/*.md "$dest/" 2>/dev/null || true
  else
    scp -o ConnectTimeout=10 -o BatchMode=yes "openclaw@${host}:${wspath}/*.md" "$dest/" 2>>"$LOG" || {
      log "  FAILED: $name"
      FAILED=$((FAILED + 1))
      continue
    }
  fi
  log "  OK: $name ($(ls "$dest"/*.md 2>/dev/null | wc -l) files)"
done

# Commit if there are changes
cd "$REPO"
git add Nexus-Vaults/agent-backups/ 2>>"$LOG"
if ! git diff --cached --quiet 2>/dev/null; then
  TIMESTAMP=$(date +%Y-%m-%d)
  git commit -m "backup: daily agent workspace sync ($TIMESTAMP)" --quiet 2>>"$LOG"
  git push origin main --quiet 2>>"$LOG" && log "Pushed to origin" || log "Push failed"
  CHANGED=1
else
  log "No workspace changes detected — skipping commit"
fi

if [ "$FAILED" -eq 0 ]; then
  log "=== Vault sync complete (changed=$CHANGED) ==="
else
  log "=== Vault sync finished with $FAILED failure(s) ==="
  exit 1
fi
