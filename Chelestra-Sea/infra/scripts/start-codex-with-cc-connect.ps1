[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CodexArgs
)

$ErrorActionPreference = 'Stop'

$bridgeLauncher = Join-Path $PSScriptRoot 'start-cc-connect.ps1'
& $bridgeLauncher -ResetSession

& codex @CodexArgs
exit $LASTEXITCODE
