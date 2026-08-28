<script setup>
import { computed } from 'vue'
import { formatDuration, formatMoney } from '../utils/formatters.js'

const props = defineProps({
  report: { type: Object, required: true },
})

const rows = computed(() => {
  const symbol = props.report.input.currency
  const baseline = props.report.baseline
  const accelerated = props.report.accelerated
  return [
    ['Regular payment', formatMoney(baseline.regularPayment, symbol), formatMoney(accelerated.regularPayment, symbol)],
    ['Total interest', formatMoney(baseline.totalInterest, symbol), formatMoney(accelerated.totalInterest, symbol)],
    ['Total loan payments', formatMoney(baseline.totalLoanPaid, symbol), formatMoney(accelerated.totalLoanPaid, symbol)],
    ['Payoff time', formatDuration(baseline.periodCount, props.report.input.frequency), formatDuration(accelerated.periodCount, props.report.input.frequency)],
    ['Payoff date', baseline.payoffDate, accelerated.payoffDate],
  ]
})
</script>

<template>
  <section class="comparison-block" aria-labelledby="repayment-comparison-heading">
    <div class="section-heading-row">
      <div>
        <p class="eyebrow">Acceleration</p>
        <h3 id="repayment-comparison-heading">Standard versus accelerated</h3>
        <p>Extra payments are applied after scheduled interest and principal.</p>
      </div>
      <div class="savings-badge" :class="{ 'savings-badge--idle': report.periodsSaved === 0 }">
        <strong>{{ formatMoney(report.interestSaved, report.input.currency) }}</strong>
        <span>interest saved</span>
      </div>
    </div>

    <div class="comparison-table" role="table" aria-label="Standard and accelerated repayment comparison">
      <div class="comparison-table__row comparison-table__head" role="row">
        <span role="columnheader">Metric</span>
        <span role="columnheader">Standard</span>
        <span role="columnheader">Accelerated</span>
      </div>
      <div v-for="row in rows" :key="row[0]" class="comparison-table__row" role="row">
        <span role="cell">{{ row[0] }}</span>
        <strong role="cell">{{ row[1] }}</strong>
        <strong role="cell">{{ row[2] }}</strong>
      </div>
    </div>
  </section>
</template>
