#!/usr/bin/env bash
set -euo pipefail
# server-setup.sh — Run on the server itself to set up and provision
# This script is copied to the server and executed remotely

VAULT_PASS="$1"
HOSTNAME="$2"
REPO="https://github.com/olalawal/openclaw-homelab.git"

echo "=== Disabling needrestart prompts ==="
sudo mkdir -p /etc/needrestart/conf.d
echo '$nrconf{restart} = "a";' | sudo tee /etc/needrestart/conf.d/no-prompt.conf > /dev/null

echo "=== Cloning repo ==="
if [ -d /home/openclaw/openclaw-homelab ]; then
    echo "Repo exists, pulling latest..."
    cd /home/openclaw/openclaw-homelab && git pull
else
    git clone "$REPO" /home/openclaw/openclaw-homelab
fi

echo "=== Installing Ansible collections ==="
ansible-galaxy collection install community.general ansible.posix 2>&1 | tail -3

echo "=== Setting up vault password ==="
echo "$VAULT_PASS" > /home/openclaw/openclaw-homelab/.vault_pass
chmod 600 /home/openclaw/openclaw-homelab/.vault_pass

echo "=== Setting up SSH key for local provisioning ==="
if [ ! -f /home/openclaw/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -f /home/openclaw/.ssh/id_ed25519 -N ""
fi
grep -qF "$(cat /home/openclaw/.ssh/id_ed25519.pub)" /home/openclaw/.ssh/authorized_keys 2>/dev/null || \
    cat /home/openclaw/.ssh/id_ed25519.pub >> /home/openclaw/.ssh/authorized_keys
chmod 600 /home/openclaw/.ssh/authorized_keys
ssh -o StrictHostKeyChecking=no localhost "echo SSH key works" 2>/dev/null || true

echo "=== Updating inventory for local run ==="
cd /home/openclaw/openclaw-homelab
sed -i "/$HOSTNAME:/,/ansible_host:/{s/ansible_host: .*/ansible_host: \"127.0.0.1\"/}" inventory/hosts.yml

echo "=== Running site.yml playbook ==="
sudo ansible-playbook playbooks/site.yml \
    -l "$HOSTNAME" \
    --connection=local \
    -e "ansible_ssh_extra_args='-o StrictHostKeyChecking=no'" \
    2>&1

echo "=== PROVISIONING COMPLETE ==="
