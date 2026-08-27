const state = { overview: null, logs: [], logFilter: '', selectedCampaign: null, timer: null };

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
  container.innerHTML = campaigns.map((campaign, index) => `
    <article class="campaign-card ${campaign.severity}" style="animation-delay:${index * 60}ms">
      <div class="campaign-top">
        <div><p class="eyebrow">${escapeHtml(campaign.status)} / ${escapeHtml(campaign.controller.status)}</p><h3>${escapeHtml(campaign.id)}</h3><p class="campaign-id">Pool ${short(campaign.campaign.pool, 6)}</p></div>
        <span class="status-pill status-${campaign.severity}"><i></i>${campaign.severity}</span>
      </div>
      <div class="metric-strip">
        <div><span>LAST GOOD TICK</span><strong>${age(campaign.controller.tickAgeMs)}</strong></div>
        <div><span>LIVE / EXPECTED</span><strong>${campaign.reconciliation.liveManagedPositionCount}/${campaign.reconciliation.expectedPositionCount}</strong></div>
        <div><span>RETARGETS</span><strong>${number(campaign.counts.retargets, 0)}</strong></div>
      </div>
      <div class="alert-list">${campaign.alerts.length ? campaign.alerts.map((alert) => `<div class="alert-row ${alert.level}">${escapeHtml(alert.message)}</div>`).join('') : '<div class="alert-row">Controller and journal agree.</div>'}</div>
    </article>`).join('');
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

function populateCampaignSelect() {
  const campaigns = state.overview?.campaigns || [];
  const select = byId('campaignSelect');
  const current = state.selectedCampaign || campaigns[0]?.id || '';
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
  const timeline = campaign?.timeline || [];
  byId('auditCount').textContent = campaign ? `${campaign.counts.stages} stages` : '0 stages';
  byId('auditTimeline').innerHTML = timeline.length ? timeline.map((stage) => `
    <li><strong>${escapeHtml(stage.id)}</strong><span>${escapeHtml(stage.status)} · ${time(stage.at)}</span>${stage.signature ? `<br /><a href="https://solscan.io/tx/${encodeURIComponent(stage.signature)}" target="_blank" rel="noreferrer">${short(stage.signature, 8)}</a>` : ''}</li>`).join('') : '<li class="empty-state">No stage timestamps found.</li>';
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
byId('refreshLogs').addEventListener('click', loadLogs);
byId('autoRefresh').addEventListener('change', (event) => setAutoRefresh(event.target.checked));
byId('campaignSelect').addEventListener('change', (event) => { state.selectedCampaign = event.target.value; renderSelectedCampaign(); });
byId('logFilter').addEventListener('input', (event) => { state.logFilter = event.target.value; renderLogs(); });

setInterval(() => { byId('footerClock').textContent = new Date().toLocaleString(); }, 1_000);
setAutoRefresh(true);
refresh();
loadLogs();
