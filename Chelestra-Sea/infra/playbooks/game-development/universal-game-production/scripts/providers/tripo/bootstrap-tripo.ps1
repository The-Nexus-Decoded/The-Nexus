param(
    [string]$ToolRoot = "H:\CodexData\game-production-toolchain\providers\tripo-v3",
    [string]$ReceiptRoot = "H:\CodexData\game-production-toolchain\receipts",
    [string]$BaseUrl = "https://openapi.tripo3d.ai/v3",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Blocked([string]$Reason, [int]$Code = 2) {
    [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        result = "BLOCKED"
        reason = $Reason
        chargedTaskSubmitted = $false
    } | ConvertTo-Json -Depth 8
    exit $Code
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Blocked "Node.js is not installed or not on PATH. The official Tripo JS SDK requires Node.js 18+." 10
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Blocked "npm is not installed or not on PATH." 11
}

$nodeText = (& node --version).Trim()
if ($nodeText -notmatch '^v(\d+)\.') {
    Write-Blocked "Unable to parse Node.js version: $nodeText" 12
}
$nodeMajor = [int]$Matches[1]
if ($nodeMajor -lt 18) {
    Write-Blocked "Node.js $nodeText is too old. The official Tripo v3 JS SDK requires Node.js 18+." 13
}

if (-not $env:TRIPO_API_KEY) {
    Write-Blocked "TRIPO_API_KEY is not present in the process environment. Store it in approved local secret storage; do not paste it into chat or Git." 14
}

New-Item -ItemType Directory -Force -Path $ToolRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ToolRoot "downloads") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ToolRoot "tasks") | Out-Null

Push-Location $ToolRoot
try {
    if (-not (Test-Path (Join-Path $ToolRoot "package.json"))) {
        & npm init -y | Out-Null
    }

    if (-not $SkipInstall) {
        & npm install --save-exact "@vastai/tripo-sdk@latest"
        if ($LASTEXITCODE -ne 0) {
            Write-Blocked "npm failed to install the official @vastai/tripo-sdk package." 20
        }
    }

    $packageJson = Get-Content (Join-Path $ToolRoot "node_modules\@vastai\tripo-sdk\package.json") -Raw | ConvertFrom-Json
    $sdkVersion = $packageJson.version

    $sourceCheck = Join-Path $PSScriptRoot "tripo-readonly-check.mjs"
    if (-not (Test-Path $sourceCheck)) {
        Write-Blocked "The read-only check script was not found beside bootstrap-tripo.ps1." 21
    }

    $localCheck = Join-Path $ToolRoot "tripo-readonly-check.mjs"
    Copy-Item $sourceCheck $localCheck -Force

    $raw = & node $localCheck --base-url $BaseUrl 2>&1
    $exitCode = $LASTEXITCODE
    $rawText = ($raw -join [Environment]::NewLine)

    try {
        $check = $rawText | ConvertFrom-Json
    } catch {
        Write-Blocked "Tripo read-only check returned non-JSON output. Exit code: $exitCode" 22
    }

    $receipt = [ordered]@{
        schemaVersion = 1
        toolchainSchemaVersion = "2026-08-24-universal-toolchain-v1"
        receiptId = [guid]::NewGuid().ToString()
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        provider = "Tripo3D"
        role = "3D_PRODUCTION_ONLY"
        sdkPackage = "@vastai/tripo-sdk"
        sdkVersion = $sdkVersion
        apiBase = $BaseUrl
        nodeVersion = $nodeText
        secretPresent = $true
        authenticatedRead = $check.authenticatedRead
        balanceRead = $check.balanceRead
        availableBalance = $check.availableBalance
        frozenBalance = $check.frozenBalance
        capabilities = $check.capabilities
        missingCapabilities = $check.missingCapabilities
        officialCli = "NOT_DISCOVERED_OR_NOT_REQUIRED"
        mcp = "NOT_REQUIRED"
        tripo2DImageGenerationPolicy = "DISABLED_BY_DEFAULT"
        chargedTaskSubmitted = $false
        result = $check.result
        toolRoot = $ToolRoot
        downloadsRoot = (Join-Path $ToolRoot "downloads")
        tasksRoot = (Join-Path $ToolRoot "tasks")
    }

    $receiptPath = Join-Path $ReceiptRoot "tripo-provider.json"
    $receipt | ConvertTo-Json -Depth 12 | Set-Content -Path $receiptPath -Encoding UTF8

    $receipt | ConvertTo-Json -Depth 12
    if ($receipt.result -ne "PASS") { exit 23 }
} finally {
    Pop-Location
}
