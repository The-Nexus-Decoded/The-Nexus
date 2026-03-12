name: death-gate-fleet-sync
description: "Death Gate Cycle: Fleet-wide repository synchronization and status verification."
steps:
  - id: sync_main
    description: "Sync Pryan-Fire to Zifnab (ola-claw-main)"
    command: |
      echo "--- Syncing Pryan-Fire to Zifnab ---"
      ssh [REDACTED_IP] "cd /data/openclaw/workspace/Pryan-Fire && git pull origin main"
  - id: sync_trade
    description: "Sync Pryan-Fire to Hugh (ola-claw-trade)"
    command: |
      echo "--- Syncing Pryan-Fire to Hugh ---"
      ssh [REDACTED_IP] "cd /data/openclaw/workspace/Pryan-Fire && git pull origin main"
  - id: verify_fleet
    description: "Verify fleet health across all realms"
    command: |
      /data/openclaw/workspace/Chelestra-Sea/workflows/fleet-status.lobster
