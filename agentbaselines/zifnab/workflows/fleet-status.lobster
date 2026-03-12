name: fleet-status
description: "Aggregate health status, disk usage, and process status from all 3 fleet servers."
steps:
  - id: status_local
    description: "Check status of ola-claw-dev (local)"
    command: |
      echo "--- [ola-claw-dev] Status ---"
      uptime
      df -h /data | grep /data
      systemctl --user is-active openclaw-gateway
  - id: status_main
    description: "Check status of ola-claw-main (Zifnab)"
    command: |
      echo "--- [ola-claw-main] Status ---"
      ssh 100.94.203.10 "uptime; df -h /data | grep /data; systemctl --user is-active openclaw-gateway"
  - id: status_trade
    description: "Check status of ola-claw-trade (Hugh)"
    command: |
      echo "--- [ola-claw-trade] Status ---"
      ssh 100.94.203.10 "uptime; df -h /data | grep /data; systemctl --user is-active openclaw-gateway"
