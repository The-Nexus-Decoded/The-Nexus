export const validationChain = [
  'monitor',
  'trigger',
  'close executor',
  'alert',
  'state persistence',
]

export const sampleDashboard = {
  generatedAt: '2026-04-29T05:20:00Z',
  mode: 'safe-test',
  portfolio: {
    wallet: 'Hugh runtime wallet',
    equityUsd: 12840.55,
    pnl24hUsd: 316.42,
    pnl24hPct: 2.53,
    openExposureUsd: 4210.18,
    riskPosture: 'SAFE_TEST_ONLY',
  },
  risk: {
    killSwitch: 'ARMED',
    liveTrading: false,
    walletAuth: 'not-connected',
    gates: [
      { name: 'Hugh validation', state: 'passed-safe-mode' },
      { name: 'Live executor', state: 'disabled' },
      { name: 'Wallet authorization', state: 'blocked' },
      { name: 'Kill switch visibility', state: 'visible' },
    ],
  },
  dlmmPositions: [
    {
      id: 'dlmm-001',
      pair: 'SOL/USDC',
      poolId: 'pool-sol-usdc-demo',
      liquidityUsd: 2480.12,
      feesUsd: 41.82,
      pnlUsd: 128.34,
      state: 'open',
      closeState: 'dry-run-ready',
      lastTx: 'none submitted',
    },
    {
      id: 'dlmm-002',
      pair: 'BONK/SOL',
      poolId: 'pool-bonk-sol-demo',
      liquidityUsd: 1730.06,
      feesUsd: 18.94,
      pnlUsd: -22.7,
      state: 'watching',
      closeState: 'risk-gated',
      lastTx: 'none submitted',
    },
  ],
  stopLossTakeProfit: {
    issue: '#277',
    status: 'safe-mode-passed',
    chain: validationChain.map((step) => ({ step, state: 'verified-safe-mode' })),
    latestEvidence: 'Hugh validated PR #295 in clean runtime checkout; 17 regression tests passed.',
  },
  sniper: {
    status: 'dry-run',
    candidates: [
      { symbol: 'DEMO1/SOL', score: 82, reason: 'liquidity rising; dry-run only' },
      { symbol: 'DEMO2/USDC', score: 74, reason: 'fee velocity; blocked until risk gates pass' },
    ],
    rejected: [
      { symbol: 'RUG/SOL', reason: 'authority risk' },
      { symbol: 'THIN/USDC', reason: 'liquidity below threshold' },
    ],
  },
  topPools: [
    { rank: 1, pair: 'SOL/USDC', liquidityUsd: 12200000, volume24hUsd: 8400000, fees24hUsd: 18200, risk: 'low' },
    { rank: 2, pair: 'JUP/SOL', liquidityUsd: 4100000, volume24hUsd: 2600000, fees24hUsd: 7400, risk: 'medium' },
    { rank: 3, pair: 'BONK/SOL', liquidityUsd: 2200000, volume24hUsd: 1900000, fees24hUsd: 6100, risk: 'medium' },
  ],
  killFeed: [
    { time: '00:17 CDT', severity: 'info', message: '#295 safe-mode validation passed; no live tx submitted.' },
    { time: '00:13 CDT', severity: 'warn', message: 'Remote pytest unavailable on Hugh until pytest is installed.' },
    { time: '00:11 CDT', severity: 'safe', message: 'Live-money automation remains disabled.' },
  ],
  prValidation: [
    { pr: '#295', issue: '#277', result: 'passed-safe-mode', evidence: '17 tests passed; fake executor success/failure persisted.' },
    { pr: 'next', issue: '#296', result: 'pending', evidence: 'Dashboard app shell and validation panel under construction.' },
  ],
}

export function hasLiveActionPermission(dashboard = sampleDashboard) {
  return Boolean(
    dashboard?.risk?.liveTrading === true &&
      dashboard?.risk?.killSwitch === 'CLEAR' &&
      dashboard?.risk?.walletAuth === 'connected' &&
      dashboard?.risk?.gates?.every((gate) => gate.state === 'passed'),
  )
}

export function validationSummary(dashboard = sampleDashboard) {
  const chain = dashboard?.stopLossTakeProfit?.chain ?? []
  const verified = chain.filter((item) => item.state.includes('verified')).length
  return {
    issue: dashboard?.stopLossTakeProfit?.issue ?? 'unknown',
    total: chain.length,
    verified,
    complete: chain.length > 0 && verified === chain.length,
  }
}

export async function loadDashboard() {
  try {
    const response = await fetch('/api/crypto-ops/summary.json', { cache: 'no-store' })
    if (!response.ok) return sampleDashboard
    return await response.json()
  } catch {
    return sampleDashboard
  }
}
