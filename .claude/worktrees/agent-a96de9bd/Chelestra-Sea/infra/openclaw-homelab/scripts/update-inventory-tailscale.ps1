# update-inventory-tailscale.ps1 — Auto-update inventory with Tailscale IPs
# Usage: .\scripts\update-inventory-tailscale.ps1
#
# Reads tailscale-ips.yml (written by site.yml post_tasks) and updates
# inventory/hosts.yml so all future runs go through the VPN tunnel.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$tailscaleIpsFile = Join-Path $repoRoot "tailscale-ips.yml"
$inventoryFile = Join-Path $repoRoot "inventory\hosts.yml"

if (-not (Test-Path $tailscaleIpsFile)) {
    Write-Error "tailscale-ips.yml not found. Run site.yml first — it writes this file automatically."
    exit 1
}

Write-Host "Reading Tailscale IPs from $tailscaleIpsFile" -ForegroundColor Cyan

$inventory = Get-Content $inventoryFile -Raw

Get-Content $tailscaleIpsFile | ForEach-Object {
    if ($_ -match '^(\S+):\s+"?(\d+\.\d+\.\d+\.\d+)"?') {
        $hostname = $Matches[1]
        $tsIP = $Matches[2]
        $pattern = "($hostname`:\s+ansible_host:\s*`")([^`"]+)(`")"
        $inventory = $inventory -replace $pattern, "`${1}$tsIP`${3}"
        Write-Host "  $hostname -> $tsIP" -ForegroundColor Green
    }
}

Set-Content -Path $inventoryFile -Value $inventory -NoNewline
Write-Host ""
Write-Host "inventory/hosts.yml updated with Tailscale IPs." -ForegroundColor Green
Write-Host "All future ansible runs will go through the VPN tunnel."
