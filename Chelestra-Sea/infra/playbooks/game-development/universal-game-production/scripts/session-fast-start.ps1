param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,
    [Parameter(Mandatory = $true)]
    [string]$Ticket,
    [string]$ExpectedBranch = "",
    [string]$ReceiptPath = "H:\CodexData\game-production-toolchain\receipts\production-toolchain.json",
    [int]$MaxReceiptAgeDays = 30,
    [string]$ContextVersion = "2026-08-24-universal-game-v2"
)

$ErrorActionPreference = "Stop"

function Invoke-Git([string[]]$Args) {
    $value = & git @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed: $($value -join [Environment]::NewLine)"
    }
    return $value
}

function Read-CachedReceipt([string]$Path) {
    if (-not (Test-Path $Path)) {
        return [ordered]@{ status = "REFRESH_REQUIRED"; reason = "receipt_missing"; path = $Path }
    }
    try {
        $receipt = Get-Content $Path -Raw | ConvertFrom-Json
        $generated = [DateTimeOffset]::Parse($receipt.generatedAt)
        $ageDays = (([DateTimeOffset]::UtcNow - $generated).TotalDays)
        $status = if ($receipt.result -eq "PASS" -and $ageDays -le $MaxReceiptAgeDays) { "CACHED_PASS" } else { "REFRESH_REQUIRED" }
        return [ordered]@{
            status = $status
            reason = if ($status -eq "CACHED_PASS") { $null } else { "receipt_failed_or_expired" }
            path = $Path
            receiptId = $receipt.receiptId
            generatedAt = $receipt.generatedAt
            ageDays = [Math]::Round($ageDays, 2)
            result = $receipt.result
        }
    } catch {
        return [ordered]@{ status = "REFRESH_REQUIRED"; reason = "receipt_unreadable"; path = $Path }
    }
}

try {
    $repoRoot = (Invoke-Git @("rev-parse", "--show-toplevel") | Select-Object -First 1).ToString().Trim()
    $branch = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).ToString().Trim()
    $head = (Invoke-Git @("rev-parse", "HEAD") | Select-Object -First 1).ToString().Trim()
    $statusLines = @(Invoke-Git @("status", "--short"))
    $receipt = Read-CachedReceipt $ReceiptPath

    $blocking = @()
    if ($ExpectedBranch -and $branch -ne $ExpectedBranch) { $blocking += "wrong_branch_expected_$ExpectedBranch" }
    if ($receipt.status -ne "CACHED_PASS") { $blocking += "toolchain_refresh_required" }

    [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        contextVersion = $ContextVersion
        projectId = $ProjectId
        ticket = $Ticket
        repositoryTopLevel = $repoRoot
        branch = $branch
        localHead = $head
        gitStatus = $statusLines
        toolchainReceipt = $receipt
        liveTrackerCheckStillRequiredByAgent = $true
        projectProfileAndOverlayStillRequiredByAgent = $true
        fullBootstrapRequired = ($receipt.status -ne "CACHED_PASS")
        blockingIssues = $blocking
        result = if ($blocking.Count -eq 0) { "PASS_LOCAL_FAST_START" } else { "BLOCKED_OR_REFRESH_REQUIRED" }
    } | ConvertTo-Json -Depth 10

    if ($blocking.Count -gt 0) { exit 2 }
} catch {
    [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        projectId = $ProjectId
        ticket = $Ticket
        result = "BLOCKED"
        error = $_.Exception.Message
    } | ConvertTo-Json -Depth 8
    exit 3
}
