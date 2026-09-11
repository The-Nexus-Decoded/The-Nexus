param(
    [Parameter(Mandatory = $true)]
    [int]$Ticket,
    [string]$ExpectedBranch = "",
    [string]$ReceiptPath = "H:\CodexData\souldrifter-toolchain\receipts\production-toolchain.json",
    [string]$TripoReceiptPath = "H:\CodexData\souldrifter-toolchain\receipts\tripo-provider.json",
    [int]$MaxReceiptAgeDays = 30,
    [string]$ContextVersion = "2026-08-25-master-v8",
    [string]$ToolchainSchemaVersion = "2026-08-24-toolchain-v1"
)

$ErrorActionPreference = "Stop"

function Invoke-Git([string[]]$GitArgs) {
    $value = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed: $($value -join [Environment]::NewLine)"
    }
    return $value
}

function Read-Receipt([string]$Path, [string]$Name, [string]$ExpectedToolchainSchema = "") {
    if (-not (Test-Path $Path)) {
        return [ordered]@{ name = $Name; status = "REFRESH_REQUIRED"; reason = "receipt_missing"; path = $Path }
    }
    try {
        $receipt = Get-Content $Path -Raw | ConvertFrom-Json
        $generated = if ($receipt.generatedAt -is [DateTime]) {
            [DateTimeOffset]::new($receipt.generatedAt.ToUniversalTime())
        } else {
            [DateTimeOffset]::Parse([string]$receipt.generatedAt)
        }
        $ageDays = (([DateTimeOffset]::UtcNow - $generated).TotalDays)
        $schemaMatches = (-not $ExpectedToolchainSchema) -or (($receipt.schemaVersion -eq 1) -and ($receipt.toolchainSchemaVersion -eq $ExpectedToolchainSchema))
        $status = if (($receipt.result -eq "PASS") -and ($ageDays -ge 0) -and ($ageDays -le $MaxReceiptAgeDays) -and $schemaMatches) {
            "CACHED_PASS"
        } else {
            "REFRESH_REQUIRED"
        }
        return [ordered]@{
            name = $Name
            status = $status
            reason = if ($status -eq "CACHED_PASS") {
                $null
            } elseif (-not $schemaMatches) {
                "receipt_schema_mismatch"
            } else {
                "receipt_failed_or_expired"
            }
            path = $Path
            receiptId = $receipt.receiptId
            generatedAt = $receipt.generatedAt
            ageDays = [Math]::Round($ageDays, 2)
            toolchainSchemaVersion = $receipt.toolchainSchemaVersion
            result = $receipt.result
        }
    } catch {
        return [ordered]@{ name = $Name; status = "REFRESH_REQUIRED"; reason = "receipt_unreadable"; path = $Path }
    }
}

try {
    $repoRoot = (Invoke-Git @("rev-parse", "--show-toplevel") | Select-Object -First 1).ToString().Trim()
    $branch = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).ToString().Trim()
    $head = (Invoke-Git @("rev-parse", "HEAD") | Select-Object -First 1).ToString().Trim()
    $statusLines = @(Invoke-Git @("status", "--short"))
    $remoteLines = @(Invoke-Git @("remote", "-v"))
    $worktreeLines = @(Invoke-Git @("worktree", "list", "--porcelain"))

    $toolchain = Read-Receipt $ReceiptPath "production-toolchain" $ToolchainSchemaVersion
    $tripo = Read-Receipt $TripoReceiptPath "tripo-provider"

    $secretPresent = [bool]$env:TRIPO_API_KEY
    if ($tripo.status -eq "CACHED_PASS" -and -not $secretPresent) {
        $tripo.status = "REFRESH_REQUIRED"
        $tripo.reason = "TRIPO_API_KEY_missing"
    }

    $blocking = @()
    if ($ExpectedBranch -and $branch -ne $ExpectedBranch) {
        $blocking += "wrong_branch_expected_$ExpectedBranch"
    }
    if ($toolchain.status -ne "CACHED_PASS") {
        $blocking += "toolchain_refresh_required"
    }

    $result = [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        contextVersion = $ContextVersion
        ticket = $Ticket
        repositoryTopLevel = $repoRoot
        branch = $branch
        localHead = $head
        gitStatus = $statusLines
        remotes = $remoteLines
        worktrees = $worktreeLines
        toolchainReceipt = $toolchain
        tripoReceipt = $tripo
        tripoSecretPresent = $secretPresent
        liveGithubCheckStillRequiredByAgent = $true
        fullBootstrapRequired = ($toolchain.status -ne "CACHED_PASS")
        blockingIssues = $blocking
        result = if ($blocking.Count -eq 0) { "PASS_LOCAL_FAST_START" } else { "BLOCKED_OR_REFRESH_REQUIRED" }
    }

    $result | ConvertTo-Json -Depth 12
    if ($result.result -ne "PASS_LOCAL_FAST_START") { exit 2 }
} catch {
    [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        ticket = $Ticket
        result = "BLOCKED"
        error = $_.Exception.Message
    } | ConvertTo-Json -Depth 8
    exit 3
}
