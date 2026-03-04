# bootstrap.ps1 — Find a newly installed server on LAN, update inventory, run playbook
# Usage: .\scripts\bootstrap.ps1 -Hostname ola-claw-dev
#
# What it does:
#   1. Scans LAN for the server (tries SSH on 192.168.1.0/24)
#   2. Updates inventory/hosts.yml with the discovered IP
#   3. Runs the full site.yml playbook
#   4. After Tailscale connects, updates inventory with Tailscale IP
#
# Requires: WSL with Ansible installed, or run from a Linux box

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("ola-claw-main", "ola-claw-trade", "ola-claw-dev")]
    [string]$Hostname,

    [string]$Subnet = "192.168.1",

    [int]$StartIP = 2,

    [int]$EndIP = 254
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$inventoryFile = Join-Path $repoRoot "inventory\hosts.yml"

Write-Host "Scanning $Subnet.0/24 for $Hostname..." -ForegroundColor Cyan

$foundIP = $null

# Scan LAN for SSH-accessible hosts, check hostname
for ($i = $StartIP; $i -le $EndIP; $i++) {
    $ip = "$Subnet.$i"
    $ping = Test-Connection -ComputerName $ip -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($ping) {
        Write-Host "  Checking $ip..." -NoNewline
        try {
            # Try SSH and check hostname
            $result = ssh -o ConnectTimeout=2 -o StrictHostKeyChecking=no -o BatchMode=yes "openclaw@$ip" "hostname" 2>$null
            if ($result -eq $Hostname) {
                $foundIP = $ip
                Write-Host " FOUND!" -ForegroundColor Green
                break
            } else {
                Write-Host " $result (not a match)"
            }
        } catch {
            Write-Host " no SSH"
        }
    }
}

if (-not $foundIP) {
    Write-Error "Could not find $Hostname on $Subnet.0/24. Is the server booted and connected to LAN?"
    exit 1
}

Write-Host ""
Write-Host "Found $Hostname at $foundIP" -ForegroundColor Green

# Update inventory file
$inventory = Get-Content $inventoryFile -Raw
$pattern = "($Hostname`:\s+ansible_host:\s*`")([^`"]+)(`")"
$inventory = $inventory -replace $pattern, "`${1}$foundIP`${3}"
Set-Content -Path $inventoryFile -Value $inventory -NoNewline
Write-Host "Updated inventory/hosts.yml: $Hostname -> $foundIP"

Write-Host ""
Write-Host "Ready to provision. Run from WSL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  cd /mnt/h/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_Tools_And_Information/openclaw-homelab"
Write-Host "  ansible-playbook playbooks/site.yml -l $Hostname -e 'ansible_ssh_extra_args=`"-o StrictHostKeyChecking=no`"'"
Write-Host ""
Write-Host "After the playbook finishes, run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ansible-playbook playbooks/reboot-verify.yml -l $Hostname"
