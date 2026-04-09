[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$ProfilePath = $PROFILE.CurrentUserCurrentHost
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ProfilePath)) {
    Write-Host "PowerShell profile not found: $ProfilePath"
    exit 0
}

$existingContent = Get-Content -LiteralPath $ProfilePath -Raw
if ($null -eq $existingContent) {
    $existingContent = ''
}
$blockPattern = '(?ms)^# >>> The-Nexus codexU cc-connect >>>\r?\n.*?^# <<< The-Nexus codexU cc-connect <<<\r?\n?'

if (-not [regex]::IsMatch($existingContent, $blockPattern)) {
    Write-Host "No codexU bridge wrapper found in: $ProfilePath"
    exit 0
}

$updatedContent = [regex]::Replace($existingContent, $blockPattern, '', 1).TrimEnd("`r", "`n")
if (-not [string]::IsNullOrEmpty($updatedContent)) {
    $updatedContent += [Environment]::NewLine
}

if ($PSCmdlet.ShouldProcess($ProfilePath, 'Remove codexU bridge wrapper')) {
    Set-Content -LiteralPath $ProfilePath -Value $updatedContent -Encoding UTF8
}

Write-Host "codexU bridge wrapper removed from: $ProfilePath"
