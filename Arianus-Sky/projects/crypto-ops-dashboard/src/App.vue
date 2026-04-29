<script setup>
import { computed, onMounted, ref } from 'vue'
import { hasLiveActionPermission, loadDashboard, validationSummary } from './data/cryptoOps.js'

const dashboard = ref(null)

onMounted(async () => {
  dashboard.value = await loadDashboard()
})

const liveAllowed = computed(() => hasLiveActionPermission(dashboard.value))
const chainSummary = computed(() => validationSummary(dashboard.value))

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const preciseMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
</script>

<template>
  <main v-if="dashboard" class="shell">
    <section class="hero panel">
      <div>
        <p class="eyebrow">Pryan-Fire / Arianus-Sky</p>
        <h1>Crypto Ops Dashboard</h1>
        <p class="subtle">One mobile-first control surface for DLMM, positions, sniper, top pools, kill feeds, and Hugh validation.</p>
      </div>
      <div class="mode-card" :class="liveAllowed ? 'danger' : 'safe'">
        <span>{{ dashboard.mode }}</span>
        <strong>{{ liveAllowed ? 'LIVE ACTIONS ENABLED' : 'READ-ONLY / DRY-RUN' }}</strong>
      </div>
    </section>

    <section class="grid cards-4">
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

    <section class="grid two-col">
      <article class="panel">
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

      <article class="panel">
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

    <section class="grid two-col">
      <article class="panel">
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

      <article class="panel">
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

    <section class="grid two-col">
      <article class="panel">
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

      <article class="panel">
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

    <section class="panel">
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
    </section>
  </main>
</template>
