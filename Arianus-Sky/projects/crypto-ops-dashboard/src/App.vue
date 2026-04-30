<script setup>
import { computed, onMounted, ref } from 'vue'
import { hasLiveActionPermission, loadDashboard, submitValidationResult, validationSummary } from './data/cryptoOps.js'

const dashboard = ref(null)
const validationSelection = ref('#296')
const validationResult = ref('passed')
const validationEvidence = ref('')
const validationTester = ref('Hugh')
const validationScreen = ref('Validation')
const validationRiskNotes = ref('No live-money controls exercised.')
const validationSubmitState = ref('idle')
const validationSubmitMessage = ref('')

onMounted(async () => {
  dashboard.value = await loadDashboard()
  validationSelection.value = dashboard.value?.prValidation?.find((item) => item.result === 'pending')?.issue ?? dashboard.value?.prValidation?.[0]?.issue ?? '#296'
})

const liveAllowed = computed(() => hasLiveActionPermission(dashboard.value))
const chainSummary = computed(() => validationSummary(dashboard.value))

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const preciseMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

async function recordValidationEvidence() {
  validationSubmitState.value = 'saving'
  validationSubmitMessage.value = ''
  try {
    const response = await submitValidationResult(validationSelection.value, {
      result: validationResult.value,
      evidence: validationEvidence.value,
      tester: validationTester.value,
      screen: validationScreen.value,
      riskNotes: validationRiskNotes.value,
    })
    validationSubmitState.value = 'saved'
    validationSubmitMessage.value = `Evidence recorded for ${response.record.id}; live execution remains disabled.`
  } catch (error) {
    validationSubmitState.value = 'error'
    validationSubmitMessage.value = error.message
  }
}
</script>

