# prep-usb.ps1 — Prepare USB drive for autoinstall with correct hostname
# Usage: .\scripts\prep-usb.ps1 -Hostname ola-claw-dev -UsbDrive D
#
# This copies user-data + meta-data to the USB and sets the hostname.
# Run this INSTEAD of manually editing files.

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("ola-claw-main", "ola-claw-trade", "ola-claw-dev")]
    [string]$Hostname,

    [Parameter(Mandatory=$true)]
    [string]$UsbDrive
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$usbPath = "${UsbDrive}:"
$nocloudPath = Join-Path $usbPath "nocloud"
$grubCfgPath = Join-Path $usbPath "boot\grub\grub.cfg"
$sourceUserData = Join-Path $repoRoot "autoinstall\user-data"
$sourceMetaData = Join-Path $repoRoot "autoinstall\meta-data"

# Validate USB drive exists
if (-not (Test-Path $usbPath)) {
    Write-Error "USB drive $usbPath not found. Check the drive letter."
    exit 1
}

# Validate source files exist
if (-not (Test-Path $sourceUserData)) {
    Write-Error "user-data not found at $sourceUserData"
    exit 1
}

# Create nocloud folder
if (-not (Test-Path $nocloudPath)) {
    New-Item -ItemType Directory -Path $nocloudPath | Out-Null
    Write-Host "Created $nocloudPath"
}

# Copy user-data, replace hostname
$userData = Get-Content $sourceUserData -Raw
# Replace any hostname value (whether CHANGE-ME or a previous server name)
$userData = $userData -replace 'hostname: .+', "hostname: $Hostname"
Set-Content -Path (Join-Path $nocloudPath "user-data") -Value $userData -NoNewline
Write-Host "Copied user-data with hostname: $Hostname"

# Copy meta-data
Copy-Item $sourceMetaData (Join-Path $nocloudPath "meta-data") -Force
Write-Host "Copied meta-data"

# Patch GRUB for hands-free boot (if not already patched)
if (Test-Path $grubCfgPath) {
    $grubCfg = Get-Content $grubCfgPath -Raw
    if ($grubCfg -notmatch "autoinstall") {
        $grubCfg = $grubCfg -replace 'set timeout=\d+', 'set timeout=5'
        $grubCfg = $grubCfg -replace '(linux\s+/casper/vmlinuz)\s+---', '$1 autoinstall ds=nocloud\;seedfrom=/cdrom/nocloud/  ---'
        Set-Content -Path $grubCfgPath -Value $grubCfg -NoNewline
        Write-Host "Patched GRUB for hands-free autoinstall"
    } else {
        Write-Host "GRUB already patched for autoinstall"
    }
} else {
    Write-Warning "GRUB config not found at $grubCfgPath - was the ISO flashed with Rufus?"
}

Write-Host ""
Write-Host "USB ready for $Hostname. Plug it in, boot from USB, walk away." -ForegroundColor Green
