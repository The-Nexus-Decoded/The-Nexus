[CmdletBinding()]
param(
    [string]$ConfigPath = "$HOME\.cc-connect\config.toml",
    [string]$LogDir = "$HOME\.cc-connect\logs",
    [string]$SessionPath = "$HOME\.cc-connect\sessions\the-nexus-codex-discord_740ce814.json",
    [switch]$Foreground,
    [switch]$Restart,
    [switch]$ResetSession,
    [int]$ReadyTimeoutSeconds = 15
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $Name"
    }
}

Assert-Command -Name "cc-connect"
Assert-Command -Name "codex"

function Resolve-CcConnectCommand {
    $cmdShim = Get-Command "cc-connect.cmd" -ErrorAction SilentlyContinue
    if ($cmdShim) {
        return $cmdShim.Source
    }

    $native = & where.exe cc-connect 2>$null | Select-Object -First 1
    if ($native) {
        return $native
    }

    throw "Unable to resolve a runnable cc-connect command."
}

function Get-ExistingCcConnectProcess {
    param([string]$ResolvedConfigPath)

    $candidates = @()

    $native = Get-Process -Name 'cc-connect' -ErrorAction SilentlyContinue
    if ($native) {
        $candidates += $native
    }

    $cimCandidates = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match 'cc-connect' }

    foreach ($candidate in $cimCandidates) {
        if ($ResolvedConfigPath -and $candidate.CommandLine -notmatch [regex]::Escape($ResolvedConfigPath)) {
            continue
        }

        try {
            return Get-Process -Id $candidate.ProcessId -ErrorAction Stop
        } catch {
        }
    }

    foreach ($process in $candidates) {
        return $process
    }

    return $null
}

function Reset-BridgeSessionIfRequested {
    param(
        [string]$SessionFilePath,
        [switch]$ShouldReset
    )

    if (-not $ShouldReset -or -not (Test-Path -LiteralPath $SessionFilePath)) {
        return $null
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "$SessionFilePath.bak-$timestamp"
    Move-Item -LiteralPath $SessionFilePath -Destination $backupPath -Force
    return $backupPath
}

function Wait-ForCcConnectReady {
    param(
        [string]$StdoutLogPath,
        [string]$StderrLogPath,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        Start-Sleep -Milliseconds 300

        if (Test-Path -LiteralPath $StdoutLogPath) {
            $stdout = Get-Content -LiteralPath $StdoutLogPath -Raw -ErrorAction SilentlyContinue
            if ($stdout -match 'cc-connect is running') {
                return $true
            }
        }

        if (Test-Path -LiteralPath $StderrLogPath) {
            $stderr = Get-Content -LiteralPath $StderrLogPath -Raw -ErrorAction SilentlyContinue
            if ($stderr -match 'config loaded') {
                $stdoutReady = $false
                if (Test-Path -LiteralPath $StdoutLogPath) {
                    $stdoutReady = (Get-Content -LiteralPath $StdoutLogPath -Raw -ErrorAction SilentlyContinue) -match 'engine started'
                }
                if ($stdoutReady) {
                    return $true
                }
            }
        }
    } while ((Get-Date) -lt $deadline)

    return $false
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "cc-connect config not found: $ConfigPath"
}

if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$resolvedConfig = (Resolve-Path -LiteralPath $ConfigPath).Path
$ccConnectCommand = Resolve-CcConnectCommand
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdoutLog = Join-Path $LogDir "cc-connect-$timestamp.out.log"
$stderrLog = Join-Path $LogDir "cc-connect-$timestamp.err.log"
$arguments = @("-config", $resolvedConfig)

if ($Foreground) {
    $rotatedSession = Reset-BridgeSessionIfRequested -SessionFilePath $SessionPath -ShouldReset:$ResetSession
    Write-Host "Starting cc-connect in foreground with config: $resolvedConfig"
    if ($rotatedSession) {
        Write-Host "Rotated session: $rotatedSession"
    }
    & $ccConnectCommand @arguments
    exit $LASTEXITCODE
}

$existing = Get-ExistingCcConnectProcess -ResolvedConfigPath $resolvedConfig
if ($existing -and $Restart) {
    Stop-Process -Id $existing.Id -Force
    Start-Sleep -Seconds 1
    $existing = $null
}

if ($existing) {
    Write-Host "cc-connect already running."
    Write-Host "PID: $($existing.Id)"
    Write-Host "Config: $resolvedConfig"
    exit 0
}

$rotatedSession = Reset-BridgeSessionIfRequested -SessionFilePath $SessionPath -ShouldReset:$ResetSession
$process = Start-Process `
    -FilePath $ccConnectCommand `
    -ArgumentList $arguments `
    -WorkingDirectory (Split-Path -Parent $resolvedConfig) `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

Write-Host "Started cc-connect."
Write-Host "PID: $($process.Id)"
Write-Host "Config: $resolvedConfig"
Write-Host "Stdout: $stdoutLog"
Write-Host "Stderr: $stderrLog"
if ($rotatedSession) {
    Write-Host "Rotated session: $rotatedSession"
}

$ready = Wait-ForCcConnectReady -StdoutLogPath $stdoutLog -StderrLogPath $stderrLog -TimeoutSeconds $ReadyTimeoutSeconds
if (-not $ready) {
    Write-Warning "cc-connect did not report ready within $ReadyTimeoutSeconds seconds."
}
