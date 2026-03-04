# OpenClaw Autoinstall — Ubuntu 24.04 LTS

Automated OS installation targeting the 240GB SSD. Both drives get wiped clean. Zero typing on the server — everything is scripted from Windows.

## What You Need

- USB flash drive (4GB+)
- Ubuntu 24.04 LTS Server ISO
- Rufus (Windows) for flashing the ISO

## One-Time USB Setup

Only do this once after flashing a fresh ISO:

### 1. Flash the ISO

1. Download Ubuntu 24.04 LTS Server ISO from https://ubuntu.com/download/server
2. Open Rufus, select your USB drive, select the ISO
3. Flash it (use default settings — GPT, DD mode if prompted)

### 2. Prep the USB (scripted)

From PowerShell in the repo root, run:

```powershell
.\scripts\prep-usb.ps1 -Hostname ola-claw-dev -UsbDrive D
```

This does everything automatically:
- Creates `nocloud` folder on USB
- Copies `user-data` and `meta-data`
- Sets the hostname
- Patches GRUB for hands-free boot (5s timeout, auto-selects autoinstall)

That's it for USB setup. The GRUB patch persists — you never re-flash the ISO.

## Per-Server Install

For each new server, just run the prep script with the right hostname:

```powershell
.\scripts\prep-usb.ps1 -Hostname ola-claw-main -UsbDrive D
.\scripts\prep-usb.ps1 -Hostname ola-claw-trade -UsbDrive D
.\scripts\prep-usb.ps1 -Hostname ola-claw-dev -UsbDrive D
```

Then:

1. Unplug any drive smaller than 240GB (autoinstall targets smallest disk)
2. Plug USB into the server
3. Boot from USB (F12 / Del / F2 for BIOS boot menu)
4. Walk away — GRUB auto-selects, install runs unattended, server reboots when done

## After Install

### Find the server and update inventory (scripted)

From PowerShell:

```powershell
.\scripts\bootstrap.ps1 -Hostname ola-claw-dev
```

This scans the LAN for the server, updates `inventory/hosts.yml` with its IP, and prints the exact ansible command to run.

### Run the playbook (from WSL)

```bash
ansible-playbook playbooks/site.yml -l ola-claw-dev -e 'ansible_ssh_extra_args="-o StrictHostKeyChecking=no"'
```

The playbook handles everything: kernel params (auto-reboots if needed), networking, Tailscale, hardening, GPU drivers, data drive, OpenClaw, Ollama, notifications.

### Update inventory with Tailscale IP (scripted)

After the playbook finishes, it saves Tailscale IPs to `tailscale-ips.yml`. Update inventory:

```powershell
.\scripts\update-inventory-tailscale.ps1
```

All future ansible runs go through the VPN tunnel.

### Verify everything survived a reboot

```bash
ansible-playbook playbooks/reboot-verify.yml -l ola-claw-dev
```

## Full Workflow Summary

```
# One-time: flash ISO with Rufus

# Per server:
.\scripts\prep-usb.ps1 -Hostname ola-claw-dev -UsbDrive D    # prep USB
# boot server from USB, walk away
.\scripts\bootstrap.ps1 -Hostname ola-claw-dev                # find IP, update inventory
ansible-playbook playbooks/site.yml -l ola-claw-dev            # provision (from WSL)
.\scripts\update-inventory-tailscale.ps1                       # switch to Tailscale IP
ansible-playbook playbooks/reboot-verify.yml -l ola-claw-dev   # verify (from WSL)
```

## Password

The default password is `openclaw`. Ansible disables password auth and switches to key-only SSH during provisioning. If you want a custom password, generate a hash and update `autoinstall/user-data`:

```bash
# From WSL or Linux:
mkpasswd --method=sha-512 "your-password"
# Or from Python:
python -c "import crypt; print(crypt.crypt('your-password', crypt.mksalt(crypt.METHOD_SHA512)))"
```

Replace the `password:` value in `user-data` with the output.

## Disk Layout

| Partition | Size   | Mount     | Filesystem |
|-----------|--------|-----------|------------|
| ESP       | 512 MB | /boot/efi | fat32      |
| Boot      | 1 GB   | /boot     | ext4       |
| Swap      | 4 GB   | (swap)    | swap       |
| Root      | ~234GB | /         | ext4       |

The 2TB NVMe is wiped during autoinstall. The `data-drive` Ansible role partitions, formats, and mounts it at `/data`.

## Troubleshooting

**Install targets the wrong disk:** Autoinstall uses `match: { size: smallest }`. Unplug any drive smaller than 240GB before booting.

**Server doesn't get an IP:** Check ethernet cable. Autoinstall uses DHCP.

**bootstrap.ps1 can't find the server:** Make sure the server finished installing and rebooted. Try pinging IPs in your subnet manually.
