import assert from 'node:assert/strict'
import { composeDashboardFromApiPayloads, hasLiveActionPermission, sampleDashboard, validationSummary } from '../src/data/cryptoOps.js'

assert.equal(hasLiveActionPermission(sampleDashboard), false, 'live actions must be disabled in sample safe mode')
assert.equal(sampleDashboard.risk.liveTrading, false, 'sample dashboard must not imply live trading is active')
assert.equal(sampleDashboard.dlmmPositions.every((position) => position.lastTx === 'none submitted'), true, 'safe sample positions must not claim submitted transactions')

const summary = validationSummary(sampleDashboard)
assert.equal(summary.issue, '#277')
assert.equal(summary.total, 5)
assert.equal(summary.verified, 5)
assert.equal(summary.complete, true)


const apiDashboard = composeDashboardFromApiPayloads({
  health: { generatedAt: '2026-04-29T06:00:00Z', mode: 'read-only-fixture' },
  portfolio: sampleDashboard.portfolio,
  killSwitch: { state: 'ARMED', liveTrading: false, walletAuth: 'not-connected', gates: sampleDashboard.risk.gates },
  positions: { positions: sampleDashboard.dlmmPositions },
  monitor: sampleDashboard.stopLossTakeProfit,
  sniperStatus: { status: 'dry-run', rejected: sampleDashboard.sniper.rejected },
  sniperCandidates: { candidates: sampleDashboard.sniper.candidates },
  topPools: { pools: sampleDashboard.topPools },
  riskFeed: { events: sampleDashboard.killFeed },
  validation: { records: sampleDashboard.prValidation },
})
assert.equal(apiDashboard.mode, 'read-only-fixture')
assert.equal(hasLiveActionPermission(apiDashboard), false, 'API-composed dashboard must stay read-only by default')

const liveCandidate = structuredClone(sampleDashboard)
liveCandidate.risk.liveTrading = true
liveCandidate.risk.killSwitch = 'CLEAR'
liveCandidate.risk.walletAuth = 'connected'
liveCandidate.risk.gates = liveCandidate.risk.gates.map((gate) => ({ ...gate, state: 'passed' }))
assert.equal(hasLiveActionPermission(liveCandidate), true, 'all live gates must be explicit before action permission')

console.log('validation dashboard gates passed')
