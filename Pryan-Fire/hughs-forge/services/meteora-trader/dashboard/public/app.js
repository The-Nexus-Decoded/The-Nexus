const HISTORY_KEY = 'meteora-campaign-history-v1';
const THEME_KEY = 'meteora-dashboard-theme';
const state = {
  overview: null,
  logs: [],
  logFilter: '',
  selectedCampaign: null,
  timer: null,
  history: JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'),
  theme: localStorage.getItem(THEME_KEY) || 'light',
  latestActivityByCampaign: {},
};

const byId = (id) => document.getElementById(id);
const number = (value, digits = 3) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const sol = (value, digits = 4) => Number.isFinite(Number(value)) ? `${number(value, digits)} SOL` : '—';
const short = (value, length = 5) => value ? `${value.slice(0, length)}…${value.slice(-length)}` : '—';
const age = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return 'unknown';
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
};
const time = (value) => value ? new Date(value).toLocaleString() : '—';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));

function setTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(THEME_KEY, state.theme);
  byId('themeButton').textContent = state.theme === 'light' ? 'Dark mode' : 'Light mode';
}

function recordCampaignHistory() {
  for (const campaign of state.overview?.campaigns || []) {
    const snapshot = campaign.snapshot;
    const observedAt = snapshot?.observedAt;
    const campaignReturnSol = Number(snapshot?.campaignReturnSol);
    if (!observedAt || !Number.isFinite(campaignReturnSol)) continue;
    const samples = state.history[campaign.id] || [];
    if (samples.at(-1)?.observedAt !== observedAt) {
      samples.push({
        observedAt,
        campaignReturnSol,
        positionValueSol: Number(snapshot.positionsExecutableValueSol || 0),
        feeValueSol: Number(snapshot.cumulativeNetFeesEarnedSol || 0),
        activeBinId: Number(snapshot.activeBinId),
      });
    }
    state.history[campaign.id] = samples.slice(-180);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function renderStatus() {
  const status = state.overview?.globalStatus || 'degraded';
  const statusElement = byId('globalStatus');
  statusElement.className = `status-pill status-${status}`;
  statusElement.innerHTML = `<i></i>${status === 'critical' ? 'Action required' : status}`;

  const incidents = state.overview?.campaigns.flatMap((campaign) => campaign.alerts.map((alert) => ({ campaign: campaign.id, ...alert }))) || [];
  const banner = byId('criticalBanner');
  if (!incidents.length) {
    banner.classList.add('hidden');
  } else {
    banner.classList.remove('hidden');
    banner.innerHTML = `<strong>${incidents.length} controller incident${incidents.length === 1 ? '' : 's'}</strong> — ${escapeHtml(incidents[0].campaign)}: ${escapeHtml(incidents[0].message)}`;
  }
}

function renderWallet() {
  const portfolio = state.overview?.portfolio;
  byId('walletSource').textContent = portfolio?.status === 'live' ? 'Meteora live' : portfolio?.status || 'Unavailable';
  byId('walletBalance').textContent = sol(portfolio?.total?.balancesSol);
  byId('walletFees').textContent = sol(portfolio?.total?.unclaimedFeesSol);
  byId('walletPositions').textContent = number(portfolio?.total?.totalPositions, 0);
  byId('walletTimestamp').textContent = portfolio?.status === 'live'
    ? `Fetched ${time(portfolio.fetchedAt)} · indexed ${time(portfolio.indexedAt)}`
    : `Live portfolio unavailable: ${portfolio?.error || 'unknown error'}`;
}

function renderCampaigns() {
  const campaigns = state.overview?.campaigns || [];
  const container = byId('campaignGrid');
  if (!campaigns.length) {
    container.innerHTML = '<div class="empty-state">No compatible controller journals found.</div>';
    return;
  }
  container.innerHTML = campaigns.map((campaign, index) => {
    const value = Number(campaign.snapshot?.campaignReturnSol);
    const target = Number(campaign.campaign.targetValueSol);
    const progress = Number.isFinite(value) && Number.isFinite(target) ? clamp(value / target * 100) : 0;
    return `
    <article class="campaign-card ${campaign.severity} ${campaign.id === state.selectedCampaign ? 'selected' : ''}" data-campaign="${escapeHtml(campaign.id)}" tabindex="0" style="animation-delay:${index * 60}ms">
      <div class="campaign-top">
        <div><p class="eyebrow">${escapeHtml(campaign.status)} / ${escapeHtml(campaign.controller.status)}</p><h3>${escapeHtml(campaign.id)}</h3><p class="campaign-id">Pool ${short(campaign.campaign.pool, 6)}</p></div>
        <span class="status-pill status-${campaign.severity}"><i></i>${campaign.severity}</span>
      </div>
      <div class="campaign-progress"><span style="width:${progress}%"></span></div>
      <div class="progress-copy"><strong>${sol(value)}</strong><span>${number(progress, 1)}% of ${sol(target)}</span></div>
      <div class="metric-strip">
        <div><span>LAST GOOD TICK</span><strong>${age(campaign.controller.tickAgeMs)}</strong></div>
        <div><span>LIVE / EXPECTED</span><strong>${campaign.reconciliation.liveManagedPositionCount}/${campaign.reconciliation.expectedPositionCount}</strong></div>
        <div><span>RETARGETS</span><strong>${number(campaign.counts.retargets, 0)}</strong></div>
      </div>
      <div class="alert-list">${campaign.alerts.length ? campaign.alerts.map((alert) => `<div class="alert-row ${alert.level}">${escapeHtml(alert.message)}</div>`).join('') : '<div class="alert-row">Controller and journal agree.</div>'}</div>
    </article>`;
  }).join('');
}

function positionCard(pool, position, index) {
  const unrealized = position.unrealizedPnl || {};
  const lower = Number(position.lowerBinId);
  const upper = Number(position.upperBinId);
  const active = Number(position.poolActiveBinId);
  const progress = Math.max(0, Math.min(100, ((active - lower) / Math.max(1, upper - lower)) * 100));
  return `
    <article class="position-card" style="animation-delay:${index * 70}ms">
      <div class="position-top">
        <div class="token-pair"><span class="token-icons"><img src="${escapeHtml(pool.tokenXIcon)}" alt="" /><img src="${escapeHtml(pool.tokenYIcon)}" alt="" /></span><div><p class="eyebrow">${short(position.positionAddress, 6)}</p><h3>${escapeHtml(pool.tokenX)} / ${escapeHtml(pool.tokenY)}</h3></div></div>
        <span class="range-state ${position.isOutOfRange ? 'out' : ''}">${position.isOutOfRange ? 'out of range' : 'in range'}</span>
      </div>
      <div class="range-track" title="Active bin ${active} within ${lower} to ${upper}"><span style="clip-path:polygon(0 0, ${progress}% 0, ${progress}% 100%, 0 100%)"></span></div>
      <div class="position-details">
        <div><span>Position + fees</span><strong>${sol(unrealized.balancesSol)}</strong></div>
        <div><span>Unclaimed fees</span><strong>${sol(Number(unrealized.unclaimedFeeTokenX?.amountSol || 0) + Number(unrealized.unclaimedFeeTokenY?.amountSol || 0))}</strong></div>
        <div><span>Bins</span><strong>${lower} → ${upper}</strong></div>
        <div><span>Active bin</span><strong>${active}</strong></div>
        <div><span>PnL</span><strong>${number(position.pnlSolPctChange, 2)}%</strong></div>
        <div><span>Fee / TVL 24h</span><strong>${number(position.feePerTvl24h, 2)}%</strong></div>
      </div>
    </article>`;
}

function renderPositions() {
  const pools = state.overview?.portfolio?.pools || [];
  const positions = pools.flatMap((pool) => (pool.positions || []).map((position) => ({ pool, position })));
  byId('positionsGrid').innerHTML = positions.length
    ? positions.map(({ pool, position }, index) => positionCard(pool, position, index)).join('')
    : '<div class="empty-state">No open Meteora positions were returned for this wallet.</div>';
}

function chartLineY(value, minimum, maximum) {
  return 195 - ((value - minimum) / Math.max(1e-9, maximum - minimum)) * 155;
}

function renderValueChart(campaign) {
  const svg = byId('valueChart');
  const samples = state.history[campaign?.id] || [];
  const basis = Number(campaign?.campaign.entryBasisSol);
  const target = Number(campaign?.campaign.targetValueSol);
  byId('chartCampaignTitle').textContent = campaign?.id || 'Select a campaign';
  byId('chartSampleCount').textContent = `${samples.length} sample${samples.length === 1 ? '' : 's'}`;
  if (!campaign || !samples.length || !Number.isFinite(basis) || !Number.isFinite(target)) {
    svg.innerHTML = '<text x="360" y="118" text-anchor="middle" class="chart-empty">Waiting for live samples</text>';
    return;
  }
  const values = samples.map((sample) => sample.campaignReturnSol);
  const minimum = Math.min(...values, basis, target) * 0.94;
  const maximum = Math.max(...values, basis, target) * 1.04;
  const x = (index) => samples.length === 1 ? 360 : 52 + index * 628 / (samples.length - 1);
  const points = samples.map((sample, index) => `${x(index)},${chartLineY(sample.campaignReturnSol, minimum, maximum)}`).join(' ');
  const basisY = chartLineY(basis, minimum, maximum);
  const targetY = chartLineY(target, minimum, maximum);
  const last = samples.at(-1);
  const lastX = x(samples.length - 1);
  const lastY = chartLineY(last.campaignReturnSol, minimum, maximum);
  svg.innerHTML = `
    <line x1="52" y1="40" x2="680" y2="40" class="chart-grid" />
    <line x1="52" y1="118" x2="680" y2="118" class="chart-grid" />
    <line x1="52" y1="195" x2="680" y2="195" class="chart-grid" />
    <line x1="52" y1="${targetY}" x2="680" y2="${targetY}" class="chart-target" />
    <line x1="52" y1="${basisY}" x2="680" y2="${basisY}" class="chart-basis" />
    <polyline points="${points}" class="chart-live" />
    <circle cx="${lastX}" cy="${lastY}" r="5" class="chart-dot" />
    <text x="46" y="${targetY - 7}" text-anchor="end" class="chart-label">TARGET</text>
    <text x="46" y="${basisY + 15}" text-anchor="end" class="chart-label">BASIS</text>
    <text x="680" y="218" text-anchor="end" class="chart-label">${escapeHtml(time(last.observedAt))}</text>`;
}

function renderWaterfall(campaign) {
  const snapshot = campaign?.snapshot;
  const target = Number(campaign?.campaign.targetValueSol || 0);
  const positions = Number(snapshot?.positionsExecutableValueSol || 0);
  const fees = Number(snapshot?.cumulativeNetFeesEarnedSol || 0);
  const costs = Number(snapshot?.executionCostsSol || 0);
  const returned = Number(snapshot?.campaignReturnSol || 0);
  const gap = Math.max(0, target - returned);
  const maximum = Math.max(target, positions + fees, 1e-9);
  const rows = [
    ['Executable positions', positions, 'waterfall-position'],
    ['Proven fees', fees, 'waterfall-fee'],
    ['Execution costs', -costs, 'waterfall-cost'],
    ['Remaining to target', gap, 'waterfall-gap'],
  ];
  byId('targetProgressLabel').textContent = target ? `${number(returned / target * 100, 1)}%` : '—';
  byId('targetWaterfall').innerHTML = campaign ? rows.map(([label, value, className]) => `
    <div class="waterfall-row"><div><span>${label}</span><strong>${value < 0 ? '−' : ''}${sol(Math.abs(value))}</strong></div><div class="waterfall-track"><span class="${className}" style="width:${clamp(Math.abs(value) / maximum * 100)}%"></span></div></div>`).join('') : '<div class="empty-state">Select a campaign.</div>';
}

function renderRangeMap(campaign) {
  const active = Number(campaign?.snapshot?.activeBinId);
  const positions = campaign?.managedPositions || [];
  const bounds = positions.flatMap((position) => [Number(position.lowerBinId), Number(position.upperBinId)]).filter(Number.isFinite);
  if (!campaign || !Number.isFinite(active) || !bounds.length) {
    byId('activeBinLabel').textContent = '—';
    byId('rangeMap').innerHTML = '<div class="empty-state">No live range evidence.</div>';
    return;
  }
  const minimum = Math.min(active, ...bounds);
  const maximum = Math.max(active, ...bounds);
  const span = Math.max(1, maximum - minimum);
  byId('activeBinLabel').textContent = `ACTIVE ${active}`;
  byId('rangeMap').innerHTML = positions.map((position) => {
    const lower = Number(position.lowerBinId);
    const upper = Number(position.upperBinId);
    const left = (lower - minimum) / span * 100;
    const width = Math.max(1.5, (upper - lower) / span * 100);
    const marker = clamp((active - minimum) / span * 100);
    const inside = active >= lower && active <= upper;
    return `<div class="range-row"><div><strong>${escapeHtml(position.strategy || 'Position')}</strong><span>${lower} → ${upper}</span></div><div class="range-axis"><span class="range-band ${inside ? '' : 'range-band-out'}" style="left:${left}%;width:${width}%"></span><i style="left:${marker}%"></i></div></div>`;
  }).join('');
}

function renderValueMix(campaign) {
  const positions = Number(campaign?.snapshot?.positionsExecutableValueSol || 0);
  const fees = Number(campaign?.snapshot?.cumulativeNetFeesEarnedSol || 0);
  const total = positions + fees;
  const feePct = total > 0 ? clamp(fees / total * 100) : 0;
  byId('valueMix').style.setProperty('--fee-pct', `${feePct}%`);
  byId('valueMix').querySelector('strong').textContent = total > 0 ? sol(total) : '—';
  byId('valueMixLegend').innerHTML = campaign ? `
    <div><dt><i class="mix-position"></i>Positions</dt><dd>${sol(positions)}</dd></div>
    <div><dt><i class="mix-fees"></i>Proven fees</dt><dd>${sol(fees)}</dd></div>` : '';
}

function renderTelemetry(campaign) {
  renderValueChart(campaign);
  renderWaterfall(campaign);
  renderRangeMap(campaign);
  renderValueMix(campaign);
}

function renderExecutionMode(campaign) {
  const armed = campaign?.controller.processRunning && !campaign?.controller.actionBlocked;
  const badge = byId('executionMode');
  badge.textContent = armed ? 'SIGNER ARMED / UI LOCKED' : 'ACTIONS BLOCKED';
  badge.classList.toggle('armed', Boolean(armed));
  byId('executionSummary').textContent = armed
    ? `${campaign.id} is advancing under its enrolled policy. Manual controls remain isolated from the signer until owner authentication is implemented.`
    : `No selected campaign has a healthy execution process. Review the incident banner and journal before any manual action.`;
}

function renderActionFeed(campaign) {
  const activity = campaign?.activity || [];
  const current = activity[0] || null;
  const currentFingerprint = current ? `${current.id}:${current.rawStatus}:${current.at}` : null;
  const previousFingerprint = campaign ? state.latestActivityByCampaign[campaign.id] : null;
  const latestAction = byId('latestAction');

  byId('auditCount').textContent = campaign ? `${activity.length} updates` : '0 updates';
  if (!campaign) {
    latestAction.className = 'latest-action action-info';
    latestAction.innerHTML = '<div><span>Current status</span><strong>Select a campaign</strong></div>';
    byId('auditTimeline').innerHTML = '<li class="empty-state">No campaign selected.</li>';
    return;
  }

  if (current) {
    latestAction.className = `latest-action action-${current.status}`;
    latestAction.innerHTML = `
      <div><span>Latest controller update</span><strong>${escapeHtml(current.title)}</strong><small>${escapeHtml(current.detail)}</small></div>
      <div class="action-current-meta"><b>${escapeHtml(current.status)}</b><time>${escapeHtml(age(Date.now() - Date.parse(current.at)))}</time></div>`;
  } else {
    const healthy = campaign.controller.processRunning && !campaign.controller.actionBlocked;
    latestAction.className = `latest-action action-${healthy ? 'info' : 'failed'}`;
    latestAction.innerHTML = `
      <div><span>Current status</span><strong>${healthy ? 'Monitoring — no action in progress' : 'Controller needs attention'}</strong><small>${escapeHtml(campaign.controller.blockedReason || campaign.status)}</small></div>
      <div class="action-current-meta"><b>${healthy ? 'monitoring' : 'failed'}</b></div>`;
  }

  if (previousFingerprint && currentFingerprint && previousFingerprint !== currentFingerprint) {
    latestAction.classList.add('action-flash');
    setTimeout(() => latestAction.classList.remove('action-flash'), 1_600);
  }
  state.latestActivityByCampaign[campaign.id] = currentFingerprint;

  byId('auditTimeline').innerHTML = activity.length ? activity.map((event) => `
    <li class="activity-${escapeHtml(event.status)}">
      <div class="action-row-heading"><strong>${escapeHtml(event.title)}</strong><b>${escapeHtml(event.status)}</b></div>
      <span class="action-detail">${escapeHtml(event.detail)}</span>
      <span class="action-meta">${escapeHtml(event.rawStatus)} · ${time(event.at)}${event.source ? ` · ${escapeHtml(event.source.replace(/_/g, ' '))}` : ''}</span>
      ${event.signature ? `<a href="https://solscan.io/tx/${encodeURIComponent(event.signature)}" target="_blank" rel="noreferrer">Transaction ${short(event.signature, 8)}</a>` : ''}
    </li>`).join('') : '<li class="empty-state">No recorded actions yet. The controller is monitoring this campaign.</li>';
}

function populateCampaignSelect() {
  const campaigns = state.overview?.campaigns || [];
  const select = byId('campaignSelect');
  const preferred = campaigns.find((campaign) => campaign.controller.processRunning && !campaign.controller.actionBlocked);
  const current = state.selectedCampaign || preferred?.id || campaigns[0]?.id || '';
  select.innerHTML = campaigns.map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.id)}</option>`).join('');
  select.value = current;
  state.selectedCampaign = select.value || null;
  renderSelectedCampaign();
}

function renderSelectedCampaign() {
  const campaign = state.overview?.campaigns.find((item) => item.id === state.selectedCampaign);
  byId('profitTarget').value = campaign ? `${number(campaign.campaign.targetProfitPct, 1)}% / ${sol(campaign.campaign.targetValueSol)}` : '';
  byId('entryBasis').value = campaign ? sol(campaign.campaign.entryBasisSol, 6) : '';
  byId('allocation').value = campaign ? `${number(campaign.campaign.widePct, 0)}% wide / ${number(campaign.campaign.tightPct, 0)}% tight` : '';
  byId('autoCompoundValue').value = campaign ? (campaign.campaign.autoCompound ? 'Enabled' : 'Disabled') : '';
  byId('profitWallet').value = campaign?.campaign.profitWallet || '';
  renderActionFeed(campaign);
  renderTelemetry(campaign);
  renderExecutionMode(campaign);
}

function renderLogs() {
  const needle = state.logFilter.trim().toLowerCase();
  const lines = state.logs.filter((line) => !needle || `${line.file} ${line.text}`.toLowerCase().includes(needle));
  byId('logOutput').innerHTML = lines.length ? lines.map((line) => {
    const severe = /error|failed|429|mismatch|insufficient|blocked/i.test(line.text);
    return `<span class="${severe ? 'log-error' : ''}">[${escapeHtml(line.file)}] ${escapeHtml(line.text)}</span>`;
  }).join('\n') : 'No log lines match this filter.';
}

async function loadLogs() {
  try {
    const payload = await fetchJson('/api/logs?limit=240');
    state.logs = payload.lines || [];
    renderLogs();
  } catch (error) {
    byId('logOutput').textContent = `Log load failed: ${error.message}`;
  }
}

async function refresh() {
  byId('refreshButton').disabled = true;
  try {
    state.overview = await fetchJson('/api/overview');
    recordCampaignHistory();
    renderStatus();
    renderWallet();
    renderCampaigns();
    renderPositions();
    populateCampaignSelect();
  } catch (error) {
    state.overview = { globalStatus: 'critical', campaigns: [], portfolio: { status: 'failed', error: error.message, pools: [] } };
    renderStatus();
    renderWallet();
    byId('criticalBanner').classList.remove('hidden');
    byId('criticalBanner').innerHTML = `<strong>Dashboard data failure</strong> — ${escapeHtml(error.message)}`;
  } finally {
    byId('refreshButton').disabled = false;
  }
}

function setAutoRefresh(enabled) {
  if (state.timer) clearInterval(state.timer);
  state.timer = enabled ? setInterval(refresh, 10_000) : null;
}

byId('refreshButton').addEventListener('click', refresh);
byId('themeButton').addEventListener('click', () => setTheme(state.theme === 'light' ? 'dark' : 'light'));
byId('refreshLogs').addEventListener('click', loadLogs);
byId('autoRefresh').addEventListener('change', (event) => setAutoRefresh(event.target.checked));
byId('campaignSelect').addEventListener('change', (event) => { state.selectedCampaign = event.target.value; renderSelectedCampaign(); });
byId('logFilter').addEventListener('input', (event) => { state.logFilter = event.target.value; renderLogs(); });
byId('campaignGrid').addEventListener('click', (event) => {
  const card = event.target.closest('[data-campaign]');
  if (!card) return;
  state.selectedCampaign = card.dataset.campaign;
  populateCampaignSelect();
  renderCampaigns();
});
byId('campaignGrid').addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const card = event.target.closest('[data-campaign]');
  if (!card) return;
  event.preventDefault();
  card.click();
});

setInterval(() => { byId('footerClock').textContent = new Date().toLocaleString(); }, 1_000);
setTheme(state.theme);
setAutoRefresh(true);
refresh();
loadLogs();
