<script setup>
import { computed } from 'vue'
import { formatDate, formatDuration, formatMoney, formatPercent } from '../utils/formatters.js'
import BalanceChart from './BalanceChart.vue'
import RepaymentComparison from './RepaymentComparison.vue'

const props = defineProps({
  report: { type: Object, default: null },
})

const schedule = computed(() => props.report?.accelerated || null)
const firstPayment = computed(() => schedule.value?.rows?.[0] || null)
const monthlyEquivalent = computed(() => {
  if (!schedule.value) return 0
  return (firstPayment.value?.totalPayment || 0) * (schedule.value.input.paymentsPerYear / 12)
})

const costSegments = computed(() => {
  if (!schedule.value) return []
  const entries = [
    { label: 'Principal', value: schedule.value.totalPrincipal, className: 'cost-bar__principal' },
    { label: 'Interest', value: schedule.value.totalInterest, className: 'cost-bar__interest' },
    { label: 'Escrow', value: schedule.value.totalEscrow, className: 'cost-bar__escrow' },
    { label: 'Upfront fees', value: schedule.value.upfrontFees, className: 'cost-bar__fees' },
  ].filter((entry) => entry.value > 0.005)
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  return entries.map((entry) => ({ ...entry, percent: total ? (entry.value / total) * 100 : 0 }))
})
</script>

<template>
  <section class="results-summary panel" aria-labelledby="results-title">
    <header class="panel__header panel__header--split">
      <div>
        <p class="eyebrow">Repayment outlook</p>
        <h2 id="results-title">Your projected plan</h2>
        <p v-if="report">
          The accelerated plan reaches a zero balance on {{ formatDate(schedule.payoffDate) }}.
        </p>
        <p v-else>Calculate a scenario to review payments, total cost, and payoff timing.</p>
      </div>
      <span v-if="report" class="status-badge" :class="report.periodsSaved ? 'status-badge--ahead' : 'status-badge--neutral'">
        {{ report.periodsSaved ? 'Accelerated' : 'Standard' }}
      </span>
    </header>

    <div v-if="!report" class="results-empty">
      <strong>No repayment plan yet</strong>
      <p>Enter loan terms on the left and select Calculate.</p>
    </div>

    <div v-else class="results-summary__body">
      <div class="kpi-grid">
        <article class="kpi-card kpi-card--primary">
          <span>Loan payment</span>
          <strong>{{ formatMoney(firstPayment.loanPayment, report.input.currency) }}</strong>
          <small>First scheduled loan payment, including configured extras</small>
        </article>
        <article class="kpi-card">
          <span>Total payment</span>
          <strong>{{ formatMoney(firstPayment.totalPayment, report.input.currency) }}</strong>
          <small>Loan payment plus escrow for the first period</small>
        </article>
        <article class="kpi-card">
          <span>Monthly equivalent</span>
          <strong>{{ formatMoney(monthlyEquivalent, report.input.currency) }}</strong>
          <small>Normalised cash-flow estimate across payment frequencies</small>
        </article>
        <article class="kpi-card">
          <span>Payoff date</span>
          <strong>{{ formatDate(schedule.payoffDate) }}</strong>
          <small>{{ formatDuration(schedule.periodCount, report.input.frequency) }}</small>
        </article>
        <article class="kpi-card">
          <span>Total interest</span>
          <strong>{{ formatMoney(schedule.totalInterest, report.input.currency) }}</strong>
          <small>Interest only; escrow and fees are separate</small>
        </article>
        <article class="kpi-card">
          <span>Total out-of-pocket</span>
          <strong>{{ formatMoney(schedule.totalOutOfPocket, report.input.currency) }}</strong>
          <small>Loan payments, escrow, and upfront fees</small>
        </article>
      </div>

      <section class="cost-mix" aria-labelledby="cost-mix-heading">
        <div class="section-heading-row section-heading-row--compact">
          <div>
            <h3 id="cost-mix-heading">Cost mix</h3>
            <p>Principal, interest, escrow, and upfront fees remain separate.</p>
          </div>
        </div>
        <div class="cost-bar" aria-hidden="true">
          <i v-for="segment in costSegments" :key="segment.label" :class="segment.className" :style="{ width: `${segment.percent}%` }"></i>
        </div>
        <div class="cost-legend">
          <span v-for="segment in costSegments" :key="segment.label">
            <strong>{{ segment.label }}</strong>
            {{ formatMoney(segment.value, report.input.currency) }} · {{ segment.percent.toFixed(1) }}%
          </span>
        </div>
      </section>

      <div v-if="report.warnings.length" class="warning-list" role="status">
        <strong>Review these assumptions</strong>
        <ul>
          <li v-for="warning in report.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <section v-if="schedule.paymentChanges.length" class="payment-changes" aria-labelledby="payment-changes-heading">
        <h3 id="payment-changes-heading">Payment changes</h3>
        <div class="insight-grid">
          <article v-for="change in schedule.paymentChanges" :key="change.period" class="insight-card">
            <span>Payment {{ change.period }}</span>
            <strong>{{ formatMoney(change.newPayment, report.input.currency) }}</strong>
            <small>
              {{ formatDate(change.date) }} · {{ formatPercent(change.annualRate) }} rate ·
              {{ change.changePercent >= 0 ? '+' : '' }}{{ change.changePercent.toFixed(1) }}%
            </small>
          </article>
        </div>
      </section>

      <RepaymentComparison :report="report" />

      <section class="chart-section" aria-labelledby="balance-chart-heading">
        <div class="section-heading-row section-heading-row--compact">
          <div>
            <p class="eyebrow">Trajectory</p>
            <h3 id="balance-chart-heading">Remaining balance</h3>
            <p>Large schedules are sampled only for display; calculations retain every payment.</p>
          </div>
        </div>
        <BalanceChart
          :baseline="report.baseline"
          :accelerated="report.accelerated"
          :currency="report.input.currency"
        />
      </section>
    </div>
  </section>
</template>
