#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(__dirname, 'public');
const stateDirectory = process.env.METEORA_STATE_DIR
  ? path.resolve(process.env.METEORA_STATE_DIR)
  : path.join(os.homedir(), 'Meteora-Secure', 'state');
const dataApiBase = 'https://dlmm.datapi.meteora.ag';
const host = process.env.METEORA_DASHBOARD_HOST || '127.0.0.1';
const defaultPort = Number(process.env.METEORA_DASHBOARD_PORT || 4820);
const staleTickMs = Number(process.env.METEORA_STALE_TICK_MS || 90_000);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

let overviewCache = { at: 0, value: null };

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.entries(value).map(([id, item]) => ({ id, ...item }));
  return [];
}

function isoAge(isoValue) {
  const timestamp = Date.parse(isoValue || '');
  return Number.isFinite(timestamp) ? Math.max(0, Date.now() - timestamp) : null;
}

function isProcessRunning(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function redactLogLine(line) {
  return line
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?[redacted]')
    .replace(/((?:api[-_]?key|token|secret|authorization)["'=:\s]+)[^\s,}"']+/gi, '$1[redacted]')
    .slice(0, 900);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readLock(journalPath) {
  const lock = await readJson(`${journalPath}.controller.lock`);
  if (!lock) return { exists: false, pid: null, running: false, startedAt: null };
  return {
    exists: true,
    pid: Number(lock.pid) || null,
    running: isProcessRunning(Number(lock.pid)),
    startedAt: lock.startedAt || null,
  };
}

function stageTime(stage) {
  return stage.confirmedAt || stage.reconciledAt || stage.preparedAt || stage.at || null;
}

function summarizeCampaign(journal, journalPath, modifiedAt, lock) {
  const stages = asArray(journal.stages);
  const actions = asArray(journal.actions);
  const retargets = asArray(journal.retargets);
  const managedPositions = Object.values(journal.positions || {}).filter(Boolean);
  const lastSuccessfulTickAt = journal.lastSuccessfulTickAt || journal.lastSnapshot?.observedAt || null;
  const tickAgeMs = isoAge(lastSuccessfulTickAt);
  const pid = Number(journal.controllerHealth?.pid || lock.pid) || null;
  const processRunning = isProcessRunning(pid);
  const actionBlocked = Boolean(journal.controllerHealth?.actionBlocked);
  const stale = tickAgeMs === null || tickAgeMs > staleTickMs;
  const timeline = stages
    .map((stage) => ({
      id: stage.id || 'stage',
      status: stage.status || 'unknown',
      signature: stage.signature || null,
      at: stageTime(stage),
    }))
    .filter((stage) => stage.at)
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .slice(0, 24);
  const severity = actionBlocked || stale || !processRunning ? 'critical' : 'healthy';

  return {
    id: journal.campaign?.id || path.basename(journalPath, '.json'),
    sourceFile: path.basename(journalPath),
    modifiedAt,
    status: journal.status || 'unknown',
    severity,
    campaign: {
      pool: journal.campaign?.pool || null,
      owner: journal.campaign?.owner || null,
      tokenMint: journal.campaign?.sparkyMint || journal.campaign?.tokenMint || null,
      profitWallet: journal.campaign?.profitWallet || null,
      entryBasisSol: journal.campaign?.entryBasisSol ?? null,
      targetProfitPct: journal.campaign?.targetProfitPct ?? null,
      targetValueSol: journal.campaign?.targetValueSol ?? null,
      widePct: journal.campaign?.widePct ?? null,
      tightPct: journal.campaign?.tightPct ?? null,
      autoCompound: Boolean(journal.campaign?.autoCompound),
    },
    controller: {
      status: journal.controllerHealth?.status || 'unknown',
      pid,
      processRunning,
      lock,
      lastSuccessfulTickAt,
      tickAgeMs,
      verifiedAt: journal.controllerHealth?.verifiedAt || null,
      actionBlocked,
      blockedReason: journal.controllerHealth?.blockedReason || journal.lastError?.message || null,
      lastError: journal.lastError || null,
    },
    snapshot: journal.lastSnapshot || null,
    managedPositions,
    counts: {
      stages: stages.length,
      confirmedStages: stages.filter((stage) => stage.status === 'confirmed').length,
      reconciledStages: stages.filter((stage) => stage.status === 'reconciled').length,
      actions: actions.length,
      retargets: retargets.length,
    },
    timeline,
    alerts: [
      stale ? { level: 'critical', message: 'Successful controller tick is stale.' } : null,
      actionBlocked ? { level: 'critical', message: `Actions blocked: ${journal.controllerHealth?.blockedReason || 'unknown reason'}.` } : null,
      !processRunning ? { level: 'critical', message: 'Journal PID is not running.' } : null,
      lock.exists && !lock.running ? { level: 'warning', message: 'Controller lock is orphaned.' } : null,
    ].filter(Boolean),
  };
}

async function loadCampaigns() {
  let directoryEntries = [];
  try {
    directoryEntries = await fs.readdir(stateDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const campaigns = [];
  for (const entry of directoryEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name.endsWith('.lock')) continue;
    const journalPath = path.join(stateDirectory, entry.name);
    const journal = await readJson(journalPath);
    if (!journal?.campaign?.owner || !journal?.campaign?.pool) continue;
    const [stats, lock] = await Promise.all([fs.stat(journalPath), readLock(journalPath)]);
    campaigns.push(summarizeCampaign(journal, journalPath, stats.mtime.toISOString(), lock));
  }
  return campaigns.sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`meteora_data_api_${response.status}`);
  return response.json();
}

async function fetchPortfolio(owner) {
  if (!owner) return { status: 'unavailable', error: 'wallet_not_configured', fetchedAt: new Date().toISOString(), pools: [] };
  const query = new URLSearchParams({ user: owner, page: '1', page_size: '50', sort_by: 'current_balances', sort_direction: 'desc' });
  try {
    const portfolio = await fetchJson(`${dataApiBase}/portfolio/open?${query}`);
    const pools = await Promise.all((portfolio.pools || []).map(async (pool) => {
      const positionQuery = new URLSearchParams({ user: owner, status: 'open', page: '1', page_size: '100' });
      let positionData = { positions: [] };
      try {
        positionData = await fetchJson(`${dataApiBase}/positions/${encodeURIComponent(pool.poolAddress)}/pnl?${positionQuery}`);
      } catch (error) {
        positionData = { positions: [], error: error.message };
      }
      return { ...pool, positions: positionData.positions || [], positionsError: positionData.error || null };
    }));
    const newestPoolUpdate = Math.max(0, ...pools.map((pool) => Number(pool.poolStateUpdatedAtBlockTime || 0)));
    return {
      status: 'live',
      source: 'official_meteora_data_api',
      fetchedAt: new Date().toISOString(),
      indexedAt: newestPoolUpdate ? new Date(newestPoolUpdate * 1000).toISOString() : null,
      total: portfolio.total || null,
      solPrice: portfolio.solPrice || null,
      pools,
    };
  } catch (error) {
    return { status: 'failed', source: 'official_meteora_data_api', error: error.message, fetchedAt: new Date().toISOString(), pools: [] };
  }
}

function reconcileCampaigns(campaigns, portfolio) {
  const liveAddresses = new Set(portfolio.pools.flatMap((pool) => pool.listPositions || []));
  const allManaged = new Set(campaigns.flatMap((campaign) => campaign.managedPositions.map((position) => position.address).filter(Boolean)));
  const unmanagedLivePositions = [...liveAddresses].filter((address) => !allManaged.has(address));
  return campaigns.map((campaign) => {
    const expected = campaign.managedPositions.map((position) => position.address).filter(Boolean);
    const missing = expected.filter((address) => !liveAddresses.has(address));
    return {
      ...campaign,
      reconciliation: {
        expectedPositionCount: expected.length,
        liveManagedPositionCount: expected.length - missing.length,
        missingManagedPositions: missing,
        unmanagedLivePositions,
        matches: missing.length === 0,
      },
      severity: missing.length > 0 ? 'critical' : campaign.severity,
      alerts: [
        ...campaign.alerts,
        missing.length > 0 ? { level: 'critical', message: `${missing.length} journal position(s) are missing from the live wallet.` } : null,
      ].filter(Boolean),
    };
  });
}

async function buildOverview() {
  const campaigns = await loadCampaigns();
  const owner = process.env.TRADING_WALLET_PUBLIC_KEY || campaigns[0]?.campaign.owner || null;
  const portfolio = await fetchPortfolio(owner);
  const reconciledCampaigns = reconcileCampaigns(campaigns, portfolio);
  const criticalCount = reconciledCampaigns.filter((campaign) => campaign.severity === 'critical').length;
  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    stateDirectoryAvailable: campaigns.length > 0,
    owner,
    globalStatus: criticalCount > 0 ? 'critical' : portfolio.status === 'live' ? 'healthy' : 'degraded',
    criticalCount,
    campaigns: reconciledCampaigns,
    portfolio,
  };
}

async function getOverview() {
  if (overviewCache.value && Date.now() - overviewCache.at < 4_000) return overviewCache.value;
  overviewCache = { at: Date.now(), value: await buildOverview() };
  return overviewCache.value;
}

async function loadLogs(limit = 180) {
  let entries = [];
  try {
    entries = await fs.readdir(stateDirectory, { withFileTypes: true });
  } catch {
    return { generatedAt: new Date().toISOString(), lines: [], files: [], error: 'state_directory_unavailable' };
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/(controller.*\.(?:log|err)|\.stderr\.log|\.stdout\.log)$/i.test(entry.name)) continue;
    const filePath = path.join(stateDirectory, entry.name);
    const stats = await fs.stat(filePath);
    files.push({ name: entry.name, path: filePath, modifiedAt: stats.mtime.toISOString(), size: stats.size });
  }
  files.sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt));
  const lines = [];
  for (const file of files.slice(0, 8)) {
    if (!file.size) continue;
    const raw = await fs.readFile(file.path, 'utf8');
    for (const line of raw.split(/\r?\n/).filter(Boolean).slice(-limit)) {
      lines.push({ file: file.name, modifiedAt: file.modifiedAt, text: redactLogLine(line) });
    }
  }
  return { generatedAt: new Date().toISOString(), files: files.map(({ path: _path, ...file }) => file), lines: lines.slice(-limit) };
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function serveStatic(response, requestPath) {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(publicDirectory, relativePath);
  if (!filePath.startsWith(`${path.resolve(publicDirectory)}${path.sep}`)) {
    json(response, 403, { error: 'forbidden' });
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { 'content-type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream', 'cache-control': 'no-cache' });
    response.end(body);
  } catch {
    json(response, 404, { error: 'not_found' });
  }
}

export function createDashboardServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${defaultPort}`}`);
    try {
      if (request.method === 'GET' && url.pathname === '/api/overview') {
        json(response, 200, await getOverview());
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/logs') {
        const limit = Math.min(500, Math.max(20, Number(url.searchParams.get('limit') || 180)));
        json(response, 200, await loadLogs(limit));
        return;
      }
      if (url.pathname.startsWith('/api/control')) {
        json(response, 403, { error: 'read_only_phase', message: 'Signing and controller mutations are intentionally disabled in Phase 1.' });
        return;
      }
      if (request.method === 'GET') {
        await serveStatic(response, url.pathname);
        return;
      }
      json(response, 405, { error: 'method_not_allowed' });
    } catch (error) {
      json(response, 500, { error: 'dashboard_error', message: error.message });
    }
  });
}

function parsePort() {
  const index = process.argv.indexOf('--port');
  return index >= 0 ? Number(process.argv[index + 1]) : defaultPort;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createDashboardServer();
  server.listen(parsePort(), host, () => {
    process.stdout.write(`Meteora control room: http://${host}:${server.address().port}\n`);
    process.stdout.write(`State source: ${stateDirectory}\n`);
    process.stdout.write('Phase 1 is read-only. No key material is loaded.\n');
  });
}
