name: register-runner
description: "Re-register self-hosted GitHub Actions runner on ola-claw-dev for Pryan-Fire"
args:
  repo:
    description: "Repository name (org/repo)"
    type: string
    default: "The-Nexus-Decoded/Pryan-Fire"
  host:
    description: "Target host where runner will be installed"
    type: string
    default: "100.94.203.10"
  user:
    description: "SSH user on target host"
    type: string
    default: "openclaw"
steps:
  - id: generate-token
    description: "Generate GitHub self-hosted runner registration token"
    command: |
      set -e
      TOKEN=$(gh api -X POST -H "Accept: application/vnd.github+json" "/repos/${repo}/actions/runners/registration-token" | jq -r '.token')
      echo "${TOKEN}" > /data/openclaw/workspace/.runner-token
      echo "Generated registration token for ${repo}"
    timeoutMs: 30000

  - id: backup-old-runner
    description: "Backup existing runner directory if present"
    command: |
      set -e
      ssh ${user}@${host} "
        if [ -d ~/actions-runner ]; then
          mv ~/actions-runner ~/actions-runner.backup.$(date +%s)
          echo 'Backed up existing runner'
        else
          echo 'No existing runner to backup'
        fi
      "
    timeoutMs: 30000

  - id: download-runner
    description: "Download and extract GitHub Actions runner"
    command: |
      set -e
      ssh ${user}@${host} "
        cd ~
        curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-x64-2.322.0.tar.gz
        tar xzf actions-runner-linux-x64.tar.gz
        rm actions-runner-linux-x64.tar.gz
        echo 'Runner downloaded and extracted'
      "
    timeoutMs: 120000

  - id: configure-runner
    description: "Configure runner with registration token"
    command: |
      set -e
      TOKEN=$(cat /data/openclaw/workspace/.runner-token)
      ssh ${user}@${host} "
        set -e
        cd ~/actions-runner
        ./config.sh --url https://github.com/${repo} --token \"${TOKEN}\" --work _work --labels ola-claw-dev --replace
        echo 'Runner configured'
      "
    timeoutMs: 60000

  - id: install-service
    description: "Install runner as systemd service"
    command: |
      set -e
      ssh ${user}@${host} "
        set -e
        cd ~/actions-runner
        sudo ./svc.sh install
        sudo systemctl enable actions-runner
        sudo systemctl start actions-runner
        echo 'Service installed and started'
      "
    timeoutMs: 60000

  - id: verify-status
    description: "Check service status on host"
    command: |
      set -e
      ssh ${user}@${host} "systemctl status actions-runner --no-pager -n 20" 2>&1
    timeoutMs: 10000

  - id: final-check
    description: "Verify runner appears online in GitHub"
    command: |
      set -e
      sleep 5
      gh api -H "Accept: application/vnd.github+json" "/repos/${repo}/actions/runners" | jq '.runners[] | select(.name==\"ola-claw-dev\") | {name, status, os, lastSeen}'
    timeoutMs: 30000