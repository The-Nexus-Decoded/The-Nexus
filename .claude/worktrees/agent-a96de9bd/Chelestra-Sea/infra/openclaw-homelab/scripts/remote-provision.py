#!/usr/bin/env python3
"""
remote-provision.py — SSH into a server and run the full provisioning playbook.
No WSL, no Windows Ansible, no manual steps. Server provisions itself.

Usage: python scripts/remote-provision.py --host 192.168.1.211 --hostname ola-claw-dev
"""

import argparse
import sys
import time

import paramiko


def run_cmd(ssh, cmd, sudo=False, check=True, stream=True):
    """Run a command over SSH, print output in real-time."""
    if sudo:
        cmd = f"sudo -S bash -c '{cmd}'"
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)

    output = ""
    for line in iter(stdout.readline, ""):
        print(line, end="")
        output += line

    err = stderr.read().decode()
    if err and "WARNING" not in err and "dpkg-preconfigure" not in err:
        print(err, end="")

    exit_code = stdout.channel.recv_exit_status()
    if check and exit_code != 0:
        print(f"\nCommand failed with exit code {exit_code}")
        if not stream:
            print(err)
    return exit_code, output


def main():
    parser = argparse.ArgumentParser(description="Provision an OpenClaw server remotely")
    parser.add_argument("--host", required=True, help="Server IP address")
    parser.add_argument("--hostname", required=True, help="Server hostname (ola-claw-dev, etc.)")
    parser.add_argument("--user", default="openclaw", help="SSH username")
    parser.add_argument("--password", default="openclaw", help="SSH password")
    parser.add_argument("--vault-password", required=True, help="Ansible vault password")
    parser.add_argument("--repo", default="https://github.com/olalawal/openclaw-homelab.git", help="Git repo URL")
    args = parser.parse_args()

    print(f"Connecting to {args.user}@{args.host}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(args.host, username=args.user, password=args.password, timeout=15)
    print("Connected.")

    # Step 1: Install Ansible + git
    print("\n=== Installing Ansible and git ===")
    run_cmd(ssh, "sudo apt-get update -qq", check=False)
    run_cmd(ssh, "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ansible git sshpass", check=False)

    # Step 2: Verify Ansible installed
    rc, out = run_cmd(ssh, "ansible --version | head -1")
    if rc != 0:
        print("ERROR: Ansible installation failed")
        sys.exit(1)

    # Step 3: Clone or update repo
    print("\n=== Cloning repo ===")
    rc, _ = run_cmd(ssh, "test -d /home/openclaw/openclaw-homelab && echo exists", check=False)
    if "exists" in _:
        run_cmd(ssh, "cd /home/openclaw/openclaw-homelab && git pull", check=False)
    else:
        run_cmd(ssh, f"git clone {args.repo} /home/openclaw/openclaw-homelab")

    # Step 4: Install required Ansible collections
    print("\n=== Installing Ansible collections ===")
    run_cmd(ssh, "ansible-galaxy collection install community.general ansible.posix", check=False)

    # Step 5: Create vault password file
    print("\n=== Setting up vault ===")
    run_cmd(ssh, f"echo '{args.vault_password}' > /home/openclaw/openclaw-homelab/.vault_pass")
    run_cmd(ssh, "chmod 600 /home/openclaw/openclaw-homelab/.vault_pass")

    # Step 6: Generate SSH key for local ansible (connects to localhost)
    print("\n=== Setting up SSH key for local provisioning ===")
    run_cmd(ssh, 'test -f /home/openclaw/.ssh/id_ed25519 || ssh-keygen -t ed25519 -f /home/openclaw/.ssh/id_ed25519 -N ""')
    run_cmd(ssh, "cat /home/openclaw/.ssh/id_ed25519.pub >> /home/openclaw/.ssh/authorized_keys")
    run_cmd(ssh, "chmod 600 /home/openclaw/.ssh/authorized_keys")
    run_cmd(ssh, 'ssh -o StrictHostKeyChecking=no localhost "echo key works"', check=False)

    # Step 7: Update inventory to point to localhost
    print("\n=== Updating inventory for local run ===")
    run_cmd(ssh, f"""sed -i 's/ansible_host: .*/ansible_host: "127.0.0.1"/' /home/openclaw/openclaw-homelab/inventory/hosts.yml""")

    # Step 8: Run the playbook
    print("\n=== Running site.yml playbook ===")
    print("This will take a while — installing drivers, pulling models, etc.")
    rc, _ = run_cmd(ssh,
        f"cd /home/openclaw/openclaw-homelab && "
        f"sudo ansible-playbook playbooks/site.yml "
        f"-l {args.hostname} "
        f"--connection=local "
        f"-e 'ansible_ssh_extra_args=\"-o StrictHostKeyChecking=no\"'"
    )

    if rc == 0:
        print("\n=== PROVISIONING COMPLETE ===")
    else:
        print(f"\n=== PROVISIONING FAILED (exit code {rc}) ===")
        print("Check the output above for errors.")

    ssh.close()
    return rc


if __name__ == "__main__":
    sys.exit(main())