<template>
  <main v-if="dashboard" class="shell">
    <section class="hero panel">
      <div>
        <p class="eyebrow">Pryan-Fire / Arianus-Sky</p>
        <h1>Crypto Ops Dashboard</h1>
        <p class="subtle">Responsive operator cockpit for DLMM, positions, sniper, top pools, kill feeds, and Hugh validation — phone-friendly, tablet-ready, desktop-comfortable.</p>
      </div>
      <div class="mode-card" :class="liveAllowed ? 'danger' : 'safe'">
        <span>{{ dashboard.mode }}</span>
        <strong>{{ liveAllowed ? 'LIVE ACTIONS ENABLED' : 'READ-ONLY / DRY-RUN' }}</strong>
      </div>
    </section>

    <nav class="quick-nav panel" aria-label="Dashboard sections">
      <a href="#overview">Overview</a>
      <a href="#positions">Positions</a>
      <a href="#monitor">Monitor</a>
      <a href="#sniper">Sniper</a>
      <a href="#pools">Pools</a>
      <a href="#risk-feed">Risk feed</a>
      <a href="#validation">Validation</a>
    </nav>

    <section id="overview" class="grid cards-4">
      <article class="panel metric">
        <span>Portfolio</span>
        <strong>{{ preciseMoney.format(dashboard.portfolio.equityUsd) }}</strong>
        <small :class="dashboard.portfolio.pnl24hUsd >= 0 ? 'good' : 'bad'">24h {{ preciseMoney.format(dashboard.portfolio.pnl24hUsd) }} / {{ dashboard.portfolio.pnl24hPct }}%</small>
      </article>
      <article class="panel metric">
        <span>Open exposure</span>
        <strong>{{ preciseMoney.format(dashboard.portfolio.openExposureUsd) }}</strong>
        <small>{{ dashboard.portfolio.riskPosture }}</small>
      </article>
      <article class="panel metric">
        <span>Kill switch</span>
        <strong>{{ dashboard.risk.killSwitch }}</strong>
        <small>{{ dashboard.risk.liveTrading ? 'live trading on' : 'live trading off' }}</small>
      </article>
      <article class="panel metric">
        <span>#277 chain</span>
        <strong>{{ chainSummary.verified }}/{{ chainSummary.total }}</strong>
        <small>{{ chainSummary.complete ? 'safe-mode complete' : 'pending gates' }}</small>
      </article>
    </section>

    <section id="positions" class="grid two-col split-wide">
      <article class="panel span-7">
        <div class="section-title">
          <h2>DLMM manager</h2>
          <span>close state / fees / tx</span>
        </div>
        <div class="list">
          <div v-for="position in dashboard.dlmmPositions" :key="position.id" class="row-card">
            <div>
              <strong>{{ position.pair }}</strong>
              <small>{{ position.poolId }}</small>
            </div>
            <div class="right">
              <span>{{ preciseMoney.format(position.liquidityUsd) }}</span>
              <small>fees {{ preciseMoney.format(position.feesUsd) }} · {{ position.closeState }}</small>
              <small>tx: {{ position.lastTx }}</small>
            </div>
          </div>
        </div>
      </article>

      <article class="panel span-5">
        <div class="section-title">
          <h2>Risk gates</h2>
          <span>live controls locked by default</span>
        </div>
        <div class="gate" v-for="gate in dashboard.risk.gates" :key="gate.name">
          <span>{{ gate.name }}</span>
          <strong>{{ gate.state }}</strong>
        </div>
        <button class="disabled-action" disabled>Live execution disabled until all gates pass</button>
      </article>
    </section>

    <section class="grid two-col split-wide">
      <article id="monitor" class="panel span-6">
        <div class="section-title">
          <h2>Position monitor / SLTP</h2>
          <span>{{ dashboard.stopLossTakeProfit.issue }} · {{ dashboard.stopLossTakeProfit.status }}</span>
        </div>
        <ol class="chain">
          <li v-for="item in dashboard.stopLossTakeProfit.chain" :key="item.step">
            <span>{{ item.step }}</span>
            <strong>{{ item.state }}</strong>
          </li>
        </ol>
        <p class="evidence">{{ dashboard.stopLossTakeProfit.latestEvidence }}</p>
      </article>

      <article id="sniper" class="panel span-6">
        <div class="section-title">
          <h2>Sniper tool</h2>
          <span>{{ dashboard.sniper.status }}</span>
        </div>
        <h3>Candidates</h3>
        <div class="pill-row" v-for="candidate in dashboard.sniper.candidates" :key="candidate.symbol">
          <strong>{{ candidate.symbol }}</strong>
          <span>score {{ candidate.score }}</span>
          <small>{{ candidate.reason }}</small>
        </div>
        <h3>Rejected</h3>
        <div class="pill-row muted" v-for="reject in dashboard.sniper.rejected" :key="reject.symbol">
          <strong>{{ reject.symbol }}</strong>
          <small>{{ reject.reason }}</small>
        </div>
      </article>
    </section>

    <section class="grid two-col split-wide">
      <article id="pools" class="panel span-6">
        <div class="section-title">
          <h2>Top pools</h2>
          <span>liquidity / volume / risk</span>
        </div>
        <div class="pool" v-for="pool in dashboard.topPools" :key="pool.pair">
          <span>#{{ pool.rank }} {{ pool.pair }}</span>
          <strong>{{ money.format(pool.liquidityUsd) }}</strong>
          <small>vol {{ money.format(pool.volume24hUsd) }} · fees {{ money.format(pool.fees24hUsd) }} · risk {{ pool.risk }}</small>
        </div>
      </article>

      <article id="risk-feed" class="panel span-6">
        <div class="section-title">
          <h2>Kill feed / alerts</h2>
          <span>tx submitted vs none submitted</span>
        </div>
        <div class="feed" v-for="event in dashboard.killFeed" :key="event.time + event.message" :class="event.severity">
          <time>{{ event.time }}</time>
          <span>{{ event.message }}</span>
        </div>
      </article>
    </section>

    <section id="validation" class="panel validation-panel">
      <div class="section-title">
        <h2>Hugh validation</h2>
        <span>PR evidence checklist</span>
      </div>
      <div class="validation-grid">
        <div v-for="item in dashboard.prValidation" :key="item.pr" class="validation-card">
          <strong>{{ item.pr }} / {{ item.issue }}</strong>
          <span>{{ item.result }}</span>
          <small>{{ item.evidence }}</small>
        </div>
      </div>

      <form class="validation-form" @submit.prevent="recordValidationEvidence">
        <div class="section-title compact">
          <h3>Record validation evidence</h3>
          <span>evidence only · no trading action</span>
        </div>
        <div class="form-grid">
          <label>
            PR / ticket
            <select v-model="validationSelection">
              <option v-for="item in dashboard.prValidation" :key="item.issue" :value="item.issue">{{ item.pr }} / {{ item.issue }}</option>
            </select>
          </label>
          <label>
            Result
            <select v-model="validationResult">
              <option value="passed">passed</option>
              <option value="failed">failed</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
          <label>
            Tester
            <input v-model="validationTester" autocomplete="off" />
          </label>
          <label>
            Screen inspected
            <input v-model="validationScreen" autocomplete="off" />
          </label>
        </div>
        <label>
          Evidence
          <textarea v-model="validationEvidence" placeholder="What was inspected, expected behavior, actual behavior, links or log excerpt paths." required></textarea>
        </label>
        <label>
          Risk notes
          <textarea v-model="validationRiskNotes"></textarea>
        </label>
        <button class="evidence-action" :disabled="validationSubmitState === 'saving'">
          {{ validationSubmitState === 'saving' ? 'Recording…' : 'Record evidence only' }}
        </button>
        <p v-if="validationSubmitMessage" class="form-message" :class="validationSubmitState">{{ validationSubmitMessage }}</p>
      </form>
    </section>
  </main>
</template>
