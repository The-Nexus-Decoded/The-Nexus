[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$StartupScriptPath,
    [string]$ConfigPath = "$HOME\.cc-connect\config.toml",
    [string]$StartupDir = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'),
    [string]$StartupFileName = 'the-nexus-cc-connect.cmd'
)

$ErrorActionPreference = 'Stop'

if (-not $StartupScriptPath) {
    $StartupScriptPath = Join-Path $PSScriptRoot 'start-cc-connect.ps1'
}

$resolvedStartupScript = (Resolve-Path -LiteralPath $StartupScriptPath).Path

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "cc-connect config not found: $ConfigPath"
}

if (-not (Test-Path -LiteralPath $StartupDir)) {
    throw "Windows Startup folder not found: $StartupDir"
}

$startupEntryPath = Join-Path $StartupDir $StartupFileName
$startupEntry = @(
    '@echo off'
    ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}" -ConfigPath "{1}"' -f $resolvedStartupScript, $ConfigPath)
    'exit /b %errorlevel%'
) -join [Environment]::NewLine

if ($PSCmdlet.ShouldProcess($startupEntryPath, 'Create or update Startup entry')) {
    Set-Content -LiteralPath $startupEntryPath -Value $startupEntry -Encoding ASCII
}

Write-Host "Startup entry ready: $startupEntryPath"
Write-Host "Script: $resolvedStartupScript"
Write-Host "Config: $ConfigPath"
