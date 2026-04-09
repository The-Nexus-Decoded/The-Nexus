[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ProfilePath = $PROFILE.CurrentUserCurrentHost,
    [string]$LauncherScriptPath
)

$ErrorActionPreference = 'Stop'

if (-not $LauncherScriptPath) {
    $LauncherScriptPath = Join-Path $PSScriptRoot 'start-codex-with-cc-connect.ps1'
}

$resolvedLauncher = (Resolve-Path -LiteralPath $LauncherScriptPath).Path
$profileDir = Split-Path -Parent $ProfilePath

if (-not (Test-Path -LiteralPath $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $ProfilePath)) {
    New-Item -ItemType File -Path $ProfilePath -Force | Out-Null
}

$markerStart = '# >>> The-Nexus codexU cc-connect >>>'
$markerEnd = '# <<< The-Nexus codexU cc-connect <<<'
$escapedLauncher = $resolvedLauncher.Replace("'", "''")
$snippet = @(
    $markerStart,
    'function global:codexU {',
    '    [CmdletBinding()]',
    '    param(',
    '        [Parameter(ValueFromRemainingArguments = $true)]',
    '        [string[]]$CodexArgs',
    '    )',
    ('    & ''{0}'' @CodexArgs' -f $escapedLauncher),
    '}',
    $markerEnd
) -join [Environment]::NewLine

$existingContent = Get-Content -LiteralPath $ProfilePath -Raw
if ($null -eq $existingContent) {
    $existingContent = ''
}
$blockPattern = '(?ms)^# >>> The-Nexus codexU cc-connect >>>\r?\n.*?^# <<< The-Nexus codexU cc-connect <<<\r?\n?'

if ([regex]::IsMatch($existingContent, $blockPattern)) {
    $updatedContent = [regex]::Replace($existingContent, $blockPattern, $snippet + [Environment]::NewLine, 1)
}
elseif ([string]::IsNullOrWhiteSpace($existingContent)) {
    $updatedContent = $snippet + [Environment]::NewLine
}
else {
    $trimmed = $existingContent.TrimEnd("`r", "`n")
    $updatedContent = $trimmed + [Environment]::NewLine + [Environment]::NewLine + $snippet + [Environment]::NewLine
}

if ($PSCmdlet.ShouldProcess($ProfilePath, 'Install or update codexU bridge wrapper')) {
    Set-Content -LiteralPath $ProfilePath -Value $updatedContent -Encoding UTF8
}

Write-Host "PowerShell profile ready: $ProfilePath"
Write-Host "codexU now launches via: $resolvedLauncher"
