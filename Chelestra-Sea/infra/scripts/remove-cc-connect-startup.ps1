[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$StartupDir = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'),
    [string]$StartupFileName = 'the-nexus-cc-connect.cmd'
)

$ErrorActionPreference = 'Stop'

$startupEntryPath = Join-Path $StartupDir $StartupFileName
if (-not (Test-Path -LiteralPath $startupEntryPath)) {
    Write-Host "Startup entry not found: $startupEntryPath"
    exit 0
}

if ($PSCmdlet.ShouldProcess($startupEntryPath, 'Remove Startup entry')) {
    Remove-Item -LiteralPath $startupEntryPath -Force
}

Write-Host "Startup entry removed: $startupEntryPath"
