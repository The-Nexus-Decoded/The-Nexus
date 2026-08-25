param(
    [string]$ToolRoot = "H:\CodexData\game-production-toolchain\tripo-v3",
    [string]$ReceiptRoot = "H:\CodexData\game-production-toolchain\receipts",
    [string]$BaseUrl = "https://openapi.tripo3d.ai/v3",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Stop-WithReceipt([string]$Reason, [int]$Code) {
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
    Stop-WithReceipt "Node.js is missing. The official Tripo JS SDK requires Node.js 18+." 10
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Stop-WithReceipt "npm is missing." 11
}

$nodeVersion = (& node --version).Trim()
if ($nodeVersion -notmatch '^v(\d+)\.') {
    Stop-WithReceipt "Unable to parse Node version: $nodeVersion" 12
}
if ([int]$Matches[1] -lt 18) {
    Stop-WithReceipt "Node $nodeVersion is too old; Node 18+ is required." 13
}
if (-not $env:TRIPO_API_KEY) {
    Stop-WithReceipt "TRIPO_API_KEY is not present in the process environment. Use approved secret storage; never paste it into chat or Git." 14
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
        if ($LASTEXITCODE -ne 0) { Stop-WithReceipt "Failed to install official @vastai/tripo-sdk." 20 }
    }

    $pkg = Get-Content (Join-Path $ToolRoot "node_modules\@vastai\tripo-sdk\package.json") -Raw | ConvertFrom-Json
    $sourceCheck = Join-Path $PSScriptRoot "tripo-readonly-check.mjs"
    if (-not (Test-Path $sourceCheck)) { Stop-WithReceipt "Missing tripo-readonly-check.mjs beside bootstrap script." 21 }
    $localCheck = Join-Path $ToolRoot "tripo-readonly-check.mjs"
    Copy-Item $sourceCheck $localCheck -Force

    $raw = & node $localCheck --base-url $BaseUrl 2>&1
    $exitCode = $LASTEXITCODE
    try { $check = (($raw -join [Environment]::NewLine) | ConvertFrom-Json) }
    catch { Stop-WithReceipt "Read-only check returned invalid output. Exit $exitCode." 22 }

    $receipt = [ordered]@{
        schemaVersion = 1
        toolchainSchemaVersion = "2026-08-24-universal-toolchain-v1"
        receiptId = [guid]::NewGuid().ToString()
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        provider = "Tripo3D"
        role = "3D_PRODUCTION_ONLY"
        sdkPackage = "@vastai/tripo-sdk"
        sdkVersion = $pkg.version
        apiBase = $BaseUrl
        nodeVersion = $nodeVersion
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
        toolRoot = $ToolRoot
        result = $check.result
    }

    $receiptPath = Join-Path $ReceiptRoot "tripo-provider.json"
    $receipt | ConvertTo-Json -Depth 12 | Set-Content $receiptPath -Encoding UTF8
    $receipt | ConvertTo-Json -Depth 12
    if ($receipt.result -ne "PASS") { exit 23 }
} finally {
    Pop-Location
}
